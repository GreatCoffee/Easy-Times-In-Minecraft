#!/usr/bin/env node
/** f10-pg-diag2.js — pen geometry truth: air volume at both levels, wall
 *  faces, then one NoAI cow watch (inWall arm?). */
'use strict';
const L = require('./f7-wb-lib');

const FX = 297, FZ = 847, TY = 100;

async function main() {
  const srv = await L.startServer({ root: L.ROOT, tag: 'f10-pg-diag2' });
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    const bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: bot.username, wait: 1500 });

    srv.send('fill 297 99 847 309 102 859 minecraft:air 0');
    await L.sleep(900);
    srv.send('fill 297 99 847 309 99 859 minecraft:dirt 0');
    srv.send('fill 297 100 847 309 100 859 minecraft:grass 0');
    await L.sleep(900);
    srv.send('fill 297 101 847 309 101 859 minecraft:cobblestone 0');
    srv.send('fill 298 101 848 308 101 858 minecraft:air 0');
    srv.send('fill 297 102 847 309 102 859 minecraft:cobblestone 0');
    srv.send('fill 298 102 848 308 102 858 minecraft:air 0');
    await L.sleep(1200);

    for (const [x, y, z, block, want] of [
      [299, 100, 850, 'air', true], [300, 101, 851, 'air', true], [300, 102, 851, 'air', true],
      [297, 101, 853, 'cobblestone', true], [308, 101, 858, 'air', true],
      [309, 102, 858, 'cobblestone', true], [298, 102, 848, 'air', true],
    ]) {
      const r = await L.testBlock(srv, x, y, z, 'minecraft:' + block);
      srv.send(`testforblock ${x} ${y} ${z} minecraft:${block}`);
      await L.sleep(500);
      const got = rowsFrom(mark()).slice(0, 3).map((l) => l.slice(0, 110)).find((l) => /Successfully|did not|failed|blocks/i.test(l));
      L.log('t ' + x + ',' + y + ',' + z + ' want=' + block, got || '(no echo)');
    }

    srv.send(`summon minecraft:cow 300.5 101 851.5 {NoAI:1b}`);
    await L.sleep(500);
    srv.send(`testfor @e[type=cow,r=16,x=${FX + 6},y=${TY + 1},z=${FZ + 6}]`);
    await L.sleep(900);
    L.log('cow-present', JSON.stringify(rowsFrom(mark()).filter((l) => /Found.*entity|Found [0-9]/i.test(l)).slice(0, 2)));
    for (let i = 1; i <= 8; i++) {
      await L.sleep(1000);
      const view = Object.values(bot.entities || {}).filter((e) => e && e.name === 'cow').length;
      L.log('cow t+' + i + 's', String(view));
    }

    srv.send('kill @e[type=!player,r=20,x=' + (FX + 6) + ',y=' + (TY + 1) + ',z=' + (FZ + 6) + ']');
    L.log('diag2-done', '');
  } catch (e) {
    L.log('DIAG2-FAIL', e && e.stack || e.message || e);
    process.exitCode = 2;
  } finally {
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (err) { L.log('stop-err', err.message); }
  }
}
main();
