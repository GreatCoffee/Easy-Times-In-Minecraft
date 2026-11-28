#!/usr/bin/env node
/*
 * check-tool-selftests.js — 工装自检卫生棘轮。
 *
 * 规则：testharness/tools 下每个工具（非 selftest-*）必须有同名 selftest-<name>.js，
 *       或在 tool-manual.json 里带理由登记为「人工/端到端」工具。
 * 目的：防止新工具默认无自检，也防止登记表腐坏（登记了不存在的工具 / 工具补了自检但登记没删）。
 *
 * 用法：
 *   node testharness/tools/check-tool-selftests.js           # 校验
 *   node testharness/tools/check-tool-selftests.js --list    # 逐条列出
 * 退出码：0 = 通过，1 = 有缺口。
 */
const fs = require('fs');
const path = require('path');

const DIR = process.env.TOOLS_DIR || __dirname;
const MANUAL = path.join(DIR, 'tool-manual.json');
const LIST = process.argv.includes('--list');

let manual = { tools: {} };
if (fs.existsSync(MANUAL)) {
    const j = JSON.parse(fs.readFileSync(MANUAL, 'utf8'));
    manual = j && typeof j === 'object' ? { tools: j.tools || {} } : manual;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).sort();
const tools = files.filter((f) => !f.startsWith('selftest-')).map((f) => f.slice(0, -3));

const rows = [];
const missing = [];
const stale = [];

const ALIAS = {
    'set-pin': 'setpin',
    'gen-window': 'genwindow',
    'face-assert': 'faceassert',
    'extract-values': 'extract',
    'face-readiness': 'readiness',
    'plan-batches': 'plan',
    'batch-status': 'batchstatus',
    'index-scripts': 'scripts',
    'regression-plan': 'regplan',
    'gen-config-doc': 'configdoc',
    'gen-channel-doc': 'chandoc',
    'check-pipeline-doc': 'pipeline',
    'check-asserts': 'asserts',
    'gen-report': 'genreport',
    'check-report-shape': 'shape',
    'check-tests': 'tests',
};

for (const t of tools) {
    const cands = ['selftest-' + t + '.js'];
    if (t.startsWith('check-')) {
        cands.push('selftest-' + t.slice('check-'.length) + '.js');
    }
    if (ALIAS[t]) {
        cands.push('selftest-' + ALIAS[t] + '.js');
    }
    const has = cands.some((c) => fs.existsSync(path.join(DIR, c)));
    const why = manual.tools[t];
    if (has) {
        rows.push({ tool: t, state: 'selftest', note: '' });
    } else if (why) {
        rows.push({ tool: t, state: 'manual', note: why });
    } else {
        rows.push({ tool: t, state: 'MISSING', note: '' });
        missing.push(t);
    }
}

for (const t of Object.keys(manual.tools)) {
    if (!tools.includes(t)) {
        rows.push({ tool: t, state: 'STALE-MANUAL', note: manual.tools[t] });
        stale.push(t);
    }
}

if (LIST) {
    for (const r of rows) {
        console.log('[' + r.state + '] ' + r.tool + (r.note ? ' — ' + r.note : ''));
    }
}

const withSelftest = rows.filter((r) => r.state === 'selftest').length;
const manualCount = rows.filter((r) => r.state === 'manual').length;
console.log('[ToolsLog] tools=' + tools.length + ' selftest=' + withSelftest + ' manual=' + manualCount
    + ' missing=' + missing.length + ' staleManual=' + stale.length);
if (missing.length) {
    console.log('[ToolsLog] missing selftest: ' + missing.join(' '));
}
if (stale.length) {
    console.log('[ToolsLog] stale manual entry: ' + stale.join(' '));
}
const ok = missing.length === 0 && stale.length === 0;
console.log('[ToolsLog] verdict ' + (ok ? 'OK' : 'FAIL'));
process.exit(ok ? 0 : 1);
