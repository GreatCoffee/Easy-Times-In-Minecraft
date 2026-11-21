#!/usr/bin/env node
/**
 * f10-pg-pilot4.js — why did the pilot3 chickens never decrement EggLayTime?
 * Summons one NoAI chicken and one normal chicken, dumps their live NBT three
 * times, checks OnGround (a ticking entity lands), and waits past 1200 ticks
 * for the livestock-value rows (the tick proof inside the ETIM handler).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot4';
const WORLD = 'f10p4';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
let srv = null, bot = null;
const ev = { tag: TAG, dumps: [] };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const boxSel = (t, x) => `@e[type=${t},x=${x},y=${TY - 1},z=${FZ + 1},dx=1,dy=4,dz=8]`;

async function dump(label) {
  const from = srv.all.length;
  srv.send(`execute @e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=8,dy=4,dz=8] ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(900);
  const rows = srv.all.slice(from).map((l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, ''));
  const vals = rows.map((l) => {
    const m = /EggLayTime:(-?\d+)/.exec(l);
    const p = /Pos:\[([^\]]+)\]/.exec(l);
    const g = /OnGround:(\db)/.exec(l);
    return m ? { egg: Number(m[1]), pos: p ? p[1].split(',')[0] : '?', onGround: g ? g[1] : '?' } : null;
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
    srv.send('difficulty 2');
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule randomTickSpeed 3');
    srv.send('time set 6000');
    srv.send('kill @e[type=!player]');
    await sleep(1200);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 8} ${TY + 4} ${FZ + 8} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 8} ${TY - 1} ${FZ + 8} minecraft:stone 0`);
    await sleep(700);
    await L.tp(srv, FX + 4.5, TY, FZ + 4.5, { bot: A, wait: 1200 });
    srv.send(`summon minecraft:chicken ${FX + 2.5} ${TY} ${FZ + 2.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 5.5} ${TY} ${FZ + 5.5} {PersistenceRequired:1b}`);
    await sleep(4000);
    await dump('A+4s');
    await sleep(4000);
    await dump('B+8s');
    const from5 = srv.all.length;
    srv.send(`testfor @e[type=chicken,x=${FX},y=${TY - 1},z=${FZ},dx=8,dy=4,dz=8] {OnGround:1b}`);
    await sleep(600);
    ev.onGround = since(from5).slice(0, 4);
    L.log('onGround', JSON.stringify(ev.onGround));
    const from6 = srv.all.length;
    const deadline = Date.now() + 80000;
    let vals = [];
    while (Date.now() < deadline) {
      await sleep(15000);
      vals = since(from6).filter((l) => /livestock-value/.test(l));
      if (vals.length) break;
    }
    ev.valueRows = vals.map((l) => ({ entity: (/entity=(\S+)/.exec(l) || [])[1], age: (/age=(\d+)/.exec(l) || [])[1], food: (/food=(\S+)/.exec(l) || [])[1] }));
    L.log('values', JSON.stringify({ n: ev.valueRows.length, sample: ev.valueRows.slice(0, 6) }));
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
