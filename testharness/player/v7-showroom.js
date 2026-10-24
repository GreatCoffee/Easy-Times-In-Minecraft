#!/usr/bin/env node
/** v7-showroom.js — W7/W9 客户端目检现场：清 W7 靶场 + 搭展示排。
 *  1.12 /setblock 走方块状态语法（`blk[facing=...,damage=...]`），裸数字会被
 *  当成属性名拒收；且区块必须已加载（先连一个 bot 站到现场）。 */
'use strict';
const net = require('net');
const { createHarnBot, log } = require('./fmlbot');
const mark = (...a) => log('showroom', ...a);

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
  async cmd(c) { const r = await this._send(2, c); return (r || '').trim(); }
  close() { try { this.sock.destroy(); } catch (e) {} }
}

const Y = 100;
const rows = [];
const set = (x, y, z, block) => rows.push(`/setblock ${x} ${y} ${z} ${block} replace`);

(async () => {
  const rcon = new Rcon();
  await rcon.connect();
  await rcon.auth();
  const bot = await createHarnBot({ username: 'ETIM_Harn04' });
  await new Promise((r) => setTimeout(r, 2000));
  await rcon.cmd('/gamemode 1 ETIM_Harn04');
  await rcon.cmd('/tp ETIM_Harn04 -32.5 100 24.5 180 0');
  await new Promise((r) => setTimeout(r, 1200));

  // --- W7 target rig: only the copper anvil at -34 100 12 keeps its ledger
  set(-33, Y, 12, 'minecraft:air 0 replace');
  set(-35, Y, 12, 'minecraft:air 0 replace');
  set(-36, Y, 12, 'minecraft:air 0 replace');
  set(-34, Y, 13, 'minecraft:air 0 replace');

  // --- row A (z=20): six metal anvils, front toward the viewer (south = meta 2)
  const anv = ['copper', 'silver', 'gold', 'mithril', 'adamantium', 'ancient_metal'];
  anv.forEach((m, i) => set(-42 + i * 3, Y, 20, `etim:anvil_${m} 2 replace`));

  // --- row B (z=22): four ores (left) + five storage blocks (right)
  ['copper', 'silver', 'mithril', 'adamantium'].forEach((m, i) =>
    set(-42 + i * 2, Y, 22, `etim:ore_${m} 0 replace`));
  ['copper', 'silver', 'mithril', 'adamantium', 'ancient_metal'].forEach((m, i) =>
    set(-30 + i * 2, Y, 22, `etim:storage_${m} 0 replace`));

  // --- row C (z=24): facing rotation (meta = facing index: 0=north 1=west
  //     2=south 3=east) + DAMAGE tiers (damage<<2 | facing: 6 = d1 south,
  //     10 = d2 south)
  set(-42, Y, 24, 'etim:anvil_copper 0 replace');
  set(-40, Y, 24, 'etim:anvil_copper 1 replace');
  set(-38, Y, 24, 'etim:anvil_copper 2 replace');
  set(-36, Y, 24, 'etim:anvil_copper 3 replace');
  set(-32, Y, 24, 'etim:anvil_copper 6 replace');
  set(-30, Y, 24, 'etim:anvil_copper 10 replace');

  // --- the W9④ tooltip anvil (open cell above)
  set(-26, Y, 24, 'etim:anvil_copper 2 replace');
  set(-26, Y + 1, 24, 'minecraft:air 0 replace');

  let bad = 0;
  for (const c of rows) {
    const r = await rcon.cmd(c);
    if (!/Block placed|Changed the block/i.test(r)) { bad++; mark(`SET-FAIL ${c} -> ${r}`); }
  }
  mark(`showroom: ${rows.length} setblock rows done, failures=${bad}`);
  rcon.close();
  bot.quit();
  process.exit(0);
})().catch((e) => { mark(`FATAL ${e && e.stack || e}`); process.exit(1); });
