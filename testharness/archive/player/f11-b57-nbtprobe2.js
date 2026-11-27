// NBT round-trip probe with bot (keeps chunk loaded)
const fs = require('fs');
const L = require('./f7-wb-lib.js');
const WORLD = 'w-b57-nbtprobe2-v1';

async function boot(tag) {
  for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await L.sleep(5000);
  const srv = await L.startServer({ root: L.ROOT, tag });
  await srv.waitFor(/Done \(/, 180000);
  await L.sleep(1200);
  const bot = await L.joinBot(srv, 'ETIM_F7');
  await L.sleep(1200);
  return { srv, bot };
}

function dump(srv, label, re) {
  const ls = (srv.all || []).filter((l) => re.test(l));
  ls.slice(-4).forEach((l) => console.log(label, l.replace(/^\[[^\]]*\]\s+\[[^\]]*\]\s*(?:\[[^\]]*\])?:\s*/, '').slice(0, 380)));
}

(async () => {
  const propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  const cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(propsBefore, 'level-name', WORLD), 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true'), 'utf8');

  let { srv, bot } = await boot('b57-nbtprobe2-b1');
  const cmds = [
    'gamemode 1 ETIM_F7',
    'tp ETIM_F7 0.5 130 0.5',
    'etest wgspawn 0 0 1 1',
    'fill 0 129 0 15 129 15 minecraft:stone',
    'fill 0 130 0 15 132 15 minecraft:air',
    'setblock 3 130 0 minecraft:chest',
    'etest gel ooze 2 130 0 2 b1',
    'tp @e[type=!player,name=b1] 2.85 130 0.5',
  ];
  for (const c of cmds) { await srv.send('/' + c); await L.sleep(350); }
  await L.sleep(4000);
  await srv.send('/etest gelstate 2 130 0'); await L.sleep(600);
  await srv.send('/entitydata @e[type=!player,name=b1] {}'); await L.sleep(800);
  await srv.send('/save-all'); await L.sleep(1200);
  await srv.send('/entitydata @e[type=!player,name=b1] {}'); await L.sleep(800);
  dump(srv, '[b1]', /GelLog\] state|has the following entity data|No entity was found|blocks_filled|Saved the game/);
  bot.quit();
  await srv.stop(30000);

  ({ srv, bot } = await boot('b57-nbtprobe2-b2'));
  await srv.send('/gamemode 1 ETIM_F7'); await L.sleep(400);
  await srv.send('/etest gelstate 2 130 0'); await L.sleep(600);
  await srv.send('/entitydata @e[type=!player,name=b1] {}'); await L.sleep(800);
  dump(srv, '[b2]', /GelLog\] state|nbtread|has the following entity data|No entity was found/);
  bot.quit();
  await srv.stop(30000);

  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  process.exit(0);
})().catch((e) => { console.error('[fatal]', e && e.stack || e); process.exit(1); });
