// B-64 smoke: R196 Item.java base faces (census F :142/:143/:149/:150).
// Verdict channel = server log ([ItemLog]).
//   W1 stack table: /etest itemstack -> stick 32, flint/reeds/quartz 16, paper 64,
//      cake 8, cauldron 4, pie 8, book 1, bucket 1, dirt 16, sword 1, ETIM pins 16
//   W2 melt math: /etest melt <count> <ticks> <temp> -> snowball + ice lose items
//   W3 melt wiring: MixinEntityItem drop arm + PlayerTickEvent inventory arm + cfg
//   W4 vine placement: /etest vineplace north -> vineplace row + placed stone
//   W5 config/wiring: three cfg keys, ETIMItemStacks.apply() wired after init
//   W6 source parity: default-16 ctor injection, R196 table, snow/ice classification
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const WORLD = 'w-b64-' + RUN + '-v1';

const h = H.create({
  run: RUN,
  world: WORLD,
  bot: A,
  props: { 'allow-flight': 'true' },
  cfg: ['mobs:mobDebugLog', 'items:itemsStack16R196', 'items:itemsMeltR196', 'items:itemsVinePlaceR196'],
});
const { cmd, mark, slice, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

const STACK_RE = /\[ItemLog\] stack stick=(\d+) flint=(\d+) reeds=(\d+) paper=(\d+) quartz=(\d+) cake=(\d+) cauldron=(\d+) pie=(\d+) book=(\d+) bucket=(\d+) dirt=(\d+) sword=(\d+) etim16=(\d+)/;
const MELT_RE = /\[ItemLog\] meltdev kind=(\w+) count=(\d+) ticks=(\d+) temp=([\d.]+)(?: chance=([\d.]+))? lost=(\d+) left=(\d+)/;
const VINE_RE = /\[ItemLog\] vineplace face=(\w+) block=(\S+) at (-?\d+), (-?\d+), (-?\d+)/;
const VINECMD_RE = /\[ItemLog\] vineplacecmd face=(\w+) placed=(\S+) at (-?\d+), (-?\d+), (-?\d+)/;

async function main() {
  h.stampPin();
  await h.boot(`b64-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 stack table ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest itemstack`, 700);
  const st = lastOf(await waitRow(STACK_RE, from, 6000));
  // dirt is index 10: after B-66 every block item is 4 (R196 Block.java:1000),
  // so the B-64 expectation of 16 is stale. Reeds/cake stay 16/8 (Item.java:150/:197).
  const want = [32, 16, 16, 64, 16, 8, 4, 8, 1, 1, 4, 1];
  res.w1 = !!st && want.every((v, i) => +st[i + 1] === v) && +st[13] >= 1;
  console.log('[W1]', JSON.stringify({
    row: st ? st.slice(1, 14).map(Number) : null, want, etim16: st ? +st[13] : null, pass: res.w1,
  }));

  // ---- W2 melt math (snowball + ice, 200 items x 200 ticks at 20.0) ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest melt 200 200 20`, 2500);
  const melts = await waitRow(MELT_RE, from, 8000);
  const snow = lastOf(melts.filter(r => r[1] === 'snowball'));
  const ice = lastOf(melts.filter(r => r[1] === 'ice'));
  const okSnow = !!snow && +snow[6] > 0 && +snow[7] === 200 - +snow[6];
  const okIce = !!ice && +ice[6] > 0 && +ice[7] === 200 - +ice[6];
  res.w2 = okSnow && okIce && Math.abs(+snow[5] - 0.0019) < 1e-9;
  console.log('[W2]', JSON.stringify({
    snow: snow && { chance: +snow[5], lost: +snow[6], left: +snow[7] },
    ice: ice && { lost: +ice[6], left: +ice[7] }, pass: res.w2,
  }));

  // ---- W3 melt wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const itemSrc = fs.readFileSync(path.join(root, 'mixins', 'MixinEntityItem.java'), 'utf8');
  const meltSrc = fs.readFileSync(path.join(root, 'item', 'ETIMItemMelt.java'), 'utf8');
  const dropHook = /etim\$meltTick/.test(itemSrc) && /ETIMItemMelt\.tickDropped/.test(itemSrc);
  const invHook = /@SubscribeEvent/.test(meltSrc) && /PlayerTickEvent/.test(meltSrc)
    && /meltSlots/.test(meltSrc);
  const tempRule = /isBurning\(\) \? 20\.0F/.test(meltSrc);
  res.w3 = dropHook && invHook && tempRule;
  console.log('[W3]', JSON.stringify({ dropHook, invHook, tempRule, pass: res.w3 }));

  // ---- W4 vine placement ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest vineplace north`, 900);
  const vine = lastOf(await waitRow(VINE_RE, from, 6000));
  const vineCmd = lastOf(await waitRow(VINECMD_RE, from, 6000));
  res.w4 = !!vine && vine[1] === 'north' && /stone/.test(vine[2])
    && !!vineCmd && vineCmd[2] === 'minecraft:stone';
  console.log('[W4]', JSON.stringify({
    vineplace: vine && { face: vine[1], block: vine[2], at: `${vine[3]},${vine[4]},${vine[5]}` },
    cmd: vineCmd && { face: vineCmd[1], placed: vineCmd[2] }, pass: res.w4,
  }));

  // ---- W5 cfg + wiring ----
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean itemsStack16R196 = true;/.test(cfg)
    && /public static boolean itemsMeltR196 = true;/.test(cfg)
    && /public static boolean itemsVinePlaceR196 = true;/.test(cfg)
    && /getBoolean\("itemsStack16R196"/.test(cfg)
    && /getBoolean\("itemsMeltR196"/.test(cfg)
    && /getBoolean\("itemsVinePlaceR196"/.test(cfg);
  const mainSrc = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const wireOk = /ETIMItemMelt\.class/.test(mainSrc) && /ETIMVinePlace\.class/.test(mainSrc)
    && /ETIMItemStacks\.apply\(\)/.test(mainSrc);
  res.w5 = cfgOk && wireOk;
  console.log('[W5]', JSON.stringify({ cfgOk, wireOk, pass: res.w5 }));

  // ---- W6 source parity ----
  const mixItem = fs.readFileSync(path.join(root, 'mixins', 'MixinItem.java'), 'utf8');
  const default16 = /method = "<init>"/.test(mixItem) && /setMaxStackSize\(16\)/.test(mixItem);
  const stacksSrc = fs.readFileSync(path.join(root, 'item', 'ETIMItemStacks.java'), 'utf8');
  const tableOk = /set\(Items\.STICK, 32\)/.test(stacksSrc) && /set\(Items\.PAPER, 64\)/.test(stacksSrc)
    && /set\(Items\.QUARTZ, 16\)/.test(stacksSrc) && /set\(Items\.CAULDRON, 4\)/.test(stacksSrc);
  const sortOk = /Items\.SNOWBALL/.test(meltSrc) && /Blocks\.PACKED_ICE/.test(meltSrc)
    && /Blocks\.FROSTED_ICE/.test(meltSrc);
  res.w6 = default16 && tableOk && sortOk;
  console.log('[W6]', JSON.stringify({ default16, tableOk, sortOk, pass: res.w6 }));

  await h.stop();
  await h.stop();
  h.finish(res);
}

h.guard(main);
