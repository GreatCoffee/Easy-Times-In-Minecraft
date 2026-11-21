#!/usr/bin/env node
/**
 * f7-wb-fm1b.js - DIAGNOSTIC arms (not judged in W-FM1's R1/R2/R3 contract).
 *
 * Reading R196 BlockMycelium.fertilize (:139-154) -> BlockMushroom.fertilizeMushroom
 * (:160-162) -> tryGrowGiantMushroom (:164-217) shows two R196 faces that the
 * 1.12 mycelium-TOP arm does not carry:
 *   A) STAGED growth: getGrowthBits()=3, incrementGrowth then isMature; a fresh
 *      mushroom (metadata 0) needs 3 manure uses before the giant spawns.
 *      Current code: 1 use = 1 giant (the B-1 甲 fix removed the 0.5 roll).
 *   B) INDOOR legality: isLegalAt = (hasNoSky || !canBlockSeeTheSky) and brown
 *      additionally rejects isOutdoors. 1.12 generateBigMushroom has NO sky
 *      check (only below-block type + space), so the mycelium arm grows
 *      outdoors where R196 refuses.
 * Both are measured here: 3 consecutive clicks on one mushroom (arm A), and one
 * click on an open-sky mycelium plot (arm B).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm1b';
const WORLD = 'f7wd';
const AY = 140;
const IX = 246, IZ = 700;   // indoor room
const OX = 266, OZ = 700;   // outdoor plot

const sleep = L.sleep;
const log = L.log;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), staged: [], outdoor: null };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  ev.head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    const who = bot.username;

    await L.tp(srv, IX + 0.5, AY, IZ + 0.5, { bot: who, wait: 2400 });
    srv.send(`fill 236 ${AY - 2} 690 276 ${AY - 2} 710 minecraft:stone 0`);
    await sleep(900);
    // indoor room (same shell as the judged window)
    srv.send(`fill 241 ${AY - 1} 695 251 ${AY - 1} 705 minecraft:mycelium 0 replace`);
    srv.send(`fill 240 ${AY - 1} 694 240 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 252 ${AY - 1} 694 252 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 240 ${AY - 1} 694 252 ${AY + 16} 694 minecraft:stone 0`);
    srv.send(`fill 240 ${AY - 1} 706 252 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 240 ${AY + 16} 694 252 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 241 ${AY} 695 251 ${AY + 15} 705 minecraft:air 0`);
    // outdoor plot: mycelium floor, sky cleared 16 high
    srv.send(`fill 261 ${AY - 1} 695 271 ${AY - 1} 705 minecraft:mycelium 0 replace`);
    srv.send(`fill 261 ${AY} 695 271 ${AY + 15} 705 minecraft:air 0`);
    await sleep(1200);

    /* ---- warm-up (first item use is dropped, see W-FM1 run 1) ---- */
    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 16`);
    srv.send(`setblock ${IX} ${AY - 1} ${IZ} minecraft:dirt 0 replace`);
    srv.send(`setblock ${IX} ${AY} ${IZ} minecraft:air 0 replace`);
    await sleep(700);
    await L.tp(srv, IX + 0.5, AY, IZ + 2.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, IX, AY - 1, IZ);
    L.useBlock(srv, IX, AY - 1, IZ, who);
    await sleep(700);
    srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 5 0`);
    await sleep(500);

    /* ---- A: 3 consecutive clicks on ONE mushroom (staged growth) ---- */
    srv.send(`setblock ${IX} ${AY - 1} ${IZ} minecraft:mycelium 0 replace`);
    srv.send(`setblock ${IX} ${AY} ${IZ} minecraft:brown_mushroom 0 replace`);
    await sleep(500);
    await L.tp(srv, IX + 0.5, AY, IZ + 2.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, IX, AY - 1, IZ);
    for (let k = 1; k <= 3; k++) {
      const before = bot.heldItem ? bot.heldItem.count : 0;
      const from = srv.all.length;
      L.useBlock(srv, IX, AY - 1, IZ, who);
      await sleep(800);
      const rows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
      const giant = await L.testBlock(srv, IX, AY, IZ, 'minecraft:brown_mushroom_block');
      const small = await L.testBlock(srv, IX, AY, IZ, 'minecraft:brown_mushroom');
      ev.staged.push({
        click: k, before, after: bot.heldItem ? bot.heldItem.count : 0,
        rows, giant: giant.ok, smallStill: small.ok,
        above: (await L.testBlock(srv, IX, AY, IZ, 'minecraft:air')).ok ? 'air' : 'block',
      });
      log('A-click' + k, JSON.stringify({ before, after: ev.staged[k - 1].after, rows: rows.length,
        giant: giant.ok, small: small.ok }));
    }

    /* ---- B0: sky probe. The brown-mushroom CLICK arm requires INDOORS
       (legal = mycelium below && !outdoor, outdoor = canSeeSky(pos)); a click
       that emits NO row and consumes nothing proves canSeeSky=true at this
       plot, so arm B below is a true open-sky face. ---- */
    srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 5 0`);
    srv.send(`setblock ${OX} ${AY - 1} ${OZ + 4} minecraft:mycelium 0 replace`);
    srv.send(`setblock ${OX} ${AY} ${OZ + 4} minecraft:brown_mushroom 0 replace`);
    await sleep(600);
    await L.tp(srv, OX + 0.5, AY, OZ + 6.0, { bot: who, wait: 600 });
    await L.lookAtTop(bot, OX, AY, OZ + 4);
    const beforeProbe = bot.heldItem ? bot.heldItem.count : 0;
    let fromProbe = srv.all.length;
    L.useBlock(srv, OX, AY, OZ + 4, who);
    await sleep(900);
    ev.skyProbe = {
      before: beforeProbe, after: bot.heldItem ? bot.heldItem.count : 0,
      rows: srv.all.slice(fromProbe).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)),
      smallStill: (await L.testBlock(srv, OX, AY, OZ + 4, 'minecraft:brown_mushroom')).ok,
    };
    log('B0-skyProbe', JSON.stringify({ before: ev.skyProbe.before, after: ev.skyProbe.after,
      rows: ev.skyProbe.rows.length, small: ev.skyProbe.smallStill }));

    /* ---- B: outdoor mycelium TOP (indoor legality) ---- */
    srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 5 0`);
    srv.send(`setblock ${OX} ${AY - 1} ${OZ} minecraft:mycelium 0 replace`);
    srv.send(`setblock ${OX} ${AY} ${OZ} minecraft:brown_mushroom 0 replace`);
    await sleep(600);
    await L.tp(srv, OX + 0.5, AY, OZ + 2.0, { bot: who, wait: 600 });
    await L.lookAtTop(bot, OX, AY - 1, OZ);
    const beforeOut = bot.heldItem ? bot.heldItem.count : 0;
    let from = srv.all.length;
    L.useBlock(srv, OX, AY - 1, OZ, who);
    await sleep(900);
    const rowsOut = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
    ev.outdoor = {
      before: beforeOut, after: bot.heldItem ? bot.heldItem.count : 0,
      rows: rowsOut,
      giant: (await L.testBlock(srv, OX, AY, OZ, 'minecraft:brown_mushroom_block')).ok,
      smallStill: (await L.testBlock(srv, OX, AY, OZ, 'minecraft:brown_mushroom')).ok,
      skyClear: (await L.testBlock(srv, OX, AY + 15, OZ, 'minecraft:air')).ok,
    };
    log('B-outdoor', JSON.stringify({ before: ev.outdoor.before, after: ev.outdoor.after,
      rows: ev.outdoor.rows.length, giant: ev.outdoor.giant, small: ev.outdoor.smallStill,
      skyClear: ev.outdoor.skyClear }));

    ev.rowCounts = L.rowCounts(srv.all.map(L.strip));
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.portAfter = L.netstatListen(L.PORT);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
