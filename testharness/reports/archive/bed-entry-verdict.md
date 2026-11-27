# bed-entry 判据窗判读报告（verdict：bed-entry-verdict）

**落码 commit**：v1 `3a2c7f6`（七文件，编译绿）｜ **v2 `cb6ce60`**（判读窗所 checkout）
**jar**：v1 279,860B @2026-10-17 17:33:01 ｜ **v2 279,836B @2026-10-17 18:06:22**（`BUILD_EXIT=0`）
**判读窗 boot stamp**：v1 `20261017_173400` ｜ **v2 `20261017_180631`**
**判决源**：`run\obfuscated\logs\latest.log` 的 `[SleepLog] bed-*` 行（消息面 `tile.bed.*` 仅 B 级辅证）
**对照报告**：`playground/audit/bed-entry-slice-comparison.md`（判词已采）
**版本链终行**：`dc2b81e`
> 终态 HEAD `dc2b81e`（18:07:04）为 `cb6ce60` 之上的**纯文档提交**，`src/main/java/io/github/etim/etim/playerstate/` 与 `mixins/` 的 diff **为空** ⇒ 判据面零影响。

> **v2 节见文末（§八起）** —— A1 裁决落地（零落码），D5/D6/D7/D8/D9 全解锁，**D1–D9 九类核心式全绿**。

---

## 一、判决类清单（v1 轮）

| # | 判决类 | 核心式 | v1 终态 |
|---|---|---|---|
| D1 | 露天床拒睡 | `bed-refuse reason=notSheltered` | **PASS** |
| D2 | 遮蔽床放行（对照半窗） | 无本行 + vanilla 入床链放行 | **PASS** |
| D3 | 床头阻挡 | `bed-refuse reason=obstructed` | **PASS** |
| D4 | 中毒拒睡 | `bed-refuse reason=poisoned` | **PASS** |
| D5 | 可寻路敌怪拒睡 | `bed-refuse reason=notSafe` | 未达成（工装受阻） |
| D6 | notifierM3 slime 面 | `bed-refuse reason=notSafe`（slime） | 未达成（承 D5） |
| D7 | occupied 真占双面 | `bed-refuse reason=occupied` | 未跑 |
| D8 | occupied 滞旗双面 | 无 refuse 行 + `bed-occupied-cleared` + B 入床 | 未跑 |
| D9 | sentry 逐拍门 | `bed-wake reason=notSafe sleeper=true` | 未跑 |

v1 收案判词：**4 绿 / 3 受阻 / 2 未跑**，A 级冲突 1 条。**全部在 v2 轮解锁，见 §八。**

---

## 二、v1 判决源行序列（v1 窗 boot `20261017_173400`，全窗 `bed-*` 共 8 行）

```
L1111: [SleepLog] bed-refuse reason=notSheltered x,y,z=-66,68,247 adjusted=23207 day=17
L1508: [SleepLog] bed-refuse reason=notSheltered x,y,z=-66,68,247 adjusted=23771 day=17
L2097: [SleepLog] bed-refuse reason=notSheltered x,y,z=-66,68,247 adjusted=739   day=17
L2742: [SleepLog] bed-refuse reason=notSheltered x,y,z=-66,68,247 adjusted=2438  day=17
L4880: [SleepLog] bed-refuse reason=notSheltered x,y,z=-66,68,247 adjusted=9491  day=18
L5975: [SleepLog] bed-refuse reason=obstructed   x,y,z=-66,68,247 adjusted=11556 day=18
L8476: [SleepLog] bed-refuse reason=poisoned     x,y,z=-66,68,247 adjusted=13322 day=18
L9766: [SleepLog] bed-refuse reason=poisoned     x,y,z=-66,68,247 adjusted=14392 day=18
```

计数：`notSheltered=5`、`obstructed=1`、`poisoned=2`、`notSafe=0`、`occupied=0`、`bed-occupied-cleared=0`、`bed-wake=0`、`sleep-forward=0`、`sleep-done=0`、`sleep-probe=6`、`sleep-window=1`。

## 三、v1 四绿逐窗核讫

| 窗 | 前置 | 操作 | 行序列 | 断言 | 辅证（B 级） |
|---|---|---|---|---|---|
| **W1 D1** | `doDaylightCycle=true`（复核）/ `doMobSpawning=true` / `/time set day` -> 1000；床两 block `testforblock` 在位；cfg 五键新建即全 `true`（cfg L356-368） | `rc -66 68 246 6`（chat 面 `/tp` 近身 + `activateBlock`） | **L1111** | `reason=notSheltered` 字面；`x,y,z=247` = **HEAD 位** | `tile.bed.notSheltered` + `samples=-----`（拒睡） |
| **W1 D2** | 5x5x3 实心石壳 + 1x2x2 床袋掏空 + 1 格站位掏空（`+2,+1`，被 `checkBlock[26]` 旗门锁住永不被查）+ 重放床 | `rc -66 68 246 14` | **无本行**（计数停在 L4880） | 无 `bed-refuse reason=notSheltered`；无 `bed-occupied-cleared` | **`samples=SSSS…`（56 采样全 S）+ `sleeping=true`** = vanilla 入床链放行并真睡 |
| **W2 D3** | D2 工装在位；`/setblock -66 69 247 stone` | `rc -66 68 246 6` | **L5975** | `reason=obstructed`；HEAD 位 | `tile.bed.obstructed` + 拒睡 |
| **W3 D4** | 撤 y+1 石块（回读 `air`）；`/effect ETIM_Harn04 minecraft:poison 120 1` **与右键同进程** | `rc -66 68 246 6 poison` | **L8476**（L9766 为 W4 窗残毒复现） | `reason=poisoned`；HEAD 位 | `Given Poison (ID 19) * 1 to ETIM_Harn04 for 120 seconds` + `tile.bed.poisoned` + 拒睡 |

## 四、v1 门序与挂钩点源码核（判读基准，全轮沿用）

```
PlayerBedEvents.onPlayerSleepInBed   :106  bedRefuseShelter   && isOutdoors              -> notSheltered -> OTHER_PROBLEM
                                     :112  bedRefuseObstructed && !isAirOrPassable(y+1)   -> obstructed   -> OTHER_PROBLEM
                                     :118  bedRefusePoison    && isPotionActive(POISON)  -> poisoned     -> OTHER_PROBLEM
MixinEntityPlayer.etim$bedNotSafe    :100-118 @Redirect trySleep 的 getEntitiesWithinAABB（必晚于上三面）
                                              bedHostilePathable=false -> vanilla 面；否则 R196 pathable 面
ETIMBedSafety.tickSentry             :337  PlayerTickEvent.END 每拍（ETIMFoodStatsEvents:59）
                                              bedSentryWake && isPlayerSleeping -> pathable 非空
                                              -> tile.bed.wakeMobs/notSafe + logBedWake + wakeUpPlayer
PlayerBedEvents.onRightClickBed      :134  PlayerInteractEvent.RightClickBlock
                                              （服务端触发点 PlayerInteractionManager.java:459 -> ForgeHooks.onRightClickBlock）
                                              OCCUPIED=true 且有占床者 -> logBedRefuse("occupied")
                                              OCCUPIED=true 但无占床者 -> logOccupiedCleared
```

门序结论（与批文 B 级登记一致，不逐字门序核）：三张自定义面在 trySleep 入口事件内依次短路；`notSafe` 由 vanilla 段的 `getEntitiesWithinAABB` 改写产出，**必然晚于三面**。

## 五、v1 冲突分级

**A 级 1 条（A1）**：v1 判定「`isOutdoors` 在 1.12 高地形面露天床恒为真，任何屋顶都翻不动」，归因到 `Chunk.java:1113` 的 `!material.blocksMovement() && !material.isLiquid()` 下扫判据（推断玻璃不算遮蔽）。⇒ **已被主会话源码核驳回，v2 实测推翻，见 §八.1 与 §八.4 更正 1。原文保留于此备查。**

**B 级 3 条**（已登记面，不判 OFFEND）：
1. 门序中段逆位 —— `notSafe` 必晚于三张自定义面（与批文登记一致）。
2. 同点击 killed both faces —— 观测：W4 窗残毒使 `poisoned` 抢占 `notSafe`（L9766）。
3. TOO_FAR vanilla 保留 —— 观测命中 `tile.bed.tooFarAway`（vanilla 睡眠阈 `d^2 < 8` 比交互 reach 更紧）。

**C 级 5 条**（工装侧，非 mod 面）：
| # | 面 | 说明 |
|---|---|---|
| C1 | `/setblock` 覆盖床脚会**整床消失** | vanilla 断脚连带断头；v1 早期两次「无行」是无床而非门通过，已排除并记入工装纪律 |
| C2 | `/effect give` 是 1.13 语法 | 1.12 为 `/effect <player> <effect> [sec] [amp]`；误用回执 `Entity 'give' cannot be found` |
| C3 | 效果经 player NBT **跨断线残留** | 可抢占门序；`rc` 已前置清毒 |
| C4 | 原始 `mineflayer.createBot` 被踢 | 回执 `This server has mods that require FML/Forge`；须走 `fmlbot.js createHarnBot` |
| C5 | R196 `getTopFilledSegment` cap24 面 | 承前切片登记，1.12 无对应重载 |

## 六、v1 未达成/未跑窗

- **D5/D6/D9 工装受阻**：床已遮蔽 -> 开门 -> `/summon zombie … {Invulnerable:1b}` -> 右键；实体面读到敌怪在场（如 `mob@-66,67,246 d=2.9`）但无 `notSafe` 行。v1 落位：门外地面比门底低 2 格（实体 y=66 vs 门底 y=68），僵尸无法寻路进坑。**v2 已由裁决与屋盖修正解锁。**
- **D7/D8 未跑**：挂钩点已核为服务端面；第二假玩家已备（但授权面有坑，见 C6）。

---

---

# 七、v2 复跑节（A1 裁决落地 - 九类核心式全绿）

**基线**：`cb6ce60`（判读窗 checkout）｜jar **279,836B @2026-10-17 18:06:22**（`BUILD_EXIT=0`）｜boot stamp `20261017_180631`
**版本链终行**：`dc2b81e`（其上纯文档提交，判据面 diff 为空）
**环境复位**：起服后 `doDaylightCycle=true` 复核 / `doMobSpawning=true` 复核 / `/time set day`；cfg 五键 `bedRefuseShelter/obstructed/poison/hostilePathable/sentryWake` 全 `true`；`moonStateOverride=`；第二假玩家 `ETIM_Harn05` 经 **RCON `op`** 授权（见 §七.5 C6）

## 七.1 A1 裁决引用与终证

**主会话裁决（驳回 v1 引擎面定性）**：四组屋顶连拒的单一成因 = 屋盖工装以**床脚**为锚铺 `bz±3`（仅盖 z 243..249），而判定锚点为**床头 247**、窗扫需床头±3（z 244..250），列 `(-66,68,250)` 漏盖 ⇒ `(x,z+3)` 窗恒触发。1.12 `Chunk` 重扫链（`Chunk.java:1104-1123` 起点 = `getTopFilledSegment()+15`、失效 `:573-575`）与 R196 原文（`World.java:5658-5878`）均支持屋顶翻面，**零落码**。

**D2 石壳 PASS 的真实机理**：石壳锁死 ±1 passable 门 ⇒ `check_block` 旗不传播 ⇒ ±2/±3 窗永不激活（与屋盖是**两条不同机理**，v1 曾混为一谈）。

**终证（W-R1）**：按裁决修正覆盖为 `/fill -69 70 243 -63 70 250 minecraft:stone`（7x8）；屋盖五点回读 `(-66,70,246..250)` **全 `Successfully found the block`** ⇒ **遮蔽面翻转，无 `notSheltered` 行**。

⇒ **A1 关闭，零落码。D1-D4 效力不变，无需重跑。**

## 七.2 v2 判决源行序列（v2 窗 boot `20261017_180631`，全窗 `bed-*` 共 8 行）

```
L962:  [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=19548 day=18
L1765: [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=20529 day=18
L2244: [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=21007 day=18
L3023: [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=21843 day=18
L3416: [SleepLog] bed-refuse reason=notSafe x,y,z=-66,68,247 adjusted=22497 day=18
L3969: [SleepLog] bed-wake reason=notSafe sleeper=true x,y,z=-66,68,247 tick=13000
L4820: [SleepLog] bed-refuse reason=occupied x,y,z=-66,68,247 adjusted=2768 day=18
L5167: [SleepLog] bed-occupied-cleared x,y,z=-66,68,247
```

v2 计数：`notSafe=5` / `bed-wake=1` / `occupied=1` / `bed-occupied-cleared=1` / **`notSheltered=0`** / `obstructed=0` / `poisoned=0`
（`notSheltered=0` 正是 W-R1 的预期断言，达成。）

## 七.3 逐窗核讫表

| 窗 | 前置 | 操作 | 行序列 | 断言 | 辅证（B 级） | 判定 |
|---|---|---|---|---|---|---|
| **W-R1** 屋盖翻面正证（A1 终证） | 清坑 `/fill -68 68 245 -64 70 249 air` + 7x8 屋盖 `/fill -69 70 243 -63 70 250 stone` + 重放床；屋盖五点回读全在位 | `rc -66 68 246 14` | **无 notSheltered**；**L962** `notSafe` | 遮蔽面翻转（A1 终证） | `nearEntities(4)` 含 `mob@-66,67,246 d=2.9`；`You may not rest now, there are monsters nearby` | **PASS** |
| **W-R2** 玻璃顶对照 | 同覆盖改 `mat=glass`（回读 `roofBlock=glass`） | `rc -66 68 246 8` | **L1765** `notSafe` | 玻璃顶同样翻面（无 notSheltered） | 同上消息面 | **PASS** |
| **W-R3** 僵尸寻路面（D5 专证） | 清场 `sweep r=5` + `/summon zombie -66 68 241 {Invulnerable:1b}` | `rc … 8 - sweep` | 本次 `nearEntities(0): none` ⇒ **未出行** | 隔离专证一次未成（召唤僵尸点击前不在场） | — | **未成**（D5 已由 L962/L3023/L3416 在场读数 + W-R6 召唤僵尸可寻路面覆盖，见 §七.4 注 1） |
| **W-R4** slime 主证（M3 / D6） | `mob slime -66 68 240`（op 内建 r=14 清场，仅余 slime） | `rc … 8` | **L2244** `notSafe` | **本行照出**（slime = IMob 非 EntityMob） | `nearEntities(2)` 含 `mob@-63,68,246 d=1.3`（=slime，贴床）；`there are monsters nearby` | **PASS** |
| **W-R5** 封笼反面（C 面） | `doMobSpawning=false` + `/summon zombie -66 68 240 {Invulnerable:1b}` + `cage -66 68 240`（3x3x3 glass 实心壳）；`rc` 以床为心 `sweep r=5`（**刻意避开 r=7.5 的封笼僵尸**） | `rc … 14 - sweep` | **无新行**（`bed-refuse` 计数停在 L3416） | 封笼僵尸**不可寻路 ⇒ 不拒** | `nearEntities(1): mob@-66,66,241 d=7.5`（封笼僵尸仍在场）；**`samples=SSSS…`（56 全 S）+ `sleeping=true`** = 入床链放行 | **PASS** |
| **W-R6** sentry 逐拍门（D9） | `doDaylightCycle=false` 复核 + 一次 `/time set night`（表钟 13000，特批登记）+ 遮蔽床 | `rc … 14 - sweep wake` | **L3969** `bed-wake reason=notSafe sleeper=true x,y,z=-66,68,247 tick=13000` | `reason=notSafe` + **`sleeper=true`**（fully-asleep 分支） | `tile.bed.wakeMobs` 送达；`26 blocks filled`（破笼回执）⇒ 僵尸获寻路 ⇒ 秒级弹醒；`asleep before summon=false`（已弹出） | **PASS** |
| **W-R7** occupied 真占（D7） | 双 bot 异名：`ETIM_Harn05` 睡入（`rc … 45 - sweep`），`ETIM_Harn04` 右键 | 见左 | **L4820** `bed-refuse reason=occupied` | `reason=occupied` | B(05) 侧 `samples=SSSS…`（180 全 S）+ `sleeping=true` + **`ETIM_Harn05 has made the advancement [Sweet dreams]`**（wellRested 条件字面）；A(04) 收 **`This bed is occupied`** + `samples=---` 拒睡 | **PASS** |
| **W-R8** occupied 滞旗（D8） | `/setblock -66 68 247 minecraft:bed 12`（meta `0x8|0x4` = HEAD+OCCUPIED 直造，回读 `bed meta=12`）；无占床者 | `rc … 12 - sweep` | **L5167** `bed-occupied-cleared x,y,z=-66,68,247` | **无 refuse 行** + `bed-occupied-cleared` | **`samples=SSSS…`（48 全 S）+ `sleeping=true`** = A 成功入床（vanilla `BlockBed:109-110` 自愈面） | **PASS** |

## 七.4 更正与注记

**更正 1｜v1 A1 定性作废**：v1 断言「`isOutdoors` 在 1.12 高地形面恒为真、任何屋顶都翻不动」，并把成因归到 `Chunk:1113` 的 `!blocksMovement && !isLiquid` 下扫判据（推断玻璃不算遮蔽）。**两处均已被裁决与 v2 实测推翻**：

- 真因是**屋盖覆盖锚点歧义**（床脚 ±3 vs 床头 ±3 漏一列），非材质判据；
- **玻璃顶同样翻面**（W-R2，L1765）⇒ 材质不是判别项。

（v1 原文保留于 §五 A 级，不删改，以本条为准。）

**更正 2｜面位统一为床头 247**：主会话预期 `notSafe` 面位为「AABB 中心 = 床脚 `-66,68,246`」。实测 v2 全八行（含 `notSafe`）**一律 247**。合源码：`ETIMBedSafety.logBedRefuse(world,reason,aabb)` 取 AABB 中心，而 1.12 `BlockBed.onBlockActivated` 传给 `trySleep` 的 `pos` 是**床头**（与 `PlayerBedEvents:102` 的 `event.getPos()` 同一锚点）⇒ **四张面同锚点，面位不可用作面间区分**。登记为 B 级（判读面一致性更正）。

**注 1｜D5 证据构成**：`notSafe` 入口面共 5 行（L962 / L1765 / L2244 / L3023 / L3416），均由**在场 hostile 读数**支撑（`nearEntities` 内 `mob@… d=1.3~4.1`），其中 **L2244 为 slime（M3 主证）**。**`/summon` 召唤僵尸（可寻路）的专证落在 sentry 面**（W-R6：破笼后召唤僵尸即刻触发 `bed-wake`）。入口面的「召唤僵尸在门前可寻路」隔离窗一次未成（`nearEntities(0)`，召唤体在点击前不在场）。**复跑配方**：`doMobSpawning=false` 下先 `rc … - sweep`（清床周 r=5），再 `/summon zombie -66 68 241`，**勿再 sweep**，直接点击；或直接采信 L962（`mob@-66,67,246 d=2.9`，贴床可寻路）。

**注 2｜W-R6 因果链自洽性**：唤醒源是 `/fill` 破笼（回执 `26 blocks filled`）而非随后那条 `/summon` —— 时间戳 `tile.bed.wakeMobs`（10:12:49.313）早于 `asleep before summon`（10:12:51.311）。两者效果同型（解除封笼使召唤僵尸获寻路），不构成误读。

**注 3｜B/C 级面在 v2 的实测命中**：B2 同点击双面**未观测**（v2 各窗均单面）；B3 TOO_FAR 已按 `d^2<8` 校准工装站位（`stand=(bx+2.2, by, bz+1.5)`），**未再触发**；C2 毒面 v1 已闭合故 v2 未用；C3 `rc` 内建清毒照用（回执 `Couldn't take Poison … do not have the effect`，幂等无害）；C1 工装一律 `air` 清坑后重放床，未再触发。

## 七.5 v2 新增 C 级（工装侧）

| # | 面 | 说明 |
|---|---|---|
| C6 | **离线模式 UUID 不自洽 ⇒ `ops.json` 直写不生效** | v1 手写 `ETIM_Harn05` 的 UUID 与服务端 `UUID.nameUUIDFromBytes("OfflinePlayer:<name>")` 不匹配 ⇒ 该假玩家无 op（回执 `You do not have permission to use this command` x10）。**处置：改用 RCON `op ETIM_Harn05`**（无位置语义，白名单内）。`run\obfuscated\ops.json` 的手写条目已被服务端忽略，重启后需重新 `op`。 |
| C7 | `/kill @e[…,r=N]` 以**命令源**为中心 | 玩家 chat 的命令源 = 玩家位置 ⇒ 清场必须**先 tp 到床旁再清**（`rc` 的 `sweep` 相位即为此设计），否则清的是出生点半径内的怪。 |
| C8 | PowerShell 丢弃空串参数 | `rc … 12 "" sweep` 中 `""` 被吞，`sweep` 落入 effect 槽（回执 `There is no such mob effect with ID minecraft:sweep`）。**处置：占位用 `-`/`none`，代码侧已加判据。** |
| C9 | 封笼僵尸的 `nearEntities` y 读数偏低 | 封在 `y 67..69` 壳内的僵尸被客户端读作 `y=66`（AABB 底面），非位置错误；判读以「在 AABB + 不可寻路」为准。 |

## 七.6 v2 判决类清单（终）

| # | 判决类 | 核心式 | 终态 | 证据 |
|---|---|---|---|---|
| D1 | 露天床拒睡 | `bed-refuse reason=notSheltered` | **PASS** | v1 L1111 等 5 行 |
| D2 | 遮蔽床放行 | 无本行 + vanilla 放行 | **PASS** | v1 石壳面 + **W-R1/W-R2 屋盖面再证** |
| D3 | 床头阻挡 | `bed-refuse reason=obstructed` | **PASS** | v1 L5975 |
| D4 | 中毒拒睡 | `bed-refuse reason=poisoned` | **PASS** | v1 L8476、L9766 |
| D5 | 可寻路敌怪拒睡 | `bed-refuse reason=notSafe` | **PASS** | L962 / L1765 / L3023 / L3416 + 在场 hostile 读数 |
| D6 | notifierM3 slime 面 | `bed-refuse reason=notSafe`（slime） | **PASS** | **L2244**（slime `d=1.3`） |
| D7 | occupied 真占 | `bed-refuse reason=occupied` | **PASS** | **L4820** + `tile.bed.occupied` + B `Sweet dreams` |
| D8 | occupied 滞旗 | 无 refuse + `bed-occupied-cleared` + 入床 | **PASS** | **L5167** + `samples=SSSS…` |
| D9 | sentry 逐拍门 | `bed-wake reason=notSafe sleeper=true` | **PASS** | **L3969** + `tile.bed.wakeMobs` + 弹醒 |
| - | 封笼反面（W-R5） | 无 `notSafe` + 入床放行 | **PASS** | 无新行 + `samples=SSSS…` |

**核心式九类（D1-D9）全绿 + 封笼反面 PASS。**

## 七.7 冲突分级（v2 终态）

- **A 级 0 条** —— v1 的 A1 经主会话源码核裁定为工装覆盖歧义，非引擎面，**零落码关闭**。
- **B 级 3 条**（已登记面，不判 OFFEND）：门序中段逆位 / 同点击双面（v2 未观测）/ TOO_FAR vanilla 保留（v2 工装已校准规避）。**含面位一致性更正 1 条（§七.4 更正 2）。**
- **C 级 9 条**（工装侧）：v1 C1-C5 + **v2 新增 C6-C9**。

## 七.8 留账（承任务书，尾注不变）

挖床 AI（`tickSentry:413` deferred 面，**未落码**）与 mobwake 1/1000 延迟账 ⇒ mobs/AI 切片收；三态意识态延迟账 ⇒ consciousness 切片候选（五批文裁决 5 out 已定）。

## 七.9 状态与清理（v2 终态）

- **进程**：server `stop`；25565 无监听；testharness node 零残留（Gradle daemon 按纪律不清）。
- **cfg 终态**：`bedRefuseShelter/obstructed/poison/hostilePathable/sentryWake` 全 `true`；`moonStateOverride=`；`foodTestMode=true`。
- **gamerule 终态**：`doDaylightCycle=false`（W-R6 特批，**下次起服须再设再核**，C 级坑常备）/ `doMobSpawning=false`（W-R5 反面窗所设，**下次起服须回 true**）。
- **表钟终态**：`/time set night` ⇒ **13000 冻结**（特批残留登记，Δ raw 分裂；本切片断言面无一读 Δ）。
- **世界工装**（测试用，非 ETIM 产物）：床 `-66,68,246` meta=0 / `-66,68,247` meta=8（**W-R8 后 OCCUPIED 由 vanilla 自愈面清回**）；7x8 屋盖 `@y=70`（x -69..-63，z 243..250，**当前为玻璃，W-R2 末态**）；旧 7x7 屋盖 `@y=100` 残留；坑式石壳已由 `roof` op 清空。
- **harness**：`testharness\player\bed-entry-ops.js` v2 相位 —— `roof`（覆盖修为 `bz-3..bz+4`）/ `fill2` / `mob`（内建 r=14 清场）/ `cage` / `pit` / `rc`（清毒 + 床位实体读数 + `sweep` 相位 + `wake` 相位）/ `effect`（1.12 语法）；`run\obfuscated\ops.json` 含手写 `ETIM_Harn05`（**已被服务端忽略，见 C6**，授权走 RCON `op`）。

---

**判读签署（v2 · 终）**：会话七 ｜ 基线/版本链终行 **`dc2b81e`**（判读窗 checkout `cb6ce60`；`dc2b81e` 为其上纯文档提交，判据面 diff 为空）｜ jar 279,836B @2026-10-17 18:06:22 ｜ 判读窗 boot stamp `20261017_180631` ｜ **D1-D9 九类核心式全绿 + 封笼反面 PASS；A 级 0 条；B 级 3 条（含面位更正 1）；C 级 9 条为工装侧** ｜ 判据源 `[SleepLog] bed-*`：v2 窗 8 行 + v1 窗 8 行全部在案