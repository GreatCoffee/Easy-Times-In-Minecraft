#!/usr/bin/env node
/**
 * farm1-wf-consume.js — W-F9 消耗清位链（同 HEAD 同钉值，临时 cfg 翻转臂：fertilizedConsumeDivisor=2）
 *
 * 判点：fertilized clear 行 divisor=2、roll∈{0,1}、cleared ⇔ roll==0；每个 cleared=true 的位
 *       之后 growth 行应停（TE 已被清为 false）；收尾把 divisor 回 256、gate 回 false。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'farm1-wf-consume';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const WORLD = 'farm1con';
const BOT = 'ETIM_CN';
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
  clear: /\[FarmLog\] fertilized clear pos=([-\d,]+) roll=(\d+) divisor=(\d+) cleared=(true|false)/,
  growth: /\[FarmLog\] growth pos=([-\d,]+) value=([\d.]+) base=([\d.]+) ratio=([\d.]+) factor=([\d.]+)/,
  set: /\[FarmLog\] fertilized set pos=([-\d,]+) value=(true|false)/,
};
async function main() {
  const ev = { tag: TAG, window: 'W-F9 consume（divisor=2 翻转臂）', startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith('e15795f');
  const dev = fs.readFileSync(DEVJAR);
  ev.devJar = { bytes: dev.length, sha: sha256(dev) };
  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore) };
  setCfg(CFG, 'farmDebugLog', 'true');
  setCfg(CFG, 'fertilizedConsumeDivisor', '2');
  ev.cfgFlipped = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');
  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('time set 6000');
    srv.send('weather clear');
    await sleep(700);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 8} ${by - 1} ${bz - 8} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by} ${bz - 8} ${bx + 8} ${by + 4} ${bz + 8} minecraft:air 0`);
    await sleep(1800);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1000);
    /* 5×5 施肥耕地（moisture 0 + TE）+ 麦；玻璃顶防雨 */
    srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:farmland 0 replace {EtimFertilized:1b}`);
    srv.send(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by} ${bz + 2} minecraft:wheat 0`);
    srv.send(`fill ${bx - 2} ${by + 2} ${bz - 2} ${bx + 2} ${by + 2} ${bz + 2} minecraft:glass 0`);
    await sleep(1200);
    srv.send('gamerule randomTickSpeed 400');
    const from = srv.all.length;
    for (let r = 0; r < 4; r++) {
      await sleep(7000);
      const seg = srv.all.slice(from).map(strip);
      log('round', JSON.stringify({ r: r + 1,
        growth: seg.filter((l) => RE.growth.test(l)).length,
        clear: seg.filter((l) => RE.clear.test(l)).length,
        cleared: seg.filter((l) => /cleared=true/.test(l)).length }));
      srv.send(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by} ${bz + 2} minecraft:wheat 0`);
      await sleep(400);
      if (seg.filter((l) => /cleared=true/.test(l)).length >= 12) break;
    }
    srv.send('gamerule randomTickSpeed 3');
    const lines = srv.all.slice(from);
    const consume = lines.map((l) => RE.clear.exec(l)).filter(Boolean)
      .map((m) => ({ pos: m[1], roll: +m[2], divisor: +m[3], cleared: m[4] === 'true' }));
    const clears = [];
    lines.forEach((l, i) => { const m = RE.clear.exec(l); if (m && m[4] === 'true') clears.push({ i, pos: m[1] }); });
    ev.consume = {
      rows: consume.length,
      divisorSet: [...new Set(consume.map((c) => c.divisor))],
      rollSet: [...new Set(consume.map((c) => c.roll))].sort((a, b) => a - b),
      cleared: consume.filter((c) => c.cleared).length,
      badClear: consume.filter((c) => c.cleared !== (c.roll === 0)).length,
      clearPositions: [...new Set(clears.map((c) => c.pos))],
      postClearGrowth: clears.map((c) => ({
        pos: c.pos,
        after: lines.slice(c.i + 1).filter((l) => {
          const m = RE.growth.exec(l); return m && m[1] === c.pos;
        }).length,
      })),
      sample: consume.slice(0, 5),
    };
    ev.consume.ok = ev.consume.divisorSet.length === 1 && ev.consume.divisorSet[0] === 2
      && ev.consume.badClear === 0 && ev.consume.cleared > 0
      && ev.consume.postClearGrowth.every((p) => p.after === 0);
    log('consume', JSON.stringify(ev.consume));
    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    fs.writeFileSync(CFG, cfgBefore);
    setCfg(CFG, 'farmDebugLog', 'false');
    setCfg(CFG, 'fertilizedConsumeDivisor', '256');
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      sameAsStart: sha256(fs.readFileSync(CFG)) === ev.cfgBefore.sha };
    fs.writeFileSync(PROPS, propsBefore);
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('done');
  }
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
