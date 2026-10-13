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
| 饥饿与进食 | MITE 食物模型、饥饿惩罚、营养驱动的回血、进食用时、身体湿润度 |
| 挖掘与工具 | 采集门控、挖掘速度、工具耐久、整树砍伐（含附魔）、误采风险（undermine）、触及距离 |
| 合成 | 难度分级与合成耗时进度 |
| 熔炉 | 热量模型、燃料槽改造、熔炼经验回报 |
| 物品品质 | 品质掷取与提示 |
| 死亡 | 死亡事件与经验回报规则 |
| 生物 | R196 消散链（闲置计数、动物/豹猫门、挽留与豁免）、生物属性表、家畜需求 v1（食/水/雨） |
| 开发/测试工具 | 配置门控的 `[AILog]` 判定通道、开发覆盖层、mineflayer 测试 harness |

## 兼容目标

ETIM 争取兼容：JEI、Just Enough Characters、Fence Jumper、Inventory Sorter、
OptiFine、SmoothFont、Journey Map、Mouse Tweaks、Rebind、RAD（Reload Audio
Drivers）、Step Up 和 The One Probe。

## 致谢

- [Morgana-Chris](https://github.com/Minecraft-Is-Too-Easy) — MITE
- FalsePattern — FAKEMITE
- X86_64 — My-mods-are-outdated（MMO）
- [CleanroomMC](https://github.com/CleanroomMC) — ForgeDevEnv 模板（MIT）

## 许可证

模板为 MIT 许可；项目许可证待定。
