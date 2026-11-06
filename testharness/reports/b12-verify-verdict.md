# 繁殖臂（mate）· **W-B12 判决**（B-12 批，EntityAIMate 家族，HEAD `37dd834`）

> **HEAD**：`37dd834`（`37dd83415eb4f00ba491754503c328ab6f5feb05`；窗内 **0 提交**，起收同 commit）
> **jar**：`build/libs/etim-1.0.0.jar` **1,018,561 B**｜SHA256 `BE9A12B5238244FDCE1235575681E91BE00D958344DF33F334453759D4BCBD3D`｜MD5 `86BDE4637203E209EAECB9190569563D`｜mtime `2026-11-06 20:20:44`（起收同值，**0 rebuild**）
> **refmap**：classes **84** / entries **186**（dual **372**；`build/resources/main` 与 `build/tmp/mixins` 双树同值）
> **mixins**：**80** + 10 client（`mixins.etim.json`；三 B-12 件 `MixinEntityAIMate`／`MixinEntityAgeable`／`MixinEntityEgg` 均登记且均嵌 jar）
> **执行方**：会话七（etim-verification）｜**日期**：2026-11-06（CST）｜**窗口形态**：**主窗 2 boot**（b1＝R0/R1–R5/R12-pre；b2＝旗下面 R6）；**0 客户端／0 产品码／0 rebuild**；单假人 `ETIM_F7`；判窗世界 `w-b12v1`（收口整档删）
> **判决源**：W-B12 任务书（2026-11-06 20:40）＋ 账册条 309/310/311 ＋ R196 一手 `mite-src/decompile/src/net/minecraft/{EntityAIMate,EntityAgeable,EntityLivestock,EntityCow,EntityEgg,ItemMonsterPlacer}.java` ＋ 1.12 一手 `build/rfg/minecraft-src/java/net/minecraft/{entity/ai/EntityAIMate,entity/EntityAgeable,entity/passive/EntityAnimal,entity/projectile/EntityEgg}`（**独立复判，不沿用烟测结论**）
> **报告字节规格**：`35,938 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 43 / ✗ 23｜275 行`
> **判决**：**R0 ✓／R1 ✗／R2 ✓／R3 ✓／R4 ✗／R5 ✓／R6 ✓**（7 臂，✓5／✗2；子判点 10✓／2✗）｜**A 2／B 1／C 11**
> **一句话**：16000 双亲冷却、−64000 新生儿、大锅 <code>−1</code> 锁、desperate 冻结＋窗群解冻、spawn egg −64000、旗断回 vanilla（6000/−24000/零 agegate）全部逐位命中；**但两处落码不达判值**：① 领养三值被延迟 init 在子代第一 tick 覆盖（adopt 行＝min 双亲，子代 NBT 却是 0.8–1.0 随机带）；② 扔蛋砸伤 `@ModifyArg` 与调用点 owner 不匹配（`EntityLivingBase` vs `Entity`），旗内仍是 vanilla `0.0F`。

## §0 逐臂判读表

| 臂 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R0** boot 面 | `Done (`＋mixinFail；mixins 80+10／refmap 84/186 双树／cfg 245／三件嵌 jar | 双面相符 | b1 `Done (5.596s)`、b2 `Done (1.078s)`，`mixinFail` **0×2**；`mkCounts` refmap **84/186**（双树同，dual 372）、manifest **80+10**；三 B-12 class 均在 jar（`jarMixins=true×3`）且均登记；cfg `codeKeys=245`／`fileKeys=247`；b1 `needs=true`＋`production=true`＋`farm/mob/damage=true`，b2 `needs=false` | ✓ |
| **R1** spawn 臂 | `food src=cow serve … love=true`×2＋`breed src=adopt`＋双亲 Age∈(10000,16000]＋child∈[−64000,−50000]＋child ForgeCaps＝min(双亲) | 四子项全成立 | (i) serve `add=0.5 food=0.90 hp=1.00 love=true`×2 → adopt 行 `food=1.00 water=0.29 freedom=1.00`＝**min(双亲)**（cow1 water 0.285／cow2 water 0.685→取 0.29 ✓）；(ii) 双亲 NBT `Age=15995/15995`（＝16000−5 tick）；(iii) child `Age=−63995`；(iv) child ForgeCaps `food=0.8691 water=0.8947 freedom=0.8687 inited=1b`＝**init 随机带**，≠adopt 行值 → **✗** | **✗**（iv 损） |
| **R2** cauldron 锁 | age0=age1=−1 delta=0（≥6 s）＋cancel ≥5 且首行 ≥ 出生+2.5 s；三控制组不触发 | 四支全中 | Age:−60 幼牛入锅（cap 于 TY+2）→ `age0=−1`、`age1=−1`、`delta=0`（冻结 6.2 s）；`cauldron cancel` **307 行**／`lock` **307 行**；首行 **3087 ms**（≥2500）；控制组：无锅 `Age=0`／零行、无挡头 `Age=0`／零行、Age:−64000 `Age=−63888`／零行 | ✓ |
| **R3** desperate 锁 | 双证：(i) 区内双 dump food<0.05 且 delta=0；(ii) cancel 行按 age 分窗，每窗 ≥10 行 age 恒定、窗间 delta>0 | 双证成立 | (i) shot `a0=a1=−63630`、`f0=f1=0.04`、`w=1.00`、delta **0**；(ii) 5 窗：`−63630`(96 行)／`−63734`(11)／`−63823`(26)／`−63897`(41)／`−63956`(55)，**held=5**，窗间锚差 **104/89/74/59**（全 >0，解锁间隙自由生长）；cancel 229＝lock 229 | ✓ |
| **R4** 扔蛋（F-C） | (i) 8+32 概率孵 0–4 只（陪跑）(ii) 雏 Age≈−64000+Δ (iii) 砸伤 **1.0F**（旗内 MITE） | (iii) 成立 | (i)(ii) 40 蛋落地 → **5 只雏**（`botCount=5`；NBT Age `−63862/−63856/−63898/−63902/−63893`，全部 ∈[−64000,−63000]）；(iii) 猪靶 3 发 `[DamageLog] dmg … src=thrown raw=0.000`（armorIn/armorOut/final 全 0.000），猪 Health **10.0→10.0** → **✗**（vanilla 值未被改写；根因见 A-12-2） | **✗**（iii 损） |
| **R5** spawn egg | 对成年 cow 用 cow spawn egg → 新 cow Age≈−64000+Δ | 命中 | 成年牛（`Age=0`）＋`minecraft:spawn_egg 1 92 {EntityTag:{id:"minecraft:cow"}}`→ 场内 1→2 头，新牛 `Age=−63963`（＝−64000+37 tick）、`food=0.9315 water=0.8449`；`held=spawn_egg` | ✓ |
| **R6** 旗断零回归 | needs=false：adopt 0＋parents≈6000−Δ＋child≈−24000+Δ＋agegate 0 | 全 vanilla 机位 | 手喂 serve `food=0.70 love=false`×2（旗下面 love 臂不点火，见 C-12-2；`freedom=0.0` 实证 cap init 全关）；改 `{InLove:600}` 直起 Love 位 → adopt 行 **0**、双亲 `Age=5931/5930`、child `Age=−23930`、`agegate src=` **0**；同档丢蛋 `raw=0.000`（vanilla） | ✓ |

> 判格：**R0 ✓｜R1 ✗｜R2 ✓｜R3 ✓｜R4 ✗｜R5 ✓｜R6 ✓**；子判点 **10 ✓／2 ✗**。A 2（A-12-1／A-12-2）／B 1／C 11。

## §1 逐方法核讫表（R196 一手 × 1.12 载体 × ETIM 落码）

| 面 | R196 一手（逐字锚） | 1.12 载体 | ETIM 载体 | 实测 | 判 |
| --- | --- | --- | --- | --- | --- |
| **F-A(1)** 双亲繁殖冷却 | `EntityAgeable.setGrowingAgeAfterBreeding :57-59` → `setGrowingAge(16000)`；调用点 `EntityAIMate.spawnBaby :70-71` | `EntityAIMate.spawnBaby :143-144` `setGrowingAge(6000)`×2（javac owner＝静态型 `EntityAnimal`） | `MixinEntityAIMate.etim$breedAdultAges`（target `Lnet/minecraft/entity/passive/EntityAnimal;setGrowingAge(I)V`）→ `r196BreedCooldown(6000)=16000` | 双亲 `Age=15995/15995` | ✓ |
| **F-A(2)** 新生儿起始龄 | `EntityAgeable.getGrowingAgeOfNewborn :49-51`＝−64000；`setGrowingAgeToNewborn :53-55`；调用点 `EntityAIMate :74` | `spawnBaby :147` `setGrowingAge(-24000)` | `MixinEntityAIMate.etim$breedAges`（target `EntityAgeable;setGrowingAge`）→ `r196BreedCooldown(<0)=−64000` | child `Age=−63995` | ✓ |
| **F-A(3)** 领养三需求 | `EntityLivestock.adoptWellnessFromParents :395-409`（`min(双亲)`，非 livestock 亲代 1.0F）；调用门 `EntityAIMate :76-78`（`!isRemote ∧ instanceof EntityLivestock`） | 1.12 无此面 | `MixinEntityAIMate.etim$spawnThenAdopt`（`World.spawnEntity` redirect：先 spawn 后 adopt）＋`ETIMLivestockEvents.adoptWellnessFromParents` | adopt 行＝min 双亲 ✓；**child ForgeCaps 被延迟 init 覆盖** ✗ | **✗** |
| **F-B(1)** 大锅锁 | `EntityAgeable.setGrowingAge :33-47`：`was_child ∧ par1>=0 ∧ 足下==cauldron ∧ !isAirOrPassableBlock(y+1,true)` → `par1=-1` | `EntityAgeable.setGrowingAge :169-174` 无此门 | `MixinEntityAgeable.etim$ageGate`（HEAD cancellable：`cauldronAgeLock` 命中→重入写 `-1`→cancel 本体；`@Unique` re-entry guard） | `age0=age1=−1 delta=0`；307 行 cancel；首行 3087 ms | ✓ |
| **F-B(2)** spawn egg 位 | `ItemMonsterPlacer.tryEntityInteraction :45-77`，esp. `:62 setGrowingAgeToNewborn()`＝−64000 | `EntityAgeable.processInteract :37-67`，`:49 setGrowingAge(-24000)` | `MixinEntityAgeable.etim$spawnEggAge`（`processInteract` 内 `setGrowingAge` redirect）→ `r196NewbornAge(−24000)=−64000` | 新牛 `Age=−63963` | ✓ |
| **F-C(1)** 扔蛋雏龄 | `EntityEgg :30` `setGrowingAgeToNewborn()`＝−64000 | `EntityEgg.onImpact :78` `setGrowingAge(-24000)` | `MixinEntityEgg.etim$chickenNewbornAge`（`EntityChicken;setGrowingAge` redirect）→ −64000 | 5 只雏 Age −63862…−63902 | ✓ |
| **F-C(2)** 扔蛋砸伤 | `EntityEgg :19` `attackEntityFrom(new Damage(…), 1.0F)` | `EntityEgg.onImpact :61` `attackEntityFrom(…, 0.0F)` | `MixinEntityEgg.etim$eggImpactDamage`（`@ModifyArg index=1`，target 写 `Lnet/minecraft/entity/EntityLivingBase;attackEntityFrom(…)Z`） | 猪靶 3 发 `raw=0.000`，Health 不变；**mixin 导出证 target 未命中**（见 A-12-2） | **✗** |
| **F-D** desperate 锁 | `EntityLivestock.setGrowingAge :389-393`：`!isChild ∨ par1<=current ∨ (!desperateFood ∧ !desperateWater)` → 跳过 `super` | `EntityAgeable.setGrowingAge :169-174` 无此门 | `MixinEntityAgeable.etim$ageGate`（`desperateAgeLock`→`ci.cancel()`；`mobDebugLog` 门下 `agegate src=desperate lock/cancel` 探针） | shot `a0=a1=−63630 food=0.04` delta 0；5 窗恒定 + 窗间 104/89/74/59 生长 | ✓ |

> **全同判值（对照 条 309 §一 16 条，不动，本轮抽验位）**：ctor mutex 3／`shouldExecute` 双 inLove／续行 `delay<60`／`resetTask` 清零／`updateTask` look 10.0F＋`tryMoveToEntityLiving`／终触发 `delay>=60 ∧ distSq<9.0`／`getNearbyMate` 同类+expand 8+最近／`canMateWith`／`isInLove` 600／`age!=0→inLove=0`／心粒子 `%10`／受击清 love／`setLocationAndAngles(…,0F,0F)`／XP orb `nextInt(7)+1`／四宿主 `addTask` 位。本轮 spawn 臂同时证明 ②④⑤⑥⑦⑧⑨⑩⑬⑭ 的出口一致（双亲 `InLove=0`＝复位面、spawn 位置＝母体位、单子代）。

## §2 判行样本（原文；正本 `f11-b12-verify-b1.out` / `-b2.out`）

**R0（boot 面）**
- `Done (5.596s)! For help, type "help" or "?"`
- `Done (1.078s)! For help, type "help" or "?"`
- `mixinFail=0 ×2`（全档 `Mixin apply failed|MixinException|InvalidInjectionException|Critical injection failure` 零命中）

**R1（spawn 臂）**
- `[FarmLog] food src=cow serve add=0.5 food=0.90 hp=1.00 love=true entity=EntityCow#2167 [server]`
- `[FarmLog] food src=cow serve add=0.5 food=0.90 hp=1.00 love=true entity=EntityCow#2168 [server]`
- `[FarmLog] breed src=adopt child=cow food=1.00 water=0.29 freedom=1.00 entity=EntityCow#2169 [server]`
- 双亲/子代 NBT（§3 原值）：`Age=15995`／`Age=15995`／`Age=−63995`，双亲 `InLove=0`

**R2（cauldron 锁）**
- `[FarmLog] agegate src=cauldron lock age=-1 entity=EntityCow#2170 [server]`
- `[FarmLog] agegate src=cauldron cancel age=-1 arg=0 entity=EntityCow#2170 [server]`
- `[FarmLog] agegate src=cauldron cancel age=-1 arg=0 entity=EntityCow#2170 [server]`（同值 307 行；首行距召唤 3087 ms）
- 控制组（三条都不出 `cauldron` 行）：无锅 `Age=0`／无挡头 `Age=0`／Age:−64000 `Age=−63888`

**R3（desperate 锁）**
- `[FarmLog] agegate src=desperate lock age=-63956 food=0.04 water=1.00 entity=EntityCow#2175 [server]`
- `[FarmLog] agegate src=desperate cancel age=-63956 arg=-63955 entity=EntityCow#2175 [server]`
- `[FarmLog] agegate src=desperate lock age=-63630 food=0.04 water=1.00 entity=EntityCow#2175 [server]`
- `[FarmLog] agegate src=desperate cancel age=-63630 arg=-63629 entity=EntityCow#2175 [server]`（窗群 5 段，见 §0）

**R4（扔蛋）**
- `[DamageLog] dmg target=Pig#2176 src=thrown raw=0.000 armorIn=0.000 armorOut=0.000 absorption=0.000 final=0.000 [server]`（×3）
- 雏 NBT：`Age=−63862`／`−63856`／`−63898`／`−63902`／`−63893`（5 只；`botCount=5`）
- 玩家靶：`[DamageLog] dmg target=ETIM_F7` **0 行**（2 发；见 B-12-1）

**R5（spawn egg）**
- 前置：`[AILog] mob despawn counter-meter counter=1 age=1 entity=EntityCow#2228`（成年牛 1 头）
- 后置：`Age=0`（亲本）＋`Age=−63963`（子代，`food=0.9315089 water=0.84485495`）同框两行

**R6（旗下面）**
- `[FarmLog] food src=cow serve add=0.5 food=0.70 hp=1.00 love=false entity=EntityCow#141 [server]`（×2，旗下面 love 臂不点火）
- 子代/双亲 NBT：`Age=−23930`／`Age=5931`／`Age=5930`
- `[DamageLog] dmg target=Pig#146 src=thrown raw=0.000 … [server]`（vanilla 面；与旗内同值＝A-12-2 的连带后果）

## §3 NBT 二进制读数（`/execute <sel> ~ ~ ~ entitydata @e[r=0,c=1] {}` 原值片段）

**R1 双亲 + 子代（spawn 后第 5 tick）**
- 亲本 A：`…,Health:10.0f,…,Age:15995,ForgeCaps:{"etim:livestock":{inited:1b,freedom:1.0f,milk:100,manureCountdown:…,water:0.28500003f,productionCounter:0,food:1.0f,…}},InLove:0,…`
- 亲本 B：`…water:0.685f,food:1.0f,freedom:1.0f…`，`Age:15995`，`InLove:0`
- 子代：`…Age:-63995,ForgeCaps:{"etim:livestock":{inited:1b,freedom:0.8687067f,milk:100,manureCountdown:21013,water:0.89468294f,productionCounter:0,food:0.8691246f,numFeathers:0,maxNumFeathers:0}}`
  → adopt 行 `(1.00,0.29,1.00)` vs 子代 `(0.8691,0.8947,0.8687)`；`inited:1b`＋`milk:100` 证明延迟 init 已跑（A-12-1 铁证）

**R2** 幼牛：`Age=-1`（两读相隔 6.2 s 同值）；控制组 `Age=0`／`Age=0`／`Age=-63888`

**R3** 幼牛：`food:0.04f water:1.0f`（seed 后）；`Age=-63630` 两读同值

**R4** 雏鸡：5 行 `Age=−63862…−63902`；猪 `Health:10.0f`（前）→`Health:10.0f`（后）

**R5** 同框两牛：`Age:0`＋`Age:-63963`

**R6** 双亲 `Age:5931`／`Age:5930`，子代 `Age:-23930`；手喂后 cap `freedom:0.0f`（cap init 全关的实证）

## §4 机制与口径

- **M1 双亲冷却/新生儿龄**：1.12 的两处 `setGrowingAge` 调用 owner 不同——父写是静态型 `EntityAnimal`（javac 指令含 `net/minecraft/entity/passive/EntityAnimal`），子写是 `EntityAgeable`。条 311 已把父写补成第二条 Redirect；本窗两条都命中（`15995`＝16000−5，`−63995`＝−64000+5，同一 tick 起算）。若只留单条 `EntityAgeable` Redirect，父写会泄回 vanilla 6000（条 311 首轮实证）。
- **M2 adopt 序位与延迟 init**：`etim$spawnThenAdopt` 在 `World.spawnEntity` 之后调 `adoptWellnessFromParents`（R196 :69-78 结构等值，cap 在 JoinWorld 后才可读）。但 ETIM 的 R196 构造期随机 init（`0.8+rand*0.2` 三需求＋manure/milk/feather 表）**不在 ctor 而挂在 `LivingUpdateEvent` 的 `!isInitialized()` 首 tick 分支**（`ETIMLivestockEvents:116-142`）。子代 spawn 与 adopt 同一 tick 完成，下一 tick init 把三需求重掷 → 领养值不落地。R196 是「ctor 先随机 → adopt 再覆盖」，ETIM 变成「adopt 先写 → 随机后覆盖」，**序位倒置**。
- **M3 cauldron 语义**：门只在 `par1>=0` 进入，故 Age:−60 的幼牛在 ~60 tick（3 s）后第一次撞门；`cauldronAgeLock` 把写值改成 −1 并重入一次（`@Unique` guard 防 −1 自锁死循环），随后 `ci.cancel()` 跳过本体 —— 年龄饱和在 −1，逐 tick 出 `lock`＋`cancel` 两行（mobDebugLog）。控制组三面各自卸掉一个门要素（无锅／无挡头／未到 0），全零行。
- **M4 desperate 语义**：`desperateAgeLock` 只拦「前进写」（`par1>current`），成长 `setGrowingAge(age+1)` 每 tick 都是前进写 → food<0.05 期间被 drop。wellness 每 100 tick（9/10 概率）跑一次 `+0.1`，food 越过 0.05 即解锁 → 窗群之间的锚差就是解锁间隙的自由生长（本窗 104/89/74/59 tick，量级与烟测 44-46 同型，随 wellness 命中间隔浮动）。
- **M5 spawn egg 的 1.12 前置**：`EntityAgeable.processInteract` 走 `ItemMonsterPlacer.getNamedIdFrom`，**只读 `EntityTag.id`，不读 damage**（`ItemMonsterPlacer:296-329`）。裸 `spawn_egg 1 92` 会 `oclass==null` 直接不产子（本窗首轮实证）；必须 `{EntityTag:{id:"minecraft:cow"}}`（C-12-5）。
- **M6 旗面分工（既有架构）**：手喂臂挂 `livestockProductionR196`，cap 的 init/wellness/eat 挂 `livestockNeedsR196`。旗下面（needs=false）手喂仍出 serve 行但 `freedom` 恒 0 → love 臂不点火 → R1 序不可用；R6 改 `{InLove:600}` 直起 Love 位（C-12-2）。
- **M7 冲击伤害出口**：1.12 `EntityEgg.onImpact` 的敌伤调用编译期 owner 是 **`net/minecraft/entity/Entity`**（`Entity.java:1721` 声明了基类 `attackEntityFrom` 恒 false），运行时虚拟派发到 `EntityLivingBase.attackEntityFrom`。ETIM 的 `@ModifyArg` 把 target 钉在 `EntityLivingBase` owner 上 → 调用点不匹配 → 注入静默未生效（mixin 导出：`result.entityHit.attackEntityFrom(…, 0.0F)` 原样保留，而同方法另一处 `@Redirect` 已改写成 `redirect$zdf000$etim$chickenNewbornAge`）。

## §5 冲突分级

- **A 级：2**（判值损，须改产品码＝rebuild，重验范围已列）
  - **A-12-1 · F-A(3) 领养值不落地（R1(iv) ✗）**。证据：adopt 行 `food=1.00 water=0.29 freedom=1.00`（＝min 双亲，逐位可核：cow1 `water=0.28500003`／cow2 `water=0.685`）vs 同子代 NBT `food=0.8691246 water=0.89468294 freedom=0.8687067`＋`inited:1b milk:100 manureCountdown:21013`（全为 init 随机位）。根因假设：`ETIMLivestockEvents.onLivingUpdate:116-142` 的延迟 init 在子代首 tick 覆盖 adopt 已写入的三需求（序位与 R196「ctor 随机 → adopt 覆盖」相反）。修法（二选一）：**甲（推荐）** `adoptWellnessFromParents` 内先补做未初始化的其余位（`manureCountdown=rand(period)`、cow `milk=100`、chicken `feathers 1..2` 含 1/2 修剪）并 `setInitialized(true)`，再写三需求 min —— 等价于 R196 ctor+adopt 合并在 adopt 点完成；**乙** 加「已 adopt」标记，`init` 块跳过三需求随机位但仍做其余位。重验范围：只重验 R1（R1(i)(ii)(iii) 已 ✓ 不必重跑别臂）。
  - **A-12-2 · F-C(2) 扔蛋砸伤未改写（R4(iii) ✗）**。证据：猪靶 3 发 `raw=0.000 armorIn=0.000 armorOut=0.000 final=0.000`、`Health 10.0→10.0`；mixin 导出（`run/.mixin.out/java/net/minecraft/entity/projectile/EntityEgg.java`）显示 `result.entityHit.attackEntityFrom(…, 0.0F)` **原样**，而同一 `onImpact` 内的 `setGrowingAge` Redirect 已改写 → 该 `@ModifyArg` 未命中。根因假设：调用点 owner＝`Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z`（基类声明位），`@ModifyArg` target 写的 `EntityLivingBase` owner 匹配不上（与条 311 修讫①同型：javac 静态型 owner ≠ 运行期接收者）。修法：把 target 改成 `Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z`（或再加一条同 mapper 的 `@ModifyArg`，照 `MixinEntityAIMate` 双 Redirect 铸范）；建议同时对 `@ModifyArg` 显式 `require = 1`。重验范围：只重验 R4(iii)＋R6 的同档丢蛋行（其余 R4 子项已 ✓）。
- **B 级：1**
  - **B-12-1 · 注入未命中无日志行**：`@ModifyArg` 未匹配时不产生 `Critical injection failure`/`mixinFail` 行（本窗 `mixinFail=0`，靠 `.mixin.out` 导出才发现）。影响面：任何「注入静默不生效」的面在判窗里都只能事后查导出。建议：给关键 `@ModifyArg/@Redirect` 显式 `require=1`，或判窗固定动作加一条「`.mixin.out` 导出抽查」。**不阻塞**（本窗两处 A 级均已定位）。
- **C 级：11**
  - **C-12-1**（判据·R1 种子）：任务书写 `hp=5.0`，但 `eatCore` 的 love 臂要求**吃前满血**（`ETIMLivestockEvents.eatCore` 中 `a.getHealth() >= a.getMaxHealth()` 才 `setInLove`）。烟测出现 `hp=1.00 love=true` 是因 `/give` 的 `makeFakeItem` 假实体先被地面拾臂吃掉→heal 到满血→再手喂（B-11 C-11-2 同源）。本窗改「`hp=10.0`＋`food=0.20`（hungry 半边放行 family gate）」，一次手喂即 `love=true`；判值不变。
  - **C-12-2**（判据·旗下面 love 位）：needs=false 时 `ETIMLivestockEvents.onLivingUpdate` 整块早退（:108），cap 永不 init → `freedom=0` → `min(...)=0` → 手喂 `serve love=false`（本窗两行实证）。故 R1 序在旗下面不可用；R6 改 `{InLove:600}`。属 B-10/B-11 期旗架构既有面（手喂＝production 旗、cap init＝needs 旗），非 B-12 判值。
  - **C-12-3**（工装·玩家靶）：蛋砸**玩家** 0 行（本窗 2 发＋首轮 4 发＝6 发全空，蛋在玩家箱内照常孵化）；改用猪靶读同一 `@ModifyArg` 出口（R196 :19 对任意 `getEntityHit()` 同值）。玩家分支为何无 `damageEntity` 未定（不影响 F-C(2) 判定，A-12-2 已由猪靶＋导出双证）。
  - **C-12-4**（簿记·vanilla 值）：任务书 R4(iii) 写「旗断＝1.5F（vanilla）」；1.12 一手 `EntityEgg:61 = 0.0F`，本窗旗断实测亦 `0.000`（R6）。以实测/一手为准。
  - **C-12-5**（工装·spawn egg 前置）：必须 `{EntityTag:{id:"minecraft:cow"}}`；只给 damage=92 不产子（M5）。
  - **C-12-6**（工装·锚定）：R2 控制组与 R3 双读需每读前 `tp` 锚定（牛会走出 dump 框）；首轮「无挡头」与 R3 双读全空即此因，改锚定后全绿。
  - **C-12-7**（协调·并行窗口）：21:08–21:19 另一会话在同工作区跑 `f11-b12-smoke.js`（世界 `w-b12a`）占 25565，本窗首轮探测与被中断一轮均 `FAILED TO BIND TO PORT`；已等其退出并以「端口闸＋3 次重试」重跑（本窗终轮 0 重试）。**同 `run/` 不能并行**（共享 `config/etim.cfg`、`server.properties`、`logs/`）。
  - **C-12-8**（簿记·props 基线）：B-11 期基线 941 B `D6A15630…`；本轮开窗前为 941 B `51549BFD6CA10CC79DA15AAE189CA8F217C90A1DB84991DD8DB96A7A96B52841`（同长度、`level-name=f10pgb13` 同值，其余键经多次 runServer 重写而变）。本窗起收同 hash（以本窗快照为准）；另一会话 smoke 遗留 `run/w-b12a` 未删、非本窗产物。
  - **C-12-9**（簿记·cfg 面）：起收同 hash **48,123 B／`55D4049028271A5782DF9D153F25C7F850E28F79F0475EA9B3BC52402D922BB6`**（`needs/production/farm/mob/damage=true`）。B-11 期 48,125 B／`7EE89409…` 是同文件「farm/mob=false」旗面；本窗按任务书 R0 要求双 debug 旗 true 开窗并原样回写，封批若要关旗会改 hash（登记）。
  - **C-12-10**（簿记·MK_PIN）：`f7-wb-lib.MK_PIN` 仍钉 B-11（81/176/77＋HEAD 275c5bc）→ `mkCounts().ok=false`；本窗按任务书以 B-12 实数（84/186/80+10）自校（`mkOk=true`），封批时随 B-12 收编更新。
  - **C-12-11**（通道·探针频率）：`agegate src=desperate` 每 tick 两行（lock+cancel，~40 行/秒），仅 `mobDebugLog` 门下；判读按窗群聚合不逐行计。条 310 C-12-2「节流待裁」沿用，本窗不裁。

## §6 判值伪代码建议（对照 R196 一手）

```
// ── F-A(1)(2) EntityAIMate.spawnBaby（R196 :68-101 ｜ 1.12 :114-166）
child = animal.createChild(targetMate)
if (child != null) {
    animal.setGrowingAgeAfterBreeding()      // R196 :70 → 16000   ｜1.12 :143 6000
    targetMate.setGrowingAgeAfterBreeding()  // R196 :71 → 16000   ｜1.12 :144 6000
    animal.resetInLove(); targetMate.resetInLove()
    child.setGrowingAgeToNewborn()           // R196 :74 → −64000  ｜1.12 :147 −24000
    child.setLocationAndAngles(animal.posX, animal.posY, animal.posZ, 0F, 0F)
    if (!world.isRemote && child instanceof EntityLivestock)       // R196 :76
        child.adoptWellnessFromParents(animal, targetMate)          // R196 :77
    world.spawnEntity(child)                                        // R196 :80
}
// 落码现状：三处 setGrowingAge 经两条 Redirect（EntityAgeable owner＋EntityAnimal owner）+ World.spawnEntity redirect。
// A-12-1 修法（甲）：把「延迟 init 的其余位」并进 adopt，再写 min ——
adoptWellnessFromParents(child, a, b):
    if (world.isRemote || !flag || !isLivestock(child)) return
    s = ETIMLivestock.get(child); if (s == null) return
    if (!s.isInitialized()) {                       // ← 补做 R196 ctor :26-28/:18/:25-30
        r = child.getRNG()
        s.setManureCountdown(r.nextInt(manurePeriod(child)))
        if (child instanceof EntityCow)     s.setMilk(100)
        if (child instanceof EntityChicken) { m = 1 + r.nextInt(2); if (m>1 && r.nextInt(2)==0) m--; s.setMaxNumFeathers(m); s.setNumFeathers(m) }
        s.setInitialized(true)
    }
    s.setFood  (min(need(a,FOOD),    need(b,FOOD)))     // R196 :399-405
    s.setWater (min(need(a,WATER),   need(b,WATER)))    // R196 :401-406
    s.setFreedom(min(need(a,FREEDOM),need(b,FREEDOM)))  // R196 :403-407
    row("breed src=adopt child=… food=… water=… freedom=…")
need(p, n) = p instanceof EntityLivestock ? get(p, n) : 1.0F   // R196 :399-404

// ── F-B(1) cauldron lock（R196 EntityAgeable :33-47）
setGrowingAge(par1):
    was_child = isChild()
    if (was_child && par1 >= 0
        && world.getBlock(pos) == cauldron
        && !isAirOrPassableBlock(pos.up(), true)) par1 = -1      // R196 :35-40
    dataWatcher.set(AGE, par1); setScaleForAge(isChild())
    if (was_child && !isChild()) pushOutOfBlocks()               // R196 :44-46

// ── F-B(2) spawn egg（R196 ItemMonsterPlacer :45-77）
processInteract → if (held == SPAWN_EGG && class matches)
    newborn = createChild(this); if (newborn == null) return false
    newborn.setGrowingAgeToNewborn()            // R196 :62 → −64000  ｜1.12 :49 −24000
    newborn.setLocationAndAngles(posX,posY,posZ,0F,0F); world.spawnEntity(newborn)
    if (!creative) held.shrink(1)

// ── F-C(1)(2) EntityEgg.onImpact（R196 :17-34）
onImpact(rc):
    if (rc.isEntity()) rc.getEntityHit().attackEntityFrom(thrownDamage, 1.0F)   // R196 :19 ｜1.12 :61 0.0F
    if (!world.isRemote && rand.nextInt(8) == 0) {
        n = (rand.nextInt(32) == 0) ? 4 : 1
        repeat(n) { c = new EntityChicken(world); c.setGrowingAgeToNewborn(); /* −64000 */ … }
    }
    particles(8 × snowballpoof); if (!world.isRemote) setDead()
// A-12-2 修法：@ModifyArg target 改
//   Lnet/minecraft/entity/Entity;attackEntityFrom(Lnet/minecraft/util/DamageSource;F)Z
//   （调用点 owner＝Entity，见 Entity.java:1721；或照 MixinEntityAIMate 加第二条同 mapper）

// ── F-D desperate lock（R196 EntityLivestock :389-393）
setGrowingAge(par1):
    if (!isChild() || par1 <= getGrowingAge()
        || (!isDesperateForFood() && !isDesperateForWater()))
        super.setGrowingAge(par1)               // 放行
    // else: 静默丢弃（不位移、不补写）
```

## §7 自报（机械核讫）

> spec 行的 ✓／✗ 是全档字形机械计数（含 §0/§1 判格表的失败格），不是判格；判格以 §0 为准（7 臂：✓5／✗2）。
> 正本：`testharness/reports/b12-verify-verdict.md`｜byte 五项：`35,938 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 274（split 275）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`E33CBE0BFC3F47F5B9921C88F10AED34B4220F94E4C5ED97C7AD481BAC37B1E5`
> SHA-256 乙（LF 归零零位）`E33CBE0BFC3F47F5B9921C88F10AED34B4220F94E4C5ED97C7AD481BAC37B1E5`
> SHA-256 丙（行链零位）`5B4EB72386922690000FF62FB45FF4A636BA1E95A8116CB7625B34EB4B85F8AF`
> 判格 7＝✓ 5／✗ 2（子判点 10／2）｜R0 boot 双面（5.596/1.078 s·mixinFail 0·mixins 80+10·refmap 84/186·三件嵌 jar）／R1 spawn（serve love=true×2·adopt＝min 1.00/0.29/1.00·双亲 15995·子 −63995·**子代 cap 被 init 覆盖 ✗**）／R2 大锅（−1/−1/delta 0·307 行·首行 3087 ms·三控制组零行）／R3 desperate（−63630 双读 food 0.04·5 窗 96/11/26/41/55·锚差 104/89/74/59）／R4 扔蛋（5 雏 −63862…−63902·**砸伤 raw 0.000 ✗**）／R5 spawn egg（−63963）／R6 旗断（adopt 0·5931/5930·−23930·agegate 0）
> 窗口账：2 boot（5.596／1.078 s）＋2 停服（exit 0＋BUILD SUCCESSFUL）；0 rebuild／0 客户端／0 产品码；cfg 起收同 hash 48,123 B `55D40490…`；jar/MK 起收同值；obf 30,524 B `262BFF5E…` 未动；props 941 B `51549BFD…` 起收同 hash；crash 21→21；端口 0→0；HEAD `37dd834` 起收同、0 提交；判窗世界 `w-b12v1` 已删；三口径数字由 `f7-wb-spec2.js` 自指迭代至稳定。

---

# 附：**W-B12b 单点回归**（A-12-1／A-12-2 修复后，B-12 批增量）

> **HEAD**：`37dd834`（窗内 **0 提交**，起收同）｜**jar**：`build/libs/etim-1.0.0.jar` **1,018,656 B**｜SHA256 `780E917AC3F0940276219C5E6928A5DECB71F5F66869E961DFDCD92BE7ED1F41`｜MD5 `82DABAACC0F4D5209B730DEA68A62ED0`（起收同值，**0 rebuild**）
> **refmap**：classes **84** / entries **186**（dual 372，双树同）｜**mixins**：**80** + 10 client｜三 B-12 件均嵌 jar（`111`）且均登记
> **B-12-1 收口**：三条注入全部 `require = 1`（`MixinEntityAgeable.setGrowingAge` Inject、`MixinEntityAIMate` 三条 Redirect、`MixinEntityEgg` 两条）；boot 双面 `mixinFail=0`，无 `Critical injection failure`／`require … not found`
> **窗口**：2 boot（5.317／1.054 s）＋2 停服（exit 0＋BUILD SUCCESSFUL）｜单假人 `ETIM_F7`｜世界 `w-b12v2`（收口删）｜**0 客户端／0 产品码改动**
> **判决**：**R0b ✓｜R1b ✓｜R4b ✓｜R6b ✓**（A-12-1／A-12-2 **闭合**；R0/R2/R3/R5/R6 原判封存不动）

## 附 §1 逐点判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **R0b** boot 面 | Done＋mixinFail 0＋jar/refmap/mixins 钉值＋三件嵌 jar＋cfg 245＋`.mixin.out` 两改写位 | b1 `Done (5.317s)`、b2 `Done (1.054s)`，`mixinFail=0×2`；jar 字节/MD5/SHA256 三值同钉值；`mkCounts` 84/186（dual 372）＋80+10；`jarMixins=111`；`cfgCode=245/file=247`；refmap owner 自检：`EntityLivingBase;func_70097_a` **0** 项／`entity/Entity;func_70097_a` 命中；导出件：`attackEntityFrom(…, this.modify$zdf000$etim$eggImpactDamage(…))`（handler 体 `livestockNeedsR196 ? 1.0F : amount`）＋`this.redirect$zdf000$etim$chickenNewbornAge(entitychicken, injectorAllocatedLocal6)` | ✓ |
| **R1b** F-A(3) 领养落地 | (a) adopt＝min(双亲)；(b) child NBT 三需求＝adopt 值（≤2 s 紧窗）＋init 位并验 | (a) serve `love=true`×2 → adopt 行 `food=1.00 water=0.29 freedom=1.00`；双亲同窗读 `water=0.28500003`／`0.685` → **min＝0.28500003**（打印 0.29）✓（b）**adopt 行后 900 ms** 取子代 NBT：`food=1.0 water=0.28500003 freedom=1.0`，**与 min(双亲) 三项绝对差全 0**（与 adopt 行仅 water 有 0.005＝`%.2f` 打印舍入）；`inited:1b milk:100 manureCountdown:23892`（init 位已跑且未覆盖领养值）；child `Age=−63996`、双亲 `15996/15996` | ✓ |
| **R4b** F-C(2) 蛋伤 | (a) raw=1.000（不再 0.000）(b) 靶 health 硬扣 1.0 (c) R4(i)(ii) 不回退 | (a)(b) 猪靶 3 发：`src=thrown raw=1.000 armorIn=1.000 armorOut=1.000 absorption=0.000 final=1.000`×3；Health **10.0→7.0**（每发 −1.0） ✓（c）40 蛋雨 → **6 只雏**（`botCount=6`、`err=0`），Age `−63877/−63897/−63724/−63859/−63898/−63893` 全 ∈[−64000,−63000] | ✓ |
| **R6b** 旗断蛋伤对照 | needs=false：raw=0.000＋雏 Age≈−24000 | 猪靶 2 发 `raw=0.000 armorIn=0.000 armorOut=0.000 final=0.000`×2，Health **10.0→10.0**；40 蛋雨 → **5 只雏**，Age `−23879/−23880/−23799/−23891/−23902` 全 ∈[−24000,−23000]（`setGrowingAge` Redirect 原值直通）；同 boot `breed src=adopt` **0** 行、`agegate src=` **0** 行 | ✓ |

## 附 §2 判行原文（每点 ≥3 行）

**R0b · `.mixin.out` 抽查（`run/.mixin.out/java/net/minecraft/entity/projectile/EntityEgg.java`）**
- `var10000.attackEntityFrom(var10001, this.modify$zdf000$etim$eggImpactDamage(injectorAllocatedLocal5));`
- `this.redirect$zdf000$etim$chickenNewbornAge(entitychicken, injectorAllocatedLocal6);`
- `private float modify$zdf000$etim$eggImpactDamage(float amount) {` → `return ETIMConfig.livestockNeedsR196 ? 1.0F : amount;`
- 同件 `attackEntityFrom` 裸 vanilla 形 `, 0.0F)` 命中 **0**（旧版 0.0F 原样位已消失）

**R1b · spawn/领养**
- `[FarmLog] food src=cow serve add=0.5 food=0.90 hp=1.00 love=true entity=EntityCow#2194 [server]`
- `[FarmLog] food src=cow serve add=0.5 food=0.90 hp=1.00 love=true entity=EntityCow#2195 [server]`
- `[FarmLog] breed src=adopt child=cow food=1.00 water=0.29 freedom=1.00 entity=EntityCow#2197 [server]`
- 子代 NBT：`Age:-63996,ForgeCaps:{"etim:livestock":{inited:1b,freedom:1.0f,milk:100,manureCountdown:23892,water:0.28500003f,productionCounter:0,food:1.0f,numFeathers:0,maxNumFeathers:0}}`
- 双亲同窗：`Age:15996 water:0.28500003f`／`Age:15996 water:0.685f`（min 侧＝0.28500003，与子代逐位同）

**R4b · 蛋伤（旗内）**
- `[DamageLog] dmg target=Pig#2198 src=thrown raw=1.000 armorIn=1.000 armorOut=1.000 absorption=0.000 final=1.000 [server]`（×3）
- 猪 Health 前/后：`10.0f` → `7.0f`
- 雏鸡 6 只 `Age=−63877/−63897/−63724/−63859/−63898/−63893`
- 蛋雨期间另有 4 条 `target=Chicken#… src=thrown raw=1.000`（雏鸡互击，同一改写出口，非独立臂）

**R6b · 旗断对照**
- `[DamageLog] dmg target=Pig#140 src=thrown raw=0.000 armorIn=0.000 armorOut=0.000 absorption=0.000 final=0.000 [server]`（×2）
- 猪 Health 前/后：`10.0f` → `10.0f`
- 雏鸡 5 只 `Age=−23879/−23880/−23799/−23891/−23902`
- 同 boot：`breed src=adopt` 0 行、`agegate src=` 0 行

## 附 §3 冲突分级（增量）

- **A 级：0** —— **A-12-1 闭合**（adopt 三值与子代 NBT 三项绝对差全 0；`inited:1b` 不再覆盖）、**A-12-2 闭合**（`raw=1.000`，导出件两改写位齐备，`EntityLivingBase` owner 项 0／`Entity` owner 命中）。
- **B 级：0** —— **B-12-1 收口**：三条注入均 `require = 1`，boot 双面 `mixinFail=0` 且无未命中告警；`.mixin.out` 导出抽查已成为固定动作（本窗附 §2 落文）。
- **C 级：4（全簿记/工装）**
  - **C-12b-1**（判据·舍入）：R1b(b) 以 **min(双亲) 精确值**为锚（子代 `water=0.28500003` 与父值逐位同），adopt 行是 `%.2f` 打印（`0.29`）——两者差 0.005 属打印舍入，非判值差。
  - **C-12b-2**（工装·蛋雨副作用）：R4b(c) 蛋雨期间雏鸡被落蛋砸中，产生 `raw=1.000` 的 `target=Chicken` 行（4 条）；与本臂判点同出口，登记备查，不计入样本量。
  - **C-12b-3**（工装·读数窗）：R1b 首读 `gapMs=900`（≤2 s 判据内），无需二次 dump（`retried=false`）；wellness 100-tick pass 未进入该窗，读数为 adopt 直写值。
  - **C-12b-4**（簿记·MK_PIN）：`f7-wb-lib.MK_PIN` 仍钉 B-11 → `mkCounts().ok=false`；本窗按 B-12 实数自校（`mkOk=true`），封批时更新为 84/186/80+10＋jar 四值（1,018,656／82DABA…／780E91…）。

## 附 §4 收口五项（字面）

- **cfg 起收同**：48,123 B｜SHA256 `55D4049028271A5782DF9D153F25C7F850E28F79F0475EA9B3BC52402D922BB6`（`needs/production/farm/mob/damage=true`；`codeKeys=245/fileKeys=247`）。
- **两旗还原**：b1 `needs=true` → b2 `needs=false` → 收口写回开窗字节（`needs=true`）；`productionR196` 全程 true。
- **jar/MK 起收同**：1,018,656 B／`82DABAA…`／`780E917…` 三值同；MK 84/186（dual 372）＋80+10 同。
- **crash/port/残留 JVM**：crash **21→21**；端口 **0→0**；本窗 0 残留 JVM；boot 重试 **0** 次。
- **判窗世界**：`w-b12v2` 已删（`worldsLeft=[]`）；obf 配置 30,524 B `262BFF5E…` 未动。

> 附节四值（全档含本节）：`35,938 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 274（split 275）｜✓ 43 / ✗ 23`
> 附节三口径（全档）：甲＝乙 `E33CBE0BFC3F47F5B9921C88F10AED34B4220F94E4C5ED97C7AD481BAC37B1E5`｜丙 `5B4EB72386922690000FF62FB45FF4A636BA1E95A8116CB7625B34EB4B85F8AF`
