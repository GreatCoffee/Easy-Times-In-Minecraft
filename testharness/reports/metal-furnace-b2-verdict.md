# 阶段四 B2 验证窗（金属装备面 + 采集级扩档 + 时运/触及/燃面）· 判决回执

> **执行方**：会话七（验证窗执行）
> **判据正本**：`playground/audit/metal-furnace-B2-落码批文.md` §〇 判值修正块（唯一判值依据）
> **现役钉值**：jar **503,844 B** @ **2026-10-24 09:54:41**｜
> SHA256 **74F52965CE321E5C1214B4691CF2C6D4C5A1005820A453E42E1C84A5071C886C**｜commit **1fce2e8**
> **判据源**：服务端 `latest.log`（`[EquipLog]` / `[MiningLog]` / `[FurnaceLog]` / `reach denied` / RCON 回执）
> ＋ 驱动侧 `/clear` 计数与 `/testforblock` 行为面；两 boot 判据源留档 `build-logs/`（见 §七）
> **口径**：通过用 ✓、不通过用叉号；本报告 UTF-8 无 BOM、0 U+FFFD。窗口内 **0 次 rebuild**。

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 503,844 B | 503,844 B | ✓ |
| jar 时间 | 2026-10-24 09:54:41 | 2026-10-24 09:54:41 | ✓ |
| SHA256 | 74F52965…071C886C | `74F52965CE321E5C1214B4691CF2C6D4C5A1005820A453E42E1C84A5071C886C` | ✓ 逐位 |
| commit | 1fce2e8 | `1fce2e8` | ✓ |
| `src/main` 相对 HEAD | 0 改动 | `git status --porcelain -- src/main` = 0 行 | ✓ |
| 载入面 | classpath append（mods 零 etim） | `classpath append: …build\libs\etim-1.0.0.jar (mtime=2026-10-24 09:54:41)` | ✓ |
| 窗口内重建 | 禁止 | 收口复核字节数/SHA256/mtime 全同 → 0 次 | ✓ |
| 世界 | 复用旧世界 `testw2h`（勿删档） | `level-name=testw2h / DEFAULT / difficulty=1 / view-distance=10`，未换档 | ✓ |
| config（判行门） | metal 节 `equipDebugLog` / `miningDebugLog` | 服务端 cfg **原缺两键**（新增键未进旧 cfg）；本窗手工补入 metal 节，`furnaceDebugLog/metalDebugLog/metalSystem/metalOreGen=true`、`foodTestMode=false` | ✓（见 C-1） |
| 冒烟基线 | 旧世界 boot Done 1.096s、90 gear recipes、[EquipLog] 95 行 | 本窗 boot1 `Done (1.343s)` / boot2 `Done (1.284s)`；`gear recipes registered: 90 shaped rows (50 tools + 40 armor)`；`[EquipLog] gear=90 / material=5` | ✓ |

**台架**：在 `testw2h` 内新建 B2 台架 —— y=99 石平台 x∈[-52,-16]、z∈[4,44]；
采集块 y=100 @ z=8（x -50…-18）；触及块 y=100 @ z=40（x -48…-24）；
熔炉（vanilla -44/obsidian -41）@ z=24；工作台 (-38,100,24)；坠落/伤害场 (-20,100,36)。B1 台架未动。

---

## 一、判决类清单（W1~W8）

| # | 判点 | 判词 | 一手判行锚 | 判值 |
|---|---|---|---|---|
| W1 | `[EquipLog]` 全表对公式 | **PASS** | `ETIMGear.dumpInventory` :195-217；`ETIMMetalGear` 四列 | **90/90 行逐位无 off-by**（非抽验）＋ material 5 行 ＋ 五锚点 5/5 ＋ 甲全套合计 7/9/10（链 5/7/8） |
| W2 | 采集级矩阵（deny + 实挖） | **PASS 7/7** | `ETIMMining.getToolGrade` :380-386（ETIM 直读）；`isEffectiveAgainstBlock` :397-431 | 铜镐×秘银矿 deny `grade=2 required=3` 且块未破；铜镐×铜矿破且掉 1；秘银镐×秘银矿破 str=10.0；铜镐×艾德曼矿 deny `grade=2 required=4`；艾德曼镐×艾德曼矿破 str=12.0；deny 行去重 |
| W3 | 效率带（mine speed） | **PASS 6/6** | `getCurrentPlayerStrVsBlock` :190-239（`logMineSpeed` :208） | 铜镐石 **7.0**｜铜锄土 **3.5**｜铜斧木 **7.0**｜铜斧砂岩 **3.5**（×0.5 面）｜铜铲土 7.0｜铁镐石 8.0（vanilla funnel） |
| W4 | 工具燃面 100 ＋ 甲/链负证 | **PASS 7/7** | `MixinTileEntityFurnace` `fuel burn=` :131；`MixinContainer` 燃料槽门 :94-103 | 五金属镐 `burn=100 (vanilla)` 各 1 行；甲/链 `fuel burn=0` ＋ `gui place denied (heat=0 cap=2 …)` |
| W5 | 触及面（3.50 / 3.25 / 2.75） | **PASS 9/10（1 项未达）** | `ETIMReach.getBlockReach` :97-116；`ETIMReachEvents.deny` :102-110 | 铜镐/铜锄 deny 行 `> **3.50**`、空手 `> **2.75**`，边界按 3.75/3.00（reach+0.25 容差）切换；**匕首 `> 2.75`（3.25 未达，B-2）** |
| W6 | 盔甲穿戴（甲条合计） | **PASS（甲点面）** | `ETIMMetalArmor.getItemAttributeModifiers` :89-99；`[EquipLog] armor=` | 全套合计恰 copper **7.0**/链 **5.0**、silver 7.0/5.0、ancient **8.0**/6.0、mithril **9.0**/7.0、adamantium **10.0**/8.0；单件全查（见 §二.W6）。减伤抽样不可判（C-5/C-6） |
| W7 | 配方五笔 | **PASS 5/5** | `ETIMGear.addShaped` :150-170（90 行）；`[TestLog] gear recipes registered` | 五笔全成：copper pickaxe / mithril sword / copper helmet / adamantium 链 helmet / copper boots，产物各 1（`/clear` 自证） |
| W8 | 贴图占位 + lang | **登记（不判 FAIL）** | `assets/etim/{models,textures,lang}` | 95 件 ×（model＋texture＋en_us＋zh_cn）**缺 0**；贴图=B1 ingot 占位（C-7 口径，只登记） |

**总记**：**W1/W2/W3/W4/W6/W7/W8 全过；W5 = 9/10**（匕首 3.25 未达，B 级）｜
A 级真值冲突 **0 笔**｜B 级 **2 笔**（B-1 任务书 W2 铁镐行口径冲突、B-2 匕首 reach）｜C 级 **11 笔**。

---

## 二、逐项核讫

### W1 · `[EquipLog]` 全表对公式 —— **PASS（90/90 逐位）**

判法：`testharness/player/b2-equip.js` 从日志解析 90 行 gear dump，按批文 §一 公式**重算六列**
（maxDamage / attackDamage / efficiency / grade / burn / armor），逐行逐列比对（不是抽验）。

```
[10:03:08] [EquipLog] gear item=etim:pickaxe_copper maxDamage=4800 attackDamage=5.0 efficiency=1.75 grade=2 burn=100 armor=0.0
[10:03:08] [EquipLog] gear item=etim:helmet_copper maxDamage=40 attackDamage=0.0 efficiency=1.75 grade=2 burn=-1 armor=1.4583333333333333
[10:03:08] [EquipLog] gear item=etim:chain_helmet_copper maxDamage=20 attackDamage=0.0 efficiency=1.75 grade=2 burn=-1 armor=1.0416666666666667
[10:03:08] [EquipLog] gear item=etim:war_hammer_mithril maxDamage=128000 attackDamage=7.0 efficiency=1.875 grade=4 burn=100 armor=0.0
[10:03:08] [EquipLog] gear item=etim:pickaxe_adamantium maxDamage=307200 attackDamage=8.0 efficiency=3.0 grade=5 burn=100 armor=0.0
```

| 判据项 | 期望 | 实测 | 判 |
|---|---|---|---|
| gear 行数 | 50 工具 + 40 甲 = 90 | 90 | ✓ |
| 材料行数 | chain ×5 | 5（`maxStackSize=8 burn=-1`） | ✓ |
| 逐行六列 | `maxDamage=4.0×部件×系数×100`、`attack=基伤+材质伤`、`eff=材质效×型修正`、`grade`、`burn=100`、`armor=0` | **badRows = 0**（90 行全等，容差 1e-9） | ✓ |
| 甲四列 | `maxDamage=部件×系数×(非链×2)`、`armor=部件×(甲点−链2)÷24` | 40 行全等（如 helmet 1.4583333333333333 / 链 1.0416666666666667） | ✓ |
| 锚点 5 条 | pickaxe_copper / helmet_copper / chain_helmet_copper / war_hammer_mithril / pickaxe_adamantium | 5/5 逐位 | ✓ |
| 全套合计 | copper 7.0（链 5.0）、mithril 9.0（链 7.0）、adamantium 10.0（链 8.0） | 全中（另 silver 7.0/5.0、ancient 8.0/6.0） | ✓ |
| 单件甲点 | copper helmet 1.4583 / cuirass 2.3333 / adamantium boots 1.6667 | 全中 | ✓ |
| 注册 fail-fast | A-2 同口径 `assertRegistered()` | boot 无 `produces unregistered` / 无抛错 | ✓ |

**注（C-9）**：甲行的 `efficiency`/`grade` 列是**材质值**（非 0），只有 `maxDamage`/`armor`/`burn` 参与甲判。

### W2 · 采集级矩阵 —— **PASS 7/7**

判法：生存假玩家持指定工具，向目标块发 raw `block_dig`（START→STOP），读 `[MiningLog]` 与
`/testforblock` 行为面（块是否还在）＋ 掉落计数。

```
[10:23:35] [MiningLog] mine deny grade=2 required=3 item=etim:pickaxe_copper block=ore_mithril [server]
[10:23:45] [MiningLog] mine speed item=etim:pickaxe_copper block=ore_copper str=7.0 [server]
[10:23:56] [MiningLog] mine speed item=etim:pickaxe_mithril block=ore_mithril str=10.0 [server]
[10:24:02] [MiningLog] mine speed item=minecraft:iron_pickaxe block=ore_mithril str=8.0 [server]
[10:24:09] [MiningLog] mine deny grade=2 required=4 item=etim:pickaxe_copper block=ore_adamantium [server]
[10:24:16] [MiningLog] mine speed item=etim:pickaxe_adamantium block=ore_adamantium str=12.0 [server]
```

| 组合 | 期望 | 实测 | 判 |
|---|---|---|---|
| copper pickaxe × ore_mithril（min 3） | deny grade=2 required=3 ＋ 不掉 | deny 行 1 条；块**仍在**（`/testforblock` 命中）；无 speed 行 | ✓ |
| copper pickaxe × ore_copper（min 2） | 可挖掉落 | 无 deny；块**已破**；`/clear` 计得 ore_copper **1** | ✓ |
| mithril pickaxe × ore_mithril | 破 ＋ str=10.0 | 块已破；`str=10.0`（4.0×2.5） | ✓ |
| iron pickaxe（vanilla）× ore_mithril | 批文：vanilla fold 不动（3）→ 可挖 | 无 deny；块已破；str=8.0（vanilla funnel） | ✓（见 B-1） |
| copper pickaxe × ore_adamantium（min 4） | deny grade=2 required=4 | deny 行 1 条；块仍在 | ✓ |
| adamantium pickaxe × ore_adamantium | 破 ＋ str=12.0 | 块已破；str=12.0（4.0×3.0） | ✓ |
| deny 行去重 | 同 (item,block) 二次点击不新增行 | 行数 1 → 1 | ✓ |

**G-FB-12 绕 fold 成立**：ETIM 工具直读 grade（2/4/5），未按 vanilla 折成 3；vanilla 面仍折 3。

### W3 · 效率带 —— **PASS 6/6**

```
[10:29:47] [MiningLog] mine speed item=etim:hoe_copper block=dirt str=3.5 [server]
[10:29:52] [MiningLog] mine speed item=etim:axe_copper block=log str=7.0 [server]
[10:29:57] [MiningLog] mine speed item=etim:axe_copper block=sandstone str=3.5 [server]
[10:30:03] [MiningLog] mine speed item=etim:shovel_copper block=dirt str=7.0 [server]
[10:30:08] [MiningLog] mine speed item=minecraft:iron_pickaxe block=stone str=8.0 [server]
```

| 组合 | 判值 | 实测 | 判 |
|---|---|---|---|
| copper pickaxe × stone | 4.0×1.75 = **7.0** | 7.0 | ✓ |
| copper hoe × dirt | 4.0×1.75×0.5 = **3.5** | 3.5 | ✓ |
| copper axe × log | 4.0×1.75 = **7.0** | 7.0 | ✓ |
| copper axe × sandstone | 4.0×1.75×0.5 = **3.5** | **3.5**（砂岩 0.5 面确实走到） | ✓ |
| copper shovel × dirt | 4.0×1.75 = **7.0** | 7.0 | ✓ |
| iron pickaxe × stone（对照） | 现行 funnel，不预设 | 8.0（记值） | ✓ |

与 W1 dump 列互证：`efficiency` 列 × 4.0 = 本表 str（1.75→7.0、0.875→3.5、1.3125→5.25 等）。

### W4 · 工具燃面 ＋ 甲/链负证 —— **PASS 7/7**

```
[10:26:23] [FurnaceLog] fuel burn=100 item=etim:pickaxe_copper (vanilla) [server]
[10:26:29] [FurnaceLog] fuel burn=100 item=etim:pickaxe_silver (vanilla) [server]
[10:26:34] [FurnaceLog] fuel burn=100 item=etim:pickaxe_mithril (vanilla) [server]
[10:26:40] [FurnaceLog] fuel burn=100 item=etim:pickaxe_adamantium (vanilla) [server]
[10:26:45] [FurnaceLog] fuel burn=100 item=etim:pickaxe_ancient_metal (vanilla) [server]
[10:26:51] [FurnaceLog] fuel burn=0 item=etim:helmet_copper (vanilla) [server]
[10:26:51] [FurnaceLog] gui place denied (heat=0 cap=2 furnace=minecraft:lit_furnace) item=etim:helmet_copper [server]
[10:26:56] [FurnaceLog] gui place denied (heat=0 cap=2 furnace=minecraft:lit_furnace) item=etim:chain_copper [server]
```

| 判据项 | 期望 | 实测 | 判 |
|---|---|---|---|
| 五金属镐投炉 | `burn=100` ×5 | 5 行全 100（`(vanilla)` 面，非 r196 改写） | ✓ |
| 燃烧推进 | 燃料槽实烧（heat 1 面） | 输入 cobblestone 被烧（burn 行即消费燃料的证据） | ✓ |
| 甲投炉 | 不燃（burn 0 / 拒收） | `fuel burn=0` ＋ `gui place denied (heat=0 …)` | ✓ |
| 链投炉 | 不燃 | 同上（`chain_copper`） | ✓ |
| 熔炼产物负证 | 甲/链不产出锭 | `smelt admit` 0 / `xp payout` 0 | ✓ |

**口径修正（登记）**：工装最初把负证判成「burn 行 0 条」，实测非燃料会落 **`fuel burn=0`** 行
（vanilla `getItemBurnTime` 回 0 的观测量），故负证判值 = **burn=0 行 ＋ 燃料槽 heat=0 拒收**。

### W5 · 触及面 —— **PASS 9/10（匕首 1 项未达）**

判法：生存玩家站定距离（方块中心到身体采样点），发 `block_place`（同一 `RightClickBlock` 门）
触发判定；deny 行末段即 reach 判值。服务端容差 `reachServerTolerance=0.25`（C-10）。

```
[10:30:24] reach denied: etim.reach.deny_block 3.90 > 3.50
[10:30:30] reach denied: etim.reach.deny_block 3.15 > 2.75
[10:30:34] reach denied: etim.reach.deny_block 3.60 > 2.75
[10:30:38] reach denied: etim.reach.deny_block 3.34 > 2.75
[10:30:45] reach denied: etim.reach.deny_block 3.90 > 3.50
```

| 探针 | 距（块心） | 期望 reach | 实测 | 判 |
|---|---|---|---|---|
| 铜镐 × 石（3.60 / 3.90） | 3.60 允许 / 3.90 拒 | 3.50 | 3.60 无 deny；3.90 `> 3.50` | ✓ |
| 空手 × 石（2.90 / 3.15） | 2.90 允许 / 3.15 拒 | 2.75 | 2.90 无 deny；3.15 `> 2.75` | ✓ |
| 铜锄 × 土（3.60 / 3.90） | 3.60 允许 / 3.90 拒 | 3.50 | 3.60 无 deny；3.90 `> 3.50` | ✓ |
| 铜镐/铜锄 实挖（3.60，14 s） | 允许 → 块破 | — | `broken=true` ×2，deny 0 | ✓ |
| **铜匕首 × 石（3.60）** | **3.25** | 3.25 | **`> 2.75`** | ✗（B-2） |
| **铜匕首 × 蛛网（3.34）** | **3.25** | 3.25 | **`> 2.75`** | ✗（B-2） |

**B-2 根因（一手）**：1.12 `ItemSword` **不在 `ItemTool` 树**
（`ETIMReach.getReachBonus` 注释 :78 已记此差异）→ `ETIMMining.isEffectiveAgainstBlock`
对剑/匕首恒 false（:410 `!(held instanceof ItemTool)` 早退）→ `getBlockReach` 的加成分支
（:111-113）永不执行 → `etimReachBonus()=0.5` 落不了地。石面 2.75 与 R196 一致（R196 剑对石亦无效），
但 **R196 剑对 web/植物有效**（应得 3.25）本移植无法表达 → 差 1 项。

### W6 · 盔甲穿戴（甲点面）—— **PASS；减伤抽样不可判（C-5/C-6）**

判据面 = `[EquipLog] armor` 列合计（与 W1 同源、逐位）＋ 减伤抽样。

| 金属 | 单件（头/胸/腿/靴） | 全套合计 | 链变体单件 | 链全套 | 判 |
|---|---|---|---|---|---|
| copper | 1.4583333333333333 / 2.3333333333333335 / 2.0416666666666665 / 1.1666666666666667 | **7.0** | 1.0416666666666667 / 1.6666666666666667 / 1.4583333333333333 / 0.8333333333333334 | **5.0** | ✓ |
| silver | 同 copper | **7.0** | 同 copper 链 | **5.0** | ✓ |
| ancient_metal | 1.6666666666666667 / 2.6666666666666665 / 2.3333333333333335 / 1.3333333333333333 | **8.0** | 1.25 / 2.0 / 1.75 / 1.0 | **6.0** | ✓ |
| mithril | 1.875 / 3.0 / 2.625 / 1.5 | **9.0** | 1.4583333333333333 / 2.3333333333333335 / 2.0416666666666665 / 1.1666666666666667 | **7.0** | ✓ |
| adamantium | 2.0833333333333335 / 3.3333333333333335 / 2.9166666666666665 / 1.6666666666666667 | **10.0** | 1.6666666666666667 / 2.6666666666666665 / 2.3333333333333335 / 1.3333333333333333 | **8.0** | ✓ |

**减伤抽样（未取到，登记）**：
1. **坠落不是有效采样源** —— 1.12 `DamageSource.java:27` `FALL = (new DamageSource("fall")).setDamageBypassesArmor()`；
   实测裸身 / copper7 / adamantium10 / **vanilla 钻石 20** 四组坠落（10 格）伤害**同为 7**（health 20→13），
   与护甲无关，属采样源选错，不是护甲失效。
2. **mob 采样被 despawn 系统清场**：召唤的持剑僵尸在数秒内被 `[AILog] mob despawn …` 清掉（两轮 0 命中）。
3. 仙人掌接触面受击退/站位影响不可重复（两轮 1 / 6 / 7 不等）。
   → **建议下一窗**用封闭 1×1 竞技场＋`/etest` 驱动或客户端甲条核；本窗不作 FAIL。

### W7 · 配方五笔 —— **PASS 5/5**

```
[10:22:41] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]   ← 上一笔产物 = 1 件
[10:22:41] [Rcon: Given [Mithril Ingot] * 2 to ETIM_Harn04]               ← mithril sword 料
[10:22:45] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]   ← sword = 1 件 ✓
[10:22:45] [Rcon: Given [Copper Ingot] * 5 to ETIM_Harn04]                ← copper helmet 料
[10:22:48] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]   ← helmet = 1 件 ✓
[10:22:48] [Rcon: Given [Adamantium Chain] * 5 to ETIM_Harn04]            ← 链头盔料
[10:22:51] [Rcon: Cleared the inventory of ETIM_Harn04, removing 1 items]   ← 链头盔 = 1 件 ✓
[10:22:52] [Rcon: Given [Copper Ingot] * 4 to ETIM_Harn04]                ← copper boots 料
```

| 配方 | 形状 | 产物计数（`/clear`） | 判 |
|---|---|---|---|
| copper pickaxe（3 锭 + 2 棍） | `???`/` / `/` / ` | 1 | ✓ |
| mithril sword（2 锭 + 1 棍） | `?`/`?`/`/` | 1 | ✓ |
| copper helmet（5 锭） | 甲标准形 | 1 | ✓ |
| adamantium 链 helmet（5 链） | 甲标准形（链变体） | 1 | ✓ |
| copper boots（4 锭） | 甲标准形 | 1 | ✓ |

配方校验面：两 boot `produces unregistered item` = 0、`Exception reading … level.dat` = 0（§三）。

### W8 · 贴图占位 ＋ lang —— **登记（不判 FAIL）**

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| `item.etim.<name>.name` × 95 | en_us ＋ zh_cn 各 95 | **缺 0** | ✓ |
| `models/item/<name>.json` × 95 | 全在 | **缺 0** | ✓ |
| `textures/items/<name>.png` × 95 | 全在 | **缺 0** | ✓ |
| 贴图内容 | B1 ingot 占位复制 | 按 C-7 口径只登记，不判 | — |

---

## 三、负证面（grep 计数，两 boot 分列）

| 探针 | boot1（10:03–10:23） | boot2（10:23–10:33） | 判 |
|---|---|---|---|
| `NullPointerException` | 0 | 0 | ✓ |
| `cannot be restored` | 0 | 0 | ✓ |
| `Failed to load data for block entity` | 0 | 0 | ✓ |
| `produces unregistered item` | 0 | 0 | ✓ |
| `Exception reading` | 0 | 0 | ✓ |
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | 0 / 0 | ✓ |
| `FATAL` / `Crash report` | 0 / 0 | 0 / 0 | ✓ |
| `[EquipLog] gear item=` / `material item=` | 90 / 5 | 90 / 5 | ✓ |
| `gear recipes registered` | 1（90 rows） | 1（90 rows） | ✓ |

**甲/链/工具熔炼产物负证**：`smelt admit` 0 行（W4 输入为 cobblestone，甲/链仅作燃料槽拒收面）。

---

## 四、冲突分级

### A 级（真值冲突）
**无。**

### B 级（需主会话裁的口径）

- **B-1 · W2 铁镐行与批文冲突（任务书勘误）**：任务书 W2 第 4 条写「铁镐（vanilla）挖
  `etim:ore_mithril` → 现行 fold 语义 grade=3 < **4** 不掉」，但**批文 §二.2 与矿石行判值
  = `ore_mithril` min **3**（§一 表 / `ETIMMining` :118 `put("ore_mithril", 3.5F, 3)`）**。
  实测：铁镐 fold=3 → **可挖且掉落**（无 deny 行，块破，speed str=8.0），与批文一致、与任务书该行矛盾。
  **判**：按批文判 ✓；建议修正任务书该行为「铁镐/钻石镐 fold=3 ≥ 3 可挖秘银矿」，
  「grade=3 < 4 不掉」应指 `ore_adamantium`（min 4，实测铜镐 deny required=4）。
- **B-2 · 匕首 reach 3.25 未落（W5 唯一 ✗）**：`etimReachBonus()=0.5` 存在，但 1.12 `ItemSword`
  不在 `ItemTool` 树 → `isEffectiveAgainstBlock` 对剑恒 false → 加成永不触发（石/蛛网实测均 `> 2.75`）。
  R196 剑对 web/植物有效（应 3.25），本移植无法表达。
  **请裁**：(a) 给剑/匕首补 R196 materials-effective 谓词（落入 reach 门）；或 (b) 把 W5 匕首项
  标为「本移植不可达」并从判据表移除（石面 2.75 与 R196 一致，保留）。

### C 级（登记，不阻塞）

- **C-1 `equipDebugLog` / `miningDebugLog` 未进旧 cfg**：B2 新增两键在既有
  `run/obfuscated-server/config/etim.cfg` 中无行（Forge 不自动补写），本窗手工补入 metal 节；
  下一窗若 cfg 未重生，先核两行存在。
- **C-2 `[MiningLog] mine deny` 按 (item, block, grade/required) 去重**：同会话同格第二次点击
  不再出行；判据须「行存在 ＋ 行为面（块未破/无掉落）」合并取。
- **C-3 `mine speed` 行是「基础 str」**：值 = `4.0×材质效×型修正`，落在食物/水下/离地/等级等
  除数**之前**（`ETIMMining` :204-208）；W3 判值即该列，后续除数不进日志。
- **C-4 raw `block_dig` 语义**：`START(0)` + **`STOP(2)`** 才结算破坏；`ABORT(1)` 丢弃已累积进度
  （工装第一版误用 1，3.5 距离内 14 s 也挖不动；改回 2 后 4 s 破块）。
- **C-5 1.12 坠落伤害不吃护甲**：`DamageSource.FALL.setDamageBypassesArmor()`（源码 :27）；
  裸身/铜/艾德曼/钻石四组 10 格坠落伤害同为 7。
- **C-6 mob / 仙人掌减伤采样不可用**：召唤僵尸被 `[AILog] mob despawn` 数秒清场；
  仙人掌接触受击退影响不可重复 → W6 减伤面留待下窗（建议封闭竞技场 + `/etest` 驱动）。
- **C-7 贴图占位**：95 件全为 B1 ingot 占位复制（C-7 口径，只登记）。
- **C-8 1.12 无 `/scoreboard players get`**：读血用 `/scoreboard players list <p>`（`hp: N`）。
- **C-9 甲行 dump 列**：`efficiency`/`grade` 为材质值（非 0），甲判只看 `maxDamage`/`armor`/`burn`。
- **C-10 reach 容差**：`reachServerTolerance=0.25` → deny 在 **reach+0.25** 触发；
  行内 `> 3.50` 是**判值 reach**，不是触发距离（3.75）。
- **C-11 长会话食物池**：satiation/nutrition 耗尽会触发 `hungerDigStrDivisor=5.0`（stone 2.4 / str 7
  → 约 45 s/块）；挖块类复跑前用 `/etest food 20 20 <p>` 补池。

### D 级
无。

---

## 五、工装面（本轮新增，均不入产品 jar）

| 文件 | 作用 |
|---|---|
| `testharness/player/b2-equip.js` | W1 全表校验器：解析 `[EquipLog]` → 按 §一 公式重算 90×6 列逐位比对 ＋ 甲全套合计 ＋ 五锚点 ＋ W8 资源检查 → `build-logs/b2-equip-check.json` |
| `testharness/player/b1-run.js` | 新增相位 `w0setup / w2mining / w3speed / w4burn / w5reach / w6armor / w6res / w6diag* / w7craft / wfood`（B2 台架、采集矩阵、效率带、燃面、触及、配方） |
| `build-logs/b2-boot0.log` / `b2-boot0-stop.log` | 首启与停机快照（W1 首轮 dump 源，501 KB） |
| `build-logs/b2-boot1.log` | boot1 全窗判据源（1,086,353 B；W3/W5/W6/W7 一手行） |
| `build-logs/b2-server-latest.log` | boot2 判据源 ＋ 收口快照（996,915 B；W2/W4 复跑与收口行） |
| `build-logs/b2-*.out` / `b1-w*.json` | 各相位驱动原稿与结果 |

**判据源段界**：boot1 = `10:03:08–10:23:04`；boot2 = `10:23:12–10:33:17`。

---

## 六、终态表（收口）

| 面 | 终态 |
|---|---|
| 服务端 | `[10:33:17] Stopping server` → `Saving worlds` → 进程退出；快照 `build-logs/b2-server-latest.log`（996,915 B） |
| 端口 | 25565 / 25575 无 LISTEN |
| `server.properties` | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` / `view-distance=10` / `generator-settings=`（未改，无需还原） |
| 世界 | `testw2h` 内新增 B2 台架（可删）；未删档 |
| config | 服务端 cfg 已补 `B:miningDebugLog=true` / `B:equipDebugLog=true`（保留供后续窗） |
| 产品面 | jar 503,844 B / SHA256 `74F52965…071C886C` / `1fce2e8` / `src/main` 0 改动（窗口内 0 rebuild） |
| 客户端 | 本窗**无客户端面**（W1~W8 全部服务端判行 + 假玩家发包），未起 obf 客户端 |

---

## 七、结论

- **判决**：W1 PASS（90/90 逐位）、W2 PASS 7/7、W3 PASS 6/6、W4 PASS 7/7、
  **W5 PASS 9/10（匕首 3.25 未达）**、W6 PASS（甲点面）、W7 PASS 5/5、W8 登记（不判 FAIL）。
- **落码面成立**：G-FB-12 绕 fold（copper grade 2 采不了 min 3 秘银矿、mithril 4 / adamantium 5 不降格）、
  BLOCK_MIN_LEVEL 2/2/3/4、burn=100 十型、reach 3.50（工具/锄）/2.75（空手）、
  甲点 ÷24 精确值（全套 7/9/10、链 5/7/8）、90 条配方。
- **遗留**：B-1（任务书 W2 铁镐行勘误）、B-2（匕首 reach 3.25 未落，待裁）、C-1~C-11（工装/观测面）。
- **下一轮建议**：B-2 裁定后即可闭 B2；W6 减伤面另立小窗（封闭竞技场 + `/etest` 驱动），
  或直接以甲点列合计作常设判据。
