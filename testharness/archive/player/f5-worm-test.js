'use strict';
/* f5-worm-test.js — W-FF7 挖掘面自检（陆地基座 + 行速率） */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const { Vec3 } = require('vec3');
const ROOT = path.resolve(__dirname, '..', '..');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
}
(async () => {
  setCfg(CFG, 'fishingDebugLog', 'true');
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', 'f5wb'), 'utf8');
  const srv = await startServer({ root: ROOT, tag: 'f5-worm-test' });
  let bot = null;
  const mark = () => srv.all.length;
  const rows = (f) => srv.all.slice(f).map(strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    await sleep(1500);
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_R7' });
    try { bot.removeAllListeners('message'); } catch (e) {}
    try { bot.physics.enabled = false; } catch (e) {}
    srv.send('op ETIM_R7');
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doDaylightCycle false', 'doWeatherCycle false', 'randomTickSpeed 0', 'naturalRegeneration false']) srv.send('gamerule ' + g);
    srv.send('time set 18000');
    srv.send('weather clear 1000000');
    srv.send('gamemode 0 ETIM_R7');
    srv.send('effect ETIM_R7 minecraft:haste 1000000 5 true');
    await sleep(600);
    const bx = -66, by = 68, bz = 248;
    srv.send(`fill ${bx - 10} ${by - 3} ${bz - 10} ${bx + 10} ${by + 8} ${bz + 10} minecraft:air 0`);
    srv.send(`fill ${bx - 10} ${by - 1} ${bz - 10} ${bx + 10} ${by - 1} ${bz + 10} minecraft:stone 0`);
    srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:grass 0`);
    srv.send(`tp ETIM_R7 ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1800);
    srv.send('clear ETIM_R7');
    srv.send('replaceitem entity ETIM_R7 slot.weapon.mainhand etim:shovel_copper 1 0');
    await sleep(600);
    const spots = [];
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) spots.push({ x: bx + dx, y: by - 1, z: bz + dz });
    for (let round = 0; round < 4; round++) {
      const f = mark();
      srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:grass 0`);
      await sleep(250);
      const t0 = Date.now();
      let dug = 0, fail = 0;
      for (const s of spots) {
        const b = bot.blockAt(new Vec3(s.x, s.y, s.z));
        if (!b || b.name !== 'grass') { fail++; continue; }
        try { await bot.dig(b, true); dug++; } catch (e) { fail++; }
      }
      await sleep(400);
      const seg = rows(f);
      const worm = seg.filter((l) => /\[FishLog\] worm /.test(l)).length;
      log('round', `${round}: dug=${dug} fail=${fail} worm=${worm} ms=${Date.now() - t0} pos=${bot.entity.position.y.toFixed(1)}`);
    }
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) {}
    try { if (!srv.exited) await srv.stop(); } catch (e) {}
    setCfg(CFG, 'fishingDebugLog', 'false');
    fs.writeFileSync(PROPS, propsBefore);
  }
  process.exit(0);
})().catch((e) => { log('FATAL', e && e.stack); process.exit(1); });
