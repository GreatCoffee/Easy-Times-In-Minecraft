#!/usr/bin/env node
/**
 * re-despawn.js — 面11 三场景驱动（[AILog] despawn 行为面为判据；缺行即记录）。
 *
 *   S1 旁观玩家在场（gamemode spectator）45s
 *   S2 狼出生（summon Wolf ×3，距玩家 ~20 格）45s
 *   S3 僵尸村民（summon ZombieVillager）30s（不做完整治疗流程）
 *
 * 判据行由主进程 grep latest.log 的 [AILog] 段。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');

const host = process.argv[2] || 'localhost';
const port = parseInt(process.argv[3] || '25565', 10);
const username = process.argv[4] || 'ETIM_Harn05';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const bot = await createHarnBot({ host, port, username });
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(2000);
  const p = bot.entity.position;
  const cmd = async (c, w = 900) => { bot.chat(c.startsWith('/') ? c : '/' + c); await sleep(w); };

  log('s1', 'spectator 45s');
  await cmd(`/gamemode spectator ${username}`);
  await sleep(45000);
  await cmd(`/gamemode survival ${username}`);
  await sleep(1500);

  log('s2', 'wolves 45s');
  for (let i = 0; i < 3; i++) {
    await cmd(`/summon Wolf ${Math.floor(p.x) + 18 + i} ${Math.floor(p.y) + 1} ${Math.floor(p.z) + i}`, 700);
  }
  await sleep(45000);

  log('s3', 'zombie villager 30s');
  await cmd(`/summon ZombieVillager ${Math.floor(p.x) + 16} ${Math.floor(p.y) + 1} ${Math.floor(p.z) - 4}`);
  await sleep(30000);

  console.log('RESULT DESPAWN-SEQ done');
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
}

main().catch((e) => { log('re-despawn', 'FATAL:', e.message); process.exit(1); });
