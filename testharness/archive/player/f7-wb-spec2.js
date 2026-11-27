'use strict';
const fs = require('fs');
const crypto = require('crypto');
const p = process.argv[2];
const fmt = (n) => n.toLocaleString('en-US');

function stats(text) {
  const buf = Buffer.from(text, 'utf8');
  return {
    bytes: buf.length, lines: text.split('\n').length,
    cr: (text.match(/\r/g) || []).length, fffd: (text.match(/\uFFFD/g) || []).length,
    check: (text.match(/✓/g) || []).length, cross: (text.match(/✗/g) || []).length,
    firstByte: buf.length ? '0x' + buf[0].toString(16).toUpperCase().padStart(2, '0') : 'n/a',
  };
}
function shas(text) {
  const z = text.replace(/[0-9A-Fa-f]{64}/g, '0'.repeat(64));
  const jia = crypto.createHash('sha256').update(Buffer.from(z, 'utf8')).digest('hex').toUpperCase();
  const yi = crypto.createHash('sha256').update(Buffer.from(z.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n'), 'utf8')).digest('hex').toUpperCase();
  const chain = z.split('\n').map((l) => crypto.createHash('sha256').update(Buffer.from(l, 'utf8')).digest('hex')).join('\n');
  return { jia, yi, bing: crypto.createHash('sha256').update(Buffer.from(chain, 'utf8')).digest('hex').toUpperCase() };
}

let text = fs.readFileSync(p, 'utf8');
for (let i = 0; i < 12; i++) {
  const st = stats(text);
  const sh = shas(text);
  const spec = '> **报告字节规格**：`' + fmt(st.bytes) + ' B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ ' + st.check + ' / ✗ ' + st.cross + '｜' + st.lines + ' 行`';
  const byteLine = '> 正本：`' + p.replace(/\\/g, '/') + '`｜byte 五项：`' + fmt(st.bytes) + ' B｜首字节 ' + st.firstByte + '｜CR ' + st.cr + '｜U+FFFD ' + st.fffd + '｜LF ' + (st.lines - 1) + '（split ' + st.lines + '）`';
  const shaBlock = [
    '> SHA-256 甲（全档零位）`' + sh.jia + '`',
    '> SHA-256 乙（LF 归零零位）`' + sh.yi + '`',
    '> SHA-256 丙（行链零位）`' + sh.bing + '`',
  ].join('\n');
  const before = text;
  text = text.replace(/^> \*\*报告字节规格\*\*.*$/m, spec);
  text = text.replace(/^> (文件|正本)：.*$/m, byteLine);
  text = text.replace(/^> SHA-256 甲（全档零位）`.*`\n> SHA-256 乙（LF 归零零位）`.*`\n> SHA-256 丙（行链零位）`.*`$/m, shaBlock);
  if (text === before) {
    fs.writeFileSync(p, text, 'utf8');
    console.log(JSON.stringify({ ...stats(text), ...sh }, null, 1));
    console.log('STABLE');
    process.exit(0);
  }
}
fs.writeFileSync(p, text, 'utf8');
console.log('NOT STABLE');
process.exit(1);
