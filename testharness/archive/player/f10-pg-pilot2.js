#!/usr/bin/env node
/**
 * f10-pg-pilot2.js — micro preflight: the /execute+entitydata EggLayTime write
 * path and the /testfor NBT read path used by R9-1/R9-2 (the first pilot's
 * selector string was malformed, so this face is untested).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot2';
const WORLD = 'f10p2';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
let srv = null, bot = null;
const ev = { tag: TAG };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const penSel = (t) => `@e[type=${t},x=${FX},y=${TY - 1},z=${FZ},dx=7,dy=5,dz=7]`;

async function testfor(sel, nbt) {
  const from = srv.all.length;
  srv.send(`testfor ${sel}${nbt ? ' ' + nbt : ''}`);
  await sleep(450);
  const rows = srv.all.slice(from).map(L.strip);
  const hit = rows.find((l) => /Found \d+ matching entit|Successfully found/i.test(l));
  const miss = rows.find((l) => /Test failed|No entity|did not match/i.test(l));
  return { ok: !!hit, raw: (hit || miss || '').slice(0, 140) };
}
async function entitydataAll(sel, nbt) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] ${nbt}`);
  await sleep(900);
  return srv.all.slice(from).map(L.strip).filter((l) => /modified|Entity data|rror|failed|cannot be found/i.test(l)).slice(0, 8);
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
    await sleep(3000);
    ev.matchAny = await testfor(penSel('chicken'), '');
    ev.pre = await testfor(penSel('chicken'), '{EggLayTime:9999}');
    ev.pre10000 = await testfor(penSel('chicken'), '{EggLayTime:10000}');
    ev.set = await entitydataAll(penSel('chicken'), '{EggLayTime:1000}');
    await sleep(4000);
    ev.pin9999 = await testfor(penSel('chicken'), '{EggLayTime:9999}');
    ev.pin10000 = await testfor(penSel('chicken'), '{EggLayTime:10000}');
    ev.setRawRows = since(0).filter((l) => /EggLayTime/.test(l)).slice(-6);
    L.log('P2', JSON.stringify({ any: ev.matchAny.raw, set: ev.set, p9999: ev.pin9999, p10000: ev.pin10000 }));
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
