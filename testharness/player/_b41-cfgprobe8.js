/**
 * B-41 W3 probe 8: is the cfg actually applied on this boot?
 *   cfg = { livestockNeedsR196: true, mobDebugLog: FALSE, miningReform: true }
 *   A creative + stone_sword + /etest dig
 *       -> gate is ON but LOGGING is OFF, so this is a "silent gate" test:
 *          block NOT broken  => cfg applied (livestock=true reached the gate)
 *          block broken      => livestock read as false / cfg not applied
 *   B creative + iron_pickaxe -> sanity: breaks, no rows
 * Harness-only. One boot ~2.5 min.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41j';
const A = 'ETIM_F7';
const X = -60, Y = 67, Z = 240;

(async () => {
  let srv = null;
  try {
    L.setCfgValue(L.CFG, 'livestockNeedsR196', 'true');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    L.setCfgValue(L.CFG, 'miningReform', 'true');
    note('cfg ' + JSON.stringify({ livestock: L.cfgKeys(L.CFG).livestockNeedsR196, mob: L.cfgKeys(L.CFG).mobDebugLog, mining: L.cfgKeys(L.CFG).miningReform }));

    let props = fs.readFileSync(L.PROPS, 'utf8');
    props = /level-name=/.test(props) ? L.setProp(props, 'level-name', WORLD) : props + '\nlevel-name=' + WORLD + '\n';
    fs.writeFileSync(L.PROPS, props, 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

    for (let i = 0; i < 30 && L.netstatListen(L.PORT) !== 0; i++) await sleep(2000);
    srv = await L.startServer({ root: L.ROOT, tag: 'b41j' });
    if (!(await srv.waitFor(/Done \(/, 240000))) throw new Error('no Done(');
    note('boot done');

    await L.joinBot(srv, A);
    await sleep(2000);
    const cmd = async (s, w) => { srv.send(s); await sleep(w == null ? 400 : w); };
    const air = async () => (await L.testBlock(srv, X, Y, Z, 'minecraft:air')).ok;

    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('time set 18000');
    await cmd('kill @e[type=!player]');
    await L.tp(srv, -59.5, 68, 240.5);
    await sleep(1200);

    const out = {};
    await cmd(`setblock ${X} ${Y} ${Z} minecraft:dirt`, 600);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:stone_sword 1', 800);
    let m = srv.all.length;
    await cmd(`etest dig ${X} ${Y} ${Z} ${A}`, 2500);
    out.A_sword_silentGate = { air: await air(), rows: srv.all.slice(m).map(L.strip).filter((l) => /SwingLog|swordgate/i.test(l)).length };

    await cmd(`setblock ${X} ${Y} ${Z} minecraft:dirt`, 600);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:iron_pickaxe 1', 800);
    m = srv.all.length;
    await cmd(`etest dig ${X} ${Y} ${Z} ${A}`, 2500);
    out.B_pick = { air: await air(), rows: srv.all.slice(m).map(L.strip).filter((l) => /SwingLog|swordgate/i.test(l)).length };

    note('probe8 ' + JSON.stringify(out));
    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
