// spec-mobv2.js — 稳健固定点更新（不依赖占位符）
'use strict';
const fs = require('fs');
const p = 'testharness/reports/mob-revenant-bonelord-verdict.md';
let t = fs.readFileSync(p, 'utf8');
if (t.charCodeAt(0) === 0xFEFF) { t = t.slice(1); }
const lineRe = /^> \*\*报告字节规格\*\*：.*$/m;
if (!lineRe.test(t)) { console.error('spec line not found'); process.exit(1); }
const fmt = (txt) => {
  const bytes = Buffer.byteLength(txt, 'utf8');
  const lines = txt.split('\n').length;
  const chk = (txt.match(/\u2713/g) || []).length;
  const cro = (txt.match(/\u2717/g) || []).length;
  return `${bytes.toLocaleString('en-US')} B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ ${chk} / ✗ ${cro}｜${lines} 行`;
};
let spec = fmt(t.replace(lineRe, ''));
for (let i = 0; i < 60; i++) {
  const tmp = t.replace(lineRe, '> **报告字节规格**：`' + spec + '`');
  const next = fmt(tmp);
  if (next === spec) break;
  spec = next;
}
t = t.replace(lineRe, '> **报告字节规格**：`' + spec + '`');
fs.writeFileSync(p, t, 'utf8');
const left = [...new Set([...t.matchAll(/<<[A-Z0-9_]+>>/g)].map((m) => m[0]))];
console.log('spec=' + spec);
console.log(`leftover=${left.join(',') || 'none'} bytes=${Buffer.byteLength(t)} lines=${t.split('\n').length} crlf=${(t.match(/\r/g) || []).length} fffd=${(t.match(/\uFFFD/g) || []).length} bom=${t.charCodeAt(0).toString(16)}`);
