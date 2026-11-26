#!/usr/bin/env node
/**
 * batch-status — 单个批次「到哪一步了」的只读真值视图（B-70TI）。
 *
 * 现在一个批次的状态散在五处：census 翻面、verdict 正本、判窗回执、账册条、
 * sessions 段，再加一个 git 提交与推送。收口错已真出过三次（条 414 漏改推送
 * 状态、条 427 待提交、条 353 行号错），本工具把它们拼成一行一行的状态，
 * 让「这批到底完没完」一次说清。
 *
 * 用法：
 *   node testharness/tools/batch-status.js B-70TH
 *   node testharness/tools/batch-status.js --all      # 账册里每个批次一行
 *   node testharness/tools/batch-status.js --latest   # 账册最新一条
 *
 * 环境：`BATCH_ROOT`（工作区根）/ `BATCH_REPO`（mod 仓库）可指别处。
 * 退出码：0 已收口且推送态一致 / 1 有缺口或风险 / 2 找不到该批次。
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const argv = process.argv.slice(2);
const ROOT = process.env.BATCH_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const REPO = process.env.BATCH_REPO || path.resolve(__dirname, '..', '..');
const BOOKS = path.join(ROOT, 'playground', 'audit');
const LEDGER = path.join(BOOKS, '账册', '现行账.md');
const SESSIONS = path.join(ROOT, 'playground', 'sessions.md');
const REPORTS = path.join(REPO, 'testharness', 'reports');
const CENSUS = path.join(BOOKS, 'census');

function blank(s) { return /^\s*$/.test(s); }
function say(s) { console.log(s); }
function read(p, dflt) { try { return fs.readFileSync(p, 'utf8'); } catch { return dflt; } }
function git(args) { return execFileSync('git', ['-C', REPO, ...args], { encoding: 'utf8' }).trim(); }

/** B-70TH -> b70th (report filename prefix). */
function slugOf(batch) { return batch.toLowerCase().replace(/-/g, ''); }

function ledgerEntries() {
    const t = read(LEDGER, '');
    const lines = t.split(/\r?\n/);
    const out = [];
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^### 条 (\d+) · (.+)$/);
        if (!m) continue;
        let j = i + 1;
        while (j < lines.length && !/^### 条 \d+/.test(lines[j])) j++;
        out.push({ n: +m[1], title: m[2], body: lines.slice(i, j).join('\n') });
        i = j - 1;
    }
    return out;
}

function batchOf(title) {
    const m = title.match(/\bB-\d+[A-Z]*(?:-\d+)?\b/);
    return m ? m[0] : null;
}

function censusMentions(batch) {
    let landed = 0, unrec = 0;
    let vols = [];
    try { vols = fs.readdirSync(CENSUS).filter((f) => f.startsWith('普查') && f.endsWith('.md')); } catch { return null; }
    const re = new RegExp('（' + batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[；;）]');
    for (const v of vols) {
        const L = read(path.join(CENSUS, v), '').split(/\r?\n/);
        for (const s of L) {
            if (!s.startsWith('[面]') || !re.test(s)) continue;
            if (s.includes('状态:【已落地')) landed++;
            else if (s.includes('状态:【未立项')) unrec++;
        }
    }
    return { landed, unrec };
}

function statusOf(batch, verbose) {
    const slug = slugOf(batch);
    const entry = ledgerEntries().find((e) => batchOf(e.title) === batch);
    const verdictPath = path.join(REPORTS, slug + '-verify-verdict.md');
    const receiptPath = path.join(REPORTS, slug + '-verify-receipt.md');
    const verdict = read(verdictPath, null);
    const receipt = read(receiptPath, null);
    const sessionsText = read(SESSIONS, '');
    const hasSession = new RegExp('^## ' + batch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'm').test(sessionsText);
    const census = censusMentions(batch);

    const risks = [];
    const rows = [];

    // census
    if (census === null) rows.push('census   : (no census tree)');
    else rows.push(`census   : landed=${census.landed} unrecorded=${census.unrec}`);

    // verdict
    if (!verdict) {
        const product = census && census.landed > 0;
        rows.push('verdict  : ' + (product ? 'MISSING' : 'n/a (no product faces)') + ' (' + path.basename(verdictPath) + ')');
        if (product) risks.push('产品批缺正本 verdict');
    } else {
        // Verdict extraction, in priority order:
        //   1) an explicit 状态/终判/判决/判定/结论 line carrying PASS or FAIL;
        //   2) the last "pass": true|false in the harness [done] JSON;
        //   3) presence heuristic (PASS without FAIL).
        // Only an explicit announcement counts ("状态：**PASS**", "终判：PASS",
        // "**判决**：W0 ✓｜…"), and the FIRST one wins: later lines may discuss
        // historical FAIL rounds inside C-items.
        const vlines = verdict.split(/\r?\n/);
        let line = '';
        for (const s of vlines) {
            if (!blank(s) && /(状态|终判|判决|判定|结论)\s*\*{0,2}\s*[:：]/.test(s)
                && /PASS|FAIL|放行|退回|[✓✔✗✘]/.test(s)) { line = s; break; }
        }
        let pass;
        if (line) {
            // Older verdicts use ✓/✗ instead of the words PASS/FAIL.
            if (/[✓✔]/.test(line) && !/[✗✘]/.test(line)) pass = true;
            else pass = /PASS|放行/.test(line) && !/FAIL|退回/.test(line);
        } else {
            const done = [...verdict.matchAll(/"pass"\s*:\s*(true|false)/g)];
            if (done.length) {
                pass = done[done.length - 1][1] === 'true';
                line = '(from [done] pass=' + done[done.length - 1][1] + ')';
            } else {
                const anyPass = /PASS/.test(verdict);
                const anyFail = /FAIL|退回/.test(verdict);
                pass = anyPass && !anyFail;
                line = anyPass || anyFail ? '(inferred from PASS/FAIL presence)' : '(no verdict text)';
            }
        }
        line = line.trim().slice(0, 120);
        rows.push(`verdict  : ${pass ? 'PASS' : 'NOT-PASS'} | ${line}`);
        if (!pass) risks.push('verdict 非 PASS');
    }
    if (!receipt) rows.push('receipt  : ' + (census && census.landed > 0 ? 'MISSING' : 'n/a') + ' (' + path.basename(receiptPath) + ')');
    else rows.push(`receipt  : ${receipt.split(/\r?\n/).length} lines / ${Buffer.byteLength(receipt, 'utf8')} B`);

    // ledger + sessions + commit + push
    if (!entry) {
        rows.push('ledger   : MISSING entry');
        risks.push('账册无该批次条');
    } else {
        const close = (entry.body.match(/^-\s*\*\*收口提交\*\*：(.*)$/m) || [])[1] || '';
        const pending = /待提交/.test(close);
        const hash = (close.match(/`([0-9a-f]{7,40})`/) || [])[1] || null;
        const hashOk = hash ? (() => { try { git(['cat-file', '-e', hash + '^{commit}']); return true; } catch { return false; } })() : false;
        rows.push(`ledger   : 条 ${entry.n} | hash=${hash || '-'}${hash && !hashOk ? ' (NOT IN GIT)' : ''} | ${pending ? '待提交' : '已记'}`);
        if (pending) risks.push('账册收口行仍是待提交');
        if (hash && !hashOk) risks.push('账册引用的哈希不在 git 里');
    }
    rows.push('sessions : ' + (hasSession ? 'ok' : 'MISSING `## ' + batch + '`'));
    if (!hasSession) risks.push('sessions 缺段');

    let ahead = null;
    try { ahead = +git(['rev-list', '--count', 'origin/master..HEAD']); } catch { ahead = null; }
    rows.push('git      : HEAD=' + (() => { try { return git(['rev-parse', '--short', 'HEAD']); } catch { return '?'; } })()
        + ' ahead=' + (ahead === null ? '?' : ahead));

    // push claim vs truth — judged on THIS entry's hash, not on the global
    // ahead count: later batches may still be unpushed without making the
    // older entry's claim false.
    if (entry) {
        const close = (entry.body.match(/^-\s*\*\*收口提交\*\*：(.*)$/m) || [])[1] || '';
        const claimsPushed = /已推送|推送讫|已在 origin\/master/.test(close);
        const hash = (close.match(/`([0-9a-f]{7,40})`/) || [])[1] || null;
        let onOrigin = null;
        if (hash) {
            try { git(['merge-base', '--is-ancestor', hash, 'origin/master']); onOrigin = true; } catch { onOrigin = false; }
        }
        if (claimsPushed && onOrigin === false) risks.push('账册写已推送，但 ' + hash + ' 不在 origin/master');
        if (!claimsPushed && onOrigin === true) risks.push('账册未记已推送，但 ' + hash + ' 已在 origin/master');
    }

    const head = `[BatchLog] ${batch} | ledger=${entry ? '条 ' + entry.n : '-'}`;
    if (verbose) {
        say(head);
        for (const r of rows) say('[BatchLog]   ' + r);
    } else {
        say(head + ' | ' + rows.map((r) => r.split(':')[0].trim() + '=' + r.split(':').slice(1).join(':').trim().split(' | ')[0]).join(' | '));
    }
    if (risks.length) say('[BatchLog]   RISK ' + risks.join(' / '));
    return { risks, found: !!(entry || verdict || hasSession) };
}

// ---------------------------------------------------------------- dispatch
if (argv.includes('--all')) {
    const batches = ledgerEntries().map((e) => batchOf(e.title)).filter(Boolean);
    const uniq = [...new Set(batches)];
    let bad = 0;
    for (const b of uniq) {
        const r = statusOf(b, false);
        if (r.risks.length) bad++;
    }
    say(`[BatchLog] batches=${uniq.length} withRisk=${bad}`);
    process.exit(bad ? 1 : 0);
}

let batch = argv.find((a) => /^B-\d+/i.test(a));
if (argv.includes('--latest') || !batch) {
    const last = ledgerEntries().slice(-1)[0];
    batch = last ? batchOf(last.title) : null;
}
if (!batch) { say('[BatchLog] no batch given and ledger empty'); process.exit(2); }
batch = batch.toUpperCase();

const r = statusOf(batch, true);
if (!r.found) { say('[BatchLog] verdict INCOMPLETE (batch not found)'); process.exit(2); }
say(`[BatchLog] verdict ${r.risks.length ? 'RISK' : 'OK'}`);
process.exit(r.risks.length ? 1 : 0);
