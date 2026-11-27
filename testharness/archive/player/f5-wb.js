#!/usr/bin/env node
/**
 * f5-wb.js — fishing_fortune 批（B6）W-FF 判窗驱动（六模式）
 *   main  : W-FF1 载体门 / W-FF2 案 M 窗＋槽预算＋上限位 / W-FF3 九段精确值 /
 *           W-FF4 咬率量级 / W-FF-REG / W-FF-CFG（首启 20 键面）
 *   fish  : W-FF5 真实抛收（window/catch）/ W-FF6 三洋站位 / W-FF10 luck 与 lure 桥
 *   worm  : W-FF7 青草蚯蚓四臂（晴 f0 / 雨 f0 / 雨 f1 / 雨 f3）
 *   arrow : W-FF8 arrowprobe ＋真实弓射 200 / W-FF9 doMobLoot=false ＋幼体
 *   cfg   : vanillaLureActive=false（lure=0）＋ fishingLargeFishChance=0（全 cod）
 *   cfg2  : fishingBiteChanceMin=1200 ＋ fishingFortuneMaxLevel=1 ＋ fishingSystem=false ＋
 *           arrowRecoverySystem=false（负向臂）
 * 世界：全程共用 run/f5wb（末窗 cfg2 删除）。
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
const MODE = (process.argv[2] || 'main').toLowerCase();
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const OBFCFG = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const TAG = 'f5-wb-' + MODE;
const WORLD = 'f5wb';
const BOT = 'ETIM_R7';
const PORT = 25565;

const PIN = {
  head: '895fc1e',
  rel: { bytes: 919309, sha: '776FAC30981D3AE7E39BD3D0EB90E73021F97F5F113FD51C3C7ABE1A3F54F0C4' },
  dev: { bytes: 900812, sha: '20DFADB68B561A8D637F251EFEAA27836478F8EFF1566D3FC0273597F7B8A35C' },
  src: { bytes: 840827, sha: 'C4AA67325F0191E606AE480134B8D1A7C38C0DFA6944172B2E2ABED151B4C893' },
  props: { bytes: 917, sha: '4BEB6B49E11251E938DDA3FAD3D610D374D90A3195FB93E9F0F9DC3ACB378800' },
};
const MK_PIN = { classes: 68, entries: 154, dual: 308, mixins: 63, client: 10 };
const OBFCFG_SHA = '262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

function setProp(t, k, v) { return t.replace(new RegExp('(^|\\r\\n)' + k + '=[^\\r\\n]*', 'm'), (m, p1) => p1 + k + '=' + v); }
function setCfg(file, k, v) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + k + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg key missing ' + k);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + v), 'utf8');
}
function cfgKeys(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^    [A-Z]:(\w+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
function pinOf(file, pin, label) {
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}
function mkCounts() {
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
  const out = {};
  for (const [key, f] of [['refmapResources', REFMAP_A], ['refmapTmp', REFMAP_B]]) {
    const r = read(f);
    const entries = Object.values(r.mappings).reduce((a, x) => a + Object.keys(x).length, 0);
    out[key] = { classes: Object.keys(r.mappings).length, entries, dual: entries * 2 };
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.classes && out.refmapResources.entries === MK_PIN.entries
    && out.refmapTmp.classes === MK_PIN.classes && out.refmapTmp.entries === MK_PIN.entries
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client;
  return out;
}
function netstatListen(port) {
  try {
    return execFileSync('netstat', ['-ano'], { encoding: 'utf8' })
      .split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) { return -1; }
}
function crashCount() {
  try { return fs.readdirSync(path.join(ROOT, 'run', 'crash-reports')).filter((f) => fs.statSync(path.join(ROOT, 'run', 'crash-reports', f)).isFile()).length; }
  catch (e) { return -1; }
}
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

const RE = {
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?)\s*\[server\]/,
  slot: /\[EnchantLog\] pool slot=(\d+) budget=(\d+) size=(\d+) item=(\S+)/,
  ids: /\[EtimInit\] enchant.*?ids=([\d\s]+)/,
  gateHook: /\[FishLog\] gate wt=(\d+) adj=(-?\d+) dist=(\d+) blue=(\d) ci0=(\d+) light=(\d) ci2=(\d+) L=(\d+) lure=(\d+) ci3=(\d+) worm=(\d+) ci4=(\d+) roll=(\d+) bite=(\d)/,
  gateToken: /\[FishLog\] gate token=1 wt=(\d+) adj=(-?\d+) dist=(\d+) ci0=(\d+) light=(\d) ci2=(\d+) L=(\d+) lure=(\d+) ci3=(\d+) worm=(\d+) ci4=(\d+)/,
  summary: /\[FishLog\] gate-summary n=(\d+) hits=(\d+) ci=(\d+)/,
  catchRow: /\[FishLog\] catch kind=(\S+) rod=(\d+) item=(\S+) q=(\d+) removed=(\d+) xp=(\d+) worm=(-?\d+)/,
  window: /\[FishLog\] window ticks=(-?\d+)/,
  type: /\[FishLog\] type n=(\d+) cod=(\d+) salmon=(\d+) pos=(\S+) biome=(\S+)/,
  worm: /\[FishLog\] worm denom=(\d+) f=(\d+) rain=(\d) hit=(\d)/,
  cast: /\[FishLog\] cast player=(\S+) ok=(\d)/,
  recovery: /\[ArrowLog\] recovery victim=(\S+) lvl=(\d+) r5=(\d+) pass5=(\d) mat=(\S+) c=([\d.]+) passC=(\d) result=(\S+)/,
  recoveryDeath: /\[ArrowLog\] recovery-death victim=(\S+) loot=(\d) child=(\d) dropped=(\d+)/,
  arrowToken: /\[ArrowLog\] recovery token=1 mat=(\S+) L=(\d+) divisor=(\d+) c=([\d.]+) n=(\d+) keep=(\d+)/,
};
const EXPECTED_REG_WINDOW = {
  'etim:speed': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:regeneration': 'L1=11/30 L2=31/50 L3=51/70 L4=71/90 L5=91/999',
  'etim:poison': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:true_flight': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:quickness': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:stun': 'L1=6/20 L2=21/35 L3=36/50 L4=51/65 L5=66/999',
  'etim:vampiric': 'L1=11/30 L2=31/50 L3=51/70 L4=71/90 L5=91/999',
  'etim:disarming': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:fertility': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:harvesting': 'L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999',
  'etim:etim_butchering': 'L1=1/10 L2=11/20 L3=21/999',
};

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: MODE, startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head;
  ev.headOk = head.startsWith(PIN.head);
  ev.pins = {
    devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
    srcJar: pinOf(SRCJAR, PIN.src, 'src'), props: pinOf(PROPS, PIN.props, 'props'), mk: mkCounts(),
  };
  ev.crashBefore = crashCount();
  ev.portBefore = netstatListen(PORT);
  ev.obfCfgBefore = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)) };
  const keysBefore = cfgKeys(CFG);
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), keys: Object.keys(keysBefore).length };
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH')
    + ' dev=' + ev.pins.devJar.sha.slice(0, 12) + ' rel=' + ev.pins.relJar.sha.slice(0, 12)
    + ' src=' + ev.pins.srcJar.sha.slice(0, 12) + ' mk=' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  if (!ev.headOk) throw new Error('HEAD mismatch');

  /* 窗内门控与 cfg 翻转（各模式自己定） */
  setCfg(CFG, 'fishingDebugLog', 'true');
  setCfg(CFG, 'arrowDebugLog', 'true');
  if (MODE === 'cfg') {
    setCfg(CFG, 'vanillaLureActive', 'false');
    setCfg(CFG, 'fishingLargeFishChance', '0.0');
  }
  if (MODE === 'cfg2') {
    setCfg(CFG, 'fishingBiteChanceMin', '1200');
    setCfg(CFG, 'fishingFortuneMaxLevel', '1');
    setCfg(CFG, 'fishingSystem', 'false');
    setCfg(CFG, 'arrowRecoverySystem', 'false');
  }
  ev.cfgFlipped = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let bx = 0, by = 0, bz = 0;
  const rowsFrom = (from) => srv.all.slice(from).map(strip);
  const mark = () => srv.all.length;
  let seq = 0;
  const stage = (item, nbt) => srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0 ` + (nbt || ''));

  const chatCmd = async (cmd, ms) => {
    const from = mark();
    bot.chat(cmd);
    await sleep(ms || 900);
    return rowsFrom(from);
  };
  const gateToken = async (args) => {
    const seg = await chatCmd('/etest fishgate ' + args, 900);
    const g = seg.map((l) => RE.gateToken.exec(l)).filter(Boolean).map((m) => ({
      wt: +m[1], adj: +m[2], dist: +m[3], ci0: +m[4], light: +m[5], ci2: +m[6], L: +m[7], lure: +m[8], ci3: +m[9], worm: +m[10], ci4: +m[11],
    }))[0] || null;
    const s = seg.map((l) => RE.summary.exec(l)).filter(Boolean).map((m) => ({ n: +m[1], hits: +m[2], ci: +m[3] }))[0] || null;
    return { gate: g, summary: s };
  };
  const probeType = async (n) => {
    const seg = await chatCmd(`/etest fishprobe type ${n}`, 1100);
    return seg.map((l) => RE.type.exec(l)).filter(Boolean).map((m) => ({
      n: +m[1], cod: +m[2], salmon: +m[3], pos: m[4], biome: m[5],
    }))[0] || null;
  };
  const biteAndRetract = async (timeoutMs) => {
    const from = mark();
    bot.activateItem();
    await sleep(1200);
    const t0 = Date.now();
    let bite = null;
    while (Date.now() - t0 < (timeoutMs || 120000)) {
      const seg = rowsFrom(from);
      const g = seg.map((l) => RE.gateHook.exec(l)).filter(Boolean).map((m) => ({
        wt: +m[1], adj: +m[2], dist: +m[3], blue: +m[4], ci0: +m[5], light: +m[6], ci2: +m[7],
        L: +m[8], lure: +m[9], ci3: +m[10], worm: +m[11], ci4: +m[12], roll: +m[13],
      }))[0];
      if (g) { bite = g; break; }
      await sleep(500);
    }
    const winFrom = mark();
    await sleep(400);
    const winRows = rowsFrom(winFrom).filter((l) => RE.window.test(l)).map((l) => +RE.window.exec(l)[1]);
    if (bite) bot.activateItem();
    await sleep(1300);
    const seg = rowsFrom(from);
    return {
      bite, waitedMs: Date.now() - t0, windowRows: winRows.slice(0, 6),
      catch: seg.map((l) => RE.catchRow.exec(l)).filter(Boolean).map((m) => ({
        kind: m[1], rod: +m[2], item: m[3], q: +m[4], removed: +m[5], xp: +m[6], worm: +m[7],
      }))[0] || null,
      casts: seg.filter((l) => RE.cast.test(l)).length,
    };
  };
  const buildArena = async () => {
    const p = bot.entity.position;
    bx = Math.floor(p.x); by = Math.floor(p.y); bz = Math.floor(p.z);
    ev.arena = { bx, by, bz };
    srv.send(`fill ${bx - 6} ${by - 6} ${bz - 12} ${bx + 20} ${by + 8} ${bz + 12} minecraft:air 0`);
    srv.send(`fill ${bx - 6} ${by - 1} ${bz - 12} ${bx + 20} ${by - 1} ${bz + 12} minecraft:stone 0`);
    srv.send(`fill ${bx + 1} ${by - 5} ${bz - 8} ${bx + 16} ${by - 1} ${bz + 8} minecraft:water 0`);
    srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} -90 30`);
    await sleep(2500);
  };
  const stageRod = (nbt) => { srv.send(`clear ${BOT}`); stage('etim:fishing_rod_copper', nbt); };

  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('server never reached Done(');
    ev.boot = { ready: strip(srv.all.find((l) => /Done \(/.test(l))).trim(),
      mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length };
    const idsLine = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*?ids=/.test(l)) || '';
    const idm = RE.ids.exec(idsLine);
    ev.ids = { line: idsLine.slice(0, 220), ids: idm ? idm[1].trim().split(/\s+/).map(Number) : null };
    log('boot', ev.boot.ready + ' mixinFail=' + ev.boot.mixinFail + ' ids=' + JSON.stringify(ev.ids.ids));

    await sleep(1500);
    let botErr = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try { bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT }); botErr = null; break; }
      catch (e) { botErr = e; log('bot-retry', attempt + ': ' + e.message); await sleep(2000); }
    }
    if (!bot) throw botErr;
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
    srv.send(`op ${BOT}`);
    await sleep(900);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doFireTick false',
      'mobGriefing false', 'keepInventory true', 'randomTickSpeed 0', 'naturalRegeneration false', 'doWeatherCycle false',
      'doTileDrops true']) srv.send('gamerule ' + g);
    srv.send('difficulty 2');
    srv.send('time set 23500');
    srv.send('weather clear 1000000');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`etest food 20 20 ${BOT}`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(900);

    /* ================= main ================= */
    if (MODE === 'main') {
      ev.carrier = {};
      const items = ['etim:fishing_rod_flint', 'etim:fishing_rod_obsidian', 'etim:fishing_rod_copper',
        'etim:fishing_rod_silver', 'etim:fishing_rod_gold', 'etim:fishing_rod_iron', 'etim:fishing_rod_mithril',
        'etim:fishing_rod_adamantium', 'etim:fishing_rod_ancient_metal', 'minecraft:bow',
        'etim:sword_copper', 'etim:pickaxe_copper'];
      for (const item of items) {
        srv.send(`clear ${BOT}`);
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
        await sleep(320);
        const from = mark();
        srv.send(`etest enchantprobe mainhand pool ${BOT}`);
        await sleep(850);
        const seg = rowsFrom(from);
        const reg = {};
        const slots = [];
        for (const l of seg) {
          const m = RE.reg.exec(l); if (m) reg[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', window: m[6].trim() };
          const s = RE.slot.exec(l); if (s) slots.push({ slot: +s[1], budget: +s[2], size: +s[3] });
        }
        const ff = reg['etim:fishing_fortune'], ar = reg['etim:arrow_recovery'];
        ev.carrier[item] = {
          fishing_fortune: ff || null, arrow_recovery: ar || null, slots,
          regCount: Object.keys(reg).length, line: `${from + 1}`,
        };
        if (item === 'etim:fishing_rod_copper') { ev.regAll = reg; ev.regAnchor = from + 1; ev.slotsCopper = slots; }
        log('carrier', `${item} ff=${ff ? ff.table : '-'} ar=${ar ? ar.table : '-'} reg=${Object.keys(reg).length} slots=${JSON.stringify(slots)}`);
      }
      ev.ffWindow = ev.regAll['etim:fishing_fortune'] ? ev.regAll['etim:fishing_fortune'].window : null;
      ev.arWindow = ev.regAll['etim:arrow_recovery'] ? ev.regAll['etim:arrow_recovery'].window : null;
      ev.ffId = ev.regAll['etim:fishing_fortune'] ? ev.regAll['etim:fishing_fortune'].id : null;
      ev.arId = ev.regAll['etim:arrow_recovery'] ? ev.regAll['etim:arrow_recovery'].id : null;
      ev.regPrev = Object.fromEntries(Object.keys(EXPECTED_REG_WINDOW).map((k) => [k,
        ev.regAll[k] ? { id: ev.regAll[k].id, window: ev.regAll[k].window, same: ev.regAll[k].window === EXPECTED_REG_WINDOW[k] } : null]));
      ev.regPrevAllSame = Object.keys(EXPECTED_REG_WINDOW).every((k) => ev.regAll[k] && ev.regAll[k].window === EXPECTED_REG_WINDOW[k]);
      log('windows', `ff=${ev.ffWindow} ar=${ev.arWindow} prevSame=${ev.regPrevAllSame} regCount=${Object.keys(ev.regAll).length}`);

      /* 上限位：6 级请求（maxLevel=5） */
      stageRod();
      await sleep(300);
      {
        const from = mark();
        srv.send(`etest enchant mainhand 5 fishingFortune ${BOT}`);
        await sleep(400);
        srv.send(`etest enchant mainhand 6 fishingFortune ${BOT}`);
        await sleep(500);
        ev.overLevel = rowsFrom(from).filter((l) => /too big|at most|Enchant/i.test(l)).slice(0, 4);
      }
      log('overLevel', JSON.stringify(ev.overLevel).slice(0, 200));

      /* W-FF3 九段精确值 */
      ev.fishgate = {};
      const cases = {
        wt6000: '6000 0 0 0 0 1', wt11500: '11500 0 0 0 0 1', wt23500: '23500 0 0 0 0 1',
        L1: '23500 1 0 0 0 1', L2: '23500 2 0 0 0 1', L3: '23500 3 0 0 0 1', L4: '23500 4 0 0 0 1',
        L5: '23500 5 0 0 0 1', L5worm: '23500 5 0 1 0 1', L5light: '23500 5 0 0 1 1',
        L5lure5: '23500 5 5 0 0 1', L5lure5worm: '23500 5 5 1 0 1',
      };
      for (const [k, a] of Object.entries(cases)) { ev.fishgate[k] = await gateToken(a); log('fggate', k + ' ' + JSON.stringify(ev.fishgate[k].gate)); }

      /* W-FF4 咬率量级 */
      ev.magnitude = {};
      for (const [k, a] of Object.entries({
        peak6000: '6000 0 0 0 0 12000', noon11500: '11500 0 0 0 0 12000', L5peak: '23500 5 0 0 0 30000',
      })) {
        ev.magnitude[k] = await gateToken(a);
        log('magnitude', k + ' ' + JSON.stringify(ev.magnitude[k]));
      }
      /* 通道计数 */
      const plain = srv.all.map(strip);
      ev.rowCounts = {
        fish: plain.filter((l) => /\[FishLog\]/.test(l)).length,
        arrow: plain.filter((l) => /\[ArrowLog\]/.test(l)).length,
        melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
        mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
        farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
        butch: plain.filter((l) => /\[ButchLog\]/.test(l)).length,
        mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length,
      };
      log('counts', JSON.stringify(ev.rowCounts));
    }

    /* ================= fish ================= */
    if (MODE === 'fish') {
      srv.send(`time set 23500`);
      await buildArena();
      /* 1) 基线杆：10 次真实抛收 */
      stageRod();
      await sleep(500);
      ev.catches = [];
      for (let i = 0; i < 10; i++) {
        const r = await biteAndRetract(150000);
        ev.catches.push(r);
        log('catch', `${i}: bites=${r.bite ? 1 : 0} wait=${r.waitedMs} win=${JSON.stringify(r.windowRows)} catch=${JSON.stringify(r.catch)}`);
        if (!r.bite) break;
        await sleep(400);
      }
      /* 2) luck_of_the_sea 3 */
      {
        const luckId = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8')).regAll['minecraft:luck_of_the_sea'].id;
        stageRod(`{ench:[{id:${luckId},lvl:3}]}`);
        await sleep(500);
        const r = await biteAndRetract(150000);
        ev.luckArm = { catch: r.catch, bite: r.bite };
        log('luckArm', JSON.stringify(r.catch));
      }
      /* 3) lure 5（vanillaLureActive=true） */
      {
        const lureId = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8')).regAll['minecraft:lure'].id;
        stageRod(`{ench:[{id:${lureId},lvl:5}]}`);
        await sleep(500);
        const r = await biteAndRetract(150000);
        ev.lureArm = { catch: r.catch, bite: r.bite };
        log('lureArm', JSON.stringify(r.bite));
      }
      /* 4) 蚯蚓：hotbar 放 10 条 → 3 次收杆 → 用后余量 */
      {
        stageRod();
        srv.send(`replaceitem entity ${BOT} slot.hotbar.1 etim:worm_raw 10`);
        await sleep(400);
        const r = await biteAndRetract(150000);
        ev.wormArm = { catch: r.catch };
        srv.send(`clear ${BOT} etim:worm_raw 0 0`);
        await sleep(400);
        ev.wormArm.clearLine = rowsFrom(mark() - 4).join(' | ').slice(0, 120);
        log('wormArm', JSON.stringify(ev.wormArm));
      }
      /* 5) 三洋站位：找 ocean */
      ev.ocean = { candidates: [] };
      const cands = [[2000, 0], [0, 2000], [-2000, 0], [0, -2000], [2000, 2000], [-2000, 2000],
        [2000, -2000], [-2000, -2000], [4000, 0], [0, 4000], [-4000, 0], [0, -4000]];
      let cleanPoint = null;
      for (const [x, z] of cands) {
        srv.send(`tp ${BOT} ${x + 0.5} 200 ${z + 0.5}`);
        await sleep(900);
        const t = await probeType(1);
        ev.ocean.candidates.push({ x, z, biome: t ? t.biome : null });
        log('ocean-scan', `${x},${z} biome=${t ? t.biome : 'null'}`);
        if (t && /ocean/i.test(t.biome)) {
          srv.send(`tp ${BOT} ${x + 0.5} 63 ${z + 0.5}`);
          await sleep(900);
          const w = await probeType(1000);
          if (w) {
            log('ocean-water', `${x},${z} ${w.biome} salmon=${w.salmon}/${w.n}`);
            if (!cleanPoint) {
              ev.ocean.waterProbe = w;
              cleanPoint = { x, z, w };
              if (w.salmon >= 150 && w.salmon <= 250) break;
            }
          }
        }
      }
      if (cleanPoint) {
        /* 净洋臂（已有）＋ 脏洋臂（放一块沙） */
        srv.send(`setblock ${cleanPoint.x + 1} 60 ${cleanPoint.z} minecraft:sand 0`);
        await sleep(600);
        ev.ocean.dirty = await probeType(1000);
        srv.send(`setblock ${cleanPoint.x + 1} 60 ${cleanPoint.z} minecraft:air 0`);
        log('ocean-dirty', JSON.stringify(ev.ocean.dirty));
      }
      /* 非洋臂：回陆地（出生点） */
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
      await sleep(900);
      ev.ocean.land = await probeType(1000);
      log('ocean-land', JSON.stringify(ev.ocean.land));
      /* 收尸：回正常位置 */
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5} -90 30`);
      await sleep(600);
    }

    /* ================= worm ================= */
    if (MODE === 'worm') {
      ev.wormArms = [];
      /* 陆地台：取本 boot 的出生点（f5wb 已删，玩家数据重置 → 世界出生点） */
      const p0w = bot.entity.position;
      bx = Math.floor(p0w.x); by = Math.floor(p0w.y); bz = Math.floor(p0w.z);
      ev.arena = { bx, by, bz };
      srv.send(`fill ${bx - 12} ${by - 3} ${bz - 12} ${bx + 12} ${by + 8} ${bz + 12} minecraft:air 0`);
      srv.send(`fill ${bx - 12} ${by - 1} ${bz - 12} ${bx + 12} ${by - 1} ${bz + 12} minecraft:stone 0`);
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
      await sleep(1600);
      const fortuneId = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8')).regAll['minecraft:fortune'].id;
      const spots = [];
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) spots.push({ x: bx + dx, y: by - 1, z: bz + dz });
      const runWormArm = async (id, rain, fortune, n) => {
        srv.send(`weather ${rain ? 'rain' : 'clear'} 1000000`);
        srv.send(`clear ${BOT}`);
        stage('etim:shovel_copper', fortune > 0 ? `{ench:[{id:${fortuneId},lvl:${fortune}}]}` : '');
        srv.send(`etest food 20 20 ${BOT}`);
        await sleep(1200);
        const from = mark();
        let rounds = 0;
        let rows = 0, hits = 0;
        const t0 = Date.now();
        while (true) {
          const seg = rowsFrom(from).filter((l) => RE.worm.test(l));
          rows = seg.length; hits = seg.filter((l) => /hit=1/.test(l)).length;
          if (rows >= n) break;
          if (Date.now() - t0 > 900000) break;
          srv.send(`fill ${bx - 2} ${by - 1} ${bz - 2} ${bx + 2} ${by - 1} ${bz + 2} minecraft:grass 0`);
          await sleep(200);
          for (const s of spots) {
            const b = bot.blockAt(new Vec3(s.x, s.y, s.z));
            if (b && b.name === 'grass') {
              try { await bot.dig(b, true); } catch (e) { /* skip */ }
            }
          }
          rounds++;
          if (rounds % 6 === 0) {
            srv.send(`etest food 20 20 ${BOT}`);
            log('worm-progress', `${id} rows=${rows}/${n} hits=${hits} rounds=${rounds} ${Math.round((Date.now() - t0) / 1000)}s`);
          }
        }
        const seg = rowsFrom(from).filter((l) => RE.worm.test(l));
        const parsed = seg.map((l) => RE.worm.exec(l)).filter(Boolean).map((m) => ({ denom: +m[1], f: +m[2], rain: +m[3], hit: +m[4] }));
        const arm = {
          id, rain, fortune, n: parsed.length, hits: parsed.filter((p) => p.hit === 1).length,
          denom: [...new Set(parsed.map((p) => p.denom))], f: [...new Set(parsed.map((p) => p.f))],
          rainSet: [...new Set(parsed.map((p) => p.rain))], rate: +(parsed.filter((p) => p.hit === 1).length / Math.max(parsed.length, 1)).toFixed(4),
          rounds, elapsedSec: Math.round((Date.now() - t0) / 1000), line: `${from + 1}-${srv.all.length}`,
        };
        ev.wormArms.push(arm);
        log('wormArm', JSON.stringify(arm));
      };
      await runWormArm('clear-f0', 0, 0, 400);
      await runWormArm('rain-f0', 1, 0, 400);
      await runWormArm('rain-f1', 1, 1, 400);
      await runWormArm('rain-f3', 1, 3, 400);
      srv.send('weather clear 1000000');
    }

    /* ================= arrow ================= */
    if (MODE === 'arrow') {
      const mainEv = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8'));
      const arid = mainEv.regAll['etim:arrow_recovery'].id;
      /* arrowprobe 四材料 */
      ev.arrowProbe = {};
      for (const [mat, lvl] of [['flint', 0], ['copper', 3], ['copper', 5], ['iron', 0], ['obsidian', 0], ['adamantium', 5]]) {
        const seg = await chatCmd(`/etest arrowprobe recovery ${mat} ${lvl} 100000`, 1100);
        ev.arrowProbe[`${mat}-${lvl}`] = seg.map((l) => RE.arrowToken.exec(l)).filter(Boolean)
          .map((m) => ({ mat: m[1], L: +m[2], divisor: +m[3], c: +m[4], n: +m[5], keep: +m[6] }))[0] || null;
        log('arrowprobe', JSON.stringify(ev.arrowProbe[`${mat}-${lvl}`]));
      }
      /* 真实弓射：铜箭 L3，N=200 */
      const p = bot.entity.position;
      bx = Math.floor(p.x); by = Math.floor(p.y); bz = Math.floor(p.z);
      ev.arena = { bx, by, bz };
      srv.send(`fill ${bx - 6} ${by - 3} ${bz - 6} ${bx + 10} ${by + 6} ${bz + 6} minecraft:air 0`);
      srv.send(`fill ${bx - 6} ${by - 1} ${bz - 6} ${bx + 10} ${by - 1} ${bz + 6} minecraft:stone 0`);
      srv.send(`tp ${BOT} ${bx + 0.5} ${by} ${bz + 0.5}`);
      await sleep(1600);
      srv.send(`clear ${BOT}`);
      srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:bow 1 0 {ench:[{id:${arid},lvl:3}]}`);
      srv.send(`replaceitem entity ${BOT} slot.hotbar.1 etim:arrow_copper 64`);
      await sleep(600);
      const N = 200;
      const shots = [];
      const from = mark();
      for (let i = 0; i < N; i++) {
        const tag = `fsh_${seq++}`;
        const tx = bx + 5.5, tz = bz + 0.5;
        srv.send(`summon minecraft:cow ${tx} ${by} ${tz} {Health:2.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["${tag}"]}`);
        await sleep(160);
        const tgt = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow' && Math.abs(e.position.x - tx) < 1.5 && Math.abs(e.position.z - tz) < 1.5);
        if (tgt) bot.lookAt(tgt.position.offset(0, 0.9, 0), true);
        await sleep(120);
        bot.activateItem();
        await sleep(1100);
        bot.deactivateItem();
        await sleep(700);
        srv.send(`kill @e[tag=${tag}]`);
        await sleep(90);
        if (i % 50 === 49) log('shot', `${i + 1}/${N}`);
      }
      await sleep(800);
      const seg = rowsFrom(from);
      ev.realShots = {
        n: N,
        recovery: seg.map((l) => RE.recovery.exec(l)).filter(Boolean).map((m) => ({
          victim: m[1], lvl: +m[2], r5: +m[3], pass5: +m[4], mat: m[5], c: +m[6], passC: +m[7], result: m[8],
        })),
        deaths: seg.map((l) => RE.recoveryDeath.exec(l)).filter(Boolean).map((m) => ({
          victim: m[1], loot: +m[2], child: +m[3], dropped: +m[4],
        })),
      };
      const rec = ev.realShots.recovery;
      ev.realShots.stats = {
        hits: rec.length, pending: rec.filter((r) => r.result === 'pending').length,
        pass5: rec.filter((r) => r.pass5 === 1).length, passC: rec.filter((r) => r.passC === 1).length,
        rate: +(rec.filter((r) => r.result === 'pending').length / Math.max(rec.length, 1)).toFixed(4),
        mats: [...new Set(rec.map((r) => r.mat))], lvls: [...new Set(rec.map((r) => r.lvl))],
        cSet: [...new Set(rec.map((r) => r.c))],
        deathRows: ev.realShots.deaths.length,
        droppedSum: ev.realShots.deaths.reduce((a, d) => a + d.dropped, 0),
        arrowDamageRows: seg.filter((l) => /\[DamageLog\] dmg .*src=arrow/.test(l)).length,
      };
      log('realShots', JSON.stringify(ev.realShots.stats));

      /* W-FF9 doMobLoot=false ＋ 幼体 */
      const oneShot = async (tag, extra) => {
        const from2 = mark();
        srv.send(`summon minecraft:cow ${bx + 5.5} ${by} ${bz + 0.5} {Health:2.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b${extra},Tags:["${tag}"]}`);
        await sleep(350);
        const tgt = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow' && Math.abs(e.position.x - (bx + 5.5)) < 1.5);
        if (tgt) bot.lookAt(tgt.position.offset(0, 0.9, 0), true);
        await sleep(150);
        bot.activateItem();
        await sleep(1100);
        bot.deactivateItem();
        await sleep(600);
        const seg2 = rowsFrom(from2);
        const it = await (async () => {
          const f3 = mark();
          srv.send(`execute @p ~ ~ ~ testfor @e[type=item,r=5] {Item:{id:"etim:arrow_copper"}}`);
          await sleep(450);
          return rowsFrom(f3).join(' | ').slice(0, 110);
        })();
        return {
          recovery: seg2.map((l) => RE.recovery.exec(l)).filter(Boolean).length,
          arrowDamage: seg2.filter((l) => /\[DamageLog\] dmg .*src=arrow/.test(l)).length,
          deaths: seg2.map((l) => RE.recoveryDeath.exec(l)).filter(Boolean).map((m) => ({ loot: +m[2], child: +m[3], dropped: +m[4] })),
          item: it,
        };
      };
      srv.send('gamerule doMobLoot false');
      await sleep(400);
      ev.noLoot = await oneShot('fnl_' + seq++);
      srv.send('gamerule doMobLoot true');
      await sleep(400);
      ev.child = await oneShot('fch_' + seq++, ',Age:-24000');
      log('negatives', JSON.stringify({ noLoot: ev.noLoot, child: ev.child }));
    }

    /* ================= cfg ================= */
    if (MODE === 'cfg') {
      /* 收杆 stat 面：先建 stat 目标读零点，再抛一次读增量 */
      srv.send('scoreboard objectives remove fstat');
      await sleep(200);
      srv.send('scoreboard objectives add fstat stat.fishCaught');
      await sleep(400);
      const statBefore = await chatCmd('/scoreboard players list ' + BOT, 700);
      ev.statBefore = statBefore.filter((l) => /fstat|tracked/.test(l)).slice(0, 2).join(' | ').slice(0, 160);
      /* vanillaLureActive=false：lure 5 杆 → gate lure=0；LargeFishChance=0 → 全 cod */
      const mainEv = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8'));
      const lureId = mainEv.regAll['minecraft:lure'].id;
      await buildArena();
      stageRod(`{ench:[{id:${lureId},lvl:5}]}`);
      await sleep(500);
      const r = await biteAndRetract(180000);
      ev.lureOff = { bite: r.bite, catch: r.catch };
      log('lureOff', JSON.stringify(r.bite));
      const statAfter = await chatCmd('/scoreboard players list ' + BOT, 700);
      ev.statAfter = statAfter.filter((l) => /fstat|tracked/.test(l)).slice(0, 2).join(' | ').slice(0, 160);
      log('stat', ev.statBefore + ' => ' + ev.statAfter);
      /* 海洋全 cod */
      const cands = [[2000, 0], [0, 2000], [-2000, 0], [0, -2000], [2000, 2000], [-2000, 2000], [2000, -2000], [-2000, -2000]];
      let ocean = null;
      for (const [x, z] of cands) {
        srv.send(`tp ${BOT} ${x + 0.5} 200 ${z + 0.5}`);
        await sleep(900);
        const t = await probeType(1);
        if (t && /ocean/i.test(t.biome)) { ocean = { x, z, biome: t.biome }; break; }
      }
      if (ocean) {
        srv.send(`tp ${BOT} ${ocean.x + 0.5} 63 ${ocean.z + 0.5}`);
        await sleep(900);
        ev.largeFishOff = { ocean, probe: await probeType(1000) };
        log('largeFishOff', JSON.stringify(ev.largeFishOff));
      } else {
        ev.largeFishOff = { ocean: null };
      }
    }

    /* ================= cfg2 ================= */
    if (MODE === 'cfg2') {
      /* stat 面（console 通道才落日志）：fstat = stat.fishCaught 现值 */
      srv.send('scoreboard objectives remove fstat');
      await sleep(250);
      srv.send('scoreboard objectives add fstat stat.fishCaught');
      await sleep(400);
      {
        const from = mark();
        srv.send(`scoreboard players list ${BOT}`);
        await sleep(500);
        ev.statLine = rowsFrom(from).filter((l) => /fstat|tracked|Showing/i.test(l)).slice(0, 2);
        log('stat', JSON.stringify(ev.statLine));
      }
      /* biteMin=1200：wt=11500 未咬时 ci0=1200 */
      ev.biteMin = await gateToken('11500 0 0 0 0 1');
      log('biteMin', JSON.stringify(ev.biteMin));
      /* fortuneMaxLevel=1：窗口 L1 单级 + 2 级拒 */
      {
        srv.send(`clear ${BOT}`);
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand etim:fishing_rod_copper 1 0`);
        await sleep(350);
        const from = mark();
        srv.send(`etest enchantprobe mainhand pool ${BOT}`);
        await sleep(900);
        const seg = rowsFrom(from);
        const reg = {};
        for (const l of seg) { const m = RE.reg.exec(l); if (m) reg[m[1]] = { id: +m[2], table: m[4] === 'true', window: m[6].trim() }; }
        ev.ffWindowFlip = reg['etim:fishing_fortune'] || null;
        ev.regCountFlip = Object.keys(reg).length;
        const from2 = mark();
        srv.send(`etest enchant mainhand 2 fishingFortune ${BOT}`);
        await sleep(500);
        ev.overLevelFlip = rowsFrom(from2).filter((l) => /too big|at most/i.test(l)).slice(0, 2);
        log('windowFlip', JSON.stringify(ev.ffWindowFlip) + ' over=' + JSON.stringify(ev.overLevelFlip));
      }
      /* fishingSystem=false：真实抛竿 → 零 [FishLog] 行（cast/catch 皆无） */
      await buildArena();
      stageRod();
      await sleep(500);
      {
        const from = mark();
        bot.activateItem();
        await sleep(4000);
        bot.activateItem();
        await sleep(1200);
        const seg = rowsFrom(from);
        ev.fishingOff = {
          fishRows: seg.filter((l) => /\[FishLog\]/.test(l)).length,
          casts: seg.filter((l) => RE.cast.test(l)).length,
          catches: seg.filter((l) => RE.catchRow.test(l)).length,
        };
        log('fishingOff', JSON.stringify(ev.fishingOff));
      }
      /* arrowRecoverySystem=false：真实一箭（补射至真命中）→ 零 recovery 行 */
      {
        const mainEv = JSON.parse(fs.readFileSync(path.join(OUT, 'f5-wb-main-evidence.json'), 'utf8'));
        const arid = mainEv.regAll['etim:arrow_recovery'].id;
        srv.send(`clear ${BOT}`);
        srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand minecraft:bow 1 0 {ench:[{id:${arid},lvl:3}]}`);
        srv.send(`replaceitem entity ${BOT} slot.hotbar.1 etim:arrow_copper 64`);
        await sleep(500);
        const shots = [];
        for (let i = 0; i < 6; i++) {
          const from = mark();
          const tag = 'foff_' + seq++;
          srv.send(`summon minecraft:cow ${bx + 3.5} ${by} ${bz + 0.5} {Health:2.0f,NoAI:1b,Silent:1b,PersistenceRequired:1b,Tags:["${tag}"]}`);
          await sleep(400);
          const tgt = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow' && Math.abs(e.position.x - (bx + 3.5)) < 1.5);
          if (tgt) await bot.lookAt(tgt.position.offset(0, 0.9, 0), true);
          await sleep(250);
          bot.activateItem();
          await sleep(1250);
          bot.deactivateItem();
          await sleep(900);
          const seg = rowsFrom(from);
          const dmg = seg.filter((l) => /\[DamageLog\] dmg .*src=arrow/.test(l)).length;
          const rec = seg.filter((l) => RE.recovery.test(l)).length;
          const death = seg.filter((l) => RE.recoveryDeath.test(l)).length;
          shots.push({ dmg, rec, death });
          srv.send(`kill @e[tag=${tag}]`);
          await sleep(150);
          if (dmg > 0) break;
        }
        ev.arrowOff = { shots, hits: shots.filter((s) => s.dmg > 0).length };
        log('arrowOff', JSON.stringify(ev.arrowOff));
      }
    }

    /* 收口面统计 */
    const plain = srv.all.map(strip);
    ev.rowCounts = ev.rowCounts || {
      fish: plain.filter((l) => /\[FishLog\]/.test(l)).length,
      arrow: plain.filter((l) => /\[ArrowLog\]/.test(l)).length,
      melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
      mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
      farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
      butch: plain.filter((l) => /\[ButchLog\]/.test(l)).length,
      mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length,
    };
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try {
      if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); }
    } catch (e) { ev.stopError = String((e && e.message) || e); }
    setCfg(CFG, 'fishingDebugLog', 'false');
    setCfg(CFG, 'arrowDebugLog', 'false');
    if (MODE === 'cfg') {
      setCfg(CFG, 'vanillaLureActive', 'true');
      setCfg(CFG, 'fishingLargeFishChance', '0.2');
    }
    if (MODE === 'cfg2') {
      setCfg(CFG, 'fishingBiteChanceMin', '600');
      setCfg(CFG, 'fishingFortuneMaxLevel', '5');
      setCfg(CFG, 'fishingSystem', 'true');
      setCfg(CFG, 'arrowRecoverySystem', 'true');
    }
    const keysRestored = cfgKeys(CFG);
    ev.cfgRestored = {
      changed: Object.keys(keysBefore).filter((k) => keysRestored[k] !== keysBefore[k]),
      newKeys: Object.keys(keysRestored).filter((k) => !(k in keysBefore)),
      bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
    };
    ev.obfCfgAfter = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)),
      untouched: sha256(fs.readFileSync(OBFCFG)) === OBFCFG_SHA };
    fs.writeFileSync(PROPS, propsBefore);
    ev.propsClose = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
    if (MODE === 'cfg2') {
      const d = path.join(ROOT, 'run', WORLD);
      if (fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
      ev.worldRemoved = !fs.existsSync(d);
    } else {
      ev.worldKept = fs.existsSync(path.join(ROOT, 'run', WORLD));
    }
    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts() };
    ev.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1) + '\n', 'utf8');
    log('evidence', path.join(OUT, TAG + '-evidence.json'));
    log('DONE');
  }
  process.exit(0);
}
main().catch((e) => { log('FATAL', (e && e.stack) || e); process.exit(1); });
