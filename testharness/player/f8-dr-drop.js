#!/usr/bin/env node
/* f8-dr-drop.js - W-B8 supplementary (not a judged boot): isolates the drop
 * ENTITY face from the bot's pickup radius.
 *   S1 mature drought drop -> one item entity at the block (bot 6 blocks away)
 *   S2 instant-break torch control -> one item entity (doTileDrops live)
 *   S3 dead_crop break -> ZERO item entities + clear reports no carried drop
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f8-dr-drop';
const WORLD = 'f8drop';
const A = 'ETIM_F7';
const FY = 99, CY = 100;
let srv = null, bot = null;
const ev = { tag: TAG, arms: {} };

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
async function killBox(x, y, z, dx, dy, dz) {
  const f = srv.all.length;
  srv.send(`kill @e[type=item,x=${x},y=${y},z=${z},dx=${dx},dy=${dy},dz=${dz}]`);
  await sleep(700);
  return since(f).filter((l) => /Killed |found nothing|No entity/i.test(l));
}
async function testBox(x, y, z, dx, dy, dz) {
  const f = srv.all.length;
  srv.send(`testfor @e[type=item,x=${x},y=${y},z=${z},dx=${dx},dy=${dy},dz=${dz}]`);
  await sleep(600);
  return since(f).filter((l) => /Found |found nothing|No entity/i.test(l));
}

(async () => {
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'droughtDeathR196', 'true');
  L.setCfgValue(L.CFG, 'droughtDeathChance', '0.05');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done');
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 0, noPhysics: true, time: 6000 });
    srv.send('gamerule doTileDrops true');
    srv.send('fill 94 99 94 110 99 110 minecraft:stone 0');
    await sleep(1200);
    srv.send('fill 94 100 94 110 104 110 minecraft:air 0');
    await sleep(1200);
    srv.send(`tp ${A} 103.3 100 100.5 0 0`);
    await sleep(1200);

    // S1 mature drop entity
    srv.send(`setblock 100 99 100 minecraft:farmland 0 replace`);
    srv.send(`setblock 100 100 100 minecraft:wheat 7 replace`);
    await sleep(500);
    srv.send(`etest drought roll 100 100 100 1.0`);
    await sleep(900);
    ev.arms.S1 = { rows: since(0).filter((l) => /drought event kind=mature/.test(l)), item: await testBox(99, 99, 99, 3, 4, 3) };
    ev.arms.S1.kill = await killBox(99, 99, 99, 3, 4, 3);
    L.log('S1', JSON.stringify({ rows: ev.arms.S1.rows.length, item: ev.arms.S1.item, kill: ev.arms.S1.kill }));

    // S2 torch control (instant break, self drop, bot 5.5 blocks away).
    // Survival is mandatory: creative breaks drop nothing.
    srv.send(`gamemode 0 ${A}`);
    await sleep(900);
    srv.send(`setblock 101 100 100 minecraft:torch 0 replace`);
    await sleep(500);
    srv.send(`etest dig 101 100 100 ${A}`);
    await sleep(6500);
    ev.arms.S2 = { air: await L.testBlock(srv, 101, 100, 100, 'minecraft:air'), item: await testBox(100, 99, 100, 3, 4, 3), kill: await killBox(100, 99, 100, 3, 4, 3) };
    L.log('S2', JSON.stringify({ air: ev.arms.S2.air.ok, item: ev.arms.S2.item, kill: ev.arms.S2.kill }));

    // S3 dead crop break -> zero drops, zero carried
    srv.send(`setblock 102 99 100 minecraft:farmland 0 replace`);
    srv.send(`setblock 102 100 100 minecraft:wheat 3 replace`);
    await sleep(500);
    srv.send(`etest drought roll 102 100 100 1.0`);
    await sleep(900);
    ev.arms.S3 = { seed: since(0).filter((l) => /drought event kind=immature.*pos=102,100,100/.test(l)) };
    const fclear = srv.all.length;
    srv.send(`clear ${A}`);
    await sleep(700);
    ev.arms.S3.preClear = since(fclear).filter((l) => /Cleared the inventory|No items were found/i.test(l));
    srv.send(`etest dig 102 100 100 ${A}`);
    await sleep(6500);
    ev.arms.S3.air = await L.testBlock(srv, 102, 100, 100, 'minecraft:air');
    ev.arms.S3.item = await testBox(101, 99, 100, 3, 4, 3);
    ev.arms.S3.kill = await killBox(101, 99, 100, 3, 4, 3);
    const fclear2 = srv.all.length;
    srv.send(`clear ${A}`);
    await sleep(700);
    ev.arms.S3.postClear = since(fclear2).filter((l) => /Cleared the inventory|No items were found/i.test(l));
    L.log('S3', JSON.stringify({ air: ev.arms.S3.air.ok, item: ev.arms.S3.item, kill: ev.arms.S3.kill, pre: ev.arms.S3.preClear, post: ev.arms.S3.postClear }));
  } catch (e) {
    L.log('DROP-FAIL', (e && e.stack) || e);
    process.exitCode = 2;
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { L.log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'droughtDeathChance', '0.05');
    L.setCfgValue(L.CFG, 'droughtDeathR196', 'true');
    fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', 'world'), 'allow-flight', 'false'), 'utf8');
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  }
})();
