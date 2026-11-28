# B-71 灌木 · 终审回执

## §0 复核源与文件行数

- 对照报告：`playground/audit/b-71-对照报告.md`，实测 44,769 B / 417 行（任务书写 43,913 B / 406 行为旧值）；`check-report-shape.js` EXIT=0，80 个锚点 missing=0、16 张表 bad rows=0、首字节 0x23、UTF-8、BOM=none、CR=0、FFFD=0。
- R196 一手：`mite-src/decompile/src/net/minecraft/` 下的 `BlockBush.java`（222 行）、`BlockGrowingPlant.java`（99 行）、`BlockPlant.java`（92 行）、`Block.java`、`BlockFarmland.java`、`BlockFire.java`、`ItemDye.java`、`Item.java`、`ItemFood.java`、`World.java`、`WorldServer.java`、`WorldGenPlants.java`（36 行）、`BiomeDecorator.java`、`BiomeGenForest.java`、`BlockBreakInfo.java`。
- 1.12 载体：`git-workspace/etim/build/rfg/minecraft-src/java/net/minecraft/` 下的 `block/BlockBush.java`、`block/BlockFarmland.java`、`block/Block.java`、`world/World.java`、`world/Explosion.java`、`item/ItemBlock.java`、`item/ItemDye.java`。
- ETIM 现码：`git-workspace/etim/src/main/java/io/github/etim/etim/` 下 `mixins/MixinBlockFarmland.java`（85 行）、`farm/ETIMFarmBlocks.java`（64 行）、`farm/ETIMFarm.java`（838 行）、`ETIMConfig.java`（1,611 行）、`commands/CommandDevTest.java`（3,776 行）。**`ETIMBlockBush.java`、`ETIMBushGen.java` 不在盘上**；本批为 NEW 面，A 项是「落码必须照此实现」的判据，不是既有实现缺陷。
- 行数勘误：报告 §0.3 的 `BlockBush.java` 222 行、`BlockPlant.java` 92 行、`BlockGrowingPlant.java` 99 行、`WorldGenPlants.java` 36 行均与实测一致；census 的 1-223 是 EOF 计法差。

## §1 逐条核讫表

| 条目 | 判 | 依据 |
|---|---|---|
| A-B-71-1 骨粉无效果 | **成立** | `BlockBush.java:128-150` 定义完整但 R196 全树无调用方；R196 `IGrowable` 零命中；1.12 `item/ItemDye.java:114-135` 仅 `instanceof IGrowable` 才 grow/shrink，非 IGrowable 返回 false 且不扣物。D-1 甲正确。 |
| A-B-71-2 放置门/存活门分离 | **成立（核心）** | 放置：`BlockBush.java:97-106`（biome + `canBlockSeeTheSky` + `super.canBePlacedAt`）；存活：`BlockPlant.java:44-48`（`super.isLegalAt && (见天 || 光8..15)`）、`:50-53`（grass/dirt/tilledField）、`:33-42`（`getFullBlockLightValue` 原始光）。1.12 落点 `block/BlockBush.java:44-48` 与 `:83-91` 分离正确。报告「禁止 getLight()」的 API 理由有误，见 B-B-71-8；不影响 A-2 核心。 |
| A-B-71-3 非法移除掉落表 | **成立** | `BlockPlant.java:55-63`：16 格无玩家→静默 air；有玩家→`Block.onNotLegal` `:1791-1799` 调 `dropBlockAsEntityItem`（不调 `dropBlockAsItself`）；`BlockBush.java:158-162` 只在有果且 `wasHarvestedByPlayer/wasSelfDropped/wasNotLegal` 时掉蓝莓。1.12 `block/BlockBush.java:74-81` 默认 `dropBlockAsItem` 掉本体，必须覆写 `checkAndDropBlock`。报告修法还需绕开 P-3 的 `getDrops` 无条件蓝莓，见 A-B-71-11。 |
| A-B-71-4 掉落物 meta 恒 12 | **成立** | `Block.java:2344-2346` `createStackedBlock → getItemSubtype(metadata)`；`BlockBush.java:50-52` `getItemSubtype = setBerryGrowth(subtype, 3)`，即 meta 12（`setBerryGrowth` 写 `<<2`，`3<<2=12`）。1.12 `getDrops` 必须写死 `new ItemStack(item,1,12)`。 |
| A-B-71-5 生长光门 API | **成立** | `BlockBush.java:196` `world.getBlockLightValue(x,y+1,z)`；`World.java:1391-1437` 用 `skylightSubtracted` 合并；`BlockGrowingPlant.java:86-96` min=max=15。1.12 `World.java:747-749` `getLightFromNeighbors` → `:752-799` 同样扣 `skylightSubtracted`，`!=15` 即拒。 |
| A-B-71-6 生长速率与温度门 | **成立** | `BlockBush.java:174-180` `0.1F * tempMod * humidityMod * global`；`BlockGrowingPlant.java:17-19` global=0.25；`:21-34` tempMod=`max(1-delta/1.0,0)`；`BlockBush.java:219-221` humidity=1.0；`BlockBush.java:209-216` 窗口 forestHills/forest = 0.7/0.7；`BlockBush.java:188` 有果早退、`:193` rate==0 早退。基线 rate=0.025。 |
| A-B-71-7 世界生成参数 | **部分成立** | 数值逐项属实：`BiomeGenForest.java:12` tenths=2；`BiomeDecorator.java:252-253` 20% 1 patch；`:255-261` `x=chunk+rand(16)+8`、`y=rand(128)`、`z` 同、`setMetadata(berries)`；`WorldGenPlants.java:15` attempts=`getPatchSize`=64（`BlockBush.java:109-111`）；`:18-27` ±8/±4、`placements>3 && rand(3)==0`、meta 12。**但** `canOccurAt` 不是报告 P-4/§5-5 写的「air+biome+sky」三件套，见 A-B-71-10。 |
| A-B-71-8 耕地互斥 | **成立（核心）** | R196 `BlockFarmland.java:132-141` 上方 `BlockBush` ⇒ `isLegalAt=false`；`:143-146` `onNotLegal → dirt`。1.12 `block/BlockFarmland.java:128-141` `neighborChanged` 只判 `material.isSolid()`，植物不触发；`updateTick :63-82` 用 `hasCrops`，灌木 `IPlantable` 会被当作物。ETIM 现役 `MixinBlockFarmland.java:46-89` 在 `updateTick` HEAD 全量取消并只做水分，**没有 bush 臂、没有 neighborChanged**；`ETIMFarm.cropsNearbyR196 :293-304` 只认作物/stem/蘑菇，不认灌木，且 `world.isAirBlock(pos.up())` 对灌木为 false ⇒ 当前不会把耕地变 dirt。必须补两臂。报告「绕开 hasCrops」在 Mixin 全量取消 updateTick 后并非必需，见 B-B-71-9。 |
| A-B-71-9 碰撞箱 | **成立** | R196 `BlockBush.java:10-15` `(0.2,0,0.2,0.8,0.6,0.8)`；1.12 `block/BlockBush.java:22` `BUSH_AABB (0.3,0,0.3,0.7,0.6,0.7)` ⇒ 必须覆写 `getBoundingBox`。 |
| A-B-71-10 世界生成 `canOccurAt` 缺土壤/光照门（终审新增） | **成立，blocking** | `WorldGenPlants.java:22` 调 `block.canOccurAt(...)`；`Block.java:2239-2241` `canOccurAt = air && canBePlacedAt`；`:2232-2236` `canBePlacedAt` 调 `isLegalAt`；`BlockPlant.java:44-53` `isLegalAt` 含 `isLegalOn`（grass/dirt/tilledField）与光臂。报告 P-4/§5-5 的 `canOccurAt` 只写 air+biome+sky，**漏掉下方土壤与存活光**，照此落码会在空中/石头上方随机 y 生成悬空灌木。修法见 §2.10。 |
| A-B-71-11 `getDrops` 无条件蓝莓导致爆炸掉落（终审新增，C-B-71-3 升级） | **成立，blocking** | R196 `BlockBush.java:158-162` 蓝莓只在 `wasHarvestedByPlayer‖wasSelfDropped‖wasNotLegal`；爆炸 reason 不在其中。1.12 `Explosion.java:239` 调 `block.dropBlockAsItemWithChance(...)`；`Block.java:788-792` 该路径直接吃 `getDrops`；报告 P-3 的 `getDrops` 在 growth=3 时无条件加蓝莓 ⇒ 爆炸会掉蓝莓，与 R196 相反。C-B-71-3「自然等价」不成立，必须改掉落分工（§2.11）。 |
| B-B-71-1 `[BushLog]` 通道 | 成立，非阻断 | W1/W2/W3/W4/W6 字段够用；`ETIMFarm.bushRow` 仿 `ETIMFarm.row` 可行；`farmDebugLog` 现成（`ETIMConfig.java:529`、`:1353`）。需注意 `[BushLog] registered` 的 static 行是否受 debug 闸控制，建议与 W1 一次性输出。 |
| B-B-71-2 `/etest bushprobe` | 成立，非阻断 | `CommandDevTest.java:199-201` 现有 `blockprobe`；新增 `bushprobe` 输出 growth/hasBerries/light(合并)/rate/biome/sky 是必要判据。 |
| B-B-71-3 回归窗口 | 成立，非阻断 | `MixinBlockFarmland` 新增 bush 臂会动 `f11-b68-smoke.js`（FarmLog 水分）；`REGRESSION.md` 是生成物，必须 `node testharness/tools/regression-plan.js` 重生成并加 `f11-b71-smoke.js`；`f11-b69-smoke.js` 不受影响。 |
| B-B-71-4 摸底 `getHeight` 失实 | 成立，非阻断 | `WorldGenPlants.java:19-22` + `BiomeDecorator.java:257` 是 `y=rand(128)`，不是 `getHeight`；按 getHeight 落码会改变密度与位置。 |
| B-B-71-5 群系门口径 | 成立，非阻断 | D-3 甲只认 `Biomes.FOREST` / `FOREST_HILLS`；`MUTATED_FOREST` / `MUTATED_FOREST_HILLS` 不放行；已裁定。 |
| B-B-71-6 生成 RNG 只能统计验收 | 成立，非阻断 | `PopulateChunkEvent.Post` 在装饰之后，与 R196 装饰序列中段不同；同种子不能逐点重合，只能验 chunk 级 patch 率≈20%、群系内分布、y 平坦。 |
| B-B-71-7 census 口径 | 成立，非阻断 | F:125 已存在，新增面=0，总数 733 不变；骨粉死码只作注记，不改判值表结构。 |
| B-B-71-8 `getLight()` API 说法有误（终审新增） | 成立，非阻断 | 1.12 `World.java:730-744` `getLight(pos)` 用 `getLightSubtracted(pos, 0)`，**是原始亮度、不扣时段**；只有 `getLightFromNeighbors`（`:747-749` → `:752-799`）扣 `skylightSubtracted`。报告 A-2/A-B-71-2 把两者并列说成「二者扣了」，失实；推荐 `getLightFor(SKY/BLOCK)` 取大仍正确，但理由应改为「raw 值等价且避免误用邻居版本」。 |
| B-B-71-9 `hasCrops` 顾虑不成立（终审新增） | 成立，非阻断 | 1.12 `BlockFarmland.hasCrops` 是 private，只被 `updateTick :73` 调用；ETIM `MixinBlockFarmland.java:46-89` 已在 HEAD 全量取消 `updateTick`，`hasCrops` 不会执行。A-8 的核心是 `updateTick`/`neighborChanged` 的 bush 臂，不需要把「绕开 hasCrops」当独立修法。 |
| C-B-71-1 贴图四阶 | 可接受 | R196 两套图（有果/已采），MITE-RB 四阶 `blueberry_stage0..3`；D-3 甲已裁，四阶可见进度更强，记差异不返工。 |
| C-B-71-2 踩踏本批不落 | 可接受 | R196 入口只在 `BlockFarmland.java:67-89` 与 `BlockGrass.java:203-225`；1.12 无草方块踩踏计数，耕地+灌木瞬态；D-2 甲已裁，挂草方块踩踏批。 |
| C-B-71-3 爆炸掉落 | **升级 A-B-71-11** | `Explosion.java:239` → `Block.dropBlockAsItemWithChance` → `getDrops`；报告 P-3 的 `getDrops` 无条件蓝莓，会导致爆炸掉蓝莓，与 R196 `BlockBush.java:158-162` 相反。不能按「自然等价」放过。 |
| C-B-71-4 创造采摘清果 | 可接受 | R196 `BlockBush.onBlockActivated :114-126` 无创造门；1.12 照做即 parity，记说明。 |
| C-B-71-5 堆叠 8 承载位 | 可接受 | R196 在 `BlockGrowingPlant.java:4-7`；1.12 方块无堆叠属性，迁到 `ItemBlock.setMaxStackSize(8)`，机制迁移非行为差异。 |
| C-B-71-6 `setPlantProduct()` | 可接受 | 1.12 无对位；ETIM 粪/堆肥获取面在 B-68 挂账，随堆肥批。 |

## §2 修法与残余

### 2.1 A-B-71-2 的两门（含 B-B-71-8 口径修正）

- 放置门覆写 `canPlaceBlockAt`：`biome == FOREST || FOREST_HILLS`、`world.canSeeSky(pos)`、`super.canPlaceBlockAt`（1.12 的 super 已含目标可替换 + 土壤 `canSustainPlant`）。
- 存活门覆写 `canBlockStay`：`super.canBlockStay`（土壤）+「`world.canSeeSky(pos)` 或 **raw** 光 8..15」；raw 光用 `Math.max(world.getLightFor(EnumSkyBlock.SKY,pos), world.getLightFor(EnumSkyBlock.BLOCK,pos))`，**不要**用 `getLightFromNeighbors`。`getLight()` 虽也是 raw，但报告原文的禁止理由错误，见 B-B-71-8；落码统一用 `getLightFor` 以免歧义。
- 群系门只进放置/生成，不进 `canBlockStay`；否则命令/结构放置的灌木会秒删。

### 2.2 A-B-71-3 的非法移除

- 覆写 `checkAndDropBlock`：`!canBlockStay` 时，若 `world.getClosestPlayer(pos,16)` 为 null → 直接 air、零掉落；否则只掉蓝莓（有果时），**不掉本体**，再 air。
- 不能复用 1.12 默认 `dropBlockAsItem`；它会走 `getDrops` 掉本体。与 A-11 的掉落分工合并实现。

### 2.3 A-B-71-4 的 meta

- `getDrops` 里灌木本体 `new ItemStack(Item.getItemFromBlock(this), 1, 12)`；`12 = 3 << 2`，与 R196 `getItemSubtype` 同值。
- 不要用 `state` 的 growth 直接当 meta；否则 0..3 会掉错形态。

### 2.4 A-B-71-5/A-6 的生长

- `updateTick` 先 `super.updateTick`（1.12 `checkAndDropBlock`），再回查方块是否还在；`growth>=3` 早退、`rate<=0` 早退；`world.getLightFromNeighbors(pos.up()) != 15` 拒；`rand.nextFloat() < rate` 时 `GROWTH+1`，flag 2。
- `growthRate = 0.1F * tempMod * 1.0F * 0.25F`；`tempMod = max(1 - delta/1.0, 0)`；`delta = max(0.7 - temp, temp - 0.7)`；基线 0.025。玩家倍率只乘最终 rate（`bushGrowthRateMultiplier`）。

### 2.5 A-B-71-7/A-10 的世界生成

- 生成器按 `PopulateChunkEvent.Post`：`tenths=2` → `patches=2/10 + (rand(10)<2 ?1:0)`；每 patch `x=chunkX*16+rand(16)+8`、`y=rand(128)`、`z` 同；64 次尝试，`±rand(8)/±rand(4)/±rand(8)`；成功后 `placements++`，`placements>3 && rand(3)==0` 收手；state 固定带果（meta 12）。
- **A-10 必须补**：`canOccurAt` 不能只判 air+biome+sky。至少：
  - `world.isAirBlock(pos)`；
  - `(biome == FOREST || biome == FOREST_HILLS)`；
  - `world.canSeeSky(pos)`；
  - `BUSH.canPlaceBlockAt(world,pos)`（super 含目标可替换 + 土壤）；
  - `BUSH.canBlockStay(world,pos,state)`（土壤 + raw 光，防暗处/悬空）。
- 仅用 `world.isAirBlock` 会在随机 y 的空中生成悬空灌木；这是本次终审的 blocking 项。

### 2.6 A-B-71-8 的耕地两臂

- `MixinBlockFarmland.updateTick` HEAD：在现有水分分支之前，先判 `world.getBlockState(pos.up()).getBlock() instanceof BlockBush`；命中则 `turnToDirt` + `[FarmLog] moisture decay ... src=bush-above → dirt` + `ci.cancel()`，不再走水分。
- 新增 `neighborChanged` TAIL：同样判上方 `BlockBush`；命中 `turnToDirt`。1.12 原生 `neighborChanged :133-141` 只判 `material.isSolid`，植物不会触发，故必须补。
- `ETIMFarm.cropsNearbyR196` 保持只认作物/stem/蘑菇，不把灌木算作物；B-9 说明 `hasCrops` 在 Mixin 全量取消 updateTick 后不再执行，不需要额外改。
- 该臂会改变 B-68 FarmLog 的耕地水分窗口，必须按 B-3 复跑 `f11-b68-smoke.js`。

### 2.7 A-B-71-11 的掉落分工（含 C-3 升级）

- `getDrops` 只返回灌木本体（meta 12），**绝不加蓝莓**；这样 `Explosion.java:239` 的 `dropBlockAsItemWithChance` 只会掉本体，与 R196 爆炸一致。
- 蓝莓从三条活路补：
  1. `onBlockActivated` 右键采摘（有果 → 掉蓝莓 + growth=0）；
  2. `checkAndDropBlock` 非法移除且 16 格内有玩家（有果 → 只掉蓝莓，不掉本体）；
  3. `harvestBlock` 玩家采掘（有果 → 掉蓝莓；本体由 `getDrops` 掉）。
- 若不想拆 `harvestBlock`，可用 `onBlockHarvested` 的玩家/self/illegal 旗标控制；**不要**用 `getDrops` 的 `fortune` 猜 reason。

### 2.8 A-B-71-9 的碰撞箱

- `getBoundingBox` 返回 `(0.2,0,0.2,0.8,0.6,0.8)`；1.12 `BUSH_AABB` 是 0.3..0.7，必须覆写；`collision` 保持 null（继承）。

### 2.9 其他非阻断

- B-1 `[BushLog]`：W1 静态行建议一次性输出 `registered block=etim:bush hardness=0.05 sound=plant stack=8 fire=30/50 box=0.2,0,0.2,0.8,0.6,0.8 [server]`；W2/W2'/W3/W3'/W4/W6 按报告 §6 字段，`bushDebugLog` 关时静默。
- B-2 `bushprobe`：输出 growth/hasBerries/light(合并)/rate/biome/sky，执行体仿 `CommandDevTest.java:961+` 的 `executeBlockProbe`。
- B-3：`REGRESSION.md` 由 `node testharness/tools/regression-plan.js` 重生成，新增 `f11-b71-smoke.js`；`f11-b68-smoke.js` 必跑，`f11-b69-smoke.js` 不动。
- B-4/B-5/B-6/B-7：按报告执行；B-4 是「不要 getHeight」的提醒，B-5 已由 D-3 裁定，B-6 只做统计验收，B-7 只注记 census。
- B-8：报告 A-2 的 `getLight()` 说法改正为「getLight() 是 raw；getLightFromNeighbors() 才扣时段」；落码统一 `getLightFor`。
- B-9：`hasCrops` 不是 A-8 的修法对象；Mixin 已全量取消 `updateTick`。

## §3 终判

**退回：A-B-71-10（世界生成 `canOccurAt` 缺土壤/光照门，会悬空生成）、A-B-71-11（`getDrops` 无条件蓝莓，爆炸也掉；R196 只在玩家采掘/自落/非法时掉）。** 其余 A-1..A-9 主体成立；B-8/B-9、C-1/C-2/C-4/C-5/C-6 为非阻断注记；C-3 升级 A-11。
