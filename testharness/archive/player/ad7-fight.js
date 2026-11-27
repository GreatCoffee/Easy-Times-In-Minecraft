#!/usr/bin/env node
/**
 * ad7-fight.js — 批 E · AD-7 验证窗 W4~W8 真打驱动（会话七）
 *
 * 判据通道只有 [DamageLog] 两行（式样批 D 已钉、AD-7 一字未改）：
 *   row A  dmg target=…#id src= raw= armorIn= armorOut= absorption= final=
 *   row B  prot target=…#id src= natural= armor= potion= total= piercing= wear=
 * 脚本只负责：布置场景、发命中、按日志统计、落 JSON；判决仍以日志原文为准。
 *
 * 相位：
 *   cal   武器标定：逐件换主手 → 打一发 → 回读 raw（决定 heavy/light 两档）
 *   w4    铁胸+铁护腿（total 5.500）+ heavy 武器（raw>5.5）：p=0 vs p=3，final 差必须 = 3.000
 *   w5    裸装（total 0.000）+ heavy：p=0 vs p=3，final 必须逐位相同
 *   w6    同 w4 场景：两组 wear= 必须逐位相等；目标胸/腿耐久增量必须同值
 *   w7    满铁（total 7.500）+ light 武器（raw∈(4.6,5.5]）：p=0/2/3 各 N 发，
 *         统计 armorOut=0.000 占比，期望 48.8% / 20.0% / 0%
 *   w8    /kill（outOfWorld 绝对源）：必须无 prot 行、armorOut=raw；starve 变体可选
 *
 * 前置（主会话/会话七开窗前）：
 *   1. run/config/etim.cfg 里 damageDebugLog=true（脚本会自检，未开直接退出）
 *   2. runServer 起好；两个端点 ETIM_Harn01（打手）/ ETIM_Harn03（靶）均已 op
 *
 * 用法：
 *   node ad7-fight.js cal
 *   node ad7-fight.js w4 w5 w6              # 可多相位
 *   node ad7-fight.js w7 --hits 200
 *   node ad7-fight.js all                   # cal + w4..w8
 *
 * 环境覆盖：AD7_LOG=<latest.log 路径>（默认 run/logs/latest.log）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.join(__dirname, '..', '..');
const LOG = process.env.AD7_LOG || path.join(ROOT, 'run', 'logs', 'latest.log');
const CFG = process.env.AD7_CFG || path.join(ROOT, 'run', 'config', 'etim.cfg');
const OUT = path.join(ROOT, 'build-logs', 'ad7-fight-report.json');

const ATK = 'ETIM_Harn01';
const TGT = 'ETIM_Harn03';
/* 竞技台在启动时就地搭：以打手落地点的脚高为基准（固定 y=80 会踩空，实测两 bot
 * 各吃 13.000 摔伤、[DamageLog] 全是 src=fall，把 W4~W7 的窗口污染掉）。 */
let TGT_POS = null;
let ATK_POS = null;
let BASE = null;

/* 标定武器梯：raw 落在 (4.6,5.5] 的记为 light（W7 用），>5.5 的记为 heavy（W4/W5/W6 用） */
const WEAPONS = [
  'minecraft:wooden_sword', 'minecraft:stone_sword', 'minecraft:golden_sword',
  'minecraft:iron_sword', 'minecraft:diamond_sword',
  'etim:dagger_copper', 'etim:knife_copper', 'etim:sword_copper',
  'etim:pickaxe_copper', 'etim:battle_axe_copper', 'etim:war_hammer_copper',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const f3 = (v) => (v === null || v === undefined ? 'n/a' : Number(v).toFixed(3));
const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (o) => { try { return fs.readFileSync(LOG).slice(o).toString('utf8'); } catch (e) { return ''; } };

const parseDmg = (line) => {
  const m = /dmg target=(.+?)#(\d+) src=(\S+) raw=([-\d.]+) armorIn=([-\d.]+) armorOut=([-\d.]+) absorption=([-\d.]+) final=([-\d.]+)/.exec(line);
  return m ? { name: m[1], id: +m[2], src: m[3], raw: +m[4], armorIn: +m[5], armorOut: +m[6], absorption: +m[7], final: +m[8], line: line.trim() } : null;
};
const parseProt = (line) => {
  const m = /prot target=(.+?)#(\d+) src=(\S+) natural=([-\d.]+) armor=([-\d.]+) potion=([-\d.]+) total=([-\d.]+) piercing=([-\d.]+) wear=([-\d.]+)/.exec(line);
  return m ? { name: m[1], id: +m[2], src: m[3], natural: +m[4], armor: +m[5], potion: +m[6], total: +m[7], piercing: +m[8], wear: +m[9], line: line.trim() } : null;
};
const dmgs = (t) => t.split('\n').filter((l) => /\[DamageLog\] dmg /.test(l)).map(parseDmg).filter(Boolean);
const prots = (t) => t.split('\n').filter((l) => /\[DamageLog\] prot /.test(l)).map(parseProt).filter(Boolean);

/* 命令通道 = bot 聊天（op 端点）。
 * RCON 在本服务端不可用：1.12 RConThreadClient 对首个之后的包直接关连接
 * （实测 run/logs/latest.log 记 "Exception whilst parsing RCON input"，:56），
 * 故所有命令一律走 op 玩家聊天（与 ad7-smoke.js 同一条已验证通道）。 */
let atk = null;   // 打手 bot（IIFE 里登录后赋值），cmd() 只依赖它
const cmd = async (c) => {
  if (!atk) throw new Error('bot 尚未登录');
  atk.chat(c.startsWith(String.fromCharCode(47)) ? c : String.fromCharCode(47) + c);
  await sleep(140);
};

const ARMOR_SLOT = { head: 'slot.armor.head', chest: 'slot.armor.chest', legs: 'slot.armor.legs', feet: 'slot.armor.feet' };
const REPORT = {};
try { Object.assign(REPORT, JSON.parse(fs.readFileSync(OUT, 'utf8'))); } catch (e) { /* 首跑无档 */ }

function save() {
  let prev = {};
  try { prev = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* 首跑 */ }
  fs.writeFileSync(OUT, JSON.stringify(Object.assign(prev, REPORT), null, 2), 'utf8');
}

(async () => {
  const argv = process.argv.slice(2);
  const phases = argv.filter((a) => !a.startsWith('--') && !/^\d+$/.test(a));
  const hitsArg = argv.indexOf('--hits');
  const HITS = hitsArg >= 0 ? Number(argv[hitsArg + 1]) : 200;
  const run = (p) => phases.includes('all') || phases.includes(p);
  if (phases.length === 0) { console.error('usage: node ad7-fight.js [cal|w4|w5|w6|w7|w8|all] [--hits N]'); process.exit(2); }

  // 前置自检：判定通道必须开
  let cfg = '';
  try { cfg = fs.readFileSync(CFG, 'utf8'); } catch (e) { /* 让下面的报错说清楚 */ }
  if (!/damageDebugLog\s*=\s*true/.test(cfg)) {
    console.error('[ABORT] ' + CFG + ' 里 damageDebugLog 不是 true —— W4~W8 全判据依赖 [DamageLog]，先改配置并重启');
    process.exit(2);
  }
  if (!fs.existsSync(LOG)) { console.error('[ABORT] 日志不存在：' + LOG + '（可用 AD7_LOG 覆盖）'); process.exit(2); }

  atk = await createHarnBot({ host: '127.0.0.1', port: 25565, username: ATK });
  const tgt = await createHarnBot({ host: '127.0.0.1', port: 25565, username: TGT });
  for (const b of [atk, tgt]) {
    for (let i = 0; i < 40; i++) { if (b.entity && b.entity.position) break; await sleep(500); }
  }
  await sleep(2000);
  say('bots up:', ATK, atk.entity && atk.entity.position.toString(), '|', TGT, tgt.entity && tgt.entity.position.toString());

  /* ---------- 场景原语 ---------- */
  await cmd('gamerule doMobSpawning false');
  await cmd('gamerule doDaylightCycle false');
  await cmd('gamerule keepInventory true');
  await cmd('gamerule naturalRegeneration false');
  await cmd('gamerule doFireTick false');
  await cmd('difficulty 2');            // normal：mob→player 不缩放
  await cmd('time set 1000');
  // 就地搭台：地板 = 打手脚下那层，上方两格清空
  BASE = {
    x: Math.floor(atk.entity.position.x),
    y: Math.floor(atk.entity.position.y),
    z: Math.floor(atk.entity.position.z),
  };
  await cmd(`fill ${BASE.x - 5} ${BASE.y - 1} ${BASE.z - 5} ${BASE.x + 5} ${BASE.y - 1} ${BASE.z + 5} minecraft:stone`);
  await cmd(`fill ${BASE.x - 5} ${BASE.y} ${BASE.z - 5} ${BASE.x + 5} ${BASE.y + 2} ${BASE.z + 5} minecraft:air`);
  TGT_POS = [BASE.x + 0.5, BASE.y, BASE.z + 0.5];
  ATK_POS = [BASE.x + 2.2, BASE.y, BASE.z + 0.5];
  say(`arena base=${BASE.x},${BASE.y},${BASE.z} tgt=${TGT_POS.join(',')} atk=${ATK_POS.join(',')}`);
  for (const n of [ATK, TGT]) { await cmd(`etest level 40 ${n}`, 8000); await cmd(`gamemode 0 ${n}`, 8000); }

  const heal = async () => { await cmd(`etest health 20 ${TGT}`, 8000); };
  const clearFx = async () => { for (const n of [ATK, TGT]) await cmd(`effect ${n} clear`, 8000); };
  const place = async () => {
    await cmd(`tp ${TGT} ${TGT_POS.join(' ')}`, 8000);
    await cmd(`tp ${ATK} ${ATK_POS.join(' ')}`, 8000);
    await sleep(1400);
    // 落地自检：任一 bot 掉出脚高 → 台子没搭住，直接失败（否则会拿 src=fall 当判据）
    for (const [n, b] of [[ATK, atk], [TGT, tgt]]) {
      const y = b.entity && b.entity.position ? b.entity.position.y : NaN;
      if (!(Math.abs(y - BASE.y) < 0.6)) {
        throw new Error(`${n} 没站在台上：y=${y} 期望 ${BASE.y}（台子在 ${BASE.x},${BASE.y - 1},${BASE.z}）`);
      }
    }
  };
  const weapon = async (item, unbreakable) => {
    await cmd(`replaceitem entity ${ATK} slot.weapon.mainhand ${item} 1 0${unbreakable ? ' {Unbreakable:1b}' : ''}`, 8000);
  };
  const CUR = { item: null, pierce: 0, unbreakable: false };
  const armWeapon = async (item, pierce, unbreakable) => {
    CUR.item = item; CUR.pierce = pierce; CUR.unbreakable = !!unbreakable;
    await weapon(item, unbreakable);
    await piercing(pierce);
  };
  const piercing = async (level) => {
    if (level <= 0) return; // p=0 = 重新 replaceitem 拿到干净 NBT
    const r = await cmd(`etest enchant mainhand ${level} piercing ${ATK}`, 8000);
    if (r) say('   enchant:', r.slice(0, 90));
  };
  const armor = async (set, unbreakable, full) => {
    const tag = unbreakable ? ' {Unbreakable:1b}' : '';
    const parts = full ? ['head', 'chest', 'legs', 'feet'] : ['chest', 'legs'];
    if (!set) {
      for (const p of parts) await cmd(`replaceitem entity ${TGT} ${ARMOR_SLOT[p]} minecraft:air`, 8000);
      return;
    }
    for (const p of parts) await cmd(`replaceitem entity ${TGT} ${ARMOR_SLOT[p]} ${set[p]} 1 0${tag}`, 8000);
  };
  const IRON = {
    head: 'minecraft:iron_helmet',
    chest: 'minecraft:iron_chestplate',
    legs: 'minecraft:iron_leggings',
    feet: 'minecraft:iron_boots',
  };
  const armorDur = () => {
    const slot = { chest: 6, legs: 7 };
    const out = {};
    for (const [p, s] of Object.entries(slot)) {
      const it = tgt.inventory.slots[s];
      out[p] = it ? { damage: it.durabilityUsed, max: it.maxDurability } : null;
    }
    return out;
  };
  let denied = 0;
  atk.on('message', (m) => { if (/etim\.reach\.deny_attack/.test(String(m))) denied++; });
  const hit = async () => {
    const e = atk.players[TGT] && atk.players[TGT].entity;
    if (!e) throw new Error('靶实体不在打手视野内（client 同步中）');
    // 击退会把靶推离 2 格以上 → 超出 R196 reach 门整发被 cancel，且后面每一发都打空。
    // 所以每发前把两边都复位（姿态/位置），再转头出手。
    if (typeof tgt.health === 'number' && tgt.health <= 0) {
      try { tgt.respawn(); } catch (err) { /* ignore */ }
      await sleep(1600);
    }
    await heal();
    // 主手自检：实测一套 40 发里主手会掉（raw 从 4.000 掉到 1.000 = 空手），
    // 掉了就重装 + 重注（replaceitem 会清 NBT，所以 piercing 要跟着补）。
    const heldName = atk.heldItem ? atk.heldItem.name : null;
    if (CUR.item && heldName !== CUR.item.split(':').pop()) {
      await weapon(CUR.item, CUR.unbreakable);
      await piercing(CUR.pierce);
    }
    await cmd(`tp ${TGT} ${TGT_POS.join(' ')}`);
    await cmd(`tp ${ATK} ${ATK_POS.join(' ')}`);
    await sleep(400);
    const target = atk.players[TGT] && atk.players[TGT].entity;
    if (!target) throw new Error('复位后靶实体仍未同步');
    // ETIM 的 reach 门按「眼→目标扩展命中盒沿视线」判定（reach/ETIMReachEvents.java:47-52）
    await atk.lookAt(target.position.offset(0, 1.4, 0), true);
    await sleep(120);
    if (atk.setControlState) atk.setControlState('sprint', false);
    atk.attack(target);
    await sleep(1250); // 满蓄力余量（剑 1.6 攻速 → 0.625s）+ 受击无敌 20 tick
  };
  /** 打 n 发并回读该窗口内的目标行 */
  const volley = async (n) => {
    await place();
    const off = logOffset();
    for (let i = 0; i < n; i++) {
      await hit();   // 每发自带 heal + 双侧复位
    }
    await sleep(600);
    const t = logSince(off);
    // 只认近战行：掉落/摔伤/火焰等污染行的 src 不是 player（W8 单独走全量）
    return {
      dmg: dmgs(t).filter((x) => x.name === TGT && x.src === 'player'),
      prot: prots(t).filter((x) => x.name === TGT && x.src === 'player'),
    };
  };
  const summarize = (arm) => ({
    n: arm.dmg.length,
    raw: arm.dmg.length ? arm.dmg[arm.dmg.length - 1].raw : null,
    total: arm.prot.length ? arm.prot[arm.prot.length - 1].total : null,
    piercing: arm.prot.length ? arm.prot[arm.prot.length - 1].piercing : null,
    wear: arm.prot.length ? arm.prot[arm.prot.length - 1].wear : null,
    finals: arm.dmg.map((d) => d.final),
    zeros: arm.dmg.filter((d) => Math.abs(d.armorOut) < 1e-9).length,
    out: arm.dmg.map((d) => d.armorOut),
    rows: arm.dmg.map((d) => d.line).concat(arm.prot.map((p) => p.line)),
  });

  /* ---------- cal：武器标定 ---------- */
  const CAL = {};
  if (run('cal')) {
    say('=== cal：武器 raw 标定 ===');
    await armor(null);
    await place();
    for (const w of WEAPONS) {
      await armWeapon(w, 0);
      const a = await volley(1);
      const row = a.dmg.length ? a.dmg[0] : null;
      CAL[w] = row ? { raw: row.raw, armorIn: row.armorIn } : null;
      say(`   ${w} → raw=${row ? f3(row.raw) : 'n/a'} armorIn=${row ? f3(row.armorIn) : 'n/a'}`);
    }
    REPORT.cal = CAL;
    save();
    // 判据一律用 armorIn（= 进入 R196 减算链的实际量）：实测 row A 的 raw=7.000 到
    // armorIn=8.400（×1.2），差来源待查；W4 要求两侧都不触 1.0 地板 → armorIn ≥ 6.5，
    // W7 要求 armorIn ∈ (4.5,5.5] 才有 48.8% / 20% / 0% 三臂。
    const inOf = (w) => (CAL[w] && CAL[w].armorIn != null ? CAL[w].armorIn : null);
    const light = Object.keys(CAL).find((w) => inOf(w) !== null && inOf(w) > 4.5 && inOf(w) <= 5.5);
    const heavy = Object.keys(CAL).find((w) => inOf(w) !== null && inOf(w) >= 6.5);
    say('   light(W7) =', light || '(无 → W7 需另选武器)', '| heavy(W4/5/6) =', heavy || '(无 → 换更强的武器)');
    REPORT.pick = { light: light || null, heavy: heavy || null };
    save();
    if (!phases.includes('all')) { finalize(); return; }
  }
  const argVal = (flag) => { const i = argv.indexOf(flag); return i >= 0 ? argv[i + 1] : null; };
  const pick = Object.assign({}, REPORT.pick, {
    light: argVal('--light') || (REPORT.pick || {}).light || null,
    heavy: argVal('--heavy') || (REPORT.pick || {}).heavy || null,
  });
  const LIGHT = pick.light;
  const HEAVY = pick.heavy;

  /* ---------- w4 / w5 / w6 ---------- */
  if (run('w4') || run('w5') || run('w6')) {
    if (!HEAVY) { say('!! 无 heavy 武器，先跑 cal'); process.exit(2); }
    say('=== w4/w5/w6：铁胸+铁护腿 total 5.500，heavy =', HEAVY, '===');
    const durBefore = {};
    const arm = async (label, p) => {
      await armWeapon(HEAVY, p, true);
      await clearFx();
      const before = armorDur();
      const a = await volley(3);
      const after = armorDur();
      const s = summarize(a);
      s.durBefore = before; s.durAfter = after;
      REPORT[label] = s;
      save();
      say(`   ${label}: n=${s.n} raw=${f3(s.raw)} total=${f3(s.total)} piercing=${f3(s.piercing)} wear=${f3(s.wear)} final=[${s.finals.map(f3).join(', ')}]`);
      return s;
    };
    // W5 裸装
    await armor(null);
    const w5a = await arm('w5_p0', 0);
    const w5b = await arm('w5_p3', 3);
    // W4/W6 铁胸+铁护腿
    await armor(IRON, false);
    const w4a = await arm('w4_p0', 0);
    const w4b = await arm('w4_p3', 3);
    const dW5 = Math.abs(w5a.finals[0] - w5b.finals[0]);
    const dW4 = w4a.finals[0] - w4b.finals[0];
    say(`   W5 判：total=${f3(w5a.total)}，p0 final=${f3(w5a.finals[0])} vs p3 final=${f3(w5b.finals[0])} → 差 ${f3(dW5)}（期望 0.000）`);
    say(`   W4 判：total=${f3(w4a.total)}，p0 final=${f3(w4a.finals[0])} vs p3 final=${f3(w4b.finals[0])} → 差 ${f3(dW4)}（期望 3.000）`);
    say(`   W6 判：wear p0=${f3(w4a.wear)} vs p3=${f3(w4b.wear)}（期望逐位相等）；胸耐久 Δ p0=${JSON.stringify(w4a.durBefore.chest)}→${JSON.stringify(w4a.durAfter.chest)} p3=${JSON.stringify(w4b.durBefore.chest)}→${JSON.stringify(w4b.durAfter.chest)}`);
    REPORT.verdict = Object.assign(REPORT.verdict || {}, {
      w4_delta: dW4, w5_delta: dW5,
      w4_ok: Math.abs(dW4 - 3.0) < 0.002,
      w5_ok: dW5 < 0.002,
      w6_ok: Math.abs(w4a.wear - w4b.wear) < 0.002,
    });
    save();
  }

  /* ---------- w7：骰 delta 压缩 ---------- */
  if (run('w7')) {
    if (!LIGHT) { say('!! 无 light 武器（raw ∈ (4.6,5.5]），先跑 cal 或手工指定'); process.exit(2); }
    say('=== w7：满铁 total 7.500，light =', LIGHT, '，每臂', HITS, '发 ===');
    await armor(IRON, true, true); // 满铁 + Unbreakable：200 发不破甲，total 恒 7.500
    for (const p of [0, 2, 3]) {
      await armWeapon(LIGHT, p, true);
      await clearFx();
      const a = await volley(HITS);
      const s = summarize(a);
      s.rate = s.n ? s.zeros / s.n : null;
      REPORT['w7_p' + p] = s;
      save();
      say(`   p=${p}: n=${s.n} raw=${f3(s.raw)} total=${f3(s.total)} 全免=${s.zeros}/${s.n} = ${(s.rate * 100).toFixed(1)}%`);
    }
    const r = (p) => (REPORT['w7_p' + p] || {}).rate || 0;
    say(`   W7 判：期望 48.8% / 20.0% / 0% → 实测 ${(r(0) * 100).toFixed(1)}% / ${(r(2) * 100).toFixed(1)}% / ${(r(3) * 100).toFixed(1)}%`);
    REPORT.verdict = Object.assign(REPORT.verdict || {}, {
      w7_p0: r(0), w7_p2: r(2), w7_p3: r(3),
      w7_ok: Math.abs(r(0) - 0.488) <= 0.07 && Math.abs(r(2) - 0.20) <= 0.06 && r(3) <= 0.004,
    });
    save();
  }

  /* ---------- w8：绝对源 ---------- */
  if (run('w8')) {
    say('=== w8：/kill（outOfWorld 绝对源） ===');
    await place();
    const off = logOffset();
    await cmd(`kill ${TGT}`, 8000);
    await sleep(2500);
    const t = logSince(off);
    const d = dmgs(t).filter((x) => x.name === TGT);
    const p = prots(t).filter((x) => x.name === TGT);
    REPORT.w8 = { dmg: d.map((x) => x.line), prot: p.map((x) => x.line), protCount: p.length, dmgCount: d.length };
    save();
    say(`   dmg 行 ${d.length} 条，prot 行 ${p.length} 条（期望 0），armorOut=${d.length ? f3(d[0].armorOut) : 'n/a'} raw=${d.length ? f3(d[0].raw) : 'n/a'}`);
    say('   starve 变体（可选，慢）：etest food 0 0 ' + TGT + ' 后等饿伤，再 grep src=starve 的 prot 行数（期望 0）');
  }

  finalize();

  function finalize() {
    save();
    say('报告：', OUT);
    say('回执请直接引用本窗口的 [DamageLog] 原始行（脚本已把它们原样收进 JSON 的 rows 字段）。');
    process.exit(0);
  }
})().catch((e) => { console.error('AD7-FIGHT ERR:', e && e.stack || e); process.exit(1); });
