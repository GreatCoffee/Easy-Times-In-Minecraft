#!/usr/bin/env node
/**
 * f11-b24-smoke.js — R196 sun-flee arms (B-24: EntityAIFleeSun family +
 * EntityAIRestrictSun wedge) smoke driver. Judge conventions from the
 * B-19..B-23 line: two boots (flag on / flag off), driver-managed world
 * (rmSync at boot), cfg gates (livestockNeedsR196/farmDebugLog/mobDebugLog
 * true; mobDespawnR196 false — the B-19 r5 lesson), [done] summary JSON.
 *
 * The 1.12 zombies must catch fire IN DAYLIGHT on the sunlit pad before
 * the shield — the vanilla burn-in-sun arm IS the burning gate's supply:
 *   A1 zombie villager: the R196 EntityZombie.setVillager wedge adds
 *      RestrictSun(1) + FleeSun(2); summoned on the sunlit pad the mob
 *      burns and seeks shade/water within the radius; >=1 fleesun start.
 *   A2 skeleton: the R196 EntitySkeleton ctor seat (prio 3, speed 1.0);
 *      same sunlit-pad burn+seek; >=1 start.
 *   A3 (negative mirror, both boots): despawn counter rows may ride the
 *      log — the seek rows are the only face here.
 *   B1 (boot 2, flag off): whole replay → ZERO seek rows (the flag gate
 *      sits before the probe, so the probe rows also vanish).
 *
 * Geometry: STAND (-72,67,242) — the B-19..B-23 studio (pad y67 cobble
 * x -78..-67 z 238..249; open sky); the shade targets: a 3x3 stone-roof
 * hut at x -70..-68 z 240..242 (roof y70 on short walls) and a 2x2 water
 * pool at x -65..-64 z 239..240 (floor y66), both in the sample circle.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b24-smoke';
const WORLD = 'w-b24a';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const seekRows = (lines) => lines.filter((l) => l.indexOf('fleesun') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);

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
  // the sunlit pad (B-19..B-23 studio patch)
  await cmd('fill -78 66 238 -67 66 249 minecraft:cobblestone', 500);
  await cmd('fill -78 67 238 -67 70 249 minecraft:air', 500);
  // shade hut: walls y68 + roof y70 (3x3 over x -70..-68 z 240..242)
  await cmd('fill -70 68 240 -68 68 242 minecraft:stone', 400);
  await cmd('setblock -70 69 240 minecraft:stone', 300);
  await cmd('setblock -70 69 242 minecraft:stone', 300);
  await cmd('setblock -68 69 240 minecraft:stone', 300);
  await cmd('setblock -68 69 242 minecraft:stone', 300);
  await cmd('fill -70 69 241 -68 69 241 minecraft:air', 300);
  await cmd('fill -70 70 240 -68 70 242 minecraft:stone', 400);
  // water pool 2x2 (x -65..-64 z 239..240), floor y66, water y67..68
  await cmd('fill -65 66 239 -64 66 240 minecraft:cobblestone', 400);
  await cmd('fill -65 67 239 -64 68 240 minecraft:water', 500);
  await cmd('kill @e[type=!player]', 500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('tp ' + A + ' -69.5 68 ' + (STAND.z + 0.5), 700); // dry bank west of the pool
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

  // A1: zombie villager — the setVillager wedge (RestrictSun 1 + FleeSun 2);
  // burning in daylight within seconds; 90 s window
  {
    const k = srv.all.length;
    await cmd('time set 1000', 400); // noon
    await cmd('summon zombie_villager -72.5 67 242.5', 600);
    await sleep(90000);
    const rows = seekRows(since(k));
    ev.arms.a1 = { n: rows.length, rows: rows.slice(0, 6) };
    await sweep();
  }

  // A2: skeleton — the ctor seat (prio 3, speed 1.0); 120 s window.
  // r3 lesson: R196 mobstats hp 6.0 + onFire 1/s = ~6 s lifetime; summoned
  // mid-pad it never reached the hut's shade arc in time. r4 summons it
  // on the hut doorstep (z 243 = 1 block south of the z242 wall shadow)
  // so the trial arc (dx/dz ±1..) hits the covered cell within seconds.
  {
    const k = srv.all.length;
    await cmd('time set 1000', 400);
    await cmd('summon skeleton -69.5 67 243.5', 600);
    await sleep(120000);
    const rows = seekRows(since(k));
    ev.arms.a2 = { n: rows.length, rows: rows.slice(0, 6) };
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

  // B1: whole-family replay flag off — zero seek rows (also zero probe rows)
  {
    const k = srv.all.length;
    await cmd('time set 1000', 400);
    await cmd('summon zombie_villager -72.5 67 242.5', 600);
    await cmd('summon skeleton -71.5 67 240.5', 600);
    await sleep(40000);
    ev.arms.b1 = { n: seekRows(since(k)).length };
    await sweep();
  }

  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad =
    ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
    || ev.arms.a1.n < 1 || ev.arms.a2.n < 1 || ev.arms.b1.n !== 0;

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows, a2: ev.arms.a2.n, a2rows: ev.arms.a2.rows, b1: ev.arms.b1.n,
  }));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
