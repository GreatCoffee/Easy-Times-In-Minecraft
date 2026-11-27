#!/usr/bin/env node
/**
 * w5r-evidence.js — mob 批重验窗（W5-R/W4-R/W7-R）判行摘录器。
 *
 * 读 run/w5r/logs/latest.log（本轮专服会话档），按判点分组计数 + 抽样原句，
 * 落 build-logs/w5r-evidence-rows.txt（报告引用面）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'w5r', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'w5r-evidence-rows.txt');

const text = fs.readFileSync(LOG, 'utf8');
const lines = text.split('\n');

const GROUPS = [
  ['BOOT', /Starting minecraft server version|Starting Minecraft server on|Done \(/],
  ['SUMMON', /\[AILog\] bonelord summon /],
  ['GATE_T', /\[AILog\] troop type2 gate pathOk=true/],
  ['GATE_F', /\[AILog\] troop type2 gate pathOk=false/],
  ['EQUIP', /\[MobLog\] mob troop equip /],
  ['EQUIP_T2', /\[MobLog\] mob troop equip .*type=2/],
  ['HOLD', /hold=summoned reset=-9600/],
  ['PERSIST', /\[AILog\] bonelord persistence/],
  ['FRENZY', /\[AILog\] frenzy set /],
  ['STOP', /Stopping server|Saving worlds|Unloading dimension 0/],
];

const out = [];
const put = (s) => { out.push(s); };
put('# mob 批重验窗（W5-R / W4-R / W7-R）判行摘录');
put('# 源：run/w5r/logs/latest.log（' + Buffer.byteLength(text, 'utf8') + ' B）');
put('# 生成：w5r-evidence.js（只摘服务端日志，未改任何行）');
put('');

const counts = {};
for (const [name, re] of GROUPS) {
  const hits = lines.filter((l) => re.test(l));
  counts[name] = hits.length;
  put(`## ${name} = ${hits.length}`);
  hits.slice(0, 6).forEach((l) => put('  ' + l.trim()));
  if (hits.length > 6) put(`  ... (${hits.length - 6} more)`);
  put('');
}

// type 分布
const types = {};
for (const l of lines.filter((l) => /\[MobLog\] mob troop equip /.test(l))) {
  const m = l.match(/type=(\d)/);
  if (m) types[m[1]] = (types[m[1]] || 0) + 1;
}
put('## TYPE_DIST ' + JSON.stringify(types));
// num 序
const nums = lines.filter((l) => /\[AILog\] bonelord summon /.test(l))
  .map((l) => parseInt((l.match(/num=(\d+)/) || [])[1], 10)).filter((x) => !isNaN(x));
put('## NUM_SEQ n=' + nums.length + ' max=' + Math.max(0, ...nums) + ' ' + JSON.stringify(nums));
put('');
// frenzy 每秒直方
const hist = new Map();
for (const l of lines.filter((l) => /\[AILog\] frenzy set /.test(l))) {
  const ts = (l.match(/^\[(\d{2}:\d{2}:\d{2})/) || [])[1];
  if (ts) hist.set(ts, (hist.get(ts) || 0) + 1);
}
put('## FRENZY_PER_SEC (秒=行数，仅列有行秒)');
put([...hist.entries()].sort().map(([s, n]) => `${s}=${n}`).join(' '));
put('');
put('## SUMMARY ' + JSON.stringify(counts));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.log(out.join('\n'));
console.log('\n-> ' + OUT + ' (' + fs.statSync(OUT).size + ' B)');
