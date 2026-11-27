#!/usr/bin/env node
/** selftest-retention.js — retention.js 的四项自检（B-70UR）。 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const TOOL = path.join(__dirname, 'retention.js');
const results = [];

function run(args, env) {
    return cp.spawnSync(process.execPath, [TOOL].concat(args), {
        encoding: 'utf8',
        env: Object.assign({}, process.env, env || {})
    });
}

function tree() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'retention-'));
    const repo = path.join(root, 'repo');
    fs.mkdirSync(path.join(repo, 'testharness', 'build-logs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'playground'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'run', 'w-a-r1'), { recursive: true });
    fs.mkdirSync(path.join(repo, 'run', 'w-a-r2'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'run', 'w-a-r1', 'level.dat'), 'x');
    fs.writeFileSync(path.join(repo, 'run', 'w-a-r2', 'level.dat'), 'yy');
    fs.writeFileSync(path.join(repo, 'testharness', 'build-logs', 'a-r1.out'), 'log1');
    fs.writeFileSync(path.join(repo, 'testharness', 'build-logs', 'a-r2.out'), 'log2');
    fs.writeFileSync(path.join(root, 'playground', 'note.md'), '见 a-r1.out 与 w-a-r2\n');
    const now = Date.now() / 1000;
    fs.utimesSync(path.join(repo, 'run', 'w-a-r1'), now - 7200, now - 7200);
    fs.utimesSync(path.join(repo, 'run', 'w-a-r2'), now - 3600, now - 3600);
    return { root, repo };
}

function check(name, ok, detail) {
    results.push({ name, ok, detail });
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}

// 1) dry-run 不动文件，且鉴定证据
{
    const t = tree();
    const r = run(['--root', t.root, '--repo', t.repo, '--archive', path.join(t.root, 'arch'), '--keep', '1'],
        { RETENTION_BASELINE: path.join(t.root, 'base.json'), RETENTION_MANIFEST: path.join(t.root, 'manifest.json') });
    const alive = fs.existsSync(path.join(t.repo, 'run', 'w-a-r1', 'level.dat'))
        && fs.existsSync(path.join(t.repo, 'testharness', 'build-logs', 'a-r1.out'));
    check('dry-run leaves files in place', alive && /dry-run/.test(r.stdout), r.stdout.split('\n')[0]);
}

// 2) --apply 只搬候选，证据日志与最新世界留下
{
    const t = tree();
    const arch = path.join(t.root, 'arch');
    const r = run(['--root', t.root, '--repo', t.repo, '--archive', arch, '--keep', '1', '--apply'],
        { RETENTION_BASELINE: path.join(t.root, 'base.json'), RETENTION_MANIFEST: path.join(t.root, 'manifest.json') });
    const logKept = fs.existsSync(path.join(t.repo, 'testharness', 'build-logs', 'a-r1.out'));
    const oldWorld = fs.existsSync(path.join(arch, 'world', 'w-a-r1'));
    const newWorld = fs.existsSync(path.join(t.repo, 'run', 'w-a-r2', 'level.dat'));
    check('apply keeps evidence log', logKept, 'a-r1.out referenced by note.md');
    check('apply archives the older world', oldWorld, 'w-a-r1 moved');
    check('apply keeps the newest world', newWorld, 'w-a-r2 stays');
    check('apply writes a baseline', fs.existsSync(path.join(t.root, 'base.json')), r.stdout.trim().split('\n').pop());
}

// 3) --check 棘轮：新增世界后应 exit 1
{
    const t = tree();
    const env = { RETENTION_BASELINE: path.join(t.root, 'base.json'), RETENTION_MANIFEST: path.join(t.root, 'manifest.json') };
    run(['--root', t.root, '--repo', t.repo, '--archive', path.join(t.root, 'arch'), '--keep', '1', '--apply'], env);
    fs.mkdirSync(path.join(t.repo, 'run', 'w-a-r3'), { recursive: true });
    fs.writeFileSync(path.join(t.repo, 'run', 'w-a-r3', 'level.dat'), 'zzz');
    const r = run(['--root', t.root, '--repo', t.repo, '--check'], env);
    check('check fails after growth', r.status === 1 && /GREW/.test(r.stdout), r.stdout.trim().split('\n').pop());

    const r2 = run(['--root', t.root, '--repo', t.repo, '--update-baseline'], env);
    const r3 = run(['--root', t.root, '--repo', t.repo, '--check'], env);
    check('re-baseline restores OK', r2.status === 0 && r3.status === 0 && /verdict OK/.test(r3.stdout), r3.stdout.trim());
}

const bad = results.filter((r) => !r.ok);
console.log('selftest-retention: ' + (results.length - bad.length) + '/' + results.length);
process.exit(bad.length ? 1 : 0);
