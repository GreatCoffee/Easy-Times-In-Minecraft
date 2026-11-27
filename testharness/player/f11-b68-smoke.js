// B-68 smoke: R196 root crops (carrot/potato/onion) + four dead-plant families
// (census F :128/:129). Verdict channel = [FarmLog] rows only.
//   W1 planting: onion item (ItemSeedFood) plants etim:onions on farmland,
//      refuses stone (R196 ItemSeedFood top-face soil gate)
//   W2 mature yields: carrot/potato/onion age7 -> 2..3 crop items
//   W3 branch table: carrot age0 -> 1 seed, carrot age3 -> 0,
//      potato age3 -> 1 poisonous potato, onion age3 -> 0
//   W4 blight: potato age7 blighted -> 1 poisonous potato; onion age7 blighted -> 0
//   W5 drought dead families: carrot/potato/onion/wheat -> dead_carrot /
//      dead_potato / dead_onion / dead_crop with the age preserved;
//      mature onion -> 2..3 onion drops + air
//   W6 static: carriers/registration/assets/models/lang, stage7 removed
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');
const fs = require('fs');
const path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-b68-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 0,
    tp: [12.5, 130, 12.5],
    fill: [
      'fill 0 129 0 24 129 24 minecraft:stone',
      'fill 0 130 0 24 133 24 minecraft:air',
      'fill 3 130 8 20 130 8 minecraft:farmland 7',
      'fill 3 130 10 20 130 10 minecraft:farmland 0',
      'tp ETIM_F7 3.5 130 6.5',
    ],
  },
  props: { 'allow-flight': 'true' },
  cfg: ['farm:farmDebugLog', 'farm:blightR196', 'farm:droughtDeathR196'],
});
const { cmd, mark, slice, waitRow, logLines } = h;
function lastOf(rows) { return rows.length ? rows[rows.length - 1] : null; }

const PROBE_RE = /\[FarmLog\] drought probe block=(\S+) age=(-?\d+) pos=(-?\d+),(-?\d+),(-?\d+)/;
const ROOT_RE = /\[FarmLog\] rootcrop crop=(\S+) age=(\d+) blighted=(\d) harvester=(\S+) branch=(\S+) drops=(\d+) first=(\S+) pos=(-?\d+),(-?\d+),(-?\d+)/;
const DROUGHT_RE = /drought event kind=(\S+) block=(\S+) age=(\d+) pos=(-?\d+),(-?\d+),(-?\d+) roll=\S+ (?:drop=(\S+)|dead=(\S+))/;

async function probe(x, y, z) {
  const from = mark();
  await cmd(`etest drought probe ${x} ${y} ${z}`, 200);
  const rows = await waitRow(PROBE_RE, from, 6000);
  return rows.map(r => ({ block: r[1], age: +r[2], x: +r[3], y: +r[4], z: +r[5] }))
    .filter(r => r.x === x && r.y === y && r.z === z)[0] || null;
}

async function harvestAt(x, y, z) {
  const from = mark();
  await cmd(`etest harvest ${x} ${y} ${z} ${A}`, 300);
  const rows = await waitRow(ROOT_RE, from, 6000);
  const hit = rows.map(r => ({
    crop: r[1], age: +r[2], blighted: r[3] === '1', harvester: r[4],
    branch: r[5], drops: +r[6], first: r[7],
    x: +r[8], y: +r[9], z: +r[10],
  })).filter(r => r.x === x && r.y === y && r.z === z);
  return hit[0] || null;
}

async function droughtRoll(x, y, z) {
  const from = mark();
  await cmd(`etest drought roll ${x} ${y} ${z} 1`, 300);
  const rows = await waitRow(DROUGHT_RE, from, 6000);
  const hit = rows.map(r => ({
    kind: r[1], block: r[2], age: +r[3],
    x: +r[4], y: +r[5], z: +r[6],
    drop: r[7] || null, dead: r[8] || null,
  })).filter(r => r.x === x && r.y === y && r.z === z);
  return hit[0] || null;
}

async function place(x, y, z, block) {
  await cmd(`setblock ${x} ${y} ${z} ${block}`, 250);
}

async function main() {
  const pinOk = h.stampPin();
  await h.boot(`b68-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1 onion item plants on farmland only ----
  await place(20, 130, 8, 'minecraft:farmland[moisture=7]');
  await place(20, 131, 8, 'minecraft:air');
  await place(21, 130, 8, 'minecraft:stone');
  await place(21, 131, 8, 'minecraft:air');
  await cmd(`etest hold etim:onion ${A}`, 500);
  // processTryUseItemOnBlock enforces (reach+3)^2 = 64 — stand next to the row.
  await cmd('tp ' + A + ' 19.5 130 9.5', 900);
  await cmd(`etest useblock 20 130 8 up ${A}`, 1500);
  const planted = await probe(20, 131, 8);
  await cmd(`etest useblock 21 130 8 up ${A}`, 1200);
  const refused = await probe(21, 131, 8);
  res.w1 = !!planted && planted.block === 'etim:onions' && planted.age === 0
    && !!refused && refused.block === 'minecraft:air';
  console.log('[W1]', JSON.stringify({ planted, refused, pass: res.w1 }));

  // ---- W2 mature yields (two harvesting faces of the drop table) ----
  await place(3, 131, 8, 'minecraft:carrots[age=7]');
  await place(4, 131, 8, 'minecraft:potatoes[age=7]');
  await place(5, 131, 8, 'etim:onions[age=7]');
  const hCarrot = await harvestAt(3, 131, 8);
  const hPotato = await harvestAt(4, 131, 8);
  const hOnion = await harvestAt(5, 131, 8);
  const matureOk = r => !!r && r.branch === 'mature' && r.drops >= 2 && r.drops <= 3;
  res.w2 = matureOk(hCarrot) && matureOk(hPotato) && matureOk(hOnion)
    && hCarrot.first === 'minecraft:carrot'
    && hPotato.first === 'minecraft:potato'
    && hOnion.first === 'etim:onion';
  console.log('[W2]', JSON.stringify({ carrot: hCarrot, potato: hPotato, onion: hOnion, pass: res.w2 }));

  // ---- W3 seed / immature / poisonous potato ----
  await place(6, 131, 8, 'minecraft:carrots[age=0]');
  await place(7, 131, 8, 'minecraft:carrots[age=3]');
  await place(8, 131, 8, 'minecraft:potatoes[age=3]');
  await place(9, 131, 8, 'etim:onions[age=3]');
  const hSeed = await harvestAt(6, 131, 8);
  const hImmature = await harvestAt(7, 131, 8);
  const hPoison = await harvestAt(8, 131, 8);
  const hOnionImmature = await harvestAt(9, 131, 8);
  res.w3 = !!hSeed && hSeed.branch === 'seed' && hSeed.drops === 1 && hSeed.first === 'minecraft:carrot'
    && !!hImmature && hImmature.branch === 'immature' && hImmature.drops === 0
    && !!hPoison && hPoison.branch === 'poison' && hPoison.drops === 1
    && hPoison.first === 'minecraft:poisonous_potato'
    && !!hOnionImmature && hOnionImmature.branch === 'immature' && hOnionImmature.drops === 0;
  console.log('[W3]', JSON.stringify({
    seed: hSeed, immature: hImmature, poison: hPoison, onionImmature: hOnionImmature, pass: res.w3,
  }));

  // ---- W4 blight rows ----
  await place(10, 131, 8, 'minecraft:potatoes[age=7]');
  await place(11, 131, 8, 'etim:onions[age=7]');
  await cmd('etest blight set 10 131 8 1', 300);
  await cmd('etest blight set 11 131 8 1', 300);
  const hBlightPotato = await harvestAt(10, 131, 8);
  const hBlightOnion = await harvestAt(11, 131, 8);
  res.w4 = !!hBlightPotato && hBlightPotato.blighted && hBlightPotato.branch === 'poison'
    && hBlightPotato.drops === 1 && hBlightPotato.first === 'minecraft:poisonous_potato'
    && !!hBlightOnion && hBlightOnion.blighted && hBlightOnion.branch === 'blight'
    && hBlightOnion.drops === 0;
  console.log('[W4]', JSON.stringify({ potato: hBlightPotato, onion: hBlightOnion, pass: res.w4 }));

  // ---- W5 drought dead families + mature drought drops ----
  // The dry farmland is re-laid per case: moisture 0 reverts to dirt on a
  // random tick, and the forced roll skips anything whose floor is not dry
  // farmland.
  async function dryCase(x, crop) {
    await place(x, 130, 10, 'minecraft:farmland[moisture=0]');
    await place(x, 131, 10, crop);
    return droughtRoll(x, 131, 10);
  }
  const dCarrot = await dryCase(3, 'minecraft:carrots[age=3]');
  const pCarrot = await probe(3, 131, 10);
  const dPotato = await dryCase(4, 'minecraft:potatoes[age=5]');
  const pPotato = await probe(4, 131, 10);
  const dOnion = await dryCase(5, 'etim:onions[age=2]');
  const pOnion = await probe(5, 131, 10);
  const dWheat = await dryCase(6, 'minecraft:wheat[age=4]');
  const pWheat = await probe(6, 131, 10);
  const dMature = await dryCase(7, 'etim:onions[age=7]');
  const pMature = await probe(7, 131, 10);
  const deadOk = (d, p, name, age) => !!d && d.kind === 'immature' && d.dead === name
    && !!p && p.block === name && p.age === age;
  res.w5 = deadOk(dCarrot, pCarrot, 'etim:dead_carrot', 3)
    && deadOk(dPotato, pPotato, 'etim:dead_potato', 5)
    && deadOk(dOnion, pOnion, 'etim:dead_onion', 2)
    && deadOk(dWheat, pWheat, 'etim:dead_crop', 4)
    && !!dMature && dMature.kind === 'mature'
    && /^etim:onion#[23]$/.test(dMature.drop || '')
    && !!pMature && pMature.block === 'minecraft:air';
  console.log('[W5]', JSON.stringify({
    carrot: { d: dCarrot, p: pCarrot }, potato: { d: dPotato, p: pPotato },
    onion: { d: dOnion, p: pOnion }, wheat: { d: dWheat, p: pWheat },
    mature: { d: dMature, p: pMature }, pass: res.w5,
  }));

  // ---- W6 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const assets = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const srcOk = fs.existsSync(path.join(root, 'farm', 'ETIMBlockOnion.java'))
    && fs.existsSync(path.join(root, 'farm', 'ETIMItemOnion.java'));
  const farmBlocks = fs.readFileSync(path.join(root, 'farm', 'ETIMFarmBlocks.java'), 'utf8');
  const regOk = /"dead_carrot"/.test(farmBlocks) && /"dead_potato"/.test(farmBlocks)
    && /"dead_onion"/.test(farmBlocks) && /"onions"/.test(farmBlocks)
    && /"onion"/.test(farmBlocks) && /addEtimFood\(ONION_ITEM, 1, 1, 0, false, false, true\)/.test(farmBlocks);
  const farmSrc = fs.readFileSync(path.join(root, 'farm', 'ETIMFarm.java'), 'utf8');
  const helperOk = /public static int matureYield\(/.test(farmSrc)
    && /public static ETIMBlockDeadPlant deadFor\(/.test(farmSrc);
  const blightSrc = fs.readFileSync(path.join(root, 'farm', 'ETIMBlight.java'), 'utf8');
  const blightOk = /ETIMFarm\.deadFor\(/.test(blightSrc);
  const states = ['onions', 'dead_crop', 'dead_carrot', 'dead_potato', 'dead_onion'];
  const stateOk = states.every(n => fs.existsSync(path.join(assets, 'blockstates', n + '.json')));
  const tex = ['onion_stage_0', 'onion_stage_1', 'onion_stage_2', 'onion_stage_3', 'onion_stage_4',
    'dead_carrot_stage_0', 'dead_carrot_stage_1', 'dead_carrot_stage_2',
    'dead_potato_stage_0', 'dead_potato_stage_1', 'dead_potato_stage_2',
    'dead_onion_stage_0', 'dead_onion_stage_1', 'dead_onion_stage_2', 'dead_onion_stage_3'];
  const texOk = tex.every(n => fs.existsSync(path.join(assets, 'textures', 'blocks', n + '.png')))
    && fs.existsSync(path.join(assets, 'textures', 'items', 'onion.png'))
    && !fs.existsSync(path.join(assets, 'textures', 'blocks', 'dead_crop_stage_7.png'));
  const lang = fs.readFileSync(path.join(assets, 'lang', 'en_us.lang'), 'utf8');
  const langOk = /item\.etim\.onion\.name=Onion/.test(lang)
    && /tile\.etim\.onions\.name=Onions/.test(lang)
    && /tile\.etim\.dead_carrot\.name=/.test(lang);
  res.w6 = srcOk && regOk && helperOk && blightOk && stateOk && texOk && langOk;
  console.log('[W6]', JSON.stringify({ srcOk, regOk, helperOk, blightOk, stateOk, texOk, langOk, pass: res.w6 }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
