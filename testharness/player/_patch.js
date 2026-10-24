const fs = require('fs');
const p = 'sp3-run.js';
let t = fs.readFileSync(p, 'utf8');
const pairs = [
  ["/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b}'",
   "/summon etim:phase_spider 82 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,CustomName:\"SP3Phase\"}"],
  ["const SEL = '@e[type=etim.phase_spider,r=6,limit=1,sort=nearest]';",
   "const SEL = '@e[name=SP3Phase,r=9]';"],
  ["/tp @e[type=etim.phase_spider,r=20,limit=1,sort=nearest] 81.5 135 100.5",
   "/tp @e[name=SP3Phase,r=30] 81.5 135 100.5"],
  ["/summon etim:phase_spider 80 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f}",
   "/summon etim:phase_spider 80 135 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:\"SP3PhaseFire\"}"],
  ["/effect @e[type=etim.phase_spider,r=8] minecraft:poison 12 1",
   "/effect @e[name=SP3PhaseFire,r=10] minecraft:poison 12 1"],
  ["/summon etim:phase_spider 80 142 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f}",
   "/summon etim:phase_spider 80 142 100 {max_num_evasions:4b,num_evasions:4b,PersistenceRequired:1b,Health:20.0f,CustomName:\"SP3PhaseFall\"}"],
  ["/summon etim:demon_spider 90.5 135 130.5 {num_webs:0b,PersistenceRequired:1b}",
   "/summon etim:demon_spider 90.5 135 130.5 {num_webs:0b,PersistenceRequired:1b,CustomName:\"SP3DemonLava\"}"],
  ["/tp @e[type=etim.demon_spider,r=20,limit=1,sort=nearest] 90.5 135 130.5",
   "/tp @e[name=SP3DemonLava,r=30] 90.5 135 130.5"],
  ["/testfor @e[type=etim.demon_spider,r=6]", "/testfor @e[name=SP3DemonLava,r=8]"],
  ["/testfor @e[type=etim.demon_spider,r=8]", "/testfor @e[name=SP3DemonLava,r=12]"],
  ["/summon etim:${type} 81.5 135 100.5 ${nbt}",
   "/summon etim:${type} 81.5 135 100.5 ${nbt},CustomName:\"${cname}\""],
  ["const sel = `@e[type=etim.${type},r=5,limit=1,sort=nearest]`;",
   "const sel = `@e[name=${cname},r=5,limit=1,sort=nearest]`;"],
  ["['black_widow_spider', '{num_webs:0b,PersistenceRequired:1b}', 8],",
   "['black_widow_spider', '{num_webs:0b,PersistenceRequired:1b}', 8, 'SP3XpWidow'],"],
  ["['demon_spider', '{num_webs:0b,PersistenceRequired:1b}', 15],",
   "['demon_spider', '{num_webs:0b,PersistenceRequired:1b}', 15, 'SP3XpDemon'],"],
  ["['phase_spider', '{max_num_evasions:0b,num_evasions:0b,PersistenceRequired:1b}', 10],",
   "['phase_spider', '{max_num_evasions:0b,num_evasions:0b,PersistenceRequired:1b}', 10, 'SP3XpPhase'],"],
  ["for (const [type, nbt, want] of species) {", "for (const [type, nbt, want, cname] of species) {"],
  ["  await cmdReply(bot, `/setblock 92 135 138 minecraft:fire`, 500);\n  await sleep(4000);",
   "  await cmdReply(bot, `/setblock 92 135 138 minecraft:fire`, 500);\n  await cmdReply(bot, `/tp @e[name=SP3DemonLava,r=30] 92.5 135 138.5`, 800);\n  await sleep(4000);"],
];
let miss = [];
for (const [a, b] of pairs) { if (!t.includes(a)) miss.push(a.slice(0, 60)); else t = t.split(a).join(b); }
fs.writeFileSync(p, t, 'utf8');
console.log('missing patterns:', miss.length ? miss : 'none');
