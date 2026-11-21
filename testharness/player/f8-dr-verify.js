#!/usr/bin/env node
/**
 * f8-dr-verify.js - W-B8 judged window (drought-death batch, HEAD 40794da).
 *
 * Contract (task book 2026-11-05, B-8 D-4 乙 top-up):
 *   R1 mature drought harvest (1 row drop=minecraft:wheat#1 + block air)
 *   R2 immature dead_crop carrier, age parity across 0/3/5/6
 *   R3 stem dead_stem carrier (pumpkin age4 + melon age1)
 *   R4 death-exempt double arm (water 9x2x9 / snow+ice 3x2x3) + remove -> event
 *   R5 moist gate skip-not-dry + 120s natural lane (gate rows / no moist event)
 *   R6 dead-block quartet (bone meal no-op / break no drops / frozen / no item)
 *   R7 master switch off (force -> skip-master-off) then true restore probe
 *   R8 chance face (1.0 natural event in 10 min / 0.0 clean window)
 *   R9 zero regression (growth gate dry / fertilize x3 / token smoke / channels)
 *   R10 carrier placement leaves the same-chunk neighbour untouched
 *
 * Boots: b1 = R1..R6 + R9 + R10 (main)
 *        b2 = R7 off (skip-master-off + natural freeze)
 *        b3 = R7 restore probe + R8 chance 1.0 (natural death)
 *        b4 = R8 chance 0.0 (clean natural window)
 *
 * Judgment data is the [FarmLog] drought channel (farmDebugLog=true in the
 * window, false at closure). No client face, no screenshots, no product code.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const L = require('./f7-wb-lib');

const TAG = 'f8-dr-verify';
const WORLD = 'f8dr';
const A = 'ETIM_F7';

const FY = 99;   // farmland / platform layer
const CY = 100;  // crop layer
const BX = 186;  // main arena centre
const BZ = 790;

const PIN = {
  head: '40794da',
  rel: { bytes: 988364, sha: 'D4062B205C4E0174C06BB3282D7A0B58AFF09BE7C4367469F6F738E732069530' },
  dev: { bytes: 968826, sha: '5F0449E3EC2226FF0C9D5E73BEE1DC8546E8E5B81971963B517FA05A6491222C' },
  src: { bytes: 898810, sha: 'BACC5604B4906D08ED59EDCE52028DD3103C100B1C13DBA197342CED2DBDBD88' },
};

const sleep = L.sleep;
const log = L.log;
let srv = null;
let bot = null;

const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], stops: [], arms: {} };

const since = (n) => srv.all.slice(n).map(L.strip);

async function chat(cmdline, wait) {
  try { bot.chat('/' + cmdline); } catch (e) { log('chat', 'send failed ' + cmdline + ': ' + ((e && e.message) || e)); }
  await sleep(wait === undefined ? 650 : wait);
}

async function cmd(line, wait) {
  srv.send(line);
  await sleep(wait === undefined ? 300 : wait);
}

async function roll(x, y, z, p) {
  const f = srv.all.length;
  srv.send(`etest drought roll ${x} ${y} ${z} ${p === undefined ? '1.0' : p}`);
  await sleep(750);
  return since(f).filter((l) => /\[FarmLog\] drought/.test(l));
}

async function probe(x, y, z) {
  const f = srv.all.length;
  srv.send(`etest drought probe ${x} ${y} ${z}`);
  await sleep(650);
  return since(f).filter((l) => /\[FarmLog\] drought probe/.test(l));
}

function parseForce(rows) {
  return rows.map((raw) => {
    const m = /drought force block=(\S+) age=(-?\d+) pos=(\S+) dry=(\d) water=(\d) master=(\d) p=([\d.]+)/.exec(raw);
    const e = /drought event kind=(\w+) block=(\S+) age=(-?\d+) pos=(\S+) roll=([\d.]+)(?: drop=(\S+)| dead=(\S+) age=(-?\d+))?/.exec(raw);
    const b = /branch=(\S+)/.exec(raw);
    return {
      raw,
      block: m ? m[1] : null, age: m ? Number(m[2]) : null, pos: m ? m[3] : null,
      dry: m ? Number(m[4]) : null, water: m ? Number(m[5]) : null, master: m ? Number(m[6]) : null, p: m ? Number(m[7]) : null,
      event: e ? { kind: e[1], block: e[2], age: Number(e[3]), pos: e[4], roll: Number(e[5]), drop: e[6] || null, dead: e[7] || null, deadAge: e[8] === undefined ? null : Number(e[8]) } : null,
      branch: b ? b[1] : null,
    };
  });
}
function parseProbe(rows) {
  return rows.map((raw) => {
    const m = /drought probe block=(\S+) age=(-?\d+) pos=(\S+) below=(\S+) dry=(\d) water=(\d) master=(\d) chance=([\d.]+)/.exec(raw);
    return m ? { raw, block: m[1], age: Number(m[2]), pos: m[3], below: m[4], dry: Number(m[5]), water: Number(m[6]), master: Number(m[7]), chance: Number(m[8]) } : { raw };
  });
}

async function setCell(x, z, farmMeta, cropBlock, cropMeta) {
  srv.send(`setblock ${x} ${FY} ${z} minecraft:farmland ${farmMeta === undefined ? 0 : farmMeta} replace`);
  srv.send(`setblock ${x} ${CY} ${z} ${cropBlock} ${cropMeta === undefined ? 0 : cropMeta} replace`);
  await sleep(420);
}
async function fillLayer(x1, z1, x2, z2, block, meta) {
  const f = srv.all.length;
  srv.send(`fill ${x1} ${FY} ${z1} ${x2} ${FY} ${z2} ${block} ${meta}`);
  await sleep(700);
  const lines = since(f);
  return { lines, bad: lines.filter((l) => /Unable to fill|too many|failed/i.test(l)) };
}
async function fillCrop(x1, z1, x2, z2, block, meta) {
  const f = srv.all.length;
  srv.send(`fill ${x1} ${CY} ${z1} ${x2} ${CY} ${z2} ${block} ${meta}`);
  await sleep(700);
  const lines = since(f);
  return { lines, bad: lines.filter((l) => /Unable to fill|too many|failed/i.test(l)) };
}
async function testforItems(x1, y1, z1, dx, dy, dz) {
  const f = srv.all.length;
  srv.send(`testfor @e[type=item,x=${x1},y=${y1},z=${z1},dx=${dx},dy=${dy},dz=${dz}]`);
  await sleep(520);
  return since(f).filter((l) => /Found |found nothing|Entity not found|No entity/i.test(l));
}
async function killItemsBox(x1, y1, z1, dx, dy, dz) {
  const f = srv.all.length;
  srv.send(`kill @e[type=item,x=${x1},y=${y1},z=${z1},dx=${dx},dy=${dy},dz=${dz}]`);
  await sleep(520);
  return since(f).filter((l) => /Killed |found nothing|No entity/i.test(l));
}
async function tpNear(x, z, wait) {
  srv.send(`tp ${A} ${x + 1.5} ${CY} ${z + 0.5} 0 0`);
  await sleep(wait === undefined ? 900 : wait);
}

async function startBoot(n, opts) {
  const o = opts || {};
  L.setCfgValue(L.CFG, 'droughtDeathR196', o.master ? 'true' : 'false');
  L.setCfgValue(L.CFG, 'droughtDeathChance', String(o.chance));
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
  await L.stage(srv, bot, { gamemode: 1, rts: o.rts === undefined ? 0 : o.rts, noPhysics: true, time: 6000 });
  srv.send('gamerule doTileDrops true');
  await sleep(500);
  ev['cfgB' + n] = { master: L.cfgKeys(L.CFG).droughtDeathR196, chance: L.cfgKeys(L.CFG).droughtDeathChance };
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

async function buildArena() {
  srv.send(`fill ${BX - 2} ${FY - 1} ${BZ - 2} ${BX + 2} ${FY - 1} ${BZ + 2} minecraft:stone 0`);
  await sleep(1200);
  srv.send(`fill 155 ${FY} 775 205 ${FY} 805 minecraft:stone 0`);
  await sleep(1600);
  srv.send(`fill 155 ${CY} 775 205 108 805 minecraft:air 0`);
  await sleep(1600);
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src') };
  ev.mk = L.mkCounts();
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), fileKeys: Object.keys(L.cfgKeys(L.CFG)).length, codeKeys: countCodeKeys() };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',')
    + ' mk=' + ev.mk.ok + ' cfgCode=' + ev.cfgBefore.codeKeys + ' cfgFile=' + ev.cfgBefore.fileKeys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'foodDebugLog', 'true');
  const propsText = propsBefore.toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsText, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  /* ======================= boot 1: R1..R6, R9, R10 ======================= */
  await startBoot(1, { master: true, chance: 0.05, rts: 0 });
  try {
    await L.tp(srv, BX + 0.5, CY + 2, BZ + 0.5, { bot: A, wait: 1400 });
    await buildArena();
    await tpNear(BX, BZ, 1200);
    ev.arena = {
      pad: await L.testBlock(srv, BX, FY, BZ, 'minecraft:stone'),
      deaths: srv.all.map(L.strip).filter((l) => /\[DeathLog\] ETIM_F7/.test(l)).length,
    };
    log('arena', JSON.stringify({ pad: ev.arena.pad.ok, deaths: ev.arena.deaths }));

    /* ---------------- R1 mature drought harvest ---------------- */
    await setCell(186, 790, 0, 'minecraft:wheat', 7);
    const r1Rows = await roll(186, CY, 790, '1.0');
    ev.arms.R1 = {
      rows: r1Rows,
      parsed: parseForce(r1Rows),
      air: await L.testBlock(srv, 186, CY, 790, 'minecraft:air'),
      itemNear: await testforItems(184, FY, 788, 5, 4, 5),
    };
    await cmd('kill @e[type=item]', 500);
    log('R1', JSON.stringify({ rows: r1Rows.length, event: ev.arms.R1.parsed.map((x) => x.event), air: ev.arms.R1.air.ok, item: ev.arms.R1.itemNear }));

    /* ---------------- R2 immature carrier, age parity ---------------- */
    ev.arms.R2 = [];
    const ages = [0, 3, 5, 6];
    for (let i = 0; i < ages.length; i++) {
      const x = 188 + i;
      await setCell(x, 790, 0, 'minecraft:wheat', ages[i]);
      const rows = await roll(x, CY, 790, '1.0');
      ev.arms.R2.push({
        x, age: ages[i], rows, parsed: parseForce(rows),
        block: await L.testBlock(srv, x, CY, 790, 'etim:dead_crop', ages[i]),
      });
    }
    log('R2', JSON.stringify(ev.arms.R2.map((r) => ({ age: r.age, ev: r.parsed.map((p) => p.event), block: r.block.ok }))));

    /* ---------------- R3 stem carrier ---------------- */
    ev.arms.R3 = [];
    for (const [kind, age, x] of [['pumpkin_stem', 4, 193], ['melon_stem', 1, 194]]) {
      await setCell(x, 790, 0, 'minecraft:' + kind, age);
      const rows = await roll(x, CY, 790, '1.0');
      ev.arms.R3.push({ kind, age, x, rows, parsed: parseForce(rows), block: await L.testBlock(srv, x, CY, 790, 'etim:dead_stem', age) });
    }
    log('R3', JSON.stringify(ev.arms.R3.map((r) => ({ kind: r.kind, age: r.age, ev: r.parsed.map((p) => p.event), block: r.block.ok }))));

    /* ---------------- R4 death-exempt arms ---------------- */
    ev.arms.R4 = {};
    await setCell(196, 790, 0, 'minecraft:wheat', 2);
    await cmd('setblock 199 99 790 minecraft:water 0 replace', 500);
    ev.arms.R4.waterProbe = parseProbe(await probe(196, CY, 790));
    ev.arms.R4.waterRows = await roll(196, CY, 790, '1.0');
    ev.arms.R4.waterParsed = parseForce(ev.arms.R4.waterRows);
    ev.arms.R4.waterBlock = await L.testBlock(srv, 196, CY, 790, 'minecraft:wheat', 2);
    await cmd('setblock 199 99 790 minecraft:stone 0 replace', 500);
    ev.arms.R4.afterRemoveProbe = parseProbe(await probe(196, CY, 790));
    ev.arms.R4.afterRemoveRows = await roll(196, CY, 790, '1.0');
    ev.arms.R4.afterRemoveParsed = parseForce(ev.arms.R4.afterRemoveRows);
    ev.arms.R4.afterRemoveBlock = await L.testBlock(srv, 196, CY, 790, 'etim:dead_crop', 2);
    await setCell(180, 790, 0, 'minecraft:wheat', 2);
    await cmd('setblock 181 99 790 minecraft:ice 0 replace', 500);
    ev.arms.R4.iceProbe = parseProbe(await probe(180, CY, 790));
    ev.arms.R4.iceRows = await roll(180, CY, 790, '1.0');
    ev.arms.R4.iceParsed = parseForce(ev.arms.R4.iceRows);
    ev.arms.R4.iceBlock = await L.testBlock(srv, 180, CY, 790, 'minecraft:wheat', 2);
    await cmd('setblock 181 99 790 minecraft:stone 0 replace', 400);
    await setCell(182, 790, 0, 'minecraft:wheat', 2);
    await cmd('setblock 183 99 790 minecraft:snow 0 replace', 500);
    ev.arms.R4.snowProbe = parseProbe(await probe(182, CY, 790));
    ev.arms.R4.snowRows = await roll(182, CY, 790, '1.0');
    ev.arms.R4.snowParsed = parseForce(ev.arms.R4.snowRows);
    ev.arms.R4.snowBlock = await L.testBlock(srv, 182, CY, 790, 'minecraft:wheat', 2);
    await cmd('setblock 183 99 790 minecraft:stone 0 replace', 400);
    log('R4', JSON.stringify({
      water: ev.arms.R4.waterParsed.map((p) => p.branch), waterBlock: ev.arms.R4.waterBlock.ok,
      remove: ev.arms.R4.afterRemoveParsed.map((p) => p.event), removeBlock: ev.arms.R4.afterRemoveBlock.ok,
      ice: ev.arms.R4.iceParsed.map((p) => p.branch), iceBlock: ev.arms.R4.iceBlock.ok,
      snow: ev.arms.R4.snowParsed.map((p) => p.branch), snowBlock: ev.arms.R4.snowBlock.ok,
    }));

    /* ---------------- R5 moist gate + natural lane 120s ---------------- */
    await setCell(176, 790, 7, 'minecraft:wheat', 2);
    ev.arms.R5 = {};
    ev.arms.R5.probe = parseProbe(await probe(176, CY, 790));
    ev.arms.R5.rows = await roll(176, CY, 790, '1.0');
    ev.arms.R5.parsed = parseForce(ev.arms.R5.rows);
    ev.arms.R5.block = await L.testBlock(srv, 176, CY, 790, 'minecraft:wheat', 2);
    await fillLayer(168, 788, 172, 792, 'minecraft:farmland', 0);
    await fillCrop(168, 788, 172, 792, 'minecraft:wheat', 2);
    await fillLayer(174, 788, 178, 792, 'minecraft:farmland', 7);
    await fillCrop(174, 788, 178, 792, 'minecraft:wheat', 2);
    ev.arms.R5.dryProbe = parseProbe(await probe(170, CY, 790));
    ev.arms.R5.moistProbe2 = parseProbe(await probe(176, CY, 790));
    await cmd('gamerule randomTickSpeed 3', 300);
    const fromN = srv.all.length;
    await sleep(120000);
    const natRows = since(fromN).filter((l) => /\[FarmLog\]\s+(growth gate dry|drought)/.test(l));
    const inBox = (raw, x1, z1, x2, z2) => {
      const m = /pos=(-?\d+),(-?\d+),(-?\d+)/.exec(raw);
      if (!m) return false;
      const x = Number(m[1]), z = Number(m[3]);
      return x >= x1 && x <= x2 && z >= z1 && z <= z2;
    };
    ev.arms.R5.natural = {
      totalRows: natRows.length,
      dryGate: natRows.filter((l) => /growth gate dry/.test(l) && inBox(l, 168, 788, 172, 792)).length,
      dryEvents: natRows.filter((l) => /drought event/.test(l) && inBox(l, 168, 788, 172, 792)).length,
      moistGate: natRows.filter((l) => /growth gate dry/.test(l) && inBox(l, 174, 788, 178, 792)).length,
      moistEvents: natRows.filter((l) => /drought event/.test(l) && inBox(l, 174, 788, 178, 792)).length,
      sample: natRows.slice(0, 6),
    };
    ev.arms.R5.survivor = await L.testBlock(srv, 170, CY, 790, 'minecraft:wheat', 2);
    await cmd('gamerule randomTickSpeed 0', 400);
    log('R5', JSON.stringify({ probe: ev.arms.R5.probe.map((p) => ({ dry: p.dry, water: p.water })), branch: ev.arms.R5.parsed.map((p) => p.branch), block: ev.arms.R5.block.ok, natural: ev.arms.R5.natural }));

    /* ---------------- R6 dead-block quartet ---------------- */
    ev.arms.R6 = {};
    await cmd(`gamemode 0 ${A}`, 700);
    await setCell(187, 794, 0, 'minecraft:wheat', 3);
    ev.arms.R6.seedRows = await roll(187, CY, 794, '1.0');
    ev.arms.R6.seedBlock = await L.testBlock(srv, 187, CY, 794, 'etim:dead_crop', 3);
    await cmd(`clear ${A}`, 400);
    await cmd(`give ${A} minecraft:dye 1 15`, 900);
    try { bot.setQuickBarSlot(0); } catch (e) { log('quickbar', (e && e.message) || e); }
    await sleep(700);
    await tpNear(187, 794, 900);
    await L.lookAtTop(bot, 187, CY, 794);
    const fromBone = srv.all.length;
    srv.send(`etest useblock 187 ${CY} 794 ${A}`);
    await sleep(1400);
    ev.arms.R6.boneRows = since(fromBone).filter((l) => /\[FarmLog\]|drought|growth gate/.test(l));
    ev.arms.R6.boneBlock = await L.testBlock(srv, 187, CY, 794, 'etim:dead_crop', 3);
    await cmd(`clear ${A}`, 500);
    await sleep(500);
    const fromBreak = srv.all.length;
    srv.send(`etest dig 187 ${CY} 794 ${A}`);
    await sleep(6500);
    ev.arms.R6.breakBlock = await L.testBlock(srv, 187, CY, 794, 'minecraft:air');
    ev.arms.R6.breakKill = await killItemsBox(185, FY, 792, 4, 4, 4);
    ev.arms.R6.breakRows = since(fromBreak).filter((l) => /\[TestLog\] step=dig/.test(l));
    // control: an INSTANT-break self-drop block (torch) proves doTileDrops and
    // the item channel are live — a non-instant block's 40-tick STOP cannot
    // finish under the dev-server scheduler, so it is not a usable control.
    await cmd('setblock 190 100 794 minecraft:torch 0 replace', 500);
    await tpNear(190, 794, 800);
    srv.send(`etest dig 190 ${CY} 794 ${A}`);
    await sleep(6500);
    ev.arms.R6.ctrlBlock = await L.testBlock(srv, 190, CY, 794, 'minecraft:air');
    ev.arms.R6.ctrlKill = await killItemsBox(188, FY, 792, 4, 4, 4);
    await setCell(187, 796, 0, 'minecraft:wheat', 3);
    ev.arms.R6.frozenSeed = await roll(187, CY, 796, '1.0');
    const fromFrozen = srv.all.length;
    await cmd('gamerule randomTickSpeed 50', 500);
    await sleep(30000);
    await cmd('gamerule randomTickSpeed 0', 500);
    ev.arms.R6.frozenRows = since(fromFrozen).filter((l) => /drought|growth gate/.test(l) && /187,\d+,796/.test(l));
    ev.arms.R6.frozenBlock = await L.testBlock(srv, 187, CY, 796, 'etim:dead_crop', 3);
    const fromGive = srv.all.length;
    srv.send(`give ${A} etim:dead_crop 1`);
    await sleep(900);
    ev.arms.R6.giveRows = since(fromGive).filter((l) => /There is no such item|no such item|Given|unknown/i.test(l));
    log('R6', JSON.stringify({
      seed: ev.arms.R6.seedBlock.ok, bone: ev.arms.R6.boneBlock.ok, boneRows: ev.arms.R6.boneRows.length,
      breakBlock: ev.arms.R6.breakBlock.ok, breakKill: ev.arms.R6.breakKill, ctrlKill: ev.arms.R6.ctrlKill, ctrlBlock: ev.arms.R6.ctrlBlock.ok,
      frozen: ev.arms.R6.frozenBlock.ok, frozenRows: ev.arms.R6.frozenRows.length, give: ev.arms.R6.giveRows,
    }));

    /* ---------------- R10 neighbour untouched ---------------- */
    await setCell(186, 792, 0, 'minecraft:wheat', 1);
    await setCell(186, 790, 0, 'minecraft:wheat', 3);
    ev.arms.R10 = {};
    ev.arms.R10.preNeighbour = await L.testBlock(srv, 186, CY, 792, 'minecraft:wheat', 1);
    ev.arms.R10.rows = await roll(186, CY, 790, '1.0');
    ev.arms.R10.parsed = parseForce(ev.arms.R10.rows);
    const fromR10 = srv.all.length;
    await sleep(60000);
    ev.arms.R10.obsRows = since(fromR10).filter((l) => /drought|growth gate/.test(l));
    ev.arms.R10.neighbour = await L.testBlock(srv, 186, CY, 792, 'minecraft:wheat', 1);
    ev.arms.R10.dead = await L.testBlock(srv, 186, CY, 790, 'etim:dead_crop', 3);
    log('R10', JSON.stringify({ pre: ev.arms.R10.preNeighbour.ok, neigh: ev.arms.R10.neighbour.ok, dead: ev.arms.R10.dead.ok, obs: ev.arms.R10.obsRows.length }));

    /* ---------------- R9 zero regression ---------------- */
    await cmd(`gamemode 1 ${A}`, 600);
    ev.arms.R9 = { fertilize: {} };
    await setCell(176, 794, 0, 'minecraft:air', 0);
    await tpNear(176, 794, 800);
    await cmd(`etest hold etim:manure ${A}`, 900);
    await L.lookAtTop(bot, 176, FY, 794);
    let f = srv.all.length;
    srv.send(`etest useblock 176 ${FY} 794 ${A}`);
    await sleep(1400);
    ev.arms.R9.fertilize.farm = since(f).filter((l) => /\[FarmLog\] fertilize/.test(l));
    await cmd('setblock 170 99 796 minecraft:mycelium 0 replace', 400);
    await cmd('setblock 170 100 796 minecraft:brown_mushroom 0 replace', 500);
    await cmd('fill 167 104 793 173 104 799 minecraft:stone 0', 900);
    await tpNear(170, 796, 900);
    await L.lookAtTop(bot, 170, FY, 796);
    f = srv.all.length;
    srv.send(`etest useblock 170 ${FY} 796 ${A}`);
    await sleep(1600);
    ev.arms.R9.fertilize.mycelium = since(f).filter((l) => /\[FarmLog\] fertilize/.test(l));
    await L.lookAtTop(bot, 170, CY, 796);
    f = srv.all.length;
    srv.send(`etest useblock 170 ${CY} 796 ${A}`);
    await sleep(1600);
    ev.arms.R9.fertilize.mushroom = since(f).filter((l) => /\[FarmLog\] fertilize/.test(l));
    log('R9-fert', JSON.stringify({ farm: ev.arms.R9.fertilize.farm.length, mycelium: ev.arms.R9.fertilize.mycelium.length, mushroom: ev.arms.R9.fertilize.mushroom.length }));

    await cmd('setblock 196 100 794 minecraft:stone 0 replace', 400);
    await cmd('summon minecraft:cow 198.5 100 796.5 {NoAI:1b,Silent:1b,PersistenceRequired:1b}', 700);
    await cmd(`give ${A} minecraft:iron_sword 1`, 600);
    await tpNear(196, 795, 900);
    const tokens = [
      'etest hold minecraft:iron_sword', 'etest food 20 20', 'etest hunger 20 20',
      'etest health 20', 'etest level 5', 'etest debt 3',
      'etest enchant mainhand 3', 'etest enchantprobe mainhand',
      'etest blockprobe', 'etest hurt 2', 'etest attack @e[type=cow,limit=1]',
      'etest dig 196 100 794', 'etest useblock 196 100 794',
      'etest useitem', 'etest damage 1', 'etest quality fine', 'etest anvilwear 196 100 795',
      'etest release', 'etest hold etim:manure',
      'etest fishgate 6000', 'etest fishretract', 'etest fishprobe type 10',
      'etest arrowprobe recovery iron 1 10', 'etest livemano 8', 'etest chestio peek',
      'etest',
    ];
    ev.arms.R9.tokens = [];
    for (const t of tokens) {
      const ff = srv.all.length;
      await chat(t, 700);
      ev.arms.R9.tokens.push({ cmd: t, lines: since(ff).filter((l) => /\[EtimTest\]|\[TestLog\]|Exception|Error|FAILED/.test(l)).slice(0, 6) });
    }
    ev.arms.R9.tokenErrors = srv.all.map(L.strip).filter((l) => /\[TestLog\] step=\S+ player=\S+ FAILED=|java\.lang\.\w*Exception|java\.lang\.\w*Error/.test(l));
    ev.arms.R9.serverAlive = !srv.exited;
    ev.arms.R9.channels = L.rowCounts(srv.all.map(L.strip));
    ev.arms.R9.channelRows = {
      melee: srv.all.map(L.strip).filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: srv.all.map(L.strip).filter((l) => /\[MiningLog\]/.test(l)).length,
      butch: srv.all.map(L.strip).filter((l) => /\[ButchLog\]/.test(l)).length,
      arrow: srv.all.map(L.strip).filter((l) => /\[ArrowLog\]/.test(l)).length,
      ench: srv.all.map(L.strip).filter((l) => /\[EnchantLog\]/.test(l)).length,
      damage: srv.all.map(L.strip).filter((l) => /\[DamageLog\]/.test(l)).length,
      food: srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).length,
      cap: srv.all.map(L.strip).filter((l) => /\[CapLog\]/.test(l)).length,
    };
    ev.arms.R9.gateDryRows = srv.all.map(L.strip).filter((l) => /growth gate dry block=minecraft:wheat/.test(l)).length;
    log('R9-token', 'errors=' + ev.arms.R9.tokenErrors.length + ' alive=' + ev.arms.R9.serverAlive + ' channels=' + JSON.stringify(ev.arms.R9.channelRows));

    ev.stop1 = await stopBoot(1);
  } catch (e) {
    log('B1-FAIL', (e && e.stack) || e.message || e);
    ev.b1Error = String((e && e.stack) || e);
    try { if (srv) ev.stop1 = await stopBoot(1); } catch (e2) { ev.stop1Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 2: R7 master off ======================= */
  try {
    await startBoot(2, { master: false, chance: 0.05, rts: 0 });
    await tpNear(BX, BZ, 1000);
    await setCell(186, 790, 0, 'minecraft:wheat', 2);
    ev.arms.R7 = {
      probe: parseProbe(await probe(186, CY, 790)),
      rows: await roll(186, CY, 790, '1.0'),
      block: await L.testBlock(srv, 186, CY, 790, 'minecraft:wheat', 2),
    };
    ev.arms.R7.parsed = parseForce(ev.arms.R7.rows);
    const fromNat = srv.all.length;
    await cmd('gamerule randomTickSpeed 50', 500);
    await sleep(20000);
    await cmd('gamerule randomTickSpeed 0', 500);
    const nat = since(fromNat).filter((l) => /\[FarmLog\]\s+(growth gate dry|drought)/.test(l));
    ev.arms.R7.natural = {
      gate: nat.filter((l) => /growth gate dry/.test(l)).length,
      events: nat.filter((l) => /drought event/.test(l)).length,
      skip: nat.filter((l) => /skip-master-off/.test(l)).length,
    };
    log('R7', JSON.stringify({ probe: ev.arms.R7.probe.map((p) => ({ master: p.master, chance: p.chance })), branch: ev.arms.R7.parsed.map((p) => p.branch), block: ev.arms.R7.block.ok, natural: ev.arms.R7.natural }));
    ev.stop2 = await stopBoot(2);
  } catch (e) {
    log('B2-FAIL', (e && e.stack) || e.message || e);
    ev.b2Error = String((e && e.stack) || e);
    try { if (srv) ev.stop2 = await stopBoot(2); } catch (e2) { ev.stop2Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 3: R7 restore + R8 chance 1.0 ======================= */
  try {
    await startBoot(3, { master: true, chance: 1.0, rts: 3 });
    await tpNear(163, 783, 1200);
    await fillLayer(160, 780, 166, 786, 'minecraft:farmland', 0);
    await fillCrop(160, 780, 166, 786, 'minecraft:wheat', 2);
    ev.arms.R8 = { probe: parseProbe(await probe(163, CY, 783)), probes: [] };
    ev.arms.R8.probes.push(parseProbe(await probe(160, CY, 780)));
    ev.arms.R8.probes.push(parseProbe(await probe(166, CY, 786)));
    const fromNat = srv.all.length;
    const t0 = Date.now();
    let firstMs = null;
    while (Date.now() - t0 < 600000) {
      const evs = since(fromNat).filter((l) => /\[FarmLog\]\s+drought event/.test(l));
      if (evs.length) { firstMs = Date.now() - t0; break; }
      await sleep(2000);
    }
    await sleep(8000);
    const nat = since(fromNat).filter((l) => /\[FarmLog\]\s+(growth gate dry|drought)/.test(l));
    const inBox = (raw) => {
      const m = /pos=(-?\d+),(-?\d+),(-?\d+)/.exec(raw);
      if (!m) return false;
      const x = Number(m[1]), z = Number(m[3]);
      return x >= 160 && x <= 166 && z >= 780 && z <= 786;
    };
    ev.arms.R8.firstEventMs = firstMs;
    ev.arms.R8.gate = nat.filter((l) => /growth gate dry/.test(l) && inBox(l)).length;
    ev.arms.R8.events = nat.filter((l) => /drought event/.test(l) && inBox(l)).length;
    ev.arms.R8.eventRows = nat.filter((l) => /drought event/.test(l)).slice(0, 6);
    ev.arms.R8.surviving = await L.testBlock(srv, 163, CY, 783, 'etim:dead_crop', 2);
    log('R8a', JSON.stringify({ probe: ev.arms.R8.probe.map((p) => ({ master: p.master, chance: p.chance, dry: p.dry, water: p.water })), firstMs, gate: ev.arms.R8.gate, events: ev.arms.R8.events }));
    ev.stop3 = await stopBoot(3);
  } catch (e) {
    log('B3-FAIL', (e && e.stack) || e.message || e);
    ev.b3Error = String((e && e.stack) || e);
    try { if (srv) ev.stop3 = await stopBoot(3); } catch (e2) { ev.stop3Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= boot 4: R8 chance 0.0 clean window ======================= */
  try {
    await startBoot(4, { master: true, chance: 0.0, rts: 3 });
    await tpNear(163, 783, 1200);
    await fillLayer(160, 780, 166, 786, 'minecraft:farmland', 0);
    await fillCrop(160, 780, 166, 786, 'minecraft:wheat', 2);
    ev.arms.R8b = { probe: parseProbe(await probe(163, CY, 783)) };
    const fromNat = srv.all.length;
    const t0 = Date.now();
    const inBox = (raw) => {
      const m = /pos=(-?\d+),(-?\d+),(-?\d+)/.exec(raw);
      if (!m) return false;
      const x = Number(m[1]), z = Number(m[3]);
      return x >= 160 && x <= 166 && z >= 780 && z <= 786;
    };
    while (Date.now() - t0 < 600000) {
      const g = since(fromNat).filter((l) => /\[FarmLog\] growth gate dry/.test(l) && inBox(l)).length;
      if (g >= 40) break;
      await sleep(3000);
    }
    const nat = since(fromNat).filter((l) => /\[FarmLog\]\s+(growth gate dry|drought)/.test(l));
    ev.arms.R8b.elapsedMs = Date.now() - t0;
    ev.arms.R8b.gate = nat.filter((l) => /growth gate dry/.test(l) && inBox(l)).length;
    ev.arms.R8b.eventsPatch = nat.filter((l) => /drought event/.test(l) && inBox(l)).length;
    ev.arms.R8b.eventsAll = srv.all.map(L.strip).filter((l) => /\[FarmLog\]\s+drought event/.test(l)).length;
    ev.arms.R8b.sample = nat.slice(0, 5);
    log('R8b', JSON.stringify({ probe: ev.arms.R8b.probe.map((p) => ({ master: p.master, chance: p.chance })), elapsedMs: ev.arms.R8b.elapsedMs, gate: ev.arms.R8b.gate, eventsPatch: ev.arms.R8b.eventsPatch, eventsAll: ev.arms.R8b.eventsAll }));
    ev.stop4 = await stopBoot(4);
  } catch (e) {
    log('B4-FAIL', (e && e.stack) || e.message || e);
    ev.b4Error = String((e && e.stack) || e);
    try { if (srv) ev.stop4 = await stopBoot(4); } catch (e2) { ev.stop4Error = String((e2 && e2.message) || e2); }
  }

  /* ======================= closure ======================= */
  try {
    L.setCfgValue(L.CFG, 'droughtDeathR196', 'true');
    L.setCfgValue(L.CFG, 'droughtDeathChance', '0.05');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
    fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', 'world'), 'allow-flight', 'false'), 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    const k = L.cfgKeys(L.CFG);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), fileKeys: Object.keys(k).length, codeKeys: countCodeKeys(), values: { droughtDeathR196: k.droughtDeathR196, droughtDeathChance: k.droughtDeathChance, farmDebugLog: k.farmDebugLog, foodDebugLog: k.foodDebugLog } };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name'), allowFlight: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'allow-flight') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.commitsDuring = Number(execFileSync('git', ['rev-list', '--count', PIN.head + '..HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim());
    ev.worldsLeft = fs.readdirSync(path.join(L.ROOT, 'run')).filter((n) => /^f8dr/.test(n));
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

function countCodeKeys() {
  const s = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java'), 'utf8');
  const re = /config\.get(?:Boolean|Int|Float|String)\s*\(\s*"([A-Za-z0-9_]+)"/g;
  const set = new Set();
  let m;
  while ((m = re.exec(s))) set.add(m[1]);
  return set.size;
}

main().catch((e) => {
  log('FATAL', (e && e.stack) || e);
  process.exit(1);
});
