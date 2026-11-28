#!/usr/bin/env node
/**
 * 单测缺口棘轮（B-70VA）。
 *
 * 规则：`src/main/java` 里每个类，若声明了 ≥2 个 `public static` 方法
 * （不含常量、不含 main），就必须有测试类在正文里提到它的简单类名；
 * 否则记一条缺口。存量缺口冻结在 `test-baseline.json`，只拦新增。
 *
 * 豁免目录：`client/`（渲染，需 GL 上下文）、`mixins/`（改字节码，靠判窗）。
 * 配置类 `ETIMConfig` 不在此列——它的正确性由 check-config 管。
 *
 * 用法：
 *   node testharness/tools/check-tests.js             # 棘轮（基线外新增即 exit 1）
 *   node testharness/tools/check-tests.js --list      # 逐条列出 OK / BASE / NEW
 *   node testharness/tools/check-tests.js --update-baseline
 *
 * 环境变量：TESTS_REPO / TESTS_BASELINE
 */
const fs = require('fs');
const path = require('path');

const REPO = process.env.TESTS_REPO || path.resolve(__dirname, '..', '..');
const BASELINE = process.env.TESTS_BASELINE || path.join(__dirname, 'test-baseline.json');
const MAIN = path.join(REPO, 'src', 'main', 'java');
const TEST = path.join(REPO, 'src', 'test', 'java');
const MIN_STATICS = 2;

function walk(dir, out) {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (e.name.endsWith('.java')) out.push(p);
    }
    return out;
}

function rel(p) {
    return path.relative(MAIN, p).split(path.sep).join('/');
}

function exempt(relPath) {
    return relPath.includes('/client/') || relPath.includes('/mixins/');
}

/** public static 方法计数（排除常量与 main）。 */
function staticsOf(text) {
    let n = 0;
    for (const line of text.split(/\r?\n/)) {
        const s = line.trim();
        if (!s.startsWith('public static')) continue;
        if (s.includes(' void main(')) continue;
        if (!s.includes('(')) continue;
        if (/\b(class|interface|enum|record)\b/.test(s)) continue;
        n++;
    }
    return n;
}

function simpleName(file) {
    return path.basename(file, '.java');
}

function loadBaseline() {
    if (!fs.existsSync(BASELINE)) return null;
    try {
        const j = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
        return new Set((j.classes || []).map(String));
    } catch (e) {
        return null;
    }
}

function main() {
    const argv = process.argv.slice(2);
    const list = argv.includes('--list');
    const update = argv.includes('--update-baseline');

    if (!fs.existsSync(MAIN)) {
        console.log('[TestsLog] SKIP mod tree absent');
        process.exit(0);
    }

    const mains = walk(MAIN, []);
    const tests = walk(TEST, []);
    const testsText = tests.map((p) => fs.readFileSync(p, 'utf8')).join('\n');

    const gaps = [];
    let considered = 0;
    let covered = 0;
    for (const file of mains) {
        const r = rel(file);
        if (exempt(r)) continue;
        if (r === 'io/github/etim/etim/ETIMConfig.java') continue;
        const text = fs.readFileSync(file, 'utf8');
        const n = staticsOf(text);
        if (n < MIN_STATICS) continue;
        considered++;
        const name = simpleName(file);
        const hit = new RegExp('\\b' + name + '\\b').test(testsText);
        if (hit) covered++;
        else gaps.push(r);
    }

    // 基线键已不存在（类被删/改名或已补测试）→ 提示收缩
    const baseline = loadBaseline();
    const staleBase = baseline ? [...baseline].filter((k) => !gaps.includes(k)) : [];

    if (update) {
        const body = { note: '既有单测缺口（只拦新增）。补上测试后从本表删除。', classes: gaps.slice().sort() };
        fs.writeFileSync(BASELINE, JSON.stringify(body, null, 2) + '\n', 'utf8');
        console.log('[TestsLog] baseline written classes=' + gaps.length);
        process.exit(0);
    }

    if (baseline === null) {
        console.log('[TestsLog] baseline missing: run with --update-baseline once to freeze the existing gaps');
        process.exit(1);
    }

    const fresh = gaps.filter((k) => !baseline.has(k));
    if (list) {
        for (const file of mains) {
            const r = rel(file);
            if (exempt(r) || r === 'io/github/etim/etim/ETIMConfig.java') continue;
            if (staticsOf(fs.readFileSync(file, 'utf8')) < MIN_STATICS) continue;
            const name = simpleName(file);
            const has = new RegExp('\\b' + name + '\\b').test(testsText);
            const tag = has ? 'OK  ' : baseline.has(r) ? 'BASE' : 'NEW ';
            if (tag !== 'OK  ') console.log('[TestsLog] ' + tag + ' ' + r);
        }
    }
    for (const f of fresh) console.log('[TestsLog] FAIL no test: ' + f);
    if (staleBase.length) {
        console.log('[TestsLog] baseline shrank by ' + staleBase.length + ': ' + staleBase.join(', '));
    }

    const verdict = fresh.length === 0 ? 'OK' : 'RISK';
    console.log('[TestsLog] classes=' + considered + ' covered=' + covered + ' gaps=' + gaps.length +
        ' baseline=' + baseline.size + ' fresh=' + fresh.length + ' verdict ' + verdict);
    process.exit(fresh.length === 0 ? 0 : 1);
}

main();
