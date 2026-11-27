#!/usr/bin/env node
/**
 * uw-evidence.js — underworld 批判行摘录器（按 /say UW|<win>|begin|end 切片）。
 *
 * 源：run/uw/logs/latest.log（末轮）＋ build-logs/uw-crash1-latest.log（首崩轮）
 * 产物：build-logs/uw-evidence-rows.txt
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const SRC = [
  ['session', path.join(ROOT, 'run', 'uw', 'logs', 'latest.log')],
  ['crash1', path.join(ROOT, 'build-logs', 'uw-crash1-latest.log')],
];
const OUT = path.join(ROOT, 'build-logs', 'uw-evidence-rows.txt');

const out = [];
const put = (s) => out.push(s);
const ts = (l) => (l.match(/^\[(\d{2}:\d{2}:\d{2})/) || [])[1] || '?';

const GROUPS = [
  ['W1 enter', /\[DimLog\] enter player=/],
  ['W1 landing', /\[DimLog\] landing player=/],
  ['W1 visit', /\[DimLog\] visit set /],
  ['W1b reject', /\[DimLog\] enter-reject /],
  ['W2 probe', /\[DimLog\] (lookup|provider dim=|biome probe|gen-probe)/],
  ['W3 pool load', /\[SpawnLog\] pool underworld size=/],
  ['W3 pool gen', /\[SpawnLog\] pool dim=-2 /],
  ['W4 substitute', /\[SpawnLog\] substitute Longdead->Guardian/],
  ['W4 modifier', /\[SpawnLog\] modifier dim=-2 /],
  ['W4 depth-bypass', /\[SpawnLog\] depth-bypass dim=-2 /],
  ['W5 longdead attr', /\[MobLog\] longdead attr /],
  ['W5 longdead equip', /\[MobLog\] longdead equip /],
  ['W5 ancient attr', /\[MobLog\] ancient attr /],
  ['W5 ancient equip', /\[MobLog\] ancient equip /],
  ['W5 guardian stow', /\[MobLog\] guardian stow /],
  ['W6 troop', /\[MobLog\] bonelord troop class=/],
  ['W7 arrow', /\[MobLog\] longdead arrow intended=/],
  ['W8 drop', /\[MobLog\] longdead drop /],
  ['W9 D-02', /\[TestLog\] dungeon pool entries introspected/],
  ['W10 time gate', /\[DimLog\] time (frozen|resumed)/],
  ['CRASH', /ConcurrentModificationException|placeMycelium|Description: Exception ticking world/],
];

put('# underworld 批判行摘录（按 /say UW|win|begin|end 切片）');
put('');

for (const [tag, file] of SRC) {
  let text = '';
  try { text = fs.readFileSync(file, 'utf8'); } catch (e) { put(`# ${tag}: MISSING ${file}`); continue; }
  const lines = text.split('\n');
  put(`## 源 ${tag}：${path.basename(file)}（${Buffer.byteLength(text, 'utf8')} B｜${lines.length} 行）`);

  // 判窗切片
  const wins = [];
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/UW\|([A-Za-z0-9_-]+)\|(begin|end)/);
    if (!m) continue;
    if (m[2] === 'begin') {
      let end = -1;
      for (let j = i + 1; j < lines.length; j++) {
        const m2 = lines[j].match(/UW\|([A-Za-z0-9_-]+)\|end/);
        if (m2 && m2[1] === m[1]) { end = j; break; }
      }
      wins.push({ name: m[1], begin: i, end });
    }
  }
  put(`### 判窗（${wins.length} 个）`);
  for (const w of wins) {
    const body = lines.slice(w.begin + 1, w.end < 0 ? w.begin + 1 : w.end);
    put(`- ${w.name}  [${ts(lines[w.begin])} → ${ts(lines[w.end] || lines[w.begin])}]  行=${body.length}`);
    for (const [g, re] of GROUPS) {
      const hit = body.filter((l) => re.test(l));
      if (hit.length) put(`    ${g}=${hit.length}  例：${hit[0].trim().slice(0, 180)}`);
    }
  }
  put('');

  // 全档分组计数
  put(`### 全档分组计数（${tag}）`);
  for (const [g, re] of GROUPS) {
    const hit = lines.filter((l) => re.test(l));
    put(`${g} = ${hit.length}`);
    hit.slice(0, 4).forEach((l) => put('  ' + l.trim().slice(0, 200)));
    if (hit.length > 4) put(`  ... (${hit.length - 4} more)`);
  }
  put('');
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out.join('\n') + '\n', 'utf8');
console.log(out.filter((l) => /^(##|###|- |[A-Z0-9].* = |    )/.test(l)).join('\n'));
console.log('-> ' + OUT + ' (' + fs.statSync(OUT).size + ' B)');
