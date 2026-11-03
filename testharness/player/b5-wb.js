#!/usr/bin/env node
/**
 * b5-wb.js — butchering 批（B5）W-B 判窗驱动（三 boot：base / ench / cfg）
 *
 *   base : W-B1 载体门 + W-B2 案 M 窗口 + W-B3 无附魔基量（9 臂 N=200）
 *          + W-B5 燃烧/剪毛 + W-B6 looting/门/幼体 + W-B-CFG + W-B-REG
 *   ench : W-B4 附魔增量（L1/L3，七族 N=200）
 *   cfg  : butcheringMaxLevel=1 翻转（窗口收缩＋L2 拒绝）
 *
 * 判据：`[ButchLog] gate|family` 行 + `[EnchantLog] pool reg=` 行；
 *       数量面按族行字段（leather/beef/mutton/wool/meat/eye/…）统计。
 * 纪律：零产品码；一次 rebuild 一个指纹；客户端零触碰。
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const MODE = (process.argv[2] || 'base').toLowerCase();
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const OBFCFG = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const TAG = 'b5-wb-' + MODE;
const WORLD = 'b5wb' + MODE.slice(0, 3);
const BOT = 'ETIM_R6';
const PORT = 25565;

const PIN = {
  head: '10ac9d7',
  rel: { bytes: 874056, sha: 'F7777991904533C1EA20F91E86BD97492BE802D439B8018E8F4A1E040F3D2808' },
  dev: { bytes: 856699, sha: 'F07D7AC86A344C9AB9F5C6DC946902DE4D93E3FD156A6D64FF43FB3A0282FC04' },
  src: { bytes: 803129, sha: '6CCF03C07C0DA0F048752FD6FCA07DC63E88B2E4DC933C72BA981DFF051FF243' },
  /* C-13：server.properties 每次 boot 由 DedicatedServer 自写（两行 header + 转义规范化），
     farm1 窗的 890 B/3009633863 是「服务端改写前的副本」；本窗起以服务端规范化后的
     917 B/4BEB6B49 为新基线（键值集合不变，level-name=world）。 */
  props: { bytes: 917, sha: '4BEB6B49E11251E938DDA3FAD3D610D374D90A3195FB93E9F0F9DC3ACB378800' },
};
const MK_PIN = { classes: 67, entries: 153, dual: 306, mixins: 62, client: 10 };
const OBFCFG_SHA = '262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
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
function mkCounts() {
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
  const out = {};
  for (const [key, f] of [['refmapResources', REFMAP_A], ['refmapTmp', REFMAP_B]]) {
    const r = read(f);
    const entries = Object.values(r.mappings).reduce((a, x) => a + Object.keys(x).length, 0);
    out[key] = { classes: Object.keys(r.mappings).length, entries, dual: entries * 2 };
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.classes && out.refmapResources.entries === MK_PIN.entries
    && out.refmapTmp.classes === MK_PIN.classes && out.refmapTmp.entries === MK_PIN.entries
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client;
  return out;
}
function netstatListen(port) {
  try {
    return execFileSync('netstat', ['-ano'], { encoding: 'utf8' })
      .split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) { return -1; }
}
function crashCount() {
  try { return fs.readdirSync(path.join(ROOT, 'run', 'crash-reports')).filter((f) => fs.statSync(path.join(ROOT, 'run', 'crash-reports', f)).isFile()).length; }
  catch (e) { return -1; }
}
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }

const RE = {
  gate: /\[ButchLog\] gate entity=(\S+) child=(true|false) doMobLoot=(true|false) lvl=(\d+) kept=(\d+) familyRemoved=(\d+) recent=(true|false) well=(\S+)/,
  skip: /\[ButchLog\] gate entity=(\S+) child=(true|false) doMobLoot=(true|false) .*?skip/,
  cow: /\[ButchLog\] cow well=(\S+) lvl=(\d+) leather=(\d+) rB=(-?\d+) nudge=(\d+) beef=(\d+) burning=(true|false)/,
  pig: /\[ButchLog\] pig well=(\S+) lvl=(\d+) rB=(-?\d+) pork=(\d+) burning=(true|false) saddled=(true|false)/,
  sheep: /\[ButchLog\] sheep sheared=(true|false) burning=(true|false) color=(\S+) well=(\S+) lvl=(\d+) rB=(-?\d+) wool=(\d+) mutton=(\d+) leather=(\d+)/,
  horse: /\[ButchLog\] horse cls=(\S+) lvl=(\d+) n=(\d+) zeroed=(\d+) baseFlesh=(\d+) meat=(\d+) burning=(true|false)/,
  spider: /\[ButchLog\] spider recent=(true|false) lvl=(\d+) r3=(-?\d+) short=(true|false) eye=(\d+)/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,
  ids: /\[EtimInit\] enchant.*?ids=([\d\s]+)/,
  attack: /\[TestLog\] step=attack player=\S+ target=/,
  noTarget: /\[TestLog\] step=attack player=\S+ NO_TARGET/,
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
  'etim:fertility': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:harvesting': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
};

/* ---------------- 臂定义 ---------------- */
const ARMS_BASE = [
  { id: 'cow', type: 'minecraft:cow', kind: 'cow', n: 200, extra: '' },
  { id: 'pig', type: 'minecraft:pig', kind: 'pig', n: 200, extra: '' },
  { id: 'sheep', type: 'minecraft:sheep', kind: 'sheep', n: 200, extra: '' },
  { id: 'horse', type: 'minecraft:horse', kind: 'horse', n: 200, extra: ',Variant:0' },
  { id: 'donkey', type: 'minecraft:donkey', kind: 'horse', n: 200, extra: '' },
  { id: 'llama', type: 'minecraft:llama', kind: 'horse', n: 200, extra: '' },
  { id: 'zombie_horse', type: 'minecraft:zombie_horse', kind: 'horse', n: 200, extra: '' },
  { id: 'skeleton_horse', type: 'minecraft:skeleton_horse', kind: 'horse', n: 200, extra: '' },
  { id: 'spider', type: 'minecraft:spider', kind: 'spider', n: 200, extra: '' },
];

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: MODE, startedAt: new Date().toISOString(), arms: [], probes: {} };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins = {
    devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
    srcJar: pinOf(SRCJAR, PIN.src, 'src'), props: pinOf(PROPS, PIN.props, 'props'), mk: mkCounts(),
  };
  ev.obfCfgBefore = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)) };
  const keysBefore = cfgKeys(CFG);
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), keys: Object.keys(keysBefore).length };
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH') + ' dev=' + ev.pins.devJar.sha.slice(0, 12)
    + ' rel=' + ev.pins.relJar.sha.slice(0, 12) + ' src=' + ev.pins.srcJar.sha.slice(0, 12)
    + ' mk=' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.headOk) throw new Error('HEAD mismatch');

  setCfg(CFG, 'butcheringDebugLog', 'true');
  if (MODE === 'cfg' || MODE === 'cfgitems') setCfg(CFG, 'butcheringMaxLevel', '1');
  ev.cfgFlipped = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let bx = 0, by = 0, bz = 0, KX = 0, KY = 0, KZ = 0;
  const rowsFrom = (from) => srv.all.slice(from).map(strip);
  const stage = (nbt) => srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:knife_flint 1 0 ` + (nbt || '{Unbreakable:1b}'));
  let killSeq = 0;
  const dummyName = 'ETIM_R6';

  const countGateRecent = (from) => srv.all.slice(from).map(strip)
    .filter((l) => { const m = RE.gate.exec(l); return m && m[7] === 'true'; }).length;

  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('server never reached Done(');
    ev.boot = { ready: strip(srv.all.find((l) => /Done \(/.test(l))).trim(),
      mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length };
    const idsLine = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*?ids=/.test(l)) || '';
    const idm = RE.ids.exec(idsLine);
    ev.ids = { line: idsLine.slice(0, 200), ids: idm ? idm[1].trim().split(/\s+/).map(Number) : null };
    ev.butcheringId = ev.ids.ids ? ev.ids.ids[ev.ids.ids.length - 1] : null;
    log('boot', ev.boot.ready + ' mixinFail=' + ev.boot.mixinFail + ' ids=' + JSON.stringify(ev.ids.ids));

    /* C-13b：/Done 后 FML status ping 可能尚未就绪 → 重试 5 次（每次 2s） */
    await sleep(1500);
    let botErr = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try { bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT }); botErr = null; break; }
      catch (e) { botErr = e; log('bot-retry', attempt + ': ' + (e && e.message)); await sleep(2000); }
    }
    if (!bot) throw botErr || new Error('bot connect failed');
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doFireTick false',
      'mobGriefing false', 'keepInventory true', 'randomTickSpeed 0', 'doTileDrops true', 'naturalRegeneration false']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(900);
    const p0 = bot.entity.position;
    bx = Math.floor(p0.x); by = Math.floor(p0.y); bz = Math.floor(p0.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 8} ${by - 2} ${bz - 8} ${bx + 8} ${by - 2} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by - 1} ${bz - 8} ${bx + 8} ${by - 1} ${bz + 8} minecraft:stone 0`);
    srv.send(`fill ${bx - 8} ${by} ${bz - 8} ${bx + 8} ${by + 5} ${bz + 8} minecraft:air 0`);
    await sleep(2200);
    /* 判窗工装位：脚边东侧 1 格、视线 -90/45（vanilla 近战 reach 面 + 射线命中框面，
       见 W-B 工装注 C-12：/etest attack 的 ETIM reach 门按 getEntityRayDistance 判，
       站位/俯角不对会 deny，不是产品缺陷） */
    KX = bx + 1.5; KY = by; KZ = bz + 0.5;
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} -90 45`);
    await sleep(1400);
    ev.arena.killSpot = `${KX},${KY},${KZ}`;

    /* ---------------- cfgitems 模式：W-B5 熟肉 id 物证 + W-B6 掉落缺席物证 ---------------- */
    if (MODE === 'cfgitems') {
      const probe = async (cmdLine, okRe) => {
        const f = srv.all.length;
        srv.send(cmdLine);
        await sleep(450);
        const seg = rowsFrom(f);
        return { hit: seg.some((l) => okRe.test(l)),
          lines: seg.filter((l) => /Found item|found nothing|did not match|Failed to execute/i.test(l)).slice(0, 3) };
      };
      const kItem = (type, extra, tag) => {
        srv.send(`summon ${type} ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b${extra},Tags:["${tag}"]}`);
      };
      ev.itemProbes = {};
      const burn = [
        { id: 'burn-cow', type: 'minecraft:cow', extra: ',Fire:999s', cooked: 'minecraft:cooked_beef', raw: 'minecraft:beef' },
        { id: 'burn-pig', type: 'minecraft:pig', extra: ',Fire:999s', cooked: 'minecraft:cooked_porkchop', raw: 'minecraft:porkchop' },
        { id: 'burn-sheep', type: 'minecraft:sheep', extra: ',Fire:999s', cooked: 'minecraft:cooked_mutton', raw: 'minecraft:mutton' },
        { id: 'burn-horse', type: 'minecraft:horse', extra: ',Variant:0,Fire:999s', cooked: 'minecraft:cooked_beef', raw: 'minecraft:beef' },
      ];
      for (const p of burn) {
        srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
        await sleep(300);
        const tag = 'kc_' + (killSeq++);
        kItem(p.type, p.extra, tag);
        await sleep(300);
        srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
        await sleep(260);
        const cooked = await probe(`execute @p ~ ~ ~ testfor @e[type=item,r=4] {Item:{id:"${p.cooked}"}}`, /Found item\./);
        const raw = await probe(`execute @p ~ ~ ~ testfor @e[type=item,r=4] {Item:{id:"${p.raw}"}}`, /Found item\./);
        ev.itemProbes[p.id] = { cooked, raw };
        log('item', `${p.id} cooked=${cooked.hit} raw=${raw.hit}`);
        srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
        await sleep(200);
      }
      /* 鞍位（W-B5）：saddled 猪 → 家族行 saddled=true，鞍由 vanilla after-super 掉（不在 capture 列表） */
      {
        srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
        await sleep(250);
        const tag = 'ksad_' + (killSeq++);
        const f = srv.all.length;
        kItem('minecraft:pig', ',Saddle:1b', tag);
        await sleep(300);
        srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
        await sleep(260);
        const saddle = await probe(`execute @p ~ ~ ~ testfor @e[type=item,r=4] {Item:{id:"minecraft:saddle"}}`, /Found item\./);
        const seg = rowsFrom(f);
        const pigRow = seg.filter((l) => RE.pig.test(l)).slice(0, 1);
        ev.itemProbes.saddledPig = { saddle, pigRow, familyRows: seg.filter((l) => RE.pig.test(l)).length };
        log('item', 'saddledPig saddleItem=' + saddle.hit + ' row=' + (pigRow[0] || '').slice(0, 90));
        srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
        await sleep(200);
      }
      /* doMobLoot=false → 0 掉落 */
      srv.send('gamerule doMobLoot false');
      await sleep(300);
      {
        const tag = 'knl2_' + (killSeq++);
        const f = srv.all.length;
        kItem('minecraft:cow', '', tag);
        await sleep(300);
        srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
        await sleep(700);
        const seg = rowsFrom(f);
        const anyItem = await probe('execute @p ~ ~ ~ testfor @e[type=item,r=4]', /Found (item|entity)\./);
        ev.itemProbes.noLoot = { skip: seg.filter((l) => RE.skip.test(l)).length,
          family: seg.filter((l) => RE.cow.test(l)).length, item: anyItem };
        log('item', 'noLoot skip=' + ev.itemProbes.noLoot.skip + ' family=' + ev.itemProbes.noLoot.family + ' item=' + anyItem.hit);
      }
      srv.send('gamerule doMobLoot true');
      await sleep(300);
      /* 幼体 → 0 掉落 */
      {
        srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
        await sleep(250);
        const tag = 'kch2_' + (killSeq++);
        const f = srv.all.length;
        kItem('minecraft:cow', ',Age:-24000', tag);
        await sleep(300);
        srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
        await sleep(700);
        const seg = rowsFrom(f);
        const anyItem = await probe('execute @p ~ ~ ~ testfor @e[type=item,r=4]', /Found (item|entity)\./);
        ev.itemProbes.child = { skip: seg.filter((l) => RE.skip.test(l)).length,
          family: seg.filter((l) => RE.cow.test(l)).length, item: anyItem };
        log('item', 'child skip=' + ev.itemProbes.child.skip + ' family=' + ev.itemProbes.child.family + ' item=' + anyItem.hit);
      }
    }

    /* ---------------- W-B1 / W-B2 载体门 + 窗口（五探针） ---------------- */
    if (MODE !== 'ench') {
      ev.carrier = {};
      for (const item of ['etim:knife_flint', 'etim:dagger_copper', 'etim:sword_copper', 'etim:pickaxe_copper', 'etim:hoe_copper']) {
        srv.send(`clear ${BOT}`);
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
        await sleep(350);
        const from = srv.all.length;
        srv.send(`etest enchantprobe mainhand pool ${BOT}`);
        await sleep(900);
        const seg = rowsFrom(from);
        const reg = {};
        for (const l of seg) { const m = RE.reg.exec(l); if (m) reg[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', treasure: m[5] === 'true', window: m[6].trim() }; }
        const b = reg['etim:etim_butchering'] || null;
        ev.carrier[item] = { butchering: b, regCount: Object.keys(reg).length, reg };
        log('carrier', item + ' table=' + (b ? b.table : 'MISSING') + ' reg=' + Object.keys(reg).length);
      }
      const knife = ev.carrier['etim:knife_flint'];
      ev.wb2 = {
        window: knife.butchering ? knife.butchering.window : null,
        id: knife.butchering ? knife.butchering.id : null,
        weight: knife.butchering ? knife.butchering.weight : null,
        treasure: knife.butchering ? knife.butchering.treasure : null,
        regCount: knife.regCount,
      };
      /* 前批十枚窗口零变 */
      const reg = knife.reg;
      ev.regPrev = Object.fromEntries(Object.keys(EXPECTED_WINDOW).map((k) => [k,
        reg[k] ? { id: reg[k].id, window: reg[k].window, same: reg[k].window === EXPECTED_WINDOW[k] } : null]));
      ev.regPrevAllSame = Object.keys(EXPECTED_WINDOW).every((k) => reg[k] && reg[k].window === EXPECTED_WINDOW[k]);
      log('wb2', JSON.stringify(ev.wb2) + ' prevWindowsSame=' + ev.regPrevAllSame);
      /* 4 级拒绝（maxLevel 纯上限位） */
      srv.send(`clear ${BOT}`);
      stage();
      await sleep(350);
      const f4 = srv.all.length;
      srv.send(`etest enchant mainhand ${MODE === 'base' ? 4 : 2} butchering ${BOT}`);
      await sleep(500);
      ev.wb2.overLevel = rowsFrom(f4).filter((l) => /too big|at most|usage/i.test(l)).slice(0, 2);
      log('wb2-over', JSON.stringify(ev.wb2.overLevel).slice(0, 200));
      stage();
      await sleep(300);
    }

    /* ---------------- 杀臂执行器 ---------------- */
    const runArm = async (arm) => {
      const from = srv.all.length;
      const t0 = Date.now();
      const timeout = arm.timeoutMs || 180000;
      let round = 0;
      stage(arm.weaponNbt);
      await sleep(280);
      let sanity = false;
      while (true) {
        const kills = countGateRecent(from);
        if (kills >= arm.n) break;
        if (kills > 0) sanity = true;
        if (!sanity && round >= 3) throw new Error('arm ' + arm.id + ': no gate row after 3 rounds (channel/counter defect)');
        if (Date.now() - t0 > timeout) break;
        const batch = Math.min(6, arm.n - kills);
        for (let i = 0; i < batch; i++) {
          const tag = `k${arm.seq}_${killSeq++}`;
          srv.send(`summon ${arm.type} ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b${arm.extra || ''},Tags:["${tag}"]}`);
          await sleep(45);
          srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
          await sleep(75);
        }
        round++;
        if (round % 4 === 0) {
          srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
          stage(arm.weaponNbt);
          await sleep(220);
        }
      }
      srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
      await sleep(250);
      const seg = rowsFrom(from);
      const gates = seg.map((l) => RE.gate.exec(l)).filter(Boolean)
        .map((m) => ({ entity: m[1], child: m[2] === 'true', loot: m[3] === 'true', lvl: +m[4], kept: +m[5], removed: +m[6], recent: m[7] === 'true', well: m[8] }));
      const skips = seg.filter((l) => RE.skip.test(l)).length;
      const fam = { cow: [], pig: [], sheep: [], horse: [], spider: [] };
      for (const l of seg) {
        let m;
        if ((m = RE.cow.exec(l))) fam.cow.push({ well: m[1], lvl: +m[2], leather: +m[3], rB: +m[4], nudge: +m[5], beef: +m[6], burning: m[7] === 'true' });
        else if ((m = RE.pig.exec(l))) fam.pig.push({ well: m[1], lvl: +m[2], rB: +m[3], pork: +m[4], burning: m[5] === 'true', saddled: m[6] === 'true' });
        else if ((m = RE.sheep.exec(l))) fam.sheep.push({ sheared: m[1] === 'true', burning: m[2] === 'true', color: m[3], well: m[4], lvl: +m[5], rB: +m[6], wool: +m[7], mutton: +m[8], leather: +m[9] });
        else if ((m = RE.horse.exec(l))) fam.horse.push({ cls: m[1], lvl: +m[2], n: +m[3], zeroed: +m[4], baseFlesh: +m[5], meat: +m[6], burning: m[7] === 'true' });
        else if ((m = RE.spider.exec(l))) fam.spider.push({ recent: m[1] === 'true', lvl: +m[2], r3: +m[3], short: m[4] === 'true', eye: +m[5] });
      }
      const rows = fam[arm.kind];
      const res = {
        id: arm.id, kind: arm.kind, type: arm.type, n: arm.n, kills: gates.filter((g) => g.recent).length,
        gateRows: gates.length, skipRows: skips, familyRows: rows.length,
        lvlSet: [...new Set(gates.map((g) => g.lvl))], recentAll: gates.filter((g) => g.recent).every((g) => g.recent),
        neitherGate: gates.filter((g) => !g.recent).length,
        wellSet: [...new Set(gates.map((g) => g.well))],
        keptSet: [...new Set(gates.map((g) => g.kept))], removedSet: [...new Set(gates.map((g) => g.removed))],
        elapsedSec: Math.round((Date.now() - t0) / 1000), lines: `${from + 1}-${srv.all.length}`,
        sample: rows.slice(0, 3),
      };
      if (arm.kind === 'cow') {
        res.leather = { min: Math.min(...rows.map((r) => r.leather)), max: Math.max(...rows.map((r) => r.leather)), mean: +mean(rows.map((r) => r.leather)).toFixed(4) };
        res.beef = { min: Math.min(...rows.map((r) => r.beef)), max: Math.max(...rows.map((r) => r.beef)), mean: +mean(rows.map((r) => r.beef)).toFixed(4) };
        res.nudge = rows.filter((r) => r.nudge === 1).length;
        res.nudgeRate = +(res.nudge / Math.max(rows.length, 1)).toFixed(4);
        res.nudgeOnOneOnly = rows.every((r) => r.nudge === 0 || r.beef === 2);
        res.rBSet = [...new Set(rows.map((r) => r.rB))].sort((a, b) => a - b);
      } else if (arm.kind === 'pig') {
        res.pork = { min: Math.min(...rows.map((r) => r.pork)), max: Math.max(...rows.map((r) => r.pork)), mean: +mean(rows.map((r) => r.pork)).toFixed(4) };
        res.saddledAny = rows.some((r) => r.saddled);
      } else if (arm.kind === 'sheep') {
        res.mutton = { min: Math.min(...rows.map((r) => r.mutton)), max: Math.max(...rows.map((r) => r.mutton)), mean: +mean(rows.map((r) => r.mutton)).toFixed(4) };
        res.wool = { count: rows.filter((r) => r.wool === 1).length, rate: +(rows.filter((r) => r.wool === 1).length / Math.max(rows.length, 1)).toFixed(4) };
        res.leather = { count: rows.filter((r) => r.leather === 1).length, rate: +(rows.filter((r) => r.leather === 1).length / Math.max(rows.length, 1)).toFixed(4) };
        res.shearedSet = [...new Set(rows.map((r) => r.sheared))];
        res.colorSet = [...new Set(rows.map((r) => r.color))];
        res.burningSet = [...new Set(rows.map((r) => r.burning))];
      } else if (arm.kind === 'horse') {
        res.base = { min: Math.min(...rows.map((r) => r.n)), max: Math.max(...rows.map((r) => r.n)), mean: +mean(rows.map((r) => r.n)).toFixed(4) };
        res.meat = { min: Math.min(...rows.map((r) => r.meat)), max: Math.max(...rows.map((r) => r.meat)), mean: +mean(rows.map((r) => r.meat)).toFixed(4) };
        res.clsSet = [...new Set(rows.map((r) => r.cls))];
        res.fleshMin = Math.min(...rows.map((r) => r.baseFlesh));
        res.fleshMax = Math.max(...rows.map((r) => r.baseFlesh));
        res.fleshMean = +mean(rows.map((r) => r.baseFlesh)).toFixed(4);
        res.zeroKills = rows.filter((r) => r.baseFlesh === 0).length;
        res.zeroRate = +(res.zeroKills / Math.max(rows.length, 1)).toFixed(4);
        res.zeroedSum = rows.reduce((a, r) => a + r.zeroed, 0);
      } else if (arm.kind === 'spider') {
        res.eye = { count: rows.filter((r) => r.eye === 1).length, rate: +(rows.filter((r) => r.eye === 1).length / Math.max(rows.length, 1)).toFixed(4) };
        res.shortRate = +(rows.filter((r) => r.short).length / Math.max(rows.length, 1)).toFixed(4);
        res.shortAlwaysEye = rows.filter((r) => r.short).every((r) => r.eye === 1);
        res.r3Set = [...new Set(rows.map((r) => r.r3))].sort((a, b) => a - b);
      }
      ev.arms.push(res);
      log('arm', `${arm.id} n=${res.kills}/${arm.n} fam=${res.familyRows} lvl=${JSON.stringify(res.lvlSet)} `
        + `kept=${JSON.stringify(res.keptSet)} rm=${JSON.stringify(res.removedSet)} ${res.elapsedSec}s `
        + (res.beef ? `beef=${JSON.stringify(res.beef)} nudge=${res.nudgeRate}` : '')
        + (res.pork ? `pork=${JSON.stringify(res.pork)}` : '')
        + (res.mutton ? `mutton=${JSON.stringify(res.mutton)} wool=${res.wool.rate}` : '')
        + (res.meat ? `meat=${JSON.stringify(res.meat)} base=${JSON.stringify(res.base)} zero=${res.zeroRate}` : '')
        + (res.eye ? `eye=${res.eye.rate} short=${res.shortRate}` : ''));
      return res;
    };

    /* ---------------- base 模式：W-B3 / W-B5 / W-B6 ---------------- */
    if (MODE === 'base') {
      let seq = 0;
      for (const arm of ARMS_BASE) {
        await runArm({ ...arm, seq: seq++, weaponNbt: null });
      }

      /* W-B5 燃烧/剪毛臂（N=60；燃烧位用 Fire:999s 避召唤当 tick 的 onFire 伤害） */
      const burnArms = [
        { id: 'burn-cow', type: 'minecraft:cow', kind: 'cow', n: 60, extra: ',Fire:999s', cooked: 'minecraft:cooked_beef', raw: 'minecraft:beef' },
        { id: 'burn-pig', type: 'minecraft:pig', kind: 'pig', n: 60, extra: ',Fire:999s', cooked: 'minecraft:cooked_porkchop', raw: 'minecraft:porkchop' },
        { id: 'burn-sheep', type: 'minecraft:sheep', kind: 'sheep', n: 60, extra: ',Fire:999s', cooked: 'minecraft:cooked_mutton', raw: 'minecraft:mutton' },
        { id: 'burn-horse', type: 'minecraft:horse', kind: 'horse', n: 60, extra: ',Variant:0,Fire:999s', cooked: 'minecraft:cooked_beef', raw: 'minecraft:beef' },
        { id: 'sheared-sheep', type: 'minecraft:sheep', kind: 'sheep', n: 60, extra: ',Sheared:1b' },
      ];
      for (const arm of burnArms) {
        const r = await runArm({ ...arm, seq: seq++, weaponNbt: null });
        /* 熟肉物证：清场后单杀一只，用 execute@bot 的 r=4 testfor 验 item id */
        if (arm.cooked) {
          srv.send(`execute @p ~ ~ ~ kill @e[type=item,r=10]`);
          await sleep(300);
          const tag = `kcook_${killSeq++}`;
          srv.send(`summon ${arm.type} ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b${arm.extra},Tags:["${tag}"]}`);
          await sleep(350);
          srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
          await sleep(700);
          const cFrom = srv.all.length;
          srv.send(`execute @p ~ ~ ~ testfor @e[type=item,r=4] {Item:{id:"${arm.cooked}"}}`);
          await sleep(400);
          const cookedHit = rowsFrom(cFrom).join(' | ');
          const rFrom = srv.all.length;
          srv.send(`execute @p ~ ~ ~ testfor @e[type=item,r=4] {Item:{id:"${arm.raw}"}}`);
          await sleep(400);
          const rawHit = rowsFrom(rFrom).join(' | ');
          ev.probes[arm.id + '-item'] = {
            cooked: /Found entity|Successfully found/.test(cookedHit), cookedRaw: cookedHit.slice(0, 130),
            raw: /Found entity|Successfully found/.test(rawHit), rawRaw: rawHit.slice(0, 130),
          };
          log('cooked', `${arm.id} cooked=${ev.probes[arm.id + '-item'].cooked} raw=${ev.probes[arm.id + '-item'].raw}`);
        }
      }

      /* W-B6-a looting III vs 0（牛，L0，N=200 对照基臂） */
      const lootingArm = await runArm({ id: 'cow-looting3', type: 'minecraft:cow', kind: 'cow', n: 200, seq: seq++,
        weaponNbt: '{Unbreakable:1b,ench:[{id:21,lvl:3}]}' });
      /* W-B6-b doMobLoot=false（5 杀） */
      {
        srv.send('gamerule doMobLoot false');
        await sleep(400);
        const from = srv.all.length;
        for (let i = 0; i < 5; i++) {
          const tag = `knl_${killSeq++}`;
          srv.send(`summon minecraft:cow ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["${tag}"]}`);
          await sleep(60);
          srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
          await sleep(260);
        }
        await sleep(400);
        const seg = rowsFrom(from);
        const iFrom = srv.all.length;
        srv.send(`execute @p ~ ~ ~ testfor @e[type=item,r=4]`);
        await sleep(400);
        ev.probes.noLoot = {
          skips: seg.filter((l) => RE.skip.test(l)).length,
          familyRows: seg.filter((l) => RE.cow.test(l) || RE.pig.test(l) || RE.sheep.test(l) || RE.horse.test(l) || RE.spider.test(l)).length,
          items: rowsFrom(iFrom).join(' | ').slice(0, 100),
          sample: seg.filter((l) => RE.skip.test(l)).slice(0, 2),
        };
        log('noLoot', JSON.stringify(ev.probes.noLoot).slice(0, 300));
        srv.send('gamerule doMobLoot true');
        await sleep(300);
      }
      /* W-B6-c 幼体（cow/pig/sheep/horse 各 2） */
      {
        const childArms = [
          { type: 'minecraft:cow', kind: 'cow', extra: ',Age:-24000' },
          { type: 'minecraft:pig', kind: 'pig', extra: ',Age:-24000' },
          { type: 'minecraft:sheep', kind: 'sheep', extra: ',Age:-24000' },
          { type: 'minecraft:horse', kind: 'horse', extra: ',Variant:0,Age:-24000' },
        ];
        const from = srv.all.length;
        for (const a of childArms) {
          for (let i = 0; i < 2; i++) {
            const tag = `kch_${killSeq++}`;
            srv.send(`summon ${a.type} ${KX} ${KY} ${KZ} {Health:1.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b${a.extra},Tags:["${tag}"]}`);
            await sleep(60);
            srv.send(`etest attack @e[tag=${tag},c=1] ${BOT}`);
            await sleep(260);
          }
        }
        await sleep(500);
        const seg = rowsFrom(from);
        ev.probes.child = {
          skips: seg.filter((l) => RE.skip.test(l)).length,
          childTrue: seg.filter((l) => /child=true/.test(l) && /skip|recent/.test(l)).length,
          familyRows: seg.filter((l) => RE.cow.test(l) || RE.pig.test(l) || RE.sheep.test(l) || RE.horse.test(l)).length,
          sample: seg.filter((l) => RE.skip.test(l)).slice(0, 4),
        };
        log('child', JSON.stringify(ev.probes.child).slice(0, 300));
      }
    }

    /* ---------------- ench 模式：W-B4 ---------------- */
    if (MODE === 'ench') {
      const enchArms = [];
      let seq = 0;
      const fam = [
        { id: 'cow', type: 'minecraft:cow', kind: 'cow', extra: '' },
        { id: 'pig', type: 'minecraft:pig', kind: 'pig', extra: '' },
        { id: 'sheep', type: 'minecraft:sheep', kind: 'sheep', extra: '' },
        { id: 'horse', type: 'minecraft:horse', kind: 'horse', extra: ',Variant:0' },
        { id: 'llama', type: 'minecraft:llama', kind: 'horse', extra: '' },
        { id: 'spider', type: 'minecraft:spider', kind: 'spider', extra: '' },
      ];
      for (const f of fam) {
        for (const lvl of [1, 3]) {
          enchArms.push({ ...f, id: `${f.id}-L${lvl}`, lvl, n: 200,
            weaponNbt: `{Unbreakable:1b,ench:[{id:${ev.butcheringId},lvl:${lvl}}]}` });
        }
      }
      enchArms.push({ id: 'donkey-L3', type: 'minecraft:donkey', kind: 'horse', extra: '', lvl: 3, n: 200,
        weaponNbt: `{Unbreakable:1b,ench:[{id:${ev.butcheringId},lvl:3}]}` });
      for (const a of enchArms) {
        const r = await runArm({ ...a, seq: seq++ });
        r.armLvl = a.lvl;
      }
    }

    /* ---------------- 收口面统计 ---------------- */
    const plain = srv.all.map(strip);
    ev.rowCounts = {
      butchGate: plain.filter((l) => RE.gate.test(l)).length,
      butchSkip: plain.filter((l) => RE.skip.test(l)).length,
      cow: plain.filter((l) => RE.cow.test(l)).length,
      pig: plain.filter((l) => RE.pig.test(l)).length,
      sheep: plain.filter((l) => RE.sheep.test(l)).length,
      horse: plain.filter((l) => RE.horse.test(l)).length,
      spider: plain.filter((l) => RE.spider.test(l)).length,
      melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
      farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
      mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
      attackTarget: plain.filter((l) => RE.attack.test(l)).length,
      attackNoTarget: plain.filter((l) => RE.noTarget.test(l)).length,
      butchUnparsed: plain.filter((l) => /\[ButchLog\]/.test(l) && !RE.gate.test(l) && !RE.skip.test(l)
        && !RE.cow.test(l) && !RE.pig.test(l) && !RE.sheep.test(l) && !RE.horse.test(l) && !RE.spider.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));

    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    /* 早退也收口：先优雅停服再回填配置（C-13c） */
    try {
      if (!srv.exited) {
        ev.stop = await srv.stop();
        ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
      }
    } catch (e) { ev.stopError = String((e && e.message) || e); }
    const keysAfter = cfgKeys(CFG);
    const newKeys = Object.keys(keysAfter).filter((k) => !(k in keysBefore));
    const changed = Object.keys(keysBefore).filter((k) => keysAfter[k] !== keysBefore[k]);
    ev.cfgFace = { newKeys, changed, values: {
      difficulty: keysAfter.butcheringDifficulty, maxLevel: keysAfter.butcheringMaxLevel, debugLog: keysAfter.butcheringDebugLog,
    } };
    setCfg(CFG, 'butcheringDebugLog', 'false');
    if (MODE === 'cfg' || MODE === 'cfgitems') setCfg(CFG, 'butcheringMaxLevel', '3');
    {
      const keysRestored = cfgKeys(CFG);
      ev.cfgFaceRestored = {
        changed: Object.keys(keysBefore).filter((k) => keysRestored[k] !== keysBefore[k]),
        newKeys: Object.keys(keysRestored).filter((k) => !(k in keysBefore)),
        debugLog: keysRestored.butcheringDebugLog, maxLevel: keysRestored.butcheringMaxLevel,
      };
    }
    ev.cfgClose = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      sameAsStartValues: Object.keys(keysBefore).every((k) => cfgKeys(CFG)[k] === keysBefore[k]) };
    ev.obfCfgAfter = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)), untouched: sha256(fs.readFileSync(OBFCFG)) === OBFCFG_SHA };
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
