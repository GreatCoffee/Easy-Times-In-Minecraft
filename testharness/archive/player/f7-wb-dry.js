#!/usr/bin/env node
/**
 * f7-wb-dry.js - W-FM3 four-biome drying curve (5x5 field one chunk east of
 * the bot so the field's chunk random-ticks; the bot parks at the biome
 * centre). The src=dry row is pos=x,y,z -> the regex uses three coords.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = process.env.TAG || 'f7-wb-dry';
const WORLD = 'f7wc';
const AY = 139;
const PLOTS = {
  plains: { x: 202, z: 761, biomeX: 186, biomeZ: 761 },
  desert: { x: -342, z: -1031, biomeX: -326, biomeZ: -1031 },
  swamp: { x: -86, z: -519, biomeX: -70, biomeZ: -519 },
  snow: { x: 970, z: 761, biomeX: 954, biomeZ: 761 },
};
const TIMING = { plains: 130, desert: 100, swamp: 340, snow: 65 };
const sleep = L.sleep;
const log = L.log;

function tsOf(line) {
  const m = /^\[(\d\d):(\d\d):(\d\d)\]/.exec(line || '');
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null;
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), plots: {}, dry: {} };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  const byId = L.biomeTable();
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    const who = bot.username;
    const plot = async (name) => {
      const p = PLOTS[name];
      await L.tp(srv, p.biomeX + 0.5, AY + 2, p.biomeZ + 0.5, { bot: who, wait: 2200 });
      const bid = await bot.world.getBiome(new Vec3(p.x, 64, p.z));
      const b = byId[bid] || {};
      srv.send(`fill ${p.x - 4} ${AY - 1} ${p.z - 4} ${p.x + 4} ${AY - 1} ${p.z + 4} minecraft:stone 0`);
      srv.send(`fill ${p.x - 4} ${AY} ${p.z - 4} ${p.x + 4} ${AY + 5} ${p.z + 4} minecraft:air 0`);
      srv.send(`fill ${p.x - 2} ${AY} ${p.z - 2} ${p.x + 2} ${AY} ${p.z + 2} minecraft:farmland 7 replace`);
      await sleep(1200);
      const out = { x: p.x, z: p.z, biomeX: p.biomeX, biomeZ: p.biomeZ, biomeId: bid, biome: b.name || null, temp: b.temperature, rain: b.rainfall };
      ev.plots[name] = out;
      log('plot', name + ' ' + JSON.stringify(out));
      return out;
    };
    const parse = (p) => {
      const in5 = (a, b) => Math.abs(+a - p.x) <= 2 && Math.abs(+b - p.z) <= 2;
      const dry = [], keep = [], decay = [];
      for (let i = 0; i < srv.all.length; i++) {
        const l = L.strip(srv.all[i]);
        if (l.indexOf('[FarmLog]') < 0) continue;
        let m = /\[FarmLog\] moisture tick pos=(-?\d+),(-?\d+),(-?\d+) src=dry wet=(\d+)\D+(\d+) \[server\]/.exec(l);
        if (m && in5(m[1], m[3])) { dry.push({ x: +m[1], z: +m[3], wet: +m[4], next: +m[5], ts: tsOf(srv.all[i]) }); continue; }
        m = /\[FarmLog\] moisture chance pos=(-?\d+),(-?\d+) temp=([\d.]+) humid=(\d+) chance=([\d.]+) ksip=keep/.exec(l);
        if (m && in5(m[1], m[2])) { keep.push({ x: +m[1], z: +m[2], temp: +m[3], humid: +m[4], chance: +m[5], ts: tsOf(srv.all[i]) }); continue; }
        m = /\[FarmLog\] moisture decay pos=(-?\d+),(-?\d+),(-?\d+)/.exec(l);
        if (m && in5(m[1], m[3])) { decay.push({ x: +m[1], z: +m[3], ts: tsOf(srv.all[i]) }); }
      }
      return { dry, keep, decay };
    };
    const NAMES = (process.env.NAMES || 'plains,desert,swamp,snow').split(',');
    for (const name of NAMES) {
      const p = await plot(name);
      srv.send(`fill ${p.x - 2} ${AY} ${p.z - 2} ${p.x + 2} ${AY} ${p.z + 2} minecraft:farmland 7 replace`);
      await sleep(600);
      srv.send('gamerule randomTickSpeed 60');
      const from = srv.all.length;
      const t0 = Date.now();
      const limit = TIMING[name] * 1000;
      while (Date.now() - t0 < limit) {
        await sleep(8000);
        if (name !== 'snow') {
          const r = parse(p);
          const done = new Set(r.dry.filter((d) => d.next === 0).map((d) => d.x + ',' + d.z)).size;
          if (done >= 25) break;
        }
      }
      const r = parse(p);
      srv.send('gamerule randomTickSpeed 3');
      await sleep(300);
      const doneSet = new Set(r.dry.filter((d) => d.next === 0).map((d) => d.x + ',' + d.z));
      const reached = doneSet.size;
      const complete = reached >= 25;
      const chanceSet = [...new Set(r.keep.map((k) => k.chance))];
      const derivedChance = chanceSet.length ? chanceSet[0]
        : (p.temp !== null && p.temp !== undefined ? Math.max(0, +(p.temp - 0.15 - (p.rain > 0.85 ? 0.5 : 0)).toFixed(2)) : null);
      const expectedTicks = derivedChance === null ? null : (derivedChance <= 0 ? null : (derivedChance >= 1 ? 7 : +(7 / derivedChance).toFixed(1)));
      const steps = r.dry.map((d) => d.wet + '->' + d.next);
      const badSteps = steps.filter((s) => { const [a, b] = s.split('->').map(Number); return b !== a - 1; }).length;
      const dryRows = r.dry.length, keepRows = r.keep.length;
      ev.dry[name] = {
        biome: p.biome, temp: p.temp, rain: p.rain, chance: chanceSet, derivedChance,
        dryRows, keepRows, empirical: (dryRows + keepRows) ? +(dryRows / (dryRows + keepRows)).toFixed(3) : null,
        badSteps, reached, complete, observedTicks: +((dryRows + keepRows) / 25).toFixed(1), expectedTicks,
        decayRows: r.decay.length, elapsedSec: Math.round((Date.now() - t0) / 1000), steps: steps.slice(0, 6),
      };
      log('dry-' + name, JSON.stringify(ev.dry[name]));
    }
    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.portAfter = L.netstatListen(L.PORT);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
