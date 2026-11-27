#!/usr/bin/env node
/**
 * run-regression — 依次跑在 harness 上的窗口（B-70TP）。
 *
 * 这是给**会话七**用的回归入口：主会话不代跑判窗。
 * 每个脚本独立起服、独立 `[done]`，任一失败不短路（跑完再汇总），便于一次看全。
 *
 *   node testharness/tools/run-regression.js --list
 *   node testharness/tools/run-regression.js --dry-run
 *   node testharness/tools/run-regression.js                 # 全跑
 *   node testharness/tools/run-regression.js --only f11-b69-smoke.js,f13-b70t9-smoke.js
 *
 * 退出码：0 全过；1 有失败；2 无脚本可跑。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const REPO = process.env.REG_REPO || path.resolve(__dirname, '..', '..');
const PLAYER = path.join(REPO, 'testharness', 'player');
const LOGS = path.join(REPO, 'testharness', 'build-logs');
const TIMEOUT = +(arg('--timeout', '300000')) || 300000;

function harnessScripts() {
    return fs.readdirSync(PLAYER)
        .filter((f) => f.endsWith('.js'))
        .filter((f) => /require\(['"]\.\.?\/lib\/harness/.test(fs.readFileSync(path.join(PLAYER, f), 'utf8')))
        .sort();
}

let scripts = harnessScripts();
const only = arg('--only', '');
if (only) {
    const want = only.split(',').map((s) => s.trim()).filter(Boolean);
    scripts = scripts.filter((s) => want.includes(s));
}

if (argv.includes('--list')) {
    console.log(`[RegLog] scripts=${scripts.length}`);
    for (const s of scripts) console.log(`[RegLog]   ${s}`);
    process.exit(scripts.length ? 0 : 2);
}

if (scripts.length === 0) {
    console.log('[RegLog] no harness scripts selected');
    console.log('[RegLog] verdict NONE');
    process.exit(2);
}

const dry = argv.includes('--dry-run');
console.log(`[RegLog] scripts=${scripts.length} timeout=${TIMEOUT} dry=${dry}`);

const results = [];
for (const s of scripts) {
    const run = 'reg-' + s.replace(/\.js$/, '');
    if (dry) {
        console.log(`[RegLog] DRY ${s} run=${run}`);
        results.push({ script: s, run, ok: null });
        continue;
    }
    const t0 = Date.now();
    const r = spawnSync(process.execPath, [path.join(PLAYER, s)], {
        cwd: REPO,
        env: { ...process.env, RUN: run },
        encoding: 'utf8',
        timeout: TIMEOUT,
        maxBuffer: 64 * 1024 * 1024,
    });
    const out = String(r.stdout || '') + String(r.stderr || '');
    if (!fs.existsSync(LOGS)) fs.mkdirSync(LOGS, { recursive: true });
    fs.writeFileSync(path.join(LOGS, `regression-${run}.out`), out, 'utf8');

    const doneLine = (out.match(/^\[done\]\s*(\{.*\})\s*$/m) || [])[1];
    let done = null;
    try { done = doneLine ? JSON.parse(doneLine) : null; } catch { done = null; }
    const pinOk = /\[PIN\][^\n]*\bok=true\b/.test(out);
    const ok = r.status === 0 && !!done && done.pass === true && pinOk;
    results.push({
        script: s, run, ok, exit: r.status,
        pin: pinOk,
        pass: done ? done.pass : null,
        bad: done ? done.bad : null,
        badKeys: done ? done.badKeys : null,
        secs: Math.round((Date.now() - t0) / 1000),
    });
    console.log(`[RegLog] ${ok ? 'PASS' : 'FAIL'} ${s} exit=${r.status} pin=${pinOk} pass=${done ? done.pass : 'null'} bad=${done ? done.bad : '-'} ${Math.round((Date.now() - t0) / 1000)}s`);
    if (!ok && done && done.badKeys && done.badKeys.length) console.log(`[RegLog]   badKeys=${done.badKeys.join(',')}`);
}

const failed = results.filter((x) => x.ok === false);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
if (!dry) {
    fs.writeFileSync(path.join(LOGS, `regression-${stamp}.json`), JSON.stringify({ at: stamp, results }, null, 2), 'utf8');
}
console.log(`[RegLog] summary total=${results.length} pass=${results.filter((x) => x.ok).length} fail=${failed.length}`);
console.log(`[RegLog] verdict ${dry ? 'DRY' : failed.length ? 'FAIL' : 'PASS'}`);
process.exit(dry ? 0 : failed.length ? 1 : 0);
