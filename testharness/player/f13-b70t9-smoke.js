// B-70T9 smoke: the R196 hunger loop after the pure-table extraction.
// Verdict channels = [FoodLog] probe/set rows (unconditional dev command) plus
// the loop's own consumed/STARVE/healed lines, which run behind foodDebugLog.
//   W1 satiation branch: pool seeded one epsilon under a unit -> next tick
//      spends a satiation point (FoodStats.java:46-56 first arm)
//   W2 nutrition branch: nutrition-only pool alone can pay and nutrition > 0
//      -> a nutrition point is spent and the pool is zeroed
//   W3 starve branch: nutrition 0 + progress epsilon -> STARVE strike while
//      health is above the ceiling and difficulty is normal
//   W4 regen branch: nutrition 5 + progress epsilon + damaged player ->
//      "healed 1.0 via regen" and the hunger pool is paid back
//   W5 static: FoodGates wiring, tick delegation, dev commands
const L = require('./f7-wb-lib.js');
const H = require('./lib/harness.js');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fs = require('fs');
const path = require('path');

const RUN = process.env.RUN || 'r1';
const A = 'ETIM_F7';

const h = H.create({
  run: RUN,
  world: 'w-b70t9-' + RUN + '-v1',
  bot: A,
  // C-B70T4-2: baseline has foodDebugLog=false; force it for the window.
  cfg: ['food:foodDebugLog'],
  props: { 'allow-flight': 'true' },
  stage: {
    gamemode: 0,
    difficulty: 2,
    tp: ['12.5', '130', '10.5'],
    fill: ['fill 0 129 0 24 129 24 minecraft:stone', 'fill 0 130 0 24 133 24 minecraft:air'],
  },
});
const { cmd, mark, slice, waitRow } = h;

const PROBE_RE = /\[FoodLog\] (probe|set) player=(\S+) pool=(\S+) only=(\S+) satiation=(\d+) nutrition=(\d+) heal=(\S+) starve=(\S+) limit=(\d+)/;
const EAT_RE = /\[FoodLog\] (\S+) \((-?\d+)\) consumed (satiation|nutrition) point \(([^)]*)\) hungerPool=(\S+)/;
const STARVE_RE = /\[FoodLog\] (\S+) \((-?\d+)\) STARVE strike 1\.0 \(health=([\d.]+) difficulty=(\d+)\)/;
const HEAL_RE = /\[FoodLog\] (\S+) \((-?\d+)\) healed 1\.0 via regen \(health=([\d.]+) nutrition=(\d+) regenFactor=([\d.]+) hungerPool\+=([\d.]+)\)/;

function parseProbe(rows) {
  const last = rows[rows.length - 1];
  if (!last) return null;
  return {
    kind: last[1], pool: +last[3], only: +last[4], satiation: +last[5],
    nutrition: +last[6], heal: +last[7], starve: +last[8], limit: +last[9],
  };
}

async function probe() {
  const from = mark();
  await cmd('etest hungerstate ' + A, 400); // B-B70T9-2: console sender has no player
  const rows = await waitRow(PROBE_RE, from, 6000);
  return parseProbe(rows);
}

async function seed(pool, only, satiation, nutrition, heal, starve) {
  const from = mark();
  await cmd(`etest hungerpools ${pool} ${only} ${satiation} ${nutrition} ${heal} ${starve} ${A}`, 400); // B-B70T9-2
  const rows = await waitRow(PROBE_RE, from, 6000);
  return parseProbe(rows);
}

async function main() {
  await h.boot(RUN);
  // B-B70T9-1: boot() 只起服，不建 bot；缺 stampPin()/join() 时 /etest hungerpools
  // 回 "Only players can use /state."、effect 回 "Entity 'ETIM_F7' cannot be found"，
  // 四个支路全部无被测对象（r1 四臂假红即此）。
  h.stampPin();
  await h.join();

  const res = {};
  res.w0 = true;

  // ---- W1 satiation branch ----
  // B-B70T9-5: mark() 必须在 seed 之前 —— 种子一落地下一 tick（50 ms）就会消费/饿伤/回血，
  // 而 cmd() 自带 400 ms 等待，先 mark 再 seed 否则那一行永远落在切片之前（r1–r5 的 eat/hit/heal 全 undefined 即此）。
  const from1 = mark();
  const seed1 = await seed('3.999', '0', 3, 3, '0', '0');
  const eat1 = (await waitRow(EAT_RE, from1, 8000))[0];
  await sleep(200);
  const after1 = await probe();
  res.w1 = !!seed1 && !!eat1 && eat1[3] === 'satiation'
    && after1 && after1.satiation === 2 && after1.nutrition === 3;

  // ---- W2 nutrition branch ----
  const from2 = mark();
  const seed2 = await seed('3.999', '4', 3, 3, '0', '0');
  const eat2 = (await waitRow(EAT_RE, from2, 8000))[0];
  const after2 = await probe();
  res.w2 = !!seed2 && !!eat2 && eat2[3] === 'nutrition'
    // B-B70T9-4: nutritionOnlyPool 每 tick 都在累加，消耗点后清零随即又被加上
    // 0.08 量级；原断言 only===0 只在一瞬成立。种子是 4 ⇒ 判 < 1.0 足以证明已清零。
    && after2 && after2.nutrition === 2 && after2.satiation === 3 && after2.only < 1.0;
  console.log('[W1]', JSON.stringify({ seed: seed1, kind: eat1 && eat1[3], after: after1, pass: res.w1 }));
  console.log('[W2]', JSON.stringify({ seed: seed2, kind: eat2 && eat2[3], after: after2, pass: res.w2 }));

  // ---- W3 starve branch ----
  const from3 = mark();
  const seed3 = await seed('0', '0', 0, 0, '0', '0.9995');
  const hit = (await waitRow(STARVE_RE, from3, 8000))[0];
  const after3 = await probe();
  res.w3 = !!seed3 && !!hit && +hit[3] < 20 && +hit[4] === 2
    && after3 && after3.starve < 1.0;

  // ---- W4 regen branch (needs health < max, so damage first) ----
  // B-B70T9-3: 0 级玩家血量上限 = playerCaps.capAtLevel0 = 6（etest health 会按 cap 夹取），
  // instant_damage(6) 会直接致死 ⇒ 用 etest health 5 造一个 0<hp<max 的可回血状态。
  // B-B70T9-7: stage 里把 gamerule naturalRegeneration 关成了 false（其它窗口的遗留），
  // 回血闸 `!naturalRegeneration || !shouldHeal → healProgress=0` 会把种子清零 ⇒ 本臂临时打开。
  await cmd('gamerule naturalRegeneration true', 300);
  await cmd(`etest health 5 ${A}`, 400);
  const from4 = mark();
  const seed4 = await seed('0', '0', 0, 5, '0.9999', '0');
  const heal = (await waitRow(HEAL_RE, from4, 8000))[0];
  const after4 = await probe();
  res.w4 = !!seed4 && !!heal && +heal[4] === 5 && after4 && after4.heal < 1.0;
  console.log('[W3]', JSON.stringify({ seed: seed3, hit: hit && { hp: +hit[3], diff: +hit[4] }, after: after3, pass: res.w3 }));
  console.log('[W4]', JSON.stringify({ seed: seed4, heal: heal && { hp: +heal[3], nut: +heal[4] }, after: after4, pass: res.w4 }));

  // ---- W5 static wiring ----
  const root = path.join(L.ROOT, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
  const gatesPath = path.join(root, 'hunger', 'FoodGates.java');
  const gatesSrc = fs.existsSync(gatesPath) ? fs.readFileSync(gatesPath, 'utf8') : '';
  const statsSrc = fs.readFileSync(path.join(root, 'hunger', 'ETIMFoodStats.java'), 'utf8');
  const cmdSrc = fs.readFileSync(path.join(root, 'commands', 'CommandDevTest.java'), 'utf8');
  const testPath = path.join(L.ROOT, 'src', 'test', 'java', 'io', 'github', 'etim', 'etim', 'hunger', 'FoodGatesTest.java');
  res.w5 = gatesSrc.includes('public static Result tick(Ctx c, boolean creative)')
    && gatesSrc.includes('public enum Act')
    && statsSrc.includes('FoodGates.tick(ctx, creative)')
    && statsSrc.includes('FoodGates.Act.CONSUMED_SATIATION')
    && (cmdSrc.match(/"hungerstate"/g) || []).length === 1
    && (cmdSrc.match(/"hungerpools"/g) || []).length === 1
    && fs.existsSync(testPath);

  console.log('[W5]', JSON.stringify({ gates: !!gatesSrc, static: res.w5 }));

  await h.stop();
  h.finish(res);
}

h.guard(main);
