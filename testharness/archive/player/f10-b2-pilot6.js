#!/usr/bin/env node
/**
 * f10-b2-pilot6.js — panic-driven natural jumps. Pure wander gave only
 * ~0.21 climbs/s over 8 chickens (62 jumps/300 s -> ~20 % chance of no 1/40
 * drop). Vanilla EntityAIPanic runs 5-7 blocks at 1.4x whenever the chicken
 * holds a revenge target, crossing the one-high steps several times; a
 * creative-mode hit deals damage (the reach gate skips creative) and sets the
 * revenge target without killing (4 HP, heal with instant_health).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-b2-pilot6';
const WORLD = 'f10b2u';
const A = 'ETIM_F7';
const TY = 100;
const YARD = { x0: 330, x1: 336, z0: 845, z1: 849 };
let srv = null, bot = null;
const ev = { tag: TAG };
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
    await L.tp(srv, YARD.x0 + 3.5, TY + 1, YARD.z0 + 2.5, { bot: A, wait: 1500 });
    srv.send('kill @e[type=!player]');
    await sleep(1000);

    const { x0, x1, z0, z1 } = YARD;
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
    for (const [dx, dz] of [[0.5, 0.5], [2.5, 0.5], [4.5, 0.5], [2.5, 3.5]]) {
      srv.send(`summon minecraft:chicken ${x0 + dx} ${TY + 1} ${z0 + dz} {PersistenceRequired:1b}`);
    }
    await sleep(2500);
    srv.send(`etest prod ${A} 7 feather=2`);
    await sleep(800);

    const from = srv.all.length;
    const last = {};
    let climbs = 0;
    let hits = 0;
    const end = Date.now() + 150000;
    let healTick = 0;
    while (Date.now() < end) {
      const chicks = Object.values(bot.entities || {}).filter((e) => e && e.name === 'chicken'
        && e.position && Math.abs(e.position.x - x0 - 3) < 6 && Math.abs(e.position.z - z0 - 2) < 5)
        .sort((a, b) => a.id - b.id);
      if (!chicks.length) { await sleep(1000); continue; }
      await L.tp(srv, x0 + 3.5, TY + 1, z0 + 2.5, { bot: A, wait: 300 });
      for (const c of chicks) {
        try { bot.attack(c); hits++; } catch (e) { /* out of range */ }
        await sleep(200);
      }
      healTick++;
      if (healTick % 2 === 0) srv.send('effect @e[type=chicken] minecraft:instant_health 1 1');
      for (let s = 0; s < 3; s++) {
        for (const c of Object.values(bot.entities || {})) {
          if (!c || c.name !== 'chicken' || !c.position) continue;
          if (Math.abs(c.position.x - x0 - 3) > 8 || Math.abs(c.position.z - z0 - 2) > 6) continue;
          const y = Math.round(c.position.y * 10) / 10;
          if (last[c.id] !== undefined && last[c.id] !== y) climbs++;
          last[c.id] = y;
        }
        await sleep(1000);
      }
      const drops = since(from).filter((l) => /kind=feather jump=true/.test(l));
      log('c', JSON.stringify({ climbs, hits, drops: drops.length, chicks: chicks.length }));
      if (drops.length >= 1) break;
    }
    const drops = since(from).filter((l) => /kind=feather jump=true/.test(l));
    ev.arms = { climbs, hits, drops: drops.length, sample: drops.slice(0, 3), chickens: Object.keys(last).length };
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
