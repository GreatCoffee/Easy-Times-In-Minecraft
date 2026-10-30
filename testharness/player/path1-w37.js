#!/usr/bin/env node
/**
 * path1-w37.js — 路径①收敛批（shearpath1）W-37a…j 判窗驱动
 *
 * 判据源（服务端）：
 *   `[MiningLog] tool decay face=breaking item=… block=… loss=`（decay 行；funnel :274 唯一发行点）
 *   `[BlockLog] probe … dur=x/max`（同栈耐久回读，旁证）＋ 假人 NBT 双路
 *   `[MiningLog] mine speed … str=`（记录面，条 149 C-1：只记不判）
 * 进度面：第二观察假人收 `block_break_animation`（1.12 只发非挖掘者）＋ 轮询 `testforblock … air`。
 *
 * 三相（每相一次 boot）：
 *   A1  miningReform=true  → W-37a/b/c/d/e/f/g/i
 *   A2  miningReform=true  → W-37j（**第二 boot 专为解 dedupe 键**：
 *       `logToolDecay` 的键 = face|item|block，f 与 j 同为
 *       `breaking|etim:shears_rusted_iron|double_plant` 且 loss 同为 5，
 *       同 JVM 内第二行必被 last-sig 去重吞掉 —— 换 boot 才各得一行）
 *   G   miningReform=false → W-37h
 *
 * 判值纪律（条 138 勘-1 / 条 150 M-3 / 条 151 T-9）：
 *   leaves 20／vine 20／web 10／deadbush 5／tallgrass 5／double_plant(lower) 5／
 *   double_plant(upper, isShearable=false 主链) 5／reeds 8（回归）；vanilla 剪/off 相 = 0 行 + dur 1。
 *   只写 max 出口值，不手算乘性中间项。
 *
 * 用法：node path1-w37.js [tag]
 * 冒烟：W37_ONLY=W-37a,W-37c / W37_PHASES=a1 只跑指定相。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'path1-w37';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const WORLD_NAME = 'path137';
const PORT = 25565;

/** 四钉（条 151 落码收讫版 / 主会话 W-37 任务书）。 */
const PIN = {
  head: '3bef3f6',
  dev: { bytes: 755161, sha: '2B8FDFE4DBE3F2820525E5FAB38184B626CD8BFEF98689318298A92DF2A1EF75' },
  rel: { bytes: 770940, sha: '98BAEF770AA4B57B23F7A55B6A8D63EE13EA82569531129B0CB370E6AC49E471' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** 判点相对几何：平台 = 假人落点列（dy-1 起），目标块列 = (bx+2, ·, bz)。 */
const OFF_X = 2;

/**
 * A1 相（miningReform=true）。逐点 fresh `item×block` 键（条 140 C-1）。
 * arena：'plain' 素土｜'sand' 沙底｜'reeds' 沙+石圈水盆｜'vine' 石柱附着面｜'double' 双联高株。
 * dy：判点行相对列基（double_plant upper = +1）。
 * expect.dur = null ⇒ 现场定（只记实值）；speed 一律 'record'（条 149 C-1 不判）。
 */
const POINTS_A1 = [
  { id: 'W-37a', item: 'etim:shears_rusted_iron', block: 'minecraft:leaves', meta: 0, arena: 'plain',
    expect: { rows: 1, loss: 20, dur: 20, deny: 0 },
    note: '本批主证：锈剪 × 树叶（IShearable 分流 :108 换算式 ⇒ loss=20，改前 durΔ=1）' },
  { id: 'W-37b', item: 'etim:shears_rusted_iron', block: 'minecraft:vine', meta: 2, arena: 'vine',
    expect: { rows: 1, loss: 20, dur: 20, deny: 0 },
    note: '锈剪 × 藤蔓（表行 0.2 ⇒ 20；meta 2 = WEST 附着于 x-1 石柱）' },
  { id: 'W-37c', item: 'etim:shears_rusted_iron', block: 'minecraft:web', meta: 0, arena: 'plain',
    expect: { rows: 1, loss: 10, dur: 10, deny: 0 },
    note: '锈剪 × 蛛网（表行 :86 0.1 接管，1.12 原生 4.0 被压 ⇒ 10）' },
  { id: 'W-37d', item: 'etim:shears_rusted_iron', block: 'minecraft:deadbush', meta: 0, arena: 'sand',
    expect: { rows: 1, loss: 5, dur: 5, deny: 0 },
    note: '锈剪 × 枯灌木（沙底；表行 0.02 ⇒ floor 5）' },
  { id: 'W-37e', item: 'etim:shears_rusted_iron', block: 'minecraft:tallgrass', meta: 1, arena: 'plain',
    expect: { rows: 1, loss: 5, dur: 5, deny: 0 },
    note: '锈剪 × 高草 meta 1（表行 0.02 ⇒ 5）' },
  { id: 'W-37f', item: 'etim:shears_rusted_iron', block: 'minecraft:double_plant', meta: 2, arena: 'double', dy: 0,
    expect: { rows: 1, loss: 5, dur: 5, deny: 0 },
    note: '锈剪 × 双联高草 lower/GRASS（isShearable 真 ⇒ ①面；◎ 格现场定）' },
  { id: 'W-37g', item: 'minecraft:shears', block: 'minecraft:leaves', meta: 0, arena: 'plain',
    expect: { rows: 0, loss: null, dur: 1, deny: 0 },
    note: 'vanilla 剪零扰面：原版剪 × 树叶（else 支原调 ⇒ 0 ETIM 行 + vanilla +1）' },
  { id: 'W-37i', item: 'etim:shears_rusted_iron', block: 'minecraft:reeds', meta: 0, arena: 'reeds',
    expect: { rows: 1, loss: 8, dur: 8, deny: 0 },
    note: '回归：锈剪 × 甘蔗（W-36a 同值 loss=8 / dur 8；onBlockDestroyed 主链＋第一 redirect）' },
];

/** A2 相（第二 boot，专解 dedupe 键：与 W-37f 同 item×block）。 */
const POINTS_A2 = [
  { id: 'W-37j', item: 'etim:shears_rusted_iron', block: 'minecraft:double_plant', meta: 10, arena: 'double', dy: 1,
    expect: { rows: 1, loss: 5, dur: 5, deny: 0 },
    note: 'isShearable=false 形（upper half）⇒ onBlockStartBreak return false ⇒ 主链 onBlockDestroyed ⇒ funnel 建行 loss=5' },
];

/** G 相（miningReform=false）。 */
const POINTS_G = [
  { id: 'W-37h', item: 'etim:shears_rusted_iron', block: 'minecraft:leaves', meta: 0, arena: 'plain',
    expect: { rows: 0, loss: null, dur: 1, deny: 0 },
    note: 'off 相：锈剪 × 树叶（!miningReform 原调 ⇒ 0 ETIM 行 + vanilla +1）' },
];

const ONLY = (process.env.W37_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const PHASES_ONLY = (process.env.W37_PHASES || '').split(',').map((s) => s.trim()).filter(Boolean);
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);
const wantPhase = (k) => PHASES_ONLY.length === 0 || PHASES_ONLY.includes(k);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]:\s*/, '');

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

/** 素土摆场（leaves / web / tallgrass）。 */
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

/** 沙底摆场（deadbush）。 */
async function placeSand(srv, rec, BX, BY, BZ, p) {
  const SY = BY - 1;
  srv.send(`setblock ${BX} ${SY} ${BZ} minecraft:air 0`);
  await sleep(120);
  const supFrom = srv.all.length;
  srv.send(`setblock ${BX} ${SY} ${BZ} minecraft:sand 0`);
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

/** 藤蔓摆场：x-1 石柱做附着面，判点格 meta 2（WEST=true ⇔ 附着于 x-1）。 */
async function placeVine(srv, rec, BX, BY, BZ, p) {
  const steps = [
    `setblock ${BX} ${BY - 1} ${BZ} minecraft:dirt 0`,
    `setblock ${BX + 1} ${BY - 1} ${BZ} minecraft:dirt 0`,
    `setblock ${BX} ${BY} ${BZ} minecraft:air 0`,
    `setblock ${BX + 1} ${BY} ${BZ} minecraft:stone 0`,
  ];
  for (const s of steps) { srv.send(s); await sleep(110); }
  await sleep(300);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(500);
  rec.blockPresent = await testBlock(srv, BX, BY, BZ, `${p.block} ${p.meta}`);
  rec.anchorLine = await testBlock(srv, BX + 1, BY, BZ, 'minecraft:stone 0');
}

/** 双联高株摆场：lower meta 2（GRASS）＋ upper meta 10（8|2）。 */
async function placeDouble(srv, rec, BX, BY, BZ, p) {
  const steps = [
    `setblock ${BX} ${BY - 1} ${BZ} minecraft:dirt 0`,
    `setblock ${BX} ${BY + 2} ${BZ} minecraft:air 0`,
    `setblock ${BX} ${BY + 1} ${BZ} minecraft:air 0`,
    `setblock ${BX} ${BY} ${BZ} minecraft:air 0`,
  ];
  for (const s of steps) { srv.send(s); await sleep(100); }
  await sleep(250);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} 2`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(180);
  srv.send(`setblock ${BX} ${BY + 1} ${BZ} ${p.block} 10`);
  await sleep(450);
  rec.blockPresent = await testBlock(srv, BX, BY, BZ, `${p.block} 2`);
  rec.upperLine = await testBlock(srv, BX, BY + 1, BZ, `${p.block} 10`);
}

async function placeTarget(srv, rec, BX, BY, BZ, p) {
  if (p.arena === 'reeds') return placeReedsPot(srv, rec, BX, BY, BZ, p);
  if (p.arena === 'sand') return placeSand(srv, rec, BX, BY, BZ, p);
  if (p.arena === 'vine') return placeVine(srv, rec, BX, BY, BZ, p);
  if (p.arena === 'double') return placeDouble(srv, rec, BX, BY, BZ, p);
  return placePlain(srv, rec, BX, BY, BZ, p);
}

/** 破坏进度计数监听（1.12 SPacketBlockBreakProgress 只发非挖掘者；载荷 (int)(f*10)，byte 面回绕）。 */
function watchStages(bot, at) {
  const events = [];
  const t0 = Date.now();
  const handler = (packet) => {
    if (packet.location.x === at.x && packet.location.y === at.y && packet.location.z === at.z) {
      events.push({ stage: packet.destroyStage, ms: Date.now() - t0 });
    }
  };
  bot._client.on('block_break_animation', handler);
  return {
    events,
    stop: () => { try { bot._client.removeListener('block_break_animation', handler); } catch (e) { /* ignore */ } },
  };
}

function unwrapInt8(values) {
  const out = [];
  for (let i = 0; i < values.length; i++) {
    if (i === 0) { out.push(values[0]); continue; }
    const prev = out[i - 1];
    let delta = ((values[i] - (prev & 0xff)) + 128) % 256 - 128;
    if (delta < 0 && values[i] >= 0 && prev > 60) delta += 256;
    out.push(prev + delta);
  }
  return out;
}

async function digOnce(srv, bot, botName, BX, BY, BZ, p, rec, watcher, probeBlock) {
  const watch = watchStages(watcher, { x: BX, y: BY, z: BZ });
  const from = srv.all.length;
  const t0 = Date.now();
  srv.send(`etest dig ${BX} ${BY} ${BZ} ${botName}`);

  // 早探（≈+300 ms）：瞬间破 vs 渐进二分（记录面）
  await sleep(300);
  const earlyFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} ${probeBlock}`);
  const earlyLine = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, earlyFrom);
  const stillThere = !!earlyLine && RE.found.test(earlyLine);

  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  await sleep(600);

  // STOP 只布防完成态；真破要等累计 f≥1.0 —— 轮询到块消失（上限 32 s）。
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
  await sleep(200);
  watch.stop();

  const pairs = watch.events.filter((e) => e.stage >= 0);
  const seq = unwrapInt8(pairs.map((e) => e.stage));
  const firstMs = pairs.length ? pairs[0].ms : null;
  let prog10Ms = null;
  for (let i = 0; i < seq.length; i++) {
    if (seq[i] >= 10) { prog10Ms = pairs[i].ms - firstMs; break; }
  }

  return {
    from,
    digStart: ds ? stripPrefix(ds) : null,
    digStop: dp ? stripPrefix(dp) : null,
    blockGone: gone ? 'air-confirmed after ' + gonePolls + ' polls' : null,
    gone,
    goneAtMs,
    gonePolls,
    earlyPresent: stillThere,
    earlyLine: earlyLine ? stripPrefix(earlyLine) : null,
    earlyAtMs: Date.now() - t0,
    stages: watch.events.map((e) => e.stage),
    stageCount: pairs.length,
    progressMax: seq.length ? seq[seq.length - 1] : null,
    prog10Ms,
    prog10Ticks: prog10Ms === null ? null : Math.round(prog10Ms / 50),
    stageSpanMs: watch.events.length ? watch.events[watch.events.length - 1].ms - watch.events[0].ms : 0,
  };
}

async function runDigPoint(srv, bot, botName, p, geo, watcher) {
  const BX = geo.bx + OFF_X;
  const BZ = geo.bz;
  const BYP = geo.by;                 // 列基（摆场用）
  const BY = BYP + (p.dy || 0);       // 判点行
  const rec = {
    id: p.id, kind: 'dig', note: p.note, item: p.item, block: p.block, meta: p.meta,
    arena: p.arena, expect: p.expect, at: { x: BX, y: BY, z: BZ }, dy: p.dy || 0,
  };
  log(p.id, 'start', p.note);

  srv.send(`say [${p.id}] ${p.item} x ${p.block} meta=${p.meta} dy=${p.dy || 0}`);
  const hold = await holdItem(srv, botName, p.item);
  rec.holdLine = stripPrefix(hold.probe.line);
  rec.holdAttempts = hold.attempts;

  await placeTarget(srv, rec, BX, BYP, BZ, p);

  const b0 = await probeDur(srv, botName);
  const bb0 = await botDurSettled(bot);
  rec.probeBefore = b0 ? { line: stripPrefix(b0.line), held: b0.held, damage: b0.damage, max: b0.max } : null;
  rec.botBefore = bb0;

  const probeBlock = `${p.block} ${p.meta}`;
  const one = await digOnce(srv, bot, botName, BX, BY, BZ, p, rec, watcher, probeBlock);
  rec.digs = [one];
  log(p.id, 'dig#1',
    'gone=' + one.gone + '@' + one.goneAtMs + 'ms earlyPresent=' + one.earlyPresent
    + ' progressMax=' + one.progressMax + ' prog10=' + one.prog10Ms + 'ms/~' + one.prog10Ticks + 't');

  const b1 = await probeDur(srv, botName);
  const bb1 = await botDurSettled(bot);
  rec.probeAfter = b1 ? { line: stripPrefix(b1.line), held: b1.held, damage: b1.damage, max: b1.max } : null;
  rec.botAfter = bb1;

  const seg = srv.all.slice(one.from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map(stripPrefix);
  rec.speedRaw = seg.filter((l) => RE.speed.test(l)).map(stripPrefix);
  rec.denyRaw = seg.filter((l) => RE.deny.test(l)).map(stripPrefix);

  const blockPath = p.block.split(':').pop();
  rec.rows = rec.decayRaw.map((l) => {
    const m = RE.decay.exec(l);
    return { face: m[1], item: m[2], block: m[3] || null, loss: +m[4] };
  }).filter((r) => r.face === 'breaking');
  rec.speeds = rec.speedRaw.map((l) => {
    const m = RE.speed.exec(l);
    return { item: m[1], block: m[2], str: +m[3] };
  }).filter((s) => s.item === p.item && s.block === blockPath);
  rec.denies = rec.denyRaw.map((l) => {
    const m = RE.deny.exec(l);
    return { grade: +m[1], required: +m[2], item: m[3], block: m[4] };
  }).filter((d) => d.item === p.item && d.block === blockPath);

  const durDelta = b0 && b1 ? b1.damage - b0.damage : null;
  const botDelta = bb0 && bb1 ? bb1.damage - bb0.damage : null;
  rec.durDelta = durDelta;
  rec.botDelta = botDelta;

  rec.checks = {
    placed: RE.placed.test(rec.placedLine || '') && !/Unable|Cannot|not loaded/i.test(rec.placedLine || ''),
    blockPresent: RE.found.test(rec.blockPresent || ''),
    upper: p.arena === 'double' ? RE.found.test(rec.upperLine || '') : true,
    anchor: p.arena === 'vine' ? RE.found.test(rec.anchorLine || '') : true,
    water: p.arena === 'reeds' ? RE.found.test(rec.waterLine || '') : true,
    digsComplete: !!one.digStart && !!one.digStop,
    blockGone: one.gone,
    heldMatch: !!b0 && b0.held === p.item && !!b1 && b1.held === p.item,
    // dur = null ⇒ 现场定（只记实值，不作等值判）
    durDelta: p.expect.dur === null ? true : durDelta === p.expect.dur,
    botDelta: p.expect.dur === null ? true : (botDelta === null ? true : botDelta === p.expect.dur),
    rowsCount: rec.rows.length === p.expect.rows,
    rowsMatch: p.expect.rows === 0
      ? rec.rows.length === 0
      : (rec.rows.length === 1 && rec.rows[0].loss === p.expect.loss
         && rec.rows[0].item === p.item && rec.rows[0].block === blockPath),
    denyRows: rec.denies.length === p.expect.deny,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.length + ' loss=' + (rec.rows.map((r) => r.loss).join(',') || '-')
    + ' durΔ=' + durDelta + ' botΔ=' + botDelta
    + ' str=' + (rec.speeds.map((s) => s.str).join(',') || '-')
    + ' deny=' + rec.denies.length
    + ' early=' + one.earlyPresent);
  return rec;
}

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const botName = opts.bot;
  const obsName = opts.obs;
  const srv = await startServer({ root: ROOT, tag });
  const phase = { tag, bot: botName, obs: obsName, label: opts.label, key: opts.key, points: [] };
  let bot = null;
  let obs = null;
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
    phase.fmlMods = bot.fmlMods ? bot.fmlMods.map((m) => `${m.modid}@${m.version}`) : null;
    if (!phase.fmlMods) {
      try {
        const mc = require('minecraft-protocol');
        const ping = await mc.ping({ host: '127.0.0.1', port: PORT, version: '1.12.2', timeout: 8000 });
        phase.fmlMods = ping.modinfo && ping.modinfo.modList
          ? ping.modinfo.modList.map((m) => `${m.modid}@${m.version}`) : null;
      } catch (e) { phase.fmlPingError = String(e && e.message); }
    }

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
    // 观察位（z+1/z+2 列）：进度包只发非挖掘者
    srv.send(`setblock ${geo.bx} ${geo.by - 1} ${geo.bz + 1} minecraft:dirt 0`);
    srv.send(`setblock ${geo.bx} ${geo.by - 1} ${geo.bz + 2} minecraft:dirt 0`);
    srv.send(`setblock ${geo.bx} ${geo.by} ${geo.bz + 1} minecraft:air 0`);
    srv.send(`setblock ${geo.bx} ${geo.by} ${geo.bz + 2} minecraft:air 0`);
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
    if (!grounded) throw new Error('bot not grounded on the harness platform — str 环境罚会污染判值');

    obs = await createHarnBot({ host: '127.0.0.1', port: PORT, username: obsName });
    await sleep(1800);
    srv.send(`gamemode 0 ${obsName}`);
    srv.send(`tp ${obsName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 2.5}`);
    await sleep(1600);
    const o1 = obs.entity.position;
    phase.observer = { x: +o1.x.toFixed(2), y: +o1.y.toFixed(2), z: +o1.z.toFixed(2) };
    phase.observerOk = Math.abs(o1.y - geo.by) < 0.7 && Math.abs(o1.z - (geo.bz + 2.5)) < 0.9;
    log('setup', `observer=(${phase.observer.x},${phase.observer.y},${phase.observer.z}) ok=${phase.observerOk}`);

    for (const p of points) {
      let rec;
      try {
        rec = await runDigPoint(srv, bot, botName, p, geo, obs);
      } catch (e) {
        rec = { id: p.id, fatal: e && e.stack ? e.stack : String(e), pass: false };
        log(p.id, 'FATAL', rec.fatal);
      }
      phase.points.push(rec);
    }
    phase.decayAll = srv.all.filter((l) => RE.decay.test(l)).map(stripPrefix);
  } catch (e) {
    phase.fatal = e && e.stack ? e.stack : String(e);
    log(tag, 'PHASE FATAL', phase.fatal);
  } finally {
    try { if (obs) obs.quit(); } catch (e) { /* ignore */ }
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    phase.stop = await srv.stop();
    phase.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    try { fs.copyFileSync(RUNLOG, path.join(OUT, tag + '-server-latest.log')); } catch (e) {
      phase.logSnapshotError = String(e && e.message);
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

  ev.cfgEditA = editConfig((t) => {
    if (!/B:blockDebugLog=false/.test(t)) throw new Error('cfg has no B:blockDebugLog=false');
    return t.replace('B:blockDebugLog=false', 'B:blockDebugLog=true');
  });
  log('config', `phase A1 cfg edit: blockDebugLog=true (${ev.cfgEditA.bytes} B ${ev.cfgEditA.sha})`);

  const pointsA1 = wantPhase('a1') ? pick(POINTS_A1) : [];
  const pointsA2 = wantPhase('a2') ? pick(POINTS_A2) : [];
  const pointsG = wantPhase('g') ? pick(POINTS_G) : [];

  let restoreOk = false;
  try {
    if (pointsA1.length) {
      await runPhase({ key: 'a1', tag: TAG + '-a1', bot: 'ETIM_W37A1', obs: 'ETIM_W37OBS1',
        label: 'A1 (miningReform=true)' }, pointsA1, ev);
    }
    if (pointsA2.length) {
      // 第二 boot：dedupe 键（breaking|item|double_plant）在 A1 已记 5，
      // 同 JVM 内 W-37j 同值必被吞行 ⇒ 必须新 JVM。
      await runPhase({ key: 'a2', tag: TAG + '-a2', bot: 'ETIM_W37A2', obs: 'ETIM_W37OBS2',
        label: 'A2 (miningReform=true, 第二 boot 解 dedupe 键)' }, pointsA2, ev);
    }
    if (pointsG.length) {
      ev.cfgEditG = editConfig((t) => {
        if (!/B:miningReform=true/.test(t)) throw new Error('cfg has no B:miningReform=true');
        return t.replace('B:miningReform=true', 'B:miningReform=false');
      });
      log('config', `phase G cfg edit: miningReform=false (${ev.cfgEditG.bytes} B ${ev.cfgEditG.sha})`);
      await runPhase({ key: 'g', tag: TAG + '-g', bot: 'ETIM_W37G', obs: 'ETIM_W37OBS3',
        label: 'G (miningReform=false)' }, pointsG, ev);
    }
  } finally {
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = {
      bytes: cfgAfter.length, sha: sha256(cfgAfter),
      identical: sha256(cfgAfter) === PIN.cfg.sha && cfgAfter.length === PIN.cfg.bytes,
    };
    ev.propsRestored = {
      bytes: propsAfter.length, sha: sha256(propsAfter),
      identical: sha256(propsAfter) === PIN.props.sha && propsAfter.length === PIN.props.bytes,
    };
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

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = pointsA1.length + pointsA2.length + pointsG.length;
  ev.verdict = (allPoints.length === expectPoints
      && allPoints.every((p) => p.pass)
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
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
