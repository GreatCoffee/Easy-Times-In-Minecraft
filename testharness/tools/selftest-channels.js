#!/usr/bin/env node
/**
 * check-channels.js 的离线自检。不碰仓库、不起服。
 *
 * 检查：
 *   1. 断言 [FarmLog] 但没强制 farmDebugLog 的脚本 → exit 1 + SILENT-OFF FarmLog；
 *   2. 同一脚本加了 cfg 强制 → exit 0 + verdict OK；
 *   3. 断言一个不存在的通道 → exit 1 + STALE；
 *   4. 缺 --script 参数 → exit 2。
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-channels.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'channels-'));
let pass = 0, fail = 0;

function run(args) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function check(name, ok, detail) {
  if (ok) { pass++; console.log(`  PASS ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ' :: ' + detail : ''}`); }
}

const bad = path.join(dir, 'bad.js');
fs.writeFileSync(bad, "const RE = /\\[FarmLog\\] drought probe/;\nconsole.log(RE);\n", 'utf8');
let r = run(['--script', bad]);
check('未强制 farmDebugLog → RISK', r.code === 1 && /SILENT-OFF FarmLog/.test(r.out), `code=${r.code}`);

const good = path.join(dir, 'good.js');
fs.writeFileSync(good, "const RE = /\\[FarmLog\\] drought probe/;\nconst opts = { cfg: ['farm:farmDebugLog'] };\nconsole.log(RE, opts);\n", 'utf8');
r = run(['--script', good]);
check('强制 farmDebugLog → OK', r.code === 0 && /verdict OK/.test(r.out), `code=${r.code}`);

const stale = path.join(dir, 'stale.js');
fs.writeFileSync(stale, "const RE = /\\[AnvilLog\\] /;\nconsole.log(RE);\n", 'utf8');
r = run(['--script', stale]);
check('死通道 → STALE-RISK', r.code === 1, `code=${r.code}`);

r = run(['--script']);
check('缺参数 → exit 2', r.code === 2, `code=${r.code}`);

fs.rmSync(dir, { recursive: true, force: true });
console.log(`[ChannelLog] selftest pass=${pass} fail=${fail}`);
process.exit(fail ? 1 : 0);
