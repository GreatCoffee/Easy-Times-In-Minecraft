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
    'mobs:livestockNeedsR196',
    'enchant:enchantPoolR196',
    'enchant:enchantDebugLog',
  ],
});
const { cmd, mark, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const ARROW_RELEASE_RE = /\[ArrowLog\] release charge=(\d+) divisor=\S+ velocity=([\d.]+)/;
const ARROW_SPAWN_RE = /\[ArrowLog\] shot wander=([\d.]+)/;
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
    shot: sp && +sp[1], rows: releases.length + spawns.length, pass: res.w1,
  }));

  // ---- W2: EnchLog (mob equipment pool row) ----
  // C-B70UB-1: 1.12 CommandSummon 只在「未带 NBT」时调 onInitialSpawn
  // (build/rfg/minecraft-src/java/net/minecraft/command/server/CommandSummon.java:93-100 flag=true,
  //  :118 只有 !flag 才走 onInitialSpawn) ⇒ 带 NBT 召唤不会命中 setEnchantmentBasedOnDifficulty，
  //  故先裸 summon 触发行，再用 entitydata 补装铁剑。
  from = mark();
  await cmd('summon minecraft:zombie 6.5 130 2.5', 500);
  await sleep(1200);
  await cmd('entitydata @e[type=minecraft:zombie,x=5,y=129,z=1,dx=3,dy=3,dz=3] ' +
    '{PersistenceRequired:1b,HandItems:[{id:"minecraft:iron_sword",Count:1b},{}]}', 300);
  const rows2 = await waitRow(NON_TABLE_RE, from, 8000);
  const nt = lastOf(rows2);
  res.w2 = !!nt && parseFloat(nt[1]) >= 0;
  console.log('[W2]', JSON.stringify({ row: nt && { tension: +nt[1] }, rows: rows2.length, pass: res.w2 }));

  // ---- W3: RepairLog (skeleton picks up a bone while hurt) ----
  await cmd('kill @e[type=minecraft:zombie]', 300);
  // C-B70UB-3: stage 用 time 1000（白天）+ 露天空地，骷髅 #2108 的 fleesun 任务
  // （MixinEntitySkeleton :37-41 的 addTask(3, ETIMEntityAIFleeSun)）持续占用 movement 互斥位
  // （[AILog] fleesun … inSky=true 每 1-3 tick 一行），EntityAITasks.canUse 挡住同互斥的
  // 优先级 4 repair 任务 ⇒ shouldExecute 的 1/40 掷骰从未跑到。改判前把时间推到夜（无日晒）。
  await cmd('time set 14000', 300);
  from = mark();
  // C-B70UB-2: R196 血量表把骷髅 maxHealth 压到 6.0（见本窗 [AILog] mob stats maxHealth=6.0
  // entity=EntitySkeleton#2214），而旧驱动写 Health:6f ⇒ health == max 被
  // ETIMEntityAIMoveToRepairItem.shouldExecute 的 getHealth() >= getMaxHealth() 直接挡掉；
  // 同时 Attributes:Base 20 被 ETIM 覆盖无效。改 Health:3f（< 6）。
  // C-B70UB-4: 先把 bot 挪到 followRange(32) 之外再召唤 —— 若先召唤，骷髅当 tick 就锁定
  // 目标，EntityAIAttackRangedBow 占住 movement 互斥位；之后即使拉开距离，攻击目标仍保留，
  // 攻击任务继续执行 ⇒ 优先级 4 的 repair 永远进不到 shouldExecute（r1–r4 全零的剩余原因）。
  await cmd('tp ETIM_F7 44.5 130 44.5', 400);
  // C-B70UB-5: 把骷髅关进 1×1×2 石笼（内部 (9,130..131,2)），让它只能站在骨头格上；
  // 否则 wander 会把它带离掉落物，startExecuting 走「path=null 且不相交」的静默返回分支。
  await cmd('fill 8 130 1 8 131 3 minecraft:stone', 200);
  await cmd('fill 10 130 1 10 131 3 minecraft:stone', 200);
  await cmd('fill 8 130 1 10 131 1 minecraft:stone', 200);
  await cmd('fill 8 130 3 10 131 3 minecraft:stone', 200);
  await cmd('fill 8 132 1 10 132 3 minecraft:stone', 200);
  await cmd('summon minecraft:skeleton 9.5 130 2.5 ' +
    '{PersistenceRequired:1b,Health:3f}', 500);
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
