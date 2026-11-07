#!/usr/bin/env node
'use strict';
/**
 * f11-b14-smoke.js — village-field batch (B-14, 条 318) main-session sanity.
 *
 * Arms:
 *   V1  boot with villageFieldsR196=true on a seed-fixed fresh world;
 *       /locate Village (progressive tp hops until found) → the session log
 *       must carry `villageField src=r196ized type=field1|field2 fieldMin=…
 *       dead=N water=N logNorm=N flag=1` rows [FarmLog].
 *   V2  spot-checks at the first row's fieldMin: crop cells (etim:dead_crop,
 *       any age) + the old vanilla water strips (now air) + the vanilla
 *       live-crop face must NOT return on the probed cells.
 *   V3  boot 2 with villageFieldsR196=false on a second seed-fixed world:
 *       zero r196ized rows for the located village (vanilla face survives).
 * Evidence: [FarmLog] rows + testforblock readbacks only (纪律 9).
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b14-smoke';
const A = 'ETIM_F7';
const SEED = '20261107';
const ev = { tag: TAG, boots: [], stops: [], hops: [], arms: {} };
let srv = null;
let bot = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nAt = () => srv.all.length;

async function cmd(line, wait) {
  srv.send(line);
  await sleep(wait === undefined ? 400 : wait);
}

const farmLines = (lines) => lines.filter((l) => /^\[FarmLog\]/.test(l) && /villageField/.test(l));

function parseKV(line) {
  const kv = {};
  for (const p of String(line).split(' ')) {
    const q = p.split('=');
    if (q.length === 2) kv[q[0]] = q[1];
  }
  return kv;
}

function log(tag, line) { console.log('[' + tag + '] ' + line); }

/** fresh world props: level-name + level-seed, dir rm'd */
function stageWorld(worldName) {
  try { fs.rmSync(path.join(L.ROOT, 'run', worldName), { recursive: true, force: true }); } catch (e) { /* noop */ }
  const props = fs.readFileSync(L.PROPS).toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(props, 'level-name', worldName), 'utf8');
  let fresh = fs.readFileSync(L.PROPS).toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(fresh, 'level-seed', SEED), 'utf8');
  fresh = fs.readFileSync(L.PROPS).toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(fresh, 'view-distance', '16'), 'utf8'); // locate scans generated chunks only (view-radius)
}

async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'villageFieldsR196', o.fields === false ? 'false' : 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n });
  if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b' + n);
  const b = {
    n,
    world: o.world,
    boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
    mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
  };
  ev.boots.push(b);
  log('boot' + n, b.boot.padEnd(55) + ' mixinFail=' + b.mixinFail);
  await cmd('gamerule doTileDrops false', 300);
  await cmd('gamerule randomTickSpeed 3', 300);
  await cmd('time set 6000', 300);
  await cmd('weather clear', 300);
  await cmd('difficulty peaceful', 300);
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
  await cmd('gamemode 1 ' + A, 400);
  await cmd('tp ' + A + ' 8 100 8', 1200);
  return b;
}

async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const st = await srv.stop();
  const rec = { n, exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) };
  ev.stops.push(rec);
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + rec.build);
  srv = null;
  return rec;
}

/** /locate Village with progressive tp hops; returns {x, z} or null. */
async function locateVillage() {
  const hops = [[0, 0], [320, 0], [0, 320], [320, 320], [-320, 0], [0, -320], [-320, -320],
    [640, 0], [0, 640], [-640, 0], [0, -640], [640, 640], [-640, -640], [640, -640], [-640, 640],
    [960, 0], [0, 960], [-960, 0], [0, -960]];
  for (let h = 0; h < hops.length; h++) {
    const [hx, hz] = hops[h];
    await cmd('tp ' + A + ' ' + (hx + 8) + ' 100 ' + (hz + 8), 4200);
    const mark = nAt();
    await cmd('locate Village', 2500);
    const out = srv.all.slice(mark).map((l) => L.strip(l));
    const hit = out.find((l) => /(Located Village at|The nearest Village is at)/.test(l));
    ev.hops.push({ hop: h, x: hx, z: hz, hit: !!hit });
    log('locate', 'hop ' + h + ' hit=' + !!hit);
    if (hit) {
      const m = hit.match(/Located Village at (-?\d+) \S+ (-?\d+)/);
      if (m) return { x: parseInt(m[1], 10), z: parseInt(m[2], 10), raw: hit.trim() };
    }
  }
  return null;
}

/** testforblock with data-omitted matching; returns {ok, actual}. */
async function testB(x, y, z, block, data) {
  const spec = data === undefined ? block : block + ' ' + data;
  const mark = nAt();
  await cmd('testforblock ' + x + ' ' + y + ' ' + z + ' ' + spec, 350);
  const out = srv.all.slice(mark).map((l) => L.strip(l));
  if (out.some((l) => /Successfully found the block/.test(l))) return { ok: true, actual: null };
  const hv = out.map((l) => { const m = l.match(/had the data value of (\-?\d+)/); return m ? m[1] : null; }).find(Boolean);
  return { ok: false, actual: hv || (out.find((l) => /Could not match|not found|is not a valid/.test(l)) || 'no reply').trim() };
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { sha: L.sha256(cfgBefore) };
  const propsBefore = fs.readFileSync(L.PROPS);
  try {
    /* ---------- boot 1: flag ON, world w-b14a ---------- */
    stageWorld('w-b14a');
    ev.worlds = [{ name: 'w-b14a', seed: SEED }];
    await startBoot(1, { world: 'w-b14a' });
    let v = await locateVillage();
    ev.located = v;
    if (!v) throw new Error('no village found within 10 hops — environmental, abort');
    await cmd('tp ' + A + ' ' + (v.x + 8) + ' 100 ' + (v.z + 8), 3500);

    /* ---------- V1 evidence rows ---------- */
    const rows = farmLines(srv.all.map((l) => L.strip(l))).map(parseKV);
    ev.arms.V1 = {
      rows: rows.length,
      deadTotal: rows.reduce((s, r) => s + (Number(r.dead) || 0), 0),
      waterTotal: rows.reduce((s, r) => s + (Number(r.water) || 0), 0),
      types: Array.from(new Set(rows.map((r) => r.type))),
      sample: rows.slice(0, 4),
    };
    log('V1', 'rows=' + ev.arms.V1.rows + ' deadTotal=' + ev.arms.V1.deadTotal + ' waterTotal=' + ev.arms.V1.waterTotal);
    if (!rows.length) throw new Error('no villageField r196ized rows at all');
    const zeroDead = rows.filter((r) => (Number(r.dead) || 0) < 1);
    ev.arms.V1.zeroDeadRows = zeroDead.map((r) => r.fieldMin);
    if (zeroDead.length) log('V1', 'zeroDeadRows=' + ev.arms.V1.zeroDeadRows.length + ' (informational)');

    /* ---------- V2 spot-checks at the first row's fieldMin ---------- */
    const first = rows[0];
    const fm = String(first.fieldMin).split(',').map(Number);
    const cropY = fm[1] + 1;
    let deadHits = 0;
    for (let dx = 1; dx <= 7 && deadHits < 6; dx++) {
      for (const dz of [1, 3, 5, 7]) {
        if (deadHits >= 6) break;
        const t = await testB(fm[0] + dx, cropY, fm[2] + dz, 'etim:dead_crop');
        if (t.ok) deadHits++;
      }
    }
    let airHits = 0;
    for (const wx of [3, 9]) {
      for (const wz of [2, 4, 6]) {
        const t = await testB(fm[0] + wx, fm[1], fm[2] + wz, 'minecraft:air');
        if (t.ok) airHits++;
      }
    }
    let liveHits = 0;
    for (let dx = 1; dx <= 7; dx++) {
      for (const dz of [1, 3]) {
        let t = await testB(fm[0] + dx, cropY, fm[2] + dz, 'minecraft:wheat');
        if (t.ok) { liveHits++; continue; }
        t = await testB(fm[0] + dx, cropY, fm[2] + dz, 'minecraft:carrots');
        if (t.ok) liveHits++;
      }
    }
    ev.arms.V2 = { fieldMin: first.fieldMin, type: first.type, deadHits, airHits, liveHits, cropY };
    log('V2', 'deadHits=' + deadHits + ' airHits=' + airHits + '/6 liveHits=' + liveHits +
      ' (fieldMin=' + first.fieldMin + ' type=' + first.type + ')');

    await stopBoot(1);

    /* ---------- boot 2: flag OFF, world w-b14b ---------- */
    stageWorld('w-b14b');
    ev.worlds.push({ name: 'w-b14b', seed: SEED });
    await startBoot(2, { fields: false, world: 'w-b14b' });
    const v2 = await locateVillage();
    ev.located2 = v2;
    if (!v2) throw new Error('no village found on boot2 within 10 hops — environmental');
    await cmd('tp ' + A + ' ' + (v2.x + 8) + ' 100 ' + (v2.z + 8), 3500);
    const rows2 = farmLines(srv.all.map((l) => L.strip(l))).map(parseKV);
    ev.arms.V3 = { rows: rows2.length };
    log('V3', 'flag-off r196ized rows=' + rows2.length);
    if (rows2.length) throw new Error('flag off but r196ized rows leaked: ' + JSON.stringify(rows2.slice(0, 3)));
    await stopBoot(2);

    ev.ok = true;
    log('out', 'ALL GREEN — V1 rows=' + ev.arms.V1.rows + ' dead=' + ev.arms.V1.deadTotal +
      ' water=' + ev.arms.V1.waterTotal + ' V2 deadHits=' + ev.arms.V2.deadHits + ' live=' + ev.arms.V2.liveHits +
      ' V3 leak=0');
  } catch (e) {
    ev.ok = false;
    ev.error = String((e && e.message) || e);
    console.error('[fatal] ' + ev.error);
    try { if (srv) srv.stop(); } catch (f) { /* noop */ }
  }

  /* restore the props/cfg snapshot so later windows start from the same fig */
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  fs.writeFileSync(path.join(L.OUT, TAG + '.json'), JSON.stringify(ev, null, 2), 'utf8');
  log('out', path.join(L.OUT, TAG + '.json'));
  if (!ev.ok) process.exitCode = 1;
}

main();
