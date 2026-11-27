const fs = require('fs');
const path = require('path');
const BL = path.join(__dirname, '..', 'build-logs');
const read = (f) => (fs.existsSync(path.join(BL, f)) ? fs.readFileSync(path.join(BL, f), 'utf8').split(/\r?\n/) : null);
const b1 = read('w-b41v-b1.out');
const b2 = read('w-b41v-b2.out');
const st = read('f11-b41-verify-stdout.out');
const strip = (s) => s.replace(/^\d+: \[[^\]]*\] \[[^\]]*\] \[[^\]]*\]: /, '');
function dump(name, lines, re, max) {
  console.log('## ' + name);
  if (!lines) { console.log('  (log missing)'); return; }
  const hits = [];
  for (let i = 0; i < lines.length; i++) if (re.test(lines[i])) hits.push((i + 1) + ': ' + lines[i]);
  console.log('  count=' + hits.length);
  for (const h of hits.slice(0, max || 8)) console.log('  ' + h.split(':')[0] + ': ' + strip(h).slice(0, 220));
}
dump('W1 sword gate (b1)', b1, /\[(SwordLog|MeleeLog|AILog|ItemLog)\].*(sword|gate)/i);
dump('W1/W2 any gate-ish (b1)', b1, /gate|swordBreak|stickBreak|break/i, 14);
dump('W2 stick break (b1)', b1, /stickBreak|stick break|stickBreakRows/i, 14);
dump('b1 hairline rows (b2 gate/stick)', b2, /gate|swordBreak|stickBreak/i, 10);
dump('PIN', st, /^\[PIN\]/);
for (const tag of ['stop', 'a1', 'b1', 'props', 'done']) {
  const re = new RegExp('\\[' + tag + '\\][^\\n]*', 'g');
  const m = [...(st || []).join('\n').matchAll(re)].map((x) => x[0]);
  console.log('[' + tag + '] x' + m.length);
  for (const x of m) console.log('   ' + x.slice(0, 400));
}
