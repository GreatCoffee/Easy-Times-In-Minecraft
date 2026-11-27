#!/usr/bin/env node
/**
 * gearcraft-w47.js — gearcraft 批（metal gear 配方可达性）W-47 判窗驱动
 *
 * 判据正本：
 *   playground/audit/gearcraft-立项摸底.md §5.2（26 主点表）／§5.3（i–n 后备）
 *   playground/audit/gearcraft-终审回执.md  T-W（d/period 代数亲数）＋ Ku-6（判读细则）
 *
 * 判据通道（全 [CraftingLog] 族，crafting/crafting/ETIMCrafting.java）：
 *   守门行（boot）: `[TestLog] gear recipes registered: 19 batch rows ok
 *                   (runtime REGISTRY delta; etim-domain total 144 …)`  —— ≠144 ⇒ A 级停窗
 *   sig 行      : `result CHANGED sig=<reg>#<meta>×<n> prev=<…> → recompute difficulty/period`  (:258-260)
 *   period 行   : `period SET difficulty=<d> quality=<Q> period=<n>`                              (:431-433)
 *   click 行    : `result click btn=<0|1>`                                                        (:146)
 *   start 行    : `start crafting difficulty=<d> quality=<Q> period=<n>`                          (:166-168)
 *   COMPLETE 行 : `COMPLETE <显名> ×<n> quality=AVERAGE xp=0 continue`                            (:516-518)
 *   gone 行     : `result gone → reset`                                                           (:236)
 *   ⇒ 每 S 点 **6 行族**（sig/period SET/click/start/COMPLETE/gone）±1；C 组（craftingSkipCreative
 *     :128-133 首行 return）与 N 组（无产物）**零行**。
 *
 * 判点分组（单 boot，S 生存 → C 创造 → N 生存 → i–n 后备）：
 *   S1–S20 生存计时（每点 COMPLETE 1 条＋背包 +1＋NBT quality=2）
 *   C1–C5  创造即时（零 [CraftingLog] 行＋背包 +1＋无 quality tag）
 *   N1     负证（4 铜粒环形格 2/4/6/8：无 sig=etim:chain_copper／无 COMPLETE／背包 Δ0／零新行）
 *   i–n    6 后备（i sinew 生存／j k l 创造／m n 生存）
 *
 * 工序（每点前内嵌）：`/clear` 白板 → `/gamemode`（按相）→ `/etest food 6 6`（hungerCraftDeny
 *   静默冻结防呆 :299-301）→ `/xp -1000000L`（1.12 EntityPlayer:2207-2215 负级钳位 ⇒ level 0
 *   ⇒ getMinOrdinal=AVERAGE(2) 且 experienceTotal≤0 ⇒ 单档 ⇒ xp=0 continue）。
 *
 * 通道：命令一律走控制台 stdin（server-console.js `srv.send`）；bot 只做
 *   `activateBlock`（开台）／`clickWindow`（摆料＋点击结果槽）／`closeWindow`／读背包。
 *   /etest craft **不新增**（D-4(a)）；bot.craft 结构性不可用（M-8）。
 *
 * 用法：node gearcraft-w47.js [tag]
 *   W47_MODE=s|c|n|f|all（默认 all）
 *   W47_ONLY=S1,S2,C1（判点裁剪，冒烟用）
 *   W47_STAGE=<tag 前缀>（.out 名隔离）
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { startServer } = require('../server/server-console');
const { createHarnBot } = require('./fmlbot');
const Vec3 = require('vec3').Vec3;

const ROOT = path.resolve(__dirname, '..', '..');
const TAG = process.argv[2] || 'gearcraft-w47';
const OUT = path.join(ROOT, 'testharness', 'build-logs');
const CFG = path.join(ROOT, 'run', 'config', 'etim.cfg');
const CFG_CLIENT = path.join(ROOT, 'run', 'obfuscated', 'config', 'etim.cfg');
const PROPS = path.join(ROOT, 'run', 'server.properties');
const RUNLOG = path.join(ROOT, 'run', 'logs', 'latest.log');
const DEVJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-dev.jar');
const RELJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0.jar');
const SRCJAR = path.join(ROOT, 'build', 'libs', 'etim-1.0.0-sources.jar');
const REFMAP_A = path.join(ROOT, 'build', 'resources', 'main', 'mixins.etim.refmap.json');
const REFMAP_B = path.join(ROOT, 'build', 'tmp', 'mixins', 'mixins.etim.refmap.json');
const MIXIN_JSON = path.join(ROOT, 'src', 'main', 'resources', 'mixins.etim.json');
const WORLD = 'gearcraftw47';
const PORT = 25565;
const BOT = 'ETIM_W47';

/** 起收钉（主会话 W-47 任务书 · HEAD 92db13d；零产品码／零 cfg 编辑）。 */
const PIN = {
  head: '92db13d',
  rel: { bytes: 775263, sha: '22DC05D4C0FE5E3271016CDCEFAA8DC8FC5530DBFC6A0A62F3AC5D86F7A6C2A5' },
  dev: { bytes: 759459, sha: '8130C73845EBD76FAFAA5400DE9CFB15E33C40CEE62EE084CD510B4681429777' },
  src: { bytes: 703372, sha: '39CD6818A94A90982A6AC32BE4E74140E09324176E483FE6AD47B270DCE6CA6B' },
  cfg: { bytes: 32095, sha: 'E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5' },
  cfgClient: { bytes: 30277, sha: 'E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45' },
  props: { bytes: 890, sha: '3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48' },
};

/**
 * MK 钉（窗内 refmap / mixins 清单零动）。
 * 切片实测＝Sword 4／Tool 4／Shears 3（总 11）——本窗开窗亲数；终审回执 Ku-3 的
 * 「4/3/4」与实测不符，判窗侧以实测值为准并把该誊差登记为 C 级（判值零影响：总 11 不变）。
 */
const MK_PIN = {
  mixins: 56, client: 10, refmapClasses: 62, refmapEntries: 138,
  sword: 4, tool: 4, shears: 3, sliceTotal: 11,
};

/** 守门钉：boot 行 runtime 实数（A-2 判据）。 */
const GATE = { batchRows: 19, total: 144 };

const aRow = (o) => Object.assign({
  group: 'S', mode: 'survival', outCount: 1, d: null, period: null,
  completions: 1, quality: 'AVERAGE', carrier: true,
  expectRows: true, expectGone: true, invDelta: 1, note: '',
}, o);

/* ============================ S1–S20（生存计时） ============================ */

const S_POINTS = [
  aRow({ id: 'S1', product: 'etim:pickaxe_copper', display: 'Copper Pickaxe', d: 125, period: 94,
    ings: [{ name: 'etim:ingot_copper', count: 3, slots: [1, 2, 3] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '铜锭×3＋棍×2 → Copper Pickaxe（d=5×25=125／period 94）' }),
  aRow({ id: 'S2', product: 'etim:shovel_copper', display: 'Copper Shovel', d: 75, period: 62,
    ings: [{ name: 'etim:ingot_copper', count: 1, slots: [1] }, { name: 'minecraft:stick', count: 2, slots: [4, 7] }],
    note: '铜锭×1＋棍×2（d=75／62）' }),
  aRow({ id: 'S3', product: 'etim:axe_copper', display: 'Copper Axe', d: 125, period: 94,
    ings: [{ name: 'etim:ingot_copper', count: 3, slots: [1, 2, 4] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '铜锭×3＋棍×2（d=125／94）' }),
  aRow({ id: 'S4', product: 'etim:hoe_copper', display: 'Copper Hoe', d: 100, period: 83,
    ings: [{ name: 'etim:ingot_copper', count: 2, slots: [1, 2] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '铜锭×2＋棍×2（d=100／83）' }),
  aRow({ id: 'S5', product: 'etim:mattock_copper', display: 'Copper Mattock', d: 150, period: 102,
    ings: [{ name: 'etim:ingot_copper', count: 4, slots: [1, 2, 3, 6] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '铜锭×4＋棍×2（d=150／102）' }),
  aRow({ id: 'S6', product: 'etim:battle_axe_copper', display: 'Copper Battle Axe', d: 150, period: 102,
    ings: [{ name: 'etim:ingot_copper', count: 4, slots: [1, 3, 4, 6] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '铜锭×4＋棍×2（d=150／102）' }),
  aRow({ id: 'S7', product: 'etim:war_hammer_copper', display: 'Copper War Hammer', d: 175, period: 110,
    ings: [{ name: 'etim:ingot_copper', count: 5, slots: [1, 2, 3, 4, 6] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '铜锭×5＋棍×2（d=175／110）' }),
  aRow({ id: 'S8', product: 'etim:hatchet_copper', display: 'Copper Hatchet', d: 75, period: 62,
    ings: [{ name: 'etim:ingot_copper', count: 1, slots: [2] }, { name: 'minecraft:stick', count: 2, slots: [1, 4] }],
    note: '铜锭×1＋棍×2（d=75／62）' }),
  aRow({ id: 'S9', product: 'etim:sword_copper', display: 'Copper Sword', d: 75, period: 62,
    ings: [{ name: 'etim:ingot_copper', count: 2, slots: [1, 4] }, { name: 'minecraft:stick', count: 1, slots: [7] }],
    note: '铜锭×2＋棍×1（d=75／62）' }),
  aRow({ id: 'S10', product: 'etim:dagger_copper', display: 'Copper Dagger', d: 50, period: 41,
    ings: [{ name: 'etim:ingot_copper', count: 1, slots: [1] }, { name: 'minecraft:stick', count: 1, slots: [4] }],
    note: '铜锭×1＋棍×1（d=50／41）' }),
  aRow({ id: 'S11', product: 'etim:helmet_copper', display: 'Copper Helmet', d: 125, period: 94,
    ings: [{ name: 'etim:ingot_copper', count: 5, slots: [1, 2, 3, 4, 6] }],
    note: '铜锭×5（d=125／94）' }),
  aRow({ id: 'S12', product: 'etim:chestplate_copper', display: 'Copper Chestplate', d: 200, period: 116,
    ings: [{ name: 'etim:ingot_copper', count: 8, slots: [1, 3, 4, 5, 6, 7, 8, 9] }],
    note: '铜锭×8（d=200／116，大配方单栈 8）' }),
  aRow({ id: 'S13', product: 'etim:leggings_copper', display: 'Copper Leggings', d: 175, period: 110,
    ings: [{ name: 'etim:ingot_copper', count: 7, slots: [1, 2, 3, 4, 6, 7, 9] }],
    note: '铜锭×7（d=175／110）' }),
  aRow({ id: 'S14', product: 'etim:boots_copper', display: 'Copper Boots', d: 100, period: 83,
    ings: [{ name: 'etim:ingot_copper', count: 4, slots: [1, 3, 4, 6] }],
    note: '铜锭×4（d=100／83）' }),
  aRow({ id: 'S15', product: 'etim:scythe_copper', display: 'Copper Scythe', d: 125, period: 94,
    ings: [{ name: 'etim:ingot_copper', count: 2, slots: [2, 6] }, { name: 'minecraft:stick', count: 3, slots: [1, 4, 7] }],
    note: '铜锭×2＋棍×3（"/X ","/ X","/  "，锭在 2／6 格；d=125／94）' }),
  aRow({ id: 'S16', product: 'etim:chain_helmet_rusted_iron', display: 'Rusted Iron Chain Helmet', d: 125, period: 94,
    ings: [{ name: 'etim:chain_rusted_iron', count: 5, slots: [1, 2, 3, 4, 6] }],
    note: '锈铁链×5（/give 料源定谳；d=125／94）' }),
  aRow({ id: 'S17', product: 'etim:arrow_copper', display: 'Copper Arrow', d: 75, period: 62, carrier: false,
    ings: [{ name: 'etim:nugget_copper', count: 1, slots: [1] }, { name: 'minecraft:stick', count: 1, slots: [4] }, { name: 'minecraft:feather', count: 1, slots: [7] }],
    note: '铜粒×1＋棍×1＋羽×1（d=75／62；non-carrier 无 tag）' }),
  aRow({ id: 'S18', product: 'minecraft:iron_nugget', display: 'Iron Nugget', outCount: 9, d: 800, period: 240, carrier: false,
    ings: [{ name: 'minecraft:iron_ingot', count: 1, slots: [1] }],
    note: '铁锭×1 → 铁粒×9（shapeless；d=800／240）' }),
  aRow({ id: 'S19', product: 'minecraft:iron_ingot', display: 'Iron Ingot', outCount: 1, d: 225, period: 123, carrier: false,
    ings: [{ name: 'minecraft:iron_nugget', count: 9, slots: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    note: '铁粒×9 → 铁锭×1（shapeless；d=225／123）' }),
  aRow({ id: 'S20', product: 'etim:knife_flint', display: 'Flint Knife', d: 75, period: 62,
    ings: [{ name: 'minecraft:flint', count: 1, slots: [1] }, { name: 'etim:sinew', count: 1, slots: [2] }, { name: 'minecraft:stick', count: 1, slots: [4] }],
    note: '燧石×1＋棍×1＋筋腱×1（d=75／62）' }),
];

/* ============================ C1–C5（创造即时，零行） ============================ */

const C_POINTS = [
  aRow({ id: 'C1', group: 'C', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:pickaxe_silver', display: 'Silver Pickaxe', d: null, period: null,
    ings: [{ name: 'etim:ingot_silver', count: 3, slots: [1, 2, 3] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '创造 银锭×3＋棍×2：零 [CraftingLog] 行＋背包 +1＋无 quality tag' }),
  aRow({ id: 'C2', group: 'C', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:sword_mithril', display: 'Mithril Sword', d: null, period: null,
    ings: [{ name: 'etim:ingot_mithril', count: 2, slots: [1, 4] }, { name: 'minecraft:stick', count: 1, slots: [7] }],
    note: '创造 秘银锭×2＋棍×1：零行＋+1' }),
  aRow({ id: 'C3', group: 'C', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:chestplate_adamantium', display: 'Adamantium Chestplate', d: null, period: null,
    ings: [{ name: 'etim:ingot_adamantium', count: 8, slots: [1, 3, 4, 5, 6, 7, 8, 9] }],
    note: '创造 金刚锭×8：零行＋+1' }),
  aRow({ id: 'C4', group: 'C', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:hoe_ancient_metal', display: 'Ancient Metal Hoe', d: null, period: null,
    ings: [{ name: 'etim:ingot_ancient_metal', count: 2, slots: [1, 2] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '创造 古金锭×2＋棍×2：零行＋+1' }),
  aRow({ id: 'C5', group: 'C', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:nugget_copper', display: 'Copper Nugget', d: null, period: null,
    ings: [{ name: 'etim:arrow_copper', count: 1, slots: [1] }],
    note: '创造 铜箭×1 拆解 → 铜粒×1（shapeless；零行＋+1）' }),
];

/* ============================ N1（负证） ============================ */

const N_POINTS = [
  aRow({ id: 'N1', group: 'N', mode: 'survival', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: null, display: null, d: null, period: null, invDelta: 0,
    ings: [{ name: 'etim:nugget_copper', count: 4, slots: [2, 4, 6, 8] }],
    negative: true,
    note: '4 铜粒环形格 2/4/6/8：无 sig=etim:chain_copper／无 COMPLETE／背包 Δ0／格子余料恒在' }),
];

/* ============================ i–n（6 后备） ============================ */

const F_POINTS = [
  aRow({ id: 'i', group: 'F', mode: 'survival', product: 'etim:sinew', display: 'Sinew', outCount: 4,
    d: 100, period: 83, carrier: false,
    ings: [{ name: 'minecraft:leather', count: 1, slots: [1] }],
    note: '皮革×1 → 筋腱×4（d=100／83）' }),
  aRow({ id: 'j', group: 'F', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:sword_silver', display: 'Silver Sword', d: null, period: null,
    ings: [{ name: 'etim:ingot_silver', count: 2, slots: [1, 4] }, { name: 'minecraft:stick', count: 1, slots: [7] }],
    note: '创造 银剑：零行＋+1' }),
  aRow({ id: 'k', group: 'F', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:pickaxe_ancient_metal', display: 'Ancient Metal Pickaxe', d: null, period: null,
    ings: [{ name: 'etim:ingot_ancient_metal', count: 3, slots: [1, 2, 3] }, { name: 'minecraft:stick', count: 2, slots: [5, 8] }],
    note: '创造 古金镐：零行＋+1' }),
  aRow({ id: 'l', group: 'F', mode: 'creative', completions: 0, expectRows: false, expectGone: false,
    carrier: false, quality: null, product: 'etim:helmet_adamantium', display: 'Adamantium Helmet', d: null, period: null,
    ings: [{ name: 'etim:ingot_adamantium', count: 5, slots: [1, 2, 3, 4, 6] }],
    note: '创造 金刚盔（8→5 甲形换档）：零行＋+1' }),
  aRow({ id: 'm', group: 'F', mode: 'survival', product: 'etim:chain_helmet_copper', display: 'Copper Chain Helmet',
    d: 125, period: 94,
    ings: [{ name: 'etim:chain_copper', count: 5, slots: [1, 2, 3, 4, 6] }],
    note: 'A-1 证形格：/give 铜链×5 → Copper Chain Helmet（证形不证可达）' }),
  aRow({ id: 'n', group: 'F', mode: 'survival', product: 'etim:storage_copper', display: 'Copper Block',
    d: 225, period: 123, carrier: false,
    ings: [{ name: 'etim:ingot_copper', count: 9, slots: [1, 2, 3, 4, 5, 6, 7, 8, 9] }],
    note: 'storage_copper_from_ingots：铜锭×9 → 铜块（面 I 旁证；d=225／123）' }),
];

const GROUPS = { s: S_POINTS, c: C_POINTS, n: N_POINTS, f: F_POINTS };

const MODE = (process.env.W47_MODE || 'all').trim();
const ONLY = (process.env.W47_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);
const STAGE = (process.env.W47_STAGE || TAG).trim();

function wantedGroups() {
  if (MODE === 'all') return ['s', 'c', 'n', 'f'];
  return MODE.split(',').map((s) => s.trim().toLowerCase()).filter((k) => GROUPS[k]);
}
function pickPoints(list) {
  return ONLY.length ? list.filter((p) => ONLY.includes(p.id)) : list;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stamp = () => new Date().toISOString().slice(11, 23);
const log = (tag, ...rest) => console.log(`[${stamp()}] [${tag}]`, ...rest);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
const stripPrefix = (l) => l.replace(/^\[[^\]]+\]\s+\[[^\]]+\]\s*(?:\[[^\]]+\])?:\s*/, '').replace(/^\[Server[^\]]*\]\s*/, '');

/* ============================ 判行正则 ============================ */

const RE = {
  craftLine: /\[CraftingLog\]\s+(\S+) \((\d+)\) (.+?)\s+\[server\]\s*$/,
  clientProbe: /\[CraftingLog\]\s+CLIENT result click/,
  sig: /^result CHANGED sig=(\S+) prev=(\S+) .*recompute/,
  periodSet: /^period SET difficulty=([\d.-]+) quality=(\w+) period=(\d+)/,
  click: /^result click btn=(\d+)/,
  start: /^start crafting difficulty=([\d.-]+) quality=(\w+) period=(\d+)/,
  complete: /^COMPLETE (.+) quality=(\w+) xp=(-?\d+) (continue|proceed stopped)$/,
  gone: /^result gone → reset$/,
  penalty: /^damage penalty/,
  damagedClear: /damaged ingredient → crafting cleared/,
  gearGate: /\[TestLog\] gear recipes registered: (\d+) batch rows ok \(runtime REGISTRY delta; etim-domain total (\d+)/,
  mixinFail: /Mixin apply failed|MixinException|InvalidInjectionException/,
  foodReceipt: /commands\.etest\.food_set_pool/,
  xpGive: /commands\.xp\.success\.negative\.levels/,
  holdReceipt: /commands\.etest\.hold_set/,
  fxDone: /Done \(/,
  placed: /Block placed|Unable to place/i,
};

/* ============================ 机械核讫小件 ============================ */

function pinOf(file, pin, label) {
  if (!fs.existsSync(file)) throw new Error(label + ' missing: ' + file);
  const buf = fs.readFileSync(file);
  const sha = sha256(buf);
  return { file: label, bytes: buf.length, sha, ok: buf.length === pin.bytes && sha === pin.sha };
}

function snapshot(file, name) {
  const buf = fs.readFileSync(file);
  const dest = path.join(OUT, name);
  fs.writeFileSync(dest, buf);
  return { path: dest, bytes: buf.length, sha: sha256(buf) };
}

function setProp(text, key, value) {
  const re = new RegExp('(^|\\r\\n)' + key + '=[^\\r\\n]*', 'm');
  if (!re.test(text)) throw new Error('server.properties has no ' + key);
  return text.replace(re, (m, p1) => p1 + key + '=' + value);
}

function cfgValue(text, key) {
  const m = new RegExp('^[ \\t]*[BIF]:' + key + '=(\\S+)', 'm').exec(text);
  return m ? m[1] : null;
}

function netstatListen(port) {
  try {
    const out = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
    return out.split(/\r?\n/).filter((l) => new RegExp(':' + port + '\\s+.*LISTENING').test(l)).length;
  } catch (e) {
    return -1;
  }
}

function crashCount() {
  const dir = path.join(ROOT, 'run', 'crash-reports');
  try {
    return fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile()).length;
  } catch (e) {
    return -1;
  }
}

function mkCounts() {
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
  const out = {};
  for (const [key, f] of [['refmapResources', REFMAP_A], ['refmapTmp', REFMAP_B]]) {
    const r = read(f);
    out[key] = {
      classes: Object.keys(r.mappings).length,
      entries: Object.values(r.mappings).reduce((a, x) => a + Object.keys(x).length, 0),
    };
    out[key].slices = {
      sword: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemSword'] || {}).length,
      tool: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemTool'] || {}).length,
      shears: Object.keys(r.mappings['io/github/etim/etim/mixins/MixinItemShears'] || {}).length,
    };
    out[key].sliceTotal = out[key].slices.sword + out[key].slices.tool + out[key].slices.shears;
  }
  const j = read(MIXIN_JSON);
  out.manifest = { mixins: j.mixins.length, client: (j.client || []).length, server: (j.server || []).length };
  out.ok = out.refmapResources.classes === MK_PIN.refmapClasses
    && out.refmapResources.entries === MK_PIN.refmapEntries
    && out.refmapTmp.classes === MK_PIN.refmapClasses
    && out.refmapTmp.entries === MK_PIN.refmapEntries
    && out.refmapResources.slices.sword === MK_PIN.sword
    && out.refmapResources.slices.tool === MK_PIN.tool
    && out.refmapResources.slices.shears === MK_PIN.shears
    && out.refmapResources.sliceTotal === MK_PIN.sliceTotal
    && out.manifest.mixins === MK_PIN.mixins
    && out.manifest.client === MK_PIN.client;
  return out;
}

/* ============================ boot / bot ============================ */

/** 等 Done(：与「进程已退出 / BUILD FAILED / 原生 OOM」赛跑，失败快速冒泡。 */
async function waitReady(srv, tag) {
  const deadline = Date.now() + 420000;
  while (Date.now() < deadline) {
    const done = srv.all.find((l) => RE.fxDone.test(l));
    if (done) return done;
    const dead = srv.exited || srv.all.some((l) => /BUILD FAILED|insufficient memory|FAILURE: Build failed/.test(l));
    if (dead) throw new Error('boot died before Done( — see ' + tag + '.out');
    await sleep(400);
  }
  return null;
}

async function connectBot() {
  let lastErr = null;
  for (let attempt = 1; attempt <= 8; attempt++) {
    try {
      const b = await createHarnBot({ host: '127.0.0.1', port: PORT, username: BOT });
      if (attempt > 1) log('bot', `connected on attempt ${attempt}`);
      return b;
    } catch (e) {
      lastErr = e;
      log('bot', `connect attempt ${attempt} failed: ${(e && e.message) || e}`);
      await sleep(2500);
    }
  }
  throw lastErr || new Error('bot connect failed');
}

/** bot 侧聊天回执镜像（`/etest food` 等 respond() 只发给玩家，不进服务端 stdout）。 */
function attachBotMessages(bot, ctx) {
  bot.on('message', (m) => {
    const s = m.toString();
    ctx.botMsgs.push({ i: ctx.botMsgs.length, s });
  });
}

/* ============================ 摆场 ============================ */

/** 5×5 石台（by-1 地台＋by..by+2 净空）＋工作台（bx+2, by, bz）。 */
async function buildArena(srv, geo) {
  const R = 2;
  for (let dx = -R; dx <= R; dx++) {
    for (let dz = -R; dz <= R; dz++) {
      srv.send(`setblock ${geo.bx + dx} ${geo.by - 1} ${geo.bz + dz} minecraft:stone 0`);
      for (const dy of [0, 1, 2]) {
        srv.send(`setblock ${geo.bx + dx} ${geo.by + dy} ${geo.bz + dz} minecraft:air 0`);
      }
    }
  }
  await sleep(1200);
  const from = srv.all.length;
  srv.send(`setblock ${geo.bx + 2} ${geo.by} ${geo.bz} minecraft:crafting_table 0`);
  const line = await srv.waitFor(RE.placed, 5000, from);
  await sleep(600);
  return { line: stripPrefix(line || ''), ok: !!line && /Block placed/i.test(line) };
}

/* ============================ 背包 ============================ */

function invCounts(bot) {
  const out = {};
  for (const it of bot.inventory.items()) out[it.type] = (out[it.type] || 0) + it.count;
  return out;
}

function qualityOf(stack) {
  if (!stack || !stack.nbt) return null;
  let root = stack.nbt;
  if (root && root.type === 'compound' && root.value) root = root.value;
  const etim = root.etim;
  if (!etim) return null;
  let e = etim;
  if (e && e.type === 'compound' && e.value) e = e.value;
  const q = e.quality;
  if (q === undefined || q === null) return null;
  if (typeof q === 'number') return q;
  if (q && typeof q === 'object' && 'value' in q) return q.value;
  return q;
}

function firstStackOf(bot, type) {
  return bot.inventory.items().find((i) => i.type === type) || null;
}

/* ============================ 台面原语（batch2-rerun.js 照抄基改） ============================ */

async function openTable(bot, geo) {
  const pos = new Vec3(geo.bx + 2, geo.by, geo.bz);
  const block = bot.blockAt(pos);
  if (!block || block.name !== 'crafting_table') {
    throw new Error('no crafting_table at ' + pos + ' got ' + (block && block.name));
  }
  const winP = new Promise((res, rej) => {
    const t = setTimeout(() => rej(new Error('windowOpen timeout')), 8000);
    bot.once('windowOpen', (w) => { clearTimeout(t); res(w); });
  });
  await bot.activateBlock(block);
  const win = await winP;
  await sleep(500);
  return { win, type: win.type, slots: Object.keys(win.slots).length, pos: { x: pos.x, y: pos.y, z: pos.z } };
}

async function closeTable(bot) {
  try { if (bot.currentWindow) await bot.closeWindow(bot.currentWindow); } catch (e) { /* ignore */ }
  await sleep(400);
}

const GRID = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);

/** 单料落格：拾起整栈 → 逐格右键放 1 → 余料回槽；返回落格核讫。 */
async function putOne(bot, itemId, slots) {
  const win = bot.currentWindow;
  let src = -1;
  for (const [k, s] of Object.entries(win.slots)) {
    const i = Number(k);
    if (s && s.type === itemId && i >= 10 && !GRID.has(i) && s.count >= slots.length) { src = i; break; }
  }
  if (src < 0) return { ok: false, error: 'no source stack for type ' + itemId, src: null };
  await bot.clickWindow(src, 0, 0).catch(() => {});
  await sleep(220);
  for (const g of slots) {
    await bot.clickWindow(g, 1, 0).catch(() => {});
    await sleep(150);
  }
  await bot.clickWindow(src, 0, 0).catch(() => {});
  await sleep(220);
  const placed = slots.map((g) => {
    const s = win.slots[g];
    return { slot: g, type: s ? s.type : null, count: s ? s.count : 0 };
  });
  const bad = placed.filter((p) => p.type !== itemId || p.count !== 1);
  return { ok: bad.length === 0, src, placed, bad: bad.map((b) => b.slot) };
}

/** 结果槽点击（生存=arm，创造=取物）。 */
async function clickResult(bot, mode = 0) {
  try {
    await bot.clickWindow(0, 0, mode);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

/* ============================ 判行解析 ============================ */

function craftRowsOf(seg) {
  const rows = [];
  seg.forEach((line, i) => {
    const m = RE.craftLine.exec(line);
    if (!m) return;
    const body = m[3].trim();
    let kind = 'other';
    const parsed = { idx: i, player: m[1], entityId: +m[2], body };
    if (RE.sig.test(body)) {
      kind = 'sig';
      const s = RE.sig.exec(body);
      parsed.sig = s[1]; parsed.prev = s[2];
    } else if (RE.periodSet.test(body)) {
      kind = 'period';
      const s = RE.periodSet.exec(body);
      parsed.difficulty = +s[1]; parsed.quality = s[2]; parsed.period = +s[3];
    } else if (RE.click.test(body)) {
      kind = 'click';
      parsed.btn = +(RE.click.exec(body)[1]);
    } else if (RE.start.test(body)) {
      kind = 'start';
      const s = RE.start.exec(body);
      parsed.difficulty = +s[1]; parsed.quality = s[2]; parsed.period = +s[3];
    } else if (RE.complete.test(body)) {
      kind = 'complete';
      const s = RE.complete.exec(body);
      const granted = s[1];
      const m2 = /^(.+) (?:×|x)(\d+)$/.exec(granted);
      parsed.display = m2 ? m2[1] : granted;
      parsed.count = m2 ? +m2[2] : null;
      parsed.quality = s[2]; parsed.xp = +s[3]; parsed.tail = s[4];
      parsed.granted = granted;
    } else if (RE.gone.test(body)) {
      kind = 'gone';
    } else if (RE.penalty.test(body)) {
      kind = 'penalty';
    } else if (RE.damagedClear.test(body)) {
      kind = 'damagedClear';
    }
    parsed.kind = kind;
    rows.push(parsed);
  });
  return rows;
}

/* ============================ 标定（§6.1） ============================ */

function calibrateNames() {
  const set = new Set();
  for (const g of [S_POINTS, C_POINTS, N_POINTS, F_POINTS]) {
    for (const p of g) {
      if (p.product) set.add(p.product);
      for (const ing of p.ings) set.add(ing.name);
    }
  }
  return [...set].sort();
}

async function calibrate(srv, bot) {
  const names = calibrateNames();
  const map = {};
  const fails = [];
  let cleared = 0;
  srv.send(`clear ${BOT}`);
  await sleep(500);
  for (const name of names) {
    const before = new Set(bot.inventory.items().map((i) => i.type));
    const from = srv.all.length;
    srv.send(`give ${BOT} ${name} 1`);
    let found = null;
    for (let k = 0; k < 16; k++) {
      await sleep(150);
      found = bot.inventory.items().find((i) => !before.has(i.type));
      if (found) break;
    }
    if (found) map[name] = found.type;
    else {
      const errLine = srv.all.slice(from).find((l) => /Unknown item|No such item|commands\.give/i.test(l));
      fails.push({ name, error: errLine ? stripPrefix(errLine) : 'no new stack observed' });
    }
    if (bot.inventory.items().length >= 30) {
      srv.send(`clear ${BOT}`);
      cleared++;
      await sleep(450);
    }
  }
  srv.send(`clear ${BOT}`);
  await sleep(500);
  return { names: names.length, map, fails, cleared };
}

/* ============================ 判点执行 ============================ */

async function runPoint(srv, bot, p, ctx) {
  const rec = {
    id: p.id, group: p.group, mode: p.mode, note: p.note,
    product: p.product, display: p.display, outCount: p.outCount || 1,
    d: p.d, period: p.period, expect: {
      completions: p.completions, rows: p.expectRows ? 6 : 0,
      invDelta: p.invDelta, quality: p.quality, carrier: p.carrier,
    },
    ings: p.ings, checks: {}, rows: [],
  };
  log(p.id, 'start', p.note);
  srv.send(`say [${p.id}] ${p.product || '(negative)'}`);

  const segStart = srv.all.length;

  // ---------- 工序三连 ----------
  srv.send(`clear ${BOT}`);
  await sleep(350);
  if (ctx.mode !== p.mode) {
    srv.send(`gamemode ${p.mode === 'creative' ? 1 : 0} ${BOT}`);
    await sleep(900);
    ctx.mode = p.mode;
    ctx.modeFlips++;
    log(p.id, 'gamemode -> ' + p.mode);
  }
  const foodFrom = srv.all.length;
  srv.send(`etest food 6 6 ${BOT}`);
  await sleep(350);
  const xpFrom = srv.all.length;
  srv.send(`xp -1000000L ${BOT}`);
  await sleep(450);
  rec.foodReceipt = ctx.botMsgs.filter((m) => m.i >= ctx.msgMark).map((m) => m.s)
    .find((s) => /food_set_pool/.test(s)) || null;
  ctx.msgMark = ctx.botMsgs.length;
  rec.xpReceipt = srv.all.slice(xpFrom).map(stripPrefix).find((l) => /xp|experience/i.test(l)) || null;
  rec.xpLevel = bot.experience ? bot.experience.level : null;

  // ---------- 料 ----------
  for (const ing of p.ings) srv.send(`give ${BOT} ${ing.name} ${ing.count}`);
  await sleep(900);
  rec.before = invCounts(bot);
  rec.gaveOk = p.ings.every((ing) => {
    const id = ctx.ids[ing.name];
    return id !== undefined && (rec.before[id] || 0) >= ing.count;
  });

  // ---------- 开台 ----------
  let winInfo = null;
  let placeRes = [];
  try {
    winInfo = await openTable(bot, ctx.geo);
    for (const ing of p.ings) {
      const id = ctx.ids[ing.name];
      placeRes.push(Object.assign({ name: ing.name, id, slots: ing.slots.length }, await putOne(bot, id, ing.slots)));
    }
  } catch (e) {
    rec.fatal = (e && e.stack) || String(e);
    log(p.id, 'FATAL', rec.fatal);
  }
  rec.window = winInfo ? { type: winInfo.type, slots: winInfo.slots, pos: winInfo.pos } : null;
  rec.place = placeRes;

  const matrixBefore = winInfo ? Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((g) => [g, winInfo.win.slots[g] ? { type: winInfo.win.slots[g].type, count: winInfo.win.slots[g].count } : null])) : null;
  rec.matrixBefore = matrixBefore;

  // ---------- ≥2 tick 后读结果槽 ----------
  await sleep(600);
  const resultSlot = bot.currentWindow ? bot.currentWindow.slots[0] : null;
  rec.resultSlot = resultSlot ? { type: resultSlot.type, count: resultSlot.count, name: resultSlot.name, hasNbt: !!resultSlot.nbt } : null;

  // ---------- 点击 ＋ 等待 ----------
  const clickFrom = srv.all.length;
  const click = await clickResult(bot, 0);
  rec.click = click;

  if (p.mode === 'survival') {
    const t0 = Date.now();
    const budget = p.negative ? 3500 : (p.period || 120) * 50 + 16000;
    let complete = null;
    let lastFeed = Date.now();
    while (Date.now() - t0 < budget) {
      complete = srv.all.slice(segStart).find((l) => /\[CraftingLog\].* COMPLETE /.test(l));
      if (complete) break;
      await sleep(400);
      if (Date.now() - lastFeed > 2500) {
        srv.send(`etest food 6 6 ${BOT}`);
        lastFeed = Date.now();
      }
    }
    rec.completeWaitMs = Date.now() - t0;
    await sleep(1000); // 让 gone 行落定
  } else {
    // 创造相：结果槽未上锁 ⇒ 取到光标 → 移入背包空槽
    await sleep(500);
    await bot.clickWindow(10, 0, 0).catch(() => {});
    await sleep(600);
  }

  rec.after = invCounts(bot);
  rec.resultSlotAfter = bot.currentWindow && bot.currentWindow.slots[0]
    ? { type: bot.currentWindow.slots[0].type, count: bot.currentWindow.slots[0].count } : null;
  rec.matrixAfter = bot.currentWindow ? Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9]
    .map((g) => [g, bot.currentWindow.slots[g] ? { type: bot.currentWindow.slots[g].type, count: bot.currentWindow.slots[g].count } : null])) : null;

  // ---------- 关台（残留回背包）＋ 复读 ----------
  await closeTable(bot);
  await sleep(700);
  rec.afterClose = invCounts(bot);

  // ---------- 判行 ----------
  const seg = srv.all.slice(segStart);
  rec.rows = craftRowsOf(seg);
  rec.rowKinds = rec.rows.map((r) => r.kind);
  rec.rawRows = seg.filter((l) => /\[CraftingLog\]/.test(l)).map((l) => l.trim());
  rec.clientProbeRows = seg.filter((l) => RE.clientProbe.test(l)).length;
  rec.anchors = {};
  for (const r of rec.rows) {
    const lineNo = segStart + r.idx + 1;
    if (!rec.anchors[r.kind]) rec.anchors[r.kind] = lineNo;
  }
  rec.anchorLines = rec.rows.map((r) => ({ kind: r.kind, line: segStart + r.idx + 1, body: r.body }));

  // ---------- 判值 ----------
  const pid = p.product ? ctx.ids[p.product] : null;
  const wantInv = p.product ? rec.outCount : 0;
  const beforeCount = pid !== null ? (rec.before[pid] || 0) : 0;
  const afterCount = pid !== null ? (rec.afterClose[pid] || 0) : 0;
  rec.invDelta = pid !== null ? afterCount - beforeCount : 0;
  rec.wantInvDelta = wantInv;
  rec.invAfter = pid !== null ? afterCount : null;
  const stack = pid !== null ? firstStackOf(bot, pid) : null;
  rec.nbtQuality = qualityOf(stack);
  rec.stackDump = stack ? {
    type: stack.type, count: stack.count, name: stack.name,
    hasNbt: !!stack.nbt, nbt: stack.nbt || null, dmg: stack.durabilityUsed,
  } : null;

  const completes = rec.rows.filter((r) => r.kind === 'complete');
  const sigs = rec.rows.filter((r) => r.kind === 'sig');
  const periods = rec.rows.filter((r) => r.kind === 'period');
  const starts = rec.rows.filter((r) => r.kind === 'start');
  const clicks = rec.rows.filter((r) => r.kind === 'click');
  const gones = rec.rows.filter((r) => r.kind === 'gone');
  const penalties = rec.rows.filter((r) => r.kind === 'penalty');
  const damaged = rec.rows.filter((r) => r.kind === 'damagedClear');

  const sigWant = p.product ? `${p.product}#0×${rec.outCount}` : null;
  rec.periodTable = p.period;
  rec.periodObserved = periods.length ? periods[periods.length - 1].period : null;
  rec.periodDrift = (p.period !== null && rec.periodObserved !== null) ? rec.periodObserved - p.period : null;
  rec.difficultyTable = p.d;
  rec.difficultyObserved = periods.length ? periods[periods.length - 1].difficulty : null;
  const checks = {
    gamemode: true, // 由 driver 切换记录
    foodReceipt: !!(rec.foodReceipt && /food_set_pool/.test(rec.foodReceipt)),
    xpLevelZero: rec.xpLevel === 0,
    gaveAll: rec.gaveOk === true,
    windowOpen: !!winInfo && winInfo.slots >= 46,
    placedAll: placeRes.length === p.ings.length && placeRes.every((r) => r.ok),
    noPenalty: penalties.length === 0,
    noDamagedClear: damaged.length === 0,
    noClientProbe: rec.clientProbeRows === 0,
  };
  if (p.expectRows) {
    const lastComplete = completes.length ? completes[completes.length - 1].idx : -1;
    checks.sigTarget = sigs.length >= 1 && sigs[sigs.length - 1].sig.startsWith(sigWant);
    checks.periodTarget = periods.length >= 1 && periods[periods.length - 1].difficulty === p.d
      && Math.abs(periods[periods.length - 1].period - p.period) <= 1;
    checks.clickOnce = clicks.length === 1 && clicks[0].btn === 0;
    checks.startOnce = starts.length === 1 && starts[0].difficulty === p.d
      && Math.abs(starts[0].period - p.period) <= 1 && starts[0].quality === p.quality;
    checks.completeOnce = completes.length === p.completions;
    checks.completeShape = completes.length > 0 && completes.every((c) => c.display === p.display
      && c.count === rec.outCount && c.quality === p.quality && c.xp === 0 && c.tail === 'continue');
    checks.rowFamily = rec.rows.length >= 5 && rec.rows.length <= 14;
    // 中间产物（如 1 锭→9 粒、匕首是铲的前缀形）合法地产生第二/第三条 gone 行：
    // 判据只要求「COMPLETE 之后还有一条 gone」＝矩阵清空后 timer 复位。
    checks.goneAfterComplete = lastComplete >= 0 && gones.some((g) => g.idx > lastComplete);
  } else {
    checks.zeroRows = rec.rows.length === 0;
    checks.completeNone = completes.length === 0;
  }
  checks.invDelta = rec.invDelta === wantInv;
  if (p.carrier && p.mode === 'survival') {
    checks.qualityTag = rec.nbtQuality !== null;
    checks.qualityOrdinal = rec.nbtQuality === 2; // AVERAGE ordinal 2
  } else if (p.expectRows || p.mode === 'creative') {
    checks.qualityTagAbsent = rec.nbtQuality === null;
  }
  if (p.negative) {
    checks.noSigChain = !rec.rows.some((r) => r.kind === 'sig' && /chain_copper/.test(r.sig || ''));
    checks.matrixRetained = [2, 4, 6, 8].every((g) => rec.matrixAfter && rec.matrixAfter[g]
      && rec.matrixAfter[g].type === ctx.ids['etim:nugget_copper']);
  }

  rec.checkList = checks;
  rec.pass = Object.values(checks).every(Boolean) && !rec.fatal;
  rec.intermediateSigs = sigs.map((s) => s.sig);
  log(p.id, rec.pass ? 'PASS' : 'FAIL',
    `rows=${rec.rows.length}[${rec.rowKinds.join(',')}] Δ=${rec.invDelta}(want ${wantInv})`
    + (p.expectRows ? ` d=${periods.length ? periods[0].difficulty : '-'}/${starts.length ? starts[0].difficulty : '-'}`
      + ` period=${periods.length ? periods[0].period : '-'}/${starts.length ? starts[0].period : '-'}` : '')
    + ` complete=${completes.map((c) => c.granted + '/' + c.quality + '/xp' + c.xp + '/' + c.tail).join('|') || '-'}`
    + ` q=${rec.nbtQuality}`
    + (rec.periodDrift ? ` periodDrift=${rec.periodDrift}` : '')
    + (rec.intermediateSigs && rec.intermediateSigs.length > 1 ? ` sigs=${rec.intermediateSigs.join('>')}` : '')
    + (p.negative ? ` matrixKept=${checks.matrixRetained}` : '')
    + (rec.completeWaitMs ? ` wait=${rec.completeWaitMs}ms` : ''));
  return rec;
}

/* ============================ 主流程 ============================ */

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const ev = { tag: TAG, mode: MODE, only: ONLY, startedAt: new Date().toISOString(), workspace: ROOT, pins: {}, points: [] };

  // ---------- 起窗钉 ----------
  let head = '-';
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch (e) { /* keep */ }
  ev.pins.head = head;
  ev.pins.devJar = pinOf(DEVJAR, PIN.dev, 'dev');
  ev.pins.relJar = pinOf(RELJAR, PIN.rel, 'rel');
  ev.pins.srcJar = pinOf(SRCJAR, PIN.src, 'src');
  ev.pins.cfg = pinOf(CFG, PIN.cfg, 'cfg');
  ev.pins.cfgClient = pinOf(CFG_CLIENT, PIN.cfgClient, 'cfgClient');
  ev.pins.props = pinOf(PROPS, PIN.props, 'props');
  ev.pins.levelNameBefore = /level-name=([^\r\n]*)/.exec(fs.readFileSync(PROPS, 'utf8'))[1];
  const cfgText = fs.readFileSync(CFG, 'utf8');
  ev.pins.cfgCrafting = {
    timer: cfgValue(cfgText, 'craftingTimer'),
    skipCreative: cfgValue(cfgText, 'craftingSkipCreative'),
    debugLog: cfgValue(cfgText, 'craftingDebugLog'),
    damagedDeny: cfgValue(cfgText, 'craftingDamagedDeny'),
    benchModifier: cfgValue(cfgText, 'craftingBenchModifier'),
    speedPerLevel: cfgValue(cfgText, 'craftingSpeedPerLevel'),
  };
  ev.pins.mk = mkCounts();
  log('pin', 'HEAD=' + head + (head.startsWith(PIN.head) ? ' OK' : ' MISMATCH'));
  for (const k of ['devJar', 'relJar', 'srcJar', 'cfg', 'cfgClient', 'props']) {
    log('pin', `${k}=${ev.pins[k].bytes}/${ev.pins[k].sha} ${ev.pins[k].ok ? 'OK' : 'MISMATCH'}`);
  }
  log('pin', 'mk=' + JSON.stringify(ev.pins.mk) + ' ' + (ev.pins.mk.ok ? 'OK' : 'MISMATCH'));
  log('pin', 'cfg crafting=' + JSON.stringify(ev.pins.cfgCrafting));
  if (!ev.pins.devJar.ok || !ev.pins.relJar.ok || !ev.pins.srcJar.ok) throw new Error('jar pin mismatch — refuse to run');
  if (!ev.pins.cfg.ok || !ev.pins.cfgClient.ok || !ev.pins.props.ok) throw new Error('cfg/props pin mismatch — refuse to run');
  if (!ev.pins.mk.ok) throw new Error('MK pin mismatch — refuse to run');
  if (!head.startsWith(PIN.head)) throw new Error('HEAD pin mismatch — refuse to run');
  if (ev.pins.cfgCrafting.timer !== 'true' || ev.pins.cfgCrafting.skipCreative !== 'true'
    || ev.pins.cfgCrafting.debugLog !== 'true') {
    throw new Error('crafting cfg 三键非 true — refuse to run (零 cfg 编辑为前提)');
  }

  ev.pins.crashBefore = crashCount();
  ev.pins.portBefore = netstatListen(PORT);
  log('pin', `crashBefore=${ev.pins.crashBefore} portBefore=${ev.pins.portBefore}`);

  ev.cfgSnapshot = snapshot(CFG, TAG + '-etim.cfg.before');
  ev.cfgClientSnapshot = snapshot(CFG_CLIENT, TAG + '-client-etim.cfg.before');
  ev.propsSnapshot = snapshot(PROPS, TAG + '-server.properties.before');
  const SIDE = ['ops.json', 'usercache.json', 'usernamecache.json'];
  ev.sideSnapshots = {};
  for (const name of SIDE) {
    const f = path.join(ROOT, 'run', name);
    if (fs.existsSync(f)) ev.sideSnapshots[name] = snapshot(f, TAG + '-' + name + '.before');
  }

  // ---------- 单 boot ----------
  let propEdit = setProp(fs.readFileSync(PROPS, 'utf8'), 'level-name', WORLD);
  if (/^spawn-protection=/m.test(propEdit)) propEdit = setProp(propEdit, 'spawn-protection', '0');
  fs.writeFileSync(PROPS, propEdit, 'utf8');
  log('config', `level-name -> ${WORLD} / spawn-protection -> 0；cfg 零编辑`);

  const srv = await startServer({ root: ROOT, tag: STAGE });
  let bot = null;
  let botFailure = null;
  const ctx = { mode: null, ids: {}, geo: null, modeFlips: 0, botMsgs: [], msgMark: 0 };

  try {
    const done = await waitReady(srv, STAGE);
    if (!done) throw new Error('server never reached Done( within 420s');
    ev.boot = {
      ready: stripPrefix(done.trim()),
      modGather: srv.all.find((l) => /Finished gathering \d+ mods/.test(l)) || null,
      levelLine: (srv.all.find((l) => /Preparing level "/.test(l)) || '').trim(),
      jarTask: srv.all.filter((l) => /^> Task :(compileJava|classes|jar)\b/.test(l)),
      buildLine: (srv.all.find((l) => /BUILD SUCCESSFUL|BUILD FAILED/.test(l)) || '').trim(),
      mixinErrors: srv.all.filter((l) => RE.mixinFail.test(l)).slice(0, 8),
    };
    log('boot', 'Done — ' + ev.boot.ready);

    // 守门：gear recipes registered
    const gateLine = srv.all.find((l) => RE.gearGate.test(l)) || null;
    const gm = gateLine ? RE.gearGate.exec(gateLine) : null;
    ev.gate = {
      line: gateLine ? stripPrefix(gateLine) : null,
      batchRows: gm ? +gm[1] : null,
      total: gm ? +gm[2] : null,
      ok: !!gm && +gm[1] === GATE.batchRows && +gm[2] === GATE.total,
    };
    log('gate', JSON.stringify(ev.gate));
    if (!ev.gate.ok) throw new Error('守门行缺失或 runtime 实数 ≠144（A 级停窗）');

    // 熵面：三键现值（boot 后 cfg 复钉）
    const cfgAfterBoot = fs.readFileSync(CFG);
    ev.cfgAfterBoot = {
      bytes: cfgAfterBoot.length, sha: sha256(cfgAfterBoot),
      identical: sha256(cfgAfterBoot) === PIN.cfg.sha && cfgAfterBoot.length === PIN.cfg.bytes,
    };
    log('config', 'after boot: cfg ' + ev.cfgAfterBoot.bytes + ' B ' + (ev.cfgAfterBoot.identical ? 'byte-identical' : 'MISMATCH'));

    // ---------- bot ----------
    bot = await connectBot();
    attachBotMessages(bot, ctx);
    srv.send(`op ${BOT}`);
    srv.send('gamerule doMobSpawning false');
    srv.send('gamerule doMobLoot false');
    srv.send('gamerule doTileDrops false');
    srv.send('gamerule doDaylightCycle false');
    srv.send('gamerule naturalRegeneration false');
    srv.send('gamerule randomTickSpeed 0');
    srv.send('gamerule mobGriefing false');
    srv.send('difficulty 2');
    srv.send('time set 6000');
    srv.send('weather clear');
    srv.send('kill @e[type=!player]');
    srv.send(`gamemode 0 ${BOT}`);
    srv.send(`effect ${BOT} clear`);
    srv.send(`etest health 20 ${BOT}`);
    await sleep(1600);

    const p0 = bot.entity.position;
    const geo = { bx: Math.floor(p0.x), by: Math.floor(p0.y) + 8, bz: Math.floor(p0.z) };
    ctx.geo = geo;
    ev.geo = geo;
    log('setup', `spawn=(${p0.x.toFixed(1)},${p0.y.toFixed(1)},${p0.z.toFixed(1)}) geo=(${geo.bx},${geo.by},${geo.bz})`);
    ev.arena = await buildArena(srv, geo);
    srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
    await sleep(1800);
    let p1 = bot.entity.position;
    let grounded = Math.abs(p1.y - geo.by) < 0.9
      && Math.abs(p1.x - (geo.bx + 0.5)) < 1.2 && Math.abs(p1.z - (geo.bz + 0.5)) < 1.2;
    if (!grounded) {
      srv.send(`tp ${BOT} ${geo.bx + 0.5} ${geo.by} ${geo.bz + 0.5}`);
      await sleep(1800);
      p1 = bot.entity.position;
      grounded = Math.abs(p1.y - geo.by) < 0.9
        && Math.abs(p1.x - (geo.bx + 0.5)) < 1.2 && Math.abs(p1.z - (geo.bz + 0.5)) < 1.2;
    }
    ev.posAfterTp = { x: +p1.x.toFixed(2), y: +p1.y.toFixed(2), z: +p1.z.toFixed(2) };
    ev.grounded = grounded;
    log('setup', `pos=(${p1.x.toFixed(2)},${p1.y.toFixed(2)},${p1.z.toFixed(2)}) grounded=${grounded}`);
    if (!grounded) throw new Error('bot not grounded on the harness platform');

    // ---------- 标定 ----------
    const cal = await calibrate(srv, bot);
    ctx.ids = cal.map;
    ev.calibration = { names: cal.names, mapped: Object.keys(cal.map).length, fails: cal.fails, cleared: cal.cleared, map: cal.map };
    log('calib', `${Object.keys(cal.map).length}/${cal.names} ids mapped; fails=${cal.fails.length}`);
    if (cal.fails.length) log('calib', 'FAILS=' + JSON.stringify(cal.fails));
    if (Object.keys(cal.map).length < cal.names) throw new Error('标定不全（' + cal.fails.length + ' 项）— refuse to run');

    // ---------- 判点 ----------
    const groups = wantedGroups();
    for (const key of groups) {
      const pts = pickPoints(GROUPS[key]);
      if (!pts.length) { log('group', key.toUpperCase() + ' skipped (W47_ONLY)'); continue; }
      log('group', `${key.toUpperCase()} begin — ${pts.length} points`);
      for (const p of pts) {
        let rec;
        try {
          rec = await runPoint(srv, bot, p, ctx);
        } catch (e) {
          rec = { id: p.id, group: p.group, fatal: (e && e.stack) || String(e), pass: false };
          log(p.id, 'FATAL', rec.fatal);
        }
        ev.points.push(rec);
      }
      log('group', `${key.toUpperCase()} done — ` + ev.points.filter((r) => r.group === p_GROUP(key)).length + ' records');
    }

    ev.rowCounts = {
      craftTotal: srv.all.filter((l) => /\[CraftingLog\]/.test(l)).length,
      complete: srv.all.filter((l) => /\[CraftingLog\].* COMPLETE /.test(l)).length,
      sig: srv.all.filter((l) => /\[CraftingLog\].* result CHANGED sig=/.test(l)).length,
      periodSet: srv.all.filter((l) => /\[CraftingLog\].* period SET /.test(l)).length,
      click: srv.all.filter((l) => /\[CraftingLog\].* result click btn=/.test(l)).length,
      start: srv.all.filter((l) => /\[CraftingLog\].* start crafting /.test(l)).length,
      gone: srv.all.filter((l) => /\[CraftingLog\].* result gone → reset/.test(l)).length,
      penalty: srv.all.filter((l) => /\[CraftingLog\].* damage penalty/.test(l)).length,
      damagedClear: srv.all.filter((l) => /\[CraftingLog\].* damaged ingredient → crafting cleared/.test(l)).length,
      clientProbe: srv.all.filter((l) => RE.clientProbe.test(l)).length,
    };
    log('counts', JSON.stringify(ev.rowCounts));
  } catch (e) {
    botFailure = (e && e.stack) || String(e);
    ev.fatal = botFailure;
    log('main', 'FATAL', botFailure);
  } finally {
    try { if (bot) bot.quit(); } catch (e) { /* ignore */ }
    await sleep(1200);
    ev.stop = await srv.stop();
    ev.buildSuccessful = srv.all.some((l) => /BUILD SUCCESSFUL/.test(l));
    try {
      const snap = path.join(OUT, STAGE + '-server-latest.log');
      fs.copyFileSync(RUNLOG, snap);
      ev.logSnapshot = snap;
    } catch (e) {
      ev.logSnapshotError = String((e && e.message) || e);
    }

    // ---------- 收窗：cfg/props 还原（零编辑基线 → 只回填 level-name/spawn-protection） ----------
    fs.writeFileSync(CFG, fs.readFileSync(ev.cfgSnapshot.path));
    fs.writeFileSync(CFG_CLIENT, fs.readFileSync(ev.cfgClientSnapshot.path));
    fs.writeFileSync(PROPS, fs.readFileSync(ev.propsSnapshot.path));
    const cfgAfter = fs.readFileSync(CFG);
    const cfgCAfter = fs.readFileSync(CFG_CLIENT);
    const propsAfter = fs.readFileSync(PROPS);
    ev.cfgRestored = {
      bytes: cfgAfter.length, sha: sha256(cfgAfter),
      identical: sha256(cfgAfter) === PIN.cfg.sha && cfgAfter.length === PIN.cfg.bytes,
      crafting: cfgValue(cfgAfter.toString('utf8'), 'craftingTimer'),
    };
    ev.cfgClientRestored = { bytes: cfgCAfter.length, sha: sha256(cfgCAfter), identical: sha256(cfgCAfter) === PIN.cfgClient.sha };
    ev.propsRestored = { bytes: propsAfter.length, sha: sha256(propsAfter), identical: sha256(propsAfter) === PIN.props.sha };
    log('config', 'cfg restored ' + (ev.cfgRestored.identical ? 'byte-identical' : 'MISMATCH')
      + '／client cfg ' + (ev.cfgClientRestored.identical ? 'byte-identical' : 'MISMATCH')
      + '／props ' + (ev.propsRestored.identical ? 'byte-identical' : 'MISMATCH'));

    ev.sideRestored = {};
    for (const [name, snap] of Object.entries(ev.sideSnapshots)) {
      const f = path.join(ROOT, 'run', name);
      fs.writeFileSync(f, fs.readFileSync(snap.path));
      const after = fs.readFileSync(f);
      ev.sideRestored[name] = { bytes: after.length, sha: sha256(after), identical: sha256(after) === snap.sha };
    }

    const dir = path.join(ROOT, 'run', WORLD);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      ev.worldRemoved = !fs.existsSync(dir);
    } else {
      ev.worldRemoved = true;
    }
    if (ev.worldRemoved) log('cleanup', 'world dir removed: ' + WORLD);

    ev.portAfter = netstatListen(PORT);
    ev.crashAfter = crashCount();
    ev.pinsAfter = {
      devJar: pinOf(DEVJAR, PIN.dev, 'dev'),
      relJar: pinOf(RELJAR, PIN.rel, 'rel'),
      srcJar: pinOf(SRCJAR, PIN.src, 'src'),
      mk: mkCounts(),
    };
    ev.jarUpToDate = (ev.boot && ev.boot.jarTask || []).filter((l) => /UP-TO-DATE/.test(l)).length === 3;
    ev.mixinErrors = ev.boot ? ev.boot.mixinErrors : [];
  }

  // ---------- 总账 ----------
  const pts = ev.points;
  const grp = (g) => pts.filter((p) => p.group === g);
  const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);
  ev.ledger = {
    S: {
      points: grp('S').length,
      complete: sum(grp('S'), (p) => (p.rows || []).filter((r) => r.kind === 'complete').length),
      invPlus: grp('S').filter((p) => p.invDelta >= 1).length,
      pass: grp('S').filter((p) => p.pass).length,
    },
    C: {
      points: grp('C').length,
      complete: sum(grp('C'), (p) => (p.rows || []).filter((r) => r.kind === 'complete').length),
      rows: sum(grp('C'), (p) => (p.rows || []).length),
      invPlus: grp('C').filter((p) => p.invDelta >= 1).length,
      pass: grp('C').filter((p) => p.pass).length,
    },
    N: {
      points: grp('N').length,
      complete: sum(grp('N'), (p) => (p.rows || []).filter((r) => r.kind === 'complete').length),
      rows: sum(grp('N'), (p) => (p.rows || []).length),
      invDelta: sum(grp('N'), (p) => p.invDelta || 0),
      pass: grp('N').filter((p) => p.pass).length,
    },
    F: {
      points: grp('F').length,
      complete: sum(grp('F'), (p) => (p.rows || []).filter((r) => r.kind === 'complete').length),
      invPlus: grp('F').filter((p) => p.invDelta >= 1).length,
      pass: grp('F').filter((p) => p.pass).length,
    },
  };
  ev.ledger.allPass = pts.length > 0 && pts.every((p) => p.pass);
  ev.periodDrifts = pts.filter((p) => p.periodDrift).map((p) => ({
    id: p.id, table: p.periodTable, observed: p.periodObserved, drift: p.periodDrift, d: p.difficultyObserved,
  }));
  ev.intermediateProducts = pts.filter((p) => (p.intermediateSigs || []).length > 1)
    .map((p) => ({ id: p.id, sigs: p.intermediateSigs }));

  ev.verdict = (
    ev.gate && ev.gate.ok
    && pts.length > 0
    && pts.every((p) => p.pass)
    && (ev.rowCounts ? ev.rowCounts.damagedClear === 0 && ev.rowCounts.penalty === 0 && ev.rowCounts.clientProbe === 0 : false)
    && ev.cfgRestored && ev.cfgRestored.identical
    && ev.cfgClientRestored && ev.cfgClientRestored.identical
    && ev.propsRestored && ev.propsRestored.identical
    && Object.values(ev.sideRestored || {}).every((s) => s.identical)
    && ev.pinsAfter && ev.pinsAfter.devJar.ok && ev.pinsAfter.relJar.ok && ev.pinsAfter.srcJar.ok
    && ev.pinsAfter.mk.ok
    && ev.portAfter === 0
    && ev.crashAfter === ev.pins.crashBefore
    && ev.jarUpToDate
    && ev.mixinErrors.length === 0
    && ev.worldRemoved === true
    && ev.buildSuccessful === true
  ) ? 'PASS' : 'FAIL';
  ev.finishedAt = new Date().toISOString();

  const file = path.join(OUT, TAG + '-evidence-' + MODE.replace(/,/g, '') + '.json');
  fs.writeFileSync(file, JSON.stringify(ev, null, 2) + '\n', 'utf8');
  for (const p of pts) log(p.id, p.pass ? 'PASS' : 'FAIL', p.checkList ? JSON.stringify(p.checkList) : '');
  log('ledger', JSON.stringify(ev.ledger));
  log('evidence', file);
  log('VERDICT', ev.verdict);
  process.exit(ev.verdict === 'PASS' ? 0 : 1);
}

/** group key → 记录 group 字段（'s'→'S' …） */
function p_GROUP(key) { return key.toUpperCase(); }

main().catch((e) => { log('boot', 'FATAL:', (e && e.stack) || e); process.exit(1); });
