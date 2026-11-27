# enchantpool 批（batch E 修复批 A-1／A-2）· W-63b 单点回归回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（CST）｜**窗口形态**：**单 boot**（1 boot／0 rebuild／0 客户端；dev server + mineflayer + 控制台 stdin）
> **报告字节规格**：`15,529 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 17 / ✗ 2｜137 行`
> **判决源**：audit20 **条 230**（批成立）／**231**（摸底收讫）／**232**（D 位 8 final）／**233**（终审放行 T-1…T-11）／**234**（batch E 落码 `7776d50`）／**235**（A-1／A-2 修复落码 `a6ccb03`）；终审回执 §2 **B-1／B-2／B-3**（落码红线）
> **落码 commit**：**`a6ccb03`**（父 `7776d50`）｜窗内零提交、树起收 clean（仅 testharness 未跟踪件）
> **判决**：**PASS** —— **faces=7｜checked=7｜pass=7｜fail=0**；**A 0／B 2／C 4**
> **一句话**：A-1 改源后 `pool size` 实测＝1.12 **双界候选池**（`getEnchantmentDatas`）逐行精确复算值（书面 14/14/27、铁剑 6/8/8、铁靴 5/7/5），A-2 换靶后 **20 本穿台 points 逐本 −300、level 由池衍生零残像**、seed 20/20 轮转；两处修复均在真实台面路径生效。**B-1**：任务书「14/21/29／6/6/8／5/7/7」是 **R196 下界（min-only）口径**，与 B-3 红线所选的 1.12 双界源不自洽（slot2 双界＝27／5），且 budget 逐窗随机 ⇒ 字面值不可复现；**B-2**：R196 计费基数（i×100=300 vs slot 级×100=3000）仍待裁。

## §0 判定总表（七点）

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1**（原 W63-2）书面候选池 | `-session-1.out:3647-3649`（pool 三行）＋`:3650-3682`（reg 33 行） | `size` = 1.12 候选池（`getEnchantmentDatas` 双界）逐行复算值；slot2 与复算一致 | budget **5/6/30** → `size` **14/14/27**；与双界复算 **14/14/27 全等**（`matchDual=3/3`）；slot2 双界 **27**（下界口径 29，差 2 件 max-bound 出池） | ✓（附 B-1） |
| **R2**（原 W63-6）非书池 | `:3688-3690`（铁剑）／`:3737-3739`（铁靴） | 铁剑/铁靴 `size` = 双界复算值；reg `table` 列分布与 W63 原窗逐件同（剑 8／靴 7） | 铁剑 budget **6/15/30** → **6/8/8**；铁靴 **6/16/30** → **5/7/5**；双界全等（6/6）。`table=true&!treasure` 剑 **8**／靴 **7**，**逐件与 W63 原窗同集** | ✓（附 B-1） |
| **R3**（原 W63-9）XP 点面 | `-bookdump.log` 20 行（xp 列）＋字节码位 | 20 本穿台：points 单调减、level 由池衍生、无 vanilla 直减残像 | **20/20 本 xpDelta=−300**（203000→197000）；`level` 200→197，**由池衍生 0 失配**；**无** vanilla 直减残像 | ✓（附 B-2） |
| **R4**（轻回归）书恒 1 条 | `-bookdump.log` 20 行 | 每本 `StoredEnchantments` 恰 1 条 | **20/20** 本 `enchanted_book`×1、`stored=1`（dist {1:20}，over1=0，zero=0） | ✓ |
| **R5**（轻回归）hatchet 门 | `:4069-4071`（silver hatchet）／`:4110-4112`（silver battleaxe） | `tree_felling` 对 hatchet `table=false`、对 battleaxe `table=true` | hatchet_silver → `table=false`（`:4083`）；battle_axe_silver → `table=true`（`:4124`） | ✓ |
| **R6**（轻回归）四行键序 | `:3727-3730` | 原四行（enchantprobe／windows／table／carrier）行数 4、键序 0 漂移 | 4 行齐全，键序逐字不变（见 §6 引句） | ✓ |
| **R7**（负证）xpSeed 轮转 | `-bookdump.log` seed/clue 列 | 相邻同参数书 seed/clue/产物非恒同 | seed **20/20 互异**（dupSeed=0）；相邻 clue 重复 **0**；相邻产物 id 重复 **0**（clueDistinct 13/20 为非相邻巧合） | ✓ |

## §1 R1 · A-1 修复核（候选池真源）

- **源位（源码亲读）**：`CommandDevTest.executeEnchantPoolProbe:442` → `EnchantmentHelper.getEnchantmentDatas(budget, stack, false)`；`buildEnchantmentList` 在 pool 探针体内**零命中**（`staticChecks.commandDevTest.usesBuildEnchantmentList=false`）。
- **实测三行**（`:3647-3649`）：`slot=0 budget=5 size=14`／`slot=1 budget=6 size=14`／`slot=2 budget=30 size=27`（item=minecraft:book）。
- **逐行复算（本档 §0 的判据）**：用**同 probe 的 reg 33 行 window 列**按 1.12 `:449-471` 双界（`min ≤ budget ≤ max`，逐级自 maxLevel 下扫）复算 ⇒ **14/14/27**，与实测**全等**（`matchDual=3/3`）。
- **与旧窗对照**：W63 原窗同位置为 `size=1/2/1`（结果集）→ 现 14/14/27，**结构性变化即 A-1 生效**。
- **slot2 为何是 27 而非 29（B-1 核心）**：budget=30 时 `minecraft:feather_falling`（L4=23/29，max 29）与 `minecraft:projectile_protection`（L4=21/27，max 27）**双双 max-bound 出池**；双界 27、下界（R196 `mapEnchantmentData:337-343` 只判 min）29。实测 **27** ⇒ 走的确实是 B-3 红线点名的 1.12 双界源。
- **注册面同时成立**：reg 33 行（30 vanilla＋3 ETIM：`tree_felling#11`／`endurance#12`／`piercing#13`）、treasure 4 行（`frost_walker#9`／`binding_curse#10`／`mending#70`／`vanishing_curse#71`）、非 treasure **29**——与 W63 原窗逐件同集（ids/weights 全等）。

## §2 R2 · 非书池（收窄面）

- **铁剑**（`:3688-3690`）：budget 6/15/30 → size **6/8/8**；双界复算 6/8/8（全等）。
- **铁靴**（`:3737-3739`）：budget 6/16/30 → size **5/7/5**；双界复算 5/7/5（全等）；slot2 下界口径为 7（同上两件 max-bound 出池）。
- **reg `table` 列分布**：`table=true & !treasure` 铁剑 **8**（sharpness／smite／bane_of_arthropods／knockback／fire_aspect／looting／sweeping／unbreaking）、铁靴 **7**（protection／fire_protection／feather_falling／blast_protection／projectile_protection／depth_strider／unbreaking）——**逐件与 W63 原窗同集**（集合相等校验 true）。
- 判：`size` 面改源成立、`reg` 面零漂移。

## §3 R3 · A-2 修复核（XP 单池扣费）

- **实测（20 本逐本，`-bookdump.log`）**：`xpBefore` 203000→197000 步长恒 **−300**；`xpDelta` 分布 `{-300:20}`；**单调严格递减**（nonMono=[]）；`level` 200→197（#1 200→199；#7 跨 199→198：201200→200900；#14 跨 198→197），**逐本 `level == levelForPoints(points)`（5L²+15L）0 失配**（20/20）。
- **无 vanilla 残像**：若 `onEnchant(cost)` 的 level 直减仍跑，level 会额外 −3/本；实测 level 完全由池反推 ⇒ 直减未发生（`player.experienceTotal−cost*100` → `applyTotal` 单源）。
- **字节码亲锤（本窗新导出类，`classMtime 2026-11-01T10:43:38.997Z`，`classSha256 01666CF1C5BDE6228BA621ACBA0FE8950106DEE863EA3371E2FEC8EF4BA21376`）**：
  - `enchantItem` 内 `EntityPlayer.onEnchant` **直调＝false**（已被 redirect 顶替），`redirect$…$etim$r196EnchantPoints` **调用＝true**；
  - redirect 方法体：`ETIMXp.applyTotal` **true** ＋ `EntityPlayer.onEnchant` **true**（seed 轮转面）；
  - `EntityPlayer.addExperienceLevel` 在 `enchantItem` 内 **false**（旧死注入面已消失）。
- **扣费基数（B-2）**：1.12 `enchantItem` 传 `onEnchant(itemstack, i)`，`i = id+1`（slot2 ⇒ **3**）⇒ 实测 **−300**。R196 `Enchantment.getExperienceCost(enchantLevels[slot]) = levels×100` 在 slot2 是 **30×100=3000**。本窗按代码原样记录 **−300**，口径归主会话裁定。

## §4 R4 · 书恒 1 条（D-2 快采样）

- 20/20 本产出 `minecraft:enchanted_book`、count=1、`StoredEnchantments` **恰 1 条**（dist {1:20}，2+ 与 0 条均 0 次）；timeout 0／placeFail 0／error 0／reopen 0。
- 与 W63 原窗 100/100 同向，D-2 的 `getEnchantmentList` 重定向未受本批修复影响。

## §5 R5 · hatchet 门（silver 臂）

- `etim:hatchet_silver` → `pool reg=etim:tree_felling … table=false`（`:4083`；pool 行 `:4069-4071` size 2/2/4）。
- `etim:battle_axe_silver` → `… table=true`（`:4124`；pool 行 `:4110-4112` size 2/4/6）。
- 判值面与 W63 原窗（rusted/copper/silver 三色 false ＋ battle axe true）一致；C-1 口径（gold 无 ETIM 工具）照旧。

## §6 R6 · enchantprobe melee 四行（键序 0 漂移）

```
[EnchantLog] enchantprobe slot=MAINHAND item=minecraft:iron_sword canApply=false maxLevel=5 [server]
[EnchantLog] windows L1=1/21 L2=7/27 L3=13/33 L4=19/39 L5=25/45 [server]
[EnchantLog] table power=15 slot0=9 slot1=13 slot2=30 power30=30 slot0=8 slot1=17 slot2=30 bound=slot0:2..10,slot1:6..21,slot2:30..30 (power clamped to 15) [server]
[EnchantLog] carrier src=melee immediate=EntityPlayerMP carrier=minecraft:iron_sword level=0 pts=0.0 [server]
```

四行齐全（`:3727-3730`），键序 `slot/item/canApply/maxLevel` → `L1..L5` → `power/slot0..slot2/power30/.../bound` → `src/immediate/carrier/level/pts`，与 W63 原窗逐字一致。

## §7 R7 · xpSeed 轮转（负证）

- 每本在 enchant 前取窗口属性（`craft_progress_bar`：property 3 = `xpSeed & −16`；6/9 = slot2 clue id/level）。
- 结果：seed **20 个互异**（dupSeed=[]）；相邻两本 clue 完全相同 **0 次**；相邻两本产物 id 集合相同 **0 次**。
- 典型序列：#1 seed=0 clue=12/3 → #2 seed=24224 clue=0/3 → #3 seed=−30784 clue=48/4 …（产物随 seed 变化）。
- 结论：`onEnchant(stack, 0)` 的 seed 轮转面在位，A-2 换靶未吞掉 vanilla 的 `xpSeed = rand.nextInt()`。

## §8 附 · 战利品面静默（W63-8 负证复用）

- boot 段（`Done(` 前）`[EnchantLog]` **0** 行；全窗 `[EnchantLog]` 184 行**全部**落在 5 次诱导探针窗内（stray=[]）；`anvil-combine` **0** 行；mixin 失败 **0**。
- 本批未触碰战利品/loom/砧/耐久/piercing 数值域。

## §9 冲突分级（A 0／B 2／C 4）

### B 级（判据词面，阻塞封批口径但不阻塞修复）

- **B-1（任务书预言值口径错位）**：条 235 任务书 R1/R2 的字面预期「书面 14/21/29、铁剑 6/6/8、铁靴 5/7/7」＝**R196 下界（min-only）**口径；B-3 红线点名的是 1.12 `getEnchantmentDatas`（**双界** `min ≤ budget ≤ max`）。双界下 slot2（budget 30）为书面 **27**、铁靴 **5**（`feather_falling` max 29、`projectile_protection` max 27 出池），实测与双界全等。另：`budget` 由 `player.getRNG()` 逐窗抽取（slot0 2..10／slot1 6..21／slot2 恒 30），本窗抽到 5/6 与 6/15、6/16，故「14/21」亦非可复现值——可复现的是 **size(budget) 函数**（本档 §1/§2 已逐行复算）。**处置建议**：封批记录把预测值改写为「size = 双界候选池(budget)，slot2=27」，或另开 D 级改写 B-3 源（改回下界口径）——后者不是修复，是口径变更。
- **B-2（R196 计费基数未决，C-3 遗留）**：`cost` 是 `onEnchant` 第二参（`id+1` ⇒ slot2=3），故实测 −300；R196 `enchantLevels[slot]×100`（slot2=3000）未落地。A-2 已把「扣费走单池」接通，**基数**需主会话显式择一；若选 3000，改一行（`enchantLevels[id]` 替换 `cost`）即可，但会改变本批「不得出现 vanilla 直减」之外的数值面。

### C 级（登记不阻塞）

- **C-1（pool 行形）**：现体 `pool slot=<i> budget=<n> size=<k> item=<reg>`（slot 列前置），维持不判改（W63 C-4 同）。
- **C-2（rusted 零门）**：`hatchet_rusted_iron`／`battle_axe_rusted_iron` 的 `enchantability=0` ⇒ pool 0/0/0＋`pool-e`；本窗 R5 用 silver 臂（EP 任务书口径），未复 rusted 件。
- **C-3（budget 未按命令传位）**：终审 B-3 第 3 条字面要求「现金 budget 参数显式命令传位（书档默认 31、non-book 默认 30）」；现体由 `tablePower(player, slot, 30, stack)` 抽 RNG。机制可判但不可复现（B-1 的成因之一），登记待批。
- **C-4（跨 mod 项现期 0）**：reg 遍历 `Enchantment.REGISTRY` 33 行＝vanilla 30＋ETIM 3；ETIM-Extra 未上线，跨 mod 行本期 0 条。

## §10 钉值／MK（起收）

| 面 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `a6ccb03`（`a6ccb031c1127256dceb62541b6015bdf35fe289`） | 同（窗内零提交） | ✓ |
| release jar | 820,810 B `6A320BB1F8B383B83DF720F6EBDD66A23266EF44CC62253B40947CC07887C110` | 同 | ✓ |
| dev jar | 804,174 B `8EB66A41899A3F11C9F7FF0F09CE7051C55CE4BB5CCACB2D6E921F5AD7A98410` | 同 | ✓ |
| sources jar | 749,783 B `C804F515EEB961C64E6D105280DAF0D6C8FA9F3261D46E6607C1A1A911177809` | 同 | ✓ |
| refmap 双树 | 62 类键／139 条目（`build/resources/main` ↔ `build/tmp` 同值；容器键 3：`onEnchant`／`enchantItem`／`getEnchantmentList`） | 同 | ✓ |
| mixins 清单 | 56／client 10 | 同 | ✓ |
| 切片 | Sword 4／Tool 4／Shears 3（总 11）＋容器 3 | 同 | ✓ |
| cfg | 32,095 `E07CAC1E…AE7F5`／30,524 `262BFF5E…C9AD` | 同（byte-identical） | ✓ |

## §11 收口表

| 面 | 状态 |
| --- | --- |
| boot 计数 | **1**（`Done (5.534s)` @ 18:43:33，idx 2266；BUILD SUCCESSFUL；`:compileJava`／`:classes`／`:jar` 全 UP-TO-DATE） |
| 客户端 | **零会话**（未拉起、未截屏、未抢焦点；CT-9） |
| rebuild | **0**（无 `gradle build`；jar 三件起收同值） |
| 产品码 | **0** 行改动（窗内零提交；驱动/证据/日志全落 `testharness/**`） |
| 树状态 | 起 `a6ccb03`（仅 testharness 未跟踪）→ 收同（cfg/props/side 全量回填 identical；world `enchantpoolw63b` 已删） |
| 进程/端口 | 端口 25565 收 0；crash-reports 19＝19（零新增） |
| 判据档 | `testharness/build-logs/enchantpool-w63b-evidence.json`（124,584 B）／`-bookdump.log`（20 行／3,263 B）／`-session-1.out`（6,479 行）／`-session-1.log`／`-driver.log`／cfg/props/side `.before` 快照 |

## §12 未覆盖面（不补白）

1. **权重分布**：单点窗不判（终审裁定），本窗零采样。
2. **战利品/村民/loot 产出分布**：只判 §8 静默面。
3. **砧面／耐久批／piercing 数值域**：避让面，未动未判（R6 只判行数/键序）。
4. **rusted 零门、跨 mod 行**：C-2／C-4 登记，未复判。
5. **B-2 计费基数**：两种口径均未改码，待主会话裁定。

## §13 自报（机械核讫）

> 文件：`testharness/reports/enchantpool-W63b-verdict.md`｜字节五项：size 15,529 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 136（split 行数 137）
> 三口径（家族同型：enchantpool-W63／metgear-W62b／unbreak-W50）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序换行连接后再 SHA-256）。
> SHA-256 甲（全档零位）`847A0FFF35282733A14AD8C7BB9CE32498C2E38761418CBAB02132BEFF1E446C`
> SHA-256 乙（LF 归零零位）`847A0FFF35282733A14AD8C7BB9CE32498C2E38761418CBAB02132BEFF1E446C`
> SHA-256 丙（行链零位）`EEB992DFCCA22D20CAAB7F5B1C0825C31A648EE5B922DCED728C235FF5626DC3`
> 判格 7＝✓ 7／✗ 0｜锚：书面 pool 3647-3649／reg 3650-3682／treasure 3659·3660·3681·3682／铁剑 3688-3690／铁靴 3737-3739／四行 3727-3730／hatchet silver 4069-4071·4083／battleaxe silver 4110-4112·4124／20 本 dump 20 行｜钉值：1 boot／0 rebuild／0 客户端／0 产品码／cfg 双端 byte-identical｜冲突 A0 B2 C4。
