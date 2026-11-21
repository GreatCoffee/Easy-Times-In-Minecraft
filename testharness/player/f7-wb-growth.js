#!/usr/bin/env node
/** f7-wb-growth.js - W-FM9 x1.5 TE face diagnosis (single setblock vs fill NBT). */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-growth';
const WORLD = 'f7wc';
const AY = 160;
const AX = 230, AZ = 700;
const log = L.log;
const sleep = L.sleep;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
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
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    const who = bot.username;
    await L.tp(srv, AX + 0.5, AY + 2, AZ + 0.5, { bot: who, wait: 2200 });
    srv.send(`fill ${AX - 8} ${AY - 2} ${AZ - 8} ${AX + 8} ${AY - 2} ${AZ + 8} minecraft:stone 0`);
    srv.send(`fill ${AX - 8} ${AY - 1} ${AZ - 8} ${AX + 8} ${AY + 7} ${AZ + 8} minecraft:air 0`);
    await sleep(1200);
    // single setblock NBT
    srv.send(`setblock ${AX} ${AY - 1} ${AZ} minecraft:farmland 7 replace {EtimFertilized:1b}`);
    await sleep(500);
    ev.setNbt = await L.testBlock(srv, AX, AY - 1, AZ, 'minecraft:farmland', -1, '{EtimFertilized:1b}');
    srv.send(`setblock ${AX} ${AY} ${AZ} minecraft:wheat 0 replace`);
    // fill NBT at another spot
    srv.send(`fill ${AX + 4} ${AY - 1} ${AZ - 1} ${AX + 6} ${AY - 1} ${AZ + 1} minecraft:farmland 7 replace {EtimFertilized:1b}`);
    await sleep(500);
    ev.fillNbt = await L.testBlock(srv, AX + 5, AY - 1, AZ, 'minecraft:farmland', -1, '{EtimFertilized:1b}');
    srv.send(`fill ${AX + 4} ${AY} ${AZ - 1} ${AX + 6} ${AY} ${AZ + 1} minecraft:wheat 0 replace`);
    await sleep(500);
    ev.blocks = {
      single: await L.testBlock(srv, AX, AY - 1, AZ, 'minecraft:farmland', 7),
      singleCrop: await L.testBlock(srv, AX, AY, AZ, 'minecraft:wheat'),
      fill: await L.testBlock(srv, AX + 5, AY - 1, AZ, 'minecraft:farmland', 7),
      fillCrop: await L.testBlock(srv, AX + 5, AY, AZ, 'minecraft:wheat'),
    };
    srv.send('gamerule randomTickSpeed 200');
    const from = srv.all.length;
    await sleep(14000);
    srv.send('gamerule randomTickSpeed 3');
    const rows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] growth pos=/.test(l));
    ev.growthRows = rows.length;
    ev.singleRows = rows.filter((l) => l.indexOf('pos=' + AX + ',') >= 0).length;
    ev.fillRows = rows.filter((l) => /pos=23[4-6],/.test(l)).length;
    ev.ratios = [...new Set(rows.map((l) => (/ratio=([\d.]+)/.exec(l) || [])[1]).filter(Boolean))];
    ev.sample = rows.slice(0, 5);
    log('growth', JSON.stringify({ setNbt: ev.setNbt.ok, fillNbt: ev.fillNbt.ok, blocks: ev.blocks, rows: ev.growthRows, single: ev.singleRows, fill: ev.fillRows, ratios: ev.ratios }));
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
