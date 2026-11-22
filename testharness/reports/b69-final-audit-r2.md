# B-69 火花 + 挂载：终审复签 r2（2026-11-22）

【会话五 · ETIM 终审 · 2026-11-22】
对象：B-69 修复后产品码 + 会话七 build4 判窗回执。上一轮一审：`git-workspace/etim/testharness/reports/b69-final-audit.md`（22,166 B / 139 行，SHA-256 `0A41A6C1D885BDF8AA90FD3265121749AD7ADF0224E9AA7D5416D417F42F10EC`，判「退回」）。

## §0 复核源与钉值

### 0.1 文件与行数

| 文件 | 字节 | 行数 | 说明 |
|---|---:|---:|---|
| `playground/audit/spark-mounted-对照报告.md` | 46,513 | 348 | 会话六对照报告（上轮审件） |
| `git-workspace/etim/testharness/reports/b69-verify-receipt.md` | 22,668 | 272 | build4 判窗回执 |
| `git-workspace/etim/testharness/build-logs/b69-b69r9-b1.out` | 526,693 | 3,666 | r9 tee；回执 §r8.2 写 3,658，差 8 行为统计口径 |
| `.../world/ETIMMountRules.java` | 15,571 | 356 | 修复后主判定 |
| `.../mixins/MixinItemSign.java` | 3,305 | 76 | 两类牌 |
| `.../mixins/MixinItemFlintAndSteel.java` | 3,612 | 86 | 打火石 |
| `.../world/ETIMBlockSpark.java` | 5,175 | 126 | 火花 |

### 0.2 钉值（回执 §r8.0 与任务书一致）

- release `1,552,954 B` / `48F727CF08E3DD81D464853D4E16C82C3EBD75AD06DD6EA314B44B03A0A1BA4D`
- dev `1,524,553 B` / `25A9FC863959E977972A867B17D605D6DA1D9F762FFEF3965AE035D751165537`
- sources `1,362,487 B` / `E55C438A5D128ADA8E301F1CBECC9A8937A59231A56192094DC9E7603CE230F1`
- MK `classes=113 / entries=281 / dual=562`；mixins `114 / client=10`
- r9 终判：`{"run":"b69r9","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0}`；§r8.5 PASS。

### 0.3 判决源

- R196 一手：`mite-src/decompile/src/net/minecraft/`（`BlockMounted.java`、`BlockTorch.java`、`BlockSkull.java`、`BlockTrapDoor.java`、`BlockButton.java`、`BlockLever.java`、`BlockTripWireSource.java`、`BlockDoor.java`、`BlockJukebox.java`、`BlockFarmland.java`、`ItemFlintAndSteel.java`、`BlockFire.java`、`BlockSpark.java`）。
- 1.12 载体：`git-workspace/etim/build/rfg/minecraft-src/java/net/minecraft/`（`ItemSign.java`、`ItemSkull.java`、`BlockTrapDoor.java`、`BlockButton.java`、`BlockLever.java`、`BlockSkull.java`、`World.java`、`Block.java` 等）。
- 产品码：`git-workspace/etim/src/main/java/io/github/etim/etim/`。
- 判窗：`b69-b69r9-b1.out`（r9）。

## §1 逐项核讫表

| # | 条目 | 判 | 依据 file:line |
|---:|---|---|---|
| 1 | A-B69-1 两类牌覆盖与支撑算术 | **PASS** | `MixinItemSign.java:46-72` 拦截 `ItemSign.onItemUse` HEAD；站立牌 `landing = replaceable ? pos : pos.offset(UP)`（:63），墙牌 `landing = pos.offset(facing)`（:69）；与 1.12 `ItemSign.java:34-58` 的 flag/face/offset/down 同构。两类牌均调用 `rejectsPlacement(..., mounted)`，不再依赖 `World.mayPlace`。 |
| 2 | A-B69-2 判定口径：mounted 参数、顺序、无 blanket isFullCube/isSideSolid | **FAIL（A-B69-6）** | 带 `mounted` 参数属实：`ETIMMountRules.java:128`。`geometry` 只 allow、不再 `isSideSolid`，属实：`:215-218`。但 **顺序倒置**：`farmland`（:136-138）与 `jukebox-top`（:139-141）在子类臂（:147-196）之前；R196 是子类 override 先执行、`super` 后执行。由此派生 A-B69-6 两症状（见 §2.2）。 |
| 3 | A-B69-3 活板门材料门 + trapdoor-shape | **FAIL（A-B69-6 / A-B69-7）** | 材料门本身正确：`:174` 调 `hingeMaterialOk`，`:281-292` 十项与 R196 `BlockDoor.java:307-318` 对齐；dirt 支撑 r9 `:3616` 拒绝。但 `farmland` 早退 `:136-138` 绕过该门（A-B69-6）；`trapdoor-shape` `:177-180` 只按 slab/stairs/snow 类型放行，缺 R196 `:172-189` 的 `isLower` 半砖匹配（A-B69-7）。 |
| 4 | A-B69-4 刷怪笼 neverHides，仅顶面 torch/skull 放行 | **FAIL（A-B69-5 残余）** | `neverHides` 含 `BlockMobSpawner` 属实：`:322`；顶面 torch/skull 放行规则存在：`:148-152`、`:167-169`；r9 `:3565` torch 顶面 allow、`:3582` torch 侧面 reject。但真实骷髅放置走 `ItemSkull.onItemUse`，不经过 `World.mayPlace`（见 §2.1），侧面 `:3613` 的 `mayplace reject` 不能证明真实物品被拒；真实 ItemSkull 在刷怪笼侧面会放行。 |
| 5 | A-1 打火石：非空气 FAIL + 耐久 16 | **PASS** | `MixinItemFlintAndSteel.java:62-71` HEAD 判 `!worldIn.isAirBlock(pos.offset(facing))` → `FAIL`；`:51-58` ctor TAIL 把 64 改 16。R196 `ItemFlintAndSteel.java:83-85` 非空气 `return false`；1.12 `ItemFlintAndSteel.java:40-52` `damageItem` 在分支外。 |
| 6 | A-2/A-3/A-6：牌、DROPPER、三类材料门 | **PASS（A-6 有 A-B69-6 旁路）** | A-2 由 `MixinItemSign.java:46-72` 覆盖两类牌；A-3 `DROPPER` 已入 `isFrontFace`：`ETIMMountRules.java:351`；A-6 `buttonMaterialOk :262-273`、`leverMaterialOk :276-278`、`hingeMaterialOk :281-292` 与 R196 `BlockButton.java:37-47`、`BlockLever.java:30-45`、`BlockDoor.java:307-318` 对齐。A-6 的活板门门在 farmland 支撑上被 `:136-138` 绕过，归 A-B69-6。 |
| 7 | A-4/B-B69-1：逐面判定；玻璃/雪块/材料门仍拒，slab/stairs/厚雪放行；B-B69-5 记 C | **PASS（A-B69-7 残余）** | 无 blanket `isFullCube`、无 `isSideSolid` 顶替：`:215-218` 为纯 allow；`trapdoor` 玻璃/雪块由 `hingeMaterialOk :281-292` 拒，r9 `:3616` dirt 拒；slab/stairs/厚雪 `:177-180` 放行，r9 `:3619` slab allow；`torch-snow-side :156-157`、`torch-stairs-back :160-162`、`torch-slab-bottom :158-159` 与 R196 `BlockTorch.java:144-155` 对齐。B-B69-5（1.12 stairs/snow `faceShape` 非等价）已在码内注释，接受为 C。唯一残余是 `trapdoor-shape` 缺半砖匹配（A-B69-7）。 |
| 8 | A-5 火花：六邻位认 NETHERRACK，updateTick 仅正下方 | **PASS** | `ETIMBlockSpark.java:115-125` 六邻遍历 `canCatchFire(...) || neighbor == NETHERRACK`；`:85-102` `fuel = canNeighborBurn(...) || down == NETHERRACK`；R196 `BlockSpark.java:29-37`、`BlockFire.java:222-238`、`:259-263` 对齐。 |

## §2 残余与建议

### 2.1 阻断 A-B69-5：骷髅真实放置绕过 `World.mayPlace`，挂载判定对骷髅是死码

- 1.12 `item/ItemSkull.java:41-78` 的 `onItemUse` **不调用 `World.mayPlace`**：`:70` 只调 `Blocks.SKULL.canPlaceBlockAt(worldIn,pos)`（`Block.canPlaceBlockAt` 只判目标位可替换），`:78` 直接 `setBlockState(SKULL...)`。`ItemSkull` 只做 `:60` 的 `material.isSolid()` / `isSideSolid()` 粗检，**不查挂载支撑语义**。
- `MixinWorldMayPlace.java:35-47` 只拦 `ItemBlock` 路径；`ETIMMountRules.java:164-172` 的 skull 放行/禁止臂、`:209-211` 的 neverHides、`:212-214` 的 front-face，对真实骷髅物品 **全部不执行**。r9 `:3606-3613` 的 `etest mayplace ... skull` 是直接调 `World.mayPlace` 的测试通道，不是真实物品路径；其 `mayplace reject` 不能证明真实骷髅被拒。
- 玩家可感知：骷髅可被放在 **刷怪笼侧面、箱子/铁砧等 neverHides 支撑、熔炉/发射器/漏斗前脸、伸出活塞前脸** 等 R196 明确拒绝的位置（`BlockMounted.java:27-37`、`BlockSkull.java:57-73`）；这些支撑是满方块，`ItemSkull` 的 `material.isSolid()` 检查放行。（玻璃材质在 1.12 的 `isSolid` 口径未计入本例，避免把未核实材质当证据。）
- 修法：新增 `MixinItemSkull`（或等价注入 `ItemSkull.onItemUse`），按 `ItemSkull.java:49-70` 的算术求出 `landing`/`face`，调用 `rejectsPlacement(world, landing, face, Blocks.SKULL)`；不能只改 `BlockSkull.canPlaceBlockAt`，因为该 API 拿不到被点击的支撑面。并新增 **真实物品路径** 用例（`hold minecraft:skull` + `useblock`），不要用 `etest mayplace` 代替。**注意**：若只加 `MixinItemSkull` 而不同时修 A-B69-6 的 jukebox 早退，骷髅在唱片机顶会被新钩子误拒（R196 `BlockSkull.java:58-69` 顶面臂应放行）；两项必须同批改。

### 2.2 阻断 A-B69-6：`farmland` / `jukebox-top` 提前于子类臂，顺序与 R196 相反

- 代码：`ETIMMountRules.java:136-138`（farmland allow）、`:139-141`（jukebox-top reject）在 `:147-196` 的子类臂之前。R196 的 Java 分派是 **子类 override 先执行，末尾才 `super.canMountToBlock`**：
  - `BlockTrapDoor.java:164` 先过 `BlockDoor.isSuitableMaterialForAttachingHingesTo`，`BlockDoor.java:307-318` 排除 `Material.dirt`；`BlockButton.java:51`、`BlockLever.java:30-45`、`BlockTripWireSource.java:249-254` 同样先过材料门。
  - `BlockTorch.java:136-143` 与 `BlockSkull.java:58-69` 的顶面 `isFaceFlatAndSolid` 臂在 `super` 的 `:25-26` 唱片机顶禁止之前。
- 两个稳定可感知症状：
  1. **火把放唱片机顶被误拒**：`ItemBlock` 真实路径命中 `:139-141`，r9 `:3446` `jukebox-top ... torch ... reject`。R196 `BlockJukebox.java:3-7` 无 `isFaceFlatAndSolid` 覆写、是满方块，`BlockTorch.java:136-143` 顶面臂应放行；r9 这条是**错误期望**。
  2. **活板门放农田被误放**：`:136-138` 直接 allow，绕过 `:174` 的 `hingeMaterialOk`；R196 `BlockTrapDoor.java:164` + `BlockDoor.java:307-318` 对 `Material.dirt` 拒绝；1.12 `BlockTrapDoor.java:196-199` 的 `canPlaceBlockOnSide` 恒 true，会真正放下。r9 无农田活板门用例。
- 修法：把 `farmland` 与 `jukebox-top` 从早退分支移到 `:199-219` 的 **base 段**（在子类臂之后、leaves/cloth 等禁止项之前，保持 R196 base 的内部次序）。这样火把/骷髅顶面先被 `torch-flat-top`/`skull-flat-top` 放行；活板门先被 `hingeMaterialOk` 拒；按钮/拉杆/绊线钩仍由 1.12 原生 `faceShape` 拒农田，净行为不变。

### 2.3 阻断 A-B69-7：活板门形状缺 `isLower` 半砖/楼梯/雪层匹配

- 代码 `ETIMMountRules.java:177-180` 只判 `isSingleSlab(state) || BlockStairs || SNOW_LAYER && snowLayers > 3`，对活板门自身的上下半 `isLower(metadata)` 没有任何检查。
- R196 `BlockTrapDoor.java:172-189`：单 slab 必须 `isBottom(slabMeta) && isLower(trapdoorMeta)`，或 top slab 且 `!isLower`；stairs 必须 `(meta&4)==0 && isLower`，或 top stairs 且 `!isLower`；雪层必须 `meta>2 && isLower`。1.12 `BlockTrapDoor.java:196-199` 不设放置门，因此当前会放下 **错半** 活板门（如 bottom slab 上放上半活板门），属稳定过放。
- `World.mayPlace` 的 HEAD 拿不到未来 trapdoor metadata（半砖由 `ItemBlock.getStateForPlacement`/点击高度决定），所以此条不能在 `rejectsPlacement` 内补；应在 `ItemBlock.getStateForPlacement`（或 `BlockTrapDoor` 的 state 阶段）按 R196 `:172-189` 复核 `isLower` 与支撑半砖。判窗需加：bottom slab + 上半活板门 reject、top slab + 下半 reject、stairs 错半 reject、雪层 depth 4 + 上半 reject、正确半 allow。

### 2.4 非阻断残余与建议

- **B-B69-7（报告口径）**：C-4 的「`tilledField` 第一臂对 10 子类全生效」不成立——子类材料门先执行；代码 `:136-138` 正是把这条误读落成早退。须改报告 C-4 与 `ETIMMountRules` 注释，避免下次再按「农田全局放行」写。
- **B-B69-8（注释漂移）**：`ETIMBlockSpark.java:20` 仍写 `BlockSpark.java:1-54`（文件 53 行，EOF 54）；`:27` 仍写 `:30-52`（实际 `:28-37`）。非阻断，但一审 B-4 未闭合。
- **C-B69-4（测试期望）**：r9 `:3446` 的 `jukebox-top ... torch ... reject` 是错误期望；修 A-B69-6 后应改为 allow（火把顶面），并保留按钮/拉杆/绊线钩/活板门在唱片机顶的 reject。
- **C-B69-5（测试通道）**：r9 `:3606-3613` 的骷髅用例走 `etest mayplace`，不是 `ItemSkull` 真实物品路径；A-B69-5 修复前，这些 PASS 不代表玩家实际可放置性。需补 `hold minecraft:skull` + `useblock` 的真路径用例。
- **C-B69-6（C-4 窄口）**：`MixinBlockTorchFarmland` 只放行 `canPlaceTorchOnTop`（顶面）；火把/梯子在农田 **侧面** 仍被 1.12 原生 `faceShape` 拒，R196 的 base tilled-field 允许。若要求 C-4 全脸，需要另挂 `BlockTorch.canPlaceAt`/`BlockLadder.canAttachTo`；否则在回执中如实写成「农田只放宽火把顶面」。
- **C-B69-7（行号）**：`ETIMMountRules.java:81` javadoc 写 `BlockTrapDoor.java:163-193`，R196 方法实际 `:162-193`；属一行尾差。
- **C-B69-8（D-5 活塞）**：`isFrontFace` 只拒前脸（`:343-354`），未加「活塞侧面」分支；对按钮/拉杆/火把/梯子/绊线钩，1.12 `isExceptBlockForAttachWithPiston` 已原生全拒；对活板门/骷髅/牌，R196 基类 `:32-33` 本身允许非前脸侧面，当前行为与 R196 一致。故不构成 blocking，但回执应写明「D-5 的全拒实际由 1.12 原生于五类承载，不是 hook 的通用分支」。
- **C-B69-9（统计）**：回执 §r8.2 写 r9 tee 3,658 行，实际 `Get-Content` 计数 3,666 行；差 8 行为统计口径，不影响 r9 JSON 与哈希。

## §3 终判

**退回**。阻断项：**A-B69-5**（`ItemSkull` 绕过 `World.mayPlace`，骷髅挂载判定为死码，刷怪笼/箱子/铁砧/前脸等稳定过放）、**A-B69-6**（farmland/jukebox 早于子类臂：唱片机顶火把误拒、农田活板门误放）、**A-B69-7**（活板门缺 `isLower` 半砖/楼梯/雪层匹配，错半稳定过放）。修完 A-B69-5/6/7、把 r9 的 `jukebox-top` 期望改为 allow、补骷髅真实物品与活板门半砖用例后，可再复签。
