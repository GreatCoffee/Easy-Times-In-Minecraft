// Force the §5 byte/line claim to equal the on-disk size, verified after write.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'reports', 'b49-verify-verdict.md');

function sizeOf(text) {
  return { bytes: Buffer.byteLength(text, 'utf8'), lines: text.split('\n').length - 1 };
}

let text = fs.readFileSync(FILE, 'utf8');
for (let i = 0; i < 20; i++) {
  const s = sizeOf(text);
  const next = text.replace(/(b49-verify-verdict\.md`\s*)[\d,]+ B \/ \d+ 行/, `$1${s.bytes} B / ${s.lines} 行`);
  if (next === text) break;
  text = next;
}
fs.writeFileSync(FILE, text);
const after = fs.readFileSync(FILE, 'utf8');
const s = sizeOf(after);
const m = after.match(/b49-verify-verdict\.md`\s*([\d,]+) B \/ (\d+) 行/);
console.log('[claim] ' + (m ? m[1] + ' B / ' + m[2] + ' 行' : 'NOT FOUND'));
console.log('[actual] ' + s.bytes + ' B / ' + s.lines + ' 行');
console.log('[match] ' + (m && Number(m[1].replace(/,/g, '')) === s.bytes && Number(m[2]) === s.lines));
