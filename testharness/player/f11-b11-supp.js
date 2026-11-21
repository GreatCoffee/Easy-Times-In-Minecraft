#!/usr/bin/env node
/**
 * f11-b11-supp.js — W-B11 supplement (judged, folds into the verdict):
 *   S-A (needs=true, production=true): a CLEAN hand-feed row (ground items killed
 *       immediately before the click; the main b1 window caught a stray ground wheat
 *       between give and click) -> food src=cow serve add=0.5 food=0.50 hp=0.70 love=false
 *   S-B (needs=false, production=true): the flag face —
 *       b1 ground zero (foodseek/foodground src rows = 0, item survives),
 *       hand-feed still serves, water serves in creative, water serves + converts
 *       to the empty bucket in survival (look retry).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b11-supp';
const WORLD = 'w-b11s';
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
const cowCount = () => Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow'
  && e.position && Math.abs(e.position.x - HUB.x) < 8 && Math.abs(e.position.z - HUB.z) < 8).length;

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
    const it = /Item:\{id:"([^"]+)",Count:(\d+)b/.exec(l);
    if (it) { o.itemId = it[1]; o.count = Number(it[2]); }
    const ag = /(?:^|[,{])Age:(-?\d+)/.exec(l); if (ag) o.age = ag[1];
    const il = /,InLove:(-?\d+)/.exec(l); if (il) o.inLove = il[1];
    const h = /[,{]Health:([\d.]+)f/.exec(l); if (h) o.health = h[1];
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
  if (!cur) throw new Error('host out of reach after standby');
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
async function buildPen() {
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
  await freshCow();
}
async function startBoot(n, needs) {
  L.setCfgValue(L.CFG, 'livestockNeedsR196', needs ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n });
  if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b' + n);
  const b = { n, boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
    mixinFail: srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length };
  log('boot' + n, b.boot + ' mixin=' + b.mixinFail + ' needs=' + needs);
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
  ev.boots = ev.boots || []; ev.boots.push(b);
}
async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const st = await srv.stop();
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)));
  srv = null;
}
/** hand-feed click: clean ground, seed, survival, click; returns the food rows. */
async function handFeed() {
  await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 500 });
  const c = await freshCow();
  await seed('water=1.0 food=0.0 hp=2.0', 6);
  const cur = await standBy(hostNear('cow', COW, 8));
  await killGround();                       // the stray-ground-wheat guard (main window lesson)
  await cmd(`clear ${A}`, 350);
  await cmd(`give ${A} minecraft:wheat 1`, 700);
  const it = pick('wheat'); if (!it) throw new Error('no wheat');
  await bot.equip(it, 'hand'); await sleep(350);
  await cmd(`gamemode 0 ${A}`, 700);
  const from = srv.all.length;
  await bot.activateEntity(hostNear('cow', COW, 8) || cur);
  await sleep(1400);
  const rows = since(from).filter((l) => /food src=cow/.test(l));
  const hand = await invCount('wheat');
  await cmd(`gamemode 1 ${A}`, 500);
  return { rows, hand };
}
/** water click with a look retry; mode 1 = creative, 0 = survival. */
async function waterClick(gamemode) {
  await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 500 });
  await seed('water=0.0', 6);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const cur = await standBy(hostNear('cow', COW, 8));
    await killGround();
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:water_bucket 1`, 700);
    const wb = pick('water_bucket'); if (!wb) throw new Error('no water bucket');
    await bot.equip(wb, 'hand'); await sleep(350);
    if (gamemode === 0) await cmd(`gamemode 0 ${A}`, 700);
    const from = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8) || cur);
    await sleep(1400);
    const rows = since(from).filter((l) => /water src=cow/.test(l));
    if (gamemode === 0) await cmd(`gamemode 1 ${A}`, 500);
    if (rows.length) {
      return { attempt, rows, counts: { water_bucket: await invCount('water_bucket'), bucket: await invCount('bucket') } };
    }
    await seed('water=0.0', 6);
  }
  return { attempt: 3, rows: [], counts: null };
}

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ---------------- boot A: needs=true, clean hand-feed ---------------- */
  try {
    await startBoot(1, true);
    await buildPen();
    ev.arms.SA = await handFeed();
    log('SA', JSON.stringify(ev.arms.SA));
    await stopBoot(1);
  } catch (e) { log('A-FAIL', (e && e.stack) || e); ev.aError = String(e); try { if (srv) await stopBoot(1); } catch (e2) { /* noop */ } }

  /* ---------------- boot B: needs=false flag face ---------------- */
  try {
    await startBoot(2, false);
    await buildPen();
    await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 500 });
    await seed('water=0.0 food=0.3 hp=10.0', 10);
    const from = srv.all.length;
    srv.send(`summon minecraft:item ${COW.x + 0.6} ${TY + 1} ${COW.z + 0.6} {Item:{id:"minecraft:wheat",Count:1b}}`);
    srv.send(`summon minecraft:item 305.9 101 849.9 {Item:{id:"minecraft:wheat",Count:1b}}`);
    await sleep(12000);
    srv.send(`tp ${PENCOW()} ${COW.x} ${TY + 1} ${COW.z}`);
    await sleep(12000);
    const rows = since(from);
    const item = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    ev.arms.SB = {
      groundRows: rows.filter((l) => /foodground src=|foodseek src=/.test(l)),
      prodEchoes: rows.filter((l) => /\[FarmLog\] prod /.test(l)).length,
      item: item.foundNothing ? 'gone' : item.rows.map((r) => r.count),
      cows: cowCount(),
    };
    ev.arms.SB.hand = await handFeed();
    ev.arms.SB.waterCreative = await waterClick(1);
    ev.arms.SB.waterSurvival = await waterClick(0);
    ev.arms.SB.groundAfter = since(from).filter((l) => /foodground src=|foodseek src=/.test(l)).length;
    log('SB', JSON.stringify(ev.arms.SB));
    await stopBoot(2);
  } catch (e) { log('B-FAIL', (e && e.stack) || e); ev.bError = String(e); try { if (srv) await stopBoot(2); } catch (e2) { /* noop */ } }

  L.setCfgValue(L.CFG, 'livestockNeedsR196', 'true');
  L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
  fs.writeFileSync(L.PROPS, propsBefore);
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
  log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  process.exit(0);
})();
