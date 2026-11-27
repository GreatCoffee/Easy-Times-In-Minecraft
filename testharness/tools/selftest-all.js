#!/usr/bin/env node
/*
 * selftest-all.js — 跑遍 testharness/tools 下所有 selftest-*.js（除自身），汇总通过率。
 *
 * 用法：node testharness/tools/selftest-all.js [--only <substr>] [--timeout <ms>]
 * 退出码：0 = 全通过，1 = 有失败。
 * preflight 第 19 步使用；单次要 ~20 s（不起服务端）。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const only = (() => {
    const i = process.argv.indexOf('--only');
    return i >= 0 ? process.argv[i + 1] : null;
})();
const timeoutArg = (() => {
    const i = process.argv.indexOf('--timeout');
    return i >= 0 ? +process.argv[i + 1] : 90000;
})();

const files = fs.readdirSync(DIR)
    .filter((f) => /^selftest-.*\.js$/.test(f) && f !== 'selftest-all.js')
    .sort();
const targets = only ? files.filter((f) => f.includes(only)) : files;

const rows = [];
for (const f of targets) {
    const started = Date.now();
    const r = spawnSync('node', [path.join(DIR, f)], {
        encoding: 'utf8',
        timeout: timeoutArg,
        env: { ...process.env },
    });
    const out = (r.stdout || '') + (r.stderr || '');
    const m = /selftest-[a-z]+: (\d+)\/(\d+)/i.exec(out);
    const ok = (r.status === 0) && (!m || m[1] === m[2]);
    rows.push({
        file: f,
        ok,
        ratio: m ? m[1] + '/' + m[2] : (r.status === 0 ? 'ok' : 'exit=' + r.status),
        ms: Date.now() - started,
    });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + f + ' ' + rows[rows.length - 1].ratio
        + ' (' + rows[rows.length - 1].ms + ' ms)');
    if (!ok) {
        const tail = out.trim().split('\n').slice(-24).join('\n');
        console.log(tail);
    }
}

const pass = rows.filter((r) => r.ok).length;
const failed = rows.filter((r) => !r.ok).map((r) => r.file);
console.log('[SelftestLog] files=' + rows.length + ' pass=' + pass + ' fail=' + failed.length
    + (failed.length ? ' failed=' + failed.join(',') : ''));
console.log('[SelftestLog] verdict ' + (failed.length === 0 ? 'OK' : 'FAIL'));
process.exit(failed.length === 0 ? 0 : 1);
