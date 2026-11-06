#!/usr/bin/env node
/**
 * f11-b12-verify.js — W-B12 judged window (mate breeding chain, HEAD 37dd834,
 * working-tree jar 1,018,561 B / MD5 86BDE463…).
 *
 *   R0  boot face: Done, mixinFail 0, mixins 80+10, refmap 84/186 (both trees),
 *       three B-12 mixin classes inside the jar, cfg code keys unchanged.
 *   R1  spawn arm (F-A): two cows fed -> love=true x2 -> EntityAIMate 60 ticks ->
 *       [FarmLog] breed src=adopt (per-need min) + parents Age ~16000 + child
 *       Age ~-64000 + child ForgeCaps = min(parents).
 *   R2  cauldron lock (F-B(1)): child Age:-60 inside a cauldron with a capped
 *       head cell -> Age freezes at -1 (two dumps, delta 0) + cauldron cancel
 *       rows whose first one lands >= 2.5 s after the summon (R196 :36 gate is
 *       only entered when the write crosses to >= 0).
 *       controls: no cauldron / no head cap / Age:-64000 -> no lock, Age grows.
 *   R3  desperate lock (F-D): child Age:-64000 with food 0.04 -> in-interval
 *       NBT shot (both food<0.05, Age delta 0) + cancel-row windows grouped by
 *       the age field (each >= 10 rows at a constant age, gaps > 0).
 *   R4  thrown egg (F-C): egg impact damage 1.0F (MITE) + hatchling Age ~-64000.
 *   R5  spawn egg (F-B(2)): cow spawn egg on an adult cow -> calf Age ~-64000.
 *   R6  flag face (boot 2, livestockNeedsR196=false): adopt rows 0, parents
 *       ~6000-D, child ~-24000+D, agegate 0 + the vanilla egg damage face.
 *   R9  closure: flags restored, cfg hash same, jars/MK same, world removed,
 *       port 0, no JVM, crash count unchanged.
 *
 * Hand feeds use /replaceitem (never /give): 1.12 CommandGive drops a
 * makeFakeItem entity at the player's feet, and with needs=true the ground
 * pickup arm eats it (B-11 C-11-2). Feed seed = full health + food 0.20: the
 * R196 love arm (eatCore) only sets InLove when the eater is at max health
 * BEFORE the bite, and food 0.20 keeps the family gate open (hungry half).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f11-b12-verify';
const WORLD = 'w-b12v1';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const COW1 = { x: 300.5, z: 851.5 };
const COW2 = { x: 303.0, z: 851.5 };
const HUB = { x: PEN.x + 6.5, z: PEN.z + 6.5 };
const CAL = { x: 299, z: 849 };
const DESP = { x: 302, z: 850 };
const EGGCOW = { x: 306.5, z: 852.5 };

/* B-12 pins (task book §二) — MK_PIN in f7-wb-lib stays on B-11 on purpose. */
const B12 = {
  head: '37dd834',
  jarBytes: 1018561,
  jarMd5: '86BDE4637203E209EAECB9190569563D',
  classes: 84, entries: 186, dual: 372, mixins: 80, client: 10,
  cfgCodeKeys: 245,
};

const sleep = L.sleep;
const log = L.log;
const sha256 = L.sha256;
let srv = null, bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), world: WORLD, boots: [], stops: [], arms: {} };

const since = (n) => srv.all.slice(n).map(L.strip);
const count = (rows, re) => rows.filter((l) => re.test(l)).length;

const boxAt = (type, x0, y0, z0, dx, dy, dz) =>
  `@e[type=${type},x=${Math.floor(x0)},y=${Math.floor(y0)},z=${Math.floor(z0)},dx=${Math.ceil(dx)},dy=${Math.ceil(dy)},dz=${Math.ceil(dz)}]`;
const boxKill = (type, x0, y0, z0, dx, dy, dz) => `kill ${boxAt(type, x0, y0, z0, dx, dy, dz)}`;
const PENCOW = () => boxAt('cow', PEN.x, TY - 1, PEN.z, 14, 8, 14);
const cowBox = () => boxAt('cow', PEN.x, TY - 2, PEN.z, 16, 9, 16);
const itemBox = (x, z, r) => boxAt('item', x - (r || 2), TY - 1, z - (r || 2), (r || 2) * 2 + 1, 7, (r || 2) * 2 + 1);

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }

/** full NBT dump of every entity matched; the execute runs once per match. */
async function dump(sel, wait) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(wait === undefined ? 950 : wait);
  const rows = since(from);
  const out = [];
  let foundNothing = false;
  for (const l of rows) {
    if (/found nothing/i.test(l)) { foundNothing = true; continue; }
    if (!/\{.*\}/.test(l)) continue;
    const g = (re) => { const m = re.exec(l); return m ? m[1] : null; };
    const pos = g(/Pos:\[([^\]]+)\]/);
    out.push({
      age: g(/(?:^|[,{])Age:(-?\d+)/),
      inLove: g(/[,{]InLove:(-?\d+)/),
      health: g(/[,{]Health:([\d.]+)f/),
      food: g(/[,{]food:([-\d.]+)f/),
      water: g(/[,{]water:([-\d.]+)f/),
      freedom: g(/[,{]freedom:([-\d.]+)f/),
      pos: pos ? pos.split(',').map((s) => Math.round(parseFloat(s))).join(',') : null,
      raw: l.slice(0, 1400),
      caps: (/"etim:livestock":\{[^}]*\}/.exec(l) || [''])[0],
    });
  }
  return { rows: out, foundNothing, all: rows };
}
const ages = (d) => d.rows.map((r) => r.age);

function hostNear(name, spot, rad) {
  const p = bot.entity && bot.entity.position;
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === name && e.position
      && Math.abs(e.position.x - spot.x) <= (rad || 3) && Math.abs(e.position.z - spot.z) <= (rad || 3))
    .sort((a, b) => (Math.hypot(a.position.x - spot.x, a.position.z - spot.z)
      - Math.hypot(b.position.x - spot.x, b.position.z - spot.z)))[0];
}
const botCount = (name) => Object.values(bot.entities || {})
  .filter((e) => e && e.name === name && e.position
    && Math.abs(e.position.x - HUB.x) < 10 && Math.abs(e.position.z - HUB.z) < 10).length;

async function lookAtEntity(e) {
  try {
    bot.physicsEnabled = true;
    const Vec3 = require('vec3').Vec3;
    await bot.lookAt(new Vec3(e.position.x, e.position.y + (e.height || 1.4) * 0.5, e.position.z), true);
    await sleep(650);
  } catch (e2) { log('look', (e2 && e2.message) || e2); }
  try { bot.physicsEnabled = false; } catch (e2) { /* noop */ }
}
async function standBy(e) {
  await L.tp(srv, e.position.x + 1.1, e.position.y, e.position.z + 1.0, { bot: A, wait: 950 });
  const cur = Object.values(bot.entities || {}).find((x) => x && x.id === e.id && x.position
    && x.position.distanceTo(bot.entity.position) < 3.6);
  if (!cur) throw new Error('host out of reach after standby');
  await lookAtEntity(cur);
  return cur;
}
async function hub() { await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 500 }); }
async function seed(toks, rad) { srv.send(`etest prod ${A} ${rad || 10} ${toks}`); await sleep(850); }
async function anchor(spot, wait) {
  srv.send(`tp @e[type=cow,x=${Math.floor(spot.x) - 1},y=${TY - 1},z=${Math.floor(spot.z) - 1},dx=3,dy=8,dz=3] ${spot.x} ${TY + 1} ${spot.z}`);
  await sleep(wait === undefined ? 450 : wait);
}
/** pen-wide single-cow anchor (R2/R3 run exactly one cow: the cauldron/desperate child). */
async function anchorPenCow(x, y, z, wait) {
  srv.send(`tp ${PENCOW()} ${x} ${y} ${z}`);
  await sleep(wait === undefined ? 450 : wait);
}
async function killCows() {
  srv.send(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 7, 14));
  srv.send(boxKill('cow', PEN.x, TY - 2, PEN.z, 16, 9, 16));
  await sleep(900);
}

/** one hand-feed click on a cow standing at spot; no re-seed (caller seeds). */
async function handFeed(spot, label, tries) {
  const n = tries || 3;
  let rows = [];
  for (let i = 0; i < n && !rows.length; i++) {
    const c = hostNear('cow', spot, 4);
    if (!c) throw new Error('no cow at feed spot ' + label);
    await standBy(c);
    await cmd(`clear ${A}`, 320);
    await cmd(`replaceitem entity ${A} slot.hotbar.0 minecraft:wheat 1`, 650);
    await bot.setQuickBarSlot(0);
    await cmd(`gamemode 0 ${A}`, 650);
    const from = srv.all.length;
    await bot.activateEntity(hostNear('cow', spot, 8) || c);
    await sleep(1300);
    rows = since(from).filter((l) => /food src=cow/.test(l));
    await cmd(`gamemode 1 ${A}`, 450);
    if (!rows.length) log('feed' + label, 'attempt ' + (i + 1) + ' no row');
  }
  return rows;
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
  const guardFrom = srv.all.length;
  srv.send(`summon minecraft:cow ${COW1.x} ${TY + 1} ${COW1.z}`);
  await sleep(2500);
  const wallRows = since(guardFrom).filter((l) => /inWall/.test(l));
  ev.pen = { inWallRows: wallRows.length };
  log('pen', 'inWall=' + wallRows.length);
  if (wallRows.length) throw new Error('pen animal suffocating (inWall)');
}

function countCodeKeys() {
  const s = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java'), 'utf8');
  const re = /config\.get(?:Boolean|Int|Float|String)\s*\(\s*"([A-Za-z0-9_]+)"/g;
  const set = new Set(); let m;
  while ((m = re.exec(s))) set.add(m[1]);
  return set.size;
}
/** jar entry list from the central directory (no external deps). */
function jarNames(file) {
  const b = fs.readFileSync(file);
  let eocd = -1;
  for (let i = b.length - 22; i >= 0; i--) { if (b.readUInt32LE(i) === 0x06054b50) { eocd = i; break; } }
  if (eocd < 0) throw new Error('jar: no EOCD');
  const total = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const names = [];
  for (let k = 0; k < total; k++) {
    if (b.readUInt32LE(p) !== 0x02014b50) break;
    const nl = b.readUInt16LE(p + 28);
    const el = b.readUInt16LE(p + 30);
    const cl = b.readUInt16LE(p + 32);
    names.push(b.toString('utf8', p + 46, p + 46 + nl));
    p += 46 + nl + el + cl;
  }
  return names;
}

async function waitPortFree(timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (L.netstatListen(L.PORT) === 0) return true;
    await sleep(5000);
  }
  return L.netstatListen(L.PORT) === 0;
}
async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'livestockNeedsR196', o.needs === false ? 'false' : 'true');
  L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  L.setCfgValue(L.CFG, 'damageDebugLog', 'true');
  let b = null;
  for (let attempt = 1; attempt <= 3 && !b; attempt++) {
    // a parallel window on the same port kills the bind; wait for it to clear
    const free = await waitPortFree(240000);
    log('port', 'b' + n + ' attempt ' + attempt + ' free=' + free);
    srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n + (attempt > 1 ? '-r' + attempt : '') });
    const hit = await srv.waitFor(/Done \(/, 200000);
    if (hit) {
      b = {
        n,
        boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
        mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
      };
      break;
    }
    const bindFail = srv.all.some((l) => /FAILED TO BIND TO PORT|Address already in use/.test(l));
    log('boot' + n, 'attempt ' + attempt + ' failed bind=' + bindFail);
    ev.bootRetries = (ev.bootRetries || 0) + 1;
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
    if (!bindFail) throw new Error('no Done( b' + n);
    await sleep(8000);
  }
  if (!b) throw new Error('no Done( b' + n + ' after retries');
  ev.boots.push(b);
  log('boot' + n, b.boot + ' mixinFail=' + b.mixinFail + ' needs=' + (o.needs === false ? 'false' : 'true'));
  if (b.mixinFail > 0) throw new Error('mixinFail>0 at boot ' + n + ' — window stopped (A-level)');
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
  return b;
}
async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const st = await srv.stop();
  const rec = { n, exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) };
  ev.stops.push(rec);
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + rec.build);
  srv = null;
  return rec;
}

/* ------------------------------------------------------------------ R1 */
async function armR1() {
  const r = { feeds: [], adopt: [], parents: null, child: null, dumps: null };
  await hub();
  await killCows();
  await cmd(`summon minecraft:cow ${COW1.x} ${TY + 1} ${COW1.z}`, 900);
  await cmd(`summon minecraft:cow ${COW2.x} ${TY + 1} ${COW2.z}`, 1800);
  // anchor both so the per-cow seeds below land on known cells
  await cmd(`tp @e[type=cow,x=299,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW1.x} ${TY + 1} ${COW1.z}`, 400);
  await cmd(`tp @e[type=cow,x=302,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW2.x} ${TY + 1} ${COW2.z}`, 500);
  // both cows: full health (the R196 love arm needs max health BEFORE the bite)
  // + food 0.20 (hungry half keeps the family gate open) + water 0.30
  await seed('food=0.20 water=0.30 hp=10.0', 10);
  // cow2 only: water 0.70 -> adopt must read the MIN (0.30), not 0.70
  await L.tp(srv, COW2.x + 1.1, TY + 1, COW2.z, { bot: A, wait: 700 });
  await seed('water=0.70', 1);
  r.seed = { cow1: { food: 0.20, water: 0.30, hp: 10.0 }, cow2: { water: 0.70 } };
  r.pre = await dump(cowBox(), 1100);
  r.feeds.push({ label: 'cow1', rows: await handFeed(COW1, 'cow1') });
  r.feeds.push({ label: 'cow2', rows: await handFeed(COW2, 'cow2') });
  const from = srv.all.length;
  let adopt = null;
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    await sleep(700);
    adopt = since(from).find((l) => /\[FarmLog\] breed src=adopt/.test(l)) || null;
    if (adopt) break;
  }
  r.adopt = since(from).filter((l) => /\[FarmLog\] breed src=adopt/.test(l));
  r.adoptRow = adopt;
  r.post = await dump(cowBox(), 1500);
  const rows = r.post.rows.filter((x) => x.age !== null);
  r.all = rows.map((x) => ({ age: x.age, pos: x.pos, food: x.food, water: x.water, freedom: x.freedom, inLove: x.inLove, health: x.health }));
  r.child = rows.filter((x) => Number(x.age) <= -50000)[0] || null;
  r.parents = rows.filter((x) => Number(x.age) > 1000);
  r.rows = since(from).filter((l) => /breed src=adopt|food src=cow/.test(l));
  log('R1', JSON.stringify({
    feeds: r.feeds.map((f) => f.rows.map((x) => x.slice(0, 130))),
    adopt: (adopt || '').slice(0, 190),
    ages: rows.map((x) => x.age),
    child: r.child && { age: r.child.age, food: r.child.food, water: r.child.water, freedom: r.child.freedom },
    parents: r.parents.map((x) => ({ age: x.age, food: x.food, water: x.water, inLove: x.inLove })),
  }));
  return r;
}

/* ------------------------------------------------------------------ R2 */
async function cauldronArm() {
  const r = { controls: [] };
  await hub();
  await killCows();
  await cmd(`fill ${CAL.x} ${TY + 1} ${CAL.z} ${CAL.x} ${TY + 1} ${CAL.z} minecraft:cauldron 0`, 450);
  await cmd(`fill ${CAL.x} ${TY + 2} ${CAL.z} ${CAL.x} ${TY + 2} ${CAL.z} minecraft:cobblestone 0`, 450);
  const idx = srv.all.length;
  const t0 = Date.now();
  srv.send(`summon minecraft:cow ${CAL.x + 0.5} ${TY + 1.05} ${CAL.z + 0.5} {Age:-60,Invulnerable:1b,PersistenceRequired:1b}`);
  let firstCancelMs = null;
  for (let t = 0; t < 9000; t += 250) {
    await sleep(250);
    if (firstCancelMs === null && srv.all.slice(idx).some((l) => /agegate src=cauldron cancel/.test(l))) {
      firstCancelMs = Date.now() - t0;
    }
  }
  const sel = boxAt('cow', CAL.x - 2, TY - 1, CAL.z - 2, 5, 8, 5);
  await anchorPenCow(CAL.x + 0.5, TY + 1.05, CAL.z + 0.5, 400);
  const a0 = await dump(sel, 1100);
  await sleep(6200);
  await anchorPenCow(CAL.x + 0.5, TY + 1.05, CAL.z + 0.5, 400);
  const a1 = await dump(sel, 1100);
  r.summonToFirstCancelMs = firstCancelMs;
  r.age0 = ages(a0);
  r.age1 = ages(a1);
  r.delta = (a0.rows[0] && a1.rows[0]) ? Number(a1.rows[0].age) - Number(a0.rows[0].age) : null;
  r.cancelRows = count(since(idx), /agegate src=cauldron cancel/);
  r.lockRows = count(since(idx), /agegate src=cauldron lock/);
  r.sample = since(idx).filter((l) => /agegate src=cauldron/.test(l)).slice(0, 4);
  // control (a) no cauldron
  await cmd(boxKill('cow', CAL.x - 2, TY - 1, CAL.z - 2, 5, 8, 5), 700);
  await cmd(`fill ${CAL.x} ${TY + 1} ${CAL.z} ${CAL.x} ${TY + 2} ${CAL.z} minecraft:air 0`, 450);
  let f = srv.all.length;
  srv.send(`summon minecraft:cow ${CAL.x + 0.5} ${TY + 1.05} ${CAL.z + 0.5} {Age:-60,Invulnerable:1b,PersistenceRequired:1b}`);
  await sleep(5200);
  await anchorPenCow(CAL.x + 0.5, TY + 1.05, CAL.z + 0.5, 400);
  r.controls.push({ name: 'no-cauldron', ages: ages(await dump(sel, 1100)), cancelRows: count(since(f), /agegate src=cauldron cancel/) });
  // control (b) cauldron, no head cap
  await cmd(boxKill('cow', CAL.x - 2, TY - 1, CAL.z - 2, 5, 8, 5), 700);
  await cmd(`fill ${CAL.x} ${TY + 1} ${CAL.z} ${CAL.x} ${TY + 1} ${CAL.z} minecraft:cauldron 0`, 400);
  await cmd(`fill ${CAL.x} ${TY + 2} ${CAL.z} ${CAL.x} ${TY + 2} ${CAL.z} minecraft:air 0`, 400);
  f = srv.all.length;
  srv.send(`summon minecraft:cow ${CAL.x + 0.5} ${TY + 1.05} ${CAL.z + 0.5} {Age:-60,Invulnerable:1b,PersistenceRequired:1b}`);
  await sleep(5200);
  await anchorPenCow(CAL.x + 0.5, TY + 1.05, CAL.z + 0.5, 400);
  r.controls.push({ name: 'no-head-cap', ages: ages(await dump(sel, 1100)), cancelRows: count(since(f), /agegate src=cauldron cancel/) });
  // control (c) cauldron + cap but Age:-64000 (the gate is never entered)
  await cmd(boxKill('cow', CAL.x - 2, TY - 1, CAL.z - 2, 5, 8, 5), 700);
  await cmd(`fill ${CAL.x} ${TY + 2} ${CAL.z} ${CAL.x} ${TY + 2} ${CAL.z} minecraft:cobblestone 0`, 400);
  f = srv.all.length;
  srv.send(`summon minecraft:cow ${CAL.x + 0.5} ${TY + 1.05} ${CAL.z + 0.5} {Age:-64000,Invulnerable:1b,PersistenceRequired:1b}`);
  await sleep(5200);
  await anchorPenCow(CAL.x + 0.5, TY + 1.05, CAL.z + 0.5, 400);
  r.controls.push({ name: 'age-64000', ages: ages(await dump(sel, 1100)), cancelRows: count(since(f), /agegate src=cauldron cancel/) });
  log('R2', JSON.stringify({ age0: r.age0, age1: r.age1, delta: r.delta, cancels: r.cancelRows, firstMs: r.summonToFirstCancelMs, controls: r.controls }));
  return r;
}

/* ------------------------------------------------------------------ R3 */
async function desperateArm() {
  const r = { attempts: [], windows: [] };
  await hub();
  await killCows();
  await cmd(`fill ${CAL.x} ${TY + 1} ${CAL.z} ${CAL.x} ${TY + 2} ${CAL.z} minecraft:air 0`, 500);
  await cmd(`summon minecraft:cow ${DESP.x} ${TY + 1} ${DESP.z} {Age:-64000,PersistenceRequired:1b}`, 2200);
  const dsel = boxAt('cow', DESP.x - 3, TY - 2, DESP.z - 3, 7, 8, 7);
  const dfrom = srv.all.length;
  let shot = null;
  for (let i = 0; i < 5 && !shot; i++) {
    await seed('food=0.04 water=1.0', 8);
    await sleep(450);
    await anchorPenCow(DESP.x, TY + 1, DESP.z, 350);
    const A0 = (await dump(dsel, 1000)).rows[0] || {};
    await sleep(1700);
    await anchorPenCow(DESP.x, TY + 1, DESP.z, 350);
    const A1 = (await dump(dsel, 1000)).rows[0] || {};
    const rec = { a0: A0.age, a1: A1.age, f0: A0.food, f1: A1.food, w0: A0.water, w1: A1.water };
    r.attempts.push(rec);
    if (A0.food !== null && A1.food !== null && Number(A0.food) < 0.05 && Number(A1.food) < 0.05) shot = rec;
  }
  await sleep(2500);
  const rows = since(dfrom);
  const cancelRows = rows.filter((l) => /agegate src=desperate cancel/.test(l));
  const byAge = {};
  for (const l of cancelRows) {
    const m = /age=(-?\d+)/.exec(l);
    if (m) byAge[m[1]] = (byAge[m[1]] || 0) + 1;
  }
  r.windows = Object.keys(byAge).map((k) => ({ age: Number(k), rows: byAge[k] })).sort((a, b) => b.age - a.age);
  const anchors = r.windows.map((w) => w.age);
  r.gaps = [];
  for (let i = 1; i < anchors.length; i++) r.gaps.push(anchors[i - 1] - anchors[i]);
  r.heldWindows = r.windows.filter((w) => w.rows >= 10).length;
  r.shot = shot;
  r.cancelRows = cancelRows.length;
  r.lockRows = count(rows, /agegate src=desperate lock/);
  r.sample = rows.filter((l) => /agegate src=desperate/.test(l)).slice(0, 4);
  log('R3', JSON.stringify({
    shot: r.shot, windows: r.windows.slice(0, 6), held: r.heldWindows,
    gaps: r.gaps.slice(0, 6), cancels: r.cancelRows, locks: r.lockRows,
  }));
  return r;
}

/* ------------------------------------------------------------------ R4 */
async function eggArm() {
  // The damage face is read on a PIG: the player target never produced a
  // [DamageLog] row in any window (4/4 misses, the egg hatches on the player
  // box without a damageEntity call). Same ModifyArg exit either way — R196
  // EntityEgg:19 hurts rc.getEntityHit() whatever the living class is.
  const PIGT = { x: 306.5, z: 850.5 };
  const r = { pig: [], player: [], hatch: {} };
  await hub();
  await killCows();
  await cmd(boxKill('chicken', PEN.x, TY - 2, PEN.z, 14, 9, 14), 600);
  await cmd(`summon minecraft:pig ${PIGT.x} ${TY + 1} ${PIGT.z} {PersistenceRequired:1b}`, 1800);
  r.pigBefore = (await dump(boxAt('pig', PIGT.x - 2, TY - 1, PIGT.z - 2, 5, 7, 5), 1000)).rows.map((x) => x.health);
  // ---- (iii) impact damage on a living target
  for (let i = 0; i < 3; i++) {
    await cmd(`tp @e[type=pig,x=${PEN.x},y=${TY - 2},z=${PEN.z},dx=16,dy=9,dz=16] ${PIGT.x} ${TY + 1} ${PIGT.z}`, 350);
    const from = srv.all.length;
    srv.send(`summon minecraft:egg ${PIGT.x} ${TY + 3} ${PIGT.z} {Motion:[0.0d,-0.6d,0.0d]}`);
    await sleep(1500);
    r.pig.push(since(from).filter((l) => /\[DamageLog\] dmg .*src=thrown/.test(l)));
  }
  r.pigAfter = (await dump(boxAt('pig', PIGT.x - 2, TY - 1, PIGT.z - 2, 5, 7, 5), 1000)).rows.map((x) => x.health);
  // ---- player target attempt (harness record; see the C-level note)
  await cmd(`gamemode 0 ${A}`, 600);
  await L.tp(srv, HUB.x - 1, TY + 1, HUB.z - 1, { bot: A, wait: 700 });
  for (let i = 0; i < 2; i++) {
    await cmd(`effect ${A} minecraft:instant_health 1 10`, 450);
    const from = srv.all.length;
    srv.send(`execute ${A} ~ ~ ~ summon minecraft:egg ~ ~3 ~ {Motion:[0.0d,-0.6d,0.0d]}`);
    await sleep(1400);
    r.player.push(since(from).filter((l) => /\[DamageLog\] dmg .*target=ETIM_F7/.test(l)));
  }
  await cmd(`gamemode 1 ${A}`, 500);
  // ---- (i)(ii) hatch: a rain of eggs on the pen floor
  const from = srv.all.length;
  for (let i = 0; i < 40; i++) {
    const x = PEN.x + 3 + (i % 7);
    const z = PEN.z + 3 + Math.floor(i / 7);
    srv.send(`summon minecraft:egg ${x} ${TY + 3} ${z} {Motion:[0.0d,-0.5d,0.0d]}`);
    await sleep(70);
  }
  await sleep(4500);
  const cdump = await dump(boxAt('chicken', PEN.x, TY - 2, PEN.z, 14, 9, 14), 1400);
  r.hatch.rows = cdump.rows.map((x) => ({ age: x.age, pos: x.pos, food: x.food, health: x.health }));
  r.hatch.count = cdump.rows.length;
  r.hatch.botCount = botCount('chicken');
  r.hatch.ages = cdump.rows.map((x) => x.age);
  r.hatch.summonErrors = count(since(from), /Unable to summon|Unknown entity|Invalid UUID/i);
  r.hatch.sample = since(from).filter((l) => /foodground|food src|breed src/.test(l)).slice(0, 2);
  log('R4', JSON.stringify({
    pig: r.pig.map((s) => s.map((x) => x.slice(0, 150))),
    pigHealth: [r.pigBefore, r.pigAfter],
    player: r.player.map((s) => s.map((x) => x.slice(0, 130))),
    hatchCount: r.hatch.count, ages: r.hatch.ages, botCount: r.hatch.botCount, err: r.hatch.summonErrors,
  }));
  return r;
}

/* ------------------------------------------------------------------ R5 */
async function spawnEggArm() {
  const r = {};
  await hub();
  await cmd(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 7, 14), 400);
  await cmd(boxKill('cow', PEN.x, TY - 2, PEN.z, 16, 9, 16), 700);
  await cmd(`summon minecraft:cow ${EGGCOW.x} ${TY + 1} ${EGGCOW.z} {Age:0}`, 2000);
  const before = await dump(boxAt('cow', EGGCOW.x - 3, TY - 2, EGGCOW.z - 3, 7, 9, 7), 1100);
  r.before = before.rows.map((x) => ({ age: x.age, pos: x.pos }));
  const c = hostNear('cow', EGGCOW, 5);
  if (!c) throw new Error('no adult cow for the spawn egg');
  await standBy(c);
  await cmd(`clear ${A}`, 320);
  await cmd(`replaceitem entity ${A} slot.hotbar.0 minecraft:spawn_egg 1 92 {EntityTag:{id:"minecraft:cow"}}`, 700);
  await bot.setQuickBarSlot(0);
  await cmd(`gamemode 1 ${A}`, 650);
  const from = srv.all.length;
  await bot.activateEntity(hostNear('cow', EGGCOW, 8) || c);
  await sleep(1800);
  const after = await dump(boxAt('cow', EGGCOW.x - 3, TY - 2, EGGCOW.z - 3, 7, 9, 7), 1300);
  r.after = after.rows.map((x) => ({ age: x.age, pos: x.pos, food: x.food, water: x.water }));
  r.newborn = after.rows.filter((x) => Number(x.age) < -5000).map((x) => x.age);
  r.held = (bot.heldItem && bot.heldItem.name) || 'empty';
  r.sample = since(from).filter((l) => /EntityLog|spawn|EntityCow/.test(l)).slice(0, 3);
  log('R5', JSON.stringify({ before: r.before, after: r.after, newborn: r.newborn, held: r.held }));
  return r;
}

/* ------------------------------------------------------------------ R6 */
async function armR6() {
  const r = { feeds: [], adopt: [] };
  await buildPen();
  await hub();
  await killCows();
  await cmd(`summon minecraft:cow ${COW1.x} ${TY + 1} ${COW1.z}`, 900);
  await cmd(`summon minecraft:cow ${COW2.x} ${TY + 1} ${COW2.z}`, 1800);
  await cmd(`tp @e[type=cow,x=299,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW1.x} ${TY + 1} ${COW1.z}`, 400);
  await cmd(`tp @e[type=cow,x=302,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW2.x} ${TY + 1} ${COW2.z}`, 500);
  await seed('food=0.20 water=0.30 hp=10.0', 10);
  // R1 sequence under the flag: the hand-feed row still fires (production flag)
  // but the R196 love arm needs min(freedom,food,water)>=0.25 and the cap never
  // initialises under needs=false, so freedom stays 0 -> love=false. Recorded.
  r.feeds.push({ label: 'cow1', rows: await handFeed(COW1, 'b2cow1') });
  r.feeds.push({ label: 'cow2', rows: await handFeed(COW2, 'b2cow2') });
  await sleep(6000);
  r.handLoveRows = count(since(0), /food src=cow serve .*love=true/);
  r.afterFeeds = (await dump(cowBox(), 1200)).rows.map((x) => ({ age: x.age, food: x.food, freedom: x.freedom, inLove: x.inLove }));
  // the spawn face itself is driven by a direct InLove seat (the hand-feed
  // love arm is unobservable under needs=false — see the C-level note)
  await killCows();
  await cmd(`summon minecraft:cow ${COW1.x} ${TY + 1} ${COW1.z} {InLove:600}`, 700);
  await cmd(`summon minecraft:cow ${COW2.x} ${TY + 1} ${COW2.z} {InLove:600}`, 1500);
  await cmd(`tp @e[type=cow,x=299,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW1.x} ${TY + 1} ${COW1.z}`, 400);
  await cmd(`tp @e[type=cow,x=302,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW2.x} ${TY + 1} ${COW2.z}`, 500);
  const from = srv.all.length;
  // flag off: no adopt row will ever come, so poll the pen for the child itself
  let childSeen = null;
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    await sleep(4000);
    const d = await dump(cowBox(), 1200);
    if (d.rows.some((x) => Number(x.age) < -1000)) { childSeen = d; break; }
  }
  if (!childSeen) childSeen = await dump(cowBox(), 1400);
  r.adopt = since(from).filter((l) => /\[FarmLog\] breed src=adopt/.test(l));
  r.post = childSeen;
  const rows = r.post.rows.filter((x) => x.age !== null);
  r.ages = rows.map((x) => x.age);
  r.child = rows.filter((x) => Number(x.age) < -1000)[0] || null;
  r.parents = rows.filter((x) => Number(x.age) > 1000);
  r.agegate = count(since(from), /agegate src=/);
  r.rows = since(from).filter((l) => /breed src=adopt|food src=cow/.test(l));
  // vanilla egg-damage face (flag off) on a pig target: the ModifyArg hands the
  // vanilla value back untouched (1.12 EntityEgg:61 = 0.0F)
  await hub();
  const vPig = { x: 306.5, z: 850.5 };
  await cmd(`summon minecraft:pig ${vPig.x} ${TY + 1} ${vPig.z} {PersistenceRequired:1b}`, 1600);
  r.eggDamage = [];
  for (let i = 0; i < 2; i++) {
    await cmd(`tp @e[type=pig,x=${PEN.x},y=${TY - 2},z=${PEN.z},dx=16,dy=9,dz=16] ${vPig.x} ${TY + 1} ${vPig.z}`, 350);
    const f2 = srv.all.length;
    srv.send(`summon minecraft:egg ${vPig.x} ${TY + 3} ${vPig.z} {Motion:[0.0d,-0.6d,0.0d]}`);
    await sleep(1500);
    r.eggDamage.push(since(f2).filter((l) => /\[DamageLog\] dmg .*src=thrown/.test(l)));
  }
  log('R6', JSON.stringify({
    feeds: r.feeds.map((f) => f.rows.map((x) => x.slice(0, 130))),
    afterFeeds: r.afterFeeds,
    adopt: r.adopt.length, ages: r.ages, agegate: r.agegate,
    parents: r.parents.map((x) => x.age), child: r.child && r.child.age,
    eggDamage: r.eggDamage.map((x) => x.map((y) => y.slice(0, 140))),
  }));
  return r;
}

/* ------------------------------------------------------------------ main */
async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  const jarBuf = fs.readFileSync(L.RELJAR);
  const mk = L.mkCounts();
  const cfgBefore = fs.readFileSync(L.CFG);
  const propsBefore = fs.readFileSync(L.PROPS);
  const names = jarNames(L.RELJAR);
  ev.pin = {
    head, headOk: head.startsWith(B12.head),
    jar: {
      bytes: jarBuf.length,
      md5: crypto.createHash('md5').update(jarBuf).digest('hex').toUpperCase(),
      sha256: sha256(jarBuf),
      ok: jarBuf.length === B12.jarBytes,
    },
    mk, mkOk: mk.refmapResources.classes === B12.classes && mk.refmapResources.entries === B12.entries
      && mk.refmapTmp.classes === B12.classes && mk.refmapTmp.entries === B12.entries
      && mk.manifest.mixins === B12.mixins && mk.manifest.client === B12.client,
    jarMixins: ['MixinEntityAIMate', 'MixinEntityAgeable', 'MixinEntityEgg']
      .map((n) => ({ name: n, inJar: names.indexOf('io/github/etim/etim/mixins/' + n + '.class') >= 0 })),
    cfgCodeKeys: countCodeKeys(),
    cfgFileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    manifestB12: ['MixinEntityAIMate', 'MixinEntityAgeable', 'MixinEntityEgg']
      .map((n) => ({ name: n, registered: JSON.parse(fs.readFileSync(
        path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8')).mixins.indexOf(n) >= 0 })),
  };
  ev.cfgBefore = {
    bytes: cfgBefore.length, sha: sha256(cfgBefore),
    values: (() => { const k = L.cfgKeys(L.CFG); return {
      needs: k.livestockNeedsR196, production: k.livestockProductionR196,
      farm: k.farmDebugLog, mob: k.mobDebugLog, damage: k.damageDebugLog }; })(),
  };
  ev.propsBefore = { bytes: propsBefore.length, sha: sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: sha256(fs.readFileSync(L.OBFCFG)) };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jar=' + ev.pin.jar.bytes + '/' + ev.pin.jar.md5
    + ' mk=' + ev.pin.mkOk + ' jarMixins=' + ev.pin.jarMixins.map((x) => x.inJar ? '1' : '0').join('')
    + ' cfgCode=' + ev.pin.cfgCodeKeys + '/file=' + ev.pin.cfgFileKeys);

  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ===================== boot 1 ===================== */
  try {
    await startBoot(1, { needs: true });
    ev.arms.R0 = {
      boot: ev.boots[0], pin: ev.pin,
      cfg: (() => { const k = L.cfgKeys(L.CFG); return {
        needs: k.livestockNeedsR196, production: k.livestockProductionR196,
        farm: k.farmDebugLog, mob: k.mobDebugLog, damage: k.damageDebugLog }; })(),
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    };
    await buildPen();
    ev.arms.R1 = await armR1();
    if (process.env.B12_ONLY === 'r1') {
      log('R1-only pilot done');
      await cmd('gamerule randomTickSpeed 3', 300);
      ev.stop1 = await stopBoot(1);
      fs.writeFileSync(path.join(L.OUT, TAG + '-r1pilot.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
      process.exit(0);
    }
    ev.arms.R2 = await cauldronArm();
    ev.arms.R3 = await desperateArm();
    ev.arms.R4 = await eggArm();
    ev.arms.R5 = await spawnEggArm();
    const k1 = L.cfgKeys(L.CFG);
    ev.arms.R12 = { codeKeys: countCodeKeys(), fileKeys: Object.keys(k1).length,
      values: { needs: k1.livestockNeedsR196, production: k1.livestockProductionR196, farm: k1.farmDebugLog, mob: k1.mobDebugLog } };
    log('R12-pre', JSON.stringify(ev.arms.R12));
    await cmd('gamerule randomTickSpeed 3', 300);
    await cmd('gamerule doDaylightCycle true', 300);
    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ===================== boot 2: needs flag off ===================== */
  try {
    await startBoot(2, { needs: false });
    ev.arms.R0b2 = {
      boot: ev.boots[1], mk: L.mkCounts(),
      cfg: (() => { const k = L.cfgKeys(L.CFG); return {
        needs: k.livestockNeedsR196, production: k.livestockProductionR196,
        farm: k.farmDebugLog, mob: k.mobDebugLog }; })(),
    };
    ev.arms.R6 = await armR6();
    await cmd('gamerule randomTickSpeed 3', 300);
    await cmd('gamerule doDaylightCycle true', 300);
    ev.stop2 = await stopBoot(2);
  } catch (e) {
    log('B2-FAIL', (e && e.stack) || e);
    ev.b2Error = String((e && e.stack) || e);
    try { if (srv) ev.stop2 = await stopBoot(2); } catch (e2) { ev.stop2Error = String((e2 && e2.message) || e2); }
  }

  /* ===================== closure ===================== */
  try {
    fs.writeFileSync(L.CFG, cfgBefore);        // exact pre-window bytes -> same hash
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: sha256(fs.readFileSync(L.CFG)),
      fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(),
      values: { needs: k.livestockNeedsR196, production: k.livestockProductionR196,
        farm: k.farmDebugLog, mob: k.mobDebugLog, damage: k.damageDebugLog } };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: sha256(fs.readFileSync(L.OBFCFG)) };
    ev.obfAfter.untouched = ev.obfAfter.sha === ev.obfBefore.sha && ev.obfAfter.bytes === ev.obfBefore.bytes;
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: sha256(fs.readFileSync(L.PROPS)),
      level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    const jb = fs.readFileSync(L.RELJAR);
    ev.pinAfter = { bytes: jb.length, md5: crypto.createHash('md5').update(jb).digest('hex').toUpperCase(),
      sha256: sha256(jb), mk: L.mkCounts() };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', '37dd834..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
    ev.worldsLeft = fs.existsSync(path.join(L.ROOT, 'run', WORLD)) ? [WORLD] : [];
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  } catch (e) {
    log('CLOSE-FAIL', (e && e.stack) || e);
    ev.closeError = String((e && e.stack) || e);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
  }
  process.exit(0);
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
