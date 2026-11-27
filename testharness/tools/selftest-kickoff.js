#!/usr/bin/env node
/* selftest-kickoff.js — 用临时账本树验证 kickoff.js 的生成、--check 与陈旧检出。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'kickoff.js');
const results = [];

function makeTree() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kickoff-'));
    const books = path.join(root, 'playground', 'audit', 'census');
    fs.mkdirSync(path.join(books, '判值表'), { recursive: true });
    fs.mkdirSync(path.join(root, 'git-workspace', 'etim', 'testharness', 'player'), { recursive: true });
    fs.writeFileSync(path.join(books, '批次工单.md'), [
        '# 剩余面批次工单（生成物）',
        '',
        '### B-99（2 面，WIRE）',
        '',
        '- 组成：载体 `MixinFoo`',
        '',
        '  - `B:1` Foo.java:10 —— 第一面',
        '  - `B:2` Bar.java:20 —— 第二面',
        '',
        '### B-100（1 面，NEW）',
        '',
        '  - `C:3` Baz.java:30 —— 第三面',
        '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(books, '判值表', '判值表-B.md'), [
        '# 判值候选表',
        '',
        '## B:1 · Foo.java:10',
        '',
        '- [门] L12 `if (x > 3)`',
        '',
        '## B:2 · Bar.java:20',
        '',
        '- 无候选的方法：bar(L20)',
        '',
    ].join('\n'), 'utf8');
    fs.writeFileSync(path.join(root, 'git-workspace', 'etim', 'testharness', 'player', 'f7-wb-lib.js'),
        "const PIN = { build: 'selftest-build', releaseSize: 1 };\n", 'utf8');
    return root;
}

function run(root, args) {
    const r = spawnSync('node', [TOOL, ...args], { encoding: 'utf8', env: { ...process.env, KICKOFF_ROOT: root } });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

// 1) 生成五份文件
{
    const root = makeTree();
    const r = run(root, ['B-99']);
    const dir = path.join(root, 'playground', 'audit', 'kickoff');
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).sort() : [];
    check('generate-five-files', r.code === 0 && files.length === 5, files.join(','));
    const m = files.length ? fs.readFileSync(path.join(dir, 'B-99-1-摸底.md'), 'utf8') : '';
    const card = files.length ? fs.readFileSync(path.join(dir, 'B-99-0-立项.md'), 'utf8') : '';
    check('face-table-and-pin', m.includes('`B:1`') && card.includes('selftest-build') && m.includes('Bar.java:20'));
    check('values-embedded', m.includes('if (x > 3)'));
    const w = files.length ? fs.readFileSync(path.join(dir, 'B-99-4-判窗.md'), 'utf8') : '';
    check('window-taskbook', w.includes('verify-receipt.md') && w.includes('180'));
}

// 2) 生成后 --check 应为 OK
{
    const root = makeTree();
    run(root, ['B-99']);
    const r = run(root, ['B-99', '--check']);
    check('check-fresh', r.code === 0 && /verdict=OK/.test(r.out), r.out.trim().split('\n').pop());
}

// 3) 改工单后 --check 应为 STALE exit 1
{
    const root = makeTree();
    run(root, ['B-99']);
    const plan = path.join(root, 'playground', 'audit', 'census', '批次工单.md');
    const txt = fs.readFileSync(plan, 'utf8').replace(
        '  - `B:2` Bar.java:20 —— 第二面',
        '  - `B:2` Bar.java:20 —— 第二面\n  - `B:3` Extra.java:40 —— 新增面');
    fs.writeFileSync(plan, txt, 'utf8');
    const r = run(root, ['B-99', '--check']);
    check('check-stale', r.code === 1 && /STALE/.test(r.out), 'exit=' + r.code);
}

// 4) 不存在的批次 → exit 1
{
    const root = makeTree();
    const r = run(root, ['B-404']);
    check('unknown-batch', r.code === 1 && /not in plan/.test(r.out), 'exit=' + r.code);
}

// 5) 账本树完全缺失 → SKIP exit 0
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kickoff-empty-'));
    const r = run(root, ['B-99']);
    check('plan-absent-skip', r.code === 0 && /SKIP/.test(r.out), 'exit=' + r.code);
}

const pass = results.filter((r) => r.ok).length;
console.log('selftest-kickoff: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
