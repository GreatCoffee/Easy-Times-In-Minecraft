#!/usr/bin/env node
/**
 * f7-wb-fm7v2-pilot.js - PRE-WINDOW pilot (not judged, no report) for W-FM7v2.
 *
 * Fix HEAD 3b54ca1: (A-1) red click arm gates = isLegalAt (!canSeeSky) +
 * isOutdoorsMITE (R196 5658-5875 flood), vanilla canBlockStay light band gone;
 * (A-2) MixinBlockMushroomTile attaches the stage TE.
 *
 * Open questions this pilot must answer BEFORE the judged window:
 *   Q1 does the "5x5 roof at y+14, open neighbours at distance 3" geometry
 *      satisfy BOTH R196 gates (legal + outdoors) on the red arm?
 *   Q2 does the stage TE really advance now (1/3 -> 2/3 -> 3/3)?
 *   Q3 does generateBigMushroom succeed under that roof (the giant's own
 *      7x7 space check stops at y+13; the roof sits at y+14)?
 *   Q4 is the outdoor mycelium-TOP white-eat arm reachable (R196 isOutdoors
 *      true + isLegalAt true at a shaded-but-flooded spot)?
 *   Q5 is the grass-TOP red recursion (B-1) live?
 *
 * Probes: P1 red legal chain (10 hands) / P2 red open sky / P3 red roofed
 * no-flood / P4 brown click indoor / P5 brown TOP indoor / P6 brown TOP
 * shaded-outdoor / P7 grass TOP under red / P8 brown TOP open sky (deviation
 * probe, last on purpose).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm7v2-pilot';
const WORLD = 'f7w2';
const AY = 140;     // mushroom layer
const GY = 139;     // ground layer (grass / mycelium / floor)
const PAD = 138;    // stone pad

const sleep = L.sleep;
const log = L.log;

const ROOFY = 154;  // AY + 14, above the giant's tallest space check (AY+13)

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), arms: {} };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.head = require('child_process').execFileSync('git', ['rev-parse', 'HEAD'], { cwd: L.ROOT, encoding: 'utf8' }).trim();
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true, time: 18000 });
    const who = bot.username;

    /* ---- pad + indoor room (27x25 interior, ceiling AY+16) ---- */
    await L.tp(srv, 170.5, GY, 700.5, { bot: who, wait: 2400 });
    srv.send(`fill 150 ${PAD} 680 230 ${PAD} 720 minecraft:stone 0`);
    await sleep(1200);
    srv.send(`fill 158 ${GY} 688 184 ${GY} 712 minecraft:mycelium 0`);
    srv.send(`fill 157 ${GY} 687 157 156 713 minecraft:stone 0`);
    srv.send(`fill 185 ${GY} 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 687 185 156 687 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 713 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 156 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 158 ${AY} 688 184 155 712 minecraft:air 0`);
    /* ---- red legal: grass cell + 5x5 roof at ROOFY ---- */
    srv.send(`setblock 196 ${GY} 700 minecraft:grass 0 replace`);
    srv.send(`fill 194 ${ROOFY} 698 198 ${ROOFY} 702 minecraft:stone 0`);
    /* ---- red open-sky control ---- */
    srv.send(`setblock 216 ${GY} 700 minecraft:grass 0 replace`);
    /* ---- red roofed-no-flood: 9x9 roof, nearest open column at distance 4 ---- */
    srv.send(`setblock 204 ${GY} 690 minecraft:grass 0 replace`);
    srv.send(`fill 200 ${ROOFY} 686 208 ${ROOFY} 694 minecraft:stone 0`);
    /* ---- brown TOP shaded-outdoor: mycelium + 5x5 roof ---- */
    srv.send(`setblock 212 ${GY} 700 minecraft:mycelium 0 replace`);
    srv.send(`fill 210 ${ROOFY} 698 214 ${ROOFY} 702 minecraft:stone 0`);
    /* ---- brown TOP open-sky deviation probe ---- */
    srv.send(`setblock 220 ${GY} 700 minecraft:mycelium 0 replace`);
    await sleep(1400);

    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 64`);
    await sleep(1000);
    ev.heldStart = bot.heldItem ? bot.heldItem.count : null;

    /** one etest useblock, returns the held delta + fresh FarmLog rows */
    async function hand(x, y, z) {
      const from = srv.all.length;
      const before = bot.heldItem ? bot.heldItem.count : null;
      await L.lookAtTop(bot, x, y, z);
      L.useBlock(srv, x, y, z, who);
      await sleep(560);
      const after = bot.heldItem ? bot.heldItem.count : null;
      const rows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
      return { before, after, delta: (after === null || before === null) ? null : after - before, rows, useblocks: srv.all.slice(from).map(L.strip).filter((l) => /step=useblock/.test(l)).length };
    }
    /** C-11 warm-up: click a neutral block, never the arm target */
    async function warm(x, y, z) {
      await L.lookAtTop(bot, x, y, z);
      L.useBlock(srv, x, y, z, who);
      await sleep(420);
    }

    /* ================= P1 red legal chain ================= */
    srv.send(`setblock 196 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(400);
    // L0 survival probe: a mushroom that shrugs off a neighbour poke has
    // canBlockStay=true <=> vanilla light band <13 (the old wrong face).
    srv.send(`setblock 197 ${AY} 700 minecraft:stone 0 replace`);
    await sleep(350);
    srv.send(`setblock 197 ${AY} 700 minecraft:air 0 replace`);
    await sleep(350);
    ev.arms.L0 = { survives: (await L.testBlock(srv, 196, AY, 700, 'minecraft:red_mushroom')).ok };
    log('L0', JSON.stringify(ev.arms.L0));

    await L.tp(srv, 196.5, GY, 702.5, { bot: who, wait: 900 });
    await warm(196, PAD, 700);
    ev.arms.P1 = { hands: [], rows: [], giants: 0, replants: 0 };
    for (let i = 0; i < 10; i++) {
      const h = await hand(196, AY, 700);
      ev.arms.P1.hands.push({ i: i + 1, delta: h.delta, useblocks: h.useblocks, rows: h.rows });
      for (const r of h.rows) ev.arms.P1.rows.push(r);
      const giantRow = h.rows.find((r) => /giant=1/.test(r));
      if (giantRow) {
        ev.arms.P1.giants++;
        ev.arms.P1.hands[ev.arms.P1.hands.length - 1].giantBlock =
          (await L.testBlock(srv, 196, AY, 700, 'minecraft:red_mushroom_block')).ok;
        // step out of the giant's footprint before clearing (suffocation)
        await L.tp(srv, 196.5, GY, 708.5, { bot: who, wait: 400 });
        srv.send(`fill 193 ${AY} 697 199 153 703 minecraft:air 0`);
        await sleep(500);
        srv.send(`setblock 196 ${AY} 700 minecraft:red_mushroom 0 replace`);
        await sleep(450);
        ev.arms.P1.replants++;
        await L.tp(srv, 196.5, GY, 702.5, { bot: who, wait: 700 });
        await warm(196, PAD, 700);
      }
    }
    log('P1', JSON.stringify({
      hands: ev.arms.P1.hands.map((h) => ({ d: h.delta, r: (h.rows[0] || '').replace(/^.*fertilize /, '').slice(0, 46) })),
      giants: ev.arms.P1.giants, replants: ev.arms.P1.replants,
    }));

    /* ================= P2 red open sky (legal gate) ================= */
    srv.send(`setblock 216 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 216.5, GY, 702.5, { bot: who, wait: 800 });
    await warm(216, PAD, 700);
    ev.arms.P2 = await hand(216, AY, 700);
    log('P2', JSON.stringify({ delta: ev.arms.P2.delta, rows: ev.arms.P2.rows }));

    /* ================= P3 red roofed no flood (out gate) ================= */
    srv.send(`setblock 204 ${AY} 690 minecraft:red_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 204.5, GY, 692.5, { bot: who, wait: 800 });
    await warm(204, PAD, 690);
    ev.arms.P3 = await hand(204, AY, 690);
    log('P3', JSON.stringify({ delta: ev.arms.P3.delta, rows: ev.arms.P3.rows }));

    /* ================= P4 brown click arm indoor ================= */
    srv.send(`setblock 162 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 162.5, AY, 702.5, { bot: who, wait: 900 });
    await warm(162, PAD, 700);
    ev.arms.P4 = { hands: [] };
    for (let i = 0; i < 3; i++) {
      const h = await hand(162, AY, 700);
      ev.arms.P4.hands.push({ i: i + 1, delta: h.delta, rows: h.rows });
      await sleep(200);
    }
    ev.arms.P4.te2 = await L.testBlock(srv, 162, AY, 700, 'minecraft:brown_mushroom', 0, '{EtimMushroomGrowth:2}');
    ev.arms.P4.giant = await L.testBlock(srv, 162, AY, 700, 'minecraft:brown_mushroom_block');
    log('P4', JSON.stringify({
      rows: ev.arms.P4.hands.map((h) => (h.rows[0] || '(none)').replace(/^.*fertilize /, '')),
      te2: ev.arms.P4.te2.ok, giant: ev.arms.P4.giant.ok,
    }));

    /* ================= P5 brown TOP indoor (3 clicks -> giant) ================= */
    srv.send(`setblock 170 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 170.5, AY, 701.5, { bot: who, wait: 900 });
    await warm(170, PAD, 700);
    ev.arms.P5 = { hands: [] };
    for (let i = 0; i < 3; i++) {
      const h = await hand(170, GY, 700);
      ev.arms.P5.hands.push({ i: i + 1, delta: h.delta, rows: h.rows });
      await sleep(200);
    }
    ev.arms.P5.giant = await L.testBlock(srv, 170, AY, 700, 'minecraft:brown_mushroom_block');
    log('P5', JSON.stringify({
      rows: ev.arms.P5.hands.map((h) => (h.rows[0] || '(none)').replace(/^.*fertilize /, '')),
      giant: ev.arms.P5.giant.ok,
    }));

    /* ================= P6 brown TOP shaded-outdoor (white eat) ================= */
    srv.send(`setblock 212 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 212.5, GY, 701.5, { bot: who, wait: 900 });
    await warm(212, PAD, 700);
    ev.arms.P6 = await hand(212, GY, 700);
    ev.arms.P6.survives = (await L.testBlock(srv, 212, AY, 700, 'minecraft:brown_mushroom')).ok;
    log('P6', JSON.stringify({ delta: ev.arms.P6.delta, rows: ev.arms.P6.rows, live: ev.arms.P6.survives }));

    /* ================= P7 grass TOP under red (B-1 recursion) ================= */
    await L.tp(srv, 196.5, GY, 701.5, { bot: who, wait: 900 });
    await warm(196, PAD, 700);
    ev.arms.P7 = await hand(196, GY, 700);
    log('P7', JSON.stringify({ delta: ev.arms.P7.delta, rows: ev.arms.P7.rows }));

    /* ================= P8 brown TOP open sky (deviation probe) ================= */
    srv.send(`setblock 220 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 220.5, GY, 701.5, { bot: who, wait: 900 });
    await warm(220, PAD, 700);
    ev.arms.P8 = await hand(220, GY, 700);
    ev.arms.P8.survives = (await L.testBlock(srv, 220, AY, 700, 'minecraft:brown_mushroom')).ok;
    log('P8', JSON.stringify({ delta: ev.arms.P8.delta, rows: ev.arms.P8.rows, live: ev.arms.P8.survives }));

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
