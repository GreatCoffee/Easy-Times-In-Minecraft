#!/usr/bin/env node
/**
 * w7r2-evidence.js — mob 批二轮重验（W7-R only）判行摘录器。
 * 读 run/w5r/logs/latest.log（本轮专服会话），按判点分组计数 + 抽样原句，
 * 落 build-logs/w7r2-evidence-rows.txt。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'w5r', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'w7r2-evidence-rows.txt');

const text = fs.readFileSync(LOG, 'utf8');
const lines = text.split('\n');
const out = [];
const put = (s) => out.push(s);

put('# mob 批二轮重验（W7-R）判行摘录');
put('# 源：run/w5r/logs/latest.log（' + Buffer.byteLength(text, 'utf8') + ' B）');
put('# 生成：w7r2-evidence.js（只摘服务端日志，未改任何行）');
put('');

const groups = [
  ['BOOT', /Starting minecraft server version|Starting Minecraft server on|Done \(/],
  ['FRENZY', /\[AILog\] frenzy set /],
  ['FRENZY_NONE', /\[AILog\] frenzy set entity=Skeleton target=none/],
  ['FRENZY_H01', /\[AILog\] frenzy set entity=Skeleton target=ETIM_Harn01/],
  ['FRENZY_H03', /\[AILog\] frenzy set entity=Skeleton target=ETIM_Harn03/],
  ['PERSIST', /\[AILog\] bonelord persistence/],
  ['STOP', /Stopping server|Saving worlds|Unloading dimension 0/],
];
for (const [name, re] of groups) {
  const hits = lines.filter((l) => re.test(l));
  put(`## ${name} = ${hits.length}`);
  hits.slice(0, 4).forEach((l) => put('  ' + l.trim()));
  if (hits.length > 4) put(`  ... (${hits.length - 4} more)`);
  put('');
}

const hist = new Map();
for (const l of lines.filter((l) => /\[AILog\] frenzy set /.test(l))) {
  const ts = (l.match(/^\[(\d{2}:\d{2}:\d{2})/) || [])[1];
  if (ts) hist.set(ts, (hist.get(ts) || 0) + 1);
}
put('## FRENZY_PER_SEC');
put([...hist.entries()].sort().map(([s, n]) => `${s}=${n}`).join(' '));
put('');
put('## SUMMARY totalFrenzy=' + hist.size + ' seconds-with-rows=' + [...hist.values()].reduce((a, b) => a + b, 0));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.log(out.filter((l) => /^##/.test(l)).join('\n'));
console.log('-> ' + OUT + ' (' + fs.statSync(OUT).size + ' B)');
