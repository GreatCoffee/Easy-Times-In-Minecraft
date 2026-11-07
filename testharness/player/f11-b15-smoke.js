#!/usr/bin/env node
/**
 * f11-b15-smoke.js — free-action shred batch (B-15) smoke driver.
 * One flat world, one bot: the legs slot wears free_action gear at L0/1/4
 * and drinks the SLOWNESS potion; the shred (R196 Potion :244-249, amount
 * × (1 − L×0.8/4)) reads off the [EnchLog] free_action src=slowdownShred
 * rows. Boot2 flips freeActionShredR196=false → zero shred rows.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b15-smoke';
const WORLD = 'w-b15a';
const WORLD2 = 'w-b15b';
const A = 'ETIM_F7';
const TY = 120;
const STAND = { x: 240, y: TY + 1, z: 240 };

const ev = { tag: TAG, boots: [], arms: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;
let props2 = null;

const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 400 : wait); };
const enchRows = (lines) => lines.filter((l) => l.indexOf('[EnchLog]') >= 0);
const shredRows = (lines) => lines.filter((l) => l.indexOf('free_action src=slowdownShred') >= 0);
const kv = (line) => {
  const out = {};
  line.replace(/\[.*?\]\s*/, '').split(/\s+/).forEach((t) => {
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i)] = t.slice(i + 1);
  });
  return out;
};

async function startBoot(tag, world, cfg) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join('run', world), { recursive: true, force: true });
  // B-15: the current props snapshot may lack level-name (obf-boot restore
  // wrote a level-seed-only props) — write it on the boot basis.
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props)
    ? L.setProp(props, 'level-name', world)
    : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', world); // sanity re-read (throws if broken)
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  let s = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held after the 300s gate — aborting, no collide boot');
    s = await L.startServer({ root: L.ROOT, tag });
    const done = await s.waitFor(/Done \(/, 480000);
    if (done) return s;
    try { await s.stop(30000); } catch (e) { /* noop */ }
    s = null;
  }
  throw new Error(tag + ': no Done( in 3 attempts');
}

async function stopBoot(b) {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
}

(async () => {
  // ---------------- boot 1 (flag on) ----------------
  srv = await startBoot(TAG + '-b1', WORLD, { freeActionShredR196: true, enchantDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  bot = await L.joinBot(srv, A);

  await L.stage(srv, bot, { gamemode: 1, rts: 3 });
  await cmd('kill @e[type=!player]', 600);
  await cmd('tp ' + A + ' ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 600);
  await cmd('gamerule doMobSpawning false', 300);

  // legs gear + the potion stage
  await cmd('replaceitem entity ' + A + ' slot.armor.legs minecraft:iron_leggings 1 0', 500);
  await cmd('effect ' + A + ' clear', 400);
  const n0 = srv.all.length;

  // R1a: no free_action → vanilla apply, zero shred rows
  await cmd('effect ' + A + ' 2 30 0', 700);
  await sleep(2500);
  const r1a = shredRows(since(n0));
  ev.arms.r1a = { shredRowCount: r1a.length };
  await cmd('effect ' + A + ' clear', 500);

  // R1b: legs free_action L1 → amount -0.15 → shred ×0.8 = -0.12
  const n1 = srv.all.length;
  await cmd('etest enchant legs 1 ' + A + ' freeAction', 700);
  await sleep(600);
  await cmd('effect ' + A + ' 2 30 0', 700);
  await sleep(2500);
  const r1b = shredRows(since(n1));
  ev.arms.r1b = { rowCount: r1b.length, kvs: r1b.map(kv) };
  await cmd('effect ' + A + ' clear', 500);

  // R1c: L4 → shred ×(1 − 3.2/4 = 0.2) = -0.03
  const n2 = srv.all.length;
  await cmd('etest enchant legs 4 ' + A + ' freeAction', 700);
  await sleep(600);
  await cmd('effect ' + A + ' 2 30 0', 700);
  await sleep(2500);
  const r1c = shredRows(since(n2));
  ev.arms.r1c = { rowCount: r1c.length, kvs: r1c.map(kv) };
  await cmd('effect ' + A + ' clear', 500);

  await stopBoot();

  // ---------------- boot 2 (flag off) ----------------
  srv = await startBoot(TAG + '-b2', WORLD2, { freeActionShredR196: false, enchantDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 1, rts: 3 });
  await cmd('tp ' + A + ' ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 600);
  await cmd('replaceitem entity ' + A + ' slot.armor.legs minecraft:iron_leggings 1 0', 500);
  await cmd('etest enchant legs 4 ' + A + ' freeAction', 700);
  await sleep(600);
  await cmd('effect ' + A + ' clear', 400);
  const n3 = srv.all.length;
  await cmd('effect ' + A + ' 2 30 0', 700);
  await sleep(2500);
  const r2 = shredRows(since(n3));
  ev.arms.r2 = { shredRowCount: r2.length, rows: r2.map(kv) };
  await cmd('effect ' + A + ' clear', 500);

  await stopBoot();

  ev.ok =
    ev.arms.r1a.shredRowCount === 0 &&
    ev.arms.r1b.rowCount === 1 && ev.arms.r1b.kvs[0] && ev.arms.r1b.kvs[0].level === '1' &&
    Math.abs(parseFloat(ev.arms.r1b.kvs[0].amountShred) + 0.12) < 0.0005 &&
    ev.arms.r1c.rowCount === 1 && ev.arms.r1c.kvs[0] && ev.arms.r1c.kvs[0].level === '4' &&
    Math.abs(parseFloat(ev.arms.r1c.kvs[0].amountShred) + 0.03) < 0.0005 &&
    ev.arms.r2.shredRowCount === 0;

  const out = path.join(L.OUT, TAG + '.json');
  fs.writeFileSync(out, JSON.stringify(ev, null, 2));
  console.log('[' + (ev.ok ? 'OK' : 'FAIL') + '] ' + out);
  if (!ev.ok) process.exitCode = 2;
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) srv.send('stop'); } catch (e2) { /* noop */ }
  process.exitCode = 1;
});
