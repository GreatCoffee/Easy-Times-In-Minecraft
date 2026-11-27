#!/usr/bin/env node
/**
 * f10-pg-pilot7.js — mirror the main-session smoke staging exactly (L.stage)
 * and probe entity ticking: productionCounter growth + EggLayTime pin + value rows.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot7';
const WORLD = 'f10p7';
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
    const c = /productionCounter:(-?\d+)/.exec(l);
    const f = /food:([\d.]+)f/.exec(l);
    return { egg: Number(m[1]), pos: p ? p[1].split(',')[0] : '?', prod: c ? Number(c[1]) : null, food: f ? f[1] : null };
  }).filter(Boolean);
  ev.dumps.push({ label, vals });
  L.log(label, JSON.stringify(vals));
  return vals;
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    L.log('boot', L.strip(srv.all.find((l) => /Done \(/.test(l))).trim());
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });   // exact smoke staging
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 1500 });
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:air 0`);
    await sleep(900);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY - 1} ${FZ + 12} minecraft:dirt 0`);
    srv.send(`fill ${FX} ${TY} ${FZ} ${FX + 12} ${TY} ${FZ + 12} minecraft:grass 0`);
    await sleep(900);
    srv.send(`fill ${FX} ${TY + 1} ${FZ} ${FX + 12} ${TY + 1} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 1} ${FZ + 1} ${FX + 11} ${TY + 1} ${FZ + 11} minecraft:air 0`);
    srv.send(`fill ${FX} ${TY + 2} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 2} ${FZ + 1} ${FX + 11} ${TY + 2} ${FZ + 11} minecraft:air 0`);
    await sleep(1200);
    srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 8.5} ${TY + 1} ${FZ + 2.5} {NoAI:1b,PersistenceRequired:1b,EggLayTime:5000}`);
    await sleep(3000);
    await dump('A+3s', `@e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=15,dy=6,dz=15]`);
    await sleep(12000);
    await dump('B+15s', `@e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=15,dy=6,dz=15]`);
    const from = srv.all.length;
    const deadline = Date.now() + 95000;
    let vals = [], flips = [];
    while (Date.now() < deadline) {
      await sleep(15000);
      vals = since(from).filter((l) => /livestock-value/.test(l));
      flips = since(from).filter((l) => /\[AILog\] livestock /.test(l));
      if (vals.length) break;
    }
    ev.valueRows = vals.length; ev.flips = flips.length;
    ev.sample = vals.slice(0, 3);
    L.log('rows', JSON.stringify({ vals: ev.valueRows, flips: ev.flips, sample: ev.sample.slice(0, 2) }));
    ev.ok = true;
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    L.log('FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { L.log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', 'f10p7'), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
