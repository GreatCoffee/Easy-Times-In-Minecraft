#!/usr/bin/env node
/**
 * d1-wb-rev-chestparse.js — 20 万胸甲窗流式解析（400MB .out，不做整档读入）
 * 输出 d1-wb-rev-chest-summary.json：分布直方 / 族对 / 九步不变量 / 模型 χ²
 */
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const FILE = process.env.F || path.join(OUT, 'd1-wb-rev-chest.out');
const ITEM = process.env.ITEM || 'minecraft:diamond_chestplate';
const armor = JSON.parse(fs.readFileSync(path.join(OUT, 'd1-wb-rev-armor-evidence.json'), 'utf8'));
const reg = armor.regAll;
const idName = {}; const nameId = {};
for (const [k, v] of Object.entries(reg)) { idName[v.id] = k; nameId[k] = v.id; }

function rwOf(name) {
  const r = reg[name]; if (!r) return null;
  const parts = r.rwindow.trim().split(/\s+/).map((x) => { const m = /^L(\d+)=(\d+)\/(\d+)$/.exec(x); return m ? { L: +m[1], lo: +m[2], hi: +m[3] } : null; }).filter(Boolean);
  return { name, id: r.id, rw: r.rw, cap: parts.length, diff: parts[0].lo === 1 ? 10 : parts[0].lo + 9 };
}
const rndFactory = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const minCost = (d, L) => Math.max(d - 10, 0) + d * (L - 1) + 1;
const isDamage = (n) => ['minecraft:sharpness', 'minecraft:smite', 'minecraft:bane_of_arthropods'].includes(n);
const isProt = (n) => ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:feather_falling',
  'minecraft:blast_protection', 'minecraft:projectile_protection'].includes(n);
function compatible(p, c) {
  if (isDamage(p)) return !isDamage(c);
  if (isProt(p)) { if (!isProt(c)) return true; return c === 'minecraft:feather_falling' || p === 'minecraft:feather_falling'; }
  if (p === 'minecraft:looting' || p === 'minecraft:fortune') return c !== 'minecraft:silk_touch';
  if (p === 'minecraft:silk_touch') return c !== 'minecraft:fortune';
  return p !== c;
}
function buildOnce(rnd, cands, levels) {
  const out = [];
  let adj = Math.trunc(levels * (1 + (rnd() - 0.5) * 0.5));
  if (adj < 1) adj = 1;
  while (adj > 0) {
    const map = [];
    for (const c of cands) {
      if (c.cap > 1) { for (let L = c.cap; L > 0; L--) if (minCost(c.diff, L) <= adj) { map.push({ c, L }); break; } }
      else if (minCost(c.diff, 3) <= adj) map.push({ c, L: 1 });
    }
    const kept = map.filter((e) => out.every((p) => compatible(p.c.name, e.c.name)));
    if (!kept.length) break;
    const total = kept.reduce((a, e) => a + e.c.rw, 0);
    let roll = rnd() * total; let pick = kept[kept.length - 1];
    for (const e of kept) { roll -= e.c.rw; if (roll < 0) { pick = e; break; } }
    let L = pick.L;
    if (out.length < 2 && kept.length > 1 && pick.c.cap > 1 && rnd() < 0.5) L = 1 + Math.floor(rnd() * L);
    out.push({ c: pick.c, L });
    adj -= (pick.c.cap > 1 ? minCost(pick.c.diff, L) : minCost(pick.c.diff, 3));
    adj -= 5;
    if (adj < 5 || out.length > 2) break;
  }
  return out;
}

const PREFIX = /^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/;
const RE_S = /^\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(\d+) start/;
const RE_P = /^\[EnchLog\] pick item=(\S+) ench=(\d+) L=(\d+) cost=(\d+) adj=(-?\d+)/;
const RE_E = /^\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(-?\d+) cand=end picks=(\d+)/;

const PAIRS = [['minecraft:protection', 'minecraft:fire_protection'], ['minecraft:protection', 'minecraft:blast_protection'],
  ['minecraft:protection', 'minecraft:projectile_protection'], ['minecraft:fire_protection', 'minecraft:blast_protection'],
  ['minecraft:protection', 'minecraft:thorns'], ['minecraft:protection', 'minecraft:unbreaking']];

const res = { item: ITEM, builds: 0, ends: 0, picks: 0, hist: {}, pickHist: {}, adjBad: 0, endBad: 0,
  budgetHist: {}, maxPicks: 0, pairs: {}, pairId: {}, outBytes: fs.statSync(FILE).size };
let cur = null;
const counts = new Map();

async function run() {
  const rl = readline.createInterface({ input: fs.createReadStream(FILE, 'utf8'), crlfDelay: Infinity });
  for await (const raw of rl) {
    if (raw.indexOf('[EnchLog]') < 0) continue;
    const l = raw.replace(PREFIX, '');
    let m = RE_S.exec(l);
    if (m) {
      if (m[1] !== ITEM) { cur = null; continue; }
      cur = { budget: +m[2], adj0: +m[3], picks: [] };
      res.builds++;
      res.budgetHist[m[2]] = (res.budgetHist[m[2]] || 0) + 1;
      continue;
    }
    if (!cur) continue;
    m = RE_P.exec(l);
    if (m) {
      const p = { ench: +m[2], L: +m[3], cost: +m[4], adj: +m[5] };
      const prev = cur.picks.length ? cur.picks[cur.picks.length - 1].adj : cur.adj0;
      if (p.adj !== prev - p.cost - 5) res.adjBad++;
      cur.picks.push(p);
      continue;
    }
    m = RE_E.exec(l);
    if (m) {
      if (+m[3] !== (cur.picks.length ? cur.picks[cur.picks.length - 1].adj : cur.adj0)) res.endBad++;
      if (+m[4] !== cur.picks.length) res.endBad++;
      res.ends++;
      const n = cur.picks.length;
      res.pickHist[n] = (res.pickHist[n] || 0) + 1;
      if (n > res.maxPicks) res.maxPicks = n;
      const set = new Set();
      for (const p of cur.picks) {
        const nm = idName[p.ench] || ('id' + p.ench);
        counts.set(nm, (counts.get(nm) || 0) + 1);
        res.picks++;
        set.add(nm);
      }
      for (const [a, b] of PAIRS) {
        const k = a + '+' + b;
        if (set.has(a) && set.has(b)) res.pairs[k] = (res.pairs[k] || 0) + 1;
      }
      cur = null;
    }
  }
  res.hist = Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1]));
  for (const [a, b] of PAIRS) { res.pairId[a + '+' + b] = [nameId[a], nameId[b]]; }

  /* 模型 χ²（同一 reg 行权重/窗口） */
  const names = Object.keys(reg).filter((n) => n !== 'minecraft:mending' && n !== 'minecraft:vanishing_curse' && n !== 'minecraft:binding_curse');
  const CHEST = ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:blast_protection', 'minecraft:projectile_protection',
    'minecraft:thorns', 'etim:endurance', 'etim:regeneration', 'minecraft:unbreaking', 'minecraft:mending',
    'minecraft:vanishing_curse', 'minecraft:binding_curse'];
  const cands = CHEST.map(rwOf).filter(Boolean);
  const budgets = [];
  for (const [b, n] of Object.entries(res.budgetHist)) for (let i = 0; i < n; i++) budgets.push(+b);
  const rnd = rndFactory(20261104);
  const mh = {}; let mp = 0;
  const mPickHist = {};
  for (const lv of budgets) {
    const out = buildOnce(rnd, cands, lv);
    mPickHist[out.length] = (mPickHist[out.length] || 0) + 1;
    for (const p of out) { mh[p.c.name] = (mh[p.c.name] || 0) + 1; mp++; }
  }
  const scale = res.picks / Math.max(mp, 1);
  let chi2 = 0, df = 0; const rows = [];
  for (const n of new Set([...Object.keys(res.hist), ...Object.keys(mh)])) {
    const e = (mh[n] || 0) * scale; const o = res.hist[n] || 0;
    if (e >= 5) { chi2 += (o - e) * (o - e) / e; df++; rows.push({ n, o, e: +e.toFixed(1), share: +(o / res.picks).toFixed(4), mshare: +((mh[n] || 0) / mp).toFixed(4) }); }
  }
  res.model = { picks: mp, hist: mh, pickHist: mPickHist, cands: cands.map((c) => ({ n: c.name, rw: c.rw, cap: c.cap, diff: c.diff })) };
  res.chi2 = +chi2.toFixed(2); res.df = df; res.rows = rows.sort((a, b) => b.o - a.o);
  res.commonShare = res.picks ? +(res.hist['minecraft:protection'] / res.picks).toFixed(4) : null;
  res.modelCommonShare = mp ? +((mh['minecraft:protection'] || 0) / mp).toFixed(4) : null;
  fs.writeFileSync(path.join(OUT, 'd1-wb-rev-chest-summary.json'), JSON.stringify(res, null, 1) + '\n', 'utf8');
  console.log(JSON.stringify({ item: res.item, builds: res.builds, ends: res.ends, picks: res.picks,
    hist: res.hist, pickHist: res.pickHist, adjBad: res.adjBad, endBad: res.endBad, budgetHist: res.budgetHist,
    pairs: res.pairs, chi2: res.chi2, df: res.df, common: [res.commonShare, res.modelCommonShare],
    modelPickHist: mPickHist, outMB: Math.round(res.outBytes / 1048576) }, null, 1));
  console.log('rows', JSON.stringify(res.rows.slice(0, 12)));
}
run().catch((e) => { console.error(e); process.exit(1); });
