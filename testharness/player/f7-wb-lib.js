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

const PIN = { build: 'b41-build2', releaseSize: 1164582, releaseSha: 'D4612149B94F7A30A89F8793D57609798EC3DC7D7B68EC6318980D579D488979', devSha: '39088477C7AF7BFA6D2C0FE35B5DC60E1ADA7637CE44AB0EE2BD473F95EE6F7B', sourcesSha: 'CE61E3E0027504446E161C5CFE03FC205A3A900E9D259C94495287D96BF2D3E2' }; // b41-build2 = the :89 vanilla-parity removal (the swordGate inject + the MixinBlock creative sword 0.0F arm deleted after the W-B41 r2 verdict — 1.12 Forge vanilla has the same creative-sword face, census :89 = the zero-port); b41-build1 = B7FD646B9368A7C6736AD6A39E65EFF57C68DEE2A0C755D5BF8C90F5834BAF0F (the swing-two pack: the creative-sword break gate :89 (MixinPlayerInteractionManager etim$swordGate HEAD, rides the existing tryHarvestBlock refmap keys) + the stick/bone break roll :92 (new MixinItem class, 1 hitEntity key; the refmap 101/238/476 = the AP's incremental bookkeeping, -4 vs the B-40 count unexplained-but-verified-present: MixinItemHoe 4 keys + MixinItem 1 + MixinPlayerInteractionManager 4 all in)); b40-build2 = ACC584FB7395EC5192D5A5413306304C759D5AE805AD9442617DD2F21062BC5E (dev 3E2AA120…F920/sources 0EAA5F34…243C = b40-build1 + the /etest useblock face parameter (TestDriver.useBlock overload + the CommandDevTest parser; harness tooling for the B-40 face arms)); b40-build1 = 8EAD79856EBCBA8EABBA3CCD408D0EBC41D91598211998389934D9C8C20C965C (dev 27659E1E…/sources 8F803A3D…; the hoe four-face pack: top-face gate :94 + lowblock allow :86 + till wear 50 :87 + the mattock till face :93; MixinItemHoe three adds, ETIMItemMattock.onItemUse); b39-build3 = CB45F788E88E18FD1860FD86F9D0359E880389D840DCC375078768681C3DD859 (diag lines reverted + mixins debug.export reverted; the is-smart face + flag gates + the read hasKey gate + the attackEntityFrom RETURN fix); b39-build2 = C700EA29D61328D63F6C7E6C196E920C08BE5089977B3D45BE12BB1042C68273; b39-build1 = 8851CA51456693C6A09D17A6C00575A85CE8A1C76E3DD672965F6659F6B84B96 // b38-build3 = 651C5461A045333C41F3F77EDC2FFE9D19CEA018F397B209508AA2DC2DDC5378 (the wither-skeleton CCE fix); b38-build2 = B35772586D2792C512AD1AB8BDEB40559564398F98B1E322F801F1E7D97ED51E; b38-build1 = AE10256DAE3851C13431958BFE5C4DFCF5EC0B9A732E64AEA26CE8C13C35FF41; b37-build4 = 23B822B3AAD8099125C0E6D702CC1BEEFA68F49EC3E38672A2EDB50CD0DAA03E (the isAirOrPassable polarity fix); b37-build3 = B58BA9EBE42A5F22F9BF01227B2AB2DC656C695B2726BA99F444B6A809FF9B01 (the rayTraceBlocks 5th-arg fix); b37-build2 = 97C79EC616E31FCF6F87EBB0E46F9EB51A18C1DB0DAF6FD2BE2656BAB76167A2 (the inline midpoint crash fix)
const MK_PIN = { classes: 101, entries: 238, dual: 476, mixins: 100, client: 10 }; // B-41 swing-two pack (+1 mixin class 99->100 MixinItem [+1 hitEntity key]; the sword gate rides the existing tryHarvestBlock keys, so 242->238 net = the AP's incremental refmap bookkeeping [historical entries dropped, verified-present: MixinItemHoe 4 keys + MixinItem 1 + MixinPlayerInteractionManager 4]; b41-build2 = the same counts, the :89 removal rode the shared keys too); the B-40 count was 101/242/484/99/10 // B-39 is-smart face (+3 inject entries 236->239 [MixinEntityZombie attackEntityFrom TAIL + writeEntityToNBT TAIL + readEntityToNBT TAIL; the <init> TAIL seed roll rides the existing <init> key]; zero new mixin classes, 101/99/10 unchanged) // B-38 drop-face pack (+1 accessor mixin class 100->101 ETIMEntityLivingDropsAccessor [2 @Accessor keys], entries 229->236 [accessor 2 + MixinEntityLivingBase fall redirect 2 + MixinEntityLiving dropLoot/dropEquipment 2 + the json mixins face 98->99], dual 458->472) // B-37 seek-firing-position seat (+1 inject entry 228->229, the MixinAbstractSkeletonEquip.setCombatTask TAIL second handler; zero new mixin classes, 100/98/10 unchanged) // B-35 repair-seek seats (zero new mixin classes; entries 228 dual 456 unchanged) // B-34 witch roam + wolf hostility seats (+5 member keys 223->228, dual 446->456) // B-33 tree seat (+2 inject entries 221->223, dual 442->446) // B-31 break-door seat (+2 mixin classes 96->98, entries 218->221, dual 436->442) // B-30 wander-back seat (95->96, 217->218, 434->436) // B-29 panic seat (94->95, 216->217, 432->434) // B-28 eat-grass seat (93->94, 215->216, 430->432) // B-24 fleesun -> B-25 outoflava batch (92->93, 214->215, 428->430) // B-24 收编 (91→92, 212→214, 424→428)

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
function useBlock(srv, x, y, z, who, face) {
  srv.send(`etest useblock ${x} ${y} ${z}${face ? ' ' + face : ''} ${who || BOT}`);
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
