# metgear 批（金属剪 6＋gold 链/链甲 · 落码批）· W-62…W-69 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01｜**窗口**：诊断 boot 1 次（第 1／上限 3；崩于 preInit，未到 Done）｜**0 客户端**
> **报告字节规格**：`15,057 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 11 / ✗ 5｜141 行`
> **判据正本**：audit20 条 212（D-1…D-6 全裁）／条 213（终审放行＋落码清单）／条 214（落码收讫＋判窗预值 132／35／160）；`playground/audit/metgear-立项摸底.md` §1.4（六剪判值表）／§3.4（gold 链甲判值表）／§4（七处特判）／§5（判行锚）／§7（44 行逐方法）；`playground/audit/metgear-终审回执.md` §四（判值速查）／T-3（七处特判）／T-5（配方行程）。
> **判决**：**FAIL** —— **W-62 boot 行判读 ✗**：配方计数闸 `added != 35` 在 `ETIM.preInit` 首刀抛出（实测 `registered 29`），服务器未达 `Done (`；**W-63…W-69 不可达**（boot 阻断，全部判点无判行、无判值）。本窗零改码零 build、零 cfg 写、零客户端、世界已删、起收钉值全同。
> **A 级缺陷 1 条（A-1）**：`ETIMGear.registerRecipes` 的 `int before = etimRecipeCount()`（`:276`）落在 gold 链面 6 条配方（`:259-267`）**之后**，batch 增量只数到 29；闸值 35（含那 6 条）与实测不符 ⇒ boot 硬崩。修法方向见 §2（本窗不改码）。

## §0 判定总表（8 判点）

四值：**faces=8｜checked=1｜pass=0｜fail=1｜blocked=7**（checked 只计实际取得判行的判点；blocked＝boot 阻断未执行）。

| 点 | 面 | 判 read | 期望（判据位） | 实测 | 判 |
| --- | --- | --- | --- | --- | --- |
| **W-62** | boot 行 | `[EquipLog] durability reassert: 132 gear rows ok` ＋ `[TestLog] gear recipes registered: 35 batch rows ok (… etim-domain total 160 …)` | 132／35／160 恰值 | **两行均未出现**；`ETIMGear.java:280` 抛 `IllegalStateException … expected 35 …, registered 29` | **✗** |
| W-63 | boot gear 行（六剪＋gold 链甲四件） | `[EquipLog] gear item=etim:shears_* maxDamage=… efficiency=… grade=… burn=… armor=…` | 六剪 3200/3200/3200/12800/51200/204800；efficiency 1.75/1.75/1.75/2.0/2.5/3.0；grade 2/2/2/3/4/5；burn 100；armor 0.0；gold 链甲 armor=0.8333…/1.3333…/1.1666…/0.6666… | 不可达 | — |
| W-64 | gold 粒→链→甲链 | 6 条 gold 配方行＋`chain_gold` 件＋四件链甲配方（etim-domain total 增量） | 配方齐备、行程闭合 | 不可达 | — |
| W-65 | 剪 breaking 面（cloth/web 逐件） | `[MiningLog] tool decay face=breaking item=etim:shears_* block=web/cloth loss=N` | 七件同式（baseDecay 1.0 ⇒ web loss=10／wool loss=80） | 不可达 | — |
| W-66 | 剪羊 face | `[MiningLog] … face=shearing item=etim:shears_* loss=50` | 每件单次剪羊 loss=50 恰一行 | 不可达 | — |
| W-67 | 等级拒 face | `[MiningLog] mine deny grade=2 required=3 item=etim:shears_copper block=obsidian` | copper 剪（grade 2）× obsidian（min 3）出 deny；grade≥required 不出 | 不可达 | — |
| W-68 | gold 链甲 armor 实施 | `[EquipLog] gear item=etim:chain_*_gold … armor=<double>`（＋受击 Δdur 面） | armor 0.8333333333333334／1.3333333333333333／1.1666666666666667／0.6666666666666666；maxDamage 20/32/28/16 | 不可达 | — |
| W-69 | mixin 剪盘口径 | 代码锚盘核（4 mixin 位＋3 mining 位） | 7 处 `instanceof ETIMItemShears` 全位、零 `ETIMItemShearsRusted` 残引 | **静态已核 7/7 在位**（见 §4，非判值） | — |

> 判负纪律（铁律 5）：W-62 判 **✗** 即终局，不因前序判点未跑而改判据；W-63…W-69 记「不可达」而非「未通过」——boot 未达 `Done (`，服务器日志内无任何 `[EquipLog] gear`／`[MiningLog]`／`[TestLog] gear` 判行。

## §1 判行锚（档内真行号）

判据档：`testharness/build-logs/metgear-quickboot.out`＝**52,976 B／402 行**（CR 340／U+FFFD 0）；驱动日志 `metgear-quickboot-driver.log`。

```
127:  [13:14:5x] [MixinBooter]: Finished gathering 15 mods, took … ms.
340:  net.minecraftforge.fml.common.LoaderExceptionModCrash: Caught exception from Easy Times In Minecraft (etim)
342:  Caused by: java.lang.IllegalStateException: [ETIM] gear recipe count drifted: expected 35 batch rows
      (2 iron-nugget 9:1 + 5 scythe + 5 arrow + 5 dismantle + 1 sinew + 1 knife_flint + 6 chain form
       + 6 chain dismantle + 4 gold chain-armor, metgear 批 条 214), registered 29
343:      at io.github.etim.etim.metal.ETIMGear.registerRecipes(ETIMGear.java:280) ~[etim-1.0.0-dev.jar:?]
344:      at io.github.etim.etim.metal.ETIMGear.register(ETIMGear.java:119)
345:      at io.github.etim.etim.ETIM.preInit(ETIM.java:77)
```

**缺失面（应出未出）**：`Done (` 0 次｜`[EquipLog] durability reassert` 0 次｜`[TestLog] gear recipes registered` 0 次｜`Preparing level` 0 次｜`BUILD FAILED` 0 次（Gradle 侧随 JVM 崩退，`stop` 未达）。

崩溃卷：`run/crash-reports/crash-2026-11-01_13.14.58-server.txt`（8,043 B）。

## §2 A-1（A 级 · boot 硬阻断 · 判值级）

**症状**：boot 在 `preInit`（`ETIM.java:77` → `ETIMGear.register():119` → `registerRecipes():280`）抛 `IllegalStateException`，服务器未初始化、世界未创建、无任何判行。

**根因（逐行亲读 HEAD `5ac1a33`）**：闸值取自 **batch 增量**，而增量窗口抓晚了一格。

| 组 | 条数 | 出处 |
| --- | --- | --- |
| iron-nugget 9:1 对 | 2 | `ETIMGear.java:299`／`:301` |
| scythe ×5 | 5 | `:310` |
| arrow ×5 | 5 | `:313` |
| arrow dismantle ×5 | 5 | `:317` |
| chain form ×5 | 5 | `:324` |
| chain dismantle ×5 | 5 | `:330` |
| sinew | 1 | `:334` |
| knife_flint | 1 | `:337` |
| **`registerBatchRecipes()` 实测增量** | **29** | 闸实测值（日志 `registered 29`） |
| gold 链面 6 条（4 甲＋1 形＋1 拆） | 6 | `:259-267`——**在 `int before`（`:276`）之前** |
| 闸期望值 | **35** | `:279` `if (added != 35)`；消息串 `:280` 把这 6 条算进 35 |

> 注：消息串括注的分项（90 ingot-based＋4 rusted＋4 gold chain-armor）不参与闸判——闸只比 `added`；`etim-domain total` 含其它批次配方（unbreak 窗同串为 154），故 **35／160 是唯一硬值**。

⇒ 闸值 35 ＝ 29（batch 函数内）＋6（gold 链面，已先注册），但 `before` 在 gold 之后才取，`added` 恒 29 ⇒ 首刀必抛。

**修法方向（本窗未改码；交主会话落码）**：把 `int before = etimRecipeCount();` 由 `:276` 上移至 gold 链面块之前（可置于 `:252` 注释块前或 `:257` 之前）。此改动使 `added` ＝ 29＋6 ＝ **35**、`etim-domain total` ＝ 154＋6 ＝ **160**，与条 214 判窗预值（`132／35／160`）逐值对齐。闸值/消息串本身**不需改**（其词面已正确枚举 6 gold 行）。

**复验口径（下一窗）**：boot 达 `Done (` 后①`[EquipLog] durability reassert: 132 gear rows ok`；②`[TestLog] gear recipes registered: 35 batch rows ok (… etim-domain total 160 …)`。两条同现即 W-62 通过。

## §3 起收钉值（全同 ⇒ 零 rebuild／零改码／零 cfg 残留）

| 项 | 起（窗前面） | 收（窗后复核） | 判 |
| --- | --- | --- | --- |
| HEAD | `5ac1a339d1f4a3c07b3825f7a499f799bffb2ce2` | 同（窗内零提交、`git status --porcelain` 空） | ✓ |
| release jar | 780,413 B `CBE5E2E4…4B404` | byte-identical | ✓ |
| dev jar | 764,382 B `8A05918A…291A88C` | byte-identical | ✓ |
| sources jar | 709,378 B `040242B0…9BB370` | byte-identical | ✓ |
| 服务端 cfg | 32,095 B `E07CAC1E…7AE7F5` | byte-identical（本窗零 cfg 写） | ✓ |
| 客户端 cfg | 30,277 B `E37C1377…434F81C45` | byte-identical（零客户端） | ✓ |
| props | 890 B `30096338…571B654A48` | byte-identical（`level-name` 已回 `test27dev`） | ✓ |
| ops／usercache／usernamecache | 685／1,630／851 B | 三件 byte-identical（本窗未 `/op`、未连 bot） | ✓ |
| MK 双树（静态亲算） | refmap 62 类键·138 条目｜切片 4/4/3＝11｜mixins 56/10 | 双树同值；139/57/11 未现 | ✓ |
| 端口／crash／world | 0／18／— | 0／**19**／`metgearw62` 已删 | 见注 |
| Gradle | — | `runServer` 在 boot 前触发构建任务，三 jar SHA 收窗与起窗同值（零 rebuild） | ✓ 0 rebuild |

> **注（crash 基线）**：`run/crash-reports` 18 → **19**，新增件即本窗 A-1 boot 崩的 `crash-2026-11-01_13.14.58-server.txt`（8,043 B）。下一窗基线顺延为 **19**（A-1 修复后不应再增）。
> **进程侧**：窗后仅 Gradle daemon（PID 1744）＋ Gradle worker（PID 18284，构建期 worker），**零游戏 JVM／零客户端窗**。

## §4 静态预读（**非判**；只为下一窗备料，不作判值）

> 本节全部为代码锚直读（HEAD `5ac1a33`），**不计入 faces/checked**。A-1 修复后按 §0 表重判。

| 点 | 代码锚 | 预读结论 |
| --- | --- | --- |
| W-63 六剪 gear 行 | `ETIMGear.java:418-423`（六列式）＋`ETIMItemShears.java:42/47-59/73/79` | maxDamage＝`(int)(4.0F×2×durabilityFactor×100)`：copper/silver/gold **3200**、ancient **12800**、mithril **51200**、adamantium **204800**；efficiency 取 `metal.efficiency`（1.75/1.75/1.75/2.0/2.5/3.0）；grade 取 `metal.grade`（2/2/2/3/4/5）；burn 恒 100；armor 恒 0.0（非 `ETIMMetalArmor`） |
| W-63 gold 链甲四件 | `ETIMMetalArmor.java:58-59`＋`ETIMItemArmor` 六列 | maxDamage＝components×4（**20/32/28/16**）；armor＝components×(6−2)/24.0D＝**0.8333333333333334／1.3333333333333333／1.1666666666666667／0.6666666666666666** |
| W-64 gold 链配方 | `ETIMGear.java:252-267`（4 甲＋形＋拆，legacy 位）＋`:208-209`（库存位） | 6 条行在 `registerRecipes` legacy 段；`chain_gold` 件由 `chain()`（`:58`）注册，不入 `JUDGED_DURABILITY`（故 132＝139−7） |
| W-65 剪 breaking | `ETIMMining.java:419-421`（baseDecay 1.0）＋`:266-286`（`max((int)(hardness×100), (int)(100/20), 1)`） | web（表 hardness 0.1）⇒ **loss=10**；wool/cloth（表外，vanilla 0.8）⇒ **loss=80**；七件同值（材质只改 maxDamage 与效率门，不改 decay） |
| W-66 剪羊 face | `ETIMMining.java:329-340`（`SHEEP_SHEAR_WEAR=50`，creative 门先于发行）＋`MixinItemShears.java:133-146` | 单次剪羊 **loss=50**；`last-sig` 键 `face|item` ⇒ 同件只出一行（值判不判次，承 unbreak B-2 口径） |
| W-67 等级拒 | `ETIMMining.java:553-559`＋`:705-720`＋表 `:133 obsidian(hardness 2.4, min 3)` | copper 剪（grade 2）× obsidian ⇒ `mine deny grade=2 required=3 item=etim:shears_copper block=obsidian`；mithril 剪（grade 4）同块不出 deny |
| W-68 gold 链甲实施 | `ETIMMetalArmor.java:59/128/134`＋`R196ArmorModel.pieceBase`（`:189-195`） | `etimArmorPoints()` 直供 `pieceBase`；四件 4 点口径与铜链（7−2=5）半档差在 double 原值上可比 |
| W-69 七处判据位 | `ETIMMining.java:419／464／553`＋`MixinItemShears.java:51／90／133／180` | **7/7 在位**；全树 `ETIMItemShearsRusted` 残引 **0**（旧类已删）；refmap 切片 MixinItemShears 3 条未动 |

**预读风险登记（C 级，不阻塞判窗）**：

- **C-1（词面口径）**：`ETIMItemShears.java:21`／`:42` 注释称「same 3200 for every metal…（= 3200 for all seven）」，与 `ETIMMetals` 的 per-metal `durabilityFactor`（ancient 16／mithril 64／adamantium 256）——即与实测 maxDamage 12800/51200/204800——**不一致**；判值正本（摸底 §1.4＋终审 §四）为 per-metal 六值，本窗按判值正本记期望。条 214 C-新① 的同向词面亦属此列。建议下一窗判读前先把注释与判值正本对齐（只改注释，不改码）。
- **C-2（任务书词面）**：任务书 W-63 行写「maxDamage=3200 … grade=2」为铜/银/金三件模板值，套到 ancient/mithril/adamantium 会与判值正本冲突；本窗按判值正本 per-metal 记（见上表）。
- **C-3（W-65 判值形态）**：任务书 W-65「loss=mv」未给常数；按 `ETIMMining:280-281` 算式，loss 随方块 hardness 走（web 10／wool 80），非材质常数。下一窗须先把「用哪块、期望多少」写死再跑。

## §5 收口表

| 面 | 状态 |
| --- | --- |
| boot 计数 | **1／≤3**（CST 13:14:48 起 → 13:14:58 `Finished gathering 15 mods`（`:127`）→ 13:14:59 `LoaderExceptionModCrash`（`:340`）→ 崩溃退 JVM；无 `Done (`） |
| 客户端 | **零会话**（未拉起、未关窗、未抢焦点） |
| 端口 | 25565 LISTEN：起 0／收 0 |
| 崩溃 | `run/crash-reports` 18 → **19**（新增＝本窗 A-1 崩卷） |
| cfg／props／三 side 文件 | 服务端/客户端 cfg、props、ops、usercache、usernamecache 全 byte-identical |
| 世界 | `metgearw62` 已删（`run/metgearw62` 不存在） |
| rebuild | **0**（三 jar SHA 起收同值；窗内无源码改动） |
| 产品码 | 0 行改动（`git status --porcelain` 空；HEAD `5ac1a33` 未动） |
| 判窗工装 | 本次仅诊断 boot（`metgear-quickboot.js`，落临时目录不入库）；正式驱动 `testharness/player/metgear-w62.js` **未产**——boot 阻断，未有可判面 |

## §6 未覆盖面（不补白）

1. **W-63…W-69 全部判值面**：boot 未达 `Done (` ⇒ 服务器未初始化世界，`[EquipLog] gear` 六列 dump 与 `[MiningLog]`/`[TestLog]` 通道一条未出，故一律记「不可达」。
2. **W-64/W-68 的合成与受击实施面**：除配方行外，craft 结果与 armor 实施需 boot 后 `bot`/命令面，本窗零执行。
3. **客户端面**（`[SoundLog]` 剪羊音等）：CT-9 零客户端，不作判值。

## §7 自报（机械核讫）

> 文件：`testharness/reports/metgear-W62-verdict.md`｜字节五项以**档头规格行**为唯一自指固定点（本节不复述，避免双自指漂移）｜首字节 0x23｜U+FFFD 0｜CR 0
> 三口径家族（本档自定，与 unbreak-W50／capend-W49 同型）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序以换行连接成串，再对该串 SHA-256）。
> SHA-256 甲（全档零位）`A585D1A1850375A9FE51C2344FAC2179BD63213F0A1DAE65FFDDF5B3F01F7110`
> SHA-256 乙（LF 归零零位）`A585D1A1850375A9FE51C2344FAC2179BD63213F0A1DAE65FFDDF5B3F01F7110`
> SHA-256 丙（行链零位）`C871A751BA95DC0F735E361878D3759A338C0F67740E540083B119AF40210E47`
> 判格：W-62 单 ✗；W-63…W-69 七点不可达（未判）｜boot 1／≤3｜jar 三件 byte-identical／零 rebuild／零产品码／零 cfg 写／零客户端／世界已删｜冲突 A1 B0 C3。
