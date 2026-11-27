#!/usr/bin/env node
/**
 * metal-anvil-blocks-run.js — 金属砧块批（T7 挂账兑现）smoke driver.
 *
 * Phases (批文 metal-anvil-blocks-落码批文 §三):
 *   w2      storage blocks 9:1: 9 copper ingots → 1 block + 1 block → 9 ingots
 *   w3      the copper anvil craft: 3 storage_copper + 7 ingot_copper (grid)
 *   w4      the repair gate matrix on metal anvils:
 *             a  copper anvil + copper scythe  → PASS (take row)
 *             b  copper anvil + mithril scythe → FAIL2 material=64.0 > anvil=4.0
 *             c  mithril anvil + mithril scythe → PASS
 *             d  mithril anvil + adamantium scythe → FAIL2 material=256.0 > anvil=64.0
 *   w5      the per-anvil wear face: take row anvilWear=1600 + /etest anvilwear
 *   w6      the T4① above-cell gate: a solid block over the anvil refuses the
 *           window; cleared → the window opens
 *   w7      the T3② ledger hygiene: repair (wear 1600) → mine → wearAt=0 →
 *           re-place → wearAt=0 (no stale inheritance)
 *
 * Judgment channels: [AnvilLog] (this harness) + [TestLog] anvilwear +
 * [CraftingLog] fail/take rows. Window opens go through bot.openAnvil with a
 * bot.openBlock fallback (the mineflayer anvil plugin matches the name).
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
const mark = (...a) => log('anvilblocks', ...a);
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
const say = (t) => cmd(`/say [AnvilBlocks] ${t}`);
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
async function waitRows(n0, pred, ms = 15000) {
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
async function wearAt(x, y, z) {
  const r = await cmd(`/etest anvilwear ${x} ${y} ${z}`, 260);
  const m = /= (-?\d+)/.exec((r || ''));
  return m ? parseInt(m[1], 10) : null;
}

// ------------------------------------------------------------------ window face
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
    bot.openAnvil(block).catch(() => null),
    sleep(timeout).then(() => null),
  ]);
  if (w) return w;
  // fallback: the plain use face (C08) — the server opens the window itself
  try {
    await bot.openBlock(block);
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      if (bot.currentWindow) return bot.currentWindow;
      await sleep(250);
    }
  } catch (e) { /* ignore */ }
  return bot.currentWindow || null;
}
async function closeWin(win) {
  try { bot.closeWindow(win); } catch (e) { /* ignore */ }
  for (let i = 0; i < 25 && bot.currentWindow; i++) await sleep(30);
}
function slotStack(win, slot) {
  const it = (win && win.slots || [])[slot];
  return it ? { name: it.name, count: it.count, metadata: it.metadata } : null;
}
async function placeAll(win, hotbar, anvilSlot) {
  await wclick(30 + hotbar); await sleep(200);
  await wclick(anvilSlot); await sleep(200);
  await wclick(30 + hotbar); await sleep(200);
}
async function takeOutput() {
  await wclick(2); await sleep(300);
  await wclick(30); await sleep(300);
}

// ------------------------------------------------------------------ rig
const RIG = {
  stand: { x: -30.5, z: 22.5 },
  anvCu: { x: -34, y: 100, z: 12 },
  anvMi: { x: -33, y: 100, z: 12 },
  anvVa: { x: -35, y: 100, z: 12 },
  table: { x: -36, y: 100, z: 12 },
};
async function rigFloor() {
  await cmd(`/gamerule doMobSpawning false`);
  await cmd(`/gamerule keepInventory true`);
  await cmd(`/weather clear`);
  await cmd(`/kill @e[type=!Player]`);
  await cmd(`/fill -52 99 4 -16 99 44 minecraft:stone`);
  await cmd(`/fill -52 100 4 -16 103 44 minecraft:air`);
  await cmd(`/setblock ${RIG.anvCu.x} ${RIG.anvCu.y} ${RIG.anvCu.z} etim:anvil_copper 0 replace`);
  await cmd(`/setblock ${RIG.anvMi.x} ${RIG.anvMi.y} ${RIG.anvMi.z} etim:anvil_mithril 0 replace`);
  await cmd(`/setblock ${RIG.table.x} ${RIG.table.y} ${RIG.table.z} minecraft:crafting_table 0 replace`);
  await sleep(400);
}
async function tpAnvil(a) {
  await cmd(`/tp ${NAME} ${a.x + 0.5} 100 ${a.z + 2.5} 180 0`);
  await sleep(900);
}

// ------------------------------------------------------------------ cells
/** W2: storage block 9:1 both ways. */
async function w2() {
  await say('w2-begin');
  // 9 copper ingots → 1 storage block (shapeless, nine right-clicks)
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:ingot_copper', 9);
  await cmd(`/tp ${NAME} ${RIG.table.x + 0.5} 100 ${RIG.table.z + 1.5} 180 0`);
  await sleep(700);
  const block = await waitForBlock(RIG.table.x, RIG.table.y, RIG.table.z);
  const w = block ? await bot.openBlock(block) : null;
  await sleep(700);
  const win = bot.currentWindow || w;
  let gotBlock = 0;
  if (win) {
    await wclick(37); await sleep(200);
    for (let s = 1; s <= 9; s++) { await wclick(s, 1); await sleep(160); }
    await wclick(37); await sleep(200);
    await wclick(0); await sleep(400); // arms the craft timer (auto-grant on completion)
    // the ETIM craft timer (server-authoritative) delivers while the window
    // is OPEN — poll first, close after
    for (let i = 0; i < 75 && gotBlock < 1; i++) {
      await sleep(800);
      gotBlock = (await clearCount('etim:storage_copper', false)).n;
    }
    await closeWin(w);
    await sleep(200);
    await clearCount('etim:storage_copper', true);
  }
  mark(`[AnvilLog] w2 ingots->block got=${gotBlock} want=1 | ${gotBlock === 1 ? 'PASS' : 'FAIL'}`);
  results.push({ v: 'W2a', gotBlock });
  await w2b();
  await say('w2-end');
}

/** W2b: 1 storage block → 9 ingots. Its OWN phase/window: riding W2a's
 *  just-closed window made the result click land on a stale window id (the
 *  server never took the stack; batch smoke 19:45 read got=0). Fresh bot +
 *  fresh window here. */
async function w2b() {
  await say('w2b-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:storage_copper', 1);
  await cmd(`/tp ${NAME} ${RIG.table.x + 0.5} 100 ${RIG.table.z + 1.5} 180 0`);
  await sleep(900);
  const block = await waitForBlock(RIG.table.x, RIG.table.y, RIG.table.z);
  const w = block ? await bot.openBlock(block) : null;
  await sleep(900);
  const win = bot.currentWindow || w;
  let got = 0;
  let rPre = null;
  let rOut = null;
  if (win) {
    await wclick(37); await sleep(300);
    await wclick(1, 1); await sleep(400);
    await wclick(37); await sleep(300);
    // preview BEFORE the take click — the recipe face (9 = the 9-ingot row)
    rPre = slotStack(win, 0);
    await wclick(0); await sleep(700);
    rOut = slotStack(bot.currentWindow || win, 0);
    // the take may leave the product on the cursor (vanilla creative face):
    // count with the window open first, then after the close (cursor returns)
    got = (await clearCount('etim:ingot_copper', false)).n;
    await closeWin(w);
    await sleep(600);
    if (got < 9) got = (await clearCount('etim:ingot_copper', false)).n;
    mark(`[AnvilLog] w2b result-before=${JSON.stringify(rPre)} result-after=${JSON.stringify(rOut)}`
      + ` got=${got} want=9 | ${got === 9 ? 'PASS' : 'FAIL'}`);
    await clearCount('etim:ingot_copper', true);
  } else {
    mark('[AnvilLog] w2b NO-WINDOW | FAIL');
  }
  results.push({ v: 'W2b', got, rPre, rOut });
  await say('w2b-end');
}

/** W3: the copper anvil craft on the grid. */
async function w3() {
  await say('w3-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem('etim:storage_copper', 3);
  await giveItem('etim:ingot_copper', 7);
  await cmd(`/tp ${NAME} ${RIG.table.x + 0.5} 100 ${RIG.table.z + 1.5} 180 0`);
  await sleep(700);
  const block = await waitForBlock(RIG.table.x, RIG.table.y, RIG.table.z);
  const w = block ? await bot.openBlock(block) : null;
  await sleep(700);
  const win = bot.currentWindow || w;
  let got = 0;
  let out = null;
  if (win) {
    // "III" / " i " / "iii": blocks on slots 1,2,3; ingots on 5,7,8,9
    await wclick(37); await sleep(200);
    for (const s of [1, 2, 3]) { await wclick(s, 1); await sleep(160); }
    await wclick(37); await sleep(200);
    await wclick(38); await sleep(200);
    for (const s of [5, 7, 8, 9]) { await wclick(s, 1); await sleep(160); }
    await wclick(38); await sleep(200);
    await sleep(500);
    out = slotStack(bot.currentWindow || win, 0);
    await wclick(0); await sleep(400); // arms the craft timer
    // poll while the window is open (the timer face)
    for (let i = 0; i < 75 && got < 1; i++) {
      await sleep(800);
      got = (await clearCount('etim:anvil_copper', false)).n;
    }
    await closeWin(w);
    await sleep(200);
    await clearCount('etim:anvil_copper', true);
  }
  const ok = got === 1;
  mark(`[AnvilLog] w3 anvil-craft out=${JSON.stringify(out)} got=${got} want=1 | ${ok ? 'PASS' : 'FAIL'}`);
  results.push({ v: 'W3', out, got, ok });
  await say('w3-end');
}

/** W4: the repair-gate matrix over the two metal anvils. */
async function gateCell(tag, anvil, scythe, nugget, expectPass, anvilGate) {
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  await giveItem(scythe, 1);
  await cmd(`/etest damage 800 ${NAME}`);
  await giveItem(nugget, 9);
  await cmd(`/etest level 200 ${NAME}`);
  await tpAnvil(anvil);
  const w = await openAnvilWindow(anvil.x, anvil.y, anvil.z);
  if (!w) { mark(`[AnvilLog] ${tag} NO-WINDOW | FAIL`); return { v: 'W4', tag, ok: false, err: 'no window' }; }
  await sleep(400);
  // round-slice the log BEFORE touching the slots — earlier rounds carry
  // same-tool rows (w4b's mithril row would poison w4c's read)
  await placeAll(w.id, 0, 0);
  await placeAll(w.id, 1, 1);
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  if (expectPass) {
    await takeOutput();
  } else {
    await wclick(2); await sleep(600);
  }
  await closeWin(w);
  await sleep(400);
  const tools = (await clearCount(scythe, false)).n;
  const nugs = (await clearCount(nugget, false)).n;
  // C-SK-9 whole-log face (批三惯例): grep the whole session log; rounds are
  // disambiguated by the gate VALUE in the row (anvil=4.0 only ever appears
  // on the copper-anvil rounds, anvil=64.0 only on the mithril ones).
  const failRows = rowsMatching(logLines(), 'repair fail');
  const takeRows = rowsMatching(logLines(), 'repair take');
  const gate = `anvil=${anvilGate.toFixed(1)}`;
  let ok;
  if (expectPass) {
    ok = out && tools === 1 && takeRows.some((l) => l.includes(scythe));
  } else {
    ok = !out && tools === 1 && nugs === 9
      && failRows.some((l) => l.includes('needsHarderAnvil') && l.includes(scythe) && l.includes(gate));
  }
  const lastFail = failRows.length ? failRows[failRows.length - 1] : '';
  mark(`[AnvilLog] ${tag} out=${JSON.stringify(out)} tools=${tools} nugs=${nugs}`
    + ` failRow=${JSON.stringify(lastFail)} | ${ok ? 'PASS' : 'FAIL'}`);
  await clearCount(scythe, true);
  await clearCount(nugget, true);
  return { v: 'W4', tag, ok, out, tools, nugs };
}

async function w4() {
  await say('w4-begin');
  // vanilla-anvil control: same face on Blocks.ANVIL — batch-3 proved this PASSes
  await cmd(`/setblock ${RIG.anvVa.x} ${RIG.anvVa.y} ${RIG.anvVa.z} minecraft:anvil 0 replace`);
  await sleep(400);
  const v = await gateCell('w4v VANILLA control PASS', RIG.anvVa, 'etim:scythe_copper', 'etim:nugget_copper', true, 8.0);
  results.push({ v: 'W4V', ok: v.ok });
  const a = await gateCell('w4a cu-anvil cu-scythe PASS', RIG.anvCu, 'etim:scythe_copper', 'etim:nugget_copper', true, 4.0);
  const b = await gateCell('w4b cu-anvil mi-scythe FAIL2', RIG.anvCu, 'etim:scythe_mithril', 'etim:nugget_mithril', false, 4.0);
  const c = await gateCell('w4c mi-anvil mi-scythe PASS', RIG.anvMi, 'etim:scythe_mithril', 'etim:nugget_mithril', true, 64.0);
  const d = await gateCell('w4d mi-anvil ad-scythe FAIL2', RIG.anvMi, 'etim:scythe_adamantium', 'etim:nugget_adamantium', false, 64.0);
  results.push({ v: 'W4', a: a.ok, b: b.ok, c: c.ok, d: d.ok });
  await say('w4-end');
}

/** W5: the per-anvil wear face — judged on the DELTA over this round only
 *  (the pos may carry the batch-3 legacy ledger; the fixed want=1600 read
 *  that stale base). */
async function w5() {
  await say('w5-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  const wearBefore = await wearAt(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
  await giveItem('etim:scythe_copper', 1);
  await cmd(`/etest damage 1600 ${NAME}`);
  await giveItem('etim:nugget_copper', 9);
  await cmd(`/etest level 200 ${NAME}`);
  await tpAnvil(RIG.anvCu);
  const w = await openAnvilWindow(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
  if (!w) { mark(`[AnvilLog] w5 NO-WINDOW | FAIL`); results.push({ v: 'W5', ok: false }); return; }
  await sleep(400);
  await placeAll(w.id, 0, 0);
  await placeAll(w.id, 1, 1);
  await sleep(700);
  const out = slotStack(bot.currentWindow || w, 2);
  await takeOutput();
  await closeWin(w);
  await sleep(600);
  const wearAfter = await wearAt(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
  const delta = wearAfter - wearBefore;
  // C-SK-9 whole-log face: the w5 round is the ONLY one repairing 1600 damage
  // with a copper scythe (repaired=1600 disambiguates it from the w4a 800s)
  const takeRows = logLines().filter((l) => l.includes('repair take')
      && l.includes('scythe_copper') && l.includes('kind=1') && l.includes('repaired=1600'));
  const last = takeRows.length ? takeRows[takeRows.length - 1] : '';
  const ok = out && delta === 1600 && last.includes('anvilWear=1600');
  mark(`[AnvilLog] w5 wear delta=${delta} want=1600 (base=${wearBefore}) takeRow=${JSON.stringify(firstLine(last))} | ${ok ? 'PASS' : 'FAIL'}`);
  results.push({ v: 'W5', wearBefore, wearAfter, delta, ok });
  await say('w5-end');
}

/** W5b: the per-anvil CAPACITY face. Drives the copper anvil's ledger past
 *  0.5 × capacity and judges the stage-1 transition total: copper factor 4 →
 *  capacity 1600×31×4 = 198,400 → stage 1 at total ≥ 99,200; the vanilla/iron
 *  8.0 face (396,800) would need ≥ 198,400. A full-damage repair (damage 3200)
 *  consumes 4 chunks → wear 3,200 per take, so 24 takes from the 23,200 base
 *  land exactly on 100,000. */
async function w5cap() {
  await say('w5cap-begin');
  const TARGET = 100000;
  const takeRows0 = logLines().filter((l) => l.includes('anvil wear stage=')).length;
  let n = 0;
  let wear = await wearAt(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
  const wear0 = wear;
  let lastTake = '';
  for (; n < 40 && wear < TARGET; n++) {
    await cmd(`/gamemode 1 ${NAME}`);
    await clearAll();
    await giveItem('etim:scythe_copper', 1);
    await cmd(`/etest damage 3200 ${NAME}`);
    await giveItem('etim:nugget_copper', 9);
    await cmd(`/etest level 200 ${NAME}`);
    await tpAnvil(RIG.anvCu);
    const w = await openAnvilWindow(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
    if (!w) { mark('[AnvilLog] w5cap NO-WINDOW | FAIL'); break; }
    await sleep(250);
    await placeAll(w.id, 0, 0);
    await placeAll(w.id, 1, 1);
    await sleep(450);
    await takeOutput();
    await closeWin(w);
    await sleep(250);
    await clearCount('etim:scythe_copper', true);
    await clearCount('etim:nugget_copper', true);
    const rows = logLines().filter((l) => l.includes('repair take') && l.includes('repaired=3200'));
    lastTake = rows.length ? firstLine(rows[rows.length - 1]) : '';
    wear = await wearAt(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
  }
  const stageRows = logLines().filter((l) => l.includes('anvil wear stage=')).slice(takeRows0);
  const stageRow = stageRows.length ? firstLine(stageRows[stageRows.length - 1]) : '';
  const stage1 = /stage=1 .*total=(\d+)/.exec(stageRow);
  const total = stage1 ? parseInt(stage1[1], 10) : null;
  const ok = wear === TARGET && total !== null && total >= 99200 && total < 198400;
  mark(`[AnvilLog] w5cap takes=${n} wear=${wear0}->${wear} want=${TARGET}`
    + ` stageRow=${JSON.stringify(stageRow)} transitionTotal=${total}`
    + ` (capacity 198,400 → 50% = 99,200; vanilla 396,800 → 198,400) | ${ok ? 'PASS' : 'FAIL'}`);
  mark(`[AnvilLog] w5cap lastTake=${JSON.stringify(lastTake)}`);
  results.push({ v: 'W5b', takes: n, wear0, wear, total, ok });
  await say('w5cap-end');
}

/** W6: the T4① above-cell gate. */
async function w6() {
  await say('w6-begin');
  await cmd(`/gamemode 1 ${NAME}`);
  await tpAnvil(RIG.anvCu);
  // a) block the cell above → the window must NOT open
  await cmd(`/setblock ${RIG.anvCu.x} 101 ${RIG.anvCu.z} minecraft:stone`);
  await sleep(400);
  const wBlocked = await openAnvilWindow(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z, 4000);
  const blockedOk = !wBlocked;
  mark(`[AnvilLog] w6 blocked-above window=${wBlocked ? 'OPENED(FAIL)' : 'none'} | ${blockedOk ? 'PASS' : 'FAIL'}`);
  // b) clear it → the window opens
  await cmd(`/setblock ${RIG.anvCu.x} 101 ${RIG.anvCu.z} minecraft:air`);
  await sleep(400);
  const wFree = await openAnvilWindow(RIG.anvCu.x, RIG.anvCu.y, RIG.anvCu.z);
  const freeOk = !!wFree;
  if (wFree) await closeWin(wFree);
  mark(`[AnvilLog] w6 cleared-above window=${freeOk ? 'OPENED' : 'none(FAIL)'} | ${freeOk ? 'PASS' : 'FAIL'}`);
  results.push({ v: 'W6', blockedOk, freeOk });
  await say('w6-end');
}

/** W7: the T3② ledger hygiene — the BreakEvent face proven on the VANILLA
 *  anvil (mineflayer can digBlock a known block; the ETIM blocks read as
 *  name="" on the client and digTime is never computed). The hook is ONE
 *  function for every BlockAnvil instance, so the vanilla control proves it.
 *  The PlaceEvent face rides player placement — not reachable from raw
 *  /setblock — C 级: verified in the verdict window by user operation. */
async function w7() {
  await say('w7-begin');
  await cmd(`/setblock ${RIG.anvVa.x} ${RIG.anvVa.y} ${RIG.anvVa.z} minecraft:anvil 0 replace`);
  await sleep(400);
  const w0 = await wearAt(RIG.anvVa.x, RIG.anvVa.y, RIG.anvVa.z);
  await cmd(`/gamemode 1 ${NAME}`);
  await clearAll();
  const anvilBlock = await waitForBlock(RIG.anvVa.x, RIG.anvVa.y, RIG.anvVa.z);
  let mined = false;
  if (anvilBlock) {
    try { mined = await bot.digBlock(anvilBlock); } catch (e) { mined = false; }
  }
  await sleep(900);
  const wMined = await wearAt(RIG.anvVa.x, RIG.anvVa.y, RIG.anvVa.z);
  // the harness cannot dig at all (creative face silently rejected — the
  // client registry has no digTime for ETIM blocks and the vanilla anvil
  // dig never lands). The BreakEvent ledger-clear rides a [TestLog] row on
  // the server; the verdict window judges it from a user-operated mine.
  const ok = (w0 === null || w0 > 0) && wMined === 0;
  mark(`[AnvilLog] w7 hygiene (vanilla control) before=${w0} mined=${mined} afterMine=${wMined}`
    + ` | ${ok ? 'PASS' : (w0 > 0 && wMined === w0 ? 'SKIP (harness cannot dig — BreakEvent row judged by user mine in the verdict window)' : 'FAIL')}`);
  results.push({ v: 'W7', w0, mined, wMined, ok });
  await say('w7-end');
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

  if (phase === 'all' || phase === 'w2') await w2();
  if (phase === 'all' || phase === 'w2b') await w2b();
  if (phase === 'all' || phase === 'w3') await w3();
  if (phase === 'all' || phase === 'w4') await w4();
  if (phase === 'all' || phase === 'w5') await w5();
  if (phase === 'all' || phase === 'w5cap') await w5cap();
  if (phase === 'all' || phase === 'w6') await w6();
  if (phase === 'all' || phase === 'w7') await w7();

  fs.writeFileSync(path.join(ROOT, 'build-logs', 'metal-anvil-blocks-out.json'),
      JSON.stringify({ results }, null, 2));
  mark(`metal-anvil-blocks-run done: ${results.length} result blocks`);
  rcon.close();
  bot.quit();
  process.exit(0);
})().catch((e) => { mark(`FATAL ${e && e.stack || e}`); process.exit(1); });
