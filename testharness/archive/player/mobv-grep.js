#!/usr/bin/env node
/**
 * mobv-grep.js — 在 run/obfuscated/logs 全域（含 .gz 归档）按正则检索判行。
 *
 * 用法：
 *   node testharness/player/mobv-grep.js <regex> [limitPerFile]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const LOGDIR = path.join(__dirname, '..', '..', 'run', 'obfuscated', 'logs');
const re = new RegExp(process.argv[2] || '.', 'i');
const limit = parseInt(process.argv[3] || '40', 10);

function readAny(file) {
  const buf = fs.readFileSync(file);
  if (file.endsWith('.gz')) {
    try { return zlib.gunzipSync(buf).toString('utf8'); } catch (e) { return ''; }
  }
  return buf.toString('utf8');
}

const files = fs.readdirSync(LOGDIR)
  .filter((f) => /^2026-10-24-\d+\.log\.gz$/.test(f) || f === 'latest.log')
  .sort();

let total = 0;
for (const f of files) {
  const t = readAny(path.join(LOGDIR, f));
  const hits = t.split('\n').filter((l) => re.test(l));
  if (hits.length === 0) continue;
  total += hits.length;
  console.log(`=== ${f} : ${hits.length} hits ===`);
  hits.slice(0, limit).forEach((l) => console.log('  ' + l.trim().slice(0, 300)));
  if (hits.length > limit) console.log(`  ... (${hits.length - limit} more)`);
}
console.log(`TOTAL ${total}`);
