#!/usr/bin/env node
/**
 * offphase-w46.js — offphase 批（hoe off 相攻击磨损 = vanilla 1）W-46 判窗驱动
 *
 * 判据源（两条通道，纯服务端）：
 *   1) `[MiningLog] tool decay face=attacking item=<reg> loss=<N> [server]`
 *      —— `ETIMMining.getToolDecayFromAttackingEntity`（mining/ETIMMining.java:303-315）
 *      → `logToolDecay("attacking", held, null, loss)`（:743-760）；state=null ⇒ **无 block= 列**，
 *      去重键塌 `attacking|<item>`。
 *   2) `[MiningLog] tool decay face=breaking item=<reg> block=<b> loss=<N> [server]`
 *      —— `getToolDecayFromBreakingBlock`（:266-286）；去重键 `breaking|<item>|<block>`。
 *   deny 面：`[MiningLog] mine deny grade=<g> required=<r> item=<id> block=<id> [server]`
 *   （`logGradeDeny` :705-720）；mine speed 只作记录面（str=加成前值，B-1 家族）。
 *
 * ★判窗语义（批文 audit20 条 187/190）：
 *   `ETIMItemHoe.hitEntity`（metal/ETIMItemHoe.java:137-146）首插 off 门——
 *   `if (!ETIMConfig.miningReform) return super.hitEntity(...)`；
 *   super = 1.12 `ItemHoe.java:89-93` ⇒ `damageItem(1, attacker) + return true`。
 *   on 相（miningReform=true）= R196 攻击衰减 2.0（:461-463）⇒ loss=200；
 *   off 相 = vanilla 1（**不是** ItemTool 族的 2，也不是 0）。
 *   同批 off 支回归位：shears 破块/攻击（metal/ETIMItemShearsRusted.java:117/136）
 *   与 MixinItemShears 两条 redirect 的 off 支（mixins/MixinItemShears.java:46-49 / :85-88）。
 *
 * ★A 相（miningReform=true，零 cfg 编辑，单 boot 四点四键互异）：
 *   a hoe×猪(attack) → attacking loss=200 ＋ Δ200 ＋ deny 0
 *   b hoe×dirt(dig)  → breaking loss=100（0.5×100×2.0）＋ Δ100 ＋ deny 0
 *   c 锈剪×reeds(dig) → breaking loss=8（0.08×100×1.0）＋ Δ8 ＋ deny 0
 *   d 锈剪×猪(attack) → attacking loss=200（R196 shears 2.0）＋ Δ200 ＋ deny 0
 *
 * ★G 相（miningReform=false，driver 翻 cfg 后重启，单 boot 五点全零行）：
 *   e hoe×猪(attack)   → 0 行 ＋ Δ1（主证：vanilla ItemHoe.hitEntity damageItem(1)）
 *   f hoe×dirt(dig)    → 0 行 ＋ Δ0（onBlockDestroyed 门 → vanilla 无 override）
 *   g 锈剪×reeds(dig)  → 0 行 ＋ Δ1（MixinItemShears onBlockDestroyed off 支 +1）
 *   h 锈剪×猪(attack)  → 0 行 ＋ Δ0（ItemShears 无 hitEntity override → 无磨）
 *   k 锈剪×leaves(dig) → 0 行 ＋ Δ1 ＋ 块 air（onBlockStartBreak off 支 +1）
 *
 * last-sig 防呆：A 相四键 `attacking|hoe|` / `breaking|hoe|dirt` / `breaking|shears|reeds` /
 *   `attacking|shears|` 互异 ⇒ 单 boot 无吞行；G 相全零行 ⇒ 无吞行面。
 *
 * 通道：`/etest dig <x> <y> <z> [player]`（CommandDevTest.java:514-522 →
 *   harness/TestDriver.java:97-103，START 立即 / STOP 于 DIG_HOLD_TICKS=40；
 *   TestDriver.java:59-68：progress<0.7 时越过 STOP 继续充能至 1.0）；
 *   `/etest attack <selector> [player]`（CommandDevTest.java:499-506 →
 *   TestDriver.java:92-95/240-259：真实 CPacketUseEntity(ATTACK) → processUseEntity
 *   → attackTargetEntityWithCurrentItem → ItemStack.hitEntity；落 `[TestLog] step=attack`）。
 *   破块复钉走 `testforblock … minecraft:air`；攻击落点走 `[DamageLog] dmg … final=` 互证。
 *
 * 用法：node offphase-w46.js [tag]
 *   W46_MODE=buddy|a|g|all（默认 all：buddy 基线 → A 相 boot → G 相 boot＋cfg 还原）
 *   W46_ONLY=W-46a,W-46b（判点裁剪，冒烟用）
 *   W46_STAGE=<tag 前缀>（服务端 .out 名隔离）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'offphase-w46';
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
const WORLD_A = 'offphasew46a';
const WORLD_G = 'offphasew46g';
const WORLD_BUDDY = 'offphasew46buddy';
const PORT = 25565;
const OFF_X = 2;          // dig 目标相对竞技场中心水平偏移
const ATT_DX = 1.5;       // 猪相对竞技场中心的 x 偏移（1 格）

/** 起收钉（主会话 W-46 任务书 · HEAD 1fc134e；纯测试批＝窗内零码改零提交零 build）。 */
const PIN = {
  head: '1fc134e',
  rel: { bytes: 775263, sha: '22DC05D4C0FE5E3271016CDCEFAA8DC8FC5530DBFC6A0A62F3AC5D86F7A6C2A5' },
  dev: { bytes: 759459, sha: '8130C73845EBD76FAFAA5400DE9CFB15E33C40CEE62EE084CD510B4681429777' },
  src: { bytes: 703372, sha: '39CD6818A94A90982A6AC32BE4E74140E09324176E483FE6AD47B270DCE6CA6B' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30277, sha: 'E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉（窗内 refmap / mixins 清单零动；139/57/11 出现＝异常停窗）。 */
const MK_PIN = { mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138, sword: 4, tool: 4, shears: 3 };

const HOE = 'etim:hoe_copper';
const SH = 'etim:shears_rusted_iron';

/** 靶（W-42/b3-run 同形）：NoAI＋1000 血＋抗击退 ⇒ 不掉血致死、不被击退出 reach。 */
const PIG_NBT = '{NoAI:1b,Silent:1b,PersistenceRequired:1b,'
  + 'Attributes:[{Name:"generic.maxHealth",Base:1000.0},{Name:"generic.knockbackResistance",Base:1.0}],'
  + 'Health:1000.0f}';

const aRow = (item, loss) => ({ face: 'attacking', item, block: null, loss });
const bRow = (item, block, loss) => ({ face: 'breaking', item, block, loss });

const P = (o) => Object.assign({
  kind: 'dig', level: 35, arena: 'plain', blockAfter: 'air', waitMs: 20000,
  rows: [], deny: [], damageLog: null,
}, o);

/** A 相（miningReform=true 默认零编辑）——四点四键互异。 */
const A_POINTS = [
  P({ id: 'W-46a', kind: 'attack', item: HOE, expectDur: 200, rows: [aRow(HOE, 200)], damageLog: 1,
    note: 'on 相 铜锄×猪攻击：恰 1 条 attacking loss=200（R196 hoe 2.0）＋Δ200＋deny 0' }),
  P({ id: 'W-46b', kind: 'dig', item: HOE, block: 'minecraft:dirt', expectDur: 100,
    rows: [bRow(HOE, 'dirt', 100)],
    note: 'on 相 铜锄×dirt：恰 1 条 breaking loss=100（0.5×100×2.0）＋Δ100＋块 air＋deny 0' }),
  P({ id: 'W-46c', kind: 'dig', item: SH, block: 'minecraft:reeds', arena: 'reeds', potCleanup: true,
    expectDur: 8, rows: [bRow(SH, 'reeds', 8)],
    note: 'on 相 锈剪×reeds：恰 1 条 breaking loss=8（0.08×100×1.0）＋Δ8＋块 air＋deny 0' }),
  P({ id: 'W-46d', kind: 'attack', item: SH, expectDur: 200, rows: [aRow(SH, 200)], damageLog: 1,
    note: 'on 相 锈剪×猪攻击：恰 1 条 attacking loss=200（R196 shears 2.0）＋Δ200＋deny 0' }),
];

/** G 相（miningReform=false；五点全零行）——0 行 ⇒ 无 last-sig 吞行面。 */
const G_POINTS = [
  P({ id: 'W-46e', kind: 'attack', item: HOE, expectDur: 1, rows: [], damageLog: 1,
    note: '★主证 off 相 铜锄×猪攻击：0 行＋Δ1（第一插入门 → vanilla ItemHoe.hitEntity damageItem(1)）' }),
  P({ id: 'W-46f', kind: 'dig', item: HOE, block: 'minecraft:dirt', expectDur: 0, rows: [],
    note: 'off 相 铜锄×dirt：0 行＋Δ0＋块 air（onBlockDestroyed 门 → vanilla hoe 无 override）' }),
  P({ id: 'W-46g', kind: 'dig', item: SH, block: 'minecraft:reeds', arena: 'reeds', potCleanup: true,
    expectDur: 1, rows: [],
    note: 'off 相 锈剪×reeds：0 行＋Δ1＋块 air（MixinItemShears:46-49 off 支 vanilla +1）' }),
  P({ id: 'W-46h', kind: 'attack', item: SH, expectDur: 0, rows: [], damageLog: 1,
    note: 'off 相 锈剪×猪攻击：0 行＋Δ0（ItemShears 无 hitEntity override → 无磨）' }),
  P({ id: 'W-46k', kind: 'dig', item: SH, block: 'minecraft:leaves', expectDur: 1, rows: [],
    note: 'off 相 锈剪×leaves：0 行＋Δ1＋块 air（MixinItemShears:85-88 onBlockStartBreak off 支 +1）' }),
];

/** 计数总账（写死判；G 相 attacking/breaking/deny 全 0，speed 只记录）。 */
const LEDGER_WANT = {
  a: { attacking: 2, breaking: 2, deny: 0 },
  g: { attacking: 0, breaking: 0, deny: 0 },
};

const MODE = (process.env.W46_MODE || 'all').trim();
const ONLY = (process.env.W46_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const STAGE = (process.env.W46_STAGE || TAG).trim();
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);
const want = (k) => MODE === 'all' || MODE === k;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '').replace(/^\[Server[^\]]*\]\s*/, '');

const RE = {
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  speed: /\[MiningLog\] mine speed item=(\S+) block=(\S+) str=([-\d.]+)/,
  deny: /\[MiningLog\] mine deny grade=(-?\d+) required=(-?\d+) item=(\S+) block=(\S+)/,
  shearDrop: /\[MiningLog\] shear drop/,
  reachDeny: /reach denied: (\S+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  attackStep: /\[TestLog\] step=attack player=(\S+) target=(\S+)#(\d+)/,
  attackNoTarget: /\[TestLog\] step=attack .*NO_TARGET/,
  damageRow: /\[DamageLog\] dmg target=(\S+)#(\d+) .* final=([\d.-]+)/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
  summoned: /Summoned new|successfully summoned/i,
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

/** etim.cfg 的布尔键（`    B:miningReform=true` 形状；CRLF 保留）。 */
function setCfgBool(text, key, value) {
  const re = new RegExp('(^|\\r\\n)([ \\t]*B:' + key + '=)(true|false)', 'm');
  if (!re.test(text)) throw new Error('etim.cfg has no B:' + key);
  return text.replace(re, (m, p1, p2) => p1 + p2 + value);
}

function cfgBool(text, key) {
  const m = new RegExp('^[ \\t]*B:' + key + '=(true|false)', 'm').exec(text);
  return m ? m[1] : null;
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
  for (let i = 0; i < 12; i++) {
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
    for (let k = 0; k < 14; k++) {
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

/** 甘蔗摆场（BlockReed.canPlaceBlockAt：下格沙 + 下格水平四邻有水）——W-35/W-45 同款。 */
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

/** 素地摆场（W-43/W-45 形状）：air 清位 → setblock 目标 → testforblock 复钉。 */
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

/* ===================== 动作 ===================== */

/** 轮询目标格状态：`want` 方块名，`expectFound` 期望命中。 */
async function pollBlock(srv, X, Y, Z, wantBlock, timeoutMs, expectFound) {
  const t0 = Date.now();
  const tries = [];
  while (Date.now() - t0 < timeoutMs) {
    const from = srv.all.length;
    srv.send(`testforblock ${X} ${Y} ${Z} ${wantBlock}`);
    const line = await srv.waitFor(new RegExp(RE.found.source + '|' + RE.notFound.source), 5000, from);
    const found = !!line && RE.found.test(line);
    tries.push({ atMs: Date.now() - t0, want: wantBlock, line: stripPrefix(line || ''), found });
    if (found === expectFound) return { ok: true, found, tries, ms: Date.now() - t0 };
    await sleep(800);
  }
  return { ok: false, found: !expectFound, tries, ms: Date.now() - t0 };
}

/** 一次 dig 往返：START/STOP 回执 → 复钉目标格 air → 返回段起点。 */
async function digOnce(srv, botName, X, Y, Z, p) {
  const from = srv.all.length;
  srv.send(`etest dig ${X} ${Y} ${Z} ${botName}`);
  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  const state = await pollBlock(srv, X, Y, Z, p.blockAfter, p.waitMs, true);
  await sleep(350);
  return {
    from,
    digStart: ds ? stripPrefix(ds) : null,
    digStop: dp ? stripPrefix(dp) : null,
    state,
    blockAfterOk: state.ok,
  };
}

/**
 * 一次攻击往返：summon 猪 → bot.lookAt(猪体心) → `/etest attack` →
 * `step=attack target=` ＋ `[DamageLog] dmg target=Pig#… final=` 双锚。
 *
 * ★reach 门（reach/ETIMReachEvents.java:41-53）是 R196 几何：眼 → 沿**视线**与
 * expanded hitbox 的交点距离。`/etest attack` 只喂 ATTACK 包不改朝向，故必须先
 * `bot.lookAt` 把 rotation 打到猪身上，否则 `getEntityRayDistance` 无交点 ⇒
 * Double.MAX_VALUE ⇒ `reach denied: etim.reach.deny_attack`（smoke 首跑实证）。
 * 被拒（deny 行）时无 hitEntity ⇒ 可安全重瞄重试一次，不产生二次磨损。
 */
async function attackOnce(srv, bot, botName, p, geo) {
  srv.send('kill @e[type=pig]');
  srv.send('kill @e[type=item]');
  await sleep(650);
  const px = geo.bx + ATT_DX;
  const py = geo.by;
  const pz = geo.bz + 0.5;
  const sf = srv.all.length;
  srv.send(`summon minecraft:pig ${px} ${py} ${pz} ${PIG_NBT}`);
  const sl = await srv.waitFor(RE.summoned, 5000, sf);
  await sleep(750);
  const summoned = !!sl && RE.summoned.test(sl);

  let step = null, dmg = null, from = srv.all.length, attempts = 0, denied = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    attempts = attempt;
    // 眼高由 mineflayer 侧算；瞄准猪体心（y+0.45）
    await bot.lookAt(bot.entity.position.offset(ATT_DX, 0.45, 0), true);
    await sleep(400);
    from = srv.all.length;
    srv.send(`etest attack @e[type=pig,r=4,c=1] ${botName}`);
    step = await srv.waitFor(new RegExp(RE.attackStep.source + '|' + RE.attackNoTarget.source), 8000, from);
    dmg = await srv.waitFor(RE.damageRow, 5000, from);
    const seg = srv.all.slice(from);
    denied = seg.some((l) => RE.reachDeny.test(l));
    if (dmg) break;
    if (!denied) break;
    log(p.id, `attack denied by reach gate (attempt ${attempt}) — re-aim and retry`);
    await sleep(500);
  }
  await sleep(900);
  const dm = dmg ? RE.damageRow.exec(dmg) : null;
  const dmgTarget = dm ? dm[1] : null;
  const dmgFinal = dm ? +dm[3] : null;
  const pigHit = !!dm && /^Pig/i.test(dmgTarget);
  return {
    from,
    summonLine: stripPrefix(sl || ''),
    summoned,
    attackStep: step ? stripPrefix(step) : null,
    landed: pigHit,
    attackAttempts: attempts,
    reachDenied: denied,
    damageLine: dmg ? stripPrefix(dmg) : null,
    damageTarget: dmgTarget,
    dmgFinal,
    blockAfterOk: true,   // 攻击点无破块面
    digStart: null,
    digStop: null,
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
    id: p.id, kind: p.kind, note: p.note, item: p.item, block: p.block || null, arena: p.arena,
    expect: { rows: p.rows, deny: p.deny, dur: p.expectDur, level: p.level },
    at: p.kind === 'dig' ? { x: X, y: Y, z: Z } : { x: geo.bx + ATT_DX, y: Y, z: geo.bz + 0.5 },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item} x ${p.block || 'pig'}`);

  srv.send('kill @e[type=item]');
  await sleep(250);

  // expLevel 面：on 相破块加速用 35（loss 值与 str 大于 1 的门无关）。
  srv.send(`etest level ${p.level} ${botName}`);
  await sleep(550);
  rec.levelSet = p.level;

  const hold = await holdItem(srv, bot, p.item);
  rec.holdReceipt = hold.receipt;
  rec.holdAttempts = hold.attempts;
  rec.heldAfterHold = hold.bot;

  // 落地/位置复钉（!onGround ⇒ str/5，污染 str 门与进度）
  for (let k = 0; k < 3; k++) {
    const pos = bot.entity.position;
    if (bot.entity.onGround !== false && Math.abs(pos.y - geo.by) < 0.9) break;
    srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1300);
  }
  rec.posBefore = {
    x: +bot.entity.position.x.toFixed(2), y: +bot.entity.position.y.toFixed(2),
    z: +bot.entity.position.z.toFixed(2), onGround: bot.entity.onGround,
  };

  if (p.kind === 'dig') await placeTarget(srv, rec, X, Y, Z, p);

  const b0 = await botDurSettled(bot);
  rec.botBefore = b0;

  const act = p.kind === 'attack'
    ? await attackOnce(srv, bot, botName, p, geo)
    : await digOnce(srv, botName, X, Y, Z, p);
  rec.act = act;

  const b1 = await botDurSettled(bot);
  rec.botAfter = b1;

  if (p.potCleanup) {
    // reeds 水盆复位（防后续点落在水面上/吃水中环境罚）
    srv.send(`setblock ${X - 1} ${Y - 1} ${Z} minecraft:dirt 0`);
    srv.send(`setblock ${X} ${Y - 1} ${Z} minecraft:dirt 0`);
    await sleep(500);
  }

  const seg = srv.all.slice(act.from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.rows = rowsOf(seg);
  rec.denyRaw = seg.filter((l) => RE.deny.test(l)).map((l) => l.trim());
  rec.denies = deniesOf(seg);
  rec.speedRows = speedsOf(seg);
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);
  rec.damageRows = seg.filter((l) => RE.damageRow.test(l)).map(stripPrefix);

  const dmg = (x) => (x && x.damage !== null && x.damage !== undefined ? x.damage : null);
  rec.durDelta = dmg(b1) !== null && dmg(b0) !== null ? dmg(b1) - dmg(b0) : null;

  const rowsOk = rec.rows.length === p.rows.length && rec.rows.every((r, i) => {
    const w = p.rows[i];
    return r.face === w.face && r.item === w.item && r.block === w.block && r.loss === w.loss
      && (w.block === null ? !r.hasBlockCol : r.hasBlockCol);
  });
  const deniesOk = rec.denies.length === p.deny.length && rec.denies.every((d, i) => {
    const w = p.deny[i];
    return d.grade === w.grade && d.required === w.required && d.item === w.item && d.block === w.block;
  });

  rec.checks = {
    levelReceipt: rec.levelSet === p.level,
    holdReceipt: !!rec.holdReceipt,
    placed: p.kind === 'dig' ? /Block placed/i.test(rec.placedLine || '') : true,
    blockPresentBefore: p.kind === 'dig' ? RE.found.test(rec.blockPresentLine || '') : true,
    water: p.arena === 'reeds' ? RE.found.test(rec.waterLine || '') : true,
    summoned: p.kind === 'attack' ? act.summoned === true : true,
    digsComplete: p.kind === 'dig' ? !!(act.digStart && act.digStop) : true,
    attackLanded: p.kind === 'attack' ? act.landed === true : true,
    damageLog: p.damageLog === null ? true
      : (act.damageLine !== null && act.dmgFinal !== null && act.dmgFinal > 0 && act.landed === true),
    blockAfter: act.blockAfterOk === true,
    rowsMatch: rowsOk,
    deniesMatch: deniesOk,
    durMatch: rec.durDelta === p.expectDur,
    noReachDeny: rec.reachDenies.length === 0,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.length + ' [' + rec.rows.map((r) => r.face + ':' + r.item + '/' + (r.block || '-') + ':' + r.loss).join(' ')
    + '] deny=' + rec.denies.length + ' durΔ=' + rec.durDelta + '(want ' + p.expectDur + ')'
    + ' blockAfter=' + act.blockAfterOk
    + (p.kind === 'attack' ? ' dmgFinal=' + act.dmgFinal : '')
    + ' speed=' + (rec.speedRows.map((s) => s.str).join(',') || '-')
    + ' wait=' + (act.state ? act.state.ms + 'ms' : '-'));
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

/** 等 Done(：与「进程已退出 / BUILD FAILED / 原生 OOM」赛跑——失败快速冒泡，不吃 300s 空等。 */
async function waitReady(srv, tag) {
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    const done = srv.all.find((l) => /Done \(/.test(l));
    if (done) return done;
    const dead = srv.exited || srv.all.some((l) => /BUILD FAILED|insufficient memory|FAILURE: Build failed/.test(l));
    if (dead) throw new Error('boot died before Done( (BUILD FAILED / native OOM / exit) — see ' + tag + '.out');
    await sleep(400);
  }
  return null;
}

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const botName = opts.bot;
  const srv = await startServer({ root: ROOT, tag });
  const phase = {
    tag, bot: botName || null, label: opts.label, key: opts.key, world: opts.world,
    miningReform: opts.miningReform, points: [],
  };
  let bot = null;
  try {
    const done = await waitReady(srv, tag);
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = stripPrefix(done.trim());
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;

    if (!points.length) {
      phase.buddyOnly = true;
      log(tag, 'buddy boot Done — baseline only');
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
      let grounded = Math.abs(p1.y - geo.by) < 0.7
        && Math.abs(p1.x - (geo.bx + 0.5)) < 0.9 && Math.abs(p1.z - (geo.bz + 0.5)) < 0.9;
      if (!grounded) {
        srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
        await sleep(1600);
        p1 = bot.entity.position;
        grounded = Math.abs(p1.y - geo.by) < 0.7
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
        total: srv.all.filter((l) => /\[MiningLog\]/.test(l)).length,
        damageRowsPigPlayer: srv.all.filter((l) => /\[DamageLog\] dmg target=Pig#.* src=player/.test(l)).length,
        damageRowsOutOfWorld: srv.all.filter((l) => /\[DamageLog\] .* src=outOfWorld/.test(l)).length,
      };
      phase.attackingRows = allRows.filter((r) => r.face === 'attacking');
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
    const snap = path.join(OUT, tag + '-server-latest.log');
    try { fs.copyFileSync(RUNLOG, snap); phase.logSnapshot = snap; } catch (e) {
      phase.logSnapshotError = String((e && e.message) || e);
    }
    ev.phases.push(phase);
  }
  return phase;
}

/* ===================== 主流程 ===================== */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, mode: MODE, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [],
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
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  ev.pins.cfgMiningReform = cfgBool(fs.readFileSync(CFG, 'utf8'), 'miningReform');
  ev.pins.mk = mkCounts();
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  for (const k of ['devJar', 'relJar', 'srcJar', 'cfg', 'cfgClient', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  log('pin', 'cfg miningReform=' + ev.pins.cfgMiningReform);
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.cfgClient.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch (139/57/11 出现＝异常停窗) — refuse to run');
  if (!head.startsWith(PIN.head)) throw new Error('HEAD pin mismatch — refuse to run');
  if (ev.pins.cfgMiningReform !== 'true') throw new Error('cfg miningReform 初值不是 true — refuse to run');

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

  const pointsA = pick(A_POINTS);
  const pointsG = pick(G_POINTS);

  let restoreOk = false;
  try {
    // ---------- 1) buddy 基线 boot（cfg 零编辑） ----------
    if (want('buddy')) {
      let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_BUDDY);
      if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
      fs.writeFileSync(PROPS, propEdit, 'utf8');
      log('config', `level-name -> ${WORLD_BUDDY} / spawn-protection -> 0`);
      await runPhase({ key: 'buddy', tag: STAGE + '-buddy', label: 'buddy (baseline boot, no bot)', world: WORLD_BUDDY }, [], ev);
      const cfgAfterBuddy = fs.readFileSync(CFG);
      ev.cfgAfterBuddy = { bytes: cfgAfterBuddy.length, sha: sha256(cfgAfterBuddy), miningReform: cfgBool(cfgAfterBuddy.toString('utf8'), 'miningReform') };
      ev.cfgZeroNewKeyPrediction = ev.cfgAfterBuddy.sha === PIN.cfg.sha && ev.cfgAfterBuddy.bytes === PIN.cfg.bytes;
      log('config', 'after buddy boot: cfg ' + ev.cfgAfterBuddy.bytes + ' B ' + ev.cfgAfterBuddy.sha
        + ' ' + (ev.cfgZeroNewKeyPrediction ? '（零新键预言成立）' : '★漂移＝异常停窗'));
    }

    // ---------- 2) A 相（miningReform=true，零 cfg 编辑） ----------
    if (want('a') && pointsA.length) {
      let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_A);
      if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
      fs.writeFileSync(PROPS, propEdit, 'utf8');
      ev.cfgAtABoot = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), miningReform: cfgBool(fs.readFileSync(CFG, 'utf8'), 'miningReform') };
      log('config', `A boot: level-name -> ${WORLD_A}; cfg untouched miningReform=${ev.cfgAtABoot.miningReform}`);
      await runPhase({
        key: 'a', tag: STAGE + '-a', bot: 'ETIM_W46A', label: 'A (miningReform=true, single boot, a-d)',
        world: WORLD_A, miningReform: true,
      }, pointsA, ev);
      const cfgAfterA = fs.readFileSync(CFG);
      ev.cfgAfterA = { bytes: cfgAfterA.length, sha: sha256(cfgAfterA), miningReform: cfgBool(cfgAfterA.toString('utf8'), 'miningReform') };
      ev.cfgAZeroEdit = ev.cfgAfterA.sha === PIN.cfg.sha && ev.cfgAfterA.bytes === PIN.cfg.bytes;
      log('config', 'after A boot: cfg ' + ev.cfgAfterA.bytes + ' B ' + ev.cfgAfterA.sha
        + ' miningReform=' + ev.cfgAfterA.miningReform + ' ' + (ev.cfgAZeroEdit ? '（零编辑 zero-new-key）' : '★漂移'));
    }

    // ---------- 3) G 相（driver 翻 miningReform=false + 重启） ----------
    if (want('g') && pointsG.length) {
      let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_G);
      if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
      fs.writeFileSync(PROPS, propEdit, 'utf8');
      const cfgEdited = setCfgBool(fs.readFileSync(CFG, 'utf8'), 'miningReform', 'false');
      fs.writeFileSync(CFG, cfgEdited, 'utf8');
      const cfgG = fs.readFileSync(CFG);
      ev.cfgAtGBoot = { bytes: cfgG.length, sha: sha256(cfgG), miningReform: cfgBool(cfgG.toString('utf8'), 'miningReform') };
      log('config', `G boot: level-name -> ${WORLD_G}; cfg miningReform -> false (${ev.cfgAtGBoot.bytes} B / ${ev.cfgAtGBoot.sha})`);
      if (ev.cfgAtGBoot.miningReform !== 'false') throw new Error('G 相 cfg 翻转失败 — refuse to run');
      await runPhase({
        key: 'g', tag: STAGE + '-g', bot: 'ETIM_W46G', label: 'G (miningReform=false, single boot, e/f/g/h/k)',
        world: WORLD_G, miningReform: false,
      }, pointsG, ev);
      const cfgAfterG = fs.readFileSync(CFG);
      ev.cfgAfterG = { bytes: cfgAfterG.length, sha: sha256(cfgAfterG), miningReform: cfgBool(cfgAfterG.toString('utf8'), 'miningReform') };
      log('config', 'after G boot (still off): cfg ' + ev.cfgAfterG.bytes + ' B ' + ev.cfgAfterG.sha
        + ' miningReform=' + ev.cfgAfterG.miningReform);
    }
  } finally {
    // ---------- 4) cfg 还原（快照字节回填 = 状态位复位） ----------
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(CFG_CLIENT, fs.readFileSync(ev.cfgClientSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const cfgCAfter = fs.readFileSync(CFG_CLIENT);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = { bytes: cfgAfter.length, sha: sha256(cfgAfter),
      miningReform: cfgBool(cfgAfter.toString('utf8'), 'miningReform'),
      identical: sha256(cfgAfter) === PIN.cfg.sha && cfgAfter.length === PIN.cfg.bytes };
    ev.cfgClientRestored = { bytes: cfgCAfter.length, sha: sha256(cfgCAfter),
      identical: sha256(cfgCAfter) === PIN.cfgClient.sha && cfgCAfter.length === PIN.cfgClient.bytes };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter),
      identical: sha256(propsAfter) === PIN.props.sha && propsAfter.length === PIN.props.bytes };
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical (pin, miningReform=' + ev.cfgRestored.miningReform + ')' : 'MISMATCH'));
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
    for (const w of [WORLD_A, WORLD_G, WORLD_BUDDY]) {
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
    ev.jarUpToDate = ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
    ev.mixinErrors = ev.phases.flatMap((p) => p.mixinErrors || []);
  }

  // 计数总账（写死判）
  ev.ledger = {};
  for (const ph of ev.phases) {
    const w = LEDGER_WANT[ph.key];
    if (ph.buddyOnly) {
      ev.ledger[ph.key] = { want: 'buddy: all zero', got: ph.rowCounts || null, ok: true, sequence: [] };
      continue;
    }
    if (!w) {
      ev.ledger[ph.key] = { want: null, got: ph.rowCounts || null, ok: false, sequence: [],
        note: 'phase key 无 ledger 行（该 boot 未到判点面 / 已 fatal）' };
      continue;
    }
    const got = ph.rowCounts || {};
    ev.ledger[ph.key] = {
      want: w,
      got,
      ok: got.attacking === w.attacking && got.breaking === w.breaking && got.deny === w.deny
        && got.shearing === 0 && got.shearDrop === 0 && got.reachDenied === 0,
      sequence: (ph.attackingRows || []).concat(ph.breakingRows || [])
        .map((r) => `${r.face}:${r.item}/${r.block || '-'}:${r.loss}`),
      denySequence: (ph.denyAll || []).map((l) => stripPrefix(l)),
    };
  }
  const ledgerOk = Object.values(ev.ledger).every((l) => l.ok);

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = (want('a') && pointsA.length ? pointsA.length : 0)
    + (want('g') && pointsG.length ? pointsG.length : 0);

  ev.verdict = (allPoints.length === expectPoints
      && allPoints.every((p) => p.pass)
      && ledgerOk
      && ev.phases.every((p) => !p.fatal)
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.srcJar.ok
      && ev.pinsAfter.mk.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate
      && ev.mixinErrors.length === 0
      && Object.values(ev.worldsRemoved).every(Boolean)
      && (!want('buddy') || ev.cfgZeroNewKeyPrediction)
      && (!want('a') || ev.cfgAZeroEdit)
      && (!want('g') || (ev.cfgAtGBoot.miningReform === 'false' && ev.cfgRestored.identical))) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence-' + MODE + '.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of allPoints) log(p.id, p.pass ? 'PASS' : 'FAIL', p.checks ? JSON.stringify(p.checks) : '');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
