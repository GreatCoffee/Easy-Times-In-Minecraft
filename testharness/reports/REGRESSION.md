# 回归覆盖矩阵（生成物）

> 由 `node testharness/tools/regression-plan.js` 生成，**不要手改**；preflight 第 12 步用 `--check` 拦陈旧。
> 粒度：src 里的 `[XxxLog]` 产出点 × 今天仍能跑的 harness 脚本。

## 总览

| 项 | 数 |
| --- | --- |
| 判据通道（有产出点） | 51 |
| 被 harness 覆盖 | 12 |
| 无覆盖（GAP） | 39 |
| harness 脚本 | 9 |
| 已封批（有 verdict） | 71 |

## 在跑的窗口

| 脚本 | 推断批次 | 覆盖通道 | verdict |
| --- | --- | --- | --- |
| `f11-b62-smoke.js` | B-62 | 2 个：ElementalLog/SpawnLog | 有 |
| `f11-b64-smoke.js` | B-64 | 1 个：ItemLog | 有 |
| `f11-b65-smoke.js` | B-65 | 1 个：FoodR196Log | 有 |
| `f11-b66-smoke.js` | B-66 | 1 个：BlockFaceLog | 有 |
| `f11-b67-smoke.js` | B-67 | 3 个：BoomLog/DropLog/ExplosionLog | 有 |
| `f11-b68-smoke.js` | B-68 | 1 个：FarmLog | 有 |
| `f11-b69-smoke.js` | B-69 | 3 个：FarmLog/MountLog/SparkLog | 有 |
| `f12-b70t8-smoke.js` | - | 0 个：- | 无 |
| `f13-b70t9-smoke.js` | - | 1 个：FoodLog | 无 |

## 通道覆盖

| 通道 | 产出文件 | 覆盖脚本 | 状态 |
| --- | --- | --- | --- |
| `AILog` | CommandDevTest.java, ETIM.java, ETIMConfig.java … | - | GAP |
| `ArrowLog` | ETIMBlockLog.java, ETIMDamageLog.java, ETIM.java … | - | GAP |
| `BatLog` | MixinEntityBat.java | - | GAP |
| `BatMobLog` | CommandDevTest.java, ETIMEntityNightwing.java, ETIMEntityVampireBat.java … | - | GAP |
| `BeastLog` | CommandDevTest.java, ETIMEntityDireWolf.java, ETIMEntityHellhound.java | - | GAP |
| `BlockFaceLog` | CommandDevTest.java, ETIMBlockStacks.java, ETIMItemMaterialEvents.java | f11-b66-smoke.js | COVERED |
| `BlockLog` | ETIMBlockLog.java, ETIMGhost.java, CommandDevTest.java … | - | GAP |
| `BoomLog` | CommandDevTest.java | f11-b67-smoke.js | COVERED |
| `ButchLog` | EnchantmentButchering.java, ETIMButchering.java, ETIMButcheringEvents.java … | - | GAP |
| `CapLog` | ETIMConfig.java, CapLog.java | - | GAP |
| `CraftingLog` | CommandDevTest.java, ETIMCrafting.java, ETIM.java … | - | GAP |
| `DamageLog` | ETIMBlockLog.java, ETIMDamageLog.java, ETIMMelee.java … | - | GAP |
| `DeathLog` | ETIMDeathEvents.java, ETIMConfig.java | - | GAP |
| `DimLog` | CommandUnderworld.java, ETIM.java, ETIMConfig.java … | - | GAP |
| `DropLog` | ETIMBlockDrops.java, MixinEntityLivingBase.java, ETIMMobDrops.java | f11-b67-smoke.js | COVERED |
| `ElementalLog` | CommandDevTest.java, MixinBlockStaticLiquid.java, MixinEntitySnowball.java … | f11-b62-smoke.js | COVERED |
| `EnchLog` | ETIMEnchantPool.java, ETIMConfig.java | - | GAP |
| `EnchantLog` | CommandDevTest.java, ETIMConfig.java, ETIMAnvilRepair.java … | - | GAP |
| `EquipLog` | ETIM.java, ETIMConfig.java, ETIMGear.java … | - | GAP |
| `ExplosionLog` | ETIMExplosion.java | f11-b67-smoke.js | COVERED |
| `FarmLog` | CommandDevTest.java, ETIMConfig.java, ETIMCompost.java … | f11-b68-smoke.js, f11-b69-smoke.js | COVERED |
| `FireLog` | ETIMFireSpreadRules.java | - | GAP |
| `FishLog` | CommandDevTest.java, ETIMConfig.java, ETIMFishing.java | - | GAP |
| `FoodLog` | CommandDevTest.java, ETIMConfig.java, ETIMEndurance.java … | f13-b70t9-smoke.js | COVERED |
| `FoodR196Log` | CommandDevTest.java, ETIMAppleGoldEvents.java, ETIMVesselEvents.java | f11-b65-smoke.js | COVERED |
| `FurnaceLog` | ETIMConfig.java, FurnaceHeat.java, ETIMBlocks.java … | - | GAP |
| `GelLog` | CommandDevTest.java, ETIMEntityCubic.java, ETIMEntityGelatinousCube.java … | - | GAP |
| `HoeLog` | ETIMItemMattock.java, MixinItemHoe.java | - | GAP |
| `IngestLog` | ETIMConfig.java, ETIMIngestibles.java, MixinBlock.java | - | GAP |
| `ItemLog` | CommandDevTest.java, ETIMItemMelt.java, ETIMItemStacks.java … | f11-b64-smoke.js | COVERED |
| `MeleeLog` | ETIMMelee.java, ETIMConfig.java | - | GAP |
| `MiningLog` | ETIMConfig.java, ETIMMining.java, MixinItem.java … | - | GAP |
| `MobLog` | ETIMConfig.java, ETIMArrowLog.java, ETIMEntityArachnid.java … | - | GAP |
| `MountLog` | CommandDevTest.java, MixinBlockTorchFarmland.java, ETIMMountRules.java | f11-b69-smoke.js | COVERED |
| `OozeLog` | ETIMOozeSpawn.java | - | GAP |
| `OreLog` | ETIMConfig.java, ETIMOreGen.java | - | GAP |
| `PickupLog` | ETIMMobPickup.java | - | GAP |
| `PoseLog` | CommandPose.java, GuiPoseTuner.java, PoseFileWatcher.java … | - | GAP |
| `RepairLog` | ETIMEntityAIMoveToRepairItem.java | - | GAP |
| `SilverLog` | CommandDevTest.java, MixinBlockSilverfish.java, MixinEntitySnowball.java … | - | GAP |
| `SkillLog` | ClientNetworkHooks.java, CommandDevTest.java, CommandEtimSkill.java | - | GAP |
| `SleepLog` | ETIMConfig.java, MixinEntityPlayer.java, ETIMDigging.java … | - | GAP |
| `SoundLog` | ETIMSoundLog.java, ETIM.java, ETIMConfig.java | - | GAP |
| `SparkLog` | ETIMBlockSpark.java, ETIMSpecialBlocks.java | f11-b69-smoke.js | COVERED |
| `SpawnLog` | CommandDevTest.java, ETIMSpawnCycle.java, ETIMSpawnTables.java … | f11-b62-smoke.js | COVERED |
| `StalkerLog` | ETIMEntityAISeekLitTorch.java, ETIMEntityInvisibleStalker.java | - | GAP |
| `SwingLog` | MixinItem.java | - | GAP |
| `TestLog` | ETIMItemModels.java, CommandDevTest.java, TestDriver.java … | - | GAP |
| `UndeadLog` | CommandDevTest.java, ETIMEntityGhoul.java, ETIMEntityShadow.java … | - | GAP |
| `WeatherLog` | CommandDevTest.java, ETIMConfig.java, MixinWorldServer.java … | - | GAP |
| `WorldGenSpawnLog` | CommandDevTest.java, MixinWorldEntitySpawner.java, ETIMWorldGenSpawning.java | - | GAP |

## 缺口怎么读

- `GAP` 不代表功能坏，只代表「今天没有脚本能替你重跑它」。老批次结论只有当时的日志可查。
- 优先补的 GAP：共享代码改一次就会波及的子系统（伤害/属性、掉落、挖块、干旱、群系刷怪）。
- 新窗口上 harness 后重跑本工具，`GAP` 会自动减少，不需要手改本表。