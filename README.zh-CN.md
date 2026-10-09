# ETIM — Easy Times In Minecraft（轻松时光）

[English](README.md) | [中文](README.zh-CN.md) —— 中英两版内容同步维护。

一个 Minecraft **1.12.2 Forge** 模组，从零重现 **MITE（Minecraft Is Too Easy，
太特么难了）** 的核心玩法机制。ETIM 是从零开始的致敬之作——**不是代码移植**——
基于现代工具链构建。

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
