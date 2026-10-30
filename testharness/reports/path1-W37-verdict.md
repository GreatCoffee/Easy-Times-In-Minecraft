# 路径①收敛批（shearpath1 · IShearable 剪 vanilla +1 → R196 decay-only）· W-37a…j 判决回执

> **报告字节规格**：`23,272 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 79 / ✗ 2｜241 行`
> 执行方：会话七（自动化验证窗执行方）｜判窗：2026-10-30 21:15:09–21:17:10（服务器本地时；驱动 UTC 13:14–13:17）｜tag `path1-w37`
> 判决源：服务端 `[MiningLog] tool decay … loss=`（判行）／`[BlockLog] probe … dur=x/max`（耐久旁证）／假人 NBT 双路；`[MiningLog] mine speed … str=` 为**记录面**（条 149 C-1：只记不判）；进度面 = 第二观察假人 `block_break_animation` ＋ `testforblock … air` 轮询
> 审判权威：条 150（路径①立项摸底 8 面 + D-1…D-5）／条 151（终审 T-1…T-9 判值零改动，j' 勘正形 = `isShearable=false` 走主链**有行** `loss=5`）＋ 主会话 W-37 判窗任务书
> 判值纪律（条 138 勘-1 / 条 150 M-3 / 条 151 T-9）：全表只写 **max 出口值** —— leaves 20／vine 20／web 10／deadbush 5／tallgrass 5／double_plant 5／reeds 8；vanilla 剪与 off 相 = 0 行 + dur 1。**未手算任何乘性中间项**。
> 计数注记：正文 ✓ 含各判点结论格与附着判据格；✗ 仅自指 2 处（规格行内计数位 ＋ 本注记），**判点表内无失败叉号**（10/10 通过）。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `3bef3f6`（`MixinItemShears` 第二 `@Redirect` 落码；上一环 `82ec7c7`） | ✓ 起窗/收口同值；工作树 dirty 0（仅新增 harness 驱动） |
| dev jar | 755,161 B｜`2B8FDFE4DBE3F2820525E5FAB38184B626CD8BFEF98689318298A92DF2A1EF75` | ✓ 逐位命中（起/收同值） |
| release jar | 770,940 B｜`98BAEF770AA4B57B23F7A55B6A8D63EE13EA82569531129B0CB370E6AC49E471` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical = 钉值（本批零新键）** |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=path137`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`(550 B)／`usercache.json`(1,523 B)／`usernamecache.json`(796 B) | ✓ 起收 byte-identical（三假人登录改写已还原） |
| MK 面 | mixins **56**／client **10**；refmap 双树 sync **62 类键／137 条目** | ✓ 起窗前直读同值（第二 `@Redirect` 复用现描述符零增，条 151 主预言收位） |
| 附属 jar | 不在场（本批不带 etimextra） | ✓ 三相 FML 清单 16 mods 无 etimextra（`etimExtrasOffGate SKIPPED`） |
| 世界 | `level-name=test27dev` → 窗内新世界 `path137` → 收口还原 | ✓ 三相 `Preparing level "path137"`；世界目录收口删除 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（三相各一次） | ✓ **0 rebuild** |
| mixin 加载 | `Mixin apply failed`／`MixinException`／`InvalidInjectionException` 三型 | ✓ 三相全 0（`require = 1` 命中，无 boot 期异常） |
| 环境前置 | 25565 = 0 LISTEN、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |

三相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 | 停服 |
| --- | --- | --- | --- | --- |
| A1 | `miningReform=true`（＋`blockDebugLog=true` 取 probe 面） | W-37a／b／c／d／e／f／g／i | `Done (5.702s)` | `BUILD SUCCESSFUL in 1m 14s`／exit 0 |
| A2 | 同上（**第二 boot**，解 dedupe 键，见 C-4） | W-37j | `Done (1.075s)` | `BUILD SUCCESSFUL in 28s`／exit 0 |
| G | `miningReform=false` | W-37h | `Done (1.077s)` | `BUILD SUCCESSFUL in 28s`／exit 0 |

卫生面（判值前置钉死，实测在案）：`gamemode 0`（禁创造）｜`etest level 0`（xp=0）｜`etest food 6 6`（饱食满）｜`tp` 后 grounded=true（三相）｜观察假人落位 ok=true（三相）｜判点工具裸栈（无耐久·效率附魔）｜`difficulty 0`＋`randomTickSpeed 0`＋`doTileDrops false`｜逐点 fresh `item×block` 键（条 140 C-1）。

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh `item×block` 键的挖块；判 **判行 loss 定值** ＋ **判行条数（1 条）** ＋ **durΔ** ＋ **块消失**；`mine speed` 只记录。

| 判点 | 工具 × 方块（meta／行） | 期望 loss | 实测判行 loss | 条数 | durΔ（probe／NBT，max） | 期望 durΔ | 实测 str（记录面） | 破块（START→air 轮询确认） | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-37a | `etim:shears_rusted_iron` × `leaves`(0) | 20 | **20** | 1 | **20／20**（0→20，max 3200） | **20**（改前为 1） | 5.0 | 2,812 ms（含 40 t DIG_HOLD） | **✓ 通过** |
| W-37b | `etim:shears_rusted_iron` × `vine`(2) | 20 | **20** | 1 | **20／20**（0→20，max 3200） | 20 | 5.0 | 2,799 ms | **✓ 通过** |
| W-37c | `etim:shears_rusted_iron` × `web`(0) | 10 | **10** | 1 | **10／10**（0→10，max 3200） | 10 | 5.0 | 2,800 ms | **✓ 通过** |
| W-37d | `etim:shears_rusted_iron` × `deadbush`(0) | 5 | **5** | 1 | **5／5**（0→5，max 3200） | 5 | 5.0 | 2,805 ms | **✓ 通过** |
| W-37e | `etim:shears_rusted_iron` × `tallgrass`(1) | 5 | **5** | 1 | **5／5**（0→5，max 3200） | 5 | 5.0 | 2,792 ms | **✓ 通过** |
| W-37f | `etim:shears_rusted_iron` × `double_plant`(2＝lower/GRASS) | 5（◎现场定） | **5** | 1 | **5／5**（0→5，max 3200） | 5 | 5.0 | 2,796 ms | **✓ 通过** |
| W-37g | `minecraft:shears` × `leaves`(0) | 零行 | **无 decay 行** | 0 | **1／1**（0→1，max 238） | 1 | 无行（见 C-3） | 5,302 ms（≈102 t，见 C-3） | **✓ 通过** |
| W-37i | `etim:shears_rusted_iron` × `reeds`(0) | 8 | **8** | 1 | **8／8**（0→8，max 3200） | 8 | 5.0 | 2,787 ms | **✓ 通过** |
| W-37j | `etim:shears_rusted_iron` × `double_plant`(10＝upper) | 5（勘正主判） | **5** | 1 | **5／5**（0→5，max 3200） | 5 | 5.0 | 2,792 ms | **✓ 通过** |
| W-37h | `etim:shears_rusted_iron` × `leaves`(0)（reform **off**） | 零行 | **无 decay 行** | 0 | **1／1**（0→1，max 3200） | 1 | 无行 | 2,800 ms（瞬间，见 C-2） | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样）：

| 判点 | 摆场 | 目标块落地 | 挖前在场 | 附属面 | dig-start／dig-stop | 挖后 air | 判行条数（phase 全量复核） |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-37a | 素土支撑 | ✓ | ✓ leaves | — | ✓／✓ | ✓ | 1（a1 全相 decay=7，见下） |
| W-37b | 石柱附着（meta 2＝WEST，x-1 石柱） | ✓ | ✓ vine | ✓ 石柱在 | ✓／✓ | ✓ | 同上 |
| W-37c | 素土支撑 | ✓ | ✓ web | — | ✓／✓ | ✓ | 同上 |
| W-37d | **沙底** | ✓ | ✓ deadbush | — | ✓／✓ | ✓ | 同上 |
| W-37e | 素土支撑 | ✓ | ✓ tallgrass(1) | — | ✓／✓ | ✓ | 同上 |
| W-37f | 双联（lower 2 ＋ upper 10） | ✓ | ✓ lower | ✓ upper 在 | ✓／✓ | ✓ | 同上 |
| W-37g | 素土支撑 | ✓ | ✓ leaves | — | ✓／✓ | ✓ | 0（全相 decay 7 不含本点） |
| W-37i | sand＋石圈水盆 | ✓ | ✓ reeds | ✓ 水盆水在 | ✓／✓ | ✓ | 同上 |
| W-37j | 双联（判点取 upper 10） | ✓ | ✓ upper | ✓ lower 在 | ✓／✓ | ✓ | 1（a2 全相 decay=1） |
| W-37h | 素土支撑 | ✓ | ✓ leaves | — | ✓／✓ | ✓ | 0（G 相 decay=0） |

全相判行计数（`-server-latest.log` 直数）：A1 `decay=7／speed=7／deny=0`；A2 `decay=1／speed=1／deny=0`；G `decay=0／speed=0／deny=0`。**`mine deny` 全窗 0 条**（六类块均过 gate①②③④）。

进度面（第二观察假人；载荷 `(int)(f*10)`，byte 面回绕已解）：

| 判点 | 进度包数 | 首包→首次 j≥10 | 实测（≈tick） | 面 |
| --- | --- | --- | --- | --- |
| W-37a | 21 | 991 ms | ~20 t | leaves 0.2 × str 5.0 |
| W-37b | 21 | 1,000 ms | ~20 t | vine 0.2 |
| W-37c | 41 | 498 ms | ~10 t | web 0.1（表行接管） |
| W-37d | 26 | 99 ms | ~2 t | deadbush 0.02 |
| W-37e | 26 | 99 ms | ~2 t | tallgrass 0.02 |
| W-37f | 26 | 98 ms | ~2 t | double_plant 0.02（lower ①面） |
| W-37g | 11 | 5,099 ms | ~102 t | vanilla 剪 str 回落 1.0（见 C-3） |
| W-37i | 41 | 400 ms | ~8 t | reeds 0.08 |
| W-37j | 26 | 93 ms | ~2 t | double_plant 0.02（upper 主链） |
| W-37h | 0 | — | 瞬间（START 即破，见 C-2） | off 相 vanilla 进度式 |

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\path1-w37-a1-server-latest.log`（525,996 B）／`…-a2-server-latest.log`（90,578 B）／`…-g-server-latest.log`（80,485 B）；控制台全量：`…-a1.out`／`…-a2.out`／`…-g.out`；逐判点＋逐行＋耐久读写＋进度序列：`…-evidence.json`。

### W-37a 锈剪 × 树叶（本批主证：loss=20，dur 0→**20**）

```text
[21:15:26] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[21:15:28] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=leaves str=5.0 [server]
[21:15:29] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=leaves loss=20 [server]
[21:15:30] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=20/3200 [server]
```

（**量级跳变直证**：同形在 W-36c 实测 dur 0→1 且零 decay 行；本条 0→20 且判行 `loss=20` ⇒ `onBlockStartBreak` `:108` 的 vanilla +1 已被第二 `@Redirect` 换成 funnel 算式，行由 `ETIMMining:268` 唯一发行。条 151 T-1 判值 20 逐位命中。）

### W-37b 锈剪 × 藤蔓（loss=20）

```text
[21:15:33] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=vine str=5.0 [server]
[21:15:35] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=vine loss=20 [server]
[21:15:36] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=20/3200 [server]
```

（摆场：meta 2＝`WEST=true` ⇔ 附着于 x-1 石柱；`isShearable` 恒真（`block\BlockVine.java:529`）⇒ ①面。发育进度 20 t 与 leaves 同档（硬度同为 0.2）。）

### W-37c 锈剪 × 蛛网（loss=10，表行接管实证）

```text
[21:15:38] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=web str=5.0 [server]
[21:15:40] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=web loss=10 [server]
[21:15:41] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=10/3200 [server]
```

（1.12 原生 web 硬度 4.0（`block\Block.java:2726`）若生效则出口为 400；实测 10 ⇒ `ETIMMining.java:86` 的 0.1 表行在判点路径上**直接接管**，耗时 10 t（≈0.1 硬度档）双向自洽。）

### W-37d 锈剪 × 枯灌木（loss=5，沙底）

```text
[21:15:43] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=deadbush str=5.0 [server]
[21:15:45] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=deadbush loss=5 [server]
[21:15:46] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=5/3200 [server]
```

（表行 0.02（`ETIMMining.java:138`）⇒ 硬度项 1 被 floor `(int)(100/20)=5` 反超 ⇒ 出口 5；沙底满足 `BlockDeadBush` 附着。）

### W-37e 锈剪 × 高草 meta 1（loss=5）

```text
[21:15:49] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=tallgrass str=5.0 [server]
[21:15:51] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=tallgrass loss=5 [server]
[21:15:52] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=5/3200 [server]
```

（meta 1＝GRASS 型，避开 meta 0 的枯灌木形态歧义。）

### W-37f 锈剪 × 双联高草 lower/GRASS（loss=5，◎ 格现场定）

```text
[21:15:54] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=double_plant str=5.0 [server]
[21:15:56] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=double_plant loss=5 [server]
[21:15:57] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=5/3200 [server]
```

（`isShearable` 条件真（`block\BlockDoublePlant.java:336-341`：`HALF=LOWER` 且 `VARIANT∈{FERN,GRASS}`）⇒ ①面；实测 5 与条 150 M-3 的 ◎ 推导值一致（R196 无该方块，取 tallgrass 同档）。）

### W-37g vanilla 剪 × 树叶（零扰面：0 行 + dur 0→1）

```text
[21:15:58] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=minecraft:shears dur=0/238 [server]
[21:16:05] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=minecraft:shears dur=1/238 [server]
```

（vanilla 剪不满足 `instanceof ETIMItemShearsRusted` ⇒ handler 否则支原调 `damageItem(1)` ⇒ dur +1、ETIM 三面全 0；`mine speed` 亦无行，见 C-3。）

### W-37i 锈剪 × 甘蔗（回归：loss=8，dur 0→8）

```text
[21:16:08] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=reeds str=5.0 [server]
[21:16:10] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=reeds loss=8 [server]
[21:16:11] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A1#191 held=etim:shears_rusted_iron dur=8/3200 [server]
```

（与 W-36a 同值同形：reeds 非 IShearable ⇒ 走 `onBlockDestroyed` 主链＋第一 redirect；第二 redirect **不扰**该路径。）

### W-37j 锈剪 × 双联高草 **upper**（`isShearable=false` 勘正主判：loss=5）

```text
[21:16:37] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=double_plant str=5.0 [server]
[21:16:39] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=double_plant loss=5 [server]
[21:16:40] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37A2#56 held=etim:shears_rusted_iron dur=5/3200 [server]
```

（上半株 `HALF=UPPER` ⇒ `isShearable` 假 ⇒ `onBlockStartBreak` 在 `:114 return false`（不触 `:108`）⇒ 主链 `PlayerInteractionManager.tryHarvestBlock:346` 进 `onBlockDestroyed` ⇒ `ETIMItemShearsRusted:121` 调 funnel ⇒ 建行 `loss=5` + `damageItem(5)`。**终审 T-9 勘正形兑现**：判出「0 行」才是对勘正回拒，本窗未出现。本点单独第二 boot 系 dedupe 解耦所需（见 C-4）。）

### W-37h off 相（miningReform=false）：锈剪 × 树叶（0 行 + dur 0→1）

```text
[21:17:05] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37G#21 held=etim:shears_rusted_iron dur=0/3200 [server]
[21:17:09] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W37G#21 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（`!miningReform` ⇒ handler 首支原调 `damageItem(1)` 落地，ETIM 三面全 0；与 on 相仅差这一刀，与 handler 三支树完全吻合。破块为 START 即完成（见 C-2）。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条、B 级 **0** 条；C 级 6 条（均不改判点判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **probe 通道伴行行**：`blockDebugLog=true` 下每次 `/etest blockprobe` 另发一条 `[BlockLog] probe player=… cfg blockModel=true factor=0.500 min=1.000 shieldRateBase=2.500 woodReduction=0.500`（无 `held=`／`dur=`）。判行正则均以 `held=` 锚定，故不污染判值；但逐行计数面会翻倍（例：A1 共 34 条 probe 行＝17 条 dur 面 ＋ 17 条 cfg 面）。 | 工装口径；后续 probe 类判点按 `held=` 过滤即可，不改判据。 |
| C-2 | C | **off 相的破块是「瞬间」而非「渐进」**：`miningReform=false` 时进度走 vanilla 式（剪对树叶 `getDestroySpeed` 高），`f≥1.0` 在 START 即成立 ⇒ +300 ms 早探已 air、进度包 0 条。W-36e（off 相 × 羊毛）的「渐进」不能平移到树叶面。 | 记录面；W-37h 判据（0 行 + dur 1）不受影响。 |
| C-3 | C | **W-37g vanilla 剪 × 树叶 = 102 t（≈5.1 s）**：vanilla `ItemShears extends Item`（非 ItemTool）⇒ ETIM 有效性门 false ⇒ str 回落 1.0（`ETIMMining.java:261`），故比改前更慢；`mine speed` 亦因 str 门未过而 0 行（W-36 C-1 的记录面在此点为**无行**）。 | 既有载体面（非本批回归、非判点）；W-37g 只判「0 行 + dur 1」。 |
| C-4 | C | **decay 行的 last-sig 去重会吞同 key 同值行**：`logToolDecay` 键 = `face\|item\|block`（`ETIMMining.java:590-601`），值同则抑制。W-37f 与 W-37j 同为 `breaking\|etim:shears_rusted_iron\|double_plant` 且 loss 同为 5 ⇒ 同 JVM 内第二行必被吞。本窗以 **A2 第二 boot** 解耦。 | harness 纪律（已入驱动注释）：后续凡「同 item × 同 block × 同 loss」多点必换 boot 或换单元块。 |
| C-5 | C | **①面剪 lower 半株会留下 upper 浮株**：`ItemShears.onBlockStartBreak:110` 只对判点格 `setBlockState(AIR,11)`，`onBlockHarvested`／`removedByPlayer` 未被调用 ⇒ 上半株不被联动清除（vanilla 手破 lower 会联动）。 | 掉落/联动面非本批判值；登记给后续「①面掉落表」批（条 150 B-2）。 |
| C-6 | C | **进度包规模随硬度分档**（记录面）：leaves/vine 21 包、web/reeds 41 包、deadbush/tallgrass/double_plant 26 包、vanilla 剪 11 包、off 相 0 包。载荷 `(int)(f*10)` 在 f>1 时溢出回绕（例 126），解包已按 byte 差分处理。 | 判读口径；不作判据。 |

## 4. 结论

**判点 10/10 全通过（W-37a／b／c／d／e／f／g／h／i／j），驱动总判 PASS（`evidence.json.verdict=PASS`）。**

- **路径① R196 化兑现（本批主目标）**：锈剪 × 六类 IShearable 块的磨损由 vanilla 恒 +1 改为 funnel 算式 —— leaves **20**／vine **20**／web **10**／deadbush **5**／tallgrass **5**／double_plant(lower) **5**，且每点恰 1 条 `tool decay` 判行（`ETIMMining:268` 唯一发行点，handler 侧无重复打行）⇒ 条 150 M-3 与条 151 T-1 判值逐位命中。
- **量级跳变直证**：W-36c 的 `dur 0→1 + 零行` → 本窗 W-37a 的 `dur 0→20 + loss=20`（3200 耐久下树叶可剪 160 块 vs 改前 3200 块），即摸底 A-2 的量级面已在窗内如实落地。
- **勘正形兑现**：W-37j（upper half，`isShearable=false`）走主链 `onBlockDestroyed` 仍有行 `loss=5`、dur 5 —— 条 151 T-9 的「不走①面但仍有行」被实证，判出 0 行的回拒形未出现。
- **零扰与回归**：vanilla 剪 × leaves 仍 0 行 + dur 1；off 相仍 0 行 + dur 1；锈剪 × reeds 仍 `loss=8／dur 8`（W-36a 同值）⇒ 第二 `@Redirect` 的否则支、`!miningReform` 支与 `onBlockDestroyed` 主链三面互不串门。
- **MK/cfg 预言收位**：refmap 双树 62/137 未变（第二 `@Redirect` 复用现描述符）；mixin 56／client 10 未变；cfg 起收 byte-identical（零新键）；jar 770,940 B（相对 `82ec7c7` 的 770,638 B 增 302 B，落在摸底「+400…700 B」带的下沿附近）。
- **产品面**：三相 `:jar UP-TO-DATE`，0 rebuild，判窗内产品码 0 改动。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 三相 `Done (5.702s／1.075s／1.077s)` → stdin `stop` → `BUILD SUCCESSFUL`（1m 14s／28s／28s）、退出码 0（三相同值 `{exitCode:0, exited:true}`） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内两处键值改：`blockDebugLog=false→true`、`miningReform=true→false`，收口整档还原） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=path137`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical |
| 世界 | 新世界 `path137`（三相复用）；收口删除目录（`worldDirRemoved=true`） |
| 端口／崩溃 | 25565 收口 0 LISTEN；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W37A1`／`ETIM_W37A2`／`ETIM_W37G` ＋ 观察位 `ETIM_W37OBS1/2/3`） |
| 钉值复核 | dev／release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `path1-w37-a1.out`／`-a2.out`／`-g.out`（控制台全量）、`…-a1-server-latest.log`（525,996 B）／`…-a2-server-latest.log`（90,578 B）／`…-g-server-latest.log`（80,485 B）、`…-evidence.json`（逐判点＋逐行＋耐久读写＋进度序列＋观察位＋块消失时刻）、`…-etim.cfg.before`／`…-server.properties.before`／`…-{ops,usercache,usernamecache}.json.before`；冒烟 `path1-w37-smk-*`（vine／web／double 摆场首验，3/3 PASS） |
| 驱动 | `testharness\player\path1-w37.js`（三相 A1／A2／G；`W37_ONLY`／`W37_PHASES` 仅冒烟用） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `3bef3f6` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\path1-w37.js`
- `testharness\reports\path1-W37-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **C-4 工装纪律固化**：`logToolDecay` 的 last-sig 去重（`ETIMMining.java:590-601`）会吞「同 item × 同 block × 同 loss」的第二点行——是否把「同键同值多点必换 boot」写入挖掘类工装模板（本次以 A2 第二 boot 解耦，代价 ≈28 s）。
2. **C-1 probe 伴行行**：`blockDebugLog=true` 的 `cfg blockModel=…` 伴行是否需要在 probe 输出上加 `held=` 前缀收窄（或维持现状、判点正则一律 `held=` 锚定）。
3. **C-5 联动缺失**：①面剪 lower 半株不联动清除 upper（`onBlockStartBreak:110` 只抹判点格）——是否并入后续「①面掉落表／双联体」批一并处置。
4. **A-2 量级面确认**：本窗已按「全量落地」实测（leaves 20），如主会话改判为分档/折减，需另立判值表并新开窗口（当前零新键、cfg 未换锚）。
