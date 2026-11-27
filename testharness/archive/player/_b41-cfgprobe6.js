/**
 * B-41 W3 probe 6: server-side dig via /etest dig (synthetic CPacketPlayerDigging, no client logic).
 * cfg: livestockNeedsR196=false, mobDebugLog=true, miningReform=false  (gate OFF, log ON)
 *   A  creative + stone_sword + /etest dig  -> server-only path
 *   B  creative + empty hand  + /etest dig  -> control
 * Read:
 *   A breaks -> the refusal seen with mineflayer is client-side = harness face
 *   A refuses -> the server itself refuses a creative sword break with the gate OFF = product face
 * One boot, ~2.5 min. Harness-only: no src, no build.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41h';
const A = 'ETIM_F7';
const X = -60, Y = 67, Z = 240;

(async () => {
  let srv = null;
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
    srv = await L.startServer({ root: L.ROOT, tag: 'b41h' });
    if (!(await srv.waitFor(/Done \(/, 240000))) throw new Error('no Done(');
    note('boot done');

    await L.joinBot(srv, A); // player must exist; we drive from the console instead
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

    // A: sword, server-side dig
    await cmd(`setblock ${X} ${Y} ${Z} minecraft:dirt`, 600);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:stone_sword 1', 800);
    let m = srv.all.length;
    await cmd(`etest dig ${X} ${Y} ${Z} ${A}`, 2500);
    out.A_server_sword = { air: await air(), gate: srv.all.slice(m).map(L.strip).filter((l) => /SwingLog|swordgate/i.test(l)).length };

    // B: empty hand, server-side dig
    await cmd(`setblock ${X} ${Y} ${Z} minecraft:dirt`, 600);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:air', 800);
    m = srv.all.length;
    await cmd(`etest dig ${X} ${Y} ${Z} ${A}`, 2500);
    out.B_server_hand = { air: await air(), gate: srv.all.slice(m).map(L.strip).filter((l) => /SwingLog|swordgate/i.test(l)).length };

    note('server ' + JSON.stringify(out));
    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
