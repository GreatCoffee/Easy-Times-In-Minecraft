#!/usr/bin/env node
/**
 * sp3-probe.js — biome / block probe for the three-spider round (session 7).
 *
 * Usage:
 *   node sp3-probe.js point <x> <z> [<x> <z> ...]
 *   node sp3-probe.js grid <step> <radius>
 *   node sp3-probe.js tp <x> <y> <z>
 *
 * Creative + physics off; each probe teleports, then polls the loaded biome
 * column (1.12 chunk payload carries the 256-byte biome array — verified
 * offline by biome-scan.js).
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const NAME = process.env.SP3_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let BIOMES = null;
try { BIOMES = require('minecraft-data')('1.12.2').biomes; } catch (e) { /* ignore */ }
const biomeName = (id) => (BIOMES && BIOMES[id] ? BIOMES[id].name : 'id' + id);

async function cmd(bot, c, w = 400) {
  bot.chat(c.startsWith('/') ? c : '/' + c);
  await sleep(w);
}

function biomeAt(bot, x, z) {
  try {
    const v = bot.world.getBiome(new Vec3(x, 64, z));
    return v && typeof v.then === 'function' ? null : v;
  } catch (e) { return null; }
}

async function probe(bot, x, z) {
  await cmd(bot, `/tp ${NAME} ${x} 100 ${z}`, 320);
  let id;
  const deadline = Date.now() + 9000;
  while (Date.now() < deadline) {
    id = biomeAt(bot, x, z);
    if (id !== undefined && id !== null) break;
    await sleep(150);
  }
  if (id === undefined || id === null) { log('probe', `(${x},${z}) NO-COLUMN`); return null; }
  log('probe', `(${x},${z}) biome=${id} ${biomeName(id)}`);
  return { x, z, id, name: biomeName(id) };
}

(async () => {
  const mode = process.argv[2] || 'point';
  const bot = await createHarnBot({ username: NAME });
  bot.on('kicked', (r) => log('bot', 'KICKED', JSON.stringify(r)));
  await cmd(bot, '/gamemode 1', 600);
  bot.physicsEnabled = false;
  await sleep(800);

  if (mode === 'tp') {
    const [x, y, z] = [+process.argv[3], +process.argv[4], +process.argv[5]];
    await cmd(bot, `/tp ${NAME} ${x} ${y} ${z}`, 800);
    await sleep(1500);
    const p = bot.entity.position;
    const below = bot.blockAt(p.offset(0, -1, 0));
    log('probe', `pos=${p.x.toFixed(1)},${p.y.toFixed(1)},${p.z.toFixed(1)} below=${below && below.name} biome=${biomeName(biomeAt(bot, p.x, p.z))}`);
  } else if (mode === 'point') {
    const pts = process.argv.slice(3).map(Number);
    for (let i = 0; i + 1 < pts.length; i += 2) await probe(bot, pts[i], pts[i + 1]);
  } else if (mode === 'grid') {
    const step = +(process.argv[3] || 768);
    const radius = +(process.argv[4] || 2304);
    let found = null;
    outer:
    for (let z = -radius; z <= radius; z += step) {
      for (let x = -radius; x <= radius; x += step) {
        const r = await probe(bot, x, z);
        if (r && /jungle/i.test(r.name)) { found = r; break outer; }
      }
    }
    log('probe', found ? `JUNGLE FOUND at (${found.x},${found.z}) ${found.name}` : 'NO JUNGLE in grid');
  }

  log('probe', 'done; disconnecting');
  bot.quit();
  await sleep(500);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
