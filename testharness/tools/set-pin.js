#!/usr/bin/env node
/*
 * set-pin.js — 钉值自愈与校验（B-70US）
 *
 * 每批 build 之后都要手改 `testharness/player/f7-wb-lib.js:35` 的 PIN：size、两个 sha、MK 计数。
 * 手敲会漏会错，而错误只在判窗开窗时才暴露，等于白跑一轮。
 *
 * 用法：
 *   node testharness/tools/set-pin.js --build b71-build1     # 从 build/libs 实测并改写整行
 *   node testharness/tools/set-pin.js --check                # PIN 是否等于磁盘上的 jar（preflight 用）
 *   node testharness/tools/set-pin.js                        # 只打印实测值，不改文件
 *
 * 退出码：0 = OK / 已写；1 = 不一致（--check）或写失败；2 = 缺 jar。
 * 环境：PIN_REPO（mod 仓根）、PIN_FILE（f7-wb-lib.js 路径）。
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const argv = process.argv.slice(2);
function arg(name, dflt) {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : dflt;
}

const REPO = path.resolve(arg('--repo', process.env.PIN_REPO || path.join(__dirname, '..', '..')));
const PIN_FILE = path.resolve(arg('--pin-file', process.env.PIN_FILE
    || path.join(REPO, 'testharness', 'player', 'f7-wb-lib.js')));
const CHECK = argv.includes('--check');
const BUILD = arg('--build', null);

const JARS = {
    release: path.join(REPO, 'build', 'libs', 'etim-1.0.0.jar'),
    dev: path.join(REPO, 'build', 'libs', 'etim-1.0.0-dev.jar'),
    sources: path.join(REPO, 'build', 'libs', 'etim-1.0.0-sources.jar')
};
const REFMAP_A = path.join(REPO, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(REPO, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(REPO, 'src', 'main', 'resources', 'mixins.etim.json');

function sha256(file) {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
}

function measure() {
    const out = {};
    for (const [k, f] of Object.entries(JARS)) {
        if (!fs.existsSync(f)) {
            console.log('[PinLog] missing jar: ' + path.relative(REPO, f));
            process.exit(2);
        }
        const st = fs.statSync(f);
        out[k] = { size: st.size, sha: sha256(f) };
    }

    const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
    const mk = {};
    for (const [k, f] of [['a', REFMAP_A], ['b', REFMAP_B]]) {
        if (!fs.existsSync(f)) {
            console.log('[PinLog] missing refmap: ' + path.relative(REPO, f));
            process.exit(2);
        }
        const r = read(f);
        const entries = Object.values(r.mappings).reduce((n, x) => n + Object.keys(x).length, 0);
        mk[k] = { classes: Object.keys(r.mappings).length, entries, dual: entries * 2 };
    }
    const manifest = read(MIXIN_JSON);
    out.mk = {
        classes: mk.a.classes,
        entries: mk.a.entries,
        dual: mk.a.dual,
        mixins: manifest.mixins.length,
        client: (manifest.client || []).length
    };
    out.mkB = mk.b;
    out.mkOk = mk.a.classes === mk.b.classes && mk.a.entries === mk.b.entries;
    return out;
}

function readPin() {
    const text = fs.readFileSync(PIN_FILE, 'utf8');
    const m = text.match(/^const PIN = (\{[^\n]*\});/m);
    if (!m) {
        console.log('[PinLog] no `const PIN = {...};` line in ' + path.relative(REPO, PIN_FILE));
        process.exit(1);
    }
    const obj = JSON.parse(m[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
    const mk = text.match(/^const MK_PIN = (\{[^\n]*\});/m);
    return { obj, mk: mk ? mk[1] : null, text, line: m[0] };
}

function lineFor(build, m) {
    const q = (v) => "'" + v + "'";
    return 'const PIN = { build: ' + q(build)
        + ', releaseSize: ' + m.release.size
        + ', releaseSha: ' + q(m.release.sha)
        + ', devSha: ' + q(m.dev.sha)
        + ', sourcesSha: ' + q(m.sources.sha) + ' };';
}

function lineForMk(build, m) {
    return 'const MK_PIN = { classes: ' + m.mk.classes + ', entries: ' + m.mk.entries
        + ', dual: ' + m.mk.dual + ', mixins: ' + m.mk.mixins + ', client: ' + m.mk.client
        + " }; // " + build;
}

const m = measure();
if (!m.mkOk) {
    console.log('[PinLog] refmap A/B disagree: A=' + m.mk.classes + '/' + m.mk.entries
        + ' B=' + m.mkB.classes + '/' + m.mkB.entries + ' (stale build?)');
}
const pin = readPin();

const same = pin.obj.releaseSize === m.release.size
    && pin.obj.releaseSha === m.release.sha
    && pin.obj.devSha === m.dev.sha
    && pin.obj.sourcesSha === m.sources.sha;

if (CHECK) {
    const mkPinOk = !pin.mk || (
        /classes:\s*(\d+)/.exec(pin.mk)[1] === String(m.mk.classes)
        && /entries:\s*(\d+)/.exec(pin.mk)[1] === String(m.mk.entries)
        && /mixins:\s*(\d+)/.exec(pin.mk)[1] === String(m.mk.mixins)
        && /client:\s*(\d+)/.exec(pin.mk)[1] === String(m.mk.client));
    const ok = same && mkPinOk;
    console.log('[PinLog] pin=' + pin.obj.build + ' release=' + pin.obj.releaseSize + '/' + pin.obj.releaseSha.slice(0, 8)
        + ' actual=' + m.release.size + '/' + m.release.sha.slice(0, 8)
        + ' mk=' + m.mk.classes + '/' + m.mk.entries + '/' + m.mk.dual + '+' + m.mk.mixins + '/' + m.mk.client
        + ' match=' + ok + ' verdict=' + (ok ? 'OK' : 'STALE'));
    if (!ok) {
        console.log('[PinLog] fix: node testharness/tools/set-pin.js --build <name>');
    }
    process.exit(ok ? 0 : 1);
}

if (!BUILD) {
    console.log('[PinLog] measured release=' + m.release.size + ' ' + m.release.sha
        + ' dev=' + m.dev.size + ' ' + m.dev.sha
        + ' sources=' + m.sources.size + ' ' + m.sources.sha
        + ' mk=' + m.mk.classes + '/' + m.mk.entries + '/' + m.mk.dual + '+' + m.mk.mixins + '/' + m.mk.client);
    console.log('[PinLog] current pin=' + pin.obj.build + ' match=' + same + ' (dry run: pass --build <name> to write)');
    process.exit(same ? 0 : 1);
}

const nextPin = pin.text.replace(pin.line, lineFor(BUILD, m));
const mkLine = (pin.text.match(/^const MK_PIN = [^\n]*;.*$/m) || [null])[0];
const next = mkLine ? nextPin.replace(mkLine, lineForMk(BUILD, m)) : nextPin;
if (next === pin.text) {
    console.log('[PinLog] nothing to write');
} else {
    fs.writeFileSync(PIN_FILE, next, 'utf8');
}

// 回读校验：写进去的东西必须能被 require 重新解析出同样的值
delete require.cache[require.resolve(PIN_FILE)];
const reloaded = require(PIN_FILE).PIN;
const ok = reloaded.build === BUILD
    && reloaded.releaseSize === m.release.size
    && reloaded.releaseSha === m.release.sha
    && reloaded.devSha === m.dev.sha
    && reloaded.sourcesSha === m.sources.sha;
console.log('[PinLog] wrote build=' + BUILD + ' release=' + m.release.size + '/' + m.release.sha.slice(0, 8)
    + ' mk=' + m.mk.classes + '/' + m.mk.entries + '/' + m.mk.dual + '+' + m.mk.mixins + '/' + m.mk.client
    + ' reload=' + ok + ' verdict=' + (ok ? 'OK' : 'FAIL'));
process.exit(ok ? 0 : 1);
