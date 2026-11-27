#!/usr/bin/env node
/**
 * f10-b2-pilot2.js — natural-jump generator v2 (NOT judged).
 * The checkerboard yard produced 0 natural jumps in 170 s (flat corridors let
 * the AI walk around every pillar). v2: a walled 15-block lane whose floor
 * alternates one block up / one block down, plus a bot holding wheat seeds at
 * one end and teleporting to the other end every 12 s — every traversal
 * forces ~7 vanilla path jumps per chicken (EntityMoveHelper:128-131).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-b2-pilot2';
const WORLD = 'f10b2q';
const A = 'ETIM_F7';
const TY = 100;
const LANE = { x0: 330, x1: 344, z0: 845, z1: 847 };
let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };
const sleep = L.sleep;
const log = L.log;
const since = (n) => srv.all.slice(n).map(L.strip);

(async () => {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, LANE.x0 + 2.5, TY + 1, LANE.z0 + 1.5, { bot: A, wait: 1500 });
    srv.send('kill @e[type=!player]');
    await sleep(1000);

    // lane: solid floor + alternating one-high strips + walls
    const { x0, x1, z0, z1 } = LANE;
    srv.send(`fill ${x0 - 2} ${TY - 4} ${z0 - 2} ${x1 + 2} ${TY + 10} ${z1 + 2} minecraft:air 0`);
    await sleep(700);
    srv.send(`fill ${x0} ${TY - 1} ${z0} ${x1} ${TY - 1} ${z1} minecraft:dirt 0`);
    srv.send(`fill ${x0} ${TY} ${z0} ${x1} ${TY} ${z1} minecraft:grass 0`);
    srv.send(`fill ${x0 - 1} ${TY + 1} ${z0 - 1} ${x1 + 1} ${TY + 3} ${z0 - 1} minecraft:cobblestone 0`);
    srv.send(`fill ${x0 - 1} ${TY + 1} ${z1 + 1} ${x1 + 1} ${TY + 3} ${z1 + 1} minecraft:cobblestone 0`);
    srv.send(`fill ${x0 - 1} ${TY + 1} ${z0} ${x0 - 1} ${TY + 3} ${z1} minecraft:cobblestone 0`);
    srv.send(`fill ${x1 + 1} ${TY + 1} ${z0} ${x1 + 1} ${TY + 3} ${z1} minecraft:cobblestone 0`);
    for (let x = x0 + 1; x <= x1 - 1; x += 2) {
      srv.send(`fill ${x} ${TY + 1} ${z0} ${x} ${TY + 1} ${z1} minecraft:stone 0`);
    }
    await sleep(1500);

    for (const dx of [1.5, 6.5, 11.5]) {
      srv.send(`summon minecraft:chicken ${x0 + dx} ${TY + 1} ${z0 + 1.5} {PersistenceRequired:1b}`);
    }
    await sleep(2500);
    srv.send(`etest prod ${A} 6 feather=2`);
    await sleep(800);

    // bot holds wheat seeds (chicken tempt item) — keep it in the main hand
    srv.send(`clear ${A}`);
    await sleep(300);
    srv.send(`give ${A} minecraft:wheat_seeds 1`);
    await sleep(700);
    const seeds = bot.inventory.items().find((i) => i.name === 'wheat_seeds');
    await bot.equip(seeds, 'hand');
    await sleep(400);

    const from = srv.all.length;
    const end = Date.now() + 190000;
    let ends = 0;
    while (Date.now() < end) {
      ends++;
      const toRight = ends % 2 === 1;
      await L.tp(srv, (toRight ? x1 - 0.5 : x0 + 0.5), TY + 1, LANE.z0 + 1.5, { bot: A, wait: 12000 });
      const jumps = since(from).filter((l) => /kind=feather jump=true/.test(l));
      log('lane' + ends, 'jumps=' + jumps.length + ' rows=' + since(from).filter((l) => /\[AILog\] production/.test(l)).length);
      if (jumps.length >= 3) break;
    }
    const rows = since(from).filter((l) => /kind=feather jump=true/.test(l));
    ev.arms = { jumps: rows.length, sample: rows.slice(0, 4), cycles: ends };
    log('RESULT', JSON.stringify(ev.arms));
    ev.ok = true;
  } catch (e) {
    ev.error = (e && e.stack) || String(e);
    log('FAIL', ev.error);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
    process.exit(0);
  }
})();
