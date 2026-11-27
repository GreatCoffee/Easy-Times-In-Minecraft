#!/usr/bin/env node
/**
 * f11-b15-verify.js — session-seven verdict driver for B-15
 * (free-action shred face, 条 321/322). Judge arms:
 *   W0: one fresh boot (flag on + EnchLog gate) — Done, mixinFail=0.
 *   W1a: slow potion with NO free_action gear → zero shred rows (vanilla).
 *   W1b: legs free_action L1 → row level=1 amountRaw=-0.1500 shred=-0.1200.
 *   W1c: legs free_action L4 → row level=4 shred=-0.0300.
 *   W2: cfg flip freeActionShredR196=false (boot2) → L4 gear → zero rows.
 * Emits testharness/build-logs/f11-b15-verify.json.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');

const TAG = 'f11-b15-verify';
const WORLD_A = 'w-b15v';
const WORLD_B = 'w-b15vb';
const A = 'ETIM_F7';
const STAND = { x: 540, y: 71, z: 540 };

const ev = { tag: TAG, boots: [], W: {}, stopBoots: [] };
let srv = null;
let bot = null;
let propsBefore = null;
let cfgBefore = null;
const sleep = L.sleep;
const since = (n) => srv.all.slice(n).map(L.strip);
const cmd = async (line, wait) => { srv.send(line); await sleep(wait === undefined ? 500 : wait); };
const shredRows = (lines) => lines.filter((l) => l.indexOf('free_action src=slowdownShred') >= 0);
const kv = (line) => {
  const out = {};
  line.replace(/\[.*?\]\s*/, '').split(/\s+/).forEach((t) => {
    const i = t.indexOf('=');
    if (i > 0) out[t.slice(0, i)] = t.slice(i + 1);
  });
  return out;
};
const num = (v) => (v === undefined ? NaN : parseFloat(v));

async function startBoot(tag, world, cfg) {
  propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  fs.rmSync(path.join('run', world), { recursive: true, force: true });
  let props = fs.readFileSync(L.PROPS, 'utf8');
  props = /level-name=/.test(props) ? L.setProp(props, 'level-name', world) : props + '\nlevel-name=' + world + '\n';
  fs.writeFileSync(L.PROPS, props, 'utf8');
  if (cfg) for (const [k, v] of Object.entries(cfg)) L.setCfgValue(L.CFG, k, v);
  // C-15-2 (W-B15 回执): per-boot cfg block rides the ev record — the
  // flag-off arm's zero-row verdict carries its own witness instead of
  // leaning on b2 log rows alone.
  const KYS = ['freeActionShredR196', 'enchantDebugLog'];
  const cfgBlock = { levelName: world };
  for (const k of KYS) {
    cfgBlock[k] = cfg && (k in cfg) ? String(cfg[k])
      : (((cfgBefore.match(new RegExp('^B:' + k + '=(\\w+)', 'm')) || [])[1]) || 'absent');
  }
  ev.boots.push({ tag, world, cfg: cfgBlock });
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

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  ev.stopBoots.push({ exitCode: st.exitCode, exited: st.exited, build: srv.all.some((l) => L.strip(l).includes('BUILD SUCCESSFUL')) });
  fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
}

async function stageBot() {
  bot = await L.joinBot(srv, A);
  await L.stage(srv, bot, { gamemode: 1, rts: 3 });
  await cmd('kill @e[type=!player]', 700);
  await cmd('tp ' + A + ' ' + STAND.x + ' ' + STAND.y + ' ' + STAND.z, 700);
  await cmd('gamerule doMobSpawning false', 400);
  await cmd('effect ' + A + ' clear', 400);
}

(async () => {
  // W0-W1 boot
  srv = await startBoot(TAG + '-b1', WORLD_A, { freeActionShredR196: true, enchantDebugLog: true });
  const mixFail = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail });
  await stageBot();

  await cmd('replaceitem entity ' + A + ' slot.armor.legs minecraft:iron_leggings 1 0', 600);
  const n0 = srv.all.length;

  // W1a
  await cmd('effect ' + A + ' 2 30 0', 800);
  await sleep(2500);
  const r1a = shredRows(since(n0));
  ev.W.W1a = { rowCount: r1a.length };
  await cmd('effect ' + A + ' clear', 500);

  // W1b (L1)
  const n1 = srv.all.length;
  await cmd('etest enchant legs 1 ' + A + ' freeAction', 800);
  await sleep(700);
  await cmd('effect ' + A + ' 2 30 0', 800);
  await sleep(2500);
  const r1b = shredRows(since(n1));
  const kb = r1b.length ? kv(r1b[0]) : null;
  ev.W.W1b = { rowCount: r1b.length, kv: kb,
    match: !!kb && r1b.length === 1 && kb.level === '1' &&
      Math.abs(num(kb.amountRaw) + 0.15) < 0.0005 && Math.abs(num(kb.amountShred) + 0.12) < 0.0005 };
  await cmd('etest enchant legs 4 ' + A + ' freeAction', 800); // escalate in place
  await sleep(700);

  // W1c (L4 fresh row)
  const n2 = srv.all.length;
  await cmd('effect ' + A + ' 2 30 0', 800);
  await sleep(2500);
  const r1c = shredRows(since(n2));
  const kc = r1c.length ? kv(r1c[r1c.length - 1]) : null;
  ev.W.W1c = { rowCount: r1c.length, kv: kc,
    match: !!kc && r1c.length === 1 && kc.level === '4' &&
      Math.abs(num(kc.amountRaw) + 0.15) < 0.0005 && Math.abs(num(kc.amountShred) + 0.03) < 0.0005 };
  await cmd('effect ' + A + ' clear', 500);
  await cmd('replaceitem entity ' + A + ' slot.armor.feet minecraft:air 1 0', 500);
  await stopBoot();

  // W2 boot (flag off)
  srv = await startBoot(TAG + '-b2', WORLD_B, { freeActionShredR196: false, enchantDebugLog: true });
  const mixFail2 = srv.all.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/i.test(l)).length;
  ev.boots.push({ boot: (srv.all.find((l) => /Done \(/.test(l)) || '').trim(), mixinFail: mixFail2 });
  await stageBot();
  await cmd('replaceitem entity ' + A + ' slot.armor.legs minecraft:iron_leggings 1 0', 600);
  await cmd('etest enchant legs 4 ' + A + ' freeAction', 800);
  await sleep(700);
  await cmd('effect ' + A + ' clear', 500);
  const n3 = srv.all.length;
  await cmd('effect ' + A + ' 2 30 0', 800);
  await sleep(2500);
  const r2 = shredRows(since(n3));
  ev.W.W2 = { rowCount: r2.length, rows: r2.map(kv) };
  await cmd('effect ' + A + ' clear', 500);
  await stopBoot();

  ev.ok =
    ev.boots[0].mixinFail === 0 && ev.boots[1].mixinFail === 0 &&
    ev.boots[0].boot.includes('Done') && ev.boots[1].boot.includes('Done') &&
    ev.stopBoots.every((s) => s.exitCode === 0 && s.build) &&
    ev.W.W1a.rowCount === 0 && ev.W.W1b.match && ev.W.W1c.match && ev.W.W2.rowCount === 0;

  const out = path.join(L.OUT, TAG + '.json');
  fs.writeFileSync(out, JSON.stringify(ev, null, 2));
  console.log('[' + (ev.ok ? 'OK' : 'FAIL') + '] ' + out);
  if (!ev.ok) process.exitCode = 2;
})().catch((e) => {
  console.error('[fatal] ' + (e && e.stack || e));
  try { if (srv) srv.send('stop'); } catch (e2) { /* noop */ }
  process.exitCode = 1;
});
