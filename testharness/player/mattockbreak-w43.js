#!/usr/bin/env node
/**
 * mattockbreak-w43.js — mattock 破块衰减面批（mattockbreak）W-43 四点判窗驱动
 *
 * 判据源（秤上唯一判据）：
 *   `[MiningLog] tool decay face=breaking item=<reg> block=<b> loss=N [server]`
 *   —— 由 `ETIMMining.getToolDecayFromBreakingBlock(player, state, world, pos)`
 *   发行（`mining/ETIMMining.java:265` def / `:273-281` 五门＋公式 / `:283` 发行）；
 *   `logToolDecay("breaking", held, state, loss)` ⇒ **含 block= 列**（`:700-704`），
 *   去重键＝`breaking|<item>|<block>`、sig＝loss（`:698/:702/:706-709`）。
 *
 * ★本批口径（终审 T-9）：
 *   loss = max( max((int)(hardness × 100 × baseDecay), (int)(100×baseDecay/20)), 1 )
 *   （`:280`）。R196 硬度表 dirt 0.5 / sand 0.4（`:96-98`）；
 *   baseDecay mattock 0.4F（`:415-416`，0.5×0.8）/ shovel 0.5F（`:439-441` 兜底）
 *   ⇒ a 20 / b 16 / c 25 / d 20；(int)(decay/20) 仅 2（不占上风）。
 *
 * 通道：`/etest dig <x> <y> <z> [player]`（`CommandDevTest.java:138-139 / :514-522`
 *   → `harness/TestDriver.java:97-103`：START 立即、STOP 于 `DIG_HOLD_TICKS=40`
 *   tick 后；`harness/TestDriver.java:70`），服务端 `processPlayerDigging`
 *   完成真实挖掘 → `ItemTool.onBlockDestroyed` → `MixinItemTool:42` 重定向。
 *   破块完成由 `testforblock … minecraft:air` 复钉（未破判 FAIL）。
 *
 * ★破块面无 `[DamageLog]` 命中语义（没有实体目标）：B-7 的「0 行先排除未执行」
 *   在本批换成三读——dig-start/dig-stop 回执、testforblock air、mine speed 行
 *   （str>1 门 `:276` 通过的正向旁证，记录面预期 4 条：同 item×block 同 str 去重）。
 *
 * last-sig 键 face|item|block 三元：四点四键互异
 *   （mattock|dirt / mattock|sand / shovel|dirt / shovel|sand）⇒ 同 boot 不互吞；
 *   ★同 boot 重跑同点同值必吞 ⇒ 冒烟重试须新 boot 或换方块。
 *
 * 单 boot 串行四点（cfg 零编辑：起收同值自证，无翻转/还原动作）。
 *
 * 用法：node mattockbreak-w43.js [tag]
 * 冒烟：W43_ONLY=W-43a,W-43c / W43_PHASES=a
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'mattockbreak-w43';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const WORLD_NAME = 'mattockw43';
const PORT = 25565;

/** 四钉（主会话 W-43 任务书 · HEAD ba6181d；纯测试批＝窗内零码改零提交零 build）。 */
const PIN = {
  head: 'ba6181d',
  rel: { bytes: 772789, sha: '441A97C1D06FE5CE661E6D2F29C56211E6763B05E7B6053E26CC5C156A740A5B' },
  dev: { bytes: 757023, sha: '7348CC0D8A605DE3BD9CACEDB4D87FA73A3EC1214039669B726B0FB846490C2E' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉（窗内 refmap / mixins 清单零动；139/57/11 出现＝异常停窗）。 */
const MK_PIN = { mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138, sword: 4, tool: 4, shears: 3 };

const MAT = 'etim:mattock_copper';   // breaking 0.4 → dirt 20 / sand 16
const SHOV = 'etim:shovel_copper';   // breaking 0.5 → dirt 25 / sand 20

const row = (item, block, loss) => ({ face: 'breaking', item, block, loss });

/**
 * 单相（boot1，miningReform=true 默认零编辑）——四点四键互异，天然不互吞。
 * kind='dig'：/etest dig → dig-start/dig-stop → sleep → testforblock air。
 */
const POINTS_A = [
  { id: 'W-43a', kind: 'dig', item: MAT, block: 'minecraft:dirt',
    expect: { rows: [row(MAT, 'dirt', 20)], dur: 20 },
    note: 'mattock_copper × dirt：恰 1 条 loss=20 ＋ durΔ20（0.4 主证；`int)(0.5×40)=20`）' },
  { id: 'W-43b', kind: 'dig', item: MAT, block: 'minecraft:sand',
    expect: { rows: [row(MAT, 'sand', 16)], dur: 16 },
    note: 'mattock_copper × sand：恰 1 条 loss=16 ＋ Δ16（`(int)(0.4×40)=16`）' },
  { id: 'W-43c', kind: 'dig', item: SHOV, block: 'minecraft:dirt',
    expect: { rows: [row(SHOV, 'dirt', 25)], dur: 25 },
    note: 'shovel_copper × dirt（对照臂）：恰 1 条 loss=25 ＋ Δ25（ItemSpade 0.5 兜底）' },
  { id: 'W-43d', kind: 'dig', item: SHOV, block: 'minecraft:sand',
    expect: { rows: [row(SHOV, 'sand', 20)], dur: 20 },
    note: 'shovel_copper × sand（对照臂）：恰 1 条 loss=20 ＋ Δ20（`(int)(0.4×50)=20`）' },
];

/** 计数总账（写死判）：breaking 恰 4 条（a-d 各 1）；其余通道 0；mine speed 只记不判。 */
const LEDGER = { a: { breaking: 4 } };

const ONLY = (process.env.W43_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const PHASES_ONLY = (process.env.W43_PHASES || '').split(',').map((s) => s.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const RE = {
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  speed: /\[MiningLog\] mine speed item=(\S+) block=(\S+) str=([\d.]+)/,
  deny: /\[MiningLog\] mine deny grade=/,
  shearDrop: /\[MiningLog\] shear drop/,
  reachDeny: /reach denied: (\S+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
  blockGone: /Successfully found the block|The block at /i,
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
    await sleep(350);
    const cur = botDur(bot);
    if (cur && prev && cur.damage === prev.damage) return cur;
    prev = cur;
  }
  return prev;
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
      // modded 物品 mineflayer 名可能为 unknown ⇒ 只对 vanilla 校名（W-42 C-5 家族）。
      const named = !vanilla || (!!it && it.name === shortName);
      if (receipt && fresh && named) {
        return { receipt: stripPrefix(receipt), bot: it, attempts: attempt + 1 };
      }
    }
  }
  throw new Error(`hold ${item} failed — hold_set 回执/bot 面板未对上`);
}

/* ===================== 摆场与挖掘 ===================== */

/** 目标块就位：先 air 再 setblock（沙不悬空——支撑块在 by-1 平台面），testforblock 复钉。 */
async function placeTarget(srv, rec, X, Y, Z, p) {
  srv.send(`setblock ${X} ${Y} ${Z} minecraft:air 0`);
  await sleep(200);
  const setFrom = srv.all.length;
  srv.send(`setblock ${X} ${Y} ${Z} ${p.block} 0`);
  rec.placedLine = stripPrefix((await srv.waitFor(RE.placed, 5000, setFrom)) || '');
  await sleep(400);
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${X} ${Y} ${Z} ${p.block} 0`);
  rec.blockPresentLine = stripPrefix((await srv.waitFor(RE.blockGone, 5000, tbFrom)) || '');
}

/** 一次 dig 往返：START/STOP 回执 → 等落行 → testforblock air。 */
async function digOnce(srv, botName, X, Y, Z, rec) {
  const from = srv.all.length;
  srv.send(`etest dig ${X} ${Y} ${Z} ${botName}`);
  const ds = await srv.waitFor(RE.digStart, 8000, from);
  const dp = await srv.waitFor(RE.digStop, 15000, from);
  await sleep(2200); // 让 break 完成 + 判行落地
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${X} ${Y} ${Z} minecraft:air`);
  const gone = await srv.waitFor(RE.blockGone, 5000, tbFrom);
  await sleep(300);
  return {
    from,
    digStart: ds ? stripPrefix(ds) : null,
    digStop: dp ? stripPrefix(dp) : null,
    blockGoneLine: gone ? stripPrefix(gone) : null,
    gone: !!gone && /Successfully found the block/i.test(gone),
  };
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
    if (w.block !== null && !g.hasBlockCol) return false; // ★破块面必须有 block= 列
  }
  return true;
}

/* ===================== 判点执行 ===================== */

async function runPoint(srv, bot, botName, p, geo) {
  HOLDER_NAME = botName;
  const X = geo.bx + 2;
  const Y = geo.by;
  const Z = geo.bz;
  const rec = {
    id: p.id, kind: 'dig', note: p.note, item: p.item, block: p.block,
    expect: p.expect, at: { x: X, y: Y, z: Z },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.item} x ${p.block}`);

  srv.send('kill @e[type=item]');
  await sleep(400);

  const hold = await holdItem(srv, bot, p.item);
  rec.holdReceipt = hold.receipt;
  rec.holdAttempts = hold.attempts;
  rec.heldAfterHold = hold.bot;

  await placeTarget(srv, rec, X, Y, Z, p);

  const b0 = botDur(bot);
  const i0 = invSnap(bot);
  rec.botBefore = b0;
  rec.invBefore = i0;

  // 落地/位置复钉（str 环境罚 :238-243：water/离地都会改 str，污染判值）
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

  const dig = await digOnce(srv, botName, X, Y, Z, rec);
  rec.dig = dig;

  const b1 = await botDurSettled(bot);
  const i1 = invSnap(bot);
  rec.botAfter = b1;
  rec.invAfter = i1;

  const seg = srv.all.slice(dig.from);
  rec.decayRaw = seg.filter((l) => RE.decay.test(l)).map((l) => l.trim());
  rec.rows = rowsOf(seg);
  rec.speedRows = seg.filter((l) => RE.speed.test(l)).map(stripPrefix);
  rec.denyRaw = seg.filter((l) => RE.deny.test(l)).map(stripPrefix);
  rec.reachDenies = seg.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);
  rec.testLog = seg.filter((l) => /\[TestLog\] step=/.test(l)).map(stripPrefix);

  const dmg = (x) => (x && x.damage !== null && x.damage !== undefined ? x.damage : null);
  rec.durDelta = dmg(b1) !== null && dmg(b0) !== null ? dmg(b1) - dmg(b0) : null;

  const blockPath = p.block.split(':').pop();
  const rowOk = rec.rows.length === p.expect.rows.length
    && rec.rows.every((r, i) => {
      const w = p.expect.rows[i];
      return r.face === w.face && r.item === w.item && r.block === w.block
        && r.loss === w.loss && r.hasBlockCol;
    });
  // ★line-form 单读：破块面缺 block= 列即行形异常（独立于值匹配）
  const lineFormOk = rec.rows.length > 0
    ? rec.rows.every((r) => r.block !== null && r.hasBlockCol)
    : false;

  rec.checks = {
    holdReceipt: !!rec.holdReceipt,
    blockPresent: /Successfully found the block/i.test(rec.blockPresentLine || ''),
    digsComplete: !!(dig.digStart && dig.digStop),
    blockGone: dig.gone === true,
    rowsMatch: rowOk,
    lineForm: lineFormOk,
    durDelta: rec.durDelta === p.expect.dur,
    noReachDeny: rec.reachDenies.length === 0,
    noGradeDeny: rec.denyRaw.length === 0,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rec.rows.length + ' [' + rec.rows.map((r) => r.item + '/' + r.block + ':' + r.loss).join(' ')
    + '] durΔ=' + rec.durDelta + ' gone=' + dig.gone
    + ' speed=' + rec.speedRows.length + ' reachDeny=' + rec.reachDenies.length);
  return rec;
}

/* ===================== 相位 ===================== */

/**
 * 假人进服重试（W-42 C-1 家族）：`Done (` 落地后服务器仍有
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
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;

    bot = await connectBot(botName);
    await sleep(2200);

    // op 假人：@e 选择器解析需 canUseCommand(1,"@")（W-41 NO_TARGET 坑）。
    srv.send(`op ${botName}`);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');   // 破块不掉物 → 不生成 item 实体干扰
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
    srv.send(`etest level 35 ${botName}`);   // str 等级加成（:247）→ 挖掘进度够快
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
    // 5×5 平台（by-1 地板）＋ 5×5 净空（by..by+2）；目标块固定落在 (bx+2, by, bz)，
    // 与 W-34 破块面同距（水平 2.0、眼高 1.62 ⇒ 视距 2.29，服务器 reach 内）。
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:dirt 0`);
        for (const dy of [0, 1, 2]) {
          srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
        }
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
    phase.speedAll = srv.all.filter((l) => RE.speed.test(l)).map((l) => stripPrefix(l));
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

  // ★本批零 cfg 编辑：miningDebugLog/blockDebugLog/miningReform 全取 pin 值。
  ev.cfgEdit = null;

  const pointsA = wantPhase('a') ? pick(POINTS_A) : [];

  let restoreOk = false;
  try {
    if (pointsA.length) {
      await runPhase({ key: 'a', tag: TAG + '-a', bot: 'ETIM_W43A',
        label: 'A (miningReform=true, single boot)' }, pointsA, ev);
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
    ev.cfgUntouched = ev.cfgRestored.identical;
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical (pin, zero-edit)' : 'MISMATCH'));
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

  // 计数总账（写死判）：breaking 恰 4；其余通道 0；speed 只记不判。
  ev.ledger = {};
  for (const ph of ev.phases) {
    const want = LEDGER[ph.key];
    const got = ph.rowCounts || {};
    ev.ledger[ph.key] = {
      want, got,
      ok: !!want && got.breaking === want.breaking,
      sequence: (ph.breakingRows || []).map((r) => `${r.item}/${r.block}:${r.loss}`),
      otherChannelsZero: got.attacking === 0 && got.shearing === 0 && got.shearDrop === 0
        && got.deny === 0 && got.reachDenied === 0,
      speedRecordOnly: got.speed,
    };
  }
  const ledgerOk = ONLY.length > 0
    ? ev.phases.length > 0
    : (ev.phases.length > 0 && Object.values(ev.ledger).every((l) => l.ok && l.otherChannelsZero));

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = pointsA.length;

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

function pick(points) {
  if (!ONLY.length) return points;
  return points.filter((p) => ONLY.includes(p.id));
}

function wantPhase(key) {
  if (!PHASES_ONLY.length) return true;
  return PHASES_ONLY.includes(key);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
