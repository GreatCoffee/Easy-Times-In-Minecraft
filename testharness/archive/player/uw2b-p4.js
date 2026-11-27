#!/usr/bin/env node
/**
 * uw2b-p4.js — WP4「±128 命中回程」受控实验（v3：判维改为「日志末态同步」）
 *
 * 判维单源（B-4 精神）：整个 latest.log 里最后一条
 *   [DimLog] enter player=… to=-2  → -2
 *   [DimLog] leave player=… to=0   → 0
 *   [DimLog] portal-place dim=X    → X
 * 即玩家当前维。命令面 /etim dim 的 enter/leave 行本身带 from=，与此互补。
 *
 *  a 控制组：underworld 手建 meta=0 门（y=218）→ 回主世界；主世界 ±128 内无 meta=0 门
 *             （frameB 是 meta=1，不匹配）→ 期望 portal-build=1
 *  b 实验组：主世界手建 meta=0 门（同 x/z、y=150）→ 从同一 underworld 门回程
 *             → 期望 portal-build=0 且 landing y≈150（命中）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
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
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } };
const saveState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));

/** 日志末态判维 */
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
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(400); };
  const st = loadState();
  const fb = st.frameB;
  const dx0 = fb.x + 20, dz0 = fb.z;

  const pos = async () => {
    try {
      const echo = await rcon.cmd('tp ' + NAME + ' ~ ~ ~');
      const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
      return m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
    } catch (e) { return null; }
  };
  const buildFrame = async (x, y, z) => {
    await chat(`fill ${x - 1} ${y} ${z} ${x + 2} ${y} ${z} minecraft:obsidian`);
    await chat(`fill ${x - 1} ${y + 4} ${z} ${x + 2} ${y + 4} ${z} minecraft:obsidian`);
    await chat(`fill ${x - 1} ${y + 1} ${z} ${x - 1} ${y + 3} ${z} minecraft:obsidian`);
    await chat(`fill ${x + 2} ${y + 1} ${z} ${x + 2} ${y + 3} ${z} minecraft:obsidian`);
    await chat(`fill ${x} ${y + 1} ${z} ${x + 1} ${y + 3} ${z} minecraft:air`);
    const off = logOffset();
    await chat(`setblock ${x} ${y + 1} ${z} minecraft:fire`);
    await sleep(1800);
    return rows(logSince(off), /\[DimLog\] portal-create/).map((l) => cut(l.trim(), 190));
  };
  const goto = async (want) => {
    let cur = syncDim();
    say('  syncDim=' + cur + ' want=' + want);
    if (cur === want) return true;
    for (let a = 0; a < 6; a++) {
      const off = logOffset();
      await chat(want === -2 ? 'etim dim enter' : 'etim dim leave');
      for (let i = 0; i < 12; i++) {
        await sleep(1500);
        const t = logSince(off);
        if (want === -2 && /enter player=.*to=-2/.test(t)) { say('  -> -2'); return true; }
        if (want === 0 && /leave player=.*to=0/.test(t)) { say('  -> 0'); return true; }
        if (/enter-reject/.test(t)) break;
      }
      say('  goto retry ' + (a + 1));
      await sleep(5000);
    }
    return false;
  };
  const travel = async (x, y, z, timeoutS) => {
    const off = logOffset();
    await chat(`tp @p ${x + 0.5} ${y} ${z + 0.5}`);
    let hit = null;
    for (let i = 0; i < timeoutS; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=0/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    return {
      build: count(t, /portal-build/), place0: count(t, /portal-place dim=0/), after: hit,
      rows: rows(t, /\[DimLog\] portal-(place|build)/).map((l) => cut(l.trim(), 190)),
    };
  };

  say('start dim(log)=' + syncDim() + ' pos=' + JSON.stringify(await pos()));

  // 0) 先回主世界，拆掉本轮误建的两扇 junk 门（y=218 / y=150），挪开玩家，等冷却
  if (!(await goto(0))) { say('ABORT: cannot reach overworld'); process.exit(2); }
  await chat(`fill ${dx0 - 1} 218 ${dz0} ${dx0 + 2} 222 ${dz0} minecraft:air`);
  await chat(`fill ${dx0 - 1} 150 ${dz0} ${dx0 + 2} 154 ${dz0} minecraft:air`);
  let p0 = await pos();
  await chat(`tp @p ${Math.floor(p0.x) + 0.5} ${Math.floor(p0.y)} ${Math.floor(p0.z) + 10}.5`);
  await sleep(20000);
  say('junk doors cleared; dim(log)=' + syncDim());

  // 1) 进 underworld，手建 meta=0 门（y=218）
  if (!(await goto(-2))) { say('ABORT: cannot enter underworld'); process.exit(2); }
  await chat('gamemode 0');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('gamerule doMobSpawning false');
  await chat(`fill ${dx0 - 6} 216 ${dz0 - 6} ${dx0 + 6} 224 ${dz0 + 6} minecraft:air`);
  await chat(`fill ${dx0 - 6} 217 ${dz0 - 6} ${dx0 + 6} 217 ${dz0 + 6} minecraft:stone`);
  await chat(`tp @p ${dx0 + 0.5} 218 ${dz0 + 0.5}`);
  await sleep(2500);
  say('uw door create=' + JSON.stringify(await buildFrame(dx0, 218, dz0)));

  // 2) 控制组
  const a = await travel(dx0, 219, dz0, 40);
  say('WP4-A control: build=' + a.build + ' place0=' + a.place0 + ' after=' + a.after + ' dim(log)=' + syncDim());
  a.rows.forEach((l) => say('   ' + l));
  const landA = await pos();
  say('WP4-A landing ' + JSON.stringify(landA));

  // 3) 主世界：拆掉控制组新建的门，另建 meta=0 门（同 x/z、y=150）
  if (landA) {
    await chat(`tp @p ${Math.floor(landA.x) + 0.5} ${Math.floor(landA.y)} ${Math.floor(landA.z) + 8}.5`);
    await chat(`fill ${Math.floor(landA.x) - 1} ${Math.floor(landA.y)} ${Math.floor(landA.z)} ${Math.floor(landA.x) + 2} ${Math.floor(landA.y) + 2} ${Math.floor(landA.z)} minecraft:air`);
  }
  await sleep(20000);
  await chat(`fill ${dx0 - 6} 148 ${dz0 - 6} ${dx0 + 6} 156 ${dz0 + 6} minecraft:air`);
  await chat(`fill ${dx0 - 6} 149 ${dz0 - 6} ${dx0 + 6} 149 ${dz0 + 6} minecraft:stone`);
  await chat(`tp @p ${dx0 + 0.5} 150 ${dz0 + 0.5}`);
  await sleep(1500);
  say('ow meta=0 door create=' + JSON.stringify(await buildFrame(dx0, 150, dz0)));

  // 4) 回 underworld，站同一门 → 期望命中 y=150 的门
  if (!(await goto(-2))) { say('ABORT step4'); process.exit(2); }
  await chat('effect @p resistance 9999 4');
  await chat('gamerule doMobSpawning false');
  await chat(`tp @p ${dx0 + 0.5} 219 ${dz0 + 0.5}`);
  await sleep(2500);
  const b = await travel(dx0, 219, dz0, 40);
  say('WP4-B hit: build=' + b.build + ' place0=' + b.place0 + ' after=' + b.after + ' dim(log)=' + syncDim());
  b.rows.forEach((l) => say('   ' + l));
  const landB = await pos();
  say('WP4-B landing ' + JSON.stringify(landB));
  say('soe rows(session)=' + count(logAll(), /StackOverflowError/));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 800);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
