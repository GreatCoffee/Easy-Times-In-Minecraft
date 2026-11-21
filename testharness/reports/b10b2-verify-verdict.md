# 产出链批二 · **W-B10b2 判决**（B-10 批二体，produceGoods 交互四件，HEAD `9df2124`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-06（CST）｜**窗口形态**：**2 boot**（b1 主判面 R0/R1–R9/R10-种子/R11/R12；b2 重启读回 R10＋R0 复核）；**0 客户端／0 产品码／0 rebuild**／单假人 `ETIM_F7`
> **报告字节规格**：`18,173 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 17 / ✗ 4｜103 行`
> **判决源**：W-B10b2 任务书（2026-11-06，HEAD `9df2124`）＋ `playground/audit/produceGoods批二-立项摸底.md` ＋ audit20 条 303/304
> **钉值核验**：HEAD **`9df2124`**（窗内零提交）｜release **1,002,277 B** `686A00F1…71632F25` 相符｜dev **982,584 B** `F9E6894F…E56C88C7E` 相符｜sources **914,395 B** `1F527C71…501024CD` 相符｜mixins **76**＋client 10｜refmap **80/174**（双树同）｜cfg **注册 245 键**（文件 247，同批一注记）
> **判决**：**PASS**（R0..R12 **✓13／✗0**）｜A 0／B 0／C 9（工装与口径，均不影响判值）
> **一句话**：水桶在 thirsty 牛上 serve（add=1.0 meter=1.00、生存换空桶），非 thirsty 静默 deny 且手不消耗、零 vanilla 面；creative 照 drain 不换手。小麦手喂走 R196 链（add=0.5、hp 2→7＝max×0.5 heal、love=false；满血+well 出 love=true 且 NBT InLove 566），拒食门 family_gate / 幼崽 child 均零消耗零 vanilla 子面（无子代、Age 只自然 +1/tick）。跳羽工装面 1 drop（num 1/2）后 num=1 全干，自然 panic 窗亦出 jump=true 行；羊尾 add=0.5 工装＋自然双证。NBT 停电重启后 milk 61+counter 7→69、鸡 counter 42→43、water/food 仅回落一个 pass（−0.005）、hp 精确 3.0、feathers 1/2 原样。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R0** boot 面 | `Done (`＋`mixinFail`；mixins 76+10／refmap 80/174／cfg 245／master 默认 | 双面相符 | b1 `Done (5.190s)`、b2 `Done (1.086s)`，`mixinFail` **0×2**；`mkCounts` refmap **80/174**（双树同）、manifest **76+10**；cfg `codeKeys=245`／`fileKeys=247`；`livestockProductionR196=true`（两旗同开） | ✓ |
| **R1** 喂水 serve | `water src=cow serve add=1.0 meter=1.00`＋手变空桶 | serve＋meter 1.00＋换桶 | 生存态水桶一击：`[FarmLog] water src=cow serve add=1.0 meter=1.00 entity=EntityCow#2240`；`/clear … -1 0` 计数 `water_bucket=0`、`bucket=1`（R196 :121-123 convert） | ✓ |
| **R2** 喂水 deny | `water src=cow deny meter=…`＋手保持＋无 serve | deny＋手不消耗＋零 vanilla | `water=1.0` 种子后一击：`water src=cow deny meter=1.00 entity=EntityCow#2240`；手 `water_bucket=1`／`bucket=0`；**serve 行 0**；`[DamageLog]` **0 行**；牛 Health 10.0 未动 | ✓ |
| **R3** creative 喂水 | serve 行＋手保持水桶 | drain 照发生、convert 跳过 | `gamemode 1`＋`water=0.0`：`serve add=1.0 meter=1.00`；手 `water_bucket=1`／`bucket=0`（R196 :121-123 逐字） | ✓ |
| **R4** 手喂 serve | `food src=cow serve add=0.5 food≈0.5 hp=0.70 love=false`＋小麦消耗 | serve＋heal＋love=false | `water=1.0 food=0.0 hp=2.0` 种子后小麦一击：`add=0.5 food=0.50 hp=0.70 love=false`；`/clear` 计数 `wheat=0`；NBT `Health:7.0`（2＋max 10×0.5） | ✓ |
| **R5** love-if-well | `serve … love=true`＋InLove 600 有证 | love=true＋inLove | `water=1.0 food=0.2 hp=10.0`：`add=0.5 food=0.70 hp=1.00 love=true`；`wheat=0`；同时刻活体 NBT `InLove:566`（600 − 34 tick，逐 tick 递减） | ✓ |
| **R6** 拒食门 | `deny cause=family_gate`＋手保持＋零 instant-breed | deny＋零消耗＋无子代 | fresh 牛（`boxKill` **绝对坐标**清场后重召 #2320）＋`water=0.2 food=1.0 hp=10.0`：`food src=cow deny cause=family_gate food=1.00 hp=1.00`；`wheat=1`；NBT `InLove:0`；牛数 **2→2**（无子代） | ✓ |
| **R7** 幼崽门 | `deny cause=child`＋零 ageUp＋手保持 | deny＋Age 不跳 | 幼牛（`Age:-24000`）＋`water=0.2 food=0.2 hp=10.0`：`deny cause=child food=0.20 hp=1.00`；`wheat=1`；Age 轨迹 −23564→−23304→−22947→**−22794**（每段≈elapsed tick×1 自然成长；若 vanilla `ageUp` 触发应一次 +120） | ✓ |
| **R8** 跳落羽 | ①`kind=feather jump=true drop=1 num=1/2` 后 num=1 全干；②自然窗行计数>0 | 双支成立 | ①`feather=2`＋`jump=2000`（工装 clamp 256）→ **1 行** `drop=1 num=1/2 entity=EntityChicken#2242`，NBT 随后 `num=1/max=2`；再 `feather=1`＋`jump=2000` → **0 行**（retain≥1，R196 :202）；②自然 panic 窗（4 只自然鸡踩 1 高台阶）cycle 1 即出 1 行 `#2248`，同窗另计 2 行（含早段自然游走 1 行） | ✓ |
| **R9** 羊吃草尾补 | ①`grass src=sheep add=0.5 face=eatGrassBonus`＋food 0→0.50；②自然窗行计数>0 | 双支成立 | ①`food=0.0` 种子＋`grass=1`（半径 2）→ `grass src=sheep add=0.5 face=eatGrassBonus food=0.50 entity=EntitySheep#2241`，NBT `food:0.5f`；②自然羊院（9×9 纯草）出 1 行（`#2250`，food=1.00 已顶格） | ✓ |
| **R10** NBT 持久 | 优雅停服→重启→三值＋counter/milk/feathers 读回 | 全键持久 | 远格双笼（6 秒窗内 seed→dump→stop）：牛 `water 0.3／food 0.4／hp 3.0／counter 7／milk 61` → 重启读 `0.295／0.395／3.0／0／69`（**69＝61＋(7+1)**，恰一个 pass 的 counter 吸收＋奶表吸收）；chicken `counter 42／1/2／0.3／0.4／3.0` → `43／1/2／0.295／0.395／3.0`（**43＝42＋1**，well pass ＋1）；两体 freedom `0.9606633→0.9556633`、`0.89263153→0.88763154`（原值−0.005，未重掷）；`EggLayTime 10465→10406`（59 tick 在跑，master 冻结在 9999 面） | ✓ |
| **R11** 零回归 | ①milk serve/deny ②蛋泵 ③farm ④manure ⑤32 token ⑥五通道 | 照旧零漂 | ①`milk src=cow serve take=100 meter=0`＋`deny meter=0 need=100`；②`counter=200 step=600` → **2 行** egg（双鸡，counter=0）；③`growth rate` **72**（b1 全档 124）、`growth gate dry` **21**（全档 37）、`drought roll` → `dead_crop age=2`；④`livemano 6` → **4 行** manure（全档 6）；⑤**32 token** 全发、`tokenErrors 0`；⑥Melee/Mining/Butch/Arrow/Cap **0**、Enchant 4（显式 token）、Food 0（旗关）、Damage **256**＝248 outOfWorld（清场）＋8 player（4 次 panic 击打×2 行） | ✓ |
| **R12** 收口复盘 | cfg 245（文件 247）；双旗关；rts=3／daylight=true／master=true；起收同 hash | 全回位 | 收口 `codeKeys=245`／`fileKeys=247`；`farmDebugLog=false`／`mobDebugLog=false`／`livestockProductionR196=true`；cfg 48,125 B `7EE89409…A94BA6B`（**起收同 hash**）；末 boot 已发 `gamerule randomTickSpeed 3`、`gamerule doDaylightCycle true` | ✓ |

> 判格 **✓13／✗0**；A 0／B 0／C 9（见 §5）。

## §1 判行样本（正本 `f10-b2-verify-b1.out` / `-b2.out`）

- **R1**：`[FarmLog] water src=cow serve add=1.0 meter=1.00 entity=EntityCow#2240 [server]`
- **R2**：`[FarmLog] water src=cow deny meter=1.00 entity=EntityCow#2240 [server]`
- **R3**：`[FarmLog] water src=cow serve add=1.0 meter=1.00 entity=EntityCow#2240 [server]`（手 `water_bucket=1`）
- **R4**：`[FarmLog] food src=cow serve add=0.5 food=0.50 hp=0.70 love=false entity=EntityCow#2240 [server]`
- **R5**：`[FarmLog] food src=cow serve add=0.5 food=0.70 hp=1.00 love=true entity=EntityCow#2240 [server]`；NBT `InLove:566`
- **R6**：`[FarmLog] food src=cow deny cause=family_gate food=1.00 hp=1.00 entity=EntityCow#2320 [server]`
- **R7**：`[FarmLog] food src=cow deny cause=child food=0.20 hp=1.00 entity=EntityCow#2244 [server]`
- **R8①**：`[AILog] production src=chicken kind=feather jump=true drop=1 num=1/2 entity=EntityChicken#2242`
- **R8②**：`[AILog] production src=chicken kind=feather jump=true drop=1 num=1/2 entity=EntityChicken#2248`
- **R9①**：`[FarmLog] grass src=sheep add=0.5 face=eatGrassBonus food=0.50 entity=EntitySheep#2241 [server]`
- **R9②**：`[FarmLog] grass src=sheep add=0.5 face=eatGrassBonus food=1.00 entity=EntitySheep#2250 [server]`
- **R10**（重启后，`/execute … entitydata @e[r=0,c=1] {}` 整份 NBT）：
  `"etim:livestock":{inited:1b,freedom:0.9556633f,milk:69,manureCountdown:…,water:0.295f,productionCounter:0,food:0.395f,…}`（牛）；
  `"etim:livestock":{…milk:0,productionCounter:43,food:0.395f,numFeathers:1,maxNumFeathers:2}`（鸡）
- **R11**：`[FarmLog] milk src=cow serve take=100 meter=0 entity=EntityCow#2326`；`[AILog] production src=chicken kind=egg drop=1 counter=0 entity=EntityChicken#2243`；
  `[FarmLog] growth rate block=minecraft:wheat family=crops pos=265,101,850 base=3.875 … rate=0.908`；
  `[FarmLog] drought force block=minecraft:wheat age=2 pos=267,101,855 dry=1 water=0 master=1 p=1.00 … dead=etim:dead_crop age=2`
- **工装回行**：`[FarmLog] prod radius=2 counter=- milk=- feather=- step=- water=- food=- hp=- grass=- jump=256 set=1 kinds(1)=chicken`

## §2 机制与口径

- **M1 水支路**：`MixinEntityAnimal.processInteract` HEAD → `interactClick`；手持 `WATER_BUCKET` 且 `water < 0.5F`（R196 isThirsty :124-126）→ `setWater(+1.0)`（0.25×standard_volume 4，R196 :120，clamp 0..1）＋非 creative 换空桶（:121-123）＋serve 行；`water ≥ 0.5F` → 仅发观察 deny 行并 `return false`（R196 :127 的静默 fall-through 语态），vanilla 体无任何动作。R2 的 `` `/clear … -1 0` `` 计数＋`DamageLog` 0 行是「手不消耗＋零 vanilla」两证。
- **M2 手喂链**：`willEat`（:412-414：满血＋非 well＋非饥 → 拒）→ `canEat`（EntityAnimal :257-260 `!inLove && growingAge==0`；EntityLiving :1330-1332 `!child && alive`）→ `addFood(0.5)` → love 臂（well 且 `health==max` → `setInLove(null)` = inLove 600＋心粒子；骑在 heal 前的血量，R196 :282 序位）→ heal 臂（`healByPercentage(0.5)` = max×0.5，满血不触发）→ 消耗一件（creative 不消耗）。R4 的 `hp=0.70` 与 R5 的 `hp=1.00` 正是「heal 前判 love」的序位证据。
- **M3 拒食语义**：`rejects`（family gate）优先于 `canEat`，两者都返回 true（answered）以阻止 1.12 vanilla `EntityAnimal.processInteract` 的 instant-breed / child-ageUp 臂。R6 用 `boxKill` 绝对坐标清场后重召 fresh 牛（`inLove=0`、牛数 2→2 无子代）；R7 用 `Age:-24000` 幼牛，Age 仅按 1.12 `EntityAgeable.onLivingUpdate` 自然 +1/tick（−23564→−22794 与 elapsed tick 同阶），无 `ageUp` 的 +120 跳变。
- **M4 跳羽**：`MixinEntityLivingBase.jump` TAIL → `jumpFeather`：`!isChild && rng.nextInt(40)==0 && !inWater` → `numFeathers ≥ 2` 才掉 1 并 −1（retain≥1）。工装 `jump=N` 直接调用；自然面走 vanilla `EntityAIPanic`（受击→5-7 格 1.4x 逃逸，跨 1 高台阶即真 `jump()`），每跳一次都掷 1/40。
- **M5 羊尾**：1.12 `EntitySheep.eatGrassBonus` 体已含 R196 前两句，`MixinEntitySheep` TAIL 追加 `addFood(0.5)` 并出 `grass src=sheep` 行；自然面由 vanilla `EntityAIEatGrass`（1/1000 per tick 起手，40 tick 咀嚼）驱动。
- **M6 持久化读法**：远格双笼放在世界出生区块与畜栏 160 格视距之外——出生时不加载、不 tick；`tp` 落地加载后 `ticksExisted` 从 0 起，首次 100-tick pass 需 5 s，故 seed→dump（b1）与 load→dump（b2）均在窗内精确。R10 的读回恰好各撞 1 个 pass，数值按 R196 语义演进（详见 C-10b2-3）。

## §3 零回归与通道

- **b1 通道**：`[FarmLog]` **229**（`growth rate` 124／`growth gate dry` 37／`livestock-value` 83／`manure` 6／`drought` 5／`food src=` 4／`water src=` 3／`grass src=` 3／`milk` 2）；`[AILog] production` **5**（`jump=true` 3／`egg` 2）；`[EnchantLog]` 4（显式 token）；`[MeleeLog]`／`[MiningLog]`／`[ButchLog]`／`[ArrowLog]`／`[CapLog]` **全 0**；`[FoodLog]` 0（`foodDebugLog=false`）；`[DamageLog]` **256**＝248 `src=outOfWorld`（分批清场 kill）＋8 `src=player`（4 次自然窗击打 ×2 行）；`inWall` **0**（守门 0 行）。
- **b2**：`mixinFail` 0；`Done (1.086s)`；停服 exit0＋`BUILD SUCCESSFUL`。
- **R11 token 面**：32 件全发（批一 27 件 ＋ `prod … water=/food=/hp=/grass=/jump=` 5 件），`tokenErrors 0`、服务器存活；平台半径 1 发送，不触达判点实体。

## §4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `9df2124`／收 `9df2124`（`9df2124..HEAD` = **0** 提交） |
| jar | release 1,002,277 B `686A00F1B5532220577F67DFE48E33C49928ED7E3AFBF969B52CB31971632F25`；dev 982,584 B `F9E6894F5B46FC580B3F6D64159CD122865D96110DB16ADC41D13DEC56C88C7E`；sources 914,395 B `1F527C7158AD0B6AE9812199A0E935510BA16898AB2A387203CD7F9B501024CD`（起收同值） |
| MK | refmap **80** 类键／**174** 面（双树同，dual 348）；mixins **76**＋client 10；mixinFail **0**（2/2） |
| cfg | 注册 **245** 键（`config.getX("…")` 计数 245；文件 **247**＝245＋孤儿 `qualityDefaultMax`／`mobwakeRarity`）；48,125 B／`7EE894091800B7E3E18AEE1144F59B193C4428E98AB9106322B949375A94BA6B`（起收同 hash）；收口 `farmDebugLog=false`／`mobDebugLog=false`／`livestockProductionR196=true` |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 940 B／`DCA7A9A8E5B331102AE26113C260E274DE07085C6E06E8AC6533980C584B8AD3`／`level-name=f10pgb3`（窗前快照值，起收同 hash；见 C-10b2-7） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `f10b2v` 已整档删除；无残留游戏 JVM |
| 停服 | b1/b2 均 exitCode **0**＋`BUILD SUCCESSFUL`（Done 5.190／1.086 s） |

## §5 冲突分级

- **A 级：0**。
- **B 级：0**（水/手喂/跳羽/羊尾五面与 R196 判值逐项对位；判据通道无缺口）。
- **C 级：9**
  - **C-10b2-1**（工装·clamp）：`/etest prod` 的 `jump=` 被 `MathHelper.clamp(v,0,256)` 截到 256（任务书写的 2000/400 实收 256，回行 `jump=256` 可证），`grass=` 截到 64。判值不受影响（256 次 1/40 仍 99.8% 覆盖首掉），但任务书数值需按回行读。
  - **C-10b2-2**（判据·自然跳羽窗口径）：纯游走面实测 **0.208 climbs/s**（8 只鸡 130 s、27 次攀爬），300 s 期望仅 ~62 跳 → 1/40 掉羽有 ~20% 空窗风险；故 R8② 改用 vanilla `EntityAIPanic`（creative 击打 4 只鸡 → 5-7 格 1.4x 逃逸跨台阶；`instant_health` 每 2 轮回血）。pilot 28 s 出首行、判窗 cycle 1 出 1 行，全程**无工装 jump 调用**，仍是真 `jump()` 面。
  - **C-10b2-3**（判据·R10 pass 演进）：seed→stop 与 load→read 各撞 1 个 100-tick pass（牛奶表吸 counter、鸡 well pass +1），故读回值是「种子 ± 1 pass」；持久性由算术闭环证成：牛 `69＝61＋(7+1)`（非默认 100）、鸡 `43＝42＋1`（非默认 0）、freedom 原值 −0.005（未重掷）。seed 值特意避开默认位（counter 7／milk 61），使有/无 pass 都不与 fresh 初始化混淆。
  - **C-10b2-4**（判据·deny 行性质）：R2/R6/R7 的 `deny` 行是工装观察行（R196 语态为静默 fall-through / answered-cancel），判值仍以「无动作＋手不消耗＋零 vanilla 子面（无子代、无 ageUp、无伤害）」三证为准。
  - **C-10b2-5**（工装·`/clear` 计数形态）：1.12 `CommandClearInventory` 的 `args[2]=metadata`、`args[3]=maxCount`，只读计数须写 `clear <p> <item> -1 0`；`clear <p> <item> 0` 会按 metadata=0 全清。本窗手牌/消耗全部走 `-1 0`。
  - **C-10b2-6**（判据·R6 漂移余量）：`water=0.2` 种子与点击间若跨一个 wellness pass，`+0.05` 可把水推过 0.25 使 family_gate 失效；驱动内建 3 次重试（本窗 attempt 1 即中）。属种子时序，不是产品偏差。
  - **C-10b2-7**（簿记·props 基线）：窗前 props 为主会话烟测遗留（`level-name=f10pgb3`，940 B `DCA7A9A8…`），本窗按窗前快照原样回写（起收同 hash）；`run/f10pgb2`、`run/f10pgb3` 两个烟测世界仍在本窗未动（判窗只删自己的 `f10b2v`）。
  - **C-10b2-8**（判据·R7 自然成长）：1.12 幼崽 Age 每 tick 自然 +1，故「零 ageUp」不能只看 Age 为负；本窗用四读轨迹（−23564→−23304→−22947→−22794）与 elapsed tick 对齐，`R6→R7` 段 +153（若 vanilla `ageUp` 触发应一次 +120、合计 ~+260）。
  - **C-10b2-9**（通道·Damage 余量）：`[DamageLog]` 256 行＝248 `outOfWorld`（分 3 批清场）＋8 `player`（自然窗击打），无 `inWall`/`mob` 行；属清场与自然窗手法面，不涉及判点实体。

## §6 自报（机械核讫）

> 正本：`testharness/reports/b10b2-verify-verdict.md`｜byte 五项：`18,173 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 102（split 103）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`2C4F3959C5781D8690982E3D40E78FCC7F147FE725C492661B2FC338A3D12CBC`
> SHA-256 乙（LF 归零零位）`2C4F3959C5781D8690982E3D40E78FCC7F147FE725C492661B2FC338A3D12CBC`
> SHA-256 丙（行链零位）`4BDF9223CF417131CD9EA405C0D82D462DBDDC939ECC54457001386A80563619`
> 判格 13＝✓ 13／✗ 0｜R1 serve add=1.0/meter=1.00＋换桶／R2 deny 1.00＋手不消耗＋零 Damage／R3 creative 不换手／R4 add=0.5 hp=0.70 love=false＋小麦 0／R5 love=true＋InLove 566／R6 family_gate＋wheat 1＋牛数 2→2／R7 child＋Age 自然轨／R8① 1 drop num=1/2 后全干、②自然 panic 行／R9① add=0.5 food 0.50、②自然行／R10 69＝61+8、43＝42+1、hp 3.0、feathers 1/2／R11 milk 2 行＋蛋 2＋farm 72/21＋manure 4＋32 token 0 错＋五通道 0／R12 245(247) 双旗 false 起收同 hash
> 窗口账：2 boot；0 rebuild／0 客户端／0 产品码；`[FarmLog]` b1 229／b2 0；mixinFail 0×2；三口径数字由 `f7-wb-spec2.js` 自指迭代至稳定。
