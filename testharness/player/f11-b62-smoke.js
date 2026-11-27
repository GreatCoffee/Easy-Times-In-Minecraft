// B-62 smoke: R196 EntityEarthElemental / EntityFireElemental / EntityClayGolem
// (census D :63/:91/:93/:117/:118/:120/:243/:244/:247 + :84 variant rows).
// Verdict channel = server log ([ElementalLog]/[SpawnLog]).
//   W1 attributes: /etest elemental earth|fire|clay -> hp/max/attack/speed/follow/xp/type/defense
//   W2 magma: /etest elementalmagma earth|clay -> type/heat/magma/hardened/defense
//   W3 snowball: fire takes 3, magma earth quenches back to normal
//   W4 immunity: earth(fall) passes, earth(player) rejects, clay(player) passes, fire(fire) rejects
//   W5 gate: earth y<=40 allowed, high y rejected + base row probe
//   W6 spawn rows in table source + lava-spawn mixin registered
//   W7 assets: 13 textures + lang keys + registration ids 26/27/28
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-b62-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 1,
    rules: { doTileDrops: false },
    tp: [0.5, 130, 0.5],
    fill: [
      'fill 0 129 0 15 129 15 minecraft:stone',
      'fill 0 130 0 15 133 15 minecraft:air',
      'tp ETIM_F7 0.5 130 0.5',
    ],
  },
  props: { 'allow-flight': 'true' },
  cfg: ['mobs:mobDebugLog', 'mobs:mobElementalR196'],
});
const { cmd, mark, slice, waitRow, logLines } = h;
function lastOf(rows) { return rows.length ? rows[rows.length - 1] : null; }

const PROBE_RE = /\[ElementalLog\] probe kind=(\w+) hp=([\d.]+) max=([\d.]+) attack=([\d.]+) speed=([\d.]+) follow=([\d.]+) xp=(-?\d+) type=(-?\d+) magma=(true|false) defense=(-?[\d.]+) entity=/;
const MAGMA_RE = /\[ElementalLog\] magma kind=(\w+) type=(\d+) heat=(\d+) magma=(true|false) hardened=(true|false) defense=([\d.]+) entity=/;
const SNOW_RE = /\[ElementalLog\] snowball kind=(\w+) (?:dealt=([\d.]+)|quench=(true)) /;
const HIT_RE = /\[ElementalLog\] hit kind=(\w+) source=(\w+) found=(\d+) applied=(\d+) /;
const GATE_RE = /\[SpawnLog\] undeadgate cls=(\w+) allowed=(true|false) depth=(true|false) y=(-?\d+) blood=(true|false) freezing=(true|false) desert=(true|false) cfg=(true|false) at /;
const ROW_RE = /\[ElementalLog\] row kind=(\w+) biome=(\S+) source=(\w+) weight=(\d+) min=(\d+) max=(\d+) /;

async function gate(x, y, z) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalgate earth ${x} ${y} ${z}`, 400);
  const m = await waitRow(GATE_RE, from, 5000);
  const r = await waitRow(ROW_RE, from, 5000);
  const g = lastOf(m);
  return { g: g ? { cls: g[1], allowed: g[2] === 'true', depth: g[3] === 'true', y: +g[4] } : null, row: lastOf(r) };
}

async function main() {
  const pinOk = h.stampPin();
  await h.boot(`b62-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false, w7: false };

  // ---- W1 attributes ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elemental earth 4 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest elemental fire 8 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest elemental clay 12 130 0`, 400);
  const probes = await waitRow(PROBE_RE, from, 8000);
  const pe = lastOf(probes.filter(r => r[1] === 'earth'));
  const pf = lastOf(probes.filter(r => r[1] === 'fire'));
  const pc = lastOf(probes.filter(r => r[1] === 'clay'));
  res.w1 = !!pe && !!pf && !!pc
    && +pe[2] === 30 && +pe[3] === 30 && +pe[4] === 12 && Math.abs(+pe[5] - 0.2) < 1e-6 && +pe[6] === 20
    && +pe[7] === 15 && +pe[8] === 0 && pe[9] === 'false' && +pe[10] === 4
    && +pf[3] === 20 && +pf[4] === 5 && Math.abs(+pf[5] - 0.25) < 1e-6 && +pf[6] === 40 && +pf[7] === 15
    && +pc[3] === 30 && +pc[4] === 6 && +pc[6] === 20 && +pc[7] === 15 && +pc[8] === 8 && +pc[10] === 0;
  console.log('[W1]', JSON.stringify({
    earth: pe && { hp: +pe[2], max: +pe[3], attack: +pe[4], speed: +pe[5], follow: +pe[6], xp: +pe[7], type: +pe[8], defense: +pe[10] },
    fire: pf && { hp: +pf[2], max: +pf[3], attack: +pf[4], speed: +pf[5], follow: +pf[6], xp: +pf[7] },
    clay: pc && { hp: +pc[2], max: +pc[3], attack: +pc[4], follow: +pc[6], xp: +pc[7], type: +pc[8], defense: +pc[10] },
    pass: res.w1,
  }));
  await cmd('kill @e[type=!player]', 400);
  await cmd('etest elementalkill', 300); // outOfWorld is rejected by the elementals

  // ---- W2 magma conversion ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalmagma earth 4 130 0`, 500);
  await cmd(`execute ${A} ~ ~ ~ etest elementalmagma clay 8 130 0`, 500);
  const magmas = await waitRow(MAGMA_RE, from, 6000);
  const me = lastOf(magmas.filter(r => r[1] === 'earth'));
  const mc = lastOf(magmas.filter(r => r[1] === 'clay'));
  res.w2 = !!me && !!mc
    && +me[2] === 1 && +me[3] === 1000 && me[4] === 'true' && me[5] === 'false' && +me[6] === 4
    && +mc[2] === 9 && +mc[3] === 1000 && mc[4] === 'false' && mc[5] === 'true' && +mc[6] === 2;
  console.log('[W2]', JSON.stringify({
    earth: me && { type: +me[2], heat: +me[3], magma: me[4], hardened: me[5], defense: +me[6] },
    clay: mc && { type: +mc[2], heat: +mc[3], magma: mc[4], hardened: mc[5], defense: +mc[6] },
    pass: res.w2,
  }));

  // ---- W3 snowball: fire takes 3, magma earth quenches ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalsnowimpact earth`, 600);
  const q = lastOf(await waitRow(SNOW_RE, from, 8000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elemental fire 8 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest elementalsnowimpact fire`, 900);
  const f = lastOf(await waitRow(SNOW_RE, from, 8000));
  res.w3 = !!q && q[1] === 'earth' && q[3] === 'true'
    && !!f && f[1] === 'fire' && +f[2] === 3;
  console.log('[W3]', JSON.stringify({
    quench: q && { kind: q[1], quench: q[3] },
    fire: f && { kind: f[1], dealt: +f[2] }, pass: res.w3 }));
  await cmd('kill @e[type=!player]', 400);
  await cmd('etest elementalkill', 300); // outOfWorld is rejected by the elementals

  // ---- W4 immunity table (survival: creative damage is discarded) ----
  await cmd('gamemode 0 ' + A, 300);
  await cmd('effect ' + A + ' minecraft:resistance 900 4', 300);
  await cmd(`execute ${A} ~ ~ ~ etest elemental earth 4 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest elemental fire 8 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest elemental clay 12 130 0`, 400);
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalhit earth fall`, 500);
  const eFall = lastOf(await waitRow(HIT_RE, from, 5000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalhit earth player`, 500);
  const eHit = lastOf(await waitRow(HIT_RE, from, 5000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalhit clay player`, 500);
  const cHit = lastOf(await waitRow(HIT_RE, from, 5000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest elementalhit fire fire`, 500);
  const fHit = lastOf(await waitRow(HIT_RE, from, 5000));
  res.w4 = !!eFall && +eFall[4] === 1 && !!eHit && +eHit[4] === 0
    && !!cHit && +cHit[4] === 1 && !!fHit && +fHit[4] === 0;
  console.log('[W4]', JSON.stringify({
    earthFall: eFall && { found: +eFall[3], applied: +eFall[4] },
    earthPlayer: eHit && { found: +eHit[3], applied: +eHit[4] },
    clayPlayer: cHit && { found: +cHit[3], applied: +cHit[4] },
    fireFire: fHit && { found: +fHit[3], applied: +fHit[4] }, pass: res.w4 }));
  await cmd('kill @e[type=!player]', 400);
  await cmd('etest elementalkill', 300); // outOfWorld is rejected by the elementals
  await cmd('effect ' + A + ' minecraft:resistance 0 0', 300);
  await cmd('gamemode 1 ' + A, 300);

  // ---- W5 y<=40 gate + base row ----
  const low = await gate(0, 20, 0);
  const high = await gate(0, 100, 0);
  res.w5 = !!low.g && !!high.g && low.g.allowed === true && high.g.allowed === false
    && low.g.cls === 'ETIMEntityEarthElemental'
    && !!low.row && low.row[3] === 'base' && +low.row[4] === 10 && +low.row[5] === 1 && +low.row[6] === 1;
  console.log('[W5]', JSON.stringify({ low, high, pass: res.w5 }));

  // ---- W6 spawn rows + lava-spawn mixin ----
  const tables = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'ETIMSpawnTables.java'), 'utf8');
  const baseEarth = /monster\.add\(entry\(ETIMEntityEarthElemental\.class, 10, 1, 1\)\)/.test(tables);
  const baseClay = /monster\.add\(entry\(ETIMEntityClayGolem\.class, 50, 1, 1\)\)/.test(tables);
  const hellRow = /entry\(ETIMEntityEarthElemental\.class, 40, 1, 1\)/.test(tables);
  const endRow = /entry\(ETIMEntityEarthElemental\.class, 20, 1, 4\)/.test(tables);
  const gateRow = /pos\.getY\(\) <= 40/.test(tables);
  const mixPath = path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
  const mix = fs.readFileSync(mixPath, 'utf8');
  const lavaMixin = /MixinBlockStaticLiquid/.test(mix)
    && fs.existsSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mixins', 'MixinBlockStaticLiquid.java'));
  res.w6 = baseEarth && baseClay && hellRow && endRow && gateRow && lavaMixin;
  console.log('[W6]', JSON.stringify({ baseEarth, baseClay, hellRow, endRow, gateRow, lavaMixin, pass: res.w6 }));

  // ---- W7 assets + registration ----
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const texFiles = ['earth_elemental/stone/earth_elemental_stone.png', 'earth_elemental/stone/earth_elemental_stone_magma.png',
    'earth_elemental/obsidian/earth_elemental_obsidian.png', 'earth_elemental/obsidian/earth_elemental_obsidian_magma.png',
    'earth_elemental/netherrack/earth_elemental_netherrack.png', 'earth_elemental/netherrack/earth_elemental_netherrack_magma.png',
    'earth_elemental/end_stone/earth_elemental_end_stone.png', 'earth_elemental/end_stone/earth_elemental_end_stone_magma.png',
    'earth_elemental/clay/earth_elemental_clay.png', 'earth_elemental/clay/earth_elemental_clay_hardened.png',
    'earth_elemental/earth_elemental_glow.png', 'earth_elemental/earth_elemental_magma_glow.png',
    'fire_elemental.png'];
  const tex = texFiles.filter(f => !fs.existsSync(path.join(resRoot, 'textures', 'entity', f)));
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const langs = /^entity\.etim\.earth_elemental\.name=/m.test(en) && /^entity\.etim\.fire_elemental\.name=/m.test(en)
    && /^entity\.etim\.clay_golem\.name=/m.test(en)
    && /^entity\.etim\.earth_elemental\.name=/m.test(zh) && /^entity\.etim\.fire_elemental\.name=/m.test(zh)
    && /^entity\.etim\.clay_golem\.name=/m.test(zh);
  const ents = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'ETIMMobEntities.java'), 'utf8');
  const reg = /"etim\.earth_elemental", 26/.test(ents) && /"etim\.fire_elemental", 27/.test(ents)
    && /"etim\.clay_golem", 28/.test(ents);
  res.w7 = tex.length === 0 && langs && reg;
  console.log('[W7]', JSON.stringify({ texMissing: tex, langs, reg, pass: res.w7 }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
