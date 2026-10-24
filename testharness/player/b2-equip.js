// W1 · [EquipLog] boot-dump checker (batch B2) + W8 placeholder/lang registry
// Reconstructs every judged column from the 批文 §一 formulas and compares the
// server dump row by row (not sampled). Also checks the 95×2 lang keys and the
// 95 model/texture files (placeholder, C-7 — registration only, never FAIL).
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');
const LOG = process.env.B2_LOG || path.join(ROOT, 'run', 'obfuscated-server', 'logs', 'latest.log');
const OUT = path.join(ROOT, 'build-logs', 'b2-equip-check.json');
const ASSETS = path.join(ROOT, 'src', 'main', 'resources', 'assets', 'etim');

const MAT = {
  // B3 批文 §〇 材质行: RUSTED_IRON(name, grade 2, damage 2.0F, durability 4, eff 1.25F, ench 0, armor 6)
  rusted_iron:   { grade: 2, damage: 2.0, dur: 4,   eff: 1.25, armor: 6 },
  copper:        { grade: 2, damage: 3.0, dur: 4,   eff: 1.75, armor: 7 },
  silver:        { grade: 2, damage: 3.0, dur: 4,   eff: 1.75, armor: 7 },
  ancient_metal: { grade: 3, damage: 4.0, dur: 16,  eff: 2.0,  armor: 8 },
  mithril:       { grade: 4, damage: 5.0, dur: 64,  eff: 2.5,  armor: 9 },
  adamantium:    { grade: 5, damage: 6.0, dur: 256, eff: 3.0,  armor: 10 },
};
const TOOLS = {
  pickaxe:    { comp: 3, base: 2.0, effMod: 1.0 },
  shovel:     { comp: 1, base: 1.0, effMod: 1.0 },
  axe:        { comp: 3, base: 3.0, effMod: 1.0 },
  hoe:        { comp: 2, base: 1.0, effMod: 0.5 },
  hatchet:    { comp: 1, base: 2.0, effMod: 0.5 },
  mattock:    { comp: 4, base: 1.0, effMod: 0.75 },
  // R196 ItemSword:18-20 getBaseHarvestEfficiency = 2.0F = the 4.0 base's x0.5
  // (fix batch 判值修正 C); the dagger inherits it via ETIMItemDagger.
  sword:      { comp: 2, base: 4.0, effMod: 0.5 },
  dagger:     { comp: 1, base: 2.0, effMod: 0.5 },
  battle_axe: { comp: 4, base: 4.0, effMod: 0.75 },
  war_hammer: { comp: 5, base: 2.0, effMod: 0.75 },
};
const ARMOR = { helmet: 5, chestplate: 8, leggings: 7, boots: 4 };
const ANCHORS = {
  pickaxe_copper: { maxDamage: 4800, attackDamage: 5.0, efficiency: 1.75, grade: 2, burn: 100 },
  helmet_copper: { maxDamage: 40, armor: 1.4583333333333333 },
  'chain_helmet_copper': { maxDamage: 20, armor: 1.0416666666666667 },
  war_hammer_mithril: { maxDamage: 128000, attackDamage: 7.0, efficiency: 1.875, grade: 4 },
  pickaxe_adamantium: { maxDamage: 307200, grade: 5 },
  // B3 anchors (批文 §〇 判值)
  sword_rusted_iron: { maxDamage: 3200, attackDamage: 6.0, efficiency: 0.625, grade: 2, burn: 100 },
  shears_rusted_iron: { maxDamage: 3200, attackDamage: 0.0, efficiency: 1.25, grade: 2, burn: 100 },
};

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

const RE = /\[EquipLog\] gear item=etim:(\S+) maxDamage=(-?\d+) attackDamage=(-?[\d.]+) efficiency=(-?[\d.]+) grade=(-?\d+) burn=(-?\d+) armor=(-?[\d.]+)/;
const RE_MAT = /\[EquipLog\] material item=etim:(\S+) maxStackSize=(-?\d+) burn=(-?\d+)/;

const text = fs.readFileSync(LOG, 'utf8').split(/\r?\n/);
const gear = [];
const mats = [];
for (const l of text) {
  let m = RE.exec(l);
  if (m) {
    gear.push({
      name: m[1], maxDamage: +m[2], attackDamage: +m[3], efficiency: +m[4],
      grade: +m[5], burn: +m[6], armor: +m[7],
    });
    continue;
  }
  m = RE_MAT.exec(l);
  if (m) mats.push({ name: m[1], maxStack: +m[2], burn: +m[3] });
}

function expected(name) {
  const chain = name.startsWith('chain_');
  const body = chain ? name.slice(6) : name;
  // pick the material suffix
  let metal = null;
  for (const k of Object.keys(MAT)) if (body.endsWith('_' + k)) { metal = k; break; }
  if (!metal) return { err: 'no material suffix' };
  const stem = body.slice(0, body.length - metal.length - 1);
  const m = MAT[metal];
  if (stem === 'shears') {
    // B3 批文 §〇 锈铁剪: durability (int)(4.0×2×4×100)=3200 (components 2),
    // base efficiency 4.0 → etimEfficiency = material 1.25, base damage 0.0,
    // burn 100 (ItemShears extends Item in 1.12 → no ItemTool dump face).
    return {
      kind: 'shears', metal, type: stem,
      maxDamage: 3200, attackDamage: 0, efficiency: m.eff,
      grade: m.grade, burn: 100, armor: 0,
    };
  }
  if (TOOLS[stem]) {
    const t = TOOLS[stem];
    return {
      kind: 'tool', metal, type: stem,
      maxDamage: Math.round(4.0 * t.comp * m.dur * 100),
      attackDamage: t.base + m.damage,
      efficiency: m.eff * t.effMod,
      grade: m.grade, burn: 100, armor: 0,
    };
  }
  if (ARMOR[stem]) {
    const comp = ARMOR[stem];
    return {
      kind: 'armor', metal, type: stem, chain,
      maxDamage: Math.round(comp * m.dur * (chain ? 1 : 2)),
      attackDamage: 0,
      efficiency: m.eff, // informational column on armor
      grade: m.grade, burn: -1,
      armor: comp * (m.armor - (chain ? 2 : 0)) / 24,
    };
  }
  return { err: 'unknown type ' + stem };
}

const rows = [];
let bad = 0;
for (const g of gear) {
  const e = expected(g.name);
  if (e.err) { rows.push({ name: g.name, err: e.err }); bad++; continue; }
  const checks = [
    ['maxDamage', g.maxDamage, e.maxDamage],
    ['attackDamage', g.attackDamage, e.attackDamage],
    ['efficiency', g.efficiency, e.efficiency],
    ['grade', g.grade, e.grade],
    ['burn', g.burn, e.burn],
    ['armor', g.armor, e.armor],
  ];
  const diffs = checks.filter(([, got, want]) => (typeof want === 'number' && !Number.isInteger(want)) ? !near(got, want, 1e-9) : got !== want);
  if (diffs.length) bad++;
  rows.push({ name: g.name, kind: e.kind, metal: e.metal, type: e.type, chain: !!e.chain, ok: diffs.length === 0, diffs: diffs.map(([c, got, want]) => `${c}: got=${got} want=${want}`) });
}

// armor full-set sums
const sets = {};
for (const metal of Object.keys(MAT)) {
  for (const chain of [false, true]) {
    const want = ['helmet', 'chestplate', 'leggings', 'boots']
      .map((t) => gear.find((g) => g.name === `${chain ? 'chain_' : ''}${t}_${metal}`))
      .filter(Boolean)
      .reduce((a, g) => a + g.armor, 0);
    const key = `${metal}${chain ? '-chain' : ''}`;
    sets[key] = +want.toFixed(12);
  }
}

// anchors
const anchors = {};
for (const [name, want] of Object.entries(ANCHORS)) {
  const g = gear.find((x) => x.name === name);
  const ok = !!g && Object.entries(want).every(([k, v]) => g[k] === v || near(g[k], v, 1e-12));
  anchors[name] = { got: g ? { maxDamage: g.maxDamage, attackDamage: g.attackDamage, efficiency: g.efficiency, grade: g.grade, burn: g.burn, armor: g.armor } : null, ok };
}

// W8: lang + model + texture presence
const langEn = fs.readFileSync(path.join(ASSETS, 'lang', 'en_us.lang'), 'utf8').split(/\r?\n/);
const langZh = fs.readFileSync(path.join(ASSETS, 'lang', 'zh_cn.lang'), 'utf8').split(/\r?\n/);
const hasKey = (lines, key) => lines.some((l) => l.startsWith(key + '='));
const missing = { langEn: [], langZh: [], model: [], texture: [] };
const all = [...gear.map((g) => g.name), ...mats.map((m) => m.name)];
for (const n of all) {
  if (!hasKey(langEn, `item.etim.${n}.name`)) missing.langEn.push(n);
  if (!hasKey(langZh, `item.etim.${n}.name`)) missing.langZh.push(n);
  if (!fs.existsSync(path.join(ASSETS, 'models', 'item', n + '.json'))) missing.model.push(n);
  if (!fs.existsSync(path.join(ASSETS, 'textures', 'items', n + '.png'))) missing.texture.push(n);
}

const out = {
  log: LOG,
  gearRows: gear.length,
  materialRows: mats.length,
  badRows: bad,
  rows: rows.filter((r) => !r.ok),
  armorSets: sets,
  anchors,
  materials: mats,
  w8: { itemCount: all.length, missing },
};
fs.writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8');
console.log(JSON.stringify({
  gearRows: out.gearRows, materialRows: out.materialRows, badRows: out.badRows,
  armorSets: out.armorSets, anchorsOk: Object.fromEntries(Object.entries(anchors).map(([k, v]) => [k, v.ok])),
  w8missing: Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, v.length])),
  bad: out.rows.slice(0, 8),
}, null, 2));
