#!/usr/bin/env node
/**
 * farm1-wf2r-consume.js — W-F2R · R3b 消耗翻转臂（A-1 修后重验）：
 *   cfg fertilizedConsumeDivisor=2 → 5×5 施肥耕地 + 麦，清位后 growth 全 0；
 *   清位后踩踏 → allow 行（fertilized=false）；收窗 divisor 回 256、gate 回 false，cfg sha 回基线。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'farm1-wf2r-consume';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const WORLD = 'farm1wf2rc';
const BOT = 'ETIM_R3';

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
  clear: /\[FarmLog\] fertilized clear pos=([-\d,]+) roll=(\d+) divisor=(\d+) cleared=(true|false)/,
  growth: /\[FarmLog\] growth pos=([-\d,]+) value=([\d.]+) base=([\d.]+) ratio=([\d.]+) factor=([\d.]+)/,
  deny: /\[FarmLog\] fertilized trample-deny pos=([-\d,]+) entity=/,
  allow: /\[FarmLog\] trample allow pos=([-\d,]+) fertilized=false entity=/,
};

async function main() {
  const ev = { tag: TAG, window: 'W-F2R R3b（divisor=2 翻转臂 + 清位后 allow）', startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith('0429e32');
  const dev = fs.readFileSync(DEVJAR);
  ev.devJar = { bytes: dev.length, sha: sha256(dev) };
  const cfgBefore = fs.readFileSync(CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore) };
  const propsBefore = fs.readFileSync(PROPS);
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
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'keepInventory true', 'mobGriefing true', 'randomTickSpeed 400']) srv.send('gamerule ' + g);
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
    srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:farmland 0 replace {EtimFertilized:1b}`);
    srv.send(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by} ${bz + 2} minecraft:wheat 0`);
    srv.send(`fill ${bx - 2} ${by + 2} ${bz - 2} ${bx + 2} ${by + 2} ${bz + 2} minecraft:glass 0`);
    await sleep(1200);

    const from = srv.all.length;
    for (let r = 0; r < 5; r++) {
      await sleep(7000);
      const seg = srv.all.slice(from).map(strip);
      const cleared = seg.filter((l) => RE.clear.test(l) && /cleared=true/.test(l)).length;
      log('round', JSON.stringify({ r: r + 1,
        growth: seg.filter((l) => RE.growth.test(l)).length,
        clear: seg.filter((l) => RE.clear.test(l)).length, cleared }));
      srv.send(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by} ${bz + 2} minecraft:wheat 0`);
      await sleep(400);
      if (cleared >= 12) break;
    }
    srv.send('gamerule randomTickSpeed 3');

    const lines = srv.all.slice(from);
    const plain = lines.map(strip);
    const consume = plain.map((l) => RE.clear.exec(l)).filter(Boolean)
      .map((m) => ({ pos: m[1], roll: +m[2], divisor: +m[3], cleared: m[4] === 'true' }));
    const clears = [];
    lines.forEach((l, i) => { const m = RE.clear.exec(strip(l)); if (m && m[4] === 'true') clears.push({ i, pos: m[1] }); });
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
          const m = RE.growth.exec(strip(l)); return m && m[1] === c.pos;
        }).length,
      })),
      sample: consume.slice(0, 5),
    };
    ev.consume.ok = ev.consume.divisorSet.length === 1 && ev.consume.divisorSet[0] === 2
      && ev.consume.badClear === 0 && ev.consume.cleared > 0
      && ev.consume.postClearGrowth.every((p) => p.after === 0);
    log('consume', JSON.stringify({ rows: ev.consume.rows, divisor: ev.consume.divisorSet, rolls: ev.consume.rollSet,
      cleared: ev.consume.cleared, bad: ev.consume.badClear,
      postClearAllZero: ev.consume.postClearGrowth.every((p) => p.after === 0), ok: ev.consume.ok }));

    /* 清位后踩踏 → allow（fertilized=false，TE 仍在但不施肥） */
    const target = ev.consume.clearPositions[0];
    if (target) {
      const [tx, ty, tz] = target.split(',').map(Number);
      /* 玻璃顶在 by+2（防雨保湿）——踩踏前先开天窗，否则牛落在玻璃上 */
      srv.send(`setblock ${tx} ${by + 2} ${tz} minecraft:air 0`);
      srv.send(`setblock ${tx} ${by} ${tz} minecraft:air 0`);
      await sleep(500);
      const trFrom = srv.all.length;
      srv.send(`summon minecraft:cow ${tx + 0.5} ${by + 4} ${tz + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["r3"]}`);
      await sleep(4500);
      ev.clearedTrample = {
        pos: target,
        allow: srv.all.slice(trFrom).map(strip).filter((l) => RE.allow.test(l) && l.includes('pos=' + target)),
        deny: srv.all.slice(trFrom).map(strip).filter((l) => RE.deny.test(l) && l.includes('pos=' + target)),
      };
      log('clearedTrample', JSON.stringify(ev.clearedTrample));
      srv.send('kill @e[type=cow]');
      await sleep(600);
    }

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    setCfg(CFG, 'farmDebugLog', 'false');
    setCfg(CFG, 'fertilizedConsumeDivisor', '256');
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
