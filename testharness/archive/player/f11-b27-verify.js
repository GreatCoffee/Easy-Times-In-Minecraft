#!/usr/bin/env node
/**
 * f11-b27-verify.js — R196 avoid-predator arm (B-27) smoke driver. The
 * predator-distancer: a cow faces a zombie/wolf, keeps the ≥256sqrt door,
 * and the LONGEST-from-predators path is committed. Judge pattern from the
 * B-19..B-26 line: two boots (flag on / flag off), driver-managed world,
 * cfg gates (livestockNeedsR196/farmDebugLog/mobDebugLog true;
 * mobDespawnR196 false), [done] summary JSON.
 *
 * Arms (boot 1 — flag on, despawn off):
 *   A1 cow + zombie predator at ~6 blocks (in-scan, under the sqrt-16
 *      door): >=1 avoidpred start rows (dist=… speed=1.0 in the start rows
 *      is the long-rank arm committing a path away) within 120 s.
 *   A2 cow + wolf predator (the wild-wolf marriage face — zombies and
 *      wolves both ride the R196 preysUpon port): same door; >=1 start.
 *   A3 cow SOLO (no predator, the negative mirror): ZERO avoidpred ROLLS
 *      with shouldExecute true — the probe shows near=false; zero starts
 *      is judged by the probe arm alone.
 * Arms (boot 2 — flag off):
 *   B1 whole replay, flag off (probes too: the flag gate sits before the
 *      probe, so probe-in vanishes as well) → 0 rows.
 *
 * Geometry: STAND (-72,67,242) — the B-19..B-26 studio patch (pad y67);
 * cows at the pad center; predators held by NoAI at their summon point
 * (the movemeless sentinel still enters the scan box — R196's predator
 * list is positional, not
 * behaviour-owned).
 */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b27-verify';
const WORLD = 'w-b27v';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
const prodPreys = [];

const avoidRows = (lines) => lines.filter((l) => l.indexOf('avoidpred') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);
const probeRows = (lines) => lines.filter((l) => l.indexOf('avoidpred') >= 0 && l.indexOf(' probe-in ') >= 0);

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

function stampPin() {
  const jar = path.join('..', 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
}

async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 3, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('fill -78 66 238 -67 66 249 minecraft:cobblestone', 500);
  await cmd('fill -78 67 238 -67 70 249 minecraft:air', 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('tp ' + A + ' -76.5 68 ' + (STAND.z + 0.5), 700); // dry bank west of the field
}

async function prodSet(meter, value) {
  // the ETIM /etest prod family (B-10) — type/keys and values stay the
  // same — the ETIM_Livestock prod arm (radius key DROPPED — r1 lesson).
  await cmd('etest prod ETIM_F7 ' + meter + '=' + value, 500);
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  stampPin();
  srv = await startBoot(TAG + '-b1', WORLD, {
    livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false,
  });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: cow + zombie predator at ~6 blocks — the preysUpon face hit
  {
    await prodSet('food', '1.0');
    await prodSet('water', '1.0');
    await cmd('summon cow -72.5 67 242.5', 600);
    await sleep(700);
    const k = srv.all.length;
    await cmd('summon zombie -67.5 67 242.5 {NoAI:1b}', 600);
    await sleep(120000);
    ev.arms.a1 = {
      n: avoidRows(since(k)).length, rows: avoidRows(since(k)).slice(0, 6),
      probes: probeRows(since(k)).length,
    };
    await sweep();
  }

  // A2: cow + wild wolf — the R196 wolf marriage face
  {
    const k = srv.all.length;
    await cmd('summon cow -72.5 67 242.5', 600);
    await sleep(700);
    await cmd('summon wolf -68.5 67 242.5 {NoAI:1b}', 600);
    await sleep(120000);
    ev.arms.a2 = {
      n: avoidRows(since(k)).length, rows: avoidRows(since(k)).slice(0, 6),
      probes: probeRows(since(k)).length,
    };
    await sweep();
  }

  // A3: cow solo — the negative mirror (probe-in rows presence but no
  // predator, so the start leaves should be zero)
  {
    const k = srv.all.length;
    await cmd('summon cow -72.5 67 242.5', 600);
    await sleep(60000);
    ev.arms.a3 = { n: avoidRows(since(k)).length, probes: probeRows(since(k)).length };
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  stampPin();
  srv = await startBoot(TAG + '-b2', WORLD, {
    livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false,
  });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: whole replay, flag off — zero avoidpred rows (also zero probe rows)
  {
    const k = srv.all.length;
    await cmd('summon cow -72.5 67 242.5', 600);
    await sleep(700);
    await cmd('summon zombie -67.5 67 242.5 {NoAI:1b}', 600);
    await sleep(40000);
    ev.arms.b1 = { n: avoidRows(since(k)).length, probes: probeRows(since(k)).length };
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.n < 1 || ev.arms.a2.n < 1 || ev.arms.a3.n !== 0 || ev.arms.b1.n !== 0;

  ev.verdicts = {
    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',
    w1: ev.arms.a1.n >= 1 ? 'PASS' : 'FAIL',
    w2: ev.arms.a2.n >= 1 ? 'PASS' : 'FAIL',
    w3: ev.arms.a3.n === 0 ? 'PASS' : 'FAIL',
    w4: ev.arms.b1.n === 0 && ev.arms.b1.probes === 0 ? 'PASS' : 'FAIL',
  };
  stampPin();
  console.log('[verdicts] ' + JSON.stringify(ev.verdicts));
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes,
    a2: ev.arms.a2.n, a2rows: ev.arms.a2.rows, a2probes: ev.arms.a2.probes,
    a3: ev.arms.a3.n, a3probes: ev.arms.a3.probes,
    b1: ev.arms.b1.n, b1probes: ev.arms.b1.probes,
  }));
  // mineflayer keeps the loop alive; exit explicitly (B-16 run-1 lesson)
  setTimeout(() => process.exit(bad ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) bot.quit(); } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (err) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
