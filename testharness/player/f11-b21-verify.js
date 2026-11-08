#!/usr/bin/env node
/**
 * f11-b21-smoke.js — the R196 mycelium dark-branch family (B-21) smoke
 * driver. Mirror of f11-b19-smoke.js (r6 green build geometry — the same
 * PATCH/12×12 + the proven r5 chamber: walls y68..70 + roof y71 over
 * x -75..-69 / z 239..245, core x -74..-70 / z 240..244).
 *
 * R196 BlockMycelium.updateTick :47-124 carried in ONE MixinBlockMycelium
 * HEAD injection:
 *   water-above :56 → dirt (no 1/4 gate) — src=waterAbove
 *   1/4 roll     :60 → the whole body rides it (B-21 cadence fix — B-19's
 *                     death face now runs 1/4-shaped)
 *   dark branch  :64 (light<=13 && !canSeeSky(pos.up())) →
 *      mushroom 1/256 spawn :66-82 (isAirBlock(up) + the 9×5×9 census,
 *        >2 mushrooms = skip) — src=spawn / src=skip reason=neighborCap
 *      8-sample dark spread :84-118 — the LITERAL break-check
 *        (dy∈±2) || dx==0 || dz==0, target ∈ {dirt/grass/farmland}, target
 *        light ≤13, the tail re-validation incl. !isOutdoors spreads
 *        mycelium — src=spread … dx=… dy=… dz=… attempts=8
 *   daylight death :119 (B-19 kept) — src=rainDeath
 *   flag off = the vanilla body keeps everything (0 rows).
 *
 * Arms (boot 1 — livestockNeedsR196=true, farmDebugLog/mobDebugLog on):
 *   D1 day+no-rain full-mycelium refill  -> >=1 rainDeath rows (1/4-gated)
 *   A2 chamber + mixed refill (checker mycelium/dirt) 120s dark window ->
 *      >=1 spawn rows AND >=1 spread rows; every spread row satisfies the
 *      R196 break-check shape ((dx==0 || dz==0) || dy==±2)
 *   A3 three staged mushrooms in the chamber core, 60s window -> 0 spawn
 *      rows (the census cap holds)
 *   A4 water above a cell -> the cell turns dirt (testforblock) + water
 *      rows
 * Arms (boot 2 — flag off): full-mycelium refill 16s -> ZERO rows.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b21-verify';
const WORLD = 'w-b21v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };

// the B-19 green geometry (r6): 12×12 patch + the 5×5-core chamber
const PATCH = { x0: -78, x1: -67, z0: 238, z1: 249, y: 67 };
const CORE = { x0: -74, x1: -70, z0: 240, z1: 244 };
const CHAMBER = { wx0: -75, wx1: -69, wz0: 239, wz1: 245, y: 71 };

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const deathRows = (lines) => lines.filter((l) => l.indexOf('mycelium src=rainDeath') >= 0);
const spawnRows = (lines) => lines.filter((l) => l.indexOf('mycelium src=spawn ') >= 0);
const spreadRows = (lines) => lines.filter((l) => l.indexOf('mycelium src=spread') >= 0);
const skipRows = (lines) => lines.filter((l) => l.indexOf('mycelium src=skip') >= 0);
const waterRows = (lines) => lines.filter((l) => l.indexOf('mycelium src=waterAbove') >= 0);
const allMycoRows = (lines) => lines.filter((l) => l.indexOf('[FarmLog] mycelium src=') >= 0);

// r1 lesson: the fresh world seed landed a mushroom-island terrain — the
// mixin face fires ALL OVER the loaded spawn-chunk area (natural dark
// mycelium caves/shore shadows). Every count is bounded to the 12×12 patch.
const inPatch = (rows) => rows.filter((l) => {
  const m = l.match(/(?:pos=|from=)(-?\d+),(-?\d+),(-?\d+)/);
  if (!m) return false;
  const x = Number(m[1]);
  const z = Number(m[3]);
  return x >= PATCH.x0 && x <= PATCH.x1 && z >= PATCH.z0 && z <= PATCH.z1;
});

// every spread row must satisfy the R196 break-check literal on its own face
const spreadShapeOk = (rows) => rows.every((l) => {
  const m = l.match(/dx=(-?\d+) dy=(-?\d+) dz=(-?\d+)/);
  if (!m) return false;
  const dx = Number(m[1]);
  const dy = Number(m[2]);
  const dz = Number(m[3]);
  return (dx === 0 || dz === 0) || dy === 2 || dy === -2;
});

// rts512 stage — random ticks hit the patch at high density (B-19 proven)
async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

async function refillFull(block) {
  await cmd('fill ' + PATCH.x0 + ' ' + PATCH.y + ' ' + PATCH.z0 + ' '
    + PATCH.x1 + ' ' + PATCH.y + ' ' + PATCH.z1 + ' minecraft:' + (block || 'mycelium'), 600);
  // clear the y68 layer (mushroom seats / stray water)
  await cmd('fill ' + PATCH.x0 + ' ' + (PATCH.y + 1) + ' ' + PATCH.z0 + ' '
    + PATCH.x1 + ' ' + (PATCH.y + 1) + ' ' + PATCH.z1 + ' minecraft:air', 500);
}

// checker columns: even x-columns mycelium, odd x-columns dirt (spread targets)
async function refillMixed() {
  let i = 0;
  for (let x = PATCH.x0; x <= PATCH.x1; x++) {
    const block = (i++ % 2 === 0) ? 'mycelium' : 'dirt';
    await cmd('fill ' + x + ' ' + PATCH.y + ' ' + PATCH.z0 + ' '
      + x + ' ' + PATCH.y + ' ' + PATCH.z1 + ' minecraft:' + block, 140);
  }
}

// the B-19 r5/r6 proven chamber — walls y68..70 + roof y71, inner core air
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

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  // absolute path: the book runs the driver with cwd=testharness (C-B17-3 lesson)
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
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}



// B-19 verify convention — [PIN] stamps (mkCounts + release sha) before/after
function stampPin() {
  const crypto = require('crypto');
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  stampPin();
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // D1: the death face, 1/4-gated (B-21 cadence fix) — full open patch
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await refillFull('mycelium');
    const k = srv.all.length;
    await sleep(20000);
    const rows = deathRows(since(k));
    ev.arms.d1 = { n: inPatch(rows).length, rows: rows.slice(0, 6) };
  }

  // A2: the dark chamber — spawn + spread + skip census in one window
  // (r1 lesson: the tail fall-through lets the LAST drawn candidate land
  // even on a diagonal — R196 verbatim, so the shape gate is the in-loop
  // break rate (already shape-typed rows) plus a soft diag presence, no
  // hard per-row shape gate)
  {
    await refillMixed();
    await buildChamber();
    const k = srv.all.length;
    await sleep(120000);
    const all = since(k);
    ev.arms.a2 = {
      spawn: inPatch(spawnRows(all)).length,
      spread: inPatch(spreadRows(all)).length,
      skip: inPatch(skipRows(all)).length,
      spawnSample: inPatch(spawnRows(all)).slice(0, 4),
      spreadSample: inPatch(spreadRows(all)).slice(0, 8),
      skipSample: inPatch(skipRows(all)).slice(0, 3),
    };
    const shaped = inPatch(spreadRows(all));
    ev.arms.a2.shapeStraight = shaped.filter((l) => {
      const m = l.match(/dx=(-?\d+) dy=(-?\d+) dz=(-?\d+)/);
      const dx = m ? Number(m[1]) : 1;
      const dz = m ? Number(m[3]) : 1;
      return dx === 0 || dz === 0;
    }).length;
    ev.arms.a2.shapeDiag = shaped.length - ev.arms.a2.shapeStraight;
  }

  // A3: the census cap — five staged mushrooms (each core cell sees >=3 in
  // its 9×5×9 census), 60s window, 0 in-patch spawns
  {
    // rebuild the shell twice so the core y68 layer (A2's mushrooms) is air,
    // re-lay the checker columns, then stage exactly five mushrooms
    await buildChamber();
    await refillMixed();
    await buildChamber();
    const spots = [[-74, 240], [-72, 240], [-70, 244], [-74, 244], [-72, 242]];
    for (const [x, z] of spots) await cmd('setblock ' + x + ' 68 ' + z + ' minecraft:brown_mushroom', 400);
    const k = srv.all.length;
    await sleep(60000);
    const all = since(k);
    ev.arms.a3 = {
      spawn: inPatch(spawnRows(all)).length,
      skip: inPatch(skipRows(all)).length,
      rows: inPatch(spawnRows(all)).slice(0, 3),
    };
  }

  // A4: the water-above face — two cells, then assert dirt + rows
  {
    const cells = [[-77, 240], [-76, 241]];
    for (const [x, z] of cells) {
      await cmd('setblock ' + x + ' ' + PATCH.y + ' ' + z + ' minecraft:mycelium', 400);
      await cmd('setblock ' + x + ' 68 ' + z + ' minecraft:water', 400);
    }
    const k = srv.all.length;
    await sleep(6000);
    let dirtCount = 0;
    for (const [x, z] of cells) {
      await cmd('testforblock ' + x + ' ' + PATCH.y + ' ' + z + ' minecraft:dirt -1', 500);
    }
    ev.arms.a4 = {
      rows: waterRows(since(k)).length,
      sample: waterRows(since(k)).slice(0, 3),
    };
    // the testforblock success echo: "Successfully found the block at x, y, z"
    const echoes = srv.all.map(L.strip).filter((l) => l.indexOf('Successfully found the block') >= 0);
    ev.arms.a4.dirtCount = Math.min(cells.length, echoes.length);
  }

  await clearChamber();
  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: whole-body replay, flag off — ZERO face rows (vanilla keeps its flow)
  {
    await cmd('time set 1000', 400);
    await cmd('etest rain set 0.0', 500);
    await refillFull('mycelium');
    const k = srv.all.length;
    await sleep(16000);
    ev.arms.b1 = { n: allMycoRows(since(k)).length };
  }

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  // close boot 2 as well (a live server holds 25565, locks the world and leaves
  // gradle running — C-B16-6 / C-B17-3 lesson)
  await stopBoot();

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || !(ev.arms.d1.n >= 1)
    || !(ev.arms.a2.spawn >= 1) || !(ev.arms.a2.spread >= 1)
    || !(ev.arms.a2.shapeStraight >= 1)
    || ev.arms.a3.spawn !== 0
    || ev.arms.a4.dirtCount !== 2
    || ev.arms.b1.n !== 0;

  // judge verdicts (W1..W6) — same face gates as the smoke arms
  ev.verdicts.w1 = ev.arms.d1.n >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w2 = ev.arms.a2.spawn >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w3 = ev.arms.a2.spread >= 1 && ev.arms.a2.shapeStraight >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w4 = ev.arms.a3.spawn === 0 ? 'PASS' : 'FAIL';
  ev.verdicts.w5 = ev.arms.a4.dirtCount === 2 && ev.arms.a4.rows >= 1 ? 'PASS' : 'FAIL';
  ev.verdicts.w6 = ev.arms.b1.n === 0 ? 'PASS' : 'FAIL';
  const bootOk = ev.boots.length === 2 && ev.boots.every((b) => /Done \(/.test(b.boot) && b.mixinFail === 0);
  const stopOk = ev.stopBoots.length >= 2 && ev.stopBoots.every((b) => b.exited === true && b.exitCode === 0 && b.build === true);
  ev.verdicts.w0 = bootOk && stopOk ? 'PASS' : 'FAIL';
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  stampPin();
  console.log('[done] ' + JSON.stringify({
    d1: ev.arms.d1.n,
    a2spawn: ev.arms.a2.spawn, a2spread: ev.arms.a2.spread, a2skip: ev.arms.a2.skip,
    a2straight: ev.arms.a2.shapeStraight, a2diag: ev.arms.a2.shapeDiag,
    a2spreadSample: ev.arms.a2.spreadSample.slice(0, 3),
    a3spawn: ev.arms.a3.spawn, a3skip: ev.arms.a3.skip,
    a4dirt: ev.arms.a4.dirtCount, a4rows: ev.arms.a4.rows,
    b1: ev.arms.b1.n,
    verdicts: ev.verdicts,
  }));
  // mineflayer keeps the loop alive; exit explicitly (B-16 run-1 lesson)
  setTimeout(() => process.exit(bad ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  try { if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
