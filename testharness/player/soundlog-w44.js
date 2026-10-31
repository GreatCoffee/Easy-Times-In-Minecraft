#!/usr/bin/env node
/**
 * soundlog-w44.js — soundlog 批（音效字幕判行通道）W-44 判窗驱动
 *
 * 判据源（双档）：
 *   客户端档：`[SoundLog] name=minecraft:entity.sheep.shear pos=<x,y,z> [client]`
 *     —— `client/ETIMSoundLog.java:59-68`（ISoundEventListener，注册于
 *     `ETIM.init` FMLInitializationEvent → `register()` `:46-57`，boot 行
 *     `[SoundLog] listener registered [client]`；门 `ETIMConfig.soundDebugLog`
 *     `:61`，客户端档 config，preInit read-once）。
 *     派发点＝`SoundManager.playSound` listeners 循环（字号 overlay 同一消费点），
 *     accessor null 门在前（旧名 mob.sheep.shear ⇒ 0 行假 FAIL），master volume
 *     门在后（e 点：v=0 仍发行）。
 *   服务端档：`[MiningLog] tool decay face=shearing item=etim:shears_rusted_iron
 *     loss=50 [server]` —— `mining/ETIMMining.java:328-339`（`logToolDecay`
 *     `:693-711`，state=null ⇒ 无 block= 列，去重键 `shearing|<item>`、sig=50）。
 *
 * ★判窗形态：双档判位。服务端 face ＝ runServer + 控制台 stdin + mineflayer；
 *   客户端 face ＝ 用户拉起 obf 客户端 + Direct Connect localhost（GUI 面零 AI
 *   触碰），[client] 行落 `run/obfuscated/logs/latest.log`，本驱动**只读文件**。
 *
 * ★A-2 两陷阱：NBT 必须 {NoAI:1b,Sheared:0b,Silent:0b,PersistenceRequired:1b}
 *   —— Sheared:1b 会被 getSheared 门吞（0 行假 PASS 面）；Silent:1b 会被
 *   Entity.playSound 的 isSilent 门吞（客户端 0 行假 FAIL 面）。
 *
 * 模式（W44_MODE）：
 *   buddy         —— 起服一次，只为让 ETIMConfig.init 把 soundDebugLog=false
 *                    补写进服务端 cfg（记录新 SHA/行数），随即优雅停服。
 *   clientflip    —— 客户端 cfg 文件面 false→true（记前后 SHA/行数），存
 *                    build-logs/soundlog-w44-clientcfg.json 供窗口期钉值。
 *   clientrestore —— true→false，逐字节校验回到 clientflip 前的原值形态。
 *   window        —— 判窗主体：起服 → 建场 → 等客户端进服 → a/b/c/d/f（+e gate）。
 *
 * 用法：node soundlog-w44.js [tag]
 * 冒烟：W44_ONLY=W-44a,W-44b / W44_E=0
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'soundlog-w44';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const STAGE = process.env.W44_STAGE || (TAG + '-a');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const CCFG = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const CLOG = path.join(ROOT, 'run', 'obfuscated', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const WORLD_NAME = 'soundlogw44';
const PORT = 25565;
const BOT = 'ETIM_W44A';

const MODE = (process.env.W44_MODE || 'window').trim();
const E_ENABLE = (process.env.W44_E || '1') !== '0';
const E_NOACK = process.env.W44_E_NOACK === '1';
const E_TIMEOUT = +(process.env.W44_E_TIMEOUT || 480000);
const CLIENT_TIMEOUT = +(process.env.W44_CLIENT_TIMEOUT || 720000);

/** 钉值（主会话 W-44 任务书 · commit 064e298）。 */
const PIN = {
  head: '064e298',
  rel: { bytes: 774693, sha: '70BAB7117A25F3C08BE50EC9D5DEE14E2EC28167D6CE41070471B3FA5893A328' },
  dev: { bytes: 758894, sha: 'F98DDF24F0F4385C3E807E3244093AA88C7A64CED6860E56FAFB12DBBC594E8B' },
  src: { bytes: 702452, sha: '48B8FB8C93978351FD63F985F28E596D01C9806C617E8CAA5A644738C8E8360D' },
  cfg: { bytes: 31549, sha: '74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666' },
  ccfg: { bytes: 29785, sha: 'B38BF737555082592FA694154315DD04242EB5EA8D297BEEB97B747A9AA56FC2' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 判读基线（139/57/11 出现＝异常停窗）。 */
const MK_PIN = { mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138, sword: 4, tool: 4, shears: 3 };

const GOLDEN = 'minecraft:entity.sheep.shear';
const SHEARS = 'etim:shears_rusted_iron';
/** A-2：Silent:0b / Sheared:0b 落刀（两个陷阱位）。 */
const NBT_ADULT = '{NoAI:1b,Sheared:0b,Silent:0b,PersistenceRequired:1b,Age:0}';
const NBT_BABY = '{NoAI:1b,Sheared:0b,Silent:0b,PersistenceRequired:1b,Age:-24000}';

/**
 * 判点（编号 a-b 正反证 / d 幼羊 / e 静音面 / f 噪声记录）。
 * kind='sound' ＝ /playsound 正控（客户端恰 1 条）；kind='shear' ＝ 破剪链。
 * expect.client ＝ 本点窗内 golden 行数；expect.server = face=shearing 行数。
 */
const POINTS = [
  { id: 'W-44a', kind: 'sound', target: 'client', expect: { client: 1 },
    note: '/playsound 正控：目标＝用户客户端，坐标＝bot 位置 ⇒ 客户端恰 1 条 golden（SPacketCustomSound 链）' },
  { id: 'W-44a2', kind: 'sound', target: 'bot', expect: { client: 0 }, aux: true,
    note: '反控：/playsound 目标＝bot（mineflayer）⇒ 客户端 0 条（1.12 playsound 单目标，非广播）' },
  { id: 'W-44b', kind: 'shear', sheep: 'adult',
    expect: { client: 1, server: 1, loss: 50, dur: 50, shearedAfter: true },
    note: '主判点：bot 剪成年未剪羊（Silent:0b）⇒ 客户端 +1 golden ＋ 服务端恰 1 条 shearing loss=50 ＋ 栈 Δ50 ＋ Sheared:1b' },
  { id: 'W-44c', kind: 'shear', sheep: 'reuse',
    expect: { client: 0, server: 0, dur: 0, shearedAfter: true },
    note: '同羊再剪：getSheared 门 ⇒ 不进 damageItem ⇒ 客户端 0 行 / 服务端 0 行 / 栈 Δ0' },
  { id: 'W-44d', kind: 'shear', sheep: 'baby',
    expect: { client: 0, server: 0, dur: 0, shearedAfter: false },
    note: '幼羊（Age:-24000）：isChild 门 ⇒ 双档 0 行 0 磨，Sheared 仍 0b' },
  { id: 'W-44e', kind: 'shear', sheep: 'adult', volumeZero: true,
    expect: { client: 1, server: 1, loss: 50, dur: 50, shearedAfter: true },
    note: '静音面（双 boot 第二 boot）：主音量 0（options.txt soundCategory_master=0.0）下复演 b ⇒ 客户端仍恰 1 条 golden（派发先于音量门）；无头服务端 ⇒ shearing loss=50 亦恰 1 条' },
];

const ONLY = (process.env.W44_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

const RE = {
  decay: /\[MiningLog\] tool decay face=(\w+) item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  shearing: /\[MiningLog\] tool decay face=shearing item=(\S+)(?: block=(\S+))? loss=(-?\d+)/,
  sound: /\[SoundLog\] name=(\S+) pos=([-\d]+,[-\d]+,[-\d]+) \[client\]/,
  soundAny: /\[SoundLog\]/,
  listener: /\[SoundLog\] listener registered \[client\]/,
  hold: /\[EtimTest\] commands\.etest\.hold_set player=(\S+) params=\[(.*?)\]/,
  testforHit: /(?:\]:\s|^)Found \S/,
  testforNone: /did not match the required data structure|found nothing/,
  summonOk: /successfully summoned|Summoned new/i,
  nbtAge: /(?:^|[,{])Age:(-?\d+)/,
  nbtSheared: /(?:^|[,{])Sheared:(\d)b/,
  reachDeny: /reach denied: (\S+)/,
  joined: /([A-Za-z0-9_]{1,16}) joined the game/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
};

/* ===================== 机械核讫 ===================== */

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
      slices: {
        sword: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemSword'] || {}).length,
        tool: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemTool'] || {}).length,
        shears: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemShears'] || {}).length,
      },
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

function cfgInfo(file) {
  const buf = fs.readFileSync(file);
  return { bytes: buf.length, sha: sha256(buf), lines: buf.toString('utf8').split('\n').length };
}

/* ===================== 客户端日志读数（只读文件） ===================== */

function clientText() {
  try { return fs.readFileSync(CLOG, 'utf8'); } catch (e) { return ''; }
}

function soundRows(text) {
  return text.split(/\r?\n/).filter((l) => RE.soundAny.test(l)).map((l) => {
    const m = RE.sound.exec(l);
    return { line: l.trim(), name: m ? m[1] : null, pos: m ? m[2] : null };
  });
}

function goldenRows(text) {
  return soundRows(text).filter((r) => r.name === GOLDEN);
}

/* ===================== 服务端读数 ===================== */

function botDur(bot) {
  const it = bot && bot.heldItem;
  if (!it) return null;
  return {
    damage: it.durabilityUsed === undefined ? null : it.durabilityUsed,
    name: it.name,
    count: it.count,
  };
}

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

let HOLDER = null;

/** fresh 栈：/etest hold ＋ hold_set 回执（显示名）＋ bot 面板 Damage=0。 */
async function holdItem(srv, bot, item) {
  if (!HOLDER) throw new Error('holdItem: HOLDER not set');
  for (let attempt = 0; attempt < 4; attempt++) {
    const from = srv.all.length;
    srv.send(`etest hold ${item} ${HOLDER}`);
    const receipt = await srv.waitFor(RE.hold, 6000, from);
    for (let k = 0; k < 12; k++) {
      await sleep(200);
      const it = botDur(bot);
      if (receipt && it && (it.damage === 0 || it.damage === null)) {
        const m = RE.hold.exec(receipt);
        return { receipt: stripPrefix(receipt), display: m ? m[2] : null, bot: it, attempts: attempt + 1 };
      }
    }
  }
  throw new Error(`hold ${item} failed — hold_set 回执 / bot 面板未对上`);
}

async function cmdRead(srv, cmd, ms = 900) {
  const from = srv.all.length;
  srv.send(cmd);
  await sleep(ms);
  return srv.all.slice(from)
    .filter((l) => !/^### \[harness\]/.test(l))
    .filter((l) => /\[Server thread\/(INFO|WARN)\]/.test(l))
    .map(stripPrefix)
    .filter((l) => l && !/^\s*$/.test(l));
}

async function testSheared(srv, want) {
  const lines = await cmdRead(srv, `testfor @e[type=sheep] {Sheared:${want ? '1' : '0'}b}`);
  return {
    want,
    hit: lines.some((l) => RE.testforHit.test(l)),
    none: lines.some((l) => RE.testforNone.test(l)),
    raw: lines.slice(0, 4),
  };
}

async function sheepNbt(srv) {
  const lines = await cmdRead(srv, 'entitydata @e[type=sheep] {}', 1000);
  const raw = lines.join(' ');
  const age = RE.nbtAge.exec(raw);
  const sheared = RE.nbtSheared.exec(raw);
  return { age: age ? +age[1] : null, sheared: sheared ? sheared[1] === '1' : null,
    raw: raw.length > 500 ? raw.slice(0, 500) + '…' : raw };
}

function sheepIds(bot) {
  const set = new Set();
  for (const k of Object.keys(bot.entities || {})) {
    const e = bot.entities[k];
    if (e && e.name === 'sheep') set.add(e.id);
  }
  return set;
}

async function waitSheep(bot, beforeIds, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    for (const k of Object.keys(bot.entities || {})) {
      const e = bot.entities[k];
      if (e && e.name === 'sheep' && !beforeIds.has(e.id)) return e;
    }
    await sleep(120);
  }
  return null;
}

let Vec3 = null;
try { Vec3 = require('vec3'); } catch (e) { Vec3 = null; }

/** 交互按体心瞄准（幼羊 hitbox 0.45×0.65，瞄 feet+1 会擦顶）。 */
async function interactEntity(bot, sheep, baby) {
  const aimY = baby ? 0.30 : 0.60;
  const aim = sheep.position.offset(0, aimY, 0);
  await bot.lookAt(aim, false);
  await sleep(150);
  const loc = Vec3 ? new Vec3(0, 0, 0) : { x: 0, y: 0, z: 0 };
  bot._client.write('use_entity', { target: sheep.id, mouse: 0, sneaking: false, hand: 0, location: loc });
  return { aim: { x: +aim.x.toFixed(2), y: +aim.y.toFixed(2), z: +aim.z.toFixed(2) }, aimY };
}

/* ===================== 判点 ===================== */

async function runSoundPoint(srv, bot, botName, clientName, p, geo) {
  const rec = { id: p.id, kind: p.kind, note: p.note, expect: p.expect, aux: !!p.aux };
  const target = p.target === 'client' ? clientName : botName;
  const bp = bot.entity.position;
  const x = +bp.x.toFixed(3);
  const y = +bp.y.toFixed(3);
  const z = +bp.z.toFixed(3);
  const wantPos = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  rec.target = target;
  rec.playAt = { x, y, z, wantPos };
  log(p.id, 'start', p.note);

  const c0 = clientText().length;
  const s0 = srv.all.length;
  srv.send(`playsound ${GOLDEN} master ${target} ${x} ${y} ${z}`);
  await sleep(2500);

  const segC = clientText().slice(c0);
  const segS = srv.all.slice(s0);
  rec.clientRows = soundRows(segC);
  rec.golden = goldenRows(segC);
  rec.serverSay = segS.filter((l) => /Played sound/i.test(l)).map(stripPrefix);

  rec.checks = {
    goldenCount: rec.golden.length === p.expect.client,
    posMatch: p.expect.client === 0 ? true : rec.golden.every((r) => r.pos === wantPos),
    serverReceipt: p.aux ? true : rec.serverSay.length > 0,
  };
  rec.pass = Object.values(rec.checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    `golden=${rec.golden.length} pos=${rec.golden.map((r) => r.pos).join('/') || '-'} want=${wantPos} target=${target}`);
  return rec;
}

async function runShearPoint(srv, bot, botName, clientName, p, geo, prevSheep) {
  const SX = geo.bx + 1;
  const SY = geo.by;
  const SZ = geo.bz;
  const rec = {
    id: p.id, kind: p.kind, note: p.note, item: SHEARS, sheep: p.sheep,
    expect: p.expect, record: !!p.record, at: { x: SX + 0.5, y: SY, z: SZ + 0.5 },
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${SHEARS} x sheep(${p.sheep})`);
  await sleep(300);

  let sheep = null;
  srv.send('kill @e[type=item]');
  await sleep(300);
  if (p.sheep !== 'reuse') {
    srv.send('kill @e[type=sheep]');
    await sleep(800);
    const beforeIds = sheepIds(bot);
    const nbt = p.sheep === 'baby' ? NBT_BABY : NBT_ADULT;
    const from = srv.all.length;
    srv.send(`summon minecraft:sheep ${SX + 0.5} ${SY} ${SZ + 0.5} ${nbt}`);
    const line = await srv.waitFor(new RegExp(RE.summonOk.source + '|Unable to summon', 'i'), 6000, from);
    rec.summonLine = stripPrefix(line || '');
    rec.summonOk = RE.summonOk.test(rec.summonLine);
    rec.nbtRequested = nbt;
    await sleep(1000);
    sheep = await waitSheep(bot, beforeIds);
  } else {
    sheep = prevSheep;
  }
  rec.sheepFound = !!sheep;
  rec.sheepId = sheep ? sheep.id : null;
  if (!sheep) throw new Error('sheep entity not tracked by the harness bot');
  rec.sheepPos = { x: +sheep.position.x.toFixed(2), y: +sheep.position.y.toFixed(2), z: +sheep.position.z.toFixed(2) };

  rec.nbtBefore = await sheepNbt(srv);
  rec.shearedBefore0 = await testSheared(srv, false);
  rec.shearedBefore1 = await testSheared(srv, true);

  // e 点：音量 0 的握手（用户 GUI 操作 → 聊天 ok 回执）；E_NOACK=1 时由 options.txt 文件面落地
  if (p.volumeZero) {
    if (E_NOACK) {
      rec.volumeAck = { user: '(options.txt)', message: 'soundCategory_master=0.0（AI 文件面，单 boot 前落地）' };
      log(p.id, 'volume=0 由 options.txt 落地（无聊天握手）');
    } else {
      srv.send('say [W44-E] SET Options > Music & Sounds > Master Volume to 0, then type: ok');
      log(p.id, 'WAITING for user ack in chat (master volume 0)…');
      const ack = await waitBotChat(bot, /^\s*ok\s*$/i, E_TIMEOUT);
      rec.volumeAck = ack ? { user: ack.username, message: ack.message } : null;
      if (!ack) {
        rec.skipped = true;
        rec.checks = { userAck: false };
        rec.pass = false;
        srv.send('say [W44-E] TIMEOUT — skipped');
        log(p.id, 'SKIP', 'no chat ack within ' + E_TIMEOUT + 'ms');
        return rec;
      }
      await sleep(1200);
    }
  }

  const hold = await holdItem(srv, bot, SHEARS);
  rec.holdReceipt = hold.receipt;
  rec.holdDisplay = hold.display;
  rec.holdAttempts = hold.attempts;

  const b0 = botDur(bot);
  rec.botBefore = b0;

  const c0 = clientText().length;
  const s0 = srv.all.length;
  const from = srv.all.length;
  try {
    rec.interact = await interactEntity(bot, sheep, p.sheep === 'baby');
    rec.interactSent = true;
  } catch (e) {
    rec.interactSent = false;
    rec.interactError = String((e && e.message) || e);
  }
  await sleep(900);
  rec.shearedAfter1 = await testSheared(srv, true);
  rec.nbtAfter = await sheepNbt(srv);
  await sleep(600);

  const b1 = await botDurSettled(bot);
  rec.botAfter = b1;

  const segC = clientText().slice(c0);
  const segS = srv.all.slice(s0);
  rec.clientRows = soundRows(segC);
  rec.golden = goldenRows(segC);
  rec.shearingRaw = segS.filter((l) => RE.shearing.test(l)).map((l) => l.trim());
  rec.shearingRows = rec.shearingRaw.map((l) => {
    const m = RE.shearing.exec(l);
    return { item: m[1], loss: +m[3] };
  });
  rec.reachDenies = segS.filter((l) => RE.reachDeny.test(l)).map(stripPrefix);
  rec.testLog = segS.filter((l) => /\[TestLog\] step=/.test(l)).map(stripPrefix);

  const dmg = (x) => (x && x.damage !== null && x.damage !== undefined ? x.damage : null);
  rec.durDelta = dmg(b1) !== null && dmg(b0) !== null ? dmg(b1) - dmg(b0) : null;

  const checks = {
    summonOrReuse: p.sheep === 'reuse' ? true : rec.summonOk === true,
    sheepFound: rec.sheepFound,
    ageOk: p.sheep === 'reuse' ? true
      : (p.sheep === 'baby' ? rec.nbtBefore.age !== null && rec.nbtBefore.age < 0
                            : rec.nbtBefore.age !== null && rec.nbtBefore.age >= 0),
    heldFresh: !!b0 && b0.damage === 0,
    interactSent: rec.interactSent === true,
    noReachDeny: rec.reachDenies.length === 0,
    shearedAfter: rec.shearedAfter1.hit === p.expect.shearedAfter,
    clientGolden: rec.golden.length === p.expect.client,
    serverRows: rec.shearingRows.length === p.expect.server,
    lossValue: p.expect.loss === undefined ? true
      : (rec.shearingRows.length === p.expect.server
         && rec.shearingRows.every((r) => r.loss === p.expect.loss && r.item === SHEARS)),
    durDelta: p.expect.dur === undefined ? true : rec.durDelta === p.expect.dur,
  };
  if (p.volumeZero) checks.userAck = !!rec.volumeAck;
  rec.checks = checks;
  rec.pass = Object.values(checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    `client=${rec.golden.length} server=${rec.shearingRows.length} loss=${rec.shearingRows.map((r) => r.loss).join(',') || '-'}`
    + ` durΔ=${rec.durDelta} sheared=${rec.shearedAfter1.hit} nbtSheared=${rec.nbtAfter.sheared}`);

  if (p.volumeZero) srv.send('say [W44-E] DONE — restore Master Volume now');
  rec.nextSheep = sheep;
  return rec;
}

function waitBotChat(bot, re, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const fn = (username, message) => {
      if (done || !re.test(message || '')) return;
      done = true;
      clearTimeout(timer);
      bot.removeListener('chat', fn);
      resolve({ username, message });
    };
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      bot.removeListener('chat', fn);
      resolve(null);
    }, timeoutMs);
    bot.on('chat', fn);
  });
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

/** 等用户客户端进服（排除 bot 自己），返回玩家名。 */
async function waitClientJoin(srv, botName, timeoutMs) {
  const t0 = Date.now();
  log('wait', 'WAITING FOR CLIENT JOIN (Direct Connect localhost)…');
  while (Date.now() - t0 < timeoutMs) {
    for (const line of srv.all) {
      const m = RE.joined.exec(line);
      if (m && m[1] !== botName) return m[1];
    }
    await sleep(700);
  }
  return null;
}

async function runPhase(opts, points, ev) {
  const tag = opts.tag;
  const srv = await startServer({ root: ROOT, tag });
  const phase = { tag, bot: BOT, label: opts.label, points: [] };
  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = stripPrefix(done.trim());
    phase.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
    phase.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
    log('setup', 'server ready: ' + phase.ready);

    bot = await connectBot(BOT);
    HOLDER = BOT;
    await sleep(2200);

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
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest level 0 ${BOT}`);
    await sleep(1500);

    const p0 = bot.entity.position;
    const geo = {
      bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z),
      spawn: { x: p0.x, y: p0.y, z: p0.z },
    };
    phase.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);

    // 5×5 平台（by-1 地板）＋ 5×5 净空（by..by+2）：羊位 bx+1、bot 位 bx+0.5、客户端 bx+2.5。
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:dirt 0`);
        for (const dy of [0, 1, 2]) {
          srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
        }
      }
    }
    await sleep(1800);
    srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1600);
    let p1 = bot.entity.position;
    let grounded = Math.abs(p1.y - geo.by) < 0.6
      && Math.abs(p1.x - (geo.bx + 0.5)) < 0.9 && Math.abs(p1.z - (geo.bz + 0.5)) < 0.9;
    if (!grounded) {
      srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1600);
      p1 = bot.entity.position;
      grounded = Math.abs(p1.y - geo.by) < 0.6
        && Math.abs(p1.x - (geo.bx + 0.5)) < 0.9 && Math.abs(p1.z - (geo.bz + 0.5)) < 0.9;
    }
    phase.grounded = grounded;
    log('setup', `bot pos=(${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}) grounded=${grounded}`);
    if (!grounded) throw new Error('bot not grounded on the harness platform');

    // 客户端进服（客户端先行流：用户已在主菜单）
    const clientName = await waitClientJoin(srv, BOT, CLIENT_TIMEOUT);
    phase.clientName = clientName;
    if (!clientName) throw new Error('client never joined within ' + CLIENT_TIMEOUT + 'ms');
    phase.clientJoinedLine = srv.all.find((l) => l.includes(clientName + ' joined the game')) || null;
    log('client', 'joined: ' + clientName);
    srv.send(`tp ${clientName} ${geo.bx + 2.5} ${geo.by} ${geo.bz + 2.5}`);
    srv.send(`effect ${clientName} clear`);
    await sleep(3000);

    const cAll = clientText();
    phase.clientLog = {
      bytes: Buffer.byteLength(cAll, 'utf8'),
      listenerLine: (cAll.match(/\[SoundLog\] listener registered \[client\]/) || [null])[0],
      listenerStart: cAll.indexOf('[SoundLog] listener registered [client]'),
      soundTotalAtStart: soundRows(cAll).length,
    };

    let prevSheep = null;
    for (const p of points) {
      let rec;
      try {
        rec = p.kind === 'sound'
          ? await runSoundPoint(srv, bot, BOT, clientName, p, geo)
          : await runShearPoint(srv, bot, BOT, clientName, p, geo, prevSheep);
        if (rec && rec.nextSheep) { prevSheep = rec.nextSheep; delete rec.nextSheep; }
      } catch (e) {
        rec = { id: p.id, fatal: e && e.stack ? e.stack : String(e), pass: false };
        log(p.id, 'FATAL', rec.fatal);
      }
      phase.points.push(rec);
    }

    // 全窗服务端通道计数
    const allDecay = srv.all.filter((l) => RE.decay.test(l)).map((l) => l.trim());
    phase.decayAll = allDecay;
    phase.rowCounts = {
      shearing: allDecay.filter((l) => RE.shearing.test(l)).length,
      attacking: allDecay.filter((l) => /face=attacking/.test(l)).length,
      breaking: allDecay.filter((l) => /face=breaking/.test(l)).length,
      reachDenied: srv.all.filter((l) => RE.reachDeny.test(l)).length,
    };

    // f：客户端全窗 [SoundLog] 全表（只记录）
    const cText = clientText();
    const allSound = soundRows(cText);
    phase.clientSoundAll = allSound.map((r) => ({ name: r.name, pos: r.pos, line: r.line }));
    phase.clientSoundCounts = allSound.reduce((acc, r) => {
      acc[r.name] = (acc[r.name] || 0) + 1;
      return acc;
    }, {});
    phase.clientGoldenTotal = allSound.filter((r) => r.name === GOLDEN).length;
    phase.clientLogBytesEnd = Buffer.byteLength(cText, 'utf8');
    log(tag, 'rowCounts', JSON.stringify(phase.rowCounts));
    log(tag, 'clientSound', JSON.stringify(phase.clientSoundCounts));
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
    try { fs.copyFileSync(CLOG, path.join(OUT, tag + '-client-latest.log')); } catch (e) {
      phase.clientSnapshotError = String((e && e.message) || e);
    }
    ev.phases.push(phase);
  }
  return phase;
}

/* ===================== 模式 ===================== */

async function modeBuddy() {
  const ev = { mode: 'buddy', tag: TAG, startedAt: new Date().toISOString(), head: null, pins: {} };
  ev.pins.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'sources');
  ev.pins.cfg = pinOf(CFG, PIN.cfg, 'cfg');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.mk = mkCounts();
  for (const [k, v] of Object.entries(ev.pins)) {
    if (v && v.ok !== undefined) log('pin', k + ' ' + v.bytes + 'B/' + v.sha + ' ' + (v.ok ? 'OK' : 'MISMATCH'));
  }
  log('pin', 'mk ' + JSON.stringify(ev.pins.mk));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch');
  if (!ev.pins.cfg.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch (139/57/11)');

  ev.cfgBefore = cfgInfo(CFG);
  ev.propsBefore = cfgInfo(PROPS);
  ev.snapshotProps = snapshot(PROPS, TAG + '-buddy-server.properties.before');
  log('cfg', 'server cfg before: ' + ev.cfgBefore.bytes + 'B/' + ev.cfgBefore.sha + ' lines=' + ev.cfgBefore.lines);

  // buddy 用一次性世界，避免动用户世界；收窗删目录并还原 props
  const buddyWorld = 'soundlogw44buddy';
  fs.writeFileSync(PROPS, setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', buddyWorld), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG + '-buddy' });
  const done = await srv.ready;
  ev.ready = done ? stripPrefix(done.trim()) : null;
  ev.levelLine = srv.all.find((l) => /Preparing level "/.test(l)) || null;
  ev.mixinErrors = srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8);
  ev.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));
  log('buddy', 'ready=' + ev.ready);
  await sleep(4000);
  const extra = srv.all.filter((l) => /soundDebugLog/.test(l)).slice(0, 5);
  ev.soundKeyMentions = extra;
  ev.stop = await srv.stop();
  ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));

  ev.cfgAfter = cfgInfo(CFG);
  ev.cfgHasKey = /B:soundDebugLog=false/.test(fs.readFileSync(CFG, 'utf8'));
  ev.cfgSnapshotAfter = snapshot(CFG, TAG + '-buddy-etim.cfg.after');
  ev.propsAfter = cfgInfo(PROPS);
  fs.writeFileSync(PROPS, fs.readFileSync(ev.snapshotProps.path));
  ev.propsRestored = cfgInfo(PROPS);
  ev.propsIdentical = ev.propsRestored.sha === PIN.props.sha && ev.propsRestored.bytes === PIN.props.bytes;
  const buddyDir = path.join(ROOT, 'run', 'soundlogw44buddy');
  if (fs.existsSync(buddyDir)) {
    fs.rmSync(buddyDir, { recursive: true, force: true });
    ev.buddyWorldRemoved = !fs.existsSync(buddyDir);
  }
  ev.portAfter = netstatListen(PORT);
  ev.crashAfter = crashCount();
  ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel') };
  log('cfg', 'server cfg after: ' + ev.cfgAfter.bytes + 'B/' + ev.cfgAfter.sha + ' lines=' + ev.cfgAfter.lines);
  log('cfg', 'soundDebugLog key present: ' + ev.cfgHasKey);
  log('cfg', 'props restored: ' + ev.propsIdentical);
  log('pin', 'jar after: ' + (ev.pinsAfter.relJar.ok && ev.pinsAfter.devJar.ok ? 'byte-identical' : 'MISMATCH'));
  fs.writeFileSync(path.join(OUT, TAG + '-buddy-evidence.json'), JSON.stringify(ev, null, 2) + '\n', 'utf8');
  log('buddy', 'DONE');
}

function modeClientFlip() {
  const before = cfgInfo(CCFG);
  const text = fs.readFileSync(CCFG, 'utf8');
  if (!/B:soundDebugLog=false/.test(text)) {
    throw new Error('client cfg has no B:soundDebugLog=false — 客户端需先启动一次落键');
  }
  const after = text.replace('B:soundDebugLog=false', 'B:soundDebugLog=true');
  fs.writeFileSync(CCFG, after, 'utf8');
  const info = cfgInfo(CCFG);
  if (!/B:soundDebugLog=true/.test(fs.readFileSync(CCFG, 'utf8'))) throw new Error('flip verify failed');
  const ev = { mode: 'clientflip', before, after: info, at: new Date().toISOString() };
  fs.writeFileSync(path.join(OUT, TAG + '-clientcfg.json'), JSON.stringify(ev, null, 2) + '\n', 'utf8');
  snapshot(CCFG, TAG + '-client-etim.cfg.soundtrue');
  log('ccfg', `before ${before.bytes}B/${before.sha} lines=${before.lines}`);
  log('ccfg', `after  ${info.bytes}B/${info.sha} lines=${info.lines}`);
}

function modeClientRestore() {
  const p = path.join(OUT, TAG + '-clientcfg.json');
  if (!fs.existsSync(p)) throw new Error('missing ' + p);
  const ev0 = JSON.parse(fs.readFileSync(p, 'utf8'));
  const text = fs.readFileSync(CCFG, 'utf8');
  if (!/B:soundDebugLog=true/.test(text)) throw new Error('client cfg is not in the true form');
  fs.writeFileSync(CCFG, text.replace('B:soundDebugLog=true', 'B:soundDebugLog=false'), 'utf8');
  const info = cfgInfo(CCFG);
  const ok = info.sha === ev0.before.sha && info.bytes === ev0.before.bytes;
  log('ccfg', `restored ${info.bytes}B/${info.sha} lines=${info.lines} identical-to-prefold=${ok}`);
  if (!ok) throw new Error('client cfg restore MISMATCH vs pre-fold form');
}

async function modeWindow() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: 'window', startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [] };

  ev.pins.head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'sources');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.mk = mkCounts();

  // 服务端 cfg：buddy 已补键，钉 buddy 后 SHA
  const buddyFile = path.join(OUT, TAG + '-buddy-evidence.json');
  if (!fs.existsSync(buddyFile)) throw new Error('missing buddy evidence — run W44_MODE=buddy first');
  const buddy = JSON.parse(fs.readFileSync(buddyFile, 'utf8'));
  ev.pins.cfgBuddy = buddy.cfgAfter;
  const cfgNow = cfgInfo(CFG);
  ev.pins.cfg = { ...cfgNow, ok: cfgNow.sha === buddy.cfgAfter.sha && cfgNow.bytes === buddy.cfgAfter.bytes };

  // 客户端 cfg：必须已是 true 形态且与 flip 记录一致
  const flipFile = path.join(OUT, TAG + '-clientcfg.json');
  if (!fs.existsSync(flipFile)) throw new Error('missing clientcfg.json — run W44_MODE=clientflip first');
  const flip = JSON.parse(fs.readFileSync(flipFile, 'utf8'));
  const cNow = cfgInfo(CCFG);
  ev.pins.ccfg = { ...cNow, ok: cNow.sha === flip.after.sha && cNow.bytes === flip.after.bytes };
  ev.flip = flip.before;

  log('pin', 'HEAD=' + ev.pins.head + (ev.pins.head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  log('pin', `rel=${ev.pins.relJar.bytes}/${ev.pins.relJar.sha} ${ev.pins.relJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `dev=${ev.pins.devJar.bytes}/${ev.pins.devJar.sha} ${ev.pins.devJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `src=${ev.pins.srcJar.bytes}/${ev.pins.srcJar.sha} ${ev.pins.srcJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `cfg(server,buddy-post)=${ev.pins.cfg.bytes}/${ev.pins.cfg.sha} ${ev.pins.cfg.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `cfg(client,true)=${ev.pins.ccfg.bytes}/${ev.pins.ccfg.sha} ${ev.pins.ccfg.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `props=${ev.pins.props.bytes}/${ev.pins.props.sha} ${ev.pins.props.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));

  if (!ev.pins.relJar.ok || !ev.pins.devJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok) throw new Error('server cfg mismatch vs buddy baseline — refuse to run');
  if (!ev.pins.ccfg.ok) throw new Error('client cfg mismatch vs flip baseline — refuse to run');
  if (!ev.pins.props.ok) throw new Error('props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch (139/57/11) — refuse to run');

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }

  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD_NAME);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  else propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  ev.propsWindow = cfgInfo(PROPS);
  log('cfg', `level-name -> ${WORLD_NAME} / spawn-protection -> 0`);

  const points = pick(POINTS).filter((p) => E_ENABLE || !p.volumeZero);
  log('window', 'points=' + points.map((p) => p.id).join(','));

  let restoreOk = false;
  try {
    await runPhase({ tag: TAG + '-a', label: 'A (miningReform=true, dedicated + client)' }, points, ev);
  } finally {
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const propsAfter = fs.readFileSync(PROPS);
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter),
      identical: sha256(propsAfter) === PIN.props.sha && propsAfter.length === PIN.props.bytes };
    restoreOk = ev.propsRestored.identical;
    log('cfg', 'server.properties restored ' + (restoreOk ? 'byte-identical' : 'MISMATCH'));

    ev.sideRestored = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideRestored[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
      log('cfg', name + ' restored ' + (ev.sideRestored[name].identical ? 'byte-identical' : 'MISMATCH'));
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
      cfg: cfgInfo(CFG),
      ccfg: cfgInfo(CCFG),
    };
    ev.jarUpToDate = ev.phases.length > 0
      && ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
    ev.mixinErrors = ev.phases.flatMap((p) => p.mixinErrors || []);
  }

  // 账（写死判）
  const ph = ev.phases[0] || {};
  const pts = ph.points || [];
  const byId = Object.fromEntries(pts.map((p) => [p.id.split(' ')[0], p]));
  const shearingRows = (ph.decayAll || []).filter((l) => RE.shearing.test(l));
  const scored = pts.filter((p) => p.record !== true);
  ev.ledger = {
    serverShearing: {
      count: shearingRows.length,
      want: 1,
      rows: shearingRows,
      ok: shearingRows.length === 1 && RE.shearing.exec(shearingRows[0] || '') !== null
        && +RE.shearing.exec(shearingRows[0])[3] === 50,
    },
    clientGoldenTotal: ph.clientGoldenTotal,
    clientA: byId['W-44a'] ? byId['W-44a'].golden.length : null,
    clientB: byId['W-44b'] ? byId['W-44b'].golden.length : null,
    clientC: byId['W-44c'] ? byId['W-44c'].golden.length : null,
    clientD: byId['W-44d'] ? byId['W-44d'].golden.length : null,
    clientE: byId['W-44e'] ? byId['W-44e'].golden.length : null,
    clientEack: byId['W-44e'] ? !!byId['W-44e'].volumeAck : null,
    otherChannelsZero: (ph.rowCounts || {}).attacking === 0 && (ph.rowCounts || {}).breaking === 0
      && (ph.rowCounts || {}).reachDenied === 0,
  };

  const allPass = pts.length === points.length && scored.every((p) => p.pass)
    && ev.ledger.serverShearing.ok && ev.ledger.otherChannelsZero;
  ev.verdict = (allPass
      && (ph.clientName ? true : false)
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.mk.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate
      && ev.mixinErrors.length === 0) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of pts) log(p.id, p.pass ? 'PASS' : 'FAIL', p.checks ? JSON.stringify(p.checks) : '');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

const MODES = { buddy: modeBuddy, clientflip: modeClientFlip, clientrestore: modeClientRestore, window: modeWindow };
const fn = MODES[MODE];
if (!fn) { console.error('unknown W44_MODE: ' + MODE); process.exit(2); }
Promise.resolve().then(fn).catch((e) => { log(MODE, 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
