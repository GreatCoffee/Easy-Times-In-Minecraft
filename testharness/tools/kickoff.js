#!/usr/bin/env node
/*
 * kickoff.js — 批次开箱器：把「批次工单 + 判值表」拼成四份可直接转发的任务书骨架。
 *
 *   node testharness/tools/kickoff.js B-71
 *   node testharness/tools/kickoff.js B-71 --pin b70ty-build1 --out playground/audit/kickoff
 *   node testharness/tools/kickoff.js B-71 --check        # 只比对，陈旧则 exit 1
 *
 * 产物（默认 playground/audit/kickoff/）：
 *   <batch>-0-立项.md   主会话自用：范围、面集、判值摘要、落码清单
 *   <batch>-1-摸底.md   会话六：出身核 + 一手判值
 *   <batch>-2-对照.md   会话六：对照报告（四件套）
 *   <batch>-3-终审.md   会话五：终审复签
 *   <batch>-4-判窗.md   会话七：判窗任务书
 *
 * 三要素头、纪律行、验收格式都在模板里；生成后按需补判值/面细节。
 */
const fs = require('fs');
const path = require('path');

function arg(name, dflt) {
    const i = process.argv.indexOf('--' + name);
    if (i < 0) return dflt;
    const v = process.argv[i + 1];
    return v && !v.startsWith('--') ? v : true;
}

const ROOT = process.env.KICKOFF_ROOT || path.resolve(__dirname, '..', '..', '..', '..');
const BOOKS = path.join(ROOT, 'playground', 'audit', 'census');
const PLAN = path.join(BOOKS, '批次工单.md');
const PINLIB = path.join(ROOT, 'git-workspace', 'etim', 'testharness', 'player', 'f7-wb-lib.js');
const OUT = arg('out', path.join(ROOT, 'playground', 'audit', 'kickoff'));
const CHECK = arg('check', false) === true;
const STDOUT = arg('stdout', false) === true;

const batch = process.argv[2];
if (!batch || !/^B-\d+[A-Z]*$/.test(batch)) {
    console.error('usage: kickoff.js B-<n> [--pin <build>] [--out <dir>] [--check] [--stdout]');
    process.exit(2);
}
if (!fs.existsSync(PLAN)) {
    console.error('[KickoffLog] SKIP batch plan absent: ' + PLAN);
    process.exit(0);
}

let pin = arg('pin', null);
if (!pin && fs.existsSync(PINLIB)) {
    const m = fs.readFileSync(PINLIB, 'utf8').match(/const PIN = \{\s*build:\s*'([^']+)'/);
    if (m) pin = m[1];
}
pin = pin || '(未取到 PIN)';

const plan = fs.readFileSync(PLAN, 'utf8').split(/\r?\n/);
const start = plan.findIndex((s) => s.startsWith('### ' + batch + '（') || s.startsWith('### ' + batch + '('));
if (start < 0) {
    console.error('[KickoffLog] FAIL batch not in plan: ' + batch);
    process.exit(1);
}
let end = plan.length;
for (let i = start + 1; i < plan.length; i++) {
    if (plan[i].startsWith('### B-')) { end = i; break; }
}
const block = plan.slice(start, end);

const head = block[0];
const count = (head.match(/(\d+)\s*面/) || [])[1] || '?';
const kind = (head.match(/面，(WIRE|CITE|NEW)/) || [])[1] || '?';
const comp = (block.find((s) => s.startsWith('- 组成：')) || '').replace('- 组成：', '');

const faces = [];
for (const s of block) {
    const m = s.match(/^\s+-\s+`([A-F]:\d+)`\s+(\S+)\s+——\s+(.*)$/);
    if (m) faces.push({ key: m[1], ref: m[2], desc: m[3] });
}
if (!faces.length) {
    console.error('[KickoffLog] FAIL no faces parsed for ' + batch);
    process.exit(1);
}

const vols = [...new Set(faces.map((f) => f.key.split(':')[0]))];
const valueSections = new Map();
for (const v of vols) {
    const vp = path.join(BOOKS, '判值表', '判值表-' + v + '.md');
    if (!fs.existsSync(vp)) continue;
    const lines = fs.readFileSync(vp, 'utf8').split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^## ([A-F]:\d+) · /);
        if (!m) continue;
        let j = i + 1;
        while (j < lines.length && !lines[j].startsWith('## ')) j++;
        valueSections.set(m[1], lines.slice(i + 1, j).filter((s) => s.trim()).slice(0, 12));
        i = j - 1;
    }
}

// B-70US: 每一面今天「有没有被判据窗断言」是判窗任务书的第一信息。
// 直接复用 face-assert 的分档（含豁免表），避免两处口径漂移。
const FACE_ASSERT = (() => {
    const map = new Map();
    try {
        for (const r of require('./face-assert.js').analyze().rows) {
            const file = r.key.replace(/:\d.*$/, '');
            if (!map.has(file)) map.set(file, []);
            map.get(file).push(r);
        }
    } catch (err) {
        // 账本或源码不在这棵树里时降级为「未知」，不阻塞开箱。
    }
    return map;
})();

function refSpan(ref) {
    const m = ref.match(/^(.*?):(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const s = +m[2];
    return { file: m[1], s, e: m[3] ? +m[3] : s };
}

function rowSpan(r) {
    const m = r.key.match(/^(.*?):(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const s = +m[2];
    return { s, e: m[3] ? +m[3] : s };
}

function assertCell(key, ref) {
    // 面键是「卷:工单行号」，face-assert 的键是「卷:R196 引用」——
    // 按文件名 + 行区间重叠匹配（同一文件的多个面各占一段）。
    const want = refSpan(ref);
    const cands = want ? (FACE_ASSERT.get(want.file) || []) : [];
    const r = cands.find((c) => {
        const got = rowSpan(c);
        return got && Math.max(want.s, got.s) <= Math.min(want.e, got.e);
    });
    if (!r) {
        // 未落地（或本面尚无载体）时，face-assert 里没有这一行的记录。
        // 但同一 R196 文件的其它已落地面可能已有窗口——那是「可参考」，不是「已覆盖」。
        const sibs = cands.filter((c) => c.tier === 'ASSERTED' && c.scripts);
        if (sibs.length) {
            const who = sibs[0].scripts.split(/[,，]/)[0].trim();
            const chan = sibs[0].chans || '';
            return '同类面参考: ' + (chan ? chan + ' @ ' : '') + who + '（本面未覆盖）';
        }
        return '无现成窗口（新面）';
    }
    if (r.tier === 'ASSERTED') return '已断言: ' + (r.scripts || '-');
    if (r.tier === 'EXEMPT') return '豁免: ' + (r.chans ? '通道 ' + r.chans : 'no-log 登记');
    if (r.tier === 'MENTIONED') return '仅提及: ' + (r.scripts || '-');
    if (r.tier === 'UNASSERTED') return '**未断言**';
    return '**无通道**';
}

const today = arg('date', new Date().toISOString().slice(0, 10));
const assertOnlyTable = faces.map((f) => '| `' + f.key + '` | ' + f.ref + ' | ' + assertCell(f.key, f.ref) + ' |').join('\n');

const IDX = require('./face-index.js');
const idxRows = IDX.buildIndex(require('./face-assert.js').analyze().rows, IDX.loadGoldens(path.join(__dirname, 'goldens')));
const proposal = IDX.propose(idxRows, faces, IDX.loadGoldens(path.join(__dirname, 'goldens')));
const planSnippet = JSON.stringify({ [batch]: proposal }, null, 2);
const faceTable = faces.map((f) => '| `' + f.key + '` | ' + f.ref + ' | ' + f.desc + ' | ' + assertCell(f.key, f.ref) + ' |').join('\n');
const valuesBlock = faces.map((f) => {
    const v = valueSections.get(f.key);
    return '### ' + f.key + ' · ' + f.ref + '\n\n' + (v && v.length ? v.join('\n') : '（判值表无候选，需会话六回原文逐行核）');
}).join('\n\n');

function header(from, to) {
    return '【' + from + ' → ' + to + ' · ' + today + '】';
}

const files = {};

files['-0-立项.md'] = `# ${batch} 立项卡（主会话自用）

${header('主会话', '主会话')}

- 批次：**${batch}**（${kind}，${count} 面）
- 组成：${comp}
- 钉值：\`${pin}\`（落码后如重建，改写本行与四份任务书）
- 产物：摸底（六）→ 对照（六）→ 终审（五）→ 落码（主）→ 判窗（七）→ 封批（主）

## 面集

| 键 | R196 一手 | 内容 | 断言窗口 |
| --- | --- | --- | --- |
${faceTable}

## 判值摘要（extract-values 候选，需回原文校对）

${valuesBlock}

## 主会话 checklist

1. 交会话六摸底：\`${batch}-1-摸底.md\`
2. 收对照报告后交会话五终审：\`${batch}-3-终审.md\`
3. 落码 → \`gradlew build\`（**不加 -P**）→ 钉值 → \`f7-wb-lib.js:35\` PIN
4. 交会话七判窗：\`${batch}-4-判窗.md\`
5. 回执 PASS 后跑 \`close-batch.js\`

`;
files['-1-摸底.md'] = `# ${batch} 出身核 + 一手判值（任务书）

${header('主会话', '会话六')}

判定源：R196 一手 \`mite-src/decompile/src/net/minecraft/\`；辅助：\`playground/audit/census/判值表-*.md\`（候选，不作结论）。

## 面集（${count} 面，${kind}）

| 键 | R196 一手 | 内容 | 断言窗口 |
| --- | --- | --- | --- |
${faceTable}

## 抽表候选（逐条回原文核，漏抽要补）

${valuesBlock}

## 交付

1. 每面输出「判值四件套」：常量/属性（含单位）· 门（条件＋阈值＋边界）· 效果（药水/伤害/经验）· 掉落（概率＋数量＋条件）。
2. 每条判值必须带 \`file:line\`。
3. 标出与 1.12 语义冲突处（如 1.12 无某 API、方块 vs 物品、metadata 语义）。
4. 落盘：\`playground/audit/${batch.toLowerCase()}-判值摸底.md\`。
5. 终判一行：可进入对照 / 需补料（列出缺什么）。

纪律：只读 R196 与 ETIM 源码，不改产品码。

`;
files['-2-对照.md'] = `# ${batch} 对照报告（任务书）

${header('主会话', '会话六')}

输入：\`playground/audit/${batch.toLowerCase()}-判值摸底.md\` + ETIM 现码。

## 要求

每面输出四件套：**R196 一手 / 1.12 落法（path:line） / 伪代码 / 判行锚**。

- 1.12 落法必须给真实 \`path:line\`，并说明放在哪个类/方法里；
- 伪代码用项目风格（\`private static\` 方法、门先行、日志行内联）；
- 判行锚给 \`[XxxLog] key=value … [server]\` 的具体字段；
- 分级：A（真缺陷/必须改）/ B（判据或工装）/ C（可接受或面外），逐条编号 \`X-${batch}-\`。

## 特别检查

1. 是否新增 cfg 键——玩家可感知数值必须可配置，内部实现不配置；
2. 是否需要 \`/etest\` 新命令才能取证（无日志面必须补）；
3. 是否触碰既有回归窗口（\`testharness/reports/REGRESSION.md\`）。

落盘：\`playground/audit/${batch.toLowerCase()}-对照报告.md\`；终判一行：DIFF A=? / B=? / C=?。

`;
files['-3-终审.md'] = `# ${batch} 终审（任务书）

${header('主会话', '会话五')}

复核源：
- 对照报告 \`playground/audit/${batch.toLowerCase()}-对照报告.md\`
- R196 一手 \`mite-src/decompile/src/net/minecraft/\`
- 1.12 源 \`build/rfg/minecraft-src/java/net/minecraft/\`

## 要求

1. 逐条核对照报告的 A/B/C 项：成立 / 驳回（给 file:line 依据）/ 降级。
2. 补对照报告漏掉的阻断项（只列 blocking，不列风格意见）。
3. A 项必须给修法（放哪个类、改哪几行、边界条件）。
4. 落盘：\`git-workspace/etim/testharness/reports/${batch.toLowerCase()}-final-audit.md\`。
5. 终判一行：放行 / 退回（blocking 清单）。

纪律：只读复核，不改产品码；一次退回只列真阻断。

`;
files['-4-判窗.md'] = `# ${batch} 判窗（任务书）

${header('主会话', '会话七')}

钉值（落码后由主会话填实）：
- \`f7-wb-lib.js:35\` = \`${pin}\`
- release / dev / sources 三项字节与 SHA-256、MK 计数、jar mtime：以主会话交付消息为准

## 面集与现有断言

| 键 | R196 一手 | 断言窗口 |
| --- | --- | --- |
${assertOnlyTable}

「已断言」只说明有现成窗口覆盖同一通道，不等于本面已验；本轮仍需每面各自的 \`file:line\` 锚点。
「豁免」的面按 \`regression-exempt.json\` / \`no-log.json\` 登记的理由免验，回执里照抄理由即可。

## gate-plan 建议（B-70VL）

${planSnippet.split('\n').map((l) => '    ' + l).join('\n')}

${proposal.scripts.length ? '' : '本批六个面都是新面（census 里没有现成载体/通道），所以 scripts 为空——先写窗口脚本，再把它登记进 gate-plan。\n'}登记进 testharness/tools/gate-plan.json 后，判窗可一条命令：node testharness/tools/run-gate.js ${batch}（未登记则 exit 2）。base 取自对应窗口的数值金标 tee；没有金标时为空，此时只跑 arms。
## 窗口

- 新脚本：\`testharness/player/f??-${batch.toLowerCase()}-smoke.js\`（主会话交）
- 回归：\`--mode=arms --base <上一窗 tee>\`（verify-diff）

## 验收

1. 钉值逐项实测：PIN 三 true、0 rebuild、HEAD 未变；
2. 每臂给 \`file:line\` 原文锚点，缺一即 FAIL；
3. 基线复核：cfg/props 起收同哈希、port 0→0、crash 0→0；
4. A/B/C 分级；A 必须给复现步骤；
5. 回执：\`git-workspace/etim/testharness/reports/${batch.toLowerCase()}-verify-receipt.md\`。

纪律：单次等待 ≤180 s；起服后台 + 30 s 巡检；不操作客户端；由会话七独立执行。

我们是 DeepSeek，不要吝惜真实 API 测试。

`;
fs.mkdirSync(OUT, { recursive: true });
let stale = 0;
for (const [suffix, body] of Object.entries(files)) {
    const p = path.join(OUT, batch + suffix);
    if (STDOUT) {
        console.log('\n===== ' + p + ' =====\n');
        console.log(body);
        continue;
    }
    if (CHECK) {
        const old = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
        if (old !== body) { console.log('[KickoffLog] stale: ' + path.basename(p)); stale++; }
        continue;
    }
    fs.writeFileSync(p, body, 'utf8');
    console.log('[KickoffLog] wrote ' + path.basename(p));
}

if (CHECK) {
    console.log('[KickoffLog] check batch=' + batch + ' stale=' + stale + ' verdict=' + (stale ? 'STALE' : 'OK'));
    process.exit(stale ? 1 : 0);
}
if (process.argv.includes('--plan')) {
    const gp = path.join(__dirname, 'gate-plan.json');
    const plan = fs.existsSync(gp) ? JSON.parse(fs.readFileSync(gp, 'utf8')) : {};
    if (!plan[batch]) {
        plan[batch] = proposal;
        fs.writeFileSync(gp, JSON.stringify(plan, null, 4) + '\n', 'utf8');
        console.log('[KickoffLog] gate-plan entry added for ' + batch);
    } else {
        console.log('[KickoffLog] gate-plan entry already present for ' + batch + ' (left untouched)');
    }
}
console.log('[KickoffLog] batch=' + batch + ' faces=' + faces.length + ' kind=' + kind + ' pin=' + pin + ' out=' + OUT);


