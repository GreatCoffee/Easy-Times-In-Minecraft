#!/usr/bin/env node
/**
 * f7-wb-b6.js - W-B6 judged window (per-player stamp fix, HEAD ade1bcc).
 *
 * Contract (task book 2026-11-05, B-6 batch):
 *   R1 same-tick giant pair x2 rounds. Per round: indoor mycelium room,
 *      replant brown mushroom, 2 hands -> stage 2/3, then TWO useblock
 *      commands back-to-back (no sleep): A clicks the mycelium (3rd click =
 *      giant + stamp A) and B clicks a pad block with stone. Checks:
 *        1) both [TestLog] step=useblock tick= values equal;
 *        2) A [FoodLog] placeDrainDeny src=giantGen hardness=0.2 (A);
 *        3) B [FoodLog] placeDrain base=1.5 (B)  <- the discriminator: the
 *           old global stamp would have denied B in the same tick;
 *        4) FarmLog giant=1 rows, one per round.
 *   R2 same-tick hoe pair x1: A hoe on grass + B stone, no sleep. Checks:
 *        1) tick= equal; 2) A hoeDrain present; 3) A no placeDrain (the till
 *        PlaceEvent is silent-skipped); 4) B placeDrain base=1.5 present.
 *   R3 time-spread control: A giant alone -> deny; then B stone in a later
 *      tick -> placeDrain 1.5 (baseline, no collision).
 *   R4 zero regression: stage order 1/3->2/3->giant, replant reset, reload
 *      keep (b2), outdoor white-eat unchanged; food channel otherwise clean.
 *   R5 closeout pins.
 *
 * Boots: b1 = R1 x2 + R2 + R3 + R4out + R4reset + R4plant(save)
 *        b2 = R4reload
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-b6';
const WORLD = 'b6j';
const A = 'ETIM_F7';
const B = 'ETIM_F8';
const AY = 140;   // mushroom standing height
const GY = 139;   // soil height
const PAD = 138;  // pad top
const ROOFY = 154;

const SP = {
  m: { x: 170, z: 700 },      // mycelium TOP chain (A)
  stone: { x: 204, z: 690 },  // B stone pad column
  grass: { x: 200, z: 690 },  // R2 hoe target (A)
  white: { x: 212, z: 700 },  // R4out white-eat
  reset: { x: 178, z: 700 },  // R4reset replant
  plant: { x: 162, z: 692 },  // R4plant -> b2 reload
};

const PIN = {
  head: 'ade1bcc',
  rel: { bytes: 958492, sha: '5FA2731F52CC9CB1DD2905DDCC76C2C38940065438D87040C3DE2F576F4B796D' },
  dev: { bytes: 939592, sha: 'BD59BCF3284F5BB72175DA687CEB1D1796E1494377D8719C4F52DBC6C8AFB53E' },
  src: { bytes: 871688, sha: '602CC85AABA1B1067B5CA96792C04A58489A9DCBCCF07D2B8E8F731201D1FE87' },
};

const sleep = L.sleep;
const log = L.log;
let srv = null;
let botA = null;
let botB = null;

const held = (bot) => (bot && bot.heldItem ? bot.heldItem.count : null);

function parseFarm(rows) {
  return rows.map((raw) => {
    const o = { raw };
    let m = /kind=(red|brown)/.exec(raw); if (m) o.kind = m[1];
    m = /roll=([\d.]+|none)/.exec(raw); if (m) o.roll = m[1];
    m = /stage=(-?\d+)/.exec(raw); if (m) o.stage = Number(m[1]);
    o.giant = /giant=1/.test(raw);
    o.giantFailed = /giant=failed/.test(raw);
    o.miss = /stage=-1/.test(raw);
    o.outdoor = /outdoor=1/.test(raw);
    o.deny = /gate=deny/.test(raw);
    o.chain = /chain=mycelium/.test(raw) ? 'mycelium' : (o.kind ? 'click' : 'other');
    return o;
  });
}
const shortFarm = (rows) => rows.map((r) => r.replace(/^.*fertilize src=manure /, '').replace(/ \[server\]$/, ''));
const shortFood = (rows) => rows.map((r) => r.replace(/^.*\[FoodLog\]\s*/, ''));
const seqOf = (rows) => parseFarm(rows).map((o) => (o.deny ? 'D' : o.miss ? -1 : (o.giant ? 'G' : o.stage)));
const foodName = (row) => {
  const m = /\[FoodLog\]\s+(\S+)\s+\(/.exec(row);
  return m ? m[1] : null;
};

async function existsAt(x, y, z, block) {
  for (let a = 0; a < 2; a++) {
    const r = await L.testBlock(srv, x, y, z, block);
    if (r.ok) return true;
    await sleep(450);
  }
  return false;
}
async function warmAt(bot, who, x, y, z) {
  await L.lookAtTop(bot, x, y, z);
  L.useBlock(srv, x, y, z, who);
  await sleep(520);
}
async function giveItem(who, name, count) {
  srv.send(`clear ${who}`);
  await sleep(420);
  srv.send(`give ${who} ${name} ${count}`);
  await sleep(2500);
  const bot = who === A ? botA : botB;
  return bot && bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;
}
/** one judged hand; a silent hand (no FarmLog row, probe intact) is a
 *  harness miss, not a mod verdict - retry up to 2 extra times */
async function handAt(bot, who, x, y, z, probe) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const from = srv.all.length;
    const before = held(bot);
    await L.lookAtTop(bot, x, y, z);
    L.useBlock(srv, x, y, z, who);
    await sleep(800);
    const after = held(bot);
    const lines = srv.all.slice(from).map(L.strip);
    const farm = lines.filter((l) => /\[FarmLog\]/.test(l));
    const food = lines.filter((l) => /\[FoodLog\]/.test(l));
    const useblocks = lines.filter((l) => /step=useblock/.test(l)).length;
    if (farm.length || food.length) {
      return { before, after, delta: before === null || after === null ? null : after - before, farm, food, useblocks, attempts: attempt + 1 };
    }
    if (await existsAt(probe.x, probe.y, probe.z, probe.block)) { await sleep(550); continue; }
    return { before, after, delta: null, farm: [], food: [], useblocks, attempts: attempt + 1, missing: true };
  }
  return { before: null, after: null, delta: null, farm: [], food: [], useblocks: 0, attempts: 3 };
}
const recHand = (h) => ({ delta: h.delta, attempts: h.attempts, farm: shortFarm(h.farm), food: shortFood(h.food), seq: seqOf(h.farm), missing: !!h.missing });

/** clear a grown giant, replant the small mushroom, step back in */
async function clearMushroomSpot(x, z, block) {
  await L.tp(srv, x + 0.5, AY, z + 8.5, { bot: A, wait: 520 });
  srv.send(`fill ${x - 3} ${AY} ${z - 3} ${x + 3} 153 ${z + 3} minecraft:air 0`);
  await sleep(700);
  srv.send(`setblock ${x} ${AY} ${z} minecraft:air 0 replace`);
  await sleep(250);
  srv.send(`setblock ${x} ${AY} ${z} ${block} 0 replace`);
  await sleep(700);
  await L.tp(srv, x + 0.5, AY, z + 1.5, { bot: A, wait: 850 });
  await warmAt(botA, A, x, PAD, z);
}
async function clearStoneColumn() {
  srv.send(`fill ${SP.stone.x} ${GY} ${SP.stone.z} ${SP.stone.x} 142 ${SP.stone.z} minecraft:air 0`);
  await sleep(320);
}
async function ensureMushroom(x, z, block) {
  if (await existsAt(x, AY, z, block)) return true;
  srv.send(`setblock ${x} ${AY} ${z} ${block} 0 replace`);
  await sleep(650);
  return existsAt(x, AY, z, block);
}

/** the judged same-tick pair: two console commands, no sleep in between. */
async function sameTickPair(aPos, bPos, label) {
  const from = srv.all.length;
  const aBefore = held(botA);
  const bBefore = held(botB);
  srv.send(`etest useblock ${aPos.x} ${aPos.y} ${aPos.z} ${A}`);
  srv.send(`etest useblock ${bPos.x} ${bPos.y} ${bPos.z} ${B}`);
  await sleep(1300);
  const lines = srv.all.slice(from).map(L.strip);
  const test = lines.filter((l) => /\[TestLog\] step=useblock/.test(l));
  const tickOf = (who) => {
    const r = test.find((l) => new RegExp('player=' + who + '\\b').test(l));
    if (!r) return null;
    const m = /tick=(\d+)/.exec(r);
    return m ? Number(m[1]) : null;
  };
  const tickA = tickOf(A);
  const tickB = tickOf(B);
  const farm = lines.filter((l) => /\[FarmLog\]/.test(l));
  const food = lines.filter((l) => /\[FoodLog\]/.test(l));
  return {
    label, tickA, tickB, sameTick: tickA !== null && tickA === tickB,
    farm, food,
    foodA: food.filter((l) => foodName(l) === A),
    foodB: food.filter((l) => foodName(l) === B),
    deltaA: aBefore === null ? null : (held(botA) === null ? null : held(botA) - aBefore),
    deltaB: bBefore === null ? null : (held(botB) === null ? null : held(botB) - bBefore),
    testLines: test,
  };
}

/** R1: one round = fresh mushroom + 2 pre-clicks + same-tick giant/stone pair */
async function r1Round(idx) {
  const rec = { round: idx, attempts: [], ok: false };
  for (let attempt = 1; attempt <= 6; attempt++) {
    await clearStoneColumn();
    await clearMushroomSpot(SP.m.x, SP.m.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.stone.x + 0.5, GY, SP.stone.z + 1.5, { bot: B, wait: 700 });
    if (!botB.heldItem || botB.heldItem.name !== 'stone') await giveItem(B, 'minecraft:stone', 64);
    const pre = [];
    for (let k = 0; k < 2; k++) {
      pre.push(recHand(await handAt(botA, A, SP.m.x, GY, SP.m.z, { x: SP.m.x, y: AY, z: SP.m.z, block: 'minecraft:brown_mushroom' })));
    }
    const seq = pre.map((p) => p.seq[0]);
    if (seq.length !== 2 || seq[0] !== 1 || seq[1] !== 2) {
      rec.attempts.push({ attempt, reason: 'pre-clicks not 1,2', pre: pre.map((p) => p.seq), raw: pre.map((p) => p.farm) });
      continue;
    }
    const pair = await sameTickPair({ x: SP.m.x, y: GY, z: SP.m.z },
      { x: SP.stone.x, y: PAD, z: SP.stone.z }, 'R1-' + idx + '-a' + attempt);
    const giant = pair.farm.filter((l) => /giant=1/.test(l));
    const entry = {
      attempt, pre: seq, tickA: pair.tickA, tickB: pair.tickB, sameTick: pair.sameTick,
      giantRows: giant.length, farm: shortFarm(pair.farm),
      denyA: shortFood(pair.foodA.filter((l) => /placeDrainDeny/.test(l))),
      placeDrainA: shortFood(pair.foodA.filter((l) => /placeDrain /.test(l))),
      bFood: shortFood(pair.foodB),
      deltaA: pair.deltaA, deltaB: pair.deltaB, test: pair.testLines,
    };
    rec.attempts.push(entry);
    if (giant.length === 1 && pair.sameTick) {
      rec.ok = true;
      rec.got = entry;
      rec.giantBlock = await existsAt(SP.m.x, AY, SP.m.z, 'minecraft:brown_mushroom_block');
      break;
    }
  }
  return rec;
}

/** R2: same-tick hoe pair (A hoe on grass, B stone) */
async function r2Round() {
  const rec = { attempts: [], ok: false };
  for (let attempt = 1; attempt <= 6; attempt++) {
    await clearStoneColumn();
    srv.send(`setblock ${SP.grass.x} ${GY} ${SP.grass.z} minecraft:air 0 replace`);
    await sleep(300);
    srv.send(`setblock ${SP.grass.x} ${GY} ${SP.grass.z} minecraft:grass 0 replace`);
    await sleep(650);
    await L.tp(srv, SP.grass.x + 0.5, GY, SP.grass.z + 1.5, { bot: A, wait: 800 });
    await L.tp(srv, SP.stone.x + 0.5, GY, SP.stone.z + 1.5, { bot: B, wait: 300 });
    await giveItem(A, 'minecraft:iron_hoe', 1);
    if (!botB.heldItem || botB.heldItem.name !== 'stone') await giveItem(B, 'minecraft:stone', 64);
    const pair = await sameTickPair({ x: SP.grass.x, y: GY, z: SP.grass.z },
      { x: SP.stone.x, y: PAD, z: SP.stone.z }, 'R2-a' + attempt);
    const hoeA = pair.foodA.filter((l) => /hoeDrain/.test(l));
    const placeA = pair.foodA.filter((l) => /placeDrain /.test(l) || /placeDrainDeny/.test(l));
    const placeB = pair.foodB.filter((l) => /placeDrain /.test(l));
    const entry = {
      attempt, tickA: pair.tickA, tickB: pair.tickB, sameTick: pair.sameTick,
      deltaA: pair.deltaA, deltaB: pair.deltaB,
      hoeA: shortFood(hoeA), placeA: shortFood(placeA), placeB: shortFood(placeB),
      foodA: shortFood(pair.foodA), foodB: shortFood(pair.foodB), test: pair.testLines,
      farmland: await existsAt(SP.grass.x, GY, SP.grass.z, 'minecraft:farmland'),
    };
    rec.attempts.push(entry);
    if (pair.sameTick && hoeA.length === 1 && placeA.length === 0 && placeB.length === 1) {
      rec.ok = true;
      rec.got = entry;
      break;
    }
  }
  return rec;
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
  ev.cfgBefore = {
    bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length,
    farm: L.cfgKeys(L.CFG).farmDebugLog, food: L.cfgKeys(L.CFG).foodDebugLog,
  };
  ev.obfBefore = { bytes: fs.statSync(L.OBFCFG).size, sha: L.sha256(fs.readFileSync(L.OBFCFG)) };
  ev.propsBefore = { bytes: propsBefore.length, sha: L.sha256(propsBefore), level: L.getProp(propsBefore.toString('utf8'), 'level-name') };
  ev.crashBefore = L.crashCount();
  ev.portBefore = L.netstatListen(L.PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' jars=' + [ev.pins.rel.ok, ev.pins.dev.ok, ev.pins.src.ok].join(',') + ' mk=' + ev.mk.ok + ' cfgKeys=' + ev.cfgBefore.keys);

  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'foodDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const bootTag = (n) => TAG + '-b' + n;
  function bootInfo(n) {
    const b = { boot: L.strip(srv.all.find((l) => /Done \(/.test(l))).trim(), n };
    b.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    ev.boots.push(b);
    log('boot' + n, b.boot + ' mixin=' + b.mixinFail);
    return b;
  }

  /* ======================= boot 1 ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: bootTag(1) });
  botA = null; botB = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b1');
    bootInfo(1);
    botA = await L.joinBot(srv, A);
    botB = await L.joinBot(srv, B);
    try { botA.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { botB.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, botA, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.stage(srv, botB, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });

    await L.tp(srv, SP.m.x + 0.5, AY, SP.m.z + 1.5, { bot: A, wait: 2600 });
    srv.send(`fill 150 ${PAD} 680 230 ${PAD} 720 minecraft:stone 0`);
    await sleep(1200);
    srv.send(`fill 158 ${GY} 688 184 ${GY} 712 minecraft:mycelium 0`);
    srv.send(`fill 157 ${GY} 687 157 156 713 minecraft:stone 0`);
    srv.send(`fill 185 ${GY} 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 687 185 156 687 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 713 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 156 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 158 ${AY} 688 184 155 712 minecraft:air 0`);
    /* R4out white-eat geometry: mycelium + 5x5 roof at y+14 (FM7v2/B5-proven) */
    srv.send(`setblock ${SP.white.x} ${GY} ${SP.white.z} minecraft:mycelium 0 replace`);
    srv.send(`fill ${SP.white.x - 2} ${ROOFY} ${SP.white.z - 2} ${SP.white.x + 2} ${ROOFY} ${SP.white.z + 2} minecraft:stone 0`);
    await sleep(4200);

    /* A holds manure for R1/R3/R4; B holds stone */
    ev.heldManureA = await giveItem(A, 'etim:manure', 64);
    await L.tp(srv, SP.stone.x + 0.5, GY, SP.stone.z + 1.5, { bot: B, wait: 800 });
    ev.heldStoneB = await giveItem(B, 'minecraft:stone', 64);
    await L.tp(srv, SP.m.x + 0.5, AY, SP.m.z + 1.5, { bot: A, wait: 1400 });
    log('hold', 'A=' + JSON.stringify(ev.heldManureA) + ' B=' + JSON.stringify(ev.heldStoneB));

    /* ================= R1 same-tick giant pair x2 ================= */
    ev.arms.R1 = [];
    for (let r = 1; r <= 2; r++) {
      const round = await r1Round(r);
      ev.arms.R1.push(round);
      const got = round.got || {};
      log('R1-' + r, JSON.stringify({
        ok: round.ok, attempts: round.attempts.length, pre: got.pre, tickA: got.tickA, tickB: got.tickB,
        sameTick: got.sameTick, giants: got.giantRows, denyA: got.denyA, bFood: got.bFood,
        deltas: [got.deltaA, got.deltaB], giantBlock: round.giantBlock,
      }));
    }

    /* ================= R2 same-tick hoe pair x1 ================= */
    ev.arms.R2 = await r2Round();
    log('R2', JSON.stringify({
      ok: ev.arms.R2.ok, attempts: ev.arms.R2.attempts.length,
      got: ev.arms.R2.got ? {
        tickA: ev.arms.R2.got.tickA, tickB: ev.arms.R2.got.tickB, sameTick: ev.arms.R2.got.sameTick,
        hoeA: ev.arms.R2.got.hoeA, placeA: ev.arms.R2.got.placeA, placeB: ev.arms.R2.got.placeB,
        deltas: [ev.arms.R2.got.deltaA, ev.arms.R2.got.deltaB], farmland: ev.arms.R2.got.farmland,
      } : null,
    }));

    /* ================= R3 time-spread control ================= */
    ev.arms.R3 = { pre: [], giant: null, stone: null };
    await clearStoneColumn();
    await clearMushroomSpot(SP.m.x, SP.m.z, 'minecraft:brown_mushroom');
    await giveItem(A, 'etim:manure', 16);
    for (let k = 0; k < 2; k++) {
      ev.arms.R3.pre.push(recHand(await handAt(botA, A, SP.m.x, GY, SP.m.z, { x: SP.m.x, y: AY, z: SP.m.z, block: 'minecraft:brown_mushroom' })));
    }
    ev.arms.R3.giant = recHand(await handAt(botA, A, SP.m.x, GY, SP.m.z, { x: SP.m.x, y: AY, z: SP.m.z, block: 'minecraft:brown_mushroom' }));
    await sleep(1400);
    await L.tp(srv, SP.stone.x + 0.5, GY, SP.stone.z + 1.5, { bot: B, wait: 900 });
    ev.arms.R3.stone = recHand(await handAt(botB, B, SP.stone.x, PAD, SP.stone.z, { x: SP.stone.x, y: PAD + 1, z: SP.stone.z, block: 'minecraft:air' }));
    ev.arms.R3.stoneBlock = await existsAt(SP.stone.x, PAD + 1, SP.stone.z, 'minecraft:stone');
    log('R3', JSON.stringify({
      pre: ev.arms.R3.pre.map((p) => p.seq), giant: { seq: ev.arms.R3.giant.seq, food: ev.arms.R3.giant.food },
      stone: { food: ev.arms.R3.stone.food, delta: ev.arms.R3.stone.delta }, block: ev.arms.R3.stoneBlock,
    }));

    /* ================= R4out white-eat ================= */
    srv.send(`setblock ${SP.white.x} ${AY} ${SP.white.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4outEnsured = await ensureMushroom(SP.white.x, SP.white.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.white.x + 0.5, GY, SP.white.z + 1.5, { bot: A, wait: 1200 });
    await warmAt(botA, A, SP.white.x, PAD, SP.white.z);
    ev.arms.R4out = recHand(await handAt(botA, A, SP.white.x, GY, SP.white.z, { x: SP.white.x, y: AY, z: SP.white.z, block: 'minecraft:brown_mushroom' }));
    ev.arms.R4out.survives = await existsAt(SP.white.x, AY, SP.white.z, 'minecraft:brown_mushroom');
    log('R4out', JSON.stringify({ farm: ev.arms.R4out.farm, food: ev.arms.R4out.food, delta: ev.arms.R4out.delta, live: ev.arms.R4out.survives }));

    /* ================= R4reset replant reset ================= */
    srv.send(`setblock ${SP.reset.x} ${AY} ${SP.reset.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4resetEnsured = await ensureMushroom(SP.reset.x, SP.reset.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.reset.x + 0.5, AY, SP.reset.z + 1.5, { bot: A, wait: 1200 });
    await warmAt(botA, A, SP.reset.x, PAD, SP.reset.z);
    ev.arms.R4reset = { before: [] };
    for (let k = 0; k < 2; k++) {
      ev.arms.R4reset.before.push(recHand(await handAt(botA, A, SP.reset.x, GY, SP.reset.z, { x: SP.reset.x, y: AY, z: SP.reset.z, block: 'minecraft:brown_mushroom' })));
    }
    srv.send(`setblock ${SP.reset.x} ${AY} ${SP.reset.z} minecraft:air 0 replace`);
    await sleep(700);
    srv.send(`setblock ${SP.reset.x} ${AY} ${SP.reset.z} minecraft:brown_mushroom 0 replace`);
    await sleep(800);
    ev.arms.R4resetEnsuredAfter = await ensureMushroom(SP.reset.x, SP.reset.z, 'minecraft:brown_mushroom');
    await warmAt(botA, A, SP.reset.x, PAD, SP.reset.z);
    ev.arms.R4reset.after = recHand(await handAt(botA, A, SP.reset.x, GY, SP.reset.z, { x: SP.reset.x, y: AY, z: SP.reset.z, block: 'minecraft:brown_mushroom' }));
    log('R4reset', JSON.stringify({ before: ev.arms.R4reset.before.map((h) => h.seq), after: ev.arms.R4reset.after.seq }));

    /* ================= R4plant for the reload check ================= */
    srv.send(`setblock ${SP.plant.x} ${AY} ${SP.plant.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4plantEnsured = await ensureMushroom(SP.plant.x, SP.plant.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.plant.x + 0.5, AY, SP.plant.z + 1.5, { bot: A, wait: 1200 });
    await warmAt(botA, A, SP.plant.x, PAD, SP.plant.z);
    ev.arms.R4plant = recHand(await handAt(botA, A, SP.plant.x, GY, SP.plant.z, { x: SP.plant.x, y: AY, z: SP.plant.z, block: 'minecraft:brown_mushroom' }));
    srv.send('save-all');
    await sleep(2000);
    log('R4plant', JSON.stringify({ seq: ev.arms.R4plant.seq, farm: ev.arms.R4plant.farm }));

    ev.foodB1 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).map((l) => l.replace(/^.*\[FoodLog\]\s*/, ''));
    ev.rowCounts1 = L.rowCounts(srv.all.map(L.strip));
    ev.stop1 = await srv.stop();
    ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (botA) botA.quit(); } catch (e) { /* noop */ }
    try { if (botB) botB.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop1 = await srv.stop(); ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop1Error = String((e && e.message) || e); }
  }

  /* ======================= boot 2: reload ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: bootTag(2) });
  botA = null; botB = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b2');
    bootInfo(2);
    botA = await L.joinBot(srv, A);
    try { botA.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, botA, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, SP.plant.x + 0.5, AY, SP.plant.z + 1.5, { bot: A, wait: 2600 });
    ev.arms.R4reload = { survives: await existsAt(SP.plant.x, AY, SP.plant.z, 'minecraft:brown_mushroom') };
    ev.heldManure2 = await giveItem(A, 'etim:manure', 8);
    await warmAt(botA, A, SP.plant.x, PAD, SP.plant.z);
    ev.arms.R4reload.after = recHand(await handAt(botA, A, SP.plant.x, GY, SP.plant.z, { x: SP.plant.x, y: AY, z: SP.plant.z, block: 'minecraft:brown_mushroom' }));
    log('R4reload', JSON.stringify({ survives: ev.arms.R4reload.survives, seq: ev.arms.R4reload.after.seq }));

    ev.foodB2 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).map((l) => l.replace(/^.*\[FoodLog\]\s*/, ''));
    ev.rowCounts2 = L.rowCounts(srv.all.map(L.strip));
    ev.stop2 = await srv.stop();
    ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (botA) botA.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop2 = await srv.stop(); ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop2Error = String((e && e.message) || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = {
      bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length,
      farm: L.cfgKeys(L.CFG).farmDebugLog, food: L.cfgKeys(L.CFG).foodDebugLog,
    };
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
