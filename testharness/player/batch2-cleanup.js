#!/usr/bin/env node
/**
 * batch2-cleanup.js — S-2 Nether teardown (session 7 harness).
 *
 * The S-2 bot logs out inside the Nether; the server console's /fill and /kill
 * are overworld-scoped, so the Nether platform (33x33 stone at 0,70,0) and the
 * Hell mobs can only be reached from a player in dimension -1. This relogs the
 * same fake player (its playerdata is at the Nether platform), kills the test
 * mobs in batches and clears the platform, then quits.
 *
 * Usage: node batch2-cleanup.js
 */
'use strict';
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const BOT = process.env.S2_BOT || 'ETIM_Harn04';

async function cmd(bot, c, w = 800) {
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
  console.log('[cleanup] dim=' + bot.game.dimension + ' pos=' + bot.entity.position);

  const nether = bot.game.dimension === -1 || bot.game.dimension === 'the_nether';
  if (!nether) {
    console.log('[cleanup] not in the Nether; nothing to do');
    try { bot.quit(); } catch (e) {}
    setTimeout(() => process.exit(0), 800);
    return;
  }

  for (const t of ['PigZombie', 'MagmaCube', 'Ghast', 'Skeleton', 'Zombie', 'Spider', 'Creeper']) {
    await cmd(bot, 'kill @e[type=' + t + ',x=0,y=71,z=0,r=200]', 1200);
  }
  await cmd(bot, 'fill -16 70 -16 16 70 16 air', 1500);
  await cmd(bot, 'testforblock 0 70 0 minecraft:stone', 600);

  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
}

main().catch((e) => { console.log('[fatal]', e && e.message); process.exit(1); });
