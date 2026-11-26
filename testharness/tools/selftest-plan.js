#!/usr/bin/env node
/**
 * selftest-plan — plan-batches.js 的切分自检（B-70TN）。
 *
 * 每例独立临时账本树：写一份假的 `剩余-就绪度.md`，跑 plan-batches，断言
 *   1) 均分切块（17 面 / max 8 → 6/6/5，无单面尾巴）
 *   2) BIOME 依赖被标为 BLOCKED
 *   3) --check 对陈旧生成物 exit 1
 *
 *   node testharness/tools/selftest-plan.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'plan-batches.js');

function build(rows) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'plan-'));
    const books = path.join(root, 'playground', 'audit', 'census');
    fs.mkdirSync(books, { recursive: true });
    const text = [
        '# 剩余面就绪度与排程（生成物）',
        '',
        '## 逐面明细',
        '',
        '| 卷:行 | R196 引用 | 状态 | 载体 / 依赖 | 说明 |',
        '| --- | --- | --- | --- | --- |',
        ...rows,
        '',
    ].join('\n');
    fs.writeFileSync(path.join(books, '剩余-就绪度.md'), text, 'utf8');
    return { root, books };
}

function run(root, args) {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...(args || [])], {
            encoding: 'utf8',
            env: { ...process.env, PLAN_BOOKS_ROOT: root },
        });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

const wire = (y) => `| C:${y} | Damage.java:${y} | WIRE | MixinEntityLivingBase / CORE | face ${y} |`;
const biome = (y) => `| E:${y} | BiomeDecorator.java:${y} | WIRE | MixinBiomeDecorator / BIOME | decor ${y} |`;

let pass = 0;
const total = 3;

// 1) 均分切块
{
    const rows = [];
    for (let i = 1; i <= 17; i++) rows.push(wire(100 + i));
    const t = build(rows);
    const r = run(t.root, ['--max', '8']);
    const sizes = [...r.out.matchAll(/faces=(\d+)/g)].map((m) => +m[1]);
    const ok = r.code === 0 && sizes.length === 3 && sizes.join(',') === '6,6,5';
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'} balanced-split (sizes=${sizes.join(',') || 'none'})`);
    if (!ok) console.log(r.out.trim());
    fs.rmSync(t.root, { recursive: true, force: true });
}

// 2) BIOME 依赖标 BLOCKED
{
    const t = build([biome(20), biome(21), wire(30)]);
    const r = run(t.root, []);
    const head = r.out.split('\n').find((s) => /MixinBiomeDecorator/.test(s)) || '';
    const body = fs.readFileSync(path.join(t.books, '批次工单.md'), 'utf8');
    const ok = r.code === 0 && /BLOCKED/.test(head) && /群系装饰表/.test(body);
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'} biome-blocked`);
    if (!ok) console.log(r.out.trim());
    fs.rmSync(t.root, { recursive: true, force: true });
}

// 3) --check 陈旧检出
{
    const t = build([wire(40)]);
    run(t.root, []);
    const fresh = run(t.root, ['--check']);
    fs.appendFileSync(path.join(t.books, '剩余-就绪度.md'), '| C:41 | Damage.java:41 | WIRE | MixinEntityLivingBase / CORE | face 41 |\n');
    const stale = run(t.root, ['--check']);
    const ok = fresh.code === 0 && stale.code === 1 && /stale=true/.test(stale.out);
    if (ok) pass++;
    console.log(`${ok ? 'PASS' : 'FAIL'} stale-detect (fresh=${fresh.code} stale=${stale.code})`);
    if (!ok) console.log((stale.out || '').trim());
    fs.rmSync(t.root, { recursive: true, force: true });
}

console.log(`selftest-plan: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
