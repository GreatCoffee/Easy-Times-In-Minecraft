/**
 * B-41 W3 discriminative probe 5: which axis blocks the creative sword break?
 * cfg: livestockNeedsR196=false, mobDebugLog=true, miningReform=false   (ETIM gate OFF, log ON)
 *
 *   A  creative + stone_sword  + dirt   -> reproduce the refusal
 *   B  creative + iron_pickaxe + dirt   -> item axis?
 *   C  creative + stone_sword  + grass  -> block axis?
 *   D  survival + stone_sword  + dirt   -> mode axis? (vanilla sword digs dirt in ~1.5 s)
 * One boot, ~3 min. Harness-only: no src, no build.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');
const { Vec3 } = require('vec3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41g';
const A = 'ETIM_F7';
const SWORD = 'minecraft:stone_sword';
const PICK = 'minecraft:iron_pickaxe';
const P = new Vec3(-60, 67, 240);

(async () => {
  let srv = null;
  let bot = null;
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
    srv = await L.startServer({ root: L.ROOT, tag: 'b41g' });
    if (!(await srv.waitFor(/Done \(/, 240000))) throw new Error('no Done(');
    note('boot done');

    bot = await L.joinBot(srv, A);
    await sleep(2000);
    const cmd = async (s, w) => { srv.send(s); await sleep(w == null ? 400 : w); };
    const air = async () => (await L.testBlock(srv, P.x, P.y, P.z, 'minecraft:air')).ok;
    const reset = async (block) => {
      await cmd(`setblock ${P.x} ${P.y} ${P.z} ${block}`, 500);
      await cmd(`setblock ${P.x} ${P.y + 1} ${P.z} minecraft:air`, 300);
      await cmd(`setblock ${P.x} ${P.y - 1} ${P.z} minecraft:dirt`, 300);
    };
    const swing = async (label) => {
      const m = srv.all.length;
      let err = null;
      try { await bot.dig(bot.blockAt(P), true); } catch (e) { err = String((e && e.message) || e); }
      await sleep(2500);
      const rows = srv.all.slice(m).map(L.strip);
      return {
        label, err, air: await air(),
        gate: rows.filter((l) => /SwingLog|swordgate/i.test(l)).length,
        reach: rows.filter((l) => /reach denied/i.test(l)).length
      };
    };

    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('time set 18000');
    await cmd('kill @e[type=!player]');
    await L.tp(srv, -60.5, 68, 240.5);
    await sleep(1500);

    const out = {};

    // A: creative sword dirt
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + SWORD + ' 1', 800);
    await reset('minecraft:dirt');
    out.A_creative_sword_dirt = await swing('A');

    // B: creative pickaxe dirt
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + PICK + ' 1', 800);
    await reset('minecraft:dirt');
    out.B_creative_pick_dirt = await swing('B');

    // C: creative sword grass
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + SWORD + ' 1', 800);
    await reset('minecraft:grass');
    out.C_creative_sword_grass = await swing('C');

    // D: survival sword dirt
    await reset('minecraft:dirt');
    await cmd('gamemode 0 ' + A, 600);
    await sleep(500);
    out.D_survival_sword_dirt = await swing('D');
    await cmd('gamemode 1 ' + A, 400);

    note('cases ' + JSON.stringify(out));
    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
