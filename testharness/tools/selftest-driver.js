#!/usr/bin/env node
/**
 * Fixture self-test for check-driver.js: five tiny scripts, one per rule plus a
 * clean one. Builds a throw-away tree under the temp dir and asserts the exit
 * codes, so the checker itself cannot regress silently.
 *
 *   node testharness/tools/selftest-driver.js
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-driver.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'driver-selftest-'));
const player = path.join(root, 'testharness', 'player');
fs.mkdirSync(player, { recursive: true });

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
        name: 'mark-after.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nasync function main() { await h.boot('x'); await h.cmd('say hi'); const f = h.mark(); const a = await h.waitRow(/hi/, f, 1); const b = await h.waitRow(/hi/, f, 1); h.finish({}); }\nh.guard(main);\n",
        code: 1,
    },
    {
        name: 'no-player.js',
        src: HEAD + "const h = H.create({ run: 'x' });\nasync function main() { await h.boot('x'); const f = h.mark(); await h.cmd('etest hungerstate'); await h.waitRow(/x/, f, 1); h.finish({}); }\nh.guard(main);\n",
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
    fs.writeFileSync(path.join(player, c.name), c.src, 'utf8');
    let code = 0;
    try {
        execFileSync(process.execPath, [TOOL, '--root', root], { encoding: 'utf8', stdio: 'pipe' });
    } catch (e) {
        code = typeof e.status === 'number' ? e.status : 1;
    }
    const ok = code === c.code;
    console.log((ok ? 'PASS' : 'FAIL') + ' ' + c.name + ' exit=' + code + ' want=' + c.code);
    if (ok) pass++;
}
fs.rmSync(root, { recursive: true, force: true });
console.log('selftest-driver: ' + pass + '/' + cases.length);
process.exit(pass === cases.length ? 0 : 1);
