#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b30-verify';
const WORLD = 'w-b30v';
const A = 'ETIM_F7';

const ev = { tag: TAG, pins: [], boots: [], arms: {}, verdicts: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

// wander-back face row = the kernel start line, probe rows excluded
const wbRows = (lines) => lines.filter((l) => l.indexOf('wanderback') >= 0 && l.indexOf(' start ') >= 0);
const wbProbes = (lines) => lines.filter((l) => l.indexOf('wanderback') >= 0 && l.indexOf(' probe-in ') >= 0);

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

/**
 * B-30 stage（b30-smoke r3 终形照搬）：bot 先 tp 进场（玩家在场 = chunk
 * loaded），pad ±5 与东向走廊（x +5..+35, z ±2）全部 /execute 相对 bot
 * 坐标铺面——r2 教训：tp 落点是 raw fresh 地形，回家路必须自铺。
 */
async function stageArena() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 1, rts: 512, noPhysics: false });
  await cmd('kill @e[type=!player]', 600);
  await cmd('tp ' + A + ' -69.5 67 242.5', 700);
  await sleep(2000);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~-1 ~-5 ~5 ~-1 ~5 minecraft:cobblestone', 700);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~-5 ~ ~-5 ~5 ~4 ~5 minecraft:air', 700);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~5 ~-1 ~-2 ~35 ~-1 ~2 minecraft:cobblestone', 700);
  await cmd('execute ' + A + ' ~ ~ ~ fill ~5 ~ ~-2 ~35 ~4 ~2 minecraft:air', 700);
  await sleep(2500);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('effect ' + A + ' minecraft:invisibility 1000000 0 true', 500);
  console.log('[botpos]', A, 'staged', JSON.stringify(bot.entity.position));
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

/**
 * witchArm(layout)：2 只女巫 memo 钉summon（bot 相对 ~-2/~ ~-1 → floor
 * (-72,67,241)/(-70,67,241)，onEntityJoinWorld 面钉），再按 layout tp。
 */
async function witchArm(layout) {
  await cmd('execute ' + A + ' ~ ~ ~ summon witch ~-2 ~ ~-1', 500);
  await cmd('execute ' + A + ' ~ ~ ~ summon witch ~1 ~ ~-1', 500);
  await sleep(1200);
  await cmd('tp @e[type=witch,r=24] ' + layout, 700);
  await sleep(1200);
}

function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = crypto.createHash('sha256').update(fs.readFileSync(jar)).digest('hex').toUpperCase();
  const mk = L.mkCounts();
  const pin = { at: new Date().toISOString(), releaseSha: sha, mk };
  ev.pins.push(pin);
  console.log('[PIN] ' + JSON.stringify(pin));
  return pin;
}

(async () => {
  stampPin();
  // B30: the witch-only spawn-face seat (MixinEntityWitch add-only; the R196
  // EntityAIWanderBackToSpawnPoint rides livestockNeedsR196; spawn memo is
  // 钉ed by ETIMLivestockEvents.onEntityJoinWorld).
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();

  // A1: wander arm — tp 23 blocks east onto the corridor, 60 s window;
  // R196 wander-back must produce start rows with a REAL path
  // (path=true) — r2 教训：只数行不算数，path 真行判准。
  {
    const k = srv.all.length;
    await witchArm('~23 ~ ~');
    await sleep(60000);
    const rows = wbRows(since(k));
    ev.arms.a1 = {
      n: rows.length,
      pathTrue: rows.filter((l) => l.indexOf('path=true') >= 0).length,
      rows: rows.slice(0, 6),
      probes: wbProbes(since(k)).length,
    };
    await sweep();
  }

  // A2: memo arm — tp 12 blocks east onto the corridor; the start row's
  // spawn= field pins the JoIN memo (NOT the tp destination).
  {
    const k = srv.all.length;
    await witchArm('~12 ~ ~');
    await sleep(60000);
    const rows = wbRows(since(k));
    ev.arms.a2 = {
      n: rows.length,
      memoN: rows.filter((l) => l.indexOf('spawn=(-72,67,241)') >= 0 || l.indexOf('spawn=(-70,67,241)') >= 0).length,
      rows: rows.slice(0, 6),
      probes: wbProbes(since(k)).length,
    };
    await sweep();
  }
  await stopBoot();

  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();
  // B1: arm replay flag off — vanilla witch has no such seat; zero rows/probes
  {
    const k = srv.all.length;
    await witchArm('~12 ~ ~');
    await sleep(30000);
    ev.arms.b1 = { n: wbRows(since(k)).length, probes: wbProbes(since(k)).length };
    await sweep();
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  stampPin();
  const bad = ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
      || ev.arms.a1.n < 1 || ev.arms.a1.pathTrue < 1   // r2 假绿教训：path 真行必须 ≥1
      || ev.arms.a2.n < 1 || ev.arms.a2.memoN < 1
      || ev.arms.b1.n !== 0 || ev.arms.b1.probes !== 0
      || ev.pins.length !== 2 || ev.pins[0].releaseSha !== ev.pins[1].releaseSha
      || !ev.pins.every((p) => p.mk && p.mk.ok === true);
  ev.verdicts = {
    w0: ev.boots.every((b) => b.mixinFail === 0 && /Done \(/.test(b.boot)) && ev.stopBoots.every((b) => b.exitCode === 0 && b.build === true) ? 'PASS' : 'FAIL',
    w1: ev.arms.a1.n >= 1 && ev.arms.a1.pathTrue >= 1 ? 'PASS' : 'FAIL',
    w2: ev.arms.a2.n >= 1 && ev.arms.a2.memoN >= 1 ? 'PASS' : 'FAIL',
    w3: ev.arms.b1.n === 0 && ev.arms.b1.probes === 0 ? 'PASS' : 'FAIL',
    w4: ev.pins.length === 2 && ev.pins[0].releaseSha === ev.pins[1].releaseSha
      && ev.pins.every((p) => p.mk && p.mk.ok === true) ? 'PASS' : 'FAIL',
  };
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1pathTrue: ev.arms.a1.pathTrue, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes,
    a2: ev.arms.a2.n, a2memo: ev.arms.a2.memoN, a2rows: ev.arms.a2.rows, a2probes: ev.arms.a2.probes,
    b1: ev.arms.b1.n, b1probes: ev.arms.b1.probes,
  }));
  setTimeout(() => process.exit(process.exitCode), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) { bot.quit(); bot = null; } } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
