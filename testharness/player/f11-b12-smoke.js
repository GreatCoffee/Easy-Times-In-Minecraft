#!/usr/bin/env node
/**
 * f11-b12-smoke.js — B-12 (mate breeding chain) first smoke test.
 * Boot-1 points (mirror of f11-b11's boot1 shape, fresh world w-b12a):
 *   R1  spawn face: two fresh cows wheat-fed (b2 hand-feed seat) go inLove,
 *       EntityAIMate arms the 60-tick spawn; the child lands with
 *       [FarmLog] breed src=adopt (per-need min) + parents Age ~16000
 *       + child Age ~-64000.
 *   R2  cauldron lock: child in a cauldron with a blocked head cell keeps
 *       Age frozen (3 dumps).
 *   R3  desperate lock: child food<0.05 keeps Age frozen (3 dumps) +
 *       [FarmLog] agegate src=desperate row.
 * Boot-2 flag face and spawn-egg/egg faces ride the judged window and are
 * NOT part of this first smoke (f11-b12-verify).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f11-b12-smoke';
const WORLD = 'w-b12a';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const COW1 = { x: 300.5, z: 851.5 };
const COW2 = { x: 303.5, z: 853.5 };
const HUB = { x: PEN.x + 6.5, z: PEN.z + 6.5 };
const CAULDRON_SPOT = { x: 299, z: 849 };
const DESP_CHILD = { x: 302, z: 850 };

const sleep = L.sleep;
const log = L.log;
let srv = null, bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], arms: {} };
const since = (n) => srv.all.slice(n).map(L.strip);

const boxAt = (type, x0, y0, z0, dx, dy, dz) =>
  `@e[type=${type},x=${Math.floor(x0)},y=${Math.floor(y0)},z=${Math.floor(z0)},dx=${Math.ceil(dx)},dy=${Math.ceil(dy)},dz=${Math.ceil(dz)}]`;
const boxKill = (type, x0, y0, z0, dx, dy, dz) => `kill ${boxAt(type, x0, y0, z0, dx, dy, dz)}`;
const cowBox = () => boxAt('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14);

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }

async function nbtDump(sel, wait) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(wait === undefined ? 900 : wait);
  const rows = since(from);
  const out = [];
  for (const l of rows) {
    if (!/\{.*\}/.test(l)) continue;
    const o = {};
    const h = /[,{]Health:([\d.]+)f/.exec(l); if (h) o.health = h[1];
    const il = /,InLove:(-?\d+)/.exec(l); if (il) o.inLove = il[1];
    const ag = /(?:^|[,{])Age:(-?\d+)/.exec(l); if (ag) o.age = ag[1];
    const pos = /Pos:\[([^\]]+)\]/.exec(l);
    if (pos) o.pos = pos[1].split(',').map((s) => Math.round(parseFloat(s))).join(',');
    // ForgeCaps cope.food — the wellness-recovery probe (desperate hold check)
    const fd = /,food:([-\d.]+)f/.exec(l); if (fd) o.food = parseFloat(fd[1]);
    const wt = /,water:([-\d.]+)f/.exec(l); if (wt) o.water = parseFloat(wt[1]);
    out.push(o);
  }
  return { rows: out, all: rows };
}

function hostNear(name, spot, rad) {
  const p = bot.entity && bot.entity.position;
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === name && e.position
      && Math.abs(e.position.x - spot.x) <= (rad || 3) && Math.abs(e.position.z - spot.z) <= (rad || 3))
    .sort((a, b) => (Math.hypot(a.position.x - spot.x, a.position.z - spot.z)
      - Math.hypot(b.position.x - spot.x, b.position.z - spot.z))
      // tiebreak: nearest reach for the bot's hand
      || (p ? a.position.distanceTo(p) - b.position.distanceTo(p) : 0))[0];
}

async function freshCow(spot, extra, noKill) {
  const s = spot || COW1;
  if (!noKill) {
    srv.send(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 6, 14));
    srv.send(boxKill('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14));
    await sleep(900);
  }
  srv.send(`summon minecraft:cow ${s.x} ${TY + 1} ${s.z} ${extra || ''}`);
  await sleep(2000);
  const c = hostNear('cow', s, 3);
  if (!c) throw new Error('fresh cow missing at ' + s.x + ',' + s.z);
  return c;
}

async function standBy(e, opts) {
  const o = opts || {};
  await L.tp(srv, e.position.x + 1.1, e.position.y, e.position.z + 1.0, { bot: A, wait: 900 });
  const cur = Object.values(bot.entities || {}).find((x) => x && x.id === e.id && x.position
    && x.position.distanceTo(bot.entity.position) < 3.4);
  if (!cur) throw new Error('host out of reach after standby');
  if (o.look !== false) {
    try {
      bot.physicsEnabled = true;
      const Vec3 = require('vec3').Vec3;
      await bot.lookAt(new Vec3(cur.position.x, cur.position.y + (cur.height || 1.4) * 0.5, cur.position.z), true);
      await sleep(650);
    } catch (e2) { log('look', (e2 && e2.message) || e2); }
    try { bot.physicsEnabled = false; } catch (e2) { /* noop */ }
  }
  return cur;
}
async function hub() { await L.tp(srv, HUB.x, TY + 1, HUB.z, { bot: A, wait: 500 }); }
async function seed(toks, rad) { srv.send(`etest prod ${A} ${rad || 10} ${toks}`); await sleep(800); }

/* egg bench: open dirt inside the pen for projectile impact */
const EGGBENCH = { x: 304.5, z: 850.5 };

/** Server-truth pitch sign probe: 1.12 selectors accept pitch ranges, so
 * testfor the bot against a positive (looking-UP) notchian range. Notchian
 * pitch is positive-DOWN, so a hit means the server thinks we look up. */
async function serverLooksUp() {
  const from = srv.all.length;
  srv.send(`execute ${A} ~ ~ ~ testfor @s[pitch=-40..40]`);
  await sleep(600);
  const rows = since(from);
  return rows.some((l) => l.includes('Found') && !l.includes('Could not find'));
}

/** R196 egg face probe — point-blank lobs at the pen floor by the wall:
 * cells inside the arena can't miss in either pitch convention, and the
 * hatched chick stays inside the dump box (vanilla spawn odds
 * (8+rand(32))/256 per egg ≈ 3-16%, so throw up to 96). Flag ON = each
 * newborn writes -64000 (F-C(1)), flag OFF = vanilla -24000. */
async function hatchEggs() {
  const Vec3 = require('vec3').Vec3;
  await hub();
  let throwsDone = 0;
  let leftovers = -1;
  const flipped = !(await serverLooksUp()); // true = mineflayer↔server pitch sign flipped
  const target = new Vec3(EGGBENCH.x, TY + 0.1, EGGBENCH.z);
  const findEgg = () => bot.inventory.items().find((x) => x.name === 'egg' || x.name === 'minecraft:egg');
  try {
    bot.physicsEnabled = true;
    for (let i = 0; i < 96; i++) {
      let it = findEgg();
      if (!it) {
        // egg stacks cap at 16 — top up one stack at a time
        await cmd(`give ${A} minecraft:egg 16`, 700);
        it = findEgg();
        if (!it) { break; }
      }
      await bot.equip(it, 'hand');
      if (flipped) {
        // mirror the vertical component manually (force writes instantly)
        const eye = bot.entity.position.offset(0, bot.entity.eyeHeight, 0);
        const delta = target.minus(eye);
        const yaw = Math.atan2(-delta.x, -delta.z);
        const pitch = Math.atan2(-delta.y, Math.sqrt(delta.x * delta.x + delta.z * delta.z));
        await bot.look(yaw, pitch, true);
      } else {
        await bot.lookAt(target, true);
      }
      await sleep(150);
      await bot.activateItem();
      throwsDone += 1;
      await sleep(1600);
    }
    leftovers = bot.inventory.items().filter((x) => x.name === 'egg').reduce((s, x) => s + x.count, 0);
  } finally {
    try { bot.physicsEnabled = false; } catch (e2) { /* noop */ }
  }
  const dump = await nbtDump(boxAt('chicken', EGGBENCH.x, TY - 2, EGGBENCH.z, 7, 9, 7), 1500);
  const ages = dump.rows.map((r) => Number(r.age)).filter((a) => !isNaN(a));
  return { throws: throwsDone, leftovers, flipped, chickCount: dump.rows.length, ages, rows: dump.rows };
}

/** hand-feed one wheat to the cow at spot (b2 instant-breed seat, gamemode0). */
async function handFeedOne(spot, label) {
  const c = hostNear('cow', spot, 4) || await freshCow(spot);
  // pre-seed: a fresh cow sits at full health and the R196 willEat gate
  // (:413 full-health && !well && !hungry -> false) blocks the feed -> love
  // arm. Drop food and hp first so the hand-feed serve can fire.
  await seed('food=0.45 water=0.5 hp=5.0', 6);
  let serveRows = [];
  for (let i = 0; i < 3 && !serveRows.length; i++) {
    const face = await standBy(c);
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:wheat 1`, 700);
    const it = bot.inventory.items().find((i2) => i2.name === 'wheat' || i2.name === 'minecraft:wheat');
    if (!it) throw new Error('no wheat in hand ' + label);
    await bot.equip(it, 'hand'); await sleep(350);
    await cmd(`gamemode 0 ${A}`, 700);
    const from = srv.all.length;
    await bot.activateEntity(hostNear('cow', spot, 8) || face);
    await sleep(1400);
    serveRows = since(from).filter((l) => /food src=cow serve/.test(l));
    await cmd(`gamemode 1 ${A}`, 500);
    if (!serveRows.length) log('feed' + label, 'attempt ' + (i + 1) + ' no serve, retrying');
  }
  log('feed' + label, 'serve=' + serveRows.length + ' ' + (serveRows[0] || '').slice(0, 150));
  return { serveRows };
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
  log('pen', 'inWall=' + wallRows.length);
  if (wallRows.length) throw new Error('pen animal suffocating (inWall)');
}

async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'livestockNeedsR196', o.needs === false ? 'false' : 'true');
  L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', o.flags === false ? 'false' : 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', o.flags === false ? 'false' : 'true');
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n });
  if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b' + n);
  const b = {
    n,
    boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
    mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
  };
  ev.boots.push(b);
  log('boot' + n, b.boot + ' mixinFail=' + b.mixinFail);
  bot = await L.joinBot(srv, A);
  try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
  return b;
}

async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const st = await srv.stop();
  const rec = { n, exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) };
  ev.stops = ev.stops || []; ev.stops.push(rec);
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + rec.build);
  srv = null;
  return rec;
}

async function ageFrozen3(sel, totalWaitMs, dumpEvery) {
  const head = await nbtDump(sel, 1000);
  const a0 = head.rows.length ? Number(head.rows[0].age) : null;
  await sleep(totalWaitMs);
  let tail = await nbtDump(sel, 1000);
  if (!tail.rows.length) {
    // one retry with a widened box — the child can drift out of a tight box
    const wide = boxAt('cow', PEN.x, TY - 2, PEN.z, 20, 9, 20);
    tail = await nbtDump(wide, 1100);
  }
  const a1 = tail.rows.length ? Number(tail.rows[0].age) : null;
  return { a0, a1, withheld: (a0 !== null && a1 !== null ? a1 - a0 : null), rows: head.rows[0], tailRows: tail.rows[0] };
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { sha: L.sha256(cfgBefore) };
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  const propsBefore = fs.readFileSync(L.PROPS);
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  /* boot 1 */
  await startBoot(1, { needs: true, flags: true });
  try {
    await buildPen();

    /* ---------- R1 spawn face ---------- */
    ev.arms.R1 = {};
    await hub();
    await freshCow(COW1);
    // noKill: the box kill would erase cow1 — both must be alive to mate
    await freshCow(COW2, '', true);
    await handFeedOne(COW1, 'cow1');
    await handFeedOne(COW2, 'cow2');
    const from = srv.all.length;
    await sleep(14000);
    const spawnRows = since(from);
    ev.arms.R1.spawnRows = spawnRows.filter((l) => /\[FarmLog\] breed src=adopt/.test(l));
    ev.arms.R1.denyRows = spawnRows.filter((l) => /\[FarmLog\] agegate src=desperate/.test(l)).length;
    ev.arms.R1.loveRows = spawnRows.filter((l) => /\[AILog\] livestock.*hungry|thirsty/.test(l)).length;
    ev.arms.R1.adoptEcho = (ev.arms.R1.spawnRows[0] || '').slice(0, 200);
    log('R1 adopt', 'rows=' + ev.arms.R1.spawnRows.length);
    const parents = await nbtDump(cowBox(), 1400);
    ev.arms.R1.parents = parents.rows.filter((r) => r.age !== undefined).map((r) => r.age);
    const childSel = boxAt('cow', COW1.x, TY - 1, COW1.z, 16, 8, 16);
    const allCows = parents.rows.map((r) => ({ age: r.age, pos: r.pos }));
    ev.arms.R1.ages = allCows.map((c) => c.age);
    ev.arms.R1.childAge = ev.arms.R1.ages.filter((a) => a <= -60000);
    ev.arms.R1.parentAge = ev.arms.R1.ages.filter((a) => a > 1000);
    log('R1 ages', JSON.stringify(ev.arms.R1.ages));

    /* ---------- R2 cauldron lock ---------- */
    ev.arms.R2 = {};
    await hub();
    await cmd(boxKill('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14), 700);
    // well: cauldron at (CX, TY+1, CZ), head cell (TY+2) capped with cobble.
    // 1.12 cauldron collision = walls + legs, cavity open -> a child standing
    // inside has floor(posY)=TY+1 == the cauldron block (R196 :36-38 shape);
    // TY+2 solid head caps it without suffocating (child AABB tops at ~101.7).
    // Age:-60 so the grow-to-0 write lands inside this window — R196's gate
    /// keys on par1 >= 0 (:36); from -64000 that is 53 minutes away.
    await cmd(`fill ${CAULDRON_SPOT.x} ${TY + 1} ${CAULDRON_SPOT.z} ${CAULDRON_SPOT.x} ${TY + 1} ${CAULDRON_SPOT.z} minecraft:cauldron 0`, 500);
    await cmd(`fill ${CAULDRON_SPOT.x} ${TY + 2} ${CAULDRON_SPOT.z} ${CAULDRON_SPOT.x} ${TY + 2} ${CAULDRON_SPOT.z} minecraft:cobblestone 0`, 500);
    // Invulnerable: a child standing in a cauldron block takes vanilla inWall
    // 1.0/tick (i-framed) and dies in ~5.5s — b12-smoke R3 round certified it.
    // The verdict reads the AGE write, not health, so freeze the damage only.
    await cmd(`summon minecraft:cow ${CAULDRON_SPOT.x + 0.5} ${TY + 1.05} ${CAULDRON_SPOT.z + 0.5} {Age:-60,Invulnerable:1b,PersistenceRequired:1b}`, 4300);
    const r2sel = boxAt('cow', CAULDRON_SPOT.x, TY, CAULDRON_SPOT.z, 2, 5, 2);
    const calChild = await nbtDump(r2sel, 1300);
    ev.arms.R2.spawn = calChild.rows[0];
    const frozen1 = await ageFrozen3(r2sel, 7000, 3000);
    ev.arms.R2.frozen = frozen1;
    const r2cancels = srv.all.filter((l) => L.strip(l).includes('agegate src=cauldron cancel')).length;
    ev.arms.R2.cancelRows = r2cancels;
    log('R2 cauldron', 'age0=' + frozen1.a0 + ' age1=' + frozen1.a1 + ' delta=' + frozen1.withheld
      + ' cancels=' + r2cancels + ' food=' + (frozen1.rows && frozen1.rows.food));

    /* ---------- R3 desperate lock ---------- */
    ev.arms.R3 = {};
    await hub();
    await cmd(`fill ${CAULDRON_SPOT.x} ${TY + 1} ${CAULDRON_SPOT.z} ${CAULDRON_SPOT.x} ${TY + 1} ${CAULDRON_SPOT.z} minecraft:air 0`, 400);
    await cmd(`fill ${CAULDRON_SPOT.x} ${TY + 2} ${CAULDRON_SPOT.z} ${CAULDRON_SPOT.x} ${TY + 2} ${CAULDRON_SPOT.z} minecraft:air 0`, 400);
    const df = await freshCow(DESP_CHILD, '{Age:-64000,PersistenceRequired:1b}');
    const dfrom = srv.all.length;
    const dsel = boxAt('cow', DESP_CHILD.x, TY - 2, DESP_CHILD.z, 5, 8, 5);
    // In-interval probe: the cancel-row field probe is the freeze verdict.
    // Every cancel row prints e.getGrowingAge() at the cancel; rows grouped
    // by that value are the lock windows — a window of >= 10 rows at an
    // IDENTICAL age is >= 0.5s of held growth inside a desperate interval,
    // while the differences BETWEEN consecutive window anchors are the
    // vanilla growth of the unlocked gaps (wellness recovery flips food
    // back over 0.05 in roughly 2s). NBT dumps stay as auxiliary witnesses.
    let shot = null;
    const attempts = [];
    for (let i = 0; i < 4 && !shot; i++) {
      await seed('food=0.04 water=1.0', 8);
      await sleep(700);
      const dA = await nbtDump(dsel, 1000);
      const A = dA.rows[0] || {};
      await sleep(1600);
      const dB = await nbtDump(dsel, 1000);
      const B = dB.rows[0] || {};
      attempts.push({ a0: A.age, a1: B.age, f0: A.food, f1: B.food });
      if (A.food < 0.05 && B.food < 0.05) shot = attempts[attempts.length - 1];
    }
    ev.arms.R3.attempts = attempts;
    const cancelRows = since(dfrom).filter((l) => /\[FarmLog\] agegate src=desperate cancel/.test(l));
    const byAge = {};
    cancelRows.forEach((l) => {
      const m = /age=(-\d+)/.exec(l);
      if (m) { (byAge[m[1]] = byAge[m[1]] || []).push(m[1]); }
    });
    const windows = Object.keys(byAge).map((k) => ({ age: Number(k), rows: byAge[k].length }))
      .sort((a, b) => b.age - a.age);
    ev.arms.R3.windows = windows;
    const held = windows.filter((w) => w.rows >= 10).length;
    const anchors = windows.map((w) => w.age);
    const gaps = [];
    for (let i = 1; i < anchors.length; i++) { gaps.push(anchors[i - 1] - anchors[i]); }
    ev.arms.R3.gapGrowth = gaps;
    ev.arms.R3.heldWindows = held;
    const a0 = shot ? shot.a0 : null;
    const a1 = shot ? shot.a1 : (windows.length ? windows[windows.length - 1].age : null);
    const f0 = shot ? shot.f0 : null;
    const f1 = shot ? shot.f1 : null;
    ev.arms.R3.agegate = since(dfrom).filter((l) => /\[FarmLog\] agegate src=desperate/.test(l));
    ev.arms.R3.cancelRows = cancelRows.length;
    ev.arms.R3.frozen = {
      a0, a1,
      withheld: (a0 !== null && a1 !== null ? a1 - a0 : null),
      heldWindows: held,
      gapGrowth: gaps,
    };
    ev.arms.R3.agegateEcho = (ev.arms.R3.agegate[0] || '').slice(0, 200);
    log('R3 desperate', 'rows=' + ev.arms.R3.agegate.length + ' cancels=' + ev.arms.R3.cancelRows
      + ' heldWindows=' + held + ' gapGrowth=' + gaps.join('/')
      + ' age0=' + a0 + ' age1=' + a1 + ' food0=' + f0 + ' food1=' + f1);

    /* ---------- R4 egg throw (F-C) ---------- */
    ev.arms.R4 = {};
    await hub();
    await cmd(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 6, 14), 500);
    await cmd(boxKill('chicken', PEN.x, TY - 1, PEN.z, 14, 7, 14), 700);
    const egg1 = await hatchEggs();
    ev.arms.R4 = { throws: egg1.throws, leftovers: egg1.leftovers, chickCount: egg1.chickCount, ages: egg1.ages };
    log('R4 egg', 'throws=' + egg1.throws + ' chicks=' + egg1.chickCount + ' ages=' + JSON.stringify(egg1.ages));

    /* ---------- R5 spawn egg (F-B(2)) ---------- */
    ev.arms.R5 = {};
    await hub();
    await cmd(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 6, 14), 500);
    await cmd(boxKill('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14), 700);
    await cmd(`summon minecraft:cow ${COW1.x} ${TY + 1} ${COW1.z}`, 2200);
    await cmd(`give ${A} minecraft:spawn_egg 1 0 {EntityTag:{id:"minecraft:cow"}}`, 900);
    const se = bot.inventory.items().find((i) => (i.name || '').includes('spawn_egg'));
    if (se) {
      await bot.equip(se, 'hand'); await sleep(350);
      const seCow = await standBy(hostNear('cow', COW1, 4));
      const seFrom = srv.all.length;
      await bot.activateEntity(hostNear('cow', COW1, 8) || seCow);
      await sleep(2600);
      const seRows = (await nbtDump(boxAt('cow', COW1.x, TY - 2, COW1.z, 6, 8, 6), 1200)).rows
        .filter((r) => Number(r.age) <= -60000);
      ev.arms.R5.childRows = seRows;
      log('R5 spawnegg', 'children=' + seRows.length + ' age=' + (seRows[0] ? seRows[0].age : 'none'));
    } else {
      ev.arms.R5.childRows = [];
      log('R5 spawnegg', 'spawn egg item missing in inventory');
    }
  } finally {
    await stopBoot(1);
  }

  /* ---------- boot 2 (needs=false): R6 flag-off vanilla regression ---------- */
  await startBoot(2, { needs: false, flags: true });
  try {
    await buildPen();
    ev.arms.R6 = await hatchEggs();
    ev.arms.R6.verdict = ev.arms.R6.ages.length
      && ev.arms.R6.ages.every((a) => a > -60000);
    log('R6 flagoff-egg', 'throws=' + ev.arms.R6.throws + ' chicks=' + ev.arms.R6.chickCount
      + ' ages=' + JSON.stringify(ev.arms.R6.ages) + ' vanillaAge=' + ev.arms.R6.verdict);
  } finally {
    await stopBoot(2);
  }

  /* restore the props/cfg snapshot so later windows start from the same fig */
  try {
    fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
    fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  } catch (e2) { /* noop */ }

  fs.writeFileSync(path.join(L.OUT, TAG + '.json'), JSON.stringify(ev, null, 2), 'utf8');
  log('done', 'smoke written, boots=' + ev.boots.length);
}

main().catch((e) => {
  console.error('[' + TAG + '] FATAL', e);
  process.exitCode = 1;
});
