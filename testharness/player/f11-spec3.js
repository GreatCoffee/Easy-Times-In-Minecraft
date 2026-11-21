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
function rebuild(text) {
  const st = stats(text);
  const sh = shas(text);
  const spec = `${fmt(st.bytes)} B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ ${st.check} / ✗ ${st.cross}｜${st.lines} 行`;
  const bytesLine = `${fmt(st.bytes)} B｜首字节 ${st.firstByte}｜CR ${st.cr}｜U+FFFD ${st.fffd}｜LF ${st.lines - 1}（split ${st.lines}）`;
  const next = text
    .replace(/^> \*\*报告字节规格\*\*：`[^`]*`$/m, '> **报告字节规格**：`' + spec + '`')
    .replace(/^> 正本：`([^`]+)`｜byte 五项：`[^`]*`$/m, '> 正本：`$1`｜byte 五项：`' + bytesLine + '`')
    .replace(/^> SHA-256 甲（全档零位）`[^`]*`$/m, '> SHA-256 甲（全档零位）`' + sh.jia + '`')
    .replace(/^> SHA-256 乙（LF 归零零位）`[^`]*`$/m, '> SHA-256 乙（LF 归零零位）`' + sh.yi + '`')
    .replace(/^> SHA-256 丙（行链零位）`[^`]*`$/m, '> SHA-256 丙（行链零位）`' + sh.bing + '`');
  return { next, st, sh };
}

let text = fs.readFileSync(p, 'utf8');
let prev = null;
for (let i = 0; i < 30; i++) {
  const r = rebuild(text);
  if (r.next === text) {
    console.log('STABLE at iteration', i, JSON.stringify({ ...r.st, ...r.sh }, null, 1));
    prev = r;
    break;
  }
  text = r.next;
  fs.writeFileSync(p, text, 'utf8');
  prev = r;
}
// final verification against the file on disk
const fin = fs.readFileSync(p, 'utf8');
const st = stats(fin);
const sh = shas(fin);
const specOk = fin.includes('`' + fmt(st.bytes) + ' B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ ' + st.check + ' / ✗ ' + st.cross + '｜' + st.lines + ' 行`');
const bytesOk = fin.includes('`' + fmt(st.bytes) + ' B｜首字节 ' + st.firstByte + '｜CR ' + st.cr + '｜U+FFFD ' + st.fffd + '｜LF ' + (st.lines - 1) + '（split ' + st.lines + '）`');
const shaOk = fin.includes(sh.jia) && fin.includes(sh.yi) && fin.includes(sh.bing);
console.log('VERIFY', JSON.stringify({ ...st, ...sh, specOk, bytesOk, shaOk }));
