#!/usr/bin/env node
/**
 * b1-run.js 闂?Stage 4 batch B1 (metal furnace / ores / xp / crafting) round driver.
 *
 * Sub-commands
 *   setup     platform + five ETIM furnaces + vanilla furnace + crafting table
 *   probe     open one ETIM furnace, dump the raw window_items frame (harness check)
 *   v2        per-block fuel cap matrix (GUI placement path, [FurnaceLog] gui place denied)
 *   v3        heat gate matrix (smelt admit / blocked heat=N required=M)
 *   v4        large-item triple gate (clay denies, vanilla accepts)
 *   v6        F-8-20 extinguish faces (flooded / smothered / burnTime==1 exemption)
 *   v9        smelt XP rows 10/15/40/100 + ancient-metal no-recipe negative
 *   v10       9:1 nugget<->ingot conversions (all five metals, both directions)
 *   v5a       obsidian furnace + lava + mithril, burn to mid-cook, then RCON stop
 *   v5b       after restart: heat load row + finish + take
 *   v7        fresh-chunk ore gen census (64 chunks, fill-count probe)
 *
 * Judgment channel = run/obfuscated-server/logs/latest.log ([FurnaceLog]/[TestLog]).
 *
 * The ETIM furnace GUI rides the FML openGui path: the server binds the real
 * ContainerFurnace and sends SPacketWindowItems (windowId + 39 slots) but no
 * SPacketOpenWindow. A vanilla-protocol bot therefore clicks raw window_click
 * frames with the windowId read from that window_items packet.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_LOG = path.join(ROOT, 'run', 'obfuscated-server', 'logs', 'latest.log');
const OUT_DIR = path.join(ROOT, 'build-logs');
const NAME = process.env.B1_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (...a) => log('b1', ...a);
const results = [];

// ------------------------------------------------------------------ RCON
class Rcon {
  constructor() {
    this.host = '127.0.0.1';
    this.port = 25575;
    this.pass = 'etim27';
    this.buf = Buffer.alloc(0);
    this.pending = new Map();
    this.id = 1;
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.sock = net.createConnection(this.port, this.host, () => resolve());
      this.sock.on('data', (d) => this._data(d));
      this.sock.on('error', reject);
    });
  }
  _data(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 4) return;
      const size = this.buf.readInt32LE(0);
      if (this.buf.length < 4 + size) return;
      const id = this.buf.readInt32LE(4);
      const body = this.buf.slice(12, 4 + size - 2).toString('utf8');
      this.buf = this.buf.slice(4 + size);
      const p = this.pending.get(id);
      if (p) { this.pending.delete(id); p(body); }
    }
  }
  _send(type, body) {
    const len = Buffer.byteLength(body);
    const id = this.id++;
    const buf = Buffer.alloc(14 + len);
    buf.writeInt32LE(len + 10, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    buf.write(body, 12, 'utf8');
    buf.writeInt16LE(0, 12 + len);
    this.sock.write(buf);
    return new Promise((res) => this.pending.set(id, res));
  }
  async auth() { await this._send(3, this.pass); }
  async cmd(c) { return this._send(2, c); }
  close() { try { this.sock.destroy(); } catch (e) { /* ignore */ } }
}

let rcon;
const cmd = (c) => rcon.cmd(c);
const say = (t) => cmd(`/say [B1] ${t}`);

// ------------------------------------------------------------------ log
function readLog() {
  // Windows: log4j may hold the file briefly; retry instead of silently returning ''
  for (let i = 0; i < 5; i++) {
    try { return fs.readFileSync(SERVER_LOG, 'utf8'); } catch (e) { /* retry */ }
  }
  return '';
}
const logLen = () => readLog().split(/\r?\n/).length;
const since = (n) => readLog().split(/\r?\n/).slice(n);
/** Whole-log scan (dedup-proof): last row matching the predicate, or null. */
function logFind(pred) {
  const lines = readLog().split(/\r?\n/).filter(pred);
  return lines.length ? lines[lines.length - 1] : null;
}
const firstLine = (l) => (l || '').split('\n')[0];

// ------------------------------------------------------------------ rig
const F = {
  clay:       { x: 4,  y: 100, z: 10, name: 'etim:furnace_clay',           cap: 1 },
  sandstone:  { x: 10, y: 100, z: 10, name: 'etim:furnace_sandstone',      cap: 1 },
  hardened:   { x: 16, y: 100, z: 10, name: 'etim:furnace_hardened_clay',  cap: 1 },
  obsidian:   { x: 22, y: 100, z: 10, name: 'etim:furnace_obsidian',       cap: 3 },
  netherrack: { x: 28, y: 100, z: 10, name: 'etim:furnace_netherrack',     cap: 4 },
  vanilla:    { x: 34, y: 100, z: 10, name: 'minecraft:furnace',           cap: 2 },
};
const TABLE = { x: 44, y: 100, z: 12 };

// ------------------------------------------------------------------ bot helpers
let bot;
let lastWindow = null;
const lastProps = {};
let actionNum = 1;

function click(win, slot, button = 0, mode = 0) {
  bot._client.write('window_click', {
    windowId: win, slot, mouseButton: button, action: actionNum++ & 0x7fff, mode, item: { blockId: -1 },
  });
}
function closeWindow(win) {
  try { bot._client.write('close_window', { windowId: win }); } catch (e) { /* ignore */ }
}
function selectSlot(s) { bot._client.write('held_item_slot', { slotId: s }); }

/** Survival rounds stand on the floor (no floating kick) and inside the 2.75 block
 *  reach gate; creative rounds can stand one block up and 3 out. */
let STAND = { dz: 3, dy: 1 };
async function openBlock(x, y, z, standZ) {
  lastWindow = null;
  const sz = standZ === undefined ? z + STAND.dz : standZ;
  await cmd(`/tp ${NAME} ${x + 0.5} ${y + STAND.dy} ${sz + 0.5} 180 0`);
  await sleep(260);
  selectSlot(8);
  bot._client.write('block_place', {
    location: new Vec3(x, y, z), direction: 1, hand: 0,
    cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5,
  });
  for (let i = 0; i < 60; i++) { if (lastWindow) break; await sleep(50); }
  await sleep(120);
  return lastWindow;
}

async function resetFurnace(f) {
  await cmd(`/blockdata ${f.x} ${f.y} ${f.z} {Items:[],BurnTime:0s,CookTime:0s}`);
  await sleep(80);
}

async function clearAll() {
  await cmd(`/clear ${NAME}`);
  await sleep(100);
  selectSlot(8);
}

/** give one stack; returns the hotbar index the item landed in (always 0 after a clear). */
async function giveItem(name, count = 1, meta) {
  await cmd(`/give ${NAME} ${name} ${count}` + (meta === undefined ? '' : ` ${meta}`));
  await sleep(220);
}

async function giveList(list) {
  await clearAll();
  for (const [n, c, m] of list) await giveItem(n, c, m);
  await sleep(150);
}

/** container slot of player hotbar index i inside a furnace/workbench container. */
const hotbarSlot = (i, base) => base + i;

async function xpTotal() {
  const msgs = [];
  const h = (m) => msgs.push(m.toString());
  bot.on('message', h);
  bot.chat('/state');
  await sleep(1400);
  bot.removeListener('message', h);
  const m = /total=(-?\d+)/.exec(msgs.join(' '));
  return m ? parseInt(m[1], 10) : null;
}

async function waitLit(f) {
  for (let i = 0; i < 40; i++) {
    const r = await cmd(`/testforblock ${f.x} ${f.y} ${f.z} ${f.name}_lit`);
    if (r.includes('Successfully found')) return true;
    await sleep(250);
  }
  return false;
}

async function blockName(f) {
  for (const suffix of ['_lit', '']) {
    const r = await cmd(`/testforblock ${f.x} ${f.y} ${f.z} ${f.name}${suffix}`);
    if (r.includes('Successfully found')) return f.name + suffix;
  }
  return '?';
}

/** pick up hotbar stack i and drop it into container `target`. */
async function putFromHotbar(win, i, target, base = 30) {
  click(win, base + i);
  await sleep(170);
  click(win, target);
  await sleep(240);
}

async function takeSlot(win, slot, deposit = 3) {
  click(win, slot);
  await sleep(400);
  click(win, deposit);
  await sleep(220);
}

const slotDesc = (it) => {
  if (!it) return null;
  if (it.blockId !== undefined) return it.blockId < 0 ? null : `${it.blockId}x${it.itemCount}`;
  return it.type === undefined ? null : `${it.type}x${it.count}`;
};
const windowSlotIds = (w) => (w && w.items ? w.items.map((it, i) => (slotDesc(it) ? `${i}:${slotDesc(it)}` : null)).filter(Boolean).join(' ') : 'none');

// ------------------------------------------------------------------ phases
async function setup() {
  await say('setup-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd('/gamerule doMobSpawning false');
  await cmd('/kill @e[type=!Player]');
  await cmd('/time set 6000');
  await cmd('/weather clear');
  // the rig sits near spawn but its chunks must be loaded before fill/setblock
  await cmd(`/tp ${NAME} 4.5 101 13.5 180 0`);
  await sleep(2500);
  mark(`setup fill-air: ${(await cmd('/fill 0 100 4 48 102 20 minecraft:air')).trim()}`);
  mark(`setup fill-floor: ${(await cmd('/fill 0 99 4 48 99 20 minecraft:stone')).trim()}`);
  for (const k of Object.keys(F)) {
    const f = F[k];
    const r = await cmd(`/setblock ${f.x} ${f.y} ${f.z} ${f.name} 2`);
    mark(`setup setblock ${k} ${f.name} -> ${r.trim()}`);
  }
  await cmd(`/setblock ${TABLE.x} ${TABLE.y} ${TABLE.z} minecraft:crafting_table 0`);
  await cmd(`/tp ${NAME} 4.5 101 13.5 180 0`);
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:resistance 9999 4 true`);
  await sleep(400);
  for (const k of Object.keys(F)) mark(`setup block ${k} = ${await blockName(F[k])}`);
  await say('setup-end');
}

async function probe() {
  await say('probe-begin');
  const f = F.obsidian;
  await clearAll();
  await giveItem('minecraft:coal', 1);
  mark('probe bot.inventory 36..38: ' + JSON.stringify(bot.inventory.slots.slice(36, 39)));
  const w = await openBlock(f.x, f.y, f.z);
  mark(`probe window=${w ? w.windowId : 'NONE'} slots=${w ? w.items.length : -1}`);
  mark(`probe items: ${windowSlotIds(w)}`);
  if (w) {
    click(w.windowId, 30); await sleep(200);
    mark(`probe after pickup items: ${windowSlotIds(lastWindow)}`);
    click(w.windowId, 1); await sleep(400);
    mark(`probe after slot1 items: ${windowSlotIds(lastWindow)}`);
    click(w.windowId, 30); await sleep(150);
    closeWindow(w.windowId);
  }
  await say('probe-end');
}

const V2 = [
  { fuel: 'minecraft:lava_bucket', heat: 3, deny: ['clay', 'sandstone', 'hardened', 'vanilla'], accept: ['obsidian', 'netherrack'] },
  { fuel: 'minecraft:blaze_rod', heat: 4, deny: ['clay', 'sandstone', 'hardened', 'obsidian', 'vanilla'], accept: ['netherrack'] },
  { fuel: 'minecraft:coal', heat: 2, deny: ['clay', 'sandstone', 'hardened'], accept: ['obsidian', 'netherrack', 'vanilla'] },
];

async function v2() {
  await say('v2-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  for (const row of V2) {
    for (const key of Object.keys(F)) {
      const f = F[key];
      await resetFurnace(f);
      await giveList([[row.fuel, 1]]);
      const n0 = logLen();
      const w = await openBlock(f.x, f.y, f.z);
      if (!w) { mark(`v2 ${key} ${row.fuel}: NO-WINDOW`); continue; }
      click(w.windowId, 30); await sleep(180);
      click(w.windowId, 1); await sleep(360);
      click(w.windowId, 30); await sleep(140);
      closeWindow(w.windowId);
      await sleep(160);
      const added = since(n0);
      const deny = added.filter((l) => /gui place denied|put denied|fuel denied|slot denied/.test(l)).map(firstLine);
      const write = added.filter((l) => l.includes('write slot=1')).map(firstLine);
      const expectDeny = row.deny.includes(key);
      const ok = expectDeny ? deny.length > 0 && write.length === 0 : deny.length === 0 && write.length > 0;
      const rec = {
        v: 'V2', key, fuel: row.fuel, heat: row.heat, cap: f.cap, expect: expectDeny ? 'DENY' : 'ACCEPT',
        ok, deny: deny.slice(0, 2), write: write.slice(0, 2),
      };
      results.push(rec);
      mark(`v2 ${key.padEnd(10)} ${row.fuel.padEnd(24)} heat=${row.heat} cap=${f.cap} want=${rec.expect} ${ok ? 'OK' : 'MISMATCH'}`);
      for (const l of rec.deny) mark(`    deny: ${l}`);
      for (const l of rec.write) mark(`    write: ${l}`);
    }
  }
  await say('v2-end');
}

/** smelt cell helper: place input+fuel through the GUI and KEEP the window open
 *  (the FML container never sends open_window; a re-open races the client stream,
 *  so the take rides the same window id the placement used). */
async function smeltCell(key, input, inputCount, fuel, opts = {}) {
  const f = F[key];
  await resetFurnace(f);
  const n0 = logLen();
  if (opts.inject) {
    const bt = opts.burnTime === undefined ? 200 : opts.burnTime;
    const hl = opts.heatLevel === undefined ? 4 : opts.heatLevel;
    await cmd(`/blockdata ${f.x} ${f.y} ${f.z} {Items:[{Slot:0b,id:"${input}",Count:${inputCount}b,` +
      `Damage:0s},{Slot:1b,id:"${fuel}",Count:1b,Damage:0s}],BurnTime:${bt}s,CookTime:0s,heat_level:${hl}b}`);
    await sleep(1600);
    const added = since(n0);
    return {
      win: null, n0,
      admit: added.filter((l) => l.includes('smelt admit')).map(firstLine),
      blocked: added.filter((l) => l.includes('smelt blocked heat=')).map(firstLine),
      denied: added.filter((l) => l.includes('denied') || l.includes('deny')).map(firstLine),
      heatLoad: added.filter((l) => l.includes('heat load')).map(firstLine),
    };
  }
  await giveList(opts.meta ? [[input, inputCount], [fuel, 1, opts.meta]] : [[input, inputCount], [fuel, 1]]);
  const w = await openBlock(f.x, f.y, f.z);
  if (!w) { mark(`smeltCell ${key} ${input}: NO-WINDOW`); return { win: null, n0, admit: [], blocked: [], denied: [] }; }
  await putFromHotbar(w.windowId, 0, 0);
  await putFromHotbar(w.windowId, 1, 1);
  await sleep(1200);
  const added = since(n0);
  return {
    win: w.windowId, n0,
    admit: added.filter((l) => l.includes('smelt admit')).map(firstLine),
    blocked: added.filter((l) => l.includes('smelt blocked heat=')).map(firstLine),
    denied: added.filter((l) => l.includes('denied') || l.includes('deny')).map(firstLine),
    heatLoad: [],
  };
}

async function v3() {
  await say('v3-begin');
  await cmd(`/gamemode 1 ${NAME}`);

  // Clay tier refuses BLOCK inputs (large-item gate), so the heat-1 cells ride the
  // sandstone tier: identical cap 1, large items admitted (V4 proves the clay refusal).
  // cell 1: sandstone + charcoal(heat1, meta 1) + sand x4 -> sandstone (admit heat=1 required=1)
  {
    const r = await smeltCell('sandstone', 'minecraft:sand', 4, 'minecraft:coal', { meta: 1 });
    await sleep(11500);
    const n0 = logLen();
    if (r.win !== null) await takeSlot(r.win, 2);
    await sleep(700);
    const payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
    if (r.win !== null) closeWindow(r.win);
    const ok = r.admit.some((l) => l.includes('heat=1 required=1') && l.includes('input=minecraft:sand'))
      && payout.some((l) => l.includes('minecraft:sandstone'));
    results.push({ v: 'V3', key: 'sandstone+sand', admit: r.admit, blocked: r.blocked, denied: r.denied, payout, ok });
    mark(`v3 sandstone sand: admit=${JSON.stringify(r.admit)} payout=${JSON.stringify(payout)} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // cell 2: sandstone + charcoal(1) + iron ore -> blocked heat=1 required=2
  {
    const r = await smeltCell('sandstone', 'minecraft:iron_ore', 1, 'minecraft:coal', { meta: 1 });
    const ok = r.blocked.some((l) => l.includes('heat=1 required=2') && l.includes('minecraft:iron_ore') && l.includes('heat-gated'));
    results.push({ v: 'V3', key: 'sandstone+iron', admit: r.admit, blocked: r.blocked, ok });
    mark(`v3 sandstone iron_ore: blocked=${JSON.stringify(r.blocked)} ${ok ? 'OK' : 'MISMATCH'}`);
    if (r.win !== null) closeWindow(r.win);
    await resetFurnace(F.sandstone);
  }

  // cell 3: vanilla + coal(2) + iron ore -> admit heat=2 required=2 + iron ingot take
  {
    const r = await smeltCell('vanilla', 'minecraft:iron_ore', 1, 'minecraft:coal');
    await sleep(11500);
    const n0 = logLen();
    if (r.win !== null) await takeSlot(r.win, 2);
    await sleep(700);
    const payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
    if (r.win !== null) closeWindow(r.win);
    const ok = r.admit.some((l) => l.includes('heat=2 required=2') && l.includes('minecraft:iron_ore'))
      && payout.some((l) => l.includes('minecraft:iron_ingot'));
    results.push({ v: 'V3', key: 'vanilla+iron', admit: r.admit, blocked: r.blocked, payout, ok });
    mark(`v3 vanilla iron_ore: admit=${JSON.stringify(r.admit)} payout=${JSON.stringify(payout)} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // cell 4: obsidian + lava(3) + mithril ore -> admit heat=3 required=3 + ingot + XP 40
  {
    const r = await smeltCell('obsidian', 'etim:ore_mithril', 1, 'minecraft:lava_bucket');
    await sleep(11500);
    const before = await xpTotal();
    const n0 = logLen();
    if (r.win !== null) await takeSlot(r.win, 2);
    await sleep(1800);
    const after = await xpTotal();
    const payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
    if (r.win !== null) closeWindow(r.win);
    const ok = r.admit.some((l) => l.includes('heat=3 required=3') && l.includes('etim:ore_mithril'))
      && payout.some((l) => l.includes('etim:ingot_mithril'))
      && before !== null && after - before === 40;
    results.push({ v: 'V3+V9', key: 'obsidian+mithril', admit: r.admit, blocked: r.blocked, payout, xp: [before, after], ok });
    mark(`v3/V9 obsidian mithril: admit=${JSON.stringify(r.admit)} payout=${JSON.stringify(payout)} xp ${before}->${after} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // cell 5: netherrack + blaze(4) + adamantium ore -> admit heat=4 required=4 + ingot + XP 100
  {
    const r = await smeltCell('netherrack', 'etim:ore_adamantium', 1, 'minecraft:blaze_rod');
    await sleep(11500);
    const before = await xpTotal();
    const n0 = logLen();
    if (r.win !== null) await takeSlot(r.win, 2);
    await sleep(1800);
    const after = await xpTotal();
    const payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
    if (r.win !== null) closeWindow(r.win);
    const ok = r.admit.some((l) => l.includes('heat=4 required=4') && l.includes('etim:ore_adamantium'))
      && payout.some((l) => l.includes('etim:ingot_adamantium'))
      && before !== null && after - before === 100;
    results.push({ v: 'V3+V9', key: 'netherrack+adamantium', admit: r.admit, blocked: r.blocked, payout, xp: [before, after], ok });
    mark(`v3/V9 netherrack adamantium: admit=${JSON.stringify(r.admit)} payout=${JSON.stringify(payout)} xp ${before}->${after} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // cell 6: obsidian (cap 3) + blaze rod (heat 4) 闂?the admission layer refuses heat 4,
  // so the fuel lands via the NBT writer (the bypass the decisive-heat clamp exists for):
  // heat_level 4 + burning -> decisive min(4, cap 3) = 3 -> blocked heat=3 required=4
  {
    const r = await smeltCell('obsidian', 'etim:ore_adamantium', 1, 'minecraft:blaze_rod',
      { inject: true, burnTime: 200, heatLevel: 4 });
    const ok = r.blocked.some((l) => l.includes('heat=3 required=4') && l.includes('etim:ore_adamantium') && l.includes('heat-gated'));
    results.push({ v: 'V3', key: 'obsidian+blaze-adamantium', blocked: r.blocked, heatLoad: r.heatLoad, ok });
    mark(`v3 obsidian blaze+adamantium: blocked=${JSON.stringify(r.blocked)} heatLoad=${JSON.stringify(r.heatLoad)} ${ok ? 'OK' : 'MISMATCH'}`);
    await resetFurnace(F.obsidian);
  }
  await say('v3-end');
}
async function v4() {
  await say('v4-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const cells = [
    { key: 'clay', item: 'minecraft:boat', slot: 1, want: 'deny' },
    { key: 'clay', item: 'minecraft:cobblestone', slot: 0, want: 'deny' },
    { key: 'vanilla', item: 'minecraft:boat', slot: 1, want: 'accept' },
    { key: 'vanilla', item: 'minecraft:cobblestone', slot: 0, want: 'accept' },
  ];
  for (const c of cells) {
    const f = F[c.key];
    await resetFurnace(f);
    await giveList([[c.item, 1]]);
    const n0 = logLen();
    const w = await openBlock(f.x, f.y, f.z);
    if (!w) { mark(`v4 ${c.key} ${c.item}: NO-WINDOW`); continue; }
    click(w.windowId, 30); await sleep(180);
    click(w.windowId, c.slot); await sleep(380);
    click(w.windowId, 30); await sleep(140);
    closeWindow(w.windowId);
    await sleep(180);
    const added = since(n0);
    const deny = added.filter((l) => l.includes('large-item')).map(firstLine);
    const write = added.filter((l) => l.includes(`write slot=${c.slot}`)).map(firstLine);
    const ok = c.want === 'deny' ? deny.length > 0 && write.length === 0 : deny.length === 0 && write.length > 0;
    results.push({ v: 'V4', key: c.key, item: c.item, slot: c.slot, want: c.want, ok, deny, write });
    mark(`v4 ${c.key.padEnd(8)} ${c.item.padEnd(24)} slot=${c.slot} want=${c.want} ${ok ? 'OK' : 'MISMATCH'}`);
    for (const l of deny) mark(`    deny: ${l}`);
    for (const l of write) mark(`    write: ${l}`);
  }
  await say('v4-end');
}

async function v6() {
  await say('v6-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  // --- flooded face on a REAL burning furnace (netherrack)
  const f = F.netherrack;
  await resetFurnace(f);
  await cmd(`/setblock ${f.x} ${f.y - 1} ${f.z - 1} minecraft:stone 0`);
  await giveList([['minecraft:cobblestone', 1], ['minecraft:coal', 1]]);
  {
    const w = await openBlock(f.x, f.y, f.z);
    await putFromHotbar(w.windowId, 0, 0);
    await putFromHotbar(w.windowId, 1, 1);
    closeWindow(w.windowId);
  }
  const lit1 = await waitLit(f);
  mark(`v6 flooded: lit=${lit1} block=${await blockName(f)}`);
  let n0 = logLen();
  await cmd(`/setblock ${f.x} ${f.y} ${f.z - 1} minecraft:water 0`);
  await sleep(900);
  let added = since(n0);
  let ext = added.filter((l) => l.includes('extinguished')).map(firstLine);
  const blockAfterFlood = await blockName(f);
  const okFlood = ext.some((l) => l.includes('flooded') && l.includes('furnace=etim:furnace_netherrack')) && blockAfterFlood === 'etim:furnace_netherrack';
  results.push({ v: 'V6', key: 'flooded', ok: okFlood, ext, blockAfterFlood });
  mark(`v6 flooded: ext=${JSON.stringify(ext)} block=${blockAfterFlood} ${okFlood ? 'OK' : 'MISMATCH'}`);
  await cmd(`/fill ${f.x - 1} ${f.y} ${f.z - 1} ${f.x + 1} ${f.y} ${f.z - 1} minecraft:air 0 replace minecraft:water`);
  await sleep(200);

  // --- smothered face on a REAL burning furnace
  await resetFurnace(f);
  await giveList([['minecraft:cobblestone', 1], ['minecraft:coal', 1]]);
  {
    const w = await openBlock(f.x, f.y, f.z);
    await putFromHotbar(w.windowId, 0, 0);
    await putFromHotbar(w.windowId, 1, 1);
    closeWindow(w.windowId);
  }
  const lit2 = await waitLit(f);
  mark(`v6 smothered: lit=${lit2} block=${await blockName(f)}`);
  n0 = logLen();
  await cmd(`/setblock ${f.x} ${f.y} ${f.z - 1} minecraft:cobblestone 0`);
  await sleep(900);
  added = since(n0);
  ext = added.filter((l) => l.includes('extinguished')).map(firstLine);
  const blockAfterSmother = await blockName(f);
  const okSmother = ext.some((l) => l.includes('smothered') && l.includes('furnace=etim:furnace_netherrack')) && blockAfterSmother === 'etim:furnace_netherrack';
  results.push({ v: 'V6', key: 'smothered', ok: okSmother, ext, blockAfterSmother });
  mark(`v6 smothered: ext=${JSON.stringify(ext)} block=${blockAfterSmother} ${okSmother ? 'OK' : 'MISMATCH'}`);
  await cmd(`/setblock ${f.x} ${f.y} ${f.z - 1} minecraft:air 0`);

  // --- burnTime==1 exemption differential (vanilla furnace, front face)
  const v = F.vanilla;
  await resetFurnace(v);
  await cmd(`/setblock ${v.x} ${v.y} ${v.z - 1} minecraft:water 0`);
  await sleep(400);
  // positive control: burnTime=100 -> extinguished flooded burn=100
  n0 = logLen();
  await cmd(`/blockdata ${v.x} ${v.y} ${v.z} {BurnTime:100s,CookTime:0s}`);
  await sleep(900);
  added = since(n0);
  const extControl = added.filter((l) => l.includes('extinguished') && l.includes('burn=100')).map(firstLine);
  // exemption: burnTime=1 -> hook returns early, vanilla update burns it out, no row
  const n1 = logLen();
  await cmd(`/blockdata ${v.x} ${v.y} ${v.z} {BurnTime:1s,CookTime:0s}`);
  await sleep(900);
  const extExempt = since(n1).filter((l) => l.includes('extinguished')).map(firstLine);
  const okExempt = extControl.length > 0 && extExempt.length === 0;
  results.push({ v: 'V6', key: 'burntime1', ok: okExempt, extControl, extExempt });
  mark(`v6 burnTime: control=${JSON.stringify(extControl)} exempt=${JSON.stringify(extExempt)} ${okExempt ? 'OK' : 'MISMATCH'}`);
  await resetFurnace(v);
  await cmd(`/fill ${v.x - 1} ${v.y} ${v.z - 1} ${v.x + 1} ${v.y} ${v.z - 1} minecraft:air 0 replace minecraft:water`);
  await say('v6-end');
}

async function v9() {
  await say('v9-begin');
  STAND = { dz: 2, dy: 0 };
  await cmd(`/gamemode 0 ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:resistance 9999 4 true`);
  await cmd(`/effect ${NAME} minecraft:saturation 9999 4 true`);
  const cells = [
    { key: 'vanilla', input: 'etim:ore_copper', fuel: 'minecraft:coal', ingot: 'etim:ingot_copper', xp: 10 },
    { key: 'vanilla', input: 'etim:ore_silver', fuel: 'minecraft:coal', ingot: 'etim:ingot_silver', xp: 15 },
  ];
  for (const c of cells) {
    const r = await smeltCell('vanilla', c.input, 1, c.fuel);
    await sleep(11500);
    const before = await xpTotal();
    const n0 = logLen();
    if (r.win !== null) await takeSlot(r.win, 2);
    await sleep(1800);
    const after = await xpTotal();
    const payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
    if (r.win !== null) closeWindow(r.win);
    const ok = r.admit.some((l) => l.includes('heat=2 required=2') && l.includes(c.input))
      && payout.some((l) => l.includes(c.ingot)) && before !== null && after - before === c.xp;
    results.push({ v: 'V9', key: c.input, admit: r.admit, payout, xp: [before, after], want: c.xp, ok });
    mark(`v9 ${c.input}: admit=${JSON.stringify(r.admit)} payout=${JSON.stringify(payout)} xp ${before}->${after} want +${c.xp} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  // ancient metal negative: no smelting row -> input slot refuses it
  {
    const f = F.netherrack;
    await resetFurnace(f);
    await giveList([['etim:ingot_ancient_metal', 1], ['minecraft:blaze_rod', 1]]);
    const n0 = logLen();
    const w = await openBlock(f.x, f.y, f.z);
    if (!w) { mark('v9 ancient negative: NO-WINDOW'); results.push({ v: 'V9', key: 'ancient-negative', ok: false, denied: [] }); }
    else {
      click(w.windowId, 30); await sleep(180);
      click(w.windowId, 0); await sleep(400);
      click(w.windowId, 30); await sleep(140);
      closeWindow(w.windowId);
      await sleep(200);
      const denied = since(n0).filter((l) => l.includes('denied') || l.includes('deny')).map(firstLine);
      const ok = denied.some((l) => l.includes('no-recipe') && l.includes('ancient_metal'));
      results.push({ v: 'V9', key: 'ancient-negative', ok, denied });
      mark(`v9 ancient negative: ${JSON.stringify(denied)} ${ok ? 'OK' : 'MISMATCH'}`);
    }
  }
  STAND = { dz: 3, dy: 1 };
  await cmd(`/gamemode 1 ${NAME}`);
  await say('v9-end');
}

async function v10() {
  await say('v10-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const metals = ['copper', 'silver', 'mithril', 'adamantium', 'ancient_metal'];
  for (const m of metals) {
    // 9 nuggets -> 1 ingot
    await clearAll();
    await giveItem(`etim:nugget_${m}`, 9);
    let w = await openBlock(TABLE.x, TABLE.y, TABLE.z, TABLE.z + 3);
    if (!w) { mark(`v10 ${m}: NO-TABLE-WINDOW`); continue; }
    click(w.windowId, 37); await sleep(200);           // pick up 9 nuggets
    for (let s = 1; s <= 9; s++) { click(w.windowId, s, 1); await sleep(110); }  // one per grid slot
    await sleep(300);
    click(w.windowId, 0); await sleep(350);            // take output (ingot)
    click(w.windowId, 10); await sleep(250);           // deposit into player inv
    closeWindow(w.windowId);
    await sleep(300);
    const ingotCount = await clearCount(`etim:ingot_${m}`);

    // 1 ingot -> 9 nuggets
    await clearAll();
    await giveItem(`etim:ingot_${m}`, 1);
    w = await openBlock(TABLE.x, TABLE.y, TABLE.z, TABLE.z + 3);
    click(w.windowId, 37); await sleep(200);           // pick up ingot
    click(w.windowId, 1); await sleep(250);            // place in grid slot 1
    await sleep(250);
    click(w.windowId, 0); await sleep(350);            // take 9 nuggets
    click(w.windowId, 10); await sleep(250);
    closeWindow(w.windowId);
    await sleep(300);
    const nuggetCount = await clearCount(`etim:nugget_${m}`);
    const ok = ingotCount === 1 && nuggetCount === 9;
    results.push({ v: 'V10', metal: m, ingot: ingotCount, nugget: nuggetCount, ok });
    mark(`v10 ${m.padEnd(14)} nuggets9->ingot=${ingotCount} ingot1->nuggets=${nuggetCount} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  await say('v10-end');
}

async function clearCount(item) {
  for (let i = 0; i < 4; i++) {
    const r = await cmd(`/clear ${NAME} ${item} 0 0`);
    const m = /has (\d+) items? that match/.exec(r);
    if (m) return parseInt(m[1], 10);
    if (/No items were found/i.test(r)) return 0;
    await sleep(700);
  }
  return -1;
}

async function diagMithril() {
  await say('diag-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const f = F.obsidian;
  await resetFurnace(f);
  await giveList([['etim:ore_mithril', 1], ['minecraft:lava_bucket', 1]]);
  let w = await openBlock(f.x, f.y, f.z);
  mark(`diag open1 win=${w && w.windowId} slots=${windowSlotIds(w)}`);
  await putFromHotbar(w.windowId, 0, 0);
  await putFromHotbar(w.windowId, 1, 1);
  mark(`diag placed slots=${windowSlotIds(lastWindow)} props=${JSON.stringify(lastProps)}`);
  closeWindow(w.windowId);
  for (let i = 0; i < 5; i++) {
    await sleep(3000);
    const w2 = await openBlock(f.x, f.y, f.z);
    mark(`diag t=${(i + 1) * 3}s win=${w2 && w2.windowId} slots=${windowSlotIds(w2)} props=${JSON.stringify(lastProps)} block=${await blockName(f)}`);
    closeWindow(w2.windowId);
  }
  await say('diag-end');
}

async function v7probe() {
  await say('v7probe-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  for (const [cx, cz] of [[2149, 2149], [2148, 2150], [2150, 2148]]) {
    await cmd(`/tp ${NAME} ${cx * 16 + 8.5} 120 ${cz * 16 + 8.5} 0 0`);
    await sleep(8000);
    const x = cx * 16;
    const z = cz * 16;
    mark(`--- chunk ${cx},${cz} ---`);
    mark(`test y60: ${(await cmd(`/testforblock ${x + 8} 60 ${z + 8} minecraft:stone`)).trim()}`);
    const s = await cmd(`/fill ${x} 0 ${z} ${x + 15} 127 ${z + 15} minecraft:air 0 replace minecraft:stone`);
    mark(`stone fill -> ${s.trim()}`);
    const c = await cmd(`/fill ${x} 0 ${z} ${x + 15} 127 ${z + 15} minecraft:air 0 replace etim:ore_copper`);
    mark(`copper fill -> ${c.trim()}`);
    const si = await cmd(`/fill ${x} 0 ${z} ${x + 15} 127 ${z + 15} minecraft:air 0 replace etim:ore_silver`);
    mark(`silver fill -> ${si.trim()}`);
    const m = await cmd(`/fill ${x} 0 ${z} ${x + 15} 127 ${z + 15} minecraft:air 0 replace etim:ore_mithril`);
    mark(`mithril fill -> ${m.trim()}`);
  }
  await say('v7probe-end');
}
async function giveTest() {
  await say('giveTest-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const items = ['nugget_copper', 'nugget_silver', 'nugget_mithril', 'nugget_adamantium', 'nugget_ancient_metal',
    'ingot_copper', 'ingot_silver', 'ingot_mithril', 'ingot_adamantium', 'ingot_ancient_metal',
    'ore_copper', 'ore_silver', 'ore_mithril', 'ore_adamantium'];
  for (const it of items) { await clearAll(); const r = await cmd(`/give ${NAME} etim:${it} 1`); mark(`give etim:${it} -> ${r.trim()}`); }
  await say('giveTest-end');
}

async function v5a() {
  await say('v5a-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const f = F.obsidian;
  await resetFurnace(f);
  await giveList([['etim:ore_mithril', 1], ['minecraft:lava_bucket', 1]]);
  const w = await openBlock(f.x, f.y, f.z);
  await putFromHotbar(w.windowId, 0, 0);
  await putFromHotbar(w.windowId, 1, 1);
  closeWindow(w.windowId);
  const lit = await waitLit(f);
  await sleep(5200);
  mark(`v5a lit=${lit} block=${await blockName(f)} -> stopping server mid-cook`);
  await say('v5a-stop');
  await cmd('stop');
}

async function v5b() {
  await say('v5b-begin');
  const f = F.obsidian;
  const load = readLog().split(/\r?\n/).filter((l) => l.includes('heat load'));
  const teFails = readLog().split(/\r?\n/).filter((l) => l.includes('Failed to load data for block entity'));
  mark(`v5b heat load rows=${load.length} blockentity-load-failures=${teFails.length}`);
  for (const l of load) mark(`    load: ${firstLine(l)}`);
  for (const l of teFails.slice(-2)) mark(`    tefail: ${firstLine(l)}`);
  const w = await openBlock(f.x, f.y, f.z);
  const before = await xpTotal();
  const n0 = logLen();
  await sleep(12000);
  mark(`v5b after settle slots=${windowSlotIds(lastWindow)} props=${JSON.stringify(lastProps)}`);
  if (w) await takeSlot(w.windowId, 2);
  await sleep(1800);
  const after = await xpTotal();
  const payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
  if (w) closeWindow(w.windowId);
  const ok = load.length > 0 && load.some((l) => l.includes('level=3') && l.includes('furnace=etim:furnace_obsidian'))
    && payout.some((l) => l.includes('etim:ingot_mithril')) && after - before === 40;
  results.push({ v: 'V5', key: 'heat-load-resume', load: load.map(firstLine), teFails: teFails.length, payout, xp: [before, after], ok });
  mark(`v5b payout=${JSON.stringify(payout)} xp ${before}->${after} ${ok ? 'OK' : 'MISMATCH'}`);
  await say('v5b-end');
}

async function v7bands() {
  await say('v7bands-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const bands = [[0, 31], [32, 63], [64, 127]];
  const rows = [];
  const fillN = async (c) => {
    const out = (await cmd(c)).trim();
    if (/No blocks filled/.test(out)) return 0;
    const m = /(\d+) blocks? filled/.exec(out);
    return m ? parseInt(m[1], 10) : -1;
  };
  for (const [cx, cz] of [[2304, 2304], [2305, 2305], [2306, 2306], [2304, 2306], [2306, 2304], [2308, 2308], [2309, 2309], [2308, 2310], [2310, 2308]]) {
    await cmd(`/tp ${NAME} ${cx * 16 + 8.5} 120 ${cz * 16 + 8.5} 0 0`);
    await sleep(6000);
    await cmd(`/testforblock ${cx * 16 + 8} 60 ${cz * 16 + 8} minecraft:stone`);
    await sleep(500);
    const stone = (await fillN(`/fill ${cx * 16} 0 ${cz * 16} ${cx * 16 + 15} 127 ${cz * 16 + 15} minecraft:air 0 replace minecraft:stone`));
    if (stone < 8000) { mark(`v7bands ${cx},${cz}: stone=${stone} skip`); continue; }
    const row = { cx, cz, stone };
    for (const [y1, y2] of bands) row[`${y1}-${y2}`] = await fillN(`/fill ${cx * 16} ${y1} ${cz * 16} ${cx * 16 + 15} ${y2} ${cz * 16 + 15} minecraft:air 0 replace etim:ore_copper`);
    rows.push(row);
    mark(`v7bands ${cx},${cz}: copper 0-31=${row['0-31']} 32-63=${row['32-63']} 64-127=${row['64-127']} stone=${stone}`);
  }
  const agg = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
  results.push({ v: 'V7bands', chunks: rows.length, b0: agg('0-31'), b32: agg('32-63'), b64: agg('64-127'), rows });
  mark(`v7bands chunks=${rows.length} copper 0-31=${agg('0-31')} 32-63=${agg('32-63')} 64-127=${agg('64-127')}`);
  await say('v7bands-end');
}

async function v7() {
  await say('v7-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const ores = ['etim:ore_copper', 'etim:ore_silver', 'etim:ore_mithril', 'etim:ore_adamantium'];
  const perChunk = [];
  let fillErrors = 0;
  const fill1 = async (c) => {
    let out = (await cmd(c)).trim();
    if (/No blocks filled/.test(out)) return 0;
    let m = /(\d+) blocks? filled/.exec(out);
    if (!m) { await sleep(2500); out = (await cmd(c)).trim(); if (/No blocks filled/.test(out)) return 0; m = /(\d+) blocks? filled/.exec(out); }
    if (!m) { fillErrors++; if (fillErrors < 4) mark(`    fill FAIL: ${out}`); return 0; }
    return parseInt(m[1], 10);
  };
  const countBlocks = async (cx, cz, blk) => {
    let total = 0;
    for (const [y1, y2] of [[0, 127], [128, 255]]) {
      total += await fill1(`/fill ${cx * 16} ${y1} ${cz * 16} ${cx * 16 + 15} ${y2} ${cz * 16 + 15} minecraft:air 0 replace ${blk}`);
    }
    return total;
  };
  // 1) land scan (non-destructive): stone at y=60 in a candidate chunk
  let center = null;
  for (const [cx, cz] of [[2300, 2300], [2308, 2308], [2316, 2316], [2292, 2292], [2324, 2324], [2300, 2316], [2316, 2300]]) {
    await cmd(`/tp ${NAME} ${cx * 16 + 8.5} 120 ${cz * 16 + 8.5} 0 0`);
    await sleep(6000);
    const r = await cmd(`/testforblock ${cx * 16 + 8} 60 ${cz * 16 + 8} minecraft:stone`);
    const land = r.includes('Successfully found');
    mark(`v7 land-scan ${cx},${cz}: ${land ? 'LAND' : 'no y60 stone'}`);
    if (land) { center = { cx, cz }; break; }
  }
  if (!center) { mark('v7 NO LAND CENTER FOUND'); await say('v7-end'); return; }
  // 2) 5x5 census around the land center (stone census first: ocean chunks are skipped,
  //    and removing stone does not touch the ore blocks)
  for (let cx = center.cx - 2; cx <= center.cx + 2; cx++) {
    for (let cz = center.cz - 2; cz <= center.cz + 2; cz++) {
      await cmd(`/tp ${NAME} ${cx * 16 + 8.5} 120 ${cz * 16 + 8.5} 0 0`);
      await sleep(6000);
      await cmd(`/testforblock ${cx * 16 + 8} 60 ${cz * 16 + 8} minecraft:stone`);
      await sleep(600);
      const stone = await countBlocks(cx, cz, 'minecraft:stone');
      if (stone < 8000) { mark(`v7 chunk ${cx},${cz}: stone=${stone} -> skip (ocean/thin)`); continue; }
      const row = { cx, cz, stone };
      for (const ore of ores) row[ore] = await countBlocks(cx, cz, ore);
      perChunk.push(row);
      mark(`v7 chunk ${cx},${cz}: copper=${row['etim:ore_copper']} silver=${row['etim:ore_silver']} mithril=${row['etim:ore_mithril']} adamantium=${row['etim:ore_adamantium']} | stone=${stone}`);
    }
  }
  const sum = (ore) => perChunk.reduce((n, r) => n + r[ore], 0);
  const stats = {};
  for (const ore of ores) stats[ore] = perChunk.length ? { sum: sum(ore), mean: +(sum(ore) / perChunk.length).toFixed(2) } : { sum: 0, mean: 0 };
  results.push({ v: 'V7', chunks: perChunk.length, fillErrors, stats, perChunk, center });
  mark(`v7 center=${center.cx},${center.cz} land-chunks=${perChunk.length} fill-errors=${fillErrors}`);
  for (const ore of ores) mark(`v7 ${ore}: sum=${stats[ore].sum} mean/chunk=${stats[ore].mean}`);
  await say('v7-end');
}
// ================================================================== reverdict window (A-1/A-2 fix batch + B-1(b))
async function rv1a() {
  await say('rv1a-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const f = F.obsidian;
  await resetFurnace(f);
  await giveList([['etim:ore_mithril', 1], ['minecraft:lava_bucket', 1]]);
  const w = await openBlock(f.x, f.y, f.z);
  if (!w) { mark('rv1a NO-WINDOW'); await say('rv1a-end'); return; }
  await putFromHotbar(w.windowId, 0, 0);
  await putFromHotbar(w.windowId, 1, 1);
  closeWindow(w.windowId);
  await sleep(300);
  const lit = await waitLit(f);
  await sleep(4000);
  const bd = await cmd(`/blockdata ${f.x} ${f.y} ${f.z}`);
  mark(`rv1a lit=${lit} block=${await blockName(f)}`);
  mark(`rv1a blockdata=${bd.trim()}`);
  mark('rv1a stopping server mid-cook (RV1 half-way save point)');
  await say('rv1a-stop');
  await cmd('stop');
}

async function rv1b() {
  await say('rv1b-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const lines = readLog().split(/\r?\n/);
  const load = lines.filter((l) => l.includes('heat load'));
  const npe = lines.filter((l) => /NullPointerException/.test(l));
  const teFail = lines.filter((l) => /Failed to load data for block entity|cannot be restored/.test(l));
  const unreg = lines.filter((l) => /produces unregistered item|Exception reading/.test(l));
  mark(`rv1b heat-load-rows=${load.length} npe=${npe.length} teFail=${teFail.length} unregistered=${unreg.length}`);
  for (const l of load) mark(`    load: ${l.trim()}`);
  for (const l of teFail.slice(0, 2)) mark(`    teFail: ${l.trim()}`);
  const f = F.obsidian;
  const n0 = logLen();
  const w = await openBlock(f.x, f.y, f.z);
  mark(`rv1b window=${w ? w.windowId : 'NONE'} slots=${windowSlotIds(w)} props=${JSON.stringify(lastProps)}`);
  const before = await xpTotal();
  // no placement at all: the furnace must finish the half-cooked mithril on its own
  for (let i = 0; i < 20; i++) {
    const hits = since(n0).filter((l) => l.includes('xp payout')).length;
    if (hits > 0) break;
    await sleep(1500);
  }
  await sleep(1200);
  const midSlots = windowSlotIds(lastWindow);
  let payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
  if (w) await takeSlot(w.windowId, 2);
  await sleep(2000);
  const after = await xpTotal();
  payout = since(n0).filter((l) => l.includes('xp payout')).map(firstLine);
  const ingots = await clearCount('etim:ingot_mithril');
  if (w) closeWindow(w.windowId);
  const ok = load.length === 1
    && load.some((l) => l.includes('level=3') && l.includes('burn=') && l.includes('furnace=etim:furnace_obsidian'))
    && npe.length === 0 && teFail.length === 0 && unreg.length === 0
    && payout.some((l) => l.includes('etim:ingot_mithril'))
    && after !== null && after - before === 40;
  results.push({ v: 'RV1', load: load.map(firstLine), npe: npe.length, teFail: teFail.length, unreg: unreg.length, slotsAtOpen: midSlots, payout, xp: [before, after], ingots, ok });
  mark(`rv1b slots-at-open=${midSlots}`);
  mark(`rv1b payout=${JSON.stringify(payout)} xp ${before}->${after} ingots=${ingots} ${ok ? 'OK' : 'MISMATCH'}`);
  await say('rv1b-end');
}

async function rv2() {
  await say('rv2-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const give = [];
  for (const it of ['etim:nugget_ancient_metal', 'etim:ingot_ancient_metal', 'etim:nugget_copper']) {
    await clearAll();
    const r = (await cmd(`/give ${NAME} ${it} 1`)).trim();
    const ok = !/no such item/i.test(r) && /Given|item/i.test(r);
    give.push({ item: it, reply: r, ok });
    mark(`rv2 give ${it} -> ${r} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  for (const item of ['etim:nugget_ancient_metal', 'etim:ingot_ancient_metal']) {
    const f = F.netherrack;
    await resetFurnace(f);
    await giveList([[item, 1], ['minecraft:blaze_rod', 1]]);
    const xp0 = await xpTotal();
    const n0 = logLen();
    const w = await openBlock(f.x, f.y, f.z);
    if (!w) { mark(`rv2 ${item}: NO-WINDOW`); continue; }
    click(w.windowId, 30); await sleep(180);
    click(w.windowId, 0); await sleep(450);
    click(w.windowId, 30); await sleep(150);
    closeWindow(w.windowId);
    await sleep(12000);
    const added = since(n0);
    const admit = added.filter((l) => l.includes('smelt admit')).map(firstLine);
    const denied = added.filter((l) => /denied|deny/.test(l)).map(firstLine);
    const payout = added.filter((l) => l.includes('xp payout')).map(firstLine);
    const xp1 = await xpTotal();
    const left = await clearCount(item);
    const ok = admit.length === 0 && payout.length === 0 && xp1 === xp0 && left === 1
      && denied.some((l) => l.includes('no-recipe') && l.includes('ancient_metal'));
    results.push({ v: 'RV2', item, admit, denied, payout, xp: [xp0, xp1], left, ok });
    mark(`rv2 ${item}: admit=${admit.length} denied=${JSON.stringify(denied.slice(0, 2))} payout=${payout.length} xp ${xp0}->${xp1} left=${left} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  mark(`rv2 give-summary=${JSON.stringify(give.map((g) => [g.item, g.ok]))}`);
  results.push({ v: 'RV2', give });
  await say('rv2-end');
}

async function rv4explore() {
  await say('rv4explore-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const spots = [[40000, 40000], [40080, 40000], [40000, 40080], [40080, 40080], [40160, 40080], [40080, 40160]];
  for (const [x, z] of spots) {
    await cmd(`/tp ${NAME} ${x + 0.5} 120 ${z + 0.5} 0 0`);
    await sleep(40000);
    const n = readLog().split(/\r?\n/).filter((l) => l.includes('[OreLog] ore=ore_copper')).length;
    mark(`rv4 tp ${x},${z} -> copper rows so far=${n}`);
    if (n >= 120) { mark('rv4 explore target reached'); break; }
  }
  await say('rv4explore-end');
}

async function rv4census() {
  await say('rv4census-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const boot1 = path.join(OUT_DIR, 'b1-rev-boot1.log');
  const texts = [];
  try { texts.push(fs.readFileSync(boot1, 'utf8')); } catch (e) { mark('rv4census boot1 snapshot missing'); }
  texts.push(readLog());
  const grownOf = new Map();
  let lines = 0;
  for (const t of texts) {
    for (const l of t.split(/\r?\n/)) {
      if (!l.includes('[OreLog]')) continue;
      lines++;
      const m = /ore=ore_copper chunk=\((-?\d+),(-?\d+)\).*grown=(\d+)/.exec(l);
      if (m) grownOf.set(`${m[1]},${m[2]}`, parseInt(m[3], 10));
    }
  }
  const chunks = [...grownOf.keys()].map((k) => k.split(',').map(Number));
  mark(`rv4census orelog-lines=${lines} distinct copper chunks=${chunks.length}`);
  const fillN = async (c) => {
    let out = (await cmd(c)).trim();
    if (/No blocks filled/.test(out)) return 0;
    let m = /(\d+) blocks? filled/.exec(out);
    if (!m) { await sleep(2000); out = (await cmd(c)).trim(); if (/No blocks filled/.test(out)) return 0; m = /(\d+) blocks? filled/.exec(out); }
    return m ? parseInt(m[1], 10) : -1;
  };
  const want = Math.min(40, chunks.length);
  const stride = Math.max(1, Math.floor(chunks.length / want));
  const pick = [];
  for (let i = 0; i < chunks.length && pick.length < want; i += stride) pick.push(chunks[i]);
  const census = [];
  let grownSum = 0, censusSum = 0, adamSum = 0, mismatched = 0, land = 0, landGrown = 0, landCensus = 0;
  for (const [cx, cz] of pick) {
    await cmd(`/tp ${NAME} ${cx * 16 + 8.5} 120 ${cz * 16 + 8.5} 0 0`);
    await sleep(3200);
    const stone = await fillN(`/fill ${cx * 16} 0 ${cz * 16} ${cx * 16 + 15} 127 ${cz * 16 + 15} minecraft:air 0 replace minecraft:stone`);
    const n = await fillN(`/fill ${cx * 16} 0 ${cz * 16} ${cx * 16 + 15} 255 ${cz * 16 + 15} minecraft:air 0 replace etim:ore_copper`);
    const a = await fillN(`/fill ${cx * 16} 0 ${cz * 16} ${cx * 16 + 15} 255 ${cz * 16 + 15} minecraft:air 0 replace etim:ore_adamantium`);
    const g = grownOf.get(`${cx},${cz}`);
    grownSum += g; censusSum += n; adamSum += a;
    if (g !== n) mismatched++;
    if (stone >= 8000) { land++; landGrown += g; landCensus += n; }
    census.push({ cx, cz, stone, grown: g, census: n, adamantium: a });
    mark(`rv4census chunk ${cx},${cz}: stone=${stone} grown=${g} census=${n} adamantium=${a} ${g === n ? 'MATCH' : 'MISMATCH'}`);
  }
  const landMeanGrown = land ? +(landGrown / land).toFixed(2) : 0;
  const landMeanCensus = land ? +(landCensus / land).toFixed(2) : 0;
  results.push({ v: 'RV4census', sampled: census.length, chunks: census, grownSum, censusSum, adamSum, mismatched, land, landMeanGrown, landMeanCensus });
  mark(`rv4census n=${census.length} grownSum=${grownSum} censusSum=${censusSum} adamantium=${adamSum} mismatched=${mismatched} land=${land} landMeanGrown=${landMeanGrown} landMeanCensus=${landMeanCensus}`);
  await say('rv4census-end');
}

async function rv4ore() {
  await say('rv4ore-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const boot1 = path.join(OUT_DIR, 'b1-rev-boot1.log');
  const texts = [];
  try { texts.push(fs.readFileSync(boot1, 'utf8')); } catch (e) { /* none */ }
  texts.push(fs.readFileSync(path.join(OUT_DIR, 'b1-rev-boot0-killed.log'), 'utf8'));
  texts.push(readLog());
  const grownOf = new Map();
  for (const t of texts) {
    for (const l of t.split(/\r?\n/)) {
      const m = /ore=ore_copper chunk=\((-?\d+),(-?\d+)\).*grown=(\d+)/.exec(l);
      if (m) grownOf.set(`${m[1]},${m[2]}`, parseInt(m[3], 10));
    }
  }
  const chunks = [...grownOf.keys()].map((k) => k.split(',').map(Number));
  const want = Math.min(40, chunks.length);
  const stride = Math.max(1, Math.floor(chunks.length / want));
  const pick = [];
  for (let i = 0; i < chunks.length && pick.length < want; i += stride) pick.push(chunks[i]);
  const fillN = async (c) => {
    let out = (await cmd(c)).trim();
    if (/No blocks filled/.test(out)) return 0;
    let m = /(\d+) blocks? filled/.exec(out);
    if (!m) { await sleep(1500); out = (await cmd(c)).trim(); if (/No blocks filled/.test(out)) return 0; m = /(\d+) blocks? filled/.exec(out); }
    if (!m) { mark(`    fill FAIL: ${out}`); return -1; }
    return parseInt(m[1], 10);
  };
  const countBlocks = async (cx, cz, blk) => {
    let t = 0;
    for (const [y1, y2] of [[0, 127], [128, 255]]) {
      const n = await fillN(`/fill ${cx * 16} ${y1} ${cz * 16} ${cx * 16 + 15} ${y2} ${cz * 16 + 15} minecraft:air 0 replace ${blk}`);
      if (n < 0) return -1;
      t += n;
    }
    return t;
  };
  const rows = [];
  let grownSum = 0, copperSum = 0, adamSum = 0, mismatched = 0;
  for (const [cx, cz] of pick) {
    await cmd(`/tp ${NAME} ${cx * 16 + 8.5} 120 ${cz * 16 + 8.5} 0 0`);
    await sleep(3000);
    const copper = await countBlocks(cx, cz, 'etim:ore_copper');
    const adam = await countBlocks(cx, cz, 'etim:ore_adamantium');
    const g = grownOf.get(`${cx},${cz}`);
    grownSum += g; copperSum += copper; adamSum += adam;
    if (g !== copper) mismatched++;
    rows.push({ cx, cz, grown: g, copper, adamantium: adam });
    mark(`rv4ore chunk ${cx},${cz}: grown=${g} census=${copper} adamantium=${adam} ${g === copper ? 'MATCH' : 'MISMATCH'}`);
  }
  results.push({ v: 'RV4ore', sampled: rows.length, rows, grownSum, copperSum, adamSum, mismatched });
  mark(`rv4ore n=${rows.length} grownSum=${grownSum} censusSum=${copperSum} adamantium=${adamSum} mismatched=${mismatched}`);
  await say('rv4ore-end');
}

async function rv4ore2() {
  await say('rv4ore2-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  // NOTE: the [OreLog] `chunk=` field carries the BLOCK position of the chunk origin
  // (BiomeDecorator.chunkPos = chunkX*16), not the chunk index. Treat as block coords.
  const boot1 = path.join(OUT_DIR, 'b1-rev-boot1.log');
  const texts = [];
  try { texts.push(fs.readFileSync(boot1, 'utf8')); } catch (e) { /* none */ }
  texts.push(fs.readFileSync(path.join(OUT_DIR, 'b1-rev-boot0-killed.log'), 'utf8'));
  texts.push(readLog());
  const grownOf = new Map();
  for (const t of texts) {
    for (const l of t.split(/\r?\n/)) {
      const m = /ore=ore_copper chunk=\((-?\d+),(-?\d+)\).*grown=(\d+)/.exec(l);
      if (m) grownOf.set(`${m[1]},${m[2]}`, parseInt(m[3], 10));
    }
  }
  const chunks = [...grownOf.keys()].map((k) => k.split(',').map(Number));
  const want = Math.min(40, chunks.length);
  const stride = Math.max(1, Math.floor(chunks.length / want));
  const pick = [];
  for (let i = 0; i < chunks.length && pick.length < want; i += stride) pick.push(chunks[i]);
  const fillN = async (c) => {
    let out = (await cmd(c)).trim();
    if (/No blocks filled/.test(out)) return 0;
    let m = /(\d+) blocks? filled/.exec(out);
    if (!m) { await sleep(1500); out = (await cmd(c)).trim(); if (/No blocks filled/.test(out)) return 0; m = /(\d+) blocks? filled/.exec(out); }
    if (!m) { mark(`    fill FAIL: ${out}`); return -1; }
    return parseInt(m[1], 10);
  };
  const countOre = async (bx, bz, blk) => {
    let t = 0;
    for (const [y1, y2] of [[0, 127], [128, 255]]) {
      const n = await fillN(`/fill ${bx} ${y1} ${bz} ${bx + 15} ${y2} ${bz + 15} minecraft:air 0 replace ${blk}`);
      if (n < 0) return -1;
      t += n;
    }
    return t;
  };
  const rows = [];
  let grownSum = 0, censusSum = 0, adamSum = 0, mismatched = 0, land = 0, landGrown = 0;
  for (const [bx, bz] of pick) {
    await cmd(`/tp ${NAME} ${bx + 8.5} 120 ${bz + 8.5} 0 0`);
    await sleep(3000);
    const stone = await fillN(`/fill ${bx} 0 ${bz} ${bx + 15} 127 ${bz + 15} minecraft:air 0 replace minecraft:stone`);
    const copper = await countOre(bx, bz, 'etim:ore_copper');
    const adam = await countOre(bx, bz, 'etim:ore_adamantium');
    const g = grownOf.get(`${bx},${bz}`);
    grownSum += g; censusSum += copper; adamSum += adam;
    const isLand = stone >= 8000;
    if (isLand) { land++; landGrown += g; }
    if (g !== copper) mismatched++;
    rows.push({ bx, bz, stone, grown: g, copper, adamantium: adam, land: isLand });
    mark(`rv4ore2 chunk@${bx},${bz}: stone=${stone} grown=${g} census=${copper} adamantium=${adam} land=${isLand} ${g === copper ? 'MATCH' : 'MISMATCH'}`);
  }
  const oc = rows.filter((r) => !r.land);
  const oceanMean = oc.length ? +(oc.reduce((n, r) => n + r.grown, 0) / oc.length).toFixed(2) : 0;
  results.push({ v: 'RV4ore2', sampled: rows.length, rows, grownSum, censusSum, adamSum, mismatched, land, landGrown, landMeanGrown: land ? +(landGrown / land).toFixed(2) : 0, oceanCount: oc.length, oceanMean });
  mark(`rv4ore2 n=${rows.length} grownSum=${grownSum} censusSum=${censusSum} adamantium=${adamSum} mismatched=${mismatched} land=${land} landMeanGrown=${land ? (landGrown / land).toFixed(2) : 0} ocean=${oc.length} oceanMean=${oceanMean}`);
  await say('rv4ore2-end');
}

async function rv4closed() {
  await say('rv4closed-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const texts = [fs.readFileSync(path.join(OUT_DIR, 'b1-rev-boot0-killed.log'), 'utf8'), readLog()];
  const grownOf = new Map();
  for (const t of texts) {
    for (const l of t.split(/\r?\n/)) {
      const m = /ore=ore_copper chunk=\((-?\d+),(-?\d+)\).*grown=(\d+)/.exec(l);
      if (m) grownOf.set(`${m[1]},${m[2]}`, parseInt(m[3], 10));
    }
  }
  const fillN = async (c) => {
    let out = (await cmd(c)).trim();
    if (/No blocks filled/.test(out)) return 0;
    let m = /(\d+) blocks? filled/.exec(out);
    if (!m) { await sleep(1500); out = (await cmd(c)).trim(); if (/No blocks filled/.test(out)) return 0; m = /(\d+) blocks? filled/.exec(out); }
    if (!m) { mark(`    fill FAIL: ${out}`); return -1; }
    return parseInt(m[1], 10);
  };
  const center = [40000, 40000];
  let grownSum = 0, censusSum = 0, have = 0;
  const rows = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const bx = center[0] + i * 16;
      const bz = center[1] + j * 16;
      const g = grownOf.get(`${bx},${bz}`);
      if (g === undefined) { mark(`rv4closed missing log row @${bx},${bz}`); continue; }
      have++;
      await cmd(`/tp ${NAME} ${bx + 8.5} 120 ${bz + 8.5} 0 0`);
      await sleep(2600);
      let c = 0;
      for (const [y1, y2] of [[0, 127], [128, 255]]) {
        c += await fillN(`/fill ${bx} ${y1} ${bz} ${bx + 15} ${y2} ${bz + 15} minecraft:air 0 replace etim:ore_copper`);
      }
      grownSum += g; censusSum += c;
      rows.push({ bx, bz, grown: g, census: c });
    }
  }
  results.push({ v: 'RV4closed', have, grownSum, censusSum, rows });
  mark(`rv4closed chunks=${have} grownSum=${grownSum} censusSum=${censusSum} delta=${censusSum - grownSum}`);
  await say('rv4closed-end');
}

async function rvCount() {
  await say('rvCount-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:nugget_ancient_metal', 1);
  await giveItem('etim:ingot_mithril', 3);
  for (const c of [
    `/clear ${NAME} etim:nugget_ancient_metal 0 0`,
    `/clear ${NAME} etim:nugget_ancient_metal -1 0`,
    `/clear ${NAME} etim:nugget_ancient_metal 0`,
    `/clear ${NAME} etim:ingot_mithril 0 0`,
  ]) {
    mark(`rvCount raw: ${(await cmd(c)).trim()}`);
  }
  await say('rvCount-end');
}

// ================================================================== batch B2 window
// (gear dump / mining grade matrix / dig-speed band / burn face / reach / armor / recipes)
const W = {
  mine: {
    mithrilDeny:  { x: -50, y: 100, z: 8, block: 'etim:ore_mithril' },
    copperAllow:  { x: -46, y: 100, z: 8, block: 'etim:ore_copper' },
    mithrilAllow: { x: -42, y: 100, z: 8, block: 'etim:ore_mithril' },
    mithrilIron:  { x: -38, y: 100, z: 8, block: 'etim:ore_mithril' },
    adamantDeny:  { x: -34, y: 100, z: 8, block: 'etim:ore_adamantium' },
    adamantAllow: { x: -30, y: 100, z: 8, block: 'etim:ore_adamantium' },
    speedStone:   { x: -26, y: 100, z: 8, block: 'minecraft:stone' },
    speedDirt:    { x: -22, y: 100, z: 8, block: 'minecraft:dirt' },
    speedSand:    { x: -20, y: 100, z: 8, block: 'minecraft:sandstone' },
    speedLog:     { x: -18, y: 100, z: 8, block: 'minecraft:log' },
  },
  reach: {
    pick:   { x: -48, y: 100, z: 40, block: 'minecraft:stone' },
    hand:   { x: -42, y: 100, z: 40, block: 'minecraft:stone' },
    dagger: { x: -36, y: 100, z: 40, block: 'minecraft:stone' },
    web:    { x: -30, y: 100, z: 40, block: 'minecraft:web' },
    hoe:    { x: -24, y: 100, z: 40, block: 'minecraft:dirt' },
  },
  furn: {
    vanilla:  { x: -44, y: 100, z: 24, name: 'minecraft:furnace',        cap: 2 },
    obsidian: { x: -41, y: 100, z: 24, name: 'etim:furnace_obsidian',    cap: 3 },
  },
  table: { x: -38, y: 100, z: 24 },
  fall:  { x: -20, y: 100, z: 36 },
};

function startDig(x, y, z) {
  bot._client.write('block_dig', { status: 0, location: new Vec3(x, y, z), face: 1 });
}
function stopDig(x, y, z) {
  // 1.12: STOP_DESTROY_BLOCK(2) is the packet that finalizes the harvest; ABORT(1)
  // throws the accumulated progress away (B1-era harness semantics).
  bot._client.write('block_dig', { status: 2, location: new Vec3(x, y, z), face: 1 });
}
const abortDig = stopDig;
async function blockIs(x, y, z, name) {
  return (await cmd(`/testforblock ${x} ${y} ${z} ${name}`)).includes('Successfully found');
}

/** Survival dig probe: hold `tool`, stand `standOff` blocks south of the target, dig `ms`
 *  through raw block_dig frames (no client reach/among checks), then report the rows. */
async function digAt(p, tool, ms, standOff = 2.0) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  if (tool) await giveItem(tool, 1);
  selectSlot(0);
  await cmd(`/etest food 20 20 ${NAME}`);   // dev channel: refill both pools (dig str divisor otherwise applies)
  await cmd(`/tp ${NAME} ${p.x + 0.5} 100 ${p.z + standOff + 0.5} 180 0`);
  await sleep(450);
  await cmd(`/gamemode 0 ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:resistance 9999 4 true`);
  await cmd(`/effect ${NAME} minecraft:saturation 9999 4 true`);
  await sleep(350);
  const n0 = logLen();
  startDig(p.x, p.y, p.z);
  await sleep(ms);
  stopDig(p.x, p.y, p.z);
  await sleep(600);
  return since(n0);
}

async function w0setup() {
  await say('w0setup-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd('/gamerule doMobSpawning false');
  await cmd('/gamerule keepInventory true');
  await cmd('/kill @e[type=!Player]');
  await cmd('/time set 6000');
  await cmd('/weather clear');
  await cmd(`/tp ${NAME} -34.5 101 24.5 0 0`);
  await sleep(2000);
  mark(`w0 floor: ${(await cmd('/fill -52 99 4 -16 99 44 minecraft:stone')).trim()}`);
  mark(`w0 clear: ${(await cmd('/fill -52 100 4 -16 103 44 minecraft:air')).trim()}`);
  for (const k of Object.keys(W.mine)) {
    const p = W.mine[k];
    const r = await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    mark(`w0 mine ${k.padEnd(12)} ${p.block.padEnd(24)} -> ${r.trim()}`);
  }
  for (const k of Object.keys(W.reach)) {
    const p = W.reach[k];
    const r = await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    mark(`w0 reach ${k.padEnd(7)} ${p.block.padEnd(18)} -> ${r.trim()}`);
  }
  for (const k of Object.keys(W.furn)) {
    const f = W.furn[k];
    const r = await cmd(`/setblock ${f.x} ${f.y} ${f.z} ${f.name} 2`);
    mark(`w0 furnace ${k.padEnd(9)} -> ${r.trim()}`);
  }
  await cmd(`/setblock ${W.table.x} ${W.table.y} ${W.table.z} minecraft:crafting_table 0`);
  await cmd('/scoreboard objectives add hp health');
  await cmd('/scoreboard objectives add hp health dummy'); // harmless duplicate guard
  await cmd(`/tp ${NAME} -34.5 101 24.5 0 0`);
  await sleep(300);
  await say('w0setup-end');
}

async function w2mining() {
  await say('w2-begin');
  const rec = [];
  const mining = (tool, block, kind) => {
    const stem = block.split(':').pop();
    const out = [];
    for (const l of readLog().split(/\r?\n/)) {
      if (!l.includes('[MiningLog] mine ' + kind + ' ')) continue;
      if (!l.includes('item=' + tool + ' ')) continue;
      if (!l.includes('block=' + stem + ' ')) continue;
      out.push(firstLine(l));
    }
    return out;
  };

  // 1) copper pickaxe (grade 2) vs mithril ore (min 3) -> deny + no break + no drop
  {
    const p = W.mine.mithrilDeny;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    await digAt(p, 'etim:pickaxe_copper', 5000, 2.0);
    const deny = mining('etim:pickaxe_copper', p.block, 'deny');
    const speed = mining('etim:pickaxe_copper', p.block, 'speed');
    const still = await blockIs(p.x, p.y, p.z, p.block);
    const drop = await clearCount(p.block);
    const ok = deny.some((l) => l.includes('grade=2 required=3') && l.includes('item=etim:pickaxe_copper') && l.includes('block=ore_mithril'))
      && speed.length === 0 && still && drop <= 0;
    rec.push({ v: 'W2', key: 'copper-vs-mithril', want: 'DENY', deny, speed, still, drop, ok });
    mark(`w2 copper pickaxe x ore_mithril: deny=${JSON.stringify(deny)} speed=${speed.length} still=${still} drop=${drop} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // 2) copper pickaxe (grade 2) vs copper ore (min 2) -> admitted, breaks, drops
  {
    const p = W.mine.copperAllow;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    await digAt(p, 'etim:pickaxe_copper', 4000, 2.0);
    const deny = mining('etim:pickaxe_copper', p.block, 'deny');
    const speed = mining('etim:pickaxe_copper', p.block, 'speed');
    const still = await blockIs(p.x, p.y, p.z, p.block);
    await cmd(`/tp ${NAME} ${p.x + 0.5} 100 ${p.z + 0.5} 180 0`);
    await sleep(1800);
    const drop = await clearCount(p.block);
    const ok = deny.length === 0 && !still && drop === 1 && speed.length > 0;
    rec.push({ v: 'W2', key: 'copper-vs-copper', want: 'ADMIT', deny, speed, still, drop, ok });
    mark(`w2 copper pickaxe x ore_copper: deny=${deny.length} still=${still} drop=${drop} speed=${JSON.stringify(speed.slice(0, 1))} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // 3) mithril pickaxe (grade 4) vs mithril ore -> admitted + speed 10.0
  {
    const p = W.mine.mithrilAllow;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    await digAt(p, 'etim:pickaxe_mithril', 4000, 2.0);
    const deny = mining('etim:pickaxe_mithril', p.block, 'deny');
    const speed = mining('etim:pickaxe_mithril', p.block, 'speed');
    const still = await blockIs(p.x, p.y, p.z, p.block);
    const ok = deny.length === 0 && !still
      && speed.some((l) => l.includes('item=etim:pickaxe_mithril') && l.includes('block=ore_mithril') && l.includes('str=10.0'));
    rec.push({ v: 'W2', key: 'mithril-vs-mithril', want: 'ADMIT', deny, speed, still, ok });
    mark(`w2 mithril pickaxe x ore_mithril: deny=${deny.length} still=${still} speed=${JSON.stringify(speed.slice(0, 1))} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // 4) vanilla iron pickaxe vs mithril ore -> fold grade 3 (闂傚倸鍊搁崐鎼佸磹閹间礁纾归柟闂寸绾剧懓顪冪€ｎ亜顒㈡い鎰Г閹便劌螣閹稿海銆愰梺缁樺笒閻忔岸濡甸崟顖氱鐎广儱鐗嗛崢锟犳⒑闂堟稒顥為悽顖滃仧濡叉劙骞掗幘鍓佹嚌闂侀€炲苯澧寸€殿喓鍔戦弻鍡楊吋閸涘偊绠撻弻娑㈠即閵娿儳浼囬梺杞扮閸熸挳寮婚弴锛勭杸濠电姴鍟悵鏇㈡⒑鐎圭媭鍤欓柣妤佹崌楠?闂傚倸鍊搁崐鎼佸磹閹间礁纾瑰瀣捣閻棗霉閿濆浜ら柤鏉挎健濮婃椽顢楅埀顒傜矓閹绢喖纾奸柕濞у嫬鏋戦梺鍝勫€藉▔鏇㈠汲閿曞倹鐓欓柣妤€鐗婄欢鏌ユ煙绾懎鐓愰柕鍥у楠炴鎹勯惄鎺嬪劦閺?2: vanilla fold untouched, min 3 -> admitted)
  {
    const p = W.mine.mithrilIron;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    await digAt(p, 'minecraft:iron_pickaxe', 5000, 2.0);
    const deny = mining('minecraft:iron_pickaxe', p.block, 'deny');
    const speed = mining('minecraft:iron_pickaxe', p.block, 'speed');
    const still = await blockIs(p.x, p.y, p.z, p.block);
    const ok = deny.length === 0 && !still;
    rec.push({ v: 'W2', key: 'iron-vs-mithril', want: 'ADMIT(fold=3)', deny, speed, still, ok });
    mark(`w2 iron pickaxe x ore_mithril: deny=${JSON.stringify(deny)} still=${still} speed=${JSON.stringify(speed.slice(0, 1))} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // 5) copper pickaxe (grade 2) vs adamantium ore (min 4) -> deny + no break
  {
    const p = W.mine.adamantDeny;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    await digAt(p, 'etim:pickaxe_copper', 5000, 2.0);
    const deny = mining('etim:pickaxe_copper', p.block, 'deny');
    const still = await blockIs(p.x, p.y, p.z, p.block);
    const ok = deny.some((l) => l.includes('grade=2 required=4') && l.includes('block=ore_adamantium')) && still;
    rec.push({ v: 'W2', key: 'copper-vs-adamantium', want: 'DENY', deny, still, ok });
    mark(`w2 copper pickaxe x ore_adamantium: deny=${JSON.stringify(deny)} still=${still} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // 6) adamantium pickaxe (grade 5) vs adamantium ore (min 4) -> admitted + speed 12.0
  {
    const p = W.mine.adamantAllow;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    await digAt(p, 'etim:pickaxe_adamantium', 4000, 2.0);
    const deny = mining('etim:pickaxe_adamantium', p.block, 'deny');
    const speed = mining('etim:pickaxe_adamantium', p.block, 'speed');
    const still = await blockIs(p.x, p.y, p.z, p.block);
    const ok = deny.length === 0 && !still
      && speed.some((l) => l.includes('item=etim:pickaxe_adamantium') && l.includes('str=12.0'));
    rec.push({ v: 'W2', key: 'adamantium-vs-adamantium', want: 'ADMIT', deny, speed, still, ok });
    mark(`w2 adamantium pickaxe x ore_adamantium: deny=${deny.length} still=${still} speed=${JSON.stringify(speed.slice(0, 1))} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // deny-row dedup proof: same (item, block) denied twice -> the second click adds no row
  {
    const p = W.mine.mithrilDeny;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(200);
    const before = mining('etim:pickaxe_copper', p.block, 'deny').length;
    await digAt(p, 'etim:pickaxe_copper', 2500, 2.0);
    const after = mining('etim:pickaxe_copper', p.block, 'deny').length;
    const ok = before === 1 && after === 1;
    rec.push({ v: 'W2', key: 'deny-dedup', want: 'NO-NEW-ROW', before, after, ok });
    mark(`w2 deny dedup (same item+block, 2nd click): rows ${before} -> ${after} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  results.push(...rec);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w2-end');
}

async function w3speed() {
  await say('w3-begin');
  const cells = [
    { key: 'copper-pick-stone',    p: W.mine.speedStone, tool: 'etim:pickaxe_copper',     want: 'str=7.0' },
    { key: 'copper-hoe-dirt',      p: W.mine.speedDirt,  tool: 'etim:hoe_copper',         want: 'str=3.5' },
    { key: 'copper-axe-log',       p: W.mine.speedLog,   tool: 'etim:axe_copper',         want: 'str=7.0' },
    { key: 'copper-axe-sandstone', p: W.mine.speedSand,  tool: 'etim:axe_copper',         want: 'record' },
    { key: 'copper-shovel-dirt',   p: W.mine.speedDirt,  tool: 'etim:shovel_copper',      want: 'str=7.0' },
    { key: 'iron-pick-stone',      p: W.mine.speedStone, tool: 'minecraft:iron_pickaxe',  want: 'record' },
  ];
  for (const c of cells) {
    const stem = c.p.block.split(':').pop();
    await cmd(`/setblock ${c.p.x} ${c.p.y} ${c.p.z} ${c.p.block} 0`);
    await sleep(200);
    await digAt(c.p, c.tool, 3000, 2.0);
    const speed = [];
    for (const l of readLog().split(/\r?\n/)) {
      if (!l.includes('[MiningLog] mine speed ')) continue;
      if (!l.includes('item=' + c.tool + ' ')) continue;
      if (!l.includes('block=' + stem + ' ')) continue;
      speed.push(firstLine(l));
    }
    const ok = c.want === 'record' ? true : speed.some((l) => l.includes(c.want));
    results.push({ v: 'W3', key: c.key, tool: c.tool, block: c.p.block, want: c.want, speed, ok });
    mark(`w3 ${c.key.padEnd(21)} ${c.tool.padEnd(24)} want=${c.want} got=${JSON.stringify(speed.slice(0, 1))} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w3-end');
}

async function w4burn() {
  await say('w4-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const f = W.furn.vanilla;
  const tools = ['etim:pickaxe_copper', 'etim:pickaxe_silver', 'etim:pickaxe_mithril',
    'etim:pickaxe_adamantium', 'etim:pickaxe_ancient_metal'];
  for (const tool of tools) {
    await resetFurnace(f);
    await giveList([['minecraft:cobblestone', 3], [tool, 1]]);
    const n0 = logLen();
    const w = await openBlock(f.x, f.y, f.z);
    if (!w) { mark(`w4 ${tool}: NO-WINDOW`); results.push({ v: 'W4', tool, ok: false }); continue; }
    await putFromHotbar(w.windowId, 0, 0);
    await putFromHotbar(w.windowId, 1, 1);
    closeWindow(w.windowId);
    await sleep(3500);
    const rows = since(n0);
    const burn = rows.filter((l) => l.includes('fuel burn=')).map(firstLine);
    const deny = rows.filter((l) => l.includes('gui place denied')).map(firstLine);
    const ok = burn.some((l) => l.includes('burn=100') && l.includes('item=' + tool) && l.includes('(vanilla)'))
      && deny.length === 0;
    results.push({ v: 'W4', tool, burn, deny, ok });
    mark(`w4 burn ${tool.padEnd(26)} -> ${JSON.stringify(burn.slice(0, 1))} deny=${deny.length} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  // negatives: armor + chain are not fuel (burn=-1 -> heat 0 -> slot deny, no burn row)
  for (const item of ['etim:helmet_copper', 'etim:chain_copper']) {
    await resetFurnace(f);
    await giveList([['minecraft:cobblestone', 1], [item, 1]]);
    const n0 = logLen();
    const w = await openBlock(f.x, f.y, f.z);
    if (!w) { mark(`w4 ${item}: NO-WINDOW`); continue; }
    await putFromHotbar(w.windowId, 0, 0);
    await putFromHotbar(w.windowId, 1, 1);
    closeWindow(w.windowId);
    await sleep(2500);
    const rows = since(n0);
    const burn = rows.filter((l) => l.includes('fuel burn=')).map(firstLine);
    const deny = rows.filter((l) => l.includes('gui place denied')).map(firstLine);
    const ok = deny.some((l) => l.includes('heat=0') && l.includes('item=' + item))
      && !burn.some((l) => /fuel burn=[1-9]/.test(l));
    results.push({ v: 'W4', tool: item, burn, deny, ok });
    mark(`w4 negative ${item.padEnd(24)} burn=${JSON.stringify(burn.slice(0, 1))} deny=${JSON.stringify(deny.slice(0, 1))} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  await resetFurnace(f);
  await say('w4-end');
}

/** Reach probe: stand `off` blocks east of the block centre, survival, raw dig start.
 *  Row capture is count-diff based (whole-log; immune to slice off-by-one and to the
 *  server/Node clock skew seen in this window). */
function reachRows() {
  return readLog().split(/\r?\n/).filter((l) => l.includes('reach denied'));
}

async function reachProbe(p, off, tool, digMs = 2600) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await cmd('/effect ' + NAME + ' clear');
  if (tool) await giveItem(tool, 1);
  selectSlot(0);
  await cmd(`/etest food 20 20 ${NAME}`);
  await cmd(`/tp ${NAME} ${(p.x + off + 0.5).toFixed(3)} 100 ${p.z + 0.5} 90 0`);
  await sleep(900);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(600);
  const pos = (await cmd(`/tp ${NAME} ~ ~ ~`)).trim();
  const before = reachRows().length;
  startDig(p.x, p.y, p.z);
  await sleep(digMs);
  abortDig(p.x, p.y, p.z);
  await sleep(600);
  const all = reachRows();
  const denied = all.slice(before).map(firstLine);
  const broken = !(await blockIs(p.x, p.y, p.z, p.block));
  return { denied, broken, pos };
}

/** Single right-click probe: fires PlayerInteractEvent.RightClickBlock (the same reach
 *  gate) without starting a dig, so probes cannot contaminate each other. */
async function clickProbe(p, off, tool) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await cmd('/effect ' + NAME + ' clear');
  if (tool) await giveItem(tool, 1);
  selectSlot(0);
  await cmd(`/tp ${NAME} ${(p.x + off + 0.5).toFixed(3)} 100 ${p.z + 0.5} 90 0`);
  await sleep(900);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(600);
  const pos = (await cmd(`/tp ${NAME} ~ ~ ~`)).trim();
  const before = reachRows().length;
  bot._client.write('block_place', {
    location: new Vec3(p.x, p.y, p.z), direction: 1, hand: 0,
    cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5,
  });
  await sleep(1400);
  const all = reachRows();
  return { denied: all.slice(before).map(firstLine), pos };
}

async function w5reach() {
  await say('w5-begin');
  const clicks = [
    { key: 'pick-click-allow', p: W.reach.pick,   off: 3.566, tool: 'etim:pickaxe_copper', expect: 'ALLOW' },
    { key: 'pick-click-deny',  p: W.reach.pick,   off: 3.868, tool: 'etim:pickaxe_copper', expect: 'DENY' },
    { key: 'hand-click-allow', p: W.reach.hand,   off: 2.857, tool: null,                  expect: 'ALLOW' },
    { key: 'hand-click-deny',  p: W.reach.hand,   off: 3.111, tool: null,                  expect: 'DENY' },
    { key: 'dagger-stone',     p: W.reach.dagger, off: 3.566, tool: 'etim:dagger_copper',  expect: 'PROBE' },
    { key: 'dagger-web',       p: W.reach.web,    off: 3.300, tool: 'etim:dagger_copper',  expect: 'PROBE' },
    { key: 'hoe-click-allow',  p: W.reach.hoe,    off: 3.566, tool: 'etim:hoe_copper',     expect: 'ALLOW' },
    { key: 'hoe-click-deny',   p: W.reach.hoe,    off: 3.868, tool: 'etim:hoe_copper',     expect: 'DENY' },
  ];
  const reachOf = (rows) => {
    const m = rows.length ? / > ([\d.]+)$/.exec(rows[rows.length - 1]) : null;
    return m ? m[1] : null;
  };
  for (const c of clicks) {
    await cmd(`/setblock ${c.p.x} ${c.p.y} ${c.p.z} ${c.p.block} 0`);
    await sleep(250);
    const r = await clickProbe(c.p, c.off, c.tool);
    const reach = reachOf(r.denied);
    const ok = c.expect === 'ALLOW' ? r.denied.length === 0
      : (c.expect === 'DENY' ? r.denied.length > 0 : true);
    results.push({ v: 'W5', key: c.key, mode: 'click', off: c.off, tool: c.tool, expect: c.expect, pos: r.pos, denied: r.denied, reach, ok });
    mark(`w5 ${c.key.padEnd(16)} off=${c.off} tool=${String(c.tool).padEnd(22)} expect=${c.expect} denied=${JSON.stringify(r.denied.slice(0, 1))} reach=${reach} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  // functional controls: inside reach the block actually breaks (dig path)
  for (const c of [
    { key: 'dig-pick-allow', p: W.reach.pick, tool: 'etim:pickaxe_copper' },
    { key: 'dig-hoe-allow',  p: W.reach.hoe,  tool: 'etim:hoe_copper' },
  ]) {
    await cmd(`/setblock ${c.p.x} ${c.p.y} ${c.p.z} ${c.p.block} 0`);
    await sleep(250);
    const r = await reachProbe(c.p, 3.566, c.tool, 14000);
    const ok = r.denied.length === 0 && r.broken;
    results.push({ v: 'W5', key: c.key, mode: 'dig', off: 3.566, tool: c.tool, expect: 'ALLOW+BREAK', pos: r.pos, denied: r.denied, broken: r.broken, ok });
    mark(`w5 ${c.key.padEnd(16)} off=3.566 tool=${String(c.tool).padEnd(22)} denied=${r.denied.length} broken=${r.broken} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w5-end');
}

async function readHealth() {
  // 1.12 has no /scoreboard players get 闂?use the per-player tracked list.
  const r = await cmd(`/scoreboard players list ${NAME}`);
  const m = /hp: (-?\d+)/.exec(r);
  return m ? parseInt(m[1], 10) : null;
}

async function fallTest(label, armor) {
  await cmd(`/clear ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await sleep(900);
  for (const a of armor) {
    await cmd(`/replaceitem entity ${NAME} ${a.slot} ${a.item} 1 0`);
  }
  await sleep(600);
  const before = await readHealth();
  bot.physicsEnabled = true;
  await cmd(`/tp ${NAME} ${W.fall.x + 0.5} 110 ${W.fall.z + 0.5} 0 0`);
  await sleep(3200);
  bot.physicsEnabled = false;
  const after = await readHealth();
  const damage = before !== null && after !== null ? before - after : null;
  mark(`w6 ${label.padEnd(10)} health ${before} -> ${after} damage=${damage}`);
  return { label, before, after, damage, armor };
}

async function w6armor() {
  await say('w6-begin');
  await cmd(`/gamemode 0 ${NAME}`);
  await cmd(`/effect ${NAME} clear`);
  await cmd('/fill -22 100 34 -18 110 38 minecraft:air');
  await cmd(`/tp ${NAME} ${W.fall.x + 0.5} 100 ${W.fall.z + 0.5} 0 0`);
  await sleep(800);
  const copper = [
    { slot: 'slot.armor.head', item: 'etim:helmet_copper' },
    { slot: 'slot.armor.chest', item: 'etim:chestplate_copper' },
    { slot: 'slot.armor.legs', item: 'etim:leggings_copper' },
    { slot: 'slot.armor.feet', item: 'etim:boots_copper' },
  ];
  const adamantium = [
    { slot: 'slot.armor.head', item: 'etim:helmet_adamantium' },
    { slot: 'slot.armor.chest', item: 'etim:chestplate_adamantium' },
    { slot: 'slot.armor.legs', item: 'etim:leggings_adamantium' },
    { slot: 'slot.armor.feet', item: 'etim:boots_adamantium' },
  ];
  const bare = await fallTest('bare', []);
  const cop = await fallTest('copper7', copper);
  const ada = await fallTest('adamant10', adamantium);
  const ok = bare.damage !== null && cop.damage !== null && ada.damage !== null
    && bare.damage > cop.damage && cop.damage > ada.damage;
  results.push({ v: 'W6', bare, copper: cop, adamantium: ada, ok });
  mark(`w6 damage bare=${bare.damage} copper7=${cop.damage} adamantium10=${ada.damage} ${ok ? 'OK' : 'MISMATCH'}`);
  await cmd(`/clear ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6-end');
}

async function craftAt(give, plan) {
  await clearAll();
  for (const [n, c] of give) await giveItem(n, c);
  const w = await openBlock(W.table.x, W.table.y, W.table.z, W.table.z + 3);
  if (!w) return null;
  for (const step of plan) {
    click(w.windowId, 37 + step.hotbar); await sleep(220);
    for (const s of step.slots) { click(w.windowId, s, 1); await sleep(140); }
    click(w.windowId, 37 + step.hotbar); await sleep(220);
  }
  await sleep(350);
  click(w.windowId, 0); await sleep(400);
  click(w.windowId, 10); await sleep(260);
  closeWindow(w.windowId);
  await sleep(350);
  return w;
}

async function w7craft() {
  await say('w7-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const cells = [
    { key: 'copper-pickaxe',   give: [['etim:ingot_copper', 3], ['minecraft:stick', 2]],     plan: [{ hotbar: 0, slots: [1, 2, 3] }, { hotbar: 1, slots: [5, 8] }], want: 'etim:pickaxe_copper' },
    { key: 'mithril-sword',    give: [['etim:ingot_mithril', 2], ['minecraft:stick', 1]],    plan: [{ hotbar: 0, slots: [2, 5] }, { hotbar: 1, slots: [8] }],         want: 'etim:sword_mithril' },
    { key: 'copper-helmet',    give: [['etim:ingot_copper', 5]],                              plan: [{ hotbar: 0, slots: [1, 2, 3, 4, 6] }],                            want: 'etim:helmet_copper' },
    { key: 'adamantium-chain-helmet', give: [['etim:chain_adamantium', 5]],                   plan: [{ hotbar: 0, slots: [1, 2, 3, 4, 6] }],                            want: 'etim:chain_helmet_adamantium' },
    { key: 'copper-boots',     give: [['etim:ingot_copper', 4]],                              plan: [{ hotbar: 0, slots: [1, 3, 4, 6] }],                               want: 'etim:boots_copper' },
  ];
  for (const c of cells) {
    const w = await craftAt(c.give, c.plan);
    if (!w) { mark(`w7 ${c.key}: NO-TABLE-WINDOW`); results.push({ v: 'W7', key: c.key, ok: false }); continue; }
    const got = await clearCount(c.want);
    const ok = got === 1;
    results.push({ v: 'W7', key: c.key, want: c.want, got, ok });
    mark(`w7 ${c.key.padEnd(26)} -> ${c.want} got=${got} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  await say('w7-end');
}

async function w5diag() {
  await say('w5diag-begin');
  const p = W.reach.pick;
  await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
  await sleep(300);
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:pickaxe_copper', 1);
  selectSlot(0);
  await cmd(`/tp ${NAME} ${(p.x + 3.868 + 0.5).toFixed(3)} 100 ${p.z + 0.5} 90 0`);
  await sleep(700);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(500);
  mark(`w5diag server-pos=${(await cmd(`/tp ${NAME} ~ ~ ~`)).trim()}`);
  const n0 = logLen();
  mark(`w5diag t0=${Date.now()} n0=${n0}`);
  startDig(p.x, p.y, p.z);
  await sleep(2500);
  stopDig(p.x, p.y, p.z);
  await sleep(600);
  const t = readLog();
  const lines = t.split(/\r?\n/);
  mark(`w5diag t1=${Date.now()} total=${lines.length} slice=${lines.slice(n0).length}`);
  mark(`w5diag last5=${JSON.stringify(lines.slice(-5))}`);
  mark(`w5diag globalReach=${lines.filter((l) => l.includes('reach denied')).length}`);
  const broken = !(await blockIs(p.x, p.y, p.z, p.block));
  mark(`w5diag broken=${broken}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w5diag-end');
}

async function w5dig() {
  await say('w5dig-begin');
  for (const off of [2.0, 3.0, 3.4, 3.57]) {
    const p = W.reach.pick;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(250);
    const r = await reachProbe(p, off, 'etim:pickaxe_copper', 9000);
    mark(`w5dig off=${off} denied=${r.denied.length} broken=${r.broken} pos=${r.pos}`);
  }
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w5dig-end');
}

async function w6diag() {
  await say('w6diag-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  mark(`obj-list=${(await cmd('/scoreboard objectives list')).trim()}`);
  mark(`obj-add=${(await cmd('/scoreboard objectives add hp health')).trim()}`);
  mark(`players-get=${(await cmd(`/scoreboard players get ${NAME} hp`)).trim()}`);
  mark(`players-list=${(await cmd(`/scoreboard players list ${NAME}`)).trim()}`);
  mark(`replaceitem=${(await cmd(`/replaceitem entity ${NAME} slot.armor.head etim:helmet_copper 1 0`)).trim()}`);
  mark(`replaceitem2=${(await cmd(`/replaceitem entity ${NAME} armor.head etim:helmet_copper 1 0`)).trim()}`);
  mark(`effects=${(await cmd(`/effect ${NAME}`)).trim()}`);
  await say('w6diag-end');
}

async function w6diag2() {
  await say('w6diag2-begin');
  await cmd(`/gamemode 0 ${NAME}`);
  await cmd(`/effect ${NAME} clear`);
  await cmd(`/clear ${NAME}`);
  for (const s of ['slot.armor.head', 'slot.armor.chest', 'slot.armor.legs', 'slot.armor.feet']) {
    const item = s.endsWith('head') ? 'minecraft:diamond_helmet' : s.endsWith('chest') ? 'minecraft:diamond_chestplate' : s.endsWith('legs') ? 'minecraft:diamond_leggings' : 'minecraft:diamond_boots';
    mark(`w6diag2 equip ${s} -> ${(await cmd(`/replaceitem entity ${NAME} ${s} ${item} 1 0`)).trim()}`);
  }
  mark(`w6diag2 helmet-count=${await clearCount('minecraft:diamond_helmet')}`);
  await sleep(500);
  mark(`w6diag2 hp=${await readHealth()}`);
  bot.physicsEnabled = true;
  await cmd(`/tp ${NAME} ${W.fall.x + 0.5} 110 ${W.fall.z + 0.5} 0 0`);
  await sleep(3200);
  bot.physicsEnabled = false;
  mark(`w6diag2 after-fall hp=${await readHealth()}`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6diag2-end');
}

async function w6zombie() {
  await say('w6zombie-begin');
  const run = async (label, armor) => {
    await cmd(`/kill @e[type=zombie]`);
    await cmd(`/gamemode 1 ${NAME}`);
    await cmd(`/clear ${NAME}`);
    await cmd(`/effect ${NAME} clear`);
    await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
    await sleep(700);
    for (const a of armor) await cmd(`/replaceitem entity ${NAME} ${a.slot} ${a.item} 1 0`);
    await cmd(`/gamemode 0 ${NAME}`);
    await cmd(`/tp ${NAME} ${W.fall.x + 0.5} 100 ${W.fall.z + 0.5} 0 0`);
    await sleep(700);
    const before = await readHealth();
    for (const dz of [-1, 0, 1]) {
      await cmd(`/summon zombie ${W.fall.x + 1.6} 100 ${W.fall.z + 0.5 + dz} {HandItems:[{id:"minecraft:diamond_sword",Count:1b},{}],PersistenceRequired:1b}`);
    }
    await sleep(12000);
    const after = await readHealth();
    await cmd(`/kill @e[type=zombie]`);
    mark(`w6zombie ${label.padEnd(10)} hp ${before} -> ${after} delta=${before !== null && after !== null ? before - after : null}`);
    return { label, before, after };
  };
  const bare = await run('bare', []);
  const dia = await run('diamond20', [
    { slot: 'slot.armor.head', item: 'minecraft:diamond_helmet' },
    { slot: 'slot.armor.chest', item: 'minecraft:diamond_chestplate' },
    { slot: 'slot.armor.legs', item: 'minecraft:diamond_leggings' },
    { slot: 'slot.armor.feet', item: 'minecraft:diamond_boots' },
  ]);
  results.push({ v: 'W6zombie', bare, diamond: dia });
  await cmd(`/clear ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6zombie-end');
}

async function w6res() {
  await say('w6res-begin');
  const run = async (label, effects, armor) => {
    await cmd(`/gamemode 1 ${NAME}`);
    await cmd(`/clear ${NAME}`);
    await cmd(`/effect ${NAME} clear`);
    await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
    await sleep(700);
    for (const a of armor) await cmd(`/replaceitem entity ${NAME} ${a.slot} ${a.item} 1 0`);
    for (const e of effects) await cmd(`/effect ${NAME} ${e} 999 3 true`);
    await cmd(`/gamemode 0 ${NAME}`);
    await sleep(700);
    const before = await readHealth();
    bot.physicsEnabled = true;
    await cmd(`/tp ${NAME} ${W.fall.x + 0.5} 110 ${W.fall.z + 0.5} 0 0`);
    await sleep(3200);
    bot.physicsEnabled = false;
    const after = await readHealth();
    mark(`w6res ${label.padEnd(14)} hp ${before} -> ${after} dmg=${before !== null && after !== null ? before - after : null}`);
    return { label, before, after };
  };
  const bare = await run('bare', [], []);
  const res = await run('resistance4', ['minecraft:resistance'], []);
  const resAda = await run('res+adamant10', ['minecraft:resistance'], [
    { slot: 'slot.armor.head', item: 'etim:helmet_adamantium' },
    { slot: 'slot.armor.chest', item: 'etim:chestplate_adamantium' },
    { slot: 'slot.armor.legs', item: 'etim:leggings_adamantium' },
    { slot: 'slot.armor.feet', item: 'etim:boots_adamantium' },
  ]);
  results.push({ v: 'W6res', bare, res, resAda });
  await cmd(`/effect ${NAME} clear`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6res-end');
}

async function wfood() {
  await say('wfood-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  mark(`wfood set=${(await cmd(`/etest food 20 20 ${NAME}`)).trim()}`);
  await sleep(600);
  bot.chat('/state');
  await sleep(1500);
  mark(`wfood naked-dig-start`);
  const p = W.mine.speedStone;
  await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
  await sleep(200);
  await clearAll();
  await giveItem('etim:pickaxe_copper', 1);
  selectSlot(0);
  await cmd(`/tp ${NAME} ${p.x + 0.5} 100 ${p.z + 2.5} 180 0`);
  await sleep(400);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(400);
  bot._client.write('position', { x: p.x + 0.5, y: 100, z: p.z + 2.5, onGround: true });
  await sleep(200);
  const t0 = Date.now();
  startDig(p.x, p.y, p.z);
  let broke = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    if (!(await blockIs(p.x, p.y, p.z, p.block))) { broke = true; break; }
  }
  abortDig(p.x, p.y, p.z);
  mark(`wfood dig broke=${broke} elapsed=${Date.now() - t0}ms`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('wfood-end');
}

async function w6cactus() {
  await say('w6cactus-begin');
  const run = async (label, armor) => {
    await cmd(`/gamemode 1 ${NAME}`);
    await cmd(`/clear ${NAME}`);
    await cmd(`/effect ${NAME} clear`);
    await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
    await sleep(700);
    for (const a of armor) await cmd(`/replaceitem entity ${NAME} ${a.slot} ${a.item} 1 0`);
    await cmd(`/fill ${W.fall.x - 1} 100 ${W.fall.z - 1} ${W.fall.x + 1} 101 ${W.fall.z + 1} minecraft:air`);
    await cmd(`/setblock ${W.fall.x} 100 ${W.fall.z} minecraft:cactus 0`);
    await cmd(`/gamemode 0 ${NAME}`);
    await sleep(500);
    const before = await readHealth();
    bot.physicsEnabled = true;
    await cmd(`/tp ${NAME} ${W.fall.x + 0.5} 100 ${W.fall.z + 0.5} 0 0`);
    await sleep(4500);
    bot.physicsEnabled = false;
    const after = await readHealth();
    await cmd(`/setblock ${W.fall.x} 100 ${W.fall.z} minecraft:air 0`);
    mark(`w6cactus ${label.padEnd(12)} hp ${before} -> ${after} dmg=${before !== null && after !== null ? before - after : null}`);
    return { label, before, after };
  };
  const bare = await run('bare', []);
  const ada = await run('adamantium10', [
    { slot: 'slot.armor.head', item: 'etim:helmet_adamantium' },
    { slot: 'slot.armor.chest', item: 'etim:chestplate_adamantium' },
    { slot: 'slot.armor.legs', item: 'etim:leggings_adamantium' },
    { slot: 'slot.armor.feet', item: 'etim:boots_adamantium' },
  ]);
  const cop = await run('copper7', [
    { slot: 'slot.armor.head', item: 'etim:helmet_copper' },
    { slot: 'slot.armor.chest', item: 'etim:chestplate_copper' },
    { slot: 'slot.armor.legs', item: 'etim:leggings_copper' },
    { slot: 'slot.armor.feet', item: 'etim:boots_copper' },
  ]);
  results.push({ v: 'W6cactus', bare, copper: cop, adamantium: ada });
  await cmd(`/clear ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6cactus-end');
}

async function w6attr() {
  await say('w6attr-begin');
  let armorAttr = null;
  const keys = new Set();
  bot._client.on('entity_properties', (p) => {
    if (!bot.entity || p.entityId !== bot.entity.id) return;
    for (const prop of p.properties || []) {
      keys.add(prop.key);
      if (prop.key === 'generic.armor') armorAttr = prop.value;
    }
  });
  const readArmor = async (label) => {
    await sleep(1500);
    mark(`w6attr ${label.padEnd(14)} generic.armor=${armorAttr} keys=${[...keys].slice(0, 6).join(',')}`);
    return armorAttr;
  };
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd(`/clear ${NAME}`);
  await sleep(1200);
  const bare = await readArmor('bare');
  const sets = {
    copper: ['etim:helmet_copper', 'etim:chestplate_copper', 'etim:leggings_copper', 'etim:boots_copper'],
    copperChain: ['etim:chain_helmet_copper', 'etim:chain_chestplate_copper', 'etim:chain_leggings_copper', 'etim:chain_boots_copper'],
    mithril: ['etim:helmet_mithril', 'etim:chestplate_mithril', 'etim:leggings_mithril', 'etim:boots_mithril'],
    adamantium: ['etim:helmet_adamantium', 'etim:chestplate_adamantium', 'etim:leggings_adamantium', 'etim:boots_adamantium'],
    adamantiumChain: ['etim:chain_helmet_adamantium', 'etim:chain_chestplate_adamantium', 'etim:chain_leggings_adamantium', 'etim:chain_boots_adamantium'],
    diamond: ['minecraft:diamond_helmet', 'minecraft:diamond_chestplate', 'minecraft:diamond_leggings', 'minecraft:diamond_boots'],
  };
  const slots = ['slot.armor.head', 'slot.armor.chest', 'slot.armor.legs', 'slot.armor.feet'];
  const out = { bare };
  for (const [k, items] of Object.entries(sets)) {
    await cmd(`/clear ${NAME}`);
    await sleep(300);
    for (let i = 0; i < 4; i++) await cmd(`/replaceitem entity ${NAME} ${slots[i]} ${items[i]} 1 0`);
    out[k] = await readArmor(k);
  }
  results.push({ v: 'W6attr', ...out });
  await cmd(`/clear ${NAME}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6attr-end');
}

async function w6cactus2() {
  await say('w6cactus2-begin');
  const X = W.fall.x;
  const Z = W.fall.z;
  // 4 cactus walls around a 1x1 pocket: continuous contact damage (blockable source)
  await cmd(`/fill ${X - 2} 99 ${Z - 2} ${X + 2} 102 ${Z + 2} minecraft:air`);
  await cmd(`/fill ${X - 2} 99 ${Z - 2} ${X + 2} 99 ${Z + 2} minecraft:stone`);
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    await cmd(`/setblock ${X + dx} 100 ${Z + dz} minecraft:cactus 0`);
  }
  const run = async (label, armor) => {
    await cmd(`/gamemode 1 ${NAME}`);
    await cmd(`/clear ${NAME}`);
    await cmd(`/effect ${NAME} clear`);
    await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
    await sleep(700);
    for (const a of armor) await cmd(`/replaceitem entity ${NAME} ${a.slot} ${a.item} 1 0`);
    await cmd(`/gamemode 0 ${NAME}`);
    await sleep(400);
    bot.physicsEnabled = true;
    await cmd(`/tp ${NAME} ${X + 0.5} 100 ${Z + 0.5} 0 0`);
    await sleep(500);
    const before = await readHealth();
    await sleep(4000);
    const after = await readHealth();
    bot.physicsEnabled = false;
    mark(`w6cactus2 ${label.padEnd(12)} hp ${before} -> ${after} dmg=${before !== null && after !== null ? before - after : null}`);
    return { label, before, after };
  };
  const bare = await run('bare', []);
  const ada = await run('adamantium10', [
    { slot: 'slot.armor.head', item: 'etim:helmet_adamantium' },
    { slot: 'slot.armor.chest', item: 'etim:chestplate_adamantium' },
    { slot: 'slot.armor.legs', item: 'etim:leggings_adamantium' },
    { slot: 'slot.armor.feet', item: 'etim:boots_adamantium' },
  ]);
  for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    await cmd(`/setblock ${X + dx} 100 ${Z + dz} minecraft:air 0`);
  }
  results.push({ v: 'W6cactus2', bare, adamantium: ada });
  await cmd(`/clear ${NAME}`);
  await cmd(`/effect ${NAME} minecraft:instant_health 1 9 true`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w6cactus2-end');
}

// ================================================================== B2 re-verdict window (fix batch: W5R reach + W9 decay)
const R = {
  webReach:   { x: -30, y: 100, z: 40, block: 'minecraft:web' },
  stoneSword: { x: -26, y: 100, z: 40, block: 'minecraft:stone' },
  webBreak:   { x: -22, y: 100, z: 40, block: 'minecraft:web' },
  webVanilla: { x: -18, y: 100, z: 40, block: 'minecraft:web' },
  arena:      { x: -20, y: 100, z: 34 },
};

/** Held (hotbar slot 0 = window slot 36) item view; the 1.12 slot packet carries
 *  the damage value in the metadata field and the Damage NBT tag. */
function heldInfo() {
  const it = bot.inventory && bot.inventory.slots ? bot.inventory.slots[36] : null;
  if (!it) return null;
  let nbtDamage = null;
  try {
    const v = it.nbt && it.nbt.value && it.nbt.value.Damage;
    if (v) nbtDamage = Number(v.value !== undefined ? v.value : v);
  } catch (e) { /* ignore */ }
  return {
    name: it.name, count: it.count, metadata: it.metadata,
    nbtDamage, durabilityUsed: it.durabilityUsed, max: it.maxDurability,
  };
}

function decayRows(face, item, block) {
  return readLog().split(/\r?\n/).filter((l) => {
    if (!l.includes('[MiningLog] tool decay')) return false;
    if (!l.includes('face=' + face)) return false;
    if (!l.includes('item=' + item + ' ')) return false;
    if (block && !l.includes('block=' + block + ' ')) return false;
    return true;
  });
}

function speedRows(item, block) {
  return readLog().split(/\r?\n/).filter((l) =>
    l.includes('[MiningLog] mine speed ') && l.includes('item=' + item + ' ') && l.includes('block=' + block + ' '));
}

function denyRowsFor(item, block) {
  return readLog().split(/\r?\n/).filter((l) =>
    l.includes('[MiningLog] mine deny ') && l.includes('item=' + item + ' ') && l.includes('block=' + block + ' '));
}

/** Stand on the rig floor, survival, pools refilled, onGround asserted to the server. */
async function prepDigger(tool, p, standOff = 2.0, pitch = 0) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  if (tool) await giveItem(tool, 1);
  selectSlot(0);
  await cmd(`/effect ${NAME} clear`);
  await cmd(`/etest food 20 20 ${NAME}`);
  await cmd(`/tp ${NAME} ${p.x + 0.5} 100 ${(p.z + standOff + 0.5).toFixed(3)} 180 ${pitch}`);
  await sleep(800);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(500);
  bot._client.write('position', {
    x: p.x + 0.5, y: 100, z: p.z + standOff + 0.5, onGround: true,
  });
  await sleep(300);
}

/** START, let the server hold window elapse, STOP, then poll until the block is air. */
async function digToBreak(p, holdMs = 400, timeoutMs = 32000) {
  startDig(p.x, p.y, p.z);
  await sleep(holdMs);
  const tStop = Date.now();
  stopDig(p.x, p.y, p.z);
  for (let i = 0; i < Math.ceil(timeoutMs / 150); i++) {
    await sleep(150);
    if (!(await blockIs(p.x, p.y, p.z, p.block))) {
      return { broke: true, elapsed: Date.now() - tStop };
    }
  }
  return { broke: false, elapsed: null };
}

async function r2setup() {
  await say('r2setup-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd('/gamerule doMobSpawning false');
  await cmd('/gamerule keepInventory true');
  await cmd('/kill @e[type=!Player]');
  await cmd('/time set 6000');
  await cmd('/weather clear');
  await cmd(`/tp ${NAME} -34.5 101 24.5 0 0`);
  await sleep(1500);
  mark(`r2 floor: ${(await cmd('/fill -52 99 4 -16 99 44 minecraft:stone')).trim()}`);
  mark(`r2 clear: ${(await cmd('/fill -52 100 4 -16 103 44 minecraft:air')).trim()}`);
  for (const k of ['pick', 'hand', 'dagger', 'web', 'hoe']) {
    const p = W.reach[k];
    mark(`r2 reach ${k.padEnd(7)} -> ${(await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`)).trim()}`);
  }
  for (const k of Object.keys(R)) {
    const p = R[k];
    if (!p.block) continue;
    mark(`r2 rig ${k.padEnd(11)} -> ${(await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`)).trim()}`);
  }
  await cmd(`/tp ${NAME} -34.5 101 24.5 0 0`);
  await say('r2setup-end');
}

async function w5r() {
  await say('w5r-begin');
  const clicks = [
    { key: 'W5R-1-dagger-web-3.34-allow', p: R.webReach,   off: 3.300, tool: 'etim:dagger_copper',  expect: 'ALLOW', reach: '3.25' },
    { key: 'W5R-2-dagger-web-3.60-deny',  p: R.webReach,   off: 3.600, tool: 'etim:dagger_copper',  expect: 'DENY',  reach: '3.25' },
    { key: 'W5R-3-dagger-stone-3.60',     p: W.reach.dagger, off: 3.600, tool: 'etim:dagger_copper', expect: 'DENY',  reach: '2.75' },
    { key: 'W5R-4-sword-web-3.90-deny',   p: R.webReach,   off: 3.900, tool: 'etim:sword_copper',   expect: 'DENY',  reach: '3.50' },
    { key: 'W5R-5-sword-web-3.40-allow',  p: R.webReach,   off: 3.350, tool: 'etim:sword_copper',   expect: 'ALLOW', reach: '3.50' },
    { key: 'W5R-6-vanilla-iron-web-3.34', p: R.webReach,   off: 3.300, tool: 'minecraft:iron_sword', expect: 'DENY', reach: '2.75' },
  ];
  const reachOf = (rows) => {
    const m = rows.length ? / > ([\d.]+)$/.exec(rows[rows.length - 1]) : null;
    return m ? m[1] : null;
  };
  for (const c of clicks) {
    await cmd(`/setblock ${c.p.x} ${c.p.y} ${c.p.z} ${c.p.block} 0`);
    await sleep(250);
    const r = await clickProbe(c.p, c.off, c.tool);
    const reach = reachOf(r.denied);
    const ok = c.expect === 'ALLOW' ? r.denied.length === 0 : (r.denied.length > 0 && reach === c.reach);
    results.push({
      v: 'W5R', key: c.key, mode: 'click', off: c.off, tool: c.tool, expect: c.expect,
      wantReach: c.reach, pos: r.pos, denied: r.denied, reach, ok,
    });
    mark(`w5r ${c.key.padEnd(32)} off=${c.off} tool=${String(c.tool).padEnd(20)} expect=${c.expect}/${c.reach} denied=${JSON.stringify(r.denied.slice(0, 1))} reach=${reach} ${ok ? 'OK' : 'MISMATCH'}`);
  }
  // informational side face: ETIM sword/dagger vs a non-sword-material block still logs a grade-deny row
  const sideRows = denyRowsFor('etim:dagger_copper', 'stone');
  mark(`w5r side: dagger x stone deny rows = ${JSON.stringify(sideRows.slice(0, 1))}`);
  results.push({ v: 'W5R', key: 'side-deny-rows', mode: 'info', rows: sideRows });
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w5r-end');
}

async function w9() {
  await say('w9-begin');
  const out = {};

  // W9-1: copper sword breaks web -> decay 20 + speed 3.5 + durability -20
  {
    const p = R.webBreak;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(250);
    await prepDigger('etim:sword_copper', p, 2.0);
    const d0 = heldInfo();
    const r = await digToBreak(p, 400, 12000);
    await sleep(1200);
    const d1 = heldInfo();
    const dRows = decayRows('breaking', 'etim:sword_copper', 'web').map(firstLine);
    const sRows = speedRows('etim:sword_copper', 'web').map(firstLine);
    const loss = d0 && d1 && d0.metadata !== null && d1.metadata !== null ? d1.metadata - d0.metadata : null;
    const ok = r.broke
      && dRows.some((l) => l.includes('loss=20'))
      && sRows.some((l) => l.includes('str=3.5'))
      && loss === 20;
    out.w9_1 = { broke: r.broke, elapsed: r.elapsed, d0, d1, loss, decayRows: dRows, speedRows: sRows, ok };
    mark(`w9-1 sword_copper x web: broke=${r.broke} elapsed=${r.elapsed}ms decay=${JSON.stringify(dRows.slice(0, 1))} speed=${JSON.stringify(sRows.slice(0, 1))} dura ${d0 && d0.metadata}->${d1 && d1.metadata} loss=${loss} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // W9-2: copper sword vs stone -> block intact, no speed row, no decay row, no durability change
  {
    const p = R.stoneSword;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(250);
    await prepDigger('etim:sword_copper', p, 2.0);
    const d0 = heldInfo();
    const r = await digToBreak(p, 6000, 3000);
    await sleep(800);
    const d1 = heldInfo();
    const dRows = decayRows('breaking', 'etim:sword_copper', 'stone').map(firstLine);
    const sRows = speedRows('etim:sword_copper', 'stone').map(firstLine);
    const loss = d0 && d1 && d0.metadata !== null && d1.metadata !== null ? d1.metadata - d0.metadata : null;
    const ok = !r.broke && sRows.length === 0 && dRows.length === 0 && loss === 0;
    out.w9_2 = { broke: r.broke, d0, d1, loss, decayRows: dRows, speedRows: sRows, ok };
    mark(`w9-2 sword_copper x stone: broke=${r.broke} speed=${sRows.length} decay=${dRows.length} dura ${d0 && d0.metadata}->${d1 && d1.metadata} loss=${loss} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  // W9-3: one attack -> attacking decay 50 + durability -50
  {
    const p = R.arena;
    await cmd(`/gamemode 1 ${NAME}`);
    await cmd('/kill @e[type=!Player]');
    await cmd(`/setblock ${p.x} 100 ${p.z} minecraft:stone 0`);
    await prepDigger('etim:sword_copper', p, 2.0, 25);
    // a plain mob (sheep: 8 HP > 7 damage; persistenceRequired pins the despawn
    // counter to 0). An armor stand is unusable here 鈥?EntityArmorStand.attackEntityFrom
    // returns false for a survival player punch (1.12 :545-588), so ItemSword.hitEntity
    // never runs. Pitch 25: the sheep box tops out at 101.3, below the 101.62 eye.
    await cmd(`/summon sheep ${p.x + 0.5} 100 ${p.z + 1.0} {NoAI:1b,Silent:1b,PersistenceRequired:1b}`);
    await sleep(700);
    const d0 = heldInfo();
    mark(`w9-3 attack cmd -> ${(await cmd(`/etest attack @e[type=sheep,r=4,c=1] ${NAME}`)).trim()}`);
    await sleep(1500);
    const d1 = heldInfo();
    const aRows = decayRows('attacking', 'etim:sword_copper', null).map(firstLine);
    const loss = d0 && d1 && d0.metadata !== null && d1.metadata !== null ? d1.metadata - d0.metadata : null;
    const ok = aRows.some((l) => l.includes('loss=50')) && loss === 50;
    out.w9_3 = { d0, d1, loss, decayRows: aRows, ok };
    mark(`w9-3 sword_copper attack: decay=${JSON.stringify(aRows.slice(0, 1))} dura ${d0 && d0.metadata}->${d1 && d1.metadata} loss=${loss} ${ok ? 'OK' : 'MISMATCH'}`);
    await cmd('/kill @e[type=sheep]');
  }

  // W9-4: vanilla iron sword breaks web -> decay row loss=0 (mixin applies to all ItemSword), no durability change
  {
    const p = R.webVanilla;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(250);
    await prepDigger('minecraft:iron_sword', p, 2.0);
    const d0 = heldInfo();
    const r = await digToBreak(p, 400, 40000);
    await sleep(1200);
    const d1 = heldInfo();
    const dRows = decayRows('breaking', 'minecraft:iron_sword', 'web').map(firstLine);
    const loss = d0 && d1 && d0.metadata !== null && d1.metadata !== null ? d1.metadata - d0.metadata : null;
    const ok = r.broke && dRows.some((l) => l.includes('loss=0')) && loss === 0;
    out.w9_4 = { broke: r.broke, elapsed: r.elapsed, d0, d1, loss, decayRows: dRows, ok };
    mark(`w9-4 iron_sword x web: broke=${r.broke} elapsed=${r.elapsed}ms decay=${JSON.stringify(dRows.slice(0, 1))} dura ${d0 && d0.metadata}->${d1 && d1.metadata} loss=${loss} ${ok ? 'OK' : 'MISMATCH'}`);
  }

  results.push({ v: 'W9', ...out });
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w9-end');
}

/** Timing probe: START then an immediate STOP, elapsed measured from START
 *  (informational corroboration for the W9-1 "~0.7 s" figure). */
async function w9t() {
  await say('w9t-begin');
  for (const off of [2.0]) {
    const p = R.webBreak;
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block} 0`);
    await sleep(250);
    await prepDigger('etim:sword_copper', p, off);
    const t0 = Date.now();
    startDig(p.x, p.y, p.z);
    await sleep(60);
    stopDig(p.x, p.y, p.z);
    let broke = false;
    for (let i = 0; i < 60; i++) {
      await sleep(120);
      if (!(await blockIs(p.x, p.y, p.z, p.block))) { broke = true; break; }
    }
    mark(`w9t copper_sword x web off=${off} broke=${broke} startToAir=${Date.now() - t0}ms`);
  }
  await cmd(`/gamemode 1 ${NAME}`);
  await say('w9t-end');
}

// ------------------------------------------------------------------ main
(async () => {
  const phase = process.argv[2] || 'probe';
  rcon = new Rcon();
  await rcon.connect();
  await rcon.auth();

  bot = await createHarnBot({ username: NAME });
  bot.physicsEnabled = false;
  bot._client.on('window_items', (p) => { lastWindow = p; });
  bot._client.on('craft_progress_bar', (p) => { lastProps[p.property] = p.value; });
  for (let i = 0; i < 40 && !bot.entity; i++) await sleep(100);
  await sleep(800);
  // flying kick guard: the bot joins in survival on the world spawn; any TP to mid-air
  // before creative is set trips multiplayer.disconnect.flying (allow-flight=false).
  await cmd(`/gamemode 1 ${NAME}`);
  await sleep(400);

  const phases = { setup, probe, v2, v3, v4, v6, v9, v10, v5a, v5b, v7, diagMithril, giveTest, v7probe, v7bands, rv1a, rv1b, rv2, rv4explore, rv4census, rv4ore, rv4ore2, rv4closed, rvCount, w0setup, w2mining, w3speed, w4burn, w5reach, w6armor, w7craft, w5diag, w5dig, w6diag, w6diag2, w6zombie, w6res, wfood, w6cactus, w6attr, w6cactus2, r2setup, w5r, w9, w9t };
  if (!phases[phase]) { console.error(`unknown phase ${phase}`); process.exit(2); }
  try {
    await phases[phase]();
  } catch (e) {
    mark(`FATAL ${phase}: ${e && e.stack ? e.stack : e}`);
  }
  const outFile = path.join(OUT_DIR, `b1-${phase}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ phase, when: new Date().toISOString(), results }, null, 2), 'utf8');
  mark(`results -> ${outFile} (${results.length} rows)`);
  bot.quit();
  rcon.close();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
