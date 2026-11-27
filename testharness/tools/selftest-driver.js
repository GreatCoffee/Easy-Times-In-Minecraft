#!/usr/bin/env node
/**
 * Fixture self-test for check-driver.js: one tiny script per rule, each run in
 * its OWN throw-away tree so a failure can only come from that fixture (an
 * earlier bad file must not lend an exit code to a later case).
 *
 *   node testharness/tools/selftest-driver.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-driver.js');
const HEAD = "const H = require('./lib/harness.js');\n";

const cases = [
    {
        name: 'good.js',
        src: HEAD + "const h = H.create({ run: 'x' });\n" +
            "async function main() { await h.boot('x'); const f = h.mark(); await h.cmd('say hi'); await h.waitRow(/hi/, f, 1000); h.finish({}); }\nh.guard(main);\n",
        code: 0,
    },
    {
        name: 'no-boot.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nasync function main() { h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
    {
        // R2 ordering: the wait runs before any mark exists.
        name: 'wait-first.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nasync function main() { await h.boot('x'); await h.waitRow(/a/, 0, 1); const f = h.mark(); await h.waitRow(/b/, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
    {
        name: 'no-player.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nasync function main() { await h.boot('x'); const f = h.mark(); await h.cmd('etest hungerstate'); await h.waitRow(/x/, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
    {
        // R6: the key exists but the script names the wrong section.
        name: 'cfg-bad-section.js',
        files: {
            'src/main/java/io/github/etim/etim/ETIMConfig.java': 'public class ETIMConfig {\n  void init() { config.getBoolean("foodDebugLog", "food", false, ""); }\n}\n',
        },
        src: HEAD + "const h = H.create({ run: 'x', cfg: ['mobs:foodDebugLog'] });\nasync function main() { await h.boot('x'); const f = h.mark(); await h.waitRow(/a/, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
    {
        name: 'cfg-good.js',
        files: {
            'src/main/java/io/github/etim/etim/ETIMConfig.java': 'public class ETIMConfig {\n  void init() { config.getBoolean("foodDebugLog", "food", false, ""); }\n}\n',
        },
        src: HEAD + "const h = H.create({ run: 'x', cfg: ['food:foodDebugLog'] });\nasync function main() { await h.boot('x'); const f = h.mark(); await h.waitRow(/a/, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 0,
    },
    {
        // R5: a migrated file that still touches the deleted globals.
        name: 'leftover.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nasync function main() { await h.boot('x'); await bot.activateItem(); const f = h.mark(); await h.waitRow(/a/, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
    {
        name: 'regen-no-rule.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nconst RE = /healed 1.0 via regen/;\nasync function main() { await h.boot('x'); const f = h.mark(); await h.waitRow(RE, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
];

let pass = 0;
for (const c of cases) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'driver-selftest-'));
    const player = path.join(root, 'testharness', 'player');
    fs.mkdirSync(player, { recursive: true });
    fs.writeFileSync(path.join(player, c.name), c.src, 'utf8');
    for (const [rel, body] of Object.entries(c.files || {})) {
        const dst = path.join(root, rel);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.writeFileSync(dst, body, 'utf8');
    }
    let code = 0;
    try {
        execFileSync(process.execPath, [TOOL, '--root', root], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
        code = typeof e.status === 'number' ? e.status : 1;
    }
    fs.rmSync(root, { recursive: true, force: true });
    const ok = code === c.code;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + c.name + ' exit=' + code + ' want=' + c.code);
    if (ok) pass++;
}
console.log('selftest-driver: ' + pass + '/' + cases.length);
process.exit(pass === cases.length ? 0 : 1);
