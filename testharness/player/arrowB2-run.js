#!/usr/bin/env node
/**
 * arrowB2-run.js — 批 B 重验窗 driver（会话七，2026-10-25 第二窗）
 *
 * 相位：
 *   a / w2r  W2' 玩家拾回面回归：生存射 1 发 → 拾回 → ok=true 恰 1 行 + clear 计数 7→8
 *   b / w4r  W4' 骷髅源判据改写重放：longdead 放箭 ×5 → skeleton 行 ×5 不变；
 *            落地箭存档 NBT pickup byte=0 + arrow_item_id=ancient；
 *            站插地骷髅箭 10s → ok=false 恰 1 行 + clear ancient 不变
 *   c / w7r  W7' A-1 重验：选择器正/负对照 + 独立 deny 探针（新实例仍 1 行）
 *   all      a → b → c 单 boot 连跑
 *
 * 判据通道（1.12 无 /data）：scoreboard 计数 / 存档离线 NBT / 日志行计数 / clear 探针
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
const STATE = path.join(ROOT, 'build-logs', 'arrowB2-state.json');
const NBT = path.join(__dirname, 'arrowB-nbt.js');
const NAME = 'ETIM_Harn01';
const WORLD = 'arrowb1';
const AX = 200, AZ = 200; // 本窗工位（远离上一窗残箭）

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
  const phase = (process.argv[2] || 'all').toLowerCase();
  const rcon = new Rcon();
  await rcon.connect(); await rcon.auth();
  const bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: NAME });
  for (let i = 0; i < 40; i++) { if (bot.entity && bot.entity.position && bot.entity.position.y > 0) break; await sleep(500); }
  await sleep(3000);
  const chatReplies = [];
  bot.on('message', (m) => chatReplies.push(m.toString()));
  const st = loadState();

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
  const pad = async (cx, cy, cz, r) => {
    const R = r || 8;
    await rcon.cmd(`fill ${cx - R} ${cy - 1} ${cz - R} ${cx + R} ${cy - 1} ${cz + R} minecraft:stone`);
    await rcon.cmd(`fill ${cx - R} ${cy} ${cz - R} ${cx + R} ${cy + 6} ${cz + R} minecraft:air`);
  };
  const buffs = async () => {
    await rcon.cmd('gamemode 0 ' + NAME);
    await rcon.cmd('effect ' + NAME + ' clear');
    await rcon.cmd('effect ' + NAME + ' resistance 9999 4');
    await rcon.cmd('effect ' + NAME + ' regeneration 9999 4');
    await rcon.cmd('effect ' + NAME + ' saturation 9999 4');
    await rcon.cmd('gamerule doMobSpawning false');
    await rcon.cmd('gamerule doDaylightCycle true');
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
  /** 存档离线 NBT：返回箭实体数组（json 模式） */
  const nbtArrows = (x, z, r) => {
    try {
      const raw = execFileSync(process.execPath, [NBT, 'json', WORLD, 'overworld', String(Math.floor(x)), String(Math.floor(z)), String(r || 3)], { encoding: 'utf8' }).trim();
      return JSON.parse(raw.split('\n').pop());
    } catch (e) { return []; }
  };
  const clearCount = async (item) => cut(String(await rcon.cmd(`clear ${NAME} ${item} 0 0`, 8000)), 150);
  const tpToArrow = async (selector) => {
    const r = await rcon.cmd('tp ' + NAME + ' ' + (selector || '@e[type=etim:metal_arrow,c=1]'), 8000);
    await sleep(1200);
    return { r: cut(String(r), 90), pos: await pos() };
  };

  const p0 = await pos();
  say('PHASE ' + phase + ' start pos=' + JSON.stringify(p0));
  await buffs();
  await pad(AX, 70, AZ, 16);
  await sleep(800);

  /* ------------------------------------------------------------------ W2' */
  if (phase === 'a' || phase === 'w2r' || phase === 'all') {
    say('=========== W2\' 玩家拾回面回归 ===========');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`tp ${NAME} ${AX + 0.5} 70 ${AZ + 0.5}`);
    await sleep(1200);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await rcon.cmd(`give ${NAME} etim:arrow_mithril 8`);
    await sleep(1800);
    const before = await clearCount('etim:arrow_mithril');
    say('W2\' clear before shot -> ' + before + ' (期望 8)');
    const off = logOffset();
    st.offA = off;
    await shoot();
    await sleep(9000);
    const afterShot = await clearCount('etim:arrow_mithril');
    say('W2\' clear after shot -> ' + afterShot + ' (期望 7)');
    say('W2\' count before grab=' + await countRows());
    const tp = await tpToArrow();
    say('W2\' tpToArrow -> ' + JSON.stringify(tp) + ' | count=' + await countRows());
    const t = logSince(off);
    rows(t, /ArrowLog\] arrow (spawn|pickup)/).forEach((l) => say('   ' + cut(l.trim(), 230)));
    const afterPick = await clearCount('etim:arrow_mithril');
    say('W2\' clear after pickup -> ' + afterPick + ' (期望 8 = 7+1 拾回原物)');
    const ok = count(t, /arrow pickup .*ok=true/), deny = count(t, /arrow pickup .*ok=false/);
    const sp = count(t, /ArrowLog\] arrow spawn/);
    say('W2\' spawn=' + sp + ' pickupOk=' + ok + ' pickupDeny=' + deny + ' soe=' + count(t, /StackOverflowError/));
    st.w2r = { before, afterShot, afterPick, spawn: sp, ok, deny };
    saveState(st);
  }

  /* ------------------------------------------------------------------ W4' */
  if (phase === 'b' || phase === 'w4r' || phase === 'all') {
    say('=========== W4\' 骷髅源（判据改写重放）===========');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd('kill @e[type=etim:longdead]');
    await rcon.cmd(`clear ${NAME}`);
    await sleep(800);
    const cx = AX, cy = 70, cz = AZ;
    // 1 格深坑：玩家站坑底，视线越过坑沿；mob 在 13 格外
    await rcon.cmd(`fill ${cx - 2} ${cy - 3} ${cz - 2} ${cx + 2} ${cy - 3} ${cz + 2} minecraft:stone`);
    await rcon.cmd(`fill ${cx - 2} ${cy - 2} ${cz - 2} ${cx + 2} ${cy - 1} ${cz + 2} minecraft:air`);
    await rcon.cmd(`tp ${NAME} ${cx + 0.5} ${cy - 1} ${cz + 0.5}`);
    await sleep(1500);
    await rcon.cmd('time set 18000');
    await rcon.cmd('gamerule doDaylightCycle false');
    await rcon.cmd('gamerule doMobSpawning false');
    const sx = cx + 13, sy = cy, sz = cz;
    const off = logOffset();
    say('W4\' summon -> ' + cut(String(await rcon.cmd(`summon etim:longdead ${sx + 0.5} ${sy} ${sz + 0.5} {CustomName:"W4RLongdead",CustomNameVisible:1b,PersistenceRequired:1b,HandItems:[{id:"minecraft:bow",Count:1b},{}]}`, 8000)), 150));
    // 每 200ms 轮询：见新箭即侧移躲（让箭落空插地）；最多等 80s 收满 5 发
    let seen = 0, side = 0, loops = 0;
    for (let i = 0; i < 400; i++) {
      loops = i + 1;
      await sleep(200);
      const n = count(logSince(off), /ArrowLog\] arrow skeleton/);
      if (n > seen) {
        seen = n;
        side = side === 0 ? 5 : 0;
        await rcon.cmd(`tp ${NAME} ${(cx + 0.5 + side).toFixed(2)} ${cy - 1} ${cz + 0.5}`, 8000);
        say('W4\' shot#' + seen + ' -> side-step');
      }
      if (seen >= 5) break;
      if (i > 0 && i % 60 === 0) {
        await rcon.cmd(`tp ${NAME} ${cx + 0.5} ${cy - 1} ${cz + 0.5}`, 8000);
        say('W4\' 回坑心续等（已 ' + seen + ' 发 / ' + (i / 5).toFixed(0) + 's）');
      }
    }
    say('W4\' 采样结束 skeleton=' + seen + ' 用时=' + (loops * 0.2).toFixed(0) + 's');
    // 先杀 mob 再进 deny 窗：否则新落地箭（新实体）的首次 deny 行会污染计数
    await rcon.cmd('kill @e[type=etim:longdead]');
    await sleep(6000);
    say('W4\' longdead 已杀: ' + cut(String(await rcon.cmd('testfor @e[type=etim:longdead]', 8000)), 100));
    const t = logSince(off);
    rows(t, /ArrowLog\] arrow skeleton/).forEach((l) => say('   ' + cut(l.trim(), 250)));
    const skelRows = count(t, /ArrowLog\] arrow skeleton/);
    const skelAncient = count(t, /arrow skeleton .*item=arrow_ancient_metal/);
    const inFlightDeny = count(t, /arrow pickup .*ok=false/);
    say('W4\' skeleton=' + skelRows + ' (item=arrow_ancient_metal ' + skelAncient + ')'
      + ' intent=' + count(t, /MobLog\] longdead arrow intended/) + ' arrowsAlive=' + await countRows());
    say('W4\' 飞行期 deny 行=' + inFlightDeny + '（inGround 门在 super 内 → 期望 0）');
    await rcon.cmd('save-all', 20000);
    await sleep(3500);
    const arr = nbtArrows(cx + 6, cz, 4);
    say('W4\' 存档箭 NBT 数=' + arr.length);
    arr.forEach((a, i) => say('   arrow#' + i + ' item=' + a.arrow_item_id + ' pickup=' + a.pickup
      + ' inGround=' + a.inGround + ' damage=' + (typeof a.damage === 'number' ? a.damage.toFixed(3) : a.damage)
      + ' Pos=[' + (a.Pos || []).map((v) => (+v).toFixed(2)).join(',') + '] chunk=' + a.chunk));
    const ancientArrows = arr.filter((a) => a.arrow_item_id === 'etim:arrow_ancient_metal');
    const allZero = ancientArrows.length > 0 && ancientArrows.every((a) => a.pickup === 0);
    const allGrounded = ancientArrows.length > 0 && ancientArrows.every((a) => a.inGround === 1 || a.inGround === true);
    say('W4\' 判值: ancient 箭=' + ancientArrows.length + ' 全部 pickup=0 -> ' + allZero + ' 全部 inGround -> ' + allGrounded);
    // 选一支“孤立”的落地箭做 10s deny 窗（其余箭不在玩家碰撞箱内）
    const cands = ancientArrows.filter((a) => a.inGround === 1 || a.inGround === true);
    let pick = null, best = -1;
    cands.forEach((a) => {
      let minD = 1e9;
      cands.forEach((b) => {
        if (a === b) return;
        const dx = a.Pos[0] - b.Pos[0], dz = a.Pos[2] - b.Pos[2];
        minD = Math.min(minD, Math.hypot(dx, dz));
      });
      if (minD > best) { best = minD; pick = a; }
    });
    if (pick) {
      say('W4\' deny 目标: Pos=[' + pick.Pos.map((v) => (+v).toFixed(2)).join(',') + '] 最近邻距离=' + best.toFixed(2));
      const clearBefore = await clearCount('etim:arrow_ancient_metal');
      say('W4\' clear ancient before -> ' + clearBefore + ' (期望 0)');
      const aliveA = await countRows();
      say('W4\' 实体数 before=' + aliveA);
      const offD = logOffset();
      await rcon.cmd(`tp ${NAME} ${pick.Pos[0].toFixed(2)} ${pick.Pos[1].toFixed(2)} ${pick.Pos[2].toFixed(2)}`, 8000);
      await sleep(10000);
      const tD = logSince(offD);
      const deny1 = count(tD, /arrow pickup .*ok=false/);
      const ok1 = count(tD, /arrow pickup .*ok=true/);
      say('W4\' deny 窗#1（10s）ok=false=' + deny1 + ' ok=true=' + ok1 + '（期望 ok=false 恰 1、ok=true 0）');
      rows(tD, /arrow pickup/).forEach((l) => say('   ' + cut(l.trim(), 200)));
      const clearAfter = await clearCount('etim:arrow_ancient_metal');
      say('W4\' clear ancient after -> ' + clearAfter + ' (期望与 before 同 = 拾不动)');
      const aliveBefore = aliveA;
      const aliveAfter = await countRows();
      say('W4\' 实体数 before=' + aliveBefore + ' after=' + aliveAfter + '（期望同 = 未被拾走）');
      // 窗#2：同箭再站 5s → 不应追加行（去重状态已置，mob 已杀）
      const offD2 = logOffset();
      await sleep(5000);
      const deny2 = count(logSince(offD2), /arrow pickup .*ok=false/);
      say('W4\' deny 窗#2（再 5s，mob 已杀）ok=false 新增=' + deny2 + '（期望 0）');
      st.w4r = {
        skeleton: skelRows, skelAncient, intent: count(t, /MobLog\] longdead arrow intended/),
        nbtCount: arr.length, ancientCount: ancientArrows.length, allZero, allGrounded,
        deny1, ok1, deny2, clearBefore, clearAfter, alive: [aliveBefore, aliveAfter], pickPos: pick.Pos
      };
      saveState(st);
    } else {
      say('W4\' ! 无可用落地箭，deny 窗未执行');
      st.w4r = { skeleton: skelRows, skelAncient, nbtCount: arr.length, ancientCount: ancientArrows.length };
      saveState(st);
    }
    await rcon.cmd('kill @e[type=etim:longdead]');
  }

  /* ------------------------------------------------------------------ W4'' */
  // 真实骷髅箭 deny 窗：pickupDeniedLogged 不落 NBT，chunk 卸载/重载后复位
  // → 对同一支骷髅箭可做“首次碰撞”干净测量。
  if (phase === 'd' || phase === 'w4rr' || phase === 'all') {
    say('=========== W4\'\' 真实骷髅箭 deny 窗（reload 复位）===========');
    const cands = nbtArrows(AX + 6, AZ, 4)
      .filter((a) => a.arrow_item_id === 'etim:arrow_ancient_metal' && (a.inGround === 1 || a.inGround === true));
    let target = null, best = -1;
    cands.forEach((x) => {
      let minD = 1e9;
      cands.forEach((y) => {
        if (x === y) return;
        minD = Math.min(minD, Math.hypot(x.Pos[0] - y.Pos[0], x.Pos[2] - y.Pos[2]));
      });
      if (minD > best) { best = minD; target = x; }
    });
    if (!target) {
      say('W4\'\' ! 无落地骷髅箭，跳过');
      st.w4rr = { skipped: true };
      saveState(st);
    } else {
      say('W4\'\' 候选=' + cands.length + ' 目标 Pos=[' + target.Pos.map((v) => (+v).toFixed(2)).join(',')
        + '] 最近邻=' + (best === 1e9 ? 'n/a(仅1支)' : best.toFixed(2)));
      // ① 远离 300+ 格 → chunk 卸载（去重标志复位）
      await rcon.cmd(`tp ${NAME} 500 90 500`, 8000);
      await sleep(20000);
      await rcon.cmd('save-all', 20000);
      await sleep(3000);
      say('W4\'\' chunk 卸载完成，回场');
      // ② 回到目标 4 格外（不立即碰撞）
      await rcon.cmd(`tp ${NAME} ${(target.Pos[0] + 4).toFixed(2)} 70 ${target.Pos[2].toFixed(2)}`, 8000);
      await sleep(8000);
      const off1 = logOffset();
      // ③ 站上目标箭 10s（首次碰撞 → 期望恰 1 行）
      await rcon.cmd(`tp ${NAME} ${target.Pos[0].toFixed(2)} ${target.Pos[1].toFixed(2)} ${target.Pos[2].toFixed(2)}`, 8000);
      await sleep(10000);
      const t1 = logSince(off1);
      const deny1 = count(t1, /arrow pickup .*ok=false/);
      const ok1 = count(t1, /arrow pickup .*ok=true/);
      say('W4\'\' deny 窗（10s，reload 后首次）ok=false=' + deny1 + ' ok=true=' + ok1 + '（期望 ok=false 恰 1）');
      rows(t1, /arrow pickup/).forEach((l) => say('   ' + cut(l.trim(), 200)));
      // ④ 再站 5s → 期望 0 新增
      const off2 = logOffset();
      await sleep(5000);
      const deny2 = count(logSince(off2), /arrow pickup .*ok=false/);
      say('W4\'\' 续站 5s ok=false 新增=' + deny2 + '（期望 0 = 去重生效）');
      const cc = await clearCount('etim:arrow_ancient_metal');
      say('W4\'\' clear ancient -> ' + cc + '（期望 0 = 拾不动）');
      st.w4rr = { cands: cands.length, target: target.Pos, deny1, ok1, deny2, clear: cc };
      saveState(st);
    }
  }

  /* ------------------------------------------------------------------ W7' */
  if (phase === 'c' || phase === 'w7r' || phase === 'all') {
    say('=========== W7\' A-1 重验 + 选择器回归 ===========');
    await rcon.cmd('kill @e[type=etim:metal_arrow]');
    await rcon.cmd('gamerule doDaylightCycle true');
    await rcon.cmd('time set 6000');
    await rcon.cmd(`tp ${NAME} ${AX + 0.5} 70 ${AZ + 0.5}`);
    await sleep(1500);
    const off = logOffset();
    // ① 生存射 1 发 → 拾回 ok=true 恰 1 行
    await rcon.cmd(`clear ${NAME}`);
    await rcon.cmd(`give ${NAME} minecraft:bow 1`);
    await rcon.cmd(`give ${NAME} etim:arrow_copper 8`);
    await sleep(1500);
    await shoot();
    await sleep(9000);
    const tp1 = await tpToArrow();
    await sleep(1500);
    const t1 = logSince(off);
    const okRows = count(t1, /arrow pickup .*ok=true/);
    const denyRows1 = count(t1, /arrow pickup .*ok=false/);
    say('W7\' ① 生存射+拾回: ok=true=' + okRows + ' ok=false=' + denyRows1 + ' tp=' + JSON.stringify(tp1)
      + '（期望 ok=true 恰 1）');
    // ② 独立 deny 探针：新 summon 实例（pickup 缺省 = 0/DISALLOWED）
    const bp = await pos();
    await rcon.cmd(`summon etim:metal_arrow ${(bp.x + 3.5).toFixed(2)} ${(bp.y - 0.5).toFixed(2)} ${(bp.z + 0.5).toFixed(2)} {arrow_item_id:"etim:arrow_copper"}`, 8000);
    await sleep(3000);
    const off2 = logOffset();
    await rcon.cmd(`tp ${NAME} ${(bp.x + 3.5).toFixed(2)} ${(bp.y - 0.5).toFixed(2)} ${(bp.z + 0.5).toFixed(2)}`, 8000);
    await sleep(10000);
    const t2 = logSince(off2);
    const deny2 = count(t2, /arrow pickup .*ok=false/);
    const ok2 = count(t2, /arrow pickup .*ok=true/);
    say('W7\' ② deny 探针（10s）ok=false=' + deny2 + ' ok=true=' + ok2 + '（期望 ok=false 恰 1）');
    rows(t2, /arrow pickup/).forEach((l) => say('   ' + cut(l.trim(), 200)));
    // ③ 选择器正/负对照
    const pres = await testfor();
    const nres = await rcon.cmd('testfor @e[type=arrow]', 8000);
    const n0 = chatReplies.length;
    await rcon.cmd('execute @e[type=etim:metal_arrow] ~ ~ ~ say arrowsel-ok', 8000);
    await sleep(2000);
    const said = chatReplies.slice(n0).filter((l) => /arrowsel-ok/.test(l)).length;
    say('W7\' ③ 正对照 -> ' + pres + ' | 负对照 @e[type=arrow] -> ' + cut(String(nres), 120)
      + ' | execute-say=' + said);
    // ④ 全窗判行统计（不含上一窗，开窗即统计到本相位末）
    const all = logSince(st.offA || 0);
    const cat = (re) => count(all, re);
    say('W7\' ④ 本窗 [ArrowLog]（本窗自 W2\' 起）: register=' + cat(/\[ArrowLog\] arrow register/)
      + ' spawn=' + cat(/\[ArrowLog\] arrow spawn/)
      + ' pickup=' + cat(/\[ArrowLog\] arrow pickup/)
      + ' pickupOk=' + cat(/arrow pickup .*ok=true/)
      + ' pickupDeny=' + cat(/arrow pickup .*ok=false/)
      + ' nbtWrite=' + cat(/arrow nbt write/) + ' nbtRead=' + cat(/arrow nbt read/)
      + ' skeleton=' + cat(/arrow skeleton/) + ' dispense=' + cat(/arrow dispense/));
    const spawnRows = rows(all, /\[ArrowLog\] arrow spawn/);
    say('W7\' ④ spawn 行数=' + spawnRows.length + '（本窗发射趟数：W2\'1 + W4\'5 + W7\'1 = 7）');
    say('W7\' ④ spawn 行是否仍带 dispenser= 字段 -> ' + spawnRows.some((l) => /dispenser=/.test(l)) + '（B-1 已删，期望 false）');
    say('W7\' ④ soe=' + cat(/StackOverflowError/) + ' crashSaved=' + cat(/This crash report has been saved/)
      + ' watchdog=' + cat(/watchdog|Timed out/i) + ' internalErr=' + cat(/Internal server error/));
    st.w7r = { okRows, denyRows1, deny2, ok2, positive: pres, negative: String(nres), executeSay: said, spawn: spawnRows.length };
    saveState(st);
  }

  try { bot.quit(); } catch (e) {}
  setTimeout(() => process.exit(0), 900);
})().catch((e) => { console.error('FATAL ' + (e.stack || e.message)); process.exit(1); });
