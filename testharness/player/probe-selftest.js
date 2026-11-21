#!/usr/bin/env node
/**
 * probe-selftest — 只验证「console testfor 盒轮询」这一条通道是否可用（60 s 级微测）。
 *
 * 背景（r7/r8 定谳）：testforBox 在 r7/r8 里对同一时刻日志明确写出的 `Found ETIM_F7`
 * 都读成 false。控制面是 gradle stdout 的 tee（server-console.js），stdin 下发命令，
 * 回显经 gradle --console=plain 后才进 all[]，滞后常 >150 ms ⇒ 固定 sleep 切片永远
 * 错拍。本脚本改用「say 序号打标 + 从标记行往后读第一条 Found/found nothing」的
 * 同步口径，先在三组盒子上验证：
 *   A) @e[type=player,name=ETIM_F7]                 （无盒，名字选择器）
 *   B) @e[type=player,name=ETIM_F7,x=-70,y=66,z=241,dx=8,dy=4,dz=4]（盒 + 名字）
 *   C) @e[type=zombie,x=-72,y=66,z=240,dx=4,dy=4,dz=4]             （盒 + 刚 summon 的僵尸）
 *   D) @e[type=zombie,x=-67.7,y=67,z=242,dx=0.7,dy=1,dz=0.99]      （门前窄带，此时应为 false）
 */
const L = require('./f7-wb-lib.js');
const TAG = 'probe-selftest';
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
  let waited = 0;
  while (Date.now() - t0 < 4000) {
    await sleep(50);
    waited = Date.now() - t0;
    if (mark < 0) {
      for (let i = from; i < srv.all.length; i++) {
        if (srv.all[i].indexOf(id) >= 0) { mark = i; break; }
      }
    }
    if (mark >= 0) {
      for (let i = mark + 1; i < srv.all.length; i++) {
        const s = srv.all[i];
        if (/: Found \S+/.test(s)) return { hit: true, waited, lag: Date.now() - t0 - waited };
        if (/cannot be found|found nothing|No entity/i.test(s)) return { hit: false, waited, lag: Date.now() - t0 - waited };
      }
    }
  }
  return { hit: null, waited, lag: -1, timeout: true };
}

(async () => {
  for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const done = await srv.waitFor(/Done \(/, 300000);
  console.log('[boot] ' + String(done).slice(0, 80));
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  srv.send('gamerule doMobSpawning false');
  await sleep(400);
  srv.send('kill @e[type=!player]');
  await sleep(1200);
  srv.send(`tp ${A} -69.5 67 242.5`);
  await sleep(1200);
  srv.send('summon zombie -70 67 242 {CanBreakDoors:1b}');
  await sleep(1500);

  const cases = {
    A_plainPlayer: `@e[type=player,name=${A}]`,
    B_boxPlayer: `@e[type=player,name=${A},x=-70,y=66,z=241,dx=8,dy=4,dz=4]`,
    C_boxZombie: `@e[type=zombie,x=-72,y=66,z=240,dx=4,dy=4,dz=4]`,
    D_narrowBand: `@e[type=zombie,x=-67.7,y=67,z=242,dx=0.7,dy=1,dz=0.99]`,
    E_plainZombie: `@e[type=zombie]`,
  };
  const out = {};
  for (const [k, sel] of Object.entries(cases)) {
    out[k] = await testforBox(sel);
    console.log('[case] ' + k + ' ' + JSON.stringify(out[k]));
    await sleep(300);
  }
  // 连发 5 次同一盒子，看稳定性与错拍
  const rep = [];
  for (let i = 0; i < 5; i++) { rep.push((await testforBox(cases.E_plainZombie)).hit); await sleep(120); }
  console.log('[repeat] ' + JSON.stringify(rep));

  try { bot.quit(); } catch (e) { /* noop */ }
  await sleep(1500);
  const st = await srv.stop(60000);
  console.log('[stop] ' + JSON.stringify(st));
  process.exit(0);
})().catch(async (e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (bot) bot.quit(); } catch (err) { /* noop */ }
  try { if (srv) await srv.stop(20000); } catch (err) { /* noop */ }
  process.exit(1);
});
