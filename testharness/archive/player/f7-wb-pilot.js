#!/usr/bin/env node
/** f7-wb-pilot.js - mechanics pilot for the W-FM window (not a verdict run). */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f7-wb-pilot';
const WORLD = 'f7wb';
const AX = 186, AY = 100, AZ = 761;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), rows: [] };
  const cfgBefore = fs.readFileSync(L.CFG);
  const propsBefore = fs.readFileSync(L.PROPS);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: L.sha256(cfgBefore), keys: Object.keys(L.cfgKeys(L.CFG)).length };
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  ev.cfgGated = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)) };
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    ev.ids = (/\bids=([\d\s]+)/.exec(srv.all.map(L.strip).find((l) => /\[EtimInit\] enchant/.test(l)) || '') || [])[1] || null;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail + ' ids=' + ev.ids);
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 1, rts: 3, noPhysics: true });
    L.log('biome', JSON.stringify(await bot.world.getBiome(new (require('vec3').Vec3)(AX, 64, AZ))));

    // arena: load the target chunks FIRST (fill fails in unloaded chunks)
    await L.tp(srv, AX + 0.5, AY, AZ + 0.5, { bot: bot.username, wait: 1500 });
    srv.send(`fill ${AX - 16} ${AY - 2} ${AZ - 16} ${AX + 16} ${AY - 2} ${AZ + 16} minecraft:stone 0`);
    srv.send(`fill ${AX - 16} ${AY - 1} ${AZ - 16} ${AX + 16} ${AY + 6} ${AZ + 16} minecraft:air 0`);
    await L.sleep(1200);

    /* --- bucket 3x3 --- */
    const B = { x: AX, y: AY - 1, z: AZ + 6 };
    srv.send(`fill ${B.x - 1} ${B.y} ${B.z - 1} ${B.x + 1} ${B.y} ${B.z + 1} minecraft:farmland 0 replace`);
    srv.send(`gamemode 0 ${bot.username}`);
    await L.sleep(600);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand minecraft:water_bucket 1 0`);
    await L.sleep(400);
    await L.tp(srv, B.x + 0.5, B.y + 1, B.z + 2.0, { bot: bot.username, wait: 700 });
    await L.lookAtTop(bot, B.x, B.y, B.z);
    const bFrom = mark();
    L.useBlock(srv, B.x, B.y, B.z, bot.username);
    await L.sleep(1200);
    ev.bucket = {
      rows: rowsFrom(bFrom).filter((l) => /\[FarmLog\] fertilize|\[EnchLog\]|TestLog/.test(l)).slice(0, 8),
      held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
      center: await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:farmland', 7),
      above: await L.testBlock(srv, B.x, B.y + 1, B.z, 'minecraft:air'),
      corner: await L.testBlock(srv, B.x + 1, B.y, B.z + 1, 'minecraft:farmland', 7),
    };
    L.log('bucket', JSON.stringify(ev.bucket));

    /* --- manure farm top + TE read + second hit --- */
    const M = { x: AX - 6, y: AY - 1, z: AZ + 6 };
    srv.send(`setblock ${M.x} ${M.y} ${M.z} minecraft:farmland 7 replace`);
    srv.send(`gamemode 0 ${bot.username}`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.sleep(500);
    await L.tp(srv, M.x + 0.5, M.y + 1, M.z + 2.0, { bot: bot.username, wait: 700 });
    await L.lookAtTop(bot, M.x, M.y, M.z);
    const mFrom = mark();
    L.useBlock(srv, M.x, M.y, M.z, bot.username);
    await L.sleep(1000);
    ev.manure1 = {
      rows: rowsFrom(mFrom).filter((l) => /\[FarmLog\]/.test(l)).slice(0, 6),
      held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null,
      te: await L.testBlock(srv, M.x, M.y, M.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}'),
      teNoData: await L.testBlock(srv, M.x, M.y, M.z, 'minecraft:farmland', -1),
    };
    L.log('manure1', JSON.stringify(ev.manure1));
    const m2From = mark();
    L.useBlock(srv, M.x, M.y, M.z, bot.username);
    await L.sleep(900);
    ev.manure2 = { rows: rowsFrom(m2From).filter((l) => /\[FarmLog\]/.test(l)).slice(0, 6),
      held: bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null };
    L.log('manure2', JSON.stringify(ev.manure2));

    /* --- trample wet --- */
    const T = { x: AX + 6, y: AY - 1, z: AZ + 6 };
    srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:farmland 7 replace`);
    srv.send(`setblock ${T.x} ${T.y + 1} ${T.z} minecraft:wheat 7 replace`);
    srv.send(`summon minecraft:cow ${T.x + 0.5} ${T.y + 4} ${T.z + 0.5} {Silent:1b,NoAI:1b,PersistenceRequired:1b}`);
    await L.sleep(3500);
    ev.trample = {
      rows: srv.all.map(L.strip).filter((l) => /\[FarmLog\] trample/.test(l)).slice(-6),
      block: await L.testBlock(srv, T.x, T.y, T.z, 'minecraft:farmland'),
      crop: await L.testBlock(srv, T.x, T.y + 1, T.z, 'minecraft:air'),
    };
    L.log('trample', JSON.stringify(ev.trample));
    srv.send('kill @e[type=cow]');

    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message || e); }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    ev.cfgAfter = { bytes: fs.statSync(L.CFG).size, sha: L.sha256(fs.readFileSync(L.CFG)), keys: Object.keys(L.cfgKeys(L.CFG)).length };
    ev.propsAfter = { bytes: fs.statSync(L.PROPS).size, level: L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name') };
    ev.portAfter = L.netstatListen(L.PORT);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    L.log('done', path.join(L.OUT, TAG + '-evidence.json'));
  }
  process.exit(0);
}
main().catch((e) => { L.log('FATAL', (e && e.stack) || e); process.exit(1); });
