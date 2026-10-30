#!/usr/bin/env node
/**
 * entitylog1-w39.js — 实体面损耗日志通道批（entitylog1）W-39a…i 判窗驱动
 *
 * 本批判据源（焦点＝行判反转）：
 *   `[MiningLog] tool decay face=shearing item=… loss=N [server]`（**无 block= 列**）
 *   —— 由 `ETIMMining.getToolDecayFromShearingEntity`（`:305-316`）经
 *   `logToolDecay("shearing", held, null, loss)`（`:314`）发行；state=null ⇒
 *   无 block 列、去重键塌成 `face|item`（`:623`）。
 *   旁证：`[BlockLog] probe … held=… dur=x/y`（blockDebugLog 须 true）＋
 *   `testfor @e[type=sheep] {Sheared:Nb}`／`entitydata`／`testfor @e[type=item]`。
 *   回归块面（h/i）另吃 `[MiningLog] tool decay face=breaking … block=… loss=`。
 *
 * 行判反转（条 157 T-7）：创造面 **恰 1 条 loss=0**（W-38f 的「0 条」口径翻面）。
 * last-sig 陷阱（条 157 / ETIMMining:631-634）：同键同值第二行被吞 ⇒ a 点只做
 *   一次成功剪毛；a(50) 与 f(0) 同键**不同值** ⇒ 再发行（本窗两行都在）。
 *
 * 两相：A  miningReform=true  → a/b/d/c/f/g/h/i
 *       G  miningReform=false → e（off 相：0 行 + durΔ1）
 *
 * 用法：node entitylog1-w39.js [tag]
 * 冒烟：W39_ONLY=W-39a,W-39f,W-39g / W39_PHASES=a
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'entitylog1-w39';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const WORLD_NAME = 'entitylog1';
const PORT = 25565;

/** 四钉（条 157 落码收讫版 / 主会话 W-39 任务书）。 */
const PIN = {
  head: '87d0edd',
  dev: { bytes: 755574, sha: 'F9DD5063D3C6F389C4F42D0E95BD89E06F5EF0A2674254F7DF97D33F467EE6CF' },
  rel: { bytes: 771368, sha: '80C0B8BD1542A4EB026B1FEA2602F5152ADEC70A6CFAFC82889DCB34EB49ABC9' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** 判点相对几何：平台 = 假人落点列（dy-1 起）；实体位 = bx+1；目标块列 = bx+2。 */
const OFF_X = 2;

/**
 * A 相。kind='shear' 吃 `face=shearing` 行 ＋ probe dur；kind='dig' 吃
 * `face=breaking` 行（回归）。
 * rows = 该点窗口内**全部** [MiningLog] tool decay 行的期望表（face/item/block/loss）；
 *   block:null ⇒ 断言行内**无** `block=` 列（shearing 面形状）。
 * expect.dur = 期望 durΔ。
 */
const POINTS_A = [
  { id: 'W-39a', kind: 'shear', entity: 'sheep', item: 'etim:shears_rusted_iron', spawn: 'adult',
    expect: { rows: [{ face: 'shearing', item: 'etim:shears_rusted_iron', block: null, loss: 50 }],
      dur: 50, shearedAfter: true },
    note: '锈剪 × 成年未剪羊（生存）：恰 1 条 face=shearing loss=50（无 block 列）＋ dur 0→50' },
  { id: 'W-39b', kind: 'shear', entity: 'sheep', item: 'etim:shears_rusted_iron', spawn: 'reuse',
    expect: { rows: [], dur: 0, shearedAfter: true },
    note: '同羊再剪：isShearable 门（getSheared）在 :73 之前 ⇒ 目标调用不可达 ⇒ 0 行 + Δ0' },
  { id: 'W-39d', kind: 'shear', entity: 'sheep', item: 'minecraft:shears', spawn: 'adult',
    expect: { rows: [], dur: 1, shearedAfter: true },
    note: 'vanilla 剪 × 成年羊：else 支原调直证 ⇒ 0 行 + dur 0→1（238 面）' },
  { id: 'W-39c', kind: 'shear', entity: 'sheep', item: 'etim:shears_rusted_iron', spawn: 'baby',
    expect: { rows: [], dur: 0, shearedAfter: false },
    note: '锈剪 × 幼羊：isChild 门 ⇒ 0 行 + Δ0（未被剪）' },
  { id: 'W-39f', kind: 'shear', entity: 'sheep', item: 'etim:shears_rusted_iron', spawn: 'adult', creative: true,
    expect: { rows: [{ face: 'shearing', item: 'etim:shears_rusted_iron', block: null, loss: 0 }],
      dur: 0, shearedAfter: true },
    note: '★反转判点：创造模式剪毛 ⇒ 恰 1 条 loss=0（0 条＝FAIL）＋ Δ0；helper 的创造门在发行前（:309-310）' },
  { id: 'W-39g', kind: 'shear', entity: 'mooshroom', item: 'etim:shears_rusted_iron', spawn: 'adult',
    expect: { rows: [], dur: 1, shearedAfter: null, cowAfter: true },
    note: '门②反证：锈剪 × 哞菇 ⇒ 不走 sheep 支（EntitySheep 门假）⇒ 0 行 + vanilla +1，且场上 mooshroom→cow' },
  { id: 'W-39h', kind: 'dig', item: 'etim:shears_rusted_iron', block: 'minecraft:reeds', meta: 0, arena: 'reeds',
    expect: { rows: [{ face: 'breaking', item: 'etim:shears_rusted_iron', block: 'reeds', loss: 8 }],
      dur: 8, deny: 0 },
    note: '回归：锈剪 × 甘蔗 ⇒ face=breaking block=reeds loss=8 ＋ durΔ8' },
  { id: 'W-39i', kind: 'dig', item: 'etim:shears_rusted_iron', block: 'minecraft:leaves', meta: 0, arena: 'plain',
    expect: { rows: [{ face: 'breaking', item: 'etim:shears_rusted_iron', block: 'leaves', loss: 20 }],
      dur: 20, deny: 0 },
    note: '回归：锈剪 × 树叶 ⇒ face=breaking block=leaves loss=20 ＋ durΔ20' },
];

/** G 相（miningReform=false）：handler 首支原调 ⇒ 零 shearing 行。 */
const POINTS_G = [
  { id: 'W-39e', kind: 'shear', entity: 'sheep', item: 'etim:shears_rusted_iron', spawn: 'adult',
    expect: { rows: [], dur: 1, shearedAfter: true },
    note: 'off 相：!miningReform 原调 ⇒ 0 行 + dur 0→1（今日行为基线）' },
];

/** 计数总账（写死判）：A 相 shearing 恰 2（50×1 + 0×1）、breaking 恰 2（8×1 + 20×1）；G 相全 0。 */
const LEDGER = {
  a: { shearing: 2, breaking: 2 },
  g: { shearing: 0, breaking: 0 },
};

const ONLY = (process.env.W39_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const PHASES_ONLY = (process.env.W39_PHASES || '').split(',').map((s) => s.trim()).filter(Boolean);
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);
const wantPhase = (k) => PHASES_ONLY.length === 0 || PHASES_ONLY.includes(k);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const RE = {
  probeDur: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(-|\d+)(?:\/(\d+))?/,
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  speed: /\[MiningLog\] mine speed item=(\S+) block=(\S+) str=([-\d.]+)/,
  deny: /\[MiningLog\] mine deny grade=(-?\d+) required=(-?\d+) item=(\S+) block=(\S+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  found: /Successfully found the block/,
  notFound: /The block at/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  // /testfor 1.12 三形（W-38 C-1）：命中每实体一行 `Found <name>`；NBT 不匹配
  // `<Entity> did not match the required data structure`；选择器空 `found nothing`。
  testforHit: /(?:\]:\s|^)Found \S/,
  testforNone: /did not match the required data structure|found nothing/,
  summonOk: /successfully summoned|Summoned new/i,
  nbtAge: /(?:^|[,{])Age:(-?\d+)/,
  nbtSheared: /(?:^|[,\{])Sheared:(\d)b/,
  nbtHealth: /(?:^|[,\{])Health:([\d.]+)f/,
  reachDeny: /reach denied: (\S+)/,
};

function pinOf(file, pin, label) {
  if (!fs.existsSync(file)) throw new Error(label + ' missing: ' + file);
  const buf = fs.readFileSync(file);
  return { file: label, bytes: buf.length, sha: sha256(buf), ok: buf.length === pin.bytes && sha256(buf) === pin.sha };
}

function snapshot(file, name) {
  const buf = fs.readFileSync(file);
  const dest = path.join(OUT, name);
  fs.writeFileSync(dest, buf);
  return { path: dest, bytes: buf.length, sha: sha256(buf) };
}

function editConfig(mutator) {
  const before = fs.readFileSync(CFG, 'utf8');
  const after = mutator(before);
  if (after === before) throw new Error('config edit produced no change');
  fs.writeFileSync(CFG, after, 'utf8');
  const buf = fs.readFileSync(CFG);
  return { bytes: buf.length, sha: sha256(buf) };
}

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}

function netstatListen(port) {
  try {
    const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    return out.split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) {
    return -1;
  }
}

function crashCount() {
  const dir = path.join(ROOT, 'run', 'crash-reports');
  try {
    return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).length;
  } catch (e) {
    return -1;
  }
}

async function probeDur(srv, botName) {
  const from = srv.all.length;
  srv.send('etest blockprobe ' + botName);
  const line = await srv.waitFor(RE.probeDur, 6000, from);
  if (!line) return null;
  const m = RE.probeDur.exec(line);
  return {
    line, player: m[1], held: m[2],
    damage: m[3] === '-' ? -1 : +m[3],
    max: m[4] === undefined ? -1 : +m[4],
  };
}

function botDur(bot) {
  const it = bot && bot.heldItem;
  if (!it) return null;
  const d = it.durabilityUsed === undefined ? null : it.durabilityUsed;
  return d === null ? null : { damage: d, name: it.name, max: it.maxDurability };
}

async function botDurSettled(bot) {
  for (let i = 0; i < 12; i++) {
    const d = botDur(bot);
    if (d) return d;
    await sleep(200);
  }
  return null;
}

/** 主手换新栈（damage 0）：body 与 blockprobe 双侧复核 held 一致。 */
async function holdItem(srv, botName, item) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const from = srv.all.length;
    srv.send(`etest hold ${item} ${botName}`);
    await sleep(700);
    const probe = await probeDur(srv, botName);
    if (probe && probe.held === item) return { probe, from, attempts: attempt + 1 };
  }
  throw new Error(`hold ${item} failed — blockprobe 未读到该物品`);
}

async function testBlock(srv, x, y, z, spec) {
  const from = srv.all.length;
  srv.send(`testforblock ${x} ${y} ${z} ${spec}`);
  const line = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, from);
  return stripPrefix(line || '');
}

/** 通用命令回读（testfor / entitydata）：抓窗口内非 harness 行。 */
async function cmdRead(srv, cmd, ms = 800) {
  const from = srv.all.length;
  srv.send(cmd);
  await sleep(ms);
  const lines = srv.all.slice(from)
    .filter((l) => !/^### \[harness\]/.test(l))
    .filter((l) => /\[Server thread\/INFO\]|\[Server thread\/WARN\]/.test(l))
    .map(stripPrefix)
    .filter((l) => l && !/^\s*$/.test(l));
  return lines;
}

async function testFor(srv, selector) {
  const lines = await cmdRead(srv, `testfor ${selector}`);
  const hits = lines.filter((l) => RE.testforHit.test(l));
  return { selector, hit: hits.length > 0, count: hits.length, raw: lines };
}

/** 实体 NBT 回读（Age / Sheared / Health；selector 按实体型）。 */
async function entityNbt(srv, selector, label) {
  const lines = await cmdRead(srv, `entitydata ${selector} {}`, 900);
  const raw = lines.join(' ');
  const age = RE.nbtAge.exec(raw);
  const sheared = RE.nbtSheared.exec(raw);
  const health = RE.nbtHealth.exec(raw);
  return {
    label,
    age: age ? +age[1] : null,
    sheared: sheared ? sheared[1] === '1' : null,
    health: health ? +health[1] : null,
    raw: raw.length > 600 ? raw.slice(0, 600) + '…' : raw,
  };
}

function idsOf(bot, name) {
  const set = new Set();
  for (const k of Object.keys(bot.entities || {})) {
    const e = bot.entities[k];
    if (e && e.name === name) set.add(e.id);
  }
  return set;
}

async function waitEntity(bot, name, beforeIds, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    for (const k of Object.keys(bot.entities || {})) {
      const e = bot.entities[k];
      if (e && e.name === name && !beforeIds.has(e.id)) return e;
    }
    await sleep(120);
  }
  return null;
}

let Vec3 = null;
try { Vec3 = require('vec3'); } catch (e) { Vec3 = null; }

/**
 * INTERACT 交互（mouse=0）。**不直接用 `bot.activateEntity`**：它 `lookAt(feet+1)`，
 * 幼羊 hitbox 被 `EntityAgeable.setScaleForAge(0.5)` 缩成 0.45×0.65
 * （`EntityAgeable:267-270`），瞄 feet+1 的射线直接从头顶掠过 ⇒ ETIM 交互触及门
 * 取消事件（`ETIMReachEvents:57-68` `etim.reach.deny_interact`）⇒ 假 FAIL 陷阱。
 * 故按体心瞄准：羊成年 0.60（高 1.3）／幼羊 0.30（高 0.65）／哞菇 0.70（高 1.4，
 * `EntityMooshroom:24`）。
 */
async function interactEntity(bot, ent, aimY) {
  const aim = ent.position.offset(0, aimY, 0);
  await bot.lookAt(aim, false);
  await sleep(150);
  const loc = Vec3 ? new Vec3(0, 0, 0) : { x: 0, y: 0, z: 0 };
  bot._client.write('use_entity', {
    target: ent.id, mouse: 0, sneaking: false, hand: 0, location: loc,
  });
  return { aim: { x: +aim.x.toFixed(2), y: +aim.y.toFixed(2), z: +aim.z.toFixed(2) }, aimY };
}

/* ===================== 实体面判点 ===================== */

function rowsOf(seg) {
  return seg.filter((l) => RE.decay.test(l)).map((l) => {
    const m = RE.decay.exec(l);
    return {
      face: m[1], item: m[2], block: m[3] || null, loss: +m[4],
      // 行内是否**显式**带 block= 列（shearing 面必须为 false）
      hasBlockCol: /\sblock=/.test(l),
    };
  });
}

function rowsEqual(got, want) {
  if (got.length !== want.length) return false;
  for (let i = 0; i < got.length; i++) {
    const g = got[i], w = want[i];
    if (g.face !== w.face || g.item !== w.item || g.loss !== w.loss) return false;
    if ((g.block || null) !== (w.block === undefined ? null : w.block)) return false;
    if (w.block === null && g.hasBlockCol) return false; // ★无 block= 列断言
  }
  return true;
}

async function runShearPoint(srv, bot, botName, p, geo, prevEntity) {
  const EX = geo.bx + 1;
  const EY = geo.by;
  const EZ = geo.bz;
  const entName = p.entity || 'sheep';
  const rec = {
    id: p.id, kind: 'shear', note: p.note, item: p.item, entity: entName, spawn: p.spawn,
    creative: !!p.creative, expect: p.expect, at: { x: EX + 0.5, y: EY, z: EZ + 0.5 },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item} x ${entName}(${p.spawn})${p.creative ? ' creative' : ''}`);

  // 清场（落毛/蘑菇/上一只实体）
  srv.send('kill @e[type=item]');
  await sleep(350);
  if (p.spawn !== 'reuse') {
    for (const t of ['sheep', 'mooshroom', 'cow']) srv.send(`kill @e[type=${t}]`);
    await sleep(800);
    rec.killLines = srv.all.slice(-8).filter((l) => /Killed|found nothing/i.test(l)).map(stripPrefix);
  }

  let ent = null;
  if (p.spawn === 'reuse') {
    ent = prevEntity;
  } else {
    const beforeIds = idsOf(bot, entName);
    const nbt = p.spawn === 'baby'
      ? '{NoAI:1b,Sheared:0b,Silent:1b,PersistenceRequired:1b,Age:-24000}'
      : '{NoAI:1b,Sheared:0b,Silent:1b,PersistenceRequired:1b,Age:0}';
    const from = srv.all.length;
    srv.send(`summon minecraft:${entName} ${EX + 0.5} ${EY} ${EZ + 0.5} ${nbt}`);
    rec.summonLine = stripPrefix((await srv.waitFor(new RegExp(RE.summonOk.source + '|Unable to summon', 'i'), 5000, from)) || '');
    rec.summonOk = RE.summonOk.test(rec.summonLine || '');
    await sleep(1000);
    ent = await waitEntity(bot, entName, beforeIds);
  }
  rec.entityFound = !!ent;
  rec.entityId = ent ? ent.id : null;
  rec.entityPos = ent ? { x: +ent.position.x.toFixed(2), y: +ent.position.y.toFixed(2), z: +ent.position.z.toFixed(2) } : null;
  if (!ent) throw new Error(entName + ' not tracked by the harness bot');

  const sel = `@e[type=${entName}]`;
  // 剪前状态
  if (entName === 'sheep') {
    rec.shearedBefore0 = await testFor(srv, sel + ' {Sheared:0b}');
    rec.shearedBefore1 = await testFor(srv, sel + ' {Sheared:1b}');
  }
  rec.nbtBefore = await entityNbt(srv, sel, 'before');

  // 逐点 fresh 栈
  const hold = await holdItem(srv, botName, p.item);
  rec.holdLine = stripPrefix(hold.probe.line);
  rec.holdAttempts = hold.attempts;

  const b0 = await probeDur(srv, botName);
  const bb0 = await botDurSettled(bot);
  rec.probeBefore = b0 ? { line: stripPrefix(b0.line), held: b0.held, damage: b0.damage, max: b0.max } : null;
  rec.botBefore = bb0;

  if (p.creative) { srv.send(`gamemode 1 ${botName}`); await sleep(900); }

  const aimY = entName === 'mooshroom' ? 0.70 : (p.spawn === 'baby' ? 0.30 : 0.60);
  const from = srv.all.length;
  try {
    rec.interact = await interactEntity(bot, ent, aimY);
    rec.interactSent = true;
  } catch (e) {
    rec.interactSent = false;
    rec.interactError = String((e && e.message) || e);
  }
  await sleep(300);
  rec.itemsAfter = await testFor(srv, '@e[type=item]');   // 旁证（落毛/蘑菇），不判
  await sleep(600);
  if (entName === 'sheep') {
    rec.shearedAfter1 = await testFor(srv, sel + ' {Sheared:1b}');
    rec.shearedAfter0 = await testFor(srv, sel + ' {Sheared:0b}');
  }
  rec.nbtAfter = await entityNbt(srv, sel, 'after');

  // W-39g：哞菇剪后 ⇒ 场上 mooshroom→cow
  if (p.expect.cowAfter) {
    rec.cowAfter = await testFor(srv, '@e[type=cow]');
    rec.mooshroomAfter = await testFor(srv, '@e[type=mooshroom]');
  }

  const b1 = await probeDur(srv, botName);
  const bb1 = await botDurSettled(bot);
  rec.probeAfter = b1 ? { line: stripPrefix(b1.line), held: b1.held, damage: b1.damage, max: b1.max } : null;
  rec.botAfter = bb1;

  if (p.creative) { srv.send(`gamemode 0 ${botName}`); await sleep(900); }

  const seg = srv.all.slice(from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.rows = rowsOf(seg);
  rec.speedRaw = seg.filter((l) => RE.speed.test(l)).map(stripPrefix);
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);

  rec.durDelta = b0 && b1 ? b1.damage - b0.damage : null;
  rec.botDelta = bb0 && bb1 ? bb1.damage - bb0.damage : null;

  rec.checks = {
    summonOrReuse: p.spawn === 'reuse' ? true : (rec.summonOk === true),
    entityFound: rec.entityFound,
    ageOk: p.spawn === 'reuse' ? true
      : (p.spawn === 'baby' ? (rec.nbtBefore.age !== null && rec.nbtBefore.age < 0)
                            : (rec.nbtBefore.age !== null && rec.nbtBefore.age >= 0)),
    heldMatch: !!b0 && b0.held === p.item && !!b1 && b1.held === p.item,
    interactSent: rec.interactSent === true,
    noReachDeny: rec.reachDenies.length === 0,
    shearedAfter: p.expect.shearedAfter === null
      ? true : (rec.shearedAfter1.hit === p.expect.shearedAfter),
    rowsMatch: rowsEqual(rec.rows, p.expect.rows),
    durDelta: rec.durDelta === p.expect.dur,
    botDelta: rec.botDelta === null ? true : rec.botDelta === p.expect.dur,
    cowAfter: p.expect.cowAfter
      ? (rec.cowAfter.hit === true && rec.mooshroomAfter.hit === false) : true,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.length + ' [' + rec.rows.map((r) => r.face + ':' + r.block + ':' + r.loss + (r.hasBlockCol ? '(blockCol)' : '')).join(' ') + ']'
    + ' durΔ=' + rec.durDelta + ' botΔ=' + rec.botDelta
    + ' sheared=' + (rec.shearedAfter1 ? rec.shearedAfter1.hit : 'na')
    + ' cow=' + (rec.cowAfter ? rec.cowAfter.hit : 'na')
    + ' reachDeny=' + rec.reachDenies.length
    + ' (dur ' + (b0 ? b0.damage : '-') + '→' + (b1 ? b1.damage : '-') + ')');
  rec.nextEntity = ent;
  return rec;
}

/* ===================== 块面回归点（W-36/W-37/W-38 同形） ===================== */

async function placePlain(srv, rec, BX, BY, BZ, p) {
  const SY = BY - 1;
  srv.send(`setblock ${BX} ${SY} ${BZ} minecraft:air 0`);
  await sleep(120);
  const supFrom = srv.all.length;
  srv.send(`setblock ${BX} ${SY} ${BZ} minecraft:dirt 0`);
  rec.supportLine = stripPrefix((await srv.waitFor(RE.placed, 5000, supFrom)) || '');
  await sleep(250);
  srv.send(`setblock ${BX} ${BY} ${BZ} minecraft:air 0`);
  await sleep(150);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(400);
  rec.blockPresent = await testBlock(srv, BX, BY, BZ, `${p.block} ${p.meta}`);
}

/** 甘蔗摆场：沙支撑 + 石圈封闭水盆（1.12 BlockReed.canPlaceBlockAt 要求下层水平面水）。 */
async function placeReedsPot(srv, rec, BX, BY, BZ, p) {
  const WX = BX - 1;
  const SY = BY - 1;
  const steps = [
    `setblock ${BX} ${SY - 1} ${BZ} minecraft:stone 0`,
    `setblock ${WX} ${SY - 1} ${BZ} minecraft:stone 0`,
    `setblock ${WX - 1} ${SY} ${BZ} minecraft:stone 0`,
    `setblock ${WX} ${SY} ${BZ - 1} minecraft:stone 0`,
    `setblock ${WX} ${SY} ${BZ + 1} minecraft:stone 0`,
    `setblock ${BX} ${SY} ${BZ} minecraft:sand 0`,
    `setblock ${BX} ${BY} ${BZ} minecraft:air 0`,
    `setblock ${BX} ${BY + 1} ${BZ} minecraft:air 0`,
    `setblock ${WX} ${BY} ${BZ} minecraft:air 0`,
    `setblock ${WX} ${SY} ${BZ} minecraft:water 0`,
  ];
  for (const s of steps) { srv.send(s); await sleep(90); }
  await sleep(400);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(500);
  rec.blockPresent = await testBlock(srv, BX, BY, BZ, `${p.block} ${p.meta}`);
  rec.waterLine = await testBlock(srv, WX, SY, BZ, 'minecraft:water 0');
}

async function placeTarget(srv, rec, BX, BY, BZ, p) {
  if (p.arena === 'reeds') return placeReedsPot(srv, rec, BX, BY, BZ, p);
  return placePlain(srv, rec, BX, BY, BZ, p);
}

/** 一次 dig：START + STOP（TestDriver 40t 布防），再轮询到 air（真破需累计 f≥1.0）。 */
async function digOnce(srv, botName, BX, BY, BZ, probeBlock) {
  const from = srv.all.length;
  const t0 = Date.now();
  srv.send(`etest dig ${BX} ${BY} ${BZ} ${botName}`);

  await sleep(300);
  const earlyFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} ${probeBlock}`);
  const earlyLine = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, earlyFrom);
  const stillThere = !!earlyLine && RE.found.test(earlyLine);

  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  await sleep(500);

  let gone = false;
  let goneAtMs = null;
  let gonePolls = 0;
  const deadline = Date.now() + 32000;
  while (Date.now() < deadline) {
    const line = await testBlock(srv, BX, BY, BZ, 'minecraft:air');
    gonePolls++;
    if (RE.found.test(line)) { gone = true; goneAtMs = Date.now() - t0; break; }
    await sleep(400);
  }
  return {
    from,
    digStart: ds ? stripPrefix(ds) : null,
    digStop: dp ? stripPrefix(dp) : null,
    blockGone: gone ? 'air-confirmed after ' + gonePolls + ' polls' : null,
    gone, goneAtMs, gonePolls,
    earlyPresent: stillThere,
    earlyLine: earlyLine ? stripPrefix(earlyLine) : null,
  };
}

async function runDigPoint(srv, bot, botName, p, geo) {
  const BX = geo.bx + OFF_X;
  const BY = geo.by + (p.dy || 0);
  const BZ = geo.bz;
  const rec = {
    id: p.id, kind: 'dig', note: p.note, item: p.item, block: p.block, meta: p.meta,
    arena: p.arena, expect: p.expect, at: { x: BX, y: BY, z: BZ },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item} x ${p.block} meta=${p.meta}`);

  srv.send('kill @e[type=sheep]');
  srv.send('kill @e[type=mooshroom]');
  srv.send('kill @e[type=cow]');
  srv.send('kill @e[type=item]');
  await sleep(700);

  const hold = await holdItem(srv, botName, p.item);
  rec.holdLine = stripPrefix(hold.probe.line);
  rec.holdAttempts = hold.attempts;

  await placeTarget(srv, rec, BX, BY, BZ, p);

  const b0 = await probeDur(srv, botName);
  const bb0 = await botDurSettled(bot);
  rec.probeBefore = b0 ? { line: stripPrefix(b0.line), held: b0.held, damage: b0.damage, max: b0.max } : null;
  rec.botBefore = bb0;

  const one = await digOnce(srv, botName, BX, BY, BZ, `${p.block} ${p.meta}`);
  rec.digs = [one];
  log(p.id, 'dig#1', 'gone=' + one.gone + '@' + one.goneAtMs + 'ms earlyPresent=' + one.earlyPresent);

  const b1 = await probeDur(srv, botName);
  const bb1 = await botDurSettled(bot);
  rec.probeAfter = b1 ? { line: stripPrefix(b1.line), held: b1.held, damage: b1.damage, max: b1.max } : null;
  rec.botAfter = bb1;

  const seg = srv.all.slice(one.from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.rows = rowsOf(seg);
  rec.speedRaw = seg.filter((l) => RE.speed.test(l)).map(stripPrefix);
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);
  const denyRaw = seg.filter((l) => RE.deny.test(l)).map(stripPrefix);
  rec.denies = denyRaw.map((l) => {
    const m = RE.deny.exec(l);
    return { grade: +m[1], required: +m[2], item: m[3], block: m[4] };
  }).filter((d) => d.item === p.item && d.block === p.block.split(':').pop());

  rec.durDelta = b0 && b1 ? b1.damage - b0.damage : null;
  rec.botDelta = bb0 && bb1 ? bb1.damage - bb0.damage : null;

  rec.checks = {
    placed: RE.placed.test(rec.placedLine || '') && !/Unable|Cannot|not loaded/i.test(rec.placedLine || ''),
    blockPresent: RE.found.test(rec.blockPresent || ''),
    water: p.arena === 'reeds' ? RE.found.test(rec.waterLine || '') : true,
    digsComplete: !!one.digStart && !!one.digStop,
    blockGone: one.gone,
    heldMatch: !!b0 && b0.held === p.item && !!b1 && b1.held === p.item,
    rowsMatch: rowsEqual(rec.rows, p.expect.rows),
    durDelta: rec.durDelta === p.expect.dur,
    botDelta: rec.botDelta === null ? true : rec.botDelta === p.expect.dur,
    noReachDeny: rec.reachDenies.length === 0,
    denyRows: rec.denies.length === p.expect.deny,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.map((r) => r.face + ':' + r.block + ':' + r.loss).join(',')
    + ' durΔ=' + rec.durDelta + ' botΔ=' + rec.botDelta
    + ' str=' + (rec.speedRaw.length ? 'yes' : 'no') + ' deny=' + rec.denies.length);
  return rec;
}

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const botName = opts.bot;
  const srv = await startServer({ root: ROOT, tag });
  const phase = { tag, bot: botName, label: opts.label, key: opts.key, points: [] };
  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = stripPrefix(done.trim());
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.extraMentions = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 5);
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: botName });
    await sleep(2200);

    // ---- 世界塑性
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('difficulty 0');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${botName}`);
    srv.send(`effect ${botName} clear`);
    srv.send(`etest food 6 6 ${botName}`);
    srv.send(`etest level 0 ${botName}`);
    await sleep(1400);

    const p0 = bot.entity.position;
    const geo = {
      bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z),
      spawn: { x: p0.x, y: p0.y, z: p0.z },
    };
    phase.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    for (const dx of [0, 1, 2]) srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz} minecraft:dirt 0`);
    for (const dx of [0, 1, 2]) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by} ${geo.bz} minecraft:air 0`);
      srv.send(`setblock ${geo.bx + dx} ${geo.by + 1} ${geo.bz} minecraft:air 0`);
      srv.send(`setblock ${geo.bx + dx} ${geo.by + 2} ${geo.bz} minecraft:air 0`);
    }
    await sleep(900);
    srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1600);
    let p1 = bot.entity.position;
    let grounded = Math.abs(p1.y - geo.by) < 0.6
      && Math.abs(p1.x - (geo.bx + 0.5)) < 0.9 && Math.abs(p1.z - (geo.bz + 0.5)) < 0.9;
    if (!grounded) {
      srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1600);
      p1 = bot.entity.position;
      grounded = Math.abs(p1.y - geo.by) < 0.6
        && Math.abs(p1.x - (geo.bx + 0.5)) < 0.9 && Math.abs(p1.z - (geo.bz + 0.5)) < 0.9;
    }
    phase.posAfterTp = { x: p1.x, y: p1.y, z: p1.z };
    phase.grounded = grounded;
    log('setup', `pos after tp=(${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}) grounded=${grounded}`);
    if (!grounded) throw new Error('bot not grounded on the harness platform');

    let prevEntity = null;
    for (const p of points) {
      let rec;
      try {
        rec = p.kind === 'dig'
          ? await runDigPoint(srv, bot, botName, p, geo)
          : await runShearPoint(srv, bot, botName, p, geo, prevEntity);
        if (rec && rec.nextEntity) { prevEntity = rec.nextEntity; delete rec.nextEntity; }
      } catch (e) {
        rec = { id: p.id, fatal: e && e.stack ? e.stack : String(e), pass: false };
        log(p.id, 'FATAL', rec.fatal);
      }
      phase.points.push(rec);
    }
    const allRows = rowsOf(srv.all);
    phase.decayAll = srv.all.filter((l) => RE.decay.test(l)).map((l) => l.trim());
    phase.rowCounts = {
      shearing: allRows.filter((r) => r.face === 'shearing').length,
      breaking: allRows.filter((r) => r.face === 'breaking').length,
      attacking: allRows.filter((r) => r.face === 'attacking').length,
      speed: srv.all.filter((l) => RE.speed.test(l)).length,
      deny: srv.all.filter((l) => RE.deny.test(l)).length,
      reachDenied: srv.all.filter((l) => RE.reachDeny.test(l)).length,
    };
    phase.shearingRows = allRows.filter((r) => r.face === 'shearing');
    log(tag, 'rowCounts', JSON.stringify(phase.rowCounts));
  } catch (e) {
    phase.fatal = e && e.stack ? e.stack : String(e);
    log(tag, 'PHASE FATAL', phase.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    phase.stop = await srv.stop();
    phase.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    try { fs.copyFileSync(RUNLOG, path.join(OUT, tag + '-server-latest.log')); } catch (e) {
      phase.logSnapshotError = String((e && e.message) || e);
    }
    ev.phases.push(phase);
  }
  return phase;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [] };

  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.cfg = pinOf(CFG, PIN.cfg, 'cfg');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  log('pin', `dev=${ev.pins.devJar.bytes}/${ev.pins.devJar.sha} ${ev.pins.devJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `rel=${ev.pins.relJar.bytes}/${ev.pins.relJar.sha} ${ev.pins.relJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `cfg=${ev.pins.cfg.bytes}/${ev.pins.cfg.sha} ${ev.pins.cfg.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `props=${ev.pins.props.bytes}/${ev.pins.props.sha} ${ev.pins.props.ok ? 'OK' : 'MISMATCH'}`);
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (fs.existsSync(path.join(ROOT, 'run', 'mods', 'etimextra-0.1.0.jar'))) {
    throw new Error('etimextra jar present in run/mods — this batch must run without it');
  }

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);

  ev.cfgSnapshot = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }
  log('config', `cfg ${ev.cfgSnapshot.bytes} B ${ev.cfgSnapshot.sha}`);
  log('config', `server.properties ${ev.propsSnapshot.bytes} B ${ev.propsSnapshot.sha}`);

  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  else propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  ev.propsWindow = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
  log('config', `level-name -> ${WORLD_NAME} / spawn-protection -> 0`);

  // 唯一翻键：blockDebugLog（probe 门）；miningDebugLog 本就 true（cfg :363），谓词不动。
  ev.cfgEditA = editConfig((t) => {
    if (!/B:blockDebugLog=false/.test(t)) throw new Error('cfg has no B:blockDebugLog=false');
    return t.replace('B:blockDebugLog=false', 'B:blockDebugLog=true');
  });
  log('config', `phase A cfg edit: blockDebugLog=true (${ev.cfgEditA.bytes} B ${ev.cfgEditA.sha})`);

  const pointsA = wantPhase('a') ? pick(POINTS_A) : [];
  const pointsG = wantPhase('g') ? pick(POINTS_G) : [];

  let restoreOk = false;
  try {
    if (pointsA.length) {
      await runPhase({ key: 'a', tag: TAG + '-a', bot: 'ETIM_W39A',
        label: 'A (miningReform=true)' }, pointsA, ev);
    }
    if (pointsG.length) {
      ev.cfgEditG = editConfig((t) => {
        if (!/B:miningReform=true/.test(t)) throw new Error('cfg has no B:miningReform=true');
        return t.replace('B:miningReform=true', 'B:miningReform=false');
      });
      log('config', `phase G cfg edit: miningReform=false (${ev.cfgEditG.bytes} B ${ev.cfgEditG.sha})`);
      await runPhase({ key: 'g', tag: TAG + '-g', bot: 'ETIM_W39G',
        label: 'G (miningReform=false)' }, pointsG, ev);
    }
  } finally {
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = { bytes: cfgAfter.length, sha: sha256(cfgAfter),
      identical: sha256(cfgAfter) === PIN.cfg.sha && cfgAfter.length === PIN.cfg.bytes };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter),
      identical: sha256(propsAfter) === PIN.props.sha && propsAfter.length === PIN.props.bytes };
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical (pin)' : 'MISMATCH'));
    log('config', 'server.properties restored ' + (ev.propsRestored.identical ? 'byte-identical (pin)' : 'MISMATCH'));
    restoreOk = ev.cfgRestored.identical && ev.propsRestored.identical;

    ev.sideRestored = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideRestored[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
      log('config', name + ' restored ' + (ev.sideRestored[name].identical ? 'byte-identical' : 'MISMATCH'));
    }
    restoreOk = restoreOk && Object.values(ev.sideRestored).every((s) => s.identical);

    const worldDir = path.join(ROOT, 'run', WORLD_NAME);
    if (fs.existsSync(worldDir)) {
      fs.rmSync(worldDir, { recursive: true, force: true });
      ev.worldDirRemoved = !fs.existsSync(worldDir);
      log('cleanup', 'world dir removed: ' + WORLD_NAME);
    }
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = {
      devJar: pinOf(DEVJAR, PIN.dev, 'dev'),
      relJar: pinOf(RELJAR, PIN.rel, 'rel'),
    };
    ev.jarUpToDate = ev.phases.length > 0
      && ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
    ev.mixinErrors = ev.phases.flatMap((p) => p.mixinErrors || []);
  }

  // 计数总账（写死判）
  ev.ledger = {};
  for (const ph of ev.phases) {
    const want = LEDGER[ph.key];
    const got = ph.rowCounts || {};
    ev.ledger[ph.key] = {
      want, got,
      ok: !!want && got.shearing === want.shearing && got.breaking === want.breaking,
    };
  }
  // 冒烟（W39_ONLY 非空）时判点被裁剪，总账只记录不判
  const ledgerOk = ONLY.length > 0
    ? ev.phases.length > 0
    : (ev.phases.length > 0 && Object.values(ev.ledger).every((l) => l.ok));
  const zeroNoise = ev.phases.every((p) => (p.rowCounts || {}).deny === 0 && (p.rowCounts || {}).reachDenied === 0);

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = pointsA.length + pointsG.length;
  ev.verdict = (allPoints.length === expectPoints
      && allPoints.every((p) => p.pass)
      && ledgerOk
      && zeroNoise
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate
      && ev.mixinErrors.length === 0) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of allPoints) log(p.id, p.pass ? 'PASS' : 'FAIL', p.checks ? JSON.stringify(p.checks) : '');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
