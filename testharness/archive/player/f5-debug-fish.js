'use strict';
/* f5-debug-fish.js — 真实抛竿咬钩面诊断（hook 位置/方块/窗口行/咬行） */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
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
  const srv = await startServer({ root: ROOT, tag: 'f5-debug-fish' });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    await sleep(1500);
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_R7' });
    try { bot.removeAllListeners('message'); } catch (e) {}
    try { bot.physics.enabled = false; } catch (e) {}
    srv.send('op ETIM_R7');
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doDaylightCycle false', 'doWeatherCycle false', 'randomTickSpeed 0']) srv.send('gamerule ' + g);
    srv.send('time set 18000');
    srv.send('weather clear 1000000');
    srv.send('gamemode 0 ETIM_R7');
    await sleep(600);
    const p = bot.entity.position;
    const bx = Math.floor(p.x), by = Math.floor(p.y), bz = Math.floor(p.z);
    srv.send(`fill ${bx - 6} ${by - 8} ${bz - 12} ${bx + 20} ${by + 8} ${bz + 12} minecraft:air 0`);
    srv.send(`fill ${bx - 6} ${by - 1} ${bz - 12} ${bx + 20} ${by - 1} ${bz + 12} minecraft:stone 0`);
    srv.send(`fill ${bx + 1} ${by - 5} ${bz - 8} ${bx + 16} ${by - 1} ${bz + 8} minecraft:water 0`);
    srv.send(`tp ETIM_R7 ${bx + 0.5} ${by} ${bz + 0.5} -90 30`);
    await sleep(2000);
    srv.send('clear ETIM_R7');
    srv.send('replaceitem entity ETIM_R7 slot.weapon.mainhand etim:fishing_rod_copper 1 0');
    await sleep(600);
    const from = srv.all.length;
    bot.activateItem();
    await sleep(1500);
    for (let i = 0; i < 20; i++) {
      const hooks = Object.values(bot.entities || {}).filter((e) => e && /hook/i.test(e.name || ''));
      const h = hooks[0];
      let blk = null;
      if (h) {
        const bp = h.position.offset(0, -0.2, 0);
        const b = bot.blockAt(bp);
        blk = b ? b.name : 'null';
      }
      const rows = srv.all.slice(from).map(strip);
      const gates = rows.filter((l) => /\[FishLog\] gate wt=/.test(l)).length;
      const wins = rows.filter((l) => /\[FishLog\] window ticks=/.test(l)).length;
      log('probe', `${i}: hook=${h ? `${h.position.x.toFixed(1)},${h.position.y.toFixed(1)},${h.position.z.toFixed(1)}` : 'none'} block=${blk} bites=${gates} windows=${wins}`);
      if (gates > 0) break;
      await sleep(2000);
    }
    const rows = srv.all.slice(from).map(strip);
    log('fishRows', rows.filter((l) => /\[FishLog\]/.test(l)).slice(0, 6).join(' || ').slice(0, 500));
    bot.activateItem();
    await sleep(1500);
    log('catchRows', srv.all.slice(from).map(strip).filter((l) => /\[FishLog\] catch/.test(l)).join(' || ').slice(0, 300));
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) {}
    try { if (!srv.exited) await srv.stop(); } catch (e) {}
    setCfg(CFG, 'fishingDebugLog', 'false');
    fs.writeFileSync(PROPS, propsBefore);
  }
  process.exit(0);
})().catch((e) => { log('FATAL', e && e.stack); process.exit(1); });
