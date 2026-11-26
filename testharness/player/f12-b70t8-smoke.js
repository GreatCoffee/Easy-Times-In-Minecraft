// B-70T8 smoke: the R196 spawn gates moved into a pure decision table
// (mob/SpawnGates.java, 43 unit cases); ETIMSpawnTables#pickSpawn now only
// supplies context. This window proves the wiring still applies the R196
// depth thresholds (WorldServer.java:603-699) through the real spawn path.
//   W1 y=70 open, day  -> creeper live; jelly and every depth-gated class absent
//   W2 y=40 stone roof -> blob/jelly/ghoul/wight/stalker live; ooze + pudding absent
//   W3 y=30 stone roof -> ooze + shadow live; pudding still absent
//   W4 y=20 stone roof -> pudding live
//   W5 bat table       -> y=70 plain bats only; y=30 vampire bat + nightwing
//   W6 gelpick row     -> flag=true still printed
//   W7 static          -> decision table wired in, unit test present
const fs = require('fs');
const path = require('path');
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';
const D = 4000;

const h = H.create({
  run: RUN,
  world: 'w-' + RUN + '-v1',
  bot: A,
  cfg: ['mobs:mobDebugLog', 'mobs:mobGelatinousR196', 'mobs:mobBatFamilyR196'],
  props: { 'allow-flight': 'true' },
  stage: {
    gamemode: 1,
    tp: ['200.5', '70', '200.5'],
    fill: ['time set 6000', 'weather clear'],
  },
});
const { cmd, mark, slice, waitRow } = h;

const PICK_RE = /\[SpawnLog\] (spawnpick|batpick|gelpick) n=(\d+) .*?counts=\{([^}]*)\}/;
const BIOME_RE = /\[WorldGenSpawnLog\] biome at \((-?\d+),(-?\d+)\) = (\S+?) creature=/;

const UNDEAD = ['ETIMEntityGhoul', 'ETIMEntityWight', 'ETIMEntityShadow',
  'ETIMEntityRevenant', 'ETIMEntityBoneLord', 'ETIMEntityInvisibleStalker'];
const GEL = ['ETIMEntityBlob', 'ETIMEntityOoze', 'ETIMEntityPudding'];

function parseCounts(body) {
  const out = {};
  for (const part of body.split(',')) {
    const at = part.indexOf('=');
    if (at < 0) {
      continue;
    }
    out[part.slice(0, at).trim()] = +part.slice(at + 1).trim();
  }
  return out;
}

function count(map, ...names) {
  return names.reduce((s, k) => s + (map[k] || 0), 0);
}

async function pick(kind, x, y, z, n) {
  const from = mark();
  await cmd(`etest ${kind} ${x} ${y} ${z} ${n}`, 300);
  const rows = await waitRow(PICK_RE, from, 45000);
  const hit = rows.filter((r) => r[1] === kind).pop();
  return hit ? { n: +hit[2], counts: parseCounts(hit[3]) } : null;
}

async function biomeAt(x, z) {
  const from = mark();
  await cmd(`etest wgbiome ${x} ${z}`, 400);
  const rows = await waitRow(BIOME_RE, from, 15000);
  return rows.length ? rows[rows.length - 1][3] : null;
}

async function main() {
  await h.boot(RUN);
  h.stampPin();
  await h.join();

  // Pick a census column in a biome whose MONSTER table is the R196 base
  // (jungle/swamp/nether replace it wholesale, so they cannot answer W1-W4).
  const candidates = [[200, 200], [600, 200], [1000, 600], [200, 1000], [-400, 400], [1200, 1200]];
  let X = 200;
  let Z = 200;
  let biome = null;
  for (const [cx, cz] of candidates) {
    const name = await biomeAt(cx, cz);
    if (!name) {
      continue;
    }
    if (biome == null) {
      biome = name;
    }
    if (!/jungle|swamp|hell|nether/i.test(name)) {
      X = cx;
      Z = cz;
      biome = name;
      break;
    }
  }

  await cmd(`tp ${A} ${X + 0.5} 70 ${Z + 0.5}`, 600);
  await cmd(`fill ${X - 4} 68 ${Z - 4} ${X + 4} 74 ${Z + 4} minecraft:air`, 400);
  // Census cells: one open site plus three with a stone roof and floor, so the
  // stoneAbove/stoneFloor scans see a deterministic column.
  const cell = (y) => [
    `setblock ${X + 10} ${y + 1} ${Z} minecraft:stone`,
    `setblock ${X + 10} ${y - 1} ${Z} minecraft:stone`,
    `setblock ${X + 10} ${y} ${Z} minecraft:air`,
  ];
  for (const line of [...cell(40), ...cell(30), ...cell(20)]) {
    await cmd(line, 120);
  }

  // ---- W1-W4 monster census by depth ----
  const w1 = await pick('spawnpick', X, 70, Z, D);
  const w2 = await pick('spawnpick', X + 10, 40, Z, D);
  const w3 = await pick('spawnpick', X + 10, 30, Z, D);
  const w4 = await pick('spawnpick', X + 10, 20, Z, D);
  const c1 = w1 ? w1.counts : {};
  const c2 = w2 ? w2.counts : {};
  const c3 = w3 ? w3.counts : {};
  const c4 = w4 ? w4.counts : {};

  const w1Ok = !!w1 && w1.n === D
    // B-B70T8-3: census 键是注册名 —— 原版苦力怕打印为 EntityCreeper，
    // 精确匹配 'Creeper' 恒 0（r1/r3 的 W1 假红即此，非产品面）。
    && count(c1, 'EntityCreeper', 'ETIMEntityInfernalCreeper') > 0
    && count(c1, 'ETIMEntityJelly') === 0
    && count(c1, ...UNDEAD) === 0
    && count(c1, ...GEL) === 0;
  const w2Ok = !!w2 && w2.n === D
    && count(c2, 'ETIMEntityBlob') > 0
    && count(c2, 'ETIMEntityGhoul') > 0
    && count(c2, 'ETIMEntityWight') > 0
    && count(c2, 'ETIMEntityInvisibleStalker') > 0
    && count(c2, 'ETIMEntityJelly') > 0
    && count(c2, 'ETIMEntityOoze') === 0
    && count(c2, 'ETIMEntityPudding') === 0
    && count(c2, 'ETIMEntityShadow') === 0;
  const w3Ok = !!w3 && w3.n === D
    && count(c3, 'ETIMEntityOoze') > 0
    && count(c3, 'ETIMEntityShadow') > 0
    && count(c3, 'ETIMEntityPudding') === 0;
  const w4Ok = !!w4 && w4.n === D && count(c4, 'ETIMEntityPudding') > 0;

  // ---- W5 ambient table ----
  const b1 = await pick('batpick', X, 70, Z, D);
  const b2 = await pick('batpick', X + 10, 30, Z, D);
  const bc1 = b1 ? b1.counts : {};
  const bc2 = b2 ? b2.counts : {};
  const w5Ok = !!b1 && !!b2 && b1.n === D && b2.n === D
    && count(bc1, 'Bat', 'EntityBat') > 0
    && count(bc1, 'ETIMEntityVampireBat', 'ETIMEntityNightwing') === 0
    && count(bc2, 'ETIMEntityVampireBat') > 0
    && count(bc2, 'ETIMEntityNightwing') > 0;

  // ---- W6 gelpick row ----
  const from6 = mark();
  await cmd(`etest gelpick ${X + 10} 40 ${Z} 500`, 300);
  const gelRows = await waitRow(/\[SpawnLog\] gelpick n=\d+ flag=(\w+)/, from6, 30000);
  const w6Ok = gelRows.length > 0 && gelRows[0][1] === 'true';

  // ---- W7 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const spawnTables = fs.readFileSync(path.join(root, 'mob', 'ETIMSpawnTables.java'), 'utf8');
  const gates = fs.readFileSync(path.join(root, 'mob', 'SpawnGates.java'), 'utf8');
  const unit = path.join(L.ROOT, 'src', 'test', 'java', 'io', 'github', 'etim', 'etim', 'mob', 'SpawnGatesTest.java');
  const w7Ok = /SpawnGates\.decide\(cls, ctx\)/.test(spawnTables)
    && /SpawnGates\.Kind\.REJECT/.test(spawnTables)
    && /enum Kind/.test(gates)
    && /public static Decision decide\(/.test(gates)
    && fs.existsSync(unit);

  const res = { w1: w1Ok, w2: w2Ok, w3: w3Ok, w4: w4Ok, w5: w5Ok, w6: w6Ok, w7: w7Ok };
  console.log('[W0]', JSON.stringify({ biome, at: [X, Z] }));
  console.log('[W1]', JSON.stringify({ n: w1 && w1.n, counts: c1, pass: w1Ok }));
  console.log('[W2]', JSON.stringify({ n: w2 && w2.n, counts: c2, pass: w2Ok }));
  console.log('[W3]', JSON.stringify({ n: w3 && w3.n, counts: c3, pass: w3Ok }));
  console.log('[W4]', JSON.stringify({ n: w4 && w4.n, counts: c4, pass: w4Ok }));
  console.log('[W5]', JSON.stringify({ y70: bc1, y30: bc2, pass: w5Ok }));
  console.log('[W6]', JSON.stringify({ rows: gelRows.length, pass: w6Ok }));
  console.log('[W7]', JSON.stringify({ pass: w7Ok }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
