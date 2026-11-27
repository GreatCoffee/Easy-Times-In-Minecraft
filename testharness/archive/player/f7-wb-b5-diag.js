#!/usr/bin/env node
/** f7-wb-b5-diag.js - one-boot diagnostic: why did the mycelium TOP arm stay silent? */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-b5-diag';
const WORLD = 'b5p';           // reuse the pilot world (room + spots already built)
const sleep = L.sleep;
const log = L.log;
const who = L.BOT;

async function main() {
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'foodDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const bot = await L.joinBot(srv);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 0, noPhysics: true, time: 18000 });

    const probes = [
      [170, 139, 700, 'minecraft:mycelium'],
      [170, 140, 700, 'minecraft:brown_mushroom'],
      [170, 156, 700, 'minecraft:stone'],
      [170, 155, 700, 'minecraft:air'],
      [169, 139, 700, 'minecraft:mycelium'],
      [170, 138, 700, 'minecraft:stone'],
    ];
    ev.probes = [];
    for (const [x, y, z, b] of probes) {
      const r = await L.testBlock(srv, x, y, z, b);
      ev.probes.push({ pos: `${x},${y},${z}`, block: b, ok: r.ok, raw: r.raw });
      log('probe', `${x},${y},${z} ${b} -> ${r.ok} :: ${r.raw}`);
    }

    await L.tp(srv, 170.5, 140, 701.5, { bot: who, wait: 1500 });
    srv.send(`clear ${who}`); await sleep(400);
    srv.send(`give ${who} etim:manure 8`); await sleep(2500);
    log('held', JSON.stringify(bot.heldItem ? { n: bot.heldItem.name, c: bot.heldItem.count, s: bot.heldItem.slot } : null));
    log('quick', bot.quickBarSlot, JSON.stringify(bot.inventory.items().map((i) => ({ n: i.name, c: i.count, s: i.slot }))));

    async function click(x, y, z, label) {
      const from = srv.all.length;
      const before = bot.heldItem ? bot.heldItem.count : null;
      await L.lookAtTop(bot, x, y, z);
      L.useBlock(srv, x, y, z, who);
      await sleep(1400);
      const lines = srv.all.slice(from).map(L.strip);
      const after = bot.heldItem ? bot.heldItem.count : null;
      const row = { label, before, after, farm: lines.filter((l) => /\[FarmLog\]/.test(l)),
        food: lines.filter((l) => /\[FoodLog\]/.test(l)), test: lines.filter((l) => /TestLog/.test(l)).length };
      log(label, JSON.stringify(row));
      return row;
    }
    ev.c1 = await click(170, 139, 700, 'click-mushroom-spot');
    // fresh mycelium + mushroom two blocks away
    srv.send('setblock 172 139 700 minecraft:mycelium 0 replace');
    await sleep(600);
    srv.send('setblock 172 140 700 minecraft:brown_mushroom 0 replace');
    await sleep(900);
    ev.freshMycelium = (await L.testBlock(srv, 172, 139, 700, 'minecraft:mycelium')).ok;
    ev.freshMushroom = (await L.testBlock(srv, 172, 140, 700, 'minecraft:brown_mushroom')).ok;
    ev.c2 = await click(172, 139, 700, 'click-fresh');
    // control: red mushroom arm in the same boot (must produce a row)
    srv.send('setblock 196 140 700 minecraft:red_mushroom 0 replace');
    await sleep(700);
    await L.tp(srv, 196.5, 139, 702.5, { bot: who, wait: 1200 });
    ev.c3 = await click(196, 140, 700, 'click-red-control');

    ev.stop = await srv.stop();
  } finally {
    try { bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) ev.stop = await srv.stop(); } catch (e) { /* noop */ }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 2) + '\n', 'utf8');
    log('evidence', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
