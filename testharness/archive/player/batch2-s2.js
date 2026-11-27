#!/usr/bin/env node
/**
 * batch2-s2.js — Hell window driver (session 7 harness).
 *
 * Builds a 4x5 obsidian portal at the Q area, walks the fake player through
 * (server-side portal counter), then builds a 33x33 platform at Nether (0,70,0)
 * and idles for the ghast observation window.
 *
 * Usage: node batch2-s2.js [minutes]
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOT = process.env.S2_BOT || 'ETIM_Harn04';
const MIN = parseInt(process.argv[2] || '12', 10);

async function cmd(bot, c, w = 600) {
  console.log('[cmd]', c);
  bot.chat(c.startsWith('/') ? c : '/' + c);
  await sleep(w);
}

async function main() {
  const bot = await createHarnBot({ host: 'localhost', port: 25565, username: BOT });
  bot.on('message', (m) => console.log('[chat]', m.toString()));
  bot.on('error', (e) => console.log('[bot-error]', e.message));
  await new Promise((r) => { if (bot.entity && bot.entity.position) return r(); bot.once('move', r); setTimeout(r, 15000); });
  await sleep(1500);
  console.log('[bot] login dim=' + bot.game.dimension + ' pos=' + bot.entity.position);

  await cmd(bot, '/gamemode survival', 500);
  await cmd(bot, '/effect ' + BOT + ' minecraft:resistance 99999 4 true', 300);
  await cmd(bot, '/effect ' + BOT + ' minecraft:fire_resistance 99999 0 true', 300);
  await cmd(bot, '/tp -43.5 80 242.5', 1200);

  // S-1 leaves a night's worth of hostiles around the probe/Q area; knockback
  // pushed the first attempt off the portal before the 80-tick counter. Clear
  // a small radius in batches (B2 discipline: one type per command, >=1s).
  for (const t of ['Skeleton', 'Zombie', 'Creeper', 'Spider', 'Enderman', 'Witch', 'Slime']) {
    await cmd(bot, 'kill @e[type=' + t + ',x=-43,y=80,z=242,r=30]', 1000);
  }

  // 4x5 obsidian frame, interior 2x3 at x=-44..-43, y=80..82, z=242
  const frame = [
    'fill -45 79 242 -42 79 242 obsidian',
    'fill -45 83 242 -42 83 242 obsidian',
    'fill -45 80 242 -45 82 242 obsidian',
    'fill -42 80 242 -42 82 242 obsidian',
  ];
  for (const c of frame) await cmd(bot, c, 400);
  // setblock minecraft:portal is removed by the portal state/frame check
  // (the meta axis does not survive onBlockAdded); igniting the bottom
  // interior obsidian with a fire block runs BlockFire.tryIgnitePortal, which
  // writes the correct axis state. Verified: all six blocks become Portal.
  await cmd(bot, 'setblock -44 80 242 minecraft:fire', 1500);
  await cmd(bot, 'testforblock -44 80 242 minecraft:portal', 600);

  console.log('[portal] waiting for dimension change (re-tp every 1s) ...');
  let jumped = false;
  for (let i = 0; i < 20; i++) {
    await cmd(bot, '/tp -43.5 80 242.5', 900);
    if (bot.game.dimension === -1 || bot.game.dimension === 'the_nether') { jumped = true; break; }
  }
  console.log('[portal] jumped=' + jumped + ' dim=' + bot.game.dimension + ' pos=' + (bot.entity && bot.entity.position));

  if (!jumped) {
    console.log('[portal] ABORT: no dimension change in 40s');
    try { bot.quit(); } catch (e) {}
    setTimeout(() => process.exit(1), 1000);
    return;
  }

  // Nether platform at (0,70,0)
  await cmd(bot, '/tp 0.5 80 0.5', 1800);
  await cmd(bot, '/fill -16 70 -16 16 70 16 stone', 1200);
  await cmd(bot, '/fill -16 71 -16 16 81 16 air', 1200);
  await cmd(bot, '/tp 0.5 71 0.5', 1200);
  await cmd(bot, '/effect ' + BOT + ' minecraft:resistance 99999 4 true', 300);
  await cmd(bot, '/effect ' + BOT + ' minecraft:fire_resistance 99999 0 true', 300);
  await cmd(bot, '/say [S2] hell window start', 500);
  console.log('[S2] window start ' + new Date().toISOString() + ' minutes=' + MIN);

  const end = Date.now() + MIN * 60 * 1000;
  while (Date.now() < end) {
    await sleep(30000);
    console.log('[S2] alive pos=' + (bot.entity && bot.entity.position) + ' dim=' + bot.game.dimension);
  }
  await cmd(bot, '/say [S2] hell window end', 800);
  console.log('[S2] window end ' + new Date().toISOString());
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 1500);
}
main().catch((e) => { log('batch2-s2', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
