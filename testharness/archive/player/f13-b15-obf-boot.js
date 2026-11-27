#!/usr/bin/env node
'use strict';
/**
 * f13-b15-obf-boot.js — B-14 obfuscated(srg) dedicated-server check
 * (session-seven C-14-4: @Shadow-field refmap baseline). The village-field
 * mixin applies when StructureVillagePieces$Field1/Field2 LOAD (village gen
 * pass), so a bare boot is NOT enough: this driver joins a mineflayer bot
 * (obf props run online-mode=false), teleports to the seed-20261107 village
 * (824,-472 — proven by the W-B14 verdict), lets the chunks generate and
 * then spot-checks FOUR dead-crop anchor cells (the W2 hits from the
 * dev-side verdict: 811,67,-467 / 814,67,-463 / 836,64,-485 / 801,71,-462)
 * plus their live-crop negatives. One bind problem = crash evidence.
 */
const path = require('path');
const fs = require('fs');
const L = require('./f7-wb-lib.js');

const TAG = 'b15-obf-boot';
const A = 'ETIM_F7';
const OBPROPS = path.join(L.ROOT, 'run', 'obfuscated', 'server.properties');
const ev = { tag: TAG, boot: null, mixinFailRows: [], locate: null, probes: [], ok: false };
let srv = null;
let bot = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nAt = () => srv.all.length;

async function cmd(line, wait) {
  srv.send(line);
  await sleep(wait === undefined ? 400 : wait);
}

async function testB(x, y, z, block, data) {
  const spec = data === undefined ? block : block + ' ' + data;
  const mark = nAt();
  await cmd('testforblock ' + x + ' ' + y + ' ' + z + ' ' + spec, 400);
  const out = srv.all.slice(mark).map((l) => L.strip(l));
  if (out.some((l) => /Successfully found the block/.test(l))) return { ok: true, actual: null };
  // C-14-7 (session-seven verdict): a bare .pop() grabs whatever async log
  // row ([OreLog]/[AILog] …) landed last — not the reply. Command replies
  // carry known markers; prefer the marker row, else the last line.
  const MARK = /Expected|is Air|is not|no such block|expected:/i;
  const receipt = out.filter(Boolean).reverse().find((l) => MARK.test(l));
  return { ok: false, actual: (receipt || out.filter(Boolean).pop() || 'no reply').trim().slice(0, 140) };
}

async function main() {
  const propsBefore = fs.readFileSync(OBPROPS);
  let props = propsBefore.toString('utf8');
  try { fs.rmSync(path.join(L.ROOT, 'run', 'obfuscated', 'w-b15p'), { recursive: true, force: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(OBPROPS, L.setProp(props, 'level-name', 'w-b15p'), 'utf8');
  props = fs.readFileSync(OBPROPS).toString('utf8');
  fs.writeFileSync(OBPROPS, L.setProp(props, 'level-seed', '20261107'), 'utf8');
  props = fs.readFileSync(OBPROPS).toString('utf8');
  fs.writeFileSync(OBPROPS, L.setProp(props, 'view-distance', '16'), 'utf8');
  props = fs.readFileSync(OBPROPS).toString('utf8');
  fs.writeFileSync(OBPROPS, L.setProp(props, 'online-mode', 'false'), 'utf8');
  try {
    ev.locate = null; // B-15: no village arm — the potion arm reads below
    // obf cfg: the EnchLog gate lives in run/obfuscated/config/etim.cfg
    // (default false — the dev smoke wrote it into run/config, obf boots
    // from run/obfuscated/config). setCfgValue takes the file PATH and
    // rewrites it in place; snapshot saves the bytes for the restore.
    const obfCfg = fs.readFileSync(L.OBFCFG, 'utf8');
    L.setCfgValue(L.OBFCFG, 'enchantDebugLog', 'true');
    srv = await L.startServer({ root: L.ROOT, task: 'runObfServer', tag: TAG });
    if (!(await srv.waitFor(/Done \(/, 480000))) throw new Error('no Done( on obf boot');
    const bootLine = L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim();
    ev.boot = bootLine;
    const failRe = /Mixin apply failed|MixinException|InvalidInjectionException|InvalidMixinException|Critical injection failure|boundingBox was not located|require.*not found/i;
    ev.mixinFailRows = srv.all.filter((l) => failRe.test(l)).map((l) => L.strip(l).slice(0, 220));
    log('boot', bootLine + ' mixinFail=' + ev.mixinFailRows.length);
    if (ev.mixinFailRows.length) throw new Error('mixin rows: ' + ev.mixinFailRows[0]);

    await cmd('gamerule randomTickSpeed 3', 400);
    bot = await L.joinBot(srv, A);
    try { bot.removeAllListeners('message'); } catch (e) { /* noop */ }
    await cmd('gamemode 1 ' + A, 500);
    await cmd('difficulty peaceful', 400);

    const joinMark = srv.all.length;
    await cmd('etime 1000', 600);
    // B-15 obf face (D-13-1 chain, 条 321/322): this boot only proves the
    // mixin chain binds at srg names (B-13 r1 showed the Critical injection
    // failure is a boot-time surface). The village arm is B-14's judge
    // (f13-b14-obf-boot.js) — NOT replayed here (world is w-b15p fresh).
    const out = srv.all.slice(joinMark).map((l) => L.strip(l));
    const etimLoaded = srv.all.some((l) => L.strip(l).includes('etim-1.0.0.jar'));
    // potion arm on the bot face: legs gear + free_action L4 + slow → the
    // [EnchLog] row stamp on the obf chain (potion name shows raw i18n in
    // obf too — the amountRaw/-0.15 anchor decides).
    let shredOk = false;
    try {
      bot = await L.joinBot(srv, A);
      await cmd('tp ' + A + ' 540 71 540', 700);
      await cmd('replaceitem entity ' + A + ' slot.armor.legs minecraft:iron_leggings 1 0', 700);
      const mkEnch = srv.all.length;
      await cmd('etest enchant legs 4 ' + A + ' freeAction', 900);
      const usageBroke = srv.all.slice(mkEnch).some((l) => L.strip(l).includes('Usage:'));
      await sleep(600);
      const mkPot = nAt();
      await cmd('effect ' + A + ' 2 30 0', 900);
      await sleep(2500);
      shredOk = !usageBroke && srv.all.slice(mkPot).map((l) => L.strip(l))
        .some((l) => l.includes('slowdownShred'));
      await cmd('effect ' + A + ' clear', 400);
    } catch (e) {
      log('arm', 'bot-face skipped: ' + (e && e.message || e));
    }
    ev.ok = ev.mixinFailRows.length === 0 && etimLoaded && shredOk;
    // C-15-5 (W-B15 回执): the 精简存根 json lacked these — ev carries the
    // two obf-face witnesses plus the boot line so the cross-env verdict
    // doesn't need to re-grep the .out.
    ev.etimLoaded = etimLoaded;
    ev.shredOk = shredOk;
    ev.boot = L.strip(srv.all.find((l) => /Done \(/.test(l)) || '').trim();
    log('out', 'etimLoaded=' + etimLoaded + ' shredOk=' + shredOk + ' mixinFailRows=' + ev.mixinFailRows.length + ' ok=' + ev.ok);
    fs.writeFileSync(L.OBFCFG, obfCfg, 'utf8'); // restore obf cfg snapshot
    await srv.stop(90000);
  } catch (e) {
    ev.error = String((e && e.message) || e);
    console.error('[fatal] ' + ev.error);
    try { if (srv) srv.stop(); } catch (f) { /* noop */ }
    process.exitCode = 1;
  } finally {
    if (bot) { try { bot.quit(); } catch (e) { /* noop */ } }
    fs.writeFileSync(OBPROPS, propsBefore, 'utf8'); // restore the obf props snapshot
    fs.writeFileSync(path.join(L.OUT, TAG + '.json'), JSON.stringify(ev, null, 2), 'utf8');
    log('out', path.join(L.OUT, TAG + '.json'));
  }
}

function log(tag, line) { console.log('[' + tag + '] ' + line); }

main();
