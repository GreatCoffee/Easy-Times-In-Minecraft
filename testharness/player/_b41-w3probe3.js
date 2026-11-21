// W-B41 W3 probe 3: is the creative dig refusal item-specific? Same boot, three items, three pads.
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const vec3 = require('vec3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const A = 'ETIM_F7';
const WORLD = 'w-b41p3';
let srv = null; let bot = null;
function note(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 400 : wait); }

(async () => {
  const base = fs.readFileSync(L.PROPS, 'utf8');
  const propsBefore = /level-name=/.test(base) ? L.setProp(base, 'level-name', 'w-b30v') : base + '\nlevel-name=w-b30v\n';
  const cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');
  for (const [k, v] of Object.entries({ livestockNeedsR196: false, mobDebugLog: true, miningReform: false })) L.setCfgValue(L.CFG, k, v);
  srv = await L.startServer({ root: L.ROOT, tag: 'w-b41p3-b1' });
  if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
  bot = await L.joinBot(srv, A);
  await sleep(2500);
  await cmd('gamemode creative ' + A, 600);
  await cmd('kill @e[type=!player]', 500);
  await sleep(1000);
  note('server playerGameType -> ' + (srv.all.filter((l) => /playerGameType/.test(l)).slice(-1)[0] || '(none)'));

  const cases = [
    { label: 'sword', item: 'minecraft:stone_sword 1', x: -60 },
    { label: 'sword2', item: 'minecraft:stone_sword 1', x: -58 },
    { label: 'hand', item: 'minecraft:air 1', x: -56 }
  ];
  for (const c of cases) {
    await cmd('setblock ' + c.x + ' 67 240 minecraft:dirt', 400);
    await cmd('setblock ' + c.x + ' 68 240 minecraft:air', 400);
    await L.tp(srv, c.x + 0.5, 68, 240.5);
    await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + c.item, 600);
    await sleep(800);
    const gt = srv.all.filter((l) => /playerGameType/.test(l)).slice(-1)[0] || '';
    const errs = [];
    for (let i = 0; i < 4; i++) {
      const b = bot.blockAt(vec3(c.x, 67, 240));
      if (!b) { errs.push('null'); continue; }
      try { await bot.dig(b, true); } catch (e) { errs.push('err:' + e.message); }
      await sleep(700);
    }
    const air = await L.testBlock(srv, c.x, 67, 240, 'minecraft:air');
    note('CASE ' + c.label + ' air=' + air.ok + ' errs=' + JSON.stringify(errs) + ' gt=' + gt.replace(/^.*data: /, ''));
  }
  const gate = srv.all.filter((s) => /swordgate/.test(s)).length;
  note('swordgateRows=' + gate);
})().catch((e) => note('FATAL ' + e.message)).finally(async () => {
  try { if (bot) { bot.quit(); await sleep(1500); } } catch (e) { /* noop */ }
  try { const st = await srv.stop(120000); note('[stop] ' + JSON.stringify(st)); } catch (e) { note('stop err ' + e.message); }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }
  process.exit(0);
});
