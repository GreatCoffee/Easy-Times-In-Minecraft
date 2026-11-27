#!/usr/bin/env node
/**
 * f11-b11-verify.js — W-B11 judged window (animal food pickup / EntityAIMoveToFoodItem
 * family, HEAD 275c5bc).
 *
 *   R0  boot face (Done, mixinFail 0, mixins 77+10, refmap 81/176 both trees, cfg 245)
 *   R1  walk arm + eat serve (natural AI): foodseek start row + foodground serve add=0.5
 *       + ground item 1 -> gone (bounded retry when a wellness pass pushes food over
 *       the hungry half of the family gate)
 *   R2  family-gate deny: deny cause=family_gate + item survives + zero serve + zero
 *       vanilla instant-breed face (InLove 0, cow count flat)
 *   R3  cooldown: natural eat seeds cd=400; the next wheat is NOT eaten during the
 *       countdown; etest ground=401 gives exactly ONE serve; after expiry the next
 *       wheat is eaten again
 *   R3b love arm: full health + well + hungry seed -> ground=401 -> exactly one serve
 *       love=true + live NBT InLove>0
 *   R4  non-food scan: stone in the pickup box opens zero foodground/foodseek rows
 *   R5  ground stack: Count=3 wheat -> one serve, pile Count 2, Age=-18000 (despawn
 *       freeze)
 *   R6  child gate: Age:-24000 calf -> deny cause=child + item survives + Age only
 *       natural +1/tick (no vanilla ageUp +120)
 *   R7  zero regression: hand-feed serve + hand family-gate deny + milk serve/deny
 *       + egg pump
 *   R8  flag face (boot 2, livestockNeedsR196=false): no foodseek / no foodground
 *       rows at all; hand-feed + water keep the production-flag ETIM rows
 *   R9  closure: flags restored, cfg hash same, world removed, port 0, no JVM
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f11-b11-verify';
const WORLD = 'w-b11a';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const COW = { x: 300.5, z: 851.5 };
const BABY = { x: 306.5, z: 855.5 };
const FAR = { x: 305.9, z: 849.9 };      // 5.63 from the cow spot
const HUB = { x: PEN.x + 6.5, z: PEN.z + 6.5 };

const sleep = L.sleep;
const log = L.log;
let srv = null, bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], stops: [], arms: {} };
const since = (n) => srv.all.slice(n).map(L.strip);

function countCodeKeys() {
  const s = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java'), 'utf8');
  const re = /config\.get(?:Boolean|Int|Float|String)\s*\(\s*"([A-Za-z0-9_]+)"/g;
  const set = new Set(); let m;
  while ((m = re.exec(s))) set.add(m[1]);
  return set.size;
}
const boxAt = (type, x0, y0, z0, dx, dy, dz) =>
  `@e[type=${type},x=${Math.floor(x0)},y=${Math.floor(y0)},z=${Math.floor(z0)},dx=${Math.ceil(dx)},dy=${Math.ceil(dy)},dz=${Math.ceil(dz)}]`;
const boxKill = (type, x0, y0, z0, dx, dy, dz) => `kill ${boxAt(type, x0, y0, z0, dx, dy, dz)}`;

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }
async function invCount(item, wait) {
  const from = srv.all.length;
  srv.send(`clear ${A} minecraft:${item} -1 0`);
  await sleep(wait === undefined ? 450 : wait);
  const rows = since(from).join(' | ');
  const m = /has (\d+) items? that match/.exec(rows);
  return m ? Number(m[1]) : (/no items to remove|no items were found/i.test(rows) ? 0 : null);
}
/** live NBT dump: /execute <sel> ~ ~ ~ entitydata @e[r=0,c=1] {} prints the full NBT. */
async function nbtDump(sel, wait) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(wait === undefined ? 900 : wait);
  const rows = since(from);
  const out = [];
  let foundNothing = false;
  for (const l of rows) {
    if (/found nothing/i.test(l)) foundNothing = true;
    if (!/\{.*\}/.test(l)) continue;
    const o = {};
    const live = /"etim:livestock":\{([^}]*)\}/.exec(l);
    if (live) {
      for (const part of live[1].split(',')) { const i = part.indexOf(':'); if (i > 0) o[part.slice(0, i)] = part.slice(i + 1); }
    }
    const h = /[,{]Health:([\d.]+)f/.exec(l); if (h) o.health = h[1];
    const il = /,InLove:(-?\d+)/.exec(l); if (il) o.inLove = il[1];
    const ag = /(?:^|[,{])Age:(-?\d+)/.exec(l); if (ag) o.age = ag[1];
    const it = /Item:\{id:"([^"]+)",Count:(\d+)b/.exec(l);
    if (it) { o.itemId = it[1]; o.count = Number(it[2]); }
    const pos = /Pos:\[([^\]]+)\]/.exec(l);
    if (pos) o.pos = pos[1].split(',').map((s) => Math.round(parseFloat(s))).join(',');
    out.push(o);
  }
  return { rows: out, foundNothing, all: rows };
}
const itemBox = (x, z, r) => boxAt('item', x - (r || 2), TY - 1, z - (r || 2), (r || 2) * 2 + 1, 6, (r || 2) * 2 + 1);
const cowBox = (x, z, r) => boxAt('cow', x - (r || 2), TY - 1, z - (r || 2), (r || 2) * 2 + 1, 6, (r || 2) * 2 + 1);
const pick = (need) => bot.inventory.items().find((i) => i.name === need || i.name === 'minecraft:' + need);

function hostNear(name, spot, rad) {
  const p = bot.entity && bot.entity.position;
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === name && e.position
      && Math.abs(e.position.x - spot.x) <= (rad || 3) && Math.abs(e.position.z - spot.z) <= (rad || 3))
    .sort((a, b) => (p ? a.position.distanceTo(p) - b.position.distanceTo(p) : 0))[0];
}
async function standBy(e, opts) {
  const o = opts || {};
  await L.tp(srv, e.position.x + 1.1, e.position.y, e.position.z + 1.0, { bot: A, wait: 900 });
  const cur = Object.values(bot.entities || {}).find((x) => x && x.id === e.id && x.position
    && x.position.distanceTo(bot.entity.position) < 3.4);
  if (!cur) throw new Error('host out of reach after standby');
  if (o.look !== false) {
    try {
      bot.physicsEnabled = true;   // the look packet only rides the physics tick
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
async function killGround() { srv.send(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 6, 14)); await sleep(600); }
async function freshCow(spot) {
  const s = spot || COW;
  srv.send(boxKill('item', PEN.x, TY - 1, PEN.z, 14, 6, 14));   // leftovers first: a fresh cow must not inherit an eat (cd + inLove)
  srv.send(boxKill('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14));    // pen-wide: a walked-away cow must not survive
  await sleep(900);
  srv.send(`summon minecraft:cow ${s.x} ${TY + 1} ${s.z}`);
  await sleep(2000);
  const c = hostNear('cow', s, 3);
  if (!c) throw new Error('fresh cow missing at ' + s.x + ',' + s.z);
  return c;
}
async function dropItem(item, x, z, count, wait) {
  srv.send(`summon minecraft:item ${x} ${TY + 1} ${z} {Item:{id:"${item}",Count:${count || 1}b}}`);
  await sleep(wait === undefined ? 700 : wait);
}
const cowCount = () => Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow'
  && e.position && Math.abs(e.position.x - HUB.x) < 8 && Math.abs(e.position.z - HUB.z) < 8).length;
const PENCOW = () => boxAt('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14);
/** the pen cow roams once its path ends — anchor it so a point-blank drop stays in the pickup box. */
async function anchorCow(spot, wait) {
  const s = spot || COW;
  srv.send(`tp ${PENCOW()} ${s.x} ${TY + 1} ${s.z}`);
  await sleep(wait === undefined ? 450 : wait);
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
  srv.send(`summon minecraft:cow ${COW.x} ${TY + 1} ${COW.z}`);
  await sleep(2500);
  const wallRows = since(guardFrom).filter((l) => /inWall/.test(l));
  ev.pen = { inWallRows: wallRows.length, sample: wallRows.slice(0, 2) };
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
  log('boot' + n, b.boot + ' mixin=' + b.mixinFail);
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

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith('275c5bc');
  ev.pins = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const kb = L.cfgKeys(L.CFG);
  ev.cfgBefore = {
    bytes: cfgBefore.length, sha: L.sha256(cfgBefore), fileKeys: Object.keys(kb).length, codeKeys: countCodeKeys(),
    values: { livestockNeedsR196: kb.livestockNeedsR196, livestockProductionR196: kb.livestockProductionR196, farmDebugLog: kb.farmDebugLog, mobDebugLog: kb.mobDebugLog },
  };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',')
    + ' mk=' + ev.mk.ok + ' cfgCode=' + ev.cfgBefore.codeKeys + ' cfgFile=' + ev.cfgBefore.fileKeys);

  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ======================= boot 1 ======================= */
  await startBoot(1, { needs: true, flags: true });
  try {
    ev.arms.R0 = {
      boot: ev.boots[0], mk: ev.mk,
      cfg: { needs: L.cfgKeys(L.CFG).livestockNeedsR196, production: L.cfgKeys(L.CFG).livestockProductionR196, farm: L.cfgKeys(L.CFG).farmDebugLog, mob: L.cfgKeys(L.CFG).mobDebugLog },
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    };
    await buildPen();

    /* ---------------- R1 walk arm + eat serve ---------------- */
    ev.arms.R1 = { attempts: [] };
    for (let attempt = 1; attempt <= 2; attempt++) {
      await hub();
      if (attempt > 1) await freshCow(COW);
      await killGround();
      await seed(`water=0.0 food=${attempt === 1 ? '0.3' : '0.1'} hp=10.0`, 10);
      const from = srv.all.length;
      const itemFrom = srv.all.length;
      await dropItem('minecraft:wheat', FAR.x, FAR.z, 1, 700);
      const pre = await nbtDump(itemBox(FAR.x, FAR.z, 2));
      let seek = null, serve = null; const nav = []; const track = [];
      const deadline = Date.now() + (attempt === 1 ? 22000 : 30000);
      let probeTick = 0;
      while (Date.now() < deadline) {
        await sleep(1800);
        const rows = since(from);
        seek = seek || rows.find((l) => /foodseek src=cow start/.test(l)) || null;
        serve = rows.find((l) => /foodground src=cow serve/.test(l)) || null;
        const cow = hostNear('cow', COW, 6);
        if (cow && cow.position) track.push(cow.position.x.toFixed(1) + ',' + cow.position.z.toFixed(1));
        if (probeTick < 3 && !serve) {
          probeTick++;
          srv.send(`etest prod ${A} 8 probe=1`);
          await sleep(800);
          nav.push(...since(itemFrom).filter((l) => /navprobe/.test(l)).slice(-1));
        }
        if (serve) break;
      }
      const post = await nbtDump(itemBox(FAR.x, FAR.z, 2));
      ev.arms.R1.attempts.push({
        attempt, seedFood: attempt === 1 ? 0.3 : 0.1,
        preCounts: pre.rows.map((r) => r.count), preFoundNothing: pre.foundNothing,
        seek, serve, nav: nav.map((l) => l.slice(0, 220)),
        track: track.filter((v, i, a) => i === 0 || v !== a[i - 1]),
        postFoundNothing: post.foundNothing, postCounts: post.rows.map((r) => r.count),
        rows: since(from).filter((l) => /foodground|foodseek/.test(l)).slice(0, 6),
      });
      log('R1-' + attempt, JSON.stringify({ seek: !!seek, serve: (serve || '').slice(0, 200), pre: pre.rows.map((r) => r.count), post: post.foundNothing ? 'gone' : post.rows.map((r) => r.count) }));
      if (serve) break;
    }

    /* ---------------- R2 family-gate deny ---------------- */
    await hub();
    const cow2 = await freshCow(COW);
    await killGround();
    await seed('water=0.2 food=1.0 hp=10.0', 10);
    const cowN0 = cowCount();
    const from2 = srv.all.length;
    await anchorCow(COW);
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 600);
    let r2item = null;
    for (let i = 0; i < 5; i++) { await anchorCow(COW, 200); await sleep(4600); r2item = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2)); }
    const rows2 = since(from2);
    const cow2dump = await nbtDump(cowBox(COW.x, COW.z, 2));
    ev.arms.R2 = {
      deny: rows2.filter((l) => /foodground src=cow deny/.test(l)).slice(0, 4),
      serveRows: rows2.filter((l) => /foodground src=cow serve/.test(l)).length,
      seekRows: rows2.filter((l) => /foodseek/.test(l)).length,
      itemFoundNothing: r2item.foundNothing, itemCounts: r2item.rows.map((r) => r.count),
      inLove: cow2dump.rows.map((r) => r.inLove), cowCountBefore: cowN0, cowCountAfter: cowCount(),
      hostId: cow2.id,
    };
    log('R2', JSON.stringify({ deny: ev.arms.R2.deny.slice(0, 2), serve: ev.arms.R2.serveRows, seek: ev.arms.R2.seekRows, item: ev.arms.R2.itemCounts, inLove: ev.arms.R2.inLove, cows: [cowN0, cowCount()] }));

    /* ---------------- R3 cooldown face ----------------
       hp=5 for every step on purpose: a full-health eat in a well state would set
       inLove 600, which masks the cooldown for the next 30 s (canEat). Keeping the
       eater hurt isolates the ONLY blocking state to food_or_repair_item_pickup_cooldown. */
    await hub();
    await freshCow(COW);
    await killGround();
    await anchorCow(COW);
    await seed('water=1.0 food=0.3 hp=5.0', 10);
    const from3a = srv.all.length;
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 600);
    let r3a = null;
    for (let i = 0; i < 10; i++) { await sleep(700); r3a = since(from3a).find((l) => /foodground src=cow serve/.test(l)) || null; if (r3a) break; }
    // second wheat + forced 401 calls while cd>0 (the natural ticks cannot pre-empt)
    await seed('water=1.0 food=0.3 hp=5.0', 10);
    await anchorCow(COW, 250);
    const from3b = srv.all.length;
    srv.send(`summon minecraft:item ${COW.x + 0.6} ${TY + 1} ${COW.z + 0.6} {Item:{id:"minecraft:wheat",Count:1b}}`);
    srv.send(`etest prod ${A} 10 ground=401`);   // same console batch: the cow cannot walk off
    await sleep(2600);
    const r3forced = since(from3b);
    const r3item = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    // a fresh wheat parked under an anchored cow: 4 s of tick-by-tick opportunity
    // must NOT open while cd runs
    await seed('water=1.0 food=0.3 hp=5.0', 10);
    await anchorCow(COW, 250);
    const from3c = srv.all.length;
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 500);
    await anchorCow(COW, 250);
    await sleep(4000);
    const r3cool = since(from3c);
    const r3coolItem = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    // expiry: the same pile is eaten once the 400-tick countdown is done
    await sleep(12000);
    await anchorCow(COW, 250);
    await sleep(3500);
    const r3expire = since(from3c);
    ev.arms.R3 = {
      natural: r3a,
      forcedRows: r3forced.filter((l) => /foodground src=cow/.test(l)).slice(0, 6),
      forcedServeRows: r3forced.filter((l) => /foodground src=cow serve/.test(l)).length,
      forcedEcho: r3forced.find((l) => /\[FarmLog\] prod /.test(l)) || '',
      forcedItemGone: r3item.foundNothing,
      cooldownServeRows: r3cool.filter((l) => /foodground src=cow serve/.test(l)).length,
      cooldownItemCounts: r3coolItem.rows.map((r) => r.count),
      expiryServe: r3expire.find((l) => /foodground src=cow serve/.test(l)) || null,
      expiryAge: r3expire.filter((l) => /foodground src=cow serve/.test(l)).length,
    };
    log('R3', JSON.stringify({ natural: (r3a || '').slice(0, 150), forced: ev.arms.R3.forcedServeRows, gone: ev.arms.R3.forcedItemGone, cooldown: ev.arms.R3.cooldownServeRows, cooldownItem: ev.arms.R3.cooldownItemCounts, expiry: ev.arms.R3.expiryAge }));

    /* ---------------- R3b love arm ---------------- */
    await hub();
    await killGround();
    await seed('water=1.0 food=0.2 hp=10.0', 10);
    await anchorCow(COW, 250);
    const from3d = srv.all.length;
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 450);
    srv.send(`etest prod ${A} 10 ground=401`);
    await sleep(2400);
    const r3d = since(from3d);
    const r3ddump = await nbtDump(cowBox(COW.x, COW.z, 2));
    ev.arms.R3b = {
      serve: r3d.find((l) => /foodground src=cow serve/.test(l)) || null,
      serveRows: r3d.filter((l) => /foodground src=cow serve/.test(l)).length,
      inLove: r3ddump.rows.map((r) => r.inLove),
    };
    log('R3b', JSON.stringify({ serve: (ev.arms.R3b.serve || '').slice(0, 200), n: ev.arms.R3b.serveRows, inLove: ev.arms.R3b.inLove }));

    /* ---------------- R4 non-food stone ---------------- */
    await hub();
    await freshCow(COW);
    await killGround();
    await seed('water=1.0 food=0.3 hp=10.0', 10);
    await anchorCow(COW);
    const from4 = srv.all.length;
    await dropItem('minecraft:stone', COW.x + 0.6, COW.z + 0.6, 1, 600);
    await anchorCow(COW, 200); await sleep(3000);
    await anchorCow(COW, 200); await sleep(3000);
    const rows4 = since(from4);
    ev.arms.R4 = {
      stoneRows: rows4.filter((l) => /foodground|foodseek/.test(l) && /item=minecraft:stone/.test(l)),
      allGroundRows: rows4.filter((l) => /foodground|foodseek/.test(l)),
      seekRows: rows4.filter((l) => /foodseek/.test(l)).length,
    };
    log('R4', JSON.stringify({ stone: ev.arms.R4.stoneRows.length, total: ev.arms.R4.allGroundRows.length, seek: ev.arms.R4.seekRows }));

    /* ---------------- R5 ground stack shrink ---------------- */
    await hub();
    await freshCow(COW);
    await killGround();
    await seed('water=0.0 food=0.3 hp=10.0', 10);
    await anchorCow(COW);
    const PILE = { x: COW.x + 2.4, z: COW.z };
    const from5 = srv.all.length;
    await dropItem('minecraft:wheat', PILE.x, PILE.z, 3, 600);
    const pre5 = await nbtDump(itemBox(PILE.x, PILE.z, 2));
    srv.send(`tp ${PENCOW()} ${PILE.x} ${TY + 1} ${PILE.z}`);   // walk-on delivery: pile stays a 3-stack for the pre-dump
    await sleep(600);
    let r5serve = null;
    for (let i = 0; i < 10; i++) { await sleep(700); r5serve = since(from5).find((l) => /foodground src=cow serve/.test(l)) || null; if (r5serve) break; }
    const post5 = await nbtDump(itemBox(PILE.x, PILE.z, 2));
    ev.arms.R5 = {
      pre: pre5.rows, post: post5.rows, serve: r5serve,
      serveRows: since(from5).filter((l) => /foodground src=cow serve/.test(l)).length,
    };
    log('R5', JSON.stringify({ pre: pre5.rows, post: post5.rows, serve: (r5serve || '').slice(0, 170) }));

    /* ---------------- R6 child gate ---------------- */
    await hub();
    srv.send(boxKill('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14));
    await sleep(700);
    await killGround();
    srv.send(`summon minecraft:cow ${BABY.x} ${TY + 1} ${BABY.z} {Age:-24000}`);
    await sleep(1800);
    // water=0.3 keeps the family gate out of the way (well) so the deny cause can
    // only be the child half of canEat — immune to wellness food drift.
    await seed('water=0.3 food=0.2 hp=10.0', 10);
    await anchorCow(BABY, 300);
    const from6 = srv.all.length;
    await dropItem('minecraft:wheat', BABY.x + 0.6, BABY.z + 0.6, 1, 600);
    const ages = [];
    for (let i = 0; i < 4; i++) {
      const d = await nbtDump(cowBox(BABY.x, BABY.z, 2));
      ages.push(d.rows.map((r) => r.age));
      await anchorCow(BABY, 200);
      await sleep(3800);
    }
    const rows6 = since(from6);
    ev.arms.R6 = {
      deny: rows6.filter((l) => /foodground src=cow deny/.test(l)).slice(0, 3),
      serveRows: rows6.filter((l) => /foodground src=cow serve/.test(l)).length,
      seekRows: rows6.filter((l) => /foodseek/.test(l)).length,
      ages,
      item: (await nbtDump(itemBox(BABY.x + 0.6, BABY.z + 0.6, 2))).rows.map((r) => r.count),
    };
    log('R6', JSON.stringify({ deny: ev.arms.R6.deny.slice(0, 2), serve: ev.arms.R6.serveRows, seek: ev.arms.R6.seekRows, ages: ev.arms.R6.ages, item: ev.arms.R6.item }));

    /* ---------------- R7 zero regression ---------------- */
    await hub();
    srv.send(boxKill('cow', PEN.x, TY - 1, PEN.z, 14, 7, 14));
    await sleep(700);
    await killGround();
    ev.arms.R7 = {};
    // hand-feed serve
    const hc = await freshCow(COW);
    await seed('water=1.0 food=0.0 hp=2.0', 6);
    const hface = await standBy(hc);
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:wheat 1`, 700);
    const it7 = pick('wheat'); if (!it7) throw new Error('no wheat');
    await bot.equip(it7, 'hand'); await sleep(350);
    await cmd(`gamemode 0 ${A}`, 700);
    let f7 = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8) || hface);
    await sleep(1300);
    ev.arms.R7.handServe = since(f7).filter((l) => /food src=cow serve/.test(l));
    ev.arms.R7.handCount = await invCount('wheat');
    await cmd(`gamemode 1 ${A}`, 500);
    // hand family-gate deny
    await hub();
    const gc = await freshCow(COW);
    await seed('water=0.2 food=1.0 hp=10.0', 6);
    await standBy(gc);
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:wheat 1`, 700);
    const it7b = pick('wheat'); if (!it7b) throw new Error('no wheat');
    await bot.equip(it7b, 'hand'); await sleep(350);
    await cmd(`gamemode 0 ${A}`, 700);
    f7 = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8) || gc);
    await sleep(1300);
    ev.arms.R7.handDeny = since(f7).filter((l) => /food src=cow deny/.test(l));
    ev.arms.R7.denyWheat = await invCount('wheat');
    await cmd(`gamemode 1 ${A}`, 500);
    // milk serve / deny
    await seed('milk=100', 6);
    await standBy(hostNear('cow', COW, 8));
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:bucket 1`, 700);
    const bk = pick('bucket'); if (!bk) throw new Error('no bucket');
    await bot.equip(bk, 'hand'); await sleep(300);
    await cmd(`gamemode 0 ${A}`, 700);
    f7 = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8));
    await sleep(1200);
    ev.arms.R7.milkServe = since(f7).filter((l) => /milk src=cow/.test(l));
    await seed('milk=0', 6);
    await standBy(hostNear('cow', COW, 8));
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:bucket 1`, 700);
    const bk2 = pick('bucket'); if (!bk2) throw new Error('no bucket2');
    await bot.equip(bk2, 'hand'); await sleep(300);
    f7 = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8));
    await sleep(1200);
    ev.arms.R7.milkDeny = since(f7).filter((l) => /milk src=cow/.test(l));
    await cmd(`gamemode 1 ${A}`, 500);
    // egg pump
    srv.send(`summon minecraft:chicken ${PEN.x + 5.5} ${TY + 1} ${PEN.z + 3.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${PEN.x + 5.5} ${TY + 1} ${PEN.z + 6.5} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(1800);
    await hub();
    f7 = srv.all.length;
    srv.send(`etest prod ${A} 8 counter=200 step=600`);
    await sleep(2200);
    ev.arms.R7.egg = since(f7).filter((l) => /\[AILog\] production .*kind=egg/.test(l));
    ev.arms.R7.eggEcho = since(f7).find((l) => /\[FarmLog\] prod /.test(l)) || '';
    log('R7', JSON.stringify({
      handServe: (ev.arms.R7.handServe[0] || '').slice(0, 170), handCount: ev.arms.R7.handCount,
      handDeny: (ev.arms.R7.handDeny[0] || '').slice(0, 170), denyWheat: ev.arms.R7.denyWheat,
      milkServe: (ev.arms.R7.milkServe[0] || '').slice(0, 150), milkDeny: (ev.arms.R7.milkDeny[0] || '').slice(0, 150),
      eggs: ev.arms.R7.egg.length,
    }));

    /* ---------------- R12 pre-stop surface ---------------- */
    const k1 = L.cfgKeys(L.CFG);
    ev.arms.R12 = { codeKeys: countCodeKeys(), fileKeys: Object.keys(k1).length, values: { needs: k1.livestockNeedsR196, production: k1.livestockProductionR196, farm: k1.farmDebugLog, mob: k1.mobDebugLog } };
    log('R12-pre', JSON.stringify(ev.arms.R12));
    await cmd('gamerule doDaylightCycle true', 300);
    await cmd('gamerule randomTickSpeed 3', 300);
    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 2: needs flag off ======================= */
  try {
    await startBoot(2, { needs: false, flags: true });
    ev.arms.R0b2 = {
      boot: ev.boots[1], mk: L.mkCounts(),
      cfg: { needs: L.cfgKeys(L.CFG).livestockNeedsR196, production: L.cfgKeys(L.CFG).livestockProductionR196, farm: L.cfgKeys(L.CFG).farmDebugLog, mob: L.cfgKeys(L.CFG).mobDebugLog },
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    };
    await buildPen();
    const from8 = srv.all.length;
    await hub();
    const cow8 = await freshCow(COW);
    await seed('water=0.0 food=0.3 hp=10.0', 10);
    await anchorCow(COW);
    await dropItem('minecraft:wheat', COW.x + 0.6, COW.z + 0.6, 1, 600);
    await dropItem('minecraft:wheat', FAR.x, FAR.z, 1, 600);
    await sleep(12000);
    await anchorCow(COW, 200);
    await sleep(13000);
    const rows8 = since(from8);
    const item8 = await nbtDump(itemBox(COW.x + 0.6, COW.z + 0.6, 2));
    ev.arms.R8 = {
      groundRows: rows8.filter((l) => /foodground|foodseek/.test(l)),
      itemSurvived: item8.foundNothing ? 'gone' : item8.rows.map((r) => r.count),
      // hand-feed under the production flag keeps its ETIM rows
      handServe: [], handCount: null, waterServe: [], waterCounts: null, inLove: null,
    };
    await seed('water=1.0 food=0.0 hp=2.0', 6);
    const h8 = await standBy(hostNear('cow', COW, 8) || cow8);
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:wheat 1`, 700);
    const it8 = pick('wheat'); if (!it8) throw new Error('no wheat b2');
    await bot.equip(it8, 'hand'); await sleep(350);
    await cmd(`gamemode 0 ${A}`, 700);
    let f8 = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8) || h8);
    await sleep(1300);
    ev.arms.R8.handServe = since(f8).filter((l) => /food src=cow/.test(l));
    ev.arms.R8.handCount = await invCount('wheat');
    // water serve under production flag
    await seed('water=0.0', 6);
    await standBy(hostNear('cow', COW, 8) || h8);
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:water_bucket 1`, 700);
    const wb8 = pick('water_bucket'); if (!wb8) throw new Error('no water bucket b2');
    await bot.equip(wb8, 'hand'); await sleep(350);
    f8 = srv.all.length;
    await bot.activateEntity(hostNear('cow', COW, 8));
    await sleep(1200);
    ev.arms.R8.waterServe = since(f8).filter((l) => /water src=cow/.test(l));
    ev.arms.R8.waterCounts = { water_bucket: await invCount('water_bucket'), bucket: await invCount('bucket') };
    await cmd(`gamemode 1 ${A}`, 500);
    ev.arms.R8.groundAfter = since(from8).filter((l) => /foodground|foodseek/.test(l)).length;
    log('R8', JSON.stringify({
      ground: ev.arms.R8.groundRows.length,
      hand: (ev.arms.R8.handServe[0] || '').slice(0, 170), handCount: ev.arms.R8.handCount,
      water: (ev.arms.R8.waterServe[0] || '').slice(0, 150), waterCounts: ev.arms.R8.waterCounts,
    }));
    await cmd('gamerule randomTickSpeed 3', 300);
    await cmd('gamerule doDaylightCycle true', 300);
    ev.stop2 = await stopBoot(2);
  } catch (e) {
    log('B2-FAIL', (e && e.stack) || e);
    ev.b2Error = String((e && e.stack) || e);
    try { if (srv) ev.stop2 = await stopBoot(2); } catch (e2) { ev.stop2Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= closure ======================= */
  try {
    L.setCfgValue(L.CFG, 'livestockNeedsR196', 'true');
    L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(), values: { needs: k.livestockNeedsR196, production: k.livestockProductionR196, farm: k.farmDebugLog, mob: k.mobDebugLog } };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', '275c5bc..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
    ev.worldsLeft = fs.readdirSync(path.join(L.ROOT, 'run')).filter((n) => n === WORLD);
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

main().catch((e) => {
  log('FATAL', (e && e.stack) || e);
  process.exit(1);
});
