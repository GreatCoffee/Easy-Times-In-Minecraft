#!/usr/bin/env node
/** check-report-shape 自检：造三类文书与工单，验规则与基线棘轮。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-report-shape.js');
const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

function tree(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sh-'));
    const repo = path.join(root, 'repo');
    const reports = path.join(repo, 'testharness', 'reports');
    const audit = path.join(root, 'playground', 'audit');
    const census = path.join(audit, 'census');
    fs.mkdirSync(reports, { recursive: true });
    fs.mkdirSync(census, { recursive: true });
    fs.writeFileSync(path.join(census, '批次工单.md'), [
        '# 工单', '', '### B-99 · 自检', '',
        '- `C:1` Foo.java:10 —— 面一', '- `C:2` Foo.java:20 —— 面二', '',
    ].join('\n'), 'utf8');
    for (const [rel, body] of Object.entries(files)) {
        const p = path.join(root, rel);
        fs.mkdirSync(path.dirname(p), { recursive: true });
        fs.writeFileSync(p, body, 'utf8');
    }
    return root;
}

function run(root, extra, baseline) {
    const env = Object.assign({}, process.env, {
        SHAPE_ROOT: root,
        SHAPE_REPO: path.join(root, 'repo'),
        SHAPE_BASELINE: baseline || path.join(root, 'baseline.json'),
    });
    try {
        const out = execFileSync(process.execPath, [TOOL, ...(extra || [])], { encoding: 'utf8', env });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

const goodVerdict = [
    '# B-99 正本', '', '- 钉值：`b99-build1`', '- 终判：**PASS**（A=1 / B=0 / C=0）', '',
    '## §1', '', '- A-1 缺臂 `ETIMMountRules.java:120`', '',
].join('\n');

// 1) all good → exit 0
const t1 = tree({
    'repo/testharness/reports/b99-verify-verdict.md': goodVerdict,
    'repo/testharness/reports/b99-verify-receipt.md': '[done] {"run":"r1","pass":true} 钉值 b99-build1',
    'playground/audit/b99-对照报告.md': '# B-99\n\n- 判决 **DIFF**（A=1 / B=0 / C=0）\n- `C:1` Foo.java:10\n- `C:2` Foo.java:20\n',
});
const g = run(t1, []);
check('clean three docs exit 0', g.code === 0 && /fresh=0/.test(g.out), g.out.trim().split('\n').pop());

// 2) A item without anchor
const t2 = tree({
    'repo/testharness/reports/b99-verify-verdict.md': goodVerdict.replace('`ETIMMountRules.java:120`', '见上文'),
});
const a2 = run(t2, []);
check('missing anchor flagged', a2.code === 1 && /A-1 无 file:line 锚点/.test(a2.out));

// 3) verdict without grade line
const t3 = tree({ 'repo/testharness/reports/b99-verify-verdict.md': '# x\n\n- 终判 PASS\n- 钉值 b99\n' });
const a3 = run(t3, []);
check('missing grade flagged', a3.code === 1 && /V2/.test(a3.out));

// 4) receipt without pin
const t4 = tree({ 'repo/testharness/reports/b99-verify-receipt.md': '[done] {"pass":true}\n' });
const a4 = run(t4, []);
check('receipt without pin flagged', a4.code === 1 && /R2 无钉值/.test(a4.out));

// 5) comparison report missing a face
const t5 = tree({ 'playground/audit/b99-对照报告.md': '# B-99\n\n- 判决 PASS（A=0 / B=0 / C=0）\n- `C:1` Foo.java:10\n' });
const a5 = run(t5, []);
check('missing face flagged', a5.code === 1 && /C3 B-99 缺面 C:2/.test(a5.out));

// 6) baseline suppresses legacy failure, new failure still fails
const t6 = tree({
    'repo/testharness/reports/b98-verify-verdict.md': '# legacy\n',
    'repo/testharness/reports/b99-verify-verdict.md': '# x\n',
});
const base = path.join(t6, 'baseline.json');
const u = run(t6, ['--update-baseline'], base);
const g6 = run(t6, [], base);
check('baseline freezes legacy', u.code === 0 && g6.code === 0 && /fresh=0/.test(g6.out), g6.out.trim().split('\n').pop());
fs.writeFileSync(path.join(t6, 'repo/testharness/reports/b97-verify-verdict.md'), '# new\n', 'utf8');
const g7 = run(t6, [], base);
check('new failure still fails after baseline', g7.code === 1 && /fresh=1/.test(g7.out), g7.out.trim().split('\n').pop());

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
