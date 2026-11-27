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
  await cmd('/fill -44 102 241 -36 102 243 minecraft:air', 600);
  await cmd('/setblock -40 100 242 minecraft:stone_slab 0 replace', 350);
  await cmd('/tp ETIM_Harn04 -38.5 100 242.5', 1200);
  await cmd('/gamemode survival ETIM_Harn04');
  await cmd('/effect ETIM_Harn04 resistance 255 4 true');
  await cmd('/kill @e[type=!Player]', 1200);
  await cmd('/time query gametime', 400);
  log('sight', 'start tick=' + lastTime);
  await cmd('/summon zombie -41.5 100 242.5 {HandItems:[{},{}],ArmorItems:[{},{},{},{}],CanPickUpLoot:0b,CustomName:"SIGHT",PersistenceRequired:0b}', 500);
  await sleep(9000);
  await cmd('/time query gametime', 400);
  log('sight', 'end tick=' + lastTime);
  await cmd('/kill @e[type=!Player]', 900);
  await sleep(800);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1500);
})().catch((e) => { log('sight', 'FATAL', e.message); process.exit(1); });
