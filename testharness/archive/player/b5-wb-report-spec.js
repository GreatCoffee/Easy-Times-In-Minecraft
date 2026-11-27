'use strict';
/* b5-wb-report-spec.js — 填/核 butchering-WB-verdict.md 的自指字节规格 + 三口径 */
const fs = require('fs');
const crypto = require('crypto');
const p = process.argv[2] || 'testharness/reports/butchering-WB-verdict.md';

function stats(text) {
  const buf = Buffer.from(text, 'utf8');
  const lines = text.split('\n');
  const cr = (text.match(/\r/g) || []).length;
  const fffd = (text.match(/\uFFFD/g) || []).length;
  const check = (text.match(/✓/g) || []).length;
  const cross = (text.match(/✗/g) || []).length;
  return { bytes: buf.length, lines: lines.length, cr, fffd, check, cross, firstByte: buf.length ? '0x' + buf[0].toString(16).toUpperCase().padStart(2, '0') : 'n/a' };
}
const zeros = (s) => s.replace(/[0-9A-Fa-f]{64}/g, '0'.repeat(64));
function shas(text) {
  const z = zeros(text);
  const buf = Buffer.from(z, 'utf8');
  const jia = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
  const yi = crypto.createHash('sha256').update(Buffer.from(z.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'), 'utf8')).digest('hex').toUpperCase();
  const chain = z.split('\n').map((l) => crypto.createHash('sha256').update(Buffer.from(l, 'utf8')).digest('hex')).join('\n');
  const bing = crypto.createHash('sha256').update(Buffer.from(chain, 'utf8')).digest('hex').toUpperCase();
  return { jia, yi, bing };
}
const nfmt = (n) => n.toLocaleString('en-US');

let text = fs.readFileSync(p, 'utf8');
/* 先把占位替换成最终形状的哑值 */
if (text.includes('@@SPEC@@')) {
  text = text.replace('@@SPEC@@', '0,000 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 0 / ✗ 0｜0 行');
}
if (text.includes('@@BYTES@@')) {
  text = text.replace('@@BYTES@@', 'size 0 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 0（split 行数 0）');
}
if (text.includes('@@SHAS@@')) {
  text = text.replace('@@SHAS@@', [
    '> SHA-256 甲（全档零位）`' + '0'.repeat(64) + '`',
    '> SHA-256 乙（LF 归零零位）`' + '0'.repeat(64) + '`',
    '> SHA-256 丙（行链零位）`' + '0'.repeat(64) + '`',
  ].join('\n'));
}
if (/@@/.test(text)) throw new Error('placeholders remain');

for (let i = 0; i < 12; i++) {
  const st = stats(text);
  const sh = shas(text);
  const specLine = '> **报告字节规格**：`' + nfmt(st.bytes) + ' B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ ' + st.check + ' / ✗ ' + st.cross + '｜' + st.lines + ' 行`';
  const byteLine = '> 文件：`' + p.replace(/\\/g, '/') + '`｜字节五项：`size ' + nfmt(st.bytes) + ' B｜首字节 ' + st.firstByte + '｜CR ' + st.cr + '｜U+FFFD ' + st.fffd + '｜LF ' + (st.lines - 1) + '（split 行数 ' + st.lines + '）`';
  const shaBlock = [
    '> SHA-256 甲（全档零位）`' + sh.jia + '`',
    '> SHA-256 乙（LF 归零零位）`' + sh.yi + '`',
    '> SHA-256 丙（行链零位）`' + sh.bing + '`',
  ].join('\n');
  const before = text;
  text = text.replace(/^> \*\*报告字节规格\*\*：.*$/m, specLine);
  text = text.replace(/^> 文件：`.*$/m, byteLine);
  text = text.replace(/^> SHA-256 甲（全档零位）`.*`\n> SHA-256 乙（LF 归零零位）`.*`\n> SHA-256 丙（行链零位）`.*`$/m, shaBlock);
  if (text === before) {
    fs.writeFileSync(p, text, 'utf8');
    const st2 = stats(text);
    console.log(JSON.stringify({ ...st2, ...sh }, null, 1));
    console.log('STABLE');
    process.exit(0);
  }
}
fs.writeFileSync(p, text, 'utf8');
console.log('NOT STABLE');
process.exit(1);
