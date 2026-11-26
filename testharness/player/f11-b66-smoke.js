// B-66 smoke: R196 block faces (census F :82/:83/:85/:87/:88/:89/:90/:91/:92/:96/:97/:99).
// Verdict channel = server log ([BlockFaceLog]).
//   W1 block stacks: block items 4, anvil 1 (R196 Block.java:1000 / BlockAnvil.java:19)
//   W2 cushioning: sand 0.4 / wool 0.8 / snow layer 0.2 / stone 0.0
//   W3 fall formula: (10-2.5)*2 = 15 raw, stone 15 final, sand 6.6 final
//   W4 drop spread: non-full block drop lands inside its selected box x0.5
//   W5 material traits: ice douse-only, snow douse+dissolve, stone rocky (acid false)
//   W6 static: cfg key, ETIMBlockStacks.apply, fall/drop mixin hooks, helper classes
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const WORLD = 'w-b66-' + RUN + '-v1';

const h = H.create({
  run: RUN,
  world: WORLD,
  bot: A,
  props: { 'allow-flight': 'true' },
  cfg: ['mobs:mobDebugLog', 'blocks:blockR196Face'],
});
const { cmd, mark, slice, waitRow, logLines } = h;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastOf = (rows) => (rows.length ? rows[rows.length - 1] : null);

const STACK_RE = /\[BlockFaceLog\] blockstack stone=(\d+) dirt=(\d+) anvil=(\d+) cauldron=(\d+) wool=(\d+) four=(\d+) one=(\d+)/;
const CUSHION_RE = /\[BlockFaceLog\] cushion block=(\S+) value=([\d.]+)/;
const FALL_RE = /\[BlockFaceLog\] fall dist=([\d.]+) raw=([\d.]+) cushion=([\d.]+) damage=([\d.]+) max=([\d.]+)/;
const DROPBOX_RE = /\[BlockFaceLog\] dropbox at=(-?\d+),(-?\d+),(-?\d+) before=(\d+) after=(\d+) drop=([-\d.]+),([-\d.]+),([-\d.]+)/;
const TRAIT_RE = /\[BlockFaceLog\] mattrait (block|item)=(\S+) fire=(\S+) pepsin=(\S+) acid=(\S+) douse=(\S+) dissolve=(\S+)/;

async function main() {
  h.stampPin();
  await h.boot(`b66-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 block-item stack sizes ----
  let from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest blockstack`, 800);
  const stack = lastOf(await waitRow(STACK_RE, from, 8000));
  res.w1 = !!stack && +stack[1] === 4 && +stack[2] === 4
    && +stack[3] === 1 && +stack[4] === 4 && +stack[5] === 4
    && +stack[6] > 0 && +stack[7] >= 1;
  console.log('[W1]', JSON.stringify({
    stone: stack && +stack[1], dirt: stack && +stack[2], anvil: stack && +stack[3],
    cauldron: stack && +stack[4], wool: stack && +stack[5],
    four: stack && +stack[6], one: stack && +stack[7], pass: res.w1,
  }));

  // ---- W2 cushioning table ----
  from = mark();
  for (const b of ['minecraft:sand', 'minecraft:wool', 'minecraft:snow_layer', 'minecraft:stone']) {
    await cmd(`execute ${A} ~ ~ ~ etest cushion ${b}`, 350);
  }
  const cushions = await waitRow(CUSHION_RE, from, 10000);
  const cmap = new Map(cushions.map(r => [r[1], +r[2]]));
  res.w2 = cmap.get('minecraft:sand') === 0.4 && cmap.get('minecraft:wool') === 0.8
    && cmap.get('minecraft:snow_layer') === 0.2 && cmap.get('minecraft:stone') === 0.0;
  console.log('[W2]', JSON.stringify({
    sand: cmap.get('minecraft:sand'), wool: cmap.get('minecraft:wool'),
    snow: cmap.get('minecraft:snow_layer'), stone: cmap.get('minecraft:stone'), pass: res.w2,
  }));

  // ---- W3 R196 fall formula ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest fall 10`, 500);
  const stoneFall = lastOf(await waitRow(FALL_RE, from, 8000));
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest fall 10 minecraft:sand`, 500);
  const sandFall = lastOf(await waitRow(FALL_RE, from, 8000));
  res.w3 = !!stoneFall && +stoneFall[2] === 15 && +stoneFall[3] === 0 && +stoneFall[4] === 15
    && !!sandFall && +sandFall[2] === 15 && +sandFall[3] === 0.4 && Math.abs(+sandFall[4] - 6.6) < 0.02;
  console.log('[W3]', JSON.stringify({
    stone: stoneFall && { raw: +stoneFall[2], cushion: +stoneFall[3], damage: +stoneFall[4] },
    sand: sandFall && { raw: +sandFall[2], cushion: +sandFall[3], damage: +sandFall[4] },
    pass: res.w3,
  }));

  // ---- W4 non-full-block drop spread ----
  from = mark();
  await cmd(`execute ${A} ~ ~ ~ etest dropbox`, 900);
  const drop = lastOf(await waitRow(DROPBOX_RE, from, 8000));
  let inBox = false;
  if (drop) {
    const dx = +drop[6] - (+drop[1] + 0.5);
    const dz = +drop[8] - (+drop[3] + 0.5);
    inBox = Math.abs(dx) <= 0.07 && Math.abs(dz) <= 0.07;
  }
  res.w4 = !!drop && +drop[4] === 0 && +drop[5] >= 1 && inBox;
  console.log('[W4]', JSON.stringify({
    before: drop && +drop[4], after: drop && +drop[5],
    pos: drop && [+drop[6], +drop[7], +drop[8]], inBox, pass: res.w4,
  }));

  // ---- W5 material traits ----
  from = mark();
  for (const b of ['minecraft:ice', 'minecraft:snow_layer', 'minecraft:stone']) {
    await cmd(`execute ${A} ~ ~ ~ etest mattrait ${b}`, 350);
  }
  const traits = await waitRow(TRAIT_RE, from, 10000);
  const tm = new Map(traits.map(r => [r[2], r]));
  const ice = tm.get('minecraft:ice');
  const snow = tm.get('minecraft:snow_layer');
  const stone = tm.get('minecraft:stone');
  res.w5 = !!ice && ice[6] === 'true' && ice[7] === 'false'
    && !!snow && snow[6] === 'true' && snow[7] === 'true'
    && !!stone && stone[5] === 'false';
  console.log('[W5]', JSON.stringify({
    ice: ice && { douse: ice[6], dissolve: ice[7] },
    snow: snow && { douse: snow[6], dissolve: snow[7] },
    stone: stone && { acid: stone[5] }, pass: res.w5,
  }));

  // ---- W6 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean blockR196Face = true;/.test(cfg)
    && /getBoolean\("blockR196Face"/.test(cfg);
  const mainSrc = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const wireOk = /ETIMBlockStacks\.apply\(\)/.test(mainSrc);
  const blockMixin = fs.readFileSync(path.join(root, 'mixins', 'MixinBlock.java'), 'utf8');
  const fallMixin = fs.readFileSync(path.join(root, 'mixins', 'MixinEntityLivingBase.java'), 'utf8');
  const hookOk = /etim\$r196DropSpread/.test(blockMixin) && /spawnAsEntity/.test(blockMixin)
    && /etim\$r196Fall/.test(fallMixin);
  const helpOk = fs.existsSync(path.join(root, 'world', 'ETIMFall.java'))
    && fs.existsSync(path.join(root, 'world', 'ETIMCushioning.java'))
    && fs.existsSync(path.join(root, 'item', 'ETIMMaterialTraits.java'))
    && fs.existsSync(path.join(root, 'item', 'ETIMBlockStacks.java'));
  res.w6 = cfgOk && wireOk && hookOk && helpOk;
  console.log('[W6]', JSON.stringify({ cfgOk, wireOk, hookOk, helpOk, pass: res.w6 }));

  await h.stop();
  await h.stop();
  h.finish(res);
}

h.guard(main);
