#!/usr/bin/env node
// a2-probe.js — A-2 regression: perfectly-stacked weak-strike attack must not spin.
// Verdict source: latest.log — no "Took 60.000s" / watchDog crash; server survives.
'use strict';
const { createHarnBot } = require('./fmlbot');
const net = require('net');
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
  send(id, t, b) { return new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('to ' + b)), 15000); this.q.push((x) => { clearTimeout(to); res(x); }); this.s.write(this.pkt(id, t, b)); }); }
  async cmd(c) { return (await this.send(9, 2, c) || '').trim(); }
}
(async () => {
  const r = new Rcon();
  await r.connect(); await r.send(1, 3, 'etim27');
  const chat = (c) => r.cmd('execute ETIM_Harn01 ~ ~ ~ say ' + c); // fallback; real chat below
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: 'ETIM_Harn01' });
  await sleep(3000);
  const bc = async (c) => { bot.chat('/' + c); await sleep(450); };
  await bc('gamemode 0');
  await bc('effect @p regeneration 9999 3');
  await bc('effect @p resistance 9999 4');
  await bc('clear @p');
  // quiet the arena: freeze natural spawns + clear non-player entities near after tp
  await bc('gamerule doMobSpawning false');
  await bc('effect @p clear');
  const e0 = String(await r.cmd('tp ETIM_Harn01 ~ ~ ~')).replace(/\u0000/g, '');
  const m = e0.match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  const px = Math.floor(parseFloat(m[1])), py = Math.floor(parseFloat(m[2])), pz = Math.floor(parseFloat(m[3]));
  const fx = `${px + 0.5}`, fy = `${py}`, fz = `${pz + 0.5}`;
  await bc(`fill ${px - 5} ${py} ${pz - 5} ${px + 5} ${py + 4} ${pz + 5} minecraft:air`);
  await bc(`fill ${px - 5} ${py - 1} ${pz - 5} ${px + 5} ${py - 1} ${pz + 5} minecraft:stone`);
  await bc(`tp ETIM_Harn01 ${fx} ${fy} ${fz}`);
  await sleep(800);
  await bc('kill @e[type=!minecraft:player]');
  await sleep(800);
  await bc(`summon etim:longdead ${fx} ${fy} ${fz}`); // DEAD-ON stack (A-2 geology: eye inside tall hitbox ⇒ reach 0)
  await sleep(1500);
  const hp = (s) => { const mm = String(s).match(/Health:([\d.]+)/); return mm ? mm[1] : '?'; };
  console.log('HP0:', hp(await r.cmd('entitydata @e[type=etim:longdead,c=1] {}')));
  console.log('BOT_HEALTH:', bot.health, '(threshold=1000 ⇒ weak-strike branch forced)');
  const near = () => Object.values(bot.entities).filter((e) => e !== bot.entity && e.position
    && !(e.name && /^(item|arrow|fishing_bobber|xpORB)$/.test(e.name))
    && e.position.distanceTo(bot.entity.position) < 3);
  console.log('NEAR:', near().map((e) => `${e.name || '(noname)'}@${e.position.distanceTo(bot.entity.position).toFixed(3)}`).join(' | '));
  for (let i = 0; i < 6; i++) {
    const t0 = Date.now();
    for (const e of near()) { try { bot.attack(e); } catch (err) { console.log('ATTACK_ERR', err.message); } }
    await sleep(900);
    const t1 = await r.cmd('time query gametime'); // <2s ⇒ tick alive
    console.log(`atk${i + 1}: rtt=${Date.now() - t0}ms echo='${t1.replace(/\u0000/g, '').trim()}' near=${near().length} longdeadHP=${hp(await r.cmd('entitydata @e[type=etim:longdead,c=1] {}'))}`);
  }
  console.log('SERVER_ALIVE_IF_RTT_UNDER_3000 above');
  await bc('kill @e[type=etim:longdead]');
  await sleep(600);
  bot.quit();
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
