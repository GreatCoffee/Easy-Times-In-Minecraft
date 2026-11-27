#!/usr/bin/env node
/**
 * uw2b-p10.js — WP10 箭面（v2）
 *  · 平台 21×21 + 玩家每 400ms 钉回台心（防击退坠台 → 防距离 despawn）
 *  · longdead 3 格外裸召，重召到 ranged（bow）
 *  · 判据：① [MobLog] longdead arrow intended=…（已出）
 *          ② 落地实体面：chat `testfor @e[type=arrow]` + `entitydata` NBT + 日志 say 标签
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const STATE = path.join(ROOT, 'build-logs', 'uw2b-state.json');
const NAME = 'ETIM_Harn01';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 200) ? l.slice(0, n || 200) : l);
const st = (() => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } })();
const syncDim = () => {
  const t = logAll();
  let dim = 0;
  for (const l of t.split('\n')) {
    if (/\[DimLog\] enter player=.*to=-2/.test(l)) dim = -2;
    else if (/\[DimLog\] leave player=.*to=0/.test(l)) dim = 0;
    else { const m = l.match(/\[DimLog\] portal-place dim=(-?\d+)/); if (m) dim = +m[1]; }
  }
  return dim;
};
class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.q = []; }
  connect() { return new Promise((res, rej) => { this.s = net.connect(25575, '127.0.0.1', () => res()); this.s.on('error', rej);
    this.s.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]);
      for (;;) { if (this.buf.length < 4) break; const n = this.buf.readInt32LE(0); if (this.buf.length < n + 4) break;
        const body = this.buf.slice(12, 4 + n).toString('utf8'); this.buf = this.buf.slice(4 + n);
        const w = this.q.shift(); if (w) w(body); } }); }); }
  pkt(id, t, b) { const bb = Buffer.from(b, 'utf8'); const pl = Buffer.alloc(10 + bb.length); pl.writeInt32LE(id, 0); pl.writeInt32LE(t, 4); bb.copy(pl, 8);
    const o = Buffer.alloc(4 + pl.length); o.writeInt32LE(pl.length, 0); pl.copy(o, 4); return o; }
  send(id, t, b, timeoutMs) { return new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('rcon timeout: ' + b)), timeoutMs || 25000);
    this.q.push((x) => { clearTimeout(to); res(x); }); this.s.write(this.pkt(id, t, b)); }); }
  async auth() { return this.send(1, 3, 'etim27'); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}
(async () => {
  const rcon = new Rcon(); await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  const replies = [];
  bot.on('message', (m) => replies.push(m.toString()));
  const chat = async (c) => { bot.chat('/' + c); await sleep(380); };
  const ask = async (c, waitMs) => {
    const n = replies.length;
    bot.chat('/' + c);
    await sleep(waitMs || 900);
    return replies.slice(n).join(' | ');
  };
  const ap = st.arrive || { x: -108, y: 218, z: 201 };
  const x0 = Math.floor(ap.x), y0 = Math.floor(ap.y), z0 = Math.floor(ap.z);
  say('WP10 start dim=' + syncDim() + ' anchor=' + x0 + ',' + y0 + ',' + z0);
  await chat('gamemode 0');
  await chat('effect @p clear');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('effect @p saturation 9999 4');
  await chat('gamerule doMobSpawning false');
  // 平台 21×21 + 边墙（防击退坠台）
  await chat(`fill ${x0 - 10} ${y0 - 1} ${z0 - 10} ${x0 + 10} ${y0 - 1} ${z0 + 10} minecraft:stone`);
  await chat(`fill ${x0 - 10} ${y0} ${z0 - 10} ${x0 + 10} ${y0 + 5} ${z0 + 10} minecraft:air`);
  await chat(`fill ${x0 - 10} ${y0} ${z0 - 10} ${x0 + 10} ${y0 + 2} ${z0 - 10} minecraft:stone`);
  await chat(`fill ${x0 - 10} ${y0} ${z0 + 10} ${x0 + 10} ${y0 + 2} ${z0 + 10} minecraft:stone`);
  await chat(`fill ${x0 - 10} ${y0} ${z0 - 10} ${x0 - 10} ${y0 + 2} ${z0 + 10} minecraft:stone`);
  await chat(`fill ${x0 + 10} ${y0} ${z0 - 10} ${x0 + 10} ${y0 + 2} ${z0 + 10} minecraft:stone`);
  await chat(`tp @p ${x0 + 0.5} ${y0} ${z0 + 0.5}`);
  await sleep(2000);
  const pin = () => bot.chat(`/tp ${NAME} ${x0 - 8.5} ${y0} ${z0 + 0.5}`);
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=arrow,r=80]');
  await sleep(800);
  const off = logOffset();
  let ranged = false;
  for (let i = 0; i < 12 && !ranged; i++) {
    await chat('kill @e[type=etim:longdead]');
    await sleep(300);
    pin();
    const o2 = logOffset();
    await chat(`summon etim:longdead ${x0 + 8.5} ${y0} ${z0 + 0.5}`);
    await sleep(1300);
    const tt = logSince(o2);
    ranged = /longdead equip type=ranged/.test(tt);
    say('WP10 try ' + (i + 1) + ' ranged=' + ranged + ' | '
      + rows(tt, /longdead equip/).map((l) => cut(l.trim(), 120)).join(' || '));
  }
  // 观察 12s：每 400ms 钉住玩家；一发现箭实体立刻取样（say 日志通道 + entitydata NBT）
  let found = 'n/a', nbt = '', sayLog = 0;
  for (let i = 0; i < 30; i++) {
    pin();
    await sleep(400);
    const r = await ask('testfor @e[type=arrow,r=80]', 500);
    if (/Found \d+ entit/.test(r)) {
      found = r.trim();
      say('WP10 testfor t=' + ((i + 1) * 0.4).toFixed(1) + 's -> ' + cut(found, 120));
      const offSay = logOffset();
      await chat('/execute @e[type=arrow] ~ ~ ~ say UW2B_ARROW_VANILLA');
      await sleep(900);
      sayLog = count(logSince(offSay), /UW2B_ARROW_VANILLA/);
      nbt = await ask('entitydata @e[type=arrow,c=1] {}', 1100);
      say('WP10 say-rows=' + sayLog + ' entitydata -> ' + cut(nbt, 620));
      if (sayLog > 0) break;
    }
  }
  const t = logSince(off);
  const ar = rows(t, /longdead arrow intended/);
  say('WP10 arrow intended rows=' + ar.length);
  ar.slice(0, 4).forEach((l) => say('   ' + cut(l.trim(), 190)));
  // 日志通道探针：execute 每个箭实体 say 一次
  const off2 = logOffset();
  await chat('/execute @e[type=arrow] ~ ~ ~ say UW2B_ARROW_VANILLA');
  await sleep(1500);
  await chat('/execute @e[type=etim:arrow] ~ ~ ~ say UW2B_ETIM_ARROW');
  await sleep(1500);
  const t2 = logSince(off2);
  say('WP10 say rows: vanilla=' + count(t2, /UW2B_ARROW_VANILLA/) + ' etim=' + count(t2, /UW2B_ETIM_ARROW/));
  rows(t2, /UW2B_ARROW_VANILLA|UW2B_ETIM_ARROW|Entity type 'etim:arrow' is invalid/).slice(0, 3)
    .forEach((l) => say('   ' + cut(l.trim(), 170)));
  say('WP10 found=' + cut(found, 100) + ' | dim=' + syncDim() + ' pos=' + JSON.stringify(await (async () => {
    try { const e = await rcon.cmd('tp ' + NAME + ' ~ ~ ~'); const m = String(e).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/); return m ? { x: +m[1], y: +m[2], z: +m[3] } : null; } catch (err) { return null; }
  })()));
  say('WP10 soe=' + count(t, /StackOverflowError/));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
