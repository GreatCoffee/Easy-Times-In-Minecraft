# 阶段四 B3 锈铁金属面复判窗（A-1 / A-2 修复验证）· 判决回执

> **执行方**：会话七（复判窗执行）
> **判据正本**：`playground/audit/metal-rusted-iron-B3-落码批文.md`（§〇 判值 + §三 W 面）＋本窗任务书
> RV-1 / RV-2 / RV-3。
> **现役钉值**：jar **530,192 B** @ **2026-10-24 13:39:10**｜SHA256
> **425B25E5F50A6CAC685375FF7213EE591031AF515F95DBB0FE287A1FE101DB3E**｜
> HEAD = origin/master = **ba22bc9**（产品 `a1e78c9` + 修批 `f2d2cd2` + 工装 `ba22bc9`）｜
> `src/main` 无未提交｜窗内 **0 rebuild**。
> **判据源**：`run/obfuscated-server/logs/latest.log`（`[EquipLog]` / `[MiningLog]` / `[TestLog]`）
> ＋ `maxprobe` 生存态实测（挖块→工具毁损边界）＋ 假玩家客户端箱子窗口槽包。
> 窗口快照 = `build-logs/b3rv-server-latest.log`（330,179 B / 2,631 行）＋
> `build-logs/b3rv-boot.log`（43,097 B / 288 行）。
> **口径**：通过 ✓、不通过 ✗；UTF-8 无 BOM、0 U+FFFD。
> **世界**：`testw2h` 照用未删档（只在 y=100 台架增补判块）。

---

## 零、基线 & boot 核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 530,192 B | 530,192 B | ✓ |
| jar 时间 | 2026-10-24 13:39:10 | 2026-10-24 13:39:10 | ✓ |
| SHA256 | 425B25E5…FE101DB3E | `425B25E5F50A6CAC685375FF7213EE591031AF515F95DBB0FE287A1FE101DB3E` | ✓ 逐位 |
| HEAD / origin | `ba22bc9` / `ba22bc9` | `ba22bc9` / `ba22bc9` | ✓ |
| `src/main` 未提交 | 无 | `git status --porcelain -- src/main` = 空 | ✓ |
| 窗口内 rebuild | 禁止 | 收口复核字节/SHA/mtime/commit 全同 → **0 次** | ✓ |
| 端口 | 起服前 0 | 25565 / 25575 无 LISTEN | ✓ |

boot 锚（`build-logs/b3rv-boot.log` 首 288 行）：

| 判据 | 实测 | 判 |
|---|---|---|
| boot 时长 | `[13:56:42] Done (1.374s)!` | ✓ |
| mixin | `Mixin apply failed` / `MixinApplyError` = **0 / 0** | ✓ |
| `[EquipLog]` 行数 | `gear item=` **109** + `material item=` **7** + `durability reassert` **1** = **117** | ✓ |
| 耐久重断言 | `[13:56:41] [EquipLog] durability reassert: 110 gear rows ok`（110 = 109 可 dump 装备行 + 锈铁箭行） | ✓ |
| 配方行 | `gear recipes registered: 94 shaped rows (90 ingot-based + 4 rusted chain-armor)` | ✓ |
| loot 注入 | 地牢 8 行 + 古金属锭/粒、矿井 7 行（chain 1-5 w5）、骷髅 arrow 换行 `vanilla-arrow-removed=true` 三行各 1 | ✓ |
| cfg 门 | `B:mobEquipDebugLog=true`、`miningDebugLog=true`、`equipDebugLog=true`（保持） | ✓ |
| 世界 | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` | ✓ |

**判据源段界**：boot 戳 `20261024_135631` → `13:56:42 Done`；窗内活动 `13:56:51–14:06:32`；
收口 `14:06:54 Saving worlds → Stopping server (Shutdown Thread)`。
**启动方式**：`javaw.exe`（`start-server.ps1` 默认，WMI 分离、无控制台窗口）。

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **RV-1** | gear 运行时耐久 = 判值（A-1 修复实证） | **PASS** | `maxprobe` **6/6**：锈铁锹 1600 档**碎**、锈铁剑 3200 档**碎**、铜镐 4800 档**碎**、精金镐 307200 **远未碎**、秘银战锤 128000 **远未碎**、锈铁剪刀 3200 档**碎**（表外锚） |
| **RV-2** | 开箱固损 30–90%（A-2 修复实证 / W4(c) 复验） | **PASS** | 700 次开箱、**108 件**锈铁损件全落 **[0.3000, 0.8983]**；**<0.30 = 0**（此前 19/65）、**>0.90 = 0**、0% 损 = 0 |
| **RV-3** | 负证全 0 | **PASS** | `drifted from the judged value` **0**、`IllegalStateException` **0**、mixin **0**、`FATAL`/`Crash report` **0**；`[EquipLog]` 旧 **95 行 byte-identical**、全表 116 行 `badRows=0` |

**总记**：RV-1 / RV-2 / RV-3 **全 PASS**；A 级 **0**、B 级 **0**、C 级 **2**（均为判据可达性，不阻塞）。
**B3 满足闭单条件。**

---

## 二、RV 逐项核讫

### RV-1 · gear 运行时耐久 = 判值 —— **PASS（6/6）**

工装：`testharness/player/b3-run.js maxprobe`（生存态：`/give` 到指定损值 → 生存挖一块 → 读主手槽包）。
**判毁规则**（1.12 `ItemStack.attemptDamageItem`，`ItemStack.java:378`）：
`return getItemDamage() > getMaxDamage()` —— 即 **损值严格超过 maxDamage 才毁**；
故断点探针放在 `start + loss = max + (20 / 50 / 235 / 1)`。

| # | 件 | judgedMax | 起损 | 实际 loss（日志） | 终态 | 期望 | 实测 | 判 |
|---|---|---|---|---|---|---|---|---|
| a | `etim:shovel_rusted_iron` | **1600** | 1595 | **+25** → 1620 > 1600 | 毁（主手空） | 碎 | **碎** | ✓ |
| b | `etim:sword_rusted_iron` | **3200** | 3150 | **+100** → 3250 > 3200 | 毁（主手空） | 碎 | **碎** | ✓ |
| c | `etim:pickaxe_copper` | **4800** | 4795 | **+240** → 5035 > 4800 | 毁（主手空） | 碎 | **碎** | ✓ |
| d | `etim:pickaxe_adamantium` | **307200** | 9595 | **+240** → 9835 | 存活，损值 9835 | 不碎 | **不碎** | ✓ |
| e | `etim:war_hammer_mithril` | **128000** | 9595 | **+160** → 9755 | 存活，损值 9755 | 不碎 | **不碎** | ✓ |
| f | `etim:shears_rusted_iron`（表外锚） | **3200** | 3200 | +1 → 3201 > 3200 | 毁 | 碎 | **碎** | ✓ |

**与 A-1 窗口逐项对照（同一探针法、同一工装）**：

| 锚 | A-1 窗口（修复前） | 本窗（修复后） | 判值 |
|---|---|---|---|
| 锈铁锹 1595 + 25 = 1620 | **存活**（1620） | **碎** | 1600 |
| 锈铁剑 3150 + 100 = 3250 | **存活**（3250） | **碎** | 3200 |
| 铜镐 4795 + 240 = 5035 | **存活**（5035） | **碎** | 4800 |
| 精金镐 9595 + 240 = 9835 | **碎**（判值 307200 远未到） | **存活** | 307200 |
| 秘银战锤 9595 + 160 = 9755 | 未测 | **存活** | 128000 |

四锚（a/b/c/d）全部翻转，**A-1 修复实证成立**；hoe/shears/甲本在覆盖表外，此处抽剪刀 3200 档一次过。
`[EquipLog] durability reassert: 110 gear rows ok` 同时从**产品侧**保证全 110 行（109 装备 + 锈铁箭）
`Item.getMaxDamage() == 判值`，本窗 boot 未抛 `IllegalStateException`。

判行锚（判据源）：
```
[13:56:56] [MiningLog] tool decay face=breaking item=etim:shovel_rusted_iron block=dirt loss=25 [server]
[13:57:02] [MiningLog] tool decay face=breaking item=etim:sword_rusted_iron block=dirt loss=100 [server]
[13:57:08] [MiningLog] tool decay face=breaking item=etim:pickaxe_copper block=stone loss=240 [server]
[13:57:14] [MiningLog] tool decay face=breaking item=etim:pickaxe_adamantium block=stone loss=240 [server]
[13:57:20] [MiningLog] tool decay face=breaking item=etim:war_hammer_mithril block=stone loss=160 [server]
```

### RV-2 · 开箱固损 30–90% —— **PASS（108/108）**

工装：`b3-run.js w4 / w4c`（`setblock air → chest{LootTable}` 逐次重建、假玩家开箱、读客户端
`window_items` 槽包；损值取槽包 `metadata`，分母 = 判值 maxDamage = 运行时 maxDamage）。
开箱：地牢 200 + 矿井 200 + 矿井追加 300 = **700 次，失败 0**。
（`chain_rusted_iron` 不可损，不计入损件。）

| 表 | 开箱 | 损件 | 分数区间 | 落 [0.30,0.90] | <0.30 | >0.90 | 0% 损 |
|---|---|---|---|---|---|---|---|
| `simple_dungeon` | 200 | 43 | 0.3000 – 0.8983 | **43** | **0** | **0** | **0** |
| `abandoned_mineshaft` | 200 | 19 | 0.3538 – 0.8919 | **19** | **0** | **0** | **0** |
| `abandoned_mineshaft`（追加） | 300 | 46 | 0.3015 – 0.8881 | **46** | **0** | **0** | **0** |
| **合计** | **700** | **108** | **0.3000 – 0.8983** | **108 / 108** | **0** | **0** | **0** |

分布（0.1 分箱，n=108）：`0.3:21｜0.4:15｜0.5:13｜0.6:25｜0.7:15｜0.8:19` —— 均匀覆盖 30–90%，无 0.9 以上、
无 0.3 以下；下沿恰为 `floor(0.3×max)`（如锹 480/1600 = 0.3000）。
**负证**：A-2 窗口的 19/65 低于 0.30 已归零；0% 损行 0（与批文负证一致）。

按件区间（分母 = 判值 maxDamage，均已核对 `judgedMax == runtimeMax`）：

| 件 | 件数 | 分数区间 |
|---|---|---|
| `etim:battle_axe_rusted_iron` | 10 | 0.3430 – 0.8983 |
| `etim:axe_rusted_iron` | 14 | 0.3294 – 0.8723 |
| `etim:mattock_rusted_iron` | 16 | 0.3102 – 0.8780 |
| `etim:pickaxe_rusted_iron` | 13 | 0.3015 – 0.8619 |
| `etim:war_hammer_rusted_iron` | 12 | 0.3006 – 0.8589 |
| `etim:shovel_rusted_iron` | 18 | 0.3000 – 0.8881 |
| `etim:hatchet_rusted_iron` | 6 | 0.4431 – 0.8919 |
| `etim:shears_rusted_iron` | 6 | 0.3891 – 0.8281 |
| `etim:sword_rusted_iron` | 5 | 0.5578 – 0.7244 |
| `etim:dagger_rusted_iron` | 4 | 0.4531 – 0.8656 |
| `etim:hoe_rusted_iron` | 4 | 0.3528 – 0.8472 |

**A-2 修复对照**：`SetDamage(RandomValueRange(0.3,0.9))` → `(1-f)` 实得 0.1–0.7（A-2 窗口 65/65 落
(0.1013,0.6972]）；修后传 `(0.1,0.7)` → 实得 **0.30–0.90**，本窗 108/108 落位。
(a)(b) 面同时复验在档：地牢 8 行全在 + 古金属粒 57 / 锭 46；矿井 7 行全在（含 chain 26 栈）。

### RV-3 · 负证 —— **PASS（全 0）**

| 探针 | 命中 | 判 |
|---|---|---|
| `drifted from the judged value`（reassert 失败文案） | **0** | ✓ |
| `IllegalStateException` | **0** | ✓ |
| `Mixin apply failed` / `MixinApplyError` | **0 / 0** | ✓ |
| `NullPointerException` | **0** | ✓ |
| `FATAL` / `Crash report` | **0 / 0** | ✓ |
| `ConcurrentModificationException` | **0** | ✓ |
| `cannot be restored` | **0** | ✓ |
| `produces unregistered item` | **0** | ✓ |
| `Exception reading` | **0** | ✓ |
| `Couldn't set damage of loot item` | **0** | ✓ |
| `[EquipLog]` 旧 95 行 | **95/95 byte-identical**（`changedCount=0`, `onlyOld=[]`） | ✓ |
| `[EquipLog]` 全表 | 116 行（109 gear + 7 material），`badRows=0`，锚点 7/7，`onlyNew` 恰 21 | ✓ |
| 锈铁锚点 | `sword_rusted_iron maxDamage=3200` / `shears_rusted_iron maxDamage=3200` | ✓ |

---

## 三、冲突分级

### A 级（真值冲突 — 必须修）

**无。** A-1（`ETIMToolDurability.apply()` 覆盖 `ETIMMetalGear` 的 maxDamage）已由 `f2d2cd2`
以「跳过 `ETIMMetalGear` + `reassertJudgedDurability()` 失败即抛 + `[EquipLog]` 重断言行」闭合，
本窗 RV-1 六锚 + reassert 行双向实证。
A-2（1.12 `SetDamage` 语义倒置）已由 `f2d2cd2` 改传 `(0.1F, 0.7F)` 闭合，本窗 RV-2 108/108 实证。

### B 级（需主会话裁口径）

**无。**

### C 级（登记，不阻塞）

1. **C-RV-1 · 箱内链件栈计数不可达 5（对 C-B3-5 的根因定案）**
   本窗矿井 58 栈：`1→48、2→8、3→2、4→0、5→0`；与 B3 窗 39 栈（1→29、2→6、3→3、4→1、5→0）
   累计 **97 栈 / 124 个链节**，仍无 5。
   根因**不在** `SetCount`（`ETIMMetalLoot.java:67` 传 `SetCount(1,5)` 逐字在档），而在 1.12
   `LootTable.fillInventory` → `shuffleItems`（`LootTable.java:83-132`）：**凡 `getCount() > 1` 的栈都会被
   随机二分拆栈，直到装得进箱子的空槽预算**，故 5 会裂成 `1+4`/`2+3`，观测分布必然压向 1–2。
   判值本身成立；**建议后续判据改为「多箱累计链节总数 / 单箱自由槽 ≥ 件数 时判单箱」**，不再以
   单箱栈计数判 1-5。
2. **C-RV-2 · 锈铁剪刀挖树叶只 +1 且无 `[MiningLog] tool decay` 行**
   实测 `3199 → 3200`（+1），走的是 1.12 `ItemShears` 瞬时坏块的 vanilla 路径，未经 ETIM 漏斗落行。
   帽值判定不受影响（3200 档 +1 即毁，RV-1(f) 过）；仅登记判据可达性。
3. B3 遗留 C 项状态不变：C-B3-1（非村民持械率样本偏低）、C-B3-2（甲 tier 3/4 统计不可达）、
   C-B3-3（先损后附魔 1 件）、C-B3-4（弓 fallback 无专用判行）、C-B3-6（锈铁 poor 低于合成地板不可观测）、
   C-B3-7（`[MobLog]` 无去重门）、C-B3-8（首启 RCON 线程工装事故；本窗全程玩家 chat 命令路径）。
   **C-B3-5 已由 C-RV-1 定案**（vanilla 拆栈，非模组缺陷）。

---

## 四、判行锚点摘录

```
[13:56:40] [EquipLog] gear item=etim:sword_rusted_iron maxDamage=3200 attackDamage=6.0 efficiency=0.625 grade=2 burn=100 armor=0.0
[13:56:40] [EquipLog] gear item=etim:shears_rusted_iron maxDamage=3200 attackDamage=0.0 efficiency=1.25 grade=2 burn=100 armor=0.0
[13:56:41] [EquipLog] durability reassert: 110 gear rows ok [server]
[13:56:40] [TestLog] gear recipes registered: 94 shaped rows (90 ingot-based + 4 rusted chain-armor)
[13:56:41] [TestLog] skeleton loot injected: rusted arrow (1-2) vanilla-arrow-removed=true
[13:56:41] [TestLog] dungeon chest loot injected: ancient metal nugget+ingot (1-4, weight 10) + 8 rusted rows [server]
[13:56:41] [TestLog] mineshaft chest loot injected: 7 rusted rows (chain 1-5 w5) [server]
[13:56:42] Done (1.374s)!
[13:56:56] [MiningLog] tool decay face=breaking item=etim:shovel_rusted_iron block=dirt loss=25 [server]
[13:57:02] [MiningLog] tool decay face=breaking item=etim:sword_rusted_iron block=dirt loss=100 [server]
[13:57:08] [MiningLog] tool decay face=breaking item=etim:pickaxe_copper block=stone loss=240 [server]
[13:57:14] [MiningLog] tool decay face=breaking item=etim:pickaxe_adamantium block=stone loss=240 [server]
[13:57:20] [MiningLog] tool decay face=breaking item=etim:war_hammer_mithril block=stone loss=160 [server]
[14:06:54] Stopping server → Saving worlds
```

判据工件（`build-logs/`）：`b3rv-server-latest.log`（330,179 B / 2,631 行，判据源快照）、
`b3rv-boot.log`（43,097 B / 288 行，boot 段）、`b3r-maxprobe.out`、
`b3-maxprobe.json`、`b3r-w4.out` / `b3-w4.json`、`b3r-w4c.out` / `b3-w4c.json`。

**工装改动清单**（本窗）：
- `testharness/player/b3-run.js`
  1. `runtimeMaxDamageOf()` 由「A-1 IRON 覆盖表（9600/3200/6400）」改为**委托判值表**
     （A-1 已修，删除 `RUNTIME_IRON` 第二张表）；W2d/W4 的损值归一回到判值分母。
  2. `maxprobe` 扩为 6 例 + 判据化：输出 `judgedMax / expectBreak / toolBroken / pass`；
     断毁判定改为「主手物品**类型变化或槽空**」（工具碎后同槽会立刻捡起掉落方块，原
     `after === null` 会误判）。
  3. 剪刀锚改用 `minecraft:leaves`，起损抬到 3200（1.12 毁损门是 `damage > max`，非 `>=`）。

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 服务端 | `[14:06:54] Saving worlds → Stopping server (Shutdown Thread)`，进程退出（RCON `stop`，非 taskkill）；keeper 报 `exited after 620s` |
| 判据源快照 | `build-logs/b3rv-server-latest.log`（**330,179 B** / 2,631 行）＋ `build-logs/b3rv-boot.log`（**43,097 B** / 288 行） |
| 端口 | 25565 / 25575 **无 LISTEN** |
| `server.properties` | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1`（未改） |
| 世界 | `testw2h` 照用未删档；本窗仅 y=100 台架判块/判箱 |
| cfg | `mobEquipDebugLog` / `miningDebugLog` / `equipDebugLog` 均 true（未改） |
| 产品面 | jar **530,192 B @ 13:39:10** / SHA256 `425B25E5…FE101DB3E` / HEAD `ba22bc9` = origin / `src/main` 干净 |
| 窗内 rebuild | **0 次** |
| 启动方式 | `javaw.exe`（WMI 分离、无控制台窗口、判据面 log4j） |
| 客户端 | 未起 obf 客户端（全部服务端判行 + 假玩家封包/窗口） |

---

## 六、结论

- **RV-1 PASS**：A-1 修复后 gear 运行时耐久 = 判值，四锚（锈铁锹 1600 / 锈铁剑 3200 / 铜镐 4800 /
  精金镐 307200）逐位翻转，秘银战锤 128000 与表外剪刀 3200 同判；产品侧 `reassert 110 rows ok` 兜底。
- **RV-2 PASS**：A-2 修复后开箱固损 108/108 落 **[0.3000, 0.8983]**，`<0.30` 由 19/65 归零，`>0.90` 与 0% 损均 0。
- **RV-3 PASS**：reassert 漂移行 / `IllegalStateException` / mixin / `FATAL` / Crash 全 0；`[EquipLog]`
  旧 95 行 byte-identical、116 行 `badRows=0`。
- A 级 0、B 级 0、C 级 2（均判据可达性；C-B3-5 根因定案 = 1.12 拆栈）。
- **B3 整单满足闭单条件**，可落账补62 + 账本升级。
