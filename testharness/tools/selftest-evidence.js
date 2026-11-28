#!/usr/bin/env node
/* selftest-evidence.js — check-evidence.js 的六项自检（B-70VH） */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-evidence.js');
const results = [];
const tmpDirs = [];

function run(env) {
    const r = spawnSync('node', [TOOL], { encoding: 'utf8', env: { ...process.env, ...env } });
    return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function tree(files) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ev-'));
    tmpDirs.push(root);
    const reports = path.join(root, 'reports');
    const logs = path.join(root, 'logs');
    fs.mkdirSync(reports);
    fs.mkdirSync(logs);
    for (const [rel, body] of Object.entries(files)) {
        const full = path.join(rel.startsWith('logs/') ? logs : reports, rel.replace(/^logs\//, ''));
        fs.writeFileSync(full, body);
    }
    return {
        env: {
            EVIDENCE_REPORTS: reports,
            EVIDENCE_LOGS: logs,
            EVIDENCE_BASELINE: path.join(root, 'baseline.json'),
        },
        reports,
        logs,
    };
}

function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}

const tee = [
    '[12:00:00] [Server thread/INFO]: Done (5.101s)!',
    '[12:00:01] [Server thread/INFO]: [MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4 [server]',
    '[12:00:02] [Server thread/INFO]: BUILD SUCCESSFUL in 34s',
    '',
].join('\n');
const driverOk = '[PIN] sha=37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2 shaOk=true\n[done] {"run":"r1","pin":true,"w1":true,"stops":0,"pass":true,"bad":0}\n';

function doc(body) {
    return '# 回执\n\n```\n' + body + '\n```\n';
}

// 1) clean
{
    const t = tree({
        'logs/r1-b1.out': tee,
        'logs/r1-driver.log': driverOk,
        'a-verify-receipt.md': doc('002: [MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4 [server]') +
            '\n[done] {"run":"r1","pin":true,"w1":true,"stops":0,"pass":true,"bad":0}\n',
    });
    const r = run(t.env);
    check('clean tree exits 0', r.code === 0, 'code=' + r.code);
}

// 2) bad anchor
{
    const t = tree({
        'logs/r1-b1.out': tee,
        'a-verify-receipt.md': doc('002: [MountLog] rule=totally-other face=up'),
    });
    const r = run(t.env);
    check('dead anchor exits 1', r.code === 1 && r.out.includes('E1 anchor :2'), 'code=' + r.code);
}

// 3) pass lie
{
    const t = tree({
        'logs/r1-b1.out': tee,
        'logs/r1-driver.log': '[done] {"run":"r1","pin":true,"w1":true,"stops":0,"pass":false,"bad":0}\n',
        'a-verify-receipt.md': '[done] {"run":"r1","pin":true,"w1":true,"stops":0,"pass":true,"bad":0}\n',
    });
    const r = run(t.env);
    check('pass lie reported', r.code === 1 && r.out.includes('E2 [done].pass'), 'code=' + r.code);
}

// 4) pin mismatch
{
    const t = tree({
        'logs/r1-b1.out': tee,
        'logs/r1-driver.log': '[PIN] sha=AAAAAAAAAAAAAAAAAAAAAAAA shaOk=true\n',
        'a-verify-receipt.md': '[PIN] b1 sha=BBBBBBBBBBBBBBBBBBBBBBBB shaOk=true\n',
    });
    const r = run(t.env);
    check('pin mismatch reported', r.code === 1 && r.out.includes('E3 [PIN] sha'), 'code=' + r.code);
}

// 5) evidence cited, no tee
{
    const t = tree({
        'a-verify-verdict.md': '[done] {"run":"r9","pass":true,"stops":0}\n',
    });
    const r = run(t.env);
    check('missing tee reported', r.code === 1 && r.out.includes('E0'), 'code=' + r.code);
}

// 6) baseline freeze + fresh
{
    const t = tree({
        'logs/r1-b1.out': tee,
        'a-verify-receipt.md': doc('002: [MountLog] rule=gone-away'),
    });
    run({ ...t.env, EVIDENCE_BASELINE: t.env.EVIDENCE_BASELINE });
    const w = spawnSync('node', [TOOL, '--update-baseline'], { encoding: 'utf8', env: { ...process.env, ...t.env } });
    const after = run(t.env);
    fs.writeFileSync(path.join(t.reports, 'b-verify-receipt.md'), doc('001: [MountLog] also-gone'));
    const fresh = run(t.env);
    check('baseline freezes old gaps', after.code === 0, 'code=' + after.code + ' write=' + w.status);
    check('baseline does not hide new gap', fresh.code === 1 && fresh.out.includes('b-verify-receipt.md'), 'code=' + fresh.code);
}

const pass = results.filter((r) => r.ok).length;
console.log('selftest-evidence: ' + pass + '/' + results.length);
for (const d of tmpDirs) fs.rmSync(d, { recursive: true, force: true });
process.exit(pass === results.length ? 0 : 1);
