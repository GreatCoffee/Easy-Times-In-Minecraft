#!/usr/bin/env node
/**
 * f11-b12b-verify.js — W-B12b single-point regression (A-12-1 / A-12-2 fixes).
 *
 * Only three sub-faces are re-judged; R0/R2/R3/R5/R6 stay sealed on the W-B12
 * verdict (`b12-verify-verdict.md`).
 *
 *   R0b  boot face of the fixed jar: Done, mixinFail 0, jar 1,018,656 B /
 *        82DAB…, refmap 84/186 (dual 372), mixins 80+10, three B-12 classes in
 *        the jar AND in the manifest, cfg code keys 245, plus the
 *        `.mixin.out` export spot-check (EntityEgg.java: the setGrowingAge
 *        Redirect and the attackEntityFrom ModifyArg both rewritten).
 *   R1b  F-A(3) adoption lands: same R1 sequence (two cows, hand-feed ->
 *        love=true x2 -> EntityAIMate spawn) and then a TIGHT read window
 *        (child NBT dumped immediately after the adopt row, <= 2 s):
 *        (a) adopt row three values = min(parents)
 *        (b) child ForgeCaps food/water/freedom = the adopt row values
 *            (the init bundle must no longer overwrite them; inited:1b and
 *            milk:100 are the init-side witnesses).
 *   R4b  F-C(2) egg damage: pig target, 3 eggs -> raw = 1.000 and the pig's
 *        health loses 1.0 per hit; plus R4(i)(ii) no-regression (40-egg rain
 *        -> chicks at Age ~ -64000).
 *   R6b  flag-off control (boot 2, livestockNeedsR196=false): pig target ->
 *        raw = 0.000 (vanilla 0.0F, C-12-4) and the egg-hatched chicks land at
 *        Age ~ -24000 (the setGrowingAge redirect passes the vanilla value
 *        through untouched).
 *
 * Port gate + retry per C-12-7 (a parallel window on the same run/ dir kills
 * the bind; wait for 25565 to free, retry up to 3 times).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f11-b12b-verify';
const WORLD = 'w-b12v2';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const COW1 = { x: 300.5, z: 851.5 };
const COW2 = { x: 303.0, z: 851.5 };
const HUB = { x: PEN.x + 6.5, z: PEN.z + 6.5 };
const PIGT = { x: 306.5, z: 850.5 };

/* B-12 fixed pins (task book W-B12b §一). */
const B12B = {
  head: '37dd834',
  jarBytes: 1018656,
  jarMd5: '82DABAACC0F4D5209B730DEA68A62ED0',
  jarSha: '780E917AC3F0940276219C5E6928A5DECB71F5F66869E961DFDCD92BE7ED1F41',
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
const cowBox = () => boxAt('cow', PEN.x, TY - 2, PEN.z, 16, 9, 16);
const pigBox = () => boxAt('pig', PEN.x, TY - 2, PEN.z, 16, 9, 16);
const chickBox = () => boxAt('chicken', PEN.x, TY - 2, PEN.z, 16, 9, 16);

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }

/** full NBT dump of every entity matched; the execute runs once per match. */
async function dump(sel, wait) {
  const from = srv.all.length;
  const sentAt = Date.now();
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
      food: g(/[,{]food:([-?\d.eE]+)f/),
      water: g(/[,{]water:([-?\d.eE]+)f/),
      freedom: g(/[,{]freedom:([-?\d.eE]+)f/),
      milk: g(/[,{]milk:(-?\d+)/),
      feathers: g(/[,{]numFeathers:(-?\d+)/),
      maxFeathers: g(/[,{]maxNumFeathers:(-?\d+)/),
      manureCountdown: g(/[,{]manureCountdown:(-?\d+)/),
      inited: /inited:1b/.test(l),
      pos: pos ? pos.split(',').map((s) => Math.round(parseFloat(s))).join(',') : null,
      caps: (/\"etim:livestock\":\{[^}]*\}/.exec(l) || [''])[0],
      raw: l.slice(0, 1500),
    });
  }
  return { rows: out, foundNothing, all: rows, sentAt, seenAt: Date.now() };
}

function hostNear(name, spot, rad) {
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === name && e.position
      && Math.abs(e.position.x - spot.x) <= (rad || 3) && Math.abs(e.position.z - spot.z) <= (rad || 3))
    .sort((a, b) => (Math.hypot(a.position.x - spot.x, a.position.z - spot.z)
      - Math.hypot(b.position.x - spot.x, b.position.z - spot.z)))[0];
}
const botCountNear = (name, spot, rad) => Object.values(bot.entities || {})
  .filter((e) => e && e.name === name && e.position
    && Math.abs(e.position.x - spot.x) < rad && Math.abs(e.position.z - spot.z) < rad).length;

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
async function killCows() {
  srv.send(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 7, 14));
  srv.send(boxKill('cow', PEN.x, TY - 2, PEN.z, 16, 9, 16));
  srv.send(boxKill('pig', PEN.x, TY - 2, PEN.z, 16, 9, 16));
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

/** config keys registered in ETIMConfig.java (code-side count). */
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

/** `.mixin.out` export spot-check on EntityEgg (B-12-1 loudness face). */
function mixinExportCheck() {
  const f = path.join(L.ROOT, 'run', '.mixin.out', 'java', 'net', 'minecraft', 'entity', 'projectile', 'EntityEgg.java');
  if (!fs.existsSync(f)) return { present: false };
  const t = fs.readFileSync(f, 'utf8');
  const lines = t.split(/\r?\n/);
  const hit = lines.filter((l) => /attackEntityFrom|redirect\$|modify\$|setGrowingAge/.test(l));
  const dmgLine = lines.find((l) => /attackEntityFrom/.test(l)) || '';
  const growLine = lines.find((l) => /redirect\$.*etim\$chickenNewbornAge|modify\$.*etim\$eggImpactDamage/.test(l)) || '';
  return {
    present: true,
    attackEntityFromLine: dmgLine.trim(),
    dmgRewritten: /modify\$[^\s]*etim\$eggImpactDamage|1\.0F/.test(dmgLine),
    dmgBareVanilla: /attackEntityFrom\([^;]*, 0\.0F\)/.test(dmgLine),
    growLine: growLine.trim(),
    growRewritten: /redirect\$[^\s]*etim\$chickenNewbornAge/.test(t),
    modifyHandlerDecl: /modify\$[^\s]*etim\$eggImpactDamage/.test(t),
    attackCallCount: lines.filter((l) => /attackEntityFrom/.test(l)).length,
    sample: hit.slice(0, 8).map((l) => l.trim()),
  };
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
    const free = await waitPortFree(240000);
    log('port', 'b' + n + ' attempt ' + attempt + ' free=' + free);
    srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n + (attempt > 1 ? '-r' + attempt : '') });
    const hit = await srv.waitFor(/Done \(/, 200000);
    if (hit) {
      b = {
        n,
        boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
        mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure|require.*not found/i.test(l)).length,
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

/* ------------------------------------------------------------------ R1b */
async function armR1b() {
  const r = { feeds: [], adopt: [] };
  await hub();
  await killCows();
  await cmd(`summon minecraft:cow ${COW1.x} ${TY + 1} ${COW1.z}`, 900);
  await cmd(`summon minecraft:cow ${COW2.x} ${TY + 1} ${COW2.z}`, 1800);
  await cmd(`tp @e[type=cow,x=299,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW1.x} ${TY + 1} ${COW1.z}`, 400);
  await cmd(`tp @e[type=cow,x=302,y=${TY - 1},z=850,dx=3,dy=8,dz=3] ${COW2.x} ${TY + 1} ${COW2.z}`, 500);
  await seed('food=0.20 water=0.30 hp=10.0', 10);
  await L.tp(srv, COW2.x + 1.1, TY + 1, COW2.z, { bot: A, wait: 700 });
  await seed('water=0.70', 1);
  r.seed = { cow1: { food: 0.20, water: 0.30, hp: 10.0 }, cow2: { water: 0.70 } };
  r.pre = (await dump(cowBox(), 1100)).rows
    .filter((x) => x.age !== null)
    .map((x) => ({ age: x.age, food: x.food, water: x.water, freedom: x.freedom, pos: x.pos }));
  r.feeds.push({ label: 'cow1', rows: await handFeed(COW1, 'cow1') });
  r.feeds.push({ label: 'cow2', rows: await handFeed(COW2, 'cow2') });

  // --- tight read window: poll for the adopt row, dump at once, record the gap
  const from = srv.all.length;
  let adoptRaw = null, adoptAt = null;
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    await sleep(150);
    const hit = srv.all.slice(from).find((l) => /\[FarmLog\] breed src=adopt/.test(l));
    if (hit) { adoptRaw = hit; adoptAt = Date.now(); break; }
  }
  if (!adoptRaw) throw new Error('no adopt row within 60 s');
  const d = await dump(cowBox(), 900);
  r.dumpGapMs = Date.now() - adoptAt;
  r.adoptSeenAt = new Date(adoptAt).toISOString();
  r.adoptLine = L.strip(adoptRaw);
  r.adoptLogTs = (/^\[(\d\d:\d\d:\d\d)\]/.exec(adoptRaw) || [])[1] || null;
  const rows = d.rows.filter((x) => x.age !== null);
  // child = the only negative-age cow; if not visible yet, re-read once
  let child = rows.filter((x) => Number(x.age) <= -1000)[0] || null;
  let retried = false;
  if (!child) {
    retried = true;
    const d2 = await dump(cowBox(), 900);
    r.dumpGapMs = Date.now() - adoptAt;
    const rows2 = d2.rows.filter((x) => x.age !== null);
    child = rows2.filter((x) => Number(x.age) <= -1000)[0] || null;
    r.post = rows2.map((x) => ({ age: x.age, food: x.food, water: x.water, freedom: x.freedom, inited: x.inited, milk: x.milk, manure: x.manureCountdown, pos: x.pos }));
    r.parentsPost = rows2.filter((x) => Number(x.age) > 1000)
      .map((x) => ({ age: x.age, food: x.food, water: x.water, freedom: x.freedom, pos: x.pos }));
  } else {
    r.post = rows.map((x) => ({ age: x.age, food: x.food, water: x.water, freedom: x.freedom, inited: x.inited, milk: x.milk, manure: x.manureCountdown, pos: x.pos }));
    r.parentsPost = rows.filter((x) => Number(x.age) > 1000)
      .map((x) => ({ age: x.age, food: x.food, water: x.water, freedom: x.freedom, pos: x.pos }));
  }
  r.retriedDump = retried;
  r.child = child ? {
    age: child.age, food: child.food, water: child.water, freedom: child.freedom,
    inited: child.inited, milk: child.milk, feathers: child.feathers, maxFeathers: child.maxFeathers,
    manure: child.manureCountdown, caps: child.caps, pos: child.pos,
  } : null;
  // adopt row values + min(parents) as read in the same window
  const nums = (s) => (String(s || '').match(/-?\d+\.\d+|-?\d+/g) || []).map(Number);
  r.adoptVals = {
    food: nums((/food=(-?[\d.]+)/.exec(r.adoptLine) || [])[1])[0],
    water: nums((/water=(-?[\d.]+)/.exec(r.adoptLine) || [])[1])[0],
    freedom: nums((/freedom=(-?[\d.]+)/.exec(r.adoptLine) || [])[1])[0],
  };
  if (r.parentsPost && r.parentsPost.length === 2) {
    r.minParents = {
      food: Math.min(Number(r.parentsPost[0].food), Number(r.parentsPost[1].food)),
      water: Math.min(Number(r.parentsPost[0].water), Number(r.parentsPost[1].water)),
      freedom: Math.min(Number(r.parentsPost[0].freedom), Number(r.parentsPost[1].freedom)),
    };
    r.childEqualsAdopt = r.child ? {
      food: Math.abs(Number(r.child.food) - r.adoptVals.food),
      water: Math.abs(Number(r.child.water) - r.adoptVals.water),
      freedom: Math.abs(Number(r.child.freedom) - r.adoptVals.freedom),
    } : null;
    r.childEqualsMin = r.child ? {
      food: Math.abs(Number(r.child.food) - r.minParents.food),
      water: Math.abs(Number(r.child.water) - r.minParents.water),
      freedom: Math.abs(Number(r.child.freedom) - r.minParents.freedom),
    } : null;
  }
  log('R1b', JSON.stringify({
    feeds: r.feeds.map((f) => f.rows.map((x) => x.slice(0, 150))),
    adopt: r.adoptLine, gapMs: r.dumpGapMs, adoptTs: r.adoptLogTs,
    adoptVals: r.adoptVals, minParents: r.minParents,
    child: r.child, parents: r.parentsPost, retried: r.retriedDump,
    dAdopt: r.childEqualsAdopt, dMin: r.childEqualsMin,
  }));
  return r;
}

/* ------------------------------------------------------------------ R4b */
async function eggDamage(shots) {
  const out = [];
  for (let i = 0; i < shots; i++) {
    await cmd(`tp @e[type=pig,x=${PEN.x},y=${TY - 2},z=${PEN.z},dx=16,dy=9,dz=16] ${PIGT.x} ${TY + 1} ${PIGT.z}`, 350);
    const from = srv.all.length;
    srv.send(`summon minecraft:egg ${PIGT.x} ${TY + 3} ${PIGT.z} {Motion:[0.0d,-0.6d,0.0d]}`);
    await sleep(1500);
    out.push(since(from).filter((l) => /\[DamageLog\] dmg .*src=thrown/.test(l)));
  }
  return out;
}
async function eggHatch(n, wait) {
  const from = srv.all.length;
  for (let i = 0; i < n; i++) {
    const x = PEN.x + 3 + (i % 7);
    const z = PEN.z + 3 + Math.floor(i / 7);
    srv.send(`summon minecraft:egg ${x} ${TY + 3} ${z} {Motion:[0.0d,-0.5d,0.0d]}`);
    await sleep(70);
  }
  await sleep(wait === undefined ? 4500 : wait);
  const d = await dump(chickBox(), 1400);
  return {
    rows: d.rows.filter((x) => x.age !== null).map((x) => ({ age: x.age, pos: x.pos, food: x.food, health: x.health })),
    ages: d.rows.filter((x) => x.age !== null).map((x) => x.age),
    errors: count(since(from), /Unable to summon|Unknown entity|Invalid UUID/i),
  };
}

async function armR4b() {
  const r = {};
  await hub();
  await killCows();
  await cmd(boxKill('chicken', PEN.x, TY - 2, PEN.z, 16, 9, 16), 600);
  await cmd(`summon minecraft:pig ${PIGT.x} ${TY + 1} ${PIGT.z} {PersistenceRequired:1b}`, 1800);
  r.pigBefore = (await dump(pigBox(), 1000)).rows.filter((x) => x.age !== null).map((x) => x.health);
  r.shots = await eggDamage(3);
  r.pigAfter = (await dump(pigBox(), 1000)).rows.filter((x) => x.age !== null).map((x) => x.health);
  r.hatch = await eggHatch(40);
  r.hatch.botCount = botCountNear('chicken', HUB, 12);
  log('R4b', JSON.stringify({
    pigHealth: [r.pigBefore, r.pigAfter],
    shots: r.shots.map((s) => s.map((x) => x.slice(0, 170))),
    hatch: { n: r.hatch.rows.length, ages: r.hatch.ages, bot: r.hatch.botCount, err: r.hatch.errors },
  }));
  return r;
}

/* ------------------------------------------------------------------ R6b */
async function armR6b() {
  const r = {};
  await buildPen();
  await hub();
  await killCows();
  await cmd(boxKill('chicken', PEN.x, TY - 2, PEN.z, 16, 9, 16), 600);
  await cmd(`summon minecraft:pig ${PIGT.x} ${TY + 1} ${PIGT.z} {PersistenceRequired:1b}`, 1800);
  r.pigBefore = (await dump(pigBox(), 1000)).rows.filter((x) => x.age !== null).map((x) => x.health);
  r.shots = await eggDamage(2);
  r.pigAfter = (await dump(pigBox(), 1000)).rows.filter((x) => x.age !== null).map((x) => x.health);
  r.hatch = await eggHatch(40);
  r.hatch.botCount = botCountNear('chicken', HUB, 12);
  // flag-off zero-regression spot checks (cheap witnesses, not new arms)
  r.adoptRows = count(since(0), /\[FarmLog\] breed src=adopt/);
  r.agegateRows = count(since(0), /\[FarmLog\] agegate src=/);
  log('R6b', JSON.stringify({
    pigHealth: [r.pigBefore, r.pigAfter],
    shots: r.shots.map((s) => s.map((x) => x.slice(0, 170))),
    hatch: { n: r.hatch.rows.length, ages: r.hatch.ages, bot: r.hatch.botCount, err: r.hatch.errors },
    adoptRows: r.adoptRows, agegateRows: r.agegateRows,
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
  const refmapTxt = fs.readFileSync(path.join(L.ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json'), 'utf8');
  ev.pin = {
    head, headOk: head.startsWith(B12B.head),
    jar: {
      bytes: jarBuf.length,
      md5: crypto.createHash('md5').update(jarBuf).digest('hex').toUpperCase(),
      sha256: sha256(jarBuf),
      ok: jarBuf.length === B12B.jarBytes,
      md5Ok: crypto.createHash('md5').update(jarBuf).digest('hex').toUpperCase() === B12B.jarMd5,
    },
    mk, mkOk: mk.refmapResources.classes === B12B.classes && mk.refmapResources.entries === B12B.entries
      && mk.refmapTmp.classes === B12B.classes && mk.refmapTmp.entries === B12B.entries
      && mk.manifest.mixins === B12B.mixins && mk.manifest.client === B12B.client,
    jarMixins: ['MixinEntityAIMate', 'MixinEntityAgeable', 'MixinEntityEgg']
      .map((n) => ({ name: n, inJar: names.indexOf('io/github/etim/etim/mixins/' + n + '.class') >= 0 })),
    manifestB12: ['MixinEntityAIMate', 'MixinEntityAgeable', 'MixinEntityEgg']
      .map((n) => ({ name: n, registered: JSON.parse(fs.readFileSync(
        path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8')).mixins.indexOf(n) >= 0 })),
    cfgCodeKeys: countCodeKeys(),
    cfgFileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    refmapOwnerCheck: {
      entityLivingBaseAttack: (refmapTxt.match(/EntityLivingBase;func_70097_a/g) || []).length,
      entityAttack: (refmapTxt.match(/entity\/Entity;func_70097_a/g) || []).length,
    },
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
    + ' cfgCode=' + ev.pin.cfgCodeKeys + '/file=' + ev.pin.cfgFileKeys
    + ' owner=' + JSON.stringify(ev.pin.refmapOwnerCheck));

  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ===================== boot 1 ===================== */
  try {
    await startBoot(1, { needs: true });
    ev.arms.R0b = {
      boot: ev.boots[0], pin: ev.pin,
      cfg: (() => { const k = L.cfgKeys(L.CFG); return {
        needs: k.livestockNeedsR196, production: k.livestockProductionR196,
        farm: k.farmDebugLog, mob: k.mobDebugLog, damage: k.damageDebugLog }; })(),
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
      mixinExport: mixinExportCheck(),
    };
    log('R0b-export', JSON.stringify(ev.arms.R0b.mixinExport));
    await buildPen();
    ev.arms.R1b = await armR1b();
    ev.arms.R4b = await armR4b();
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
    ev.arms.R6b = await armR6b();
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
