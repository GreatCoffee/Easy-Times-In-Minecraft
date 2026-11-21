/**
 * B-41 W3 取证之二：2x2（物品 × 位置）—— 剑/手 各在两个位置挖，判定「不破」到底是物品面还是站位面。
 * 一次 boot（~2.5 min）；只读产品、只写配置，不改 src、不 build。
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');
const { Vec3 } = require('vec3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41d';
const A = 'ETIM_F7';
const SWORD = 'minecraft:stone_sword';

(async () => {
  let srv = null;
  let bot = null;
  const swing = async (x, y, z) => {
    const m = srv.all.length;
    let err = null;
    try { await bot.dig(bot.blockAt(new Vec3(x, y, z)), true); } catch (e) { err = String((e && e.message) || e); }
    await sleep(1200);
    const gate = srv.all.slice(m).map(L.strip).filter((l) => /SwingLog|swordgate/i.test(l)).length;
    const t = await L.testBlock(srv, x, y, z, 'minecraft:air');
    return { err, gate, air: t.ok };
  };
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
    srv = await L.startServer({ root: L.ROOT, tag: 'b41d' });
    if (!(await srv.waitFor(/Done \(/, 240000))) throw new Error('no Done(');
    note('boot done');

    bot = await L.joinBot(srv, A);
    await sleep(2000);
    const cmd = async (s, w) => { srv.send(s); await sleep(w == null ? 400 : w); };
    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('time set 18000');
    await cmd('kill @e[type=!player]');
    await L.tp(srv, -60.5, 68, 240.5); // 站 y=68：脚下不是垫块
    await sleep(1500);
    for (const x of [-60, -56]) {
      await cmd(`setblock ${x} 67 240 minecraft:dirt`);
      await cmd(`setblock ${x} 68 240 minecraft:air`);
      await cmd(`setblock ${x} 66 240 minecraft:dirt`);
    }
    await sleep(600);

    const out = {};
    // A: 剑 @ -60
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + SWORD + ' 1', 800);
    out.sword_near = await swing(-60, 67, 240);
    // B: 剑 @ -56
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:air', 800);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + SWORD + ' 1', 800);
    out.sword_far = await swing(-56, 67, 240);
    // C: 手 @ -60（重置）
    await cmd('setblock -60 67 240 minecraft:dirt', 500);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:air', 800);
    out.hand_near = await swing(-60, 67, 240);
    // D: 手 @ -56（重置）
    await cmd('setblock -56 67 240 minecraft:dirt', 500);
    out.hand_far = await swing(-56, 67, 240);

    note('2x2 ' + JSON.stringify(out));
    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
