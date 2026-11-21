#!/usr/bin/env node
/**
 * f7-wb-moist.js - W-FM2 (rain drip) + W-FM3 (biome drying curve).
 *
 * The four biome plots are far apart, and random ticks only run in loaded
 * chunks; each biome is therefore measured with the bot parked at its plot
 * (sequential sub-windows). rts is an instrument knob: rain at 30, drying at
 * 60; the per-tick probability (chance=) and the decrement chain are the
 * judged quantities, wall-clock is reported normalized to rts=3.
 *
 * Biome coords come from f7-wb-scan-evidence.json (seed etim27).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-moist';
const WORLD = 'f7wc';
const AY = 139;
const PLOTS = {
  plains: { x: 186, z: 761 },
  desert: { x: -326, z: -1031 },
  swamp: { x: -70, z: -519 },
  snow: { x: 954, z: 761 },
};

const sleep = L.sleep;
const log = L.log;

function tsOf(line) {
  const m = /^\[(\d\d):(\d\d):(\d\d)\]/.exec(line || '');
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), plots: {}, checks: {} };
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(L.PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  const rows = () => srv.all.map(L.strip);
  const raw = () => srv.all;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException|Critical injection failure/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    const who = bot.username;
    const byId = L.biomeTable();

    const plot = async (name) => {
      const p = PLOTS[name];
      const px = p.x + 16, pz = p.z; // field one chunk east: the bot's own chunk does not random-tick the field
      await L.tp(srv, p.x + 0.5, AY + 2, p.z + 0.5, { bot: who, wait: 2200 });
      const bid = await bot.world.getBiome(new Vec3(px, 64, pz));
      const b = byId[bid] || {};
      srv.send(`fill ${px - 4} ${AY - 1} ${pz - 4} ${px + 4} ${AY - 1} ${pz + 4} minecraft:stone 0`);
      srv.send(`fill ${px - 4} ${AY} ${pz - 4} ${px + 4} ${AY + 5} ${pz + 4} minecraft:air 0`);
      srv.send(`fill ${px - 2} ${AY} ${pz - 2} ${px + 2} ${AY} ${pz + 2} minecraft:farmland 7 replace`);
      await sleep(1200);
      const out = { x: px, z: pz, biomeX: p.x, biomeZ: p.z, y: AY, biomeId: bid, biome: b.name || null, temp: b.temperature, rain: b.rainfall };
      ev.plots[name] = out;
      log('plot', name + ' ' + JSON.stringify(out));
      return out;
    };
    const parsePlot = (name) => {
      const p = ev.plots[name] || PLOTS[name];
      const in5 = (a, b) => Math.abs(+a - p.x) <= 2 && Math.abs(+b - p.z) <= 2;
      const dry = [], keep = [], rain = [], decay = [];
      for (let i = 0; i < srv.all.length; i++) {
        const l = L.strip(srv.all[i]);
        if (l.indexOf('[FarmLog]') < 0) continue;
        let m = /\[FarmLog\] moisture tick pos=(\d+),(\d+),(\d+) src=rain wet=(\d+)\D+(\d+) \[server\]/.exec(l);
        if (m && in5(m[1], m[3])) { rain.push({ x: +m[1], z: +m[3], wet: +m[4], next: +m[5], ts: tsOf(srv.all[i]) }); continue; }
        m = /\[FarmLog\] moisture tick pos=(-?\d+),(-?\d+) src=dry wet=(\d+)\D+(\d+) \[server\]/.exec(l);
        if (m && in5(m[1], m[2])) { dry.push({ x: +m[1], z: +m[2], wet: +m[3], next: +m[4], ts: tsOf(srv.all[i]) }); continue; }
        m = /\[FarmLog\] moisture chance pos=(-?\d+),(-?\d+) temp=([\d.]+) humid=(\d+) chance=([\d.]+) ksip=keep/.exec(l);
        if (m && in5(m[1], m[2])) { keep.push({ x: +m[1], z: +m[2], temp: +m[3], humid: +m[4], chance: +m[5], ts: tsOf(srv.all[i]) }); continue; }
        m = /\[FarmLog\] moisture decay pos=(-?\d+),(-?\d+),(-?\d+)/.exec(l);
        if (m && in5(m[1], m[3])) { decay.push({ x: +m[1], z: +m[3], ts: tsOf(srv.all[i]) }); }
      }
      return { dry, keep, rain, decay };
    };

    /* ================= W-FM2 rain drip (plains) ================= */
    const P = await plot('plains');
    {
      srv.send('gamerule randomTickSpeed 30');
      srv.send('weather rain 600');
      await sleep(5000);
      srv.send(`fill ${P.x - 2} ${AY} ${P.z - 2} ${P.x + 2} ${AY} ${P.z + 2} minecraft:farmland 0 replace`);
      const from = srv.all.length;
      const t0 = Date.now();
      await sleep(95000);
      const seg = srv.all.slice(from).map(L.strip);
      const rains = [];
      for (let i = from; i < srv.all.length; i++) {
        const l = L.strip(srv.all[i]);
        const m = /\[FarmLog\] moisture tick pos=(-?\d+),(-?\d+),(-?\d+) src=rain wet=(\d+)\D+(\d+) \[server\]/.exec(l);
        if (m && Math.abs(+m[1] - P.x) <= 2 && Math.abs(+m[3] - P.z) <= 2) rains.push({ x: +m[1], z: +m[3], wet: +m[4], next: +m[5], ts: tsOf(srv.all[i]) });
      }
      const badStep = rains.filter((r) => r.next !== r.wet + 1);
      const wetValues = [...new Set(rains.map((r) => r.wet))].sort((a, b) => a - b);
      const jumped = rains.filter((r) => r.wet === 0 && r.next === 7);
      const perBlock = {};
      for (const r of rains) {
        const k = r.x + ',' + r.z;
        perBlock[k] = perBlock[k] || { first: null, last: null, n: 0 };
        if (perBlock[k].first === null) perBlock[k].first = r.wet;
        perBlock[k].last = r.next; perBlock[k].n++;
      }
      const reached7 = Object.values(perBlock).filter((b) => b.last === 7).length;
      const saw0 = Object.values(perBlock).filter((b) => b.first === 0).length;
      ev.checks.rain = { rows: rains.length, badStep: badStep.length, jumped0to7: jumped.length,
        wetValues, blocks: Object.keys(perBlock).length, reached7, saw0,
        elapsedSec: Math.round((Date.now() - t0) / 1000), sample: rains.slice(0, 5), last: rains.slice(-3),
        perBlock: Object.entries(perBlock).slice(0, 6).map(([k, v]) => ({ pos: k, first: v.first, last: v.last, n: v.n })) };
      log('rain', JSON.stringify({ rows: ev.checks.rain.rows, bad: badStep.length, jump: jumped.length,
        wet: wetValues, blocks: ev.checks.rain.blocks, reached7, saw0, sec: ev.checks.rain.elapsedSec }));

      srv.send('weather clear 1000000');
      await sleep(25000);
      const from2 = srv.all.length;
      await sleep(15000);
      const after = srv.all.slice(from2).map(L.strip).filter((l) => /moisture tick .* src=rain/.test(l)).length;
      ev.checks.rain.afterClearRainRows = after;
      log('rain-clear', 'post-clear rain rows in 15s = ' + after);
    }

    /* ================= W-FM3 biome drying (sequential) ================= */
    const timings = { plains: 260, desert: 90, swamp: 330, snow: 60 };
    ev.checks.dry = {};
    for (const name of ['plains', 'desert', 'swamp', 'snow']) {
      const p = ev.plots[name];
      await L.tp(srv, p.biomeX + 0.5, AY + 2, p.biomeZ + 0.5, { bot: who, wait: 1500 });
      srv.send(`fill ${p.x - 2} ${AY} ${p.z - 2} ${p.x + 2} ${AY} ${p.z + 2} minecraft:farmland 7 replace`);
      await sleep(800);
      srv.send('gamerule randomTickSpeed 60');
      const from = srv.all.length;
      const t0 = Date.now();
      const limit = timings[name] * 1000;
      let last = -1;
      while (Date.now() - t0 < limit) {
        await sleep(8000);
        if (name !== 'snow') {
          const dry = parsePlot(name).dry;
          const done = new Set(dry.filter((d) => d.next === 0).map((d) => d.x + ',' + d.z)).size;
          if (done >= 25) break;
        }
      }
      const r = parsePlot(name);
      srv.send('gamerule randomTickSpeed 3');
      await sleep(300);
      const doneSet = new Set(r.dry.filter((d) => d.next === 0).map((d) => d.x + ',' + d.z));
      const reached = doneSet.size;
      const complete = reached >= 25;
      const chanceSet = [...new Set(r.keep.map((k) => k.chance))];
      const tempSet = [...new Set(r.keep.map((k) => k.temp))];
      const humidSet = [...new Set(r.keep.map((k) => k.humid))];
      const steps = r.dry.map((d) => d.wet + '->' + d.next);
      const badSteps = steps.filter((s) => { const [a, b] = s.split('->').map(Number); return b !== a - 1; }).length;
      const dryRows = r.dry.length, keepRows = r.keep.length;
      const empirical = (dryRows + keepRows) ? +(dryRows / (dryRows + keepRows)).toFixed(3) : null;
      const derivedChance = chanceSet.length ? chanceSet[0]
        : (p.temp !== null && p.temp !== undefined ? Math.max(0, +(p.temp - 0.15 - (p.rain > 0.85 ? 0.5 : 0)).toFixed(2)) : null);
      const observedTicks = (dryRows + keepRows) / 25;
      const expectedTicks = derivedChance === null ? null : (derivedChance <= 0 ? null : (derivedChance >= 1 ? 7 : +(7 / derivedChance).toFixed(1)));
      ev.checks.dry[name] = {
        biome: p.biome, temp: p.temp, rain: p.rain, chance: chanceSet, tempSet, humidSet, derivedChance,
        dryRows, keepRows, empirical, badSteps, steps: steps.slice(0, 8),
        reached, complete, observedTicks: +observedTicks.toFixed(1), expectedTicks,
        decayRows: r.decay.length, elapsedSec: Math.round((Date.now() - t0) / 1000),
      };
      log('dry-' + name, JSON.stringify(ev.checks.dry[name]));
    }

    ev.rowCounts = L.rowCounts(rows());
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.portAfter = L.netstatListen(L.PORT);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
