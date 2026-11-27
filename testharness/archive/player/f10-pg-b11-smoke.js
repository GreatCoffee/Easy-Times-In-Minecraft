#!/usr/bin/env node
/**
 * f10-pg-b11-smoke.js — animalFoodPickup batch (B-11) main-session smoke v5.
 * v4 lessons folded in: console-side /kill with a radius anchors at (0,0,0)
 * and kills NOTHING (the b2 window C-10b2 taught absolute-boxKill) — every
 * kill in v5 uses an absolute anchor; the fresh cow gets a real replacement;
 * the walk face samples the cow's position as the arrival track. Faces:
 * S1 walk arm (wheat 5 blocks away → [AILog] foodseek start + arrival
 * serve), S2 family-gate deny + uneaten item, S3 the cooldown face via the
 * forced ground=401 token (exactly one serve; natural arm pre-empted by the
 * absolute cleanup), S3b the love arm (water=1.0 seed + cd=401 → love=true),
 * S4 not-food stone → zero rows, S5 hand-feed zero regression with an
 * inline survival switch. Rows only — no GUI faces.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-b11-smoke';
const WORLD = 'f10pgb13';
const FX = 297, FZ = 847, TY = 100;
const COW_X = FX + 3.5, COW_Z = FZ + 4.5;           // the pen cow spot
const FAR_X = FX + 8.9, FAR_Z = FZ + 2.9;           // 5+ blocks from the cow spot
const NEAR_X = FX + 3.9, NEAR_Z = FZ + 4.9;         // inside the pickup box
let ev = { tag: TAG, startedAt: new Date().toISOString(), logs: [] };

async function main() {
  fs.mkdirSync(L.OUT, { recursive: true });
  L.setCfgValue(L.CFG, 'mobDebugLog', 'true');
  L.setCfgValue(L.CFG, 'farmDebugLog', 'true');
  fs.writeFileSync(L.PROPS, L.setProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name', WORLD), 'utf8');

  const srv = await L.startServer({ root: L.ROOT, tag: TAG });
  const mark = () => srv.all.length;
  const rowsFrom = (from) => srv.all.slice(from).map(L.strip);
  try {
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done(');
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l))).trim();
    ev.mixinFail = srv.all.filter((l) => /Mixin apply failed|InvalidInjectionException/.test(l)).length;
    L.log('boot', ev.boot + ' mixin=' + ev.mixinFail);
    if (ev.mixinFail) throw new Error('mixin apply failed — abort');

    const bot = await L.joinBot(srv);
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: bot.username, wait: 1800 });

    srv.send('kill @e[type=!player]');
    await L.sleep(1500);
    srv.send('gamerule randomTickSpeed 0');
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:air 0`);
    await L.sleep(900);
    srv.send(`fill ${FX} ${TY - 1} ${FZ} ${FX + 12} ${TY - 1} ${FZ + 12} minecraft:dirt 0`);
    srv.send(`fill ${FX} ${TY} ${FZ} ${FX + 12} ${TY} ${FZ + 12} minecraft:grass 0`);
    await L.sleep(900);
    srv.send(`fill ${FX} ${TY + 1} ${FZ} ${FX + 12} ${TY + 1} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 1} ${FZ + 1} ${FX + 11} ${TY + 1} ${FZ + 11} minecraft:air 0`);
    srv.send(`fill ${FX} ${TY + 2} ${FZ} ${FX + 12} ${TY + 2} ${FZ + 12} minecraft:cobblestone 0`);
    srv.send(`fill ${FX + 1} ${TY + 2} ${FZ + 1} ${FX + 11} ${TY + 2} ${FZ + 11} minecraft:air 0`);
    await L.sleep(1200);

    const guardFrom = mark();
    srv.send(`summon minecraft:cow ${COW_X} ${TY + 1} ${COW_Z}`);
    await L.sleep(2500);
    const wallRows = rowsFrom(guardFrom).filter((l) => /inWall/.test(l));
    if (wallRows.length) throw new Error('pen animal suffocating (inWall) — staging broken');
    L.log('pen', 'inWall=' + wallRows.length);

    /** absolute-box kills (the console shortcut is a (0,0,0) no-op). */
    const killCow = async () => {
      srv.send(`kill @e[type=minecraft:cow,x=${COW_X},y=${TY + 1},z=${COW_Z},r=8]`);
      await L.sleep(900);
    };
    const killGroundItems = async () => {
      srv.send(`kill @e[type=item,x=${COW_X},y=${TY + 1},z=${COW_Z},r=12]`);
      await L.sleep(700);
    };
    const seed = async (toks, rad) => { srv.send(`etest prod ${L.BOT} ${rad || 6} ` + toks); await L.sleep(1000); };
    const dropItem = async (item, x, z) => {
      srv.send(`summon minecraft:item ${x} ${TY + 1} ${z} {Item:{id:"${item}",Count:1b}}`);
      await L.sleep(900);
    };
    const freshCow = async () => {
      await killCow();
      srv.send(`summon minecraft:cow ${COW_X} ${TY + 1} ${COW_Z}`);
      await L.sleep(2200);
      const c = Object.values(bot.entities || {})
        .filter((e) => e && e.name === 'cow' && e.position
          && Math.abs(e.position.x - COW_X) < 5 && Math.abs(e.position.z - COW_Z) < 5)
        .sort((a, b) => b.id - a.id)[0];
      if (!c) throw new Error('fresh cow missing');
      return c;
    };

    // ---- S1: walk arm — wheat lands 5+ blocks from the cow; expect the
    // start row, then the arrival serve; a position sample tracks the track
    await seed('water=0.0 food=0.3 hp=10.0');
    const from1 = mark();
    await dropItem('minecraft:wheat', FAR_X, FAR_Z);
    const deadline1 = Date.now() + 120000;
    let s1 = { serve: null, seek: null, track: [] };
    while (Date.now() < deadline1 && !(s1.serve && s1.seek)) {
      await L.sleep(4000);
      const rows = rowsFrom(from1);
      s1.serve = rows.find((l) => /foodground src=cow serve/.test(l)) || null;
      s1.seek = rows.find((l) => /foodseek src=cow start/.test(l)) || null;
      const cow = Object.values(bot.entities || {}).find((e) => e && e.name === 'cow');
      if (cow && cow.position && s1.track.length < 30) {
        s1.track.push([cow.position.x.toFixed(1), cow.position.z.toFixed(1)].join(','));
      }
    }
    ev.s1 = { serve: (s1.serve || '').slice(0, 200), seek: (s1.seek || '').slice(0, 200),
      track: s1.track.filter((v, i, a) => i === 0 || v !== a[i - 1]).slice(0, 16) };
    L.log('S1 ' + JSON.stringify(ev.s1));

    // ---- S2: family-gate deny (fresh cow; deny row 1 Hz; the item survives)
    const cow2 = await freshCow();
    await killGroundItems();
    await seed('water=0.2 food=1.0 hp=10.0');
    const from2 = mark();
    await dropItem('minecraft:wheat', NEAR_X, NEAR_Z);
    await L.sleep(25000);
    const rows2 = rowsFrom(from2);
    ev.s2 = { deny: (rows2.find((l) => /foodground src=cow deny/.test(l)) || '').slice(0, 180),
      serveCount: rows2.filter((l) => /foodground src=cow serve/.test(l)).length,
      seekCount: rows2.filter((l) => /foodseek/.test(l)).length };
    L.log('S2 ' + JSON.stringify(ev.s2));

    // ---- S3: cooldown face — absolute item cleanup then ONE close wheat +
    // ground=401 (cd=0 → call 1 eats, then 400 dry decrement calls). The
    // call runs with the wheat in the box BEFORE any natural tick can eat
    // (the prod is synchronous — one command = the loop eats call 1).
    await seed('water=0.0 food=0.3 hp=10.0');
    await killGroundItems();
    const from3 = mark();
    await dropItem('minecraft:wheat', NEAR_X, NEAR_Z);
    srv.send(`etest prod ${L.BOT} 6 ground=401`);
    await L.sleep(2500);
    const rows3 = rowsFrom(from3);
    ev.s3 = { serveRows: rows3.filter((l) => /foodground src=cow serve/.test(l)).length,
      sample: (rows3.find((l) => /foodground src=cow serve/.test(l)) || '') };
    L.log('S3 ' + JSON.stringify({ serveRows: ev.s3.serveRows, sample: ev.s3.sample.slice(0, 170) }));

    // ---- S3b: love arm — full health + seed water=1.0 food=0.2 (post-eat
    // well) → ground=401 (cd=400 from S3 → call 401 eats) → love=true
    await seed('water=1.0 food=0.2 hp=10.0');
    await killGroundItems();
    const from3b = mark();
    srv.send(`etest prod ${L.BOT} 6 ground=401`); // wheat already there? drop fresh:
    await dropItem('minecraft:wheat', NEAR_X, NEAR_Z);
    srv.send(`etest prod ${L.BOT} 6 ground=401`);
    await L.sleep(2500);
    const rows3b = rowsFrom(from3b);
    ev.s3b = { serve: (rows3b.find((l) => /foodground src=cow serve/.test(l)) || '').slice(0, 190) };
    L.log('S3b ' + JSON.stringify(ev.s3b));

    // ---- S4: not-food ground item = scan never opens
    const from4 = mark();
    await dropItem('minecraft:stone', NEAR_X, NEAR_Z);
    await L.sleep(6000);
    ev.s4 = { rows: rowsFrom(from4).filter((l) => /foodground|foodseek/.test(l)).length };
    L.log('S4 ' + JSON.stringify(ev.s4));

    // ---- S5: hand-feed zero regression — absolute-fresh cow, inline survival
    const cow5 = await freshCow();
    await seed('water=1.0 food=0.0 hp=2.0');
    await L.tp(srv, COW_X + 1.1, TY + 1, COW_Z + 1.0, { bot: bot.username, wait: 900 });
    srv.send(`give ${L.BOT} minecraft:wheat 1`);
    await L.sleep(700);
    const it = bot.inventory.items().find((i) => i.name === 'wheat');
    if (!it) throw new Error('no wheat for hand feed');
    await bot.equip(it, 'hand');
    await L.sleep(400);
    srv.send(`gamemode 0 ${bot.username}`);
    await L.sleep(1200);
    const from5 = mark();
    await bot.activateEntity(Object.values(bot.entities || {}).find((x) => x && x.id === cow5.id));
    await L.sleep(1500);
    ev.s5 = { serve: (rowsFrom(from5).filter((l) => /food src=cow/.test(l)).find((l) => /serve/.test(l)) || '').slice(0, 190),
      hand: (bot.heldItem || {}).name || 'empty' };
    srv.send(`gamemode 1 ${bot.username}`);
    await L.sleep(900);
    L.log('S5 ' + JSON.stringify(ev.s5));

    ev.ok = true;
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('smoke-done', 'evidence written');
  } catch (e) {
    ev.error = (e && e.stack) || e.message || String(e);
    fs.writeFileSync(path.join(L.OUT, TAG + '-evidence.json'), JSON.stringify(ev, null, 1), 'utf8');
    L.log('SMOKE-FAIL', ev.error);
    process.exitCode = 2;
  } finally {
    srv.send('gamerule randomTickSpeed 3');
    srv.send('gamerule doDaylightCycle true');
    await L.sleep(500);
    L.setCfgValue(L.CFG, 'mobDebugLog', 'false');
    L.setCfgValue(L.CFG, 'farmDebugLog', 'false');
    await L.sleep(300);
    try { await srv.stop(); L.log('stop', 'graceful'); } catch (err) { L.log('stop-err', err.message); }
  }
}
main();
