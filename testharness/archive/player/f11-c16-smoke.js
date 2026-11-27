#!/usr/bin/env node
/**
 * f11-c16-smoke.js — R196 rain batch (C-16) smoke driver.
 * One flat world, one boot. The farmland rain face now judges through
 * ETIMRain.canLightningStrikeAt (World :5414-5429) instead of the 1.12
 * isRainingAt bridge, so the [FarmLog] moisture src=rain drip rows carry
 * the whole chain: strength gate (rainingStrength > 0.2, ramp 0.01/tick),
 * canSeeSky (the covered farm must stay dry), and the biome claws.
 *
 * Arms:
 *   A1  open farm drips (>=1 src=rain row) vs covered farm zero rows
 *   A2  the strength gate: no drip row within 700ms of /weather rain
 *       (ramp 0.01/tick needs ~20 ticks to clear 0.2)
 *   A3  /weather clear stops the drips (ramp-down: no new row in the
 *       8s window after clear+4s)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-c16-smoke';
const WORLD = 'w-c16a';
const A = 'ETIM_F7';
const TY = 120;
const STAND = { x: 240, y: TY + 1, z: 240 };
const OPEN = { x: 242, z: 242 };      // open farmland, sky visible
const COVER = { x: 246, z: 242 };     // covered farm (3-block dirt roof)

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
const rainRows = (lines) => lines.filter((l) => l.indexOf('src=rain') >= 0);

async function startBoot(tag, world, cfg) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
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
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
}

(async () => {
  srv = await startBoot(TAG + '-b1', WORLD, { farmDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  bot = await L.joinBot(srv, A);

  await L.stage(srv, bot, { gamemode: 1, rts: 3 });
  await cmd('kill @e[type=!player]', 600);
  await cmd('tp ' + A + ' ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 600);
  await cmd('gamerule doMobSpawning false', 300);
  await cmd('gamerule randomTickSpeed 512', 300);
  await cmd('gamerule doWeatherCycle false', 300);

  // stage: an open farmland and a covered one (dirt seat + 3 dirt roof)
  await cmd('setblock ' + OPEN.x + ' ' + TY + ' ' + OPEN.z + ' minecraft:farmland 0', 600);
  await cmd('setblock ' + COVER.x + ' ' + TY + ' ' + COVER.z + ' minecraft:farmland 0', 600);
  await cmd('setblock ' + OPEN.x + ' ' + (TY - 1) + ' ' + OPEN.z + ' minecraft:dirt 0', 500);
  await cmd('setblock ' + COVER.x + ' ' + (TY - 1) + ' ' + COVER.z + ' minecraft:dirt 0', 500);
  await cmd('setblock ' + COVER.x + ' ' + (TY + 3) + ' ' + COVER.z + ' minecraft:dirt 0', 500);
  // wheat on both farms — the no-crops 3×3 dirt-decay face (B-6) pops bare
  // farmland long before the rain window (b1 evidence: moisture decay rows)
  await cmd('setblock ' + OPEN.x + ' ' + (TY + 1) + ' ' + OPEN.z + ' minecraft:wheat 3', 500);
  await cmd('setblock ' + COVER.x + ' ' + (TY + 1) + ' ' + COVER.z + ' minecraft:wheat 3', 500);

  // ----- A2: the strength gate catches the set instant (snap face — R196
  // setRainStrength prev=current ⇒ the gate is live immediately) — plus the
  // pre-window zero-row proof (no drip before the strength was up). -----
  const preRows = rainRows(srv.all.slice(0).map(L.strip)).length; // whole log before the set
  const n0 = srv.all.length;
  await cmd('etest rain set 1.0', 400);
  await cmd('setblock ' + OPEN.x + ' ' + TY + ' ' + OPEN.z + ' minecraft:farmland 0', 400);
  await cmd('setblock ' + COVER.x + ' ' + TY + ' ' + COVER.z + ' minecraft:farmland 0', 400);
  await cmd('etest rain probe', 400);
  await sleep(300);
  const earlyRows = rainRows(since(n0));
  // ----- A1: open drips, covered stays dry -----
  await sleep(20000);
  const allRows = rainRows(since(n0));
  const parse = (l) => { const i = l.indexOf('pos='); return i > 0 ? l.slice(i + 4).split(',')[0] + ',' + l.slice(i + 4).split(',')[2].split(' ')[0] : '?'; };
  ev.arms.a2 = { earlyRowCount: earlyRows.length, preRows: preRows };
  ev.arms.a1 = {
    openRows: allRows.filter((l) => parse(l) === OPEN.x + ',' + OPEN.z).length,
    coverRows: allRows.filter((l) => parse(l) === COVER.x + ',' + COVER.z).length,
    totalRows: allRows.length,
  };

  // ----- A3: strength snap to 0 stops the drips (the strength gate gone) -----
  const clr = srv.all.length;
  await cmd('etest rain set 0.0', 400);
  await sleep(2000);
  const m1 = srv.all.length;
  await sleep(8000);
  await sleep(3000);
  ev.arms.a3 = {
    rowsDuringHighStrength: rainRows(srv.all.slice(clr, m1).map(L.strip)).length,
    rowsAfterRampDown: rainRows(srv.all.slice(m1).map(L.strip)).length,
  };

  await stopBoot();
  const fsOut = path.join(L.ROOT, 'testharness', 'build-logs', TAG + '.json');
  fs.writeFileSync(fsOut, JSON.stringify(ev, null, 2));
  console.log('[out] ' + fsOut);
  const bad = ev.boots[0].mixinFail > 0
    || ev.arms.a1.openRows < 1
    || ev.arms.a1.coverRows !== 0
    || ev.arms.a2.earlyRowCount < 1
    || ev.arms.a2.preRows !== 0
    || ev.arms.a3.rowsAfterRampDown !== 0;
  process.exitCode = bad ? 2 : 0;
  console.log('[done] ' + JSON.stringify(ev.arms));
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  process.exitCode = 1;
});
