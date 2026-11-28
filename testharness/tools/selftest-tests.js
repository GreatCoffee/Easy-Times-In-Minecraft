#!/usr/bin/env node
/** check-tests 自检：造最小仓库，验「缺口判定 + 基线棘轮」。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-tests.js');
const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

function tree(mainFiles, testFiles) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-'));
    for (const [rel, body] of Object.entries(mainFiles)) {
        const p = path.join(root, 'src', 'main', 'java', rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, body, 'utf8');
    }
    for (const [rel, body] of Object.entries(testFiles || {})) {
        const p = path.join(root, 'src', 'test', 'java', rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, body, 'utf8');
    }
    return root;
}

function run(root, extra, baseline) {
    const env = Object.assign({}, process.env, {
        TESTS_REPO: root,
        TESTS_BASELINE: baseline || path.join(root, 'baseline.json'),
    });
    try {
        const out = execFileSync(process.execPath, [TOOL, ...(extra || [])], { encoding: 'utf8', env });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

const LOOSE = 'package a;\npublic final class Loose {\n    public static int one() { return 1; }\n    public static int two() { return 2; }\n}\n';
const TIGHT = 'package a;\npublic final class Tight {\n    public static int one() { return 1; }\n    public static int two() { return 2; }\n}\n';
const ONE_STATIC = 'package a;\npublic final class Solo {\n    public static int one() { return 1; }\n}\n';
const CLIENT = 'package a.client;\npublic final class Painted {\n    public static int one() { return 1; }\n    public static int two() { return 2; }\n}\n';
const TEST = 'package a;\nclass TightTest {\n    void t() { Tight.one(); }\n}\n';

// 1) missing baseline → exit 1 with hint
const t1 = tree({ 'a/Loose.java': LOOSE });
const r1 = run(t1, []);
check('missing baseline explains itself', r1.code === 1 && /--update-baseline/.test(r1.out));

// 2) baseline freezes the gap
const u2 = run(t1, ['--update-baseline']);
const r2 = run(t1, []);
check('baseline freezes gap', u2.code === 0 && r2.code === 0 && /gaps=1 .*fresh=0/.test(r2.out), r2.out.trim().split('\n').pop());

// 3) covered class is not a gap
const t3 = tree({ 'a/Tight.java': TIGHT }, { 'a/TightTest.java': TEST });
run(t3, ['--update-baseline']);
const r3 = run(t3, []);
check('class mentioned by test counts as covered', r3.code === 0 && /covered=1 gaps=0/.test(r3.out), r3.out.trim().split('\n').pop());

// 4) new untested class after baseline → exit 1
const t4 = tree({ 'a/Loose.java': LOOSE });
const b4 = path.join(t4, 'baseline.json');
run(t4, ['--update-baseline'], b4);
fs.writeFileSync(path.join(t4, 'src', 'main', 'java', 'a', 'Fresh.java'), LOOSE.replace('Loose', 'Fresh'), 'utf8');
const r4 = run(t4, [], b4);
check('new gap is rejected', r4.code === 1 && /FAIL no test: a\/Fresh.java/.test(r4.out));

// 5) single static method is not enough to demand a test
const t5 = tree({ 'a/Solo.java': ONE_STATIC });
run(t5, ['--update-baseline']);
const r5 = run(t5, []);
check('single static ignored', r5.code === 0 && /gaps=0/.test(r5.out), r5.out.trim().split('\n').pop());

// 6) client package exempt
const t6 = tree({ 'a/client/Painted.java': CLIENT });
run(t6, ['--update-baseline']);
const r6 = run(t6, []);
check('client package exempt', r6.code === 0 && /gaps=0/.test(r6.out), r6.out.trim().split('\n').pop());

// 7) baseline shrinks when gap gets a test
const t7 = tree({ 'a/Loose.java': LOOSE }, { 'a/Nothing.java': 'package a;\nclass Nothing {}\n' });
const b7 = path.join(t7, 'baseline.json');
run(t7, ['--update-baseline'], b7);
fs.writeFileSync(path.join(t7, 'src', 'test', 'java', 'a', 'LooseTest.java'), 'package a;\nclass LooseTest { void t() { Loose.one(); } }\n', 'utf8');
const r7 = run(t7, [], b7);
check('shrink hint appears', r7.code === 0 && /baseline shrank by 1/.test(r7.out), r7.out.trim().split('\n').pop());

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
