#!/usr/bin/env node
/* selftest-harness.js — 临时 player 目录验证 check-harness 的「上 harness / 自管脚手架」判定。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'check-harness.js');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}
function run(dir, args) {
    const r = spawnSync('node', [TOOL, ...(args || [])], {
        encoding: 'utf8',
        env: { ...process.env, HARNESS_PLAYER: dir },
    });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'harn-'));
fs.writeFileSync(path.join(dir, 'good.js'), [
    "const H = require('./lib/harness.js');",
    "const h = H.create({ run: 'x', bot: 'A' });",
    'async function main() { await h.boot(); await h.stop(); h.finish({ w1: true }); }',
    'h.guard(main);',
].join('\n'), 'utf8');
fs.writeFileSync(path.join(dir, 'bad.js'), [
    "const L = require('./f7-wb-lib.js');",
    'async function startBoot(tag) { return L.startServer({ root: 1, tag }); }',
    'async function stopBoot() { return 0; }',
    "async function main() { await startBoot('t'); await stopBoot(); }",
    'main();',
].join('\n'), 'utf8');

const clean = run(dir);
fs.rmSync(path.join(dir, 'bad.js'));
const after = run(dir);

const field = (out, k) => {
    const m = new RegExp(k + '=(\\d+)').exec(out);
    return m ? +m[1] : -1;
};
check('detects-own-boot',
    field(clean.out, 'files') === 2 && field(clean.out, 'onHarness') === 1
    && field(clean.out, 'ownBoot') === 1 && field(clean.out, 'offenders') === 1,
    clean.out.trim());
check('clean-after-fix',
    field(after.out, 'files') === 1 && field(after.out, 'onHarness') === 1
    && field(after.out, 'ownBoot') === 0 && field(after.out, 'offenders') === 0,
    after.out.trim());

const pass = results.filter((x) => x.ok).length;
console.log('selftest-harness: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
