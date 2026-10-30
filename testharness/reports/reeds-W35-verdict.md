# 挖掘/块面批（reeds · A-4 兑现）· W-35a…j 判决回执

> **报告字节规格**：`25,158 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 98 / ✗ 4｜254 行`
> 执行方：会话七（自动化测试执行方）｜判窗：2026-10-30 18:34:16–18:36:31（服务器本地时；驱动 UTC 10:34–10:36）｜B-1 隔离探针窗：18:38:45–18:39:01｜tag `reeds-w35`
> 判决源：判据吃服务端 `[MiningLog] tool decay face=breaking … loss=`／`[MiningLog] mine speed … str=`／`[MiningLog] mine deny …` 三类行；旁证 = 同栈耐久回读（`[BlockLog] probe … dur=x/max` ＋ 假人 NBT 双路）＋ 客户端侧破坏进度计数（第二观察假人）
> 审判权威：audit20 条 142（立项 + 主会话抽核 7 组）／条 143（终审放行 T-1…T-8，**新-A1 剪刀 str 7.0→5.0**）／条 144（落码四钉）＋ 主会话 W-35 判窗任务书
> 判值纪律（条 138 勘-1 收编）：全表只写 max 出口值 —— 甘蔗四出口 16／8／4／5；**未手算任何乘性中间项**作期望。
> 计数注记：正文失败叉号共 4 处 = 表头自指 1 处 ＋ W-35c 的 dur 面 3 处（该点为唯一 FAIL 面，其余判点及 W-35c 的 loss／str 两面均为通过）。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `934a40e`（mining: reeds A-4 - ETIMMining hardness table +1 row） | ✓ 起窗/收口同值；上一环 `3af6729`；工作树 dirty 0 起窗 |
| dev jar | 753,718 B｜`C8F78CDC10910904A512CB970D4400FDD0B2D3D3AB18ABD5FDCE4F64AD3D8AC7` | ✓ 逐位命中（起/收同值） |
| release jar | 769,440 B｜`1D31BCF6B079BC22F76CA271137FC42B012A0EB35B3C7531E1B2FA6285D3F658` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical（= 钉值，本批零新键未换锚）** |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=reeds35`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` | ✓ 起收 byte-identical（两假人登录会改写，收口整档还原） |
| 附属 jar | 不在场（本批不带 etimextra） | ✓ 两相 FML 清单 16 mods 无 etimextra |
| 世界 | `level-name=test27dev` → 窗内新世界 `reeds35` → 收口还原 | ✓ 两相 `Preparing level "reeds35"`；世界目录收口删除 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（两相各一次） | ✓ 0 rebuild |
| 通道 | `gradlew runServer` ＋ 控制台 stdin（`server-console.js`） | ✓ `/etest hold`、`/etest dig`、`/etest blockprobe`、`/setblock`、`/testforblock` 在役 |
| 环境前置 | 25565 = 0 LISTEN、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |
| mixin 面 | 载荷面 | ✓ 两相 `Mixin apply failed`／`MixinException`／`InvalidInjectionException` 三型全 0 |

两相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 |
| --- | --- | --- | --- |
| A | `miningReform=true`（＋`blockDebugLog=true` 取 probe 面） | W-35a / b / c / d / e / f / g / i / j | `Done (5.718s)` |
| G | `miningReform=false` | W-35h | `Done (1.132s)` |

卫生面（条 143 要求钉死，实测在案）：`gamemode 0`（禁创造）｜`etest level 0`（xp=0，去 `miningSpeedPerLevel` 加成）｜`etest food 6 6`（饱食满，去 `hungerDigStrDivisor` 罚）｜`tp` 后 grounded=true（去 `!onGround` ÷5）｜水盆石圈封闭且距玩家 ≥1 格（去 `insideOfMaterial(WATER)` ÷5）｜判点工具/物品无耐久/效率附魔（`/etest hold` 投裸栈）｜`difficulty 0`＋`randomTickSpeed 0`＋`doTileDrops false`（条 141：本批无需敌对实体）。

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh `item×block` 键的挖块（条 140 C-1）；判 **判行 loss 定值** ＋ **判行条数** ＋ **dur Δ 旁证** ＋ **破块/耗时面**。`mine speed` 与 `mine deny` 为旁证面，不作判值。

| 判点 | 工具 × 方块 | 期望 loss | 实测判行 loss | 判行条数 | dur Δ（probe／NBT） | 期望 durΔ | 期望 str | 实测 str | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-35a | `etim:sword_copper` × `minecraft:reeds` | 16 | **16** | 1 | **16／16**（0→16，max 3200） | 16 | 3.5 | **3.5** | **✓ 通过** |
| W-35b | `etim:knife_flint` × `reeds` | 4 | **4** | 1 | **4／4**（0→4，max 400） | 4 | 2.5 | **2.5** | **✓ 通过** |
| W-35c | `etim:shears_rusted_iron` × `reeds` | 8 | **8** ✓ | 1 | **9／9**（0→9，max 3200） | 8 | 5.0（新-A1） | **5.0** ✓ | **✗ 不通过（dur 面，见 B-1）** |
| W-35d | `minecraft:iron_pickaxe` × `reeds` | 8 | **8** | 1 | **8／8**（0→8，max 9600） | 8 | 8.0 | **8.0** | **✓ 通过** |
| W-35e | `minecraft:iron_axe` × `reeds` | 0（形状②） | **0** | **1** | **0／0**（0→0，max 9600） | 0 | 无行 | **无行** | **✓ 通过** |
| W-35f | `etim:scythe_rusted_iron` × `reeds` | 0＋deny 分行 | **0**（decay 1 条）＋**deny 1 条** | 1｜1 | **0／0**（0→0，max 3200） | 0 | 无行 | **无行** | **✓ 通过** |
| W-35g | 空手 × `reeds` | 零 decay 行 | **无行** | 0 | 不适用（`held=- dur=-`） | — | 无行 | **无行** | **✓ 通过** |
| W-35i | `etim:scythe_rusted_iron` × `minecraft:tallgrass`（1） | 2 | **2** | 1 | **2／2**（0→2，max 3200） | 2 | 5.0 | **5.0** | **✓ 通过** |
| W-35j | `etim:sword_silver` × `reeds` 连破 ×2 | 16（合并 1 行） | **16** | **1**（两破合一行） | **32／32**（0→32，max 3200） | 32 | 3.5 | **3.5** | **✓ 通过** |
| W-35h | `etim:sword_copper` × `reeds`（reform **off**） | 无行 | **无行** | 0 | **0／0**（0→0，max 3200） | 0 | 无行 | **无行** | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样）：

| 判点 | 沙支撑／水盆在位 | 目标块落地 | 挖前在场 | dig-start／dig-stop | 挖后块消失 | 障碍行（reach/deny） |
| --- | --- | --- | --- | --- | --- | --- |
| W-35a | ✓ sand＋water | ✓ Block placed | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35b | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35c | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35d | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35e | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35f | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35g | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |
| W-35i | —（素土支撑） | ✓ | ✓ tallgrass | ✓／✓ | ✓ air | ✓ 无 |
| W-35j | ✓ 两次重摆 | ✓ ×2 | ✓ reeds ×2 | ✓／✓ ×2 | ✓ air ×2 | ✓ 无 |
| W-35h | ✓ | ✓ | ✓ reeds | ✓／✓ | ✓ air | ✓ 无 |

去重／分行面：

| 面 | 实测 | 结论 |
| --- | --- | --- |
| W-35f 两行分界 | deny 行 `grade=2 required=0 item=etim:scythe_rusted_iron block=reeds` 在先，decay 行 `loss=0` 在后，**各 1 条** | deny 与 decay 确为两行，未混为一条 |
| W-35j 去重 | 同键（银剑 × reeds）连破两次 ⇒ decay 行**仅 1 条**（loss=16），dur 连加至 32 | `ETIMMining.java:575-593` 的 last-sig 去重按 `face｜item｜block` 记值成立 |
| W-35i 回归 | 锈镰 × tallgrass `loss=2`＋`str=5.0`，与 W-32a 同值同判行 | 新表行未扰动既有植物行 |

耗时面（第二观察假人收到的 `block_break_animation` 进度计数；`j=(int)(f*10)`，逐 tick 变则发）：

| 判点 | 40 tick 持挖内进度 max（j） | 首包 → 首次 j≥10 | 实测耗时（≈tick） | 面 |
| --- | --- | --- | --- | --- |
| W-35a | 35 | 542 ms | ~11 t | 剑 × reeds（str 3.5） |
| W-35b | 25 | 798 ms | ~16 t | 火刀 × reeds（str 2.5） |
| W-35c | 50 | 399 ms | ~8 t | 锈剪 × reeds（str 5.0；终审 ◎ 6t→~9t 同带） |
| W-35d | 80 | 249 ms | ~5 t | vanilla 镐 × reeds（str 8.0） |
| W-35e | 10 | 1999 ms | ~40 t | vanilla 斧 × reeds（str 侧出局 ⇒ 回落空手带） |
| W-35f | 10 | 1999 ms | ~40 t | 锈镰 × reeds（deny 面同带） |
| W-35g | 10 | 1999 ms | ~40 t | 空手 × reeds（条 142「41t 量级」兑现） |
| W-35i | 126 | 99 ms | ~2 t | 锈镰 × tallgrass（str 5.0，硬度 0.02F） |
| W-35j | 35／35 | 549／550 ms | ~11 t ×2 | 银剑 × reeds（两破同带） |
| W-35h | 无进度包 | — | **瞬间**（+300 ms 探已 air） | off 相：原生硬度 0.0 直路 |

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\reeds-w35-a-server-latest.log`（A 相）、`…-g-server-latest.log`（G 相）；控制台全量：`…-a.out`／`…-g.out`；逐判点＋逐行＋进度序列：`…-evidence.json`。

### W-35a 铜剑 × 甘蔗（loss=16，dur 0→16）

```text
[18:34:46] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_copper block=reeds str=3.5 [server]
[18:34:46] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:sword_copper dur=0/3200 [server]
[18:34:48] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_copper block=reeds loss=16 [server]
[18:34:50] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:sword_copper dur=16/3200 [server]
```

### W-35b 火刀 × 甘蔗（loss=4，dur 0→4）

```text
[18:34:53] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:knife_flint block=reeds str=2.5 [server]
[18:34:55] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:knife_flint block=reeds loss=4 [server]
[18:34:57] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:knife_flint dur=4/400 [server]
```

### W-35c 锈剪 × 甘蔗（loss=8 ✓／str 5.0 ✓／dur 0→9 ✗）

```text
[18:35:00] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=reeds str=5.0 [server]
[18:35:00] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[18:35:02] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=reeds loss=8 [server]
[18:35:04] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:shears_rusted_iron dur=9/3200 [server]
```

（判行 `loss=8` 命中 max 出口；`str=5.0` 命中终审新-A1 修正值（7.0 未现）。**dur 面 9 ≠ 8**：根因见 B-1，+1 由 1.12 `ItemShears.onBlockDestroyed` 的无条件 `stack.damageItem(1, …)` 贡献，已由 off 相对照探针隔离直证。）

### W-35d vanilla 铁镐 × 甘蔗（loss=8，str=8.0）

```text
[18:35:07] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=minecraft:iron_pickaxe block=reeds str=8.0 [server]
[18:35:09] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=minecraft:iron_pickaxe block=reeds loss=8 [server]
[18:35:11] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=minecraft:iron_pickaxe dur=8/9600 [server]
```

（反向差②实证面：R196 镐材料表无 plants（`ItemPickaxe.java:6-31`），1.12 兜底只认 `ItemPickaxe`（`ETIMMining.java:477-489`）⇒ vanilla 镐在本服吃 reeds，`iron band 2.0` ⇒ str 8.0、decay 8。）

### W-35e vanilla 铁斧 × 甘蔗（形状②：恰 1 行 loss=0，dur 0）

```text
[18:35:17] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=minecraft:iron_axe block=reeds loss=0 [server]
[18:35:14] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=minecraft:iron_axe dur=0/9600 [server]
[18:35:19] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=minecraft:iron_axe dur=0/9600 [server]
```

（**警报线未触发**：判出 0 而非 8 ⇒ 反向差①（R196 `ItemAxe.java:9` 显式含 reed）未被误修。`mine speed` 行**不存在**：斧在 `isEffectiveAgainstBlock` 出局（`ETIMMining.java:477-489`，`getToolGrade` 对 axe 的 pickaxe 面返回 -1 ⇒ 连 deny 行也不发）⇒ str 回落 no-tool 1.0，破块耗时与空手同带（~40 t），**不是"破不掉"**。）

### W-35f 锈镰 × 甘蔗（deny 行 1 条 ＋ decay loss=0 行 1 条，分行）

```text
[18:35:22] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine deny grade=2 required=0 item=etim:scythe_rusted_iron block=reeds [server]
[18:35:24] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=reeds loss=0 [server]
[18:35:26] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:scythe_rusted_iron dur=0/3200 [server]
```

（`isScytheBlock` 的有效集 = tallGrass＋crops（`ETIMItemScythe.java:38-43`），reeds 不在集内 ⇒ deny 行（`ETIMMining.java:461-467`）；随后 str=0（≤1.0 门）⇒ decay 行 `loss=0`。两行面各自在案。）

### W-35g 空手 × 甘蔗（零 decay 行，非瞬间破）

```text
[18:35:29] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=- dur=- [server]
[18:35:35] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=- dur=- [server]
```

（窗内该点 `tool decay`／`mine speed`／`mine deny` 三类行 0 条；`/etest hold minecraft:air` 后主手空栈（`held=-`）⇒ `ETIMMining.java:259-260` 空栈早退 ⇒ 连 loss=0 行也不发。块仍被破（`testforblock … air` 命中），**非瞬间**：+300 ms 探仍在场，进度计数 1999 ms 才攒到 j=10 ⇒ ~40 t，与改前「硬度 0.0 一 tick 破」形成直接对照。）

### W-35i 锈镰 × 高草（回归：loss=2，str=5.0）

```text
[18:35:40] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:scythe_rusted_iron block=tallgrass str=5.0 [server]
[18:35:42] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=tallgrass loss=2 [server]
[18:35:44] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:scythe_rusted_iron dur=2/3200 [server]
```

（与 W-32a 同值同判行；fresh 键（块不同）确保未被 W-35f 吞行。）

### W-35j 银剑 × 甘蔗连破两次（合并 1 行 loss=16，dur 0→32）

```text
[18:35:47] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:sword_silver block=reeds str=3.5 [server]
[18:35:49] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:sword_silver block=reeds loss=16 [server]
[18:35:58] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35A#191 held=etim:sword_silver dur=32/3200 [server]
```

（两破之间**未换手**（同一栈），第二破无行、dur 再 +16 ⇒ 去重按值合并。**键纪律**：任务书写「同剑连破」，但铜剑 × reeds 的键已被 W-35a 占用（值同为 16）⇒ 按条 140 C-1 改用**未在本窗出现过**的银剑 × reeds，判值不变，见 C-2。）

### W-35h off 相：铜剑 × 甘蔗（0 行 ＋ dur 0 ＋ 瞬间破）

```text
[18:36:24] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35G#49 held=etim:sword_copper dur=0/3200 [server]
[18:36:29] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35G#49 held=etim:sword_copper dur=0/3200 [server]
```

（该点三类行 0 条；**瞬间破**：+300 ms 探已 air，进度包 0 个（1.12 原生 `getPlayerRelativeBlockHardness` 对 hardness 0 返回 1.0，`onBlockClicked` 当即 `tryHarvestBlock`）；dur 0 ⇒ vanilla 守卫读原生 0.0 不进 `damageItem`。三段与 W-34g-1 同形。）

### B-1 隔离探针：`miningReform=false` 下单破 reeds（锈剪）

```text
[18:38:54] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35P#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[18:38:58] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W35P#191 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（ETIM 衰减整段早退（`ETIMItemShearsRusted.java:117-119`）时仍 dur +1、decay 行 0 条、块已破 ⇒ **+1 属 vanilla `super` 的无条件伤害行，与 ETIM 衰减无关**；故 reform 开时总账 = 1 + 8 = 9。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条；B 级 **1** 条；C 级 7 条（均不改判点主判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| B-1 | **B｜产品面（裁后在办）** | **锈剪破方块 dur = R196 decay + 1**。`ETIMItemShearsRusted.onBlockDestroyed`（`ETIMItemShearsRusted.java:111-127`）先 `boolean vanilla = super.onBlockDestroyed(…)`，而 1.12 `ItemShears.onBlockDestroyed`（`ItemShears.java:24-28`）**无条件** `stack.damageItem(1, entityLiving)`，随后 ETIM 再叠 `getToolDecayFromBreakingBlock` 的 8 ⇒ 9。R196 侧 `ItemShears.java:37-38` 只有 `getBaseDecayRateForBreakingBlock=1.0F`（经 ItemTool 衰减链，**无额外 +1**）⇒ 判值 8。本窗实测：W-35c 0→9（判行 `loss=8` ✓）；off 相隔离探针 0→1 且 0 判行 → +1 已定因。**影响面**：本批主判据（loss 行）零影响；dur 面偏 +1；帽值（maxDamage 3200）不受影响；同类风险面 = 任何 `super` 内自带无条件 `damageItem` 而 ETIM 又做加法叠加的 override（现仅剪刀一件）。 | 交主会话裁：①改码（reform 开且玩家持械时不让 `super` 的 +1 落地，按 `IShearable`／材质特判后自走 ETIM decay；reform off 保持 vanilla 原样）；②或正式把剪刀 dur 判值改为 decay+1 并回填判值表。**本窗不擅改判据**（条 138 铁律 5：判负不改判据）。 |
| C-1 | C | **破坏进度通道口径**：1.12 `World.sendBlockBreakProgress` 只发给**非挖掘者** ⇒ 挖掘假人收不到自己的 `block_break_animation`；且载荷是 `(int)(f*10)` 的**累计**计数（f 越过 1.0 后继续增长、byte 面会回绕）。另：40 tick 持挖内 vanilla `isDestroyingBlock` 分支只发进度、不自行收尾，**破块由 STOP 包收尾** | 本窗起用**第二观察假人**（`ETIM_W35OBS`，立于 z+2 列）收包；「瞬间 vs 渐进」用「+300 ms 探仍在场」二分，耗时用「首包→首次 j≥10」墙钟折算 tick。后续挖掘类窗口沿用 |
| C-2 | C | **任务书键面微调（判值不变）**：W-35j 原写「同剑连破 reeds」，若用铜剑则与 W-35a 同键同值（16）⇒ 第二破（乃至第一破）会被 last-sig 去重吞成 0 行。按条 140 C-1 改银剑 × reeds（fresh 键），判行 `loss=16` 与 dur Δ=32 全中 | 工装纪律；已写入驱动注释与回执 |
| C-3 | C | **甘蔗摆场面**：1.12 `BlockReed.canPlaceBlockAt`（`BlockReed.java:76-112`）要求下格为沙/土/草且**该下格水平四邻有水**；本窗用「沙支撑 + 石圈封闭的 1 格水盆」，水不流泻（否则 `insideOfMaterial(WATER)` 会触发 str÷5 环境罚污染判值） | 工装纪律；摆场 10 步序列与 `testforblock water` 复核已固化进驱动 |
| C-4 | C | **空手 probe 行形**：空栈是 `held=- dur=-`（**无 `/max` 后缀**），满栈才 `dur=x/max` | 工装正则须容错；已修入驱动（首次冒烟曾因恒不匹配报 FATAL） |
| C-5 | C | **vanilla 斧在 reeds 上的真实形状**：不是「破不掉」，而是有效性门出局后 **str 回落 no-tool 1.0**（进度 1999 ms/40 t，与空手同斜率）；判行仍 `loss=0` 一行、dur 0、无 speed 行（`getToolGrade` 对 axe 的 pickaxe 面 = -1 ⇒ 连 deny 行也不发） | 记录给「补斧」候选批：反向差①兑现后本点期望将翻转为 `loss=8`，届时需换 fresh 键重判 |
| C-6 | C | **`mine speed` 行门**：只在 `useTool && !held.isEmpty()` 且 str≥1.0 的分支发（`ETIMMining.java:205-209`）⇒ str=0 面（axe／scythe-reeds／空手）**无该行**，不能拿「无 speed 行」当「无 decay 行」的替代判据 | 判读口径；本窗逐点分别判 speed 行与 decay 行 |
| C-7 | C | **deny 行去重面**：`logGradeDeny` 按 `item@block` ＋ `grade/required` 签名（`ETIMMining.java:537-552`）⇒ 同键同签名连击只 1 条 | 本窗 W-35f 判「deny 1 条」，与去重语义自洽 |

## 4. 结论

**判点 9/10 通过（a／b／d／e／f／g／h／i／j）；W-35c 的 loss 与 str 两为 ✓、dur 面 ✗（B-1）。驱动总判 FAIL（唯一失败面 = W-35c dur）。**

- **A-4 表行兑现成立**：`ETIMMining.java:139` 的 `put("reeds", 0.08F, 0)` 在四类工具面全部命中 max 出口 —— 剑 16／剪 8／镐 8／火刀 4，dur 与判行同值（剪刀除 B-1 的 +1 残留）。改前 1.12 `BlockReed` 字段 0.0（零磨零行）的旧形状在 A 相已不存在。
- **校准翻转面互证**：同为 `etim:sword_copper`，tallgrass 判 10（W-34a）／reeds 判 16（W-35a）⇒ 表行按块取值、非一刀切；`str` 两侧同为 3.5，说明差异只来自硬度面。
- **反向差①②双证**：②（R196 镐无 plants 而本服兜底认镐）在 W-35d 实测 `loss=8 / str=8.0`；①（R196 斧有 reed 而本服斧出局）在 W-35e 实测 `loss=0` 一行 ＋ str 回落 1.0（**警报线未触发**）。两条差向都按摸底/终审预期落形。
- **deny／decay 分行与去重**：W-35f 两行各自在案；W-35j 同键两破只 1 行、dur 连加 32。
- **off 相零扰动**：W-35h 三类行 0 条、dur 0、瞬间破 ⇒ 新表行不越过 `miningReform` 门控（`MixinBlock.java:36`／`MixinItemSword.java:90`）。
- **产品面**：本批零改码、零 rebuild（两相 `:jar UP-TO-DATE`）；唯一产品侧发现为**既有** B-1（剪刀 +1，非本批引入，B3 窗曾以「vanilla ItemShears 路径 +1」登记过现象但未按 R196 判值处置）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 两相 `Done (5.718s／1.132s)` → stdin `stop` → `BUILD SUCCESSFUL`、退出码 0（A／G） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内两次键值改：`blockDebugLog=false→true`、`miningReform=true→false`；隔离探针另一相再改两键，均整档还原；未换锚） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=reeds35`／`reeds35probe`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical（两假人登录改写已还原） |
| 世界 | 新世界 `reeds35`（两相复用）＋ 探针 `reeds35probe`；收口两目录均删 |
| 端口／崩溃 | 25565 收口 0 LISTEN；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W35A`／`ETIM_W35G`／观察位 `ETIM_W35OBS`／探针 `ETIM_W35P`） |
| 钉值复核 | dev／release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `…-a.out`／`…-g.out`（全量控制台）、`…-a-server-latest.log`／`…-g-server-latest.log`（服务端日志）、`…-evidence.json`（逐判点＋逐行＋耐久读写＋进度序列＋观察位坐标）、`…-etim.cfg.before`／`…-server.properties.before`／`…-{ops,usercache,usernamecache}.json.before`；排障链 `…-smoke`（首轮：空手正则 FATAL）／`…-smoke2`（无观察位，进度包缺）／`…-smoke3`（全 A 相旧口径留档）；B-1 隔离探针 `reeds-w35-probe-*` |
| 驱动 | `testharness\player\reeds-w35.js`（两相 A／G；`W35_ONLY`／`W35_SKIP_G` 仅冒烟用）；探针 `reeds-w35-probe.js` |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `934a40e` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\reeds-w35.js`
- `testharness\player\reeds-w35-probe.js`
- `testharness\reports\reeds-W35-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **B-1 处置**：锈剪 `super` 的 +1 是「改码对齐 R196（dur 面 = decay）」还是「正式改判值为 decay+1 并存档」？——若要改码，本窗驱动可直接复跑（W-35c 期望值不必改，改后应为 8）。
2. **C-1 进度通道是否固化**：是否把「第二观察假人 + 首包→j≥10 折算 tick」写进挖掘类判窗通用工装（`/etest dig` 的 STOP 收尾语义亦建议在任务书模板中注明）。
3. **C-5 交补斧候选批**：反向差①兑现后 W-35e 期望翻转为 `loss=8`，且需换 fresh 键（axe × reeds 届时已变值，仍可复用键但值不同 ⇒ 去重不吞，用例须重写期望）。
