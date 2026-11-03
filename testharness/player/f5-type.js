'use strict';
/* f5-type.js — W-FF6 鱼种三分支（洋净 / 洋脏 / 非洋）＋ W-FF6 位置面 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const TAG = process.argv[2] === 'zero' ? 'f5-wb-type-zero' : 'f5-wb-type';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
}
const RE = {
  type: /\[FishLog\] type n=(\d+) cod=(\d+) salmon=(\d+) pos=BlockPos\{[^}]*\} biome=(\S+)/,
  typeRaw: /\[FishLog\] type n=(\d+) cod=(\d+) salmon=(\d+) pos=(\S+)/,
};
(async () => {
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
  ev.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.headOk = ev.head.startsWith('895fc1e');
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  const ZERO = process.argv[2] === 'zero';
  setCfg(CFG, 'fishingDebugLog', 'true');
  if (ZERO) setCfg(CFG, 'fishingLargeFishChance', '0.0');
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', 'f5wb'), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(strip);
  const probe = async (n, ms) => {
    const from = mark();
    bot.chat(`/etest fishprobe type ${n}`);
    await sleep(ms || 900);
    const seg = rowsFrom(from);
    const m = seg.map((l) => RE.type.exec(l)).filter(Boolean)[0];
    if (m) return { n: +m[1], cod: +m[2], salmon: +m[3], biome: m[4] };
    const r = seg.map((l) => RE.typeRaw.exec(l)).filter(Boolean)[0];
    return r ? { n: +r[1], cod: +r[2], salmon: +r[3], pos: r[4], biome: null } : null;
  };
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
    srv.send('etest health 20 ETIM_R7');
    await sleep(700);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    const mainEv = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8'));
    /* 本世界出生点（main 窗 join 位 -65.5,68,248.5，plains）；arena 未落盘时用该常量 */
    const land = (mainEv && mainEv.arena) || { bx: -66, by: 68, bz: 248 };
    /* 清上一轮诊断残留（(2000,63,2000) dirt / (2001,61,2000) 沙） */
    srv.send('setblock 2000 63 2000 minecraft:air 0');
    srv.send('setblock 2001 61 2000 minecraft:water 0');
    await sleep(400);

    /* 非洋臂（主窗战场 = plains 陆地） */
    srv.send(`tp ETIM_R7 ${land.bx + 0.5} ${land.by} ${land.bz + 0.5}`);
    await sleep(700);
    ev.land = await probe(1000);
    log('land', JSON.stringify(ev.land));

    /* 洋面扫描：y=200 读 biome（n=1），找到 ocean 后到水面 y=63.5 做 1000 次 */
    const cands = [[2000, 2000], [-2000, 2000], [2000, -2000], [0, -4000], [-4000, 0], [4000, 4000], [-4000, -4000], [6000, 0]];
    ev.scan = [];
    let clean = null;
    for (const [x, z] of cands) {
      srv.send(`tp ETIM_R7 ${x + 0.5} 200 ${z + 0.5}`);
      await sleep(700);
      const t = await probe(1, 700);
      ev.scan.push({ x, z, biome: t ? t.biome : null, salmon1: t ? t.salmon : null });
      log('scan', `${x},${z} biome=${t ? t.biome : 'null'}`);
      if (t && /ocean/i.test(t.biome || '')) {
        /* 水面位（低延迟：tp 后 120ms 内发探测，避免下沉） */
        srv.send(`tp ETIM_R7 ${x + 0.5} 63.5 ${z + 0.5}`);
        await sleep(120);
        const w = await probe(1000, 900);
        log('ocean', `${x},${z} ${JSON.stringify(w)}`);
        if (w && w.salmon >= 150 && w.salmon <= 250) { clean = { x, z, w }; break; }
        if (!ev.oceanFirst) ev.oceanFirst = { x, z, w };
      }
    }
    if (!clean && ev.oceanFirst) clean = ev.oceanFirst;
    ev.clean = clean ? clean.w : null;
    ev.cleanAt = clean ? { x: clean.x, z: clean.z } : null;
    /* 脏洋臂：同点放沙（dy -3..0 内） */
    if (clean) {
      srv.send(`setblock ${clean.x + 1} 61 ${clean.z} minecraft:dirt 0`);
      await sleep(300);
      srv.send(`tp ETIM_R7 ${clean.x + 0.5} 63.5 ${clean.z + 0.5}`);
      await sleep(120);
      ev.dirty = await probe(1000, 900);
      log('dirty', JSON.stringify(ev.dirty));
      srv.send(`setblock ${clean.x + 1} 61 ${clean.z} minecraft:water 0`);
    }
    ev.landAgain = await (async () => {
      srv.send(`tp ETIM_R7 ${land.bx + 0.5} ${land.by} ${land.bz + 0.5}`);
      await sleep(700);
      return probe(1000);
    })();
    log('landAgain', JSON.stringify(ev.landAgain));
    await srv.stop();
  } finally {
    try { if (bot) bot.quit(); } catch (e) {}
    try { if (!srv.exited) await srv.stop(); } catch (e) {}
    setCfg(CFG, 'fishingDebugLog', 'false');
    if (ZERO) setCfg(CFG, 'fishingLargeFishChance', '0.2');
    fs.writeFileSync(PROPS, propsBefore);
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
})().catch((e) => { log('FATAL', e && e.stack); process.exit(1); });
