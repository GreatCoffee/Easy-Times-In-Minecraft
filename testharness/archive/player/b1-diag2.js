#!/usr/bin/env node
/** b1-diag2.js — find the client stream desync point (packet name ring). */
'use strict';
const { createHarnBot, log } = require('./fmlbot');
const net = require('net');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const NAME = 'ETIM_Harn04';
const P = (s) => log('d2', s);

class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.pending = new Map(); this.id = 1; }
  connect() { return new Promise((res, rej) => { this.sock = net.createConnection(25575, '127.0.0.1', () => res()); this.sock.on('data', (d) => this._d(d)); this.sock.on('error', rej); }); }
  _d(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 4) return;
      const n = this.buf.readInt32LE(0);
      if (this.buf.length < 4 + n) return;
      const id = this.buf.readInt32LE(4);
      const body = this.buf.slice(12, 4 + n - 2).toString('utf8');
      this.buf = this.buf.slice(4 + n);
      const p = this.pending.get(id); if (p) { this.pending.delete(id); p(body); }
    }
  }
  _s(t, b) {
    const l = Buffer.byteLength(b); const id = this.id++;
    const buf = Buffer.alloc(14 + l);
    buf.writeInt32LE(l + 10, 0); buf.writeInt32LE(id, 4); buf.writeInt32LE(t, 8);
    buf.write(b, 12, 'utf8'); buf.writeInt16LE(0, 12 + l);
    this.sock.write(buf);
    return new Promise((r) => this.pending.set(id, r));
  }
}

(async () => {
  const rcon = new Rcon(); await rcon.connect(); await rcon._s(3, 'etim27');
  const cmd = (c) => rcon._s(2, c);
  const bot = await createHarnBot({ username: NAME });
  bot.physicsEnabled = false;
  const ring = [];
  bot._client.on('packet', (data, meta) => { ring.push(meta.name); if (ring.length > 40) ring.shift(); });
  bot._client.on('error', (e) => { P(`CLIENT ERROR: ${e.message}`); P(`ring: ${ring.join(' ')}`); });
  bot.on('end', (why) => P('end ' + why));
  for (let i = 0; i < 40 && !bot.entity; i++) await sleep(100);
  await sleep(1000);
  P('connected');

  let lastWindow = null;
  let opens = 0;
  bot._client.on('window_items', (p) => { lastWindow = p; });
  bot._client.on('craft_progress_bar', (p) => P(`progress win=${p.windowId} prop=${p.property} val=${p.value}`));

  const open = async (x, y, z) => {
    lastWindow = null; opens++;
    await cmd(`/tp ${NAME} ${x + 0.5} ${y + 1} ${z + 3.5} 180 0`);
    await sleep(250);
    bot._client.write('held_item_slot', { slotId: 8 });
    bot._client.write('block_place', { location: { x, y, z }, direction: 1, hand: 0, cursorX: 0.5, cursorY: 0.5, cursorZ: 0.5 });
    for (let i = 0; i < 40; i++) { if (lastWindow) break; await sleep(50); }
    return lastWindow ? lastWindow.windowId : null;
  };
  const click = (w, s, b = 0, m = 0) => bot._client.write('window_click', { windowId: w, slot: s, mouseButton: b, action: 1, mode: m, item: { blockId: -1 } });

  await cmd(`/clear ${NAME}`);
  await cmd(`/give ${NAME} etim:ore_mithril 1`);
  await cmd(`/give ${NAME} minecraft:lava_bucket 1`);
  await sleep(400);
  let w = await open(22, 100, 10);
  P(`open1 -> ${w} (opens=${opens}) slots=${lastWindow ? lastWindow.items.length : -1}`);
  click(w, 30); await sleep(150); click(w, 0); await sleep(200);
  click(w, 31); await sleep(150); click(w, 1); await sleep(200);
  bot._client.write('close_window', { windowId: w });
  for (let t = 3; t <= 21; t += 3) {
    await sleep(3000);
    const w2 = await open(22, 100, 10);
    P(`t=${t}s open -> ${w2} (opens=${opens}) ring=${ring.slice(-6).join(',')}`);
    if (w2) bot._client.write('close_window', { windowId: w2 });
  }
  P('done');
  bot.quit(); rcon.sock.destroy(); setTimeout(() => process.exit(0), 400);
})().catch((e) => { console.error(e); process.exit(1); });
