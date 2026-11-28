#!/usr/bin/env node
/**
 * 判窗一键化（B-70VK）——把「起服跑窗 → 对位 → 回执草稿」压成一条命令。
 *
 * 用法（由会话七执行；主会话只做 --dry-run 与自检）：
 *   node testharness/tools/run-gate.js B-71
 *   node testharness/tools/run-gate.js B-71 --run b71r2 --base b69-b70t4-r2-b1.out
 *   node testharness/tools/run-gate.js B-71 --dry-run
 *
 * 批次 → 窗口脚本 的对应写在 gate-plan.json（缺条目直接报错，不猜）。
 * 判定：钉值必须 match；每个窗口脚本必须打出 [done] 且 pass=true、bad=0；
 *       arms/values 对位必须 MATCH（gate-plan 里 modes 决定跑哪几种）。
 * 产物：testharness/reports/<slug>-gate-report.md（草稿；正式回执仍由会话七落盘）。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const LOGS = path.join(REPO, 'testharness', 'build-logs');
const REPORTS = path.join(REPO, 'testharness', 'reports');
const PLAN = process.env.GATE_PLAN || path.join(__dirname, 'gate-plan.json');

function arg(name, def) {
    const i = process.argv.indexOf('--' + name);
    return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const flag = (name) => process.argv.includes('--' + name);

function slugOf(batch) {
    return batch.toLowerCase().replace(/^b-/, 'b');
}

/** 窗口脚本 → tee 家族前缀（f15-reg-chains.js → f15）。 */
function teeOf(script, runName) {
    const family = path.basename(script).split('-')[0];
    return LOGS + path.sep + family + '-' + runName + '-b1.out';
}

function parseDone(text) {
    const m = String(text).match(/^\[done\] (\{.*\})\s*$/m);
    if (!m) return null;
    try { return JSON.parse(m[1]); } catch (e) { return null; }
}

function parsePin(text) {
    const m = String(text).match(/current pin=(\S+) match=(true|false)/);
    return m ? { pin: m[1], match: m[2] === 'true' } : { pin: null, match: false };
}

function runNode(file, args, env) {
    const r = spawnSync(process.execPath, [file].concat(args || []), {
        cwd: REPO, encoding: 'utf8', env: Object.assign({}, process.env, env || {}),
    });
    return { code: r.status === null ? 1 : r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}

function composeReport(ctx) {
    const L = [];
    L.push('# ' + ctx.batch + ' 判窗机器报告（草稿）');
    L.push('');
    L.push('- 生成：`testharness/tools/run-gate.js`（B-70VK）；正式回执仍由会话七落盘。');
    L.push('- 钉值：`' + ctx.pin + '`（match=' + ctx.pinMatch + '）');
    L.push('- 批次：`' + ctx.batch + '`；RUN 前缀 `' + ctx.run + '`');
    L.push('');
    L.push('## 窗口');
    L.push('');
    L.push('| 脚本 | RUN | exit | pass | bad | tee |');
    L.push('| --- | --- | --- | --- | --- | --- |');
    for (const w of ctx.windows) {
        L.push('| `' + w.script + '` | `' + w.run + '` | ' + w.code + ' | ' + w.pass + ' | ' + w.bad + ' | `' + path.basename(w.tee) + '` |');
    }
    L.push('');
    L.push('## 对位');
    L.push('');
    L.push('| 模式 | base | new | 结论 |');
    L.push('| --- | --- | --- | --- |');
    for (const d of ctx.diffs) {
        L.push('| ' + d.mode + ' | `' + path.basename(d.base) + '` | `' + path.basename(d.tee) + '` | ' + d.verdict + ' |');
    }
    if (!ctx.diffs.length) L.push('| （未配置对位） | — | — | — |');
    L.push('');
    L.push('## 机器判定');
    L.push('');
    L.push('- ' + (ctx.ok ? '**PASS**（钉值 match、窗口全绿、对位全 MATCH）' : '**FAIL**：' + ctx.fails.join('；')));
    L.push('');
    return L.join('\n');
}

function main() {
    const batch = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
    const dry = flag('dry-run');
    const plan = fs.existsSync(PLAN) ? JSON.parse(fs.readFileSync(PLAN, 'utf8')) : {};

    if (flag('list') || !batch) {
        const keys = Object.keys(plan).filter((k) => !k.startsWith('_'));
        console.log('[GateLog] plan=' + PLAN + ' batches=' + keys.length + ' ' + keys.join(','));
        return 0;
    }

    const p = plan[batch];
    if (!p || !Array.isArray(p.scripts) || !p.scripts.length) {
        console.log('[GateLog] FAIL no gate-plan entry for ' + batch + ' (add it to testharness/tools/gate-plan.json)');
        return 2;
    }

    const runPrefix = arg('run', slugOf(batch) + 'r1');
    const base = arg('base', p.base || '');
    const scripts = (arg('scripts', '') || '').split(',').filter(Boolean).length
        ? arg('scripts', '').split(',').filter(Boolean)
        : p.scripts;
    const modes = (p.modes && p.modes.length ? p.modes : ['arms']);

    const windows = scripts.map((s, i) => ({
        script: s,
        run: scripts.length > 1 ? runPrefix + '-' + (i + 1) : runPrefix,
        code: null, pass: false, bad: null,
        tee: teeOf(s, scripts.length > 1 ? runPrefix + '-' + (i + 1) : runPrefix),
    }));

    if (dry) {
        console.log('[GateLog] dry-run batch=' + batch + ' pin=? base=' + (base || '(none)') + ' modes=' + modes.join('+'));
        for (const w of windows) console.log('[GateLog] would run: RUN=' + w.run + ' node ' + w.script + ' → tee ' + path.basename(w.tee));
        return 0;
    }

    const fails = [];
    const pinRes = runNode(path.join(__dirname, 'set-pin.js'), ['--check']);
    const pin = parsePin(pinRes.out);
    for (const line of pinRes.out.split(/\r?\n/)) if (/\[PinLog\]/.test(line)) console.log(line.trim());
    if (!pin.match) fails.push('pin mismatch (`' + pin.pin + '`)');

    for (const w of windows) {
        const r = runNode(path.join(REPO, w.script), [], { RUN: w.run });
        const done = parseDone(r.out);
        w.code = r.code;
        w.pass = !!(done && done.pass === true);
        w.bad = done && Array.isArray(done.badKeys) ? done.badKeys.length : (done ? done.bad : null);
        console.log('[GateLog] window ' + path.basename(w.script) + ' run=' + w.run + ' exit=' + r.code +
            ' pass=' + w.pass + ' bad=' + w.bad + ' tee=' + path.basename(w.tee));
        if (!done) fails.push(path.basename(w.script) + ': no [done] line');
        else if (!w.pass) fails.push(path.basename(w.script) + ': pass=false bad=' + JSON.stringify(done.badKeys || null));
        else if (r.code !== 0) fails.push(path.basename(w.script) + ': exit ' + r.code);
    }

    const diffs = [];
    if (base) {
        for (const w of windows) {
            if (!fs.existsSync(w.tee)) { fails.push('missing tee ' + path.basename(w.tee)); continue; }
            for (const mode of modes) {
                const d = runNode(path.join(__dirname, 'verify-diff.js'), ['--mode=' + mode, '--base=' + base, '--new=' + w.tee]);
                const verdict = /verdict (MATCH|DIFF)/.exec(d.out);
                const v = verdict ? verdict[1] : 'ERROR';
                diffs.push({ mode, base: path.join(LOGS, base), tee: w.tee, verdict: v });
                console.log('[GateLog] diff ' + mode + ' base=' + base + ' new=' + path.basename(w.tee) + ' → ' + v);
                if (v !== 'MATCH') fails.push('diff ' + mode + ' ' + path.basename(w.tee) + ' ' + v);
            }
        }
    }

    const ctx = { batch, run: runPrefix, pin: pin.pin, pinMatch: pin.match, windows, diffs, fails, ok: fails.length === 0 };
    const text = composeReport(ctx);
    fs.mkdirSync(REPORTS, { recursive: true });
    const out = path.join(REPORTS, slugOf(batch) + '-gate-report.md');
    fs.writeFileSync(out, text, 'utf8');
    console.log('[GateLog] report ' + out);
    console.log('[GateLog] verdict ' + (ctx.ok ? 'PASS' : 'FAIL') + ' fails=' + fails.length + (fails.length ? ' ' + fails.join(' | ') : ''));
    return ctx.ok ? 0 : 1;
}

if (require.main === module) process.exit(main());

module.exports = { teeOf, parseDone, parsePin, composeReport, slugOf };
