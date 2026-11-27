#!/usr/bin/env node
// probe: one persistent RCON connection, N commands (harness sanity)
'use strict';
const net = require('net');
class Rcon {
  constructor(host, port, pass) { this.host=host; this.port=port; this.pass=pass; this.buf=Buffer.alloc(0); this.waiters=[]; }
  connect() { return new Promise((res, rej) => { this.sock = net.connect(this.port, this.host, () => res()); this.sock.on('error', rej);
    this.sock.on('data', (d) => { this.buf = Buffer.concat([this.buf, d]);
      for (;;) { if (this.buf.length < 4) break; const size = this.buf.readInt32LE(0); if (this.buf.length < size + 4) break;
        const body = this.buf.slice(12, 4 + size).toString('utf8'); this.buf = this.buf.slice(4 + size);
        const w = this.waiters.shift(); if (w) w({ body }); } }); }); }
  _pkt(id, type, body) { const b = Buffer.from(body, 'utf8'); const p = Buffer.alloc(10 + b.length);
    p.writeInt32LE(id, 0); p.writeInt32LE(type, 4); b.copy(p, 8); const o = Buffer.alloc(4 + p.length);
    o.writeInt32LE(p.length, 0); p.copy(o, 4); return o; }
  _send(id, type, body) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('timeout ' + body)), 15000);
    this.waiters.push((p) => { clearTimeout(t); res(p); }); this.sock.write(this._pkt(id, type, body)); }); }
  async auth() { const r = await this._send(1, 3, this.pass); if (r.body === '') throw new Error('auth failed'); }
  async cmd(c) { const r = await this._send(9, 2, c); return (r.body || '').trim(); }
}
(async () => {
  const r = new Rcon('127.0.0.1', 25575, 'etim27');
  await r.connect(); await r.auth();
  for (const c of ['time query gametime', 'gamerule doMobSpawning', 'list', 'time query gametime']) {
    console.log(c, '->', await r.cmd(c));
  }
  r.sock.end();
  setTimeout(() => process.exit(0), 500);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
