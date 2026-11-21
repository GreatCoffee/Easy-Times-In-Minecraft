#!/usr/bin/env node
/**
 * f10-pg-pilot6.js — decisive tick probe:
 *   summon a chicken with EggLayTime:5000 (NoAI) and one with EggLayTime:5000
 *   (AI on). Dump the live NBT at +2/+8/+20 s:  5000 => not ticking;
 *   9999 => ticking and the B-10 freeze floors it (10000-1).
 * Also prints livestockNeedsR196 / livestockProductionR196 after boot.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot6';
const WORLD = 'f10p6';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
let srv = null, bot = null;
const ev = { tag: TAG, dumps: [] };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);

async function dump(label, sel) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(950);
  const rows = since(from);
  const vals = rows.map((l) => {
    const m = /EggLayTime:(-?\d+)/.exec(l);
    if (!m) return null;
    const p = /Pos:\[([^\]]+)\]/.exec(l);
    const d = /despawn_counter:(-?\d+)/.exec(l);
    const c = /productionCounter:(-?\d+)/.exec(l);
    return { egg: Number(m[1]), pos: p ? p[1].split(',')[0] : '?', despawn: d ? Number(d[1]) : null, prod: c ? Number(c[1]) : null };
  }).filter(Boolean);
  ev.dumps.push({ label, vals });
  L.log(label, JSON.stringify(vals));
  return vals;
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    const k = L.cfgKeys(L.CFG);
    ev.cfg = { needs: k.livestockNeedsR196, prod: k.livestockProductionR196, mob: k.mobDebugLog };
    L.log('boot', L.strip(srv.all.find((l) => /Done \(/.test(l))).trim() + ' cfg=' + JSON.stringify(ev.cfg));
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    srv.send(`op ${A}`); await sleep(700);
    srv.send('difficulty 2');
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('kill @e[type=!player]');
    await sleep(1000);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 6} ${TY + 3} ${FZ + 6} minecraft:air 0`);
    await sleep(600);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 6} ${TY - 1} ${FZ + 6} minecraft:stone 0`);
    await sleep(600);
    await L.tp(srv, FX + 3.5, TY, FZ + 3.5, { bot: A, wait: 1200 });
    srv.send(`summon minecraft:chicken ${FX + 2.5} ${TY} ${FZ + 2.5} {NoAI:1b,PersistenceRequired:1b,EggLayTime:5000}`);
    srv.send(`summon minecraft:chicken ${FX + 5.5} ${TY} ${FZ + 5.5} {PersistenceRequired:1b,EggLayTime:5000}`);
    await sleep(2500);
    await dump('A+2.5s', `@e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=6,dy=4,dz=6]`);
    const from = srv.all.length;
    await sleep(6000);
    await dump('B+8.5s', `@e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=6,dy=4,dz=6]`);
    await sleep(12000);
    await dump('C+20s', `@e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=6,dy=4,dz=6]`);
    const deadline = Date.now() + 80000;
    let vals = [];
    while (Date.now() < deadline) {
      await sleep(15000);
      vals = since(from).filter((l) => /livestock-value/.test(l));
      if (vals.length) break;
    }
    ev.valueRows = vals.length;
    ev.valueSample = vals.slice(0, 4);
    L.log('rows', JSON.stringify({ n: ev.valueRows, sample: ev.valueSample.map((s) => s.slice(0, 120)) }));
    ev.ok = true;
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    L.log('FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { L.log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
