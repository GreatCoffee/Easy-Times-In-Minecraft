#!/usr/bin/env node
/**
 * effectiveset-w45.js — effectiveset 批（C-6 有效集建模 · 案 C）W-45 a-l 判窗驱动
 *
 * 判据源（秤上唯一判据，两条通道）：
 *   1) `[MiningLog] tool decay face=breaking item=<reg> block=<b> loss=<N> [server]`
 *      —— `ETIMMining.getToolDecayFromBreakingBlock`（mining/ETIMMining.java:266-286）
 *      → `logToolDecay`（:743-760）；去重键 `breaking|<item>|<block>`、sig=loss。
 *   2) `[MiningLog] mine deny grade=<g> required=<r> item=<id> block=<id> [server]`
 *      —— `logGradeDeny`（:705-720）；**只在 in-set 且 grade 不足时发行**；
 *      集合不命中静默零行（D-2(a) 条 182-184）。
 *
 * ★案 C（commit d8e1e49）语义：
 *   `isEffectiveAgainstBlock` 改为「手持工具自身 R196 类」（`ownToolClass` :613-628）
 *   决定集合（`r196SetAdmits` :643-666 = materials ∪ blocks），不再拿方块的
 *   harvestTool 当自身类（C-6 根因）；set-miss 静默（D-2(a)）；等级拒只在 in-set 发行。
 *
 * ★loss 公式（:280-281，终审 §三）：
 *   loss = max( max((int)(hardness × 100 × baseDecay), (int)(100×baseDecay/20)), 1 )
 *   baseDecay：pickaxe 1.0 / shovel 0.5 / axe 1.0（sandstone 1.875）/ mattock 0.4 / sword 2.0
 *   hardness 取 R196 表（:87-155）：stone 2.4 / dirt 0.5 / sand 0.4 / log 1.2 /
 *   sandstone 0.8 / clay 0.8 / glass 2.0 / ice 1.0 / reeds 0.08 / obsidian 2.4 / leaves 0.2(vanilla)
 *
 * ★str 门（:277 `getCurrentPlayerStrVsBlock(...) <= 1.0F ⇒ loss=0`）：
 *   - 集合命中：str = 4.0 × efficiency × (1 + expLevel×0.02)（:215/:248）
 *   - 集合不命中：递归到无工具支（:225）⇒ str = requiresTool ? 0 : 1.0，再乘等级加成
 *   ⇒ **loss=0 行（e/k）必须 expLevel=0**（否则 1×(1+35×0.02)=1.7 > 1 ⇒ 走公式 loss≠0）。
 *   ⇒ 破块点用 expLevel=35 加速（R196 进度 = str/(hardness×512) 每 tick）。
 *
 * 通道：`/etest dig <x> <y> <z> [player]`（CommandDevTest.java:514-522 →
 *   harness/TestDriver.java:97-103：START 立即、STOP 于 DIG_HOLD_TICKS=40；
 *   TestDriver.java:59-68 实测模型：progress<0.7 时服务端越过 STOP 继续充能至 1.0）。
 *   破块完成由 `testforblock … minecraft:air` 轮询复钉；未破点复钉方块仍在。
 *
 * ★单 boot 全判：a-l 各点 item×block 键互异（last-sig 键 face|item|block 不互吞；
 *   j 与 g3 同 block 不同 item ⇒ 键异）。
 *
 * 用法：node effectiveset-w45.js [tag]
 *   W45_MODE=buddy|window|all（默认 all：先 buddy boot 落基线，再判窗 boot）
 *   W45_ONLY=W-45a,W-45b（裁剪判点，冒烟用）
 *   W45_STAGE=<tag 前缀>（服务端 .out 名隔离）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'effectiveset-w45';
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
const WORLD = 'effectivesetw45';
const WORLD_BUDDY = 'effectivesetw45buddy';
const PORT = 25565;
const OFF_X = 2;

/** 起收钉（主会话 W-45 任务书 · HEAD d8e1e49；纯测试批＝窗内零码改零提交零 build）。 */
const PIN = {
  head: 'd8e1e49',
  rel: { bytes: 775235, sha: '20047D59FC87D9C89AECDA86C43FA1EF2421237581E4E0E5ACFDE072DC30739C' },
  dev: { bytes: 759437, sha: '68B0E4653AC2235C82BDBBE6B542460B10DD23AB96D08A8627600FD92C80686E' },
  src: { bytes: 703167, sha: '60015654CD1043F8EF3CDF6886E3D326723401B0015D3FB8FA74F09F410E1D10' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30277, sha: 'E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉（窗内 refmap / mixins 清单零动；139/57/11 出现＝异常停窗）。 */
const MK_PIN = { mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138, sword: 4, tool: 4, shears: 3 };

const PICK = 'etim:pickaxe_copper';   // grade 2 / efficiency 3.0 / pickaxe 1.0
const MAT = 'etim:mattock_copper';    // grade 2 / mattock 0.4（shovel 集）
const SHOV = 'etim:shovel_copper';    // grade 2 / shovel 0.5
const AXE = 'etim:axe_copper';        // grade 2 / axe 1.0（sandstone 1.875）

const row = (item, block, loss) => ({ face: 'breaking', item, block, loss });
const denyRow = (grade, required, item, block) => ({ grade, required, item, block });

const P = (o) => Object.assign({
  arena: 'plain', level: 35, expectBreak: true, rows: [], deny: [], waitMs: 15000,
}, o);

/**
 * 判点表（a-l；f/g/h 各 3-4 子格）。`rows` 空数组＝期望 0 条 breaking；
 * `deny` 空数组＝期望 0 条 deny。
 */
const POINTS = [
  P({ id: 'W-45a', item: PICK, block: 'minecraft:stone', rows: [row(PICK, 'stone', 240)],
    note: '铜镐×stone：通道活性/公式在位 —— 恰 1 条 loss=240（2.4×100×1.0）＋deny 0' }),

  P({ id: 'W-45b', item: MAT, block: 'minecraft:stone', expectBreak: false,
    note: '★C-6 主判点 铜mattock×stone：set-miss ⇒ 0 条 breaking＋方块仍在＋deny 0（静默负证）' }),
  P({ id: 'W-45c', item: SHOV, block: 'minecraft:stone', expectBreak: false,
    note: '铜shovel×stone：同 b（0 行＋方块在＋deny 0）' }),
  P({ id: 'W-45d', item: AXE, block: 'minecraft:stone', expectBreak: false,
    note: '铜axe×stone：同 b（0 行＋方块在＋deny 0）' }),

  P({ id: 'W-45e', item: PICK, block: 'minecraft:dirt', level: 0, waitMs: 50000,
    rows: [row(PICK, 'dirt', 0)], note: '★形状② 铜镐×dirt（expLevel=0 ⇒ str=1.0≤1）：破块完成＋恰 1 条 loss=0（set-miss ∧ !requiresTool）＋deny 0' }),

  P({ id: 'W-45f1', item: MAT, block: 'minecraft:dirt', rows: [row(MAT, 'dirt', 20)],
    note: '回归四格 mattock×dirt：loss=20' }),
  P({ id: 'W-45f2', item: MAT, block: 'minecraft:sand', rows: [row(MAT, 'sand', 16)],
    note: '回归四格 mattock×sand：loss=16' }),
  P({ id: 'W-45f3', item: SHOV, block: 'minecraft:dirt', rows: [row(SHOV, 'dirt', 25)],
    note: '回归四格 shovel×dirt：loss=25' }),
  P({ id: 'W-45f4', item: SHOV, block: 'minecraft:sand', rows: [row(SHOV, 'sand', 20)],
    note: '回归四格 shovel×sand：loss=20' }),

  P({ id: 'W-45g1', item: AXE, block: 'minecraft:reeds', arena: 'reeds', rows: [row(AXE, 'reeds', 8)],
    note: '集合正位回归 axe×reeds：loss=8（0.08×100，走方块集非空类支）' }),
  P({ id: 'W-45g2', item: AXE, block: 'minecraft:log', rows: [row(AXE, 'log', 120)],
    note: '集合正位回归 axe×log：loss=120（1.2×100，R196 语义面）' }),
  P({ id: 'W-45g3', item: AXE, block: 'minecraft:sandstone', rows: [row(AXE, 'sandstone', 150)],
    note: '集合正位回归 axe×sandstone：loss=150（0.8×187.5）' }),

  P({ id: 'W-45h1', item: AXE, block: 'minecraft:clay', rows: [row(AXE, 'clay', 80)],
    note: '案 C 新正向 axe×clay：loss=80（硬化黏土走 AXE BLOCK 集）' }),
  P({ id: 'W-45h2', item: AXE, block: 'minecraft:glass', rows: [row(AXE, 'glass', 200)],
    note: '案 C 新正向 axe×glass：loss=200（2.0×100）' }),
  P({ id: 'W-45h3', item: AXE, block: 'minecraft:ice', rows: [row(AXE, 'ice', 100)],
    // 1.12 BlockIce.onPlayerDestroy 把冰换成流动水（vanilla），故破后复钉用「冰已不在」负证，
    // 破完再 fill 净空（防残留水进入 str 环境罚污染后续点）。
    after: { block: 'minecraft:ice', found: false }, cleanupFill: true,
    note: '案 C 新正向 axe×ice：loss=100（1.0×100）；破后冰→水（vanilla），复钉以「冰已不在」负证' }),

  // i 面「vanilla 木/石工具灰区」实录格：木镐 grade 0 在 pickaxe 集合内（stone 属 ROCK），
  // 等级不足 ⇒ in-set 等级拒出 deny 行（不是 set-miss 静默）。只记录，不另立判点。
  P({ id: 'W-45i1', item: 'minecraft:wooden_pickaxe', block: 'minecraft:stone', expectBreak: false,
    deny: [denyRow(0, 2, 'minecraft:wooden_pickaxe', 'stone')], recordOnly: true,
    note: 'i 面实录格 vanilla 木镐×stone：mine deny grade=0 required=2 恰 1 条＋breaking 0（in-set 等级拒，非 set-miss）' }),

  P({ id: 'W-45j', item: 'minecraft:iron_axe', block: 'minecraft:sandstone', rows: [row('minecraft:iron_axe', 'sandstone', 150)],
    note: '★案 C 主判点 vanilla iron axe×sandstone：恰 1 条 loss=150＋deny 0（改前=挖不动 deny，改后=150）' }),
  P({ id: 'W-45k', item: 'minecraft:iron_pickaxe', block: 'minecraft:leaves', level: 0, waitMs: 30000,
    rows: [row('minecraft:iron_pickaxe', 'leaves', 0)],
    note: '★空类支收口 vanilla iron pickaxe×leaves（expLevel=0）：恰 1 条 loss=0＋deny 0（改前=误放行 20）' }),
  P({ id: 'W-45l', item: PICK, block: 'minecraft:obsidian', expectBreak: false,
    deny: [denyRow(2, 3, PICK, 'obsidian')],
    note: '★等级拒正证 铜镐×obsidian：mine deny grade=2 required=3 恰 1 条＋breaking 0（in-set 等级拒非静默）' }),
];

const MODE = (process.env.W45_MODE || 'all').trim();
const ONLY = (process.env.W45_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const STAGE = (process.env.W45_STAGE || TAG).trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const RE = {
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  speed: /\[MiningLog\] mine speed item=(\S+) block=(\S+) str=([-\d.]+)/,
  deny: /\[MiningLog\] mine deny grade=(-?\d+) required=(-?\d+) item=(\S+) block=(\S+)/,
  shearDrop: /\[MiningLog\] shear drop/,
  reachDeny: /reach denied: (\S+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
  found: /Successfully found the block/i,
  notFound: /The block at/i,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  holdReceipt: /\[EtimTest\] commands\.etest\.hold_set player=/,
};

/* ===================== 机械核讫小件 ===================== */

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

/** MK 四值（refmap 双树 / mixins 清单 / 三切片）——139/57/11 出现即异常。 */
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
    && out.manifest.mixins === MK_PIN.mixins
    && out.manifest.client === MK_PIN.client;
  return out;
}

/* ===================== 服务端读数 ===================== */

function botDur(bot) {
  const it = bot && bot.heldItem;
  if (!it) return null;
  return {
    damage: it.durabilityUsed === undefined ? null : it.durabilityUsed,
    name: it.name,
    id: it.type,
    count: it.count,
    max: it.maxDurability,
  };
}

/** 面板读数落定：连续两次同值即返（避免窗口同步延迟把 Δ 读小）。 */
async function botDurSettled(bot) {
  let prev = botDur(bot);
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    const cur = botDur(bot);
    if (cur && prev && cur.damage === prev.damage) return cur;
    prev = cur;
  }
  return prev;
}

let HOLDER_NAME = null;

/** fresh 栈：`/etest hold <item> <player>` ＋ `[EtimTest] hold_set` 回执 ＋ bot 面板对账。 */
async function holdItem(srv, bot, item) {
  if (!HOLDER_NAME) throw new Error('holdItem: HOLDER_NAME not set');
  const vanilla = item.startsWith('minecraft:');
  const shortName = item.replace(/^minecraft:/, '');
  for (let attempt = 0; attempt < 4; attempt++) {
    const from = srv.all.length;
    srv.send(`etest hold ${item} ${HOLDER_NAME}`);
    const receipt = await srv.waitFor(RE.holdReceipt, 5000, from);
    for (let k = 0; k < 12; k++) {
      await sleep(160);
      const it = botDur(bot);
      const fresh = !!it && (it.damage === 0 || it.damage === null);
      const named = !vanilla || (!!it && it.name === shortName);
      if (receipt && fresh && named) return { receipt: stripPrefix(receipt), bot: it, attempts: attempt + 1 };
    }
  }
  throw new Error(`hold ${item} failed — hold_set 回执/bot 面板未对上`);
}

/* ===================== 摆场 ===================== */

/** 甘蔗摆场（BlockReed.canPlaceBlockAt：下格沙 + 下格水平四邻有水）——W-35 同款。 */
async function placeReedsPot(srv, rec, BX, BY, BZ, p) {
  const WX = BX - 1;
  const SY = BY - 1;
  const steps = [
    `setblock ${BX} ${SY - 1} ${BZ} minecraft:stone 0`,
    `setblock ${WX} ${SY - 1} ${BZ} minecraft:stone 0`,
    `setblock ${WX - 1} ${SY} ${BZ} minecraft:stone 0`,
    `setblock ${WX} ${SY} ${BZ - 1} minecraft:stone 0`,
    `setblock ${WX} ${SY} ${BZ + 1} minecraft:stone 0`,
    `setblock ${BX} ${SY} ${BZ} minecraft:sand 0`,
    `setblock ${BX} ${BY} ${BZ} minecraft:air 0`,
    `setblock ${BX} ${BY + 1} ${BZ} minecraft:air 0`,
    `setblock ${WX} ${BY} ${BZ} minecraft:air 0`,
    `setblock ${WX} ${SY} ${BZ} minecraft:water 0`,
  ];
  for (const s of steps) { srv.send(s); await sleep(90); }
  await sleep(400);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} 0`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(500);
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} ${p.block} 0`);
  rec.blockPresentLine = stripPrefix((await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, tbFrom)) || '');
  const wFrom = srv.all.length;
  srv.send(`testforblock ${WX} ${SY} ${BZ} minecraft:water 0`);
  rec.waterLine = stripPrefix((await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, wFrom)) || '');
}

/** 素土摆场（W-34/W-43 形状）：air 清位 → setblock 目标 → testforblock 复钉。 */
async function placePlain(srv, rec, X, Y, Z, p) {
  srv.send(`setblock ${X} ${Y} ${Z} minecraft:air 0`);
  await sleep(220);
  const setFrom = srv.all.length;
  srv.send(`setblock ${X} ${Y} ${Z} ${p.block} 0`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(420);
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${X} ${Y} ${Z} ${p.block} 0`);
  rec.blockPresentLine = stripPrefix((await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, tbFrom)) || '');
}

async function placeTarget(srv, rec, X, Y, Z, p) {
  if (p.arena === 'reeds') return placeReedsPot(srv, rec, X, Y, Z, p);
  return placePlain(srv, rec, X, Y, Z, p);
}

/* ===================== 挖掘与轮询 ===================== */

/**
 * 轮询目标格状态：`want` 为方块名，`expectFound` 为期望命中/不命中。
 * testforblock 逐轮落命回执行，是「三读」的第三读。
 */
async function pollBlock(srv, X, Y, Z, want, timeoutMs, expectFound) {
  const t0 = Date.now();
  const tries = [];
  while (Date.now() - t0 < timeoutMs) {
    const from = srv.all.length;
    srv.send(`testforblock ${X} ${Y} ${Z} ${want}`);
    const line = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, from);
    const found = !!line && RE.found.test(line);
    tries.push({ atMs: Date.now() - t0, want, line: stripPrefix(line || ''), found });
    if (found === expectFound) return { ok: true, found, tries, ms: Date.now() - t0 };
    await sleep(1000);
  }
  return { ok: false, found: !expectFound, tries, ms: Date.now() - t0 };
}

/** 一次 dig 往返：START/STOP 回执 → 轮询目标格 → 返回段起点。 */
async function digOnce(srv, botName, X, Y, Z, p, rec, geo) {
  const from = srv.all.length;
  srv.send(`etest dig ${X} ${Y} ${Z} ${botName}`);
  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  // 破块点默认复钉 air；未破点复钉方块仍在；ice 由 1.12 BlockIce 换成水 ⇒ 用「冰已不在」负证。
  const after = p.after || (p.expectBreak ? { block: 'minecraft:air', found: true } : { block: p.block, found: true });
  if (!p.expectBreak) await sleep(5000);   // 未破点：给足进度窗口后再复钉
  const state = await pollBlock(srv, X, Y, Z, after.block, p.waitMs, after.found);
  if (p.cleanupFill) {
    // 冰→水（vanilla）：破完净空竞技场内腔，防残留水进 str 环境罚污染后续点。
    srv.send(`fill ${geo.bx - 2} ${geo.by} ${geo.bz - 2} ${geo.bx + 2} ${geo.by + 1} ${geo.bz + 2} minecraft:air 0`);
    await sleep(600);
  }
  await sleep(400);
  return {
    from,
    digStart: ds ? stripPrefix(ds) : null,
    digStop: dp ? stripPrefix(dp) : null,
    afterSpec: after,
    state,
    blockAfterOk: state.ok,
  };
}

/* ===================== 判行解析 ===================== */

function rowsOf(seg) {
  return seg.filter((l) => RE.decay.test(l)).map((l) => {
    const m = RE.decay.exec(l);
    return { face: m[1], item: m[2], block: m[3] || null, loss: +m[4], hasBlockCol: /\sblock=/.test(l) };
  });
}

function deniesOf(seg) {
  return seg.filter((l) => RE.deny.test(l)).map((l) => {
    const m = RE.deny.exec(l);
    return { grade: +m[1], required: +m[2], item: m[3], block: m[4] };
  });
}

function speedsOf(seg) {
  return seg.filter((l) => RE.speed.test(l)).map((l) => {
    const m = RE.speed.exec(l);
    return { item: m[1], block: m[2], str: +m[3] };
  });
}

/* ===================== 判点执行 ===================== */

async function runPoint(srv, bot, botName, p, geo) {
  HOLDER_NAME = botName;
  const X = geo.bx + OFF_X;
  const Y = geo.by;
  const Z = geo.bz;
  const rec = {
    id: p.id, note: p.note, item: p.item, block: p.block, arena: p.arena, recordOnly: !!p.recordOnly,
    expect: { rows: p.rows, deny: p.deny, expectBreak: p.expectBreak, level: p.level },
    at: { x: X, y: Y, z: Z },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item} x ${p.block}`);

  srv.send('kill @e[type=item]');
  await sleep(300);

  // expLevel 面：loss=0 点必须 0（str 门 ≤1.0），破块点用 35 加速。
  srv.send(`etest level ${p.level} ${botName}`);
  await sleep(600);
  rec.levelSet = p.level;

  const hold = await holdItem(srv, bot, p.item);
  rec.holdReceipt = hold.receipt;
  rec.holdAttempts = hold.attempts;
  rec.heldAfterHold = hold.bot;

  await placeTarget(srv, rec, X, Y, Z, p);

  const b0 = await botDurSettled(bot);
  rec.botBefore = b0;

  // 落地/位置复钉（!onGround ⇒ str/5，污染 str 门与进度）
  for (let k = 0; k < 3; k++) {
    const pos = bot.entity.position;
    if (bot.entity.onGround !== false && Math.abs(pos.y - geo.by) < 0.8) break;
    srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1300);
  }
  rec.posBeforeDig = {
    x: +bot.entity.position.x.toFixed(2), y: +bot.entity.position.y.toFixed(2),
    z: +bot.entity.position.z.toFixed(2), onGround: bot.entity.onGround,
  };

  const dig = await digOnce(srv, botName, X, Y, Z, p, rec, geo);
  rec.dig = dig;

  const b1 = await botDurSettled(bot);
  rec.botAfter = b1;

  const seg = srv.all.slice(dig.from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.rows = rowsOf(seg);
  rec.denyRaw = seg.filter((l) => RE.deny.test(l)).map((l) => l.trim());
  rec.denies = deniesOf(seg);
  rec.speedRows = speedsOf(seg);
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);

  const dmg = (x) => (x && x.damage !== null && x.damage !== undefined ? x.damage : null);
  rec.durDelta = dmg(b1) !== null && dmg(b0) !== null ? dmg(b1) - dmg(b0) : null;

  const blockPath = p.block.split(':').pop();

  const rowsOk = rec.rows.length === p.rows.length && rec.rows.every((r, i) => {
    const w = p.rows[i];
    return r.face === w.face && r.item === w.item && r.block === w.block && r.loss === w.loss
      && (w.block === null || r.hasBlockCol);
  });
  const deniesOk = rec.denies.length === p.deny.length && rec.denies.every((d, i) => {
    const w = p.deny[i];
    return d.grade === w.grade && d.required === w.required && d.item === w.item && d.block === w.block;
  });

  rec.checks = {
    holdReceipt: !!rec.holdReceipt,
    placed: /Block placed/i.test(rec.placedLine || ''),
    blockPresentBefore: RE.found.test(rec.blockPresentLine || ''),
    water: p.arena === 'reeds' ? RE.found.test(rec.waterLine || '') : true,
    digsComplete: !!(dig.digStart && dig.digStop),
    blockAfter: dig.blockAfterOk === true,
    rowsMatch: rowsOk,
    deniesMatch: deniesOk,
    noReachDeny: rec.reachDenies.length === 0,
    // 破块点：行形必须有 block= 列（与值匹配独立的单读）
    lineForm: p.rows.length === 0 ? true : rec.rows.every((r) => r.hasBlockCol),
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.length + ' [' + rec.rows.map((r) => r.item + '/' + r.block + ':' + r.loss).join(' ')
    + '] deny=[' + rec.denies.map((d) => d.grade + '/' + d.required + ' ' + d.block).join(' ') + ']'
    + ' blockAfter=' + dig.blockAfterOk + ' durΔ=' + rec.durDelta
    + ' str=' + (rec.speedRows.map((s) => s.str).join(',') || '-')
    + ' wait=' + dig.state.ms + 'ms');
  return rec;
}

/* ===================== 相位 ===================== */

async function connectBot(botName) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const b = await createHarnBot({ host: '127.0.0.1', port: PORT, username: botName });
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

/** 封闭竞技场（石圈墙家族）：7×7 土台 + 周圈石墙（by..by+2）+ 内部净空。 */
async function buildArena(srv, geo) {
  const R = 3;
  for (let dx = -R - 1; dx <= R + 1; dx++) {
    for (let dz = -R - 1; dz <= R + 1; dz++) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:dirt 0`);
      for (const dy of [0, 1, 2]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
      }
    }
  }
  for (let i = -R; i <= R; i++) {
    for (const [dx, dz] of [[i, -R], [i, R], [-R, i], [R, i]]) {
      for (const dy of [0, 1, 2]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:stone 0`);
      }
    }
  }
  await sleep(1800);
}

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const botName = opts.bot;
  const srv = await startServer({ root: ROOT, tag });
  const phase = { tag, bot: botName, label: opts.label, key: opts.key, world: opts.world, points: [] };
  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = stripPrefix(done.trim());
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;

    if (!points.length) {
      // buddy boot：只落基线（未必起 bos），停服。
      phase.buddyOnly = true;
      log(tag, 'buddy boot Done — no bot, baseline only');
    } else {
      bot = await connectBot(botName);
      await sleep(2000);

      srv.send(`op ${botName}`);
      srv.send('gamerule doMobSpawning false');
      srv.send('gamerule doMobLoot false');
      srv.send('gamerule doTileDrops false');
      srv.send('gamerule doDaylightCycle false');
      srv.send('gamerule naturalRegeneration false');
      srv.send('gamerule randomTickSpeed 0');
      srv.send('gamerule mobGriefing false');
      srv.send('difficulty 2');
      srv.send('time set 6000');
      srv.send('weather clear');
      srv.send('kill @e[type=!player]');
      srv.send(`gamemode 0 ${botName}`);
      srv.send(`effect ${botName} clear`);
      srv.send(`etest food 20 20 ${botName}`);
      srv.send(`etest level 35 ${botName}`);
      await sleep(1200);
      srv.send(`etest health 20 ${botName}`);
      await sleep(800);

      const p0 = bot.entity.position;
      const geo = {
        bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z),
        spawn: { x: p0.x, y: p0.y, z: p0.z },
      };
      phase.geo = geo;
      log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
      await buildArena(srv, geo);
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
      phase.posAfterTp = { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2), z: +p1.z.toFixed(2) };
      phase.grounded = grounded;
      log('setup', `pos after tp=(${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}) grounded=${grounded}`);
      if (!grounded) throw new Error('bot not grounded on the harness platform');

      for (const p of points) {
        let rec;
        try {
          rec = await runPoint(srv, bot, botName, p, geo);
        } catch (e) {
          rec = { id: p.id, fatal: e && e.stack ? e.stack : String(e), pass: false };
          log(p.id, 'FATAL', rec.fatal);
        }
        phase.points.push(rec);
      }

      const allRows = rowsOf(srv.all);
      phase.decayAll = srv.all.filter((l) => RE.decay.test(l)).map((l) => l.trim());
      phase.speedAll = srv.all.filter((l) => RE.speed.test(l)).map(stripPrefix);
      phase.denyAll = srv.all.filter((l) => RE.deny.test(l)).map(stripPrefix);
      phase.rowCounts = {
        attacking: allRows.filter((r) => r.face === 'attacking').length,
        shearing: allRows.filter((r) => r.face === 'shearing').length,
        breaking: allRows.filter((r) => r.face === 'breaking').length,
        speed: srv.all.filter((l) => RE.speed.test(l)).length,
        deny: srv.all.filter((l) => RE.deny.test(l)).length,
        shearDrop: srv.all.filter((l) => RE.shearDrop.test(l)).length,
        reachDenied: srv.all.filter((l) => RE.reachDeny.test(l)).length,
      };
      phase.breakingRows = allRows.filter((r) => r.face === 'breaking');
      log(tag, 'rowCounts', JSON.stringify(phase.rowCounts));
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
      phase.logSnapshotError = String((e && e.message) || e);
    }
    ev.phases.push(phase);
  }
  return phase;
}

/* ===================== 主流程 ===================== */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: MODE, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [] };

  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  ev.pins.cfg = pinOf(CFG, PIN.cfg, 'cfg');
  ev.pins.cfgClient = pinOf(CFG_CLIENT, PIN.cfgClient, 'cfgClient');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  ev.pins.mk = mkCounts();
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  for (const k of ['devJar', 'relJar', 'srcJar', 'cfg', 'cfgClient', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.cfgClient.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch (139/57/11 出现＝异常停窗) — refuse to run');
  if (!head.startsWith(PIN.head)) throw new Error('HEAD pin mismatch — refuse to run');

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);
  log('pin', `crashBefore=${ev.pins.crashBefore} portBefore=${ev.pins.portBefore}`);

  ev.cfgSnapshot = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.cfgClientSnapshot = snapshot(CFG_CLIENT, TAG + '-client-etim.cfg.before');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }

  const points = ONLY.length ? POINTS.filter((p) => ONLY.includes(p.id)) : POINTS;
  const doBuddy = MODE === 'buddy' || MODE === 'all';
  const doWindow = MODE === 'window' || MODE === 'all';

  let restoreOk = false;
  try {
    if (doBuddy) {
      let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_BUDDY);
      if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
      fs.writeFileSync(PROPS, propEdit, 'utf8');
      ev.propsWindowBuddy = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
      log('config', `level-name -> ${WORLD_BUDDY} / spawn-protection -> 0`);
      // cfg 零编辑（buddy 只验零新键预言）
      await runPhase({ key: 'buddy', tag: STAGE + '-buddy', bot: 'ETIM_W45B', label: 'buddy (baseline boot, no bot)', world: WORLD_BUDDY }, [], ev);
      ev.cfgAfterBuddy = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
      ev.cfgZeroNewKeyPrediction = ev.cfgAfterBuddy.sha === PIN.cfg.sha && ev.cfgAfterBuddy.bytes === PIN.cfg.bytes;
      log('config', 'after buddy boot: cfg ' + ev.cfgAfterBuddy.bytes + ' B ' + ev.cfgAfterBuddy.sha
        + ' ' + (ev.cfgZeroNewKeyPrediction ? '（零新键预言成立）' : '★漂移＝异常停窗'));
    }

    if (doWindow) {
      let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD);
      if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
      fs.writeFileSync(PROPS, propEdit, 'utf8');
      ev.propsWindow = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
      log('config', `level-name -> ${WORLD} / spawn-protection -> 0`);
      await runPhase({ key: 'a', tag: STAGE + '-a', bot: 'ETIM_W45A', label: 'A (miningReform=true, single boot, a-l)', world: WORLD }, points, ev);
    }
  } finally {
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(CFG_CLIENT, fs.readFileSync(ev.cfgClientSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const cfgCAfter = fs.readFileSync(CFG_CLIENT);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = { bytes: cfgAfter.length, sha: sha256(cfgAfter),
      identical: sha256(cfgAfter) === PIN.cfg.sha && cfgAfter.length === PIN.cfg.bytes };
    ev.cfgClientRestored = { bytes: cfgCAfter.length, sha: sha256(cfgCAfter),
      identical: sha256(cfgCAfter) === PIN.cfgClient.sha && cfgCAfter.length === PIN.cfgClient.bytes };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter),
      identical: sha256(propsAfter) === PIN.props.sha && propsAfter.length === PIN.props.bytes };
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical (pin, zero-edit)' : 'MISMATCH'));
    log('config', 'client cfg restored ' + (ev.cfgClientRestored.identical ? 'byte-identical (pin, untouched)' : 'MISMATCH'));
    log('config', 'server.properties restored ' + (ev.propsRestored.identical ? 'byte-identical (pin)' : 'MISMATCH'));
    restoreOk = ev.cfgRestored.identical && ev.cfgClientRestored.identical && ev.propsRestored.identical;

    ev.sideRestored = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideRestored[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
      log('config', name + ' restored ' + (ev.sideRestored[name].identical ? 'byte-identical' : 'MISMATCH'));
    }
    restoreOk = restoreOk && Object.values(ev.sideRestored).every((s) => s.identical);

    ev.worldsRemoved = {};
    for (const w of [WORLD, WORLD_BUDDY]) {
      const dir = path.join(ROOT, 'run', w);
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        ev.worldsRemoved[w] = !fs.existsSync(dir);
        log('cleanup', 'world dir removed: ' + w);
      } else {
        ev.worldsRemoved[w] = true;
      }
    }
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = {
      devJar: pinOf(DEVJAR, PIN.dev, 'dev'),
      relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'),
      mk: mkCounts(),
    };
    ev.jarUpToDate = ev.phases.filter((p) => !p.buddyOnly).length > 0
      ? ev.phases.filter((p) => !p.buddyOnly).every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)))
      : ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
    ev.mixinErrors = ev.phases.flatMap((p) => p.mixinErrors || []);
  }

  // 计数总账（写死判）：breaking 恰 14；deny 恰 2（l 等级拒 + i1 木镐灰区实录）；attacking/shearing/shearDrop/reachDenied 全 0。
  const LEDGER_WANT = { breaking: 14, deny: 2, attacking: 0, shearing: 0, shearDrop: 0, reachDenied: 0 };
  ev.ledger = {};
  for (const ph of ev.phases) {
    if (ph.buddyOnly) {
      const got = { breaking: 0, deny: 0, attacking: 0, shearing: 0, shearDrop: 0, reachDenied: 0 };
      ev.ledger[ph.key] = { want: 'buddy: all zero', got, ok: true, sequence: [] };
      continue;
    }
    const got = ph.rowCounts || {};
    ev.ledger[ph.key] = {
      want: ONLY.length ? `cropped (${points.length} points)` : LEDGER_WANT,
      got,
      ok: ONLY.length ? true : got.breaking === LEDGER_WANT.breaking && got.deny === LEDGER_WANT.deny
        && got.attacking === 0 && got.shearing === 0 && got.shearDrop === 0 && got.reachDenied === 0,
      sequence: (ph.breakingRows || []).map((r) => `${r.item}/${r.block}:${r.loss}`),
      denySequence: (ph.denyAll || []).map((l) => stripPrefix(l)),
    };
  }
  const ledgerOk = Object.values(ev.ledger).every((l) => l.ok);

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = doWindow ? points.length : 0;

  ev.verdict = (allPoints.length === expectPoints
      && allPoints.every((p) => p.pass)
      && ledgerOk
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.srcJar.ok
      && ev.pinsAfter.mk.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate
      && ev.mixinErrors.length === 0
      && Object.values(ev.worldsRemoved).every(Boolean)
      && (!doBuddy || ev.cfgZeroNewKeyPrediction)) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of allPoints) log(p.id, p.pass ? 'PASS' : 'FAIL', p.checks ? JSON.stringify(p.checks) : '');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
