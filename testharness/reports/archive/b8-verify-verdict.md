# 干旱死亡面 · **W-B8 判决**（B-8 批，D-4 乙补面，HEAD `40794da`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 4 boot**（b1 主判面 R1..R6＋R9＋R10／b2 总开关关／b3 恢复＋chance 1.0 自然面／b4 chance 0.0 净窗）；**0 客户端／0 产品码／0 rebuild**／单假人 `ETIM_F7`
> **报告字节规格**：`16,853 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 15 / ✗ 4｜93 行`
> **判决源**：W-B8 任务书（2026-11-05，HEAD `40794da`）＋ `playground/audit/drought-death-立项摸底.md` ＋ audit20 条 296
> **钉值核验**：HEAD **`40794da`**（窗内零提交）｜release **988,364 B** `D4062B20…9530` 相符｜dev **968,826 B** `5F0449E3…222C` 相符｜sources 898,810 B `BACC5604…BD88` 相符｜mixins **73**＋client 10｜refmap **77/169**（双树同）｜cfg **注册 240 键**（文件 242＝240＋2 历史孤儿键）
> **判决**：**PASS**（R1..R10 **✓10／✗0**）｜A 0／**B 1**（B-8-1 死块显示名）／C 7（工装与簿记，均不影响判值）
> **一句话**：成熟旱收 1 行 `drop=minecraft:wheat#1`＋位清空、未熟 0/3/5/6 四龄死块 AGE 全等、双 stem 死藤、水/冰/雪三形免死牌、湿田 skip-not-dry 与 120 s 自然车道（干田 48 门行/3 死、湿田 0/0）、死块四负性、总开关关 0 行/开恢复、chance 1.0 两秒出自然死、chance 0.0 54 s 40 门行 0 事件、AILog/施肥三臂/26 token 全绿——判值全部按 R196 一手落行。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1** 成熟旱收 | `[FarmLog] drought event kind=mature … drop=minecraft:wheat#1`＋`testforblock … air` | 恰 1 行；位 air | 1 行：`force block=minecraft:wheat age=7 pos=186,100,790 dry=1 water=0 master=1 p=1.00 drought event kind=mature … roll=0.613 drop=minecraft:wheat#1`；位 **air** ✓；掉落实体见 §3.3（远位复验 `Found item.item.wheat`） | ✓ |
| **R2** 未熟死株龄位 | `event kind=immature … dead=etim:dead_crop age=N`＋`testforblock etim:dead_crop N` | 0/3/5/6 四龄各 1 行，dead_age＝源 age | age **0**（roll 0.741）／**3**（0.723）／**5**（0.204）／**6**（0.186）各 1 行；四格 `testforblock etim:dead_crop <age>` 全中 | ✓ |
| **R3** 死藤载体 | `event kind=immature … dead=etim:dead_stem age=N`＋`testforblock etim:dead_stem N` | pumpkin 4／melon 1 | pumpkin_stem age=4 roll 0.797 → `dead=etim:dead_stem age=4`、位中；melon_stem age=1 roll 0.735 → `age=1`、位中 | ✓ |
| **R4** 免死牌双支 | `branch=skip-water`＋块不动；撤水后正常 event | 水/冰/雪三形全免；撤水即死 | 水（3 格外，`water=1`）→ `skip-water`，麦 age2 原样；撤水后 `water=0`→`event kind=immature … dead=etim:dead_crop age=2`、位中；冰（3×2×3 邻位，`water=1`）→ `skip-water`；雪层（`water=1`）→ `skip-water`；两形位均未动 | ✓ |
| **R5** 湿田门＋自然车道 | `branch=skip-not-dry`；120 s 自然：`growth gate dry` 行照旧、湿田 0 event | 湿田不滚；干田 gate 行≥1；湿田 event=0 | 湿田 probe `dry=0 water=0`→`skip-not-dry`、麦 age2 未动；120 s（rts 3）干田 **48 门行／3 死**、湿田 **0 门行／0 死**；干田存活株 `wheat age=2` 仍中 | ✓ |
| **R6** 死块四负性 | ①骨粉无变 ②断无掉 ③rts50 30 s 不复活 ④give 无此物 | ①位不变无行 ②位 air 无 etim 掉 ③位/龄不漂 ④unknown item | ①`etim:dead_crop 3` 仍中、该位 **0 行**（切片内唯一 `[FarmLog]` 是 236,63,769 的环境掉粪，非本面）②破后位 **air**、`kill @e[type=item]` **found nothing**（§3.3 远位复验：实体 0、破后携带 0）③rts 50×30 s 后仍 `etim:dead_crop 3`、该位 0 行 ④`There is no such item with name etim:dead_crop` | ✓ |
| **R7** 总开关双支 | `branch=skip-master-off`；恢复 true 后 probe `master=1` | 关：force 0 事件＋自然 0 事件；开：master=1 | b2（`droughtDeathR196=false`）：probe `master=0 chance=0.05`、force 行 `branch=skip-master-off`、麦 age2 未动；rts 50×20 s 自然 **177 门行／0 事件**。b3（true）probe `master=1 chance=1.00` | ✓ |
| **R8** 概率参数面 | chance 1.0 自然出 event；chance 0.0 同窗 event=0；收口键数 | 1.0：10 min 内必出；0.0：0 | b3：probe `chance=1.00`、7×7 干田自然面 **首事件 2.0 s**、patch 内 7 门行／7 事件；b4：probe `chance=0.00`、**54.1 s 内 40 门行／patch 0 事件／全档 0 事件**；收口注册 **240** 键 | ✓ |
| **R9** 零回归抽验 | 干田自然冻结行照旧；施肥三臂行照旧；`/etest` 其余 token 各一发；五通道 kill 面 0 | 行照旧、不炸 | 干田 `growth gate dry block=minecraft:wheat` **228 行**（b1）；施肥三臂：`chain=farm soilEnrichment=1`（另有既有 `fertilized set` 行）／`chain=mycelium roll=none stage=1/3 giant=0`／`kind=brown roll=0.32 stage=2/3 giant=0`；**26 token 全发、tokenErrors 0、服务器存活**；Melee/Mining/Butch/Arrow/Cap **0**（Enchant 4 行为显式 token 输出、Damage 175＝169 清场 outOfWorld＋6 只环境鸡 inWall、Food 42＝41 digDrain＋1 consumed） | ✓ |
| **R10** 载体落位洁癖 | 同 chunk 邻株 `wheat age=1` 一个观察期不动 | 邻株原 age、死块仍在 | 邻株（186,100,792）60 s 后 `wheat 1` 仍中；同 chunk 目标（186,100,790）`dead_crop 3` 仍中；观察期 `drought|growth gate` 行 **0** | ✓ |

> 判格 **✓10／✗0**；B 级 1（B-8-1，仅显示名）｜C 级 7（见 §5）。

## §1 判据行样本（正本 `f8-dr-verify-b1.out`／`-b2.out`／`-b3.out`／`-b4.out`）

- **R1**：`[FarmLog] drought force block=minecraft:wheat age=7 pos=186,100,790 dry=1 water=0 master=1 p=1.00 drought event kind=mature block=minecraft:wheat age=7 pos=186,100,790 roll=0.613 drop=minecraft:wheat#1 [server]`
- **R2**：`… age=0 … roll=0.741 dead=etim:dead_crop age=0`；`age=3 roll=0.723 … age=3`；`age=5 roll=0.204 … age=5`；`age=6 roll=0.186 … age=6`。
- **R3**：`… block=minecraft:pumpkin_stem age=4 … roll=0.797 dead=etim:dead_stem age=4`；`… melon_stem age=1 … roll=0.735 dead=etim:dead_stem age=1`。
- **R4**：`… pos=196,100,790 dry=1 water=1 master=1 p=1.00 branch=skip-water (death-exempt face)`；撤水后 `… water=0 … drought event kind=immature … dead=etim:dead_crop age=2`；冰 `pos=180,100,790 … water=1 … skip-water`；雪 `pos=182,100,790 … water=1 … skip-water`。
- **R5**：`… pos=176,100,790 dry=0 water=0 master=1 p=1.00 branch=skip-not-dry (drought only rolls behind the freeze gate)`；自然车道 `[FarmLog] growth gate dry block=minecraft:wheat pos=168,100,791 [server]`（干田 48 行）；湿田区无 `growth gate dry`/`drought event` 行。
- **R6**：骨粉后 `testforblock … etim:dead_crop 3` → `Successfully found the block`；破后 `testforblock … minecraft:air` → `Successfully found the block`、`Selector '@e[type=item,x=185,y=99,z=792,dx=4,dy=4,dz=4]' found nothing`；rts 50 后仍 `etim:dead_crop 3`；`give … etim:dead_crop 1` → `There is no such item with name etim:dead_crop`。
- **R7**：`[FarmLog] drought force block=minecraft:wheat age=2 pos=186,100,790 dry=1 water=0 master=0 p=1.00 branch=skip-master-off [server]`。
- **R8**：b3 `[FarmLog]  drought event kind=immature block=minecraft:wheat age=2 pos=160,100,786 roll=0.034 dead=etim:dead_crop age=2 [server]`（自然行族首空格为双空格，见 C-8-1）；b4 probe `… chance=0.00 [server]`。
- **R9**：`[FarmLog] fertilize src=manure chain=farm soilEnrichment=1 [server]`；`[FarmLog] fertilize src=manure chain=mycelium roll=none stage=1/3 giant=0 [server]`；`[FarmLog] fertilize src=manure kind=brown roll=0.32 stage=2/3 giant=0 [server]`。
- **R10**：邻株 `testforblock 186 100 792 minecraft:wheat 1` 与目标 `testforblock 186 100 790 etim:dead_crop 3` 双双 `Successfully found the block`。

## §2 机制与口径

- **M1 旱死门**（R196 `BlockCrops.updateTick :66-74`）：`growth_rate == 0.0F && !BlockFarmland.isWaterNearby` → `rand.nextFloat() < 0.05F` 才滚死；成熟走旱收（`:70-71` 掉 1×作物＋清位），未熟换死作物块并保留生长位（`:73`）。
- **1.12 适配口径（D-3 最小面）**：`growth_rate == 0` 在 ETIM 映射为**干田冻结门**（条 283 的 `isDryFarmland`）；温度死区面（`getGrowthRate` 全家）仍挂账，不属本批。旱死臂挂在 `MixinBlockCropsTick`／`MixinBlockStemTick` 的 HEAD，**在冻结 cancel 之前**、gate 行之后（freeze 判值字节不变，纯增量）。
- **M2 免死牌**：`ETIMFarm.waterNearbyR196`（R196 `BlockFarmland.isWaterNearby :106-128`）——9×2×9 水扫＋3×2×3 `SNOW/ICE/PACKED_ICE` 邻件；两形在 R4 均实证。
- **M3 成熟旱收**：`crops.getItemDropped(state, rand, 0)` 恒等映射（wheat/beet/carrot/potato 全覆盖）→ `EntityItem(stack×1)`，`motionX/Y/Z=0`（与粪 M-1-4 地面散布面同构）→ `setBlockState(pos, AIR, 3)`。
- **M4 死株载体**：`etim:dead_crop`（D-1 甲：R196 本身即专属死作物块 235，体裁忠实）／`etim:dead_stem`（D-2 乙：R196 为同块死位 bit8，1.12 `BlockStem` 状态容器无 spare bit，改换载体；观察面——冻结/零掉/骨粉无效/死色——等价）。死株 `tickRandomly=false`（R196 `BlockCropsDead :6`）、`getDrops` 空（`:39-41`）、`canGrow/canUseBonemeal=false`（`:20-22`）、无 ItemBlock（`canBeCarried false`，`BlockCrops :322-325`）。
- **判窗噪声控制**：b1 强制面 `randomTickSpeed=0`；自然车道段临时 3（R5 120 s、R8）；R6③ 临时 50×30 s；收口前归 0，世界销毁。`farmDebugLog=true` 批窗开、收口关；`foodDebugLog=true` 仅用于显示 digDrain 面（收口关）。
- **概率护栏**：R5 自然窗 5×5 干田 120 s（E[门行]≈44，实测 48）；R8 b3 7×7 干田 chance=1.0（首事件 2.0 s ≪10 min）；b4 chance=0.0 以 40 门行为取样门槛（实测 54 s）。

## §3 零回归与通道

- **b1 判定面通道**：`[FarmLog]` 598（其中 `growth gate dry` 228、`drought` 20、其余为既有面）；`[MeleeLog]` 0／`[MiningLog]` 0／`[ButchLog]` 0／`[ArrowLog]` 0／`[CapLog]` 0；`[EnchantLog]` 4（R9 token `enchant mainhand`／`enchantprobe` 的显式输出）；`[DamageLog]` **175**＝169 `src=outOfWorld`（harness `kill @e[type=!player]` 清场）＋6 `src=inWall`（2 只环境鸡被 y=99 竞技场填充闷死，3 次伤害事件，C-8-4）；`[FoodLog]` **42**＝41 `digDrain`（R6② 两次 dig＋R9 token dig）＋1 `consumed`（`etest food 20 20` 池阈值）；`mixinFail` **0**。
- **b2/b3/b4**：`mixinFail` 0；b2 仅 farm 313（master 关自然冻结行）；b3 farm 57；b4 farm 111。四 boot `Done (` 全落。
- **五通道 kill 面**：Melee/Mining/Butch/Arrow 全 0；Enchant 的 4 行为显式 token，不是 kill 面；Cap 0。Damage 的 175 行见上（无 B-8 面行）。
- **§3.3 补充复验（`f8-dr-drop`，非判格、不计入 4 boot 收口）**：为把「掉落实体」从机器人拾取半径里隔离出来，另起 1 boot（`f8drop`），假人按「≤2.75 交互闸、出拾取盒」布位：S1 成熟旱收（假人距 3.0 格）→ `Found item.item.wheat`＋`Killed item.item.wheat`（实体面实证，非仅行面）；S2 即时破坏自掉对照（火把，survival，假人距 1.8 格）→ 位 air＋`Found item.tile.torch`＋`Killed item.tile.torch`（`doTileDrops` 与 item 通道实证）；S3 死株破坏（假人距 0.8 格，落在拾取盒内）→ 位 air＋`Selector … found nothing`＋破后 `clear` 回执 **`Could not clear the inventory of ETIM_F7, no items to remove`**（实体 0／携带 0 双证）。该 boot 收口同样恢复到 `world`／`allow-flight=false`。

## §4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `40794da`／收 `40794da`（`40794da..HEAD` = **0** 提交） |
| jar | release 988,364 B `D4062B205C4E0174C06BB3282D7A0B58AFF09BE7C4367469F6F738E732069530`；dev 968,826 B `5F0449E3EC2226FF0C9D5E73BEE1DC8546E8E5B81971963B517FA05A6491222C`；sources 898,810 B `BACC5604B4906D08ED59EDCE52028DD3103C100B1C13DBA197342CED2DBDBD88`（起收同值） |
| MK | refmap 77 类键／169 面（双树同）；mixins **73**＋client 10；mixinFail **0**（4/4） |
| cfg | 注册 **240** 键（代码 `config.getX("…")` 计数 240；文件 **242**＝240＋2 历史孤儿键 `qualityDefaultMax`／`mobwakeRarity`）；B-8 两键 `droughtDeathR196=true`／`droughtDeathChance=0.05`；收口 46,558 B／`1C5543FAE617C4D7C9518D814F5A40A44268B16B18CF2BF2E2BE19DBE8836680`，`farmDebugLog=false`／`foodDebugLog=false`（起收同 hash） |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 938 B／`1A039B9D8D177B1DB0F6C5825782F56A4A790F558F46545853D51DA874FA0A26`／`level-name=world`／`allow-flight=false`（窗内临时 f8dr/true，收口按窗前快照回写；起收同 hash） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `f8dr` 与复验世界 `f8drop` 已删；无残留游戏 JVM |
| 停服 | b1/b2/b3/b4 均 exitCode **0**＋`BUILD SUCCESSFUL`（b1 5.667 s Done、b2 1.058 s、b3 1.068 s、b4 1.054 s） |

## §5 冲突分级

- **A 级：0**。
- **B 级：1**
  - **B-8-1**（产品显示名）：`ETIMBlockDeadPlant` 只设 `setRegistryName`，未设 `setTranslationKey`（工程惯例见 `ETIMBlockOre` 的 `setTranslationKey("etim." + name)`），故 `testforblock` 失败行与 F3 目标块名显示 `tile.null.name`（无 ItemBlock，仅调试/准星面可见）。建议一行补 `setTranslationKey("etim." + name)`＋两条 lang；**不影响 R1..R10 任何判值**（判据走 registry name）。
- **C 级：7**
  - **C-8-1**（格式）：自然车道的事件行是 `[FarmLog]  drought event …`（**双空格**）——`roll(head="")` 拼接 `" drought event"` 所致；强制面是单空格。判行解析须用 `\s+`，否则漏计（本窗首版工装曾漏计，已修）。
  - **C-8-2**（工装）：`/etest drought roll` 把 force 头与 event **拼在同一行**（无换行），「1 行」判据按「含 `drought event`」计，不按行首计。
  - **C-8-3**（测试设计）：R6② 的就地 item 探针会被机器人拾取半径吞掉（`EntityItem` 拾取盒 `grow(1.0,0.5,1.0)`，中心距 1.0 格在盒内、>1.43 格才出盒）；因此 b1 的 `kill … found nothing` **不足以单独定谳**，§3.3 远位复验（S1/S2 出盒、S3 以破后 `clear` 携带 0）给出实体 0／携带 0 的双证。
  - **C-8-4**（环境）：竞技场 y=99 填充闷死 2 只世界生成鸡（3 次伤害事件），产生 6 行 `[DamageLog] src=inWall`；harness 副作用，不属 B-8 面。
  - **C-8-5**（测试设计）：b3 自然面的事件行不全来自 7×7 patch（R4/R5 遗留干田也会自然死，见 `pos=182,100,790` 等）；R8 计数按 patch 坐标过滤，b4 另以 `eventsAll=0` 作全档断言。
  - **C-8-6**（书／形体）：R4 书面的 `snow/ice` 按「3×2×3 邻件」两形各发；冰（全块）与雪层（layer）均 `water=1`→`skip-water`，判值同支。
  - **C-8-7**（工装）：ETIM 既有方块交互闸 `etim.reach.deny_block` 在 **2.75** 格即拒（日志 `reach denied: etim.reach.deny_block 3.04 > 2.75`）；§3.3 的远位复验必须把假人放在 ≤2.75（破坏可达）且 >1.43（拾取盒外）的窄带内，S1/S2 取 3.3／1.8 格，S3 另以 `clear` 携带 0 兜底。

## §6 自报（机械核讫）

> 正本：`testharness/reports/b8-verify-verdict.md`｜byte 五项：`16,853 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 92（split 93）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`AD5C06D8884229FAF2FE7E3315CD8021EF713F2800507991059229D0F3FED26F`
> SHA-256 乙（LF 归零零位）`AD5C06D8884229FAF2FE7E3315CD8021EF713F2800507991059229D0F3FED26F`
> SHA-256 丙（行链零位）`3B2DFE963FE5EAAC50BDFE0CBC57B69C56E9BD393FB8882E302BF2C3C302EBAD`
> 判格 10＝✓ 10／✗ 0｜R1 成熟 1 行/air｜R2 0/3/5/6 全等｜R3 pumpkin4/melon1｜R4 水/冰/雪三免＋撤水即死｜R5 干 48 门/3 死、湿 0/0｜R6 骨粉无变/断无掉/冻不活/不可携｜R7 关 0 事件/开 master=1｜R8 1.0 首 2.0 s、0.0 54 s 40 门 0 事件｜R9 228 门行＋三臂＋26 token｜R10 邻株不动
> 窗口账：正式 4 boot；0 rebuild／0 客户端／0 产品码；`[FarmLog]` b1 598／b2 313／b3 57／b4 111；mixinFail 0×4；补充复验 1 boot（f8-dr-drop，非判格）
