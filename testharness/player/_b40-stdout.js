const fs = require('fs');
const t = fs.readFileSync('build-logs/f11-b40-verify-r4-stdout.out', 'utf8');
for (const tag of ['stop', 'a1', 'a2', 'a3', 'a4', 'b1', 'props', 'done']) {
  const re = new RegExp('\\[' + tag + '\\][^\\n]*', 'g');
  const m = [...t.matchAll(re)].map((x) => x[0]);
  console.log('[' + tag + '] x' + m.length);
  for (const x of m) console.log('   ' + x.slice(0, 420));
}
