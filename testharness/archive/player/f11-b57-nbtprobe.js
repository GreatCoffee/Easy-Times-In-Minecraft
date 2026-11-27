// NBT round-trip probe: does dissolving_blocks_info survive save/load?
const fs = require('fs');
const L = require('./f7-wb-lib.js');
const WORLD = 'w-b57-nbtprobe-v1';

async function boot(tag) {
  for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) await L.sleep(5000);
  const srv = await L.startServer({ root: L.ROOT, tag });
  await srv.waitFor(/Done \(/, 180000);
  await L.sleep(1500);
  return srv;
}

async function cmds(srv, list) {
  for (const c of list) { await srv.send('/' + c); await L.sleep(400); }
}

(async () => {
  const propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  const cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  let props = L.setProp(propsBefore, 'level-name', WORLD);
  fs.writeFileSync(L.PROPS, props, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore.replace(/B:mobDebugLog=(true|false)/, 'B:mobDebugLog=true'), 'utf8');

  let srv = await boot('b57-nbtprobe-b1');
  await cmds(srv, [
    'fill 0 129 0 15 129 15 minecraft:stone',
    'fill 0 130 0 15 132 15 minecraft:air',
    'setblock 3 130 0 minecraft:chest',
    'setblock 15 132 15 minecraft:stone',
    'etest gel ooze 2 130 0 2 b1',
    'tp @e[name=b1,c=1] 2.35 130 0.5',
    'gamemode 1',
    'entitydata @e[name=b1,c=1] {}',
  ]);
  await L.sleep(4000);
  await cmds(srv, ['entitydata @e[name=b1,c=1] {}', 'save-all', 'etest gelstate 2 130 0']);
  await L.sleep(1000);
  const b1 = (srv.all || []).filter((l) => /dissolving|block_feeding|gelstate|Summoned|No entity/.test(l));
  b1.slice(-6).forEach((l) => console.log('[b1]', l.replace(/^\[[^\]]*\] \[[^\]]*\] \[[^\]]*\]: /, '').slice(0, 400)));
  await srv.stop(30000);

  srv = await boot('b57-nbtprobe-b2');
  await cmds(srv, ['etest gelstate 2 130 0', 'entitydata @e[name=b1,c=1] {}', 'testforblock 3 130 0 minecraft:chest']);
  await L.sleep(1200);
  const b2 = (srv.all || []).filter((l) => /dissolving|block_feeding|gelstate|No entity|Successfully found|The block at/.test(l));
  b2.slice(-6).forEach((l) => console.log('[b2]', l.replace(/^\[[^\]]*\] \[[^\]]*\] \[[^\]]*\]: /, '').slice(0, 400)));
  await srv.stop(30000);

  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  process.exit(0);
})().catch((e) => { console.error('[fatal]', e && e.stack || e); process.exit(1); });
