#!/usr/bin/env node
'use strict';
/**
 * f11-b14-verify.js — village-field batch (B-14, 条 318-319) session-seven
 * judgment window. Independent arms over the builders' r6 smoke:
 *   W0  boot checks (Done / mixinFail=0) on world w-b14v (flag ON).
 *   W1  /locate Village → [FarmLog] `villageField src=r196ized` rows:
 *       ≥1 row, two types present (field1|field2), every row dead≥1,
 *       water≥1, logNorm≥1 (spot rows), and each row carries fieldMin.
 *   W2  per-row spot-checks: etim:dead_crop at the crop layer (y+1) of
 *       each row's fieldMin (cap 4 probes/row), and NO live crop
 *       (wheat/carrots/potatoes/beetroots) on the probed cells.
 *   W3  boot 2 (w-b14w, flag OFF): zero r196ized rows (vanilla face).
 * Evidence: [FarmLog] rows + testforblock readbacks → json verdict block.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b14-verify';
const A = 'ETIM_F7';
const SEED = '20261107';
const ev = { tag: TAG, boots: [], stops: [], hops: [], arms: {}, verdict: {} };
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

function stageWorld(worldName) {
  try { fs.rmSync(path.join(L.ROOT, 'run', worldName), { recursive: true, force: true }); } catch (e) { /* noop */ }
  let props = fs.readFileSync(L.PROPS).toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(props, 'level-name', worldName), 'utf8');
  props = fs.readFileSync(L.PROPS).toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(props, 'level-seed', SEED), 'utf8');
  props = fs.readFileSync(L.PROPS).toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(props, 'view-distance', '16'), 'utf8');
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
    const hit = out.find((l) => /Located Village at/.test(l));
    ev.hops.push({ hop: h, x: hx, z: hz, hit: !!hit });
    if (hit) {
      const m = hit.match(/Located Village at (-?\d+) \S+ (-?\d+)/);
      if (m) return { x: parseInt(m[1], 10), z: parseInt(m[2], 10), raw: hit.trim() };
    }
  }
  return null;
}

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
    /* ---------- W0+W1+W2: flag ON, world w-b14v ---------- */
    stageWorld('w-b14v');
    ev.worlds = [{ name: 'w-b14v', seed: SEED }];
    const b1 = await startBoot(1, { world: 'w-b14v' });
    ev.verdict.W0 = { done: /Done \(/.test(b1.boot), mixinFail: b1.mixinFail, stop: null, build: null };
    if (!ev.verdict.W0.done || b1.mixinFail > 0) throw new Error('W0 boot failed: ' + b1.boot);
    const v = await locateVillage();
    ev.located = v;
    if (!v) throw new Error('no village found within 19 hops — environmental, abort');
    const mark1 = nAt();
    await cmd('tp ' + A + ' ' + (v.x + 8) + ' 100 ' + (v.z + 8), 4200);
    const rows = farmLines(srv.all.map((l) => L.strip(l))).map(parseKV);
    ev.arms.W1 = {
      rows: rows.length,
      types: Array.from(new Set(rows.map((r) => r.type))),
      deadTotal: rows.reduce((s, r) => s + (Number(r.dead) || 0), 0),
      waterTotal: rows.reduce((s, r) => s + (Number(r.water) || 0), 0),
      logNormTotal: rows.reduce((s, r) => s + (Number(r.logNorm) || 0), 0),
      zeroDead: rows.filter((r) => (Number(r.dead) || 0) < 1).map((r) => r.fieldMin),
      zeroWater: rows.filter((r) => (Number(r.water) || 0) < 1).map((r) => r.fieldMin),
      sample: rows.slice(0, 6),
    };
    const w1pass = rows.length >= 1
      && ev.arms.W1.types.length >= 1
      && rows.every((r) => Number(r.flag) === 1)
      && ev.arms.W1.zeroDead.length === 0;
    ev.verdict.W1 = { pass: w1pass, rows: rows.length, types: ev.arms.W1.types };
    log('W1', 'rows=' + rows.length + ' types=' + ev.arms.W1.types.length + ' deadTotal=' + ev.arms.W1.deadTotal);
    if (!rows.length) throw new Error('W1: no villageField r196ized rows');

    /* per-row dead_crop spot-checks */
    const probes = [];
    let deadPassAll = true;
    let probed = 0;
    for (const r of rows) {
      const fm = String(r.fieldMin).split(',').map(Number);
      const spots = [[1, 1], [2, 3], [4, 5], [7, 7]];
      for (const s of spots) {
        const t = await testB(fm[0] + s[0], fm[1] + 1, fm[2] + s[1], 'etim:dead_crop');
        probed++;
        probes.push({ fieldMin: r.fieldMin, pos: [fm[0] + s[0], fm[1] + 1, fm[2] + s[1]], dead: t.ok, actual: t.actual });
        if (!t.ok) deadPassAll = false;
      }
    }
    const deadHits = probes.filter((p) => p.dead).length;
    /* live-crop absence on those same cells */
    let liveHits = 0;
    const LIVE = ['minecraft:wheat', 'minecraft:carrots', 'minecraft:potatoes', 'minecraft:beetroots'];
    let liveChecked = 0;
    for (const p of probes) {
      if (!p.dead) continue; // the interesting cells are the dead ones
      const [x, y, z] = p.pos;
      for (const blk of LIVE) {
        liveChecked++;
        const t = await testB(x, y, z, blk);
        if (t.ok) { liveHits++; break; }
      }
    }
    ev.arms.W2 = { probed, deadHits, deadPassAll, liveHits, liveChecked, probes: probes.slice(0, 12) };
    ev.verdict.W2 = { pass: deadHits >= 1 && liveHits === 0, probed, deadHits, liveHits };
    log('W2', 'probed=' + probed + ' deadHits=' + deadHits + ' liveHits=' + liveHits);
    const stop1 = await stopBoot(1);
    ev.verdict.W0.stop1 = { exit: stop1.exitCode, build: stop1.build };

    /* ---------- W3: flag OFF, world w-b14w ---------- */
    stageWorld('w-b14w');
    ev.worlds.push({ name: 'w-b14w', seed: SEED });
    await startBoot(2, { fields: false, world: 'w-b14w' });
    const v2 = await locateVillage();
    ev.located2 = v2;
    if (!v2) throw new Error('no village found on boot2 within 19 hops — environmental');
    await cmd('tp ' + A + ' ' + (v2.x + 8) + ' 100 ' + (v2.z + 8), 4200);
    const rows2 = farmLines(srv.all.map((l) => L.strip(l))).map(parseKV);
    ev.arms.W3 = { rows: rows2.length, sample: rows2.slice(0, 3) };
    ev.verdict.W3 = { pass: rows2.length === 0, rows: rows2.length };
    log('W3', 'flag-off r196ized rows=' + rows2.length);
    if (rows2.length) throw new Error('W3: flag off but r196ized rows leaked');
    await stopBoot(2);

    ev.ok = Object.values(ev.verdict).every((s) => (s && s.pass !== false));
    log('out', 'verdict: ' + JSON.stringify(ev.verdict));
  } catch (e) {
    ev.ok = false;
    ev.error = String((e && e.message) || e);
    console.error('[fatal] ' + ev.error);
    try { if (srv) srv.stop(); } catch (f) { /* noop */ }
  }

  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  fs.writeFileSync(path.join(L.OUT, TAG + '.json'), JSON.stringify(ev, null, 2), 'utf8');
  log('out', path.join(L.OUT, TAG + '.json'));
  if (!ev.ok) process.exitCode = 1;
}

main();
