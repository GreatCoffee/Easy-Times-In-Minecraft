#!/usr/bin/env node
/**
 * probe-gate-stop — 关门后僵尸到底停在哪一格（90 s 级微测，全整数盒）。
 *
 * 背景：r9 四循环 `zombieWest=true` 说明关门及时、僵尸仍在门西侧，但仍 0 start。
 * 假设：关门后 `WalkNodeProcessor` 把关门栏门判为 FENCE（build/rfg 源 :498 只有
 * 开门栏门才不是 FENCE；:359 的 WALKABLE 升级只给 DOOR_WOOD_CLOSED，栏门永不升级）
 * ⇒ 僵尸的 path 停在门前一格，不产生 collidedHorizontally。
 * 本脚本用整数盒逐格追踪：
 *   X0 [-71,-70] X1 [-70,-69] X2 [-69,-68] X3 [-68,-67] X4 [-67,-66] X5 [-66,-65]
 * 每轮 6 盒 ≈ 0.9 s，20 轮；关门定在 summon 后 400 ms。
 */
const L = require('./f7-wb-lib.js');
const TAG = 'probe-gate-stop';
const A = 'ETIM_F7';
let srv = null;
let bot = null;
let seq = 0;
const sleep = L.sleep;

async function testforBox(sel) {
  const id = 'zz' + (++seq) + 'zz';
  const from = srv.all.length;
  srv.send('say ' + id);
  srv.send('testfor ' + sel);
  const t0 = Date.now();
  let mark = -1;
  while (Date.now() - t0 < 2500) {
    await sleep(40);
    if (mark < 0) {
      for (let i = from; i < srv.all.length; i++) if (srv.all[i].indexOf(id) >= 0) { mark = i; break; }
    }
    if (mark >= 0) {
      for (let i = mark + 1; i < srv.all.length; i++) {
        const s = L.strip(srv.all[i]);
        if (/^Found \S+/.test(s)) return true;
        if (/cannot be found|found nothing|No entity/i.test(s)) return false;
      }
    }
  }
  return null;
}

const cell = (x0) => `@e[type=zombie,x=${x0},y=67,z=242,dx=1,dy=1,dz=1]`;
const CELLS = { X0: cell(-71), X1: cell(-70), X2: cell(-69), X3: cell(-68), X4: cell(-67), X5: cell(-66) };

(async () => {
  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  console.log('[boot] ' + String(await srv.waitFor(/Done \(/, 300000)).slice(0, 60));
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  srv.send('gamerule doMobSpawning false'); await sleep(250);
  srv.send('gamerule mobGriefing true'); await sleep(250);
  srv.send('difficulty hard'); await sleep(300);
  srv.send('time set 18000'); await sleep(400);
  srv.send('kill @e[type=!player]'); await sleep(900);
  srv.send('fill -74 66 237 -64 66 247 minecraft:cobblestone'); await sleep(500);
  srv.send('fill -74 67 237 -64 71 247 minecraft:air'); await sleep(500);
  srv.send(`tp ${A} -64.4 67 242.5`); await sleep(600);
  srv.send(`effect ${A} minecraft:resistance 9999 4 true`); await sleep(250);
  srv.send(`effect ${A} minecraft:regeneration 9999 4 true`); await sleep(250);
  srv.send(`effect ${A} minecraft:absorption 9999 4 true`); await sleep(250);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  srv.send('setblock -67 67 242 minecraft:fence_gate 4'); await sleep(600);
  const t0 = Date.now();
  srv.send('summon zombie -70 67 242 {CanBreakDoors:1b}');
  await sleep(400);
  srv.send('setblock -67 67 242 minecraft:fence_gate 0');
  console.log('[closed] sec=' + ((Date.now() - t0) / 1000).toFixed(2));

  for (let round = 0; round < 20; round++) {
    const row = { sec: ((Date.now() - t0) / 1000).toFixed(2) };
    for (const [k, sel] of Object.entries(CELLS)) row[k] = (await testforBox(sel)) ? 1 : 0;
    console.log('[track] ' + JSON.stringify(row));
  }
  await sleep(15000);
  const rows = srv.all.filter((l) => l.indexOf('breakdoor src=zombie') >= 0);
  console.log('[ai] start=' + rows.filter((l) => l.indexOf(' start ') >= 0).length + ' probe=' + rows.filter((l) => l.indexOf(' probe-in ') >= 0).length);
  console.log('[dmg] ' + srv.all.filter((l) => l.indexOf('dmg target=' + A) >= 0).length);
  try { bot.quit(); } catch (e) { /* noop */ }
  await sleep(1500);
  console.log('[stop] ' + JSON.stringify(await srv.stop(60000)));
  process.exit(0);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) bot.quit(); } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  process.exit(1);
});
