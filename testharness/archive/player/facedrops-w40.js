#!/usr/bin/env node
/**
 * facedrops-w40.js — ①面掉落表批（facedrops）W-40a…j 判窗驱动
 *
 * 判据（服务端日志，`blockDebugLog` 保持 false —— 本窗不用 probe 面）：
 *   1. `[MiningLog] shear drop item=<held> block=<path> drops=<reg>:<count>:<meta>[+…] [server]`
 *      （`ETIMMining.getR196ShearDrops` → `logShearDrops`；键 = item|block，
 *        sig = drops 列 ⇒ 同键同值才吞）
 *   2. `[MiningLog] tool decay face=breaking item=<held> block=<path> loss=N [server]`
 *      （funnel 行；键 = face|item|block，同键同值吞 —— c 点 0 条即阴性对照）
 *   3. dur：mineflayer `bot.heldItem.durabilityUsed`（每点 `/etest hold` 换 fresh 栈）
 *
 * 摆场纪律：目标块列 = bx+2（假人 bx+0.5 ⇒ 2.0 格，块触及 2.75 内不进拒）；
 *   破坏走 `etest dig`（START + 40t 后 STOP；硬度≥1 的块在 START 触发，
 *   web(0.1) 等在 STOP 触发 —— 判窗一律从 dig 命令前抓到 dig-stop 之后）。
 *
 * 两相：A  miningReform=true  → a…g + h（空手）+ i（创造）
 *       G  miningReform=false → j（off 相：vanilla 1× 落物 + durΔ1，零判行）
 *
 * 用法：node facedrops-w40.js [tag]
 * 冒烟：W40_ONLY=W-40a,W-40g / W40_PHASES=a
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'facedrops-w40';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const WORLD_NAME = 'facedrops';
const PORT = 25565;

/** 四钉（W-40 任务书 / 落码件 a3718a7）。 */
const PIN = {
  head: 'a3718a7',
  dev: { bytes: 756824, sha: '16E07CFA581003D712B77CF1AC3F527664E558909B7C1A8CDF8D37F15F1A8727' },
  rel: { bytes: 772626, sha: '198B5C7ED5DEBD6CEE448CC44335BC5076D629BC6182A381DC7AFF2F792E3F5D' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

const OFF_X = 2;
const SHEARS = 'etim:shears_rusted_iron';

/**
 * 判点表。stage = 摆场形状；expect.drops = 期望 drops 列（reg/count/meta），
 * expect.loss = 期望 breaking 行 loss 序列（顺序即发行顺序），expect.dur = 期望 durΔ。
 */
const POINTS_A = [
  { id: 'W-40a', item: SHEARS, block: 'minecraft:double_plant', meta: 3, stage: 'double',
    expect: { drops: [{ reg: 'minecraft:tallgrass', count: 2, meta: 2 }], loss: [5], dur: 5, upperAir: true },
    note: '锈剪 × double_plant(lower, fern)：tallgrass:2:2 + loss=5 + durΔ5 + upper 静默清除（C-1 补正首证）' },
  { id: 'W-40b', item: SHEARS, block: 'minecraft:vine', meta: 15, stage: 'vine4',
    expect: { drops: [{ reg: 'minecraft:vine', count: 4, meta: 0 }], loss: [20], dur: 20 },
    note: '锈剪 × vine meta15（四向立株）：vine:4:0 + loss=20 + durΔ20（R196 getNumVines 面）' },
  { id: 'W-40c', item: SHEARS, block: 'minecraft:vine', meta: 2, stage: 'vine1', z: 1,
    expect: { drops: [{ reg: 'minecraft:vine', count: 1, meta: 0 }], loss: [], dur: 20 },
    note: '锈剪 × vine 单向株（隔壁 1 格，meta2=WEST）：vine:1:0（值变再发）+ loss 0 条（同键同值 20 吞，阴性对照）+ durΔ20' },
  { id: 'W-40d', item: SHEARS, block: 'minecraft:leaves', meta: 0, stage: 'plant',
    expect: { drops: [{ reg: 'minecraft:leaves', count: 1, meta: 0 }], loss: [20], dur: 20 },
    note: '锈剪 × 橡木叶 meta0：leaves:1:0 + loss=20 + durΔ20' },
  { id: 'W-40e', item: SHEARS, block: 'minecraft:tallgrass', meta: 0, stage: 'plant',
    expect: { drops: [{ reg: 'minecraft:tallgrass', count: 1, meta: 0 }], loss: [5], dur: 5 },
    note: '锈剪 × tallgrass meta0：tallgrass:1:0 + loss=5 + durΔ5' },
  { id: 'W-40f', item: SHEARS, block: 'minecraft:web', meta: 0, stage: 'web',
    expect: { drops: [{ reg: 'minecraft:web', count: 1, meta: 0 }], loss: [10], dur: 10 },
    note: '锈剪 × web：web:1:0 + loss=10 + durΔ10（首验位）' },
  { id: 'W-40g', item: SHEARS, block: 'minecraft:deadbush', meta: 0, stage: 'plant',
    expect: { drops: [{ reg: 'minecraft:deadbush', count: 1, meta: 0 }], loss: [5], dur: 5 },
    note: '锈剪 × deadbush：deadbush:1:0 + loss=5 + durΔ5' },
  { id: 'W-40h', item: 'air', block: 'minecraft:tallgrass', meta: 0, stage: 'plant',
    expect: { drops: [], loss: [], dur: null },
    note: '空手 × tallgrass：drop 0 条 + loss 0 条（空手不进 funnel，vanilla 语义）' },
  { id: 'W-40i', item: SHEARS, block: 'minecraft:vine', meta: 15, stage: 'vine4', creative: true,
    expect: { drops: [], loss: [], dur: 0, groundItems: 0 },
    note: '创造模式锈剪 × vine：drop 0 + loss 0 + durΔ0 + 地面 0（ItemShears:83 早退）' },
];

const POINTS_G = [
  { id: 'W-40j', item: SHEARS, block: 'minecraft:vine', meta: 15, stage: 'vine4',
    expect: { drops: [], loss: [], dur: 1, groundVine: 1 },
    note: 'off 相：锈剪 × vine meta15 ⇒ drop 0 + loss 0 + durΔ1 + 地面 1× vine（vanilla 判值）' },
];

/** 计数总账（写死判）。 */
const LEDGER = {
  a: { drop: 7, loss: 6 },
  g: { drop: 0, loss: 0 },
};

const ONLY = (process.env.W40_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const PHASES_ONLY = (process.env.W40_PHASES || '').split(',').map((s) => s.trim()).filter(Boolean);
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);
const wantPhase = (k) => PHASES_ONLY.length === 0 || PHASES_ONLY.includes(k);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const RE = {
  drop: /\[MiningLog\] shear drop item=(\S+) block=(\S+) drops=(\S+)/,
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  speed: /\[MiningLog\] mine speed item=(\S+) block=(\S+) str=([-\d.]+)/,
  deny: /\[MiningLog\] mine deny grade=(-?\d+) required=(-?\d+) item=(\S+) block=(\S+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  found: /Successfully found the block/,
  notFound: /The block at/,
  placed: /Block placed|Unable to place|Cannot place|not loaded|The block couldn't be placed/i,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  testforHit: /(?:\]:\s|^)Found \S/,
  testforNone: /did not match the required data structure|found nothing/,
  reachDeny: /reach denied: (\S+)/,
  itemNbt: /Item:\{id:"([^"]+)",Count:(\d+)b(?:,Damage:(-?\d+)s)?\}/,
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

/* ===================== bot 面 dur ===================== */

function botDur(bot) {
  const it = bot && bot.heldItem;
  if (!it) return null;
  const d = it.durabilityUsed === undefined ? null : it.durabilityUsed;
  return d === null ? null : { damage: d, name: it.name, max: it.maxDurability, count: it.count };
}

async function botDurSettled(bot, timeoutMs = 2600) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const d = botDur(bot);
    if (d) return d;
    await sleep(150);
  }
  return null;
}

/** 主手换 fresh 栈（damage 0）；air ⇒ 空手。读回走 bot 侧（本窗不用 probe）。 */
async function holdItem(srv, bot, item) {
  for (let attempt = 0; attempt < 3; attempt++) {
    srv.send(`etest hold ${item} ${bot.username || ''}`.trim());
    await sleep(700);
    const t0 = Date.now();
    while (Date.now() - t0 < 2500) {
      const it = bot.heldItem;
      if (item === 'air') {
        if (!it || it.name === 'air') return { held: it ? { name: it.name, count: it.count } : null, attempts: attempt + 1 };
      } else if (it && it.durabilityUsed === 0) {
        return { held: { name: it.name, count: it.count, damage: it.durabilityUsed, max: it.maxDurability }, attempts: attempt + 1 };
      }
      await sleep(150);
    }
  }
  throw new Error(`hold ${item} failed — bot.heldItem 未就位`);
}

/* ===================== 命令面 ===================== */

async function testBlock(srv, x, y, z, spec) {
  const from = srv.all.length;
  srv.send(`testforblock ${x} ${y} ${z} ${spec}`);
  const line = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, from);
  return stripPrefix(line || '');
}

async function cmdRead(srv, cmd, ms = 800) {
  const from = srv.all.length;
  srv.send(cmd);
  await sleep(ms);
  return srv.all.slice(from)
    .filter((l) => !/^### \[harness\]/.test(l))
    .filter((l) => /\[Server thread\/INFO\]|\[Server thread\/WARN\]/.test(l))
    .map(stripPrefix)
    .filter((l) => l && !/^\s*$/.test(l));
}

async function testFor(srv, selector) {
  const lines = await cmdRead(srv, `testfor ${selector}`);
  const hits = lines.filter((l) => RE.testforHit.test(l));
  return { selector, hit: hits.length > 0, count: hits.length, raw: lines };
}

/* ===================== 摆场 ===================== */

function air(x, y, z) { return `setblock ${x} ${y} ${z} minecraft:air 0`; }
function put(x, y, z, b, m) { return `setblock ${x} ${y} ${z} ${b} ${m}`; }

/**
 * 摆场命令序列（先清场 → 先放支撑 → **最后**放目标块，避免目标收到邻块更新
 * 把 vine 的 meta15 削成实际连通面数）。
 */
function stageCommands(p, BX, BY, BZ) {
  const TZ = BZ; // runPoint 已把 p.z 并入 BZ（单点位移只加一次）
  const cmds = [];
  const n = {
    west: [BX - 1, BY, TZ], east: [BX + 1, BY, TZ],
    north: [BX, BY, TZ - 1], south: [BX, BY, TZ + 1],
  };
  // 目标列清场（含上两格 / 下一格）
  cmds.push(air(BX, BY + 2, TZ), air(BX, BY + 1, TZ), air(BX, BY, TZ), air(BX, BY - 1, TZ));
  // 支撑位清场
  const sup = p.stage === 'vine4' ? ['west', 'east', 'north', 'south']
    : (p.stage === 'vine1' ? ['west'] : []);
  for (const s of sup) cmds.push(air(...n[s]));
  // 支撑放置（先于目标）
  if (p.stage === 'plant' || p.stage === 'double') cmds.push(put(BX, BY - 1, TZ, 'minecraft:dirt', 0));
  for (const s of sup) cmds.push(put(...n[s], 'minecraft:dirt', 0));
  // 目标块（最后）
  cmds.push(put(BX, BY, TZ, p.block, p.meta));
  if (p.stage === 'double') cmds.push(put(BX, BY + 1, TZ, p.block, 8)); // upper（meta 8 = HALF=UPPER）
  return { cmds, tx: BX, ty: BY, tz: TZ, up: [BX, BY + 1, TZ] };
}

async function placeTarget(srv, rec, p, BX, BY, BZ) {
  const st = stageCommands(p, BX, BY, BZ);
  rec.stage = { x: st.tx, y: st.ty, z: st.tz, cmds: st.cmds.length };
  for (const c of st.cmds) { srv.send(c); await sleep(90); }
  await sleep(400);
  const from = srv.all.length;
  srv.send(`testforblock ${st.tx} ${st.ty} ${st.tz} ${p.block} ${p.meta}`);
  rec.blockPresent = stripPrefix((await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, from)) || '');
  // 目标列最终形态（旁证：upper 是否已就位）
  if (p.stage === 'double') {
    const f2 = srv.all.length;
    srv.send(`testforblock ${st.up[0]} ${st.up[1]} ${st.up[2]} ${p.block} 8`);
    rec.upperPresent = stripPrefix((await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, f2)) || '');
  }
  return st;
}

/* ===================== 一行 dig ===================== */

async function digOnce(srv, botName, BX, BY, BZ, probeSpec) {
  const from = srv.all.length;
  const t0 = Date.now();
  srv.send(`etest dig ${BX} ${BY} ${BZ} ${botName}`);

  await sleep(400);
  const earlyFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} ${probeSpec}`);
  const earlyLine = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, earlyFrom);
  const stillThere = !!earlyLine && RE.found.test(earlyLine);

  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  await sleep(600);

  let gone = false; let goneAtMs = null; let gonePolls = 0;
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
    gone, goneAtMs, gonePolls,
    earlyPresent: stillThere,
    earlyLine: earlyLine ? stripPrefix(earlyLine) : null,
  };
}

/* ===================== 行解析 ===================== */

function parseDropsCell(dropsCol) {
  if (!dropsCol || dropsCol === 'none') return [];
  return dropsCol.split('+').map((cell) => {
    const m = /^(.+):(\d+):(-?\d+)$/.exec(cell);
    if (!m) return { reg: cell, count: -1, meta: -1, raw: cell };
    return { reg: m[1], count: +m[2], meta: +m[3] };
  });
}

function dropRowsOf(seg) {
  return seg.filter((l) => RE.drop.test(l)).map((l) => {
    const m = RE.drop.exec(l);
    return { item: m[1], block: m[2], dropsCol: m[3], drops: parseDropsCell(m[3]) };
  });
}

function lossRowsOf(seg) {
  return seg.filter((l) => RE.decay.test(l)).map((l) => {
    const m = RE.decay.exec(l);
    return { face: m[1], item: m[2], block: m[3] || null, loss: +m[4] };
  });
}

function dropsEqual(got, want) {
  if (got.length !== want.length) return false;
  for (let i = 0; i < got.length; i++) {
    if (got[i].reg !== want[i].reg) return false;
    if (got[i].count !== want[i].count) return false;
    if (got[i].meta !== want[i].meta) return false;
  }
  return true;
}

/* ===================== 判点 ===================== */

async function runPoint(srv, bot, botName, p, geo) {
  const BX = geo.bx + OFF_X;
  const BY = geo.by;
  const BZ = geo.bz + (p.z || 0);
  const rec = {
    id: p.id, note: p.note, item: p.item, block: p.block, meta: p.meta,
    stage: p.stage, creative: !!p.creative, expect: p.expect, at: { x: BX, y: BY, z: BZ },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item} x ${p.block} meta=${p.meta}`);

  // 清场：掉落物（上一点的落物/种子）
  srv.send('kill @e[type=item]');
  await sleep(350);

  // fresh 栈
  const hold = await holdItem(srv, bot, p.item);
  rec.hold = hold;

  // 摆场
  const st = await placeTarget(srv, rec, p, BX, BY, BZ);
  const durBefore = botDur(bot);

  // 创造性门（i）
  if (p.creative) { srv.send(`gamemode 1 ${botName}`); await sleep(900); }

  const one = await digOnce(srv, botName, st.tx, st.ty, st.tz, `${p.block} ${p.meta}`);
  rec.dig = one;
  log(p.id, 'dig', 'gone=' + one.gone + '@' + one.goneAtMs + 'ms earlyPresent=' + one.earlyPresent);

  const durAfter = await botDurSettled(bot);

  if (p.creative) { srv.send(`gamemode 0 ${botName}`); await sleep(900); }

  const seg = srv.all.slice(one.from);
  rec.dropRaw = seg.filter((l) => RE.drop.test(l)).map((l) => l.trim());
  rec.lossRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.dropRows = dropRowsOf(seg);
  rec.lossRows = lossRowsOf(seg).filter((r) => r.face === 'breaking');
  rec.speedRaw = seg.filter((l) => RE.speed.test(l)).map(stripPrefix);
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);

  rec.durBefore = durBefore;
  rec.durAfter = durAfter;
  rec.durDelta = durBefore && durAfter ? durAfter.damage - durBefore.damage : null;

  // a 点：upper 静默清除（≤1s 读 pos.up() = air）
  if (p.expect.upperAir) {
    await sleep(700);
    rec.upperAfter = await testBlock(srv, st.up[0], st.up[1], st.up[2], 'minecraft:air');
  }

  // 地面落物（i：0；j：1× vine）
  if (p.expect.groundItems !== undefined || p.expect.groundVine !== undefined) {
    await sleep(400);
    rec.groundItems = await testFor(srv, '@e[type=item]');
    rec.groundNbt = await cmdRead(srv, 'entitydata @e[type=item] {}', 900);
    const nbtText = rec.groundNbt.join(' ');
    const vm = RE.itemNbt.exec(nbtText);
    rec.groundParsed = vm ? { id: vm[1], count: +vm[2], damage: vm[3] === undefined ? 0 : +vm[3] } : null;
  }

  const dropSpec = rec.dropRows.length === 1
    ? { item: rec.dropRows[0].item === p.item, block: rec.dropRows[0].block === p.block.split(':').pop() } : null;

  rec.checks = {
    holdOk: p.item === 'air' ? (hold.held === null || hold.held.name === 'air') : (hold.held && hold.held.damage === 0),
    placed: RE.found.test(rec.blockPresent || ''),
    digComplete: !!one.digStart && !!one.digStop,
    blockGone: one.gone,
    dropCount: rec.dropRows.length === (p.expect.drops.length > 0 ? 1 : 0),
    dropShape: p.expect.drops.length === 0
      ? true
      : (!!dropSpec && dropSpec.item && dropSpec.block && dropsEqual(rec.dropRows[0].drops, p.expect.drops)),
    lossRows: JSON.stringify(rec.lossRows.map((r) => r.loss)) === JSON.stringify(p.expect.loss)
      && rec.lossRows.every((r) => r.item === p.item && r.block === p.block.split(':').pop()),
    durDelta: p.expect.dur === null ? true : rec.durDelta === p.expect.dur,
    noReachDeny: rec.reachDenies.length === 0,
    upperAir: p.expect.upperAir ? RE.found.test(rec.upperAfter || '') : true,
    groundCount: p.expect.groundItems !== undefined
      ? rec.groundItems.count === p.expect.groundItems : true,
    groundVine: p.expect.groundVine !== undefined
      ? (!!rec.groundParsed && rec.groundParsed.id === 'minecraft:vine' && rec.groundParsed.count === p.expect.groundVine)
      : true,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'drop=' + rec.dropRows.length + ' [' + rec.dropRows.map((r) => r.block + '→' + r.dropsCol).join(' ') + ']'
    + ' loss=' + JSON.stringify(rec.lossRows.map((r) => r.loss))
    + ' durΔ=' + rec.durDelta
    + ' upper=' + (p.expect.upperAir ? (RE.found.test(rec.upperAfter || '') ? 'air' : 'NOT-AIR') : 'na')
    + ' reachDeny=' + rec.reachDenies.length);
  return rec;
}

/* ===================== 相 ===================== */

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
    phase.identified = srv.all.find((l) => /identified \d+ mods to load/.test(l)) || null;
    phase.extraMentions = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 5);
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: botName });
    await sleep(2200);

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
    for (const dx of [-1, 0, 1, 2, 3]) srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz} minecraft:dirt 0`);
    for (const dx of [-1, 0, 1, 2, 3]) {
      for (const dy of [0, 1, 2]) srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz} minecraft:air 0`);
    }
    await sleep(1200);
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

    for (const p of points) {
      let rec;
      try {
        rec = await runPoint(srv, bot, botName, p, geo);
      } catch (e) {
        rec = { id: p.id, fatal: e && e.stack ? e.stack : String(e), pass: false };
        log(p.id, 'FATAL', rec.fatal);
      }
      phase.points.push(rec);
    }

    const allDrop = dropRowsOf(srv.all);
    const allLoss = lossRowsOf(srv.all).filter((r) => r.face === 'breaking');
    phase.rowCounts = {
      drop: allDrop.length,
      loss: allLoss.length,
      speed: srv.all.filter((l) => RE.speed.test(l)).length,
      deny: srv.all.filter((l) => RE.deny.test(l)).length,
      reachDenied: srv.all.filter((l) => RE.reachDeny.test(l)).length,
    };
    phase.dropAll = srv.all.filter((l) => RE.drop.test(l)).map((l) => l.trim());
    phase.lossAll = srv.all.filter((l) => RE.decay.test(l)).map((l) => l.trim());
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

  // 本批不动 blockDebugLog（保持 cfg 默认 false）；只改 level-name / spawn-protection
  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  else propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  ev.propsWindow = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
  log('config', `level-name -> ${WORLD_NAME} / spawn-protection -> 0`);

  const cfgText = fs.readFileSync(CFG, 'utf8');
  ev.cfgKeysBefore = {
    miningDebugLog: /B:miningDebugLog=(\w+)/.exec(cfgText)[1],
    miningReform: /B:miningReform=(\w+)/.exec(cfgText)[1],
    blockDebugLog: /B:blockDebugLog=(\w+)/.exec(cfgText)[1],
  };
  log('config', 'keys before: ' + JSON.stringify(ev.cfgKeysBefore));
  if (ev.cfgKeysBefore.blockDebugLog !== 'false') throw new Error('blockDebugLog must stay false for this batch');
  if (ev.cfgKeysBefore.miningDebugLog !== 'true') throw new Error('miningDebugLog must be true (drop/loss rows)');

  const pointsA = wantPhase('a') ? pick(POINTS_A) : [];
  const pointsG = wantPhase('g') ? pick(POINTS_G) : [];

  let restoreOk = false;
  try {
    if (pointsA.length) {
      await runPhase({ key: 'a', tag: TAG + '-a', bot: 'ETIM_W40A',
        label: 'A (miningReform=true)' }, pointsA, ev);
    }
    if (pointsG.length) {
      ev.cfgEditG = editConfig((t) => {
        if (!/B:miningReform=true/.test(t)) throw new Error('cfg has no B:miningReform=true');
        return t.replace('B:miningReform=true', 'B:miningReform=false');
      });
      log('config', `phase G cfg edit: miningReform=false (${ev.cfgEditG.bytes} B ${ev.cfgEditG.sha})`);
      await runPhase({ key: 'g', tag: TAG + '-g', bot: 'ETIM_W40G',
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
      cfg: pinOf(CFG, PIN.cfg, 'cfg'),
      props: pinOf(PROPS, PIN.props, 'props'),
    };
    ev.jarUpToDate = ev.phases.length > 0
      && ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
    ev.mixinErrors = ev.phases.flatMap((p) => p.mixinErrors || []);
  }

  ev.ledger = {};
  for (const ph of ev.phases) {
    const want = LEDGER[ph.key];
    const got = ph.rowCounts || {};
    ev.ledger[ph.key] = { want, got, ok: !!want && got.drop === want.drop && got.loss === want.loss };
  }
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
      && ev.pinsAfter.cfg.ok && ev.pinsAfter.props.ok
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
