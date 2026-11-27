#!/usr/bin/env node
/**
 * f7-wb-b5-pilot.js - PRE-WINDOW pilot (not judged, no report) for W-B5.
 *
 * Fix HEAD eafe3c7: ETIMItemManure stamps the code-grown tick before
 * generateBigMushroom; ETIMEndurance.chargePlace denies the same-tick
 * PlaceEvent with a [FoodLog] placeDrainDeny src=giantGen row.
 *
 * Open questions this pilot must answer BEFORE the judged window:
 *   Q1 does a giant manure click emit exactly ONE placeDrainDeny row
 *      (hardness=0.2) and ZERO plain placeDrain rows?
 *   Q2 does a non-giant manure click emit zero food rows at all?
 *   Q3 does a surviving-hand stone placement still charge placeDrain
 *      base=1.5 (the exemption does not leak)?
 *   Q4 does the red click arm on the FM7v2 legal spot behave the same
 *      (giant -> one deny row)?
 *
 * Probes: P1 mycelium TOP 3 clicks / P2 stone x3 / P3 red legal up to 6.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-b5-pilot';
const WORLD = 'b5p';
const AY = 140;
const GY = 139;
const PAD = 138;
const ROOFY = 154;

const sleep = L.sleep;
const log = L.log;
const who = L.BOT;
let srv = null;
let bot = null;

async function giveItem(name, count) {
  srv.send(`clear ${who}`);
  await sleep(400);
  srv.send(`give ${who} ${name} ${count}`);
  await sleep(1200);
  return bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;
}

async function hand(x, y, z) {
  const from = srv.all.length;
  const before = bot.heldItem ? bot.heldItem.count : null;
  await L.lookAtTop(bot, x, y, z);
  L.useBlock(srv, x, y, z, who);
  await sleep(800);
  const after = bot.heldItem ? bot.heldItem.count : null;
  const lines = srv.all.slice(from).map(L.strip);
  return {
    before, after, delta: before === null || after === null ? null : after - before,
    farm: lines.filter((l) => /\[FarmLog\]/.test(l)),
    food: lines.filter((l) => /\[FoodLog\]/.test(l)),
    useblocks: lines.filter((l) => /step=useblock/.test(l)).length,
  };
}

const shortFood = (rows) => rows.map((r) => r.replace(/^.*\[FoodLog\]\s*/, ''));
const shortFarm = (rows) => rows.map((r) => r.replace(/^.*fertilize src=manure /, '').replace(/ \[server\]$/, ''));

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), arms: {} };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'foodDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });

    /* ---- pad + indoor room (mycelium TOP arm needs shade) ---- */
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
    /* red legal: grass + 5x5 roof at y+14 (FM7v2-proven geometry) */
    srv.send(`setblock 196 ${GY} 700 minecraft:grass 0 replace`);
    srv.send(`fill 194 ${ROOFY} 698 198 ${ROOFY} 702 minecraft:stone 0`);
    await sleep(2600);

    /* ================= P1 mycelium TOP 3 clicks ================= */
    srv.send(`setblock 170 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(600);
    await L.tp(srv, 170.5, AY, 701.5, { bot: who, wait: 1200 });
    ev.heldManure = await giveItem('etim:manure', 16);
    log('hold', JSON.stringify(ev.heldManure));
    await L.lookAtTop(bot, 170, PAD, 700); L.useBlock(srv, 170, PAD, 700, who); await sleep(600); // C-11 warm-up
    ev.arms.P1 = [];
    for (let i = 0; i < 3; i++) {
      const h = await hand(170, GY, 700);
      ev.arms.P1.push({ i: i + 1, delta: h.delta, useblocks: h.useblocks, farm: shortFarm(h.farm), food: shortFood(h.food) });
      log('P1-' + (i + 1), JSON.stringify({ d: h.delta, farm: shortFarm(h.farm), food: shortFood(h.food) }));
    }
    ev.arms.P1giant = (await L.testBlock(srv, 170, AY, 700, 'minecraft:brown_mushroom_block')).ok;

    /* ================= P2 stone x3 ================= */
    await L.tp(srv, 210.5, GY, 692.5, { bot: who, wait: 1000 });
    ev.heldStone = await giveItem('minecraft:stone', 8);
    log('hold', JSON.stringify(ev.heldStone));
    ev.arms.P2 = [];
    for (let i = 0; i < 3; i++) {
      const h = await hand(210, PAD + i, 690);
      ev.arms.P2.push({ i: i + 1, delta: h.delta, useblocks: h.useblocks, farm: shortFarm(h.farm), food: shortFood(h.food) });
      log('P2-' + (i + 1), JSON.stringify({ d: h.delta, food: shortFood(h.food) }));
    }
    ev.arms.P2blocks = [];
    for (let i = 1; i <= 3; i++) ev.arms.P2blocks.push((await L.testBlock(srv, 210, PAD + i, 690, 'minecraft:stone')).ok);

    /* ================= P3 red legal up to 6 ================= */
    srv.send(`setblock 196 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(600);
    await L.tp(srv, 196.5, GY, 702.5, { bot: who, wait: 1200 });
    ev.heldManure2 = await giveItem('etim:manure', 16);
    await L.lookAtTop(bot, 196, PAD, 700); L.useBlock(srv, 196, PAD, 700, who); await sleep(600);
    ev.arms.P3 = [];
    for (let i = 0; i < 6; i++) {
      const h = await hand(196, AY, 700);
      ev.arms.P3.push({ i: i + 1, delta: h.delta, useblocks: h.useblocks, farm: shortFarm(h.farm), food: shortFood(h.food) });
      log('P3-' + (i + 1), JSON.stringify({ d: h.delta, farm: shortFarm(h.farm), food: shortFood(h.food) }));
      if (h.farm.some((r) => /giant=1/.test(r))) {
        ev.arms.P3giant = (await L.testBlock(srv, 196, AY, 700, 'minecraft:red_mushroom_block')).ok;
        break;
      }
    }

    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.allFood = srv.all.map(L.strip).filter((l) => /\[FoodLog\]/.test(l)).map((l) => l.replace(/^.*\[FoodLog\]\s*/, ''));
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.portAfter = L.netstatListen(L.PORT);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
