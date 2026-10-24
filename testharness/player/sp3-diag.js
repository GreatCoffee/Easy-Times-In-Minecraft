#!/usr/bin/env node
/** sp3-diag.js — arena/selector diagnostics (session 7). */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');
const NAME = 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cmdReply(bot, c, timeoutMs = 4000) {
  const done = new Promise((resolve) => {
    const to = setTimeout(() => { bot.removeListener('message', onMsg); resolve('(timeout)'); }, timeoutMs);
    function onMsg(m) { clearTimeout(to); bot.removeListener('message', onMsg); resolve(m.toString()); }
    bot.on('message', onMsg);
  });
  bot.chat(c);
  const r = await done;
  log('cmd', `${c} -> ${r}`);
  return r;
}

(async () => {
  const bot = await createHarnBot({ username: NAME });
  await bot.chat('/gamemode 1'); await sleep(600);
  bot.chat(`/tp ${NAME} 80 140 100`); await sleep(1200);
  bot.physicsEnabled = false;
  for (const [x, y, z] of [[80, 134, 100], [82, 134, 100], [80, 133, 100], [80, 135, 100], [73, 134, 133]]) {
    const b = bot.blockAt(new Vec3(x, y, z));
    log('diag', `block (${x},${y},${z}) = ${b && b.name}`);
  }
  log('diag', `bot pos ${bot.entity.position}`);
  await cmdReply(bot, '/kill @e[type=!Player]', 1200);
  await cmdReply(bot, '/summon etim:phase_spider 85 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b}', 1500);
  await sleep(800);
  await cmdReply(bot, '/testfor @e[type=etim:phase_spider,r=20]', 1200);
  await cmdReply(bot, '/testfor @e[type=etim.phase_spider,r=20]', 1200);
  await cmdReply(bot, '/testfor @e[type=!Player,r=20]', 1200);
  await cmdReply(bot, '/tp @e[type=etim.phase_spider,r=20,limit=1] 81 135 100', 1200);
  await cmdReply(bot, '/tp @e[type=etim.phase_spider,r=20,limit=1] 81 135 100', 1200);
  await sleep(600);
  await cmdReply(bot, '/testfor @e[type=etim:phase_spider,r=4]', 1000);
  await cmdReply(bot, '/etest attack @e[type=etim:phase_spider,distance=..6,limit=1,sort=nearest] ETIM_Harn04', 1500);
  await cmdReply(bot, '/kill @e[type=!Player]', 1000);
  bot.quit();
  await sleep(400);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
