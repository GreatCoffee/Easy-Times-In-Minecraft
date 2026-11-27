#!/usr/bin/env node
/** sp3-diag2.js — selector form matrix + arena thickness check. */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');
const NAME = 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cmdReply(bot, c, timeoutMs = 3000) {
  const done = new Promise((resolve) => {
    const to = setTimeout(() => { bot.removeListener('message', onMsg); resolve('(timeout)'); }, timeoutMs);
    function onMsg(m) { clearTimeout(to); bot.removeListener('message', onMsg); resolve(m.toString()); }
    bot.on('message', onMsg);
  });
  bot.chat(c);
  const r = await done;
  log('r', `${c} => ${r}`);
  return r;
}

(async () => {
  const bot = await createHarnBot({ username: NAME });
  await bot.chat('/gamemode 1'); await sleep(600);
  bot.chat(`/tp ${NAME} 80 136 100`); await sleep(1200);
  bot.physicsEnabled = false;
  for (const y of [129, 130, 131, 132, 133, 134, 135]) {
    const b = bot.blockAt(new Vec3(80, y, 100));
    log('diag', `(80,${y},100) = ${b && b.name}`);
  }
  await cmdReply(bot, '/kill @e[type=!Player]', 1200);
  await cmdReply(bot, '/summon etim:phase_spider 81.5 135 100.5 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b}', 1200);
  await sleep(800);
  await cmdReply(bot, '/testfor @e[type=etim.phase_spider,r=6]', 900);
  await cmdReply(bot, '/testfor @e[type=etim.phase_spider,r=6,limit=1]', 900);
  await cmdReply(bot, '/testfor @e[type=etim.phase_spider,r=6,c=1]', 900);
  await cmdReply(bot, '/tp @e[type=etim.phase_spider,r=6,c=1] 80.5 135 101.5', 900);
  await cmdReply(bot, '/etest attack @e[type=etim.phase_spider,r=6] ETIM_Harn04', 1200);
  await sleep(700);
  await cmdReply(bot, '/etest attack @e[type=etim.phase_spider,r=6] ETIM_Harn04', 1200);
  await cmdReply(bot, '/kill @e[type=etim.phase_spider,r=20]', 900);
  bot.quit();
  await sleep(400);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
