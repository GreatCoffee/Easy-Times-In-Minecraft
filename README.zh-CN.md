# ETIM — Easy Times In Minecraft（轻松时光）

[English](README.md) | [中文](README.zh-CN.md) —— 中英两版内容同步维护。

一个 Minecraft **1.12.2 Forge** 模组，从零重现 **MITE（Minecraft Is Too Easy，
太特么难了）** 的核心玩法机制。ETIM 是从零开始的致敬之作——**不是代码移植**——
基于现代工具链构建。

> [!WARNING]
> **本项目完全由 AI 实现——风险自担。**
> 本项目全部代码由 AI 模型 **GLM-5.3-Flash**（Z.ai）端到端编写。仓库持有人本人
> 不懂代码，也**没有任何有资质的人对本项目进行过安全性、正确性或可靠性的审核**。
> 本项目仅作存档与研究用途。**不建议在任何情况下使用**：它可能导致游戏崩溃、
> 存档与世界损坏、包含未知的安全或行为隐患。若坚持使用，请先备份一切你珍视的
> 数据——即便如此，仍然不建议。

- **Mod ID：** `etim`
- **全称：** Easy Times In Minecraft（轻松时光）
- **代码根包：** `io.github.etim`

## 工具链

基于 [CleanroomMC ForgeDevEnv](https://github.com/CleanroomMC/ForgeDevEnv) 模板（MIT）：

| 组件 | 版本 |
|---|---|
| Java（Gradle 运行时） | 25（Temurin） |
| Gradle | 9.7.0 |
| RetroFuturaGradle | 2.0.3 |
| Forge | 14.23.5.2847 |
| MCP 映射 | stable 39 |
| MixinBooter | 11.13 |

模组编译目标为 **Java 8**（工具链自动配置 Azul JDK 8）。
Mixin 已启用（`use_mixins = true`）——见 `src/main/resources/mixins.etim.json`
与 `io.github.etim.etim.mixins` 包根。Coremod 支持通过 `gradle.properties`
中的 `is_coremod` / `coremod_plugin_class_name` 开启。

## 快速开始

### 命令行

```powershell
# Gradle 必须跑在 Java 25 上
$env:JAVA_HOME = "C:\Users\GreatCoffee\tools\jdk-25.0.4.1+1"
.\gradlew.bat --version
.\gradlew.bat build        # 编译模组（首次运行会反编译 Minecraft，请耐心等待）
.\gradlew.bat runClient    # 启动开发版 Minecraft 客户端
.\gradlew.bat runServer    # 启动开发版专用服务端
```

### IntelliJ IDEA

1. 用 IDEA 打开项目文件夹。
2. 同步前将 `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JVM`
   设为 **Java 25**。
3. 按提示加载 Gradle 项目；然后使用提供的运行配置（`1. Run Client`、`2. Run Server` 等）。
4. 推荐插件：[MinecraftDev fork for RetroFuturaGradle](https://github.com/eigenraven/MinecraftDev/releases)。

## 项目结构

| 路径 | 用途 |
|---|---|
| `gradle.properties` | 全部模组/构建参数（id、版本、mixin/coremod 开关） |
| `tags.properties` | 注入生成的 `Tags` 类的构建期令牌 |
| `gradle/scripts/dependencies.gradle` | 运行时/编译依赖（如 `rfg.deobf(...)`） |
| `gradle/scripts/publishing.gradle` | CurseForge / Modrinth / Maven 发布 |
| `src/main/resources/mixins.etim.json` | Mixin 配置（refmap + 包根） |
| `testharness/` | 仅开发的自动化测试驱动（假玩家）；**不**进发布 jar |

## 已落地机制

ETIM 按系统逐块重现 MITE 机制。每个数值都以 R196（MITE 1.6.4）一手字节码判决
（javap 双源审计）为据，每个切片都经基于日志的自动化测试验证（假玩家 harness
读取服务端 `[AILog]` 判定通道——客户端 HUD 一律不作依据）。

已实现并验证（截至 2026-10）：

| 系统 | 覆盖内容 |
|---|---|
| 玩家状态 | 初始属性、经验/等级、逐级挖掘与近战加成、属性上限、床铺回血 |
| 睡眠与床铺入口 | 睡夜 fast-forward（R196 `runSleepTicks` 逐拍批量 + `dayTime`/`totalTime` 绝对对齐）、血月禁跳、床铺入口门控（遮蔽 / 头顶净空 / 中毒 / 可寻路敌怪 / 躺卧面逐拍哨门）、营养为 0 禁睡 |
| 饥饿与进食 | MITE 食物模型、饥饿惩罚、营养驱动的回血、进食用时、身体湿润度 |
| 挖掘与工具 | 采集门控、挖掘速度、工具耐久、整树砍伐（含附魔）、误采风险（undermine）、触及距离 |
| 合成 | 难度分级与合成耗时进度 |
| 熔炉 | 热量模型、燃料槽改造、熔炼经验回报 |
| 物品品质 | 品质掷取与提示 |
| 死亡 | 死亡事件与经验回报规则 |
| 生物 | R196 消散链（闲置计数、动物/豹猫门、挽留与豁免）、生物属性表、家畜需求 v1（食/水/雨）、蜘蛛物种 tint |
| 金属与装备 | 五金属工具/护甲矩阵（50 工具、40 护甲、5 链条件）、逐金属品质掷取、熔炉储块配方、铁砧修理（珠耗材 + 同物合并）、矿石方块、箱战利品（锈铁损耗面）、怪物随身装备（僵尸/骷髅随机装备链） |
| 下界 underworld（已落码 2026-10-25，验证窗待过） | 维度 id -2（底部 y +120 偏移）、专属群系（id 40）、地狱噪声地形 + 全高基岩层带与蛛网、不可破坏的 `mantle_or_core` 地面方块、菌丝 post 场、Longdead/守护者/远古骨霸三实体与兵团召唤、蜘蛛骑士换骑、`/etim dim enter\|leave\|probe` 入口、下界时间门 |
| 开发/测试工具 | 配置门控的 `[AILog]` 判定通道、开发覆盖层、mineflayer 测试 harness |

自动化判定驱动在 `testharness/`（假玩家、服务端脚本、报告输出）；该目录仅开发用，
不进发布 jar。

## 配置速查

全部玩家可感知的调值都收在一个 Forge 配置文件里（`config/etim.cfg`，首次运行生成）。
生成文件里的注释按游戏语言书写；下面的分组就是配置文件自身的 category 名。每一行都
转写自 `ETIMConfig.java` 的字段注释——那是唯一权威源。非法组合会中止模组加载，不回落
默认值。

### `playerCaps` / `leveling`

- `capAtLevel0`（int，`6`）—— 0 级时的生命/饥饿上限（点数；2 点 = 1 个图标）。
- `capGrowthPerFiveLevels`（int，`2`）—— 每满 5 级增加的上限（点数）。
- `capMaximum`（int，`20`）—— 等级表能到的上限天花板。
- `levelCap`（int，`200`）—— 玩家等级硬上限。
- `miningSpeedPerLevel`（float，`0.02`）—— 每级挖掘速度加成（比例值）。
- `meleeDamagePerLevel`（float，`0.005`）—— 每级近战伤害加成（比例值）。

### `regen`

- `bedRegenFactor`（float，`4.0`）—— 躺在床上的回血倍率（任意时段）。
- `allowDayBedRegen`（bool，`true`）—— 允许白天躺床只为吃这份回血加成（MITE 行为）。

### `sleep`

- `bloodMoonSleepBlock`（bool，`true`）—— 血月（全日相位）禁止睡跳；`false` 则血月按原版照样跳。
- `sleepFastForward`（bool，`true`）—— 睡夜按 R196 `runSleepTicks` 逐拍批量模拟，并把 `dayTime` 绝对对齐到 `totalTime`（双钟 desync 根治）；`false` = 原版瞬时跳表钟并弹床。
- `bedRefuseShelter`（bool，`true`）—— 床必须有遮蔽（R196 `isOutdoors` 面对露天床拒绝入睡）；`false` = 原版。
- `bedRefuseObstructed`（bool，`true`）—— 床头上方必须可通行；`false` = 原版（无头顶检查）。
- `bedRefusePoison`（bool，`true`）—— 中毒状态玩家不能上床；`false` = 原版。
- `bedHostilePathable`（bool，`true`）—— `NOT_SAFE` 要求床边有能真正寻路过来的敌怪（也覆盖非 `EntityMob` 的 `IMob`）；`false` = 原版无过滤 `EntityMob` AABB。
- `bedSentryWake`（bool，`true`）—— 躺卧面逐拍哨门：能寻路到床边的敌怪会把睡着者踢醒；`false` = 原版（无敌怪哨门）。

### `food`

- `foodModel`（bool，`true`）—— R196 饱食/营养双池模型总开关；`false` = 原版饥饿条。
- `hungerGainPerTick`（float，`0.002`）—— 每 tick 饥饿池积攒量（再乘湿冷系数）。
- `hungerPerFoodUnit`（float，`4.0`）—— 每消耗 1 点食物所扣的饥饿池单位。
- `hungerNutritionOnlyFactor`（float，`0.25`）—— 营养独占积分器的积攒系数；积满后下一个被吃的点取自营养池。
- `hungerPoolCap`（float，`40.0`）—— 饥饿池上限。
- `starveGainPerTick`（float，`0.002`）—— 营养为 0 时每 tick 的饿伤进度积攒。
- `starveHealthCeiling`（float，`10.0`）—— 生命高于该值时饿伤不生效。
- `healBasePerTick`（float，`0.0004`）—— 每 tick 回血进度基数（满 1.0 = 1 点生命）。
- `healPerNutritionPerTick`（float，`0.00002`）—— 每 tick 每点营养的额外回血进度。
- `inBedHitListHunger`（float，`0.04`）—— 躺床期间每次受击计入的饥饿池量。
- `hungerSleepDeny`（bool，`true`）—— 营养为 0 禁睡：拒绝躺下，并把睡着者提示踢醒。
- `foodTestMode`（bool，`false`）—— 测试压缩：饥饿积攒与饿伤进度 ×5。
- `foodDebugLog`（bool，`false`）—— 服务端日志 `[FoodLog]` 行（开发通道）。
- `ingestUseDurationTicks`（int，`32`）—— 全部 R196 可食物件的食用时长。
- `ingestDebugLog`（bool，`false`）—— 服务端日志 `[IngestLog]` 行（开发通道）。
- `malnourishedHungerFactor`（float，`0.5`）—— 营养不良时的饥饿速率系数。
- `wetnessRainLight`（float，`0.25`）—— 站在小雨里的湿冷系数。
- `wetnessRainThunder`（float，`0.5`）—— 站在雷暴雨里的湿冷系数。
- `wetnessImmerseAbove`（float，`0.5`）—— 头部所在方块是水时的湿冷系数。
- `wetnessImmerseBelow`（float，`0.25`）—— 脚部所在方块是水时的湿冷系数。
- `wetnessCombo`（float，`0.125`）—— 小雨 + 仅脚部浸水的组合附加湿冷。
- `wetnessFreezingMultiplier`（float，`2.0`）—— 群系判寒冷时的倍率。
- `wetnessFreezingTemperature`（float，`0.15`）—— 群系温度低于该值时套用寒冷倍率。
- `wetnessHotExemptTemperature`（float，`1.0`）—— 群系温度高于该值时湿冷全免。
- `hungerCraftDeny`（bool，`true`）—— 饥饿时无法取出合成产物。
- `hungerPlaceDeny`（bool，`true`）—— 饥饿时不能放置硬度 > 0 的方块（硬度为 0 仍可放置）。
- `hungerMoveFactor`（float，`0.75`）—— 饥饿时的走路/空中移动倍率。
- `hungerSprintDeny`（bool，`true`）—— 冲刺的启动/维持需要身上还有食物能量。
- `hungerWeakStrike`（bool，`true`）—— 饥饿时空手近战变为零伤害的弱击。
- `weakStrikeKnockbackFactor`（float，`0.6`）—— 弱击击退强度占正常击退的比例。
- `weakStrikeHealthThreshold`（float，`2.0`）—— 生命低于该值时即使吃饱也弱击。
- `hungerDigStrDivisor`（float，`5.0`）—— 饥饿时的挖掘强度除数。
- `hungerDenialFeedback`（bool，`true`）—— 饥饿门拒绝动作时发送动作栏反馈（开发/测试通道）。

### `nutrition`

- `nutritionPoolMax`（int，`160000`）—— 池满时的容量（以 tick 计，20 点营养）。
- `nutritionTicksPerPoint`（int，`8000`）—— 每点食物营养为池带来的 tick 增益。
- `sugarToInsulin`（float，`4.8`）—— 糖含量 → 胰岛素响应的换算。
- `insulinCap`（int，`192000`）—— 胰岛素抵抗上限。
- `insulinThresholdMild`（int，`48000`）—— 轻度阈值。
- `insulinThresholdModerate`（int，`96000`）—— 中度阈值；中度及以上不能再吃含糖食物。
- `insulinThresholdSevere`（int，`144000`）—— 重度阈值。
- `malnourishedRegenFactor`（float，`0.25`）—— 营养不良时的回血速率系数。

### `reach`

- `blockReachBase`（float，`2.75`）—— 空手选中/破坏方块的触及距离。
- `meleeReachBase`（float，`1.5`）—— 空手近战攻击触及距离；持武器加其加成。
- `interactionReachBase`（float，`2.5`）—— 实体交互（右键）触及距离。
- `creativeReach`（float，`5.0`）—— 创造模式下的加长触及距离。
- `reachBonusTool`（float，`0.75`）—— 剑/镐/斧/铲的触及加成。
- `reachBonusSmall`（float，`0.5`）—— 木棍/骨头与剪刀的触及加成。
- `reachServerTolerance`（float，`0.25`）—— 服务端校验留给延迟与取整差异的宽松余量。
- `entityHitboxExpansion`（float，`0.1`）—— 触及射线判定用的实体命中盒外扩量。
- `reachDenialFeedback`（bool，`true`）—— 服务端拒绝触及不足的动作时发聊天反馈。
- `debugRayLength`（float，`8.0`）—— 调试覆盖显示射线的长度（永不进入游戏判定）。

### `mining`

- `miningReform`（bool，`true`）—— 任务 2.2 挖掘改革总开关（进度公式 + 掉落门控）。
- `treeFellingMaxLevel`（int，`10`）—— 树木连根附魔的最高等级。

### `crafting`

- `craftingTimer`（bool，`true`）—— R196 合成计时总开关（配方需要难度 tick 数）；`false` = 原版瞬时合成。
- `craftingSkipCreative`（bool，`true`）—— 创造模式玩家保留原版瞬时合成。
- `craftingSpeedPerLevel`（float，`0.02`）—— 每级合成速度加成。
- `craftingBenchModifier`（float，`0.2`）—— 合成台台面提速系数（2x2 随身网格视作无台面）。
- `craftingPeriodFloor`（int，`25`）—— 合成周期下限（tick）。
- `craftingCurveExponent`（float，`0.8`）—— 难度 >100 时周期曲线的指数。
- `craftingGenericDifficulty`（float，`25.0`）—— 未列名普通配料的难度。
- `craftingDamagePenaltyPerDamagePoint`（int，`50`）—— 每受 1 点整伤害损失的合成进度（tick）（必须是 10 的倍数）。
- `craftingCompleteFeedback`（bool，`true`）—— 合成完成时的聊天行（开发通道）。
- `craftingStartFeedback`（bool，`true`）—— 合成开始时的聊天行，附带预计耗时。
- `craftingProgressArrow`（bool，`true`）—— 用白色进度填充合成箭头（MITE GUI 观感）。
- `craftingDebugLog`（bool，`false`）—— 服务端日志 `[CraftingLog]` 行（开发通道）。
- `qualitySystem`（bool，`true`）—— R196 品质阶梯总开关；右击产物槽循环档位（高档消耗经验并延长周期）。
- `craftingQualityFeedback`（bool，`true`）—— 右击循环档位变化时的聊天行。
- `qualityDefaultMax`（int，`5`）—— 无映射材质物品的最高品质档（0..7）。
- `qualityMaxOverrides`（string，`""`）—— 逐物品最高品质覆盖，格式 `registryName=0..7` 的 CSV，优先于材质映射。
- `craftingWebDeny`（bool，`true`）—— 玩家上身陷在蜘蛛网里时合成冻结。
- `craftingDamagedDeny`（bool，`true`）—— 合成格内有任何受损物品时合成冻结。
- `craftingFx`（bool，`false`）—— 完成特效：升级音效 + 巫师粒子（方案拍板前保持关闭）。

### `furnace`

- `furnaceHeatSystem`（bool，`true`）—— R196 热量阶梯总开关：燃料带热度档、配方要求最低热度；热度不足时拒绝冶炼。
- `furnaceVanillaMaxHeat`（int，`2`）—— 原版熔炉可承受的最高热度。
- `furnaceBurnTimeR196`（bool，`true`）—— R196 燃料燃烧时长替换与原版有差异的项。
- `furnaceXpRewards`（bool，`true`）—— 取产物时按 R196 逐物品经验表结算一次经验球，替换原版随机分配。
- `furnaceGuiHints`（bool，`true`）—— 不可熔/非燃料/过热的金字 GUI 提示。
- `furnaceInputRecipeGate`（bool，`true`）—— 输入槽只收有熔炼配方的物品（GUI 拖放与漏斗同门）；`false` = 原版输入槽全部放行。
- `furnaceDebugLog`（bool，`false`）—— 服务端日志 `[FurnaceLog]` 行（开发通道）。

### `death`

- `deathXpOrbs`（bool，`false`）—— 死亡时在死亡点掉落 total/3 的经验球（`keepInventory` 下不生效）；默认关闭 = 收敛至 R196 pool-only 语义，键保留供玩家自行放宽。
- `deathXpSettle`（bool，`true`）—— 死亡结算经验收支；`false` = 原版经验全保留。
- `deathDebugLog`（bool，`false`）—— 服务端日志 `[DeathLog]` 行（开发通道）。

### `metal`

- `metalSystem`（bool，`true`）—— 五金属系统总开关（装备/矿石/战利品/铁砧修理）；`false` = 原版原样。
- `metalOreGen`（bool，`true`）—— 四种矿石方块（铜/银/秘银/艾德曼）在主世界生成；远古金属无矿石——只出自箱战利品与怪物掉落。
- `metalAnvilRepair`（bool，`true`）—— ETIM 装备在原版铁砧上走 R196 砧修：珠耗材修理 + 同物合并（纯相加封顶），0 经验，铁砧等比损耗分 0.5/0.8/1.0 档；拒修 1 = 品质超预算，拒修 2 = 材质耐久须严格大于铁 8.0。
- `metalDebugLog`（bool，`true`）—— 矿石生成的服务端 `[OreLog]` 判行（开发通道）。
- `miningDebugLog`（bool，`true`）—— 服务端 `[MiningLog]` 判行：采集级拒绝（材质档位对方块）与有效挖掘强度。
- `equipDebugLog`（bool，`true`）—— 启动期向 `[EquipLog]` dump 全部 95 件装备数值（开发通道）。
- `mobEquipDebugLog`（bool，`false`）—— 怪物随身装备的 `[MobLog]` 判行（武器/护甲/品质面，开发通道）。

### `mobs`

- `mobDespawnR196`（bool，`true`）—— R196 消散链总开关（视线重置、怪类寻路挽留、动物墙、僵尸村民挽留、非天亮整点的 y 折倍、计数 ≥200 的击杀判定）；`false` = 原版 1.12 消散。
- `mobStatsR196`（bool，`true`）—— R196 逐类怪物属性表总开关；`false` = 原版 1.12 属性。
- `mobSpawnR196`（bool，`true`）—— R196 生成周期总开关（逐物种上限、敌怪双概率环、调制事件、准入细则）；`false` = 原版 1.12 生成。
- `livestockNeedsR196`（bool，`true`）—— R196 家畜需求管线 v1 总开关（食物/饮水/自由三需求；产出门控留后续）。
- `spawnCapMonster`（int，`50`）—— 敌怪上限（区块 ×/256 换算之前）。
- `spawnCapAnimal`（int，`10`）—— 动物上限（区块 ×/256 换算之前）。
- `spawnCapAmbient`（int，`5`）—— 环境生物上限（区块 ×/256 换算之前）。
- `spawnCapAquatic`（int，`5`）—— 水生生物上限（区块 ×/256 换算之前）。
- `moonStateOverride`（string，`""`）—— 强制生成周期的月亮状态（`""`、`blue`、`blood`、`full`、`new`）以保测试确定性；阶段六月亮切片会替换后端。
- `zombieDigAI`（bool，`true`）—— R196 僵尸刨墙 AI（墙不是掩体）；`false` = 原版。
- `mobDebugLog`（bool，`false`）—— 服务端日志 `[AILog]` 行（开发通道）。
- `underworldDebugLog`（bool，`false`）—— underworld 批的 `[DimLog]` 判行（维度注册、provider 面、进出含落点 y、列探针、群系注册、下界时间门）；同时放开下界 `[MobLog]` 行（兵团、箭面、守护者换手、属性）。关闭则静默。

### `compat` / `devtools`

- `compatCraftingTweaksFix`（bool，`true`）—— 装有 Crafting Tweaks 时自动停用其 `rightClickCraftsStack`，把产物槽右击归还给 R196 品质选择器。
- `devTools`（bool，`true`）—— 开发用 GRAVE 键调试 HUD 与 `/etest` 指令总开关；需重启生效。

## 兼容目标

ETIM 争取兼容：JEI、Just Enough Characters、Fence Jumper、Inventory Sorter、
OptiFine、SmoothFont、Journey Map、Mouse Tweaks、Rebind、RAD（Reload Audio
Drivers）、Step Up 和 The One Probe。

## 致谢

- Avernite — MITE（Minecraft Is Too Easy，1.6.4 原作 R196）
- [Modded MITE Community](https://github.com/MinecraftIsTooEasy) — MITE 后续社区与社区模组
- [CleanroomMC](https://github.com/CleanroomMC) — ForgeDevEnv 模板（MIT）
- [GTNewHorizons](https://github.com/GTNewHorizons/RetroFuturaGradle) — RetroFuturaGradle
- [FalsePattern](https://github.com/falsepattern) — MITF（MITE-IsTooFalse，R196 测试床；公开实现参考）

## 许可证

模板为 MIT 许可；项目许可证待定。
