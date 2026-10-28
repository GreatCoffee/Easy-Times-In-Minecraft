#!/usr/bin/env node
/**
 * uw2b-p10b.js — WP10 箭面 v4
 *  平台 21×21 + 四周边墙（3 高）；玩家钉在贴墙一线（x0-9.5），longdead 落在平台中段。
 *  射失的箭打在背后墙上 → 落地/插墙实体留存，便于 `testfor @e[type=arrow]` 捕获。
 *  判据通道：① [MobLog] longdead arrow intended=…（产品行）
 *            ② `execute @e[type=arrow] ~ ~ ~ say UW2B_ARROW_VANILLA`（写服务器日志）
 *            ③ `execute @e[type=etim:arrow] …` → invalid（无 ETIM 箭实体）
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
  const chat = async (c) => { bot.chat('/' + c); await sleep(360); };
  const ask = async (c, w) => { const n = replies.length; bot.chat('/' + c); await sleep(w || 700); return replies.slice(n).join(' | '); };
  const ap = st.arrive || { x: -108, y: 218, z: 201 };
  const x0 = Math.floor(ap.x), y0 = Math.floor(ap.y), z0 = Math.floor(ap.z);
  const px = x0 - 9.5, mx = x0 + 3.5;
  say('WP10v4 dim=' + syncDim() + ' anchor=' + x0 + ',' + y0 + ',' + z0 + ' player=' + px + ' mob=' + mx);
  await chat('gamemode 0');
  await chat('effect @p clear');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('effect @p saturation 9999 4');
  await chat('gamerule doMobSpawning false');
  await chat(`fill ${x0 - 10} ${y0 - 1} ${z0 - 10} ${x0 + 10} ${y0 - 1} ${z0 + 10} minecraft:stone`);
  await chat(`fill ${x0 - 10} ${y0} ${z0 - 10} ${x0 + 10} ${y0 + 6} ${z0 + 10} minecraft:air`);
  for (const dx of [-10, 10]) await chat(`fill ${x0 + dx} ${y0} ${z0 - 10} ${x0 + dx} ${y0 + 5} ${z0 + 10} minecraft:stone`);
  for (const dz of [-10, 10]) await chat(`fill ${x0 - 10} ${y0} ${z0 + dz} ${x0 + 10} ${y0 + 5} ${z0 + dz} minecraft:stone`);
  const pin = () => bot.chat(`/tp ${NAME} ${px} ${y0} ${z0 + 0.5}`);
  pin();
  await sleep(1500);
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=arrow]');
  await sleep(700);
  const off = logOffset();
  let ranged = false;
  for (let i = 0; i < 12 && !ranged; i++) {
    await chat('kill @e[type=etim:longdead]');
    await sleep(250);
    pin();
    const o2 = logOffset();
    await chat(`summon etim:longdead ${mx} ${y0} ${z0 + 0.5}`);
    await sleep(1200);
    const tt = logSince(o2);
    ranged = /longdead equip type=ranged/.test(tt);
    say('try ' + (i + 1) + ' ranged=' + ranged + ' | '
      + rows(tt, /longdead equip/).map((l) => cut(l.trim(), 110)).join(' || '));
  }
  let hits = 0, sayRows = 0, sample = '';
  for (let i = 0; i < 90; i++) {
    pin();
    await sleep(400);
    if (i % 2 === 0) {
      const r = await ask('testfor @e[type=arrow]', 400);
      if (/Found \d+ entit/.test(r)) {
        hits++;
        sample = r.trim();
        say('testfor t=' + ((i + 1) * 0.4).toFixed(1) + 's -> ' + cut(sample, 120));
        const oS = logOffset();
        await chat('/execute @e[type=arrow] ~ ~ ~ say UW2B_ARROW_VANILLA');
        await sleep(800);
        sayRows = count(logSince(oS), /UW2B_ARROW_VANILLA/);
        say('say-rows=' + sayRows);
        if (sayRows > 0) break;
      }
    }
  }
  const t = logSince(off);
  const ar = rows(t, /longdead arrow intended/);
  say('arrow intended rows=' + ar.length);
  ar.slice(0, 3).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('arrow entity hits=' + hits + ' sample=' + cut(sample, 80));
  // etim 箭实体面
  const oE = logOffset();
  await chat('/execute @e[type=etim:arrow] ~ ~ ~ say UW2B_ETIM_ARROW');
  await sleep(900);
  say('etim:arrow probe -> ' + cut(logSince(oE).trim().split('\n').slice(-1)[0] || 'none', 150));
  say('etim say rows=' + count(logSince(oE), /UW2B_ETIM_ARROW/));
  // 落地/插墙证据：say 标签统计（全窗）
  say('window say rows(UW2B_ARROW_VANILLA)=' + count(logAll(), /UW2B_ARROW_VANILLA/));
  const smp = await ask('entitydata @e[type=arrow,c=1] {}', 1200);
  say('entitydata -> ' + cut(smp, 500));
  say('dim=' + syncDim() + ' soe=' + count(t, /StackOverflowError/));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
