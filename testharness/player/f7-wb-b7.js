#!/usr/bin/env node
/**
 * f7-wb-b7.js - W-B7 judged window (manure-source batch, HEAD af24713).
 *
 * Contract (task book 2026-11-05, B-7 batch M1/M2):
 *   R1 four-kind livestock drop chain (cow/sheep/pig/chicken)
 *   R2 child gate (Age:-24000 frozen) then adult drop
 *   R3 desperate gate (food 0.04 frozen) then 0.5 drop
 *   R4 chest convert face (sete 1.0 -> manure=1, then 2.0 -> manure=2)
 *   R5 wheat chain (32 hits, 16 manure, exhausted)
 *   R6 paper value row (0.1) -> 16 hits, 1 manure, compost 0.60
 *   R7 negative trio (no chest / empty chest / worms-only)
 *   R8 compost NBT persistence across restart (0.37)
 *   R9 config gate (false -> 0 rows; true -> row recovered)
 *   R10 zero regression (AILog / fertilize arm / token smoke / channels)
 *
 * /etest livemano and /etest chestio take the SENDER's position, so they are
 * issued as bot chat (the bot is opped by the standard stage); every other
 * probe stays on the console channel.
 *
 * randomTickSpeed is pinned to 0 for the whole window: the B-7 chest lane is
 * random-ticked, and an unpinned cadence would inject compost rows into the
 * deterministic chestio counts.
 *
 * Boots: b1 = R1..R8pre (save)
 *        b2 = R8 post (reload peek)
 *        b3 = R9a (chestWormCompostR196=false)
 *        b4 = R9b + R10 (true restored)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-b7';
const WORLD = 'b7m';
const A = 'ETIM_F7';
const B = 'ETIM_F8';

const PADY = 138;
const GY = 139;   // soil / entity feet on the pad
const AY = 140;   // plant layer
const LIV = { x: 200.5, y: GY, z: 700.5 };
const CHEST = { x: 180, y: GY, z: 700 };
const CHESTBOT = { x: 180.5, y: GY, z: 701.5 };
const MYC = { x: 170, y: GY, z: 700 };
const NOCHEST = { x: 225.5, y: GY, z: 712.5 };

const PIN = {
  head: '9af76e4',
  rel: { bytes: 972503, sha: '215C4FC7AC49882275FC805CAFFB620C50F8273E816745F8E83B42EA306638CA' },
  dev: { bytes: 953490, sha: '860F236F903CFA9F9B1B546544FC76B739A54BA0494846BDB24C318A81144662' },
  src: { bytes: 883274, sha: '209983F64D812BB5FE681A4DE97A59BAEB875DFFCAA9FDEA9B8EAC8FA45C049B' },
};

const sleep = L.sleep;
const log = L.log;
let srv = null;
let botA = null;
let botB = null;

const since = (n) => srv.all.slice(n).map(L.strip);
const uniq = (arr) => arr.filter((v, i) => arr.indexOf(v) === i);

/** bot chat command (the two B-7 bezels read the sender position). */
async function chat(bot, cmd, wait) {
  try {
    bot.chat('/' + cmd);
  } catch (e) {
    log('chat', 'send failed ' + cmd + ': ' + ((e && e.message) || e));
  }
  await sleep(wait === undefined ? 600 : wait);
}

function parseLivestock(rows) {
  const out = [];
  const re = /\[FarmLog\] manure src=livestock kind=(\w+) drop=1 period=(\d+) countdown=(\d+) pos=(\S+)/;
  for (const l of rows) { const m = re.exec(l); if (m) out.push({ kind: m[1], period: Number(m[2]), countdown: Number(m[3]), pos: m[4], raw: l }); }
  return out;
}
function parseLivemano(rows) {
  const out = [];
  const re = /\[FarmLog\] livemano radius=(\d+) food=(\S+) reset=(\d+) kinds=(.*?) \[server\]/;
  for (const l of rows) { const m = re.exec(l); if (m) out.push({ radius: Number(m[1]), food: m[2], reset: Number(m[3]), kinds: m[4], raw: l }); }
  return out;
}
function parseCompostHits(rows) {
  const out = [];
  const re = /\[FarmLog\] compost src=chest pos=(\S+) worms=(\d+) hits=(\d+) foods=(\S+) compost=([\d.]+)->([\d.]+) manure=(\d+)/;
  for (const l of rows) {
    const m = re.exec(l);
    if (m) out.push({ pos: m[1], worms: Number(m[2]), hits: Number(m[3]), foods: m[4], before: Number(m[5]), after: Number(m[6]), manure: Number(m[7]), raw: l });
  }
  return out;
}
function parseCompostConvert(rows) {
  const out = [];
  const re = /\[FarmLog\] compost src=chest-convert pos=(\S+) manure=(\d+) compost=([\d.]+)/;
  for (const l of rows) {
    const m = re.exec(l);
    if (m) out.push({ pos: m[1], manure: Number(m[2]), compost: Number(m[3]), raw: l });
  }
  return out;
}
function parsePeek(rows) {
  const out = [];
  const re = /\[FarmLog\] chest-peek pos=(\S+) worms=(\d+) compost=([\d.]+)(.*?) \[server\]/;
  for (const l of rows) {
    const m = re.exec(l);
    if (!m) continue;
    const slots = {};
    const gre = /\[(\d+)\]=(\S+)/g;
    let g;
    while ((g = gre.exec(m[4]))) slots[Number(g[1])] = g[2];
    const key = m[1] + '|' + m[2] + '|' + m[3] + '|' + JSON.stringify(slots);
    if (out.some((o) => o.key === key)) continue;
    out.push({ pos: m[1], worms: Number(m[2]), compost: Number(m[3]), slots, key, raw: l });
  }
  return out;
}
const rowCount = (rows, tag) => rows.filter((l) => l.indexOf(tag) >= 0).length;
/** only the arena's livestock (worldgen can carry wild cows elsewhere). */
const nearLiv = (d) => {
  const p = d.pos.split(',').map(Number);
  return Math.abs(p[0] - LIV.x) <= 12 && Math.abs(p[2] - LIV.z) <= 12;
};

async function summon(kind, nbt) {
  srv.send(`kill @e[type=!player]`);
  await sleep(700);
  srv.send(`summon minecraft:${kind} ${LIV.x} ${LIV.y} ${LIV.z}${nbt ? ' ' + nbt : ''}`);
  await sleep(900);
}
async function tpBot(bot, who, pos, wait) {
  await L.tp(srv, pos.x, pos.y, pos.z, { bot: who, wait: wait === undefined ? 800 : wait });
}

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], arms: {} };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src') };
  ev.mk = L.mkCounts();
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfgKeys=' + ev.cfgBefore.keys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'foodDebugLog', 'true');
  const propsText = propsBefore.toString('utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsText, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');

  function bootInfo(n) {
    const b = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim(), n };
    b.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    ev.boots.push(b);
    log('boot' + n, b.boot + ' mixin=' + b.mixinFail);
    return b;
  }
  async function stageWorld(n) {
    botA = await L.joinBot(srv, A);
    botB = await L.joinBot(srv, B);
    try { botA.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { botB.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, botA, { gamemode: 0, rts: 0, noPhysics: true, time: 18000 });
    await L.stage(srv, botB, { gamemode: 0, rts: 0, noPhysics: true, time: 18000 });
  }
  async function stopBoot() {
    try { if (botA) botA.quit(); } catch (e) { /* noop */ }
    try { if (botB) botB.quit(); } catch (e) { /* noop */ }
    botA = null; botB = null;
    const st = await srv.stop();
    return { stop: st, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) };
  }

  /* ======================= boot 1 ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b1' });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b1');
    bootInfo(1);
    ev.cfgB1 = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length, values: L.cfgKeys(L.CFG) };
    await stageWorld(1);
    await tpBot(botA, A, { x: LIV.x, y: LIV.y, z: LIV.z + 3 }, 1600);

    /* arena: catch platform FIRST (the server can stall for seconds during
     * worldgen; teleporting into empty sky killed the bot on the first pass),
     * then the full pad, the R10 roofed cell, and a final re-teleport. */
    await tpBot(botA, A, { x: LIV.x, y: LIV.y, z: LIV.z + 3 }, 150);
    srv.send(`fill 198 ${PADY} 701 202 ${PADY} 705 minecraft:stone 0`);
    await sleep(1200);
    srv.send(`fill 160 ${PADY} 685 230 ${PADY} 715 minecraft:stone 0`);
    await sleep(1600);
    srv.send(`fill 160 ${GY} 685 230 148 715 minecraft:air 0`);
    await sleep(1000);
    srv.send(`setblock ${CHEST.x} ${CHEST.y} ${CHEST.z} minecraft:chest 2 replace`);
    srv.send(`setblock ${MYC.x} ${MYC.y} ${MYC.z} minecraft:mycelium 0 replace`);
    srv.send(`setblock ${MYC.x} ${AY} ${MYC.z} minecraft:brown_mushroom 0 replace`);
    /* R10 roof: mushroomLegalAtMITE denies canSeeSky -> the cell must be roofed */
    srv.send(`fill ${MYC.x - 3} 145 ${MYC.z - 3} ${MYC.x + 3} 145 ${MYC.z + 3} minecraft:stone 0`);
    await sleep(2600);
    await tpBot(botA, A, { x: LIV.x, y: LIV.y, z: LIV.z + 3 }, 1600);
    srv.send(`etest health 20 ${A}`);
    await sleep(900);
    ev.arenaDeaths = srv.all.map(L.strip).filter((l) => /\[DeathLog\] ETIM_F7/.test(l)).length;
    ev.arenaPad = (await L.testBlock(srv, 200, PADY, 700, 'minecraft:stone')).ok;
    ev.arenaMushroom = (await L.testBlock(srv, MYC.x, AY, MYC.z, 'minecraft:brown_mushroom')).ok;
    log('arena', 'deaths=' + ev.arenaDeaths + ' pad=' + ev.arenaPad + ' mushroom=' + ev.arenaMushroom);

    /* ================= R1 four-kind drop chain ================= */
    ev.arms.R1 = [];
    for (const [kind, period] of [['cow', 24000], ['sheep', 48000], ['pig', 48000], ['chicken', 384000]]) {
      await summon(kind, null);
      const from = srv.all.length;
      await chat(botA, 'etest livemano 8', 2200);
      const rows = since(from);
      const drops = parseLivestock(rows).filter((d) => d.kind === kind && nearLiv(d));
      const mano = parseLivemano(rows);
      const rec = { kind, periodWanted: period, drops, mano, ok: drops.length === 1 && drops[0].period === period && mano.length === 1 };
      ev.arms.R1.push(rec);
      log('R1-' + kind, JSON.stringify({ ok: rec.ok, drops: drops.map((d) => d.period), reset: mano.map((m) => m.kinds) }));
    }

    /* ================= R2 child gate ================= */
    ev.arms.R2 = {};
    await summon('cow', '{Age:-24000}');
    let from = srv.all.length;
    await chat(botA, 'etest livemano 8', 5200);
    ev.arms.R2.childDrops = parseLivestock(since(from)).filter((d) => d.kind === 'cow' && nearLiv(d));
    ev.arms.R2.childMano = parseLivemano(since(from));
    await summon('cow', null);
    from = srv.all.length;
    await chat(botA, 'etest livemano 8', 2200);
    ev.arms.R2.adultDrops = parseLivestock(since(from)).filter((d) => d.kind === 'cow' && nearLiv(d));
    ev.arms.R2.adultMano = parseLivemano(since(from));
    log('R2', JSON.stringify({ child: ev.arms.R2.childDrops.length, adult: ev.arms.R2.adultDrops.length }));

    /* ================= R3 desperate gate ================= */
    /* The book's 0.04/0.5 presets are rejected by the bezel's integer-only
     * isNumber() guard (C-7-2); drive the same <0.05 short-circuit with 0
     * (frozen) and 1 (drop). */
    ev.arms.R3 = {};
    await summon('cow', null);
    from = srv.all.length;
    await chat(botA, 'etest livemano 6 0', 5200);
    ev.arms.R3.frozenDrops = parseLivestock(since(from)).filter((d) => d.kind === 'cow' && nearLiv(d));
    ev.arms.R3.frozenMano = parseLivemano(since(from));
    from = srv.all.length;
    await chat(botA, 'etest livemano 6 1', 2200);
    ev.arms.R3.passDrops = parseLivestock(since(from)).filter((d) => d.kind === 'cow' && nearLiv(d));
    ev.arms.R3.passMano = parseLivemano(since(from));
    log('R3', JSON.stringify({ frozen: ev.arms.R3.frozenDrops.length, pass: ev.arms.R3.passDrops.length, foods: ev.arms.R3.frozenMano.concat(ev.arms.R3.passMano).map((m) => m.food) }));

    /* ================= chest phase ================= */
    srv.send('kill @e[type=!player]');
    await sleep(600);
    await tpBot(botA, A, CHESTBOT, 1200);

    /* R7-2 empty chest */
    await chat(botA, 'etest chestio clear', 700);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 50', 1600);
    ev.arms.R7 = { emptyChest: { hits: parseCompostHits(since(from)), convert: parseCompostConvert(since(from)), peek: parsePeek(since(from)) } };

    /* R7-3 worms only */
    await chat(botA, 'etest chestio clear', 600);
    await chat(botA, 'etest chestio add 0 etim:worm_raw 4', 700);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 50', 1600);
    ev.arms.R7.wormsOnly = { hits: parseCompostHits(since(from)), convert: parseCompostConvert(since(from)), peek: parsePeek(since(from)) };

    /* R7-1 no chest */
    await tpBot(botA, A, NOCHEST, 900);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 5', 1000);
    ev.arms.R7.noChest = { lines: since(from).filter((l) => /chestio: no chest|\[FarmLog\]/.test(l)) };
    await tpBot(botA, A, CHESTBOT, 900);

    /* R4 convert face */
    ev.arms.R4 = {};
    await chat(botA, 'etest chestio add 0 etim:worm_raw 2', 600);
    await chat(botA, 'etest chestio sete 1.0', 600);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 1', 1100);
    ev.arms.R4.one = { hits: parseCompostHits(since(from)), convert: parseCompostConvert(since(from)), peek: parsePeek(since(from)) };
    await chat(botA, 'etest chestio sete 2.0', 600);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 1', 1100);
    ev.arms.R4.two = { hits: parseCompostHits(since(from)), convert: parseCompostConvert(since(from)), peek: parsePeek(since(from)) };
    log('R4', JSON.stringify({ one: ev.arms.R4.one.convert, two: ev.arms.R4.two.convert, peek: ev.arms.R4.two.peek }));

    /* R5 wheat chain */
    ev.arms.R5 = {};
    await chat(botA, 'etest chestio clear', 600);
    await chat(botA, 'etest chestio add 0 etim:worm_raw 8', 600);
    await chat(botA, 'etest chestio add 1 minecraft:wheat 32', 600);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 500', 3000);
    ev.arms.R5.rows = parseCompostHits(since(from));
    ev.arms.R5.peek = parsePeek(since(from));
    ev.arms.R5.sumHits = ev.arms.R5.rows.reduce((a, r) => a + r.hits, 0);
    ev.arms.R5.sumManure = ev.arms.R5.rows.reduce((a, r) => a + r.manure, 0);
    ev.arms.R5.foods = uniq(ev.arms.R5.rows.map((r) => r.foods));
    log('R5', JSON.stringify({ rows: ev.arms.R5.rows.length, sumHits: ev.arms.R5.sumHits, sumManure: ev.arms.R5.sumManure, foods: ev.arms.R5.foods, peek: ev.arms.R5.peek }));

    /* R6 paper value */
    ev.arms.R6 = {};
    /* R6 paper value. NOTE: the book's `slot 2` collides with the R5 manure
     * stack (the pump writes the first empty slot = 2 once wheat sits in 1);
     * slot 3 keeps the book's stated premise "manure 16/64 still banked". */
    await chat(botA, 'etest chestio add 3 minecraft:paper 16', 600);
    from = srv.all.length;
    await chat(botA, 'etest chestio tick 300', 2400);
    ev.arms.R6.rows = parseCompostHits(since(from));
    ev.arms.R6.peek = parsePeek(since(from));
    ev.arms.R6.sumHits = ev.arms.R6.rows.reduce((a, r) => a + r.hits, 0);
    ev.arms.R6.sumManure = ev.arms.R6.rows.reduce((a, r) => a + r.manure, 0);
    ev.arms.R6.foods = uniq(ev.arms.R6.rows.map((r) => r.foods));
    log('R6', JSON.stringify({ rows: ev.arms.R6.rows.length, sumHits: ev.arms.R6.sumHits, sumManure: ev.arms.R6.sumManure, foods: ev.arms.R6.foods, peek: ev.arms.R6.peek }));

    /* R8 pre: compost 0.37 + save */
    from = srv.all.length;
    await chat(botA, 'etest chestio sete 0.37', 700);
    await chat(botA, 'etest chestio peek', 800);
    ev.arms.R8pre = { peek: parsePeek(since(from)) };
    srv.send('save-all');
    await sleep(2600);
    log('R8pre', JSON.stringify(ev.arms.R8pre.peek));

    /* channels / counts before stop */
    ev.foodB1 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l));
    ev.rowCounts1 = L.rowCounts(srv.all.map(L.strip));
    ev.ailogB1 = rowCount(srv.all.map(L.strip), '[AILog]');
    ev.farmB1 = rowCount(srv.all.map(L.strip), '[FarmLog]');
    ev.stop1 = await stopBoot();
  } finally {
    try { if (!srv.exited) ev.stop1 = await stopBoot(); } catch (e) { ev.stop1Error = String((e && e.message) || e); }
  }

  /* ======================= boot 2: R8 reload ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b2' });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b2');
    bootInfo(2);
    await stageWorld(2);
    await tpBot(botA, A, CHESTBOT, 1800);
    const from = srv.all.length;
    await chat(botA, 'etest chestio peek', 1200);
    ev.arms.R8post = { peek: parsePeek(since(from)) };
    log('R8post', JSON.stringify(ev.arms.R8post.peek));
    ev.stop2 = await stopBoot();
  } finally {
    try { if (!srv.exited) ev.stop2 = await stopBoot(); } catch (e) { ev.stop2Error = String((e && e.message) || e); }
  }

  /* ======================= boot 3: R9a gate off ======================= */
  ev.cfgGateBefore = L.cfgKeys(L.CFG).chestWormCompostR196;
  L.setCfgValue(L.CFG, 'chestWormCompostR196', 'false');
  ev.cfgGateOff = L.cfgKeys(L.CFG).chestWormCompostR196;
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b3' });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b3');
    bootInfo(3);
    ev.cfgB3Gate = L.cfgKeys(L.CFG).chestWormCompostR196;
    await stageWorld(3);
    await tpBot(botA, A, CHESTBOT, 1600);
    await chat(botA, 'etest chestio clear', 700);
    await chat(botA, 'etest chestio add 0 etim:worm_raw 4', 700);
    await chat(botA, 'etest chestio add 1 minecraft:wheat 16', 700);
    const from = srv.all.length;
    await chat(botA, 'etest chestio tick 50', 1800);
    ev.arms.R9a = { hits: parseCompostHits(since(from)), convert: parseCompostConvert(since(from)), peek: parsePeek(since(from)) };
    log('R9a', JSON.stringify({ hits: ev.arms.R9a.hits.length, convert: ev.arms.R9a.convert.length, peek: ev.arms.R9a.peek }));
    ev.stop3 = await stopBoot();
  } finally {
    try { if (!srv.exited) ev.stop3 = await stopBoot(); } catch (e) { ev.stop3Error = String((e && e.message) || e); }
  }

  /* ======================= boot 4: R9b + R10 ======================= */
  L.setCfgValue(L.CFG, 'chestWormCompostR196', 'true');
  ev.cfgGateOn = L.cfgKeys(L.CFG).chestWormCompostR196;
  srv = await L.startServer({ root: L.ROOT, tag: TAG + '-b4' });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b4');
    bootInfo(4);
    ev.cfgB4Gate = L.cfgKeys(L.CFG).chestWormCompostR196;
    await stageWorld(4);
    await tpBot(botA, A, CHESTBOT, 1600);

    /* R9b gate restored */
    let from = srv.all.length;
    await chat(botA, 'etest chestio tick 300', 2600);
    ev.arms.R9b = { hits: parseCompostHits(since(from)), convert: parseCompostConvert(since(from)), peek: parsePeek(since(from)) };
    ev.arms.R9b.sumHits = ev.arms.R9b.hits.reduce((a, r) => a + r.hits, 0);
    ev.arms.R9b.sumManure = ev.arms.R9b.hits.reduce((a, r) => a + r.manure, 0);
    log('R9b', JSON.stringify({ rows: ev.arms.R9b.hits.length, sumHits: ev.arms.R9b.sumHits, sumManure: ev.arms.R9b.sumManure, peek: ev.arms.R9b.peek }));

    /* R10a AILog (fresh adult cow; mobDebugLog already true) */
    srv.send(`summon minecraft:cow ${LIV.x} ${LIV.y} ${LIV.z}`);
    await sleep(16000);
    ev.arms.R10 = { ailog: srv.all.map(L.strip).filter((l) => /\[AILog\] livestock/.test(l)).slice(-6) };

    /* R10b fertilize arm */
    await tpBot(botA, A, { x: MYC.x + 0.5, y: AY, z: MYC.z + 1.5 }, 1200);
    srv.send(`setblock ${MYC.x} ${MYC.y} ${MYC.z} minecraft:mycelium 0 replace`);
    srv.send(`setblock ${MYC.x} ${AY} ${MYC.z} minecraft:brown_mushroom 0 replace`);
    srv.send(`fill ${MYC.x - 3} 145 ${MYC.z - 3} ${MYC.x + 3} 145 ${MYC.z + 3} minecraft:stone 0`);
    await sleep(900);
    ev.arms.R10.mushroom = await L.testBlock(srv, MYC.x, AY, MYC.z, 'minecraft:brown_mushroom');
    srv.send(`clear ${A}`);
    await sleep(300);
    srv.send(`etest hold etim:manure ${A}`);
    await sleep(1400);
    await L.lookAtTop(botA, MYC.x, MYC.y, MYC.z);
    from = srv.all.length;
    srv.send(`etest useblock ${MYC.x} ${MYC.y} ${MYC.z} ${A}`);
    await sleep(1400);
    ev.arms.R10.fertilize = since(from).filter((l) => /\[FarmLog\] fertilize src=manure/.test(l));
    log('R10b', JSON.stringify(ev.arms.R10.fertilize));

    /* channel counts BEFORE the token smoke */
    ev.rowCounts4 = L.rowCounts(srv.all.map(L.strip));
    ev.foodB4 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l));

    /* R10c /etest family token smoke (one shot each) */
    srv.send(`give ${A} minecraft:iron_sword 1`);
    await sleep(700);
    const tokens = [
      'etest hold minecraft:iron_sword', 'etest food 20 20', 'etest hunger 20 20',
      'etest health 20', 'etest level 5', 'etest debt 3',
      'etest enchant mainhand 3', 'etest enchantprobe mainhand',
      'etest blockprobe', 'etest hurt 2', 'etest attack @e[type=cow,limit=1]',
      'etest dig 170 138 700', 'etest useblock 170 138 700',
      'etest useitem', 'etest hold etim:manure', 'etest release',
      'etest damage 1', 'etest quality fine', 'etest anvilwear 170 138 700',
      'etest fishgate 6000', 'etest fishretract', 'etest fishprobe type 10',
      'etest arrowprobe recovery iron 1 10', 'etest livemano 8', 'etest chestio peek',
      'etest',
    ];
    ev.arms.R10.tokens = [];
    for (const t of tokens) {
      const f = srv.all.length;
      await chat(botA, t, 700);
      ev.arms.R10.tokens.push({ cmd: t, lines: since(f).filter((l) => /\[EtimTest\]|\[TestLog\]|Exception|Error|FAILED/.test(l)).slice(0, 6) });
    }
    ev.arms.R10.tokenErrors = srv.all.map(L.strip).filter((l) => /\[TestLog\] step=\S+ player=\S+ FAILED=|java\.lang\.\w*Exception|java\.lang\.\w*Error/.test(l));
    ev.arms.R10.serverAlive = !srv.exited;

    ev.stop4 = await stopBoot();
  } finally {
    try { if (!srv.exited) ev.stop4 = await stopBoot(); } catch (e) { ev.stop4Error = String((e && e.message) || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length, values: L.cfgKeys(L.CFG) };
    ev.obfAfter = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)), untouched: L.sha256(fs.readFileSync(L.OBFCFG)) === ev.obfBefore.sha };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, sha: L.sha256(fs.readFileSync(L.PROPS)), level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.crashAfter = L.crashCount();
    ev.portAfter = L.netstatListen(L.PORT);
    ev.pinsAfter = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src'), mk: L.mkCounts() };
    ev.headAfter = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
