#!/usr/bin/env node
/**
 * 收口一致性自检（只读）：账册最新一条与 git / sessions 是否对得上。
 *
 *   node testharness/tools/check-closeout.js
 *   node testharness/tools/check-closeout.js --repo <dir> --root <books>
 *
 * 规则（全部针对「最新一条」，历史条只查 待提交 残留）：
 *   R1 stale-pending  非最新条仍写「待提交」          → 失败
 *   R2 dead-hash      最新条引用的短哈希不在 git log  → 失败
 *   R3 missing-sessions 最新条的批次号在 sessions.md 无 `## <批次>` → 失败
 *   R4 push-state     最新条写「已推送」但 origin 仍有提交（或写的欠数不符）→ 失败
 *
 * 退出码：0 干净 / 1 有风险 / 2 账本树或仓库缺失。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const argOf = (flag) => {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? path.resolve(argv[i + 1]) : null;
};
const ROOT = argOf('--root') || (process.env.BOOKS_ROOT ? path.resolve(process.env.BOOKS_ROOT)
    : path.resolve(__dirname, '..', '..', '..', '..'));
const LEDGER = path.join(ROOT, 'playground', 'audit', '账册', '现行账.md');
const SESSIONS = path.join(ROOT, 'playground', 'sessions.md');
const REPO = argOf('--repo') || path.join(ROOT, 'git-workspace', 'etim');

function git(args, silent) {
    return execFileSync('git', ['-C', REPO, ...args], {
        encoding: 'utf8',
        stdio: silent ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'pipe'],
    }).trim();
}

if (!fs.existsSync(LEDGER) || !fs.existsSync(SESSIONS)) {
    console.log('[CloseoutLog] SKIP books tree absent at ' + ROOT);
    process.exit(0);
}
if (!fs.existsSync(path.join(REPO, '.git'))) {
    console.log('[CloseoutLog] SKIP git repo absent at ' + REPO);
    process.exit(2);
}

const lines = fs.readFileSync(LEDGER, 'utf8').split(/\r?\n/);
const entries = [];
lines.forEach((s) => {
    const m = /^### 条 (\d+)\s*[·｜]?\s*(.*)$/.exec(s);
    if (m) {
        entries.push({ n: Number(m[1]), title: m[2] || '' });
    }
});
if (!entries.length) {
    console.log('[CloseoutLog] FAIL no `### 条 N` entries found');
    process.exit(1);
}
const latest = entries.reduce((a, b) => (b.n > a.n ? b : a));
const startIdx = lines.findIndex((s) => new RegExp('^### 条 ' + latest.n + '(\\D|$)').test(s));
const body = lines.slice(startIdx).join('\n');
const sessions = fs.readFileSync(SESSIONS, 'utf8');

const risks = [];

// R1: an older entry still says 待提交 (the newest may legitimately say it before commit)
for (const e of entries) {
    if (e.n === latest.n) {
        continue;
    }
    const i = lines.findIndex((s) => new RegExp('^### 条 ' + e.n + '(\\D|$)').test(s));
    const next = lines.findIndex((s, j) => j > i && /^### 条 \d+/.test(s));
    const text = lines.slice(i, next < 0 ? lines.length : next).join('\n');
    // Only the status line counts: entries may legitimately *describe* the
    // R1 rule (and thus the word 待提交) in their prose.
    if (/^-\s*\*\*收口提交\*\*.*待提交/m.test(text)) {
        risks.push(`R1 条 ${e.n} 仍写「待提交」`);
    }
}

// R2: short commit hashes in the newest entry must exist
const hashes = new Set();
// Hex runs of 7..39 chars that contain at least one letter. The run-based
// scan keeps 40/64-char SHA1/SHA256 digests out: their digit-only windows
// used to be mis-read as short commit hashes.
// A digest truncated with an ellipsis (either half) (dev/sources `B2B7049C…`) is a note, not
// a commit id, and must not be resolved.
const ELLIPSIS_RE = /^\s*(…|\.\.\.)/;
for (const m of body.matchAll(/[0-9a-fA-F]{7,}/g)) {
    const run = m[0];
    if (run.length > 39 || !/[a-fA-F]/.test(run)) {
        continue;
    }
    if (ELLIPSIS_RE.test(body.slice(m.index + run.length, m.index + run.length + 4))) {
        continue;
    }
    // Same for the tail half of a truncated pair: `C93AF115…737E02CF` is one
    // digest written with a gap, not a commit id.
    if (/(…|\.\.\.)\s*$/.test(body.slice(Math.max(0, m.index - 4), m.index))) {
        continue;
    }
    hashes.add(run.toLowerCase());
}
for (const h of hashes) {
    try {
        git(['cat-file', '-e', h + '^{commit}'], true);
    } catch {
        risks.push(`R2 条 ${latest.n} 引用 ${h}，git 中不存在`);
    }
}

// R3: newest entry's batch id must have a sessions heading
const batch = (body.match(/\b(B-\d+[A-Z]*(?:-\d+)?)\b/) || [])[1];
if (!batch) {
    risks.push(`R3 条 ${latest.n} 标题中找不到批次号`);
} else if (!new RegExp('^## ' + batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(\\D|$)', 'm').test(sessions)) {
    risks.push(`R3 条 ${latest.n} 批次 ${batch} 在 sessions.md 无「## ${batch}」段`);
}

// R4: push state written in the newest entry must match origin
let ahead = 0;
try {
    ahead = Number(git(['rev-list', '--count', 'origin/master..HEAD']));
} catch {
    ahead = NaN;
}
const claimPushed = /已推送|推送讫/.test(body);
const claimAhead = /origin\s*欠\s*(\d+)/.exec(body);
if (Number.isNaN(ahead)) {
    risks.push('R4 无法读取 origin/master..HEAD');
} else if (claimPushed && ahead !== 0) {
    risks.push(`R4 条 ${latest.n} 写「已推送」，但 origin 仍欠 ${ahead}`);
} else if (claimAhead && Number(claimAhead[1]) !== ahead) {
    risks.push(`R4 条 ${latest.n} 写「origin 欠 ${claimAhead[1]}」，实际 ${ahead}`);
}

const say = (s) => console.log('[CloseoutLog] ' + s);
say(`entry=${latest.n} batch=${batch || '?'} ahead=${ahead} hashes=${hashes.size}`);
for (const r of risks) {
    say('RISK ' + r);
}
say(`risk=${risks.length} verdict ` + (risks.length ? 'FAIL' : 'OK'));
process.exit(risks.length ? 1 : 0);
