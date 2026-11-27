#!/usr/bin/env node
/** metal-anvil-probe.js — why does the ETIM-anvil window refuse picks?
 *  Path: openAnvil (the plugin face) + raw packet monitors + immediate clicks. */
'use strict';
const path = require('path');
const net = require('net');
const { createHarnBot, log } = require('./fmlbot');
const { Vec3 } = require('vec3');

const NAME = process.env.B3_BOT || 'ETIM_Harn04';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mark = (...a) => log('probe', ...a);

class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.pending = new Map(); this.id = 1; }
  connect() {
    return new Promise((resolve, reject) => {
      this.sock = net.createConnection(25575, '127.0.0.1', () => resolve());
      this.sock.on('data', (d) => this._data(d));
      this.sock.on('error', reject);
    });
  }
  _data(d) {
    this.buf = Buffer.concat([this.buf, d]);
    for (;;) {
      if (this.buf.length < 4) return;
      const size = this.buf.readInt32LE(0);
      if (this.buf.length < 4 + size) return;
      const id = this.buf.readInt32LE(4);
      const body = this.buf.slice(12, 4 + size - 2).toString('utf8');
      this.buf = this.buf.slice(4 + size);
      const p = this.pending.get(id);
      if (p) { this.pending.delete(id); p(body); }
    }
  }
  _send(type, body) {
    const len = Buffer.byteLength(body);
    const id = this.id++;
    const buf = Buffer.alloc(14 + len);
    buf.writeInt32LE(len + 10, 0);
    buf.writeInt32LE(id, 4);
    buf.writeInt32LE(type, 8);
    buf.write(body, 12, 'utf8');
    buf.writeInt16LE(0, 12 + len);
    this.sock.write(buf);
    return new Promise((res) => this.pending.set(id, res));
  }
  async auth() { await this._send(3, 'etim27'); }
  async cmd(c) { return this._send(2, c); }
  close() { try { this.sock.destroy(); } catch (e) {} }
}

(async () => {
  const rcon = new Rcon();
  await rcon.connect();
  await rcon.auth();
  const bot = await createHarnBot({ username: NAME });
  await sleep(2500);

  const anvCu = { x: -34, y: 100, z: 12 };
  await rcon.cmd(`/gamemode 1 ${NAME}`);
  await rcon.cmd(`/tp ${NAME} ${anvCu.x + 0.5} 100 ${anvCu.z + 2.5} 180 0`);
  await sleep(800);
  await rcon.cmd(`/give ${NAME} etim:scythe_copper 1`);
  await sleep(400);

  bot._client.on('transaction', (d) => mark(`SERVER-CONFIRM: windowId=${d.windowId} action=${d.actionNumber != null ? d.actionNumber : d.action} accepted=${d.accepted}`));
  bot._client.on('open_window', (d) => mark(`OPEN-WINDOW: id=${d.windowId} type=${d.inventoryType}`));
  bot._client.on('close_window', (d) => mark(`CLOSE-WINDOW: id=${d.windowId}`));
  bot._client.on('set_slot', (d) => mark(`SET-SLOT: windowId=${d.windowId} slot=${d.slot}`));
  bot.on('windowClose', (w) => mark(`mineflayer windowClose: id=${w && w.id}`));

  const block = await bot.blockAt(new Vec3(anvCu.x, anvCu.y, anvCu.z));
  mark(`block: name=${block && block.name}`);

  mark('openAnvil …');
  const w = await bot.openAnvil(block);
  mark(`window: id=${w.id} type=${w.type} slots=${w.slots.length}`);

  // where is the scythe?
  for (let s = 30; s < 39; s++) {
    const it = w.slots[s];
    if (it) mark(`hotbar slot ${s}: ${it.name} x${it.count} dmg=${it.metadata}`);
  }

  mark('clickWindow(30, 0, 0) — pick …');
  try {
    await bot.clickWindow(30, 0, 0);
    mark('pick resolved; cursor=' + (bot.currentWindow && bot.currentWindow.cursorStack
      ? bot.currentWindow.cursorStack.name : 'null'));
  } catch (e) {
    mark(`pick REJECTED: ${e && e.message}`);
  }
  await sleep(600);
  mark(`final: currentWindow=${bot.currentWindow ? bot.currentWindow.id : 'NONE'} cursor=${bot.currentWindow && bot.currentWindow.cursorStack ? bot.currentWindow.cursorStack.name : 'null'} s0=${JSON.stringify(bot.currentWindow && bot.currentWindow.slots ? { n: bot.currentWindow.slots[0] && bot.currentWindow.slots[0].name, c: bot.currentWindow.slots[0] && bot.currentWindow.slots[0].count } : null)}`);
  await sleep(400);
  rcon.close();
  bot.quit();
  process.exit(0);
})().catch((e) => { mark(`FATAL ${e && e.stack || e}`); process.exit(1); });
