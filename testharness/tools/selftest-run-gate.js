#!/usr/bin/env node
/** run-gate 自检：清单 / 计划缺失 / dry-run / 报告合成 / [done] 解析 / tee 命名。不启动服务端。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'run-gate.js');
const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}
function run(args, env) {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...args], {
            encoding: 'utf8', env: Object.assign({}, process.env, env || {}),
        });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
const planFile = path.join(root, 'plan.json');
fs.writeFileSync(planFile, JSON.stringify({
    _comment: 'fixture',
    'B-99': { scripts: ['testharness/player/f99-demo.js'], base: 'b66-x-b1.out', modes: ['arms'] },
}), 'utf8');
const env = { GATE_PLAN: planFile };

// 1) list
const r1 = run(['--list'], env);
check('list shows planned batches', r1.code === 0 && /batches=1 .*B-99/.test(r1.out), r1.out.trim().split('\n').pop());

// 2) unknown batch → exit 2
const r2 = run(['B-98'], env);
check('unknown batch refused', r2.code === 2 && /no gate-plan entry for B-98/.test(r2.out), r2.out.trim().split('\n').pop());

// 3) dry-run prints the window it would run, without touching servers
const r3 = run(['B-99', '--dry-run'], env);
check('dry-run prints planned window', r3.code === 0 && /would run: RUN=b99r1 node testharness\/player\/f99-demo\.js/.test(r3.out), r3.out.trim().split('\n').pop());

// 4) dry-run with --run/--base honoured
const r4 = run(['B-99', '--dry-run', '--run', 'rr9', '--base', 'b1.out'], env);
check('dry-run honours run/base', r4.code === 0 && /RUN=rr9/.test(r4.out) && /base=b1\.out/.test(r4.out));

// 5) composeReport + parseDone + teeOf (pure functions)
const G = require(TOOL);
const done = G.parseDone('noise\n[done] {"run":"x","pass":true,"bad":0,"badKeys":[],"w1":true}\ntrailer');
check('parseDone reads the object', !!done && done.pass === true && done.bad === 0);
check('parseDone rejects garbage', G.parseDone('no done here') === null);

const teeName = path.basename(G.teeOf('testharness/player/f15-reg-chains.js', 'b70tyr1'));
check('teeOf derives family prefix', teeName === 'f15-b70tyr1-b1.out', teeName);

const md = G.composeReport({
    batch: 'B-99', run: 'r1', pin: 'x-build1', pinMatch: true,
    windows: [{ script: 'a.js', run: 'r1', code: 0, pass: true, bad: 0, tee: path.join(root, 'f00-r1-b1.out') }],
    diffs: [{ mode: 'arms', base: 'f00-base-b1.out', tee: 'f00-r1-b1.out', verdict: 'MATCH' }],
    fails: [], ok: true,
});
check('report has verdict PASS + table rows', /## 机器判定/.test(md) && /\*\*PASS\*\*/.test(md) && /\| arms \|/.test(md), md.split('\n').slice(-2)[0]);

const mdBad = G.composeReport({
    batch: 'B-99', run: 'r1', pin: 'x-build1', pinMatch: false,
    windows: [], diffs: [], fails: ['pin mismatch'], ok: false,
});
check('report shows FAIL reasons', /\*\*FAIL\*\*/.test(mdBad) && /pin mismatch/.test(mdBad));

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
