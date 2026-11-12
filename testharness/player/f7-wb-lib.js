#!/usr/bin/env node
/**
 * f7-wb-lib.js - farmland-moisture batch (W-FM) verification harness shared lib
 *
 * Pins (W-B12/W-B12b task books, 2026-11-06): HEAD 37dd834 | release 1,018,656 B
 * 780E917A...1F41 (MD5 82DABAACC0F4D5209B730DEA68A62ED0) | dev 998,790 B
 * 07F93E39...7372 | sources 928,517 B 94DE1D81...CBF3 |
 * refmap 84/186 | mixins 80+10 | cfg 245 code / 247 file keys
 * (Historical. Current pins below are refreshed per batch: B-33 build3.)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const { Vec3 } = require('vec3');

const ROOT = path.resolve(__dirname, '..', '..');
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const OBFCFG = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');

const PORT = 25565;
const BOT = 'ETIM_F7';

const PIN = { build: 'b37-build4', releaseSize: 1153535, releaseSha: '23B822B3AAD8099125C0E6D702CC1BEEFA68F49EC3E38672A2EDB50CD0DAA03E', devSha: '94BBC2BD977AB5C218A98420B372260338B12493FA1891CE5CFBE05F1B207258', sourcesSha: '8D88770D9F36B504EC8B87D4DE4D93298DC9196E5009DAB68E716A52EB5D2922' }; // b37-build4 = the isAirOrPassable polarity fix (!isPassable -> isPassable, three AI copies B-34/B-36/B-37; the flip self-masked in B-34/B-36 windows, exposed by B-37 anchor geometry); b37-build3 = B58BA9EBE42A5F22F9BF01227B2AB2DC656C695B2726BA99F444B6A809FF9B01 (the rayTraceBlocks 5th-arg fix); b37-build2 = 97C79EC616E31FCF6F87EBB0E46F9EB51A18C1DB0DAF6FD2BE2656BAB76167A2 (the inline midpoint crash fix)
const MK_PIN = { classes: 100, entries: 229, dual: 458, mixins: 98, client: 10 }; // B-37 seek-firing-position seat (+1 inject entry 228->229, the MixinAbstractSkeletonEquip.setCombatTask TAIL second handler; zero new mixin classes, 100/98/10 unchanged) // B-35 repair-seek seats (zero new mixin classes [MixinEntitySkeleton/MixinEntitySnowman pre-existing B-24/B-19 carriers; the repair seats are second <init>-TAIL handlers + MixinEntityLiving cooldown field riding the existing onUpdate TAIL key]; entries 228 dual 456 unchanged) // B-34 witch roam + wolf hostility seats (+5 member keys 223->228 [MixinEntityWolf attackEntityAsMob/attackEntityFrom/onUpdate/readEntityFromNBT/writeEntityToNBT; the witch roam rides the existing <init> key, the wolf target seat rides the existing <init> key], dual 446->456; zero new mixin classes, 100/98/10 unchanged) // B-33 tree seat (+2 inject entries 221->223 [MixinEntityLiving.onUpdate TAIL countdown tick + MixinEntity.onUpdate TAIL fire-spread hook], dual 442->446; zero new mixin classes, 100/98/10 unchanged) // B-31 break-door seat (+2 mixin classes 96->98 [PathNavigateAccessor new + zombie stack injects], entries 218->221, dual 436->442) // B-30 wander-back seat (witch mixin class 95->96, entries 217->218, dual 434->436) // B-29 panic seat (+1 mixin class 94->95, entries 216->217, dual 432->434) // B-28 eat-grass seat (+1 mixin class 93->94, entries 215->216, dual 430->432) // B-24 fleesun -> B-25 outoflava batch (+1 mixin class 92->93, entries 214->215, dual 428->430) // B-24 收编 (fleesun: +1 mixin class 91→92, refmap entries 212→214, dual 424→428)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (t, ...a) => console.log(`[${stamp()}] [${t}]`, ...a);
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const strip = (l) => (l || '').replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '');

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}
function getProp(text, key) {
  const m = new RegExp('^' + key + '=(.*)$', 'm').exec(text);
  return m ? m[1] : null;
}
function setCfgValue(file, key, value) {
  const t = fs.readFileSync(file, 'utf8');
  const re = new RegExp('^(    [A-Z]:' + key + '=)[^\\r\\n]*$', 'm');
  if (!re.test(t)) throw new Error('cfg has no key ' + key);
  fs.writeFileSync(file, t.replace(re, (m, p1) => p1 + value), 'utf8');
}
function cfgKeys(file) {
  const out = {};
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^    [A-Z]:(\w+)=(.*)$/.exec(line);
    if (m) out[m[1]] = m[2];
  }
  return out;
}
function pinOf(file, pin, label) {
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}
function mkCounts() {
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
  const out = {};
  for (const [key, f] of [['refmapResources', REFMAP_A], ['refmapTmp', REFMAP_B]]) {
    const r = read(f);
    const entries = Object.values(r.mappings).reduce((a, x) => a + Object.keys(x).length, 0);
    out[key] = { classes: Object.keys(r.mappings).length, entries, dual: entries * 2 };
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.classes && out.refmapResources.entries === MK_PIN.entries
    && out.refmapTmp.classes === MK_PIN.classes && out.refmapTmp.entries === MK_PIN.entries
    && out.manifest.mixins === MK_PIN.mixins && out.manifest.client === MK_PIN.client;
  return out;
}
function netstatListen(port) {
  try {
    return execFileSync('netstat', ['-ano'], { encoding: 'utf8' })
      .split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) { return -1; }
}
function crashCount() {
  try {
    return fs.readdirSync(path.join(ROOT, 'run', 'crash-reports'))
      .filter((f) => fs.statSync(path.join(ROOT, 'run', 'crash-reports', f)).isFile()).length;
  } catch (e) { return -1; }
}
function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
}

async function joinBot(srv, username) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      return await createHarnBot({ host: '127.0.0.1', port: PORT, username: username || BOT });
    } catch (e) {
      lastErr = e;
      log('bot', `connect attempt ${attempt} failed: ${(e && e.message) || e}`);
      await sleep(2500);
    }
  }
  throw lastErr || new Error('bot connect failed');
}

/** Standard world staging. gamemode 0 for vessel-consume faces, 1 for build/scan. */
async function stage(srv, bot, opts) {
  const o = opts || {};
  srv.send(`op ${bot.username || BOT}`);
  await sleep(700);
  for (const g of ['doMobSpawning false', 'doMobLoot false', 'doTileDrops false',
    'doDaylightCycle false', 'doFireTick false', 'mobGriefing true',
    'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    srv.send('gamerule ' + g);
  }
  srv.send('difficulty ' + (o.difficulty === undefined ? 2 : o.difficulty));
  srv.send('time set ' + (o.time === undefined ? 6000 : o.time));
  srv.send('weather ' + (o.weather || 'clear 1000000'));
  srv.send('gamerule randomTickSpeed ' + (o.rts === undefined ? 3 : o.rts));
  srv.send(`gamemode ${o.gamemode === undefined ? 1 : o.gamemode} ${bot.username || BOT}`);
  srv.send(`etest food 20 20 ${bot.username || BOT}`);
  srv.send(`etest health 20 ${bot.username || BOT}`);
  srv.send('kill @e[type=!player]');
  await sleep(1200);
  if (o.noPhysics !== false) {
    // mineflayer 4.39 gates the loop on bot.physicsEnabled (physics.js:83);
    // bot.physics.enabled is a no-op and let the bot free-fall in W-B7 v2.
    try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
    try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  }
}

/** teleport and wait for chunk data at the target. */
async function tp(srv, x, y, z, opts) {
  const o = opts || {};
  srv.send(`tp ${o.bot || BOT} ${x} ${y} ${z} ${o.yaw || 0} ${o.pitch || 0}`);
  await sleep(o.wait === undefined ? 700 : o.wait);
}

/** point the bot at the centre of a block's top face (server rotation is what the mixin ray-traces). */
async function lookAtBlock(bot, x, y, z) {
  const target = new Vec3(x + 0.5, y + 1.0, z + 0.5);
  try { await bot.lookAt(target, true); } catch (e) { log('look', e.message); }
  await sleep(260);
}
async function lookAtTop(bot, x, y, z) {
  const target = new Vec3(x + 0.5, y + 0.90, z + 0.5);
  try { await bot.lookAt(target, true); } catch (e) { log('look', e.message); }
  await sleep(300);
}
function useBlock(srv, x, y, z, who) {
  srv.send(`etest useblock ${x} ${y} ${z} ${who || BOT}`);
}
function useItem(srv, who) {
  srv.send(`etest useitem ${who || BOT}`);
}

/** testforblock -> boolean + raw line. Returns null while no response. */
async function testBlock(srv, x, y, z, block, data, nbt) {
  const from = srv.all.length;
  const cmd = data === undefined
    ? `testforblock ${x} ${y} ${z} ${block}`
    : (nbt === undefined ? `testforblock ${x} ${y} ${z} ${block} ${data}`
      : `testforblock ${x} ${y} ${z} ${block} ${data} ${nbt}`);
  srv.send(cmd);
  await sleep(420);
  const rows = srv.all.slice(from).map(strip);
  const hit = rows.find((l) => /Successfully found the block/i.test(l));
  const miss = rows.find((l) => /The block at|did not match|failed/i.test(l));
  return { ok: !!hit, raw: (hit || miss || '').slice(0, 200) };
}

/** parse the biome id map from minecraft-data (1.12.2). */
function biomeTable() {
  const md = require(path.join(__dirname, 'node_modules', 'minecraft-data'))('1.12.2');
  const byId = {};
  for (const b of Object.values(md.biomes)) byId[b.id] = b;
  return byId;
}

function rowCounts(lines) {
  const has = (tag) => lines.filter((l) => l.indexOf(tag) >= 0).length;
  return {
    farm: has('[FarmLog]'), melee: has('[MeleeLog]'), mining: has('[MiningLog]'),
    butch: has('[ButchLog]'), arrow: has('[ArrowLog]'), ench: has('[EnchantLog]'),
    entity: has('[EntityLog]'), fish: has('[FishLog]'), food: has('[FoodLog]'),
    mixinFail: lines.filter((l) => /Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure/.test(l)).length,
  };
}

module.exports = {
  ROOT, OUT, CFG, OBFCFG, PROPS, DEVJAR, RELJAR, SRCJAR, PORT, BOT,
  PIN, MK_PIN, sleep, stamp, log, sha256, strip,
  setProp, getProp, setCfgValue, cfgKeys, pinOf, mkCounts, netstatListen, crashCount, readJson,
  joinBot, stage, tp, lookAtBlock, lookAtTop, useBlock, useItem, testBlock, biomeTable, rowCounts,
  startServer,
};
