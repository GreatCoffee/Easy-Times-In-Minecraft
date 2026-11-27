#!/usr/bin/env node
/**
 * probe-gate-track — 追一只僵尸在栅栏门前的真实轨迹（90 s 级微测）。
 *
 * 背景：r7/r8 的窄带轮询（x∈[-67.7,-67.0]）整臂 0 命中，但 DamageLog 证明僵尸确实
 * 到了 bot 近旁（bot 在 -64.4）⇒ 要么它没走 z=242 这条线，要么窄带窗口被跳过。
 * 本脚本用「say 打标 + 从标记行后读第一条 Found/found nothing」的同步口径（已在
 * probe-selftest 验证可靠），对同一只僵尸并发测五组盒子，每 250 ms 一轮，共 30 轮：
 *   W0 全西屋   x=-72..-67.6 (dx 4.4)  —— 出发区
 *   W1 门前宽带 x=-68.6..-66.6 (dx 2.0)
 *   W2 门前窄带 x=-67.7..-67.0 (dx 0.7)  —— r7/r8 用的那条
 *   W3 门东侧   x=-67.0..-65.6 (dx 1.4)
 *   W4 全带     x=-69.0..-65.0 (dx 4.0)
 * 全部 z∈[241.6,242.9]、y∈[66.8,68.0]。
 */
const L = require('./f7-wb-lib.js');
const TAG = 'probe-gate-track';
const A = 'ETIM_F7';
const X = -67, Y = 67, Z = 242;

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
        const s = srv.all[i];
        if (/: Found \S+/.test(s)) return true;
        if (/cannot be found|found nothing|No entity/i.test(s)) return false;
      }
    }
  }
  return null;
}

const box = (x0, x1) => `@e[type=zombie,x=${x0},y=66.8,z=241.6,dx=${(x1 - x0).toFixed(2)},dy=1.2,dz=1.3]`;
const PROBES = {
  W0_west: box(-72, -67.6),
  W1_wide: box(-68.6, -66.6),
  W2_narrow: box(-67.7, -67.0),
  W3_east: box(-67.0, -65.6),
  W4_all: box(-69.0, -65.0),
};

(async () => {
  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  console.log('[boot] ' + String(await srv.waitFor(/Done \(/, 300000)).slice(0, 70));
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  srv.send('gamerule doMobSpawning false'); await sleep(300);
  srv.send('gamerule mobGriefing true'); await sleep(300);
  srv.send('difficulty hard'); await sleep(400);
  srv.send('kill @e[type=!player]'); await sleep(900);
  srv.send(`tp ${A} -64.4 67 242.5`); await sleep(800);
  srv.send(`effect ${A} minecraft:resistance 9999 4 true`); await sleep(300);
  srv.send(`effect ${A} minecraft:regeneration 9999 4 true`); await sleep(300);
  srv.send(`effect ${A} minecraft:absorption 9999 4 true`); await sleep(300);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  // 场地：确保 y66 台面与 y67 空气、门洞 open
  srv.send('fill -74 66 237 -64 66 247 minecraft:cobblestone'); await sleep(700);
  srv.send('fill -74 67 237 -64 71 247 minecraft:air'); await sleep(700);
  srv.send(`setblock ${X} ${Y} ${Z} minecraft:fence_gate 4`); await sleep(600);
  const t0 = Date.now();
  srv.send('summon zombie -70 67 242 {CanBreakDoors:1b}');
  console.log('[summon] ' + new Date(t0).toISOString().slice(11, 23));

  const track = [];
  for (let round = 0; round < 30; round++) {
    const row = { sec: ((Date.now() - t0) / 1000).toFixed(2) };
    for (const [k, sel] of Object.entries(PROBES)) row[k] = await testforBox(sel);
    track.push(row);
    console.log('[track] ' + JSON.stringify(row));
  }
  const dmg = srv.all.filter((l) => l.indexOf('dmg target=' + A) >= 0).length;
  console.log('[dmg] ' + dmg);
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
