#!/usr/bin/env node
/**
 * f10-b2-pilot4.js — jump-lane v4. v3 lessons: EntityAITempt only sees the
 * player within 10 blocks, so a 15-long lane left the far chickens idle. v4:
 * 7-long walled lane (3 one-high full-width steps), bot alternating the two
 * ends every 8 s, 4 natural chickens seeded to num=2, client-side Y sampling
 * every second to count actual climbs (a climb == a vanilla jump()).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-b2-pilot4';
const WORLD = 'f10b2s';
const A = 'ETIM_F7';
const TY = 100;
const LANE = { x0: 330, x1: 336, z0: 845, z1: 847 };
let srv = null, bot = null;
const ev = { tag: TAG, samples: [] };
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
    await L.tp(srv, LANE.x0 + 3.5, TY + 1, LANE.z0 + 1.5, { bot: A, wait: 1500 });
    srv.send('kill @e[type=!player]');
    await sleep(1000);

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

    const spots = [332.5, 334.5, 333.5, 335.5];
    for (const x of spots) srv.send(`summon minecraft:chicken ${x} ${TY + 1} ${z0 + 1.5} {PersistenceRequired:1b}`);
    await sleep(2500);
    srv.send(`etest prod ${A} 6 feather=2`);
    await sleep(800);
    srv.send(`clear ${A}`);
    await sleep(300);
    srv.send(`give ${A} minecraft:wheat_seeds 1`);
    await sleep(700);
    const seeds = bot.inventory.items().find((i) => i.name === 'wheat_seeds');
    await bot.equip(seeds, 'hand');
    await sleep(400);

    const from = srv.all.length;
    const yTrack = {};      // id -> last y
    let climbs = 0;
    const end = Date.now() + 200000;
    let cycle = 0;
    let tNext = Date.now();
    while (Date.now() < end) {
      cycle++;
      await L.tp(srv, (cycle % 2 === 1 ? x1 - 1.5 : x0 + 0.5), TY + 1, z0 + 1.5, { bot: A, wait: 800 });
      for (let s = 0; s < 9; s++) {
        const chicks = Object.values(bot.entities || {}).filter((e) => e && e.name === 'chicken'
          && e.position && Math.abs(e.position.x - x0 - 3) < 8 && Math.abs(e.position.z - z0 - 1.5) < 4);
        for (const c of chicks) {
          const y = Math.round(c.position.y * 10) / 10;
          if (yTrack[c.id] !== undefined && yTrack[c.id] !== y) climbs++;
          yTrack[c.id] = y;
        }
        ev.samples.push(chicks.length);
        await sleep(1000);
      }
      const drops = since(from).filter((l) => /kind=feather jump=true/.test(l));
      log('c' + cycle, JSON.stringify({ climbs, chicks: Object.keys(yTrack).length, drops: drops.length }));
      if (drops.length >= 1) break;
    }
    const rows = since(from).filter((l) => /kind=feather jump=true/.test(l));
    ev.arms = { drops: rows.length, sample: rows.slice(0, 2), climbs, cycles: cycle, ids: Object.keys(yTrack) };
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
