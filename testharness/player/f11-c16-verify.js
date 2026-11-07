#!/usr/bin/env node
/**
 * f11-c16-verify.js — W-C16 判窗驱动（会话七跑；主会话写讫）。
 * 判臂（任务书 §2）：W0 boot/mixinFail ／ W1 open drip ≥1 ／ W2 covered =0
 * ／ W3 strength snap（preRows=0→post700ms ≥1）／ W4 set 0.0 拉闸即停。
 * 现场（烟测 r5 三点已定谳）：farmland 雨窗内 set（wheat 压 decay）／
 * weather 命令无效（走 /etest rain）／ramp 由 token 直写消化。
 * json → testharness/build-logs/f11-c16-verify.json
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-c16-verify';
const WORLD = 'w-c16v';
const A = L.BOT;
const TY = 120;
const OPEN = { x: 242, z: 242 };
const COVER = { x: 246, z: 242 };
const STAND = { x: 240, y: 121, z: 240 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv = null;
let propsBefore = null;
let cfgBefore = null;

const since = (n) => srv.all.slice(n).map(L.strip);
const rainRows = (lines) => lines.filter((l) => /\[FarmLog\] moisture .*src=rain/.test(l));
const setRows = (lines) => lines.filter((l) => /\[WeatherLog\] rain set /.test(l));
const probeRows = (lines) => lines.filter((l) => /\[WeatherLog\] rain probe /.test(l));

function parseSet(s) {
  const m = /rain set str=([0-9.]+)/.exec(s);
  return m ? m[1] : null;
}

async function cmd(line, wait) {
  const n = srv.all.length;
  srv.send(line);
  await sleep(wait || 400);
  return { start: n, out: since(n) };
}

(async () => {
  const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
  // props/cal config prep — same shape as the smoke driver
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  // W-C16 (会话七) —— setProp 是纯函数，必须写回；原稿此处未落盘会跑回旧世界
  let pb = L.setProp(propsBefore, 'level-name', WORLD);
  pb = L.setProp(pb, 'max-players', '20');
  fs.writeFileSync(L.PROPS, pb, 'utf8');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  L.setCfgValue(L.CFG, 'weatherDebugLog', 'true');
  L.setCfgValue(L.CFG, 'weatherSystem', 'true'); // schedule-side ramp — token 直写穿透依然成立
  try { fs.rmSync(path.join(L.ROOT, 'run', WORLD), { recursive: true, force: true }); } catch (e) { /* noop */ }

  // ---- boot (single) ----
  srv = await L.startServer({ root: L.ROOT, tag: TAG });
  await srv.waitFor(/Done \(/, 480000);
  const bootLine = (srv.all.find((l) => /Done \(/.test(l)) || '').trim();
  const mixinFail = srv.all.filter((l) =>
    /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure|require.*not found/i.test(l)).length;
  ev.boots.push({ boot: bootLine, mixinFail });
  if (mixinFail > 0) throw new Error('mixinFail=' + mixinFail + ' — abort');

  const bot = await L.joinBot(srv, A);
  // W-C16 会话七 —— 烟测 r5 的 A1/A2 正是 rts 512 下取到 8/2 行；rts 3 下一次
  // random tick 间隔 ~68 s，远长于 1.0→0.2 的强度窗，故必须 512。
  await L.stage(srv, bot, { gamemode: 1, rts: 512 });
  await L.tp(srv, STAND.x, STAND.y, STAND.z, { bot: A });

  // ---- build farm: platform + farmland + wheat (pre-rain; the wet window reset will re-farmland) ----
  const bf = async (line) => { await cmd(line, 220); };
  await bf('kill @e[type=!player]');
  // OPEN cell — farmland + wheat age7 (age 已熟湿地仍在 decay 面 wheat 免 decay)
  await bf(`setblock ${OPEN.x} ${TY - 1} ${OPEN.z} minecraft:cobblestone`);
  await bf(`setblock ${OPEN.x} ${TY} ${OPEN.z} minecraft:farmland 0`);
  await bf(`setblock ${OPEN.x} ${TY + 1} ${OPEN.z} minecraft:wheat 7`);
  // COVER cell — hut walls + roof, then farmland + wheat inside
  await bf(`fill ${COVER.x - 1} ${TY + 1} ${COVER.z - 1} ${COVER.x + 1} ${TY + 3} ${COVER.z + 1} minecraft:stone`);
  await bf(`setblock ${COVER.x} ${TY + 1} ${COVER.z} minecraft:air`);
  await bf(`setblock ${COVER.x} ${TY} ${COVER.z} minecraft:farmland 0`);
  await bf(`setblock ${COVER.x} ${TY + 1} ${COVER.z} minecraft:wheat 7`);
  await bf(`setblock ${COVER.x} ${TY - 1} ${COVER.z} minecraft:cobblestone`);

  // ---- W3: strength snap face — the pre-window zero-row proof ----
  const preRows = rainRows(srv.all.map(L.strip)).length;
  // strength up + re-farmland (the wet face inside the window — wet-0 farmland alive)
  const nSet = srv.all.length;
  // 会话七：set 与 probe 同批下发 —— 1 s 后 vanilla 已按 0.01/tick 下泄，
  // 直接读回只看到 0.66；同批才能取到 R196 prev=current 的 snap 值 1.0000。
  srv.send('etest rain set 1.0');
  srv.send('etest rain probe');
  await sleep(700);
  await bf(`setblock ${OPEN.x} ${TY} ${OPEN.z} minecraft:farmland 0`);
  await bf(`setblock ${COVER.x} ${TY} ${COVER.z} minecraft:farmland 0`);
  await sleep(500);
  srv.send('etest rain probe'); // ~1.2 s 后的下泄见证
  await sleep(700);
  const probes = probeRows(since(nSet));
  const probeVal = (n) => {
    const row = probes[n] || '';
    const m = /rain=([0-9.]+)/.exec(row);
    return m ? m[1] : null;
  };
  const earlyRows = rainRows(since(nSet)).length;
  ev.arms.w3 = { preRows, earlyRows, probeStr: probeVal(0), probeStr2: probeVal(1), setStr: parseSet(setRows(srv.all.map(L.strip))[0] || '') };

  // ---- W1/W2: open drips / covered stays dry ----
  // 会话七：drip 行在 set 后 ~1 s 内就灌满（rts 512：连续 7 次 tick 到 7），
  // 尾窗单独切片必然为 0；按烟测口径取「自 set 起」全段，另留尾段旁证。
  const nWin = srv.all.length;
  await sleep(25000);
  const postSet = since(nSet);
  const tail = since(nWin);
  const openRows = rainRows(postSet).filter((l) => /pos=242,/.test(l)).length;
  const coverRows = rainRows(postSet).filter((l) => /pos=246,/.test(l)).length;
  const allRain = rainRows(srv.all.map(L.strip));
  ev.arms.w1 = {
    openRows,
    openRowsTail: rainRows(tail).filter((l) => /pos=242,/.test(l)).length,
    openRowsAll: allRain.filter((l) => /pos=242,/.test(l)).length,
  };
  ev.arms.w2 = {
    coverRows,
    coverRowsTail: rainRows(tail).filter((l) => /pos=246,/.test(l)).length,
    coverRowsAll: allRain.filter((l) => /pos=246,/.test(l)).length,
  };

  // ---- W4: strength 0 — the drain face ----
  // 会话七：W1 结束时 open 座 moisture 已到 7（不再产 rain 行），若不重置农田，
  // "0 行" 是空证；故拉闸后立刻把两座 farmland 重置为 0，泄流才会现形。
  const nRamp = srv.all.length;
  srv.send('etest rain set 0.0');
  srv.send('etest rain probe');
  await sleep(500);
  await bf(`setblock ${OPEN.x} ${TY} ${OPEN.z} minecraft:farmland 0`);
  await bf(`setblock ${COVER.x} ${TY} ${COVER.z} minecraft:farmland 0`);
  await sleep(12000);
  const after = since(nRamp);
  const probRamp = probeRows(after)[0] || '';
  ev.arms.w4 = {
    rowsAfterRampDown: rainRows(after).length,
    probeStr: (/rain=([0-9.]+)/.exec(probRamp) || [])[1] || null,
    dryRows: after.filter((l) => /src=dry/.test(l)).length,
  };

  // ---- stop & report ----
  if (bot) { try { bot.quit('stop'); } catch (e) { /* noop */ } await sleep(1500); }
  const st = await srv.stop(15000);
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => /BUILD SUCCESSFUL/.test(l)) });

  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  const out = path.join(L.OUT, TAG + '.json');
  fs.writeFileSync(out, JSON.stringify(ev, null, 2), 'utf8');
  console.log('[done] ' + JSON.stringify(ev.arms));
  console.log('[out] ' + out);
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { fs.writeFileSync(L.PROPS, propsBefore, 'utf8'); } catch (e2) { /* noop */ }
  try { fs.writeFileSync(L.CFG, cfgBefore, 'utf8'); } catch (e3) { /* noop */ }
  process.exitCode = 1;
});
