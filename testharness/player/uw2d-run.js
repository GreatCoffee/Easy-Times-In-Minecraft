#!/usr/bin/env node
/**
 * uw2d-run.js — underworld 二阶段 A-4/A-5 修后第四窗 driver（会话七，2026-10-25）
 *
 * 相位：
 *   home  从任何维回主世界安全点
 *   p1    WP1 dim0 悬空框（meta=0）
 *   p2    WP2 dim0 贴底框（meta=1）
 *   p2b   WP2b underworld 贴底框（R196: 非 overworld 贴底 → meta=2）
 *   p3    WP3 去程：站 frameB → 远坐标 makePortal → portal-build/portal-built +
 *         marker（金块）+ testfor portal ±3 + marker
 *   p4    维往返 1（/etim dim leave→enter，触发 -2 unload/reload）→ 门/marker 复测 + gen-probe
 *   p4b   维往返 2（同）
 *   p5    WP4 命中面：站到达门 → 回 dim0 → build=0 → 落 frameB
 *   p5b   A-5 复验：同坐标串再走一次 → 落点 testfor 命中 portal 或 build=1
 *   p6    WP5 破 frameA → 6 行 portal-break
 *   p7    WP6 成就（-2 y=5 构造面）+ /advancement test
 *
 * 判维：/etim dim leave 的 `from=` 行（无冷却门、必出）。
 * 探块：先 tp 到目标列附近（testforblock 需目标区块已载入），再立方体搜索。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const STATE = path.join(ROOT, 'build-logs', 'uw2d-state.json');
const NAME = 'ETIM_Harn01';

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
  const metaOf = async (x, y, z, blk) => {
    for (const v of [0, 1, 2]) {
      const r = await ask(`testforblock ${x} ${y} ${z} ${blk} ${v}`, 400);
      if (/Successfully found/.test(r)) return v;
    }
    return null;
  };
  const findPortal = async (cx, cy, cz, rx, ry, rz) => {
    const X = rx === undefined ? 4 : rx, Y = ry === undefined ? 3 : ry, Z = rz === undefined ? 4 : rz;
    const cells = [];
    for (let dx = -X; dx <= X; dx++) for (let dz = -Z; dz <= Z; dz++) for (let dy = -1; dy <= Y; dy++) {
      cells.push([dx, dy, dz, dx * dx + dy * dy + dz * dz]);
    }
    cells.sort((a, b) => a[3] - b[3]);
    for (const [dx, dy, dz] of cells) {
      const x = cx + dx, y = cy + dy, z = cz + dz;
      const r = await ask(`testforblock ${x} ${y} ${z} etim:portal`, 260);
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
  /** tp 到目标列旁 3 格（同 y），确保目标 chunk 已载入，再做探块 */
  const standNear = async (x, y, z, dz) => {
    const tz = z + (dz === undefined ? 4 : dz);
    await pad(x, y, tz);
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
  /** 门/marker 复测：返回 {portal, markerOk} */
  const probeDoor = async (x, y, z, marker) => {
    await standNear(x, y, z, 4);
    const portal = await findPortal(x, y, z, 4, 3, 4);
    let markerOk = false;
    if (marker) {
      const r = await ask(`testforblock ${marker.x} ${marker.y} ${marker.z} minecraft:gold_block`, 500);
      markerOk = /Successfully found/.test(r);
    }
    return { portal, markerOk };
  };

  say('PHASE ' + phase + ' start pos=' + JSON.stringify(await pos()));

  /* ---------------------------------------------------------------- home */
  if (phase === 'home') {
    if (!(await goto(0))) { say('home FAILED'); process.exit(2); }
    const p = await pos();
    await pad(Math.floor(p.x) + 20, 150, Math.floor(p.z) + 20);
    say('home ok pos=' + JSON.stringify(await pos()));
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
    say('WP1 cell meta=' + await metaOf(ax, ay + 1, az, 'etim:portal'));
    st.frameA = { x: ax, y: ay, z: az };
    saveState(st);
  }

  /* ------------------------------------------------------------------ WP2 */
  if (phase === 'p2') {
    if (!(await goto(0))) { say('ABORT p2'); process.exit(2); }
    await buffs(false);
    const p = await pos();
    const bx = Math.floor(p.x) - 120, bz = Math.floor(p.z) - 120;
    await chat(`tp @p ${bx + 0.5} 20 ${bz + 0.5}`);
    await sleep(4000);
    await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 15 ${bz + 6} minecraft:air`);
    await chat(`fill ${bx - 6} 7 ${bz - 6} ${bx + 7} 7 ${bz + 6} minecraft:stone`);
    await chat(`fill ${bx - 1} 7 ${bz} ${bx + 2} 7 ${bz} etim:mantle_or_core 0`);
    await chat(`tp @p ${bx + 0.5} 8 ${bz + 3.5}`);
    await sleep(1500);
    const cr = await buildFrame(bx, 8, bz);
    say('WP2 frameB=' + bx + ',8,' + bz + ' create rows=' + cr.length);
    cr.forEach((l) => say('   ' + l));
    say('WP2 mantle=' + cut(await ask(`testforblock ${bx} 7 ${bz} etim:mantle_or_core 0`, 500), 90));
    say('WP2 cell meta=' + await metaOf(bx, 9, bz, 'etim:portal'));
    st.frameB = { x: bx, y: 8, z: bz };
    saveState(st);
  }

  /* ----------------------------------------------------------------- WP2b */
  if (phase === 'p2b') {
    if (!(await goto(-2))) { say('ABORT p2b'); process.exit(2); }
    await buffs(false);
    const p = await pos();
    const cx = Math.floor(p.x) + 30, cz = Math.floor(p.z) + 30, cy = 5;
    await chat(`tp @p ${cx + 0.5} 40 ${cz + 0.5}`);
    await sleep(4000);
    await chat(`fill ${cx - 5} ${cy - 1} ${cz - 5} ${cx + 6} ${cy + 6} ${cz + 5} minecraft:air`);
    await chat(`fill ${cx - 5} ${cy - 2} ${cz - 5} ${cx + 6} ${cy - 2} ${cz + 5} minecraft:stone`);
    await chat(`fill ${cx - 1} ${cy - 1} ${cz} ${cx + 2} ${cy - 1} ${cz} etim:mantle_or_core 0`);
    await chat(`tp @p ${cx + 0.5} ${cy} ${cz + 3.5}`);
    await sleep(1500);
    const cr = await buildFrame(cx, cy, cz);
    say('WP2b uw-bottom frame=' + cx + ',' + cy + ',' + cz + ' create rows=' + cr.length);
    cr.forEach((l) => say('   ' + l));
    say('WP2b cell meta=' + await metaOf(cx, cy + 1, cz, 'etim:portal') + ' (R196: 非 overworld 贴底 -> 2)');
    st.frameC = { x: cx, y: cy, z: cz };
    saveState(st);
  }

  /* ------------------------------------------------------------------ WP3 */
  if (phase === 'p3') {
    if (!(await goto(0))) { say('ABORT p3'); process.exit(2); }
    await buffs(false);
    await chat('gamerule doMobSpawning false');
    const fb = st.frameB;
    if (!fb) { say('no frameB'); process.exit(2); }
    say('WP3 frameB=' + JSON.stringify(fb) + ' srcMeta=' + await metaOf(fb.x, fb.y + 1, fb.z, 'etim:portal'));
    const off = logOffset();
    await chat(`tp @p ${fb.x + 0.5} ${fb.y + 1} ${fb.z + 0.5}`);
    let hit = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=-2/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('WP3 arrive after ' + hit + 's');
    rows(t, /\[DimLog\] portal-(create|build|built|place|enter)/).forEach((l) => say('   ' + cut(l.trim(), 230)));
    say('WP3 counts: build=' + count(t, /portal-build/) + ' built=' + count(t, /portal-built/)
      + ' place=' + count(t, /portal-place/) + ' enter=' + count(t, /\[DimLog\] portal-enter/)
      + ' soe=' + count(t, /StackOverflowError/));
    const land = await pos();
    say('WP3 landing=' + JSON.stringify(land));
    st.arrive = land; saveState(st);
    // 门体定位（先 tp 到旁边确保 chunk 已载）
    if (land) {
      const isIt = await probeDoor(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z), null);
      say('WP3 door immediately -> ' + JSON.stringify(isIt.portal));
      st.arriveDoor = isIt.portal; saveState(st);
    }
    // marker：portal-built 原点旁 +2/+1/+2 放金块
    const pb = rows(t, /\[DimLog\] portal-built/);
    if (pb.length) {
      const m = pb[0].match(/x=(-?\d+) y=(-?\d+) z=(-?\d+)/);
      const built = m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
      say('WP3 portal-built parsed=' + JSON.stringify(built));
      if (built) {
        const mk = { x: built.x + 2, y: built.y + 1, z: built.z + 2 };
        await chat(`setblock ${mk.x} ${mk.y} ${mk.z} minecraft:gold_block`);
        await sleep(600);
        say('WP3 marker set ' + JSON.stringify(mk) + ' -> '
          + cut(await ask(`testforblock ${mk.x} ${mk.y} ${mk.z} minecraft:gold_block`, 500), 90));
        st.marker = mk; st.portalBuilt = built; saveState(st);
        const re = await probeDoor(built.x, built.y, built.z, mk);
        say('WP3 post-marker: portal=' + JSON.stringify(re.portal) + ' markerOk=' + re.markerOk);
      }
    }
  }

  /* ------------------------------------------- p4 / p4b 维往返（unload 面） */
  if (phase === 'p4' || phase === 'p4b') {
    if (!(await goto(-2))) { say('ABORT ' + phase); process.exit(2); }
    await buffs(false);
    const pb = st.portalBuilt, mk = st.marker;
    if (!pb) { say('no portalBuilt'); process.exit(2); }
    // before
    const before = await probeDoor(pb.x, pb.y, pb.z, mk);
    say(phase + ' BEFORE: portal=' + JSON.stringify(before.portal) + ' markerOk=' + before.markerOk);
    // leave → 观察 -2 unload
    const offL = logOffset();
    await chat('etim dim leave');
    let unload = false, unloadLine = '';
    for (let i = 0; i < 25; i++) {
      await sleep(1000);
      const tt = logSince(offL);
      const m = tt.match(/Unloading dimension -2[^\n]*/);
      if (m) { unload = true; unloadLine = m[0]; break; }
    }
    say(phase + ' unload(-2)=' + unload + (unload ? ' :: ' + cut(unloadLine, 120) : ''));
    await sleep(6000);
    // enter → reload
    const offE = logOffset();
    await chat('etim dim enter');
    let inUw = false;
    for (let i = 0; i < 12; i++) {
      await sleep(1200);
      if (/\[DimLog\] enter player=.*to=-2/.test(logSince(offE))) { inUw = true; break; }
    }
    say(phase + ' re-enter=' + inUw);
    const after = await probeDoor(pb.x, pb.y, pb.z, mk);
    say(phase + ' AFTER: portal=' + JSON.stringify(after.portal) + ' markerOk=' + after.markerOk);
    // gen-probe 覆盖 portal 列（取门列，不是站位列：tp 到同列安全高度）
    const offTp = logOffset();
    await chat(`tp @p ${pb.x + 0.5} 160 ${pb.z + 0.5}`);
    await sleep(1500);
    const seg = await ask('etim dim probe', 1500);
    const mm = seg.match(/gen-probe[^|]*/);
    say(phase + ' gen-probe(portal col ' + pb.x + ',' + pb.z + ') -> ' + (mm ? cut(mm[0], 260) : 'none'));
    say(phase + ' col has portal? ' + (mm ? /portal=/.test(mm[0]) : false)
      + ' | path=' + count(logSince(offTp), /gen-probe/));
    // 额外：marker 所在 chunk 也记
    say(phase + ' result mirror: portal=' + JSON.stringify(after.portal) + ' marker=' + after.markerOk);
    st['probe_' + phase] = { portal: after.portal, markerOk: after.markerOk, unload: unload };
    saveState(st);
  }

  /* ------------------------------------------------------------------ WP4 */
  if (phase === 'p5') {
    if (!(await goto(-2))) { say('ABORT p5'); process.exit(2); }
    await buffs(false);
    const pb = st.portalBuilt;
    if (!pb) { say('no portalBuilt'); process.exit(2); }
    const door = (await probeDoor(pb.x, pb.y, pb.z, null)).portal;
    say('WP4 uw door=' + JSON.stringify(door));
    if (!door) { say('p5 no door'); process.exit(3); }
    await stepOut(8);
    await sleep(12000);
    const off = logOffset();
    await chat(`tp @p ${door.x + 0.5} ${door.y} ${door.z + 0.5}`);
    let hit = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=0/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('WP4 return after ' + hit + 's: build=' + count(t, /portal-build/) + ' built=' + count(t, /portal-built/)
      + ' place0=' + count(t, /portal-place dim=0/) + ' enter=' + count(t, /\[DimLog\] portal-enter/)
      + ' soe=' + count(t, /StackOverflowError/));
    rows(t, /\[DimLog\] portal-(build|built|place|enter)/).forEach((l) => say('   ' + cut(l.trim(), 230)));
    const land = await pos();
    const fb = st.frameB;
    const dx = land ? Math.abs(land.x - (fb.x + 0.5)) : -1;
    const dz = land ? Math.abs(land.z - (fb.z + 0.5)) : -1;
    say('WP4 landing=' + JSON.stringify(land) + ' vs frameB dx=' + (dx >= 0 ? dx.toFixed(1) : 'n/a')
      + ' dz=' + (dz >= 0 ? dz.toFixed(1) : 'n/a') + ' soe=' + count(t, /StackOverflowError/));
    if (land) {
      const d2 = (await probeDoor(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z), null)).portal;
      say('WP4 landing door -> ' + JSON.stringify(d2) + ' (期望 meta=1)');
    }
  }

  /* ----------------------------------------------------------------- p5b */
  if (phase === 'p5b') {
    // A-5：同坐标串再走一次（站 frameB）→ 落点必须命中真实门，或 build=1 重建
    if (!(await goto(0))) { say('ABORT p5b'); process.exit(2); }
    await buffs(false);
    const fb = st.frameB;
    await chat(`tp @p ${fb.x + 0.5} ${fb.y} ${fb.z + 3.5}`);
    await sleep(12000);
    const off = logOffset();
    await chat(`tp @p ${fb.x + 0.5} ${fb.y + 1} ${fb.z + 0.5}`);
    let hit = null;
    for (let i = 0; i < 45; i++) {
      await sleep(1000);
      if (/\[DimLog\] portal-place dim=-2/.test(logSince(off))) { hit = i + 1; break; }
    }
    const t = logSince(off);
    say('p5b second-pass arrive after ' + hit + 's: build=' + count(t, /portal-build/)
      + ' built=' + count(t, /portal-built/) + ' place=' + count(t, /portal-place/)
      + ' enter=' + count(t, /\[DimLog\] portal-enter/) + ' soe=' + count(t, /StackOverflowError/));
    rows(t, /\[DimLog\] portal-(build|built|place|enter)/).forEach((l) => say('   ' + cut(l.trim(), 230)));
    const land = await pos();
    say('p5b landing=' + JSON.stringify(land));
    if (land) {
      const d = (await probeDoor(Math.floor(land.x), Math.floor(land.y), Math.floor(land.z), null)).portal;
      say('p5b landing door -> ' + JSON.stringify(d) + ' (命中=真门 或 build=1 重建)');
      st.secondPass = { land, door: d, build: count(t, /portal-build/) };
      saveState(st);
    }
  }

  /* ------------------------------------------------------------------ WP5 */
  if (phase === 'p6') {
    const fa = st.frameA;
    if (!fa) { say('no frameA'); process.exit(2); }
    if (!(await goto(0))) { say('ABORT p6'); process.exit(2); }
    await buffs(false);
    await chat(`tp @p ${fa.x + 0.5} ${fa.y + 1} ${fa.z + 4.5}`);
    await sleep(1200);
    let before = 0;
    for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
      if ((await metaOf(fa.x + dx, fa.y + dy, fa.z, 'etim:portal')) !== null) before++;
    }
    say('WP5 before portal cells=' + before + '/6');
    const off = logOffset();
    await chat(`setblock ${fa.x} ${fa.y} ${fa.z} minecraft:air`);
    await sleep(1800);
    const t = logSince(off);
    const br = rows(t, /\[DimLog\] portal-break/);
    say('WP5 portal-break rows=' + br.length);
    br.forEach((l) => say('   ' + cut(l.trim(), 200)));
    let after = 0;
    for (let dx = 0; dx < 2; dx++) for (let dy = 1; dy <= 3; dy++) {
      if (/Successfully found/.test(await ask(`testforblock ${fa.x + dx} ${fa.y + dy} ${fa.z} minecraft:air`, 380))) after++;
    }
    say('WP5 after air cells=' + after + '/6 | soe=' + count(t, /StackOverflowError/));
  }

  /* ------------------------------------------------------------------ WP6 */
  if (phase === 'p7') {
    if (!(await goto(0))) { say('ABORT p7'); process.exit(2); }
    await buffs(false);
    say('WP6 tree root -> ' + cut(await ask('advancement test @s etim:root', 1100), 170));
    say('WP6 tree portal -> ' + cut(await ask('advancement test @s etim:portal_to_nether', 1100), 170));
    if (!(await goto(-2))) { say('ABORT p7 enter'); process.exit(2); }
    await buffs(false);
    await chat('gamerule doMobSpawning false');
    const p = await pos();
    const x = Math.floor(p.x) + 20, z = Math.floor(p.z) + 20, y = 5;
    await chat(`tp @p ${x + 0.5} 40 ${z + 0.5}`);
    await sleep(4000);
    say('WP6 fill-air -> ' + cut(await ask(`fill ${x - 2} ${y} ${z - 2} ${x + 2} ${y + 3} ${z + 2} minecraft:air`, 700), 90));
    say('WP6 fill-floor -> ' + cut(await ask(`fill ${x - 2} ${y - 1} ${z - 2} ${x + 2} ${y - 1} ${z + 2} minecraft:stone`, 700), 90));
    say('WP6 set-stone -> ' + cut(await ask(`setblock ${x} ${y} ${z} minecraft:stone`, 700), 90));
    say('WP6 set-mantle -> ' + cut(await ask(`setblock ${x + 1} ${y} ${z} etim:mantle_or_core 0`, 700), 90));
    await chat('gamemode 1');
    await chat(`tp @p ${x + 0.5} ${y} ${z + 2.5}`);
    await sleep(1800);
    say('WP6 target=' + cut(await ask(`testforblock ${x} ${y} ${z} minecraft:stone`, 500), 90)
      + ' | mantle=' + cut(await ask(`testforblock ${x + 1} ${y} ${z} etim:mantle_or_core 0`, 500), 90));
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
    say('WP6 after-dig test portal -> ' + cut(await ask('advancement test @s etim:portal_to_nether', 1100), 190));
    say('WP6 soe=' + count(t, /StackOverflowError/));
  }

  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
