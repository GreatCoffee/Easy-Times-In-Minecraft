'use strict';
const fs = require('fs');
const crypto = require('crypto');
const p = process.argv[2] || 'testharness/reports/farmlandmoist-FM1-verdict.md';
const tmpl = fs.readFileSync(p, 'utf8');
if (tmpl.indexOf('@@SPEC@@') < 0) { console.error('already rendered'); process.exit(1); }
const fmt = (n) => n.toLocaleString('en-US');
const render = (bytes, lines) => tmpl
  .replace('@@SPEC@@', fmt(bytes) + ' B｜首字节 0x23｜CR 0｜U+FFFD 0｜' + lines + ' 行')
  .replace('@@BYTES@@', 'size ' + fmt(bytes) + ' B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF ' + (lines - 1) + '（split 行数 ' + lines + '）');

let bytes = 0, lines = 0;
for (let i = 0; i < 10; i++) {
  const t = render(bytes, lines);
  const b = Buffer.byteLength(t, 'utf8'), l = t.split('\n').length;
  if (b === bytes && l === lines) break;
  bytes = b; lines = l;
}
let out = render(bytes, lines);

const zeroed = out.replace(/[0-9A-Fa-f]{64}/g, '0'.repeat(64));
const jia = crypto.createHash('sha256').update(Buffer.from(zeroed, 'utf8')).digest('hex').toUpperCase();
const yi = crypto.createHash('sha256').update(Buffer.from(zeroed.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'), 'utf8')).digest('hex').toUpperCase();
const bingChain = zeroed.split('\n').map((l) => crypto.createHash('sha256').update(Buffer.from(l, 'utf8')).digest('hex')).join('\n');
const bing = crypto.createHash('sha256').update(Buffer.from(bingChain, 'utf8')).digest('hex').toUpperCase();

const Z = '0'.repeat(64);
out = out
  .replace('甲（全档零位）`' + Z + '`', '甲（全档零位）`' + jia + '`')
  .replace('乙（LF 归零零位）`' + Z + '`', '乙（LF 归零零位）`' + yi + '`')
  .replace('丙（行链零位）`' + Z + '`', '丙（行链零位）`' + bing + '`');
fs.writeFileSync(p, out, 'utf8');
console.log(JSON.stringify({ bytes: Buffer.byteLength(out, 'utf8'), lines: out.split('\n').length, jia, yi, bing }));
