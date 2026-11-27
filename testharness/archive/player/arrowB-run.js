#!/usr/bin/env node
/**
 * arrowB-run.js — 批 B 箭身份验证窗 driver（会话七，2026-10-25）
 *
 * 1.12 判据通道（无 /data 命令）：
 *   · 计数   scoreboard 累计（@e 每个实体 +1，list 读回）
 *   · 坐标   tp <player> @e[...] 两参式 → 玩家落到实体处 → tp 回包读回坐标
 *   · 数值   存档离线 NBT（arrowB-nbt.js，Level.Entities）
 *   · 行为   clear 计数 / pickup 日志行 / 拾取后实体数变化
 *
 * 相位：w0 探针 / w1 注册+summon / w2 玩家弓拾回 / w3 NBT 持久 /
 *       w4 骷髅源 / w5 发射器源 / w6 拾取枚举 / w7 选择器回归
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
const STATE = path.join(ROOT, 'build-logs', 'arrowB-state.json');
const NBT = path.join(__dirname, 'arrowB-nbt.js');
const NAME = 'ETIM_Harn01';
const WORLD = 'arrowb1';

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

(async () => {
  const phase = (process.argv[2] || 'w0').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(3000);
  const chatReplies = [];
  bot.on('message', (m) => chatReplies.push(m.toString()));
  const chat = async (c) => { bot.chat('/' + c); await sleep(400); };
  const st = loadState();

  /** 服务端真实位置（tp 两参/相对坐标回包都归一到"目标实体"位置） */
  const pos = async () => {
    const r = await rcon.cmd('tp ' + NAME + ' ~ ~ ~', 8000);
    const m = String(r).match(/to (-?[\d.]+), (-?[\d.]+), (-?[\d.]+)/);
    return m ? { x: +m[1], y: +m[2], z: +m[3] } : null;
  };
  const testfor = async () => cut(String(await rcon.cmd('testfor @e[type=etim:metal_arrow]', 8000)), 130);
  const countRows = async () => {
    await rcon.cmd('scoreboard objectives add arrowCnt dummy', 8000);
    await rcon.cmd('scoreboard players set #arrows arrowCnt 0', 8000);
    await rcon.cmd('execute @e[type=etim:metal_arrow] ~ ~ ~ scoreboard players add #arrows arrowCnt 1', 8000);
    const r = await rcon.cmd('scoreboard players list #arrows', 8000);
    const m = String(r).match(/arrowCnt:\s*(-?\d+)/);
    return m ? Number(m[1]) : null;
  };
  /** 传送到箭的位置并读回坐标（两参 tp：坐标源 = 箭） */
  const tpToArrow = async () => {
    const r = await rcon.cmd('tp ' + NAME + ' @e[type=etim:metal_arrow,c=1]', 8000);
    await sleep(1200);
    const p = await pos();
    return { r: cut(String(r), 90), pos: p };
  };
  const pad = async (cx, cy, cz, r) => {
    const R = r || 8;
    await rcon.cmd(`fill ${cx - R} ${cy - 1} ${cz - R} ${cx + R} ${cy - 1} ${cz + R} minecraft:stone`);
    await rcon.cmd(`fill ${cx - R} ${cy} ${cz - R} ${cx + R} ${cy + 6} ${cz + R} minecraft:air`);
    await rcon.cmd(`tp ${NAME} ${cx + 0.5} ${cy} ${cz + 0.5}`);
    await sleep(1500);
  };
  const buffs = async () => {
    await rcon.cmd('gamemode 0 ' + NAME);
    await rcon.cmd('effect ' + NAME + ' clear');
    await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
    await rcon.cmd('effect ' + NAME + ' regeneration 9999 4');
    await rcon.cmd('effect ' + NAME + ' saturation 9999 4');
    await rcon.cmd('gamerule doMobSpawning false');
    await rcon.cmd('difficulty 1');
    await sleep(400);
  };
  const shoot = async () => {
    const p = await pos();
    const bow = bot.inventory.items().find((i) => i.name === 'bow');
    if (!bow) { say('  ! no bow'); return false; }
    await bot.equip(bow, 'hand');
    await sleep(800);
    await bot.lookAt(new Vec3(p.x + 0.5, p.y - 0.25, p.z + 10), true);
    await sleep(600);
    bot.activateItem();
    await sleep(1700);
    bot.deactivateItem();
    await sleep(1500);
    return true;
  };
  /** 存档离线读：扫玩家四周 r chunk 的箭实体 */
  const nbtNear = (x, z, r) => {
    try {
      return execFileSync(process.execPath, [NBT, 'find', WORLD, 'overworld', String(Math.floor(x)), String(Math.floor(z)), String(r || 3)],
        { encoding: 'utf8' }).trim();
    } catch (e) { return 'NBT-ERR ' + e.message; }
  };

  /** 只保留命中箭实体的行，便于回执摘录 */
  const nbtArrows = (x, z, r) => {
    const t = nbtNear(x, z, r).split('\n').filter((l) => /arrow#|metal_arrows=[1-9]/.test(l));
    return t.length ? t.join(' ; ') : '(none)';
  };

  const p0 = await pos();
  say('PHASE ' + phase + ' start pos=' + JSON.stringify(p0));

  /* ------------------------------------------------------------------ W0 */
  if (phase === 'w0') {
    await buffs();
    await pad(Math.floor(p0.x), Math.floor(p0.y), Math.floor(p0.z), 12);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await rcon.cmd(`give ${NAME} etim:arrow_copper 8`);
    await sleep(1800);
    const off = logOffset();
    say('W0 count pre=' + await countRows());
    await shoot();
    await sleep(4500);
    say('W0 testfor=' + await testfor());
    say('W0 raw count cmds: set=' + cut(String(await rcon.cmd('scoreboard players set #arrows arrowCnt 0', 8000)), 60)
      + ' | add=' + cut(String(await rcon.cmd('execute @e[type=etim:metal_arrow] ~ ~ ~ scoreboard players add #arrows arrowCnt 1', 8000)), 80)
      + ' | list=' + cut(String(await rcon.cmd('scoreboard players list #arrows', 8000)), 100));
    const t = await tpToArrow();
    say('W0 tpToArrow -> ' + JSON.stringify(t) + ' | count=' + await countRows());
    const rowsPick = rows(logSince(off), /ArrowLog\] arrow (spawn|pickup)/);
    say('W0 rows in window=' + rowsPick.length + ' (ok=true=' + count(logSince(off), /pickup .*ok=true/) + ')');
    rowsPick.slice(0, 4).concat(rowsPick.slice(-3)).forEach((l) => say('   ' + cut(l.trim(), 230)));
    say('W0 clear copper -> ' + cut(String(await rcon.cmd(`clear ${NAME} etim:arrow_copper 0 0`, 8000)), 140));
    say('W0 nbtNear -> ' + cut(nbtNear(p0.x, p0.z, 3), 500));
  }

  /* ------------------------------------------------------------------ W1 */
  if (phase === 'w1') {
    await buffs();
    await pad(Math.floor(p0.x), Math.floor(p0.y), Math.floor(p0.z), 10);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    const b = await pos();
    const ax = Math.floor(b.x) + 4, ay = Math.floor(b.y), az = Math.floor(b.z);
    const off = logOffset();
    const s1 = await rcon.cmd(`summon etim:metal_arrow ${ax + 0.5} ${ay + 1} ${az + 0.5} {arrow_item_id:"etim:arrow_copper"}`, 8000);
    say('W1 summon(with key) -> ' + cut(String(s1), 160));
    await sleep(2000);
    say('W1 testfor -> ' + await testfor() + ' | count=' + await countRows());
    say('W1 negative @e[type=arrow] -> ' + cut(String(await rcon.cmd('testfor @e[type=arrow]', 8000)), 140));
    const s2 = await rcon.cmd(`summon etim:metal_arrow ${ax + 2.5} ${ay + 1} ${az + 0.5}`, 8000);
    say('W1 summon(no key) -> ' + cut(String(s2), 160));
    await sleep(500);
    say('W1 (no-key +0.5s) count=' + await countRows());
    await sleep(4500);
    say('W1 (no-key +5s) count=' + await countRows());
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    say('W1 NBT 八键 -> ' + cut(nbtArrows(ax, az, 2), 700));
    const t = logSince(off);
    rows(t, /\[ArrowLog\]/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    say('W1 soe=' + count(t, /StackOverflowError/) + ' crashSaved=' + count(t, /This crash report has been saved/));
  }

  /* ------------------------------------------------------------------ W2 */
  if (phase === 'w2') {
    await buffs();
    await pad(Math.floor(p0.x), Math.floor(p0.y), Math.floor(p0.z), 12);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await rcon.cmd(`give ${NAME} etim:arrow_ancient_metal 8`);
    await sleep(1800);
    const off = logOffset();
    await shoot();
    await sleep(4500);
    const t1 = logSince(off);
    rows(t1, /\[ArrowLog\] arrow spawn/).forEach((l) => say('   ' + cut(l.trim(), 240)));
    say('W2 count before grab=' + await countRows());
    const c1 = await rcon.cmd(`clear ${NAME} etim:arrow_ancient_metal 0 0`, 8000);
    say('W2 clear after shot -> ' + cut(String(c1), 140) + ' (期望 7 = 8-1 射出)');
    const tp = await tpToArrow();
    say('W2 tpToArrow -> ' + JSON.stringify(tp) + ' | count=' + await countRows());
    const t2 = logSince(off);
    rows(t2, /\[ArrowLog\] arrow pickup/).forEach((l) => say('   ' + cut(l.trim(), 240)));
    const c2 = await rcon.cmd(`clear ${NAME} etim:arrow_ancient_metal 0 0`, 8000);
    say('W2 clear after pickup -> ' + cut(String(c2), 140) + ' (期望 1 = 拾回物是 ETIM ancient 箭)');
    const cv = await rcon.cmd(`clear ${NAME} minecraft:arrow 0 0`, 8000);
    say('W2 clear vanilla arrow -> ' + cut(String(cv), 140) + ' (期望 0)');
    say('W2 spawn=' + count(t2, /ArrowLog\] arrow spawn/) + ' pickupRows=' + count(t2, /ArrowLog\] arrow pickup/)
      + ' okTrue=' + count(t2, /arrow pickup .*ok=true/) + ' soe=' + count(t2, /StackOverflowError/));
    st.w2 = { spawn: count(t2, /ArrowLog\] arrow spawn/), pickupOk: count(t2, /arrow pickup .*ok=true/), afterShot: String(c1), afterPick: String(c2), vanilla: String(cv) };
    saveState(st);
  }

  /* ------------------------------------------------------------------ W3 */
  if (phase === 'w3') {
    await buffs();
    await pad(Math.floor(p0.x), Math.floor(p0.y), Math.floor(p0.z), 12);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await rcon.cmd(`give ${NAME} etim:arrow_mithril 4`);
    await sleep(1800);
    await shoot();
    await sleep(4500);
    say('W3 count=' + await countRows());
    say('W3 clear after shot -> ' + cut(String(await rcon.cmd(`clear ${NAME} etim:arrow_mithril 0 0`, 8000)), 130) + ' (期望 3)');
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    const nb1 = nbtArrows(p0.x, p0.z + 8, 3);
    say('W3 NBT save#1 -> ' + cut(nb1, 520));
    const off = logOffset();
    // 1.12：玩家列表为空的维度不卸载 chunk → 必须在 overworld 内拉开 >128 格
    await rcon.cmd(`tp ${NAME} 300 90 300`, 8000);
    await sleep(20000);
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    await rcon.cmd(`tp ${NAME} ${(p0.x + 0.5).toFixed(2)} 70 ${(p0.z + 0.5).toFixed(2)}`, 8000);
    await sleep(14000);
    say('W3 back pos=' + JSON.stringify(await pos()) + ' count=' + await countRows());
    const t = logSince(off);
    say('W3 nbt write=' + count(t, /ArrowLog\] arrow nbt write/) + ' nbt read=' + count(t, /ArrowLog\] arrow nbt read/));
    rows(t, /ArrowLog\] arrow nbt/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    const nb2 = nbtArrows(p0.x, p0.z + 8, 3);
    say('W3 NBT after reload -> ' + cut(nb2, 520));
    const tp = await tpToArrow();
    say('W3 tpToArrow -> ' + JSON.stringify(tp) + ' count=' + await countRows());
    say('W3 clear after pickup -> ' + cut(String(await rcon.cmd(`clear ${NAME} etim:arrow_mithril 0 0`, 8000)), 130) + ' (期望 1)');
    st.w3 = { write: count(t, /arrow nbt write/), read: count(t, /arrow nbt read/), nbt1: nb1.slice(0, 260), nbt2: nb2.slice(0, 260) };
    saveState(st);
  }

  /* ------------------------------------------------------------------ W4 */
  if (phase === 'w4') {
    await buffs();
    const cx = Math.floor(p0.x), cy = Math.floor(p0.y), cz = Math.floor(p0.z);
    await pad(cx, cy, cz, 16);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd('kill @e[type=etim:longdead]');
    await rcon.cmd(`clear ${NAME}`);
    await sleep(800);
    // 1 格深坑：视线/箭道仍越过坑沿；玩家站坑底，mob 在 13 格外
    await rcon.cmd(`fill ${cx - 2} ${cy - 3} ${cz - 2} ${cx + 2} ${cy - 3} ${cz + 2} minecraft:stone`);
    await rcon.cmd(`fill ${cx - 2} ${cy - 2} ${cz - 2} ${cx + 2} ${cy - 1} ${cz + 2} minecraft:air`);
    await rcon.cmd(`tp ${NAME} ${cx + 0.5} ${cy - 1} ${cz + 0.5}`);
    await sleep(1500);
    await rcon.cmd('time set 18000');
    await rcon.cmd('gamerule doDaylightCycle false');
    await rcon.cmd('gamerule doMobSpawning false');
    const sx = cx + 13, sy = cy, sz = cz;
    const off = logOffset();
    say('W4 summon -> ' + cut(String(await rcon.cmd(`summon etim:longdead ${sx + 0.5} ${sy} ${sz + 0.5} {CustomName:"W4Longdead",CustomNameVisible:1b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}`, 8000)), 150));
    // 每 200ms 轮询；每见一支新箭就侧移躲（让箭落空落地）
    let seen = 0, side = 0;
    for (let i = 0; i < 150; i++) {
      await sleep(200);
      const n = count(logSince(off), /ArrowLog\] arrow skeleton/);
      if (n > seen) {
        seen = n;
        side = side === 0 ? 5 : 0;
        await rcon.cmd(`tp ${NAME} ${(cx + 0.5 + side).toFixed(2)} ${cy - 1} ${cz + 0.5}`, 8000);
        say('W4 shot#' + seen + ' -> side-step to ' + (cx + side));
      }
      if (seen >= 3) break;
    }
    await sleep(6000);
    const t = logSince(off);
    rows(t, /ArrowLog\] arrow skeleton/).forEach((l) => say('   ' + cut(l.trim(), 250)));
    rows(t, /\[MobLog\] longdead arrow intended/).forEach((l) => say('   ' + cut(l.trim(), 210)));
    say('W4 skeleton=' + count(t, /ArrowLog\] arrow skeleton/) + ' intent=' + count(t, /MobLog\] longdead arrow intended/)
      + ' arrowsAlive=' + await countRows());
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    say('W4 NBT -> ' + cut(nbtArrows(cx + 5, cz, 3), 700));
    const tp = await tpToArrow();
    say('W4 tpToArrow -> ' + JSON.stringify(tp) + ' | count after=' + await countRows());
    const cc = await rcon.cmd(`clear ${NAME} etim:arrow_ancient_metal 0 0`, 8000);
    say('W4 clear ancient -> ' + cut(String(cc), 140) + ' (R196 期望可拾=1)');
    say('W4 pickupRows ok=true=' + count(logSince(off), /arrow pickup .*ok=true/)
      + ' ok=false=' + count(logSince(off), /arrow pickup .*ok=false/));
    st.w4 = { skeleton: count(t, /ArrowLog\] arrow skeleton/), intent: count(t, /MobLog\] longdead arrow intended/), clear: String(cc) };
    saveState(st);
    await rcon.cmd('kill @e[type=etim:longdead]');
  }

  /* ------------------------------------------------------------------ W5 */
  if (phase === 'w5') {
    await buffs();
    const cx = Math.floor(p0.x), cy = Math.floor(p0.y), cz = Math.floor(p0.z);
    await pad(cx, cy, cz, 12);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    await sleep(600);
    const dx = cx, dy = cy, dz = cz + 5;
    // 长条地板（顶面 dy-1，落差 1.0 格）+ 上方清空：给落点一个确定平面
    await rcon.cmd(`fill ${dx - 4} ${dy - 2} ${dz} ${dx + 11} ${dy - 2} ${dz + 46} minecraft:stone`);
    await rcon.cmd(`fill ${dx - 4} ${dy - 1} ${dz} ${dx + 11} ${dy + 3} ${dz + 46} minecraft:air`);
    await rcon.cmd(`setblock ${dx} ${dy} ${dz} minecraft:dispenser 3`);
    say('W5 blockdata -> ' + cut(String(await rcon.cmd(`blockdata ${dx} ${dy} ${dz} {Items:[{Slot:0b,id:"etim:arrow_copper",Count:1b}]}`, 8000)), 170));
    // 站位：dispenser 后方（-z）地板上
    await rcon.cmd(`tp ${NAME} ${dx + 0.5} ${dy - 1} ${dz - 3.5}`);
    await sleep(1200);
    const off = logOffset();
    say('W5 trigger -> ' + cut(String(await rcon.cmd(`setblock ${dx} ${dy} ${dz - 1} minecraft:redstone_block`, 8000)), 120));
    await sleep(4000);
    const t = logSince(off);
    rows(t, /ArrowLog\] arrow (dispense|spawn)/).forEach((l) => say('   ' + cut(l.trim(), 240)));
    say('W5 dispense=' + count(t, /arrow dispense/) + ' spawn=' + count(t, /arrow spawn/) + ' count=' + await countRows());
    await sleep(9000);
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    say('W5 NBT -> ' + cut(nbtArrows(dx, dz + 10, 3), 600));
    const tp = await tpToArrow();
    say('W5 tpToArrow(landing) -> ' + JSON.stringify(tp));
    if (tp.pos) {
      // 出射点 = block origin + 0.7*facing（1.12 BlockDispenser.getDispensePosition 无 +0.5）
      // 落差 h=1.0 -> n≈6 -> 水平位移系数 sum(0.99^k, k=0..5)=5.795
      const d = (tp.pos.z - (dz + 0.7));
      const v0 = d / 5.795;
      say('W5 landing z=' + tp.pos.z.toFixed(2) + ' d=' + d.toFixed(2) + ' -> v0~' + v0.toFixed(2)
        + ' (2.2 理论 d≈12.7 / 1.1 理论 d≈6.4；量级判：11.4~14.0 为 2.2 面)');
      st.w5 = { landing: tp.pos, d: d, v0: v0 };
    }
    const cc = await rcon.cmd(`clear ${NAME} etim:arrow_copper 0 0`, 8000);
    say('W5 clear copper -> ' + cut(String(cc), 140));
    // ---- 对照臂：同位置 vanilla dispenser + minecraft:arrow（初速 1.1F 基线）
    const vx = dx + 6, vz = dz + 3;
    await rcon.cmd(`setblock ${vx} ${dy} ${vz} minecraft:dispenser 3`);
    await rcon.cmd(`blockdata ${vx} ${dy} ${vz} {Items:[{Slot:0b,id:"minecraft:arrow",Count:1b}]}`);
    await rcon.cmd(`setblock ${vx} ${dy} ${vz - 1} minecraft:redstone_block`);
    await sleep(9000);
    const vres = await rcon.cmd('tp ' + NAME + ' @e[type=arrow,c=1]', 8000);
    await sleep(1200);
    const vpos = await pos();
    say('W5 vanilla-arrow tp -> ' + cut(String(vres), 90) + ' pos=' + JSON.stringify(vpos));
    if (vpos && tp.pos) {
      const dV = vpos.z - (vz + 0.7), dE = tp.pos.z - (dz + 0.7);
      say('W5 ratio d_etim=' + dE.toFixed(2) + ' / d_vanilla=' + dV.toFixed(2)
        + ' = ' + (dE / dV).toFixed(2) + ' (目标 2.00 = 2.2/1.1，±10% 窗 1.80~2.20)');
      st.w5 = Object.assign(st.w5 || {}, { dVanilla: dV, ratio: dE / dV });
      saveState(st);
    }
    await rcon.cmd(`setblock ${vx} ${dy} ${vz - 1} minecraft:air`);
    await rcon.cmd(`setblock ${vx} ${dy} ${vz} minecraft:air`);
    say('W5 count after=' + await countRows() + ' pickupOk=' + count(logSince(off), /arrow pickup .*ok=true/));
    st.w5 = Object.assign(st.w5 || {}, { dispense: count(t, /arrow dispense/), clear: String(cc) });
    saveState(st);
    await rcon.cmd(`setblock ${dx} ${dy} ${dz - 1} minecraft:air`);
    await rcon.cmd(`setblock ${dx} ${dy} ${dz} minecraft:air`);
  }

  /* ------------------------------------------------------------------ W6 */
  if (phase === 'w6') {
    const cx = Math.floor(p0.x), cy = Math.floor(p0.y), cz = Math.floor(p0.z);
    await pad(cx, cy, cz, 12);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await rcon.cmd(`give ${NAME} etim:arrow_silver 8`);
    await sleep(1500);
    const off = logOffset();
    // ① 创造射
    await rcon.cmd('gamemode 1 ' + NAME);
    await sleep(900);
    await rcon.cmd(`effect ${NAME} resistance 9999 4`);
    await shoot();
    await sleep(9000);
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    say('W6 creative NBT -> ' + cut(nbtArrows(p0.x, p0.z + 8, 3), 600));
    // 生存玩家拾创造箭
    await rcon.cmd('gamemode 0 ' + NAME);
    await sleep(900);
    const before = await countRows();
    const tp1 = await tpToArrow();
    const afterSurv = await countRows();
    say('W6 survival-vs-creative: ' + before + ' -> ' + afterSurv + ' (应不变) | tp=' + JSON.stringify(tp1));
    const ccSurv = await rcon.cmd(`clear ${NAME} etim:arrow_silver 0 0`, 8000);
    say('W6 survival clear silver -> ' + cut(String(ccSurv), 120));
    // ② 生存射
    await rcon.cmd(`clear ${NAME} etim:arrow_silver 0 0`, 8000);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`give ${NAME} etim:arrow_silver 8`);
    await sleep(1200);
    await rcon.cmd(`tp ${NAME} ${cx + 0.5} ${cy} ${cz - 6.5}`);
    await sleep(1200);
    await shoot();
    await sleep(9000);
    await rcon.cmd('save-all', 20000);
    await sleep(3000);
    say('W6 survival NBT -> ' + cut(nbtArrows(p0.x, p0.z + 8, 3), 600));
    const b2 = await countRows();
    const tp2 = await tpToArrow();
    const a2 = await countRows();
    say('W6 survival grab: ' + b2 + ' -> ' + a2 + ' | tp=' + JSON.stringify(tp2));
    const cc2 = await rcon.cmd(`clear ${NAME} etim:arrow_silver 0 0`, 8000);
    say('W6 survival clear silver -> ' + cut(String(cc2), 120));
    const t = logSince(off);
    say('W6 spawn rows=' + count(t, /ArrowLog\] arrow spawn/) + ' soe=' + count(t, /StackOverflowError/));
    st.w6 = { survCount: [before, afterSurv], survClear: String(ccSurv), surv2: [b2, a2], clear2: String(cc2) };
    saveState(st);
  }

  /* ------------------------------------------------------------------ W7 */
  if (phase === 'w7') {
    await buffs();
    await pad(Math.floor(p0.x), Math.floor(p0.y), Math.floor(p0.z), 10);
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await sleep(600);
    const b = await pos();
    const ax = Math.floor(b.x) + 4, ay = Math.floor(b.y), az = Math.floor(b.z);
    await rcon.cmd(`summon etim:metal_arrow ${ax + 0.5} ${ay + 1} ${az + 0.5} {arrow_item_id:"etim:arrow_copper"}`, 8000);
    await sleep(2500);
    say('W7 positive testfor -> ' + await testfor() + ' count=' + await countRows());
    say('W7 negative @e[type=arrow] -> ' + cut(String(await rcon.cmd('testfor @e[type=arrow]', 8000)), 140));
    const n = chatReplies.length;
    await rcon.cmd('execute @e[type=etim:metal_arrow] ~ ~ ~ say arrowsel-ok', 8000);
    await sleep(2500);
    const said = chatReplies.slice(n).filter((l) => /arrowsel-ok/.test(l));
    say('W7 execute-say rows(chat)=' + said.length);
    // ---- 刷行定量（A 级取证）：summon 箭 pickup=0(DISALLOWED) → 玩家站上去 10s
    const bp = await pos();
    await rcon.cmd(`summon etim:metal_arrow ${(bp.x + 0.5).toFixed(2)} ${(bp.y + 1).toFixed(2)} ${(bp.z + 0.5).toFixed(2)} {arrow_item_id:"etim:arrow_copper"}`, 8000);
    await sleep(2500);
    const t0 = logOffset();
    await rcon.cmd('tp ' + NAME + ' @e[type=etim:metal_arrow,c=1]', 8000);
    await sleep(10000);
    const denyRows = count(logSince(t0), /arrow pickup .*ok=false/);
    const denyOk = count(logSince(t0), /arrow pickup .*ok=true/);
    say('W7 denial-window(10s) pickup rows: ok=false=' + denyRows + ' ok=true=' + denyOk
      + ' (去重正确应为 ok=false=1；实测>10 即逐 tick 刷行)');
    st.w7deny = { denyRows: denyRows, okRows: denyOk };
    saveState(st);
    await sleep(2000);
    const all = logAll();
    const cat = (re) => count(all, re);
    say('W7 full-window [ArrowLog]: register=' + cat(/\[ArrowLog\] arrow register/)
      + ' spawn=' + cat(/\[ArrowLog\] arrow spawn/)
      + ' pickup=' + cat(/\[ArrowLog\] arrow pickup/)
      + ' nbtWrite=' + cat(/\[ArrowLog\] arrow nbt write/)
      + ' nbtRead=' + cat(/\[ArrowLog\] arrow nbt read/)
      + ' skeleton=' + cat(/\[ArrowLog\] arrow skeleton/)
      + ' dispense=' + cat(/\[ArrowLog\] arrow dispense/)
      + ' total=' + cat(/\[ArrowLog\]/));
    const sp = rows(all, /\[ArrowLog\] arrow spawn/);
    say('W7 spawn rows=' + sp.length + ' (逐 tick 刷行检查：spawn 应与发射趟数 1:1)');
    say('W7 soe=' + cat(/StackOverflowError/) + ' crashSaved=' + cat(/This crash report has been saved/));
    st.w7 = { executeSay: said.length, spawn: sp.length };
    saveState(st);
  }

  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
