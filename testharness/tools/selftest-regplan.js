#!/usr/bin/env node
/* selftest-regression-plan.js — 临时仓库验证回归覆盖表的生成与 --check 新鲜度。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'regression-plan.js');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}
function run(root, args) {
    const r = spawnSync('node', [TOOL, ...(args || [])], {
        encoding: 'utf8',
        env: { ...process.env, REG_REPO: root },
    });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'reg-'));
const src = path.join(root, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
const player = path.join(root, 'testharness', 'player');
const reports = path.join(root, 'testharness', 'reports');
fs.mkdirSync(src, { recursive: true });
fs.mkdirSync(player, { recursive: true });
fs.mkdirSync(reports, { recursive: true });
fs.writeFileSync(path.join(src, 'Demo.java'), 'class Demo { void a() { log("[DemoLog] x=1"); } }\n', 'utf8');
fs.writeFileSync(path.join(player, 'f99-demo-smoke.js'), "const H = require('./lib/harness.js');\nconst RE = /\\[DemoLog\\]/;\n", 'utf8');

const gen = run(root);
const doc = path.join(reports, 'REGRESSION.md');
const body = fs.existsSync(doc) ? fs.readFileSync(doc, 'utf8') : '';
const ok = run(root, ['--check']);

fs.writeFileSync(path.join(player, 'f98-demo2-smoke.js'),
    "const H = require('./lib/harness.js');\nconst RE = /\\[DemoLog\\]/;\n", 'utf8');
const stale = run(root, ['--check']);
run(root);
const fixed = run(root, ['--check']);

check('generated', gen.code === 0 && /coverage=1\/1/.test(gen.out) && /DemoLog/.test(body), gen.out.trim());
check('check-clean', ok.code === 0, 'exit=' + ok.code);
check('stale-detected', stale.code === 1 && /STALE/i.test(stale.out), 'exit=' + stale.code);
check('stale-refresh', fixed.code === 0, 'exit=' + fixed.code);

const pass = results.filter((x) => x.ok).length;
console.log('selftest-regression: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
