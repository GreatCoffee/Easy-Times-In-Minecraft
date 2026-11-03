'use strict';
/* f5-wb-analyze.js — W-FF 判窗汇总（读 evidence + .out，算带位与锚） */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const readEv = (t) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, t + '-evidence.json'), 'utf8')); } catch (e) { return null; } };
const readLog = (t) => { try { return fs.readFileSync(path.join(OUT, t + '.out'), 'utf8').split(/\r?\n/); } catch (e) { return []; } };
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const A = {};
/* ---- main ---- */
const main = readEv('f5-wb-main');
if (main) {
  A.main = {
    ids: main.ids, ffWindow: main.ffWindow, arWindow: main.arWindow, ffId: main.ffId, arId: main.arId,
    regCount: Object.keys(main.regAll || {}).length, regPrevAllSame: main.regPrevAllSame,
    slots: main.slotsCopper, overLevel: main.overLevel,
    carrier: Object.fromEntries(Object.entries(main.carrier || {}).map(([k, v]) => [k, {
      ff: v.fishing_fortune ? v.fishing_fortune.table : null,
      ar: v.arrow_recovery ? v.arrow_recovery.table : null,
      ffId: v.fishing_fortune ? v.fishing_fortune.id : null,
      slot2: (v.slots || []).find((s) => s.slot === 2) || null,
    }])),
    fishgate: main.fishgate, magnitude: main.magnitude, rowCounts: main.rowCounts,
    close: { cfg: main.cfgRestored, obf: main.obfCfgAfter, props: main.propsClose, port: main.portAfter, crash: main.crashAfter, stop: main.stop, build: main.buildSuccessful, mk: main.pinsAfter && main.pinsAfter.mk.ok },
  };
}
/* ---- fish ---- */
const fish = readEv('f5-wb-fish');
if (fish) {
  const L = readLog('f5-wb-fish').map(strip);
  const wins = [];
  for (let i = 0; i < L.length; i++) {
    const m = /\[FishLog\] gate wt=(\d+) adj=(-?\d+) dist=(\d+) blue=(\d) ci0=(\d+) light=(\d) ci2=(\d+) L=(\d+) lure=(\d+) ci3=(\d+) worm=(\d+) ci4=(\d+) roll=(\d+) bite=(\d)/.exec(L[i]);
    if (!m) continue;
    for (let j = i + 1; j < Math.min(i + 4, L.length); j++) {
      const w = /\[FishLog\] window ticks=(-?\d+)/.exec(L[j]);
      if (w) { wins.push({ gateLine: i + 1, firstRow: +w[1], catchable: +w[1] + 1 }); break; }
    }
  }
  A.fish = {
    catches: fish.catches, luckArm: fish.luckArm, lureArm: fish.lureArm, wormArm: fish.wormArm,
    windowFirstRows: wins,
    windowRange: wins.length ? [Math.min(...wins.map((w) => w.catchable)), Math.max(...wins.map((w) => w.catchable))] : null,
    close: { cfg: fish.cfgRestored, obf: fish.obfCfgAfter, props: fish.propsClose, port: fish.portAfter, crash: fish.crashAfter, stop: fish.stop, build: fish.buildSuccessful },
    rowCounts: fish.rowCounts,
  };
}
/* ---- type ---- */
const type = readEv('f5-wb-type');
if (type) A.type = { land: type.land, scan: type.scan, clean: type.clean, cleanAt: type.cleanAt, dirty: type.dirty, landAgain: type.landAgain, cfgClose: type.cfgClose };
/* ---- arrow ---- */
const arrow = readEv('f5-wb-arrow');
if (arrow) A.arrow = { probe: arrow.arrowProbe, shots: arrow.realShots && arrow.realShots.stats, rowCounts: arrow.rowCounts,
  close: { cfg: arrow.cfgRestored, obf: arrow.obfCfgAfter, props: arrow.propsClose, port: arrow.portAfter, crash: arrow.crashAfter, stop: arrow.stop, build: arrow.buildSuccessful } };
/* ---- arrow2 ---- */
const arrow2 = readEv('f5-wb-arrow2');
if (arrow2) A.arrow2 = { noLoot: arrow2.noLoot, child: arrow2.child, control: arrow2.control, controlItem: arrow2.controlItem };
/* ---- worm ---- */
const worm = readEv('f5-wb-worm');
if (worm) A.worm = { arms: worm.wormArms, close: { cfg: worm.cfgRestored, obf: worm.obfCfgAfter, props: worm.propsClose, port: worm.portAfter, crash: worm.crashAfter, stop: worm.stop, build: worm.buildSuccessful } };
/* ---- cfg / cfg2 ---- */
const cfg = readEv('f5-wb-cfg');
if (cfg) A.cfg = { lureOff: cfg.lureOff, largeFishOff: cfg.largeFishOff, close: { cfg: cfg.cfgRestored, obf: cfg.obfCfgAfter, props: cfg.propsClose, port: cfg.portAfter, crash: cfg.crashAfter, stop: cfg.stop, build: cfg.buildSuccessful } };
const cfg2 = readEv('f5-wb-cfg2');
if (cfg2) A.cfg2 = { biteMin: cfg2.biteMin, ffWindowFlip: cfg2.ffWindowFlip, overLevelFlip: cfg2.overLevelFlip, regCountFlip: cfg2.regCountFlip, fishingOff: cfg2.fishingOff, arrowOff: cfg2.arrowOff, close: { cfg: cfg2.cfgRestored, obf: cfg2.obfCfgAfter, props: cfg2.propsClose, port: cfg2.portAfter, crash: cfg2.crashAfter, stop: cfg2.stop, build: cfg2.buildSuccessful } };

/* ---- 判带工具 ---- */
function poissonBand(lambda, z) {
  /* 正态近似 ±z√λ（λ≥5 时足够） */
  return [+(lambda - z * Math.sqrt(lambda)).toFixed(2), +(lambda + z * Math.sqrt(lambda)).toFixed(2)];
}
function binomBand(p, n, z) {
  const s = Math.sqrt(p * (1 - p) / n);
  return [+(p - z * s).toFixed(4), +(p + z * s).toFixed(4)];
}
A.bands = {
  mag6000: { lambda: 12000 / 2400, band3: poissonBand(12000 / 2400, 3) },
  mag11500: { lambda: 12000 / 600, band3: poissonBand(12000 / 600, 3) },
  magL5: { lambda: 30000 / 353, band3: poissonBand(30000 / 353, 3) },
  worm: {
    clear_f0: { p: 1 / 16, band2: binomBand(1 / 16, 1600, 2) },
    rain_f0: { p: 1 / 4, band2: binomBand(1 / 4, 1600, 2) },
    rain_f1: { p: 1 / 3, band2: binomBand(1 / 3, 1600, 2) },
    rain_f3: { p: 1 / 2, band2: binomBand(1 / 2, 1600, 2) },
  },
  arrowKeep: { p: 0.84, n: 64, band3: binomBand(0.84, 64, 3) },
};
fs.writeFileSync(path.join(OUT, 'f5-wb-analysis.json'), JSON.stringify(A, null, 1) + '\n', 'utf8');
console.log(JSON.stringify(A, null, 1).slice(0, 6000));
console.log('written', path.join(OUT, 'f5-wb-analysis.json'));
