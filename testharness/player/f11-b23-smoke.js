#!/usr/bin/env node
/**
 * f11-b23-smoke.js — R196 needs-quest AI arms (B-23 seekfood/seekwater) smoke.
 *
 * Arms (boot 1 — livestockNeedsR196=true, mobDebugLog=true):
 *   A1 waterseek: 4 cows on the dry bank + prod water=0.2 (urgent face)
 *      -> >=1 seekwater start row inside 60 s (urgent roll scale 40;
 *      open pool = the uncovered water face, the B-22 roofed-pool lesson)
 *   A2 foodseek: same cows + prod food=0.2 -> >=1 seekfood start row
 *      inside 60 s (grass patch = the R196 grass/tallGrass table)
 *   A3 desperate food: prod food=0.04 on 2 cows stranded on the stone
 *      slab (no grass in reach) -> the escape-fallback shape eats the same
 *      start-row lane; soft report (no hard gate)
 * Arms (boot 2 — livestockNeedsR196=false):
 *   B1 replay A1+A2 (prod water=0.2 food=0.2, 40 s) -> ZERO seek rows
 *      (the flag-off negative mirror; flag-off also silences the probes)
 *
 * Judge lanes: [AILog] seekwater start / [AILog] seekfood start (the
 * label count filters " start " — the probe-in rows carry the same label
 * and never count). Both boots run mobDebugLog=true so the flag-off boot
 * proves the flag-return happens BEFORE any row (my base check order).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b23-smoke';
const WORLD = 'w-b23a';
const A = 'ETIM_F7';
const STAND = { x: -72, y: 67, z: 242 };
const POOL = { x0: -74, x1: -71, z0: 240, z1: 243 };
const PATCH = { x0: -67, x1: -63, z0: 238, z1: 242 };
const SLAB = { x0: -60, x1: -56, z0: 245, z1: 249 };

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const startRows = (label, lines) => lines.filter((l) => l.indexOf(label) >= 0 && l.indexOf(' start ') >= 0);
const seekRows = (lines) => lines.filter((l) => l.indexOf('[AILog] seek') >= 0 && l.indexOf(' start ') >= 0);

async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 0, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  // the pad: cobble floor ring AROUND the pool (the pool top stays OPEN — the
  // B-22 roofed-pool lesson: no y67 grass over the water cells)
  await cmd('fill -78 67 238 -55 74 250 minecraft:air', 600);
  await cmd('fill -78 66 238 -55 66 250 minecraft:cobblestone', 500);
  await cmd('fill ' + POOL.x0 + ' 67 ' + POOL.z0 + ' ' + POOL.x1 + ' 67 ' + POOL.z1 + ' minecraft:air', 500);
  // the pool: 2-deep water on a cobble floor
  await cmd('fill ' + POOL.x0 + ' 64 ' + POOL.z0 + ' ' + POOL.x1 + ' 64 ' + POOL.z1 + ' minecraft:cobblestone', 500);
  await cmd('fill ' + POOL.x0 + ' 65 ' + POOL.z0 + ' ' + POOL.x1 + ' 66 ' + POOL.z1 + ' minecraft:water', 500);
  // the grass patch: the food arm's table surface (grass blocks + a tallgrass sprinkle)
  await cmd('fill ' + PATCH.x0 + ' 67 ' + PATCH.z0 + ' ' + PATCH.x1 + ' 67 ' + PATCH.z1 + ' minecraft:grass', 500);
  await cmd('setblock ' + (PATCH.x0 + 1) + ' 68 ' + (PATCH.z0 + 1) + ' minecraft:tallgrass 1', 400);
  await cmd('setblock ' + (PATCH.x1 - 1) + ' 68 ' + (PATCH.z1 - 1) + ' minecraft:tallgrass 1', 400);
  // the slab: a green-free corner for the desperate arm
  await cmd('fill ' + SLAB.x0 + ' 67 ' + SLAB.z0 + ' ' + SLAB.x1 + ' 67 ' + SLAB.z1 + ' minecraft:stone', 500);
  await cmd('gamerule doMobLoot true', 300);
  await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

// ---- one summon line per coordinate (1.12 registry names: cow works)
async function summonAt(x, z, kind) {
  await cmd('summon ' + kind + ' ' + x + ' 67 ' + z, 500);
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

function prodTokens(extra) {
  // r1 lesson: the `radius=N` token is NOT a key of the prod arg-table
  // (the int branch only carries counter/milk/feathers/step/grass/jump/
  // ground/probe) — an unknown key throws WrongUsageException and the
  // whole seed silently drops (the r1 zero-forced-cow case). radius stays
  // at its 6-block default; the bot stands within it by stage design.
  return 'etest prod ' + A + (extra.water ? ' water=' + extra.water : '') + (extra.food ? ' food=' + extra.food : '');
}

(async () => {
  // ---------------- boot 1: flag on ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: waterseek — the dry-bank cows get urgent thirst
  {
    await summonAt(STAND.x + 2, STAND.z - 1, 'cow');
    await summonAt(STAND.x + 3, STAND.z - 2, 'cow');
    await summonAt(STAND.x + 4, STAND.z, 'cow');
    await summonAt(STAND.x - 3, STAND.z - 2, 'cow');
    await cmd(prodTokens({ water: 0.2 }), 700);
    const k = srv.all.length;
    await sleep(60000);
    const rows = startRows('seekwater', since(k));
    ev.arms.a1 = { n: rows.length, rows: rows.slice(0, 6) };
    await sweep();
  }

  // A2: foodseek — the same bank, now hungry (fresh cows)
  {
    await summonAt(STAND.x + 2, STAND.z - 1, 'cow');
    await summonAt(STAND.x + 3, STAND.z - 2, 'cow');
    await summonAt(STAND.x + 4, STAND.z, 'cow');
    await summonAt(STAND.x - 3, STAND.z - 2, 'cow');
    await cmd(prodTokens({ food: 0.2 }), 700);
    const k = srv.all.length;
    await sleep(60000);
    const rows = startRows('seekfood', since(k));
    ev.arms.a2 = { n: rows.length, rows: rows.slice(0, 6) };
    await sweep();
  }

  // A3: desperate food — stranded on the stone slab, no grass in reach
  {
    await summonAt(SLAB.x0 + 1, SLAB.z0 + 1, 'cow');
    await summonAt(SLAB.x1 - 1, SLAB.z1 - 1, 'cow');
    await cmd('tp ' + A + ' ' + (SLAB.x0 + 2) + ' 68 ' + (SLAB.z0 + 2), 700);
    await cmd(prodTokens({ food: 0.04 }), 700);
    const k = srv.all.length;
    await sleep(45000);
    const rows = startRows('seekfood', since(k));
    ev.arms.a3 = { n: rows.length, rows: rows.slice(0, 4) };
    await cmd('tp ' + A + ' ' + (STAND.x + 0.5) + ' ' + STAND.y + ' ' + (STAND.z + 0.5), 700);
    await sweep();
  }

  await stopBoot();

  // ---------------- boot 2: flag off ----------------
  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();

  // B1: whole replay flag off — the flag return sits BEFORE every row
  {
    await summonAt(STAND.x + 2, STAND.z - 1, 'cow');
    await summonAt(STAND.x + 3, STAND.z - 2, 'cow');
    await summonAt(STAND.x + 4, STAND.z, 'cow');
    await summonAt(STAND.x - 3, STAND.z - 2, 'cow');
    await cmd(prodTokens({ water: 0.2 }), 700);
    await cmd(prodTokens({ food: 0.2 }), 700);
    const k = srv.all.length;
    await sleep(40000);
    ev.arms.b1 = { n: seekRows(since(k)).length };
    await sweep();
  }

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  ev.verdicts = {
    a1: ev.arms.a1.n >= 1 ? 'PASS' : 'FAIL',
    a2: ev.arms.a2.n >= 1 ? 'PASS' : 'FAIL',
    a3: 'REPORT',
    b1: ev.arms.b1.n === 0 ? 'PASS' : 'FAIL',
    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',
  };

  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  console.log('[done] ' + JSON.stringify({ a1: ev.arms.a1.n, a2: ev.arms.a2.n, a3: ev.arms.a3.n, b1: ev.arms.b1.n, verdicts: ev.verdicts }));
  setTimeout(() => process.exit(Object.entries(ev.verdicts).some(([, v]) => v === 'FAIL') ? 2 : 0), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
