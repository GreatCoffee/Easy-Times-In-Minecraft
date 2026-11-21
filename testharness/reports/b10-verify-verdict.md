# 产出链 · **W-B10 判决**（B-10 批，produceGoods family，HEAD `2ee1b0e`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 3 boot**（b1 主判面 R0/R1–R8/R9①/R10-种子/R11/R12／b2 master 关 R9②＋R10 读回／b3 master 恢复 R9③）；**0 客户端／0 产品码／0 rebuild**／单假人 `ETIM_F7`
> **报告字节规格**：`17,596 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 19 / ✗ 4｜99 行`
> **判决源**：W-B10 任务书（2026-11-05，HEAD `2ee1b0e`）＋ `playground/audit/produceGoods-立项摸底.md` ＋ audit20 条 300/301
> **钉值核验**：HEAD **`2ee1b0e`**（窗内零提交）｜release **997,589 B** `79F0803B…593A7C` 相符｜dev **977,964 B** `7C9DE5F0…C9A3DD` 相符｜sources 909,113 B `C02B10A5…F03EE26` 相符｜mixins **74**＋client 10｜refmap **78/171**（双树同）｜cfg **注册 245 键**（文件 247＝245＋孤儿 `qualityDefaultMax`/`mobwakeRarity`）
> **判决**：**PASS**（R0..R12 **✓13／✗0**）｜A 0／B 0／C 8（工装与簿记，均不影响判值）
> **一句话**：空桶挤奶在 meter=100 时出 serve（take=100→0、手变奶桶），meter<100 出 deny 且 vanilla 无穷奶不复活；creative 只 drain 不换容器。奶表按 100-tick pass 自然回升（NBT 实测 20→21→33→44）；蛋泵每鸡恰 1 蛋行（counter 200→0）并落蛋实体；羽泵两条 drop=1（num 2/2 溢出），羽表 1/2→2/2 出 grew=true；羊猪 counter 50→0 且零产出行；EggLayTime 在主开关开时恒 9999（先写 1000 再读回 9999）、关闭后原版计时器复活（两鸡重置 7014/9861 ＋蛋实体）且空桶复活无穷奶、零 production 行；NBT 停电重启后 counter=42／milk=60／feathers=0/2 原样读回。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R0** boot 面 | `Done (`＋`mixinFail`；mixins 74+10／refmap 78/171／cfg 245／master 默认 | 三面相符 | b1 5.293 s、b2 0.999 s、b3 1.042 s，三 boot `mixinFail` **0**；`mkCounts` refmap **78/171**（双树同）、manifest **74+10**；cfg `codeKeys=245`／`fileKeys=247`；`livestockProductionR196=true` | ✓ |
| **R1** 挤奶 serve | `milk src=cow serve take=100 meter=0 … entity=EntityCow#…`＋手变奶桶 | serve＋take=100＋手 milk_bucket | 生存态空桶一击：`[FarmLog] milk src=cow serve take=100 meter=0 entity=EntityCow#2186`；`hand=milk_bucket`（槽内 1 枚）、空桶 0；`/give … minecraft:milk_bucket` 回 `Given [Milk] * 1`（物品存在复核） | ✓ |
| **R2** 挤奶 deny | 二击 `milk src=cow deny meter=… need=100`＋手仍空桶 | deny＋无新生奶 | 先 `etest prod … milk=0` 归零，再击：`milk src=cow deny meter=1 need=100 entity=EntityCow#2186`；`hand=bucket`，背包 `milk_bucket` 0 枚；无 serve 行（vanilla 无穷奶未复活） | ✓ |
| **R3** creative 逐字 | creative 击牛 `serve take=100 meter=0`＋手保持 bucket | serve 但**不换容器** | `gamemode 1`＋`milk=100` 种子后一击：`serve take=100 meter=0`；`hand=bucket`（槽内 1 枚 bucket、0 枚奶桶）——R196 `ItemVessel:105-110` drain 照发生、convert 跳过 | ✓ |
| **R4** 奶表自然回升 | 值行/NBT milk 列逐 60 s 上行（每 pass +1 上限） | milk 单调上行 | `milk=20` 种子后逐 60 s 读活体 NBT：**21 → 33 → 44**（≈+12/60 s＝每 100-tick pass +1，含 9/10 wellness 掷骰漏掉的 pass）；`rose=true`、单调 | ✓ |
| **R5** 蛋泵面 | `production src=chicken kind=egg drop=1 counter=0`＋蛋实体 | 每鸡恰 1 蛋行＋蛋落地 | `counter=200 step=600`（radius 12，set=5 kinds=cow+sheep+chicken+chicken+pig）：**2 行** egg（#2187/#2188 各一，`counter=0`）；`testfor @e[type=item] {Item:{id:"minecraft:egg"}}` → `Found item.item.egg` | ✓ |
| **R6** 羽泵面 | 蛋对照＋`kind=feather drop=1 num=2/2`＋羽实体 | 羽行（溢出 drop）＋羽落地 | 蛋对照再出 **2 行**；随后 `counter=100 feather=2 step=2000`：**2 行** `kind=feather drop=1 num=2/2`（#2187/#2188）；`testfor …feather` → `Found item.item.feather` | ✓ |
| **R7** 羽表增长 | `kind=feather grew=true num=1/2→2/2` | grew 行 | 先 `feather=2` 把 max 顶到 2，再 `counter=100 feather=1 step=2000`：**2 行** `grew=true num=2/2`（1/2→2/2 驻位），无 drop 行（唯一命中被增长吃掉） | ✓ |
| **R8** 羊猪空产 | `counter=50` 后值=NBT `productionCounter=0`；无 production 行 | 归零＋零产出 | 种子后立刻读 NBT：羊 `prod=50`→`0`、猪 `prod=50`→`0`（间隔 12 s≈2+ pass）；全窗 `production src=(sheep\|pig)` **0 行** | ✓ |
| **R9①** 原版蛋道 silence | master on：EggLayTime 恒 ≥10000（或非降）＋pen 无蛋实体 | 冻结＋零蛋 | 写 `EggLayTime=1000` 后 4 s 读活体 NBT：两鸡 **9999 / 9999**（写前亦 9999/9999）；`testfor …egg` 前后均无命中（未落蛋）；`entitydata` 写入确认（4 条 updated 回行） | ✓ |
| **R9②** master 关双支 | 新计时器复活＋vanilla 无穷奶＋零 production 行 | 蛋可落＋奶复活＋0 行 | b2（`livestockProductionR196=false`）：写 `EggLayTime=100` 后 14 s，两鸡 **7014 / 9861**（原版落蛋后重置值）＋`Found item.item.egg`；空桶击牛 **0 条 milk 行**、`hand=milk_bucket`（vanilla 无穷奶复活）；全档 `production` **0 行** | ✓ |
| **R9③** master 恢复 | 重启后 R0 复核＋冻门复归 | Done／0 fail／pin 9999 | b3 Done 1.042 s、`mixinFail=0`、cfg 245/247、`livestockProductionR196=true`；写 1000 后 5 s 读回 **9999 / 9999**（pin 复原） | ✓ |
| **R10** NBT 持久化 | 优雅停服→重启→`counter=42 milk=60` 读回 | 原值读回 | 无草 1×1 石塔鸡：`prod feather=2`→`counter=42 milk=60 feather=0`→`livemano 3 0.0`（food=0，永不 well）→停服；b2 重启后连读三份活体 NBT：**prod=42／milk=60／num=0／max=2／food=0.0**（12 s 间隔三次全同；`egg` 由 9868→9729→9590 递减，旁证 20 TPS 在跑） | ✓ |
| **R11** 零回归 | farm1 增速/旱死行／manure／27 token／五通道 | 照旧、零错 | 农场湿田 `growth rate` **321 行**（样本 `pos=266,101,845 base=5.000 … rate=1.168`）、干田 `growth gate dry` **104 行**、`drought roll` → `event kind=immature … dead=etim:dead_crop age=2`；`livemano 8` → **5 行** `manure src=livestock`；**27 token** 全发、`tokenErrors 0`；Melee/Mining/Butch/Arrow/Cap **0**、Enchant 4（显式 token）、Food 0（`foodDebugLog=false`） | ✓ |
| **R12** 收口复盘 | cfg 245（文件 247）；双旗关；rts=3／daylight=true／master=true；起收同 hash | 全回位 | 收口 `codeKeys=245`／`fileKeys=247`；`farmDebugLog=false`／`mobDebugLog=false`／`livestockProductionR196=true`；cfg 48,125 B `7EE89409…A94BA6B`（**起收同 hash**）；`gamerule randomTickSpeed 3`、`gamerule doDaylightCycle true` 已在末 boot 发出并回显 | ✓ |

> 判格 **✓13／✗0**；A 0／B 0／C 8（见 §5）。

## §1 判据行样本（正本 `f10-pg-verify-b1.out` / `-b2.out` / `-b3.out`）

- **R1**：`[FarmLog] milk src=cow serve take=100 meter=0 entity=EntityCow#2186 [server]`
- **R2**：`[FarmLog] milk src=cow deny meter=1 need=100 entity=EntityCow#2186 [server]`
- **R3**：`[FarmLog] milk src=cow serve take=100 meter=0 entity=EntityCow#2186 [server]`（`hand=bucket`，creative 不换容器）
- **R4**（活体 NBT 三读）：`{…"etim:livestock":{… milk:21 …}}` → `milk:33` → `milk:44`
- **R5**：`[AILog] production src=chicken kind=egg drop=1 counter=0 entity=EntityChicken#2187`／`#2188`
- **R6**：`[AILog] production src=chicken kind=feather drop=1 num=2/2 entity=EntityChicken#2187`（#2188 同）
- **R7**：`[AILog] production src=chicken kind=feather grew=true num=2/2 entity=EntityChicken#2187`（#2188 同）
- **R8**：羊 `productionCounter:50`→`0`；猪 `productionCounter:50`→`0`
- **R9①**：`EggLayTime:1000`（写入回显）→ 4 s 后 `EggLayTime:9999`（两鸡）
- **R9②**：`EggLayTime:9531`（b2 载入值）→ 写 100 → `EggLayTime:7014`／`9861`（原版落蛋重置）＋`Found item.item.egg`
- **R10**：`"etim:livestock":{inited:1b,freedom:1.0f,milk:60,water:0.75f,productionCounter:42,food:0.0f,numFeathers:0,maxNumFeathers:2}`（重启后三读全同）
- **R11**：`[FarmLog] growth rate block=minecraft:wheat family=crops pos=266,101,845 base=5.000 … rate=1.168`；`[FarmLog] drought force … drought event kind=immature block=etim:dead_crop age=2 pos=267,101,855 …`；`[FarmLog] manure src=livestock kind=cow drop=1 period=24000 countdown=26720 pos=300,101,851`

## §2 机制与口径

- **M1 100-tick 节拍**：`ticksExisted % 100 == 0` 时先掷 9/10（`nextInt(10) > 0`）决定是否跑 `updateWellness`；只有 wellness pass 收尾为 well 且 `!isChild()` 才 `production_counter++`；随后 **produceGoods 无条件派发**（R196 `EntityLivestock:244-251`）。本条是 R4/R8 判值的前提：`milk` 每 pass 吸收 counter（+1 上限），羊猪每 pass 把 counter 清零。
- **M2 奶门**：`MixinEntityCow.processInteract` HEAD 截获空桶点击——`meter = isChild?0:milk`，`need = 100`（`ItemBucket.standard_volume 4 × 25`）；`meter < need` → deny 行并 `return true`（vanilla 无穷奶必须不跑）；`meter ≥ need` → 扣 100、生存态换奶桶、`serve` 行；creative 照扣不换容器。R1/R2/R3 三臂逐字对位。
- **M3 蛋/羽门**：chicken 先羽门 `counter ≥ 100 && rand.nextInt(500)==0` → `gainFeather`（num<max → +1 并 `grew=true`；否则 drop 1）＋`counter -= 100`；否则蛋门 `counter ≥ 200 && rand.nextInt(20)==0` → plop＋掉 1 蛋＋`counter -= 200`。R5 的 600 次 pump 让 1/20 蛋门必然开、R6 的 2000 次让 1/500 羽门必然开；羽先蛋后的顺序由 R7 的 `feather=2` 预置顶掉 max 后以 1/2→2/2 验证。
- **M4 原版蛋道 silence**：`MixinEntityChicken.onLivingUpdate` HEAD 把 `timeUntilNextEgg = max(值,10000)`，于是每 tick 观测值为 **9999**（10000−1）；master 关时该 floor 不跑，原版 `--timeUntilNextEgg ≤ 0` 复活。R9①②③ 用「写 1000/100 → 读回」的同位对照证明，避免依赖单次采样。
- **M5 读通道**：判值主通道为**活体 NBT dump**（`/execute <sel> ~ ~ ~ entitydata @e[r=0,c=1] {}` 回显整份 NBT，含 `EggLayTime` 与 `ForgeCaps etim:livestock` 四表），辅以 `[FarmLog] milk/prod`＋`[AILog] production/livestock-value` 行族。值行固定为 `ticksExisted % 1200 == 0`（≈60 s）且受 `mobDebugLog` 门控，本窗以 NBT dump 作即时读、值行只作旁证。
- **M6 staging 口径**：pen 采用「整域 air 清→floor dirt/grass→逐层 cobble 环＋内补 air」分层重建；召唤后 3 s 的 `[DamageLog] inWall` 守门为 **0**（8 条 inWall 全落在自然鸡 #1998/#2000/#2001，非判点实体）；判窗 bot 走批次 smoke 的 `L.stage` 面（creative＋noPhysics＋全套 gamerule），实体内 100-tick pass 与值行由此稳定复现。

## §3 零回归与通道

- **b1 通道**：`[FarmLog]` **886**（`growth rate` 607／`growth gate dry` 197／`milk` 3／`production` 8／`livestock-value` 391／`manure` 5 等）；`[MeleeLog]` 0／`[MiningLog]` 0／`[ButchLog]` 0／`[ArrowLog]` 0／`[CapLog]` 0；`[EnchantLog]` 4（显式 token）；`[DamageLog]` **177**＝169 `src=outOfWorld`（`kill @e[type=!player]` 清场）＋8 `src=inWall`（自然鸡，非判点）；`[FoodLog]` **0**（`foodDebugLog=false`）；`mixinFail` 0。
- **b2／b3**：mixinFail 0；farm 67／23；三 boot `Done (` 全落，三停服 `exitCode 0`＋`BUILD SUCCESSFUL`。
- **五通道 kill 面**：Melee/Mining/Butch/Arrow/Cap **全 0**（与 W-B9 同口径）；Damage/Food 为清场/旗位旁证。
- **R11 token 面**：27 件全发（`hold/food/hunger/health/level/debt/enchant/enchantprobe/blockprobe/hurt/attack/dig/useblock/useitem/damage/quality/anvilwear/release/fishgate/fishretract/fishprobe/arrowprobe/livemano/chestio/裸 etest/drought probe`），`tokenErrors 0`、服务器存活。

## §4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `2ee1b0e`／收 `2ee1b0e`（`2ee1b0e..HEAD` = **0** 提交） |
| jar | release 997,589 B `79F0803BD06BE878F64358F0BCEA11202E2ECD336415F9C5DE2BD4DCFE593A7C`；dev 977,964 B `7C9DE5F0F5015FA5F9F772DD1C3D6150325EBC23B3A25DE8A4367AF047C9A3DD`；sources 909,113 B `C02B10A561D7BADFC424C6F6AC90A97DEDCCDF9D8012C5D11DCE2E947F03EE26`（起收同值） |
| MK | refmap 78 类键／171 面（双树同）；mixins **74**＋client 10；mixinFail **0**（3/3） |
| cfg | 注册 **245** 键（代码 `config.getX("…")` 计数 245；文件 **247**＝245＋孤儿 `qualityDefaultMax`／`mobwakeRarity`）；`livestockProductionR196=true`；收口 48,125 B／`7EE894091800B7E3E18AEE1144F59B193C4428E98AB9106322B949375A94BA6B`，`farmDebugLog=false`／`mobDebugLog=false`（起收同 hash） |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 938 B／`8A8C35F70C53E722EE89CBEA385BF386D4858E043AD99BDFE864F65DAB7E4167`／`level-name=world`／`level-seed=etim27`／`allow-flight=false`（窗内临时 `f10v`＋debug 双旗，收口按窗前快照回写；起收同 hash；与 W-B9 收口 hash 的差异见 C-10-7） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `f10v` 与批次 smoke 遗留 `f10pg` 均已整档删除；无残留游戏 JVM |
| 停服 | b1/b2/b3 均 exitCode **0**＋`BUILD SUCCESSFUL`（Done 5.293/0.999/1.042 s） |

## §5 冲突分级

- **A 级：0**。
- **B 级：0**（未见产品缺陷；奶/蛋/羽/羊猪/原版蛋道五面与 R196 判值逐项对位）。
- **C 级：8**
  - **C-10-1**（工装·staging 决定性教训）：手搓预检（bot 停留生存态＋物理未关＋规则集不全）会让 pen 实体「只 tick 一次就停」——NBT 里 `EggLayTime` 只落一次 9999、`productionCounter` 不涨、值行为零；改用批次 smoke 同款 `L.stage` 面（creative＋noPhysics＋`doMobSpawning/doMobLoot/doTileDrops/doDaylightCycle/doFireTick/mobGriefing/keepInventory/naturalRegeneration/doWeatherCycle`＋difficulty/time/weather/rts＋`etest food/health`）后计数、值行、冻门全部稳定（pilot7 复核）。判窗全程用该面。
  - **C-10-2**（判据·meter 漂移）：R2 的 deny 行读作 `meter=1` 而非 0——`milk=0` 种子与点击之间恰跨过一个 100-tick pass，well 骰把 counter 1 吸进奶表；判的是 `meter < need=100` 的面（deny 且 vanilla 不复活），值本身不构成偏差。
  - **C-10-3**（通道·testfor 负响应）：`testfor` 的「未命中」回行可能落在 0.42 s 读取切片之外（raw 空）；正向命中（`Found item.item.egg/feather`）证明命令面可用，负向结论以 NBT dump＋行族为主证。
  - **C-10-4**（判据·R10 读法）：R10 以活体 NBT dump 直读 `ForgeCaps etim:livestock`——`counter=42／milk=60／feathers=0/2` 在重启后三读全同。无草 1×1 石塔＋`food=0` 使「well」恒假（R196 :246 只在 well pass 增 counter），故 counter 冻结可精确回读；值行（1200 tick）未刻意等满。
  - **C-10-5**（采样·R4 速率）：`20→21→33→44` 每 ~60 s 上行约 +12，等于「每 pass +1 减去 9/10 wellness 掷骰漏掉的 pass」（R196 :245-248），不是漏计。
  - **C-10-6**（世界·自然实体）：`doMobSpawning=false` 不拦区块生成期的自然动物，判窗世界仍有零散野生家畜；所有判值行按 pos/entity 过滤。8 条 `inWall` 伤害属自然鸡 #1998/#2000/#2001，非判点实体（pen 守门召唤后 0 条）。
  - **C-10-7**（簿记·props 基线）：props 起收同 hash `8A8C35F7…7E4167`（938 B，world/etim27/allow-flight=false），与 W-B9 收口 `7F039C1F…89E2` 不同——批次 smoke 的服务器在 23:06:22 重写了 `#date` 头；文件另带一行历史转义 BOM `\u00EF\u00BB\u00BF\#Minecraft=server properties`（无害，建议下批窗口外清理）。
  - **C-10-8**（客户端面）：R5 的 plop 音面属客户端 `[SoundLog]` 通道，本 dedicated-server 窗口以蛋行＋蛋实体旁证；按纪律客户端面由用户执行，不纳入本窗。

## §6 自报（机械核讫）

> 正本：`testharness/reports/b10-verify-verdict.md`｜byte 五项：`17,596 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 98（split 99）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`DF616D9CA7AB1CAE9CE7CBA85745A0ED653B510C30C62312449EC769420897E2`
> SHA-256 乙（LF 归零零位）`DF616D9CA7AB1CAE9CE7CBA85745A0ED653B510C30C62312449EC769420897E2`
> SHA-256 丙（行链零位）`900C59567F294EFFBB6D6CCA31FDB10D1772D07BE4C8E92D6DADB993DCB0F6DA`
> 判格 13＝✓ 13／✗ 0｜R1 serve take=100/meter=0＋手 milk_bucket／R2 deny meter=1 need=100／R3 creative serve 不换桶／R4 NBT 21-33-44／R5 蛋 2 行＋实体／R6 羽 2 行 drop＋实体／R7 grew 2 行／R8 羊猪 50→0 零行／R9① 9999 复写后仍 9999、② 7014/9861＋蛋实体＋无穷奶＋0 production、③ 9999 复归／R10 42-60-0/2 三读同值／R11 湿 321+干 104+drought+manure 5+27 token 0 错／R12 245(247) 起收同 hash
> 窗口账：正式 3 boot；0 rebuild／0 客户端／0 产品码；`[FarmLog]` b1 886／b2 67／b3 23；mixinFail 0×3
