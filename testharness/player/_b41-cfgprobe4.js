/**
 * B-41 W3 decisive probe 4: is the sword refusal product-side or client-side (mineflayer)?
 *
 * cfg: livestockNeedsR196=false, mobDebugLog=true, miningReform=false  (gate OFF, log ON)
 *   Step 1  bot.dig(block, true) with a stone sword in creative -> measure duration, client view, server view
 *   Step 2  if the block is still there: raw block_dig packets (status 0 then 2) bypass mineflayer's
 *           client-side dig-abort logic entirely -> re-check the server view
 *   Read:
 *     step2 breaks the block  -> the refusal was CLIENT-side (mineflayer dig abort) = harness face
 *     step2 also refuses      -> the server really refuses a creative sword break = product face
 * One boot, ~2.5 min. Harness-only: no src, no build.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');
const { Vec3 } = require('vec3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41f';
const A = 'ETIM_F7';
const SWORD = 'minecraft:stone_sword';
const P = new Vec3(-60, 67, 240);

(async () => {
  let srv = null;
  let bot = null;
  const air = async () => (await L.testBlock(srv, P.x, P.y, P.z, 'minecraft:air')).ok;
  const rowsSince = (m, re) => srv.all.slice(m).map(L.strip).filter((l) => re.test(l));
  try {
    L.setCfgValue(L.CFG, 'livestockNeedsR196', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
    L.setCfgValue(L.CFG, 'miningReform', 'false');
    note('cfg ' + JSON.stringify({ livestock: L.cfgKeys(L.CFG).livestockNeedsR196, mob: L.cfgKeys(L.CFG).mobDebugLog, mining: L.cfgKeys(L.CFG).miningReform }));

    let props = fs.readFileSync(L.PROPS, 'utf8');
    props = /level-name=/.test(props) ? L.setProp(props, 'level-name', WORLD) : props + '\nlevel-name=' + WORLD + '\n';
    fs.writeFileSync(L.PROPS, props, 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

    for (let i = 0; i < 30 && L.netstatListen(L.PORT) !== 0; i++) await sleep(2000);
    srv = await L.startServer({ root: L.ROOT, tag: 'b41f' });
    if (!(await srv.waitFor(/Done \(/, 240000))) throw new Error('no Done(');
    note('boot done');

    bot = await L.joinBot(srv, A);
    await sleep(2000);
    const cmd = async (s, w) => { srv.send(s); await sleep(w == null ? 400 : w); };
    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('time set 18000');
    await cmd('kill @e[type=!player]');
    await L.tp(srv, -60.5, 68, 240.5);
    await sleep(1500);
    await cmd('setblock -60 67 240 minecraft:dirt');
    await cmd('setblock -60 68 240 minecraft:air');
    await cmd('setblock -60 66 240 minecraft:dirt');
    await sleep(600);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + SWORD + ' 1', 800);

    note('state ' + JSON.stringify({ gameMode: bot.game && bot.game.gameMode, held: bot.heldItem && bot.heldItem.name }));

    // ---- step 1: mineflayer dig
    const b = bot.blockAt(P);
    let err = null;
    const t0 = Date.now();
    try { await bot.dig(b, true); } catch (e) { err = String((e && e.message) || e); }
    const ms = Date.now() - t0;
    await sleep(800);
    const clientName = (bot.blockAt(P) || {}).name;
    note('step1 ' + JSON.stringify({ err, ms, client: clientName, serverAir: await air() }));

    // ---- step 2: raw packets, no client-side logic
    if (!(await air())) {
      const m = srv.all.length;
      try {
        bot._client.write('block_dig', { status: 0, location: { x: P.x, y: P.y, z: P.z }, face: 1 });
        await sleep(250);
        bot._client.write('block_dig', { status: 2, location: { x: P.x, y: P.y, z: P.z }, face: 1 });
      } catch (e) { note('raw err ' + String((e && e.message) || e)); }
      await sleep(900);
      note('step2 ' + JSON.stringify({
        serverAir: await air(),
        client: (bot.blockAt(P) || {}).name,
        gate: rowsSince(m, /SwingLog|swordgate/i).length,
        clicked: rowsSince(m, /playEvent|BlockBreak|block/i).length
      }));
    }

    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
