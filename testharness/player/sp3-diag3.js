#!/usr/bin/env node
/** sp3-diag3.js — one command at a time, reply matched by content. */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

async function run(bot, c, timeoutMs = 4000) {
  const msgs = [];
  const onMsg = (m) => msgs.push(m.toString());
  bot.on('message', onMsg);
  bot.chat(c);
  await new Promise((r) => setTimeout(r, timeoutMs));
  bot.removeListener('message', onMsg);
  log('run', `${c}\n      => ${JSON.stringify(msgs)}`);
  return msgs;
}

(async () => {
  const bot = await createHarnBot({ username: 'ETIM_Harn04' });
  await run(bot, '/gamemode 1', 1200);
  await run(bot, '/tp ETIM_Harn04 80 136 100', 2500);
  bot.physicsEnabled = false;
  await run(bot, '/kill @e[type=!Player]', 2500);
  await run(bot, '/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:"SP3Phase"}', 2500);
  await run(bot, '/testfor @e[name=SP3Phase,r=10]', 2500);
  await run(bot, '/testfor @e[type=!Player,r=10]', 2500);
  await run(bot, '/testfor @e[name=SP3Phase,r=10]', 2500);
  await run(bot, '/etest attack @e[name=SP3Phase,r=10] ETIM_Harn04', 2500);
  const b = bot.blockAt(new Vec3(82, 134, 100));
  log('diag', `(82,134,100)=${b && b.name} botpos=${bot.entity.position}`);
  bot.quit();
  setTimeout(() => process.exit(0), 500);
})().catch((e) => { console.error(e); process.exit(1); });
