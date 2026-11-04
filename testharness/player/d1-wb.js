#!/usr/bin/env node
/**
 * d1-wb.js — D-1 附魔池批（B7）W-DP 判窗驱动（六模式）
 *   main  : 钉值 / W-DP1 池探针 / W-DP9 载体矩阵（reg rw/rwindow）/
 *           W-DP11 free_action / W-DP-REG ids+前窗逐字 / 台面机制冒烟
 *   table : W-DP3 预算三臂 / W-DP4 L4-L5 可达 / W-DP5 丙（点数+青金石门）/
 *           W-DP6 特例 / W-DP7 书池 / W-DP9 功能载体臂
 *   bulk  : W-DP2 权重分布（模型↔真机 χ²）/ W-DP10 互斥族 / W-DP1 九步
 *   fee   : W-DP5 乙（enchantLapisRequired=false 零青金石）
 *   mob   : W-DP8 怪装单门 0.1×f
 *   cfg   : W-DP12 pool 总开关回退 / W-DP-CFG treeFelling=5 + freeAction=1
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const { Vec3 } = require('vec3');

const ROOT = path.resolve(__dirname, '..', '..');
const MODE = (process.argv[2] || 'main').toLowerCase();
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
const TAG = 'd1-wb-' + MODE;
const WORLD = 'd1wb';
const BOT = 'ETIM_R7';
const PORT = 25565;

const PIN = {
  head: '081b7c5',
  rel: { bytes: 936717, sha: '527A3081DF4E28AEE1CD429ED0CE5D61BEFDB4A489A91EFCD47CEBF16F2305B7' },
  dev: { bytes: 918140, sha: '417CE9E76FE5A5B2E00DB5C3F5C3B5C3A474B600E907FA816BECF617FB15A60D' },
  src: { bytes: 853915, sha: '97EACC83F764554B7193862A69535F4FE677ABF25C0F20F33FE961A692A73F18' },
};
const MK_PIN = { classes: 69, entries: 159, dual: 318, mixins: 64, client: 10 };

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
/** 首启前补齐 cfg 新键（Forge 只在 save 时写；判窗要在 boot 前把 debug 门打开） */
function ensureEnchantSection(file) {
  const t = fs.readFileSync(file, 'utf8');
  if (/^enchant\s*\{/m.test(t)) return false;
  const nl = t.includes('\r\n') ? '\r\n' : '\n';
  const block = ['enchant {',
    '    B:enchantPoolR196=true',
    '    B:enchantLapisRequired=true',
    '    B:enchantDebugLog=false',
    '    I:freeActionDifficulty=10',
    '    I:freeActionMaxLevel=4',
    '}', ''].join(nl);
  fs.writeFileSync(file, t + (t.endsWith(nl) ? '' : nl) + block, 'utf8');
  return true;
}
function ensureCfgKey(file, k, type, v) {
  const t = fs.readFileSync(file, 'utf8');
  if (new RegExp('^(    [A-Z]:' + k + '=)', 'm').test(t)) return false;
  const nl = t.includes('\r\n') ? '\r\n' : '\n';
  const lines = t.split(/\r?\n/);
  const start = lines.findIndex((l) => /^enchant\s*\{/.test(l));
  if (start < 0) throw new Error('cfg section enchant missing');
  let end = start + 1;
  while (end < lines.length && !/^\}/.test(lines[end])) end++;
  lines.splice(end, 0, '    ' + type + ':' + k + '=' + v);
  fs.writeFileSync(file, lines.join(nl), 'utf8');
  return true;
}
function cfgKeys(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
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

const RE = {
  ids: /\[EtimInit\] enchant.*?ids=([\d\s]+)/,
  rod: /\[EtimInit\] fishing rod (\S+) maxDamage=(\d+) ench=(\d+)/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?) rw=(\d+) rwindow=(.*?) \[server\]/,
  slot: /\[EnchantLog\] pool slot=(\d+) budget=(\d+) size=(\d+) item=(\S+)/,
  poolE: /\[EnchantLog\] pool-e slot=(\d+) budget=(\d+) list=empty/,
  start: /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(\d+) start/,
  none: /\[EnchLog\] pool item=(\S+) budget=(\d+) out=none \(ench (\d+)\)/,
  pick: /\[EnchLog\] pick item=(\S+) ench=(\d+) L=(\d+) cost=(\d+) adj=(-?\d+)/,
  end: /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(-?\d+) cand=end picks=(\d+)/,
  conflict: /\[EnchLog\] conflict dropped=(\d+)/,
  level: /\[EnchLog\] level slot=(\d+) books=(\d+) power=(\d+) levels=(\d+) frac=([\d.]+) out=(\d+)/,
  feeDenyLapis: /\[EnchLog\] fee slot=(\d+) cost=(\d+) lapis=1 gate=deny/,
  feeDenyPool: /\[EnchLog\] fee slot=(\d+) cost=(\d+) pool=(-?\d+) gate=deny/,
  feePay: /\[EnchLog\] fee cost=(\d+) pool=(-?\d+)/,
  special: /\[EnchLog\] special kind=(\w+) fee=(\d+)/,
  book: /\[EnchLog\] book picks=(\d+) keep=(\S+):(\d+)/,
  apply: /\[EnchLog\] apply slot=(\d+) picks=(\d+)/,
  nonTable: /\[EnchLog\] nonTable src=(\w+)(?: tension=([\d.]+))?/,
};

function parseBuilds(lines) {
  const builds = [];
  let cur = null;
  for (const l of lines) {
    let m = RE.start.exec(l);
    if (m) { cur = { item: m[1], budget: +m[2], adj0: +m[3], picks: [], conflicts: 0 }; builds.push(cur); continue; }
    m = RE.pick.exec(l);
    if (m && cur) { cur.picks.push({ item: m[1], ench: +m[2], L: +m[3], cost: +m[4], adj: +m[5] }); continue; }
    m = RE.conflict.exec(l);
    if (m && cur) { cur.conflicts += +m[1]; continue; }
    m = RE.end.exec(l);
    if (m && cur) { cur.adjEnd = +m[3]; cur.picksN = +m[4]; cur = null; }
  }
  return builds;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: MODE, startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins = {
    devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
    srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts(),
  };
  ev.crashBefore = crashCount();
  ev.portBefore = netstatListen(PORT);
  ev.obfCfgBefore = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)) };
  const keysBefore = cfgKeys(CFG);
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), keys: Object.keys(keysBefore).length };
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH')
    + ' dev=' + ev.pins.devJar.sha.slice(0, 12) + ' rel=' + ev.pins.relJar.sha.slice(0, 12)
    + ' src=' + ev.pins.srcJar.sha.slice(0, 12) + ' mk=' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH')
    + ' cfg=' + ev.cfgBefore.keys + ' keys');
  if (!ev.headOk) throw new Error('HEAD mismatch');

  ev.cfgAddedSection = ensureEnchantSection(CFG);
  ensureCfgKey(CFG, 'enchantPoolR196', 'B', 'true');
  ensureCfgKey(CFG, 'enchantLapisRequired', 'B', 'true');
  ensureCfgKey(CFG, 'enchantDebugLog', 'B', 'false');
  ensureCfgKey(CFG, 'freeActionDifficulty', 'I', '10');
  ensureCfgKey(CFG, 'freeActionMaxLevel', 'I', '4');
  ev.cfgAddedKeys = ['enchantPoolR196', 'enchantLapisRequired', 'enchantDebugLog', 'freeActionDifficulty', 'freeActionMaxLevel']
    .filter((k) => !(k in keysBefore));
  setCfg(CFG, 'enchantDebugLog', 'true');
  if (MODE === 'fee') setCfg(CFG, 'enchantLapisRequired', 'false');
  if (MODE === 'cfg') {
    setCfg(CFG, 'enchantPoolR196', 'false');
    setCfg(CFG, 'treeFellingMaxLevel', '5');
    setCfg(CFG, 'freeActionMaxLevel', '1');
  }
  ev.cfgFlipped = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let tx = 0, ty = 0, tz = 0;
  let table = null;
  const rowsFrom = (from) => srv.all.slice(from).map(strip);
  const mark = () => srv.all.length;

  const probePool = async (item) => {
    srv.send(`clear ${BOT}`);
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
    await sleep(320);
    const from = mark();
    srv.send(`etest enchantprobe mainhand pool ${BOT}`);
    await sleep(780);
    const seg = rowsFrom(from);
    const reg = {};
    const slots = [];
    let poolE = 0;
    for (const l of seg) {
      const m = RE.reg.exec(l);
      if (m) reg[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', treasure: m[5] === 'true', window: m[6].trim(), rw: +m[7], rwindow: m[8].trim() };
      const s = RE.slot.exec(l);
      if (s) slots.push({ slot: +s[1], budget: +s[2], size: +s[3] });
      if (RE.poolE.test(l)) poolE++;
    }
    return { reg, slots, poolE, line: from + 1 };
  };

  const rig = async (books) => {
    if (table) { try { bot.closeWindow(table); } catch (e) { /* noop */ } table = null; await sleep(250); }
    const cells = [[0, -2], [-2, -1], [-1, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0]];
    srv.send(`fill ${tx - 4} ${ty - 2} ${tz - 4} ${tx + 4} ${ty + 5} ${tz + 4} minecraft:air 0`);
    srv.send(`fill ${tx - 4} ${ty - 1} ${tz - 4} ${tx + 4} ${ty - 1} ${tz + 4} minecraft:stone 0`);
    srv.send(`setblock ${tx} ${ty} ${tz} minecraft:enchanting_table 0`);
    const n0 = Math.min(books, 12);
    const n1 = Math.max(0, books - 12);
    for (let i = 0; i < n0; i++) srv.send(`setblock ${tx + cells[i][0]} ${ty} ${tz + cells[i][1]} minecraft:bookshelf 0`);
    for (let i = 0; i < n1; i++) srv.send(`setblock ${tx + cells[i][0]} ${ty + 1} ${tz + cells[i][1]} minecraft:bookshelf 0`);
    srv.send(`tp ${BOT} ${tx + 0.5} ${ty} ${tz + 1.5} 180 0`);
    await sleep(900);
  };
  const openTable = async () => {
    for (let i = 0; i < 3; i++) {
      try {
        table = await bot.openEnchantmentTable(bot.blockAt(new Vec3(tx, ty, tz)));
        return true;
      } catch (e) { log('open-retry', i + ': ' + e.message); await sleep(600); }
    }
    return false;
  };
  const putItem = async (item, meta) => {
    /* 台面槽只能经玩家窗口写入（TileEntityEnchantmentTable 不是 IInventory）：
       hotbar.0(容器槽 29) → 台面槽 0 */
    srv.send(`replaceitem entity ${BOT} slot.hotbar.0 ${item} 1 ${meta || 0}`);
    await sleep(230);
    try { await bot.moveSlotItem(29, 0); } catch (e) {
      log('putItem-retry', e.message);
      await openTable();
      try { await bot.moveSlotItem(29, 0); } catch (e2) { log('putItem-fail', e2.message); }
    }
    await sleep(320);
  };
  const putLapis = async (count) => {
    srv.send(`replaceitem entity ${BOT} slot.hotbar.1 minecraft:dye ${count} 4`);
    await sleep(230);
    try { await bot.moveSlotItem(30, 1); } catch (e) {
      log('putLapis-retry', e.message);
      await openTable();
      try { await bot.moveSlotItem(30, 1); } catch (e2) { log('putLapis-fail', e2.message); }
    }
    await sleep(300);
  };
  const takeItem = async () => {
    try { await bot.moveSlotItem(0, 29); } catch (e) { /* noop */ }
    await sleep(240);
  };
  const enchant = async (slot) => {
    if (!table) return false;
    const from = mark();
    bot._client.write('enchant_item', { windowId: table.id, enchantment: slot });
    await sleep(230);
    return rowsFrom(from);
  };

  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('server never reached Done(');
    ev.boot = {
      ready: strip(srv.all.find((l) => /Done \(/.test(l))).trim(),
      mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
    };
    const idsLine = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*?ids=/.test(l)) || '';
    const idm = RE.ids.exec(idsLine);
    ev.ids = { line: idsLine.slice(0, 240), ids: idm ? idm[1].trim().split(/\s+/).map(Number) : null };
    ev.rods = srv.all.map(strip).map((l) => RE.rod.exec(l)).filter(Boolean)
      .map((m) => ({ item: m[1], maxDamage: +m[2], ench: +m[3] }));
    log('boot', ev.boot.ready + ' mixinFail=' + ev.boot.mixinFail + ' ids=' + JSON.stringify(ev.ids.ids));

    await sleep(1500);
    let botErr = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try { bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT }); botErr = null; break; }
      catch (e) { botErr = e; log('bot-retry', attempt + ': ' + e.message); await sleep(2000); }
    }
    if (!bot) throw botErr;
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doFireTick false',
      'mobGriefing false', 'keepInventory true', 'randomTickSpeed 3', 'naturalRegeneration false', 'doWeatherCycle false']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear 1000000');
    srv.send(`gamemode 1 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(900);

    const p0 = bot.entity.position;
    tx = Math.floor(p0.x) + 6; ty = Math.floor(p0.y); tz = Math.floor(p0.z);
    ev.rigAt = { tx, ty, tz };

    /* ================= main ================= */
    if (MODE === 'main') {
      const items = ['minecraft:diamond_sword', 'etim:sword_copper', 'etim:war_hammer_copper',
        'etim:battle_axe_copper', 'minecraft:shears', 'etim:knife_flint',
        'etim:chestplate_mithril', 'minecraft:iron_chestplate', 'minecraft:leather_chestplate',
        'etim:leggings_mithril', 'minecraft:leather_leggings', 'etim:helmet_mithril',
        'etim:pickaxe_copper', 'minecraft:bow', 'etim:fishing_rod_flint',
        'etim:fishing_rod_obsidian', 'etim:fishing_rod_copper'];
      ev.probe = {};
      for (const item of items) {
        ev.probe[item] = await probePool(item);
        const p = ev.probe[item];
        log('probe', `${item} reg=${Object.keys(p.reg).length} slots=${JSON.stringify(p.slots)} poolE=${p.poolE}`);
        if (item === 'etim:sword_copper') { ev.regAll = p.reg; ev.regLine = p.line; }
      }
      ev.regCount = Object.keys(ev.regAll).length;
      ev.ff = ev.regAll['etim:fishing_fortune'] || null;
      ev.ar = ev.regAll['etim:arrow_recovery'] || null;
      ev.fa = ev.regAll['etim:free_action'] || null;
      ev.tf = ev.regAll['etim:tree_felling'] || null;
      /* 跨批对照：上一批判窗的 reg 窗串 */
      try {
        const prev = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8'));
        const prevReg = prev.regAll || {};
        ev.regPrev = Object.fromEntries(Object.entries(prevReg).map(([k, v]) => [k,
          { prevWindow: v.window, nowWindow: ev.regAll[k] ? ev.regAll[k].window : null,
            same: !!ev.regAll[k] && ev.regAll[k].window === v.window }]));
        ev.regPrevAllSame = Object.values(ev.regPrev).every((x) => x.same);
        ev.regPrevCount = Object.keys(ev.regPrev).length;
      } catch (e) { ev.regPrevError = String(e.message); }

      /* 台面机制冒烟（0 书）：铜杆预算 4，看 level 行 + 一次真附魔 */
      await rig(0);
      ev.tableSmoke = { opened: await openTable() };
      if (ev.tableSmoke.opened) {
        const f0 = mark();
        await putItem('etim:fishing_rod_copper');
        ev.tableSmoke.levels = rowsFrom(f0).map((l) => RE.level.exec(l)).filter(Boolean)
          .map((m) => ({ slot: +m[1], books: +m[2], power: +m[3], levels: +m[4], frac: +m[5], out: +m[6] }));
        const seg = await enchant(2);
        ev.tableSmoke.enchantRows = seg.filter((l) => /\[EnchLog\]/.test(l)).slice(0, 6);
        ev.tableSmoke.applied = seg.filter((l) => RE.apply.test(l) || RE.book.test(l)).length;
        log('tableSmoke', JSON.stringify(ev.tableSmoke).slice(0, 400));
      }
      /* 五通道 + 行计数 */
      const plain = srv.all.map(strip);
      ev.rowCounts = {
        ench: plain.filter((l) => /\[EnchLog\]/.test(l)).length,
        enchant: plain.filter((l) => /\[EnchantLog\]/.test(l)).length,
        melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
        mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
        farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
        butch: plain.filter((l) => /\[ButchLog\]/.test(l)).length,
        arrow: plain.filter((l) => /\[ArrowLog\]/.test(l)).length,
        mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length,
      };
      log('counts', JSON.stringify(ev.rowCounts));
    }

    /* ================= table ================= */
    if (MODE === 'table') {
      ev.levelArms = [];
      const levelArm = async (item, books, reps) => {
        await rig(books);
        if (!await openTable()) return { item, books, opened: false };
        const out = [];
        for (let r = 0; r < (reps || 3); r++) {
          const from = mark();
          await putItem(item);
          const rows = rowsFrom(from).map((l) => RE.level.exec(l)).filter(Boolean)
            .map((m) => ({ slot: +m[1], books: +m[2], power: +m[3], levels: +m[4], frac: +m[5], out: +m[6] }));
          out.push(rows);
          await sleep(250);
        }
        const flat = out.flat();
        const arm = { item, books, opened: true, samples: out.length, rows: flat.slice(0, 12) };
        log('levelArm', `${item} books=${books} ` + JSON.stringify(flat.slice(0, 3).map((x) => `${x.slot}:b${x.books}/p${x.power}/l${x.levels}/${x.frac}/o${x.out}`)));
        return arm;
      };
      ev.levelArms.push(await levelArm('etim:fishing_rod_copper', 0));
      ev.levelArms.push(await levelArm('etim:fishing_rod_copper', 7));
      ev.levelArms.push(await levelArm('etim:fishing_rod_copper', 12));
      ev.levelArms.push(await levelArm('etim:fishing_rod_copper', 24));
      ev.levelArms.push(await levelArm('etim:fishing_rod_mithril', 7));
      ev.levelArms.push(await levelArm('etim:fishing_rod_mithril', 10));
      ev.levelArms.push(await levelArm('etim:fishing_rod_mithril', 24));
      ev.levelArms.push(await levelArm('etim:fishing_rod_flint', 7));

      /* W-DP4 可达：真附魔扫 pick 的 L 分布 */
      ev.reach = [];
      const reachArm = async (item, books, n) => {
        await rig(books);
        if (!await openTable()) return { item, books, opened: false };
        await putItem(item);
        const from = mark();
        for (let i = 0; i < n; i++) {
          const seg = await enchant(2);
          if (!seg.some((l) => RE.apply.test(l) || RE.book.test(l))) {
            /* 槽被清空过（书）或预算 0：重放物品 */
            await putItem(item);
          }
          if (i % 25 === 24) log('reach-progress', `${item} b${books} ${i + 1}/${n}`);
        }
        const seg = rowsFrom(from);
        const builds = parseBuilds(seg);
        const picks = builds.flatMap((b) => b.picks);
        const arm = {
          item, books, builds: builds.length, picks: picks.length,
          lMax: picks.length ? Math.max(...picks.map((p) => p.L)) : null,
          lSet: [...new Set(picks.map((p) => p.L))].sort((a, b) => a - b),
          enchSet: [...new Set(picks.map((p) => p.ench))],
          line: `${from + 1}-${srv.all.length}`,
        };
        log('reach', `${item} b${books} builds=${arm.builds} picks=${arm.picks} L=${JSON.stringify(arm.lSet)}`);
        return arm;
      };
      ev.reach.push(await reachArm('etim:fishing_rod_copper', 7, 40));
      ev.reach.push(await reachArm('etim:fishing_rod_copper', 12, 40));
      ev.reach.push(await reachArm('etim:fishing_rod_mithril', 7, 40));
      ev.reach.push(await reachArm('etim:fishing_rod_mithril', 10, 40));

      /* W-DP9 功能载体臂：高预算下各件出现/缺席 */
      ev.carrierArms = [];
      const carrierArm = async (item, n) => {
        await rig(24);
        if (!await openTable()) return { item, opened: false };
        await putItem(item);
        const from = mark();
        for (let i = 0; i < n; i++) {
          await enchant(2);
          if (i % 30 === 29) await putItem(item);
        }
        const seg = rowsFrom(from);
        const builds = parseBuilds(seg);
        const picks = builds.flatMap((b) => b.picks);
        const arm = {
          item, builds: builds.length, picks: picks.length,
          ench: Object.fromEntries([...new Set(picks.map((p) => p.ench))].map((id) => [id, picks.filter((p) => p.ench === id).length])),
          line: `${from + 1}-${srv.all.length}`,
        };
        log('carrierArm', `${item} builds=${arm.builds} picks=${arm.picks} ids=${JSON.stringify(Object.keys(arm.ench))}`);
        return arm;
      };
      ev.carrierArms.push(await carrierArm('etim:war_hammer_copper', 90));
      ev.carrierArms.push(await carrierArm('etim:sword_copper', 90));
      ev.carrierArms.push(await carrierArm('etim:pickaxe_copper', 90));
      ev.carrierArms.push(await carrierArm('etim:chestplate_mithril', 90));
      ev.carrierArms.push(await carrierArm('etim:chestplate_copper', 90));
      ev.carrierArms.push(await carrierArm('minecraft:leather_chestplate', 90));
      ev.carrierArms.push(await carrierArm('etim:helmet_mithril', 90));
      ev.carrierArms.push(await carrierArm('etim:leggings_mithril', 90));
      ev.carrierArms.push(await carrierArm('minecraft:leather_leggings', 90));

      /* W-DP5 丙：点数门 + 青金石门（生存） */
      ev.fee = {};
      srv.send(`gamemode 0 ${BOT}`);
      srv.send(`xp -100000 ${BOT}`);
      await sleep(500);
      await rig(3);
      if (await openTable()) {
        const lvFrom = mark();
        await putItem('etim:sword_copper');
        const lv = rowsFrom(lvFrom).map((l) => RE.level.exec(l)).filter(Boolean)
          .map((m) => ({ slot: +m[1], out: +m[6] }));
        ev.fee.levels = lv;
        const shown = lv.length ? lv[2].out : 0;
        ev.fee.shownSlot2 = shown;
        ev.fee.fee = shown * 100;
        /* ① 点数 = fee 且青金石足 → 成功 */
        srv.send(`etest level 0 ${BOT}`);
        await sleep(280);
        srv.send(`xp ${shown * 100} ${BOT}`);
        await sleep(350);
        await putLapis(64);
        const fromOk = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 });
        await sleep(550);
        const okRows = rowsFrom(fromOk);
        ev.fee.success = {
          fee: okRows.filter((l) => RE.feePay.test(l)).map((l) => l.trim()).slice(0, 2),
          applied: okRows.filter((l) => RE.apply.test(l)).length,
          denyPool: okRows.filter((l) => RE.feeDenyPool.test(l)).length,
          denyLapis: okRows.filter((l) => RE.feeDenyLapis.test(l)).length,
        };
        /* ② 差 1 点 → deny */
        srv.send(`etest level 0 ${BOT}`);
        await sleep(280);
        srv.send(`xp ${shown * 100 - 1} ${BOT}`);
        await sleep(350);
        await putLapis(64);
        const fromDeny = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 });
        await sleep(450);
        const denyRows = rowsFrom(fromDeny);
        ev.fee.denyPool = denyRows.filter((l) => RE.feeDenyPool.test(l)).map((l) => l.trim()).slice(0, 2);
        /* ③ 青金石 0 → deny lapis */
        srv.send(`etest level 0 ${BOT}`);
        await sleep(280);
        srv.send(`xp ${shown * 100} ${BOT}`);
        await sleep(350);
        srv.send(`clear ${BOT} minecraft:dye -1 4`);
        await sleep(300);
        try { await bot.moveSlotItem(1, 30); } catch (e) { /* noop */ }
        await sleep(350);
        const fromLap = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 });
        await sleep(450);
        const lapRows = rowsFrom(fromLap);
        ev.fee.denyLapis = lapRows.filter((l) => RE.feeDenyLapis.test(l)).map((l) => l.trim()).slice(0, 2);
        log('fee', JSON.stringify(ev.fee).slice(0, 500));
      }

      /* W-DP6 特例 + W-DP7 书池（创造，避免费用） */
      srv.send(`gamemode 1 ${BOT}`);
      await sleep(400);
      ev.specials = {};
      if (await openTable()) {
        await putItem('minecraft:potion', 0);
        const fw = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 1 });
        await sleep(500);
        ev.specials.water = rowsFrom(fw).filter((l) => RE.special.test(l)).map((l) => l.trim()).slice(0, 2);
        ev.specials.waterSlot = table.slots && table.slots[0] ? { name: table.slots[0].name, meta: table.slots[0].metadata } : null;
        await putItem('minecraft:golden_apple', 0);
        const fa = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 1 });
        await sleep(500);
        ev.specials.apple = rowsFrom(fa).filter((l) => RE.special.test(l)).map((l) => l.trim()).slice(0, 2);
        ev.specials.appleSlot = table.slots && table.slots[0] ? { name: table.slots[0].name, meta: table.slots[0].metadata } : null;
        /* 书池 */
        await putItem('minecraft:book');
        await sleep(300);
        const fb = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 });
        await sleep(600);
        const bookRows = rowsFrom(fb);
        ev.book = {
          rows: bookRows.filter((l) => RE.book.test(l)).map((l) => l.trim()).slice(0, 4),
          slot: table.slots && table.slots[0] ? { name: table.slots[0].name, nbt: JSON.stringify(table.slots[0].nbt || null).slice(0, 220) } : null,
        };
        log('specials', JSON.stringify(ev.specials).slice(0, 300));
        log('book', JSON.stringify(ev.book).slice(0, 300));
      }
      const plain = srv.all.map(strip);
      ev.rowCounts = {
        ench: plain.filter((l) => /\[EnchLog\]/.test(l)).length,
        melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
        mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
        farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
        butch: plain.filter((l) => /\[ButchLog\]/.test(l)).length,
        mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length,
      };
    }

    /* ================= bulk ================= */
    if (MODE === 'bulk') {
      const ARMS = [
        { item: 'minecraft:diamond_sword', n: 3000 },
        { item: 'etim:chestplate_mithril', n: 700 },
        { item: 'etim:pickaxe_copper', n: 700 },
      ];
      ev.bulkArms = [];
      const reg = (() => {
        try { return JSON.parse(fs.readFileSync(path.join(OUT, 'd1-wb-main-evidence.json'), 'utf8')).regAll; }
        catch (e) { return null; }
      })();
      const idOf = {};
      if (reg) for (const [k, v] of Object.entries(reg)) idOf[k] = v.id;
      const PAIRS = [
        ['minecraft:sharpness', 'minecraft:smite'],
        ['minecraft:sharpness', 'minecraft:bane_of_arthropods'],
        ['minecraft:smite', 'minecraft:bane_of_arthropods'],
        ['minecraft:protection', 'minecraft:fire_protection'],
        ['minecraft:protection', 'minecraft:blast_protection'],
        ['minecraft:protection', 'minecraft:projectile_protection'],
        ['minecraft:protection', 'minecraft:feather_falling'],
        ['minecraft:silk_touch', 'minecraft:fortune'],
        ['minecraft:looting', 'minecraft:silk_touch'],
        ['minecraft:fortune', 'minecraft:silk_touch'],
      ];
      for (const armDef of ARMS) {
        await rig(24);
        if (!await openTable()) throw new Error('table open failed');
        await putItem(armDef.item);
        const from = mark();
        const t0 = Date.now();
        for (let i = 0; i < armDef.n; i++) {
          bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 });
          await sleep(70);
          if (i % 400 === 399) {
            log('bulk-progress', `${armDef.item} ${i + 1}/${armDef.n} ${Math.round((Date.now() - t0) / 1000)}s`);
            if (!table.slots || !table.slots[0] || !table.slots[0].name) await putItem(armDef.item);
          }
        }
        await sleep(900);
        const seg = rowsFrom(from);
        const builds = parseBuilds(seg);
        const picks = builds.flatMap((b) => b.picks);
        const arm = {
          item: armDef.item, n: armDef.n, builds: builds.length, picks: picks.length,
          elapsedSec: Math.round((Date.now() - t0) / 1000),
          picksHist: builds.reduce((a, b) => { a[b.picks.length] = (a[b.picks.length] || 0) + 1; return a; }, {}),
          maxPicks: builds.length ? Math.max(...builds.map((b) => b.picks.length)) : 0,
          adjCheckViolations: builds.filter((b) => {
            for (let i = 0; i < b.picks.length; i++) {
              const prev = i === 0 ? b.adj0 : b.picks[i - 1].adj;
              if (b.picks[i].adj !== prev - b.picks[i].cost - 5) return true;
            }
            return false;
          }).length,
          costMismatch: picks.filter((p) => p.cost !== (p.L >= 1 ? null : null)).length,
          demoted: picks.filter((p) => p.L > 1).length,
          enchHist: picks.reduce((a, p) => { a[p.ench] = (a[p.ench] || 0) + 1; return a; }, {}),
          buildsWith2plus: builds.filter((b) => b.picks.length >= 2).length,
          conflictBuilds: builds.filter((b) => b.conflicts > 0).length,
          pairs: {},
          line: `${from + 1}-${srv.all.length}`,
        };
        for (const [a, b] of PAIRS) {
          const ia = idOf[a], ib = idOf[b];
          arm.pairs[a + '+' + b] = builds.filter((x) => {
            const s = new Set(x.picks.map((p) => p.ench));
            return s.has(ia) && s.has(ib);
          }).length;
        }
        ev.bulkArms.push(arm);
        log('bulk', JSON.stringify({ item: arm.item, builds: arm.builds, picks: arm.picks, sec: arm.elapsedSec,
          maxPicks: arm.maxPicks, hist: arm.picksHist, adjBad: arm.adjCheckViolations, pairs: arm.pairs }));
      }
    }

    /* ================= fee (乙 臂) ================= */
    if (MODE === 'fee') {
      ev.lapisOff = { cfg: cfgKeys(CFG).enchantLapisRequired };
      srv.send(`gamemode 0 ${BOT}`);
      srv.send(`xp -100000 ${BOT}`);
      await sleep(400);
      await rig(3);
      if (await openTable()) {
        const lvFrom = mark();
        await putItem('etim:sword_copper');
        const lv = rowsFrom(lvFrom).map((l) => RE.level.exec(l)).filter(Boolean).map((m) => ({ slot: +m[1], out: +m[6] }));
        const shown = lv.length ? lv[2].out : 0;
        ev.lapisOff.shown = shown;
        srv.send(`etest level 0 ${BOT}`);
        await sleep(280);
        srv.send(`xp ${shown * 100} ${BOT}`);
        await sleep(350);
        srv.send(`clear ${BOT} minecraft:dye -1 4`);
        await sleep(300);
        try { await bot.moveSlotItem(1, 30); } catch (e) { /* 零青金石 */ }
        await sleep(350);
        const from = mark();
        bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 });
        await sleep(500);
        const seg = rowsFrom(from);
        ev.lapisOff.success = seg.filter((l) => RE.apply.test(l)).length;
        ev.lapisOff.fee = seg.filter((l) => RE.feePay.test(l)).map((l) => l.trim()).slice(0, 2);
        ev.lapisOff.denyLapis = seg.filter((l) => RE.feeDenyLapis.test(l)).length;
        ev.lapisOff.denyPool = seg.filter((l) => RE.feeDenyPool.test(l)).length;
        log('lapisOff', JSON.stringify(ev.lapisOff));
      }
    }

    /* ================= mob ================= */
    if (MODE === 'mob') {
      /* W-DP8 怪装门：difficulty=3(hard) + worldTime 拉满（/time set 可写 worldTime，
         使 DifficultyInstance f1=0.25 → tension≈0.875），spawn egg 通道
         （ItemMonsterPlacer 走 onInitialSpawn，同自然生成）。 */
      srv.send('difficulty 3');
      srv.send('gamerule doMobSpawning false');
      srv.send('gamerule doDaylightCycle false');
      srv.send('time set 1530000');
      srv.send('weather clear 1000000');
      const cx = tx - 6, cz = tz - 6;
      srv.send(`fill ${cx - 16} ${ty - 2} ${cz - 16} ${cx + 16} ${ty + 7} ${cz + 16} minecraft:air 0`);
      srv.send(`fill ${cx - 16} ${ty - 1} ${cz - 16} ${cx + 16} ${ty - 1} ${cz + 16} minecraft:stone 0`);
      srv.send(`tp ${BOT} ${cx + 0.5} ${ty} ${cz + 0.5} 0 65`);
      await sleep(1600);
      srv.send(`gamemode 1 ${BOT}`);
      srv.send(`clear ${BOT}`);
      srv.send(`give ${BOT} minecraft:spawn_egg 1 54`);
      await sleep(700);
      try { bot.setQuickBarSlot(0); } catch (e) { /* noop */ }
      await sleep(300);
      await bot.lookAt(new Vec3(cx + 0.5, ty - 1.2, cz + 2.5), true);
      await sleep(400);

      ev.mob = { samples: [], tensionRows: 0, rounds: 0, zombies: 0, spawned: 0 };
      const seen = new Map();
      const collect = () => {
        for (const e of Object.values(bot.entities || {})) {
          if (!e || e.name !== 'zombie') continue;
          const eq = e.equipment || [];
          const slots = { main: eq[0], off: eq[1], feet: eq[2], legs: eq[3], chest: eq[4], head: eq[5] };
          const hasAny = Object.values(slots).some((s) => s && s.name && s.name !== 'air');
          if (!hasAny) continue;
          const ench = (s) => !!s && /ench/.test(JSON.stringify(s.nbt || null));
          seen.set(e.id, {
            main: slots.main ? slots.main.name : null,
            mainEnch: ench(slots.main),
            armor: ['feet', 'legs', 'chest', 'head'].filter((k) => slots[k] && slots[k].name).length,
            armorEnch: ['feet', 'legs', 'chest', 'head'].filter((k) => slots[k] && slots[k].name && ench(slots[k])).length,
          });
        }
      };
      for (let round = 0; round < 14; round++) {
        for (let i = 0; i < 60; i++) {
          bot._client.write('use_item', { hand: 0 });
          ev.mob.spawned++;
          await sleep(180);
        }
        await sleep(900);
        collect();
        ev.mob.rounds = round + 1;
        ev.mob.zombies = seen.size;
        const plain = srv.all.map(strip);
        ev.mob.tensionRows = plain.filter((l) => RE.nonTable.test(l)).length;
        log('mob-progress', `round=${round + 1} spawned=${ev.mob.spawned} seen=${seen.size} tensionRows=${ev.mob.tensionRows}`);
        const armorPieces = [...seen.values()].reduce((a, s) => a + s.armor, 0);
        if (armorPieces >= 120 || ev.mob.spawned >= 840) break;
        srv.send('kill @e[type=zombie]');
        await sleep(900);
      }
      collect();
      ev.mob.samples = [...seen.values()];
      const withMain = ev.mob.samples.filter((s) => s.main);
      const withArmor = ev.mob.samples.filter((s) => s.armor > 0);
      const armorPieces = withArmor.reduce((a, s) => a + s.armor, 0);
      const armorEnch = withArmor.reduce((a, s) => a + s.armorEnch, 0);
      ev.mob.summary = {
        n: ev.mob.samples.length,
        main: withMain.length,
        mainEnch: withMain.filter((s) => s.mainEnch).length,
        mainRate: withMain.length ? +(withMain.filter((s) => s.mainEnch).length / withMain.length).toFixed(4) : null,
        armorPieces, armorEnch,
        armorRate: armorPieces ? +(armorEnch / armorPieces).toFixed(4) : null,
      };
      ev.mob.tensionValues = [...new Set(srv.all.map(strip).map((l) => RE.nonTable.exec(l)).filter(Boolean).map((m) => m[2]))];
      ev.mob.tensionCount = srv.all.map(strip).map((l) => RE.nonTable.exec(l)).filter(Boolean).length;
      log('mob', JSON.stringify(ev.mob.summary) + ' tension=' + JSON.stringify(ev.mob.tensionValues));
      srv.send('kill @e[type=zombie]');
    }

    /* ================= cfg ================= */
    if (MODE === 'cfg') {
      ev.poolOff = {};
      /* pool off：真台面 → 无 [EnchLog] build 行，vanilla 仍可附 */
      await rig(24);
      if (await openTable()) {
        await putItem('etim:sword_copper');
        const from = mark();
        const seg1 = await enchant(2);
        ev.poolOff.buildRows = seg1.filter((l) => RE.start.test(l) || RE.end.test(l) || RE.pick.test(l)).length;
        ev.poolOff.vanillaApplied = seg1.filter((l) => /\[EnchantLog\]/.test(l)).length;
        ev.poolOff.slotItems = table.slots && table.slots[0] ? { name: table.slots[0].name, nbt: JSON.stringify(table.slots[0].nbt || null).slice(0, 200) } : null;
        log('poolOff', JSON.stringify(ev.poolOff).slice(0, 400));
      }
      /* reg 面：tree_felling cap 5 / free_action cap 1 */
      const p = await probePool('etim:sword_copper');
      ev.capProbe = {
        tf: p.reg['etim:tree_felling'] || null,
        fa: p.reg['etim:free_action'] || null,
      };
      log('capProbe', JSON.stringify(ev.capProbe));
      /* freeAction 2 级请求被拒 */
      srv.send(`clear ${BOT}`);
      srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:leggings_mithril 1 0`);
      await sleep(350);
      const from2 = mark();
      srv.send(`etest enchant mainhand 1 freeAction ${BOT}`);
      await sleep(450);
      srv.send(`etest enchant mainhand 2 freeAction ${BOT}`);
      await sleep(500);
      ev.capProbe.enchant1 = rowsFrom(from2).filter((l) => /enchant_set|too big|at most/i.test(l)).map((l) => l.trim().slice(0, 120)).slice(0, 3);
      log('capEnchant', JSON.stringify(ev.capProbe.enchant1));
    }

    const plain = srv.all.map(strip);
    ev.rowCounts = ev.rowCounts || {
      ench: plain.filter((l) => /\[EnchLog\]/.test(l)).length,
      melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
      farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
      butch: plain.filter((l) => /\[ButchLog\]/.test(l)).length,
      arrow: plain.filter((l) => /\[ArrowLog\]/.test(l)).length,
      mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length,
    };
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try {
      if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); }
    } catch (e) { ev.stopError = String((e && e.message) || e); }
    setCfg(CFG, 'enchantDebugLog', 'false');
    if (MODE === 'fee') setCfg(CFG, 'enchantLapisRequired', 'true');
    if (MODE === 'cfg') {
      setCfg(CFG, 'enchantPoolR196', 'true');
      setCfg(CFG, 'freeActionMaxLevel', keysBefore.freeActionMaxLevel || '4');
      setCfg(CFG, 'treeFellingMaxLevel', keysBefore.treeFellingMaxLevel || '10');
    }
    const keysAfter = cfgKeys(CFG);
    ev.cfgAfter = {
      bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      newKeys: Object.keys(keysAfter).filter((k) => !(k in keysBefore)),
      changed: Object.keys(keysBefore).filter((k) => keysAfter[k] !== keysBefore[k]),
      enchantKeys: Object.fromEntries(Object.entries(keysAfter).filter(([k]) => /enchant|freeAction|treeFelling/i.test(k))),
    };
    ev.obfCfgAfter = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)),
      untouched: sha256(fs.readFileSync(OBFCFG)) === ev.obfCfgBefore.sha };
    fs.writeFileSync(PROPS, propsBefore);
    ev.propsClose = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
    if (MODE === 'cfg') {
      const d = path.join(ROOT, 'run', WORLD);
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
      ev.worldRemoved = !fs.existsSync(d);
    } else {
      ev.worldKept = fs.existsSync(path.join(ROOT, 'run', WORLD));
    }
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
