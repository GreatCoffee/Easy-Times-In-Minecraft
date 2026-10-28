/**
 * ad10s-evidence.js — 判决证据档生成器（会话七自研工装）
 *
 * 输入：build-logs/ad10s-report.json（逐相位原始判行）+ run/ad10s/logs/latest.log
 * 输出：build-logs/ad10s-evidence-rows.txt（判据行摘录，供回执 §二 引用）
 *
 * 用法：node ad10s-evidence.js [sessionLabel]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./ad10s-lib');

const label = process.argv[2] || 'A';
const rep = L.loadReport();
const out = path.join(L.ROOT, 'build-logs', 'ad10s-evidence-rows.txt');

const lines = [];
const put = (s) => lines.push(s === undefined || s === null ? '' : s);
const row = (tag, obj) => put(`[${tag}] ` + (obj && obj.line ? obj.line : '(no row)'));

put('==== AD-10+SH 验证窗 · 判据行摘录（session ' + label + '）====');
put('生成时刻: ' + new Date().toISOString());
put('判据档: ' + L.OUT);
put('服务端日志: ' + L.LOG);
put('');

put('---- 一、W1 载体 19 臂 ----');
if (rep.w1) {
  for (const a of rep.w1.arms) {
    put(`  ${a.item}  期望 block=${a.expect}  实测 block=${a.observed}  action=${a.action}  class=${a.cls}`);
    put(`     ${a.line}`);
    put(`     ${a.actionLine}`);
  }
  put(`  => ${rep.w1.trueCount} true / ${rep.w1.falseCount} false`);
}
put('');

put('---- 二、W2 起手与时长 ----');
if (rep.w2) {
  row('W2 start', rep.w2.start);
  row('W2 state', rep.w2.state);
  row('W2 action', rep.w2.action);
}
put('');

const section = (title, pairs) => {
  put('---- ' + title + ' ----');
  for (const [tag, obj] of pairs) {
    if (Array.isArray(obj)) { obj.forEach((o) => row(tag, o)); continue; }
    if (obj && obj.line) { row(tag, obj); continue; }
    if (obj && obj.dmg && obj.dmg.line) { row(tag + ' dmg', obj.dmg); continue; }
    put(`[${tag}] (none)`);
  }
  put('');
};

if (rep.w3) section('三、W3 减半生效（mob 源 8）', [['W3 gate', rep.w3.gate], ['W3 block', rep.w3.block], ['W3 dmg', rep.w3.dmg]]);
if (rep.w4) section('四、W4 终值差（16，未挡/格挡）', [['W4 未挡 dmg', rep.w4.freeDmg], ['W4 格挡 block', rep.w4.blockRow], ['W4 格挡 dmg', rep.w4.blockDmg]]);
if (rep.w5) section('五、W5 无甲 5', [['W5 block', rep.w5.block], ['W5 dmg', rep.w5.dmg], ['W5 prot', rep.w5.prot]]);
if (rep.w6) {
  put('---- 六、W6 剑磨损 25×raw ----');
  put(`  blockprobe dur(D0) = ${rep.w6.dur0 ? rep.w6.dur0.dur : 'n/a'}`);
  row('W6 wear', rep.w6.wear);
  put(`  Δdur = ${rep.w6.delta}`);
  put('');
}
if (rep.w6x) {
  put('---- 六b、W6x 率表补臂（A-AD10-1） ----');
  for (const [item, v] of Object.entries(rep.w6x.arms)) {
    put(`  ${item}  期望 decay=${v.expectDecay}`);
    row('W6x wear', v.wear);
  }
  put('');
}
if (rep.w7) section('七、W7 护甲磨损随减半（8）', [['W7 block', rep.w7.block], ['W7 prot', rep.w7.prot], ['W7 dmg', rep.w7.dmg]]);
if (rep.w8) {
  put('---- 八、W8 全免骰（5 ×' + rep.w8.hits + ' ×2 臂） ----');
  put(`  未挡: n=${rep.w8.free.n} 全免=${rep.w8.free.zeros} = ${(rep.w8.free.rate * 100).toFixed(1)}%  block行=${rep.w8.free.blockRows}`);
  rep.w8.free.sampleLines.forEach((l) => put('   ' + l));
  put(`  格挡: n=${rep.w8.blocked.n} 全免=${rep.w8.blocked.zeros} = ${(rep.w8.blocked.rate * 100).toFixed(1)}%  block行=${rep.w8.blocked.blockRows}`);
  rep.w8.blocked.sampleLines.forEach((l) => put('   ' + l));
  put('');
}
if (rep.w9) section('九、W9 方向无关（正后方 5）', [['W9 block', rep.w9.block], ['W9 dmg', rep.w9.dmg]]);
if (rep.w10) {
  put('---- 十、W10 源门 ----');
  put(`  fire: block行=${rep.w10.fire.blocks.length}`);
  rep.w10.fire.dmg.forEach((d) => row('W10 fire dmg', d));
  put(`  oow: block行=${rep.w10.oow.blocks.length}`);
  rep.w10.oow.dmg.forEach((d) => row('W10 oow dmg', d));
  put('');
}
if (rep.w11) section('十一、W11 盾面 b+c（16）', [['W11 gate', rep.w11.gate], ['W11 block', rep.w11.block], ['W11 wear', rep.w11.wear], ['W11 dmg', rep.w11.dmg]]);
if (rep.w12) {
  put('---- 十二、W12 盾磨损（16 ×2） ----');
  put(`  blockprobe dur = ${rep.w12.dur0 ? rep.w12.dur0.dur : 'n/a'}`);
  row('W12 首击 wear', rep.w12.first);
  row('W12 次击 wear', rep.w12.second);
  put('');
}
for (const k of ['w14a', 'w14b', 'w14c']) {
  if (!rep[k]) continue;
  put('---- ' + k + ' ----');
  row(k + ' cfg', rep[k].cfg);
  if (rep[k].starts) put(`  start 行数 = ${rep[k].starts.length}`);
  if (rep[k].blocks) put(`  block 行数 = ${rep[k].blocks.length}`);
  if (rep[k].wears) put(`  wear 行数 = ${rep[k].wears.length}`);
  if (rep[k].freeDmg) row(k + ' 未挡 dmg', rep[k].freeDmg);
  if (rep[k].block) row(k + ' block', rep[k].block);
  if (rep[k].wear) row(k + ' wear', rep[k].wear);
  if (rep[k].dmg) row(k + ' dmg', rep[k].dmg);
  if (rep[k].blockDmg) row(k + ' 格挡 dmg', rep[k].blockDmg);
  put('');
}

put('---- 附录：全量 [BlockLog] 行（latest.log） ----');
const all = L.logAll();
const blockRows = all.split('\n').filter((l) => /\[BlockLog\]/.test(l));
put(`  [BlockLog] 行数 = ${blockRows.length}`);
blockRows.forEach((l) => put('  ' + l.trim()));

fs.writeFileSync(out, lines.join('\n') + '\n', 'utf8');
console.log('evidence: ' + out + ' (' + fs.statSync(out).size + ' B, ' + lines.length + ' lines)');
