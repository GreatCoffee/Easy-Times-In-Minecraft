#!/usr/bin/env node
/**
 * f11-b11-supp2.js — W-B11 supplement #2 (judged, folds into the verdict):
 *   T1 clean needs=true hand-feed. Root cause of the contaminated row: the
 *      mineflayer equip step drops the given wheat on the floor when the ground
 *      arm is live (needs=true), the cow eats it (cd=400, heal) and the hand row
 *      then reads food=1.00/hp=1.00. Fix: /give lands in hotbar slot 0 while the
 *      inventory is empty and slot 0 is selected -> no equip, no drop.
 *   T2 R2 InLove corroboration: anchored family-gate deny, live-position NBT dump
 *      -> InLove 0, no calf, item survives.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b11-supp2';
const WORLD = 'w-b11s2';
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
const pick = (need) => bot.inventory.items().find((i) => i.name === need || i.name === 'minecraft:' + need);

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }
async function invCount(item, wait) {
  const from = srv.all.length;
  srv.send(`clear ${A} minecraft:${item} -1 0`);
  await sleep(wait === undefined ? 450 : wait);
  const rows = since(from).join(' | ');
  const m = /has (\d+) items? that match/.exec(rows);
  return m ? Number(m[1]) : (/no items to remove|no items were found/i.test(rows) ? 0 : null);
}
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
    const il = /,InLove:(-?\d+)/.exec(l); if (il) o.inLove = il[1];
    const ag = /(?:^|[,{])Age:(-?\d+)/.exec(l); if (ag) o.age = ag[1];
    const h = /[,{]Health:([\d.]+)f/.exec(l); if (h) o.health = h[1];
    const it = /Item:\{id:"([^"]+)",Count:(\d+)b/.exec(l);
    if (it) { o.itemId = it[1]; o.count = Number(it[2]); }
    out.push(o);
  }
  return { rows: out, foundNothing };
}
function hostNear(name, spot, rad) {
  const p = bot.entity && bot.entity.position;
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === name && e.position
      && Math.abs(e.position.x - spot.x) <= (rad || 3) && Math.abs(e.position.z - spot.z) <= (rad || 3))
    .sort((a, b) => (p ? a.position.distanceTo(p) - b.position.distanceTo(p) : 0))[0];
}
async function standBy(e) {
  await L.tp(srv, e.position.x + 1.1, e.position.y, e.position.z + 1.0, { bot: A, wait: 1000 });
  const cur = Object.values(bot.entities || {}).find((x) => x && x.id === e.id && x.position
    && x.position.distanceTo(bot.entity.position) < 3.4);
  if (!cur) throw new Error('host out of reach');
  try {
    bot.physicsEnabled = true;
    const Vec3 = require('vec3').Vec3;
    await bot.lookAt(new Vec3(cur.position.x, cur.position.y + (cur.height || 1.4) * 0.5, cur.position.z), true);
    await sleep(700);
  } catch (e2) { log('look', (e2 && e2.message) || e2); }
  try { bot.physicsEnabled = false; } catch (e2) { /* noop */ }
  return cur;
}
async function seed(toks, rad) { srv.send(`etest prod ${A} ${rad || 10} ${toks}`); await sleep(800); }
async function killGround() { srv.send(`kill ${boxAt('item', PEN.x, TY - 1, PEN.z, 14, 6, 14)}`); await sleep(600); }
async function freshCow() {
  srv.send(`kill ${boxAt('item', PEN.x, TY - 1, PEN.z, 14, 6, 14)}`);
  srv.send(`kill ${PENCOW()}`);
  await sleep(900);
  srv.send(`summon minecraft:cow ${COW.x} ${TY + 1} ${COW.z}`);
  await sleep(2000);
}
async function anchorCow(wait) {
  srv.send(`tp ${PENCOW()} ${COW.x} ${TY + 1} ${COW.z}`);
  await sleep(wait === undefined ? 450 : wait);
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
    await cmd('gamerule randomTickSpeed 0', 300);
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

    /* T1: clean hand-feed, no equip (give -> hotbar slot 0) */
    await freshCow();
    await seed('water=1.0 food=0.0 hp=2.0', 6);
    const c1 = await standBy(hostNear('cow', COW, 8));
    await cmd(`clear ${A}`, 350);
    await bot.setQuickBarSlot(0);
    await cmd(`give ${A} minecraft:wheat 1`, 900);
    ev.arms.T1 = { held: (bot.heldItem && bot.heldItem.name) || 'empty', inventory: bot.inventory.items().map((i) => i.name + 'x' + i.count) };
    await cmd(`gamemode 0 ${A}`, 700);
    let from = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8) || c1);
    await sleep(1400);
    const t1rows = since(from).filter((l) => /food src=cow/.test(l));
    ev.arms.T1.rows = t1rows;
    ev.arms.T1.hand = await invCount('wheat');
    ev.arms.T1.strayGround = since(from).filter((l) => /foodground src=/.test(l));
    await cmd(`gamemode 1 ${A}`, 500);
    log('T1', JSON.stringify(ev.arms.T1));

    /* T2: R2 InLove corroboration on a live-position box */
    await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 400 });
    await freshCow();
    await seed('water=0.2 food=1.0 hp=10.0', 10);
    const cowCount0 = Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow').length;
    await anchorCow();
    const from2 = srv.all.length;
    srv.send(`summon minecraft:item ${COW.x + 0.6} ${TY + 1} ${COW.z + 0.6} {Item:{id:"minecraft:wheat",Count:1b}}`);
    await sleep(6000);
    await anchorCow(300);
    const c = hostNear('cow', COW, 8);
    const bx = c ? boxAt('cow', c.position.x - 2, TY - 1, c.position.z - 2, 5, 6, 5) : boxAt('cow', COW.x - 2, TY - 1, COW.z - 2, 5, 6, 5);
    const dump = await nbtDump(bx);
    const item = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    ev.arms.T2 = {
      deny: since(from2).filter((l) => /foodground src=cow deny/.test(l)).slice(0, 3),
      serve: since(from2).filter((l) => /foodground src=cow serve/.test(l)).length,
      seek: since(from2).filter((l) => /foodseek src=/.test(l)).length,
      inLove: dump.rows.map((r) => r.inLove),
      item: item.foundNothing ? 'gone' : item.rows.map((r) => r.count),
      cows: [cowCount0, Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow').length],
    };
    log('T2', JSON.stringify(ev.arms.T2));
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
