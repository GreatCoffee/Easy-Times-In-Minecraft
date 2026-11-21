#!/usr/bin/env node
/**
 * probe-gate-race — 门开着追一格，进门前一格就关（90 s 级微测，全整数盒）。
 *
 * r9/probe-gate-stop 已证：**关门太早 ⇒ 僵尸完全不动**（path 从未建立；关门栏门在
 * WalkNodeProcessor :498 判 FENCE，永不升级 WALKABLE）⇒ 没有 collidedHorizontally。
 * 本脚本反过来：门一直开，用整数盒 X2[-69,-68] / X3[-68,-67] / X4[-67,-66] 每 ~0.45 s
 * 追一轮，第一次命中 X3（距门一格）就立刻关门，然后继续追 12 轮看它是继续前撞还是停住，
 * 并统计 [AILog] breakdoor start / probe-in 与 bot 受伤数。
 */
const L = require('./f7-wb-lib.js');
const TAG = 'probe-gate-race';
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
const CELLS = { X2: cell(-69), X3: cell(-68), X4: cell(-67), X5: cell(-66) };

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

  let closed = false;
  for (let round = 0; round < 24; round++) {
    const row = { sec: ((Date.now() - t0) / 1000).toFixed(2), closed };
    for (const [k, sel] of Object.entries(CELLS)) row[k] = (await testforBox(sel)) ? 1 : 0;
    if (!closed && row.X3 === 1) {
      srv.send('setblock -67 67 242 minecraft:fence_gate 0');
      closed = true;
      row.closed = 'now';
    }
    console.log('[track] ' + JSON.stringify(row));
    if (closed && round > 16) break;
  }
  const rows = srv.all.filter((l) => l.indexOf('breakdoor src=zombie') >= 0);
  console.log('[ai] start=' + rows.filter((l) => l.indexOf(' start ') >= 0).length + ' probe=' + rows.filter((l) => l.indexOf(' probe-in ') >= 0).length + ' break=' + rows.filter((l) => l.indexOf(' break ') >= 0).length);
  console.log('[dmg] ' + srv.all.filter((l) => l.indexOf('dmg target=' + A) >= 0).length);
  console.log('[gate] ' + JSON.stringify(await (async () => { const a = srv.all.slice().reverse(); return a.find((l) => l.indexOf('minecraft:fence_gate') >= 0) ? 'see-log' : 'n/a'; })()));
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
