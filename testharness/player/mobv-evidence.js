#!/usr/bin/env node
/**
 * mobv-evidence.js — 从当前 latest.log 抽判行证据（压缩版），落 build-logs/v9-evidence-rows.txt
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const LOG = path.join(ROOT, 'run', 'obfuscated', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'v9-evidence-rows.txt');

const t = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);
const groups = [
  ['BOOT', /\[TestLog\]|Done \(/],
  ['W2-ACCEPT', /\[SpawnLog\] accept ETIMEntity(Revenant|BoneLord)/],
  ['W2-CAP', /\[SpawnLog\] cap-class ETIMEntity(Revenant|BoneLord)/],
  ['W3-W4-EQUIP', /\[MobLog\] mob lord equip/],
  ['W4-SUMMON', /\[AILog\] bonelord summon/],
  ['W4-HOLD', /\[AILog\] mob despawn hold=summoned/],
  ['W4-PERSIST', /\[AILog\] bonelord persistence/],
  ['W5-TROOP', /\[MobLog\] mob troop equip/],
  ['W6-KILL-MAX', /\[AILog\] mob despawn kill counter=2147483647/],
  ['W7-FRENZY', /\[AILog\] frenzy set/],
  ['W8-DECAY', /\[MiningLog\] tool decay/],
  ['W9-STATS', /\[AILog\] mob stats/],
  ['W10-VILLAGER', /\[MobLog\] mob weapon .*villager=true/],
];

let out = `# mob 批验证窗证据行摘录（源：run/obfuscated/logs/latest.log）\n# 生成时间：${new Date().toISOString()}\n\n`;
for (const [name, re] of groups) {
  const hits = t.filter((l) => re.test(l));
  out += `## ${name} : ${hits.length} 行\n`;
  const show = name === 'W7-FRENZY' ? hits.slice(0, 3) : (name === 'W2-ACCEPT' || name === 'W9-STATS' ? hits.slice(0, 6) : hits.slice(0, 40));
  for (const l of show) out += l.trim() + '\n';
  if (hits.length > show.length) out += `... (${hits.length - show.length} more)\n`;
  out += '\n';
}
fs.writeFileSync(OUT, out, 'utf8');
console.log(`evidence -> ${OUT} (${Buffer.byteLength(out)} B)`);
