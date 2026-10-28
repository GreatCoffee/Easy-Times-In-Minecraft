#!/usr/bin/env node
'use strict';
// 会话七临时探针：在玩家所在维度（underworld）用 chat testforblock 读真实方块名
const net = require('net');
const { createHarnBot } = require('./fmlbot');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.q = []; }
  connect() { return new Promise((res, rej) => { this.s = net.connect(25575, '127.0.0.1', () => res()); this.s.on('error', rej);
    this.s.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]);
      for (;;) { if (this.buf.length < 4) break; const n = this.buf.readInt32LE(0); if (this.buf.length < n + 4) break;
        const body = this.buf.slice(12, 4 + n).toString('utf8'); this.buf = this.buf.slice(4 + n);
        const w = this.q.shift(); if (w) w(body); } }); }); }
  pkt(id, t, b) { const bb = Buffer.from(b, 'utf8'); const pl = Buffer.alloc(10 + bb.length); pl.writeInt32LE(id, 0); pl.writeInt32LE(t, 4); bb.copy(pl, 8);
    const o = Buffer.alloc(4 + pl.length); o.writeInt32LE(pl.length, 0); pl.copy(o, 4); return o; }
  send(id, t, b) { return new Promise((res) => { this.q.push(res); this.s.write(this.pkt(id, t, b)); }); }
  async auth() { return this.send(1, 3, 'etim27'); }
  async cmd(c) { return String(await this.send(9, 2, c) || '').replace(/\u0000/g, '').trim(); }
}
(async () => {
  const r = new Rcon(); await r.connect(); await r.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn01' });
  await sleep(3000);
  await bot.chat('/effect @p resistance 9999 4');
  await sleep(400);
  const replies = [];
  bot.on('message', (m) => replies.push(m.toString()));
  const tpb = async (x, y, z, blk) => {
    const n0 = replies.length;
    bot.chat(`/testforblock ${x} ${y} ${z} ${blk}`);
    await sleep(420);
    return replies.slice(n0).join(' | ');
  };
  const x0 = Number(process.argv[2] || -63), z0 = Number(process.argv[3] || 240);
  for (const [x, z] of [[x0, z0], [x0 + 1, z0], [x0, z0 + 1], [x0 + 4, z0 + 4], [x0 + 8, z0]]) {
    const out = [];
    for (const y of [0, 1, 2, 3]) {
      out.push('y' + y + '=[' + (await tpb(x, y, z, 'etim:mantle_or_core')) + ']');
    }
    console.log('col', x, z, out.join(' '));
  }
  // 再读几条“实际是什么”的对照
  for (const [y, blk] of [[0, 'minecraft:bedrock'], [1, 'minecraft:bedrock'], [2, 'minecraft:stone'], [0, 'minecraft:stone']]) {
    console.log('check', y, blk, '->', await tpb(x0, y, z0, blk));
  }
  // 玩家位置复核
  console.log('tp echo:', await r.cmd('tp ETIM_Harn01 ~ ~ ~'));
  bot.quit(); setTimeout(() => process.exit(0), 700);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
