const fs = require('fs');
const lines = fs.readFileSync('build-logs/w-b41v-b2.out', 'utf8').split(/\r?\n/);
const strip = (s) => s.replace(/^\d+: \[[^\]]*\] \[[^\]]*\] \[[^\]]*\]: /, '');
const idx = lines.findIndex((l) => /slot\.weapon\.mainhand minecraft:stone_sword/.test(l));
console.log('sword give at', idx + 1);
for (const l of lines.slice(Math.max(0, idx - 12), idx + 60).map((l, i) => (idx - 12 + i + 1) + ': ' + l)) {
  if (/harness|Block placed|found the block|dirt|air|dig|Dig|break|Sword|sword/i.test(l)) console.log('  ' + strip(l).slice(0, 200));
}
