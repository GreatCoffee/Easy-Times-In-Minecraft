# ETIM — Easy Times In Minecraft（轻松时光）

[English](README.md) | [中文](README.zh-CN.md) — both versions are kept in sync（中英两版内容同步维护）。

A Minecraft **1.12.2 Forge** mod that reimplements the core gameplay mechanics of
**MITE (Minecraft Is Too Easy)** from the ground up. ETIM is a from-scratch homage —
not a code port — built on modern tooling.

> [!WARNING]
> **Entirely AI-implemented — use at your own risk（本项目完全由 AI 实现，风险自担）.**
> This project is written end-to-end by AI models. From inception through
> 2026-11-15 the code was authored by **GLM-5.3-Flash** (Z.ai); from 2026-11-16
> onward development continues with **DeepSeek V4.1 Flash**.
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
| Java (Gradle runtime) | 25 (Azul Zulu 25.0.5) |
| Gradle | 9.7.0 |
| RetroFuturaGradle | 2.0.3 |
| Forge | 14.23.5.2847 |
| MCP mappings | stable 39 |
| MixinBooter | 11.13 |

Gradle 9.7.0 and RetroFuturaGradle 2.0.3 themselves require Java 25; CI
(`.github/workflows/deploy.yml`) uses the same Azul Zulu 25 distribution.

The mod compiles against **Java 8** (auto-provisioned Azul JDK 8 toolchain).
Mixins are enabled (`use_mixins = true`) — see `src/main/resources/mixins.etim.json`
and the `io.github.etim.etim.mixins` package root. Coremod support is available via
`is_coremod` / `coremod_plugin_class_name` in `gradle.properties`.

## Getting started

### CLI

```powershell
# Gradle must run on Java 25. gradle.properties pins org.gradle.java.home to a
# local JDK 25 path — on another machine, point it at your own JDK 25 install.
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
harness reading server-side `[XxxLog]` judgment channels — e.g. `[AILog]`,
`[FarmLog]`, `[MiningLog]`; client HUD is never a basis for judgment).

Implemented and verified (as of 2026-11):

| System | What it covers |
|---|---|
| Player state | Initial stats, XP/leveling, per-level mining & melee bonuses, stat caps, bed regen |
| Sleep & bed entry | Sleep-night fast-forward (R196 `runSleepTicks` per-tick batch + absolute `dayTime`/`totalTime` alignment), blood-moon sleep block, bed-entry gates (shelter / overhead passable / poison / pathable hostile / lie-side per-tick sentry), nutrition-zero sleep deny |
| Hunger & food | MITE food model, starvation rules, nutrition-driven healing, ingest use-timings, wetness |
| Mining & tools | Harvest gating, mining speed, tool durability, tree felling (+ felling enchantment), undermine, reach, hoe tilling (top-face & low-cell gates, 50-point wear, mattock right-click), stick/bone shatter on hit (50% / 100% roll) |
| Crafting | Difficulty tiers with timed crafting progress |
| Furnace | Heat model, fuel slot rework, smelting XP rewards |
| Item quality | Quality rolls with tooltips |
| Death | Death events and XP payout rules |
| Combat & damage | R196 armor damage-reduction model, arrow ballistics and damage (full arrow rewrite + true-flight accuracy chain), sword/shield blocking (R196 halving applied before the armor step, per-material shield reduction and wear via `ETIMShield`), melee enchantments (stun / vampiric / disarming), butchering on knife and dagger, piercing, natural defense |
| Enchanting | R196 enchantment pool rebuild (weights, level demotion, cost decay, three-pick cap, shuffle), per-enchantment difficulty-keyed windows, 17 custom enchantments (tree felling, endurance, piercing, speed, regeneration, poison, true flight, quickness, stun, vampiric, disarming, fertility, harvesting, butchering, fishing fortune, arrow recovery, free action), anvil combine |
| Mobs | R196 despawn chain (idle counters, animal/ocelot gates, holds & exemptions), mob attribute stats, spider species tint |
| Mob AI & drops | Sun avoidance and daylight restriction, door breaking, burning-zombie tree seeking + fire spread, witch roaming, wolf hostility targeting, archer firing-position seeking, repair-item seeking, R196 skeleton/zombie drop tables, 10% massive-fall mercy gate, equipment drop rules, smart-zombie flag |
| Livestock | Three needs (food / water / free space), produce (milk / eggs / feathers / manure), hand feeding & watering, ground pickup, breeding (16000-tick parent cooldown, -64000 newborn age, parent wellness inheritance, cauldron age lock, hunger & thirst growth freeze), rain shelter, predator & fire avoidance, water/lava escape, seeking food / water / open space, panic flight |
| Farming & crops | Farmland moisture machine, fertility & harvest enchants, R196 growth-rate composition (light / temperature / moisture, global 0.25 factor, adjacency penalty), drought death, blight (blood moon / low light / neighbour spread), dead crop & dead stem blocks, village-field blight on generation, manure & compost chain |
| Fishing | R196 nine-segment bite gate, fishing-fortune bite cascade then worm-bait half, vanilla lure stack, luck-of-the-sea catch XP, arrow-recovery chance table |
| Metals & gear | Six tool/plate-armor metals (copper, silver, ancient metal, mithril, adamantium, rusted iron) and a seven-metal chain set (+ gold), quality rolls per metal, furnace storage recipes, anvil repair (nugget + combine), ore blocks, chest loot (rusted-iron damage face), mob-carried gear (zombie/skeleton random equipment) |
| Underworld (landed 2026-10-25, verification passed) | Dimension id -2 with 120-block floor offset, native PORTALS (flint-ignited obsidian frames, destination metadata + full R196 teleporter),  dedicated biome (id 40), hell-noise terrain with full-height bedrock strata & cobwebs, unbreakable `mantle_or_core` floor (the nether-achievement dig gate),  mycelium post fields, dungeon spawners (16/chunk, 1/6 Guardian), copper/silver/gold/iron/mithril ores + adamantium generation (x16 veins), gravel nugget chain,  spider jockey swap, `/etim dim enter\|leave\|probe` entry, underworld time gate |
| Dev/test tooling | Config-gated `[XxxLog]` judgment channels (e.g. `[AILog]`, `[FarmLog]`, `[MiningLog]`), dev overlay, mineflayer test harness |

Automated judgement drivers live in `testharness/` (fake players, server scripts,
report output); that directory is dev-only and never ships in the release jar.

## Configuration

All player-facing tuning lives in one Forge config file (`config/etim.cfg`,
generated on first run). Every key is documented in place — the field comments
in [`ETIMConfig.java`](src/main/java/io/github/etim/etim/ETIMConfig.java) are
the source of truth, and the generated file's comments follow the game
language. Invalid combinations abort the mod load instead of falling back.

Config groups: `playerCaps`/`leveling`, `regen`, `sleep`, `food`, `nutrition`,
`reach`, `mining`, `crafting`, `furnace`, `death`, `metal`, `mobs` (including
the underworld rows), `compat`, `devtools`.

## Compatibility goals

ETIM aims to be compatible with: JEI, Just Enough Characters, Fence Jumper,
Inventory Sorter, OptiFine, SmoothFont, Journey Map, Mouse Tweaks, Rebind,
RAD (Reload Audio Drivers), Step Up, and The One Probe.

## Credits

- Avernite — Minecraft Is Too Easy (MITE)（1.6.4 original, R196）
- [Modded MITE Community](https://github.com/MinecraftIsTooEasy) — MITE revival & community mods
- [CleanroomMC](https://github.com/CleanroomMC) — ForgeDevEnv template (MIT)
- [GTNewHorizons](https://github.com/GTNewHorizons/RetroFuturaGradle) — RetroFuturaGradle
- [FalsePattern](https://github.com/falsepattern) — MITF (MITE-IsTooFalse, R196 testbed; public-implementation reference)

## License

Template licensed MIT; project license TBD.

## Configuration

All 270 keys (type, default, range, one-line description) are generated from the source:
see [`docs/CONFIG.md`](docs/CONFIG.md). Regenerate with `node testharness/tools/gen-config-doc.js`.
