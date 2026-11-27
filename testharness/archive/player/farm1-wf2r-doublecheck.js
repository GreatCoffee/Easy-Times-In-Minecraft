#!/usr/bin/env node
/**
 * farm1-wf2r-doublecheck.js — B-1 修复的**双计排除**臂（非独立判窗，R5 补证）：
 *   ETIM 三族各自 override onBlockDestroyed（不调 super）⇒ MixinItem 的 base TAIL 不可达；
 *   本臂用日志正面核讫：ETIM 锄/镰 各 3 刀，每刀**恰 1 行** fertility harvest（不是 2 行）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'farm1-wf2r-doublecheck';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const WORLD = 'farm1wf2rd';
const BOT = 'ETIM_R4';

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
  hrow: /\[FarmLog\] harvesting crop=(\S+) lvl=(\d+) fraction=([\d.]+) factor=([\d.]+) base=(\d+) extra=(\d+) pos=([-\d,]+)/,
};

async function main() {
  const ev = { tag: TAG, window: 'B-1 双计排除臂（ETIM 三族 base TAIL 不可达）', startedAt: new Date().toISOString(), arms: [] };
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
    const idLine = srv.all.map(strip).find((l) => /ids=/.test(l)) || '';
    const idm = /ids=([\d\s]+)/.exec(idLine);
    const ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
    ev.ids = { fertility: ids && ids[8], harvesting: ids && ids[9] };

    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'keepInventory true', 'randomTickSpeed 3']) srv.send('gamerule ' + g);
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    await sleep(700);
    const p0 = bot.entity.position;
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 8} ${by - 2} ${bz - 8} ${bx + 8} ${by - 2} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by - 1} ${bz - 8} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by} ${bz - 8} ${bx + 8} ${by + 5} ${bz + 8} minecraft:air 0`);
    await sleep(1900);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1200);

    const spots = [{ x: bx + 1, z: bz }, { x: bx, z: bz + 1 }, { x: bx - 1, z: bz }, { x: bx, z: bz - 1 }];
    const arms = [
      { id: 'etim-hoe-carrot-L5', tool: 'etim:hoe_copper', crop: 'minecraft:carrots', meta: 7, n: 3, row: 'harvest' },
      { id: 'etim-scythe-wheat-L5', tool: 'etim:scythe_copper', crop: 'minecraft:wheat', meta: 7, n: 3, row: 'harvest' },
      { id: 'etim-mattock-potato-L5', tool: 'etim:mattock_copper', crop: 'minecraft:potatoes', meta: 7, n: 3, row: 'harvest' },
      { id: 'etim-scythe-wheat-harvL5', tool: 'etim:scythe_copper', crop: 'minecraft:wheat', meta: 7, n: 3, row: 'hrow', nbt: 'harv' },
    ];
    for (const arm of arms) {
      srv.send(`clear ${BOT}`);
      const nbt = arm.nbt === 'harv'
        ? `{ench:[{id:${ev.ids.harvesting},lvl:5}]}`
        : `{ench:[{id:${ev.ids.fertility},lvl:5}]}`;
      srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${arm.tool} 1 0 ${nbt}`);
      await sleep(500);
      const from = srv.all.length;
      for (let i = 0; i < arm.n; i++) {
        const p = spots[i];
        srv.send(`setblock ${p.x} ${by} ${p.z} minecraft:air 0`);
        await sleep(200);
        srv.send(`setblock ${p.x} ${by - 1} ${p.z} minecraft:farmland 0`);
        await sleep(200);
        srv.send(`setblock ${p.x} ${by} ${p.z} ${arm.crop} ${arm.meta}`);
        await sleep(300);
        srv.send(`etest dig ${p.x} ${by} ${p.z} ${BOT}`);
        await sleep(3000);
      }
      const seg = srv.all.slice(from).map(strip);
      const fert = seg.map((l) => RE.harvest.exec(l)).filter(Boolean)
        .map((m) => ({ tool: m[1], crop: m[2], lvl: +m[3], pass: m[6] === 'true', pos: m[7] }));
      const hrow = seg.map((l) => RE.hrow.exec(l)).filter(Boolean)
        .map((m) => ({ crop: m[1], lvl: +m[2], base: +m[5], extra: +m[6], pos: m[7] }));
      const row = {
        id: arm.id, tool: arm.tool, crop: arm.crop, digs: arm.n,
        fertRows: fert.length, hrowRows: hrow.length,
        perDigMaxFert: (() => {
          const c = {};
          for (const f of fert) c[f.pos] = (c[f.pos] || 0) + 1;
          return Math.max(0, ...Object.values(c));
        })(),
        samples: arm.row === 'harv' ? hrow.slice(0, 3) : fert.slice(0, 3),
      };
      ev.arms.push(row);
      log('arm', `${arm.id}: digs=${row.digs} fertRows=${row.fertRows} hrowRows=${row.hrowRows} perPosMax=${row.perDigMaxFert}`);
      srv.send('kill @e[type=item]');
      srv.send(`etest food 20 20 ${BOT}`);
      srv.send(`etest health 20 ${BOT}`);
      await sleep(400);
    }
    ev.noDouble = ev.arms.filter((a) => a.id !== 'etim-scythe-wheat-harvL5')
      .every((a) => a.fertRows === a.digs && a.perDigMaxFert === 1)
      && ev.arms.find((a) => a.id === 'etim-scythe-wheat-harvL5').hrowRows === 3;
    log('noDouble', ev.noDouble);

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
