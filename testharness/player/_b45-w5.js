// B-45 W5 arm — default-off parity: no skillsEnabled injection (cfg default false).
// Expect: capability still queryable, anvilplan not blocked by the skill gate (fail=0).
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w5';
const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  console.log(`[PIN] sha=${sha} mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},` +
    `dual:${mk.refmapTmp.dual},mixins:${mk.manifest.mixins},client:${mk.manifest.client}}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  const cfgText = fs.readFileSync(L.CFG, 'utf8');
  const skillKey = /B:skillsEnabled\s*=\s*(\w+)/.exec(cfgText);
  note(`cfg skillsEnabled key present=${!!skillKey} value=${skillKey ? skillKey[1] : '(absent -> product default false)'}`);
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', `w-b45s-${RUN}`), 'allow-flight', 'true'), 'utf8');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: `b45w5-${RUN}` });
  const up = await srv.waitFor(/Done \(/, 480000);
  note(`boot ok=${up}`);

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);

  const from = srv.all.length;
  await cmd(`etest skills ${A}`, 500);
  await cmd(`etest anvilplan ${A} etim:pickaxe_copper 10`, 600);
  await cmd(`etest anvilplan ${A} etim:cudgel_wood 10`, 500);
  const lines = slice(from);

  const skillGet = has(lines, /\[SkillLog\] get player=ETIM_F7 mask=/);
  const pick = lines.filter(s => /anvilplan .*item=etim:pickaxe_copper/.test(s)).map(s => s.trim());
  const cudgel = lines.filter(s => /anvilplan .*item=etim:cudgel_wood/.test(s)).map(s => s.trim());
  const pickAllowed = pick.some(s => /fail=0/.test(s));
  const cudgelAllowed = cudgel.some(s => /fail=0/.test(s));
  console.log('[W5]', JSON.stringify({ skillGet, pickAllowed, cudgelAllowed, pick, cudgel }));

  try { bot.quit(); bot = null; await sleep(1500); } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgText, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = skillGet && pickAllowed && cudgelAllowed;
  console.log('[done]', JSON.stringify({ run: RUN, pass, bad: pass ? 0 : 1 }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (bot) bot.quit(); } catch (x) { /* noop */ }
  try { if (srv) console.log('[stop]', JSON.stringify(await srv.stop())); } catch (x) { /* noop */ }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (x) { /* noop */ }
  process.exit(1);
});
