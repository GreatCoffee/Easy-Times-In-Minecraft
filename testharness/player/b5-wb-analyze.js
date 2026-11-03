'use strict';
/* b5-wb-analyze.js — 从三窗 .out 重解析逐臂分布 + 精确公式分布（枚举）对照 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');

const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
const RE = {
  gate: /\[ButchLog\] gate entity=(\S+) child=(true|false) doMobLoot=(true|false) lvl=(\d+) kept=(\d+) familyRemoved=(\d+) recent=(true|false) well=(\S+)/,
  skip: /\[ButchLog\] gate entity=(\S+) child=(true|false) doMobLoot=(true|false) .*?skip/,
  cow: /\[ButchLog\] cow well=(\S+) lvl=(\d+) leather=(\d+) rB=(-?\d+) nudge=(\d+) beef=(\d+) burning=(true|false)/,
  pig: /\[ButchLog\] pig well=(\S+) lvl=(\d+) rB=(-?\d+) pork=(\d+) burning=(true|false) saddled=(true|false)/,
  sheep: /\[ButchLog\] sheep sheared=(true|false) burning=(true|false) color=(\S+) well=(\S+) lvl=(\d+) rB=(-?\d+) wool=(\d+) mutton=(\d+) leather=(\d+)/,
  horse: /\[ButchLog\] horse cls=(\S+) lvl=(\d+) n=(\d+) zeroed=(\d+) baseFlesh=(\d+) meat=(\d+) burning=(true|false)/,
  spider: /\[ButchLog\] spider recent=(true|false) lvl=(\d+) r3=(-?\d+) short=(true|false) eye=(\d+)/,
};

/* ---- 精确分布（枚举骰面） ---- */
function dist(sampleFn) { // sampleFn -> number; 返回 {map, mean, var, max}
  const m = new Map();
  // 通过符号枚举：由调用方给 combos
  return m;
}
function enumerate(dice, fn) {
  // dice: [n1,n2,...]; 枚举全部组合等概率
  const out = new Map();
  const idx = new Array(dice.length).fill(0);
  const total = dice.reduce((a, b) => a * b, 1);
  for (let t = 0; t < total; t++) {
    let x = t;
    const v = [];
    for (let i = 0; i < dice.length; i++) { v.push(x % dice[i]); x = Math.floor(x / dice[i]); }
    const y = fn(v);
    out.set(y, (out.get(y) || 0) + 1);
  }
  let mean = 0, sq = 0, max = -Infinity;
  for (const [k, c] of out) { const p = c / total; mean += k * p; sq += k * k * p; if (k > max) max = k; }
  return { dist: Object.fromEntries([...out.entries()].sort((a, b) => a[0] - b[0]).map(([k, c]) => [k, c / total])), mean, var: sq - mean * mean, max };
}
const F = {
  cowBeef: (L) => enumerate([3, 1 + L, 2], (v) => { let b = v[0] + 1 + v[1]; if (b === 1 && v[2] === 0) b++; return b; }),
  cowLeather: () => enumerate([3], (v) => v[0] + 1),
  pigPork: (L) => enumerate([3, 1 + L], (v) => v[0] + 1 + v[1]),
  sheepMutton: (L) => enumerate([2, 1 + L], (v) => Math.max(1, v[0] + v[1])),
  sheepWool: () => ({ mean: 0.5, var: 0.25, max: 1 }),
  horseMeat: (L) => enumerate([1 + L, 2], (v) => 1 + v[0] + v[1]),
  llamaMeat: (L) => enumerate([1 + L], (v) => 1 + v[0]),
  spiderEye: (L) => enumerate([3, 1 + L], (v) => (v[0] === 0 ? 1 : (v[1] > 0 ? 1 : 0))),
  zombieFlesh: () => enumerate([3, 4, 4, 4], (v) => { const n = v[0] + 1; let f = 0; for (let i = 0; i < n; i++) { if (v[1 + i] !== 0) f++; } return f; }),
};

function load(tag) {
  const raw = fs.readFileSync(path.join(OUT, tag + '.out'), 'utf8').split(/\r?\n/);
  const lines = [], rawNo = [];
  raw.forEach((l, i) => {
    /* 去掉 harness 直写标记行（它们只进文件不进 srv.all），恢复 all 索引一一对应 */
    if (l.startsWith('### [harness] > ')) return;
    lines.push(strip(l)); rawNo.push(i + 1);
  });
  return { lines, rawNo };
}
function ev(tag) { return JSON.parse(fs.readFileSync(path.join(OUT, tag + '-evidence.json'), 'utf8')); }

function parseRange(src, from, to) {
  const lines = src.lines;
  const seg = lines.slice(from - 1, to);
  const gates = seg.map((l) => RE.gate.exec(l)).filter(Boolean)
    .map((m) => ({ entity: m[1], child: m[2] === 'true', lvl: +m[4], kept: +m[5], removed: +m[6], recent: m[7] === 'true', well: m[8] }));
  const fam = { cow: [], pig: [], sheep: [], horse: [], spider: [] };
  for (const l of seg) {
    let m;
    if ((m = RE.cow.exec(l))) fam.cow.push({ well: m[1], lvl: +m[2], leather: +m[3], rB: +m[4], nudge: +m[5], beef: +m[6], burning: m[7] === 'true' });
    else if ((m = RE.pig.exec(l))) fam.pig.push({ well: m[1], lvl: +m[2], rB: +m[3], pork: +m[4], burning: m[5] === 'true', saddled: m[6] === 'true' });
    else if ((m = RE.sheep.exec(l))) fam.sheep.push({ sheared: m[1] === 'true', burning: m[2] === 'true', color: m[3], well: m[4], lvl: +m[5], rB: +m[6], wool: +m[7], mutton: +m[8], leather: +m[9] });
    else if ((m = RE.horse.exec(l))) fam.horse.push({ cls: m[1], lvl: +m[2], n: +m[3], zeroed: +m[4], baseFlesh: +m[5], meat: +m[6], burning: m[7] === 'true' });
    else if ((m = RE.spider.exec(l))) fam.spider.push({ recent: m[1] === 'true', lvl: +m[2], r3: +m[3], short: m[4] === 'true', eye: +m[5] });
  }
  /* 锚：该臂首/末 family 行在 .out 中的真实行号 */
  let firstRaw = null, lastRaw = null;
  for (let i = 0; i < seg.length; i++) {
    if (RE.gate.test(seg[i]) || RE.cow.test(seg[i]) || RE.pig.test(seg[i]) || RE.sheep.test(seg[i])
      || RE.horse.test(seg[i]) || RE.spider.test(seg[i])) {
      if (firstRaw === null) firstRaw = src.rawNo[from - 1 + i];
      lastRaw = src.rawNo[from - 1 + i];
    }
  }
  return { gates, fam, skips: seg.filter((l) => RE.skip.test(l)).length, anchor: `${firstRaw}-${lastRaw}` };
}
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const hist = (a) => { const h = {}; for (const v of a) h[v] = (h[v] || 0) + 1; return h; };
function chi2(obsA, obsB) {
  const keys = new Set([...Object.keys(obsA), ...Object.keys(obsB)]);
  const na = Object.values(obsA).reduce((a, b) => a + b, 0), nb = Object.values(obsB).reduce((a, b) => a + b, 0);
  let x2 = 0, df = 0;
  for (const k of keys) {
    const a = obsA[k] || 0, b = obsB[k] || 0;
    const tot = a + b; if (tot === 0) continue;
    const ea = tot * na / (na + nb), eb = tot * nb / (na + nb);
    x2 += (a - ea) ** 2 / ea + (b - eb) ** 2 / eb;
    df++;
  }
  return { x2: +x2.toFixed(3), df: df - 1 };
}
function band(p, n) { const s = Math.sqrt(Math.max(p * (1 - p), 1e-9) / n); return [+(p - 3 * s).toFixed(4), +(p + 3 * s).toFixed(4)]; }
function meanBand(d, n) { const s = Math.sqrt(d.var / n); return [+(d.mean - 3 * s).toFixed(4), +(d.mean + 3 * s).toFixed(4)]; }

const baseEv = ev('b5-wb-base');
const enchEv = ev('b5-wb-ench');
const cfgEv = ev('b5-wb-cfgitems');
const B = load('b5-wb-base'), E = load('b5-wb-ench'), C = load('b5-wb-cfgitems');

const out = { generatedAt: new Date().toISOString(), arms: {} };
const kindOf = (id) => id.split('-')[0].replace('burn-', '');
for (const a of baseEv.arms) {
  const [from, to] = a.lines.split('-').map(Number);
  const p = parseRange(B, from, to);
  const kind = a.kind;
  const rows = p.fam[kind];
  const rec = {
    id: a.id, kind, n: rows.length, gates: p.gates.length, gateRecent: p.gates.filter((g) => g.recent).length,
    gateNonRecent: p.gates.filter((g) => !g.recent).length, skips: p.skips,
    lvl: [...new Set(p.gates.map((g) => g.lvl))], wellSet: [...new Set(p.gates.map((g) => g.well))],
    kept: [...new Set(p.gates.map((g) => g.kept))], removed: hist(p.gates.map((g) => g.removed)), anchor: p.anchor,
  };
  if (kind === 'cow') {
    rec.leather = { hist: hist(rows.map((r) => r.leather)), mean: +mean(rows.map((r) => r.leather)).toFixed(4), theory: F.cowLeather() };
    rec.beef = { hist: hist(rows.map((r) => r.beef)), mean: +mean(rows.map((r) => r.beef)).toFixed(4), theory: F.cowBeef(Number(a.lvl ? 0 : 0)) };
    rec.nudge = rows.filter((r) => r.nudge === 1).length;
    rec.nudgeRate = +(rec.nudge / rows.length).toFixed(4);
    rec.nudgeBand = band(1 / 6, rows.length);
  } else if (kind === 'pig') {
    rec.pork = { hist: hist(rows.map((r) => r.pork)), mean: +mean(rows.map((r) => r.pork)).toFixed(4) };
  } else if (kind === 'sheep') {
    rec.mutton = { hist: hist(rows.map((r) => r.mutton)), mean: +mean(rows.map((r) => r.mutton)).toFixed(4) };
    rec.woolRate = +(rows.filter((r) => r.wool === 1).length / rows.length).toFixed(4);
    rec.leatherRate = +(rows.filter((r) => r.leather === 1).length / rows.length).toFixed(4);
    rec.sheared = [...new Set(rows.map((r) => r.sheared))];
    rec.burning = [...new Set(rows.map((r) => r.burning))];
  } else if (kind === 'horse') {
    rec.base = { hist: hist(rows.map((r) => r.n)), mean: +mean(rows.map((r) => r.n)).toFixed(4) };
    rec.meat = { hist: hist(rows.map((r) => r.meat)), mean: +mean(rows.map((r) => r.meat)).toFixed(4) };
    rec.flesh = { hist: hist(rows.map((r) => r.baseFlesh)), mean: +mean(rows.map((r) => r.baseFlesh)).toFixed(4) };
    rec.zeroRate = +(rows.filter((r) => r.baseFlesh === 0).length / rows.length).toFixed(4);
    rec.zeroBand = band(7 / 64, rows.length);
    rec.cls = [...new Set(rows.map((r) => r.cls))];
  } else if (kind === 'spider') {
    rec.eyeRate = +(rows.filter((r) => r.eye === 1).length / rows.length).toFixed(4);
    rec.shortRate = +(rows.filter((r) => r.short).length / rows.length).toFixed(4);
    rec.shortAlwaysEye = rows.filter((r) => r.short).every((r) => r.eye === 1);
  }
  out.arms[a.id] = rec;
}

/* ench 臂 */
for (const a of enchEv.arms) {
  const [from, to] = a.lines.split('-').map(Number);
  const p = parseRange(E, from, to);
  const kind = a.kind;
  const lvl = a.armLvl;
  const rows = p.fam[kind];
  const rec = { id: a.id, kind, lvl, n: rows.length, gateRecent: p.gates.filter((g) => g.recent).length,
    lvlObserved: [...new Set(p.gates.map((g) => g.lvl))], wellSet: [...new Set(p.gates.map((g) => g.well))], anchor: p.anchor };
  if (kind === 'cow') {
    rec.beef = { hist: hist(rows.map((r) => r.beef)), mean: +mean(rows.map((r) => r.beef)).toFixed(4), theory: F.cowBeef(lvl), band: meanBand(F.cowBeef(lvl), rows.length) };
    rec.nudgeRate = +(rows.filter((r) => r.nudge === 1).length / rows.length).toFixed(4);
  } else if (kind === 'pig') {
    rec.pork = { hist: hist(rows.map((r) => r.pork)), mean: +mean(rows.map((r) => r.pork)).toFixed(4), theory: F.pigPork(lvl), band: meanBand(F.pigPork(lvl), rows.length) };
  } else if (kind === 'sheep') {
    rec.mutton = { hist: hist(rows.map((r) => r.mutton)), mean: +mean(rows.map((r) => r.mutton)).toFixed(4), theory: F.sheepMutton(lvl), band: meanBand(F.sheepMutton(lvl), rows.length) };
    rec.woolRate = +(rows.filter((r) => r.wool === 1).length / rows.length).toFixed(4);
  } else if (kind === 'horse') {
    const d = (a.id.startsWith('llama') || a.id.startsWith('donkey')) ? F.llamaMeat(lvl) : F.horseMeat(lvl);
    rec.meat = { hist: hist(rows.map((r) => r.meat)), mean: +mean(rows.map((r) => r.meat)).toFixed(4), theory: d, band: meanBand(d, rows.length) };
  } else if (kind === 'spider') {
    rec.eyeRate = +(rows.filter((r) => r.eye === 1).length / rows.length).toFixed(4);
    rec.eyeBand = band(F.spiderEye(lvl).mean, rows.length);
    rec.shortRate = +(rows.filter((r) => r.short).length / rows.length).toFixed(4);
    rec.shortAlwaysEye = rows.filter((r) => r.short).every((r) => r.eye === 1);
  }
  out.arms[a.id] = rec;
}

/* 无附魔 vs looting3 同分布（牛） */
{
  const a0 = out.arms['cow'], a3 = out.arms['cow-looting3'];
  out.lootingCompare = {
    leather: chi2(a0.leather.hist, a3.leather.hist),
    beef: chi2(a0.beef.hist, a3.beef.hist),
    nudgeRate: [a0.nudgeRate, a3.nudgeRate],
    means: { leather: [a0.leather.mean, a3.leather.mean], beef: [a0.beef.mean, a3.beef.mean] },
  };
}
/* 理论分布（供报告） */
out.theory = {
  cowBeef: { L0: F.cowBeef(0), L1: F.cowBeef(1), L3: F.cowBeef(3) },
  pigPork: { L1: F.pigPork(1), L3: F.pigPork(3) },
  sheepMutton: { L1: F.sheepMutton(1), L3: F.sheepMutton(3) },
  horseMeat: { L1: F.horseMeat(1), L3: F.horseMeat(3) },
  llamaMeat: { L1: F.llamaMeat(1), L3: F.llamaMeat(3) },
  spiderEye: { L0: F.spiderEye(0), L1: F.spiderEye(1), L3: F.spiderEye(3) },
  zombieFlesh: F.zombieFlesh(),
};
out.env = {
  base: { cfgFaceRestored: baseEv.cfgFaceRestored, cfgClose: baseEv.cfgClose, obf: baseEv.obfCfgAfter, props: baseEv.propsClose, crash: baseEv.crashAfter, stop: baseEv.stop, build: baseEv.buildSuccessful, counts: baseEv.rowCounts, lines: B.length },
  ench: { cfgFaceRestored: enchEv.cfgFaceRestored, cfgClose: enchEv.cfgClose, obf: enchEv.obfCfgAfter, props: enchEv.propsClose, crash: enchEv.crashAfter, stop: enchEv.stop, build: enchEv.buildSuccessful, counts: enchEv.rowCounts, lines: E.length },
  cfg: { cfgFaceRestored: cfgEv.cfgFaceRestored, cfgClose: cfgEv.cfgClose, obf: cfgEv.obfCfgAfter, props: cfgEv.propsClose, crash: cfgEv.crashAfter, stop: cfgEv.stop, build: cfgEv.buildSuccessful, counts: cfgEv.rowCounts, lines: C.length, wb2: cfgEv.wb2, itemProbes: cfgEv.itemProbes },
};
fs.writeFileSync(path.join(OUT, 'b5-wb-analysis.json'), JSON.stringify(out, null, 1) + '\n', 'utf8');

/* 打印摘要 */
const pr = (id, r) => {
  const bits = [`${id}: n=${r.n}`, r.gateNonRecent !== undefined ? `nonRecent=${r.gateNonRecent}` : ''];
  if (r.leather) bits.push('leather=' + JSON.stringify(r.leather.hist) + ' mean=' + r.leather.mean);
  if (r.beef) bits.push('beef=' + JSON.stringify(r.beef.hist) + ' mean=' + r.beef.mean + (r.beef.theory ? ' th=' + r.beef.theory.mean.toFixed(4) + ' max=' + r.beef.theory.max + ' band=' + JSON.stringify(r.beef.band || meanBand(r.beef.theory, r.n)) : ''));
  if (r.nudgeRate !== undefined) bits.push('nudge=' + r.nudgeRate);
  if (r.pork) bits.push('pork=' + JSON.stringify(r.pork.hist) + ' mean=' + r.pork.mean + (r.pork.theory ? ' th=' + r.pork.theory.mean.toFixed(4) : ''));
  if (r.mutton) bits.push('mutton=' + JSON.stringify(r.mutton.hist) + ' mean=' + r.mutton.mean + (r.mutton.theory ? ' th=' + r.mutton.theory.mean.toFixed(4) : ''));
  if (r.woolRate !== undefined) bits.push('wool=' + r.woolRate);
  if (r.leatherRate !== undefined) bits.push('sheepLeather=' + r.leatherRate);
  if (r.meat) bits.push('meat=' + JSON.stringify(r.meat.hist) + ' mean=' + r.meat.mean + (r.meat.theory ? ' th=' + r.meat.theory.mean.toFixed(4) + ' band=' + JSON.stringify(r.meat.band) : ''));
  if (r.base) bits.push('base=' + JSON.stringify(r.base.hist) + ' mean=' + r.base.mean);
  if (r.flesh) bits.push('flesh=' + JSON.stringify(r.flesh.hist) + ' zero=' + r.zeroRate + ' band=' + JSON.stringify(r.zeroBand));
  if (r.eyeRate !== undefined) bits.push('eye=' + r.eyeRate + ' short=' + r.shortRate + ' shortAlwaysEye=' + r.shortAlwaysEye + (r.eyeBand ? ' band=' + JSON.stringify(r.eyeBand) : ''));
  bits.push('lvl=' + JSON.stringify(r.lvl || r.lvlObserved), 'kept=' + JSON.stringify(r.kept), 'rm=' + JSON.stringify(r.removed));
  console.log(bits.filter(Boolean).join(' '));
};
for (const k of Object.keys(out.arms)) pr(k, out.arms[k]);
console.log('looting', JSON.stringify(out.lootingCompare));
console.log('env', JSON.stringify(out.env).slice(0, 800));
console.log('written', path.join(OUT, 'b5-wb-analysis.json'));
