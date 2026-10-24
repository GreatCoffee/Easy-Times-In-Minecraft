const fs = require('fs');
const p = 'sp3-run.js';
let t = fs.readFileSync(p, 'utf8');

// 1) run tag
if (!t.includes('const TAG =')) {
  t = t.replace(
    "const NAME = process.env.SP3_BOT || 'ETIM_Harn04';",
    "const NAME = process.env.SP3_BOT || 'ETIM_Harn04';\nconst TAG = process.env.SP3_TAG || String(Date.now() % 1000000);");
}

// 2) phase names/selectors -> templated with TAG
const reps = [
  ["const SEL = '@e[name=SP3Phase,r=9]';", "const SEL = `@e[name=SP3Phase_${TAG},r=9]`;"],
  ["'/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:\"SP3Phase\"}'",
   "`/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:\"SP3Phase_${TAG}\"}`"],
  ["'/tp @e[name=SP3Phase,r=30] 81.5 135 100.5'", "`/tp @e[name=SP3Phase_${TAG},r=30] 81.5 135 100.5`"],
  ["'/summon etim:phase_spider 80 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:\"SP3PhaseFire\"}'",
   "`/summon etim:phase_spider 80 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:\"SP3PhaseFire_${TAG}\"}`"],
  ["'/effect @e[name=SP3PhaseFire,r=10] minecraft:poison 12 1'", "`/effect @e[name=SP3PhaseFire_${TAG},r=10] minecraft:poison 12 1`"],
  ["'/summon etim:phase_spider 80 142 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:\"SP3PhaseFall\"}'",
   "`/summon etim:phase_spider 80 142 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:\"SP3PhaseFall_${TAG}\"}`"],
  ["'/summon etim:demon_spider 90.5 135 130.5 {num_webs:0b,PersistenceRequired:1b,CustomName:\"SP3DemonLava\"}'",
   "`/summon etim:demon_spider 90.5 135 130.5 {num_webs:0b,PersistenceRequired:1b,CustomName:\"SP3DemonLava_${TAG}\"}`"],
  ["'/tp @e[name=SP3DemonLava,r=30] 90.5 135 130.5'", "`/tp @e[name=SP3DemonLava_${TAG},r=30] 90.5 135 130.5`"],
  ["'/testfor @e[name=SP3DemonLava,r=8]'", "`/testfor @e[name=SP3DemonLava_${TAG},r=8]`"],
  ["'/testfor @e[name=SP3DemonLava,r=12]'", "`/testfor @e[name=SP3DemonLava_${TAG},r=12]`"],
  ["'/tp @e[name=SP3DemonLava,r=30] 92.5 135 138.5'", "`/tp @e[name=SP3DemonLava_${TAG},r=30] 92.5 135 138.5`"],
  ["const sel = `@e[name=${cname},r=5,limit=1,sort=nearest]`;", "const sel = `@e[name=${cname}_${TAG},r=5,limit=1,sort=nearest]`;"],
  ["`/summon etim:${type} 81.5 135 100.5 ${nbt},CustomName:\"${cname}\"`", "`/summon etim:${type} 81.5 135 100.5 ${nbt},CustomName:\"${cname}_${TAG}\"`"],
];
let miss = [];
for (const [a, b] of reps) { if (!t.includes(a)) miss.push(a.slice(0, 70)); else t = t.split(a).join(b); }
fs.writeFileSync(p, t, 'utf8');
console.log('missing:', miss.length ? miss : 'none');
console.log('tag line:', /const TAG =/.test(t));
