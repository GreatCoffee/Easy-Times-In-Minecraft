'use strict';
/* f5-worm4.js — W-FF7 青草蚯蚓四臂（4 假人并行挖掘；单臂 N=400） */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const { Vec3 } = require('vec3');
const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const TAG = 'f5-wb-worm';
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
const NAMES = ['ETIM_R7', 'ETIM_R8', 'ETIM_R9', 'ETIM_R10'];
(async () => {
  const ev = { tag: TAG, startedAt: new Date().toISOString(), arms: [] };
  ev.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.headOk = ev.head.startsWith('895fc1e');
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  setCfg(CFG, 'fishingDebugLog', 'true');
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', 'f5wb'), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  const bots = [];
  const mark = () => srv.all.length;
  const rows = (f) => srv.all.slice(f).map(strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    await sleep(1500);
    for (const name of NAMES) {
      const b = await createHarnBot({ host: '127.0.0.1', port: 25565, username: name });
      try { b.removeAllListeners('message'); } catch (e) {}
      try { b.physics.enabled = false; } catch (e) {}
      bots.push(b);
      await sleep(400);
    }
    srv.send('op ETIM_R7');
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doDaylightCycle false', 'doWeatherCycle false', 'randomTickSpeed 0',
      'naturalRegeneration false', 'doMobLoot true']) srv.send('gamerule ' + g);
    srv.send('time set 18000');
    srv.send('weather clear 1000000');
    for (const n of NAMES) { srv.send(`gamemode 0 ${n}`); srv.send(`etest food 20 20 ${n}`); srv.send(`etest health 20 ${n}`); }
    await sleep(900);
    const p0 = bots[0].entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 9} ${by - 3} ${bz - 9} ${bx + 9} ${by + 8} ${bz + 9} minecraft:air 0`);
    srv.send(`fill ${bx - 9} ${by - 1} ${bz - 9} ${bx + 9} ${by - 1} ${bz + 9} minecraft:stone 0`);
    const quad = [[-3, -3], [-3, 3], [3, -3], [3, 3]];
    for (let i = 0; i < 4; i++) srv.send(`tp ${NAMES[i]} ${bx + quad[i][0] + 0.5} ${by} ${bz + quad[i][1] + 0.5}`);
    await sleep(2000);
    const fortuneId = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8')).regAll['minecraft:fortune'].id;
    const spotsOf = (i) => {
      const [cx, cz] = quad[i];
      const out = [];
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) out.push({ x: bx + cx + dx, y: by - 1, z: bz + cz + dz });
      return out;
    };
    const stageArm = (fortune) => {
      const nbt = fortune > 0 ? `{ench:[{id:${fortuneId},lvl:${fortune}}]}` : '';
      for (const n of NAMES) {
        srv.send(`clear ${n}`);
        srv.send(`replaceitem entity ${n} slot.weapon.mainhand etim:shovel_copper 1 0 ${nbt}`);
        srv.send(`etest food 20 20 ${n}`);
      }
    };
    const runArm = async (id, rain, fortune, n) => {
      srv.send(`weather ${rain ? 'rain' : 'clear'} 1000000`);
      stageArm(fortune);
      await sleep(1000);
      const from = mark();
      const t0 = Date.now();
      let rounds = 0;
      while (true) {
        const seg = rows(from).filter((l) => /\[FishLog\] worm /.test(l));
        if (seg.length >= n) break;
        if (Date.now() - t0 > 900000) break;
        /* 四象限铺草 */
        for (let i = 0; i < 4; i++) {
          const [cx, cz] = quad[i];
          srv.send(`fill ${bx + cx - 2} ${by - 1} ${bz + cz - 2} ${bx + cx + 2} ${by - 1} ${bz + cz + 2} minecraft:grass 0`);
        }
        await sleep(260);
        await Promise.all(bots.map(async (b, i) => {
          for (const s of spotsOf(i)) {
            const blk = b.blockAt(new Vec3(s.x, s.y, s.z));
            if (blk && blk.name === 'grass') {
              try { await b.dig(blk, true); } catch (e) { /* skip */ }
            }
          }
        }));
        rounds++;
        if (rounds % 2 === 0) {
          for (const nm of NAMES) srv.send(`etest food 20 20 ${nm}`);
          log('progress', `${id} rows=${seg.length}/${n} rounds=${rounds} ${Math.round((Date.now() - t0) / 1000)}s`);
        }
      }
      const seg = rows(from).filter((l) => /\[FishLog\] worm /.test(l));
      const parsed = seg.map((l) => /\[FishLog\] worm denom=(\d+) f=(\d+) rain=(\d) hit=(\d)/.exec(l)).filter(Boolean)
        .map((m) => ({ denom: +m[1], f: +m[2], rain: +m[3], hit: +m[4] }));
      const arm = {
        id, rain, fortune, n: parsed.length, hits: parsed.filter((p) => p.hit === 1).length,
        rate: +(parsed.filter((p) => p.hit === 1).length / Math.max(parsed.length, 1)).toFixed(4),
        denom: [...new Set(parsed.map((p) => p.denom))], f: [...new Set(parsed.map((p) => p.f))],
        rainSet: [...new Set(parsed.map((p) => p.rain))], rounds,
        elapsedSec: Math.round((Date.now() - t0) / 1000), line: `${from + 1}-${srv.all.length}`,
      };
      ev.arms.push(arm);
      log('arm', JSON.stringify(arm));
      return arm;
    };
    await runArm('clear-f0', 0, 0, 400);
    await runArm('rain-f0', 1, 0, 400);
    await runArm('rain-f1', 1, 1, 400);
    await runArm('rain-f3', 1, 3, 400);
    srv.send('weather clear 1000000');
    await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    for (const b of bots) { try { b.quit(); } catch (e) {} }
    try { if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); } } catch (e) { ev.stopError = String(e && e.message); }
    setCfg(CFG, 'fishingDebugLog', 'false');
    fs.writeFileSync(PROPS, propsBefore);
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
})().catch((e) => { log('FATAL', e && e.stack); process.exit(1); });
