// B-57 probe: does a summoned gel entity survive and tick?
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');

const RUN = process.env.RUN || 'p1';
const A = 'ETIM_F7';
const WORLD = 'w-b57-' + RUN + '-v1';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 250 : wait); }
const lines = () => { try { return fs.readFileSync(srv.logPath, 'utf8').split(/\r?\n/); } catch (e) { return []; } };

async function main() {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  let props = L.setProp(propsBefore, 'level-name', WORLD);
  props = L.setProp(props, 'allow-flight', 'true');
  fs.writeFileSync(L.PROPS, props, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true')
    .replace(/B:mobGelatinousR196=(true|false)/, 'B:mobGelatinousR196=true'), 'utf8');
  srv = await L.startServer({ root: L.ROOT, tag: 'b57-' + RUN });
  if (!(await srv.waitFor(/Done \(/, 180000))) throw new Error('no Done(');
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 500);
  await cmd('gamemode 1 ' + A, 300);
  await cmd('gamerule doMobSpawning false', 150);
  await cmd('difficulty 2', 200);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
  await cmd('fill 0 129 0 2 132 2 minecraft:air', 200);

  await cmd('etest gel jelly 0 130 0 1', 1200);
  await cmd('testfor @e[type=etim:jelly]', 600);
  await cmd('etest gelstate 0 130 0', 800);
  await sleep(4000);
  await cmd('etest gelstate 0 130 0', 800);
  await cmd('testfor @e[type=etim:jelly]', 600);
  await cmd('fill 1 130 0 1 130 0 minecraft:planks', 400);
  await sleep(12000);
  await cmd('etest gelstate 0 130 0', 800);
  const gl = lines().filter(l => /GelLog|TestLog|Entity/.test(l) && /GelLog|Found entity|Test failed/.test(l)).slice(-25);
  console.log(gl.join('\n'));
  try { bot.quit(); } catch (e) { /* noop */ }
  const st = await srv.stop();
  console.log('[stop]', JSON.stringify(st));
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
}
main().catch(async e => { console.error('[fatal]', e.message); try { if (srv) await srv.stop(); } catch (x) { } process.exit(2); });
