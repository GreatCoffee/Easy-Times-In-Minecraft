const fs = require('fs');
const t = fs.readFileSync('build-logs/w-b41v-b1.out', 'utf8').split(/\r?\n/);
const strip = (s) => s.replace(/^\d+: \[[^\]]*\] \[[^\]]*\] \[[^\]]*\]: /, '');
const pick = (re) => t.map((l, i) => (i + 1) + ': ' + l).filter((l) => re.test(l));
const show = (name, re, n) => {
  const h = pick(re);
  console.log('## ' + name + ' count=' + h.length);
  for (const x of h.slice(0, n || 6)) console.log('  ' + x.split(':')[0] + ': ' + strip(x).slice(0, 220));
};
show('DamageLog target=Cow', /DamageLog.*Cow|target=Cow/i, 8);
show('any dmg rows', /\[DamageLog\] dmg/, 6);
show('stick/break rows', /stick|swordBreak|break item|ItemBreak/i, 10);
show('swing/gate rows', /gate|swing/i, 6);
const m = t.filter((l) => /Killed Cow/.test(l));
console.log('Killed Cow lines=' + m.length);
// damage summary count
const dmg = t.filter((l) => /\[DamageLog\] dmg/.test(l));
let cowDmg = 0;
for (const l of dmg) if (/Cow/i.test(l)) cowDmg++;
console.log('dmg rows total=' + dmg.length + ' cow=' + cowDmg);
