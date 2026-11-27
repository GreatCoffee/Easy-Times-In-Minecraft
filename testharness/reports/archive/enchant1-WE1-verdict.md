# enchant1 批（路丙一期 5 条）· W-E1 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（CST）｜**窗口形态**：**单 boot**（1 boot／0 rebuild／0 客户端；dev server + 控制台 stdin + mineflayer 假人）
> **报告字节规格**：`19,215 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 22 / ✗ 2｜156 行`
> **判决源**：audit20 **条 241**（batch 成立）／**242**（摸底 faces=12）／**243/244/245**（D 位四问）／**246**（终审放行 T-1…T-7）／**247**（落码 `5191ee6`）
> **落码 commit**：**`5191ee6`**（父 `c2ee05f`）｜窗内零提交、零产品码；树起 **零未跟踪** → 收两件（本窗驱动＋本回执）
> **判决**：**PASS** —— **faces=8｜checked=8｜pass=8｜fail=0**；**A 0／B 2／C 5**
> **一句话**：5 条进池（reg 38＝33＋5）＋案 M 窗口逐字复算全等（diff10 族 `L5=41/999`／diff20 族 `L5=91/999`）、载体门六臂正反向成立；speed 1.25／0.75 双因子、regen 3.5、poison 4 tick（interval 100、amp 0、dmg 1.0）、true_flight 四臂 wander 与 R196 曲线逐值相等、quickness 分母 20/18/10 与 1.12 多项式逐样本全等；三箭族（vanilla／etim metal／tipped）读数 **0 差**。两处 B：T4 词面的 `poison apply` 行现体不存在（以 tick 行替代判定）、T8 词面的「cfg 双端 byte-identical」在本 repo 结构上不可达。

## §0 判定总表（八点）

| 判点 | 判行（anchor，`-session-1.out` 行号） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **T1** 五条进池／载体门／案 M 窗口 | `:3509-3554`（feet-vanilla）／`:3555-3600`（feet-etim）／`:3601-3646`（chest）／`:3647-3692`（bow）／`:3693-3738`（反向 1）／`:3739-3779`（反向 2） | reg 38 行（33＋5）；feet→speed `table=true`；chest→regeneration `true`；bow→poison/true_flight/quickness `true`；反向（弓槽拿靴）三条 `false`；两族 window＝案 M 复算式 | 六臂 reg **均 38**；`speed id=14 w=2` `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999`（diff10）、`regeneration id=15 w=2` `L1=11/30…L5=91/999`（diff20）、`poison id=23 w=2`／`true_flight id=24 w=10`／`quickness id=25 w=5` 三条 window 均 `L5=41/999`；六臂 `windowOk` **30/30 全等**；门：feet-vanilla/etim speed=true、chest regen=true、bow 三条 true、靴在手三条 **false** | ✓（附 C-1） |
| **T2** speed 读数 | `:4076`／`:4086`／`:4094` | L5：`enchant=1.250`、有食 `walk=0.125`／断粮 `0.093750`；L0：`enchant=1.000` | `lvl=5 enchant=1.25 hunger=1.0 walk=0.125`；`lvl=5 enchant=1.25 hunger=0.75 walk=0.09375`；`lvl=0 enchant=1 hunger=1.0 walk=0.1` | ✓（附 C-2） |
| **T3** regeneration 回血因子 | `:7643`／`:8296`（L0）｜`:8520`／`:8667`（L5） | L5＝`regenFactor=3.500`、L0＝`1.000`；同臂复见 2–3 次且 nutrition 一致 | L0 两行 `regenFactor=1`（nutrition=20/20，health 8→10）；L5 两行 `regenFactor=3.5`（health 7→9）；四行 `hungerPool+=1.0` | ✓（附 C-2） |
| **T4** poison（case A 自订药水） | `:6368`·`:6422`·`:6508`·`:6560`（vanilla 箭）｜`:6711`·`:6764`·`:6819`·`:6877`（metal 箭） | `dur=400 amp=0` ⇒ 400 tick 窗内 **4 行**（16 行即落 vanilla 语义） | 两箭族各 **4 行**：`dmg=1.0 target=Cow`，health 94>93>92>91 与 91.52966>90.52966>89.52966>88.52966（逐行 −1.0）；4 行 ⇒ interval 100（amp 0）、duration∈[400,499]；**非 16 行** ⇒ 未落 vanilla 25-tick 语义 | ✓（附 B-1） |
| **T5** true_flight wander | `:4992`（exp0×L0）／`:5070`（exp0×L5）／`:5276`（exp0×L1）／`:5349`（exp40×L0）；metal 臂 `:5524`/`:5575`/`:5648`/`:5855`；tipped 臂 `:5919`/`:5982`/`:6156`/`:6196` | `5.0000`／`0.5556`／`1.1657`／`0.5556` | 12 臂逐值命中：`wander=5.0000 eff=0`／`0.5556 eff=40`（lvl=5）／`1.1657 eff=8`（lvl=1）／`0.5556 eff=40`（exp=40 lvl=0） | ✓ |
| **T6** quickness 拉弓分母 | `:4152`（L5 charge=10）／`:4655`（L1 charge=18）／`:4704`（L0 charge=1）；全 18 行见 §6 | L5 `charge=10 divisor=10 velocity=1.000`；L1 `charge=18 divisor=18 velocity=1.000`；L0 `divisor=20`、`charge/20≤0.05` 起点行 | 18/18：divisor **10/18/20**、velocity 逐样本＝1.12 多项式 `(f²+2f)/3` 且 `>1→1`；三锚行 `0.2300`(3/10)／`1.0000`(10/10)／`1.0000`(18/18)／`0.4167`(10/20) | ✓ |
| **T7** 共享钩正证臂（三箭族） | `:4992…:6196`（shot 12 行）＋ `:6368…:6877`（tick 8 行） | 金属／普通／药水箭载体侧读数 0 差 | wander 四臂三族**逐臂同值**（`5/0`、`0.5556/40`、`1.1657/8`、`0.5556/40`，`distinct` 各 1）；poison 两族 tick 数 4=4、dmg/health 序列同型 | ✓（附 C-3） |
| **T8** cfg 17 键首启 | `run/config/etim.cfg` 文件面（`-cfg.afterboot` 快照） | 17 键出现、size 增、起收 identical | 17 键**全出现**且值与默认一致（difficulty 10/20/10/10/10、maxLevel 5×5、系数 0.05/0.5、reduction 10、bonus 40、duration 160/240、icon 0）；size **32,095 → 35,413**（+3,318）；收窗回填 `32,095/E07CAC1E…`（identical、sameAsStart） | ✓（附 B-2） |

## §1 T1 · 五条进池与案 M 窗口（复算逐字）

- **注册面**：六臂 `reg` 行 **均 38**（原 33：含 `etim:tree_felling#11`／`etim:endurance#12`／`etim:piercing#13`，逐件不变；＋5 新）。运行时数字 id＝**speed 14／regeneration 15／poison 23／true_flight 24／quickness 25**（`[EtimInit] enchantetim:speed ids=14 15 23 24 25`，`:2266` 段）；R196 源 id 85/86/90/89/88 不入 1.12 NBT（注册序决定），窗口内以 boot 日志 id 装填，**非** C 级。
- **案 M 窗口复算**（`ETIMMiteEnchantment`:36-50：`min(L)=max(diff−10,0)+diff×(L−1)+1`、`max(L)=min(L+1)−1`、末级 999）：
  - diff10（speed／poison／true_flight／quickness）＝ `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999`
  - diff20（regeneration）＝ `L1=11/30 L2=31/50 L3=51/70 L4=71/90 L5=91/999`
  - 六臂×五条 = **30 个 window 逐字相等**（`windowOk` 30/30）。
- **载体门（六臂）**：`feet-vanilla`（iron_boots）speed `true`；`feet-etim`（`etim:boots_copper`）speed `true`；`chest`（iron_chestplate）regeneration `true`；`mainhand-bow` poison/true_flight/quickness **三条全 true**；反向臂（mainhand 拿 iron_boots）三条 **全 false**。
- **pool size 面**（信息位，单点窗沿 W63 终审不判）：六臂 budget→size 见 `-judgment.log` T1 段（如 bow 臂 4→4／9→5／30→8）。

## §2 T2 · speed 双因子读数

`/etest enchantprobe feet mods`（`CommandDevTest`:366-382，读 `getMaxEnchantmentLevel(SPEED, player)` ＋ `hungerMoveFactor` 门）：

| 臂 | 靴 | food | lvl | enchant | hunger | walk | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L5-food | iron_boots `{ench:[{id:14,lvl:5}]}` | 20/20 | 5 | **1.25** | 1.0 | **0.125** | ✓ |
| L5-starve | 同上 | 0/0 | 5 | **1.25** | **0.75** | **0.09375** | ✓ |
| L0-food | 无 | 20/20 | 0 | **1** | 1.0 | **0.1** | ✓ |

R196 链（`PlayerCapabilities`:55-60 三因子同返点相乘）＝ `0.1 × (1+0.05L) × hungerFactor`：L5 有食 0.125／断粮 0.09375、L0 0.1，逐值命中。

## §3 T3 · regeneration 回血因子（第四因子）

- 臂设置：`/etest level 40`（cap=20）→ chest 件装 `{ench:[{id:15,lvl:5}]}`／plain → `etest health 6` ＋ `etest food 20 20`，每 4s 复喂复压血（level 变更触发的 cap 补血会把 health 顶满 ⇒ `shouldHeal()` 假 ⇒ `healProgress` 归零；首轮无此复压 → 零行，见 §11 工装自报）。
- 结果：L0 两行 `health=8.0/10.0 nutrition=20 regenFactor=1 hungerPool+=1.0`；L5 两行 `health=7.0/9.0 nutrition=20 regenFactor=3.5`。因子式 `1+0.5L`（`ETIMFoodStats`:393-400 第四因子位）逐值成立；L5 两次间隔 8s／18s 明显快于 L0 的 62s／62s（因子真实生效，非文本回显）。

## §4 T4 · poison（case A 自订药水 · 共享钩）

- 载体：`bow {ench:[{id:23,lvl:5},{id:24,lvl:5}]}`（true_flight 5 只为压 spread：wander 0.5556 ⇒ 命中稳定）；靶＝`minecraft:cow`（**本 mod 无 iron_golem**：`summon minecraft:iron_golem` ⇒ `Entity type 'minecraft:iron_golem' is invalid`，改 spawnable living，任务书允许）`{NoAI:1b,Silent:1b,maxHealth 100,Health 100}`。
- 两箭族各 **1 次即命中**，其后 20s 窗内各 **恰 4 行** `poison tick dmg=1.0`：
  - `:6368-6560` vanilla 箭：`health=94.0→93.0→92.0→91.0`
  - `:6711-6877` `etim:arrow_rusted_iron`：`91.52966→90.52966→89.52966→88.52966`
- 判读：每行 −1.0（**无 health>1.0 门**，MITE 面）；4 行间距 100 tick ⇒ `interval = 100 >> 0 = 100`（amp 0）；4 行 ⇒ duration∈[400,499]，与 `160+round(240×5/5)=400` 相容；**16 行（25-tick 间隔）未出现** ⇒ vanilla 语义未落。
- **B-1**：词面点名 `[ArrowLog] poison apply`（直读 `dur=400 amp=0`），产品侧 `ETIMPotionPoison.applyFromLauncher` 只落 `poison tick` 行，无 apply 行 ⇒ 实测以 tick 行反推 dur/amp（4 行＋100 tick 间距唯一区分 amp/interval），dur 精确值由 cfg 公式＋行数反推，非直读。

## §5 T5 · true_flight wander 四臂（12 样本）

R196 曲线（`MixinEntityArrow`:78-86）：`eff ≥ 0 ⇒ wander = 0.5 + 4.5/(0.8+(eff+1)/5)²`；`eff = expLevel + round(40×L/5)`（α2：技能门不落）。

| 臂 | exp | bow L | eff | 预期 wander | 实测（三箭族各 1 次） |
| --- | --- | --- | --- | --- | --- |
| A | 0 | 0 | 0 | 5.0000 | **5.0000** ×3 |
| B | 0 | 5 | 40 | 0.5556 | **0.5556** ×3 |
| C | 0 | 1 | 8 | 1.1657 | **1.1657** ×3 |
| D | 40 | 0 | 40 | 0.5556 | **0.5556** ×3 |

12/12 命中（`match` 全 true），`exp=` 字段自报与服务端 `experienceLevel` 一致（`/etest level 0|40` 生效）。

## §6 T6 · quickness 分母（18 样本 · 多项式逐样本全等）

`d(L) = 20 − round(10×L/5)`；`velocity = clamp(((c/d)²+2(c/d))/3, ≤1)`。

| lvl | divisor | 样本（hold ms → charge / velocity） |
| --- | --- | --- |
| 5 | **10** | 50→1/0.0700、150→3/0.2300、300→6/0.5200、**500→10/1.0000**、650→13/1.0000、900→18/1.0000 |
| 1 | **18** | 50→1/0.0381、150→3/0.1204、300→6/0.2593、500→10/0.4733、650→13/0.6553、**900→18/1.0000** |
| 0 | **20** | **50→1/0.0342**（1/20=0.05 起点）、150→3/0.1075、300→6/0.2300、500→10/0.4167、650→13/0.5742、900→18/0.8700 |

18/18 `match=true`（divisor 与公式双门）；L5 满拉 `f==1.0F` 精确（爆击门不破）；客户端面按 B-3 保持 vanilla（`etim$releaseRemote` 门，见 §9 字节码）。

## §7 T7 · 共享钩（三箭族 0 差）

`wanderDelta0=true`：四臂 × 三族 `distinct` 各只有 1 个值（`5/0`、`0.5556/40`、`1.1657/8`、`0.5556/40`）。
`poisonDelta0=true`：vanilla 与 etim metal 两族 tick 数 4=4、`dmg=1.0` 与 health 序列同型（metal 箭的实体伤害为小数，不影响药水面）。
⇒ 钩子落在 `EntityArrow` 基类（`MixinEntityArrow`），金属箭（`ETIMEntityArrow extends EntityArrow`）、vanilla 箭、药水箭同路径。

## §8 字节码亲锤（transform 后类 · `run/.mixin.out` 本窗导出）

| 类 | bytes | sha256（前 16） | 亲锤结论 |
| --- | --- | --- | --- |
| `EntityArrow` | 22,479 | `BB32422FCF9A9008` | `shoot` 偏移 3 调 `localvar$zcn000$etim$trueFlightWander`；该体含 `ETIMArrowAccuracyEvent`＋`trueFlightBonusLevels/MaxLevel`＋`Math.pow`＋`isInWater/isInLava`＋`ETIMArrowLog.row`；`arrowHit` 调 `handler$…$bowPoisonApply`，其体调 `ETIMPotionPoison.applyFromLauncher` |
| `ItemBow` | 11,111 | `5E8DF9DB3E547039` | `onPlayerStoppedUsing` 偏移 7 调 `stashReleaseBow`、偏移 144 调 `redirect$…$quicknessVelocity`；redirect 体保留 `getArrowVelocity(I)F`（remote/lvl0 面）并读 `quicknessTicksReduction`＋`quicknessMaxLevel`、落 `release` 行 |
| `EntityPlayer` | 74,425 | `8C0B73AE91578FE8` | `redirect$zzf000$etim$hungerWalkSpeed` 在位，体读 `ETIMConfig.speedPerLevel`＋`EnchantmentHelper.getMaxEnchantmentLevel`＋`hungerMoveFactor` |

## §9 冲突分级（A 0／B 2／C 5）

### B 级（判据词面，阻塞封批口径，不阻塞修复）

- **B-1（T4 词面的 apply 行现体不存在）**：条 247 判点写 `[ArrowLog] poison apply`（dur=400 amp=0）；现体 `ETIMPotionPoison.applyFromLauncher` 只落 `poison tick`（`dmg/target/health`），无 apply 行。本窗以 tick 行判：4 行＋100 tick 间距 ⇒ amp=0／interval=100；duration 由行数限定在 [400,499] 且与公式 400 相容，**非直读**。**处置**：封批记录把 T4 判据改写为「tick 行 4×（dmg=1.0，间隔 100）」；若须直读 dur/amp，须落一行 dev 日志（改产品码 ⇒ 另起修复批）。
- **B-2（T8 词面「cfg 双端 byte-identical」不可达）**：`run/config/etim.cfg`（166 键）与 `run/obfuscated/config/etim.cfg`（172 键）**本非同源**——obf 侧多 6 个已删键（`shieldWearRate`／`playerCapDebugLog`／`playerHealOnLevelUp`／`exhaustionPerHealedHp`／`regenBasePerTick`／`regenPerFoodPerTick`）＋8 个调试开关值不同；且 obf 侧只在客户端首启时重写，**零客户端窗口内必不动**（实测 30,524 `262BFF5E…` 起收同值）。本窗实判：server 侧 17 键全落、size 32,095→35,413、收窗回填 identical；「两文件 byte-identical」判**不成立/不可判**，建议改写为「server 侧 17 键落位 ＋ 收窗回填钉值」。

### C 级（登记不阻塞）

- **C-1（T1 镜像臂不可置）**：`replaceitem entity … slot.armor.feet minecraft:bow 1 0` 被 1.12 拒绝（`:3736` `Could not replace slot slot.armor.feet with 1 * [Bow]`），靴槽未被弓占据 ⇒ 「靴槽拿弓 ⇒ speed table=false」这个镜像臂未判；正向反向臂（弓槽拿靴 ⇒ 三条 bow 附魔全 false）成立，载体门可由 `canApplyAtEnchantingTable` 的 item 型判定单侧闭合。
- **C-2（词面小数位）**：`hunger=1.0`（词面 `1`）／`walk=0.09375`（词面 `0.093750`）／`regenFactor=3.5`（词面 `3.500`）／`enchant=1`（词面 `1.000`）——raw float 与 BigDecimal 去尾零格式不同，数值同。
- **C-3（T4 药水箭族未跑）**：T5 三族全跑；T4 只跑 vanilla＋metal 两族（`minecraft:tipped_arrow` 自带外源药水语义，会与 case-A 自订毒药水观测面混叠）。共享钩正证由 T5 三族＋T4 两族共同成立。
- **C-4（窗口内符号探针假阴性）**：`staticChecks.bytecode`（窗口内自动探针）按 `etim$trueFlightWander` 直名搜，Mixin 实际生成 `localvar$zcn000$etim$trueFlightWander`（@ModifyVariable 内联命名）⇒ `entityArrowShootFace`／`entityArrowShootWanderInline` 假 false。已以 `staticChecks.bytecodePost`（窗口后 javap 亲锤，§8）为准；探针未改（零产品码）。
- **C-5（工装：高台 tp 与场地基准）**：首两轮以固定 y=99/100 建台，假人在 `/tp` 后触发 `moved too quickly` 并摔死（`DeathLog`×3）⇒ 判点错位。收窗版改为**出生点基准**（`bx,by,bz=-70,68,249`）建台＋`bot.physics.enabled=false`（位置交服务端权威）；此为本窗工装口径，非产品面。

## §10 钉值／MK（起收）

| 面 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `5191ee6`（`5191ee6e6bf215fd4472458a3d0ce47360bc1965`） | 同（窗内零提交） | ✓ |
| release jar | 837,336 B `FF668235…CC0731` | 同 | ✓ |
| dev jar | 820,528 B `27C5B165…A95822` | 同 | ✓ |
| sources jar | 766,628 B `E5676AEA…CC6C6A2` | 同 | ✓ |
| refmap 双树 | 64 类键／143 条目（`=286 面`双端计法；`build/resources/main` ↔ `build/tmp` 同值）；新增切片 `MixinEntityArrow` 2／`MixinItemBow` 2；容器 3 | 同 | ✓ |
| mixins 清单 | 58／client 10（＋2 新 mixin） | 同 | ✓ |
| cfg（dev） | 32,095 `E07CAC1E…AE7F5`；门控开闸后 32,094 `D6E8388F…23849`（`arrowDebugLog` false→true）；首启后 **35,413** `3BB5D55C…0D75F` | 回填 **32,095 `E07CAC1E…AE7F5`**（identical、sameAsStart） | ✓ |
| cfg（obf） | 30,524 `262BFF5E…C9AD` | 同（零客户端未重写） | ✓（B-2） |
| server.properties | 890 `3009633863…654A48` | 同（回填 identical） | ✓ |

## §11 收口表

| 面 | 状态 |
| --- | --- |
| boot 计数 | **1**（`Done (5.252s)` @ 22:28:26，idx 2273；`BUILD SUCCESSFUL`；`:compileJava`／`:classes`／`:jar` 全 UP-TO-DATE） |
| 客户端 | **零会话**（未拉起、未截屏、未抢焦点；CT-9） |
| rebuild | **0**（无 `gradle build`；jar 三件起收同值） |
| 产品码 | **0** 行（窗内零提交；驱动/证据/日志全落 `testharness/**`） |
| 场地 | 出生点基准石台 10×7＋4 格空腔；假人 `physics.enabled=false`，`/tp` 服务端权威（首轮高台方案已弃，见 C-5） |
| 进程/端口 | 端口 25565 收 **0**；crash-reports 19＝19（零新增）；`stop` exitCode 0 |
| 门控 | `arrowDebugLog` false→true、`foodDebugLog` 起收 true（收窗随 cfg 回填） |
| 判据档 | `build-logs/enchant1-we1-evidence.json`（32,208 B）／`-session-1.out`（8,728 行／1,287,659 B）／`-judgment.log`（134 行）／`-driver.log`（16,642 B）／`-cfg.before`／`-cfg.afterboot`／`-cfgClient.before`／`-props.before` |

## §12 未覆盖面（不补白）

1. **权重分布／sampling**：单点窗不判（W63 终审裁定沿用）；本窗零采样。
2. **pool size 分布面**：只作信息位记录（budget 由 `player.getRNG()` 逐窗抽）。
3. **`minecraft:tipped_arrow` 的 T4 臂**：见 C-3（外源药水语义避让）。
4. **客户端渲染面**（quickness 半拉弓显示、毒药 HUD 图标 `poisonPotionIconIndex`）：纯客户端感知面，按纪律转用户操作/另窗。
5. **T8 的 obf 侧 cfg**：零客户端窗内不可判（B-2）。

## §13 自报（机械核讫）

> 文件：`testharness/reports/enchant1-WE1-verdict.md`｜字节五项：size 19,215 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 155（split 行数 156）
> 三口径（家族同型：enchantpool-W63b／metgear-W62b／unbreak-W50）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序换行连接后再 SHA-256）。
> SHA-256 甲（全档零位）`C849FD9CF29708996A0143F11137E85528ECEE9268EDD72D1569D696EA561411`
> SHA-256 乙（LF 归零零位）`C849FD9CF29708996A0143F11137E85528ECEE9268EDD72D1569D696EA561411`
> SHA-256 丙（行链零位）`ADCF05548D347FDF599D3723EF83BC187DDC91F9D380B49E43AC0CF5092E110C`
> 判格 8＝✓ 8／✗ 0｜锚：T1 `:3509-3779`（六臂）／T2 `:4076`·`:4086`·`:4094`／T3 `:7643`·`:8296`·`:8520`·`:8667`／T4 `:6368-6560`·`:6711-6877`／T5 `:4992…:6196`（12 行）／T6 18 行（`:4152`·`:4655`·`:4704` 三锚）／T7 见 §7｜钉值：1 boot／0 rebuild／0 客户端／0 产品码／cfg 收窗回填钉值｜冲突 A0 B2 C5。
