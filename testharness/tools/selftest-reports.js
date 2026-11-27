#!/usr/bin/env node
'use strict';
// check-reports.js 自检：五棵树（干净 / 死文档 / 死哈希 / 索引陈旧 / 旧名别名）。
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const TOOL = path.join(__dirname, 'check-reports.js');
const results = [];

function mkTree(name) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rep-' + name + '-'));
    const repo = path.join(root, 'repo');
    fs.mkdirSync(path.join(repo, 'testharness', 'reports'), { recursive: true });
    fs.mkdirSync(path.join(root, 'playground', 'audit', '账册'), { recursive: true });
    fs.writeFileSync(path.join(root, 'playground', 'sessions.md'), '# sessions\n', 'utf8');
    fs.writeFileSync(path.join(root, 'playground', 'audit', '账册', '现行账.md'), '# ledger\n', 'utf8');
    cp.execFileSync('git', ['init', '-q', repo]);
    cp.execFileSync('git', ['-C', repo, 'config', 'user.email', 't@t']);
    cp.execFileSync('git', ['-C', repo, 'config', 'user.name', 't']);
    fs.writeFileSync(path.join(repo, 'seed.txt'), 'seed\n', 'utf8');
    cp.execFileSync('git', ['-C', repo, 'add', 'seed.txt']);
    cp.execFileSync('git', ['-C', repo, 'commit', '-qm', 'seed']);
    return { root, repo, rep: path.join(repo, 'testharness', 'reports') };
}

function run(tree, args) {
    const r = cp.spawnSync(process.execPath, [TOOL, '--root', tree.root, '--repo', tree.repo, ...args], { encoding: 'utf8' });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function check(name, cond, detail) {
    results.push({ name, ok: !!cond, detail });
    console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' :: ' + detail));
}

/* 1. clean tree: one report, index built, no refs -> OK (orphan allowed) */
{
    const t = mkTree('clean');
    fs.writeFileSync(path.join(t.rep, 'x-verdict.md'), '# X\n\n判决：PASS\n', 'utf8');
    run(t, ['--write-index']);
    const r = run(t, []);
    check('clean tree exit 0', r.code === 0, r.out);
    check('clean tree orphan counted', /orphans=1/.test(r.out), r.out);
}

/* 2. dead doc reference */
{
    const t = mkTree('doc');
    fs.writeFileSync(path.join(t.rep, 'y-verdict.md'), '# Y\n\n判决：PASS\n\n见 `playground/audit/missing-doc.md`\n', 'utf8');
    run(t, ['--write-index']);
    const r = run(t, ['--list']);
    check('dead doc exit 1', r.code === 1, r.out);
    check('dead doc detected', /deadDoc=1/.test(r.out), r.out);
}

/* 3. dead commit hash */
{
    const t = mkTree('hash');
    fs.writeFileSync(path.join(t.rep, 'z-verdict.md'), '# Z\n\n判决：PASS\n\ncommit `deadbee1`\n', 'utf8');
    run(t, ['--write-index']);
    const r = run(t, ['--list']);
    check('dead hash exit 1', r.code === 1, r.out);
    check('dead hash detected', /deadHash=1/.test(r.out), r.out);
}

/* 4. stale index */
{
    const t = mkTree('index');
    fs.writeFileSync(path.join(t.rep, 'a-verdict.md'), '# A\n\n判决：PASS\n', 'utf8');
    run(t, ['--write-index']);
    fs.writeFileSync(path.join(t.rep, 'b-verdict.md'), '# B\n\n判决：PASS\n', 'utf8');
    const r = run(t, ['--list']);
    check('stale index exit 1', r.code === 1, r.out);
    check('stale index detected', /indexMissing=1/.test(r.out), r.out);
}

/* 5. alias resolves an old name */
{
    const t = mkTree('alias');
    fs.mkdirSync(path.join(t.root, 'playground', 'archive', 'audit'), { recursive: true });
    fs.writeFileSync(path.join(t.root, 'playground', 'archive', 'audit', 'audit18-w2j-adjudication.md'), '# moved\n', 'utf8');
    fs.writeFileSync(path.join(t.rep, 'c-verdict.md'), '# C\n\n判决：PASS\n\n见 `playground/audit/audit18-w2j-adjudication.md`\n', 'utf8');
    run(t, ['--write-index']);
    const r = run(t, ['--list']);
    check('alias tree exit 0', r.code === 0, r.out);
    check('alias counted', /aliased=1/.test(r.out), r.out);
}

const bad = results.filter((r) => !r.ok);
console.log('selftest-reports: ' + (results.length - bad.length) + '/' + results.length + (bad.length ? ' FAIL' : ' PASS'));
process.exit(bad.length ? 1 : 0);
