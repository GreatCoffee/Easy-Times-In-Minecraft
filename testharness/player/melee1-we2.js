#!/usr/bin/env node
/**
 * melee1-we2.js — melee1 批（B2 三条：stun / vampiric / disarming）W-E2 判窗驱动
 *
 * 判决源：条 249（批成立）／melee1-对照报告 faces=10（会话六）／条 250（D 位六问）
 *   ／条 251（终审放行 T-1..T-5）／条 252（落码 e284a0d）
 *
 * 判点（T1..T10 + T-CFG）：
 *   T1  载体门 12 臂（enchantprobe mainhand pool → table= 列）
 *   T2  案 M 窗口（diff15/20/10 → 复算逐字比较）＋ enchant1 五条窗照读
 *   T3  stun 频率窗 N=200 × L1..L5（P=L/10，±3σ）
 *   T4  减速出口：stun 行 amp 列（6×L）＋ 追逐体位移观测（辅助）
 *   T5  vampiric 频率窗 N=200 × L1..L5（P=L/10，±3σ）＋ transfer 两端对账
 *   T6  亡灵负证：zombie 50 刀 vampiric 行 = 0；stun 行 > 0
 *   T7  镰磨损：[MiningLog] decay face=attacking loss=100（有 vampiric）⇔ 400
 *   T8  缴械清手：L5 必中（dropped/cleared/lock=40）＋ L1 快败行（dropped=false）
 *   T9  40t 锁＋NBT 持窗：锁中再攻 held=none（未回拾）；锁后 held=iron_sword（回拾）
 *   T10 mob 侧正证：mob 持 stun 锤 → bot 被定身行；mob 持 vampiric → mob hp 回升行
 *   T-CFG 14 键首启（预飞 boot 已观测落位；本窗复核值面）
 *
 * 用法：node melee1-we2.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'melee1-we2';
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

const WORLD = 'melee1we2';
const PORT = 25565;
const BOT = 'ETIM_WE2';

/** 起收钉（条 252 落码 e284a0d） */
const PIN = {
  head: 'e284a0d',
  rel: { bytes: 850509, sha: '4C02B995E2B428785F4C4D51C9298A14FEEAC55CCDAC2C8FBF6188621912DDC7' },
  dev: { bytes: 833524, sha: '45F6B9584C7209D6816B1F89C6F82EE0D3C9515473735905AC57BF4FB04BD2B3' },
  src: { bytes: 779491, sha: '08958D1820C7F3757E73DAE5C05E9CE88DD6BE6DD3C630F89C822E23FB15D1DC' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
  cfgBefore: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
};
const MK_PIN = { mixins: 61, client: 10, refmapClasses: 67, refmapEntries: 302, melee: 3, container: 3, arrow: 2, bow: 2 };

const CFG14 = {
  stunDifficulty: '15', vampiricDifficulty: '20', disarmingDifficulty: '10',
  stunMaxLevel: '5', vampiricMaxLevel: '5', disarmingMaxLevel: '5',
  stunChanceDivisor: '10', stunDurationPerLevel: '50', stunAmplifierPerLevel: '6',
  vampiricChanceDivisor: '10', vampiricTransferFactor: '0.5', vampiricMinTransfer: '1',
  disarmLockTicks: '40', meleeDebugLog: 'true',
};

const RE = {
  done: /Done \(/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException|MixinApplyError|Critical injection failure/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,
  pool: /\[EnchantLog\] pool slot=(\d+) budget=(-?\d+) size=(\d+) item=(\S+)/,
  stun: /\[MeleeLog\] stun lvl=(\d+) roll=([\d.]+) need=(\d+) amp=(\d+) dur=(\d+)/,
  vamp: /\[MeleeLog\] vampiric lvl=(\d+) gate=([\d.]+) dmg=([\d.]+) transfer=(\d+)(?: hp=([\d.]+))?/,
  vampFail: /\[MeleeLog\] vampiric lvl=(\d+) gate=([\d.]+) dmg=([\d.]+) transfer=0/,
  disarm: /\[MeleeLog\] disarm lvl=(\d+) (?:roll=([\d.]+) )?held=(\S+) dropped=(true|false)(?: cleared=(true|false) lock=(\d+))?/,
  melee: /\[MeleeLog\] melee target=(\S+) lvl_stun=(\d+) lvl_vamp=(\d+) lvl_disarm=(\d+) harmed=(true|false)/,
  decay: /\[MiningLog\] tool decay face=(\S+) item=(\S+).* loss=(-?\d+)/,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '')
  .replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '')
  .replace(/^\[Server[^\]]*\]\s*/, '');
const logTime = (l) => { const m = /^\[(\d{2}:\d{2}:\d{2})\]/.exec(l || ''); return m ? m[1] : null; };

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}
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
function pinOf(file, pin, label) {
  if (!fs.existsSync(file)) throw new Error(label + ' missing: ' + file);
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}
function snapshot(file, name) {
  const buf = fs.readFileSync(file);
  const dest = path.join(OUT, name);
  fs.writeFileSync(dest, buf);
  return { path: dest, bytes: buf.length, sha: sha256(buf) };
}
function crashCount() {
  const dir = path.join(ROOT, 'run', 'crash-reports');
  try { return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).length; }
  catch (e) { return -1; }
}
function netstatListen(port) {
  try {
    const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    return out.split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) { return -1; }
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
    out[key].slices = { meleePlayer: cnt('MixinEntityPlayerMelee'), meleeMob: cnt('MixinEntityMobMelee'),
      disarm: cnt('MixinEntityLivingDisarm') };
    out[key].sliceTotal = out[key].slices.meleePlayer + out[key].slices.meleeMob;
    out[key].containerEnchant = cnt('MixinContainerEnchantment');
    out[key].arrow = cnt('MixinEntityArrow');
    out[key].bow = cnt('MixinItemBow');
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  const R = out.refmapResources;
  out.ok = R.classes === MK_PIN.refmapClasses && R.entries === MK_PIN.refmapEntries
    && out.refmapTmp.classes === MK_PIN.refmapClasses && out.refmapTmp.entries === MK_PIN.refmapEntries
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client
    && R.slices.disarm === 4 && R.slices.meleePlayer >= 1 && R.slices.meleeMob >= 1;
  return out;
}

/** 案 M 窗口复算（ETIMMiteEnchantment:36-50） */
function caseMWindow(diff, maxLevel) {
  const min = (L) => Math.max(diff - 10, 0) + diff * (L - 1) + 1;
  const parts = [];
  for (let L = 1; L <= maxLevel; L++) {
    const mx = L >= maxLevel ? 999 : min(L + 1) - 1;
    parts.push('L' + L + '=' + min(L) + '/' + mx);
  }
  return parts.join(' ');
}
/** 二项 3σ 带 */
function binomBand(p, n) {
  const s = Math.sqrt(Math.max(p * (1 - p), 1e-9) / n);
  return { p, n, sigma: s, lo: Math.max(0, p - 3 * s), hi: Math.min(1, p + 3 * s) };
}

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

/* ============================ 主流程 ============================ */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, window: 'W-E2 T1..T10 + T-CFG', executedBy: 'session7',
    startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, bootCount: 1, clients: 0,
  };

  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.mk = mkCounts();
  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);
  ev.pins.gitStatus = execFileSync('git', ['status', '--porcelain'], { cwd: ROOT, encoding: 'utf8' }).trim();
  log('pin', 'HEAD=' + head + ' ' + (ev.headOk ? 'OK' : 'MISMATCH'));
  for (const k of ['devJar', 'relJar', 'srcJar', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha.slice(0, 16)} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk));
  if (!ev.headOk || !ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('pin mismatch before window');

  /* 快照（cfg 已在预飞 boot 落 14 键；此处起值 = 38,271 材料化态） */
  ev.cfgSnap = snapshot(CFG, TAG + '-cfg.before');
  ev.cfgClientSnap = snapshot(CFG_CLIENT, TAG + '-cfgClient.before');
  ev.propsSnap = snapshot(PROPS, TAG + '-props.before');
  ev.cfgKeysBefore = Object.keys(cfgKeys(CFG)).length;

  /* 判据通道开闸 */
  const g0 = cfgKeys(CFG);
  ev.gates = { meleeBefore: g0.meleeDebugLog, mining: g0.miningDebugLog, arrow: g0.arrowDebugLog, food: g0.foodDebugLog };
  if (g0.meleeDebugLog !== 'true') setCfgValue(CFG, 'meleeDebugLog', 'true');
  ev.gates.meleeAfter = cfgKeys(CFG).meleeDebugLog;
  ev.cfgGated = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  log('gate', JSON.stringify(ev.gates) + ' cfg=' + ev.cfgGated.bytes + '/' + ev.cfgGated.sha.slice(0, 16));

  fs.writeFileSync(PROPS, setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG + '-session-1' });
  let bot = null;
  const bxRef = { bx: 0, by: 64, bz: 0 };
  try {
    const done = await waitReady(srv, TAG);
    if (!done) throw new Error('server never reached Done( within 480s');
    ev.boot = {
      ready: strip(done).trim(), readyTs: logTime(done), readyIdx: srv.all.indexOf(done) + 1,
      buildLine: (srv.all.find((l) => /BUILD SUCCESSFUL|BUILD FAILED/.test(l)) || '').trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8),
      enchantIds: srv.all.filter((l) => /\[EtimInit\] enchant/.test(l)).map(strip),
      jarTask: srv.all.filter((l) => /^> Task :[A-Za-z]*(jar|Jar|classes|compileJava)\b/.test(l)),
    };
    log('boot', `Done — ${ev.boot.ready} @ ${ev.boot.readyTs} (idx ${ev.boot.readyIdx})`);
    log('boot', 'ids: ' + ev.boot.enchantIds.join(' || '));

    const idLine = ev.boot.enchantIds.find((l) => /\bids=/.test(l)) || '';
    const idm = /ids=([\d\s]+)/.exec(idLine);
    if (!idm) throw new Error('cannot parse [EtimInit] enchant ids: ' + idLine);
    const ids = idm[1].trim().split(/\s+/).map(Number);
    ev.ids = { all: ids, speed: ids[0], regeneration: ids[1], poison: ids[2],
      true_flight: ids[3], quickness: ids[4], stun: ids[5], vampiric: ids[6], disarming: ids[7] };
    log('boot', 'ids parsed ' + JSON.stringify(ev.ids));

    /* T-CFG：14 键值面（预飞已首启落位；本窗复核） */
    const ck = cfgKeys(CFG);
    ev.cfgFace = {
      bytesBefore: ev.cfgSnap.bytes, keysBefore: ev.cfgKeysBefore,
      keys: Object.fromEntries(Object.keys(CFG14).map((k) => [k, ck[k] === undefined ? null : ck[k]])),
      keyCount: Object.keys(ck).length,
    };
    ev.cfgFace.mismatch = Object.entries(CFG14).filter(([k, v]) => ev.cfgFace.keys[k] !== v).map(([k]) => k);
    log('cfg', 'keys=' + ev.cfgFace.keyCount + ' mismatch=' + JSON.stringify(ev.cfgFace.mismatch));

    bot = await connectBot();
    try { bot.removeAllListeners('message'); } catch (e) { /* silence */ }
    try { bot.physics.enabled = false; } catch (e) { /* older mineflayer */ }
    try { bot.setQuickBarSlot(0); } catch (e) { /* older mineflayer */ }
    await sleep(400);
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'keepInventory true', 'mobGriefing true', 'naturalRegeneration false', 'randomTickSpeed 0']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 18000'); // 夜：召唤僵尸不因日光起火（预飞实测：白天 mob 侧会把 bot 烧死）
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    srv.send(`effect ${BOT} minecraft:fire_resistance 99999 0`);

    /* 场地（出生点基准；预飞同址） */
    const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
    const bx = Math.floor(p0.x), by = Math.floor(p0.y), bz = Math.floor(p0.z);
    Object.assign(bxRef, { bx, by, bz });
    ev.arena = { bx, by, bz, spawn: { x: +p0.x.toFixed(2), y: +p0.y.toFixed(2), z: +p0.z.toFixed(2) } };
    for (let dx = -5; dx <= 6; dx++) {
      for (let dz = -5; dz <= 5; dz++) {
        srv.send(`setblock ${bx + dx} ${by - 1} ${bz + dz} minecraft:stone 0`);
        for (let dy = 0; dy < 4; dy++) srv.send(`setblock ${bx + dx} ${by + dy} ${bz + dz} minecraft:air 0`);
      }
    }
    await sleep(2600);
    let placed = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
      await sleep(1300);
      const p = bot.entity && bot.entity.position;
      placed = p ? { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), attempt } : null;
      if (placed && Math.abs(placed.x - (bx + 0.5)) < 1.5 && Math.abs(placed.z - (bz + 0.5)) < 1.5) break;
    }
    ev.setup = { botPos: placed };
    if (!placed || Math.abs(placed.x - (bx + 0.5)) > 1.5 || Math.abs(placed.z - (bz + 0.5)) > 1.5) {
      throw new Error('bot could not be staged at the arena: ' + JSON.stringify(placed));
    }
    log('setup', 'arena ' + JSON.stringify(ev.arena) + ' bot=' + JSON.stringify(placed));

    const stage = (item, nbt) => {
      srv.send(nbt
        ? `replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0 ${nbt}`
        : `replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
    };
    const enchNbt = (id, lvl) => `{ench:[{id:${id},lvl:${lvl}}]}`;
    const killAll = async (types) => {
      for (const t of types) srv.send(`kill @e[type=${t}]`);
      await sleep(500);
    };

    /* ======================= T1 载体门 ======================= */
    ev.t1 = { arms: [] };
    const t1Arms = [
      { id: 'warhammer-copper', item: 'etim:war_hammer_copper', want: { stun: true } },
      { id: 'iron-pickaxe', item: 'minecraft:iron_pickaxe', want: {} },
      { id: 'iron-sword', item: 'minecraft:iron_sword', want: { vampiric: true, disarming: true } },
      { id: 'dagger-copper', item: 'etim:dagger_copper', want: { vampiric: true, disarming: false } },
      { id: 'sword-silver', item: 'etim:sword_silver', want: { vampiric: false } },
      { id: 'dagger-silver', item: 'etim:dagger_silver', want: { vampiric: false } },
      { id: 'scythe-silver', item: 'etim:scythe_silver', want: { vampiric: false } },
      { id: 'sword-mithril', item: 'etim:sword_mithril', want: { vampiric: false } },
      { id: 'dagger-mithril', item: 'etim:dagger_mithril', want: { vampiric: false } },
      { id: 'scythe-mithril', item: 'etim:scythe_mithril', want: { vampiric: false } },
      { id: 'scythe-copper', item: 'etim:scythe_copper', want: { vampiric: true } },
      { id: 'sword-copper', item: 'etim:sword_copper', want: { vampiric: true, disarming: true } },
    ];
    const W15 = caseMWindow(15, 5), W20 = caseMWindow(20, 5), W10 = caseMWindow(10, 5);
    const W10e = caseMWindow(10, 5);
    for (const arm of t1Arms) {
      srv.send(`clear ${BOT}`);
      stage(arm.item);
      await sleep(420);
      const from = srv.all.length;
      srv.send(`etest enchantprobe mainhand pool ${BOT}`);
      await sleep(760);
      const seg = srv.all.slice(from);
      const rows = {};
      for (const raw of seg) {
        const m = RE.reg.exec(raw);
        if (m) rows[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', window: m[6].trim() };
      }
      const pick = (n) => rows['etim:' + n] || null;
      const row = {
        id: arm.id, item: arm.item,
        stun: pick('stun'), vampiric: pick('vampiric'), disarming: pick('disarming'),
        speed: pick('speed'), regeneration: pick('regeneration'), poison: pick('poison'),
        true_flight: pick('true_flight'), quickness: pick('quickness'),
        regCount: Object.keys(rows).length,
        poolRows: seg.filter((l) => RE.pool.test(l)).map((l) => { const m = RE.pool.exec(l); return [+m[1], +m[2], +m[3]]; }),
      };
      row.gateOk = Object.entries(arm.want).every(([k, v]) => !!row[k] && row[k].table === v);
      row.windowOk = {
        stun: !!row.stun && row.stun.window === W15,
        vampiric: !!row.vampiric && row.vampiric.window === W20,
        disarming: !!row.disarming && row.disarming.window === W10,
      };
      row.enchant1Windows = {
        speed: !!row.speed && row.speed.window === W10e,
        regeneration: !!row.regeneration && row.regeneration.window === W20,
        poison: !!row.poison && row.poison.window === W10e,
        true_flight: !!row.true_flight && row.true_flight.window === W10e,
        quickness: !!row.quickness && row.quickness.window === W10e,
      };
      ev.t1.arms.push(row);
      log('t1', `${arm.id}: stun=${row.stun && row.stun.table} vamp=${row.vampiric && row.vampiric.table} disarm=${row.disarming && row.disarming.table}`
        + ` regs=${row.regCount} gateOk=${row.gateOk} win=${JSON.stringify(row.windowOk)}`);
    }
    ev.t2 = { W15, W20, W10,
      windowsOk: ev.t1.arms.every((a) => Object.values(a.windowOk).every(Boolean)),
      enchant1Ok: ev.t1.arms.every((a) => Object.values(a.enchant1Windows).every(Boolean)) };
    log('t2', 'windowsOk=' + ev.t2.windowsOk + ' enchant1Ok=' + ev.t2.enchant1Ok);

    /* ======================= 环阵工具 ======================= */
    const EYE = by + 1.62;
    /** 瞄准角：yaw = atan2(-dx, dz)（0=+Z 南，−90=+X 东）；pitch 正=向下 */
    const aimOf = (tx, tz, centerY) => {
      const px = bx + 0.5, pz = bz + 0.5;
      const dx = tx - px, dz = tz - pz;
      const horiz = Math.max(Math.hypot(dx, dz), 0.4);
      return {
        yaw: +(Math.atan2(-dx, dz) * 180 / Math.PI).toFixed(1),
        pitch: +(Math.atan2(EYE - centerY, horiz) * 180 / Math.PI).toFixed(1),
        dist: +horiz.toFixed(2),
      };
    };
    const aimSend = (aim) => {
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} ${aim.yaw} ${aim.pitch}`);
    };
    const ringNbt = (tagName, extra) => `{NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["${tagName}"],`
      + 'Attributes:[{Name:"generic.maxHealth",Base:3000.0},{Name:"generic.knockbackResistance",Base:1.0}],'
      + 'Health:3000.0f' + (extra ? ',' + extra : '') + '}';
    async function spawnRing(kind, n, prefix, extra, centerY) {
      const targets = [];
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n;
        const tagName = `${prefix}${i}`;
        const x = +(bx + 0.5 + 2.2 * Math.cos(a)).toFixed(2);
        const z = +(bz + 0.5 + 2.2 * Math.sin(a)).toFixed(2);
        targets.push({ tag: tagName, x, z, ...aimOf(x, z, centerY) });
        srv.send(`summon ${kind} ${x} ${by} ${z} ${ringNbt(tagName, extra)}`);
      }
      await sleep(900);
      return targets;
    }
    /** 轮转攻击：每 10 刀重挂武器（ETIM 攻击磨损会打碎工具）；每刀先 /tp 定朝向（服务端 reach 校验按视轴判定） */
    async function attackRing(targets, hits, item, nbt, onTick) {
      const from = srv.all.length;
      for (let i = 0; i < hits; i++) {
        if (i % 10 === 0) stage(item, nbt);
        if (i > 0 && i % 40 === 0) {
          /* 复位环阵：实体碰撞会把 NoAI 牛群挤开，逐 40 刀把位置钉回（reach 2.5 上界） */
          for (const t of targets) srv.send(`tp @e[tag=${t.tag},c=1] ${t.x} ${by} ${t.z}`);
          await sleep(180);
        }
        const t = targets[i % targets.length];
        aimSend(t);
        srv.send(`etest attack @e[tag=${t.tag},c=1] ${BOT}`);
        await sleep(58);
        if (onTick && i % 40 === 0) await onTick(i);
      }
      await sleep(400);
      return from;
    }
    const rowsSince = (from) => srv.all.slice(from);

    /* ======================= T3 stun 频率窗 ======================= */
    ev.t3 = { arms: [] };
    srv.send(`etest level 40 ${BOT}`);
    for (const lvl of [1, 2, 3, 4, 5]) {
      await killAll(['cow']);
      const tags = await spawnRing('minecraft:cow', 12, `t3c${lvl}_`, null, by + 0.7);
      const from = await attackRing(tags, 200, 'etim:war_hammer_copper', enchNbt(ev.ids.stun, lvl));
      const seg = rowsSince(from);
      const hits = seg.filter((l) => { const m = RE.melee.exec(l); return m && +m[2] === lvl && m[5] === 'true'; }).length;
      const stunRows = [];
      for (const l of seg) {
        const m = RE.stun.exec(l);
        if (m && +m[1] === lvl) stunRows.push({ roll: +m[2], need: +m[3], amp: +m[4], dur: +m[5] });
      }
      const pass = stunRows.filter((r) => r.amp > 0);
      const band = binomBand(lvl / 10, 200);
      const rate = pass.length / Math.max(stunRows.length, 1);
      const ampSet = [...new Set(pass.map((r) => r.amp))];
      const durSet = [...new Set(pass.map((r) => r.dur))];
      const row = {
        lvl, hits, rows: stunRows.length, pass: pass.length, rate: +rate.toFixed(4),
        expect: lvl / 10, band: { lo: +band.lo.toFixed(4), hi: +band.hi.toFixed(4) },
        ampSet, durSet,
        ampOk: ampSet.length === 1 && ampSet[0] === 6 * lvl,
        durOk: durSet.length === 1 && durSet[0] === 50 * lvl,
        rateOk: rate >= band.lo && rate <= band.hi && stunRows.length >= 195 && stunRows.length === hits,
        sampleRolls: stunRows.slice(0, 3).map((r) => r.roll),
      };
      ev.t3.arms.push(row);
      log('t3', `L${lvl}: rows=${stunRows.length} pass=${pass.length} rate=${row.rate} band=[${row.band.lo},${row.band.hi}] amp=${JSON.stringify(ampSet)} dur=${JSON.stringify(durSet)} ok=${row.rateOk && row.ampOk && row.durOk}`);
    }

    /* ======================= T4 减速出口（amp 列 + 位移观测） ======================= */
    ev.t4 = { amps: ev.t3.arms.map((a) => ({ lvl: a.lvl, amp: a.ampSet, dur: a.durSet })), walk: null };
    await killAll(['cow', 'zombie']);
    /* 辅助位移观测：僵尸追 bot（NoAI=0），stun 命中后 4s 内不再接近 */
    srv.send(`summon minecraft:zombie ${bx + 6.5} ${by} ${bz + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["t4z"],Attributes:[{Name:"generic.maxHealth",Base:200.0},{Name:"generic.followRange",Base:32.0}],Health:200.0f}`);
    await sleep(1200);
    const zpos = () => {
      const px = bx + 0.5, pz = bz + 0.5;
      const ents = Object.values(bot.entities || {})
        .filter((e) => e && typeof e.name === 'string' && /zombie/i.test(e.name))
        .filter((e) => Math.hypot(e.position.x - px, e.position.z - pz) < 14)
        .sort((a, b) => Math.hypot(a.position.x - px, a.position.z - pz) - Math.hypot(b.position.x - px, b.position.z - pz));
      if (!ents.length) return null;
      const p = ents[0].position;
      return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2), name: ents[0].name };
    };
    const dist = (p) => (p ? +Math.hypot(p.x - (bx + 0.5), p.z - (bz + 0.5)).toFixed(2) : null);
    const before = [];
    for (let i = 0; i < 4; i++) { before.push(dist(zpos())); await sleep(700); }
    stage('etim:war_hammer_copper', enchNbt(ev.ids.stun, 5));
    let stunPass = false;
    for (let i = 0; i < 12 && !stunPass; i++) {
      srv.send(`etest health 20 ${BOT}`);
      const zp = zpos();
      if (zp) aimSend(aimOf(zp.x, zp.z, zp.y + 0.975));
      const from = srv.all.length;
      srv.send(`etest attack @e[tag=t4z,c=1] ${BOT}`);
      await sleep(750);
      stunPass = srv.all.slice(from).some((l) => { const m = RE.stun.exec(l); return m && +m[4] > 0; });
    }
    const after = [];
    for (let i = 0; i < 4; i++) { after.push(dist(zpos())); await sleep(700); }
    ev.t4.walk = { before, after, stunPass, closingBefore: before[0] - before[before.length - 1], closingAfter: after[0] - after[after.length - 1] };
    log('t4', 'amps=' + JSON.stringify(ev.t4.amps) + ' walk=' + JSON.stringify(ev.t4.walk));
    await killAll(['zombie']);

    /* ======================= T5 vampiric 频率窗 ======================= */
    ev.t5 = { arms: [] };
    srv.send(`etest food 0 0 ${BOT}`);
    for (const lvl of [1, 2, 3, 4, 5]) {
      await killAll(['cow']);
      const tags = await spawnRing('minecraft:cow', 12, `t5c${lvl}_`, null, by + 0.7);
      srv.send(`etest health 6 ${BOT}`);
      const from = await attackRing(tags, 200, 'etim:sword_copper', enchNbt(ev.ids.vampiric, lvl), async () => {
        srv.send(`etest health 6 ${BOT}`);
      });
      const seg = rowsSince(from);
      const hits = seg.filter((l) => { const m = RE.melee.exec(l); return m && +m[3] === lvl && m[5] === 'true'; }).length;
      const rows = [];
      for (const l of seg) {
        const m = RE.vamp.exec(l);
        if (m && +m[1] === lvl) rows.push({ gate: +m[2], dmg: +m[3], transfer: +m[4], hp: m[5] === undefined ? null : +m[5] });
      }
      const pass = rows.filter((r) => r.transfer > 0);
      const fail = rows.filter((r) => r.transfer === 0);
      const band = binomBand(lvl / 10, 200);
      const rate = pass.length / Math.max(rows.length, 1);
      /* 上限 = max(minTransfer, floor(dmg × factor))（min 钳位是产品语义，不是越界） */
      const capOf = (r) => Math.max(1, Math.floor(r.dmg * 0.5));
      const overCap = pass.filter((r) => r.transfer > capOf(r)).length;
      const underMin = pass.filter((r) => r.transfer < 1).length;
      const hpRise = [];
      const hpSeries = pass.map((r) => r.hp).filter((v) => v !== null);
      for (let i = 1; i < hpSeries.length; i++) if (hpSeries[i] > hpSeries[i - 1]) hpRise.push(i);
      const row = {
        lvl, hits, rows: rows.length, pass: pass.length, fail: fail.length, rate: +rate.toFixed(4), expect: lvl / 10,
        band: { lo: +band.lo.toFixed(4), hi: +band.hi.toFixed(4) },
        overCap, underMin, hpRiseCount: hpRise.length, hpFirstLast: [hpSeries[0] === undefined ? null : hpSeries[0], hpSeries[hpSeries.length - 1] === undefined ? null : hpSeries[hpSeries.length - 1]],
        transferRange: pass.length ? [Math.min(...pass.map((r) => r.transfer)), Math.max(...pass.map((r) => r.transfer))] : null,
        rateOk: rate >= band.lo && rate <= band.hi && rows.length >= 195 && rows.length === hits,
        capOk: overCap === 0 && underMin === 0,
      };
      ev.t5.arms.push(row);
      log('t5', `L${lvl}: hits=${hits} rows=${rows.length} pass=${pass.length} fail=${fail.length} rate=${row.rate} band=[${row.band.lo},${row.band.hi}] transfer=${JSON.stringify(row.transferRange)} overCap=${overCap} hpRise=${hpRise.length} ok=${row.rateOk && row.capOk}`);
    }

    /* ======================= T6 亡灵负证 ======================= */
    ev.t6 = { arms: [] };
    srv.send(`etest food 20 20 ${BOT}`);
    await killAll(['cow', 'zombie']);
    for (const face of ['vampiric', 'stun']) {
      const tags = await spawnRing('minecraft:zombie', 12, `t6${face}_`, null, by + 0.975);
      const item = face === 'vampiric' ? 'etim:sword_copper' : 'etim:war_hammer_copper';
      const from = await attackRing(tags, 50, item, enchNbt(ev.ids[face], 5));
      const seg = rowsSince(from);
      const hits = seg.filter((l) => { const m = RE.melee.exec(l); return m && m[5] === 'true'; }).length;
      const vampRows = seg.filter((l) => RE.vamp.exec(l) && +RE.vamp.exec(l)[1] === 5).length;
      const stunRows = seg.filter((l) => RE.stun.exec(l) && +RE.stun.exec(l)[1] === 5).length;
      ev.t6.arms.push({ face, hits, vampRows, stunRows });
      log('t6', `${face}: hits=${hits} vampRows=${vampRows} stunRows=${stunRows}`);
    }
    await killAll(['zombie']);

    /* ======================= T7 镰磨损 ======================= */
    ev.t7 = { rows: [] };
    await killAll(['cow']);
    srv.send(`summon minecraft:cow ${bx + 2.2} ${by} ${bz + 0.5} ${ringNbt('t7cow', null)}`);
    await sleep(800);
    const t7From = srv.all.length;
    aimSend(aimOf(bx + 2.2, bz + 0.5, by + 0.7));
    for (let i = 0; i < 10; i++) {
      const withVamp = i % 2 === 1;
      stage('etim:scythe_copper', withVamp ? enchNbt(ev.ids.vampiric, 5) : null);
      srv.send(`etest attack @e[tag=t7cow,c=1] ${BOT}`);
      await sleep(650);
    }
    await sleep(500);
    for (const l of rowsSince(t7From)) {
      const m = RE.decay.exec(l);
      if (m && m[1] === 'attacking') ev.t7.rows.push({ face: m[1], item: m[2], loss: +m[3] });
    }
    ev.t7.losses = ev.t7.rows.map((r) => r.loss);
    ev.t7.ok = ev.t7.losses.includes(100) && ev.t7.losses.includes(400);
    log('t7', JSON.stringify(ev.t7.losses) + ' ok=' + ev.t7.ok);
    await killAll(['cow']);

    /* ======================= T8/T9 缴械清手 + 40t 锁 ======================= */
    ev.t8 = { arms: [] };
    ev.t9 = { chain: [] };
    const disarmZombie = `summon minecraft:zombie ${bx + 2.2} ${by} ${bz + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,CanPickUpLoot:1b,Tags:["dzz"],`
      + 'HandItems:[{id:"minecraft:iron_sword",Count:1b},{}],'
      + 'Attributes:[{Name:"generic.maxHealth",Base:100.0}],Health:100.0f}';
    srv.send(disarmZombie);
    await sleep(900);
    aimSend(aimOf(bx + 2.2, bz + 0.5, by + 0.975));
    const t8From = srv.all.length;
    stage('etim:sword_copper', enchNbt(ev.ids.disarming, 5));
    srv.send(`etest attack @e[tag=dzz,c=1] ${BOT}`);
    await sleep(600);
    const disarmRows1 = [];
    for (const l of rowsSince(t8From)) {
      const m = RE.disarm.exec(l);
      if (m) disarmRows1.push({ lvl: +m[1], roll: m[2] === undefined ? null : +m[2], held: m[3], dropped: m[4] === 'true', cleared: m[5] === 'true', lock: m[6] === undefined ? null : +m[6] });
    }
    ev.t8.arms.push({ arm: 'L5-first', rows: disarmRows1 });
    log('t8', 'L5 -> ' + JSON.stringify(disarmRows1));

    /* T9：锁中（~20t）与锁后（~70t）各做一次**受控投件**拾取证：
       ① 缴械后立刻在僵尸脚下 summon 一把剑（PickupDelay 0）——落点由 execute 相对坐标保证在拾取盒内；
       ② 锁内再攻 ⇒ held=none（锁挡住回拾）；
       ③ 锁后再攻 ⇒ held=minecraft:iron_sword（锁解除后回拾成立）。
       1.12 无 NBT 读命令（/entitydata 只写），故以 held 面行为链 + 字节码 NBT 注入口作判据。 */
    srv.send('execute @e[tag=dzz,c=1] ~ ~ ~ summon minecraft:item ~ ~ ~ {Item:{id:"minecraft:iron_sword",Count:1b},PickupDelay:0s}');
    await sleep(900);
    const lockMidFrom = srv.all.length;
    srv.send(`etest attack @e[tag=dzz,c=1] ${BOT}`);
    await sleep(600);
    const midRows = rowsSince(lockMidFrom).map((l) => RE.disarm.exec(l)).filter(Boolean)
      .map((m) => ({ lvl: +m[1], held: m[3], dropped: m[4] === 'true' }));
    await sleep(2600);
    const lockEndFrom = srv.all.length;
    srv.send(`etest attack @e[tag=dzz,c=1] ${BOT}`);
    await sleep(900);
    const endRows = rowsSince(lockEndFrom).map((l) => RE.disarm.exec(l)).filter(Boolean)
      .map((m) => ({ lvl: +m[1], held: m[3], dropped: m[4] === 'true' }));
    ev.t9 = {
      mid: midRows, end: endRows,
      lockOk: disarmRows1.some((r) => r.dropped && r.cleared && r.lock === 40),
      midOk: midRows.length > 0 && midRows.every((r) => r.held === 'none' && !r.dropped),
      endOk: endRows.length > 0 && endRows.some((r) => r.held !== 'none'),
    };
    log('t9', JSON.stringify({ mid: ev.t9.mid, end: ev.t9.end, lockOk: ev.t9.lockOk, midOk: ev.t9.midOk, endOk: ev.t9.endOk }));

    /* T8 fast-fail 臂：L1（P=0.2）20 个持械僵尸各 1 刀 */
    await killAll(['zombie']);
    const ffTargets = [];
    for (let i = 0; i < 20; i++) {
      const a = (2 * Math.PI * i) / 20;
      ffTargets.push({
        tag: `ff${i}`,
        x: +(bx + 0.5 + 2.2 * Math.cos(a)).toFixed(2),
        z: +(bz + 0.5 + 2.2 * Math.sin(a)).toFixed(2),
        ...aimOf(bx + 0.5 + 2.2 * Math.cos(a), bz + 0.5 + 2.2 * Math.sin(a), by + 0.975),
      });
      srv.send(`summon minecraft:zombie ${(bx + 0.5 + 2.2 * Math.cos(a)).toFixed(2)} ${by} ${(bz + 0.5 + 2.2 * Math.sin(a)).toFixed(2)} `
        + `{NoAI:1b,Silent:1b,PersistenceRequired:1b,CanPickUpLoot:0b,Tags:["ff${i}"],HandItems:[{id:"minecraft:iron_sword",Count:1b},{}],`
        + 'Attributes:[{Name:"generic.maxHealth",Base:100.0}],Health:100.0f}');
    }
    await sleep(1400);
    const ffFrom = srv.all.length;
    for (let i = 0; i < 20; i++) {
      stage('etim:sword_copper', enchNbt(ev.ids.disarming, 1));
      aimSend(ffTargets[i]);
      srv.send(`etest attack @e[tag=ff${i},c=1] ${BOT}`);
      await sleep(180);
    }
    await sleep(600);
    const ffRows = [];
    for (const l of rowsSince(ffFrom)) {
      const m = RE.disarm.exec(l);
      if (m) ffRows.push({ lvl: +m[1], roll: m[2] === undefined ? null : +m[2], held: m[3], dropped: m[4] === 'true' });
    }
    ev.t8.arms.push({ arm: 'L1-fastfail', attempts: ffRows.length,
      drops: ffRows.filter((r) => r.dropped).length,
      fails: ffRows.filter((r) => !r.dropped).length, rows: ffRows });
    log('t8', 'L1 -> attempts=' + ffRows.length + ' drops=' + ffRows.filter((r) => r.dropped).length
      + ' fails=' + ffRows.filter((r) => !r.dropped).length);
    await killAll(['zombie']);

    /* ======================= T10 mob 侧正证 ======================= */
    ev.t10 = { arms: [] };
    srv.send(`etest level 40 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    srv.send(`effect ${BOT} minecraft:resistance 99999 3`);
    const m10Spots = [
      { x: bx + 0.5, z: bz + 2.4 },
      { x: bx - 1.6, z: bz - 1.8 },
      { x: bx + 2.6, z: bz - 1.8 },
    ];
    for (const face of ['stun', 'vampiric']) {
      m10Spots.forEach((s, idx) => {
        srv.send(`summon minecraft:zombie ${s.x.toFixed(2)} ${by} ${s.z.toFixed(2)} {Silent:1b,PersistenceRequired:1b,Tags:["m10${face}${idx}"],`
          + `HandItems:[{id:"${face === 'stun' ? 'etim:war_hammer_copper' : 'etim:sword_copper'}",Count:1b,`
          + `tag:{ench:[{id:${ev.ids[face]},lvl:5}]}},{}],`
          + 'Attributes:[{Name:"generic.maxHealth",Base:100.0}],Health:8.0f}');
      });
      await sleep(1500);
      const from = srv.all.length;
      for (let i = 0; i < 20; i++) {
        srv.send(`etest health 20 ${BOT}`);
        if (i % 4 === 0) {
          m10Spots.forEach((s, idx) => srv.send(`tp @e[tag=m10${face}${idx},c=1] ${s.x.toFixed(2)} ${by} ${s.z.toFixed(2)}`));
        }
        await sleep(1500);
      }
      const seg = rowsSince(from);
      const stunRows = seg.map((l) => RE.stun.exec(l)).filter(Boolean).map((m) => ({ lvl: +m[1], amp: +m[4], dur: +m[5] }));
      const vampRows = seg.map((l) => RE.vamp.exec(l)).filter(Boolean).map((m) => ({ lvl: +m[1], dmg: +m[3], transfer: +m[4], hp: +m[5] }));
      const meleeRows = seg.map((l) => RE.melee.exec(l)).filter(Boolean).length;
      ev.t10.arms.push({
        face, meleeRows, stunRows, vampRows,
        hpSeries: vampRows.map((r) => r.hp),
        ok: face === 'stun' ? stunRows.some((r) => r.amp === 30) : vampRows.some((r) => r.transfer > 0),
      });
      log('t10', `${face}: melee=${meleeRows} stun=${stunRows.length} vamp=${vampRows.length} hp=${JSON.stringify(vampRows.map((r) => r.hp))}`);
      for (let idx = 0; idx < m10Spots.length; idx++) srv.send(`kill @e[tag=m10${face}${idx}]`);
      await sleep(700);
    }

    /* ======================= 收尾统计 ======================= */
    ev.rowCounts = {
      melee: srv.all.filter((l) => /\[MeleeLog\]/.test(l)).length,
      enchant: srv.all.filter((l) => /\[EnchantLog\]/.test(l)).length,
      mining: srv.all.filter((l) => /\[MiningLog\]/.test(l)).length,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    ev.jarUpToDate = ((ev.boot && ev.boot.jarTask) || []).filter((l) => /UP-TO-DATE/.test(l)).length === 3;
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* gone */ }
    if (ev.cfgSnap && ev.propsSnap) {
      fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnap.path));
      fs.writeFileSync(CFG_CLIENT, fs.readFileSync(ev.cfgClientSnap.path));
      fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnap.path));
      const cfgBack = fs.readFileSync(CFG);
      ev.cfgClose = { bytes: cfgBack.length, sha: sha256(cfgBack),
        sameAsStart: cfgBack.length === ev.cfgSnap.bytes && sha256(cfgBack) === ev.cfgSnap.sha };
      const cfgCBack = fs.readFileSync(CFG_CLIENT);
      ev.cfgClientClose = { bytes: cfgCBack.length, sha: sha256(cfgCBack),
        sameAsStart: cfgCBack.length === ev.cfgClientSnap.bytes && sha256(cfgCBack) === ev.cfgClientSnap.sha };
      const propsBack = fs.readFileSync(PROPS);
      ev.propsClose = { bytes: propsBack.length, sha: sha256(propsBack), identical: sha256(propsBack) === PIN.props.sha };
    }
    const dir = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(dir);
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts() };
  }

  ev.finishedAt = new Date().toISOString();
  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 1) + '\n', 'utf8');
  log('evidence', file + ' (' + fs.statSync(file).size + ' B)');
  log('DONE');
  process.exit(0);
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
