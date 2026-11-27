#!/usr/bin/env node
/**
 * Preflight: run every read-only self-check in one shot before opening a window.
 *
 *   node testharness/tools/preflight.js
 *
 * Each step is the very tool that owns that rule; this file only aggregates
 * verdicts so nobody has to remember six commands. Exit 0 = all clear,
 * 1 = at least one risk (the step is named in the output).
 *
 * Steps:
 *   books    census arithmetic, ledger duplicate/ skipped entry numbers
 *   config   ETIMConfig field <-> key bijection, defaults, ranges
 *   disk-cfg run/config/etim.cfg vs code defaults (drift / stale / missing)
 *   channels [XxxLog] producers, cfg gates, script forcing
 *   harness  scaffolding trend (report only, never fails)
 *   driver   window-driver templates: boot/PIN, mark before use, explicit
 *            player on console seeds, gamerule prerequisites
 *   scripts  testharness/player/INDEX.md freshness (regenerate with
 *            node testharness/tools/index-scripts.js)
 *   closeout newest ledger entry vs git (stale 待提交 / dead hash /
 *            missing sessions section / push-state mismatch)
 *   faces    census landed rows resolve to today's ETIM sources
 *   ready    census 剩余-就绪度.md freshness (regenerate with
 *            node testharness/tools/face-readiness.js)
 *   plan     census 批次工单.md freshness (regenerate with
 *            node testharness/tools/plan-batches.js)
 *   regression  testharness/reports/REGRESSION.md freshness (regenerate with
 *            node testharness/tools/regression-plan.js)
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const TOOLS = path.join(ROOT, 'testharness', 'tools');

/** Run one tool; returns { code, out }. */
function run(script, args) {
    try {
        const out = execFileSync(process.execPath, [path.join(TOOLS, script), ...args], {
            encoding: 'utf8',
            cwd: ROOT,
        });
        return { code: 0, out };
    } catch (e) {
        return { code: typeof e.status === 'number' ? e.status : 1, out: (e.stdout || '') + (e.stderr || '') };
    }
}

/** Last line the tool printed under `[Tag]`, trimmed. */
function tail(out, tag) {
    const rows = out.split(/\r?\n/).filter((s) => s.startsWith(tag));
    return rows.length ? rows[rows.length - 1].trim() : '(no output)';
}

const steps = [];
function step(name, script, args, risk, tag) {
    const r = run(script, args);
    const detail = tail(r.out, tag);
    const bad = risk(r.code);
    steps.push({ name, code: r.code, bad, detail });
    console.log(`[PreflightLog] step=${name} code=${r.code} verdict=${bad ? 'RISK' : 'OK'} ${detail}`);
}

const cfgFile = path.join(ROOT, 'run', 'config', 'etim.cfg');
const haveCfg = fs.existsSync(cfgFile);

step('books', 'check-books.js', [], (c) => c !== 0, '[LedgerLog]');
step('config', 'check-config.js', [], (c) => c !== 0, '[ConfigLog]');
if (haveCfg) {
    // exit 2 = DRIFT: the on-disk file disagrees with the code defaults.
    step('disk-cfg', 'check-config.js', ['--file', path.join('run', 'config', 'etim.cfg')], (c) => c !== 0, '[ConfigLog]');
} else {
    console.log('[PreflightLog] step=disk-cfg code=-1 verdict=SKIP run/config/etim.cfg absent (first boot writes it)');
}
step('channels', 'check-channels.js', [], (c) => c !== 0, '[ChannelLog]');
step('harness', 'check-harness.js', [], () => false, '[HarnessLog]');
// B-70TA: the four driver defects that cost B-70T8/T9 ten B-items.
step('driver', 'check-driver.js', [], (c) => c !== 0, '[DriverLog]');
// B-70TB: INDEX.md is the retrieval surface for 450 windows; it must not rot.
step('scripts', 'check-scripts.js', [], (c) => c !== 0, '[ScriptLog]');
// B-70TF: the four closeout mistakes that actually happened (条 353 / 414).
step('closeout', 'check-closeout.js', [], (c) => c !== 0, '[CloseoutLog]');

// census「已落地」面的 ETIM位 指针必须在今天的代码里仍然成立（B-70TH）。
// CI 只克隆 mod 仓库，缺少 playground/ 时工具自行 SKIP 并 exit 0。
step('faces', 'check-faces.js', [], (c) => c !== 0, '[FaceLog]');
step('ready', 'face-readiness.js', ['--check'], (c) => c !== 0, '[ReadyLog]');
step('plan', 'plan-batches.js', ['--check'], (c) => c !== 0, '[PlanLog]');
step('regression', 'regression-plan.js', ['--check'], (c) => c !== 0, '[RegLog]');

const bad = steps.filter((s) => s.bad);
console.log(`[PreflightLog] summary steps=${steps.length} risk=${bad.length} verdict=${bad.length ? 'FAIL' : 'PASS'}`);
if (bad.length) {
    for (const s of bad) {
        console.log(`[PreflightLog] fix ${s.name}: ${s.detail}`);
    }
    process.exit(1);
}
