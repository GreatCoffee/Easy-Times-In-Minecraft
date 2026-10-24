#!/usr/bin/env node
/**
 * mob-batch-smoke.js — mob 批（Revenant/BoneLord/B-SK-1）smoke driver.
 *
 * Faces:
 *   s1  revenant summon → registration + equip chain ([MobLog] lord rows,
 *       the constant full rusted-iron table, no chance gate)
 *   s2  bonelord summon → same + persistence + the 20-tick summon window
 *       (bot = the target) → [AILog] summon rows + [MobLog] troop rows
 *       (type roll 0.25 melee / else bow) + frenzy rows on nearby skeletons
 *   s3  B-SK-1 crop-decay face: 5 mature wheats + scythe_rusted_iron →
 *       durability delta = 5 × 2 = 10 (the R196 0.02F hardness chain;
 *       pre-fix delta was 0 — the vanilla 0.0 guard short-circuited it)
 *
 * Judgment channels: [AILog] (mobDebugLog=true) + [MobLog]
 * (mobEquipDebugLog=true, enabled this round) + the held-durability delta.
 */
'use strict';
const { execSync } = require('child_process');
const mineflayer = require('mineflayer');
const forge = require('minecraft-protocol-forge');
const mc = require('minecraft-protocol');
const fs = require('fs');

const LOG = 'run/obfuscated/logs/latest.log';
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const rcon = (cmd) => execSync(`node testharness/player/rcon-client.js 127.0.0.1 25575 etim27 "${cmd}"`).toString().trim();
const logTail = () => fs.readFileSync(LOG, 'utf8');

async function pingMods(host, port) {
  const res = await mc.ping({ host, port, version: '1.12.2' });
  return (res.modinfo && res.modinfo.modList) || null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const host = 'localhost', port = 25565, username = 'ETIM_Harn01';
  const serverMods = await pingMods(host, port);
  if (!serverMods) throw new Error('not an FML server');

  const bot = mineflayer.createBot({ host, port, username, version: '1.12.2' });
  forge.forgeHandshake(bot._client, { forgeMods: serverMods });

  const login = await new Promise((res, rej) => {
    bot.once('login', res);
    bot.once('error', (e) => rej(new Error('login: ' + e.message)));
    setTimeout(() => rej(new Error('login timeout 30s')), 30000);
  });
  log('harness', 'LOGIN OK', JSON.stringify(login && login.displayName || ''));
  await sleep(2500);

  // the login position can be a stale elevated death spot (in case: y=101,
  // airborne) — the bonelord /summon'd there falls to its death before the
  // first summon window. Kill + respawn = the world-spawn ground face.
  rcon(`kill ${username}`);
  await sleep(1000);
  bot.respawn();
  await sleep(3000);

  // cleanup leftover mobs (incl. the previous run's vanilla-skeleton troops)
  try { rcon('kill @e[type=etim:revenant]'); } catch (e) {}
  try { rcon('kill @e[type=etim:bonelord]'); } catch (e) {}
  try { rcon('kill @e[type=Skeleton]'); } catch (e) {}
  try { rcon('kill @e[type=Zombie]'); } catch (e) {}
  await sleep(500);

  // the login/respawn point is a marsh (water at dig height = the wheat pops
  // + the submerged-LOS face blocks the lord's targeting) — teleport to the
  // dry plateau (the anvil showcase area, dry land) for both faces.
  log('tp', rcon(`tp ${username} -30 100 12`).replace(/\n/g, ' '));
  await sleep(2500);

  const p = bot.entity.position;
  const pos = (dx, dz) => `${Math.floor(p.x + dx)} ${Math.floor(p.y)} ${Math.floor(p.z)}`;
  log('pos', `x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} z=${p.z.toFixed(1)}`);

  // ---- s3 FIRST: the B-SK-1 crop-decay face (before mobs complicate the digs) ----
  for (const it of bot.inventory.items().filter((it) => it.name === 'unknown')) {
    await bot.tossStack(it);
  }
  log('s3', rcon(`give ${username} etim:scythe_rusted_iron 1`));
  await sleep(1500);
  const scythe = bot.inventory.items().find((it) => it.name === 'unknown');
  if (!scythe) throw new Error('scythe not in inventory (no unknown item)');
  log('s3', `scythe type=${scythe.type} durabilityUsed=${scythe.durabilityUsed}`);
  await bot.equip(scythe, 'hand');
  const held0 = bot.heldItem;
  const d0 = held0 ? held0.durabilityUsed : -1;

  const base = [ [2, 0], [3, 0], [4, 0], [2, 1], [3, 1] ];
  for (let i = 0; i < base.length; i++) {
    const [dx, dz] = base[i];
    const wx = Math.floor(p.x) + dx, wy = Math.floor(p.y), wz = Math.floor(p.z) + dz;
    log('s3', `setblock ${wx} ${wy} ${wz} -> ` + rcon(`setblock ${wx} ${wy} ${wz} minecraft:wheat 7 replace`).replace(/\n/g, ' '));
    await sleep(250);
    const block = bot.blockAt(bot.entity.position.offset(dx, 0, dz));
    if (block && block.name === 'wheat') {
      log('s3', `dig #${i} at (${block.position.x},${block.position.y},${block.position.z})`);
      await bot.dig(block);
    } else {
      log('s3', `wheat ${i} not visible to bot (got ${block ? block.name : 'null'})`);
    }
  }
  await sleep(1000);
  const d1 = bot.heldItem ? bot.heldItem.durabilityUsed : -1;
  await sleep(1000);
  const d1b = bot.heldItem ? bot.heldItem.durabilityUsed : d1;
  const delta = Math.max(d1, d1b) - d0;
  log('s3', `durability ${d0} -> ${d1}/${d1b}  delta=${delta}  (expect 10 = 5 wheats x 2)`);
  console.log(`SMOKE-CROP-DECAY ${delta === 10 ? 'PASS' : 'CHECK delta=' + delta}`);

  // ---- s1/s2: the two summons (±2 = same plateau as the bot — wider
  // offsets roll off the spawn platform and the despawn face kills them
  // (distSq > 256 after the fall, R196 rules working as ported)) ----
  const mark = logTail().length;
  log('s1', 'summon etim:revenant');
  log('s1', rcon(`summon etim:revenant ${pos(2, 0)}`));
  log('s2', 'summon etim:bonelord');
  log('s2', rcon(`summon etim:bonelord ${pos(-2, 0)}`));

  // two summon windows (20 ticks each) + the persistence row
  await sleep(12000);

  const tail = logTail().slice(mark);
  const rows = tail.split('\n').filter((l) => l.includes('[AILog]') || l.includes('[MobLog]'));
  log('rows', `${rows.length} judgment rows`);
  rows.forEach((l) => console.log('   ' + l.slice(l.indexOf('['))));

  for (const type of ['etim:revenant', 'etim:bonelord']) {
    try {
      const out = rcon(`testfor @e[type=${type}]`);
      log('count', `${type}: ${out.replace(/\n/g, ' | ')}`);
    } catch (e) {
      log('count', `${type}: not found`);
    }
  }

  // cleanup the mobs
  rcon('kill @e[type=etim:revenant]');
  rcon('kill @e[type=etim:bonelord]');
  rcon('kill @e[type=Skeleton]');
  bot.quit();
  process.exit(0);
}

main().catch((e) => { log('harness', 'FATAL:', e.message); process.exit(1); });
