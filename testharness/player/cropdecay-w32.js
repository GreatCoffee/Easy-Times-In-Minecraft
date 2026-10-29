#!/usr/bin/env node
/**
 * cropdecay-w32.js — 农物衰减批（B-SK-1 兑现）W-32a…e 判窗驱动
 *
 * 判决源：判据只吃服务端 `[MiningLog] tool decay face=breaking … loss=` 行；
 *         旁证 = 同栈耐久回读（服务端 `/etest blockprobe` 的 `[BlockLog] probe … dur=x/max`
 *         ＋ mineflayer NBT `durabilityUsed` 双路）。
 *
 * 两相：A 相 `miningReform=true` 判 W-32a/b/c/e；B 相改 cfg `miningReform=false` 重启判 W-32d。
 * 窗内 cfg 只做两处键值改（blockDebugLog true / miningReform false），收口整档字节还原。
 * 换新世界（level-name=cropdecay32），收口 server.properties 字节还原 + 世界目录删除。
 *
 * 通道：服务端 = runServer + 控制台 stdin（server-console.js）；受击/挖块 = /etest dig；
 *       穿戴 = /etest hold；读耐久 = /etest blockprobe + mineflayer。
 *
 * 用法：node cropdecay-w32.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'cropdecay-w32';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const WORLD_NAME = 'cropdecay32';
const PORT = 25565;

const PIN = {
  head: '0b1d66d',
  dev: { bytes: 751082, sha: '35549D2D4B5EFC6BF1508236D0231846FCD6FD69FEE2A040453C3BB5EC1EA103' },
  rel: { bytes: 766792, sha: '48F4999B7174B25930792A66A964413BB9CF7B5EB2170E52F5CA56784C084C9B' },
};

/** 判点相对几何：平台 = 假人落点列（dy-1 起 3 格），目标块 = (bx+2, by, bz)。 */
const OFF_X = 2;

/** A 相（miningReform=true）。 */
const POINTS_A = [
  { id: 'W-32a', item: 'etim:scythe_rusted_iron', block: 'minecraft:tallgrass', meta: 1,
    expect: { rows: 1, loss: 2, dur: 2 }, note: '高草（R196 表 0.02F）＋锈镰' },
  { id: 'W-32b-1', item: 'etim:scythe_rusted_iron', block: 'minecraft:yellow_flower', meta: 0,
    expect: { rows: 0, loss: null, dur: 0 }, note: '负证：蒲公英（两代 0.0 拦死面）' },
  { id: 'W-32b-2', item: 'etim:scythe_rusted_iron', block: 'minecraft:torch', meta: 5,
    expect: { rows: 0, loss: null, dur: 0 }, note: '负证：火把（两代 0.0 拦死面）' },
  { id: 'W-32c', item: 'etim:scythe_rusted_iron', block: 'minecraft:wheat', meta: 7,
    support: 'minecraft:farmland', supportMeta: 7,
    expect: { rows: 1, loss: 2, dur: 2 }, note: '作物回归：成熟小麦（MixinBlockCrops 0.02F）' },
  { id: 'W-32e', item: 'minecraft:iron_axe', block: 'minecraft:sapling', meta: 0,
    expect: { rows: 1, loss: 5, dur: 5 }, note: '树苗（可选点；铁斧 = 1.0 档 → loss 5）' },
];

/** B 相（miningReform=false）。 */
const POINTS_B = [
  { id: 'W-32d-1', item: 'etim:scythe_rusted_iron', block: 'minecraft:tallgrass', meta: 1,
    expect: { rows: 0, loss: null, dur: 0 }, note: '回退面①：高草零磨损（非 vanilla -1/块，B-8）' },
  { id: 'W-32d-2', item: 'minecraft:iron_axe', block: 'minecraft:dirt', meta: 0,
    expect: { rows: 0, loss: null, dur: 1 }, note: '回退面②：dirt 走 vanilla damageItem(1)，无判行' },
];

/** 调试口（冒烟用，正式窗不设）：W32_ONLY=W-32a[,W-32c] 只跑前缀命中判点；W32_SKIP_B=1 跳过 B 相。 */
const ONLY = (process.env.W32_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const SKIP_B = process.env.W32_SKIP_B === '1';
const pick = (list) => (ONLY.length ? list.filter((p) => ONLY.some((o) => p.id.startsWith(o))) : list);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();

const RE = {
  probeDur: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(-|\d+)\/(\d+)/,
  decay: /\[MiningLog\] tool decay face=breaking item=(\S+) block=(\S+) loss=(-?\d+)/,
  digStart: /\[TestLog\] step=dig-start /,
  digStop: /\[TestLog\] step=dig-stop /,
  blockGone: /Successfully found the block/,
  placed: /Block placed|Unable to place|Cannot place|not loaded/i,
};

function pinOf(file, pin, label) {
  if (!fs.existsSync(file)) throw new Error(label + ' missing: ' + file);
  const buf = fs.readFileSync(file);
  return { file: label, bytes: buf.length, sha: sha256(buf), ok: buf.length === pin.bytes && sha256(buf) === pin.sha };
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

async function probeDur(srv, botName) {
  const from = srv.all.length;
  srv.send('etest blockprobe ' + botName);
  const line = await srv.waitFor(RE.probeDur, 6000, from);
  if (!line) return null;
  const m = RE.probeDur.exec(line);
  return { line, player: m[1], held: m[2], damage: m[3] === '-' ? -1 : +m[3], max: +m[4] };
}

function botDur(bot) {
  const it = bot && bot.heldItem;
  if (!it) return null;
  const d = it.durabilityUsed === undefined ? null : it.durabilityUsed;
  return d === null ? null : { damage: d, name: it.name, max: it.maxDurability };
}

async function botDurSettled(bot) {
  for (let i = 0; i < 12; i++) {
    const d = botDur(bot);
    if (d) return d;
    await sleep(200);
  }
  return null;
}

async function runPoint(srv, bot, botName, p, geo) {
  const BX = geo.bx + OFF_X;
  const BY = geo.by;
  const BZ = geo.bz;
  const SY = BY - 1;
  const rec = {
    id: p.id, note: p.note, item: p.item, block: p.block, meta: p.meta,
    support: p.support || 'minecraft:dirt', expect: p.expect,
    at: { x: BX, y: BY, z: BZ },
  };
  log(p.id, 'start', p.note);

  // ---- 注入口：主手换新栈（damage 0）----
  srv.send(`say [${p.id}] ${p.item} x ${p.block}`);
  srv.send('etest hold ' + p.item + ' ' + botName);
  await sleep(500);

  // ---- 摆场：支撑块 + 目标块 ----
  srv.send(`setblock ${BX} ${SY} ${BZ} minecraft:air 0`);
  await sleep(150);
  const support = p.support || 'minecraft:dirt';
  const supLine = `setblock ${BX} ${SY} ${BZ} ${support} ${p.supportMeta === undefined ? 0 : p.supportMeta}`;
  const supFrom = srv.all.length;
  srv.send(supLine);
  rec.support = support;
  rec.supportLine = await srv.waitFor(RE.placed, 5000, supFrom);
  await sleep(250);
  srv.send(`setblock ${BX} ${BY} ${BZ} minecraft:air 0`);
  await sleep(120);
  const setFrom = srv.all.length;
  srv.send(`setblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  const placed = await srv.waitFor(RE.placed, 5000, setFrom);
  rec.placedLine = placed;
  await sleep(300);
  const tbPlacedFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} ${p.block} ${p.meta}`);
  rec.blockPlaced = await srv.waitFor(/Successfully found the block|The block at/, 5000, tbPlacedFrom);

  // ---- 基线耐久（服务端 probe + bot NBT）----
  const b0 = await probeDur(srv, botName);
  const bb0 = await botDurSettled(bot);
  rec.probeBefore = b0;
  rec.botBefore = bb0;
  log(p.id, 'baseline', b0 ? b0.line.trim() : 'MISSING');

  // ---- 挖 ----
  const digFrom = srv.all.length;
  srv.send(`etest dig ${BX} ${BY} ${BZ} ${botName}`);
  const ds = await srv.waitFor(RE.digStart, 8000, digFrom);
  const dp = await srv.waitFor(RE.digStop, 12000, digFrom);
  await sleep(2000); // 让 break 完成 + 判行落地
  rec.digStart = ds;
  rec.digStop = dp;

  // ---- 事后：块是否消失 / 判行 / 耐久 ----
  const tbFrom = srv.all.length;
  srv.send(`testforblock ${BX} ${BY} ${BZ} minecraft:air`);
  rec.blockGoneLine = await srv.waitFor(/Successfully found the block|The block at/, 5000, tbFrom);
  await sleep(400);

  const seg = srv.all.slice(digFrom);
  rec.decayRows = seg.filter((l) => RE.decay.test(l));
  rec.mineSpeedRows = seg.filter((l) => /\[MiningLog\] mine speed/.test(l));
  rec.denyRows = seg.filter((l) => /\[MiningLog\] mine deny/.test(l));

  const b1 = await probeDur(srv, botName);
  const bb1 = await botDurSettled(bot);
  rec.probeAfter = b1;
  rec.botAfter = bb1;

  const durDelta = b0 && b1 ? b1.damage - b0.damage : null;
  const botDelta = bb0 && bb1 ? bb1.damage - bb0.damage : null;
  rec.durDelta = durDelta;
  rec.botDelta = botDelta;

  const rows = rec.decayRows.map((l) => {
    const m = RE.decay.exec(l);
    return { line: l, item: m[1], block: m[2], loss: +m[3] };
  });
  rec.decayParsed = rows;

  const checks = {
    support: !!rec.supportLine && /Block placed/i.test(rec.supportLine),
    placed: !!placed && /Block placed/i.test(placed),
    blockPresent: !!rec.blockPlaced && /Successfully found the block/i.test(rec.blockPlaced),
    digStart: !!ds,
    digStop: !!dp,
    blockGone: !!rec.blockGoneLine && /Successfully found the block/i.test(rec.blockGoneLine),
    probeBefore: !!b0 && b0.held === p.item,
    probeAfter: !!b1 && b1.held === p.item,
    durDelta: durDelta === p.expect.dur,
    botDelta: botDelta === null ? true : botDelta === p.expect.dur,
    rowsCount: rows.length === p.expect.rows,
    rowsMatch: p.expect.rows === 0 ? rows.length === 0
      : (rows.length === 1 && rows[0].loss === p.expect.loss
         && rows[0].item === p.item && rows[0].block === (p.block.split(':').pop())),
  };
  rec.checks = checks;
  rec.pass = Object.values(checks).every(Boolean);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    'rows=' + rows.length + ' loss=' + (rows.map((r) => r.loss).join(',') || '-')
    + ' durΔ=' + durDelta + ' botΔ=' + botDelta + ' blockGone=' + checks.blockGone);
  return rec;
}

async function runPhase(tag, botName, points, ev) {
  const srv = await startServer({ root: ROOT, tag });
  let bot = null;
  const phase = { tag, bot: botName, points: [] };
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached Done( within 300s');
    phase.ready = done.trim();
    phase.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;
    phase.extraMentions = srv.all.filter((l) => /etimextra/i.test(l)).slice(0, 8);
    phase.jarTask = srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l));

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: botName });
    await sleep(2000);
    phase.fmlMods = bot.fmlMods ? bot.fmlMods.map((m) => `${m.modid}@${m.version}`) : null;
    if (!phase.fmlMods) {
      try {
        const mc = require('minecraft-protocol');
        const ping = await mc.ping({ host: '127.0.0.1', port: PORT, version: '1.12.2', timeout: 8000 });
        phase.fmlMods = ping.modinfo && ping.modinfo.modList
          ? ping.modinfo.modList.map((m) => `${m.modid}@${m.version}`) : null;
      } catch (e) { phase.fmlPingError = String(e && e.message); }
    }

    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('difficulty 0');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${botName}`);
    srv.send(`effect ${botName} clear`);
    srv.send(`etest food 6 6 ${botName}`);
    await sleep(1200);

    // ---- 摆场：在假人自身落点列上方 8 格搭一条 3 格平台（同 chunk 必已加载；/fill 在
    //      未加载区静默不落地，首跑已证）----
    const p0 = bot.entity.position;
    const geo = { bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z), spawn: { x: p0.x, y: p0.y, z: p0.z } };
    phase.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    for (const dx of [0, 1, 2]) srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz} minecraft:dirt 0`);
    for (const dx of [0, 1, 2]) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by} ${geo.bz} minecraft:air 0`);
      srv.send(`setblock ${geo.bx + dx} ${geo.by + 1} ${geo.bz} minecraft:air 0`);
    }
    await sleep(900);
    srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1500);
    const p1 = bot.entity.position;
    phase.posAfterTp = { x: p1.x, y: p1.y, z: p1.z };
    const grounded = Math.abs(p1.y - geo.by) < 0.6
      && Math.abs(p1.x - (geo.bx + 0.5)) < 0.9 && Math.abs(p1.z - (geo.bz + 0.5)) < 0.9;
    log('setup', `pos after tp=(${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}) grounded=${grounded}`);
    if (!grounded) {
      srv.send(`tp ${botName} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1500);
      const p2 = bot.entity.position;
      phase.posAfterTp2 = { x: p2.x, y: p2.y, z: p2.z };
      log('setup', `pos after 2nd tp=(${p2.x.toFixed(2)},${p2.y.toFixed(2)},${p2.z.toFixed(2)})`);
    }

    for (const p of points) {
      phase.points.push(await runPoint(srv, bot, botName, p, geo));
    }
  } catch (e) {
    phase.fatal = e && e.stack ? e.stack : String(e);
    log(tag, 'FATAL', phase.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    phase.stop = await srv.stop();
    phase.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    try { fs.copyFileSync(RUNLOG, path.join(OUT, tag + '-server-latest.log')); } catch (e) {
      phase.logSnapshotError = String(e && e.message);
    }
    ev.phases.push(phase);
  }
  return phase;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, phases: [] };

  // ---- 钉值 ----
  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.extraJarInMods = fs.existsSync(path.join(ROOT, 'run', 'mods', 'etimextra-0.1.0.jar'));
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  log('pin', `dev=${ev.pins.devJar.bytes}/${ev.pins.devJar.sha} ${ev.pins.devJar.ok ? 'OK' : 'MISMATCH'}`);
  log('pin', `rel=${ev.pins.relJar.bytes}/${ev.pins.relJar.sha} ${ev.pins.relJar.ok ? 'OK' : 'MISMATCH'}`);
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (ev.pins.extraJarInMods) throw new Error('etimextra jar present in run/mods — this batch must run without it');

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);

  // ---- 快照 + 换世界 ----
  ev.cfgSnapshot = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  log('config', `cfg ${ev.cfgSnapshot.bytes} B ${ev.cfgSnapshot.sha}`);
  log('config', `server.properties ${ev.propsSnapshot.bytes} B ${ev.propsSnapshot.sha}`);

  const propText = fs.readFileSync(PROPS, 'utf8');
  let propEdit = setProp(propText, 'level-name', WORLD_NAME);
  // 假人落在世界出生点 ⇒ 默认 spawn-protection=16 会拦 START_DESTROY_BLOCK（首跑已证：
  // dig 两包齐发但块不消失）；窗内关掉，收口整档字节还原。
  if (/^spawn-protection=/m.test(propEdit)) {
    propEdit = setProp(propEdit, 'spawn-protection', '0');
  } else {
    propEdit = propEdit.replace(/(level-name=[^\r\n]*\r\n)/, '$1spawn-protection=0\r\n');
  }
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  ev.propsWindow = { bytes: fs.statSync(PROPS).size, sha: sha256(fs.readFileSync(PROPS)) };
  log('config', 'level-name -> ' + WORLD_NAME + ' / spawn-protection -> 0');

  ev.cfgEditA = editConfig((t) => {
    if (!/B:blockDebugLog=false/.test(t)) throw new Error('cfg has no B:blockDebugLog=false');
    return t.replace('B:blockDebugLog=false', 'B:blockDebugLog=true');
  });
  log('config', `phaseA cfg edit: blockDebugLog=true (${ev.cfgEditA.bytes} B ${ev.cfgEditA.sha})`);

  let restoreOk = false;
  const pointsA = pick(POINTS_A);
  const pointsB = SKIP_B ? [] : pick(POINTS_B);
  try {
    // ---- A 相：reform on ----
    if (pointsA.length) {
      const pa = await runPhase(TAG + '-a', 'ETIM_Harn32A', pointsA, ev);
      pa.phase = 'A (miningReform=true)';
    }

    // ---- B 相：reform off（改 cfg 重启）----
    if (pointsB.length) {
      ev.cfgEditB = editConfig((t) => {
        if (!/B:miningReform=true/.test(t)) throw new Error('cfg has no B:miningReform=true');
        return t.replace('B:miningReform=true', 'B:miningReform=false');
      });
      log('config', `phaseB cfg edit: miningReform=false (${ev.cfgEditB.bytes} B ${ev.cfgEditB.sha})`);
      const pb = await runPhase(TAG + '-b', 'ETIM_Harn32B', pointsB, ev);
      pb.phase = 'B (miningReform=false)';
    }
  } finally {
    // ---- 收口还原 ----
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = { bytes: cfgAfter.length, sha: sha256(cfgAfter), identical: sha256(cfgAfter) === ev.cfgSnapshot.sha };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter), identical: sha256(propsAfter) === ev.propsSnapshot.sha };
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical' : 'MISMATCH'));
    log('config', 'server.properties restored ' + (ev.propsRestored.identical ? 'byte-identical' : 'MISMATCH'));
    restoreOk = ev.cfgRestored.identical && ev.propsRestored.identical;

    // 世界目录清理（本窗新建）
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
    };
    ev.jarUpToDate = ev.phases.every((p) => (p.jarTask || []).some((l) => /:jar UP-TO-DATE/.test(l)));
  }

  const allPoints = ev.phases.flatMap((p) => p.points);
  const expectPoints = pointsA.length + pointsB.length;
  ev.verdict = (allPoints.length === expectPoints
      && allPoints.every((p) => p.pass)
      && restoreOk
      && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok
      && ev.portAfter === 0
      && ev.crashAfter === ev.pins.crashBefore
      && ev.jarUpToDate) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of allPoints) {
    log(p.id, p.pass ? 'PASS' : 'FAIL', p.checks ? JSON.stringify(p.checks) : '');
  }
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
