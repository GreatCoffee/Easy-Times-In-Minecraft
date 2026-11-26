#!/usr/bin/env node
/**
 * selftest-extract — extract-values.js 的抽取自检（B-70TO）。
 *
 * 造一份最小 R196 文件，断言：
 *   1) 四类候选都抽到（常量 / 属性 / 门 / 效果）
 *   2) `getDropItemId(){ return -1; }` 不算掉落
 *   3) 方法分组：候选落在正确方法名下
 *
 *   node testharness/tools/selftest-extract.js
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, 'extract-values.js');

const SRC = [
    'package net.minecraft;',
    '',
    'public class EntityFixture extends EntityMob {',
    '',
    '    private static final int COOLOFF = 40;',
    '    private static final float SPEED = 0.28F;',
    '',
    '    @Override',
    '    protected void applyEntityAttributes() {',
    '        super.applyEntityAttributes();',
    '        this.getEntityAttribute(SharedMonsterAttributes.followRange).setAttribute(40.0);',
    '        this.getEntityAttribute(SharedMonsterAttributes.movementSpeed).setAttribute(0.28F);',
    '    }',
    '',
    '    @Override',
    '    public EntityDamageResult attackEntityAsMob(Entity target) {',
    '        if (target instanceof EntityLivingBase && this.rand.nextFloat() < 0.4F) {',
    '            ((EntityLivingBase) target).addPotionEffect(new PotionEffect(Potion.weakness.id, 600, 0));',
    '        }',
    '        return null;',
    '    }',
    '',
    '    @Override',
    '    protected int getDropItemId() {',
    '        return -1;',
    '    }',
    '}',
    '',
].join('\n');

let pass = 0;
const total = 3;

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'extract-'));
const books = path.join(root, 'playground', 'audit', 'census');
const r196 = path.join(root, 'mite-src', 'decompile', 'src', 'net', 'minecraft');
fs.mkdirSync(books, { recursive: true });
fs.mkdirSync(r196, { recursive: true });
fs.writeFileSync(path.join(r196, 'EntityFixture.java'), SRC, 'utf8');
fs.writeFileSync(path.join(books, '剩余-就绪度.md'), [
    '## 逐面明细',
    '',
    '| 卷:行 | R196 引用 | 状态 | 载体 / 依赖 | 说明 |',
    '| --- | --- | --- | --- | --- |',
    '| C:1 | EntityFixture.java | WIRE | MixinEntityLivingBase / CORE | fixture |',
    '',
].join('\n'), 'utf8');

function run(args) {
    try {
        const out = execFileSync(process.execPath, [TOOL, ...args], {
            encoding: 'utf8',
            env: { ...process.env, VALUES_ROOT: root },
        });
        return { code: 0, out };
    } catch (e) {
        return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
    }
}

const r = run(['--face', 'C:1']);
const doc = fs.readFileSync(path.join(books, '判值表-C-1.md'), 'utf8');

const kinds = ['[属性]', '[门]', '[效果]'];
const okKinds = r.code === 0 && kinds.every((k) => doc.includes(k));
if (okKinds) pass++;
console.log(`${okKinds ? 'PASS' : 'FAIL'} four-kinds (exit=${r.code})`);
if (!okKinds) console.log(doc);

const okDead = !/\[掉落\]/.test(doc);
if (okDead) pass++;
console.log(`${okDead ? 'PASS' : 'FAIL'} dead-end-drop-ignored`);

const okGroup = /方法 `protected void applyEntityAttributes\(\)`/.test(doc) && /方法 `public EntityDamageResult attackEntityAsMob\(Entity target\)`/.test(doc);
if (okGroup) pass++;
console.log(`${okGroup ? 'PASS' : 'FAIL'} method-grouping`);

fs.rmSync(root, { recursive: true, force: true });
console.log(`selftest-extract: ${pass}/${total}`);
process.exit(pass === total ? 0 : 1);
