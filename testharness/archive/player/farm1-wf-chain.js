#!/usr/bin/env node
/** farm1-wf-chain.js — W-F7 置位/持窗链（同 HEAD 同钉值）：till → set → deny → 破块 → 重放 → allow */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'farm1-wf-chain';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const WORLD = 'farm1chn';
const BOT = 'ETIM_CH';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (t, ...a) => console.log(`[${new Date().toISOString().slice(11, 23)}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  fs.writeFileSync(file, t.replace(new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm'), (m, p1) => p1 + v), 'utf8');
}
const RE = {
  till: /\[FarmLog\] fertility tillage lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
  set: /\[FarmLog\] fertilized set pos=([-\d,]+) value=(true|false)/,
  deny: /\[FarmLog\] fertilized trample-deny pos=([-\d,]+) entity=/,
  allow: /\[FarmLog\] trample allow pos=([-\d,]+) fertilized=false entity=/,
};
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
    ev.ids = { fertility: ids[8] };
    bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule keepInventory true');
    srv.send('gamerule mobGriefing true');
    srv.send('difficulty 2');
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
    const T = { x: bx + 2, y: by, z: bz - 2 };
    ev.pos = T;
    const tf = async (x, y, z, block) => {
      const from = srv.all.length;
      srv.send(`testforblock ${x} ${y} ${z} ${block}`);
      await sleep(400);
      return srv.all.slice(from).map(strip).filter((l) => /Successfully found|The block at/.test(l)).join(' | ');
    };
    /* 1) till → set 行 */
    srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:dirt 0`);
    srv.send(`clear ${BOT}`);
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:hoe_copper 1 0 {ench:[{id:${ids[8]},lvl:5}]}`);
    await sleep(600);
    let from = srv.all.length;
    srv.send(`etest useblock ${T.x} ${T.y} ${T.z} ${BOT}`);
    await sleep(1400);
    ev.till = {
      tillRows: srv.all.slice(from).map(strip).filter((l) => RE.till.test(l)),
      setRows: srv.all.slice(from).map(strip).filter((l) => RE.set.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`)),
      block: await tf(T.x, T.y, T.z, 'minecraft:farmland'),
    };
    log('till', JSON.stringify(ev.till));
    /* 2) 新鲜位踩踏 → deny */
    srv.send(`setblock ${T.x} ${T.y + 1} ${T.z} minecraft:wheat 0`);
    await sleep(600);
    from = srv.all.length;
    srv.send(`summon minecraft:cow ${T.x + 0.5} ${by + 4} ${T.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["ch1"]}`);
    await sleep(4000);
    ev.fresh = {
      deny: srv.all.slice(from).map(strip).filter((l) => RE.deny.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`)),
      allow: srv.all.slice(from).map(strip).filter((l) => RE.allow.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`)),
      block: await tf(T.x, T.y, T.z, 'minecraft:farmland'),
    };
    log('fresh', JSON.stringify(ev.fresh));
    srv.send('kill @e[type=cow]');
    await sleep(600);
    /* 3) 破块 → 重放普通耕地 → allow（不复活） */
    from = srv.all.length;
    /* 破块用 console setblock air（与 turnToDirt/挖掘同一条 World.setBlockState → TE 移除路径；
       /etest dig 的 STOP 面在耕地硬度下不稳定，且挖块面不是本批判点） */
    srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:air 0`);
    await sleep(800);
    ev.afterBreak = {
      block: await tf(T.x, T.y, T.z, 'minecraft:air'),
      rows: srv.all.slice(from).map(strip).filter((l) => /FarmLog|MiningLog/.test(l)).slice(0, 4),
    };
    log('afterBreak', JSON.stringify(ev.afterBreak));
    srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:farmland 0`);
    srv.send(`setblock ${T.x} ${T.y + 1} ${T.z} minecraft:wheat 0`);
    await sleep(800);
    from = srv.all.length;
    srv.send(`summon minecraft:cow ${T.x + 0.5} ${by + 4} ${T.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["ch2"]}`);
    await sleep(4000);
    ev.replaced = {
      deny: srv.all.slice(from).map(strip).filter((l) => RE.deny.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`)),
      allow: srv.all.slice(from).map(strip).filter((l) => RE.allow.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`)),
      block: await tf(T.x, T.y, T.z, 'minecraft:dirt'),
    };
    log('replaced', JSON.stringify(ev.replaced));
    ev.ok = ev.till.tillRows.length === 1 && ev.till.setRows.length === 1
      && /Successfully found/.test(ev.till.block)
      && ev.fresh.deny.length === 1 && ev.fresh.allow.length === 0
      && /Successfully found/.test(ev.fresh.block)
      && /Successfully found/.test(ev.afterBreak.block)
      && ev.replaced.allow.length === 1 && ev.replaced.deny.length === 0
      && /Successfully found/.test(ev.replaced.block);
    log('chain-ok', ev.ok);
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
