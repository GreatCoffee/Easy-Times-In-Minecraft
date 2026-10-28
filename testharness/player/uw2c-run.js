#!/usr/bin/env node
/**
 * uw2c-run.js — underworld 二阶段 A-2/A-3 修后第三窗 driver（会话七，2026-10-25）
 *
 * 相位：
 *   home  —— 从任何维回到主世界安全点（清冷却）
 *   p1    —— WP1 建门（悬空平台，非贴底 → meta=0）
 *   p2    —— WP2 贴底门（框底 y=8 + 正下 mantle_or_core → meta=1）
 *   p5    —— WP5 破框（[DimLog] portal-break ×6）
 *   p3    —— WP3 去程：站 frameB（既有 meta=1）→ portal-place dim=-2 from_dim=0
 *   p4    —— WP4 命中面：underworld 建门（meta=0）→ 站门 → portal-place dim=0 from_dim=-2
 *            + build=0 + 落点贴 frameB（±128 命中）；并核 arrival 门 metadata
 *   p6    —— WP6：/advancement test 解析 + 挖块授奖 + grant 后 test 读回
 *
 * 判维：日志末态单源（最后一条 enter to=-2 / leave to=0 / portal-place dim=X）。
 * 元数据核验：玩家 chat 面 `testforblock x y z etim:portal <meta>` 正反判。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const STATE = path.join(ROOT, 'build-logs', 'uw2c-state.json');
const NAME = 'ETIM_Harn01';
const RCON_PORT = 25575;
const PW = 'etim27';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 210) ? l.slice(0, n || 210) : l);
const loadState = () => { try { return JSON.parse(fs.readFileSync(STATE, 'utf8')); } catch (e) { return {}; } };
const saveState = (s) => fs.writeFileSync(STATE, JSON.stringify(s, null, 2));

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
      this.s = net.connect(RCON_PORT, '127.0.0.1', () => res());
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
  async auth() { return this.send(1, 3, PW); }
  async cmd(c, timeoutMs) { return String(await this.send(9, 2, c, timeoutMs) || '').replace(/\u0000/g, '').trim(); }
}

(async () => {
  const phase = (process.argv[2] || 'home').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(2500);
  const replies = [];
  bot.on('message', (m) => replies.push(m.toString()));
  const chat = async (c) => { bot.chat('/' + c); await sleep(400); };
  const ask = async (c, ms) => { const n = replies.length; bot.chat('/' + c); await sleep(ms || 800); return replies.slice(n).join(' | '); };
  const st = loadState();

  const pos = async () => {
    try {
      const echo = await rcon.cmd('tp ' + NAME + ' ~ ~ ~');
      const m = String(echo).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
      return m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
    } catch (e) { return null; }
  };
  /** testforblock 正反判：返回 0/1/2/other */
  const metaOf = async (x, y, z, blk) => {
    const r0 = await ask(`testforblock ${x} ${y} ${z} ${blk} 0`, 420);
    if (/Successfully found/.test(r0)) return 0;
    const r1 = await ask(`testforblock ${x} ${y} ${z} ${blk} 1`, 420);
    if (/Successfully found/.test(r1)) return 1;
    const r2 = await ask(`testforblock ${x} ${y} ${z} ${blk} 2`, 420);
    if (/Successfully found/.test(r2)) return 2;
    return null;
  };
  /** 立方体找门体（先按距离近的格子，无 dataValue 只判种类），命中后读 metadata */
  const findPortal = async (cx, cy, cz, rx, ry, rz) => {
    const X = rx === undefined ? 4 : rx, Y = ry === undefined ? 3 : ry, Z = rz === undefined ? 4 : rz;
    const cells = [];
    for (let dx = -X; dx <= X; dx++) for (let dz = -Z; dz <= Z; dz++) for (let dy = -1; dy <= Y; dy++) {
      cells.push([dx, dy, dz, dx * dx + dy * dy + dz * dz]);
    }
    cells.sort((a, b) => a[3] - b[3]);
    for (const [dx, dy, dz] of cells) {
      const x = cx + dx, y = cy + dy, z = cz + dz;
      const r = await ask(`testforblock ${x} ${y} ${z} etim:portal`, 280);
      if (/Successfully found/.test(r)) {
        const meta = await metaOf(x, y, z, 'etim:portal');
        return { x, y, z, meta };
      }
    }
    return null;
  };
  const pad = async (x, y, z) => {
    await chat(`fill ${x - 1} ${y - 1} ${z - 1} ${x + 1} ${y - 1} ${z + 1} minecraft:stone`);
    await chat(`fill ${x - 1} ${y} ${z - 1} ${x + 1} ${y + 2} ${z + 1} minecraft:air`);
    await chat(`tp @p ${x + 0.5} ${y} ${z + 0.5}`);
    await sleep(1200);
  };
  const buffs = async (spawn) => {
    await chat('gamemode 0');
    await chat('effect @p clear');
    await chat('effect @p resistance 9999 4');
    await chat('effect @p regeneration 9999 4');
    await chat('effect @p saturation 9999 4');
    if (spawn !== undefined) await chat('gamerule doMobSpawning ' + spawn);
    await chat('difficulty 1');
    await sleep(400);
  };
  /** 站门里时 timeUntilPortal 每 tick 刷新 → 先挪出并铺安全台，再等冷却 */
  const stepOut = async (dist) => {
    const p = await pos();
    if (!p) return null;
    const d = dist || 10;
    const tx = Math.floor(p.x) + d, ty = Math.floor(p.y) + 1, tz = Math.floor(p.z) + d;
    await chat(`fill ${tx - 1} ${ty - 1} ${tz - 1} ${tx + 1} ${ty - 1} ${tz + 1} minecraft:stone`);
    await chat(`fill ${tx - 1} ${ty} ${tz - 1} ${tx + 1} ${ty + 2} ${tz + 1} minecraft:air`);
    await chat(`tp @p ${tx + 0.5} ${ty} ${tz + 0.5}`);
    await sleep(900);
    return p;
  };
  /**
   * 判维入口：/etim dim leave 无冷却门且必出
   *   [DimLog] leave player=<n> from=<真实源维> to=0
   * → from 即玩家当前维（产品行自证）；want=0 时该命令本身就把人送到主世界。
   */
  const goto = async (want) => {
    await stepOut(10);
    await sleep(1200);
    const off = logOffset();
    await chat('etim dim leave');
    let from = null;
    for (let i = 0; i < 14; i++) {
      await sleep(1000);
      const m = logSince(off).match(/\[DimLog\] leave player=\S+ from=(-?\d+) to=0/);
      if (m) { from = Number(m[1]); break; }
    }
    say('  probe: leave from=' + from + ' -> want=' + want);
    if (want === 0) return from !== null;
    for (let a = 0; a < 6; a++) {
      const off2 = logOffset();
      await chat('etim dim enter');
      for (let i = 0; i < 10; i++) {
        await sleep(1200);
        const t = logSince(off2);
        if (/\[DimLog\] enter player=.*to=-2/.test(t)) { say('  -> -2'); return true; }
        if (/enter-reject/.test(t)) break;
      }
      say('  goto retry ' + (a + 1));
      await stepOut(10);
      await sleep(7000);
    }
    return false;
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
    return rows(logSince(off), /\[DimLog\] portal-create/).map((l) => cut(l.trim(), 200));
  };

  say('PHASE ' + phase + ' start pos=' + JSON.stringify(await pos()));

  if (phase === 'meta') {
    if (!(await goto(-2))) { say('ABORT meta enter'); process.exit(2); }
    for (const [x, y, z] of [[-108, 219, 209], [-88, 219, 210]]) {
      await chat(`tp @p ${x + 0.5} ${y} ${z + 3.5}`);
      await sleep(2500);
      say('meta uw-door@' + x + ',' + y + ',' + z + ' -> ' + JSON.stringify(await findPortal(x, y, z, 3, 2, 3)));
    }
    if (!(await goto(0))) { say('ABORT meta leave'); process.exit(2); }
    for (const [x, y, z, tag] of [[-108, 9, 209, 'frameB'], [-85, 9, 231, 'frameB2'], [900, 9, 900, 'p3b-ow-door']]) {
      await chat(`tp @p ${x + 0.5} ${y} ${z + 3.5}`);
      await sleep(2500);
      say('meta ' + tag + '@' + x + ',' + y + ',' + z + ' -> ' + JSON.stringify(await findPortal(x, y, z, 2, 2, 2)));
    }
  }

  /* ---------------------------------------------------------------- home */
  if (phase === 'home') {
    if (!(await goto(0))) { say('home FAILED'); process.exit(2); }
    const p = await pos();
    await pad(Math.floor(p.x) + 20, 150, Math.floor(p.z) + 20);
    say('home ok pos=' + JSON.stringify(await pos()) + ' dim=' + syncDim());
  }

  /* ------------------------------------------------------------------ WP1 */
  if (phase === 'p1') {
    if (!(await goto(0))) { say('ABORT p1'); process.exit(2); }
    await buffs(false);
    const p = await pos();
    const px = Math.floor(p.x), pz = Math.floor(p.z), gy = 150;
    await chat(`fill ${px - 8} ${gy - 1} ${pz - 8} ${px + 8} ${gy - 1} ${pz + 8} minecraft:stone`);
    await chat(`fill ${px - 8} ${gy} ${pz - 8} ${px + 8} ${gy + 6} ${pz + 8} minecraft:air`);
    await chat(`tp @p ${px + 0.5} ${gy} ${pz + 0.5}`);
    await sleep(1200);
    const ax = px, ay = gy, az = pz + 4;
    const cr = await buildFrame(ax, ay, az);
    say('WP1 frameA=' + ax + ',' + ay + ',' + az + ' create rows=' + cr.length);
    cr.forEach((l) => say('   ' + l));
    say('WP1 cell meta@' + (ax) + ',' + (ay + 1) + ',' + az + ' = ' + await metaOf(ax, ay + 1, az, 'etim:portal'));
    say('WP1 cell meta@' + (ax + 1) + ',' + (ay + 3) + ',' + az + ' = ' + await metaOf(ax + 1, ay + 3, az, 'etim:portal'));
    st.frameA = { x: ax, y: ay, z: az };
    saveState(st);
  }

  /* ------------------------------------------------------------------ WP2 */
  if (phase === 'p2') {
    if (!(await goto(0))) { say('ABORT p2'); process.exit(2); }
    await buffs(false);
    const p = await pos();
    const bx = Math.floor(p.x) - 40, bz = Math.floor(p.z) - 40;
    await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 15 ${bz + 6} minecraft:air`);
    await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 7 ${bz + 6} minecraft:stone`);
    await chat(`fill ${bx - 1} 7 ${bz} ${bx + 2} 7 ${bz} etim:mantle_or_core 0`);
    await chat(`tp @p ${bx + 0.5} 8 ${bz + 3.5}`);
    await sleep(1200);
    const cr = await buildFrame(bx, 8, bz);
    say('WP2 frameB2=' + bx + ',8,' + bz + ' create rows=' + cr.length);
    cr.forEach((l) => say('   ' + l));
    say('WP2 mantle@' + (bx) + ',7,' + bz + ' = ' + await ask(`testforblock ${bx} 7 ${bz} etim:mantle_or_core 0`, 500));
    say('WP2 cell meta@' + bx + ',9,' + bz + ' = ' + await metaOf(bx, 9, bz, 'etim:portal'));
    st.frameB2 = { x: bx, y: 8, z: bz };
    saveState(st);
  }

  /* ------------------------------------------------------------------ WP5 */
  if (phase === 'p5') {
    const fa = st.frameA;
    if (!fa) { say('no frameA'); process.exit(2); }
    if (!(await goto(0))) { say('ABORT p5'); process.exit(2); }
    await buffs(false);
    await chat(`tp @p ${fa.x + 0.5} ${fa.y + 1} ${fa.z + 4.5}`);
    await sleep(1000);
    let before = 0;
    for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
      if ((await metaOf(fa.x + dx, fa.y + dy, fa.z, 'etim:portal')) !== null) before++;
    }
    say('WP5 before portal cells=' + before + '/6');
    const off = logOffset();
    await chat(`setblock ${fa.x} ${fa.y} ${fa.z} minecraft:air`); // 破框基座（obsidian）
    await sleep(1800);
    const t = logSince(off);
    const br = rows(t, /\[DimLog\] portal-break/);
    say('WP5 portal-break rows=' + br.length);
    br.forEach((l) => say('   ' + cut(l.trim(), 200)));
    const inFrame = br.filter((l) => l.includes('x=' + fa.x + ' ') || l.includes('x=' + (fa.x + 1) + ' ')).length;
    say('WP5 break rows at frameA x=' + fa.x + '/' + (fa.x + 1) + ' -> ' + inFrame);
    let after = 0;
    for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
      if (/Successfully found/.test(await ask(`testforblock ${fa.x + dx} ${fa.y + dy} ${fa.z} minecraft:air`, 380))) after++;
    }
    say('WP5 after air cells=' + after + '/6 | soe=' + count(t, /StackOverflowError/));
  }

  /* ------------------------------------------------------------------ WP3 */
  if (phase === 'p3') {
    if (!(await goto(0))) { say('ABORT p3'); process.exit(2); }
    await buffs(false);
    const fb = st.frameB || { x: -108, y: 8, z: 209 };
    say('WP3 frameB=' + JSON.stringify(fb) + ' srcMeta=' + await metaOf(fb.x, fb.y + 1, fb.z, 'etim:portal'));
    await chat(`tp @p ${fb.x + 0.5} ${fb.y + 1} ${fb.z + 0.5}`); // 站进门腔
    await sleep(600);
    const off = logOffset();
    let hit = null;
    for (let i = 0; i < 40; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=-2/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('WP3 portal-place dim=-2 after ' + hit + 's rows=' + count(t, /portal-place dim=-2/));
    rows(t, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    say('WP3 portal-enter rows(B-5)=' + count(t, /\[DimLog\] portal-enter/) + ' | portal-build=' + count(t, /portal-build/));
    const land = await pos();
    say('WP3 landing=' + JSON.stringify(land) + ' dim=' + syncDim() + ' soe=' + count(t, /StackOverflowError/));
    st.arrive = land;
    saveState(st);
    // 到维门 metadata 直接核验（A-2 关键面）
    if (land) {
      const found = await findPortal(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z));
      say('WP3 arrival-door probe -> ' + JSON.stringify(found));
      if (found) { st.arrivalDoor = found; saveState(st); }
    }
  }

  /* ------------------------------------------------------------------ WP4 */
  if (phase === 'p4') {
    if (!(await goto(-2))) { say('ABORT p4 (not in -2)'); process.exit(2); }
    await buffs(false);
    await chat('gamerule doMobSpawning false');
    const fb = st.frameB || { x: -108, y: 8, z: 209 };
    // 在 underworld 的 frameB 同 x/z、y=218 建门（点火 → getPortalTypeBasedOnLocation 应给 0）
    const x = fb.x, y = 218, z = fb.z;
    await chat(`fill ${x - 3} ${y - 1} ${z - 3} ${x + 4} ${y + 6} ${z + 3} minecraft:air`);
    await chat(`fill ${x - 3} ${y - 1} ${z - 3} ${x + 4} ${y - 1} ${z + 3} minecraft:stone`);
    await pad(x, y, z - 3);
    const cr = await buildFrame(x, y, z);
    say('WP4 uw-door at ' + x + ',' + y + ',' + z + ' create rows=' + cr.length);
    cr.forEach((l) => say('   ' + l));
    const doorMeta = await metaOf(x, y, z, 'etim:portal');
    say('WP4 uw-door meta=' + doorMeta + ' (期望 0 = 指回 overworld)');
    st.uwDoor = { x, y, z, meta: doorMeta };
    saveState(st);
    // 出冷却后再站门
    await stepOut(10);
    await sleep(12000);
    const off = logOffset();
    await chat(`tp @p ${x + 0.5} ${y} ${z + 0.5}`);
    let hit = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=0/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('WP4 return after ' + hit + 's: portal-place dim=0 rows=' + count(t, /portal-place dim=0/)
      + ' | portal-build=' + count(t, /portal-build/) + ' | portal-enter=' + count(t, /\[DimLog\] portal-enter/));
    rows(t, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    const land = await pos();
    const dx = land ? Math.abs(land.x - (fb.x + 0.5)) : -1;
    const dz = land ? Math.abs(land.z - (fb.z + 0.5)) : -1;
    say('WP4 landing=' + JSON.stringify(land) + ' vs frameB dx=' + (dx >= 0 ? dx.toFixed(1) : 'n/a')
      + ' dz=' + (dz >= 0 ? dz.toFixed(1) : 'n/a') + ' dim=' + syncDim() + ' soe=' + count(t, /StackOverflowError/));
    // 落点门 metadata（应 = 1 指回 underworld）
    if (land) {
      const found = await findPortal(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z));
      say('WP4 landing-door probe -> ' + JSON.stringify(found) + ' (期望 1 = 指回 underworld)');
      st.returnDoor = found;
      saveState(st);
    }
    st.returnLand = land;
    saveState(st);
  }

  /* -------------------------------------------------------------- WP3b/p3b */
  if (phase === 'p3b') {
    // 远端 miss：主世界远处建贴底门（meta=1）→ 到维无门 → makePortal 新建（应 meta=0）
    if (!(await goto(0))) { say('ABORT p3b'); process.exit(2); }
    await buffs(false);
    const RX = 900, RZ = 900, RY = 8;
    await chat(`tp @p ${RX + 0.5} 100 ${RZ + 0.5}`); // 先把远端区块载入，再 fill
    await sleep(5000);
    await chat(`fill ${RX - 8} 7 ${RZ - 8} ${RX + 8} 7 ${RZ + 8} minecraft:stone`);
    await chat(`fill ${RX - 8} 8 ${RZ - 8} ${RX + 8} 16 ${RZ + 8} minecraft:air`);
    await chat(`fill ${RX - 1} 7 ${RZ} ${RX + 2} 7 ${RZ} etim:mantle_or_core 0`);
    await pad(RX, RY, RZ - 3);
    const cr = await buildFrame(RX, RY, RZ);
    say('WP3b remote ow-door create rows=' + cr.length);
    cr.forEach((l) => say('   ' + l));
    say('WP3b ow-door meta=' + await metaOf(RX, RY + 1, RZ, 'etim:portal') + ' (期望 1)');
    await stepOut(6);
    await sleep(10000);
    const off = logOffset();
    await chat(`tp @p ${RX + 0.5} ${RY + 1} ${RZ + 0.5}`);
    let hit = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=-2/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('WP3b arrive after ' + hit + 's build=' + count(t, /portal-build/) + ' soe=' + count(t, /StackOverflowError/));
    rows(t, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    const land = await pos();
    say('WP3b landing=' + JSON.stringify(land));
    const door = land ? await findPortal(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z)) : null;
    say('WP3b new uw-door probe -> ' + JSON.stringify(door) + ' (期望 meta 0 = 指回 overworld)');
    st.p3bDoor = door; st.p3bLand = land; saveState(st);
    // 回程 miss：站这扇新门 → 主世界远端无 meta=1 门 → makePortal 新建（应 meta=1）
    if (door) {
      await stepOut(6);
      await sleep(10000);
      const off2 = logOffset();
      await chat(`tp @p ${door.x + 0.5} ${door.y} ${door.z + 0.5}`);
      let back = null;
      for (let i = 0; i < 45; i++) {
        await sleep(1000);
        if (/\[DimLog\] portal-place dim=0/.test(logSince(off2))) { back = i + 1; break; }
      }
      const t2 = logSince(off2);
      say('WP3b return after ' + back + 's build=' + count(t2, /portal-build/)
        + ' place0=' + count(t2, /portal-place dim=0/) + ' soe=' + count(t2, /StackOverflowError/));
      rows(t2, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 210)));
      const land2 = await pos();
      const nd = land2 ? await findPortal(Math.floor(land2.x), Math.floor(land2.y), Math.floor(land2.z)) : null;
      say('WP3b landing2=' + JSON.stringify(land2) + ' door2=' + JSON.stringify(nd) + ' (期望 meta 1 = 指回 underworld)');
      st.p3bDoor2 = nd; st.p3bLand2 = land2; saveState(st);
    }
  }

  if (phase === 'p3c') {
    // 受控：从既有 (900,9,900) 门再走一次到 (897,214,898)（该区块上轮已生成）
    if (!(await goto(0))) { say('ABORT p3c'); process.exit(2); }
    await buffs(false);
    await chat('gamerule doMobSpawning false');
    await chat(`tp @p 900.5 9 900.5`);
    await sleep(800);
    const off = logOffset();
    let hit = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=-2/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('p3c arrive after ' + hit + 's build=' + count(t, /portal-build/) + ' soe=' + count(t, /StackOverflowError/));
    rows(t, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    const land = await pos();
    say('p3c landing=' + JSON.stringify(land));
    // 立刻（玩家就在落点附近，区块已载）定位门体
    const door = land ? await findPortal(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z), 5, 3, 5) : null;
    say('p3c door immediately -> ' + JSON.stringify(door));
    // 再用产品列探针（强制 loadChunk）复核该列
    if (land) {
      await chat(`tp @p ${Math.floor(land.x) + 0.5} 120 ${Math.floor(land.z) + 0.5}`);
      await sleep(900);
      const seg = await ask('etim dim probe', 1400);
      const m = seg.match(/gen-probe[^|]*/);
      say('p3c col probe -> ' + (m ? cut(m[0], 200) : 'none'));
      say('p3c col has portal? ' + (m ? /portal=/.test(m[0]) : false));
    }
    st.p3cDoor = door; st.p3cLand = land; saveState(st);
  }

  /* ------------------------------------------------------------- p3br/probe */
  if (phase === 'p3br') {
    if (!(await goto(-2))) { say('ABORT p3br enter'); process.exit(2); }
    await buffs(false);
    await chat('gamerule doMobSpawning false');
    const L = st.p3bLand;
    if (!L) { say('no p3bLand'); process.exit(2); }
    const door = await findPortal(Math.floor(L.x), Math.floor(L.y), Math.floor(L.z), 5, 3, 5);
    say('p3br new uw-door probe -> ' + JSON.stringify(door) + ' (期望 meta 0)');
    if (!door) { say('p3br no door found'); process.exit(3); }
    st.p3bDoor = door; saveState(st);
    await stepOut(6);
    await sleep(11000);
    const off = logOffset();
    await chat(`tp @p ${door.x + 0.5} ${door.y} ${door.z + 0.5}`);
    let back = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=0/.test(logSince(off))) { back = i + 1; break; }
    }
    const t = logSince(off);
    say('p3br return after ' + back + 's build=' + count(t, /portal-build/)
      + ' place0=' + count(t, /portal-place dim=0/) + ' enter=' + count(t, /\[DimLog\] portal-enter/)
      + ' soe=' + count(t, /StackOverflowError/));
    rows(t, /\[DimLog\] portal-(place|build|enter)/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    const land2 = await pos();
    const nd = land2 ? await findPortal(Math.floor(land2.x), Math.floor(land2.y), Math.floor(land2.z), 5, 3, 5) : null;
    say('p3br landing2=' + JSON.stringify(land2) + ' door2=' + JSON.stringify(nd) + ' (期望 meta 1)');
    st.p3bDoor2 = nd; st.p3bLand2 = land2; saveState(st);
  }

  if (phase === 'probe') {
    if (!(await goto(-2))) { say('ABORT probe enter'); process.exit(2); }
    if (st.arrive) say('probe arrivalDoor@' + JSON.stringify(st.arrive) + ' -> ' + JSON.stringify(await findPortal(Math.floor(st.arrive.x), Math.floor(st.arrive.y), Math.floor(st.arrive.z))));
    say('probe uw ignition door@-108,219,209 -> ' + JSON.stringify(await findPortal(-108, 219, 209)));
    if (!(await goto(0))) { say('ABORT probe leave'); process.exit(2); }
    const fb = st.frameB || { x: -108, y: 8, z: 209 };
    say('probe frameB@' + JSON.stringify(fb) + ' -> ' + JSON.stringify(await findPortal(fb.x, fb.y + 1, fb.z, 2, 2, 2)));
    if (st.p3bLand2) say('probe p3bLand2@' + JSON.stringify(st.p3bLand2) + ' -> ' + JSON.stringify(await findPortal(Math.floor(st.p3bLand2.x), Math.floor(st.p3bLand2.y), Math.floor(st.p3bLand2.z), 5, 3, 5)));
  }

  /* ------------------------------------------------------------------ WP6 */
  if (phase === 'p6') {
    // 先在主世界核 achievement 树解析
    if (!(await goto(0))) { say('ABORT p6 (not in 0)'); process.exit(2); }
    await buffs(false);
    say('WP6 tree: test root -> ' + cut(await ask('advancement test @s etim:root', 1100), 180));
    say('WP6 tree: test portal_to_nether -> ' + cut(await ask('advancement test @s etim:portal_to_nether', 1100), 180));
    if (!(await goto(-2))) { say('ABORT p6 enter'); process.exit(2); }
    await buffs(false);
    await chat('gamerule doMobSpawning false');
    // 构造面：y=5，stone 目标块 + 横邻 mantle_or_core（同一挖块触发链）
    const x = -104, y = 5, z = 205;
    await chat(`tp @p ${x + 0.5} 30 ${z + 0.5}`); // 先让该列区块载入
    await sleep(3000);
    say('WP6 fill-air -> ' + cut(await ask(`fill ${x - 2} ${y} ${z - 2} ${x + 2} ${y + 3} ${z + 2} minecraft:air`, 700), 120));
    say('WP6 fill-floor -> ' + cut(await ask(`fill ${x - 2} ${y - 1} ${z - 2} ${x + 2} ${y - 1} ${z + 2} minecraft:stone`, 700), 120));
    say('WP6 set-stone -> ' + cut(await ask(`setblock ${x} ${y} ${z} minecraft:stone`, 700), 120));
    say('WP6 set-mantle -> ' + cut(await ask(`setblock ${x + 1} ${y} ${z} etim:mantle_or_core 0`, 700), 120));
    await chat('gamemode 1');
    await chat(`tp @p ${x + 0.5} ${y} ${z + 2.5}`);
    await sleep(1800);
    say('WP6 setup target=' + cut(await ask(`testforblock ${x} ${y} ${z} minecraft:stone`, 500), 90)
      + ' | mantle=' + cut(await ask(`testforblock ${x + 1} ${y} ${z} etim:mantle_or_core 0`, 500), 90)
      + ' | dim=' + syncDim());
    const off = logOffset();
    try {
      await bot.lookAt(new Vec3(x + 0.5, y + 0.5, z + 0.5), true);
      await sleep(600);
      const blk = bot.blockAt(new Vec3(x, y, z));
      say('WP6 client view=' + (blk ? blk.name : 'null'));
      await bot.dig(blk || { position: new Vec3(x, y, z), name: 'stone' });
    } catch (e) { say('WP6 dig err ' + e.message); }
    await sleep(3000);
    const t = logSince(off);
    const ach = rows(t, /achievement-portalToNether/);
    say('WP6 achievement rows=' + ach.length);
    ach.forEach((l) => say('   ' + cut(l.trim(), 210)));
    say('WP6 target now air? ' + cut(await ask(`testforblock ${x} ${y} ${z} minecraft:air`, 500), 90));
    say('WP6 after-dig test portal -> ' + cut(await ask('advancement test @s etim:portal_to_nether', 1100), 200));
    say('WP6 after-dig test root -> ' + cut(await ask('advancement test @s etim:root', 1100), 200));
    say('WP6 soe=' + count(t, /StackOverflowError/));
  }

  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
