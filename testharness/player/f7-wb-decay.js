#!/usr/bin/env node
/**
 * f7-wb-decay.js - W-FM4 corrected: crop-free decay + 3x3 supported-crop shield
 * + turnToDirt entity lift (read from the tracked item entity position).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-decay';
const WORLD = 'f7wc';
const AY = 160;
const AX = 186, AZ = 700;

const sleep = L.sleep;
const log = L.log;

function itemNear(bot, x, z) {
  let best = null;
  for (const e of Object.values(bot.entities || {})) {
    if (!e || !e.position || e.name !== 'item') continue;
    if (Math.abs(e.position.x - x) < 2 && Math.abs(e.position.z - z) < 2) {
      if (!best || Math.abs(e.position.y - (AY - 0.1)) < Math.abs(best.position.y - (AY - 0.1))) best = e;
    }
  }
  return best ? { id: best.id, x: +best.position.x.toFixed(3), y: +best.position.y.toFixed(4), z: +best.position.z.toFixed(3) } : null;
}

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
    srv.send(`fill ${AX - 8} ${AY - 1} ${AZ - 8} ${AX + 8} ${AY + 8} ${AZ + 8} minecraft:air 0`);
    await sleep(1200);
    // crop-free plot + item in the top slice
    srv.send(`setblock ${AX} ${AY - 1} ${AZ} minecraft:farmland 0 replace`);
    srv.send(`setblock ${AX} ${AY} ${AZ} minecraft:air 0 replace`);
    // shield: farmland at AX+5 with a supported crop at AX+6 (support at AX+6, AY-1)
    srv.send(`setblock ${AX + 5} ${AY - 1} ${AZ} minecraft:farmland 0 replace`);
    srv.send(`setblock ${AX + 6} ${AY - 1} ${AZ} minecraft:farmland 7 replace`);
    srv.send(`setblock ${AX + 6} ${AY} ${AZ} minecraft:wheat 0 replace`);
    srv.send(`summon minecraft:item ${AX + 0.5} ${AY - 0.1} ${AZ + 0.5} {Item:{id:"minecraft:stone",Count:1b},NoGravity:1b,PickupDelay:32767,Age:-32768}`);
    await sleep(1800);
    const before = itemNear(bot, AX + 0.5, AZ + 0.5);
    ev.before = before;
    ev.beforeBlocks = {
      decay: await L.testBlock(srv, AX, AY - 1, AZ, 'minecraft:farmland', 0),
      shield: await L.testBlock(srv, AX + 5, AY - 1, AZ, 'minecraft:farmland', 0),
      crop: await L.testBlock(srv, AX + 6, AY, AZ, 'minecraft:wheat'),
    };
    srv.send('gamerule randomTickSpeed 30');
    const from = srv.all.length;
    await sleep(75000);
    srv.send('gamerule randomTickSpeed 3');
    await sleep(500);
    const after = itemNear(bot, AX + 0.5, AZ + 0.5);
    ev.after = after;
    ev.afterBlocks = {
      decayDirt: await L.testBlock(srv, AX, AY - 1, AZ, 'minecraft:dirt'),
      shield: await L.testBlock(srv, AX + 5, AY - 1, AZ, 'minecraft:farmland', 0),
      crop: await L.testBlock(srv, AX + 6, AY, AZ, 'minecraft:wheat'),
    };
    const rows = srv.all.slice(from).map(L.strip).filter((l) => /\[FarmLog\] moisture decay/.test(l));
    ev.decayRows = rows;
    ev.decayAt = { core: rows.filter((l) => l.indexOf('pos=' + AX + ',' + (AY - 1) + ',' + AZ) >= 0).length,
      shield: rows.filter((l) => l.indexOf('pos=' + (AX + 5) + ',' + (AY - 1) + ',' + AZ) >= 0).length };
    ev.lift = { beforeY: before && before.y, afterY: after && after.y, delta: before && after ? +(after.y - before.y).toFixed(4) : null };
    log('decay', JSON.stringify({ before, after, lift: ev.lift, blocks: ev.afterBlocks, rows: ev.decayAt }));
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
