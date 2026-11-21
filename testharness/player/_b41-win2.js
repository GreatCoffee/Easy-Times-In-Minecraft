const fs = require('fs');
const lines = fs.readFileSync('build-logs/w-b41v-b1.out', 'utf8').split(/\r?\n/);
// find W2 window: from the stick replaceitem after cow summon to the next 'Killed Cow'
let start = -1, end = lines.length;
for (let i = 0; i < lines.length; i++) if (/replaceitem entity ETIM_F7 slot\.weapon\.mainhand minecraft:stick/.test(lines[i])) { start = i; break; }
for (let i = start; i < lines.length; i++) if (/Killed Cow/.test(lines[i])) { end = i; break; }
console.log('window lines', start + 1, '..', end + 1, 'len', end - start);
const win = lines.slice(start, end);
const stat = {};
const bump = (k) => (stat[k] = (stat[k] || 0) + 1);
for (const l of win) {
  if (/\[DamageLog\] dmg/.test(l)) bump('dmg:' + (/src=(\w+)/.exec(l) || [])[1]);
  if (/UseEntity|use_entity|attack/i.test(l)) bump('useentity');
  if (/\[MeleeLog\]/.test(l)) bump('meleelog');
  if (/stick|Stick/.test(l)) bump('stick');
}
console.log(stat);
const dmg = win.filter((l) => /\[DamageLog\] dmg/.test(l));
console.log('dmg rows in window=' + dmg.length);
for (const l of dmg.slice(0, 8)) console.log('  ' + l.slice(0, 200));
const first100 = win.filter((l) => /\[(MeleeLog|AILog|ItemLog|SwordLog)\]/.test(l)).slice(0, 6);
for (const l of first100) console.log('  x ' + l.slice(0, 200));
