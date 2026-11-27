#!/usr/bin/env node
/**
 * anvilench-w33.js — 工装便利批件 2（anvil 日志通道）W-33a…g 判窗驱动
 *
 * 判决源：判据只吃服务端 `[EnchantLog] anvil-combine face=ench|face=tx …` 行
 *         （face=ench 先 / face=tx 后，注-2 同 tick 行序）；旁证 = 窗口槽 NBT 读数
 *         （mineflayer window slots 的 metadata = item damage）＋ `/clear` 计数。
 *
 * 三相（每相一次 boot，cfg 只在相间改值）：
 *   neg   anvilDebugLog=false（首 boot 顺带 regen 新键）→ W-33e（负证）+ enchantprobe 通道独立
 *   main  anvilDebugLog=true（piercingMaxLevel=5）      → W-33a / W-33c / W-33d / W-33f / W-33g
 *   max1  piercingMaxLevel=1（anvilDebugLog 仍 true）   → W-33b（截断直证）
 *
 * 收口：优雅 stop（stdin）→ cfg 复原到「新键在场」的新基线 → server.properties
 *       byte-还原 → 世界目录删 → 25565/crash 复核。cfg 起窗钉 = 旧基线（首次写回前的锚）。
 *
 * 用法：node anvilench-w33.js [tag]
 * 调试口：W33_ONLY=W-33a[,W-33g] 只跑命中判点（neg 相仍无条件 boot，承担 cfg regen）
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
const TAG = process.argv[2] || 'anvilench-w33';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const WORLD_NAME = 'anvilench33';
const PORT = 25565;

const PIN = {
  head: '66f210d',
  dev: { bytes: 753537, sha: '6AD5CC8B485F3A52FCC3DF7EC56DA91ED80C51DCFF229EC22167F45995FFA314' },
  rel: { bytes: 769257, sha: 'DD475DFDC0BA21FF4C981606A86596635CE8C7B273C3D17C4AF141A7DF6C254E' },
  cfgOld: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
};

const ONLY = (process.env.W33_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();

const RE = {
  probeDur: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(-|\d+)\/(\d+)/,
  placed: /Block placed|Unable to place|The block couldn't be placed|There is no such block/i,
  combine: /\[EnchantLog\] anvil-combine /,
  enchantAny: /\[EnchantLog\]/,
  probeRow: /\[EnchantLog\] enchantprobe /,
  craftTake: /\[CraftingLog\].*repair take:/,
};

// ------------------------------------------------------------------ small utils
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
  } catch (e) { return -1; }
}
function crashCount() {
  const dir = path.join(ROOT, 'run', 'crash-reports');
  try {
    return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).length;
  } catch (e) { return -1; }
}
/** `[EnchantLog] anvil-combine face=… key=value …` → kv object（无 '=' 的 token 忽略）。 */
function parseCombine(line) {
  const i = line.indexOf('anvil-combine ');
  if (i < 0) return null;
  const kv = {};
  for (const tok of line.slice(i + 'anvil-combine '.length).split(/\s+/)) {
    const j = tok.indexOf('=');
    if (j > 0) kv[tok.slice(0, j)] = tok.slice(j + 1);
  }
  return kv;
}
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]:\s*/, '');

// ------------------------------------------------------------------ window helpers
let srvRef = null;
const say = async (t) => { srvRef.send('say ' + t); await sleep(80); };

async function wclick(bot, slot, button = 0, mode = 0) {
  try { await bot.clickWindow(slot, button, mode); return true; }
  catch (e) { log('window', `click fail slot=${slot} btn=${button} mode=${mode}:`, e && e.message); return false; }
}
/** 在窗口 3..38（背包 27 + 快捷栏 9）里按 registry 名找槽位。 */
function findSlot(win, name) {
  const slots = (win && win.slots) || [];
  for (let s = 3; s <= 38; s++) {
    const it = slots[s];
    if (it && it.name === name) return s;
  }
  return -1;
}
function slotInfo(win, slot) {
  const it = win && win.slots ? win.slots[slot] : null;
  if (!it) return null;
  return { id: it.type, name: it.name, count: it.count, damage: it.metadata, nbt: !!it.nbt };
}

/** 全窗口槽快照（0..38，只列非空）——失败时的诊断面。 */
function dumpSlots(win) {
  const out = [];
  const n = win && win.slots ? win.slots.length : 0;
  for (let s = 0; s < Math.min(n, 46); s++) {
    const it = win.slots[s];
    if (it) out.push(`${s}:${it.name}(id=${it.type})x${it.count}@${it.metadata}${it.nbt ? '{nbt}' : ''}`);
  }
  return out;
}
/** 整栈搬运：拾起 → 放进砧槽 → 回车位（原驱动 placeAll 面）。 */
async function placeAll(bot, srcSlot, dstSlot) {
  await wclick(bot, srcSlot); await sleep(220);
  await wclick(bot, dstSlot); await sleep(220);
  await wclick(bot, srcSlot); await sleep(220);
}

async function openAnvilWindow(ctx) {
  const { bot, geo } = ctx;
  const at = () => bot.blockAt(new Vec3(geo.ax, geo.ay, geo.az));
  for (let i = 0; i < 25; i++) {
    const b = at();
    if (b && b.name !== 'air') break;
    await sleep(300);
  }
  const block = at();
  if (!block || block.name === 'air') throw new Error('anvil block not visible to the bot');
  const win = await Promise.race([bot.openAnvil(block), sleep(9000).then(() => null)]);
  if (!win) throw new Error('anvil window did not open (openAnvil)');
  await sleep(450);
  return win;
}
async function closeWin(ctx, win) {
  try { ctx.bot.closeWindow(win); } catch (e) { /* ignore */ }
  for (let i = 0; i < 25 && ctx.bot.currentWindow; i++) await sleep(40);
}

// ------------------------------------------------------------------ scene
/** 清场面：创造 + 清包 + 落位（**不含开窗、不含给物** —— 顺序纪律：清 → 给 → 开）。 */
async function reset(ctx) {
  const { srv, name, geo } = ctx;
  srv.send(`gamemode 1 ${name}`);
  srv.send(`clear ${name}`);
  await sleep(250);
  srv.send(`tp ${name} ${geo.x + 0.5} ${geo.y} ${geo.z + 0.5} 180 0`);
  await sleep(800);
}

/** 段内 [EnchantLog] anvil-combine 行 → { ench:[kv], tx:[kv], rows:[line], other:[line] } */
function combineRows(seg) {
  const rows = seg.filter((l) => RE.combine.test(l));
  const kv = rows.map(parseCombine).filter(Boolean);
  return {
    rows,
    ench: kv.filter((r) => r.face === 'ench'),
    tx: kv.filter((r) => r.face === 'tx'),
    lines: rows.map(stripPrefix),
  };
}

async function collectRows(ctx, from, waitMs = 2500) {
  const t0 = Date.now();
  let seg = [];
  for (;;) {
    seg = ctx.srv.all.slice(from);
    if (seg.some((l) => RE.combine.test(l)) || Date.now() - t0 > waitMs) break;
    await sleep(200);
  }
  await sleep(300);
  return ctx.srv.all.slice(from);
}

function inventoryOf(bot) {
  const slots = (bot.currentWindow && bot.currentWindow.slots) || [];
  const out = [];
  for (let s = 3; s <= 38; s++) {
    const it = slots[s];
    if (it) out.push({ slot: s, id: it.type, name: it.name, count: it.count, damage: it.metadata });
  }
  return out;
}

// ------------------------------------------------------------------ cells
/** 通用砧面：摆入 → 可选改名 → 读产出 → 取产 → 收判行。 */
async function anvilCell(ctx, spec) {
  const { srv, bot, name } = ctx;
  const rec = { id: spec.id, note: spec.note, give: spec.give, take: spec.take, checks: {} };
  log(spec.id, 'begin', spec.note);

  await say(`[${spec.id}] ${spec.note}`);
  await reset(ctx);
  await preCell(ctx, spec.id);
  const win = await openAnvilWindow(ctx);
  rec.window = { id: win.id, type: win.type, slots: win.slots ? win.slots.length : null };
  rec.piercingId = ctx.piercingId;

  // ---- 摆入（hotbar 0/1 钉死 → 窗口 30/31；按数字 id 认物）
  const cur = () => bot.currentWindow || win;
  await placeInputs(ctx, win, spec, rec);
  await sleep(600);

  // ---- 改名面（1.12 = MC|ItemName 插件通道）
  if (spec.rename) {
    bot._client.registerChannel('MC|ItemName', 'string');
    bot._client.writeChannel('MC|ItemName', spec.rename);
    await sleep(700);
    rec.rename = { sent: spec.rename };
  }

  // ---- 产出读数（窗口槽 2）
  const outStack = slotInfo(cur(), 2);
  const inStack = slotInfo(cur(), 0);
  rec.output = outStack;
  rec.input0 = inStack;
  rec.slotsAtTake = dumpSlots(cur());
  rec.checks.outputPresent = !!outStack;

  // ---- 取产出
  const from = srv.all.length;
  if (spec.take === 'quickmove') {
    await wclick(bot, 2, 0, 1);         // QUICK_MOVE（shift 取产）— 快照面
    await sleep(700);
  } else {
    await wclick(bot, 2);               // 拾到光标
    await sleep(320);
    await wclick(bot, 30);              // 停到快捷栏 0（摆入后必空）
    await sleep(500);
  }
  const seg = await collectRows(ctx, from);
  rec.rows = combineRows(seg);
  rec.craftRows = seg.filter((l) => RE.craftTake.test(l)).map(stripPrefix);
  rec.invAfter = inventoryOf(bot);
  rec.input1After = slotInfo(cur(), 1);   // 耗材余量留在砧槽里（关窗才回包）
  rec.afterSlots = dumpSlots(cur());

  await closeWin(ctx, win);
  await sleep(350);
  return rec;
}

/** W-33e 负证：同 a 场景但 anvilDebugLog=false ⇒ 0 条 anvil-combine；enchantprobe 行仍在。 */
async function negativeCell(ctx, spec) {
  const { srv, bot } = ctx;
  const rec = { id: spec.id, note: spec.note, checks: {} };
  log(spec.id, 'begin', spec.note);
  await say(`[${spec.id}] ${spec.note}`);

  await reset(ctx);
  await preCell(ctx, spec.id);
  const win = await openAnvilWindow(ctx);
  await placeInputs(ctx, win, spec, rec);
  await sleep(600);
  rec.output = slotInfo(ctx.bot.currentWindow || win, 2);
  const from = srv.all.length;
  await wclick(bot, 2); await sleep(320);
  await wclick(bot, 30); await sleep(500);
  const seg = await collectRows(ctx, from, 3000);
  rec.segLen = seg.length;
  rec.combineRows = seg.filter((l) => RE.combine.test(l)).map(stripPrefix);
  rec.anyEnchantRows = seg.filter((l) => RE.enchantAny.test(l)).map(stripPrefix);
  rec.invAfter = inventoryOf(bot);
  await closeWin(ctx, win);
  await sleep(300);

  // ---- 通道独立面：命令面 enchantprobe（不读 anvilDebugLog）
  const pf = srv.all.length;
  srv.send(`etest enchantprobe mainhand melee ${ctx.name}`);
  const probe = await srv.waitFor(RE.probeRow, 6000, pf);
  rec.probeRow = probe ? stripPrefix(probe) : null;
  return rec;
}

// ------------------------------------------------------------------ judgments
function judgeA(rec, spec) {
  const e = rec.rows.ench[0] || {};
  const t = rec.rows.tx[0] || {};
  const inDmg = rec.input0 ? rec.input0.damage : null;
  const outDmg = rec.output ? rec.output.damage : null;
  const taken = (rec.invAfter || []).find((i) => i.id === rec.primaryId);
  const c = rec.checks;
  c.enchRows = rec.rows.ench.length === 1;
  c.txRows = rec.rows.tx.length === 1;
  c.enchOrder = rec.rows.rows.length >= 2
    && rec.rows.rows.findIndex((l) => /face=ench/.test(l)) >= 0
    && rec.rows.rows.findIndex((l) => /face=ench/.test(l)) < rec.rows.rows.findIndex((l) => /face=tx/.test(l));
  c.enchFace = e.face === 'ench' && e.mode === 'vanilla' && e.item === spec.expectItem
    && e.ench === spec.expectEnch && e.id === String(rec.piercingId)
    && e.base === String(spec.expectBase) && e.add === String(spec.expectAdd)
    && e.out === String(spec.expectOut) && e.max === String(spec.expectMax);
  c.txFace = t.face === 'tx' && t.mode === 'vanilla' && t.kind === spec.expectKind
    && t.item === spec.expectItem && Number(t.cost) > 0;
  c.dmgFace = t.dmg === `${inDmg}>${outDmg}`;
  c.nbtTaken = !!taken && taken.damage === outDmg;
  rec.expect = { ench: spec.expectEnch, id: rec.piercingId, base: spec.expectBase, add: spec.expectAdd, out: spec.expectOut, max: spec.expectMax, kind: spec.expectKind };
  rec.pass = Object.values(c).every(Boolean);
  return rec;
}

function judgeC(rec, spec) {
  const t = rec.rows.tx[0] || {};
  const c = rec.checks;
  c.enchRows0 = rec.rows.ench.length === 0;
  c.txRows = rec.rows.tx.length === 1;
  c.txFace = t.face === 'tx' && t.mode === 'etim' && t.kind === 'repair'
    && t.item === spec.expectItem && Number(t.mat) === spec.expectMat && Number(t.cost) === 0;
  c.craftTake = rec.craftRows.some((l) => l.includes('repair take') && l.includes(`tool=${spec.expectItem}`));
  const nugId = rec.placed[1] ? rec.placed[1].srcId : -1;
  const inSlot = rec.input1After && rec.input1After.id === nugId ? rec.input1After.count : 0;
  const inInv = (rec.invAfter || []).filter((i) => i.id === nugId).reduce((a, b) => a + b.count, 0);
  c.nuggets7 = inSlot + inInv === 7;
  rec.nuggetsAfter = { inSlot, inInv };
  rec.expect = { mode: 'etim', kind: 'repair', mat: spec.expectMat, cost: 0, nuggetsLeft: 7 };
  rec.pass = Object.values(c).every(Boolean);
  return rec;
}

function judgeD(rec, spec) {
  const t = rec.rows.tx[0] || {};
  const c = rec.checks;
  c.enchRows0 = rec.rows.ench.length === 0;
  c.txRows = rec.rows.tx.length === 1;
  c.txFace = t.face === 'tx' && t.mode === 'vanilla' && t.kind === 'rename' && t.item === spec.expectItem;
  c.outputRenamed = !!(rec.output && rec.output.nbt);
  const taken = (rec.invAfter || []).find((i) => i.id === rec.primaryId);
  c.takenPresent = !!taken;
  rec.expect = { mode: 'vanilla', kind: 'rename', ench: 0 };
  rec.pass = Object.values(c).every(Boolean);
  return rec;
}

function judgeF(rec, spec) {
  const c = rec.checks;
  const t = rec.rows.tx[0] || {};
  c.enchRows0 = rec.rows.ench.length === 0;
  c.txRows = rec.rows.tx.length === 1;
  c.txFace = t.face === 'tx' && t.mode === 'etim' && t.kind === 'repair'
    && t.item === spec.expectItem && Number(t.mat) === 0;
  c.invOne = (rec.invAfter || []).filter((i) => i.id === rec.primaryId).length === 1;
  rec.expect = { mode: 'etim', kind: 'repair', mat: 0, ench: 0 };
  rec.pass = Object.values(c).every(Boolean);
  return rec;
}

function judgeG(rec, spec) {
  const t = rec.rows.tx[0] || {};
  const c = rec.checks;
  c.txRows = rec.rows.tx.length === 1;
  c.itemNonEmpty = t.face === 'tx' && t.item === spec.expectItem;   // 快照生效直证
  c.invHas = (rec.invAfter || []).some((i) => i.id === rec.primaryId);
  c.takeMode = rec.take === 'quickmove';
  rec.expect = { take: 'quickmove', item: spec.expectItem, itemFaceNonEmpty: true };
  rec.pass = Object.values(c).every(Boolean);
  return rec;
}

function judgeE(rec) {
  const c = rec.checks;
  c.zeroCombine = rec.combineRows.length === 0;
  c.zeroEnchantInScene = rec.anyEnchantRows.length === 0;
  c.probeAlive = !!rec.probeRow && rec.probeRow.includes('enchantprobe');
  rec.pass = Object.values(c).every(Boolean);
  return rec;
}

// ------------------------------------------------------------------ points
const ENCH_BOOK = (id, lvl) => `{StoredEnchantments:[{id:${id}s,lvl:${lvl}s}]}`;

const POINTS = {
  'W-33a': {
    id: 'W-33a', note: '附魔基线：铜镐 + etim:piercing L2 书（vanilla 臂）',
    give: [{ item: 'etim:pickaxe_copper', slot: 0 }, { item: 'minecraft:enchanted_book', slot: 1 }],
    take: 'pickup', expectItem: 'etim:pickaxe_copper', expectEnch: 'etim:piercing',
    expectId: 92, expectBase: 0, expectAdd: 2, expectOut: 2, expectMax: 5, expectKind: 'ench',
    judge: judgeA,
  },
  'W-33c': {
    id: 'W-33c', note: 'ETIM 修理臂：铜镰 -1600 + 9 铜珠（耗材修理）',
    give: [{ item: 'etim:scythe_copper', slot: 0 }, { item: 'etim:nugget_copper', slot: 1 }],
    take: 'pickup', expectItem: 'etim:scythe_copper', expectMat: 2,
    judge: judgeC,
  },
  'W-33d': {
    id: 'W-33d', note: '改名：空槽改名取产出（无 face=ench）',
    give: [{ item: 'etim:pickaxe_copper', slot: 0 }],
    take: 'pickup', rename: 'ETIM_W33D', expectItem: 'etim:pickaxe_copper',
    judge: judgeD,
  },
  'W-33f': {
    id: 'W-33f', note: 'ETIM 双物合并：双铜镰（-800 / -400）mat=0',
    give: [{ item: 'etim:scythe_copper', slot: 0 }, { item: 'etim:scythe_copper', slot: 1 }],
    take: 'pickup', expectItem: 'etim:scythe_copper',
    judge: judgeF,
  },
  'W-33e': {
    id: 'W-33e', note: '负证：anvilDebugLog=false 下同 a 场景（0 条 anvil-combine）',
    give: [{ item: 'etim:pickaxe_copper', slot: 0 }, { item: 'minecraft:enchanted_book', slot: 1 }],
    take: 'pickup', expectItem: 'etim:pickaxe_copper',
    judge: null,
  },
  'W-33g': {
    id: 'W-33g', note: 'QUICK_MOVE 抽干回归：shift 取产（快照面）',
    give: [{ item: 'etim:pickaxe_copper', slot: 0 }, { item: 'minecraft:enchanted_book', slot: 1 }],
    take: 'quickmove', expectItem: 'etim:pickaxe_copper', expectEnch: 'etim:piercing',
    judge: judgeG,
  },
};

/** 每点的摆场：**用 /replaceitem 钉死 hotbar 0/1 两个槽位**（mineflayer 无模组注册表，
 *  按 registry 名定位必败；槽位钉死后窗口槽 = 30 + n 恒定）。 */
async function preCell(ctx, id) {
  const { srv, name } = ctx;
  const slot = (n, item, count = 1, damage = 0, tag) => {
    const tail = tag ? ' ' + tag : '';
    srv.send(`replaceitem entity ${name} slot.hotbar.${n} ${item} ${count} ${damage}${tail}`.trim());
  };
  srv.send(`etest level 200 ${name}`);
  await sleep(150);
  if (id === 'W-33a' || id === 'W-33b' || id === 'W-33e' || id === 'W-33g') {
    // 铜镐（damage 0）+ StoredEnchantments 书（**运行时 id** = 启动日志 [EtimInit] 面）
    if (!ctx.piercingId) throw new Error(`${id}: 运行时 piercing id 未取到（[EtimInit] enchant 行缺失）`);
    slot(0, 'etim:pickaxe_copper');
    slot(1, 'minecraft:enchanted_book', 1, 0, ENCH_BOOK(ctx.piercingId, 2));
  } else if (id === 'W-33c') {
    // 1.12 的 item damage 走 slot 的 data 字段（不是 NBT Damage）——第 5 个参数就是 damage
    slot(0, 'etim:scythe_copper', 1, 1600);
    slot(1, 'etim:nugget_copper', 9);
  } else if (id === 'W-33d') {
    slot(0, 'etim:pickaxe_copper');
  } else if (id === 'W-33f') {
    slot(0, 'etim:scythe_copper', 1, 800);
    slot(1, 'etim:scythe_copper', 1, 400);
  }
  await sleep(500);
}

/** 把 hotbar 0/1 的货搬进砧槽 0/1，并记录源 item id（后续按 id 认产出）。 */
async function placeInputs(ctx, win, spec, rec) {
  const { bot } = ctx;
  const cur = () => bot.currentWindow || win;
  rec.placed = [];
  for (let i = 0; i < spec.give.length; i++) {
    const srcSlot = 30 + i;
    const before = slotInfo(cur(), srcSlot);
    if (!before) {
      const w = cur();
      const dump = [];
      for (let s = 0; s <= 38; s++) {
        const it = w && w.slots ? w.slots[s] : null;
        if (it) dump.push(`${s}:${it.name}/${it.type}x${it.count}`);
      }
      throw new Error(`${spec.id}: hotbar.${i} empty — replaceitem 未落地 | window=[${dump.join(' ')}]`);
    }
    await placeAll(bot, srcSlot, spec.give[i].slot);
    const now = slotInfo(cur(), spec.give[i].slot);
    rec.placed.push({ item: spec.give[i].item, srcId: before.id, srcSlot, dst: spec.give[i].slot, now });
    if (!now) throw new Error(`${spec.id}: 砧槽 ${spec.give[i].slot} 放置失败`);
  }
  rec.primaryId = rec.placed[0] ? rec.placed[0].srcId : null;
  await sleep(600);
}

// ------------------------------------------------------------------ phase
async function runPhase(ctxPhase, cells, ev) {
  const tag = ctxPhase.tag;
  const botName = ctxPhase.bot;
  const srv = await startServer({ root: ROOT, tag });
  srvRef = srv;
  const phase = { tag, bot: botName, label: ctxPhase.label, cells: [] };
  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = done.trim();
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.extraMentions = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 5);
    phase.enchInit = srv.all.filter((l) => /\[EtimInit\] enchant /.test(l)).map(stripPrefix);
    const pidLine = srv.all.find((l) => /\[EtimInit\] enchant etim:piercing id=/.test(l));
    phase.piercingId = pidLine ? Number(/etim:piercing id=(\d+)/.exec(pidLine)[1]) : null;
    log('setup', 'runtime piercing id=' + phase.piercingId);

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
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('gamerule keepInventory true');
    srv.send('difficulty 0');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`effect ${botName} clear`);
    srv.send(`etest food 6 6 6 ${botName}`);
    await sleep(1200);

    // ---- 砧台：假人自身落点列（同 chunk 必已加载）
    const p0 = bot.entity.position;
    const geo = {
      x: Math.floor(p0.x), y: Math.floor(p0.y), z: Math.floor(p0.z),
      ax: Math.floor(p0.x) + 2, ay: Math.floor(p0.y), az: Math.floor(p0.z),
      spawn: { x: p0.x, y: p0.y, z: p0.z },
    };
    phase.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) anvil=(${geo.ax},${geo.ay},${geo.az})`);
    for (const dx of [-1, 0, 1, 2, 3]) {
      for (const dz of [-1, 0, 1]) {
        srv.send(`setblock ${geo.x + dx} ${geo.y - 1} ${geo.z + dz} minecraft:stone 0 replace`);
        for (const dy of [0, 1, 2]) srv.send(`setblock ${geo.x + dx} ${geo.y + dy} ${geo.z + dz} minecraft:air 0 replace`);
      }
    }
    await sleep(900);
    const anvilFrom = srv.all.length;
    srv.send(`setblock ${geo.ax} ${geo.ay} ${geo.az} minecraft:anvil 0 replace`);
    await sleep(700);
    const anvilLine = await srv.waitFor(RE.placed, 4000, anvilFrom);
    phase.anvilPlaced = anvilLine ? stripPrefix(anvilLine) : null;
    srv.send(`testforblock ${geo.ax} ${geo.ay} ${geo.az} minecraft:anvil 0`);
    const anvilTb = await srv.waitFor(/Successfully found the block|The block at/, 4000, anvilFrom);
    phase.anvilPresent = anvilTb ? stripPrefix(anvilTb) : null;
    srv.send(`tp ${botName} ${geo.x + 0.5} ${geo.y} ${geo.z + 0.5} 180 0`);
    await sleep(1500);
    const p1 = bot.entity.position;
    phase.posAfterTp = { x: p1.x, y: p1.y, z: p1.z };
    phase.grounded = Math.abs(p1.y - geo.y) < 0.6 && Math.abs(p1.x - (geo.x + 0.5)) < 0.9;

    const ctx = { srv, bot, name: botName, geo, phase, piercingId: phase.piercingId };

    for (const item of cells) {
      let rec;
      try {
        if (item.id === 'W-33e') {
          rec = await negativeCell(ctx, item.spec);
          rec = judgeE(rec);
        } else {
          rec = await anvilCell(ctx, item.spec);
          rec = item.spec.judge(rec, item.spec);
        }
      } catch (e) {
        rec = { id: item.id, fatal: e && e.stack ? e.stack : String(e), pass: false };
        log(item.id, 'FATAL', rec.fatal);
      }
      log(item.id, rec.pass ? 'PASS' : 'FAIL', JSON.stringify(rec.checks || {}));
      phase.cells.push(rec);
    }
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

// ------------------------------------------------------------------ main
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [] };

  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.cfgOld = pinOf(CFG, PIN.cfgOld, 'cfg-old');
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  log('pin', `dev=${ev.pins.devJar.bytes}/${ev.pins.devJar.sha} ${ev.pins.devJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `rel=${ev.pins.relJar.bytes}/${ev.pins.relJar.sha} ${ev.pins.relJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `cfg-old=${ev.pins.cfgOld.bytes}/${ev.pins.cfgOld.sha} ${ev.pins.cfgOld.ok ? 'OK' : 'MISMATCH'}`);
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (fs.existsSync(path.join(ROOT, 'run', 'mods', 'etimextra-0.1.0.jar'))) {
    throw new Error('etimextra jar present in run/mods — this batch must run without it');
  }

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);

  // ---- 快照 + 换世界
  ev.cfgSnapshotOld = snapshot(CFG, TAG + '-etim.cfg.old');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  log('config', `cfg(old anchor) ${ev.cfgSnapshotOld.bytes} B ${ev.cfgSnapshotOld.sha}`);
  log('config', `server.properties ${ev.propsSnapshot.bytes} B ${ev.propsSnapshot.sha}`);

  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  else propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  ev.propsWindow = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
  log('config', `level-name -> ${WORLD_NAME} / spawn-protection -> 0`);

  const cellsNeg = pick([{ id: 'W-33e', spec: POINTS['W-33e'] }]);
  const cellsMain = pick(['W-33a', 'W-33c', 'W-33d', 'W-33f', 'W-33g']
    .map((id) => ({ id, spec: POINTS[id] })));
  const cellsMax1 = pick([{ id: 'W-33b', spec: { ...POINTS['W-33a'], id: 'W-33b', take: 'pickup',
    note: 'maxLevel 门：piercingMaxLevel=1 下重做铜镐 + L2 书', expectOut: 1, expectMax: 1 } }]);

  let restoreOk = false;
  let cfgNewBase = null;
  try {
    // ---- 相 1：anvilDebugLog=false（首 boot 顺带 regen 新键）
    const p1 = await runPhase({ tag: TAG + '-neg', bot: 'ETIM_W33Neg', label: 'neg (anvilDebugLog=false)' }, cellsNeg, ev);
    p1.phase = 'neg';
    cfgNewBase = snapshot(CFG, TAG + '-etim.cfg.newbase');
    ev.cfgNewBase = cfgNewBase;
    ev.cfgRegenAdded = /B:anvilDebugLog=/.test(fs.readFileSync(CFG, 'utf8'));
    log('config', `cfg new baseline after regen: ${cfgNewBase.bytes} B ${cfgNewBase.sha} (anvilDebugLog key=${ev.cfgRegenAdded})`);

    // ---- 相 2：anvilDebugLog=true
    if (cellsMain.length) {
      ev.cfgEditA = editConfig((t) => {
        if (!/B:anvilDebugLog=false/.test(t)) throw new Error('cfg has no B:anvilDebugLog=false');
        return t.replace('B:anvilDebugLog=false', 'B:anvilDebugLog=true');
      });
      log('config', `phase main cfg edit: anvilDebugLog=true (${ev.cfgEditA.bytes} B ${ev.cfgEditA.sha})`);
      const p2 = await runPhase({ tag: TAG + '-main', bot: 'ETIM_W33A', label: 'main (anvilDebugLog=true)' }, cellsMain, ev);
      p2.phase = 'main';
    }

    // ---- 相 3：piercingMaxLevel=1
    if (cellsMax1.length) {
      ev.cfgEditB = editConfig((t) => {
        if (!/I:piercingMaxLevel=5/.test(t)) throw new Error('cfg has no I:piercingMaxLevel=5');
        return t.replace('I:piercingMaxLevel=5', 'I:piercingMaxLevel=1');
      });
      log('config', `phase max1 cfg edit: piercingMaxLevel=1 (${ev.cfgEditB.bytes} B ${ev.cfgEditB.sha})`);
      const p3 = await runPhase({ tag: TAG + '-max1', bot: 'ETIM_W33B', label: 'max1 (piercingMaxLevel=1)' }, cellsMax1, ev);
      p3.phase = 'max1';
    }
  } finally {
    // ---- 收口：cfg → 新基线（新键在场），props → 起窗快照
    if (cfgNewBase) fs.writeFileSync(CFG, fs.readFileSync(cfgNewBase.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = {
      bytes: cfgAfter.length, sha: sha256(cfgAfter),
      target: cfgNewBase ? cfgNewBase.sha : null,
      identical: cfgNewBase ? sha256(cfgAfter) === cfgNewBase.sha : false,
    };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter), identical: sha256(propsAfter) === ev.propsSnapshot.sha };
    log('config', 'cfg restored to NEW baseline ' + (ev.cfgRestored.identical ? 'byte-identical' : 'MISMATCH'));
    log('config', 'server.properties restored ' + (ev.propsRestored.identical ? 'byte-identical' : 'MISMATCH'));
    restoreOk = ev.cfgRestored.identical && ev.propsRestored.identical;

    const worldDir = path.join(ROOT, 'run', WORLD_NAME);
    if (fs.existsSync(worldDir)) {
      fs.rmSync(worldDir, { recursive: true, force: true });
      ev.worldDirRemoved = !fs.existsSync(worldDir);
      log('cleanup', 'world dir removed: ' + WORLD_NAME);
    }
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel') };
    ev.jarUpToDate = ev.phases.length > 0
      && ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
  }

  const allCells = ev.phases.flatMap((p) => p.cells);
  const expectCells = cellsNeg.length + cellsMain.length + cellsMax1.length;
  ev.verdict = (allCells.length === expectCells
      && allCells.every((c) => c.pass)
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const c of allCells) log(c.id, c.pass ? 'PASS' : 'FAIL');
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
