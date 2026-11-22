# B-69 火花 + 挂载 判决链终审回执

- 发出者：会话五（ETIM 终审）
- 接受者：主会话（ETIM 开发）
- 生成时间：2026-11-22 17:04
- 被审：`playground/audit/spark-mounted-对照报告.md`（348 行 / 46,513 B，终判 DIFF A=6/B=6/C=9）
- 落盘：`git-workspace/etim/testharness/reports/b69-final-audit.md`

## §0 判决源与文件行数

### 0.1 判决源

- R196 一手：`mite-src/decompile/src/net/minecraft/`（BlockSpark、BlockMounted、BlockFire、ItemFlintAndSteel、Block、BlockTorch、BlockSkull、BlockLever、BlockButton、BlockTripWireSource、BlockTrapDoor、BlockDoor、BlockSign、BlockDropper、BlockStairs、BlockSlab、BlockSnow、BlockEnchantmentTable、BlockFarmland、BlockPistonBase、BlockConstants）。
- 1.12 正源：`git-workspace/etim/build/rfg/minecraft-src/java/net/minecraft/`（block/BlockFire、block/BlockTNT、item/ItemFlintAndSteel、world/World、block/BlockTorch、block/BlockFarmland、block/BlockFence、block/BlockWall、block/BlockStairs、block/BlockSlab、block/BlockSnow、block/BlockEnchantmentTable、block/BlockTrapDoor、block/BlockLadder、block/BlockCocoa、block/BlockSkull、block/BlockDropper、block/BlockPistonBase、item/ItemSign、block/BlockSign、block/BlockStandingSign、block/BlockWallSign、block/BlockDoor、block/BlockConstants）。
- 字节码交叉：`javap -v` 直接读 `build/libs/etim-1.0.0.jar` 与 `build/resources/main/mixins.etim.refmap.json`；`javap -p -s` 对比 `recompiled_minecraft-1.12.2.jar` 与 `srg_merged_minecraft.jar`。
- 判窗正本：`git-workspace/etim/testharness/reports/b69-verify-receipt.md`（71 行 / 7,734 B，PASS A=0/B=0/C=8）。
- 判窗日志：`git-workspace/etim/testharness/build-logs/b69-b69r5-b1.out`（3,468 行 / 504,287 B）。

### 0.2 文件行数（Read 末行号口径）

| 文件 | 行数 | 字节 |
|---|---:|---:|
| `playground/audit/spark-mounted-对照报告.md` | 348 | 46,513 |
| `testharness/reports/b69-verify-receipt.md` | 71 | 7,734 |
| `testharness/build-logs/b69-b69r5-b1.out` | 3,468 | 504,287 |
| R196 `BlockSpark.java` | 53 | - |
| R196 `BlockMounted.java` | 114 | - |
| R196 `BlockFire.java` | 338 | - |
| R196 `ItemFlintAndSteel.java` | 101 | - |
| R196 `Block.java` | 2,972 | - |
| 1.12 `BlockFire.java` | 504 | - |
| 1.12 `ItemFlintAndSteel.java` | 55 | - |
| 1.12 `BlockTNT.java` | 153 | - |
| 1.12 `World.java` | 3,806 | - |
| 1.12 `BlockTorch.java` | 341 | - |
| 1.12 `BlockFarmland.java` | 198 | - |

报告 §0.1 的 `BlockSpark 53` / `BlockMounted 114` 与 Read 末行号一致；census 写的 `1-54` / `1-115` 是 EOF 计法差，不判错。PowerShell 非空行计数为 43 / 96，差异来自空行。

### 0.3 开审机械检查与排除项

- `node .opencode\skills\etim-mapping\scripts\report-check.js playground\audit\spark-mounted-对照报告.md`：EXIT=0；bytes 46513 / lines 348 / firstByte `0x23` / utf8 ok / bom none / cr 0 / fffd 0 / tick 0 / cross 0 / anchors 93（missing 0）/ tables 8（bad rows 0）/ OK。输出落 `git-workspace/etim/build-logs/b69-report-check.txt`。
- `MixinBlockTorchFarmland.java:36` 的 `remap = false` 曾疑为生产注入失效；经 1.12 `block/Block.java:1309`（FORGE START）至 `:2689`（FORGE END）确认 `canPlaceTorchOnTop`（`:1919-1934`）是 Forge 新增方法，生产 SRG 运行时保留字面名；`javap -p -s` 显示 `recompiled_minecraft-1.12.2.jar` 有该方法、`srg_merged_minecraft.jar` 无，`mixins.etim.refmap.json`（112 键）无该条目属预期。该项不计冲突。
- `BlockPistonBase` 确实覆写 `isFullCube=false`（`:301-304`）；报告 §0.2 引 `:157` 是 `getStateForPlacement`，属行号误引，不是语义错误。

## §1 逐条核讫表

> 「成立」只表示报告的事实主张与双源相符，不表示其修法可直接照抄；修法阻断见 §3。

| 编号 | 报告主张 | 源码核对（file:line） | 结论 | 说明 |
|---|---|---|---|---|
| A-1 | 打火石目标位非空气仍扣耐久 | R196 `ItemFlintAndSteel.java:82-90`（非空气门在 `:83-85` 的 else 臂），`:92-97` 扣耐久；1.12 `ItemFlintAndSteel.java:40-44` 只在空气时放火，`:51` 无条件 `damageItem(1)`；ETIM `MixinItemFlintAndSteel.java:34-45` 只 Redirect `setBlockState` | 成立 | 报告引 R196 `:70-76` 是 `rc` 空/非方块判定，不是非空气门；应改 `:82-90`。修法落点另有 B-B69-6。 |
| A-2 | 站立牌缺挂载判定，可悬空 | R196 `BlockSign.java:5` `isFreestanding`、`:72-96` `getFaceMountedTo`；1.12 `ItemSign.java:31-86` 完全不调 `World.mayPlace`，`:41` 调 `Blocks.STANDING_SIGN.canPlaceBlockAt`，`:49`、`:51-58` 直写方块；`BlockStandingSign.java:26-35` 只判下方 `Material.isSolid`；ETIM `ETIMMountRules.java:64-74` 无 `BlockStandingSign`，`MixinWorldMayPlace.java:35-47` 对牌不触发 | 成立 | 现象成立，且**墙牌同样绕过**；报告修法（`isMountedBlock` 加 `BlockStandingSign`）无效，见 A-B69-1。 |
| A-3 | 投掷器（dropper）前脸漏判，只判了发射器 | R196 `BlockDropper.java:3` `extends BlockDispenser`；1.12 `BlockDropper.java:15` `extends BlockDispenser`，无 `getBlockFaceShape` 覆写、`FACING` 继承；ETIM `ETIMMountRules.java:126-138` 只判 `Blocks.DISPENSER` | 成立 | 修法只需补 `block == Blocks.DROPPER` 分支。 |
| A-4 | `!support.isFullCube()` 抹掉逐面信息，造成 7 组误杀 | R196 `BlockMounted.java:22-39`、`BlockTorch.java:135-166`、`BlockSkull.java:57-73`、`BlockTrapDoor.java:162-193`、`BlockStairs.java:365-387`、`BlockSlab.java:83-86`、`BlockSnow.java:153-157`、`BlockEnchantmentTable.java:94-97`；1.12 `Block.java:1417-1468`、`:610-613`、`BlockTorch.java:120-139`、`BlockTrapDoor.java:196-199`、`BlockStairs.java:254-287`、`BlockSlab.java:81-95`、`BlockSnow.java:78-81`、`BlockEnchantmentTable.java:172-175`；ETIM `ETIMMountRules.java:106-110` | 成立（group 7 玻璃子项撤销；另有反向过放） | 主体成立；group 7 的玻璃/雪块子项不成立，见 B-B69-1。`!isFullCube` 对满方块 neverHides（刷怪笼）反向漏判，见 A-B69-4；逐面修法另有 A-B69-2、B-B69-5。 |
| A-5 | 火花邻位下界岩不算燃料 | R196 `BlockFire.java:259-263` 下界岩恒可燃；`BlockSpark.java:29-37` 下方下界岩是额外 OR；1.12 `BlockFire.java:64-70` 火表无下界岩、`:326-337` `canNeighborCatchFire` 只查火表；ETIM `ETIMBlockSpark.java:86-102` 只补下方下界岩，`:111-119` 用 `BlockFire.canCatchFire` | 成立 | 修法：`canNeighborBurn` 每个邻位加 `state.getBlock() == Blocks.NETHERRACK`。 |
| A-6 | 材料门整层缺失 | R196 `BlockButton.java:37-54`、`BlockLever.java:30-45`、`BlockTripWireSource.java:249-254`、`BlockTrapDoor.java:162-193` + `BlockDoor.java:307-318`；ETIM `ETIMMountRules.java:88-115` 无材质分派 | 成立（覆盖不全） | 报告只列按钮/拉杆/绊线钩，漏活板门；活板门材料门缺失见 A-B69-3。 |
| B-1 | 打火石耐久 64 vs R196 16 | R196 `ItemFlintAndSteel.java:7-8`（maxStack 1 / maxDamage 16）；1.12 `ItemFlintAndSteel.java:22` `setMaxDamage(64)`；ETIM 无自有 `ItemFlintAndSteel` 源 | 成立 | D-2 落码面不是 ETIM 源一行，见 B-B69-4。 |
| B-2 | `ETIMMountRules` javadoc 行号漂移 | ETIM `ETIMMountRules.java:28` 引 `BlockMounted.java:18-40`，实际 `:22-39`；`:35` 引 `:20-21`，实际 `:23-24`；`:36` 引 `:22-24`，实际 `:25-26`；`:37-38` 引 `:25-28`，实际 `:27-31`；`:39` 引 `:29-31`，实际 `:32-33`；`:40` 引 `:33-34`、`:41` 引 `:36-37`，两者实际同在 `:35-37`；`:125` 引 `:29-31`，实际 `:32-33` | 成立 | 语义未变，纯注释锚点漂移。 |
| B-3 | 「neverHides ⇔ 非满方块」映射失实 | R196 `BlockConstants.java:40-43` 的 `setUsesAlphaBlending` 转调 `setNeverHidesAdjacentFaces`；`Block.java:1132`、`:1775-1777`；grep 38 命中/37 文件，36 个直接置位类 + `BlockIce.java:7`、`BlockPortal.java:14` 传递 = 38 个方块类；slab/stairs/snow/piston/enchantmentTable/farmland 均不在列；满方块 `BlockMobSpawner.java:5` 也在 neverHides 列；ETIM `ETIMMountRules.java:44-51` 写「non-full-cube family」并列入 slabs，失实 | 成立 | 38 类口径应按「36 直接 + Ice/Portal 传递」说明；`isSideSolid` 也不是 R196 的 `isFaceFlatAndSolid`；neverHides 不是「非满方块」的同义词（刷怪笼为满方块反例）。 |
| B-4 | `ETIMBlockSpark` javadoc 行号漂移 | ETIM `ETIMBlockSpark.java:20` 引 `BlockSpark.java:1-54`（文件 53 行）；`:25` 引 `:21-27`，实际 `:21-26`；`:27` 引 `:30-52`，实际 `:28-37`；`:33-40` 把 pop 臂与 `canPlaceBlockAt` 合并解释 | 成立 | 语义未变，纯注释锚点漂移。 |
| B-5 | 判行锚缺 `block=` 与 `mayplace` 行 | ETIM `ETIMMountRules.java:117-120` 只有 `rule/face/support/result/pos`，`support` 实际是支撑方块；无 `[MountLog] mayplace`；`MixinBlockTorchFarmland.java:43-45` 有 `block=torch` 但无 `face=` | 成立 | 需补挂载物 `block=` 与 `mayplace` 行，否则无法区分「谁被拒」。 |
| B-6 | `MixinBlockFire` 面外链归因 | `MixinBlockFire.java:32-43` 的 `@Redirect` 事实成立，但报告 §5 已明确排除该面；本批只共用 `ETIMBlockPortal.tryToCreatePortal` | 不成立（降 C 注记） | 不是冲突；有效 B 计数应为 5。 |
| C-1 | AGE 16 段 | R196 `BlockSpark.java:16-19` metadata==0；1.12 `BlockFire.java:31` AGE 0..15；`blockstates/spark.json` 669 B / 16 个 age 变体；ETIM `ETIMBlockSpark.java:73-102`、`MixinItemFlintAndSteel.java:40-45` 只写默认态 | 成立 | 不建议收窄；1.12 载体保留 16 段即可。 |
| C-2 | `mayPlace` 比 R196 更宽，但只否决 | 1.12 `World.java:3425-3443` 是 `ItemBlock.onItemUse` 与 `canPlaceBlockOnSide` 的收口；ETIM `MixinWorldMayPlace.java:35-47` 只 `setReturnValue(false)`，无放行分支 | 成立 | 更宽的面会在 A-4 修法中放大；不是本批新增缺陷。 |
| C-3 | 传送门由 `ETIMBlockPortal` 承担 | `ETIMBlockPortal.java:177-220` 的 `tryToCreatePortal`；`MixinBlockFire.java:32-43` 把原版火入口接到同一方法 | 成立 | 报告 `ETIMBlockPortal :177` 引用准确。 |
| C-4 | 耕地面只放宽火把 | R196 `BlockMounted.java:23-24` 对 10 子类全生效；ETIM `MixinBlockTorchFarmland.java:36-48` 只显式放火把；1.12 原生 Ladder/Lever/Button/TripWireHook 在 farmland 面 `faceShape` 非 SOLID 而拒，牌/骷髅/活板门原生可放，可可会掉 | 成立（措辞注记） | 「8/9 类未放宽」不精确：实际仍被原生拒的是梯子/拉杆/按钮/绊线钩 4 类；见 C-B69-1。D-5 已裁例外，不重开。 |
| C-5 | 梯子比 R196 严 | R196 `BlockLadder.java:56-77` 只有 `getFaceMountedTo`，无 `canMountToBlock` 覆写；1.12 `BlockLadder.java:77-95` 只走四水平面，`:97-102` 要求 `!isExceptBlockForAttachWithPiston` + `faceShape==SOLID` + `!canProvidePower`；ETIM `ETIMMountRules.java:64-74` 纳入梯子 | 成立（措辞注记） | 主要「更严」来自 A-4 的 `isFullCube` 门；A-4 修后只剩 1.12 原生侧贴/红石门。报告「改它要重写梯子放置」过重，见 C-B69-2。 |
| C-6 | 可可放置期不判 | R196 `BlockCocoa.java:107-110` 拒非丛林原木；1.12 `BlockCocoa.java:59-64` 只 `canBlockStay`，`:154-157` 邻变下一 tick 掉，无放置门 | 成立 | 1.12 的「先放后掉」是载体差异；D-5 不重开。 |
| C-7 | 可燃表来源不同 | R196 `BlockFire.java:265-268` `chanceToEncourageFire`；1.12 `BlockFire.java:64-70` `setFireInfo`；ETIM `ETIMBlockSpark.java:111-119` 用 `BlockFire.canCatchFire` | 成立 | 属载体表差异，不是本批新增。 |
| C-8 | 活塞伸出态侧面 1.12 原生拒 | R196 `BlockMounted.java:32-33` 只排前脸；1.12 `BlockPistonBase.java:518-522` `FACING != face.getOpposite() && EXTENDED ? UNDEFINED : SOLID`；ETIM 沿用 1.12 | 成立 | 报告引 `:515-519`，实际 `:518-522`，尾差 3。 |
| C-9 | 活塞前脸/收回态侧面/拉杆轴对齐全拒 | R196 `BlockTorch.java:161-164` 允许活塞前脸，`BlockLever.java:39-42` 只拒侧面且轴对齐；1.12 `Block.java:366-369` `isExceptBlockForAttachWithPiston` 整类拒；ETIM 沿用 1.12 | 成立 | D-5 已裁「全拒」，不重开。 |

### 1.1 六对位点复核

| 对位点 | 报告定级 | 终审定级 | 依据 |
|---|---|---|---|
| AGE 16 段 | C | C | C-1；`spark.json` 16 段 / 669 B。 |
| 打火石非空气仍扣耐久 | A | A | A-1；R196 `:82-90`，1.12 `:51`。 |
| TNT 分支 | 一致 | 一致 | R196 `:78-81` + `BlockTNT.java:52-56`；1.12 `BlockTNT.java:101-125`、`:85-96`；`EntityTNTPrimed` fuse=80。 |
| 耕地面只放宽火把 | C | C | C-4；D-5 例外，不重开。 |
| 10 子类覆盖 | A | A | A-2/A-3/A-4/A-6；A-4 另有 A-B69-4 反向过放；其中 A-2/A-6 修法需补强。 |
| `mayPlace` 更宽 | C | C | C-2；只否决，无放行。 |

### 1.2 §0.1 行数勘误

`BlockSpark.java` 53 行、`BlockMounted.java` 114 行属实；报告 `§0.1` 的 53/114 与 Read 末行号一致。census 的 `1-54` / `1-115` 是 EOF 计法，差 1 行，不判错。

## §2 A-4 七组修后期望

1. 栅栏/地狱栅栏/圆石墙顶：火把、骷髅**允许**；其他挂载物仍拒（R196 `neverHides` 基类臂）。
2. 羊毛：火把、骷髅**允许**；其他挂载物仍拒（R196 `material == cloth` 基类臂）。
3. 楼梯靠背：直梯/内角楼梯的朝向面**允许**；外角（`OUTER_*`）1.12 `faceShape` 全水平面 UNDEFINED，R196 仍允许朝向面，属 1.12 载体差（C 级）；至少不能因 `isFullCube` 再全拒。
4. 单 slab：**TOP slab 的 UP / BOTTOM slab 的 DOWN 允许**；另一面仍拒。
5. 厚雪底面：**depth > 1 的 DOWN 允许，depth == 1 仍拒**；最大层顶面 R196 允许，但 1.12 `faceShape` 顶面 UNDEFINED，属 C 级载体差，若要 parity 需显式臂。
6. 附魔台底面：**DOWN 允许**，其他面仍拒。
7. 活板门：**slab/stairs/雪层（depth > 2，按活板门上下半匹配）允许；玻璃、雪块、dirt/grass/sand/clay/pumpkin/craftedSnow 仍拒**（R196 `BlockDoor.isSuitableMaterialForAttachingHingesTo` 材料门）。报告把玻璃/雪块算作「R196 允许、ETIM 误杀」，事实错误：玻璃 R196 拒且 ETIM 当前也拒；雪块 R196 拒而 ETIM 当前因满方块反而放。见 B-B69-1。

## §3 冲突分级（终审新增）

> D-1..D-4 甲方向不重开；以下只针对「按报告字面改码」的落点缺口。

### 3.1 A 级

| 编号 | 冲突 | 证据 | 建议改法 |
|---|---|---|---|
| A-B69-1 | A-2 修法不成立：两类牌均绕过 `World.mayPlace`，只加 `BlockStandingSign` 到 `isMountedBlock` 不会生效；墙牌也继续悬空 | `ItemSign.java:31-86` 无 `mayPlace` 调用，`:41` 只调 `StandingSign.canPlaceBlockAt`，`:49`、`:51-58` 直写方块；`MixinWorldMayPlace.java:35-47` 对两类牌不触发；`ETIMMountRules.java:64-74` 的 `BlockWallSign` 是死码 | 挂 `ItemSign.onItemUse`：`flag = clicked.isReplaceable`；`target = flag ? clicked.offset(facing).down() : clicked.offset(facing)`；`support = target.offset(facing.getOpposite())`；对 standing/wall 两类都跑 R196 禁止项；或 `@Redirect` 两个 `setBlockState`。 |
| A-B69-2 | A-4 修法口径不闭合：`rejectsPlacement(World, BlockPos, EnumFacing)` 拿不到挂载物类型，torch/skull/trapdoor/lever/button 无法分流；只删 `!isFullCube` 会丢 `neverHides` 禁止（满方块刷怪笼上的拉杆/按钮/火把会被 1.12 原生放行；玻璃/栅栏/墙/箱子因 1.12 面型或例外表原生已拒，不是过放例），只换 `isSideSolid` 会继续误拒雪层/附魔台底面；`getBlockFaceShape` 又与 R196 的 stairs shape / snow depth 不同构 | `ETIMMountRules.java:81-123` 只收 `world/pos/face`；`BlockMounted.java:22-39` 的基类臂先 `neverHides`；1.12 `Block.java:1417-1468`、`BlockStairs.java:254-287`、`BlockSnow.java:78-81` | 规则引擎增加 `Block mounted` 参数，按 R196 子类顺序先放行臂（torch/skull、trapdoor、lever/button/tripwire），再 leaves/cloth/sponge/jukebox/front/neverHides；通用几何交给 vanilla `canPlaceBlockOnSide`；不要用 `isSideSolid` 或 blanket `isFullCube`。 |
| A-B69-3 | A-6 漏活板门材料门：ETIM 对 dirt/grass/sand/clay/pumpkin/craftedSnow 过宽；若先按 A-4 删 `!isFullCube`，玻璃会从「误拒」转为「误放」，雪层会从「全拒」转为「全放」（含 depth<=2，R196 只允许 depth>2） | R196 `BlockTrapDoor.java:164` + `BlockDoor.java:307-318` 排除 dirt/grass/sand/clay/leaves/craftedSnow/cloth/pumpkin/sponge/glass；ETIM `ETIMMountRules.java:88-115` 只显式拒 leaves/cloth/sponge，满方块支撑走 `isSideSolid` 放行 | 把 trapdoor 纳入材料门（含 `isSuitableMaterialForAttachingHingesTo` 全部排除项），并且**先加材料门、再删 `isFullCube`**；之后再走 slab/stairs/雪层（depth>2）放行臂。雪块（craftedSnow）当前已因满方块被过放，不是删门后才出现。 |
| A-B69-4 | 满方块 neverHides 支撑（刷怪笼）当前过放：`!isFullCube` 代理漏掉「满方块但 neverHides」的反方向 | R196 `BlockMobSpawner.java:5` ctor `new BlockConstants().setNeverHidesAdjacentFaces()`；1.12 `BlockMobSpawner.java:18-23` 无 `isFullCube`/`getBlockFaceShape` 覆写 ⇒ 满方块 + `faceShape` 默认 SOLID（`Block.java:610-613`），且不在 `isExceptionBlockForAttaching`（`:361-364`）/`isExceptBlockForAttachWithPiston`（`:366-369`）；当前 `ETIMMountRules.java:106-110` 对刷怪笼放行 torch/skull/lever/button/tripwire/ladder/trapdoor 的各可放面；在上述七类中，R196 仅顶面 torch/skull 经子类 `isFaceFlatAndSolid` 臂放行（`BlockTorch.java:136-143`、`BlockSkull.java:58-69`），其余面/挂载物走基类 `neverHides` 拒 | 在规则引擎加显式 `isNeverHidesSupport(Block)`（按 R196 38 类清单，至少含 `Blocks.MOB_SPAWNER`），先于几何判定；不能只依赖 `isFullCube`。W3 补刷怪笼判据：除顶面 torch/skull 外应拒。 |

### 3.2 B 级

| 编号 | 冲突 | 证据 | 建议改法 |
|---|---|---|---|
| B-B69-1 | A-4 group 7 玻璃子项不成立：R196 实际拒玻璃，报告算作「R196 允许」；雪块（craftedSnow）同样被材料门拒 | `BlockTrapDoor.java:164` 先过 `BlockDoor.isSuitableMaterialForAttachingHingesTo`；`BlockDoor.java:317` 排除 `Material.glass`，故 `BlockTrapDoor.java:168` 的 `neighbor_block == glass` 是死码；craftedSnow 在 `:313` 被排除；只有雪层 `:188` 放行 | group 7 改为：slab/stairs/雪层（depth>2）放行；玻璃、雪块、dirt/grass/sand/clay/pumpkin/craftedSnow 仍拒。 |
| B-B69-2 | B-6 不是冲突，只是面外归因注记；报告 B 计数应为 5 | `MixinBlockFire.java:32-43` 的 redirect 事实成立，但报告 §5 已排除该面 | 把 B-6 降为 C/注记，不计入 B 级修复项。 |
| B-B69-3 | 证据行号尾差集（语义未变） | A-1 R196 `:70-76` 应 `:82-90`；A-4 g3 `BlockStairs :299-303` 应 `:301-304`；g4 `BlockSlab :146-149` 应 `:148-151`；g5 `BlockSnow :75-79` 应 `:78-81`、`:106-109` 应 `:108-111`；g6 `BlockEnchantmentTable :169-172` 应 `:172-175`、`:47-49` 应 `:49-52`；C-8 `:515-519` 应 `:518-522`；§0.2 `BlockPistonBase isFullCube :157` 应 `:301-304` | 按左列逐项改锚；报告-check 的 anchor 解析通过不等于行号语义正确。 |
| B-B69-4 | D-2 落码面不是「ETIM 源一行」 | 1.12 `ItemFlintAndSteel.java:22` ctor `setMaxDamage(64)`；ETIM 无自有 `ItemFlintAndSteel` 源 | 在既有 `MixinItemFlintAndSteel` 加 `@ModifyConstant`（64 → 16）或替换 item 实例；不要新建兼容层。 |
| B-B69-5 | A-4 group 3/5 的 `faceShape` 不是 R196 `isFaceFlatAndSolid` 的等价物 | 1.12 `BlockStairs.java:254-287`：`OUTER_*` 水平面全 UNDEFINED、`INNER_*` 比 R196 `BlockStairs.java:365-387` 更宽/更窄；1.12 `BlockSnow.java:78-81` 对所有层 DOWN SOLID，R196 `BlockSnow.java:153-157` 对 depth==1 全拒、仅 max depth 允许 TOP | 外角楼梯、薄雪底面、最大雪顶不要直接套 `faceShape`；用显式臂，或按 C 级 1.12 载体差收口并在回执注明。 |
| B-B69-6 | A-1「HEAD 注入先判」的落点会看错位置 | 1.12 `ItemFlintAndSteel.java:31` 才 `pos = pos.offset(facing)`；HEAD 看到的是点击位，不是目标位 | 在 offset 后注入，或 `@Redirect` `isAirBlock` 捕获结果、在 `damageItem` 前跳过；TNT 仍由 `BlockTNT.onBlockActivated` 处理。 |

### 3.3 C 级

| 编号 | 冲突 | 证据 | 建议改法 |
|---|---|---|---|
| C-B69-1 | C-4「8/9 类未放宽」计数/措辞不精确 | 1.12 原生仍拒的是 Ladder/Lever/Button/TripWireHook 在 farmland 面（`faceShape` 非 SOLID），加上 ETIM 自身保留的侧贴限制；牌/骷髅/活板门原生可放，可可会掉 | 改为「拉杆/按钮/绊线钩/梯子 4 类仍被 1.12 原生拒；其余本就可放或会掉」；D-5 例外不重开。 |
| C-B69-2 | C-5「改梯子要重写放置」过重 | A-4 修完后，梯子只剩 1.12 原生「侧贴 + 不可供红石」两条窄口（`BlockLadder.java:97-102`） | 保留 C-5 定级，但把「重写」改为「A-4 修后仅余 1.12 原生窄口」。 |
| C-B69-3 | A-3「熔炉六变体同一注册方块」措辞不严谨 | 1.12 是 `Blocks.FURNACE` / `LIT_FURNACE` 两方块 + `FACING` 变体；ETIM `ETIMMountRules.java:131-133` 两者都覆盖 | 改为「两方块 + FACING 变体」；结论不受影响。 |

### 3.4 计数修正

报告终判 `A=6 / B=6 / C=9` 修正为：`A=6`（A-4 仅撤销 group 7 玻璃/雪块子项，主体仍成立）、`B=5`（B-6 降 C 注记）、`C=9`；另加终审新增 `A-B69-1..4`、`B-B69-1..6`、`C-B69-1..3`。

## §4 放行结论

**退回**——A-1..A-6 主体成立、B-1..B-5 成立、B-6 降注记、C-1..C-9 基本成立；但 A-2/A-4/A-6 的修法按报告字面执行会分别留下 A-B69-1/A-B69-2/A-B69-3 三处阻断，且 A-4 的 `!isFullCube` 代理在满方块 neverHides（刷怪笼侧面）上已存在过放（A-B69-4），须先补强后再放行改码。

> D-1..D-4 甲方向不重开；退回项仅指修法落点，不指裁定本身。
