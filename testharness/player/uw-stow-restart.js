#!/usr/bin/env node
// uw-stow-restart.js — W10 存档读回（跨服务端重启）：
//   make  : 在 -2 召 guardian 直到 stow → entitydata 加 PersistenceRequired → save-all 提示
//   check : 重进后读同一 guardian 的 stowed_item_stack
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw', 'logs', 'latest.log');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Rcon {
  constructor(h, p, w) { this.h = h; this.p = p; this.w = w; this.buf = Buffer.alloc(0); this.q = []; }
  connect() { return new Promise((res, rej) => { this.s = net.connect(this.p, this.h, () => res()); this.s.on('error', rej);
    this.s.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]);
      for (;;) { if (this.buf.length < 4) break; const n = this.buf.readInt32LE(0); if (this.buf.length < n + 4) break;
        const body = this.buf.slice(12, 4 + n).toString('utf8'); this.buf = this.buf.slice(4 + n);
        const w = this.q.shift(); if (w) w(body); } }); }); }
  pkt(id, t, b) { const bb = Buffer.from(b, 'utf8'); const pl = Buffer.alloc(10 + bb.length); pl.writeInt32LE(id, 0); pl.writeInt32LE(t, 4); bb.copy(pl, 8);
    const o = Buffer.alloc(4 + pl.length); o.writeInt32LE(pl.length, 0); pl.copy(o, 4); return o; }
  send(id, t, b) { return new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('to ' + b)), 15000); this.q.push((x) => { clearTimeout(to); res(x); }); this.s.write(this.pkt(id, t, b)); }); }
  async auth() { await this.send(1, 3, this.w); }
  async cmd(c) { return (await this.send(9, 2, c) || '').trim(); }
}
const off = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const since = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
(async () => {
  const phase = process.argv[2] || 'check';
  const r = new Rcon('127.0.0.1', 25575, 'etim27');
  await r.connect(); await r.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: process.env.UW_BOT || 'ETIM_Harn01' });
  await sleep(4000);
  const chat = async (c) => { bot.chat('/' + c); await sleep(450); };
  const echo = String(await r.cmd('tp ETIM_Harn01 ~ ~ ~')).replace(/\u0000/g, '');
  const m = echo.match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  const px = Math.floor(parseFloat(m[1])), py = Math.floor(parseFloat(m[2])), pz = Math.floor(parseFloat(m[3]));
  console.log('PHASE', phase, 'POS', px, py, pz);
  if (phase === 'make') {
    await chat('gamemode 0');
    await chat('kill @e[type=etim:longdead_guardian]');
    await sleep(800);
    let stow = false;
    for (let i = 0; i < 10 && !stow; i++) {
      const o = off();
      await chat(`summon etim:longdead_guardian ${px + 2} ${py} ${pz}`);
      await sleep(1500);
      stow = /guardian stow item=dagger_ancient_metal/.test(since(o));
      console.log('ATTEMPT', i + 1, 'stow=' + stow);
      if (!stow) await chat('kill @e[type=etim:longdead_guardian]');
    }
    await chat('entitydata @e[type=etim:longdead_guardian,c=1] {PersistenceRequired:1b}');
    const nbt = await r.cmd('entitydata @e[type=etim:longdead_guardian,c=1] {}');
    const s = String(nbt).replace(/\u0000/g, '');
    console.log('BEFORE stowed=', /stowed_item_stack/.test(s), 'persist=', /PersistenceRequired:1b/.test(s));
    console.log('BEFORE_SNIP:', (s.match(/stowed_item_stack:\{[^}]*\}/) || [s.slice(0, 200)])[0].slice(0, 160));
    await r.cmd('save-all');
    await sleep(1200);
    console.log('SAVE-ALL done');
  } else {
    const nbt = await r.cmd('entitydata @e[type=etim:longdead_guardian,c=1] {}');
    const s = String(nbt).replace(/\u0000/g, '');
    console.log('AFTER stowed=', /stowed_item_stack/.test(s), 'persist=', /PersistenceRequired:1b/.test(s));
    console.log('AFTER_SNIP:', (s.match(/stowed_item_stack:\{[^}]*\}/) || [s.slice(0, 200)])[0].slice(0, 160));
    console.log('RAW_HEAD:', s.slice(0, 180));
  }
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
