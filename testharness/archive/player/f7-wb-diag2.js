#!/usr/bin/env node
/** f7-wb-diag2.js - packet path diagnosis (hoe till + manure + bucket activateItem). */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-diag2';
const WORLD = 'f7wb';
const AX = 186, AY = 100, AZ = 761;

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  const propsBefore = fs.readFileSync(L.PROPS);
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    bot = await L.joinBot(srv);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await L.stage(srv, bot, { gamemode: 0, rts: 3, noPhysics: true });
    await L.tp(srv, AX + 0.5, AY, AZ + 0.5, { bot: bot.username, wait: 1800 });
    srv.send(`fill ${AX - 12} ${AY - 2} ${AZ - 12} ${AX + 12} ${AY - 2} ${AZ + 12} minecraft:stone 0`);
    srv.send(`fill ${AX - 12} ${AY - 1} ${AZ - 12} ${AX + 12} ${AY + 6} ${AZ + 12} minecraft:air 0`);
    await L.sleep(1400);
    L.log('biome', await bot.world.getBiome(new Vec3(AX, 64, AZ)));

    /* hoe till */
    const T = { x: AX + 4, y: AY - 1, z: AZ };
    srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:dirt 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:hoe_copper 1 0`);
    srv.send(`etest enchant mainhand 5 fertility ${bot.username}`);
    await L.tp(srv, T.x + 0.5, T.y + 1, T.z + 3.5, { bot: bot.username, wait: 900 });
    await L.lookAtTop(bot, T.x, T.y, T.z);
    srv.send(`etest blockprobe ${bot.username}`);
    await L.sleep(500);
    let from = srv.all.length;
    L.useBlock(srv, T.x, T.y, T.z, bot.username);
    await L.sleep(1400);
    L.log('till-rows', JSON.stringify(srv.all.slice(from).map(L.strip).filter((l) => /FarmLog|TestLog|BlockLog/.test(l))));
    L.log('till-block', JSON.stringify(await L.testBlock(srv, T.x, T.y, T.z, 'minecraft:farmland')));

    /* manure */
    const M = { x: AX, y: AY - 1, z: AZ };
    srv.send(`setblock ${M.x} ${M.y} ${M.z} minecraft:farmland 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand etim:manure 5 0`);
    await L.tp(srv, M.x + 0.5, M.y + 1, M.z + 3.5, { bot: bot.username, wait: 900 });
    await L.lookAtTop(bot, M.x, M.y, M.z);
    srv.send(`etest blockprobe ${bot.username}`);
    await L.sleep(400);
    from = srv.all.length;
    L.useBlock(srv, M.x, M.y, M.z, bot.username);
    await L.sleep(1400);
    L.log('manure-rows', JSON.stringify(srv.all.slice(from).map(L.strip).filter((l) => /FarmLog|TestLog|BlockLog/.test(l))));
    L.log('manure-te', JSON.stringify(await L.testBlock(srv, M.x, M.y, M.z, 'minecraft:farmland', -1, '{EtimFertilized:1b}')));
    L.log('held', bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null);

    /* bucket via bot.activateItem (use_item path) */
    const B = { x: AX - 4, y: AY - 1, z: AZ };
    srv.send(`fill ${B.x - 1} ${B.y} ${B.z - 1} ${B.x + 1} ${B.y} ${B.z + 1} minecraft:farmland 0 replace`);
    srv.send(`replaceitem entity ${bot.username} slot.weapon.mainhand minecraft:water_bucket 1 0`);
    await L.tp(srv, B.x + 0.5, B.y + 1, B.z + 3.5, { bot: bot.username, wait: 900 });
    await L.lookAtTop(bot, B.x, B.y, B.z);
    from = srv.all.length;
    try { await bot.activateItem(); } catch (e) { L.log('activate', e.message); }
    await L.sleep(1500);
    L.log('bucket-rows', JSON.stringify(srv.all.slice(from).map(L.strip).filter((l) => /FarmLog|TestLog/.test(l))));
    L.log('bucket-held', bot.heldItem ? bot.heldItem.name + ':' + bot.heldItem.count : null);
    L.log('bucket-block', JSON.stringify(await L.testBlock(srv, B.x, B.y, B.z, 'minecraft:farmland', 7)));

    srv.send('gamerule randomTickSpeed 3');
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try { if (!srv.exited) await srv.stop(); } catch (e) { /* noop */ }
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(L.PROPS, propsBefore);
    L.log('restored', 'level=' + L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name'));
  }
  process.exit(0);
}
main().catch((e) => { L.log('FATAL', (e && e.stack) || e); process.exit(1); });
