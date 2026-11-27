#!/usr/bin/env node
/* selftest-config.js — 用真实 ETIMConfig.java 的临时副本验证 check-config 的「字段/注册/默认值一致」判定。 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const TOOL = path.join(__dirname, 'check-config.js');
const REAL = path.resolve(__dirname, '..', '..', 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'ETIMConfig.java');
const results = [];
function check(name, ok, detail) {
    results.push({ name, ok });
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + name + (detail ? ' — ' + detail : ''));
}
function run(root, args) {
    const r = spawnSync('node', [TOOL, ...(args || [])], {
        encoding: 'utf8',
        env: { ...process.env, CONFIG_REPO: root },
    });
    return { code: r.status === null ? 1 : r.status, out: (r.stdout || '') + (r.stderr || '') };
}
function field(out, k) {
    const m = new RegExp(k + '=(\\d+)').exec(out);
    return m ? +m[1] : -1;
}

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cfg-'));
const dst = path.join(root, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim');
fs.mkdirSync(dst, { recursive: true });
const target = path.join(dst, 'ETIMConfig.java');
const original = fs.readFileSync(REAL, 'utf8');
fs.writeFileSync(target, original, 'utf8');

const clean = run(root);
check('real-config-hard0', clean.code === 0 && field(clean.out, 'hard') === 0,
    'fields=' + field(clean.out, 'fields') + ' keys=' + field(clean.out, 'keys'));

const drift = original.replace('public static boolean foodModel = true;', 'public static boolean foodModel = false;');
if (drift === original) {
    check('fixture-patched', false, 'anchor not found');
} else {
    fs.writeFileSync(target, drift, 'utf8');
    const bad = run(root);
    check('default-mismatch-blocks', bad.code === 1 && field(bad.out, 'hard') >= 1,
        'hard=' + field(bad.out, 'hard'));
}

const atmo = original.replace('"hungerPerFoodUnit", "food", hungerPerFoodUnit, 0.1F, 100.0F', '"hungerPerFoodUnit", "food", hungerPerFoodUnit, 10.0F, 100.0F');
if (atmo === original) {
    check('min-fixture-patched', false, 'anchor not found');
} else {
    fs.writeFileSync(target, atmo, 'utf8');
    const bad = run(root);
    check('default-out-of-range-blocks', bad.code === 1 && field(bad.out, 'hard') >= 1,
        'hard=' + field(bad.out, 'hard'));
}

const pass = results.filter((x) => x.ok).length;
console.log('selftest-config: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
