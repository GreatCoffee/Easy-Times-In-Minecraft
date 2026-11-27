#!/usr/bin/env node
/**
 * f11-b19-smoke.js — R196 rain-family residual (B-19) smoke driver.
 *
 * Two debts (playground/audit/rain-shelter-立项摸底.md):
 *   F-A mycelium rain-death  — R196 BlockMycelium.updateTick :119-121:
 *     daylight mycelium dies to dirt unless (non-freezing) rain falls;
 *     the umbrella door (:64, light<=13 && !isOutdoors proxy canSeeSky)
 *     keeps dark/indoor sites alive forever. Row = [FarmLog] mycelium
 *     src=rainDeath (farmDebugLog gate, the blight-row family shape).
 *   F-B shelterseek AI       — R196 EntityAISeekShelterFromRain (1/16 roll,
 *     livestock thirsty cut, isInRain entity-face; seats prio4 four
 *     livestock + horse, prio4 villager 0.6F, prio4 snowman, prio2 blaze).
 *     Row = [AILog] shelterseek src=… start (mobDebugLog gate, the B-11
 *     foodseek row family).
 *
 * Arms (boot 1 — livestockNeedsR196=true, farmDebugLog=true, mobDebugLog=true):
 *   A1 day+no-rain open mycelium 12x12  -> >=1 src=rainDeath row
 *   A2 day+rain  fresh refill          -> 0 rainDeath rows (rain shield)
 *   A3 night    + no-rain, fresh       -> 0 rainDeath rows (daytime gate)
 *   A4 day+no-rain roofed             -> 0 rainDeath rows (umbrella gate)
 *   B1 day+rain cows x8 on open pad + dry roof cells nearby -> >=1
 *      shelterseek start row (the AI rates a dry cell and walks)
 * Arms (boot 2 — livestockNeedsR196=false):
 *   C1 the mycelium death-face replay (day+no-rain) -> 0 rows
 *   C2 the shelterseek replay (day+rain cows)       -> 0 rows
 *
 * Judgment tokens: /etest rain set <s> (C-16 batch, the snap-face field
 * write; `weather rain` is pulled back by the ETIM schedule stack),
 * /time set <t> for the daylight band. rts=512 (stage) makes random ticks
 * hit the 12x12 layer at ~18 selections/tick — the A-arms windows stay
 * short (8 s).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b19-smoke';
const WORLD = 'w-b19a';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };

// the mycelium work patch: 12x12, y=67, spanning x -78..-67 / z 238..249
// (covering the b18 pen circle; fully open sky above)
const PATCH = { x0: -78, x1: -67, z0: 238, z1: 249, y: 67 };
// the dry-cover roof for the AI arm: 5x5 at y70 over x -76..-72 / z 240..244
const ROOF = { x0: -76, x1: -72, z0: 240, z1: 244, y: 70 };

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
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

function refillPatch() {
  return cmd('fill ' + PATCH.x0 + ' ' + PATCH.y + ' ' + PATCH.z0 + ' '
    + PATCH.x1 + ' ' + PATCH.y + ' ' + PATCH.z1 + ' minecraft:mycelium', 600);
}

async function buildPatch() {
  // clear the column band above the patch so the sky line is clean
  await cmd('fill ' + PATCH.x0 + ' ' + (PATCH.y + 1) + ' ' + PATCH.z0 + ' '
    + PATCH.x1 + ' ' + (PATCH.y + 7) + ' ' + PATCH.z1 + ' minecraft:air', 600);
  await refillPatch();
}

async function layerRoof() {
  await cmd('fill ' + ROOF.x0 + ' ' + ROOF.y + ' ' + ROOF.z0 + ' '
    + ROOF.x1 + ' ' + ROOF.y + ' ' + ROOF.z1 + ' minecraft:stone', 500);
}

// r4 lesson: a flat 12x12 cover leaves the whole interior at light=14+
// (skylight back-fills through the 2-high corridor from every open edge —
// R196's umbrella tolerance is 13, so theEDGE band correctly DIES; only a
// SEALED pocket proves the umbrella face). The A4 arm builds a sealed
// 5x5-core stone chamber (walls y68..70, roof y71) over the patch center
// and asserts ZERO death rows in the core (x -74..-70, z 240..244).
const CHAMBER = { wx0: -75, wx1: -69, wz0: 239, wz1: 245, y: 71 };

async function buildChamber() {
  // interior air first
  await cmd('fill -74 68 240 -70 70 244 minecraft:air', 400);
  // walls on 4 sides, y68..70
  await cmd('fill -75 68 239 -69 70 239 minecraft:stone', 400);
  await cmd('fill -75 68 245 -69 70 245 minecraft:stone', 400);
  await cmd('fill -75 68 240 -75 70 244 minecraft:stone', 400);
  await cmd('fill -69 68 240 -69 70 244 minecraft:stone', 400);
  // roof
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

// r1 lesson 1: `rain set` SNAPS the strength but the ETIM weather clock
// keeps draining (1.0 -> 0.43 in 1.2 s, 0.46/s — CommandDevTest 案底) —
// the >0.2 gate lives ~1.7 s. The C-16 driver rule: re-send the snap
// token THROUGH the window (same-batch refresh).
async function rainWindow(secs) {
  const end = Date.now() + secs * 1000;
  while (Date.now() < end) {
    await cmd('etest rain set 1.0', 400);
  }
}

async function dropRoof() {
  await cmd('fill ' + ROOF.x0 + ' ' + ROOF.y + ' ' + ROOF.z0 + ' '
    + ROOF.x1 + ' ' + ROOF.y + ' ' + ROOF.z1 + ' minecraft:air', 500);
}

async function summonCows(n) {
  // r5 lesson: the 5x5 roof (STAND±2) directly shadows the ±1/±2 spawn
  // spots — cows start DRY and never fire the AI. Spawn at ±3..±5, inside
  // the patch band but OUTSIDE the roof rect (x -76..-72 / z 240..244).
  const spots = [[3, 0], [-3, 0], [0, 3], [0, -3], [4, 3], [-4, -3], [3, -4], [-3, 4]];
  for (let i = 0; i < n; i++) {
    const s = spots[i % spots.length];
    await cmd('summon cow ' + (STAND.x + s[0]) + ' ' + STAND.y + ' ' + (STAND.z + s[1]), 450);
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

const WINDOW_DEATH = 8000;  // rts512 — 18 hits/tick expected; 8 s is ample
const WINDOW_SEEK = 16000;  // 1/16 per AI tick per cow, 8 cows — E>>1

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, mobDespawnR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: daylight, no rain — the death face fires
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await dropRoof();
    await refillPatch();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    ev.arms.a1 = { n: deathRows(since(k)).length, rows: deathRows(since(k)).slice(0, 8) };
    await sweep();
  }

  // A2: daylight, NON-FREEZING rain — the survival seat holds the site
  {
    await cmd('time set 1000', 400);
    await buildPatch(); // refill the fresh sites first; rain power comes via the refresh loop
    await cmd('etest rain set 1.0', 500);
    const k = srv.all.length;
    await rainWindow(WINDOW_DEATH / 1000);
    ev.arms.a2 = { n: deathRows(since(k)).length, rows: deathRows(since(k)).slice(0, 8) };
    await sweep();
  }

  // A3: night, no rain — the daylight gate blocks the face
  {
    await cmd('time set 18000', 400);
    await cmd('etest rain set 0.0', 500);
    await refillPatch();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    ev.arms.a3 = { n: deathRows(since(k)).length, rows: deathRows(since(k)).slice(0, 8) };
    await sweep();
  }

  // A4: daylight, no rain, SEALED CHAMBER over the patch center — the
  // umbrella face keeps the 5x5 core alive (light 0 / no sky under a fully
  // enclosed stone pocket); the exposed ring still dies (that death is
  // the a1 face and is NOT part of this arm's count — the assert only
  // reads the core rows).
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await refillPatch();
    await buildChamber();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    const rows = deathRows(since(k));
    ev.arms.a4 = {
      n: rows.length,
      coreN: rows.filter(inChamberCore).length,
      coreRows: rows.filter(inChamberCore).slice(0, 8),
      rows: rows.slice(0, 8),
    };
    await clearChamber();
    await sweep();
  }

  // B1: day, continuous rain, cows on the open pad + dry cells under
  // the roof — the AI must rate (at least once) a dry candidate and start
  // the path. Rain refresh loop keeps the >0.2 gate alive the whole window.
  {
    await cmd('time set 1000', 400);
    await layerRoof();
    const k = srv.all.length;
    await summonCows(8);
    await rainWindow(WINDOW_SEEK / 1000);
    ev.arms.b1 = { n: seekRows(since(k)).length, rows: seekRows(since(k)).slice(0, 10) };
    await dropRoof();
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, mobDespawnR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // C1: the death-face replay, flag off
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await dropRoof();
    await refillPatch();
    const k = srv.all.length;
    await sleep(WINDOW_DEATH);
    ev.arms.c1 = { n: deathRows(since(k)).length };
    await sweep();
  }

  // C2: the shelterseek replay, flag off
  {
    await cmd('time set 1000', 400);
    await layerRoof();
    const k = srv.all.length;
    await summonCows(8);
    await rainWindow(WINDOW_SEEK / 1000);
    ev.arms.c2 = { n: seekRows(since(k)).length, rows: seekRows(since(k)).slice(0, 6) };
    await dropRoof();
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const a1Ok = ev.arms.a1.n >= 1;
  const a2Ok = ev.arms.a2.n === 0;
  const a3Ok = ev.arms.a3.n === 0;
  const a4Ok = ev.arms.a4.coreN === 0;
  const b1Ok = ev.arms.b1.n >= 1;
  const bootOk = ev.boots.length === 2 && ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot));
  const stopOk = ev.stopBoots.length >= 2 && ev.stopBoots.every((b) => b.exited === true && b.exitCode === 0 && b.build === true);
  const bad = !(bootOk && stopOk && a1Ok && a2Ok && a3Ok && a4Ok && b1Ok && ev.arms.c1.n === 0 && ev.arms.c2.n === 0);

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a2: ev.arms.a2.n, a3: ev.arms.a3.n,
    a4: ev.arms.a4.coreN, a4open: ev.arms.a4.n, b1: ev.arms.b1.n,
    c1: ev.arms.c1.n, c2: ev.arms.c2.n,
    boots: ev.boots, stopBoots: ev.stopBoots,
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
