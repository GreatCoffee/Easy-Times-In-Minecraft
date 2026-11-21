#!/usr/bin/env node
/**
 * f7-wb-fm7-pilot.js - PRE-WINDOW pilot (not judged, no report).
 *
 * Question: the new click arm ANDs
 *   legalOut   = red ? canSeeSky(pos) : !canSeeSky(pos)      (C-16 coarse bridge)
 *   legalLight = ((BlockMushroom) block).canBlockStay(...)   (isLegalAt bridge)
 * and vanilla canBlockStay's grass branch is `getLight(pos) < 13`. But
 * World.getLight(pos) = max(skyLight-0, blockLight) is TIME-INDEPENDENT, so an
 * open-sky cell is always 15, and a cell with sky light < 13 is by definition a
 * cell that cannot see the sky. If so the red arm is UNSATISFIABLE.
 *
 * Four probes, one boot:
 *   P1 red on grass, open sky (canSeeSky=1, light=15)          -> legalLight fails?
 *   P2 red on grass, deep alcove (canSeeSky=0, light~12,       -> legalOut fails?
 *      MITE isOutdoors=1: open column 3 blocks away at same y)
 *   P3 brown click, indoor mycelium (control: both gates pass) -> rows expected
 *   P4 mycelium TOP indoor (control)                           -> stage=1/3
 *   P5 mycelium TOP outdoor (B-4 white-eat arm)                -> outdoor=1
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm7-pilot';
const WORLD = 'f7we';
const AY = 140;

const sleep = L.sleep;
const log = L.log;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), arms: {} };
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

    // TP first so the target chunks load, then build the pad
    await L.tp(srv, 166.5, AY, 700.5, { bot: who, wait: 2400 });
    srv.send(`fill 186 ${AY - 2} 688 216 ${AY - 2} 712 minecraft:stone 0`);
    await sleep(900);

    /* ---- P3/P4 indoor room: 11x11 mycelium, ceiling AY+16 ---- */
    srv.send(`fill 161 ${AY - 1} 695 171 ${AY - 1} 705 minecraft:mycelium 0 replace`);
    srv.send(`fill 160 ${AY - 1} 694 160 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 172 ${AY - 1} 694 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 160 ${AY - 1} 694 172 ${AY + 16} 694 minecraft:stone 0`);
    srv.send(`fill 160 ${AY - 1} 706 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 160 ${AY + 16} 694 172 ${AY + 16} 706 minecraft:stone 0`);
    srv.send(`fill 161 ${AY} 695 171 ${AY + 15} 705 minecraft:air 0`);

    /* ---- P1 red open-sky plot ---- */
    srv.send(`fill 179 ${AY - 1} 693 193 ${AY - 1} 707 minecraft:grass 0 replace`);
    srv.send(`fill 179 ${AY} 693 193 ${AY + 19} 707 minecraft:air 0`);

    /* ---- P5 mycelium TOP outdoor spot ---- */
    srv.send(`fill 209 ${AY - 1} 697 215 ${AY - 1} 703 minecraft:mycelium 0 replace`);
    srv.send(`fill 209 ${AY} 697 215 ${AY + 15} 703 minecraft:air 0`);

    /* ---- P2 red alcove: mushroom at x=197, open column at x=200 (3 away,
       inside the 7x7 MITE flood box). ceiling y+3 over 194..199, back wall
       193, side walls z=699/701 => sky light 12 (<13), canSeeSky=0. ---- */
    srv.send(`fill 193 ${AY - 1} 699 200 ${AY - 1} 701 minecraft:grass 0 replace`);
    srv.send(`fill 193 ${AY - 1} 699 193 ${AY + 3} 701 minecraft:stone 0`);
    srv.send(`fill 194 ${AY} 699 199 ${AY + 2} 699 minecraft:stone 0`);
    srv.send(`fill 194 ${AY} 701 199 ${AY + 2} 701 minecraft:stone 0`);
    srv.send(`fill 194 ${AY + 3} 699 199 ${AY + 3} 701 minecraft:stone 0`);
    srv.send(`fill 194 ${AY} 700 199 ${AY + 2} 700 minecraft:air 0`);
    srv.send(`fill 200 ${AY} 699 200 ${AY + 8} 701 minecraft:air 0`);
    await sleep(1400);

    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 32`);
    await sleep(900);

    /* warm-up: first use after join is dropped (C-11) */
    srv.send(`setblock 165 ${AY - 1} 700 minecraft:dirt 0 replace`);
    srv.send(`setblock 165 ${AY} 700 minecraft:air 0 replace`);
    await sleep(400);
    await L.tp(srv, 165.5, AY, 702.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 165, AY - 1, 700);
    let from = srv.all.length;
    L.useBlock(srv, 165, AY - 1, 700, who);
    await sleep(700);
    ev.arms.warmup = { useblocks: srv.all.slice(from).filter((l) => /step=useblock/.test(l)).length,
      rows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)).length,
      held: bot.heldItem ? bot.heldItem.count : null };
    log('warmup', JSON.stringify(ev.arms.warmup));

    /* ---- P1 red open sky ---- */
    srv.send(`setblock 186 ${AY - 1} 700 minecraft:grass 0 replace`);
    srv.send(`setblock 186 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 186.5, AY, 702.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 186, AY, 700);
    from = srv.all.length;
    let before = bot.heldItem ? bot.heldItem.count : 0;
    L.useBlock(srv, 186, AY, 700, who);
    await sleep(800);
    ev.arms.P1 = {
      before, after: bot.heldItem ? bot.heldItem.count : null,
      rows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)),
      small: (await L.testBlock(srv, 186, AY, 700, 'minecraft:red_mushroom')).ok,
      giant: (await L.testBlock(srv, 186, AY, 700, 'minecraft:red_mushroom_block')).ok,
    };
    log('P1-redOpen', JSON.stringify({ before, after: ev.arms.P1.after, rows: ev.arms.P1.rows.length, small: ev.arms.P1.small }));

    /* ---- P2 red alcove ---- */
    srv.send(`setblock 197 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 197.5, AY, 700.5, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 197, AY, 700);
    from = srv.all.length;
    before = bot.heldItem ? bot.heldItem.count : 0;
    L.useBlock(srv, 197, AY, 700, who);
    await sleep(800);
    ev.arms.P2 = {
      before, after: bot.heldItem ? bot.heldItem.count : null,
      rows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)),
      small: (await L.testBlock(srv, 197, AY, 700, 'minecraft:red_mushroom')).ok,
    };
    log('P2-redAlcove', JSON.stringify({ before, after: ev.arms.P2.after, rows: ev.arms.P2.rows.length, small: ev.arms.P2.small }));

    /* ---- P3 brown click indoor ---- */
    srv.send(`setblock 166 ${AY - 1} 700 minecraft:mycelium 0 replace`);
    srv.send(`setblock 166 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 166.5, AY, 702.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 166, AY, 700);
    from = srv.all.length;
    before = bot.heldItem ? bot.heldItem.count : 0;
    L.useBlock(srv, 166, AY, 700, who);
    await sleep(800);
    ev.arms.P3 = {
      before, after: bot.heldItem ? bot.heldItem.count : null,
      rows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)),
      small: (await L.testBlock(srv, 166, AY, 700, 'minecraft:brown_mushroom')).ok,
    };
    log('P3-brownIndoor', JSON.stringify({ before, after: ev.arms.P3.after, rows: ev.arms.P3.rows.length }));

    /* ---- P4 mycelium TOP indoor ---- */
    srv.send(`setblock 168 ${AY - 1} 700 minecraft:mycelium 0 replace`);
    srv.send(`setblock 168 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 168.5, AY, 702.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 168, AY - 1, 700);
    from = srv.all.length;
    before = bot.heldItem ? bot.heldItem.count : 0;
    L.useBlock(srv, 168, AY - 1, 700, who);
    await sleep(800);
    ev.arms.P4 = {
      before, after: bot.heldItem ? bot.heldItem.count : null,
      rows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)),
      te: await L.testBlock(srv, 168, AY, 700, 'minecraft:brown_mushroom', 0, '{EtimMushroomGrowth:1}'),
    };
    log('P4-myceliumTopIndoor', JSON.stringify({ before, after: ev.arms.P4.after, rows: ev.arms.P4.rows.length, te: ev.arms.P4.te.ok }));

    /* ---- P5 mycelium TOP outdoor ---- */
    srv.send(`setblock 212 ${AY - 1} 700 minecraft:mycelium 0 replace`);
    srv.send(`setblock 212 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 212.5, AY, 702.0, { bot: who, wait: 500 });
    await L.lookAtTop(bot, 212, AY - 1, 700);
    from = srv.all.length;
    before = bot.heldItem ? bot.heldItem.count : 0;
    L.useBlock(srv, 212, AY - 1, 700, who);
    await sleep(800);
    ev.arms.P5 = {
      before, after: bot.heldItem ? bot.heldItem.count : null,
      rows: srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l)),
      small: (await L.testBlock(srv, 212, AY, 700, 'minecraft:brown_mushroom')).ok,
    };
    log('P5-myceliumTopOutdoor', JSON.stringify({ before, after: ev.arms.P5.after, rows: ev.arms.P5.rows.length, small: ev.arms.P5.small }));

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
