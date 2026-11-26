// B-69 smoke: R196 spark carrier (census F :126) + mounted-block rejection
// arms (census F :127). Verdict channels = [SparkLog] and [MountLog] rows
// plus `etest drought probe` block dumps.
//   W1 spark tick: no fuel -> air (snuff); planks below -> fire;
//      netherrack below -> fire (R196 BlockSpark.java:30-52 exception)
//   W2 flint entry: flint-and-steel on planks writes the spark
//      (BlockSpark.java:21-27 -> [SparkLog] added) and the spark becomes fire
//   W3 mounted rejects: torch on stone/farmland/fence/wool/spawner-top allowed,
//      leaves / sponge / furnace front / dispenser front refused, jukebox top
//      allowed by the flat-top arm (BlockMounted.java:18-40, BlockTorch.java:135-166);
//      skull/trapdoor arms cover the item paths that bypass World#mayPlace
//   W4 static: classes, mixin config, registration, cfg keys, assets, lang
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

// B-70T: boot/stop, props+cfg snapshot-restore, PIN stamping and log slicing
// live in lib/harness.js; this batch only declares its verdict arms below.
const h = H.create({
  run: RUN,
  world: 'w-b69-' + RUN + '-v1',
  bot: A,
  // C-B70T4-2: the reset baseline has farmDebugLog=false, so [FarmLog] drought probe
  // rows (W1/W2 pos + W3 target) would vanish; force it for the window.
  cfg: ['combat:blockDebugLog', 'blocks:sparkR196', 'blocks:mountedR196', 'farm:farmDebugLog'],
  props: { 'allow-flight': 'true' },
  stage: {
    gamemode: 0,
    tp: ['12.5', '130', '10.5'],
    // C-B68-2 lesson: 1.12 `fill` refuses unloaded chunks, so tp first.
    fill: ['fill 0 129 0 24 129 24 minecraft:stone', 'fill 0 130 0 24 133 24 minecraft:air'],
  },
});
const { cmd, mark, slice, waitRow } = h;

const PROBE_RE = /\[FarmLog\] drought probe block=(\S+) age=(-?\d+) pos=(-?\d+),(-?\d+),(-?\d+)/;
const SPARK_RE = /\[SparkLog\] (\S+)(?: pos=(-?\d+),(-?\d+),(-?\d+))?/;
const MAYPLACE_RE = /\[MountLog\] mayplace block=(\S+) face=(\S+) result=(\S+) pos=(-?\d+),(-?\d+),(-?\d+)/;

async function probe(x, y, z) {
  const from = mark();
  await cmd(`etest drought probe ${x} ${y} ${z}`, 200);
  const rows = await waitRow(PROBE_RE, from, 6000);
  return rows.map(r => ({ block: r[1], age: +r[2], x: +r[3], y: +r[4], z: +r[5] }))
    .filter(r => r.x === x && r.y === y && r.z === z)[0] || null;
}

/** Spark rows since `from`, filtered by position when present. */
function sparkRows(from, x, y, z) {
  return slice(from).map(s => SPARK_RE.exec(s)).filter(Boolean).map(m => ({
    kind: m[1], x: m[2] == null ? null : +m[2], y: m[3] == null ? null : +m[3], z: m[4] == null ? null : +m[4],
  })).filter(r => r.x == null || (r.x === x && r.y === y && r.z === z));
}

/**
 * Every non-`mayplace` `[MountLog]` row since `from`, parsed as key=value so
 * the rule lines and the farmland grant line share one reader (the grant line
 * orders face/block/support differently from the rule lines).
 */
function mountRows(from) {
  const out = [];
  for (const s of slice(from)) {
    if (!s.includes('[MountLog]') || s.includes('mayplace')) {
      continue;
    }
    const kv = {};
    for (const m of s.matchAll(/([A-Za-z_]+)=([^\s\]]+)/g)) {
      kv[m[1]] = m[2];
    }
    if (!kv.rule) {
      continue;
    }
    const p = kv.pos ? kv.pos.split(',').map(Number) : [null, null, null];
    out.push({
      rule: kv.rule, face: kv.face, support: kv.support, block: kv.block,
      result: kv.result, x: p[0], y: p[1], z: p[2],
    });
  }
  return out;
}

/** Stage one torch and right-click `pos` on `face`; returns the neighbour probe. */
async function torchAt(x, y, z, face) {
  await cmd(`etest hold minecraft:torch ${A}`, 400);
  // C-B69-1: /etest useblock replays a real right-click packet, so the server
  // applies the reach check; the player was parked at 12.5,130,10.5 and every
  // click was denied (`etim.reach.deny_block`). Stand next to the support:
  // the deny log showed `3.35 > 2.75` at a 2.5-block offset, so 1.5 fits.
  await cmd(`tp ${A} ${x + 0.5} ${y + 1} ${face === 'north' ? z - 1.5 : z + 1.5}`, 500);
  const from = mark();
  const dx = face === 'up' ? 0 : face === 'down' ? 0 : face === 'north' ? 0 : face === 'south' ? 0 : face === 'east' ? 1 : -1;
  const dy = face === 'up' ? 1 : face === 'down' ? -1 : 0;
  const dz = face === 'north' ? -1 : face === 'south' ? 1 : 0;
  await cmd(`etest useblock ${x} ${y} ${z} ${face} ${A}`, 900);
  const rows = mountRows(from);
  const target = await probe(x + dx, y + dy, z + dz);
  return { rows, target };
}

/**
 * Ask the placement funnel directly. Furnaces and dispensers consume the right
 * click in `onBlockActivated` (GUI) before item use runs, so their front-face
 * arms cannot be reached by a player click (B-B69-2).
 */
async function mayPlace(x, y, z, face, blockName) {
  const from = mark();
  const blockArg = blockName ? ` ${blockName}` : '';
  await cmd(`etest mayplace ${x} ${y} ${z} ${face}${blockArg} ${A}`, 700);
  const rows = slice(from).map(s => MAYPLACE_RE.exec(s)).filter(Boolean)
    .map(m => ({ block: m[1], face: m[2], result: m[3], x: +m[4], y: +m[5], z: +m[6] }))
    .filter(r => r.x === x && r.y === y && r.z === z);
  return { row: rows[0] || null, rule: mountRows(from).filter(r => r.x === x && r.y === y && r.z === z)[0] || null };
}

/**
 * Stage one sign and right-click `pos` on `face`; returns the neighbour probe.
 * Signs bypass the funnel in 1.12, so these arms must go through the item.
 */
async function signAt(x, y, z, face) {
  await cmd(`etest hold minecraft:sign ${A}`, 400);
  await cmd(`tp ${A} ${x + 0.5} ${y + 1} ${z + 1.5}`, 500);
  const from = mark();
  const dy = face === 'up' ? 1 : 0;
  await cmd(`etest useblock ${x} ${y} ${z} ${face} ${A}`, 900);
  return { rows: mountRows(from), target: await probe(x, y + dy, z) };
}

/**
 * Generic real-click placement (`etest hold` + `etest useblock`) for arms that
 * must go through the item itself: skulls (A-B69-5) and trapdoors (A-B69-7,
 * whose half only exists at item-use time).
 */
async function holdAt(item, x, y, z, face) {
  await cmd(`etest hold ${item} ${A}`, 400);
  await cmd(`tp ${A} ${x + 0.5} ${y + 1} ${face === 'north' ? z - 1.5 : z + 1.5}`, 500);
  const from = mark();
  const dx = face === 'east' ? 1 : 0;
  const dy = face === 'up' ? 1 : 0;
  const dz = face === 'north' ? -1 : 0;
  await cmd(`etest useblock ${x} ${y} ${z} ${face} ${A}`, 900);
  return { rows: mountRows(from), target: await probe(x + dx, y + dy, z + dz) };
}

async function main() {
  h.stampPin();
  await h.boot(`b69-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false };

  // ---- W1 spark tick: snuff / planks / netherrack ----
  await cmd('setblock 10 129 4 minecraft:stone', 200);
  await cmd('setblock 12 129 4 minecraft:planks', 200);
  await cmd('setblock 14 129 4 minecraft:netherrack', 200);
  await cmd('setblock 10 130 4 minecraft:air', 150);
  await cmd('setblock 12 130 4 minecraft:air', 150);
  await cmd('setblock 14 130 4 minecraft:air', 150);
  let from = mark();
  await cmd('setblock 10 130 4 etim:spark', 1200);
  const snuffRows = sparkRows(from, 10, 130, 4);
  const snuffPos = await probe(10, 130, 4);
  from = mark();
  await cmd('setblock 12 130 4 etim:spark', 1200);
  const plankRows = sparkRows(from, 12, 130, 4);
  const plankPos = await probe(12, 130, 4);
  from = mark();
  await cmd('setblock 14 130 4 etim:spark', 1200);
  const netherRows = sparkRows(from, 14, 130, 4);
  const netherPos = await probe(14, 130, 4);
  res.w1 = snuffRows.some(r => r.kind === 'tick') && snuffPos && snuffPos.block === 'minecraft:air'
    && plankRows.some(r => r.kind === 'added') && plankRows.some(r => r.kind === 'tick')
    && plankPos && plankPos.block === 'minecraft:fire'
    && netherRows.some(r => r.kind === 'tick') && netherPos && netherPos.block === 'minecraft:fire';
  console.log('[W1]', JSON.stringify({
    snuff: { rows: snuffRows, pos: snuffPos },
    planks: { rows: plankRows, pos: plankPos },
    netherrack: { rows: netherRows, pos: netherPos },
    pass: res.w1,
  }));

  // ---- W2 flint writes the spark, spark becomes fire ----
  await cmd('setblock 16 129 4 minecraft:planks', 200);
  await cmd('setblock 16 130 4 minecraft:air', 150);
  await cmd('etest hold minecraft:flint_and_steel ' + A, 500);
  // C-B69-1: same reach rule for the flint click.
  await cmd(`tp ${A} 16.5 130 6.5`, 500);
  from = mark();
  await cmd(`etest useblock 16 129 4 up ${A}`, 1500);
  const flintRows = sparkRows(from, 16, 130, 4);
  const flintPos = await probe(16, 130, 4);
  const added = flintRows.find(r => r.kind === 'added');
  const portalFlag = added ? (/\[SparkLog\] added pos=-?\d+,-?\d+,-?\d+ portal=(\w+)/.exec(slice(from).join('\n')) || [])[1] : null;
  res.w2 = !!added && portalFlag === 'false'
    && flintRows.some(r => r.kind === 'tick')
    && flintPos && flintPos.block === 'minecraft:fire';
  console.log('[W2]', JSON.stringify({ rows: flintRows, portal: portalFlag, pos: flintPos, pass: res.w2 }));

  // ---- W3 mounted arms: R196 §2 seven groups ----
  // Torch and skull are checked end to end where vanilla lets the click land;
  // the remaining arms ask the funnel directly (`/etest mayplace`) so the rule
  // layer is judged without vanilla geometry or GUI handlers in the way.
  await cmd('fill 0 130 0 24 133 24 minecraft:air', 400);
  const supports = [
    [3, 4, 'minecraft:stone'],
    [5, 4, 'minecraft:leaves 4'],
    [7, 4, 'minecraft:jukebox'],
    [9, 4, 'minecraft:sponge'],
    [11, 4, 'minecraft:farmland 7'],
    [13, 4, 'minecraft:furnace 2'],
    [15, 4, 'minecraft:dispenser 2'],
    [17, 4, 'minecraft:fence'],
    [19, 4, 'minecraft:wool 14'],
    [21, 4, 'minecraft:mob_spawner'],
    [3, 6, 'minecraft:dirt'],
    [5, 6, 'minecraft:stone_slab 0'],
    [7, 6, 'minecraft:oak_stairs 0'],
    [9, 6, 'minecraft:snow_layer 3'],
    [11, 6, 'minecraft:enchanting_table'],
    [3, 10, 'minecraft:stone'],
    [5, 10, 'minecraft:leaves 4'],
    [6, 9, 'minecraft:stone_slab 8'],   // top slab: wrong half for a lower trapdoor
    [9, 9, 'minecraft:stone_slab 0'],   // bottom slab: side is not flat+solid
    [3, 12, 'minecraft:stone_slab 0'],  // bottom slab top: not flat+solid
    [5, 12, 'minecraft:stone_slab 8'],  // top slab top: flat+solid
    [12, 9, 'minecraft:snow_layer 7'],  // full snow: flat+solid on every face
  ];
  for (const [x, z, block] of supports) {
    await cmd(`setblock ${x} 129 ${z} ${block}`, 150);
  }
  // C-B69-7: the funnel's final boolean needs a replaceable target cell, so
  // free every side-arm cell that sits in the y=129 floor line.
  for (const c of [[13, 129, 3], [13, 129, 5], [15, 129, 3], [3, 129, 3],
    [4, 129, 4], [11, 129, 3], [22, 129, 4], [8, 129, 6], [6, 129, 6], [10, 129, 6], [3, 129, 5], [5, 129, 5],
    [7, 129, 9], [10, 129, 9], [13, 129, 9], [10, 129, 4]]) {
    await cmd(`setblock ${c[0]} ${c[1]} ${c[2]} minecraft:air`, 120);
  }
  // Group 1-2: real clicks — plain / leaves / jukebox top / sponge / farmland
  // grant / fence top / wool / spawner top.
  const onStone = await torchAt(3, 129, 4, 'up');
  const onLeaves = await torchAt(5, 129, 4, 'up');
  const onJukebox = await torchAt(7, 129, 4, 'up');
  const onSponge = await torchAt(9, 129, 4, 'up');
  const onFarmland = await torchAt(11, 129, 4, 'up');
  const onFence = await torchAt(17, 129, 4, 'up');
  const onWool = await torchAt(19, 129, 4, 'up');
  const onSpawnerTop = await torchAt(21, 129, 4, 'up');
  // B-B69-2: furnaces and dispensers consume the click in onBlockActivated.
  const furnaceFront = await mayPlace(13, 129, 3, 'north');
  const furnaceBack = await mayPlace(13, 129, 5, 'south');
  const dispenserFront = await mayPlace(15, 129, 3, 'north');
  const stoneSide = await mayPlace(3, 129, 3, 'north');
  // Group 3-5: subclass allow arms and the never-hides reject.
  const spawnerSide = await mayPlace(22, 129, 4, 'east', 'minecraft:torch');
  const stairsBack = await mayPlace(8, 129, 6, 'east', 'minecraft:torch');
  const slabSide = await mayPlace(6, 129, 6, 'east', 'minecraft:torch');
  // C-B69-10: snow_layer melts under open sky (light > 11), so box it first.
  for (const c of [[9, 130, 6], [10, 130, 6], [9, 131, 6], [10, 131, 6], [12, 130, 9]]) {
    await cmd(`setblock ${c[0]} ${c[1]} ${c[2]} minecraft:stone`, 120);
  }
  await cmd('setblock 9 129 6 minecraft:snow_layer 3', 150);
  const snowSide = await mayPlace(10, 129, 6, 'east', 'minecraft:torch');
  const enchBottom = await mayPlace(11, 128, 6, 'down', 'minecraft:torch');
  // Group 6-7: skull arms and the trapdoor material gate.
  const skullFenceTop = await mayPlace(17, 130, 4, 'up', 'minecraft:skull');
  const skullWool = await mayPlace(19, 130, 4, 'up', 'minecraft:skull');
  const skullSpawnerSide = await mayPlace(22, 129, 4, 'east', 'minecraft:skull');
  const trapdoorDirt = await mayPlace(3, 129, 5, 'north', 'minecraft:trapdoor');
  const trapdoorSlab = await mayPlace(5, 129, 5, 'north', 'minecraft:trapdoor');
  // A-B69-5 / A-B69-7: skulls and trapdoors bypass the funnel in 1.12, so these
  // four arms run through the real item to prove the hooks fire.
  const skullSpawnerReal = await holdAt('minecraft:skull', 21, 129, 4, 'east');
  const skullStoneReal = await holdAt('minecraft:skull', 3, 129, 4, 'east');
  const trapdoorFarmlandReal = await holdAt('minecraft:trapdoor', 11, 129, 4, 'north');
  const trapdoorSlabReal = await holdAt('minecraft:trapdoor', 5, 129, 6, 'east');
  // A-B69-7 (round 3): a top slab under a lower trapdoor must be rejected, not
  // deferred; A-B69-8: the direct item paths now run the flat+solid face arms.
  const trapdoorWrongHalfReal = await holdAt('minecraft:trapdoor', 6, 129, 9, 'east');
  const skullSlabSideReal = await holdAt('minecraft:skull', 9, 129, 9, 'east');
  // A-B69-10 / A-B69-11 / A-B69-8: base-arm order and the full/thin snow faces.
  const signFurnaceFront = await mayPlace(13, 129, 3, 'north', 'minecraft:standing_sign');
  const skullSpongeSide = await mayPlace(10, 129, 4, 'east', 'minecraft:skull');
  // C-B69-15: the query cell is the empty cell above the support, not the support itself.
  const signFarmland = await mayPlace(11, 130, 4, 'up', 'minecraft:standing_sign');
  // C-B69-18: BlockSnow.LAYERS = meta + 1, so thin snow (3 layers) is meta 2.
  // C-B69-20: snow melts in daylight, so re-place it and roof both columns.
  // C-B69-21 (r20): thin snow has to be probed from the side — with the vertical
  // arm first (A-B69-12) a face=up query can only ever report trapdoor-vertical.
  await cmd('setblock 9 131 6 minecraft:stone', 150);
  await cmd('setblock 10 131 6 minecraft:stone', 150);
  await cmd('setblock 9 130 6 minecraft:air', 150);
  await cmd('setblock 10 130 6 minecraft:air', 150);
  await cmd('setblock 9 129 6 minecraft:snow_layer 2', 150);
  const trapdoorThinSnow = await mayPlace(10, 129, 6, 'east', 'minecraft:trapdoor');
  // C-B69-22 (r20): full snow (8 layers = meta 7) side is the thin-snow control group.
  await cmd('setblock 12 129 9 minecraft:snow_layer 7', 150);
  await cmd('setblock 12 130 9 minecraft:stone', 150);
  const signFullSnowSide = await mayPlace(13, 129, 9, 'east', 'minecraft:standing_sign');
  const trapdoorDeepSnowSide = await mayPlace(13, 129, 9, 'east', 'minecraft:trapdoor');
  // A-B69-12: BlockTrapDoor.java:143-152 maps only the four horizontal faces;
  // UP/DOWN return -1 and Block.java:2818-2824 fails on that metadata.
  await cmd('setblock 18 131 4 minecraft:stone', 150);
  const trapdoorStoneTop = await mayPlace(18, 130, 4, 'up', 'minecraft:trapdoor');
  const trapdoorStoneBottom = await mayPlace(18, 130, 4, 'down', 'minecraft:trapdoor');
  // Signs bypass World#mayPlace in 1.12 (A-B69-1), so they get real clicks.
  const onStoneSign = await signAt(3, 129, 10, 'up');
  const onLeavesSign = await signAt(5, 129, 10, 'up');
  const onBottomSlabSign = await signAt(3, 129, 12, 'up');
  const onTopSlabSign = await signAt(5, 129, 12, 'up');

  const torchOk = (r) => !!r.target && r.target.block === 'minecraft:torch';
  const airOk = (r) => !!r.target && r.target.block === 'minecraft:air';
  const hasRule = (r, name, result) => (!!r.rule && r.rule.rule === name && r.rule.result === result)
    // C-B69-11: real-click arms carry their rows in `rows`, not in `rule`.
    || (r.rows || []).some(x => x.rule === name && x.result === result);
  const granted = onFarmland.rows.some(r => r.rule === 'tilled-field-grant');
  res.w3 = torchOk(onStone) && torchOk(onFarmland) && granted
    && airOk(onLeaves) && torchOk(onJukebox)
    && hasRule(onJukebox, 'torch-flat-top', 'allow')  // A-B69-6: the flat-top arm wins before the jukebox arm
  && torchOk(onSponge) && hasRule(onSponge, 'torch-flat-top', 'allow')  // B-B69-3: flat&solid wins before the sponge arm
    && torchOk(onFence) && torchOk(onWool) && torchOk(onSpawnerTop)
    && hasRule(onFence, 'torch-fence-top', 'allow')
    && hasRule(onWool, 'torch-flat-top', 'allow')  // B-B69-4: wool top hits the flat-top arm first
    && hasRule(onSpawnerTop, 'torch-flat-top', 'allow')
    && hasRule(spawnerSide, 'never-hides', 'reject')
    && hasRule(stairsBack, 'torch-stairs-back', 'allow')
    && hasRule(slabSide, 'torch-slab-bottom', 'allow')
    && hasRule(snowSide, 'torch-snow-side', 'allow')
    && hasRule(enchBottom, 'geometry', 'allow')
    && hasRule(skullFenceTop, 'skull-fence-top', 'allow')
    && hasRule(skullWool, 'skull-cloth', 'allow')  // R196 skull override: cloth allows before flat-top
    && hasRule(skullSpawnerSide, 'never-hides', 'reject')  // C-B69-16: base chain runs before the skull face arm again
    && hasRule(trapdoorDirt, 'trapdoor-material', 'reject')
    && hasRule(trapdoorSlab, 'trapdoor-shape-defer', 'allow')  // A-B69-7: no state in the funnel
    && airOk(skullSpawnerReal) && hasRule(skullSpawnerReal, 'never-hides', 'reject')  // C-B69-16: base chain runs before the skull face arm again
    && !!skullStoneReal.target && skullStoneReal.target.block === 'minecraft:skull'
    && hasRule(skullStoneReal, 'skull-face', 'allow')
    && airOk(trapdoorFarmlandReal) && hasRule(trapdoorFarmlandReal, 'trapdoor-material', 'reject')
    && !!trapdoorSlabReal.target && trapdoorSlabReal.target.block === 'minecraft:trapdoor'
    && hasRule(trapdoorSlabReal, 'trapdoor-shape', 'allow')
    && airOk(trapdoorWrongHalfReal) && hasRule(trapdoorWrongHalfReal, 'trapdoor-wrong-half', 'reject')
    && airOk(skullSlabSideReal) && hasRule(skullSlabSideReal, 'skull-not-flat', 'reject')
    && !!furnaceFront.row && furnaceFront.row.result === 'reject'
    && !!furnaceBack.row && furnaceBack.row.result === 'allow'
    && !!dispenserFront.row && dispenserFront.row.result === 'reject'
    && !!stoneSide.row && stoneSide.row.result === 'allow'
    && !!onStoneSign.target && onStoneSign.target.block === 'minecraft:standing_sign'
    && airOk(onLeavesSign)
    && airOk(onBottomSlabSign) && hasRule(onBottomSlabSign, 'sign-not-flat', 'reject')
    && !!onTopSlabSign.target && onTopSlabSign.target.block === 'minecraft:standing_sign'
    && hasRule(onTopSlabSign, 'sign-flat-top', 'allow')
    && !!signFurnaceFront.row && signFurnaceFront.row.result === 'reject'
    && !!skullSpongeSide.row && skullSpongeSide.row.result === 'reject'
    && hasRule(signFarmland, 'tilled-field', 'allow')  // C-B69-19: rule-face arm; the funnel boolean is vanilla's
    && hasRule(trapdoorThinSnow, 'trapdoor-thin-snow', 'reject')
    && !!signFullSnowSide.row && signFullSnowSide.row.result === 'allow'
    && !!trapdoorDeepSnowSide.row && trapdoorDeepSnowSide.row.result === 'allow'
    && hasRule(trapdoorStoneTop, 'trapdoor-vertical', 'reject')
    && hasRule(trapdoorStoneBottom, 'trapdoor-vertical', 'reject');
  console.log('[W3]', JSON.stringify({
    stone: onStone, leaves: onLeaves, jukebox: onJukebox, sponge: onSponge,
    farmland: onFarmland, granted, fence: onFence, wool: onWool, spawnerTop: onSpawnerTop,
    furnaceFront, furnaceBack, dispenserFront, stoneSide,
    spawnerSide, stairsBack, slabSide, snowSide, enchBottom,
    skullFenceTop, skullWool, skullSpawnerSide, trapdoorDirt, trapdoorSlab,
    skullSpawnerReal, skullStoneReal, trapdoorFarmlandReal, trapdoorSlabReal,
    trapdoorWrongHalfReal, skullSlabSideReal,
    signFurnaceFront, skullSpongeSide, signFarmland, trapdoorThinSnow, signFullSnowSide, trapdoorDeepSnowSide,
    trapdoorStoneTop, trapdoorStoneBottom,
    stoneSign: onStoneSign, leavesSign: onLeavesSign,
    bottomSlabSign: onBottomSlabSign, topSlabSign: onTopSlabSign, pass: res.w3,
  }));

  // ---- W4 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const assets = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const srcOk = ['world', 'world', 'world', 'mixins', 'mixins', 'mixins', 'mixins', 'mixins'].every((pkg, i) => fs.existsSync(path.join(root, pkg,
    ['ETIMBlockSpark.java', 'ETIMMountRules.java', 'ETIMSpecialBlocks.java', 'MixinWorldMayPlace.java',
      'MixinItemFlintAndSteel.java', 'MixinBlockTorchFarmland.java', 'MixinItemSign.java',
      'MixinItemSkull.java'][i])));
  const flintOk = /setMaxDamage\(16\)/.test(fs.readFileSync(path.join(root, 'mixins', 'MixinItemFlintAndSteel.java'), 'utf8'))
    && /isAirBlock\(pos\.offset\(facing\)\)/.test(fs.readFileSync(path.join(root, 'mixins', 'MixinItemFlintAndSteel.java'), 'utf8'))
    && /BlockTrapDoor/.test(fs.readFileSync(path.join(root, 'mixins', 'MixinItemBlock.java'), 'utf8'));
  const mixinJson = fs.readFileSync(path.join(L.ROOT, 'src', 'main', 'resources', 'mixins.etim.json'), 'utf8');
  const mixinOk = (mixinJson.match(/"MixinWorldMayPlace"/g) || []).length === 1
    && (mixinJson.match(/"MixinItemFlintAndSteel"/g) || []).length === 1
    && (mixinJson.match(/"MixinItemSign"/g) || []).length === 1
    && (mixinJson.match(/"MixinItemSkull"/g) || []).length === 1
    && (mixinJson.match(/"MixinBlockTorchFarmland"/g) || []).length === 1;
  const etimSrc = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const regOk = (etimSrc.match(/ETIMSpecialBlocks\.register\(\)/g) || []).length === 1;
  const cfgSrc = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const cfgOk = /public static boolean sparkR196 = true;/.test(cfgSrc)
    && /public static boolean mountedR196 = true;/.test(cfgSrc)
    && (cfgSrc.match(/getBoolean\("sparkR196"/g) || []).length === 1
    && (cfgSrc.match(/getBoolean\("mountedR196"/g) || []).length === 1;
  const cmdSrc = fs.readFileSync(path.join(root, 'commands', 'CommandDevTest.java'), 'utf8');
  const cmdOk = /case "mayplace":/.test(cmdSrc) && /executeMayPlace\(/.test(cmdSrc);
  const assetsOk = fs.existsSync(path.join(assets, 'blockstates', 'spark.json'))
    && fs.existsSync(path.join(assets, 'models', 'block', 'spark.json'));
  const lang = fs.readFileSync(path.join(assets, 'lang', 'en_us.lang'), 'utf8');
  const langOk = /tile\.etim\.spark\.name=Spark/.test(lang);
  const rulesSrc = fs.readFileSync(path.join(root, 'world', 'ETIMMountRules.java'), 'utf8');
  const rulesOk = /faceFlatAndSolid/.test(rulesSrc)
    && /trapdoor-wrong-half/.test(rulesSrc)
    && /trapdoor-thin-snow/.test(rulesSrc)
    && /-not-flat/.test(rulesSrc)
    && /skull-fence-top/.test(rulesSrc)
    && /trapdoor-vertical/.test(rulesSrc)
    && /getAxis\(\)\.isVertical\(\)/.test(rulesSrc);
  res.w4 = srcOk && flintOk && mixinOk && regOk && cfgOk && cmdOk && assetsOk && langOk && rulesOk;
  console.log('[W4]', JSON.stringify({ srcOk, flintOk, mixinOk, regOk, cfgOk, cmdOk, assetsOk, langOk, rulesOk, pass: res.w4 }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
