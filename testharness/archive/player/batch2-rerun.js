#!/usr/bin/env node
/**
 * batch2-rerun.js — audit20 batch-2 Q re-run (session 7 harness), B2-1 fix.
 *
 * Legs (the five blocked in batch2-qs-verdict.md §②):
 *   Q-2 charged restore : /etest debt 10 -> /xp 1000 -> iron pick FINE take
 *   Q-3 charged ladder  : /xp 10000 -> iron pick EXCELLENT take (2 cycles)
 *   Q-4 shears top      : 2-iron shears, 4 cycles -> MASTERWORK
 *   Q-4 bow top         : stick+string bow, 1 cycle -> FINE
 *   Q-5 preview + Q-7   : /xp 100 -> wood pick FINE, result-slot NBT read at
 *                         t0 and t+1.5s (>=2 ticks), then take (-50 XP)
 *
 * Judgment source: run/obfuscated/logs/latest.log [CraftingLog] lines.
 * The /say [RERUN] markers bracket each leg for log grepping.
 *
 * Usage: node batch2-rerun.js
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const Vec3 = require('vec3').Vec3;
const fs = require('fs');
const path = require('path');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOT = process.env.Q_BOT || 'ETIM_Harn04';
const TABLE = { x: -39, y: 79, z: 240 };
const STAND = { x: -39.5, y: 79, z: 242.5 };
const LOG_PATH = path.resolve(__dirname, '../../run/obfuscated/logs/latest.log');

let msgs = [];
function attach(bot) {
  bot.on('message', (m) => {
    const s = m.toString();
    msgs.push(s);
    console.log('[chat]', s);
  });
}

async function cmd(bot, c, wait = 800) {
  console.log('[cmd]', c);
  bot.chat(c.startsWith('/') ? c : '/' + c);
  await sleep(wait);
}

async function feed(bot) {
  await cmd(bot, '/etest food 6 6', 500);
}

async function state(bot, tag) {
  msgs = [];
  bot.chat('/state');
  await sleep(1500);
  const line = msgs.find((s) => s.includes('total=')) || msgs.join(' | ');
  console.log('[state:' + tag + ']', line);
  return line;
}

/** Last picker period (ticks) from the server log — the take uses this timer. */
function lastPeriod() {
  try {
    const lines = fs.readFileSync(LOG_PATH, 'utf8').split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = /\[CraftingLog\].*quality cycle .*period=(\d+)/.exec(lines[i]);
      if (m) return Number(m[1]);
    }
  } catch (e) { /* log not readable yet */ }
  return 0;
}

/** Wait the real craft period (ticks*50ms) and keep the hunger gate open. */
async function waitCraft(bot, marginMs = 5000) {
  let p = 0;
  for (let i = 0; i < 10 && !p; i++) {
    p = lastPeriod();
    if (!p) await sleep(200);
  }
  if (!p) p = 600; // fallback 30 s
  const ms = Math.max(p, 200) * 50 + marginMs;
  console.log('[wait] period=' + p + ' ticks -> ' + Math.round(ms / 1000) + 's');
  const start = Date.now();
  while (Date.now() - start < ms) {
    const remain = ms - (Date.now() - start);
    await sleep(Math.min(20000, Math.max(remain, 1000)));
    if (Date.now() - start < ms) await feed(bot);
  }
}

async function openTable(bot) {
  const block = bot.blockAt(new Vec3(TABLE.x, TABLE.y, TABLE.z));
  if (!block || block.name !== 'crafting_table') throw new Error('no crafting_table at ' + JSON.stringify(TABLE) + ' got ' + (block && block.name));
  const winP = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('windowOpen timeout')), 6000);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  await bot.activateBlock(block);
  const win = await winP;
  await sleep(600);
  console.log('[window] type=' + win.type + ' slots=' + Object.keys(win.slots).length);
  return win;
}

async function closeTable(bot) {
  try { if (bot.currentWindow) await bot.closeWindow(bot.currentWindow); } catch (e) { console.log('[close]', e.message); }
  await sleep(500);
}

function gridSet() { return new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]); }

async function putOne(bot, itemId, gridSlots) {
  const win = bot.currentWindow;
  const grid = gridSet();
  let src = -1;
  for (const [k, s] of Object.entries(win.slots)) {
    const i = Number(k);
    if (s && s.type === itemId && i >= 10 && !grid.has(i) && s.count >= gridSlots.length) { src = i; break; }
  }
  if (src < 0) throw new Error('no source stack for item type ' + itemId + ' slots=' + gridSlots.length);
  await bot.clickWindow(src, 0, 0).catch((e) => console.log('[click-src]', e.message));
  await sleep(250);
  for (const g of gridSlots) {
    await bot.clickWindow(g, 1, 0).catch((e) => console.log('[click-grid]', e.message));
    await sleep(200);
  }
  await bot.clickWindow(src, 0, 0).catch((e) => console.log('[click-src2]', e.message));
  await sleep(250);
  console.log('[put] id=' + itemId + ' src=' + src + ' -> grid=' + JSON.stringify(gridSlots));
}

function qualityOf(stack) {
  if (!stack || !stack.nbt || !stack.nbt.etim) return null;
  const etim = stack.nbt.etim;
  const inner = etim.value && etim.value.quality ? etim.value.quality : etim.quality;
  if (!inner) return null;
  return inner.value !== undefined ? inner.value : inner;
}

function inv(bot, itemId) {
  const list = bot.inventory.items().filter((i) => i.type === itemId);
  const count = list.reduce((a, i) => a + i.count, 0);
  const first = list[0];
  console.log('[inv] id=' + itemId + ' count=' + count
    + ' quality=' + qualityOf(first)
    + ' maxDur=' + (first && first.maxDurability)
    + ' dmg=' + (first && first.durabilityUsed)
    + ' nbt=' + (first && first.nbt ? JSON.stringify(first.nbt) : 'none'));
  return { count, quality: qualityOf(first), nbt: first && first.nbt };
}

function readResult(bot, tag) {
  const w = bot.currentWindow;
  if (!w) { console.log('[Q5-read:' + tag + '] no-window'); return 'no-window'; }
  const s = w.slots[0];
  const q = qualityOf(s);
  const line = 'item=' + (s && s.name) + ' quality=' + q
    + ' nbt=' + (s && s.nbt ? JSON.stringify(s.nbt) : 'none');
  console.log('[Q5-read:' + tag + '] ' + line);
  return line;
}

async function rclick(bot) {
  await bot.clickWindow(0, 1, 0).catch((e) => console.log('[rclick-reject]', e.message));
  await sleep(500);
  console.log('[click] result right (btn=1)');
}

async function lclick(bot) {
  await bot.clickWindow(0, 0, 0).catch((e) => console.log('[lclick-reject]', e.message));
  await sleep(500);
  console.log('[click] result left (btn=0)');
}

function ids(bot) {
  return {
    planks: bot.registry.itemsByName['planks'].id,
    iron: bot.registry.itemsByName['iron_ingot'].id,
    stick: bot.registry.itemsByName['stick'].id,
    string: bot.registry.itemsByName['string'].id,
    pick: bot.registry.itemsByName['iron_pickaxe'].id,
    woodPick: bot.registry.itemsByName['wooden_pickaxe'].id,
    shears: bot.registry.itemsByName['shears'].id,
    bow: bot.registry.itemsByName['bow'].id,
  };
}

async function reset(bot) {
  await closeTable(bot);
  await cmd(bot, '/clear', 400);
  await cmd(bot, '/kill @e[type=item,r=8]', 400);
}

const GIVE_IRON = ['/give ' + BOT + ' minecraft:iron_ingot 16', '/give ' + BOT + ' minecraft:iron_ingot 16', '/give ' + BOT + ' minecraft:iron_ingot 16',
  '/give ' + BOT + ' minecraft:stick 8', '/give ' + BOT + ' minecraft:stick 8'];
const GIVE_WOOD = ['/give ' + BOT + ' minecraft:planks 16', '/give ' + BOT + ' minecraft:planks 16', '/give ' + BOT + ' minecraft:planks 16',
  '/give ' + BOT + ' minecraft:stick 8', '/give ' + BOT + ' minecraft:stick 8'];
const GIVE_BOW = ['/give ' + BOT + ' minecraft:stick 8', '/give ' + BOT + ' minecraft:stick 8',
  '/give ' + BOT + ' minecraft:string 8', '/give ' + BOT + ' minecraft:string 8'];

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: BOT });
  attach(bot);
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(1500);
  const id = ids(bot);
  console.log('[bot] login dim=' + bot.game.dimension + ' pos=' + bot.entity.position);

  await cmd(bot, '/gamemode survival', 600);
  await cmd(bot, '/tp ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 1500);
  await cmd(bot, '/setblock ' + TABLE.x + ' ' + TABLE.y + ' ' + TABLE.z + ' crafting_table', 800);
  await cmd(bot, '/effect ' + BOT + ' minecraft:resistance 9999 4 true', 500);
  await cmd(bot, '/xp 0', 500);
  await cmd(bot, '/clear', 500);

  // ---- Q-2: charged restore (debt 10 -> positive pool -> FINE) ----
  await reset(bot);
  await cmd(bot, '/say [RERUN] Q2-fine start', 300);
  await cmd(bot, '/etest debt 10', 700);
  await cmd(bot, '/xp 1000', 700);
  for (const c of GIVE_IRON) await cmd(bot, c, 600);
  await openTable(bot);
  await putOne(bot, id.iron, [1, 2, 3]);
  await putOne(bot, id.stick, [5, 8]);
  await sleep(1200);
  await rclick(bot); // FINE (max affordable at pool 1000 = 980)
  await feed(bot);
  await lclick(bot);
  await waitCraft(bot);
  inv(bot, id.pick);
  await state(bot, 'Q2-fine');
  await cmd(bot, '/say [RERUN] Q2-fine end', 300);

  // ---- Q-3: single cycle -> FINE (round-2 criterion: first cycle must persist) ----
  await reset(bot);
  await cmd(bot, '/say [RERUN] Q3-single-fine start', 300);
  await cmd(bot, '/xp 10000', 700);
  for (const c of GIVE_IRON) await cmd(bot, c, 600);
  await openTable(bot);
  await putOne(bot, id.iron, [1, 2, 3]);
  await putOne(bot, id.stick, [5, 8]);
  await sleep(1200);
  await rclick(bot); // FINE (single cycle; must survive the driver tick)
  await feed(bot);
  await lclick(bot);
  await waitCraft(bot);
  inv(bot, id.pick);
  await state(bot, 'Q3-single-fine');
  await cmd(bot, '/say [RERUN] Q3-single-fine end', 300);

  // ---- Q-4 shears: 2 iron (slots 2,4), 4 cycles -> MASTERWORK ----
  await reset(bot);
  await cmd(bot, '/say [RERUN] Q4-shears start', 300);
  await cmd(bot, '/xp 100000', 700);
  for (const c of GIVE_IRON) await cmd(bot, c, 600);
  await openTable(bot);
  await putOne(bot, id.iron, [2, 4]);
  await sleep(1200);
  for (let i = 0; i < 4; i++) await rclick(bot);
  await feed(bot);
  await lclick(bot);
  await waitCraft(bot);
  inv(bot, id.shears);
  await state(bot, 'Q4-shears');
  await cmd(bot, '/say [RERUN] Q4-shears end', 300);

  // ---- Q-4 bow: sticks 2,4,8 + string 3,6,9, 1 cycle -> FINE ----
  await reset(bot);
  await cmd(bot, '/say [RERUN] Q4-bow start', 300);
  await cmd(bot, '/xp 100000', 700);
  for (const c of GIVE_BOW) await cmd(bot, c, 600);
  await openTable(bot);
  await putOne(bot, id.stick, [2, 4, 8]);
  await putOne(bot, id.string, [3, 6, 9]);
  await sleep(1200);
  await rclick(bot); // FINE (bow max)
  await feed(bot);
  await lclick(bot);
  await waitCraft(bot);
  inv(bot, id.bow);
  await state(bot, 'Q4-bow');
  await cmd(bot, '/say [RERUN] Q4-bow end', 300);

  // ---- Q-5 preview survival + Q-7 charge (wood pick FINE 50) ----
  await reset(bot);
  await cmd(bot, '/say [RERUN] Q5Q7-wood start', 300);
  await cmd(bot, '/xp 100', 700);
  for (const c of GIVE_WOOD) await cmd(bot, c, 600);
  await openTable(bot);
  await putOne(bot, id.planks, [1, 2, 3]);
  await putOne(bot, id.stick, [5, 8]);
  await sleep(1200);
  await rclick(bot); // FINE
  readResult(bot, 't0');
  await sleep(1500); // > 2 ticks at 20 TPS
  readResult(bot, 't+1.5s');
  await feed(bot);
  await lclick(bot);
  await waitCraft(bot);
  inv(bot, id.woodPick);
  await state(bot, 'Q5Q7-pool50');
  await cmd(bot, '/xp 100', 800);
  await state(bot, 'Q7-reset');
  await cmd(bot, '/say [RERUN] Q5Q7-wood end', 300);

  console.log('==== DONE ====');
  try { bot.quit(); } catch (e) { /* ignore */ }
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('batch2-rerun', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
