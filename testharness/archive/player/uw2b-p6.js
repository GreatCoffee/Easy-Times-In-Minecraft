#!/usr/bin/env node
/**
 * uw2b-p6.js — WP6 / F-5-48 成就面（v2）
 *  ① 自然环境量化：y=1/2 横切 16×16，统计真实方块名（mantle / bedrock / stone）
 *  ② 自然候选优先：非 mantle、非 bedrock 且四邻有 mantle 的块 → 直接挖
 *  ③ 无自然候选 → 构造面：在 y=5 放 stone 目标块 + 邻格 mantle_or_core，挖目标块
 *     （触发条件只看 dim=-2 / y<6 / 横向邻格是 MANTLE_OR_CORE，构造面走同一代码路径）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const STATE = path.join(ROOT, 'build-logs', 'uw2b-state.json');
const NAME = 'ETIM_Harn01';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 200) ? l.slice(0, n || 200) : l);
const st = (() => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } })();

function syncDim() {
  const t = logAll();
  let dim = 0;
  for (const l of t.split('\n')) {
    if (/\[DimLog\] enter player=.*to=-2/.test(l)) dim = -2;
    else if (/\[DimLog\] leave player=.*to=0/.test(l)) dim = 0;
    else { const m = l.match(/\[DimLog\] portal-place dim=(-?\d+)/); if (m) dim = Number(m[1]); }
  }
  return dim;
}

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
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(400); };
  const probe = async (x, y, z, blk) => {
    const n0 = replies.length;
    bot.chat(`/testforblock ${x} ${y} ${z} ${blk}`);
    await sleep(330);
    const got = replies.slice(n0).join(' | ');
    if (/Successfully found/.test(got)) return blk;
    const m = got.match(/is (.+?) \(expected/);
    return m ? m[1] : '?';
  };
  const pos = async () => {
    try { const echo = await rcon.cmd('tp ' + NAME + ' ~ ~ ~');
      const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
      return m ? { x: +m[1], y: +m[2], z: +m[3] } : null; } catch (e) { return null; }
  };
  const ap = st.arrive || { x: -108, y: 218, z: 201 };
  const bx = Math.floor(ap.x), bz = Math.floor(ap.z);

  say('WP6 start dim=' + syncDim() + ' pos=' + JSON.stringify(await pos()));
  await chat('gamemode 0');
  await chat('effect @p clear');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('gamerule doMobSpawning false');

  const FAST = process.argv[2] === 'fast';
  // ① 自然环境量化（y=1 / y=2，16×16 采样；只取实际方块名）
  const hist = {};
  if (!FAST)
  if (!FAST) { for (const y of [1, 2]) {
    for (let dx = 0; dx < 16; dx++) for (let dz = 0; dz < 16; dz++) {
      const name = await probe(bx + dx, y, bz + dz, 'etim:mantle_or_core');
      hist[name] = (hist[name] || 0) + 1;
    }
  } }
  say('WP6 自然横切 y=1/2 (16x16x2=512 点) 方块名分布: ' + JSON.stringify(hist));

  // ② 自然候选：非 mantle / 非 bedrock 且四邻有 mantle
  let cand = null;
  if (!FAST) for (const y of [1, 2]) {
    for (let dx = 0; dx < 16 && !cand; dx++) for (let dz = 0; dz < 16 && !cand; dz++) {
      const x = bx + dx, z = bz + dz;
      const name = await probe(x, y, z, 'etim:mantle_or_core');
      if (/mantle|bedrock/i.test(name)) continue;
      for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
        if (/mantle/i.test(await probe(nx, y, nz, 'etim:mantle_or_core'))) { cand = { x, y, z, name }; break; }
      }
    }
    if (cand) break;
  }
  say('WP6 自然候选=' + JSON.stringify(cand));

  let target;
  if (cand) {
    target = { ...cand, mode: 'natural' };
    await chat(`fill ${cand.x} ${cand.y + 1} ${cand.z} ${cand.x} ${cand.y + 4} ${cand.z} minecraft:air`);
    await chat(`tp @p ${cand.x + 0.5} ${cand.y + 1} ${cand.z + 0.5}`);
  } else {
    // ③ 构造面 y=5：目标 stone + 邻格 mantle_or_core；玩家站侧面（不站在目标块上）
    const x = bx + 4, y = 5, z = bz + 4;
    await chat(`fill ${x - 2} ${y} ${z - 2} ${x + 2} ${y + 3} ${z + 2} minecraft:air`);
    await chat(`fill ${x - 2} ${y - 1} ${z - 2} ${x + 2} ${y - 1} ${z + 2} minecraft:stone`);
    await chat(`setblock ${x} ${y} ${z} minecraft:stone`);
    await chat(`setblock ${x + 1} ${y} ${z} etim:mantle_or_core 0`);
    await chat('gamemode 1'); // 创造面：瞬破，避免裸手 7.5s / 耐力门干扰
    await chat(`tp @p ${x + 0.5} ${y} ${z + 2.5}`);
    target = { x, y, z, mode: 'constructed', mantleAt: (x + 1) + ',' + y + ',' + z };
    say('WP6 构造面: stone@' + x + ',' + y + ',' + z + ' + mantle@' + target.mantleAt);
  }
  await sleep(2000);
  say('WP6 target=' + JSON.stringify(target)
    + ' 目标块(chat)=' + (await probe(target.x, target.y, target.z, 'minecraft:stone'))
    + ' 邻格 mantle=' + (await probe(target.x + 1, target.y, target.z, 'etim:mantle_or_core'))
    + ' pos=' + JSON.stringify(await pos()));

  const off = logOffset();
  const n0 = replies.length;
  try {
    await bot.lookAt(new Vec3(target.x + 0.5, target.y + 0.5, target.z + 0.5), true);
    await sleep(700);
    const blk = bot.blockAt(new Vec3(target.x, target.y, target.z));
    say('WP6 client view=' + (blk ? blk.name + '/' + blk.type : 'null'));
    if (blk && /stone/.test(blk.name)) await bot.dig(blk);
    else await bot.dig({ position: new Vec3(target.x, target.y, target.z), name: 'stone' });
  } catch (e) { say('WP6 dig err ' + e.message); }
  await sleep(3000);
  say('WP6 chat during dig: ' + JSON.stringify(replies.slice(n0).slice(0, 6)));
  const t = logSince(off);
  const ach = rows(t, /achievement-portalToNether/);
  say('WP6 achievement rows=' + ach.length);
  ach.forEach((l) => say('   ' + cut(l.trim(), 210)));
  say('WP6 目标块现为 air? ' + /minecraft:air|Air/i.test(await probe(target.x, target.y, target.z, 'minecraft:air')));
  await chat('advancement test ' + NAME + ' etim:portal_to_nether');
  await sleep(1500);
  say('WP6 soe=' + count(t, /StackOverflowError/));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
