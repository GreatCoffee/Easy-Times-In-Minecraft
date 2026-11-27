#!/usr/bin/env node
/**
 * _settime.js — 停服态写 level.dat 的 Time / DayTime（会话七 · testharness/player）
 *
 * 只用于服务器已停、无 session.lock 持有的场合。写前备份原文件（.bak_<stamp>）。
 * 走 prismarine-nbt parse → writeUncompressed（不重排/不丢 tag），外层 gzip 回写。
 *
 * 用法：
 *   node _settime.js <level.dat> <totalTicks> [dayTimeTicks]
 *   totalTicks / dayTimeTicks 均为有符号 64 位十进制（可负）。
 *   省略 dayTimeTicks 时与 totalTicks 相同（1.12 测试窗惯例）。
 */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const nbt = require('prismarine-nbt');

const file = process.argv[2];
const totalArg = process.argv[3];
const dayArg = process.argv[4] === undefined ? totalArg : process.argv[4];
if (!file || totalArg === undefined) {
  console.error('usage: node _settime.js <level.dat> <totalTicks> [dayTimeTicks]');
  process.exit(2);
}

const total = BigInt(totalArg);
const dayT = BigInt(dayArg);

function pair(v) {
  return [Number(BigInt.asIntN(32, v >> 32n)), Number(BigInt.asIntN(32, v))];
}
function readPair(p) {
  return (BigInt(p[0]) << 32n) + BigInt.asUintN(32, BigInt(p[1]));
}

const raw = zlib.gunzipSync(fs.readFileSync(file));
nbt.parse(raw, (err, data) => {
  if (err) {
    console.error('parse failed:', err.message);
    process.exit(1);
  }
  const dv = data.value.Data.value;
  const before = { Time: readPair(dv.Time.value), DayTime: readPair(dv.DayTime.value) };
  dv.Time.value = pair(total);
  dv.DayTime.value = pair(dayT);

  const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
  let backup = `${file}.bak_${stamp}`;
  for (let i = 1; fs.existsSync(backup); i++) backup = `${file}.bak_${stamp}_${i}`;
  fs.copyFileSync(file, backup);

  const out = zlib.gzipSync(nbt.writeUncompressed(data, 'big'));
  fs.writeFileSync(file, out);
  console.log(JSON.stringify({
    file,
    backup,
    before: { Time: before.Time.toString(), DayTime: before.DayTime.toString() },
    after: { Time: total.toString(), DayTime: dayT.toString() },
    bytes: out.length,
  }));
});
