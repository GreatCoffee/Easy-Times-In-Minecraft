// B-48 W6 — B-1 regression: with flags ON, summon zombie / pigzombie / spider and
// read [AILog] mob stats rows. Rows are emitted one attribute per line, e.g.
//   [AILog] mob stats attackDamage=5.0 entity=EntityZombie#2672
// Expect: zombie 5.0 / follow 32.0 / armor 0.0; pigzombie 8.0 / follow 32.0;
//         spider maxHealth 12.0 / attack 4.0 / follow 28.0.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  console.log(`[PIN] sha=${sha} size=${fs.statSync(jar).size}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', 'w-b48s-w6'), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore
    .replace(/B:mobStatsR196\s*=\s*(true|false)/, 'B:mobStatsR196=true')
    .replace(/B:livestockNeedsR196\s*=\s*(true|false)/, 'B:livestockNeedsR196=true')
    .replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=true');
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  note('cfg injected: mobStatsR196=true livestockNeedsR196=true mobDebugLog=true');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: 'b48w6' });
  note(`boot ok=${await srv.waitFor(/Done \(/, 480000)}`);

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  for (const g of ['doMobSpawning false', 'doTileDrops false', 'doDaylightCycle false', 'doFireTick false']) {
    await cmd('gamerule ' + g, 200);
  }
  await cmd('difficulty 0', 300);
  await cmd('time set 6000', 200);
  await cmd('kill @e[type=!player]', 800);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);

  async function summonAndGrab(cmdline, tag) {
    const from = srv.all.length;
    await cmd('kill @e[type=!player]', 500);
    await cmd(cmdline, 1800);
    const rows = slice(from).filter(s => /\[AILog\] mob stats/.test(s)).map(s => s.trim());
    return { tag, rows };
  }

  // 1.12 id for pig zombie is minecraft:zombie_pigman ("pigzombie" is skipped silently).
  const z = await summonAndGrab('summon minecraft:zombie -50 120 240', 'zombie');
  const pz = await summonAndGrab('summon minecraft:zombie_pigman -45 120 240', 'zombie_pigman');
  const sp = await summonAndGrab('summon minecraft:spider -40 120 240', 'spider');

  const joined = r => r.rows.join(' | ');
  const zombieOk = /attackDamage=5\.0/.test(joined(z)) && /followRange=32\.0/.test(joined(z)) && /armor=0\.0/.test(joined(z));
  const pigzOk = /attackDamage=8\.0/.test(joined(pz)) && /followRange=32\.0/.test(joined(pz));
  const spiderOk = /maxHealth=12\.0/.test(joined(sp)) && /attackDamage=4\.0/.test(joined(sp)) && /followRange=28\.0/.test(joined(sp));

  console.log('[W6]', JSON.stringify({ zombieOk, pigzombieOk: pigzOk, spiderOk, pass: zombieOk && pigzOk && spiderOk }));
  console.log('[W6-rows]', JSON.stringify({ zombie: z.rows, zombie_pigman: pz.rows, spider: sp.rows }));

  try { if (bot) { bot.quit(); bot = null; await sleep(1500); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = zombieOk && pigzOk && spiderOk;
  console.log('[done]', JSON.stringify({ run: 'w6', pass, bad: pass ? 0 : 1 }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (bot) bot.quit(); } catch (x) { /* noop */ }
  try { if (srv) console.log('[stop]', JSON.stringify(await srv.stop())); } catch (x) { /* noop */ }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (x) { /* noop */ }
  try { if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (x) { /* noop */ }
  process.exit(1);
});
