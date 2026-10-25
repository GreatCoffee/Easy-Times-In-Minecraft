#!/usr/bin/env node
// uw-attack-probe.js — 诊断 bot.attack 是否造成玩家伤害（Health 前后值 + drop 行）
'use strict';
const { createHarnBot } = require('./fmlbot');
const net = require('net');
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
const hp = (s) => { const m = String(s).match(/Health:([\d.]+)/); return m ? m[1] : '?'; };
(async () => {
  const r = new Rcon('127.0.0.1', 25575, 'etim27');
  await r.connect(); await r.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: process.env.UW_BOT || 'ETIM_Harn01' });
  await sleep(3000);
  const chat = async (c) => { bot.chat('/' + c); await sleep(450); };
  await chat('gamemode 0');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p strength 9999 10');
  await chat('kill @e[type=etim:longdead]');
  await sleep(600);
  const e0 = String(await r.cmd('tp ETIM_Harn01 ~ ~ ~')).replace(/\u0000/g, '');
  const m = e0.match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  const px = Math.floor(parseFloat(m[1])), py = Math.floor(parseFloat(m[2])), pz = Math.floor(parseFloat(m[3]));
  await chat(`fill ${px - 5} ${py} ${pz - 5} ${px + 5} ${py + 4} ${pz + 5} minecraft:air`);
  await chat(`fill ${px - 5} ${py - 1} ${pz - 5} ${px + 5} ${py - 1} ${pz + 5} minecraft:stone`);
  await chat(`tp ETIM_Harn01 ${px + 0.5} ${py} ${pz + 0.5}`);
  await sleep(1000);
  await chat(`summon etim:longdead ${px + 0.5} ${py} ${pz + 1.5}`);
  await sleep(1500);
  console.log('SERVER_POS:', px, py, pz, '| BOTPOS:', bot.entity.position.x.toFixed(2), bot.entity.position.y.toFixed(2), bot.entity.position.z.toFixed(2));
  console.log('HP0:', hp(await r.cmd('entitydata @e[type=etim:longdead,c=1] {}')));
  const near = () => Object.values(bot.entities).filter((e) => e !== bot.entity && !e.username && e.position
    && e.position.distanceTo(bot.entity.position) < 6);
  console.log('NEAR:', near().map((e) => `${e.name || '(noname)'}#${e.id}@${e.position.distanceTo(bot.entity.position).toFixed(2)}`).join(' | ') || '(none)');
  for (let i = 0; i < 5; i++) {
    const list = near();
    for (const e of list) {
      try { bot.attack(e); } catch (err) { console.log('ATTACK_ERR', err.message); }
    }
    await sleep(700);
    console.log(`HP${i + 1}:`, hp(await r.cmd('entitydata @e[type=etim:longdead,c=1] {}')), 'near=' + near().length);
  }
  await sleep(400);
  await chat('kill @e[type=etim:longdead]');
  await sleep(1200);
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
