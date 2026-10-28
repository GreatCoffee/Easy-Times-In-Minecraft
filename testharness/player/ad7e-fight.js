/**
 * ad7e-fight.js — 批 E / AD-7 真打驱动（会话七自研工装）
 *
 * 覆盖 W4/W5/W6（铁胸+铁腿 total 5.500 / 裸装）、W7（满铁 7.500 骰压缩，200 发/臂）、
 * W8（/kill 绝对源 + starve 变体）、W9（真箭 src=arrow）、W10（points=0 / maxLevel=1 两窗）。
 *
 * 判据通道：只有 [DamageLog] 两行
 *   row A  dmg target=…#id src= raw= armorIn= armorOut= absorption= final=
 *   row B  prot target=…#id src= natural= armor= potion= total= piercing= wear=
 * 命令面：RCON（run/ad7e binpatch 链）；bot 只负责出手/受击与背包读数。
 *
 * 用法：
 *   node ad7e-fight.js w456
 *   node ad7e-fight.js w7 [--hits 200]
 *   node ad7e-fight.js w8
 *   node ad7e-fight.js w9
 *   node ad7e-fight.js w10a            # 窗 B：piercingPointsPerLevel=0.0
 *   node ad7e-fight.js w10b            # 窗 C：piercingMaxLevel=1 + 旧 NBT lvl3
 */
'use strict';
const L = require('./ad7e-lib');
const { createHarnBot } = require('./fmlbot');
const { readArmor } = require('./ad7e-nbt');

const ATK = process.env.AD7E_ATK || 'ETIM_Harn01';
const TGT = process.env.AD7E_TGT || 'ETIM_Harn03';

const argv = process.argv.slice(2);
const hitsArg = argv.indexOf('--hits');
const HITS = hitsArg >= 0 ? Number(argv[hitsArg + 1]) : 200;
const phases = argv.filter((a, i) => !a.startsWith('--') && !(hitsArg >= 0 && i === hitsArg + 1));
const run = (p) => phases.includes(p);
if (phases.length === 0) { console.error('usage: node ad7e-fight.js w456|w7|w8|w9|w10a|w10b [--hits N]'); process.exit(2); }

const say = L.say;
const cmd = (c) => L.rcon(c);
const rep = L.loadReport();

const ARMOR_SLOT = { head: 'slot.armor.head', chest: 'slot.armor.chest', legs: 'slot.armor.legs', feet: 'slot.armor.feet' };
const IRON = {
  head: 'minecraft:iron_helmet',
  chest: 'minecraft:iron_chestplate',
  legs: 'minecraft:iron_leggings',
  feet: 'minecraft:iron_boots',
};

let atk = null;
let tgt = null;
let BASE = null;
let TGT_POS = null;
let ATK_POS = null;

let STAGE = null;   // { item, pierce, unbreakable, nbt }
let swingsSinceStage = 0;

async function stageWeapon(spec) {
  STAGE = spec;
  swingsSinceStage = 0;
  const tag = spec.nbt ? ' ' + spec.nbt : (spec.unbreakable ? ' {Unbreakable:1b}' : '');
  await cmd(`replaceitem entity ${ATK} slot.weapon.mainhand ${spec.item} 1 0${tag}`);
  if (spec.pierce > 0) await cmd(`etest enchant mainhand ${spec.pierce} piercing ${ATK}`);
  await L.sleep(120);
}

/** 裸 NBT 注入（W10② 用：maxLevel=1 时 /etest enchant 会被截断，只能写存档 NBT）。 */
async function stageNbt(item, nbt) {
  STAGE = { item, pierce: 0, unbreakable: false, nbt };
  swingsSinceStage = 0;
  await cmd(`replaceitem entity ${ATK} slot.weapon.mainhand ${item} 1 0 ${nbt}`);
  await L.sleep(150);
}

async function stageArmor(set, unbreakable) {
  const tag = unbreakable ? ' {Unbreakable:1b}' : '';
  const parts = set ? Object.keys(ARMOR_SLOT) : ['head', 'chest', 'legs', 'feet'];
  for (const p of parts) {
    if (!set) { await cmd(`replaceitem entity ${TGT} ${ARMOR_SLOT[p]} minecraft:air`); continue; }
    if (!set[p]) { await cmd(`replaceitem entity ${TGT} ${ARMOR_SLOT[p]} minecraft:air`); continue; }
    await cmd(`replaceitem entity ${TGT} ${ARMOR_SLOT[p]} ${set[p]} 1 0${tag}`);
  }
  await L.sleep(150);
}

const armorDur = () => {
  const slots = { head: 5, chest: 6, legs: 7, feet: 8 };
  const out = {};
  for (const [p, s] of Object.entries(slots)) {
    const it = tgt.inventory.slots[s];
    out[p] = it && it.durabilityUsed !== undefined ? it.durabilityUsed : (it ? 0 : null);
  }
  return out;
};

/** 甲胄耐久的服务端真值：save-all 后读 playerdata（客户端 durabilityUsed 会滞后/丢更新）。 */
async function nbtArmor() {
  await cmd('save-all');
  await L.sleep(1200);
  return readArmor(TGT);
}

async function place() {
  await cmd(`tp ${TGT} ${TGT_POS.join(' ')}`);
  await cmd(`tp ${ATK} ${ATK_POS.join(' ')}`);
  await L.sleep(900);
  for (const [n, b] of [[ATK, atk], [TGT, tgt]]) {
    const y = b.entity && b.entity.position ? b.entity.position.y : NaN;
    if (!(Math.abs(y - BASE.y) < 0.7)) throw new Error(`${n} 没站在台上：y=${y} 期望 ${BASE.y}`);
  }
}

async function heal() {
  await cmd(`etest health 20 ${TGT}`);
}

async function hit() {
  if (typeof tgt.health === 'number' && tgt.health <= 0) {
    try { tgt.respawn(); } catch (e) { /* ignore */ }
    await L.sleep(1800);
  }
  await heal();
  // 主手漂移兜底：实测 replaceitem 后客户端同步会偶发丢失；每 10 发强制重装，空手立刻重装
  swingsSinceStage++;
  if (swingsSinceStage > 10 || !atk.heldItem) await stageWeapon(STAGE);
  await cmd(`tp ${TGT} ${TGT_POS.join(' ')}`);
  await cmd(`tp ${ATK} ${ATK_POS.join(' ')}`);
  await L.sleep(250);
  const ent = atk.players[TGT] && atk.players[TGT].entity;
  if (!ent) throw new Error('靶实体不在打手视野内（client 同步中）');
  await atk.lookAt(ent.position.offset(0, 1.4, 0), true);
  await L.sleep(90);
  if (atk.setControlState) atk.setControlState('sprint', false);
  atk.attack(ent);
  await L.sleep(1250);
}

/** 打到累计 n 条行（src=player 的 dmg）为止；swings 上限 n+80。 */
async function volley(n) {
  await place();
  const off = L.logOffset();
  let swings = 0;
  for (;;) {
    const d = L.parseDmg(L.logSince(off)).filter((x) => x.name === TGT && x.src === 'player');
    if (d.length >= n) break;
    if (swings >= n + 80) break;
    await hit();
    swings++;
  }
  await L.sleep(400);
  const text = L.logSince(off);
  return {
    swings,
    dmg: L.parseDmg(text).filter((x) => x.name === TGT && x.src === 'player'),
    prot: L.parseProt(text).filter((x) => x.name === TGT && x.src === 'player'),
  };
}

const summarize = (v) => ({
  n: v.dmg.length,
  nProt: v.prot.length,
  swings: v.swings,
  raw: v.dmg.length ? v.dmg[v.dmg.length - 1].raw : null,
  armorIn: v.dmg.length ? v.dmg[v.dmg.length - 1].armorIn : null,
  finals: v.dmg.map((d) => d.final),
  armorOuts: v.dmg.map((d) => d.armorOut),
  zeros: L.countIf(v.dmg, (d) => Math.abs(d.armorOut) < 1e-9),
  totals: v.prot.map((p) => p.total),
  piercings: v.prot.map((p) => p.piercing),
  wears: v.prot.map((p) => p.wear),
  dmgLines: v.dmg.map((d) => d.line),
  protLines: v.prot.map((p) => p.line),
});

(async () => {
  atk = await createHarnBot({ host: '127.0.0.1', port: 25565, username: ATK });
  tgt = await createHarnBot({ host: '127.0.0.1', port: 25565, username: TGT });
  for (const b of [atk, tgt]) {
    for (let i = 0; i < 40 && !(b.entity && b.entity.position); i++) await L.sleep(500);
  }
  await L.sleep(2200);
  say('bots up:', ATK, atk.entity && atk.entity.position.toString(), '|', TGT, tgt.entity && tgt.entity.position.toString());

  await cmd('gamerule doMobSpawning false');
  await cmd('gamerule doDaylightCycle false');
  await cmd('gamerule keepInventory true');
  await cmd('gamerule naturalRegeneration false');
  await cmd('gamerule doFireTick false');
  await cmd('difficulty 2');
  await cmd('time set 1000');

  BASE = {
    x: Math.floor(atk.entity.position.x),
    y: Math.floor(atk.entity.position.y),
    z: Math.floor(atk.entity.position.z),
  };
  await cmd(`fill ${BASE.x - 6} ${BASE.y - 1} ${BASE.z - 6} ${BASE.x + 6} ${BASE.y - 1} ${BASE.z + 6} minecraft:stone`);
  await cmd(`fill ${BASE.x - 6} ${BASE.y} ${BASE.z - 6} ${BASE.x + 6} ${BASE.y + 3} ${BASE.z + 6} minecraft:air`);
  TGT_POS = [BASE.x + 0.5, BASE.y, BASE.z + 0.5];
  ATK_POS = [BASE.x + 2.2, BASE.y, BASE.z + 0.5];
  say(`arena base=${BASE.x},${BASE.y},${BASE.z} tgt=${TGT_POS.join(',')} atk=${ATK_POS.join(',')}`);
  for (const n of [ATK, TGT]) {
    await cmd(`etest level 40 ${n}`);
    await cmd(`gamemode 0 ${n}`);
    await cmd(`effect ${n} clear`);
  }
  await heal();
  await place();

  // ---------------- W4 / W5 / W6 ----------------
  if (run('w456')) {
    say('=== W4/W5/W6：铁胸+铁腿 total 5.500 / 裸装，铁剑 ===');
    const arm = async (label, pierce, armorSet, unbreakableArmor, n) => {
      await stageWeapon({ item: 'minecraft:iron_sword', pierce, unbreakable: true });
      await stageArmor(armorSet, unbreakableArmor);
      await cmd(`effect ${TGT} clear`);
      const before = await nbtArmor();
      const v = await volley(n);
      const after = await nbtArmor();
      const s = summarize(v);
      s.durClientBefore = armorDur();
      s.durBefore = before;
      s.durAfter = after;
      s.durDelta = Object.fromEntries(['head', 'chest', 'legs', 'feet'].map((k) => [k,
        before[k] === null || after[k] === null ? null : after[k].damage - before[k].damage]));
      rep[label] = s;
      L.saveReport(rep);
      say(`   ${label}: n=${s.n} total=${L.f3(s.totals[0])} piercing=${L.f3(s.piercings[0])} wear=${L.f3(s.wears[0])}`
        + ` final=[${s.finals.map(L.f3).join(',')}] NBT耐久Δ=${JSON.stringify(s.durDelta)}`);
      return s;
    };

    await stageArmor(null, false);
    const w5p0 = await arm('w5_p0', 0, null, false, 3);
    const w5p3 = await arm('w5_p3', 3, null, false, 3);

    await stageArmor(IRON, false);
    const w4p0 = await arm('w4_p0', 0, { chest: IRON.chest, legs: IRON.legs }, false, 3);
    const w4p3 = await arm('w4_p3', 3, { chest: IRON.chest, legs: IRON.legs }, false, 3);

    // W6c：满铁四件（total 7.500）——四槽全占满时 wear 预算无处泄漏，
    // 每击落 int(min(7.5, raw=7.2))=7 点，10 击合计 70，逐位可判。
    await stageArmor(IRON, false);
    const w6cP0 = await arm('w6c_p0', 0, IRON, false, 10);
    const w6cP3 = await arm('w6c_p3', 3, IRON, false, 10);
    const sumDur = (s) => ['head', 'chest', 'legs', 'feet']
      .reduce((acc, k) => acc + (s.durDelta[k] || 0), 0);

    const w4delta = (w4p3.finals[0] ?? NaN) - (w4p0.finals[0] ?? NaN);
    const w5delta = Math.abs((w5p3.finals[0] ?? NaN) - (w5p0.finals[0] ?? NaN));
    rep.w456 = {
      w4_delta: w4delta,
      w4_ok: Math.abs(w4delta - 3.0) < 0.002 && w4p0.n >= 3 && w4p3.n >= 3,
      w5_delta: w5delta,
      w5_ok: w5delta < 0.002 && w5p0.n >= 3 && w5p3.n >= 3,
      w6a_wear_equal: w4p0.wears[0] !== undefined && w4p0.wears[0] === w4p3.wears[0],
      w6a_wear: [w4p0.wears[0], w4p3.wears[0]],
      w6a_dur: [w4p0.durDelta, w4p3.durDelta],
      w6c_wear: [w6cP0.wears[0], w6cP3.wears[0]],
      w6c_sum: [sumDur(w6cP0), sumDur(w6cP3)],
      w6c_ok: w6cP0.wears[0] === 7.2 && w6cP3.wears[0] === 7.2
        && sumDur(w6cP0) === 70 && sumDur(w6cP3) === 70,
    };
    rep.w456.ok = rep.w456.w4_ok && rep.w456.w5_ok && rep.w456.w6a_wear_equal && rep.w456.w6c_ok;
    L.saveReport(rep);
    say(`   W4 差=${L.f3(w4delta)}（期望 3.000）${rep.w456.w4_ok ? '✓' : '✗'}`);
    say(`   W5 差=${L.f3(w5delta)}（期望 0.000）${rep.w456.w5_ok ? '✓' : '✗'}`);
    say(`   W6a wear=[${rep.w456.w6a_wear.map(L.f3).join(',')}] ${rep.w456.w6a_wear_equal ? '✓' : '✗'}`
      + ` | W6c 四槽耐久合计Δ=[${rep.w456.w6c_sum.join(',')}]（期望 70/70）${rep.w456.w6c_ok ? '✓' : '✗'}`);
  }

  // ---------------- W7 ----------------
  if (run('w7')) {
    say('=== W7：满铁 total 7.500 + Unbreakable，木剑 armorIn 4.8，每臂 ' + HITS + ' 发 ===');
    await stageArmor(IRON, true);
    const res = {};
    for (const p of [0, 2, 3]) {
      await stageWeapon({ item: 'minecraft:wooden_sword', pierce: p, unbreakable: true });
      await cmd(`effect ${TGT} clear`);
      const v = await volley(HITS);
      const s = summarize(v);
      s.rate = s.n ? s.zeros / s.n : null;
      s.sampleLines = s.dmgLines.slice(0, 3).concat(s.protLines.slice(0, 3));
      delete s.dmgLines; delete s.protLines;
      res['p' + p] = s;
      rep['w7_p' + p] = s;
      L.saveReport(rep);
      say(`   p=${p}: n=${s.n} swings=${s.swings} raw=${L.f3(s.raw)} armorIn=${L.f3(s.armorIn)} total=${L.f3(s.totals[0])}`
        + ` 全免=${s.zeros}/${s.n} = ${(s.rate * 100).toFixed(1)}%`);
    }
    const r = (p) => (res['p' + p] ? res['p' + p].rate : null);
    const ok = r(0) !== null && Math.abs(r(0) - 0.488) <= 0.07
      && r(2) !== null && Math.abs(r(2) - 0.20) <= 0.06
      && r(3) !== null && r(3) <= 0.004
      && res.p0.n === HITS && res.p2.n === HITS && res.p3.n === HITS
      && res.p3.totals.every((t) => Math.abs(t - 7.5) < 1e-6);
    rep.w7 = { p0: r(0), p2: r(2), p3: r(3), hits: HITS, ok: !!ok };
    L.saveReport(rep);
    say(`   W7 判：期望 48.8%/20.0%/0% → 实测 ${(r(0) * 100).toFixed(1)}%/${(r(2) * 100).toFixed(1)}%/${(r(3) * 100).toFixed(1)}% → ${ok ? 'PASS' : 'FAIL'}`);
  }

  // ---------------- W8 ----------------
  if (run('w8')) {
    say('=== W8：/kill（outOfWorld 绝对源）+ starve 变体 ===');
    await stageArmor({ chest: IRON.chest, legs: IRON.legs }, true);
    await heal();
    await place();
    // --- /kill ---
    let off = L.logOffset();
    await cmd(`kill ${TGT}`);
    await L.sleep(2500);
    let text = L.logSince(off);
    const killDmg = L.parseDmg(text).filter((x) => x.name === TGT);
    const killProt = L.parseProt(text).filter((x) => x.name === TGT);
    rep.w8_kill = {
      dmg: killDmg.map((d) => ({ src: d.src, raw: d.raw, armorIn: d.armorIn, armorOut: d.armorOut, line: d.line })),
      protCount: killProt.length,
      protLines: killProt.map((p) => p.line),
    };
    rep.w8_kill.ok = killDmg.length >= 1
      && killDmg.every((d) => d.src === 'outOfWorld' && d.armorIn === d.raw && d.armorOut === d.raw)
      && killProt.length === 0;
    L.saveReport(rep);
    say(`   W8 /kill: dmg=${killDmg.length} prot=${killProt.length} src=${killDmg.map((d) => d.src).join(',')}`
      + ` armorIn==armorOut==raw: ${killDmg.every((d) => d.armorIn === d.raw && d.armorOut === d.raw)} → ${rep.w8_kill.ok ? 'PASS' : 'FAIL'}`);

    // --- starve 变体 ---
    if (typeof tgt.health === 'number' && tgt.health <= 0) { try { tgt.respawn(); } catch (e) { /* ignore */ } await L.sleep(2000); }
    await place();
    await heal();
    off = L.logOffset();
    await cmd(`etest food 0 0 ${TGT}`);
    say('   starve 变体：等 strike（默认节奏 25 s/次，上限 45 s）');
    const t0 = Date.now();
    let starveDmg = [];
    let foodLine = null;
    while (Date.now() - t0 < 45000) {
      const t = L.logSince(off);
      foodLine = foodLine || t.split('\n').find((l) => /\[FoodLog\].*STARVE strike/.test(l)) || null;
      starveDmg = L.parseDmg(t).filter((x) => x.name === TGT && x.src === 'starve');
      if (starveDmg.length > 0) break;
      await L.sleep(2000);
    }
    await L.sleep(300);
    text = L.logSince(off);
    const starveProt = L.parseProt(text).filter((x) => x.name === TGT && x.src === 'starve');
    rep.w8_starve = {
      foodLine: foodLine ? foodLine.trim() : null,
      dmg: starveDmg.map((d) => ({ src: d.src, raw: d.raw, armorIn: d.armorIn, armorOut: d.armorOut, line: d.line })),
      protCount: starveProt.length,
      protLines: starveProt.map((p) => p.line),
    };
    rep.w8_starve.ok = starveDmg.length >= 1
      && starveDmg.every((d) => d.armorIn === d.raw && d.armorOut === d.raw)
      && starveProt.length === 0;
    L.saveReport(rep);
    say(`   W8 starve: dmg=${starveDmg.length} prot=${starveProt.length}`
      + ` armorIn==armorOut==raw: ${starveDmg.every((d) => d.armorIn === d.raw && d.armorOut === d.raw)} → ${rep.w8_starve.ok ? 'PASS' : 'FAIL'}`);
    await cmd(`etest food 20 20 ${TGT}`);
  }

  // ---------------- W9 真箭 ----------------
  if (run('w9')) {
    say('=== W9 真箭：穿甲玩家受 src=arrow ===');
    await stageArmor({ chest: IRON.chest, legs: IRON.legs }, true);
    await heal();
    await place();
    const off = L.logOffset();
    const sx = (BASE.x + 0.5) + 9.5;
    const sy = BASE.y;
    const sz = BASE.z + 0.5;
    await cmd(`summon minecraft:skeleton ${sx} ${sy} ${sz} {HandItems:[{id:"minecraft:bow",Count:1b},{}],PersistenceRequired:1b,Silent:1b}`);
    say('   skeleton summoned at ' + [sx, sy, sz].join(','));
    let arrowDmg = [];
    let arrowProt = [];
    const t0 = Date.now();
    while (Date.now() - t0 < 25000) {
      const t = L.logSince(off);
      arrowDmg = L.parseDmg(t).filter((x) => x.name === TGT && x.src === 'arrow');
      arrowProt = L.parseProt(t).filter((x) => x.name === TGT && x.src === 'arrow');
      if (arrowDmg.length > 0) break;
      await L.sleep(1500);
    }
    let method = 'skeleton';
    if (arrowDmg.length === 0) {
      // 兜底：直接召唤一支真箭实体（同一条 arrow 伤害路径，immediate=EntityArrow）
      method = 'summoned-arrow';
      const ax = TGT_POS[0] + 4.0;
      const ay = TGT_POS[1] + 1.2;
      const az = TGT_POS[2];
      const dx = (TGT_POS[0] - ax);
      const dy = (TGT_POS[1] + 1.2 - ay);
      const dz = (TGT_POS[2] - az);
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const sp = 2.2;
      const m = [dx / dist * sp, dy / dist * sp, dz / dist * sp].map((v) => v.toFixed(4)).join(',');
      await cmd(`summon minecraft:arrow ${ax} ${ay} ${az} {Motion:[${m}],damage:4.0d}`);
      const t1 = Date.now();
      while (Date.now() - t1 < 8000) {
        const t = L.logSince(off);
        arrowDmg = L.parseDmg(t).filter((x) => x.name === TGT && x.src === 'arrow');
        arrowProt = L.parseProt(t).filter((x) => x.name === TGT && x.src === 'arrow');
        if (arrowDmg.length > 0) break;
        await L.sleep(800);
      }
    }
    await cmd('kill @e[type=minecraft:skeleton]');
    const ok = arrowDmg.length >= 1
      && arrowProt.length >= 1
      && arrowProt.every((p) => Math.abs(p.piercing) < 1e-9)
      && arrowDmg.every((d) => d.src === 'arrow');
    rep.w9_arrow = {
      method,
      dmg: arrowDmg.map((d) => ({ src: d.src, raw: d.raw, armorIn: d.armorIn, line: d.line })),
      prot: arrowProt.map((p) => ({ src: p.src, total: p.total, piercing: p.piercing, line: p.line })),
      ok,
    };
    L.saveReport(rep);
    say(`   W9 真箭(${method}): dmg=${arrowDmg.length} prot=${arrowProt.length}`
      + ` piercing=[${arrowProt.map((p) => L.f3(p.piercing)).join(',')}] → ${ok ? 'PASS' : 'FAIL'}`);
  }

  // ---------------- W10① points=0 ----------------
  if (run('w10a')) {
    say('=== W10①：piercingPointsPerLevel=0.0 ===');
    await stageArmor({ chest: IRON.chest, legs: IRON.legs }, true);
    const arm = async (label, pierce) => {
      await stageWeapon({ item: 'minecraft:iron_sword', pierce, unbreakable: true });
      await cmd(`effect ${TGT} clear`);
      const v = await volley(3);
      const s = summarize(v);
      rep[label] = s;
      L.saveReport(rep);
      say(`   ${label}: n=${s.n} total=${L.f3(s.totals[0])} piercing=${L.f3(s.piercings[0])} final=[${s.finals.map(L.f3).join(',')}]`);
      return s;
    };
    const a = await arm('w10a_p0', 0);
    const b = await arm('w10a_p3', 3);
    const same = a.finals.length > 0 && b.finals.length > 0
      && a.finals.every((v) => Math.abs(v - b.finals[0]) < 1e-6);
    rep.w10a = {
      p0final: a.finals[0], p3final: b.finals[0],
      piercing: b.piercings[0],
      ok: same && Math.abs(b.piercings[0]) < 1e-9,
    };
    L.saveReport(rep);
    say(`   W10① p0 final=${L.f3(a.finals[0])} vs p3 final=${L.f3(b.finals[0])} piercing=${L.f3(b.piercings[0])} → ${rep.w10a.ok ? 'PASS' : 'FAIL'}`);
  }

  // ---------------- W10② maxLevel=1 + 旧 NBT lvl3 ----------------
  if (run('w10b')) {
    say('=== W10②：piercingMaxLevel=1，旧 NBT lvl3 仍被读取 ===');
    await stageArmor({ chest: IRON.chest, legs: IRON.legs }, true);
    // 探针：maxLevel/windows 行（表/砧只能出 L1 的单源门）
    const off0 = L.logOffset();
    await stageNbt('minecraft:iron_sword', '{ench:[{id:13,lvl:3}]}');
    await L.sleep(200);
    await cmd(`etest enchantprobe mainhand melee ${ATK}`);
    await L.sleep(300);
    const probeText = L.logSince(off0);
    const probeRow = L.parseProbe(probeText)[0] || null;
    const windows = L.parseWindows(probeText);
    const carrier = L.parseCarrier(probeText).find((c) => c.src === 'melee') || null;
    // 真打：NBT lvl3（不重新注，避免 /etest 被 maxLevel=1 截断）
    const v = await volley(3);
    const s = summarize(v);
    rep.w10b = {
      probe: probeRow, windows, carrier,
      n: s.n, finals: s.finals, piercing: s.piercings[0], total: s.totals[0],
      dmgLines: s.dmgLines, protLines: s.protLines,
      ok: !!probeRow && probeRow.maxLevel === 1 && windows === 'L1=1/21'
        && !!carrier && carrier.level === 3 && Math.abs(carrier.pts - 3.0) < 1e-6
        && s.finals.length > 0 && Math.abs(s.finals[0] - 4.7) < 0.002
        && Math.abs(s.piercings[0] - 3.0) < 1e-6,
    };
    L.saveReport(rep);
    say(`   W10② probe maxLevel=${probeRow ? probeRow.maxLevel : 'n/a'} windows=${windows}`
      + ` carrier level=${carrier ? carrier.level : 'n/a'} pts=${carrier ? L.f3(carrier.pts) : 'n/a'}`
      + ` final=${s.finals.map(L.f3).join(',')} piercing=${L.f3(s.piercings[0])} → ${rep.w10b.ok ? 'PASS' : 'FAIL'}`);
  }

  atk.quit();
  tgt.quit();
  await L.sleep(800);
  say('fight done');
  process.exit(0);
})().catch((e) => { console.error('FIGHT ERR:', e.stack || e.message); process.exit(1); });
