#!/usr/bin/env node
/**
 * f11-b19-verify.js — R196 rain-family residual (B-19) JUDGE driver.
 * Mirror of f11-b19-smoke.js (r6 green build) with judge-window
 * conventions: world w-b19v, [PIN] stamps (mkCounts + release sha)
 * before/after, per-arm W-marker rows, [done] verdict summary — NO
 * judgment-value drift from the smoke (r6 green).
 *
 * Faces:
 *   F-A mycelium rain-death — [FarmLog] mycelium src=rainDeath …
 *     light=… rain=… freezing=… sky=… (farmDebugLog gate)
 *   F-B shelterseek — [AILog] shelterseek src=<kind> start speed=…
 *     entity=… (mobDebugLog gate, the B-11 foodseek row family)
 *
 * Arms (boot 1 — livestockNeedsR196=true, mobDespawnR196=false,
 *       farmDebugLog=true, mobDebugLog=true):
 *   W1 day+no-rain open refill -> n>=1 src=rainDeath rows, every row
 *      freezing=false (the daylight death face)
 *   W2 day+continuous rain (rainWindow clock refresh) -> 0 rows
 *   W3 night, no rain -> 0 rows
 *   W4 day+no-rain SEALED 5x5 stone chamber over the patch center ->
 *      0 core rows (x -74..-70 / z 240..244); open ring rows may appear
 *      and are companion proofs (NOT counted against)
 *   W5 day+continuous rain, cows x8 at ±3..±5 (OUTSIDE the 5x5 roof,
 *      inside the patch band) -> >=1 shelterseek start rows
 * Arms (boot 2 — livestockNeedsR196=false):
 *   W6 death-face replay -> 0 rows
 *   W7 seek replay (cows x8) -> 0 rows
 *
 * cfg pairs: mobDespawnR196=false keeps the smoke r6 lesson (the R196
 * despawn counter ate the cows in r3-r5 — probe-in inv=16-31 = 48-93
 * ticks) — this is the TEST face, not a judgment value.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b19-verify';
const WORLD = 'w-b19v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };

// the mycelium work patch: 12x12, y=67, spanning x -78..-67 / z 238..249
const PATCH = { x0: -78, x1: -67, z0: 238, z1: 249, y: 67 };
// the dry-cover roof for the AI arm: 5x5 at y70 over x -76..-72 / z 240..244
const ROOF = { x0: -76, x1: -72, z0: 240, z1: 244, y: 70 };

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const deathRows = (lines) => lines.filter((l) => l.indexOf('mycelium src=rainDeath') >= 0);
// the B-19 face rows only — " probe" rows (probe/probe-in/ctor) are the
// temporary diagnostics and never count as faces
const seekRows = (lines) => lines.filter((l) => l.indexOf('shelterseek') >= 0 && l.indexOf(' probe') < 0);
const seekStartRows = (lines) => seekRows(lines).filter((l) => l.indexOf(' start ') >= 0);

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
}

function refillPatch() {
  return cmd('fill ' + PATCH.x0 + ' ' + PATCH.y + ' ' + PATCH.z0 + ' '
    + PATCH.x1 + ' ' + PATCH.y + ' ' + PATCH.z1 + ' minecraft:mycelium', 600);
}

async function buildPatch() {
  await cmd('fill ' + PATCH.x0 + ' ' + (PATCH.y + 1) + ' ' + PATCH.z0 + ' '
    + PATCH.x1 + ' ' + (PATCH.y + 7) + ' ' + PATCH.z1 + ' minecraft:air', 600);
  await refillPatch();
}

async function layerRoof() {
  await cmd('fill ' + ROOF.x0 + ' ' + ROOF.y + ' ' + ROOF.z0 + ' '
    + ROOF.x1 + ' ' + ROOF.y + ' ' + ROOF.z1 + ' minecraft:stone', 500);
}

async function dropRoof() {
  await cmd('fill ' + ROOF.x0 + ' ' + ROOF.y + ' ' + ROOF.z0 + ' '
    + ROOF.x1 + ' ' + ROOF.y + ' ' + ROOF.z1 + ' minecraft:air', 500);
}

// r4 lesson: a flat 12x12 cover leaves the whole interior at light=14+
// (R196's umbrella tolerance is 13 — the edge band correctly DIES; only a
// SEALED pocket proves the umbrella face). A4 arm builds a sealed 5x5-core
// stone chamber (walls y68..70, roof y71) over the patch center and reads
// ZERO death rows in the core (x -74..-70, z 240..244).
const CHAMBER = { wx0: -75, wx1: -69, wz0: 239, wz1: 245, y: 71 };

async function buildChamber() {
  await cmd('fill -74 68 240 -70 70 244 minecraft:air', 400);
  await cmd('fill -75 68 239 -69 70 239 minecraft:stone', 400);
  await cmd('fill -75 68 245 -69 70 245 minecraft:stone', 400);
  await cmd('fill -75 68 240 -75 70 244 minecraft:stone', 400);
  await cmd('fill -69 68 240 -69 70 244 minecraft:stone', 400);
  await cmd('fill ' + CHAMBER.wx0 + ' ' + CHAMBER.y + ' ' + CHAMBER.wz0 + ' '
    + CHAMBER.wx1 + ' ' + CHAMBER.y + ' ' + CHAMBER.wz1 + ' minecraft:stone', 500);
}

async function clearChamber() {
  await cmd('fill -75 68 239 -69 71 245 minecraft:air', 600);
}

const inChamberCore = (l) => {
  const m = l.match(/pos=(-\d+),67,(\d+)/);
  return m && Number(m[1]) >= -74 && Number(m[1]) <= -70 && Number(m[2]) >= 240 && Number(m[2]) <= 244;
};

async function summonCows(n) {
  const spots = [[3, 0], [-3, 0], [0, 3], [0, -3], [4, 3], [-4, -3], [3, -4], [-3, 4]];
  for (let i = 0; i < n; i++) {
    const s = spots[i % spots.length];
    await cmd('summon cow ' + (STAND.x + s[0]) + ' ' + STAND.y + ' ' + (STAND.z + s[1]), 450);
  }
}

// r1 lesson 1: `rain set` SNAPS the strength but the ETIM weather clock
// keeps draining (1.0 -> 0.43 in 1.2 s, 0.46/s) — re-send the snap token
// THROUGH the window (C-16 driver rule).
async function rainWindow(secs) {
  const end = Date.now() + secs * 1000;
  while (Date.now() < end) {
    await cmd('etest rain set 1.0', 400);
  }
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
  await cmd('fill ' + (STAND.x - 6) + ' ' + STAND.y + ' ' + (STAND.z - 6) + ' '
    + (STAND.x + 6) + ' ' + STAND.y + ' ' + (STAND.z + 6) + ' minecraft:cobblestone', 600);
  await buildPatch();
  await cmd('gamerule doMobLoot true', 300);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

const WINDOW_DEATH = 8000;
const WINDOW_SEEK = 16000;

(async () => {
  stampPin();

  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, {
    livestockNeedsR196: true, mobDespawnR196: false,
    farmDebugLog: true, mobDebugLog: true,
  });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // W1: daylight, no rain — the death face fires
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await dropRoof();
    await refillPatch();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    const rows = deathRows(since(k));
    ev.arms.w1 = { n: rows.length, rows: rows.slice(0, 8) };
    await sweep();
  }

  // W2: daylight, NON-FREEZING rain — the survival seat holds the site
  {
    await cmd('time set 1000', 400);
    await buildPatch();
    await cmd('etest rain set 1.0', 500);
    const k = srv.all.length;
    await rainWindow(WINDOW_DEATH / 1000);
    ev.arms.w2 = { n: deathRows(since(k)).length, rows: deathRows(since(k)).slice(0, 8) };
    await sweep();
  }

  // W3: night, no rain — the daylight gate blocks the face
  {
    await cmd('time set 18000', 400);
    await cmd('etest rain set 0.0', 500);
    await refillPatch();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    ev.arms.w3 = { n: deathRows(since(k)).length, rows: deathRows(since(k)).slice(0, 8) };
    await sweep();
  }

  // W4: daylight, no rain, SEALED CHAMBER — the umbrella face keeps the core
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await refillPatch();
    await buildChamber();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    const rows = deathRows(since(k));
    ev.arms.w4 = {
      n: rows.length,
      coreN: rows.filter(inChamberCore).length,
      coreRows: rows.filter(inChamberCore).slice(0, 8),
      rows: rows.slice(0, 8),
    };
    await clearChamber();
    await sweep();
  }

  // W5: day, continuous rain, cows at ±3..±5 (outside the roof, in the rain)
  // — the AI must rate a dry candidate and start the path
  {
    await cmd('time set 1000', 400);
    await layerRoof();
    const k = srv.all.length;
    await summonCows(8);
    await rainWindow(WINDOW_SEEK / 1000);
    ev.arms.w5 = { n: seekRows(since(k)).length, starts: seekStartRows(since(k)).length, rows: seekRows(since(k)).slice(0, 10) };
    await dropRoof();
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, {
    livestockNeedsR196: false, mobDespawnR196: false,
    farmDebugLog: true, mobDebugLog: true,
  });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // W6: the death-face replay, flag off
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await dropRoof();
    await refillPatch();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    ev.arms.w6 = { n: deathRows(since(k)).length };
    await sweep();
  }

  // W7: the seek replay, flag off
  {
    await cmd('time set 1000', 400);
    await layerRoof();
    const k = srv.all.length;
    await summonCows(8);
    await rainWindow(WINDOW_SEEK / 1000);
    ev.arms.w7 = { n: seekRows(since(k)).length, rows: seekRows(since(k)).slice(0, 6) };
    await dropRoof();
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  // verdicts (hard gates in-driver)
  const w1Rows = (ev.arms.w1.rows || []);
  ev.verdicts.w1 = ev.arms.w1.n >= 1 && w1Rows.every((r) => r.indexOf('freezing=false') >= 0) ? 'PASS' : 'FAIL';
  ev.verdicts.w2 = ev.arms.w2.n === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w3 = ev.arms.w3.n === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w4 = ev.arms.w4.coreN === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w5 = ev.arms.w5.starts >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w6 = ev.arms.w6.n === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w7 = ev.arms.w7.n === 0 ? 'PASS' : 'FAIL';
  const bootOk = ev.boots.length === 2
    && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot));
  const stopOk = ev.stopBoots.length >= 2
    && ev.stopBoots.every((b) => b.exited === true && b.exitCode === 0 && b.build === true);
  ev.verdicts.w0 = bootOk && stopOk ? 'PASS' : 'FAIL';

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  stampPin();
  console.log('[out] ' + fsOut);
  const fails = Object.entries(ev.verdicts).filter(([, v]) => v !== 'PASS');
  console.log('[done] ' + JSON.stringify({
    verdicts: ev.verdicts,
    w1: ev.arms.w1.n, w2: ev.arms.w2.n, w3: ev.arms.w3.n,
    w4: ev.arms.w4.coreN, w4open: ev.arms.w4.n,
    w5: ev.arms.w5.starts, w6: ev.arms.w6.n, w7: ev.arms.w7.n,
  }));
  setTimeout(() => process.exit(fails.length ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
