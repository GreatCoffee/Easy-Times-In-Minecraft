#!/usr/bin/env node
/**
 * f11-b26-smoke.js — R196 open-space-crowded arm (B-26: SeekOpenSpaceIfCrowded,
 * livestock mutex-3 seat) smoke driver. B-19..B-25 conventions: two boots
 * (flag on / flag off), driver world rmSync, mobDespawnR196=false (B-19 r5),
 * [done] summary JSON.
 *
 * The arm's semantics: shouldExecute = freedom<=0.5 && (!crowded ? true :
 * roll(10:40)); startExecuting fires ONLY while isCrowded() — so:
 *   A1 crowded: 4 cows roofed in a 3x3 stone pen (walls y68 + roof y70 on
 *      x -74..-72 z 240..242) — freedom seeded 0.3 via the /etest prod
 *      freedom key (the B-26 wedge; init 0.8..1.0 never triggers) —
 *      pen cows ARE crowded (roofed = !canSeeSky + 4 bodies) → >=1
 *      seekopen start rows in 90 s.
 *   A2 solo negative: 1 cow on the open pad corner (-77.5,68,247.5) —
 *      the same freedom=0.3 seed; shouldExecute is TRUE (not crowded ==
 *      true) but startExecuting's crowded cut keeps every path null →
 *      ZERO start rows (the semantically-correct non-crowded quietness).
 *   B1 (boot 2, flag off): the pen replay — 0 rows including probes
 *      (the flag gate sits before the probe).
 *
 * Geometry: STAND (-69.5,68,242.5) on the B-19..B-25 dry bank west of the
 * pool; the pen sits x -74..-72 / z 240..242.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b26-smoke';
const WORLD = 'w-b26a';
const A = 'ETIM_F7';
const BANK = { x: -69.5, y: 68, z: 242.5 }; // dry stand (the B-22/B-23 bank face)
const SOLO = { x: -77.5, y: 68, z: 247.5 }; // open-pad corner, disjoint from the pen's 2-neighbor boxes

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const openRows = (lines) => lines.filter((l) => l.indexOf('seekopen') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);
const probeRows = (lines) => lines.filter((l) => l.indexOf('seekopen') >= 0 && l.indexOf(' probe-in ') >= 0);

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join('run', world), { recursive: true, force: true });
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
  await L.stage(srv, bot, { gamemode: 3, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  // the open pad (studio patch)
  await cmd('fill -78 66 238 -67 66 249 minecraft:cobblestone', 500);
  await cmd('fill -78 67 238 -67 72 249 minecraft:air', 500);
  // the roofed pen 3x3 (x -74..-72 z 240..242): walls y68 gate-y69-guard, roof y70
  await cmd('fill -74 68 240 -72 68 242 minecraft:stone', 400);
  await cmd('fill -74 69 240 -72 69 242 minecraft:air', 400);
  await cmd('fill -74 70 240 -72 70 242 minecraft:stone', 500);
  await cmd('kill @e[type=!player]', 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('tp ' + A + ' ' + BANK.x + ' ' + BANK.y + ' ' + BANK.z, 700);
}

async function summonPenCows() {
  for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]]) {
    await cmd('summon cow ' + (-73.5 + dx) + ' 68 ' + (241.5 + dz), 450);
  }
  // prod ALL pen hits (radius default 6 covers x -75.5..-63.5 from the bank)
  await cmd('etest prod ' + A + ' freedom=0.3', 700);
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, {
    livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false,
  });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: 4 pen cows (freedom 0.3) — 90 s window
  {
    const k = srv.all.length;
    await summonPenCows();
    await sleep(90000);
    ev.arms.a1 = {
      n: openRows(since(k)).length,
      rows: openRows(since(k)).slice(0, 6),
      probes: probeRows(since(k)).length,
    };
    await sweep();
  }

  // A2: solo open-pad cow — the non-crowded quietness cut (0 starts expected)
  {
    const k = srv.all.length;
    await cmd('summon cow ' + SOLO.x + ' ' + SOLO.y + ' ' + SOLO.z, 500);
    await cmd('tp ' + A + ' ' + (SOLO.x - 2) + ' ' + SOLO.y + ' ' + SOLO.z, 600);
    await cmd('etest prod ' + A + ' freedom=0.3', 700);
    await sleep(45000);
    ev.arms.a2 = {
      n: openRows(since(k)).length,
      rows: openRows(since(k)).slice(0, 4),
      probes: probeRows(since(k)).length,
    };
    await cmd('tp ' + A + ' ' + BANK.x + ' ' + BANK.y + ' ' + BANK.z, 500);
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, {
    livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false,
  });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: pen replay, flag off — zero rows including probes
  {
    const k = srv.all.length;
    await summonPenCows();
    await sleep(45000);
    ev.arms.b1 = { n: openRows(since(k)).length + probeRows(since(k)).length };
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.n < 1 || ev.arms.a2.n !== 0 || ev.arms.b1.n !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes,
    a2: ev.arms.a2.n, a2probes: ev.arms.a2.probes,
    b1: ev.arms.b1.n,
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
