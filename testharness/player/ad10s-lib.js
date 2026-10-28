/**
 * ad10s-lib.js — AD-10+SH 验证窗公共件（会话七自研工装）
 *
 * 只做四件事：
 *   ① RCON 单发命令（一连接一命令；run/ad10s 走 binpatch 链，RCON 实测可用）；
 *   ② latest.log 增量读取 + [BlockLog]/[DamageLog]/[TestLog] 行解析；
 *   ③ 逐相位证据落 build-logs/ad10s-report.json（重跑按 key 覆盖）；
 *   ④ 统计帮手。
 *
 * 判据正本：playground/audit/ad10-对照报告.md §13 + ad10-终审回执.md §四/§五。
 * 本件不判值，只取数与汇总。
 */
'use strict';
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORK = process.env.AD10S_WORK || path.join(ROOT, 'run', 'ad10s');
const LOG = process.env.AD10S_LOG || path.join(WORK, 'logs', 'latest.log');
const CFG = process.env.AD10S_CFG || path.join(WORK, 'config', 'etim.cfg');
const OUT = process.env.AD10S_OUT || path.join(ROOT, 'build-logs', 'ad10s-report.json');

const RCON = {
  host: process.env.AD10S_RHOST || '127.0.0.1',
  port: Number(process.env.AD10S_RPORT || 25575),
  pass: process.env.AD10S_RPASS || 'etim27',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log('[' + new Date().toISOString().slice(11, 23) + ']', ...a);
const f3 = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'n/a' : Number(v).toFixed(3));

// ---------------- RCON ----------------

function packet(id, type, body) {
  const len = Buffer.byteLength(body, 'utf8');
  const payload = Buffer.alloc(10 + len);
  payload.writeInt32LE(id, 0);
  payload.writeInt32LE(type, 4);
  Buffer.from(body, 'utf8').copy(payload, 8);
  payload.writeUInt8(0, 8 + len);
  payload.writeUInt8(0, 9 + len);
  const out = Buffer.alloc(4 + payload.length);
  out.writeInt32LE(payload.length, 0);
  payload.copy(out, 4);
  return out;
}

/** 单命令单连接（1.12 RConThreadClient 连续 exec 会断连，故不复用连接）。 */
function rconOnce(cmd, timeoutMs) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(RCON.port, RCON.host);
    let buf = Buffer.alloc(0);
    let phase = 'auth';
    let done = false;
    const finish = (err, value) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { sock.destroy(); } catch (e) { /* ignore */ }
      if (err) reject(err); else resolve(value);
    };
    const timer = setTimeout(() => finish(new Error('rcon timeout: ' + cmd)), timeoutMs);
    const drain = () => {
      while (buf.length >= 4) {
        const size = buf.readInt32LE(0);
        if (buf.length < size + 4) return;
        const id = buf.readInt32LE(4);
        const body = buf.slice(12, 4 + size - 2).toString('utf8');
        buf = buf.slice(4 + size);
        if (phase === 'auth') {
          if (id === -1) return finish(new Error('rcon auth failed'));
          phase = 'exec';
          sock.write(packet(9, 2, cmd));
        } else {
          return finish(null, body.trim());
        }
      }
    };
    sock.on('data', (d) => { buf = Buffer.concat([buf, d]); drain(); });
    sock.on('error', (e) => finish(e));
    sock.on('close', () => finish(new Error('rcon closed before reply: ' + cmd)));
    sock.write(packet(1, 3, RCON.pass));
  });
}

async function rcon(cmd) {
  try {
    return await rconOnce(cmd, 8000);
  } catch (e) {
    await sleep(250);
    return await rconOnce(cmd, 8000);
  }
}

// ---------------- 日志 ----------------

const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (off) => { try { return fs.readFileSync(LOG).slice(off).toString('utf8'); } catch (e) { return ''; } };
const logAll = () => { try { return fs.readFileSync(LOG).toString('utf8'); } catch (e) { return ''; } };

async function waitLog(re, off, timeoutMs = 4000) {
  const t0 = Date.now();
  for (;;) {
    const hit = logSince(off).split('\n').find((l) => re.test(l));
    if (hit) return hit.trim();
    if (Date.now() - t0 > timeoutMs) return null;
    await sleep(80);
  }
}

const RE = {
  carrier: /\[BlockLog\] carrier item=(\S+) class=(\S+) block=(true|false)/,
  action: /\[BlockLog\] action item=(\S+) action=(\w+)/,
  start: /\[BlockLog\] start player=(\S+) hand=(\w+) item=(\S+) action=BLOCK dur=(\d+) count=(\d+)/,
  state: /\[BlockLog\] state player=(\S+) handActive=(true|false) active=(\S+) held=(\S+) same=(true|false)/,
  gate: /\[BlockLog\] gate player=(\S+) active=(\S+) src=(\S+) suppressed=(true|false)/,
  block: /\[BlockLog\] block player=(\S+) src=(\S+) raw=([-\d.eE+]+) blocked=([-\d.eE+]+) factor=([-\d.]+) min=([-\d.]+) carrier=(\S+)/,
  wear: /\[BlockLog\] wear player=(\S+) item=(\S+) rate=([-\d.]+) decay=(\S+) raw=([-\d.eE+]+) blocked=([-\d.eE+]+) wear=(\d+) dur=(\d+)->(\d+)/,
  probeDur: /\[BlockLog\] probe player=(\S+) held=(\S+) dur=(\S+)/,
  probeCfg: /\[BlockLog\] probe player=(\S+) cfg blockModel=(true|false) factor=([-\d.]+) min=([-\d.]+) shieldRate=([-\d.]+)/,
  dmg: /\[DamageLog\] dmg target=(.+?)#(\d+) src=(\S+) raw=([-\d.eE+]+) armorIn=([-\d.eE+]+) armorOut=([-\d.eE+]+) absorption=([-\d.eE+]+) final=([-\d.eE+]+)/,
  prot: /\[DamageLog\] prot target=(.+?)#(\d+) src=(\S+) natural=([-\d.eE+]+) armor=([-\d.eE+]+) potion=([-\d.eE+]+) total=([-\d.eE+]+) piercing=([-\d.eE+]+) wear=([-\d.eE+]+)/,
  testStep: /\[TestLog\] step=(\w+)/,
};

function rows(text, re, map) {
  return text.split('\n').map((l) => {
    const m = re.exec(l);
    return m ? Object.assign(map(m), { line: l.trim() }) : null;
  }).filter(Boolean);
}

const parsers = {
  carrier: (t) => rows(t, RE.carrier, (m) => ({ item: m[1], cls: m[2], block: m[3] === 'true' })),
  action: (t) => rows(t, RE.action, (m) => ({ item: m[1], action: m[2] })),
  start: (t) => rows(t, RE.start, (m) => ({ player: m[1], hand: m[2], item: m[3], dur: +m[4], count: +m[5] })),
  state: (t) => rows(t, RE.state, (m) => ({ player: m[1], handActive: m[2] === 'true', active: m[3], held: m[4], same: m[5] === 'true' })),
  gate: (t) => rows(t, RE.gate, (m) => ({ player: m[1], active: m[2], src: m[3], suppressed: m[4] === 'true' })),
  block: (t) => rows(t, RE.block, (m) => ({ player: m[1], src: m[2], raw: +m[3], blocked: +m[4], factor: +m[5], min: +m[6], carrier: m[7] })),
  wear: (t) => rows(t, RE.wear, (m) => ({ player: m[1], item: m[2], rate: +m[3], decay: m[4], raw: +m[5], blocked: +m[6], wear: +m[7], durBefore: +m[8], durAfter: +m[9] })),
  probeDur: (t) => rows(t, RE.probeDur, (m) => ({ player: m[1], held: m[2], dur: m[3] })),
  probeCfg: (t) => rows(t, RE.probeCfg, (m) => ({ player: m[1], blockModel: m[2] === 'true', factor: +m[3], min: +m[4], shieldRate: +m[5] })),
  dmg: (t) => rows(t, RE.dmg, (m) => ({ name: m[1], id: +m[2], src: m[3], raw: +m[4], armorIn: +m[5], armorOut: +m[6], absorption: +m[7], final: +m[8] })),
  prot: (t) => rows(t, RE.prot, (m) => ({ name: m[1], id: +m[2], src: m[3], natural: +m[4], armor: +m[5], potion: +m[6], total: +m[7], piercing: +m[8], wear: +m[9] })),
};

// ---------------- 证据档 ----------------

function loadReport() {
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return {}; }
}
function saveReport(patch) {
  const prev = loadReport();
  fs.writeFileSync(OUT, JSON.stringify(Object.assign(prev, patch), null, 1), 'utf8');
}

// ---------------- 统计 ----------------

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const countIf = (a, p) => a.filter(p).length;

module.exports = {
  ROOT, WORK, LOG, CFG, OUT, RCON,
  sleep, say, f3, rcon,
  logOffset, logSince, logAll, waitLog,
  parsers, RE,
  loadReport, saveReport,
  mean, countIf,
};
