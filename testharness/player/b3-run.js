#!/usr/bin/env node
/**
 * b3-run.js — Stage 4 batch B3 (rusted_iron) verdict window driver.
 *
 * Phases
 *   setup     clear/floor the y=99 B2 rig, place the crafting table + chest pads
 *   w2        zombie carrier sampling (non-villager day<10 / 10-19 / >=20,
 *             villager day<10 / 10-19 / >=20) + armor/weapon damage samples
 *   w3        skeleton carrier sampling (day 10-19 / >=20), bow fallback reads,
 *             and the rusted-arrow drop count (loot-table swap)
 *   w4        chest loot sampling: dungeon 8 rusted rows + ancient rows,
 *             mineshaft 7 rows incl. chain 1-5 w5; chest-damage 3-9/10
 *   w5        quality caps through the crafting picker (5 B2 metals + rusted)
 *   w6        negatives (no rusted ingot / scythe / knife registration)
 *
 * Judgment channels: [MobLog] (mobEquipDebugLog), [TestLog] loot/recipe rows,
 * [CraftingLog] quality rows, /entitydata + /blockdata + /clear receipts.
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
const NAME = process.env.B3_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (...a) => log('b3', ...a);
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
let usePlayer = false;
/** Player-chat command path: 1.12 executes RCON commands on the RCON thread,
 *  which mutates chunk entity lists concurrently with the server tick
 *  (ConcurrentModificationException at Chunk.func_177414_a — b3-rcon-crash.log).
 *  Player chat packets run on the server thread, so every mutating command in
 *  this window goes through the bot. */
async function chatCmd(c, waitMs = 110) {
  const msgs = [];
  const h = (m) => msgs.push(m.toString());
  bot.on('message', h);
  try { bot.chat(c.startsWith('/') ? c : '/' + c); } catch (e) { /* ignore */ }
  await sleep(waitMs);
  bot.removeListener('message', h);
  return msgs.join('\n');
}
const cmd = (c, waitMs) => (usePlayer ? chatCmd(c, waitMs) : rcon.cmd(c));
const say = (t) => cmd(`/say [B3] ${t}`);

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

// ------------------------------------------------------------------ item tables
const MAT_DUR = { rusted_iron: 4, copper: 4, silver: 4, ancient_metal: 16, mithril: 64, adamantium: 256 };
const TOOL_COMP = { pickaxe: 3, shovel: 1, axe: 3, hoe: 2, hatchet: 1, mattock: 4, sword: 2, dagger: 1, battle_axe: 4, war_hammer: 5, shears: 2 };
const ARMOR_COMP = { helmet: 5, chestplate: 8, leggings: 7, boots: 4 };
const VANILLA_MAX = {
  wooden_shovel: 59,
  leather_helmet: 55, leather_chestplate: 80, leather_leggings: 75, leather_boots: 65,
};
function maxDamageOf(id) {
  if (!id) return null;
  if (id.startsWith('minecraft:')) return VANILLA_MAX[id.slice(10)] ?? null;
  if (!id.startsWith('etim:')) return null;
  const s = id.slice(5);
  const chain = s.startsWith('chain_');
  const body = chain ? s.slice(6) : s;
  let mat = null;
  for (const m of Object.keys(MAT_DUR)) if (body.endsWith('_' + m)) { mat = m; break; }
  if (!mat) return null;
  const stem = body.slice(0, body.length - mat.length - 1);
  if (ARMOR_COMP[stem]) return ARMOR_COMP[stem] * MAT_DUR[mat] * (chain ? 1 : 2);
  if (TOOL_COMP[stem]) return Math.round(4 * TOOL_COMP[stem] * MAT_DUR[mat] * 100);
  return null;
}

/**
 * The RUNTIME maxDamage — NOT the [EquipLog] value.
 * ETIMToolDurability.apply() (ETIM.init, AFTER preInit's [EquipLog] dump) walks
 * every registered ItemPickaxe/ItemAxe/ItemSpade/ItemSword and rewrites
 * maxDamage from the ToolMaterial name. The ETIM gear classes use the IRON
 * placeholder material, so the rewrite lands at 4.0 * components * 8.0 * 100:
 *   pickaxe/axe(4 types) 3 comp -> 9600, spade(2 types) 1 -> 3200, sword(2) 2 -> 6400.
 * ItemHoe / ItemShears / ItemArmor are NOT in that list and keep the dump value.
 * A-1 (b3 report): the runtime durability therefore disagrees with the batch
 * judged values — loot/mob damage must be denormalised against THIS table.
 */
const RUNTIME_IRON = { pickaxe: 3, axe: 3, shovel: 1, sword: 2, hatchet: 3, mattock: 1, dagger: 2, battle_axe: 3, war_hammer: 3 };
function runtimeMaxDamageOf(id) {
  if (!id) return null;
  if (!id.startsWith('etim:')) {
    if (id === 'minecraft:wooden_shovel') return 200; // WOOD 0.5 → 4*1*0.5*100
    return VANILLA_MAX[id.slice(10)] ?? null;
  }
  const s = id.slice(5);
  const chain = s.startsWith('chain_');
  const body = chain ? s.slice(6) : s;
  let mat = null;
  for (const m of Object.keys(MAT_DUR)) if (body.endsWith('_' + m)) { mat = m; break; }
  if (!mat) return null;
  const stem = body.slice(0, body.length - mat.length - 1);
  if (RUNTIME_IRON[stem]) return 4 * RUNTIME_IRON[stem] * 8 * 100;
  return maxDamageOf(id); // hoe / shears / armor keep the judged value
}

// ------------------------------------------------------------------ NBT helpers
/** Split a /entitydata or /blockdata payload into item entries (id + local segment). */
function itemSegments(text) {
  const ids = [...text.matchAll(/id:"([^"]+)"/g)];
  return ids.map((m, i) => ({
    id: m[1],
    seg: text.slice(m.index, i + 1 < ids.length ? ids[i + 1].index : text.length),
  }));
}
function segNum(seg, key) {
  const m = new RegExp(key + ':(\\d+)s?b?').exec(seg);
  return m ? parseInt(m[1], 10) : null;
}
function parseHeld(text) {
  const segs = itemSegments(text);
  return segs.map((s) => {
    const max = maxDamageOf(s.id);
    const dmg = segNum(s.seg, 'Damage');
    const ench = s.seg.includes('ench:');
    return {
      id: s.id, damage: dmg, max,
      fraction: max && dmg !== null ? +(dmg / max).toFixed(4) : null,
      enchanted: ench,
    };
  });
}

// ------------------------------------------------------------------ bot helpers
let bot;
let actionNum = 1;
function click(win, slot, button = 0, mode = 0) {
  bot._client.write('window_click', {
    windowId: win, slot, mouseButton: button, action: actionNum++ & 0x7fff, mode, item: { blockId: -1 },
  });
}
async function closeWin(win) {
  try { bot.closeWindow(win); } catch (e) { /* ignore */ }
  for (let i = 0; i < 25 && bot.currentWindow; i++) await sleep(30);
}
function selectSlot(s) { bot._client.write('held_item_slot', { slotId: s }); }

/** Nearest tracked entity of a registry name (client-side view of the server's
 *  entity_equipment packets — 1.12 /entitydata is write-only). */
function nearestEntity(type, x, y, z) {
  let best = null;
  let bd = Infinity;
  for (const e of Object.values(bot.entities || {})) {
    if (!e || e === bot.entity) continue;
    if (e.name !== type) continue;
    const d = e.position.distanceTo(new Vec3(x, y, z));
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
function equipmentView(e) {
  if (!e || !e.equipment) return [];
  return e.equipment.map((it) => (it ? {
    name: it.name, type: it.type, metadata: it.metadata, count: it.count,
    max: it.maxDurability, ench: JSON.stringify(it.nbt || {}).includes('ench'),
  } : null));
}
function zombieIds() {
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === 'zombie').map((e) => e.id);
}
function skeletonIds() {
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === 'skeleton').map((e) => e.id);
}

async function clearAll() {
  await cmd(`/clear ${NAME}`);
  await sleep(120);
  selectSlot(0);
}
async function giveItem(name, count = 1, meta) {
  const r = await cmd(`/give ${NAME} ${name} ${count}` + (meta === undefined ? '' : ` ${meta}`), 200);
  await sleep(200);
  return r;
}

async function openTimed(x, y, z, timeout = 4000) {
  const block = bot.blockAt(new Vec3(x, y, z));
  if (!block || block.name === 'air') return null;
  const p = bot.openBlock(block);
  const w = await Promise.race([p, sleep(timeout).then(() => null)]);
  return w;
}

/** Summon one entity and return the [MobLog] rows it produced. */
async function summonOne(cmdLine) {
  const n0 = logLen();
  const r = await cmd(cmdLine);
  await sleep(60);
  return { response: (r || '').trim(), rows: rowsMatching(since(n0), '[MobLog]') };
}

/** Spread summons over the rig floor: stacking 20+ bodies in one block makes
 *  the vanilla collision pass iterate a chunk list another body mutates. */
function gridPos(i) {
  const col = i % 20;
  const row = Math.floor(i / 20) % 20;
  return { x: -50 + col * 1.7 + 0.5, y: 100, z: 8 + row * 1.7 + 0.5 };
}

/** Bulk summon over the grid (player-chat = server thread, 45 ms spacing). */
async function summonBulk(kind, opts, count) {
  const n0 = logLen();
  let ok = 0;
  for (let i = 0; i < count; i++) {
    const p = gridPos(i);
    const r = await cmd(`/summon ${kind} ${p.x.toFixed(2)} ${p.y} ${p.z.toFixed(2)}`, 70);
    if ((r || '').includes('summon')) ok++;
  }
  await sleep(600);
  const rows = rowsMatching(since(n0), '[MobLog]');
  return { rows, ok, n: count };
}

function tallyWeapon(rows) {
  const weapons = rows.filter((l) => l.includes('[MobLog] mob weapon'));
  const byItem = {};
  for (const l of weapons) {
    const m = /item=(\S+)/.exec(l);
    if (m) byItem[m[1]] = (byItem[m[1]] || 0) + 1;
  }
  return { count: weapons.length, byItem, rows: weapons.slice(0, 40) };
}
function tallyArmor(rows) {
  const armor = rows.filter((l) => l.includes('[MobLog] mob armor'));
  const byTier = {};
  const byTierItem = {};
  for (const l of armor) {
    const m = /slot=(\S+) item=(\S+) tier=(\d+)/.exec(l);
    if (!m) continue;
    byTier[m[3]] = (byTier[m[3]] || 0) + 1;
    byTierItem[m[3]] = byTierItem[m[3]] || {};
    byTierItem[m[3]][m[2]] = (byTierItem[m[3]][m[2]] || 0) + 1;
  }
  return { count: armor.length, byTier, byTierItem, rows: armor.slice(0, 40) };
}

/** Count (and optionally remove) a player item — 1.12 /clear receipt. */
async function clearCount(item, remove = true) {
  const r = remove
    ? await cmd(`/clear ${NAME} ${item}`, 220)
    : await cmd(`/clear ${NAME} ${item} -1 0`, 220);
  const s = (r || '').trim();
  let n = 0;
  const a = /removing (\d+) items/.exec(s) || /Removed (\d+) items/.exec(s);
  const b = /has (\d+) items that match/.exec(s) || /has (\d+) matching items/.exec(s);
  if (a) n = parseInt(a[1], 10);
  else if (b) n = parseInt(b[1], 10);
  return { n, raw: s };
}

// ------------------------------------------------------------------ rig
const RIG = {
  x: -30, z: 20,           // spawn column (mobs summoned at x.5 / z.5)
  table: { x: -36, y: 100, z: 12 },
  dungeonChest: { x: -30, y: 100, z: 31 },
  mineshaftChest: { x: -34, y: 100, z: 31 },
  standZ: 32.5,
};

async function rigFloor() {
  await cmd(`/gamerule doMobSpawning false`);
  await cmd(`/gamerule doMobLoot true`);
  await cmd(`/gamerule keepInventory true`);
  await cmd(`/gamerule mobGriefing false`);
  await cmd(`/weather clear`);
  await cmd(`/kill @e[type=!Player]`);
  await cmd(`/fill -52 99 4 -16 99 44 minecraft:stone`);
  await cmd(`/fill -52 100 4 -16 103 44 minecraft:air`);
  await cmd(`/setblock ${RIG.table.x} ${RIG.table.y} ${RIG.table.z} minecraft:crafting_table 0 replace`);
  await sleep(300);
}

// ================================================================== W2 zombies
async function w2() {
  await say('b3w2-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(700);
  const spawnAt = `${RIG.x + 0.5} 100 ${RIG.z + 0.5}`;
  const windows = [
    { label: 'z-day5', day: 5, kind: 'zombie', n: 200 },
    { label: 'z-day12', day: 12, kind: 'zombie', n: 200 },
    { label: 'z-day22', day: 22, kind: 'zombie', n: 200 },
    { label: 'zv-day5', day: 5, kind: 'zombie_villager', n: 100 },
    { label: 'zv-day12', day: 12, kind: 'zombie_villager', n: 100 },
    { label: 'zv-day22', day: 22, kind: 'zombie_villager', n: 100 },
  ];
  for (const w of windows) {
    await cmd(`/time set ${w.day * 24000 + 18000}`);
    await cmd(`/kill @e[type=zombie]`);
    await cmd(`/kill @e[type=zombie_villager]`);
    await cmd(`/kill @e[type=chicken]`);
    await sleep(200);
    const r = await summonBulk(w.kind, '{NoAI:1b,Silent:1b,PersistenceRequired:1b}', w.n);
    const weapon = tallyWeapon(r.rows);
    const armor = tallyArmor(r.rows);
    const rate = r.n ? +(weapon.count / r.n).toFixed(4) : null;
    const downgrade = r.rows.filter((l) => l.includes('quality downgrade')).length;
    results.push({
      v: 'W2', label: w.label, day: w.day, kind: w.kind, summoned: r.n, summonOk: r.ok,
      weaponCount: weapon.count, weaponRate: rate, weaponByItem: weapon.byItem,
      armorPieces: armor.count, armorByTier: armor.byTier, armorTierItems: armor.byTierItem,
      qualityDowngradeRows: downgrade,
      sampleWeaponRows: weapon.rows.slice(0, 6), sampleArmorRows: armor.rows.slice(0, 6),
    });
    mark(`w2 ${w.label.padEnd(9)} summon=${r.ok}/${r.n} weapon=${weapon.count} (${rate}) items=${JSON.stringify(weapon.byItem)} armorPieces=${armor.count} tiers=${JSON.stringify(armor.byTier)} qdown=${downgrade}`);
    await cmd(`/kill @e[type=zombie]`);
    await cmd(`/kill @e[type=zombie_villager]`);
    await cmd(`/kill @e[type=chicken]`);
    await sleep(250);
  }

  // armor/weapon damage fraction samples: hard difficulty for a denser armor gate
  await cmd(`/difficulty 3`);
  await cmd(`/kill @e[type=!Player]`);
  await sleep(150);
  const samples = [];
  for (let i = 0; i < 160 && samples.length < 36; i++) {
    const n0 = logLen();
    const before = zombieIds();
    await cmd(`/summon zombie ${spawnAt}`, 170);
    await sleep(330);
    const rows = rowsMatching(since(n0), '[MobLog]');
    const fresh = zombieIds().filter((id) => !before.includes(id));
    const e = fresh.length ? bot.entities[fresh[fresh.length - 1]] : null;
    if (e && rows.some((l) => l.includes('mob armor') || l.includes('mob weapon'))) {
      const eq = equipmentView(e);
      const pieces = [];
      for (const l of rows) {
        const wm = /mob weapon .* item=(\S+)/.exec(l);
        if (wm && eq[0] && eq[0].metadata !== null) {
          pieces.push({ id: wm[1], slot: 'MAINHAND', damage: eq[0].metadata, max: maxDamageOf(wm[1]), enchanted: eq[0].ench });
        }
        const am = /slot=(\S+) item=(\S+) tier=(\d+)/.exec(l);
        if (am) {
          const idx = { FEET: 2, LEGS: 3, CHEST: 4, HEAD: 5 }[am[1]];
          const it = idx !== undefined ? eq[idx] : null;
          if (it && it.metadata !== null) {
            pieces.push({ id: am[2], slot: am[1], tier: +am[3], damage: it.metadata, max: maxDamageOf(am[2]), enchanted: it.ench });
          }
        }
      }
      for (const p of pieces) p.fraction = p.max ? +(p.damage / p.max).toFixed(4) : null;
      samples.push({ entityId: e.id, logRows: rows, equipment: eq, pieces });
    }
    await cmd(`/kill @e[type=zombie]`);
    await sleep(130);
  }
  // flatten
  const pieces = [];
  for (const s of samples) for (const it of s.pieces) if (it.max) pieces.push({ ...it, logRows: s.logRows });
  const plain = pieces.filter((p) => !p.enchanted);
  const ench = pieces.filter((p) => p.enchanted);
  const inBand = (arr, lo, hi) => arr.filter((p) => p.fraction !== null && p.fraction >= lo && p.fraction < hi).length;
  results.push({
    v: 'W2', label: 'damage-samples', sampleMobs: samples.length, pieces: pieces.length,
    plainCount: plain.length, plainInBand: inBand(plain, 0.7, 1.0),
    enchCount: ench.length, enchInBand: inBand(ench, 0.5, 0.8),
    fractionRange: pieces.length ? [Math.min(...pieces.map((p) => p.fraction)), Math.max(...pieces.map((p) => p.fraction))] : null,
    pieces,
    samples: samples.slice(0, 12),
  });  mark(`w2 damage samples: mobs=${samples.length} pieces=${pieces.length} plain=${plain.length} in[0.7,1.0)=${inBand(plain, 0.7, 1.0)} ench=${ench.length} in[0.5,0.8)=${inBand(ench, 0.5, 0.8)}`);
  await cmd(`/difficulty 1`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w2-end');
}

// ================================================================== W2d damage/armor detail
async function w2d() {
  await say('b3w2d-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(600);
  await cmd(`/difficulty 3`);
  await cmd(`/time set ${8 * 24000 + 18000}`); // day 8 = full moon (tension moon term 0.25)
  const spawnAt = `${RIG.x + 0.5} 100 ${RIG.z + 0.5}`;
  const samples = [];
  for (let i = 0; i < 220 && samples.length < 40; i++) {
    const n0 = logLen();
    const before = zombieIds();
    await cmd(`/summon zombie ${spawnAt}`, 160);
    await sleep(330);
    const rows = rowsMatching(since(n0), '[MobLog]');
    const fresh = zombieIds().filter((id) => !before.includes(id));
    const e = fresh.length ? bot.entities[fresh[fresh.length - 1]] : null;
    if (e && rows.some((l) => l.includes('mob armor') || l.includes('mob weapon'))) {
      const eq = equipmentView(e);
      const pieces = [];
      for (const l of rows) {
        const wm = /mob weapon .* item=(\S+)/.exec(l);
        if (wm && eq[0] && eq[0].metadata !== null) {
          pieces.push({ id: wm[1], slot: 'MAINHAND', damage: eq[0].metadata, enchanted: eq[0].ench });
        }
        const am = /slot=(\S+) item=(\S+) tier=(\d+)/.exec(l);
        if (am) {
          const idx = { FEET: 2, LEGS: 3, CHEST: 4, HEAD: 5 }[am[1]];
          const it = idx !== undefined ? eq[idx] : null;
          if (it && it.metadata !== null) {
            pieces.push({ id: am[2], slot: am[1], tier: +am[3], damage: it.metadata, enchanted: it.ench });
          }
        }
      }
      for (const p of pieces) {
        p.max = runtimeMaxDamageOf(p.id);
        p.fraction = p.max ? +(p.damage / p.max).toFixed(4) : null;
      }
      samples.push({ entityId: e.id, rows, equipment: eq, pieces });
    }
    await cmd(`/kill @e[type=zombie]`);
    await sleep(120);
  }
  const pieces = [];
  for (const s of samples) for (const it of s.pieces) if (it.max) pieces.push(it);
  const plain = pieces.filter((p) => !p.enchanted && p.max);
  const ench = pieces.filter((p) => p.enchanted && p.max);
  const inBand = (arr, lo, hi) => arr.filter((p) => p.fraction !== null && p.fraction >= lo && p.fraction < hi).length;
  const armor = pieces.filter((p) => p.slot !== 'MAINHAND');
  const tierMap = {};
  for (const p of armor) {
    tierMap[p.tier] = tierMap[p.tier] || {};
    tierMap[p.tier][p.id] = (tierMap[p.tier][p.id] || 0) + 1;
  }
  results.push({
    v: 'W2d', sampleMobs: samples.length, pieces: pieces.length,
    plainCount: plain.length, plainInBand: inBand(plain, 0.7, 1.0),
    enchCount: ench.length, enchInBand: inBand(ench, 0.5, 0.8),
    unknownBand: pieces.filter((p) => p.fraction === null).length,
    armorPieces: armor.length, tierMap,
    fractionRange: pieces.length ? [Math.min(...pieces.map((p) => p.fraction)), Math.max(...pieces.map((p) => p.fraction))] : null,
    pieces,
    samples: samples.slice(0, 8),
  });
  mark(`w2d mobs=${samples.length} pieces=${pieces.length} plain=${plain.length}/${inBand(plain, 0.7, 1.0)} ench=${ench.length}/${inBand(ench, 0.5, 0.8)} armor=${armor.length} tiers=${JSON.stringify(tierMap)}`);
  await cmd(`/difficulty 1`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w2d-end');
}

// ================================================================== W3 skeleton
async function w3() {
  await say('b3w3-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(700);
  const spawnAt = `${RIG.x + 0.5} 100 ${RIG.z + 0.5}`;

  for (const w of [{ label: 'sk-day12', day: 12, n: 120 }, { label: 'sk-day22', day: 22, n: 120 }]) {
    await cmd(`/time set ${w.day * 24000 + 18000}`);
    await cmd(`/kill @e[type=skeleton]`);
    await sleep(200);
    const r = await summonBulk('skeleton', '{NoAI:1b,Silent:1b,PersistenceRequired:1b}', w.n);
    const weapon = tallyWeapon(r.rows);
    const armor = tallyArmor(r.rows);
    results.push({
      v: 'W3', label: w.label, day: w.day, summoned: r.n, summonOk: r.ok,
      meleeCount: weapon.count, meleeByItem: weapon.byItem,
      armorPieces: armor.count, armorByTier: armor.byTier,
      sampleRows: weapon.rows.slice(0, 10),
    });
    mark(`w3 ${w.label.padEnd(8)} summon=${r.ok}/${r.n} melee=${weapon.count} items=${JSON.stringify(weapon.byItem)} armor=${armor.count}`);
    await cmd(`/kill @e[type=skeleton]`);
    await sleep(250);
  }

  // bow fallback face: non-melee skeletons carry minecraft:bow in the main hand
  await cmd(`/time set ${12 * 24000 + 18000}`);
  const hands = [];
  for (let i = 0; i < 12; i++) {
    const n0 = logLen();
    await cmd(`/summon skeleton ${spawnAt}`, 170);
    await sleep(60);
    const rows = rowsMatching(since(n0), '[MobLog]');
    const nbt = (await cmd(`/entitydata @e[type=skeleton,r=4,c=1]`, 220)).trim();
    const handSeg = /HandItems:\[(\{.*?\}),\{/.exec(nbt);
    const idm = handSeg ? /id:"([^"]+)"/.exec(handSeg[1]) : null;
    hands.push({ meleeLog: rows.some((l) => l.includes('mob weapon')), hand: idm ? idm[1] : null });
    await cmd(`/kill @e[type=skeleton]`);
    await sleep(120);
  }
  const bowCount = hands.filter((h) => h.hand === 'minecraft:bow').length;
  results.push({ v: 'W3', label: 'bow-fallback', samples: hands.length, bowCount, hands });
  mark(`w3 bow fallback: samples=${hands.length} bow=${bowCount} hands=${JSON.stringify(hands.map((h) => h.hand))}`);

  // drop face: rusted arrows replace the vanilla arrow loot row
  await cmd(`/gamemode 0 ${NAME}`);
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 0.5} 0 0`);
  await sleep(600);
  await cmd(`/etest food 20 20 ${NAME}`);
  await cmd(`/kill @e[type=item]`);
  await clearCount('etim:arrow_rusted_iron');
  await clearCount('minecraft:arrow');
  await sleep(200);
  let kills = 0;
  for (let i = 0; i < 30; i++) {
    const r = await cmd(`/summon skeleton ${RIG.x + 0.5} 100 ${RIG.z + 0.5}`, 170);
    if (!(r || '').includes('summon')) continue;
    await sleep(120);
    await cmd(`/kill @e[type=skeleton]`, 160);
    kills++;
    await sleep(260);
  }
  await sleep(600);
  const rusted = await clearCount('etim:arrow_rusted_iron');
  const vanilla = await clearCount('minecraft:arrow');
  const bones = await clearCount('minecraft:bone', false);
  results.push({
    v: 'W3', label: 'arrow-drops', kills,
    rustedArrows: rusted.n, rustedRaw: rusted.raw,
    vanillaArrows: vanilla.n, vanillaRaw: vanilla.raw,
    bonesFound: bones.n, bonesRaw: bones.raw,
  });
  mark(`w3 arrow drops: kills=${kills} rusted=${rusted.n} vanilla=${vanilla.n} bones(+)=${bones.n}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w3-end');
}

// ================================================================== W3b bow + drops
async function w3b() {
  await say('b3w3b-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(600);
  await cmd(`/time set ${12 * 24000 + 18000}`);
  const spawnAt = `${RIG.x + 0.5} 100 ${RIG.z + 0.5}`;

  // bow fallback: read the client equipment of a freshly summoned skeleton
  const hands = [];
  for (let i = 0; i < 16; i++) {
    const n0 = logLen();
    const before = skeletonIds();
    await cmd(`/summon skeleton ${spawnAt}`, 160);
    await sleep(280);
    const rows = rowsMatching(since(n0), '[MobLog]');
    const fresh = skeletonIds().filter((id) => !before.includes(id));
    const e = fresh.length ? bot.entities[fresh[fresh.length - 1]] : null;
    const eq = equipmentView(e);
    let hand = null;
    if (eq[0]) hand = eq[0].name !== 'unknown' ? 'minecraft:' + eq[0].name : (TYPEMAP[String(eq[0].type)] || ('unknown:' + eq[0].type));
    hands.push({ meleeLog: rows.some((l) => l.includes('mob weapon')), hand, log: rows.filter((l) => l.includes('mob weapon')).slice(0, 1) });
    await cmd(`/kill @e[type=skeleton]`, 140);
    await sleep(150);
  }
  const bowCount = hands.filter((h) => h.hand === 'minecraft:bow').length;
  const meleeHands = hands.filter((h) => h.meleeLog).length;
  results.push({ v: 'W3b', label: 'bow-fallback', samples: hands.length, bowCount, meleeHands, hands });
  mark(`w3b bow fallback: samples=${hands.length} bow=${bowCount} melee=${meleeHands} hands=${JSON.stringify(hands.map((h) => h.hand))}`);

  // drop face: creative player at the skeleton's feet picks the loot up; the
  // creative flag keeps the skeleton from shooting (they never target creative)
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 0.5} 0 0`);
  await sleep(700);
  await cmd(`/etest food 20 20 ${NAME}`);
  await cmd(`/kill @e[type=item]`, 160);
  await clearCount('etim:arrow_rusted_iron');
  await clearCount('minecraft:arrow');
  await clearCount('minecraft:bone');
  await sleep(250);
  let kills = 0;
  const itemKills = [];
  for (let i = 0; i < 32; i++) {
    const r = await cmd(`/summon skeleton ${RIG.x + 0.5} 100 ${RIG.z + 0.5}`, 160);
    if (!(r || '').includes('summon')) continue;
    await sleep(160);
    await cmd(`/kill @e[type=skeleton]`, 150);
    kills++;
    await sleep(380);
  }
  await sleep(1200);
  const rusted = await clearCount('etim:arrow_rusted_iron');
  const vanilla = await clearCount('minecraft:arrow');
  const bones = await clearCount('minecraft:bone', false);
  results.push({
    v: 'W3b', label: 'arrow-drops', kills,
    rustedArrows: rusted.n, rustedRaw: rusted.raw,
    vanillaArrows: vanilla.n, vanillaRaw: vanilla.raw,
    bonesFound: bones.n, bonesRaw: bones.raw,
  });
  mark(`w3b arrow drops: kills=${kills} rusted=${rusted.n} vanilla=${vanilla.n} bones(+)=${bones.n} raws=${JSON.stringify([rusted.raw, vanilla.raw, bones.raw])}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w3b-end');
}

// ================================================================== W4 chests
const TYPEMAP = (() => {
  try { return require(path.join(OUT_DIR, 'b3-typemap.json')).results[0].byType; } catch (e) { return {}; }
})();
function resolveItemName(s) {
  if (!s) return null;
  if (s.name && s.name !== 'unknown') return 'minecraft:' + s.name;
  return TYPEMAP[String(s.type)] || ('unknown:' + s.type);
}

async function chestSample(label, table, opens) {
  const c = table;
  await cmd(`/gamemode 1 ${NAME}`);
  await cmd(`/tp ${NAME} ${c.x + 0.5} 100 ${c.z + 1.5} 180 0`);
  await sleep(600);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(300);
  const found = {};      // id -> count
  const damages = [];    // {id, damage, max, fraction}
  const countSamples = []; // {id, count} for the rusted rows (chain 1-5 face)
  const rolls = [];      // per-open item id list
  let failOpen = 0;
  for (let i = 0; i < opens; i++) {
    // 1.12 setblock returns noChange (and clears the TE first) on an identical
    // block state — always go through air so the chest + LootTable are re-created.
    await cmd(`/setblock ${c.x} ${c.y} ${c.z} minecraft:air`, 70);
    await cmd(`/setblock ${c.x} ${c.y} ${c.z} minecraft:chest 0 replace {LootTable:"${table.loot}"}`, 90);
    await sleep(130);
    let win = null;
    try { win = await openTimed(c.x, c.y, c.z, 2500); } catch (e) { win = null; }
    if (!win) { failOpen++; await sleep(120); continue; }
    await sleep(120);
    // chest slots are 0..26 (the rest is the player inventory in the same window)
    const items = (win.slots || []).slice(0, 27).filter(Boolean).map((s) => ({
      id: resolveItemName(s), count: s.count, damage: s.metadata,
    }));
    await closeWin(win);
    await sleep(150);
    rolls.push(items.map((x) => x.id));
    for (const it of items) {
      found[it.id] = (found[it.id] || 0) + 1;
      const jmax = maxDamageOf(it.id);
      const rmax = runtimeMaxDamageOf(it.id);
      if (rmax && it.damage !== null) {
        damages.push({
          id: it.id, damage: it.damage, judgedMax: jmax, runtimeMax: rmax,
          fraction: +(it.damage / rmax).toFixed(4),
        });
      }
      if (it.id && it.id.includes('rusted_iron')) countSamples.push({ id: it.id, count: it.count });
    }
  }
  const rusted = Object.keys(found).filter((id) => id.startsWith('etim:') && id.includes('rusted_iron'));
  const ancient = Object.keys(found).filter((id) => id.includes('ancient_metal'));
  const zeroDamage = damages.filter((d) => d.damage === 0);
  return {
    v: 'W4', label, loot: table.loot, opens, failOpen,
    found, rustedIds: rusted, ancientIds: ancient,
    damageSamples: damages.length, damageMin: damages.length ? Math.min(...damages.map((d) => d.fraction)) : null,
    damageMax: damages.length ? Math.max(...damages.map((d) => d.fraction)) : null,
    inBand3to9: damages.filter((d) => d.fraction >= 0.3 && d.fraction < 0.9).length,
    zeroDamageRows: zeroDamage.length,
    zeroDamageSample: zeroDamage.slice(0, 6),
    sampleRolls: rolls.slice(0, 5),
    damageSamplesList: damages.slice(0, 60),
    countSamples: countSamples.slice(0, 200),
  };
}

async function w4() {
  await say('b3w4-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await rigFloor();
  await cmd(`/fill -52 100 28 -16 103 36 minecraft:air`);
  await sleep(250);
  const dungeon = await chestSample('dungeon', { x: RIG.dungeonChest.x, y: 100, z: 31, loot: 'minecraft:chests/simple_dungeon' }, 200);
  mark(`w4 dungeon opens=${dungeon.opens} fail=${dungeon.failOpen} rusted=${JSON.stringify(dungeon.rustedIds)} found=${JSON.stringify(Object.fromEntries(Object.entries(dungeon.found).filter(([k]) => k.includes('rusted') || k.includes('ancient'))))}`);
  results.push(dungeon);
  const mine = await chestSample('mineshaft', { x: RIG.mineshaftChest.x, y: 100, z: 31, loot: 'minecraft:chests/abandoned_mineshaft' }, 200);
  mark(`w4 mineshaft opens=${mine.opens} fail=${mine.failOpen} rusted=${JSON.stringify(mine.rustedIds)} found=${JSON.stringify(Object.fromEntries(Object.entries(mine.found).filter(([k]) => k.includes('rusted') || k.includes('ancient'))))}`);
  results.push(mine);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w4-end');
}

// ================================================================== W5 quality
async function qualityCell(key, give, plan, wantItem) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  for (const [n, c] of give) await giveItem(n, c);
  await cmd(`/tp ${NAME} ${RIG.table.x + 0.5} 100 ${RIG.table.z + 1.5} 180 0`);
  await sleep(600);
  const w = await openTimed(RIG.table.x, RIG.table.y, RIG.table.z, 4000);
  if (!w) { mark(`w5 ${key}: NO-TABLE-WINDOW`); return { v: 'W5', key, want: wantItem, ok: false, err: 'no window' }; }
  for (const step of plan) {
    click(w.id, 37 + step.hotbar); await sleep(200);
    for (const s of step.slots) { click(w.id, s, 1); await sleep(120); }
    click(w.id, 37 + step.hotbar); await sleep(200);
  }
  await sleep(500);
  // quality picker is disabled in creative + needs the timer on: survival + XP budget
  await cmd(`/gamemode 0 ${NAME}`);
  await cmd(`/etest level 200 ${NAME}`);
  await cmd(`/etest food 20 20 ${NAME}`);
  await sleep(500);
  const n0 = logLen();
  for (let i = 0; i < 8; i++) { click(w.id, 0, 1); await sleep(320); }
  await sleep(300);
  const rows = rowsMatching(since(n0), '');
  const clickRows = rows.filter((l) => l.includes('result click btn=1'));
  const cycles = rows.filter((l) => l.includes('quality cycle'));
  const ranges = [];
  for (const l of cycles) {
    const m = /range=\[(\d+)\.\.(\d+)\]/.exec(l);
    if (m) ranges.push([parseInt(m[1], 10), parseInt(m[2], 10)]);
  }
  await closeWin(w);
  await sleep(200);
  await cmd(`/gamemode 1 ${NAME}`);
  const out = {
    v: 'W5', key, want: wantItem, clicksSeen: clickRows.length,
    cycleCount: cycles.length, ranges,
    maxOrdinal: ranges.length ? Math.max(...ranges.map((r) => r[1])) : null,
    sampleRows: [...cycles.slice(0, 3), ...clickRows.slice(0, 3)].map((l) => firstLine(l)),
  };
  mark(`w5 ${key.padEnd(22)} clicks=${clickRows.length} cycles=${cycles.length} ranges=${JSON.stringify(ranges)} want=${wantItem}`);
  return out;
}

async function w4c() {
  await say('b3w4c-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await rigFloor();
  await cmd(`/fill -52 100 28 -16 103 36 minecraft:air`);
  await sleep(250);
  const mine = await chestSample('mineshaft-b', { x: RIG.mineshaftChest.x, y: 100, z: 31, loot: 'minecraft:chests/abandoned_mineshaft' }, 300);
  results.push(mine);
  const chain = (mine.countSamples || []).filter((x) => x.id === 'etim:chain_rusted_iron').map((x) => x.count);
  const hist = {};
  for (const c of chain) hist[c] = (hist[c] || 0) + 1;
  mark(`w4c mineshaft-b opens=${mine.opens} fail=${mine.failOpen} chainN=${chain.length} hist=${JSON.stringify(hist)} rusted=${JSON.stringify(mine.rustedIds)}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w4c-end');
}

async function w5() {
  await say('b3w5-begin');
  await rigFloor();
  const cells = [
    { key: 'sword-copper',  want: 'etim:sword_copper',  give: [['etim:ingot_copper', 2], ['minecraft:stick', 1]], plan: [{ hotbar: 0, slots: [2, 5] }, { hotbar: 1, slots: [8] }] },
    { key: 'sword-silver',  want: 'etim:sword_silver',  give: [['etim:ingot_silver', 2], ['minecraft:stick', 1]], plan: [{ hotbar: 0, slots: [2, 5] }, { hotbar: 1, slots: [8] }] },
    { key: 'sword-ancient', want: 'etim:sword_ancient_metal', give: [['etim:ingot_ancient_metal', 2], ['minecraft:stick', 1]], plan: [{ hotbar: 0, slots: [2, 5] }, { hotbar: 1, slots: [8] }] },
    { key: 'sword-mithril', want: 'etim:sword_mithril', give: [['etim:ingot_mithril', 2], ['minecraft:stick', 1]], plan: [{ hotbar: 0, slots: [2, 5] }, { hotbar: 1, slots: [8] }] },
    { key: 'sword-adamantium', want: 'etim:sword_adamantium', give: [['etim:ingot_adamantium', 2], ['minecraft:stick', 1]], plan: [{ hotbar: 0, slots: [2, 5] }, { hotbar: 1, slots: [8] }] },
    { key: 'chain-helmet-rusted', want: 'etim:chain_helmet_rusted_iron', give: [['etim:chain_rusted_iron', 5]], plan: [{ hotbar: 0, slots: [1, 2, 3, 4, 6] }] },
  ];
  for (const c of cells) results.push(await qualityCell(c.key, c.give, c.plan, c.want));
  await say('b3w5-end');
}

// ================================================================== W6 negatives
async function w6() {
  await say('b3w6-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  const probes = [
    'etim:ingot_rusted_iron',
    'etim:nugget_rusted_iron',
    'etim:scythe_rusted_iron',
    'etim:knife_rusted_iron',
  ];
  const out = [];
  for (const p of probes) {
    const r = (await cmd(`/give ${NAME} ${p} 1`)).trim();
    out.push({ probe: p, response: r, absent: !r.toLowerCase().includes('given') });
    mark(`w6 give ${p.padEnd(28)} -> ${r}`);
  }
  results.push({ v: 'W6', label: 'absent-items', probes: out });
  // boot receipt: 94 shaped rows = 90 ingot-based (5 metals x 18) + 4 rusted chain-armor
  const recipeRows = rowsMatching(logLines(), 'gear recipes registered');
  results.push({ v: 'W6', label: 'recipe-rows', rows: recipeRows });
  mark(`w6 recipe rows -> ${JSON.stringify(recipeRows.slice(-1))}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3w6-end');
}

// ------------------------------------------------------------------ main
async function probe2() {
  await say('b3probe2-begin');
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(600);
  await cmd(`/difficulty 3`);
  await cmd(`/time set ${12 * 24000 + 18000}`);
  const out = [];
  for (let i = 0; i < 60; i++) {
    const n0 = logLen();
    await cmd(`/summon zombie ${RIG.x + 0.5} 100 ${RIG.z + 0.5}`, 170);
    const rows = rowsMatching(since(n0), '[MobLog]');
    if (rows.some((l) => l.includes('mob armor') || l.includes('mob weapon'))) {
      const raw = await cmd(`/entitydata @e[type=zombie,r=4,c=1]`, 700);
      out.push({ rows, raw });
      mark(`probe2 #${i} rows=${rows.length} raw=${JSON.stringify(raw.slice(0, 500))}`);
    }
    await cmd(`/kill @e[type=zombie]`, 140);
    if (out.length >= 3) break;
  }
  results.push({ v: 'probe2', samples: out });
  await cmd(`/difficulty 1`);
  await say('b3probe2-end');
}

async function probe3() {
  await say('b3probe3-begin');
  await rigFloor();
  const rawEquip = [];
  bot._client.on('entity_equipment', (p) => {
    if (rawEquip.length < 200) rawEquip.push({ entityId: p.entityId, slot: p.slot, item: p.item });
  });
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(600);
  await cmd(`/difficulty 3`);
  await cmd(`/time set ${12 * 24000 + 18000}`);
  const out = [];
  for (let i = 0; i < 40; i++) {
    const n0 = logLen();
    const before = zombieIds();
    await cmd(`/summon zombie ${RIG.x + 0.5} 100 ${RIG.z + 0.5}`, 170);
    await sleep(350);
    const rows = rowsMatching(since(n0), '[MobLog]');
    const fresh = zombieIds().filter((id) => !before.includes(id));
    const e = fresh.length ? bot.entities[fresh[fresh.length - 1]] : null;
    if (e && e.equipment && e.equipment.some(Boolean)) {
      const dumped = e.equipment.map((it) => it ? ({
        name: it.name, type: it.type, metadata: it.metadata, count: it.count,
        max: it.maxDurability, durabilityUsed: it.durabilityUsed,
        nbt: JSON.stringify(it.nbt || null).slice(0, 200),
        keys: Object.keys(it),
      }) : null);
      out.push({ id: e.id, pos: e.position, equipment: dumped, rows, packets: rawEquip.filter((p) => p.entityId === e.id) });
      mark(`probe3 #${i} rows=${JSON.stringify(rows)}`);
      mark(`probe3 #${i} packets=${JSON.stringify(rawEquip.filter((p) => p.entityId === e.id))}`);
      mark(`probe3 #${i} equip=${JSON.stringify(dumped)}`);
    }
    await cmd(`/kill @e[type=zombie]`, 140);
    await sleep(120);
    if (out.length >= 3) break;
  }
  results.push({ v: 'probe3', samples: out });
  await cmd(`/difficulty 1`);
  await say('b3probe3-end');
}

async function probe4() {
  await say('b3probe4-begin');
  await rigFloor();
  const rawEquip = [];
  bot._client.on('entity_equipment', (p) => rawEquip.push({ entityId: p.entityId, slot: p.slot, item: p.item }));
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(500);
  const out = [];
  for (const [tag, want] of [
    ['{HandItems:[{id:"minecraft:wooden_shovel",Count:1b,Damage:10s},{}]}', 10],
    ['{HandItems:[{id:"etim:shovel_rusted_iron",Count:1b,Damage:100s},{}]}', 100],
  ]) {
    const before = zombieIds();
    await cmd(`/summon zombie ${RIG.x + 0.5} 100 ${RIG.z + 0.5} ${tag}`, 200);
    await sleep(400);
    const fresh = zombieIds().filter((id) => !before.includes(id));
    const id = fresh.length ? fresh[fresh.length - 1] : null;
    const pkt = rawEquip.filter((p) => p.entityId === id);
    out.push({ tag, want, id, pkt });
    mark(`probe4 tag=${tag.slice(0, 60)} want=${want} id=${id} pkt=${JSON.stringify(pkt)}`);
    await cmd(`/kill @e[type=zombie]`, 140);
    await sleep(120);
  }
  results.push({ v: 'probe4', out });
  await say('b3probe4-end');
}

async function probe5() {
  await say('b3probe5-begin');
  await rigFloor();
  const rawEquip = [];
  bot._client.on('entity_equipment', (p) => rawEquip.push({ t: Date.now(), entityId: p.entityId, slot: p.slot, item: p.item }));
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(500);
  const before = zombieIds();
  await cmd(`/summon zombie ${RIG.x + 0.5} 100 ${RIG.z + 0.5}`, 200);
  await sleep(300);
  const fresh = zombieIds().filter((id) => !before.includes(id));
  const id = fresh.length ? fresh[fresh.length - 1] : null;
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const e = nearestEntity('zombie', RIG.x + 0.5, 100, RIG.z + 0.5);
    seen.push({ i, id: e ? e.id : null, equip: e ? equipmentView(e) : null });
    await sleep(150);
  }
  const pkts = rawEquip.filter((p) => p.entityId === id);
  results.push({ v: 'probe5', id, carried: seen, packets: pkts });
  mark(`probe5 id=${id} seen=${JSON.stringify(seen.map((s) => s.equip && s.equip[0] && s.equip[0].metadata))}`);
  mark(`probe5 packets=${JSON.stringify(pkts.map((p) => p.item && p.item.itemDamage))}`);
  results.push({ v: 'probe5', seen, packets: pkts });
  await cmd(`/kill @e[type=zombie]`, 140);
  await say('b3probe5-end');
}

async function probe6() {
  await say('b3probe6-begin');
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(500);
  await cmd(`/difficulty 3`);
  await cmd(`/time set ${12 * 24000 + 18000}`);
  const rows = [];
  for (let i = 0; i < 140; i++) {
    const n0 = logLen();
    const before = zombieIds();
    await cmd(`/summon zombie ${RIG.x + 0.5} 100 ${RIG.z + 0.5}`, 150);
    await sleep(280);
    const fresh = zombieIds().filter((id) => !before.includes(id));
    const e = fresh.length ? bot.entities[fresh[fresh.length - 1]] : null;
    const eq = e ? equipmentView(e) : [];
    if (eq.some(Boolean)) {
      rows.push({ id: e.id, eq, logs: rowsMatching(since(n0), '[MobLog]') });
    }
    await cmd(`/kill @e[type=zombie]`, 120);
    await sleep(90);
  }
  results.push({ v: 'probe6', rows });
  const weapon = rows.filter((r) => r.eq[0]);
  const byType = {};
  for (const r of weapon) {
    const t = r.eq[0].type;
    byType[t] = byType[t] || { n: 0, min: Infinity, max: -Infinity, items: {} };
    const b = byType[t];
    b.n++;
    b.min = Math.min(b.min, r.eq[0].metadata);
    b.max = Math.max(b.max, r.eq[0].metadata);
    const l = (r.logs.find((x) => x.includes('mob weapon')) || '');
    const m = /item=(\S+)/.exec(l);
    if (m) b.items[m[1]] = (b.items[m[1]] || 0) + 1;
  }
  results.push({ v: 'probe6', label: 'byType', byType });
  mark(`probe6 rows=${rows.length} byType=${JSON.stringify(byType)}`);
  await cmd(`/difficulty 1`);
  await say('b3probe6-end');
}

async function probe7() {
  await say('b3probe7-begin');
  await rigFloor();
  await cmd(`/fill -52 100 28 -16 103 36 minecraft:air`);
  await cmd(`/tp ${NAME} ${RIG.dungeonChest.x + 0.5} 100 ${RIG.dungeonChest.z + 1.5} 180 0`);
  await sleep(500);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(300);
  const c = RIG.dungeonChest;
  const out = [];
  for (let i = 0; i < 25; i++) {
    await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:chest 0 replace {LootTable:"minecraft:chests/simple_dungeon"}`, 90);
    let win = null;
    try { win = await openTimed(c.x, 100, c.z, 2500); } catch (e) { win = null; }
    if (!win) { out.push({ i, open: false }); continue; }
    await sleep(120);
    const slots = (win.slots || []).map((s, idx) => (s ? { idx, type: s.type, name: s.name, count: s.count, metadata: s.metadata, max: s.maxDurability } : null)).filter(Boolean);
    out.push({ i, open: true, slots });
    await closeWin(win);
    await sleep(120);
  }
  results.push({ v: 'probe7', out });
  const rusted = [];
  for (const o of out) for (const s of (o.slots || [])) if (s.name === 'unknown' && s.metadata > 0) rusted.push(s);
  mark(`probe7 opens=${out.filter((o) => o.open).length} unknownItems=${rusted.length} sample=${JSON.stringify(rusted.slice(0, 8))}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3probe7-end');
}

async function probe8() {
  await say('b3probe8-begin');
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.dungeonChest.x + 0.5} 100 ${RIG.dungeonChest.z + 1.5} 180 0`);
  await sleep(500);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(300);
  const c = RIG.dungeonChest;
  const r1 = await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:chest 0 replace {LootTable:"minecraft:chests/simple_dungeon"}`, 250);
  await sleep(300);
  const win = await openTimed(c.x, 100, c.z, 3000);
  await sleep(250);
  const meta = win ? { id: win.id, type: win.type, slotCount: win.slots ? win.slots.length : null, nonNull: win.slots ? win.slots.filter(Boolean).length : null } : null;
  const list = win && win.slots ? win.slots.map((s, i) => (s ? { i, type: s.type, name: s.name, count: s.count, metadata: s.metadata } : null)).filter(Boolean) : [];
  if (win) await closeWin(win);
  await sleep(300);
  const r2 = await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:chest 0 keep`, 200);
  results.push({ v: 'probe8', setblock: r1, win: meta, slots: list, setblockKeep: r2 });
  mark(`probe8 setblock=${JSON.stringify(r1)} win=${JSON.stringify(meta)} slots=${JSON.stringify(list.slice(0, 12))}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3probe8-end');
}

async function typemap() {
  await say('b3typemap-begin');
  await rigFloor();
  const x = -38, y = 100, z = 31;
  await cmd(`/tp ${NAME} ${x + 0.5} 100 ${z + 1.5} 180 0`);
  await sleep(500);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(250);
  const items = [
    'etim:pickaxe_rusted_iron', 'etim:shovel_rusted_iron', 'etim:axe_rusted_iron', 'etim:hoe_rusted_iron',
    'etim:hatchet_rusted_iron', 'etim:mattock_rusted_iron', 'etim:sword_rusted_iron', 'etim:dagger_rusted_iron',
    'etim:battle_axe_rusted_iron', 'etim:war_hammer_rusted_iron',
    'etim:helmet_rusted_iron', 'etim:chestplate_rusted_iron', 'etim:leggings_rusted_iron', 'etim:boots_rusted_iron',
    'etim:chain_helmet_rusted_iron', 'etim:chain_chestplate_rusted_iron', 'etim:chain_leggings_rusted_iron', 'etim:chain_boots_rusted_iron',
    'etim:shears_rusted_iron', 'etim:arrow_rusted_iron', 'etim:chain_rusted_iron',
    'etim:nugget_ancient_metal', 'etim:ingot_ancient_metal',
    'minecraft:wooden_shovel', 'minecraft:bone', 'minecraft:arrow',
  ];
  const map = {};
  for (const item of items) {
    await rcon.cmd(`/setblock ${x} ${y} ${z} minecraft:air`);
    await sleep(80);
    await rcon.cmd(`/setblock ${x} ${y} ${z} minecraft:chest 0 replace {Items:[{Slot:0b,id:"${item}",Count:1b}]}`);
    await sleep(260);
    let win = null;
    try { win = await openTimed(x, y, z, 2500); } catch (e) { win = null; }
    if (!win) { map[item] = null; continue; }
    await sleep(120);
    const s = win.slots ? win.slots[0] : null;
    map[item] = s ? { type: s.type, name: s.name, metadata: s.metadata } : null;
    await closeWin(win);
    await sleep(160);
  }
  const byType = {};
  for (const [k, v] of Object.entries(map)) if (v) byType[v.type] = k;
  results.push({ v: 'typemap', map, byType });
  mark(`typemap ${JSON.stringify(byType)}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3typemap-end');
}

async function probe9() {
  await say('b3probe9-begin');
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.dungeonChest.x + 0.5} 100 ${RIG.dungeonChest.z + 1.5} 180 0`);
  await sleep(500);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(250);
  const c = RIG.dungeonChest;
  const out = [];
  for (let i = 0; i < 40 && out.length < 6; i++) {
    await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:air`, 70);
    await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:chest 0 replace {LootTable:"minecraft:chests/simple_dungeon"}`, 90);
    await sleep(130);
    let win = null;
    try { win = await openTimed(c.x, 100, c.z, 2500); } catch (e) { win = null; }
    if (!win) continue;
    await sleep(120);
    const slots = (win.slots || []).slice(0, 27);
    for (const s of slots) {
      if (!s) continue;
      if (s.name === 'unknown') {
        out.push({ type: s.type, metadata: s.metadata, count: s.count, nbt: s.nbt ? JSON.stringify(s.nbt).slice(0, 300) : null, byType: TYPEMAP[String(s.type)] });
      }
    }
    await closeWin(win);
    await sleep(140);
  }
  results.push({ v: 'probe9', out });
  mark(`probe9 ${JSON.stringify(out)}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3probe9-end');
}

function startDig(x, y, z) {
  bot._client.write('block_dig', { status: 0, location: new Vec3(x, y, z), face: 1 });
}
function stopDig(x, y, z) {
  bot._client.write('block_dig', { status: 2, location: new Vec3(x, y, z), face: 1 });
}
async function blockIs(x, y, z, name) {
  return (await cmd(`/testforblock ${x} ${y} ${z} ${name}`, 140)).includes('Successfully found');
}
function heldMeta() {
  const it = bot.inventory && bot.inventory.slots ? bot.inventory.slots[36] : null;
  return it ? { name: it.name, type: it.type, metadata: it.metadata, count: it.count } : null;
}

async function maxprobe() {
  await say('b3maxprobe-begin');
  await rigFloor();
  const out = [];
  const cases = [
    ['etim:shovel_rusted_iron', 1595, 'minecraft:dirt', 700],
    ['etim:sword_rusted_iron', 3150, 'minecraft:dirt', 700],
    ['etim:pickaxe_copper', 4795, 'minecraft:stone', 2200],
    ['etim:pickaxe_adamantium', 9595, 'minecraft:stone', 2200],
  ];
  for (const [item, dmg, block, holdMs] of cases) {
    await cmd(`/gamemode 1 ${NAME}`);
    await clearAll();
    await cmd(`/give ${NAME} ${item} 1 ${dmg}`, 220);
    selectSlot(0);
    await sleep(300);
    const before = heldMeta();
    const p = { x: -34, y: 100, z: 20, block };
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} ${p.block}`, 150);
    await cmd(`/tp ${NAME} ${p.x + 0.5} 100 ${p.z + 2.5} 180 0`);
    await sleep(600);
    await cmd(`/gamemode 0 ${NAME}`);
    await cmd(`/etest food 20 20 ${NAME}`);
    await sleep(400);
    const n0 = logLen();
    startDig(p.x, p.y, p.z);
    await sleep(holdMs);
    stopDig(p.x, p.y, p.z);
    let broke = false;
    for (let i = 0; i < 30; i++) {
      await sleep(200);
      if (!(await blockIs(p.x, p.y, p.z, p.block))) { broke = true; break; }
    }
    await sleep(700);
    const after = heldMeta();
    const decay = rowsMatching(since(n0), 'tool decay');
    out.push({ item, startDamage: dmg, block, before, broke, after, decay });
    mark(`maxprobe ${item} start=${dmg} before=${JSON.stringify(before)} broke=${broke} after=${JSON.stringify(after)} decay=${JSON.stringify(decay.slice(0, 2))}`);
    await cmd(`/setblock ${p.x} ${p.y} ${p.z} minecraft:air`, 100);
    await cmd(`/gamemode 1 ${NAME}`);
  }
  results.push({ v: 'maxprobe', out });
  await say('b3maxprobe-end');
}

async function probe10() {
  await say('b3probe10-begin');
  await rigFloor();
  await cmd(`/fill -52 100 28 -16 103 36 minecraft:air`);
  await cmd(`/tp ${NAME} ${RIG.mineshaftChest.x + 0.5} 100 ${RIG.mineshaftChest.z + 1.5} 180 0`);
  await sleep(500);
  await cmd(`/gamemode 0 ${NAME}`);
  await sleep(250);
  const c = RIG.mineshaftChest;
  const out = [];
  for (let i = 0; i < 15; i++) {
    await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:air`, 70);
    await cmd(`/setblock ${c.x} 100 ${c.z} minecraft:chest 0 replace {LootTable:"minecraft:chests/abandoned_mineshaft"}`, 90);
    await sleep(130);
    let win = null;
    try { win = await openTimed(c.x, 100, c.z, 2500); } catch (e) { win = null; }
    if (!win) continue;
    await sleep(120);
    const items = (win.slots || []).slice(0, 27).filter(Boolean).map((s) => ({ id: resolveItemName(s), count: s.count }));
    out.push(items);
    await closeWin(win);
    await sleep(140);
  }
  results.push({ v: 'probe10', out });
  mark(`probe10 ${JSON.stringify(out)}`);
  await cmd(`/gamemode 1 ${NAME}`);
  await say('b3probe10-end');
}

async function probe() {
  await say('b3probe-begin');
  await rigFloor();
  await cmd(`/tp ${NAME} ${RIG.x + 0.5} 100 ${RIG.z + 2.5} 180 0`);
  await sleep(600);
  await cmd(`/time set ${12 * 24000 + 18000}`);
  const r = await summonBulk('zombie', '{NoAI:1b,Silent:1b,PersistenceRequired:1b}', 10);
  const gear = r.rows.filter((l) => l.includes('mob weapon') || l.includes('mob armor'));
  results.push({ v: 'probe', summon: `${r.ok}/${r.n}`, rows: r.rows.length, gearRows: gear });
  mark(`probe summon=${r.ok}/${r.n} moblogRows=${r.rows.length} gearRows=${gear.length}`);
  for (const l of gear.slice(0, 5)) mark('  ' + l);
  await cmd(`/kill @e[type=zombie]`, 160);
  await say('b3probe-end');
}

(async () => {
  const phase = process.argv[2] || 'setup';
  rcon = new Rcon();
  await rcon.connect();
  await rcon.auth();

  bot = await createHarnBot({ username: NAME });
  bot.physicsEnabled = false;
  for (let i = 0; i < 40 && !bot.entity; i++) await sleep(100);
  await sleep(800);
  usePlayer = true; // see chatCmd: RCON is off-thread in 1.12
  await cmd(`/gamemode 1 ${NAME}`, 160);
  await sleep(400);

  const phases = { setup: async () => { await rigFloor(); await say('b3setup-done'); }, probe, probe2, probe3, probe4, probe5, probe6, probe7, probe8, probe9, probe10, typemap, maxprobe, w2, w2d, w3, w3b, w4, w4c, w5, w6 };
  if (!phases[phase]) { console.error(`unknown phase ${phase}`); process.exit(2); }
  try {
    await phases[phase]();
  } catch (e) {
    mark(`FATAL ${phase}: ${e && e.stack ? e.stack : e}`);
  }
  const outFile = path.join(OUT_DIR, `b3-${phase}.json`);
  fs.writeFileSync(outFile, JSON.stringify({ phase, when: new Date().toISOString(), results }, null, 2), 'utf8');
  mark(`results -> ${outFile} (${results.length} rows)`);
  bot.quit();
  rcon.close();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
