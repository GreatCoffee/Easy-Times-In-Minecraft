// B-41 W3 one-shot probe: livestock=false + miningReform=false + creative + stone_sword + /etest dig
// Answers: does the creative sword still block when BOTH flags are false at runtime?
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'probe1';
let propsBefore = null, cfgBefore = null;
const faces = { swordgate: s => / \[SwingLog\] swordgate /.test(s), dig: s => / \[TestLog\] /.test(s) };

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 400 : wait); }

async function startBoot(tag, world, cfg) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  for (let rm = 1; rm <= 10; rm++) { try { fs.rmSync(path.join(L.ROOT, 'run', world), { recursive: true, force: true }); break; } catch (e) { if (rm === 10) throw new Error('stale server JVM holds run/' + world); await sleep(3000); } }
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props) ? L.setProp(props, 'level-name', world) : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held — aborting');
    s = await L.startServer({ root: L.ROOT, tag });
    const done = await s.waitFor(/Done \(/, 480000);
    if (done) return s;
    try { await s.stop(30000); } catch (e) { /* noop */ }
    s = null;
  }
  throw new Error(tag + ': no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  const rec = { exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) };
  console.log('[stop]', JSON.stringify(rec));
  return rec;
}

let bot = null, srv = null;

async function main() {
  srv = await startBoot('w-b41p-b1', 'w-b41p', { livestockNeedsR196: false, miningReform: false, mobDebugLog: true });
  bot = await L.joinBot(srv, 'ETIM_F7');
  await sleep(2000);
  await cmd('gamemode 1 ETIM_F7');
  await cmd('gamerule doMobSpawning false');
  await cmd('gamerule doFireTick false');
  await cmd('kill @e[type=!player]');
  await L.tp(srv, -60.5, 67, 240.5);
  await sleep(1500);
  await cmd('setblock -60 67 240 minecraft:dirt');
  await cmd('setblock -60 68 240 minecraft:air');
  await sleep(400);
  await cmd('replaceitem entity ETIM_F7 slot.weapon.mainhand minecraft:stone_sword 1', 600);
  await L.tp(srv, -60.5, 68, 240.5);
  await sleep(500);
  const digStart = () => srv.all.filter(s => /dig-start/.test(s)).length;
  const t0 = digStart();
  // the /etest dig channel (the same server packet chain as their step 7) — with the player arg (the console sender has no interactionManager)
  await cmd('etest dig -60 67 240 ETIM_F7', 6000);
  const etestRows = digStart() - t0;
  // the raw client dig too (mineflayer)
  const vec3 = require('vec3');
  const b = bot.blockAt(new vec3(-60, 67, 240));
  if (b) { try { await bot.dig(b, true); } catch (e) { note('dig err: ' + e.message); } await sleep(1500); }
  const swordState = await L.testBlock(srv, -60, 67, 240, 'minecraft:dirt');
  const heldAfterSword = bot.heldItem ? bot.heldItem.name : '(null)';
  // the pick control — the /etest dig channel
  await cmd('replaceitem entity ETIM_F7 slot.weapon.mainhand minecraft:stone_pickaxe 1', 600);
  await sleep(400);
  await cmd('setblock -60 67 240 minecraft:dirt');
  await sleep(400);
  const t2 = digStart();
  await cmd('etest dig -60 67 240 ETIM_F7', 6000);
  const etestRowsPick = digStart() - t2;
  const pickState = await L.testBlock(srv, -60, 67, 240, 'minecraft:dirt');
  const heldAfterPick = bot.heldItem ? bot.heldItem.name : '(null)';
  // the bare hand control — both channels
  await cmd('replaceitem entity ETIM_F7 slot.weapon.mainhand minecraft:air');
  await sleep(400);
  await cmd('setblock -60 67 240 minecraft:dirt');
  await sleep(400);
  const t1 = digStart();
  await cmd('etest dig -60 67 240 ETIM_F7', 6000);
  const etestRowsBare = digStart() - t1;
  const bareEt = await L.testBlock(srv, -60, 67, 240, 'minecraft:dirt');
  if (!bareEt.ok) await cmd('setblock -60 67 240 minecraft:dirt');
  await sleep(400);
  const b2 = bot.blockAt(new vec3(-60, 67, 240));
  if (b2) { try { await bot.dig(b2, true); } catch (e) { note('dig err: ' + e.message); } await sleep(1500); }
  const bareState = await L.testBlock(srv, -60, 67, 240, 'minecraft:air');
  const gateRows = srv.all.filter(s => faces.swordgate(s)).length;
  // dump the full console log for post-mortem
  fs.writeFileSync(`build-logs/f11-b41-probe-${RUN}-all.log`, srv.all.join('\n'));
  // the runtime cfg echo — what the server ACTUALLY holds for the two keys
  await cmd('etest cfgdump livestockNeedsR196 miningReform', 2000).catch(() => {});
  console.log('[probe]', JSON.stringify({ swordDirtStill: swordState.ok, pickStill: pickState.ok, bareAir: bareState.ok, gateRows, etestRows, etestRowsPick, etestRowsBare, bareEtNotDirt: !bareEt.ok, heldAfterSword, heldAfterPick }));
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  const rec = await stopBoot();
  console.log('[done]', JSON.stringify({ run: RUN, swordDirtStill: swordState.ok, bareAir: bareState.ok, gateRows, stop: rec }));
  fs.writeFileSync(`build-logs/f11-b41-probe-${RUN}.json`, JSON.stringify({ run: RUN, swordDirtStill: swordState.ok, pickStill: pickState.ok, bareAir: bareState.ok, gateRows }, null, 2));
  process.exit(0);
}

main().catch(err => { console.log('[fatal] ' + err.message); try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ } process.exit(1); });
