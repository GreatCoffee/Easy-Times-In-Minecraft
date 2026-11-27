#!/usr/bin/env node
/**
 * enchant1-we1.js — enchant1 批 W-E1 判窗驱动（路丙一期 5 条 · HEAD 5191ee6）
 *
 * 判决源：条 241（batch 成立）／242（摸底 faces=12）／243-245（D 位四问）
 *   ／246（终审放行 T-1..T-7）／247（落码 5191ee6）
 *
 * 判点（T1..T8，单 boot）：
 *   T1 5 条进池/载体门/案 M 窗口：probe pool reg 行 ×38；feet(speed)/chest(regen)/
 *      mainhand bow(poison/true_flight/quickness) table=true ＋ 案 M window 复算全等；
 *      反向臂（弓槽拿靴 / 靴槽拿弓）table=false
 *   T2 speed 读数：/etest enchantprobe feet mods —— L5 enchant=1.25 walk=0.125(有食)/
 *      0.09375(断粮)；L0 enchant=1.0
 *   T3 regeneration：[FoodLog] healed 行 regenFactor —— L5=3.5 / L0=1
 *   T4 poison：bot 拉弓射铁傀儡 → [ArrowLog] poison tick 行（interval 100 ⇒ 400 tick 内 4 行）
 *   T5 true_flight wander：[ArrowLog] shot 行四臂（exp0×L0=5.0000／exp0×L5=0.5556／
 *      exp0×L1=1.1657／exp40×L0=0.5556）
 *   T6 quickness：[ArrowLog] release charge/divisor/velocity —— divisor=d(L)=20/18/10，
 *      velocity=1.12 多项式(charge/d)
 *   T7 共享钩正证臂：T4/T5 三箭族（minecraft:arrow／etim:arrow_rusted_iron／
 *      minecraft:tipped_arrow）同读数（载体侧 0 差）
 *   T8 cfg 17 键首启：run/config/etim.cfg 增 17 键、size 增大、收窗回填钉值
 *
 * 判据通道：[EnchantLog] pool/pool-e/reg/mods ＋ [ArrowLog] shot/release/poison tick
 *   ＋ [FoodLog] healed（arrowDebugLog / foodDebugLog 门控——窗前后门控开关与回填见 §收口）
 *
 * 用法：node enchant1-we1.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'enchant1-we1';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const CFG_CLIENT = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const MIXIN_OUT = path.join(ROOT, 'run', '.mixin.out', 'class');

const WORLD = 'enchant1we1';
const PORT = 25565;
const BOT = 'ETIM_WE1';
const JAVAP = 'D:\\OpenCodeWorkspace\\Easy Times In Minecraft\\jdk\\zulu25.38.107-ca-jdk25.0.5-win_x64\\bin\\javap.exe';

/** 起收钉（条 247 落码 5191ee6） */
const PIN = {
  head: '5191ee6',
  rel: { bytes: 837336, sha: 'FF668235499D8B295D78DDA1DB74562CF41BD342DCC5CCD4B21F67C876CC0731' },
  dev: { bytes: 820528, sha: '27C5B1656F0B1400B98E3580D8267E3DFA1D3F651DEF30A6A7B731169DA95822' },
  src: { bytes: 766628, sha: 'E5676AEA6B81C5CF0833EFE238860D931C3C8B7215A5CD1282D9BF764CC6C6A2' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30524, sha: '262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉（条 247：refmap 双树 64 类键 / 143 条目（=286 面双端计法）｜mixins 58/client 10） */
const MK_PIN = {
  mixins: 58, client: 10, refmapClasses: 64, refmapEntries: 143,
  sword: 4, tool: 4, shears: 3, sliceTotal: 11, container: 3, arrow: 2, bow: 2,
};

/** batch enchant1 的 17 个 cfg 键（条 242 T-4 / 条 245 键族） */
const CFG17 = {
  speedDifficulty: '10',
  regenerationDifficulty: '20',
  quicknessDifficulty: '10',
  trueFlightDifficulty: '10',
  poisonDifficulty: '10',
  speedMaxLevel: '5',
  regenerationMaxLevel: '5',
  quicknessMaxLevel: '5',
  trueFlightMaxLevel: '5',
  poisonMaxLevel: '5',
  speedPerLevel: '0.05',
  regenerationPerLevel: '0.5',
  quicknessTicksReduction: '10',
  trueFlightBonusLevels: '40',
  poisonDurationBase: '160',
  poisonDurationSpan: '240',
  poisonPotionIconIndex: '0',
};

const RE = {
  done: /Done \(/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException|MixinApplyError|Critical injection failure/,
  pool: /\[EnchantLog\] pool slot=(\d+) budget=(-?\d+) size=(\d+) item=(\S+)/,
  poolE: /\[EnchantLog\] pool-e slot=(\d+)/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,
  mods: /\[EnchantLog\] mods slot=feet lvl=(\d+) enchant=(\S+) hunger=(\S+) walk=(\S+)/,
  shot: /\[ArrowLog\] shot wander=(\S+) eff=(-?\d+) exp=(-?\d+) lvl=(\d+)/,
  release: /\[ArrowLog\] release charge=(\d+) divisor=(\d+) velocity=(\S+) lvl=(\d+)/,
  poisonTick: /\[ArrowLog\] poison tick dmg=(\S+) target=(.*?) health=(\S+)/,
  healed: /\[FoodLog\] .*healed 1\.0 via regen \(health=([\d.]+) nutrition=(-?[\d.]+) regenFactor=([\d.]+) hungerPool/,
};

/* ============================ 小件 ============================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stampLog = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stampLog()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => (l || '')
  .replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '')
  .replace(/^\[Server[^\]]*\]\s*/, '');
const logTime = (l) => {
  const m = /^\[(\d{2}:\d{2}:\d{2})\]/.exec(l || '');
  return m ? m[1] : null;
};

function pinOf(file, pin, label) {
  if (!fs.existsSync(file)) throw new Error(label + ' missing: ' + file);
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { file: label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}

function snapshot(file, name) {
  const buf = fs.readFileSync(file);
  const dest = path.join(OUT, name);
  fs.writeFileSync(dest, buf);
  return { path: dest, bytes: buf.length, sha: sha256(buf) };
}

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}

/** Forge 写出的 cfg 行形 = "    B:key=value" */
function setCfgValue(file, key, value) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + key + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg has no key ' + key);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + value), 'utf8');
}

function cfgKeys(file) {
  const t = fs.readFileSync(file, 'utf8');
  const out = {};
  for (const line of t.split(/\r?\n/)) {
    const m = /^    [A-Z]:(\w+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
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

function mkCounts() {
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
  const out = {};
  for (const [key, f] of [['refmapResources', REFMAP_A], ['refmapTmp', REFMAP_B]]) {
    const r = read(f);
    out[key] = {
      classes: Object.keys(r.mappings).length,
      entries: Object.values(r.mappings).reduce((a, x) => a + Object.keys(x).length, 0),
    };
    const cnt = (cls) => Object.keys(r.mappings['io/github/etim/etim/mixins/' + cls] || {}).length;
    out[key].slices = { sword: cnt('MixinItemSword'), tool: cnt('MixinItemTool'), shears: cnt('MixinItemShears') };
    out[key].sliceTotal = out[key].slices.sword + out[key].slices.tool + out[key].slices.shears;
    out[key].containerEnchant = cnt('MixinContainerEnchantment');
    out[key].arrow = cnt('MixinEntityArrow');
    out[key].bow = cnt('MixinItemBow');
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  const R = out.refmapResources;
  out.ok = R.classes === MK_PIN.refmapClasses && R.entries === MK_PIN.refmapEntries
    && out.refmapTmp.classes === MK_PIN.refmapClasses && out.refmapTmp.entries === MK_PIN.refmapEntries
    && R.slices.sword === MK_PIN.sword && R.slices.tool === MK_PIN.tool && R.slices.shears === MK_PIN.shears
    && R.sliceTotal === MK_PIN.sliceTotal && R.containerEnchant === MK_PIN.container
    && R.arrow === MK_PIN.arrow && R.bow === MK_PIN.bow
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client;
  return out;
}

/* ============================ 案 M 窗口复算 ============================ */

/** ETIMMiteEnchantment：min(L)=max(diff−10,0)+diff×(L−1)+1｜max(L)=min(L+1)−1，末级 999 */
function caseMWindow(diff, maxLevel) {
  const min = (L) => Math.max(diff - 10, 0) + diff * (L - 1) + 1;
  const parts = [];
  for (let L = 1; L <= maxLevel; L++) {
    const mx = L >= maxLevel ? 999 : min(L + 1) - 1;
    parts.push('L' + L + '=' + min(L) + '/' + mx);
  }
  return parts.join(' ');
}

/** 1.12 getArrowVelocity 多项式（换了分母 d 的同一式） */
function velocityOf(charge, d) {
  let f = charge / d;
  f = (f * f + 2 * f) / 3;
  return f > 1 ? 1 : f;
}

/* ============================ 服务器 / bot ============================ */

async function waitReady(srv, tag) {
  const deadline = Date.now() + 480000;
  while (Date.now() < deadline) {
    const done = srv.all.find((l) => RE.done.test(l));
    if (done) return done;
    const dead = srv.exited || srv.all.some((l) => /BUILD FAILED|insufficient memory|FAILURE: Build failed|LoaderExceptionModCrash/.test(l));
    if (dead) throw new Error('boot died before Done( — see ' + tag + '.out');
    await sleep(400);
  }
  return null;
}

async function connectBot() {
  let lastErr = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const b = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
      if (attempt > 1) log('bot', `connected on attempt ${attempt}`);
      return b;
    } catch (e) {
      lastErr = e;
      log('bot', `connect attempt ${attempt} failed: ${(e && e.message) || e}`);
      await sleep(2500);
    }
  }
  throw lastErr || new Error('bot connect failed');
}

/* ============================ 探针 ============================ */

let sentinelSeq = 0;

async function runMarked(srv, command, label, ms) {
  const from = srv.all.length;
  const tag = 'WE1_' + label + '_' + (++sentinelSeq);
  srv.send(command);
  srv.send('say ' + tag);
  const hit = await srv.waitFor(new RegExp('\\[Server\\] ' + tag), ms || 15000, from);
  await sleep(100);
  return { from, tag, ok: !!hit, seg: srv.all.slice(from) };
}

async function probe(srv, slot, src) {
  const m = await runMarked(srv, `etest enchantprobe ${slot} ${src} ${BOT}`, 'probe');
  const seg = m.seg;
  const pool = [];
  const poolE = [];
  const reg = [];
  for (const raw of seg) {
    let mm;
    if ((mm = RE.pool.exec(raw))) pool.push({ slot: +mm[1], budget: +mm[2], size: +mm[3], item: mm[4] });
    else if ((mm = RE.poolE.exec(raw))) poolE.push({ slot: +mm[1] });
    else if ((mm = RE.reg.exec(raw))) reg.push({
      reg: mm[1], id: +mm[2], weight: +mm[3], table: mm[4] === 'true',
      treasure: mm[5] === 'true', window: mm[6].trim(),
    });
  }
  log('probe', `${slot}/${src}: pool=${JSON.stringify(pool.map((p) => [p.slot, p.budget, p.size]))} poolE=${poolE.length} reg=${reg.length}`);
  return { slot, src, from: m.from, to: srv.all.length, pool, poolE, reg };
}

function regOf(p, name) {
  return p.reg.find((r) => r.reg === name) || null;
}

/* ============================ 主流程 ============================ */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, window: 'W-E1 T1..T8', executedBy: 'session7',
    startedAt: new Date().toISOString(), workspace: ROOT,
    pins: {}, bootCount: 1, clients: 0,
  };

  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  log('pin', 'HEAD=' + head + ' ' + (ev.headOk ? 'OK' : 'MISMATCH'));

  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  ev.pins.cfg = pinOf(CFG, PIN.cfg, 'cfg');
  ev.pins.cfgClient = pinOf(CFG_CLIENT, PIN.cfgClient, 'cfgClient');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.mk = mkCounts();
  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);
  ev.pins.gitStatus = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  for (const k of ['devJar', 'relJar', 'srcJar', 'cfg', 'cfgClient', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch');
  if (!ev.headOk) throw new Error('HEAD mismatch');

  /* 快照（cfg/props 两侧） */
  ev.cfgSnap = snapshot(CFG, TAG + '-cfg.before');
  ev.cfgClientSnap = snapshot(CFG_CLIENT, TAG + '-cfgClient.before');
  ev.propsSnap = snapshot(PROPS, TAG + '-props.before');

  /* 门控开闸（判据通道）：arrowDebugLog=true；foodDebugLog 现场核对 */
  const gateBefore = cfgKeys(CFG);
  ev.gates = {
    arrowBefore: gateBefore.arrowDebugLog, foodBefore: gateBefore.foodDebugLog,
  };
  if (gateBefore.arrowDebugLog !== 'true') setCfgValue(CFG, 'arrowDebugLog', 'true');
  if (gateBefore.foodDebugLog !== 'true') setCfgValue(CFG, 'foodDebugLog', 'true');
  const gateAfter = cfgKeys(CFG);
  ev.gates.arrowAfter = gateAfter.arrowDebugLog;
  ev.gates.foodAfter = gateAfter.foodDebugLog;
  ev.cfgGated = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  log('gate', 'arrowDebugLog=' + ev.gates.arrowAfter + ' foodDebugLog=' + ev.gates.foodAfter
    + ' cfg=' + ev.cfgGated.bytes + '/' + ev.cfgGated.sha);

  /* 场地世界 + 属性 */
  fs.writeFileSync(PROPS, setProp(setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD), 'view-distance', '6'), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG + '-session-1' });
  let bot = null;
  try {
    const done = await waitReady(srv, TAG);
    if (!done) throw new Error('server never reached Done( within 480s');
    ev.boot = {
      ready: stripPrefix(done.trim()), readyTs: logTime(done), readyIdx: srv.all.indexOf(done) + 1,
      modGather: srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null,
      buildLine: (srv.all.find((l) => /BUILD SUCCESSFUL|BUILD FAILED/.test(l)) || '').trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8),
      enchantIds: srv.all.filter((l) => /\[EtimInit\] enchant/.test(l)).map(stripPrefix),
      potion: srv.all.filter((l) => /\[EtimInit\] potion/.test(l)).map(stripPrefix),
      jarTask: srv.all.filter((l) => /^> Task :[A-Za-z]*(jar|Jar|classes|compileJava)\b/.test(l)),
    };
    log('boot', `Done — ${ev.boot.ready} @ ${ev.boot.readyTs} (idx ${ev.boot.readyIdx})`);
    log('boot', 'ids: ' + JSON.stringify(ev.boot.enchantIds));

    /* 5 条新附魔的运行时数字 id（NBT 装填用） */
    const idLine = ev.boot.enchantIds.find((l) => /ids=/.test(l)) || '';
    const idm = /ids=(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/.exec(idLine);
    if (!idm) throw new Error('cannot parse [EtimInit] enchant ids: ' + idLine);
    ev.ids = { speed: +idm[1], regeneration: +idm[2], poison: +idm[3], true_flight: +idm[4], quickness: +idm[5] };
    log('boot', 'ids parsed ' + JSON.stringify(ev.ids));

    /* T8 首启面：boot 后 cfg（17 键落位） */
    ev.cfgAfterBoot = {
      bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      keys: (() => {
        const k = cfgKeys(CFG);
        const out = {};
        for (const name of Object.keys(CFG17)) out[name] = k[name] === undefined ? null : k[name];
        return out;
      })(),
    };
    snapshot(CFG, TAG + '-cfg.afterboot');
    ev.cfgClientAfterBoot = { bytes: fs.statSync(CFG_CLIENT).size, sha: sha256(fs.readFileSync(CFG_CLIENT)) };
    log('cfg', 'afterBoot=' + ev.cfgAfterBoot.bytes + '/' + ev.cfgAfterBoot.sha
      + ' keysMissing=' + Object.values(ev.cfgAfterBoot.keys).filter((v) => v === null).length);

    bot = await connectBot();
    try { bot.removeAllListeners('message'); } catch (e) { /* silence chat spam */ }
    try { bot.setQuickBarSlot(0); } catch (e) { /* older mineflayer */ }
    /* 位置交服务端权威：关掉 client 物理，否则 /tp 会被假人自己的移动包拽回出生点
       （本轮实测：tp 后 "moved too quickly" ⇒ 摔死 3 次，判点全在错位场地） */
    try { bot.physics.enabled = false; } catch (e) { /* older mineflayer */ }
    await sleep(400);
    srv.send(`op ${BOT}`);
    await sleep(700);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'naturalRegeneration true', 'randomTickSpeed 0', 'mobGriefing false', 'keepInventory true']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 0');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    /* 场地：以出生点为基准（高度上限未知 ⇒ 不冒险用 99 高台）。
       建 10x7 石台（by−1）+ 清 4 格空腔，假人站 (bx+0.5, by, bz+0.5)。 */
    const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
    const bx = Math.floor(p0.x);
    const by = Math.floor(p0.y);
    const bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz, spawn: { x: +p0.x.toFixed(2), y: +p0.y.toFixed(2), z: +p0.z.toFixed(2) } };
    for (let dx = -2; dx <= 7; dx++) {
      for (let dz = -3; dz <= 3; dz++) {
        srv.send(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:stone 0`);
        for (let dy = 0; dy < 4; dy++) srv.send(`setblock ${bx + dx} ${by + dy} ${bz + dz} minecraft:air 0`);
      }
    }
    await sleep(2500);
    let placed = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
      await sleep(1600);
      const p = bot.entity && bot.entity.position;
      placed = p ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), attempt } : null;
      log('setup', 'tp attempt ' + attempt + ' -> bot pos ' + JSON.stringify(placed));
      if (placed && Math.abs(placed.x - (bx + 0.5)) < 1.5 && Math.abs(placed.z - (bz + 0.5)) < 1.5 && placed.y > by - 2) break;
    }
    ev.setup = { botPos: placed };
    if (!placed || Math.abs(placed.x - (bx + 0.5)) > 1.5 || Math.abs(placed.z - (bz + 0.5)) > 1.5) {
      throw new Error('bot could not be staged at the arena: ' + JSON.stringify(placed));
    }
    log('setup', 'arena ready, bot at ' + JSON.stringify(placed));

    /* ======================= T1 ======================= */
    const W10 = caseMWindow(10, 5);
    const W20 = caseMWindow(20, 5);
    ev.t1 = { expect10: W10, expect20: W20, arms: [] };
    const T1_ARMS = [
      { id: 'feet-vanilla', slot: 'armor.feet', equip: 'feet', give: 'minecraft:iron_boots' },
      { id: 'feet-etim', slot: 'armor.feet', equip: 'feet', give: 'etim:boots_copper' },
      { id: 'chest-regen', slot: 'armor.chest', equip: 'chest', give: 'minecraft:iron_chestplate' },
      { id: 'mainhand-bow', slot: 'weapon.mainhand', equip: 'mainhand', give: 'minecraft:bow' },
      { id: 'rev-boots-in-hand', slot: 'weapon.mainhand', equip: 'mainhand', give: 'minecraft:iron_boots' },
      { id: 'rev-bow-on-feet', slot: 'armor.feet', equip: 'feet', give: 'minecraft:bow' },
    ];
    for (const arm of T1_ARMS) {
      srv.send(`replaceitem entity ${BOT} slot.${arm.slot} ${arm.give} 1 0`);
      await sleep(320);
      const p = await probe(srv, arm.equip, 'pool');
      const pick = (n) => {
        const r = regOf(p, n);
        return r ? { table: r.table, window: r.window, id: r.id, weight: r.weight, treasure: r.treasure } : null;
      };
      const row = {
        ...arm, item: p.pool.length ? p.pool[0].item : null,
        pool: p.pool.map((x) => ({ slot: x.slot, budget: x.budget, size: x.size })),
        poolE: p.poolE.length, regCount: p.reg.length,
        speed: pick('etim:speed'), regeneration: pick('etim:regeneration'),
        poison: pick('etim:poison'), true_flight: pick('etim:true_flight'), quickness: pick('etim:quickness'),
      };
      /* 窗口面：五条与案 M 复算逐字相等（与载体无关） */
      row.windowOk = {
        speed: !!row.speed && row.speed.window === W10,
        regeneration: !!row.regeneration && row.regeneration.window === W20,
        poison: !!row.poison && row.poison.window === W10,
        true_flight: !!row.true_flight && row.true_flight.window === W10,
        quickness: !!row.quickness && row.quickness.window === W10,
      };
      ev.t1.arms.push(row);
      log('t1', `${arm.id}: item=${row.item} reg=${row.regCount} speed=${row.speed && row.speed.table} regen=${row.regeneration && row.regeneration.table}`
        + ` poison=${row.poison && row.poison.table} tf=${row.true_flight && row.true_flight.table} quick=${row.quickness && row.quickness.table}`
        + ` pool=${JSON.stringify(row.pool.map((x) => [x.budget, x.size]))}`);
    }

    /* ======================= T2 ======================= */
    ev.t2 = { arms: [] };
    const speedNbt = `{ench:[{id:${ev.ids.speed},lvl:5}]}`;
    const t2Arms = [
      { label: 'L5-food', boots: speedNbt, food: '20 20', want: { lvl: 5, enchant: '1.25', hunger: '1.0', walk: '0.125' } },
      { label: 'L5-starve', boots: speedNbt, food: '0 0', want: { lvl: 5, enchant: '1.25', hunger: '0.75', walk: '0.09375' } },
      { label: 'L0-food', boots: null, food: '20 20', want: { lvl: 0, enchant: '1', hunger: '1.0', walk: '0.1' } },
    ];
    srv.send(`etest level 40 ${BOT}`);
    await sleep(400);
    for (const arm of t2Arms) {
      srv.send(`replaceitem entity ${BOT} slot.armor.feet minecraft:air 1 0`);
      if (arm.boots) srv.send(`replaceitem entity ${BOT} slot.armor.feet minecraft:iron_boots 1 0 ${arm.boots}`);
      srv.send(`etest food ${arm.food} ${BOT}`);
      await sleep(700);
      const m = await runMarked(srv, `etest enchantprobe feet mods ${BOT}`, 'mods');
      const seg = m.seg;
      let row = null;
      for (const raw of seg) {
        const mm = RE.mods.exec(raw);
        if (mm) { row = { lvl: +mm[1], enchant: mm[2], hunger: mm[3], walk: mm[4] }; break; }
      }
      const ok = !!row && row.lvl === arm.want.lvl && row.enchant === arm.want.enchant
        && row.hunger === arm.want.hunger && row.walk === arm.want.walk;
      ev.t2.arms.push({ ...arm, row, ok });
      log('t2', `${arm.label}: ${JSON.stringify(row)} ok=${ok}`);
    }
    srv.send(`replaceitem entity ${BOT} slot.armor.feet minecraft:air 1 0`);

    /* ======================= T6 quickness ======================= */
    ev.t6 = { arms: [], samples: [] };
    const bowOf = (lvl, extra) => {
      const list = [];
      if (lvl > 0) list.push(`{id:${ev.ids.quickness},lvl:${lvl}}`);
      if (extra) list.push(extra);
      return list.length ? `{ench:[${list.join(',')}]}` : '';
    };
    const holds = [50, 150, 300, 500, 650, 900];
    for (const lvl of [5, 1, 0]) {
      const nbt = bowOf(lvl, null);
      srv.send(`clear ${BOT}`);
      srv.send(nbt
        ? `replaceitem entity ${BOT} slot.hotbar.0 minecraft:bow 1 0 ${nbt}`
        : `replaceitem entity ${BOT} slot.hotbar.0 minecraft:bow 1 0`);
      srv.send(`give ${BOT} minecraft:arrow 24`);
      await sleep(500);
      const d = lvl > 0 ? 20 - Math.round(10 * (lvl / 5)) : 20;
      for (const hold of holds) {
        const from = srv.all.length;
        srv.send(`etest useitem ${BOT}`);
        await sleep(hold);
        srv.send(`etest release ${BOT}`);
        const rel = await srv.waitFor(RE.release, 6000, from);
        await sleep(160);
        if (!rel) { log('t6', `lvl=${lvl} hold=${hold}ms NO_RELEASE_ROW`); ev.t6.samples.push({ lvl, hold, row: null }); continue; }
        const mm = RE.release.exec(rel);
        const row = { lvl: +mm[4], charge: +mm[1], divisor: +mm[2], velocity: +mm[3] };
        const wantV = velocityOf(row.charge, d);
        row.expectDivisor = d;
        row.expectVelocity = +wantV.toFixed(4);
        row.match = row.lvl === lvl && row.divisor === d && Math.abs(row.velocity - row.expectVelocity) <= 0.0002;
        ev.t6.samples.push({ lvl, hold, row, raw: stripPrefix(rel) });
        log('t6', `lvl=${lvl} hold=${hold}ms -> charge=${row.charge} divisor=${row.divisor} velocity=${row.velocity} match=${row.match}`);
      }
      ev.t6.arms.push({ lvl, divisor: d, samples: ev.t6.samples.filter((s) => s.lvl === lvl).length });
    }
    srv.send(`clear ${BOT}`);

    /* ======================= T5 / T7 wander ======================= */
    ev.t5 = { arms: [] };
    const T5_ARMS = [
      { exp: 0, bow: 0, want: 5.0 },
      { exp: 0, bow: 5, want: 0.5556 },
      { exp: 0, bow: 1, want: 1.1657 },
      { exp: 40, bow: 0, want: 0.5556 },
    ];
    const AMMO = ['minecraft:arrow', 'etim:arrow_rusted_iron', 'minecraft:tipped_arrow'];
    for (const ammo of AMMO) {
      for (const arm of T5_ARMS) {
        srv.send(`etest level ${arm.exp} ${BOT}`);
        const tf = arm.bow > 0 ? `{ench:[{id:${ev.ids.true_flight},lvl:${arm.bow}}]}` : '';
        srv.send(`clear ${BOT}`);
        srv.send(tf
          ? `replaceitem entity ${BOT} slot.hotbar.0 minecraft:bow 1 0 ${tf}`
          : `replaceitem entity ${BOT} slot.hotbar.0 minecraft:bow 1 0`);
        srv.send(`give ${BOT} ${ammo} 1`);
        await sleep(650);
        const from = srv.all.length;
        srv.send(`etest useitem ${BOT}`);
        await sleep(950);
        srv.send(`etest release ${BOT}`);
        const shot = await srv.waitFor(RE.shot, 6000, from);
        await sleep(140);
        if (!shot) { log('t5', `${ammo} exp=${arm.exp} L${arm.bow} NO_SHOT_ROW`); ev.t5.arms.push({ ...arm, ammo, row: null }); continue; }
        const mm = RE.shot.exec(shot);
        const row = { wander: +mm[1], eff: +mm[2], exp: +mm[3], lvl: +mm[4] };
        row.match = Math.abs(row.wander - arm.want) <= 0.0006 && row.exp === arm.exp && row.lvl === arm.bow;
        ev.t5.arms.push({ ...arm, ammo, row, raw: stripPrefix(shot) });
        log('t5', `${ammo} exp=${arm.exp} L${arm.bow}: wander=${row.wander} eff=${row.eff} match=${row.match}`);
      }
    }
    /* T7：三箭族同臂读数 0 差（wander/eff 逐臂同值） */
    ev.t7 = { wanderDelta0: true, poisonDelta0: null, byArm: [] };
    for (const arm of T5_ARMS) {
      const rows = ev.t5.arms.filter((a) => a.ammo && a.exp === arm.exp && a.bow === arm.bow && a.row);
      const vals = [...new Set(rows.map((r) => r.row.wander + '/' + r.row.eff))];
      ev.t7.byArm.push({ exp: arm.exp, bow: arm.bow, ammoCount: rows.length, distinct: vals });
      if (rows.length !== 3 || vals.length !== 1) ev.t7.wanderDelta0 = false;
    }

    /* ======================= T4 poison ======================= */
    ev.t4 = { arms: [], target: null };
    srv.send(`clear ${BOT}`);
    srv.send(`effect ${BOT} minecraft:resistance 9999 4`);
    srv.send(`kill @e[type=cow]`);
    await sleep(600);
    const poisonNbt = `{ench:[{id:${ev.ids.poison},lvl:5},{id:${ev.ids.true_flight},lvl:5}]}`;
    for (const ammo of ['minecraft:arrow', 'etim:arrow_rusted_iron']) {
      srv.send(`etest level 0 ${BOT}`);
      srv.send(`clear ${BOT}`);
      srv.send(`replaceitem entity ${BOT} slot.hotbar.0 minecraft:bow 1 0 ${poisonNbt}`);
      srv.send(`give ${BOT} ${ammo} 8`);
      srv.send(`kill @e[type=cow]`);
      srv.send(`summon minecraft:cow ${bx + 5.5} ${by} ${bz + 0.5} {NoAI:1b,Silent:1b,Attributes:[{Name:"generic.maxHealth",Base:100.0}],Health:100.0f}`);
      /* 朝向 + 位置一律走服务端 /tp（yaw=−90 ⇒ 面向 +X，pitch=6 ⇒ 略俯视牛身），
         不依赖假人 look 包（关物理后客户端朝向不可靠） */
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} -90 6`);
      srv.send(`tp @e[type=cow] ${bx + 5.5} ${by} ${bz + 0.5}`);
      await sleep(1100);
      if (!ev.t4.target) {
        ev.t4.target = {
          summonOk: srv.all.some((l) => /Summoned new Cow/.test(l)),
          cowMoved: srv.all.filter((l) => /Teleported \d+ entit|Selector '@e\[type=cow\]' found nothing/.test(l)).slice(-1),
          summonErr: srv.all.filter((l) => /Entity type .* is invalid|Cannot summon|Unable to summon/.test(l)).slice(-2),
          botPos: bot.entity && bot.entity.position ? { x: +bot.entity.position.x.toFixed(2), y: +bot.entity.position.y.toFixed(2), z: +bot.entity.position.z.toFixed(2) } : null,
        };
        log('t4', 'target ' + JSON.stringify(ev.t4.target));
      }
      if (!ev.t4.target) {
        ev.t4.target = {
          summonOk: srv.all.some((l) => /Summoned new Cow/.test(l)),
          summonErr: srv.all.filter((l) => /Entity type .* is invalid|Cannot summon|Unable to summon/.test(l)).slice(-2),
          botPos: bot.entity && bot.entity.position ? { x: +bot.entity.position.x.toFixed(2), y: +bot.entity.position.y.toFixed(2), z: +bot.entity.position.z.toFixed(2) } : null,
        };
        log('t4', 'target ' + JSON.stringify(ev.t4.target));
      }
      let hitAt = -1;
      let attempt = 0;
      for (; attempt < 5 && hitAt < 0; attempt++) {
        const from = srv.all.length;
        srv.send(`etest useitem ${BOT}`);
        await sleep(1200);
        srv.send(`etest release ${BOT}`);
        const hit = await srv.waitFor(RE.poisonTick, 4000, from);
        if (hit) hitAt = from;
        else await sleep(300);
      }
      const arm = { ammo, attempts: attempt, hit: hitAt >= 0, ticks: [], raw: [] };
      if (hitAt >= 0) {
        await sleep(21000);
        for (let i = hitAt; i < srv.all.length; i++) {
          const raw = srv.all[i];
          const mm = RE.poisonTick.exec(raw);
          if (mm) {
            arm.ticks.push({ dmg: +mm[1], target: mm[2].trim(), health: +mm[3] });
            arm.raw.push(stripPrefix(raw));
          }
        }
      }
      ev.t4.arms.push(arm);
      log('t4', `${ammo}: hit=${arm.hit} attempts=${arm.attempts} ticks=${arm.ticks.length} healths=${arm.ticks.map((t) => t.health).join('>')}`);
    }
    if (ev.t4.arms.length === 2 && ev.t4.arms.every((a) => a.hit)) {
      const a = ev.t4.arms[0].ticks.length;
      const b = ev.t4.arms[1].ticks.length;
      ev.t7.poisonDelta0 = a === b && a > 0;
    }
    srv.send(`kill @e[type=cow]`);

    /* ======================= T3 regeneration ======================= */
    ev.t3 = { arms: [] };
    srv.send(`etest level 40 ${BOT}`);
    await sleep(400);
    const regenArms = [
      { label: 'L0', chest: '', want: '1' },
      { label: 'L5', chest: `{ench:[{id:${ev.ids.regeneration},lvl:5}]}`, want: '3.5' },
    ];
    for (const arm of regenArms) {
      srv.send(`replaceitem entity ${BOT} slot.armor.chest minecraft:air 1 0`);
      srv.send(arm.chest
        ? `replaceitem entity ${BOT} slot.armor.chest minecraft:iron_chestplate 1 0 ${arm.chest}`
        : `replaceitem entity ${BOT} slot.armor.chest minecraft:iron_chestplate 1 0`);
      await sleep(600);
      const from = srv.all.length;
      const rows = [];
      let cursor = from;
      const deadline = Date.now() + 230000;
      let lastFeed = 0;
      while (Date.now() < deadline && rows.length < 2) {
        if (Date.now() - lastFeed > 4000) {
          /* 每 4s 双保险：喂满 + 压血（level 变更触发的 cap 补血会把 health 顶满 ⇒ shouldHeal false） */
          srv.send(`etest food 20 20 ${BOT}`);
          srv.send(`etest health 6 ${BOT}`);
          lastFeed = Date.now();
        }
        while (cursor < srv.all.length) {
          const raw = srv.all[cursor++];
          const mm = RE.healed.exec(raw);
          if (mm) {
            rows.push({ health: +mm[1], nutrition: +mm[2], regenFactor: mm[3], raw: stripPrefix(raw) });
            log('t3', `${arm.label}: healed row health=${mm[1]} nutrition=${mm[2]} regenFactor=${mm[3]}`);
          }
        }
        await sleep(500);
      }
      const ok = rows.length >= 2 && rows.every((r) => r.regenFactor === arm.want);
      ev.t3.arms.push({ label: arm.label, chest: arm.chest || '(plain)', want: arm.want, rows, ok });
      log('t3', `${arm.label}: rows=${rows.length} ok=${ok}`);
    }
    srv.send(`replaceitem entity ${BOT} slot.armor.chest minecraft:air 1 0`);

    /* ======================= 收尾统计 ======================= */
    ev.rowCounts = {
      enchant: srv.all.filter((l) => /\[EnchantLog\]/.test(l)).length,
      arrow: srv.all.filter((l) => /\[ArrowLog\]/.test(l)).length,
      food: srv.all.filter((l) => /\[FoodLog\]/.test(l)).length,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
    };
    ev.staticChecks = staticChecks(ev);
    log('counts', JSON.stringify(ev.rowCounts));
    log('static', JSON.stringify(ev.staticChecks.bytecode || {}));

    /* 停服 */
    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    ev.jarUpToDate = ((ev.boot && ev.boot.jarTask) || []).filter((l) => /UP-TO-DATE/.test(l)).length === 3;
  } finally {
    try { if (bot) { bot.quit(); } } catch (e) { /* gone */ }

    /* cfg / props 回填（钉值复位） */
    if (ev.cfgSnap && ev.cfgClientSnap && ev.propsSnap) {
      fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnap.path));
      fs.writeFileSync(CFG_CLIENT, fs.readFileSync(ev.cfgClientSnap.path));
      fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnap.path));
      const cfgBack = fs.readFileSync(CFG);
      const cfgCBack = fs.readFileSync(CFG_CLIENT);
      const propsBack = fs.readFileSync(PROPS);
      ev.cfgClose = {
        bytes: cfgBack.length, sha: sha256(cfgBack),
        identical: sha256(cfgBack) === PIN.cfg.sha && cfgBack.length === PIN.cfg.bytes,
        sameAsStart: sha256(cfgBack) === ev.cfgSnap.sha,
      };
      ev.cfgClientClose = {
        bytes: cfgCBack.length, sha: sha256(cfgCBack),
        identical: sha256(cfgCBack) === PIN.cfgClient.sha && cfgCBack.length === PIN.cfgClient.bytes,
        sameAsStart: sha256(cfgCBack) === ev.cfgClientSnap.sha,
      };
      ev.propsClose = { bytes: propsBack.length, sha: sha256(propsBack), identical: sha256(propsBack) === PIN.props.sha };
    }

    const dir = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      ev.worldRemoved = !fs.existsSync(dir);
    } else {
      ev.worldRemoved = true;
    }

    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = {
      devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts(),
    };
  }

  ev.finishedAt = new Date().toISOString();
  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 1) + '\n', 'utf8');
  log('evidence', file + ' (' + fs.statSync(file).size + ' B)');
  log('DONE');
  process.exit(0);
}

/* ============================ 静态 / 字节码亲锤 ============================ */

function readText(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return ''; }
}

function staticChecks(ev) {
  const out = {};
  const cmd = readText('src/main/java/io/github/etim/etim/commands/CommandDevTest.java');
  out.commandDevTest = {
    hasModsArm: /"mods"\.equals\(src\)/.test(cmd),
    modsRow: /\[EnchantLog\] mods slot=feet lvl=\{\} enchant=\{\} hunger=\{\} walk=\{\}/.test(cmd),
    poolArm: /executeEnchantPoolProbe/.test(cmd),
  };
  const cfg = readText('src/main/java/io/github/etim/etim/ETIMConfig.java');
  out.cfgKeysStatic = Object.keys(CFG17).map((k) => ({
    key: k, declared: new RegExp('public static \\w+ ' + k + ' =').test(cfg),
    registered: new RegExp('"?' + k + '"?,\\s*"combat"').test(cfg),
  }));
  const en = readText('src/main/java/io/github/etim/etim/mining/ETIMEnchantments.java');
  out.registrations = ['speed', 'regeneration', 'poison', 'true_flight', 'quickness'].map((n) => ({
    name: n, registered: new RegExp('"' + n + '"').test(en),
  }));
  out.potion = /ETIMPotionPoison\.register\(\)/.test(en);

  /* 字节码：transform 后类里的注入是否真挂（@ModifyVariable 为内联，故按符号判；@Inject/@Redirect 按 handler 名判） */
  const clsPath = (rel) => path.join(MIXIN_OUT, ...rel.split('/')) + '.class';
  const javapText = (rel) => {
    const f = clsPath(rel);
    if (!fs.existsSync(f) || !fs.existsSync(JAVAP)) return null;
    return execFileSync(JAVAP, ['-p', '-c', f], { encoding: 'utf8', maxBuffer: 96 * 1024 * 1024 });
  };
  const bodyOf = (txt, sig) => {
    if (!txt) return '';
    const lines = txt.split(/\r?\n/);
    const i = lines.findIndex((l) => l.includes(sig));
    if (i < 0) return '';
    let j = lines.length;
    for (let k = i + 1; k < lines.length; k++) {
      if (/^  (public|private|protected|static|final)/.test(lines[k])) { j = k; break; }
    }
    return lines.slice(i, j).join('\n');
  };
  try {
    const arrow = javapText('net/minecraft/entity/projectile/EntityArrow');
    const bow = javapText('net/minecraft/item/ItemBow');
    const player = javapText('net/minecraft/entity/player/EntityPlayer');
    const shootBody = bodyOf(arrow, 'public void shoot(');
    const hitBody = bodyOf(arrow, 'protected void arrowHit(');
    const bowBody = bodyOf(bow, 'public void onPlayerStoppedUsing(');
    out.bytecode = {
      classesExported: { entityArrow: !!arrow, itemBow: !!bow, entityPlayer: !!player },
      entityArrowShootFace: /ETIMArrowAccuracyEvent|trueFlightBonusLevels/.test(shootBody),
      entityArrowShootWanderInline: /Math\.pow/.test(shootBody) && /ETIMArrowLog|ETIMConfig/.test(shootBody),
      entityArrowArrowHitCallsPoisonInject: /bowPoisonApply/.test(hitBody),
      entityArrowHasPoisonApplySymbol: /ETIMPotionPoison/.test(arrow || ''),
      itemBowStopCallsStash: /stashReleaseBow/.test(bowBody),
      itemBowStopCallsQuickness: /quicknessVelocity/.test(bowBody),
      itemBowQuicknessKeepsVanillaPath: /ItemBow\.getArrowVelocity/.test(bow || ''),
      entityPlayerHasSpeedFactor: /ETIMConfig\.speedPerLevel/.test(player || ''),
      entityPlayerHasSpeedEnchantRead: /getMaxEnchantmentLevel/.test(player || ''),
    };
    out.bytecodeFiles = {
      entityArrow: arrow ? fs.statSync(clsPath('net/minecraft/entity/projectile/EntityArrow')).size : null,
      itemBow: bow ? fs.statSync(clsPath('net/minecraft/item/ItemBow')).size : null,
      entityPlayer: player ? fs.statSync(clsPath('net/minecraft/entity/player/EntityPlayer')).size : null,
    };
  } catch (e) {
    out.bytecode = { error: String((e && e.message) || e) };
  }
  return out;
}

main().catch((e) => { log('boot', 'FATAL:', (e && e.stack) || e); process.exit(1); });
