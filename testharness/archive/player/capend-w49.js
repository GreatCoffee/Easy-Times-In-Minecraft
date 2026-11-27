#!/usr/bin/env node
/**
 * capend-w49.js — capend 批（生命帽 / 升级回补 / 挥击饥饿）W-49 判窗驱动
 *
 * 判据正本：
 *   playground/audit/capend-立项摸底.md §9（12 点判点表）
 *   playground/audit/capend-终审回执.md §四（三动序调整＋front-prep 注记＋期望值总表）
 *   playground/audit/capend-收讫.md（D-1(b)/D-2 落码工单 · commit 9d75649）
 *
 * 判据通道（两条服务端通道＋一条旁证通道）：
 *   [CapLog]  `[CapLog] lvl=<N> cap=<X> prevBase=<F> healthBefore=<F> heal=<F> healthAfter=<F>`
 *             （playerstate/CapLog.java:27-37，Float.toString 全精度；门＝playerCaps.playerCapDebugLog）
 *   [FoodLog] `[FoodLog] <name> (<eid>) attackDrain base=<F> mod=<F> amount=<F> pool=<F>`
 *             （hunger/ETIMEndurance.java:176-190 charge()，门＝food.foodDebugLog）
 *   [MiningLog]（旁证）`[MiningLog] tool decay face=attacking item=<reg> loss=<N>`
 *             （attgate W-41 同形；创造相 loss=0 行 ⇒ 挥击落点已进伤害链、未被取消）
 *
 * 12 判点（单 boot；W4 打头以给 W1 立 prevBase=20 基线，W5/W6 按动序调整）：
 *   W4  /etest level 35            → lvl=35 cap=20 prevBase=6  heal=14 healthAfter=20
 *   W1  /etest level 0             → lvl=0  cap=6  prevBase=20 healthAfter=6（降级钳）
 *   W2  /etest level 5             → lvl=5  cap=8
 *   W3  /etest level 10            → lvl=10 cap=10
 *   W5  level 4 → wait frame → health 3 → level 5
 *                                  → lvl=5 cap=8 prevBase=6 healthBefore=3.0 heal=2.0 healthAfter=5.0
 *   W6  health 8 → level 4         → lvl=4 cap=6 prevBase=8 healthBefore=8.0 heal=0 healthAfter=6.0
 *   W7  空手击僵尸（L0）           → attackDrain base=0.3 mod=1.0 amount=0.3
 *   W8  胸甲 endurance L1 再击     → mod=0.8 amount=0.24000001
 *   W9  低血（health 1）空手击     → 零 attackDrain ＋ weakStrike deny 行
 *   W10 创造模式击                 → 零 attackDrain（旁证 W10x：持剑创造击 ⇒ MiningLog loss=0）
 *   W11 侧向一格空挥（arm_animation，无目标）→ 零 attackDrain
 *   W12 胸甲 endurance L4 击       → mod=0.19999999 amount=0.06
 *
 * 用法：node capend-w49.js [tag]
 *   W49_ONLY=W4,W1（判点裁剪，冒烟用）
 *   W49_STAGE=<tag 前缀>（.out 名隔离）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'capend-w49';
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
const WORLD = 'capendw49';
const PORT = 25565;
const BOT = 'ETIM_W49';
const MOB_SEL = '@e[tag=w49mob]';
const MOB_NBT = '{Tags:["w49mob"],NoAI:1b,Silent:1b,PersistenceRequired:1b,'
  + 'Attributes:[{Name:"generic.maxHealth",Base:1000.0},{Name:"generic.knockbackResistance",Base:1.0}],'
  + 'Health:1000.0f}';

/** 起收钉（commit 9d75649，capend 落码后 jar 已 publish；cfg 双件为**落码前**基线，本窗按任务书改两键）。 */
const PIN = {
  head: '9d75649',
  rel: { bytes: 776797, sha: '1073A59A7A14BEE94908199205FB912E32B5F3C4E94116694427A8EF3E998B3E' },
  dev: { bytes: 760949, sha: '8BC04E70C0CA0B2DFEBA9953DD34648C7FB5CE552337F5DE9589967728EBF421' },
  src: { bytes: 705207, sha: 'E4B38D9EAC146603803542E9778067F283A92B709DC1011A21DCAF8607DA417F' },
  cfgBefore: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClientBefore: { bytes: 30277, sha: 'E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/** MK 钉：本批只动 ETIMConfig / PlayerCapApplier / 新件 CapLog，mixin 面零动。 */
const MK_PIN = {
  mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138,
  sword: 4, tool: 4, shears: 3, sliceTotal: 11,
};

/* ============================ 判行正则 ============================ */

const RE = {
  cap: /\[CapLog\] lvl=(-?\d+) cap=(-?\d+) prevBase=(-?[\d.]+) healthBefore=(-?[\d.]+) heal=(-?[\d.]+) healthAfter=(-?[\d.]+)/,
  drain: /\[FoodLog\]\s+(\S+) \((\d+)\) attackDrain base=(\S+) mod=(\S+) amount=(\S+) pool=(\S+)/,
  weakStrike: /\[FoodLog\].*weakStrike deny degenerate-fix/,
  probe: /\[EnchantLog\] enchantprobe slot=(\S+) item=(\S+) canApply=(\S+) maxLevel=(\d+)/,
  decay: /\[MiningLog\] tool decay face=attacking item=(\S+) loss=(\d+)/,
  foodPool: /commands\.etest\.food_set_pool/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  done: /Done \(/,
  placed: /Block placed|Unable to place/i,
  sayOk: /\[Server\] /,
};

/* ============================ 判点定义 ============================ */

/** [CapLog] 点：steps 逐条下发；waitFrames = 等到本段第 k 条 [CapLog] 行（含）。 */
const CAP_POINTS = [
  {
    id: 'W4', group: 'CAP', note: '/etest level 35（答案封顶 20）',
    steps: [{ cmd: `etest level 35 ${BOT}`, waitFrames: 1 }],
    expect: [{ lvl: 35, cap: 20, prevBase: 6, healthBefore: 6, heal: 14, healthAfter: 20 }],
  },
  {
    id: 'W1', group: 'CAP', note: '/etest level 0（cap 20→6 降级臂钳）',
    steps: [{ cmd: `etest level 0 ${BOT}`, waitFrames: 1 }],
    expect: [{ lvl: 0, cap: 6, prevBase: 20, healthBefore: 20, heal: 0, healthAfter: 6 }],
  },
  {
    id: 'W2', group: 'CAP', note: '/etest level 5（cap=capAtLevel0+1×2）',
    steps: [{ cmd: `etest level 5 ${BOT}`, waitFrames: 1 }],
    expect: [{ lvl: 5, cap: 8, prevBase: 6, healthBefore: 6, heal: 2, healthAfter: 8 }],
  },
  {
    id: 'W3', group: 'CAP', note: '/etest level 10（cap=6+2×2）',
    steps: [{ cmd: `etest level 10 ${BOT}`, waitFrames: 1 }],
    expect: [{ lvl: 10, cap: 10, prevBase: 8, healthBefore: 8, heal: 2, healthAfter: 10 }],
  },
  {
    id: 'W5', group: 'CAP', note: '动序：level 4（落回 6 档）→ health 3 → level 5（true 档回补 2.0）',
    steps: [
      { cmd: `etest level 4 ${BOT}`, waitFrames: 1 },
      { sleep: 300 },
      { cmd: `etest health 3 ${BOT}` },
      { sleep: 400 },
      { cmd: `etest level 5 ${BOT}`, waitFrames: 2 },
    ],
    expect: [
      { lvl: 4, cap: 6, prevBase: 10, healthBefore: 10, heal: 0, healthAfter: 6 },
      { lvl: 5, cap: 8, prevBase: 6, healthBefore: 3, heal: 2, healthAfter: 5 },
    ],
  },
  {
    id: 'W6', group: 'CAP', note: '动序：level 5（已在档）→ health 8（钳内）→ level 4（降级收窄）',
    steps: [
      { cmd: `etest health 8 ${BOT}` },
      { sleep: 400 },
      { cmd: `etest level 4 ${BOT}`, waitFrames: 1 },
    ],
    expect: [{ lvl: 4, cap: 6, prevBase: 8, healthBefore: 8, heal: 0, healthAfter: 6 }],
  },
];

/** [FoodLog] 点：prep 为前置命令（每点重下，保证状态独立）；action = attack | swingAir。 */
const HUN_POINTS = [
  {
    id: 'W7', group: 'HUN', action: 'attack', note: '空手击僵尸（L0，无耐力）',
    prep: [`etest health 6 ${BOT}`, `etest food 6 6 ${BOT}`, `gamemode 0 ${BOT}`, `etest hold air ${BOT}`],
    drains: [{ base: '0.3', mod: '1.0', amount: '0.3' }], deny: false, decay: null,
  },
  {
    id: 'W8', group: 'HUN', action: 'attack', note: '胸甲 endurance L1 再击（mod=1−1×0.2）',
    prep: [
      `replaceitem entity ${BOT} slot.armor.chest minecraft:iron_chestplate`,
      `etest enchant chest 1 endurance ${BOT}`,
      `etest enchantprobe chest none ${BOT}`,
      `etest health 6 ${BOT}`, `etest food 6 6 ${BOT}`, `gamemode 0 ${BOT}`, `etest hold air ${BOT}`,
    ],
    probeItem: 'minecraft:iron_chestplate',
    drains: [{ base: '0.3', mod: '0.8', amount: '0.24000001' }], deny: false, decay: null,
  },
  {
    id: 'W9', group: 'HUN', action: 'attack', note: '低血（health 1 < 2.0）空手击 ⇒ weakStrike deny',
    prep: [`etest health 1 ${BOT}`, `etest food 6 6 ${BOT}`, `gamemode 0 ${BOT}`, `etest hold air ${BOT}`],
    drains: [], deny: true, decay: null,
  },
  {
    id: 'W10', group: 'HUN', action: 'attack', note: '创造模式击（charge() 创造门零计费）',
    prep: [`etest health 6 ${BOT}`, `etest food 6 6 ${BOT}`, `gamemode 1 ${BOT}`, `etest hold air ${BOT}`],
    drains: [], deny: false, decay: null,
  },
  {
    id: 'W10x', group: 'HUN', action: 'attack', witness: true, note: '旁证（非判点）：创造持铁剑击 ⇒ [MiningLog] attacking loss=0 行证明落点进伤害链',
    prep: [`etest health 6 ${BOT}`, `etest food 6 6 ${BOT}`, `gamemode 1 ${BOT}`, `etest hold minecraft:iron_sword ${BOT}`],
    drains: [], deny: false, decay: { item: 'minecraft:iron_sword', loss: 0 },
  },
  {
    id: 'W11', group: 'HUN', action: 'swingAir', note: '侧向一格空挥（只发 arm_animation，无 use_entity）⇒ 零 attackDrain',
    prep: [`gamemode 0 ${BOT}`, `etest health 6 ${BOT}`, `etest food 6 6 ${BOT}`, `etest hold air ${BOT}`],
    drains: [], deny: false, decay: null,
  },
  {
    id: 'W12', group: 'HUN', action: 'attack', note: '胸甲 endurance L4 击（1−4×0.2 = 0.19999999）',
    prep: [
      `replaceitem entity ${BOT} slot.armor.chest minecraft:iron_chestplate`,
      `etest enchant chest 4 endurance ${BOT}`,
      `etest enchantprobe chest none ${BOT}`,
      `gamemode 0 ${BOT}`, `etest health 6 ${BOT}`, `etest food 6 6 ${BOT}`, `etest hold air ${BOT}`,
    ],
    probeItem: 'minecraft:iron_chestplate',
    drains: [{ base: '0.3', mod: '0.19999999', amount: '0.06' }], deny: false, decay: null,
  },
];

const ALL_POINTS = [...CAP_POINTS, ...HUN_POINTS];
const ONLY = (process.env.W49_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const STAGE = (process.env.W49_STAGE || TAG).trim();

function pick(list) {
  return ONLY.length ? list.filter((p) => ONLY.includes(p.id)) : list;
}

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

/** cfg 两键 upsert：缺失则插到 playercaps 段 I:capMaximum 之后（key 序 capMaximum < playerCapDebugLog < playerHealOnLevelUp），存在则改写值。 */
function ensureCfgKeys(text) {
  let out = text;
  const has = (k) => new RegExp('^[ \\t]*B:' + k + '=', 'm').test(out);
  const needCap = !has('playerCapDebugLog');
  const needHeal = !has('playerHealOnLevelUp');
  if (needCap || needHeal) {
    const lines = out.split('\r\n');
    const i = lines.findIndex((l) => /^[ \t]*I:capMaximum=/.test(l));
    if (i < 0) throw new Error('cfg: playercaps I:capMaximum line missing');
    const ins = [];
    if (needCap) {
      ins.push('    # [CapLog] rows of the capend health/food cap chain (lvl/cap/prevBase/heal) — the W-49 judgment channel; silent when off [default: false]');
      ins.push('    B:playerCapDebugLog=true');
      ins.push('');
    }
    if (needHeal) {
      ins.push('    # Level-up top-up heal: cap - previous on a cap RISE (capend D-1(b); false = the R196 level-path reality, EntityPlayer:1824 suppresses the :1859-1861 heal) [default: true]');
      ins.push('    B:playerHealOnLevelUp=true');
    }
    lines.splice(i + 1, 0, ...ins);
    out = lines.join('\r\n');
  }
  out = out.replace(/(^[ \t]*B:playerCapDebugLog=)\S+/m, '$1true');
  out = out.replace(/(^[ \t]*B:playerHealOnLevelUp=)\S+/m, '$1true');
  return out;
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

/** 5×5 石台（by−1 地台＋by..by+2 净空）。 */
async function buildArena(srv, geo) {
  const R = 3;
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:stone 0`);
      for (const dy of [0, 1, 2]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
      }
    }
  }
  await sleep(1400);
  return { cells: (2 * R + 1) * (2 * R + 1) };
}

function findMob(bot) {
  for (const k of Object.keys(bot.entities || {})) {
    const e = bot.entities[k];
    if (e && e.name === 'zombie') return e;
  }
  return null;
}

async function waitMob(bot, timeoutMs) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const e = findMob(bot);
    if (e) return e;
    await sleep(200);
  }
  return null;
}

/** 体心瞄准的一挥（use_entity mouse=1 = ATTACK）。 */
async function swingAt(bot, ent) {
  const aim = ent.position.offset(0, 0.9, 0);
  await bot.lookAt(aim, false);
  await sleep(220);
  bot.attack(ent);
  return { aim: { x: +aim.x.toFixed(2), y: +aim.y.toFixed(2), z: +aim.z.toFixed(2) } };
}

function botSnap(bot) {
  return {
    health: bot.health,
    food: bot.food,
    level: bot.experience ? bot.experience.level : null,
    xp: bot.experience ? bot.experience.points : null,
    pos: bot.entity ? { x: +bot.entity.position.x.toFixed(2), y: +bot.entity.position.y.toFixed(2), z: +bot.entity.position.z.toFixed(2) } : null,
  };
}

/* ============================ 判读 ============================ */

function parseCaps(srv, from, to) {
  const out = [];
  for (let i = from; i < to; i++) {
    const l = srv.all[i];
    const m = RE.cap.exec(l);
    if (!m) continue;
    out.push({
      idx: i + 1, ts: logTime(l),
      lvl: +m[1], cap: +m[2], prevBase: +m[3],
      healthBefore: +m[4], heal: +m[5], healthAfter: +m[6],
      raw: stripPrefix(l),
    });
  }
  return out;
}

async function waitCapFrames(srv, from, count, timeoutMs = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (parseCaps(srv, from, srv.all.length).length >= count) return true;
    await sleep(120);
  }
  return false;
}

async function waitSay(srv, text, from) {
  return srv.waitFor(new RegExp('\\[Server\\] ' + text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 6000, from);
}

async function say(srv, text) {
  const from = srv.all.length;
  srv.send(`say ${text}`);
  await waitSay(srv, text, from);
  await sleep(120);
  return from;
}

/* ============================ 判点执行 ============================ */

async function runCapPoint(srv, bot, p) {
  const rec = {
    id: p.id, group: p.group, note: p.note, expect: p.expect,
    cmds: [], frames: [], checkList: [],
  };
  log(p.id, 'start', p.note);
  const from = await say(srv, `W49-${p.id}-BEGIN`);
  rec.segFrom = from;

  for (const step of p.steps) {
    if (step.sleep) { await sleep(step.sleep); continue; }
    if (step.cmd) {
      const f = srv.all.length;
      srv.send(step.cmd);
      rec.cmds.push({ cmd: step.cmd, driverTs: stamp(), logIdx: f + 1, logTs: null });
      log(p.id, 'cmd', step.cmd);
    }
    if (step.waitFrames) {
      const ok = await waitCapFrames(srv, from, step.waitFrames);
      if (!ok) log(p.id, 'WARN no [CapLog] frame within 8s (want ' + step.waitFrames + ')');
      await sleep(220);
    } else {
      await sleep(260);
    }
  }
  await sleep(400);
  await say(srv, `W49-${p.id}-END`);
  rec.segTo = srv.all.length;
  rec.frames = parseCaps(srv, rec.segFrom, rec.segTo);
  rec.endState = botSnap(bot);

  // 逐帧对表
  const ex = p.expect;
  rec.checkList = [];
  const got = rec.frames;
  rec.checkList.push({ k: 'frameCount', want: ex.length, got: got.length, ok: got.length === ex.length });
  const keys = ['lvl', 'cap', 'prevBase', 'healthBefore', 'heal', 'healthAfter'];
  for (let i = 0; i < Math.min(got.length, ex.length); i++) {
    for (const k of keys) {
      rec.checkList.push({
        k: `f${i}.${k}`, want: ex[i][k], got: got[i][k],
        ok: got[i][k] === ex[i][k],
      });
    }
  }
  rec.pass = rec.checkList.every((c) => c.ok);
  log(p.id, rec.pass ? 'PASS' : 'FAIL', JSON.stringify(got.map((f) => `${f.lvl}/${f.cap}/${f.prevBase}/${f.healthBefore}/${f.heal}/${f.healthAfter}`)));
  return rec;
}

async function runHunPoint(srv, bot, p, geo) {
  const rec = {
    id: p.id, group: p.group, note: p.note, witness: !!p.witness,
    expect: { drains: p.drains, deny: p.deny, decay: p.decay },
    cmds: [], checkList: [], geoMob: { zx: geo.zx, zy: geo.zy, zz: geo.zz },
  };
  log(p.id, 'start', p.note);
  const from = await say(srv, `W49-${p.id}-BEGIN`);
  rec.segFrom = from;

  for (const cmd of p.prep) {
    srv.send(cmd);
    rec.cmds.push({ cmd, driverTs: stamp(), logIdx: srv.all.length, logTs: null });
  }
  await sleep(500);

  // 靶定位（每点复摆，消掉击退/位移影响）
  srv.send(`tp ${MOB_SEL} ${geo.zx} ${geo.zy} ${geo.zz}`);
  await sleep(420);

  const ent = await waitMob(bot, 6000);
  rec.mobId = ent ? ent.id : null;
  rec.botBefore = botSnap(bot);
  if (!ent) throw new Error(p.id + ': zombie not visible to bot');

  if (p.action === 'attack') {
    rec.swing = await swingAt(bot, ent);
  } else {
    // 侧向一格空挥：只发 arm_animation（无 use_entity ⇒ 无 AttackEntityEvent）
    await bot.look((bot.entity.yaw || 0) + Math.PI / 2, 0, true);
    await sleep(220);
    bot.swingArm('right');
    rec.swing = { mode: 'arm_animation-only' };
  }
  log(p.id, 'swing', JSON.stringify(rec.swing));
  await sleep(1100);
  rec.botAfter = botSnap(bot);
  await say(srv, `W49-${p.id}-END`);
  rec.segTo = srv.all.length;

  rec.drains = [];
  rec.denies = [];
  rec.decays = [];
  rec.probes = [];
  for (let i = rec.segFrom; i < rec.segTo; i++) {
    const l = srv.all[i];
    const d = RE.drain.exec(l);
    if (d) {
      rec.drains.push({ idx: i + 1, ts: logTime(l), base: d[3], mod: d[4], amount: d[5], pool: d[6], raw: stripPrefix(l) });
    }
    if (RE.weakStrike.test(l)) rec.denies.push({ idx: i + 1, ts: logTime(l), raw: stripPrefix(l) });
    const m = RE.decay.exec(l);
    if (m) rec.decays.push({ idx: i + 1, ts: logTime(l), item: m[1], loss: +m[2], raw: stripPrefix(l) });
    const pr = RE.probe.exec(l);
    if (pr) rec.probes.push({ idx: i + 1, ts: logTime(l), slot: pr[1], item: pr[2], raw: stripPrefix(l) });
  }

  // 判格
  rec.checkList.push({ k: 'drainCount', want: p.drains.length, got: rec.drains.length, ok: rec.drains.length === p.drains.length });
  for (let i = 0; i < Math.min(rec.drains.length, p.drains.length); i++) {
    for (const k of ['base', 'mod', 'amount']) {
      rec.checkList.push({
        k: `d${i}.${k}`, want: p.drains[i][k], got: rec.drains[i][k],
        ok: rec.drains[i][k] === p.drains[i][k],
      });
    }
  }
  if (p.deny) {
    rec.checkList.push({ k: 'weakStrikeDeny>=1', want: '>=1', got: rec.denies.length, ok: rec.denies.length >= 1 });
  } else {
    rec.checkList.push({ k: 'weakStrikeDeny==0', want: 0, got: rec.denies.length, ok: rec.denies.length === 0 });
  }
  if (p.decay) {
    const hit = rec.decays.filter((d) => d.item === p.decay.item && d.loss === p.decay.loss);
    rec.checkList.push({ k: 'decayWitness', want: `${p.decay.item}/${p.decay.loss}`, got: rec.decays.length, ok: hit.length === 1 });
  }
  if (p.probeItem) {
    const hit = rec.probes.filter((r) => r.slot.toLowerCase() === 'chest' && r.item === p.probeItem);
    rec.checkList.push({ k: 'chestSlotProbe', want: p.probeItem, got: rec.probes.map((r) => r.item).join('|') || '(none)', ok: hit.length >= 1 });
  }
  rec.pass = rec.checkList.every((c) => c.ok);
  log(p.id, rec.pass ? 'PASS' : 'FAIL', JSON.stringify(rec.checkList.filter((c) => !c.ok)));
  return rec;
}

/* ============================ 主流程 ============================ */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = {
    tag: TAG, only: ONLY, startedAt: new Date().toISOString(), workspace: ROOT,
    pins: {}, points: [], notes: [], bootCount: 1,
  };

  // ---------- 起窗钉 ----------
  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  ev.pins.cfgBefore = pinOf(CFG, PIN.cfgBefore, 'cfgBefore');
  ev.pins.cfgClientBefore = pinOf(CFG_CLIENT, PIN.cfgClientBefore, 'cfgClientBefore');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.mk = mkCounts();
  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);

  for (const k of ['devJar', 'relJar', 'srcJar', 'cfgBefore', 'cfgClientBefore', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', `HEAD=${head} crashBefore=${ev.pins.crashBefore} portBefore=${ev.pins.portBefore}`);
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfgBefore.ok || !ev.pins.cfgClientBefore.ok || !ev.pins.props.ok) throw new Error('cfg/props pre-window pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch — refuse to run');
  if (!head.startsWith(PIN.head)) throw new Error('HEAD pin mismatch — refuse to run');

  // ---------- 窗前面快照（原字节） ----------
  ev.cfgBeforeSnap = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.cfgClientBeforeSnap = snapshot(CFG_CLIENT, TAG + '-client-etim.cfg.before');
  ev.propsSnap = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }

  // ---------- cfg 两键（任务书 §一） ----------
  fs.writeFileSync(CFG, ensureCfgKeys(fs.readFileSync(CFG, 'utf8')), 'utf8');
  fs.writeFileSync(CFG_CLIENT, ensureCfgKeys(fs.readFileSync(CFG_CLIENT, 'utf8')), 'utf8');
  const cfgEdited = fs.readFileSync(CFG);
  const cfgCEdited = fs.readFileSync(CFG_CLIENT);
  ev.cfgEdited = {
    bytes: cfgEdited.length, sha: sha256(cfgEdited),
    bytesClient: cfgCEdited.length, shaClient: sha256(cfgCEdited),
  };
  const fx = cfgEdited.toString('utf8');
  const fxc = cfgCEdited.toString('utf8');
  ev.cfgFlags = {
    server: {
      playerCapDebugLog: cfgValue(fx, 'playerCapDebugLog'),
      playerHealOnLevelUp: cfgValue(fx, 'playerHealOnLevelUp'),
      foodDebugLog: cfgValue(fx, 'foodDebugLog'),
      foodModel: cfgValue(fx, 'foodModel'),
      miningDebugLog: cfgValue(fx, 'miningDebugLog'),
      miningReform: cfgValue(fx, 'miningReform'),
      enduranceModifierStep: cfgValue(fx, 'enduranceModifierStep'),
      attackHungerPerHit: cfgValue(fx, 'attackHungerPerHit'),
      enduranceMaxLevel: cfgValue(fx, 'enduranceMaxLevel'),
      hungerWeakStrike: cfgValue(fx, 'hungerWeakStrike'),
      weakStrikeHealthThreshold: cfgValue(fx, 'weakStrikeHealthThreshold'),
      capAtLevel0: cfgValue(fx, 'capAtLevel0'),
      capGrowthPerFiveLevels: cfgValue(fx, 'capGrowthPerFiveLevels'),
      capMaximum: cfgValue(fx, 'capMaximum'),
    },
    client: {
      playerCapDebugLog: cfgValue(fxc, 'playerCapDebugLog'),
      foodDebugLog: cfgValue(fxc, 'foodDebugLog'),
    },
  };
  log('config', 'edited: ' + JSON.stringify(ev.cfgFlags));
  const fs_ = ev.cfgFlags.server;
  if (fs_.playerCapDebugLog !== 'true' || fs_.playerHealOnLevelUp !== 'true' || fs_.foodDebugLog !== 'true'
    || fs_.foodModel !== 'true' || fs_.miningDebugLog !== 'true' || fs_.miningReform !== 'true'
    || fs_.enduranceModifierStep !== '0.2' || fs_.attackHungerPerHit !== '0.3' || fs_.enduranceMaxLevel !== '4'
    || fs_.hungerWeakStrike !== 'true' || fs_.capAtLevel0 !== '6' || fs_.capGrowthPerFiveLevels !== '2' || fs_.capMaximum !== '20') {
    throw new Error('cfg 前提键不中（通道/判值前提）— refuse to run');
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

    // boot 后 cfg 新基线（Forge config.save() 全量重写）
    const cfgAfterBoot = fs.readFileSync(CFG);
    ev.cfgAfterBoot = {
      bytes: cfgAfterBoot.length, sha: sha256(cfgAfterBoot),
      playerCapDebugLog: cfgValue(cfgAfterBoot.toString('utf8'), 'playerCapDebugLog'),
      playerHealOnLevelUp: cfgValue(cfgAfterBoot.toString('utf8'), 'playerHealOnLevelUp'),
    };
    fs.copyFileSync(CFG, path.join(OUT, TAG + '-etim.cfg.afterboot'));
    log('config', 'after boot cfg ' + ev.cfgAfterBoot.bytes + ' B ' + ev.cfgAfterBoot.sha);

    // ---------- bot ----------
    bot = await connectBot();
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('difficulty 2');
    srv.send('time set 18000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    await sleep(2000);

    // W0 登录帧（属性 repatch，非判点）
    ev.presents = parseCaps(srv, 0, srv.all.length);
    log('presents', '[CapLog] boot frames=' + ev.presents.length + ' ' + JSON.stringify(ev.presents.map((f) => f.raw)));

    const p0 = bot.entity.position;
    const geo = { bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z) };
    ev.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    ev.arena = await buildArena(srv, geo);
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

    // ---------- CAP 组 ----------
    const capPts = pick(CAP_POINTS);
    for (const p of capPts) {
      let rec;
      try {
        rec = await runCapPoint(srv, bot, p);
      } catch (e) {
        rec = { id: p.id, group: p.group, fatal: (e && e.stack) || String(e), pass: false, checkList: [] };
        log(p.id, 'FATAL', rec.fatal);
      }
      ev.points.push(rec);
    }

    // ---------- HUN 组前置 ----------
    await say(srv, 'W49-HUN-PREP-BEGIN');
    srv.send(`clear ${BOT}`);
    srv.send(`etest level 0 ${BOT}`);
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`etest health 6 ${BOT}`);
    srv.send(`etest food 6 6 ${BOT}`);
    await sleep(700);
    srv.send(`summon minecraft:zombie ${geo.bx + 2.5} ${geo.by} ${geo.bz + 0.5} ${MOB_NBT}`);
    await sleep(1600);
    await say(srv, 'W49-HUN-PREP-END');

    const hunPts = pick(HUN_POINTS);
    for (const p of hunPts) {
      let rec;
      try {
        rec = await runHunPoint(srv, bot, p, { zx: geo.bx + 2.5, zy: geo.by, zz: geo.bz + 0.5 });
      } catch (e) {
        rec = { id: p.id, group: p.group, fatal: (e && e.stack) || String(e), pass: false, checkList: [] };
        log(p.id, 'FATAL', rec.fatal);
      }
      ev.points.push(rec);
    }

    // ---------- 全窗通道计数 ----------
    ev.rowCounts = {
      capTotal: srv.all.filter((l) => RE.cap.test(l)).length,
      drainTotal: srv.all.filter((l) => RE.drain.test(l)).length,
      weakStrike: srv.all.filter((l) => RE.weakStrike.test(l)).length,
      decayAttacking: srv.all.filter((l) => RE.decay.test(l)).length,
      mixinFail: srv.all.filter((l) => RE.mixinFail.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));
  } catch (e) {
    ev.fatal = (e && e.stack) || String(e);
    log('main', 'FATAL', ev.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    try { srv.send(`kill ${MOB_SEL}`); } catch (e) { /* ignore */ }
    await sleep(600);
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

    // ---------- 收口：cfg 回原字节（本窗两键值随 boot 申报；闭环原样归还，下窗 boot 自动重写） ----------
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgBeforeSnap.path));
    const cfgBack = fs.readFileSync(CFG);
    ev.cfgClose = {
      bytes: cfgBack.length, sha: sha256(cfgBack),
      identical: sha256(cfgBack) === PIN.cfgBefore.sha && cfgBack.length === PIN.cfgBefore.bytes,
    };
    // 客户端档：本窗零客户端、不 boot ⇒ 回原字节
    fs.writeFileSync(CFG_CLIENT, fs.readFileSync(ev.cfgClientBeforeSnap.path));
    const clientBack = fs.readFileSync(CFG_CLIENT);
    ev.cfgClientClose = {
      bytes: clientBack.length, sha: sha256(clientBack),
      identical: sha256(clientBack) === PIN.cfgClientBefore.sha && clientBack.length === PIN.cfgClientBefore.bytes,
    };
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnap.path));
    const propsBack = fs.readFileSync(PROPS);
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
  const judged = pts.filter((p) => !p.witness);
  ev.ledger = {
    faces: judged.length,
    checked: judged.length,
    pass: judged.filter((p) => p.pass).length,
    fail: judged.filter((p) => !p.pass).length,
    witnesses: pts.filter((p) => p.witness).length,
    failedIds: judged.filter((p) => !p.pass).map((p) => p.id),
  };
  ev.verdict = (
    judged.length === 12
    && judged.every((p) => p.pass)
    && ev.rowCounts && ev.rowCounts.mixinFail === 0
    && ev.pinsAfter && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.srcJar.ok
    && ev.pinsAfter.mk.ok
    && ev.portAfter === 0
    && ev.crashAfter === ev.pins.crashBefore
    && ev.jarUpToDate
    && ev.worldRemoved === true
    && ev.buildSuccessful === true
  ) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of pts) log(p.id, p.pass ? 'PASS' : 'FAIL');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', (e && e.stack) || e); process.exit(1); });
