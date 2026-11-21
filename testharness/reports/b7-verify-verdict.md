# 粪获取面 · **W-B7 判决（v2，A-1 修复后）**（B-7 批，HEAD `9af76e4`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 4 boot**（b1 主判面／b2 重载保位／b3 门关／b4 门开＋R10）；**0 客户端／0 产品码／0 rebuild**／双假人 A=`ETIM_F7`、B=`ETIM_F8`
> **报告字节规格**：`12,298 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 14 / ✗ 4｜88 行`
> **判决源**：W-B7 任务书 v2（2026-11-05，A-1 修复后）＋ `playground/audit/manure-source-立项摸底.md` ＋ audit20 292/293 落账
> **钉值核验**：HEAD **`9af76e4`**（窗内零提交）｜release **972,503 B** `215C4FC7…38CA` 相符｜dev **953,490 B** `860F236F…4662` 相符｜sources 883,274 B `209983F6…049B` 相符｜mixins **73**＋client 10｜refmap **77/169**（双树同）
> **判决**：**PASS**（R1..R10 **✓10／✗0**）｜A 0／**B 1**（B-7-1 末件行名）／C 5（工装与簿记，均不影响判值）
> **一句话**：四 kind 掉粪周期、幼体/节食双门、chest-convert 直转、wheat 耗尽 32 命中→16 粪、paper 0.1→1 粪/余 0.60、阴性三连、compost NBT 0.37 跨重启、config 门关 0 行/开一行恢复、AILog＋施肥臂＋26 token 冒烟——全部按 R196 判值落行；唯一瑕疵是**耗尽那一击的行名**被记成 `minecraft:air`（值仍 0.5/0.1，见 B-7-1）。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1** 四 kind 掉粪链 | `[FarmLog] manure src=livestock kind=X drop=1 period=P countdown=N` | 每 kind 恰 1 行；cow 24000／sheep 48000／pig 48000／chicken 384000 | cow `period=24000 countdown=25273`、sheep `48000/63311`、pig `48000/51167`、chicken `384000/285543`；pos 全 `200,139,700`；`livemano` reset 行 kinds=`cow#2291`／`sheep#2293`／`pig#2295`／`chicken#2297` | ✓ |
| **R2** 幼体门 | 幼牛（`Age:-24000`）100 tick 内 drop 行数；成年对照 | 幼 0／成年 1 | 幼 **0**（5.2 s，countdown 已置 0）；成年 **1** | ✓ |
| **R3** 节食冻结门 | `livemano 6 <food>` → drop 行数 | food<0.05 冻结 0／>0.05 恰 1 | **0 → 0 行**（`livemano … food=0.00`）；**1 → 1 行**（`food=1.00`）；C-7-2 见 §5 | ✓ |
| **R4** chest-convert 直转 | `compost src=chest-convert … manure=1 compost=0.00`；再 2.0 → manure=2 | 两行各 1；蚯蚓不消耗 | `manure=1 compost=0.00` → `manure=2 compost=0.00`；终态 peek `[0]=etim:worm_raw#2 [1]=etim:manure#3 compost=0.00` | ✓ |
| **R5** wheat 耗尽主链 | `compost src=chest … hits= … foods=minecraft:wheat#0.5 … manure= …` 合计；终态 peek | hits 合计 **32**、manure 合计 **16**、麦 0/粪 16/compost 0.00 | 29 行，`sumHits=32`、`sumManure=16`；28 行 `wheat#0.5`＋**1 行 `minecraft:air#0.5`（耗尽末击，B-7-1）**；终态 `[0]=worm_raw#8 [2]=manure#16 compost=0.00` | ✓（值/链） |
| **R6** paper 肥值抽查 | 存在 `foods=minecraft:paper#0.1` 行；本次 manure=1；compost 余 0.60 | 16 命中 → 1 粪 + 0.60 | 11 行，10 行 `paper#0.1`＋1 行 `air#0.1`（B-7-1）；`sumHits=16`、`sumManure=1`；终态 `[0]=worm_raw#8 [2]=manure#17 compost=0.60`，paper 槽空 | ✓ |
| **R7** 阴性三连 | 空箱/有蚓无粮 tick 50 → 0 行；无箱区 → 失败回复 | 0／0／无箱回复 | 空箱 `hits=0 convert=0`；有蚓无粮 `hits=0 convert=0`；无箱区 `[EtimTest] chestio: no chest within 4 blocks` | ✓ |
| **R8** compost NBT 持久 | `sete 0.37` → 停服 → 重启 peek | 0.37＋槽不变 | b1 `compost=0.37 [0]=worm_raw#8 [2]=manure#17`；b2 载后**同值同槽** | ✓ |
| **R9** config 门回归 | `chestWormCompostR196=false` → tick 50；true → 恢复 | 关 0 行；开 ≥1 行 | 关：`hits=0 convert=0`，peek 麦 16／蚓 4／compost 0.37（粮未动）；开：16 行/`hits=16`/`manure=8`，compost 0.37 余 | ✓ |
| **R10** 零回归抽验 | AILog 翻行；`useblock` 施肥臂；`/etest` 其余 token 各一发 | 行照旧、不炸 | AILog **3 行**（raincheck＋`livestock well food=0.96 water=0.81 freedom=1.00`）；施肥 `fertilize src=manure chain=mycelium roll=none stage=1/3 giant=0`（菇 `testforblock` 命中）；**26 token 全发**、`tokenErrors` **0**、服务器存活 | ✓ |

> 判格 **✓10／✗0**；B 级 1（B-7-1，仅行名、不影响判值）｜C 级 5（见 §5）。

## §1 判据行样本（正本 `f7-wb-b7-b1.out`／`-b2.out`／`-b3.out`／`-b4.out`）

- **R1**：`[FarmLog] manure src=livestock kind=cow drop=1 period=24000 countdown=25273 pos=200,139,700 [server]`（sheep／pig／chicken 同型，周期 48000／48000／384000）。
- **R2**：幼牛窗口 0 行；成年 `kind=cow drop=1 period=24000 …` 恰 1 行。
- **R3**：`[FarmLog] livemano radius=6 food=0.00 reset=1 kinds=cow#2302`（0 行 drop）→ `food=1.00 …`（1 行 drop）。
- **R4**：`[FarmLog] compost src=chest-convert pos=180,139,700 manure=1 compost=0.00 [server]`；`sete 2.0` 后 `manure=2 compost=0.00`。
- **R5**：`[FarmLog] compost src=chest pos=180,139,700 worms=8 hits=1 foods=minecraft:wheat#0.5 compost=0.50->0.00 manure=1`；末击 `… foods=minecraft:air#0.5 compost=0.50->0.00 manure=1`（B-7-1）。
- **R6**：`… foods=minecraft:paper#0.1 … manure=0/1`；终态 peek `worms=8 compost=0.60 [0]=etim:worm_raw#8 [2]=etim:manure#17`。
- **R7**：`[EtimTest] chestio: no chest within 4 blocks`。
- **R8**：b1 `… compost=0.37 [0]=etim:worm_raw#8 [2]=etim:manure#17`；b2 同值。
- **R9**：关 `[FarmLog] chest-peek … worms=4 compost=0.37 [0]=etim:worm_raw#4 [1]=minecraft:wheat#16`（0 行成签）；开 `16 行 / hits=16 / manure=8`。
- **R10**：`[FarmLog] fertilize src=manure chain=mycelium roll=none stage=1/3 giant=0 [server]`。

## §2 机制与口径

- **M1**（livestock）：`ETIMLivestockEvents.tickManureCountdown` 每 tick 先过 `isChild` 与 `food < 0.05F` 两门，再 `--countdown`；到 0 掉 1 个 `etim:manure` 并 `period/2 + rand(period)` 重滚；四 kind 周期走 `livestockManurePeriod*`。R1/R2/R3 与行内 `period/countdown` 完全对位。
- **M2**（chest）：`checkForWormComposting` 每调每蚓一签；成签吃 1 件、`compost += value`、立即转换 `while compost>=1`；`compost` 走 TE 的 `Carry` duck（NBT `compost`）。R4/R5/R6/R8/R9 对位；R9 门在方法首行短路。
- **判窗噪声控制**：`randomTickSpeed=0`——B-7 给了箱子随机 tick 通道，若保持 3 会给 `chestio` 计数注入随机成签行；本窗判值全部走 `/etest chestio tick` 直调，故关掉随机 tick。
- **B-7-1 机制**：`checkForWormComposting` 在 `decrStackSize(sourceIndex,1)` **之后**才 `foods.add(source.getItem().getRegistryName() + "#" + value)`；1.12 `ItemStack.splitStack` 在数量归零时把同一对象置空，`getItem()` 随之为 `Items.AIR`。故**耗尽那一击**的行名读成 `minecraft:air`，但 `value` 是减扣前算的（0.5／0.1 仍然正确），命中数/粪数/终态不受影响。

## §3 零回归与通道

- **b1（主判面）**：`[MeleeLog]` 0／`[MiningLog]` 0／`[ButchLog]` 0／`[ArrowLog]` 0／`[EnchantLog]` 0／`[FoodLog]` **0**／`[CapLog]` 0；`[DamageLog]` 336 行**全部 `src=outOfWorld`**，来自 harness 的 `kill @e[type=!player]` 清场（每轮 summon 前清场 ×8），无其它 src。
- **b4**：token 冒烟**前** `[FoodLog]` 2 行＝stage `etest food 20 20` 的池阈值结算（两假人各 1，B6 同型既有行）；冒烟**后**的 `digDrain` 211 行与 `[DamageLog]` 2 行由 R10 显式 token（`dig`／`hurt`）产生，属冒烟输出，不计入 B-7 面。
- **mixinFail**：b1/b2/b3/b4 各 **0**；四条 `Done (` 全落。
- **AILog**：`mobDebugLog=true` 既有档，b1 470 行（raincheck/翻行），R10 抽 3 行含 `well` 状态翻行。

## §4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `9af76e4`／收 `9af76e4`（`9af76e4..HEAD` = **0** 提交） |
| jar | release 972,503 B `215C4FC7AC49882275FC805CAFFB620C50F8273E816745F8E83B42EA306638CA`；dev 953,490 B `860F236F903CFA9F9B1B546544FC76B739A54BA0494846BDB24C318A81144662`；sources 883,274 B `209983F64D812BB5FE681A4DE97A59BAEB875DFFCAA9FDEA9B8EAC8FA45C049B`（起收同值） |
| MK | refmap 77 类键／169 面（双树同）；mixins **73**＋client 10；mixinFail **0**（4/4） |
| cfg | **240 键**（C-7-5：代码定义 238，文件保留 2 个历史孤儿键 `qualityDefaultMax`／`mobwakeRarity`）；B-7 五键实测 `chestWormCompostR196=true`／cow 24000／pig 48000／sheep 48000／chicken 384000；收口 45,949 B／`7DE54355682D5DB81ACA502AF77DED5A1E26B0515B385DFEEF4D8259532820B4`，`farmDebugLog=false`／`foodDebugLog=false` |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 938 B／`F88A8CCE6A766CC7A2B3775AEDECF30539E5DFE8F389991FD9A6D38A14BE6622`／`level-name=world`／`allow-flight=false`（窗内临时 true，收口恢复；哈希与旧档不同＝服务器启动时重写了时间戳行，设置值不变，C-7-6） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `b7m` 已删；无残留游戏 JVM |
| 停服 | b1/b2/b3/b4 均 exitCode **0**＋`BUILD SUCCESSFUL` |

## §5 冲突分级

- **A 级：0**（A-1 已在 `9af76e4` 修复：`writeToNBT` 回调改 `CallbackInfoReturnable<NBTTagCompound>`；四条 boot 全过、mixinFail 0）。
- **B 级：1**
  - **B-7-1**（产品调试行准确性）：`ETIMCompost.checkForWormComposting` 在 `decrStackSize` **之后**取 `source.getItem().getRegistryName()`，耗尽末击记成 `minecraft:air#<value>`（R5 1/29 行、R6 1/11 行）。判值（0.5／0.1）、命中、粪数、终态全部正确；建议一行修：在 `decrStackSize` 前先取 `String foodName = source.getItem().getRegistryName()`，`foods.add(foodName + "#" + value)`。
- **C 级：5**
  - **C-7-2**（工装）：`/etest livemano` 的 food setter 用整数版 `isNumber()`，任务书的 `0.04`／`0.5` 会被静默忽略（实测首版 `food=-`）；本窗改用 `0`（<0.05 冻结）与 `1`（＞0.05 放行）驱动同一短路门，R3 判值成立。建议 `isNumber`/参数判定改 `parseDouble` 容错。
  - **C-7-3**（书／格式）：任务书期望 `foods=minecraft:paper#0.10`；Java `float` 拼接输出 `0.1`（数值等价），本窗按数值 0.1 判。
  - **C-7-4**（书／测试设计）：R6 的 `add 2 paper` 与 R5 终态粪槽（泵写入首个空槽＝2）冲突，会覆盖 16 粪；本窗改用槽 3 以保住任务书自述的「粪槽 16/64 未满」前提。
  - **C-7-5**（簿记）：任务书 `cfg 238 keyed` 是**代码定义键数**；实际文件 240 键（保留 2 个历史孤儿键）。B-7 五键与值全部正确。
  - **C-7-6**（环境／簿记）：`server.properties` 被服务器启动重写时间戳行，哈希由旧档 `1C815ED2` 变 `F88A8CCE`（938 B 不变、`level-name=world`／`allow-flight=false` 收口正确）；另：mineflayer 4.39 的物理开关是 `bot.physicsEnabled`，旧 `bot.physics.enabled` 为无效写——本窗已在 `f7-wb-lib.js` 修正，并临时 `allow-flight=true` 防无位移踢出（收口恢复 false）。

## §6 自报（机械核讫）

> 正本：`testharness/reports/b7-verify-verdict.md`｜byte 五项：`12,298 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 87（split 88）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`881F91E2DB0A17942FF04E8194BC2555DE58533A25CC978B4EE5D101B600F630`
> SHA-256 乙（LF 归零零位）`881F91E2DB0A17942FF04E8194BC2555DE58533A25CC978B4EE5D101B600F630`
> SHA-256 丙（行链零位）`277489569DBCB86D3FDD8CC86530C21A006AFD9FBF1FE6F7C3924239D24EC545`
> 判格 10＝✓ 10／✗ 0｜R1 四 kind 24000/48000/48000/384000｜R2 幼 0/成 1｜R3 0→0/1→1｜R4 1/2 直转｜R5 32→16｜R6 16→1/0.60｜R7 0/0/回复｜R8 0.37 跨重启｜R9 0/16 行｜R10 AILog＋fertilize＋26 token
> 窗口账：正式 4 boot；0 rebuild／0 客户端／0 产品码；`[FarmLog]` b1 110／b4 27；AILog b1 470／b4 3
