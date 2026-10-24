#!/usr/bin/env node
/**
 * mobv-logscan.js — mob 批验证窗（W1-W10）日志取证扫描器。
 *
 * 用途：对 run/obfuscated/logs 下的 latest.log / debug.log / 轮转 .gz 归档
 * 逐档计数判行通道命中数，供 W1（boot 面）与后续 W 面取证定位。
 *
 * 用法：
 *   node testharness/player/mobv-logscan.js                # 扫全部 2026-10-24 档
 *   node testharness/player/mobv-logscan.js <file> [<file>] # 只扫指定档
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LOGDIR = path.join(__dirname, '..', '..', 'run', 'obfuscated', 'logs');

const PATTERNS = [
  'Done (',
  'item model registry',
  'Mixin apply failed',
  'mixin apply failed',
  '[AILog]',
  '[MobLog]',
  '[SpawnLog]',
  '[MiningLog]',
  '[TestLog]',
  'revenant',
  'bonelord',
];

function count(t, needle) {
  let n = 0, i = 0;
  while ((i = t.indexOf(needle, i)) >= 0) { n++; i += needle.length; }
  return n;
}

function readAny(file) {
  const buf = fs.readFileSync(file);
  if (file.endsWith('.gz')) {
    try { return zlib.gunzipSync(buf).toString('utf8'); } catch (e) { return 'GZIP-ERR ' + e.message; }
  }
  return buf.toString('utf8');
}

function main() {
  let files = process.argv.slice(2);
  if (files.length === 0) {
    files = fs.readdirSync(LOGDIR)
      .filter((f) => f.startsWith('2026-10-24-') && f.endsWith('.log.gz'))
      .sort()
      .map((f) => path.join(LOGDIR, f));
    files.push(path.join(LOGDIR, 'latest.log'));
  }
  for (const f of files) {
    if (!fs.existsSync(f)) { console.log(`${path.basename(f)} MISSING`); continue; }
    const t = readAny(f);
    const st = fs.statSync(f);
    const counts = PATTERNS.map((p) => `${p}=${count(t, p)}`).join(' ');
    const first = (t.split('\n')[0] || '').slice(0, 70);
    console.log(`${path.basename(f)} bytes=${t.length} disk=${st.size} ${counts}`);
    console.log(`    first=${first}`);
  }
}

main();
