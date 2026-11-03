'use strict';
/* f5-dirty.js — W-FF6 脏洋臂诊断：扫描半径/方块可见性 */
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
  const srv = await startServer({ root: ROOT, tag: 'f5-dirty' });
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
    for (const g of ['doMobSpawning false', 'doDaylightCycle false', 'doWeatherCycle false', 'randomTickSpeed 0']) srv.send('gamerule ' + g);
    srv.send('time set 18000');
    srv.send('weather clear 1000000');
    srv.send('gamemode 0 ETIM_R7');
    await sleep(600);
    const probe = async (n) => {
      const f = mark();
      bot.chat(`/etest fishprobe type ${n}`);
      await sleep(900);
      const m = rows(f).map((l) => /type n=(\d+) cod=(\d+) salmon=(\d+) pos=(\S+) biome=(\S+)/.exec(l)).filter(Boolean)[0];
      return m ? { n: +m[1], cod: +m[2], salmon: +m[3], pos: m[4], biome: m[5] } : null;
    };
    const check = async (x, y, z, blk) => {
      const f = mark();
      srv.send(`testforblock ${x} ${y} ${z} minecraft:${blk}`);
      await sleep(400);
      return rows(f).filter((l) => /Successfully found|The block at/.test(l))[0] || null;
    };
    srv.send('tp ETIM_R7 2000.5 63.5 2000.5');
    await sleep(500);
    srv.send('tp ETIM_R7 2000.5 63.5 2000.5');
    await sleep(120);
    log('base', JSON.stringify(await probe(200)));
    log('block 2000,61,2000 =', await check(2000, 61, 2000, 'water'));
    srv.send('setblock 2001 61 2000 minecraft:sand 0');
    await sleep(300);
    log('after setblock 2001,61 =', await check(2001, 61, 2000, 'sand'));
    srv.send('tp ETIM_R7 2000.5 63.5 2000.5');
    await sleep(120);
    log('probe with sand at 2001', JSON.stringify(await probe(200)));
    srv.send('setblock 2000 61 2000 minecraft:sand 0');
    await sleep(300);
    log('after setblock 2000,61 =', await check(2000, 61, 2000, 'sand'));
    srv.send('tp ETIM_R7 2000.5 63.5 2000.5');
    await sleep(120);
    log('probe with sand below', JSON.stringify(await probe(200)));
    srv.send('setblock 2000 63 2000 minecraft:dirt 0');
    await sleep(300);
    srv.send('tp ETIM_R7 2000.5 64.5 2000.5');
    await sleep(120);
    log('probe with dirt at feet', JSON.stringify(await probe(200)));
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) {}
    try { if (!srv.exited) await srv.stop(); } catch (e) {}
    setCfg(CFG, 'fishingDebugLog', 'false');
    fs.writeFileSync(PROPS, propsBefore);
  }
  process.exit(0);
})().catch((e) => { log('FATAL', e && e.stack); process.exit(1); });
