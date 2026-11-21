#!/usr/bin/env node
/**
 * f10-pg-pilot5.js — minimal tick/log diagnostic:
 *   - is mobDebugLog still true after boot (server config rewrite?)
 *   - does a NoAI chicken produce [AILog] value rows at age 1200?
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot5';
const WORLD = 'f10p5';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
let srv = null, bot = null;
const ev = { tag: TAG };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);

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
    ev.cfgAfterBoot = { mob: L.cfgKeys(L.CFG).mobDebugLog, farm: L.cfgKeys(L.CFG).farmDebugLog };
    L.log('boot', L.strip(srv.all.find((l) => /Done \(/.test(l))).trim() + ' cfg=' + JSON.stringify(ev.cfgAfterBoot));
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    srv.send(`op ${A}`); await sleep(700);
    srv.send('difficulty 2');
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('kill @e[type=!player]');
    await sleep(1000);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 4} ${TY + 3} ${FZ + 4} minecraft:air 0`);
    await sleep(600);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 4} ${TY - 1} ${FZ + 4} minecraft:stone 0`);
    await sleep(600);
    await L.tp(srv, FX + 2.5, TY, FZ + 2.5, { bot: A, wait: 1000 });
    const from = srv.all.length;
    srv.send(`summon minecraft:chicken ${FX + 2.5} ${TY} ${FZ + 1.5} {NoAI:1b,PersistenceRequired:1b}`);
    const deadline = Date.now() + 85000;
    let vals = [], flips = [];
    while (Date.now() < deadline) {
      await sleep(15000);
      vals = since(from).filter((l) => /livestock-value/.test(l));
      flips = since(from).filter((l) => /\[AILog\] livestock /.test(l));
      if (vals.length) break;
    }
    ev.rows = vals.length;
    ev.flips = flips.length;
    ev.sample = vals.slice(0, 3);
    ev.flipSample = flips.slice(0, 2);
    L.log('rows', JSON.stringify({ vals: ev.rows, flips: ev.flips, sample: ev.sample }));
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
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
