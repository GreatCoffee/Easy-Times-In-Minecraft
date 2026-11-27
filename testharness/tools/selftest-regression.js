#!/usr/bin/env node
/**
 * selftest-regression — regression-plan / run-regression 的自检（B-70TP）。
 *
 * 造临时仓：2 个通道、2 个 harness 脚本（一个断言 A 通道、一个不引用）、1 份 verdict。
 *   1) 矩阵统计：channels=2 covered=1 gaps=1 scripts=2 verdicts=1
 *   2) --check：生成后 exit 0；改 src 后 exit 1
 *   3) run-regression --list：认出 2 个脚本、exit 0
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PLAN = path.join(__dirname, 'regression-plan.js');
const RUNNER = path.join(__dirname, 'run-regression.js');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'regr-'));
const src = path.join(root, 'src', 'main', 'java', 'fake');
const player = path.join(root, 'testharness', 'player');
const reports = path.join(root, 'testharness', 'reports');
for (const d of [src, player, reports]) fs.mkdirSync(d, { recursive: true });

fs.writeFileSync(path.join(src, 'Alpha.java'), [
    'class Alpha {',
    '    void log() { System.out.println("[AlphaLog] ok"); }',
    '    void log2() { System.out.println("[BetaLog] ok"); }',
    '}',
].join('\n'), 'utf8');
fs.writeFileSync(path.join(player, 'f11-b99-smoke.js'), [
    "const H = require('./lib/harness');",
    "const h = H.create({ run: 'x' });",
    "// [AlphaLog] asserted",
    'module.exports = h;',
].join('\n'), 'utf8');
fs.writeFileSync(path.join(player, 'f12-b98-smoke.js'), [
    "const H = require('./lib/harness');",
    "// no channel here",
    'module.exports = H;',
].join('\n'), 'utf8');
fs.writeFileSync(path.join(reports, 'b-99-verify-verdict.md'), 'PASS\n', 'utf8');
// B-70UN: an open gap must be registered or it fails the ratchet.
const exemptFile = path.join(root, 'exempt.json');
fs.writeFileSync(exemptFile, JSON.stringify({ channels: { BetaLog: 'fixture: no window in this tree' } }), 'utf8');

function run(tool, args) {
    try {
        const out = execFileSync(process.execPath, [tool, ...args], {
            encoding: 'utf8',
            env: { ...process.env, REG_REPO: root, REG_EXEMPT: exemptFile },
        });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

let pass = 0;
const total = 3;

const p1 = run(PLAN, []);
const ok1 = p1.code === 0
    && /channels=2\b/.test(p1.out) && /covered=1\b/.test(p1.out)
    && /gaps=1\b/.test(p1.out) && /exempt=1\b/.test(p1.out)
    && /scripts=2\b/.test(p1.out) && /verdicts=1\b/.test(p1.out);
if (ok1) pass++;
console.log(`${ok1 ? 'PASS' : 'FAIL'} matrix-counts`);
if (!ok1) console.log(p1.out.trim());

const fresh = run(PLAN, ['--check']);
fs.appendFileSync(path.join(src, 'Alpha.java'), '\n// [GammaLog] new producer\n');
const stale = run(PLAN, ['--check']);
const ok2 = fresh.code === 0 && stale.code === 1 && /stale=true/.test(stale.out);
if (ok2) pass++;
console.log(`${ok2 ? 'PASS' : 'FAIL'} stale-detect (fresh=${fresh.code} stale=${stale.code})`);
if (!ok2) console.log((stale.out || '').trim());

const l = run(RUNNER, ['--list']);
const ok3 = l.code === 0 && /scripts=2/.test(l.out) && /f11-b99-smoke\.js/.test(l.out);
if (ok3) pass++;
console.log(`${ok3 ? 'PASS' : 'FAIL'} runner-list`);
if (!ok3) console.log(l.out.trim());

fs.rmSync(root, { recursive: true, force: true });
console.log(`selftest-regression: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
