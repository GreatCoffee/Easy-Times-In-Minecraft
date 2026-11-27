#!/usr/bin/env node
/* selftest-coverage.js — 用临时账本树验证 check-coverage 的棘轮、文档与豁免。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'check-coverage.js');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

function tree() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
    const census = path.join(root, 'playground', 'audit', 'census');
    const repo = path.join(root, 'git-workspace', 'etim');
    const src = path.join(repo, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
    fs.mkdirSync(census, { recursive: true });
    fs.mkdirSync(src, { recursive: true });
    fs.writeFileSync(path.join(src, 'LoggedThing.java'), 'class LoggedThing {\n  void a() { log("[AlphaLog] x=1"); }\n}\n', 'utf8');
    fs.writeFileSync(path.join(src, 'SilentThing.java'), 'class SilentThing {\n  void a() { }\n}\n', 'utf8');
    return { root, census, repo, src };
}

function censusFile(t, faces) {
    const body = [
        '# 普查T-自检-盘点',
        '',
        'census_faces_total=' + faces.length,
        'census_landed=' + faces.length,
        '',
        '## §2 逐面行',
        '',
        ...faces.map((f) => '[面] ' + f.ref + ' | ' + f.note + ' | 状态:' + (f.parity ? '【已落地·parity】' : '【已落地】') + ' | ETIM位:' + f.etim),
        '',
    ].join('\n');
    fs.writeFileSync(path.join(t.census, '普查T-自检-盘点.md'), body, 'utf8');
}

function run(t, args) {
    const r = spawnSync('node', [TOOL, ...args], {
        encoding: 'utf8',
        env: { ...process.env, COVERAGE_BOOKS_ROOT: t.root, COVERAGE_REPO: t.repo, COVERAGE_BASELINE: path.join(t.root, 'coverage-baseline.json'), COVERAGE_R196: path.join(t.root, 'nope') },
    });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// 1) 全 logged + parity → OK，并生成文档
{
    const t = tree();
    censusFile(t, [
        { ref: 'LoggedThing.java:1-3', note: 'a', etim: 'LoggedThing.java:1-3' },
        { ref: 'SilentThing.java:1-3', note: 'b', parity: true, etim: '【parity】无产品码' },
    ]);
    const r1 = run(t, ['--write-doc', '--update-baseline']);
    const r2 = run(t, ['--check']);
    check('clean-ok', r1.code === 0 && r2.code === 0 && /silent=0/.test(r2.out), r2.out.trim().split('\n').pop());
    check('doc-written', fs.existsSync(path.join(t.repo, 'testharness', 'reports', 'COVERAGE.md')));
}

// 2) 新增 silent 面 → exit 1 并报 NEW
{
    const t = tree();
    censusFile(t, [{ ref: 'LoggedThing.java:1-3', note: 'a', etim: 'LoggedThing.java:1-3' }]);
    run(t, ['--write-doc', '--update-baseline']);
    censusFile(t, [
        { ref: 'LoggedThing.java:1-3', note: 'a', etim: 'LoggedThing.java:1-3' },
        { ref: 'SilentThing.java:1-3', note: 'b', etim: 'SilentThing.java:1-3' },
    ]);
    const r = run(t, ['--check']);
    check('new-silent-blocks', r.code === 1 && /NEW silent SilentThing\.java/.test(r.out), 'exit=' + r.code);
}

// 3) 更新基线后放行
{
    const t = tree();
    censusFile(t, [{ ref: 'SilentThing.java:1-3', note: 'b', etim: 'SilentThing.java:1-3' }]);
    run(t, ['--write-doc']);
    const blocked = run(t, ['--check']);
    run(t, ['--update-baseline']);
    const ok = run(t, ['--check']);
    check('baseline-update', blocked.code === 1 && ok.code === 0, 'before=' + blocked.code + ' after=' + ok.code);
}

// 4) 文档陈旧 → --check exit 1
{
    const t = tree();
    censusFile(t, [{ ref: 'LoggedThing.java:1-3', note: 'a', etim: 'LoggedThing.java:1-3' }]);
    run(t, ['--write-doc', '--update-baseline']);
    const doc = path.join(t.repo, 'testharness', 'reports', 'COVERAGE.md');
    fs.appendFileSync(doc, '\n手工改动\n', 'utf8');
    const r = run(t, ['--check']);
    check('doc-stale', r.code === 1 && /doc=stale/.test(r.out), 'exit=' + r.code);
}

// 5) 账本树缺失 → SKIP exit 0
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-empty-'));
    const r = spawnSync('node', [TOOL], { encoding: 'utf8', env: { ...process.env, COVERAGE_BOOKS_ROOT: root, COVERAGE_REPO: root } });
    check('census-absent-skip', r.status === 0 && /SKIP/.test((r.stdout || '') + (r.stderr || '')), 'exit=' + r.status);
}

const pass = results.filter((x) => x.ok).length;
console.log('selftest-coverage: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
