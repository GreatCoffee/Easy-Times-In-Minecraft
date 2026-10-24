#!/usr/bin/env node
/**
 * sp3-setup.js — builds the three-spider test sites in the flat jungle world
 * (session 7). All /fill commands run from the bot (op) because the RCON
 * sender has no position and world chunks away from the spawn region are not
 * loaded for it ("Cannot place blocks outside of the world").
 *
 * Sites
 *   room A (V2 reject / V1 gate): 33x6x33 shell at y36..47 -> air y38..43,
 *       floor top y37, player y38  (sampled y=38 > 32)
 *   room B (V2 accept / V3):      shell y16..27 -> air y18..23,
 *       floor top y17, player y18  (sampled y=18 <= 32)
 *   arena (V4/V5/V6/V7/V8):       floor y134, cleared y135..149, 43x83
 *   lava basin on the arena at (88..92, 135..137, 128..132)
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const NAME = process.env.SP3_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cmd(bot, c, w = 450) {
  bot.chat(c.startsWith('/') ? c : '/' + c);
  log('cmd', c);
  await sleep(w);
}

async function tp(bot, x, y, z, w = 900) {
  await cmd(bot, `/tp ${NAME} ${x} ${y} ${z}`, w);
}

(async () => {
  const bot = await createHarnBot({ username: NAME });
  await cmd(bot, '/gamemode 1');
  await cmd(bot, '/time set 1000');
  await cmd(bot, '/gamerule doDaylightCycle false');
  bot.physicsEnabled = false;

  // ---------------- room A (y=38 sampling band) ----------------
  await tp(bot, 200, 60, 200);
  await cmd(bot, '/fill 183 36 183 217 47 217 minecraft:stone', 1600);
  await cmd(bot, '/fill 184 38 184 216 43 216 minecraft:air', 1200);

  // ---------------- room B (y=18 sampling band) ----------------
  await cmd(bot, '/fill 183 16 183 217 27 217 minecraft:stone', 1600);
  await cmd(bot, '/fill 184 18 184 216 23 216 minecraft:air', 1200);

  // ---------------- arena ----------------
  await tp(bot, 80, 140, 100);
  await cmd(bot, '/fill 59 135 59 101 149 105 minecraft:air', 1400);
  await cmd(bot, '/fill 59 135 106 101 149 141 minecraft:air', 1400);
  await cmd(bot, '/fill 59 134 59 101 134 141 minecraft:stone', 1200);

  // lava basin (Demon fire/lava immunity face)
  await cmd(bot, '/fill 88 135 128 92 137 132 minecraft:stone', 600);
  await cmd(bot, '/fill 89 135 129 91 136 131 minecraft:air', 500);
  await cmd(bot, '/setblock 90 135 130 minecraft:lava', 400);

  // ---------------- verify ----------------
  const checks = [
    ['roomA floor', 200, 37, 200, 'stone'],
    ['roomA cell', 200, 38, 200, 'air'],
    ['roomA roof', 200, 44, 200, 'stone'],
    ['roomB floor', 200, 17, 200, 'stone'],
    ['roomB cell', 200, 18, 200, 'air'],
    ['arena floor', 80, 134, 100, 'stone'],
    ['arena air', 80, 135, 100, 'air'],
    ['lava basin', 90, 135, 130, 'lava'],
  ];
  for (const [label, x, y, z, want] of checks) {
    // load the chunk by teleporting near the site (creative, physics off)
    if (label.startsWith('arena') || label.startsWith('lava')) await tp(bot, 80, 140, 100, 400);
    else await tp(bot, 200, 60, 200, 400);
    await sleep(400);
    const b = bot.blockAt(new Vec3(x, y, z));
    log('verify', `${label} (${x},${y},${z}) = ${b && b.name} (want ${want}) ${b && b.name === want ? 'OK' : 'MISMATCH'}`);
  }
  bot.quit();
  await sleep(500);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
