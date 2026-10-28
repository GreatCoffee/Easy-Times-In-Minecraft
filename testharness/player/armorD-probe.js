#!/usr/bin/env node
/**
 * armorD-probe.js — 开窗前通道探针（会话七，2026-10-26）
 *
 * 目的：钉 [DamageLog] 通道是否可开（etim.cfg 写入 damageDebugLog=true 后是否出行）。
 * 做法：
 *   1) bot 上线，gamerule 收口，清场
 *   2) 空手 → 僵尸近战一次 → 记血量差（vanilla / R196 差异面）
 *   3) 换满套铜 → 僵尸近战一次 → 记血量差
 *   4) 全档 grep [DamageLog] / dmg / prot 行数
 * 判据：若 0 行 → 通道不可开（A 级阻断）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const NAME = 'ETIM_Harn01';
const GY = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const count = (t, re) => t.split('\n').filter((l) => re.test(l)).length;

class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.q = []; }
  connect() {
    return new Promise((res, rej) => {
      this.s = net.connect(25575, '127.0.0.1', () => res());
      this.s.on('error', rej);
      this.s.on('data', (d) => {
        this.buf = Buffer.concat([this.buf, d]);
        for (;;) {
          if (this.buf.length < 4) break;
          const n = this.buf.readInt32LE(0);
          if (this.buf.length < n + 4) break;
          const body = this.buf.slice(12, 4 + n).toString('utf8');
          this.buf = this.buf.slice(4 + n);
          const w = this.q.shift();
          if (w) w(body);
        }
      });
    });
  }
  pkt(id, t, b) {
    const bb = Buffer.from(b, 'utf8');
    const pl = Buffer.alloc(10 + bb.length);
    pl.writeInt32LE(id, 0); pl.writeInt32LE(t, 4); bb.copy(pl, 8);
    const o = Buffer.alloc(4 + pl.length);
    o.writeInt32LE(pl.length, 0); pl.copy(o, 4);
    return o;
  }
  send(id, t, b, timeoutMs) {
    return new Promise((res, rej) => {
      const to = setTimeout(() => rej(new Error('rcon timeout: ' + b)), timeoutMs || 25000);
      this.q.push((x) => { clearTimeout(to); res(x); });
      this.s.write(this.pkt(id, t, b));
    });
  }
  async auth() { return this.send(1, 3, 'etim27'); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}

(async () => {
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  say('rcon ok');
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(3000);
  say('bot up pos=' + (bot.entity ? bot.entity.position.toString() : '-'));

  await rcon.cmd('gamerule doMobSpawning false');
  await rcon.cmd('gamerule doDaylightCycle false');
  await rcon.cmd('gamerule keepInventory true');
  await rcon.cmd('gamerule naturalRegeneration false');
  await rcon.cmd('time set 1000');
  await rcon.cmd('difficulty 1');
  await rcon.cmd(`gamemode 0 ${NAME}`);
  await rcon.cmd(`tp ${NAME} 100.5 ${GY} 100.5`);
  await rcon.cmd('kill @e[type=!player]');
  await sleep(1200);

  const hp = () => bot.health;

  /* ---- arm 1: bare hand ---- */
  for (const s of ['head', 'chest', 'legs', 'feet']) {
    await rcon.cmd(`replaceitem entity ${NAME} slot.armor.${s} minecraft:air`);
  }
  await rcon.cmd(`effect ${NAME} clear`);
  await sleep(800);
  const h0 = hp();
  await rcon.cmd('summon minecraft:zombie 103.5 4 100.5 {CustomName:"PZ1",CustomNameVisible:0b,PersistenceRequired:1b}');
  await sleep(9000);
  const h1 = hp();
  await rcon.cmd('kill @e[type=minecraft:zombie]');
  await sleep(600);
  say('arm1 bare: hp ' + h0 + ' -> ' + h1 + ' delta=' + (h0 - h1).toFixed(3));

  /* ---- arm 2: full copper ---- */
  await rcon.cmd(`tp ${NAME} 100.5 ${GY} 100.5`);
  await rcon.cmd(`replaceitem entity ${NAME} slot.armor.head etim:helmet_copper 1 0`);
  await rcon.cmd(`replaceitem entity ${NAME} slot.armor.chest etim:chestplate_copper 1 0`);
  await rcon.cmd(`replaceitem entity ${NAME} slot.armor.legs etim:leggings_copper 1 0`);
  await rcon.cmd(`replaceitem entity ${NAME} slot.armor.feet etim:boots_copper 1 0`);
  await sleep(1500);
  const eq = ['head', 'chest', 'legs', 'feet'].map((s) => {
    const it = bot.inventory.slots[[5, 6, 7, 8][['head', 'chest', 'legs', 'feet'].indexOf(s)]];
    return s + '=' + (it ? it.name : 'null');
  }).join(',');
  say('arm2 armor slots: ' + eq);
  const h2 = hp();
  await rcon.cmd('summon minecraft:zombie 103.5 4 100.5 {CustomName:"PZ2",CustomNameVisible:0b,PersistenceRequired:1b}');
  await sleep(9000);
  const h3 = hp();
  await rcon.cmd('kill @e[type=minecraft:zombie]');
  say('arm2 copper: hp ' + h2 + ' -> ' + h3 + ' delta=' + (h2 - h3).toFixed(3));

  const all = logAll();
  say('log [DamageLog] rows=' + count(all, /\[DamageLog\]/)
    + ' dmg=' + count(all, /\[DamageLog\] dmg /)
    + ' prot=' + count(all, /\[DamageLog\] prot /)
    + ' arrow-hit=' + count(all, /arrow hit /));
  say('log tail:');
  all.split('\n').slice(-6).forEach((l) => console.log('   ' + l.slice(0, 150)));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
