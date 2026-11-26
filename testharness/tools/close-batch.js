#!/usr/bin/env node
/**
 * close-batch.js -- one command for the mechanical half of batch closeout.
 *
 *   node testharness/tools/close-batch.js \
 *     --batch B-71 \
 *     --scope "灌木（census F :128）" \
 *     --verdict testharness/reports/b71-verify-verdict.md \
 *     --receipt testharness/reports/b71-verify-receipt.md \
 *     --land "F:BlockBush.java:1-223=world/ETIMBlockBush.java（B-71）"
 *
 * It refuses to write anything unless:
 *   - the verdict file exists and says PASS with A=0;
 *   - the batch id is not already in the ledger;
 *   - every --land key is found in its census volume.
 *
 * Steps: flip census rows + counters -> append ledger entry (next number)
 *        -> append sessions block -> regenerate player/INDEX.md -> run preflight.
 * Nothing is committed; the tool prints the exact git add line.
 *
 * --dry-run  print every planned write without touching files.
 * Exit 0 ok, 1 refused, 2 wrote but preflight failed.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOLS = __dirname;
const REPO = path.resolve(TOOLS, '..', '..');
const BOOKS = path.resolve(REPO, '..', '..');
const LEDGER = path.join(BOOKS, 'playground', 'audit', '账册', '现行账.md');
const SESSIONS = path.join(BOOKS, 'playground', 'sessions.md');
const CENSUS_DIR = path.join(BOOKS, 'playground', 'audit', 'census');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
function args(name) {
  const out = [];
  process.argv.forEach((s, i) => { if (s === name && process.argv[i + 1]) out.push(process.argv[i + 1]); });
  return out;
}
const DRY = process.argv.includes('--dry-run');

const batch = arg('--batch');
const scope = arg('--scope');
const verdictPath = arg('--verdict');
const receiptPath = arg('--receipt');
const lands = args('--land');

function die(msg) {
  console.log('[CloseLog] refuse: ' + msg);
  process.exit(1);
}
function say(msg) { console.log('[CloseLog] ' + msg); }

if (!batch || !/^B-\d+[A-Z]*$/.test(batch)) die('usage: --batch B-71');
if (!scope) die('usage: --scope "<one-line scope>"');
if (!verdictPath) die('usage: --verdict <path>');

// ---- line helpers (preserve CRLF/LF) --------------------------------------
function readLines(file) {
  const raw = fs.readFileSync(file, 'utf8');
  return { lines: raw.split(/\r?\n/), eol: raw.includes('\r\n') ? '\r\n' : '\n' };
}
function writeLines(file, lines, eol) {
  let out = lines.join(eol);
  if (!out.endsWith(eol)) out += eol;
  if (DRY) { say('dry-run write ' + path.relative(BOOKS, file) + ' (' + lines.length + ' lines)'); return; }
  fs.writeFileSync(file, out, 'utf8');
}

// ---- 1. verdict gate -------------------------------------------------------
const absVerdict = path.resolve(REPO, verdictPath);
if (!fs.existsSync(absVerdict)) die('verdict not found: ' + verdictPath);
const verdict = fs.readFileSync(absVerdict, 'utf8');
if (!/\bPASS\b/.test(verdict)) die('verdict does not contain PASS');
if (!/A\s*[=＝]\s*0/.test(verdict)) die('verdict does not contain A=0');
const pinLine = verdict.split(/\r?\n/).find((s) => s.includes('PIN') || s.includes('钉值')) || '';
say('verdict ok: ' + verdictPath);

// ---- 2. ledger numbering + duplicate guard --------------------------------
const led = readLines(LEDGER);
let maxNo = 0;
const existing = new Set();
for (const s of led.lines) {
  const m = /^### 条 (\d+)/.exec(s);
  if (m) { maxNo = Math.max(maxNo, +m[1]); existing.add(+m[1]); }
}
const batchSeen = led.lines.some((s) => s.startsWith('### 条') && s.includes(batch));
if (batchSeen) die('ledger already has an entry for ' + batch);
const entryNo = maxNo + 1;
say('ledger next entry: 条 ' + entryNo);

// ---- 3. census landings ----------------------------------------------------
const censusPlan = [];
for (const spec of lands) {
  const eq = spec.indexOf('=');
  if (eq < 1) die('--land must be VOL:KEY=ETIM, got: ' + spec);
  const left = spec.slice(0, eq);
  const etim = spec.slice(eq + 1);
  const colon = left.indexOf(':');
  if (colon < 1) die('--land needs VOL:KEY (e.g. F:BlockBush.java:1-223), got: ' + left);
  const vol = left.slice(0, colon);
  const key = left.slice(colon + 1);
  const file = fs.readdirSync(CENSUS_DIR).find((n) => n.startsWith('普查' + vol + '-'));
  if (!file) die('no census volume for ' + vol);
  const full = path.join(CENSUS_DIR, file);
  const { lines, eol } = readLines(full);
  let flipped = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('[面] ' + key + ' |')) continue;
    if (!lines[i].includes('状态:【未立项】')) continue;
    lines[i] = lines[i].replace('状态:【未立项】', '状态:【已落地】')
      .replace(/ETIM位:[^|]*$/, 'ETIM位:' + etim);
    flipped++;
  }
  if (!flipped) die('census key not found or already landed: ' + vol + ' ' + key);
  let landed = 0, unrecorded = 0;
  for (const s of lines) {
    const a = /^census_landed=(\d+)/.exec(s);
    const b = /^census_unrecorded=(\d+)/.exec(s);
    if (a) landed = +a[1];
    if (b) unrecorded = +b[1];
  }
  if (unrecorded < flipped) die('census counters would go negative in ' + file);
  for (let i = 0; i < lines.length; i++) {
    if (/^census_landed=\d+/.test(lines[i])) lines[i] = 'census_landed=' + (landed + flipped);
    if (/^census_unrecorded=\d+/.test(lines[i])) lines[i] = 'census_unrecorded=' + (unrecorded - flipped);
  }
  censusPlan.push({ file: full, lines, eol, flipped, landed: landed + flipped, unrecorded: unrecorded - flipped });
  say('census ' + file + ': flipped ' + flipped + ' rows, landed ' + landed + '->' + (landed + flipped));
}

// ---- 4. ledger entry -------------------------------------------------------
const entry = [
  '',
  '### 条 ' + entryNo + ' · ' + batch + ' ' + scope,
  '',
  '- **范围**：' + batch + ' — ' + scope + '。',
  '- **判窗**：`' + verdictPath + '`（PASS，A=0）' + (receiptPath ? '；回执 `' + receiptPath + '`' : '') + '。',
  pinLine ? '- **钉值**：' + pinLine.replace(/^\s*[-*]\s*/, '').replace(/^(钉值|PIN)\s*[:：]\s*/, '').trim() : '',
  censusPlan.length
    ? '- **census**：' + censusPlan.map((c) => path.basename(c.file) + ' 翻 ' + c.flipped + ' 行（landed ' + c.landed + '）').join('；') + '。'
    : '- **census**：无（工装批）。',
  '- **收口提交**：待提交（本条目由 `close-batch.js` 生成，提交后补 hash）。',
  ''
].filter((s) => s !== '').join('\n');

// ---- 5. sessions block -----------------------------------------------------
const ses = readLines(SESSIONS);
const sesHas = ses.lines.some((s) => s.startsWith('## ' + batch));
const sesBlock = [
  '',
  '## ' + batch + '（' + scope + '）',
  '',
  '- 判窗：`' + verdictPath + '`（PASS，A=0）' + (receiptPath ? '；回执 `' + receiptPath + '`' : '') + '。',
  censusPlan.length ? '- census：' + censusPlan.map((c) => c.flipped + ' 面').join('、') + '。' : '- census：无（工装批）。',
  '- 收口：账册条 ' + entryNo + '；commit 待补。',
  ''
].join('\n');

// ---- apply -----------------------------------------------------------------
for (const c of censusPlan) writeLines(c.file, c.lines, c.eol);

let ledLines = led.lines.slice();
if (ledLines.length && ledLines[ledLines.length - 1] === '') ledLines.pop();
ledLines.push(entry);
writeLines(LEDGER, ledLines, led.eol);

if (!sesHas) {
  let sesLines = ses.lines.slice();
  if (sesLines.length && sesLines[sesLines.length - 1] === '') sesLines.pop();
  sesLines.push(sesBlock);
  writeLines(SESSIONS, sesLines, ses.eol);
} else {
  say('sessions already has ## ' + batch + ' (skipped)');
}

say('ledger 条 ' + entryNo + ' appended; sessions ' + (sesHas ? 'unchanged' : 'appended'));
if (DRY) {
  console.log('--- ledger entry (dry-run preview) ---');
  console.log(entry);
  console.log('--- end ---');
}

// ---- 6. index + preflight --------------------------------------------------
if (!DRY) {
  execFileSync(process.execPath, [path.join(TOOLS, 'index-scripts.js')], { cwd: REPO, stdio: 'inherit' });
}
let preflightOk = true;
try {
  execFileSync(process.execPath, [path.join(TOOLS, 'preflight.js')], { cwd: REPO, stdio: 'inherit' });
} catch (e) {
  preflightOk = false;
}

say('next: stage only this batch (never git add -A):');
say('  git add <本批 src / resources / testharness 文件>');
say('  git commit -m "' + batch + ' ' + scope + '"');
if (!preflightOk) {
  say('preflight FAILED — fix the step above, then re-run preflight');
  process.exit(2);
}
say('done');
