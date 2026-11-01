#!/usr/bin/env node
/**
 * unbreak-w50.js — unbreak 批（unbreaking 附魔面 · 非盾载体）W-50…W-61 判窗驱动
 *
 * 判决源（窗值唯一依据）：
 *   playground/audit/unbreak-立项摸底.md §6（12 点表）＋ §6.1 负证四向
 *   playground/audit/unbreak-终审回执.md §三（T-2 窗值全表 mean±3σ）＋ §五（T-5 五判值）
 *     ＋ §七 B-1…B-4 / U-1（W-56 排臂位＝0.6F 门丢失 270）＋ C-1…C-6
 *   audit20 条 209 A-3（甲件 0.6F 方向 / W-55/W-56 窗位互换 / float32 串）＋条 210
 *
 * 判据通道（全在役，零新建）：
 *   bot 栈读数   `bot.heldItem.durabilityUsed`（主口径；甲臂 = slots[5..8] 之和）
 *   [MiningLog]  `tool decay face=<face> item=<reg>[ block=<b>] loss=<N>`（值判，不判次：
 *                ETIMMining:743-760 last-sig 同键同值吞行）
 *   [EnchantLog] `table power=15 slot0=… slot1=… slot2=… power30=30 …`（W-60 附魔台算式）
 *   [TestLog]    `step=dig-start|dig-stop|attack|hurt|useitem|release`（驱动落点回执）
 *   [EtimTest]   `hold_set / enchant_set / level_set / health_set`（命令回执）
 *
 * 12 判点（单 boot；n 与窗按终审 §三定死，不边跑边改）：
 *   W-50 白板秘银镐×stone×6     → Δdur 恰 1440（定标臂，方差 0）
 *   W-51 L1 ×6 挖               → 720.00 ∈ [663.08, 776.92]
 *   W-52 L2 ×6 挖               → 480.00 ∈ [426.33, 533.67]
 *   W-53 L3 ×6 挖               → 360.00 ∈ [310.70, 409.30]
 *   W-54 L3 攻击 ×12（zombie 200HP）→ 300.00 ∈ [255.00, 345.00]
 *   W-55 秘银四件套 L1 受击 ×120 → 864.00 ∈ [824.56, 903.44]（排臂：工具支 540）
 *   W-56 秘银四件套 L3 受击 ×120 → 756.00 ∈ [710.82, 801.18]（跨代判别主层）
 *   W-57 弓 L3 放箭 ×140         → 35.00 ∈ [19.63, 50.37]
 *   W-58 presence：铲×dirt / 斧×log / 锄×dirt → Δdur>0 ＋ loss=25/120/100
 *   W-59 创造门：同镐挖 stone → Δdur=0（breaking 面 loss=0 行 1.12 结构不可达 → B-1；
 *        旁证 W-59x＝创造持同镐攻击 ⇒ attacking loss=0 行，门行仍可读）
 *   W-60 enchantability=0：锈铁镐 enchantprobe 三档全 0；秘银镐对照非 0
 *   W-61 鱼竿到达性 ×5           → 每次 Δdur ∈ {0,1,2,3,5}（C 级，只判可达）
 *
 * 用法：node unbreak-w50.js [tag]
 *   W50_ONLY=W50,W58（判点裁剪）｜W50_STAGE=<tag>（.out 名隔离）｜W50_SMOKE=1（缩样冒烟，不判）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'unbreak-w50';
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

const WORLD = 'unbreakw50';
const PORT = 25565;
const BOT = 'ETIM_W50';
const MOB_SEL = '@e[tag=unbZ]';
const MOB_NBT = '{Tags:["unbZ"],NoAI:1b,Silent:1b,PersistenceRequired:1b,'
  + 'Attributes:[{Name:"generic.maxHealth",Base:200.0}],Health:200.0f}';

const SMOKE = process.env.W50_SMOKE === '1';
const ONLY = (process.env.W50_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const STAGE = (process.env.W50_STAGE || TAG).trim();

const N_DIG = 6;
const N_ATTACK = SMOKE ? 3 : 12;
const N_STRIKE = SMOKE ? 25 : 120;
const N_SHOT = SMOKE ? 10 : 140;
const N_FISH = SMOKE ? 3 : 5;

/** 起收钉（commit 9d75649；本批零 cfg 写：三键全默认）。 */
const PIN = {
  head: '9d75649',
  rel: { bytes: 776797, sha: '1073A59A7A14BEE94908199205FB912E32B5F3C4E94116694427A8EF3E998B3E' },
  dev: { bytes: 760949, sha: '8BC04E70C0CA0B2DFEBA9953DD34648C7FB5CE552337F5DE9589967728EBF421' },
  src: { bytes: 705207, sha: 'E4B38D9EAC146603803542E9778067F283A92B709DC1011A21DCAF8607DA417F' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30277, sha: 'E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉：本批零产品码、零 mixin 面改动。 */
const MK_PIN = {
  mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138,
  sword: 4, tool: 4, shears: 3, sliceTotal: 11,
};

/** 窗（终审 §三 T-2 定稿，mean±3σ；R196 窗只作对照不判据）。 */
const WIN = {
  W51: [663.08, 776.92],
  W52: [426.33, 533.67],
  W53: [310.70, 409.30],
  W54: [255.00, 345.00],
  W55: [824.56, 903.44],
  W56: [710.82, 801.18],
  W57: [19.63, 50.37],
};

/* ============================ 判行正则 ============================ */

const RE = {
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(\d+)/,
  table: /\[EnchantLog\] table power=15 slot0=(\d+) slot1=(\d+) slot2=(\d+) power30=30 slot0=(\d+) slot1=(\d+) slot2=(\d+)/,
  probe: /\[EnchantLog\] enchantprobe slot=(\S+) item=(\S+)/,
  stepHurt: /\[TestLog\] step=hurt .*(?:amount=|NO_TARGET)/,
  stepAttack: /\[TestLog\] step=attack .*(?:target=|NO_TARGET)/,
  stepDigStop: /\[TestLog\] step=dig-stop player=(\S+) pos=/,
  stepUse: /\[TestLog\] step=(useitem|release) player=(\S+)/,
  holdSet: /\[EtimTest\] commands\.etest\.hold_set/,
  enchantSet: /\[EtimTest\] commands\.etest\.enchant_set/,
  levelSet: /\[EtimTest\] commands\.etest\.level_set/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  done: /Done \(/,
  noTarget: /step=(attack|hurt) player=\S+ NO_TARGET/,
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

function cfgValue(text, key) {
  const m = new RegExp('^[ \\t]*[A-Z]:' + key + '=(\\S+)', 'm').exec(text);
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
    const dead = srv.exited || srv.all.some((l) => /BUILD FAILED|insufficient memory|FAILURE: Build failed/.test(l));
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

/** 9×9 石台（by−1 地台＋by..by+3 净空）。 */
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
  await sleep(2600);
  return { cells: (2 * R + 1) * (2 * R + 1) };
}

/** W-61 水池：地台 −x 侧 by−1 层 6×5 水，上方 by..by+2 净空。 */
async function buildPool(srv, geo) {
  let cells = 0;
  for (let dx = -9; dx <= -5; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:water 0`);
      for (const dy of [0, 1, 2]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
      }
      cells++;
    }
  }
  await sleep(1600);
  return { cells };
}

/* ============================ 栈读数 ============================ */

const durOf = (bot) => {
  const it = bot && bot.heldItem;
  if (!it) return null;
  return it.durabilityUsed === undefined || it.durabilityUsed === null ? 0 : it.durabilityUsed;
};

const heldInfo = (bot) => {
  const it = bot && bot.heldItem;
  if (!it) return null;
  return {
    name: it.name, type: it.type, count: it.count,
    damage: it.durabilityUsed === undefined ? 0 : it.durabilityUsed,
    max: it.maxDurability === undefined ? null : it.maxDurability,
  };
};

/** 甲臂：ContainerPlayer 5..8 = head/chest/legs/feet。 */
const armorDurs = (bot) => {
  if (!bot || !bot.inventory || !bot.inventory.slots) return [null, null, null, null];
  return [5, 6, 7, 8].map((i) => {
    const s = bot.inventory.slots[i];
    if (!s) return null;
    return s.durabilityUsed === undefined || s.durabilityUsed === null ? 0 : s.durabilityUsed;
  });
};
const sumOr = (a) => (a.some((x) => x === null) ? null : a.reduce((x, y) => x + y, 0));

async function waitArmorDelta(bot, before, timeoutMs = 1500) {
  const t0 = Date.now();
  let cur = sumOr(armorDurs(bot));
  while (Date.now() - t0 < timeoutMs) {
    cur = sumOr(armorDurs(bot));
    if (cur !== null && before !== null && cur > before) return cur;
    await sleep(60);
  }
  return cur;
}

async function waitDur(bot, before, timeoutMs = 1500) {
  const t0 = Date.now();
  let cur = durOf(bot);
  while (Date.now() - t0 < timeoutMs) {
    cur = durOf(bot);
    if (cur !== null && cur !== before) return cur;
    await sleep(60);
  }
  return cur;
}

async function waitAir(bot, pos, timeoutMs = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    let b = null;
    try { b = bot.blockAt(pos); } catch (e) { b = null; }
    if (b && b.name === 'air') return true;
    await sleep(150);
  }
  return false;
}

/** 服务端口径的方块真值：`/testforblock <pos> minecraft:air`（bot.blockAt 对 setblock 后的
 *  区块镜像不总刷新；且 1.12 的 dig 进度在 STOP 后仍会继续推进到 1.0 才落块——
 *  首次窗口实测落块比 STOP 晚 ~1 s，故此处以 8 s 上限串行化，确保下一击不与旧 dig 循环重叠）。 */
async function confirmAir(srv, pos, tries = 80) {
  for (let i = 0; i < tries; i++) {
    const from = srv.all.length;
    srv.send(`testforblock ${pos.x} ${pos.y} ${pos.z} minecraft:air`);
    const line = await srv.waitFor(/Successfully found the block|The block at|That position is not loaded/, 2500, from);
    if (line && /Successfully found the block/.test(line)) return true;
    await sleep(200);
  }
  return false;
}

/* ============================ 动作原语 ============================ */

async function say(srv, text) {
  const from = srv.all.length;
  srv.send(`say ${text}`);
  await srv.waitFor(new RegExp('\\[Server\\] ' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 6000, from);
  await sleep(120);
  return from;
}

/** `/etest hold <item>`（fresh 白板栈）＋ 回执 ＋ bot 面板对账。 */
async function holdFresh(srv, bot, item) {
  const from = srv.all.length;
  srv.send(`etest hold ${item} ${BOT}`);
  const line = await srv.waitFor(RE.holdSet, 5000, from);
  await sleep(500);
  if (!bot.heldItem) throw new Error('hold: bot.heldItem is null after /etest hold ' + item);
  return { item, receipt: line ? stripPrefix(line) : null, dur: durOf(bot), held: heldInfo(bot) };
}

async function enchant(srv, level) {
  const from = srv.all.length;
  srv.send(`enchant ${BOT} unbreaking ${level}`);
  const line = await srv.waitFor(RE.enchantSet, 5000, from);
  await sleep(350);
  return line ? stripPrefix(line) : null;
}

/** `/etest dig` 一拍：setblock → START/STOP（40t）→ 等空气。 */
async function digOnce(srv, bot, block, pos) {
  srv.send(`setblock ${pos.x} ${pos.y} ${pos.z} ${block} 0`);
  await sleep(230);
  const from = srv.all.length;
  srv.send(`etest dig ${pos.x} ${pos.y} ${pos.z} ${BOT}`);
  const stop = await srv.waitFor(RE.stepDigStop, 9000, from);
  const air = await confirmAir(srv, pos);
  await sleep(120);
  return { stop: stop ? stripTranslate(stop) : null, air };
}

const stripTranslate = (l) => stripPrefix(l);

/** `/etest hurt <mob-selector> 9` 一记（causeMobDamage ⇒ 不过甲门、无 level 近战系数污染）。 */
async function hurtOnce(srv, amount) {
  const from = srv.all.length;
  srv.send(`etest hurt ${MOB_SEL} ${amount} ${BOT}`);
  const line = await srv.waitFor(RE.stepHurt, 5000, from);
  if (!line || /NO_TARGET/.test(line)) return null;
  return stripPrefix(line);
}

/** `/etimghost hurt <bot> 9 false` —— 备用受击口（无选择器，book 在役通道）。 */
async function hurtGhost(srv, amount) {
  const from = srv.all.length;
  srv.send(`etimghost hurt ${BOT} ${amount} false`);
  const line = await srv.waitFor(RE.stepHurt, 5000, from);
  return line && !/NO_TARGET/.test(line) ? stripPrefix(line) : null;
}

/** 靶场僵尸单体重建（kill→summon：matchOneEntity 要求恰 1 命中，重复即 NO_TARGET）。 */
async function ensureZombie(srv, point) {
  srv.send(`kill ${MOB_SEL}`);
  await sleep(220);
  srv.send(`summon minecraft:zombie ${point.zombie.x} ${point.zombie.y} ${point.zombie.z} ${MOB_NBT}`);
  await sleep(1200);
  return { rebuilt: true, health: await zombieHealth(srv, point) };
}

/** `/entitydata <tag> Health` 读靶血（W-54 200HP 防 12 击内死的旁证）。 */
async function zombieHealth(srv, point) {
  const from = srv.all.length;
  srv.send(`entitydata ${MOB_SEL} Health`);
  const line = await srv.waitFor(/has the following entity data|found nothing|Unable to/, 3000, from);
  return line ? stripPrefix(line) : null;
}

async function attackOnce(srv, sel) {
  const from = srv.all.length;
  srv.send(`etest attack ${sel} ${BOT}`);
  const line = await srv.waitFor(RE.stepAttack, 5000, from);
  if (!line) return { ok: false, miss: 'no step line' };
  if (/NO_TARGET/.test(line)) return { ok: false, miss: stripPrefix(line) };
  return { ok: true, line: stripPrefix(line) };
}

/** 秘银四件套（ench id 34 = unbreaking）＋ bot 面板对账。 */
async function equipArmor(srv, bot, lvl) {
  const pieces = [
    ['slot.armor.head', 'etim:helmet_mithril'],
    ['slot.armor.chest', 'etim:chestplate_mithril'],
    ['slot.armor.legs', 'etim:leggings_mithril'],
    ['slot.armor.feet', 'etim:boots_mithril'],
  ];
  for (const [slot, item] of pieces) {
    srv.send(`replaceitem entity ${BOT} ${slot} ${item} 1 0 {ench:[{id:34s,lvl:${lvl}s}]}`);
  }
  await sleep(900);
  const d = armorDurs(bot);
  if (d.some((x) => x === null)) {
    await sleep(900);
    const d2 = armorDurs(bot);
    return d2;
  }
  return d;
}

/* ============================ 判行收集 ============================ */

function collect(srv, from, to) {
  const out = { decay: [], table: [], probe: [], steps: [] };
  for (let i = from; i < to; i++) {
    const l = srv.all[i];
    let m = RE.decay.exec(l);
    if (m) {
      out.decay.push({
        idx: i + 1, ts: logTime(l), face: m[1], item: m[2], block: m[3] || null, loss: +m[4],
        raw: stripPrefix(l),
      });
    }
    m = RE.table.exec(l);
    if (m) {
      out.table.push({
        idx: i + 1, ts: logTime(l),
        p15: [+m[1], +m[2], +m[3]], p30: [+m[4], +m[5], +m[6]],
        raw: stripPrefix(l),
      });
    }
    m = RE.probe.exec(l);
    if (m) out.probe.push({ idx: i + 1, ts: logTime(l), slot: m[1], item: m[2], raw: stripPrefix(l) });
    if (/\[TestLog\] step=/.test(l)) out.steps.push({ idx: i + 1, ts: logTime(l), raw: stripPrefix(l) });
  }
  return out;
}

/* ============================ 单点执行 ============================ */

function inWin(v, w) {
  return typeof v === 'number' && v >= w[0] && v <= w[1];
}

async function runPoint(srv, bot, ctx, p) {
  const rec = {
    id: p.id, group: p.group, note: p.note, checks: [], cmds: [],
    observed: {}, smoke: SMOKE,
  };
  log(p.id, 'start', p.note);
  const from = await say(srv, `UNB-${p.id}-BEGIN`);
  rec.segFrom = from;

  const point = ctx.geo;
  try {
    if (p.id === 'W50' || p.id === 'W51' || p.id === 'W52' || p.id === 'W53') {
      const lvl = { W50: 0, W51: 1, W52: 2, W53: 3 }[p.id];
      const hold = await holdFresh(srv, bot, 'etim:pickaxe_mithril');
      rec.observed.held = hold.held;
      if (lvl > 0) rec.cmds.push({ ts: stamp(), cmd: `enchant ${BOT} unbreaking ${lvl}` });
      if (lvl > 0) await enchant(srv, lvl);
      const d0 = durOf(bot);
      const perDig = [];
      for (let i = 0; i < N_DIG; i++) {
        const r = await digOnce(srv, bot, 'minecraft:stone', point.dig);
        await sleep(60);
        perDig.push({ i: i + 1, dur: durOf(bot), air: r.air });
        rec.cmds.push({ ts: stamp(), cmd: `dig stone #${i + 1}` });
      }
      const d1 = durOf(bot);
      rec.observed.d0 = d0;
      rec.observed.d1 = d1;
      rec.observed.delta = (d0 !== null && d1 !== null) ? d1 - d0 : null;
      rec.observed.perDig = perDig;
      for (const x of perDig) if (!x.air) rec.checks.push({ k: `dig${x.i}.air`, want: true, got: false, ok: false });
      if (p.id === 'W50') {
        const steps = perDig.map((x, i) => x.dur - (i === 0 ? d0 : perDig[i - 1].dur));
        rec.observed.perDigDelta = steps;
        rec.checks.push({
          k: 'perDigDelta240', want: '6×240', got: steps.join('|'),
          ok: steps.length === 6 && steps.every((v) => v === 240),
        });
        rec.checks.push({ k: 'delta', want: 1440, got: rec.observed.delta, ok: rec.observed.delta === 1440 });
        const row = collect(srv, from, srv.all.length).decay
          .filter((d) => d.face === 'breaking' && d.item === 'etim:pickaxe_mithril' && d.block === 'stone');
        rec.checks.push({
          k: 'row.breaking.loss240', want: 'loss=240',
          got: row.map((d) => d.loss).join('|') || '(none)',
          ok: row.length >= 1 && row.every((d) => d.loss === 240),
        });
      } else {
        const w = WIN[p.id];
        rec.checks.push({
          k: 'delta', want: `[${w[0]}, ${w[1]}]`, got: rec.observed.delta,
          ok: inWin(rec.observed.delta, w),
        });
      }
    } else if (p.id === 'W54') {
      await holdFresh(srv, bot, 'etim:pickaxe_mithril');
      await enchant(srv, 3);
      srv.send(`kill ${MOB_SEL}`);
      await sleep(200);
      srv.send(`summon minecraft:zombie ${point.zombie.x} ${point.zombie.y} ${point.zombie.z} ${MOB_NBT}`);
      await sleep(1400);
      rec.observed.zombieHealth = await zombieHealth(srv, point);
      const d0 = durOf(bot);
      let accepted = 0;
      let attempts = 0;
      const miss = [];
      while (accepted < N_ATTACK && attempts < N_ATTACK + 8) {
        attempts++;
        srv.send(`tp ${MOB_SEL} ${point.zombie.x} ${point.zombie.y} ${point.zombie.z}`);
        await sleep(220);
        const before = durOf(bot);
        const r = await attackOnce(srv, MOB_SEL);
        if (!r.ok) {
          miss.push(r.miss);
          await ensureZombie(srv, point);
          continue;
        }
        await sleep(1150);
        const after = durOf(bot);
        if (before !== null && after !== null && after > before) accepted++;
        else miss.push('no wear #' + attempts);
      }
      rec.observed.zombieHealthAfter = await zombieHealth(srv, point);
      const d1 = durOf(bot);
      rec.observed = {
        d0, d1, delta: d1 - d0, accepted, attempts, miss,
        window: WIN.W54,
      };
      rec.checks.push({ k: 'attacks', want: N_ATTACK, got: accepted, ok: accepted === N_ATTACK });
      rec.checks.push({ k: 'delta', want: `[${WIN.W54[0]}, ${WIN.W54[1]}]`, got: d1 - d0, ok: inWin(d1 - d0, WIN.W54) });
      const row = collect(srv, from, srv.all.length).decay
        .filter((d) => d.face === 'attacking' && d.item === 'etim:pickaxe_mithril');
      rec.checks.push({
        k: 'row.attacking.loss100', want: 'loss=100',
        got: row.map((d) => d.loss).join('|') || '(none)',
        ok: row.length >= 1 && row.every((d) => d.loss === 100),
      });
    } else if (p.id === 'W55' || p.id === 'W56') {
      const lvl = p.id === 'W55' ? 1 : 3;
      srv.send(`etest level 35 ${BOT}`);
      await sleep(400);
      const zres = await ensureZombie(srv, point);
      rec.observed.zombie = zres;
      const armor0 = await equipArmor(srv, bot, lvl);
      srv.send(`etest health 20 ${BOT}`);
      await sleep(400);
      const before = sumOr(armor0);
      if (before === null) throw new Error(p.id + ': armor slots not synced (null)');
      let accepted = 0;
      let attempts = 0;
      const miss = [];
      let heals = 0;
      let srcMode = 'mob';
      let failStreak = 0;
      while (accepted < N_STRIKE && attempts < N_STRIKE + 20) {
        attempts++;
        if (bot.health !== null && bot.health !== undefined && bot.health <= 6) {
          srv.send(`etest health 20 ${BOT}`);
          heals++;
          await sleep(200);
        }
        const b = sumOr(armorDurs(bot));
        const line = srcMode === 'mob' ? await hurtOnce(srv, 9) : await hurtGhost(srv, 9);
        if (!line) {
          failStreak++;
          miss.push(`no step(${srcMode}) #` + attempts);
          if (srcMode === 'mob' && failStreak >= 3) {
            srcMode = 'etimghost';
            failStreak = 0;
            log(p.id, 'source fallback → etimghost');
          }
          continue;
        }
        failStreak = 0;
        const a = await waitArmorDelta(bot, b, 1200);
        if (a !== null && b !== null && a > b) accepted++;
        else miss.push('no wear #' + attempts);
        await sleep(520); // ≥11 t 出手间隔（hurtResistantTime=20 的半窗）
        if (accepted > 0 && accepted % 10 === 0) {
          srv.send(`etest health 20 ${BOT}`);
          srv.send(`tp ${BOT} ${point.bx + 0.5} ${point.by} ${point.bz + 0.5}`); // 击退回中
          heals++;
          await sleep(220);
        }
      }
      const after = sumOr(armorDurs(bot));
      const w = WIN[p.id];
      rec.observed = {
        lvl, armor0, after, delta: after - before, accepted, attempts, miss, heals,
        window: w, health: bot.health, source: srcMode,
      };
      rec.checks.push({ k: 'strikes', want: N_STRIKE, got: accepted, ok: accepted === N_STRIKE });
      rec.checks.push({ k: 'delta', want: `[${w[0]}, ${w[1]}]`, got: after - before, ok: inWin(after - before, w) });
      rec.checks.push({
        k: 'armorIntact', want: 'no null slot',
        got: armorDurs(bot).join('|'), ok: sumOr(armorDurs(bot)) !== null,
      });
      if (p.id === 'W55') {
        rec.checks.push({
          k: 'exclude.tool540', want: 'not in [490.70, 589.30]',
          got: after - before, ok: !inWin(after - before, [490.70, 589.30]),
        });
      }
    } else if (p.id === 'W57') {
      await holdFresh(srv, bot, 'minecraft:bow');
      await enchant(srv, 3);
      // 1.12 /give 上限 64/次 ⇒ 分四次给 256 支（N_SHOT=140）
      for (let g = 0; g < 4; g++) srv.send(`give ${BOT} minecraft:arrow 64`);
      await sleep(900);
      const arrowsBefore = countArrows(bot);
      const d0 = durOf(bot);
      let shots = 0;
      const miss = [];
      for (let i = 0; i < N_SHOT; i++) {
        const fromI = srv.all.length;
        srv.send(`etest useitem ${BOT}`);
        const u = await srv.waitFor(RE.stepUse, 4000, fromI);
        if (!u) { miss.push('useitem #' + i); continue; }
        await sleep(1120); // ≥20 t 蓄力
        const fromR = srv.all.length;
        srv.send(`etest release ${BOT}`);
        const r = await srv.waitFor(RE.stepUse, 4000, fromR);
        if (!r) { miss.push('release #' + i); continue; }
        shots++;
        await sleep(160);
        if ((i + 1) % 30 === 0) { srv.send('kill @e[type=arrow]'); await sleep(150); }
      }
      const d1 = durOf(bot);
      const arrowsAfter = countArrows(bot);
      const w = WIN.W57;
      rec.observed = {
        d0, d1, delta: d1 - d0, shots, miss, arrowsBefore, arrowsAfter, window: w,
      };
      rec.checks.push({ k: 'shots', want: N_SHOT, got: shots, ok: shots === N_SHOT });
      rec.checks.push({ k: 'delta', want: `[${w[0]}, ${w[1]}]`, got: d1 - d0, ok: inWin(d1 - d0, w) });
      rec.checks.push({
        k: 'arrowConsumed', want: '>= ' + Math.floor(N_SHOT * 0.9),
        got: (arrowsBefore === null || arrowsAfter === null) ? 'n/a' : arrowsBefore - arrowsAfter,
        ok: arrowsBefore !== null && arrowsAfter !== null && (arrowsBefore - arrowsAfter) >= Math.floor(N_SHOT * 0.9),
      });
    } else if (p.id === 'W58') {
      const arms = [
        { id: 'shovel', item: 'etim:shovel_mithril', block: 'minecraft:dirt', pos: point.dig, loss: 25 },
        { id: 'axe', item: 'etim:axe_mithril', block: 'minecraft:log', pos: point.dig2, loss: 120 },
        { id: 'hoe', item: 'etim:hoe_mithril', block: 'minecraft:dirt', pos: point.dig2, loss: 100 },
      ];
      const obs = [];
      for (const a of arms) {
        await holdFresh(srv, bot, a.item);
        const d0 = durOf(bot);
        const r = await digOnce(srv, bot, a.block, a.pos);
        await sleep(200);
        const d1 = durOf(bot);
        obs.push({ arm: a.id, item: a.item, block: a.block, d0, d1, delta: d1 - d0, air: r.air, wantLoss: a.loss });
      }
      const rows = collect(srv, from, srv.all.length).decay.filter((d) => d.face === 'breaking');
      for (const o of obs) {
        const hit = rows.filter((d) => d.item === o.item);
        rec.checks.push({ k: `${o.arm}.delta>0`, want: '>0', got: o.delta, ok: o.delta > 0 });
        rec.checks.push({ k: `${o.arm}.air`, want: true, got: o.air, ok: o.air === true });
        rec.checks.push({
          k: `${o.arm}.loss=${o.wantLoss}`, want: String(o.wantLoss),
          got: hit.map((d) => d.loss).join('|') || '(none)',
          ok: hit.length >= 1 && hit.every((d) => d.loss === o.wantLoss),
        });
      }
      rec.observed.arms = obs;
      rec.observed.rows = rows;
    } else if (p.id === 'W59') {
      await holdFresh(srv, bot, 'etim:pickaxe_mithril');
      srv.send(`gamemode 1 ${BOT}`);
      await sleep(500);
      const d0 = durOf(bot);
      const r = await digOnce(srv, bot, 'minecraft:stone', point.dig);
      await sleep(250);
      const d1 = durOf(bot);
      const rows = collect(srv, from, srv.all.length).decay
        .filter((d) => d.face === 'breaking' && d.item === 'etim:pickaxe_mithril' && d.block === 'stone');
      rec.observed.breaking = { d0, d1, delta: d1 - d0, air: r.air, rows };
      // 旁证 W-59x：创造相攻击（attacking 面 loss=0 行＝创造门同门可达位）。
      // 单体重建：W-57 的 140 箭可能已把靶打死（首窗实测）。
      rec.observed.zombie = await ensureZombie(srv, point);
      srv.send(`tp ${MOB_SEL} ${point.zombie.x} ${point.zombie.y} ${point.zombie.z}`);
      await sleep(250);
      const xa = await attackOnce(srv, MOB_SEL);
      await sleep(900);
      const xrows = collect(srv, from, srv.all.length).decay
        .filter((d) => d.face === 'attacking' && d.item === 'etim:pickaxe_mithril');
      const d2 = durOf(bot);
      rec.observed.witness = { attack: xa, rows: xrows, d2, delta: d2 - d1 };
      srv.send(`gamemode 0 ${BOT}`);
      await sleep(400);
      rec.checks.push({ k: 'breaking.delta', want: 0, got: d1 - d0, ok: d1 - d0 === 0 });
      rec.checks.push({ k: 'breaking.air', want: true, got: r.air, ok: r.air === true });
      rec.checks.push({
        k: 'witness.attacking.loss0', want: 'loss=0',
        got: xrows.map((d) => d.loss).join('|') || '(none)',
        ok: xrows.length >= 1 && xrows.every((d) => d.loss === 0),
      });
      rec.checks.push({ k: 'witness.delta', want: 0, got: d2 - d1, ok: d2 - d1 === 0 });
      rec.observed.breakingRow = rows.map((d) => `loss=${d.loss}`).join('|') || '(none)';
      rec.observed.breakingRowNote = '1.12 PlayerInteractionManager:333-337 创造分支不调用 onBlockDestroyed(:346) ⇒ breaking 面 loss=0 行结构不可达（B-1 登记）；创造门行由 W-59x attacking 面读取';
    } else if (p.id === 'W60') {
      const arms = [];
      for (const [item, label] of [['etim:pickaxe_rusted_iron', 'rusted'], ['etim:pickaxe_mithril', 'mithril']]) {
        await holdFresh(srv, bot, item);
        const fromP = srv.all.length;
        srv.send(`etest enchantprobe mainhand none ${BOT}`);
        const line = await srv.waitFor(RE.table, 6000, fromP);
        await sleep(250);
        const rows = collect(srv, fromP, srv.all.length).table;
        arms.push({ label, item, line: line ? stripPrefix(line) : null, rows });
      }
      rec.observed.arms = arms;
      const rusted = arms[0].rows;
      const mith = arms[1].rows;
      const allZero = rusted.length >= 1 && rusted.every((r) => r.p15.every((v) => v === 0) && r.p30.every((v) => v === 0));
      rec.checks.push({
        k: 'rusted.allZero', want: 'p15/p30 六格全 0',
        got: rusted.map((r) => `p15=${r.p15.join(',')} p30=${r.p30.join(',')}`).join(' | ') || '(none)',
        ok: allZero,
      });
      const m = mith[0] || null;
      rec.checks.push({
        k: 'mithril.slot0>0', want: '>0', got: m ? m.p15[0] : null,
        ok: !!m && m.p15[0] > 0,
      });
      rec.checks.push({
        k: 'mithril.slot1>0', want: '>0', got: m ? m.p15[1] : null,
        ok: !!m && m.p15[1] > 0,
      });
      rec.checks.push({
        k: 'mithril.slot2=30', want: 30, got: m ? m.p15[2] : null,
        ok: !!m && m.p15[2] === 30,
      });
      rec.observed.bound = m ? { slot0: m.p15[0] >= 2 && m.p15[0] <= 10, slot1: m.p15[1] >= 6 && m.p15[1] <= 21 } : null;
    } else if (p.id === 'W61') {
      await holdFresh(srv, bot, 'minecraft:fishing_rod');
      await bot.look(Math.PI / 2, -0.60, true); // yaw 90° = 朝 −x（水池侧），下俯 34°
      await sleep(300);
      const perCast = [];
      for (let i = 0; i < N_FISH; i++) {
        const d0 = durOf(bot);
        const f1 = srv.all.length;
        srv.send(`etest useitem ${BOT}`);
        const u = await srv.waitFor(RE.stepUse, 4000, f1);
        await sleep(1500); // 落钩
        const f2 = srv.all.length;
        srv.send(`etest useitem ${BOT}`);
        const r = await srv.waitFor(RE.stepUse, 4000, f2);
        await sleep(700);
        const d1 = durOf(bot);
        perCast.push({ i: i + 1, d0, d1, delta: d1 - d0, cast: !!u, reel: !!r });
      }
      const domain = [0, 1, 2, 3, 5];
      rec.observed.perCast = perCast;
      for (const c of perCast) {
        rec.checks.push({
          k: `cast${c.i}.delta`, want: '{0,1,2,3,5}', got: c.delta,
          ok: c.delta !== null && domain.includes(c.delta),
        });
      }
      rec.checks.push({
        k: 'reachable', want: '>=1 次 Δdur>0（可达）', got: perCast.filter((c) => c.delta > 0).length,
        ok: perCast.some((c) => c.delta > 0),
      });
    } else {
      throw new Error('unknown point ' + p.id);
    }
  } catch (e) {
    rec.fatal = (e && e.stack) || String(e);
    log(p.id, 'FATAL', rec.fatal);
  }

  await sleep(250);
  await say(srv, `UNB-${p.id}-END`);
  rec.segTo = srv.all.length;
  rec.rows = collect(srv, rec.segFrom, rec.segTo);
  rec.pass = !rec.fatal && rec.checks.length > 0 && rec.checks.every((c) => c.ok);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    JSON.stringify({ obs: rec.observed && rec.observed.delta, bad: rec.checks.filter((c) => !c.ok) }));
  return rec;
}

function countArrows(bot) {
  try {
    const items = bot.inventory.items();
    return items.filter((i) => i.name === 'arrow' || i.type === 262).reduce((a, i) => a + i.count, 0);
  } catch (e) {
    return null;
  }
}

/* ============================ 主流程 ============================ */

const ALL_POINTS = [
  { id: 'W50', group: 'TOOL', note: '白板秘银镐 × stone ×6（定标臂：Δdur=1440 恰值）' },
  { id: 'W51', group: 'TOOL', note: 'L1 ×6 挖（vanilla q=0.5）' },
  { id: 'W52', group: 'TOOL', note: 'L2 ×6 挖（vanilla q=1/3）' },
  { id: 'W53', group: 'TOOL', note: 'L3 ×6 挖（vanilla q=0.25）' },
  { id: 'W54', group: 'ATTACK', note: 'L3 攻击 ×12（zombie 200HP，间隔 ≥21t）' },
  { id: 'W55', group: 'ARMOR', note: '秘银四件套 L1 受击 ×120（甲件支 0.6F 门）' },
  { id: 'W56', group: 'ARMOR', note: '秘银四件套 L3 受击 ×120（跨代判别主层）' },
  { id: 'W57', group: 'BOW', note: '弓 L3 放箭 ×140' },
  { id: 'W58', group: 'PRESENCE', note: '铲×dirt / 斧×log / 锄×dirt（loss 逐值）' },
  { id: 'W59', group: 'NEG', note: '创造门：breaking Δdur=0 ＋ W-59x attacking loss=0 旁证' },
  { id: 'W60', group: 'NEG', note: 'enchantability=0：锈铁三档全 0 / 秘银对照非 0' },
  { id: 'W61', group: 'REACH', note: '鱼竿到达性 ×5（域 {0,1,2,3,5}）' },
];

function pick(list) {
  return ONLY.length ? list.filter((p) => ONLY.includes(p.id)) : list;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, stage: STAGE, only: ONLY, smoke: SMOKE,
    startedAt: new Date().toISOString(), workspace: ROOT,
    pins: {}, points: [], bootCount: 1,
    counts: { N_DIG, N_ATTACK, N_STRIKE, N_SHOT, N_FISH },
  };

  // ---------- 起窗钉 ----------
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

  // 三键前提（零 cfg 写：只读校验）
  const cfgText = fs.readFileSync(CFG, 'utf8');
  ev.cfgFlags = {
    miningReform: cfgValue(cfgText, 'miningReform'),
    miningDebugLog: cfgValue(cfgText, 'miningDebugLog'),
    armorModelR196: cfgValue(cfgText, 'armorModelR196'),
    attackHungerPerHit: cfgValue(cfgText, 'attackHungerPerHit'),
    enduranceModifierStep: cfgValue(cfgText, 'enduranceModifierStep'),
  };
  log('config', JSON.stringify(ev.cfgFlags));
  if (ev.cfgFlags.miningReform !== 'true' || ev.cfgFlags.miningDebugLog !== 'true'
    || ev.cfgFlags.armorModelR196 !== 'true') {
    throw new Error('cfg 前提键不中（miningReform/miningDebugLog/armorModelR196）— refuse to run');
  }

  // ---------- 窗前面快照（原字节） ----------
  ev.cfgSnap = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.cfgClientSnap = snapshot(CFG_CLIENT, TAG + '-client-etim.cfg.before');
  ev.propsSnap = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }

  // ---------- props：隔离世界 ----------
  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  fs.writeFileSync(PROPS, propEdit, 'utf8');

  // ---------- 单 boot ----------
  const srv = await startServer({ root: ROOT, tag: STAGE });
  let bot = null;
  try {
    const done = await waitReady(srv, STAGE);
    if (!done) throw new Error('server never reached Done( within 480s');
    ev.boot = {
      ready: stripPrefix(done.trim()),
      readyTs: logTime(done),
      readyIdx: srv.all.indexOf(done) + 1,
      modGather: srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null,
      levelLine: (srv.all.find((l) => /Preparing level "/.test(l)) || '').trim(),
      jarTask: srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l)),
      buildLine: (srv.all.find((l) => /BUILD SUCCESSFUL|BUILD FAILED/.test(l)) || '').trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8),
    };
    log('boot', `Done — ${ev.boot.ready} @ ${ev.boot.readyTs} (idx ${ev.boot.readyIdx})`);

    bot = await connectBot();
    // 判窗操作员升级：@e 选择器（canUseCommand(1,"@")）与出生点保护豁免（isSpawnProtected 的
    // canUseCommand(2)）都需要权限；ops.json 已快照，收口 byte-identical 还原。
    srv.send(`op ${BOT}`);
    await sleep(600);
    try { bot.setQuickBarSlot(0); } catch (e) { /* ignore */ }
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('gamerule keepInventory true');
    srv.send('difficulty 2');
    srv.send('time set 18000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    srv.send(`etest level 35 ${BOT}`);
    await sleep(2200);

    const p0 = bot.entity.position;
    const geo = { bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z) };
    geo.dig = { x: geo.bx + 2, y: geo.by, z: geo.bz };
    geo.dig2 = { x: geo.bx + 2, y: geo.by, z: geo.bz + 2 };
    geo.zombie = { x: geo.bx + 0.5, y: geo.by, z: geo.bz + 2.5 };
    ev.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    ev.arena = await buildArena(srv, geo);
    ev.pool = await buildPool(srv, geo);
    srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1800);
    let p1 = bot.entity.position;
    let grounded = Math.abs(p1.y - geo.by) < 0.9
      && Math.abs(p1.x - (geo.bx + 0.5)) < 1.2 && Math.abs(p1.z - (geo.bz + 0.5)) < 1.2;
    if (!grounded) {
      srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1800);
      p1 = bot.entity.position;
      grounded = Math.abs(p1.y - geo.by) < 0.9
        && Math.abs(p1.x - (geo.bx + 0.5)) < 1.2 && Math.abs(p1.z - (geo.bz + 0.5)) < 1.2;
    }
    ev.posAfterTp = { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2), z: +p1.z.toFixed(2) };
    ev.grounded = grounded;
    log('setup', `pos=(${ev.posAfterTp.x},${ev.posAfterTp.y},${ev.posAfterTp.z}) grounded=${grounded}`);
    if (!grounded) throw new Error('bot not grounded on the harness platform');

    // ---------- 12 点 ----------
    const pts = pick(ALL_POINTS);
    for (const p of pts) {
      srv.send(`gamemode 0 ${BOT}`);
      srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(280);
      let rec;
      try {
        rec = await runPoint(srv, bot, { geo }, p);
      } catch (e) {
        rec = { id: p.id, group: p.group, fatal: (e && e.stack) || String(e), pass: false, checks: [] };
        log(p.id, 'FATAL', rec.fatal);
      }
      ev.points.push(rec);
    }

    ev.rowCounts = {
      decayBreaking: srv.all.filter((l) => RE.decay.test(l) && /face=breaking/.test(l)).length,
      decayAttacking: srv.all.filter((l) => RE.decay.test(l) && /face=attacking/.test(l)).length,
      table: srv.all.filter((l) => RE.table.test(l)).length,
      probe: srv.all.filter((l) => RE.probe.test(l)).length,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
      stepHurt: srv.all.filter((l) => RE.stepHurt.test(l)).length,
      stepAttack: srv.all.filter((l) => RE.stepAttack.test(l)).length,
      noTarget: srv.all.filter((l) => RE.noTarget.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));
  } catch (e) {
    ev.fatal = (e && e.stack) || String(e);
    log('main', 'FATAL', ev.fatal);
  } finally {
    try { srv.send('kill @e[type=arrow]'); } catch (e) { /* ignore */ }
    try { srv.send(`kill ${MOB_SEL}`); } catch (e) { /* ignore */ }
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
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

    // ---------- 收口：cfg/props/side 回原字节（本窗零 cfg 写 ⇒ 期望 byte-identical） ----------
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

  // ---------- 总账 ----------
  const pts = ev.points;
  ev.ledger = {
    ran: pts.length,
    pass: pts.filter((p) => p.pass).length,
    fail: pts.filter((p) => !p.pass).length,
    failedIds: pts.filter((p) => !p.pass).map((p) => p.id),
  };
  const infraOk = ev.rowCounts && ev.rowCounts.mixinFail === 0
    && ev.pinsAfter && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.srcJar.ok
    && ev.pinsAfter.mk.ok
    && ev.portAfter === 0
    && ev.crashAfter === ev.pins.crashBefore
    && ev.jarUpToDate
    && ev.worldRemoved === true
    && ev.buildSuccessful === true
    && ev.cfgClose && ev.cfgClose.identical
    && ev.cfgClientClose && ev.cfgClientClose.identical
    && ev.propsClose && ev.propsClose.identical;
  ev.verdict = SMOKE
    ? (infraOk && !ev.fatal ? 'SMOKE-OK' : 'SMOKE-FAIL')
    : ((pts.length === 12 && pts.every((p) => p.pass) && infraOk) ? 'PASS' : 'FAIL');
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of pts) log(p.id, p.pass ? 'PASS' : 'FAIL');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'FAIL' || ev.verdict === 'SMOKE-FAIL' ? 1 : 0);
}

main().catch((e) => { log('boot', 'FATAL:', (e && e.stack) || e); process.exit(1); });
