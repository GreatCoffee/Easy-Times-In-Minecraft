// B-71 smoke: R196 berry bush (census F:125). Verdict channel = [BushLog].
//   W1 generation: find a forest chunk, force one patch pass (/etest bushgen),
//      the placed bush sits on legal soil with open sky (A-B-71-10 gates)
//   W2 picking: growth 3 + right-click -> berries drop, growth back to 0;
//      a second click logs result=refused
//   W2' bone meal: the bush is not IGrowable, the dye is neither consumed
//      nor effective (D-1 甲 / A-B-71-1)
//   W3 growth gate: same bush, midnight -> light<15, no growth; noon ->
//      light 15, growth climbs to 3 (A-B-71-5 / B-8)
//   W4 illegal removal: soil removed under a ripe bush -> berries + air
//   W5 player break: harvest face drops the bush plus berries
//   W6 static: files/registration/gates/assets/lang/getDrops-only-self
const H = require('./lib/harness.js');
const L = require('./f7-wb-lib.js');
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-b71-' + RUN + '-v1',
  bot: A,
  stage: {
    gamemode: 0,
    tp: [12.5, 130, 12.5],
    fill: [
      'fill 0 129 0 24 129 24 minecraft:stone',
      'fill 0 130 0 24 133 24 minecraft:air',
    ],
  },
  props: { 'allow-flight': 'true' },
  cfg: ['blocks:bushR196', 'farm:bushDebugLog', 'mobs:mobDebugLog'],
});
const { cmd, mark, waitRow } = h;

const PROBE_RE = /\[BushLog\] probe pos=(-?\d+),(-?\d+),(-?\d+) block=(\S+) growth=(-?\d+) berries=(\d+) soil=(\S+) soilOk=(\d+) biome=(\S+) biomeOk=(\d+) sky=(\d+) light=(-?\d+) rawMax=(-?\d+) stay=(\d+) place=(\d+) rate=([\d.]+) temp=([\d.]+) mult=([\d.]+) master=(\d+) growable=(\d+) hand=(\S+)/;
const GEN_RE = /\[BushLog\] gen chunk=(-?\d+),(-?\d+) biome=(\S+) patches=(\d+) placed=(\d+) first=(\S+)/;
const PICK_RE = /\[BushLog\] pick pos=(-?\d+),(-?\d+),(-?\d+) growth=(\d+) result=(\S+)(?: drops=(\S+))?/;
const ILLEGAL_RE = /\[BushLog\] illegal pos=(-?\d+),(-?\d+),(-?\d+) growth=(\d+) player=(\d) drops=(\S+)/;
const HARVEST_RE = /\[BushLog\] harvest pos=(-?\d+),(-?\d+),(-?\d+) growth=(\d+) result=(\S+) drops=(\S+)/;
const BUSHTICK_RE = /\[BushLog\] bushtick pos=(-?\d+),(-?\d+),(-?\d+) before=(\d+) after=(-?\d+) ticks=(\d+) n=(\d+) light=(-?\d+) sky=(\d+) rate=([\d.]+) mult=([\d.]+) master=(\d+)/;
const GROWTH_RE = /\[BushLog\] growth pos=(-?\d+),(-?\d+),(-?\d+) (?:from=(\d+) to=(\d+) light=(\d+) rate=([\d.]+) roll=([\d.]+) temp=([\d.]+) mod=([\d.]+)|result=(\S+)(?: light=(\d+)| mod=([\d.]+) temp=([\d.]+)| growth=(\d+))?)/;
const WG_BIOME_RE = /\[WorldGenSpawnLog\] biome at \((-?\d+),(-?\d+)\) = (\S+)/;

function num(x) { return x === undefined ? null : Number(x); }

async function probe(x, y, z) {
  const from = mark();
  await cmd(`etest bushprobe ${x} ${y} ${z} ${A}`, 200);
  const rows = await waitRow(PROBE_RE, from, 6000);
  const r = rows.map((m) => ({
    x: +m[1], y: +m[2], z: +m[3], block: m[4], growth: +m[5], berries: m[6] === '1',
    soil: m[7], soilOk: m[8] === '1', biome: m[9], biomeOk: m[10] === '1',
    sky: m[11] === '1', light: +m[12], rawMax: +m[13], stay: m[14] === '1',
    place: m[15] === '1', rate: +m[16], temp: +m[17], mult: +m[18],
    master: m[19] === '1', growable: m[20] === '1', hand: m[21],
  })).filter((r2) => r2.x === x && r2.y === y && r2.z === z);
  return r[0] || null;
}

async function biomeAt(x, z) {
  const from = mark();
  await cmd(`etest wgbiome ${x} ${z}`, 150);
  const rows = await waitRow(WG_BIOME_RE, from, 4000);
  const hit = rows.map((m) => ({ x: +m[1], z: +m[2], biome: m[3] }))
    .filter((r) => r.x === x && r.z === z);
  return hit[0] || null;
}

async function pick(x, y, z) {
  const from = mark();
  await cmd(`etest useblock ${x} ${y} ${z} up ${A}`, 700);
  const rows = await waitRow(PICK_RE, from, 6000);
  const hit = rows.map((m) => ({
    x: +m[1], y: +m[2], z: +m[3], growth: +m[4], result: m[5], drops: m[6] || null,
  })).filter((r) => r.x === x && r.y === y && r.z === z);
  return hit[0] || null;
}

async function bushtick(x, y, z, n) {
  const from = mark();
  await cmd(`etest bushtick ${x} ${y} ${z} ${n}`, 400);
  const rows = await waitRow(BUSHTICK_RE, from, 30000);
  const hit = rows.map((m) => ({
    x: +m[1], y: +m[2], z: +m[3], before: +m[4], after: +m[5], ticks: +m[6],
    n: +m[7], light: +m[8], sky: m[9] === '1', rate: +m[10], mult: +m[11],
    master: m[12] === '1',
  })).filter((r) => r.x === x && r.y === y && r.z === z)[0] || null;
  const rows2 = await waitRow(GROWTH_RE, from, 1000);
  const ticks = rows2.map((m) => ({
    from: num(m[4]), to: num(m[5]), result: m[10] || null, light: num(m[11]) || num(m[6]),
  }));
  return { hit, ticks };
}

async function main() {
  const pinOk = h.stampPin();
  await h.boot(`b71-${RUN}-b1`);
  await h.join();
  const res = { w1: false, w2: false, w2b: false, w3: false, w4: false, w5: false, w6: false };

  // ---- W1: forest chunk discovery + forced patch ----
  let forest = null;
  outer:
  for (let r = 0; r <= 10 && !forest; r++) {
    for (let dx = -r; dx <= r; dx += (r === 0 ? 1 : 2)) {
      for (const dz of (r === 0 ? [0] : [-r, r, -r, r])) {
        const cx = dx, cz = dz;
        const b = await biomeAt(cx * 16 + 8, cz * 16 + 8);
        if (b && /^minecraft:forest(_hills)?$/.test(b.biome)) {
          forest = { cx, cz, biome: b.biome };
          break outer;
        }
      }
    }
  }
  let gen = null;
  let genProbe = null;
  if (forest) {
    await cmd('gamemode 3 ' + A, 300);
    const bx = forest.cx * 16 + 8;
    const bz = forest.cz * 16 + 8;
    await cmd(`tp ${A} ${bx + 0.5} 150 ${bz + 0.5}`, 3000);   // load the chunk
    await cmd(`fill ${bx - 5} 149 ${bz - 5} ${bx + 5} 149 ${bz + 5} minecraft:stone`, 800);
    await cmd(`fill ${bx - 5} 150 ${bz - 5} ${bx + 5} 150 ${bz + 5} minecraft:grass`, 800);
    await cmd(`fill ${bx - 5} 151 ${bz - 5} ${bx + 5} 153 ${bz + 5} minecraft:air`, 800);
    await cmd('gamemode 0 ' + A, 300);
    await cmd(`tp ${A} ${bx + 0.5} 151 ${bz + 0.5}`, 1200);
    const from = mark();
    await cmd(`etest bushgen ${forest.cx} ${forest.cz}`, 1200);
    const rows = await waitRow(GEN_RE, from, 15000);
    gen = rows.map((m) => ({
      cx: +m[1], cz: +m[2], biome: m[3], patches: +m[4], placed: +m[5], first: m[6],
    })).filter((g) => g.cx === forest.cx && g.cz === forest.cz)[0] || null;
    if (gen && gen.first !== 'none') {
      const [fx, fy, fz] = gen.first.split(',').map(Number);
      genProbe = await probe(fx, fy, fz);
    }
  }
  res.w1 = !!forest && !!gen && /^minecraft:forest(_hills)?$/.test(gen.biome)
    && gen.placed >= 1 && !!genProbe && genProbe.block === 'etim:bush'
    && genProbe.growth === 3 && genProbe.berries && genProbe.soilOk
    && genProbe.biomeOk && genProbe.sky && genProbe.stay && genProbe.place
    && genProbe.master;
  console.log('[W1]', JSON.stringify({ forest, gen, genProbe, pass: res.w1 }));

  const px = forest ? forest.cx * 16 + 8 : 6;
  const pz = forest ? forest.cz * 16 + 8 : 8;
  const groundY = 150;
  const bushY = 151;
  const bx0 = px - 3;
  const bz0 = pz - 3;

  // ---- W2: picking ----
  await cmd(`setblock ${bx0} ${bushY} ${bz0} etim:bush 12`, 500);
  const ripe = await probe(bx0, bushY, bz0);
  await cmd(`etest hold minecraft:stick ${A}`, 400);
  await cmd(`tp ${A} ${bx0 + 0.5} ${groundY + 1} ${bz0 + 1.5}`, 900);
  const picked = await pick(bx0, bushY, bz0);
  const afterPick = await probe(bx0, bushY, bz0);
  const refused = await pick(bx0, bushY, bz0);
  res.w2 = !!ripe && ripe.growth === 3 && ripe.berries && ripe.stay
    && !!picked && picked.result === 'berries->0' && picked.drops === 'etim:blueberries:1'
    && !!afterPick && afterPick.growth === 0 && !afterPick.berries
    && !!refused && refused.result === 'refused';
  console.log('[W2]', JSON.stringify({ ripe, picked, afterPick, refused, pass: res.w2 }));

  // ---- W2' bone meal: no effect, no consumption ----
  await cmd(`etest hold minecraft:dye ${A} 15`, 400);
  const beforeDye = await probe(bx0, bushY, bz0);
  await pick(bx0, bushY, bz0);
  const afterDye = await probe(bx0, bushY, bz0);
  res.w2b = !!beforeDye && beforeDye.hand === 'minecraft:dyex1' && !beforeDye.growable
    && !!afterDye && afterDye.growth === 0 && !afterDye.growable
    && afterDye.hand === 'minecraft:dyex1';
  console.log('[W2b]', JSON.stringify({ beforeDye, afterDye, pass: res.w2b }));

  // ---- W3 growth gate: night light<15 no growth, noon light 15 grows ----
  const gx = bx0 + 1;
  const gz = bz0 + 1;
  await cmd(`setblock ${gx} ${bushY} ${gz} etim:bush 0`, 500);
  await cmd('time set midnight', 1200);
  const nightProbe = await probe(gx, bushY, gz);
  const night = await bushtick(gx, bushY, gz, 400);
  const noonProbe0 = await probe(gx, bushY, gz);
  await cmd('time set noon', 1800);
  const noonProbe = await probe(gx, bushY, gz);
  const day = await bushtick(gx, bushY, gz, 400);
  const dayProbe = await probe(gx, bushY, gz);
  const darkRows = night.ticks.filter((t) => t.result === 'dark').length;
  const growRows = day.ticks.filter((t) => t.from !== null).length;
  res.w3 = !!nightProbe && nightProbe.rawMax === 15 && nightProbe.stay
    && nightProbe.light < 15
    && !!night.hit && night.hit.after === 0 && night.hit.light < 15 && darkRows > 0
    && !!noonProbe0 && noonProbe0.growth === 0
    && !!noonProbe && noonProbe.light === 15 && noonProbe.stay
    && !!day.hit && day.hit.after >= 1 && day.hit.after > day.hit.before
    && growRows > 0
    && !!dayProbe && dayProbe.growth === day.hit.after;
  console.log('[W3]', JSON.stringify({
    nightProbe, night: night.hit, darkRows, noonProbe, day: day.hit, growRows, dayProbe, pass: res.w3,
  }));

  // ---- W4 illegal removal: soil gone, berries drop when a player is near ----
  const ix = bx0 + 2;
  const iz = bz0 - 1;
  await cmd(`setblock ${ix} ${bushY} ${iz} etim:bush 12`, 500);
  const ilegalFrom = mark();
  await cmd(`setblock ${ix} ${groundY} ${iz} minecraft:air`, 900);
  const illRows = await waitRow(ILLEGAL_RE, ilegalFrom, 6000);
  const illegal = illRows.map((m) => ({
    x: +m[1], y: +m[2], z: +m[3], growth: +m[4], player: m[5] === '1', drops: m[6],
  })).filter((r) => r.x === ix && r.y === bushY && r.z === iz)[0] || null;
  const illegalProbe = await probe(ix, bushY, iz);
  res.w4 = !!illegal && illegal.player && illegal.growth === 3
    && illegal.drops === 'etim:blueberries:1'
    && !!illegalProbe && illegalProbe.block === 'minecraft:air';
  console.log('[W4]', JSON.stringify({ illegal, illegalProbe, pass: res.w4 }));

  // ---- W5 player break: harvest face keeps the bush drop, adds berries ----
  const hx = bx0 - 1;
  const hz = bz0 + 2;
  await cmd(`setblock ${hx} ${bushY} ${hz} etim:bush 12`, 500);
  const harvestFrom = mark();
  await cmd(`etest harvest ${hx} ${bushY} ${hz} ${A}`, 1200);
  const hwRows = await waitRow(HARVEST_RE, harvestFrom, 6000);
  const harvest = hwRows.map((m) => ({
    x: +m[1], y: +m[2], z: +m[3], growth: +m[4], result: m[5], drops: m[6],
  })).filter((r) => r.x === hx && r.y === bushY && r.z === hz)[0] || null;
  const harvestProbe = await probe(hx, bushY, hz);
  res.w5 = !!harvest && harvest.result === 'berries'
    && harvest.drops === 'etim:blueberries:1'
    && !!harvestProbe && harvestProbe.block === 'minecraft:air';
  console.log('[W5]', JSON.stringify({ harvest, harvestProbe, pass: res.w5 }));

  // ---- W6 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const assets = path.join(L.ROOT, 'src', 'main', 'resources', 'assets', 'etim');
  const bushSrc = fs.readFileSync(path.join(root, 'farm', 'ETIMBlockBush.java'), 'utf8');
  const genSrc = fs.readFileSync(path.join(root, 'farm', 'ETIMBushGen.java'), 'utf8');
  const farmBlocks = fs.readFileSync(path.join(root, 'farm', 'ETIMFarmBlocks.java'), 'utf8');
  const stacks = fs.readFileSync(path.join(root, 'item', 'ETIMBlockStacks.java'), 'utf8');
  const cfg = fs.readFileSync(path.join(root, 'ETIMConfig.java'), 'utf8');
  const mod = fs.readFileSync(path.join(root, 'ETIM.java'), 'utf8');
  const mixin = fs.readFileSync(path.join(root, 'mixins', 'MixinBlockFarmland.java'), 'utf8');
  const srcOk = fs.existsSync(path.join(root, 'farm', 'ETIMBlockBush.java'))
    && fs.existsSync(path.join(root, 'farm', 'ETIMBushGen.java'));
  const dropsOnlySelf = /META_WITH_BERRIES/.test(bushSrc)
    && !/BLUEBERRIES/.test(bushSrc.split('getDrops')[1].split('harvestBlock')[0])
    && !/implements[^{]*IGrowable/.test(bushSrc);
  const genOk = /isBushBiome/.test(genSrc) && /canPlaceBlockAt/.test(genSrc)
    && /canBlockStay/.test(genSrc) && /canSeeSky/.test(genSrc) && /PUT|setBlockState/.test(genSrc);
  const regOk = /"bush"/.test(farmBlocks) && /"blueberries"/.test(farmBlocks)
    && /setFireInfo\(BUSH, 30, 50\)/.test(farmBlocks)
    && /addEtimFood\(BLUEBERRIES, 1, 1, 1000, false, false, true\)/.test(farmBlocks)
    && /ETIMBushGen\.register\(\)/.test(mod);
  const stackOk = /getItemFromBlock\([^)]*ETIMFarmBlocks\.BUSH\)/.test(stacks)
    && /setMaxStackSize\(8\)/.test(stacks);
  const cfgOk = /bushR196/.test(cfg) && /bushDebugLog/.test(cfg) && /bushGrowthRateMultiplier/.test(cfg);
  const mixOk = /src=bush-above/.test(mixin) && /src=bush-above-neighbour/.test(mixin);
  const stateOk = [0, 1, 2, 3].every((n) => fs.existsSync(path.join(assets, 'models', 'block', 'blueberry_stage' + n + '.json')))
    && fs.existsSync(path.join(assets, 'blockstates', 'bush.json'));
  const texOk = [0, 1, 2, 3].every((n) => fs.existsSync(path.join(assets, 'textures', 'blocks', 'bushes', 'blueberry_stage' + n + '.png')))
    && fs.existsSync(path.join(assets, 'textures', 'items', 'blueberries.png'));
  const en = fs.readFileSync(path.join(assets, 'lang', 'en_us.lang'), 'utf8');
  const zh = fs.readFileSync(path.join(assets, 'lang', 'zh_cn.lang'), 'utf8');
  const langOk = ['tile.etim.bush.name=', 'item.etim.blueberries.name='].every((k) => en.includes(k) && zh.includes(k));
  res.w6 = srcOk && dropsOnlySelf && genOk && regOk && stackOk && cfgOk && mixOk && stateOk && texOk && langOk;
  console.log('[W6]', JSON.stringify({
    srcOk, dropsOnlySelf, genOk, regOk, stackOk, cfgOk, mixOk, stateOk, texOk, langOk, pass: res.w6,
  }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
