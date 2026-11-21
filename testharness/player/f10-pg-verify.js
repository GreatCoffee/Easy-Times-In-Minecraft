#!/usr/bin/env node
/**
 * f10-pg-verify.js — W-B10 judged window (produceGoods family, HEAD 2ee1b0e).
 *
 * Contract (task book 2026-11-05):
 *   R0  boot face (Done, mixinFail 0, mixins 74+10, refmap 78/171, cfg 245 reg,
 *       livestockProductionR196=true)
 *   R1  milking serve (survival): serve row take=100 meter=0 + hand milk_bucket
 *   R2  milking deny: second click on the empty meter -> deny row, hand stays bucket
 *   R3  creative click: serve row + hand stays bucket (R196 :105-110 verbatim)
 *   R4  milk meter natural regrowth: seed milk=20 -> value rows rise ~+1/pass
 *   R5  egg pump: counter=200 step=600 -> one egg row per chicken + egg items
 *   R6  feather pump: counter=100 feather=2 step=2000 -> kind=feather drop=1 rows
 *   R7  feather meter growth: seed feather=2 (max=2) then feather=1 -> grew=true
 *   R8  sheep/pig empty production + counter reset: counter=50 -> value row 0
 *   R9  vanilla egg lane silence (master on: EggLayTime pinned, no vanilla egg)
 *       + master-off boot: vanilla egg lays, infinite milk, zero production rows
 *       + master-on restore boot (R0 recheck)
 *   R10 NBT persistence: seed counter=42 milk=60 feather=0 in a no-grass cell
 *       (food=0 -> never "well" -> counter frozen) -> restart -> value row exact
 *   R11 zero regression: farm growth/dry rows, drought roll, live manure, 27
 *       /etest tokens, channel baselines
 *   R12 closure: cfg 245 reg (file 247), both debug flags false, rts=3,
 *       doDaylightCycle=true, livestockProductionR196=true, same hash
 *
 * Boots: b1 = R0/R1..R8/R9-1/R10-seed/R11/R12 (master on)
 *        b2 = R9-2 master off (vanilla egg + infinite milk) + R10 readback
 *        b3 = R9-3 master on restore (R0 recheck)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-verify';
const WORLD = 'f10v';
const A = 'ETIM_F7';
const FX = 297, FZ = 847, TY = 100;          // pen region 13x13, floor top face y=TY
const CELL = { x: 283, z: 849 };             // R10 no-grass persistence cell
const FARM = { x0: 265, z0: 843, x1: 273, z1: 851 };
const DRY = { x0: 265, z0: 853, x1: 269, z1: 857 };

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
const penSel = (type) => `@e[type=${type},x=${FX},y=${TY - 1},z=${FZ},dx=15,dy=6,dz=15]`;
const cellSel = (type) => `@e[type=${type},x=${CELL.x - 2},y=${TY - 1},z=${CELL.z - 2},dx=6,dy=6,dz=6]`;

async function cmd(line, wait) { srv.send(line); await sleep(wait === undefined ? 400 : wait); }
async function chat(line, wait) {
  try { bot.chat('/' + line); } catch (e) { log('chat', 'send failed ' + line + ': ' + ((e && e.message) || e)); }
  await sleep(wait === undefined ? 700 : wait);
}
async function testfor(sel, nbt) {
  const from = srv.all.length;
  srv.send(`testfor ${sel}${nbt ? ' ' + nbt : ''}`);
  await sleep(420);
  const rows = srv.all.slice(from).map(L.strip);
  const hit = rows.find((l) => /^Found \S+/.test(l));
  const miss = rows.find((l) => /did not match|No entity|Test failed|no entities/i.test(l));
  return { ok: !!hit, raw: (hit || miss || '').slice(0, 160) };
}
/**
 * Live-NBT read channel: `/execute <sel> ~ ~ ~ entitydata @e[r=0,c=1] {}`
 * merges an empty tag and the server prints the FULL updated NBT per entity
 * (the dump carries EggLayTime + ForgeCaps etim:livestock meters/Pos).
 */
async function nbtDump(sel) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] {}`);
  await sleep(950);
  const rows = srv.all.slice(from).map(L.strip);
  const out = [];
  for (const l of rows) {
    const cap = /"etim:livestock":\{([^}]*)\}/.exec(l);
    if (!cap) continue;
    const kv = {};
    for (const part of cap[1].split(',')) {
      const i = part.indexOf(':');
      if (i > 0) kv[part.slice(0, i)] = part.slice(i + 1);
    }
    const pos = /Pos:\[([^\]]+)\]/.exec(l);
    const egg = /EggLayTime:(-?\d+)/.exec(l);
    out.push({
      pos: pos ? pos[1].split(',').map((s) => Math.round(parseFloat(s))).join(',') : '?',
      food: kv.food, water: kv.water, freedom: kv.freedom,
      prod: kv.productionCounter === undefined ? null : Number(kv.productionCounter),
      milk: kv.milk === undefined ? null : Number(kv.milk),
      num: kv.numFeathers === undefined ? null : Number(kv.numFeathers),
      max: kv.maxNumFeathers === undefined ? null : Number(kv.maxNumFeathers),
      inited: kv.inited, egg: egg ? Number(egg[1]) : null,
    });
  }
  return out;
}
async function entitydataAll(sel, nbt) {
  const from = srv.all.length;
  srv.send(`execute ${sel} ~ ~ ~ entitydata @e[r=0,c=1] ${nbt}`);
  await sleep(700);
  return srv.all.slice(from).map(L.strip).filter((l) => /modified|Entity data|error|failed/i.test(l)).slice(0, 4);
}
function nearest(name, maxDist) {
  const p = bot.entity && bot.entity.position;
  return Object.values(bot.entities || {}).filter((e) => e && e.name === name && e.position)
    .sort((a, b) => a.position.distanceTo(p) - b.position.distanceTo(p))
    .find((e) => e.position.distanceTo(p) <= (maxDist || 30));
}
const pick = (need) => bot.inventory.items().find((i) => i.name === need);
async function equip(name) {
  const it = pick(name);
  if (!it) throw new Error('no ' + name + ' in bot inv');
  await bot.equip(it, 'hand');
  await sleep(450);
}

async function stageWorld(opts) {
  const o = opts || {};
  srv.send(`op ${A}`);
  await sleep(650);
  for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false',
    'doDaylightCycle false', 'doFireTick false', 'mobGriefing true',
    'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    srv.send('gamerule ' + g);
  }
  srv.send('difficulty 2');
  srv.send('time set 6000');
  srv.send('weather clear 1000000');
  srv.send('gamerule randomTickSpeed 3');
  srv.send(`gamemode 1 ${A}`);
  srv.send(`etest food 20 20 ${A}`);
  srv.send(`etest health 20 ${A}`);
  if (o.kill) srv.send('kill @e[type=!player]');
  await sleep(1200);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
}

async function buildPen() {
  srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:air 0`);
  await sleep(900);
  srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY - 1} ${FZ + 12} minecraft:dirt 0`);
  srv.send(`fill ${FX} ${TY} ${FZ} ${FX + 12} ${TY} ${FZ + 12} minecraft:grass 0`);
  await sleep(900);
  srv.send(`fill ${FX} ${TY + 1} ${FZ} ${FX + 12} ${TY + 1} ${FZ + 12} minecraft:cobblestone 0`);
  srv.send(`fill ${FX + 1} ${TY + 1} ${FZ + 1} ${FX + 11} ${TY + 1} ${FZ + 11} minecraft:air 0`);
  srv.send(`fill ${FX} ${TY + 2} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:cobblestone 0`);
  srv.send(`fill ${FX + 1} ${TY + 2} ${FZ + 1} ${FX + 11} ${TY + 2} ${FZ + 11} minecraft:air 0`);
  await sleep(900);
  // keep the sky open above the pen (isCrowded counts "no sky access" as crowded)
  srv.send(`fill ${FX} ${TY + 3} ${FZ} ${FX + 12} ${TY + 22} ${FZ + 12} minecraft:air 0`);
  await sleep(700);
  // water troughs (contained single source blocks: the four side neighbours are
  // solid floor blocks, so nothing flows) — keeps the water meter well-fed
  for (const [x, z] of [[FX + 3, FZ + 3], [FX + 8, FZ + 2], [FX + 9, FZ + 8], [FX + 2, FZ + 8], [FX + 8, FZ + 6]]) {
    srv.send(`setblock ${x} ${TY} ${z} minecraft:water 0 replace`);
  }
  await sleep(600);
}
async function buildCell() {
  const x = CELL.x, z = CELL.z;
  srv.send(`fill ${x - 2} ${TY - 5} ${z - 2} ${x + 2} ${TY + 10} ${z + 2} minecraft:air 0`);
  await sleep(800);
  srv.send(`fill ${x - 1} ${TY - 1} ${z - 1} ${x + 1} ${TY - 1} ${z + 1} minecraft:stone 0`);
  srv.send(`fill ${x - 1} ${TY} ${z - 1} ${x + 1} ${TY} ${z + 1} minecraft:dirt 0`);
  await sleep(700);
  srv.send(`fill ${x - 2} ${TY + 1} ${z - 2} ${x + 2} ${TY + 2} ${z + 2} minecraft:cobblestone 0`);
  srv.send(`fill ${x - 1} ${TY + 1} ${z - 1} ${x + 1} ${TY + 2} ${z + 1} minecraft:air 0`);
  await sleep(700);
}
async function buildFarm() {
  srv.send(`fill ${FARM.x0 - 1} ${TY - 5} ${FARM.z0 - 1} ${FARM.x1 + 1} ${TY + 15} ${FARM.z1 + 1} minecraft:air 0`);
  await sleep(800);
  srv.send(`fill ${FARM.x0} ${TY - 1} ${FARM.z0} ${FARM.x1} ${TY - 1} ${FARM.z1} minecraft:stone 0`);
  srv.send(`fill ${FARM.x0} ${TY} ${FARM.z0} ${FARM.x1} ${TY} ${FARM.z1} minecraft:farmland 7`);
  await sleep(700);
  const wx = Math.floor((FARM.x0 + FARM.x1) / 2), wz = Math.floor((FARM.z0 + FARM.z1) / 2);
  srv.send(`setblock ${wx} ${TY} ${wz} minecraft:water 0 replace`);
  for (let x = FARM.x0; x <= FARM.x1; x++) {
    for (let z = FARM.z0; z <= FARM.z1; z++) {
      if (x === wx && z === wz) continue;
      srv.send(`setblock ${x} ${TY + 1} ${z} minecraft:wheat 2 replace`);
    }
  }
  await sleep(900);
  // dry strip: dry farmland 0 + wheat — the freeze gate rows live here
  srv.send(`fill ${DRY.x0 - 1} ${TY - 5} ${DRY.z0 - 1} ${DRY.x1 + 1} ${TY + 15} ${DRY.z1 + 1} minecraft:air 0`);
  await sleep(700);
  srv.send(`fill ${DRY.x0} ${TY - 1} ${DRY.z0} ${DRY.x1} ${TY - 1} ${DRY.z1} minecraft:stone 0`);
  srv.send(`fill ${DRY.x0} ${TY} ${DRY.z0} ${DRY.x1} ${TY} ${DRY.z1} minecraft:farmland 0`);
  srv.send(`fill ${DRY.x0} ${TY + 1} ${DRY.z0} ${DRY.x1} ${TY + 1} ${DRY.z1} minecraft:wheat 2`);
  await sleep(900);
}

async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'livestockProductionR196', o.master ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
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
  await stageWorld({ kill: !!o.kill });
  return b;
}
async function stopBoot(n) {
  try { if (bot) bot.quit(); } catch (e) { /* noop */ }
  bot = null;
  const counts = L.rowCounts(srv.all.map(L.strip));
  const st = await srv.stop();
  const build = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  const rec = { n, exitCode: st.exitCode, exited: st.exited, build, counts };
  ev.stops.push(rec);
  log('stop' + n, 'exit=' + st.exitCode + ' build=' + build);
  srv = null;
  return rec;
}

function valueRows(from) {
  return since(from).filter((l) => /\[AILog\] livestock-value/.test(l)).map((l) => ({
    raw: l, entity: get(l, 'entity'), food: get(l, 'food'), water: get(l, 'water'),
    freedom: get(l, 'freedom'), counter: Number(get(l, 'counter')), milk: Number(get(l, 'milk')),
    feathers: get(l, 'feathers'), age: Number(get(l, 'age')),
  }));
}
function prodRows(from) {
  return since(from).filter((l) => /\[AILog\] production/.test(l)).map((l) => ({
    raw: l, kind: get(l, 'kind'), drop: get(l, 'drop'), counter: get(l, 'counter'),
    num: get(l, 'num'), grew: /grew=true/.test(l), entity: get(l, 'entity'),
  }));
}
function milkRows(from) {
  return since(from).filter((l) => /\[FarmLog\] milk src=cow/.test(l)).map((l) => ({
    raw: l, serve: / serve /.test(' ' + l + ' '), deny: / deny /.test(l),
    take: get(l, 'take'), meter: get(l, 'meter'), need: get(l, 'need'), entity: get(l, 'entity'),
  }));
}

async function bucketArm(label, gamemode) {
  await cmd(`gamemode ${gamemode} ${A}`, 600);
  await cmd(`clear ${A}`, 400);
  await cmd(`give ${A} minecraft:bucket 1`, 700);
  await equip('bucket');
  const cow = nearest('cow', 20);
  if (!cow) throw new Error('no cow entity near bot');
  await L.tp(srv, cow.position.x + 1.1, cow.position.y, cow.position.z + 0.95, { bot: A, wait: 900 });
  const cow2 = nearest('cow', 6) || cow;
  const from = srv.all.length;
  await bot.activateEntity(cow2);
  await sleep(1400);
  const rows = milkRows(from);
  const hand = (bot.heldItem || {}).name || null;
  const milkCount = bot.inventory.items().filter((i) => i.name === 'minecraft:milk_bucket' || i.name === 'milk_bucket').length;
  const bucketCount = bot.inventory.items().filter((i) => i.name === 'minecraft:bucket' || i.name === 'bucket').length;
  log(label, JSON.stringify({ rows: rows.length, serve: rows.filter((r) => r.serve).length, deny: rows.filter((r) => r.deny).length, hand, milkCount, bucketCount, sample: rows[0] && rows[0].raw.slice(0, 150) }));
  return { rows, hand, milkCount, bucketCount, row: rows[0] || null };
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith('2ee1b0e');
  ev.pins = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src') };
  ev.mk = L.mkCounts();
  const kb = L.cfgKeys(L.CFG);
  ev.cfgBefore = {
    bytes: cfgBefore.length, sha: L.sha256(cfgBefore), fileKeys: Object.keys(kb).length, codeKeys: countCodeKeys(),
    values: { livestockProductionR196: kb.livestockProductionR196, farmDebugLog: kb.farmDebugLog, mobDebugLog: kb.mobDebugLog, foodDebugLog: kb.foodDebugLog },
  };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfgCode=' + ev.cfgBefore.codeKeys + ' cfgFile=' + ev.cfgBefore.fileKeys);

  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ======================= boot 1: main ======================= */
  await startBoot(1, { master: true, kill: true });
  try {
    ev.arms.R0 = {
      boot: ev.boots[0], mk: ev.mk,
      cfg: { livestockProductionR196: L.cfgKeys(L.CFG).livestockProductionR196, farmDebugLog: L.cfgKeys(L.CFG).farmDebugLog, mobDebugLog: L.cfgKeys(L.CFG).mobDebugLog },
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    };
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 1500 });
    await buildPen();
    await buildCell();
    await buildFarm();

    const guardFrom = srv.all.length;
    srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 8.5} ${TY + 1} ${FZ + 2.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${FX + 9.5} ${TY + 1} ${FZ + 9.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:sheep ${FX + 2.5} ${TY + 1} ${FZ + 9.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:pig ${FX + 9.5} ${TY + 1} ${FZ + 6.5} {NoAI:1b,PersistenceRequired:1b}`);
    srv.send(`summon minecraft:chicken ${CELL.x + 0.5} ${TY + 1} ${CELL.z + 0.5} {NoAI:1b,PersistenceRequired:1b}`);
    await sleep(3500);
    const wallRows = since(guardFrom).filter((l) => /inWall/.test(l));
    ev.pen = {
      inWallRows: wallRows.length, sample: wallRows.slice(0, 2),
      entities: Object.values(bot.entities || {}).filter((e) => e && e.name && /cow|sheep|chicken|pig/i.test(e.name)).map((e) => e.name),
    };
    log('pen', JSON.stringify(ev.pen.entities) + ' inWall=' + wallRows.length);
    if (wallRows.length) throw new Error('pen animals suffocating (inWall) — staging broken');

    /* ---------------- R1 serve / R2 deny / R3 creative ---------------- */
    ev.arms.R1 = await bucketArm('R1', 0);
    await cmd(`give ${A} minecraft:milk_bucket 1`, 600);
    const giveFrom = srv.all.length;
    srv.send(`give ${A} minecraft:milk_bucket 1`);
    await sleep(600);
    ev.arms.R1.giveRow = since(giveFrom).find((l) => /Given|milk_bucket/i.test(l)) || '';
    await cmd(`clear ${A}`, 400);
    srv.send(`etest prod ${A} 12 milk=0`);    // pin the deny meter at exactly 0
    await sleep(800);
    ev.arms.R2 = await bucketArm('R2', 0);
    srv.send(`etest prod ${A} 12 milk=100`);   // R3 seed: full meter again
    await sleep(900);
    ev.arms.R3 = await bucketArm('R3', 1);
    await cmd(`gamemode 1 ${A}`, 500);
    await cmd(`clear ${A}`, 400);

    /* ---------------- R4 milk meter regrowth (natural passes) ---------------- */
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 900 });
    const r4mark = srv.all.length;
    srv.send(`etest prod ${A} 12 milk=20`);
    await sleep(1000);
    ev.arms.R4 = { seedRow: since(r4mark).find((l) => /\[FarmLog\] prod /.test(l)) || '', dumps: [] };
    ev.arms.R4.dumps.push(await nbtDump(`@e[type=cow,x=${FX},y=${TY - 1},z=${FZ},dx=12,dy=6,dz=12]`));
    const r4deadline = Date.now() + 150000;
    while (Date.now() < r4deadline && ev.arms.R4.dumps.length < 3) {
      await sleep(60000);
      const d = await nbtDump(`@e[type=cow,x=${FX},y=${TY - 1},z=${FZ},dx=12,dy=6,dz=12]`);
      ev.arms.R4.dumps.push(d);
    }
    ev.arms.R4.milkSeq = ev.arms.R4.dumps.map((d) => (d[0] ? d[0].milk : null));
    ev.arms.R4.rowSeq = valueRows(r4mark).filter((r) => r.entity && /Cow/.test(r.entity)).map((r) => r.milk);
    ev.arms.R4.rose = ev.arms.R4.milkSeq.length >= 2 && ev.arms.R4.milkSeq[ev.arms.R4.milkSeq.length - 1] > ev.arms.R4.milkSeq[0];
    ev.arms.R4.monotonic = ev.arms.R4.milkSeq.every((m, i, a) => i === 0 || m === null || a[i - 1] === null || m >= a[i - 1]);
    log('R4', JSON.stringify({ seq: ev.arms.R4.milkSeq, rose: ev.arms.R4.rose, rows: ev.arms.R4.rowSeq, seed: ev.arms.R4.seedRow.slice(0, 140) }));

    /* ---------------- R5 egg pump ---------------- */
    let f = srv.all.length;
    srv.send(`etest prod ${A} 12 counter=200 step=600`);
    await sleep(2600);
    const r5prod = prodRows(f);
    ev.arms.R5 = {
      echo: since(f).find((l) => /\[FarmLog\] prod /.test(l)) || '',
      eggRows: r5prod.filter((r) => r.kind === 'egg'),
      featherRows: r5prod.filter((r) => r.kind === 'feather'),
      eggItem: await testfor(penSel('item'), '{Item:{id:"minecraft:egg",Count:1b}}'),
    };
    log('R5', JSON.stringify({ eggs: ev.arms.R5.eggRows.length, eggItem: ev.arms.R5.eggItem.ok, feather: ev.arms.R5.featherRows.length }));

    /* ---------------- R6 feather pump ---------------- */
    f = srv.all.length;
    srv.send(`etest prod ${A} 12 counter=200 step=600`);
    await sleep(2000);
    const r6egg = prodRows(f);
    f = srv.all.length;
    srv.send(`etest prod ${A} 12 counter=100 feather=2 step=2000`);
    await sleep(3200);
    const r6rows = prodRows(f);
    ev.arms.R6 = {
      eggControl: r6egg.filter((r) => r.kind === 'egg').length,
      featherDrops: r6rows.filter((r) => r.kind === 'feather' && /drop=1/.test(r.raw)),
      featherGrows: r6rows.filter((r) => r.kind === 'feather' && r.grew),
      featherItem: await testfor(penSel('item'), '{Item:{id:"minecraft:feather",Count:1b}}'),
      echo: since(f).find((l) => /\[FarmLog\] prod /.test(l)) || '',
    };
    log('R6', JSON.stringify({ eggControl: ev.arms.R6.eggControl, fd: ev.arms.R6.featherDrops.length, fg: ev.arms.R6.featherGrows.length, item: ev.arms.R6.featherItem.ok }));

    /* ---------------- R7 feather meter growth ---------------- */
    await cmd(`etest prod ${A} 12 feather=2`, 900);   // force max=2 on every chicken
    f = srv.all.length;
    srv.send(`etest prod ${A} 12 counter=100 feather=1 step=2000`);
    await sleep(3200);
    const r7 = prodRows(f);
    ev.arms.R7 = {
      grewRows: r7.filter((r) => r.kind === 'feather' && r.grew),
      dropRows: r7.filter((r) => r.kind === 'feather' && /drop=1/.test(r.raw)),
      echo: since(f).find((l) => /\[FarmLog\] prod /.test(l)) || '',
    };
    log('R7', JSON.stringify({ grew: ev.arms.R7.grewRows.length, drops: ev.arms.R7.dropRows.length, sample: ev.arms.R7.grewRows[0] && ev.arms.R7.grewRows[0].raw.slice(0, 130) }));

    /* ---------------- R8 sheep/pig empty production + counter reset ---------------- */
    const r8mark = srv.all.length;
    srv.send(`etest prod ${A} 12 counter=50`);
    await sleep(900);
    ev.arms.R8 = {
      seedRow: since(r8mark).find((l) => /\[FarmLog\] prod /.test(l)) || '',
      pre: await nbtDump(`@e[type=sheep,x=${FX},y=${TY - 1},z=${FZ},dx=12,dy=6,dz=12]`),
      prePig: await nbtDump(`@e[type=pig,x=${FX},y=${TY - 1},z=${FZ},dx=12,dy=6,dz=12]`),
    };
    await sleep(12000);   // >2 production passes at 20 TPS
    ev.arms.R8.post = await nbtDump(`@e[type=sheep,x=${FX},y=${TY - 1},z=${FZ},dx=12,dy=6,dz=12]`);
    ev.arms.R8.postPig = await nbtDump(`@e[type=pig,x=${FX},y=${TY - 1},z=${FZ},dx=12,dy=6,dz=12]`);
    ev.arms.R8.prodSheepPig = since(r8mark).filter((l) => /\[AILog\] production/.test(l) && /src=(sheep|pig)/.test(l)).length;
    ev.arms.R8.valueRows = valueRows(r8mark).filter((r) => /Sheep|Pig/.test(r.entity || '')).map((r) => ({ entity: r.entity, counter: r.counter }));
    log('R8', JSON.stringify({ pre: ev.arms.R8.pre, post: ev.arms.R8.post, prePig: ev.arms.R8.prePig, postPig: ev.arms.R8.postPig, prod: ev.arms.R8.prodSheepPig }));

    /* ---------------- R9-1 vanilla egg lane silence ---------------- */
    srv.send('kill @e[type=item]');
    await sleep(700);
    const eggBefore = await testfor(penSel('item'), '{Item:{id:"minecraft:egg",Count:1b}}');
    const eggDumpBefore = await nbtDump(penSel('chicken'));
    const setRows = await entitydataAll(penSel('chicken'), '{EggLayTime:1000}');
    await sleep(4000);
    const eggAfter = await testfor(penSel('item'), '{Item:{id:"minecraft:egg",Count:1b}}');
    const eggDumpAfter = await nbtDump(penSel('chicken'));
    ev.arms.R9vanilla = {
      eggBefore: eggBefore.raw, eggAfter: eggAfter.raw, eggAppeared: eggAfter.ok && !eggBefore.ok,
      eggBeforeValues: eggDumpBefore.map((r) => r.egg), eggAfterValues: eggDumpAfter.map((r) => r.egg),
      eggItemsBefore: eggBefore.ok, eggItemsAfter: eggAfter.ok, setRows,
    };
    log('R9-1', JSON.stringify({ eggBefore: eggBefore.ok, eggAfter: eggAfter.ok, before: ev.arms.R9vanilla.eggBeforeValues, after: ev.arms.R9vanilla.eggAfterValues, set: setRows.length }));

    /* ---------------- R10 seed (no-grass cell, food 0 -> never well) ---------------- */
    await L.tp(srv, CELL.x + 0.5, TY + 1, CELL.z + 1.5, { bot: A, wait: 900 });
    const r10seedFrom = srv.all.length;
    srv.send(`etest prod ${A} 3 feather=2`);
    await sleep(800);
    srv.send(`etest prod ${A} 3 counter=42 milk=60 feather=0`);
    await sleep(800);
    await chat('etest livemano 3 0.0', 1600);
    ev.arms.R10seed = {
      rows: since(r10seedFrom).filter((l) => /\[FarmLog\] prod |livemano/.test(l)),
      valueSample: valueRows(r10seedFrom).filter((r) => /Chicken/.test(r.entity || '')).slice(0, 2),
    };
    log('R10-seed', JSON.stringify({ rows: ev.arms.R10seed.rows.length, sample: ev.arms.R10seed.rows.map((s) => s.slice(0, 120)) }));

    /* ---------------- R11 zero regression ---------------- */
    ev.arms.R11 = {};
    await L.tp(srv, FARM.x0 + 4.5, TY + 2, FARM.z0 + 4.5, { bot: A, wait: 1200 });
    // live manure face (pen animals)
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 800 });
    f = srv.all.length;
    await chat('etest livemano 8', 2200);
    ev.arms.R11.manure = since(f).filter((l) => /\[FarmLog\] manure src=livestock/.test(l));
    // farm growth + dry gate
    await L.tp(srv, FARM.x0 + 4.5, TY + 3, FARM.z0 + 4.5, { bot: A, wait: 1200 });
    await cmd('gamerule randomTickSpeed 60', 400);
    f = srv.all.length;
    await sleep(14000);
    const farmRows = since(f);
    ev.arms.R11.wetRate = farmRows.filter((l) => /\[FarmLog\] growth rate/.test(l)).length;
    ev.arms.R11.wetRateSample = farmRows.find((l) => /\[FarmLog\] growth rate/.test(l)) || '';
    ev.arms.R11.dryGate = farmRows.filter((l) => /\[FarmLog\] growth gate dry/.test(l)).length;
    ev.arms.R11.dryGateSample = farmRows.find((l) => /\[FarmLog\] growth gate dry/.test(l)) || '';
    await cmd('gamerule randomTickSpeed 3', 400);
    // drought roll on a dry-strip crop
    const dx = DRY.x0 + 2, dz = DRY.z0 + 2;
    f = srv.all.length;
    srv.send(`etest drought roll ${dx} ${TY + 1} ${dz} 1.0`);
    await sleep(1200);
    ev.arms.R11.drought = since(f).filter((l) => /\[FarmLog\] drought/.test(l));
    log('R11-farm', JSON.stringify({ manure: ev.arms.R11.manure.length, wet: ev.arms.R11.wetRate, dry: ev.arms.R11.dryGate, drought: ev.arms.R11.drought.length }));

    // 27-token sweep on a dedicated flat platform (kept >12 from the pen so no
    // /etest prod or livemano radius reaches the judged animals)
    const TS = { x: 276, z: 845 };
    srv.send(`fill ${TS.x - 3} ${TY - 5} ${TS.z - 3} ${TS.x + 3} ${TY + 15} ${TS.z + 3} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${TS.x - 2} ${TY - 1} ${TS.z - 2} ${TS.x + 2} ${TY - 1} ${TS.z + 2} minecraft:stone 0`);
    await sleep(600);
    await cmd(`setblock ${TS.x} ${TY} ${TS.z} minecraft:stone 0`, 400);
    await cmd(`summon minecraft:cow ${TS.x + 1.5} ${TY} ${TS.z + 1.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b}`, 700);
    await cmd(`give ${A} minecraft:iron_sword 1`, 600);
    await L.tp(srv, TS.x - 0.5, TY, TS.z + 0.5, { bot: A, wait: 900 });
    const tokens = [
      'etest hold minecraft:iron_sword', 'etest food 20 20', 'etest hunger 20 20',
      'etest health 20', 'etest level 5', 'etest debt 3',
      'etest enchant mainhand 3', 'etest enchantprobe mainhand',
      'etest blockprobe', 'etest hurt 2', 'etest attack @e[type=cow,limit=1]',
      'etest dig ' + TS.x + ' ' + TY + ' ' + TS.z,
      'etest useblock ' + TS.x + ' ' + TY + ' ' + TS.z,
      'etest useitem', 'etest damage 1', 'etest quality fine',
      'etest anvilwear ' + TS.x + ' ' + TY + ' ' + TS.z,
      'etest release', 'etest hold etim:manure',
      'etest fishgate 6000', 'etest fishretract', 'etest fishprobe type 10',
      'etest arrowprobe recovery iron 1 10', 'etest livemano 8', 'etest chestio peek',
      'etest', 'etest drought probe ' + (FARM.x0 + 2) + ' ' + (TY + 1) + ' ' + (FARM.z0 + 2),
    ];
    ev.arms.R11.tokens = [];
    for (const t of tokens) {
      const ff = srv.all.length;
      await chat(t, 700);
      ev.arms.R11.tokens.push({ cmd: t, lines: since(ff).filter((l) => /\[EtimTest\]|\[TestLog\]|Exception|Error|FAILED|Unknown command/.test(l)).slice(0, 3) });
    }
    ev.arms.R11.tokenCount = tokens.length;
    ev.arms.R11.tokenErrors = srv.all.map(L.strip).filter((l) => /\[TestLog\] step=\S+ player=\S+ FAILED=|java\.lang\.\w*Exception|java\.lang\.\w*Error|Unknown command/.test(l));
    ev.arms.R11.channels = L.rowCounts(srv.all.map(L.strip));
    ev.arms.R11.channelRows = {
      melee: srv.all.map(L.strip).filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: srv.all.map(L.strip).filter((l) => /\[MiningLog\]/.test(l)).length,
      butch: srv.all.map(L.strip).filter((l) => /\[ButchLog\]/.test(l)).length,
      arrow: srv.all.map(L.strip).filter((l) => /\[ArrowLog\]/.test(l)).length,
      cap: srv.all.map(L.strip).filter((l) => /\[CapLog\]/.test(l)).length,
      ench: srv.all.map(L.strip).filter((l) => /\[EnchantLog\]/.test(l)).length,
      damage: srv.all.map(L.strip).filter((l) => /\[DamageLog\]/.test(l)).length,
      food: srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).length,
      farm: srv.all.map(L.strip).filter((l) => /\[FarmLog\]/.test(l)).length,
    };
    log('R11-token', 'n=' + tokens.length + ' errors=' + ev.arms.R11.tokenErrors.length + ' channels=' + JSON.stringify(ev.arms.R11.channelRows));
    await cmd('gamerule randomTickSpeed 3', 300);
    await cmd('gamerule doDaylightCycle true', 300);

    /* ---------------- R12 pre-stop surface ---------------- */
    const k1 = L.cfgKeys(L.CFG);
    ev.arms.R12 = { codeKeys: countCodeKeys(), fileKeys: Object.keys(k1).length, values: { livestockProductionR196: k1.livestockProductionR196, farmDebugLog: k1.farmDebugLog, mobDebugLog: k1.mobDebugLog } };
    log('R12-pre', JSON.stringify(ev.arms.R12));

    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 2: master off + R10 readback ======================= */
  try {
    await startBoot(2, { master: false, kill: false });
    await L.tp(srv, CELL.x + 0.5, TY + 1, CELL.z + 1.5, { bot: A, wait: 1500 });
    /* R10 readback: the isolated cell chicken keeps food 0 (no grass) -> never
       well -> the production counter stays frozen at 42; the NBT dump reads
       counter/milk/feathers straight out of the capability after the restart. */
    const r10mark = srv.all.length;
    ev.arms.R10 = { dumps: [] };
    for (let i = 0; i < 3; i++) {
      await sleep(i === 0 ? 3000 : 6000);
      ev.arms.R10.dumps.push(await nbtDump(cellSel('chicken')));
    }
    ev.arms.R10.valueRows = valueRows(r10mark).filter((r) => /Chicken/.test(r.entity || '')).map((r) => ({ entity: r.entity, counter: r.counter, milk: r.milk, feathers: r.feathers, food: r.food, age: r.age }));
    log('R10-read', JSON.stringify({ dumps: ev.arms.R10.dumps, rows: ev.arms.R10.valueRows.slice(0, 3) }));

    /* R9-2: master off -> vanilla egg lane + infinite milk, zero production rows */
    const offMark = srv.all.length;
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 900 });
    await cmd('kill @e[type=item]', 700);
    const eggOffBefore = await testfor(penSel('item'), '{Item:{id:"minecraft:egg",Count:1b}}');
    const eggOffDumpBefore = await nbtDump(penSel('chicken'));
    const setOff = await entitydataAll(penSel('chicken'), '{EggLayTime:100}');
    await sleep(14000);
    const eggOffAfter = await testfor(penSel('item'), '{Item:{id:"minecraft:egg",Count:1b}}');
    const eggOffDumpAfter = await nbtDump(penSel('chicken'));
    const offMilk = await bucketArm('R9-off-milk', 0);
    ev.arms.R9off = {
      eggBefore: eggOffBefore.raw, eggAfter: eggOffAfter.raw, vanillaEgg: eggOffAfter.ok && !eggOffBefore.ok,
      eggBeforeValues: eggOffDumpBefore.map((r) => r.egg), eggAfterValues: eggOffDumpAfter.map((r) => r.egg),
      setRows: setOff,
      milkRows: offMilk.rows.map((r) => r.raw), hand: offMilk.hand, milkCount: offMilk.milkCount,
      prodRows: since(offMark).filter((l) => /\[AILog\] production/.test(l)).length,
    };
    log('R9-off', JSON.stringify({ vanillaEgg: ev.arms.R9off.vanillaEgg, eggs: [ev.arms.R9off.eggBeforeValues, ev.arms.R9off.eggAfterValues], milkRows: offMilk.rows.length, hand: offMilk.hand, prod: ev.arms.R9off.prodRows }));
    await cmd('gamerule randomTickSpeed 3', 300);
    ev.stop2 = await stopBoot(2);
  } catch (e) {
    log('B2-FAIL', (e && e.stack) || e);
    ev.b2Error = String((e && e.stack) || e);
    try { if (srv) ev.stop2 = await stopBoot(2); } catch (e2) { ev.stop2Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 3: master on restore ======================= */
  try {
    await startBoot(3, { master: true, kill: false });
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: A, wait: 1200 });
    ev.arms.R9on = { boot: ev.boots[2], cfg: { livestockProductionR196: L.cfgKeys(L.CFG).livestockProductionR196, codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length } };
    // freeze re-armed: seed a low EggLayTime and re-read the pin from the live NBT
    ev.arms.R9on.before = await nbtDump(penSel('chicken'));
    await entitydataAll(penSel('chicken'), '{EggLayTime:1000}');
    await sleep(5000);
    ev.arms.R9on.after = await nbtDump(penSel('chicken'));
    ev.arms.R9on.pinned = ev.arms.R9on.after.length > 0 && ev.arms.R9on.after.every((r) => r.egg >= 9999);
    log('R9-on', JSON.stringify({ before: ev.arms.R9on.before.map((r) => r.egg), after: ev.arms.R9on.after.map((r) => r.egg), pinned: ev.arms.R9on.pinned }));
    await cmd('gamerule randomTickSpeed 3', 300);
    await cmd('gamerule doDaylightCycle true', 300);
    ev.stop3 = await stopBoot(3);
  } catch (e) {
    log('B3-FAIL', (e && e.stack) || e);
    ev.b3Error = String((e && e.stack) || e);
    try { if (srv) ev.stop3 = await stopBoot(3); } catch (e2) { ev.stop3Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= closure ======================= */
  try {
    L.setCfgValue(L.CFG, 'livestockProductionR196', 'true');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    // the batch smoke's scratch world (f10pg) is a sibling leftover — same cleanup
    try { fs.rmSync(path.join(L.ROOT, 'run', 'f10pg'), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(), values: { livestockProductionR196: k.livestockProductionR196, farmDebugLog: k.farmDebugLog, mobDebugLog: k.mobDebugLog, foodDebugLog: k.foodDebugLog } };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, L.PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, L.PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, L.PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', '2ee1b0e..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
    ev.worldsLeft = fs.readdirSync(path.join(L.ROOT, 'run')).filter((n) => /^f10/.test(n));
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
