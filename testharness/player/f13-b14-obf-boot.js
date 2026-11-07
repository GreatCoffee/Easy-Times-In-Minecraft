#!/usr/bin/env node
'use strict';
/**
 * f13-b14-obf-boot.js — B-14 obfuscated(srg) dedicated-server check
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

const TAG = 'b14-obf-boot';
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
  try { fs.rmSync(path.join(L.ROOT, 'run', 'obfuscated', 'w-b14p'), { recursive: true, force: true }); } catch (e) { /* noop */ }
  fs.writeFileSync(OBPROPS, L.setProp(props, 'level-name', 'w-b14p'), 'utf8');
  props = fs.readFileSync(OBPROPS).toString('utf8');
  fs.writeFileSync(OBPROPS, L.setProp(props, 'level-seed', '20261107'), 'utf8');
  props = fs.readFileSync(OBPROPS).toString('utf8');
  fs.writeFileSync(OBPROPS, L.setProp(props, 'view-distance', '16'), 'utf8');
  props = fs.readFileSync(OBPROPS).toString('utf8');
  fs.writeFileSync(OBPROPS, L.setProp(props, 'online-mode', 'false'), 'utf8');
  try {
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

    const mark = nAt();
    await cmd('locate Village', 3000);
    const out = srv.all.slice(mark).map((l) => L.strip(l));
    const hit = out.find((l) => /Located Village at/.test(l));
    ev.locate = hit ? hit.trim() : (out.filter(Boolean).pop() || '').trim();
    log('locate', ev.locate);
    if (!hit) throw new Error('obf: no village found');

    // tp + chunk gen (village at 824,-472: center-ish)
    await cmd('tp ' + A + ' 828 100 -464', 5000);
    // W2 anchor cells from the dev-side verdict (session-seven response)
    const anchors = [
      [811, 67, -467], [814, 67, -463], [836, 64, -485], [801, 71, -462],
    ];
    for (const [x, y, z] of anchors) {
      const t = await testB(x, y, z, 'etim:dead_crop');
      ev.probes.push({ pos: [x, y, z], block: 'etim:dead_crop', ok: t.ok, actual: t.actual });
      log('probe', 'dead_crop ' + x + ',' + y + ',' + z + ' -> ' + (t.ok ? 'HIT' : 'MISS: ' + t.actual));
    }
    // live-crop negative on the same cells (must all miss)
    const negs = [];
    for (const [x, y, z] of anchors) {
      const t = await testB(x, y, z, 'minecraft:wheat');
      negs.push({ pos: [x, y, z], ok: t.ok, actual: t.actual });
    }
    ev.negatives = negs;
    const deadHits = ev.probes.filter((p) => p.ok).length;
    const liveHits = negs.filter((p) => p.ok).length;
    ev.ok = ev.mixinFailRows.length === 0 && deadHits >= 1 && liveHits === 0;
    log('out', 'deadHits=' + deadHits + '/4 liveHits=' + liveHits + ' mixinFailRows=' + ev.mixinFailRows.length + ' ok=' + ev.ok);
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
