#!/usr/bin/env node
/**
 * farm1-wf2r-freq.js — W-F2R · R4c 频率臂：vanilla iron_hoe + fertility L1 收胡萝卜 N=200
 * 判据：harvest 行 tool=minecraft:iron_hoe crop=minecraft:carrots need=0.2，pass 率 ∈ 3σ 带。
 * 逐刀串行（/etest dig 的 STOP 面按 per-player destroyPos，批量只保最后一个）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'farm1-wf2r-freq';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const WORLD = 'farm1wf2rf';
const BOT = 'ETIM_R2';
const N = 200;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
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
  harvest: /\[FarmLog\] fertility harvest tool=(\S+) crop=(\S+) lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
};
function binomBand(p, n) {
  const s = Math.sqrt(Math.max(p * (1 - p), 1e-9) / n);
  return { p, n, sigma: +s.toFixed(4), lo: +(Math.max(0, p - 3 * s)).toFixed(4), hi: +(Math.min(1, p + 3 * s)).toFixed(4) };
}

async function main() {
  const ev = { tag: TAG, window: 'W-F2R R4c 频率臂（vanilla iron_hoe / fertility L1 / carrot N=200）', startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith('0429e32');
  const dev = fs.readFileSync(DEVJAR);
  ev.devJar = { bytes: dev.length, sha: sha256(dev) };
  const cfgBefore = fs.readFileSync(CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore) };
  const propsBefore = fs.readFileSync(PROPS);
  setCfg(CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    const idLine = srv.all.map(strip).find((l) => /\bids=/.test(l)) || '';
    const idm = /ids=([\d\s]+)/.exec(idLine);
    const ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
    ev.ids = { fertility: ids && ids[8], harvesting: ids && ids[9] };
    log('ids', JSON.stringify(ev.ids));

    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'keepInventory true', 'randomTickSpeed 3']) srv.send('gamerule ' + g);
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    await sleep(800);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 8} ${by - 2} ${bz - 8} ${bx + 8} ${by - 2} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by - 1} ${bz - 8} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by} ${bz - 8} ${bx + 8} ${by + 5} ${bz + 8} minecraft:air 0`);
    await sleep(2000);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1400);
    srv.send(`fill ${bx - 1} ${by - 1} ${bz - 1} ${bx + 1} ${by - 1} ${bz + 1} minecraft:farmland 0`);
    await sleep(600);

    const ring = [];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) ring.push({ x: bx + dx, y: by, z: bz + dz });
    const stage = () => srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:iron_hoe 1 0 {ench:[{id:${ev.ids.fertility},lvl:1}]}`);
    srv.send(`clear ${BOT}`);
    stage();
    await sleep(500);

    const from = srv.all.length;
    const t0 = Date.now();
    let retries = 0, misses = 0;
    const digOnce = async (p) => {
      const posKey = `${p.x},${p.y},${p.z}`;
      srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:carrots 7`);
      await sleep(240);
      const cut = srv.all.length;
      srv.send(`etest dig ${p.x} ${p.y} ${p.z} ${BOT}`);
      await sleep(2700);
      const hit = srv.all.slice(cut).map(strip)
        .some((l) => RE.harvest.test(l) && l.includes('pos=' + posKey));
      return hit;
    };
    for (let i = 0; i < N; i++) {
      const p = ring[i % ring.length];
      /* 落刀校验（纪律 9）：无 harvest 行 = 该刀未触达成熟作物 ⇒ 补一刀，保证 200 落刀 */
      let hit = await digOnce(p);
      if (!hit) { retries++; hit = await digOnce(p); }
      if (!hit) misses++;
      if (i % 50 === 49) {
        srv.send('kill @e[type=item]');
        srv.send(`clear ${BOT}`);
        stage();
        srv.send(`etest food 20 20 ${BOT}`);
        srv.send(`etest health 20 ${BOT}`);
        await sleep(500);
      }
      if (i % 20 === 19) log('dig', `${i + 1}/${N} elapsed=${Math.round((Date.now() - t0) / 1000)}s retries=${retries}`);
    }
    await sleep(1000);
    const rows = srv.all.slice(from).map(strip).map((l) => RE.harvest.exec(l)).filter(Boolean)
      .map((m) => ({ tool: m[1], crop: m[2], lvl: +m[3], need: +m[5], pass: m[6] === 'true' }));
    const carrot = rows.filter((r) => r.crop === 'minecraft:carrots' && r.tool === 'minecraft:iron_hoe');
    const pass = carrot.filter((r) => r.pass).length;
    const rate = pass / Math.max(carrot.length, 1);
    const band = binomBand(0.2, N);
    ev.freq = {
      digs: N, retries, misses, rows: carrot.length, pass, rate: +rate.toFixed(4), band,
      needSet: [...new Set(carrot.map((r) => r.need))], lvlSet: [...new Set(carrot.map((r) => r.lvl))],
      toolSet: [...new Set(carrot.map((r) => r.tool))], allRows: rows.length,
      elapsedSec: Math.round((Date.now() - t0) / 1000),
    };
    ev.freq.ok = carrot.length >= 195 && rate >= band.lo && rate <= band.hi
      && ev.freq.needSet.length === 1 && ev.freq.needSet[0] === 0.2 && ev.freq.lvlSet[0] === 1;
    log('freq', JSON.stringify(ev.freq));

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    setCfg(CFG, 'farmDebugLog', 'false');
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      sameAsStart: sha256(fs.readFileSync(CFG)) === ev.cfgBefore.sha };
    fs.writeFileSync(PROPS, propsBefore);
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(d);
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
