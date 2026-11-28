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
const { execFileSync, spawnSync } = require('child_process');
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

// B-70UF: the hook must never accept code that does not compile or breaks a
// unit test. `gradlew test` compiles main + test and runs every @Test.
// PREFLIGHT_SKIP_GRADLE=1 is for CI, which runs the same command itself.
function gradleStep() {
    if (process.env.PREFLIGHT_SKIP_GRADLE === '1') {
        console.log('[PreflightLog] step=gradle code=-1 verdict=SKIP PREFLIGHT_SKIP_GRADLE=1');
        return;
    }
    const win = process.platform === 'win32';
    const exe = win ? 'cmd.exe' : path.join('.', 'gradlew');
    const args = win ? ['/d', '/s', '/c', 'gradlew.bat test --console=plain -q'] : ['test', '--console=plain', '-q'];
    if (!fs.existsSync(path.join(ROOT, win ? 'gradlew.bat' : 'gradlew'))) {
        console.log('[PreflightLog] step=gradle code=-1 verdict=SKIP gradlew absent');
        return;
    }
    // RetroFuturaGradle needs JDK 25. A git hook inherits the user's JAVA_HOME,
    // which may be an older JDK (21 here) — so validate the major version and
    // fall through to the workspace-local JDK named in AGENTS.md.
    const env = { ...process.env };
    function javaMajor(home) {
        try {
            const r = spawnSync(path.join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'), ['-version'], { encoding: 'utf8' });
            const text = (r.stderr || '') + (r.stdout || '');
            const m = /version "(\d+)(?:\.(\d+))?/.exec(text);
            if (!m) return 0;
            return +m[1] === 1 ? +(m[2] || 0) : +m[1];
        } catch { return 0; }
    }
    const local = [];
    for (const base of [path.resolve(ROOT, '..', '..', 'jdk'), path.resolve(ROOT, '..', 'jdk')]) {
        try {
            for (const d of fs.readdirSync(base)) {
                if (/jdk-?25|zulu25/i.test(d)) local.push(path.join(base, d));
            }
        } catch { /* absent */ }
    }
    const tried = [process.env.ETIM_JDK_HOME, process.env.JAVA_HOME, ...local].filter(Boolean);
    let jdkFrom = 'none';
    for (const home of tried) {
        if (javaMajor(home) >= 25) {
            env.JAVA_HOME = home;
            jdkFrom = home === process.env.ETIM_JDK_HOME ? 'etim-env' : home === process.env.JAVA_HOME ? 'env' : 'local';
            break;
        }
    }
    if (jdkFrom === 'none' && process.env.JAVA_HOME) { env.JAVA_HOME = process.env.JAVA_HOME; }
    const started = Date.now();
    let code = 0;
    let out = '';
    try {
        out = execFileSync(exe, args, {
            cwd: ROOT,
            encoding: 'utf8',
            env,
            timeout: 170000,
            maxBuffer: 8 * 1024 * 1024,
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (e) {
        code = typeof e.status === 'number' ? e.status : 1;
        out = (e.stdout || '') + (e.stderr || '');
    }
    const elapsed = Date.now() - started;

    // JUnit XML is the stable source of counts; gradle console output varies.
    let tests = 0, failures = 0, errors = 0;
    const resDir = path.join(ROOT, 'build', 'test-results', 'test');
    try {
        for (const f of fs.readdirSync(resDir)) {
            if (!f.endsWith('.xml')) continue;
            const head = fs.readFileSync(path.join(resDir, f), 'utf8').slice(0, 4000);
            const m = /tests="(\d+)"[^>]*?skipped="\d+"[^>]*?failures="(\d+)"[^>]*?errors="(\d+)"/.exec(head)
                || /tests="(\d+)"[^>]*?failures="(\d+)"[^>]*?errors="(\d+)"/.exec(head);
            if (m) {
                tests += +m[1];
                failures += +m[2];
                errors += +m[3];
            }
        }
    } catch { /* first run before any test */ }

    const bad = code !== 0 || failures > 0 || errors > 0;
    const detail = bad && code !== 0
        ? `[GradleLog] build=FAILED code=${code} mode=test jdk=${jdkFrom} elapsedMs=${elapsed}`
        : `[GradleLog] tests=${tests} failures=${failures} errors=${errors} mode=test jdk=${jdkFrom} elapsedMs=${elapsed}`;
    steps.push({ name: 'gradle', code, bad, detail });
    console.log(`[PreflightLog] step=gradle code=${code} verdict=${bad ? 'RISK' : 'OK'} ${detail}`);
    if (bad) {
        const tailLines = out.split(/\r?\n/).filter((s) => /error:|FAILED|BUILD FAILED|Execution failed/.test(s)).slice(0, 5);
        for (const l of tailLines) console.log('[PreflightLog] gradle: ' + l.trim());
    }
}

step('books', 'check-books.js', [], (c) => c !== 0, '[LedgerLog]');
gradleStep();
// B-70US: the PIN line must equal the jar on disk. A stale PIN only
// surfaces at window time (a whole wasted run); catch it at commit time.
step('pin', 'set-pin.js', ['--check'], (c) => c !== 0, '[PinLog]');
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
// B-70TQ: models/textures/lang/blockstates must agree; a raw `item.etim.x.name`
// in a tooltip is a player-visible defect, same class as a missing texture.
step('assets', 'check-assets.js', [], (c) => c !== 0, '[AssetLog]');
// B-70TR: legacy windows are archived with a reason; the manifest must not rot.
step('archive', 'check-channels.js', ['--check-archive'], (c) => c !== 0, '[ChannelLog]');
step('values', 'extract-values.js', ['--all', '--check'], (c) => c !== 0, '[ValuesLog]');
step('reports', 'check-reports.js', [], (c) => c !== 0, '[ReportLog]');
// B-70UE: a landed census face whose carrier has no `[XxxLog]` is invisible to
// the regression net. Baseline ratchet: new silent faces fail, drops are noted.
step('coverage', 'check-coverage.js', ['--check'], (c) => c !== 0, '[CoverageLog]');
// B-70UL: docs/CONFIG.md is generated from ETIMConfig.java; every config key
// must carry javadoc, and the checked-in doc must match the source.
step('configdoc', 'gen-config-doc.js', ['--check'], (c) => c !== 0, '[ConfigDocLog]');
// B-70UM: docs/CHANNELS.md lists every judgement channel with its gate,
// producers, /etest drivers and asserting scripts. Adding a channel without
// regenerating is a red preflight.
step('chandoc', 'gen-channel-doc.js', ['--check'], (c) => c !== 0, '[ChanDocLog]');
// B-70UO: docs/PIPELINE.md is prose, so it cannot be generated — but it must
// name every tool and every preflight step, or a newcomer reads a stale map.
step('pipeline', 'check-pipeline-doc.js', [], (c) => c !== 0, '[PipelineLog]');
// B-70VG: selftest-all runs the selftests that exist; nothing forced a new
// tool to have one. This ratchet makes that a red preflight.
step('toolcov', 'check-tool-selftests.js', [], (c) => c !== 0, '[ToolsLog]');
step('tools', 'selftest-all.js', [], (c) => c !== 0, '[SelftestLog]');
// B-70UR: run/ worlds and build-logs grow every window. retention.js keeps the
// newest N per prefix, never moves a log that a report cites, and ratchets the
// total so growth is a decision, not an accident.
step('retention', 'retention.js', ['--check'], (c) => c !== 0, '[RetentionLog]');
// B-70UR: check-coverage says "this face has a channel"; face-assert says
// "this script asserts it". A face whose channel nobody asserts cannot go red.
step('assert', 'face-assert.js', ['--check'], (c) => c !== 0, '[AssertLog]');
// B-70UX: a window's regexes are only proven by running them. Replay every
// driver regex against the newest tees so a dead pattern (wrong field name,
// space-splitting capture) fails here instead of in the judge window.
step('asserts', 'check-asserts.js', [], (c) => c !== 0, '[AssertLog]');
// B-70UY: the comparison report is where 会话六 spends its day. Drafts keep
// those inputs on one page; a stale draft is worse than none.
step('draft', 'gen-report.js', ['--check-dir'], (c) => c !== 0, '[DraftLog]');
// B-70UZ: the three paper documents (comparison / verdict / receipt) are what
// the next session reads. Shape drift is how a batch gets re-opened.
step('shape', 'check-report-shape.js', [], (c) => c !== 0, '[ShapeLog]');
step('consist', 'check-batch-consistency.js', ['--all'], (c) => c !== 0, '[ConsistLog]');
// B-70VA: a class that carries pure logic and gains no test is how the
// "92 seconds to notice" cost creeps back. Existing gaps are frozen.
step('tests', 'check-tests.js', [], (c) => c !== 0, '[TestsLog]');

const bad = steps.filter((s) => s.bad);
console.log(`[PreflightLog] summary steps=${steps.length} risk=${bad.length} verdict=${bad.length ? 'FAIL' : 'PASS'}`);
if (bad.length) {
    for (const s of bad) {
        console.log(`[PreflightLog] fix ${s.name}: ${s.detail}`);
    }
    process.exit(1);
}
