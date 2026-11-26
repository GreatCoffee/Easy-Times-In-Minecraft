#!/usr/bin/env node
/**
 * verify-diff 自检（离线，不起服）：造两份最小证据，先要求 MATCH，
 * 再各改一处要求 DIFF 命中特定类别。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'verify-diff.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vd-'));

function tee(name, { rules, mayplace, w3Keys }) {
    const lines = [];
    for (const [rule, n] of Object.entries(rules)) {
        for (let i = 0; i < n; i++) {
            lines.push(`[10:00:0${i % 10}] [Server thread/INFO] [ETIM]: [MountLog] rule=${rule} face=up support=minecraft:stone block=minecraft:torch result=allow pos=1,2,3`);
        }
    }
    for (let i = 0; i < mayplace; i++) {
        lines.push('[10:00:00] [Server thread/INFO] [ETIM]: [MountLog] mayplace block=minecraft:torch face=up result=allow pos=1,2,3');
    }
    lines.push('[10:00:00] [Server thread/INFO] [ETIM]: [W3] ' + JSON.stringify(w3Keys));
    const p = path.join(dir, name);
    fs.writeFileSync(p, lines.join('\n'), 'utf8');
    return p;
}

function driver(name, done) {
    const p = path.join(dir, name);
    fs.writeFileSync(p, [
        '[PIN] sha=AA shaOk=true size=1 sizeOk=true mkOk=true ok=true',
        '[cfg] run blockDebugLog=true',
        '[done] ' + JSON.stringify(done),
    ].join('\n'), 'utf8');
    return p;
}

function run(args) {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

const base = {
    tee: tee('base.out', { rules: { a: 2, b: 1 }, mayplace: 2, w3Keys: { x: true, y: 1, pass: true } }),
    drv: driver('base-driver.log', { run: 'r1', pin: true, w3: true, pass: true, bad: 0 }),
};
const same = {
    tee: tee('same.out', { rules: { a: 2, b: 1 }, mayplace: 2, w3Keys: { x: true, y: 1, pass: true } }),
    drv: driver('same-driver.log', { run: 'r2', pin: true, w3: true, pass: true, bad: 0 }),
};
const drift = {
    tee: tee('drift.out', { rules: { a: 1, c: 1 }, mayplace: 3, w3Keys: { x: false, y: 1, pass: true } }),
    drv: driver('drift-driver.log', { run: 'r3', pin: true, w3: false, pass: false, bad: 1 }),
};

const checks = [];
let failed = 0;

function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

const m = run(['--base', base.tee + ',' + base.drv, '--new', same.tee + ',' + same.drv]);
check('baseline MATCH', m.code === 0 && /verdict MATCH/.test(m.out), m.out.trim().split('\n').pop());

const d = run(['--base', base.tee + ',' + base.drv, '--new', drift.tee + ',' + drift.drv]);
check('drift exits 1', d.code === 1);
check('detects rule only-in-base', /rule only-in-base: b×1/.test(d.out));
check('detects rule only-in-new', /rule only-in-new: c×1/.test(d.out));
check('detects rule count delta', /rule count: a: 2->1/.test(d.out));
check('detects mayplace delta', /mayplace 2 -> 3/.test(d.out));
check('detects W3 key change', /W3 keys .*changed=x/.test(d.out));
check('detects done diff', /done .*"bad":0.* -> .*"bad":1/.test(d.out));

const usage = run(['--base', 'no-such-file.out', '--new', same.tee]);
check('missing file exits 2', usage.code === 2, usage.out.trim().split('\n').pop());

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed} dir=${dir}`);
process.exit(failed === 0 ? 0 : 1);
