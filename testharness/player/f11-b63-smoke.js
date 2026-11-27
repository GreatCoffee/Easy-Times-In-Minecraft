// B-63 smoke: R196 EntityCopperspine / EntityHoarySilverfish / EntityNetherspawn
// (census D :248/:249 + the silverfish-block source face).
// Verdict channel = server log ([SilverLog]).
//   W1 attributes: /etest silver copperspine|hoary|netherspawn -> 8 HP / 0.6 / 3 / xp 10 / ARTHROPOD
//   W2 hatch: monster-egg meta 3 -> netherspawn, meta 4 -> copperspine + /etest silverinfo counts
//   W3 bites: copperspine poison 480t, hoary slowness 50t amp 5
//   W4 immunity/snow/explosion: netherspawn rejects fire, passes player damage, snowball 2, death explodes
//   W5 wiring: cfg key, entity ids 29/30/31, MixinBlockSilverfish registered
//   W6 assets/logic: lang keys, snowball mixin branch, explosion block whitelist
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-b63-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 1,
    tp: [0.5, 130, 0.5],
    fill: [
      'fill 0 129 0 15 129 15 minecraft:stone',
      'fill 0 130 0 15 133 15 minecraft:air',
      'tp ETIM_F7 0.5 130 0.5',
    ],
  },
  props: { 'allow-flight': 'true' },
  cfg: ['mobs:mobDebugLog', 'mobs:mobSilverfishR196'],
});
const { cmd, mark, slice, waitRow, logLines } = h;
function lastOf(rows) { return rows.length ? rows[rows.length - 1] : null; }

const PROBE_RE = /\[SilverLog\] probe kind=(\w+) hp=([\d.]+) max=([\d.]+) attack=([\d.]+) speed=([\d.]+) xp=(-?\d+) clade=(\w+) at ([\d.-]+),([\d.-]+),([\d.-]+)/;
const HATCH_RE = /\[SilverLog\] hatch meta=(\d+) kind=(\w+) at (-?\d+),(-?\d+),(-?\d+) entity=/;
const INFO_RE = /\[SilverLog\] info total copperspine=(\d+) hoary=(\d+) netherspawn=(\d+)/;
const BITE_RE = /\[SilverLog\] biteprobe kind=(\w+) found=(true|false) poison=(true|false) poisonDur=(-?\d+) slow=(true|false) slowDur=(-?\d+) slowAmp=(-?\d+)/;
const HIT_RE = /\[SilverLog\] hit kind=(\w+) source=(\w+) found=(true|false) applied=(true|false) dead=(true|false)/;
const SNOW_RE = /\[SilverLog\] snowball kind=netherspawn dealt=([\d.]+) hit=(true|false)/;
const EXPLODE_RE = /\[SilverLog\] explode kind=netherspawn /;

async function main() {
  const pinOk = h.stampPin();
  await h.boot(`b63-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 attributes ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silver copperspine 4 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest silver hoary 8 130 0`, 400);
  await cmd(`execute ${A} ~ ~ ~ etest silver netherspawn 12 130 0`, 400);
  const probes = await waitRow(PROBE_RE, from, 8000);
  const pc = lastOf(probes.filter(r => r[1] === 'copperspine'));
  const ph = lastOf(probes.filter(r => r[1] === 'hoary'));
  const pn = lastOf(probes.filter(r => r[1] === 'netherspawn'));
  const okStats = p => !!p && +p[2] === 8 && +p[3] === 8 && +p[4] === 3
    && Math.abs(+p[5] - 0.6) < 1e-6 && +p[6] === 10 && p[7] === 'ARTHROPOD';
  res.w1 = okStats(pc) && okStats(ph) && okStats(pn);
  console.log('[W1]', JSON.stringify({
    copperspine: pc && { hp: +pc[2], max: +pc[3], attack: +pc[4], speed: +pc[5], xp: +pc[6], clade: pc[7] },
    hoary: ph && { hp: +ph[2], attack: +ph[4], speed: +ph[5], xp: +ph[6] },
    netherspawn: pn && { hp: +pn[2], attack: +pn[4], speed: +pn[5], xp: +pn[6] },
    pass: res.w1,
  }));

  // ---- W2 hatch sources ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silverblock 3 0 130 0`, 600);
  await cmd(`execute ${A} ~ ~ ~ etest silverblock 4 4 130 0`, 600);
  const hatches = await waitRow(HATCH_RE, from, 6000);
  const h3 = lastOf(hatches.filter(r => r[1] === '3'));
  const h4 = lastOf(hatches.filter(r => r[1] === '4'));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silverinfo`, 600);
  const info = lastOf(await waitRow(INFO_RE, from, 5000));
  res.w2 = !!h3 && h3[2] === 'netherspawn' && !!h4 && h4[2] === 'copperspine'
    && !!info && +info[1] >= 1 && +info[3] >= 1;
  console.log('[W2]', JSON.stringify({
    hatch3: h3 && { meta: +h3[1], kind: h3[2], at: `${h3[3]},${h3[4]},${h3[5]}` },
    hatch4: h4 && { meta: +h4[1], kind: h4[2] },
    info: info && { copperspine: +info[1], hoary: +info[2], netherspawn: +info[3] },
    pass: res.w2,
  }));

  // ---- W3 bite effects ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silverbite copperspine`, 500);
  const b1 = lastOf(await waitRow(BITE_RE, from, 5000));
  await cmd('effect ' + A + ' minecraft:poison 0 0', 200);
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silverbite hoary`, 500);
  const b2 = lastOf(await waitRow(BITE_RE, from, 5000));
  res.w3 = !!b1 && b1[2] === 'true' && b1[3] === 'true' && +b1[4] === 480
    && !!b2 && b2[2] === 'true' && b2[5] === 'true' && +b2[6] === 50 && +b2[7] === 5;
  console.log('[W3]', JSON.stringify({
    copperspine: b1 && { found: b1[2], poison: b1[3], dur: +b1[4] },
    hoary: b2 && { found: b2[2], slow: b2[5], dur: +b2[6], amp: +b2[7] },
    pass: res.w3,
  }));

  // ---- W4 immunity / snowball / death explosion ----
  await cmd('kill @e[type=!player]', 400);
  await cmd(`execute ${A} ~ ~ ~ etest silver netherspawn 8 130 0`, 600); // fresh netherspawn
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silverhit netherspawn fire`, 400);
  const fireHit = lastOf(await waitRow(HIT_RE, from, 5000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silverhit netherspawn magic`, 500);
  await cmd(`execute ${A} ~ ~ ~ etest silverhit netherspawn magic`, 900);
  const playerHit = lastOf(await waitRow(HIT_RE, from, 5000));
  const exploded = (await waitRow(EXPLODE_RE, from, 5000)).length > 0;
  await cmd(`execute ${A} ~ ~ ~ etest silver netherspawn 12 130 0`, 600);
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest silversnow netherspawn`, 600);
  const snow = lastOf(await waitRow(SNOW_RE, from, 5000));
  res.w4 = !!fireHit && fireHit[4] === 'false'
    && !!playerHit && playerHit[4] === 'true'
    && exploded && !!snow && +snow[1] === 2;
  console.log('[W4]', JSON.stringify({
    fire: fireHit && { applied: fireHit[4] }, player: playerHit && { applied: playerHit[4], dead: playerHit[5] },
    exploded, snow: snow && { dealt: +snow[1] }, pass: res.w4,
  }));

  // ---- W5 wiring ----
  const cfg = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean mobSilverfishR196 = true;/.test(cfg)
    && /config\.getBoolean\("mobSilverfishR196"/.test(cfg);
  const ents = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'ETIMMobEntities.java'), 'utf8');
  const regOk = /"etim\.copperspine", 29/.test(ents) && /"etim\.hoary_silverfish", 30/.test(ents)
    && /"etim\.netherspawn", 31/.test(ents);
  const mix = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8');
  const mixOk = /"MixinBlockSilverfish"/.test(mix)
    && fs.existsSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mixins', 'MixinBlockSilverfish.java'));
  res.w5 = cfgOk && regOk && mixOk;
  console.log('[W5]', JSON.stringify({ cfgOk, regOk, mixOk, pass: res.w5 }));

  // ---- W6 lang + logic ----
  const resRoot = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const en = fs.readFileSync(path.join(resRoot, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(resRoot, 'lang', 'zh_cn.lang'), 'utf8');
  const keys = ['copperspine', 'hoary_silverfish', 'netherspawn'];
  const langOk = keys.every(k => new RegExp('^entity\\.etim\\.' + k + '\\.name=', 'm').test(en))
    && keys.every(k => new RegExp('^entity\\.etim\\.' + k + '\\.name=', 'm').test(zh));
  const snowSrc = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mixins', 'MixinEntitySnowball.java'), 'utf8');
  const snowOk = /ETIMEntityNetherspawn/.test(snowSrc) && /dealt=2\.000/.test(snowSrc);
  const netherSrc = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'ETIMEntityNetherspawn.java'), 'utf8');
  const blastOk = /Blocks\.NETHERRACK/.test(netherSrc) && /Blocks\.QUARTZ_ORE/.test(netherSrc) && /Blocks\.GOLD_ORE/.test(netherSrc);
  res.w6 = langOk && snowOk && blastOk;
  console.log('[W6]', JSON.stringify({ langOk, snowOk, blastOk, pass: res.w6 }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
