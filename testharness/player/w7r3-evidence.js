#!/usr/bin/env node
/**
 * w7r3-evidence.js — mob 批三轮重验（仅 W7-R · C-1 v3）判行摘录器。
 *
 * 判窗边界不用 driver 侧时间，而用服务端日志里的 `/say W7R3|<win>|begin|end`
 * 标记行原地切片（判据可独立复核，不依赖 driver 输出）。
 * 另出「批次表」：同一秒 + 同一 target 的 frenzy 行视为一批（1 批 = 1 次状态变化），
 * 用于判「每骷髅恰 1 行」。
 *
 * 源：run/w5r/logs/latest.log  产物：build-logs/w7r3-evidence-rows.txt
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'w5r', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'w7r3-evidence-rows.txt');

const text = fs.readFileSync(LOG, 'utf8');
const lines = text.split('\n');
const out = [];
const put = (s) => out.push(s);
const tsOf = (l) => (l.match(/^\[(\d{2}:\d{2}:\d{2})/) || [])[1] || '?';
const tgtOf = (l) => (l.match(/target=(\S+)/) || [])[1] || '?';
const isFrenzy = (l) => /\[AILog\] frenzy set /.test(l);
const isMark = (l) => /W7R3\|([a-z0-9-]+)\|(begin|end)/.test(l);

put('# mob 批三轮重验（W7-R · C-1 v3）判行摘录');
put('# 源：run/w5r/logs/latest.log（' + Buffer.byteLength(text, 'utf8') + ' B｜' + lines.length + ' 行）');
put('# 生成：w7r3-evidence.js（只读服务端日志，未改任何行；判窗按 /say W7R3|win|begin|end 切片）');
put('');

/* ---------------------------------------------------- 判窗切片计数 */
const wins = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/W7R3\|([a-z0-9-]+)\|(begin|end)/);
  if (!m) continue;
  if (m[2] === 'begin') {
    let end = -1;
    for (let j = i + 1; j < lines.length; j++) {
      const m2 = lines[j].match(/W7R3\|([a-z0-9-]+)\|end/);
      if (m2 && m2[1] === m[1]) { end = j; break; }
    }
    wins.push({ name: m[1], begin: i, end });
  }
}
put('## 判窗（服务端日志行区间，begin/end 标记行不计入）');
for (const w of wins) {
  const body = lines.slice(w.begin + 1, w.end < 0 ? w.begin + 1 : w.end);
  const fr = body.filter(isFrenzy);
  const tally = {};
  for (const l of fr) { const k = tgtOf(l); tally[k] = (tally[k] || 0) + 1; }
  const secs = {};
  for (const l of fr) { const t = tsOf(l); secs[t] = (secs[t] || 0) + 1; }
  const t0 = tsOf(lines[w.begin]), t1 = tsOf(lines[w.end] >= 0 ? lines[w.end] : lines[w.end]);
  put(`### ${w.name}  [${t0} → ${t1}]  rows=${fr.length}  targets=${JSON.stringify(tally)}`);
  if (fr.length) {
    put('  per-second: ' + Object.entries(secs).sort().map(([s, n]) => `${s}=${n}`).join(' '));
    fr.slice(0, 8).forEach((l) => put('  ' + l.trim()));
    if (fr.length > 8) put(`  ... (${fr.length - 8} more)`);
  }
  put('');
}

/* ---------------------------------------------------- 全窗批次表 */
put('## 全窗 frenzy 批次表（同秒同 target = 1 批 = 1 次状态变化）');
const batches = [];
for (const l of lines.filter(isFrenzy)) {
  const key = tsOf(l) + '|' + tgtOf(l);
  const last = batches[batches.length - 1];
  if (last && last.key === key) { last.n++; continue; }
  batches.push({ key, ts: tsOf(l), target: tgtOf(l), n: 1, line: l.trim() });
}
for (const b of batches) put(`  ${b.ts}  target=${b.target}  rows=${b.n}`);
put(`  批次合计 ${batches.length}｜行合计 ${batches.reduce((a, b) => a + b.n, 0)}`);
put('');

/* ---------------------------------------------------- 其它通道计数 */
const groups = [
  ['BOOT', /Starting minecraft server version|Starting Minecraft server on|Done \(/],
  ['MARK', /W7R3\|/],
  ['PROBE3_SKEL', /PROBE3_SKEL/],
  ['PROBE3_LORD', /PROBE3_LORD/],
  ['PERSIST', /\[AILog\] bonelord persistence/],
  ['STOP', /Stopping server|Saving worlds|Unloading dimension 0/],
];
for (const [name, re] of groups) {
  const hits = lines.filter((l) => re.test(l));
  put(`## ${name} = ${hits.length}`);
  hits.slice(0, 3).forEach((l) => put('  ' + l.trim().slice(0, 200)));
  if (hits.length > 3) put(`  ... (${hits.length - 3} more)`);
  put('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.log(out.filter((l) => /^(##|###|  \d{2}:)/.test(l)).join('\n'));
console.log('-> ' + OUT + ' (' + fs.statSync(OUT).size + ' B)');
