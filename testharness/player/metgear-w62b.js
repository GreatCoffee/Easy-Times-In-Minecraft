#!/usr/bin/env node
/**
 * metgear-w62b.js — metgear 批 W-62…W-69 重跑窗驱动（A-1/C-1 修后 · HEAD c2519a5）
 *
 * 判据正本：
 *   playground/audit/metgear-立项摸底.md §1.4（六剪判值表）/ §3.4（gold 链甲判值表）/ §4（七处特判）
 *   playground/audit/metgear-终审回执.md §四（判值速查）
 *   audit20 条 212/213/214（D-1…D-6 终裁 / 落码清单 / 落码收讫 132-35-160）+ 条 216（A-1 修复）
 *
 * 判据通道（全在役，零新建）：
 *   [EquipLog] gear item=<reg> maxDamage=… attackDamage=… efficiency=… grade=… burn=… armor=…
 *   [EquipLog] durability reassert: <N> gear rows ok
 *   [TestLog]  gear recipes registered: <N> batch rows ok (… etim-domain total <M> …)
 *   [MiningLog] tool decay face=breaking|attacking|shearing item=… [block=…] loss=<N>
 *   [MiningLog] mine deny grade=<g> required=<r> item=… block=…
 *   [BlockLog] probe player=… held=… dur=<n>/<max>      （服务端主手栈真值）
 *   [DamageLog] prot … armor=<f>                         （W-68 armor 硬读数）
 *   [CraftingLog] … COMPLETE <显名> ×n quality=… xp=…    （W-64 合成链）
 *
 * 判点（单 boot）：
 *   W-62 boot 行 132/35/160 恰值
 *   W-63 六剪 gear 行 per-metal + gold 链甲四件 armor double 原值
 *   W-64 4 金粒环形→chain_gold ×1；5 chain_gold→chain_helmet_gold ×1；/give 四件
 *   W-65 七件剪 × web（loss=10）/ wool（loss=80）
 *   W-66 七件剪 × 羊（loss=50，Sheared:1b）
 *   W-67 copper 剪 × obsidian（deny grade=2 required=3）+ copper 剪 × wool（无 deny）
 *   W-68 gold 链甲四件 armor 硬读数 4.000（铜链对照 5.000）
 *   W-69 七处 instanceof 锚位静态核讫 + 运行期无 +1 双磨（Δdur 恰等漏斗值）
 *
 * 用法：node metgear-w62b.js [tag]
 *   MET_ONLY=W62,W63（裁剪）｜MET_STAGE=<tag>（.out 隔离）｜MET_SMOKE=1（缩样冒烟）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'metgear-w62b';
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
const SRC_MINING = path.join(ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mining', 'ETIMMining.java');
const SRC_MIXIN_SHEARS = path.join(ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mixins', 'MixinItemShears.java');

const WORLD = 'metgearw62b';
const PORT = 25565;
const BOT = 'ETIM_W62B';
const MOB_SEL = '@e[tag=mgZ]';
const MOB_NBT = '{Tags:["mgZ"],NoAI:1b,Silent:1b,PersistenceRequired:1b,'
  + 'Attributes:[{Name:"generic.maxHealth",Base:200.0}],Health:200.0f}';

const SMOKE = process.env.MET_SMOKE === '1';
const ONLY = (process.env.MET_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const STAGE = (process.env.MET_STAGE || TAG).trim();

/** 起收钉（HEAD c2519a5；三 jar 由主会话 build 后亲算，条 216）。 */
const PIN = {
  head: 'c2519a5',
  rel: { bytes: 780416, sha: '94E0AECC0DE244B9DE646C2B01BB5C34F5A3CA19C10F3EE2514C09240102CAA4' },
  dev: { bytes: 764385, sha: '6FFC3CFF956EF70B021B02E618D6A203C3501E1B3B2610D396E9C0EAE54EB714' },
  src: { bytes: 709499, sha: '14C5E1B4F60ED340A5ED86900185A2DBE70D5B40829BA37AF37D0725EEA5ACBA' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30277, sha: 'E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

const MK_PIN = {
  mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138,
  sword: 4, tool: 4, shears: 3, sliceTotal: 11,
};

/** W-63 判值表（摸底 §1.4 + 终审 §四；C-2 重钉 per-metal）。 */
const SHEARS = [
  { reg: 'etim:shears_copper', max: 3200, eff: '1.75', grade: 2 },
  { reg: 'etim:shears_silver', max: 3200, eff: '1.75', grade: 2 },
  { reg: 'etim:shears_gold', max: 3200, eff: '1.75', grade: 2 },
  { reg: 'etim:shears_ancient_metal', max: 12800, eff: '2.0', grade: 3 },
  { reg: 'etim:shears_mithril', max: 51200, eff: '2.5', grade: 4 },
  { reg: 'etim:shears_adamantium', max: 204800, eff: '3.0', grade: 5 },
  { reg: 'etim:shears_rusted_iron', max: 3200, eff: '1.25', grade: 2, rusted: true },
];
/** 冒烟裁剪：W-65/W-66 只跑前两件（W-63 仍全表判 boot 行）。 */
const RUN_SHEARS = SMOKE ? SHEARS.slice(0, 2) : SHEARS;
const GOLD_CHAIN = [
  { reg: 'etim:chain_helmet_gold', max: 20, armor: '0.8333333333333334' },
  { reg: 'etim:chain_chestplate_gold', max: 32, armor: '1.3333333333333333' },
  { reg: 'etim:chain_leggings_gold', max: 28, armor: '1.1666666666666667' },
  { reg: 'etim:chain_boots_gold', max: 16, armor: '0.6666666666666666' },
];

const RE = {
  gear: /\[EquipLog\] gear item=(\S+) maxDamage=(-?\d+) attackDamage=(\S+) efficiency=(\S+) grade=(-?\d+) burn=(-?\d+) armor=(\S+)/,
  reassert: /\[EquipLog\] durability reassert: (\d+) gear rows ok/,
  recipes: /\[TestLog\] gear recipes registered: (\d+) batch rows ok \(runtime REGISTRY delta; etim-domain total (\d+) /,
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  deny: /\[MiningLog\] mine deny grade=(-?\d+) required=(-?\d+) item=(\S+) block=(\S+)/,
  probe: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(-|\d+)(?:\/(\d+))?/,
  prot: /\[DamageLog\] prot target=(\S+) src=(\S+) natural=(\S+) armor=(\S+) potion=(\S+) total=(\S+) piercing=(\S+) wear=(\S+)/,
  dmg: /\[DamageLog\] dmg target=(\S+) src=(\S+) raw=(\S+) armorIn=(\S+) armorOut=(\S+) absorption=(\S+) final=(\S+)/,
  complete: /\[CraftingLog\].*COMPLETE (.+?) quality=(\w+) xp=(-?\d+) (continue|proceed stopped)/,
  craftRow: /\[CraftingLog\]/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  found: /Successfully found the block/,
  notFound: /The block at|That position is not loaded/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  done: /Done \(/,
  summonOk: /successfully summoned|Summoned new/i,
  testforHit: /(?:\]:\s|^)Found \S/,
  testforNone: /did not match the required data structure|found nothing/,
  noTarget: /NO_TARGET/,
};

/* ============================ 小件 ============================ */

let Vec3 = null;
try { Vec3 = require('vec3'); } catch (e) { Vec3 = null; }

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
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length, server: (j.server || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.refmapClasses
    && out.refmapResources.entries === MK_PIN.refmapEntries
    && out.refmapTmp.classes === MK_PIN.refmapClasses
    && out.refmapTmp.entries === MK_PIN.refmapEntries
    && out.refmapResources.slices.sword === MK_PIN.sword
    && out.refmapResources.slices.tool === MK_PIN.tool
    && out.refmapResources.slices.shears === MK_PIN.shears
    && out.refmapResources.sliceTotal === MK_PIN.sliceTotal
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
  await srv.waitFor(new RegExp('\\[Server\\] ' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 6000, from);
  await sleep(120);
  return from;
}

/** 服务端主手栈真值（blockprobe 备用口；现 cfg blockDebugLog=false ⇒ 本窗主口径走 bot 栈）。 */
async function probeDur(srv) {
  const from = srv.all.length;
  srv.send(`etest blockprobe ${BOT}`);
  const line = await srv.waitFor(RE.probe, 2500, from);
  if (!line) return null;
  const m = RE.probe.exec(line);
  return { raw: stripPrefix(line), held: m[2], damage: m[3] === '-' ? -1 : +m[3], max: m[4] === undefined ? -1 : +m[4] };
}

/** bot 栈读数（主口径；unbreak 批同源）：heldItem.durabilityUsed。 */
function botDur(bot) {
  const it = bot && bot.heldItem;
  if (!it) return null;
  const d = it.durabilityUsed;
  return { damage: d === undefined || d === null ? 0 : d, max: it.maxDurability === undefined ? -1 : it.maxDurability, name: it.name, type: it.type };
}

async function waitDurChange(bot, before, timeoutMs = 3000) {
  const t0 = Date.now();
  let cur = botDur(bot);
  while (Date.now() - t0 < timeoutMs) {
    cur = botDur(bot);
    if (cur && before !== null && cur.damage !== before) return cur;
    await sleep(80);
  }
  return cur;
}

/** fresh 白板栈：/etest hold → hold_set 回执 → bot 栈复读（dur 必 0）。 */
async function holdFresh(srv, bot, item) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const from = srv.all.length;
    srv.send(`etest hold ${item} ${BOT}`);
    await srv.waitFor(/commands\.etest\.hold_set/, 5000, from);
    await sleep(520);
    const d = botDur(bot);
    if (d && d.damage === 0) return d;
  }
  throw new Error('hold ' + item + ' failed — bot 栈未落到 dur=0');
}

/* ============================ 方块 / 挖掘 ============================ */

async function testBlock(srv, x, y, z, spec) {
  const from = srv.all.length;
  srv.send(`testforblock ${x} ${y} ${z} ${spec}`);
  const line = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, from);
  return stripPrefix(line || '');
}

async function setBlock(srv, x, y, z, block, meta = 0) {
  const from = srv.all.length;
  srv.send(`setblock ${x} ${y} ${z} ${block} ${meta}`);
  const line = await srv.waitFor(RE.placed, 6000, from);
  await sleep(240);
  return stripPrefix(line || '');
}

/** 一次 dig：START/STOP（40t）→ 轮询服务端 air 真值（≤16 s）。 */
async function digOnce(srv, pos, maxPollMs = 16000) {
  const from = srv.all.length;
  srv.send(`etest dig ${pos.x} ${pos.y} ${pos.z} ${BOT}`);
  const ds = await srv.waitFor(RE.digStart, 9000, from);
  const dp = await srv.waitFor(RE.digStop, 16000, from);
  await sleep(420);
  let gone = false;
  const deadline = Date.now() + maxPollMs;
  while (Date.now() < deadline) {
    const line = await testBlock(srv, pos.x, pos.y, pos.z, 'minecraft:air');
    if (RE.found.test(line)) { gone = true; break; }
    await sleep(300);
  }
  return { from, digStart: !!ds, digStop: !!dp, gone };
}

/** 9×9 石台（by−1 地台＋by..by+3 净空）＋工作台（bx−2, by, bz+2）。 */
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
  await sleep(2400);
  const from = srv.all.length;
  srv.send(`setblock ${geo.bx - 2} ${geo.by} ${geo.bz + 2} minecraft:crafting_table 0`);
  const line = await srv.waitFor(RE.placed, 5000, from);
  await sleep(500);
  return { cells: (2 * R + 1) * (2 * R + 1), table: stripPrefix(line || ''), tableOk: !!line && /Block placed/i.test(line) };
}

/* ============================ 实体 ============================ */

function entityIds(bot, name) {
  const set = new Set();
  for (const k of Object.keys(bot.entities || {})) {
    const e = bot.entities[k];
    if (e && e.name === name) set.add(e.id);
  }
  return set;
}

async function waitEntity(bot, name, beforeIds, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    for (const k of Object.keys(bot.entities || {})) {
      const e = bot.entities[k];
      if (e && e.name === name && !beforeIds.has(e.id)) return e;
    }
    await sleep(120);
  }
  return null;
}

async function ensureSheep(srv, bot, pos) {
  srv.send('kill @e[type=sheep]');
  await sleep(700);
  const before = entityIds(bot, 'sheep');
  const from = srv.all.length;
  srv.send(`summon minecraft:sheep ${pos.x} ${pos.y} ${pos.z} {NoAI:1b,Sheared:0b,Silent:1b,PersistenceRequired:1b,Age:0}`);
  const line = await srv.waitFor(new RegExp(RE.summonOk.source + '|Unable to summon', 'i'), 5000, from);
  await sleep(900);
  const e = await waitEntity(bot, 'sheep', before);
  return { ok: !!line && RE.summonOk.test(line), entity: e, line: stripPrefix(line || '') };
}

async function ensureMob(srv, pos) {
  srv.send(`kill ${MOB_SEL}`);
  await sleep(500);
  const from = srv.all.length;
  srv.send(`summon minecraft:zombie ${pos.x} ${pos.y} ${pos.z} ${MOB_NBT}`);
  const line = await srv.waitFor(new RegExp(RE.summonOk.source + '|Unable to summon', 'i'), 5000, from);
  await sleep(1100);
  return { ok: !!line && RE.summonOk.test(line), line: stripPrefix(line || '') };
}

/** INTERACT（mouse=0）体心瞄准；成年羊 aimY=0.60。 */
async function interactEntity(bot, ent, aimY = 0.60) {
  const aim = ent.position.offset(0, aimY, 0);
  await bot.lookAt(aim, false);
  await sleep(150);
  const loc = Vec3 ? new Vec3(0, 0, 0) : { x: 0, y: 0, z: 0 };
  bot._client.write('use_entity', { target: ent.id, mouse: 0, sneaking: false, hand: 0, location: loc });
  return { aimY };
}

async function testSheared(srv, want) {
  const from = srv.all.length;
  srv.send(`testfor @e[type=sheep] {Sheared:${want ? '1' : '0'}b}`);
  await sleep(700);
  const lines = srv.all.slice(from).filter((l) => !/^### \[harness\]/.test(l)).map(stripPrefix);
  return { hit: lines.some((l) => RE.testforHit.test(l)), none: lines.some((l) => RE.testforNone.test(l)), raw: lines.slice(0, 4) };
}

/* ============================ 台面原语（chaincraft-w48 同构） ============================ */

async function openTable(bot, pos) {
  const block = bot.blockAt(pos);
  if (!block || block.name !== 'crafting_table') throw new Error('no crafting_table at ' + pos);
  const winP = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('windowOpen timeout')), 8000);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  await bot.activateBlock(block);
  const win = await winP;
  await sleep(500);
  return { win, type: win.type, slots: Object.keys(win.slots).length };
}

async function closeTable(bot) {
  try { if (bot.currentWindow) await bot.closeWindow(bot.currentWindow); } catch (e) { /* ignore */ }
  await sleep(400);
}

const GRID = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

async function putOne(bot, itemId, slots) {
  const win = bot.currentWindow;
  let src = -1;
  for (const [k, s] of Object.entries(win.slots)) {
    const i = Number(k);
    if (s && s.type === itemId && i >= 10 && !GRID.has(i) && s.count >= slots.length) { src = i; break; }
  }
  if (src < 0) return { ok: false, error: 'no source stack for type ' + itemId };
  await bot.clickWindow(src, 0, 0).catch(() => {});
  await sleep(220);
  for (const g of slots) {
    await bot.clickWindow(g, 1, 0).catch(() => {});
    await sleep(150);
  }
  await bot.clickWindow(src, 0, 0).catch(() => {});
  await sleep(220);
  const bad = slots.filter((g) => {
    const s = win.slots[g];
    return !s || s.type !== itemId || s.count !== 1;
  });
  return { ok: bad.length === 0, src, bad };
}

async function clickResult(bot) {
  try {
    await bot.clickWindow(0, 0, 0);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

function countCompletes(srv, from) {
  return srv.all.slice(from).filter((l) => /\[CraftingLog\].*COMPLETE /.test(l)).length;
}

function invCounts(bot) {
  const out = {};
  for (const it of bot.inventory.items()) out[it.type] = (out[it.type] || 0) + it.count;
  return out;
}

async function calibrate(srv, bot, names) {
  const map = {};
  const fails = [];
  srv.send(`clear ${BOT}`);
  await sleep(500);
  for (const name of names) {
    const before = new Set(bot.inventory.items().map((i) => i.type));
    const from = srv.all.length;
    srv.send(`give ${BOT} ${name} 1`);
    let found = null;
    for (let k = 0; k < 16; k++) {
      await sleep(150);
      found = bot.inventory.items().find((i) => !before.has(i.type));
      if (found) break;
    }
    if (found) map[name] = found.type;
    else fails.push({ name, err: (srv.all.slice(from).find((l) => /Unknown item|No such item|commands\.give/i.test(l)) || '').trim() });
    if (bot.inventory.items().length >= 30) { srv.send(`clear ${BOT}`); await sleep(450); }
  }
  srv.send(`clear ${BOT}`);
  await sleep(500);
  return { map, fails };
}

/* ============================ 判点 ============================ */

function bootRows(srv) {
  const out = { reassert: null, recipes: null, gears: [], raw: {} };
  for (const l of srv.all) {
    let m = RE.reassert.exec(l);
    if (m && !out.reassert) out.reassert = { n: +m[1], raw: stripPrefix(l), ts: logTime(l) };
    m = RE.recipes.exec(l);
    if (m && !out.recipes) out.recipes = { added: +m[1], total: +m[2], raw: stripPrefix(l), ts: logTime(l) };
    m = RE.gear.exec(l);
    if (m) {
      out.gears.push({
        item: m[1], maxDamage: +m[2], attackDamage: m[3], efficiency: m[4],
        grade: +m[5], burn: +m[6], armor: m[7], raw: stripPrefix(l),
      });
    }
  }
  return out;
}

function gearOf(rows, item) {
  return rows.find((g) => g.item === item) || null;
}

function pointW62(ev) {
  const rec = { id: 'W-62', checks: [], observed: { reassert: ev.bootRows.reassert, recipes: ev.bootRows.recipes } };
  const r = ev.bootRows.reassert;
  const q = ev.bootRows.recipes;
  rec.checks.push({ k: 'reassert.132', want: 132, got: r ? r.n : null, ok: !!r && r.n === 132 });
  rec.checks.push({ k: 'recipes.added.35', want: 35, got: q ? q.added : null, ok: !!q && q.added === 35 });
  rec.checks.push({ k: 'recipes.total.160', want: 160, got: q ? q.total : null, ok: !!q && q.total === 160 });
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

function pointW63(ev) {
  const rec = { id: 'W-63', checks: [], observed: { shears: [], armor: [] } };
  for (const s of SHEARS) {
    const g = gearOf(ev.bootRows.gears, s.reg);
    rec.observed.shears.push({ reg: s.reg, row: g });
    const want = { maxDamage: s.max, attackDamage: '0.0', efficiency: s.eff, grade: s.grade, burn: 100, armor: '0.0' };
    rec.checks.push({
      k: s.reg + '.row', want,
      got: g ? { maxDamage: g.maxDamage, attackDamage: g.attackDamage, efficiency: g.efficiency, grade: g.grade, burn: g.burn, armor: g.armor } : '(no row)',
      ok: !!g && g.maxDamage === want.maxDamage && g.attackDamage === want.attackDamage
        && g.efficiency === want.efficiency && g.grade === want.grade
        && g.burn === want.burn && g.armor === want.armor,
    });
  }
  for (const a of GOLD_CHAIN) {
    const g = gearOf(ev.bootRows.gears, a.reg);
    rec.observed.armor.push({ reg: a.reg, row: g });
    rec.checks.push({
      k: a.reg + '.row', want: { maxDamage: a.max, armor: a.armor },
      got: g ? { maxDamage: g.maxDamage, armor: g.armor } : '(no row)',
      ok: !!g && g.maxDamage === a.max && g.armor === a.armor,
    });
  }
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

function collectDecay(srv, from) {
  const out = [];
  for (let i = from; i < srv.all.length; i++) {
    const m = RE.decay.exec(srv.all[i]);
    if (!m) continue;
    out.push({ idx: i + 1, ts: logTime(srv.all[i]), face: m[1], item: m[2], block: m[3] || null, loss: +m[4], raw: stripPrefix(srv.all[i]) });
  }
  return out;
}

function collectDeny(srv, from) {
  const out = [];
  for (let i = from; i < srv.all.length; i++) {
    const m = RE.deny.exec(srv.all[i]);
    if (!m) continue;
    out.push({ idx: i + 1, ts: logTime(srv.all[i]), grade: +m[1], required: +m[2], item: m[3], block: m[4], raw: stripPrefix(srv.all[i]) });
  }
  return out;
}

/* ---------- W-64 台面合成 ---------- */

async function craftAtTable(srv, bot, ctx, itemId, slots) {
  const segFrom = srv.all.length;
  let win = null;
  let place = null;
  let click = null;
  let complete = null;
  srv.send(`etest food 6 6 ${BOT}`);
  await sleep(400);
  try {
    win = await openTable(bot, ctx.tablePos);
    place = await putOne(bot, itemId, slots);
    await sleep(750);
    srv.send(`etest food 6 6 ${BOT}`);
    await sleep(250);
    const before = countCompletes(srv, segFrom);
    click = await clickResult(bot);
    const t0 = Date.now();
    let lastFeed = Date.now();
    while (Date.now() - t0 < 25000 && countCompletes(srv, segFrom) <= before) {
      await sleep(300);
      if (Date.now() - lastFeed > 2500) { srv.send(`etest food 6 6 ${BOT}`); lastFeed = Date.now(); }
    }
    const cLine = srv.all.slice(segFrom).find((l) => /\[CraftingLog\].*COMPLETE /.test(l));
    complete = cLine ? stripPrefix(cLine) : null;
    await sleep(700);
  } finally {
    await closeTable(bot);
  }
  await sleep(900);
  return { win: win ? { type: win.type, slots: win.slots } : null, place, click, complete, completes: countCompletes(srv, segFrom), segFrom };
}

async function pointW64(srv, bot, ctx) {
  const rec = { id: 'W-64', checks: [], observed: {} };
  await say(srv, 'MG-W64-BEGIN');
  const names = ['minecraft:gold_nugget', 'etim:chain_gold', 'etim:chain_helmet_gold',
    'etim:chain_chestplate_gold', 'etim:chain_leggings_gold', 'etim:chain_boots_gold'];
  const cal = await calibrate(srv, bot, names);
  rec.observed.ids = cal.map;
  rec.observed.calibrateFails = cal.fails;
  rec.checks.push({ k: 'give.6names', want: 'no fail', got: cal.fails.length, ok: cal.fails.length === 0 });

  // A) 4 金粒环形 → chain_gold ×1
  srv.send(`clear ${BOT}`);
  await sleep(400);
  srv.send(`give ${BOT} minecraft:gold_nugget 4`);
  await sleep(700);
  const a = await craftAtTable(srv, bot, ctx, cal.map['minecraft:gold_nugget'], [2, 4, 6, 8]);
  const chainN = invCounts(bot)[cal.map['etim:chain_gold']] || 0;
  rec.observed.chain = { place: a.place, complete: a.complete, completes: a.completes, inv: chainN };
  rec.checks.push({ k: 'chain.place', want: true, got: !!(a.place && a.place.ok), ok: !!(a.place && a.place.ok) });
  rec.checks.push({ k: 'chain.complete', want: '>=1', got: a.completes, ok: a.completes >= 1 });
  rec.checks.push({ k: 'chain.inv', want: '>=1', got: chainN, ok: chainN >= 1 });

  // B) 5 chain_gold → chain_helmet_gold ×1
  srv.send(`clear ${BOT}`);
  await sleep(400);
  srv.send(`give ${BOT} etim:chain_gold 5`);
  await sleep(700);
  const b = await craftAtTable(srv, bot, ctx, cal.map['etim:chain_gold'], [1, 2, 3, 4, 6]);
  const helmN = invCounts(bot)[cal.map['etim:chain_helmet_gold']] || 0;
  rec.observed.helmet = { place: b.place, complete: b.complete, completes: b.completes, inv: helmN };
  rec.checks.push({ k: 'helmet.place', want: true, got: !!(b.place && b.place.ok), ok: !!(b.place && b.place.ok) });
  rec.checks.push({ k: 'helmet.complete', want: '>=1', got: b.completes, ok: b.completes >= 1 });
  rec.checks.push({ k: 'helmet.inv', want: '>=1', got: helmN, ok: helmN >= 1 });

  // C) /give 四件链甲
  srv.send(`clear ${BOT}`);
  await sleep(400);
  for (const g of GOLD_CHAIN) srv.send(`give ${BOT} ${g.reg} 1`);
  await sleep(1300);
  const counts = invCounts(bot);
  const give = GOLD_CHAIN.map((g) => ({ reg: g.reg, count: counts[cal.map[g.reg]] || 0 }));
  rec.observed.give = give;
  rec.checks.push({ k: 'give.armor4', want: 'each >=1', got: give.map((x) => x.count).join('/'), ok: give.every((x) => x.count >= 1) });
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

/* ---------- W-65 剪 breaking cloth/web ---------- */

async function pointW65(srv, bot, ctx) {
  const rec = { id: 'W-65', checks: [], observed: { arms: [] } };
  await say(srv, 'MG-W65-BEGIN');
  const blocks = [{ name: 'minecraft:web', meta: 0, label: 'web', loss: 10 },
    { name: 'minecraft:wool', meta: 0, label: 'wool', loss: 80 }];
  for (const s of RUN_SHEARS) {
    for (const b of blocks) {
      const p0 = await holdFresh(srv, bot, s.reg);
      const d0 = p0.damage;
      await setBlock(srv, ctx.dig.x, ctx.dig.y, ctx.dig.z, b.name, b.meta);
      const segFrom = srv.all.length;
      const dig = await digOnce(srv, ctx.dig);
      await sleep(200);
      const p1 = await waitDurChange(bot, d0, 3000);
      const d1 = p1 ? p1.damage : null;
      const rows = collectDecay(srv, segFrom).filter((r) => r.face === 'breaking' && r.item === s.reg && r.block === b.label);
      rec.observed.arms.push({ item: s.reg, block: b.label, d0, d1, delta: d1 === null ? null : d1 - d0, want: b.loss, gone: dig.gone, rows });
      rec.checks.push({ k: `${s.reg}/${b.label}.delta`, want: b.loss, got: d1 === null ? null : d1 - d0, ok: d1 !== null && d1 - d0 === b.loss });
      rec.checks.push({
        k: `${s.reg}/${b.label}.row`, want: `loss=${b.loss}`,
        got: rows.map((r) => r.loss).join('|') || '(none)',
        ok: rows.length >= 1 && rows.every((r) => r.loss === b.loss),
      });
      rec.checks.push({ k: `${s.reg}/${b.label}.gone`, want: true, got: dig.gone, ok: dig.gone === true });
    }
  }
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

/* ---------- W-66 剪羊 face ---------- */

async function pointW66(srv, bot, ctx) {
  const rec = { id: 'W-66', checks: [], observed: { arms: [] } };
  await say(srv, 'MG-W66-BEGIN');
  for (const s of RUN_SHEARS) {
    const sheep = await ensureSheep(srv, bot, ctx.sheepPos);
    const p0 = await holdFresh(srv, bot, s.reg);
    const d0 = p0.damage;
    const before = await testSheared(srv, false);
    const segFrom = srv.all.length;
    const act = sheep.entity ? await interactEntity(bot, sheep.entity) : null;
    await sleep(900);
    const after = await testSheared(srv, true);
    const p1 = await waitDurChange(bot, d0, 3000);
    const d1 = p1 ? p1.damage : null;
    const rows = collectDecay(srv, segFrom).filter((r) => r.face === 'shearing' && r.item === s.reg);
    rec.observed.arms.push({ item: s.reg, sheepOk: sheep.ok, d0, d1, delta: d1 === null ? null : d1 - d0, shearedBefore: before.hit, shearedAfter: after.hit, rows });
    rec.checks.push({ k: `${s.reg}.summon`, want: true, got: sheep.ok, ok: sheep.ok === true });
    rec.checks.push({ k: `${s.reg}.sheared`, want: true, got: after.hit, ok: after.hit === true });
    rec.checks.push({ k: `${s.reg}.delta`, want: 50, got: d1 === null ? null : d1 - d0, ok: d1 !== null && d1 - d0 === 50 });
    rec.checks.push({
      k: `${s.reg}.row`, want: 'loss=50', got: rows.map((r) => r.loss).join('|') || '(none)',
      ok: rows.length >= 1 && rows.every((r) => r.loss === 50),
    });
  }
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

/* ---------- W-67 等级拒 ---------- */

async function pointW67(srv, bot, ctx) {
  const rec = { id: 'W-67', checks: [], observed: {} };
  await say(srv, 'MG-W67-BEGIN');
  await holdFresh(srv, bot, 'etim:shears_copper');
  await setBlock(srv, ctx.dig2.x, ctx.dig2.y, ctx.dig2.z, 'minecraft:obsidian');
  const segA = srv.all.length;
  const digA = await digOnce(srv, ctx.dig2, 4000);
  const denyA = collectDeny(srv, segA).filter((r) => r.item === 'etim:shears_copper' && r.block === 'obsidian');
  const stillA = await testBlock(srv, ctx.dig2.x, ctx.dig2.y, ctx.dig2.z, 'minecraft:obsidian');
  rec.observed.denyArm = { deny: denyA, stillObsidian: RE.found.test(stillA), digA };
  rec.checks.push({
    k: 'deny.2/3', want: 'grade=2 required=3',
    got: denyA.map((r) => `${r.grade}/${r.required}`).join('|') || '(none)',
    ok: denyA.length >= 1 && denyA.every((r) => r.grade === 2 && r.required === 3),
  });
  rec.checks.push({ k: 'deny.block.kept', want: true, got: RE.found.test(stillA), ok: RE.found.test(stillA) });

  await holdFresh(srv, bot, 'etim:shears_copper');
  await setBlock(srv, ctx.dig3.x, ctx.dig3.y, ctx.dig3.z, 'minecraft:wool');
  const segB = srv.all.length;
  const digB = await digOnce(srv, ctx.dig3);
  const denyB = collectDeny(srv, segB).filter((r) => r.item === 'etim:shears_copper' && r.block === 'wool');
  const rowsB = collectDecay(srv, segB).filter((r) => r.face === 'breaking' && r.item === 'etim:shears_copper' && r.block === 'wool');
  rec.observed.allowArm = { deny: denyB, gone: digB.gone, rows: rowsB };
  rec.checks.push({ k: 'allow.noDeny', want: '0 rows', got: denyB.length, ok: denyB.length === 0 });
  rec.checks.push({ k: 'allow.gone', want: true, got: digB.gone, ok: digB.gone === true });
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

/* ---------- W-68 gold 链甲 armor 硬读数 ---------- */

async function hurtRead(srv) {
  const from = srv.all.length;
  srv.send(`etest hurt ${MOB_SEL} 9 ${BOT}`);
  const prot = await srv.waitFor(RE.prot, 7000, from);
  const dmg = await srv.waitFor(RE.dmg, 7000, from);
  const p = prot ? RE.prot.exec(prot) : null;
  const d = dmg ? RE.dmg.exec(dmg) : null;
  return {
    prot: p ? { target: p[1], src: p[2], natural: p[3], armor: p[4], potion: p[5], total: p[6], piercing: p[7], wear: p[8], raw: stripPrefix(prot) } : null,
    dmg: d ? { raw: d[3], armorIn: d[4], armorOut: d[5], absorption: d[6], final: d[7], rawLine: stripPrefix(dmg) } : null,
  };
}

async function pointW68(srv, bot, ctx) {
  const rec = { id: 'W-68', checks: [], observed: {} };
  await say(srv, 'MG-W68-BEGIN');
  srv.send(`etest level 35 ${BOT}`);
  await sleep(350);
  const mob = await ensureMob(srv, ctx.mobPos);
  rec.observed.mob = mob;
  const sets = {
    gold: [['slot.armor.head', 'etim:chain_helmet_gold'], ['slot.armor.chest', 'etim:chain_chestplate_gold'],
      ['slot.armor.legs', 'etim:chain_leggings_gold'], ['slot.armor.feet', 'etim:chain_boots_gold']],
    copper: [['slot.armor.head', 'etim:chain_helmet_copper'], ['slot.armor.chest', 'etim:chain_chestplate_copper'],
      ['slot.armor.legs', 'etim:chain_leggings_copper'], ['slot.armor.feet', 'etim:chain_boots_copper']],
  };
  const equip = async (set) => {
    for (const [slot, item] of set) srv.send(`replaceitem entity ${BOT} ${slot} ${item} 1 0`);
    await sleep(1000);
  };
  await equip(sets.gold);
  srv.send(`etest health 20 ${BOT}`);
  await sleep(400);
  const g = await hurtRead(srv);
  rec.observed.gold = g;
  rec.checks.push({ k: 'gold.protRow', want: 'armor=4.000', got: g.prot ? g.prot.armor : '(none)', ok: !!g.prot && g.prot.armor === '4.000' });
  await sleep(1300);
  await equip(sets.copper);
  srv.send(`etest health 20 ${BOT}`);
  await sleep(400);
  const c = await hurtRead(srv);
  rec.observed.copper = c;
  rec.checks.push({ k: 'copper.protRow', want: 'armor=5.000', got: c.prot ? c.prot.armor : '(none)', ok: !!c.prot && c.prot.armor === '5.000' });
  srv.send(`clear ${BOT}`);
  await sleep(300);
  rec.pass = rec.checks.every((c2) => c2.ok);
  return rec;
}

/* ---------- W-69 七处判据位（静态 + 运行期无 +1） ---------- */

function scanGuards() {
  const out = { mining: [], mixin: [], rustedRefs: 0 };
  for (const [file, label] of [[SRC_MINING, 'ETIMMining.java'], [SRC_MIXIN_SHEARS, 'MixinItemShears.java']]) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((l, i) => {
      if (/ETIMItemShearsRusted/.test(l)) out.rustedRefs++;
      if (/instanceof io\.github\.etim\.etim\.metal\.ETIMItemShears\b/.test(l)) {
        out[label === 'ETIMMining.java' ? 'mining' : 'mixin'].push(i + 1);
      }
    });
  }
  return out;
}

function pointW69(ev) {
  const scan = ev.guardScan;
  const rec = { id: 'W-69', checks: [], observed: scan };
  rec.checks.push({ k: 'mining.3spots', want: '3', got: scan.mining.length, ok: scan.mining.length === 3 });
  rec.checks.push({ k: 'mixin.4spots', want: '4', got: scan.mixin.length, ok: scan.mixin.length === 4 });
  rec.checks.push({ k: 'total.7', want: 7, got: scan.mining.length + scan.mixin.length, ok: scan.mining.length + scan.mixin.length === 7 });
  rec.checks.push({ k: 'rusted.refs0', want: 0, got: scan.rustedRefs, ok: scan.rustedRefs === 0 });
  const w65 = (ev.points || []).find((p) => p.id === 'W-65');
  const w66 = (ev.points || []).find((p) => p.id === 'W-66');
  const exact65 = !!w65 && w65.pass === true;
  const exact66 = !!w66 && w66.pass === true;
  rec.checks.push({ k: 'runtime.noDoubleWear', want: 'W-65 ∧ W-66 精确等值', got: `W65=${exact65} W66=${exact66}`, ok: exact65 && exact66 });
  rec.pass = rec.checks.every((c) => c.ok);
  return rec;
}

/* ============================ 主流程 ============================ */

const POINTS = ['W62', 'W63', 'W64', 'W65', 'W66', 'W67', 'W68', 'W69'];
const pick = (list) => (ONLY.length ? list.filter((x) => ONLY.includes(x)) : list);

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, stage: STAGE, only: ONLY, smoke: SMOKE,
    startedAt: new Date().toISOString(), workspace: ROOT,
    pins: {}, points: [], bootCount: 1,
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

  for (const k of ['devJar', 'relJar', 'srcJar', 'cfg', 'cfgClient', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', `HEAD=${head} crashBefore=${ev.pins.crashBefore} portBefore=${ev.pins.portBefore}`);
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.cfgClient.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch — refuse to run');
  if (!head.startsWith(PIN.head)) throw new Error('HEAD pin mismatch — refuse to run');

  const cfgText = fs.readFileSync(CFG, 'utf8');
  const cfgVal = (k) => {
    const m = new RegExp('^[ \\t]*[A-Z]:' + k + '=(\\S+)', 'm').exec(cfgText);
    return m ? m[1] : null;
  };
  ev.cfgFlags = {
    miningReform: cfgVal('miningReform'), miningDebugLog: cfgVal('miningDebugLog'),
    equipDebugLog: cfgVal('equipDebugLog'), damageDebugLog: cfgVal('damageDebugLog'),
    armorModelR196: cfgVal('armorModelR196'), craftingDebugLog: cfgVal('craftingDebugLog'),
    craftingTimer: cfgVal('craftingTimer'), foodDebugLog: cfgVal('foodDebugLog'),
  };
  log('config', JSON.stringify(ev.cfgFlags));
  for (const [k, v] of Object.entries(ev.cfgFlags)) {
    if (v !== 'true') throw new Error('cfg 前提键不中: ' + k + '=' + v + ' — refuse to run');
  }

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

  const srv = await startServer({ root: ROOT, tag: STAGE });
  let bot = null;
  try {
    const done = await waitReady(srv, STAGE);
    if (!done) throw new Error('server never reached Done( within 480s');
    ev.boot = {
      ready: stripPrefix(done.trim()), readyTs: logTime(done), readyIdx: srv.all.indexOf(done) + 1,
      modGather: srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null,
      levelLine: (srv.all.find((l) => /Preparing level "/.test(l)) || '').trim(),
      jarTask: srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l)),
      buildLine: (srv.all.find((l) => /BUILD SUCCESSFUL|BUILD FAILED/.test(l)) || '').trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8),
    };
    log('boot', `Done — ${ev.boot.ready} @ ${ev.boot.readyTs} (idx ${ev.boot.readyIdx})`);

    ev.bootRows = bootRows(srv);
    ev.guardScan = scanGuards();
    log('boot', 'reassert=' + JSON.stringify(ev.bootRows.reassert && ev.bootRows.reassert.n)
      + ' recipes=' + JSON.stringify(ev.bootRows.recipes) + ' gears=' + ev.bootRows.gears.length);
    log('guards', JSON.stringify(ev.guardScan));
    const missingGear = SHEARS.concat(GOLD_CHAIN).map((s) => s.reg).filter((r) => !gearOf(ev.bootRows.gears, r));
    if (missingGear.length) log('boot', 'WARN missing gear rows: ' + missingGear.join(','));

    bot = await connectBot();
    srv.send(`op ${BOT}`);
    await sleep(700);
    try { bot.setQuickBarSlot(0); } catch (e) { /* ignore */ }
    for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false', 'doDaylightCycle false',
      'naturalRegeneration false', 'randomTickSpeed 0', 'mobGriefing false', 'keepInventory true']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 18000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    await sleep(2000);

    const p0 = bot.entity.position;
    const geo = { bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z) };
    geo.dig = { x: geo.bx + 2, y: geo.by, z: geo.bz };
    geo.dig2 = { x: geo.bx + 2, y: geo.by, z: geo.bz + 2 };
    geo.dig3 = { x: geo.bx + 2, y: geo.by, z: geo.bz - 2 };
    geo.sheepPos = { x: geo.bx + 1.5, y: geo.by, z: geo.bz + 3.5 };
    geo.mobPos = { x: geo.bx + 3.5, y: geo.by, z: geo.bz + 2.5 };
    geo.tablePos = Vec3 ? new Vec3(geo.bx - 2, geo.by, geo.bz + 2) : { x: geo.bx - 2, y: geo.by, z: geo.bz + 2 };
    ev.geo = { bx: geo.bx, by: geo.by, bz: geo.bz, dig: geo.dig, dig2: geo.dig2, dig3: geo.dig3, sheepPos: geo.sheepPos, mobPos: geo.mobPos, table: { x: geo.bx - 2, y: geo.by, z: geo.bz + 2 } };
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    ev.arena = await buildArena(srv, geo);
    srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1600);
    let p1 = bot.entity.position;
    let grounded = Math.abs(p1.y - geo.by) < 0.9;
    if (!grounded) {
      srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1600);
      p1 = bot.entity.position;
      grounded = Math.abs(p1.y - geo.by) < 0.9;
    }
    ev.posAfterTp = { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2), z: +p1.z.toFixed(2) };
    ev.grounded = grounded;
    log('setup', `pos=(${ev.posAfterTp.x},${ev.posAfterTp.y},${ev.posAfterTp.z}) grounded=${grounded} table=${JSON.stringify(ev.arena)}`);
    if (!grounded) throw new Error('bot not grounded on the harness platform');

    const ctx = { geo, tablePos: geo.tablePos, dig: geo.dig, dig2: geo.dig2, dig3: geo.dig3, sheepPos: geo.sheepPos, mobPos: geo.mobPos };
    for (const id of pick(POINTS)) {
      let rec;
      try {
        if (id === 'W62') rec = pointW62(ev);
        else if (id === 'W63') rec = pointW63(ev);
        else if (id === 'W69') rec = pointW69(ev);
        else {
          srv.send(`gamemode 0 ${BOT}`);
          srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
          await sleep(320);
          if (id === 'W64') rec = await pointW64(srv, bot, ctx);
          else if (id === 'W65') rec = await pointW65(srv, bot, ctx);
          else if (id === 'W66') rec = await pointW66(srv, bot, ctx);
          else if (id === 'W67') rec = await pointW67(srv, bot, ctx);
          else if (id === 'W68') rec = await pointW68(srv, bot, ctx);
        }
      } catch (e) {
        rec = { id, fatal: (e && e.stack) || String(e), checks: [], pass: false };
        log(id, 'FATAL', rec.fatal);
      }
      ev.points.push(rec);
      log(id || rec.id, rec.pass ? 'PASS' : 'FAIL', JSON.stringify((rec.checks || []).filter((c) => !c.ok)).slice(0, 600));
    }

    ev.rowCounts = {
      gear: ev.bootRows.gears.length,
      decayBreaking: srv.all.filter((l) => RE.decay.test(l) && /face=breaking/.test(l)).length,
      decayShearing: srv.all.filter((l) => RE.decay.test(l) && /face=shearing/.test(l)).length,
      deny: srv.all.filter((l) => RE.deny.test(l)).length,
      prot: srv.all.filter((l) => RE.prot.test(l)).length,
      complete: srv.all.filter((l) => /\[CraftingLog\].*COMPLETE /.test(l)).length,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
      stepHurt: srv.all.filter((l) => /\[TestLog\] step=hurt/.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));
  } catch (e) {
    ev.fatal = (e && e.stack) || String(e);
    log('main', 'FATAL', ev.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1000);
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
    ev.cfgClose = { bytes: cfgBack.length, sha: sha256(cfgBack), identical: sha256(cfgBack) === PIN.cfg.sha && cfgBack.length === PIN.cfg.bytes };
    ev.cfgClientClose = { bytes: cfgCBack.length, sha: sha256(cfgCBack), identical: sha256(cfgCBack) === PIN.cfgClient.sha && cfgCBack.length === PIN.cfgClient.bytes };
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
    ev.pinsAfter = {
      devJar: pinOf(DEVJAR, PIN.dev, 'dev'),
      relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'),
      mk: mkCounts(),
    };
    ev.jarUpToDate = ((ev.boot && ev.boot.jarTask) || []).filter((l) => /UP-TO-DATE/.test(l)).length === 3;
  }

  const pts = ev.points;
  ev.ledger = {
    ran: pts.length,
    pass: pts.filter((p) => p.pass).length,
    fail: pts.filter((p) => !p.pass).length,
    failedIds: pts.filter((p) => !p.pass).map((p) => p.id),
  };
  const infraOk = ev.rowCounts && ev.rowCounts.mixinFail === 0
    && ev.pinsAfter && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.srcJar.ok
    && ev.pinsAfter.mk.ok && ev.portAfter === 0
    && ev.crashAfter === ev.pins.crashBefore
    && ev.jarUpToDate && ev.worldRemoved === true && ev.buildSuccessful === true
    && ev.cfgClose && ev.cfgClose.identical
    && ev.cfgClientClose && ev.cfgClientClose.identical
    && ev.propsClose && ev.propsClose.identical;
  ev.verdict = SMOKE
    ? (infraOk && !ev.fatal ? 'SMOKE-OK' : 'SMOKE-FAIL')
    : ((pts.length === 8 && pts.every((p) => p.pass) && infraOk) ? 'PASS' : 'FAIL');
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of pts) log(p.id, p.pass ? 'PASS' : 'FAIL');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'FAIL' ? 1 : 0);
}

main().catch((e) => { log('boot', 'FATAL:', (e && e.stack) || e); process.exit(1); });

