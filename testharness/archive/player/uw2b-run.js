#!/usr/bin/env node
/**
 * uw2b-run.js — underworld 二阶段 A-1 修后重验窗 driver（会话七，2026-10-25 第二轮）
 *
 * 相对 uw2-run.js 的关键改动（均为工装面）：
 *  1) 判维改用「玩家世界 setblock 探针 + dim0 RCON testforblock」正反判（旧 execute+summon 探针有假阴性）；
 *  2) WP3/WP4 以新判行 [DimLog] portal-place 为服务端判维单源（B-2）；
 *  3) WP5 判行面 = [DimLog] portal-break（B-1），命令面 testforblock 作辅证；
 *  4) WP6 判块改走玩家 chat 面 testforblock（RCON 只在 dim0 执行，C-3），回复文本直接读实际方块名；
 *  5) 相位拆分，状态落 build-logs/uw2b-state.json。
 *
 * 相位：p1 wp1建门 | p2 wp2贴底 | p5 wp5破框 | p9 wp9珠链 | warm 预热 ±128 |
 *       p3 wp3到维+wp4回程命中/远端miss | p6 wp6成就 | p7 wp7矿支+wp8地牢统计 | p10 wp10箭面
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
const HOST = '127.0.0.1';
const MC_PORT = 25565;
const RCON_PORT = 25575;
const PW = 'etim27';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 200) ? l.slice(0, n || 200) : l);

function loadState() { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } }
function saveState(s) { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(s, null, 2)); }

/* ---------------------------------------------------------------- RCON */
class Rcon {
  constructor() { this.buf = Buffer.alloc(0); this.q = []; }
  connect() {
    return new Promise((res, rej) => {
      this.s = net.connect(RCON_PORT, HOST, () => res());
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
      const to = setTimeout(() => rej(new Error('rcon timeout: ' + b)), timeoutMs || 20000);
      this.q.push((x) => { clearTimeout(to); res(x); });
      this.s.write(this.pkt(id, t, b));
    });
  }
  async auth() { return this.send(1, 3, PW); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}

async function serverPos(rcon) {
  let echo = '';
  try { echo = await rcon.cmd('tp ' + NAME + ' ~ ~ ~', 25000); } catch (e) { return null; }
  const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) };
}

const f1 = (v) => (Math.round(v * 10) / 10).toString();

/**
 * 判维（B-4 精神）：`/setblock` 在 1.12 对未加载区块直接失败（本轮踩坑，作废），
 * 改以服务端日志单源判维 —— /etim dim <enter|leave> 各有一条 [DimLog] enter/leave player= 行；
 * 站门传送面另以 [DimLog] portal-place dim= 行更新。
 */
/** 日志末态判维（单源）：最后一条 enter(to=-2) / leave(to=0) / portal-place dim=X */
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

async function ensureDim(ctx, want) {
  const st = ctx.st;
  const cur = syncDim();
  st.currDim = cur;
  if (cur === want) return true;
  for (let attempt = 0; attempt < 5; attempt++) {
    const off = logOffset();
    await ctx.chat(want === -2 ? 'etim dim enter' : 'etim dim leave');
    for (let i = 0; i < 12; i++) {
      await sleep(1500);
      const t = logSince(off);
      if (want === -2 && /\[DimLog\] enter player=/.test(t)) {
        st.currDim = -2; ctx.save(); say('ensureDim -> -2 (log enter)'); return true;
      }
      if (want === 0 && /\[DimLog\] leave player=/.test(t)) {
        st.currDim = 0; ctx.save(); say('ensureDim -> 0 (log leave)'); return true;
      }
      if (/enter-reject cooldown/.test(t)) break;
    }
    say('ensureDim retry ' + (attempt + 1) + ' (cur=' + syncDim() + ' want=' + want + ')');
    await sleep(4000);
  }
  say('ensureDim FAILED cur=' + syncDim() + ' want=' + want);
  return false;
}

async function buffs(chat, spawn) {
  await chat('gamemode 0');
  await chat('effect @p clear');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('effect @p saturation 9999 4');
  if (spawn !== undefined) await chat('gamerule doMobSpawning ' + spawn);
  await chat('difficulty 1');
  await sleep(400);
}

/** 玩家 chat 面 testforblock：返回 {ok, actual} */
function makeChatProbe(ctx) {
  const replies = ctx.replies;
  return async function probe(x, y, z, blk) {
    const n0 = replies.length;
    ctx.bot.chat(`/testforblock ${x} ${y} ${z} ${blk}`);
    await sleep(330);
    const got = replies.slice(n0).map((r) => r.text).join(' | ');
    if (/Successfully found/.test(got)) return { ok: true, actual: blk };
    const m = got.match(/is (.+?) \(expected/);
    return { ok: false, actual: m ? m[1] : '?' };
  };
}

/* --------------------------------------------------------------- phases */

/** home: 强制回主世界（把状态标成 -2 后走 leave 日志门） */
async function home(ctx) {
  ctx.st.currDim = -2;
  ctx.save();
  const ok = await ensureDim(ctx, 0);
  const p = await serverPos(ctx.rcon);
  say('home ok=' + ok + ' pos=' + JSON.stringify(p) + ' currDim=' + ctx.st.currDim);
}

/** p1: WP1 建门（主世界悬空平台，非贴底面 → meta=0） */
async function p1(ctx) {
  const { rcon, chat, st } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon);
  if (!p) throw new Error('no server pos');
  const px = Math.floor(p.x), pz = Math.floor(p.z), gy = 150;
  await chat(`fill ${px - 8} ${gy - 1} ${pz - 8} ${px + 8} ${gy - 1} ${pz + 8} minecraft:stone`);
  await chat(`fill ${px - 8} ${gy} ${pz - 8} ${px + 8} ${gy + 6} ${pz + 8} minecraft:air`);
  await chat(`tp @p ${px + 0.5} ${gy} ${pz + 0.5}`);
  await sleep(1200);
  const ax = px, ay = gy, az = pz + 4;
  await chat(`fill ${ax - 1} ${ay} ${az} ${ax + 2} ${ay} ${az} minecraft:obsidian`);
  await chat(`fill ${ax - 1} ${ay + 4} ${az} ${ax + 2} ${ay + 4} ${az} minecraft:obsidian`);
  await chat(`fill ${ax - 1} ${ay + 1} ${az} ${ax - 1} ${ay + 3} ${az} minecraft:obsidian`);
  await chat(`fill ${ax + 2} ${ay + 1} ${az} ${ax + 2} ${ay + 3} ${az} minecraft:obsidian`);
  await chat(`fill ${ax} ${ay + 1} ${az} ${ax + 1} ${ay + 3} ${az} minecraft:air`);
  await sleep(500);
  const off = logOffset();
  await chat(`setblock ${ax} ${ay + 1} ${az} minecraft:fire`);
  await sleep(1800);
  const t = logSince(off);
  const cr = rows(t, /\[DimLog\] portal-create/);
  say('WP1 frameA ' + ax + ' ' + ay + ' ' + az + ' | portal-create rows=' + cr.length);
  cr.forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP1 portal cells:', await rcon.cmd(`testforblock ${ax} ${ay + 1} ${az} etim:portal`, 20000),
    '|', await rcon.cmd(`testforblock ${ax + 1} ${ay + 3} ${az} etim:portal`, 20000));
  st.frameA = { x: ax, y: ay, z: az };
  ctx.save();
}

/** p2: WP2 贴底门（框底 y=8 + 正下方 mantle_or_core → meta=1） */
async function p2(ctx) {
  const { rcon, chat, st } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon);
  const bx = Math.floor(p.x) - 40, bz = Math.floor(p.z) - 40;
  await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 15 ${bz + 6} minecraft:air`);
  await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 7 ${bz + 6} minecraft:stone`);
  await chat(`fill ${bx - 1} 7 ${bz} ${bx + 2} 7 ${bz} etim:mantle_or_core`);
  await chat(`fill ${bx - 1} 8 ${bz} ${bx + 2} 8 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx - 1} 12 ${bz} ${bx + 2} 12 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx - 1} 9 ${bz} ${bx - 1} 11 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx + 2} 9 ${bz} ${bx + 2} 11 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx} 9 ${bz} ${bx + 1} 11 ${bz} minecraft:air`);
  await sleep(500);
  const off = logOffset();
  await chat(`setblock ${bx} 9 ${bz} minecraft:fire`);
  await sleep(1800);
  const t = logSince(off);
  const cr = rows(t, /\[DimLog\] portal-create/);
  say('WP2 frameB ' + bx + ' 8 ' + bz + ' | portal-create rows=' + cr.length);
  cr.forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP2 mantle under frame (y=7):', await rcon.cmd(`testforblock ${bx - 1} 7 ${bz} etim:mantle_or_core`, 20000));
  say('WP2 portal cells:', await rcon.cmd(`testforblock ${bx} 9 ${bz} etim:portal`, 20000),
    '|', await rcon.cmd(`testforblock ${bx + 1} 11 ${bz} etim:portal`, 20000));
  st.frameB = { x: bx, y: 8, z: bz };
  ctx.save();
}

/** p5: WP5 破框（判行 portal-break ×6） */
async function p5(ctx) {
  const { rcon, chat, st } = ctx;
  const fa = st.frameA;
  if (!fa) throw new Error('no frameA');
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  await chat(`tp @p ${fa.x + 0.5} ${fa.y + 1} ${fa.z + 4.5}`);
  await sleep(1000);
  let before = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
    const r = await rcon.cmd(`testforblock ${fa.x + dx} ${fa.y + dy} ${fa.z} etim:portal`, 20000);
    if (/success/i.test(String(r))) before++;
  }
  say('WP5 before portal cells = ' + before + '/6');
  const off = logOffset();
  await chat(`setblock ${fa.x} ${fa.y} ${fa.z} minecraft:air`);
  await sleep(1500);
  const t = logSince(off);
  const br = rows(t, /\[DimLog\] portal-break/);
  say('WP5 portal-break rows = ' + br.length);
  br.forEach((l) => say('   ' + cut(l.trim(), 190)));
  let after = 0;
  for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
    const r = await rcon.cmd(`testforblock ${fa.x + dx} ${fa.y + dy} ${fa.z} minecraft:air`, 20000);
    if (/success/i.test(String(r))) after++;
  }
  say('WP5 after air cells = ' + after + '/6');
  say('WP5 soe rows = ' + count(t, /StackOverflowError/));
}

/** p9: WP9 主世界手采 gravel 珠链（fortune=3） */
async function p9(ctx) {
  const { rcon, bot, chat } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon);
  const gx = Math.floor(p.x) + 40, gz = Math.floor(p.z) + 40, gy = 150;
  await chat(`fill ${gx - 8} ${gy - 1} ${gz - 8} ${gx + 8} ${gy - 1} ${gz + 8} minecraft:stone`);
  await chat(`fill ${gx - 8} ${gy} ${gz - 8} ${gx + 8} ${gy} ${gz + 8} minecraft:gravel`);
  await chat(`fill ${gx - 8} ${gy + 1} ${gz - 8} ${gx + 8} ${gy + 1} ${gz + 8} minecraft:gravel`);
  await chat('give @p minecraft:diamond_shovel 1 0 {ench:[{id:32,lvl:5},{id:35,lvl:3},{id:34,lvl:3}]}');
  await sleep(900);
  const sh = bot.inventory.items().find((i) => /diamond_shovel/.test(i.name || ''));
  if (sh) { try { await bot.equip(sh, 'hand'); } catch (e) { say('WP9 equip err ' + e.message); } }
  await sleep(500);
  const off = logOffset();
  let dug = 0, fail = 0;
  const stands = [];
  for (let sx = gx - 8; sx <= gx + 8; sx += 4) for (let sz = gz - 8; sz <= gz + 8; sz += 4) stands.push({ x: sx, z: sz });
  for (const sp of stands) {
    await chat(`tp @p ${sp.x + 0.5} ${gy + 2} ${sp.z + 0.5}`);
    await sleep(350);
    for (let pass = 0; pass < 3; pass++) {
      const cands = [];
      const pp = bot.entity.position;
      for (let dx = -4; dx <= 4; dx++) for (let dz = -4; dz <= 4; dz++) for (const y of [gy, gy + 1]) {
        const x = Math.floor(pp.x) + dx, z = Math.floor(pp.z) + dz;
        if (Math.abs(x - gx) > 8 || Math.abs(z - gz) > 8) continue;
        const b = bot.blockAt(new Vec3(x, y, z));
        if (!b || b.name !== 'gravel') continue;
        const d = Math.hypot(x + 0.5 - pp.x, y + 0.5 - (pp.y + 1.6), z + 0.5 - pp.z);
        if (d > 4.0) continue;
        cands.push({ b, d });
      }
      if (!cands.length) break;
      cands.sort((a, b) => a.d - b.d);
      for (const c of cands) {
        try { await bot.dig(c.b); dug++; } catch (e) { fail++; }
        await sleep(40);
      }
      if (dug >= 90) break;
    }
    if (dug >= 90) break;
  }
  await sleep(1500);
  const t = logSince(off);
  const rr = rows(t, /\[MiningLog\] gravel-nugget ore=/);
  const dist = {};
  rr.forEach((l) => { const m = l.match(/ore=(\S+) fortune=(\d+)/); if (m) dist[m[1]] = (dist[m[1]] || 0) + 1; });
  say('WP9 dug=' + dug + ' fail=' + fail + ' rows=' + rr.length
    + ' chainRate=' + (dug ? (rr.length / dug).toFixed(3) : 'n/a'));
  Object.keys(dist).sort((a, b) => dist[b] - dist[a]).forEach((k) => say('   ' + k + ' = ' + dist[k] + ' (' + (dist[k] / rr.length).toFixed(4) + ')'));
  rr.slice(0, 2).forEach((l) => say('   ' + cut(l.trim(), 180)));
}

/** warm: 进 underworld 并以 tp 网格预热 ±96（view-distance=4） */
async function warm(ctx) {
  const { rcon, chat } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon);
  const cx = Math.floor(p.x) - 40, cz = Math.floor(p.z) - 40;
  const off = logOffset();
  await chat('etim dim enter');
  await sleep(5000);
  ctx.st.currDim = -2; ctx.save();
  const land = await serverPos(rcon);
  say('warm landing ' + JSON.stringify(land) + ' dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      await chat(`tp @p ${Math.floor(land.x) + dx * 48 + 0.5} ${Math.floor(land.y)} ${Math.floor(land.z) + dz * 48 + 0.5}`);
      await sleep(1800);
    }
  }
  await chat(`tp @p ${Math.floor(land.x) + 0.5} ${Math.floor(land.y)} ${Math.floor(land.z) + 0.5}`);
  await sleep(2500);
  const t = logSince(off);
  say('warm gen=' + count(t, /\[DimLog\] gen chunk=/)
    + ' soe=' + count(t, /StackOverflowError/)
    + ' oreRows=' + count(t, /\[OreLog\] ore=/)
    + ' dungeon=' + count(t, /\[SpawnLog\] dungeon/)
    + ' chest=' + count(t, /\[TestLog\] dungeon-chest/));
  ctx.st.warmLand = land;
  ctx.save();
  await chat('etim dim leave');
  await sleep(3000);
  ctx.st.currDim = 0; ctx.save();
  say('warm back dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
}

/** p3: WP3 站门到维（portal-place dim=-2）+ WP4 回程命中（portal-place dim=0）+ 远端 miss（portal-build） */
async function p3(ctx) {
  const { rcon, chat, st } = ctx;
  const fb = st.frameB;
  if (!fb) throw new Error('no frameB');
  await ensureDim(ctx, 0);
  await buffs(chat, true);
  await chat(`tp @p ${fb.x + 0.5} 9 ${fb.z + 0.5}`);
  await sleep(800);
  const off = logOffset();
  let arrive = null;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    const t = logSince(off);
    if (/\[DimLog\] portal-place dim=-2/.test(t)) { arrive = t.match(/\[DimLog\] portal-place dim=-2[^\n]*/)[0]; break; }
  }
  const tA = logSince(off);
  if (count(tA, /portal-place dim=-2/) > 0) { st.currDim = -2; ctx.save(); }
  say('WP3 portal-place dim=-2 = ' + count(tA, /portal-place dim=-2/) + ' | build=' + count(tA, /portal-build/));
  rows(tA, /\[DimLog\] portal-(place|build|enter)/).slice(0, 6).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP3 soe=' + count(tA, /StackOverflowError/) + ' | dim now=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
  const posA = await serverPos(rcon);
  say('WP3 pos after arrival = ' + JSON.stringify(posA));
  if (!posA) throw new Error('no pos after arrival');
  st.arrive = posA;
  ctx.save();
  // 落点清一小块安全台，避免站在到维门里二次传送
  await chat(`fill ${Math.floor(posA.x) - 1} ${Math.floor(posA.y) - 1} ${Math.floor(posA.z) + 2} ${Math.floor(posA.x) + 3} ${Math.floor(posA.y) + 3} ${Math.floor(posA.z) + 4} minecraft:air`);
  await chat(`fill ${Math.floor(posA.x) - 1} ${Math.floor(posA.y) - 1} ${Math.floor(posA.z) + 2} ${Math.floor(posA.x) + 3} ${Math.floor(posA.y) - 1} ${Math.floor(posA.z) + 4} minecraft:stone`);
  await chat(`tp @p ${Math.floor(posA.x) + 1.5} ${Math.floor(posA.y)} ${Math.floor(posA.z) + 3.5}`);
  await sleep(4000);
  say('WP3 gen rows=' + count(logSince(off), /gen chunk=/) + ' dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));

  // WP4 回程命中：站回 arrivals 门 → 主世界 frameB ±128 命中
  const off2 = logOffset();
  await chat(`tp @p ${Math.floor(posA.x) + 0.5} ${Math.floor(posA.y)} ${Math.floor(posA.z) + 0.5}`);
  let hit = null;
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    if (/\[DimLog\] portal-place dim=0/.test(logSince(off2))) { hit = i + 1; break; }
  }
  const tB = logSince(off2);
  if (count(tB, /portal-place dim=0/) > 0) { st.currDim = 0; ctx.save(); }
  say('WP4 hit: portal-place dim=0 rows=' + count(tB, /portal-place dim=0/)
    + ' build=' + count(tB, /portal-build/) + ' after ' + hit + 's');
  rows(tB, /\[DimLog\] portal-(place|build)/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  const posHit = await serverPos(rcon);
  const dx = posHit ? Math.abs(posHit.x - (fb.x + 0.5)) : -1;
  const dz = posHit ? Math.abs(posHit.z - (fb.z + 0.5)) : -1;
  say('WP4 hit landing ' + JSON.stringify(posHit) + ' vs frameB dx=' + (dx >= 0 ? dx.toFixed(1) : 'n/a')
    + ' dz=' + (dz >= 0 ? dz.toFixed(1) : 'n/a'));
  st.hitLand = posHit;
  ctx.save();

  // WP4 miss（underworld 远端建 meta=0 门 → 主世界无 ±128 门 → portal-build）
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  const far = { x: Math.floor(st.arrive.x) + 600, z: Math.floor(st.arrive.z) + 600 };
  await chat(`tp @p ${far.x + 0.5} 200 ${far.z + 0.5}`);
  await sleep(8000);
  const pf = await serverPos(rcon);
  say('WP4 miss far site ' + JSON.stringify(pf) + ' dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
  const fy = 200;
  await chat(`fill ${far.x - 5} ${fy - 1} ${far.z - 5} ${far.x + 6} ${fy - 1} ${far.z + 5} minecraft:stone`);
  await chat(`fill ${far.x - 5} ${fy} ${far.z - 5} ${far.x + 6} ${fy + 6} ${far.z + 5} minecraft:air`);
  await chat(`tp @p ${far.x + 0.5} ${fy} ${far.z + 0.5}`);
  await sleep(1200);
  await chat(`fill ${far.x - 1} ${fy} ${far.z} ${far.x + 2} ${fy} ${far.z} minecraft:obsidian`);
  await chat(`fill ${far.x - 1} ${fy + 4} ${far.z} ${far.x + 2} ${fy + 4} ${far.z} minecraft:obsidian`);
  await chat(`fill ${far.x - 1} ${fy + 1} ${far.z} ${far.x - 1} ${fy + 3} ${far.z} minecraft:obsidian`);
  await chat(`fill ${far.x + 2} ${fy + 1} ${far.z} ${far.x + 2} ${fy + 3} ${far.z} minecraft:obsidian`);
  await chat(`fill ${far.x} ${fy + 1} ${far.z} ${far.x + 1} ${fy + 3} ${far.z} minecraft:air`);
  const offI = logOffset();
  await chat(`setblock ${far.x} ${fy + 1} ${far.z} minecraft:fire`);
  await sleep(2000);
  rows(logSince(offI), /portal-create/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  const off3 = logOffset();
  await chat(`tp @p ${far.x + 0.5} ${fy + 1} ${far.z + 0.5}`);
  let miss = null;
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    const tt = logSince(off3);
    if (/\[DimLog\] portal-place dim=0/.test(tt)) { miss = i + 1; break; }
  }
  const tC = logSince(off3);
  if (count(tC, /portal-place dim=0/) > 0) { st.currDim = 0; ctx.save(); }
  say('WP4 miss: portal-build=' + count(tC, /portal-build/) + ' place dim=0=' + count(tC, /portal-place dim=0/)
    + ' after ' + miss + 's | dim now=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
  rows(tC, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP4 miss soe=' + count(tC, /StackOverflowError/));
  const posMiss = await serverPos(rcon);
  say('WP4 miss landing ' + JSON.stringify(posMiss));
  st.missLand = posMiss;
  ctx.save();
}

/** 建一个 4×5 obsidian 框并点火（cavity 沿 x，2 宽 3 高）；返回 create 行 */
async function buildFrame(ctx, x, y, z) {
  const { chat } = ctx;
  await chat(`fill ${x - 1} ${y} ${z} ${x + 2} ${y} ${z} minecraft:obsidian`);
  await chat(`fill ${x - 1} ${y + 4} ${z} ${x + 2} ${y + 4} ${z} minecraft:obsidian`);
  await chat(`fill ${x - 1} ${y + 1} ${z} ${x - 1} ${y + 3} ${z} minecraft:obsidian`);
  await chat(`fill ${x + 2} ${y + 1} ${z} ${x + 2} ${y + 3} ${z} minecraft:obsidian`);
  await chat(`fill ${x} ${y + 1} ${z} ${x + 1} ${y + 3} ${z} minecraft:air`);
  const off = logOffset();
  await chat(`setblock ${x} ${y + 1} ${z} minecraft:fire`);
  await sleep(1800);
  return rows(logSince(off), /\[DimLog\] portal-create/).map((l) => cut(l.trim(), 190));
}

/**
 * p4：受控实验定位 WP4「±128 命中回程」失败根因
 *  a 控制组：underworld 手建 meta=0 门 → 回主世界（主世界只有 frameB meta=1 在 8 格外）→ 期望 build=1（不命中）
 *  b 实验组：主世界另建一个 meta=0 门（同 x/z、y=150）→ 再从同一 underworld 门回程 → 期望 build=0 且落该门
 */
async function p4(ctx) {
  const { rcon, chat, st } = ctx;
  const fb = st.frameB;
  const dx0 = fb.x + 20, dz0 = fb.z; // 与 frameB 相距 20 格
  // 1) 到 underworld，在 (dx0, 218, dz0) 手建 meta=0 门
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  await chat(`fill ${dx0 - 6} 216 ${dz0 - 6} ${dx0 + 6} 224 ${dz0 + 6} minecraft:air`);
  await chat(`fill ${dx0 - 6} 217 ${dz0 - 6} ${dx0 + 6} 217 ${dz0 + 6} minecraft:stone`);
  await chat(`tp @p ${dx0 + 0.5} 218 ${dz0 + 0.5}`);
  await sleep(2500);
  const createUw = await buildFrame(ctx, dx0, 218, dz0);
  say('WP4 exp underworld door create=' + JSON.stringify(createUw));
  const uwDoor = { x: dx0, y: 218, z: dz0 };
  st.uwDoor = uwDoor; ctx.save();

  // 2) 控制组：直接站门回主世界 → 期望 portal-build=1（主世界无 meta=0 门在 ±128）
  const offA = logOffset();
  await chat(`tp @p ${dx0 + 0.5} 219 ${dz0 + 0.5}`);
  let hitA = null;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    if (/\[DimLog\] portal-place dim=0/.test(logSince(offA))) { hitA = i + 1; break; }
  }
  const tA = logSince(offA);
  say('WP4-A 控制组: portal-build=' + count(tA, /portal-build/) + ' place dim=0=' + count(tA, /portal-place dim=0/)
    + ' after ' + hitA + 's');
  rows(tA, /\[DimLog\] portal-(place|build)/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  const landA = await serverPos(rcon);
  say('WP4-A landing ' + JSON.stringify(landA) + ' vs frameB d='
    + (landA ? Math.hypot(landA.x - fb.x, landA.z - fb.z).toFixed(1) : 'n/a'));
  if (count(tA, /portal-place dim=0/) > 0) { st.currDim = 0; ctx.save(); }

  // 3) 主世界加一个 meta=0 门（同 x/z，y=150）作为「±128 内的合法回程门」
  await ensureDim(ctx, 0);
  await buffs(chat, true);
  await chat(`fill ${dx0 - 6} 148 ${dz0 - 6} ${dx0 + 6} 156 ${dz0 + 6} minecraft:air`);
  await chat(`fill ${dx0 - 6} 149 ${dz0 - 6} ${dx0 + 6} 149 ${dz0 + 6} minecraft:stone`);
  await chat(`tp @p ${dx0 + 0.5} 150 ${dz0 + 0.5}`);
  await sleep(1500);
  const createOw = await buildFrame(ctx, dx0, 150, dz0);
  say('WP4 exp overworld meta=0 door create=' + JSON.stringify(createOw));

  // 4) 回 underworld（命令面）→ 站同一门 → 期望 build=0 且落在 y=150 的门
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  await chat(`tp @p ${dx0 + 0.5} 219 ${dz0 + 0.5}`);
  await sleep(2000);
  const offB = logOffset();
  await chat(`tp @p ${dx0 + 0.5} 219 ${dz0 + 0.5}`);
  let hitB = null;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    if (/\[DimLog\] portal-place dim=0/.test(logSince(offB))) { hitB = i + 1; break; }
  }
  const tB = logSince(offB);
  say('WP4-B 实验组: portal-build=' + count(tB, /portal-build/) + ' place dim=0=' + count(tB, /portal-place dim=0/)
    + ' after ' + hitB + 's');
  rows(tB, /\[DimLog\] portal-(place|build)/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  const landB = await serverPos(rcon);
  say('WP4-B landing ' + JSON.stringify(landB));
  if (count(tB, /portal-place dim=0/) > 0) { st.currDim = 0; ctx.save(); }
  say('WP4 soe=' + count(tB, /StackOverflowError/));
}

/** p6: WP6 成就（underworld y<6 挖横向贴 mantle 的块） */
async function p6(ctx) {
  const { rcon, bot, chat, st } = ctx;
  await ensureDim(ctx, -2);
  await buffs(chat, false);
  const ap = st.arrive || { x: 0, y: 166, z: 0 };
  const bx = Math.floor(ap.x), bz = Math.floor(ap.z);
  // 先落到已知区块中心附近，避免再生成
  await chat(`tp @p ${bx + 0.5} 170 ${bz + 0.5}`);
  await sleep(2500);
  const probe = ctx.probe;
  // 服务端侧（玩家 chat 面）扫 y=1..2 的横向 mantle 邻接石
  let cand = null, mantleHits = 0, probes = 0;
  outer:
  for (const y of [1, 2]) {
    for (let dx = 0; dx < 10; dx++) {
      for (let dz = 0; dz < 10; dz++) {
        const x = bx + dx, z = bz + dz;
        probes++;
        const self = await probe(x, y, z, 'etim:mantle_or_core');
        if (self.ok) { mantleHits++; continue; }
        const nb = await probe(x + 1, y, z, 'etim:mantle_or_core');
        probes++;
        if (!nb.ok) continue;
        if (/bedrock|mantle/i.test(self.actual)) continue;
        cand = { x, y, z, self: self.actual };
        break outer;
      }
    }
  }
  say('WP6 cand=' + JSON.stringify(cand) + ' mantleHits=' + mantleHits + ' probes=' + probes);
  if (!cand) throw new Error('no mantle-adjacent cell');
  // 开一个可站的位：目标块上方两格清空，玩家站在目标块上
  await chat(`setblock ${cand.x} ${cand.y + 1} ${cand.z} minecraft:air`);
  await chat(`setblock ${cand.x} ${cand.y + 2} ${cand.z} minecraft:air`);
  await chat(`tp @p ${cand.x + 0.5} ${cand.y + 2} ${cand.z + 0.5}`);
  await sleep(1500);
  const blk = bot.blockAt(new Vec3(cand.x, cand.y, cand.z));
  say('WP6 client view=' + (blk ? blk.name : 'null') + ' | server=' + (await probe(cand.x, cand.y, cand.z, 'minecraft:stone')).actual);
  const off = logOffset();
  try {
    await bot.lookAt(new Vec3(cand.x + 0.5, cand.y + 0.5, cand.z + 0.5), true);
    await sleep(400);
    await bot.dig(blk || { position: new Vec3(cand.x, cand.y, cand.z), name: cand.self });
  } catch (e) { say('WP6 dig err ' + e.message); }
  await sleep(2500);
  const t = logSince(off);
  const ach = rows(t, /achievement-portalToNether/);
  say('WP6 achievement rows=' + ach.length);
  ach.forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP6 target now=' + (await probe(cand.x, cand.y, cand.z, 'minecraft:air')).ok);
  await chat('advancement test ' + NAME + ' etim:portal_to_nether');
  await sleep(1200);
  say('WP6 soe=' + count(t, /StackOverflowError/));
}

/** p7: WP7 矿支 sweep（≥32 chunk 无崩）+ WP8 地牢统计 */
async function p7(ctx) {
  const { rcon, bot, chat, st } = ctx;
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  const ap = st.arrive || { x: 0, y: 166, z: 0 };
  const bx = Math.floor(ap.x) + 200, bz = Math.floor(ap.z) + 200;
  const off = logOffset();
  await chat(`tp @p ${bx + 0.5} 200 ${bz + 0.5}`);
  await sleep(6000);
  for (let i = 0; i < 12; i++) {
    await chat(`tp @p ~24 ~ ~`);
    await sleep(2200);
    const t = logSince(off);
    say('WP7 step ' + (i + 1) + ' gen=' + count(t, /gen chunk=/) + ' ore=' + count(t, /\[OreLog\] ore=/)
      + ' dungeon=' + count(t, /\[SpawnLog\] dungeon/) + ' soe=' + count(t, /StackOverflowError/));
  }
  await sleep(3000);
  const t = logSince(off);
  const chunks = new Set();
  rows(t, /\[OreLog\] ore=ore_adamantium dim=-2 chunk=\((-?\d+),(-?\d+)\)/).forEach((l) => {
    const m = l.match(/chunk=\((-?\d+),(-?\d+)\)/); if (m) chunks.add(m[1] + ',' + m[2]);
  });
  const adam = rows(t, /\[OreLog\] ore=ore_adamantium/);
  const rolls = new Set(adam.map((l) => (l.match(/rolls=(\d+)/) || [])[1]));
  const veins = adam.map((l) => Number((l.match(/veins=(\d+)/) || [])[1] || 0));
  const meanVeins = veins.length ? (veins.reduce((a, b) => a + b, 0) / veins.length) : 0;
  say('WP7 adamantium rows=' + adam.length + ' chunks=' + chunks.size + ' rollsSet={' + [...rolls].join(',') + '}'
    + ' veins/chunk=' + meanVeins.toFixed(2));
  const dg = rows(t, /\[SpawnLog\] dungeon/);
  const guard = dg.filter((l) => /spawner=longdead_guardian/.test(l)).length;
  const chest = rows(t, /\[TestLog\] dungeon-chest/);
  const chest16 = chest.filter((l) => /rows=16/.test(l)).length;
  say('WP8 dungeon rows=' + dg.length + ' guardian=' + guard
    + ' ratio=' + (dg.length ? (guard / dg.length).toFixed(4) : 'n/a')
    + ' | chest rows=' + chest.length + ' rows=16 hits=' + chest16);
  const dchunks = new Set(dg.map((l) => {
    const m = l.match(/x=(-?\d+) y=(-?\d+) z=(-?\d+)/);
    return m ? (Math.floor(Number(m[1]) / 16)) + ',' + (Math.floor(Number(m[3]) / 16)) : '?';
  }));
  say('WP8 dungeon chunk span=' + dchunks.size + ' | gen chunks=' + count(t, /gen chunk=/));
  dg.slice(0, 5).forEach((l) => say('   ' + cut(l.trim(), 190)));
  chest.slice(0, 3).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP7 soe=' + count(t, /StackOverflowError/) + ' | watchdog rows=' + count(t, /watchdog|Timed out/i));
  const pos = await serverPos(rcon);
  say('WP7 end pos ' + JSON.stringify(pos) + ' dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
}

/** p10: WP10 箭面（underworld ranged longdead → 落地 vanilla arrow） */
async function p10(ctx) {
  const { rcon, bot, chat, st } = ctx;
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  const ap = st.arrive || { x: 0, y: 166, z: 0 };
  const x0 = Math.floor(ap.x) + 4, y0 = 200, z0 = Math.floor(ap.z) + 4;
  await chat(`fill ${x0 - 5} ${y0 - 1} ${z0 - 5} ${x0 + 5} ${y0 - 1} ${z0 + 5} minecraft:stone`);
  await chat(`fill ${x0 - 5} ${y0} ${z0 - 5} ${x0 + 5} ${y0 + 6} ${z0 + 5} minecraft:air`);
  await chat(`tp @p ${x0 + 0.5} ${y0} ${z0 + 0.5}`);
  await sleep(1500);
  say('WP10 platform pos=' + JSON.stringify(await serverPos(rcon)) + ' dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=arrow,r=40]');
  await sleep(600);
  const off = logOffset();
  let ranged = false;
  for (let i = 0; i < 12 && !ranged; i++) {
    await chat('kill @e[type=etim:longdead]');
    await sleep(250);
    const o2 = logOffset();
    await chat(`summon etim:longdead ${x0 + 3.5} ${y0} ${z0 + 3.5}`);
    await sleep(1300);
    const tt = logSince(o2);
    ranged = /longdead equip type=ranged/.test(tt);
    say('WP10 try ' + (i + 1) + ' ranged=' + ranged
      + ' equip=' + rows(tt, /longdead equip/).map((l) => cut(l.trim(), 140)).join(' || '));
  }
  for (let i = 0; i < 25; i++) {
    await chat(`tp @p ${x0 + 0.5} ${y0} ${z0 + 0.5}`);
    await sleep(1200);
    if (count(logSince(off), /longdead arrow intended/) > 0) break;
  }
  const t = logSince(off);
  const ar = rows(t, /longdead arrow intended/);
  say('WP10 arrow intended rows=' + ar.length);
  ar.slice(0, 4).forEach((l) => say('   ' + cut(l.trim(), 190)));
  await sleep(3000);
  const off2 = logOffset();
  await chat('/execute @e[type=arrow,r=40] ~ ~ ~ say UW2B_ARROW_VANILLA');
  await sleep(1200);
  await chat('/execute @e[type=etim:arrow] ~ ~ ~ say UW2B_ETIM_ARROW');
  await sleep(1200);
  const t2 = logSince(off2);
  say('WP10 vanilla-arrow say rows=' + count(t2, /UW2B_ARROW_VANILLA/)
    + ' | etim:arrow rows=' + count(t2, /UW2B_ETIM_ARROW/));
  rows(t2, /UW2B_ARROW_VANILLA|Entity type 'etim:arrow' is invalid|UW2B_ETIM_ARROW/).slice(0, 4)
    .forEach((l) => say('   ' + cut(l.trim(), 170)));
  say('WP10 soe=' + count(t, /StackOverflowError/) + ' dim=' + (ctx.st.currDim===undefined?0:ctx.st.currDim));
}

/* ------------------------------------------------------------------ main */
(async () => {
  const phase = (process.argv[2] || 'p1').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect();
  await rcon.auth();
  const bot = await createHarnBot({ host: HOST, port: MC_PORT, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  const replies = [];
  bot.on('message', (m) => { replies.push({ t: Date.now(), text: m.toString() }); });
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(380); };
  const st = loadState();
  const ctx = { rcon, bot, chat, st, replies, save: () => saveState(st) };
  ctx.probe = makeChatProbe(ctx);
  say('PHASE ' + phase + ' bot=' + (bot.entity.position ? f1(bot.entity.position.x) + ',' + f1(bot.entity.position.y) + ',' + f1(bot.entity.position.z) : '?'));
  const P = { home, p1, p2, p4, p5, p9, warm, p3, p6, p7, p10 };
  if (!P[phase]) throw new Error('unknown phase ' + phase);
  await P[phase](ctx);
  say('PHASE ' + phase + ' done');
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
