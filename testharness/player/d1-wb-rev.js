#!/usr/bin/env node
/**
 * d1-wb-rev.js — D-1 池批 A-1 修复重验驱动（3 模式）
 *   armor : R1 护甲四臂载体矩阵（7 件 ×130 抽）＋ R5 非甲四件探针/短臂回归
 *   bulk  : R2 DP10 protection 族（胸 protection×fire=0；靴 protection×feather>0）
 *           ＋ R3 DP2 diamond 胸 20 万池抽分布
 *   mob   : R4 DP8 怪装门 0.1×tension（spawn egg 通道，time set 1536000 ⇒ tension=0.875）
 * 钉值：HEAD 7e50a6c｜rel 936,718 CF679785…4A9｜dev 918,140 E4988B61…6E87｜src 854,068 D64064FB…2ABD
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
const MODE = (process.argv[2] || 'armor').toLowerCase();
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
const TAG = 'd1-wb-rev-' + MODE;
const WORLD = 'd1wb';
const BOT = 'ETIM_R7';
const PORT = 25565;
const GAP = parseInt(process.env.GAP || '6', 10);
const MAXSEC = parseInt(process.env.MAXSEC || '1500', 10);

const PIN = {
  head: '7e50a6c',
  rel: { bytes: 936718, sha: 'CF679785EB16C38BC9C9A887AF440C7DC55295A18C3C8A861D985E787EDA94A9' },
  dev: { bytes: 918140, sha: 'E4988B617B9038F9321CE62028366C424A59B2A2E69ECB3985DFD834C1606E87' },
  src: { bytes: 854068, sha: 'D64064FBEB545DA2EF964F35A723E31E3FC4A0D572ED0798647CF5D7FEC2ABDD' },
};
const MK_PIN = { classes: 69, entries: 159, dual: 318, mixins: 64, client: 10 };

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

const RE = {
  ids: /\[EtimInit\] enchant.*?ids=([\d\s]+)/,
  reg: /\[EnchantLog\] pool reg=(\S+) id=(\d+) weight=(\d+) table=(true|false) treasure=(true|false) window=(.*?) rw=(\d+) rwindow=(.*?) \[server\]/,
  slot: /\[EnchantLog\] pool slot=(\d+) budget=(\d+) size=(\d+) item=(\S+)/,
  poolE: /\[EnchantLog\] pool-e slot=(\d+) budget=(\d+) list=empty/,
  start: /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(\d+) start/,
  none: /\[EnchLog\] pool item=(\S+) budget=(\d+) out=none \(ench (\d+)\)/,
  pick: /\[EnchLog\] pick item=(\S+) ench=(\d+) L=(\d+) cost=(\d+) adj=(-?\d+)/,
  end: /\[EnchLog\] pool item=(\S+) budget=(\d+) adj=(-?\d+) cand=end picks=(\d+)/,
  conflict: /\[EnchLog\] conflict dropped=(\d+)/,
  apply: /\[EnchLog\] apply slot=(\d+) picks=(\d+)/,
  nonTable: /\[EnchLog\] nonTable src=(\w+)(?: tension=([\d.]+))?/,
};

function parseBuilds(lines, item) {
  const builds = [];
  let cur = null;
  for (const l of lines) {
    let m = RE.start.exec(l);
    if (m && (!item || m[1] === item)) { cur = { item: m[1], budget: +m[2], adj0: +m[3], picks: [], conflicts: 0 }; builds.push(cur); continue; }
    m = RE.pick.exec(l);
    if (m && cur) { cur.picks.push({ item: m[1], ench: +m[2], L: +m[3], cost: +m[4], adj: +m[5] }); continue; }
    m = RE.conflict.exec(l);
    if (m && cur) { cur.conflicts += +m[1]; continue; }
    m = RE.end.exec(l);
    if (m && cur) { cur.adjEnd = +m[3]; cur.picksN = +m[4]; cur = null; }
  }
  return builds;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: MODE, startedAt: new Date().toISOString() };
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  ev.head = head; ev.headOk = head.startsWith(PIN.head);
  ev.pins = { devJar: pinOf(DEVJAR, PIN.dev, 'dev'), relJar: pinOf(RELJAR, PIN.rel, 'rel'),
    srcJar: pinOf(SRCJAR, PIN.src, 'src'), mk: mkCounts() };
  ev.crashBefore = crashCount(); ev.portBefore = netstatListen(PORT);
  ev.obfCfgBefore = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)) };
  const keysBefore = cfgKeys(CFG);
  ev.cfgBefore = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)), keys: Object.keys(keysBefore).length };
  log('pin', 'HEAD=' + head.slice(0, 7) + ' ' + (ev.headOk ? 'OK' : 'MISMATCH')
    + ' dev=' + ev.pins.devJar.sha.slice(0, 12) + ' rel=' + ev.pins.relJar.sha.slice(0, 12)
    + ' src=' + ev.pins.srcJar.sha.slice(0, 12) + ' mk=' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH')
    + ' cfg=' + ev.cfgBefore.keys + ' keys');
  if (!ev.headOk) throw new Error('HEAD mismatch');
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch');

  setCfg(CFG, 'enchantDebugLog', 'true');
  ev.cfgFlipped = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)) };
  const propsBefore = fs.readFileSync(PROPS);
  fs.writeFileSync(PROPS, setProp(propsBefore.toString('utf8'), 'level-name', WORLD), 'utf8');

  const srv = await startServer({ root: ROOT, tag: TAG });
  let bot = null;
  let tx = 0, ty = 0, tz = 0;
  let table = null;
  const rowsFrom = (from) => srv.all.slice(from).map(strip);
  const mark = () => srv.all.length;

  const probePool = async (item) => {
    srv.send(`clear ${BOT}`);
    srv.send(`replaceitem entity ${BOT} slot.weapon.mainhand ${item} 1 0`);
    await sleep(300);
    const from = mark();
    srv.send(`etest enchantprobe mainhand pool ${BOT}`);
    await sleep(800);
    const seg = rowsFrom(from);
    const reg = {}; const slots = []; let poolE = 0; const raw = [];
    for (const l of seg) {
      const m = RE.reg.exec(l);
      if (m) { reg[m[1]] = { id: +m[2], weight: +m[3], table: m[4] === 'true', treasure: m[5] === 'true', window: m[6].trim(), rw: +m[7], rwindow: m[8].trim() }; raw.push(l); }
      const s = RE.slot.exec(l);
      if (s) slots.push({ slot: +s[1], budget: +s[2], size: +s[3] });
      if (RE.poolE.test(l)) poolE++;
    }
    return { reg, slots, poolE, raw, line: from + 1 };
  };

  const rig = async (books) => {
    if (table) { try { bot.closeWindow(table); } catch (e) { /* noop */ } table = null; await sleep(250); }
    const cells = [[0, -2], [-2, -1], [-1, -2], [1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [0, 2], [-1, 2], [-2, 1], [-2, 0]];
    srv.send(`fill ${tx - 4} ${ty - 2} ${tz - 4} ${tx + 4} ${ty + 5} ${tz + 4} minecraft:air 0`);
    srv.send(`fill ${tx - 4} ${ty - 1} ${tz - 4} ${tx + 4} ${ty - 1} ${tz + 4} minecraft:stone 0`);
    srv.send(`setblock ${tx} ${ty} ${tz} minecraft:enchanting_table 0`);
    const n0 = Math.min(books, 12); const n1 = Math.max(0, books - 12);
    for (let i = 0; i < n0; i++) srv.send(`setblock ${tx + cells[i][0]} ${ty} ${tz + cells[i][1]} minecraft:bookshelf 0`);
    for (let i = 0; i < n1; i++) srv.send(`setblock ${tx + cells[i][0]} ${ty + 1} ${tz + cells[i][1]} minecraft:bookshelf 0`);
    srv.send(`tp ${BOT} ${tx + 0.5} ${ty} ${tz + 1.5} 180 0`);
    await sleep(900);
    return true;
  };
  const openTable = async () => {
    for (let i = 0; i < 3; i++) {
      try { table = await bot.openEnchantmentTable(bot.blockAt(new Vec3(tx, ty, tz))); return true; }
      catch (e) { log('open-retry', i + ': ' + e.message); await sleep(600); }
    }
    return false;
  };
  const putItem = async (item, meta) => {
    srv.send(`replaceitem entity ${BOT} slot.hotbar.0 ${item} 1 ${meta || 0}`);
    await sleep(200);
    try { await bot.moveSlotItem(29, 0); } catch (e) {
      log('putItem-retry', e.message); await openTable();
      try { await bot.moveSlotItem(29, 0); } catch (e2) { log('putItem-fail', e2.message); }
    }
    await sleep(260);
  };
  const enchantFast = async (n, item, label) => {
    const from = mark();
    const t0 = Date.now();
    let ptr = from; let counted = 0;
    const countBuilds = () => {
      for (; ptr < srv.all.length; ptr++) if (RE.start.test(strip(srv.all[ptr]))) counted++;
      return counted;
    };
    let sent = 0;
    while (sent < n) {
      const K = Math.min(parseInt(process.env.K || '12', 10), n - sent);
      for (let i = 0; i < K; i++) { bot._client.write('enchant_item', { windowId: table.id, enchantment: 2 }); sent++; }
      /* 自限速闭环：等服务器把这 K 次抽完再发下一批（防 packet 堆积 → 单 tick 60s watchdog） */
      const target = counted + K;
      const deadline = Date.now() + 600;
      while (countBuilds() < target && Date.now() < deadline) await sleep(3);
      /* 积压保护：sent 比 builds 多 60 以上就先让服务器追上，避免单 tick 过载 */
      if (sent - counted > 60) await sleep(150);
      /* 每 240 抽换新件：1.12 addEnchantment 会累积 NBT，长时间不换会让包体爆掉 */
      if (sent % 240 === 0) await putItem(item);
      if (sent % 5000 === 0) {
        const sec = (Date.now() - t0) / 1000;
        log('burst', `${label} sent=${sent} builds=${countBuilds()} ${Math.round(sec)}s rate=${(countBuilds() / sec).toFixed(0)}/s`);
        if (sec > MAXSEC) { log('burst-cap', `${label} cap at ${sent}`); break; }
      }
    }
    await sleep(1500);
    const builds = countBuilds();
    const secs = Math.round((Date.now() - t0) / 1000);
    log('burst-done', `${label} sent=${sent} builds=${builds} ${secs}s`);
    return { sent, builds, secs, from: from + 1, to: srv.all.length };
  };

  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('server never reached Done(');
    ev.boot = { ready: strip(srv.all.find((l) => /Done \(/.test(l))).trim(),
      mixinFail: srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length };
    const idsLine = srv.all.map(strip).find((l) => /\[EtimInit\] enchant.*?ids=/.test(l)) || '';
    const idm = RE.ids.exec(idsLine);
    ev.ids = { line: idsLine.slice(0, 240), ids: idm ? idm[1].trim().split(/\s+/).map(Number) : null };
    ev.idsCount = ev.ids.ids ? ev.ids.ids.length : 0;
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
    await sleep(800);
    for (const g of ['doMobSpawning false', 'doMobLoot true', 'doDaylightCycle false', 'doFireTick false',
      'mobGriefing false', 'keepInventory true', 'randomTickSpeed 3', 'naturalRegeneration false', 'doWeatherCycle false']) {
      srv.send('gamerule ' + g);
    }
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear 1000000');
    srv.send(`gamemode 1 ${BOT}`);
    await sleep(800);

    const p0 = bot.entity.position;
    tx = Math.floor(p0.x) + 6; ty = Math.floor(p0.y); tz = Math.floor(p0.z);
    ev.rigAt = { tx, ty, tz };

    /* ================= armor ================= */
    if (MODE === 'armor') {
      const items = ['etim:chestplate_mithril', 'minecraft:leather_chestplate', 'etim:helmet_mithril',
        'minecraft:leather_helmet', 'etim:boots_mithril', 'etim:leggings_mithril', 'minecraft:leather_leggings'];
      ev.probe = {};
      for (const item of items) {
        ev.probe[item] = await probePool(item);
        log('probe', `${item} slots=${JSON.stringify(ev.probe[item].slots)} poolE=${ev.probe[item].poolE}`);
      }
      /* R5：非甲探针（与首轮同件同序） */
      const regItems = ['etim:sword_copper', 'etim:pickaxe_copper', 'etim:war_hammer_copper', 'etim:fishing_rod_copper'];
      ev.probeBase = {};
      for (const item of regItems) {
        ev.probeBase[item] = await probePool(item);
        log('probeBase', `${item} slots=${JSON.stringify(ev.probeBase[item].slots)}`);
      }
      ev.regAll = ev.probeBase['etim:sword_copper'].reg;

      /* R1 载体臂 */
      if (!(await rig(24))) throw new Error('rig failed');
      if (!await openTable()) throw new Error('table open failed');
      ev.arms = [];
      const arm = async (item, n) => {
        srv.send(`clear ${BOT}`);
        await putItem(item);
        const r = await enchantFast(n, item, item);
        const seg = rowsFrom(r.from - 1);
        const builds = parseBuilds(seg, item);
        const picks = builds.flatMap((b) => b.picks);
        const hist = {};
        for (const p of picks) hist[p.ench] = (hist[p.ench] || 0) + 1;
        const out = { item, builds: builds.length, picks: picks.length, hist,
          maxPicks: builds.reduce((a, b) => Math.max(a, b.picks.length), 0),
          adjBad: builds.filter((b) => { for (let i = 0; i < b.picks.length; i++) { const prev = i === 0 ? b.adj0 : b.picks[i - 1].adj; if (b.picks[i].adj !== prev - b.picks[i].cost - 5) return true; } return false; }).length,
          line: `${r.from}-${r.to}` };
        ev.arms.push(out);
        log('arm', `${item} builds=${out.builds} picks=${out.picks} ids=${JSON.stringify(hist)}`);
        return out;
      };
      await arm('etim:chestplate_mithril', 130);
      await arm('minecraft:leather_chestplate', 130);
      await arm('etim:helmet_mithril', 130);
      await arm('minecraft:leather_helmet', 130);
      await arm('etim:boots_mithril', 130);
      await arm('etim:leggings_mithril', 130);
      await arm('minecraft:leather_leggings', 130);

      /* R5 非甲短臂：定性载体面不回归 */
      ev.baseArms = [];
      for (const item of ['etim:sword_copper', 'etim:pickaxe_copper', 'etim:war_hammer_copper', 'etim:fishing_rod_copper']) {
        srv.send(`clear ${BOT}`);
        await putItem(item);
        const r = await enchantFast(60, item, item);
        const seg = rowsFrom(r.from - 1);
        const builds = parseBuilds(seg, item);
        const picks = builds.flatMap((b) => b.picks);
        const hist = {};
        for (const p of picks) hist[p.ench] = (hist[p.ench] || 0) + 1;
        ev.baseArms.push({ item, builds: builds.length, picks: picks.length, hist, line: `${r.from}-${r.to}` });
        log('baseArm', `${item} builds=${builds.length} picks=${picks.length} ids=${JSON.stringify(hist)}`);
      }
      const plain = srv.all.map(strip);
      ev.noSuchMethod = plain.filter((l) => /NoSuchMethodError/.test(l)).length;
      ev.execErr = plain.filter((l) => /Error executing task/.test(l)).length;
      ev.rowCounts = {
        ench: plain.filter((l) => /\[EnchLog\]/.test(l)).length,
        melee: plain.filter((l) => /\[MeleeLog\]/.test(l)).length,
        mining: plain.filter((l) => /\[MiningLog\]/.test(l)).length,
        farm: plain.filter((l) => /\[FarmLog\]/.test(l)).length,
        butch: plain.filter((l) => /\[ButchLog\]/.test(l)).length,
        arrow: plain.filter((l) => /\[ArrowLog\]/.test(l)).length,
        mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length,
      };
      log('rows', JSON.stringify(ev.rowCounts), 'nse=' + ev.noSuchMethod, 'err=' + ev.execErr);
    }

    /* ================= bulk ================= */
    if (MODE === 'bulk') {
      const N = parseInt(process.env.N || '200000', 10);
      ev.bulk = [];
      const runArm = async (item, n) => {
        if (!(await rig(24))) throw new Error('rig failed');
        if (!await openTable()) throw new Error('table open failed');
        srv.send(`clear ${BOT}`);
        await putItem(item);
        const r = await enchantFast(n, item, item);
        const seg = rowsFrom(r.from - 1);
        const builds = parseBuilds(seg, item);
        const picks = builds.flatMap((b) => b.picks);
        const hist = {};
        for (const p of picks) hist[p.ench] = (hist[p.ench] || 0) + 1;
        const armOut = { item, sent: r.sent, buildings: builds.length, picks: picks.length, hist,
          maxPicks: builds.reduce((a, b) => Math.max(a, b.picks.length), 0),
          picksHist: builds.reduce((a, b) => { a[b.picks.length] = (a[b.picks.length] || 0) + 1; return a; }, {}),
          adjBad: builds.filter((b) => { for (let i = 0; i < b.picks.length; i++) { const prev = i === 0 ? b.adj0 : b.picks[i - 1].adj; if (b.picks[i].adj !== prev - b.picks[i].cost - 5) return true; } return false; }).length,
          budgets: [...new Set(builds.map((b) => b.budget))].sort((a, b) => a - b),
          line: `${r.from}-${r.to}` };
        ev.bulk.push(armOut);
        log('bulkArm', JSON.stringify({ item, builds: armOut.buildings, picks: armOut.picks, hist, maxPicks: armOut.maxPicks }));
        return armOut;
      };
      if (N > 0) await runArm('minecraft:diamond_chestplate', N);
      await runArm('etim:boots_mithril', parseInt(process.env.BOOTN || '20000', 10));
      const plain = srv.all.map(strip);
      ev.noSuchMethod = plain.filter((l) => /NoSuchMethodError/.test(l)).length;
      ev.execErr = plain.filter((l) => /Error executing task/.test(l)).length;
      ev.rowCounts = { ench: plain.filter((l) => /\[EnchLog\]/.test(l)).length,
        mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length };
      log('rows', JSON.stringify(ev.rowCounts));
    }

    /* ================= mob ================= */
    if (MODE === 'mob') {
      srv.send('difficulty 3');
      srv.send('gamerule doMobSpawning false');
      srv.send('gamerule doDaylightCycle false');
      srv.send('time set 1536000');
      srv.send('weather clear 1000000');
      const cx = tx - 6, cz = tz - 6;
      srv.send(`fill ${cx - 16} ${ty - 2} ${cz - 16} ${cx + 16} ${ty + 7} ${cz + 16} minecraft:air 0`);
      srv.send(`fill ${cx - 16} ${ty - 1} ${cz - 16} ${cx + 16} ${ty - 1} ${cz + 16} minecraft:stone 0`);
      srv.send(`fill ${cx - 16} ${ty} ${cz - 16} ${cx + 16} ${ty + 7} ${cz - 16} minecraft:stone 0`);
      srv.send(`fill ${cx - 16} ${ty} ${cz + 16} ${cx + 16} ${ty + 7} ${cz + 16} minecraft:stone 0`);
      srv.send(`fill ${cx - 16} ${ty} ${cz - 16} ${cx - 16} ${ty + 7} ${cz + 16} minecraft:stone 0`);
      srv.send(`fill ${cx + 16} ${ty} ${cz - 16} ${cx + 16} ${ty + 7} ${cz + 16} minecraft:stone 0`);
      srv.send(`tp ${BOT} ${cx + 0.5} ${ty} ${cz + 0.5} 0 20`);
      await sleep(1600);
      srv.send(`gamemode 1 ${BOT}`);
      srv.send(`clear ${BOT}`);
      await sleep(400);

      ev.mob = { samples: [], rounds: 0, spawned: 0, tensionRows: 0 };
      const seen = new Map();
      const collect = () => {
        for (const e of Object.values(bot.entities || {})) {
          if (!e || e.name !== 'zombie') continue;
          const eq = e.equipment || [];
          const slots = { main: eq[0], feet: eq[2], legs: eq[3], chest: eq[4], head: eq[5] };
          const hasAny = Object.values(slots).some((s) => s && s.name && s.name !== 'air');
          if (!hasAny) continue;
          const ench = (s) => !!s && /ench/.test(JSON.stringify(s.nbt || null));
          seen.set(e.id, {
            main: slots.main ? slots.main.name : null, mainEnch: ench(slots.main),
            armor: ['feet', 'legs', 'chest', 'head'].filter((k) => slots[k] && slots[k].name).length,
            armorEnch: ['feet', 'legs', 'chest', 'head'].filter((k) => slots[k] && slots[k].name && ench(slots[k])).length,
          });
        }
      };
      const TARGET = 480;
      for (let round = 0; round < 8; round++) {
        /* /summon 通道：CommandSummon 对 EntityLiving 显式调 onInitialSpawn（:119-121），
           与自然生成同源，且不依赖客户端 ray trace（spawn egg 需命中方块，上一轮 0 生成） */
        for (let i = 0; i < 60; i++) {
          const dx = ((i % 10) - 5) * 1.4;
          const dz = (Math.floor(i / 10) - 3) * 1.4;
          srv.send(`summon minecraft:zombie ${(cx + 0.5 + dx).toFixed(2)} ${ty} ${(cz + 0.5 + dz).toFixed(2)}`);
          ev.mob.spawned++;
        }
        await sleep(3200);
        collect();
        ev.mob.rounds = round + 1;
        const plain = srv.all.map(strip);
        ev.mob.tensionRows = plain.filter((l) => RE.nonTable.test(l)).length;
        log('mob-progress', `round=${round + 1} spawned=${ev.mob.spawned} seen=${seen.size} tension=${ev.mob.tensionRows}`);
        if (seen.size >= TARGET) break;
        srv.send('kill @e[type=zombie]');
        await sleep(1000);
      }
      collect();
      ev.mob.samples = [...seen.values()];
      const withMain = ev.mob.samples.filter((s) => s.main);
      const withArmor = ev.mob.samples.filter((s) => s.armor > 0);
      const armorPieces = withArmor.reduce((a, s) => a + s.armor, 0);
      const armorEnch = withArmor.reduce((a, s) => a + s.armorEnch, 0);
      ev.mob.summary = {
        n: ev.mob.samples.length, main: withMain.length,
        mainEnch: withMain.filter((s) => s.mainEnch).length,
        mainRate: withMain.length ? +(withMain.filter((s) => s.mainEnch).length / withMain.length).toFixed(4) : null,
        armorPieces, armorEnch, armorRate: armorPieces ? +(armorEnch / armorPieces).toFixed(4) : null,
      };
      const tv = srv.all.map(strip).map((l) => RE.nonTable.exec(l)).filter(Boolean).map((m) => m[2]);
      ev.mob.tensionValues = [...new Set(tv)];
      const budgets = srv.all.map(strip).map((l) => RE.start.exec(l)).filter(Boolean).map((m) => +m[2]);
      ev.mob.mobBudgets = { n: budgets.length, min: budgets.length ? Math.min(...budgets) : null,
        max: budgets.length ? Math.max(...budgets) : null,
        inRange: budgets.filter((b) => b >= 5 && b <= 20).length };
      log('mob', JSON.stringify(ev.mob.summary) + ' tension=' + JSON.stringify(ev.mob.tensionValues)
        + ' budget=' + JSON.stringify(ev.mob.mobBudgets));
      srv.send('kill @e[type=zombie]');
      const plain = srv.all.map(strip);
      ev.rowCounts = { ench: plain.filter((l) => /\[EnchLog\]/.test(l)).length,
        mixinFail: plain.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException/.test(l)).length };
    }

    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* noop */ }
    try {
      if (!srv.exited) { ev.stop = await srv.stop(); ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)); }
    } catch (e) { ev.stopError = String((e && e.message) || e); }
    setCfg(CFG, 'enchantDebugLog', 'false');
    const keysAfter = cfgKeys(CFG);
    ev.cfgAfter = { bytes: fs.statSync(CFG).size, sha: sha256(fs.readFileSync(CFG)),
      newKeys: Object.keys(keysAfter).filter((k) => !(k in keysBefore)),
      changed: Object.keys(keysBefore).filter((k) => keysAfter[k] !== keysBefore[k]),
      enchantKeys: Object.fromEntries(Object.entries(keysAfter).filter(([k]) => /enchant|freeAction|treeFelling/i.test(k))) };
    ev.obfCfgAfter = { bytes: fs.statSync(OBFCFG).size, sha: sha256(fs.readFileSync(OBFCFG)),
      untouched: sha256(fs.readFileSync(OBFCFG)) === ev.obfCfgBefore.sha };
    fs.writeFileSync(PROPS, propsBefore);
    ev.propsClose = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
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
