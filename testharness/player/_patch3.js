const fs = require('fs');
const p = 'sp3-run.js';
let t = fs.readFileSync(p, 'utf8');
const i = t.indexOf('async function phaseV7(bot) {');
const j = t.indexOf('/**', i + 10);
const body = `async function phaseV7(bot) {
  await cmd(bot, '/gamemode 0');
  await cmd(bot, '/time set 1000');
  await tp(bot, 80, 135, 100, 900);
  const total = async () => {
    const r = await cmdReply(bot, '/state', 1200);
    const m = /total=(-?\\d+)/.exec(r);
    return m ? parseInt(m[1], 10) : null;
  };
  await say(bot, 'v7-begin');
  await cmd(bot, \`/effect \${NAME} minecraft:resistance 9000 4 true\`, 300);

  const results = [];
  const species = [
    ['black_widow_spider', '{num_webs:0b,PersistenceRequired:1b}', 8, 'SP3XpWidow'],
    ['demon_spider', '{num_webs:0b,PersistenceRequired:1b}', 15, 'SP3XpDemon'],
    ['phase_spider', '{max_num_evasions:0b,num_evasions:0b,PersistenceRequired:1b}', 10, 'SP3XpPhase'],
  ];
  for (const [type, nbt, want, cname] of species) {
    await cmdReply(bot, '/kill @e[type=!Player]', 700);
    await tp(bot, 80, 135, 100, 600);
    await sleep(900);
    const before = await total();
    await cmdReply(bot, \`/summon etim:\${type} 81.4 135 100.5 \${nbt},CustomName:"\${cname}_\${TAG}"\`, 900);
    await sleep(1200);
    const sel = \`@e[name=\${cname}_\${TAG},r=5,limit=1,sort=nearest]\`;
    const testSel = \`@e[name=\${cname}_\${TAG},r=6]\`;
    let hits = 0;
    for (let k = 0; k < 40; k++) {
      await cmdReply(bot, \`/tp \${testSel} 81.4 135 100.5\`, 260);
      const r = await attack(bot, sel, 420);
      if (r.includes('NO_TARGET')) break;
      hits++;
      const found = await cmdReply(bot, \`/testfor \${testSel}\`, 300);
      if (found.includes('found nothing')) break;
      await sleep(250);
    }
    await sleep(2200);
    const after = await total();
    const delta = before !== null && after !== null ? after - before : null;
    mark(\`xp \${type}: before=\${before} after=\${after} delta=\${delta} want=\${want} hits=\${hits}\`);
    results.push({ type, before, after, delta, want, hits });
  }
  await say(bot, 'v7-end');
  return results;
}

`;
t = t.slice(0, i) + body + t.slice(j);
fs.writeFileSync(p, t, 'utf8');
console.log('patched v7');
