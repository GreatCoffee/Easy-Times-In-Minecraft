/**
 * combo-observe-spawn.js — 阶段五批四 spawn cycle 首观察窗
 * bot 在线 300s 静置，判读器读 [SpawnLog] 行族 + 敌怪 kill/生成面。
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn07' });
  bot.chat('/effect ETIM_Harn07 minecraft:resistance 900000 254 true');
  await sleep(1500);
  bot.chat('/gamerule doMobSpawning true');
  await sleep(1200);
  bot.chat('/say [HarnMark] OBSVAL begin ts=' + Date.now());
  await sleep(300 * 1000);
  bot.chat('/say [HarnMark] OBSVAL end ts=' + Date.now());
  await sleep(2000);
  bot.quit();
  log('obs', 'done');
  setTimeout(() => process.exit(0), 1200);
}
main().catch((e) => { log('obs', 'FATAL:', e.message); process.exit(1); });
