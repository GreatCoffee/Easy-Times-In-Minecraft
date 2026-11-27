#!/usr/bin/env node
/**
 * selftest-assets — 用临时资产树验证 check-assets 的四条判定。
 *
 *   node testharness/tools/selftest-assets.js
 *
 * 期望：clean 树 exit 0；缺陷树 exit 1 且计数为
 *   missingTexture=1 missingModel=1 missingLang=1 orphan=1。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const TOOL = path.join(__dirname, 'check-assets.js');
const results = [];

function mkRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'etim-assets-'));
    fs.mkdirSync(path.join(root, 'assets', 'etim', 'models', 'item'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets', 'etim', 'models', 'block'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets', 'etim', 'blockstates'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets', 'etim', 'textures', 'items'), { recursive: true });
    fs.mkdirSync(path.join(root, 'assets', 'etim', 'lang'), { recursive: true });
    fs.mkdirSync(path.join(root, 'src', 'main', 'java'), { recursive: true });
    return root;
}
const put = (root, rel, body) => {
    const p = path.join(root, 'assets', 'etim', rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, body, 'utf8');
};
const langAppend = (root, file, key) => {
    const p = path.join(root, 'assets', 'etim', 'lang', file);
    fs.appendFileSync(p, key + '=x\n', 'utf8');
};
const langPair = (root, key) => {
    langAppend(root, 'en_us.lang', key);
    langAppend(root, 'zh_cn.lang', key);
};

function run(root) {
    const r = spawnSync(process.execPath, [TOOL, '--list'], {
        env: { ...process.env, ASSET_REPO: root, ASSET_DIR: path.join(root, 'assets', 'etim') },
        encoding: 'utf8',
    });
    return { code: r.status, out: r.stdout || '' };
}

// 1. clean
{
    const root = mkRoot();
    put(root, 'models/item/good.json', JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: 'etim:items/good' } }));
    fs.writeFileSync(path.join(root, 'assets', 'etim', 'textures', 'items', 'good.png'), '');
    langPair(root, 'item.etim.good.name');
    const r = run(root);
    results.push({ name: 'clean-tree', pass: r.code === 0 && /verdict OK/.test(r.out) });
}

// 2. 缺陷树：缺贴图 / 缺模型 / 缺 lang / 孤儿
{
    const root = mkRoot();
    put(root, 'models/item/good.json', JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: 'etim:items/good' } }));
    fs.writeFileSync(path.join(root, 'assets', 'etim', 'textures', 'items', 'good.png'), '');
    langPair(root, 'item.etim.good.name');

    put(root, 'models/item/notexture.json', JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: 'etim:items/absent' } }));
    langPair(root, 'item.etim.notexture.name');

    put(root, 'blockstates/bs.json', JSON.stringify({ variants: { normal: { model: 'etim:block/absent' } } }));
    langPair(root, 'tile.etim.bs.name');

    put(root, 'models/item/nolang.json', JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: 'etim:items/good' } }));
    // 只给英文键：判 missingLang（中文缺），但不落进 orphan（有任一语言名）。
    langAppend(root, 'en_us.lang', 'item.etim.nolang.name');

    put(root, 'models/item/orphan.json', JSON.stringify({ parent: 'minecraft:item/generated', textures: { layer0: 'etim:items/good' } }));

    const r = run(root);
    const count = (k) => {
        const m = new RegExp(k + '=(\\d+)').exec(r.out);
        return m ? Number(m[1]) : -1;
    };
    results.push({
        name: 'defect-tree',
        pass: r.code === 1
            && count('missingTexture') === 1
            && count('missingModel') === 1
            // orphan.json 既没 lang 也没人引用：missingLang 与 orphan 各记一次（有意双击）。
            && count('missingLang') === 2
            && count('orphan') === 1
            && /verdict FAIL/.test(r.out),
        detail: `exit=${r.code} ${/AssetLog\] missingTexture=.*/.exec(r.out)?.[0] || ''}`,
    });
}

let failed = 0;
for (const r of results) {
    console.log((r.pass ? 'PASS ' : 'FAIL ') + r.name + (r.detail && !r.pass ? '  ' + r.detail : ''));
    if (!r.pass) failed++;
}
console.log(`selftest-assets: ${results.length - failed}/${results.length}`);
process.exit(failed === 0 ? 0 : 1);
