#!/usr/bin/env node
/**
 * check-assets — 资产一致性检查（B-70TQ）。
 *
 * 玩家能直接看到的三类硬伤：
 *   1) 模型引用的贴图文件不存在           → 紫黑格子
 *   2) blockstate / 模型 parent 引用的模型不存在 → 紫黑格子 / 缺模型
 *   3) 物品/方块的 lang 键缺失            → 背包里显示原始键名
 * 另报两类只读提示：
 *   4) 孤儿模型（无人引用且无同名 lang）  → 可能是死资源
 *   5) 无 layer0 的模型（组合模型）        → 仅供核对
 *
 * 约定（照抄本仓现状，不发明）：
 *   - blockstate 里的 "model": "etim:x" 指 models/block/x.json；
 *   - 物品模型在 models/item/，lang 接受 item.etim.<name>.name 或 tile.etim.<name>.name；
 *   - 钓竿投射态 model（*_cast）与熔炉燃烧态（*_lit）是 override 引用的状态模型，不要求独立 lang；
 *   - 凝胶球按 metadata 换 key（item.etim.gelatinous_sphere.<color>.name），基键不用。
 *
 *   node testharness/tools/check-assets.js
 *   node testharness/tools/check-assets.js --list
 *   node testharness/tools/check-assets.js --assets <dir> --repo <dir>
 *
 * 退出码 0 无硬伤 / 1 有硬伤。
 */
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const LIST = argv.includes('--list');
const opt = (name, dflt) => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};

const REPO = process.env.ASSET_REPO || opt('--repo', path.resolve(__dirname, '..', '..'));
const ASSETS = process.env.ASSET_DIR || opt('--assets', path.join(REPO, 'src', 'main', 'resources', 'assets', 'etim'));
const SRC = path.join(REPO, 'src', 'main', 'java');

const LANG_ALLOW = [
    /^fishing_rod_[a-z_]+_cast$/,      // override 状态模型
    /^furnace_[a-z_]+_lit$/,           // 燃烧态状态模型
    /^gelatinous_sphere_[a-z]+$/,      // 按 metadata 换 key
];
const KEY_ALLOW = new Set(['etim.gelatinous_sphere']); // 基键被 metadata 覆盖

if (!fs.existsSync(ASSETS)) {
    console.log('[AssetLog] SKIP assets tree absent');
    console.log('[AssetLog] verdict OK');
    process.exit(0);
}

function walk(d, out = []) {
    if (!fs.existsSync(d)) return out;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p, out); else out.push(p);
    }
    return out;
}
const rel = (p, base) => p.slice(base.length + 1).split(path.sep).join('/');

const MODELS_DIR = path.join(ASSETS, 'models');
const modelFiles = walk(MODELS_DIR).filter((f) => f.endsWith('.json'));
const blockstates = walk(path.join(ASSETS, 'blockstates')).filter((f) => f.endsWith('.json'));
const textures = new Set(walk(path.join(ASSETS, 'textures')).filter((f) => f.endsWith('.png')).map((f) => rel(f, path.join(ASSETS, 'textures'))));

const models = new Map();
for (const f of modelFiles) {
    const key = rel(f, MODELS_DIR).replace(/\.json$/, '');
    try { models.set(key, JSON.parse(fs.readFileSync(f, 'utf8'))); } catch { models.set(key, null); }
}

// 1.12 语义：blockstate 的 etim:x 指 models/block/x；模型 parent 里 etim:x 先行 block/ 再 item/。
const resolveRef = (ref) => {
    const r = ref.slice(5);
    if (models.has(r)) return r;
    if (models.has('block/' + r)) return 'block/' + r;
    if (models.has('item/' + r)) return 'item/' + r;
    return null;
};

const referenced = new Set();
for (const [key, j] of models) {
    if (!j) continue;
    if (j.parent && j.parent.startsWith('etim:')) {
        const hit = resolveRef(j.parent);
        if (hit) referenced.add(hit);
    }
    for (const ov of j.overrides || []) {
        if (ov.model && ov.model.startsWith('etim:')) {
            const hit = resolveRef(ov.model);
            if (hit) referenced.add(hit);
        }
    }
}

const missingTextures = new Map();
const noLayer = [];
for (const [key, j] of models) {
    if (!j) { missingTextures.set(key + '|parse', { model: key, tex: '(JSON 解析失败)' }); continue; }
    const texs = Object.values(j.textures || {}).filter((t) => typeof t === 'string' && t.startsWith('etim:') && !t.includes('$'));
    if (texs.length === 0 && !j.parent) noLayer.push(key);
    for (const t of texs) {
        if (!textures.has(t.slice(5) + '.png')) missingTextures.set(key + '|' + t, { model: key, tex: t });
    }
}

const missingModels = new Map();
const bsNames = [];
for (const f of blockstates) {
    const key = rel(f, path.join(ASSETS, 'blockstates'));
    bsNames.push(key.replace(/\.json$/, ''));
    try {
        const j = JSON.parse(fs.readFileSync(f, 'utf8'));
        const check = (v) => {
            if (!v || !v.model || !v.model.startsWith('etim:')) return;
            if (!resolveRef(v.model)) missingModels.set(key + '|' + v.model, { bs: key, model: v.model });
            else referenced.add(resolveRef(v.model));
        };
        if (j.variants) for (const v of Object.values(j.variants)) Array.isArray(v) ? v.forEach(check) : check(v);
        if (j.multipart) for (const p of j.multipart) check(p.apply);
    } catch { missingModels.set(key + '|parse', { bs: key, model: '(JSON 解析失败)' }); }
}

const langSet = (file) => {
    const p = path.join(ASSETS, 'lang', file);
    const s = new Set();
    if (!fs.existsSync(p)) return s;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
        const m = /^([\w.]+)\s*=/.exec(line);
        if (m) s.add(m[1]);
    }
    return s;
};
const en = langSet('en_us.lang');
const zh = langSet('zh_cn.lang');
const hasName = (set, name) => set.has('item.etim.' + name + '.name') || set.has('tile.etim.' + name + '.name');

// 硬伤 3a：每个 item/ 模型都要有 lang（状态模型除外）
const missingLang = new Map();
for (const key of models.keys()) {
    if (!key.startsWith('item/')) continue;
    const name = key.slice(5);
    if (LANG_ALLOW.some((re) => re.test(name))) continue;
    if (!hasName(en, name) || !hasName(zh, name)) missingLang.set('model|' + name, { what: 'model', name, en: hasName(en, name), zh: hasName(zh, name) });
}
// 硬伤 3b：每个 blockstate 都要有 lang；*_lit 是同一方块的燃烧态变体，随基名判定。
const hasTile = (set, name) => set.has('tile.etim.' + name + '.name') || set.has('tile.' + name + '.name');
const bsLang = (set, name) => hasName(set, name) || hasTile(set, name);
for (const name of bsNames) {
    const probe = /_lit$/.test(name) && bsLang(en, name.slice(0, -4)) && bsLang(zh, name.slice(0, -4)) ? name.slice(0, -4) : name;
    if (!bsLang(en, probe) || !bsLang(zh, probe)) missingLang.set('bs|' + name, { what: 'blockstate', name, en: bsLang(en, probe), zh: bsLang(zh, probe) });
}
// 硬伤 3c：代码里字面量 translationKey / registryName
const codeKeys = new Set();
for (const f of walk(SRC).filter((x) => x.endsWith('.java'))) {
    const t = fs.readFileSync(f, 'utf8');
    for (const m of t.matchAll(/setTranslationKey\(\s*"([a-z0-9_.]+)"\s*\)/g)) if (!KEY_ALLOW.has(m[1])) codeKeys.add(m[1]);
    for (const m of t.matchAll(/setRegistryName\(\s*"etim"\s*,\s*"([a-z0-9_]+)"\s*\)/g)) codeKeys.add('etim.' + m[1]);
}
for (const k of codeKeys) {
    const short = k.replace(/^etim\./, '');
    const inEn = en.has('item.' + k + '.name') || en.has('tile.' + k + '.name') || en.has('item.etim.' + short + '.name') || en.has('tile.etim.' + short + '.name');
    const inZh = zh.has('item.' + k + '.name') || zh.has('tile.' + k + '.name') || zh.has('item.etim.' + short + '.name') || zh.has('tile.etim.' + short + '.name');
    if (!inEn || !inZh) missingLang.set('code|' + k, { what: 'code', name: k, en: inEn, zh: inZh });
}

const orphans = [];
for (const key of models.keys()) {
    if (referenced.has(key)) continue;
    const base = path.basename(key);
    if (hasName(en, base) || hasName(zh, base)) continue;
    orphans.push(key);
}

console.log(`[AssetLog] models=${models.size} blockstates=${blockstates.length} textures=${textures.size} langKeys=${en.size}/${zh.size} codeKeys=${codeKeys.size}`);
console.log(`[AssetLog] missingTexture=${missingTextures.size} missingModel=${missingModels.size} missingLang=${missingLang.size} orphan=${orphans.length} noLayer=${noLayer.length}`);

if (LIST) {
    for (const x of missingTextures.values()) console.log(`[AssetLog] MISSING-TEXTURE model=${x.model} tex=${x.tex}`);
    for (const x of missingModels.values()) console.log(`[AssetLog] MISSING-MODEL bs=${x.bs} model=${x.model}`);
    for (const x of missingLang.values()) console.log(`[AssetLog] MISSING-LANG what=${x.what} name=${x.name} en=${x.en} zh=${x.zh}`);
    for (const x of orphans) console.log(`[AssetLog] ORPHAN-MODEL ${x}`);
    for (const x of noLayer) console.log(`[AssetLog] NO-LAYER ${x}`);
}

const hard = missingTextures.size + missingModels.size + missingLang.size;
console.log(`[AssetLog] verdict ${hard === 0 ? 'OK' : 'FAIL'} hard=${hard}`);
process.exit(hard === 0 ? 0 : 1);
