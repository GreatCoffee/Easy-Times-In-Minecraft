#!/usr/bin/env node
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: 'ETIM_Harn04' });
  let lastTime = null;
  bot.on('message', (m) => { const s = m.toString(); const x = s.match(/time is (\d+)/i); if (x) lastTime = x[1]; });
  await sleep(3000);
  const cmd = async (c, w = 450) => { bot.chat(c.startsWith('/') ? c : '/' + c); await sleep(w); };
  await cmd('/gamemode creative ETIM_Harn04');
  await cmd('/tp ETIM_Harn04 -38.5 103 242.5', 1200);
  await cmd('/gamemode survival ETIM_Harn04');
  await cmd('/effect ETIM_Harn04 resistance 4 999 true');
  await cmd('/kill @e[type=!Player]', 1200);
  await cmd('/time query gametime', 400);
  log('open', 'start tick=' + lastTime);
  await cmd('/summon zombie -41.5 103 242.5 {HandItems:[{},{}],ArmorItems:[{},{},{},{}],CanPickUpLoot:0b,CustomName:"OPEN",PersistenceRequired:0b}', 500);
  await sleep(12000);
  await cmd('/time query gametime', 400);
  log('open', 'end tick=' + lastTime);
  await cmd('/testfor @e[type=zombie]', 500);
  await sleep(1000);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1500);
})().catch((e) => { log('open', 'FATAL', e.message); process.exit(1); });
