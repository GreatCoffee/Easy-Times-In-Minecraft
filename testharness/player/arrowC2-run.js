#!/usr/bin/env node
/**
 * arrowC2-run.js — 批 C 复验窗 driver（会话七，2026-10-26）
 *
 * 相位：
 *   w1  A-1'① 满拉暴击：arrow hit final=<数值>，crit=1，final/raw ∈ [1.5,2.0)
 *   w2  A-1'⑤a 半拉：crit=0，final=raw（数值）
 *   w3  A-1'② Longdead：spawn enchanted=false + hit floor=9.000 final=9.000 crit=0
 *   w4  A-1'③ Guardian：floor=10.000 final=10.000
 *   w5  A-1'④ 发射器：floor=7.000 final=7.000（只抬不压）
 *   w8  A-1'⑤b 慢速：skip=slow 行 final=0.000 + 箭存活
 *   w11 A-1'⑤c 不足 1 心：skip=half-heart 行 final=0.000 + 箭存活
 *   w9  W9' 口径矩阵：创造本体(无队)=rejected / 创造+同队门=creative+穿透 /
 *       生存+同队门=creative+穿透 / 生存无队=生效（final>0）
 *   w16 W16' 服务端面：Punch I 命中 bot → 存档 playerdata Motion 采样；
 *       无附魔对照；mob（villager）位移面交叉核 0.6 系数
 *
 * 判据通道：latest.log 判行 + RCON 回包 + 存档离线 NBT（player / rect）。1.12 无 /data。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { execFileSync } = require('child_process');
const { Vec3 } = require('vec3');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'uw2', 'logs', 'latest.log');
const NBT = path.join(__dirname, 'arrowB-nbt.js');
const OUT = path.join(ROOT, 'build-logs', 'arrowC2-report.json');
const NAME = 'ETIM_Harn01';
const NAME2 = 'ETIM_Harn02';
const WORLD = 'arrowc2';
const GY = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
const rows = (t, re) => t.split('\n').filter((l) => re.test(l));
const count = (t, re) => rows(t, re).length;
const cut = (l, n) => (l.length > (n || 210) ? l.slice(0, n || 210) : l);
const ng = (v) => (v === null || v === undefined ? 'n/a' : Number(v).toFixed(3));
const R = {}; // 机读结果

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

const parseHit = (line) => {
  const m = /arrow hit target=(.+?) raw=([-\d.]+) mult=([-\d.]+) floor=([-\d.]+) crit=([01]) final=([-\d.]+)(?: skip=([\w-]+))?/.exec(line);
  if (!m) return null;
  return { target: m[1], raw: +m[2], mult: +m[3], floor: +m[4], crit: +m[5], final: +m[6], skip: m[7] || null, line: line.trim() };
};
const hits = (t) => rows(t, /arrow hit /).map(parseHit).filter(Boolean);
const hitWith = (t, pred) => hits(t).filter(pred);

(async () => {
  const phase = (process.argv[2] || 'all').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(3000);
  const run = (p) => phase === 'all' || phase === p;

  const look = async (x, y, z) => { await bot.lookAt(new Vec3(x, y, z), true); await sleep(650); };
  const shoot = async (drawMs) => {
    const bow = bot.inventory.items().find((i) => i.name === 'bow');
    if (!bow) { say('  ! no bow'); return false; }
    await bot.equip(bow, 'hand');
    await sleep(700);
    bot.activateItem();
    await sleep(drawMs);
    bot.deactivateItem();
    const e = bot.entity;
    say('   shot pos=' + (e ? [e.position.x.toFixed(1), e.position.y.toFixed(1), e.position.z.toFixed(1)].join(',') : '-')
      + ' yaw=' + (e ? e.yaw.toFixed(1) : '-') + ' pitch=' + (e ? e.pitch.toFixed(1) : '-'));
    await sleep(1400);
    return true;
  };
  const ready = async (z, items) => {
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} ${z + 0.5}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    for (const it of (items || [])) await rcon.cmd(`give ${NAME} ${it}`);
    await sleep(1400);
  };
  const waitHit = async (off, pred, timeoutMs) => {
    const t0 = Date.now();
    for (;;) {
      const h = hitWith(logSince(off), pred);
      if (h.length) return h;
      if (Date.now() - t0 > (timeoutMs || 9000)) return [];
      await sleep(150);
    }
  };
  const summon = async (cmd) => cut(String(await rcon.cmd(cmd, 8000)), 120);
  const killAll = async (type) => { await rcon.cmd(`kill @e[type=${type}]`, 8000); };
  const countArrows = async () => {
    await rcon.cmd('scoreboard objectives add arrowCnt dummy', 8000);
    await rcon.cmd('scoreboard players set #arrows arrowCnt 0', 8000);
    await rcon.cmd('execute @e[type=etim:metal_arrow] ~ ~ ~ scoreboard players add #arrows arrowCnt 1', 8000);
    const r = await rcon.cmd('scoreboard players list #arrows', 8000);
    const m = String(r).match(/arrowCnt:\s*(-?\d+)/);
    return m ? Number(m[1]) : null;
  };

  /* ---------------- 存档面读取 ---------------- */
  const snapEnts = () => {
    try {
      const raw = execFileSync(process.execPath, [NBT, 'rect', WORLD, 'overworld', '96', '96', '130', '248'],
        { encoding: 'utf8' }).trim();
      return JSON.parse(raw.split('\n').pop());
    } catch (e) { return []; }
  };
  const snapPlayer = (name) => {
    try {
      const raw = execFileSync(process.execPath, [NBT, 'player', WORLD, name], { encoding: 'utf8' }).trim();
      return JSON.parse(raw.split('\n').pop());
    } catch (e) { return { error: e.message }; }
  };
  const hpOf = async (who) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await rcon.cmd('save-all', 20000);
      await sleep(1200 + attempt * 700);
      if (who.charAt(0) === '@') {
        const p = snapPlayer(who.slice(1));
        if (typeof p.Health === 'number') return p.Health;
      } else {
        const e = snapEnts().find((x) => String(x.CustomName) === who);
        if (e && typeof e.Health === 'number') return e.Health;
      }
    }
    return null;
  };
  const gametime = async () => {
    const r = await rcon.cmd('time query gametime', 8000);
    const m = String(r).match(/(\d+)/);
    return m ? Number(m[1]) : null;
  };
  /** 存档面 Motion 采样：先记 gametime，save-all 落盘，再读 playerdata，再记 gametime */
  const sampleMotion = async (pname) => {
    const g0 = await gametime();
    await rcon.cmd('save-all', 30000);
    const p = snapPlayer(pname);
    const g1 = await gametime();
    const m = Array.isArray(p.Motion) ? p.Motion : null;
    const h = m ? Math.hypot(m[0], m[2]) : null;
    return { g0, g1, dt: (g0 !== null && g1 !== null) ? (g1 - g0) : null,
      motion: m, horiz: h, pos: p.Pos, hurt: p.HurtTime, health: p.Health };
  };

  /* 清场（先到场区再清，保证 chunk 在载） */
  await rcon.cmd(`tp ${NAME} 110 8 170`);
  await sleep(1400);
  await rcon.cmd('gamerule doMobSpawning false');
  await rcon.cmd('gamerule doDaylightCycle false');
  await rcon.cmd('gamerule keepInventory true');
  await rcon.cmd('time set 1000');
  await rcon.cmd('kill @e[type=!player]');
  await rcon.cmd('kill @e[type=etim:metal_arrow]');
  await sleep(600);

  /* ================================================================ W1 */
  if (run('w1')) {
    say('=========== W1 A-1\'① 满拉暴击（final= 应为数值）===========');
    await rcon.cmd(`effect ${NAME} clear`);
    await ready(100, ['etim:arrow_ancient_metal 8']);
    say('   summon -> ' + await summon('summon minecraft:villager 104.5 4 100.5 {CustomName:"W1Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}'));
    await sleep(1500);
    const h0 = await hpOf('W1Vil');
    const off = logOffset();
    await look(104.5, 5.0, 100.5);
    await shoot(1600);
    const h = await waitHit(off, (x) => x.target === 'W1Vil', 9000);
    h.forEach((x) => say('W1 hit ' + cut(x.line, 200)));
    const hp1 = await hpOf('W1Vil');
    const delta = (h0 !== null && hp1 !== null) ? h0 - hp1 : null;
    const c1 = h.find((x) => x.crit === 1);
    const ratio = c1 ? c1.final / c1.raw : null;
    const ok = !!c1 && c1.final > 0 && ratio >= 1.5 && ratio < 2.0 && (delta === null || (delta / c1.raw >= 1.49 && delta / c1.raw < 2.01));
    say('W1 判值: crit=1=' + (!!c1) + ' final=' + (c1 ? ng(c1.final) : '-') + ' raw=' + (c1 ? ng(c1.raw) : '-')
      + ' ratio=' + ng(ratio) + ' in[1.5,2.0)=' + (ratio !== null && ratio >= 1.5 && ratio < 2.0)
      + ' 血量Δ=' + ng(delta) + ' Δ/raw=' + ng(delta !== null && c1 ? delta / c1.raw : null) + ' -> ' + ok);
    R.w1 = { ok, hit: c1, ratio, hp: [h0, hp1, delta] };
    await rcon.cmd('kill @e[name=W1Vil]');
  }

  /* ================================================================ W2 */
  if (run('w2')) {
    say('=========== W2 A-1\'⑤a 半拉（final=raw 数值）===========');
    await rcon.cmd(`effect ${NAME} clear`);
    await ready(104, ['etim:arrow_ancient_metal 8']);
    say('   summon -> ' + await summon('summon minecraft:villager 104.5 4 104.5 {CustomName:"W2Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}'));
    await sleep(1400);
    const hb = await hpOf('W2Vil');
    const off = logOffset();
    await look(104.5, 5.0, 104.5);
    await shoot(500);
    const h = await waitHit(off, (x) => x.target === 'W2Vil', 9000);
    h.forEach((x) => say('W2 hit ' + cut(x.line, 200)));
    const hp2 = await hpOf('W2Vil');
    const delta = (hb !== null && hp2 !== null) ? hb - hp2 : null;
    const c2 = h.find((x) => x.crit === 0);
    const ok = !!c2 && c2.final > 0 && Math.abs(c2.final - c2.raw) < 0.005 && c2.skip === null;
    say('W2 判值: crit=0=' + (!!c2) + ' final=' + (c2 ? ng(c2.final) : '-') + ' raw=' + (c2 ? ng(c2.raw) : '-')
      + ' |final-raw|=' + (c2 ? ng(Math.abs(c2.final - c2.raw)) : '-') + ' 血量Δ=' + ng(delta) + ' -> ' + ok);
    R.w2 = { ok, hit: c2, hp: [hb, hp2, delta] };
    await rcon.cmd('kill @e[name=W2Vil]');
    await sleep(600);
  }

  /* ================================================================ W3 */
  if (run('w3')) {
    say('=========== W3 A-1\'② Longdead 下限（final=9.000）===========');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 110.5`);
    await sleep(800);
    const off = logOffset();
    await summon('summon etim:longdead 112.5 4 110.5 {CustomName:"W3Longdead",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}');
    let h = [];
    for (let i = 0; i < 100; i++) {
      await sleep(400);
      h = hitWith(logSince(off), (x) => x.target === NAME);
      if (h.length >= 2) break;
    }
    const tt = logSince(off);
    rows(tt, /ArrowLog\] arrow (spawn|skeleton)/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    h.forEach((x) => say('W3 hit ' + cut(x.line, 200)));
    const skelSpawn = rows(tt, /arrow spawn shooter=W3Longdead/).length;
    const enchFalse = rows(tt, /arrow spawn shooter=W3Longdead .*enchanted=false/).length;
    const f = h.find((x) => x.floor === 9);
    const ok = !!f && f.final === 9 && f.crit === 0 && f.skip === null && enchFalse === skelSpawn && skelSpawn > 0;
    say('W3 判值: spawn=' + skelSpawn + ' enchanted=false=' + enchFalse + ' floor9=' + (!!f)
      + ' final=' + (f ? ng(f.final) : '-') + ' crit=' + (f ? f.crit : '-') + ' -> ' + ok);
    R.w3 = { ok, skelSpawn, enchFalse, hit: f, hits: h };
    await killAll('etim:longdead');
    await sleep(1200);
  }

  /* ================================================================ W4 */
  if (run('w4')) {
    say('=========== W4 A-1\'③ Guardian 下限（final=10.000）===========');
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 120.5`);
    await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
    await sleep(800);
    const off = logOffset();
    await summon('summon etim:longdead_guardian 112.5 4 120.5 {CustomName:"W4Guardian",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}');
    let h = [];
    for (let i = 0; i < 100; i++) {
      await sleep(400);
      h = hitWith(logSince(off), (x) => x.target === NAME);
      if (h.length >= 2) break;
    }
    const tt = logSince(off);
    rows(tt, /ArrowLog\] arrow skeleton/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    h.forEach((x) => say('W4 hit ' + cut(x.line, 200)));
    const f = h.find((x) => x.floor === 10);
    const ok = !!f && f.final === 10 && f.crit === 0 && f.skip === null;
    say('W4 判值: floor10=' + (!!f) + ' final=' + (f ? ng(f.final) : '-') + ' crit=' + (f ? f.crit : '-') + ' -> ' + ok);
    R.w4 = { ok, hit: f, hits: h };
    await killAll('etim:longdead_guardian');
    await sleep(1200);
  }

  /* ================================================================ W5 */
  if (run('w5')) {
    say('=========== W5 A-1\'④ 发射器下限（final=7.000，只抬不压）===========');
    await rcon.cmd(`effect ${NAME} clear`);
    await rcon.cmd('setblock 108 4 130 minecraft:air');
    await rcon.cmd('setblock 108 5 130 minecraft:air');
    await summon('summon minecraft:villager 102.5 4 130.5 {CustomName:"W5Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await rcon.cmd('setblock 108 4 130 minecraft:dispenser 4'); // 朝 -X
    await rcon.cmd('blockdata 108 4 130 {Items:[{Slot:0b,id:"etim:arrow_ancient_metal",Count:64b}]}');
    await sleep(1500);
    const hb = await hpOf('W5Vil');
    const off = logOffset();
    await rcon.cmd('setblock 108 5 130 minecraft:redstone_block');
    let h = [];
    for (let i = 0; i < 50; i++) {
      await sleep(300);
      h = hitWith(logSince(off), (x) => x.target === 'W5Vil');
      if (h.length) break;
    }
    await rcon.cmd('setblock 108 5 130 minecraft:air');
    const tt = logSince(off);
    rows(tt, /arrow dispense/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    h.forEach((x) => say('W5 hit ' + cut(x.line, 200)));
    const hp5 = await hpOf('W5Vil');
    const delta = (hb !== null && hp5 !== null) ? hb - hp5 : null;
    const f = h.find((x) => x.floor === 7);
    const ok = !!f && f.final === 7 && f.skip === null && rows(tt, /arrow dispense/).length > 0;
    say('W5 判值: floor7=' + (!!f) + ' final=' + (f ? ng(f.final) : '-') + ' raw=' + (f ? ng(f.raw) : '-')
      + ' 血量Δ=' + ng(delta) + ' dispense行=' + rows(tt, /arrow dispense/).length + ' -> ' + ok);
    R.w5 = { ok, hit: f, hits: h, hp: [hb, hp5, delta], dispense: rows(tt, /arrow dispense/).length };
    await killAll('minecraft:villager');
    await sleep(1000);
  }

  /* ================================================================ W8 */
  if (run('w8')) {
    say('=========== W8 A-1\'⑤b 慢速无伤（skip 行 final=0.000）===========');
    await rcon.cmd(`effect ${NAME} clear`);
    await ready(160, ['etim:arrow_copper 4']);
    await summon('summon minecraft:cow 104.5 4 160.5 {CustomName:"W8Cow",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b,Silent:1b}');
    await sleep(1500);
    let off = logOffset();
    await look(104.5, 5.3, 160.5);
    await shoot(350);
    let h = [];
    for (let i = 0; i < 25; i++) { await sleep(300); h = hitWith(logSince(off), (x) => x.target === 'W8Cow'); if (h.length) break; }
    const alive1 = await countArrows();
    off = logOffset();
    await summon('summon etim:metal_arrow 103.3 5.0 160.5 {CustomName:"W8Arrow",Motion:[0.5,0.0,0.0],arrow_item_id:"etim:arrow_copper"}');
    let h2 = [];
    for (let i = 0; i < 25; i++) { await sleep(200); h2 = hitWith(logSince(off), (x) => x.target === 'W8Cow'); if (h2.length) break; }
    const alive2 = await countArrows();
    const all = [...h, ...h2];
    all.forEach((x) => say('W8 hit ' + cut(x.line, 190)));
    const s = all.filter((x) => x.skip === 'slow');
    const hp8 = await hpOf('W8Cow');
    const ok = s.length >= 1 && s.every((x) => x.final === 0) && alive2 > 0;
    say('W8 判值: slow行=' + s.length + ' final全0=' + s.every((x) => x.final === 0)
      + ' 箭存活=' + alive2 + ' 目标血量=' + ng(hp8) + ' -> ' + ok);
    R.w8 = { ok, slow: s, hits: all, alive: [alive1, alive2], hp: hp8 };
    await killAll('minecraft:cow');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
  }

  /* ================================================================ W11 */
  if (run('w11')) {
    say('=========== W11 A-1\'⑤c 不足 1 心（skip 行 final=0.000）===========');
    await rcon.cmd(`effect ${NAME} clear`);
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 190.5`);
    await killAll('minecraft:skeleton');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await sleep(800);
    await summon('summon minecraft:skeleton 104.5 4 190.5 {CustomName:"W11Skel",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await sleep(1200);
    const off = logOffset();
    await summon('summon etim:metal_arrow 103.6 5.2 190.5 {CustomName:"W11Arrow",Motion:[1.05,0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}');
    const h = await waitHit(off, (x) => x.target === 'W11Skel', 6000);
    h.forEach((x) => say('W11 hit ' + cut(x.line, 190)));
    const alive = await countArrows();
    const hp11 = await hpOf('W11Skel');
    const f = h.find((x) => x.skip === 'half-heart');
    const ok = !!f && f.final === 0 && alive > 0;
    say('W11 判值: half-heart=' + (!!f) + ' final=' + (f ? ng(f.final) : '-') + ' raw=' + (f ? ng(f.raw) : '-')
      + ' 箭存活=' + alive + ' 目标血量=' + ng(hp11) + ' -> ' + ok);
    R.w11 = { ok, hit: f, hits: h, alive, hp: hp11 };
    await killAll('minecraft:skeleton');
    await rcon.cmd('kill @e[name=W11Arrow]');
  }

  /* ================================================================ W9 */
  if (run('w9')) {
    say('=========== W9\' 口径矩阵（canAttackPlayer 门 vs 创造本体）===========');
    const bot2 = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME2 });
    await sleep(3500);
    await rcon.cmd('gamemode 0 ' + NAME2);
    await rcon.cmd('effect ' + NAME2 + ' resistance 9999 4');
    await rcon.cmd(`effect ${NAME} clear`);
    await ready(170, ['etim:arrow_ancient_metal 16']);
    await rcon.cmd(`tp ${NAME2} 104.5 ${GY} 170.5`);
    await rcon.cmd('scoreboard teams empty etimTest');
    await sleep(1200);

    const arm = async (label, { creative, team }) => {
      await rcon.cmd('gamemode ' + (creative ? 1 : 0) + ' ' + NAME2);
      await rcon.cmd('scoreboard teams empty etimTest');
      if (team) {
        await rcon.cmd('scoreboard teams add etimTest');
        await rcon.cmd('scoreboard teams option etimTest friendlyfire false');
        await rcon.cmd('scoreboard teams join etimTest ' + NAME);
        await rcon.cmd('scoreboard teams join etimTest ' + NAME2);
      } else {
        await rcon.cmd('scoreboard teams leave ' + NAME);
        await rcon.cmd('scoreboard teams leave ' + NAME2);
      }
      await rcon.cmd(`tp ${NAME} 100.5 ${GY} 170.5`);
      await rcon.cmd(`tp ${NAME2} 104.5 ${GY} 170.5`);
      await sleep(1000);
      const off = logOffset();
      await look(104.5, 5.4, 170.5);
      await shoot(1600);
      let h = [];
      for (let i = 0; i < 30; i++) { await sleep(250); h = hitWith(logSince(off), (x) => x.target === NAME2); if (h.length) break; }
      await sleep(900);
      const alive = await countArrows();
      h.forEach((x) => say('W9[' + label + '] ' + cut(x.line, 190)));
      say('W9[' + label + '] skip=' + (h[0] ? (h[0].skip || 'none') : 'NO-HIT') + ' final=' + (h[0] ? ng(h[0].final) : '-') + ' 箭存活=' + alive);
      return { label, creative, team, hit: h[0] || null, alive };
    };

    const a1 = await arm('创造本体/无队', { creative: true, team: false });
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    const a2 = await arm('创造/同队门', { creative: true, team: true });
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    const a3 = await arm('生存/同队门', { creative: false, team: true });
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    // 生存无队对照需要 bot2 活着且不是创造
    const a4 = await arm('生存/无队对照', { creative: false, team: false });
    await rcon.cmd('scoreboard teams empty etimTest');
    await rcon.cmd('scoreboard teams leave ' + NAME);
    await rcon.cmd('scoreboard teams leave ' + NAME2);
    const okSem = a1.hit && a1.hit.skip === 'rejected'
      && a2.hit && a2.hit.skip === 'creative' && a2.alive > 0
      && a3.hit && a3.hit.skip === 'creative' && a3.alive > 0
      && a4.hit && a4.hit.skip === null && a4.hit.final > 0;
    say('W9\' 判值: A(创造本体)=' + (a1.hit && a1.hit.skip) + ' B(创造+队)=' + (a2.hit && a2.hit.skip) + '/alive=' + a2.alive
      + ' C(生存+队)=' + (a3.hit && a3.hit.skip) + '/alive=' + a3.alive
      + ' D(生存无队)=' + (a4.hit && (a4.hit.skip || 'applied')) + ' 矩阵口径 -> ' + okSem);
    R.w9 = { ok: okSem, arms: [a1, a2, a3, a4] };
    try { bot2.quit(); } catch (e) {}
    await sleep(1500);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
  }

  /* ================================================================ W16 */
  if (run('w16')) {
    say('=========== W16\' 击退服务端面（存档 Motion / mob 位移）===========');
    const bot2 = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME2 });
    await sleep(3500);
    await rcon.cmd('gamemode 0 ' + NAME2);
    await rcon.cmd('effect ' + NAME2 + ' clear');
    await rcon.cmd('effect ' + NAME2 + ' resistance 9999 4');
    await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
    await rcon.cmd('time set 1000');
    await rcon.cmd(`tp ${NAME2} 104.5 ${GY} 230.5`);
    await sleep(2500);
    await rcon.cmd('kill @e[type=!player]');
    await sleep(600);

    /** 一次击退试验：弓（可选 Punch）→ 命中 bot → 连拍 playerdata Motion */
    const trial = async (label, enchTag) => {
      await rcon.cmd('gamemode 0 ' + NAME2);
      await rcon.cmd(`tp ${NAME2} 104.5 ${GY} 230.5`);
      await rcon.cmd('effect ' + NAME2 + ' resistance 9999 4');
      await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
      await rcon.cmd(`tp ${NAME} 100.5 ${GY} 230.5`);
      await sleep(400);
      await rcon.cmd('kill @e[type=!player]');
      await rcon.cmd(`clear ${NAME}`);
      await rcon.cmd('give ' + NAME + ' minecraft:bow 1' + (enchTag ? ' 0 ' + enchTag : ''));
      await rcon.cmd('give ' + NAME + ' etim:arrow_ancient_metal 8');
      await sleep(2600);
      const off = logOffset();
      await look(104.5, 5.4, 230.5);
      await shoot(1600);
      const t0 = Date.now();
      let h = [];
      while (Date.now() - t0 < 9000) {
        h = hitWith(logSince(off), (x) => x.target === NAME2);
        if (h.length) break;
        await sleep(30);
      }
      const samples = [];
      if (h.length) {
        samples.push(Object.assign({ at: Date.now() - t0 }, await sampleMotion(NAME2)));
        await sleep(180);
        samples.push(Object.assign({ at: Date.now() - t0 }, await sampleMotion(NAME2)));
        await sleep(320);
        samples.push(Object.assign({ at: Date.now() - t0 }, await sampleMotion(NAME2)));
      }
      h.forEach((x) => say('W16[' + label + '] hit ' + cut(x.line, 190)));
      samples.forEach((s, i) => say('W16[' + label + '] s' + i + ' at=' + s.at + 'ms dt=' + s.dt
        + 'tick Motion=[' + (s.motion ? s.motion.map((v) => Number(v).toFixed(4)).join(',') : '-') + '] |h|=' + ng(s.horiz)));
      const peak = samples.reduce((m, s) => (s.horiz !== null && s.horiz > m ? s.horiz : m), 0);
      const first = samples.find((s) => s.horiz !== null) || null;
      let a0lo = null, a0hi = null;
      if (first && first.dt !== null) {
        const n = first.dt + 1; // 命中检测延迟 ≤1 tick
        a0lo = first.horiz / Math.pow(0.98, n);
        a0hi = first.horiz / Math.pow(0.91, n + 1);
      }
      say('W16[' + label + '] 峰值|h|=' + ng(peak) + ' 首样反推 A0∈[' + ng(a0lo) + ',' + ng(a0hi) + '] (n=' + (first ? first.dt + 1 : '-') + ' tick)');
      return { label, enchTag: enchTag || null, hit: h[0] || null, samples, peak, a0lo, a0hi };
    };

    const punch = await trial('PunchI', '{ench:[{id:49,lvl:1}]}');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    const plain = await trial('无附魔对照', null);

    /* ③ mob 位移/Motion 面交叉核（服务端物理，无客户端参与） */
    const snapMob = (name) => {
      try {
        const raw = execFileSync(process.execPath, [NBT, 'ents', WORLD, 'overworld', '104', '240', '3'], { encoding: 'utf8' }).trim();
        const arr = JSON.parse(raw.split('\n').pop());
        return arr.find((e) => String(e.CustomName) === name && typeof e.Health === 'number' && e.Health > 0) || null;
      } catch (e) { return null; }
    };
    const sampleMobMotion = async (name) => {
      const g0 = await gametime();
      await rcon.cmd('save-all', 30000);
      const e = snapMob(name);
      const g1 = await gametime();
      const m = e && Array.isArray(e.Motion) ? e.Motion : null;
      return { g0, g1, dt: (g0 !== null && g1 !== null) ? g1 - g0 : null, motion: m,
        horiz: m ? Math.hypot(m[0], m[2]) : null, pos: e ? e.Pos : null, health: e ? e.Health : null };
    };
    const mobArm = async (label, name, z, enchTag) => {
      await rcon.cmd(`kill @e[name=${name}]`);
      await rcon.cmd(`tp ${NAME} 100.5 ${GY} ${z}.5`);
      await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
      await sleep(900);
      await rcon.cmd('kill @e[type=!player]');
      await sleep(600);
      await summon('summon minecraft:villager 104.5 4 ' + z + '.5 {CustomName:"' + name + '",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
      await rcon.cmd(`clear ${NAME}`);
      await rcon.cmd('give ' + NAME + ' minecraft:bow 1' + (enchTag ? ' 0 ' + enchTag : ''));
      await rcon.cmd('give ' + NAME + ' etim:arrow_ancient_metal 8');
      await sleep(2600);
      await rcon.cmd('save-all', 30000);
      await sleep(900);
      const e0 = snapMob(name);
      const off = logOffset();
      await look(104.5, 5.4, z + 0.5);
      await shoot(1600);
      const t0 = Date.now();
      let h = [];
      while (Date.now() - t0 < 9000) {
        h = hitWith(logSince(off), (x) => x.target === name);
        if (h.length) break;
        await sleep(30);
      }
      const samples = [];
      if (h.length) {
        samples.push(Object.assign({ at: Date.now() - t0 }, await sampleMobMotion(name)));
        await sleep(250);
        samples.push(Object.assign({ at: Date.now() - t0 }, await sampleMobMotion(name)));
        await sleep(400);
        samples.push(Object.assign({ at: Date.now() - t0 }, await sampleMobMotion(name)));
      }
      await sleep(2400);
      await rcon.cmd('save-all', 30000);
      await sleep(800);
      const e1 = snapMob(name);
      const disp = (e0 && e1) ? Math.hypot(e1.Pos[0] - e0.Pos[0], e1.Pos[2] - e0.Pos[2]) : null;
      h.forEach((x) => say('W16[' + label + '] hit ' + cut(x.line, 190)));
      samples.forEach((s, i) => say('W16[' + label + '] s' + i + ' at=' + s.at + 'ms dt=' + s.dt
        + 'tick Motion=[' + (s.motion ? s.motion.map((v) => Number(v).toFixed(4)).join(',') : '-') + '] |h|=' + ng(s.horiz)));
      say('W16[' + label + '] 位移=' + ng(disp) + ' (from ' + (e0 ? e0.Pos.map((v) => v.toFixed(2)).join(',') : '-')
        + ' to ' + (e1 ? e1.Pos.map((v) => v.toFixed(2)).join(',') : '-') + ')');
      return { label, hit: h[0] || null, samples, disp, e0: e0 && e0.Pos, e1: e1 && e1.Pos };
    };

    const mobTag = String(Date.now() % 100000);
    const mobPunch = await mobArm('mob/PunchI', 'W16P' + mobTag, 240, '{ench:[{id:49,lvl:1}]}');
    const mobPlain = await mobArm('mob/无附魔', 'W16N' + mobTag, 244, null);
    const mobPeak = mobPunch.samples.reduce((m, s) => (s.horiz !== null && s.horiz > m ? s.horiz : m), 0);
    const mobPlainPeak = mobPlain.samples.reduce((m, s) => (s.horiz !== null && s.horiz > m ? s.horiz : m), 0);
    const disp = mobPunch.disp;
    const v0est = (disp !== null) ? disp / 10.1 : null; // Σ 0.91^k ≈ 10.1（落地后地面摩擦）
    const playerPeak = punch.samples.reduce((m, s) => (s.horiz !== null && s.horiz > m ? s.horiz : m), 0);
    say('W16[mob] Punch 峰值|h|=' + ng(mobPeak) + ' 位移=' + ng(disp) + ' → v0估值≈' + ng(v0est)
      + ' | 无附魔 峰值|h|=' + ng(mobPlainPeak) + ' 位移=' + ng(mobPlain.disp)
      + ' | bot 存档 Motion 峰值=' + ng(playerPeak) + '（playerdata 通道面）');

    const okFinal = !!(punch.hit && punch.hit.final > 0);
    const okMob = mobPeak >= 0.40 && mobPeak <= 0.75 && mobPlainPeak <= 0.08
      && disp !== null && disp >= 4.0 && disp <= 7.5 && v0est !== null && v0est >= 0.45 && v0est <= 0.75;
    const playerChannel = playerPeak <= 0.01; // playerdata Motion 通道面：恒重力值 = 不可判（B）
    const ok = okFinal && okMob;
    say('W16\' 判值: bot命中 final=' + (punch.hit ? ng(punch.hit.final) : '-')
      + ' | mob Punch 峰值|h|=' + ng(mobPeak) + ' 位移=' + ng(disp) + ' v0≈' + ng(v0est)
      + ' 无附魔峰值|h|=' + ng(mobPlainPeak) + ' 位移=' + ng(mobPlain.disp)
      + ' | bot Motion 通道恒重力=' + playerChannel + ' | 量级判=' + okMob + ' final数值=' + okFinal + ' -> ' + ok);
    R.w16 = { ok, punch, plain, mob: { mobPunch, mobPlain, disp, v0est }, okMob, okFinal, playerChannel, playerPeak };
    try { bot2.quit(); } catch (e) {}
    await rcon.cmd('kill @e[type=minecraft:villager]');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
  }

  /* -------------------------------------------------------------- ENCH 探针 */
  if (run('ench')) {
    say('=========== ENCH 探针（give tag vs /enchant）===========');
    await rcon.cmd(`clear ${NAME}`);
    await sleep(500);
    say('give int   -> ' + cut(String(await rcon.cmd('give ' + NAME + ' minecraft:bow 1 0 {ench:[{id:49,lvl:1}]}', 8000)), 120));
    await sleep(700);
    say('give short -> ' + cut(String(await rcon.cmd('give ' + NAME + ' minecraft:bow 1 0 {ench:[{id:49s,lvl:1s}]}', 8000)), 120));
    await sleep(700);
    await rcon.cmd('save-all', 20000); await sleep(1400);
    say('inv give   -> ' + cut(execFileSync(process.execPath, [NBT, 'inv', WORLD, NAME], { encoding: 'utf8' }).trim().split('\n').pop(), 600));
    await rcon.cmd(`clear ${NAME}`);
    await sleep(400);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await sleep(700);
    say('enchant    -> ' + cut(String(await rcon.cmd('enchant ' + NAME + ' punch 1', 8000)), 160));
    await sleep(700);
    await rcon.cmd('save-all', 20000); await sleep(1400);
    say('inv enchant-> ' + cut(execFileSync(process.execPath, [NBT, 'inv', WORLD, NAME], { encoding: 'utf8' }).trim().split('\n').pop(), 600));
    await rcon.cmd(`clear ${NAME}`);
  }

  /* -------------------------------------------------------------- 全窗统计 */
  const all = logAll();
  const c = (re) => count(all, re);
  say('全窗 [ArrowLog]: spawn=' + c(/ArrowLog\] arrow spawn/) + ' hit=' + c(/arrow hit /)
    + ' skip{slow,dedupe,half-heart,creative,immune,rejected}='
    + ['slow', 'dedupe', 'half-heart', 'creative', 'immune', 'rejected'].map((s) => s + ':' + c(new RegExp('skip=' + s))).join(','));
  say('崩面: soe=' + c(/StackOverflowError/) + ' crashSaved=' + c(/This crash report has been saved/)
    + ' watchdog=' + c(/watchdog|Timed out/i) + ' internalErr=' + c(/Internal server error/));
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { prev = {}; }
  fs.writeFileSync(OUT, JSON.stringify(Object.assign(prev, R), null, 2), 'utf8');
  say('report -> ' + OUT);
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
