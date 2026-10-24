#!/usr/bin/env node
/**
 * sp3-locate.js — jungle hunt via /locate Temple (session 7).
 *
 * In 1.12 /locate resolves relative to the command sender's position, so a
 * bot teleported to an anchor gets the nearest temple to that anchor. Temples
 * are desert *or* jungle; the biome at each result is then probed directly.
 * Cheap compared with a full biome grid (2 tps per candidate).
 */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const NAME = process.env.SP3_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let BIOMES = null;
try { BIOMES = require('minecraft-data')('1.12.2').biomes; } catch (e) {}
const biomeName = (id) => (BIOMES && BIOMES[id] ? BIOMES[id].name : 'id' + id);

function biomeAt(bot, x, z) {
  try { return bot.world.getBiome(new Vec3(x, 64, z)); } catch (e) { return null; }
}

async function tp(bot, x, y, z) {
  bot.chat(`/tp ${NAME} ${x} ${y} ${z}`);
  await sleep(500);
}

async function waitBiome(bot, x, z) {
  const deadline = Date.now() + 9000;
  let id;
  while (Date.now() < deadline) {
    id = biomeAt(bot, x, z);
    if (id !== undefined && id !== null) return id;
    await sleep(120);
  }
  return null;
}

(async () => {
  const bot = await createHarnBot({ username: NAME });
  const located = [];
  bot.on('message', (m) => {
    const s = m.toString();
    const r = /Located Temple at (-?\d+) \(y\?\) (-?\d+)/.exec(s);
    if (r) located.push({ x: +r[1], z: +r[2], raw: s });
  });
  await new Promise((r) => bot.once('spawn', r)).catch(() => {});
  bot.chat('/gamemode 1');
  await sleep(700);
  bot.physicsEnabled = false;

  const anchors = [[-1500, -1500], [-2600, -2600], [-1500, 1500], [-3000, 500],
    [2000, -2000], [2500, 2500], [300, -2800], [300, 2800], [-4200, -1200], [-1200, -3800]];
  for (const [x, z] of anchors) {
    await tp(bot, x, 100, z);
    await sleep(400);
    const before = located.length;
    bot.chat('/locate Temple');
    await sleep(1500);
    log('locate', `anchor (${x},${z}) -> ${located.length > before ? located[located.length - 1].raw : 'no reply'}`);
  }

  const seen = new Set();
  for (const p of located) {
    const key = p.x + ',' + p.z;
    if (seen.has(key)) continue;
    seen.add(key);
    await tp(bot, p.x, 100, p.z);
    const id = await waitBiome(bot, p.x, p.z);
    log('biome', `temple (${p.x},${p.z}) biome=${id} ${biomeName(id)}${/jungle/i.test(biomeName(id)) ? '  <== JUNGLE' : ''}`);
  }
  bot.quit();
  await sleep(400);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
