#!/usr/bin/env node
/**
 * 判窗锚点对位器（只读）。
 *
 * 喂两窗的证据（tee 日志 + harness 的 `<run>-driver.log`，可逗号并列），
 * 输出机械差异单：规则名集合与计数、挂载行多重集、W1..W4 键集与取值、
 * [done] 字段、[PIN] 标志、[cfg] 行。替代会话七每窗的手工 Compare-Object。
 *
 * 用法：
 *   node testharness/tools/verify-diff.js --base b69-b69r20-b1.out --new b69-b70t-r3-b1.out
 *   node testharness/tools/verify-diff.js --base b69-b69r20-b1.out,b69r20-driver.log \
 *                                        --new  b69-b70t-r3-b1.out,b70t-r3-driver.log
 *   node testharness/tools/verify-diff.js --base latest --new latest   （取最近两个 driver log）
 *
 * 退出码：0 = MATCH，1 = DIFF，2 = 用法/解析错误。
 */
const fs = require('fs');
const path = require('path');

const LOGS = path.join(__dirname, '..', 'build-logs');

function newestTee(except) {
    const exclude = new Set((except || []).map((f) => path.resolve(f)));
    const files = fs.readdirSync(LOGS)
        .filter((f) => f.endsWith('.out') || f.endsWith('-driver.log'))
        .map((f) => path.join(LOGS, f))
        .filter((f) => !exclude.has(path.resolve(f)))
        .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
    if (!files.length) {
        throw new Error('no tee/driver log under ' + LOGS);
    }
    return files[0];
}

function resolveOne(arg, except) {
    if (arg === 'latest') {
        return newestTee(except);
    }
    if (fs.existsSync(arg)) {
        return path.resolve(arg);
    }
    const inLogs = path.join(LOGS, arg);
    if (fs.existsSync(inLogs)) {
        return inLogs;
    }
    throw new Error('tee not found: ' + arg);
}

/** One side of the diff: comma-separated files (tee + driver log) or "latest". */
function resolveSide(arg, except) {
    if (!arg) {
        throw new Error('missing file argument');
    }
    return arg.split(',').map((a) => resolveOne(a.trim(), except));
}

function parseAll(files) {
    const out = {
        files: [],
        pin: null,
        hasPin: false,
        cfg: [],
        done: null,
        hasDone: false,
        arms: {},
        rules: new Map(),
        mounts: new Map(),
        mayplace: 0,
        // Generic channel+first-token multiset (--mode=arms): catches an arm
        // that silently stopped firing even when [MountLog] never appears.
        lines: new Map(),
    };
    for (const file of files) {
        out.files.push(path.basename(file));
        const text = fs.readFileSync(file, 'utf8');
        for (const raw of text.split(/\r?\n/)) {
            // tee lines are log4j-formatted: "[17:54:06] [Server thread/INFO] [Mod]: body",
            // the driver log is bare. Cut everything before the first marker we care about.
            const mk = /\[(?:PIN|cfg|done|MountLog|W\d+)\]/.exec(raw);
            const line = mk ? raw.slice(mk.index) : raw;
            if (line.startsWith('[PIN] ')) {
                out.pin = line.slice(6);
                out.hasPin = true;
            } else if (line.startsWith('[cfg] ')) {
                out.cfg.push(line.slice(6));
            } else if (line.startsWith('[done] ')) {
                try {
                    out.done = JSON.parse(line.slice(7));
                    out.hasDone = true;
                } catch (e) {
                    out.done = { parseError: line.slice(7) };
                }
            } else if (/^\[W\d+\] \{/.test(line)) {
                const i = line.indexOf(' ');
                const tag = line.slice(1, i - 1);
                try {
                    out.arms[tag] = JSON.parse(line.slice(i + 1));
                } catch (e) {
                    out.arms[tag] = { parseError: true };
                }
            }
            const rm = /\[MountLog\] rule=(\S+)/.exec(line);
            if (rm) {
                out.rules.set(rm[1], (out.rules.get(rm[1]) || 0) + 1);
                const kv = {};
                for (const m of line.matchAll(/([A-Za-z_]+)=([^\s\]]+)/g)) {
                    kv[m[1]] = m[2];
                }
                const key = [kv.rule, kv.face, kv.support, kv.block, kv.result].join('|');
                out.mounts.set(key, (out.mounts.get(key) || 0) + 1);
            }
            if (/\[MountLog\] mayplace /.test(line)) {
                out.mayplace++;
            }
            const gm = /\[([A-Za-z0-9_]+Log)\]\s+(\S+)/.exec(line);
            if (gm) {
                const key = `[${gm[1]}] ${gm[2]}`;
                out.lines.set(key, (out.lines.get(key) || 0) + 1);
            }
        }
    }
    return out;
}

function mapDiff(a, b) {
    const onlyA = [];
    const onlyB = [];
    const delta = [];
    for (const [k, v] of a) {
        if (!b.has(k)) {
            onlyA.push(k + '×' + v);
        } else if (b.get(k) !== v) {
            delta.push(`${k}: ${v}->${b.get(k)}`);
        }
    }
    for (const [k, v] of b) {
        if (!a.has(k)) {
            onlyB.push(k + '×' + v);
        }
    }
    return { onlyA, onlyB, delta };
}

function jsonKeyDiff(a, b) {
    const ka = Object.keys(a || {}).sort();
    const kb = Object.keys(b || {}).sort();
    const onlyA = ka.filter((k) => !kb.includes(k));
    const onlyB = kb.filter((k) => !ka.includes(k));
    const changed = ka.filter((k) => kb.includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    return { onlyA, onlyB, changed };
}

function main(argv) {
    const args = argv.slice(2);
    let baseArg = null;
    let newArg = null;
    let mode = 'mount';
    let strictArms = false;
    let strictCounts = false;
    let channels = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--strict-counts') {
            strictCounts = true;
        } else if (args[i].startsWith('--channels=')) {
            channels = args[i].slice(11).split(',').map((s) => s.trim()).filter(Boolean);
        } else if (args[i] === '--mode=arms') {
            mode = 'arms';
        } else if (args[i] === '--strict-arms') {
            strictArms = true;
        } else if (args[i] === '--base') {
            baseArg = args[++i];
        } else if (args[i] === '--new') {
            newArg = args[++i];
        } else if (!baseArg) {
            baseArg = args[i];
        } else {
            newArg = args[i];
        }
    }

    const newFiles = newArg ? resolveSide(newArg, null) : [newestTee([])];
    const baseFiles = resolveSide(baseArg || 'latest', newFiles);
    const base = parseAll(baseFiles);
    const cur = parseAll(newFiles);
    const findings = [];

    console.log(`[DiffLog] base=${base.files.join(',')} new=${cur.files.join(',')}`);
    for (const [side, d] of [['base', base], ['new', cur]]) {
        if (!d.hasDone) {
            console.log(`[DiffLog] note ${side} has no [done] row (pass the driver log too: <run>-driver.log)`);
        }
        if (!d.hasPin) {
            console.log(`[DiffLog] note ${side} has no [PIN] row`);
        }
    }

    if (base.hasPin && cur.hasPin && base.pin !== cur.pin) {
        findings.push(`pin ${base.pin} -> ${cur.pin}`);
    }
    if (base.cfg.length && cur.cfg.length && JSON.stringify(base.cfg) !== JSON.stringify(cur.cfg)) {
        findings.push(`cfg ${JSON.stringify(base.cfg)} -> ${JSON.stringify(cur.cfg)}`);
    }
    if (base.hasDone && cur.hasDone) {
        // The run tag differs by design between windows; compare the verdict fields.
        const strip = (d) => { const c = Object.assign({}, d); delete c.run; return JSON.stringify(c); };
        if (strip(base.done) !== strip(cur.done)) {
            findings.push(`done ${JSON.stringify(base.done)} -> ${JSON.stringify(cur.done)}`);
        }
    }

    if (mode === 'arms') {
        // Ambient channels (AI wandering, spawn rolls, ore gen) differ run to run;
        // arms mode only looks at the deterministic channels the driver asserts.
        // C-B70TW-4: StalkerLog rows (spawn/seek) come from explicit summons and are
        // deterministic; DamageLog/MiningLog tokens are stable words (dmg/prot/mine)
        // even when ambient hits add rows, so set semantics are safe.
        const AUTO = ['BlockFaceLog', 'ItemLog', 'FarmLog', 'FoodR196Log', 'FoodLog',
            'SparkLog', 'MountLog', 'TestLog', 'VesselLog', 'StalkerLog',
            'UndeadLog', 'DamageLog', 'MiningLog'];
        // Tokens that depend on the ambient world rather than on the driver's arms
        // (mob spawns during the window); drop them before comparing.
        const NOISY = { UndeadLog: ['spawn'] };
        const keep = new Set(channels || AUTO);
        const pick = (m) => {
            const o = new Map();
            for (const [k, v] of m) {
                const ch = k.slice(1, k.indexOf(']'));
                if (!keep.has(ch)) continue;
                const tok = k.slice(k.indexOf('] ') + 2);
                if (NOISY[ch] && NOISY[ch].includes(tok)) continue;
                o.set(k, strictCounts ? v : 1);
            }
            return o;
        };
        console.log('[DiffLog] arms channels=' + [...keep].join(',')
            + ' noise=' + Object.keys(NOISY).map((c) => c + ':' + NOISY[c].join('/')).join(','));

        const ld = mapDiff(pick(base.lines), pick(cur.lines));
        if (ld.onlyA.length) findings.push('arm only-in-base: ' + ld.onlyA.join(' ; '));
        if (ld.onlyB.length) findings.push('arm only-in-new: ' + ld.onlyB.join(' ; '));
        if (ld.delta.length) findings.push('arm count: ' + ld.delta.join(' ; '));
        if (!base.lines.size && !cur.lines.size && !strictArms) {
            console.log('[DiffLog] note arms mode saw zero [XxxLog] rows on both sides — pass --strict-arms to fail instead');
        } else if (base.lines.size && cur.lines.size) {
            console.log(`[DiffLog] arms base=${base.lines.size} new=${cur.lines.size}`);
        }
    }

    const rd = mode === 'arms' ? { onlyA: [], onlyB: [], delta: [] } : mapDiff(base.rules, cur.rules);
    if (rd.onlyA.length) {
        findings.push('rule only-in-base: ' + rd.onlyA.join(', '));
    }
    if (rd.onlyB.length) {
        findings.push('rule only-in-new: ' + rd.onlyB.join(', '));
    }
    if (rd.delta.length) {
        findings.push('rule count: ' + rd.delta.join(', '));
    }

    const md = mode === 'arms' ? { onlyA: [], onlyB: [], delta: [] } : mapDiff(base.mounts, cur.mounts);
    if (md.onlyA.length) {
        findings.push('mount only-in-base: ' + md.onlyA.join(' ; '));
    }
    if (md.onlyB.length) {
        findings.push('mount only-in-new: ' + md.onlyB.join(' ; '));
    }
    if (md.delta.length) {
        findings.push('mount count: ' + md.delta.join(' ; '));
    }
    if (mode !== 'arms' && base.mayplace !== cur.mayplace) {
        findings.push(`mayplace ${base.mayplace} -> ${cur.mayplace}`);
    }

    const tags = Array.from(new Set([...Object.keys(base.arms), ...Object.keys(cur.arms)])).sort();
    for (const tag of tags) {
        const kd = jsonKeyDiff(base.arms[tag], cur.arms[tag]);
        if (kd.onlyA.length || kd.onlyB.length || kd.changed.length) {
            findings.push(`${tag} keys -${kd.onlyA.join(',')} +${kd.onlyB.join(',')} changed=${kd.changed.join(',')}`);
        }
    }

    for (const f of findings) {
        console.log('[DiffLog] DIFF ' + f);
    }
    console.log(`[DiffLog] summary rules base=${base.rules.size} new=${cur.rules.size} ` +
        `mounts base=${base.mounts.size} new=${cur.mounts.size} mayplace=${cur.mayplace} diffs=${findings.length}`);
    console.log('[DiffLog] verdict ' + (findings.length ? 'DIFF' : 'MATCH'));
    return findings.length ? 1 : 0;
}

try {
    process.exit(main(process.argv));
} catch (e) {
    console.error('[DiffLog] error ' + e.message);
    process.exit(2);
}
