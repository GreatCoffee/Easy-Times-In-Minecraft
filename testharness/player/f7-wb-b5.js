#!/usr/bin/env node
/**
 * f7-wb-b5.js - W-B5 judged window (place-hunger stamp fix, HEAD eafe3c7).
 *
 * Contract (task book 2026-11-05):
 *   R1 mycelium TOP chain indoor, 6 hands (2 giants) -> per giant one
 *      FarmLog giant=1 <-> one [FoodLog] placeDrainDeny src=giantGen
 *      hardness=0.2; whole window placeDrain = 0; held -1 per hand
 *   R2 red click arm on the FM7v2 legal spot (5x5 roof at y+14), max 12
 *      hands or stop at first giant -> held -1, 0 placeDrain, giant -> deny
 *   R2ctl red open sky -> gate=deny legal=0, no consume
 *   R3 bot places 3 stone blocks (survival) -> placeDrain base=1.5 x3,
 *      no deny (exemption does not leak)
 *   R4 zero regression: stage chain / replant reset / reload keep; mycelium
 *      roll=none; outdoor white-eat; food channel otherwise clean
 *   R5 closeout pins
 *
 * Boots: b1 = R1 + R2 + R2ctl + R4out + R3 + R4reset + R4plant(save)
 *        b2 = R4reload + R1b (third giant sample) + R3b (post-giant stone)
 *             + R4plant2(save)
 *        b3 = R4reload2
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-b5';
const WORLD = 'b5j';
const AY = 140;
const GY = 139;
const PAD = 138;
const ROOFY = 154;

const SP = {
  m1: { x: 170, z: 700 },      // R1 mycelium TOP chain
  red: { x: 196, z: 700 },     // R2 red legal
  redOpen: { x: 216, z: 700 }, // R2ctl open sky
  white: { x: 212, z: 700 },   // R4out white-eat
  reset: { x: 178, z: 700 },   // R4reset replant
  plant1: { x: 162, z: 692 },  // R4plant -> b2 reload
  m2: { x: 174, z: 700 },      // b2 third giant sample
  plant2: { x: 166, z: 692 },  // b2 plant -> b3 reload
  stones: { x: 210, z: 690 },  // R3 stone column
  stone2: { x: 206, z: 695 },  // R3b post-giant stone
};

const PIN = {
  head: 'eafe3c7',
  rel: { bytes: 958013, sha: '0C65E2C51E5B0D3721F26F7656357168D6907390EF3097C99224344A65C0F885' },
  dev: { bytes: 939147, sha: 'ABB08A530EEED1970470DC35852EDB87DA1E03A285343D6D8889FD8B7FFC62DB' },
  src: { bytes: 871323, sha: '87B2BB491BDC45953DEBF951CA4F987836E6290804C145062821BB1337F77EF8' },
};

const sleep = L.sleep;
const log = L.log;
const who = L.BOT;
let srv = null;
let bot = null;

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

async function existsAt(x, y, z, block) {
  for (let a = 0; a < 2; a++) {
    const r = await L.testBlock(srv, x, y, z, block);
    if (r.ok) return true;
    await sleep(450);
  }
  return false;
}
async function warmAt(x, y, z) {
  await L.lookAtTop(bot, x, y, z);
  L.useBlock(srv, x, y, z, who);
  await sleep(520);
}
async function giveItem(name, count) {
  srv.send(`clear ${who}`);
  await sleep(420);
  srv.send(`give ${who} ${name} ${count}`);
  await sleep(2500);
  return bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;
}
/** one judged hand; a silent hand (no FarmLog row) is a harness miss, not a
 *  mod verdict - retry up to 2 extra times while the probe block is intact */
async function handAt(x, y, z, probe) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const from = srv.all.length;
    const before = bot.heldItem ? bot.heldItem.count : null;
    await L.lookAtTop(bot, x, y, z);
    L.useBlock(srv, x, y, z, who);
    await sleep(800);
    const after = bot.heldItem ? bot.heldItem.count : null;
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
/** keep the small mushroom alive at a judged spot (random ticks can drop it) */
async function ensureMushroom(x, z, block) {
  if (await existsAt(x, AY, z, block)) return true;
  srv.send(`setblock ${x} ${AY} ${z} ${block} 0 replace`);
  await sleep(650);
  return existsAt(x, AY, z, block);
}
/** clear a grown giant, replant the small mushroom, step back in */
async function clearGiantAt(x, z, block) {
  await L.tp(srv, x + 0.5, AY, z + 8.5, { bot: who, wait: 520 });
  srv.send(`fill ${x - 3} ${AY} ${z - 3} ${x + 3} 153 ${z + 3} minecraft:air 0`);
  await sleep(700);
  srv.send(`setblock ${x} ${AY} ${z} ${block} 0 replace`);
  await sleep(700);
  await L.tp(srv, x + 0.5, AY, z + 1.5, { bot: who, wait: 850 });
  await warmAt(x, PAD, z);
}
const rec = (h) => ({ delta: h.delta, attempts: h.attempts, farm: shortFarm(h.farm), food: shortFood(h.food), seq: seqOf(h.farm) });

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), boots: [], arms: {} };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  const head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(PIN.head);
  ev.pins = { rel: L.pinOf(L.RELJAR, PIN.rel, 'rel'), dev: L.pinOf(L.DEVJAR, PIN.dev, 'dev'), src: L.pinOf(L.SRCJAR, PIN.src, 'src') };
  ev.mk = L.mkCounts();
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length,
    farm: L.cfgKeys(L.CFG).farmDebugLog, food: L.cfgKeys(L.CFG).foodDebugLog };
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
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b1');
    bootInfo(1);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });

    await L.tp(srv, 170.5, GY, 700.5, { bot: who, wait: 2600 });
    srv.send(`fill 150 ${PAD} 680 230 ${PAD} 720 minecraft:stone 0`);
    await sleep(1200);
    srv.send(`fill 158 ${GY} 688 184 ${GY} 712 minecraft:mycelium 0`);
    srv.send(`fill 157 ${GY} 687 157 156 713 minecraft:stone 0`);
    srv.send(`fill 185 ${GY} 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 687 185 156 687 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 713 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 156 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 158 ${AY} 688 184 155 712 minecraft:air 0`);
    srv.send(`setblock ${SP.red.x} ${GY} ${SP.red.z} minecraft:grass 0 replace`);
    srv.send(`fill ${SP.red.x - 2} ${ROOFY} ${SP.red.z - 2} ${SP.red.x + 2} ${ROOFY} ${SP.red.z + 2} minecraft:stone 0`);
    srv.send(`setblock ${SP.redOpen.x} ${GY} ${SP.redOpen.z} minecraft:grass 0 replace`);
    srv.send(`setblock ${SP.white.x} ${GY} ${SP.white.z} minecraft:mycelium 0 replace`);
    srv.send(`fill ${SP.white.x - 2} ${ROOFY} ${SP.white.z - 2} ${SP.white.x + 2} ${ROOFY} ${SP.white.z + 2} minecraft:stone 0`);
    await sleep(4200);

    ev.heldManure = await giveItem('etim:manure', 64);
    await L.tp(srv, SP.m1.x + 0.5, AY, SP.m1.z + 1.5, { bot: who, wait: 1300 });
    await warmAt(SP.m1.x, PAD, SP.m1.z);

    /* ================= R1 mycelium TOP chain (6 hands) ================= */
    srv.send(`setblock ${SP.m1.x} ${AY} ${SP.m1.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R1 = { hands: [], giants: 0, replants: 0, deny: [], placeDrain: [], ensured: await ensureMushroom(SP.m1.x, SP.m1.z, 'minecraft:brown_mushroom') };
    for (let i = 0; i < 6; i++) {
      const h = await handAt(SP.m1.x, GY, SP.m1.z, { x: SP.m1.x, y: AY, z: SP.m1.z, block: 'minecraft:brown_mushroom' });
      ev.arms.R1.hands.push(rec(h));
      ev.arms.R1.deny.push(...h.food.filter((l) => /placeDrainDeny/.test(l)));
      ev.arms.R1.placeDrain.push(...h.food.filter((l) => /placeDrain /.test(l)));
      if (parseFarm(h.farm).some((o) => o.giant)) {
        ev.arms.R1.giants++;
        ev.arms.R1['giant' + ev.arms.R1.giants + 'Block'] = await existsAt(SP.m1.x, AY, SP.m1.z, 'minecraft:brown_mushroom_block');
        if (i < 5) { await clearGiantAt(SP.m1.x, SP.m1.z, 'minecraft:brown_mushroom'); ev.arms.R1.replants++; await ensureMushroom(SP.m1.x, SP.m1.z, 'minecraft:brown_mushroom'); }
      }
    }
    log('R1', JSON.stringify({ hands: ev.arms.R1.hands.length, seq: ev.arms.R1.hands.map((h) => h.seq), giants: ev.arms.R1.giants,
      deny: ev.arms.R1.deny.length, placeDrain: ev.arms.R1.placeDrain.length, deltas: ev.arms.R1.hands.map((h) => h.delta) }));
    log('R1-deny', JSON.stringify(shortFood(ev.arms.R1.deny)));

    /* ================= R2 red click arm (max 12, stop at first giant) ================= */
    srv.send(`setblock ${SP.red.x} ${AY} ${SP.red.z} minecraft:red_mushroom 0 replace`);
    await sleep(700);
    const redEnsured = await ensureMushroom(SP.red.x, SP.red.z, 'minecraft:red_mushroom');
    await L.tp(srv, SP.red.x + 0.5, GY, SP.red.z + 2.5, { bot: who, wait: 1300 });
    await warmAt(SP.red.x, PAD, SP.red.z);
    ev.arms.R2 = { hands: [], giants: 0, deny: [], placeDrain: [], stoppedAt: null, ensured: redEnsured };
    for (let i = 0; i < 12; i++) {
      const h = await handAt(SP.red.x, AY, SP.red.z, { x: SP.red.x, y: AY, z: SP.red.z, block: 'minecraft:red_mushroom' });
      ev.arms.R2.hands.push(rec(h));
      ev.arms.R2.deny.push(...h.food.filter((l) => /placeDrainDeny/.test(l)));
      ev.arms.R2.placeDrain.push(...h.food.filter((l) => /placeDrain /.test(l)));
      if (parseFarm(h.farm).some((o) => o.giant)) {
        ev.arms.R2.giants++;
        ev.arms.R2.stoppedAt = i + 1;
        ev.arms.R2.giantBlock = await existsAt(SP.red.x, AY, SP.red.z, 'minecraft:red_mushroom_block');
        break;
      }
      if (h.missing) break;
    }
    log('R2', JSON.stringify({ hands: ev.arms.R2.hands.length, seq: ev.arms.R2.hands.map((h) => h.seq), giants: ev.arms.R2.giants,
      deny: ev.arms.R2.deny.length, placeDrain: ev.arms.R2.placeDrain.length, deltas: ev.arms.R2.hands.map((h) => h.delta), stop: ev.arms.R2.stoppedAt }));
    log('R2-deny', JSON.stringify(shortFood(ev.arms.R2.deny)));

    /* ================= R2ctl red open sky ================= */
    srv.send(`setblock ${SP.redOpen.x} ${AY} ${SP.redOpen.z} minecraft:red_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R2ctlExisted = await existsAt(SP.redOpen.x, AY, SP.redOpen.z, 'minecraft:red_mushroom');
    await L.tp(srv, SP.redOpen.x + 0.5, GY, SP.redOpen.z + 2.5, { bot: who, wait: 1200 });
    await warmAt(SP.redOpen.x, PAD, SP.redOpen.z);
    ev.arms.R2ctl = rec(await handAt(SP.redOpen.x, AY, SP.redOpen.z, { x: SP.redOpen.x, y: AY, z: SP.redOpen.z, block: 'minecraft:red_mushroom' }));
    log('R2ctl', JSON.stringify({ existed: ev.arms.R2ctlExisted, delta: ev.arms.R2ctl.delta, farm: ev.arms.R2ctl.farm, food: ev.arms.R2ctl.food }));

    /* ================= R4out white-eat (shaded but flooded) ================= */
    srv.send(`setblock ${SP.white.x} ${AY} ${SP.white.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4outEnsured = await ensureMushroom(SP.white.x, SP.white.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.white.x + 0.5, GY, SP.white.z + 1.5, { bot: who, wait: 1200 });
    await warmAt(SP.white.x, PAD, SP.white.z);
    ev.arms.R4out = rec(await handAt(SP.white.x, GY, SP.white.z, { x: SP.white.x, y: AY, z: SP.white.z, block: 'minecraft:brown_mushroom' }));
    ev.arms.R4out.survives = await existsAt(SP.white.x, AY, SP.white.z, 'minecraft:brown_mushroom');
    log('R4out', JSON.stringify({ delta: ev.arms.R4out.delta, farm: ev.arms.R4out.farm, food: ev.arms.R4out.food, live: ev.arms.R4out.survives }));

    /* ================= R3 stone x3 (survival hand place) ================= */
    await L.tp(srv, SP.stones.x + 0.5, GY, SP.stones.z + 1.5, { bot: who, wait: 1200 });
    ev.heldStone = await giveItem('minecraft:stone', 8);
    log('hold', JSON.stringify(ev.heldStone));
    ev.arms.R3 = { hands: [], placeDrain: [], deny: [], blocks: [] };
    for (let i = 0; i < 3; i++) {
      const h = await handAt(SP.stones.x, PAD + i, SP.stones.z, { x: SP.stones.x, y: PAD + i + 1, z: SP.stones.z, block: 'minecraft:air' });
      ev.arms.R3.hands.push(rec(h));
      ev.arms.R3.placeDrain.push(...h.food.filter((l) => /placeDrain /.test(l)));
      ev.arms.R3.deny.push(...h.food.filter((l) => /placeDrainDeny/.test(l)));
    }
    for (let i = 1; i <= 3; i++) ev.arms.R3.blocks.push(await existsAt(SP.stones.x, PAD + i, SP.stones.z, 'minecraft:stone'));
    log('R3', JSON.stringify({ deltas: ev.arms.R3.hands.map((h) => h.delta), blocks: ev.arms.R3.blocks,
      placeDrain: shortFood(ev.arms.R3.placeDrain), deny: ev.arms.R3.deny.length }));

    /* ================= R4reset replant reset ================= */
    ev.heldManure2 = await giveItem('etim:manure', 16);
    srv.send(`setblock ${SP.reset.x} ${AY} ${SP.reset.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4reset = { before: [], ensured: await ensureMushroom(SP.reset.x, SP.reset.z, 'minecraft:brown_mushroom') };
    await L.tp(srv, SP.reset.x + 0.5, AY, SP.reset.z + 1.5, { bot: who, wait: 1200 });
    await warmAt(SP.reset.x, PAD, SP.reset.z);
    for (let i = 0; i < 2; i++) ev.arms.R4reset.before.push(rec(await handAt(SP.reset.x, GY, SP.reset.z, { x: SP.reset.x, y: AY, z: SP.reset.z, block: 'minecraft:brown_mushroom' })));
    srv.send(`setblock ${SP.reset.x} ${AY} ${SP.reset.z} minecraft:air 0 replace`);
    await sleep(700);
    srv.send(`setblock ${SP.reset.x} ${AY} ${SP.reset.z} minecraft:brown_mushroom 0 replace`);
    await sleep(800);
    ev.arms.R4reset.ensuredAfter = await ensureMushroom(SP.reset.x, SP.reset.z, 'minecraft:brown_mushroom');
    await warmAt(SP.reset.x, PAD, SP.reset.z);
    ev.arms.R4reset.after = rec(await handAt(SP.reset.x, GY, SP.reset.z, { x: SP.reset.x, y: AY, z: SP.reset.z, block: 'minecraft:brown_mushroom' }));
    log('R4reset', JSON.stringify({ before: ev.arms.R4reset.before.map((h) => h.seq), after: ev.arms.R4reset.after.seq }));

    /* ================= R4plant for the reload check ================= */
    srv.send(`setblock ${SP.plant1.x} ${AY} ${SP.plant1.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4plantEnsured = await ensureMushroom(SP.plant1.x, SP.plant1.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.plant1.x + 0.5, AY, SP.plant1.z + 1.5, { bot: who, wait: 1200 });
    await warmAt(SP.plant1.x, PAD, SP.plant1.z);
    ev.arms.R4plant = rec(await handAt(SP.plant1.x, GY, SP.plant1.z, { x: SP.plant1.x, y: AY, z: SP.plant1.z, block: 'minecraft:brown_mushroom' }));
    srv.send('save-all');
    await sleep(2000);
    log('R4plant', JSON.stringify({ seq: ev.arms.R4plant.seq }));

    ev.foodB1 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).map((l) => l.replace(/^.*\[FoodLog\]\s*/, ''));
    ev.rowCounts1 = L.rowCounts(srv.all.map(L.strip));
    ev.stop1 = await srv.stop();
    ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop1 = await srv.stop(); ev.build1 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop1Error = String(e && e.message || e); }
  }

  /* ======================= boot 2 ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: bootTag(2) });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b2');
    bootInfo(2);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, SP.plant1.x + 0.5, AY, SP.plant1.z + 1.5, { bot: who, wait: 2600 });
    ev.arms.R4reload = { survives: await existsAt(SP.plant1.x, AY, SP.plant1.z, 'minecraft:brown_mushroom') };
    ev.heldManure3 = await giveItem('etim:manure', 32);
    await warmAt(SP.plant1.x, PAD, SP.plant1.z);
    ev.arms.R4reload.after = rec(await handAt(SP.plant1.x, GY, SP.plant1.z, { x: SP.plant1.x, y: AY, z: SP.plant1.z, block: 'minecraft:brown_mushroom' }));
    log('R4reload', JSON.stringify({ survives: ev.arms.R4reload.survives, seq: ev.arms.R4reload.after.seq }));

    /* ================= R1b third giant sample ================= */
    srv.send(`setblock ${SP.m2.x} ${AY} ${SP.m2.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    const m2Ensured = await ensureMushroom(SP.m2.x, SP.m2.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.m2.x + 0.5, AY, SP.m2.z + 1.5, { bot: who, wait: 1200 });
    await warmAt(SP.m2.x, PAD, SP.m2.z);
    ev.arms.R1b = { hands: [], giants: 0, deny: [], placeDrain: [], ensured: m2Ensured };
    for (let i = 0; i < 3; i++) {
      const h = await handAt(SP.m2.x, GY, SP.m2.z, { x: SP.m2.x, y: AY, z: SP.m2.z, block: 'minecraft:brown_mushroom' });
      ev.arms.R1b.hands.push(rec(h));
      ev.arms.R1b.deny.push(...h.food.filter((l) => /placeDrainDeny/.test(l)));
      ev.arms.R1b.placeDrain.push(...h.food.filter((l) => /placeDrain /.test(l)));
      if (parseFarm(h.farm).some((o) => o.giant)) { ev.arms.R1b.giants++; break; }
    }
    log('R1b', JSON.stringify({ seq: ev.arms.R1b.hands.map((h) => h.seq), giants: ev.arms.R1b.giants,
      deny: ev.arms.R1b.deny.length, placeDrain: ev.arms.R1b.placeDrain.length }));

    /* ================= R3b post-giant stone (exemption is tick-scoped) ================= */
    await sleep(2200);
    await L.tp(srv, SP.stone2.x + 0.5, GY, SP.stone2.z + 1.5, { bot: who, wait: 1200 });
    ev.heldStone2 = await giveItem('minecraft:stone', 4);
    const hs = await handAt(SP.stone2.x, PAD, SP.stone2.z, { x: SP.stone2.x, y: PAD + 1, z: SP.stone2.z, block: 'minecraft:air' });
    ev.arms.R3b = rec(hs);
    ev.arms.R3b.block = await existsAt(SP.stone2.x, PAD + 1, SP.stone2.z, 'minecraft:stone');
    log('R3b', JSON.stringify({ delta: ev.arms.R3b.delta, food: ev.arms.R3b.food, block: ev.arms.R3b.block }));

    /* ================= R4plant2 -> b3 reload ================= */
    ev.heldManure4 = await giveItem('etim:manure', 8);
    srv.send(`setblock ${SP.plant2.x} ${AY} ${SP.plant2.z} minecraft:brown_mushroom 0 replace`);
    await sleep(700);
    ev.arms.R4plant2Ensured = await ensureMushroom(SP.plant2.x, SP.plant2.z, 'minecraft:brown_mushroom');
    await L.tp(srv, SP.plant2.x + 0.5, AY, SP.plant2.z + 1.5, { bot: who, wait: 1200 });
    await warmAt(SP.plant2.x, PAD, SP.plant2.z);
    ev.arms.R4plant2 = rec(await handAt(SP.plant2.x, GY, SP.plant2.z, { x: SP.plant2.x, y: AY, z: SP.plant2.z, block: 'minecraft:brown_mushroom' }));
    srv.send('save-all');
    await sleep(2000);
    log('R4plant2', JSON.stringify({ seq: ev.arms.R4plant2.seq }));

    ev.foodB2 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).map((l) => l.replace(/^.*\[FoodLog\]\s*/, ''));
    ev.rowCounts2 = L.rowCounts(srv.all.map(L.strip));
    ev.stop2 = await srv.stop();
    ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop2 = await srv.stop(); ev.build2 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop2Error = String(e && e.message || e); }
  }

  /* ======================= boot 3: reload2 ======================= */
  srv = await L.startServer({ root: L.ROOT, tag: bootTag(3) });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( b3');
    bootInfo(3);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    await L.tp(srv, SP.plant2.x + 0.5, AY, SP.plant2.z + 1.5, { bot: who, wait: 2600 });
    ev.arms.R4reload2 = { survives: await existsAt(SP.plant2.x, AY, SP.plant2.z, 'minecraft:brown_mushroom') };
    ev.heldManure5 = await giveItem('etim:manure', 8);
    await warmAt(SP.plant2.x, PAD, SP.plant2.z);
    ev.arms.R4reload2.after = rec(await handAt(SP.plant2.x, GY, SP.plant2.z, { x: SP.plant2.x, y: AY, z: SP.plant2.z, block: 'minecraft:brown_mushroom' }));
    log('R4reload2', JSON.stringify({ survives: ev.arms.R4reload2.survives, seq: ev.arms.R4reload2.after.seq }));

    ev.foodB3 = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).map((l) => l.replace(/^.*\[FoodLog\]\s*/, ''));
    ev.rowCounts3 = L.rowCounts(srv.all.map(L.strip));
    ev.stop3 = await srv.stop();
    ev.build3 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop3 = await srv.stop(); ev.build3 = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stop3Error = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'foodDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length,
      farm: L.cfgKeys(L.CFG).farmDebugLog, food: L.cfgKeys(L.CFG).foodDebugLog };
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
