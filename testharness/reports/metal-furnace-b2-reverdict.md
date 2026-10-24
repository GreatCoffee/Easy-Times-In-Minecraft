# 阶段四 B2 复判窗（修复批：剑七材料面 + 剑效 ×0.5 + tool decay 判行）· 判决回执

> **执行方**：会话七（验证窗执行）
> **判据正本**：`playground/audit/metal-furnace-B2-修复批文.md`（含 2026-10-24 修订块）+ 本窗任务书；
> 修订块与批文正文冲突处以修订块为准。
> **现役钉值**：jar **504,479 B** @ **2026-10-24 11:04:22**｜
> SHA256 **E2C3204454396D440512304023176325EFB3C38932DD8F48D67FA73BD1EF981A**｜
> commit **1fce2e8** + `src/main` 未提交 2 文件（`ETIMMining.java` / `ETIMItemSword.java`，与任务书钉值一致）。
> **判据源**：服务端 `latest.log`（`[MiningLog] tool decay` / `mine deny` / `mine speed`、`[EquipLog]` boot dump、
> `reach denied`）＋ 假玩家 `/clear`、`/testforblock`、背包槽耐久计量 ＋ RCON 回执。
> **口径**：通过用 ✓、不通过用叉号；本报告 UTF-8 无 BOM、0 U+FFFD。窗口内 **0 次 rebuild**。
> **世界**：复用 `testw2h`（B2 台架照用，未删档；本窗只在 z=40 增补 4 个 web/stone 判块）。

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 504,479 B | 504,479 B | ✓ |
| jar 时间 | 2026-10-24 11:04:22 | 2026-10-24 11:04:22 | ✓ |
| SHA256 | E2C32044…EF981A | `E2C3204454396D440512304023176325EFB3C38932DD8F48D67FA73BD1EF981A` | ✓ 逐位 |
| commit | `1fce2e8` | `1fce2e8` | ✓ |
| `src/main` 未提交 | 2 文件（ETIMMining / ETIMItemSword） | `git status --porcelain -- src/main` = `M ETIMItemSword.java` / `M ETIMMining.java` | ✓ 与钉值同 |
| diff 规模 | 任务书未钉 | `ETIMItemSword +1/−1`、`ETIMMining +71/−18`（2 files, 71 insertions, 18 deletions） | ✓ 记 |
| 载入面 | classpath append，mods 零 etim | `classpath append: …build\libs\etim-1.0.0.jar (mtime=10/24/2026 11:04:22)` | ✓ |
| 窗口内重建 | 禁止 | 收口复核字节数 / SHA256 / mtime 全同 → 0 次 | ✓ |
| 世界 | `testw2h` 照用 | `level-name=testw2h` / `DEFAULT` / `difficulty=1` / `view-distance=10`，未换档未删档 | ✓ |
| config（判行门） | `miningDebugLog` / `equipDebugLog` / `furnaceDebugLog` / `miningReform` | 四项均 `true`（上窗已补，本窗在档） | ✓ |
| boot | Done 1.3 s 级、mixin fail 0 | `[11:12:08] Done (1.629s)!`；`mixin fail / MixinApplyError = 0` | ✓ |
| boot dump | 90 行 + 锚点 5 行 | `[EquipLog] gear = 90`、`material = 5` | ✓ |
| 注册面 | 90 行配方 | `[11:12:05] gear recipes registered: 90 shaped rows (50 tools + 40 armor)` | ✓ |

**判据源段界**：boot `11:11:53`（启动 stamp `20261024_111153`）→ `11:12:08 Done`；窗内活动 `11:13:30–11:21:14`；
收口 `11:21:46 Stopping`。快照见 §五。

---

## 一、判决类清单

| # | 判点 | 判 | 一手判行锚 | 判值 |
|---|---|---|---|---|
| **W1** | `[EquipLog]` 复判（裁 2 勘正口径） | **PASS** | `[11:12:05]` boot dump；`build-logs/b2r-equip-diff.json` | 变化恰 **10 行/dump**（sword/dagger ×5 金属效率 0.875/0.875/1.0/1.25/1.5）；其余 **85 行逐位不变**（80 gear + 5 material，`onlyOld=[] / onlyNew=[]`）；全表重算 **90/90 badRows=0**；锚点 **5/5** |
| **W5R** | 触及面（剑/匕首七材料面落地） | **PASS 6/6** | `reach denied: etim.reach.deny_block` 行；`ETIMMining.isEffectiveAgainstBlock` 剑分支 :420-427 | 匕首×web 3.34 **allow**／3.63 deny **`> 3.25`**；匕首×石 3.63 deny **`> 2.75`** 不变；剑×web 3.93 deny **`> 3.50`**／3.39 **allow**；vanilla 铁剑×web 3.34 deny **`> 2.75`**（零改动负证） |
| **W9** | 衰减判行（`[MiningLog] tool decay`） | **PASS 4/4** | `[11:14:09]` / `[11:14:37]` / `[11:18:52]` 三笔判行 | 剑破 web **loss=20**（str=3.5 佐证）+ 耐久 **0→20**；剑×石 **未破 + 零判行 + 耐久 0→0**；攻击 **loss=50** + 耐久 **0→50**；vanilla 铁剑×web **loss=0** 照发 + 耐久 **0→0** |

**总记**：**W1 / W5R / W9 全过**｜A 级真值冲突 **0 笔**｜B 级 **0 笔**｜C 级 **8 笔**（登记，不阻塞）。
B-2（上窗匕首 reach 3.25 未达）经本窗 **W5R-1/2 双向判定闭合**；B-3（剑破块衰减缺钩）经 ❗-2 结案后由
**W9-1 loss=20** 实证 funnel 已通。

---

## 二、逐项核讫

### W1 · `[EquipLog]` 复判 —— **PASS（10 行变化 / 85 行逐位不变）**

判法两条腿：
1. **变化面**：`testharness/player/b2r-equip-diff.js` 把上窗 boot1 快照（jar 503,844 B，`build-logs/b2-boot1.log`）
   与本窗 dump（`build-logs/b2r-boot.log`）按 `item=` 键逐行比对 → 落 `build-logs/b2r-equip-diff.json`。
2. **全表面**：`testharness/player/b2-equip.js` 按批文 §一 公式重算 90×6 列（本窗已把 sword/dagger 的
   `effMod` 由 1.0 改 0.5）→ `badRows = 0`。

```
{ oldRows: 95, newRows: 95, changedCount: 10, unchangedCount: 85, onlyOld: [], onlyNew: [] }

CHANGED etim:sword_copper            efficiency=1.75 → 0.875
CHANGED etim:dagger_copper           efficiency=1.75 → 0.875
CHANGED etim:sword_silver            efficiency=1.75 → 0.875
CHANGED etim:dagger_silver           efficiency=1.75 → 0.875
CHANGED etim:sword_ancient_metal     efficiency=2.0  → 1.0
CHANGED etim:dagger_ancient_metal    efficiency=2.0  → 1.0
CHANGED etim:sword_mithril           efficiency=2.5  → 1.25
CHANGED etim:dagger_mithril          efficiency=2.5  → 1.25
CHANGED etim:sword_adamantium        efficiency=3.0  → 1.5
CHANGED etim:dagger_adamantium       efficiency=3.0  → 1.5
（以上 10 行 maxDamage / attackDamage / grade / burn / armor 五列逐位不变）
```

| 判据项 | 期望（裁 2） | 实测 | 判 |
|---|---|---|---|
| 变化行数 | 10（sword/dagger ×5 金属） | **10** | ✓ |
| 变化列 | 仅 efficiency | 10 行仅 efficiency 列变；其余五列逐位同 | ✓ |
| 变化值 | 0.875 / 0.875 / 1.0 / 1.25 / 1.5 | 逐行相符 | ✓ |
| 不变行 | 80 gear + 5 material | **85 行 byte-identical**（含 5 material `maxStackSize=8 burn=-1`） | ✓ |
| 行集漂移 | 无新增/缺失 | `onlyOld = []`、`onlyNew = []` | ✓ |
| 全表重算 | 90 行 0 off-by | `gearRows=90 / materialRows=5 / badRows=0` | ✓ |
| 锚点 5 行 | 逐位 | 5/5（见下） | ✓ |
| 甲全套合计 | 7/9/10（链 5/7/8） | 全中（另 silver 7/5、ancient 8/6） | ✓ |

锚点行原文（本窗 dump）：

```
[EquipLog] gear item=etim:pickaxe_copper maxDamage=4800 attackDamage=5.0 efficiency=1.75 grade=2 burn=100 armor=0.0
[EquipLog] gear item=etim:helmet_copper maxDamage=40 attackDamage=0.0 efficiency=1.75 grade=2 burn=-1 armor=1.4583333333333333
[EquipLog] gear item=etim:chain_helmet_copper maxDamage=20 attackDamage=0.0 efficiency=1.75 grade=2 burn=-1 armor=1.0416666666666667
[EquipLog] gear item=etim:war_hammer_mithril maxDamage=128000 attackDamage=7.0 efficiency=1.875 grade=4 burn=100 armor=0.0
[EquipLog] gear item=etim:pickaxe_adamantium maxDamage=307200 attackDamage=8.0 efficiency=3.0 grade=5 burn=100 armor=0.0
```

### W5R · 触及面 —— **PASS 6/6**

判法：生存假玩家按 off 站定（`block_place` 单次右键，命中 `PlayerInteractEvent.RightClickBlock` 同一 reach 门），
读 `reach denied` 行；allow 面判「该探针窗口内无 deny 行」。距离 = 身体采样点到块心（`ETIMReach.getBodyCenterPoints`），
服务端容差 0.25（`reachServerTolerance`），故 deny 触发线 = 判值 reach + 0.25。

```
[11:13:44] reach denied: etim.reach.deny_block 3.63 > 3.25
[11:13:47] reach denied: etim.reach.deny_block 3.63 > 2.75
[11:13:51] reach denied: etim.reach.deny_block 3.93 > 3.50
[11:13:58] reach denied: etim.reach.deny_block 3.34 > 2.75
```

| # | 持物 | 目标 | off（＝距） | 期望 | 实测 | 判 |
|---|---|---|---|---|---|---|
| W5R-1 | copper dagger | web | 3.300（同几何位 3.34） | **allow**（判值 3.25，触发线 3.50） | **无 deny 行** | ✓ |
| W5R-2 | copper dagger | web | 3.600（距 3.63） | deny `> 3.25`（触发线 3.50） | `3.63 > 3.25` | ✓ |
| W5R-3 | copper dagger | stone | 3.600（距 3.63） | deny `> 2.75` 不变（石非七材料） | `3.63 > 2.75` | ✓ |
| W5R-4 | copper sword | web | 3.900（距 3.93） | deny `> 3.50`（触发线 3.75） | `3.93 > 3.50` | ✓ |
| W5R-5 | copper sword | web | 3.350（≈3.39） | **allow**（判值 3.50，触发线 3.75） | **无 deny 行** | ✓ |
| W5R-6 | vanilla 铁剑 | web | 3.300（距 3.34） | deny `> 2.75`（vanilla 剑零改动） | `3.34 > 2.75` | ✓ |

**读数说明**：allow 探针的距离不落行（只有 deny 才落），故 W5R-1/5 的「距」取同一 off 的 deny 兄弟探针实测值
（3.300→3.34）与线性外推（3.350→≈3.39）；判据是 deny 行的 `>` 判值 + allow 面的「无行」，两点均已逐位取到。

**副面（informational，裁 1）**：ETIM 剑/匕对非七材料方块落 grade-deny 行，本窗实测两笔（`required` 取
`getMinHarvestLevel` = BLOCK_MIN_LEVEL 现值，石 = 2）：

```
[11:13:47] [MiningLog] mine deny grade=2 required=2 item=etim:dagger_copper block=stone [server]
[11:14:13] [MiningLog] mine deny grade=2 required=2 item=etim:sword_copper  block=stone [server]
```

**回归（informational）**：上窗 W5 矩阵九探针 + 两笔实挖控制全数复跑，**10/10 OK**（见 §四 负证）。

### W9 · 衰减判行 —— **PASS 4/4**

判法：生存 + `/etest food 20 20` 补池（C-11）+ onGround 断言 + raw `block_dig`（START→STOP）。
**耐久计量**＝背包热键槽 0 的 1.12 槽包 `itemDamage`（mineflayer `metadata` / `durabilityUsed`）。

```
[11:14:09] [MiningLog] tool decay face=breaking item=etim:sword_copper block=web loss=20 [server]
[11:14:09] [MiningLog] mine speed item=etim:sword_copper block=web str=3.5 [server]
[11:14:37] [MiningLog] tool decay face=breaking item=minecraft:iron_sword block=web loss=0 [server]
[11:18:52] [MiningLog] tool decay face=attacking item=etim:sword_copper loss=50 [server]
```

| # | 探针 | 期望 | 实测 | 判 |
|---|---|---|---|---|
| W9-1 | copper sword 破 web | `face=breaking … block=web loss=20` + `mine speed … block=web str=3.5` + 耐久 −20 + 破时 ~0.7 s | loss=**20**（N = max(max((int)(0.1×100×2.0), (int)(200/20)), 1) = 20，❗-1 驳回面成立）；`str=3.5`（4.0×0.875）；耐久 **0→20**；破块实耗 0.47 s（见 C-B2R-2） | ✓ |
| W9-2 | copper sword 破石尝试 | 块**未破** + 无 mine speed 行 + **无 decay 行** + 耐久零变化 | 块仍在（`/testforblock` 命中）；`mine speed` 0 行；`tool decay` 0 行；耐久 **0→0** | ✓ |
| W9-3 | copper sword 攻 1 笔 | `face=attacking … loss=50` + 耐久 −50 | loss=**50**（0.5×100）；耐久 **0→50** | ✓ |
| W9-4 | vanilla 铁剑破 web | `loss=0` 行**照发**（mixin 施于全体 `ItemSword`）+ 耐久零变化 + 无触及加成 | loss=**0**；破块 7.10 s；耐久 **0→0**；触及仍 2.75（W5R-6） | ✓ |

**N 实测锤定**：web 行 `put("web", 0.1F, 0)` 在档（`ETIMMining:86`），故 W9-1 的 loss **必须** 为 20 ——
实测 **20**，即 ❗-1 驳回成立、回执「无 web 行 → 800」不成立。**无翻案。**

**W9-3 目标面（工装）**：攻击面必须落在「`attackEntityFrom` 返回 true 的 EntityLivingBase」上 ——
1.12 `EntityArmorStand.attackEntityFrom` 对生存玩家拳击 **恒返回 false**（`EntityArmorStand.java:545-588`），
`ItemSword.hitEntity` 因此不执行；改用 sheep（8 HP > 7 伤，`PersistenceRequired:1b` 把 despawn 计数钉 0），
并把视线压低 pitch 25（sheep 盒顶 101.3 低于 101.62 的视高）。详见 C-B2R-4。

---

## 三、冲突分级

### A 级（真值冲突）
**无。**

### B 级（需主会话裁的口径）
**无。** 本窗三个判点均与修订块判值逐位相符：
B-2（匕首 3.25）由 W5R-1/2 闭合；B-3（剑破块衰减）由 W9-1（loss=20）+ W9-2（零行零损）闭合；
修-2（×0.5）由 W1 的 10 行变化 + 全表重算闭合。

### C 级（登记，不阻塞）

- **C-B2R-1 · grade-deny 行的 `required` 列取现值，不恒为 0**：任务书 §五 预期「required=0」，
  实测 ETIM 剑/匕×石落 `required=2` —— 因为 `logGradeDeny` 的 required 就是 `getMinHarvestLevel(state)`，
  而石在 `BLOCK_MIN_LEVEL` 有 `put("stone", 2.4F, 2)`。**「required=0」只适用于无 BLOCK_MIN_LEVEL 行
  且 vanilla harvest level 为 0 的方块**（如 leaves/web 这类七材料方块 —— 但它们对剑恒 effective，不落 deny）。
  判值不受影响（informational 面）。
- **C-B2R-2 · W9-1 破块实测 0.47 s ≠ 理论 0.7 s**：`getProgressPerTick` 给 web 0.0684/tick（str 3.5），
  纯 1.0 阈值应为 ≈15 tick（0.73 s）；实测 10 tick 级（0.47 s）是因为 1.12 服务端
  `PlayerInteractionManager.blockRemoving` 以 **f ≥ 0.7**（:257）结算收获，即客户端预测阈值的同一口径。
  属机制既定、非缺陷；任务书的「~0.7 s」是纯 1.0 口径估算。
- **C-B2R-3 · `tool decay` 通道是通用通道**：本窗 W5 回归的两笔实挖控制同时落
  `pickaxe_copper × stone loss=240`（2.4×100×1.0）与 `hoe_copper × dirt loss=100`（0.5×100×2.0），
  与 sword 面同源、值可手算复核 —— 说明 decay 判行不是剑专用旁路。
- **C-B2R-4 · W9-3 目标面三坑（工装）**：(a) 盔甲架对生存拳击 `attackEntityFrom=false` → `hitEntity` 不执行；
  (b) `Marker:1b` 盔甲架判定盒为 0 → 近战射线必 miss；(c) 眼高 101.62 高于 sheep/cow 盒顶 → 平视 ray 必 miss。
  建议后续攻击面统一用「`PersistenceRequired:1b` + `NoAI:1b` 的 8 HP 以上 mob + pitch>0」。
- **C-B2R-5 · `deny_attack` 打印 `Double.MAX_VALUE`**：射线未命中时 `getEntityRayDistance` 回
  `Double.MAX_VALUE`，deny 行出现 `1.797…e308 > 2.25` 的超长数字；纯日志观感问题，不影响判定。
- **C-B2R-6 · mineflayer 对 mod 物品 name 显示 `unknown`**：耐久取自槽包 `metadata` / `durabilityUsed`
  （1.12 的 itemDamage），数值可信；不要用 `name` 做判据。
- **C-B2R-7 · `tool decay` 去重键含 loss**（裁 4）：同 (face,item,block) 且同 loss 的第二次不重发。
  故判据一律「全日志匹配判行 + 实时耐久差」双取，不用「窗口切片」。
- **C-B2R-8 · `mine speed` 只在 str ≥ 1.0 时落行**：剑×石（str=0 早退回手路）故无 speed 行 ——
  W9-2 的「无 speed 行」是机制正面证据，不是通道失效。

> 批次自带的 **C-B2R-1（sword `getDestroySpeed` 客户端预测面）/ C-B2R-2（vanilla 镐×web null-branch carrier）**
> 仍留专批，本窗不动；**C-B2R-3（web 行缺失）** 已随 ❗-1 驳回注销，本窗 W9-1 实测 20 再证。

---

## 四、负证清单（全窗计数）

| 探针 | 计数 | 判 |
|---|---|---|
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| `NullPointerException` | 0 | ✓ |
| `cannot be restored` | 0 | ✓ |
| `Failed to load data for block entity` | 0 | ✓ |
| `produces unregistered item` | 0 | ✓ |
| `Exception reading` | 0 | ✓ |
| `FATAL` / `Crash report` | 0 / 0 | ✓ |
| vanilla 铁剑触及加成行（`deny_block … > 3.50` 由铁剑产生） | 0（W5R-6 实测 `> 2.75`） | ✓ |
| W1 不变面漂移 | 0（85 行 byte-identical） | ✓ |
| W5R-3 石面漂移 | 0（`3.63 > 2.75` 与上窗 `3.60 > 2.75` 同判值） | ✓ |
| 上窗 W5 矩阵回归漂移 | 0（10/10 OK：镐/锄 allow 3.566、deny `> 3.50`；空手 allow 2.857、deny `> 2.75`；两笔实挖 `broken=true`） | ✓ |
| `[EquipLog]` 行数 | 90 gear + 5 material | ✓ |

---

## 五、收口表

| 项 | 终态 |
|---|---|
| 服务端 | `[11:21:46] Stopping server` → `Saving worlds` → 进程退出（RCON `stop`，未用 taskkill） |
| 判据源快照 | `build-logs/b2r-server-latest.log`（**497,068 B**）＋ 首启快照 `build-logs/b2r-boot.log`（39,723 B） |
| 端口 | 25565 / 25575 **无 LISTEN** |
| `server.properties` | `level-name=testw2h` / `level-type=DEFAULT` / `difficulty=1` / `view-distance=10` / `generator-settings=`（未改，无需还原） |
| 世界 | `testw2h` 内 B2 台架照用（z=40 增补 4 个判块，可删）；未删档 |
| config | `miningDebugLog` / `equipDebugLog` / `furnaceDebugLog` / `miningReform` 均 true（保留供后续窗） |
| 产品面 | jar 504,479 B @ 11:04:22 / SHA256 `E2C3…981A` / `1fce2e8` / `src/main` 仍 2 文件未提交（与钉值同） |
| 窗内 rebuild | **0 次**（收口复核字节数/哈希/时间全同） |
| 客户端 | 本窗**无客户端面**（W1/W5R/W9 全部服务端判行 + 假玩家发包），未起 obf 客户端 |
| 落盘工装 | `testharness/player/b1-run.js`（新增 `r2setup` / `w5r` / `w9` / `w9t`）、`b2r-equip-diff.js`、`b2-equip.js`（sword/dagger effMod 0.5） |

---

## 六、结论

- **判决**：**W1 PASS**（10 行变化 / 85 行不变 / 90 行 0 off-by）、**W5R PASS 6/6**、**W9 PASS 4/4**。
- **修复面成立**：
  - 修-1 剑七材料面 → 匕首×web 判值 **3.25**（3.34 allow / 3.63 deny 双向切）、剑×web **3.50**；
    石面 2.75 与 vanilla 铁剑 2.75 均不动（面效应按 R196 同源谓词三处消费）。
  - 修-2 效率 ×0.5 → dump 恰 10 行、`str=3.5`（4.0×0.875）落地。
  - 修-4 判行 → breaking loss=20 / attacking loss=50 / vanilla loss=0 三面齐；耐久差与判行 **逐位互证**。
- **遗留**：无 A/B 级；C 级 8 笔均已登记（判行口径 3 笔、工装面 3 笔、观测面 2 笔）。
- **B2 修复批可闭单**；批文自带 C-B2R-1/C-B2R-2 两项留专批。
