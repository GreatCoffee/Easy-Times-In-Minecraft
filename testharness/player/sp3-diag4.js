#!/usr/bin/env node
/** sp3-diag4.js — phase evasion probe: NBT + one attack + position. */
'use strict';
const fs = require('fs');
const { createHarnBot, log } = require('./fmlbot');
const NAME = 'ETIM_Harn04';
const LOG = '../../run/obfuscated-server/logs/latest.log';

async function run(bot, c, timeoutMs = 2500) {
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
  const tag = 'D' + (Date.now() % 10000);
  const nm = 'SP3P_' + tag;
  const bot = await createHarnBot({ username: NAME });
  await run(bot, '/gamemode 0', 1000);
  await run(bot, '/tp ETIM_Harn04 80 136 100', 2000);
  bot.physicsEnabled = false;
  await run(bot, '/kill @e[type=!Player]', 2000);
  await run(bot, `/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:"${nm}"}`, 2000);
  await run(bot, `/entitydata @e[name=${nm},r=10] {}`, 2000);
  await run(bot, `/testfor @e[name=${nm},r=4]`, 1200);
  const before = fs.readFileSync(LOG, 'utf8').split('\n').length;
  await run(bot, `/etest attack @e[name=${nm},r=10] ETIM_Harn04`, 2000);
  await new Promise((r) => setTimeout(r, 1500));
  await run(bot, `/entitydata @e[name=${nm},r=10] {}`, 2000);
  await run(bot, `/testfor @e[name=${nm},r=4]`, 1200);
  await run(bot, `/testfor @e[name=${nm},r=12]`, 1200);
  const all = fs.readFileSync(LOG, 'utf8').split('\n');
  log('logdelta', all.slice(before).filter((l) => /phase-teleport|TestLog|MobLog/.test(l)).join(' || ').slice(0, 1500));
  bot.quit();
  setTimeout(() => process.exit(0), 500);
})().catch((e) => { console.error(e); process.exit(1); });
