// W-B41 W3 probe: why does the creative sword dig not break the pad in the flag-off boot?
// Boots one throwaway world (w-b41p) and runs three dig variants against fresh dirt pads.
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

async function startBoot() {
  const base = fs.readFileSync(L.PROPS, 'utf8');
  const propsBefore = /level-name=/.test(base) ? L.setProp(base, 'level-name', 'w-b30v') : base + '\nlevel-name=w-b30v\n';
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { note('rm world: ' + e.message); }
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');
  const s = await L.startServer({ root: L.ROOT, tag: 'w-b41p-b1' });
  const done = await s.waitFor(/Done \(/, 480000);
  if (!done) throw new Error('no Done(');
  return { s, propsBefore };
}

async function dig3(label, pos, item, mode) {
  await cmd('gamemode ' + mode + ' ' + A, 500);
  await cmd('replaceitem entity ' + A + ' slot.weapon.mainhand ' + item, 500);
  await cmd('setblock ' + pos.x + ' ' + pos.y + ' ' + pos.z + ' minecraft:dirt', 500);
  await cmd('setblock ' + pos.x + ' ' + (pos.y + 1) + ' ' + pos.z + ' minecraft:air', 400);
  await L.tp(srv, pos.x + 0.5, pos.y + 1, pos.z + 0.5);
  await sleep(1200);
  const before = await L.testBlock(srv, pos.x, pos.y, pos.z, 'minecraft:dirt');
  const held = bot.heldItem ? (bot.heldItem.name + ' x' + bot.heldItem.count) : '(none)';
  note(label + ': mode=' + mode + ' botGameMode=' + bot.game.gameMode + ' held=' + held + ' dirtBefore=' + before.ok);
  const errors = [];
  for (let i = 0; i < 3; i++) {
    const b = bot.blockAt(vec3(pos.x, pos.y, pos.z));
    if (!b) { errors.push('blockAtNull'); await sleep(400); continue; }
    try { await bot.dig(b, true); } catch (e) { errors.push('digErr:' + e.message); }
    await sleep(700);
  }
  const after = await L.testBlock(srv, pos.x, pos.y, pos.z, 'minecraft:air');
  const clientAfter = bot.blockAt(vec3(pos.x, pos.y, pos.z));
  note(label + ': dirtBefore=' + before.ok + ' airAfter=' + after.ok + ' client=' + (clientAfter ? clientAfter.name : 'null') + ' errors=' + JSON.stringify(errors));
}

(async () => {
  const { s, propsBefore } = await startBoot();
  srv = s;
  try {
    bot = await L.joinBot(srv, A);
    await sleep(2500);
    await cmd('gamemode 1 ' + A);
    await cmd('gamerule doMobSpawning false');
    await cmd('kill @e[type=!player]');
    await L.tp(srv, -60.5, 68, 240.5);
    await sleep(1500);

    await dig3('A_sword_creative', { x: -60, y: 67, z: 240 }, 'minecraft:stone_sword 1', 1);
    await dig3('B_hand_creative', { x: -58, y: 67, z: 240 }, 'minecraft:air 1', 1);
    await dig3('C_sword_survival', { x: -56, y: 67, z: 240 }, 'minecraft:stone_sword 1', 0);
  } catch (e) {
    note('FATAL ' + e.message);
  } finally {
    try { if (bot) { bot.quit(); await sleep(1500); } } catch (e) { /* noop */ }
    const st = await srv.stop(120000);
    note('[stop] ' + JSON.stringify(st));
    try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e) { /* noop */ }
    fs.writeFileSync(path.join(L.ROOT, 'testharness', 'build-logs', 'b41-w3-probe.json'), JSON.stringify({ done: true }, null, 2));
  }
})();
