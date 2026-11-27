#!/usr/bin/env node
/**
 * farm1-wf.js — farm1 批（B4：fertility / harvesting ＋ fertilized 链）W-F 判窗驱动
 *
 * 判决源：条 254（批成立）／farm1-对照报告（会话六，faces=11）／条 256 D-1..D-8
 *   ／条 257 终审放行／条 258 落码 e15795f。
 *
 * 判点：
 *   W-F1  载体门 7 臂（pool reg：hoe/iron_hoe/scythe/mattock 真，pickaxe/sword/shovel 假）
 *   W-F2  案 M 窗口（diff10 → L1=1/10 … L5=41/999；disarming 对照行）
 *   W-F3  tillage：L5 20/20；L1 N=200 频率窗；粗泥 B-3 臂 0 行
 *   W-F4  负臂：无附魔锄 0 行；非载体三件 0 行；/etest enchant 产品装填路径
 *   W-F5  矩阵 7 臂：wheat=scythe / carrot+beetroot+potato=hoe/mattock
 *   W-F6  harvest 频率窗：L1 镰收小麦 N=200 → ≈0.2
 *   W-F7  置位/持窗链：tillage set 行 → 稳定位 deny → 破块重放不复活；A-1 自然衰减位
 *   W-F8  增速：ratio=1.500、factor=1.50、value=base×1.5；无肥对照 0 行但真生长
 *   W-F9  消耗：fertilized clear 行 divisor=256、roll∈[0,255]、cleared⇔roll==0、清后 growth 停
 *   W-F10 踩踏：稳定施肥位 deny / 普通耕地 allow / 衰减位 allow（A-1 证据）
 *   W-F11 丰收：L5 镰小麦 N=200（fraction 1.00/factor 0.50/base 1/extra≈0.5）＋胡萝卜 60 行
 *   零回归：pool 43 行前 8 附魔窗口不变；镰 attacking decay 400⇄100；MeleeLog 零碰
 *
 * 用法：node farm1-wf.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'farm1-wf';
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
const WORLD = 'farm1wf';
const PORT = 25565;
const BOT = 'ETIM_WF';

const PIN = {
  head: 'e15795f',
  rel: { bytes: 864429, sha: '605F2A587ACCC0D14B2035ED6432500FBD1583E3D3C712FC4E73760FD0EEA376' },
  dev: { bytes: 847186, sha: '49C18E2C066B173A6409D4E6E2F2DE87ED49F026771774AFB4D308668E2EAD16' },
  src: { bytes: 793694, sha: '9AC86EF73DD0E24B5CFA5F7DCD58810F74AC4D5356BDB05DF9DCFDE307F06307' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};
const MK_PIN = { mixins: 62, client: 10, refmapClasses: 67, refmapEntries: 304 };

const FARM8 = ['fertilityDifficulty', 'harvestingDifficulty', 'fertilityMaxLevel',
  'harvestingMaxLevel', 'fertilizedGrowthFactor', 'fertilizedConsumeDivisor',
  'harvestingYieldFactor', 'farmDebugLog'];
const FARM_DEFAULTS = {
  fertilityDifficulty: '10', harvestingDifficulty: '10', fertilityMaxLevel: '5',
  harvestingMaxLevel: '5', fertilizedGrowthFactor: '1.5', fertilizedConsumeDivisor: '256',
  harvestingYieldFactor: '0.5', farmDebugLog: 'true',
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
function snapshot(file, name) {
  const buf = fs.readFileSync(file);
  fs.writeFileSync(path.join(OUT, name), buf);
  return { bytes: buf.length, sha: sha256(buf) };
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
      farmland: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinBlockFarmlandTile'] || {}).length,
      crops: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinBlockCrops'] || {}).length,
    };
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.refmapClasses
    && out.refmapResources.entries === MK_PIN.refmapEntries
    && out.refmapTmp.classes === MK_PIN.refmapClasses && out.refmapTmp.entries === MK_PIN.refmapEntries
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client;
  return out;
}
function caseMWindow(diff, maxLevel) {
  const min = (L) => Math.max(diff - 10, 0) + diff * (L - 1) + 1;
  const parts = [];
  for (let L = 1; L <= maxLevel; L++) {
    const mx = L >= maxLevel ? 999 : min(L + 1) - 1;
    parts.push('L' + L + '=' + min(L) + '/' + mx);
  }
  return parts.join(' ');
}
function binomBand(p, n) {
  const s = Math.sqrt(Math.max(p * (1 - p), 1e-9) / n);
  return { p, n, sigma: s, lo: Math.max(0, p - 3 * s), hi: Math.min(1, p + 3 * s) };
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
  decay: /\[MiningLog\] tool decay face=(\S+) item=(\S+).* loss=(-?\d+)/,
};

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

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, window: 'W-F W-F1..W-F11 + 零回归', executedBy: 'session7',
    startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, clients: 0,
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
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH'));
  for (const k of ['devJar', 'relJar', 'srcJar', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha.slice(0, 16)} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk));
  if (!ev.headOk) throw new Error('HEAD mismatch');

  /* cfg 起值（Preflight 首启后态：39,968 / 207 键 / farm 8 键 / gate false） */
  const cfgBefore = fs.readFileSync(CFG);
  ev.cfgSnap = snapshot(CFG, TAG + '-cfg.before');
  ev.cfgKeysBefore = Object.keys(cfgKeys(CFG)).length;
  const ck0 = cfgKeys(CFG);
  ev.cfgFace = {
    bytes: ev.cfgSnap.bytes, keys: ev.cfgKeysBefore,
    values: Object.fromEntries(FARM8.map((k) => [k, ck0[k] === undefined ? null : ck0[k]])),
    missing: FARM8.filter((k) => !(k in ck0)),
    hasFarmCategory: /^farm \{/m.test(cfgBefore.toString('utf8')),
  };
  if (ck0.farmDebugLog !== 'true') setCfgValue(CFG, 'farmDebugLog', 'true');
  ev.cfgGated = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  ev.cfgClientSnap = snapshot(CFG_CLIENT, TAG + '-cfgClient.before');
  const propsBefore = fs.readFileSync(PROPS);
  ev.propsSnap = snapshot(PROPS, TAG + '-props.before');
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let bx = 0, by = 0, bz = 0;
  const rowsSince = (from) => srv.all.slice(from).map(strip);
  const countSince = (from, re) => srv.all.slice(from).filter((l) => re.test(l)).length;
  const stage = (item, nbt, count) => srv.send(nbt
    ? `replaceitem entity ${BOT} slot.weapon.mainhand ${item} ${count || 1} 0 ${nbt}`
    : `replaceitem entity ${BOT} slot.weapon.mainhand ${item} ${count || 1} 0`);
  const ench = (id, lvl) => `{ench:[{id:${id},lvl:${lvl}}]}`;
  const tf = async (x, y, z, block, state) => {
    const from = srv.all.length;
    srv.send(state ? `testforblock ${x} ${y} ${z} ${block} ${state}` : `testforblock ${x} ${y} ${z} ${block}`);
    await sleep(380);
    return rowsSince(from).filter((l) => /Successfully found|The block at|failed/i.test(l)).join(' | ');
  };
  const digBatch = async (positions) => {
    for (const p of positions) srv.send(`etest dig ${p.x} ${p.y} ${p.z} ${BOT}`);
    await sleep(2600);
  };

  try {
    const done = await srv.waitFor(RE.done, 480000);
    if (!done) throw new Error('server never reached Done(');
    ev.boot = {
      ready: strip(done).trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).length,
      enchantIds: srv.all.filter((l) => /\[EtimInit\] enchant/.test(l)).map(strip),
      jarTask: srv.all.filter((l) => /^> Task :[A-Za-z]*(jar|Jar|classes|compileJava)\b/.test(l)),
    };
    log('boot', ev.boot.ready);
    const idLine = ev.boot.enchantIds.find((l) => /\bids=/.test(l)) || '';
    const idm = /ids=([\d\s]+)/.exec(idLine);
    if (!idm) throw new Error('cannot parse ids: ' + idLine);
    const ids = idm[1].trim().split(/\s+/).map(Number);
    ev.ids = { all: ids, speed: ids[0], regeneration: ids[1], poison: ids[2], true_flight: ids[3],
      quickness: ids[4], stun: ids[5], vampiric: ids[6], disarming: ids[7],
      fertility: ids[8], harvesting: ids[9] };
    log('boot', 'ids ' + JSON.stringify(ev.ids));

    bot = await connectBot();
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    await sleep(400);
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'keepInventory true', 'mobGriefing true', 'naturalRegeneration false', 'randomTickSpeed 3']) srv.send('gamerule ' + g);
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
    srv.send(`fill ${bx - 16} ${by - 1} ${bz - 16} ${bx + 36} ${by - 1} ${bz + 12} minecraft:stone 0`);
    srv.send(`fill ${bx - 16} ${by} ${bz - 16} ${bx + 36} ${by + 5} ${bz + 12} minecraft:air 0`);
    await sleep(2600);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
    await sleep(1400);
    log('arena', JSON.stringify(ev.arena) + ' bot=' + JSON.stringify(bot.entity && bot.entity.position));

    /* ===================== W-F1 / W-F2 载体门与窗口 ===================== */
    ev.wf1 = { arms: [] };
    const arms = [
      ['etim:hoe_copper', 'hoe_copper'], ['minecraft:iron_hoe', 'iron_hoe'],
      ['etim:scythe_copper', 'scythe_copper'], ['etim:mattock_copper', 'mattock_copper'],
      ['etim:pickaxe_copper', 'pickaxe_copper'], ['etim:sword_copper', 'sword_copper'],
      ['etim:shovel_copper', 'shovel_copper'],
    ];
    for (const [item, id] of arms) {
      srv.send(`clear ${BOT}`);
      stage(item);
      await sleep(380);
      const from = srv.all.length;
      srv.send(`etest enchantprobe mainhand pool ${BOT}`);
      await sleep(800);
      const regs = {};
      for (const raw of srv.all.slice(from)) {
        const m = RE.reg.exec(raw);
        if (m) regs[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', window: m[6].trim() };
      }
      const row = { id, item, regCount: Object.keys(regs).length, rows: regs,
        fertilityUt: !!(regs['etim:fertility'] && regs['etim:fertility'].table),
        harvestingUt: !!(regs['etim:harvesting'] && regs['etim:harvesting'].table) };
      ev.wf1.arms.push(row);
      log('wf1', `${id}: regs=${row.regCount} fert=${row.fertilityUt} harv=${row.harvestingUt}`);
    }
    const firstRegs = ev.wf1.arms[0].rows;
    const W10 = caseMWindow(10, 5);
    ev.wf2 = {
      expected: W10,
      fertility: firstRegs['etim:fertility'] || null,
      harvesting: firstRegs['etim:harvesting'] || null,
      disarmingControl: firstRegs['etim:disarming'] || null,
    };
    ev.wf2.windowOk = !!ev.wf2.fertility && !!ev.wf2.harvesting
      && ev.wf2.fertility.window === W10 && ev.wf2.harvesting.window === W10
      && !!ev.wf2.disarmingControl && ev.wf2.disarmingControl.window === W10;
    ev.wf2.arms36Ok = ev.wf1.arms.every((a) => a.rows['etim:fertility']
      && a.rows['etim:fertility'].window === W10 && a.rows['etim:harvesting'].window === W10);
    log('wf2', JSON.stringify({ expected: W10, windowOk: ev.wf2.windowOk, arms36: ev.wf2.arms36Ok }));

    /* ===================== W-F3 tillage ===================== */
    ev.wf3 = {};
    const ring = [];
    for (const dx of [-1, 0, 1]) for (const dz of [-1, 0, 1]) if (dx || dz) ring.push({ x: bx + dx, y: by, z: bz + dz });
    /* 站桩收割：bot 不动，逐轮重建脚下 5×5 成熟作物、按 8 环位 dig（免 /tp 反作弊拉回） */
    const stationaryHarvest = async ({ crop, meta, tool, nbt, n, label }) => {
      const fromIdx = srv.all.length;
      let digs = 0, rounds = 0;
      while (digs < n && rounds < 16) {
        srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:farmland 0`);
        srv.send(`fill ${bx - 2} ${by} ${bz - 2} ${bx + 2} ${by} ${bz + 2} ${crop} ${meta}`);
        await sleep(900);
        srv.send(`clear ${BOT}`);
        stage(tool, nbt);
        await sleep(300);
        for (const p of ring) {
          if (digs >= n) break;
          srv.send(`etest dig ${p.x} ${p.y} ${p.z} ${BOT}`);
          digs++;
        }
        await sleep(2600);
        srv.send('kill @e[type=item]');
        srv.send(`etest food 20 20 ${BOT}`);
        srv.send(`etest health 20 ${BOT}`);
        rounds++;
        log(label, `round=${rounds} digs=${digs}`);
      }
      await sleep(600);
      return { from: fromIdx, digs, rounds };
    };
    /* L5：20 次（8 环位轮转） */
    srv.send(`clear ${BOT}`);
    stage('etim:hoe_copper');
    srv.send(`etest enchant mainhand 5 fertility ${BOT}`);
    await sleep(600);
    let from = srv.all.length;
    for (let round = 0; round < 3; round++) {
      for (const p of ring) srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:dirt 0`);
      await sleep(200);
      for (const p of ring) srv.send(`etest useblock ${p.x} ${p.y} ${p.z} ${BOT}`);
      await sleep(500);
    }
    await sleep(600);
    {
      const seg = rowsSince(from);
      const rows = seg.map((l) => RE.till.exec(l)).filter(Boolean).map((m) => ({ lvl: +m[1], need: +m[3], pass: m[4] === 'true' }));
      const sets = seg.filter((l) => RE.set.test(l)).length;
      const blocks = [];
      for (const p of ring.slice(0, 3)) blocks.push(await tf(p.x, p.y, p.z, 'minecraft:farmland'));
      ev.wf3.l5 = { tills: rows.length, pass: rows.filter((r) => r.pass).length, need: [...new Set(rows.map((r) => r.need))], sets, blocks };
      log('wf3-L5', JSON.stringify(ev.wf3.l5));
    }
    /* L1：N=200（环位批量，每轮 8 次 → 25 轮） */
    srv.send(`clear ${BOT}`);
    stage('etim:hoe_copper', ench(ev.ids.fertility, 1));
    await sleep(400);
    from = srv.all.length;
    for (let round = 0; round < 25; round++) {
      for (const p of ring) srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:dirt 0`);
      await sleep(120);
      for (const p of ring) srv.send(`etest useblock ${p.x} ${p.y} ${p.z} ${BOT}`);
      await sleep(330);
      if (round % 8 === 7) {
        stage('etim:hoe_copper', ench(ev.ids.fertility, 1));
        srv.send(`etest food 20 20 ${BOT}`);
        srv.send(`etest health 20 ${BOT}`);
      }
    }
    await sleep(700);
    {
      const rows = rowsSince(from).map((l) => RE.till.exec(l)).filter(Boolean).map((m) => ({ lvl: +m[1], pass: m[4] === 'true' }));
      const pass = rows.filter((r) => r.pass).length;
      const band = binomBand(0.2, 200);
      ev.wf3.l1 = { n: rows.length, pass, rate: +(pass / Math.max(rows.length, 1)).toFixed(4),
        band: { lo: +band.lo.toFixed(4), hi: +band.hi.toFixed(4) }, levels: [...new Set(rows.map((r) => r.lvl))] };
      ev.wf3.l1.ok = rows.length >= 195 && pass / rows.length >= band.lo && pass / rows.length <= band.hi;
      log('wf3-L1', JSON.stringify(ev.wf3.l1));
    }
    /* 粗泥 B-3 臂 */
    const cd = { x: bx - 2, y: by, z: bz - 2 };
    srv.send(`setblock ${cd.x} ${cd.y} ${cd.z} minecraft:dirt 1`);
    srv.send(`clear ${BOT}`);
    stage('etim:hoe_copper', ench(ev.ids.fertility, 5));
    await sleep(500);
    from = srv.all.length;
    srv.send(`etest useblock ${cd.x} ${cd.y} ${cd.z} ${BOT}`);
    await sleep(1200);
    ev.wf3.coarse = { tillRows: countSince(from, RE.till), block: await tf(cd.x, cd.y, cd.z, 'minecraft:dirt') };
    log('wf3-coarse', JSON.stringify(ev.wf3.coarse));

    /* ===================== W-F4 负臂 ===================== */
    ev.wf4 = { arms: [] };
    const negArms = [
      { id: 'vanilla-hoe-noench', item: 'minecraft:iron_hoe', nbt: null },
      { id: 'pickaxe-fert5', item: 'etim:pickaxe_copper', nbt: ench(ev.ids.fertility, 5) },
      { id: 'sword-fert5', item: 'etim:sword_copper', nbt: ench(ev.ids.fertility, 5) },
      { id: 'shovel-fert5', item: 'etim:shovel_copper', nbt: ench(ev.ids.fertility, 5) },
    ];
    for (const arm of negArms) {
      const p = [{ x: bx + 2, z: bz - 2 }, { x: bx + 2, z: bz + 2 }, { x: bx - 2, z: bz - 2 }, { x: bx - 2, z: bz + 2 }][ev.wf4.arms.length];
      p.y = by;
      srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:dirt 0`);
      srv.send(`clear ${BOT}`);
      stage(arm.item, arm.nbt);
      await sleep(450);
      from = srv.all.length;
      srv.send(`etest useblock ${p.x} ${p.y} ${p.z} ${BOT}`);
      await sleep(1100);
      const rows = countSince(from, RE.till);
      const block = await tf(p.x, p.y, p.z, 'minecraft:farmland');
      const isFarmland = /Successfully found/.test(block);
      ev.wf4.arms.push({ id: arm.id, tillRows: rows, becameFarmland: isFarmland, block });
      log('wf4', `${arm.id}: tillRows=${rows} farmland=${isFarmland}`);
    }
    /* 产品装填路径：/etest enchant token（L1 锄 → 出 tillage 行） */
    {
      const p = { x: bx + 2, y: by, z: bz + 2 };
      srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:dirt 0`);
      srv.send(`clear ${BOT}`);
      srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:hoe_copper 1 0`);
      await sleep(400);
      srv.send(`etest enchant mainhand 1 fertility ${BOT}`);
      await sleep(500);
      from = srv.all.length;
      srv.send(`etest useblock ${p.x} ${p.y} ${p.z} ${BOT}`);
      await sleep(1200);
      ev.wf4.tokenArm = { rows: rowsSince(from).filter((l) => RE.till.test(l)), block: await tf(p.x, p.y, p.z, 'minecraft:farmland') };
      log('wf4-token', JSON.stringify(ev.wf4.tokenArm));
    }

    /* ===================== W-F5 矩阵 ===================== */
    ev.wf5 = { arms: [] };
    const matrix = [
      { id: 'wheat-scythe', crop: 'minecraft:wheat', meta: 7, tool: 'etim:scythe_copper', want: true },
      { id: 'wheat-hoe', crop: 'minecraft:wheat', meta: 7, tool: 'etim:hoe_copper', want: false },
      { id: 'carrot-hoe', crop: 'minecraft:carrots', meta: 7, tool: 'etim:hoe_copper', want: true },
      { id: 'carrot-scythe', crop: 'minecraft:carrots', meta: 7, tool: 'etim:scythe_copper', want: false },
      { id: 'beetroot-hoe', crop: 'minecraft:beetroots', meta: 3, tool: 'etim:hoe_copper', want: true },
      { id: 'potato-mattock', crop: 'minecraft:potatoes', meta: 7, tool: 'etim:mattock_copper', want: true },
      { id: 'wheat-mattock', crop: 'minecraft:wheat', meta: 7, tool: 'etim:mattock_copper', want: false },
    ];
    /* 先清 y=by 位（W-F3 留下的 farmland 是实心，直接垫 farmland(by-1) 会被 onBlockAdded 转土） */
    matrix.forEach((a, i) => {
      const p = ring[i];
      srv.send(`setblock ${p.x} ${p.y} ${p.z} minecraft:air 0`);
      a.pos = p;
    });
    await sleep(500);
    matrix.forEach((a) => {
      srv.send(`setblock ${a.pos.x} ${a.pos.y - 1} ${a.pos.z} minecraft:farmland 0`);
      srv.send(`setblock ${a.pos.x} ${a.pos.y} ${a.pos.z} ${a.crop} ${a.meta}`);
    });
    await sleep(900);
    from = srv.all.length;
    for (let i = 0; i < matrix.length; i++) {
      const a = matrix[i];
      srv.send(`clear ${BOT}`);
      stage(a.tool, ench(ev.ids.fertility, 5));
      await sleep(500);
      a.present = await tf(a.pos.x, a.pos.y, a.pos.z, a.crop);
      /* dig 的 STOP 在 tick+40 才执行、且取 STOP 时刻的持件 ⇒ 必须逐臂等完再换工具 */
      srv.send(`etest dig ${a.pos.x} ${a.pos.y} ${a.pos.z} ${BOT}`);
      await sleep(2800);
    }
    {
      const seg = rowsSince(from);
      for (const a of matrix) {
        const posStr = `${a.pos.x},${a.pos.y},${a.pos.z}`;
        const rows = seg.filter((l) => { const m = RE.harvest.exec(l); return m && m[7] === posStr; });
        const blockAfter = await tf(a.pos.x, a.pos.y, a.pos.z, 'minecraft:air');
        const broken = /Successfully found/.test(blockAfter);
        ev.wf5.arms.push({ id: a.id, crop: a.crop, tool: a.tool, want: a.want,
          rows: rows.length, present: /Successfully found/.test(a.present || ''), broken, sample: rows[0] || null });
        log('wf5', `${a.id}: rows=${rows.length} want=${a.want} present=${/Successfully found/.test(a.present || '')} broken=${broken}`);
      }
    }

    /* ===================== W-F6 harvest 频率（L1 镰收小麦 N=200） ===================== */
    ev.wf6 = {};
    {
      const res = await stationaryHarvest({ crop: 'minecraft:wheat', meta: 7,
        tool: 'etim:scythe_copper', nbt: ench(ev.ids.fertility, 1), n: 200, label: 'wf6-round' });
      from = res.from;
      const rows = rowsSince(from).map((l) => RE.harvest.exec(l)).filter(Boolean)
        .map((m) => ({ tool: m[1], crop: m[2], lvl: +m[3], need: +m[6], pass: m[7] === 'true' }));
      const pass = rows.filter((r) => r.pass).length;
      const band = binomBand(0.2, 200);
      ev.wf6 = { digs: res.digs, rounds: res.rounds, rows: rows.length, pass,
        rate: +(pass / Math.max(rows.length, 1)).toFixed(4),
        needSet: [...new Set(rows.map((r) => r.need))], tools: [...new Set(rows.map((r) => r.tool))],
        crops: [...new Set(rows.map((r) => r.crop))],
        band: { lo: +band.lo.toFixed(4), hi: +band.hi.toFixed(4) } };
      ev.wf6.ok = rows.length >= 195 && ev.wf6.rate >= band.lo && ev.wf6.rate <= band.hi;
      log('wf6', JSON.stringify({ digs: res.digs, rows: ev.wf6.rows, pass, rate: ev.wf6.rate, band: ev.wf6.band, ok: ev.wf6.ok }));
    }

    /* ===================== 施肥地块 P1 / 对照 P0 / A-1 P7 ===================== */
    /* P1：8x8 施肥耕地（moisture 0 + TE）+ 麦（玻璃顶防雨） */
    srv.send(`fill ${bx + 4} ${by - 1} ${bz - 4} ${bx + 11} ${by - 1} ${bz + 3} minecraft:farmland 0 replace {EtimFertilized:1b}`);
    srv.send(`fill ${bx + 4} ${by} ${bz - 4} ${bx + 11} ${by} ${bz + 3} minecraft:wheat 0`);
    srv.send(`fill ${bx + 4} ${by + 2} ${bz - 4} ${bx + 11} ${by + 2} ${bz + 3} minecraft:glass 0`);
    /* P0：8x8 普通耕地 + 麦（对照） */
    srv.send(`fill ${bx - 12} ${by - 1} ${bz - 4} ${bx - 5} ${by - 1} ${bz + 3} minecraft:farmland 0`);
    srv.send(`fill ${bx - 12} ${by} ${bz - 4} ${bx - 5} ${by} ${bz + 3} minecraft:wheat 0`);
    srv.send(`fill ${bx - 12} ${by + 2} ${bz - 4} ${bx - 5} ${by + 2} ${bz + 3} minecraft:glass 0`);
    /* P7：A-1 自然衰减位（moisture 7 + TE + 麦，无顶） */
    srv.send(`fill ${bx - 12} ${by - 1} ${bz + 6} ${bx - 10} ${by - 1} ${bz + 8} minecraft:farmland 7 replace {EtimFertilized:1b}`);
    srv.send(`fill ${bx - 12} ${by} ${bz + 6} ${bx - 10} ${by} ${bz + 8} minecraft:wheat 0`);
    await sleep(1600);
    ev.wf8 = { controlPos: `${bx - 12},${by},${bz - 4}`, p1: `${bx + 4},${by},${bz - 4}` };
    ev.wf7 = { a1: {} };

    /* ===================== 生长窗（W-F7/W-F8/W-F9 + A-1） ===================== */
    srv.send('gamerule randomTickSpeed 400');
    from = srv.all.length;
    const rounds = [];
    for (let r = 0; r < 3; r++) {
      await sleep(20000);
      const seg = rowsSince(from);
      rounds.push({
        r: r + 1,
        growth: seg.filter((l) => RE.growth.test(l)).length,
        consume: seg.filter((l) => RE.clear.test(l)).length,
      });
      log('growth-round', JSON.stringify(rounds[rounds.length - 1]));
      /* 复位年龄（保持 age<max 以便继续被随机 tick）；末轮不复位，留成熟面给 W-F8 对照判读 */
      if (r < 2) {
        srv.send(`fill ${bx + 4} ${by} ${bz - 4} ${bx + 11} ${by} ${bz + 3} minecraft:wheat 0`);
        srv.send(`fill ${bx - 12} ${by} ${bz - 4} ${bx - 5} ${by} ${bz + 3} minecraft:wheat 0`);
        await sleep(500);
      }
      if (seg.filter((l) => RE.clear.test(l)).length >= 300) break;
    }
    srv.send('gamerule randomTickSpeed 3');
    {
      const seg = srv.all.slice(from).map(strip);
      const growth = seg.map((l) => RE.growth.exec(l)).filter(Boolean)
        .map((m) => ({ pos: m[1], value: +m[2], base: +m[3], ratio: +m[4], factor: +m[5] }));
      const p1 = growth.filter((g) => {
        const [x, , z] = g.pos.split(',').map(Number);
        return x >= bx + 4 && x <= bx + 11 && z >= bz - 4 && z <= bz + 3;
      });
      const p0 = growth.filter((g) => {
        const [x, , z] = g.pos.split(',').map(Number);
        return x >= bx - 12 && x <= bx - 5 && z >= bz - 4 && z <= bz + 3;
      });
      const p7 = growth.filter((g) => {
        const [x, , z] = g.pos.split(',').map(Number);
        return x >= bx - 12 && x <= bx - 10 && z >= bz + 6 && z <= bz + 8;
      });
      const consume = seg.map((l) => RE.clear.exec(l)).filter(Boolean)
        .map((m) => ({ pos: m[1], roll: +m[2], divisor: +m[3], cleared: m[4] === 'true' }));
      ev.wf8.rows = p1.length;
      ev.wf8.sample = p1.slice(0, 5);
      ev.wf8.ratioSet = [...new Set(p1.map((g) => g.ratio))];
      ev.wf8.factorSet = [...new Set(p1.map((g) => g.factor))];
      ev.wf8.valueBaseOk = p1.every((g) => Math.abs(g.value - g.base * 1.5) < 0.001);
      ev.wf8.controlRows = p0.length;
      ev.wf8.controlMaturity = {
        age0: await tf(bx - 12, by, bz - 4, 'minecraft:wheat', 'age=0'),
        age7: await tf(bx - 12, by, bz - 4, 'minecraft:wheat', 'age=7'),
      };
      ev.wf8.ok = p1.length > 0 && ev.wf8.ratioSet.length === 1 && ev.wf8.ratioSet[0] === 1.5
        && ev.wf8.factorSet.length === 1 && ev.wf8.factorSet[0] === 1.5 && ev.wf8.valueBaseOk && p0.length === 0;
      log('wf8', JSON.stringify({ rows: p1.length, ratio: ev.wf8.ratioSet, factor: ev.wf8.factorSet,
        valueBaseOk: ev.wf8.valueBaseOk, controlRows: p0.length, maturity: ev.wf8.controlMaturity }));

      /* A-1 自然衰减位：growth 行应在 moisture 首变后停止 */
      ev.wf7.a1 = {
        growthRows: p7.length,
        moisture: await tf(bx - 12, by - 1, bz + 6, 'minecraft:farmland', 'moisture=0'),
        sample: p7.slice(0, 3),
      };
      log('wf7-a1', JSON.stringify({ growth: p7.length, moisture: ev.wf7.a1.moisture }));

      /* W-F9 消耗面 */
      ev.wf9 = {
        rows: consume.length,
        divisorSet: [...new Set(consume.map((c) => c.divisor))],
        rollMin: consume.length ? Math.min(...consume.map((c) => c.roll)) : null,
        rollMax: consume.length ? Math.max(...consume.map((c) => c.roll)) : null,
        cleared: consume.filter((c) => c.cleared).length,
        clearedRolls: consume.filter((c) => c.cleared).map((c) => c.roll),
        badClear: consume.filter((c) => c.cleared !== (c.roll === 0)).length,
        sample: consume.slice(0, 4),
      };
      /* 清位后 growth 行应停：对每个 cleared=true 的 pos，检查该行之后是否仍有同 pos growth 行 */
      const lines = srv.all.slice(from);
      const clearIdx = [];
      lines.forEach((l, i) => { const m = RE.clear.exec(l); if (m && m[4] === 'true') clearIdx.push({ i, pos: m[1] }); });
      ev.wf9.postClearGrowth = clearIdx.map((c) => {
        const after = lines.slice(c.i + 1).filter((l) => {
          const m = RE.growth.exec(l); return m && m[1] === c.pos;
        }).length;
        return { pos: c.pos, after };
      });
      log('wf9', JSON.stringify({ rows: ev.wf9.rows, divisor: ev.wf9.divisorSet, rolls: [ev.wf9.rollMin, ev.wf9.rollMax],
        cleared: ev.wf9.cleared, badClear: ev.wf9.badClear, postClear: ev.wf9.postClearGrowth }));
    }

    /* ===================== W-F10 踩踏链 ===================== */
    ev.wf10 = {};
    {
      const F = { x: bx - 6, y: by - 1, z: bz + 6 };   // 稳定施肥位（moisture 0 + 作物）
      const G = { x: bx - 6, y: by - 1, z: bz + 9 };   // 普通耕地
      srv.send(`setblock ${F.x} ${F.y} ${F.z} minecraft:farmland 0 replace {EtimFertilized:1b}`);
      srv.send(`setblock ${F.x} ${by} ${F.z} minecraft:wheat 0`);
      srv.send(`setblock ${G.x} ${G.y} ${G.z} minecraft:farmland 0`);
      srv.send(`setblock ${G.x} ${by} ${G.z} minecraft:wheat 0`);
      await sleep(800);
      let trFrom = srv.all.length;
      srv.send(`summon minecraft:cow ${F.x + 0.5} ${by + 4} ${F.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tf1"]}`);
      srv.send(`summon minecraft:cow ${G.x + 0.5} ${by + 4} ${G.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tf2"]}`);
      await sleep(4200);
      ev.wf10.stable = {
        deny: rowsSince(trFrom).filter((l) => RE.deny.test(l) && l.includes(`pos=${F.x},${F.y},${F.z}`)),
        allow: rowsSince(trFrom).filter((l) => RE.allow.test(l) && l.includes(`pos=${F.x},${F.y},${F.z}`)),
        block: await tf(F.x, F.y, F.z, 'minecraft:farmland'),
      };
      ev.wf10.plain = {
        allow: rowsSince(trFrom).filter((l) => RE.allow.test(l) && l.includes(`pos=${G.x},${G.y},${G.z}`)),
        deny: rowsSince(trFrom).filter((l) => RE.deny.test(l) && l.includes(`pos=${G.x},${G.y},${G.z}`)),
        block: await tf(G.x, G.y, G.z, 'minecraft:dirt'),
      };
      /* A-1 衰减位：P7[0] 已在生长窗里经历 moisture 7→0（TE 已清） */
      const H = { x: bx - 12, y: by - 1, z: bz + 6 };
      trFrom = srv.all.length;
      srv.send(`summon minecraft:cow ${H.x + 0.5} ${by + 4} ${H.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tf3"]}`);
      await sleep(4000);
      ev.wf10.aged = {
        deny: rowsSince(trFrom).filter((l) => RE.deny.test(l) && l.includes(`pos=${H.x},${H.y},${H.z}`)),
        allow: rowsSince(trFrom).filter((l) => RE.allow.test(l) && l.includes(`pos=${H.x},${H.y},${H.z}`)),
        block: await tf(H.x, H.y, H.z, 'minecraft:dirt'),
      };
      log('wf10', JSON.stringify({ stable: ev.wf10.stable, plain: ev.wf10.plain, aged: ev.wf10.aged }));
      srv.send('kill @e[type=cow]');
      await sleep(500);
    }

    /* ===================== W-F7 破块重放不复活 ===================== */
    {
      const T = { x: bx + 3, y: by, z: bz - 3 };
      srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:dirt 0`);
      srv.send(`clear ${BOT}`);
      stage('etim:hoe_copper', ench(ev.ids.fertility, 5));
      await sleep(400);
      const f1 = srv.all.length;
      srv.send(`etest useblock ${T.x} ${T.y} ${T.z} ${BOT}`);
      await sleep(1300);
      const setRow = rowsSince(f1).filter((l) => RE.set.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`));
      /* 活体证明：新鲜位置踩踏 → deny */
      srv.send(`setblock ${T.x} ${T.y + 1} ${T.z} minecraft:wheat 0`);
      await sleep(500);
      let f2 = srv.all.length;
      srv.send(`summon minecraft:cow ${T.x + 0.5} ${by + 4} ${T.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tf4"]}`);
      await sleep(4000);
      const denyFresh = rowsSince(f2).filter((l) => RE.deny.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`));
      srv.send('kill @e[type=cow]');
      await sleep(600);
      /* 破块（耕地→掉土）→ 重放普通耕地 + 作物 → 踩踏应 allow（不复活） */
      srv.send(`etest dig ${T.x} ${T.y} ${T.z} ${BOT}`);
      await sleep(2600);
      const afterBreak = await tf(T.x, T.y, T.z, 'minecraft:air');
      srv.send(`setblock ${T.x} ${T.y} ${T.z} minecraft:farmland 0`);
      srv.send(`setblock ${T.x} ${T.y + 1} ${T.z} minecraft:wheat 0`);
      await sleep(900);
      f2 = srv.all.length;
      srv.send(`summon minecraft:cow ${T.x + 0.5} ${by + 4} ${T.z + 0.5} {Silent:1b,PersistenceRequired:1b,Tags:["tf5"]}`);
      await sleep(4200);
      const allowAfter = rowsSince(f2).filter((l) => RE.allow.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`));
      const denyAfter = rowsSince(f2).filter((l) => RE.deny.test(l) && l.includes(`pos=${T.x},${T.y},${T.z}`));
      const blockAfter = await tf(T.x, T.y, T.z, 'minecraft:dirt');
      ev.wf7.chain = { setRow, denyFresh, afterBreak, allowAfter, denyAfter, blockAfter };
      log('wf7-chain', JSON.stringify(ev.wf7.chain));
      srv.send('kill @e[type=cow]');
    }

    /* ===================== W-F11 丰收 ===================== */
    ev.wf11 = {};
    {
      /* 小麦：L5 harvesting 镰，N=200（站桩 5×5 逐轮重建） */
      const res = await stationaryHarvest({ crop: 'minecraft:wheat', meta: 7,
        tool: 'etim:scythe_copper', nbt: ench(ev.ids.harvesting, 5), n: 200, label: 'wf11-wheat-round' });
      from = res.from;
      {
        const rows = rowsSince(from).map((l) => RE.hrow.exec(l)).filter(Boolean)
          .map((m) => ({ crop: m[1], lvl: +m[2], fraction: +m[3], factor: +m[4], base: +m[5], extra: +m[6] }));
        const wheat = rows.filter((r) => r.crop === 'minecraft:wheat');
        const extraHit = wheat.filter((r) => r.extra > 0).length;
        const band = binomBand(0.5, 200);
        ev.wf11.wheat = {
          digs: res.digs, rounds: res.rounds,
          rows: wheat.length, extraHit, rate: +(extraHit / Math.max(wheat.length, 1)).toFixed(4),
          band: { lo: +band.lo.toFixed(4), hi: +band.hi.toFixed(4) },
          fractionSet: [...new Set(wheat.map((r) => r.fraction))],
          factorSet: [...new Set(wheat.map((r) => r.factor))],
          baseSet: [...new Set(wheat.map((r) => r.base))],
          extraMax: wheat.length ? Math.max(...wheat.map((r) => r.extra)) : null,
        };
        ev.wf11.wheat.ok = wheat.length >= 195 && ev.wf11.wheat.rate >= band.lo && ev.wf11.wheat.rate <= band.hi
          && ev.wf11.wheat.fractionSet.length === 1 && ev.wf11.wheat.fractionSet[0] === 1
          && ev.wf11.wheat.factorSet.length === 1 && ev.wf11.wheat.factorSet[0] === 0.5;
        log('wf11-wheat', JSON.stringify({ ...ev.wf11.wheat, ok: ev.wf11.wheat.ok }));
      }
    }
    {
      /* 胡萝卜：L5 harvesting 锄，60 次（base 带 + extra ≤ base） */
      const res = await stationaryHarvest({ crop: 'minecraft:carrots', meta: 7,
        tool: 'etim:hoe_copper', nbt: ench(ev.ids.harvesting, 5), n: 60, label: 'wf11-carrot-round' });
      from = res.from;
      const rows = rowsSince(from).map((l) => RE.hrow.exec(l)).filter(Boolean)
        .map((m) => ({ crop: m[1], base: +m[5], extra: +m[6] }));
      const carrot = rows.filter((r) => r.crop === 'minecraft:carrots');
      ev.wf11.carrot = {
        digs: res.digs, rows: carrot.length,
        baseSet: [...new Set(carrot.map((r) => r.base))].sort((a, b) => a - b),
        extraMax: carrot.length ? Math.max(...carrot.map((r) => r.extra)) : null,
        extraGtBase: carrot.filter((r) => r.extra > r.base).length,
        extraHit: carrot.filter((r) => r.extra > 0).length,
        perItemRates: Object.fromEntries([...new Set(carrot.map((r) => r.base))].sort((a, b) => a - b)
          .map((b) => [b, +((carrot.filter((r) => r.base === b && r.extra > 0).length
            / Math.max(carrot.filter((r) => r.base === b).length, 1)).toFixed(3))])),
      };
      log('wf11-carrot', JSON.stringify(ev.wf11.carrot));
    }

    /* ===================== 零回归：镰 attacking decay 400⇄100 + MeleeLog ===================== */
    ev.regression = {};
    {
      srv.send(`summon minecraft:cow ${bx + 2.2} ${by} ${bz + 0.5} {NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["zrcow"],Attributes:[{Name:"generic.maxHealth",Base:3000.0},{Name:"generic.knockbackResistance",Base:1.0}],Health:3000.0f}`);
      await sleep(900);
      const dx = 2.2, dz = 0;
      const eye = by + 1.62;
      const yaw = +(Math.atan2(-dx, dz) * 180 / Math.PI).toFixed(1);
      const pitch = +(Math.atan2(eye - (by + 0.7), Math.hypot(dx, dz)) * 180 / Math.PI).toFixed(1);
      from = srv.all.length;
      for (let i = 0; i < 4; i++) {
        srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} ${yaw} ${pitch}`);
        srv.send(`clear ${BOT}`);
        stage('etim:scythe_copper', i % 2 === 0 ? null : ench(ev.ids.vampiric, 5));
        await sleep(300);
        srv.send(`etest attack @e[tag=zrcow,c=1] ${BOT}`);
        await sleep(650);
      }
      const rows = rowsSince(from).map((l) => RE.decay.exec(l)).filter(Boolean)
        .map((m) => ({ face: m[1], item: m[2], loss: +m[3] })).filter((r) => r.face === 'attacking');
      ev.regression.scytheDecay = rows;
      ev.regression.meleeRows = countSince(from, /\[MeleeLog\]/);
      log('regression', JSON.stringify({ decay: rows, melee: ev.regression.meleeRows }));
      srv.send('kill @e[type=cow]');
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
    ev.jarUpToDate = ev.boot.jarTask.filter((l) => /UP-TO-DATE/.test(l)).length === 3;
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    fs.writeFileSync(CFG, fs.readFileSync(path.join(OUT, TAG + '-cfg.before')));
    setCfgValue(CFG, 'farmDebugLog', 'false');
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), keys: Object.keys(cfgKeys(CFG)).length };
    fs.writeFileSync(PROPS, propsBefore);
    ev.propsClose = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)), identical: sha256(fs.readFileSync(PROPS)) === PIN.props.sha };
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
