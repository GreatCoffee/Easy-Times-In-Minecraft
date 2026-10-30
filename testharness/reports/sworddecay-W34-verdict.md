# B-7 剑面收敛批（sworddecay）· W-34a…j 判决回执

> **报告字节规格**：`21,076 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 97 / ✗ 1｜237 行`
> 执行方：会话七（自动化测试执行方）｜窗口：2026-10-30 12:21:38–12:23:55（服务器本地时；驱动 UTC 04:21–04:23）｜tag `sworddecay-w34`
> 判决源：判据只吃服务端 `[MiningLog] tool decay face=breaking|attacking … loss=` 行；旁证 = 同栈耐久回读（`[BlockLog] probe … dur=x/max` ＋ 假人 NBT `durabilityUsed` 双路）
> 审判权威：audit20 条 137（立项+抽核 6 组）／条 138（终审 T-1…T-7 放行）／条 139（落码收讫四钉）＋ 主会话 W-34 判窗任务书（含终审勘-1 判值纪律、注-2 顺序面）
> 判值纪律（终审勘-1）：全表只写 max 出口值 —— 四植物 10／knife_flint 2／vanilla 剑 0／attack 50；**未手算任何乘性中间项**作期望。
> 计数注记：正文判点**无 FAIL**；表头「cross」列的 1 个字形来自该行自身的固定点计数（自指），非判点失败。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `c3ac0e9`（mining: sworddecay B-7 - @Redirect sword dig-wear guard reads R196 hardness table） | ✓ 起窗/收口同值；上一环 `6dad347` |
| dev jar | 753,688 B｜`B5E91C3DCF707ECE385CB27460233D658AD84A849EC7194D7C5D71659AEE4206` | ✓ 逐位命中（起/收同值） |
| release jar | 769,417 B｜`7FD38FE3EB399EEF6154F63C6F85ED6B66A33298636F7A6D92DC8ACA5D19BEF8` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical（= 钉值，本批零新键未换锚）** |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=sworddecay34`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` | ✓ 起收 byte-identical（窗内 op 假人与登录会改写，收口整档还原） |
| 附属 jar | 不在场（本批不带 etimextra） | ✓ 两相 FML 清单 16 mods 无 etimextra |
| 世界 | `level-name=test27dev` → 窗内新世界 `sworddecay34` → 收口还原 | ✓ 两相 `Preparing level "sworddecay34"`；世界目录收口删除 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（两相各一次） | ✓ 0 rebuild |
| 通道 | `gradlew runServer` ＋ 控制台 stdin（`server-console.js`） | ✓ `/etest hold`、`/etest dig`、`/etest blockprobe`、`/setblock`、`/testforblock` 在役 |
| 环境前置 | 25565 = 0 LISTEN、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |
| mixin 面 | 新增 @Redirect 的加载面 | ✓ 两相 `Mixin apply failed`／`MixinException`／`InvalidInjectionException` 三型全 0 |

两相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 |
| --- | --- | --- | --- |
| A | `miningReform=true`（＋`blockDebugLog=true` 取 probe 面） | W-34a / b / c / d / e / f / j / i / h | `Done (5.233s)` |
| G | `miningReform=false` | W-34g-1 / g-2 | `Done (0.995s)` |

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh 挖块（每点换 `item×block` 组合，规避 `ETIMMining.java:571-592` 的 last-sig 去重），判 **判行 loss 定值** ＋ **判行条数** ＋ **dur Δ 旁证**；`cost=` 一类读数不进判值。

| 判点 | 工具 × 方块（meta） | 期望 loss | 实测判行 loss | 判行条数 | dur Δ（probe／NBT） | 期望 durΔ | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-34a | `etim:sword_copper` × `minecraft:tallgrass`（1） | 10 | **10** | 1 | **10／10**（0→10） | 10 | **✓ 通过** |
| W-34b | `etim:sword_copper` × `minecraft:sapling`（0） | 10 | **10** | 1 | **10／10**（0→10） | 10 | **✓ 通过** |
| W-34c | `etim:sword_copper` × `minecraft:deadbush`（0） | 10 | **10** | 1 | **10／10**（0→10） | 10 | **✓ 通过** |
| W-34d | `etim:sword_copper` × `minecraft:double_plant`（0，上下两半） | 10（◎） | **10** | 1 | **10／10**（0→10） | 10 | **✓ 通过** |
| W-34e | `minecraft:iron_sword` × `minecraft:tallgrass`（1） | 0（形状②） | **0** | **1** | **0／0**（0→0，max 6400） | 0 | **✓ 通过** |
| W-34f | `etim:knife_flint` × `minecraft:tallgrass`（1） | 2 | **2** | 1 | **2／2**（0→2，max 400） | 2 | **✓ 通过** |
| W-34j | `etim:sword_copper` × `minecraft:wheat`（7，farmland 支撑） | 10 | **10** | 1 | **10／10**（0→10） | 10 | **✓ 通过** |
| W-34i | `etim:sword_silver` × `minecraft:tallgrass`（1）×2 破 | 10（合并 1 行） | **10** | **1**（两破合一行） | **20／20**（0→20） | 20 | **✓ 通过** |
| W-34h | `etim:sword_copper` 击打场上敌体 | 50 | `face=attacking loss=50` | 1 | **50／50**（0→50） | 50 | **✓ 通过** |
| W-34g-1 | `etim:sword_copper` × `minecraft:tallgrass`（reform **off**） | 无行 | **无行** | 0 | **0／0**（0→0） | 0 | **✓ 通过** |
| W-34g-2 | `minecraft:iron_sword` × `minecraft:dirt`（reform **off**） | 无行 | **无行** | 0 | **2／2**（0→2，max 250） | 2 | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样）：

| 判点 | 支撑块落地 | 目标块落地 | 挖前在场 | dig-start | dig-stop | 挖后块消失 | 无障碍行（reach/deny） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-34a | ✓ Block placed | ✓ | ✓ tallgrass | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34b | ✓ | ✓ | ✓ sapling | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34c | ✓ | ✓ | ✓ deadbush | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34d | ✓ | ✓ 上下两半 | ✓ double_plant | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34e | ✓ | ✓ | ✓ tallgrass | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34f | ✓ | ✓ | ✓ tallgrass | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34j | ✓ farmland 7 | ✓ | ✓ wheat | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34i | ✓ | ✓ 两次重摆 | ✓ tallgrass ×2 | ✓ ×2 | ✓ ×2 | ✓ air ×2 | ✓ 无 |
| W-34h | —（无挖） | — | ✓ 目标实体在客户端表内 dist=1 | — | — | — | ✓ 无 deny |
| W-34g-1 | ✓ | ✓ | ✓ tallgrass | ✓ | ✓ | ✓ air | ✓ 无 |
| W-34g-2 | ✓ | ✓ | ✓ dirt | ✓ | ✓ | ✓ air | ✓ 无 |

窗面分离（reform on／off，同一工具同块）：

| 对照 | reform on（A 相） | reform off（G 相） | 结论 |
| --- | --- | --- | --- |
| ETIM 铜剑 × 高草 | 判行 `loss=10` ＋ dur 0→10 | **无判行** ＋ dur 0→0 | 新 @Redirect 的 off 分支回调原生 `getBlockHardness`（= 0.0，守卫恒假）⇒ 零扰动 |
| vanilla 铁剑 × dirt | （on 相未跑；同块非本批判点） | **无判行** ＋ dur 0→2 | off 分支走 vanilla `damageItem(2)`，与 @D 前的原语义一致 |

旁证读数（不作判值，仅记面）：`mine speed` 行 —— 铜剑四植物与小麦 `str=3.5`、火刀高草 `str=2.5`、vanilla 铁剑**无** `mine speed` 行（str<1.0 不进该行），与「有效性门在 str 侧拒 vanilla 剑」互为印证。

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\sworddecay-w34-a-server-latest.log`（A 相）、`…-g-server-latest.log`（G 相）；控制台全量：`…-a.out`／`…-g.out`；逐判点＋逐行证据：`…-evidence.json`。

### W-34a 铜剑 × 高草（loss=10，dur 0→10）

```text
[12:22:05] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_copper block=tallgrass str=3.5 [server]
[12:22:05] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=0/3200 [server]
[12:22:07] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_copper block=tallgrass loss=10 [server]
[12:22:09] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=10/3200 [server]
```

### W-34b 铜剑 × 树苗（loss=10，dur 0→10）

```text
[12:22:12] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_copper block=sapling str=3.5 [server]
[12:22:14] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_copper block=sapling loss=10 [server]
[12:22:16] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=10/3200 [server]
```

### W-34c 铜剑 × 枯萎灌木（loss=10，dur 0→10）

```text
[12:22:19] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_copper block=deadbush str=3.5 [server]
[12:22:21] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_copper block=deadbush loss=10 [server]
[12:22:23] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=10/3200 [server]
```

### W-34d 铜剑 × 双生植物（loss=10，dur 0→10）

```text
[12:22:25] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_copper block=double_plant str=3.5 [server]
[12:22:27] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_copper block=double_plant loss=10 [server]
[12:22:30] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=10/3200 [server]
```

（◎ 面：R196 无 double_plant 方块一手负证，判值由 `ETIMMining.java:84` 表行 0.02F 推导；本窗实测与推导同值。）

### W-34e vanilla 铁剑 × 高草（恰 1 行 loss=0，dur 0→0）

```text
[12:22:32] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=minecraft:iron_sword dur=0/6400 [server]
[12:22:34] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=minecraft:iron_sword block=tallgrass loss=0 [server]
[12:22:37] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=minecraft:iron_sword dur=0/6400 [server]
```

（形状②直证：守卫经 @D 读 R196 0.02F ⇒ 非零 ⇒ 进 vanilla `damageItem(2)` 调用点 ⇒ 本 mixin 接手判 0；有效性门 `ETIMMining.java:476-478` 拒 vanilla 剑 ⇒ `str=0.0` ⇒ `loss=0`。注-2 顺序面照任务书口径：改前该块零行，本 build 已改，故「恰 1 行」本身即为判出。）

### W-34f 火刀 × 高草（loss=2，dur 0→2）

```text
[12:22:39] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:knife_flint block=tallgrass str=2.5 [server]
[12:22:41] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:knife_flint block=tallgrass loss=2 [server]
[12:22:44] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:knife_flint dur=2/400 [server]
```

### W-34j 铜剑 × 成熟小麦（loss=10，dur 0→10）

```text
[12:22:46] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_copper block=wheat str=3.5 [server]
[12:22:48] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_copper block=wheat loss=10 [server]
[12:22:51] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=10/3200 [server]
```

（作物面走 `MixinBlockCrops` 构造注入的 0.02F 硬度字段（`MixinBlockCrops.java:28-31`），不经硬度表 —— 说明「剑 × 作物」与「剑 × 四植物（走表行+@D）」两条路径同值收口。）

### W-34i 银剑 × 高草连破两次（合并 1 行 loss=10，dur 0→20）

```text
[12:22:53] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_silver block=tallgrass str=3.5 [server]
[12:22:55] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_silver block=tallgrass loss=10 [server]
[12:23:04] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_silver dur=20/3200 [server]
```

（两破之间**未换手**（同一栈），第二破无行、dur 再 +10 ⇒ `ETIMMining.java:587-590` 的 last-sig 去重按 `face|item|block` 吃掉同值第二击。**键选择纪律见 C-1**：本点用银剑而非铜剑，正是为了拿到未在本窗出现过的 `item×block` 键。）

### W-34h attack 冒烟（`face=attacking loss=50`，dur 0→50）

```text
[12:23:13] [Server thread/INFO] [minecraft/DedicatedServer]: Found Cow
[12:23:14] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=attacking item=etim:sword_copper loss=50 [server]
[12:23:16] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34A#191 held=etim:sword_copper dur=50/3200 [server]
```

（双证齐：`hitEntity` 重定向链一字未动（`100×0.5` 出口 50）＋ 耐久 Δ=50。击打走**真实客户端包**（`bot.attack` → `CPacketUseEntity`）；目标实体的替换见 C-3。）

### W-34g-1 ETIM 铜剑 × 高草（reform off，0 行，dur 0→0）

```text
[12:23:40] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34G#52 held=etim:sword_copper dur=0/3200 [server]
[12:23:45] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34G#52 held=etim:sword_copper dur=0/3200 [server]
```

（窗内该点 `[MiningLog] tool decay` 行 0 条；块仍被破坏（`testforblock … air` 命中）⇒ 破坏链本身不受影响，衰减守卫在 off 相回落到原生 0.0 恒假。）

### W-34g-2 vanilla 铁剑 × dirt（reform off，0 行，dur 0→2）

```text
[12:23:47] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34G#52 held=minecraft:iron_sword dur=0/250 [server]
[12:23:52] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W34G#52 held=minecraft:iron_sword dur=2/250 [server]
```

（0 判行 ＋ dur 恰 +2 = vanilla `damageItem(2)` 原语义直证 ⇒ 新 @D 的 off 分支对无关方块零扰动。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条、B 级 **0** 条；C 级 7 条（均不改判点结论、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **判窗键纪律（去重面）**：`ETIMMining.java:571-592` 的 last-sig 去重按 `face／item／block` 记「上一次的值」，同键同值连击**不出第二行** ⇒ 判窗必须逐点用未出现过的 `item×block` 键，否则前一点的同值行会把后一点吞掉（W-34i 因此用银剑而非铜剑） | 工装纪律；已写入驱动注释与回执；后续挖掘衰减批沿用 |
| C-2 | C | **`/etest attack` 的选择器面**：console 发送者无位置（`r=` 面恒空，属 1.12 语义，非缺陷）；单实体参数走 `matchOneEntity` 要求列表恰 1 个，故 `c=` 必须先截断。本窗 4 形态全 NO_TARGET 的真因是目标实体已不存在（见 C-3） | 判窗改走真实客户端击打包（`bot.attack`）；`/etest attack` 仍需「先对准 + 目标存活」两前置 |
| C-3 | C | **召唤僵尸静默消失（产品侧观察，本批未追）**：`/summon zombie` 后 ≤1 s 内该实体从世界选择器（`@e[type=!player]` 列表）与客户端实体表**同时**消失，`[AILog] mob despawn counter-meter counter=3 age=1` 在召唤 tick 即出、无 kill／伤害行；白天与夜间（`time set 18000`）均复现（probe1／probe2／smoke5 三证） | 不影响 W-34 判点：W-34h 的备试改用牛（衰减带只读手持物类别，`ETIMMining.java:366-368`，与目标物种无关）；建议主会话把「召唤僵尸即消失」登记进 despawn/spawn-cycle 面待查 |
| C-4 | C | **melee 门按视线射线距离判**：`[Reach] reach denied: etim.reach.deny_attack <∞> > 2.25`（`ETIMReachEvents.java:42-53`）——客户端击打前必须 `lookAt` 对准目标，否则射线距离为无穷大、恒被拒 | 工装纪律（驱动已先 `bot.lookAt` 再出手）；smoke4 留档直证 |
| C-5 | C | **1.12 召唤回执文案**：成功行是 `Object successfully summoned`（不是 `Summoned new`） | 认行正则按前者；已修入驱动 |
| C-6 | C | **窗口塑性面**：本窗加 `gamerule doTileDrops false`（去掉落实体噪声）与 W-34h 的 `time set 18000`；两点均不触碰衰减链判值 | 登记；判点不受影响 |
| C-7 | C | **服务端侧缓存改写面**：窗内 `op` 假人与假人登录会改写 `ops.json`／`usercache.json`／`usernamecache.json`（均在 `run\` 根，不在世界目录内） | 本窗首次把三件纳入起窗快照＋收口整档还原（byte-identical 已核）；建议后续窗口沿用 |

## 4. 结论

**W-34a / b / c / d / e / f / g-1 / g-2 / h / i / j 全部通过（11/11），驱动机器总判 PASS。**

- **四植物正证（a/b/c/d）**：ETIM 金属剑 × 高草／树苗／枯萎灌木／双生植物，判行 `loss=10` 各 1 条、dur 各 0→10 ⇒ B-7 的 dig-wear guard 已与衰减链同源读 R196 硬度表（0.02F），旧状「零行零磨」不复存在。
- **vanilla 剑负证（e）**：恰 1 行 `loss=0` ＋ dur 0→0 ⇒ 形状②成立（守卫通过、有效性门在 str 侧拒），终审 T-3 的全部分界落在实测面上。
- **判别点（f/j）**：火刀 `loss=2`（0.5 档 max 出口）与小麦 `loss=10`（作物硬度字段面）双线成立，说明 @D 与 `MixinBlockCrops` 两条路径各就各位、未串门。
- **去重形状（i）**：同键连破两次只留 1 行、dur 累计 +20 ⇒ 行级去重按值合并的自洽性在实测面复现。
- **off 相（g-1/g-2）**：0 行 ＋ dur 0／+2 ⇒ 新 @D 的 off 分支对无关方块与原生语义零扰动（开关有效、非「永远改写」）。
- **attack 冒烟（h）**：`face=attacking loss=50` ＋ dur +50 ⇒ `hitEntity` 链本批一字未动（零扰动面兑现）。
- **产品面**：零改码、零 rebuild（两相 `:jar UP-TO-DATE`）；本批的 A-2 字节直钉（`getBlockHardness` INVOKE 唯一性、require=1）在两相 boot 均无注入报错。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 两相 `Done (5.233s／0.995s)` → stdin `stop` → `BUILD SUCCESSFUL`、退出码 0（A／G） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内两次键值改：`blockDebugLog=false→true`、`miningReform=true→false`，收口整档还原；未换锚） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=sworddecay34`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical（op 与登录改写已还原） |
| 世界 | 新世界 `sworddecay34` 两相复用；收口删除目录（`worldDirRemoved=true`） |
| 端口／崩溃 | 25565 收口 0 LISTEN；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W34A`／`ETIM_W34G`） |
| 钉值复核 | dev／release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `…-a.out`／`…-g.out`（全量控制台）、`…-a-server-latest.log`／`…-g-server-latest.log`（服务端日志）、`…-evidence.json`（逐判点＋逐行＋耐久读数＋客户端实体表）、`…-etim.cfg.before`／`…-server.properties.before`／`…-ops.json.before`／`…-usercache.json.before`／`…-usernamecache.json.before`；排障链 `…-smoke`／`…-smoke2`（W-34h 判据链事故与 C-2/C-3 实证）、`…-smoke3/4/5`、`…-probe*`（选择器／实体面两轮） |
| 驱动 | `testharness\player\sworddecay-w34.js`（两相：A／G；`W34_ONLY`／`W34_SKIP_G` 调试口仅冒烟用）；排障件 `sworddecay-w34-probe.js`／`-probe2.js` |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `c3ac0e9` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\sworddecay-w34.js`
- `testharness\player\sworddecay-w34-probe.js`
- `testharness\player\sworddecay-w34-probe2.js`
- `testharness\reports\sworddecay-W34-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **C-3（召唤僵尸静默消失）**：是否另立窗口查 despawn／spawn-cycle 面（本批不作 A 级，判点未受影响）。
2. **C-1（判窗键纪律）**：是否把「逐点 fresh `item×block` 键」写进挖掘衰减类批次的通用判窗纪律（建议入 audit20 注记）。
3. **注-2 口径固化**：W-34e 的「改前零行 → 改后恰 1 行」不可复测，本窗只判「恰 1 行」；是否在 audit20 条 138 注-2 后补一句「重验只判一行形状」。
