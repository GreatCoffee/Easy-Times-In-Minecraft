#!/usr/bin/env node
/**
 * enchantpool-w63b.js — enchantpool 批 W-63b 单点回归驱动（batch E 修复批 · HEAD a6ccb03）
 *
 * 判决源：
 *   条 230／231／232／233／234（W-63 原窗全链）＋ 条 235（A-1/A-2 修复落码）
 *   终审回执 §2 B-1/B-2/B-3（D-2 书单条 / D-3 hatchet 门 / D-7 pool dump 红线）
 *
 * 判点（七点，单 boot）：
 *   R1（原 W63-2）书面 pool size = 1.12 候选池（getEnchantmentDatas 双界）
 *   R2（原 W63-6）铁剑/铁靴 pool size + reg table 列分布（剑 8／靴 7）
 *   R3（原 W63-9）XP 点面：20 本穿台，points 单调减、level 由池衍生、无 vanilla 残像
 *   R4（轻回归）书恒 1 条（20 本采样）
 *   R5（轻回归）hatchet silver table=false ＋ battleaxe silver table=true
 *   R6（轻回归）enchantprobe melee 原四行键序 0 漂移
 *   R7（负证）xpSeed 轮转（相邻两本同参数书的 seed/clue/产物 id 非恒同）
 *
 * 判据通道：[EnchantLog] pool/pool-e/reg + 原四行；R3/R4/R7 走 bot 收货侧
 *           NBT/XP/窗口属性（craft_progress_bar：property3=xpseed，6=slot2 clue id，9=slot2 clue lvl）。
 *
 * 用法：node enchantpool-w63b.js [tag] ｜ EP_BOOKS=<n>（默认 20）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'enchantpool-w63b';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const CFG_CLIENT = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');

const WORLD = 'enchantpoolw63b';
const PORT = 25565;
const BOT = 'ETIM_W63B';
const SMOKE = process.env.EP_SMOKE === '1';
const BOOKS = SMOKE ? 6 : +(process.env.EP_BOOKS || 20);

/** 起收钉（条 235 修复批 a6ccb03） */
const PIN = {
  head: 'a6ccb03',
  rel: { bytes: 820810, sha: '6A320BB1F8B383B83DF720F6EBDD66A23266EF44CC62253B40947CC07887C110' },
  dev: { bytes: 804174, sha: '8EB66A41899A3F11C9F7FF0F09CE7051C55CE4BB5CCACB2D6E921F5AD7A98410' },
  src: { bytes: 749783, sha: 'C804F515EEB961C64E6D105280DAF0D6C8FA9F3261D46E6607C1A1A911177809' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30524, sha: '262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉（条 235：62 类键／139 条目换形，mixins 56/client 10，切片 4/4/3，容器 3） */
const MK_PIN = {
  mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 139,
  sword: 4, tool: 4, shears: 3, sliceTotal: 11, container: 3,
};

/** 1.12 判值预言（条 231/233 一手）＋ 条 235 回归预言 */
const WANT = {
  regTotal: 33,              // 30 vanilla + ETIM 3
  treasure: 4,               // frost_walker/mending/binding_curse/vanishing_curse
  treasureIds: [9, 10, 70, 71],
  xpPerCost: 100,            // R196 Enchantment.java:96-98：cost × 100 points
  slot2Cost: 3,              // 1.12 onEnchant 第二参 = id+1（choice=2 ⇒ 3）
  swordTable: 8,             // 铁剑 table=true & !treasure
  bootsTable: 7,             // 铁靴 table=true & !treasure
  // 任务书原文预言（min-only 口径，供对照；B-1 修正见 verdict）
  bookLit: [14, 21, 29],
  swordLit: [6, 6, 8],
  bootsLit: [5, 7, 7],
};

// 条 235 R5：silver 臂（gold 无 ETIM 工具，C-1 口径）
const HATCHET = 'etim:hatchet_silver';
const BATTLEAXE = 'etim:battle_axe_silver';
const TREE = 'etim:tree_felling';

const RE = {
  poolSlot: /\[EnchantLog\] pool slot=(\d+) budget=(-?\d+) size=(\d+) item=(\S+) \[server\]/,
  poolEmpty: /\[EnchantLog\] pool-e slot=(\d+) budget=(-?\d+) list=empty \[server\]/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(-?\d+) weight=(-?\d+) table=(true|false) treasure=(true|false) window=(.*?) \[server\]/,
  probe1: /\[EnchantLog\] enchantprobe slot=(\S+) item=(\S+) canApply=(true|false) maxLevel=(\d+) \[server\]/,
  windows: /\[EnchantLog\] windows (L1=\d+\/\d+.*?) \[server\]/,
  tableRow: /\[EnchantLog\] table power=15 slot0=(\d+) slot1=(\d+) slot2=(\d+) power30=(\d+) slot0=(\d+) slot1=(\d+) slot2=(\d+) bound=/,
  carrier: /\[EnchantLog\] carrier src=(\S+) immediate=(\S+) carrier=(\S+) level=(\d+) pts=(-?\d+) \[server\]/,
  done: /Done \(/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException|MixinApplyError|Critical injection failure/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
};

/* ============================ 小件 ============================ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
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
    out[key].slices = {
      sword: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemSword'] || {}).length,
      tool: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemTool'] || {}).length,
      shears: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemShears'] || {}).length,
    };
    out[key].sliceTotal = out[key].slices.sword + out[key].slices.tool + out[key].slices.shears;
    out[key].containerEnchant = Object.keys(r.mappings['io/github/etim/etim/mixins/MixinContainerEnchantment'] || {}).length;
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.refmapClasses
    && out.refmapResources.entries === MK_PIN.refmapEntries
    && out.refmapTmp.classes === MK_PIN.refmapClasses
    && out.refmapTmp.entries === MK_PIN.refmapEntries
    && out.refmapResources.slices.sword === MK_PIN.sword
    && out.refmapResources.slices.tool === MK_PIN.tool
    && out.refmapResources.slices.shears === MK_PIN.shears
    && out.refmapResources.sliceTotal === MK_PIN.sliceTotal
    && out.refmapResources.containerEnchant === MK_PIN.container
    && out.manifest.mixins === MK_PIN.mixins
    && out.manifest.client === MK_PIN.client;
  return out;
}

/* ============================ boot / bot ============================ */

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

async function say(srv, text) {
  const from = srv.all.length;
  srv.send(`say ${text}`);
  await srv.waitFor(new RegExp('\\[Server\\] ' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 8000, from);
  await sleep(80);
  return from;
}

let probeSeq = 0;
/** 下发一条 enchantprobe 并收全部行（用 say 哨兵切段，服务端同线程保序） */
async function probe(srv, slotArg, src) {
  const from = srv.all.length;
  srv.send(`etest enchantprobe ${slotArg} ${src} ${BOT}`);
  const sentinel = 'EP_SENT_' + (++probeSeq);
  srv.send(`say ${sentinel}`);
  const ok = await srv.waitFor(new RegExp('\\[Server\\] ' + sentinel), 12000, from);
  if (!ok) log('probe', `sentinel timeout for ${slotArg}/${src}`);
  const seg = srv.all.slice(from);
  const pool = [];
  const empty = [];
  const reg = [];
  for (const l of seg) {
    let m;
    if ((m = RE.poolSlot.exec(l))) pool.push({ slot: +m[1], budget: +m[2], size: +m[3], item: m[4], raw: stripPrefix(l), ts: logTime(l) });
    else if ((m = RE.poolEmpty.exec(l))) empty.push({ slot: +m[1], budget: +m[2], raw: stripPrefix(l), ts: logTime(l) });
    else if ((m = RE.reg.exec(l))) reg.push({ reg: m[1], id: +m[2], weight: +m[3], table: m[4] === 'true', treasure: m[5] === 'true', window: m[6], raw: stripPrefix(l), ts: logTime(l) });
  }
  log('probe', `${slotArg}/${src}: pool=${JSON.stringify(pool.map((p) => [p.slot, p.budget, p.size]))} empty=${empty.length} reg=${reg.length}`);
  return { slotArg, src, from, to: srv.all.length, pool, empty, reg, seg };
}

function regOf(p, name) {
  return p.reg.find((r) => r.reg === name) || null;
}

/** 给 probe 结果补上「按 reg 窗口列复算」的候选池列（dual=1.12 双界；minOnly=R196 下界） */
function annotateProbe(p, isBook) {
  p.isBook = !!isBook;
  p.computed = p.pool.map((row) => {
    const c = poolFromReg(p.reg, row.budget, isBook);
    return {
      slot: row.slot, budget: row.budget, observed: row.size,
      dual: c.dual, minOnly: c.minOnly,
      matchDual: row.size === c.dual, matchMinOnly: row.size === c.minOnly,
      names: c.names,
    };
  });
  p.tableTrue = p.reg.filter((r) => r.table).map((r) => r.reg).sort();
  p.nonTreasure = p.reg.filter((r) => !r.treasure).map((r) => r.reg).sort();
  p.treasureRows = p.reg.filter((r) => r.treasure).map((r) => ({ reg: r.reg, id: r.id, weight: r.weight, table: r.table }));
  return p;
}
function tableSet(p) {
  return p.reg.filter((r) => r.table).map((r) => r.reg).sort();
}
function nonTreasure(p) {
  return p.reg.filter((r) => !r.treasure).map((r) => r.reg).sort();
}

/**
 * 1.12 `EnchantmentHelper.getEnchantmentDatas` 候选池逐件复算（:449-471 双界）：
 *   (!treasure || allowTreasure) && (canApplyAtEnchantingTable || (isBook && isAllowedOnBooks))
 *   && ∃lvl: min(lvl) <= budget <= max(lvl)
 * reg 行 window 列即 getMin/MaxEnchantability 全级窗口。
 * minOnly 列＝R196 `mapEnchantmentData`（:329-351）只有下界的口径，仅供对照。
 */
function parseWindow(w) {
  return (w || '').split(' ').map((t) => {
    const m = /L(\d+)=(\d+)\/(\d+)/.exec(t);
    return m ? { lvl: +m[1], min: +m[2], max: +m[3] } : null;
  }).filter(Boolean);
}

function poolFromReg(regRows, budget, isBook) {
  const dual = [];
  const minOnly = [];
  for (const r of regRows) {
    if (r.treasure) continue;
    if (!isBook && !r.table) continue;
    const win = parseWindow(r.window);
    const hit = win.find((lv) => budget >= lv.min && budget <= lv.max);
    if (hit) dual.push({ reg: r.reg, lvl: hit.lvl });
    if (win.some((lv) => budget >= lv.min)) minOnly.push(r.reg);
  }
  return { dual: dual.length, minOnly: minOnly.length, names: dual.map((d) => d.reg) };
}

/* ============================ 窗口属性（R7 xpSeed） ============================ */

const progress = [];
function hookProgress(bot) {
  bot._client.on('craft_progress_bar', (p) => {
    progress.push({ n: progress.length + 1, windowId: p.windowId, property: p.property, value: p.value, ts: Date.now() });
  });
}

/** 取该窗口最后一次广播值：property 3 = xpSeed & -16；6/9 = slot2 的 clue id/level */
function clueOf(windowId) {
  const out = { windowId, seed: null, clueId2: null, clueLvl2: null, levels: [null, null, null] };
  for (const e of progress) {
    if (e.windowId !== windowId) continue;
    if (e.property >= 0 && e.property <= 2) out.levels[e.property] = e.value;
    else if (e.property === 3) out.seed = e.value;
    else if (e.property === 6) out.clueId2 = e.value;
    else if (e.property === 9) out.clueLvl2 = e.value;
  }
  return out;
}

/* ============================ 场地 ============================ */

async function buildArena(srv, geo) {
  const R = 4;
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:stone 0`);
      for (const dy of [0, 1, 2, 3]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
      }
    }
  }
  await sleep(1800);
  srv.send(`setblock ${geo.bx} ${geo.by} ${geo.bz} minecraft:enchanting_table 0`);
  let shelves = 0;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== 2) continue;
      for (const dy of [0, 1]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:bookshelf 0`);
        shelves++;
      }
    }
  }
  const from = srv.all.length;
  srv.send(`say EP_ARENA_READY`);
  await srv.waitFor(/\[Server\] EP_ARENA_READY/, 20000, from);
  await sleep(900);
  const t = srv.all.slice(from).filter((l) => /Unable to place|Cannot place/.test(l));
  return { shelves, badBlocks: t.length };
}

/* ============================ 窗口工具 ============================ */

function winItem(win, slot) {
  return win && win.slots ? win.slots[slot] : null;
}

function invRange(win) {
  const n = win && win.slots ? win.slots.length : 0;
  // 1.12 enchanting table = 2 container slots (0 书 / 1 青金石) + 36 player slots
  const a = Math.max(2, Number.isInteger(win && win.inventoryStart) ? win.inventoryStart : 2);
  const b = Number.isInteger(win && win.inventoryEnd) ? win.inventoryEnd : n;
  return [a, Math.min(Math.max(b, a), n)];
}

function findInvSlot(win, name, meta) {
  const [a, b] = invRange(win);
  for (let s = a; s < b; s++) {
    const it = winItem(win, s);
    if (it && it.name === name && (meta == null || it.metadata === meta)) return s;
  }
  return -1;
}

function emptyInvSlot(win) {
  const [a, b] = invRange(win);
  for (let s = a; s < b; s++) if (!winItem(win, s)) return s;
  return -1;
}

let Vec3 = null;
try { Vec3 = require('vec3'); } catch (e) { Vec3 = null; }

async function openEnchantTable(bot, pos) {
  const p = Vec3 ? new Vec3(pos.x, pos.y, pos.z) : pos;
  let block = null;
  for (let i = 0; i < 25; i++) {
    block = bot.blockAt(p);
    if (block && block.name === 'enchanting_table') break;
    await sleep(300);
  }
  if (!block || block.name !== 'enchanting_table') throw new Error('no enchanting_table at ' + JSON.stringify(pos) + ' (got ' + (block && block.name) + ')');
  const winP = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('windowOpen timeout')), 10000);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  await bot.activateBlock(block);
  const win = await winP;
  await sleep(450);
  return win;
}

async function closeWin(bot) {
  try { if (bot.currentWindow) await bot.closeWindow(bot.currentWindow); } catch (e) { /* ignore */ }
  await sleep(300);
}

/* ============================ NBT ============================ */

function nbtVal(x) {
  return x && typeof x === 'object' && 'value' in x ? x.value : x;
}
function enchList(nbt) {
  const v = nbt && nbt.value ? nbt.value : null;
  const se = v && v.StoredEnchantments;
  const l = se && se.value && se.value.value;
  if (!Array.isArray(l)) return [];
  return l.map((e) => ({ id: nbtVal(e.id), lvl: nbtVal(e.lvl) }));
}

/* ============================ 书循环（W63-1 / W63-9） ============================ */

async function waitExp(bot, before, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (bot.experience && bot.experience.points !== before) return bot.experience.points;
    await sleep(30);
  }
  return bot.experience ? bot.experience.points : null;
}

async function giveAndSync(srv, cmd, tag) {
  const from = srv.all.length;
  srv.send(cmd);
  const sentinel = 'EP_SYNC_' + tag;
  srv.send(`say ${sentinel}`);
  await srv.waitFor(new RegExp('\\[Server\\] ' + sentinel), 15000, from);
  await sleep(250);
}

/** 直接发 enchant_item 并轮询 slot0 变成 enchanted_book（避开事件序） */
async function doEnchant(bot, win, choice, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < 2500) {
    const lv = win.enchantments && win.enchantments[choice] ? win.enchantments[choice].level : -1;
    if (lv >= 0) break;
    await sleep(50);
  }
  bot._client.write('enchant_item', { windowId: win.id, enchantment: choice });
  const t1 = Date.now();
  while (Date.now() - t1 < timeoutMs) {
    const it = winItem(win, 0);
    if (it && it.name === 'enchanted_book') return it;
    await sleep(40);
  }
  return null;
}

/** 左键取栈 → 右键落 1（槽限 1）→ 左键回栈：客户端模型与服务器逐 click 对齐 */
async function placeOne(bot, win, src, dst) {
  await bot.clickWindow(src, 0, 0);
  await sleep(60);
  await bot.clickWindow(dst, 1, 0);
  await sleep(60);
  if (win.selectedItem) { await bot.clickWindow(src, 0, 0); await sleep(60); }
}

/** 产出物出槽：拾起 → 丢到窗口外（-999）；模型残留则回落到包内空格 */
async function dropTableSlot(bot, win, slot) {
  await bot.clickWindow(slot, 0, 0);
  await sleep(50);
  if (win.selectedItem) { await bot.clickWindow(-999, 0, 0); await sleep(60); }
  if (win.selectedItem) {
    const es = emptyInvSlot(win);
    if (es >= 0) { await bot.clickWindow(es, 0, 0); await sleep(60); }
  }
}

async function refillLapis(srv, bot, win) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const lap = winItem(win, 1);
    if (lap && lap.count >= 3) return lap.count;
    let src = findInvSlot(win, 'dye', 4);
    if (src >= 0) {
      try { await bot.moveSlotItem(src, 1); } catch (e) { log('lapis', 'move failed: ' + ((e && e.message) || e)); }
      await sleep(180);
      const l2 = winItem(win, 1);
      if (l2 && l2.count >= 3) return l2.count;
    }
    // force a fresh stack even when a (possibly phantom) pack slot was seen
    await giveAndSync(srv, 'give ' + BOT + ' minecraft:dye 64 4', 'LAPIS' + (++syncSeq));
    src = findInvSlot(win, 'dye', 4);
    if (src >= 0) {
      try { await bot.moveSlotItem(src, 1); } catch (e) { log('lapis', 'move2 failed: ' + ((e && e.message) || e)); }
      await sleep(180);
      const l3 = winItem(win, 1);
      if (l3 && l3.count >= 3) return l3.count;
    }
    await sleep(250);
  }
  return 0;
}

let syncSeq = 0;

async function bookLoop(srv, bot, geo, n, rec) {
  let table = await openEnchantTable(bot, geo.tablePos);
  log('book', `table open type=${table.type} levels=${JSON.stringify((table.enchantments || []).map((e) => e.level))}`);

  // 起手：把书/青金石给足（先 clear 保证包位干净）
  await giveAndSync(srv, `clear ${BOT}`, 'CLEAR' + (++syncSeq));
  const packs = Math.ceil(n / 64) + 2;
  for (let i = 0; i < packs; i++) srv.send(`give ${BOT} minecraft:book 64`);
  await giveAndSync(srv, `give ${BOT} minecraft:dye 64 4`, 'PACK' + (++syncSeq));
  await sleep(300);

  let sinceReopen = 0;
  const reopen = async (why) => {
    await closeWin(bot);
    rec.reopens.push(why);
    return openEnchantTable(bot, geo.tablePos);
  };
  let attempts = 0;
  while (rec.perBook.length < n) {
    if (++attempts > n * 3 + 40) throw new Error('book loop attempt cap exceeded');
    let win = bot.currentWindow;
    try {
      if (!win) {
        table = await reopen('closed');
        win = table;
        sinceReopen = 0;
        continue;
      }
      if (sinceReopen >= 20) {
        // batch resync: window close returns the table slots to the pack, then
        // the produced books are cleared so the pack never fills up.
        table = await reopen('batch');
        win = table;
        await giveAndSync(srv, `clear ${BOT} minecraft:enchanted_book`, 'CLEAREB' + (++syncSeq));
        sinceReopen = 0;
        continue;
      }
      if (!bot.experience || bot.experience.level == null || bot.experience.level < 32) {
        const f = srv.all.length;
        srv.send(`etest level 200 ${BOT}`);
        await srv.waitFor(/commands\.etest\.level_set/, 6000, f);
        await sleep(350);
        rec.levelResets++;
      }
      if ((winItem(win, 1) || { count: 0 }).count < 3) {
        const c = await refillLapis(srv, bot, win);
        if (c < 3) throw new Error('lapis refill failed at book ' + (rec.perBook.length + 1));
      }
      let bs = findInvSlot(win, 'book');
      if (bs < 0) {
        for (let k = 0; k < packs; k++) srv.send(`give ${BOT} minecraft:book 64`);
        await giveAndSync(srv, `say EP_BOOKREFILL_${++syncSeq}`, 'BR' + syncSeq);
        rec.bookRefills++;
        bs = findInvSlot(win, 'book');
        if (bs < 0) throw new Error('no book left at book ' + (rec.perBook.length + 1));
      }
      const i = rec.perBook.length + 1;
      // place exactly one book into slot0 (left pick stack -> right drop one -> left return)
      await placeOne(bot, win, bs, 0);
      const placed = winItem(win, 0);
      if (!placed || placed.name !== 'book') {
        rec.placeFails++;
        log('book', `#${i} slot0 not a book after place: ${placed ? placed.name + 'x' + placed.count : 'empty'}`);
        table = await reopen('place-fail');
        sinceReopen = 0;
        continue;
      }
      const beforeXp = bot.experience.points;
      const beforeLevel = bot.experience.level;
      const lapisBefore = (winItem(win, 1) || { count: 0 }).count;
      await sleep(220);
      const clue = clueOf(win.id);
      const item = await doEnchant(bot, win, 2, 6000);
      if (!item) {
        rec.timeouts.push({ i, lapisBefore, level: bot.experience.level, slot0: winItem(win, 0) ? winItem(win, 0).name : 'empty', slot1: lapisBefore });
        log('book', `#${i} enchant timeout (slot0=${winItem(win, 0) ? winItem(win, 0).name : 'empty'} lapis=${lapisBefore} level=${bot.experience.level})`);
        table = await reopen('enchant-timeout');
        sinceReopen = 0;
        continue;
      }
      const afterXp = await waitExp(bot, beforeXp, 1500);
      const e = enchList(item && item.nbt);
      rec.perBook.push({
        i, name: item ? item.name : null, count: item ? item.count : null,
        ench: e.length, ids: e.map((x) => `${x.id}:${x.lvl}`), lapisBefore,
        xpBefore: beforeXp, xpAfter: afterXp, xpDelta: afterXp == null || beforeXp == null ? null : afterXp - beforeXp,
        levelBefore: beforeLevel, levelAfter: bot.experience.level,
        clue,
      });
      if (i <= 5 || i % 10 === 0 || e.length !== 1) {
        log('book', `[BookProbe] #${i} item=${item && item.name} count=${item && item.count} stored=${e.length} ids=${e.map((x) => x.id + ':' + x.lvl).join(',') || '-'} xpDelta=${afterXp == null ? '?' : afterXp - beforeXp} lv=${beforeLevel}->${bot.experience.level} seed=${clue.seed} clue=${clue.clueId2}/${clue.clueLvl2}`);
      }
      // take the product out (shift-click to pack); batch reopen clears them
      await bot.putAway(0);
      sinceReopen++;
    } catch (err) {
      rec.errors.push({ i: rec.perBook.length + 1, msg: (err && err.message) || String(err) });
      log('book', `#${rec.perBook.length + 1} error: ${(err && err.message) || err} -- reopening`);
      try {
        table = await reopen('error');
        sinceReopen = 0;
      } catch (e2) {
        throw e2;
      }
    }
  }
  await closeWin(bot);
  return rec;
}

/* ============================ 主流程 ============================ */

/* ============================ 静态位（源码/字节码） ============================ */

function readText(rel) {
  try { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); } catch (e) { return ''; }
}

function staticChecks() {
  const out = {};
  const cmd = readText('src/main/java/io/github/etim/etim/commands/CommandDevTest.java');
  const poolBody = (/private static void executeEnchantPoolProbe[\s\S]*?\n    }\n/.exec(cmd) || [''])[0];
  out.commandDevTest = {
    file: 'src/main/java/io/github/etim/etim/commands/CommandDevTest.java',
    poolProbeBodyLines: poolBody.split('\n').length,
    usesBuildEnchantmentList: /buildEnchantmentList\s*\(/.test(poolBody),
    usesGetEnchantmentDatas: /getEnchantmentDatas\s*\(/.test(poolBody),
    hasPoolRow: /\[EnchantLog\] pool slot=\{\} budget=\{\} size=\{\} item=\{\}/.test(poolBody),
    hasPoolERow: /\[EnchantLog\] pool-e slot=\{\}/.test(poolBody),
    hasRegRow: /\[EnchantLog\] pool reg=\{\} id=\{\} weight=\{\} table=\{\} treasure=\{\} window=\{\}/.test(poolBody),
  };
  const mix = readText('src/main/java/io/github/etim/etim/mixins/MixinContainerEnchantment.java');
  out.mixinContainerEnchantment = {
    file: 'src/main/java/io/github/etim/etim/mixins/MixinContainerEnchantment.java',
    redirectTargets: (mix.match(/target\s*=\s*"Lnet\/minecraft[^"]+"/g) || []),
    redirectMethods: (mix.match(/method\s*=\s*"[^"]+"/g) || []),
  };
  const tf = readText('src/main/java/io/github/etim/etim/mining/EnchantmentTreeFelling.java');
  out.treeFelling = {
    file: 'src/main/java/io/github/etim/etim/mining/EnchantmentTreeFelling.java',
    isEmptyGuard: /!stack\.isEmpty\(\)/.test(tf),
    itemAxeInstanceof: /instanceof ItemAxe/.test(tf),
    hatchetExclusion: /instanceof ETIMItemHatchet/.test(tf),
    noGetClassEquals: !/getClass\(\)\s*==/.test(tf),
  };
  // 字节码位：W63b 亲锤——redirect 是否真的挂在 onEnchant 叫点位、其体是否走 applyTotal
  try {
    const javap = 'D:\\OpenCodeWorkspace\\Easy Times In Minecraft\\jdk\\zulu25.38.107-ca-jdk25.0.5-win_x64\\bin\\javap.exe';
    const cls = path.join(ROOT, 'run', '.mixin.out', 'class', 'net', 'minecraft', 'inventory', 'ContainerEnchantment.class');
    if (fs.existsSync(cls) && fs.existsSync(javap)) {
      const txt = execFileSync(javap, ['-p', '-c', cls], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      const lines = txt.split(/\r?\n/);
      const startOf = (sig) => {
        const i = lines.findIndex((l) => l.includes(sig));
        let j = lines.length;
        for (let k = i + 1; k < lines.length; k++) {
          if (/^  (public|private|protected|static|final)/.test(lines[k])) { j = k; break; }
        }
        return i >= 0 ? lines.slice(i, j).join('\n') : '';
      };
      const body = startOf('public boolean enchantItem(');
      const redirectBody = startOf('private void redirect$') || startOf('r196EnchantPoints(net.minecraft.entity.player.EntityPlayer');
      const st = fs.statSync(cls);
      out.bytecode = {
        classFile: 'run/.mixin.out/class/net/minecraft/inventory/ContainerEnchantment.class',
        classBytes: st.size,
        classMtime: st.mtime.toISOString(),
        classSha256: sha256(fs.readFileSync(cls)),
        enchantItemHasOnEnchantCall: /Method net\/minecraft\/entity\/player\/EntityPlayer\.onEnchant:/.test(body),
        enchantItemHasAddExperienceLevel: /EntityPlayer\.addExperienceLevel/.test(body),
        enchantItemHasEnchantPointsRedirectCall: /redirect\$[0-9a-z]+\$etim\$r196EnchantPoints/.test(body),
        enchantPointsRedirectDeclared: /etim\$r196EnchantPoints\(/.test(txt),
        redirectBodyCallsApplyTotal: /ETIMXp\.applyTotal/.test(redirectBody),
        redirectBodyCallsOnEnchant: /EntityPlayer\.onEnchant/.test(redirectBody),
        bookSingleCallSites: (txt.match(/redirect\$[0-9a-z]+\$etim\$r196BookSingle/g) || []).length,
      };
    } else {
      out.bytecode = { error: 'javap or transformed class missing' };
    }
  } catch (e) {
    out.bytecode = { error: String((e && e.message) || e) };
  }
  return out;
}

function levelForPoints(total) {
  let L = 0;
  while (L < 200 && 5 * (L + 1) * (L + 1) + 15 * (L + 1) <= total) L++;
  return L;
}

function aggregateBook(rec) {
  const books = rec.perBook || [];
  const dist = {};
  for (const b of books) dist[b.ench] = (dist[b.ench] || 0) + 1;
  const names = {};
  for (const b of books) names[b.name] = (names[b.name] || 0) + 1;
  const counts = {};
  for (const b of books) counts[b.count] = (counts[b.count] || 0) + 1;
  const deltas = {};
  for (const b of books) deltas[b.xpDelta] = (deltas[b.xpDelta] || 0) + 1;
  const badIds = books.filter((b) => b.ids.some((s) => WANT.treasureIds.includes(+s.split(':')[0])));
  // R3：池单调减 + level 由池衍生（无 vanilla 直减残像）
  const nonMono = [];
  for (let i = 1; i < books.length; i++) {
    if (!(books[i].xpAfter < books[i - 1].xpAfter)) nonMono.push(books[i].i);
  }
  const levelMismatch = books
    .map((b) => ({ i: b.i, observed: b.levelAfter, derived: b.xpAfter == null ? null : levelForPoints(b.xpAfter), delta: b.xpDelta }))
    .filter((x) => x.observed !== x.derived);
  // R7：相邻两本（同 slot 同条件）seed/clue/产物 id 是否恒同
  const dupSeed = [];
  const dupClue = [];
  const dupIds = [];
  for (let i = 1; i < books.length; i++) {
    const a = books[i - 1], b = books[i];
    if (a.clue && b.clue && a.clue.seed != null && a.clue.seed === b.clue.seed) dupSeed.push(b.i);
    if (a.clue && b.clue && a.clue.clueId2 === b.clue.clueId2 && a.clue.clueLvl2 === b.clue.clueLvl2) dupClue.push(b.i);
    if (a.ids.join(',') === b.ids.join(',')) dupIds.push(b.i);
  }
  return {
    produced: books.length, dist, names, counts, deltas,
    over1: books.filter((b) => b.ench > 1).length,
    zero: books.filter((b) => b.ench === 0).length,
    treasureHits: badIds.length,
    xp: {
      deltas,
      xpFirst: books.length ? books[0].xpBefore : null,
      xpLast: books.length ? books[books.length - 1].xpAfter : null,
      monotonic: nonMono.length === 0,
      nonMonoAt: nonMono,
      levelDerivedMismatch: levelMismatch.length,
      levelDerivedMismatchDetail: levelMismatch,
      levelFirst: books.length ? books[0].levelBefore : null,
      levelLast: books.length ? books[books.length - 1].levelAfter : null,
      chargePerBook: books.length ? [...new Set(books.map((b) => b.xpDelta))] : [],
    },
    seed: {
      seedDistinct: new Set(books.map((b) => (b.clue || {}).seed)).size,
      clueDistinct: new Set(books.map((b) => `${(b.clue || {}).clueId2}/${(b.clue || {}).clueLvl2}`)).size,
      dupSeedAt: dupSeed, dupClueAt: dupClue, dupIdsAt: dupIds,
    },
    timeouts: (rec.timeouts || []).length,
    timeoutDetail: rec.timeouts,
    placeFails: rec.placeFails || 0,
    errors: (rec.errors || []).length,
    errorDetail: rec.errors,
    reopens: (rec.reopens || []).length,
    levelResets: rec.levelResets,
    bookRefills: rec.bookRefills,
  };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, window: 'W63b R1..R7', executedBy: 'session7',
    startedAt: new Date().toISOString(), workspace: ROOT, smoke: SMOKE, books: BOOKS,
    pins: {}, points: [], bootCount: 1, clients: 0,
  };

  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
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
  log('pin', `HEAD=${head} crashBefore=${ev.pins.crashBefore} portBefore=${ev.pins.portBefore} git=${ev.pins.gitStatus || '(clean)'}`);
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.cfgClient.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch — refuse to run');
  if (!head.startsWith(PIN.head)) throw new Error('HEAD pin mismatch — refuse to run');

  ev.cfgSnap = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.cfgClientSnap = snapshot(CFG_CLIENT, TAG + '-client-etim.cfg.before');
  ev.propsSnap = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }

  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  fs.writeFileSync(PROPS, propEdit, 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  try {
    const done = await waitReady(srv, TAG);
    if (!done) throw new Error('server never reached Done( within 480s');
    ev.boot = {
      ready: stripPrefix(done.trim()), readyTs: logTime(done), readyIdx: srv.all.indexOf(done) + 1,
      modGather: srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null,
      buildLine: (srv.all.find((l) => /BUILD SUCCESSFUL|BUILD FAILED/.test(l)) || '').trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8),
      enchantIds: srv.all.filter((l) => /\[EtimInit\] enchant /.test(l)).map(stripPrefix),
      jarTask: srv.all.filter((l) => /^> Task :[A-Za-z]*(jar|Jar|classes|compileJava)\b/.test(l)),
    };
    log('boot', `Done — ${ev.boot.ready} @ ${ev.boot.readyTs} (idx ${ev.boot.readyIdx})`);
    log('boot', 'enchant ids: ' + JSON.stringify(ev.boot.enchantIds));
    // W63-8 boot 段基线：Done( 之前的 [EnchantLog] 行数
    const doneIdx = srv.all.indexOf(done);
    ev.bootEnchantLogRows = srv.all.slice(0, doneIdx + 1).filter((l) => /\[EnchantLog\]/.test(l)).length;

    bot = await connectBot();
    try { bot.removeAllListeners('message'); } catch (e) { /* silence chat spam */ }
    hookProgress(bot);
    srv.send(`op ${BOT}`);
    await sleep(700);
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'naturalRegeneration false', 'randomTickSpeed 0', 'mobGriefing false', 'keepInventory true']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 0');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    await sleep(1800);

    const p0 = bot.entity.position;
    const geo = { bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z) };
    geo.tablePos = { x: geo.bx, y: geo.by, z: geo.bz };
    ev.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    ev.arena = await buildArena(srv, geo);
    srv.send(`tp ${BOT} ${geo.bx + 1.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1600);
    let p1 = bot.entity.position;
    let grounded = Math.abs(p1.y - geo.by) < 0.9;
    if (!grounded) {
      srv.send(`tp ${BOT} ${geo.bx + 1.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1600);
      p1 = bot.entity.position;
      grounded = Math.abs(p1.y - geo.by) < 0.9;
    }
    ev.posAfterTp = { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2), z: +p1.z.toFixed(2) };
    ev.grounded = grounded;
    log('setup', `arena=${JSON.stringify(ev.arena)} pos=(${ev.posAfterTp.x},${ev.posAfterTp.y},${ev.posAfterTp.z}) grounded=${grounded}`);
    if (!grounded) throw new Error('bot not grounded on the harness platform');

    /* ---------- R1 书面候选池 ---------- */
    srv.send(`etest level 100 ${BOT}`);
    await sleep(400);
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:book 1 0`);
    await sleep(450);
    const pBook = annotateProbe(await probe(srv, 'mainhand', 'pool'), true);
    ev.probeBook = pBook;

    /* ---------- R2a 铁剑候选池 ---------- */
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:iron_sword 1 0`);
    await sleep(450);
    const pSword = annotateProbe(await probe(srv, 'mainhand', 'pool'), false);
    ev.probeSword = pSword;

    /* ---------- R6 melee 四行回归（手持铁剑） ---------- */
    const from6 = srv.all.length;
    srv.send(`etest enchantprobe mainhand melee ${BOT}`);
    srv.send(`say EP_SENT_PROBE6`);
    await srv.waitFor(/\[Server\] EP_SENT_PROBE6/, 12000, from6);
    ev.probeRegression = { from: from6, seg: srv.all.slice(from6) };

    /* ---------- R2b 铁靴候选池 ---------- */
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:iron_boots 1 0`);
    await sleep(450);
    const pBoots = annotateProbe(await probe(srv, 'mainhand', 'pool'), false);
    ev.probeBoots = pBoots;

    /* ---------- R5 hatchet silver / battleaxe silver ---------- */
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${HATCHET} 1 0`);
    await sleep(450);
    const pHatchet = annotateProbe(await probe(srv, 'mainhand', 'pool'), false);
    ev.probeHatchet = { reg: HATCHET, probe: pHatchet };
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${BATTLEAXE} 1 0`);
    await sleep(450);
    const pBattle = annotateProbe(await probe(srv, 'mainhand', 'pool'), false);
    ev.probeBattleAxe = pBattle;

    /* ---------- R3 / R4 / R7 书循环（20 本，起手 /etest level 200） ---------- */
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:air 1 0`);
    const fromLv = srv.all.length;
    srv.send(`etest level 200 ${BOT}`);
    await srv.waitFor(/commands\.etest\.level_set/, 6000, fromLv);
    for (let w = 0; w < 40 && (!bot.experience || bot.experience.points !== 203000); w++) await sleep(100);
    ev.loopStartXp = { points: bot.experience ? bot.experience.points : null, level: bot.experience ? bot.experience.level : null };
    log('book', 'loop start xp=' + JSON.stringify(ev.loopStartXp));
    ev.bookLoop = { n: BOOKS, perBook: [], timeouts: [], placeFails: 0, errors: [], reopens: [], levelResets: 0, bookRefills: 0 };
    try {
      await bookLoop(srv, bot, geo, BOOKS, ev.bookLoop);
    } catch (e) {
      ev.bookLoopError = (e && e.message) || String(e);
      log('book', 'loop aborted: ' + ev.bookLoopError);
    }
    ev.bookAgg = aggregateBook(ev.bookLoop);

    /* ---------- 附：战利品面静默（W63-8 负证复用） ---------- */
    const induced = [];
    for (const p of [pBook, pSword, pBoots, pHatchet, pBattle]) induced.push([p.from, p.to]);
    induced.push([ev.probeRegression.from, ev.probeRegression.from + ev.probeRegression.seg.length]);
    const inRange = (i) => induced.some(([a, b]) => i >= a && i < b);
    const stray = [];
    srv.all.forEach((l, i) => {
      if (/\[EnchantLog\]/.test(l) && !inRange(i)) stray.push({ idx: i + 1, ts: logTime(l), raw: stripPrefix(l) });
    });
    ev.strayEnchantRows = stray;
    ev.enchantRowTotal = srv.all.filter((l) => /\[EnchantLog\]/.test(l)).length;
    ev.anvilRows = srv.all.filter((l) => /\[EnchantLog\] anvil-combine/.test(l)).length;

    ev.rowCounts = {
      enchant: ev.enchantRowTotal,
      stray: stray.length,
      anvil: ev.anvilRows,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
    };
    ev.staticChecks = staticChecks();
    log('counts', JSON.stringify(ev.rowCounts));
    log('static', JSON.stringify(ev.staticChecks));
  } catch (e) {
    ev.fatal = (e && e.stack) || String(e);
    log('main', 'FATAL', ev.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(900);
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    try {
      fs.copyFileSync(RUNLOG, path.join(OUT, TAG + '-session-1.log'));
      fs.copyFileSync(srv.logPath, path.join(OUT, TAG + '-session-1.out'));
      ev.logSnapshot = path.join(OUT, TAG + '-session-1.log');
      ev.outSnapshot = path.join(OUT, TAG + '-session-1.out');
    } catch (e) {
      ev.logSnapshotError = String((e && e.message) || e);
    }

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

    ev.sideClose = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideClose[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
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
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'), srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts() };
    ev.jarUpToDate = ((ev.boot && ev.boot.jarTask) || []).filter((l) => /UP-TO-DATE/.test(l)).length === 3;
  }

  ev.finishedAt = new Date().toISOString();
  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 1) + '\n', 'utf8');
  log('evidence', file + ' (' + fs.statSync(file).size + ' B)');
  log('DONE');
  process.exit(0);
}

main().catch((e) => { log('boot', 'FATAL:', (e && e.stack) || e); process.exit(1); });
