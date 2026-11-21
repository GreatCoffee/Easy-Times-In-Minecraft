#!/usr/bin/env node
/**
 * f7-wb-fm7v2-pilot2.js - second PRE-WINDOW pilot for W-FM7v2 (HEAD 3b54ca1).
 *
 * pilot1 proved: brown click arm advances 1/3->2/3 (TE attached), TOP arm
 * reaches 3/3 giant=1, shaded-outdoor white-eats, grass-TOP recursion hits
 * the red arm. pilot1's red arm probes were void because the manure stack was
 * not in the selected hotbar slot (heldStart=1, first arms silent).
 *
 * pilot2: explicit held-slot select + ordered probes.
 *   Q1 item sanity (brown indoor click)          -> row
 *   Q2 red legal (5x5 roof y+14) 8 hands         -> stage chain + giant
 *   Q3 red open sky                              -> deny legal=0
 *   Q4 red roofed no-flood (9x9 roof)            -> deny out=0
 *   Q5 brown TOP shaded-outdoor                  -> outdoor=1 white eat
 *   Q6 grass TOP under red                       -> kind=red row (B-1)
 *   Q7 brown TOP open sky                        -> deviation probe
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-fm7v2-pilot2';
const WORLD = 'f7w2b';
const AY = 140;
const GY = 139;
const PAD = 138;
const ROOFY = 154;

const sleep = L.sleep;
const log = L.log;

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

    /* ---- pad + indoor room (27x25 interior) ---- */
    await L.tp(srv, 170.5, GY, 700.5, { bot: who, wait: 2400 });
    srv.send(`fill 150 ${PAD} 680 230 ${PAD} 720 minecraft:stone 0`);
    await sleep(1100);
    srv.send(`fill 158 ${GY} 688 184 ${GY} 712 minecraft:mycelium 0`);
    srv.send(`fill 157 ${GY} 687 157 156 713 minecraft:stone 0`);
    srv.send(`fill 185 ${GY} 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 687 185 156 687 minecraft:stone 0`);
    srv.send(`fill 157 ${GY} 713 185 156 713 minecraft:stone 0`);
    srv.send(`fill 157 156 687 185 156 713 minecraft:stone 0`);
    srv.send(`fill 158 ${AY} 688 184 155 712 minecraft:air 0`);
    /* red legal: grass cell + 5x5 roof at ROOFY */
    srv.send(`setblock 196 ${GY} 700 minecraft:grass 0 replace`);
    srv.send(`fill 194 ${ROOFY} 698 198 ${ROOFY} 702 minecraft:stone 0`);
    /* red open sky */
    srv.send(`setblock 216 ${GY} 700 minecraft:grass 0 replace`);
    /* red roofed no-flood: 9x9 roof, nearest open column at distance 4 */
    srv.send(`setblock 204 ${GY} 690 minecraft:grass 0 replace`);
    srv.send(`fill 200 ${ROOFY} 686 208 ${ROOFY} 694 minecraft:stone 0`);
    /* brown TOP shaded-outdoor */
    srv.send(`setblock 212 ${GY} 700 minecraft:mycelium 0 replace`);
    srv.send(`fill 210 ${ROOFY} 698 214 ${ROOFY} 702 minecraft:stone 0`);
    /* brown TOP open sky */
    srv.send(`setblock 220 ${GY} 700 minecraft:mycelium 0 replace`);
    await sleep(1400);

    srv.send(`clear ${who}`);
    srv.send(`give ${who} etim:manure 64`);
    await sleep(1200);

    /* ---- explicit manure equip (pilot1 defect: stack not in the selected slot) ---- */
    async function equipManure() {
      const it = bot.inventory.items().find((i) => /manure/.test(i.name));
      ev.inv = { items: bot.inventory.items().map((i) => ({ name: i.name, count: i.count, slot: i.slot })), quick: bot.quickBarSlot };
      if (!it) { log('equip', 'NO MANURE'); return null; }
      if (it.slot >= 36 && it.slot <= 44) {
        bot.setQuickBarSlot(it.slot - 36);
      } else {
        try { await bot.equip(it, 'hand'); } catch (e) { log('equip', e.message); }
      }
      await sleep(500);
      const h = bot.heldItem ? { name: bot.heldItem.name, count: bot.heldItem.count } : null;
      ev.inv.heldAfter = h;
      log('hold', JSON.stringify(h));
      return h;
    }
    ev.held = await equipManure();

    async function hand(x, y, z) {
      const from = srv.all.length;
      const before = bot.heldItem ? bot.heldItem.count : null;
      await L.lookAtTop(bot, x, y, z);
      L.useBlock(srv, x, y, z, who);
      await sleep(600);
      const after = bot.heldItem ? bot.heldItem.count : null;
      const rows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\]/.test(l));
      return { before, after, delta: (before === null || after === null) ? null : after - before, rows,
        useblocks: srv.all.slice(from).map(L.strip).filter((l) => /step=useblock/.test(l)).length };
    }
    async function warm(x, y, z) {
      await L.lookAtTop(bot, x, y, z);
      L.useBlock(srv, x, y, z, who);
      await sleep(450);
    }
    async function exists(x, y, z, block) { return (await L.testBlock(srv, x, y, z, block)).ok; }

    /* ================= Q1 item sanity: brown indoor click ================= */
    srv.send(`setblock 162 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(400);
    await L.tp(srv, 162.5, AY, 702.5, { bot: who, wait: 900 });
    await warm(162, PAD, 700);
    ev.arms.Q1 = await hand(162, AY, 700);
    log('Q1', JSON.stringify({ delta: ev.arms.Q1.delta, rows: ev.arms.Q1.rows }));

    /* ================= Q2 red legal: 8 hands ================= */
    srv.send(`setblock 196 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(450);
    ev.arms.Q2 = { hands: [], giants: 0, replants: 0, existedAtStart: await exists(196, AY, 700, 'minecraft:red_mushroom') };
    await L.tp(srv, 196.5, GY, 702.5, { bot: who, wait: 900 });
    await warm(196, PAD, 700);
    for (let i = 0; i < 8; i++) {
      const h = await hand(196, AY, 700);
      ev.arms.Q2.hands.push({ i: i + 1, delta: h.delta, useblocks: h.useblocks, rows: h.rows });
      const giantRow = h.rows.find((r) => /giant=1/.test(r));
      if (giantRow) {
        ev.arms.Q2.giants++;
        ev.arms.Q2.hands[ev.arms.Q2.hands.length - 1].giantBlock =
          await exists(196, AY, 700, 'minecraft:red_mushroom_block');
        await L.tp(srv, 196.5, GY, 708.5, { bot: who, wait: 450 });
        srv.send(`fill 193 ${AY} 697 199 153 703 minecraft:air 0`);
        await sleep(550);
        srv.send(`setblock 196 ${AY} 700 minecraft:red_mushroom 0 replace`);
        await sleep(500);
        ev.arms.Q2.replants++;
        await L.tp(srv, 196.5, GY, 702.5, { bot: who, wait: 750 });
        await warm(196, PAD, 700);
      }
    }
    log('Q2', JSON.stringify({
      existed: ev.arms.Q2.existedAtStart, giants: ev.arms.Q2.giants, replants: ev.arms.Q2.replants,
      seq: ev.arms.Q2.hands.map((h) => ({ d: h.delta, r: (h.rows[0] || '-').replace(/^.*fertilize /, '').slice(0, 44) })),
    }));

    /* ================= Q3 red open sky ================= */
    srv.send(`setblock 216 ${AY} 700 minecraft:red_mushroom 0 replace`);
    await sleep(450);
    ev.arms.Q3existed = await exists(216, AY, 700, 'minecraft:red_mushroom');
    await L.tp(srv, 216.5, GY, 702.5, { bot: who, wait: 800 });
    await warm(216, PAD, 700);
    ev.arms.Q3 = await hand(216, AY, 700);
    log('Q3', JSON.stringify({ existed: ev.arms.Q3existed, delta: ev.arms.Q3.delta, rows: ev.arms.Q3.rows }));

    /* ================= Q4 red roofed no-flood ================= */
    srv.send(`setblock 204 ${AY} 690 minecraft:red_mushroom 0 replace`);
    await sleep(450);
    ev.arms.Q4existed = await exists(204, AY, 690, 'minecraft:red_mushroom');
    await L.tp(srv, 204.5, GY, 692.5, { bot: who, wait: 800 });
    await warm(204, PAD, 690);
    ev.arms.Q4 = await hand(204, AY, 690);
    log('Q4', JSON.stringify({ existed: ev.arms.Q4existed, delta: ev.arms.Q4.delta, rows: ev.arms.Q4.rows }));

    /* ================= Q5 brown TOP shaded-outdoor ================= */
    srv.send(`setblock 212 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(450);
    await L.tp(srv, 212.5, GY, 701.5, { bot: who, wait: 800 });
    await warm(212, PAD, 700);
    ev.arms.Q5 = await hand(212, GY, 700);
    ev.arms.Q5.survives = await exists(212, AY, 700, 'minecraft:brown_mushroom');
    log('Q5', JSON.stringify({ delta: ev.arms.Q5.delta, rows: ev.arms.Q5.rows, live: ev.arms.Q5.survives }));

    /* ================= Q6 grass TOP under red (B-1) ================= */
    await L.tp(srv, 196.5, GY, 701.5, { bot: who, wait: 800 });
    await warm(196, PAD, 700);
    ev.arms.Q6 = await hand(196, GY, 700);
    log('Q6', JSON.stringify({ delta: ev.arms.Q6.delta, rows: ev.arms.Q6.rows }));

    /* ================= Q7 brown TOP open sky (deviation probe) ================= */
    srv.send(`setblock 220 ${AY} 700 minecraft:brown_mushroom 0 replace`);
    await sleep(450);
    await L.tp(srv, 220.5, GY, 701.5, { bot: who, wait: 800 });
    await warm(220, PAD, 700);
    ev.arms.Q7 = await hand(220, GY, 700);
    ev.arms.Q7.survives = await exists(220, AY, 700, 'minecraft:brown_mushroom');
    log('Q7', JSON.stringify({ delta: ev.arms.Q7.delta, rows: ev.arms.Q7.rows, live: ev.arms.Q7.survives }));

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
