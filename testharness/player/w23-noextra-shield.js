#!/usr/bin/env node
/**
 * w23-noextra-shield.js — 盾面削弱批 W-23（无 Extra 降级比对）
 *
 * 判据正本：playground/audit/盾面削弱批-立项摸底.md §3 W-23 行（+ 对照报告 §5 L0 表
 * 的木盾行）。判「拔掉 Extra 后 vanilla 木盾行为不变」：`[BlockLog] block` 与
 * `[BlockLog] wear` 两行都要与 W-16 木盾行逐位同值。
 *
 * 本窗环境 = 主 mod 工作区（classpath 无 etimextra），runServer + 控制台 stdin
 * （stock RCON 在 GradleStart dev 链下 NPE，见 testharness/server/README.md）。
 *
 * 腿序与 W-16 木盾腿同源（release → hold → useitem → health 6 → hurt 8 →
 * health 6 → hurt 1），唯一差异是 classpath 上没有 etimextra。
 * 正式判点 = raw=8 两行；raw=1 地板臂只作辅助（只判 wear/rate/mult，factor 不判）。
 *
 * 用法：node w23-noextra-shield.js [tag]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || process.env.W23_TAG || 'w23-noextra-shield';
const BOTNAME = process.env.W23_BOT || 'ETIM_Harn23';
const PORT = 25565;
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const ETIMCFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const OUTDIR = path.join(ROOT, 'testharness', 'build-logs');
const W16_EVIDENCE = 'D:\\OpenCodeWorkspace\\ETIM-Extra\\testharness\\build-logs\\w16-nerf-l0-evidence.json';

const ITEM = 'minecraft:shield';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);

const RE = {
  block: /\[BlockLog\] block player=(\S+) src=(\S+) raw=([-\d.]+) blocked=([-\d.]+) factor=([-\d.]+) spectral=(true|false) min=([-\d.]+) carrier=(\S+)/,
  wear: /\[BlockLog\] wear player=(\S+) item=(\S+) shield=(true|false) rate=(\S+) mult=(\S+) decay=(\S+) raw=([-\d.]+) blocked=([-\d.]+) wear=(\d+) dur=(\d+)->(\d+)/,
};

const readLog = () => {
  try { return fs.readFileSync(RUNLOG, 'utf8'); } catch (e) { return ''; }
};

function sha256(buf) {
  return require('crypto').createHash('sha256').update(buf).digest('hex').toUpperCase();
}

/**
 * 窗内把 `B:blockDebugLog` 置 true（**纯字节插入**：本工作区 cfg 里没有该键，
 * 在 `combat {` 行尾插入；BOM/CRLF/全部注释逐字节不动，工装纪律 6），
 * 并把窗前字节副本存进 build-logs；收口按字节整体还原。
 */
function enableBlockLog() {
  const before = fs.readFileSync(ETIMCFG);
  const copy = path.join(OUTDIR, TAG + '-etim.cfg.before');
  fs.mkdirSync(OUTDIR, { recursive: true });
  fs.writeFileSync(copy, before);
  if (/B:blockDebugLog/.test(before.toString('utf8'))) {
    throw new Error('etim.cfg already carries B:blockDebugLog — refuse to guess the pre-window byte shape');
  }
  const anchor = Buffer.from('combat {');
  const i = before.indexOf(anchor);
  if (i < 0) throw new Error('no "combat {" category in etim.cfg');
  // 找到该行行尾（本文件全 CRLF），插在分类首行之后
  const nl = before.indexOf(Buffer.from('\r\n'), i);
  if (nl < 0) throw new Error('no CRLF after "combat {"');
  const insertAt = nl + 2;
  const line = Buffer.from('    B:blockDebugLog=true\r\n');
  const after = Buffer.concat([before.slice(0, insertAt), line, before.slice(insertAt)]);
  fs.writeFileSync(ETIMCFG, after);
  log('config', 'blockDebugLog=true (byte copy -> ' + copy + ')');
  return { copy, shaBefore: sha256(before), bytesBefore: before.length, bytesAfter: after.length };
}

function restoreBlockLog(saved) {
  fs.writeFileSync(ETIMCFG, fs.readFileSync(saved.copy));
  const buf = fs.readFileSync(ETIMCFG);
  const sha = sha256(buf);
  const ok = sha === saved.shaBefore && buf.length === saved.bytesBefore;
  log('config', 'restored: ' + sha + (ok ? ' (byte-identical)' : ' MISMATCH'));
  return { sha, bytes: buf.length, identical: ok };
}

const near = (a, b) => Math.abs(a - b) < 0.0005;

/** 一次 hurt 的两行：block 行与 wear 行相邻（只判相邻，不判先后）。 */
function pairOf(text, item, spectral, raw) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l);
  for (let i = 0; i < lines.length; i++) {
    const b = RE.block.exec(lines[i]);
    if (!b) continue;
    if (b[2] !== 'etimspectral' || !near(+b[3], raw) || b[6] !== String(spectral)) continue;
    if (raw === 8 && b[8] !== item) continue;
    const cand = [i + 1, i - 1].filter((k) => k >= 0 && k < lines.length);
    let w = null;
    let wi = -1;
    for (const k of cand) {
      const m = RE.wear.exec(lines[k]);
      if (m && m[2] === item && near(+m[7], raw)) { w = m; wi = k; break; }
    }
    if (!w) continue;
    return {
      block: {
        line: lines[i], src: b[2], raw: +b[3], blocked: +b[4], factor: +b[5],
        spectral: b[6] === 'true', min: +b[7], carrier: b[8],
      },
      wear: {
        line: lines[wi], item: w[2], shield: w[3] === 'true', rate: w[4], mult: w[5],
        decay: w[6], raw: +w[7], blocked: +w[8], wear: +w[9], durBefore: +w[10], durAfter: +w[11],
      },
      adjacent: Math.abs(wi - i) === 1,
    };
  }
  return null;
}

/** 把 `[BlockLog] block|wear ...` 行拆成有序 key=value（去时间戳/logger/player/[server]）。 */
function fieldsOf(line, kind) {
  const body = line.slice(line.indexOf('[BlockLog] ' + kind + ' ') + ('[BlockLog] ' + kind + ' ').length);
  const out = {};
  for (const tok of body.split(/\s+/)) {
    const eq = tok.indexOf('=');
    if (eq < 0) continue;
    out[tok.slice(0, eq)] = tok.slice(eq + 1).replace(/\s*\[server\]$/, '');
  }
  delete out.player;
  return out;
}

/**
 * 逐位比对：数值字段容差 0.0005（字符串形态仍原样记录）；`dur` 不比起点，
 * 比增量。返回 {same, diffs[]}。
 */
function compare(kind, gotLine, baseLine, expectDelta) {
  const g = fieldsOf(gotLine, kind);
  const b = fieldsOf(baseLine, kind);
  const diffs = [];
  const keys = new Set([...Object.keys(b), ...Object.keys(g)]);
  for (const k of keys) {
    if (k === 'dur') continue;
    const gv = g[k];
    const bv = b[k];
    if (gv === undefined || bv === undefined) { diffs.push(k + ': got=' + gv + ' base=' + bv); continue; }
    const gn = Number(gv);
    const bn = Number(bv);
    if (!Number.isNaN(gn) && !Number.isNaN(bn) && /^-?\d+(\.\d+)?$/.test(gv) && /^-?\d+(\.\d+)?$/.test(bv)) {
      if (!near(gn, bn)) diffs.push(k + ': got=' + gv + ' base=' + bv);
    } else if (gv !== bv) {
      diffs.push(k + ': got=' + gv + ' base=' + bv);
    }
  }
  // block 行没有 dur 字段；只有 wear 行比耐久增量
  let gotDelta = null;
  let baseDelta = null;
  let gA = null;
  let bA = null;
  if (kind === 'wear' || g.dur !== undefined || b.dur !== undefined) {
    const [ga, gb] = String(g.dur || '').split('->').map(Number);
    const [ba, bb] = String(b.dur || '').split('->').map(Number);
    gotDelta = gb - ga;
    baseDelta = bb - ba;
    gA = ga;
    bA = ba;
    if (gotDelta !== expectDelta) diffs.push('dur增量: got=' + gotDelta + ' 期望=' + expectDelta);
    if (gotDelta !== baseDelta) diffs.push('dur增量: got=' + gotDelta + ' base=' + baseDelta);
  }
  return { same: diffs.length === 0, diffs, got: g, base: b, gotDelta, baseDelta, gotDurStart: gA, baseDurStart: bA };
}

function loadBaseline() {
  try {
    const e = JSON.parse(fs.readFileSync(W16_EVIDENCE, 'utf8'));
    const w = e.legs.find((l) => l.leg === 'wood');
    if (!w || !w.eight || !w.one) throw new Error('wood leg missing in W-16 evidence');
    const [b8, w8] = w.eight.split(' || ');
    const [b1, w1] = w.one.split(' || ');
    return { source: W16_EVIDENCE, block8: b8, wear8: w8, block1: b1, wear1: w1 };
  } catch (err) {
    return { source: null, error: String(err && err.message || err) };
  }
}

async function main() {
  fs.mkdirSync(OUTDIR, { recursive: true });
  const saved = enableBlockLog();
  const base = loadBaseline();
  const srv = await startServer({ root: ROOT, tag: TAG });
  const ev = {
    tag: TAG, item: ITEM, bot: BOTNAME, startedAt: new Date().toISOString(),
    workspace: ROOT, cfgBeforeSha: saved.shaBefore, cfgBytesBefore: saved.bytesBefore,
    cfgBytesAfterEdit: saved.bytesAfter, baseline: base, legs: [],
  };

  let bot = null;
  try {
    const done = await srv.ready;
    if (!done) throw new Error('server never reached "Done (" within 300s');
    log('server', 'READY:', done.trim());

    ev.extraOnClasspath = srv.all.filter((l) => /etimextra/i.test(l)).length;
    ev.modGather = srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null;

    bot = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOTNAME });
    await sleep(1500);

    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('time set 18000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send('gamemode 0 ' + BOTNAME);
    await sleep(1500);

    const before = readLog().length;
    srv.send('say [W23] wood start');
    srv.send('etest release ' + BOTNAME);
    await sleep(500);
    srv.send('etest hold ' + ITEM + ' ' + BOTNAME);
    await sleep(900);
    srv.send('etest useitem ' + BOTNAME);
    await sleep(1000);

    // raw=8 臂（正式判点）
    srv.send('etest health 6 ' + BOTNAME);
    await sleep(300);
    srv.send('etimghost hurt ' + BOTNAME + ' 8 false');
    await sleep(1800);

    // raw=1 地板臂（辅助：只判 wear/rate/mult，factor 不判）
    srv.send('etest health 6 ' + BOTNAME);
    await sleep(300);
    srv.send('etimghost hurt ' + BOTNAME + ' 1 false');
    await sleep(1800);

    const text = readLog().slice(before);
    const eight = pairOf(text, ITEM, false, 8);
    const one = pairOf(text, ITEM, false, 1);

    const out = { leg: 'wood', item: ITEM, spectral: false };
    out.eight = eight ? eight.block.line + ' || ' + eight.wear.line : null;
    out.one = one ? one.block.line + ' || ' + one.wear.line : null;
    out.adjacent = { eight: !!eight && eight.adjacent, one: !!one && one.adjacent };

    out.diff8 = eight ? {
      block: compare('block', eight.block.line, base.block8, 0),
      wear: compare('wear', eight.wear.line, base.wear8, 10),
    } : null;
    out.diff1 = one ? {
      block: compare('block', one.block.line, base.block1, 0),
      wear: compare('wear', one.wear.line, base.wear1, 2),
    } : null;

    const checks = {
      eight: !!eight,
      one: !!one,
      adjacent8: !!eight && eight.adjacent,
      blockMatch8: !!out.diff8 && out.diff8.block.same,
      wearMatch8: !!out.diff8 && out.diff8.wear.same,
      wearDelta10: !!out.diff8 && out.diff8.wear.gotDelta === 10,
      // 逐字段直读（防 compare 自身 bug 造成假绿）
      src8: !!eight && eight.block.src === 'etimspectral',
      blocked8: !!eight && near(eight.block.blocked, 4.0),
      factor8: !!eight && near(eight.block.factor, 0.5),
      spectral8: !!eight && eight.block.spectral === false,
      min8: !!eight && near(eight.block.min, 1.0),
      carrier8: !!eight && eight.block.carrier === ITEM,
      item8: !!eight && eight.wear.item === ITEM,
      shield8: !!eight && eight.wear.shield === true,
      rate8: !!eight && Number(eight.wear.rate) === 2.5,
      mult8: !!eight && Number(eight.wear.mult) === 1.0,
      decay8: !!eight && eight.wear.decay === 'na',
      wear8: !!eight && eight.wear.wear === 10,
      // raw=1 臂辅助位
      floorBlock: !!one && near(one.block.blocked, 1.0),
      rate1: !!one && Number(one.wear.rate) === 2.5,
      mult1: !!one && Number(one.wear.mult) === 1.0,
      wear1: !!one && one.wear.wear === 2,
    };
    out.checks = checks;
    out.pass = Object.values(checks).every(Boolean);
    log('W-23', out.pass ? 'PASS' : 'FAIL',
      Object.entries(checks).map(([k, v]) => k + '=' + v).join(' '));
    if (!out.pass) {
      log('W-23', 'raw lines:', JSON.stringify(text.split(/\r?\n/).filter((l) => l.includes('[BlockLog]'))));
      log('W-23', 'diffs8:', JSON.stringify(out.diff8));
    }
    ev.legs.push(out);
  } catch (e) {
    ev.fatal = e && e.stack ? e.stack : String(e);
    log('FATAL', ev.fatal);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    ev.jarTask = srv.all.filter((l) => /^> Task :(compileJava|jar|classes)\b/.test(l));
    ev.extraAfterBoot = srv.all.filter((l) => /etimextra/i.test(l)).length;
    ev.cfgAfter = restoreBlockLog(saved);
    ev.verdict = ev.legs.length === 1 && ev.legs[0].pass
      && ev.cfgAfter.identical && !ev.fatal ? 'PASS' : 'FAIL';
    const file = path.join(OUTDIR, TAG + '-evidence.json');
    fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
    log('evidence', file);
    log('VERDICT', ev.verdict);
    process.exit(ev.verdict === 'PASS' ? 0 : 1);
  }
}

main().catch((e) => { log('boot', 'FATAL:', e && e.stack ? e.stack : e); process.exit(1); });
