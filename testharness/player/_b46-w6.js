// B-46 W6 — silent arm: default mobDebugLog=false, probe both gate sites once each.
// Expect: zero slime-gate / deep-gate rows anywhere in the log, and class counts
// for Creeper / Spider / BlackWidow / Demon / Phase in the same ballpark as the loud boot.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'w6';
const A = 'ETIM_F7';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function count(lines, re) { return lines.filter(s => re.test(s)).length; }
function pickCount(summary, name) {
  const m = summary.match(new RegExp(name + '=(\\d+)'));
  return m ? Number(m[1]) : 0;
}

async function main() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  console.log(`[PIN] sha=${sha}`);

  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const dbg = /B:mobDebugLog\s*=\s*(\w+)/.exec(cfgBefore);
  note(`cfg mobDebugLog=${dbg ? dbg[1] : '(absent)'} (no injection in this arm)`);
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(propsBefore, 'level-name', `w-b46s-${RUN}`), 'allow-flight', 'true'), 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore.replace(/B:mobDebugLog\s*=\s*(true|false)/, 'B:mobDebugLog=false'), 'utf8');

  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: `b46w6-${RUN}` });
  note(`boot ok=${await srv.waitFor(/Done \(/, 480000)}`);

  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  await cmd('gamerule doMobSpawning false', 200);
  await cmd('difficulty 0', 300);
  await cmd('time set 6000', 200);
  await cmd('kill @e[type=!player]', 500);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);
  await cmd('fill -50 120 240 -50 255 240 minecraft:air', 400);
  await cmd('fill -47 20 240 -47 120 240 minecraft:air', 400);

  const s1 = await (async () => { const f = srv.all.length; await cmd('etest spawnpick -50 120 240 2000', 1600); return slice(f); })();
  const s2 = await (async () => { const f = srv.all.length; await cmd('etest spawnpick -47 20 240 2000', 1600); return slice(f); })();
  const sum1 = s1.find(x => x.includes('[SpawnLog] spawnpick')) || '';
  const sum2 = s2.find(x => x.includes('[SpawnLog] spawnpick')) || '';

  const all = srv.all;
  const gateRows = count(all, /slime-gate|deep-gate/);
  const out = {
    gateRows,
    w0: { slime: pickCount(sum1, 'EntitySlime'), creeper: pickCount(sum1, 'EntityCreeper'), spider: pickCount(sum1, 'EntitySpider') },
    w3: { revenant: pickCount(sum2, 'ETIMEntityRevenant'), boneLord: pickCount(sum2, 'ETIMEntityBoneLord'),
          demon: pickCount(sum2, 'ETIMEntityDemonSpider'), phase: pickCount(sum2, 'ETIMEntityPhaseSpider'),
          blackWidow: pickCount(sum2, 'ETIMEntityBlackWidow') },
    sums: [sum1.trim(), sum2.trim()]
  };
  console.log('[W6]', JSON.stringify(out));

  try { bot.quit(); bot = null; await sleep(1500); } catch (e) { /* noop */ }
  const st = await srv.stop();
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  const pass = gateRows === 0 && out.w0.slime > 0 && out.w3.revenant > 0 && out.w3.boneLord > 0;
  console.log('[done]', JSON.stringify({ run: RUN, pass, bad: pass ? 0 : 1 }));
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
