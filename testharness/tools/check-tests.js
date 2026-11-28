#!/usr/bin/env node
/**
 * 单测缺口棘轮（B-70VA，B-70VI 起"说真话"）。
 *
 * 规则：`src/main/java` 里每个类，若声明了 ≥2 个 `public static` 方法
 * （不含常量、不含 main），就必须二选一：
 *   A) 测试代码在**带断言的测试方法体内**提到它的简单类名（direct）；
 *   B) 它的静态方法全部是薄包装——方法体只由 `<Cap>.<method>(...)` 调用
 *      与 if/else 组成，且每个被委托的类本身已覆盖（delegate，可传递）。
 * 否则记一条缺口。存量缺口冻结在 `test-baseline.json`，只拦新增。
 *
 * 为什么要有 B：`ETIMButchering` / `ETIMMelee` / `ETIMFishing` 这些类在重构后
 * 只剩"转发到 ButcherGates / MeleeGates / FishingGates"，真正的算术已经被
 * gate 类的测试覆盖；只认类名会让棘轮长期喊假警，喊久了就没人看。
 *
 * 豁免目录：`client/`（渲染，需 GL 上下文）、`mixins/`（改字节码，靠判窗）。
 * 配置类 `ETIMConfig` 不在此列——它的正确性由 check-config 管。
 *
 * 用法：
 *   node testharness/tools/check-tests.js             # 棘轮（基线外新增即 exit 1）
 *   node testharness/tools/check-tests.js --list      # 逐条列出 OK / DELEG / BASE / NEW
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

function simpleName(file) {
    return path.basename(file, '.java');
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

/** 取每个 public static 方法的方法体（花括号配平；不含签名）。 */
function staticBodies(text) {
    const lines = text.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const s = lines[i].trim();
        if (!s.startsWith('public static')) continue;
        if (s.includes(' void main(') || !s.includes('(')) continue;
        if (/\b(class|interface|enum|record)\b/.test(s)) continue;
        let depth = 0;
        let started = false;
        const buf = [];
        for (let j = i; j < lines.length; j++) {
            const line = lines[j];
            for (const ch of line) {
                if (ch === '{') {
                    depth++;
                    started = true;
                } else if (ch === '}') {
                    depth--;
                }
            }
            if (started) buf.push(line);
            if (started && depth === 0) break;
        }
        // 去掉签名行之前的左花括号内容
        const joined = buf.join('\n');
        const body = joined.slice(joined.indexOf('{') + 1, joined.lastIndexOf('}'));
        out.push({ sig: s, body });
    }
    return out;
}

const WORLDY = /\b(World|WorldServer|Entity|EntityPlayer|EntityLivingBase|ItemStack|BlockPos|IBlockState|DamageSource|NBTTagCompound|Container|Inventory|Random|EnumFacing|Block)\b/;

/** 签名只吃原始类型 / String / 数组 -> 可以脱离服务端单测。 */
function pureSignature(sig) {
    const args = sig.slice(sig.indexOf('(') + 1, sig.lastIndexOf(')'));
    if (!args.trim()) return true;
    return !WORLDY.test(args);
}

const JDK = new Set([
    'Math', 'String', 'Integer', 'Long', 'Float', 'Double', 'Boolean', 'Objects', 'System',
    'Arrays', 'Collections', 'List', 'Map', 'Set', 'Locale', 'UUID', 'Thread', 'StringBuilder',
    'EnchantmentHelper', 'ItemStack', 'Items', 'Blocks', 'Material', 'EnumFacing', 'BlockPos',
]);

/**
 * 方法体若是"纯转发"，返回被委托的类名集合；否则 null。
 * 允许：`return X.y(...)`、`X.y(...)`、`if (...) return X.y(...)`、`return;`。
 */
function wrapperTargets(body) {
    const cleaned = body
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
    const stmts = cleaned
        .split(/[;{}]/)
        .map((s) => s.replace(/\s+/g, ' ').trim())
        .filter((s) => s && s !== 'else');
    if (!stmts.length) return null;
    const targets = new Set();
    const call = /^(?:if\s*\([^()]*(?:\([^()]*\)[^()]*)*\)\s*)?(?:return\s+)?([A-Z][A-Za-z0-9_]*)\s*\.\s*([a-z][A-Za-z0-9_]*)\s*\((?:[^()]|\([^()]*\))*\)$/;
    for (const s of stmts) {
        if (s === 'return') continue;
        const m = s.match(call);
        if (!m) return null;
        if (JDK.has(m[1])) return null; // Math.max 之类是真算术，不是转发
        targets.add(m[1]);
    }
    return targets.size ? targets : null;
}

/** 测试文件里"带 assert 的方法体"提到过哪些简单类名。 */
function assertedNames(testFiles) {
    const names = new Set();
    for (const file of testFiles) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        let depth = 0;
        let inMethod = false;
        let buf = [];
        const flush = () => {
            if (!inMethod) return;
            const text = buf.join('\n');
            if (/\bassert[A-Za-z]*\s*\(/.test(text)) {
                for (const m of text.matchAll(/\b([A-Z][A-Za-z0-9_]*)\b/g)) names.add(m[1]);
            }
            buf = [];
        };
        for (const line of lines) {
            if (!inMethod && /^\s*(?:public\s+|private\s+|protected\s+|static\s+|final\s+)*void\s+\w+\s*\(/.test(line)) {
                inMethod = true;
                buf = [];
            }
            if (inMethod) buf.push(line);
            for (const ch of line) {
                if (ch === '{') depth++;
                else if (ch === '}') depth--;
            }
            if (inMethod && depth === 0 && buf.length > 1) {
                flush();
                inMethod = false;
            }
        }
        flush();
    }
    return names;
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

    const classes = []; // { rel, name, bodies }
    for (const file of mains) {
        const r = rel(file);
        if (exempt(r) || r === 'io/github/etim/etim/ETIMConfig.java') continue;
        const text = fs.readFileSync(file, 'utf8');
        if (staticsOf(text) < MIN_STATICS) continue;
        const bodies = staticBodies(text);
        classes.push({ rel: r, name: simpleName(file), bodies, pure: bodies.filter((m) => pureSignature(m.sig)).length });
    }

    const direct = assertedNames(tests);
    const byName = new Map(classes.map((c) => [c.name, c]));

    const wrappers = new Map();
    for (const c of classes) {
        const all = c.bodies.map((m) => wrapperTargets(m.body));
        wrappers.set(c.name, all.every(Boolean) ? all : null);
    }

    const covered = new Set([...direct].filter((n) => byName.has(n) || !byName.size ? n : true));
    for (const c of classes) if (direct.has(c.name)) covered.add(c.name);

    let grew = true;
    const viaDelegate = new Set();
    while (grew) {
        grew = false;
        for (const c of classes) {
            if (covered.has(c.name)) continue;
            const w = wrappers.get(c.name);
            if (!w) continue;
            const targets = new Set();
            for (const set of w) for (const t of set) targets.add(t);
            let ok = true;
            for (const t of targets) {
                if (!byName.has(t) || !covered.has(t)) {
                    ok = false;
                    break;
                }
            }
            if (ok) {
                covered.add(c.name);
                viaDelegate.add(c.name);
                grew = true;
            }
        }
    }

    const allGaps = classes.filter((c) => !covered.has(c.name));
    // 「plumbing」= 该类没有任何纯签名静态方法（只能靠起服/判窗验），单测棘轮不追它。
    const plumbing = allGaps.filter((c) => c.pure === 0).map((c) => c.rel);
    const gaps = allGaps.filter((c) => c.pure > 0).map((c) => c.rel);
    const gapSet = new Set(gaps);
    const plumbingSet = new Set(plumbing);

    if (update) {
        const body = {
            note: '既有单测缺口（只拦新增）。只收「有纯签名静态方法」的类；plumbing 类（无纯签名）不在此表。补上测试、或整类变成已测 gate 的薄包装后，从本表删除。',
            classes: gaps.slice().sort(),
        };
        fs.writeFileSync(BASELINE, JSON.stringify(body, null, 2) + '\n', 'utf8');
        console.log('[TestsLog] baseline written classes=' + gaps.length);
        process.exit(0);
    }

    const baseline = loadBaseline();
    if (baseline === null) {
        console.log('[TestsLog] baseline missing: run with --update-baseline once to freeze the existing gaps');
        process.exit(1);
    }

    const staleBase = [...baseline].filter((k) => !gapSet.has(k));
    const fresh = gaps.filter((k) => !baseline.has(k));

    if (list) {
        for (const c of classes) {
            const tag = direct.has(c.name) ? 'OK  ' : viaDelegate.has(c.name) ? 'DELEG'
                : plumbingSet.has(c.rel) ? 'PLUMB' : baseline.has(c.rel) ? 'BASE' : 'NEW ';
            if (tag !== 'OK  ') console.log('[TestsLog] ' + tag + ' ' + c.rel + (viaDelegate.has(c.name) ? ' (thin wrapper)' : ''));
        }
    }
    for (const f of fresh) console.log('[TestsLog] FAIL no test: ' + f);
    if (staleBase.length) {
        console.log('[TestsLog] baseline shrank by ' + staleBase.length + ': ' + staleBase.join(', '));
    }

    const verdict = fresh.length === 0 ? 'OK' : 'RISK';
    console.log('[TestsLog] classes=' + classes.length + ' direct=' + (classes.length - viaDelegate.size - allGaps.length) +
        ' delegate=' + viaDelegate.size + ' gaps=' + gaps.length +
        ' plumbing=' + plumbing.length + ' baseline=' + baseline.size + ' fresh=' + fresh.length +
        ' verdict ' + verdict);
    process.exit(fresh.length === 0 ? 0 : 1);
}

main();
