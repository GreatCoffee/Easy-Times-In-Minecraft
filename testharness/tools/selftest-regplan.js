#!/usr/bin/env node
/* selftest-regression-plan.js — 临时仓库验证回归覆盖表的生成、新鲜度与豁免棘轮。 */
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
function run(root, args, exemptFile) {
    const env = { ...process.env, REG_REPO: root };
    if (exemptFile) env.REG_EXEMPT = exemptFile;
    else delete env.REG_EXEMPT;
    const r = spawnSync('node', [TOOL, ...(args || [])], { encoding: 'utf8', env });
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

const exemptFile = path.join(root, 'exempt.json');
const emptyExempt = path.join(root, 'exempt-empty.json');
fs.writeFileSync(emptyExempt, JSON.stringify({ channels: {} }), 'utf8');
const doc = path.join(reports, 'REGRESSION.md');

// 1. baseline: everything covered
const gen = run(root, [], emptyExempt);
const body = fs.readFileSync(doc, 'utf8');
const ok = run(root, ['--check'], emptyExempt);
check('generated', gen.code === 0 && /coverage=1\/1/.test(gen.out) && /DemoLog/.test(body), gen.out.trim());
check('check-clean', ok.code === 0, 'exit=' + ok.code);

// 2. a new producer without a consumer is an unexplained gap
fs.writeFileSync(path.join(src, 'Orphan.java'), 'class Orphan { void b() { log("[OrphanLog] y=2"); } }\n', 'utf8');
const unexplainedGen = run(root, [], emptyExempt);
const unexplainedCheck = run(root, ['--check'], emptyExempt);
check('unexplained-fails', unexplainedGen.code === 1 && /UNEXPLAINED OrphanLog/.test(unexplainedGen.out), 'exit=' + unexplainedGen.code);
check('unexplained-check-fails', unexplainedCheck.code === 1, 'exit=' + unexplainedCheck.code);

// 3. registering a reason clears it
fs.writeFileSync(exemptFile, JSON.stringify({ channels: { OrphanLog: 'client-only, see docs' } }), 'utf8');
const exemptGen = run(root, [], exemptFile);
const exemptCheck = run(root, ['--check'], exemptFile);
check('exempt-passes', exemptGen.code === 0 && /exempt=1 unexplained=0/.test(exemptGen.out), exemptGen.out.trim());
check('exempt-check-clean', exemptCheck.code === 0, 'exit=' + exemptCheck.code);
check('exempt-rendered', /结构上不可覆盖/.test(fs.readFileSync(doc, 'utf8')) && /EXEMPT/.test(fs.readFileSync(doc, 'utf8')), '');

// 4. a stale exemption key fails (channel covered or gone)
fs.writeFileSync(exemptFile, JSON.stringify({ channels: { OrphanLog: 'client-only', GhostLog: 'gone' } }), 'utf8');
const staleGen = run(root, [], exemptFile);
check('stale-exempt-fails', staleGen.code === 1 && /STALE-EXEMPT GhostLog/.test(staleGen.out), 'exit=' + staleGen.code);

// 5. stale doc still detected
fs.writeFileSync(exemptFile, JSON.stringify({ channels: { OrphanLog: 'client-only' } }), 'utf8');
run(root, [], exemptFile);
fs.appendFileSync(doc, '\nstale\n');
const staleDoc = run(root, ['--check'], exemptFile);
check('stale-doc-fails', staleDoc.code === 1 && /STALE/.test(staleDoc.out), 'exit=' + staleDoc.code);

const pass = results.filter((x) => x.ok).length;
console.log('selftest-regression: ' + pass + '/' + results.length);
fs.rmSync(root, { recursive: true, force: true });
process.exit(pass === results.length ? 0 : 1);
