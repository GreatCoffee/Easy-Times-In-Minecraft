#!/usr/bin/env node
/**
 * f11-b13-verify.js — W-B13 judgment window (B-13 blight batch, independent run).
 *
 * Boot 1 (blightR196=true):
 *   R0  clean boot + pin (jar/refmap/mixins/jar-entries/cfg keys), mixinFail 0
 *   R1  bit-8 round-trip: setblock wheat age3 -> /etest blight set 1 ->
 *       testforblock meta 11 + probe blighted=1; farmland probe seat=0 + set skip
 *   R2  F-C shape: probe open vs fully-covered cell -> lowLightP ratio
 *       (covered/open) inside 16 +/- 1.5; covered tight-window roll never sets
 *   R3  F-B blood-moon tool: open dice -> hit=1 lightOk=1 -> meta 11 + probe=1;
 *       covered 20 dice -> lightOk=0 every time, never sets
 *   R4  bone meal double-split: blighted -> 1 unblight row, 1 of 3 consumed,
 *       meta back to 3; non-blighted -> 0 rows, 0 consumed, meta still 3
 *   R5  F-A random-tick window (rts=512): inner 3x3 seeded -> dead1of64>=1,
 *       src=spread>=1, targets>=1; mature age7 -> dead_crop + age 6
 *   R5b noDrops: blighted break -> src=noDrops row 1; healthy break -> 0
 *   R5c dead crop (etim:dead_crop) emits no blight row at rts=512
 * Boot 2 (blightR196=false):
 *   R6  master=0; force-set bit still lands (meta 11) but 0 blight tick rows at
 *       rts=512 8 s; vanilla bone meal grows age 3 -> 4..7 and consumes 1;
 *       blighted break -> no noDrops row (all vanilla)
 *
 * Port gate: die-loud abort if 25565 stays held (no collide boot, no retry storm).
 * World: w-b13v (props level-name + allow-flight=true snapshotted/restored).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'b13-verify';
const WORLD = 'w-b13v';
const A = 'ETIM_F7';
const TY = 100;
const P0 = { x: 300, z: 840 };

const OPEN = { x0: 303, z0: 843, n: 5 };
const HUT = { x0: 310, z0: 849, n: 7 };
const OO = { x: 305, y: TY + 1, z: 845 };
const CC = { x: 313, y: TY + 1, z: 852 };
const OO_STAND = { x: 305, y: TY + 1, z: 847 };
const CC_STAND = { x: 313, y: TY + 1, z: 850 };

/* B-13 pins (task book W-B13 §一). */
const B13 = {
  head: 'd482d57',
  rel: { bytes: 1030513, sha: 'B0B66380E108B5205BC48D4126D083713F50A4E3581AAFDC3A526F369C4AFBAD' },
  dev: { bytes: 1010465, sha: 'A5E8A5252EFA423A99093CF590CEC6A5EC2A35E65501F13862D7EBFBADF8E375' },
  src: { bytes: 937264, sha: 'D9C429C7DA10CC3B9189190891238408C342DAD838B7C22BADBDB2C192597C61' },
  refmap: { classes: 84, entries: 189, dual: 378 },
  mixins: 80,
  client: 10,
};

const sleep = L.sleep;
const log = L.log;
const sha256 = L.sha256;
let srv = null;
let bot = null;
const ev = { tag: TAG, startedAt: new Date().toISOString(), world: WORLD, boots: [], stops: [], arms: {} };

const since = (n) => srv.all.slice(n).map(L.strip);
const nAt = () => srv.all.length;
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };

function parseKV(line) {
  const o = {};
  const re = /(\w+)=([^\s]+)/g;
  let m;
  while ((m = re.exec(line))) o[m[1]] = m[2];
  return o;
}
const farmLines = (n) => since(n).filter((l) => /^\[FarmLog\]/.test(l));
const blightLines = (n) => farmLines(n).filter((l) => /\] blight /.test(l));
const findRow = (raw, sub) => raw.find((l) => l.includes(sub));
const keyOf = (p) => p.x + ',' + p.y + ',' + p.z;

async function blight(op, pos, extra, wait) {
  const from = nAt();
  await cmd(`etest blight ${op} ${pos.x} ${pos.y} ${pos.z}${extra ? ' ' + extra : ''}`, wait || 900);
  const raw = farmLines(from);
  return { from, raw, objs: raw.map(parseKV) };
}
async function probeAt(pos) {
  const r = await blight('probe', pos);
  const line = findRow(r.raw, 'blight probe');
  return { raw: r.raw, kv: line ? parseKV(line) : null };
}
async function blightCell(pos, val, wait) {
  srv.send(`etest blight set ${pos.x} ${pos.y} ${pos.z} ${val}`);
  await sleep(wait || 120);
}

async function holdBonemeal(n) {
  await cmd(`clear ${A} minecraft:dye 15`, 500);
  await cmd('gamemode 0 ' + A, 700);
  await cmd(`replaceitem entity ${A} slot.hotbar.0 minecraft:dye ${n} 15`, 700);
  await bot.setQuickBarSlot(0);
  await sleep(400);
}
async function drainBonemeal() {
  const from = nAt();
  srv.send(`clear ${A} minecraft:dye 15`);
  await sleep(700);
  const m = /(?:Removed|removing) (\d+) items?/.exec(since(from).join(' '));
  return m ? parseInt(m[1], 10) : 0;
}
async function useBonemealAt(pos) {
  await L.lookAtBlock(bot, pos.x, pos.y, pos.z);
  await sleep(280);
  const from = nAt();
  L.useBlock(srv, pos.x, pos.y, pos.z, A);
  await sleep(1000);
  return from;
}

async function buildFarm() {
  await L.stage(srv, bot, { gamemode: 1, noPhysics: true, rts: 3 });
  await L.tp(srv, P0.x + 6, TY + 5, P0.z + 6, { bot: A, wait: 1600 });
  await cmd('kill @e[type=!player]', 1200);
  await cmd(`fill ${P0.x - 4} ${TY - 2} ${P0.z - 4} ${P0.x + 18} ${TY - 2} ${P0.z + 18} minecraft:cobblestone 0`, 700);
  await cmd(`fill ${P0.x - 4} ${TY - 1} ${P0.z - 4} ${P0.x + 18} ${TY + 5} ${P0.z + 18} minecraft:air 0`, 900);
  await cmd(`fill ${P0.x - 4} ${TY - 1} ${P0.z - 4} ${P0.x + 18} ${TY - 1} ${P0.z + 18} minecraft:cobblestone 0`, 800);
  await cmd(`fill ${P0.x - 4} ${TY} ${P0.z - 4} ${P0.x + 18} ${TY} ${P0.z + 18} minecraft:farmland 7`, 900);
  await cmd(`fill ${P0.x - 4} ${TY} 842 ${P0.x + 18} ${TY} 842 minecraft:water 0`, 700);
  await cmd(`fill ${P0.x - 4} ${TY} 848 ${P0.x + 18} ${TY} 848 minecraft:water 0`, 700);
  await cmd(`fill ${P0.x - 4} ${TY} 856 ${P0.x + 18} ${TY} 856 minecraft:water 0`, 700);
  await cmd(`fill ${HUT.x0 - 1} ${TY + 1} ${HUT.z0 - 1} ${HUT.x0 + HUT.n} ${TY + 2} ${HUT.z0 + HUT.n} minecraft:cobblestone 0`, 800);
  await cmd(`fill ${HUT.x0} ${TY + 1} ${HUT.z0} ${HUT.x0 + HUT.n - 1} ${TY + 2} ${HUT.z0 + HUT.n - 1} minecraft:air 0`, 700);
  await cmd(`fill ${HUT.x0 - 1} ${TY + 3} ${HUT.z0 - 1} ${HUT.x0 + HUT.n} ${TY + 3} ${HUT.z0 + HUT.n} minecraft:cobblestone 0`, 800);
  await cmd(`fill ${OPEN.x0 - 1} ${TY + 1} ${OPEN.z0 - 1} ${OPEN.x0 + OPEN.n} ${TY + 5} ${OPEN.z0 + OPEN.n} minecraft:air 0`, 600);
  const cells = [];
  for (let dx = 0; dx < OPEN.n; dx++) for (let dz = 0; dz < OPEN.n; dz++) {
    cells.push({ x: OPEN.x0 + dx, y: TY + 1, z: OPEN.z0 + dz, plot: 'O' });
  }
  for (let dx = 0; dx < HUT.n; dx++) for (let dz = 0; dz < HUT.n; dz++) {
    cells.push({ x: HUT.x0 + dx, y: TY + 1, z: HUT.z0 + dz, plot: 'C' });
  }
  for (const c of cells) await cmd(`setblock ${c.x} ${c.y} ${c.z} minecraft:wheat 3 0`, 90);
  return cells;
}

/* ---------------------------------------------------------------- pin faces */
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
function countCodeKeys() {
  const s = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java'), 'utf8');
  const re = /config\.get(?:Boolean|Int|Float|String)\s*\(\s*"([A-Za-z0-9_]+)"/g;
  const set = new Set(); let m;
  while ((m = re.exec(s))) set.add(m[1]);
  return set.size;
}
function filePin(f, pin) {
  const b = fs.readFileSync(f);
  const sha = sha256(b);
  return { bytes: b.length, sha, ok: b.length === pin.bytes && sha === pin.sha };
}
function refmapFacts() {
  const a = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json'), 'utf8').replace(/^\uFEFF/, ''));
  const b = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json'), 'utf8').replace(/^\uFEFF/, ''));
  const cnt = (r) => ({ classes: Object.keys(r.mappings).length, entries: Object.values(r.mappings).reduce((s, x) => s + Object.keys(x).length, 0) });
  const ca = cnt(a); const cb = cnt(b);
  const tickMap = JSON.stringify(a.mappings['io/github/etim/etim/mixins/MixinBlockCropsTick'] || {});
  const cropsMap = a.mappings['io/github/etim/etim/mixins/MixinBlockCrops'] || {};
  return {
    a: ca, b: cb, same: ca.classes === cb.classes && ca.entries === cb.entries,
    tickUpdateTick: /updateTick/.test(tickMap),
    cropsKeys: Object.keys(cropsMap),
    cropsMissingRemap: ['canGrow', 'canUseBonemeal', 'grow', 'getDrops'].filter((k) => !Object.keys(cropsMap).some((x) => x.split('(')[0] === k)),
  };
}
function lineNo(file, sub, nth) {
  try {
    const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let hit = 0;
    for (let i = 0; i < rows.length; i++) if (rows[i].includes(sub)) { hit++; if (hit === (nth || 1)) return i + 1; }
  } catch (e) { /* noop */ }
  return null;
}

/* ------------------------------------------------------------------- boots */
function jvmGradleCount() {
  for (const sh of ['pwsh', 'powershell']) {
    try {
      const c = "(Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" | Where-Object { $_.CommandLine -match 'GradleStart' } | Measure-Object).Count";
      return String(execFileSync(sh, ['-NoProfile', '-Command', c], { encoding: 'utf8' })).trim();
    } catch (e) { /* next shell */ }
  }
  return 'n/a';
}

async function gatePort(n) {  for (let i = 0; i < 120; i++) {
    const held = L.netstatListen(L.PORT);
    if (held === 0) { log('port', 'b' + n + ' free=true'); return; }
    await sleep(500);
  }
  const held = L.netstatListen(L.PORT);
  ev.portAbort = { boot: n, held };
  log('port', 'HELD ' + held + ' before b' + n + ' — die-loud abort');
  throw new Error('port 25565 held before boot ' + n + ' (die-loud, no collide boot)');
}

async function startBoot(n, blightFlag) {
  L.setCfgValue(L.CFG, 'blightR196', blightFlag ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'growthRateR196', 'true');
  await gatePort(n);
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b' + n });
  const ok = await srv.waitFor(/Done \(/, 480000);
  if (!ok) {
    const bindFail = srv.all.some((l) => /FAILED TO BIND TO PORT|Address already in use/.test(l));
    log('boot' + n, 'no Done( bind=' + bindFail + ' — abort');
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
    throw new Error('no Done( for boot ' + n);
  }
  const b = {
    n,
    boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(),
    mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure|require.*not found/i.test(l)).length,
    needsFlag: blightFlag ? 'true' : 'false',
  };
  ev.boots.push(b);
  log('boot' + n, b.boot + ' mixinFail=' + b.mixinFail + ' blightR196=' + b.needsFlag);
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
  log('stop' + n, 'exit=' + rec.exitCode + ' build=' + rec.build);
  srv = null;
  return rec;
}

/* -------------------------------------------------------------------- R1..R6 */
async function armR1() {
  const a = {};
  a.probeBefore = (await probeAt(OO)).kv;
  await cmd(`setblock ${OO.x} ${OO.y} ${OO.z} minecraft:wheat 3 0`, 400);
  const fromSet = nAt();
  await blightCell(OO, 1, 900);
  a.setRows = blightLines(fromSet).filter((l) => /src=forceSet/.test(l));
  a.probeAfter = (await probeAt(OO)).kv;
  a.meta11 = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 11);
  a.metaBare3 = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 3);
  const farm = { x: OO.x, y: TY, z: OO.z };
  a.farmProbe = (await probeAt(farm)).kv;
  const skip = await blight('set', farm, '1');
  a.farmSkipRow = findRow(skip.raw, 'skip');
  log('R1', 'before=' + (a.probeBefore && a.probeBefore.blighted)
    + ' after=' + (a.probeAfter && a.probeAfter.blighted)
    + ' meta11=' + a.meta11.ok + ' meta3=' + a.metaBare3.ok
    + ' farmSeat=' + (a.farmProbe && a.farmProbe.seat) + ' farmSkip=' + !!a.farmSkipRow);
  return a;
}

async function armR2() {
  const a = {};
  a.probeOpen = (await probeAt(OO)).kv;
  a.probeCovered = (await probeAt(CC)).kv; // prints blv/p even on air
  // covered tight-window roll (seat refreshed in place; the dark seat pops on
  // its own slow random tick, so a pop race only costs one retry)
  a.coverRolls = []; a.coverSeatSkips = 0;
  for (let i = 0; i < 3; i++) {
    await cmd(`setblock ${CC.x} ${CC.y} ${CC.z} minecraft:wheat 3 0`, 130);
    const r = await blight('roll', CC, null, 320);
    if (findRow(r.raw, 'skip-not-seat')) { a.coverSeatSkips++; continue; }
    const line = findRow(r.raw, 'src=forceLowLight');
    if (line) a.coverRolls.push(parseKV(line));
    if (a.coverRolls.length) break;
  }
  a.rollCovered = a.coverRolls[0] || null;
  const roLine = findRow((await blight('roll', OO)).raw, 'src=forceLowLight');
  a.rollOpen = roLine ? parseKV(roLine) : null;
  a.pOpen = parseFloat((a.rollOpen && a.rollOpen.p) || (a.probeOpen && a.probeOpen.lowLightP));
  a.pCovered = parseFloat((a.rollCovered && a.rollCovered.p) || (a.probeCovered && a.probeCovered.lowLightP));
  a.ratioCoveredOverOpen = a.pOpen > 0 ? a.pCovered / a.pOpen : null;
  a.ratioTaskForm = (a.pCovered > 0) ? a.pOpen / a.pCovered : null; // task-book literal (1-blvO/16)/(1-blvC/16)
  a.ratioOk = a.ratioCoveredOverOpen !== null && Math.abs(a.ratioCoveredOverOpen - 16) <= 1.5;
  a.probeAfterCoveredRoll = (await probeAt(CC)).kv;
  a.coverRollSet = a.probeAfterCoveredRoll ? a.probeAfterCoveredRoll.blighted : null;
  log('R2', 'blv=' + (a.probeOpen && a.probeOpen.blv) + '/' + (a.probeCovered && a.probeCovered.blv)
    + ' pOpen=' + a.pOpen + ' pCovered=' + a.pCovered
    + ' ratioC/O=' + a.ratioCoveredOverOpen + ' ratioTask=' + a.ratioTaskForm
    + ' coveredHit=' + (a.rollCovered && a.rollCovered.hit)
    + ' coveredSetAfter=' + a.coverRollSet + ' skips=' + a.coverSeatSkips);
  return a;
}

async function armR3() {
  const a = { openDice: [], coverDice: [], coverSeatSkips: 0 };
  let hit = null;
  for (let i = 0; i < 40 && !hit; i++) {
    const r = await blight('roll', OO, '1', 750);
    const line = findRow(r.raw, 'src=forceBloodMoon');
    const kv = line ? parseKV(line) : null;
    if (kv) { a.openDice.push({ roll: kv.roll, hit: kv.hit, lightOk: kv.lightOk }); if (kv.hit === '1') hit = kv; }
  }
  a.openHit = hit;
  a.triesToHit = a.openDice.length;
  a.probeAfterHit = (await probeAt(OO)).kv;
  a.meta11AfterHit = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 11);
  for (let i = 0; i < 20; i++) {
    let row = null;
    for (let t = 0; t < 3 && !row; t++) {
      await cmd(`setblock ${CC.x} ${CC.y} ${CC.z} minecraft:wheat 3 0`, 130);
      const r = await blight('roll', CC, '1', 700);
      if (findRow(r.raw, 'skip-not-seat')) { a.coverSeatSkips++; continue; }
      const line = findRow(r.raw, 'src=forceBloodMoon');
      if (line) row = parseKV(line);
    }
    if (row) a.coverDice.push({ roll: row.roll, hit: row.hit, lightOk: row.lightOk });
    await sleep(120);
  }
  a.coverLightOkZero = a.coverDice.filter((d) => d.lightOk === '0').length;
  a.coverHits = a.coverDice.filter((d) => d.hit === '1').length;
  a.coverProbeAfter = (await probeAt(CC)).kv;
  a.coverSetAfter = a.coverProbeAfter ? a.coverProbeAfter.blighted : null;
  log('R3', 'openTries=' + a.triesToHit + ' openHitLightOk=' + (hit && hit.lightOk)
    + ' probeAfterHit=' + (a.probeAfterHit && a.probeAfterHit.blighted) + ' meta11=' + a.meta11AfterHit.ok
    + ' coverDice=' + a.coverDice.length + ' lightOk0=' + a.coverLightOkZero
    + ' coverHits=' + a.coverHits + ' coverSetAfter=' + a.coverSetAfter + ' skips=' + a.coverSeatSkips);
  return a;
}

async function armR4() {
  const a = {};
  // R4a — blighted open crop: 3 given, exactly 1 consumed
  await holdBonemeal(3);
  await L.tp(srv, OO_STAND.x, OO_STAND.y, OO_STAND.z, { bot: A, wait: 1600 });
  const fromA = await useBonemealAt(OO);
  a.unblightRows = farmLines(fromA).filter((l) => /blight src=unblight/.test(l)).map(parseKV);
  a.unblightRaw = farmLines(fromA).filter((l) => /blight src=unblight/.test(l)).map((l) => l.slice(0, 200));
  a.leftAfterUse = await drainBonemeal();
  a.probeAfter = (await probeAt(OO)).kv;
  a.metaBareAfter = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 3);
  a.metaBlitAfter = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 11);
  // R4b — deny face on a non-blighted OPEN edge cell
  const RD = { x: 304, y: TY + 1, z: 843 };
  const RD_STAND = { x: 304, y: TY + 1, z: 845 };
  await cmd(`setblock ${RD.x} ${RD.y} ${RD.z} minecraft:wheat 3 0`, 400);
  a.denyBefore = (await probeAt(RD)).kv;
  await holdBonemeal(2);
  await L.tp(srv, RD_STAND.x, RD_STAND.y, RD_STAND.z, { bot: A, wait: 1600 });
  const fromB = await useBonemealAt(RD);
  a.denyBlightRows = farmLines(fromB).filter((l) => /blight src=/.test(l)).length;
  a.denyMeta3 = await L.testBlock(srv, RD.x, RD.y, RD.z, 'minecraft:wheat', 3);
  a.denyProbeAfter = (await probeAt(RD)).kv;
  a.leftAfterDeny = await drainBonemeal();
  log('R4', 'unblight=' + a.unblightRows.length + ' left(2)=' + a.leftAfterUse
    + ' blit=' + (a.probeAfter && a.probeAfter.blighted) + ' meta3=' + a.metaBareAfter.ok
    + ' meta11=' + a.metaBlitAfter.ok
    + ' | denyLeft(2)=' + a.leftAfterDeny + ' denyRows=' + a.denyBlightRows
    + ' denyMeta3=' + a.denyMeta3.ok + ' denyBlit=' + (a.denyProbeAfter && a.denyProbeAfter.blighted));
  return a;
}

async function armR5(cells) {
  const a = {};
  await cmd('gamerule randomTickSpeed 512', 500);
  a.seeded = 0;
  const from5 = nAt();
  for (const c of cells) {
    const inner = (c.plot === 'O')
      && c.x >= OPEN.x0 + 1 && c.x <= OPEN.x0 + 3
      && c.z >= OPEN.z0 + 1 && c.z <= OPEN.z0 + 3;
    if (inner) { await blightCell(c, 1, 90); a.seeded++; }
    else await sleep(60);
  }
  await sleep(20000);
  const raw5 = blightLines(from5);
  a.deadRows = raw5.filter((l) => /dead1of64/.test(l)).map(parseKV);
  a.spreadRows = raw5.filter((l) => /src=spread/.test(l)).map(parseKV);
  a.lowLightRows = raw5.filter((l) => /src=lowLight/.test(l)).map(parseKV);
  a.spreadTargets = Array.from(new Set(a.spreadRows.map((r) => r.to)));
  a.deadSample = a.deadRows.slice(0, 3).map((r) => r.pos + ' age=' + r.age + '->' + r['dead.age']);
  a.spreadSample = a.spreadRows.slice(0, 3).map((r) => r.from + '->' + r.to + ' d=' + [r.dx, r.dy, r.dz].join('/'));
  const M = { x: 304, y: TY + 1, z: 844 };
  await cmd(`setblock ${M.x} ${M.y} ${M.z} minecraft:wheat 7 0`, 400);
  await blightCell(M, 1, 900);
  let mDead = null;
  const fromM = nAt();
  for (let i = 0; i < 40 && !mDead; i++) {
    await sleep(1000);
    mDead = blightLines(fromM).filter((l) => /dead1of64/.test(l)).map(parseKV).find((r) => r.pos === keyOf(M));
  }
  a.mature = mDead ? { age: mDead.age, deadAge: mDead['dead.age'], pos: mDead.pos } : null;
  a.matureDeadBlock = await L.testBlock(srv, M.x, M.y, M.z, 'etim:dead_crop');
  a.M = M;
  log('R5', 'seeded=' + a.seeded + ' dead=' + a.deadRows.length + ' spread=' + a.spreadRows.length
    + ' targets=' + a.spreadTargets.length + ' lowLight=' + a.lowLightRows.length
    + ' mature=' + (a.mature ? 'age' + a.mature.age + '->' + a.mature.deadAge : 'none')
    + ' dead_crop=' + a.matureDeadBlock.ok);
  return a;
}

async function armR5b() {
  const a = {};
  const B = { x: 304, y: TY + 1, z: 846 };
  await cmd('gamerule randomTickSpeed 3', 500);
  await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:wheat 3 0`, 400);
  a.freshMeta3 = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 3);
  await blightCell(B, 1, 900);
  a.blitReadback = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 11);
  await cmd('kill @e[type=item]', 400);
  const fromB = nAt();
  await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:air 0 destroy`, 700);
  a.noDropsRows = blightLines(fromB).filter((l) => /src=noDrops/.test(l)).map(parseKV);
  a.noDropsRaw = blightLines(fromB).filter((l) => /src=noDrops/.test(l)).map((l) => l.slice(0, 190));
  // healthy comparator at the same seat
  await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:wheat 3 0`, 400);
  a.healthyMeta3 = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 3);
  a.healthyProbe = (await probeAt(B)).kv;
  const fromN = nAt();
  await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:air 0 destroy`, 700);
  a.healthyNoDropsRows = blightLines(fromN).filter((l) => /src=noDrops/.test(l)).length;
  await cmd(`setblock ${B.x} ${B.y} ${B.z} minecraft:wheat 3 0`, 300);
  a.healthyMetaAfter = await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:wheat', 3);
  log('R5b', 'noDrops=' + a.noDropsRows.length + ' fresh3=' + a.freshMeta3.ok
    + ' blit11=' + a.blitReadback.ok + ' healthy3=' + a.healthyMeta3.ok
    + ' healthyBlit=' + (a.healthyProbe && a.healthyProbe.blighted)
    + ' healthyNoDrops=' + a.healthyNoDropsRows + ' healthyMetaAfter=' + a.healthyMetaAfter.ok);
  return a;
}

async function armR5c(M) {
  const a = {};
  await cmd('gamerule randomTickSpeed 512', 500);
  const fromC = nAt();
  await sleep(8000);
  const rows = blightLines(fromC);
  a.rowsAtDeadPos = rows.filter((l) => l.includes('pos=' + M.x + ',' + M.y + ',' + M.z));
  a.allBlightRows = rows.length;
  a.deadStillThere = await L.testBlock(srv, M.x, M.y, M.z, 'etim:dead_crop');
  await cmd('gamerule randomTickSpeed 3', 400);
  log('R5c', 'rowsAtDeadPos=' + a.rowsAtDeadPos.length + ' windowBlightRows=' + a.allBlightRows
    + ' deadStill=' + a.deadStillThere.ok);
  return a;
}

async function armR6() {
  const a = {};
  a.probeMaster = (await probeAt(OO)).kv;
  await cmd(`setblock ${OO.x} ${OO.y} ${OO.z} minecraft:wheat 3 0`, 400);
  await blightCell(OO, 1, 900);
  a.blittedMeta11 = await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat', 11);
  a.blittedProbe = (await probeAt(OO)).kv;
  await cmd('gamerule randomTickSpeed 512', 500);
  const from6 = nAt();
  await sleep(8000);
  a.tickBlightRows = blightLines(from6).length;
  a.tickSample = blightLines(from6).slice(0, 3).map((l) => l.slice(0, 170));
  await cmd('gamerule randomTickSpeed 3', 400);
  const G = { x: 306, y: TY + 1, z: 845 };
  const G_STAND = { x: 306, y: TY + 1, z: 847 };
  await cmd(`setblock ${G.x} ${G.y} ${G.z} minecraft:wheat 3 0`, 400);
  await holdBonemeal(1);
  await L.tp(srv, G_STAND.x, G_STAND.y, G_STAND.z, { bot: A, wait: 1600 });
  await useBonemealAt(G);
  a.grown = null;
  for (let d = 4; d <= 7 && !a.grown; d++) {
    const t = await L.testBlock(srv, G.x, G.y, G.z, 'minecraft:wheat', d);
    if (t.ok) a.grown = d;
  }
  a.grownBlitProbe = (await probeAt(G)).kv;
  a.leftAfterVanillaUse = await drainBonemeal();
  await cmd('kill @e[type=item]', 400);
  const fromD = nAt();
  await cmd(`setblock ${OO.x} ${OO.y} ${OO.z} minecraft:air 0 destroy`, 700);
  a.noDropsRows = blightLines(fromD).filter((l) => /src=noDrops/.test(l)).length;
  a.vanillaMetaAfterGrow = await L.testBlock(srv, G.x, G.y, G.z, 'minecraft:wheat', a.grown || 3);
  log('R6', 'master=' + (a.probeMaster && a.probeMaster.master)
    + ' blitMeta11=' + a.blittedMeta11.ok + ' tickRows=' + a.tickBlightRows
    + ' grown=' + a.grown + ' grownBlit=' + (a.grownBlitProbe && a.grownBlitProbe.blighted)
    + ' left=' + a.leftAfterVanillaUse + ' noDrops=' + a.noDropsRows);
  return a;
}

/* -------------------------------------------------------------------- main */
async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  const jarBuf = fs.readFileSync(L.RELJAR);
  const names = jarNames(L.RELJAR);
  const cfgBefore = fs.readFileSync(L.CFG);
  const propsBefore = fs.readFileSync(L.PROPS);
  const manifest = JSON.parse(fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8').replace(/^\uFEFF/, ''));
  ev.pin = {
    head, headOk: head.startsWith(B13.head),
    rel: filePin(L.RELJAR, B13.rel),
    dev: filePin(L.DEVJAR, B13.dev),
    src: filePin(L.SRCJAR, B13.src),
    refmap: refmapFacts(),
    refmapOk: (() => { const f = refmapFacts(); return f.a.classes === B13.refmap.classes && f.a.entries === B13.refmap.entries && f.same; })(),
    mixinCounts: { mixins: manifest.mixins.length, client: (manifest.client || []).length },
    mixinOk: manifest.mixins.length === B13.mixins && (manifest.client || []).length === B13.client,
    jarEntries: ['io/github/etim/etim/farm/ETIMBlight.class',
      'io/github/etim/etim/mixins/MixinBlockCrops.class',
      'io/github/etim/etim/mixins/MixinBlockCropsTick.class',
      'io/github/etim/etim/farm/ETIMBlockDeadPlant.class']
      .map((n) => ({ name: n, inJar: names.indexOf(n) >= 0 })),
    manifestHas: ['MixinBlockCrops', 'MixinBlockCropsTick'].map((n) => ({ name: n, registered: manifest.mixins.indexOf(n) >= 0 })),
    cfgCodeKeys: countCodeKeys(),
    cfgFileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
    mkCounts: L.mkCounts(),
  };
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore), values: ((k) => ({
    blight: k.blightR196, farm: k.farmDebugLog, growth: k.growthRateR196, needs: k.livestockNeedsR196,
  }))(L.cfgKeys(L.CFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name'), flight: L.getProp(propsBefore.toString('utf8'), 'allow-flight') };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: sha256(fs.readFileSync(L.OBFCFG)) };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  ev.jvmBefore = jvmGradleCount();
  log('pin', 'HEAD=' + head.slice(0, 7) + ' rel=' + ev.pin.rel.bytes + '/' + ev.pin.rel.sha.slice(0, 8)
    + ' relOk=' + ev.pin.rel.ok + ' refmap=' + JSON.stringify(ev.pin.refmap.a)
    + ' same=' + ev.pin.refmap.same + ' mixins=' + ev.pin.mixinCounts.mixins + '+' + ev.pin.mixinCounts.client
    + ' cfgCode=' + ev.pin.cfgCodeKeys + '/file=' + ev.pin.cfgFileKeys
    + ' jarEntries=' + ev.pin.jarEntries.map((x) => x.inJar ? '1' : '0').join('')
    + ' mkOk(stale expected false)=' + ev.pin.mkCounts.ok);
  log('pin2', 'refmapMixinBlockCrops keys=' + ev.pin.refmap.cropsKeys.join(',')
    + ' | remap-false targets absent=' + JSON.stringify(ev.pin.refmap.cropsMissingRemap)
    + ' | tickUpdateTick=' + ev.pin.refmap.tickUpdateTick);

  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ===================== boot 1: blightR196=true ===================== */
  try {
    await startBoot(1, true);
    const cells = await buildFarm();
    ev.arms.R0 = {
      boot: ev.boots[0], pin: ev.pin,
      cfg: ((k) => ({ blight: k.blightR196, farm: k.farmDebugLog, growth: k.growthRateR196 }))(L.cfgKeys(L.CFG)),
      codeKeys: countCodeKeys(), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length,
      pluginRows: farmLines(0).filter((l) => /dead-plant carriers registered/.test(l)).slice(0, 2),
    };
    ev.hutWatch = {};
    await sleep(4000);
    ev.hutWatch.t4 = {
      cc: (await L.testBlock(srv, CC.x, CC.y, CC.z, 'minecraft:wheat')).ok,
      oo: (await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat')).ok,
    };
    await sleep(4000);
    ev.hutWatch.t8 = {
      cc: (await L.testBlock(srv, CC.x, CC.y, CC.z, 'minecraft:wheat')).ok,
      oo: (await L.testBlock(srv, OO.x, OO.y, OO.z, 'minecraft:wheat')).ok,
    };
    log('watch', 'cc@4s=' + ev.hutWatch.t4.cc + ' cc@8s=' + ev.hutWatch.t8.cc
      + ' oo@4s=' + ev.hutWatch.t4.oo + ' oo@8s=' + ev.hutWatch.t8.oo);
    ev.arms.R1 = await armR1();
    ev.arms.R2 = await armR2();
    ev.arms.R3 = await armR3();
    ev.arms.R4 = await armR4();
    ev.arms.R5 = await armR5(cells);
    ev.arms.R5b = await armR5b();
    ev.arms.R5c = await armR5c(ev.arms.R5.M);
    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ===================== boot 2: blightR196=false ===================== */
  try {
    await startBoot(2, false);
    await buildFarm();
    ev.arms.R0b = { boot: ev.boots[1], cfg: ((k) => ({ blight: k.blightR196, farm: k.farmDebugLog }))(L.cfgKeys(L.CFG)) };
    ev.arms.R6 = await armR6();
    ev.stop2 = await stopBoot(2);
  } catch (e) {
    log('B2-FAIL', (e && e.stack) || e);
    ev.b2Error = String((e && e.stack) || e);
    try { if (srv) ev.stop2 = await stopBoot(2); } catch (e2) { ev.stop2Error = String((e2 && e2.message) || e2); }
  }

  /* ===================== closure ===================== */
  try {
    fs.writeFileSync(L.CFG, cfgBefore);
    fs.writeFileSync(L.PROPS, propsBefore);
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: sha256(fs.readFileSync(L.CFG)),
      fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(),
      values: { blight: k.blightR196, farm: k.farmDebugLog, growth: k.growthRateR196, needs: k.livestockNeedsR196 } };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name'), flight: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'allow-flight') };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: sha256(fs.readFileSync(L.OBFCFG)) };
    ev.obfAfter.untouched = ev.obfAfter.sha === ev.obfBefore.sha && ev.obfAfter.bytes === ev.obfBefore.bytes;
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.jvmAfter = jvmGradleCount();
    ev.pinAfter = {
      rel: filePin(L.RELJAR, B13.rel), dev: filePin(L.DEVJAR, B13.dev), src: filePin(L.SRCJAR, B13.src),
      refmap: refmapFacts(), mkCounts: L.mkCounts(),
    };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', B13.head + '..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
    ev.worldsLeft = fs.existsSync(path.join(L.ROOT, 'run', WORLD)) ? [WORLD] : [];
    ev.outFiles = { b1: path.join(L.OUT, TAG + '-b1.out'), b2: path.join(L.OUT, TAG + '-b2.out') };
    ev.lineIdx = {
      r1_probe: lineNo(ev.outFiles.b1, 'blight probe', 2),
      r2_probeCovered: lineNo(ev.outFiles.b1, 'blight probe', 5),
      r2_rollCovered: lineNo(ev.outFiles.b1, 'src=forceLowLight'),
      r3_rollOpenHit: lineNo(ev.outFiles.b1, 'src=forceBloodMoon'),
      r4_unblight: lineNo(ev.outFiles.b1, 'src=unblight'),
      r4_deny: lineNo(ev.outFiles.b1, 'blight probe', 8),
      r5_dead1of64: lineNo(ev.outFiles.b1, 'dead1of64'),
      r5_spread: lineNo(ev.outFiles.b1, 'src=spread'),
      r5b_noDrops: lineNo(ev.outFiles.b1, 'src=noDrops'),
      r6_probeMaster: lineNo(ev.outFiles.b2, 'blight probe'),
      r6_bonemealGrow: lineNo(ev.outFiles.b2, 'blight probe', 3),
    };
    // interop with the main-session smoke ev (flag-off main counts only)
    try {
      const sm = JSON.parse(fs.readFileSync(path.join(L.OUT, 'f11-b13-smoke.json'), 'utf8'));
      const s6 = (sm.arms && sm.arms.R6) || {};
      const mine = ev.arms.R6 || {};
      ev.interop = {
        smokeR6: { master: s6.probeMaster && s6.probeMaster.master, tickRows: s6.tickBlightRows, grown: s6.vanillaGrow && s6.vanillaGrow.grownAge, left: s6.leftAfterVanillaUse, noDrops: s6.noDropsRows },
        mineR6: { master: mine.probeMaster && mine.probeMaster.master, tickRows: mine.tickBlightRows, grown: mine.grown, left: mine.leftAfterVanillaUse, noDrops: mine.noDropsRows },
        smokeR2: { pOpen: sm.arms.R2 && sm.arms.R2.pOpen, pCovered: sm.arms.R2 && sm.arms.R2.pCovered, ratio: sm.arms.R2 && sm.arms.R2.ratio },
        mineR2: { pOpen: ev.arms.R2 && ev.arms.R2.pOpen, pCovered: ev.arms.R2 && ev.arms.R2.pCovered, ratio: ev.arms.R2 && ev.arms.R2.ratioCoveredOverOpen },
      };
      const num = (v) => (typeof v === 'number' ? v : (v === undefined || v === null || v === '' ? NaN : Number(v)));
      ev.interop.deviation = {
        tickRows: Math.abs(num(ev.interop.mineR6.tickRows) - num(ev.interop.smokeR6.tickRows)),
        grown: Math.abs(num(ev.interop.mineR6.grown) - num(ev.interop.smokeR6.grown)),
        left: Math.abs(num(ev.interop.mineR6.left) - num(ev.interop.smokeR6.left)),
        noDrops: Math.abs(num(ev.interop.mineR6.noDrops) - num(ev.interop.smokeR6.noDrops)),
        ratio: Math.abs(num(ev.interop.mineR2.ratio) - num(ev.interop.smokeR2.ratio)),
      };
    } catch (e) { ev.interopError = String((e && e.message) || e); }
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '.json'));
  } catch (e) {
    log('CLOSE-FAIL', (e && e.stack) || e);
    ev.closeError = String((e && e.stack) || e);
    fs.writeFileSync(path.join(L.OUT, TAG + '.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
  }
  process.exit(0);
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
