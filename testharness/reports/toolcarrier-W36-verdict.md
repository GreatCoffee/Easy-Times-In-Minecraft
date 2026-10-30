# 工具载体收敛批（toolcarrier · B-1 剪刀 +1 ＋ C-5 补斧）· W-36a…j 判决回执

> **报告字节规格**：`22,902 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 74 / ✗ 1｜236 行`
> 执行方：会话七（自动化测试执行方）｜判窗：2026-10-30 20:13:16–20:15:26（服务器本地时；驱动 UTC 12:13–12:15）｜tag `toolcarrier-w36`
> 判决源：判据吃服务端 `[MiningLog] tool decay … loss=`／`[MiningLog] mine speed … str=`／`[MiningLog] mine deny …` 三类行；旁证 = 同栈耐久回读（`[BlockLog] probe … dur=x/max` ＋ 假人 NBT 双路）＋ 客户端破坏进度计数（第二观察假人）＋ 块消失时刻轮询
> 审判权威：audit20 条 146（立项 + 抽核 + D-1…D-5 全裁 + grade 修法）／条 147（终审放行 T-1…T-9，判值零改动）／条 148（落码三件 + MK 收窗钉）＋ 主会话 W-36 判窗任务书
> 判值纪律（条 138 勘-1 / 条 147 T-1·T-4）：全表只写 max 出口值 —— wool 80／carpet 10／reeds 8／sapling 5／tripwire 0／battle_axe 10／hatchet 10／sandstone 150；**未手算任何乘性中间项**。
> 计数注记：正文失败叉号仅表头自指 1 处（判点表内无失败叉号）；通过叉号 74 处 = 各判点结论单元格 ＋ 附着判据表逐格。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `854f027`（B-1 @Redirect + C-5 axeFace 落码） | ✓ 起窗/收口同值；上一环 `046672b`；工作树 dirty 0 起窗 |
| dev jar | 754,883 B｜`1EBE9061510D2DB75D134E722A2854F1BBE004AF53CC4D9F2C6F9FB1CFE0CA1F` | ✓ 逐位命中（起/收同值） |
| release jar | 770,638 B｜`B844CC85D55FCC57C194F908AA278D17E88EE4D87FF60D319A2ED4BF85CC2D28` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical（= 钉值，零新键未换锚）** |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=toolcarrier36`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` | ✓ 起收 byte-identical（两假人登录改写已还原） |
| 附属 jar | 不在场（本批不带 etimextra） | ✓ 两相 FML 清单 16 mods 无 etimextra |
| 世界 | `level-name=test27dev` → 窗内新世界 `toolcarrier36` → 收口还原 | ✓ 两相 `Preparing level "toolcarrier36"`；世界目录收口删除 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（两相各一次） | ✓ 0 rebuild |
| mixin 面 | 新件 `MixinItemShears` 的加载面 | ✓ 两相 `Mixin apply failed`／`MixinException`／`InvalidInjectionException` 三型全 0 |
| 环境前置 | 25565 = 0 LISTEN、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |

两相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 |
| --- | --- | --- | --- |
| A | `miningReform=true`（＋`blockDebugLog=true` 取 probe 面） | W-36a / b / c / d / f / g / h / i / j | `Done (5.634s)` |
| G | `miningReform=false` | W-36e | `Done (1.046s)` |

卫生面（判值前置钉死，实测在案）：`gamemode 0`（禁创造）｜`etest level 0`（xp=0）｜`etest food 6 6`（饱食满）｜`tp` 后 grounded=true｜判点工具裸栈（无耐久·效率附魔）｜水盆石圈封闭（离玩家 ≥1 格）｜`difficulty 0`＋`randomTickSpeed 0`＋`doTileDrops false`（本批不涉敌对实体，条 141 不触发）。

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh `item×block` 键的挖块（条 140 C-1）；判 **判行 loss 定值** ＋ **判行条数** ＋ **dur Δ** ＋ **块消失/耗时面**；`mine speed`／`mine deny` 为旁证面。

| 判点 | 工具 × 方块 | 期望 loss | 实测判行 loss | 条数 | dur Δ（probe／NBT） | 期望 durΔ | 期望 str | 实测 str | 破块（START→消失） | 结论 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-36a | `etim:shears_rusted_iron` × `reeds` | 8 | **8** | 1 | **8／8**（0→8，max 3200） | **8**（B-1 改后首证） | 5.0 | **5.0** | 2,803 ms（≈8 t 自然完成） | **✓ 通过** |
| W-36b | `etim:shears_rusted_iron` × `wool` | 80 | **80** | 1 | **80／80**（0→80，max 3200） | 80 | 5.0 | **5.0** | 4,298 ms（≈81 t） | **✓ 通过** |
| W-36c | `etim:shears_rusted_iron` × `leaves` | 零行 | **无 decay 行** | 0 | **1／1**（0→1）**现场定** | 现场定 | 记录面 | speed 行 `str=5.0`（见 C-1） | 2,790 ms（≈20 t） | **✓ 通过** |
| W-36d | `etim:shears_rusted_iron` × `tripwire` | 0（建行） | **0** | 1 | **0／0**（0→0，max 3200） | 0 | 无行 | **无行** | 瞬间（+300 ms 已 air，0 进度包） | **✓ 通过** |
| W-36f | `minecraft:shears` × `wool` | 零行 | **无行** | 0 | **1／1**（0→1，max 238） | 1 | 无行 | **无行** | 20,903 ms（≈409 t，见 C-4） | **✓ 通过** |
| W-36g | `etim:axe_copper` × `reeds` | 8 | **8** | 1 | **8／8**（0→8，max 4800） | 8 | 7.0 | **7.0** | 2,793 ms（≈5 t） | **✓ 通过** |
| W-36h | `minecraft:iron_axe` × `reeds` | 8（翻转线） | **8** | 1 | **8／8**（0→8，max 9600） | 8 | 8.0 | **8.0** | 2,806 ms（≈5 t） | **✓ 通过** |
| W-36i | `etim:axe_copper` × `sandstone` | 150 | **150** | 1 | **150／150**（0→150，max 4800） | 150 | 3.5 | **3.5** | 6,301 ms（≈117 t） | **✓ 通过** |
| W-36j | `etim:scythe_rusted_iron` × `tallgrass`(1) | 2 | **2** | 1 | **2／2**（0→2，max 3200） | 2 | 5.0 | **5.0** | 2,797 ms（≈2 t） | **✓ 通过** |
| W-36e | `etim:shears_rusted_iron` × `wool`（reform **off**） | 零行 | **无行** | 0 | **1／1**（0→1，max 3200） | 1 | 无行 | **无行** | 2,810 ms（≈4 t 进度） | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样）：

| 判点 | 摆场 | 目标块落地 | 挖前在场 | dig-start／dig-stop | 挖后 air | 障碍行 |
| --- | --- | --- | --- | --- | --- | --- |
| W-36a | sand＋石圈水盆 | ✓ | ✓ reeds | ✓／✓ | ✓（轮询确认） | 无 |
| W-36b | 素土支撑 | ✓ | ✓ wool | ✓／✓ | ✓ | 无 |
| W-36c | 素土支撑 | ✓ | ✓ leaves | ✓／✓ | ✓ | 无 |
| W-36d | 土支撑＋两端 hook（attached 面） | ✓ tripwire／✓ hook | ✓ | ✓／✓ | ✓ | 无 |
| W-36f | 素土支撑 | ✓ | ✓ wool | ✓／✓ | ✓ | 无 |
| W-36g | sand＋石圈水盆 | ✓ | ✓ reeds | ✓／✓ | ✓ | 无 |
| W-36h | sand＋石圈水盆 | ✓ | ✓ reeds | ✓／✓ | ✓ | 无 |
| W-36i | 素土支撑 | ✓ | ✓ sandstone | ✓／✓ | ✓ | 无 |
| W-36j | 素土支撑 | ✓ | ✓ tallgrass | ✓／✓ | ✓ | 无 |
| W-36e | 素土支撑 | ✓ | ✓ wool | ✓／✓ | ✓ | 无 |

耗时面（第二观察假人收 `block_break_animation`；`j=(int)(f*10)` 累计计数）：

| 判点 | 首包→首次 j≥10 | 实测耗时（≈tick） | 面 |
| --- | --- | --- | --- |
| W-36a | 391 ms | ~8 t | 锈剪 × reeds（str 5.0，0.08 硬度） |
| W-36b | 4,050 ms | ~81 t | 锈剪 × wool（0.8 硬度） |
| W-36c | 998 ms | ~20 t | 锈剪 × leaves（0.2 硬度；破块走路径①） |
| W-36d | 无进度包 | **瞬间** | tripwire 硬度 0 ⇒ 进度早退 1.0 |
| W-36f | 20,449 ms | ~409 t | vanilla 剪＝非 ItemTool ⇒ str 回落 1.0（见 C-4） |
| W-36g | 249 ms | ~5 t | 铜斧 × reeds（str 7.0） |
| W-36h | 249 ms | ~5 t | 铁斧 × reeds（str 8.0） |
| W-36i | 5,850 ms | ~117 t | 铜斧 × sandstone（str 3.5 半效面） |
| W-36j | 99 ms | ~2 t | 锈镰 × tallgrass（str 5.0） |
| W-36e | 191 ms | ~4 t | off 相 vanilla 进度（str 面无 ETIM 行） |

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\toolcarrier-w36-a-server-latest.log`（A 相）、`…-g-server-latest.log`（G 相）；控制台全量：`…-a.out`／`…-g.out`；逐判点＋逐行＋进度序列：`…-evidence.json`。

### W-36a 锈剪 × 甘蔗（B-1 改后首证：loss=8，dur 0→**8**）

```text
[20:13:45] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=reeds str=5.0 [server]
[20:13:45] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[20:13:47] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=reeds loss=8 [server]
[20:13:48] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=8/3200 [server]
```

（**B-1 兑现**：同一形状在 W-35c 实测 dur 0→9（decay 8 + vanilla 1）；本条 0→8 ⇒ `MixinItemShears` 的 @Redirect 已让 `super` 的无条件 +1 在「reform on ＋ ETIM 剪 ＋ 玩家」门内不落地，而 ETIM 自加的 decay 8 仍在（判行 `loss=8` 同时在案）。判出 9 = 修面未生效，本窗未出现。）

### W-36b 锈剪 × 羊毛（溢出面 cloth 正证：loss=80，dur 0→80）

```text
[20:13:50] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=wool str=5.0 [server]
[20:13:54] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=wool loss=80 [server]
[20:13:55] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=80/3200 [server]
```

（0.8 硬度 × decay 100＝80 出口；**改前 81 未出现**（81 = 80 + vanilla 1）。羊毛不实现 `IShearable`（见 C-5），故走 `onBlockDestroyed` 面而非路径①，判行与 dur 双证同值。）

### W-36c 锈剪 × 树叶（路径①形状：零 decay 行，dur 0→1 现场定）

```text
[20:13:57] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:shears_rusted_iron block=leaves str=5.0 [server]
[20:13:57] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[20:14:00] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（该点 `tool decay` 0 条、`mine deny` 0 条：树叶走 1.12 `ItemShears.onBlockStartBreak` 的 IShearable 分流，`tryHarvestBlock` 在 `:328` 即被 `return false` 短路 ⇒ 永不进 `onBlockDestroyed` ⇒ 零红减。**现场定 durΔ = 1**，来自 `onBlockStartBreak` 内的 `itemstack.damageItem(1, player)`（不经新 @Redirect）⇒ 条 147 T-6「①面磨 1」推断成立。**speed 面实测有行**（`str=5.0`）——任务书「decay/speed/deny 全静默」的 speed 支不成立，见 C-1。）

### W-36d 锈剪 × 绊线（三形 gate③：建行 loss=0，dur 0）

```text
[20:14:02] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=tripwire loss=0 [server]
[20:14:02] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[20:14:05] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
```

（绊线 hardness 0（`Block.java:2836` 无 setHardness，字段默认 0）⇒ gate③ 命中 ⇒ `loss=0` 且**无条件建行**（`ETIMMining.java:274`）；decay=0 ⇒ 不调 `damageItem` ⇒ dur 不动。无 `mine speed` 行、无进度包、+300 ms 即 air（瞬间）——三者自洽，见 C-7。hook 两端摆放成功（attached 面在案）。）

### W-36f vanilla 剪 × 羊毛（handler 否则支零扰：0 行 + dur 0→1）

```text
[20:14:07] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=minecraft:shears dur=0/238 [server]
[20:14:29] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=minecraft:shears dur=1/238 [server]
```

（vanilla 剪不在重定向的跳过支（非 `ETIMItemShearsRusted`）⇒ @Redirect 走 else 支原调 `damageItem(1)` ⇒ dur +1 与 vanilla 面一致；ETIM 三类行全 0（无增益亦无衰减漏斗）。破块 409 t，见 C-4。）

### W-36g ETIM 斧 × 甘蔗（有效集正面：str=7.0，loss=8，无 deny 行）

```text
[20:14:32] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:axe_copper block=reeds str=7.0 [server]
[20:14:34] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:axe_copper block=reeds loss=8 [server]
[20:14:35] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:axe_copper dur=8/4800 [server]
```

（`axeFace` 生效（`ETIMMining.java:493-501`）：ETIM 斧的 grade 走 `etimGrade()`（kind 无关）⇒ ok 真 ⇒ **无 deny 行**（grade<0 静默面未被触发）；str = 4.0 × 1.75 = 7.0；decay 走 `ItemAxe` 档 1.0 ⇒ 0.08×100=8。）

### W-36h vanilla 铁斧 × 甘蔗（警报线翻面：str=8.0，loss=8）

```text
[20:14:38] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=minecraft:iron_axe block=reeds str=8.0 [server]
[20:14:40] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=minecraft:iron_axe block=reeds loss=8 [server]
[20:14:41] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=minecraft:iron_axe dur=8/9600 [server]
```

（W-35e 的 `loss=0` 已翻为 **8**：`axeFace` 让 vanilla 斧的 grade 改读 `"axe"` 面（iron⇒fold 3）而非 `"pickaxe"` 面（-1）⇒ 假 PASS 形消除；`getMaterialEfficiency` 走 axe 面 iron band 2.0 ⇒ str 8.0。）

### W-36i 铜斧 × 砂岩（1.875 活档首测：str=3.5，loss=150）

```text
[20:14:43] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:axe_copper block=sandstone str=3.5 [server]
[20:14:49] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:axe_copper block=sandstone loss=150 [server]
[20:14:50] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:axe_copper dur=150/4800 [server]
```

（砂岩表行 0.8／minLevel 1（`ETIMMining.java:95`）＋ `ItemAxe` 档 sandstone 1.875 ⇒ 0.8×100×1.875=150 精确；str 侧半效 1.75×0.5 ⇒ 3.5。E-2「1.875 死档」翻活档在本窗首次实测坐实。）

### W-36j 锈镰 × 高草（回归：loss=2，str=5.0）

```text
[20:14:52] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] mine speed item=etim:scythe_rusted_iron block=tallgrass str=5.0 [server]
[20:14:54] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=tallgrass loss=2 [server]
[20:14:55] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36A#191 held=etim:scythe_rusted_iron dur=2/3200 [server]
```

（与 W-32a／W-35i 同值同判行；fresh 键（换刀换块）确保不被前点去重吞行。）

### W-36e off 相：锈剪 × 羊毛（0 ETIM 行 + vanilla +1 保留 + 渐进）

```text
[20:15:20] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36G#54 held=etim:shears_rusted_iron dur=0/3200 [server]
[20:15:23] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W36G#54 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（`miningReform=false` ⇒ `ETIMItemShearsRusted:117-119` 早退、@Redirect 走 `!miningReform` 原调支 ⇒ **vanilla +1 保留**（dur 0→1）且三类 ETIM 行全 0；进度包在案（j 达 85，≈4 t 完成 0.8 硬度）⇒ 渐进面成立。**off 相与 on 相仅差这一刀**，与 B-1 修法三支判定树完全吻合。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条、B 级 **0** 条；C 级 7 条（均不改判点判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **任务书 W-36c 的「speed 全静默」预期不成立**：实测 `[MiningLog] mine speed item=etim:shears_rusted_iron block=leaves str=5.0` 在案。成因：`mine speed` 由**挖掘进度面**（`ETIMMining.java:204-216` → `getCurrentPlayerStrVsBlock`，`hardness>0` 且有效 ⇒ 发行）产生，与「破块走哪条路径」无关；树叶硬度 0.2 且剪有效 ⇒ 必有该行。decay／deny 两面仍全静默（判据面成立）。 | 判据面归属勘误；本点按「decay 0 条 ＋ deny 0 条 ＋ durΔ 锚实值 ＋ 块破」判过，speed 实测只记录不入判值 |
| C-2 | C | **vanilla 剪的注册名是 `minecraft:shears`**（1.12 `Items.SHEARS` 注册 "shears"），任务书写 `minecraft:iron_shears` ⇒ `/etest hold` 报 `hold_bad_item`（首轮冒烟 FATAL 实证） | 工装口径；判值不变，回执按 `minecraft:shears` 记 |
| C-3 | C | **STOP 语义细化**（沿用条 145 C-1）：1.12 `STOP_DESTROY_BLOCK` 只布防完成态（`receivedFinishDiggingPacket` ＋ `delayedDestroyPos`），真破要等累计进度 `f≥1.0`；因此「START→块消失」= max(40 t, 自然完成 tick)。本窗改为**轮询到 air**（上限 32 s）取实测，速度慢的点不再误判为「未破」 | 工装纪律（已入驱动）；条 145 C-1 的「STOP 收尾」表述建议改为「STOP 布防、f≥1.0 收尾」 |
| C-4 | C | **vanilla 剪 × 羊毛 = 409 t（≈20.5 s）**：vanilla `ItemShears extends Item`（非 ItemTool）⇒ ETIM 有效性门 `false` ⇒ str 回落 no-tool 1.0（`ETIMMining.java:204-216`），R196 有效集不覆盖 vanilla 剪 | 既有载体面（非本批回归、非判点）；W-36f 只判「0 行 + dur 1」，耗时仅记实 |
| C-5 | C | **羊毛不实现 `IShearable`**：1.12 `BlockColored` 只有 `super(materialIn)`（无 IShearable 接口），全树仅 `BlockLeaves／BlockTallGrass／BlockVine／BlockWeb／BlockDeadBush／BlockDoublePlant` 六类走路径① | 该事实解释了 W-36b 为何能走 `onBlockDestroyed` 取到 80；后续选「路径①」判点时须避开 wool/reeds/tripwire |
| C-6 | C | **①面「磨 1」现场定 = 1**（条 147 T-6 推断成立）：树叶的 +1 来自 `ItemShears.onBlockStartBreak` 内的 `itemstack.damageItem(1, player)`，不经新 @Redirect，故 reform on 下照旧 | 判值记录面；对后续「①面是否也要 R196 化」立项有用 |
| C-7 | C | **tripwire 三面自洽**：hardness 0 ⇒ `getProgressPerTick` 在 `hardness == 0` 早退（`ETIMMining.java:382-386`）⇒ 不调 str（**无 speed 行**）、无进度包、+300 ms 即 air；而 gate③ 在 `getToolDecayFromBreakingBlock` 内先判硬度并**无条件建行**（:274）⇒ 出现「有 decay 行 loss=0 ＋ 零速面 ＋ 零进度包」组合 | 判读口径；本窗四点组合逐项在案 |

## 4. 结论

**判点 10/10 全通过（W-36a／b／c／d／e／f／g／h／i／j），驱动总判 PASS。**

- **B-1 兑现（本批主目标）**：锈剪破块 dur 由 W-35c 的 9 降为 **8**（reeds）并保持判行 `loss=8`；溢出面 wool 由 81 降为 **80**；off 相仍为 vanilla **1**、vanilla 剪仍为 **1** ⇒ `MixinItemShears` 三支判定树（off 原调／ETIM 剪+玩家跳过／其余原调）逐支落地，「R196 decay-only」语义成立。
- **C-5 兑现**：ETIM 斧 × reeds `str=7.0／loss=8` 且**无 deny 行**；vanilla 铁斧 × reeds 由 W-35e 的 `loss=0` **翻为 8**（`str=8.0`）⇒ `axeFace` ＋ grade 随面分叉消除了「grade=-1 ⇒ 假 PASS」形；砂岩 1.875 活档首测 `loss=150／str=3.5` 同时成立。
- **路径①与三形门面**：树叶零红减（dur 现场定 1）、绊线建行 `loss=0` 且零磨、羊毛走红减面 80 —— 三条路径互不串门。
- **回归**：锈镰 × 高草 `loss=2／str=5.0` 与 W-32a／W-35i 同值，新 mixin 未扰动既有衰减面。
- **产品面**：本批零改码、零 rebuild（两相 `:jar UP-TO-DATE`）；新件 mixin 加载零异常（三型 0）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 两相 `Done (5.634s／1.046s)` → stdin `stop` → `BUILD SUCCESSFUL`、退出码 0（A／G） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内两次键值改：`blockDebugLog=false→true`、`miningReform=true→false`，收口整档还原；未换锚） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=toolcarrier36`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical |
| 世界 | 新世界 `toolcarrier36`（两相复用）；收口删除目录 |
| 端口／崩溃 | 25565 收口 0 LISTEN；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W36A`／`ETIM_W36G`／观察位 `ETIM_W36OBS`） |
| 钉值复核 | dev／release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `…-a.out`／`…-g.out`（全量控制台）、`…-a-server-latest.log`／`…-g-server-latest.log`（服务端日志）、`…-evidence.json`（逐判点＋逐行＋耐久读写＋进度序列＋观察位＋块消失时刻）、`…-etim.cfg.before`／`…-server.properties.before`／`…-{ops,usercache,usernamecache}.json.before`；排障链 `…-smoke`（首轮：wool 未在窗内破出 ＋ shears id 面）／`…-smoke2`（speed 面 + id 面勘出）／`…-smoke3`（c/f 复验） |
| 驱动 | `testharness\player\toolcarrier-w36.js`（两相 A／G；`W36_ONLY`／`W36_SKIP_G` 仅冒烟用） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `854f027` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\toolcarrier-w36.js`
- `testharness\reports\toolcarrier-W36-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **C-1 口径固化**：`mine speed` 行属「挖掘进度面」而非「破块路径面」——是否在 audit20 条 147 T-6 旁补一句，后续凡「路径①」判点只判 decay／deny 两面 ＋ 块面，speed 行改为记录面（避免同类预期误设）。
2. **C-3 表述回填**：条 145 C-1 的「`/etest dig` STOP 收尾」建议改为「STOP 布防完成态、累计 `f≥1.0` 才收尾」，并把「轮询到 air」纳入挖掘类工装模板（本窗已按此实现）。
3. **C-6 后续立项**：路径①（IShearable 分流）下剪刀仍有 vanilla +1 且不经新 redirect——是否另立候选批按 R196 处置（本批 scope 外，判点未受影响）。
