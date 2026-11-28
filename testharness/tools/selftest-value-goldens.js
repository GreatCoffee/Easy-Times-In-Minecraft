#!/usr/bin/env node
/** value-goldens 自检：造最小窗口 + driver，验捕获、对位、漂移与缺金标。 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'value-goldens.js');
const checks = [];
let failed = 0;
function check(name, ok, detail) {
    checks.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' | ' + detail : ''}`);
    if (!ok) failed++;
}

function fixture() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'gold-'));
    const logs = path.join(root, 'logs');
    const gold = path.join(root, 'gold');
    const player = path.join(root, 'player');
    fs.mkdirSync(logs, { recursive: true });
    fs.mkdirSync(player, { recursive: true });
    fs.writeFileSync(path.join(player, 'f11-b99-smoke.js'), '// fixture\n', 'utf8');
    return { root, logs, gold, player };
}

function tee(logs, name, sand) {
    const p = path.join(logs, name);
    fs.writeFileSync(p, [
        '[12:00:00] [Server thread/INFO] [Easy Times In Minecraft]: [FarmLog] drought probe block=minecraft:sand age=' + sand + ' pos=1,2,3',
        '[12:00:01] [Server thread/INFO] [Easy Times In Minecraft]: [MountLog] rule=geometry face=up support=minecraft:stone block=minecraft:torch result=allow pos=4,5,6',
        '',
    ].join('\n'), 'utf8');
    return p;
}

function driver(logs, name, pass) {
    fs.writeFileSync(path.join(logs, name), `[PIN] sha=aa ok=true\n[done] {"run":"x","pin":true,"pass":${pass}}\n`, 'utf8');
}

function run(f, args) {
    const env = Object.assign({}, process.env, {
        GOLD_LOGS: f.logs,
        GOLD_DIR: f.gold,
        GOLD_PLAYER: f.player,
    });
    try {
        const out = execFileSync(process.execPath, [TOOL, ...args], { encoding: 'utf8', env });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

// 1) capture from a PASS window
const f1 = fixture();
driver(f1.logs, 'b99-r1-driver.log', true);
tee(f1.logs, 'b99-b99-r1-b1.out', 3);
const c1 = run(f1, ['--capture', 'all']);
check('capture writes golden', c1.code === 0 && /captured f11-b99-smoke\.js fields=/.test(c1.out), c1.out.trim().split('\n').pop());

// 2) same window matches
const k2 = run(f1, ['--check', 'all']);
check('same window matches', k2.code === 0 && /verdict OK/.test(k2.out), k2.out.trim().split('\n').pop());

// 3) numeric drift is caught
const f3 = f1;
tee(f3.logs, 'b99-b99-r2-b1.out', 5);
driver(f3.logs, 'b99-r2-driver.log', true);
const k3 = run(f3, ['--check', 'all']);
check('drift is caught', k3.code === 1 && /DRIFT f11-b99-smoke\.js/.test(k3.out), k3.out.trim().split('\n').slice(-1)[0]);

// 4) missing golden reports NONE
const f4 = fixture();
driver(f4.logs, 'b99-r1-driver.log', true);
tee(f4.logs, 'b99-b99-r1-b1.out', 3);
const k4 = run(f4, ['--check', 'all']);
check('missing golden is NONE', k4.code === 0 && /NONE f11-b99-smoke\.js/.test(k4.out));

// 5) non-PASS window is not capturable
const f5 = fixture();
driver(f5.logs, 'b99-r1-driver.log', false);
tee(f5.logs, 'b99-b99-r1-b1.out', 3);
const c5 = run(f5, ['--capture', 'all']);
check('failed window is skipped', c5.code === 0 && /no PASS tee/.test(c5.out) && /captured=0/.test(c5.out));

// 6) list shows the golden
const l6 = run(f1, ['--list']);
check('list reports golden', l6.code === 0 && /GOLD f11-b99-smoke\.js fields=/.test(l6.out));

console.log(checks.join('\n'));
console.log(`[Selftest] ${failed === 0 ? 'PASS' : 'FAIL'} checks=${checks.length} failed=${failed}`);
process.exit(failed === 0 ? 0 : 1);
