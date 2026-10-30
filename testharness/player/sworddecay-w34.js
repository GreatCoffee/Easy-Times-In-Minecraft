#!/usr/bin/env node
/**
 * sworddecay-w34.js — B-7 剑面收敛批（sworddecay）W-34a…j 判窗驱动
 *
 * 判决源：判据只吃服务端 `[MiningLog] tool decay face=breaking … loss=` 行
 *         （W-34h 另收 `face=attacking` 行作双证）；
 *         旁证 = 同栈耐久回读（`/etest blockprobe` 的 `[BlockLog] probe … dur=x/max`
 *         ＋ mineflayer NBT `durabilityUsed` 双路）。
 *
 * 两相：A 相 `miningReform=true` 判 W-34a/b/c/d/e/f/g 之外的 a…j（g 除外）；
 *       G 相改 cfg `miningReform=false` 重启判 W-34g-1/g-2。
 * 窗内 cfg 只做两处键值改（blockDebugLog false→true；miningReform true→false），
 * 收口整档字节还原（本批零新键 ⇒ 起收 byte-identical 预期）。
 * 换新世界（level-name=sworddecay34），收口 server.properties 字节还原 + 世界目录删除。
 *
 * 判值纪律（终审勘-1）：只写 max 出口值 —— 四植物 10／knife_flint 2／vanilla 剑 0／attack 50；
 * 禁手算乘性中间项当期望。去重纪律（ETIMMining:571-592）：同 key 同值连击合并成 1 行 ——
 * 故 W-34i 必须用**未在本窗出现过的 item×block 键**（银剑 × 高草）才能判「2 破 = 1 行」。
 *
 * 通道：服务端 = runServer + 控制台 stdin（server-console.js）；换手 = /etest hold；
 *       挖块 = /etest dig（CommandDevTest:138 dispatch + :514 executeDig）；
 *       读耐久 = /etest blockprobe；击打 = /etest attack。
 *
 * 用法：node sworddecay-w34.js [tag]
 * 调试口（仅冒烟用）：W34_ONLY=W-34a[,W-34e] 只跑前缀命中判点；W34_SKIP_G=1 跳过 G 相。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'sworddecay-w34';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const WORLD_NAME = 'sworddecay34';
const PORT = 25565;

/** 四钉（条 139 落码收讫版）。 */
const PIN = {
  head: 'c3ac0e9',
  dev: { bytes: 753688, sha: 'B5E91C3DCF707ECE385CB27460233D658AD84A849EC7194D7C5D71659AEE4206' },
  rel: { bytes: 769417, sha: '7FD38FE3EB399EEF6154F63C6F85ED6B66A33298636F7A6D92DC8ACA5D19BEF8' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** 判点相对几何：平台 = 假人落点列（dy-1 起），目标块 = (bx+2, by, bz)。 */
const OFF_X = 2;

/** A 相（miningReform=true）。各点取**互不相同的 item×block 键**以规避行级去重。 */
const POINTS_A = [
  { id: 'W-34a', item: 'etim:sword_copper', block: 'minecraft:tallgrass', meta: 1,
    expect: { rows: 1, loss: 10, dur: 10 }, note: 'ETIM 铜剑 × 高草（R196 表 0.02F 正证）' },
  { id: 'W-34b', item: 'etim:sword_copper', block: 'minecraft:sapling', meta: 0,
    expect: { rows: 1, loss: 10, dur: 10 }, note: 'ETIM 铜剑 × 树苗（同表 0.02F）' },
  { id: 'W-34c', item: 'etim:sword_copper', block: 'minecraft:deadbush', meta: 0,
    expect: { rows: 1, loss: 10, dur: 10 }, note: 'ETIM 铜剑 × 枯萎灌木（同表 0.02F）' },
  { id: 'W-34d', item: 'etim:sword_copper', block: 'minecraft:double_plant', meta: 0, doubleHalf: true,
    expect: { rows: 1, loss: 10, dur: 10 }, note: 'ETIM 铜剑 × 双生植物（◎ 推导面，R196 无方块一手负证）' },
  { id: 'W-34e', item: 'minecraft:iron_sword', block: 'minecraft:tallgrass', meta: 1,
    expect: { rows: 1, loss: 0, dur: 0 }, note: '负证形状②：vanilla 铁剑 × 高草（有效性拒 str=0 ⇒ 恰 1 行 loss=0）' },
  { id: 'W-34f', item: 'etim:knife_flint', block: 'minecraft:tallgrass', meta: 1,
    expect: { rows: 1, loss: 2, dur: 2 }, note: '判别：火刀 × 高草（0.5 档 floor 出口值 2）' },
  { id: 'W-34j', item: 'etim:sword_copper', block: 'minecraft:wheat', meta: 7,
    support: 'minecraft:farmland', supportMeta: 7,
    expect: { rows: 1, loss: 10, dur: 10 }, note: '作物正控：MixinBlockCrops 0.02F 面 × 剑' },
  { id: 'W-34i', item: 'etim:sword_silver', block: 'minecraft:tallgrass', meta: 1, digs: 2,
    expect: { rows: 1, loss: 10, dur: 20 }, note: '去重形状：同键连破 ×2 ⇒ 1 行 + dur Δ=20' },
  { id: 'W-34h', item: 'etim:sword_copper', attack: 'minecraft:zombie', fallback: 'minecraft:cow',
    expect: { rows: 0, loss: null, dur: 50 }, note: 'attack 冒烟：hitEntity 链零扰动（100×0.5=50）' },
];

/** G 相（miningReform=false）。 */
const POINTS_G = [
  { id: 'W-34g-1', item: 'etim:sword_copper', block: 'minecraft:tallgrass', meta: 1,
    expect: { rows: 0, loss: null, dur: 0 }, note: 'off 相①：ETIM 剑 × 高草 = 0 行（守卫读原生 0.0，恒假）' },
  { id: 'W-34g-2', item: 'minecraft:iron_sword', block: 'minecraft:dirt', meta: 0,
    expect: { rows: 0, loss: null, dur: 2 }, note: 'off 相②：vanilla 剑 × dirt = 0 行 + vanilla damageItem(2)' },
];

const ONLY = (process.env.W34_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const SKIP_G = process.env.W34_SKIP_G === '1';
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]:\s*/, '');

const RE = {
  probeDur: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(-|\d+)\/(\d+)/,
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  attackStep: /\[TestLog\] step=attack /,
  noTarget: /\[TestLog\] step=attack .*NO_TARGET/,
  summonOk: /Object successfully summoned|Summoned new/,
  opOk: /Made \S+ a server operator/,
  blockGone: /Successfully found the block/,
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
  return { line, player: m[1], held: m[2], damage: m[3] === '-' ? -1 : +m[3], max: +m[4] };
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

/** 摆场：支撑块 + 目标块（+ double_plant 上半），并 testforblock 断言在位。 */
async function placeTarget(srv, rec, BX, BY, BZ, p) {
  const SY = BY - 1;
  const support = p.support || 'minecraft:dirt';
  srv.send(`setblock ${BX} ${SY} ${BZ} minecraft:air 0`);
  await sleep(120);
  const supFrom = srv.all.length;
  srv.send(`setblock ${BX} ${SY} ${BZ} ${support} ${p.supportMeta === undefined ? 0 : p.supportMeta}`);
  rec.support = support;
  rec.supportLine = stripPrefix((await srv.waitFor(RE.placed, 5000, supFrom)) || '');
  await sleep(250);
  srv.send(`setblock ${BX} ${BY} ${BZ} minecraft:air 0`);
  if (p.doubleHalf) srv.send(`setblock ${BX} ${BY + 1} ${BZ} minecraft:air 0`);
  await sleep(150);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  if (p.doubleHalf) srv.send(`setblock ${BX} ${BY + 1} ${BZ} ${p.block} ${p.meta | 8}`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(400);
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  rec.blockPresent = stripPrefix((await srv.waitFor(/Successfully found the block|The block at/, 5000, tbFrom)) || '');
}

async function digOnce(srv, botName, BX, BY, BZ, rec) {
  const from = srv.all.length;
  srv.send(`etest dig ${BX} ${BY} ${BZ} ${botName}`);
  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  await sleep(2200); // 让 break 完成 + 判行落地
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} minecraft:air`);
  const gone = await srv.waitFor(/Successfully found the block|The block at/, 5000, tbFrom);
  await sleep(300);
  return {
    from,
    digStart: ds ? stripPrefix(ds) : null,
    digStop: dp ? stripPrefix(dp) : null,
    blockGone: gone ? stripPrefix(gone) : null,
    gone: !!gone && /Successfully found the block/i.test(gone),
  };
}

async function runDigPoint(srv, bot, botName, p, geo) {
  const BX = geo.bx + OFF_X;
  const BY = geo.by;
  const BZ = geo.bz;
  const rec = {
    id: p.id, kind: 'dig', note: p.note, item: p.item, block: p.block, meta: p.meta,
    support: p.support || 'minecraft:dirt', expect: p.expect, at: { x: BX, y: BY, z: BZ },
  };
  log(p.id, 'start', p.note);

  srv.send(`say [${p.id}] ${p.item} x ${p.block}`);
  const hold = await holdItem(srv, botName, p.item);
  rec.holdLine = stripPrefix(hold.probe.line);
  rec.holdAttempts = hold.attempts;

  await placeTarget(srv, rec, BX, BY, BZ, p);

  const b0 = await probeDur(srv, botName);
  const bb0 = await botDurSettled(bot);
  rec.probeBefore = b0 ? { line: stripPrefix(b0.line), held: b0.held, damage: b0.damage, max: b0.max } : null;
  rec.botBefore = bb0;

  const digs = p.digs || 1;
  rec.digs = [];
  for (let d = 0; d < digs; d++) {
    if (d > 0) {
      // 同点二次挖：原地重摆（不换手）—— 去重面的「同 key 连击」
      await placeTarget(srv, rec, BX, BY, BZ, p);
      await sleep(300);
    }
    const one = await digOnce(srv, botName, BX, BY, BZ, rec);
    rec.digs.push(one);
    log(p.id, 'dig#' + (d + 1), 'gone=' + one.gone);
  }

  const b1 = await probeDur(srv, botName);
  const bb1 = await botDurSettled(bot);
  rec.probeAfter = b1 ? { line: stripPrefix(b1.line), held: b1.held, damage: b1.damage, max: b1.max } : null;
  rec.botAfter = bb1;

  const segFrom = rec.digs[0].from;
  const seg = srv.all.slice(segFrom);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map(stripPrefix);
  rec.mineSpeedRaw = seg.filter((l) => /\[MiningLog\] mine speed/.test(l)).map(stripPrefix);
  rec.denyRaw = seg.filter((l) => /\[MiningLog\] mine deny/.test(l)).map(stripPrefix);

  const rows = rec.decayRaw.map((l) => {
    const m = RE.decay.exec(l);
    return { face: m[1], item: m[2], block: m[3] || null, loss: +m[4] };
  }).filter((r) => r.face === 'breaking');
  rec.rows = rows;

  const durDelta = b0 && b1 ? b1.damage - b0.damage : null;
  const botDelta = bb0 && bb1 ? bb1.damage - bb0.damage : null;
  rec.durDelta = durDelta;
  rec.botDelta = botDelta;

  const blockPath = p.block.split(':').pop();
  rec.checks = {
    support: /Block placed/i.test(rec.supportLine || ''),
    placed: /Block placed/i.test(rec.placedLine || ''),
    blockPresent: /Successfully found the block/i.test(rec.blockPresent || ''),
    digsComplete: rec.digs.every((d) => !!d.digStart && !!d.digStop),
    digCount: rec.digs.length === digs,
    blockGoneAll: rec.digs.every((d) => d.gone),
    probeBefore: !!b0 && b0.held === p.item,
    probeAfter: !!b1 && b1.held === p.item,
    durDelta: durDelta === p.expect.dur,
    botDelta: botDelta === null ? true : botDelta === p.expect.dur,
    rowsCount: rows.length === p.expect.rows,
    rowsMatch: p.expect.rows === 0
      ? rows.length === 0
      : (rows.length === 1 && rows[0].loss === p.expect.loss
         && rows[0].item === p.item && rows[0].block === blockPath),
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rows.length + ' loss=' + (rows.map((r) => r.loss).join(',') || '-')
    + ' durΔ=' + durDelta + ' botΔ=' + botDelta
    + ' gone=' + rec.checks.blockGoneAll);
  return rec;
}

/** 单次击打尝试：换新栈 → 召唤 → 客户端包击打 → 双侧耐久回读 + 判行。 */
async function attackAttempt(srv, bot, botName, p, geo, entity, night) {
  const at = { x: geo.bx, y: geo.by, z: geo.bz };
  const a = { entity, night };
  if (night) { srv.send('time set 18000'); await sleep(600); }
  const hold = await holdItem(srv, botName, p.item);
  a.holdLine = stripPrefix(hold.probe.line);

  const summonsFrom = srv.all.length;
  srv.send(`summon ${entity} ${at.x + 1.5} ${at.y} ${at.z + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b}`);
  await sleep(1600);
  a.summonLine = stripPrefix((await srv.waitFor(RE.summonOk, 5000, summonsFrom)) || '');
  srv.send(`testfor @e[type=${entity.split(':').pop()}]`);
  await sleep(600);
  a.testforZombie = stripPrefix((await srv.waitFor(/Selector '.*' found nothing|Found entity|Found /, 3000, summonsFrom)) || '');

  // 客户端视角实体表（攻击走真实 client 包 bot.attack → CPacketUseEntity；
  // `/etest attack` 的选择器面见回执 C 级）。
  const snap = Object.values(bot.entities)
    .filter((e) => e && e.id !== bot.entity.id)
    .map((e) => ({
      id: e.id, name: e.name, type: e.type,
      dist: e.position ? +bot.entity.position.distanceTo(e.position).toFixed(2) : null,
    }))
    .sort((x, y) => (x.dist === null ? 1e9 : x.dist) - (y.dist === null ? 1e9 : y.dist));
  a.clientEntities = snap.slice(0, 8);
  const target = Object.values(bot.entities)
    .filter((e) => e && e.id !== bot.entity.id && e.position)
    .filter((e) => e.name === entity.split(':').pop())
    .sort((x, y) => bot.entity.position.distanceTo(x.position) - bot.entity.position.distanceTo(y.position))[0];
  a.target = target ? { id: target.id, name: target.name, dist: +bot.entity.position.distanceTo(target.position).toFixed(2) } : null;

  const b0 = await probeDur(srv, botName);
  a.probeBefore = b0 ? { line: stripPrefix(b0.line), held: b0.held, damage: b0.damage } : null;

  // 必须先把视线对准目标：ETIMReachEvents 的 melee 门按**视线射线距离**判
  // （`reach denied: etim.reach.deny_attack <∞> > 2.25`，smoke4 实证）——不对准 = 恒拒。
  if (target) {
    const aimY = target.position.y + (target.height ? target.height / 2 : 0.9);
    await bot.lookAt(target.position.offset(0, (target.height || 1) / 2, 0), true);
    await sleep(400);
    a.aim = { y: +aimY.toFixed(2), yaw: +bot.entity.yaw.toFixed(3), pitch: +bot.entity.pitch.toFixed(3) };
  }

  const attFrom = srv.all.length;
  if (target) {
    a.via = 'client(bot.attack)';
    bot.attack(target);
  } else {
    a.via = 'etest(fallback)';
    srv.send(`etest attack @e[type=${entity.split(':').pop()},r=4,c=1] ${botName}`);
  }
  await sleep(2200);

  const b1 = await probeDur(srv, botName);
  a.probeAfter = b1 ? { line: stripPrefix(b1.line), held: b1.held, damage: b1.damage } : null;

  const seg = srv.all.slice(attFrom);
  a.decayRaw = seg.filter((l) => RE.decay.test(l)).map(stripPrefix);
  a.noTargetRaw = seg.filter((l) => RE.noTarget.test(l)).map(stripPrefix);
  a.attackStep = stripPrefix(seg.find((l) => RE.attackStep.test(l)) || '');
  a.rows = a.decayRaw.map((l) => {
    const m = RE.decay.exec(l);
    return { face: m[1], item: m[2], block: m[3] || null, loss: +m[4] };
  });
  a.attackRows = a.rows.filter((r) => r.face === 'attacking');
  a.breakingRows = a.rows.filter((r) => r.face === 'breaking');
  a.durDelta = b0 && b1 ? b1.damage - b0.damage : null;
  a.hit = a.durDelta === p.expect.dur
    && a.attackRows.every((r) => r.loss === 50 && r.item === p.item);
  log(p.id, 'attempt', entity + (night ? '@night' : '@day'),
    'via=' + a.via + ' target=' + (a.target ? a.target.id : '-')
    + ' durΔ=' + a.durDelta + ' attackingRows=' + a.attackRows.length);
  return a;
}

async function runAttackPoint(srv, bot, botName, p, geo) {
  const rec = {
    id: p.id, kind: 'attack', note: p.note, item: p.item, entity: p.attack,
    expect: p.expect, at: { x: geo.bx, y: geo.by, z: geo.bz }, attempts: [],
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] attack ${p.attack} with ${p.item}`);

  // 首试 = 任务书形状（夜间僵尸：正午日光下召唤僵尸 ≤2 s 被静默移除，探针实证）；
  // 备试 = 牛（衰减带只读手持物类别，与目标物种无关）。
  rec.attempts.push(await attackAttempt(srv, bot, botName, p, geo, p.attack, true));
  if (!rec.attempts[0].hit) {
    rec.attempts.push(await attackAttempt(srv, bot, botName, p, geo, p.fallback || 'cow', false));
  }
  const win = rec.attempts.find((a) => a.hit) || rec.attempts[rec.attempts.length - 1];
  rec.winner = { entity: win.entity, night: win.night, via: win.via, target: win.target };
  rec.durDelta = win.durDelta;
  rec.attackRows = win.attackRows;
  rec.decayRaw = win.decayRaw;

  rec.checks = {
    summoned: RE.summonOk.test(win.summonLine || ''),
    targetNear: !!win.target && win.target.dist <= 3.0,
    attackIssued: win.via === 'client(bot.attack)'
      || (!!win.attackStep && /target=/.test(win.attackStep) && win.noTargetRaw.length === 0),
    probeBefore: !!win.probeBefore && win.probeBefore.held === p.item,
    probeAfter: !!win.probeAfter && win.probeAfter.held === p.item,
    durDelta: win.durDelta === p.expect.dur,
    // 落 [MiningLog] attacking 行则双证，不落就 dur 单证（任务书口径）
    attackRow: win.attackRows.length === 0
      || (win.attackRows.length === 1 && win.attackRows[0].loss === 50 && win.attackRows[0].item === p.item),
    noBreakingRow: win.breakingRows.length === 0,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'entity=' + win.entity + ' attackRows=' + win.attackRows.length
    + ' loss=' + (win.attackRows.map((r) => r.loss).join(',') || '-')
    + ' durΔ=' + win.durDelta);
  return rec;
}

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const botName = opts.bot;
  const srv = await startServer({ root: ROOT, tag });
  const phase = { tag, bot: botName, label: opts.label, points: [] };
  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = stripPrefix(done.trim());
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.extraMentions = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 5);
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.mixinCount = srv.all.filter((l) => /mixins? .*(applied|loaded)/i.test(l)).length;

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
    srv.send(`op ${botName}`);
    srv.send(`gamemode 0 ${botName}`);
    srv.send(`effect ${botName} clear`);
    srv.send(`etest food 6 6 ${botName}`);
    srv.send(`etest level 0 ${botName}`);
    await sleep(1400);
    phase.opLine = stripPrefix((await srv.waitFor(RE.opOk, 4000, 0)) || '');
    log('setup', 'op(selector perm)=' + (phase.opLine ? 'OK' : 'MISSING'));

    // ---- 摆场：假人自身落点列上方 8 格搭 3 格平台（同 chunk 必已加载；/fill 在未加载区静默不落地）
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
    if (!grounded) throw new Error('bot not grounded on the harness platform — str 环境罚会污染判值');

    for (const p of points) {
      let rec;
      try {
        rec = p.attack
          ? await runAttackPoint(srv, bot, botName, p, geo)
          : await runDigPoint(srv, bot, botName, p, geo);
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

  // ---- 钉值（四钉 + props）
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

  // ---- 快照 + 换世界
  ev.cfgSnapshot = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  // 服务端侧缓存（op / usercache / usernamecache）：窗内 op 假人 + 假人登录会改写，
  // 收口整档还原（产品面零改动；世界目录另删）。
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
  log('config', `phase A cfg edit: blockDebugLog=true (${ev.cfgEditA.bytes} B ${ev.cfgEditA.sha})`);

  let restoreOk = false;
  const pointsA = pick(POINTS_A);
  const pointsG = SKIP_G ? [] : pick(POINTS_G);
  try {
    // ---- A 相：reform on
    if (pointsA.length) {
      const pa = await runPhase(
        { tag: TAG + '-a', bot: 'ETIM_W34A', label: 'A (miningReform=true)' }, pointsA, ev);
      pa.phase = 'A';
    }

    // ---- G 相：reform off（改 cfg 重启）
    if (pointsG.length) {
      ev.cfgEditG = editConfig((t) => {
        if (!/B:miningReform=true/.test(t)) throw new Error('cfg has no B:miningReform=true');
        return t.replace('B:miningReform=true', 'B:miningReform=false');
      });
      log('config', `phase G cfg edit: miningReform=false (${ev.cfgEditG.bytes} B ${ev.cfgEditG.sha})`);
      const pg = await runPhase(
        { tag: TAG + '-g', bot: 'ETIM_W34G', label: 'G (miningReform=false)' }, pointsG, ev);
      pg.phase = 'G';
    }
  } finally {
    // ---- 收口还原
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

    // 服务端侧缓存还原（op/usercache/usernamecache）
    ev.sideRestored = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideRestored[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
      log('config', name + ' restored ' + (ev.sideRestored[name].identical ? 'byte-identical' : 'MISMATCH'));
    }
    restoreOk = restoreOk && Object.values(ev.sideRestored).every((s) => s.identical);

    // 世界目录清理（本窗新建）
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
  const expectPoints = pointsA.length + pointsG.length;
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
