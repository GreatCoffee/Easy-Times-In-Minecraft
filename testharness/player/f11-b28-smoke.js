#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b28-smoke';
const WORLD = 'w-b28a';
const A = 'ETIM_F7';

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

const seekRows = (lines) => lines.filter((l) => l.indexOf('eatgrass') >= 0 && l.indexOf(' start ') >= 0 && l.indexOf(' probe') < 0);

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
  await cmd('fill -78 66 238 -67 66 249 minecraft:grass', 500);
  await cmd('fill -70 66 240 -68 66 242 minecraft:tallgrass 1', 400);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule doMobLoot true', 300);
  await cmd('tp ' + A + ' -69.5 68 ' + (STAND.z + 0.5), 700);
}

async function sweep() {
  await cmd('kill @e[type=!player]', 500);
  await sleep(400);
}

const STAND = { z: 242 };

(async () => {
  // B28: the sheep eat-grass family seat. Two boots; the R196 seat rides
  // only under livestockNeedsR196; vanilla keep-face outside it.
  srv = await startBoot(TAG + '-b1', WORLD, { livestockNeedsR196: true, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageArena();
  // A1: sheep eat-grass seat — sheep summoned on the grass pad, rts 512 sweeps
  // the roll gate every tick; 90 s window
  {
    const k = srv.all.length;
    await cmd('time set 1000', 400);
    await cmd('summon sheep -72.5 67 ' + (STAND.z + 0.5) + ' {NoAI:0b}', 600);
    await cmd('summon sheep -74.5 67 240.5 {NoAI:0b}', 600);
    await cmd('summon sheep -70.5 67 241.5 {NoAI:0b}', 600);
    await sleep(90000);
    const rows = seekRows(since(k));
    ev.arms.a1 = { n: rows.length, rows: rows.slice(0, 6), probes: since(k).filter((l) => l.indexOf('eatgrass probe-in') >= 0).length };
    await sweep();
  }
  // A2: cow control — the R196 have no cow eat-grass seat (vanilla keep face)
  {
    const k = srv.all.length;
    await cmd('time set 1000', 400);
    await cmd('summon cow -72.5 67 ' + (STAND.z + 1.5) + ' {NoAI:0b}', 600);
    await sleep(40000);
    ev.arms.a2 = { n: seekRows(since(k)).length, probes: since(k).filter((l) => l.indexOf('eatgrass probe-in') >= 0).length };
    await sweep();
  }
  await stopBoot();

  srv = await startBoot(TAG + '-b2', WORLD, { livestockNeedsR196: false, farmDebugLog: true, mobDebugLog: true, mobDespawnR196: false });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageArena();
  // B1: whole-family replay flag off — vanilla keeps the seat; zero rows
  {
    const k = srv.all.length;
    await cmd('time set 1000', 400);
    await cmd('summon sheep -72.5 67 ' + (STAND.z + 0.5) + ' {NoAI:0b}', 600);
    await sleep(40000);
    ev.arms.b1 = { n: seekRows(since(k)).length, probes: since(k).filter((l) => l.indexOf('eatgrass probe-in') >= 0).length };
    await sweep();
  }
  await stopBoot();

  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }

  const bad = ev.boots[0].mixinFail > 0 || ev.boots[1].mixinFail > 0
      || ev.arms.a1.n < 1 || ev.arms.a2.n !== 0 || ev.arms.b1.n !== 0;
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify({
    a1: ev.arms.a1.n, a1rows: ev.arms.a1.rows, a1probes: ev.arms.a1.probes,
    a2: ev.arms.a2.n, a2probes: ev.arms.a2.probes, b1: ev.arms.b1.n, b1probes: ev.arms.b1.probes,
  }));
  setTimeout(() => process.exit(process.exitCode), 800);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) { bot.quit(); bot = null; } } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  setTimeout(() => process.exit(1), 500);
});
