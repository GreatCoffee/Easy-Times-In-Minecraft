#!/usr/bin/env node
/**
 * d1-wb-rev-analyze.js — A-1 重验面汇总（只读 evidence/.out）
 *   R1 护甲载体矩阵（7 件 ×130）｜R2 DP10 族对｜R3 DP2 胸甲分布（模型↔真机 χ²）
 *   R4 DP8 怪装门｜R5 非甲回归（reg 47 行逐字同值）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const rd = (f) => { try { return fs.readFileSync(path.join(OUT, f), 'utf8'); } catch (e) { return ''; } };
const rev = (t) => { try { return JSON.parse(rd(t + '-evidence.json')); } catch (e) { return null; } };
const linesOf = (t) => rd(t + '.out').split(/\r?\n/).map((l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, ''));

const armor = rev('d1-wb-rev-armor');
const bulk = rev('d1-wb-rev-bulk');
const mob = rev('d1-wb-rev-mob');
const A = {};

/* ---------- reg 表（id→name/rw/rwindow） ---------- */
const reg = (armor && armor.regAll) || {};
const idName = {}; const nameId = {};
for (const [k, v] of Object.entries(reg)) { idName[v.id] = k; nameId[k] = v.id; }
A.reg = { rows: Object.keys(reg).length, etimRows: Object.keys(reg).filter((k) => k.startsWith('etim:')).length };

function rwOf(name) {
  const r = reg[name]; if (!r) return null;
  const parts = r.rwindow.trim().split(/\s+/).map((x) => { const m = /^L(\d+)=(\d+)\/(\d+)$/.exec(x); return m ? { L: +m[1], lo: +m[2], hi: +m[3] } : null; }).filter(Boolean);
  const cap = parts.length;
  const diff = parts[0].lo === 1 ? 10 : parts[0].lo + 9;
  return { name, id: r.id, rw: r.rw, cap, diff };
}

/* ---------- R196 九步镜像（判窗模型；权重/窗口取自同轮 reg 行） ---------- */
const rndFactory = (seed) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const minCost = (diff, L) => Math.max(diff - 10, 0) + diff * (L - 1) + 1;
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
      if (c.cap > 1) {
        for (let L = c.cap; L > 0; L--) if (minCost(c.diff, L) <= adj) { map.push({ c, L }); break; }
      } else if (minCost(c.diff, 3) <= adj) map.push({ c, L: 1 });
    }
    const kept = map.filter((e) => out.every((p) => compatible(p.c.name, e.c.name)));
    if (!kept.length) break;
    const total = kept.reduce((a, e) => a + e.c.rw, 0);
    let roll = rnd() * total;
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
function model(names, budgets, seed) {
  const cands = names.map((n) => rwOf(n)).filter(Boolean);
  const rnd = rndFactory(seed || 20261104);
  const hist = {}; let picks = 0; const pickHist = {};
  for (const lv of budgets) {
    const out = buildOnce(rnd, cands, lv);
    pickHist[out.length] = (pickHist[out.length] || 0) + 1;
    for (const p of out) { hist[p.c.name] = (hist[p.c.name] || 0) + 1; picks++; }
  }
  return { hist, picks, builds: budgets.length, pickHist, cands: cands.map((c) => ({ name: c.name, rw: c.rw, cap: c.cap, diff: c.diff })) };
}

/* ---------- 真机解析 ---------- */
const RE_S = /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(\d+) start/;
const RE_P = /\[EnchLog\] pick item=(\S+) ench=(\d+) L=(\d+) cost=(\d+) adj=(-?\d+)/;
const RE_E = /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(-?\d+) cand=end picks=(\d+)/;
function buildsOf(lines, item) {
  const bs = []; let cur = null;
  for (const l of lines) {
    let m = RE_S.exec(l);
    if (m && m[1] === item) { cur = { budget: +m[2], adj0: +m[3], picks: [] }; bs.push(cur); continue; }
    m = RE_P.exec(l);
    if (m && cur && m[1] === item) { cur.picks.push({ ench: +m[2], L: +m[3], cost: +m[4], adj: +m[5] }); continue; }
    m = RE_E.exec(l);
    if (m && cur && m[1] === item) { cur.adjEnd = +m[3]; cur.n = +m[4]; cur = null; }
  }
  return bs;
}
function pairCount(bs, ida, idb) {
  return bs.filter((b) => { const s = new Set(b.picks.map((p) => p.ench)); return s.has(ida) && s.has(idb); }).length;
}
function chi2(emp, mod, scale) {
  let x = 0, df = 0; const rows = [];
  const names = [...new Set([...Object.keys(emp), ...Object.keys(mod.hist)])];
  for (const n of names) {
    const e = (mod.hist[n] || 0) * scale;
    const o = emp[n] || 0;
    if (e >= 5) { x += (o - e) * (o - e) / e; df++; rows.push({ n, o, e: +e.toFixed(1) }); }
  }
  return { chi2: +x.toFixed(2), df, rows: rows.sort((a, b) => b.o - a.o) };
}

/* ---------- R1 ---------- */
if (armor) {
  const want = {
    'etim:chestplate_mithril': { yes: ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:blast_protection', 'minecraft:projectile_protection', 'minecraft:thorns', 'etim:endurance', 'etim:regeneration', 'minecraft:unbreaking'], no: ['minecraft:feather_falling', 'minecraft:respiration', 'minecraft:aqua_affinity'] },
    'minecraft:leather_chestplate': { yes: ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:thorns', 'etim:endurance'], no: ['minecraft:blast_protection', 'minecraft:projectile_protection', 'minecraft:unbreaking', 'minecraft:feather_falling'] },
    'etim:helmet_mithril': { yes: ['minecraft:protection', 'minecraft:respiration', 'minecraft:aqua_affinity', 'minecraft:unbreaking'], no: ['minecraft:thorns', 'minecraft:feather_falling', 'minecraft:blast_protection'] },
    'minecraft:leather_helmet': { yes: ['minecraft:protection', 'minecraft:respiration', 'minecraft:aqua_affinity'], no: ['minecraft:thorns', 'minecraft:unbreaking'] },
    'etim:boots_mithril': { yes: ['minecraft:protection', 'minecraft:feather_falling', 'minecraft:depth_strider', 'minecraft:frost_walker', 'minecraft:unbreaking'], no: ['minecraft:thorns', 'minecraft:blast_protection', 'minecraft:projectile_protection'] },
    'etim:leggings_mithril': { yes: ['minecraft:protection', 'minecraft:blast_protection', 'minecraft:projectile_protection', 'minecraft:unbreaking'], no: ['minecraft:thorns', 'minecraft:feather_falling', 'minecraft:respiration'] },
    'minecraft:leather_leggings': { yes: ['minecraft:protection'], no: ['minecraft:blast_protection', 'minecraft:projectile_protection', 'minecraft:unbreaking'] },
  };
  A.R1 = (armor.arms || []).map((arm) => {
    const named = {};
    for (const [id, n] of Object.entries(arm.hist)) named[idName[id] || ('id' + id)] = n;
    const w = want[arm.item] || { yes: [], no: [] };
    const y = w.yes.map((n) => ({ n, seen: named[n] || 0, ok: (named[n] || 0) > 0 }));
    const x = w.no.map((n) => ({ n, seen: named[n] || 0, ok: (named[n] || 0) === 0 }));
    return { item: arm.item, builds: arm.builds, picks: arm.picks, adjBad: arm.adjBad, maxPicks: arm.maxPicks,
      named, yes: y, no: x, ok: y.every((z) => z.ok) && x.every((z) => z.ok) };
  });
  A.R5 = {
    noSuchMethod: armor.noSuchMethod, execErr: armor.execErr, rowCounts: armor.rowCounts,
    baseArms: (armor.baseArms || []).map((a) => ({ item: a.item, builds: a.builds, picks: a.picks,
      ids: [...new Set(Object.keys(a.hist))].map((i) => idName[i] || i) })),
    regRowsCur: (armor.probeBase && armor.probeBase['etim:sword_copper'] ? armor.probeBase['etim:sword_copper'].raw.length : null),
  };
  /* reg 47 行与首轮逐字比 */
  try {
    const curRaw = armor.probeBase['etim:sword_copper'].raw.map((l) => l.replace(' [server]', ''));
    const prevL = linesOf('d1-wb-main').filter((l) => /\[EnchantLog\] pool reg=/.test(l));
    const pm = {};
    for (const l of prevL) { const m = /pool reg=(\S+) /.exec(l); if (m && !pm[m[1]]) pm[m[1]] = l.replace(' [server]', ''); }
    let same = 0; const diff = [];
    for (const l of curRaw) { const m = /pool reg=(\S+) /.exec(l); const k = m ? m[1] : '?';
      if (pm[k] === l) same++; else diff.push(k); }
    A.R5.regPrev = { same, total: curRaw.length, prevTotal: Object.keys(pm).length, diffs: diff };
  } catch (e) { A.R5.regPrevError = String(e.message); }
  A.pins = { head: armor.head, headOk: armor.headOk, pins: armor.pins, ids: armor.ids,
    close: { cfgBytes: armor.cfgAfter.bytes, cfgSha: armor.cfgAfter.sha, changed: armor.cfgAfter.changed,
      obf: armor.obfCfgAfter.untouched, port: armor.portAfter, crashBefore: armor.crashBefore, crashAfter: armor.crashAfter,
      stop: armor.stop, build: armor.buildSuccessful, mk: armor.pinsAfter.mk.ok } };
}

/* ---------- R2/R3 bulk ---------- */
if (bulk) {
  const L = linesOf('d1-wb-rev-bulk');
  const CHEST = ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:blast_protection',
    'minecraft:projectile_protection', 'minecraft:thorns', 'etim:endurance', 'etim:regeneration', 'minecraft:unbreaking'];
  const BOOTS = ['minecraft:protection', 'minecraft:fire_protection', 'minecraft:feather_falling',
    'minecraft:depth_strider', 'minecraft:frost_walker', 'minecraft:unbreaking', 'etim:speed',
    'minecraft:mending', 'minecraft:vanishing_curse', 'minecraft:binding_curse'];
  A.R23 = [];
  for (const arm of bulk.bulk || []) {
    const bs = buildsOf(L, arm.item);
    const picks = bs.flatMap((b) => b.picks);
    const emp = {};
    for (const p of picks) { const n = idName[p.ench] || ('id' + p.ench); emp[n] = (emp[n] || 0) + 1; }
    const isChest = arm.item.includes('chestplate') && !arm.item.includes('leather');
    const names = isChest ? CHEST : BOOTS;
    const budgets = bs.map((b) => b.budget);
    const mod = model(names, budgets);
    const scale = picks.length / Math.max(mod.picks, 1);
    const chi = chi2(emp, mod, scale);
    const id = (n) => nameId[n];
    const out = { item: arm.item, builds: bs.length, picks: picks.length, budgets: [...new Set(budgets)].sort((a, b) => a - b),
      maxPicks: bs.length ? Math.max(...bs.map((b) => b.picks.length)) : 0,
      pickHist: bs.reduce((a, b) => { a[b.picks.length] = (a[b.picks.length] || 0) + 1; return a; }, {}),
      adjBad: bs.filter((b) => { for (let i = 0; i < b.picks.length; i++) { const prev = i === 0 ? b.adj0 : b.picks[i - 1].adj; if (b.picks[i].adj !== prev - b.picks[i].cost - 5) return true; } return false; }).length,
      emp, model: mod.hist, chi2: chi.chi2, df: chi.df, topRows: chi.rows.slice(0, 12),
      commonShare: picks.length ? +(picks.filter((p) => p.ench === id('minecraft:protection')).length / picks.length).toFixed(4) : null,
      modelCommonShare: mod.picks ? +((mod.hist['minecraft:protection'] || 0) / mod.picks).toFixed(4) : null,
      pairs: {},
      candsAtBudget: mod.cands.length };
    if (isChest) {
      out.pairs['protection+fire'] = pairCount(bs, id('minecraft:protection'), id('minecraft:fire_protection'));
      out.pairs['protection+blast'] = pairCount(bs, id('minecraft:protection'), id('minecraft:blast_protection'));
      out.pairs['protection+proj'] = pairCount(bs, id('minecraft:protection'), id('minecraft:projectile_protection'));
      out.pairs['fire+blast'] = pairCount(bs, id('minecraft:fire_protection'), id('minecraft:blast_protection'));
      out.pairs['protection+thorns'] = pairCount(bs, id('minecraft:protection'), id('minecraft:thorns'));
    } else {
      out.pairs['protection+feather'] = pairCount(bs, id('minecraft:protection'), id('minecraft:feather_falling'));
      out.pairs['protection+fire'] = pairCount(bs, id('minecraft:protection'), id('minecraft:fire_protection'));
      out.pairs['protection+unbreaking'] = pairCount(bs, id('minecraft:protection'), id('minecraft:unbreaking'));
    }
    A.R23.push(out);
  }
  A.bulkClose = { noSuchMethod: bulk.noSuchMethod, execErr: bulk.execErr, rowCounts: bulk.rowCounts,
    cfgBytes: bulk.cfgAfter.bytes, cfgSha: bulk.cfgAfter.sha, changed: bulk.cfgAfter.changed, obf: bulk.obfCfgAfter.untouched,
    port: bulk.portAfter, crash: bulk.crashAfter, stop: bulk.stop, build: bulk.buildSuccessful };
}

/* ---------- R4 mob ---------- */
if (mob) {
  A.R4 = { summary: mob.mob && mob.mob.summary, tension: mob.mob && mob.mob.tensionValues,
    tensionRows: mob.mob && mob.mob.tensionRows, spawned: mob.mob && mob.mob.spawned,
    mobBudgets: mob.mob && mob.mob.mobBudgets, rounds: mob.mob && mob.mob.rounds,
    noSuchMethod: mob.noSuchMethod, execErr: mob.execErr, rowCounts: mob.rowCounts,
    close: { cfgBytes: mob.cfgAfter.bytes, changed: mob.cfgAfter.changed, obf: mob.obfCfgAfter.untouched,
      port: mob.portAfter, crash: mob.crashAfter, stop: mob.stop, build: mob.buildSuccessful } };
}

fs.writeFileSync(path.join(OUT, 'd1-wb-rev-analysis.json'), JSON.stringify(A, null, 1) + '\n', 'utf8');
console.log(JSON.stringify({
  reg: A.reg,
  R1: A.R1 && A.R1.map((r) => ({ item: r.item, builds: r.builds, picks: r.picks, ok: r.ok,
    yesBad: r.yes.filter((z) => !z.ok), noBad: r.no.filter((z) => !z.ok) })),
  R5: A.R5 && { nse: A.R5.noSuchMethod, err: A.R5.execErr, regPrev: A.R5.regPrev, rows: A.R5.rowCounts },
  R23: (A.R23 || []).map((r) => ({ item: r.item, builds: r.builds, picks: r.picks, budgets: r.budgets,
    common: [r.commonShare, r.modelCommonShare], chi2: r.chi2, df: r.df, adjBad: r.adjBad, pairs: r.pairs,
    pickHist: r.pickHist, emp: r.emp })),
  R4: A.R4,
}, null, 1));
console.log('written', path.join(OUT, 'd1-wb-rev-analysis.json'));
