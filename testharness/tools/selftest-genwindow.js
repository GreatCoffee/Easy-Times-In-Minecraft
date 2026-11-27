#!/usr/bin/env node
/** selftest-genwindow.js — gen-window.js 的五项自检（B-70US）。 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');

const TOOL = path.join(__dirname, 'gen-window.js');
const REPO = path.resolve(__dirname, '..', '..');
const results = [];

function run(args, cwd) {
    return cp.spawnSync(process.execPath, [TOOL].concat(args), {
        encoding: 'utf8',
        cwd: cwd || REPO
    });
}

function tmpOut() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'genwin-'));
    return { dir, out: path.join(dir, 'f99-smoke.js') };
}

function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail ? ' — ' + detail : ''));
}

// 1) 生成成功，结构与臂数正确
{
    const t = tmpOut();
    const r = run(['--name', 'f99-x', '--batch', 'B-99', '--faces', 'C:141,C:147',
        '--channels', 'MountLog', '--cfg', 'combat:blockDebugLog', '--out', t.out]);
    const text = fs.existsSync(t.out) ? fs.readFileSync(t.out, 'utf8') : '';
    const ok = r.status === 0 && /H\.create\(/.test(text) && /res\.w1 = false/.test(text)
        && /res\.w2 = false/.test(text) && /cfg: \['combat:blockDebugLog'\]/.test(text);
    check('generates skeleton with one arm per face', ok, r.stdout.trim());
}

// 2) 生成物能通过 node --check
{
    const t = tmpOut();
    run(['--name', 'f99-y', '--batch', 'B-99', '--faces', 'A:1', '--out', t.out]);
    const r = cp.spawnSync(process.execPath, ['--check', t.out], { encoding: 'utf8' });
    check('generated file parses', r.status === 0, r.status === 0 ? 'node --check OK' : (r.stderr || '').split('\n')[0]);
}

// 3) 已存在且无 --force → 拒绝
{
    const t = tmpOut();
    run(['--name', 'f99-z', '--batch', 'B-99', '--faces', 'A:1', '--out', t.out]);
    const r = run(['--name', 'f99-z', '--batch', 'B-99', '--faces', 'A:1', '--out', t.out]);
    check('refuses to overwrite', r.status === 1 && /refusing to overwrite/.test(r.stdout), r.stdout.trim());
}

// 4) --dry-run 不落盘
{
    const t = tmpOut();
    const r = run(['--name', 'f99-d', '--batch', 'B-99', '--faces', 'A:1', '--out', t.out, '--dry-run']);
    check('dry run prints only', r.status === 0 && !fs.existsSync(t.out) && /H\.create\(/.test(r.stdout), 'no file');
}

// 5) 缺 --name → exit 2
{
    const r = run(['--batch', 'B-99']);
    check('missing --name exits 2', r.status === 2 && /usage/.test(r.stdout), r.stdout.trim());
}

const bad = results.filter((r) => !r.ok);
console.log('selftest-genwindow: ' + (results.length - bad.length) + '/' + results.length);
process.exit(bad.length ? 1 : 0);
