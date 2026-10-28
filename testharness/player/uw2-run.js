#!/usr/bin/env node
/**
 * uw2-run.js — underworld 二阶段批 WP1~WP10 验证窗 driver（会话七，2026-10-25）
 *
 * 相位（每相位一次进程；坐标跨相位存 build-logs/uw2-state.json）：
 *   wp1  主世界悬空平台建 4×5 obsidian 框 + setblock fire 点火 → [DimLog] portal-create meta=0
 *   wp2  主世界 y=8 建框（框底 y=8 + 下方 mantle_or_core）→ portal-create meta=1（贴底面）
 *   warm 同 x/z 走 /etim dim enter → 等 [DimLog] gen chunk 收敛（预生成 ±128 邻域，
 *        避免 WP3 到维时 placeInExistingPortal ±128 扫描单 tick 生成 256 chunk 撞 watchdog）
 *   wp3  站进 WP2 的门（80 tick）→ portal-enter dest=-2 + 到维；再出/再进 → 回程命中面
 *   wp4b underworld 远处（+600/+600）建 meta=0 门 → 回程 miss → [DimLog] portal-build direction_of_travel=
 *   wp5  破 WP1 门一块 obsidian → 6 个门方块全散（testforblock air）
 *   wp6  underworld y<6 挖 mantle 邻块 → [DimLog] achievement-portalToNether + /advancement test
 *   wp7  underworld 扫街（~12×32 格）+ 全档 [OreLog]/[SpawnLog] dungeon/[TestLog] dungeon-chest 统计
 *   wp9  主世界悬空 gravel 场手采 → [MiningLog] gravel-nugget 母分布
 *   wp10 underworld 裸召 ranged longdead → [MobLog] longdead arrow intended= + 落地 vanilla 箭探测
 *
 * 判决源：run/uw2/logs/latest.log；driver 输出（含 chat 回包）为辅助证据。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const STATE = path.join(ROOT, 'build-logs', 'uw2-state.json');
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
function saveState(s) {
  fs.mkdirSync(path.dirname(STATE), { recursive: true });
  fs.writeFileSync(STATE, JSON.stringify(s, null, 2));
}

/* ---------------------------------------------------------------- RCON */
class Rcon {
  constructor(host, port, pw) { this.host = host; this.port = port; this.pw = pw; this.buf = Buffer.alloc(0); this.q = []; }
  connect() {
    return new Promise((res, rej) => {
      this.s = net.connect(this.port, this.host, () => res());
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
      const to = setTimeout(() => rej(new Error('rcon timeout(' + timeoutMs + 'ms): ' + b)), timeoutMs || 15000);
      this.q.push((x) => { clearTimeout(to); res(x); });
      this.s.write(this.pkt(id, t, b));
    });
  }
  async auth() { return this.send(1, 3, this.pw); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}

/** 服务端侧玩家坐标（RCON tp ~ ~ ~ 回包） */
async function serverPos(rcon, name) {
  let echo = '';
  try { echo = await rcon.cmd('tp ' + name + ' ~ ~ ~', 12000); } catch (e) { echo = 'RCON_ERR:' + e.message; }
  const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
  if (!m) { say('serverPos unparsed:', cut(String(echo), 120)); return null; }
  return { x: parseFloat(m[1]), y: parseFloat(m[2]), z: parseFloat(m[3]) };
}

const f = (v) => (Math.round(v * 100) / 100).toString();

/** 服务端侧判维：玩家世界召 marker，RCON（在 dim0 执行）testfor 是否命中 */
async function dimProbe(ctx) {
  const { rcon, chat } = ctx;
  try {
    await chat('execute ' + NAME + ' ~ ~ ~ summon armor_stand ~ ~ ~ {Tags:["uw2dimprobe"],NoGravity:1b,Invisible:1b}');
    await sleep(450);
    const r = String(await rcon.cmd('testfor @e[tag=uw2dimprobe]', 8000));
    const inOw = /Found \d+ entit/i.test(r);
    await chat('execute ' + NAME + ' ~ ~ ~ kill @e[tag=uw2dimprobe]');
    return inOw ? 0 : -2;
  } catch (e) { return null; }
}

async function ensureDim(ctx, want) {
  const { chat } = ctx;
  const cur = await dimProbe(ctx);
  say('ensureDim cur=', cur, 'want=', want);
  if (cur === want) return true;
  await chat(want === -2 ? 'etim dim enter' : 'etim dim leave');
  let now = null;
  for (let i = 0; i < 30; i++) {
    await sleep(1500);
    now = await dimProbe(ctx);
    if (now === want) break;
  }
  say('ensureDim ->', now);
  return now === want;
}

async function buffs(chat, spawn) {
  await chat('gamemode 0');
  await chat('effect @p clear');
  await chat('effect @p resistance 9999 4');
  await chat('effect @p regeneration 9999 4');
  await chat('effect @p saturation 9999 4');
  if (spawn !== undefined) await chat('gamerule doMobSpawning ' + spawn);
  await chat('difficulty 1');
  await sleep(500);
}

/* --------------------------------------------------------------- phases */

/** WP1: 主世界悬空平台 4×5 框 + fire 点火（非贴底面 → meta=0） */
async function phaseWp1(ctx) {
  const { rcon, bot, chat, st } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon, NAME);
  if (!p) throw new Error('no server pos');
  const px = Math.floor(p.x), pz = Math.floor(p.z);
  const gy = 150;
  await chat(`fill ${px - 8} ${gy - 1} ${pz - 8} ${px + 8} ${gy - 1} ${pz + 8} minecraft:stone`);
  await chat(`fill ${px - 8} ${gy} ${pz - 8} ${px + 8} ${gy + 6} ${pz + 8} minecraft:air`);
  await chat(`tp @p ${px + 0.5} ${gy} ${pz + 0.5}`);
  await sleep(900);
  say('WP1 site', px, gy, pz, 'bot', bot.entity.position.x.toFixed(2), bot.entity.position.y.toFixed(2), bot.entity.position.z.toFixed(2));

  const ax = px, ay = gy, az = pz + 4;
  await chat(`fill ${ax - 1} ${ay} ${az} ${ax + 2} ${ay} ${az} minecraft:obsidian`);
  await chat(`fill ${ax - 1} ${ay + 4} ${az} ${ax + 2} ${ay + 4} ${az} minecraft:obsidian`);
  await chat(`fill ${ax - 1} ${ay + 1} ${az} ${ax - 1} ${ay + 3} ${az} minecraft:obsidian`);
  await chat(`fill ${ax + 2} ${ay + 1} ${az} ${ax + 2} ${ay + 3} ${az} minecraft:obsidian`);
  await chat(`fill ${ax} ${ay + 1} ${az} ${ax + 1} ${ay + 3} ${az} minecraft:air`);
  await sleep(400);

  const off = logOffset();
  await chat(`setblock ${ax} ${ay + 1} ${az} minecraft:fire`);
  await sleep(1500);
  const t = logSince(off);
  const create = rows(t, /\[DimLog\] portal-create/);
  say('WP1 frame A', ax, ay, az);
  say('WP1 portal-create rows =', create.length);
  create.forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP1 testforblock cavity(portal?) :', await rcon.cmd(`testforblock ${ax} ${ay + 1} ${az} etim:portal`));
  say('WP1 testforblock cavity(portal?)2:', await rcon.cmd(`testforblock ${ax + 1} ${ay + 2} ${az} etim:portal`));
  st.frameA = { x: ax, y: ay, z: az };
  ctx.save();
}

/** WP2: 主世界 y=8 框 + 底框下 mantle_or_core → meta=1（isTouchingBottomBedrock true 面） */
async function phaseWp2(ctx) {
  const { rcon, chat, st } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon, NAME);
  const bx = Math.floor(p.x) - 40, bz = Math.floor(p.z) - 40;
  await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 15 ${bz + 6} minecraft:air`);
  await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 7 ${bz + 6} minecraft:stone`);
  await chat(`fill ${bx - 1} 7 ${bz} ${bx + 2} 7 ${bz} etim:mantle_or_core`);
  await chat(`fill ${bx - 1} 8 ${bz} ${bx + 2} 8 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx - 1} 12 ${bz} ${bx + 2} 12 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx - 1} 9 ${bz} ${bx - 1} 11 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx + 2} 9 ${bz} ${bx + 2} 11 ${bz} minecraft:obsidian`);
  await chat(`fill ${bx} 9 ${bz} ${bx + 1} 11 ${bz} minecraft:air`);
  await sleep(400);
  const off = logOffset();
  await chat(`setblock ${bx} 9 ${bz} minecraft:fire`);
  await sleep(1500);
  const t = logSince(off);
  const create = rows(t, /\[DimLog\] portal-create/);
  say('WP2 frame B', bx, 8, bz);
  say('WP2 mantle check:', await rcon.cmd(`testforblock ${bx - 1} 7 ${bz} etim:mantle_or_core`));
  say('WP2 portal-create rows =', create.length);
  create.forEach((l) => say('   ' + cut(l.trim(), 190)));
  st.frameB = { x: bx, y: 8, z: bz };
  ctx.save();
}

/** WARM: 同 x/z 预生成 underworld ±128 邻域（避免到维单 tick 生成撞 watchdog） */
async function phaseWarm(ctx) {
  const { rcon, bot, chat, st } = ctx;
  const fb = st.frameB || { x: 0, y: 8, z: 0 };
  await ensureDim(ctx, 0);
  await buffs(chat, true);
  await chat(`tp @p ${fb.x + 0.5} 10 ${fb.z + 0.5}`);
  await sleep(800);
  const off = logOffset();
  await chat('etim dim enter');
  await sleep(5000);
  const land = await serverPos(rcon, NAME);
  say('WARM underworld landing', land, 'dim=', bot.game.dimension);
  let last = -1, stable = 0;
  for (let i = 0; i < 40; i++) {
    await sleep(5000);
    const c = count(logSince(off), /\[DimLog\] gen chunk=/);
    const o = count(logSince(off), /\[OreLog\] ore=/);
    say('WARM gen chunks=', c, 'oreRows=', o);
    if (c === last) { stable++; if (stable >= 2) break; } else { stable = 0; last = c; }
  }
  const t = logSince(off);
  say('WARM totals: gen=' + count(t, /\[DimLog\] gen chunk=/)
    + ' oreAdam=' + count(t, /\[OreLog\] ore=ore_adamantium/)
    + ' dungeon=' + count(t, /\[SpawnLog\] dungeon/)
    + ' chest=' + count(t, /\[TestLog\] dungeon-chest/)
    + ' portalBuild=' + count(t, /\[DimLog\] portal-build/));
  say('WARM accept dim=-2 =', count(t, /\[SpawnLog\] accept dim=-2/));
  if (land) { st.warm = land; ctx.save(); }
  await chat('etim dim leave');
  await sleep(4000);
  say('WARM back dim=', bot.game.dimension, await serverPos(rcon, NAME));
}

/** WP3 + WP4a: 站门 80 tick 到维；出/再进 → 回程命中 */
async function phaseWp3(ctx) {
  const { rcon, bot, chat, st } = ctx;
  const fb = st.frameB;
  const warm = st.warm;
  if (!fb) throw new Error('state missing frameB');
  await ensureDim(ctx, 0);
  await buffs(chat, true);
  await chat(`tp @p ${fb.x + 0.5} 9 ${fb.z + 0.5}`);
  await sleep(600);
  const t0 = Date.now();
  const off = logOffset();
  let arrive = null;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    if (bot.game && bot.game.dimension === -2) { arrive = i + 1; break; }
    if (i % 5 === 0) say('WP3 waiting', i + 1, 's dim=', bot.game && bot.game.dimension);
  }
  const posA = await serverPos(rcon, NAME);
  say('WP3 arrive after', arrive, 's (wall ' + ((Date.now() - t0) / 1000).toFixed(1) + 's) pos=', posA, 'dim=', bot.game.dimension);
  const tA = logSince(off);
  rows(tA, /\[DimLog\] portal-enter|\[DimLog\] portal-build/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP3 portal-enter dest=-2 =', count(tA, /portal-enter .*dest=-2/),
    'build =', count(tA, /portal-build/));
  // 维度辅助证据：在玩家所在世界召一个 marker，再从主世界 RCON testfor（RCON 命令在 dim0 执行）
  await chat('execute ' + NAME + ' ~ ~ ~ summon armor_stand ~ ~1 ~ {Tags:["uw2probe"]}');
  await sleep(700);
  say('WP3 marker-in-dim0 probe (expect not found):', await rcon.cmd('testfor @e[tag=uw2probe]'));
  if (posA) { st.arrival = posA; ctx.save(); }

  if (!warm) {
    say('WP4a skipped: no warm landing recorded (A-1 crash expected on arrival)');
    return;
  }
  // WP4a：出到 warm 落点 → 冷却过期 → 再进门 → 回主世界（命中面：无 portal-build）
  await chat(`tp @p ${warm.x} ${warm.y} ${warm.z}`);
  await sleep(3000);
  const off2 = logOffset();
  await chat(`tp @p ${posA.x} ${posA.y} ${posA.z}`);
  let back = null;
  for (let i = 0; i < 40; i++) {
    await sleep(1000);
    if (bot.game && bot.game.dimension === 0) { back = i + 1; break; }
  }
  const posB = await serverPos(rcon, NAME);
  const tB = logSince(off2);
  say('WP4a back after', back, 's pos=', posB, 'dim=', bot.game.dimension);
  rows(tB, /\[DimLog\] portal-enter|\[DimLog\] portal-build/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP4a portal-enter dest=0 =', count(tB, /portal-enter .*dest=0/),
    'build(miss face) =', count(tB, /portal-build/));
  const dx = posB ? Math.abs(posB.x - (fb.x + 0.5)) : -1;
  const dz = posB ? Math.abs(posB.z - (fb.z + 0.5)) : -1;
  say('WP4a landing vs frameB dx/dz =', dx.toFixed(2), dz.toFixed(2), '(<=1.0 = 命中回程门)');
}

/** WP4b: 远处回程 miss → portal-build direction_of_travel= */
async function phaseWp4b(ctx) {
  const { rcon, bot, chat, st } = ctx;
  const fb = st.frameB || { x: 0, y: 8, z: 0 };
  const fx = fb.x + 600, fz = fb.z + 600;
  await ensureDim(ctx, 0);
  await buffs(chat, true);
  await chat(`tp @p ${fx} 200 ${fz}`);
  await sleep(6000);
  const p0 = await serverPos(rcon, NAME);
  say('WP4b overworld far site', p0);
  // 预生成主世界远点邻域（avoid 单 tick 生成）
  for (let i = 0; i < 6; i++) { await chat('tp @p ~8 ~ ~'); await sleep(900); }
  await chat(`tp @p ${fx + 0.5} ${p0.y} ${fz + 0.5}`);
  await sleep(6000);
  const p1 = await serverPos(rcon, NAME);
  say('WP4b site settled', p1);
  const sy = Math.floor(p1.y);
  // 清一间房 + 建框（不贴底 → meta=0）
  await chat(`fill ${fx - 6} ${sy} ${fz - 6} ${fx + 7} ${sy + 6} ${fz + 6} minecraft:air`);
  await chat(`fill ${fx - 6} ${sy - 1} ${fz - 6} ${fx + 7} ${sy - 1} ${fz + 6} minecraft:stone`);
  await sleep(400);
  await chat('etim dim enter');
  await sleep(6000);
  const pu = await serverPos(rcon, NAME);
  say('WP4b underworld landing', pu, 'dim=', bot.game.dimension);
  for (let i = 0; i < 6; i++) { await chat('tp @p ~8 ~ ~'); await sleep(900); }
  await chat(`tp @p ${Math.floor(pu.x) + 0.5} ${Math.floor(pu.y)} ${Math.floor(pu.z) + 0.5}`);
  await sleep(1200);
  const bx = Math.floor(pu.x) + 4, by = Math.floor(pu.y), bz = Math.floor(pu.z);
  await chat(`fill ${bx - 6} ${by} ${bz - 6} ${bx + 7} ${by + 6} ${bz + 6} minecraft:air`);
  await chat(`fill ${bx - 6} ${by - 1} ${bz - 6} ${bx + 7} ${by - 1} ${bz + 6} minecraft:stone`);
  await chat(`fill ${bx - 1} ${by} ${bz} ${bx + 2} ${by} ${bz} minecraft:obsidian`);
  await chat(`fill ${bx - 1} ${by + 4} ${bz} ${bx + 2} ${by + 4} ${bz} minecraft:obsidian`);
  await chat(`fill ${bx - 1} ${by + 1} ${bz} ${bx - 1} ${by + 3} ${bz} minecraft:obsidian`);
  await chat(`fill ${bx + 2} ${by + 1} ${bz} ${bx + 2} ${by + 3} ${bz} minecraft:obsidian`);
  await chat(`fill ${bx} ${by + 1} ${bz} ${bx + 1} ${by + 3} ${bz} minecraft:air`);
  const offI = logOffset();
  await chat(`setblock ${bx} ${by + 1} ${bz} minecraft:fire`);
  await sleep(1500);
  rows(logSince(offI), /portal-create/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  // 站门回主世界（远处 → 无 ±128 命中门 → makePortal）
  const off = logOffset();
  await chat(`tp @p ${bx + 0.5} ${by + 1} ${bz + 0.5}`);
  let back = null;
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (bot.game && bot.game.dimension === 0) { back = i + 1; break; }
  }
  const pos = await serverPos(rcon, NAME);
  const t = logSince(off);
  say('WP4b back after', back, 's pos=', pos, 'dim=', bot.game.dimension);
  rows(t, /\[DimLog\] portal-enter|\[DimLog\] portal-build|portal-create/).forEach((l) => say('   ' + cut(l.trim(), 190)));
  say('WP4b portal-build =', count(t, /portal-build/), 'enter-dest0 =', count(t, /portal-enter .*dest=0/));
  st.wp4b = { x: bx, y: by, z: bz };
  ctx.save();
}

/** WP5: 破一块 obsidian → 门全散 */
async function phaseWp5(ctx) {
  const { rcon, chat, st } = ctx;
  const fa = st.frameA;
  if (!fa) throw new Error('state missing frameA');
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  await chat(`tp @p ${fa.x + 0.5} ${fa.y + 1} ${fa.z + 4.5}`);
  await sleep(800);
  const before = [];
  for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
    before.push(await rcon.cmd(`testforblock ${fa.x + dx} ${fa.y + dy} ${fa.z} etim:portal`));
  }
  say('WP5 before: portal cells hit =', before.filter((s) => /success|found/i.test(s)).length);
  const off = logOffset();
  await chat(`setblock ${fa.x} ${fa.y} ${fa.z} minecraft:air`);
  await sleep(1200);
  const after = [];
  for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
    after.push(await rcon.cmd(`testforblock ${fa.x + dx} ${fa.y + dy} ${fa.z} minecraft:air`));
  }
  say('WP5 after: air cells =', after.filter((s) => /success|found/i.test(s)).length, '/6');
  after.forEach((s, i) => say('   cell' + i + ':', cut(s, 120)));
  const t = logSince(off);
  say('WP5 portal-break rows =', count(t, /portal-break/), '(代码面无该判行，见回执 B 级)');
  rows(t, /\[DimLog\] portal/).forEach((l) => say('   ' + cut(l.trim(), 190)));
}

/** WP6: underworld y<6 挖 mantle 邻块 → achievement 判行 + advancement test */
async function phaseWp6(ctx) {
  const { rcon, bot, chat } = ctx;
  await ensureDim(ctx, -2);
  await buffs(chat, false);
  // 固定落到已知 goodSpot（dimprobe 到维落点，chunk 已生成 → 不再触发 A-1 级联）
  await chat('tp @p -63.5 166 240.5');
  await sleep(1500);
  const p = await serverPos(rcon, NAME);
  say('WP6 start pos', p);
  const x0 = p ? Math.floor(p.x) : -63, z0 = p ? Math.floor(p.z) : 240;
  // 挖一间 y=60 的口袋，仅为了拿到该 chunk 的客户端方块数据
  await chat(`setblock ${x0} 60 ${z0} minecraft:air`);
  await chat(`setblock ${x0} 61 ${z0} minecraft:air`);
  await chat(`tp @p ${x0 + 0.5} 60 ${z0 + 0.5}`);
  await sleep(2500);
  // 服务端侧扫描：客户端方块表不含 ETIM 方块（bot.blockAt 会把 mantle 误读成 vanilla 名），
  // 改用 RCON testforblock 绝对坐标逐格探 y=1/2 的 mantle_or_core，再取同 y 的非 mantle 横邻
  const isMantle = async (x, y, z) => /success/i.test(String(await rcon.cmd(`testforblock ${x} ${y} ${z} etim:mantle_or_core`, 8000)));
  let cand = null, mantleHits = 0, probes = 0;
  outer:
  for (const y of [1, 2, 3, 4, 5]) {
    for (let dx = -8; dx <= 8; dx++) {
      for (let dz = -8; dz <= 8; dz++) {
        const x = x0 + dx, z = z0 + dz;
        probes++;
        if (!(await isMantle(x, y, z))) continue;
        mantleHits++;
        for (const [nx, nz] of [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]) {
          probes++;
          if (await isMantle(nx, y, nz)) continue;
          cand = { x: nx, y, z: nz, mantleAt: x + ',' + y + ',' + z };
          break outer;
        }
      }
    }
  }
  say('WP6 candidate =', cand, 'mantleHits=', mantleHits, 'probes=', probes);
  if (!cand) throw new Error('no mantle-adjacent cell found');
  await chat(`setblock ${cand.x} ${cand.y + 1} ${cand.z} minecraft:air`);
  await chat(`setblock ${cand.x} ${cand.y + 2} ${cand.z} minecraft:air`);
  await chat(`setblock ${cand.x} ${cand.y} ${cand.z} minecraft:dirt`);
  await chat(`tp @p ${cand.x + 0.5} ${cand.y + 1} ${cand.z + 0.5}`);
  await sleep(1200);
  const blk = bot.blockAt(new Vec3(cand.x, cand.y, cand.z));
  say('WP6 target block(client view) =', blk ? blk.name : 'null', 'pos', cand.x, cand.y, cand.z);
  say('WP6 target block(server) =', await rcon.cmd(`testforblock ${cand.x} ${cand.y} ${cand.z} minecraft:dirt`));
  const off = logOffset();
  try { await bot.dig(blk); } catch (e) { say('WP6 dig err', e.message); }
  await sleep(1800);
  const t = logSince(off);
  const ach = rows(t, /achievement-portalToNether/);
  say('WP6 achievement rows =', ach.length);
  ach.forEach((l) => say('   ' + cut(l.trim(), 190)));
  bot.chat('/advancement test ' + NAME + ' etim:portal_to_nether');
  await sleep(1200);
  say('WP6 testforblock target now:', await rcon.cmd(`testforblock ${cand.x} ${cand.y} ${cand.z} minecraft:air`));
}

/** WP7 + WP8: underworld 扫街 + 全档统计 */
async function phaseWp7(ctx) {
  const { bot, chat } = ctx;
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  const off = logOffset();
  const p = await serverPos(ctx.rcon, NAME);
  say('WP7 sweep start', p);
  for (let i = 0; i < 12; i++) {
    await chat('tp @p ~32 ~ ~');
    await sleep(1400);
    if (i % 4 === 3) say('WP7 step', i + 1, 'gen=' + count(logSince(off), /gen chunk=/), 'ore=' + count(logSince(off), /\[OreLog\] ore=/));
  }
  await sleep(4000);
  const t = logAll();
  const ores = {};
  const chunkSets = {};
  rows(t, /\[OreLog\] ore=/).forEach((l) => {
    const m = l.match(/ore=(\S+) dim=-2 chunk=\((-?\d+),(-?\d+)\).*rolls=(\d+) veins=(\d+) origin-abort=(\d+) grown=(\d+)/);
    if (!m) return;
    const k = m[1];
    ores[k] = ores[k] || { rows: 0, rolls: new Set(), veins: 0, grown: 0, abort: 0, chunks: new Set() };
    ores[k].rows++;
    ores[k].rolls.add(Number(m[4]));
    ores[k].veins += Number(m[5]);
    ores[k].grown += Number(m[7]);
    ores[k].abort += Number(m[6]);
    ores[k].chunks.add(m[2] + ',' + m[3]);
  });
  say('WP7 ore rows by ore:');
  Object.keys(ores).forEach((k) => {
    const o = ores[k];
    say('   ' + k + ' rows=' + o.rows + ' chunks=' + o.chunks.size + ' rolls/set={' + [...o.rolls].join(',') + '}'
      + ' veins=' + o.veins + ' mean=' + (o.veins / o.rows).toFixed(2) + ' grown=' + o.grown + ' abort=' + o.abort);
  });
  const dg = rows(t, /\[SpawnLog\] dungeon/);
  const guard = dg.filter((l) => /spawner=longdead_guardian/.test(l)).length;
  say('WP8 dungeon rows =', dg.length, 'guardian =', guard, 'ratio =', dg.length ? (guard / dg.length).toFixed(4) : 'n/a');
  say('WP8 chest rows =', count(t, /\[TestLog\] dungeon-chest/),
    'rows=16 =', count(t, /dungeon-chest .*rows=16/));
  say('WP8 dungeon chunk span =', new Set(dg.map((l) => { const m = l.match(/x=(-?\d+) y=(-?\d+) z=(-?\d+)/); return m ? (Math.floor(Number(m[1]) / 16)) + ',' + (Math.floor(Number(m[3]) / 16)) : '?'; })).size, 'chunks');
  say('WP7 window: gen=' + count(t, /gen chunk=/) + ' oreRows=' + count(t, /\[OreLog\] ore=/));
  rows(t, /\[SpawnLog\] dungeon/).slice(0, 4).forEach((l) => say('   ' + cut(l.trim(), 190)));
  rows(t, /\[TestLog\] dungeon-chest/).slice(0, 2).forEach((l) => say('   ' + cut(l.trim(), 190)));
}

/** WP9: 主世界悬空 gravel 场手采 → gravel-nugget 母分布 */
async function phaseWp9(ctx) {
  const { rcon, bot, chat } = ctx;
  await ensureDim(ctx, 0);
  await buffs(chat, false);
  const p = await serverPos(rcon, NAME);
  const gx = Math.floor(p.x) + 40, gz = Math.floor(p.z) + 40, gy = 150;
  await chat(`fill ${gx - 12} ${gy - 1} ${gz - 12} ${gx + 12} ${gy - 1} ${gz + 12} minecraft:stone`);
  await chat(`fill ${gx - 12} ${gy} ${gz - 12} ${gx + 12} ${gy} ${gz + 12} minecraft:gravel`);
  await chat(`fill ${gx - 12} ${gy + 1} ${gz - 12} ${gx + 12} ${gy + 1} ${gz + 12} minecraft:gravel`);
  await chat('give @p minecraft:diamond_shovel 1 0 {ench:[{id:32,lvl:5},{id:35,lvl:3},{id:34,lvl:3}]}');
  await sleep(900);
  const sh = bot.inventory.items().find((i) => /diamond_shovel/.test(i.name || ''));
  if (sh) { try { await bot.equip(sh, 'hand'); } catch (e) { say('WP9 equip err', e.message); } }
  await sleep(500);
  say('WP9 held =', bot.heldItem ? bot.heldItem.name : 'none', 'ench tags:',
    JSON.stringify(bot.heldItem && bot.heldItem.nbt ? Object.keys(bot.heldItem.nbt) : null));
  const off = logOffset();
  let dug = 0, fail = 0;
  const stands = [];
  for (let sx = gx - 12; sx <= gx + 12; sx += 5) for (let sz = gz - 12; sz <= gz + 12; sz += 5) stands.push({ x: sx, z: sz });
  for (const sp of stands) {
    await chat(`tp @p ${sp.x + 0.5} ${gy + 2} ${sp.z + 0.5}`);
    await sleep(400);
    for (let pass = 0; pass < 4; pass++) {
      const cands = [];
      const pp = bot.entity.position;
      for (let dx = -5; dx <= 5; dx++) for (let dz = -5; dz <= 5; dz++) for (const y of [gy, gy + 1]) {
        const x = Math.floor(pp.x) + dx, z = Math.floor(pp.z) + dz;
        if (Math.abs(x - gx) > 12 || Math.abs(z - gz) > 12) continue;
        const b = bot.blockAt(new Vec3(x, y, z));
        if (!b || b.name !== 'gravel') continue;
        const d = Math.hypot(x + 0.5 - pp.x, y + 0.5 - (pp.y + 1.6), z + 0.5 - pp.z);
        if (d > 4.1) continue;
        cands.push({ b, d });
      }
      if (!cands.length) break;
      cands.sort((a, b) => a.d - b.d);
      for (const c of cands) {
        try { await bot.dig(c.b); dug++; } catch (e) { fail++; }
        await sleep(50);
      }
    }
  }
  await sleep(1500);
  const t = logSince(off);
  const rr = rows(t, /\[MiningLog\] gravel-nugget ore=/);
  const dist = {};
  rr.forEach((l) => { const m = l.match(/ore=(\S+) fortune=(\d+)/); if (m) dist[m[1]] = (dist[m[1]] || 0) + 1; });
  say('WP9 dug=' + dug + ' fail=' + fail + ' rows=' + rr.length
    + ' chainRate=' + (dug ? (rr.length / dug).toFixed(3) : 'n/a') + ' (fortune=3 → 3/6=0.500)');
  Object.keys(dist).sort((a, b) => dist[b] - dist[a]).forEach((k) => say('   ' + k + ' = ' + dist[k] + ' (' + (dist[k] / rr.length).toFixed(4) + ')'));
  rr.slice(0, 3).forEach((l) => say('   ' + cut(l.trim(), 190)));
}

/** WP10: underworld ranged longdead 箭面 */
async function phaseWp10(ctx) {
  const { rcon, bot, chat } = ctx;
  await ensureDim(ctx, -2);
  await buffs(chat, true);
  // 悬空平台 y=200，全部落在已生成 chunk (-4,15) 内（x -64..-49 / z 240..255）
  const x0 = -60, y0 = 200, z0 = 248;
  await chat(`fill ${x0 - 4} ${y0 - 1} ${z0 - 4} ${x0 + 4} ${y0 - 1} ${z0 + 4} minecraft:stone`);
  await chat(`fill ${x0 - 4} ${y0} ${z0 - 4} ${x0 + 4} ${y0 + 6} ${z0 + 4} minecraft:air`);
  await chat(`tp @p ${x0 + 0.5} ${y0} ${z0 + 0.5}`);
  await sleep(1200);
  const p = await serverPos(rcon, NAME);
  say('WP10 platform bot pos', p);
  await chat('kill @e[type=etim:longdead]');
  await chat('kill @e[type=arrow]');
  await chat('kill @e[type=tipped_arrow]');
  await sleep(500);
  const off = logOffset();
  // 装备面是随机 pick（melee/ranged），重复裸召直到 ranged（bow）
  let ranged = false;
  for (let i = 0; i < 10 && !ranged; i++) {
    await chat('kill @e[type=etim:longdead]');
    await sleep(300);
    const o2 = logOffset();
    await chat(`summon etim:longdead ${x0 + 3.5} ${y0} ${z0 + 3.5}`);
    await sleep(1200);
    const tt = logSince(o2);
    ranged = /longdead equip type=ranged/.test(tt);
    say('WP10 try', i + 1, 'ranged=' + ranged, rows(tt, /longdead equip/).map((l) => cut(l.trim(), 140)));
  }
  // 等它开弓（player 在平台内 4 格）
  for (let i = 0; i < 25; i++) {
    await chat('tp @p ' + (x0 + 0.5) + ' ' + y0 + ' ' + (z0 + 0.5));
    await sleep(1200);
    if (count(logSince(off), /longdead arrow intended/) > 0) break;
  }
  const t = logSince(off);
  const ar = rows(t, /longdead arrow intended/);
  say('WP10 arrow intended rows =', ar.length);
  ar.slice(0, 6).forEach((l) => say('   ' + cut(l.trim(), 190)));
  // 落地箭实体面：在玩家所在世界用 execute 广播（/say 会落 latest.log）
  // 1.12 箭实体统一注册名 = minecraft:arrow（tipped_arrow 无独立实体名，选它会报 invalid）
  bot.chat('/execute @e[type=arrow] ~ ~ ~ say UW2_LANDED_VANILLA_ARROW');
  await sleep(900);
  bot.chat('/execute @e[type=arrow,nbt={Potion:"minecraft:empty"}] ~ ~ ~ say UW2_ARROW_EMPTY_POTION');
  await sleep(900);
  bot.chat('/execute @e[type=etim:arrow] ~ ~ ~ say UW2_ETIM_ARROW_EXISTS');
  await sleep(900);
  const t2 = logSince(off);
  say('WP10 landed probe rows:', rows(t2, /UW2_LANDED|UW2_ETIM_ARROW|UW2_ARROW_EMPTY/).map((l) => cut(l.trim(), 140)));
  say('WP10 vanilla-arrow probe =', count(t2, /UW2_LANDED_VANILLA_ARROW/),
    'emptyPotion =', count(t2, /UW2_ARROW_EMPTY_POTION/),
    'etim_arrow =', count(t2, /UW2_ETIM_ARROW_EXISTS/));
  say('WP10 rcon testfor arrow in dim0 (expect not found):', await rcon.cmd('testfor @e[type=arrow]'));
}

/* ------------------------------------------------------------------ main */
(async () => {
  const phase = (process.argv[2] || 'wp1').toLowerCase();
  const rcon = new Rcon(HOST, RCON_PORT, PW);
  await rcon.connect();
  await rcon.auth();
  const bot = await createHarnBot({ host: HOST, port: MC_PORT, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position) break; await sleep(500); }
  await sleep(2500);
  const chat = async (cmd) => { bot.chat('/' + cmd); await sleep(330); };
  const st = loadState();
  const ctx = { rcon, bot, chat, st, save: () => saveState(st) };
  say('PHASE', phase, 'bot', bot.entity.position ? `${bot.entity.position.x.toFixed(1)} ${bot.entity.position.y.toFixed(1)} ${bot.entity.position.z.toFixed(1)}` : '?',
    'dim=', bot.game && bot.game.dimension);
  const P = { wp1: phaseWp1, wp2: phaseWp2, warm: phaseWarm, wp3: phaseWp3, wp4b: phaseWp4b, wp5: phaseWp5, wp6: phaseWp6, wp7: phaseWp7, wp9: phaseWp9, wp10: phaseWp10 };
  if (!P[phase]) throw new Error('unknown phase ' + phase);
  await P[phase](ctx);
  say('PHASE', phase, 'done; dim=', bot.game && bot.game.dimension);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL', e.stack || e.message); process.exit(1); });
