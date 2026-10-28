/**
 * ad7e-lib.js — 批 E / AD-7 验证窗公共件（会话七自研工装）
 *
 * 只做四件事：① RCON 单发命令（一连接一命令，经 run/ad7e 的 binpatch 链实测可用）；
 * ② latest.log 增量读取与行解析（[DamageLog]/[EnchantLog]/[EtimInit]/[EtimTest]）；
 * ③ 逐相位证据落 JSON（build-logs/ad7e-report.json，重跑按 key 覆盖）；
 * ④ 样本统计（均值/占比/计数）。
 *
 * 判据正本：playground/audit/ad7-验证回执.md（本窗产出）。
 * 所有判定以 latest.log 原文行为准，本件只负责取数与汇总。
 */
'use strict';
const fs = require('fs');
const net = require('net');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const WORK = process.env.AD7E_WORK || path.join(ROOT, 'run', 'ad7e');
const LOG = process.env.AD7E_LOG || path.join(WORK, 'logs', 'latest.log');
const CFG = process.env.AD7E_CFG || path.join(WORK, 'config', 'etim.cfg');
const OUT = process.env.AD7E_OUT || path.join(ROOT, 'build-logs', 'ad7e-report.json');

const RCON = {
  host: process.env.AD7E_RHOST || '127.0.0.1',
  port: Number(process.env.AD7E_RPORT || 25575),
  pass: process.env.AD7E_RPASS || 'etim27',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const say = (...a) => console.log('[' + new Date().toISOString().slice(11, 23) + ']', ...a);
const f3 = (v) => (v === null || v === undefined || Number.isNaN(v) ? 'n/a' : Number(v).toFixed(3));

// ---------------- RCON ----------------

function packet(id, type, body) {
  const payload = Buffer.alloc(10 + Buffer.byteLength(body, 'utf8'));
  payload.writeInt32LE(id, 0);
  payload.writeInt32LE(type, 4);
  Buffer.from(body, 'utf8').copy(payload, 8);
  payload.writeUInt8(0, 8 + Buffer.byteLength(body, 'utf8'));
  payload.writeUInt8(0, 9 + Buffer.byteLength(body, 'utf8'));
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
    return await rconOnce(cmd, 8000); // 一次重试：单发抖动不致整相位失败
  }
}

// ---------------- 日志 ----------------

const logOffset = () => { try { return fs.statSync(LOG).size; } catch (e) { return 0; } };
const logSince = (off) => { try { return fs.readFileSync(LOG).slice(off).toString('utf8'); } catch (e) { return ''; } };
const logAll = () => { try { return fs.readFileSync(LOG).toString('utf8'); } catch (e) { return ''; } };

/** 等某个正则出现在 offset 之后；返回命中行（无则 null）。 */
async function waitLog(re, off, timeoutMs = 4000) {
  const t0 = Date.now();
  for (;;) {
    const hit = logSince(off).split('\n').find((l) => re.test(l));
    if (hit) return hit.trim();
    if (Date.now() - t0 > timeoutMs) return null;
    await sleep(120);
  }
}

const RE_DMG = /\[DamageLog\] dmg target=(.+?)#(\d+) src=(\S+) raw=([-\d.eE+]+) armorIn=([-\d.eE+]+) armorOut=([-\d.eE+]+) absorption=([-\d.eE+]+) final=([-\d.eE+]+)/;
const RE_PROT = /\[DamageLog\] prot target=(.+?)#(\d+) src=(\S+) natural=([-\d.eE+]+) armor=([-\d.eE+]+) potion=([-\d.eE+]+) total=([-\d.eE+]+) piercing=([-\d.eE+]+) wear=([-\d.eE+]+)/;
const RE_PROBE = /\[EnchantLog\] enchantprobe slot=(\S+) item=(\S+) canApply=(\S+) maxLevel=(\d+)/;
const RE_WINDOWS = /\[EnchantLog\] windows (.+?) \[server\]/;
const RE_TABLE = /\[EnchantLog\] table power=(\d+) slot0=(\d+) slot1=(\d+) slot2=(\d+) power30=(\d+) slot0=(\d+) slot1=(\d+) slot2=(\d+)/;
const RE_CARRIER = /\[EnchantLog\] carrier src=(\S+) immediate=(\S+) carrier=(\S+) level=(\d+) pts=([-\d.]+)/;

function parseDmg(text) {
  return text.split('\n').map((l) => {
    const m = RE_DMG.exec(l);
    return m ? { name: m[1], id: +m[2], src: m[3], raw: +m[4], armorIn: +m[5], armorOut: +m[6], absorption: +m[7], final: +m[8], line: l.trim() } : null;
  }).filter(Boolean);
}
function parseProt(text) {
  return text.split('\n').map((l) => {
    const m = RE_PROT.exec(l);
    return m ? { name: m[1], id: +m[2], src: m[3], natural: +m[4], armor: +m[5], potion: +m[6], total: +m[7], piercing: +m[8], wear: +m[9], line: l.trim() } : null;
  }).filter(Boolean);
}
function parseProbe(text) {
  return text.split('\n').map((l) => {
    const m = RE_PROBE.exec(l);
    return m ? { slot: m[1], item: m[2], canApply: m[3] === 'true', maxLevel: +m[4], line: l.trim() } : null;
  }).filter(Boolean);
}
function parseWindows(text) {
  const m = RE_WINDOWS.exec(text);
  return m ? m[1] : null;
}
function parseTable(text) {
  const m = RE_TABLE.exec(text);
  return m ? { power: +m[1], slot0: +m[2], slot1: +m[3], slot2: +m[4], power30: +m[5], slot0b: +m[6], slot1b: +m[7], slot2b: +m[8], line: m[0] } : null;
}
function parseCarrier(text) {
  return text.split('\n').map((l) => {
    const m = RE_CARRIER.exec(l);
    return m ? { src: m[1], immediate: m[2], carrier: m[3], level: +m[4], pts: +m[5], line: l.trim() } : null;
  }).filter(Boolean);
}

// ---------------- 证据档 ----------------

function loadReport() {
  try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { return {}; }
}
function saveReport(patch) {
  const prev = loadReport();
  fs.writeFileSync(OUT, JSON.stringify(Object.assign(prev, patch), null, 2), 'utf8');
}

// ---------------- 统计 ----------------

const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const countIf = (a, p) => a.filter(p).length;

module.exports = {
  ROOT, WORK, LOG, CFG, OUT, RCON,
  sleep, say, f3,
  rcon,
  logOffset, logSince, logAll, waitLog,
  parseDmg, parseProt, parseProbe, parseWindows, parseTable, parseCarrier,
  loadReport, saveReport,
  mean, countIf,
  RE_DMG, RE_PROT, RE_PROBE, RE_CARRIER,
};
