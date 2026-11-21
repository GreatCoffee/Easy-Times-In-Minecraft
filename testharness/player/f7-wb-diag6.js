#!/usr/bin/env node
/** f7-wb-diag6.js - trample trigger diagnosis (player fall vs cow fall). */
'use strict';
const fs = require('fs');
const L = require('./f7-wb-lib');
const { Vec3 } = require('vec3');

const TAG = 'f7-wb-diag6';
const WORLD = 'f7wb';
const AX = 186, AY = 100, AZ = 740;

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
    srv.send(`fill ${AX - 10} ${AY - 2} ${AZ - 10} ${AX + 10} ${AY - 2} ${AZ + 10} minecraft:stone 0`);
    srv.send(`fill ${AX - 10} ${AY - 1} ${AZ - 10} ${AX + 10} ${AY + 8} ${AZ + 10} minecraft:air 0`);
    await L.sleep(1200);

    /* player fall onto wet farmland + crop */
    const P = { x: AX, y: AY - 1, z: AZ };
    srv.send(`setblock ${P.x} ${P.y} ${P.z} minecraft:farmland 7 replace`);
    srv.send(`setblock ${P.x} ${P.y + 1} ${P.z} minecraft:wheat 7 replace`);
    await L.tp(srv, P.x + 0.5, P.y + 6, P.z + 0.5, { bot: bot.username, wait: 200 });
    try { bot.physics.enabled = true; } catch (e) { /* noop */ }
    await L.sleep(2500);
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    L.log('player-fall', JSON.stringify({
      rows: srv.all.map(L.strip).filter((l) => /FarmLog\] trample/.test(l)).slice(-6),
      block: await L.testBlock(srv, P.x, P.y, P.z, 'minecraft:farmland'),
      crop: await L.testBlock(srv, P.x, P.y + 1, P.z, 'minecraft:air'),
      pos: bot.entity.position,
    }));

    /* cow fall (no NoAI) onto wet farmland + crop */
    const C = { x: AX + 5, y: AY - 1, z: AZ };
    srv.send(`setblock ${C.x} ${C.y} ${C.z} minecraft:farmland 7 replace`);
    srv.send(`setblock ${C.x} ${C.y + 1} ${C.z} minecraft:wheat 7 replace`);
    srv.send(`summon minecraft:cow ${C.x + 0.5} ${C.y + 7} ${C.z + 0.5} {PersistenceRequired:1b}`);
    await L.sleep(4500);
    L.log('cow-fall', JSON.stringify({
      rows: srv.all.map(L.strip).filter((l) => /FarmLog\] trample/.test(l)).slice(-6),
      block: await L.testBlock(srv, C.x, C.y, C.z, 'minecraft:farmland'),
      crop: await L.testBlock(srv, C.x, C.y + 1, C.z, 'minecraft:air'),
    }));
    srv.send('kill @e[type=cow]');
    await L.sleep(300);

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
