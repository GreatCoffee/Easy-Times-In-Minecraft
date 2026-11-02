#!/usr/bin/env node
/**
 * melee1-we2-t10.js — W-E2 **T10 补窗**（mob 侧正证，同 HEAD 同钉值）
 *
 * 主窗（melee1-we2.js，T1..T9 + T-CFG）里 T10 的 mob 攻击面稀疏（3 只一轮：
 * stun 9 行 / vampiric 0 行——mob AI 触发率不稳），故按隔离探针（已验 6 只环阵
 * 22s 稳定出 18+ 行）重排本判点：6 只僵尸（stun×3 + vampiric×3）环阵 2.4，
 * 24s，每 1.2s 复 heal / 每 6s 复位。
 *
 * 判点：
 *   T10a mob 持 stun 锤 → [MeleeLog] stun amp=30 dur=250 行（mob 侧出口）
 *   T10b mob 持 vampiric 剑 → [MeleeLog] vampiric transfer>0 且 hp 列回升（hp>8 起始值）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = 'melee1-we2-t10';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const WORLD = 'melee1we2t10';
const PORT = 25565;
const BOT = 'ETIM_T10';
const PIN = {
  head: 'e284a0d',
  rel: { bytes: 850509, sha: '4C02B995E2B428785F4C4D51C9298A14FEEAC55CCDAC2C8FBF6188621912DDC7' },
  dev: { bytes: 833524, sha: '45F6B9584C7209D6816B1F89C6F82EE0D3C9515473735905AC57BF4FB04BD2B3' },
  src: { bytes: 779491, sha: '08958D1820C7F3757E73DAE5C05E9CE88DD6BE6DD3C630F89C822E23FB15D1DC' },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');
function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function pinOf(file, pin, label) {
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}
function crashCount() {
  const dir = path.join(ROOT, 'run', 'crash-reports');
  try { return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).length; } catch (e) { return -1; }
}
function netstatListen(port) {
  try {
    const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    return out.split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) { return -1; }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, window: 'W-E2 T10 补窗', startedAt: new Date().toISOString(), pins: {}, bootCount: 1, clients: 0 };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH') + ' jars=' +
    [ev.pins.devJar.ok, ev.pins.relJar.ok, ev.pins.srcJar.ok].join('/'));

  const propsBefore = fs.readFileSync(PROPS);
  const cfgBefore = fs.readFileSync(CFG);
  ev.cfgSnap = { bytes: cfgBefore.length, sha: sha256(cfgBefore) };
  {
    const t = cfgBefore.toString('utf8');
    const re = /^(    [A-Z]:meleeDebugLog=)[^\r\n]*$/m;
    if (!re.test(t)) throw new Error('cfg has no meleeDebugLog key');
    fs.writeFileSync(CFG, t.replace(re, (m, p1) => p1 + 'true'), 'utf8');
  }
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    if (!(await srv.waitFor(/Done \(/, 420000))) throw new Error('no boot');
    const ids = (() => { const l = srv.all.map(strip).find((x) => /\bids=/.test(x)) || ''; const m = /ids=([\d\s]+)/.exec(l); return m ? m[1].trim().split(/\s+/).map(Number) : null; })();
    ev.ids = { all: ids, stun: ids[5], vampiric: ids[6] };
    log('boot', JSON.stringify(ev.ids));
    ev.boot = { readyTs: null, mixinErrors: srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException|Critical injection failure/.test(l)).length };

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doDaylightCycle false', 'keepInventory true', 'mobGriefing true']) srv.send('gamerule ' + g);
    srv.send('difficulty 2');
    srv.send('time set 18000');
    srv.send(`gamemode 0 ${BOT}`);

    const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    for (let dx = -4; dx <= 5; dx++) for (let dz = -4; dz <= 4; dz++) {
      srv.send(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:stone 0`);
      for (let dy = 0; dy < 3; dy++) srv.send(`setblock ${bx + dx} ${by + dy} ${bz + dz} minecraft:air 0`);
    }
    await sleep(2200);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1300);
    srv.send(`etest level 40 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`effect ${BOT} minecraft:resistance 99999 3`);
    srv.send(`effect ${BOT} minecraft:fire_resistance 99999 0`);
    await sleep(700);
    log('arena', JSON.stringify(ev.arena) + ' bot=' + JSON.stringify(bot.entity && bot.entity.position));

    /* 6 只环阵：stun×3 / vampiric×3 交替（隔离探针已验此布局 22s 稳定出 18+ 行） */
    const spots = [
      { x: bx + 0.5 + 2.4, z: bz + 0.5 },
      { x: bx + 0.5 - 2.4, z: bz + 0.5 },
      { x: bx + 0.5, z: bz + 0.5 + 2.4 },
      { x: bx + 0.5, z: bz + 0.5 - 2.4 },
      { x: bx + 0.5 + 1.7, z: bz + 0.5 + 1.7 },
      { x: bx + 0.5 - 1.7, z: bz + 0.5 - 1.7 },
    ];
    const faces = ['stun', 'vampiric', 'stun', 'vampiric', 'stun', 'vampiric'];
    for (let i = 0; i < spots.length; i++) {
      const face = faces[i];
      const item = face === 'stun' ? 'etim:war_hammer_copper' : 'etim:sword_copper';
      const ench = face === 'stun' ? ev.ids.stun : ev.ids.vampiric;
      srv.send(`summon minecraft:zombie ${spots[i].x.toFixed(2)} ${by} ${spots[i].z.toFixed(2)} {Silent:1b,PersistenceRequired:1b,Tags:["t10_${i}"],`
        + `HandItems:[{id:"${item}",Count:1b,tag:{ench:[{id:${ench},lvl:5}]}},{}],`
        + 'Attributes:[{Name:"generic.maxHealth",Base:100.0}],Health:8.0f}');
    }
    await sleep(1600);
    const from = srv.all.length;
    for (let i = 0; i < 20; i++) {
      srv.send(`etest health 20 ${BOT}`);
      if (i % 4 === 0) for (let k = 0; k < spots.length; k++) srv.send(`tp @e[tag=t10_${k},c=1] ${spots[k].x.toFixed(2)} ${by} ${spots[k].z.toFixed(2)}`);
      await sleep(1500);
    }
    const seg = srv.all.slice(from).map(strip);
    const stunRows = seg.filter((l) => /MeleeLog\] stun lvl=5/.test(l)).map((l) => {
      const m = /stun lvl=5 roll=([\d.]+) need=5 amp=(\d+) dur=(\d+)/.exec(l);
      return m ? { roll: +m[1], amp: +m[2], dur: +m[3] } : null;
    }).filter(Boolean);
    const vampRows = seg.filter((l) => /MeleeLog\] vampiric lvl=5/.test(l)).map((l) => {
      const m = /vampiric lvl=5 gate=([\d.]+) dmg=([\d.]+) transfer=(\d+)(?: hp=([\d.]+))?/.exec(l);
      return m ? { gate: +m[1], dmg: +m[2], transfer: +m[3], hp: m[4] === undefined ? null : +m[4] } : null;
    }).filter(Boolean);
    const playerMelee = seg.filter((l) => /MeleeLog\] melee target=/.test(l)).length;
    ev.t10 = {
      stunRows, vampRows, playerMeleeRows: playerMelee,
      stunPass: stunRows.filter((r) => r.amp === 30 && r.dur === 250).length,
      stunFail: stunRows.filter((r) => r.amp === 0).length,
      vampPass: vampRows.filter((r) => r.transfer > 0).length,
      vampFail: vampRows.filter((r) => r.transfer === 0).length,
      vampHpSeries: vampRows.filter((r) => r.transfer > 0).map((r) => r.hp),
      vampDmgRange: vampRows.length ? [Math.min(...vampRows.map((r) => r.dmg)), Math.max(...vampRows.map((r) => r.dmg))] : null,
      vampTransferRange: vampRows.filter((r) => r.transfer > 0).length
        ? [Math.min(...vampRows.filter((r) => r.transfer > 0).map((r) => r.transfer)),
          Math.max(...vampRows.filter((r) => r.transfer > 0).map((r) => r.transfer))] : null,
    };
    ev.t10.ok = ev.t10.stunPass > 0 && ev.t10.vampPass > 0 && ev.t10.vampHpSeries.some((h) => h > 8);
    log('t10', 'stun=' + stunRows.length + ' (pass ' + ev.t10.stunPass + '/fail ' + ev.t10.stunFail + ') vamp='
      + vampRows.length + ' (pass ' + ev.t10.vampPass + '/fail ' + ev.t10.vampFail + ') hp=' + JSON.stringify(ev.t10.vampHpSeries));
    log('t10', 'playerMeleeRows=' + playerMelee + ' ok=' + ev.t10.ok);

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    fs.writeFileSync(CFG, cfgBefore);
    fs.writeFileSync(PROPS, propsBefore);
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), sameAsStart: sha256(fs.readFileSync(CFG)) === ev.cfgSnap.sha };
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(d);
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'), srcJar: pinOf(SRCJAR, PIN.src, 'src') };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
