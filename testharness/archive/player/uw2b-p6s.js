#!/usr/bin/env node
/**
 * uw2b-p6s.js — WP6 生存面复证（gamemode 0 + 钻石镐，y=5 构造 mantle 邻面）
 * 目的：确认成就触发不依赖创造面瞬破（即真实挖块路径同样出 achievement 行）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');
const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const NAME = 'ETIM_Harn01';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 200) ? l.slice(0, n || 200) : l);
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
  const chat = async (c) => { bot.chat('/' + c); await sleep(400); };
  const probe = async (x, y, z, blk) => {
    const n0 = replies.length;
    bot.chat(`/testforblock ${x} ${y} ${z} ${blk}`);
    await sleep(330);
    const got = replies.slice(n0).join(' | ');
    if (/Successfully found/.test(got)) return blk;
    const m = got.match(/is (.+?) \(expected/);
    return m ? m[1] : '?';
  };
  const x = -96, y = 5, z = 197; // 与上一轮构造面错开
  await chat('gamemode 0');
  await chat('effect @p clear');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('effect @p saturation 9999 4');
  await chat('gamerule doMobSpawning false');
  await chat(`fill ${x - 2} ${y} ${z - 2} ${x + 2} ${y + 3} ${z + 2} minecraft:air`);
  await chat(`fill ${x - 2} ${y - 1} ${z - 2} ${x + 2} ${y - 1} ${z + 2} minecraft:stone`);
  await chat(`setblock ${x} ${y} ${z} minecraft:stone`);
  await chat(`setblock ${x + 1} ${y} ${z} etim:mantle_or_core 0`);
  await chat('give @p minecraft:diamond_pickaxe 1 0 {ench:[{id:32,lvl:5}]}');
  await chat(`tp @p ${x + 0.5} ${y} ${z + 2.5}`);
  await sleep(1800);
  const pick = bot.inventory.items().find((i) => /pickaxe/.test(i.name || ''));
  if (pick) { try { await bot.equip(pick, 'hand'); } catch (e) { say('equip err ' + e.message); } }
  await sleep(600);
  say('surv target=' + (await probe(x, y, z, 'minecraft:stone')) + ' mantle=' + (await probe(x + 1, y, z, 'etim:mantle_or_core'))
    + ' held=' + (bot.heldItem ? bot.heldItem.name : 'none'));
  const off = logOffset();
  const t0 = Date.now();
  try {
    await bot.lookAt(new Vec3(x + 0.5, y + 0.5, z + 0.5), true);
    await sleep(500);
    const blk = bot.blockAt(new Vec3(x, y, z));
    await bot.dig(blk || { position: new Vec3(x, y, z), name: 'stone' });
  } catch (e) { say('dig err ' + e.message); }
  say('dig wall=' + ((Date.now() - t0) / 1000).toFixed(1) + 's');
  await sleep(3000);
  const t = logSince(off);
  const ach = rows(t, /achievement-portalToNether/);
  say('surv achievement rows=' + ach.length);
  ach.forEach((l) => say('   ' + cut(l.trim(), 210)));
  say('surv target now air? ' + /minecraft:air|Air/i.test(await probe(x, y, z, 'minecraft:air')));
  await chat('advancement test ' + NAME + ' etim:portal_to_nether');
  await sleep(1500);
  say('chat: ' + JSON.stringify(replies.slice(-4)));
  say('soe=' + count(t, /StackOverflowError/));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
