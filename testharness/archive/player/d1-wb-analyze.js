#!/usr/bin/env node
/**
 * d1-wb-analyze.js — W-DP 判窗汇总：模型（R196 九步镜像）↔ 真机 χ²、载体矩阵、
 * 九步不变量、预算/可达/费用/怪装/开关面聚合。只读 evidence 与 .out。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const readEv = (t) => { try { return JSON.parse(fs.readFileSync(path.join(OUT, t + '-evidence.json'), 'utf8')); } catch (e) { return null; } };

const A = {};
const main = readEv('d1-wb-main');
A.main = main && {
  ids: main.ids, regCount: main.regCount, regPrevAllSame: main.regPrevAllSame, regPrevCount: main.regPrevCount,
  ff: main.ff, ar: main.ar, fa: main.fa, tf: main.tf, rods: main.rods,
  rowCounts: main.rowCounts, tableSmoke: main.tableSmoke && { opened: main.tableSmoke.opened, applied: main.tableSmoke.applied, levels: main.tableSmoke.levels.slice(0, 3) },
  close: { cfg: main.cfgAfter, obf: main.obfCfgAfter, props: main.propsClose, port: main.portAfter, crash: main.crashAfter, stop: main.stop, build: main.buildSuccessful, mk: main.pinsAfter && main.pinsAfter.mk.ok },
};
const reg = main && main.regAll ? main.regAll : {};
A.reg = reg;
const idName = {};
for (const [k, v] of Object.entries(reg)) idName[v.id] = k;

/* ---- rwindow 解析：diff / cap ---- */
function parseRw(s) {
  const parts = String(s || '').trim().split(/\s+/).map((x) => {
    const m = /^L(\d+)=(\d+)\/(\d+)$/.exec(x);
    return m ? { L: +m[1], lo: +m[2], hi: +m[3] } : null;
  }).filter(Boolean);
  if (!parts.length) return null;
  const cap = parts.length;
  const diff = parts[0].lo === 1 ? 10 : parts[0].lo + 9;
  return { cap, diff, parts };
}
/* ---- R196 载体规则（Java canEnchantR196 转写；仅判窗用件） ---- */
const ETIM_ITEMS = {};
for (const k of Object.keys(reg)) if (k.startsWith('etim:')) ETIM_ITEMS[k] = true;

const CAND = {
  'minecraft:diamond_sword': ['minecraft:sharpness', 'minecraft:bane_of_arthropods', 'minecraft:fire_aspect',
    'minecraft:looting', 'etim:vampiric', 'etim:disarming', 'minecraft:sweeping', 'minecraft:mending',
    'minecraft:vanishing_curse'],
  'etim:sword_copper': ['minecraft:sharpness', 'minecraft:bane_of_arthropods', 'minecraft:fire_aspect',
    'minecraft:looting', 'etim:vampiric', 'etim:disarming', 'minecraft:sweeping', 'minecraft:mending',
    'minecraft:vanishing_curse'],
  'etim:chestplate_mithril': ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:feather_falling',
    'minecraft:blast_protection', 'minecraft:projectile_protection', 'minecraft:thorns', 'minecraft:unbreaking',
    'minecraft:mending', 'minecraft:vanishing_curse'],
  'etim:pickaxe_copper': ['minecraft:efficiency', 'minecraft:silk_touch', 'minecraft:fortune',
    'minecraft:unbreaking', 'minecraft:mending', 'minecraft:vanishing_curse'],
};

/* ---- 模型：build 九步镜像 ---- */
const rndFactory = (seed) => {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
};
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
function minCost(diff, L) { return Math.max(diff - 10, 0) + diff * (L - 1) + 1; }
function buildOnce(rnd, cands, levels) {
  let adj = Math.max(1, Math.floor(levels * (1 + (rnd() - 0.5) * 0.5)));
  const out = [];
  while (adj > 0) {
    const map = [];
    for (const c of cands) {
      if (c.cap > 1) {
        for (let L = c.cap; L > 0; L--) if (minCost(c.diff, L) <= adj) { map.push({ c, L }); break; }
      } else if (minCost(c.diff, 3) <= adj) map.push({ c, L: 1 });
    }
    const kept = map.filter((e) => out.every((p) => compatible(p.c.name, e.c.name)));
    if (!kept.length) break;
    const total = kept.reduce((a, e) => a + e.c.rw, 0);
    let roll = Math.floor(rnd() * total);
    let pick = kept[kept.length - 1];
    for (const e of kept) { roll -= e.c.rw; if (roll < 0) { pick = e; break; } }
    let L = pick.L;
    if (out.length < 2 && kept.length > 1 && pick.c.cap > 1 && rnd() < 0.5) L = 1 + Math.floor(rnd() * L);
    out.push({ c: pick.c, L });
    const cost = pick.c.cap > 1 ? minCost(pick.c.diff, L) : minCost(pick.c.diff, 3);
    adj -= cost; adj -= 5;
    if (adj < 5 || out.length > 2) break;
  }
  return out;
}
function modelFor(item, budgets) {
  const names = CAND[item];
  if (!names) return null;
  const cands = names.map((n) => {
    const r = reg[n];
    if (!r) throw new Error('reg missing ' + n);
    const w = parseRw(r.rwindow);
    return { name: n, rw: r.rw, cap: w.cap, diff: w.diff };
  });
  const rnd = rndFactory(20261104);
  const hist = {};
  const commonHist = { picks: 0, common: 0, builds: 0, buildsWithCommon: 0 };
  for (const lv of budgets) {
    const out = buildOnce(rnd, cands, lv);
    commonHist.builds++;
    let hasCommon = false;
    for (const p of out) {
      hist[p.c.name] = (hist[p.c.name] || 0) + 1;
      commonHist.picks++;
      if (p.c.rw === 100) { commonHist.common++; hasCommon = true; }
    }
    if (hasCommon) commonHist.buildsWithCommon++;
  }
  return { hist, commonHist, cands: cands.map((c) => ({ name: c.name, rw: c.rw, cap: c.cap, diff: c.diff })) };
}

/* ---- 真机 bulk 汇总 ---- */
const bulk = readEv('d1-wb-bulk');
A.bulk = [];
if (bulk && bulk.bulkArms) {
  for (const arm of bulk.bulkArms) {
    const budgets = [];
    const line = fs.readFileSync(path.join(OUT, 'd1-wb-bulk.out'), 'utf8').split(/\r?\n/).map((l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, ''));
    let cur = null;
    const builds = [];
    const RE_START = /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(\d+) start/;
    const RE_PICK = /\[EnchLog\] pick item=(\S+) ench=(\d+) L=(\d+) cost=(\d+) adj=(-?\d+)/;
    const RE_END = /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(-?\d+) cand=end picks=(\d+)/;
    for (const l of line) {
      let m = RE_START.exec(l);
      if (m && m[1] === arm.item) { cur = { budget: +m[2], adj0: +m[3], picks: [] }; builds.push(cur); continue; }
      m = RE_PICK.exec(l);
      if (m && cur && m[1] === arm.item) { cur.picks.push({ ench: +m[2], L: +m[3], cost: +m[4], adj: +m[5] }); continue; }
      m = RE_END.exec(l);
      if (m && cur && m[1] === arm.item) { cur.adjEnd = +m[3]; cur.n = +m[4]; cur = null; }
    }
    const picks = builds.flatMap((b) => b.picks.map((p) => ({ ...p, budget: b.budget })));
    const emp = {};
    let common = 0;
    for (const p of picks) {
      const n = idName[p.ench] || ('id' + p.ench);
      emp[n] = (emp[n] || 0) + 1;
      if (reg[n] && reg[n].rw === 100) common++;
    }
    const model = modelFor(arm.item, builds.map((b) => b.budget));
    let chi2 = null, df = null;
    if (model) {
      const names = [...new Set([...Object.keys(emp), ...Object.keys(model.hist)])];
      chi2 = 0; df = 0;
      const mp = model.commonHist.picks;
      const ep = picks.length;
      for (const n of names) {
        const e = (model.hist[n] || 0) * (ep / Math.max(mp, 1));
        const o = emp[n] || 0;
        if (e >= 5) { chi2 += (o - e) * (o - e) / e; df++; }
      }
    }
    A.bulk.push({
      item: arm.item, builds: builds.length, picks: picks.length, budgets: [...new Set(builds.map((b) => b.budget))].sort((a, b) => a - b),
      emp, empCommonShare: ep0(picks.length, common), model: model && { hist: model.hist, cands: model.cands, commonShare: ep0(model.commonHist.picks, model.commonHist.common) },
      chi2: chi2 === null ? null : +chi2.toFixed(2), df,
      adjCheck: builds.filter((b) => {
        for (let i = 0; i < b.picks.length; i++) {
          const prev = i === 0 ? b.adj0 : b.picks[i - 1].adj;
          if (b.picks[i].adj !== prev - b.picks[i].cost - 5) return true;
        }
        return false;
      }).length,
      picksHist: builds.reduce((a, b) => { a[b.picks.length] = (a[b.picks.length] || 0) + 1; return a; }, {}),
      pairs: arm.pairs, conflicts: arm.conflictBuilds,
    });
  }
}
function ep0(n, k) { return n ? +(k / n).toFixed(4) : null; }

/* ---- 载体矩阵 ---- */
const table = readEv('d1-wb-table');
if (table) {
  A.table = {
    levelArms: (table.levelArms || []).map((x) => ({ item: x.item, books: x.books, rows: (x.rows || []).slice(0, 3) })),
    reach: (table.reach || []).map((x) => ({ item: x.item, books: x.books, builds: x.builds, picks: x.picks, lMax: x.lMax, lSet: x.lSet, enchSet: x.enchSet })),
    carrier: (table.carrierArms || []).map((x) => ({ item: x.item, builds: x.builds, picks: x.picks,
      named: Object.fromEntries(Object.entries(x.ench || {}).map(([id, n]) => [idName[id] || ('id' + id), n])) })),
    fee: table.fee, specials: table.specials, book: table.book, rowCounts: table.rowCounts,
  };
}
const fee = readEv('d1-wb-fee');
if (fee) A.feeLapisOff = fee.lapisOff;
const mob = readEv('d1-wb-mob');
if (mob) A.mob = { summary: mob.mob && mob.mob.summary, tension: mob.mob && mob.mob.tensionValues, rounds: mob.mob && mob.mob.rounds };
const cfg = readEv('d1-wb-cfg');
if (cfg) A.cfg = { poolOff: cfg.poolOff, capProbe: cfg.capProbe, rowCounts: cfg.rowCounts, cfgAfter: cfg.cfgAfter };

fs.writeFileSync(path.join(OUT, 'd1-wb-analysis.json'), JSON.stringify(A, null, 1) + '\n', 'utf8');
console.log(JSON.stringify({
  main: A.main && { ids: A.main.ids && A.main.ids.ids, regCount: A.main.regCount, prevSame: A.main.regPrevAllSame, fa: A.main.fa, tf: A.main.tf, rows: A.main.rowCounts },
  bulk: A.bulk.map((b) => ({ item: b.item, builds: b.builds, picks: b.picks, budgets: b.budgets, empCommon: b.empCommonShare, modelCommon: b.model && b.model.commonShare, chi2: b.chi2, df: b.df, adjCheck: b.adjCheck, hist: b.picksHist, pairs: b.pairs })),
  fee: A.table && A.table.fee, specials: A.table && A.table.specials, book: A.table && A.table.book,
  reach: A.table && A.table.reach,
}, null, 1));
console.log('written', path.join(OUT, 'd1-wb-analysis.json'));
