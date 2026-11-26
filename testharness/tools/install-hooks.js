#!/usr/bin/env node
/**
 * Point this clone at the versioned hooks directory.
 *
 *   node testharness/tools/install-hooks.js
 *
 * `git config core.hooksPath .githooks` is per-clone, so every fresh checkout
 * needs this one line. The hook itself lives in the repo, so its content is
 * reviewed like any other file.
 */
'use strict';
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const hook = path.join(ROOT, '.githooks', 'pre-commit');

if (!fs.existsSync(hook)) {
    console.error('[install-hooks] missing ' + hook);
    process.exit(1);
}

execFileSync('git', ['config', 'core.hooksPath', '.githooks'], { cwd: ROOT, stdio: 'inherit' });
const now = execFileSync('git', ['config', '--get', 'core.hooksPath'], { cwd: ROOT, encoding: 'utf8' }).trim();
console.log('[install-hooks] core.hooksPath=' + now);
console.log('[install-hooks] every commit now runs preflight (~1s); bypass once with --no-verify');
