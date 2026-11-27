/**
 * B-41 W3 取证：cfg 在 boot 时到底生效没有 + 剑面/手面同 boot 对照。
 * 一次 boot（~2.5 min），只读产品、只写配置，不改 src、不 build。
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');
const { Vec3 } = require('vec3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const note = (m) => console.log(`[${new Date().toISOString()}] ${m}`);
const WORLD = 'w-b41c';
const A = 'ETIM_F7';

function keys() {
  const k = L.cfgKeys(L.CFG);
  return { livestock: k.livestockNeedsR196, mob: k.mobDebugLog, mining: k.miningReform };
}

(async () => {
  let srv = null;
  let bot = null;
  try {
    note('cfg BEFORE write ' + JSON.stringify(keys()));
    L.setCfgValue(L.CFG, 'livestockNeedsR196', 'false');
    L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
    L.setCfgValue(L.CFG, 'miningReform', 'false');
    note('cfg AFTER write  ' + JSON.stringify(keys()));

    let props = fs.readFileSync(L.PROPS, 'utf8');
    props = /level-name=/.test(props) ? L.setProp(props, 'level-name', WORLD) : props + '\nlevel-name=' + WORLD + '\n';
    fs.writeFileSync(L.PROPS, props, 'utf8');
    try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

    for (let i = 0; i < 30 && L.netstatListen(L.PORT) !== 0; i++) await sleep(2000);
    srv = await L.startServer({ root: L.ROOT, tag: 'b41c' });
    const done = await srv.waitFor(/Done \(/, 240000);
    note('boot done=' + !!done);
    if (!done) throw new Error('no Done(');

    note('cfg AFTER boot   ' + JSON.stringify(keys()));

    bot = await L.joinBot(srv, A);
    await sleep(2000);
    const cmd = async (s, w) => { srv.send(s); await sleep(w == null ? 400 : w); };

    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('time set 18000');
    await cmd('kill @e[type=!player]');
    await L.tp(srv, -60.5, 67, 240.5);
    await sleep(1500);
    await cmd('setblock -60 67 240 minecraft:dirt');
    await cmd('setblock -60 68 240 minecraft:air');
    await cmd('setblock -56 67 240 minecraft:dirt');
    await cmd('setblock -56 68 240 minecraft:air');
    await sleep(600);

    // 服务器侧确认创造：再发一次 gamemode，看回声
    const gmMark = srv.all.length;
    await cmd('gamemode 1 ' + A, 600);
    const gmRows = srv.all.slice(gmMark).map(L.strip).filter((l) => /game mode/i.test(l));
    note('[gm] ' + JSON.stringify(gmRows));

    // --- 剑面 ---
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:stone_sword 1', 800);
    const markSw = srv.all.length;
    let err = null;
    try { await bot.dig(bot.blockAt(new Vec3(-60, 67, 240)), true); } catch (e) { err = String((e && e.message) || e); }
    await sleep(1200);
    const swRows = srv.all.slice(markSw).map(L.strip).filter((l) => /SwingLog|swordgate/i.test(l));
    const swTest = await L.testBlock(srv, -60, 67, 240, 'minecraft:air');
    note('[sword] err=' + err + ' air=' + swTest.ok + ' gateRows=' + swRows.length + ' sample=' + JSON.stringify(swRows.slice(0, 2)));

    // --- 手面 ---
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:air', 800);
    let err2 = null;
    try { await bot.dig(bot.blockAt(new Vec3(-56, 67, 240)), true); } catch (e) { err2 = String((e && e.message) || e); }
    await sleep(1200);
    const handTest = await L.testBlock(srv, -56, 67, 240, 'minecraft:air');
    note('[hand] err=' + err2 + ' air=' + handTest.ok);

    note('cfg AFTER arms   ' + JSON.stringify(keys()));

    const st = await srv.stop();
    note('[stop] ' + JSON.stringify({ exitCode: st.exitCode, exited: st.exited }));
  } catch (e) {
    note('FATAL ' + ((e && e.stack) || e));
    try { if (srv) await srv.stop(30000); } catch (e2) { /* noop */ }
    process.exitCode = 1;
  }
})();
