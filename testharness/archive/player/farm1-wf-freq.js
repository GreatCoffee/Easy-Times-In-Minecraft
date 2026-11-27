#!/usr/bin/env node
/**
 * farm1-wf-freq.js — W-F 频率窗（同 HEAD 同钉值，独立 boot）：W-F6 + W-F11
 *
 * W-F6  fertility L1 镰收小麦 N=200 → pass ≈ 0.2（±3σ 二项带）
 * W-F11 harvesting L5 镰收小麦 N=200 → extra>0 ≈ 0.5（±3σ），fraction=1.00/factor=0.50/base=1
 * W-F11 harvesting L5 锄收胡萝卜 N=60 → base 带 + extra ≤ base（per-item）
 *
 * 站桩 5×5 逐轮重建（bot 不动，免 /tp 反作弊拉回）；每轮 8 环位 dig。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'farm1-wf-freq';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const WORLD = 'farm1freq';
const PORT = 25565;
const BOT = 'ETIM_FQ';
const PIN = {
  head: 'e15795f',
  rel: { bytes: 864429, sha: '605F2A587ACCC0D14B2035ED6432500FBD1583E3D3C712FC4E73760FD0EEA376' },
  dev: { bytes: 847186, sha: '49C18E2C066B173A6409D4E6E2F2DE87ED49F026771774AFB4D308668E2EAD16' },
  src: { bytes: 793694, sha: '9AC86EF73DD0E24B5CFA5F7DCD58810F74AC4D5356BDB05DF9DCFDE307F06307' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, t.replace(new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm'), (m, p1) => p1 + v), 'utf8');
}
function pinOf(file, pin, label) {
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}
function binomBand(p, n) {
  const s = Math.sqrt(Math.max(p * (1 - p), 1e-9) / n);
  return { p, n, lo: +(Math.max(0, p - 3 * s)).toFixed(4), hi: +(Math.min(1, p + 3 * s)).toFixed(4) };
}
const RE = {
  harvest: /\[FarmLog\] fertility harvest tool=(\S+) crop=(\S+) lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
  hrow: /\[FarmLog\] harvesting crop=(\S+) lvl=(\d+) fraction=([\d.]+) factor=([\d.]+) base=(\d+) extra=(\d+) pos=([-\d,]+)/,
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, window: 'W-F 频率窗（W-F6 + W-F11）', startedAt: new Date().toISOString(), pins: {} };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + ev.headOk + ' jars=' + [ev.pins.devJar.ok, ev.pins.relJar.ok, ev.pins.srcJar.ok].join('/'));
  if (!ev.headOk) throw new Error('HEAD mismatch');

  const cfgBefore = fs.readFileSync(CFG);
  const propsBefore = fs.readFileSync(PROPS);
  ev.cfgSnap = { bytes: cfgBefore.length, sha: sha256(cfgBefore) };
  setCfg(CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let bx = 0, by = 0, bz = 0;
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no boot');
    const idm = /ids=([\d\s]+)/.exec(srv.all.map(strip).find((l) => /\bids=/.test(l)) || '');
    const ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
    ev.ids = { all: ids, fertility: ids[8], harvesting: ids[9] };
    log('ids', JSON.stringify(ev.ids));

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false', 'keepInventory true']) srv.send('gamerule ' + g);
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    await sleep(700);
    const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
    bx = Math.floor(p0.x); by = Math.floor(p0.y); bz = Math.floor(p0.z);
    srv.send(`fill ${bx - 6} ${by - 1} ${bz - 6} ${bx + 6} ${by - 1} ${bz + 6} minecraft:stone 0`);
    srv.send(`fill ${bx - 6} ${by} ${bz - 6} ${bx + 6} ${by + 4} ${bz + 6} minecraft:air 0`);
    await sleep(1800);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1200);
    ev.arena = { bx, by, bz };
    log('arena', JSON.stringify(ev.arena));

    const ring = [];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) ring.push({ x: bx + dx, y: by, z: bz + dz });
    const stage = (item, nbt) => srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0 ${nbt}`);
    const rowsSince = (from) => srv.all.slice(from).map(strip);

    const runArm = async ({ label, crop, meta, tool, nbt, n }) => {
      let digs = 0, rounds = 0;
      const from = srv.all.length;
      while (digs < n && rounds < 40) {
        srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:farmland 0`);
        srv.send(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by} ${bz + 2} ${crop} ${meta}`);
        await sleep(900);
        srv.send(`clear ${BOT}`);
        stage(tool, nbt);
        await sleep(300);
        for (const p of ring) {
          if (digs >= n) break;
          srv.send(`etest dig ${p.x} ${p.y} ${p.z} ${BOT}`);
          digs++;
        }
        await sleep(2600);
        srv.send('kill @e[type=item]');
        srv.send(`etest food 20 20 ${BOT}`);
        srv.send(`etest health 20 ${BOT}`);
        rounds++;
        log(label, `round=${rounds} digs=${digs}`);
      }
      await sleep(700);
      return { from, digs, rounds };
    };

    /* W-F6：fertility L1 镰收小麦 N=200 */
    {
      const res = await runArm({ label: 'wf6-round', crop: 'minecraft:wheat', meta: 7,
        tool: 'etim:scythe_copper', nbt: `{ench:[{id:${ev.ids.fertility},lvl:1}]}`, n: 200 });
      const rows = rowsSince(res.from).map((l) => RE.harvest.exec(l)).filter(Boolean)
        .map((m) => ({ tool: m[1], crop: m[2], lvl: +m[3], need: +m[5], pass: m[6] === 'true' }));
      const pass = rows.filter((r) => r.pass).length;
      const rate = pass / Math.max(rows.length, 1);
      const band = binomBand(0.2, 200);
      ev.wf6 = { digs: res.digs, rounds: res.rounds, rows: rows.length, pass, rate: +rate.toFixed(4), band,
        needSet: [...new Set(rows.map((r) => r.need))], tools: [...new Set(rows.map((r) => r.tool))],
        crops: [...new Set(rows.map((r) => r.crop))] };
      ev.wf6.ok = rows.length >= 195 && rate >= band.lo && rate <= band.hi;
      log('wf6', JSON.stringify(ev.wf6));
    }

    /* W-F11 小麦：harvesting L5 镰 N=200 */
    {
      const res = await runArm({ label: 'wf11-wheat-round', crop: 'minecraft:wheat', meta: 7,
        tool: 'etim:scythe_copper', nbt: `{ench:[{id:${ev.ids.harvesting},lvl:5}]}`, n: 200 });
      const rows = rowsSince(res.from).map((l) => RE.hrow.exec(l)).filter(Boolean)
        .map((m) => ({ crop: m[1], lvl: +m[2], fraction: +m[3], factor: +m[4], base: +m[5], extra: +m[6] }));
      const wheat = rows.filter((r) => r.crop === 'minecraft:wheat');
      const extraHit = wheat.filter((r) => r.extra > 0).length;
      const rate = extraHit / Math.max(wheat.length, 1);
      const band = binomBand(0.5, 200);
      ev.wf11wheat = { digs: res.digs, rounds: res.rounds, rows: wheat.length, extraHit, rate: +rate.toFixed(4), band,
        fractionSet: [...new Set(wheat.map((r) => r.fraction))], factorSet: [...new Set(wheat.map((r) => r.factor))],
        baseSet: [...new Set(wheat.map((r) => r.base))],
        extraMax: wheat.length ? Math.max(...wheat.map((r) => r.extra)) : null };
      ev.wf11wheat.ok = wheat.length >= 195 && rate >= band.lo && rate <= band.hi
        && ev.wf11wheat.fractionSet.length === 1 && ev.wf11wheat.fractionSet[0] === 1
        && ev.wf11wheat.factorSet.length === 1 && ev.wf11wheat.factorSet[0] === 0.5;
      log('wf11-wheat', JSON.stringify(ev.wf11wheat));
    }

    /* W-F11 胡萝卜：harvesting L5 锄 N=60 */
    {
      const res = await runArm({ label: 'wf11-carrot-round', crop: 'minecraft:carrots', meta: 7,
        tool: 'etim:hoe_copper', nbt: `{ench:[{id:${ev.ids.harvesting},lvl:5}]}`, n: 60 });
      const rows = rowsSince(res.from).map((l) => RE.hrow.exec(l)).filter(Boolean)
        .map((m) => ({ crop: m[1], base: +m[5], extra: +m[6] }));
      const carrot = rows.filter((r) => r.crop === 'minecraft:carrots');
      ev.wf11carrot = { digs: res.digs, rows: carrot.length,
        baseSet: [...new Set(carrot.map((r) => r.base))].sort((a, b) => a - b),
        extraMax: carrot.length ? Math.max(...carrot.map((r) => r.extra)) : null,
        extraGtBase: carrot.filter((r) => r.extra > r.base).length,
        extraHit: carrot.filter((r) => r.extra > 0).length,
        perItemRates: Object.fromEntries([...new Set(carrot.map((r) => r.base))].sort((a, b) => a - b)
          .map((b) => [b, +((carrot.filter((r) => r.base === b && r.extra > 0).length
            / Math.max(carrot.filter((r) => r.base === b).length, 1)).toFixed(3))])) };
      log('wf11-carrot', JSON.stringify(ev.wf11carrot));
    }

    ev.rowCounts = {
      farm: srv.all.filter((l) => /\[FarmLog\]/.test(l)).length,
      mining: srv.all.filter((l) => /\[MiningLog\]/.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));
    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    fs.writeFileSync(CFG, cfgBefore);
    setCfg(CFG, 'farmDebugLog', 'false');
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
    fs.writeFileSync(PROPS, propsBefore);
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(d);
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'), srcJar: pinOf(SRCJAR, PIN.src, 'src') };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
