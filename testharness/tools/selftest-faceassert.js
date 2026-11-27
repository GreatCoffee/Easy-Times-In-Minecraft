#!/usr/bin/env node
/** selftest-faceassert.js — face-assert.js 的四项自检（B-70UR）。 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const TOOL = path.join(__dirname, 'face-assert.js');
const results = [];

function run(args, env) {
    return cp.spawnSync(process.execPath, [TOOL].concat(args), {
        encoding: 'utf8',
        env: Object.assign({}, process.env, env || {})
    });
}

function tree() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'faceassert-'));
    const repo = path.join(root, 'repo');
    const census = path.join(root, 'playground', 'audit', 'census');
    fs.mkdirSync(census, { recursive: true });
    fs.mkdirSync(path.join(repo, 'src', 'main', 'java', 'x'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'testharness', 'player'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'testharness', 'reports'), { recursive: true });

    fs.writeFileSync(path.join(repo, 'src', 'main', 'java', 'x', 'Loud.java'),
        'class Loud { void f() { log("[LoudLog] x=1"); } }\n');
    fs.writeFileSync(path.join(repo, 'src', 'main', 'java', 'x', 'Quiet.java'),
        'class Quiet { int f() { return 1; } }\n');
    fs.writeFileSync(path.join(repo, 'src', 'main', 'java', 'x', 'Lonely.java'),
        'class Lonely { void f() { log("[LonelyLog] y=2"); } }\n');
    fs.writeFileSync(path.join(repo, 'src', 'main', 'java', 'x', 'Holder.java'),
        'class Holder { void g() { Helper.row("x"); } }\n');
    fs.writeFileSync(path.join(repo, 'src', 'main', 'java', 'x', 'Helper.java'),
        'class Helper { static void row(String s) { log("[HelperLog] " + s); } }\n');

    fs.writeFileSync(path.join(repo, 'testharness', 'player', 'win.js'),
        "const R = /\\[LoudLog\\] x=(\\d+)/;\n");
    fs.writeFileSync(path.join(repo, 'testharness', 'player', 'chat.js'),
        "console.log('[HelperLog] mentioned only');\n");

    fs.writeFileSync(path.join(census, '普查T-测试-盘点.md'),
        [
            '# 测试卷',
            '',
            '## 一、逐面行',
            '',
            '[面] Loud.java:1-1 | 状态:【已落地】 | ETIM位:x/Loud.java:1-1',
            '[面] Quiet.java:1-1 | 状态:【已落地】 | ETIM位:x/Quiet.java:1-1',
            '[面] Lonely.java:1-1 | 状态:【已落地】 | ETIM位:x/Lonely.java:1-1',
            '[面] Holder.java:1-1 | 状态:【已落地】 | ETIM位:x/Holder.java:1-1',
            '[面] None.java:1-1 | 状态:【已落地】 | ETIM位:【parity】无代码',
            ''
        ].join('\n'));

    return { root, repo };
}

function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}

// 1) 分档正确
{
    const t = tree();
    const r = run(['--root', t.root, '--repo', t.repo, '--list']);
    const out = r.stdout;
    check('asserted tier', /T:Loud\.java:1-1 tier=ASSERTED/.test(out), 'regex in win.js');
    check('unasserted tier', /T:Lonely\.java:1-1 tier=UNASSERTED/.test(out), 'has channel, no script');
    check('delegate tier', /T:Holder\.java:1-1 tier=MENTIONED/.test(out), 'HelperLog only mentioned');
    check('no-chan tier', /T:Quiet\.java:1-1 tier=NO-CHAN/.test(out), 'carrier has no channel');
    check('parity treated as no-chan', /T:None\.java:1-1 tier=NO-CHAN/.test(out), '【parity】');
    check('counts line', /faces=5 asserted=1 mentioned=1 unasserted=1 noChan=2/.test(out), out.trim().split('\n').pop());
}

// 2) 文档生成 + 新鲜度
{
    const t = tree();
    const w = run(['--root', t.root, '--repo', t.repo, '--write-doc']);
    const doc = path.join(t.repo, 'testharness', 'reports', 'FACE-ASSERT.md');
    check('write-doc writes the file', w.status === 0 && fs.existsSync(doc),
        fs.existsSync(doc) ? fs.statSync(doc).size + ' B' : 'missing');
    const c1 = run(['--root', t.root, '--repo', t.repo, '--check']);
    check('fresh doc passes --check', c1.status === 0, c1.stdout.trim().split('\n').pop());

    fs.appendFileSync(path.join(t.root, 'playground', 'audit', 'census', '普查T-测试-盘点.md'),
        '[面] Extra.java:1-1 | 状态:【已落地】 | ETIM位:x/Quiet.java:1-1\n');
    const c2 = run(['--root', t.root, '--repo', t.repo, '--check']);
    check('stale doc fails --check', c2.status === 1 && /stale/.test(c2.stdout), c2.stdout.trim().split('\n').pop());
}

// 3) 缺账本树 → SKIP
{
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'faceassert-empty-'));
    const r = run(['--root', root, '--repo', path.join(root, 'repo')]);
    check('missing census tree skips', r.status === 0 && /SKIP/.test(r.stdout), r.stdout.trim());
}

const bad = results.filter((r) => !r.ok);
console.log('selftest-faceassert: ' + (results.length - bad.length) + '/' + results.length);
process.exit(bad.length ? 1 : 0);
