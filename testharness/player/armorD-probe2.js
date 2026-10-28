#!/usr/bin/env node
/**
 * armorD-probe2.js — 通道隔离探针（A-2：damageDebugLog 未接 config）
 *
 * 只看 mob 路（EntityLivingBase.applyArmorCalculations），不碰玩家路（A-1 崩溃面）。
 *   1) 召 NoAI 牛，读 Health（/entitydata {}）
 *   2) instant_damage（magic，非 absolute）打它 → 走 mob 护甲口注入
 *   3) 再读 Health（应有掉血 = 伤害真的落地）
 *   4) 数 [DamageLog] 行（etim.cfg 内已写 damageDebugLog=true）
 *
 * 判据：掉血成立 且 [DamageLog] 行数 = 0 → damageDebugLog 未从 config 读取（A 级）。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
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
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn01' });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  say('bot up pos=' + (bot.entity ? bot.entity.position.toString() : '-'));
  await rcon.cmd('gamerule doMobSpawning false');
  await rcon.cmd(`tp ETIM_Harn01 100.5 4 110.5`);
  await sleep(1500);
  await rcon.cmd('kill @e[type=!player]');
  await sleep(800);

  say('summon -> ' + (await rcon.cmd('summon minecraft:cow 100.5 4 110.5 {CustomName:"P2Cow",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}')));
  await sleep(1500);

  const readHealth = async () => {
    const r = String(await rcon.cmd('entitydata @e[name=P2Cow,c=1] {}', 8000));
    const m = r.match(/Health:\s*([-\d.]+)f?/);
    return m ? Number(m[1]) : null;
  };
  const h0 = await readHealth();
  say('health before=' + h0);
  const off = fs.statSync(LOG).size;
  say('effect -> ' + (await rcon.cmd('effect @e[name=P2Cow,c=1] minecraft:instant_damage 1 0', 8000)));
  await sleep(2500);
  const h1 = await readHealth();
  say('health after=' + h1 + ' delta=' + (h0 !== null && h1 !== null ? (h0 - h1) : '-'));

  const since = fs.readFileSync(LOG).slice(off).toString('utf8');
  const all = logAll();
  say('since-offset: [DamageLog]=' + count(since, /\[DamageLog\]/) + ' dmg=' + count(since, /dmg target=/) + ' prot=' + count(since, /prot target=/));
  say('whole-log:  [DamageLog]=' + count(all, /\[DamageLog\]/) + ' dmg=' + count(all, /dmg target=/) + ' prot=' + count(all, /prot target=/)
    + ' | ArrowLog hit=' + count(all, /arrow hit /));
  say('effect/entity tail:');
  since.split('\n').filter((l) => /P2Cow|cow|DamageLog|damage/i.test(l)).slice(-8).forEach((l) => console.log('   ' + l.slice(0, 170)));
  setTimeout(() => process.exit(0), 500);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
