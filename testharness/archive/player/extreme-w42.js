#!/usr/bin/env node
/**
 * extreme-w42.js — 武器极端值面批（extreme）W-42 十一点判窗驱动
 *
 * 判据源（秤上唯一判据）：
 *   `[MiningLog] tool decay face=attacking item=<reg> loss=N [server]`
 *   —— 由 `ETIMMining.getToolDecayFromAttackingEntity(held, player)` 发行
 *   （`mining/ETIMMining.java:302` def / `:306` 创造门 / `:312` 发行）；
 *   `logToolDecay("attacking", held, null, loss)`（`:312`）state=null ⇒
 *   **无 block= 列**、去重键塌成 `attacking|<item>`（`:701` / `:709-712`）。
 *
 * ★本批口径（终审 T-1/T-6）：
 *   A 相 生存面：四武器 66/75/133/400 ＋ mattock 100（D-1(c) 修后新值），
 *     每点恰 1 条 loss=值 ＋ 栈 Δ 同值。
 *   G 相（miningReform=false）：handler 首支原调 ⇒ **0 条**，
 *     四武器＋铁镐一律 Δ2（1.12 `item/ItemTool.java:73` damageItem(2)），
 *     k 创造 scythe ⇒ 0 条＋Δ0（`item/ItemStack.java:387` 创造门）。
 *
 * 通道：bot.attack（use_entity mouse=1，1.12 = ATTACK；见
 *   `entities.js:843-856` → `useEntity(target,1)` → `:922-927`）＝真实挥击路径；
 *   实体体心瞄准（猪高 0.9 ⇒ 体心 y+0.45）。
 *
 * 命中判据（B-7 防线，比 W-41 的 testfor 更强）：
 *   `[DamageLog] dmg target=Pig#<id> src=player raw=<n> … final=<n>`（`damageDebugLog=true`）
 *   ⇒ 挥击确实落到猪身上；0 行＋Δ0 时必须先由它排除「未命中/免伤」。
 *   栈真值＝bot.heldItem.durabilityUsed（面板）；判行 `item=` 为第二口径。
 *
 * last-sig 纪律（键＝attacking|<item>，同键同值第二行被吞）：
 *   A 相五点**异键**（war_hammer/battle_axe/hatchet/scythe/mattock 各一）天然不互吞；
 *   G 相零行发行 ⇒ 无键面。★同 boot 内重跑同点必吞成 0 行 ⇒
 *   冒烟重试须新 boot 或换同族金属档；判点一套串行一次性排完。
 *
 * 两相：A miningReform=true（cfg 默认，零编辑）→ a-e
 *       G miningReform=false（boot 前翻 cfg，收窗还原）→ f-j＋k
 *
 * 用法：node extreme-w42.js [tag]
 * 冒烟：W42_ONLY=W-42a,W-42e / W42_PHASES=a
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
let Vec3 = null;
try { Vec3 = require('vec3'); } catch (e) { Vec3 = null; }

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'extreme-w42';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const WORLD_NAME = 'extremew42';
const PORT = 25565;

/** 四钉（主会话 W-42 任务书 · HEAD 4c2849e）。 */
const PIN = {
  head: '4c2849e',
  rel: { bytes: 772789, sha: '441A97C1D06FE5CE661E6D2F29C56211E6763B05E7B6053E26CC5C156A740A5B' },
  dev: { bytes: 757023, sha: '7348CC0D8A605DE3BD9CACEDB4D87FA73A3EC1214039669B726B0FB846490C2E' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉（窗内 refmap / mixins 清单零动；139/57/11 出现＝异常停窗）。 */
const MK_PIN = { mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138, sword: 4, tool: 4, shears: 3 };

/** 靶（b3-run.js:1080 同形）：NoAI ＋ 1000 血 ＋ 抗击退，保证不掉血致死、不掉落干扰。 */
const PIG_NBT = '{NoAI:1b,Silent:1b,PersistenceRequired:1b,'
  + 'Attributes:[{Name:"generic.maxHealth",Base:1000.0},{Name:"generic.knockbackResistance",Base:1.0}],'
  + 'Health:1000.0f}';

const PICK = 'minecraft:iron_pickaxe';
const WH = 'etim:war_hammer_copper';   // 66  (R196 2F/3F float32 截断)
const BA = 'etim:battle_axe_copper';   // 75  (0.75 精确)
const HAT = 'etim:hatchet_copper';     // 133 (R196 4F/3F float32 截断，非 134)
const SCY = 'etim:scythe_copper';      // 400 (裸 4.0)
const MAT = 'etim:mattock_copper';     // 100 (D-1(c) 删 0.8F 特判 → ItemSpade 1.0F)

const row = (item, loss) => ({ face: 'attacking', item, block: null, loss });

/**
 * A 相（boot1，miningReform=true 默认零编辑）——五点**异键**，天然不互吞。
 * 执行序即数组序；kind 只用 'attack'（单挥）。
 */
const POINTS_A = [
  { id: 'W-42a', kind: 'attack', item: WH, creative: false,
    expect: { rows: [row(WH, 66)], dur: [66] },
    note: '生存 war_hammer_copper×猪：恰 1 条 loss=66 ＋ Δ66（2F/3F→0.66666669→66.666672→(int)66）' },
  { id: 'W-42b', kind: 'attack', item: BA, creative: false,
    expect: { rows: [row(BA, 75)], dur: [75] },
    note: '生存 battle_axe_copper×猪：恰 1 条 loss=75 ＋ Δ75（0.75F 精确 75.0）' },
  { id: 'W-42c', kind: 'attack', item: HAT, creative: false,
    expect: { rows: [row(HAT, 133)], dur: [133] },
    note: '生存 hatchet_copper×猪：恰 1 条 loss=133 ＋ Δ133（4F/3F→1.33333337→133.333343→(int)133，非 134）' },
  { id: 'W-42d', kind: 'attack', item: SCY, creative: false,
    expect: { rows: [row(SCY, 400)], dur: [400] },
    note: '生存 scythe_copper×猪：恰 1 条 loss=400 ＋ Δ400（裸栈 4.0F→400.0 精确）' },
  { id: 'W-42e', kind: 'attack', item: MAT, creative: false,
    expect: { rows: [row(MAT, 100)], dur: [100] },
    note: '★D-1(c) 修后新值：生存 mattock_copper×猪 恰 1 条 loss=100 ＋ Δ100（删 0.8F 特判 → ItemSpade 兜底 1.0F）' },
];

/** G 相（boot2，miningReform=false）：handler 首支原调 ⇒ 零 attacking 行，Δ＝vanilla 2。 */
const POINTS_G = [
  { id: 'W-42f', kind: 'attack', item: PICK, creative: false,
    expect: { rows: [], dur: [2] },
    note: 'off 相 铁镐：0 条 ＋ vanilla damageItem(2) ⇒ Δ2（1.12 item/ItemTool.java:73 首证）' },
  { id: 'W-42g', kind: 'attack', item: SCY, creative: false,
    expect: { rows: [], dur: [2] },
    note: 'off 相 scythe_copper：0 条 ＋ Δ2（三级链 ETIMItemScythe→ItemTool）' },
  { id: 'W-42h', kind: 'attack', item: HAT, creative: false,
    expect: { rows: [], dur: [2] },
    note: 'off 相 hatchet_copper：0 条 ＋ Δ2（四级链 →ETIMItemAxe→ItemAxe→ItemTool）' },
  { id: 'W-42i', kind: 'attack', item: BA, creative: false,
    expect: { rows: [], dur: [2] },
    note: 'off 相 battle_axe_copper：0 条 ＋ Δ2（四级链兄弟）' },
  { id: 'W-42j', kind: 'attack', item: WH, creative: false,
    expect: { rows: [], dur: [2] },
    note: 'off 相 war_hammer_copper：0 条 ＋ Δ2（四级链 →ETIMItemPickaxe→ItemPickaxe）' },
  { id: 'W-42k', kind: 'attack', item: SCY, creative: true,
    expect: { rows: [], dur: [0] },
    note: 'off 相 创造 scythe_copper：0 条 ＋ Δ0（1.12 item/ItemStack.java:387 创造门；判毕 /gamemode 0 复原）' },
];

/** 计数总账（写死判）：A 相 attacking 恰 5（a-e 各 1）；G 相恰 0；他通道全 0。 */
const LEDGER = { a: { attacking: 5 }, g: { attacking: 0 } };

const ONLY = (process.env.W42_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const PHASES_ONLY = (process.env.W42_PHASES || '').split(',').map((s) => s.trim()).filter(Boolean);
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);
const wantPhase = (k) => PHASES_ONLY.length === 0 || PHASES_ONLY.includes(k);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const RE = {
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  speed: /\[MiningLog\] mine speed item=/,
  deny: /\[MiningLog\] mine deny grade=/,
  shearDrop: /\[MiningLog\] shear drop/,
  reachDeny: /reach denied: (\S+)/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  summonOk: /successfully summoned|Summoned new/i,
  holdReceipt: /\[EtimTest\] commands\.etest\.hold_set player=/,
  driveReceipt: /\[EtimTest\] commands\.etest\.drive_queued player=(\S+) params=\[(.*?)\]/,
  selected: /SelectedItem:\{id:"([^"]+)"/,
  selectedDamage: /SelectedItem:\{(?:[^{}]|\{[^{}]*\})*?Damage:(\d+)s/,
  health: /(?:^|[,{])Health:([\d.]+)f/,
  mixinList: /-- Mixins applied|mixins\.etim\.json/,
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
  const count = (o) => Object.keys(o).length + '/'
    + Object.values(o).reduce((a, x) => a + Object.keys(x).length, 0);
  const read = (f) => {
    const raw = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(raw);
  };
  const out = {};
  for (const [key, f] of [['refmapResources', REFMAP_A], ['refmapTmp', REFMAP_B]]) {
    const r = read(f);
    out[key] = { classes: Object.keys(r.mappings).length, entries: Object.values(r.mappings)
      .reduce((a, x) => a + Object.keys(x).length, 0), pair: count(r.mappings) };
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

async function cmdRead(srv, cmd, ms = 800) {
  const from = srv.all.length;
  srv.send(cmd);
  await sleep(ms);
  return srv.all.slice(from)
    .filter((l) => !/^### \[harness\]/.test(l))
    .map(stripPrefix)
    .filter((l) => l && !/^\s*$/.test(l));
}

/** `entitydata <sel> {}` 原始行（只用于非玩家实体：Health 等 NBT 面）。 */
async function nbtLines(srv, selector, ms = 800) {
  return cmdRead(srv, `entitydata ${selector} {}`, ms);
}

/** 目标实体存在性（判点旁证；1.12 `entitydata` 对 `{}` 无回显、对玩家直接拒绝）。 */
async function testFor(srv, selector) {
  const lines = await cmdRead(srv, `testfor ${selector}`, 700);
  const hits = lines.filter((l) => /(?:\]:\s|^)Found \S/.test(l)).length;
  return { hit: hits > 0, count: hits, raw: lines.slice(0, 3) };
}

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

function invSnap(bot) {
  if (!bot || !bot.inventory) return null;
  return bot.inventory.items()
    .map((i) => `${i.name}#${i.type}:${i.count}:${i.durabilityUsed === undefined ? 0 : i.durabilityUsed}`)
    .sort();
}

let HOLDER_NAME = null;

/**
 * fresh 栈：`/etest hold <item> <player>` ＋ `[EtimTest] hold_set` 回执 ＋ bot 面板对账。
 * 栈身份的第二口径＝判行 `item=` 字段（服务端发行时读的就是手持栈真值）。
 */
async function holdItem(srv, bot, item) {
  if (!HOLDER_NAME) throw new Error('holdItem: HOLDER_NAME not set');
  const vanilla = item.startsWith('minecraft:');
  const shortName = item.replace(/^minecraft:/, '');
  for (let attempt = 0; attempt < 4; attempt++) {
    const from = srv.all.length;
    srv.send(`etest hold ${item} ${HOLDER_NAME}`);
    const receipt = await srv.waitFor(RE.holdReceipt, 5000, from);
    for (let k = 0; k < 12; k++) {
      await sleep(180);
      const it = botDur(bot);
      const fresh = !!it && (it.damage === 0 || it.damage === null);
      const named = !vanilla || (!!it && it.name === shortName);
      if (receipt && fresh && named) {
        return { receipt: stripPrefix(receipt), bot: it, attempts: attempt + 1 };
      }
    }
  }
  throw new Error(`hold ${item} failed — hold_set 回执/bot 面板未对上`);
}

function idsOf(bot, name) {
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

/** 体心瞄准的一挥（use_entity mouse=1 = ATTACK）。 */
async function swing(bot, ent, aimY = 0.45) {
  const aim = ent.position.offset(0, aimY, 0);
  await bot.lookAt(aim, false);
  await sleep(180);
  bot.attack(ent);
  return { aimY, aim: { x: +aim.x.toFixed(2), y: +aim.y.toFixed(2), z: +aim.z.toFixed(2) } };
}

async function summonPig(srv, bot, x, y, z) {
  const beforeIds = idsOf(bot, 'pig');
  const from = srv.all.length;
  srv.send(`summon minecraft:pig ${x} ${y} ${z} ${PIG_NBT}`);
  const line = await srv.waitFor(new RegExp(RE.summonOk.source + '|Unable to summon', 'i'), 5000, from);
  await sleep(900);
  const ent = await waitEntity(bot, 'pig', beforeIds);
  return { line: stripPrefix(line || ''), ok: RE.summonOk.test(line || ''), entity: ent };
}

/* ===================== 判行解析 ===================== */

function rowsOf(seg) {
  return seg.filter((l) => RE.decay.test(l)).map((l) => {
    const m = RE.decay.exec(l);
    return {
      face: m[1], item: m[2], block: m[3] || null, loss: +m[4],
      hasBlockCol: /\sblock=/.test(l),
    };
  });
}

function rowsEqual(got, want) {
  if (got.length !== want.length) return false;
  for (let i = 0; i < got.length; i++) {
    const g = got[i];
    const w = want[i];
    if (g.face !== w.face || g.item !== w.item || g.loss !== w.loss) return false;
    if ((g.block || null) !== (w.block === undefined ? null : w.block)) return false;
    if (w.block === null && g.hasBlockCol) return false; // ★无 block= 列断言
  }
  return true;
}

/* ===================== 判点执行 ===================== */

async function runPoint(srv, bot, botName, p, geo) {
  HOLDER_NAME = botName;
  const EX = geo.bx + 1;
  const EY = geo.by;
  const EZ = geo.bz;
  const isBlock = p.kind === 'block';
  const rec = {
    id: p.id, kind: p.kind, note: p.note, item: p.item, creative: !!p.creative,
    control: !!p.control, expect: p.expect, at: isBlock ? null : { x: EX + 0.5, y: EY, z: EZ + 0.5 },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item}${p.creative ? ' creative' : ''}${p.control ? ' control' : ''}`);

  srv.send('kill @e[type=pig]');
  srv.send('kill @e[type=item]');
  await sleep(650);

  const hold = await holdItem(srv, bot, p.item);
  rec.holdReceipt = hold.receipt;
  rec.holdAttempts = hold.attempts;
  rec.heldAfterHold = hold.bot;

  let pig = null;
  {
    pig = await summonPig(srv, bot, EX + 0.5, EY, EZ + 0.5);
    rec.summonLine = pig.line;
    rec.summonOk = pig.ok;
    rec.entityFound = !!pig.entity;
    if (!pig.entity) throw new Error('pig not tracked by the harness bot');
  }

  const b0 = botDur(bot);
  const i0 = invSnap(bot);
  rec.botBefore = b0;
  rec.invBefore = i0;
  rec.botHealthBefore = bot.health === undefined ? null : bot.health;

  // g 点首击须为创造态（runPoint 的 gamemode 起始门看 creative||creativeFirst）
  const startCreative = !!p.creative || !!p.creativeFirst;
  if (startCreative) { srv.send(`gamemode 1 ${botName}`); await sleep(900); }
  rec.gameModeStart = startCreative ? 1 : 0;

  // 落地复钉：判点前确认 bot 仍在平台面（漂出边沿会引入 fall 伤，污染 playerHp 判点）
  for (let k = 0; k < 3; k++) {
    const pos = bot.entity.position;
    if (bot.entity.onGround !== false && Math.abs(pos.y - EY) < 0.8) break;
    srv.send(`tp ${botName} ${geo.bx + 0.5} ${EY} ${geo.bz + 0.5}`);
    await sleep(1300);
  }
  rec.posBeforeHit = {
    x: +bot.entity.position.x.toFixed(2), y: +bot.entity.position.y.toFixed(2),
    z: +bot.entity.position.z.toFixed(2), onGround: bot.entity.onGround,
  };

  const from = srv.all.length;
  rec.swings = [];
  if (p.kind === 'attack') {
    rec.swings.push(await swing(bot, pig.entity));
    await sleep(1100);
  } else if (p.kind === 'attack2') {
    // 创造一击 → 切生存 → 再一击（同栈续打；spacing ≥1.2s 避 hurtResistantTime 吞伤）
    rec.swings.push(await swing(bot, pig.entity));
    await sleep(1200);
    rec.midBot = botDur(bot);
    srv.send(`gamemode 0 ${botName}`);
    await sleep(900);
    rec.swings.push(await swing(bot, pig.entity));
    await sleep(1100);
  } else if (isBlock) {
    // 格挡面：useitem 置 active hand（MixinItem:167-183 → setActiveHand），再吃一击。
    // 伤害源必须走 **mob 源**（`causeMobDamage`）：`generic` = setDamageBypassesArmor()
    // ⇒ isUnblockable()=true ⇒ R196ArmorModel.r196ArmorBypassed 早退（:360），本批不用。
    const uf = srv.all.length;
    srv.send(`etest useitem ${botName}`);
    rec.useitemReceipt = stripPrefix((await srv.waitFor(RE.driveReceipt, 6000, uf)) || '');
    await sleep(900);
    const hf = srv.all.length;
    srv.send(`etest hurt @e[type=pig,r=6,c=1] 8 ${botName}`);
    rec.hurtReceipt = stripPrefix((await srv.waitFor(RE.driveReceipt, 6000, hf)) || '');
    rec.hurtTestLog = stripPrefix((await srv.waitFor(/\[TestLog\] step=hurt/, 6000, hf)) || '');
    await sleep(1600);
  }
  await sleep(400);

  const b1 = botDur(bot);
  const i1 = invSnap(bot);
  rec.botAfter = b1;
  rec.invAfter = i1;
  rec.botHealthAfter = bot.health === undefined ? null : bot.health;
  rec.pigAliveAfter = isBlock ? null : await testFor(srv, '@e[type=pig]');

  if (p.creative) { srv.send(`gamemode 0 ${botName}`); await sleep(800); }

  const seg = srv.all.slice(from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.rows = rowsOf(seg);
  rec.speedRaw = seg.filter((l) => RE.speed.test(l)).length;
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);
  rec.testLog = seg.filter((l) => /\[TestLog\] step=/.test(l)).map(stripPrefix);
  rec.damageLog = seg.filter((l) => /\[DamageLog\] dmg target=/.test(l)).map(stripPrefix);
  const mobDmg = rec.damageLog
    .map((l) => /src=(\w+) raw=([\d.]+).*final=([\d.]+)/.exec(l))
    .filter((m) => m)
    .map((m) => ({ src: m[1], raw: +m[2], final: +m[3] }));
  // B-7 防线：本批全部判点都是玩家挥击 → 猪，命中落点由 [DamageLog] src=player 直证。
  const playerHits = rec.damageLog
    .map((l) => /target=Pig#\d+ src=player raw=([\d.]+).*final=([\d.]+)/.exec(l))
    .filter((m) => m)
    .map((m) => ({ raw: +m[1], final: +m[2] }));
  rec.playerHits = playerHits;
  rec.hitWitness = playerHits.length > 0;

  // Δ 序列（bot 面板口径，W-39 同族）：attack＝[b1-b0]；attack2＝[mid-b0, b1-mid]；block＝[b1-b0]
  const dmg = (x) => (x && x.damage !== null && x.damage !== undefined ? x.damage : null);
  const seq = [];
  if (p.kind === 'attack2') {
    seq.push(dmg(rec.midBot) !== null && dmg(b0) !== null ? dmg(rec.midBot) - dmg(b0) : null);
    seq.push(dmg(b1) !== null && dmg(rec.midBot) !== null ? dmg(b1) - dmg(rec.midBot) : null);
  } else {
    seq.push(dmg(b1) !== null && dmg(b0) !== null ? dmg(b1) - dmg(b0) : null);
  }
  rec.durSeq = seq;
  rec.durDelta = seq.every((x) => x !== null) ? seq.reduce((a, x) => a + x, 0) : null;

  const wantDur = p.expect.dur;
  const durOk = wantDur.length === seq.length && wantDur.every((w, i) => seq[i] === w);
  const hpDrop = rec.botHealthBefore !== null && rec.botHealthAfter !== null
    ? rec.botHealthBefore - rec.botHealthAfter : null;
  const invSame = i0 && i1 ? JSON.stringify(i0) === JSON.stringify(i1) : null;

  rec.checks = {
    summonOk: rec.summonOk === true,
    entityFound: rec.entityFound,
    holdReceipt: !!rec.holdReceipt,
    rowsMatch: rowsEqual(rec.rows, p.expect.rows),
    noBlockCol: rec.rows.every((r) => !r.hasBlockCol),
    durSeqMatch: durOk,
    hitLanded: rec.hitWitness,            // ★B-7：0 行/Δ0 前先证命中（DamageLog src=player）
    pigAlive: rec.pigAliveAfter ? rec.pigAliveAfter.hit === true : true,
    playerHp: p.expect.playerHp === undefined ? true : hpDrop === p.expect.playerHp,
    blockedFinal: isBlock
      ? (p.expect.blockedFinal === 0
        ? mobDmg.filter((d) => d.src === 'mob').length === 0
        : mobDmg.some((d) => d.src === 'mob' && d.raw === 8 && d.final === p.expect.blockedFinal))
      : true,
    noReachDeny: rec.reachDenies.length === 0,
    noSpeedRows: rec.speedRaw === 0,
    inventoryStable: p.creative ? invSame !== false : true,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.length + ' [' + rec.rows.map((r) => r.item + ':' + r.loss + (r.hasBlockCol ? '(blockCol)' : '')).join(' ')
    + '] durSeq=' + JSON.stringify(seq)
    + ' playerHP=' + rec.botHealthBefore + '→' + rec.botHealthAfter
    + ' inv=' + invSame
    + ' reachDeny=' + rec.reachDenies.length);
  return rec;
}

/* ===================== 相位 ===================== */

/**
 * 假人进服重试（W-42 首轮实测坑）：`Done (` 落地后服务器仍有
 * 「Server is still starting! Please wait」窗口（FML 在 `Netty Server IO`
 * 直接踢人），此时 status ping 也不带 modinfo ⇒ createHarnBot 抛
 * 「not a FML server」。故按 2.5s 退避重试，最多 8 次。
 */
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

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const botName = opts.bot;
  const srv = await startServer({ root: ROOT, tag });
  const phase = { tag, bot: botName, label: opts.label, key: opts.key, points: [] };
  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = stripPrefix(done.trim());
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.extraMentions = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 5);
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;

    bot = await connectBot(botName);
    await sleep(2200);

    // op 假人：`/etest hurt <mob-selector>` 在 server 线程用**玩家作 sender** 解析 @e 选择器，
    // 非 op 玩家 `canUseCommand(1,"@")`=false ⇒ matchEntities 恒空（NO_TARGET 实测踩坑）。
    srv.send(`op ${botName}`);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('difficulty 2');   // 盾面臂需要 mob 源：PEACEFUL 会把 difficultyScaled 伤害零化
                                // （util/EntityDamageSource.java:64-67 → entity/player/EntityPlayer.java:1119-1124）
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${botName}`);
    srv.send(`effect ${botName} clear`);
    srv.send(`etest food 20 20 ${botName}`);
    srv.send(`etest level 35 ${botName}`);
    await sleep(1200);
    srv.send(`etest health 20 ${botName}`);
    await sleep(900);
    phase.healthSetup = bot.health === undefined ? null : bot.health;
    log('setup', 'health after setup=' + phase.healthSetup);

    const p0 = bot.entity.position;
    const geo = {
      bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z),
      spawn: { x: p0.x, y: p0.y, z: p0.z },
    };
    phase.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    // 击退竞技场：内圈 3×3 空地（by..by+2）＋ 外圈 5×5 石墙（by..by+3）＋ 5×5 地板（by-1）。
    // 由来：mob 源伤害会给玩家**击退**（W-41 实测 walkDrain cm=10 后落 fall 5），
    // 无墙平台下 bot 被击出边沿 ⇒ 血量判点被 fall 伤污染。
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:dirt 0`);
        const wall = Math.abs(dx) === 2 || Math.abs(dz) === 2;
        for (const dy of [0, 1, 2]) {
          srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} ${wall ? 'minecraft:stone' : 'minecraft:air'} 0`);
        }
        if (wall) srv.send(`setblock ${geo.bx + dx} ${geo.by + 3} ${geo.bz + dz} minecraft:stone 0`);
      }
    }
    await sleep(1800);
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
    phase.posAfterTp = { x: p1.x, y: p1.y, z: p1.z };
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
    phase.rowCounts = {
      attacking: allRows.filter((r) => r.face === 'attacking').length,
      shearing: allRows.filter((r) => r.face === 'shearing').length,
      breaking: allRows.filter((r) => r.face === 'breaking').length,
      speed: srv.all.filter((l) => RE.speed.test(l)).length,
      deny: srv.all.filter((l) => RE.deny.test(l)).length,
      shearDrop: srv.all.filter((l) => RE.shearDrop.test(l)).length,
      reachDenied: srv.all.filter((l) => RE.reachDeny.test(l)).length,
    };
    phase.attackingRows = allRows.filter((r) => r.face === 'attacking');
    log(tag, 'rowCounts', JSON.stringify(phase.rowCounts));
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
  const ev = { tag: TAG, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [] };

  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.cfg = pinOf(CFG, PIN.cfg, 'cfg');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  ev.pins.mk = mkCounts();
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  log('pin', `dev=${ev.pins.devJar.bytes}/${ev.pins.devJar.sha} ${ev.pins.devJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `rel=${ev.pins.relJar.bytes}/${ev.pins.relJar.sha} ${ev.pins.relJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `cfg=${ev.pins.cfg.bytes}/${ev.pins.cfg.sha} ${ev.pins.cfg.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `props=${ev.pins.props.bytes}/${ev.pins.props.sha} ${ev.pins.props.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch (139/57/11 出现＝异常停窗) — refuse to run');
  if (fs.existsSync(path.join(ROOT, 'run', 'mods', 'etimextra-0.1.0.jar'))) {
    throw new Error('etimextra jar present in run/mods — this batch must run without it');
  }

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);

  ev.cfgSnapshot = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }
  log('config', `cfg ${ev.cfgSnapshot.bytes} B ${ev.cfgSnapshot.sha}`);
  log('config', `server.properties ${ev.propsSnapshot.bytes} B ${ev.propsSnapshot.sha}`);

  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  else propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  ev.propsWindow = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
  log('config', `level-name -> ${WORLD_NAME} / spawn-protection -> 0`);

  // 本窗零 cfg 编辑入 A 相：miningDebugLog=true 本就成立（cfg :363），blockDebugLog 全程 false。
  ev.cfgEditA = null;

  const pointsA = wantPhase('a') ? pick(POINTS_A) : [];
  const pointsG = wantPhase('g') ? pick(POINTS_G) : [];

  let restoreOk = false;
  try {
    if (pointsA.length) {
      await runPhase({ key: 'a', tag: TAG + '-a', bot: 'ETIM_W42A',
        label: 'A (miningReform=true)' }, pointsA, ev);
    }
    if (pointsG.length) {
      ev.cfgEditG = editConfig((t) => {
        if (!/B:miningReform=true/.test(t)) throw new Error('cfg has no B:miningReform=true');
        return t.replace('B:miningReform=true', 'B:miningReform=false');
      });
      log('config', `phase G cfg edit: miningReform=false (${ev.cfgEditG.bytes} B ${ev.cfgEditG.sha})`);
      await runPhase({ key: 'g', tag: TAG + '-g', bot: 'ETIM_W42G',
        label: 'G (miningReform=false)' }, pointsG, ev);
    }
  } finally {
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = { bytes: cfgAfter.length, sha: sha256(cfgAfter),
      identical: sha256(cfgAfter) === PIN.cfg.sha && cfgAfter.length === PIN.cfg.bytes };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter),
      identical: sha256(propsAfter) === PIN.props.sha && propsAfter.length === PIN.props.bytes };
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical (pin)' : 'MISMATCH'));
    log('config', 'server.properties restored ' + (ev.propsRestored.identical ? 'byte-identical (pin)' : 'MISMATCH'));
    restoreOk = ev.cfgRestored.identical && ev.propsRestored.identical;

    ev.sideRestored = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideRestored[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
      log('config', name + ' restored ' + (ev.sideRestored[name].identical ? 'byte-identical' : 'MISMATCH'));
    }
    restoreOk = restoreOk && Object.values(ev.sideRestored).every((s) => s.identical);

    const worldDir = path.join(ROOT, 'run', WORLD_NAME);
    if (fs.existsSync(worldDir)) {
      fs.rmSync(worldDir, { recursive: true, force: true });
      ev.worldDirRemoved = !fs.existsSync(worldDir);
      log('cleanup', 'world dir removed: ' + WORLD_NAME);
    }
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = {
      devJar: pinOf(DEVJAR, PIN.dev, 'dev'),
      relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      mk: mkCounts(),
    };
    ev.jarUpToDate = ev.phases.length > 0
      && ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
    ev.mixinErrors = ev.phases.flatMap((p) => p.mixinErrors || []);
  }

  // 计数总账（写死判）
  ev.ledger = {};
  for (const ph of ev.phases) {
    const want = LEDGER[ph.key];
    const got = ph.rowCounts || {};
    ev.ledger[ph.key] = {
      want, got,
      ok: !!want && got.attacking === want.attacking,
      sequence: (ph.attackingRows || []).map((r) => `${r.item}:${r.loss}`),
      otherChannelsZero: got.shearing === 0 && got.breaking === 0 && got.speed === 0
        && got.deny === 0 && got.shearDrop === 0 && got.reachDenied === 0,
    };
  }
  const ledgerOk = ONLY.length > 0
    ? ev.phases.length > 0
    : (ev.phases.length > 0 && Object.values(ev.ledger).every((l) => l.ok));

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = pointsA.length + pointsG.length;

  ev.verdict = (allPoints.length === expectPoints
      && allPoints.every((p) => p.pass)
      && ledgerOk
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok
      && ev.pinsAfter.mk.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate
      && ev.mixinErrors.length === 0) ? 'PASS' : 'FAIL';
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
