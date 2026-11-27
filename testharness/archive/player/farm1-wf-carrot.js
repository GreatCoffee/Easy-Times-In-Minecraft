#!/usr/bin/env node
/** farm1-wf-carrot.js — W-F11 胡萝卜臂（harvesting L5 锄，N=60，逐刀串行 dig） */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'farm1-wf-carrot';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const WORLD = 'farm1car';
const BOT = 'ETIM_CA';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, t.replace(new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm'), (m, p1) => p1 + v), 'utf8');
}
const RE = /\[FarmLog\] harvesting crop=(\S+) lvl=(\d+) fraction=([\d.]+) factor=([\d.]+) base=(\d+) extra=(\d+) pos=([-\d,]+)/;
async function main() {
  const ev = { tag: TAG, startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith('e15795f');
  const dev = fs.readFileSync(DEVJAR);
  ev.devJar = { bytes: dev.length, sha: sha256(dev) };
  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  setCfg(CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    const idm = /ids=([\d\s]+)/.exec(srv.all.map(strip).find((l) => /\bids=/.test(l)) || '');
    const ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
    ev.ids = { harvesting: ids[9] };
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule keepInventory true');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    await sleep(700);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    srv.send(`fill ${bx - 6} ${by - 1} ${bz - 6} ${bx + 6} ${by - 1} ${bz + 6} minecraft:stone 0`);
    srv.send(`fill ${bx - 6} ${by} ${bz - 6} ${bx + 6} ${by + 4} ${bz + 6} minecraft:air 0`);
    await sleep(1800);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1200);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 1} ${by - 1} ${bz - 1} ${bx + 1} ${by - 1} ${bz + 1} minecraft:farmland 0`);
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:hoe_copper 1 0 {ench:[{id:${ids[9]},lvl:5}]}`);
    await sleep(600);
    const ring = [];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) ring.push({ x: bx + dx, y: by, z: bz + dz });
    const from = srv.all.length;
    for (let i = 0; i < 60; i++) {
      const p = ring[i % ring.length];
      srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:carrots 7`);
      await sleep(220);
      srv.send(`etest dig ${p.x} ${p.y} ${p.z} ${BOT}`);
      await sleep(2900);
      if (i % 10 === 9) {
        srv.send('kill @e[type=item]');
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:hoe_copper 1 0 {ench:[{id:${ids[9]},lvl:5}]}`);
        srv.send(`etest food 20 20 ${BOT}`);
        srv.send(`etest health 20 ${BOT}`);
      }
      if (i % 10 === 0) log('carrot', `dig ${i + 1}/60`);
    }
    await sleep(800);
    const rows = srv.all.slice(from).map(strip).map((l) => RE.exec(l)).filter(Boolean)
      .map((m) => ({ crop: m[1], lvl: +m[2], fraction: +m[3], factor: +m[4], base: +m[5], extra: +m[6], pos: m[7] }));
    const carrot = rows.filter((r) => r.crop === 'minecraft:carrots');
    ev.carrot = {
      digs: 60, rows: carrot.length,
      baseSet: [...new Set(carrot.map((r) => r.base))].sort((a, b) => a - b),
      extraMax: carrot.length ? Math.max(...carrot.map((r) => r.extra)) : null,
      extraGtBase: carrot.filter((r) => r.extra > r.base).length,
      extraHit: carrot.filter((r) => r.extra > 0).length,
      fractionSet: [...new Set(carrot.map((r) => r.fraction))],
      factorSet: [...new Set(carrot.map((r) => r.factor))],
      perItemRates: Object.fromEntries([...new Set(carrot.map((r) => r.base))].sort((a, b) => a - b)
        .map((b) => [b, +((carrot.filter((r) => r.base === b && r.extra > 0).length
          / Math.max(carrot.filter((r) => r.base === b).length, 1)).toFixed(3))])),
    };
    log('result', JSON.stringify(ev.carrot));
    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    fs.writeFileSync(CFG, cfgBefore);
    setCfg(CFG, 'farmDebugLog', 'false');
    fs.writeFileSync(PROPS, propsBefore);
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('done');
  }
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
