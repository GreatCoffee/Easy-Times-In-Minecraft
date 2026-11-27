#!/usr/bin/env node
/**
 * check-asserts 自检（离线）：造临时 player/logs/repo 三棵树，逐例验判定。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-asserts.js');
const checks = [];
let failed = 0;

function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

function tree({ script, tee, exempt }) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'as-'));
    const player = path.join(dir, 'player');
    const logs = path.join(dir, 'build-logs');
    const repo = path.join(dir, 'repo');
    fs.mkdirSync(player);
    fs.mkdirSync(logs);
    fs.mkdirSync(path.join(repo, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'commands'), { recursive: true });
    fs.writeFileSync(path.join(player, 'f99-demo.js'), script, 'utf8');
    fs.writeFileSync(path.join(logs, 'b99-demo-r1-b1.out'), tee, 'utf8');
    fs.writeFileSync(path.join(repo, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'commands', 'CommandDevTest.java'),
        'switch (sub) {\n case "hit": break;\n}\n', 'utf8');
    const exemptFile = path.join(dir, 'assert-exempt.json');
    fs.writeFileSync(exemptFile, JSON.stringify(exempt || { scripts: {} }), 'utf8');
    return { player, logs, repo, exemptFile };
}

function run(t, extra) {
    const env = Object.assign({}, process.env, {
        ASSERT_PLAYER: t.player,
        ASSERT_LOGS: t.logs,
        ASSERT_REPO: t.repo,
        ASSERT_EXEMPT: t.exemptFile,
    });
    try {
        const out = execFileSync(process.execPath, [TOOL, ...(extra || [])], { encoding: 'utf8', env });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

// 1) clean: regex hits the tee, selector valid, command exists
const good = tree({
    script: [
        "const OK_RE = /\\[FarmLog\\] ok=(\\d+)/;",
        "await cmd('etest hit @e[type=minecraft:zombie,c=1] 5');",
    ].join('\n'),
    tee: '[10:00:00] [Server thread/INFO] [ETIM]: [FarmLog] ok=3',
});
const g = run(good);
check('clean tree exits 0', g.code === 0 && /verdict OK/.test(g.out), g.out.trim().split('\n').pop());

// 2) zero-hit regex
const zero = tree({
    script: "const MISS_RE = /\\[FarmLog\\] never=/;",
    tee: '[10:00:00] [Server thread/INFO] [ETIM]: [FarmLog] ok=3',
});
const z = run(zero);
check('zero-hit exits 1', z.code === 1 && /never matched/.test(z.out), z.out.trim().split('\n').pop());

// 3) 1.13 selector
const sel = tree({
    script: "const OK_RE = /\\[FarmLog\\] ok/;\nawait cmd('etest hit @e[type=minecraft:zombie,limit=1] 5');",
    tee: '[10:00:00] [Server thread/INFO] [ETIM]: [FarmLog] ok=3',
});
const s = run(sel);
check('limit= flagged', s.code === 1 && /selector limit=/.test(s.out), s.out.trim().split('\n').pop());

// 4) unknown /etest subcommand
const cmdBad = tree({
    script: "const OK_RE = /\\[FarmLog\\] ok/;\nawait cmd('etest nosuchthing 1');",
    tee: '[10:00:00] [Server thread/INFO] [ETIM]: [FarmLog] ok=3',
});
const c = run(cmdBad);
check('unknown subcommand flagged', c.code === 1 && /unknown \/etest subcommand "nosuchthing"/.test(c.out), c.out.trim().split('\n').pop());

// 5) exempted zero-hit passes
const ex = tree({
    script: "const MISS_RE = /\\[FarmLog\\] optional=/;",
    tee: '[10:00:00] [Server thread/INFO] [ETIM]: [FarmLog] ok=3',
    exempt: { scripts: { 'f99-demo.js:MISS_RE': '只在满月窗口出现' } },
});
const e = run(ex);
check('exempt zero-hit passes', e.code === 0 && /exempt=1/.test(e.out), e.out.trim().split('\n').pop());

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
