#!/usr/bin/env node
'use strict';
const net = require('net');
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
  const x = Number(process.argv[2] || -63), z = Number(process.argv[3] || 240);
  const hits = [];
  const others = {};
  for (let y = 0; y < 256; y++) {
    const s = await r.cmd(`testforblock ${x} ${y} ${z} etim:mantle_or_core`);
    if (/^Successfully/.test(s)) { hits.push(y); continue; }
    const m = s.match(/is (.+?) \(expected/);
    if (m) others[m[1]] = (others[m[1]] || 0) + 1;
  }
  console.log('column', x, z, 'mantleHits=', JSON.stringify(hits));
  console.log('other blocks:', JSON.stringify(others));
  // 采样邻列的 y=0..3
  for (const [nx, nz] of [[x + 1, z], [x, z + 1], [x + 5, z + 5]]) {
    const row = [];
    for (let y = 0; y < 4; y++) {
      const s = await r.cmd(`testforblock ${nx} ${y} ${nz} etim:mantle_or_core`);
      if (/^Successfully/.test(s)) row.push(y + ':mantle');
      else { const m = s.match(/is (.+?) \(expected/); row.push(y + ':' + (m ? m[1] : '?')); }
    }
    console.log('  col', nx, nz, row.join(' '));
  }
  process.exit(0);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
