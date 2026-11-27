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
        // Channel|field -> raw values (--mode=values). C-B70UV-2: arms mode only
        // proves a line still fires; this table proves the numbers inside did
        // not move (a refactor that turns 1500 into 1450 must not pass).
        values: new Map(),
        valueRows: 0,
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
                // key=value pairs on the same row; braces/quotes keep their spaces.
                let pairs = 0;
                for (const m of line.matchAll(/([A-Za-z_][A-Za-z0-9_]*)=("[^"]*"|\{[^}]*\}|[^\s\]]+)/g)) {
                    const field = `[${gm[1]}] ${m[1]}`;
                    const arr = out.values.get(field) || [];
                    arr.push(m[2]);
                    out.values.set(field, arr);
                    pairs++;
                }
                if (pairs) out.valueRows++;
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

// Fields whose value is environment-dependent by design: the player/bot name,
// entity instance ids, coordinates, clock and RNG seeds. Every window picks new
// ones, so comparing them would drown the real signal (C-B70UV-2).
const VALUE_IGNORE = new Set([
    'player', 'owner', 'shooter', 'uuid', 'pos', 'at', 'chunk', 'origin', 'seed',
    // entity instance ids (FoodR196Log zombie=1978 is the mob's id, not a metric).
    'zombie', 'animal', 'mob', 'target', 'attacker', 'victim', 'entity', 'entityId',
    'time', 'twt', 'worldtime', 'tick', 'ticks', 'ticksExisted', 'ms', 'elapsed',
    'uptime', 'run', 'stamp', 'x', 'y', 'z',
]);

function normToken(raw, tol) {
    let s = String(raw);
    if (s.length > 1 && s.startsWith('"') && s.endsWith('"')) {
        s = s.slice(1, -1);
    }
    // EntityZombie#2177 — the instance id changes every run.
    s = s.replace(/#\d+/g, '#N');
    // "-107.356,24.064,86.499" (drop points, block positions) — keep the shape, drop the numbers.
    if (/^-?\d+(?:\.\d+)?(?:,-?\d+(?:\.\d+)?){2}$/.test(s)) {
        s = 'vec';
    }
    if (/^-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(s)) {
        const v = Number(s);
        return 'n:' + (Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6))));
    }
    return 's:' + s;
}

function valueTable(map, keep, ignore, tol) {
    const out = new Map();
    for (const [field, arr] of map) {
        const ch = field.slice(1, field.indexOf(']'));
        if (keep && !keep.has(ch)) continue;
        const key = field.slice(field.indexOf('] ') + 2);
        if (ignore.has(key)) continue;
        const counts = new Map();
        for (const v of arr) {
            const t = normToken(v, tol);
            counts.set(t, (counts.get(t) || 0) + 1);
        }
        out.set(field, counts);
    }
    return out;
}

function numsOf(m) {
    const out = [];
    for (const [k, v] of m) {
        if (!k.startsWith('n:')) continue;
        for (let i = 0; i < v; i++) out.push(Number(k.slice(2)));
    }
    out.sort((x, y) => x - y);
    return out;
}

function strsOf(m) {
    const out = new Map();
    for (const [k, v] of m) {
        if (!k.startsWith('n:')) out.set(k, v);
    }
    return out;
}

function fmtCounts(arr, prefix) {
    const c = new Map();
    for (const n of arr) {
        const k = prefix + n;
        c.set(k, (c.get(k) || 0) + 1);
    }
    const rows = [...c.entries()];
    const head = rows.slice(0, 6).map(([k, v]) => k + '×' + v).join(' ');
    return rows.length > 6 ? head + ' …+' + (rows.length - 6) : head;
}

function valuesDiff(a, b, tol) {
    const onlyA = [];
    const onlyB = [];
    const delta = [];
    for (const [k, ma] of a) {
        if (!b.has(k)) {
            onlyA.push(k);
            continue;
        }
        const mb = b.get(k);
        const sd = mapDiff(strsOf(ma), strsOf(mb));
        for (const x of sd.delta) delta.push(k + ': ' + x);
        for (const x of sd.onlyA) delta.push(k + ': only-in-base ' + x);
        for (const x of sd.onlyB) delta.push(k + ': only-in-new ' + x);

        const na = numsOf(ma);
        const nb = numsOf(mb);
        if (na.length !== nb.length) {
            delta.push(k + ': count ' + na.length + '->' + nb.length
                + ' [' + fmtCounts(na, '') + '] -> [' + fmtCounts(nb, '') + ']');
            continue;
        }
        for (let i = 0; i < na.length; i++) {
            if (Math.abs(na[i] - nb[i]) > tol) {
                delta.push(k + ': ' + na[i] + ' -> ' + nb[i]);
                break;
            }
        }
    }
    for (const k of b.keys()) {
        if (!a.has(k)) onlyB.push(k);
    }
    return { onlyA, onlyB, delta };
}

function jsonKeyDiff(a, b) {    const ka = Object.keys(a || {}).sort();
    const kb = Object.keys(b || {}).sort();
    const onlyA = ka.filter((k) => !kb.includes(k));
    const onlyB = kb.filter((k) => !ka.includes(k));
    const changed = ka.filter((k) => kb.includes(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]));
    return { onlyA, onlyB, changed };
}

// Deterministic channels the driver asserts. Ambient ones (AILog, SpawnLog,
// WorldGenSpawnLog, OreLog, ...) vary run to run and are excluded by default in
// both arms and values modes; --channels= overrides.
const AUTO = ['BlockFaceLog', 'ItemLog', 'FarmLog', 'FoodR196Log', 'FoodLog',
    'SparkLog', 'MountLog', 'TestLog', 'VesselLog', 'StalkerLog',
    'UndeadLog', 'DamageLog', 'MiningLog'];

// Values mode additionally drops BlockFaceLog: its dropbox rows come from ambient
// block breaks (rails/tallgrass), so its field counts are world-dependent. Pass
// --channels=BlockFaceLog explicitly when that is exactly what you want to see.
const VALUE_CHANNELS = AUTO.filter((c) => c !== 'BlockFaceLog');

function main(argv) {
    const args = argv.slice(2);
    let baseArg = null;
    let newArg = null;
    let mode = 'mount';
    let strictArms = false;
    let strictCounts = false;
    let channels = null;
    let tol = 0;
    let ignore = null;
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--strict-counts') {
            strictCounts = true;
        } else if (args[i].startsWith('--tol=')) {
            tol = Number(args[i].slice(6));
            if (!(tol >= 0)) {
                throw new Error('bad --tol value');
            }
        } else if (args[i].startsWith('--ignore=')) {
            ignore = args[i].slice(9).split(',').map((s) => s.trim()).filter(Boolean);
        } else if (args[i].startsWith('--channels=')) {
            channels = args[i].slice(11).split(',').map((s) => s.trim()).filter(Boolean);
        } else if (args[i] === '--mode=arms') {
            mode = 'arms';
        } else if (args[i] === '--mode=values') {
            mode = 'values';
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

    if (mode === 'values') {
        const keep = new Set(channels || VALUE_CHANNELS);
        const ign = new Set([...VALUE_IGNORE, ...(ignore || [])]);
        const vb = valueTable(base.values, keep, ign, tol);
        const vn = valueTable(cur.values, keep, ign, tol);
        console.log('[DiffLog] values ignore=' + [...ign].join(',')
            + ' tol=' + tol + ' fields base=' + vb.size + ' new=' + vn.size);
        const vd = valuesDiff(vb, vn, tol);
        const cap = (arr) => arr.slice(0, 10).join(' ; ') + (arr.length > 10 ? ' …(+' + (arr.length - 10) + ')' : '');
        if (vd.onlyA.length) findings.push('value only-in-base: ' + cap(vd.onlyA));
        if (vd.onlyB.length) findings.push('value only-in-new: ' + cap(vd.onlyB));
        if (vd.delta.length) findings.push('value changed: ' + cap(vd.delta));
        console.log(`[DiffLog] values rows base=${base.valueRows} new=${cur.valueRows} fields=${vb.size}`);
    }

    const rd = (mode === 'arms' || mode === 'values') ? { onlyA: [], onlyB: [], delta: [] } : mapDiff(base.rules, cur.rules);
    if (rd.onlyA.length) {
        findings.push('rule only-in-base: ' + rd.onlyA.join(', '));
    }
    if (rd.onlyB.length) {
        findings.push('rule only-in-new: ' + rd.onlyB.join(', '));
    }
    if (rd.delta.length) {
        findings.push('rule count: ' + rd.delta.join(', '));
    }

    const md = (mode === 'arms' || mode === 'values') ? { onlyA: [], onlyB: [], delta: [] } : mapDiff(base.mounts, cur.mounts);
    if (md.onlyA.length) {
        findings.push('mount only-in-base: ' + md.onlyA.join(' ; '));
    }
    if (md.onlyB.length) {
        findings.push('mount only-in-new: ' + md.onlyB.join(' ; '));
    }
    if (md.delta.length) {
        findings.push('mount count: ' + md.delta.join(' ; '));
    }
    if (mode !== 'arms' && mode !== 'values' && base.mayplace !== cur.mayplace) {
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
    console.log(`[DiffLog] summary mode=${mode} rules base=${base.rules.size} new=${cur.rules.size} ` +
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
