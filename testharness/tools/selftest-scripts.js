#!/usr/bin/env node
/* selftest-scripts.js — 临时仓库验证 index-scripts 生成与 check-scripts 指纹棘轮。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const INDEXER = path.join(__dirname, 'index-scripts.js');
const CHECK = path.join(__dirname, 'check-scripts.js');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}
function run(tool, args) {
    const r = spawnSync('node', [tool, ...(args || [])], { encoding: 'utf8', env: { ...process.env } });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'scr-'));
const player = path.join(root, 'testharness', 'player');
fs.mkdirSync(player, { recursive: true });
const script = path.join(player, 'f11-demo-smoke.js');
fs.writeFileSync(script, [
    '// B-1 demo smoke — asserts [DemoLog] rows.',
    "const A = 'ETIM_F7';",
    "console.log('[DemoLog] x=1');",
].join('\n'), 'utf8');

process.env.SCRIPTS_REPO = root;
const gen = run(INDEXER);
const ok = run(CHECK);
const index = path.join(player, 'INDEX.md');
const hasRows = fs.existsSync(index) && /f11-demo-smoke\.js/.test(fs.readFileSync(index, 'utf8'));

fs.appendFileSync(script, '\n// drift\n', 'utf8');
const stale = run(CHECK);
run(INDEXER);
const fixed = run(CHECK);

check('index-generated', gen.code === 0 && hasRows, 'exit=' + gen.code);
check('check-clean', ok.code === 0, 'exit=' + ok.code);
check('stale-detected', stale.code === 1 && /stale/i.test(stale.out), 'exit=' + stale.code);
check('stale-refresh', fixed.code === 0, 'exit=' + fixed.code);

const pass = results.filter((x) => x.ok).length;
console.log('selftest-scripts: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
