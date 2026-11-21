#!/usr/bin/env node
/**
 * f7-wb-red.js - W-FM7(c) red-mushroom 200-roll arm (dedicated).
 * The main window's first oversized giant (i=8) left blocks above the 7-high
 * clear, turning canSeeSky false for every later roll; this window clears
 * 17 blocks of air above the mushroom so the outdoor face stays legal.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-red';
const WORLD = 'f7wc';
const AY = 140;
const AX = 186, AZ = 820;

const sleep = L.sleep;
const log = L.log;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), rolls: { n: 0, pass: 0, fail: 0, giant: 0, noRow: 0 } };
  const propsBefore = fs.readFileSync(L.PROPS);
  const cfgBefore = fs.readFileSync(L.CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true, time: 18000 });
    const who = bot.username;
    await L.tp(srv, AX + 0.5, AY + 2, AZ + 0.5, { bot: who, wait: 2200 });
    srv.send(`fill ${AX - 20} ${AY - 2} ${AZ - 20} ${AX + 20} ${AY - 2} ${AZ + 20} minecraft:grass 0`);
    srv.send(`fill ${AX - 20} ${AY - 1} ${AZ - 20} ${AX + 20} ${AY + 20} ${AZ + 20} minecraft:air 0`);
    await sleep(1400);
    ev.biome = await bot.world.getBiome(new (require('vec3').Vec3)(AX, 64, AZ));
    srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`);
    await sleep(400);
    let from = srv.all.length;
    const t0 = Date.now();
    for (let i = 0; i < 200; i++) {
      if (i % 55 === 0) { srv.send(`replaceitem entity ${who} slot.weapon.mainhand etim:manure 64 0`); await sleep(250); }
      // 17-high clear defeats the rare i=8/i=12 oversized giant
      srv.send(`fill ${AX - 4} ${AY} ${AZ - 4} ${AX + 4} ${AY + 16} ${AZ + 4} minecraft:air 0`);
      srv.send(`setblock ${AX} ${AY - 1} ${AZ} minecraft:grass 0 replace`);
      srv.send(`setblock ${AX} ${AY} ${AZ} minecraft:red_mushroom 0 replace`);
      await L.tp(srv, AX + 0.5, AY, AZ + 2.0, { bot: who, wait: 150 });
      await L.lookAtTop(bot, AX, AY, AZ);
      L.useBlock(srv, AX, AY, AZ, who);
      await sleep(220);
      const giant = await L.testBlock(srv, AX, AY, AZ, 'minecraft:red_mushroom_block');
      if (giant.ok) ev.rolls.giant++;
      if (i % 20 === 19) {
        const now = srv.all.slice(from).map(L.strip).filter((l) => /kind=red/.test(l)).length;
        log('roll', JSON.stringify({ i: i + 1, rows: now, giant: ev.rolls.giant, sec: Math.round((Date.now() - t0) / 1000) }));
      }
    }
    await sleep(1200);
    const rows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] fertilize src=manure kind=red/.test(l));
    for (const l of rows) {
      const m = /roll=([\d.]+)/.exec(l);
      if (!m) continue;
      ev.rolls.n++;
      if (parseFloat(m[1]) < 0.5) ev.rolls.pass++; else ev.rolls.fail++;
    }
    ev.rolls.rows = rows.length;
    ev.rolls.noRow = 200 - rows.length;
    ev.rolls.sample = rows.slice(0, 3);
    ev.rolls.last = rows.slice(-3);
    ev.rolls.sec = Math.round((Date.now() - t0) / 1000);
    log('red', JSON.stringify({ n: ev.rolls.n, pass: ev.rolls.pass, fail: ev.rolls.fail, giant: ev.rolls.giant, noRow: ev.rolls.noRow, sec: ev.rolls.sec }));
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
