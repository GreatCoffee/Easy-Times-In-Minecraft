#!/usr/bin/env node
/**
 * 判窗断言离线预演（只读）—— B-70UX
 *
 * 起服 90 秒、跑完一窗之后才发现的驱动错误里，有一整类其实可以离线挡掉：
 *   1. 断言正则写错字段或顺序（\S 撞上 "BlockPos{x=3, y=…}" 的空格）
 *   2. 选择器用了 1.13+ 才有的参数（limit=）
 *   3. 调了不存在的 /etest 子命令
 *
 * 做法：把每个 harness 脚本里的 `const X_RE = /…/` 拿到**它自己**的历史 tee 上回放，
 * 一次都没命中的报出来；同一条正则若在某个窗口刻意不出现，登记到 assert-exempt.json。
 *
 * 用法：
 *   node testharness/tools/check-asserts.js            # 全量
 *   node testharness/tools/check-asserts.js --list     # 只列明细
 *   node testharness/tools/check-asserts.js --script f15-reg-chains.js
 *   node testharness/tools/check-asserts.js --tees 3   # 每个脚本回放最近 3 份 tee
 * 环境变量：ASSERT_PLAYER（脚本目录）、ASSERT_LOGS（tee 目录）、ASSERT_REPO（mod 仓）、
 *          ASSERT_EXEMPT（豁免表路径）
 * 退出码：0 = OK；1 = 有风险；2 = 用法/路径错误
 */
const fs = require('fs');
const path = require('path');

const REPO = process.env.ASSERT_REPO || path.resolve(__dirname, '..', '..');
const PLAYER = process.env.ASSERT_PLAYER || path.join(REPO, 'testharness', 'player');
const LOGS = process.env.ASSERT_LOGS || path.join(REPO, 'testharness', 'build-logs');
const CMD_FILE = path.join(REPO, 'src', 'main', 'java', 'io', 'github', 'etim', 'etim', 'commands', 'CommandDevTest.java');
const EXEMPT_FILE = process.env.ASSERT_EXEMPT || path.join(__dirname, 'assert-exempt.json');

function arg(name, dflt) {
    const i = process.argv.indexOf('--' + name);
    return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : dflt;
}
const LIST = process.argv.includes('--list');
const ONLY = arg('script', null);
const MAX_TEES = Number(arg('tees', 5));

/** Commands the dev-test command actually dispatches. */
function knownCommands() {
    if (!fs.existsSync(CMD_FILE)) {
        return null;
    }
    const src = fs.readFileSync(CMD_FILE, 'utf8');
    return new Set([...src.matchAll(/case "([a-z0-9_]+)"/g)].map((m) => m[1]));
}

/** Find `/…/flags` literals assigned to `const X_RE`. */
function regexesOf(src) {
    const out = [];
    const re = /const\s+([A-Z][A-Z0-9_]*_RE)\s*=\s*\//g;
    let m;
    while ((m = re.exec(src))) {
        let i = re.lastIndex;
        let body = '';
        let closed = false;
        while (i < src.length) {
            const c = src[i];
            if (c === '\\') {
                body += c + (src[i + 1] || '');
                i += 2;
                continue;
            }
            if (c === '/') {
                closed = true;
                i++;
                break;
            }
            if (c === '\n') {
                break;
            }
            body += c;
            i++;
        }
        if (!closed) {
            continue;
        }
        let flags = '';
        while (i < src.length && /[a-z]/.test(src[i])) {
            flags += src[i++];
        }
        out.push({ name: m[1], body, flags });
        re.lastIndex = i;
    }
    return out;
}

/** `/etest <sub>` invocations inside the script (template strings included). */
function etestCommands(src) {
    return [...new Set([...src.matchAll(/etest\s+([a-z][a-z0-9_]*)/g)].map((m) => m[1]))];
}

/** 1.13-only selector arguments and other obvious syntax slips. */
function selectorProblems(src) {
    const bad = new Set();
    for (const m of src.matchAll(/@[aeprs]\[([^\]]*)\]/g)) {
        for (const part of m[1].split(',')) {
            const k = part.split('=')[0].trim();
            if (k === 'limit') {
                bad.add('limit= (1.13+; 1.12 用 c=)');
            }
            if (k === 'sort') {
                bad.add('sort= (1.13+)');
            }
        }
    }
    return [...bad];
}

/** Tees that belong to this script: batch token from the file name. */
function teesFor(scriptName) {
    if (!fs.existsSync(LOGS)) {
        return [];
    }
    const m = /^(f\d+)-([a-z0-9]+)(?:-|\.js$)/.exec(scriptName);
    if (!m) {
        return [];
    }
    const family = m[1];
    const token = m[2];
    const files = fs.readdirSync(LOGS).filter((f) => f.endsWith('.out'));
    // Two naming conventions coexist: f11-b69 writes b69-<run>-b1.out, while the
    // regression windows write f14-<batch>-<run>-b1.out. Take the union.
    const mine = files.filter((f) => {
        const stem = f.replace(/\.out$/, '');
        if (f.startsWith(family + '-')) {
            return true;
        }
        return new RegExp('(^|-)' + token + '(-|$)').test(stem);
    });
    return mine
        .map((f) => path.join(LOGS, f))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)
        .slice(0, MAX_TEES);
}

function loadExempt() {
    const empty = { scripts: {} };
    if (!fs.existsSync(EXEMPT_FILE)) {
        return empty;
    }
    try {
        const j = JSON.parse(fs.readFileSync(EXEMPT_FILE, 'utf8'));
        return { scripts: j.scripts || {} };
    } catch (e) {
        console.error('[AssertLog] bad exempt json: ' + e.message);
        return empty;
    }
}

function main() {
    if (!fs.existsSync(PLAYER)) {
        console.error('[AssertLog] SKIP player dir absent: ' + PLAYER);
        return 0;
    }
    const known = knownCommands();
    const exempt = loadExempt();
    const scripts = fs.readdirSync(PLAYER)
        .filter((f) => f.endsWith('.js') && /^f\d+-/.test(f))
        .filter((f) => !ONLY || f === ONLY)
        .sort();

    let nRe = 0;
    let nNoHit = 0;
    let nBadSel = 0;
    let nUnknown = 0;
    let nExempt = 0;
    const findings = [];
    const rows = [];

    for (const name of scripts) {
        const src = fs.readFileSync(path.join(PLAYER, name), 'utf8');
        const res = regexesOf(src);
        const cmds = etestCommands(src);
        const sels = selectorProblems(src);
        const tees = teesFor(name);
        const texts = tees.map((t) => fs.readFileSync(t, 'utf8').split(/\r?\n/));
        nRe += res.length;

        for (const s of sels) {
            nBadSel++;
            findings.push(`${name}: selector ${s}`);
        }
        if (known) {
            for (const c of cmds) {
                if (!known.has(c)) {
                    nUnknown++;
                    findings.push(`${name}: unknown /etest subcommand "${c}"`);
                }
            }
        }

        const misses = [];
        for (const r of res) {
            let re;
            try {
                re = new RegExp(r.body, r.flags.replace(/g/g, ''));
            } catch (e) {
                misses.push(r.name + ' (bad regex: ' + e.message + ')');
                nNoHit++;
                continue;
            }
            if (!texts.length) {
                continue;
            }
            const hitAny = texts.some((lines) => lines.some((l) => re.test(l)));
            if (hitAny) {
                continue;
            }
            const key = name + ':' + r.name;
            if (exempt.scripts[key]) {
                nExempt++;
                continue;
            }
            nNoHit++;
            misses.push(r.name);
        }
        if (misses.length) {
            findings.push(`${name}: regex never matched in ${texts.length} tee(s): ${misses.join(', ')}`);
        }
        rows.push(`${name} regexes=${res.length} etest=${cmds.length} tees=${texts.length} noHit=${misses.length}`);
    }

    if (LIST) {
        for (const r of rows) {
            console.log('[AssertLog] ' + r);
        }
    }
    for (const f of findings) {
        console.log('[AssertLog] RISK ' + f);
    }
    console.log(`[AssertLog] scripts=${scripts.length} regexes=${nRe} noHit=${nNoHit} exempt=${nExempt} ` +
        `badSelector=${nBadSel} unknownCmd=${nUnknown} tees=${MAX_TEES}`);
    const failed = nNoHit + nBadSel + nUnknown;
    console.log('[AssertLog] verdict ' + (failed ? 'RISK' : 'OK'));
    return failed ? 1 : 0;
}

try {
    process.exit(main());
} catch (e) {
    console.error('[AssertLog] error ' + e.message);
    process.exit(2);
}
