/**
 * ad10s-run.js — AD-10+SH 验证窗判点驱动（会话七自研工装）
 *
 * 判据正本：playground/audit/ad10-对照报告.md §13（W1~W14）+ ad10-终审回执.md §四/§五。
 * 判据通道：只有 [BlockLog]（八行）+ [DamageLog]（两行）；辅助 [TestLog] step= 做时序同步。
 *
 * 用法：
 *   node ad10s-run.js w1 w2 w3 w4 w5 w6 w7 w8 w9 w10 w11 w12      # 窗 A（默认配置）
 *   node ad10s-run.js w14a                                        # 窗 B（blockModel=false）
 *   node ad10s-run.js w14b                                        # 窗 C（blockDamageFactor=1.0）
 *   node ad10s-run.js w14c                                        # 窗 D（shieldWearRate=0.0）
 *   环境变量：AD10S_HITS（W8 每臂样本，默认 200）、AD10S_GAP（连击间隔 ms，默认 700）
 *
 * 源面口径（本窗实测钉住）：1.12 的 {@code DamageSource.GENERIC} 带 bypassesArmor 位，
 * /etest hurt <amount> generic 会同时跳过护甲步与减半门 → 所有护甲/格挡判点一律走
 * mob 源形（causeMobDamage）：hurt @e[type=minecraft:zombie,c=1] <amount> <player>。
 * （1.12 选择器是 c=1，不是 1.13 才有的 limit=1。）
 */
'use strict';
const L = require('./ad10s-lib');
const { createHarnBot } = require('./fmlbot');

const P = process.env.AD10S_P || 'ETIM_Harn01';
const HITS = Number(process.env.AD10S_HITS || 200);
const GAP = Number(process.env.AD10S_GAP || 700);   // 受击无敌 20 tick 的差额门 → ≥11 tick
const MOB = '@e[type=minecraft:zombie,c=1]';

const phases = process.argv.slice(2);
const run = (p) => phases.includes(p);
if (phases.length === 0) {
  console.error('usage: node ad10s-run.js w1..w12 | w14a | w14b | w14c');
  process.exit(2);
}

const say = L.say;
const cmd = (c) => L.rcon(c);
const rep = L.loadReport();

let bot = null;
let lastHurtAt = 0;

// ---------------- 命令面 ----------------

/** 排队的 /etest（TestDriver schedule，下一 tick 执行）——等 TestLog step 行做同步。 */
async function etest(label, args, timeout = 5000) {
  const off = L.logOffset();
  await cmd('etest ' + args);
  const line = await L.waitLog(new RegExp('\\[TestLog\\] step=' + label + '\\b'), off, timeout);
  return { off, line, text: L.logSince(off) };
}

/** 同步执行的 /etest hold（直接写背包） */
async function hold(item) {
  const off = L.logOffset();
  await cmd(`etest hold ${item} ${P}`);
  await L.sleep(220);
  return L.logSince(off);
}

/** 同步执行的 /etest blockprobe（carrier/action/state/probe dur/probe cfg 五面） */
async function probe() {
  const off = L.logOffset();
  await cmd(`etest blockprobe ${P}`);
  await L.sleep(320);
  return L.logSince(off);
}

const release = async () => { await etest('release', `release ${P}`); await L.sleep(120); };
const useitem = async () => { const r = await etest('useitem', `useitem ${P}`); await L.sleep(120); return r; };
const heal = async () => { await cmd(`etest health 20 ${P}`); await L.sleep(130); };

/** hurt 单发（mob 源形）；带 ≥GAP 的连击间隔。 */
async function hurtMob(amount) {
  const wait = GAP - (Date.now() - lastHurtAt);
  if (wait > 0) await L.sleep(wait);
  const r = await etest('hurt', `hurt ${MOB} ${amount} ${P}`);
  lastHurtAt = Date.now();
  return r;
}

/** 带源字的 hurt（W10 的 fire / oow 面）。 */
async function hurtSrc(amount, src) {
  const wait = GAP - (Date.now() - lastHurtAt);
  if (wait > 0) await L.sleep(wait);
  const r = await etest('hurt', `hurt ${amount} ${src} ${P}`);
  lastHurtAt = Date.now();
  return r;
}

// ---------------- 场景 ----------------

const ARMOR = {
  head: 'minecraft:iron_helmet',
  chest: 'minecraft:iron_chestplate',
  legs: 'minecraft:iron_leggings',
  feet: 'minecraft:iron_boots',
};

/** spec: 'full' | 'none' | 数组（槽名子集） */
async function setArmor(spec, unbreakable) {
  const want = spec === 'full' ? Object.keys(ARMOR) : (Array.isArray(spec) ? spec : []);
  for (const slot of Object.keys(ARMOR)) {
    if (want.includes(slot)) {
      const tag = unbreakable ? ' 1 0 {Unbreakable:1b}' : '';
      await cmd(`replaceitem entity ${P} slot.armor.${slot} ${ARMOR[slot]}${tag}`);
    } else {
      await cmd(`replaceitem entity ${P} slot.armor.${slot} minecraft:air`);
    }
  }
  await L.sleep(220);
}

const posOf = () => {
  const p = bot.entity && bot.entity.position;
  return p ? { x: p.x, y: p.y, z: p.z } : null;
};

async function clearMobs() {
  await cmd('kill @e[type=minecraft:zombie]');
  await L.sleep(150);
}

/**
 * 蛊一只 NoAI 僵尸作伤害源（causeMobDamage）。默认落玩家身侧 +1.5x。
 * 夜里 + Fire:-1s → 不烧、不打人、不刷日志污染。
 */
async function summonMob(px, py, pz) {
  await clearMobs();
  const p = (px === undefined) ? posOf() : { x: px, y: py, z: pz };
  await cmd(`summon minecraft:zombie ${(p.x + 2.5).toFixed(2)} ${p.y.toFixed(2)} ${(p.z + 0.5).toFixed(2)} {NoAI:1b,Silent:1b,Invulnerable:1b,PersistenceRequired:1b,Fire:-1s}`);
  await L.sleep(500);
}

async function baseline() {
  await cmd('gamerule doMobSpawning false');
  await cmd('gamerule doDaylightCycle false');
  await cmd('gamerule keepInventory true');
  await cmd('gamerule naturalRegeneration false');
  await cmd('gamerule doFireTick false');
  await cmd('difficulty 2');
  await cmd('time set 18000');
  await cmd(`etest level 40 ${P}`);
  await cmd(`gamemode 0 ${P}`);
  await cmd(`effect ${P} clear`);
  await heal();
  await summonMob();
  // 暖机：吃掉登录无敌 / 首击空窗（本发不进任何相位窗口）
  await hurtMob(1);
  await heal();
  await L.sleep(600);
}

// ---------------- W1 载体 19 臂 ----------------

const W1_ARMS = [
  ['minecraft:iron_sword', true],
  ['minecraft:iron_pickaxe', true],
  ['minecraft:iron_axe', true],
  ['minecraft:iron_shovel', true],
  ['etim:sword_copper', true],
  ['etim:pickaxe_copper', true],
  ['etim:axe_copper', true],
  ['etim:battle_axe_copper', true],
  ['etim:war_hammer_copper', true],
  ['etim:shovel_copper', true],
  ['etim:scythe_copper', true],
  ['etim:dagger_copper', false],
  ['etim:knife_flint', false],
  ['etim:hatchet_copper', false],
  ['etim:mattock_copper', false],
  ['etim:hoe_copper', false],
  ['etim:shears_rusted_iron', false],
  ['minecraft:iron_hoe', false],
  ['minecraft:shears', false],
];

async function w1() {
  say('=== W1：载体 19 臂（hold → blockprobe）===');
  await release();
  const arms = [];
  for (const [item, expect] of W1_ARMS) {
    const h = await hold(item);
    const t = await probe();
    const c = L.parsers.carrier(t)[0] || null;
    const a = L.parsers.action(t)[0] || null;
    const rec = {
      item, expect,
      observed: c ? c.block : null,
      cls: c ? c.cls : null,
      action: a ? a.action : null,
      echo: c ? c.item : null,
      holdReply: (h.split('\n').find((l) => /Rcon:|Unknown|error/i.test(l)) || '').trim(),
      ok: !!c && c.block === expect && c.item === item,
      line: c ? c.line : null,
      actionLine: a ? a.line : null,
    };
    arms.push(rec);
    say(`   W1 ${item}: block=${rec.observed} 期望=${expect} action=${rec.action} ${rec.ok ? '✓' : '✗'}`);
  }
  const t = arms.filter((x) => x.expect).length;
  const f = arms.filter((x) => !x.expect).length;
  rep.w1 = {
    arms,
    trueCount: arms.filter((x) => x.observed === true).length,
    falseCount: arms.filter((x) => x.observed === false).length,
    expected: { true: t, false: f },
    ok: arms.every((x) => x.ok),
  };
  L.saveReport(rep);
  say(`W1 ${rep.w1.ok ? 'PASS' : 'FAIL'}（${rep.w1.trueCount} true / ${rep.w1.falseCount} false，期望 ${t}/${f}）`);
}

// ---------------- W2 起手与时长 ----------------

async function w2() {
  say('=== W2：起手 action=BLOCK dur=72000 + state ====');
  await release();
  await setArmor('none');
  await hold('etim:sword_copper');
  const u = await useitem();
  const start = L.parsers.start(u.text)[0] || null;
  await L.sleep(250);
  const t = await probe();
  const state = L.parsers.state(t)[0] || null;
  const action = L.parsers.action(t)[0] || null;
  const ok = !!start && start.item === 'etim:sword_copper' && start.dur === 72000 && start.count === 72000
    && start.hand === 'main'
    && !!state && state.handActive === true && state.same === true
    && state.active === 'etim:sword_copper' && state.held === 'etim:sword_copper'
    && !!action && action.action === 'BLOCK';
  rep.w2 = { start, state, action, ok };
  L.saveReport(rep);
  say(`W2 start=${start ? `dur=${start.dur} count=${start.count}` : 'n/a'} state=${state ? `handActive=${state.handActive} same=${state.same}` : 'n/a'} action=${action ? action.action : 'n/a'} → ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W3 减半生效（mob 源） ----------------

async function w3() {
  say('=== W3：满铁 + hurt @e[type=minecraft:zombie,c=1] 8（2:1 锚）===');
  await release();
  await setArmor('full', true);
  await hold('etim:sword_copper');
  await useitem();
  await summonMob();
  await heal();
  const h = await hurtMob(8);
  const block = L.parsers.block(h.text)[0] || null;
  const gate = L.parsers.gate(h.text)[0] || null;
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const ok = !!block && block.src === 'mob'
    && Math.abs(block.raw - 8) < 1e-6 && Math.abs(block.blocked - 4) < 1e-6
    && Math.abs(block.factor - 0.5) < 1e-6 && Math.abs(block.min - 1.0) < 1e-6
    && block.carrier === 'etim:sword_copper'
    && !!dmg && Math.abs(dmg.armorIn - 4) < 1e-6;
  rep.w3 = { block, gate, dmg, ok };
  L.saveReport(rep);
  say(`W3 block=${block ? `raw=${L.f3(block.raw)} blocked=${L.f3(block.blocked)} src=${block.src}` : 'n/a'}`
    + ` dmg=${dmg ? `raw=${L.f3(dmg.raw)} armorIn=${L.f3(dmg.armorIn)} final=${L.f3(dmg.final)}` : 'n/a'}`);
  say(`W3 ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W4 终值差 = 减半量 ----------------

async function w4() {
  say('=== W4：满铁 hurt 16，未挡 vs 格挡 ===');
  await release();
  await setArmor('full', true);
  await hold('etim:sword_copper');
  await heal();
  const a = await hurtMob(16);
  const aDmg = L.parsers.dmg(a.text).find((d) => d.name === P) || null;
  await heal();
  await useitem();
  const b = await hurtMob(16);
  const bBlock = L.parsers.block(b.text)[0] || null;
  const bDmg = L.parsers.dmg(b.text).find((d) => d.name === P) || null;
  const free = aDmg ? aDmg.final : null;
  const blocked = bDmg ? bDmg.final : null;
  const delta = (free !== null && blocked !== null) ? free - blocked : null;
  const ok = !!aDmg && !!bDmg && Math.abs(free - 8.5) < 1e-6 && Math.abs(blocked - 1.0) < 1e-6
    && Math.abs(delta - 7.5) < 1e-6
    && !!bBlock && Math.abs(bBlock.raw - 16) < 1e-6 && Math.abs(bBlock.blocked - 8) < 1e-6
    && Math.abs(bDmg.armorIn - 8) < 1e-6;
  rep.w4 = { freeDmg: aDmg, blockRow: bBlock, blockDmg: bDmg, delta, ok };
  L.saveReport(rep);
  say(`W4 未挡 final=${L.f3(free)} 格挡 final=${L.f3(blocked)} 差=${L.f3(delta)}（期望 8.500/1.000/7.500）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W5 无甲也生效 ----------------

async function w5() {
  say('=== W5：裸装 hurt 5 ===');
  await release();
  await setArmor('none');
  await hold('etim:sword_copper');
  await heal();
  await useitem();
  const h = await hurtMob(5);
  const block = L.parsers.block(h.text)[0] || null;
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const prot = L.parsers.prot(h.text).find((d) => d.name === P) || null;
  const ok = !!block && Math.abs(block.raw - 5) < 1e-6 && Math.abs(block.blocked - 2.5) < 1e-6
    && !!dmg && Math.abs(dmg.final - 2.5) < 1e-6
    && !!prot && Math.abs(prot.total) < 1e-9;
  rep.w5 = { block, dmg, prot, ok };
  L.saveReport(rep);
  say(`W5 block raw=${block ? L.f3(block.raw) : 'n/a'} blocked=${block ? L.f3(block.blocked) : 'n/a'}`
    + ` dmg final=${dmg ? L.f3(dmg.final) : 'n/a'}（期望 5.000→2.500）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W6 剑磨损 25×raw ----------------

async function w6() {
  say('=== W6：铜剑 hold → 读 D0 → hurt 16 一次 ===');
  await release();
  await setArmor('none');
  await hold('etim:sword_copper');
  const p0 = await probe();
  const dur0 = L.parsers.probeDur(p0)[0] || null;
  await heal();
  await useitem();
  const h = await hurtMob(16);
  const wear = L.parsers.wear(h.text)[0] || null;
  const delta = wear ? wear.durAfter - wear.durBefore : null;
  const ok = !!wear && wear.item === 'etim:sword_copper' && Math.abs(wear.rate - 1.0) < 1e-6
    && wear.decay === '50' && Math.abs(wear.raw - 16) < 1e-6 && Math.abs(wear.blocked - 8) < 1e-6
    && wear.wear === 400 && delta === 400;
  rep.w6 = { dur0, wear, delta, ok };
  L.saveReport(rep);
  say(`W6 probe dur=${dur0 ? dur0.dur : 'n/a'} wear=${wear ? `item=${wear.item} rate=${L.f3(wear.rate)} decay=${wear.decay} blocked=${L.f3(wear.blocked)} wear=${wear.wear} dur=${wear.durBefore}->${wear.durAfter}` : 'n/a'} → ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W7 护甲磨损随减半 ----------------

async function w7() {
  say('=== W7：满铁 hurt 8（D < 2A）→ prot wear=4.000 ===');
  await release();
  await setArmor('full', true);
  await hold('etim:sword_copper');
  await heal();
  await useitem();
  const h = await hurtMob(8);
  const block = L.parsers.block(h.text)[0] || null;
  const prot = L.parsers.prot(h.text).find((d) => d.name === P) || null;
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const ok = !!prot && Math.abs(prot.total - 7.5) < 1e-6 && Math.abs(prot.wear - 4.0) < 1e-6
    && !!block && Math.abs(block.blocked - 4) < 1e-6 && !!dmg && Math.abs(dmg.armorIn - 4) < 1e-6;
  rep.w7 = { block, prot, dmg, ok };
  L.saveReport(rep);
  say(`W7 total=${prot ? L.f3(prot.total) : 'n/a'} prot wear=${prot ? L.f3(prot.wear) : 'n/a'}（期望 4.000）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W8 全免骰抬升 ----------------

async function volley(n, label) {
  const off = L.logOffset();
  let refills = 0;
  for (let i = 0; i < n; i++) {
    if (i % 5 === 0) await heal();
    let landed = false;
    for (let attempt = 0; attempt < 3 && !landed; attempt++) {
      const r = await hurtMob(5);
      landed = !/NO_TARGET/.test(r.text) && L.parsers.dmg(r.text).some((d) => d.name === P);
      if (!landed) {
        refills++;
        await summonMob();
      }
    }
    if (!landed) throw new Error(label + ' 第 ' + (i + 1) + ' 发三次补蛊后仍未命中');
    if ((i + 1) % 50 === 0) say(`   ${label} ${i + 1}/${n}`);
  }
  await L.sleep(400);
  const text = L.logSince(off);
  const dmg = L.parsers.dmg(text).filter((d) => d.name === P && d.src === 'mob');
  const block = L.parsers.block(text);
  return {
    n: dmg.length,
    refills,
    zeros: L.countIf(dmg, (d) => Math.abs(d.armorOut) < 1e-9),
    rate: dmg.length ? L.countIf(dmg, (d) => Math.abs(d.armorOut) < 1e-9) / dmg.length : null,
    blockRows: block.length,
    blocked: block.length ? block[0].blocked : null,
    armorOuts: dmg.map((d) => d.armorOut),
    sampleLines: dmg.slice(0, 3).map((d) => d.line),
  };
}

async function w8() {
  say(`=== W8：满铁 hurt 5 ×${HITS} ×2 臂（未挡 / 格挡，间隔 ${GAP}ms）===`);
  await setArmor('full', true);
  // 剑必须 Unbreakable：格挡臂每击 wear=(int)(2.5×50)=125，铜剑 3200 耐只够 25 击，
  // 断剑即 use 态结束（1.12 updateActiveHand 读空栈）→ 后 175 发会退化成未挡臂。
  await cmd(`replaceitem entity ${P} slot.weapon.mainhand minecraft:iron_sword 1 0 {Unbreakable:1b}`);
  await L.sleep(250);
  await release();
  await heal();
  const free = await volley(HITS, '未挡');
  await L.sleep(600);
  await release();
  await heal();
  await useitem();
  const blk = await volley(HITS, '格挡');
  const ok = free.n === HITS && blk.n === HITS
    && Math.abs(free.rate - 0.488) <= 0.07 && Math.abs(blk.rate - 0.738) <= 0.07
    && free.blockRows === 0 && blk.blockRows === HITS;
  rep.w8 = { hits: HITS, gapMs: GAP, weapon: 'minecraft:iron_sword {Unbreakable:1b}', free, blocked: blk, ok };
  L.saveReport(rep);
  say(`W8 未挡 ${(free.rate * 100).toFixed(1)}%（期望 48.8±7）｜格挡 ${(blk.rate * 100).toFixed(1)}%（期望 73.8±7）｜block行 ${blk.blockRows}/${HITS} → ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W9 方向无关 ----------------

async function w9() {
  say('=== W9：攻击者站正后方 hurt 5 ===');
  await release();
  await setArmor('none');
  await hold('etim:sword_copper');
  // yaw=0 → 面向 +Z；后方 = -Z
  await cmd(`tp ${P} 0 4 0 0 0`);
  await L.sleep(700);
  await heal();
  await useitem();
  await summonMob(0, 4, -2.0 - 0.5);   // 落点 z=-2（helper 内 +0.5 → -2.0）
  await cmd(`tp ${P} 0 4 0 0 0`);
  await L.sleep(500);
  const h = await hurtMob(5);
  const block = L.parsers.block(h.text)[0] || null;
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const ok = !!block && block.src === 'mob' && Math.abs(block.raw - 5) < 1e-6
    && Math.abs(block.blocked - 2.5) < 1e-6
    && !!dmg && Math.abs(dmg.raw - 5) < 1e-6 && Math.abs(dmg.armorIn - 2.5) < 1e-6;
  rep.w9 = { block, dmg, ok };
  L.saveReport(rep);
  say(`W9 block=${block ? `raw=${L.f3(block.raw)} blocked=${L.f3(block.blocked)}` : 'n/a'}`
    + ` dmg raw=${dmg ? L.f3(dmg.raw) : 'n/a'} armorIn=${dmg ? L.f3(dmg.armorIn) : 'n/a'}（2:1）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W10 源门 ----------------

async function w10() {
  say('=== W10：fire / oow 源门 ===');
  await release();
  await setArmor('full', true);
  await hold('etim:sword_copper');
  await heal();
  await useitem();
  const fire = await hurtSrc(8, 'fire');
  await heal();
  const oow = await hurtSrc(8, 'oow');
  await heal();
  const pick = (t) => ({
    blocks: L.parsers.block(t),
    dmg: L.parsers.dmg(t).filter((d) => d.name === P),
  });
  const f = pick(fire.text);
  const o = pick(oow.text);
  const ok = f.blocks.length === 0 && f.dmg.length >= 1 && f.dmg[0].src === 'inFire'
    && o.blocks.length === 0 && o.dmg.length >= 1 && o.dmg[0].src === 'outOfWorld';
  rep.w10 = { fire: f, oow: o, ok };
  L.saveReport(rep);
  say(`W10 fire block行=${f.blocks.length} dmg=${f.dmg.length}（src=${f.dmg[0] && f.dmg[0].src}）`
    + ` ｜ oow block行=${o.blocks.length} dmg=${o.dmg.length}（src=${o.dmg[0] && o.dmg[0].src}）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W11 盾面 b+c ----------------

async function w11() {
  say('=== W11：盾 hold → useitem → hurt 16（全免段关闭）===');
  await release();
  await setArmor('full', true);
  await hold('minecraft:shield');
  await heal();
  await useitem();
  const h = await hurtMob(16);
  const gate = L.parsers.gate(h.text)[0] || null;
  const block = L.parsers.block(h.text)[0] || null;
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const wear = L.parsers.wear(h.text)[0] || null;
  const ok = !!gate && gate.suppressed === true && gate.active === 'minecraft:shield'
    && !!block && Math.abs(block.raw - 16) < 1e-6 && Math.abs(block.blocked - 8) < 1e-6
    && block.carrier === 'minecraft:shield'
    && !!dmg && Math.abs(dmg.raw - 16) < 1e-6 && Math.abs(dmg.armorIn - 8) < 1e-6
    && Math.abs(dmg.final - 1.0) < 1e-6;
  rep.w11 = { gate, block, dmg, wear, ok };
  L.saveReport(rep);
  say(`W11 gate=${gate ? gate.suppressed : 'n/a'} block=${block ? `${L.f3(block.raw)}/${L.f3(block.blocked)}` : 'n/a'}`
    + ` dmg raw=${dmg ? L.f3(dmg.raw) : 'n/a'} armorIn=${dmg ? L.f3(dmg.armorIn) : 'n/a'} final=${dmg ? L.f3(dmg.final) : 'n/a'} → ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W12 盾磨损 ----------------

async function w12() {
  say('=== W12：盾 336 耐，hurt 16 两次 ===');
  await release();
  await setArmor('full', true);
  await hold('minecraft:shield');
  const p0 = await probe();
  const dur0 = L.parsers.probeDur(p0)[0] || null;
  await heal();
  await useitem();
  const h1 = await hurtMob(16);
  await heal();
  const h2 = await hurtMob(16);
  const w1 = L.parsers.wear(h1.text)[0] || null;
  const w2 = L.parsers.wear(h2.text)[0] || null;
  const ok = !!w1 && !!w2 && w1.wear === 8 && w2.wear === 8
    && w1.durBefore === 0 && w1.durAfter === 8
    && w2.durBefore === 8 && w2.durAfter === 16
    && w1.decay === 'na' && w2.decay === 'na'
    && Math.abs(w1.rate - 1.0) < 1e-6;
  rep.w12 = { dur0, first: w1, second: w2, ok };
  L.saveReport(rep);
  say(`W12 首击 wear=${w1 ? w1.wear : 'n/a'} dur=${w1 ? `${w1.durBefore}->${w1.durAfter}` : 'n/a'}`
    + ` ｜次击 wear=${w2 ? w2.wear : 'n/a'} dur=${w2 ? `${w2.durBefore}->${w2.durAfter}` : 'n/a'}`
    + `（dur 列 = 已磨损值；折合剩余 336→328→320）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W6x 率表补臂（A-AD10-1：战锤 66 / 战斧 75） ----------------

async function w6x() {
  say('=== W6x：战锤 decay=66 / 战斧 decay=75（hurt 2 → blocked=1.0）===');
  await release();
  await setArmor('none');
  const arms = {};
  for (const [item, decay] of [['etim:war_hammer_copper', 66], ['etim:battle_axe_copper', 75]]) {
    await hold(item);
    await heal();
    await useitem();
    const h = await hurtMob(2);
    const wear = L.parsers.wear(h.text)[0] || null;
    const ok = !!wear && wear.item === item && wear.decay === String(decay)
      && wear.wear === decay && Math.abs(wear.blocked - 1.0) < 1e-6;
    arms[item] = { expectDecay: decay, wear, ok };
    say(`   W6x ${item}: decay=${wear ? wear.decay : 'n/a'} wear=${wear ? wear.wear : 'n/a'}（期望 decay=${decay} wear=${decay}）${ok ? '✓' : '✗'}`);
    await release();
  }
  rep.w6x = { arms, ok: Object.values(arms).every((x) => x.ok) };
  L.saveReport(rep);
  say(`W6x ${rep.w6x.ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- W14 配置边界三臂 ----------------

async function w14a() {
  say('=== W14①：blockModel=false ===');
  await release();
  await setArmor('full', true);
  await hold('etim:sword_copper');
  await heal();
  const u = await useitem();
  const starts = L.parsers.start(u.text);
  const t = await probe();
  const cfg = L.parsers.probeCfg(t)[0] || null;
  await heal();
  const h = await hurtMob(16);
  const blocks = L.parsers.block(h.text);
  const wears = L.parsers.wear(h.text);
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const ok = cfg && cfg.blockModel === false && starts.length === 0 && blocks.length === 0
    && wears.length === 0 && !!dmg && Math.abs(dmg.final - 8.5) < 1e-6;
  rep.w14a = { cfg, starts, blocks, wears, dmg, ok };
  L.saveReport(rep);
  say(`W14① cfg.blockModel=${cfg ? cfg.blockModel : 'n/a'} start行=${starts.length} block行=${blocks.length}`
    + ` final=${dmg ? L.f3(dmg.final) : 'n/a'}（期望 8.500）→ ${ok ? 'PASS' : 'FAIL'}`);
}

async function w14b() {
  say('=== W14②：blockDamageFactor=1.0 ===');
  await release();
  await setArmor('full', true);
  await hold('minecraft:diamond_sword');
  await heal();
  const a = await hurtMob(16);
  const aDmg = L.parsers.dmg(a.text).find((d) => d.name === P) || null;
  await heal();
  await useitem();
  const t = await probe();
  const cfg = L.parsers.probeCfg(t)[0] || null;
  const b = await hurtMob(16);
  const block = L.parsers.block(b.text)[0] || null;
  const wear = L.parsers.wear(b.text)[0] || null;
  const bDmg = L.parsers.dmg(b.text).find((d) => d.name === P) || null;
  const ok = cfg && Math.abs(cfg.factor - 1.0) < 1e-6 && !!block
    && Math.abs(block.raw - 16) < 1e-6 && Math.abs(block.blocked - 16) < 1e-6
    && !!wear && wear.wear > 0 && Math.abs(wear.blocked - 16) < 1e-6
    && !!aDmg && !!bDmg && Math.abs(aDmg.final - bDmg.final) < 1e-6;
  rep.w14b = { cfg, freeDmg: aDmg, block, wear, blockDmg: bDmg, ok };
  L.saveReport(rep);
  say(`W14② cfg.factor=${cfg ? L.f3(cfg.factor) : 'n/a'} blocked=${block ? L.f3(block.blocked) : 'n/a'}`
    + ` wear=${wear ? wear.wear : 'n/a'} 未挡 final=${aDmg ? L.f3(aDmg.final) : 'n/a'} 格挡 final=${bDmg ? L.f3(bDmg.final) : 'n/a'} → ${ok ? 'PASS' : 'FAIL'}`);
}

async function w14c() {
  say('=== W14③：shieldWearRate=0.0 ===');
  await release();
  await setArmor('full', true);
  await hold('minecraft:shield');
  await heal();
  await useitem();
  const t = await probe();
  const cfg = L.parsers.probeCfg(t)[0] || null;
  const h = await hurtMob(16);
  const block = L.parsers.block(h.text)[0] || null;
  const wear = L.parsers.wear(h.text)[0] || null;
  const dmg = L.parsers.dmg(h.text).find((d) => d.name === P) || null;
  const ok = cfg && Math.abs(cfg.shieldRate) < 1e-9 && !!block
    && Math.abs(block.blocked - 8) < 1e-6
    && !!wear && wear.wear === 0 && Math.abs(wear.rate) < 1e-9
    && wear.durBefore === wear.durAfter
    && !!dmg && Math.abs(dmg.final - 1.0) < 1e-6;
  rep.w14c = { cfg, block, wear, dmg, ok };
  L.saveReport(rep);
  say(`W14③ cfg.shieldRate=${cfg ? L.f3(cfg.shieldRate) : 'n/a'} blocked=${block ? L.f3(block.blocked) : 'n/a'}`
    + ` wear=${wear ? wear.wear : 'n/a'} final=${dmg ? L.f3(dmg.final) : 'n/a'}（期望 仍 1.000）→ ${ok ? 'PASS' : 'FAIL'}`);
}

// ---------------- main ----------------

(async () => {
  bot = await createHarnBot({ host: '127.0.0.1', port: 25565, username: P });
  for (let i = 0; i < 60 && !(bot.entity && bot.entity.position); i++) await L.sleep(500);
  await L.sleep(2000);
  say('bot up:', P, bot.entity && bot.entity.position.toString(), 'health=', bot.health);
  await baseline();

  const order = [
    ['w1', w1], ['w2', w2], ['w3', w3], ['w4', w4], ['w5', w5], ['w6', w6],
    ['w7', w7], ['w8', w8], ['w9', w9], ['w10', w10], ['w11', w11], ['w12', w12],
    ['w6x', w6x],
    ['w14a', w14a], ['w14b', w14b], ['w14c', w14c],
  ];
  for (const [name, fn] of order) {
    if (!run(name)) continue;
    try {
      await fn();
    } catch (e) {
      say('PHASE ERROR ' + name + ': ' + (e.stack || e.message));
      rep['err_' + name] = String(e.stack || e.message);
      L.saveReport(rep);
    }
    await L.sleep(400);
  }

  bot.quit();
  await L.sleep(800);
  say('driver done');
  process.exit(0);
})().catch((e) => { console.error('DRIVER ERR:', e.stack || e.message); process.exit(1); });
