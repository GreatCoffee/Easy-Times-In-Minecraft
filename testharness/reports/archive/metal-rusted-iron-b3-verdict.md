# 阶段四 B3 锈铁金属面验证窗 · 判决回执

> **执行方**：会话七（验证窗执行）
> **判据正本**：`playground/audit/metal-rusted-iron-B3-落码批文.md`（§〇 判值 + §三 W 面）+ 本窗任务书。
> **现役钉值**：jar **529,601 B** @ **2026-10-24 12:26:51**｜SHA256
> **09044CCE3A6A15F2B650AE1C5B4BC5E8C716ADFB187FA3D1C9806EF35D01A5FD**｜commit **a1e78c9**
> （`src/main` 无未提交）｜窗内 **0 rebuild**（收口复核逐位同钉值）。
> **判据源**：服务端 `latest.log`（`[EquipLog]` boot dump、`[MobLog]`、`[TestLog]` 注入行、
> `[CraftingLog]` quality 行、`[MiningLog] tool decay`）＋ 假玩家客户端实体装备包（`entity_equipment`）
> ＋ `/give` `/clear` 回执 ＋ 客户端箱子窗口槽包。窗口快照 = `build-logs/b3r-server-latest.log`
> （判据源正本）＋ `build-logs/b3r-boot.log`（boot 段 273 行）。
> **口径**：通过 ✓、不通过 ✗；UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档（只在 y=99 台架增补判块/箱子/合成台）。

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 529,601 B | 529,601 B | ✓ |
| jar 时间 | 2026-10-24 12:26:51 | 2026-10-24 12:26:51 | ✓ |
| SHA256 | 09044CCE…5D01A5FD | `09044CCE3A6A15F2B650AE1C5B4BC5E8C716ADFB187FA3D1C9806EF35D01A5FD` | ✓ 逐位 |
| commit | `a1e78c9` | `a1e78c9` | ✓ |
| `src/main` 未提交 | 无 | `git status --porcelain -- src/main` = 空 | ✓ |
| boot | Done 1.3 s 级、mixin fail 0 | `[12:38:52] Done (1.697s)!`；`Mixin apply failed/MixinApplyError = 0` | ✓ |
| [EquipLog] 全表 | 116 行（95+21） | `gear = 109` + `material = 7` = **116** | ✓ |
| 配方行 | 94 = 90+4 | `[12:38:49] gear recipes registered: 94 shaped rows (90 ingot-based + 4 rusted chain-armor)` | ✓ |
| 宝箱注入 | 地牢/矿井/骷髅三行 | 三行各 1 条；`vanilla-arrow-removed=true` | ✓ |
| cfg 判行门 | `mobEquipDebugLog` + `miningDebugLog` + `equipDebugLog` | 三项均 true（`mobEquipDebugLog` 本窗新置 true） | ✓ |
| 世界 | `testw2h` 照用 | `level-name=testw2h` / `DEFAULT` / `difficulty=1` / `view-distance=10` | ✓ |
| 窗口内 rebuild | 禁止 | 收口复核字节/SHA/mtime/commit 全同 → **0 次** | ✓ |

**判据源段界**：boot 戳 `20261024_123837` → `12:38:52 Done`；窗内活动 `12:39:35–13:33:19`；
收口 `13:33:25 Stopping server → Saving worlds`。
**运行方式**：本窗第二次启动已按用户指令改用 **javaw.exe**（`start-server.ps1` 默认路径改
`javaw.exe`，WMI 分离启动无控制台窗口；判据面仍是 log4j `latest.log`）。

### 零-附 · 窗内操作事故（工装，非模组缺陷）

首次启动的批量召唤阶段（12:37:03）服务端以 `ConcurrentModificationException`（Ticking entity，
`Chunk.func_177414_a`）崩服。根因 = **1.12 的 RCON 命令在 RCON 线程执行**（`DedicatedServer.handleRConCommand`
直调 `commandManager`），与服务器 tick 并发改 chunk 实体表。**处置**：本窗所有变更类命令改走
假玩家 chat（`bot.chat('/…')`，服务器线程执行），实体重排/召唤/方块全部线程安全。事故快照
`build-logs/b3-rcon-crash.log`（64,278 B）＋ `build-logs/b3-crash-2026-10-24_12.37.03.txt`。
**最终判据源是重启后的日志，`ConcurrentModificationException/FATAL/Crash report` 全 0。**

---

## 一、判决类清单

| # | 判点 | 判 | 判值摘要 |
|---|---|---|---|
| **W1** | `[EquipLog]` 复判（+21 行 / 原 95 行不漂） | **PASS** | 116 行：109 gear + 7 material；`badRows=0`；锚点 **7/7**；旧 95 行 **byte-identical**、`onlyNew` 恰 21 项、`onlyOld=[]`；锈铁甲全套 **6**（链 **4**） |
| **W2** | 僵尸面（持械/权重/day 门/村民/甲穿戴/损耗） | **PASS**（1 处 C 级） | 非村民 200×3 窗 + 村民 100×3 窗；持械率 non-villager **3.34%**（20/599，95%CI 1.9–4.8）／villager **20.7%**（62/300）；手斧 day<10 **0**、day≥10 **2**；村民剪刀/锄/镐锄/镐分支逐窗在案；甲 tier 0/1/2 逐档对上表；损耗 plain **42/42** 落 [0.7,1.0)（3 件为整数截断下沿）、ench 1/2 落 [0.5,0.8) |
| **W3** | 骷髅面（1/20 day 门 + 箭掉落 + 弓 fallback） | **PASS** | day12 4/120 全匕首；day22 9/120 = 剑 3 + 匕首 6；掉落 **锈铁箭 52 / vanilla 箭 0**、骨头 35（32 杀）；弓 fallback **16/16** |
| **W4** | 宝箱面（地牢 8 行 / 矿井 7 行 / 开箱固损） | **FAIL（c 面）** | (a) 地牢 8 行全在 + 古金属锭/粒 55/53 ✓；(b) 矿井 7 行全在（链 17 栈 + 6 行）✓；(c) 固损实测 **0.10–0.70**（65/65）≠ 判值 30–90% **✗**（A-2） |
| **W5** | quality 上限 | **PASS**（1 处 C 级） | 合成选择器 `range=[2..N]`：铜/银 **4**、古 **6**、秘银/精金 **7** 逐位；锈铁链甲 `max≤min` 无 cycle 行（poor < average 地板，C 级） |
| **W6** | 负证 | **PASS** | 锈铁锭/粒/镰/刀 `give` 全 “no such item”；配方 **94** 行；mixin/NPE/cannot-be-restored/Failed-to-load/produces-unregistered/Exception-reading/FATAL/Crash-report **全 0** |

**总记**：W1/W2/W3/W5/W6 PASS，**W4(c) FAIL**；**A 级真值冲突 2 笔**（A-1 运行时耐久被覆盖、A-2 开箱固损 1.12 语义倒置）；
B 级 0 笔；C 级 8 笔（登记，不阻塞，见 §三）。

> **W1 的 PASS 是 dump 面判值；A-1 说明该 dump 的 maxDamage 列不是运行时真值**（dump 在 preInit、
> 覆盖在 init）。两件事不矛盾：W1 判据（+21 行/旧行不漂/badRows=0）逐位成立，但“耐久数值”这一列
> 不能当作运行时耐久依据。

---

## 二、逐方法核讫

### W1 · `[EquipLog]` 116 行 —— **PASS**

判法两条腿：
1. **全表重算**：`testharness/player/b2-equip.js` 扩表（`MAT` 增 `rusted_iron`：grade 2 / damage 2.0 /
   dur 4 / eff 1.25 / armor 6；`shears` 特判 durability 3200 / eff 1.25 / 基伤 0）→ 109+7 行逐列重算。
2. **新旧 diff**：`testharness/player/b3-equip-diff.js` 以上窗 B2 jar boot 快照为旧集、本窗 boot 为新集。

```
{ oldRows: 95, newRows: 116, changedCount: 0, unchangedCount: 95,
  addedCount: 21, onlyOld: [], onlyNew: [chain_rusted_iron, 10 tools, 8 armor, arrow_rusted_iron, shears_rusted_iron] }
```

```
gearRows=109  materialRows=7  badRows=0
armorSets: rusted_iron=6  rusted_iron-chain=4  (copper 7/5, silver 7/5, ancient 8/6, mithril 9/7, adamantium 10/8)
anchorsOk: pickaxe_copper ✓ helmet_copper ✓ chain_helmet_copper ✓ war_hammer_mithril ✓
           pickaxe_adamantium ✓ sword_rusted_iron ✓ shears_rusted_iron ✓
w8missing: langEn 0 / langZh 0 / model 0 / texture 0
```

锈铁锚点行原文（本窗 dump）：

```
[EquipLog] gear item=etim:sword_rusted_iron maxDamage=3200 attackDamage=6.0 efficiency=0.625 grade=2 burn=100 armor=0.0
[EquipLog] gear item=etim:shears_rusted_iron maxDamage=3200 attackDamage=0.0 efficiency=1.25 grade=2 burn=100 armor=0.0
[EquipLog] gear item=etim:pickaxe_rusted_iron maxDamage=4800 attackDamage=4.0 efficiency=1.25 grade=2 burn=100 armor=0.0
[EquipLog] gear item=etim:war_hammer_rusted_iron maxDamage=8000 attackDamage=4.0 efficiency=0.9375 grade=2 burn=100 armor=0.0
[EquipLog] gear item=etim:helmet_rusted_iron maxDamage=40 attackDamage=0.0 efficiency=1.25 grade=2 burn=-1 armor=1.25
[EquipLog] gear item=etim:chain_helmet_rusted_iron maxDamage=20 attackDamage=0.0 efficiency=1.25 grade=2 burn=-1 armor=0.8333333333333334
[EquipLog] material item=etim:arrow_rusted_iron maxStackSize=64 burn=-1
```

| 判据项 | 期望 | 实测 | 判 |
|---|---|---|---|
| 新增行数 | 21（18 装备 + 剪 + 箭 + 链） | **21**，`onlyOld=[]` | ✓ |
| 旧行漂移 | 0 | **95/95 byte-identical**（90 原 gear + 5 条原 chain material 行） | ✓ |
| 判值逐位 | §〇 21 件 | 109 gear + 7 material 全表 `badRows=0` | ✓ |
| 锈铁甲点 | 全套 6 / 链 4 | **6 / 4** | ✓ |
| 锚点 | 7 行 | **7/7** | ✓ |
| 资产 | 21 件 lang/model/texture | `w8missing` 全 0 | ✓ |

> ⚠ **A-1 旁证**：本 dump 的 `maxDamage` 列取自 `preInit` 的 `ETIMGear.register()→dumpInventory()`
> （`ETIM.java:69`），而 `init` 的 `ETIMToolDurability.apply()`（`ETIM.java:104`）会把同一批装备
> 的 maxDamage 改写成 IRON 占位材质档（见 §三 A-1）。运行时真值不是本表的 maxDamage 列。

### W2 · 僵尸面 —— **PASS**（持械率 1 处 C 级）

工装：`b3-run.js w2 / w2d`；召唤走假玩家 chat（服务器线程），坐标按 20×N 网格铺开（防同格堆叠），
每窗 `/kill` 清场；判定行 = `[MobLog] mob weapon / mob armor`（通道无去重，逐次落行——已以同一 item
的连续重复行实证）。

#### (a) 持械率与权重

（n = 召唤数；95% CI 为二项正态近似）

| 窗 | day | kind | n | 持械行 | 率 | 95% CI |
|---|---|---|---|---|---|---|
| z-day5 | 5 | zombie | 200 | 5 | 2.50% | 0.34–4.66 |
| z-day12 | 12 | zombie | 200 | 6 | 3.00% | 0.64–5.36 |
| z-day22 | 22 | zombie | 199 | 9 | 4.52% | 1.63–7.37 |
| zv-day5 | 5 | zombie_villager | 100 | 24 | 24.0% | 15.6–32.4 |
| zv-day12 | 12 | zombie_villager | 100 | 20 | 20.0% | 12.2–27.8 |
| zv-day22 | 22 | zombie_villager | 100 | 18 | 18.0% | 10.5–25.5 |

- 非村民合并 **20/599 = 3.34%**（CI 1.9–4.8%）——代码锚 `nextFloat() >= 0.05F → return` 逐字在档；
  样本偏低 1.7σ，登记 C-B3-1（不判 FAIL）。
- 村民合并 **62/300 = 20.7%**（CI 17.3–24.1%）——判值 20% ✓。
- 权重分布（行内 item 计数）：

```
z-day5  : wooden_shovel 2 | shovel_rusted 3
z-day12 : wooden_shovel 3 | dagger 1 | sword 2
z-day22 : dagger 4 | hatchet 2 | sword 2 | shovel_rusted 1
zv-day5 : shears 10 | shovel_rusted 12 | wooden_shovel 2
zv-day12: mattock 7 | hoe 2 | shovel_rusted 4 | shears 4 | wooden_shovel 1 | hatchet 2
zv-day22: shovel_rusted 8 | shears 3 | hoe 3 | pickaxe 3 | mattock 1
```

- 权重表语义（`shovel_rusted w2` vs `sword/dagger w1`；村民剪刀/锄/镐锄/镐各 w1）与代码逐项对上；
  单窗样本小，按“在场/不在场”判（见 b/c）。

#### (b) day 门（手斧）

| 窗 | 手斧行 | 期望 | 判 |
|---|---|---|---|
| z-day5（day<10） | **0** | 0 | ✓ |
| z-day12（day≥10） | 0（本窗 6 把武器内未掷中） | 允许 | ✓（见下） |
| z-day22（day≥10） | **2** | 在场 | ✓ |

#### (c) 村民分支

| day 门 | 观察到 | 判 |
|---|---|---|
| zv-day5 | 剪刀 10；无锄/镐锄/镐 | ✓ |
| zv-day12 | 锄 2 + 镐锄 7（+手斧 2）；无镐 | ✓ |
| zv-day22 | 镐 3（+锄 3 + 镐锄 1 + 剪刀 3） | ✓ |

#### (d) 甲穿戴 tier 表 + mob 件损耗

`w2d`（hard + day8 满月，tension 抬升）220 次召唤取 20 个带甲/带械 mob、44 件：

| tier | 观察到的件 | 判值映射 | 判 |
|---|---|---|---|
| 0 | leather 头盔/胸/腿/靴 各 4 | 皮革 | ✓ |
| 1 | chain_*_rusted_iron 5/4/3/2 | 链锈铁 | ✓ |
| 2 | chain_*_copper 各 1 | 链铜 | ✓ |
| 3 | **未出现** | rusted_iron | C-B3-2（P≈0.5%/甲 mob，样本不可达） |
| 4 | **未出现** | copper | C-B3-2（P≈0.04%） |

损耗比例（分母 = **运行时** maxDamage，见 A-1；甲件分母 = dump 值，未被覆盖）：

| 类 | 件数 | 落带 | 判 |
|---|---|---|---|
| 无附魔 | 42 | [0.7,1.0) **42/42**（其中 3 件 0.6875/0.6923 为 `floor(0.7×max)` 整数截断下沿） | ✓ |
| 带附魔 | 2 | [0.5,0.8) **1/2**；另一件 0.8727 = 先损后附魔（`setEnchantmentBasedOnDifficulty` 在装备面之后） | ✓（C-B3-3） |

### W3 · 骷髅面 —— **PASS**

| # | 判据 | 实测 | 判 |
|---|---|---|---|
| a | day12 1/20 近战全匕首 | 4/120 全 `dagger_rusted_iron` | ✓ |
| a | day22 半数换剑 | 9/120 = 剑 **3** + 匕首 **6** | ✓ |
| b | 掉落换行：锈铁箭 1-2、vanilla 箭 0 | 32 杀：**锈铁箭 52**、**vanilla 箭 0**、骨头 35 | ✓ |
| b | loot 换行实证 | boot 行 `skeleton loot injected: rusted arrow (1-2) vanilla-arrow-removed=true` + 掉落 0 vanilla | ✓ |
| c | 弓面 fallback 行/面在案 | 16 个样本主手 **16/16 `minecraft:bow`**（另一次抽样 15/16 + 1 匕首，与 1/20 近战率一致） | ✓ |

> 说明：批文 W3(c) 写“弓面 fallback 行在案”，落码未发**专用行**（`addRandomSkeletonWeapon`
> 的 else 分支只 `setItemStackToSlot(BOW)`，不落 `[MobLog]`）。本窗改以**客户端 `entity_equipment`
> 主手包**判（16/16 bow），属“命令/封包可捕捉”的判据，已登记 C-B3-4。

### W4 · 宝箱面 —— **(a)(b) PASS / (c) FAIL**

工装：`b3-run.js w4 / w4c`（`/setblock air → chest {LootTable}` 逐次重建，假玩家开箱，读客户端
`window_items` 槽包；`SetDamage` 的损值直接取槽包 `metadata`）。共 200+200+300 次开箱，失败 0。

#### (a) 地牢（`chests/simple_dungeon`，200 开）

| 行 | 件数 | 判 |
|---|---|---|
| `etim:shears_rusted_iron`（w3） | 6 | ✓ |
| `etim:shovel/hoe/mattock/dagger/sword/battle_axe/war_hammer_rusted_iron`（w2） | 3/5/8/3/1/6/7 | ✓ 八行全在 |
| `etim:nugget_ancient_metal` | 55 | ✓ |
| `etim:ingot_ancient_metal` | 53 | ✓ |

#### (b) 矿井（`chests/abandoned_mineshaft`，200+300 开）

七行全在：`chain_rusted_iron` 17+22 栈、`shovel` 8+5、`hatchet` 3+4、`axe` 4+4、`mattock` 7+4、
`pickaxe` 1+1、`war_hammer` 3+6。

链件计数（39 栈）：**1→29、2→6、3→3、4→1、5→0**。批文“1-5”的 5 未在样本内出现且分布强烈偏 1，
登记 **C-B3-5**（建议专批核查 `SetCount(1,5)` 与 1.12 `fillInventory` 的实际分布）。

#### (c) 开箱固损 —— **FAIL**

判值：锈铁件 `(int)(3.0+rand×7.0)` = **3-9/10（30–90%）**；负证：0% 损 0 条。
实测（分母 = 运行时 maxDamage，A-1）：

| 表 | 件数 | 分数区间 | 落 (0.1,0.7] | 低于 0.30 |
|---|---|---|---|---|
| 地牢 | 39 | 0.1013–0.6972 | **39/39** | 10 |
| 矿井 | 26 | 0.1066–0.6822 | **26/26** | 9 |
| 合计 | 65 | 0.1013–0.6972 | **65/65** | **19（29.2%）** |

- 0% 损行 **0 条** ✓（负证成立）。
- 但分布整体落在 **10–70%**，不是判值的 30–90% —— 1.12 `SetDamage.apply` 是
  `f = 1.0F - range.generateFloat(rand)` → 传 `RandomValueRange(0.3,0.9)` 得到的是 `(0.1,0.7]`
  （A-2）。**W4(c) 判 FAIL。**

### W5 · quality 上限 —— **PASS**（锈铁档 C 级）

工装：生存态合成台，`/etest level 200` 供 XP 预算，右键结果槽 8 次，读 `[CraftingLog] quality cycle … range=[min..max]`。

| 件 | 判值上限 | 实测 `range` | 判 |
|---|---|---|---|
| sword_copper | excellent(4) | `[2..4]` ×8 | ✓ |
| sword_silver | excellent(4) | `[2..4]` ×8 | ✓ |
| sword_ancient_metal | masterwork(6) | `[2..6]` ×8 | ✓ |
| sword_mithril | legendary(7) | `[2..7]` ×8 | ✓ |
| sword_adamantium | legendary(7) | `[2..7]` ×8 | ✓ |
| chain_helmet_rusted_iron | poor(1) | 右键 7 次均 `result click btn=1`，**0 条 cycle 行** | ✓（≤ average；见 C-B3-6） |

> 锈铁 21 件的 `etimQuality()=POOR(1)` 低于合成地板 AVERAGE(2)：`getMaxOrdinal` 落回 min，
> 选择器不可上探 —— 故 **“poor” 的具体落值在服务端合成面不可观测**（等价于 AVERAGE 上限）；
> 代码分支逐位在档（`ETIMQuality.materialMaxOf` 的 `ETIMMetalGear`/`ETIMItemArrowRusted` 分支）。
> 锈铁箭无配方（批文挂账），同样不可合成观测 —— **C-B3-6**。

### W6 · 负证 —— **PASS**

```
/give etim:ingot_rusted_iron  → There is no such item with name etim:ingot_rusted_iron
/give etim:nugget_rusted_iron → There is no such item with name etim:nugget_rusted_iron
/give etim:scythe_rusted_iron → There is no such item with name etim:scythe_rusted_iron
/give etim:knife_rusted_iron  → There is no such item with name etim:knife_rusted_iron
[TestLog] gear recipes registered: 94 shaped rows (90 ingot-based + 4 rusted chain-armor)
```

全窗负证计数（判据源快照）：

| 探针 | 计数 | 判 |
|---|---|---|
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| `NullPointerException` | 0 | ✓ |
| `cannot be restored` | 0 | ✓ |
| `Failed to load data for block entity` | 0 | ✓ |
| `produces unregistered item` | 0 | ✓ |
| `Exception reading` | 0 | ✓ |
| `FATAL` / `Crash report` | 0 / 0 | ✓ |
| `ConcurrentModificationException`（判据源） | 0（仅工装事故日志，见 §零-附） | ✓ |
| `skeleton arrow removal missed` | 0（反射移除成功） | ✓ |
| `Couldn't set damage of loot item` | 0 | ✓ |
| `[MobLog] quality downgrade` | 0（无 sidecar，符合 R196 面） | ✓ |
| vanilla 箭掉落 | 0（32 杀） | ✓ |

---

## 三、冲突分级

### A 级（真值冲突 — 必须修）

#### A-1 · 运行时 maxDamage 被 `ETIMToolDurability` 覆盖（B2+B3 全工具类）

**一手链**：
- `ETIM.java:69`（preInit）`ETIMGear.register()` → `dumpInventory()` 打印 `[EquipLog]`（记的是**判值**）。
- `ETIM.java:104`（init）`ETIMToolDurability.apply()` 遍历 `ForgeRegistries.ITEMS`，对
  `ItemPickaxe/ItemAxe/ItemSpade/ItemSword` 按 **ToolMaterial 名**重写
  `maxDamage = (int)(4.0 × components × durability × 100)`（`ETIMToolDurability.java:36-95`）。
- ETIM 金属装备的类全部以 **IRON 占位材质**喂 super ctor（`ETIMGear.register` 的设计），
  `getToolMaterialName() = "IRON"` → durability **8.0F**：
  **ItemPickaxe/ItemAxe 3 comp → 9600｜ItemSpade 1 → 3200｜ItemSword 2 → 6400**。
  `ItemHoe`（ETIMItemHoe 直接继承 ItemHoe）与 `ItemShears`、`ItemArmor` 不在该表内，保持判值。

**运行时实测（`maxprobe`，生存态真实挖掘 + 耐久边界）**：

```
etim:shovel_rusted_iron      start=1595  +25  =1620  → 存活（判值 1600；1600 档应碎）
etim:sword_rusted_iron       start=3150  +100 =3250  → 存活（判值 3200）
etim:pickaxe_copper          start=4795  +240 =5035  → 存活（判值 4800）
etim:pickaxe_adamantium      start=9595  +240 =9835  → 碎（判值 307200 应远未到）
```

**旁证（掉落/装备损耗必须按运行时分母才归一）**：
- mob 损耗（`w2d`）按 3200/6400/9600 归一 → 42/42 落 [0.7,1.0)；
- 宝箱 `SetDamage`（W4）按 3200/6400/9600 归一 → 65/65 落 (0.1,0.7]；
- 若按 `[EquipLog]` 判值归一，分数会大量 >1.0（例：锈铁锹 2225/1600=1.39、锈铁手斧 6271/1600=3.92）。

**影响表（B2 五金属 × 10 型；hoe 除外）**：

| 型（类） | 判值（铜/银） | 判值（古） | 判值（秘银） | 判值（精金） | **运行时** |
|---|---|---|---|---|---|
| pickaxe（ItemPickaxe） | 4800 | 19200 | 76800 | 307200 | **9600** |
| axe（ItemAxe） | 4800 | 19200 | 76800 | 307200 | **9600** |
| hatchet（ItemAxe） | 1600 | 6400 | 25600 | 102400 | **9600** |
| battle_axe（ItemAxe） | 6400 | 25600 | 102400 | 409600 | **9600** |
| war_hammer（ItemPickaxe） | 8000 | 32000 | 128000 | 512000 | **9600** |
| shovel（ItemSpade） | 1600 | 6400 | 25600 | 102400 | **3200** |
| mattock（ItemSpade） | 6400 | 25600 | 102400 | 409600 | **3200** |
| sword（ItemSword） | 3200 | 12800 | 51200 | 204800 | **6400** |
| dagger（ItemSword） | 1600 | 6400 | 25600 | 102400 | **6400** |
| hoe（ItemHoe） | 3200 | 12800 | 51200 | 204800 | 判值（未覆盖） |

锈铁同构：pickaxe/axe/hatchet/battle_axe/war_hammer → **9600**；shovel/mattock → **3200**；
sword/dagger → **6400**；hoe/shears → 判值 3200；甲 → 判值（40/64/56/32，链 20/32/28/16）。

**判定**：批文 §〇 判值（含 B2 五金属）是正本，运行时耐久与正本不符 → **A 级真值冲突**。
**建议修法**（产品代码，最小改）：`ETIMToolDurability.apply()` 跳过 `ETIMMetalGear` 实例
（`if (item instanceof ETIMMetalGear) continue;`），并在 apply 之后重跑一次
`ETIMGear` 判值断言（或把 `[EquipLog]` dump 移到 init 的 apply 之后），使 dump 与运行时同真。
否则 B2 的“adamantium 307200 / mithril 128000”锚点只在日志里成立、游戏里是 9600。

#### A-2 · 开箱固损 1.12 `SetDamage` 语义倒置（W4(c) 判 FAIL 的直接原因）

`ETIMMetalLoot.entry()` 传 `new SetDamage(..., new RandomValueRange(0.3F, 0.9F))`，按 1.13+ 语义
理解为“损 30–90%”。1.12 的实现是：

```java
// SetDamage.java:28-34
float f = 1.0F - this.damageRange.generateFloat(rand);
stack.setItemDamage(MathHelper.floor(f * (float)stack.getMaxDamage()));
```

→ 实际损值分数 = **1 − [0.3,0.9) = (0.1,0.7]**，即 **10–70%**。实测 65/65 全落 (0.1013,0.6972]，
其中 19 件（29.2%）低于判值下限 30%。
**建议修法**：传 `new RandomValueRange(0.1F, 0.7F)`（得 `(1-0.7, 1-0.1] = [0.3,0.9)`），
或改用自写 loot function 直写 `(int)(3.0 + rand×7.0)/10`。

### B 级（需主会话裁口径）

**无。** W2/W3/W5/W6 的判值均与批文相符；W4 的 (c) 已按 A 级登记（判 FAIL）。

### C 级（登记，不阻塞）

1. **C-B3-1 · 非村民持械率样本偏低**：20/599 = 3.34%（95%CI 1.9–4.8%）vs 判值 5%。
   代码锚 `nextFloat() >= 0.05F → return` 逐字；村民 20.7% 命中 20%。判为抽样波动（1.7σ），
   建议后续窗把非村民样本抬到 ≥1000/窗再钉率。
2. **C-B3-2 · 甲 tier 3/4 样本不可达**：tier 起 `nextInt(2)` + 3×9.5% 升档 → P(tier3)≈0.9%、
   P(tier4)≈0.086%（按起点 1 计 0.086%/0.00086%）。本窗 20 甲 mob 只到 tier 2。tier→件映射
   （tier1=链锈铁、tier3=锈铁）由 `ETIMMobEquip.getArmorItemForSlot:188-222` 逐档在档，
   下三档实测对上；tier3/4 留待大样本或命令直调。
3. **C-B3-3 · 1 件“带附魔却落在 0.87”**：`setEnchantmentBasedOnDifficulty` 在装备面之后执行，
   先按无附魔 0.7–1.0 扣损、后附魔 → 分数落在无附魔带。属机制顺序（R196 同构），非判行漂移。
4. **C-B3-4 · 骷髅弓面 fallback 无专用判行**：落码 else 分支不落 `[MobLog]`；本窗以客户端
   `entity_equipment` 16/16 bow 判。建议后续给 fallback 补一行 `mob weapon … item=bow`（判据可达性）。
5. **C-B3-5 · 链件计数分布偏 1、5 未出现**：39 栈 → 1×29 / 2×6 / 3×3 / 4×1 / 5×0；
   均匀 1–5 下 5 缺席概率 ≈1.7e-4。建议专批核查 `SetCount(new RandomValueRange(1,5))` 在
   1.12 `LootTable.fillInventory` 的实际分布（或改为自写 count function）。
6. **C-B3-6 · 锈铁/锈铁箭的 “poor” 上限在合成面不可观测**：POOR(1) < AVERAGE(2) 地板，
   `getMaxOrdinal` 落回 2 → 选择器无 cycle 行、产物 = AVERAGE。代码分支在档；判值留待
   tooltip/客户端面或直调命令。
7. **C-B3-7 · `[MobLog]` 无去重门**：与任务书附注“有去重门”不符（同一 item 的重复行逐次落盘，
   已实证）。统计面按行计数即可；不阻塞。
8. **C-B3-8 · 工装事故（RCON 线程）**：见 §零-附；本窗已改用玩家 chat 命令路径，最终判据源 0 崩。

> 批文自带 C-B2R-1/C-B2R-2 与 B3 无关，仍留专批；本次新增 A-1 **同时影响 B2 五金属**，建议
> 与 B3 一起在下一修批处理（一行守卫 + dump 时序 + 断言）。

---

## 四、判行锚点摘录

```
[12:38:49] [TestLog] gear recipes registered: 94 shaped rows (90 ingot-based + 4 rusted chain-armor) [server]
[12:38:52] Done (1.697s)!
[12:39:35] [MobLog] mob weapon entity=Zombie villager=false item=etim:shovel_rusted_iron [server]
[12:47:..] [MobLog] mob weapon entity=Zombie villager=true item=etim:shears_rusted_iron [server]
[12:47:..] [MobLog] mob armor entity=Zombie slot=HEAD item=etim:chain_helmet_rusted_iron tier=1 [server]
[12:47:..] [MobLog] mob weapon entity=Skeleton item=etim:dagger_rusted_iron melee=true [server]
[13:07:31] [MiningLog] tool decay face=breaking item=etim:shovel_rusted_iron block=dirt loss=25 [server]
[13:07:42] [MiningLog] tool decay face=breaking item=etim:sword_rusted_iron block=dirt loss=100 [server]
[13:17:13] [MiningLog] tool decay face=breaking item=etim:pickaxe_copper block=stone loss=240 [server]
[13:17:19] [MiningLog] tool decay face=breaking item=etim:pickaxe_adamantium block=stone loss=240 [server]
[CraftingLog] quality cycle index=4 (EXCELLENT) range=[2..4] qDifficulty=...   ← copper/silver sword
[CraftingLog] quality cycle index=6 (MASTERWORK) range=[2..6] ...              ← ancient sword
[CraftingLog] quality cycle index=7 (LEGENDARY) range=[2..7] ...               ← mithril/adamantium sword
[TestLog] dungeon chest loot injected: ancient metal nugget+ingot (1-4, weight 10) + 8 rusted rows [server]
[TestLog] mineshaft chest loot injected: 7 rusted rows (chain 1-5 w5) [server]
[TestLog] skeleton loot injected: rusted arrow (1-2) vanilla-arrow-removed=true
```

判据工件（`build-logs/`）：
`b3r-server-latest.log`（2,758,320 B，判据源快照）、`b3r-boot.log`（41,669 B，boot 段）、
`b3-w2.json` / `b3-w2d.json` / `b3-w3.json` / `b3-w3b.json` / `b3-w4.json` / `b3-w4c.json` /
`b3-w5.json` / `b3-w6.json` / `b3-typemap.json` / `b3-maxprobe.json` / `b3-equip-diff.json` /
`b3-probe*.out` / `b3-rcon-crash.log`（事故）+ `b3-crash-2026-10-24_12.37.03.txt`。

工装改动清单：
- `testharness/player/b3-run.js`（新，w2/w2d/w3/w3b/w4/w4c/w5/w6 + 诊断相位；玩家 chat 命令路径、
  客户端装备包/箱子窗口判读、运行时 maxDamage 表）。
- `testharness/player/b3-equip-diff.js`（新，B2 boot vs B3 boot 逐行 diff）。
- `testharness/player/b2-equip.js`（扩 `rusted_iron` 材质行 + shears 特判 + 锈铁锚点）。
- `testharness/server/start-server.ps1`（`java.exe` → **`javaw.exe`** 无窗启动，默认参数）。

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 服务端 | `[13:33:25] Stopping server → Saving worlds → Stopping server(Shutdown Thread)`，进程退出（RCON `stop`，未用 taskkill） |
| 判据源快照 | `build-logs/b3r-server-latest.log`（**2,758,320 B**）＋ `build-logs/b3r-boot.log`（**41,669 B**，273 行） |
| 端口 | 25565 / 25575 **无 LISTEN** |
| `server.properties` | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` / `view-distance=10` / `generator-settings=`（未改） |
| 世界 | `testw2h` B2 台架照用；本窗增补：合成台 (-36,100,12)、两处判箱 (-30/-34,100,31)、y=100 判块若干；未删档 |
| cfg | `mobEquipDebugLog=true`（本窗新置）+ `miningDebugLog`/`equipDebugLog`/`metalDebugLog`/`furnaceDebugLog` 均 true |
| 产品面 | jar **529,601 B @ 12:26:51** / SHA256 `09044CCE…5D01A5FD` / commit `a1e78c9` / `src/main` 干净（收口逐位复核同钉值） |
| 窗内 rebuild | **0 次** |
| 启动方式 | 第二次启动走 **javaw.exe**（`testharness/server/start-server.ps1` 新默认）；boot 戳 `20261024_123837` |
| 客户端 | 本窗**无 obf 客户端面**（全部服务端判行 + 假玩家封包/窗口），未起客户端 |
| 事故 | 首次启动 RCON 线程并发崩服（工装）；快照 2 件；最终判据源 0 崩 |

---

## 六、结论

- **W1 PASS**（116 行 / +21 / 旧 95 行逐位不漂 / badRows=0 / 锚点 7/7），但 **A-1** 使 dump 的
  maxDamage 列不代表运行时耐久。
- **W2 PASS**：持械面/权重/day 门/村民分支/甲 tier 下三档/损耗比例全部逐位在档（1 处 C 级统计偏差）。
- **W3 PASS**：1/20 + day 门、锈铁箭换行（52 锈铁 / 0 vanilla）、弓 fallback 16/16。
- **W4 (a)(b) PASS，(c) FAIL**：八行地牢/七行矿井/古金属行全在；但开箱固损实测 **10–70%**，判值
  **30–90%** → **A-2**（1.12 SetDamage 语义倒置）。链件计数 C-B3-5。
- **W5 PASS**：五金属上限 4/4/6/7/7 逐位；锈铁 poor 低于合成地板，机理成立但落值不可观测（C-B3-6）。
- **W6 PASS**：锭/粒/镰/刀零注册，94 配方行，负证全 0。
- **A 级 2 笔必须修后才能闭 B3**：A-1（`ETIMToolDurability` 覆盖 ETIMMetalGear，影响 B2+B3 全工具、
  精金 307200→9600）+ A-2（`SetDamage(0.3,0.9)` → 实得 0.1–0.7）。B 级 0；C 级 8 登记。
