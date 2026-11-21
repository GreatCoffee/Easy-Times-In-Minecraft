#!/usr/bin/env node
/**
 * f11-b11-pilot2.js — anchored re-pilot of the two protocols that moved:
 *   P2 cooldown (natural eat -> second wheat + ground=401 -> exactly one serve;
 *      anchored under-cow wheat must NOT open inside the cd window; expiry eat)
 *   P3 ground pile Count=3 -> serve -> Count 2 + Age=-18000
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b11-pilot2';
const WORLD = 'w-b11p2';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const COW = { x: 300.5, z: 851.5 };
const HUB = { x: PEN.x + 6.5, z: PEN.z + 6.5 };
let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };
const sleep = L.sleep;
const log = L.log;
const since = (n) => srv.all.slice(n).map(L.strip);
const boxAt = (type, x0, y0, z0, dx, dy, dz) =>
  `@e[type=${type},x=${Math.floor(x0)},y=${Math.floor(y0)},z=${Math.floor(z0)},dx=${Math.ceil(dx)},dy=${Math.ceil(dy)},dz=${Math.ceil(dz)}]`;
const itemBox = (x, z, r) => boxAt('item', x - (r || 2), TY - 1, z - (r || 2), (r || 2) * 2 + 1, 6, (r || 2) * 2 + 1);
const PENCOW = () => boxAt('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14);

async function nbtDump(sel, wait) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(wait === undefined ? 900 : wait);
  const rows = since(from);
  const out = []; let foundNothing = false;
  for (const l of rows) {
    if (/found nothing/i.test(l)) foundNothing = true;
    if (!/\{.*\}/.test(l)) continue;
    const o = {};
    const it = /Item:\{id:"([^"]+)",Count:(\d+)b/.exec(l);
    if (it) { o.itemId = it[1]; o.count = Number(it[2]); }
    const ag = /(?:^|[,{])Age:(-?\d+)/.exec(l); if (ag) o.age = ag[1];
    const il = /,InLove:(-?\d+)/.exec(l); if (il) o.inLove = il[1];
    const live = /"etim:livestock":\{([^}]*)\}/.exec(l);
    if (live) { const kv = {}; for (const p of live[1].split(',')) { const i = p.indexOf(':'); if (i > 0) kv[p.slice(0, i)] = p.slice(i + 1); } o.live = kv; }
    out.push(o);
  }
  return { rows: out, foundNothing };
}
async function seed(toks, rad) { srv.send(`etest prod ${A} ${rad || 10} ${toks}`); await sleep(800); }
async function killGround() { srv.send(`kill ${boxAt('item', PEN.x, TY - 1, PEN.z, 14, 6, 14)}`); await sleep(600); }
async function anchorCow(wait) {
  srv.send(`tp ${PENCOW()} ${COW.x} ${TY + 1} ${COW.z}`);
  await sleep(wait === undefined ? 450 : wait);
}
async function dropItem(item, x, z, count, wait) {
  srv.send(`summon minecraft:item ${x} ${TY + 1} ${z} {Item:{id:"${item}",Count:${count || 1}b}}`);
  await sleep(wait === undefined ? 700 : wait);
}
async function freshCow() {
  srv.send(`kill ${boxAt('item', PEN.x, TY - 1, PEN.z, 14, 6, 14)}`);
  srv.send(`kill ${PENCOW()}`);
  await sleep(800);
  srv.send(`summon minecraft:cow ${COW.x} ${TY + 1} ${COW.z}`);
  await sleep(2000);
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'livestockNeedsR196', 'true');
  L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 1600 });
    srv.send('kill @e[type=!player]');
    await sleep(1400);
    srv.send('gamerule randomTickSpeed 0');
    srv.send(`fill ${PEN.x} ${TY - 1} ${PEN.z} ${PEN.x + 12} ${TY + 2} ${PEN.z + 12} minecraft:air 0`);
    await sleep(800);
    srv.send(`fill ${PEN.x} ${TY - 1} ${PEN.z} ${PEN.x + 12} ${TY - 1} ${PEN.z + 12} minecraft:dirt 0`);
    srv.send(`fill ${PEN.x} ${TY} ${PEN.z} ${PEN.x + 12} ${TY} ${PEN.z + 12} minecraft:grass 0`);
    await sleep(800);
    srv.send(`fill ${PEN.x} ${TY + 1} ${PEN.z} ${PEN.x + 12} ${TY + 1} ${PEN.z + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${PEN.x + 1} ${TY + 1} ${PEN.z + 1} ${PEN.x + 11} ${TY + 1} ${PEN.z + 11} minecraft:air 0`);
    srv.send(`fill ${PEN.x} ${TY + 2} ${PEN.z} ${PEN.x + 12} ${TY + 2} ${PEN.z + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${PEN.x + 1} ${TY + 2} ${PEN.z + 1} ${PEN.x + 11} ${TY + 2} ${PEN.z + 11} minecraft:air 0`);
    await sleep(1400);

    /* P2 cooldown */
    await freshCow();
    await killGround();
    await anchorCow();
    await seed('water=1.0 food=0.3 hp=5.0', 10);
    let from = srv.all.length;
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 600);
    let nat = null;
    for (let i = 0; i < 10; i++) { await sleep(700); nat = since(from).find((l) => /foodground src=cow serve/.test(l)) || null; if (nat) break; }
    await anchorCow(250);
    const f2 = srv.all.length;
    srv.send(`summon minecraft:item ${COW.x + 0.6} ${TY + 1} ${COW.z + 0.6} {Item:{id:"minecraft:wheat",Count:1b}}`);
    srv.send(`etest prod ${A} 10 ground=401`);
    await sleep(2600);
    const forced = since(f2);
    const forcedItem = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    await seed('water=1.0 food=0.3 hp=5.0', 10);
    await anchorCow(250);
    const f3 = srv.all.length;
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 500);
    await anchorCow(250);
    await sleep(4000);
    const coolRows = since(f3);
    const coolItem = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    await sleep(12000);
    await anchorCow(250);
    await sleep(3500);
    const expRows = since(f3);
    ev.arms.P2 = {
      natural: (nat || '').slice(0, 200),
      forcedServes: forced.filter((l) => /foodground src=cow serve/.test(l)).length,
      forcedRow: (forced.find((l) => /foodground src=cow serve/.test(l)) || '').slice(0, 200),
      forcedItemGone: forcedItem.foundNothing,
      coolServes: coolRows.filter((l) => /foodground src=cow serve/.test(l)).length,
      coolItem: coolItem.foundNothing ? 'gone' : coolItem.rows.map((r) => r.count),
      expServes: expRows.filter((l) => /foodground src=cow serve/.test(l)).length,
      expRow: (expRows.find((l) => /foodground src=cow serve/.test(l)) || '').slice(0, 200),
    };
    log('P2', JSON.stringify(ev.arms.P2));

    /* P3 stack */
    await freshCow();
    await killGround();
    await anchorCow();
    await seed('water=1.0 food=0.3 hp=5.0', 10);
    const PILE = { x: COW.x + 2.4, z: COW.z };
    from = srv.all.length;
    await dropItem('minecraft:wheat', PILE.x, PILE.z, 3, 600);
    const pre = await nbtDump(itemBox(PILE.x, PILE.z, 2));
    srv.send(`tp ${PENCOW()} ${PILE.x} ${TY + 1} ${PILE.z}`);
    await sleep(600);
    let s3 = null;
    for (let i = 0; i < 12; i++) { await sleep(700); s3 = since(from).find((l) => /foodground src=cow serve/.test(l)) || null; if (s3) break; }
    const post = await nbtDump(itemBox(PILE.x, PILE.z, 2));
    ev.arms.P3 = { pre: pre.rows, post: post.rows, serve: (s3 || '').slice(0, 220) };
    log('P3', JSON.stringify(ev.arms.P3));
    ev.ok = true;
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    log('FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
