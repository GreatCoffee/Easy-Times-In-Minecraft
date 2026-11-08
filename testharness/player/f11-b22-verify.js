#!/usr/bin/env node
/**
 * f11-b22-smoke.js — the R196 get-out-of-water AI (B-22) smoke driver.
 * Mirror of the B-19/B-21 driver skeleton (startBoot/stopBoot/stage shape).
 *
 * The R196 face: EntityAIGetOutOfWater :1-83 — the twin seat of the B-19
 * shelter AI at priority 4 (EntityLivestock ctor :23-24 seats BOTH; the
 * horse ctor :65-66 the same pair; the carriers ride the SAME two mixins:
 * MixinEntityAnimal four-livestock gate + MixinAbstractHorse — zero new
 * registrations). Gates per :11-21: a player rider vetoes, the 1/16 roll,
 * the livestock thirsty exclusion (water < 0.5F via the capability), then
 * isInWater() on an air-breather (EntityWaterMob excluded — C-note
 * carrier). getMovementPath :24-77 = 16 samples of dx/dz∈[-16,16] and
 * dy∈[-3,4], the ground-snap pair, the candidate door with the
 * SOLID-GROUND-below face (:48-50 = !isAirOrPassable(below, true)),
 * endpoint revalidation, shortest wins; the R196 spawn-point cover face
 * :72-74 (MITE-only; 1.12 carrier = the EntityCreature home when set).
 *
 * Judge row: [AILog] outofwater src=<kind> start … (mobDebugLog gate).
 *
 * Arms (boot 1 — livestockNeedsR196=true, mobDebugLog=true, farmDebugLog
 * on, mobDespawnR196=false IN-CFG — the B-19 r5 despawn-counter lesson):
 *   B1 water pool: 2-deep pool + shore; summon cow x3 + horse x2 IN the
 *      water -> 60s window -> >=1 outofwater start rows
 * Arms (boot 2 — livestockNeedsR196=false):  pool replay -> ZERO rows.
 *
 * C-grade skips (documented for the judge window): the thirsty face and
 * the player-rider veto have no test tokens (executeLiveMano sets manure
 * FOOD only; no water setter — the /etest token table has no needs-water
 * face; neither the smoke nor the judge window mounts a player on a cow).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b22-verify';
const WORLD = 'w-b22v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };

// the water arena: a 4×4 pool (x -74..-71, z 240..243), 2 deep, on a
// grass-pad shore
const POOL = { x0: -74, x1: -71, z0: 240, z1: 243, y0: 65, y1: 66, floor: 64 };
const PAD = { x0: -77, x1: -68, z0: 239, z1: 244, y: 67 };

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const outRows = (lines) => lines.filter((l) => l.indexOf('[AILog] outofwater') >= 0);
const startRows = (lines) => lines.filter((l) => l.indexOf('[AILog] outofwater') >= 0 && l.indexOf(' start ') >= 0);

async function buildPool() {
  // clear the whole arena column
  await cmd('fill ' + PAD.x0 + ' ' + (PAD.y + 1) + ' ' + PAD.z0 + ' '
    + PAD.x1 + ' 73 ' + PAD.z1 + ' minecraft:air', 700);
  // dig the pool: two air layers, then water
  await cmd('fill ' + POOL.x0 + ' ' + POOL.y0 + ' ' + POOL.z0 + ' '
    + POOL.x1 + ' ' + POOL.y1 + ' ' + POOL.z1 + ' minecraft:air', 500);
  await cmd('fill ' + POOL.x0 + ' ' + POOL.floor + ' ' + POOL.z0 + ' '
    + POOL.x1 + ' ' + POOL.floor + ' ' + POOL.z1 + ' minecraft:cobblestone', 400);
  await cmd('fill ' + POOL.x0 + ' ' + POOL.y0 + ' ' + POOL.z0 + ' '
    + POOL.x1 + ' ' + POOL.y1 + ' ' + POOL.z1 + ' minecraft:water', 600);
  // shore pad = a RING around the pool (solid ground for the candidate door).
  // The single full-pad fill used to cap the pool with grass at y=67: the
  // window's animals (horse 1.6 / cow 1.4 tall, feet at y=66) then had their
  // heads inside the lid, took inWall damage and died before the AI could
  // start (run-1 C-B22-2). Pool footprint stays open to the sky.
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z0 + ' '
    + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z0 + ' minecraft:grass', 400); // north strip
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + PAD.z1 + ' '
    + PAD.x1 + ' ' + PAD.y + ' ' + PAD.z1 + ' minecraft:grass', 400); // south strip
  await cmd('fill ' + PAD.x0 + ' ' + PAD.y + ' ' + (POOL.z0) + ' '
    + (POOL.x0 - 1) + ' ' + PAD.y + ' ' + (POOL.z1) + ' minecraft:grass', 400); // west strip
  await cmd('fill ' + (POOL.x1 + 1) + ' ' + PAD.y + ' ' + (POOL.z0) + ' '
    + PAD.x1 + ' ' + PAD.y + ' ' + (POOL.z1) + ' minecraft:grass', 400); // east strip
  // keep the water column intact after the rim work
  await cmd('fill ' + POOL.x0 + ' ' + POOL.y0 + ' ' + POOL.z0 + ' '
    + POOL.x1 + ' ' + POOL.y1 + ' ' + POOL.z1 + ' minecraft:water', 600);
  // put the bot on the west shore (it used to stand inside the pool and drown)
  await cmd('tp ETIM_F7 -76.5 68 242.5', 500);
}

async function summonInWater() {
  const spots = [[-73, 241], [-72, 242], [-72, 241], [-73, 242], [-71, 242]];
  const kinds = ['cow', 'cow', 'cow', 'horse', 'horse'];
  for (let i = 0; i < spots.length; i++) {
    const [x, z] = spots[i];
    await cmd('summon ' + kinds[i] + ' ' + (x + 0.5) + ' ' + (POOL.y0 + 1) + ' ' + (z + 0.5), 500);
  }
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

const crypto = require('crypto');
function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
}

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true });
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props)
    ? L.setProp(props, 'level-name', world)
    : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting, no collide boot');
    s = await L.startServer({ root: L.ROOT, tag });
    const done = await s.waitFor(/Done \(/, 480000);
    if (done) return s;
    try { await s.stop(30000); } catch (e) { /* noop */ }
    s = null;
  }
  throw new Error(tag + ': no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });
}

async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 0, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('gamerule doMobLoot true', 300);
  await cmd('time set 6000', 400);
  await cmd('etest rain set 0.0', 500);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

(async () => {
  stampPin();
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDebugLog: true, farmDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // B1: the water pool arm
  {
    await buildPool();
    await summonInWater();
    const k = srv.all.length;
    await sleep(120000);
    const rows = outRows(since(k));
    ev.arms.b1 = {
      n: startRows(rows).length,
      rows: rows.slice(0, 10),
      cowsLeft: null,
    };
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, mobDebugLog: true, farmDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // C1: the pool replay, flag off — ZERO outofwater rows
  {
    await buildPool();
    await summonInWater();
    const k = srv.all.length;
    await sleep(30000);
    // r2 lesson: the probe-in rows print regardless of the flag (the gate
    // chain stays observable on BOTH boots) — the negative control counts
    // START rows only, not the probe diagnostics
    ev.arms.c1 = { n: startRows(since(k)).length };
    await sweep();
  }

  // close boot 2 as well (a live second server holds 25565 and keeps the
  // mineflayer socket alive — B-16 C-B16-6 / B-17 C-B17-3 lessons)
  await stopBoot();

  ev.verdicts.w0 = ev.boots.length === 2
    && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot))
    && ev.stopBoots.length >= 2
    && ev.stopBoots.every((b) => b.exited === true && b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL';
  ev.verdicts.w1 = ev.arms.b1.n >= 1 ? 'PASS' : 'FAIL'; // the flag-on pool window rings >=1 start row
  ev.verdicts.w2 = ev.arms.c1.n === 0 ? 'PASS' : 'FAIL'; // the flag-off replay stays silent on start rows

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || !(ev.arms.b1.n >= 1)
    || ev.arms.c1.n !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  stampPin();
  const fails = Object.entries(ev.verdicts).filter(([, v]) => v !== 'PASS');
  console.log('[done] ' + JSON.stringify({
    b1: ev.arms.b1.n, b1rows: ev.arms.b1.rows.length,
    c1: ev.arms.c1.n,
  }));
  // mineflayer/socket loops keep the process alive; exit explicitly
  setTimeout(() => process.exit((bad || fails.length) ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) { bot.quit(); bot = null; } } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
