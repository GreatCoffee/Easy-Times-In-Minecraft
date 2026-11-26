#!/usr/bin/env node
/**
 * check-books 自检（离线）：造两棵最小账本树，好树必须 OK，坏树必须命中指定硬错。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-books.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'books-'));

function writeTree(name, volume, ledger) {
    const root = path.join(dir, name);
    const census = path.join(root, 'playground', 'audit', 'census');
    const books = path.join(root, 'playground', 'audit', '账册');
    fs.mkdirSync(census, { recursive: true });
    fs.mkdirSync(books, { recursive: true });
    fs.writeFileSync(path.join(census, '普查X-测试-盘点.md'), volume, 'utf8');
    fs.writeFileSync(path.join(census, 'census-总账.md'), '', 'utf8');
    fs.writeFileSync(path.join(books, '现行账.md'), ledger, 'utf8');
    fs.writeFileSync(path.join(root, 'playground', 'sessions.md'), '', 'utf8');
    return root;
}

function run(root) {
    try {
        const out = execFileSync(process.execPath, [TOOL, '--root', root, '--list'], { encoding: 'utf8' });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') };
    }
}

const head = (landed, pooled, unrecorded, total) =>
    `census_faces_total=${total}\ncensus_landed=${landed}\ncensus_pooled=${pooled}\ncensus_unrecorded=${unrecorded}\n`;

const row = (key, status, etim) => `[面] ${key} | 测试面 | 状态:${status} | ETIM位:${etim}`;

const goodVolume = head(2, 0, 1, 3) + [
    row('A.java:1-2', '【已落地】', 'X.java:1'),
    row('B.java:1-2', '【已落地】', 'X.java:2'),
    row('C.java:1-2', '【未立项】', '—'),
].join('\n') + '\n';
const goodLedger = '### 条 1 · 甲\n\n- 内容\n\n### 条 2 · 乙\n\n- 内容\n';

const badVolume = head(3, 0, 1, 3) + goodVolume.split('\n').slice(4).join('\n');
const badLedger = '### 条 1 · 甲\n\n- 内容\n\n### 条 1 · 甲重号\n\n- 内容\n';

const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

const okRoot = writeTree('ok', goodVolume, goodLedger);
const r1 = run(okRoot);
check('good tree exits 0', r1.code === 0, r1.out.trim().split('\n').pop());

const badRoot = writeTree('bad', badVolume, badLedger);
const r2 = run(badRoot);
check('bad tree exits 1', r2.code === 1);
check('finds arithmetic mismatch', /landed\+pooled\+unrecorded\+zp=4 ≠ total=3/.test(r2.out));
check('finds duplicate entry', /条号重复：条 1/.test(r2.out));

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed} dir=${dir}`);
process.exit(failed === 0 ? 0 : 1);
