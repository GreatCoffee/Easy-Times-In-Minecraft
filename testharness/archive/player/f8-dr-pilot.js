#!/usr/bin/env node
/* f8-dr-pilot.js - quick preflight for the risky W-B8 mechanics (not a verdict run).
 * Validates: fill-with-metadata patches, natural-lane timing, dye-15 quickbar bone
 * meal, survival break + doTileDrops control, testfor item box, unknown-item give.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f8-dr-pilot';
const WORLD = 'f8drp';
const A = 'ETIM_F7';
const FY = 99, CY = 100;
let srv = null, bot = null;
const ev = { tag: TAG };

(async () => {
  const propsBefore = fs.readFileSync(L.PROPS);
  const propsText = propsBefore.toString('utf8');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'droughtDeathR196', 'true');
  L.setCfgValue(L.CFG, 'droughtDeathChance', '1.0');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsText, 'level-name', WORLD), 'allow-flight', 'true'), 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done');
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 0, noPhysics: true, time: 6000 });
    srv.send('gamerule doTileDrops true');
    await L.tp(srv, 186.5, 102, 790.5, { bot: A, wait: 1400 });
    srv.send(`fill 160 99 780 166 99 786 minecraft:farmland 0`);
    await L.sleep(1600);
    srv.send(`fill 160 100 780 166 100 786 minecraft:wheat 2`);
    await L.sleep(1600);
    // probe + natural lane
    srv.send('etest drought probe 163 100 783');
    await L.sleep(700);
    const from = srv.all.length;
    srv.send('gamerule randomTickSpeed 3');
    await L.sleep(25000);
    const nat = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]\s+(growth gate dry|drought)/.test(l));
    ev.patchGate = nat.filter((l) => /growth gate dry/.test(l)).length;
    ev.patchEvents = nat.filter((l) => /drought event/.test(l)).length;
    ev.patchSample = nat.slice(0, 4);
    ev.probe = srv.all.slice(0, from).map(L.strip).filter((l) => /drought probe/.test(l)).slice(-1);
    L.log('patch', JSON.stringify({ gate: ev.patchGate, events: ev.patchEvents, probe: ev.probe }));
    srv.send('gamerule randomTickSpeed 0');
    await L.sleep(400);

    // dead crop for bone meal + break
    srv.send(`setblock 187 99 794 minecraft:farmland 0 replace`);
    srv.send(`setblock 187 100 794 minecraft:wheat 3 replace`);
    await L.sleep(500);
    srv.send('etest drought roll 187 100 794 1.0');
    await L.sleep(900);
    srv.send(`gamemode 0 ${A}`);
    await L.sleep(700);
    srv.send(`clear ${A}`);
    await L.sleep(400);
    srv.send(`give ${A} minecraft:dye 1 15`);
    await L.sleep(900);
    try { bot.setQuickBarSlot(0); } catch (e) { L.log('quickbar', (e && e.message) || e); }
    await L.sleep(600);
    srv.send(`tp ${A} 188.5 100 794.5 0 0`);
    await L.sleep(900);
    await L.lookAtTop(bot, 187, CY, 794);
    const fb = srv.all.length;
    srv.send(`etest useblock 187 ${CY} 794 ${A}`);
    await L.sleep(1400);
    ev.boneRows = srv.all.slice(fb).map(L.strip).filter((l) => /\[FarmLog\]|drought|gate/.test(l));
    ev.boneBlock = await L.testBlock(srv, 187, CY, 794, 'etim:dead_crop', 3);
    ev.boneHeld = srv.all.slice(fb).map(L.strip).filter((l) => /hold|dye|Bone/i.test(l)).slice(0, 3);
    srv.send(`clear ${A}`);
    await L.sleep(500);
    const fbr = srv.all.length;
    srv.send(`etest dig 187 ${CY} 794 ${A}`);
    await L.sleep(6500);
    ev.breakBlock = await L.testBlock(srv, 187, CY, 794, 'minecraft:air');
    ev.breakKill = srv.all.slice(fbr).map(L.strip).filter((l) => /Killed |found nothing|No entity/i.test(l));
    srv.send(`setblock 190 100 794 minecraft:dirt 0 replace`);
    await L.sleep(500);
    srv.send(`tp ${A} 191.5 100 794.5 0 0`);
    await L.sleep(800);
    srv.send(`etest dig 190 ${CY} 794 ${A}`);
    await L.sleep(6500);
    ev.ctrlBlock = await L.testBlock(srv, 190, CY, 794, 'minecraft:air');
    ev.ctrlKill = srv.all.slice(fbr).map(L.strip).filter((l) => /Killed |found nothing|No entity/i.test(l)).slice(-3);
    const fg = srv.all.length;
    srv.send(`give ${A} etim:dead_crop 1`);
    await L.sleep(900);
    ev.giveRows = srv.all.slice(fg).map(L.strip).filter((l) => /no such item|Given|unknown/i.test(l));
    L.log('r6', JSON.stringify({ bone: ev.boneBlock.ok, boneRows: ev.boneRows.length, break: ev.breakBlock.ok, breakKill: ev.breakKill, ctrl: ev.ctrlBlock.ok, ctrlKill: ev.ctrlKill, give: ev.giveRows }));
    L.log('pilot-done', JSON.stringify({ gate: ev.patchGate, events: ev.patchEvents }));
  } catch (e) {
    L.log('PILOT-FAIL', (e && e.stack) || e);
    process.exitCode = 2;
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { await srv.stop(); } catch (e) { L.log('stop-err', e.message); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    L.setCfgValue(L.CFG, 'droughtDeathChance', '0.05');
    fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore.toString('utf8'), 'level-name', 'world'), 'allow-flight', 'false'), 'utf8');
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  }
})();
