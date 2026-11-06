#!/usr/bin/env node
/**
 * f10-pg-b2-smoke.js — produceGoods batch-2 (B-10 批二) main-session smoke v3.
 * v2 lessons folded in: /data get+merge outputs are console-private (never
 * surface to the bot chat nor srv stream) — every NBT probe rides /testfor
 * {NBT} now; state resets between faces kill + re-summon the clicked host
 * (init state is random-walked 0.8..1.0 and reseeded exactly per face); the
 * family-gate seed is water=0.2 (full + NOT well + NOT hungry == R196 rejects
 * row); the jump faces run jump=2000 (≈50 expected hits at 1/40 — the exact
 * ratio is the判窗 face, the smoke proves the seam fires and retention holds).
 * Faces: S1 water serve (survival: hand → empty bucket), S2 water deny,
 * S3 creative water serve (hand keeps the bucket), S4 hand-feed serve + heal,
 * S5 love-if-well (+testfor InLove:600), S6 family-gate deny (fresh cow),
 * S7 child deny (fresh baby; no ageUp), S8 forced sheep eatGrassBonus tail,
 * S9 forced chicken jump feather + retention, S10 batch-1 egg-pump zero
 * regression. Rows only — no GUI faces.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib');

const TAG = 'f10-pg-b2-smoke';
const WORLD = 'f10pgb3';
const FX = 297, FZ = 847, TY = 100;
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
    await L.stage(srv, bot, { gamemode: 1, noPhysics: true });   // creative tp (survival + tp kicks flying)
    await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: bot.username, wait: 1800 });

    // ---- wipe the chunk-populated herd (it loads with the tp), build the pen
    srv.send('kill @e[type=!player]');
    await L.sleep(1200);
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
    srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b}`);
    await L.sleep(2500);
    const wallRows = rowsFrom(guardFrom).filter((l) => /inWall/.test(l));
    if (wallRows.length) throw new Error('pen animal suffocating (inWall) — staging broken');
    const pick = (need) => bot.inventory.items().find((i) => i.name === need);
    const giveAndEquip = async (item) => {
      srv.send(`give ${L.BOT} ${item} 1`);
      await L.sleep(700);
      const it = pick(item.split('minecraft:')[1]);
      if (!it) throw new Error('no ' + item + ' in bot inv after give');
      await bot.equip(it, 'hand');
      await L.sleep(400);
    };
    // the ONE cow in the pen (kill @e keeps the world clean otherwise)
    const pathedCow = () => Object.values(bot.entities || {})
      .filter((e) => e && e.name === 'cow' && e.position
        && Math.abs(e.position.x - FX - 3.5) < 6 && Math.abs(e.position.z - FZ - 4.5) < 6)
      .sort((a, b) => a.id - b.id)[0];
    let cow = pathedCow();
    if (!cow) throw new Error('pen cow not found');
    const standBy = async (e) => {
      await L.tp(srv, e.position.x + 1.1, e.position.y, e.position.z + 1.0, { bot: bot.username, wait: 900 });
      const cur = Object.values(bot.entities || {}).find((x) => x && x.id === e.id
        && x.position && x.position.distanceTo(bot.entity.position) < 3.4);
      if (!cur) throw new Error('host out of reach after standby');
      return cur;
    };
    cow = await standBy(cow);
    const seed = async (toks, rad) => { srv.send(`etest prod ${L.BOT} ${rad || 6} ` + toks); await L.sleep(1000); };
    /** /testfor a specific NBT against the cows in range — batch-1 proven probe (long entity name). */
    const testforCow = async (nbt, rad) => {
      const from = mark();
      srv.send(`testfor @e[type=minecraft:cow,r=${rad || 8}] ${nbt}`);
      await L.sleep(900);
      const rows = rowsFrom(from).join(' | ');
      return { hit: /was found|Successfully found/i.test(rows), raw: rows.slice(0, 200) };
    };
    /** kill every cow inside the pen box and summon a fresh one at the pen spot. */
    const freshCow = async (nbt) => {
      await L.tp(srv, FX + 6.5, TY + 1, FZ + 6.5, { bot: bot.username, wait: 600 });
      srv.send('kill @e[type=minecraft:cow,r=10]');
      await L.sleep(900);
      srv.send(`summon minecraft:cow ${FX + 3.5} ${TY + 1} ${FZ + 4.5} {NoAI:1b${nbt ? ',' + nbt : ''}}`);
      await L.sleep(1600);
      const c = pathedCow();
      if (!c) throw new Error('fresh cow not found');
      return await standBy(c);
    };

    // ---- S1: water serve (survival — the empty-bucket replace arm proves too;
    // the mode switch is INLINED around the click: creative tp survived, the
    // stationary click runs in survival — no movement packets, no flying kick)
    srv.send(`gamemode 0 ${bot.username}`);
    await L.sleep(1200);
    await seed('water=0.0 milk=0');
    await giveAndEquip('minecraft:water_bucket');
    const from1 = mark();
    await bot.activateEntity(cow);
    await L.sleep(1500);
    let r = rowsFrom(from1).filter((l) => /water src=cow/.test(l));
    ev.s1 = { serve: r.find((l) => /serve/.test(l)) || '', denyRows: r.filter((l) => /deny/.test(l)).length,
      hand: (bot.heldItem || {}).name || 'empty' };
    srv.send(`gamemode 1 ${bot.username}`);
    await L.sleep(1000);
    L.log('S1 ' + JSON.stringify({ serve: ev.s1.serve.slice(0, 170), denyRows: ev.s1.denyRows, hand: ev.s1.hand }));

    // ---- S2: water deny (water=1.0 → R196 silent fall + the observation row)
    await seed('water=1.0');
    await giveAndEquip('minecraft:water_bucket');
    const from2 = mark();
    await bot.activateEntity(cow);
    await L.sleep(1200);
    r = rowsFrom(from2).filter((l) => /water src=cow/.test(l));
    ev.s2 = { deny: r.find((l) => /deny/.test(l)) || '', serveRows: r.filter((l) => /serve/.test(l)).length,
      hand: (bot.heldItem || {}).name || 'empty' };
    L.log('S2 ' + JSON.stringify({ deny: ev.s2.deny.slice(0, 170), serveRows: ev.s2.serveRows, hand: ev.s2.hand }));

    // ---- S3: creative water serve (drain rides — the hand keeps the bucket)
    srv.send(`gamemode 1 ${bot.username}`);
    await L.sleep(800);
    await seed('water=0.0');
    await giveAndEquip('minecraft:water_bucket');
    const from3 = mark();
    await bot.activateEntity(cow);
    await L.sleep(1200);
    r = rowsFrom(from3).filter((l) => /water src=cow/.test(l));
    ev.s3 = { serve: r.find((l) => /serve/.test(l)) || '', hand: (bot.heldItem || {}).name || 'empty' };
    srv.send(`gamemode 0 ${bot.username}`);
    await L.sleep(700);
    L.log('S3 ' + JSON.stringify({ serve: ev.s3.serve.slice(0, 170), hand: ev.s3.hand }));

    // ---- S4: hand-feed serve (wheat; hp below max → heal, no love)
    await seed('water=1.0 food=0.0 hp=2.0');
    await giveAndEquip('minecraft:wheat');
    const from4 = mark();
    await bot.activateEntity(cow);
    await L.sleep(1400);
    r = rowsFrom(from4).filter((l) => /food src=cow/.test(l));
    ev.s4 = { serve: r.find((l) => /serve/.test(l)) || '', hand: (bot.heldItem || {}).name || 'empty' };
    L.log('S4 ' + JSON.stringify({ serve: ev.s4.serve.slice(0, 210), hand: ev.s4.hand }));

    // ---- S5: love-if-well (hp=max + post-eat well → inLove 600; /testfor probe)
    await seed('water=1.0 food=0.2 hp=10.0');
    await giveAndEquip('minecraft:wheat');
    const from5 = mark();
    await bot.activateEntity(cow);
    await L.sleep(1400);
    r = rowsFrom(from5).filter((l) => /food src=cow/.test(l));
    const inLove = await testforCow('{InLove:600}', 8);
    ev.s5 = { serve: r.find((l) => /serve/.test(l)) || '', hand: (bot.heldItem || {}).name || 'empty',
      inLoveProbe: inLove.hit, nbt: inLove.raw.slice(0, 160) };
    L.log('S5 ' + JSON.stringify({ serve: ev.s5.serve.slice(0, 210), hand: ev.s5.hand, probe: ev.s5.inLoveProbe }));

    // ---- S6: family-gate deny — fresh cow kills the love state; seed full +
    // NOT well (water 0.2) + NOT hungry (food 1.0) → R196 rejects → deny row
    cow = await freshCow();
    await seed('water=0.2 food=1.0 hp=10.0');
    await giveAndEquip('minecraft:wheat');
    const from6 = mark();
    await bot.activateEntity(cow);
    await L.sleep(1400);
    r = rowsFrom(from6).filter((l) => /food src=cow/.test(l));
    ev.s6 = { deny: r.find((l) => /deny/.test(l)) || '', serveRows: r.filter((l) => /serve/.test(l)).length,
      hand: (bot.heldItem || {}).name || 'empty' };
    L.log('S6 ' + JSON.stringify({ deny: ev.s6.deny.slice(0, 190), serveRows: ev.s6.serveRows, hand: ev.s6.hand }));

    // ---- S7: child deny (fresh baby cow; vanilla ageUp must not fire)
    const childPos = cow.position;
    srv.send(`summon minecraft:cow ${childPos.x + 1.6} ${childPos.y} ${childPos.z + 1.6} {Age:-24000,NoAI:1b}`);
    await L.sleep(1800);
    const child = Object.values(bot.entities || {})
      .filter((e) => e && e.name === 'cow' && e.id !== cow.id
        && e.position && e.position.distanceTo(bot.entity.position) < 4)
      .sort((a, b) => b.id - a.id)[0] || Object.values(bot.entities || {})
        .find((e) => e && e.name === 'cow' && e.id !== cow.id
          && e.position && e.position.distanceTo(bot.entity.position) < 4);
    if (!child) throw new Error('baby cow not within reach');
    ev.s7 = {};
    const cface = await standBy(child);
    await giveAndEquip('minecraft:wheat');
    // re-aim the look ray at the baby's small hitbox: mineflayer only emits the
    // look packet from the physics tick, so flip physics on for the look and
    // back off again (creative = no flying check on the brief enable)
    try {
      bot.physicsEnabled = true;
      await bot.lookAt(new (require('vec3').Vec3)(cface.position.x, cface.position.y + 0.7, cface.position.z), true);
      await L.sleep(700);
    } catch (e) { L.log('look', e.message); }
    try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
    const from7 = mark();
    await bot.activateEntity(cface);
    await L.sleep(1400);
    r = rowsFrom(from7).filter((l) => /food src=cow/.test(l));
    const ageProbe = await testforCow('{Age:-24000}', 8);
    ev.s7 = { deny: r.find((l) => /deny/.test(l)) || '', serveRows: r.filter((l) => /serve/.test(l)).length,
      hand: (bot.heldItem || {}).name || 'empty', ageProbe: ageProbe.hit, nbt: ageProbe.raw.slice(0, 160) };
    L.log('S7 ' + JSON.stringify({ deny: ev.s7.deny.slice(0, 190), serveRows: ev.s7.serveRows,
      hand: ev.s7.hand, ageProbe: ev.s7.ageProbe, nbt: ev.s7.nbt.slice(0, 120) }));

    // ---- S8: sheep fresh + forced eatGrassBonus tail (grass=1)
    srv.send('kill @e[type=minecraft:sheep,r=12]');
    await L.sleep(900);
    srv.send(`summon minecraft:sheep ${FX + 8.5} ${TY + 1} ${FZ + 9.5} {NoAI:1b}`);
    await L.sleep(1600);
    const sheep = Object.values(bot.entities || {}).find((e) => e && e.name === 'sheep');
    if (!sheep) throw new Error('sheep missing');
    const sface = await standBy(sheep);
    await seed('food=0.0', 4);
    const from8 = mark();
    srv.send(`etest prod ${L.BOT} 4 grass=1`);
    await L.sleep(1500);
    r = rowsFrom(from8).filter((l) => /grass src=sheep/.test(l));
    ev.s8 = { row: r.find((l) => /add=0.5/.test(l)) || '' };
    L.log('S8 ' + JSON.stringify({ row: ev.s8.row.slice(0, 190) }));

    // ---- S9: forced chicken jump feather (jump=2000 ≈ 50 expected drops)
    srv.send('kill @e[type=minecraft:chicken,r=12]');
    await L.sleep(900);
    srv.send(`summon minecraft:chicken ${FX + 2.5} ${TY + 1} ${FZ + 2.5} {NoAI:1b}`);
    await L.sleep(1600);
    const chick = Object.values(bot.entities || {}).find((e) => e && e.name === 'chicken');
    if (!chick) throw new Error('chicken missing');
    const cface2 = await standBy(chick);
    await seed('feather=2', 4);
    const from9 = mark();
    srv.send(`etest prod ${L.BOT} 4 jump=2000`);
    await L.sleep(6000);
    r = rowsFrom(from9).filter((l) => /kind=feather jump=true/.test(l));
    ev.s9 = { drops: r.filter((l) => /drop=1/.test(l)).length, sample: r.slice(0, 2) };
    L.log('S9 ' + JSON.stringify({ drops: ev.s9.drops, sample: ev.s9.sample.map((l) => l.slice(0, 160)) }));

    // ---- S9b: retention (num=1: even 400 forced jumps stay dry)
    await seed('feather=1', 4);
    const from9b = mark();
    srv.send(`etest prod ${L.BOT} 4 jump=400`);
    await L.sleep(5000);
    ev.s9b = { drops: rowsFrom(from9b).filter((l) => /kind=feather jump=true/.test(l)).length };
    L.log('S9b ' + JSON.stringify(ev.s9b));

    // ---- S10: batch-1 zero regression — egg pump (counter=200 step=600)
    await seed('counter=200');
    const from10 = mark();
    srv.send(`etest prod ${L.BOT} 6 counter=200 step=600`);
    await L.sleep(3000);
    r = rowsFrom(from10).filter((l) => /\[AILog\] production/.test(l) || /\[FarmLog\] prod /.test(l));
    ev.s10 = { prodCmd: r.find((l) => /\[FarmLog\] prod /.test(l)) || '',
      eggs: r.filter((l) => /kind=egg/.test(l)).length };
    L.log('S10 ' + JSON.stringify({ eggs: ev.s10.eggs, cmd: ev.s10.prodCmd.slice(0, 170) }));

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
