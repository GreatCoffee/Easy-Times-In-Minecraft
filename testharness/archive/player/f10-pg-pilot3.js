#!/usr/bin/env node
/**
 * f10-pg-pilot3.js — read the actual EggLayTime trajectory (the entitydata dump
 * itself is the read channel: /execute ... entitydata <single> {} prints the
 * full NBT). pilot2 showed the value pinned at 9999 before a write, but the
 * re-pin read after writing 1000 matched neither 9999 nor 10000.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot3';
const WORLD = 'f10p3';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
let srv = null, bot = null;
const ev = { tag: TAG, dumps: [] };
const sleep = L.sleep;
const penSel = (t) => `@e[type=${t},x=${FX},y=${TY - 1},z=${FZ},dx=7,dy=5,dz=7]`;

async function dump(label) {
  const from = srv.all.length;
  srv.send(`execute ${penSel('chicken')} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(900);
  const rows = srv.all.slice(from).map((l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, ''));
  const vals = rows.map((l) => {
    const m = /EggLayTime:(-?\d+)/.exec(l);
    const p = /Pos:\[([^\]]+)\]/.exec(l);
    return m ? { egg: Number(m[1]), pos: p ? p[1] : '?' } : null;
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
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    L.log('boot', L.strip(srv.all.find((l) => /Done \(/.test(l))).trim() + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    srv.send(`op ${A}`); await sleep(700);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('kill @e[type=!player]');
    await sleep(800);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 6} ${TY + 3} ${FZ + 6} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 6} ${TY - 1} ${FZ + 6} minecraft:stone 0`);
    await sleep(700);
    await L.tp(srv, FX + 3.5, TY, FZ + 3.5, { bot: A, wait: 900 });
    srv.send(`summon minecraft:chicken ${FX + 2.5} ${TY} ${FZ + 2.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 4.5} ${TY} ${FZ + 4.5} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(2500);
    await dump('A-spawn');
    await sleep(3000);
    await dump('B-spawn+3s');
    srv.send(`execute ${penSel('chicken')} ~ ~ ~ entitydata @e[r=0,c=1] {EggLayTime:1000}`);
    await sleep(1200);
    await dump('C-after-set+1s');
    await sleep(3000);
    await dump('D-after-set+4s');
    await sleep(3000);
    await dump('E-after-set+7s');
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
