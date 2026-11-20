// B-45 smoke — R196 anvil repair skillset (:91), option B minimal layer.
// Server log evidence only: capability get/set, plan gate, command abandon/list.
const L = require('./f7-wb-lib.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const EXPECTED_SHA = process.env.EXPECTED_SHA || '6380ABE54CB9F5A06E0294B97A9C6710BDCEB730B5EC6FA96A81F3A0678B9CD6';
let bot = null, srv = null, propsBefore = null, cfgBefore = null;

function note(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }
async function cmd(s, wait) { srv.send(s); await sleep(wait == null ? 350 : wait); }
function slice(from) { return srv.all.slice(from); }
function has(lines, re) { return lines.some(s => re.test(s)); }

async function stampPin() {
  const jar = path.join(L.ROOT, 'build', 'libs', 'etim-1.0.0.jar');
  const sha = L.sha256(fs.readFileSync(jar)).toUpperCase();
  const mk = L.mkCounts();
  const countsOk = mk.refmapTmp.classes === 101 && mk.refmapTmp.entries === 239
    && mk.refmapResources.classes === 101 && mk.refmapResources.entries === 239
    && mk.manifest.mixins === 100 && mk.manifest.client === 10;
  console.log(`[PIN] sha=${sha} expected=${EXPECTED_SHA} shaOk=${sha === EXPECTED_SHA} ` +
    `mk={classes:${mk.refmapTmp.classes},entries:${mk.refmapTmp.entries},dual:${mk.refmapTmp.dual},` +
    `mixins:${mk.manifest.mixins},client:${mk.manifest.client}} ok=${countsOk}`);
  return { sha, ok: countsOk && sha === EXPECTED_SHA };
}

async function startBoot(tag, world) {
  if (!propsBefore) propsBefore = fs.readFileSync(L.PROPS, 'utf8');
  if (!cfgBefore) cfgBefore = fs.readFileSync(L.CFG, 'utf8');
  const rawProps = fs.readFileSync(L.PROPS, 'utf8');
  fs.writeFileSync(L.PROPS, L.setProp(L.setProp(rawProps, 'level-name', world), 'allow-flight', 'true'), 'utf8');
  let cfg = cfgBefore;
  if (/skillsEnabled/.test(cfg)) {
    cfg = cfg.replace(/B:skillsEnabled\s*=\s*(true|false)/, 'B:skillsEnabled=true');
  } else {
    cfg = cfg.replace(/(\r?\n)(\s*)B:metalAnvilRepair=true/,
      '$1$2B:metalAnvilRepair=true$1$2B:skillsEnabled=true');
  }
  fs.writeFileSync(L.CFG, cfg, 'utf8');
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let i = 0; i < 60; i++) { if (L.netstatListen(L.PORT) === 0) break; await sleep(5000); }
    if (L.netstatListen(L.PORT) !== 0) throw new Error('port 25565 still held');
    srv = await L.startServer({ root: L.ROOT, tag });
    if (await srv.waitFor(/Done \(/, 480000)) return;
    try { await srv.stop(30000); } catch (e) { /* noop */ }
    srv = null;
  }
  throw new Error('no Done( in 3 attempts');
}

async function stopBoot() {
  try { if (bot) { bot.quit(); bot = null; await sleep(2000); } } catch (e) { /* noop */ }
  const st = await srv.stop();
  if (propsBefore) fs.writeFileSync(L.PROPS, propsBefore, 'utf8');
  if (cfgBefore) fs.writeFileSync(L.CFG, cfgBefore, 'utf8');
  console.log('[stop]', JSON.stringify(st));
  return st;
}

async function stage() {
  bot = await L.joinBot(srv, A);
  await sleep(1500);
  try { bot.physicsEnabled = false; } catch (e) { /* noop */ }
  try { bot.physics.enabled = false; } catch (e) { /* noop */ }
  await cmd('op ' + A, 600);
  await cmd('gamemode 1 ' + A, 400);
  for (const g of ['doMobSpawning false', 'doTileDrops true', 'doDaylightCycle false',
    'doFireTick false', 'keepInventory true', 'naturalRegeneration false', 'doWeatherCycle false']) {
    await cmd('gamerule ' + g, 200);
  }
  await cmd('time set 6000', 200);
  await cmd('weather clear 1000000', 200);
  await cmd('kill @e[type=!player]', 500);
  await cmd(`tp ${A} -60.5 120 240.5`, 300);
}

async function main() {
  const pin = await stampPin();
  await startBoot(`b45-${RUN}`, `w-b45s-${RUN}`);
  await stage();

  const bootFrom = 0;
  const bootLines = slice(bootFrom);
  const mixinFail = bootLines.filter(s => /Mixin apply failed|Exception in thread|MixinApplyError/.test(s)).length;

  // W0: capability is attached and starts empty.
  const w0from = srv.all.length;
  await cmd(`etest skills ${A}`, 500);
  const w0lines = slice(w0from);
  const w0 = has(w0lines, /\[SkillLog\] get player=ETIM_F7 mask=0 \[server\]/);

  // W1: skills on + empty mask → anvil plan refuses with fail=3, required=blacksmithing bit.
  await cmd(`etest skills ${A} 0`, 400);
  const w1from = srv.all.length;
  await cmd(`etest anvilplan ${A} etim:pickaxe_copper 10`, 600);
  const w1lines = slice(w1from);
  const w1 = has(w1lines, /\[CraftingLog\] anvilplan player=ETIM_F7 item=etim:pickaxe_copper kind=SKILL fail=3 required=256 \[server\]/);

  // W2: learn blacksmithing bit directly → the same plan is allowed (COMBO).
  await cmd(`etest skills ${A} 256`, 400);
  const w2from = srv.all.length;
  await cmd(`etest anvilplan ${A} etim:pickaxe_copper 10`, 600);
  const w2lines = slice(w2from);
  const w2 = has(w2lines, /\[CraftingLog\] anvilplan player=ETIM_F7 item=etim:pickaxe_copper kind=COMBO fail=0 required=0 \[server\]/);

  // W3: the player-facing command learns, lists and abandons through the capability.
  await cmd(`etest skills ${A} 0`, 300);
  await cmd(`xp 100L ${A}`, 300);
  const w3from = srv.all.length;
  await cmd(`etimskill learn blacksmithing ${A}`, 500);
  await cmd(`etimskill list ${A}`, 400);
  await cmd(`etimskill abandon blacksmithing ${A}`, 500);
  await cmd(`etimskill list ${A}`, 400);
  const w3lines = slice(w3from);
  const w3 = has(w3lines, /\[SkillLog\] learn player=ETIM_F7 skill=blacksmithing cost=5 mask=256 \[server\]/)
    && has(w3lines, /\[SkillLog\] list player=ETIM_F7 mask=256 \[server\]/)
    && has(w3lines, /\[SkillLog\] abandon player=ETIM_F7 skill=blacksmithing mask=0 \[server\]/)
    && has(w3lines, /\[SkillLog\] list player=ETIM_F7 mask=0 \[server\]/);

  // W4: R196 item-class mapping — wooden blunt pair = carpentry (128), flint knife = masonry (16).
  await cmd(`etest skills ${A} 0`, 300);
  const w4from = srv.all.length;
  await cmd(`etest anvilplan ${A} etim:cudgel_wood 10`, 500);
  await cmd(`etest anvilplan ${A} etim:knife_flint 10`, 500);
  const w4lines = slice(w4from);
  const w4 = has(w4lines, /item=etim:cudgel_wood kind=SKILL fail=3 required=128 \[server\]/)
    && has(w4lines, /item=etim:knife_flint kind=SKILL fail=3 required=16 \[server\]/);

  const pass = pin.ok && mixinFail === 0 && w0 && w1 && w2 && w3 && w4;
  console.log('[W0]', JSON.stringify({ capability: w0, mixinFail }));
  console.log('[W1]', JSON.stringify({ skillDenied: w1 }));
  console.log('[W2]', JSON.stringify({ skillAllowed: w2 }));
  console.log('[W3]', JSON.stringify({ command: w3 }));
  console.log('[W4]', JSON.stringify({ mapping: w4 }));
  console.log('[done]', JSON.stringify({ run: RUN, pin: pin.ok, pass, bad: pass ? 0 : 1, stop: await stopBoot() }));
  process.exit(pass ? 0 : 1);
}

main().catch(async e => {
  console.error('[fatal]', e);
  try { if (srv) console.log('[stop]', JSON.stringify(await stopBoot())); } catch (x) { console.error('[stop-fail]', x); }
  process.exit(1);
});
