# 回归覆盖矩阵（生成物）

> 由 `node testharness/tools/regression-plan.js` 生成，**不要手改**；preflight 第 12 步用 `--check` 拦陈旧。
> 粒度：src 里的 `[XxxLog]` 产出点 × 今天仍能跑的 harness 脚本。

## 总览

| 项 | 数 |
| --- | --- |
| 判据通道（有产出点） | 51 |
| 被 harness 覆盖 | 42 |
| 无覆盖（GAP） | 9 |
| harness 脚本 | 18 |
| 已封批（有 verdict） | 74 |

## 在跑的窗口

| 脚本 | 推断批次 | 覆盖通道 | verdict |
| --- | --- | --- | --- |
| `f11-b58-smoke.js` | B-58 | 2 个：FoodLog/GelLog | 有 |
| `f11-b59-smoke.js` | B-59 | 2 个：SpawnLog/UndeadLog | 有 |
| `f11-b60-smoke.js` | B-60 | 4 个：AILog/SpawnLog/StalkerLog/UndeadLog | 有 |
| `f11-b61-smoke.js` | B-61 | 2 个：BeastLog/SpawnLog | 有 |
| `f11-b62-smoke.js` | B-62 | 2 个：ElementalLog/SpawnLog | 有 |
| `f11-b63-smoke.js` | B-63 | 1 个：SilverLog | 有 |
| `f11-b64-smoke.js` | B-64 | 1 个：ItemLog | 有 |
| `f11-b65-smoke.js` | B-65 | 1 个：FoodR196Log | 有 |
| `f11-b66-smoke.js` | B-66 | 1 个：BlockFaceLog | 有 |
| `f11-b67-smoke.js` | B-67 | 3 个：BoomLog/DropLog/ExplosionLog | 有 |
| `f11-b68-smoke.js` | B-68 | 1 个：FarmLog | 有 |
| `f11-b69-smoke.js` | B-69 | 3 个：FarmLog/MountLog/SparkLog | 有 |
| `f12-b70t8-smoke.js` | - | 2 个：SpawnLog/WorldGenSpawnLog | 无 |
| `f13-b70t9-smoke.js` | - | 1 个：FoodLog | 无 |
| `f14-reg-core.js` | - | 3 个：DamageLog/MiningLog/TestLog | 无 |
| `f15-reg-chains.js` | - | 7 个：CraftingLog/DeathLog/FishLog/FurnaceLog/IngestLog/MeleeLog/OreLog | 无 |
| `f16-reg-third.js` | - | 7 个：EnchantLog/EquipLog/HoeLog/PickupLog/SleepLog/SwingLog/WeatherLog | 无 |
| `f17-reg-fourth.js` | - | 6 个：BlockLog/ButchLog/CapLog/DimLog/MobLog/SkillLog | 无 |

## 通道覆盖

| 通道 | 产出文件 | 覆盖脚本 | 状态 |
| --- | --- | --- | --- |
| `AILog` | CommandDevTest.java, ETIM.java, ETIMConfig.java … | f11-b60-smoke.js | COVERED |
| `ArrowLog` | ETIMBlockLog.java, ETIMDamageLog.java, ETIM.java … | - | GAP |
| `BatLog` | MixinEntityBat.java | - | GAP |
| `BatMobLog` | CommandDevTest.java, ETIMEntityNightwing.java, ETIMEntityVampireBat.java … | - | GAP |
| `BeastLog` | CommandDevTest.java, ETIMEntityDireWolf.java, ETIMEntityHellhound.java | f11-b61-smoke.js | COVERED |
| `BlockFaceLog` | CommandDevTest.java, ETIMBlockStacks.java, ETIMItemMaterialEvents.java | f11-b66-smoke.js | COVERED |
| `BlockLog` | ETIMBlockLog.java, ETIMGhost.java, CommandDevTest.java … | f17-reg-fourth.js | COVERED |
| `BoomLog` | CommandDevTest.java | f11-b67-smoke.js | COVERED |
| `ButchLog` | EnchantmentButchering.java, ETIMButchering.java, ETIMButcheringEvents.java … | f17-reg-fourth.js | COVERED |
| `CapLog` | ETIMConfig.java, CapLog.java | f17-reg-fourth.js | COVERED |
| `CraftingLog` | CommandDevTest.java, ETIMCrafting.java, ETIM.java … | f15-reg-chains.js | COVERED |
| `DamageLog` | ETIMBlockLog.java, ETIMDamageLog.java, ETIMMelee.java … | f14-reg-core.js | COVERED |
| `DeathLog` | ETIMDeathEvents.java, ETIMConfig.java | f15-reg-chains.js | COVERED |
| `DimLog` | CommandUnderworld.java, ETIM.java, ETIMConfig.java … | f17-reg-fourth.js | COVERED |
| `DropLog` | ETIMBlockDrops.java, MixinEntityLivingBase.java, ETIMMobDrops.java | f11-b67-smoke.js | COVERED |
| `ElementalLog` | CommandDevTest.java, MixinBlockStaticLiquid.java, MixinEntitySnowball.java … | f11-b62-smoke.js | COVERED |
| `EnchLog` | ETIMEnchantPool.java, ETIMConfig.java | - | GAP |
| `EnchantLog` | CommandDevTest.java, ETIMConfig.java, ETIMAnvilRepair.java … | f16-reg-third.js | COVERED |
| `EquipLog` | ETIM.java, ETIMConfig.java, ETIMGear.java … | f16-reg-third.js | COVERED |
| `ExplosionLog` | ETIMExplosion.java | f11-b67-smoke.js | COVERED |
| `FarmLog` | CommandDevTest.java, ETIMConfig.java, ETIMCompost.java … | f11-b68-smoke.js, f11-b69-smoke.js | COVERED |
| `FireLog` | ETIMFireSpreadRules.java | - | GAP |
| `FishLog` | CommandDevTest.java, ETIMConfig.java, ETIMFishing.java | f15-reg-chains.js | COVERED |
| `FoodLog` | CommandDevTest.java, ETIMConfig.java, ETIMEndurance.java … | f11-b58-smoke.js, f13-b70t9-smoke.js | COVERED |
| `FoodR196Log` | CommandDevTest.java, ETIMAppleGoldEvents.java, ETIMVesselEvents.java | f11-b65-smoke.js | COVERED |
| `FurnaceLog` | ETIMConfig.java, FurnaceHeat.java, ETIMBlocks.java … | f15-reg-chains.js | COVERED |
| `GelLog` | CommandDevTest.java, ETIMEntityCubic.java, ETIMEntityGelatinousCube.java … | f11-b58-smoke.js | COVERED |
| `HoeLog` | ETIMItemMattock.java, MixinItemHoe.java | f16-reg-third.js | COVERED |
| `IngestLog` | ETIMConfig.java, ETIMIngestibles.java, MixinBlock.java … | f15-reg-chains.js | COVERED |
| `ItemLog` | CommandDevTest.java, ETIMItemMelt.java, ETIMItemStacks.java … | f11-b64-smoke.js | COVERED |
| `MeleeLog` | ETIMMelee.java, ETIMConfig.java | f15-reg-chains.js | COVERED |
| `MiningLog` | ETIMConfig.java, ETIMMining.java, MixinItem.java … | f14-reg-core.js | COVERED |
| `MobLog` | ETIMConfig.java, ETIMArrowLog.java, ETIMEntityArachnid.java … | f17-reg-fourth.js | COVERED |
| `MountLog` | CommandDevTest.java, MixinBlockTorchFarmland.java, ETIMMountRules.java | f11-b69-smoke.js | COVERED |
| `OozeLog` | ETIMOozeSpawn.java | - | GAP |
| `OreLog` | ETIMConfig.java, ETIMOreGen.java | f15-reg-chains.js | COVERED |
| `PickupLog` | ETIMMobPickup.java | f16-reg-third.js | COVERED |
| `PoseLog` | CommandPose.java, GuiPoseTuner.java, PoseFileWatcher.java … | - | GAP |
| `RepairLog` | ETIMEntityAIMoveToRepairItem.java | - | GAP |
| `SilverLog` | CommandDevTest.java, MixinBlockSilverfish.java, MixinEntitySnowball.java … | f11-b63-smoke.js | COVERED |
| `SkillLog` | ClientNetworkHooks.java, CommandDevTest.java, CommandEtimSkill.java | f17-reg-fourth.js | COVERED |
| `SleepLog` | ETIMConfig.java, MixinEntityPlayer.java, ETIMDigging.java … | f16-reg-third.js | COVERED |
| `SoundLog` | ETIMSoundLog.java, ETIM.java, ETIMConfig.java | - | GAP |
| `SparkLog` | ETIMBlockSpark.java, ETIMSpecialBlocks.java | f11-b69-smoke.js | COVERED |
| `SpawnLog` | CommandDevTest.java, ETIMSpawnCycle.java, ETIMSpawnTables.java … | f11-b59-smoke.js, f11-b60-smoke.js, f11-b61-smoke.js, f11-b62-smoke.js, f12-b70t8-smoke.js | COVERED |
| `StalkerLog` | ETIMEntityAISeekLitTorch.java, ETIMEntityInvisibleStalker.java | f11-b60-smoke.js | COVERED |
| `SwingLog` | MixinItem.java | f16-reg-third.js | COVERED |
| `TestLog` | ETIMItemModels.java, CommandDevTest.java, TestDriver.java … | f14-reg-core.js | COVERED |
| `UndeadLog` | CommandDevTest.java, ETIMEntityGhoul.java, ETIMEntityShadow.java … | f11-b59-smoke.js, f11-b60-smoke.js | COVERED |
| `WeatherLog` | CommandDevTest.java, ETIMConfig.java, MixinWorldServer.java … | f16-reg-third.js | COVERED |
| `WorldGenSpawnLog` | CommandDevTest.java, MixinWorldEntitySpawner.java, ETIMWorldGenSpawning.java | f12-b70t8-smoke.js | COVERED |

## 缺口怎么读

- `GAP` 不代表功能坏，只代表「今天没有脚本能替你重跑它」。老批次结论只有当时的日志可查。
- 优先补的 GAP：共享代码改一次就会波及的子系统（伤害/属性、掉落、挖块、干旱、群系刷怪）。
- 新窗口上 harness 后重跑本工具，`GAP` 会自动减少，不需要手改本表。