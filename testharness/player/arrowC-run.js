#!/usr/bin/env node
/**
 * arrowC-run.js — 批 C 验证窗 driver（会话七，2026-10-25 第三窗）
 *
 * 相位（W1~W16 + 补判 A-6/D-29①）：
 *   w1  满拉暴击：crit=1 final∈[1.5r,2r) mult=1.000 floor=0.000
 *   w2  半拉：crit=0 final≈raw
 *   w3  Longdead 下限：spawn enchanted=false + hit floor=9.000 final=9.000 crit=0
 *   w4  Guardian 下限：floor=10.000 final=10.000
 *   w5  发射器下限：floor=7.000 final=7.000（只抬不压）
 *   w6  silver vs revenant：mult=1.250
 *   w7  玩家箭 vs longdead：mult=0.250 且 floor=0.000
 *   w8  慢速无伤：skip=slow final=0.000 箭未死
 *   w9  创造穿透：skip=creative 整箭穿透（canAttackPlayer 门 = 队伍/PVP 面）
 *   w10 去重：同一实体二连中 → 第二次 skip=dedupe
 *   w11 不足 1 心：skip=half-heart 箭未死
 *   w12 寿命：ground lifetime=1000 / 24000 + 50s 后 dead tick=1000
 *   w13 水阻：step=water drag=0.800 单行
 *   w14 脱地骰：step=unground seed= before=/after= → Java LCG 复算
 *   w15 燃烧：step=quench / step=ignite + 目标着火
 *   w16 击退（punch 弓）：bot 水平速度方向=箭向、0.6 系数
 *   bone 补判 A-6/D-29①：bonelord → arrow_rusted_iron + floor=5.000
 *   all  顺序全跑（单 boot 定谳档）
 *
 * 判据通道：日志行 + RCON 回包 + 存档离线 NBT；无 /data。
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
const STATE = path.join(ROOT, 'build-logs', 'arrowC-state.json');
const NBT = path.join(__dirname, 'arrowB-nbt.js');
const NAME = 'ETIM_Harn01';
const NAME2 = 'ETIM_Harn02';
const WORLD = 'arrowc1';
const GY = 4; // 超平坦地面：y=3 草方块顶 → 站在 y=4

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };
const logAll = () => { try { return fs.readFileSync(LOG, 'utf8'); } catch (e) { return ''; } };
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

/* 判行解析 */
const parseHit = (line) => {
  const m = /arrow hit target=(.+?) raw=([-\d.]+) mult=([-\d.]+) floor=([-\d.]+) crit=([01]) final=([-\d.]+)(?: skip=([\w-]+))?/.exec(line);
  if (!m) return null;
  return { target: m[1], raw: +m[2], mult: +m[3], floor: +m[4], crit: +m[5], final: +m[6], skip: m[7] || null, line: line.trim() };
};
const hits = (t) => rows(t, /arrow hit /).map(parseHit).filter(Boolean);
const hitWith = (t, pred) => hits(t).filter(pred);

/* Java LCG 复算（java.util.Random 第 3 代） */
const MASK = (1n << 48n) - 1n;
const MULT = 0x5DEECE66Dn;
function javaRandomFloats(seed, n) {
  let s = (BigInt(seed) ^ MULT) & MASK;
  const out = [];
  for (let i = 0; i < n; i++) {
    s = (s * MULT + 0xBn) & MASK;
    const bits = Number(s >> 24n);
    out.push({ f32: Math.fround(bits / 16777216), f: bits / 16777216 });
  }
  return out;
}

(async () => {
  const phase = (process.argv[2] || 'all').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(3000);
  const st = loadState();
  const lx = (z) => 100.5; // 主射击位 x
  const run = (p) => phase === 'all' || phase === p;

  const pos = async () => {
    const r = await rcon.cmd('tp ' + NAME + ' ~ ~ ~', 8000);
    const m = String(r).match(/to ([-\d.]+), ([-\d.]+), ([-\d.]+)/);
    return m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
  };
  const countArrows = async () => {
    await rcon.cmd('scoreboard objectives add arrowCnt dummy', 8000);
    await rcon.cmd('scoreboard players set #arrows arrowCnt 0', 8000);
    await rcon.cmd('execute @e[type=etim:metal_arrow] ~ ~ ~ scoreboard players add #arrows arrowCnt 1', 8000);
    const r = await rcon.cmd('scoreboard players list #arrows', 8000);
    const m = String(r).match(/arrowCnt:\s*(-?\d+)/);
    return m ? Number(m[1]) : null;
  };
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
      + ' yaw=' + (e ? e.yaw.toFixed(1) : '-') + ' pitch=' + (e ? e.pitch.toFixed(1) : '-')
      + ' inUse=' + (bot.entity && bot.entity.heldItem ? 'yes' : 'no'));
    await sleep(1400);
    return true;
  };
  const ready = async (z, items) => {
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`tp ${NAME} ${lx(z)} ${GY} ${z + 0.5}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    for (const it of (items || [])) await rcon.cmd(`give ${NAME} ${it}`);
    await sleep(1400);
  };
  const waitHit = async (off, pred, timeoutMs) => {
    const t0 = Date.now();
    for (;;) {
      const h = hitWith(logSince(off), pred);
      if (h.length) return h;
      if (Date.now() - t0 > (timeoutMs || 8000)) return [];
      await sleep(200);
    }
  };
  const summon = async (cmd) => cut(String(await rcon.cmd(cmd, 8000)), 120);
  const killAll = async (type) => { await rcon.cmd(`kill @e[type=${type}]`, 8000); };

  /* 独立健康通道（判行 final= 之外的实体血量面；1.12 无 /data → 存档读） */
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
  /** 目标血量：名字 → 存档实体；"@player" 前缀 → playerdata */
  const hpOf = async (who) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      await rcon.cmd('save-all', 20000);
      await sleep(1600 + attempt * 700);
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
  const ng = (v) => (typeof v === 'number' ? v.toFixed(3) : String(v));

  const p0 = await pos();
  say('PHASE ' + phase + ' start pos=' + JSON.stringify(p0));
  await rcon.cmd('gamemode 0 ' + NAME);
  for (const b of [NAME, NAME2]) {
    await rcon.cmd('effect ' + b + ' clear');
    await rcon.cmd('effect ' + b + ' resistance 9999 4');
    await rcon.cmd('effect ' + b + ' regeneration 9999 4');
    await rcon.cmd('effect ' + b + ' saturation 9999 4');
  }
  await rcon.cmd('gamerule doMobSpawning false');
  await rcon.cmd('gamerule doDaylightCycle false');
  await rcon.cmd('gamerule doFireTick false');
  await rcon.cmd('gamerule mobGriefing false');
  await rcon.cmd('gamerule keepInventory true');
  await rcon.cmd('gamerule randomTickSpeed 0');
  await rcon.cmd('difficulty 1');
  await rcon.cmd('weather clear 1000000');
  await rcon.cmd('time set 18000');
  await rcon.cmd('tp ' + NAME + ' 110 8 170'); // 先到场区再清场（远场 chunk 未载时 kill 无效）
  await sleep(1400);
  await rcon.cmd('kill @e[type=!player]'); // 清平 villages/动物/残留工装实体
  await rcon.cmd('kill @e[type=etim:metal_arrow]');
  await sleep(600);

  /* ---------------------------------------------------------------- W1 */
  if (run('w1') || run('w2')) {
    say('=========== W1 满拉暴击 / W2 半拉 ===========');
    await ready(100, ['etim:arrow_ancient_metal 8']);
    say('   summon -> ' + await summon('summon minecraft:villager 104.5 4 100.5 {CustomName:"W1Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}'));
    await sleep(1500);
    const h0 = await hpOf('W1Vil');
    const off = logOffset();
    await look(104.5, 5.0, 100.5);
    await shoot(1600); // 满拉（≥20 tick，f==1.0 → setIsCritical(true)）
    const h1 = await waitHit(off, (x) => x.target === 'W1Vil', 9000);
    h1.forEach((x) => say('W1 hit ' + cut(x.line, 200)));
    const hp1 = await hpOf('W1Vil');
    const delta1 = (h0 !== null && hp1 !== null) ? h0 - hp1 : null;
    const c1 = h1.find((x) => x.crit === 1);
    if (c1) {
      const ratio = c1.final / c1.raw;
      say('W1 判值: crit=1 mult=' + c1.mult.toFixed(3) + ' floor=' + c1.floor.toFixed(3)
        + ' raw=' + c1.raw.toFixed(3) + ' final=' + c1.final.toFixed(3)
        + ' ratio=' + ratio.toFixed(4) + ' in[1.5,2.0) -> ' + (ratio >= 1.5 && ratio < 2.0));
      if (delta1 !== null) {
        say('W1 血量面: hp ' + ng(h0) + ' -> ' + ng(hp1) + ' Δ=' + ng(delta1) + ' Δ/raw=' + (delta1 / c1.raw).toFixed(4)
          + ' in[1.5,2.0) -> ' + (delta1 / c1.raw >= 1.49 && delta1 / c1.raw < 2.01));
      }
      st.w1 = { hit: c1, ratio, hp: [h0, hp1, delta1] };
    } else {
      say('W1 ! 未取到 crit=1 行');
      st.w1 = { hits: h1, hp: [h0, hp1, delta1] };
    }
    saveState(st);
    if (run('w2') || phase === 'all') {
      await rcon.cmd('kill @e[name=W1Vil]');
      await sleep(400);
      say('   summon W2 -> ' + await summon('summon minecraft:villager 104.5 4 100.5 {CustomName:"W2Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}'));
      await sleep(1200);
      const hb = await hpOf('W2Vil');
      const off2 = logOffset();
      await look(104.5, 5.0, 100.5);
      await shoot(500); // 半拉（charge≈10 → v≈1.25，f<1 → crit 0）
      const h2 = await waitHit(off2, (x) => x.target === 'W2Vil', 9000);
      h2.forEach((x) => say('W2 hit ' + cut(x.line, 200)));
      const hp2 = await hpOf('W2Vil');
      const delta2 = (hb !== null && hp2 !== null) ? hb - hp2 : null;
      const c2 = h2.find((x) => x.crit === 0);
      if (c2) {
        say('W2 判值: crit=0 raw=' + c2.raw.toFixed(3) + ' final=' + c2.final.toFixed(3)
          + ' |final-raw|=' + Math.abs(c2.final - c2.raw).toFixed(3) + ' -> ' + (Math.abs(c2.final - c2.raw) < 0.005));
        if (delta2 !== null) {
          say('W2 血量面: hp ' + ng(hb) + ' -> ' + ng(hp2) + ' Δ=' + ng(delta2) + ' Δ/raw=' + (delta2 / c2.raw).toFixed(4)
            + ' ≈1 -> ' + (Math.abs(delta2 / c2.raw - 1) < 0.05));
        }
        st.w2 = { hit: c2, hp: [hb, hp2, delta2] };
      } else {
        say('W2 ! 未取到 crit=0 行');
        st.w2 = { hits: h2, hp: [hb, hp2, delta2] };
      }
      saveState(st);
    }
  }

  /* ---------------------------------------------------------------- W3 */
  if (run('w3')) {
    say('=========== W3 Longdead 下限（骷髅恒取下限）===========');
    await ready(110, []);
    await rcon.cmd(`clear ${NAME}`);
    await sleep(500);
    // 工位坑：玩家站低一格，14 格外 longdead
    await rcon.cmd(`fill 100 3 110 100 3 110 minecraft:stone`);
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 110.5`);
    await sleep(800);
    const off = logOffset();
    await summon('summon etim:longdead 112.5 4 110.5 {CustomName:"W3Longdead",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}');
    let hitRows = [];
    for (let i = 0; i < 90; i++) {
      await sleep(500);
      hitRows = hitWith(logSince(off), (x) => x.target === NAME);
      if (hitRows.length >= 2) break;
    }
    const tt = logSince(off);
    rows(tt, /ArrowLog\] arrow (spawn|skeleton)/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    hitRows.forEach((x) => say('W3 hit ' + cut(x.line, 200)));
    // 让余箭落空插地（W12① 寿命用）：侧移后等一轮
    await rcon.cmd(`tp ${NAME} 106.5 ${GY} 116.5`);
    await sleep(9000);
    const tt2 = logSince(off);
    const skelSpawn = rows(tt, /arrow spawn shooter=W3Longdead/).length;
    const enchFalse = rows(tt, /arrow spawn shooter=W3Longdead .*enchanted=false/).length;
    const floorHit = hitRows.find((x) => x.floor === 9);
    say('W3 判值: spawn=' + skelSpawn + ' enchanted=false=' + enchFalse + ' hitRows=' + hitRows.length
      + ' floor9=' + (floorHit ? (floorHit.floor.toFixed(3) + ' final=' + floorHit.final.toFixed(3) + ' crit=' + floorHit.crit) : 'NONE'));
    rows(tt2, /arrow state step=ground lifetime=1000/).forEach((l) => say('   ground(1000) ' + cut(l.trim(), 120)));
    await killAll('etim:longdead');
    st.w3 = { skelSpawn, enchFalse, floorHit, hits: hitRows };
    saveState(st);
    await sleep(1500);
  }

  /* ---------------------------------------------------------------- W4 */
  if (run('w4')) {
    say('=========== W4 Guardian 下限 ===========');
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 120.5`);
    await rcon.cmd(`scoreboard players set #hp dummy 0`);
    await sleep(800);
    const off = logOffset();
    await summon('summon etim:longdead_guardian 112.5 4 120.5 {CustomName:"W4Guardian",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}');
    let hitRows = [];
    for (let i = 0; i < 80; i++) {
      await sleep(500);
      hitRows = hitWith(logSince(off), (x) => x.target === NAME);
      if (hitRows.length >= 2) break;
    }
    const tt = logSince(off);
    rows(tt, /ArrowLog\] arrow skeleton/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    hitRows.forEach((x) => say('W4 hit ' + cut(x.line, 200)));
    const f = hitRows.find((x) => x.floor === 10);
    say('W4 判值: floor10=' + (f ? (f.floor.toFixed(3) + ' final=' + f.final.toFixed(3) + ' crit=' + f.crit) : 'NONE'));
    await killAll('etim:longdead_guardian');
    st.w4 = { hit: f, hits: hitRows };
    saveState(st);
    await sleep(1200);
  }

  /* ---------------------------------------------------------------- W5 */
  if (run('w5')) {
    say('=========== W5 发射器下限（只抬不压）===========');
    await rcon.cmd('setblock 108 4 130 minecraft:air');
    await rcon.cmd('setblock 108 5 130 minecraft:air');
    await summon('summon minecraft:villager 102.5 4 130.5 {CustomName:"W5Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await rcon.cmd('setblock 108 4 130 minecraft:dispenser 4'); // meta 4 = 朝 -X
    await rcon.cmd('blockdata 108 4 130 {Items:[{Slot:0b,id:"etim:arrow_ancient_metal",Count:64b}]}');
    await sleep(1200);
    const hb5 = await hpOf('W5Vil');
    const off = logOffset();
    await rcon.cmd('setblock 108 5 130 minecraft:redstone_block');
    let h = [];
    for (let i = 0; i < 40; i++) {
      await sleep(300);
      h = hitWith(logSince(off), (x) => x.target === 'W5Vil');
      if (h.length) break;
    }
    await rcon.cmd('setblock 108 5 130 minecraft:air');
    const tt = logSince(off);
    rows(tt, /arrow dispense|arrow spawn shooter=-/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    h.forEach((x) => say('W5 hit ' + cut(x.line, 200)));
    const f = h.find((x) => x.floor === 7);
    say('W5 判值: floor7=' + (f ? (f.floor.toFixed(3) + ' final=' + f.final.toFixed(3) + ' crit=' + f.crit + ' raw=' + f.raw.toFixed(3)) : 'NONE'));
    const hp5 = await hpOf('W5Vil');
    if (hb5 !== null && hp5 !== null) {
      say('W5 血量面: hp ' + ng(hb5) + ' -> ' + ng(hp5) + ' Δ=' + ng(hb5 - hp5) + '（期望 7.000 = floor）');
    }
    await killAll('minecraft:villager');
    st.w5 = { hit: f, hits: h, dispense: rows(tt, /arrow dispense/).length };
    saveState(st);
    await sleep(1200);
  }

  /* ---------------------------------------------------------------- W6 */
  if (run('w6')) {
    say('=========== W6 silver vs 亡灵（revenant）===========');
    await ready(140, ['etim:arrow_silver 4']);
    await summon('summon etim:revenant 105.5 4 140.5 {CustomName:"W6Revenant",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await sleep(1500);
    const off = logOffset();
    await look(105.5, 5.0, 140.5);
    await shoot(1600);
    const h = await waitHit(off, (x) => x.target === 'W6Revenant', 9000);
    h.forEach((x) => say('W6 hit ' + cut(x.line, 200)));
    const f = h.find((x) => Math.abs(x.mult - 1.25) < 1e-6);
    say('W6 判值: mult1.250=' + (f ? (f.mult.toFixed(3) + ' raw=' + f.raw.toFixed(3) + ' floor=' + f.floor.toFixed(3)) : 'NONE')
      + ' undead=' + cut(String(await rcon.cmd('testfor @e[type=etim:revenant]', 8000)), 80));
    st.w6 = { hit: f, hits: h };
    saveState(st);
    await killAll('etim:revenant');
  }

  /* ---------------------------------------------------------------- W7 */
  if (run('w7')) {
    say('=========== W7 玩家箭 vs Skeleton（mult 0.250 无 floor）===========');
    await ready(150, ['etim:arrow_ancient_metal 4']);
    await summon('summon etim:longdead 105.5 4 150.5 {CustomName:"W7Skel",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await sleep(1500);
    const off = logOffset();
    await look(105.5, 5.0, 150.5);
    await shoot(1600);
    const h = await waitHit(off, (x) => x.target === 'W7Skel', 9000);
    h.forEach((x) => say('W7 hit ' + cut(x.line, 200)));
    const f = h.find((x) => Math.abs(x.mult - 0.25) < 1e-6 && x.floor === 0);
    say('W7 判值: mult0.250&floor0=' + (f ? (f.mult.toFixed(3) + ' floor=' + f.floor.toFixed(3) + ' raw=' + f.raw.toFixed(3) + ' final=' + f.final.toFixed(3)) : 'NONE'));
    st.w7 = { hit: f, hits: h };
    saveState(st);
    await killAll('etim:longdead');
  }

  /* ---------------------------------------------------------------- W8 */
  if (run('w8')) {
    say('=========== W8 慢速无伤（speed<1.0）===========');
    await ready(160, ['etim:arrow_copper 4']);
    await summon('summon minecraft:cow 104.5 4 160.5 {CustomName:"W8Cow",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b,Silent:1b}');
    await sleep(1500);
    // ① 实射弱弓（charge≈7 → v≈0.8）
    let off = logOffset();
    await look(104.5, 5.3, 160.5);
    await shoot(350);
    let h = [];
    for (let i = 0; i < 25; i++) { await sleep(300); h = hitWith(logSince(off), (x) => x.target === 'W8Cow'); if (h.length) break; }
    const alive1 = await countArrows();
    say('W8 ① 实射弱弓: hits=' + h.length + ' arrowsAlive=' + alive1);
    h.forEach((x) => say('   ' + cut(x.line, 190)));
    // ② summon 慢箭探针（v=0.5，同一 onHit 门）
    off = logOffset();
    await summon('summon etim:metal_arrow 103.3 5.0 160.5 {CustomName:"W8Arrow",Motion:[0.5,0.0,0.0],arrow_item_id:"etim:arrow_copper"}');
    let h2 = [];
    for (let i = 0; i < 25; i++) { await sleep(200); h2 = hitWith(logSince(off), (x) => x.target === 'W8Cow'); if (h2.length) break; }
    h2.forEach((x) => say('W8 ② ' + cut(x.line, 190)));
    const alive2 = await countArrows();
    const f = [...h2, ...h].find((x) => x.skip === 'slow');
    const hp8 = await hpOf('W8Cow');
    say('W8 判值: slow=' + (f ? (f.skip + ' final=' + f.final.toFixed(3)) : 'NONE')
      + ' 箭未死 arrowsAlive=' + alive2 + ' -> ' + (alive2 > 0) + ' 目标血量=' + ng(hp8) + '（牛满血 10.000 = 无伤面）');
    st.w8 = { hit: f, hits: [...h, ...h2], alive: [alive1, alive2] };
    saveState(st);
    await killAll('minecraft:cow');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
  }

  /* ---------------------------------------------------------------- W9 */
  if (run('w9')) {
    say('=========== W9 创造穿透（canAttackPlayer 门）===========');
    const bot2 = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME2 });
    await sleep(3000);
    await rcon.cmd('gamemode 0 ' + NAME2);
    await rcon.cmd('effect ' + NAME2 + ' resistance 9999 4');
    await rcon.cmd(`tp ${NAME2} 104.5 ${GY} 170.5`);
    await ready(170, ['etim:arrow_ancient_metal 4']);
    await sleep(1200);
    // ① 创造目标（pvp=true）→ 期望 skip=immune（创造无敌，非 canAttackPlayer 门）
    await rcon.cmd('gamemode 1 ' + NAME2);
    await sleep(800);
    let off = logOffset();
    await look(104.5, 5.4, 170.5);
    await shoot(1600);
    let h = [];
    for (let i = 0; i < 25; i++) { await sleep(300); h = hitWith(logSince(off), (x) => x.target === NAME2); if (h.length) break; }
    h.forEach((x) => say('W9 ① 创造目标 ' + cut(x.line, 190)));
    await rcon.cmd('gamemode 0 ' + NAME2);
    // ② 同队 friendlyfire=false → canAttackPlayer=false → skip=creative
    await rcon.cmd('scoreboard teams add etimTest');
    await rcon.cmd('scoreboard teams option etimTest friendlyfire false');
    await rcon.cmd('scoreboard teams join etimTest ' + NAME);
    await rcon.cmd('scoreboard teams join etimTest ' + NAME2);
    await sleep(1000);
    off = logOffset();
    await look(104.5, 5.4, 170.5);
    await shoot(1600);
    let h2 = [];
    for (let i = 0; i < 25; i++) { await sleep(300); h2 = hitWith(logSince(off), (x) => x.target === NAME2); if (h2.length) break; }
    h2.forEach((x) => say('W9 ② 同队 ' + cut(x.line, 190)));
    const alive = await countArrows();
    const c = h2.find((x) => x.skip === 'creative');
    say('W9 判值: creative=' + (c ? (c.skip + ' final=' + c.final.toFixed(3)) : 'NONE') + ' 箭存活=' + alive
      + ' | ① 创造目标 skip=' + (h[0] ? h[0].skip : 'none'));
    // 清队（W16 需 pvp 面正常）
    await rcon.cmd('scoreboard teams leave ' + NAME);
    await rcon.cmd('scoreboard teams leave ' + NAME2);
    await rcon.cmd('scoreboard teams empty etimTest');
    st.w9 = { creativeTarget: h, team: h2, alive };
    saveState(st);
    try { bot2.quit(); } catch (e) {}
    await sleep(800);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
  }

  /* ---------------------------------------------------------------- W10 */
  if (run('w10')) {
    say('=========== W10 去重（同一实体二连中）===========');
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 180.5`);
    await killAll('minecraft:enderman');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await sleep(800);
    await summon('summon minecraft:enderman 104.5 4 180.5 {CustomName:"W10Ender",CustomNameVisible:0b,NoAI:1b,Silent:1b,PersistenceRequired:1b}');
    await sleep(1200);
    const off = logOffset();
    await summon('summon etim:metal_arrow 103.85 5.2 180.5 {CustomName:"W10Arrow",Motion:[1.1,0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}');
    // 每 tick 钉位：Enderman 回原位 + 箭回入射点（抵消传送与位置相位）
    for (let i = 0; i < 60; i++) {
      await rcon.cmd('tp @e[name=W10Ender] 104.5 4 180.5', 8000);
      await rcon.cmd('tp @e[name=W10Arrow] 103.85 5.2 180.5', 8000);
      await sleep(25);
      const hs = hitWith(logSince(off), (x) => x.target === 'W10Ender');
      if (hs.some((x) => x.skip === 'dedupe')) { await sleep(60); break; }
    }
    const tt = logSince(off);
    const hs = hits(tt).filter((x) => x.target === 'W10Ender');
    hs.slice(0, 6).forEach((x) => say('   ' + cut(x.line, 190)));
    const first = hs.find((x) => !x.skip);
    const dup = hs.find((x) => x.skip === 'dedupe');
    say('W10 判值: 首中=' + (first ? 'final=' + first.final.toFixed(3) : 'NONE')
      + ' 二连中 dedupe=' + (dup ? 'yes final=' + dup.final.toFixed(3) : 'NO') + ' 行数=' + hs.length);
    st.w10 = { hits: hs.slice(0, 8), first, dup };
    saveState(st);
    await killAll('minecraft:enderman');
    await rcon.cmd('kill @e[name=W10Arrow]');
  }

  /* ---------------------------------------------------------------- W11 */
  if (run('w11')) {
    say('=========== W11 不足 1 心（final<1.0）===========');
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 190.5`);
    await killAll('minecraft:skeleton');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await sleep(600);
    await summon('summon minecraft:skeleton 104.5 4 190.5 {CustomName:"W11Skel",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await sleep(1200);
    const off = logOffset();
    await summon('summon etim:metal_arrow 103.6 5.2 190.5 {CustomName:"W11Arrow",Motion:[1.05,0.0,0.0],arrow_item_id:"etim:arrow_ancient_metal"}');
    const h = await waitHit(off, (x) => x.target === 'W11Skel', 6000);
    h.forEach((x) => say('W11 hit ' + cut(x.line, 190)));
    const alive = await countArrows();
    const hp11 = await hpOf('W11Skel');
    const f = h.find((x) => x.skip === 'half-heart');
    say('W11 判值: half-heart=' + (f ? ('yes final=' + f.final.toFixed(3) + ' raw=' + f.raw.toFixed(3)) : 'NONE')
      + ' 箭未死=' + (alive > 0) + ' arrowsAlive=' + alive + ' 目标血量=' + ng(hp11) + '（本环境 skeleton 满血 6.000 = 无伤面）');
    st.w11 = { hit: f, hits: h, alive };
    saveState(st);
    await killAll('minecraft:skeleton');
    await rcon.cmd('kill @e[name=W11Arrow]');
  }

  /* ----------------------------------------------------------- W12/13/14 */
  if (run('w12') || run('w13') || run('w14') || phase === 'all') {
    say('=========== W12 寿命 / W13 水阻 / W14 脱地骰 ===========');
    // ---- W13 水池（x 112..117, y 4..5）
    await rcon.cmd('fill 110 3 196 120 3 206 minecraft:stone');
    await rcon.cmd('fill 111 4 197 119 6 205 minecraft:air');
    await rcon.cmd('fill 112 4 198 118 5 204 minecraft:stone');
    await rcon.cmd('fill 112 5 198 118 5 204 minecraft:air');
    await rcon.cmd('fill 112 4 198 118 5 204 minecraft:water'); // 2 层水
    await sleep(1500);
    await ready(200, ['etim:arrow_copper 4']);
    await rcon.cmd(`tp ${NAME} 107.5 5 201.5`);
    await sleep(1200);
    let off = logOffset();
    await look(114.5, 5.0, 201.5);
    await shoot(1600);
    await sleep(3500);
    let tw = logSince(off);
    const waterRows = rows(tw, /arrow state step=water drag=/);
    waterRows.forEach((l) => say('W13 ' + cut(l.trim(), 130)));
    say('W13 判值: water 行=' + waterRows.length + ' drag=0.800 命中=' + rows(tw, /drag=0\.800/).length
      + ' drag0.600=' + rows(tw, /drag=0\.600/).length);

    // ---- W14 脱地骰：石墙 + 玩家满拉射入 → 落地后拆块
    await rcon.cmd('fill 112 4 210 112 8 210 minecraft:stone');
    await ready(210, ['etim:arrow_mithril 4']);
    await rcon.cmd(`tp ${NAME} 108.5 4 210.5`);
    await sleep(1200);
    off = logOffset();
    await look(112.5, 5.6, 210.5);
    await shoot(1600);
    await sleep(2500);
    let t14 = logSince(off);
    const groundRows = rows(t14, /arrow state step=ground lifetime=/);
    groundRows.forEach((l) => say('W14 ground ' + cut(l.trim(), 120)));
    await rcon.cmd('setblock 112 5 210 minecraft:air');
    await sleep(200);
    await rcon.cmd('setblock 112 6 210 minecraft:air');
    await sleep(1500);
    t14 = logSince(off);
    const un = rows(t14, /arrow state step=unground/);
    un.forEach((l) => say('W14 unground ' + cut(l.trim(), 200)));
    if (un.length) {
      const m = /seed=(-?\d+) before=([-\d.]+),([-\d.]+),([-\d.]+) after=([-\d.]+),([-\d.]+),([-\d.]+)/.exec(un[0]);
      if (m) {
        const seed = Number(m[1]);
        const b = [+m[2], +m[3], +m[4]];
        const a = [+m[5], +m[6], +m[7]];
        const rf = javaRandomFloats(seed, 3);
        const pred = rf.map((r, i) => b[i] * Math.fround(Math.fround(r.f32) * 0.2));
        const ok = pred.every((p, i) => Math.abs(p - a[i]) < 0.01);
        say('W14 判值: seed=' + seed + ' r=['
          + rf.map((r) => r.f.toFixed(6)).join(',') + '] before=[' + b.map((v) => v.toFixed(3)).join(',')
          + '] after=[' + a.map((v) => v.toFixed(3)).join(',') + '] pred=[' + pred.map((v) => v.toFixed(3)).join(',')
          + '] LCG复算=' + ok);
        st.w14 = { seed, rf: rf.map((r) => r.f), before: b, after: a, pred, ok };
      }
    } else {
      say('W14 ! 未取到 unground 行');
      st.w14 = { unground: 0 };
    }
    st.w13 = { waterRows: waterRows.length, drag800: rows(tw, /drag=0\.800/).length };
    st.w12 = Object.assign(st.w12 || {}, {
      ground1000: rows(logAll(), /step=ground lifetime=1000/).length,
      ground24000: rows(logAll(), /step=ground lifetime=24000/).length
    });
    saveState(st);
  }

  /* ---------------------------------------------------------------- W15 */
  if (run('w15')) {
    say('=========== W15 燃烧状态机（quench / ignite）===========');
    // ① 燃烧箭入水 → quench
    await rcon.cmd('fill 110 3 218 122 3 222 minecraft:stone');
    await rcon.cmd('fill 110 4 218 122 7 222 minecraft:air');
    await rcon.cmd('setblock 112 4 220 minecraft:netherrack');
    await rcon.cmd('setblock 112 5 220 minecraft:fire');
    await rcon.cmd('fill 116 4 218 121 5 222 minecraft:stone');
    await rcon.cmd('fill 116 5 218 121 5 222 minecraft:air');
    await rcon.cmd('fill 116 4 218 121 5 222 minecraft:water');
    await ready(220, ['etim:arrow_mithril 4']);
    await rcon.cmd(`tp ${NAME} 108.5 5 220.5`);
    await sleep(1500);
    let off = logOffset();
    await look(119.5, 5.2, 220.5);
    await shoot(1600);
    await sleep(4000);
    let tt = logSince(off);
    const ign = rows(tt, /arrow state step=ignite/);
    const q = rows(tt, /arrow state step=quench/);
    const w = rows(tt, /arrow state step=water/);
    say('W15 ① ignite 行=' + ign.length + ' quench 行=' + q.length + ' water 行=' + w.length);
    ign.forEach((l) => say('   ' + cut(l.trim(), 120)));
    q.forEach((l) => say('   ' + cut(l.trim(), 120)));
    // ② 燃烧箭命中目标 → 目标着火（NBT Fire>0）
    await rcon.cmd('fill 104 3 226 122 3 234 minecraft:stone');
    await rcon.cmd('fill 104 4 226 122 7 234 minecraft:air');
    await rcon.cmd('setblock 110 4 230 minecraft:netherrack');
    await rcon.cmd('setblock 110 5 230 minecraft:fire');
    await summon('summon minecraft:villager 114.5 4 230.5 {CustomName:"W15Vil",CustomNameVisible:0b,NoAI:1b,PersistenceRequired:1b}');
    await ready(230, ['etim:arrow_mithril 8']);
    await rcon.cmd(`tp ${NAME} 106.5 4 230.5`);
    await sleep(1500);
    off = logOffset();
    let ign2 = [];
    let h = [];
    for (let attempt = 0; attempt < 3 && h.length === 0; attempt++) {
      await look(114.5, 5.1, 230.5);
      await shoot(1600);
      for (let i = 0; i < 20; i++) { await sleep(300); h = hitWith(logSince(off), (x) => x.target === 'W15Vil'); if (h.length) break; }
      ign2 = rows(logSince(off), /arrow state step=ignite/);
      say('W15 ② attempt#' + (attempt + 1) + ' hit=' + h.length + ' ignite=' + ign2.length);
    }
    tt = logSince(off);
    ign2 = rows(tt, /arrow state step=ignite/);
    h.forEach((x) => say('W15 ② hit ' + cut(x.line, 190)));
    say('W15 ② ignite 行=' + ign2.length + ' hits=' + h.length);
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    let fireNbt = 'n/a';
    try {
      const raw = execFileSync(process.execPath, [NBT, 'ents', WORLD, 'overworld', '118', '230', '1'], { encoding: 'utf8' }).trim();
      const list = JSON.parse(raw.split('\n').pop());
      const target = list.find((e) => /villager/.test(String(e.id)) && /W15Vil/.test(String(e.CustomName)));
      fireNbt = target ? ('Fire=' + target.Fire + ' Health=' + target.Health + ' Fire>0 -> ' + (Number(target.Fire) > 0))
        : ('target not found; ids=' + list.map((e) => e.id).join(','));
    } catch (e) { fireNbt = 'ERR ' + e.message; }
    say('W15 ② 存档目标 Fire 面=' + fireNbt);
    st.w15 = { ignite1: ign.length, quench: q.length, water: w.length, ignite2: ign2.length, hits: h };
    saveState(st);
    await killAll('minecraft:villager');
  }

  /* ---------------------------------------------------------------- bone */
  if (run('bone')) {
    say('=========== 补判 A-6/D-29① bonelord → rusted_iron + floor=5.000 ===========');
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 240.5`);
    await killAll('etim:bonelord');
    await sleep(800);
    const off = logOffset();
    await summon('summon etim:bonelord 112.5 4 240.5 {CustomName:"BoneLordC",CustomNameVisible:0b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}');
    let hitRows = [];
    for (let i = 0; i < 100; i++) {
      await sleep(500);
      hitRows = hitWith(logSince(off), (x) => x.target === NAME);
      if (hitRows.length >= 1) break;
    }
    const tt = logSince(off);
    rows(tt, /arrow skeleton/).forEach((l) => say('   ' + cut(l.trim(), 190)));
    hitRows.forEach((x) => say('BONE hit ' + cut(x.line, 200)));
    const f = hitRows.find((x) => x.floor === 5);
    say('BONE 判值: rusted spawn=' + rows(tt, /arrow skeleton .*item=arrow_rusted_iron/).length
      + ' floor5=' + (f ? (f.floor.toFixed(3) + ' final=' + f.final.toFixed(3)) : 'NONE'));
    st.bone = { hit: f, hits: hitRows, skel: rows(tt, /arrow skeleton/).length };
    saveState(st);
    await killAll('etim:bonelord');
  }

  /* ---------------------------------------------------------------- W16 */
  if (run('w16')) {
    say('=========== W16 击退（punch 弓）===========');
    const bot2 = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME2 });
    await sleep(3500);
    await rcon.cmd('gamemode 0 ' + NAME2);
    await rcon.cmd(`tp ${NAME2} 102.5 ${GY} 230.5`);
    await rcon.cmd('effect ' + NAME2 + ' clear');
    await rcon.cmd('effect ' + NAME2 + ' resistance 9999 4');
    // 只给 punch 弓（避免普通弓被 equip 先取到 → knockback=0）
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`tp ${NAME} 100.5 ${GY} 230.5`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1 0 {ench:[{id:49,lvl:1}]}`); // Punch I (punch=49; power=48)
    await rcon.cmd(`give ${NAME} etim:arrow_ancient_metal 8`);
    await sleep(2000);
    const samples = [];
    const iv = setInterval(() => {
      const e = bot2.entity;
      if (!e || !e.velocity || !e.position) return;
      samples.push({ t: Date.now(), v: { x: e.velocity.x, y: e.velocity.y, z: e.velocity.z },
        p: { x: e.position.x, y: e.position.y, z: e.position.z }, onGround: e.onGround });
    }, 15);
    const off = logOffset();
    let h = [];
    for (let attempt = 0; attempt < 3 && h.length === 0; attempt++) {
      const aimY = [5.2, 5.6, 4.9][attempt];
      await look(102.5, aimY, 230.5);
      await shoot(1600);
      for (let i = 0; i < 14; i++) { await sleep(250); h = hitWith(logSince(off), (x) => x.target === NAME2); if (h.length) break; }
      say('W16 attempt#' + (attempt + 1) + ' aimY=' + aimY + ' hit=' + h.length);
    }
    // 服务端面：击退瞬间玩家的 Motion（playerdata 存档）
    await sleep(50);
    await rcon.cmd('save-all', 20000);
    await sleep(700);
    const pb = snapPlayer(NAME2);
    say('W16 服务端面 playerdata Motion=' + JSON.stringify(pb.Motion) + ' Pos=' + JSON.stringify(pb.Pos)
      + ' HurtTime=' + pb.HurtTime);
    await sleep(1200);
    clearInterval(iv);
    h.forEach((x) => say('W16 hit ' + cut(x.line, 190)));
    // 取击退瞬间：水平速度最大且方向 +X 的样本
    let best = null;
    for (const s of samples) {
      const hsp = Math.hypot(s.v.x, s.v.z);
      if (!best || hsp > Math.hypot(best.v.x, best.v.z)) best = s;
    }
    if (best) {
      const hsp = Math.hypot(best.v.x, best.v.z);
      const ang = Math.atan2(best.v.z, best.v.x) * 180 / Math.PI;
      const top = [...samples].sort((a, b) => Math.hypot(b.v.x, b.v.z) - Math.hypot(a.v.x, a.v.z)).slice(0, 8);
      top.forEach((s) => say('   sample v=(' + ng(s.v.x) + ',' + ng(s.v.y) + ',' + ng(s.v.z) + ') h=' + Math.hypot(s.v.x, s.v.z).toFixed(3)
        + ' p=(' + ng(s.p.x) + ',' + ng(s.p.z) + ')'));
      // 位置面：击退后前 6 个采样的 X 位移增量（每 tick 约 1-3 采样）
      const xs = samples.map((s) => s.p.x);
      say('   位置面: x ' + ng(xs[0]) + ' -> 峰值 ' + ng(Math.max(...xs)) + ' 位移=' + ng(Math.max(...xs) - xs[0]));
      say('W16 判值: 峰值样本 v=(' + best.v.x.toFixed(3) + ',' + best.v.y.toFixed(3) + ',' + best.v.z.toFixed(3)
        + ') |h|=' + hsp.toFixed(3) + ' 方向角=' + ang.toFixed(1) + '°（箭向 +X = 0°）'
        + ' 方向判=' + (Math.abs(ang) < 25) + ' 系数≈0.6 容差[0.25,0.75] -> ' + (hsp > 0.25 && hsp < 0.75));
      st.w16 = { best, hit: h, samples: samples.length };
    } else {
      say('W16 ! 无速度样本');
      st.w16 = { best: null, hit: h, samples: samples.length };
    }
    saveState(st);
    try { bot2.quit(); } catch (e) {}
  }

  /* ------------------------------------------------------ 汇总 + W12① 尾判 */
  if (phase === 'all') {
    say('=========== 收尾：W12① 骷髅箭 50s 寿命 ===========');
    const all = logAll();
    const g1000 = rows(all, /step=ground lifetime=1000/);
    say('W12 ground(1000) 行=' + g1000.length + ' | ground(24000) 行=' + rows(all, /step=ground lifetime=24000/).length);
    g1000.slice(0, 4).forEach((l) => say('   ' + cut(l.trim(), 110)));
    // 等到首条 1000 落地行后 ≥55s 再判 dead
    for (let i = 0; i < 140; i++) {
      const dead = rows(logAll(), /step=dead tick=1000/);
      if (dead.length) break;
      await sleep(1000);
    }
    const dead = rows(logAll(), /step=dead tick=1000/);
    say('W12 判值: dead tick=1000 行=' + dead.length);
    dead.slice(0, 3).forEach((l) => say('   ' + cut(l.trim(), 120)));
    st.w12dead = { dead: dead.length, lines: dead.slice(0, 3) };
    saveState(st);
  }

  /* -------------------------------------------------------------- 全窗统计 */
  const all = logAll();
  const c = (re) => count(all, re);
  say('全窗 [ArrowLog]: register=' + c(/\[ArrowLog\] arrow register/)
    + ' spawn=' + c(/\[ArrowLog\] arrow spawn/)
    + ' hit=' + c(/arrow hit /)
    + ' skip{slow,dedupe,half-heart,creative,immune,rejected}=' + c(/skip=(slow|dedupe|half-heart|creative|immune|rejected)/)
    + ' state{ground,dead,unground,water,quench,ignite}=' + c(/arrow state step=/)
    + ' dispense=' + c(/arrow dispense/));
  say('崩面: soe=' + c(/StackOverflowError/) + ' crashSaved=' + c(/This crash report has been saved/)
    + ' watchdog=' + c(/watchdog|Timed out/i) + ' internalErr=' + c(/Internal server error/));
  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
