# ETIM — Easy Times In Minecraft（轻松时光）

[English](README.md) | [中文](README.zh-CN.md) — both versions are kept in sync（中英两版内容同步维护）。

A Minecraft **1.12.2 Forge** mod that reimplements the core gameplay mechanics of
**MITE (Minecraft Is Too Easy)** from the ground up. ETIM is a from-scratch homage —
not a code port — built on modern tooling.

> [!WARNING]
> **Entirely AI-implemented — use at your own risk（本项目完全由 AI 实现，风险自担）.**
> This project was written end-to-end by the AI model **GLM-5.3-Flash** (Z.ai).
> The repository owner does not read or write code, and **no qualified person has
> reviewed this code for safety, correctness, or security**. It is provided for
> archiving and study purposes only. **Using it in any situation is not
> recommended**: it may crash your game, corrupt your worlds and saves, contain
> undisclosed exploitable behavior, or otherwise misbehave. Back up everything
> before letting it near a world you care about — and even then, don't.

- **Mod ID:** `etim`
- **Full name:** Easy Times In Minecraft（轻松时光）
- **Code root package:** `io.github.etim`

## Toolchain

Based on the [CleanroomMC ForgeDevEnv](https://github.com/CleanroomMC/ForgeDevEnv) template (MIT):

| Component | Version |
|---|---|
| Java (Gradle runtime) | 25 (Temurin) |
| Gradle | 9.7.0 |
| RetroFuturaGradle | 2.0.3 |
| Forge | 14.23.5.2847 |
| MCP mappings | stable 39 |
| MixinBooter | 11.13 |

The mod compiles against **Java 8** (auto-provisioned Azul JDK 8 toolchain).
Mixins are enabled (`use_mixins = true`) — see `src/main/resources/mixins.etim.json`
and the `io.github.etim.etim.mixins` package root. Coremod support is available via
`is_coremod` / `coremod_plugin_class_name` in `gradle.properties`.

## Getting started

### CLI

```powershell
# Gradle must run on Java 25
$env:JAVA_HOME = "C:\Users\GreatCoffee\tools\jdk-25.0.4.1+1"
.\gradlew.bat --version
.\gradlew.bat build        # compiles the mod (first run decompiles Minecraft, be patient)
.\gradlew.bat runClient    # launches a dev Minecraft client
.\gradlew.bat runServer    # launches a dev dedicated server
```

### IntelliJ IDEA

1. Open the project folder in IDEA.
2. `Settings > Build, Execution, Deployment > Build Tools > Gradle > Gradle JVM` → set to **Java 25** before syncing.
3. When prompted, load the Gradle project; then use the provided run configurations
   (`1. Run Client`, `2. Run Server`, …).
4. Recommended plugin: [MinecraftDev fork for RetroFuturaGradle](https://github.com/eigenraven/MinecraftDev/releases).

## Project layout

| Path | Purpose |
|---|---|
| `gradle.properties` | All mod/build tuning (id, version, mixin/coremod flags) |
| `tags.properties` | Build-time tokens injected into the generated `Tags` class |
| `gradle/scripts/dependencies.gradle` | Runtime/compile dependencies (e.g. `rfg.deobf(...)`) |
| `gradle/scripts/publishing.gradle` | CurseForge / Modrinth / Maven publishing |
| `src/main/resources/mixins.etim.json` | Mixin configuration (refmap + package root) |
| `testharness/` | Dev-only automated test drivers (fake players); **not** included in the release jar |

## Implemented systems

ETIM reimplements MITE mechanics system by system. Every value is driven by
first-hand R196 (MITE 1.6.4) bytecode judgments (javap double-source audit),
and each slice is validated by log-based automated testing (fake-player
harness reading server-side `[AILog]` judgment channels — client HUD is never
a basis for judgment).

Implemented and verified (as of 2026-10):

| System | What it covers |
|---|---|
| Player state | Initial stats, XP/leveling, per-level mining & melee bonuses, stat caps, bed regen |
| Hunger & food | MITE food model, starvation rules, nutrition-driven healing, ingest use-timings, wetness |
| Mining & tools | Harvest gating, mining speed, tool durability, tree felling (+ felling enchantment), undermine, reach |
| Crafting | Difficulty tiers with timed crafting progress |
| Furnace | Heat model, fuel slot rework, smelting XP rewards |
| Item quality | Quality rolls with tooltips |
| Death | Death events and XP payout rules |
| Mobs | R196 despawn chain (idle counters, animal/ocelot gates, holds & exemptions), mob attribute stats, livestock needs v1 (food/water/rain) |
| Dev/test tooling | Config-gated `[AILog]` judgment channels, dev overlay, mineflayer test harness |

## Compatibility goals

ETIM aims to be compatible with: JEI, Just Enough Characters, Fence Jumper,
Inventory Sorter, Optifine, SmoothFont, Journey Map, Mouse Tweaks, Rebind,
RAD (Reload Audio Drivers), Step Up, and The One Probe.

## Credits

- [Morgana-Chris](https://github.com/Minecraft-Is-Too-Easy) — MITE
- FalsePattern — FAKEMITE
- X86_64 — My-mods-are-outdated (MMO)
- [CleanroomMC](https://github.com/CleanroomMC) — ForgeDevEnv template (MIT)

## License

Template licensed MIT; project license TBD.
