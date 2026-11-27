#!/usr/bin/env node
/**
 * f18-reg-fifth — B-70UB 回归网第五轮（剩余三条可窗口化通道）。
 *
 *   W1 ArrowLog   拉弓 1.4 s 后松手 → release charge / arrow spawn 行
 *   W2 EnchLog    生成带装备的僵尸 → nonTable src=mob tension= 行
 *   W3 RepairLog  受伤骷髅 + 掉落骨头 → pickup src=skeleton 行
 *
 * 判据只认服务端日志；不操作客户端。
 */
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-reg5-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 0,
    difficulty: 2,
    tp: [4.5, 130, 6.5],
    rules: {
      doMobSpawning: false, doTileDrops: true, keepInventory: true, doMobLoot: true,
      naturalRegeneration: false, doDaylightCycle: false, doFireTick: false, doWeatherCycle: false,
    },
    fill: ['time set 1000', 'fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 133 15 minecraft:air'],
  },
  cfg: [
    'mobs:arrowDebugLog',
    'mobs:mobDebugLog',
    'enchant:enchantPoolR196',
    'enchant:enchantDebugLog',
  ],
});
const { cmd, mark, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ARROW_RELEASE_RE = /\[ArrowLog\] release charge=(\d+) divisor=\S+ velocity=([\d.]+)/;
const ARROW_SPAWN_RE = /\[ArrowLog\] arrow spawn shooter=(\S+)/;
const NON_TABLE_RE = /\[EnchLog\] nonTable src=mob tension=([\d.]+)/;
const REPAIR_PICKUP_RE = /\[RepairLog\] pickup src=(\S+) heal=([\d.]+) hp=([\d.]+) cooldown=(\d+) item=(\S+)/;

const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

async function main() {
  h.stampPin();
  await h.boot(`f18-${RUN}-b1`);
  await h.join();

  const res = { w1: false, w2: false, w3: false };

  // ---- W1: ArrowLog (bow release + arrow spawn) ----
  await cmd(`give ${A} minecraft:arrow 16`, 300);
  await cmd(`etest hold minecraft:bow ${A}`, 400);
  let from = mark();
  try {
    h.bot.activateItem();
    await sleep(1400);
    h.bot.deactivateItem();
  } catch (e) {
    console.log('[W1]', JSON.stringify({ error: String(e && e.message) }));
  }
  await sleep(600);
  const releases = await waitRow(ARROW_RELEASE_RE, from, 6000);
  const spawns = await waitRow(ARROW_SPAWN_RE, from, 6000);
  const rel = lastOf(releases);
  const sp = lastOf(spawns);
  res.w1 = !!rel && +rel[1] >= 5;
  console.log('[W1]', JSON.stringify({
    release: rel && { charge: +rel[1], velocity: +rel[2] },
    spawn: sp && sp[1], rows: releases.length + spawns.length, pass: res.w1,
  }));

  // ---- W2: EnchLog (mob equipment pool row) ----
  from = mark();
  await cmd('summon minecraft:zombie 6.5 130 2.5 {PersistenceRequired:1b,HandItems:[{id:"minecraft:iron_sword",Count:1b},{}]}', 500);
  await sleep(1200);
  const rows2 = await waitRow(NON_TABLE_RE, from, 8000);
  const nt = lastOf(rows2);
  res.w2 = !!nt && parseFloat(nt[1]) >= 0;
  console.log('[W2]', JSON.stringify({ row: nt && { tension: +nt[1] }, rows: rows2.length, pass: res.w2 }));

  // ---- W3: RepairLog (skeleton picks up a bone while hurt) ----
  await cmd('kill @e[type=minecraft:zombie]', 300);
  from = mark();
  await cmd('summon minecraft:skeleton 9.5 130 2.5 ' +
    '{PersistenceRequired:1b,Health:6f,Attributes:[{Name:"generic.maxHealth",Base:20}],' +
    'HandItems:[{id:"minecraft:bow",Count:1b},{}]}', 500);
  await cmd('summon minecraft:item 9.5 130.5 2.5 {Item:{id:"minecraft:bone",Count:1b},PickupDelay:0s,Age:0s}', 400);
  // Restore some health each second is off; the AI needs hp < max at shouldExecute.
  let picks = [];
  for (let i = 0; i < 25 && picks.length === 0; i++) {
    await sleep(1000);
    picks = await waitRow(REPAIR_PICKUP_RE, from, 1);
  }
  if (!picks.length) picks = await waitRow(REPAIR_PICKUP_RE, from, 1500);
  const pk = lastOf(picks);
  res.w3 = !!pk && pk[1] === 'skeleton' && pk[5].indexOf('bone') >= 0;
  console.log('[W3]', JSON.stringify({
    row: pk && { src: pk[1], heal: +pk[2], hp: +pk[3], item: pk[5] }, rows: picks.length, pass: res.w3,
    ailines: logLines().filter((s) => s.indexOf('[AILog] repairseek') >= 0).length,
  }));

  await cmd('kill @e[type=!player]', 300);
  await h.stop();
  h.finish(res);
}

h.guard(main);
