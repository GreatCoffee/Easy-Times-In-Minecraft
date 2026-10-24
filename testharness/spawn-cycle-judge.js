/**
 * judge-spawn-cycle.js — spawn-cycle 判读器 v2（会话七 · testharness）
 *
 * 基线：b0b2b3a（audit16）· 80min 观察窗（--window 分钟数，默认 80）
 * 判据全部取 [SpawnLog] 行文案（任务书原语）：
 *   T1 稳态：窗口内 `modifier mod=` 行总数 ≤9；λ0 = 3×在线秒/24000，
 *   报告 0 行 ↔ λ0 吻合度（80min 全程在线 → λ0≈6，行数期望 5.5±）。
 *   T2a 冻结面：left-the-game 后 ≥5min 段 [SpawnLog] 全型=0。
 *   T2b 起点对位：早期在线段首条 modifier 行 d/i/n 与窗口末条差 ≤ tick 上界
 *   （d≤4000、i≤1999、n≤3998）。
 *   T3 spectrum：在线段每 4000 tick（200s）≥1 触发行；连续 12000 tick 零 = fail。
 *   T4 行为形态（b0b2b3a audit16 复核面）：cap-block deep= 出现与否；
 *   accept / reject colliding / reject spawn-point-dist / reject day-outdoor
 *   （仅不死/白昼时段出现）/ reject moon-night 家族计数与 y 桶占比（y≥60 / y<60）。
 *   exceptions=0 常驻判据（JOINERROR/stack trace 计数）。
 *
 * 用法：
 *   & node judge-spawn-cycle.js <latest.log> <bootTime HH:mm:ss> <reportDir> [--window 80]
 */
'use strict';
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const logFile = args[0], bootArg = args[1], reportDirArg = args[2];
if (!logFile || !bootArg || !reportDirArg) {
  console.error('usage: judge-spawn-cycle.js <latest.log> <bootTime HH:mm:ss> <reportDir> [--window 80]');
  process.exit(2);
}
let WINDOW_MIN = 80;
for (let i = 3; i < args.length; i++) if (args[i] === '--window') { WINDOW_MIN = Number(args[i + 1]); i++; }

const hms = (s) => s.split(':').map(Number).reduce((a, b) => a * 60 + b, 0);
const bootSec = hms(bootArg);
const WINDOW_1_T1 = WINDOW_MIN * 60;
const BUCKET = 200;
const hrMin = (sec) => `${String(Math.floor(sec / 3600)).padStart(2, '0')}:${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

const raw = fs.readFileSync(logFile, 'utf8');
const rows = raw.split(/\r?\n/).filter(Boolean);

const parseTs = (line) => {
  const m = line.match(/^\[(\d{1,2}):(\d{2}):(\d{2})\]/);
  return m ? hms(`${m[1]}:${m[2]}:${m[3]}`) : null;
};
const bodyOf = (line) => {
  for (const marker of ['[SpawnLog] ', '[HarnMark]']) {
    const i = line.indexOf(marker);
    if (i >= 0) return line.slice(i);
  }
  return '';
};
const inWindow = (sec, t0, t1) => sec !== null && sec >= t0 && sec < t1;

const spawnRows = [], holdMarks = [], joinRows = [];
let leaveSec = null, bootExceptions = 0;
for (const line of rows) {
  const sec = parseTs(line);
  if (sec === null) continue;
  const body = bodyOf(line);
  if (!body) continue;
  if (body.startsWith('[SpawnLog]')) spawnRows.push({ sec, body });
  if (body.includes('[HarnMark] HOLD begin')) holdMarks.push({ sec, body });
  if (body.includes('[HarnMark] HOLD end')) holdMarks.push({ sec, body, end: true });
  if (/joined the game|logged in with entity/.test(line) && sec >= bootSec) joinRows.push(sec);
  if (/left the game/.test(line) && sec >= bootSec) leaveSec = sec;
  if (/Exception|ERROR:|Caused by/i.test(line) && sec >= bootSec && !/Rcon|Version Check|signa/.test(line)) bootExceptions++;
}

console.log('== 判读基础 ==');
console.log(`boot=${bootArg}，log 行数=${rows.length}，[SpawnLog] 全行=${spawnRows.length}，HOLD 标记=${holdMarks.length}，join 行=${joinRows.length}，exceptions(boot 后粗计)=${bootExceptions}`);

const w1End = bootSec + WINDOW_1_T1;

// ← T1
console.log(`\n== T1 modifier transition（窗 ${WINDOW_MIN}min）==`);
const t1Rows = spawnRows.filter(r => inWindow(r.sec, bootSec, w1End) && r.body.startsWith('[SpawnLog] modifier mod='));
console.log(`T1 窗口 [${hrMin(bootSec)} .. ${hrMin(w1End)}] modifier 行=${t1Rows.length}（判据 ≤9）`);
t1Rows.forEach(r => console.log(`  ${hrMin(r.sec)}  ${r.body}`));
const t1Verdict = t1Rows.length <= 9 ? 'PASS' : 'FAIL';
// λ0 比较
const onlineStart = (holdMarks.find(m => !m.end) || {}).sec ?? (joinRows[0] ?? null);
const onlineEnd = (holdMarks.find(m => m.end && holdBeginOk(onlineStart)) || {}).sec ?? leaveSec ?? (spawnRows.length ? spawnRows[spawnRows.length - 1].sec : null);
function holdBeginOk(s0) { return s0 === null || this.end; }
const trunkLen = (onlineStart !== null && onlineEnd !== null) ? Math.max(0, onlineEnd - onlineStart) : 0;
const lambda0 = 3 * trunkLen * 20 / 24000; // 在线秒→tick（20 tps）；80min 全程 → λ0=12
console.log(`T1 = ${t1Verdict}；在线段=${trunkLen}s → λ0=${lambda0.toFixed(2)}（期望行数≈${lambda0 > 0 ? '5.5±' : '—'} 当 0 行回复窗以 Poisson 下界报 C）`);

// ← T2
console.log(`\n== T2 冻结面 ==`);
const holdBeginM = holdMarks.find(m => !m.end);
const holdEndM = holdMarks.find(m => m.end && holdBeginM && m.sec > holdBeginM.sec);
const freezeStart = (holdEndM && holdEndM.sec) || leaveSec || null;
let t2a = 'C 级（无摘除锚）';
if (freezeStart !== null) {
  const freeze = spawnRows.filter(r => r.sec > freezeStart);
  const freezeLen = (spawnRows.length ? spawnRows[spawnRows.length - 1].sec : freezeStart) - freezeStart;
  console.log(`摘除自 ${hrMin(freezeStart)}（来源=${holdEndM ? 'HOLD end' : 'left-the-game'}），段长 ${Math.floor(freezeLen / 60)}min，[SpawnLog] 全型行=${freeze.length}`);
  freeze.slice(0, 4).forEach(r => console.log(`  ${hrMin(r.sec)}  ${r.body}`));
  t2a = freeze.length === 0 ? 'PASS' : 'FAIL';
  console.log(`T2a = ${t2a}`);
}
const t2bFirst = t1Rows[0], t2bLast = t1Rows[t1Rows.length - 1];
let t2b = 'C 级（无 modifier 行可对位）';
if (t1Rows.length >= 2) {
  const d = (t2bLast.body.match(/d=(-?\d+)/) || [])[1];
  const i = (t2bLast.body.match(/i=(-?\d+)/) || [])[1];
  const n = (t2bLast.body.match(/n=(-?\d+)/) || [])[1];
  const d0 = (t2bFirst.body.match(/d=(-?\d+)/) || [])[1];
  const i0 = (t2bFirst.body.match(/i=(-?\d+)/) || [])[1];
  const n0 = (t2bFirst.body.match(/n=(-?\d+)/) || [])[1];
  const dd = Math.abs(+d - +d0), di = Math.abs(+i - +i0), dn = Math.abs(+n - +n0);
  const bound = dd <= 4000 && di <= 1999 && dn <= 3998;
  t2b = `首行 ${hrMin(t2bFirst.sec)} d=${d0} i=${i0} n=${n0} → 末行 ${hrMin(t2bLast.sec)} d=${d} i=${i} n=${n}：Δ=${dd}/${di}/${dn}（上界 4000/1999/3998）→ ${bound ? 'PASS' : 'FAIL'}`;
}
console.log(`T2b = ${t2b}`);

// ← T3
console.log(`\n== T3 spawn spectrum ==`);
let t3 = 'C 级（无在线段）';
if (onlineStart !== null && onlineEnd !== null && onlineEnd > onlineStart) {
  let failSpans = 0, buckets = 0, emptyBuckets = 0;
  for (let t = onlineStart; t < onlineEnd; t += BUCKET) {
    buckets++;
    const cnt = spawnRows.filter(r => inWindow(r.sec, t, Math.min(t + BUCKET, onlineEnd))).length;
    if (cnt === 0) emptyBuckets++;
    console.log(`  桶 [${hrMin(t)}..+${BUCKET}s] 行数=${cnt}${cnt === 0 ? '  ← 空桶' : ''}`);
    const window3 = spawnRows.filter(r => inWindow(r.sec, t, Math.min(t + BUCKET * 3, onlineEnd)));
    if (window3.length === 0) failSpans += BUCKET * 3;
  }
  t3 = `PASS（${buckets} 桶 / 空桶 ${emptyBuckets} / 连续空段 ${failSpans}s）`;
  if (failSpans > 0) t3 = `FAIL（连续空段 ${failSpans}s）`;
  console.log(`T3 = ${t3}`);
}

// ← T4 行为形态
console.log(`\n== T4 行为形态（audit16 b0b2b3a 复核）==`);
const famCount = {};
const famY = {};
const deepRows = [];
for (const r of spawnRows.filter(r2 => inWindow(r2.sec, bootSec, w1End))) {
  const fam = (r.body.replace(/^\[SpawnLog\] /, '').split(' ')[0] || 'unknown');
  famCount[fam] = (famCount[fam] || 0) + 1;
  const ym = r.body.match(/pos=\(-?\d+,(-?\d+),/);
  if (ym) { const y = +ym[1]; const bucket = y >= 60 ? 'over60' : 'under60'; famY[fam] = famY[fam] || { over60: 0, under60: 0 }; famY[fam][bucket]++; }
  if (fam === 'cap-block' && /deep=/.test(r.body)) deepRows.push(r);
}
for (const [k, v] of Object.entries(famCount)) {
  const yb = famY[k];
  const yShare = yb ? ` y桶 over60=${yb.over60} under60=${yb.under60}` : '';
  console.log(`  ${k.padEnd(20)} = ${v} 行${yShare}`);
}
console.log(`  cap-block deep= 出现 ${deepRows.length} 行${deepRows.length ? '（audit16 深环改面已显效）' : '（未出现——记观察项）'}`);
console.log(`  reject day-outdoor（仅不死/白昼时段出现）家族见上表`);
console.log(`  exceptions(boot 后粗计)=${bootExceptions}（判据 =0；粗计含 ERROR/INFO unicode 腹面）`);

// raw 打包
fs.mkdirSync(reportDirArg, { recursive: true });
const rawOut = rows.filter(l => (l.includes('[SpawnLog]') || l.includes('[HarnMark] HOLD') || /joined the game|left the game/.test(l)) && parseTs(l) !== null).join('\r\n');
const rawPath = path.join(reportDirArg, 'spawn-transition-raw.log');
fs.writeFileSync(rawPath, rawOut, 'utf8');
console.log(`\nraw 打包：${rawPath}（${rawOut.split('\n').length} 行）`);
