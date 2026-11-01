# unbreak 批（unbreaking 附魔面 · 非盾载体）· W-50…W-61 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（服务端日志 CST 12:01:36–12:12:02）｜**窗口**：单 boot 定本（本批第 4 次 boot；前三次＝冒烟 smk1／冒烟 smk2／假负正式窗 run1，逐条原因见 §4）｜**0 客户端**
> **报告字节规格**：`23,132 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 30 / ✗ 2｜213 行`
> **判据正本**：`playground/audit/unbreak-立项摸底.md` §6（W-50…W-61 十二点表）＋ §6.1（负证四向）；`playground/audit/unbreak-终审回执.md` §三（T-2 窗值全表 mean±3σ）／§四（T-4 甲面链与 n=1080 口径）／§五（T-5 五判值亲锚）／§七（B-1…B-4 与 U-1）；audit20 条 209 A-3（甲件 0.6F 返值方向、W-55/56 窗位互换、float32 串收口）＋条 210。
> **判据通道（全在役，零新建）**：
> - **主口径** bot 栈读数 `bot.heldItem.durabilityUsed`（甲臂＝`slots[5..8]` 四槽之和）；Δdur＝末值−初值。
> - `[MiningLog] tool decay face=<face> item=<reg>[ block=<b>] loss=<N>`（`mining/ETIMMining.java:743-760`；**last-sig 同键同值吞行** ⇒ loss 只作**值判**，不作次判）。
> - `[EnchantLog] table power=15 slot0=… slot1=… slot2=… power30=30 …`（W-60 附魔台算式；`CommandDevTest.java:381-384`）。
> - `[TestLog] step=dig-start|dig-stop|attack|hurt|useitem|release`（驱动落点回执）＋ `[EtimTest]` 命令回执。
> - 方块真值 `/testforblock <pos> minecraft:air`（服务端口径；bot 侧区块镜像不作为判据）。
> **判决**：**PASS** —— 12 判点 **12 ✓ / 0 ✗**（工具 4／攻击 1／甲 2／弓 1／presence 1／创造门 1／enchantability 1／到达性 1）；旁证 W-59x ✓（非判点）。零 rebuild、零产品码、零 cfg 写、零客户端、世界已删、起收钉值全 byte-identical。

## §0 判定总表（12 判点）

判据＝「Δdur 落窗（W-50 为恰值）」＋「本点段内判行词面逐位对上」＋「负证点行/栈双断言」。

| 点 | n | 操作（CST） | 实测 Δdur | 判据窗（vanilla，mean±3σ） | σ 位 | 判 |
| --- | --- | --- | --- | --- | --- | --- |
| W-50 | 6 掘 | 白板秘银镐 × stone @12:02:05–12:02:32 | **1440**（逐掘 240×6） | **恰值 1440**（L0 无抽骰，方差 0） | — | ✓ |
| W-51 | 6 掘 | L1 × stone @12:02:33–12:03:05 | **688** | [663.08, 776.92]（m=720） | −1.69σ | ✓ |
| W-52 | 6 掘 | L2 × stone @12:03:05–12:03:37 | **451** | [426.33, 533.67]（m=480） | −1.62σ | ✓ |
| W-53 | 6 掘 | L3 × stone @12:03:38–12:04:10 | **384** | [310.70, 409.30]（m=360） | +1.46σ | ✓ |
| W-54 | 12 击 | L3 攻击 zombie(200HP) @12:04:10–12:04:42 | **332** | [255.00, 345.00]（m=300） | +2.13σ | ✓ |
| W-55 | 120 击 | 秘银四件套 L1 受击 @12:04:43–12:06:09 | **876** | [824.56, 903.44]（m=864） | +0.91σ | ✓ |
| W-56 | 120 击 | 秘银四件套 L3 受击 @12:06:09–12:07:36 | **764** | [710.82, 801.18]（m=756） | +0.53σ | ✓ |
| W-57 | 140 箭 | 弓 L3 放箭 @12:07:37–12:11:07 | **37** | [19.63, 50.37]（m=35） | +0.39σ | ✓ |
| W-58 | 各 1 掘 | 铲×dirt／斧×log／锄×dirt @12:11:07–12:11:32 | **25／120／100** | Δdur>0 ＋ loss 逐值 25/120/100 | — | ✓ |
| W-59 | 1 掘＋1 击 | 创造门 @12:11:33–12:11:43 | **0**（breaking）＋**0**（attacking 旁证） | Δdur=0 ＋ `loss=0` 行 | — | ✓ |
| W-60 | 2 探针 | rusted／mithril enchantprobe @12:11:44–12:11:46 | p15 0/0/0＋p30 0/0/0 ／ p15 4/16/30＋p30 6/17/30 | 锈铁六格全 0；对照 slot2=30 且 slot0/1 非 0 | — | ✓ |
| W-61 | 5 抛收 | 鱼竿对 6×5 水池 @12:11:46–12:12:00 | **2／2／2／2／2** | 每次 ∈ {0,1,2,3,5}（C-5 词面），只判可达 | — | ✓ |
| W-59x | 1 击 | 创造持同镐击 zombie（旁证·非判点） | **0** | `[MiningLog] … face=attacking … loss=0` | — | ✓ |

**判值要点（逐条亲验）**：

- **定标臂 W-50**：六掘逐次 240/480/720/960/1200/1440，**步长恒 240、末值恰 1440**；与 T-5 名义 loss 算式 `max((int)(2.4×100×1.0), (int)(100×1.0/20))=240` 逐位同。该臂无抽骰（`attemptDamageItem` 的 `i>0` 循环门：无附魔 ⇒ 不执行）⇒ 方差 0 成立，其余各窗的值链以此为基线。
- **非甲支三档**：否定率实测 p ＝ 1−Δdur/n ＝ **0.5222**（L1）／**0.6868**（L2）／**0.7333**（L3），对应 vanilla 理论 p ＝ 0.5／0.6667／0.75（差 +0.022／+0.020／−0.017）。三档与 R196 对照窗（1224／1008／792）**全部不交**（差 −536／−557／−408），跨代分离成立。
- **攻击臂 W-54**：12 次攻击全部命中（`accepted=12/attempts=12`，出手间隔 ≈28 t ＞21 t 清冷却），Δdur 332 ⇒ 每击 27.7 ≒ 100×0.25；旁证行 `face=attacking item=etim:pickaxe_mithril loss=100` 恰 1 条（末次 100 与首值同 ⇒ 吞行，值判成立）。
- **甲件支 W-55**：p 实测 ＝ 1−876/1080 ＝ **0.1889**（理论 0.2）；**工具支假说（q=0.5 ⇒ 540 ∈ [490.70,589.30]）与 R196 L1（918 ∈ [882.80,953.20]）双排除**——876 < 882.80，两窗皆不纳。0.6F 门在位、甲件支成立（U-1 分枝排除臂职能达成）。
- **甲件支 W-56（跨代判别主层）**：p 实测 ＝ 1−764/1080 ＝ **0.2926**（理论 0.3）；vanilla 窗 [710.82,801.18] 纳，R196 [544.95,643.05] 与「0.6F 门丢失假说」[227.31,312.69] **双双不纳**（gap 121／451）⇒ A-3-1 勘正后的 L3 判别力在段成立。
- **弓臂 W-57**：140 箭全发（`shots=140`，箭耗 256→116 = **140**）、Δdur 37 ⇒ 每箭 0.264 ≒ 0.25；R196 窗 [59.34,94.66] 不纳。
- **presence W-58**：三臂 Δdur 与判行 loss **逐值同**（25/25、120/120、100/100），锄走 `ETIMItemHoe:117-128` 自链（非 MixinItemTool）经 `loss=100` 行确认。
- **创造门 W-59**：breaking Δdur=0 且方块已被移除（`/testforblock … air` 成功）⇒ 创造不磨损；**breaking 面 `loss=0` 行在 1.12 结构不可达**（见 §4 B-1），门行由同族 attacking 面 W-59x 读取：`loss=0` 且 Δdur=0（行与栈同零，条 157 lying-row 教训双断言）。
- **enchantability W-60**：锈铁 `p15=[0,0,0] p30=[0,0,0]` 六格全 0；对照秘银 `p15=[4,16,30] p30=[6,17,30]`（slot2 恒 30 = `power×2` 下界），非零侧成立。
- **到达性 W-61**：5 次抛收每次 Δdur=2（cast 1 ＋ reel 1），全部 ∈ {0,1,2,3,5}；拉实体支（3/5）本窗未触发，按「只判可达不判窗」处置。

## §1 逐点锚（`.out` 档内真行号）

档：`testharness/build-logs/unbreak-w50.out`＝**1,835,221 B／14,096 行**（U+FFFD 0）。行号只作定位，判行按词面复核。段界＝`[Server] UNB-<id>-BEGIN/END`。

| 点 | BEGIN | END | 判行（.out 行号） |
| --- | --- | --- | --- |
| W-50 | 4144 @12:02:05 | 4693 @12:02:32 | **4237** `[MiningLog] tool decay face=breaking item=etim:pickaxe_mithril block=stone loss=240 [server]` |
| W-51 | 4699 @12:02:33 | 5248 @12:03:05 | 无新行（同键同值 240 被 last-sig 吞；Δdur=688） |
| W-52 | 5254 @12:03:05 | 5802 @12:03:37 | 同上（Δdur=451） |
| W-53 | 5808 @12:03:38 | 6357 @12:04:10 | 同上（Δdur=384） |
| W-54 | 6363 @12:04:10 | 6490 @12:04:42 | **6385** `[MiningLog] tool decay face=attacking item=etim:pickaxe_mithril loss=100 [server]` |
| W-55 | 6496 @12:04:43 | 7746 @12:06:09 | 栈读数（240 条 `step=hurt`，无 [MiningLog] 面） |
| W-56 | 7752 @12:06:09 | 8994 @12:07:36 | 同上 |
| W-57 | 9000 @12:07:37 | 13411 @12:11:07 | 栈读数（140 对 `step=useitem/release`） |
| W-58 | 13417 @12:11:07 | 13957 @12:11:32 | **13514** 铲 loss=25｜**13754** 斧 loss=120｜**13953** 锄 loss=100 |
| W-59 | 13963 @12:11:33 | 13998 @12:11:43 | **13993** `[MiningLog] tool decay face=attacking item=etim:pickaxe_mithril loss=0 [server]`（W-59x） |
| W-60 | 14004 @12:11:44 | 14020 @12:11:46 | **14008** probe rusted｜**14010** `table power=15 slot0=0 slot1=0 slot2=0 power30=30 slot0=0 slot1=0 slot2=0`｜**14015** probe mithril｜**14017** `table … slot0=4 slot1=16 slot2=30 power30=30 slot0=6 slot1=17 slot2=30` |
| W-61 | 14026 @12:11:46 | 14060 @12:12:00 | 栈读数（5 对 `step=useitem`） |

判行原句（摘录）：

```
127:  [12:01:42] [MixinBooter]: Finished gathering 15 mods, took 1761 ms.
510:  [12:01:49] Preparing level "unbreakw50"
2256: [12:01:55] Done (6.192s)! For help, type "help" or "?"
4237: [12:02:10] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:pickaxe_mithril block=stone loss=240 [server]
6385: [12:04:21] [Easy Times In Minecraft]: [MiningLog] tool decay face=attacking item=etim:pickaxe_mithril loss=100 [server]
13514: [12:11:12] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:shovel_mithril block=dirt loss=25 [server]
13754: [12:11:22] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:axe_mithril block=log loss=120 [server]
13953: [12:11:31] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:hoe_mithril block=dirt loss=100 [server]
13993: [12:11:41] [Easy Times In Minecraft]: [MiningLog] tool decay face=attacking item=etim:pickaxe_mithril loss=0 [server]
14010: [12:11:44] [Easy Times In Minecraft]: [EnchantLog] table power=15 slot0=0 slot1=0 slot2=0 power30=30 slot0=0 slot1=0 slot2=0 bound=slot0:2..10,slot1:6..21,slot2:30..30 (power clamped to 15) [server]
14017: [12:11:45] [Easy Times In Minecraft]: [EnchantLog] table power=15 slot0=4 slot1=16 slot2=30 power30=30 slot0=6 slot1=17 slot2=30 bound=slot0:2..10,slot1:6..21,slot2:30..30 (power clamped to 15) [server]
14074: [12:12:01] Stopping server
14093: BUILD SUCCESSFUL in 10m 24s
```

## §2 通道计数（全窗，档内直数；与驱动 `points[]` 12/12 全等）

| 通道 | 全窗条数 | 分解 |
| --- | --- | --- |
| `[MiningLog] face=breaking` | **4** | W-50 stone 240／W-58 dirt 25・log 120・dirt 100 |
| `[MiningLog] face=attacking` | **2** | W-54 loss=100／W-59x loss=0 |
| `[EnchantLog] table` | **2** | W-60 rusted／mithril |
| `[EnchantLog] enchantprobe` | **2** | 同上（carrier 行） |
| `[TestLog] step=hurt` | **240** | W-55 120 ＋ W-56 120（全部 `amount=9.000`） |
| `[TestLog] step=attack` | **13** | W-54 12 ＋ W-59x 1 |
| `NO_TARGET` | **0** | 定本窗零选择器失配 |
| Mixin 失败三型 | **0** | `Mixin apply failed`／`MixinException`／`InvalidInjectionException` |

靶面：单只 `minecraft:zombie`（`{Tags:["unbZ"],NoAI:1b,Silent:1b,PersistenceRequired:1b,maxHealth 200,Health 200f}`），W-54 与 W-55/W-56/W-59x 各 `kill → summon` 单体重建（`matchOneEntity` 要求恰 1 命中）。甲臂 120 击 × 9 点 = 1080 名义；四件套 `MAX_DAMAGE` 640/1024/896/512（Σ3072）全程未穿壳。

## §3 起收钉值（全同 ⇒ 零 rebuild／零产品码／零 cfg 残留）

| 项 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `9d75649836fc4e857231aa2081e0c21e0a9ab4c2` | 同（窗内零提交） | ✓ |
| release jar | 776,797 B `1073A59A…3E998B3E` | byte-identical | ✓ |
| dev jar | 760,949 B `8BC04E70…28EBF421` | byte-identical | ✓ |
| sources jar | 705,207 B `E4B38D9E…07DA417F` | byte-identical | ✓ |
| 服务端 cfg | 32,095 B `E07CAC1E…7E7AE7F5` | byte-identical（本窗**零 cfg 写**） | ✓ |
| 客户端 cfg | 30,277 B `E37C1377…434F81C45` | byte-identical（零客户端） | ✓ |
| props | 890 B `3009633863…571B654A48` | byte-identical（`level-name` 回 `test27dev`） | ✓ |
| ops／usercache／usernamecache | 685／1,630／851 B | 三件 byte-identical（判窗期 `/op` 已还原） | ✓ |
| MK 双树 | mixins 56／client 10｜refmap 62 类键·138 条目｜切片 4/4/3＝11 | 双树同值 | ✓ |
| 端口／crash／world | 0／18／— | 0／18／`unbreakw50` 已删 | ✓ |
| Gradle | — | `:compileJava/:classes/:jar` 全 **UP-TO-DATE**；`:runServer`＋`:etimExtrasOffRestore` 为窗内执行项；三 jar SHA 起收同值；`BUILD SUCCESSFUL in 10m 24s`（`:14093`）；`stop` exitCode **0** | ✓ 0 rebuild |

判值前提四亲读（boot 前 cfg）：`miningReform=true`／`miningDebugLog=true`／`armorModelR196=true`／`attackHungerPerHit=0.3`／`enduranceModifierStep=0.2`。**本批零 cfg 写**：三键全默认，收口只做 props/ops 快照还原。

## §4 冲突分级（A 0／B 2／C 6）

### A 级（产品码）
- **无。** 12 判点全 ✓，无一条判值出窗。

### B 级（判据通道/词面缺口，落下一窗任务书）
- **B-1（W-59 second-half 词面不可达）**：任务书 W-59 要求 breaking 面出 `loss=0` 行。1.12 `PlayerInteractionManager.tryHarvestBlock` 的创造分支（`:333-337`）**直接 `removeBlock` 并提前返回，不经 `:346 itemstack.onBlockDestroyed`** ⇒ `ETIMMining:271` 的创造门（loss=0 行）在 breaking 面**结构性不可达**（非产品缺陷；前窗 attgate W-41 的创造门行是 attacking 面，`ItemStack.hitEntity` 无此早退）。本窗处置：breaking 面只判 `Δdur=0`（＋air 已移除），门行改由同族 attacking 面 W-59x 读取。**建议**：下一窗把 W-59 判据表词面改为「breaking 面 Δdur=0 ＋ attacking 面 loss=0」。
- **B-2（`[MiningLog]` 次判不可用，承条 157 C-3）**：`ETIMMining:743-760` last-sig 键 `face|item|block` 同值吞行 ⇒ W-51/W-52/W-53 的 6 掘只可能留 1 行（W-50 已出 240），故 loss 只能作**值判**；点数一律以 Δdur 为准。判窗任务书须保留此词面。

### C 级（登记不阻塞；本批工装演化四轮，逐轮卷在案）
- **C-1（smk1 · 三处工装缺陷）**：① 玩家发送者无 `@e` 权限（`canUseCommand(1,"@")`）⇒ `/etest attack`、`/etest hurt <mob>` 全 NO_TARGET；② 非 op 玩家受出生点保护（`isSpawnProtected` 的 `canUseCommand(2)`）⇒ `onBlockClicked` 静默拒挖，breaking 面零行；③ `/give` 上限 64（240 被拒）。修法：`/op <bot>`（ops.json 快照，收口 byte-identical）＋箭分四次 64。卷：`unbreak-w50-smk1*`。
- **C-2（smk2 · 两处工装缺陷）**：① 1.12 `/testfor` 成功行是「Found Zombie」而非「Found N matching」⇒ 自设探活失配导致**重复召唤**，`matchOneEntity` 因 `size≠1` 返回 null（该窗 NO_TARGET 共 46 条）；② `bot.blockAt` 对 setblock/破坏后的区块镜像不总刷新 ⇒ air 判据假负（W-50 六掘 240/480/…/1440 全对而 air 全 false）。修法：靶体 `kill→summon` 单体重建；方块真值改 `/testforblock` 服务端口径。卷：`unbreak-w50-smk2*`。
- **C-3（run1 · 三处工装缺陷）**：① `testforblock` 轮询窗 1.5 s < 1.12 dig 落块延迟（dirt ≈60 t）⇒ W-50…W-53 air 假负；② 同一延迟导致 W-58 斧臂与上一击 dig 循环重叠 ⇒ 斧 Δdur=0、无行；③ W-57 的 140 箭把 W-59x 的靶打死 ⇒ 旁证 NO_TARGET。修法：air 门改 16 s 串行化；W-59 旁证前重建靶。卷：`unbreak-w50-run1/`（9 件，含 1,864,573 B 的 `.out`）。
- **C-4（`/gamemode 2` 数值歧义）**：1.12 的 2＝冒险模式，创造为 1；按任务书「按 creative 表达意执行」落 `/gamemode 1`，完即回 0。
- **C-5（受击源选型 · 与任务书建议不同）**：任务书建议复用 `/etimghost hurt`。该口以**玩家自身**为 trueSource（`EntityDamageSource("etimspectral", player)`），35 级近战系数 `1+35×0.005=1.175` 把 raw 抬到 10.575（**磨额仍 `min(9, raw)=9` 不变**，但出伤 1.575／击、属跨面污染）。本窗改用 `causeMobDamage`（`/etest hurt @e[tag=unbZ] 9`）：无 level 系数、不过甲门，磨额同额 9/击。240 条 `step=hurt` 全走 mob 口（`source=mob`，零 fallback）。
- **C-6（W-60 判值界重印）**：任务书写对照「槽0∈[3,10]／槽1∈[7,21]」，1.12 源码算式（`EnchantmentHelper:356-365`，power 夹 15）实为 slot0∈[2,10]／slot1∈[6,21]（行内自印 `bound=slot0:2..10,slot1:6..21`）。本窗判值取「零 vs 非零 ＋ slot2=30」，实测 4/16 两界皆纳，界差只登记不改判。

## §5 待裁位

| # | 待裁 | 选项 | 倾向 |
| --- | --- | --- | --- |
| D-1 | **boot 计数＝4**（2 冒烟＋1 假负正式窗＋1 定本），超任务书「≤3」 | (a) 认账（三次均为工装面缺陷，非产品；每轮卷在案）／(b) 要求并窗重跑 | **(a)**：定本窗为单 boot 12 点全跑，前三次零产品码、零 cfg 写，判值不受影响 |
| D-2 | **W-59 判据词面**（B-1） | (a) 下一窗改为「breaking Δdur=0 ＋ attacking loss=0」／(b) 维持原词面并接受 breaking 行永缺 | **(a)** |
| D-3 | **W-54 的 +2.13σ 与 W-57 的 37** 是否加样 | (a) 不加（n 按终审 §三定死，本窗在窗内）／(b) 补 `-retest` 加样 | **(a)**：纪律「先样本后结论」 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 boot（定本窗） | CST 12:01:36 驱动起 → 12:01:42 `Finished gathering 15 mods` `:127` → 12:01:49 `Preparing level "unbreakw50"` `:510` → **12:01:55 `Done (6.192s)` `:2256`** → 12 判点（12:02:05–12:12:00）→ 12:12:01 `Stopping server` `:14074` → **`BUILD SUCCESSFUL in 10m 24s` `:14093`**，`stop` exitCode 0 |
| 客户端 | **零会话**（未拉起、未关窗、未抢焦点） |
| 端口 | 25565 LISTEN：起 0／收 0 |
| 崩溃 | `run/crash-reports` 18 → 18 |
| cfg／props／三 side 文件 | 服务端/客户端 cfg、props、ops、usercache、usernamecache 全 byte-identical |
| 世界 | `unbreakw50` 已删 |
| rebuild | **0**（三构建任务 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅 capend 两件＋本批两件 untracked；HEAD `9d75649` 未动） |
| 时钟口径 | 驱动时间戳 UTC（`04:xx`）／服务端日志 CST（`12:xx`，+8 h）；本回执锚只认档内行号与行首时刻 |

## §7 工装与复跑

### 7.1 驱动

`testharness/player/unbreak-w50.js`＝capend-w49/chaincraft-w48 的骨（PIN／MK／`startServer`／`say` 段标／evidence JSON／收口快照）＋本批 12 点表内嵌。

- 环境变量：`W50_ONLY=W50,W58`（判点裁剪）｜`W50_STAGE=<tag>`（`.out` 名隔离）｜`W50_SMOKE=1`（缩样冒烟：W-54→3 击、W-55/56→25 击、W-57→10 箭、W-61→3 抛，不判）。
- 判据原语：`durOf(bot)`／`armorDurs(bot)`（`slots[5..8]`）／`confirmAir`（`/testforblock`，16 s 串行门）／`hurtOnce`（mob 源）／`attackOnce`／`ensureZombie`（kill→summon 单体重建）。
- 靶面：`unbreakw50` 世界，bot 落 9×9 石台（`by-1` 地台）；挖点 `(bx+2, by, bz)` 与 `(bx+2, by, bz+2)`；水池 `bx-9…bx-5 × bz-2…bz+2`（by-1 层水）。
- 时序：挖点每掘 `setblock → /etest dig（START+40t 后 STOP）→ 等 [TestLog] dig-stop → testforblock air（≤16 s）`；受击间隔 520 ms ≈ 11 t（`hurtResistantTime=20` 的半窗）；攻击间隔 1.15 s ≈ 23 t（清攻击冷却）；每 10 击回中并 `etest health 20`。

### 7.2 判行复核（可直接粘贴）

```powershell
# 破块/攻击衰减行（值判）
Select-String -Path testharness\build-logs\unbreak-w50.out -Pattern '\[MiningLog\] tool decay'
# 附魔台算式（W-60）
Select-String -Path testharness\build-logs\unbreak-w50.out -Pattern '\[EnchantLog\] table'
# 受击/攻击流水（W-54/55/56/59x）
Select-String -Path testharness\build-logs\unbreak-w50.out -Pattern '\[TestLog\] step=(hurt|attack)'
# Mixin 失败（应 0）
Select-String -Path testharness\build-logs\unbreak-w50.out -Pattern 'Mixin apply failed|MixinException|InvalidInjectionException'
```

### 7.3 复跑

```powershell
cd "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
# 全窗（单 boot，12 点，收窗自动回填 cfg/props/ops/world）
node testharness\player\unbreak-w50.js unbreak-w50
# 冒烟（缩样，不判）
$env:W50_SMOKE='1'; $env:W50_ONLY='W50,W54,W55,W58,W60'; $env:W50_STAGE='unbreak-w50-smk'; node testharness\player\unbreak-w50.js unbreak-w50-smk
```

### 7.4 证据卷（`testharness/build-logs/`）

`unbreak-w50.out`（1,835,221 B／14,096 行，判行正本）｜`-session-1.log`（1,779,106 B）｜`-session-1.out`（1,835,221 B）｜`-driver.log`（163,818 B／1,542 行）｜`-evidence.json`（125,415 B，逐点 checks／observed／rows／pins）｜`-etim.cfg.before`（32,095）／`-client-etim.cfg.before`（30,277）／`-server.properties.before`（890）／`-ops.json.before`（685）／`-usercache.json.before`（1,630）／`-usernamecache.json.before`（851）｜冒烟 `unbreak-w50-smk1*`（C-1 佐证）／`unbreak-w50-smk2*`（C-2 佐证）｜假负正式窗 `unbreak-w50-run1/`（9 件，C-3 佐证）。

## §8 未覆盖面（不补白）

1. **W-55 的跨代分离**：vanilla L1 窗与 R196 L1 窗在 [882.80, 903.44] 交叠（终审 §三 T-2 已定），本点只作「分枝排除臂」，**不做跨代判别**；跨代判别由 W-56 承载。
2. **W-61 的拉实体支（3/5）**：本窗 5 次抛收全部 Δdur=2，未触发拉实体；按 C-5 词面只判可达。
3. **`loss=0` 行的 breaking 面**：见 B-1，1.12 结构不可达。
4. **R196 对照窗**：只作分离性对照，不占判据位（D-6 承条 125/126）。
5. **客户端面**：HUD/tooltip/手感零客户端，不作判值。
6. **`[EnchantLog] enchantprobe` 的 `canApply/maxLevel` 属 PIERCING 面**：本窗只取 `slot=`/`item=` 作载体真值（承 capend C-6 同族）。
7. **W-55/W-56 的 `playerHealOnLevelUp` 与等级回补面**：属 capend 批已判域，本窗只用 `/etest level 35` 立 20 点血帽。

## §9 自报（机械核讫）

> 文件：`testharness/reports/unbreak-W50-verdict.md`｜字节五项以**档头规格行**为唯一自指固定点（本节不复述，避免双自指漂移）｜首字节 0x23｜U+FFFD 0｜CR 0
> 三口径家族（本档自定，与 capend 摸底 §11／unbreak 摸底 §8 同型）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序以换行连接成串，再对该串 SHA-256）。
> SHA-256 甲（全档零位）`3EFA14EBC02187ED96461331A6D47D49A0A4CC2B1E01D3841BD07929B02F015D`
> SHA-256 乙（LF 归零零位）`3EFA14EBC02187ED96461331A6D47D49A0A4CC2B1E01D3841BD07929B02F015D`
> SHA-256 丙（行链零位）`638DFE5580F70E3CC7B7A4FB10B1BB1CC478E8B31298CCE7D9A9923471BE8521`
> 判格 12 全 ✓＋旁证 W-59x ✓｜`[MiningLog] breaking` 4／`attacking` 2／`[EnchantLog]` table 2・probe 2／`step=hurt` 240／`step=attack` 13／NO_TARGET 0／Mixin 0｜冲突 A0 B2 C6｜待裁 D-3｜jar 三件 byte-identical／零 rebuild／零产品码／零 cfg 写／零客户端。
> 叉号口径：本档叉号仅 2 处——档头规格行自身字形一处、判决行「零叉」占位一处；正文 12 判格全对号，无失实叉号。
