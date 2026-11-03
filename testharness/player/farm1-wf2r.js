#!/usr/bin/env node
/**
 * farm1-wf2r.js — farm1 修复窗 W-F2R（窄窗）主 boot：
 *   R1  W-F7 持久面（A-1 修复确认）：moisture 0→7(水浸)→0(断水) 真实往返，growth 行全程继续
 *   R2  W-F8 增速寿命：同窗口 growth 行 ≥60 且 ratio=1.500 全程
 *   R3a W-F9 消耗常态面：divisor=256 行累计、roll/cleared 机制
 *   R4a/R4b/R4c  B-1 修复确认：vanilla iron_hoe 附魔成功 / 20/20 tillage / 根茎收成行（此前 0）
 *   R5  汇合零回归：行格式字面同构、pool 前段零变、cfg 8 键字节不变
 *
 * 用法：node farm1-wf2r.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'farm1-wf2r';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const WORLD = 'farm1wf2r';
const PORT = 25565;
const BOT = 'ETIM_R1';

const PIN = {
  head: '0429e32',
  rel: { bytes: 864935, sha: '18F674AADB271906B507A0E0D1D6E77D053531F3928273EB8B20FC2F3D067B5D' },
  dev: { bytes: 847689, sha: '256559ACCA12E453C71388977D3775694A1FB46ABBEE6CDFF5E11360C9279B6F' },
  src: { bytes: 794499, sha: 'C74B2BFE7DA74CA3D736DDF355D0BE62AE76AF5A3EF845372CC6C4C5DE4ACA93' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
  cfg: { bytes: 39968, sha: '7C3933F92FAAE6C4E24B1F35F066851A6C5528024B641BC8B49AEE41E383A0BA' },
};
const MK_PIN = { classes: 67, entries: 153, dual: 306, mixins: 62, client: 10 };

const FARM8 = ['fertilityDifficulty', 'harvestingDifficulty', 'fertilityMaxLevel',
  'harvestingMaxLevel', 'fertilizedGrowthFactor', 'fertilizedConsumeDivisor',
  'harvestingYieldFactor', 'farmDebugLog'];
const FARM_DEFAULTS = {
  fertilityDifficulty: '10', harvestingDifficulty: '10', fertilityMaxLevel: '5',
  harvestingMaxLevel: '5', fertilizedGrowthFactor: '1.5', fertilizedConsumeDivisor: '256',
  harvestingYieldFactor: '0.5', farmDebugLog: 'false',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

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
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
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
    const entries = Object.values(r.mappings).reduce((a, x) => a + Object.keys(x).length, 0);
    out[key] = {
      classes: Object.keys(r.mappings).length, entries, dual: entries * 2,
      mixinItem: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItem'] || {}).length,
      crops: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinBlockCrops'] || {}).length,
      farmlandTile: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinBlockFarmlandTile'] || {}).length,
      itemDestroyed: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItem'] || {})
        .filter((k) => k.startsWith('onBlockDestroyed')).length,
    };
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.classes
    && out.refmapResources.entries === MK_PIN.entries && out.refmapResources.dual === MK_PIN.dual
    && out.refmapTmp.classes === MK_PIN.classes && out.refmapTmp.entries === MK_PIN.entries
    && out.refmapTmp.dual === MK_PIN.dual
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client;
  return out;
}
function binomBand(p, n) {
  const s = Math.sqrt(Math.max(p * (1 - p), 1e-9) / n);
  return { p, n, sigma: +s.toFixed(4), lo: +(Math.max(0, p - 3 * s)).toFixed(4), hi: +(Math.min(1, p + 3 * s)).toFixed(4) };
}

const RE = {
  done: /Done \(/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException|MixinApplyError|Critical injection failure/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,
  till: /\[FarmLog\] fertility tillage lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
  harvest: /\[FarmLog\] fertility harvest tool=(\S+) crop=(\S+) lvl=(\d+) roll=([\d.]+) need=([\d.]+) pass=(true|false) pos=([-\d,]+)/,
  set: /\[FarmLog\] fertilized set pos=([-\d,]+) value=(true|false)/,
  clear: /\[FarmLog\] fertilized clear pos=([-\d,]+) roll=(\d+) divisor=(\d+) cleared=(true|false)/,
  growth: /\[FarmLog\] growth pos=([-\d,]+) value=([\d.]+) base=([\d.]+) ratio=([\d.]+) factor=([\d.]+)/,
  deny: /\[FarmLog\] fertilized trample-deny pos=([-\d,]+) entity=(.+?)\s*\[server\]/,
  allow: /\[FarmLog\] trample allow pos=([-\d,]+) fertilized=false entity=(.+?)\s*\[server\]/,
  hrow: /\[FarmLog\] harvesting crop=(\S+) lvl=(\d+) fraction=([\d.]+) factor=([\d.]+) base=(\d+) extra=(\d+) pos=([-\d,]+)/,
  ids: /\[EtimInit\] enchant.*?ids=([\d\s]+)/,
};

const EXPECTED_WINDOW = {
  'etim:speed': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:regeneration': 'L1=11/30 L2=31/50 L3=51/70 L4=71/90 L5=91/999',
  'etim:poison': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:true_flight': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:quickness': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:stun': 'L1=6/20 L2=21/35 L3=36/50 L4=51/65 L5=66/999',
  'etim:vampiric': 'L1=11/30 L2=31/50 L3=51/70 L4=71/90 L5=91/999',
  'etim:disarming': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, window: 'W-F2R（A-1 + B-1 修复单点回归）', startedAt: new Date().toISOString(), pins: {} };

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
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH'));
  for (const k of ['devJar', 'relJar', 'srcJar', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha.slice(0, 16)} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk));
  if (!ev.headOk) throw new Error('HEAD mismatch');

  /* cfg 起值（修复窗基线 = 主窗收口态） */
  const cfgBefore = fs.readFileSync(CFG);
  ev.cfgBefore = { bytes: cfgBefore.length, sha: sha256(cfgBefore), keys: Object.keys(cfgKeys(CFG)).length };
  const ck0 = cfgKeys(CFG);
  ev.cfgFace = {
    values: Object.fromEntries(FARM8.map((k) => [k, ck0[k] === undefined ? null : ck0[k]])),
    missing: FARM8.filter((k) => !(k in ck0)),
    matchesDefaults: FARM8.every((k) => ck0[k] === FARM_DEFAULTS[k]),
  };
  log('cfg', JSON.stringify({ before: ev.cfgBefore, matchesDefaults: ev.cfgFace.matchesDefaults, missing: ev.cfgFace.missing }));
  setCfgValue(CFG, 'farmDebugLog', 'true');
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let bx = 0, by = 0, bz = 0;
  const rowsSince = (from, to) => srv.all.slice(from, to === undefined ? srv.all.length : to).map(strip);
  const countIn = (from, to, re) => srv.all.slice(from, to === undefined ? srv.all.length : to).filter((l) => re.test(l)).length;
  const mark = (name) => { const i = srv.all.length; srv.send('say PHASE=' + name); return i; };
  const stage = (item, nbt, count) => srv.send(nbt
    ? `replaceitem entity ${BOT} slot.weapon.mainhand ${item} ${count || 1} 0 ${nbt}`
    : `replaceitem entity ${BOT} slot.weapon.mainhand ${item} ${count || 1} 0`);
  const ench = (id, lvl) => `{ench:[{id:${id},lvl:${lvl}}]}`;
  const tf = async (x, y, z, block, state) => {
    const from = srv.all.length;
    srv.send(state ? `testforblock ${x} ${y} ${z} ${block} ${state}` : `testforblock ${x} ${y} ${z} ${block}`);
    await sleep(400);
    return rowsSince(from).filter((l) => /Successfully found|The block at|failed/i.test(l)).join(' | ');
  };
  const waitMoisture = async (x, y, z, want, timeoutMs) => {
    const t0 = Date.now();
    let last = '';
    while (Date.now() - t0 < timeoutMs) {
      last = await tf(x, y, z, 'minecraft:farmland', 'moisture=' + want);
      if (/Successfully found/.test(last)) return { ok: true, waitedMs: Date.now() - t0, detail: last };
      await sleep(600);
    }
    return { ok: false, waitedMs: Date.now() - t0, detail: last };
  };

  try {
    const done = await srv.waitFor(RE.done, 480000);
    if (!done) throw new Error('server never reached Done(');
    ev.boot = {
      ready: strip(done).trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).length,
    };
    const idLine = srv.all.map(strip).find((l) => /\bids=/.test(l)) || '';
    const idm = RE.ids.exec(idLine);
    const ids = idm ? idm[1].trim().split(/\s+/).map(Number) : null;
    ev.ids = { all: ids, fertility: ids && ids[8], harvesting: ids && ids[9] };
    log('boot', ev.boot.ready + ' mixinErr=' + ev.boot.mixinErrors + ' ids=' + JSON.stringify(ev.ids));

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'keepInventory true', 'mobGriefing true', 'naturalRegeneration false', 'randomTickSpeed 100']) srv.send('gamerule ' + g);
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(900);

    const p0 = bot.entity && bot.entity.position ? bot.entity.position : { x: 0, y: 64, z: 0 };
    bx = Math.floor(p0.x); by = Math.floor(p0.y); bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 8} ${by - 2} ${bz - 8} ${bx + 8} ${by - 2} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by - 1} ${bz - 8} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by} ${bz - 8} ${bx + 8} ${by + 5} ${bz + 8} minecraft:air 0`);
    await sleep(2200);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1400);
    log('arena', JSON.stringify(ev.arena) + ' bot=' + JSON.stringify(bot.entity && bot.entity.position));

    /* ===================== R1/R2 场地：3×3 施肥耕地（moisture 0）+ 麦 + 东侧水孔 ===================== */
    const ax0 = bx + 2, az0 = bz - 1;                 // 3×3: x ax0..ax0+2, z az0..az0+2
    const acx = ax0 + 1, acz = az0 + 1;               // 中心
    const wy = by - 1;
    srv.send(`fill ${ax0} ${wy} ${az0} ${ax0 + 2} ${wy} ${az0 + 2} minecraft:farmland 0 replace {EtimFertilized:1b}`);
    srv.send(`fill ${ax0} ${by} ${az0} ${ax0 + 2} ${by} ${az0 + 2} minecraft:wheat 0`);
    await sleep(900);
    ev.r1 = { plotA: { x0: ax0, z0: az0, center: `${acx},${wy},${acz}`, waterHole: `${bx + 5},${wy},${bz}` }, phases: {} };
    ev.r1.dryStart = await tf(acx, wy, acz, 'minecraft:farmland', 'moisture=0');
    log('r1', 'plotA=' + JSON.stringify(ev.r1.plotA) + ' dryStart=' + /Successfully found/.test(ev.r1.dryStart));

    const phaseGrowth = (from, to) => {
      const seg = rowsSince(from, to);
      const rows = seg.map((l) => RE.growth.exec(l)).filter(Boolean)
        .map((m) => ({ pos: m[1], ratio: +m[4], factor: +m[5] }));
      const inPlot = rows.filter((r) => {
        const [x, , z] = r.pos.split(',').map(Number);
        return x >= ax0 && x <= ax0 + 2 && z >= az0 && z <= az0 + 2;
      });
      return {
        rows: inPlot.length,
        ratioSet: [...new Set(inPlot.map((r) => r.ratio))],
        factorSet: [...new Set(inPlot.map((r) => r.factor))],
        totalGrowthRows: rows.length,
      };
    };
    const resetCrop = async () => {
      srv.send(`fill ${ax0} ${by} ${az0} ${ax0 + 2} ${by} ${az0 + 2} minecraft:wheat 0`);
      await sleep(400);
    };

    /* P1：moisture 0（TE 应存活） */
    await resetCrop();
    let m = mark('P1');
    await sleep(20000);
    ev.r1.phases.P1 = { ...phaseGrowth(m, srv.all.length), moisture: await tf(acx, wy, acz, 'minecraft:farmland', 'moisture=0') };
    log('r1-P1', JSON.stringify(ev.r1.phases.P1));

    /* 水浸 0→7（真实 updateTick 路径） */
    srv.send(`setblock ${bx + 5} ${wy} ${bz} minecraft:stone 0`);
    srv.send(`setblock ${bx + 6} ${wy} ${bz} minecraft:stone 0`);
    srv.send(`setblock ${bx + 5} ${wy} ${bz - 1} minecraft:stone 0`);
    srv.send(`setblock ${bx + 5} ${wy} ${bz + 1} minecraft:stone 0`);
    srv.send(`setblock ${bx + 5} ${wy - 1} ${bz} minecraft:stone 0`);
    srv.send(`setblock ${bx + 5} ${by} ${bz} minecraft:stone 0`);
    srv.send(`setblock ${bx + 5} ${wy} ${bz} minecraft:water 0`);
    ev.r1.hydrate = await waitMoisture(acx, wy, acz, 7, 30000);
    log('r1-hydrate', JSON.stringify(ev.r1.hydrate));

    /* P2：moisture 7（TE 应仍存活 → growth 行继续） */
    await resetCrop();
    m = mark('P2');
    await sleep(20000);
    ev.r1.phases.P2 = { ...phaseGrowth(m, srv.all.length), moisture: await tf(acx, wy, acz, 'minecraft:farmland', 'moisture=7') };
    log('r1-P2', JSON.stringify(ev.r1.phases.P2));

    /* 断水 7→0 */
    srv.send(`setblock ${bx + 5} ${wy} ${bz} minecraft:air 0`);
    ev.r1.dry = await waitMoisture(acx, wy, acz, 0, 40000);
    log('r1-dry', JSON.stringify(ev.r1.dry));

    /* P3：moisture 0（TE 仍应存活） */
    await resetCrop();
    m = mark('P3');
    await sleep(20000);
    ev.r1.phases.P3 = { ...phaseGrowth(m, srv.all.length), moisture: await tf(acx, wy, acz, 'minecraft:farmland', 'moisture=0') };
    log('r1-P3', JSON.stringify(ev.r1.phases.P3));

    /* R1c：衰减/水浸往返后踩踏 → deny（施肥免踏仍生效） */
    srv.send(`fill ${ax0} ${by} ${az0} ${ax0 + 2} ${by} ${az0 + 2} minecraft:wheat 0`);
    await sleep(500);
    let trFrom = srv.all.length;
    srv.send(`summon minecraft:cow ${acx + 0.5} ${by + 4} ${acz + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["r1c"]}`);
    await sleep(4500);
    ev.r1.denyAged = {
      deny: rowsSince(trFrom).filter((l) => RE.deny.test(l) && l.includes(`pos=${acx},${wy},${acz}`)),
      allow: rowsSince(trFrom).filter((l) => RE.allow.test(l) && l.includes(`pos=${acx},${wy},${acz}`)),
      block: await tf(acx, wy, acz, 'minecraft:farmland'),
    };
    log('r1-denyAged', JSON.stringify(ev.r1.denyAged));
    srv.send('kill @e[type=cow]');
    await sleep(600);

    /* R1d：turnToDirt → TE 随块亡；同位重耕地 allow；再锄需新 roll
       注：vanilla iron_hoe 的区块 reach = 2.75（ETIM 三族才 +0.75），故目标取脚边斜角位（距离 ≈1.4） */
    const D = { x: bx - 1, y: by, z: bz - 1 };
    srv.send(`setblock ${D.x} ${D.y} ${D.z} minecraft:dirt 0`);
    srv.send(`clear ${BOT}`);
    stage('minecraft:iron_hoe', ench(ev.ids.fertility, 5));
    await sleep(500);
    let dFrom = srv.all.length;
    srv.send(`etest useblock ${D.x} ${D.y} ${D.z} ${BOT}`);
    await sleep(1600);
    ev.r1d = {
      till: rowsSince(dFrom).filter((l) => RE.till.test(l) && l.includes(`pos=${D.x},${D.y},${D.z}`)),
      set: rowsSince(dFrom).filter((l) => RE.set.test(l) && l.includes(`pos=${D.x},${D.y},${D.z}`)),
      block: await tf(D.x, D.y, D.z, 'minecraft:farmland'),
    };
    /* 块销：dirt（TE 亡）→ 同位重耕普通耕地 */
    srv.send(`setblock ${D.x} ${D.y} ${D.z} minecraft:dirt 0`);
    await sleep(600);
    srv.send(`setblock ${D.x} ${D.y} ${D.z} minecraft:farmland 0`);
    srv.send(`setblock ${D.x} ${D.y + 1} ${D.z} minecraft:wheat 0`);
    await sleep(800);
    trFrom = srv.all.length;
    srv.send(`summon minecraft:cow ${D.x + 0.5} ${by + 4} ${D.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["r1d"]}`);
    await sleep(4500);
    ev.r1d.allowAfterBlockSwap = {
      allow: rowsSince(trFrom).filter((l) => RE.allow.test(l) && l.includes(`pos=${D.x},${D.y},${D.z}`)),
      deny: rowsSince(trFrom).filter((l) => RE.deny.test(l) && l.includes(`pos=${D.x},${D.y},${D.z}`)),
      block: await tf(D.x, D.y, D.z, 'minecraft:dirt'),
    };
    srv.send('kill @e[type=cow]');
    await sleep(600);
    /* 再锄 → 新 roll（set 行再出现） */
    srv.send(`setblock ${D.x} ${D.y} ${D.z} minecraft:dirt 0`);
    srv.send(`clear ${BOT}`);
    stage('minecraft:iron_hoe', ench(ev.ids.fertility, 5));
    await sleep(500);
    dFrom = srv.all.length;
    srv.send(`etest useblock ${D.x} ${D.y} ${D.z} ${BOT}`);
    await sleep(1800);
    ev.r1d.retill = {
      till: rowsSince(dFrom).filter((l) => RE.till.test(l) && l.includes(`pos=${D.x},${D.y},${D.z}`)),
      set: rowsSince(dFrom).filter((l) => RE.set.test(l) && l.includes(`pos=${D.x},${D.y},${D.z}`)),
    };
    log('r1d', JSON.stringify(ev.r1d));

    /* ===================== R2/R3a 汇总：整段 growth/clear ===================== */
    {
      const growth = srv.all.map(strip).map((l) => RE.growth.exec(l)).filter(Boolean)
        .map((m2) => ({ pos: m2[1], value: +m2[2], base: +m2[3], ratio: +m2[4], factor: +m2[5] }));
      const inPlot = growth.filter((g) => {
        const [x, , z] = g.pos.split(',').map(Number);
        return x >= ax0 && x <= ax0 + 2 && z >= az0 && z <= az0 + 2;
      });
      const clear = srv.all.map(strip).map((l) => RE.clear.exec(l)).filter(Boolean)
        .map((m2) => ({ pos: m2[1], roll: +m2[2], divisor: +m2[3], cleared: m2[4] === 'true' }));
      const clearPlotA = clear.filter((c) => {
        const [x, , z] = c.pos.split(',').map(Number);
        return x >= ax0 && x <= ax0 + 2 && z >= az0 && z <= az0 + 2;
      });
      ev.r2 = {
        growthRowsPlotA: inPlot.length,
        ratioSet: [...new Set(inPlot.map((g) => g.ratio))],
        factorSet: [...new Set(inPlot.map((g) => g.factor))],
        valueBaseOk: inPlot.every((g) => Math.abs(g.value - g.base * 1.5) < 0.001),
        sample: inPlot.slice(0, 3),
        p1Rows: ev.r1.phases.P1.rows, p2Rows: ev.r1.phases.P2.rows, p3Rows: ev.r1.phases.P3.rows,
        hydratedAt: ev.r1.hydrate.waitedMs, driedAt: ev.r1.dry.waitedMs,
      };
      ev.r3a = {
        rows: clear.length,
        rowsPlotA: clearPlotA.length,
        divisorSet: [...new Set(clear.map((c) => c.divisor))],
        rollMin: clear.length ? Math.min(...clear.map((c) => c.roll)) : null,
        rollMax: clear.length ? Math.max(...clear.map((c) => c.roll)) : null,
        cleared: clear.filter((c) => c.cleared).length,
        clearedPlotA: clearPlotA.filter((c) => c.cleared).map((c) => c.pos),
        badClear: clear.filter((c) => c.cleared !== (c.roll === 0)).length,
        sample: clear.slice(0, 4),
      };
      log('r2', JSON.stringify({ rows: ev.r2.growthRowsPlotA, ratio: ev.r2.ratioSet, factor: ev.r2.factorSet,
        valueBaseOk: ev.r2.valueBaseOk, p1: ev.r2.p1Rows, p2: ev.r2.p2Rows, p3: ev.r2.p3Rows }));
      log('r3a', JSON.stringify({ rows: ev.r3a.rows, divisor: ev.r3a.divisorSet, rolls: [ev.r3a.rollMin, ev.r3a.rollMax],
        cleared: ev.r3a.cleared, clearedPlotA: ev.r3a.clearedPlotA, bad: ev.r3a.badClear }));
    }

    /* ===================== R4a/R4b vanilla iron_hoe（B-1 修复确认） ===================== */
    ev.r4 = { tillage: {}, matrix: [], enchantSet: [] };
    /* R4a：/etest enchant 打到 vanilla iron_hoe */
    {
      srv.send(`clear ${BOT}`);
      stage('minecraft:iron_hoe', null);
      await sleep(400);
      const from = srv.all.length;
      srv.send(`etest enchant mainhand 5 fertility ${BOT}`);
      await sleep(700);
      srv.send(`etest enchantprobe mainhand pool ${BOT}`);
      await sleep(900);
      const seg = rowsSince(from);
      ev.r4.enchantSet = seg.filter((l) => /Enchanted: slot|enchant_set/.test(l)).slice(0, 2);
      const reg = {};
      for (const l of seg) { const mm = RE.reg.exec(l); if (mm) reg[mm[1]] = mm[6].trim(); }
      ev.r4.enchantSetProbe = { regCount: Object.keys(reg).length, fertility: reg['etim:fertility'] || null, harvesting: reg['etim:harvesting'] || null };
      log('r4a', JSON.stringify({ set: ev.r4.enchantSet, probe: ev.r4.enchantSetProbe }));
    }
    /* R4b：vanilla hoe L5 tillage 20/20 */
    {
      const ring = [];
      for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) ring.push({ x: bx + dx, y: by, z: bz + dz });
      srv.send(`clear ${BOT}`);
      stage('minecraft:iron_hoe', ench(ev.ids.fertility, 5));
      await sleep(500);
      const from = srv.all.length;
      for (let i = 0; i < 20; i++) {
        const p = ring[i % ring.length];
        srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:dirt 0`);
        await sleep(120);
        srv.send(`etest useblock ${p.x} ${p.y} ${p.z} ${BOT}`);
        await sleep(420);
      }
      await sleep(900);
      const rows = rowsSince(from).map((l) => RE.till.exec(l)).filter(Boolean)
        .map((m2) => ({ lvl: +m2[1], need: +m2[3], pass: m2[4] === 'true' }));
      ev.r4.tillage = {
        n: rows.length, pass: rows.filter((r) => r.pass).length,
        needSet: [...new Set(rows.map((r) => r.need))], lvlSet: [...new Set(rows.map((r) => r.lvl))],
        setRows: countIn(from, undefined, RE.set),
      };
      ev.r4.tillage.ok = rows.length === 20 && ev.r4.tillage.pass === 20
        && ev.r4.tillage.needSet.length === 1 && ev.r4.tillage.needSet[0] === 1;
      log('r4b', JSON.stringify(ev.r4.tillage));
    }
    /* R4c：vanilla hoe 矩阵（根茎 + beetroot 正 / wheat 负 / 无附魔负） */
    {
      const spots = [{ x: bx + 1, z: bz }, { x: bx, z: bz + 1 }, { x: bx - 1, z: bz }, { x: bx, z: bz - 1 }];
      const arms = [
        { id: 'carrot-vanilla-L5', crop: 'minecraft:carrots', meta: 7, nbt: ench(ev.ids.fertility, 5), want: 1 },
        { id: 'beetroot-vanilla-L5', crop: 'minecraft:beetroots', meta: 3, nbt: ench(ev.ids.fertility, 5), want: 1 },
        { id: 'wheat-vanilla-L5', crop: 'minecraft:wheat', meta: 7, nbt: ench(ev.ids.fertility, 5), want: 0 },
        { id: 'carrot-vanilla-noench', crop: 'minecraft:carrots', meta: 7, nbt: null, want: 0 },
      ];
      for (let i = 0; i < arms.length; i++) {
        const a = arms[i]; const p = spots[i];
        /* C-7 坑：先清 y=by 位（R4b 可能在此留下 farmland），否则 by-1 的新耕地 onBlockAdded 自转 DIRT */
        srv.send(`setblock ${p.x} ${by} ${p.z} minecraft:air 0`);
        await sleep(200);
        srv.send(`setblock ${p.x} ${by - 1} ${p.z} minecraft:farmland 0`);
        await sleep(250);
        srv.send(`setblock ${p.x} ${by} ${p.z} ${a.crop} ${a.meta}`);
        srv.send(`clear ${BOT}`);
        stage('minecraft:iron_hoe', a.nbt);
        await sleep(600);
        const present = await tf(p.x, by, p.z, a.crop);
        const from = srv.all.length;
        srv.send(`etest dig ${p.x} ${by} ${p.z} ${BOT}`);
        await sleep(3000);
        const seg = rowsSince(from);
        const rows = seg.map((l) => RE.harvest.exec(l)).filter(Boolean)
          .filter((m2) => m2[7] === `${p.x},${by},${p.z}`)
          .map((m2) => ({ tool: m2[1], crop: m2[2], lvl: +m2[3], need: +m2[5], pass: m2[6] === 'true' }));
        const blockAfter = await tf(p.x, by, p.z, 'minecraft:air');
        const row = { id: a.id, crop: a.crop, want: a.want, rows: rows.length,
          present: /Successfully found/.test(present), broken: /Successfully found/.test(blockAfter),
          sample: rows[0] || null };
        ev.r4.matrix.push(row);
        log('r4c', `${a.id}: rows=${row.rows} want=${a.want} present=${row.present} broken=${row.broken} ${JSON.stringify(row.sample)}`);
        srv.send('kill @e[type=item]');
        srv.send(`etest food 20 20 ${BOT}`);
        srv.send(`etest health 20 ${BOT}`);
      }
      ev.r4.matrixOk = ev.r4.matrix.every((r) => r.rows === r.want) && ev.r4.matrix.every((r) => r.broken);
    }

    /* ===================== R5 汇合零回归 ===================== */
    {
      const all = srv.all.map(strip);
      const fmt = {
        till: all.filter((l) => RE.till.test(l)).length,
        harvest: all.filter((l) => RE.harvest.test(l)).length,
        set: all.filter((l) => RE.set.test(l)).length,
        clear: all.filter((l) => RE.clear.test(l)).length,
        growth: all.filter((l) => RE.growth.test(l)).length,
        deny: all.filter((l) => RE.deny.test(l)).length,
        allow: all.filter((l) => RE.allow.test(l)).length,
        hrow: all.filter((l) => RE.hrow.test(l)).length,
        farmLogUnparsed: all.filter((l) => /\[FarmLog\]/.test(l)
          && !RE.till.test(l) && !RE.harvest.test(l) && !RE.set.test(l) && !RE.clear.test(l)
          && !RE.growth.test(l) && !RE.deny.test(l) && !RE.allow.test(l) && !RE.hrow.test(l)).length,
      };
      ev.r5 = { formatCounts: fmt, regRows: [] };
      const regRows = all.filter((l) => RE.reg.test(l));
      ev.r5.regCount = regRows.length;
      const reg = {};
      for (const l of regRows) { const mm = RE.reg.exec(l); reg[mm[1]] = { id: +mm[2], table: mm[4] === 'true', window: mm[6].trim() }; }
      ev.r5.regFirst = Object.fromEntries(['etim:speed', 'etim:regeneration', 'etim:poison', 'etim:true_flight',
        'etim:quickness', 'etim:stun', 'etim:vampiric', 'etim:disarming', 'etim:fertility', 'etim:harvesting']
        .map((k) => [k, reg[k] ? { id: reg[k].id, window: reg[k].window } : null]));
      ev.r5.regOk = ['etim:speed', 'etim:regeneration', 'etim:poison', 'etim:true_flight', 'etim:quickness',
        'etim:stun', 'etim:vampiric', 'etim:disarming'].every((k) => reg[k] && reg[k].window === EXPECTED_WINDOW[k])
        && reg['etim:fertility'] && reg['etim:fertility'].window === 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999'
        && reg['etim:harvesting'] && reg['etim:harvesting'].window === 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999';
      log('r5', JSON.stringify({ fmt, regCount: ev.r5.regCount, regOk: ev.r5.regOk }));
    }

    ev.rowCounts = {
      farm: srv.all.filter((l) => /\[FarmLog\]/.test(l)).length,
      enchant: srv.all.filter((l) => /\[EnchantLog\]/.test(l)).length,
      mining: srv.all.filter((l) => /\[MiningLog\]/.test(l)).length,
      melee: srv.all.filter((l) => /\[MeleeLog\]/.test(l)).length,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));

    const stop = await srv.stop();
    ev.stop = stop;
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    /*
     * 收口纪律：竞态收口——先等 stop 落盘再回填 cfg（若 finally 里直接写，stop 后续
     * 的 config 落盘可能覆盖）；此处用 setCfgValue 逐键回填 gate=false。
     */
    setCfgValue(CFG, 'farmDebugLog', 'false');
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      sameAsStart: sha256(fs.readFileSync(CFG)) === PIN.cfg.sha };
    fs.writeFileSync(PROPS, propsBefore);
    ev.propsClose = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
    const d = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    ev.worldRemoved = !fs.existsSync(d);
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts() };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
}

main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
