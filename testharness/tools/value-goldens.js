#!/usr/bin/env node
/**
 * 回归数值金标（B-70VB）。
 *
 * 回归网此前只证明「那行还在发」（--mode=arms）。本工具从最近一次 PASS 窗口
 * 里抽一份数值快照（按 verify-diff 的 --mode=values 口径归一），存成金标；
 * 之后每次回归跑完都拿新窗口对金标，数值漂移即红。
 *
 * 用法：
 *   node testharness/tools/value-goldens.js --capture all
 *   node testharness/tools/value-goldens.js --capture f11-b69-smoke.js
 *   node testharness/tools/value-goldens.js --check all
 *   node testharness/tools/value-goldens.js --list
 *
 * 产物：testharness/tools/goldens/<script>.json（field -> {token: count}）
 * 环境变量：GOLD_LOGS / GOLD_DIR / GOLD_PLAYER
 */
const fs = require('fs');
const path = require('path');
const D = require('./verify-diff.js');

const LOGS = process.env.GOLD_LOGS || path.join(__dirname, '..', 'build-logs');
const GOLD_DIR = process.env.GOLD_DIR || path.join(__dirname, 'goldens');
const PLAYER = process.env.GOLD_PLAYER || path.join(__dirname, '..', 'player');
const TOL = 0;
const EXTRA_TOKENS = { "f19-reg-explosion.js": ["b70up"] };
const NOT_A_WINDOW = new Set(['f7-wb-lib.js']);

/** 脚本名 -> 用来匹配 tee 的 token（b58 / b70t8 / f14）。 */
function tokensOf(script) {
    if (EXTRA_TOKENS[script]) return EXTRA_TOKENS[script];
    return script.replace(/\.js$/, '').split('-').filter((x) => /^(b\d+[a-z0-9]*|f\d+)$/.test(x));
}

function teesFor(script) {
    const toks = tokensOf(script);
    if (!toks.length || !fs.existsSync(LOGS)) return [];
    return fs.readdirSync(LOGS)
        .filter((f) => f.endsWith('.out'))
        .filter((f) => toks.some((t) => new RegExp('(^|-)' + t + '(-|$)').test(f)))
        .map((f) => {
            const p = path.join(LOGS, f);
            return { file: f, path: p, mtime: fs.statSync(p).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);
}

function donePass(text) {
    const line = (text.match(/^\[done\]\s*(\{.*\})\s*$/m) || [])[1];
    if (!line) return null;
    try {
        return JSON.parse(line).pass === true;
    } catch (e) {
        return null;
    }
}

/**
 * 窗口是否 PASS。B-70T2 起 [done] 写在 driver log 里（tee 只有服务端输出），
 * 所以先看 tee 自身，再按 mtime 最近（10 分钟内）找同次运行的 driver log。
 */
function passOf(file) {
    const own = donePass(fs.readFileSync(file, 'utf8'));
    if (own !== null) return own;
    if (!fs.existsSync(LOGS)) return false;
    const st = fs.statSync(file);
    let best = null;
    for (const d of fs.readdirSync(LOGS).filter((f) => f.endsWith('-driver.log'))) {
        const dp = path.join(LOGS, d);
        const gap = Math.abs(fs.statSync(dp).mtimeMs - st.mtimeMs);
        if (gap > 10 * 60 * 1000) continue;
        if (!best || gap < best.gap) best = { file: d, gap };
    }
    if (!best) return false;
    return donePass(fs.readFileSync(path.join(LOGS, best.file), 'utf8')) === true;
}

function newestPassTee(script) {
    for (const t of teesFor(script)) {
        if (passOf(t.path)) return t;
    }
    return null;
}

/** 本地文件里最新的 tee（run-regression 刚跑出来的那个）。 */
function newestTeeSince(script, sinceMs) {
    for (const t of teesFor(script)) {
        if (t.mtime >= sinceMs) return t;
    }
    return null;
}

function snapshot(teePath) {
    const table = D.valueTable(D.parseAll([teePath]).values, new Set(D.VALUE_CHANNELS), D.VALUE_IGNORE, TOL);
    const out = {};
    for (const [field, counts] of table) {
        const o = {};
        for (const [tok, n] of counts) o[tok] = n;
        out[field] = o;
    }
    return out;
}

function toMap(obj) {
    const m = new Map();
    for (const [k, v] of Object.entries(obj)) m.set(k, new Map(Object.entries(v)));
    return m;
}

function scripts() {
    if (!fs.existsSync(PLAYER)) return [];
    return fs.readdirSync(PLAYER)
        .filter((f) => /^f\d+-.+\.js$/.test(f) && !NOT_A_WINDOW.has(f))
        .sort();
}

function goldenPath(script) {
    return path.join(GOLD_DIR, script.replace(/\.js$/, '') + '.json');
}

function capture(script) {
    const tee = newestPassTee(script);
    if (!tee) return { script, ok: false, why: 'no PASS tee' };
    const snap = snapshot(tee.path);
    if (!fs.existsSync(GOLD_DIR)) fs.mkdirSync(GOLD_DIR, { recursive: true });
    fs.writeFileSync(goldenPath(script), JSON.stringify({
        script,
        tee: tee.file,
        at: new Date().toISOString(),
        fields: Object.keys(snap).length,
        values: snap,
    }, null, 2) + '\n', 'utf8');
    return { script, ok: true, tee: tee.file, fields: Object.keys(snap).length };
}

/** 用给定 tee 对金标；没有金标返回 checked=false。 */
function compare(script, teePath) {
    const gp = goldenPath(script);
    if (!fs.existsSync(gp)) return { script, checked: false };
    const gold = JSON.parse(fs.readFileSync(gp, 'utf8'));
    const cur = snapshot(teePath);
    const diff = D.valuesDiff(toMap(gold.values), toMap(cur), TOL);
    const drift = diff.onlyA.length + diff.onlyB.length + diff.delta.length;
    return { script, checked: true, drift, diff, golden: gold };
}

function valueOf(argv, flag) {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : null;
}

function main() {
    const argv = process.argv.slice(2);
    const captureArg = valueOf(argv, '--capture');
    const checkArg = valueOf(argv, '--check');

    if (argv.includes('--list')) {
        for (const s of scripts()) {
            const gp = goldenPath(s);
            if (!fs.existsSync(gp)) { console.log('[GoldLog] NONE ' + s); continue; }
            const g = JSON.parse(fs.readFileSync(gp, 'utf8'));
            console.log('[GoldLog] GOLD ' + s + ' fields=' + (g.fields || 0) + ' tee=' + g.tee + ' at=' + g.at);
        }
        return 0;
    }

    if (captureArg) {
        const targets = captureArg === 'all' ? scripts() : [captureArg];
        let ok = 0;
        let skipped = 0;
        for (const s of targets) {
            const r = capture(s);
            if (r.ok) {
                ok++;
                console.log('[GoldLog] captured ' + s + ' fields=' + r.fields + ' tee=' + r.tee);
            } else {
                skipped++;
                console.log('[GoldLog] skip ' + s + ' (' + r.why + ')');
            }
        }
        console.log('[GoldLog] captured=' + ok + ' skipped=' + skipped);
        return 0;
    }

    if (checkArg) {
        const targets = checkArg === 'all' ? scripts() : [checkArg];
        let drift = 0;
        let checked = 0;
        for (const s of targets) {
            const tee = newestPassTee(s);
            if (!tee) continue;
            const r = compare(s, tee.path);
            if (!r.checked) { console.log('[GoldLog] NONE ' + s); continue; }
            checked++;
            if (r.drift === 0) {
                console.log('[GoldLog] MATCH ' + s + ' fields=' + Object.keys(r.golden.values).length);
                continue;
            }
            drift++;
            console.log('[GoldLog] DRIFT ' + s + ' diffs=' + r.drift + ' (golden=' + r.golden.tee + ', new=' + tee.file + ')');
            for (const k of r.diff.onlyA.slice(0, 6)) console.log('[GoldLog]   only-in-golden ' + k);
            for (const k of r.diff.onlyB.slice(0, 6)) console.log('[GoldLog]   only-in-new ' + k);
            for (const d of r.diff.delta.slice(0, 8)) console.log('[GoldLog]   ' + d);
        }
        console.log('[GoldLog] checked=' + checked + ' drift=' + drift + ' verdict ' + (drift ? 'DRIFT' : 'OK'));
        return drift ? 1 : 0;
    }

    console.log('[GoldLog] usage: --capture <script|all> | --check <script|all> | --list');
    return 2;
}

module.exports = { tokensOf, teesFor, newestPassTee, newestTeeSince, snapshot, compare, capture, scripts, goldenPath };

if (require.main === module) {
    try {
        process.exit(main());
    } catch (e) {
        console.error('[GoldLog] error ' + e.message);
        process.exit(2);
    }
}
