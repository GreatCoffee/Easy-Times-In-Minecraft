/**
 * B-41 W3 probe 9: is `livestockNeedsR196=false` actually reaching the runtime field?
 *
 * The sword gate is creative-only, so it cannot answer that question. But the SAME
 * flag also decides whether ETIM installs its break-door AI at all
 * (MixinEntityZombie: `if (!livestockNeedsR196) return;`). A zombie with
 * CanBreakDoors:1b parked behind a CLOSED wooden door emits
 *   [AILog] breakdoor ... start ...
 * only when the flag is TRUE at runtime.
 *
 * cfg written here = { livestockNeedsR196: false, mobDebugLog: true, miningReform: false }
 *   -> expect 0 breakdoor rows if the flag is applied
 *   -> if rows appear, the file write is NOT reaching the field (harness/config defect)
 *
 * Harness-only. One boot ~90 s.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41k';
const A = 'ETIM_F7';

(async () => {
  let srv = null;
  try {
    L.setCfgValue(L.CFG, 'livestockNeedsR196', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
    L.setCfgValue(L.CFG, 'miningReform', 'false');
    note('cfg ' + JSON.stringify(L.cfgKeys(L.CFG)));

    let props = fs.readFileSync(L.PROPS, 'utf8');
    props = /level-name=/.test(props) ? L.setProp(props, 'level-name', WORLD) : props + '\nlevel-name=' + WORLD + '\n';
    fs.writeFileSync(L.PROPS, props, 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

    for (let i = 0; i < 30 && L.netstatListen(L.PORT) !== 0; i++) await sleep(2000);
    srv = await L.startServer({ root: L.ROOT, tag: 'b41k' });
    if (!(await srv.waitFor(/Done \(/, 240000))) throw new Error('no Done(');
    note('boot done');

    await L.joinBot(srv, A);
    await sleep(2000);
    const cmd = async (s, w) => { srv.send(s); await sleep(w == null ? 400 : w); };

    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('gamerule mobGriefing true');
    await cmd('difficulty hard');
    await cmd('time set 18000');
    await cmd('kill @e[type=!player]');
    // pen floor + air, wall at x=-67 with a door gap at z=242 (two blocks tall)
    await cmd('fill -74 66 237 -64 66 247 minecraft:cobblestone', 700);
    await cmd('fill -74 67 237 -64 71 247 minecraft:air', 700);
    await cmd('fill -72 67 239 -67 69 239 minecraft:cobblestone', 400);
    await cmd('fill -72 67 244 -67 69 244 minecraft:cobblestone', 400);
    await cmd('fill -72 67 239 -72 69 244 minecraft:cobblestone', 400);
    await cmd('fill -67 67 239 -67 69 241 minecraft:cobblestone', 400);
    await cmd('fill -67 67 243 -67 69 244 minecraft:cobblestone', 400);
    await cmd('fill -67 67 242 -67 68 242 minecraft:air', 400);
    await cmd('setblock -67 67 242 minecraft:wooden_door 0', 500);
    await cmd('setblock -67 68 242 minecraft:wooden_door 8', 500);
    await cmd('summon zombie -70 67 242 {CanBreakDoors:1b,PersistenceRequired:1b}', 600);
    await cmd('replaceitem entity @e[type=zombie] slot.weapon.mainhand minecraft:iron_axe 1', 600);
    await L.tp(srv, -65.5, 67, 242.5);
    await sleep(30000);

    const rows = srv.all.map(L.strip);
    const bd = rows.filter((l) => l.includes(' breakdoor '));
    note('breakdoorRows ' + bd.length);
    bd.slice(0, 3).forEach((l) => note('  ' + l));

    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
