#!/usr/bin/env node
/**
 * batch2-q.js — audit20 second batch Q window driver (session 7 harness), v2.
 *
 * v2: the first run (11:38 UTC) proved the log shapes but every craft froze on
 * the hunger gate (satiation 0 -> ETIMHunger.hasFoodEnergy false) and the iron
 * pick period is 20-37 s (difficulty 2450, quality multipliers included), so
 * each scenario now feeds /etest food 6 6 right before the take click and waits
 * the real period. mineflayer's transaction check rejects the result-slot
 * clicks (the server rewrites the preview stack on every quality cycle); the
 * click still reaches the server, so the rejection is caught.
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const Vec3 = require('vec3').Vec3;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOT = process.env.Q_BOT || 'ETIM_Harn04';
const TABLE = { x: -39, y: 79, z: 240 };
const STAND = { x: -39.5, y: 79, z: 242.5 };

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

function inv(bot, itemId) {
  const list = bot.inventory.items().filter((i) => i.type === itemId);
  const count = list.reduce((a, i) => a + i.count, 0);
  const first = list[0];
  console.log('[inv] id=' + itemId + ' count=' + count + ' nbt=' + (first && first.nbt ? JSON.stringify(first.nbt) : 'none'));
  return { count, nbt: first && first.nbt };
}

async function rclick(bot) {
  await bot.clickWindow(0, 1, 0).catch((e) => console.log('[rclick-reject][expected preview rewrite]', e.message));
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
    pick: bot.registry.itemsByName['iron_pickaxe'].id,
    woodPick: bot.registry.itemsByName['wooden_pickaxe'].id,
  };
}

async function reset(bot) {
  await closeTable(bot);
  await cmd(bot, '/clear', 400);
  await cmd(bot, '/kill @e[type=item,r=8]', 400);
}

/**
 * pre: chat commands (xp/debt/gives). place: [{id, slots}]. cycles: right-clicks.
 * waitMs: real period + margin. Reports inventory count + /state.
 */
async function scenario(bot, tag, pre, place, cycles, waitMs, ivId) {
  console.log('==== ' + tag + ' ====');
  await reset(bot);
  for (const c of pre) await cmd(bot, c, 700);
  await openTable(bot);
  for (const p of place) await putOne(bot, p.id, p.slots);
  await sleep(1200); // recomputePeriod / result settle
  for (let i = 0; i < cycles; i++) await rclick(bot);
  await feed(bot);          // hunger gate: feed immediately before the take click
  await lclick(bot);
  await sleep(waitMs);
  inv(bot, ivId);
  await state(bot, tag);
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: BOT });
  attach(bot);
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(1500);
  const id = ids(bot);

  await cmd(bot, '/gamemode survival', 600);
  await cmd(bot, '/tp ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 1500);
  await cmd(bot, '/setblock ' + TABLE.x + ' ' + TABLE.y + ' ' + TABLE.z + ' crafting_table', 800);
  await cmd(bot, '/effect ' + BOT + ' minecraft:resistance 9999 4 true', 500);
  await cmd(bot, '/xp 0', 500);
  await cmd(bot, '/clear', 500);

  const IRON = [{ id: id.iron, slots: [1, 2, 3] }, { id: id.stick, slots: [5, 8] }];
  const WOOD = [{ id: id.planks, slots: [1, 2, 3] }, { id: id.stick, slots: [5, 8] }];
  const GIVE_IRON = ['/give ' + BOT + ' minecraft:iron_ingot 16', '/give ' + BOT + ' minecraft:iron_ingot 16', '/give ' + BOT + ' minecraft:iron_ingot 16',
    '/give ' + BOT + ' minecraft:stick 8', '/give ' + BOT + ' minecraft:stick 8'];
  const GIVE_WOOD = ['/give ' + BOT + ' minecraft:planks 16', '/give ' + BOT + ' minecraft:planks 16', '/give ' + BOT + ' minecraft:planks 16',
    '/give ' + BOT + ' minecraft:stick 8', '/give ' + BOT + ' minecraft:stick 8'];

  // ---------------- Q-1 sticks (non-carrier) ----------------
  console.log('==== Q-1 sticks ====');
  await reset(bot);
  await cmd(bot, '/xp 0', 600);
  await cmd(bot, '/give ' + BOT + ' minecraft:planks 4', 800);
  await openTable(bot);
  await putOne(bot, id.planks, [1, 4]);
  await sleep(1200);
  await rclick(bot);      // must NOT log "quality cycle" (sticks max=min=AVERAGE)
  await feed(bot);
  await lclick(bot);
  await sleep(12000);
  inv(bot, id.stick);
  await state(bot, 'Q1');

  // ---------------- Q-2 debt 10 -> POOR free ----------------
  await scenario(bot, 'Q2-debt10', ['/etest debt 10'].concat(GIVE_IRON), IRON, 0, 45000, id.pick);

  // ---------------- Q-2b debt 20 -> WRETCHED free ----------------
  await scenario(bot, 'Q2-debt20', ['/etest debt 20'].concat(GIVE_IRON), IRON, 0, 50000, id.pick);

  // ---------------- Q-2c positive pool -> FINE charged (980/1000) ----------------
  await scenario(bot, 'Q2-fine', ['/xp 1000'].concat(GIVE_IRON), IRON, 1, 50000, id.pick);

  // ---------------- Q-3 budget face: pool 100 -> no affordable paid rung ----------------
  await scenario(bot, 'Q3-budget100', ['/xp 100'].concat(GIVE_IRON), IRON, 0, 45000, id.pick);

  // ---------------- Q-3b cycle-only to MASTERWORK (cost lines; craft period is ~3 min) ----------------
  await scenario(bot, 'Q3-masterwork-cycle', ['/xp 10000'].concat(GIVE_IRON), IRON, 4, 6000, id.pick);

  // ---------------- Q-7 absolute /xp + wooden-pick charge (50) ----------------
  console.log('==== Q-7 xp semantics ====');
  await reset(bot);
  await cmd(bot, '/xp 100', 800);
  const s1 = await state(bot, 'Q7-100');
  await cmd(bot, '/xp 5L', 800);
  const s2 = await state(bot, 'Q7-5L');
  await cmd(bot, '/xp 100', 800);
  const s3 = await state(bot, 'Q7-100-again');
  console.log('[Q7] s1=' + s1 + ' | s2=' + s2 + ' | s3=' + s3);
  await scenario(bot, 'Q7-charge-wood', ['/xp 100'].concat(GIVE_WOOD), WOOD, 1, 20000, id.woodPick);
  await cmd(bot, '/xp 100', 800);
  const s4 = await state(bot, 'Q7-reset');

  // ---------------- Q-6 level-modifier lines ----------------
  console.log('==== Q-6 melee level-modifier ====');
  await closeTable(bot);
  await feed(bot);
  await cmd(bot, '/etest debt 10', 800);
  await cmd(bot, '/summon Zombie ' + (STAND.x + 1) + ' ' + STAND.y + ' ' + STAND.z + ' {CustomName:"Q6A"}', 1200);
  let z = bot.nearestEntity((e) => e && e.name === 'zombie');
  if (!z) { await sleep(1500); z = bot.nearestEntity((e) => e && e.name === 'zombie'); }
  if (z) {
    await bot.lookAt(z.position.offset(0, 1.4, 0), true);
    await sleep(300);
    await bot.attack(z);
    await sleep(800);
    console.log('[Q6] attacked (debt)');
  } else { console.log('[Q6] NO ZOMBIE (debt)'); }

  await cmd(bot, '/xp 10L', 800);
  await cmd(bot, '/summon Zombie ' + (STAND.x - 1) + ' ' + STAND.y + ' ' + STAND.z + ' {CustomName:"Q6B"}', 1200);
  let z2 = bot.nearestEntity((e) => e && e.name === 'zombie');
  if (!z2) { await sleep(1500); z2 = bot.nearestEntity((e) => e && e.name === 'zombie'); }
  if (z2) {
    await bot.lookAt(z2.position.offset(0, 1.4, 0), true);
    await sleep(300);
    await bot.attack(z2);
    await sleep(800);
    console.log('[Q6] attacked (positive)');
  } else { console.log('[Q6] NO ZOMBIE (positive)'); }

  await state(bot, 'Q6');

  console.log('==== DONE ====');
  try { bot.quit(); } catch (e) { /* ignore */ }
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('batch2-q', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
