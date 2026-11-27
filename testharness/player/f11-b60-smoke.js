// B-60 smoke: R196 EntityInvisibleStalker + EntityAISeekLitTorch
// (census D :245/:261). Verdict channel = server log ([StalkerLog]/[UndeadLog]/
// [SpawnLog]); the 5% ghost model is client-side and the F3+B acceptance is
// judged by the server flag (invisible=false) that RenderManager gates on.
//   W1 attributes: /etest stalker -> follow 40, attack 4.0, max 20, xp 10,
//      speed 0.23, undead=false, invisible=false
//   W2 torch snuff: stalker alone next to a torch, player > 4 blocks ->
//      [UndeadLog] stalker snuff pos=8,130,1 kind=minecraft:torch
//   W3 seek lit torch: three lanes, 1/200 roll -> [StalkerLog] seek row
//   W4 gate: y<=40 allowed, high y rejected (no blood/biome flag in R196)
//   W5 F3+B: spawn rows must keep invisible=false (RenderManager:408 draw gate)
//   W6 assets: wight texture + lang keys + cfg key present
const fs = require('fs');
const path = require('path'); // C-B70TW-4: W6 static asset checks use path.join
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-b60-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 1,
    difficulty: 2,
    tp: [0.5, 130, 0.5],
    rules: {
      doMobLoot: true, doTileDrops: false, doDaylightCycle: false, doFireTick: false,
      keepInventory: true, naturalRegeneration: false, doWeatherCycle: false, doMobSpawning: false,
    },
    fill: ['fill 0 129 0 15 129 15 minecraft:stone', 'fill 0 130 0 15 133 15 minecraft:air'],
  },
  cfg: ['mobs:mobDebugLog', 'mobs:mobUndeadSurfaceR196'],
});
const { cmd, mark, slice, waitRow } = h;
const sleep = L.sleep;
const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

const PROBE_RE = /\[UndeadLog\] probe kind=(\w+) hp=([\d.]+) max=([\d.]+) follow=([\d.]+) attack=([\d.]+) speed=([\d.]+) xp=(\d+) undead=(true|false) at /;
const SPAWN_RE = /\[StalkerLog\] spawn kind=stalker hp=([\d.]+) max=([\d.]+) follow=([\d.]+) attack=([\d.]+) speed=([\d.]+) xp=(\d+) undead=(true|false) invisible=(true|false) entity=/;
const SNUFF_RE = /\[UndeadLog\] stalker snuff pos=BlockPos\{x=(-?\d+), y=(-?\d+), z=(-?\d+)\} kind=(\S+) entity=/;
const SEEK_RE = /\[StalkerLog\] seek cls=(\S+) torch=BlockPos\{x=(-?\d+), y=(-?\d+), z=(-?\d+)\} dist=(\d+) entity=/;
const GATE_RE = /\[SpawnLog\] undeadgate cls=(\w+) allowed=(true|false) depth=(true|false) y=(-?\d+) blood=(true|false) freezing=(true|false) desert=(true|false) cfg=(true|false) at /;

async function gate(x, y, z, kind) {
  const from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest undeadgate ${x} ${y} ${z} ${kind}`, 400);
  const m = await waitRow(GATE_RE, from, 5000);
  const g = lastOf(m);
  return g ? { cls: g[1], allowed: g[2] === 'true', depth: g[3] === 'true', y: +g[4],
    cfg: g[8] === 'true' } : null;
}

async function main() {
  h.stampPin();
  await h.boot(`b60-${RUN}-b1`);
  await h.join();
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 attributes ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest stalker 4 130 0`, 500);
  const probes = await waitRow(PROBE_RE, from, 8000);
  const spawns = await waitRow(SPAWN_RE, from, 8000);
  const p = lastOf(probes.filter(r => r[1] === 'stalker'));
  const sp = lastOf(spawns);
  res.w1 = !!p && +p[3] === 20 && +p[4] === 40 && +p[5] === 4 && Math.abs(+p[6] - 0.23) < 1e-6
    && +p[7] === 10 && p[8] === 'false';
  console.log('[W1]', JSON.stringify({
    probe: p && { kind: p[1], hp: +p[2], max: +p[3], follow: +p[4], attack: +p[5], speed: +p[6], xp: +p[7], undead: p[8] },
    spawn: sp && { max: +sp[2], follow: +sp[3], attack: +sp[4], speed: +sp[5], xp: +sp[6], undead: sp[7], invisible: sp[8] },
    pass: res.w1,
  }));
  await cmd('kill @e[type=!player]', 400);

  // ---- W2 torch snuff next to the stalker ----
  from = mark();
  await cmd('summon etim:invisible_stalker 8.5 130 0.5', 400);
  await cmd('setblock 8 130 1 minecraft:torch', 400);
  const snuff = await waitRow(SNUFF_RE, from, 8000);
  const s = lastOf(snuff);
  res.w2 = !!s && s[1] === '8' && s[2] === '130' && s[3] === '1' && s[4].indexOf('torch') >= 0;
  console.log('[W2]', JSON.stringify({
    snuff: s && { pos: s[1] + ',' + s[2] + ',' + s[3], kind: s[4] }, pass: res.w2,
  }));
  await cmd('kill @e[type=!player]', 400);

  // ---- W3 seek lit torch (1/200 per tick, three lanes) ----
  // C-B70TW-5: 必须带 PersistenceRequired:1b —— DespawnRules KILL_DIST_SQ=256.0
  // （16 格，MITE EntityLiving:776）会在 3–4 s 内杀掉离玩家 60 格的 stalker
  // （r3/r4 实测 [AILog] mob despawn kill counter=201 distSq=6964），
  // 1/200 抽样来不及开奖。持久化标只把 despawn 计数钉在 0，不改 AI 语义。
  await cmd('tp ' + A + ' 60.5 130 60.5', 600);
  from = mark();
  for (const z of [2, 6, 10]) {
    await cmd(`summon etim:invisible_stalker 0.5 130 ${z + 0.5} {PersistenceRequired:1b}`, 200);
    await cmd(`setblock 12 130 ${z} minecraft:torch`, 200);
  }
  const seek = await waitRow(SEEK_RE, from, 45000);
  const sk = lastOf(seek);
  res.w3 = !!sk;
  console.log('[W3]', JSON.stringify({
    seek: sk && { cls: sk[1], torch: sk[2] + ',' + sk[3] + ',' + sk[4], dist: +sk[5] }, pass: res.w3,
  }));
  await cmd('kill @e[type=!player]', 400);
  await cmd('fill 11 130 1 13 130 11 minecraft:air', 300);
  await cmd('tp ' + A + ' 0.5 130 0.5', 600);

  // ---- W4 gate: depth row only for the stalker ----
  const low = await gate(0, 20, 0, 'stalker');
  const high = await gate(0, 100, 0, 'stalker');
  res.w4 = !!low && !!high && low.allowed === true && high.allowed === false
    && low.cls === 'ETIMEntityInvisibleStalker';
  console.log('[W4]', JSON.stringify({ low, high, pass: res.w4 }));

  // ---- W5 F3+B precondition: never flagged invisible ----
  const invRows = spawns.filter(r => r[8] === 'false');
  res.w5 = spawns.length > 0 && invRows.length === spawns.length;
  console.log('[W5]', JSON.stringify({ spawnRows: spawns.length, invisibleFalse: invRows.length, pass: res.w5 }));

  // ---- W6 assets + cfg key ----
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const tex = fs.existsSync(path.join(resRoot, 'textures', 'entity', 'wight.png'));
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const langs = /^entity\.etim\.invisible_stalker\.name=/m.test(en)
    && /^entity\.etim\.invisible_stalker\.name=/m.test(zh);
  const cfgKey = Object.prototype.hasOwnProperty.call(L.cfgKeys(L.CFG), 'mobUndeadSurfaceR196');
  res.w6 = tex && langs && cfgKey;
  console.log('[W6]', JSON.stringify({ tex, langs, cfgKey, pass: res.w6 }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
