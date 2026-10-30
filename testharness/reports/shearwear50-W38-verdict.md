# 羊剪毛 50 批（shearwear50 · ItemShears 羊面 vanilla +1 → R196 flat 50）· W-38a…h 判决回执

> **报告字节规格**：`24,217 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 95 / ✗ 2｜226 行`
> 执行方：会话七（自动化验证窗执行方）｜判窗：2026-10-30 23:27:44–23:29:37（服务器本地时；驱动 UTC 15:27:38–15:29:38）｜tag `shearwear50-w38`
> 判决源：**羊面**唯一判据 = `[BlockLog] probe … held=… dur=x/y`（`/etest blockprobe`，`blockDebugLog=true`）＋ 触发旁证 `testfor @e[type=sheep] {Sheared:0b|1b}`／`entitydata`／`testfor @e[type=item]`；**回归块面**（g/h）另吃 `[MiningLog] tool decay … loss=`；`[MiningLog] mine speed` 属记录面（条 149 C-1，不判）
> 审判权威：条 153（羊剪毛立项摸底 8 面 + D-1…D-5）／条 154（终审 T-1…T-9 判值零改动；f 点「创造若仍有 dur 变，报勘不硬判」）＋ 主会话 W-38 判窗任务书
> 判值纪律（条 138 勘-1 / 条 153 / 条 154）：只写 **max 出口值** —— 羊面 **50**（R196 flat，`ETIMMining.java:68` `SHEEP_SHEAR_WEAR`）／vanilla 剪 **1**／off 相 **1**／reeds **8**／leaves **20**；未手算任何乘性中间项。
> 计数注记：正文 ✓ 覆盖八个判点结论格、逐点附着判据格与收口表；✗ 仅自指 2 处（规格行计数位 ＋ 本注记），**判点表内无失败叉号**（8/8 通过）。

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `3da8f0c`（`MixinItemShears` 第三 `@Redirect` + `SHEEP_SHEAR_WEAR` 落码；上一环 `1470292`） | ✓ 起窗/收口同值；工作树 dirty 0（仅新增 harness 驱动） |
| dev jar | 755,413 B｜`B9D1B90A4F73138C02CF7B7D3F5686C3D42C5FCF34C237C181D0C81659C3A2A6` | ✓ 逐位命中（起/收同值） |
| release jar | 771,189 B｜`3138E8C45A542F56AE878B2BA46538BF950D104BE777122CA2ADC2A0CE73DCD5` | ✓ 逐位命中（起/收同值） |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical = 钉值**（本批零新键） |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=shearwear50`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`(550 B)／`usercache.json`(1,523 B)／`usernamecache.json`(796 B) | ✓ 起收 byte-identical（假人登录改写已还原） |
| MK 面 | mixins **56**／client **10**；refmap 双树 sync **62 类键／138 条目** | ✓ 起窗前直读同值（`MixinItemShears` 切片 3 条＝新增 `func_111207_a` 方法名行，条 154 主预言收位） |
| 附属 jar | 不在场（本批不带 etimextra） | ✓ 两相 `etimExtrasOffGate SKIPPED`，FML 清单 16 mods 无 etimextra |
| 世界 | `level-name=test27dev` → 窗内新世界 `shearwear50` → 收口还原 | ✓ 两相 `Preparing level "shearwear50"`；世界目录收口删除 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（两相各一次） | ✓ **0 rebuild** |
| mixin 加载 | `Mixin apply failed`／`MixinException`／`InvalidInjectionException` 三型 | ✓ 两相全 0（第三 `@Redirect` `require = 1` 命中） |
| 环境前置 | 25565 = 0 LISTEN、25575 = 0、`run\crash-reports` 18 条 | ✓ 收口后仍 0／0／18 条 |

两相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 | 停服 |
| --- | --- | --- | --- | --- |
| A | `miningReform=true`（＋`blockDebugLog=true` 取 probe 面） | W-38a／b／d／c／f ＋ g／h（回归） | `Done (5.840s)` | `BUILD SUCCESSFUL in 1m 28s`／exit 0 |
| G | `miningReform=false` | W-38e | `Done (1.122s)` | `BUILD SUCCESSFUL in 30s`／exit 0 |

卫生面（判值前置钉死，实测在案）：`gamemode 0`（f 点临时 `gamemode 1` 后即回 0）｜`etest level 0`（xp=0）｜`etest food 6 6`（饱食满）｜`tp` 后 grounded=true（两相）｜判点工具裸栈（无耐久·效率附魔）｜逐点 `/etest hold` **fresh 栈**（新纪律②）｜`difficulty 0`＋`randomTickSpeed 0`＋`doTileDrops false`｜羊只逐点 `/summon`＋`/kill` 清场（`NoAI:1b` 固定站位）｜`testfor`／`entitydata` 逐点回读剪毛态与年龄。

## 1. 逐判点核讫表

判法：一个判点 = 一次 **fresh 栈** 的交互（羊面）或一次 fresh `item×block` 键的挖块（回归面）；羊面判 **probe durΔ ＋ 判定触发面（被剪／未剪）＋ 0 条 ETIM 行**，回归面判 **判行 loss 定值 ＋ 条数 ＋ durΔ**。

| 判点 | 工具 × 目标 | 期望 durΔ | 实测 durΔ（probe／假人 NBT 双路） | 触发面（剪毛态） | ETIM 判行 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| W-38a | `etim:shears_rusted_iron` × 成年未剪羊 | **50** | **50／50**（0→50，max 3200） | 未剪→**已剪**（`{Sheared:1b}` 命中）＋落毛 1 | **0 条** | **✓ 通过** |
| W-38b | 同上 × **同羊再剪**（已剪） | 0 | **0／0**（0→0） | **保持已剪**；`{Sheared:0b}` 不命中 | **0 条** | **✓ 通过** |
| W-38d | `minecraft:shears` × 成年未剪羊 | 1 | **1／1**（0→1，max 238） | 未剪→**已剪**＋落毛 1 | **0 条** | **✓ 通过** |
| W-38c | `etim:shears_rusted_iron` × **幼羊**（`Age:-24000`） | 0 | **0／0**（0→0） | **仍未被剪**（`{Sheared:1b}` 不命中）＋落毛 0 | **0 条** | **✓ 通过** |
| W-38f | 同上 × 成年羊（**创造模式**） | record（现场定） | **0／0**（实测 0；见 C-3） | 未剪→**已剪**＋落毛 2 | **0 条** | **✓ 通过**（record 面；Δ 实测 0） |
| W-38g | 同上 × `reeds`（回归） | 8 | **8／8**（0→8） | 块消失（air 轮询确认） | **`block=reeds loss=8`（1 条）** | **✓ 通过** |
| W-38h | 同上 × `leaves`（回归） | 20 | **20／20**（0→20） | 块消失（air 轮询确认） | **`block=leaves loss=20`（1 条）** | **✓ 通过** |
| W-38e | 同上 × 成年未剪羊（**off 相** `miningReform=false`） | 1 | **1／1**（0→1，max 3200） | 未剪→**已剪**＋落毛 2 | **0 条** | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样；驱动 `checks` 逐项全 true）：

| 判点 | 召羊／复用 | 实体被 harness 跟踪 | 年龄门 | 手持面一致（前后 `held=`） | 交互送出 | **ETIM 交互触及门 0 拒** | 剪毛态符合期望 | 行数面 | durΔ 面 | NBT 面 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| W-38a | ✓ `Object successfully summoned` | ✓ id 跟踪 | ✓ `Age 0`（成年） | ✓ | ✓ INTERACT | ✓ `reachDenied=0` | ✓ | ✓ 0 条 | ✓ 50 | ✓ 50 |
| W-38b | ✓ 复用同一只 | ✓ | ✓（复用不判） | ✓ | ✓ | ✓ 0 | ✓ 已剪 | ✓ 0 条 | ✓ 0 | ✓ 0 |
| W-38d | ✓ | ✓ | ✓ `Age 0` | ✓ `minecraft:shears` | ✓ | ✓ 0 | ✓ | ✓ 0 条 | ✓ 1 | ✓ 1 |
| W-38c | ✓ | ✓ | ✓ `Age -23945`（幼） | ✓ | ✓ | ✓ 0 | ✓ 未剪 | ✓ 0 条 | ✓ 0 | ✓ 0 |
| W-38f | ✓ | ✓ | ✓ `Age 0` | ✓ | ✓ | ✓ 0（创造面门本就早退） | ✓ | ✓ 0 条 | ✓ record→0 | ✓ 0 |
| W-38g | ✓ 摆场（沙＋石圈水盆） | — | — | ✓ | ✓ dig-start／dig-stop | — | — | ✓ 1 条 | ✓ 8 | ✓ 8 |
| W-38h | ✓ 摆场（素土） | — | — | ✓ | ✓ dig-start／dig-stop | — | — | ✓ 1 条 | ✓ 20 | ✓ 20 |
| W-38e | ✓ | ✓ | ✓ `Age 0` | ✓ | ✓ | ✓ 0 | ✓ | ✓ 0 条 | ✓ 1 | ✓ 1 |

全相判行与通道计数（`-server-latest.log` 直数）：

| 相 | decay 行 | speed 行 | deny 行 | mixin 异常 | `reach denied` | probe 行（dur 面／cfg 伴行面） |
| --- | --- | --- | --- | --- | --- | --- |
| A | **2**（reeds 8＋leaves 20，皆回归面） | 2 | 0 | 0 | **0** | 42（21／21） |
| G | **0** | 0 | 0 | 0 | **0** | 6（3／3） |

旁证面（附记，不判）：落毛数四点实测 **1／1／2／2**（`1 + rand.nextInt(3)` 面，`EntitySheep.java:428-429`）；剪毛音在服务端无 `playSound` 行（该通道未日志化，见 C-6）；羊血 `Health:8.0f` 剪前/剪后同值（无掉血）。

## 2. 判决源（逐判点原文）

服务端全量：`testharness\build-logs\shearwear50-w38-a-server-latest.log`（497,133 B）／`…-g-server-latest.log`（81,020 B）；控制台全量：`…-a.out`（510,457 B）／`…-g.out`（95,692 B）；逐点证据：`…-evidence.json`（43,266 B）。

### W-38a 锈剪 × 成年未剪羊（本批主证：dur 0→**50**，0 行）

```text
[23:28:04] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:28:04] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Sheep did not match the required data structure
[23:28:07] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[23:28:08] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found item.tile.cloth.white
[23:28:09] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:28:12] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=50/3200 [server]
```

（读法：`Found Sheep` / `Sheep did not match the required data structure` 分别是 `testfor @e[type=sheep] {Sheared:0b}`／`{Sheared:1b}` 的命中与不命中行 —— 剪前 `{Sheared:0b}` 命中、`{Sheared:1b}` 不命中；落毛 1 件；剪后 `{Sheared:1b}` 命中。**dur 0→50 且无任何 `[MiningLog] tool decay` 行** ⇒ 第三 `@Redirect`（`MixinItemShears.java:122-143`）接管 `ItemShears.java:73` 的 vanilla `damageItem(1, entity)`，改按 `ETIMMining.SHEEP_SHEAR_WEAR`（`ETIMMining.java:68` = 50）落磨，且不经 funnel ⇒ 0 判行。3200 耐久 ÷ 50 = 64 只量级首证。）

### W-38b 同羊再剪（已剪羊：Δ0，0 行）

```text
[23:28:16] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[23:28:18] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Sheep did not match the required data structure
[23:28:18] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:28:20] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
```

（读法：`{Sheared:0b}` 不命中（已剪）／`{Sheared:1b}` 命中；`testfor @e[type=item]` 为 `Selector '@e[type=item]' found nothing` ⇒ 无新落毛。零磨的机制不在 redirect 分支内：`EntitySheep.isShearable`（`EntitySheep.java:424`）在 `getSheared()` 为真时返回 false ⇒ `ItemShears.java:60` 的 `if` 不进 ⇒ `damageItem` 根本不被调用。R196 与 1.12 的 return 值差异（R196 `:70` false vs 1.12 `:75` true）属流程面，本窗只判磨损面。）

### W-38d vanilla 剪 × 成年羊（Δ1，0 行 —— else 支原调直证）

```text
[23:28:26] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=minecraft:shears dur=0/238 [server]
[23:28:26] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found item.tile.cloth.white
[23:28:28] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:28:30] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=minecraft:shears dur=1/238 [server]
```

（`stackParam.getItem() instanceof ETIMItemShearsRusted` 为假 ⇒ 第三 redirect 走「vanilla shears → vanilla behaviour」支（`MixinItemShears.java:141-142`）⇒ vanilla +1 原样落地，238 面自洽。）

### W-38c 锈剪 × 幼羊（Δ0，0 行 —— isChild 门）

```text
[23:28:36] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[23:28:38] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Sheep did not match the required data structure
[23:28:39] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:28:41] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[23:28:42] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] livestock well food=0.89 water=0.94 freedom=1.00 child=true entity=EntitySheep#2094 [server]
```

（读法：剪后 `{Sheared:1b}` **不命中**、`{Sheared:0b}` 命中、落毛 0 ⇒ 完全未被剪；`entitydata` 双读 `Age -23945 → -23844`（幼），`[AILog] … child=true` 为旁证。零磨机制同 b：`EntitySheep.java:424` 的 `!isChild()` 使 `isShearable` 假 ⇒ 不进 `damageItem`。）

### W-38f 创造模式锈剪 × 成年羊（Δ0 —— record 面）

```text
[23:28:46] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
[23:28:48] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found item.tile.cloth.white
[23:28:48] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found item.tile.cloth.white
[23:28:49] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:28:52] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=0/3200 [server]
```

（剪毛**成功**（落毛 2、`{Sheared:1b}` 命中）但 dur 仍 0 ⇒ 创造零磨**成立**。终审 T-9 f 的判值收位；但机制锚不是 `ItemShears.java:52` 的 `isRemote` 早退，而是 `EntityPlayer.interactOn:1325-1328` —— 见 C-3。）

### W-38g 锈剪 × 甘蔗（回归：`loss=8`，dur 0→8）

```text
[23:28:58] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=reeds loss=8 [server]
[23:28:59] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=8/3200 [server]
```

（与 W-36a／W-37i 同值同形；`dig-start`／`dig-stop` 均在 `BlockPos{x=-68, y=76, z=249}`，块在 2,700 ms 后 air 轮询确认。第三 redirect 不扰 `onBlockDestroyed` 主链。）

### W-38h 锈剪 × 树叶（回归：`loss=20`，dur 0→20）

```text
[23:29:04] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=leaves loss=20 [server]
[23:29:05] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38A#191 held=etim:shears_rusted_iron dur=20/3200 [server]
```

（与 W-37a 同值同形；块在 2,706 ms 后 air 确认。①面（IShearable 剪块）与第三 redirect（实体面）互不串门。）

### W-38e off 相（`miningReform=false`）：锈剪 × 成年羊（Δ1，0 行）

```text
[23:29:31] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38G#22 held=etim:shears_rusted_iron dur=0/3200 [server]
[23:29:32] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found item.tile.cloth.white
[23:29:33] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Found Sheep
[23:29:36] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] probe player=ETIM_W38G#22 held=etim:shears_rusted_iron dur=1/3200 [server]
```

（`!miningReform` 首支（`MixinItemShears.java:128-131`）原调 `damageItem(vanillaAmount, shearedEntity)` ⇒ dur +1、ETIM 面全 0 —— 今日行为基线复现。）

## 3. 冲突分级（A / B / C）

A 级 **0** 条、B 级 **0** 条；C 级 7 条（均不改判点判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **命令面输出形与正则**（工装口径）：1.12.2 `/testfor` 实为三形 —— 命中每实体一行 `Found <name>`；NBT 不匹配 `<Entity> did not match the required data structure`；选择器空 `Selector '<sel>' found nothing`（**不是** `Found N entities`）；`/entitydata … {}` 打印 `The data tag did not change: {…}`，其中 `Age:` 前有 `ForcedAge:` 前缀，正则须带左边界（行首或 `,`／`{`）。 | 冒烟首版按 `Found N entities` + 裸 `Age:` 写，出现 3 点假 FAIL（a/b/f）与幼羊年龄误判；两处均已修正后才起正窗。后续命令面判点照本形锚定。 |
| C-2 | C | **幼羊 hitbox 缩放引发「假 FAIL 陷阱」第二源**：`EntityAgeable.setScaleForAge`（`EntityAgeable.java:267-270`）把幼羊 hitbox 缩成 0.45×0.65，而 mineflayer `activateEntity` 固定瞄 `feet+1`（高于幼羊头顶）⇒ 眼→命中点射线**掠过**⇒ ETIM 交互触及门取消事件（`ETIMReachEvents.java:57-68`，日志 `reach denied: etim.reach.deny_interact`）⇒ 剪毛根本没发生。 | 本窗改为按体心瞄准后自建 INTERACT 包（成年 0.60／幼羊 0.30），并把「全程 `reach denied` 必须 0」纳入逐点判据。拟入挖掘/交互类工装纪律。 |
| C-3 | C | **W-38f 创造零磨的机制锚更正**：不是 `ItemShears.java:52` 的 `isRemote` 早退（那是客户端面），而是 `EntityPlayer.interactOn:1325-1328` —— 创造模式下先把 `itemstack` 换成 `itemstack1`（交互前副本）再 `interactWithEntity`（`:1330`）⇒ 磨损落在**副本**上、真栈不动。另注：`ItemStack.damageItem:387` 的创造守卫键在 `entityIn instanceof EntityPlayer`，而实体面传入的是**羊**，故该守卫在本面不生效（若无 `interactOn` 的副本机制，创造面会照常 −50）。 | 判值 Δ0 与终审 T-9 f 一致（**不改判值**），仅推导锚更正为 `EntityPlayer.interactOn:1325-1328`。 |
| C-4 | C | **羊面无 `[MiningLog]` 通道**：全窗 decay 行仅回归面 2 条（A 相 reeds 8／leaves 20；G 相 0 条），羊面 6 点全 0 行 —— 与条 153 D-5「funnel 不涉实体面」一致。故羊面**只能**靠 probe/命令面判，`mine speed` 亦无行。 | 记录面；若后续要判「剪毛量级」的日志化（而非探头读耐久），须另立实体面通道（新批）。 |
| C-5 | C | **落毛数 1-3 属随机面**（`EntitySheep.java:428-429` `1 + rand.nextInt(3)`）：本窗四点实测 1／1／2／2（创造点 2、off 相 2）。 | 旁证不判；判据只吃磨损面与剪毛态。 |
| C-6 | C | **剪毛音无服务端日志通道**：全窗无 `playSound` 类行（服务端不自报音效），故「音触发面」不可日志化。 | 登记为不可达面；不用截图/手感替代（AGENTS §9）。 |
| C-7 | C | **幼羊 Age 在 `NoAI` 下仍逐 tick 递增**（`Age -23945 → -23844`，≈103 t/5 s），且 `entitydata` 读的是 `Age` 而非渲染缩放。 | 判窗内不影响 `isChild` 门（24000 t 量级）；长窗重测幼羊须注意年龄漂移。 |

补充记录面（不计 C）：`blockDebugLog=true` 下 probe 每次两条（dur 面 ＋ `cfg blockModel=…` 伴行面），A 相 42 条＝21＋21、G 相 6 条＝3＋3；判值正则以 `held=` 锚定，未受污染（W-37 C-1 先例沿用）。

## 4. 结论

**判点 8/8 全通过（W-38a／b／c／d／e／f／g／h），驱动总判 PASS（`evidence.json.verdict=PASS`）。**

- **羊剪毛 R196 化兑现（本批主目标）**：锈剪 × 成年未剪羊的磨损由 vanilla 恒 +1 改为 **flat 50**（`ETIMMining.java:68`）—— `dur 0→50` 且 **0 条** `[MiningLog]` 行；3200 耐久 = **64 只**羊量级（改前 3200 只），条 154 T-1 判值逐位命中。
- **零磨三面互不串门**：已剪羊（b）Δ0、幼羊（c）Δ0、创造（f）Δ0 —— 三者机制各异（`isShearable` 的 `getSheared()`／`!isChild()` 门、`interactOn` 副本），但结果一致；`testfor`/`entitydata`/落毛数三路旁证互洽（b 无新落毛、c 完全未剪、f 落毛 2 而栈不动）。
- **vanilla 与 off 相**：vanilla 剪 × 羊仍 **+1**（238 面）；`miningReform=false` 仍 **+1**（`!miningReform` 原调支）⇒ 第三 redirect 的三支树（off／ETIM+羊／其余）全部实测落地。
- **回归无扰**：锈剪 × reeds 仍 `loss=8／dur 8`，锈剪 × leaves 仍 `loss=20／dur 20` ⇒ 实体面 redirect 与块面两处 redirect（`onBlockDestroyed`／`onBlockStartBreak`）互不串门。
- **MK/cfg 预言收位**：refmap 双树 62 类键／**138 条目**（`MixinItemShears` 切片 3 条，`func_111207_a` 新行）、mixins 56／client 10 均与钉值一致；cfg 起收 byte-identical（零新键）；release 771,189 B（相对 `1470292` 的 770,940 B 增 249 B）。
- **产品面**：两相 `:jar UP-TO-DATE`，0 rebuild；判窗内产品码 0 改动（HEAD `3da8f0c` 起收同值）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 两相 `Done (5.840s／1.122s)` → stdin `stop` → `BUILD SUCCESSFUL`（1m 28s／30s）、退出码 0（两相同值 `{exitCode:0, exited:true}`） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical = 钉值**（窗内两处键值改：`blockDebugLog=false→true`、`miningReform=true→false`，收口整档还原） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=shearwear50`、`spawn-protection=0`） |
| 服务端侧缓存 | `ops.json`／`usercache.json`／`usernamecache.json` 起收 byte-identical |
| 世界 | 新世界 `shearwear50`（两相复用）；收口删除目录（`worldDirRemoved=true`） |
| 端口／崩溃 | 25565 = 0、25575 = 0（收口后）；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 ＋ 假人 `ETIM_W38A`／`ETIM_W38G`） |
| 钉值复核 | dev／release jar 收口 sha 与起窗同值（0 rebuild） |
| 证据档 | `shearwear50-w38-a.out`（510,457 B）／`…-g.out`（95,692 B）、`…-a-server-latest.log`（497,133 B）／`…-g-server-latest.log`（81,020 B）、`…-evidence.json`（43,266 B，含逐点 probe 前后行、NBT 前后、落毛数、剪毛态、判行、交互瞄准点）、`…-etim.cfg.before`／`…-server.properties.before`／`…-{ops,usercache,usernamecache}.json.before`；冒烟 `shearwear50-w38-smk-*`（三轮：摆场首验→命令面正则更正→幼羊瞄准更正，末轮 5/5 PASS） |
| 驱动 | `testharness\player\shearwear50-w38.js`（两相 A／G；`W38_ONLY`／`W38_PHASES` 仅冒烟用；自建 INTERACT 包 + 体心瞄准） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `3da8f0c` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\shearwear50-w38.js`
- `testharness\reports\shearwear50-W38-verdict.md`（本回执）

## 6. 待主会话裁决位

1. **C-2 工装纪律固化**：幼羊/小体积实体的 INTERACT 必须按**体心**瞄准（且 `reach denied` 计数须入判据）——是否写入交互类工装模板，与 W-37 的「同键同值多点必换 boot」（C-4）并列。
2. **C-3 锚更正入账**：W-38f 创造零磨的机制锚由 `ItemShears:52` 改为 `EntityPlayer.interactOn:1325-1328`（判值不变），是否回填条 154 T-9 f 的推导注。
3. **C-4 实体面通道**：羊面零 `[MiningLog]` 行 —— 若后续批次要判「剪毛量级」的日志化，需新立实体面通道批（否则判据只能靠 probe 读耐久）。
4. **C-6 不可达面登记**：剪毛音无服务端日志通道，是否按「不可达」长期登记（不再尝试截图/手感判定）。
5. **盲区照旧**：哞菇／雪傀儡面本窗不测（1.12 存在 IShearable 面、R196 无面、门② keep +1），维持盲区登记。


## 7. 自报（机械核讫）

> 文件：`testharness/reports/shearwear50-W38-verdict.md`｜**24217 B**（全文）｜SHA-256（**本节之前**的正文，即 `## 7. 自报（机械核讫）` 及其以下全部行不计入）`A9DC17F44365C515ADBF876BD1B06D03F337FD40C0ABF21196F88630647067F2`｜anchors **11 / missing 0**｜tables **7 / bad 0**｜首字节 0x23｜UTF-8 无 BOM｜LF｜0 U+FFFD
