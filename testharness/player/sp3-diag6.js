#!/usr/bin/env node
/** sp3-diag6.js — /state + attack/testfor reply dump (survival). */
'use strict';
const fs = require('fs');
const { createHarnBot, log } = require('./fmlbot');
const NAME = 'ETIM_Harn04';
const OUT = '../../build-logs/sp3-diag6.txt';
const out = [];
function note(s) { out.push(s); log('n', s.slice(0, 200)); }

async function run(bot, c, timeoutMs = 2200) {
  const msgs = [];
  const onMsg = (m) => msgs.push(m.toString());
  bot.on('message', onMsg);
  bot.chat(c);
  await new Promise((r) => setTimeout(r, timeoutMs));
  bot.removeListener('message', onMsg);
  note(`${c}  => ${JSON.stringify(msgs)}`);
  return msgs;
}

(async () => {
  const tag = 'F' + (Date.now() % 100000);
  const nm = 'SP3Xp_' + tag;
  const bot = await createHarnBot({ username: NAME });
  await run(bot, '/gamemode 0', 1000);
  await run(bot, '/tp ETIM_Harn04 80 135 100', 2000);
  bot.physicsEnabled = false;
  await run(bot, '/kill @e[type=!Player]', 1500);
  await run(bot, '/state', 1800);
  await run(bot, `/summon etim:black_widow_spider 81.4 135 100.5 {num_webs:0b,PersistenceRequired:1b,CustomName:"${nm}"}`, 1500);
  await sleep(800);
  await run(bot, `/testfor @e[name=${nm},r=6]`, 900);
  await run(bot, `/etest attack @e[name=${nm},r=5,limit=1,sort=nearest] ETIM_Harn04`, 1500);
  await run(bot, `/testfor @e[name=${nm},r=6]`, 900);
  await run(bot, `/entitydata @e[name=${nm},r=8] {}`, 1500);
  await run(bot, '/state', 1500);
  await run(bot, `/etest attack @e[name=${nm},r=5,limit=1,sort=nearest] ETIM_Harn04`, 1500);
  await run(bot, `/testfor @e[name=${nm},r=6]`, 900);
  fs.writeFileSync(OUT, out.join('\n'), 'utf8');
  bot.quit();
  setTimeout(() => process.exit(0), 500);
})().catch((e) => { console.error(e); process.exit(1); });
