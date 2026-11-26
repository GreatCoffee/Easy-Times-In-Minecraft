// B-65 smoke: R196 food / vessel / coin faces (census F :149-:165).
// Verdict channel = server log ([FoodR196Log]).
//   W1 bowl family: 15 contents registered, R196 sat/nut rows, water/milk edges
//   W2 coin family: onCreated drains XP at the R196 value (copper 5 / gold 100)
//   W3 enchanted apple: weak villager-zombie cure starts (1 tick for meta 1)
//   W4 fire cooks raw food: dropped beef destroyed by fire becomes cooked beef
//   W5 vessel quenching: bowl of water hits a fire elemental for the bowl dose
//   W6 static: cfg key, registrations, mixin registration, assets/lang present
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const WORLD = 'w-b65-' + RUN + '-v1';

const h = H.create({
  run: RUN,
  world: WORLD,
  bot: A,
  props: { 'allow-flight': 'true' },
  cfg: ['mobs:mobDebugLog', 'food:foodR196Extra', 'food:foodModel'],
});
const { cmd, mark, slice, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

const BOWL_RE = /\[FoodR196Log\] bowlgive contents=(\S+) item=(\S+) sat=(\d+) nut=(\d+)/;
const COIN_RE = /\[FoodR196Log\] coin metal=(\S+) count=(\d+) xp_before=(-?\d+) xp_after=(-?\d+)/;
const APPLE_RE = /\[FoodR196Log\] applegold meta=(\d+) cured=(\S+) converting=(\S+)/;
const APPLE_CURE_RE = /\[FoodR196Log\] applegold cure meta=(\d+) ticks=(\d+)/;
const COOK_RE = /\[FoodR196Log\] firecook before=(\S+) after=(\S+) count=(\d+) alive=(\S+)/;
const DOUSE_RE = /\[FoodR196Log\] vesseldouse hit=(\S+) fire_hp=([\d.]+) held=(\S+)/;

const BOWLS = ['MUSHROOM_STEW', 'MILK', 'WATER', 'BEEF_STEW', 'CHICKEN_SOUP', 'VEGETABLE_SOUP',
  'ICE_CREAM', 'SALAD', 'CREAM_OF_MUSHROOM_SOUP', 'CREAM_OF_VEGETABLE_SOUP', 'PUMPKIN_SOUP',
  'MASHED_POTATO', 'SORBET', 'PORRIDGE', 'CEREAL'];

async function main() {
  h.stampPin();
  await h.boot(`b65-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 bowl family (15 contents) ----
  let from = mark();
  for (const c of BOWLS) await cmd(`execute ${A} ~ ~ ~ etest bowl ${c.toLowerCase()}`, 220);
  const bowlRows = await waitRow(BOWL_RE, from, 12000);
  const byContent = new Map(bowlRows.map(r => [r[1], r]));
  const beef = byContent.get('BEEF_STEW');
  const milk = byContent.get('MILK');
  const water = byContent.get('WATER');
  res.w1 = bowlRows.length >= 15
    && !!beef && +beef[3] === 16 && +beef[4] === 16
    && !!milk && +milk[3] === 0 && +milk[4] === 1
    && !!water && +water[3] === 0 && +water[4] === 0;
  console.log('[W1]', JSON.stringify({
    rows: bowlRows.length, beef: beef && [beef[2], +beef[3], +beef[4]],
    milk: milk && [milk[2], +milk[3], +milk[4]], water: water && [water[2], +water[3], +water[4]],
    pass: res.w1,
  }));

  // ---- W2 coin XP (copper 3 = -15, gold 1 = -100) ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest coin copper 3`, 500);
  const copper = lastOf(await waitRow(COIN_RE, from, 6000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest coin gold 1`, 500);
  const gold = lastOf(await waitRow(COIN_RE, from, 6000));
  const okCopper = !!copper && +copper[3] - +copper[4] === 15;
  const okGold = !!gold && +gold[3] - +gold[4] === 100;
  res.w2 = okCopper && okGold;
  console.log('[W2]', JSON.stringify({
    copper: copper && { before: +copper[3], after: +copper[4] },
    gold: gold && { before: +gold[3], after: +gold[4] }, pass: res.w2,
  }));

  // ---- W3 enchanted apple cure ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest applegold 1`, 900);
  const apple = lastOf(await waitRow(APPLE_RE, from, 8000));
  const cure = lastOf(await waitRow(APPLE_CURE_RE, from, 8000));
  res.w3 = !!apple && apple[1] === '1' && apple[2] === 'true' && apple[3] === 'true'
    && !!cure && cure[1] === '1' && +cure[2] === 1;
  console.log('[W3]', JSON.stringify({
    row: apple && { meta: apple[1], cured: apple[2], converting: apple[3] },
    cure: cure && { meta: cure[1], ticks: +cure[2] }, pass: res.w3,
  }));

  // ---- W4 fire cooks raw food ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest firecook`, 900);
  const cook = lastOf(await waitRow(COOK_RE, from, 8000));
  const cookRow = lastOf(await waitRow(/\[FoodR196Log\] firecook raw=(\S+) cooked=(\S+)/, from, 8000));
  res.w4 = !!cook && /beef/.test(cook[1]) && /cooked_beef/.test(cook[2])
    && +cook[3] === 3 && cook[4] === 'true' && !!cookRow;
  console.log('[W4]', JSON.stringify({
    before: cook && cook[1], after: cook && cook[2], count: cook && +cook[3],
    alive: cook && cook[4], hook: !!cookRow, pass: res.w4,
  }));

  // ---- W5 vessel quenching ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest vesseldouse`, 1200);
  const douse = lastOf(await waitRow(DOUSE_RE, from, 8000));
  res.w5 = !!douse && douse[1] === 'true' && +douse[2] < 20 && /bowl/.test(douse[3]);
  console.log('[W5]', JSON.stringify({
    hit: douse && douse[1], fireHp: douse && +douse[2], held: douse && douse[3], pass: res.w5,
  }));

  // ---- W6 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean foodR196Extra = true;/.test(cfg)
    && /getBoolean\("foodR196Extra"/.test(cfg);
  const mainSrc = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const wireOk = /ETIMFoodItems\.register\(\)/.test(mainSrc)
    && /ETIMVesselEvents\.class/.test(mainSrc) && /ETIMAppleGoldEvents\.class/.test(mainSrc);
  const json = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8');
  const mixOk = /"MixinItemAppleGold"/.test(json) && /"MixinEntityZombieVillager"/.test(json);
  const tex = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim', 'textures', 'items');
  const texOk = BOWLS.every(c => fs.existsSync(path.join(tex, 'bowl_' + c.toLowerCase() + '.png')))
    && ['copper', 'silver', 'gold', 'ancient_metal', 'mithril', 'adamantium']
      .every(m => fs.existsSync(path.join(tex, 'coin_' + m + '.png')));
  const en = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim', 'lang', 'en_us.lang'), 'utf8');
  const langOk = /item\.etim\.bowl_beef_stew\.name=/.test(en) && /item\.etim\.coin_gold\.name=/.test(en);
  res.w6 = cfgOk && wireOk && mixOk && texOk && langOk;
  console.log('[W6]', JSON.stringify({ cfgOk, wireOk, mixOk, texOk, langOk, pass: res.w6 }));

  await h.stop();
  await h.stop();
  h.finish(res);
}

h.guard(main);
