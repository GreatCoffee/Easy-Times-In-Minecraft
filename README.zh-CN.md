# ETIM — Easy Times In Minecraft（轻松时光）

[English](README.md) | [中文](README.zh-CN.md) —— 中英两版内容同步维护。

一个 Minecraft **1.12.2 Forge** 模组，从零重现 **MITE（Minecraft Is Too Easy，
太特么难了）** 的核心玩法机制。ETIM 是从零开始的致敬之作——**不是代码移植**——
基于现代工具链构建。

> [!WARNING]
> **本项目完全由 AI 实现——风险自担。**
> 本项目全部代码由 AI 模型端到端编写。自项目立项至 2026-11-15 由
> **GLM-5.3-Flash**（Z.ai）完成；自 2026-11-16 起改由 **DeepSeek V4.1 Flash**
> 继续开发。仓库持有人本人
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
| Java（Gradle 运行时） | 25（Azul Zulu 25.0.5） |
| Gradle | 9.7.0 |
| RetroFuturaGradle | 2.0.3 |
| Forge | 14.23.5.2847 |
| MCP 映射 | stable 39 |
| MixinBooter | 11.13 |

Gradle 9.7.0 与 RetroFuturaGradle 2.0.3 自身要求 Java 25；CI
（`.github/workflows/deploy.yml`）使用同一发行版 Azul Zulu 25。

模组编译目标为 **Java 8**（工具链自动配置 Azul JDK 8）。
Mixin 已启用（`use_mixins = true`）——见 `src/main/resources/mixins.etim.json`
与 `io.github.etim.etim.mixins` 包根。Coremod 支持通过 `gradle.properties`
中的 `is_coremod` / `coremod_plugin_class_name` 开启。

## 快速开始

### 命令行

```powershell
# Gradle 必须跑在 Java 25 上。gradle.properties 用 org.gradle.java.home 钉住本地
# JDK 25 路径——换机时改成自己的 JDK 25 安装路径即可。
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
读取服务端 `[XxxLog]` 判定通道——如 `[AILog]`、`[FarmLog]`、`[MiningLog]`；
客户端 HUD 一律不作依据）。

已实现并验证（截至 2026-11）：

| 系统 | 覆盖内容 |
|---|---|
| 玩家状态 | 初始属性、经验/等级、逐级挖掘与近战加成、属性上限、床铺回血 |
| 睡眠与床铺入口 | 睡夜 fast-forward（R196 `runSleepTicks` 逐拍批量 + `dayTime`/`totalTime` 绝对对齐）、血月禁跳、床铺入口门控（遮蔽 / 头顶净空 / 中毒 / 可寻路敌怪 / 躺卧面逐拍哨门）、营养为 0 禁睡 |
| 饥饿与进食 | MITE 食物模型、饥饿惩罚、营养驱动的回血、进食用时、身体湿润度 |
| 挖掘与工具 | 采集门控、挖掘速度、工具耐久、整树砍伐（含附魔）、误采风险（undermine）、触及距离、锄头耕地（顶面与格下方门控、50 点磨损、鹤嘴镐右键）、木棍/骨头命中碎裂掷取（50% / 100% 掷率） |
| 合成 | 难度分级与合成耗时进度 |
| 熔炉 | 热量模型、燃料槽改造、熔炼经验回报 |
| 物品品质 | 品质掷取与提示 |
| 死亡 | 死亡事件与经验回报规则 |
| 战斗与伤害 | R196 护甲减伤模型、箭矢弹道与伤害（箭实体全量重写 + 真飞命中链）、剑盾格挡（R196 半减先于护甲步，逐材质盾减伤与磨损经 `ETIMShield`）、近战附魔（击晕 / 吸血 / 缴械）、屠宰仅限小刀与匕首、穿刺、自然防御 |
| 附魔 | R196 附魔池重建（权重、等级降级、费用衰减、三选上限、洗牌）、逐附魔难度窗（按难度分级）、17 个自定义附魔族（整树砍伐、坚忍、穿刺、速度、再生、中毒、真飞、迅捷、击晕、吸血、缴械、肥力、收获、屠宰、渔获、箭回收、自由行动）、铁砧合并 |
| 生物 | R196 消散链（闲置计数、动物/豹猫门、挽留与豁免）、生物属性表、蜘蛛物种 tint |
| 生物 AI 与掉落 | 避日与限制日照、破门、燃烧僵尸寻树 + 火焰蔓延、女巫漫游、狼敌对目标、弓箭手寻射位、寻找修理物、骷髅/僵尸 R196 掉落表、坠落重创 10% 宽恕门、装备掉落规则、智能僵尸标记 |
| 家畜 | 三需求（食 / 水 / 自由空间）、产出（奶 / 蛋 / 羽 / 肥）、手喂与喂水、地面拾食、繁殖（亲代 16000 拍冷却、新生 -64000 年龄、亲代福祉继承、炼药锅年龄锁、饥渴生长冻结）、避雨、避天敌与避火、出水与出岩浆、寻食寻水寻空地、惊恐逃窜 |
| 农耕与作物 | 耕地湿度机器、肥力与收获附魔、R196 生长率合成（光照 / 温度 / 湿度、全局 0.25 因子、邻接惩罚）、旱死、枯萎（血月 / 低光 / 邻格扩散）、枯死作物与枯死藤蔓方块、村庄田地生成即枯死、肥料与堆肥链 |
| 钓鱼 | R196 咬钩九段门、渔获附魔级联倍率、随后虫饵减半、原版诱饵叠层、海之眷顾的起竿经验、箭矢回收概率表 |
| 金属与装备 | 六金属（铜/银/远古金属/秘银/艾德曼/锈铁）工具与板甲、七金属（外加金）链甲、逐金属品质掷取、熔炉储块配方、铁砧修理（珠耗材 + 同物合并）、矿石方块、箱战利品（锈铁损耗面）、怪物随身装备（僵尸/骷髅随机装备链） |
| 下界 underworld（已实现 2026-10-25，验证窗已过） | 维度 id -2（底部 y +120 偏移）、专属群系（id 40）、地狱噪声地形 + 全高基岩层带与蛛网、不可破坏的 `mantle_or_core` 地面方块（掘底成就门）、菌丝 post 场、原生传送门户（黑曜石框点燃、目的地 metadata、R196 teleporter 全转录）、地牢刷怪笼（16 次/chunk、1/6 守护者）、铜/银/金/铁/秘银矿 + 艾德曼 ×16 脉、gravel 珠链、`/etim dim enter\|leave\|probe` 入口、下界时间门 |
| 开发/测试工具 | 配置门控的 `[XxxLog]` 判定通道（如 `[AILog]`、`[FarmLog]`、`[MiningLog]`）、开发覆盖层、mineflayer 测试 harness |

自动化判定驱动在 `testharness/`（假玩家、服务端脚本、报告输出）；该目录仅开发用，
不进发布 jar。

## 配置

全部玩家可感知的调值都收在一个 Forge 配置文件里（`config/etim.cfg`，首次运行
生成）。逐键说明就地维护——[`ETIMConfig.java`](src/main/java/io/github/etim/etim/ETIMConfig.java)
的字段注释是唯一权威源；生成文件里的注释按游戏语言书写。非法组合会中止模组
加载，不回落默认值。

分组：`playerCaps`/`leveling`、`regen`、`sleep`、`food`、`nutrition`、
`reach`、`mining`、`crafting`、`furnace`、`death`、`metal`、`mobs`（含
underworld 行）、`compat`、`devtools`。

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
