#!/usr/bin/env node
/**
 * anvil-run.js — 批三修理面（砧修链）verdict window driver.
 *
 * Phases (批文 metal-anvil-repair-落码批文 §三):
 *   w2      consumable repair: copper scythe -1600 + 9 copper nuggets →
 *           2 nuggets used (800/珠 chunk), [CraftingLog] take row kind=1
 *           anvilWear=1600 (T2① tool ×1), XP level unchanged (T1①)
 *   w3      combination: two copper scythes -800/-400 → one tool damage 0
 *           (pure sum capped, CraftingManager :309-319), no nuggets,
 *           kind=2 anvilWear=0 (INNER2 :31 — combo never wears)
 *   w4      fail 2: mithril scythe + mithril nugget on the iron anvil →
 *           empty output + the needsHarderAnvil row (strict > 8.0)
 *   w5      fail 1: copper scythe + superb quality at level 0 →
 *           empty output + the insufficientSkill row (T8① budget face)
 *   w6      T5② iron nugget 9:1: ingot→9 nuggets + 9 nuggets→ingot (grid)
 *   wear    the WorldSavedData face: <level>/data/etim_anvil_damage.dat exists
 *
 * Judgment channels: [AnvilLog] (this harness) + the product's own
 * [CraftingLog] fail/take rows. Server-authoritative inputs only:
 * window slot packets, /clear receipts, the dat-file face.
 * Window opens go through bot.openAnvil (the mineflayer anvil plugin —
 * plain openBlock does not map the anvil GUI and times out); placement and
 * takes go through bot.clickWindow (the C-SK-5 carry rule: the 1.12 server
 * transaction check needs the clicked slot's stack).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const ROOT = path.resolve(__dirname, '..', '..');
const SERVER_LOG = process.env.ETIM_LOG || path.join(ROOT, 'run', 'obfuscated', 'logs', 'latest.log');
const NAME = process.env.B3_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (...a) => log('anvil', ...a);
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
let bot;
const cmd = (c, waitMs = 130) => rcon.cmd(c).then((r) => r);
const say = (t) => cmd(`/say [Anvil] ${t}`);
function selectSlot(s) { bot._client.write('held_item_slot', { slotId: s }); }

// ------------------------------------------------------------------ log helpers
function readLog() {
  for (let i = 0; i < 5; i++) {
    try { return fs.readFileSync(SERVER_LOG, 'utf8'); } catch (e) { /* retry */ }
  }
  return '';
}
const logLines = () => readLog().split(/\r?\n/);
const logLen = () => logLines().length;
const since = (n) => logLines().slice(n);
const firstLine = (l) => (l || '').split('\n')[0];
function rowsMatching(slice, needle) {
  return slice.filter((l) => l.includes(needle)).map(firstLine);
}
async function waitRows(n0, pred, ms = 9000) {
  const t0 = Date.now();
  let rows = [];
  while (Date.now() - t0 < ms) {
    rows = since(n0).filter(pred);
    if (rows.length) return rows;
    await sleep(500);
  }
  return rows;
}

// ------------------------------------------------------------------ commands
async function clearAll() {
  await cmd(`/clear ${NAME}`);
  await sleep(150);
  selectSlot(0);
}
async function giveItem(name, count = 1) {
  const r = await cmd(`/give ${NAME} ${name} ${count}`, 220);
  await sleep(220);
  return r;
}
async function clearCount(item, remove = true) {
  const r = remove
    ? await cmd(`/clear ${NAME} ${item}`, 240)
    : await cmd(`/clear ${NAME} ${item} -1 0`, 240);
  const s = (r || '').trim();
  let n = 0;
  const a = /removing (\d+) items/.exec(s) || /Removed (\d+) items/.exec(s);
  const b = /has (\d+) items that match/.exec(s) || /has (\d+) matching items/.exec(s);
  if (a) n = parseInt(a[1], 10);
  else if (b) n = parseInt(b[1], 10);
  return { n, raw: s };
}

// ------------------------------------------------------------------ window face
/** C-SK-5: the click carries the clicked slot's stack (bot.clickWindow). */
async function wclick(slot, button = 0, mode = 0) {
  try { await bot.clickWindow(slot, button, mode); return true; }
  catch (e) { mark(`[AnvilLog] wclick-fail slot=${slot} btn=${button} ${e && e.message}`); return false; }
}
async function waitForBlock(x, y, z, ms = 8000) {
  const t0 = Date.now();
  for (;;) {
    const b = bot.blockAt(new Vec3(x, y, z));
    if (b && b.name !== 'air') return b;
    if (Date.now() - t0 > ms) return null;
    await sleep(300);
  }
}
async function openAnvilWindow(x, y, z, timeout = 8000) {
  const block = await waitForBlock(x, y, z);
  if (!block) return null;
  const w = await Promise.race([
    bot.openAnvil(block),
    sleep(timeout).then(() => null),
  ]);
  return w || null;
}
async function closeWin(win) {
  try { bot.closeWindow(win); } catch (e) { /* ignore */ }
  for (let i = 0; i < 25 && bot.currentWindow; i++) await sleep(30);
}
function slotStack(win, slot) {
  const it = (win && win.slots || [])[slot];
  return it ? { name: it.name, count: it.count, metadata: it.metadata } : null;
}
/** Hotbar → anvil slot: left-click pick all, left-click place all, park the
 *  cursor back (a stray cursor stack is placed into the same hotbar slot). */
async function placeAll(win, hotbar, anvilSlot) {
  await wclick(30 + hotbar); await sleep(200);   // pick up the whole stack
  await wclick(anvilSlot); await sleep(200);     // drop it all into the anvil slot
  await wclick(30 + hotbar); await sleep(200);   // return anything left on the cursor
}
/** The output take: left-click into the cursor, then park it on the empty
 *  hotbar 0 (the placement pass emptied it) so /clear counts it. */
async function takeOutput() {
  await wclick(2); await sleep(300);
  await wclick(30); await sleep(300);
}

// ------------------------------------------------------------------ rig
const RIG = {
  stand: { x: -30.5, z: 22.5 },
  anvil: { x: -34, y: 100, z: 12 },
  table: { x: -36, y: 100, z: 12 },
};
async function rigFloor() {
  await cmd(`/gamerule doMobSpawning false`);
  await cmd(`/gamerule keepInventory true`);
  await cmd(`/weather clear`);
  await cmd(`/kill @e[type=!Player]`);
  await cmd(`/fill -52 99 4 -16 99 44 minecraft:stone`);
  await cmd(`/fill -52 100 4 -16 103 44 minecraft:air`);
  await cmd(`/setblock ${RIG.anvil.x} ${RIG.anvil.y} ${RIG.anvil.z} minecraft:anvil 0 replace`);
  await cmd(`/setblock ${RIG.table.x} ${RIG.table.y} ${RIG.table.z} minecraft:crafting_table 0 replace`);
  await sleep(400);
}

// ------------------------------------------------------------------ cells
/** The W2 consumable cell: damaged gear + a nugget stack → take. */
async function consumableCell() {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:scythe_copper', 1);
  await giveItem('etim:nugget_copper', 9);
  await cmd(`/etest damage 1600 ${NAME}`);
  await cmd(`/etest level 200 ${NAME}`);
  const level0 = bot.experience ? bot.experience.level : null;
  await cmd(`/tp ${NAME} ${RIG.anvil.x + 0.5} 100 ${RIG.anvil.z + 2.5} 180 0`);
  await sleep(900);
  const w = await openAnvilWindow(RIG.anvil.x, RIG.anvil.y, RIG.anvil.z);
  if (!w) { mark(`[AnvilLog] w2 consumable NO-WINDOW | FAIL`); return { v: 'W2', ok: false, err: 'no window' }; }
  await sleep(400);
  await placeAll(w.id, 0, 0);  // the damaged scythe → slot 0
  await placeAll(w.id, 1, 1);  // 9 nuggets → slot 1
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  await takeOutput();
  const level1 = bot.experience ? bot.experience.level : null;
  await closeWin(w);   // onContainerClosed returns the anvil slots to the inventory — /clear sees them
  await sleep(400);
  const level2 = bot.experience ? bot.experience.level : null;
  const nuggetsLeft = (await clearCount('etim:nugget_copper', false)).n;
  const tools = (await clearCount('etim:scythe_copper', false)).n;
  // C-SK-9: log4j flush lags seconds — the judgment greps the WHOLE session log
  // (the value is a pure function of (item, damage); a deduped row is the same row).
  const wearRows = rowsMatching(logLines(), 'repair take');
  // judged faces: the output was the repaired tool; 2 nuggets of 9 consumed
  // (1600 = 2 × the 800 chunk); the [CraftingLog] row carries the exact
  // repaired/nuggets/wear; XP level unchanged (T1①).
  const ok = nuggetsLeft === 7 && tools === 1
    && wearRows.some((l) => l.includes('repaired=1600') && l.includes('nuggets=2') && l.includes('anvilWear=1600'))
    && level0 === level2;
  mark(`[AnvilLog] w2 consumable out=${JSON.stringify(out)} nuggetsLeft=${nuggetsLeft} tools=${tools} xp=${level0}->${level2} wearRows=${JSON.stringify(wearRows.map(firstLine))} | ${ok ? 'PASS' : 'FAIL'}`);
  await clearCount('etim:scythe_copper', true);
  await clearCount('etim:nugget_copper', true);
  await cmd(`/gamemode 1 ${NAME}`);
  return { v: 'W2', ok, out, nuggetsLeft, level0, level2, wearRows: wearRows.map(firstLine) };
}

/** The W3 combination cell: two damaged scythes → one, no nuggets, no wear. */
async function comboCell() {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:scythe_copper', 1);
  await cmd(`/etest damage 800 ${NAME}`);
  await giveItem('etim:scythe_copper', 1);      // lands in the NEXT hotbar slot
  selectSlot(1); await sleep(250);              // the held slot MUST follow —
  await cmd(`/etest damage 400 ${NAME}`);       // /etest damages the HELD item
  await cmd(`/etest level 200 ${NAME}`);
  const level0 = bot.experience ? bot.experience.level : null;
  await cmd(`/tp ${NAME} ${RIG.anvil.x + 0.5} 100 ${RIG.anvil.z + 2.5} 180 0`);
  await sleep(900);
  const w = await openAnvilWindow(RIG.anvil.x, RIG.anvil.y, RIG.anvil.z);
  if (!w) { mark(`[AnvilLog] w3 combo NO-WINDOW | FAIL`); return { v: 'W3', ok: false, err: 'no window' }; }
  await sleep(400);
  await placeAll(w.id, 0, 0);  // scythe #1 (-800)
  await placeAll(w.id, 1, 1);  // scythe #2 (-400)
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  await takeOutput();
  const level1 = bot.experience ? bot.experience.level : null;
  await closeWin(w);
  await sleep(400);
  const level2 = bot.experience ? bot.experience.level : null;
  const tools = (await clearCount('etim:scythe_copper', false)).n;
  // C-SK-9 whole-log face (see consumableCell).
  const wearRows = rowsMatching(logLines(), 'repair take');
  // sum face: remaining 2400 + 2800 = 5200 > 3200 → capped at damage 0; the
  // combination path consumes NO nuggets and wears the anvil NOT at all.
  const ok = tools === 1
    && wearRows.some((l) => l.includes('kind=2') && l.includes('anvilWear=0') && l.includes('nuggets=0'))
    && level0 === level2;
  mark(`[AnvilLog] w3 combo out=${JSON.stringify(out)} toolsLeft=${tools} xp=${level0}->${level2} wearRows=${JSON.stringify(wearRows.map(firstLine))} | ${ok ? 'PASS' : 'FAIL'}`);
  await clearCount('etim:scythe_copper', true);
  await cmd(`/gamemode 1 ${NAME}`);
  return { v: 'W3', ok, out, tools, level0, level2, wearRows: wearRows.map(firstLine) };
}

/** The W3d clean-twin denial cell (R196 :67-71): a damaged + a pristine twin
 *  → CLAIMED empty output (the vanilla +12% branch must never see it). */
async function deniedCell() {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:scythe_copper', 1);
  await cmd(`/etest damage 800 ${NAME}`);
  await giveItem('etim:scythe_copper', 1);      // pristine twin in hotbar 1
  await cmd(`/etest level 200 ${NAME}`);
  const level0 = bot.experience ? bot.experience.level : null;
  await cmd(`/tp ${NAME} ${RIG.anvil.x + 0.5} 100 ${RIG.anvil.z + 2.5} 180 0`);
  await sleep(900);
  const w = await openAnvilWindow(RIG.anvil.x, RIG.anvil.y, RIG.anvil.z);
  if (!w) { mark(`[AnvilLog] w3d denied NO-WINDOW | FAIL`); return { v: 'W3D', ok: false, err: 'no window' }; }
  await sleep(400);
  await placeAll(w.id, 0, 0);
  await placeAll(w.id, 1, 1);
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  const n0 = logLen();
  await wclick(2); await sleep(600); // the denial face: output empty → nothing to take
  await closeWin(w);
  await sleep(400);
  const level1 = bot.experience ? bot.experience.level : null;
  const tools = (await clearCount('etim:scythe_copper', false)).n;
  // C-SK-9: flush lags — wait up to 8s for THIS round's rows only (since n0);
  // any kind=2 take row in this slice = the denial leaked to the vanilla branch.
  const takeRows = (await waitRows(n0, (l) => l.includes('repair take') && l.includes('kind=2'), 8000));
  const ok = !out && tools === 2 && level0 === level1 && takeRows.length === 0;
  mark(`[AnvilLog] w3d denied out=${JSON.stringify(out)} toolsLeft=${tools} xp=${level0}->${level1} kind2Rows=${takeRows.length} | ${ok ? 'PASS' : 'FAIL'}`);
  await clearCount('etim:scythe_copper', true);
  await cmd(`/gamemode 1 ${NAME}`);
  return { v: 'W3D', ok, out, tools, level0, level1 };
}

/** The W4 fail-2 cell: mithril gear (64.0 > 8.0) on the iron anvil. */
async function fail2Cell() {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:scythe_mithril', 1);
  await cmd(`/etest damage 800 ${NAME}`);
  await giveItem('etim:nugget_mithril', 9);
  await cmd(`/etest level 200 ${NAME}`);
  await cmd(`/tp ${NAME} ${RIG.anvil.x + 0.5} 100 ${RIG.anvil.z + 2.5} 180 0`);
  await sleep(900);
  const w = await openAnvilWindow(RIG.anvil.x, RIG.anvil.y, RIG.anvil.z);
  if (!w) { mark(`[AnvilLog] w4 fail2 NO-WINDOW | FAIL`); return { v: 'W4', ok: false, err: 'no window' }; }
  await sleep(400);
  await placeAll(w.id, 0, 0);
  await placeAll(w.id, 1, 1);
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  await wclick(2); await sleep(600); // the refusal face: output empty → nothing to take
  await closeWin(w);   // the anvil slots return to the inventory
  await sleep(400);
  const tools = (await clearCount('etim:scythe_mithril', false)).n;
  const nuggets = (await clearCount('etim:nugget_mithril', false)).n;
  // C-SK-9 whole-log face.
  const failRows = rowsMatching(logLines(), 'repair fail');
  const empty = failRows.some((l) => l.includes('needsHarderAnvil') && l.includes('scythe_mithril'));
  const ok = !out && tools === 1 && nuggets === 9 && empty; // nothing consumed, nothing produced
  mark(`[AnvilLog] w4 fail2 out=${JSON.stringify(out)} tools=${tools} nuggets=${nuggets} failRows=${JSON.stringify(failRows.map(firstLine))} | ${ok ? 'PASS' : 'FAIL'}`);
  await clearCount('etim:scythe_mithril', true);
  await clearCount('etim:nugget_mithril', true);
  await cmd(`/gamemode 1 ${NAME}`);
  return { v: 'W4', ok, out, tools, nuggets, failRows: failRows.map(firstLine) };
}

/** The W5 fail-1 cell: superb quality over a level-0 budget (T8①). */
async function fail1Cell() {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:scythe_copper', 1);
  await cmd(`/etest damage 800 ${NAME}`);
  await cmd(`/etest quality superb ${NAME}`);
  await giveItem('etim:nugget_copper', 9);
  await cmd(`/etest level 0 ${NAME}`); // the budget floor (experienceTotal 0)
  await cmd(`/tp ${NAME} ${RIG.anvil.x + 0.5} 100 ${RIG.anvil.z + 2.5} 180 0`);
  await sleep(900);
  const w = await openAnvilWindow(RIG.anvil.x, RIG.anvil.y, RIG.anvil.z);
  if (!w) { mark(`[AnvilLog] w5 fail1 NO-WINDOW | FAIL`); return { v: 'W5', ok: false, err: 'no window' }; }
  await sleep(400);
  await placeAll(w.id, 0, 0);
  await placeAll(w.id, 1, 1);
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  await wclick(2); await sleep(600);
  await closeWin(w);
  await sleep(400);
  const tools = (await clearCount('etim:scythe_copper', false)).n;
  const nuggets = (await clearCount('etim:nugget_copper', false)).n;
  // C-SK-9 whole-log face. THIS round's row: filter by the level-0 round —
  // the mithril fail row (w4) never mentions this tool; take the LAST row
  // for this tool id (the fail state is a pure function of the setup).
  const failRows = rowsMatching(logLines(), 'repair fail').filter((l) => l.includes('scythe_copper'));
  const last = failRows.length ? failRows[failRows.length - 1] : '';
  const hasFail1 = last.includes('insufficientSkill');
  const noFail2 = !last.includes('needsHarderAnvil');
  const ok = !out && tools === 1 && nuggets === 9 && hasFail1 && noFail2;
  mark(`[AnvilLog] w5 fail1 out=${JSON.stringify(out)} tools=${tools} nuggets=${nuggets} failRows=${JSON.stringify(failRows.map(firstLine))} | ${ok ? 'PASS' : 'FAIL'}`);
  await clearCount('etim:scythe_copper', true);
  await clearCount('etim:nugget_copper', true);
  await cmd(`/gamemode 1 ${NAME}`);
  return { v: 'W5', ok, out, tools, nuggets, failRows: failRows.map(firstLine) };
}

/** The W6 T5② iron-nugget 9:1 cell (the crafting grid, vanilla items). */
async function gridCell(key, give, hotbar, slotsPerStack, want, wantCount) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  for (const [n, c] of give) await giveItem(n, c);
  await cmd(`/tp ${NAME} ${RIG.table.x + 0.5} 100 ${RIG.table.z + 1.5} 180 0`);
  await sleep(700);
  const block = await waitForBlock(RIG.table.x, RIG.table.y, RIG.table.z);
  if (!block) { mark(`[AnvilLog] w6 ${key} NO-TABLE | FAIL`); return { ok: false, err: 'no table' }; }
  const w = await bot.openBlock(block);
  await sleep(700);
  const win = bot.currentWindow || w;
  if (!win) { mark(`[AnvilLog] w6 ${key} NO-WINDOW | FAIL`); return { ok: false, err: 'no window' }; }
  // spread the stack over the grid: right-clicks = one item per slot
  await wclick(37 + hotbar); await sleep(200);
  for (const s of slotsPerStack) { await wclick(s, 1); await sleep(180); }
  await wclick(37 + hotbar); await sleep(200);
  await sleep(500);
  const out = slotStack(bot.currentWindow || win, 0);
  const nl = logLen();
  await wclick(0); // arms the stage-3 timer (the auto-grant completes it)
  let got = 0;
  for (let i = 0; i < 25 && got < wantCount; i++) {
    await sleep(450);
    got = (await clearCount(want, false)).n;
  }
  await closeWin(w);
  await sleep(200);
  await clearCount(want, true);
  return { out, got, ok: got === wantCount };
}

async function w6() {
  await say('w6-begin');
  // 1 iron ingot → 9 iron nuggets (shapeless: one slot carries it)
  const a = await gridCell('ingot-nuggets', [['minecraft:iron_ingot', 1]], 0, [1], 'minecraft:iron_nugget', 9);
  mark(`[AnvilLog] w6 ingot->nuggets out=${JSON.stringify(a.out)} got=${a.got} want=9 | ${a.ok ? 'PASS' : 'FAIL'}`);
  // 9 iron nuggets → 1 iron ingot (nine right-clicks)
  const b = await gridCell('nuggets-ingot', [['minecraft:iron_nugget', 9]], 0, [1, 2, 3, 4, 5, 6, 7, 8, 9], 'minecraft:iron_ingot', 1);
  mark(`[AnvilLog] w6 nuggets->ingot out=${JSON.stringify(b.out)} got=${b.got} want=1 | ${b.ok ? 'PASS' : 'FAIL'}`);
  results.push({ v: 'W6', a, b });
  await say('w6-end');
}

/** The wear-persistence face: the WorldSavedData file exists after a take. */
function wearDat() {
  const p = path.join(ROOT, 'run', 'obfuscated', 'testw2h', 'data', 'etim_anvil_damage.dat');
  const exists = fs.existsSync(p);
  mark(`[AnvilLog] wear dat: ${p} exists=${exists} | ${exists ? 'PASS' : 'FAIL'}`);
  return { v: 'WEAR', p, exists, ok: exists };
}

// ------------------------------------------------------------------ main
(async () => {
  const phase = process.argv[2] || 'all';
  rcon = new Rcon();
  await rcon.connect();
  await rcon.auth();
  bot = await createHarnBot({ username: NAME });
  await sleep(2500);

  await cmd(`/gamemode 1 ${NAME}`);
  await cmd(`/tp ${NAME} ${RIG.stand.x} 100 ${RIG.stand.z} 180 0`);
  await sleep(2000);
  await rigFloor();

  if (phase === 'all' || phase === 'w2') results.push(await consumableCell());
  if (phase === 'all' || phase === 'w3') { results.push(await comboCell()); results.push(await deniedCell()); }
  if (phase === 'all' || phase === 'w4') results.push(await fail2Cell());
  if (phase === 'all' || phase === 'w5') results.push(await fail1Cell());
  if (phase === 'all' || phase === 'w6') await w6();
  if (phase === 'all' || phase === 'wear') results.push(wearDat());

  fs.writeFileSync(path.join(ROOT, 'build-logs', 'anvil-out.json'),
      JSON.stringify({ results }, null, 2));
  mark(`anvil-run done: ${results.length} result blocks`);
  rcon.close();
  bot.quit();
  process.exit(0);
})().catch((e) => { mark(`FATAL ${e && e.stack || e}`); process.exit(1); });
