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
| Sleep & bed entry | Sleep-night fast-forward (R196 `runSleepTicks` per-tick batch + absolute `dayTime`/`totalTime` alignment), blood-moon sleep block, bed-entry gates (shelter / overhead passable / poison / pathable hostile / lie-side per-tick sentry), nutrition-zero sleep deny |
| Hunger & food | MITE food model, starvation rules, nutrition-driven healing, ingest use-timings, wetness |
| Mining & tools | Harvest gating, mining speed, tool durability, tree felling (+ felling enchantment), undermine, reach |
| Crafting | Difficulty tiers with timed crafting progress |
| Furnace | Heat model, fuel slot rework, smelting XP rewards |
| Item quality | Quality rolls with tooltips |
| Death | Death events and XP payout rules |
| Mobs | R196 despawn chain (idle counters, animal/ocelot gates, holds & exemptions), mob attribute stats, livestock needs v1 (food/water/rain), spider species tint |
| Metals & gear | Five-metal tool/armor grid (50 tools, 40 armor, 5 chains), quality rolls per metal, furnace storage recipes, anvil repair (nugget + combine), ore blocks, chest loot (rusted-iron damage face), mob-carried gear (zombie/skeleton random equipment) |
| Underworld (landed 2026-10-25, verification window pending) | Dimension id -2 with 120-block floor offset, dedicated biome (id 40), hell-noise terrain with full-height bedrock strata & cobwebs, unbreakable `mantle_or_core` floor, mycelium post fields, Longdead/Guardian/Ancient Bone Lord trio with troop summons, spider jockey swap, `/etim dim enter\|leave\|probe` entry, underworld time gate |
| Dev/test tooling | Config-gated `[AILog]` judgment channels, dev overlay, mineflayer test harness |

Automated judgement drivers live in `testharness/` (fake players, server scripts,
report output); that directory is dev-only and never ships in the release jar.

## Configuration quick reference

All player-facing tuning lives in one Forge config file (`config/etim.cfg`,
generated on first run). Comments in the generated file follow the game
language; the groups below are the config file's own category names. Every row
is transcribed from the field comments in `ETIMConfig.java` — the source of
truth. Invalid combinations abort the mod load instead of falling back.

### `playerCaps` / `leveling`

- `capAtLevel0` (int, `6`) — Health/food cap in points (2 points = one icon) at level 0.
- `capGrowthPerFiveLevels` (int, `2`) — Cap added (in points) per 5 levels.
- `capMaximum` (int, `20`) — Ceiling the level table can reach.
- `levelCap` (int, `200`) — Hard cap of player levels.
- `miningSpeedPerLevel` (float, `0.02`) — Mining speed bonus fraction per level.
- `meleeDamagePerLevel` (float, `0.005`) — Melee damage bonus fraction per level.

### `regen`

- `bedRegenFactor` (float, `4.0`) — Heal-rate multiplier while lying in a bed (any time of day).
- `allowDayBedRegen` (bool, `true`) — Allow lying in a bed in daytime purely for the regen boost (MITE behavior).

### `sleep`

- `bloodMoonSleepBlock` (bool, `true`) — Blood moon (full-day phase) blocks the sleep skip; `false` lets it skip as vanilla.
- `sleepFastForward` (bool, `true`) — Sleep night runs as an R196 `runSleepTicks` per-tick batch and aligns `dayTime` absolutely to `totalTime` (double-clock desync cure); `false` = vanilla instant jump + eject.
- `bedRefuseShelter` (bool, `true`) — Beds must be sheltered (R196 `isOutdoors` face refuses open-sky beds); `false` = vanilla.
- `bedRefuseObstructed` (bool, `true`) — The block above the head must be passable; `false` = vanilla (no overhead check).
- `bedRefusePoison` (bool, `true`) — Poisoned players cannot enter a bed; `false` = vanilla.
- `bedHostilePathable` (bool, `true`) — `NOT_SAFE` needs a hostile that can actually path to the bed (also covers non-`EntityMob` `IMob`s); `false` = vanilla unfiltered `EntityMob` AABB.
- `bedSentryWake` (bool, `true`) — Lie-side per-tick sentinel: a hostile that reaches the bed wakes the sleeper; `false` = vanilla (no sentry).

### `food`

- `foodModel` (bool, `true`) — Master switch of the R196 satiation/nutrition dual-pool model; `false` = vanilla food bar.
- `hungerGainPerTick` (float, `0.002`) — Hunger-pool accrual per tick (multiplied by the wetness factor).
- `hungerPerFoodUnit` (float, `4.0`) — Hunger-pool units consumed per food point.
- `hungerNutritionOnlyFactor` (float, `0.25`) — Nutrition-only accumulator factor; when it fills, the next eaten point comes from nutrition.
- `hungerPoolCap` (float, `40.0`) — Hunger-pool cap.
- `starveGainPerTick` (float, `0.002`) — Starve-progress accrual per tick while nutrition == 0.
- `starveHealthCeiling` (float, `10.0`) — Starving players above this health take no starve damage.
- `healBasePerTick` (float, `0.0004`) — Base heal progress per tick (full 1.0 = one HP).
- `healPerNutritionPerTick` (float, `0.00002`) — Extra heal progress per tick per nutrition point.
- `inBedHitListHunger` (float, `0.04`) — Hunger-pool charge per damage event taken while lying in a bed.
- `hungerSleepDeny` (bool, `true`) — Nutrition == 0 blocks sleep: lie-down refused, sleepers woken with a message.
- `foodTestMode` (bool, `false`) — TEST compression: hunger accrual and starve progress ×5.
- `foodDebugLog` (bool, `false`) — Server-log `[FoodLog]` lines (dev channel).
- `ingestUseDurationTicks` (int, `32`) — Use duration for every R196-ingestible item.
- `ingestDebugLog` (bool, `false`) — Server-log `[IngestLog]` lines (dev channel).
- `malnourishedHungerFactor` (float, `0.5`) — Hunger-rate factor while malnourished.
- `wetnessRainLight` (float, `0.25`) — Wetness factor for standing in light rain.
- `wetnessRainThunder` (float, `0.5`) — Wetness factor for standing in a thunderstorm.
- `wetnessImmerseAbove` (float, `0.5`) — Wetness factor when the head's block is water.
- `wetnessImmerseBelow` (float, `0.25`) — Wetness factor when the feet's block is water.
- `wetnessCombo` (float, `0.125`) — Extra wetness for light rain + feet-only immersion.
- `wetnessFreezingMultiplier` (float, `2.0`) — Multiplier when the biome is freezing.
- `wetnessFreezingTemperature` (float, `0.15`) — Biome temperature at/below which the freeze multiplier applies.
- `wetnessHotExemptTemperature` (float, `1.0`) — Biome temperature at/above which wetness is washed out entirely.
- `hungerCraftDeny` (bool, `true`) — Crafting output cannot be taken while hungry.
- `hungerPlaceDeny` (bool, `true`) — hardness > 0 blocks cannot be placed while hungry (hardness-0 blocks stay placeable).
- `hungerMoveFactor` (float, `0.75`) — Walk and air movement multiplier while hungry.
- `hungerSprintDeny` (bool, `true`) — Sprint start/continue requires food energy.
- `hungerWeakStrike` (bool, `true`) — Bare-hand melee becomes a zero-damage weak strike when hungry.
- `weakStrikeKnockbackFactor` (float, `0.6`) — Weak-strike knockback as a fraction of normal.
- `weakStrikeHealthThreshold` (float, `2.0`) — Below this health, strikes are weak even when fed.
- `hungerDigStrDivisor` (float, `5.0`) — Dig-strength divisor while hungry.
- `hungerDenialFeedback` (bool, `true`) — Action-bar feedback when a hunger gate denies an action (dev/test channel).

### `nutrition`

- `nutritionPoolMax` (int, `160000`) — Full pool size in ticks (20 nutrition points).
- `nutritionTicksPerPoint` (int, `8000`) — Pool tick gain per food nutrition point.
- `sugarToInsulin` (float, `4.8`) — Sugar content → insulin response conversion.
- `insulinCap` (int, `192000`) — Insulin-resistance cap.
- `insulinThresholdMild` (int, `48000`) — Mild level threshold.
- `insulinThresholdModerate` (int, `96000`) — Moderate level threshold; moderate and above can no longer eat sugars.
- `insulinThresholdSevere` (int, `144000`) — Severe level threshold.
- `malnourishedRegenFactor` (float, `0.25`) — Regen-rate factor while malnourished.

### `reach`

- `blockReachBase` (float, `2.75`) — Bare-hand block selection/breaking reach.
- `meleeReachBase` (float, `1.5`) — Bare-hand melee attack reach; held weapons add their bonus.
- `interactionReachBase` (float, `2.5`) — Entity interaction (right-click) reach.
- `creativeReach` (float, `5.0`) — Extended reach in creative mode.
- `reachBonusTool` (float, `0.75`) — Reach bonus of swords/pickaxes/axes/shovels.
- `reachBonusSmall` (float, `0.5`) — Reach bonus of stick/bone and shears.
- `reachServerTolerance` (float, `0.25`) — Server-side validation headroom against lag and metric differences.
- `entityHitboxExpansion` (float, `0.1`) — Entity hit-box expansion used by the reach raycast.
- `reachDenialFeedback` (bool, `true`) — Chat feedback when the server rejects a reach-denied action.
- `debugRayLength` (float, `8.0`) — Length of the debug overlay's display-only ray (never affects gameplay).

### `mining`

- `miningReform` (bool, `true`) — Master switch of the task-2.2 mining reform (progress formula + drop gate).
- `treeFellingMaxLevel` (int, `10`) — Maximum level of the tree-felling enchantment.

### `crafting`

- `craftingTimer` (bool, `true`) — Master switch of the R196 crafting timer (recipes take difficulty ticks); `false` = vanilla instant.
- `craftingSkipCreative` (bool, `true`) — Creative players keep vanilla instant crafting.
- `craftingSpeedPerLevel` (float, `0.02`) — Crafting speed bonus fraction per level.
- `craftingBenchModifier` (float, `0.2`) — Crafting-table speed modifier (the 2x2 inventory grid counts as no bench).
- `craftingPeriodFloor` (int, `25`) — Minimum crafting period in ticks.
- `craftingCurveExponent` (float, `0.8`) — Exponent of the difficulty>100 period curve.
- `craftingGenericDifficulty` (float, `25.0`) — Difficulty of unlisted generic ingredients.
- `craftingDamagePenaltyPerDamagePoint` (int, `50`) — Craft progress in ticks lost per whole damage point taken (must be a multiple of 10).
- `craftingCompleteFeedback` (bool, `true`) — Chat line when a craft completes (dev/test channel).
- `craftingStartFeedback` (bool, `true`) — Chat line when a craft starts, with the expected duration.
- `craftingProgressArrow` (bool, `true`) — Fill the crafting arrow with white progress (MITE GUI look).
- `craftingDebugLog` (bool, `false`) — Server-log `[CraftingLog]` lines (dev channel).
- `qualitySystem` (bool, `true`) — Master switch of the R196 quality ladder; right-click the result slot to cycle the rung (higher rungs cost XP and lengthen the period).
- `craftingQualityFeedback` (bool, `true`) — Chat line when the right-click quality cycling changes the rung.
- `qualityDefaultMax` (int, `5`) — Max quality rung (0..7) for items with no mapped vanilla material.
- `qualityMaxOverrides` (string, `""`) — Per-item max-quality overrides as a `registryName=0..7` CSV, beating the material mapping.
- `craftingWebDeny` (bool, `true`) — Crafting freezes while the player's upper body is inside a spider web.
- `craftingDamagedDeny` (bool, `true`) — Any damaged item in the crafting grid freezes the craft.
- `craftingFx` (bool, `false`) — Completion effect: level-up sound + witch sparkles (off until an effect is picked).

### `furnace`

- `furnaceHeatSystem` (bool, `true`) — Master switch of the R196 heat ladder: fuels carry heat levels and recipes require a minimum; lower heat refuses the smelt.
- `furnaceVanillaMaxHeat` (int, `2`) — Max heat the vanilla furnace accepts.
- `furnaceBurnTimeR196` (bool, `true`) — R196 fuel burn durations replace vanilla where they differ.
- `furnaceXpRewards` (bool, `true`) — Taking output pays the R196 per-item XP reward as one orb instead of the vanilla random split.
- `furnaceGuiHints` (bool, `true`) — Gold no-smelt / not-fuel / too-hot GUI hints.
- `furnaceInputRecipeGate` (bool, `true`) — Input slot only admits items that have a smelting recipe (GUI drag and hopper alike); `false` = vanilla open input.
- `furnaceDebugLog` (bool, `false`) — Server-log `[FurnaceLog]` lines (dev channel).

### `death`

- `deathXpOrbs` (bool, `false`) — Death drops total/3 as XP orbs at the death spot (suppressed by `keepInventory`); default off converges to the R196 pool-only semantics, the key is kept for players who want the loss softened.
- `deathXpSettle` (bool, `true`) — Death settles the XP balance; `false` = vanilla carryover.
- `deathDebugLog` (bool, `false`) — Server-log `[DeathLog]` lines (dev channel).

### `metal`

- `metalSystem` (bool, `true`) — Master switch of the five-metal system (gear, ores, loot, anvil repair); `false` = vanilla untouched.
- `metalOreGen` (bool, `true`) — The four ore blocks (copper/silver/mithril/adamantium) generate in the overworld; ancient metal has no ore — it is chest/mob loot.
- `metalAnvilRepair` (bool, `true`) — The R196 anvil repair on ETIM gear via the vanilla anvil: consumable nugget repair + same-item combination (pure sum, capped), 0 XP, proportional anvil wear with 0.5/0.8/1.0 stages; fail 1 = quality over budget, fail 2 = material durability strictly over iron 8.0.
- `metalDebugLog` (bool, `true`) — Server-log `[OreLog]` rows for ore generation (dev channel).
- `miningDebugLog` (bool, `true`) — Server-log `[MiningLog]` rows: mine deny (material grade vs block) and the effective dig strength.
- `equipDebugLog` (bool, `true`) — Boot dump of all 95 gear items to `[EquipLog]` (dev channel).
- `mobEquipDebugLog` (bool, `false`) — Server-log `[MobLog]` rows for mob-carried gear (weapon/armor/quality faces, dev channel).

### `mobs`

- `mobDespawnR196` (bool, `true`) — Master switch of the R196 despawn chain (view resets, mob-path holds, animal walls, zombie-villager holds, hour-of-grace doubling, counter≥200 kill pass); `false` = vanilla 1.12 despawn.
- `mobStatsR196` (bool, `true`) — Master switch of the R196 per-class mob attribute table; `false` = vanilla 1.12 attributes.
- `mobSpawnR196` (bool, `true`) — Master switch of the R196 spawn cycle (per-type caps, hostile probability rings, modifier events, admission rules); `false` = vanilla 1.12 spawning.
- `livestockNeedsR196` (bool, `true`) — Master switch of the R196 livestock needs pipeline v1 (food/water/freedom needs; production gates come later).
- `spawnCapMonster` (int, `50`) — Monster cap before the ×chunks/256 conversion.
- `spawnCapAnimal` (int, `10`) — Animal cap before the ×chunks/256 conversion.
- `spawnCapAmbient` (int, `5`) — Ambient cap before the ×chunks/256 conversion.
- `spawnCapAquatic` (int, `5`) — Aquatic cap before the ×chunks/256 conversion.
- `moonStateOverride` (string, `""`) — Force the spawn-cycle moon state (`""`, `blue`, `blood`, `full`, `new`) for test determinism; the stage-6 moon slice replaces the backend.
- `zombieDigAI` (bool, `true`) — The R196 zombie dig-through AI (walls are not cover); `false` = vanilla.
- `mobDebugLog` (bool, `false`) — Server-log `[AILog]` lines (dev channel).
- `underworldDebugLog` (bool, `false`) — The underworld batch's `[DimLog]` rows (dimension register, provider faces, enter/leave with landing y, the column probe, biome registration, the underworld time gate); also arms the underworld `[MobLog]` rows (troop type, arrow face, guardian hand swap, attributes). Off = silent.

### `compat` / `devtools`

- `compatCraftingTweaksFix` (bool, `true`) — With Crafting Tweaks installed, auto-disable its `rightClickCraftsStack` so the R196 quality picker keeps the result-slot right-click.
- `devTools` (bool, `true`) — Master switch of the dev-only GRAVE-key debug HUD and the `/etest` command; needs a restart.

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
