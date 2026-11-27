// W-B41 W3 probe 2: with livestockNeedsR196=false on the server, can a creative sword break dirt?
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');
const vec3 = require('vec3');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const A = 'ETIM_F7';
const WORLD = 'w-b41p';

let srv = null;
let bot = null;
function note(m) { console.log('[' + new Date().toISOString() + '] ' + m); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 400 : wait); }

(async () => {
  const base = fs.readFileSync(L.PROPS, 'utf8');
  const propsBefore = /level-name=/.test(base) ? L.setProp(base, 'level-name', 'w-b30v') : base + '\nlevel-name=w-b30v\n';
  const cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { note('rm: ' + e.message); }
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');
  for (const [k, v] of Object.entries({ livestockNeedsR196: false, mobDebugLog: true, miningReform: false })) L.setCfgValue(L.CFG, k, v);
  note('cfg effective: ' + JSON.stringify({ livestockNeedsR196: L.cfgKeys(L.CFG).livestockNeedsR196, miningReform: L.cfgKeys(L.CFG).miningReform, mobDebugLog: L.cfgKeys(L.CFG).mobDebugLog }));
  srv = await L.startServer({ root: L.ROOT, tag: 'w-b41p2-b1' });
  const done = await srv.waitFor(/Done \(/, 480000);
  if (!done) throw new Error('no Done(');
  bot = await L.joinBot(srv, A);
  await sleep(2500);
  await cmd('gamemode creative ' + A, 600);
  await cmd('gamerule doMobSpawning false');
  await cmd('kill @e[type=!player]', 600);
  await L.tp(srv, -60.5, 68, 240.5);
  await sleep(1500);
  await cmd('setblock -60 67 240 minecraft:dirt', 500);
  await cmd('setblock -60 68 240 minecraft:air', 400);
  await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand minecraft:stone_sword 1', 600);
  await sleep(600);
  note('botGameMode=' + bot.game.gameMode + ' held=' + (bot.heldItem ? bot.heldItem.name : 'none'));
  await cmd('data get entity ' + A + ' playerGameType', 600);
  const errors = [];
  for (let i = 0; i < 3; i++) {
    const b = bot.blockAt(vec3(-60, 67, 240));
    if (!b) { errors.push('null'); continue; }
    try { await bot.dig(b, true); } catch (e) { errors.push('err:' + e.message); }
    await sleep(700);
  }
  const after = await L.testBlock(srv, -60, 67, 240, 'minecraft:air');
  const gate = srv.all.filter((s) => /swordgate/.test(s)).length;
  note('RESULT airAfter=' + after.ok + ' errors=' + JSON.stringify(errors) + ' swordgateRows=' + gate);
})().catch((e) => note('FATAL ' + e.message)).finally(async () => {
  try { if (bot) { bot.quit(); await sleep(1500); } } catch (e) { /* noop */ }
  try { const st = await srv.stop(120000); note('[stop] ' + JSON.stringify(st)); } catch (e) { note('stop err ' + e.message); }
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e) { /* noop */ }
  process.exit(0);
});
