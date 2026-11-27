#!/usr/bin/env node
/**
 * f10-pg-pilot.js — W-B10 preflight (NOT judged). De-risks the three pieces the
 * verdict window leans on but the main-session smoke never reached:
 *   P1 livestock-value rows (e.ticksExisted % 1200) actually print
 *   P2 EggLayTime pin via /execute+entitydata + /testfor (9999/10000)
 *   P3 the R10 no-grass cell: food=0 -> never well -> counter frozen at 42
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-pilot';
const WORLD = 'f10pil';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;
let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const get = (l, k) => { const m = new RegExp('(?:^| )' + k + '=(\\S+)').exec(l); return m ? m[1] : null; };
const penSel = (t) => `@e[type=${t},x=${FX},y=${TY - 1},z=${FZ},dx=15,dy=6,dz=15}`;

async function testfor(sel, nbt) {
  const from = srv.all.length;
  srv.send(`testfor ${sel}${nbt ? ' ' + nbt : ''}`);
  await sleep(420);
  const rows = srv.all.slice(from).map(L.strip);
  const hit = rows.find((l) => /Found \d+ matching entit|Successfully found/i.test(l));
  const miss = rows.find((l) => /Test failed|No entity|did not match/i.test(l));
  return { ok: !!hit, raw: (hit || miss || '').slice(0, 140) };
}
async function entitydataAll(sel, nbt) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] ${nbt}`);
  await sleep(800);
  return srv.all.slice(from).map(L.strip).filter((l) => /modified|Entity data|rror|failed/i.test(l)).slice(0, 6);
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    srv.send(`op ${A}`); await sleep(700);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false', 'doWeatherCycle false']) srv.send('gamerule ' + g);
    srv.send('time set 6000');
    srv.send('weather clear 1000000');
    srv.send('difficulty 2');
    srv.send(`etest food 20 20 ${A}`);
    srv.send(`gamemode 1 ${A}`);
    await sleep(1200);
    try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 1500 });

    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:air 0`);
    await sleep(800);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY - 1} ${FZ + 12} minecraft:dirt 0`);
    srv.send(`fill ${FX} ${TY} ${FZ} ${FX + 12} ${TY} ${FZ + 12} minecraft:grass 0`);
    await sleep(800);
    srv.send(`fill ${FX} ${TY + 1} ${FZ} ${FX + 12} ${TY + 1} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 1} ${FZ + 1} ${FX + 11} ${TY + 1} ${FZ + 11} minecraft:air 0`);
    srv.send(`fill ${FX} ${TY + 2} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 2} ${FZ + 1} ${FX + 11} ${TY + 2} ${FZ + 11} minecraft:air 0`);
    srv.send(`fill ${FX} ${TY + 3} ${FZ} ${FX + 12} ${TY + 22} ${FZ + 12} minecraft:air 0`);
    await sleep(900);
    for (const [x, z] of [[FX + 3, FZ + 3], [FX + 8, FZ + 2]]) srv.send(`setblock ${x} ${TY} ${z} minecraft:water 0 replace`);
    await sleep(500);
    srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 8.5} ${TY + 1} ${FZ + 2.5} {NoAI:1b,PersistenceRequired:1b}`);

    /* P3 cell: no grass, food 0 */
    const cx = FX - 14, cz = FZ + 2;
    srv.send(`fill ${cx - 2} ${TY - 5} ${cz - 2} ${cx + 2} ${TY + 10} ${cz + 2} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${cx - 1} ${TY - 1} ${cz - 1} ${cx + 1} ${TY - 1} ${cz + 1} minecraft:stone 0`);
    srv.send(`fill ${cx - 1} ${TY} ${cz - 1} ${cx + 1} ${TY} ${cz + 1} minecraft:dirt 0`);
    await sleep(600);
    srv.send(`fill ${cx - 2} ${TY + 1} ${cz - 2} ${cx + 2} ${TY + 2} ${cz + 2} minecraft:cobblestone 0`);
    srv.send(`fill ${cx - 1} ${TY + 1} ${cz - 1} ${cx + 1} ${TY + 2} ${cz + 1} minecraft:air 0`);
    await sleep(600);
    srv.send(`summon minecraft:chicken ${cx + 0.5} ${TY + 1} ${cz + 0.5} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(3000);
    ev.inWall = since(0).filter((l) => /inWall/.test(l)).length;

    /* P2 egg pin */
    const setRows = await entitydataAll(penSel('chicken'), '{EggLayTime:1000}');
    await sleep(4000);
    const t9999 = await testfor(penSel('chicken'), '{EggLayTime:9999}');
    const t10000 = await testfor(penSel('chicken'), '{EggLayTime:10000}');
    ev.p2 = { setRows, t9999, t10000 };
    L.log('P2', JSON.stringify({ set: setRows.length, t9999: t9999.ok, t10000: t10000.ok, raw: t9999.raw }));

    /* P3 seed the cell chicken */
    await L.tp(srv, cx + 0.5, TY + 1, cz + 1.5, { bot: A, wait: 900 });
    const seedFrom = srv.all.length;
    srv.send(`etest prod ${A} 3 feather=2`); await sleep(700);
    srv.send(`etest prod ${A} 3 counter=42 milk=60 feather=0`); await sleep(700);
    bot.chat('/etest livemano 3 0.0'); await sleep(1500);
    ev.seedRows = since(seedFrom).filter((l) => /\[FarmLog\] prod |livemano/.test(l));
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 900 });

    /* P1 value rows */
    const from = srv.all.length;
    const deadline = Date.now() + 90000;
    let v = [];
    while (Date.now() < deadline) {
      await sleep(15000);
      v = since(from).filter((l) => /\[AILog\] livestock-value/.test(l));
      if (v.filter((l) => /Chicken/.test(l)).length >= 2) break;
    }
    ev.p1 = v.map((l) => ({
      entity: get(l, 'entity'), counter: get(l, 'counter'), milk: get(l, 'milk'),
      feathers: get(l, 'feathers'), food: get(l, 'food'), age: get(l, 'age'),
    }));
    L.log('P1', JSON.stringify({ rows: ev.p1.length, sample: ev.p1.slice(0, 6) }));
    ev.ok = true;
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    L.log('PILOT-FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { L.log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
