#!/usr/bin/env node
/**
 * wd-despawn-v2.js — W+D 窗 D 面驱动（会话七 · testharness/player · 2026-10-21）
 *
 * v2 修正（v1 失败根因）：
 *   1) 1.12 实体 ID 是 zombie_villager（v1 用 ZombieVillager → Unable to summon）
 *   2) /fill 的旧版语法需要显式 dataValue：minecraft:stone 0 hollow
 *   3) 1.12 驯服位由非空 OwnerUUID 推导（EntityTameable.func_70037_a:62-68），
 *      没有独立的 Tame 持久键 → 用 OwnerUUID 召唤驯服狼
 *   4) 远端玩家（>1024 格）会让狼区块卸载：由 Harn05 旁观者常驻狼区保载；
 *      旁观者不计入 getClosestPlayer(..., false)（re-final2-verdict 2.1 #3 已证）
 *
 * 用法：node wd-despawn-v2.js [host] [port] [A] [B] [spawnX] [spawnY] [spawnZ]
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const A = process.argv[4] || 'ETIM_Harn04';
const B = process.argv[5] || 'ETIM_Harn05';
const sx = parseInt(process.argv[6] || '-60', 10);
const sy = parseInt(process.argv[7] || '68', 10);
const sz = parseInt(process.argv[8] || '232', 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const botA = await createHarnBot({ host, port, username: A });
  const botB = await createHarnBot({ host, port, username: B });
  await sleep(2500);
  log('dim', `A dim=${botA.game.dimension} at ${JSON.stringify(botA.entity.position)}; B dim=${botB.game.dimension} at ${JSON.stringify(botB.entity.position)}`);
  if (!(botA.game.dimension === 0 || botA.game.dimension === 'overworld')
      || !(botB.game.dimension === 0 || botB.game.dimension === 'overworld')) {
    throw new Error(`dimension check failed: A=${botA.game.dimension} B=${botB.game.dimension}`);
  }

  const cmd = async (c, w = 500) => {
    botA.chat(c.startsWith('/') ? c : '/' + c);
    await sleep(w);
  };

  await cmd(`/gamemode spectator ${B}`);
  await cmd(`/tp ${A} ${sx} ${sy} ${sz}`, 1500);
  await cmd('/gamerule doMobSpawning false');
  await cmd('/gamerule doDaylightCycle false');
  await cmd('/time set day');
  await cmd('/difficulty easy');
  await cmd(`/effect ${A} resistance 999 255 true`);
  await cmd('/kill @e[type=!Player]', 1500);

  // 石室：3x3x4 壳，内部 1x2x1 空腔；均在 spawn 160 格内
  const rooms = [
    { tag: 'WD_ZV', dz: 6 },
    { tag: 'WD_ZVC', dz: 12 },
    { tag: 'WD_W1', dz: 18 },
    { tag: 'WD_W2', dz: 22 },
    { tag: 'WD_W3', dz: 26 },
    { tag: 'WD_TAME', dz: 30 },
  ];
  const rx = sx + 60;
  for (const r of rooms) {
    const z = sz + r.dz;
    await cmd(`/fill ${rx - 1} ${sy - 1} ${z - 1} ${rx + 1} ${sy + 2} ${z + 1} minecraft:stone 0 hollow`);
  }

  const at = (z) => `${rx} ${sy} ${sz + z}`;
  await cmd(`/summon zombie_villager ${at(6)} {CustomName:"WD_ZV"}`);
  await cmd(`/summon zombie_villager ${at(12)} {CustomName:"WD_ZVC",IsConverting:1b,ConversionTime:600}`);
  await cmd(`/summon Wolf ${at(18)} {CustomName:"WD_W1"}`);
  await cmd(`/summon Wolf ${at(22)} {CustomName:"WD_W2"}`);
  await cmd(`/summon Wolf ${at(26)} {CustomName:"WD_W3"}`);
  await cmd(`/summon Wolf ${at(30)} {CustomName:"WD_TAME",OwnerUUID:"8b01cd34-df04-30b6-b6ca-85914f766604"}`);
  log('summon', `done at ${new Date().toISOString()}`);

  // 200 门 = 10 s
  await sleep(15000);
  log('phaseA', 't+15s');

  // age > 2400 = 120 s
  await sleep(110000);
  log('phaseB', 't+125s (age>2400)');

  // 远端玩家；旁观者 B 留在狼区保载
  await cmd(`/effect ${A} resistance 999 255 true`);
  await cmd(`/tp ${A} ${sx + 1200} ${sy + 2} ${sz}`, 2000);
  log('phaseB', `A teleported >1024 blocks; B stays near wolves`);
  await cmd('/entitydata @e[name=WD_W2] {despawn_counter:2501}');
  await cmd('/entitydata @e[name=WD_TAME] {despawn_counter:2501}');
  log('phaseB', 'counter injected (2501)');
  await sleep(12000);

  await cmd('/testfor @e[name=WD_TAME]');
  await cmd('/testfor @e[name=WD_W2]');
  await cmd('/testfor @e[type=Wolf]');
  await sleep(2000);

  console.log('RESULT WD-DESPAWN-V2 done');
  try { botA.quit(); } catch (e) {}
  try { botB.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1500);
}

main().catch((e) => { log('wd-despawn-v2', 'FATAL:', e.message); process.exit(1); });
