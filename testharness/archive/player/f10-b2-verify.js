#!/usr/bin/env node
/**
 * f10-b2-verify.js — W-B10b2 judged window (produceGoods batch 2, HEAD 9df2124).
 *
 *   R0  boot face (Done, mixinFail 0, mixins 76+10, refmap 80/174, cfg 245 reg)
 *   R1  water serve (survival): serve add=1.0 meter=1.00 + hand -> empty bucket
 *   R2  water deny  (survival): deny meter=1.00, hand keeps the bucket, no serve
 *   R3  creative water serve: serve row, hand keeps the water bucket
 *   R4  hand-feed serve: add=0.5 food~0.5-0.6 hp=0.70 love=false + wheat consumed
 *   R5  love-if-well: serve love=true + live NBT InLove:600
 *   R6  family-gate deny: deny cause=family_gate + wheat kept + InLove 0 + no calf
 *   R7  child deny: deny cause=child + Age stays -24000 + wheat kept
 *   R8  jump feather: forced (drop at num 1/2, dry at num=1) + natural lane window
 *   R9  sheep grass tail: forced add=0.5 + natural yard window
 *   R10 NBT persistence: far cells (unloaded until the read) water/food/hp +
 *       counter/milk/feathers read back after a graceful restart
 *   R11 zero regression: milk serve/deny, egg pump, farm growth/drought, manure,
 *       32 /etest tokens, channel baselines
 *   R12 closure: cfg 245 (file 247), both flags false, rts=3, daylight true,
 *       master true, same hash
 *
 * Boots: b1 = R0/R1..R9/R10-seed/R11/R12-pre; b2 = R0 recheck + R10 readback.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f10-b2-verify';
const WORLD = 'f10b2v';
const A = 'ETIM_F7';
const TY = 100;
const PEN = { x: 297, z: 847 };
const COW = { x: 299.5, z: 849.5 };
const SHEEP = { x: 306.5, z: 849.5 };
const CH1 = { x: 306.5, z: 855.5 };
const CH2 = { x: 303.5, z: 857.5 };
const BABY = { x: 299.5, z: 856.5 };
const YARD = { x0: 330, x1: 336, z0: 845, z1: 849 };   // stepped panic yard (natural jump face)
const SHEEPY = { x: 330, z: 858 };
const CELL = { x: 600, y: 120, z: 900 };   // far from both the world spawn and the pen (chunk stays unloaded)
const FARM = { x0: 265, z0: 843, x1: 273, z1: 851 };
const DRY = { x0: 265, z0: 853, x1: 269, z1: 857 };
const TOK = { x: 276, z: 845 };

const sleep = L.sleep;
const log = L.log;
let srv = null, bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], stops: [], arms: {} };
const since = (n) => srv.all.slice(n).map(L.strip);
const get = (l, k) => { const m = new RegExp('(?:^| )' + k + '=(\\S+)').exec(l); return m ? m[1] : null; };

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
const PENBOX = { x0: PEN.x, y0: TY - 2, z0: PEN.z, x1: PEN.x + 15, y1: TY + 4, z1: PEN.z + 15 };   // 1.12 selectors are integer-only
const penSel = (type) => boxAt(type, PENBOX.x0, PENBOX.y0, PENBOX.z0, PENBOX.x1 - PENBOX.x0, PENBOX.y1 - PENBOX.y0, PENBOX.z1 - PENBOX.z0);

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }
async function chat(line, wait) {
  try { bot.chat('/' + line); } catch (e) { log('chat', 'send failed ' + line); }
  await sleep(wait === undefined ? 800 : wait);
}
/** count-only inventory probe: /clear <p> <item> -1 0 (metadata -1, maxCount 0). */
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
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);  await sleep(wait === undefined ? 950 : wait);
  const out = [];
  for (const l of since(from)) {
    const cap = /"etim:livestock":\{([^}]*)\}/.exec(l);
    if (!cap) continue;
    const kv = {};
    for (const part of cap[1].split(',')) { const i = part.indexOf(':'); if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1); }
    const pos = /Pos:\[([^\]]+)\]/.exec(l);
    const egg = /EggLayTime:(-?\d+)/.exec(l);
    out.push({
      pos: pos ? pos[1].split(',').map((s) => Math.round(parseFloat(s))).join(',') : '?',
      food: kv.food, water: kv.water, freedom: kv.freedom,
      prod: kv.productionCounter === undefined ? null : Number(kv.productionCounter),
      milk: kv.milk === undefined ? null : Number(kv.milk),
      num: kv.numFeathers === undefined ? null : Number(kv.numFeathers),
      max: kv.maxNumFeathers === undefined ? null : Number(kv.maxNumFeathers),
      health: (/Health:([\d.]+)f/.exec(l) || [])[1],
      inLove: (/InLove:(-?\d+)/.exec(l) || [])[1],
      age: (/(?:^|[,{])Age:(-?\d+)/.exec(l) || [])[1],
      egg: egg ? Number(egg[1]) : null,
    });
  }
  return out;
}
const pick = (need) => bot.inventory.items().find((i) => i.name === need || i.name === 'minecraft:' + need);

/** nearest live entity of a name around a spot, from the bot's entity list. */
function hostNear(name, spot, rad) {
  const p = bot.entity && bot.entity.position;
  return Object.values(bot.entities || {})
    .filter((e) => e && e.name === name && e.position
      && Math.abs(e.position.x - spot.x) <= (rad || 3) && Math.abs(e.position.z - spot.z) <= (rad || 3))
    .sort((a, b) => (p ? a.position.distanceTo(p) - b.position.distanceTo(p) : 0))[0];
}
/** teleport beside the host and aim the look ray at its body (server ray-cast). */
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

async function stageWorld() {
  await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
  await L.tp(srv, PEN.x + 6.5, TY + 1, PEN.z + 6.5, { bot: A, wait: 1800 });
  srv.send('kill @e[type=!player]');   // fresh worlds populate the herd on the first tp
  await sleep(1400);
}
function box(x0, z0, x1, z1) {
  srv.send(`fill ${x0 - 1} ${TY - 4} ${z0 - 1} ${x1 + 1} ${TY + 14} ${z1 + 1} minecraft:air 0`);
  srv.send(`fill ${x0} ${TY - 1} ${z0} ${x1} ${TY - 1} ${z1} minecraft:dirt 0`);
  srv.send(`fill ${x0} ${TY} ${z0} ${x1} ${TY} ${z1} minecraft:grass 0`);
  srv.send(`fill ${x0} ${TY + 1} ${z0} ${x1} ${TY + 2} ${z1} minecraft:cobblestone 0`);
  srv.send(`fill ${x0 + 1} ${TY + 1} ${z0 + 1} ${x1 - 1} ${TY + 2} ${z1 - 1} minecraft:air 0`);
}
async function buildAll() {
  await cmd(`gamerule randomTickSpeed 0`, 300);
  box(PEN.x, PEN.z, PEN.x + 12, PEN.z + 12);
  // water troughs keep the water meter fed between seeds
  await sleep(900);
  for (const [x, z] of [[PEN.x + 3, PEN.z + 3], [PEN.x + 9, PEN.z + 2], [PEN.x + 9, PEN.z + 9], [PEN.x + 2, PEN.z + 9]]) {
    srv.send(`setblock ${x} ${TY} ${z} minecraft:water 0 replace`);
  }
  // natural jump yard: walled, floor alternates one block up / down
  const { x0, x1, z0, z1 } = YARD;
  srv.send(`fill ${x0 - 2} ${TY - 4} ${z0 - 2} ${x1 + 2} ${TY + 10} ${z1 + 2} minecraft:air 0`);
  await sleep(600);
  srv.send(`fill ${x0} ${TY - 1} ${z0} ${x1} ${TY - 1} ${z1} minecraft:dirt 0`);
  srv.send(`fill ${x0} ${TY} ${z0} ${x1} ${TY} ${z1} minecraft:grass 0`);
  srv.send(`fill ${x0 - 1} ${TY + 1} ${z0 - 1} ${x1 + 1} ${TY + 3} ${z0 - 1} minecraft:cobblestone 0`);
  srv.send(`fill ${x0 - 1} ${TY + 1} ${z1 + 1} ${x1 + 1} ${TY + 3} ${z1 + 1} minecraft:cobblestone 0`);
  srv.send(`fill ${x0 - 1} ${TY + 1} ${z0} ${x0 - 1} ${TY + 3} ${z1} minecraft:cobblestone 0`);
  srv.send(`fill ${x1 + 1} ${TY + 1} ${z0} ${x1 + 1} ${TY + 3} ${z1} minecraft:cobblestone 0`);
  for (let x = x0 + 1; x <= x1 - 1; x += 2) {
    srv.send(`fill ${x} ${TY + 1} ${z0} ${x} ${TY + 1} ${z1} minecraft:stone 0`);
  }
  // natural sheep yard: pure grass, walls only
  box(SHEEPY.x, SHEEPY.z, SHEEPY.x + 8, SHEEPY.z + 8);
  // farm (wet 9x9 + dry 5x5) and the token platform
  srv.send(`fill ${FARM.x0 - 1} ${TY - 5} ${FARM.z0 - 1} ${FARM.x1 + 1} ${TY + 15} ${FARM.z1 + 1} minecraft:air 0`);
  await sleep(700);
  srv.send(`fill ${FARM.x0} ${TY - 1} ${FARM.z0} ${FARM.x1} ${TY - 1} ${FARM.z1} minecraft:stone 0`);
  srv.send(`fill ${FARM.x0} ${TY} ${FARM.z0} ${FARM.x1} ${TY} ${FARM.z1} minecraft:farmland 7`);
  const wx = Math.floor((FARM.x0 + FARM.x1) / 2), wz = Math.floor((FARM.z0 + FARM.z1) / 2);
  srv.send(`setblock ${wx} ${TY} ${wz} minecraft:water 0 replace`);
  for (let x = FARM.x0; x <= FARM.x1; x++) {
    for (let z = FARM.z0; z <= FARM.z1; z++) {
      if (x === wx && z === wz) continue;
      srv.send(`setblock ${x} ${TY + 1} ${z} minecraft:wheat 2 replace`);
    }
  }
  srv.send(`fill ${DRY.x0 - 1} ${TY - 5} ${DRY.z0 - 1} ${DRY.x1 + 1} ${TY + 15} ${DRY.z1 + 1} minecraft:air 0`);
  await sleep(700);
  srv.send(`fill ${DRY.x0} ${TY - 1} ${DRY.z0} ${DRY.x1} ${TY - 1} ${DRY.z1} minecraft:stone 0`);
  srv.send(`fill ${DRY.x0} ${TY} ${DRY.z0} ${DRY.x1} ${TY} ${DRY.z1} minecraft:farmland 0`);
  srv.send(`fill ${DRY.x0} ${TY + 1} ${DRY.z0} ${DRY.x1} ${TY + 1} ${DRY.z1} minecraft:wheat 2`);
  srv.send(`fill ${TOK.x - 3} ${TY - 5} ${TOK.z - 3} ${TOK.x + 3} ${TY + 15} ${TOK.z + 3} minecraft:air 0`);
  await sleep(500);
  srv.send(`fill ${TOK.x - 2} ${TY - 1} ${TOK.z - 2} ${TOK.x + 2} ${TY - 1} ${TOK.z + 2} minecraft:stone 0`);
  srv.send(`setblock ${TOK.x} ${TY} ${TOK.z} minecraft:stone 0`);
  await sleep(1500);
}
async function summonAll() {
  srv.send(`summon minecraft:cow ${COW.x} ${TY + 1} ${COW.z} {NoAI:1b,PersistenceRequired:1b}`);
  srv.send(`summon minecraft:sheep ${SHEEP.x} ${TY + 1} ${SHEEP.z} {NoAI:1b,PersistenceRequired:1b}`);
  srv.send(`summon minecraft:chicken ${CH1.x} ${TY + 1} ${CH1.z} {NoAI:1b,PersistenceRequired:1b}`);
  srv.send(`summon minecraft:chicken ${CH2.x} ${TY + 1} ${CH2.z} {NoAI:1b,PersistenceRequired:1b}`);
  srv.send(`summon minecraft:cow ${BABY.x} ${TY + 1} ${BABY.z} {NoAI:1b,PersistenceRequired:1b,Age:-24000}`);
  for (const [dx, dz] of [[0.5, 0.5], [2.5, 0.5], [4.5, 0.5], [2.5, 3.5]]) {
    srv.send(`summon minecraft:chicken ${YARD.x0 + dx} ${TY + 1} ${YARD.z0 + dz} {PersistenceRequired:1b}`);
  }
  srv.send(`summon minecraft:sheep ${SHEEPY.x + 2.5} ${TY + 1} ${SHEEPY.z + 2.5} {PersistenceRequired:1b}`);
  srv.send(`summon minecraft:sheep ${SHEEPY.x + 5.5} ${TY + 1} ${SHEEPY.z + 6.5} {PersistenceRequired:1b}`);
  await sleep(3200);
  // seed the natural chickens' feather meter to 2 so a jump can actually shed
  await L.tp(srv, YARD.x0 + 2.5, TY + 1, YARD.z0 + 2.5, { bot: A, wait: 800 });
  srv.send(`etest prod ${A} 7 feather=2`);
  await sleep(800);
  await L.tp(srv, PEN.x + 6.5, TY + 1, PEN.z + 6.5, { bot: A, wait: 1200 });
  ev.naturalIds = {
    chickens: Object.values(bot.entities || {}).filter((e) => e && e.name === 'chicken'
      && Math.abs(e.position.x - YARD.x0 - 3) < 6 && Math.abs(e.position.z - YARD.z0 - 2) < 4).map((e) => e.id),
    sheep: Object.values(bot.entities || {}).filter((e) => e && e.name === 'sheep'
      && Math.abs(e.position.x - SHEEPY.x - 4) < 7 && Math.abs(e.position.z - SHEEPY.z - 4) < 7).map((e) => e.id),
  };
  log('naturalIds', JSON.stringify(ev.naturalIds));
}

/** one interaction face: stand, equip, mode, seed, click, collect. */
async function clickFace(tag, opts) {
  const o = opts || {};
  const e0 = hostNear(o.host, o.spot, o.rad || 4);
  if (!e0) throw new Error(tag + ': host ' + o.host + ' missing');
  const face = await standBy(e0, { look: o.look !== false });
  if (o.item) {
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} ${o.item} 1`, 750);
    const it = pick(o.item.replace('minecraft:', ''));
    if (!it) throw new Error(tag + ': no ' + o.item + ' after give');
    await bot.equip(it, 'hand');
    await sleep(350);
  }
  if (o.survival) await cmd(`gamemode 0 ${A}`, 750);
  if (o.seed) await cmd(`etest prod ${A} ${o.seedRad || 2} ${o.seed}`, 420);
  const from = srv.all.length;
  const host = hostNear(o.host, o.spot, o.rad || 4) || face;
  const dumped = [];
  await bot.activateEntity(host);
  await sleep(o.wait || 1200);
  const rows = since(from);
  const res = { from, rows, hostId: host.id };
  if (o.countItems) {
    res.counts = {};
    for (const it of o.countItems) res.counts[it] = await invCount(it);
  }
  if (o.dump) res.dump = await nbtDump(penSel(o.host === 'cow' ? 'cow' : o.host));
  if (o.survival) await cmd(`gamemode 1 ${A}`, 550);
  res.rows = rows;
  return res;
}

async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'livestockProductionR196', o.master ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'farmDebugLog', o.flags ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'mobDebugLog', o.flags ? 'true' : 'false');
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
  if (!o.noStage) await stageWorld();
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
  ev.head = head; ev.headOk = head.startsWith('9df2124');
  ev.pins = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const kb = L.cfgKeys(L.CFG);
  ev.cfgBefore = {
    bytes: cfgBefore.length, sha: L.sha256(cfgBefore), fileKeys: Object.keys(kb).length, codeKeys: countCodeKeys(),
    values: { livestockProductionR196: kb.livestockProductionR196, farmDebugLog: kb.farmDebugLog, mobDebugLog: kb.mobDebugLog },
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
  await startBoot(1, { master: true, flags: true });
  try {
    ev.arms.R0 = {
      boot: ev.boots[0], mk: ev.mk,
      cfg: { livestockProductionR196: L.cfgKeys(L.CFG).livestockProductionR196, farmDebugLog: L.cfgKeys(L.CFG).farmDebugLog, mobDebugLog: L.cfgKeys(L.CFG).mobDebugLog },
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    };
    await buildAll();
    await summonAll();
    const guardFrom = srv.all.length;
    await sleep(2500);
    const wallRows = since(guardFrom).filter((l) => /inWall/.test(l));
    ev.pen = { inWallRows: wallRows.length, sample: wallRows.slice(0, 2) };
    log('pen', 'inWall=' + wallRows.length);
    const natFrom = srv.all.length;   // natural windows open here

    /* ---------------- R1 water serve (survival) ---------------- */
    let r = await clickFace('R1', {
      host: 'cow', spot: COW, item: 'minecraft:water_bucket', survival: true,
      seed: 'water=0.0', countItems: ['water_bucket', 'bucket'],
    });
    ev.arms.R1 = { rows: r.rows.filter((l) => /water src=cow/.test(l)), counts: r.counts };
    log('R1', JSON.stringify({ rows: ev.arms.R1.rows, counts: ev.arms.R1.counts }));

    /* ---------------- R2 water deny (survival) ---------------- */
    r = await clickFace('R2', {
      host: 'cow', spot: COW, item: 'minecraft:water_bucket', survival: true,
      seed: 'water=1.0', countItems: ['water_bucket', 'bucket'], dump: true,
    });
    ev.arms.R2 = {
      rows: r.rows.filter((l) => /water src=cow/.test(l)),
      counts: r.counts, dump: r.dump,
      damageRows: r.rows.filter((l) => /\[DamageLog\]/.test(l)).length,
      serveRows: r.rows.filter((l) => /water src=cow serve/.test(l)).length,
    };
    log('R2', JSON.stringify({ rows: ev.arms.R2.rows, counts: ev.arms.R2.counts, damage: ev.arms.R2.damageRows }));

    /* ---------------- R3 creative water serve ---------------- */
    r = await clickFace('R3', {
      host: 'cow', spot: COW, item: 'minecraft:water_bucket', survival: false,
      seed: 'water=0.0', countItems: ['water_bucket', 'bucket'],
    });
    ev.arms.R3 = { rows: r.rows.filter((l) => /water src=cow/.test(l)), counts: r.counts };
    log('R3', JSON.stringify({ rows: ev.arms.R3.rows, counts: ev.arms.R3.counts }));

    /* ---------------- R4 hand-feed serve ---------------- */
    r = await clickFace('R4', {
      host: 'cow', spot: COW, item: 'minecraft:wheat', survival: true,
      seed: 'water=1.0 food=0.0 hp=2.0', countItems: ['wheat'], dump: true,
    });
    ev.arms.R4 = {
      rows: r.rows.filter((l) => /food src=cow/.test(l)),
      counts: r.counts, dump: r.dump,
    };
    log('R4', JSON.stringify({ rows: ev.arms.R4.rows, counts: ev.arms.R4.counts, dump: ev.arms.R4.dump }));

    /* ---------------- R5 love-if-well ---------------- */
    r = await clickFace('R5', {
      host: 'cow', spot: COW, item: 'minecraft:wheat', survival: true,
      seed: 'water=1.0 food=0.2 hp=10.0', countItems: ['wheat'], dump: true,
    });
    ev.arms.R5 = {
      rows: r.rows.filter((l) => /food src=cow/.test(l)),
      counts: r.counts, dump: r.dump,
    };
    log('R5', JSON.stringify({ rows: ev.arms.R5.rows, counts: ev.arms.R5.counts, inLove: ev.arms.R5.dump.map((d) => d.inLove) }));

    /* ---------------- R6 family-gate deny (fresh cow) ---------------- */
    let ev6 = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      await L.tp(srv, COW.x + 1.1, TY + 1, COW.z + 1.0, { bot: A, wait: 700 });
      srv.send(boxKill('cow', COW.x - 1, TY, COW.z - 1, 3, 4, 3));   // the in-love cow goes; the baby is 7 blocks away
      await sleep(900);
      srv.send(`summon minecraft:cow ${COW.x} ${TY + 1} ${COW.z} {NoAI:1b,PersistenceRequired:1b}`);
      await sleep(1500);
      const cowCountBefore = Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow').length;
      const res = await clickFace('R6', {
        host: 'cow', spot: COW, item: 'minecraft:wheat', survival: true,
        seed: 'water=0.2 food=1.0 hp=10.0', countItems: ['wheat'], dump: true,
      });
      await sleep(700);
      const cowCountAfter = Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow').length;
      const denyRows = res.rows.filter((l) => /food src=cow deny/.test(l));
      ev6 = {
        attempt, rows: res.rows.filter((l) => /food src=cow/.test(l)),
        counts: res.counts, dump: res.dump, cowCountBefore, cowCountAfter,
        serveRows: res.rows.filter((l) => /food src=cow serve/.test(l)).length,
      };
      if (denyRows.length) break;   // a wellness pass may have lifted water over the gate — retry fresh
    }
    ev.arms.R6 = ev6;
    log('R6', JSON.stringify({ rows: ev6.rows, counts: ev6.counts, cows: [ev6.cowCountBefore, ev6.cowCountAfter], inLove: ev6.dump.map((d) => d.inLove), attempt: ev6.attempt }));

    /* ---------------- R7 child deny ---------------- */
    ev.arms.R7 = {};
    const baby0 = hostNear('cow', BABY, 3);
    if (!baby0) throw new Error('baby cow missing');
    const bface = await standBy(baby0, { look: true });
    await cmd(`clear ${A}`, 350);
    await cmd(`give ${A} minecraft:wheat 1`, 700);
    let it = pick('wheat'); if (!it) throw new Error('no wheat'); await bot.equip(it, 'hand'); await sleep(350);
    await cmd(`gamemode 0 ${A}`, 700);
    await cmd(`etest prod ${A} 2 water=0.2 food=0.2 hp=10.0`, 420);
    let from7 = srv.all.length;
    await bot.activateEntity(hostNear('cow', BABY, 3) || bface);
    await sleep(1300);
    const childDump = await nbtDump(boxAt('cow', BABY.x - 2, TY - 1, BABY.z - 2, 5, 5, 5));
    ev.arms.R7 = {
      rows: since(from7).filter((l) => /food src=cow/.test(l)),
      counts: { wheat: await invCount('wheat') },
      dump: childDump,
      serveRows: since(from7).filter((l) => /food src=cow serve/.test(l)).length,
    };
    await cmd(`gamemode 1 ${A}`, 500);
    log('R7', JSON.stringify({ rows: ev.arms.R7.rows, counts: ev.arms.R7.counts, dump: ev.arms.R7.dump }));

    /* ---------------- R8-1 jump feather (forced) ---------------- */
    await L.tp(srv, CH1.x + 1.1, TY + 1, CH1.z + 1.0, { bot: A, wait: 900 });
    await cmd(`etest prod ${A} 2 feather=2`, 600);
    let f = srv.all.length;
    srv.send(`etest prod ${A} 2 jump=2000`);
    await sleep(2500);
    const jumpRows = srv.all.slice(f).map(L.strip).filter((l) => /kind=feather jump=true/.test(l));
    const afterJump = await nbtDump(boxAt('chicken', CH1.x - 2, TY - 1, CH1.z - 2, 5, 5, 5));
    await cmd(`etest prod ${A} 2 feather=1`, 600);
    f = srv.all.length;
    srv.send(`etest prod ${A} 2 jump=2000`);
    await sleep(2200);
    const jumpRowsDry = srv.all.slice(f).map(L.strip).filter((l) => /kind=feather jump=true/.test(l));
    const echoJump = srv.all.slice(f).map(L.strip).find((l) => /\[FarmLog\] prod /.test(l)) || '';
    ev.arms.R8forced = { jumpRows, afterJump, jumpRowsDry, echoJump };
    log('R8-1', JSON.stringify({ drops: jumpRows.length, sample: jumpRows.slice(0, 2), dry: jumpRowsDry.length, num: afterJump.map((d) => d.num + '/' + d.max) }));

    /* ---------------- R9-1 sheep grass (forced) ---------------- */
    await L.tp(srv, SHEEP.x + 1.1, TY + 1, SHEEP.z + 1.0, { bot: A, wait: 900 });
    await cmd(`etest prod ${A} 2 food=0.0`, 500);
    f = srv.all.length;
    srv.send(`etest prod ${A} 2 grass=1`);
    await sleep(1400);
    ev.arms.R9forced = {
      rows: srv.all.slice(f).map(L.strip).filter((l) => /grass src=sheep/.test(l)),
      dump: await nbtDump(boxAt('sheep', SHEEP.x - 2, TY - 1, SHEEP.z - 2, 5, 5, 5)),
    };
    log('R9-1', JSON.stringify({ rows: ev.arms.R9forced.rows, food: ev.arms.R9forced.dump.map((d) => d.food) }));

    /* ---------------- R11-2 egg pump (batch-1 regression) ---------------- */
    await L.tp(srv, CH1.x + 1.1, TY + 1, CH1.z + 1.0, { bot: A, wait: 700 });
    f = srv.all.length;
    srv.send(`etest prod ${A} 4 counter=200 step=600`);
    await sleep(2600);
    ev.arms.R11egg = {
      rows: srv.all.slice(f).map(L.strip).filter((l) => /\[AILog\] production/.test(l)),
      echo: srv.all.slice(f).map(L.strip).find((l) => /\[FarmLog\] prod /.test(l)) || '',
    };
    log('R11egg', JSON.stringify({ eggs: ev.arms.R11egg.rows.length, echo: ev.arms.R11egg.echo.slice(0, 160) }));

    /* ---------------- R11-1 milk serve/deny (batch-1 regression) ---------------- */
    await L.tp(srv, COW.x + 1.1, TY + 1, COW.z + 1.0, { bot: A, wait: 700 });
    srv.send(boxKill('cow', COW.x - 1, TY, COW.z - 1, 3, 4, 3));
    await sleep(800);
    srv.send(`summon minecraft:cow ${COW.x} ${TY + 1} ${COW.z} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(1500);
    r = await clickFace('R11milk', {
      host: 'cow', spot: COW, item: 'minecraft:bucket', survival: true,
      seed: 'milk=100', countItems: ['bucket', 'milk_bucket'],
    });
    const serve1 = r.rows.filter((l) => /milk src=cow/.test(l));
    r = await clickFace('R11milk2', {
      host: 'cow', spot: COW, item: 'minecraft:bucket', survival: true,
      seed: 'milk=0', countItems: ['bucket', 'milk_bucket'],
    });
    const deny1 = r.rows.filter((l) => /milk src=cow/.test(l));
    ev.arms.R11milk = { serve: serve1, deny: deny1 };
    log('R11milk', JSON.stringify({ serve: serve1.map((l) => l.slice(0, 120)), deny: deny1.map((l) => l.slice(0, 120)) }));

    /* ---------------- R11-4 manure ---------------- */
    await L.tp(srv, PEN.x + 6.5, TY + 1, PEN.z + 6.5, { bot: A, wait: 800 });
    f = srv.all.length;
    await chat('etest livemano 6', 2200);
    ev.arms.R11manure = since(f).filter((l) => /\[FarmLog\] manure src=livestock/.test(l));
    log('R11manure', 'rows=' + ev.arms.R11manure.length + ' ' + (ev.arms.R11manure[0] || '').slice(0, 140));

    /* ---------------- R8-2 natural jump window (vanilla panic AI) + farm face ----------------
       Creative-mode hits deal damage and set the revenge target; EntityAIPanic then runs the
       chicken 5-7 blocks at 1.4x across the one-high steps — every crossing is a vanilla
       jump() -> MixinEntityLivingBase TAIL. Heals ride instant_health so the 4 HP birds live. */
    await cmd('gamerule randomTickSpeed 60', 400);
    const yardC = { x: YARD.x0 + 2.5, z: YARD.z0 + 2.5 };
    await L.tp(srv, yardC.x, TY + 1, yardC.z, { bot: A, wait: 700 });
    await cmd(`clear ${A}`, 350);
    const yardFrom = srv.all.length;
    let cycles = 0, healTick = 0;
    const yardEnd = Date.now() + 200000;
    while (Date.now() < yardEnd) {
      cycles++;
      const chicks = Object.values(bot.entities || {}).filter((e) => e && e.name === 'chicken' && e.position
        && Math.abs(e.position.x - YARD.x0 - 3) < 6 && Math.abs(e.position.z - YARD.z0 - 2) < 4)
        .sort((a, b) => a.id - b.id);
      if (chicks.length) {
        await L.tp(srv, yardC.x, TY + 1, yardC.z, { bot: A, wait: 250 });
        for (const c of chicks) {
          try { bot.attack(c); ev.arms.R8naturalHits = (ev.arms.R8naturalHits || 0) + 1; } catch (e) { /* out of range */ }
          await sleep(180);
        }
        healTick++;
        if (healTick % 2 === 0) srv.send('effect @e[type=chicken] minecraft:instant_health 1 1');
      }
      if (cycles === 3) await cmd('gamerule randomTickSpeed 3', 300);
      await sleep(2600);
      const rows = since(yardFrom).filter((l) => /kind=feather jump=true/.test(l));
      log('yard' + cycles, 'jumps=' + rows.length + ' chicks=' + chicks.length
        + ' farmRate=' + since(yardFrom).filter((l) => /growth rate/.test(l)).length
        + ' dry=' + since(yardFrom).filter((l) => /growth gate dry/.test(l)).length);
      if (rows.length >= 1) break;
    }
    const laneRows = since(yardFrom).filter((l) => /kind=feather jump=true/.test(l));
    const laneChickIds = ev.naturalIds.chickens || [];
    ev.arms.R8natural = {
      jumps: laneRows,
      byId: since(natFrom).filter((l) => /kind=feather jump=true/.test(l) && laneChickIds.some((id) => l.includes('#' + id))),
      cycles, laneChickIds,
    };
    ev.arms.R11farm = {
      wetRate: since(yardFrom).filter((l) => /\[FarmLog\] growth rate/.test(l)).length,
      wetSample: since(yardFrom).find((l) => /\[FarmLog\] growth rate/.test(l)) || '',
      dryGate: since(yardFrom).filter((l) => /\[FarmLog\] growth gate dry/.test(l)).length,
      drySample: since(yardFrom).find((l) => /\[FarmLog\] growth gate dry/.test(l)) || '',
    };
    log('R8-2', JSON.stringify({ jumps: laneRows.length, byId: ev.arms.R8natural.byId.length, cycles, sample: laneRows.slice(0, 2) }));
    log('R11farm', JSON.stringify({ wet: ev.arms.R11farm.wetRate, dry: ev.arms.R11farm.dryGate }));
    await cmd('gamerule randomTickSpeed 3', 400);

    /* ---------------- R9-2 natural sheep window ---------------- */
    const sheepYard = Object.values(bot.entities || {}).filter((e) => e && e.name === 'sheep'
      && Math.abs(e.position.x - SHEEPY.x - 4) < 7 && Math.abs(e.position.z - SHEEPY.z - 4) < 7).map((e) => e.id);
    ev.arms.R9natural = {
      rows: since(natFrom).filter((l) => /grass src=sheep/.test(l) && sheepYard.some((id) => l.includes('#' + id))),
      yardIds: sheepYard,
    };
    log('R9-2', 'rows=' + ev.arms.R9natural.rows.length + ' ids=' + JSON.stringify(sheepYard));

    /* ---------------- R11-3 drought roll ---------------- */
    f = srv.all.length;
    srv.send(`etest drought roll ${DRY.x0 + 2} ${TY + 1} ${DRY.z0 + 2} 1.0`);
    await sleep(1200);
    ev.arms.R11drought = since(f).filter((l) => /\[FarmLog\] drought/.test(l));
    log('R11drought', 'rows=' + ev.arms.R11drought.length);

    /* ---------------- R11-5 32-token sweep on the platform ---------------- */
    await L.tp(srv, TOK.x + 0.5, TY, TOK.z + 0.5, { bot: A, wait: 900 });
    await cmd(`summon minecraft:cow ${TOK.x + 1.5} ${TY} ${TOK.z + 1.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b}`, 700);
    await cmd(`give ${A} minecraft:iron_sword 1`, 600);
    const tokens = [
      'etest hold minecraft:iron_sword', 'etest food 20 20', 'etest hunger 20 20',
      'etest health 20', 'etest level 5', 'etest debt 3',
      'etest enchant mainhand 3', 'etest enchantprobe mainhand',
      'etest blockprobe', 'etest hurt 2', 'etest attack @e[type=cow,limit=1]',
      `etest dig ${TOK.x} ${TY} ${TOK.z}`, `etest useblock ${TOK.x} ${TY} ${TOK.z}`,
      'etest useitem', 'etest damage 1', 'etest quality fine',
      `etest anvilwear ${TOK.x} ${TY} ${TOK.z}`,
      'etest release', 'etest hold etim:manure',
      'etest fishgate 6000', 'etest fishretract', 'etest fishprobe type 10',
      'etest arrowprobe recovery iron 1 10', 'etest livemano 8', 'etest chestio peek',
      'etest', `etest drought probe ${FARM.x0 + 2} ${TY + 1} ${FARM.z0 + 2}`,
      'etest prod ETIM_F7 1 water=0.0', 'etest prod ETIM_F7 1 food=0.0',
      'etest prod ETIM_F7 1 hp=1.0', 'etest prod ETIM_F7 1 grass=1',
      'etest prod ETIM_F7 1 jump=1',
    ];
    ev.arms.R11tokens = [];
    for (const t of tokens) {
      const ff = srv.all.length;
      await chat(t, 620);
      ev.arms.R11tokens.push({ cmd: t, lines: since(ff).filter((l) => /\[EtimTest\]|\[FarmLog\] prod |Exception|Error|FAILED|Unknown command/.test(l)).slice(0, 2) });
    }
    ev.arms.R11tokenCount = tokens.length;
    ev.arms.R11tokenErrors = srv.all.map(L.strip).filter((l) => /\[TestLog\] step=\S+ player=\S+ FAILED=|java\.lang\.\w*Exception|java\.lang\.\w*Error|Unknown command/.test(l));
    const all = srv.all.map(L.strip);
    ev.arms.R11channels = {
      farm: all.filter((l) => /\[FarmLog\]/.test(l)).length,
      melee: all.filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: all.filter((l) => /\[MiningLog\]/.test(l)).length,
      butch: all.filter((l) => /\[ButchLog\]/.test(l)).length,
      arrow: all.filter((l) => /\[ArrowLog\]/.test(l)).length,
      cap: all.filter((l) => /\[CapLog\]/.test(l)).length,
      enchant: all.filter((l) => /\[EnchantLog\]/.test(l)).length,
      damage: all.filter((l) => /\[DamageLog\]/.test(l)).length,
      food: all.filter((l) => /\[FoodLog\]/.test(l)).length,
    };
    log('R11tokens', 'n=' + tokens.length + ' err=' + ev.arms.R11tokenErrors.length + ' ch=' + JSON.stringify(ev.arms.R11channels));

    /* ---------------- R10 seed at the far cells ---------------- */
    await L.tp(srv, CELL.x + 0.5, CELL.y, CELL.z + 0.5, { bot: A, wait: 900 });
    srv.send(`fill ${CELL.x - 4} ${CELL.y - 4} ${CELL.z - 4} ${CELL.x + 12} ${CELL.y + 8} ${CELL.z + 6} minecraft:air 0`);
    await sleep(700);
    for (const [dx, dz] of [[0, 0], [6, 0]]) {
      srv.send(`fill ${CELL.x + dx - 1} ${CELL.y - 1} ${CELL.z + dz - 1} ${CELL.x + dx + 1} ${CELL.y - 1} ${CELL.z + dz + 1} minecraft:stone 0`);
      srv.send(`fill ${CELL.x + dx - 2} ${CELL.y} ${CELL.z + dz - 2} ${CELL.x + dx + 2} ${CELL.y + 2} ${CELL.z + dz + 2} minecraft:cobblestone 0`);
      srv.send(`fill ${CELL.x + dx - 1} ${CELL.y} ${CELL.z + dz - 1} ${CELL.x + dx + 1} ${CELL.y + 1} ${CELL.z + dz + 1} minecraft:air 0`);
    }
    await sleep(700);
    srv.send(`summon minecraft:cow ${CELL.x + 0.5} ${CELL.y} ${CELL.z + 0.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${CELL.x + 6.5} ${CELL.y} ${CELL.z + 0.5} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(600);
    srv.send(`etest prod ${A} 2 water=0.3 food=0.4 hp=3.0 counter=7 milk=61`);
    await sleep(600);
    await L.tp(srv, CELL.x + 6.5, CELL.y, CELL.z + 0.5, { bot: A, wait: 400 });
    srv.send(`etest prod ${A} 2 water=0.3 food=0.4 hp=3.0 counter=42 feather=1`);
    await sleep(500);
    const cSel = boxAt('cow', CELL.x - 2, CELL.y - 2, CELL.z - 2, 12, 5, 6);
    const hSel = boxAt('chicken', CELL.x - 2, CELL.y - 2, CELL.z - 2, 12, 5, 6);
    ev.arms.R10seed = { cow: await nbtDump(cSel), chicken: await nbtDump(hSel) };
    log('R10seed', JSON.stringify(ev.arms.R10seed));

    /* ---------------- R12 pre-stop surface ---------------- */
    const k1 = L.cfgKeys(L.CFG);
    ev.arms.R12 = { codeKeys: countCodeKeys(), fileKeys: Object.keys(k1).length, values: { livestockProductionR196: k1.livestockProductionR196, farmDebugLog: k1.farmDebugLog, mobDebugLog: k1.mobDebugLog } };
    log('R12-pre', JSON.stringify(ev.arms.R12));
    await cmd('gamerule doDaylightCycle true', 300);
    await cmd('gamerule randomTickSpeed 3', 300);
    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 2: R10 readback ======================= */
  try {
    await startBoot(2, { master: true, flags: false, noStage: true });
    ev.arms.R0b2 = {
      boot: ev.boots[1], mk: L.mkCounts(),
      cfg: { livestockProductionR196: L.cfgKeys(L.CFG).livestockProductionR196, farmDebugLog: L.cfgKeys(L.CFG).farmDebugLog, mobDebugLog: L.cfgKeys(L.CFG).mobDebugLog },
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    };
    await L.tp(srv, CELL.x + 0.5, CELL.y, CELL.z + 0.5, { bot: A, wait: 400 });
    const cSel = boxAt('cow', CELL.x - 2, CELL.y - 2, CELL.z - 2, 12, 5, 6);
    const hSel = boxAt('chicken', CELL.x - 2, CELL.y - 2, CELL.z - 2, 12, 5, 6);
    const t0 = Date.now();
    ev.arms.R10 = { cow: await nbtDump(cSel), chicken: await nbtDump(hSel), ms: Date.now() - t0 };
    log('R10-read', JSON.stringify(ev.arms.R10));
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
    L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(), values: { livestockProductionR196: k.livestockProductionR196, farmDebugLog: k.farmDebugLog, mobDebugLog: k.mobDebugLog } };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', '9df2124..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
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
