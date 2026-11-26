#!/usr/bin/env node
/**
 * harness.js - per-batch smoke harness (B-70T).
 *
 * A batch script should declare only its verdict channels and arms. Everything
 * that repeated across the 448 scripts in testharness/player lives here: boot and
 * shutdown with props/cfg snapshot-restore, PIN stamping, log slicing, [done]
 * emission and the exit-code policy.
 *
 * 中文：每批脚本只写判据与判臂；起停服、props/cfg 快照还原、PIN、日志切片、
 * [done] 输出与退出码策略统一收在此处。方法名照存量抄（cmd/mark/slice/waitRow/
 * stampPin/startBoot/stopBoot），迁移时脚本正文不用改写。
 *
 * Usage (migrated script):
 *   const L = require('./f7-wb-lib.js');
 *   const H = require('./lib/harness.js');
 *   const h = H.create({ run: process.env.RUN || 'r1', world: (run) => 'w-b69-' + run + '-v1',
 *     cfg: ['blockDebugLog', 'sparkR196', 'mountedR196'], props: { 'allow-flight': 'true' } });
 *   const { cmd, mark, slice, waitRow } = h;
 */
'use strict';
const fs = require('fs');
const L = require('../f7-wb-lib.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 1.12 has no block-state syntax: `name[prop=n]` becomes `name <meta>`. */
function bs(s) {
    return s.replace(/([A-Za-z0-9_:.]+)\[(?:moisture|age)=(\d+)\]/g, '$1 $2');
}

/** Leading-whitespace width of a line (tab counts as one). */
function indentOf(line) {
    const m = /^[ \t]*/.exec(line);
    return m ? m[0].length : 0;
}

/**
 * Line range of a top-level cfg section. The close is the first `}` after the
 * header that sits at the header's own indent, so a nested block's closer
 * (deeper) cannot end the section early.
 */
function sectionBounds(lines, section) {
    const head = lines.findIndex((s) => s.trim() === section + ' {');
    if (head < 0) {
        throw new Error('cfg section missing: ' + section);
    }
    const indent = indentOf(lines[head]);
    const end = lines.findIndex((s, i) => i > head && s.trim() === '}' && indentOf(s) === indent);
    if (end < 0) {
        throw new Error('cfg section unclosed: ' + section);
    }
    return [head, end];
}

/** Read `B:<key>` from inside `section` only; `null` when absent or not in it. */
function readCfgEntry(text, section, key) {
    const lines = text.split(/\r?\n/);
    const [head, end] = sectionBounds(lines, section);
    for (let i = head + 1; i < end; i++) {
        const m = /^\s+([A-Z]):(\S+)=(.*)$/.exec(lines[i]);
        if (m && m[2] === key) {
            return { type: m[1], value: m[3] };
        }
    }
    return null;
}

/** Insert `    B:<key>=<value>` just before a cfg section's closing brace. */
function insertCfgEntry(text, section, key, value) {
    const lines = text.split(/\r?\n/);
    const [, end] = sectionBounds(lines, section);
    const lead = ' '.repeat(indentOf(lines[end]) + 4);
    lines.splice(end, 0, lead + 'B:' + key + '=' + value);
    return lines.join('\n');
}

/** Force `B:<key>=<value>` inside `section`, editing in place or inserting. */
function setCfgEntry(text, section, key, value) {
    const lines = text.split(/\r?\n/);
    const [head, end] = sectionBounds(lines, section);
    for (let i = head + 1; i < end; i++) {
        const m = /^([ \t]+)([A-Z]):(\S+)=(.*)$/.exec(lines[i]);
        if (m && m[3] === key) {
            if (m[2] !== 'B') {
                throw new Error('cfg key ' + section + ':' + key + ' is not a boolean');
            }
            lines[i] = m[1] + 'B:' + key + '=' + value;
            return lines.join('\n');
        }
    }
    return insertCfgEntry(text, section, key, value);
}

/** `'blocks:sparkR196'` or plain `'sparkR196'` (blocks section). */
function cfgPair(item) {
    if (Array.isArray(item)) {
        return item;
    }
    const i = item.indexOf(':');
    return i < 0 ? ['blocks', item] : [item.slice(0, i), item.slice(i + 1)];
}

/** Default stage: server-side creative park, no spawns, fixed noon, flat stone arena. */
const DEFAULT_RULES = {
    doMobLoot: 'false', doTileDrops: 'true', doDaylightCycle: 'false', doFireTick: 'false',
    keepInventory: 'true', naturalRegeneration: 'false', doWeatherCycle: 'false', doMobSpawning: 'false',
};

/**
 * Build one harness bound to a batch run tag.
 *
 * opts:
 *   run      run tag used in [done] and log names (default r1)
 *   world    world name string, or (run) => name
 *   bot      bot username (default L.BOT)
 *   cfg      cfg keys forced to true for the window, restored on stop
 *   props    server.properties keys forced for the window, restored on stop
 *   stage    { gamemode, difficulty, time, weather, rules: {name: value}, tp: [x,y,z],
 *              fill: ['fill ...'], lookAt: [x,y,z] }
 */
function create(opts) {
    const o = opts || {};
    const run = o.run || process.env.RUN || 'r1';
    const botName = o.bot || L.BOT;
    const world = typeof o.world === 'function' ? o.world(run) : (o.world || L.getProp(fs.readFileSync(L.PROPS, 'utf8'), 'level-name'));
    const expectedSha = o.expectedSha || process.env.EXPECTED_SHA || L.PIN.releaseSha;

    const h = {
        run, world, botName,
        srv: null, bot: null,
        propsBefore: null, cfgBefore: null,
        stops: [],
        pinOk: false,
        driverLog: path.join(L.ROOT, 'testharness', 'build-logs', run + '-driver.log'),
    };
    fs.writeFileSync(h.driverLog, '', 'utf8');

    /** Print one driver row and mirror it to `<run>-driver.log` for later diffing. */
    function say(...parts) {
        const line = parts.map((p) => (typeof p === 'string' ? p : JSON.stringify(p))).join(' ');
        fs.appendFileSync(h.driverLog, line + '\n', 'utf8');
        console.log(line);
    }

    /** Read the live server log tail as split lines. */
    function logLines() {
        try {
            return fs.readFileSync(h.srv.logPath, 'utf8').split(/\r?\n/);
        } catch (e) {
            return [];
        }
    }

    /** Line count now; pass to slice()/waitRow() to scope a probe. */
    function mark() {
        return logLines().length;
    }

    /** Lines written since `from`. */
    function slice(from) {
        return logLines().slice(from);
    }

    /** Send one server command (block-state shorthand converted), then wait ms. */
    async function cmd(s, wait) {
        h.srv.send(bs(s));
        await sleep(wait == null ? 250 : wait);
    }

    /** Poll the log since `from` for the first `re` hit (or timeout). */
    async function waitRow(re, from, ms) {
        const t0 = Date.now();
        while (Date.now() - t0 < ms) {
            const hit = slice(from).map((s) => re.exec(s)).filter(Boolean);
            if (hit.length) {
                return hit;
            }
            await sleep(300);
        }
        return [];
    }

    /** Poll for a literal separator/line match (e.g. 'Done ('). */
    async function waitFor(re, ms) {
        return h.srv.waitFor(re, ms);
    }

    /** Stamp release jar + refmap/manifest counts against PIN; prints one [PIN] row. */
    function stampPin() {
        const jar = fs.readFileSync(L.RELJAR);
        const sha = L.sha256(jar);
        const mk = L.mkCounts();
        const ok = sha === expectedSha && jar.length === L.PIN.releaseSize && mk.ok;
        h.pinOk = ok;
        say(`[PIN] sha=${sha} shaOk=${sha === expectedSha} size=${jar.length} sizeOk=${jar.length === L.PIN.releaseSize} mkOk=${mk.ok} ok=${ok}`);
        return ok;
    }

    /** Start the dev server for this batch window; retries while the port drains. */
    async function boot(tag) {
        const t = tag || run;
        h.propsBefore = fs.readFileSync(L.PROPS, 'utf8');
        h.cfgBefore = fs.readFileSync(L.CFG, 'utf8');
        let props = h.propsBefore;
        if (o.props) {
            for (const [k, v] of Object.entries(o.props)) {
                props = L.setProp(props, k, v);
            }
        }
        if (world) {
            props = L.setProp(props, 'level-name', world);
        }
        fs.writeFileSync(L.PROPS, props, 'utf8');
        let bootCfg = h.cfgBefore;
        const forced = (o.cfg || []).map(cfgPair);
        for (const [section, key] of forced) {
            // Edit or insert inside the declared section only: a key that exists
            // under another section must not be mistaken for this one.
            bootCfg = setCfgEntry(bootCfg, section, key, 'true');
        }
        for (let attempt = 1; attempt <= 3; attempt++) {
            for (let i = 0; i < 36 && L.netstatListen(L.PORT) !== 0; i++) {
                await sleep(5000);
            }
            if (L.netstatListen(L.PORT) !== 0) {
                throw new Error(`port ${L.PORT} still held`);
            }
            fs.writeFileSync(L.CFG, bootCfg, 'utf8');
            h.srv = await L.startServer({ root: L.ROOT, tag: t });
            if (await h.srv.waitFor(/Done \(/, 180000)) {
                const disk = fs.readFileSync(L.CFG, 'utf8');
                const badFlags = [];
                for (const [section, key] of forced) {
                    // Read back inside the same section: a true sitting under
                    // another section means the server never saw this flag.
                    const hit = readCfgEntry(disk, section, key);
                    if (!hit || hit.value !== 'true') {
                        badFlags.push(section + ':' + key + '=' + (hit ? hit.value : 'absent'));
                    }
                }
                if (badFlags.length) {
                    throw new Error('cfg not forced after boot: ' + badFlags.join(' '));
                }
                say('[cfg]', t, ...forced.map(([, key]) => key + '=true'));
                return;
            }
            try { await h.srv.stop(30000); } catch (e) { /* noop */ }
            h.srv = null;
        }
        throw new Error('no Done( in 3 attempts');
    }

    /** Stop the server gracefully and restore props/cfg; records the stop status. */
    async function stop() {
        try {
            if (h.bot) { h.bot.quit(); h.bot = null; await sleep(1500); }
        } catch (e) { /* noop */ }
        const st = h.srv ? await h.srv.stop() : { exitCode: 0 };
        h.srv = null;
        h.stops.push(st);
        if (h.propsBefore) { fs.writeFileSync(L.PROPS, h.propsBefore, 'utf8'); }
        if (h.cfgBefore) { fs.writeFileSync(L.CFG, h.cfgBefore, 'utf8'); }
        say('[stop]', JSON.stringify(st));
        return st;
    }

    /** Join the bot and lay the standard arena (op, gamerules, tp, fill). */
    async function join() {
        const s = o.stage || {};
        h.bot = await L.joinBot(h.srv, botName);
        await sleep(1500);
        try { h.bot.physicsEnabled = false; } catch (e) { /* noop */ }
        try { h.bot.physics.enabled = false; } catch (e) { /* noop */ }
        await cmd('op ' + botName, 500);
        await cmd('gamemode ' + (s.gamemode === undefined ? 0 : s.gamemode) + ' ' + botName, 300);
        const rules = Object.assign({}, DEFAULT_RULES, s.rules || {});
        for (const [k, v] of Object.entries(rules)) {
            await cmd('gamerule ' + k + ' ' + v, 150);
        }
        await cmd('difficulty ' + (s.difficulty === undefined ? 2 : s.difficulty), 200);
        await cmd('weather ' + (s.weather || 'clear'), 150);
        await cmd('time set ' + (s.time === undefined ? 6000 : s.time), 250);
        if (s.tp) {
            await cmd(`tp ${botName} ${s.tp.join(' ')}`, 1200);
        }
        for (const f of (s.fill || [])) {
            await cmd(f, 900);
        }
    }

    /** Print the [done] row and exit 0 only when pin/arms/stops are all clean. */
    function finish(res) {
        const bad = Object.keys(res).filter((k) => !res[k]);
        const out = Object.assign({ run, pin: h.pinOk }, res, {
            stops: h.stops.filter((s) => !(s && s.exitCode === 0)).length,
            crashes: L.crashCount(),
            pass: h.pinOk && bad.length === 0,
            bad: bad.length,
            badKeys: bad,
        });
        say('[done] ' + JSON.stringify(out));
        process.exit(out.pass && out.stops === 0 ? 0 : 2);
    }

    /** Run main() and funnel any throw through stop() + exit 1. */
    function guard(fn) {
        Promise.resolve().then(fn).catch(async (e) => {
            console.error('[fatal]', (e && e.stack) || e);
            try { await stop(); } catch (x) { /* noop */ }
            process.exit(1);
        });
    }

    Object.assign(h, { logLines, mark, slice, cmd, waitRow, waitFor, stampPin, boot, stop, join, finish, guard });
    return h;
}

module.exports = { create, bs, DEFAULT_RULES, insertCfgEntry, setCfgEntry, readCfgEntry, cfgPair };
