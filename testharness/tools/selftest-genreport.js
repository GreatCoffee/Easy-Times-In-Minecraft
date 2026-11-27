#!/usr/bin/env node
/** gen-report.js 自检：临时工作区里造工单/就绪度/判值表/R196/ETIM 五份输入。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'gen-report.js');
const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

function makeTree(opts) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-'));
    const repo = path.join(root, 'repo');
    const r196 = path.join(root, 'r196');
    const census = path.join(root, 'playground', 'audit', 'census');
    fs.mkdirSync(census, { recursive: true });
    fs.mkdirSync(path.join(census, '判值表'), { recursive: true });
    fs.mkdirSync(r196, { recursive: true });
    const carrierDir = path.join(repo, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'mixins');
    fs.mkdirSync(carrierDir, { recursive: true });

    fs.writeFileSync(path.join(census, '批次工单.md'), [
        '# 批次工单', '', '### B-99 · 自检批次', '',
        '- `C:1` Foo.java:10 —— 自检面', '',
        '### B-98 · 另一批', '',
    ].join('\n'), 'utf8');

    fs.writeFileSync(path.join(census, '剩余-就绪度.md'), [
        '## 逐面明细', '',
        '| 卷:行 | R196 引用 | 状态 | 载体 / 依赖 | 说明 |',
        '| --- | --- | --- | --- | --- |',
        opts.noCarrier
            ? '| C:1 | Foo.java:10 | NEW | - / CORE | 自检面 |'
            : '| C:1 | Foo.java:10 | WIRE | MixinFoo / CORE | 自检面 |',
    ].join('\n'), 'utf8');

    fs.writeFileSync(path.join(census, '判值表', '判值表-C.md'), [
        '# 判值表 · C 卷', '', '## C:1 · Foo.java:10', '',
        '- [L10] `int limit = 7;`', '',
    ].join('\n'), 'utf8');

    fs.writeFileSync(path.join(r196, 'Foo.java'), [
        'package net.minecraft;', '', 'public class Foo {', '    void bar() {',
        '        int limit = 7;', '    }', '}', '',
    ].join('\n'), 'utf8');

    if (!opts.noCarrier) {
        fs.writeFileSync(path.join(carrierDir, 'MixinFoo.java'), [
            'package io.github.etim.etim.mixins;', '', 'public class MixinFoo {',
            '    void x() { System.out.println("[FooLog] ok"); }', '}', '',
        ].join('\n'), 'utf8');
    }
    return { root, repo, r196 };
}

function run(t, extra) {
    const env = Object.assign({}, process.env, {
        REPORT_ROOT: t.root, REPORT_REPO: t.repo, REPORT_R196: t.r196,
    });
    try {
        const out = execFileSync(process.execPath, [TOOL, ...extra], { encoding: 'utf8', env });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

// 1) clean
const t1 = makeTree({});
const g = run(t1, ['--batch', 'B-99']);
const doc = path.join(t1.root, 'playground', 'audit', 'draft', 'B-99-对照报告-草稿.md');
const text = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
check('generates draft', g.code === 0 && fs.existsSync(doc), g.out.trim());
check('lists face and excerpt', text.includes('`C:1`') && text.includes('[L10] `int limit = 7;`'));
check('shows carrier + channel', text.includes('MixinFoo.java') && text.includes('`[FooLog]`'));
check('leaves grading tables blank', text.includes('## §3 待裁 D 位') && text.includes('| A |  |  |  |'));

// 2) no carrier
const t2 = makeTree({ noCarrier: true });
const g2 = run(t2, ['--batch', 'B-99']);
const text2 = fs.readFileSync(path.join(t2.root, 'playground', 'audit', 'draft', 'B-99-对照报告-草稿.md'), 'utf8');
check('flags missing carrier', g2.code === 0 && text2.includes('未找到同名类') && /无载体 1/.test(text2));

// 3) --check fresh then stale
const c1 = run(t1, ['--batch', 'B-99', '--check']);
check('--check fresh exits 0', c1.code === 0 && /verdict OK/.test(c1.out), c1.out.trim().split('\n').pop());
fs.appendFileSync(path.join(t1.root, 'playground', 'audit', 'census', '批次工单.md'), '\n<!-- changed -->\n');
const c2 = run(t1, ['--batch', 'B-99', '--check']);
check('--check stale exits 1', c2.code === 1 && /verdict STALE/.test(c2.out), c2.out.trim().split('\n').pop());

// 4) unknown batch
const t4 = makeTree({});
const u = run(t4, ['--batch', 'Z-99']);
check('unknown batch exits 1', u.code === 1 && /batch not found/.test(u.out), u.out.trim());

// 5) missing inputs
const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'dr-'));
const m = run({ root: empty, repo: empty, r196: empty }, ['--batch', 'B-99']);
check('missing books exits 1', m.code === 1 && /missing/.test(m.out), m.out.trim());

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
