#!/usr/bin/env node
/**
 * wd-despawn.js — W+D 窗 D 面驱动（会话七 · testharness/player · 2026-10-21）
 *
 * 一个 boot 内完成：
 *   F-11-28 ① 非转换 ZombieVillager（命令召唤，非村民转换）→ counter 过 200 → kill 行
 *   F-11-28 ② IsConverting=1/ConversionTime=600 → hold=zombie-villager-converting + 窗内零 kill
 *   F-11-26 ① 3 只野狼 age<=2400 → 每狼一条 hold=wolf-age + 零 kill
 *   F-11-26 ② 同狼 age>2400 + 远端玩家（>1024 格）+ counter 注入 2501 → kill 行
 *   F-11-26 ③ 驯服狼 age>2400 + counter 注入 2501 → 零 kill + testfor 存活
 *
 * 判据全在服务端 [AILog]；本脚本只负责摆场与 testfor 命令。
 * 用法：node wd-despawn.js [host] [port] [username]
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(2000);

  const p = bot.entity.position;
  const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
  log('pos', `bot at ${bx} ${by} ${bz}`);

  const cmd = async (c, w = 500) => {
    bot.chat(c.startsWith('/') ? c : '/' + c);
    await sleep(w);
  };

  // ---- 清场 / 固定环境 ----
  await cmd('/gamerule doMobSpawning false');
  await cmd('/gamerule doDaylightCycle false');
  await cmd('/time set day');
  await cmd('/difficulty easy');
  await cmd('/effect ' + username + ' resistance 999 255 true');
  await cmd('/kill @e[type=!Player]', 1200);

  // ---- 石室（封 3x3x4 壳，内部 1x2x1 空腔；均在 spawn 160 格内 = 常载 spawn chunk） ----
  const rooms = [
    { tag: 'WD_ZV', dz: 6 },
    { tag: 'WD_ZVC', dz: 12 },
    { tag: 'WD_W1', dz: 18 },
    { tag: 'WD_W2', dz: 22 },
    { tag: 'WD_W3', dz: 26 },
    { tag: 'WD_TAME', dz: 30 },
  ];
  const rx = bx + 60;
  for (const r of rooms) {
    const z = bz + r.dz;
    await cmd(`/fill ${rx - 1} ${by - 1} ${z - 1} ${rx + 1} ${by + 2} ${z + 1} minecraft:stone hollow`);
  }

  // ---- 召唤 ----
  const at = (z) => `${rx} ${by} ${bz + z}`;
  await cmd(`/summon ZombieVillager ${at(6)} {CustomName:"WD_ZV"}`);
  await cmd(`/summon ZombieVillager ${at(12)} {CustomName:"WD_ZVC",IsConverting:1b,ConversionTime:600}`);
  await cmd(`/summon Wolf ${at(18)} {CustomName:"WD_W1"}`);
  await cmd(`/summon Wolf ${at(22)} {CustomName:"WD_W2"}`);
  await cmd(`/summon Wolf ${at(26)} {CustomName:"WD_W3"}`);
  await cmd(`/summon Wolf ${at(30)} {CustomName:"WD_TAME",Tame:1b}`);
  const tSummon = Date.now();
  log('summon', `done at ${new Date(tSummon).toISOString()}`);

  // 200 门 = 10 s；15 s 后 hold/kill 面应齐
  await sleep(15000);
  log('phaseA', 't+15s');

  // age > 2400 = 120 s；等到 t+125 s
  await sleep(110000);
  log('phaseB', 't+125s (age>2400)');

  // ---- 远端玩家（>1024 格）+ counter 注入 ----
  await cmd('/effect ' + username + ' resistance 999 255 true');
  await cmd(`/tp ${username} ${bx + 1200} ${by + 2} ${bz}`, 2000);
  log('phaseB', 'teleported >1024 blocks');
  await cmd('/entitydata @e[name=WD_W2] {despawn_counter:2501}');
  await cmd('/entitydata @e[name=WD_TAME] {despawn_counter:2501}');
  log('phaseB', 'counter injected (2501)');
  await sleep(10000);

  await cmd('/testfor @e[name=WD_TAME]');
  await cmd('/testfor @e[name=WD_W2]');
  await cmd('/testfor @e[type=Wolf]');
  await sleep(2000);

  console.log('RESULT WD-DESPAWN done');
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1200);
}

main().catch((e) => { log('wd-despawn', 'FATAL:', e.message); process.exit(1); });
