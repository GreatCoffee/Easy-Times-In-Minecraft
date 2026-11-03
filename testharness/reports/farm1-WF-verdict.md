# farm1 批（B4：fertility / harvesting ＋ fertilized 链）· W-F 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-02（CST）｜**窗口形态**：**8 boot**（预飞 A=cfg 首启面／预飞 B=机械自核／主窗=W-F1..W-F5＋W-F8..W-F10＋零回归／TE 探针=A-1 机制／频率窗=W-F6＋W-F11 小麦／胡萝卜窗=W-F11 胡萝卜／链窗=W-F7／consume 窗=W-F9 翻转臂）；**0 客户端／0 产品码**
> **报告字节规格**：`25,851 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 78 / ✗ 7｜221 行`
> **判决源**：audit20 **条 254**（批成立）／farm1-对照报告（会话六，faces=11）／**条 256**（D-1..D-8 终裁）／**条 257**（终审放行 ✓5）／**条 258**（落码 `e15795f`）
> **落码 commit**：**`e15795f`**（父 `43e183c`）｜窗内零提交、零产品码；树起收只增本窗 testharness 件
> **判决**：**FAIL** —— **faces=12（W-F1..W-F11 + W-F-CFG）｜checked=12｜pass=11｜fail=1**（**A 1／B 3／C 7**）
> **一句话**：fertility/harvesting 的载体门、案 M 窗口、tillage/harvest 频率、F7 矩阵、丰收增量、踩踏与置位链在**受控稳定位**上逐项对上 R196；但 **A-1** 挖出致命载体缺陷——施肥位 TE 未覆写 `shouldRefresh`，Forge 对非 `net.minecraft.*` TE 用 `oldState != newState` 判失效 ⇒ **耕地 moisture 状态一变（自然干燥/灌溉/降雨）就把 TE 清掉，施肥位在正常农田里只能活几秒**；R196 的 `BlockFarmland.setWetness` 明确保留 bit 8（`metadata & ~7 | wetness`），语义是「施肥随块存续」。wheat 200/200 ×2、carrot 59/60 的频率窗、divisor=2 翻转臂的清位链、链窗的 set→deny→破块→allow 均已收；A-1 修复后需单点回归 W-F7..W-F10 的持久面。

## §0 判定总表（十二点）

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **W-F1** 载体门 7 臂 | `-preflight.out` pool reg（43 行）；`-preflight.out` ids 行 | hoe/iron_hoe/scythe/mattock → fertility+harvesting 真；pickaxe/sword/shovel → 双假 | 7 臂逐项命中；reg **43**（41＋2）；`etim:fertility id=29`／`etim:harvesting id=30`；前 8 条窗口零变（speed `1/10…41/999`、regeneration `11/30…91/999`、poison/true_flight/quickness `1/10…41/999`、stun `6/20…66/999`、vampiric `11/30…91/999`、disarming `1/10…41/999`） | ✓ |
| **W-F2** 案 M 窗口 | `-preflight.out` reg 行（首臂）＋ disarming 对照 | fertility/harvesting（diff10）＝ `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999`，与 disarming 同列 | 7 臂 × 2 条全等（`arms36Ok`）；disarming 对照行逐字相等 | ✓ |
| **W-F3** tillage | `:3591-3607`（L5 5 行示例）／`:4010-6381`（L1 200 行） | L5 fraction=1.0 → 20/20；L1 N=200 → ≈0.2（±3σ）；粗泥 B-3 臂 0 行 | L5 **24/24**（need=1.0000，set 行 24）；L1 **200 行 35 pass＝0.175**（带 [0.1151,0.2849]）；粗泥 tillRows=0 且块落 DIRT | ✓ |
| **W-F4** 负臂 | `-preflight-mech.out`／主窗 wf4 | 无附魔锄 0 行；非载体三件 0 行且不落耕地；产品装填 token 出 1 行 | vanilla_hoe-noench：0 行、块成 farmland（till 真、roll 静默）；pickaxe/sword/shovel（fert5）：0 行、块保持 DIRT（未 till）；`/etest enchant … fertility` token 臂出 1 行（`lvl=1 pass=false`） | ✓ |
| **W-F5** 矩阵 7 臂 | 主窗 wf5（7 个 crop pos 各 1 行） | wheat→仅 scythe；carrot/beetroot/potato→仅 hoe/mattock | 正臂 4/4 各 1 行（wheat-scythe／carrot-hoe／beetroot-hoe／potato-mattock）；负臂 3/3 **0 行**（wheat-hoe／carrot-scythe／wheat-mattock）；7 臂 `present=true`、`broken=true` | ✓ |
| **W-F6** harvest 频率 | `-freq.out:2816-7432`（200 行） | L1 镰收小麦 N=200 → pass ≈ 0.2，±3σ | **200/200 行**，pass **41**＝0.2050，带 [0.1151,0.2849]；need=0.2 全行 | ✓ |
| **W-F7** 置位/持窗链 | `-chain.out:2797/2798/2807/3315`；A-1 面见 §13 | set 行 ✓；新鲜位 deny ✓；破块重放不复活 ✓；**R196 持窗：bit 跨 moisture 变化存活** | 链四步全 ✓（till→set→deny→setblock air→re-place→allow＋块变 Dirt）；**但 moisture 一变 TE 即灭（A-1）**：P7（moisture7）growth 8 行后停、moisture 落 0；衰减位踩踏 → allow | **✗（A-1）** |
| **W-F8** 增速 | `:10865-22357`（growth 行） | value=base×1.5、ratio=1.500、factor=1.50；无肥地 0 行 | P1 **4835 行**：ratio 集合 `{1.5}`、factor `{1.5}`、`value=base×1.5` 逐行成立；P0 对照 **0 行**（maturity 采样 age=0，受窗口尾部低 TPS 影响，见 C-5） | ✓（值面；A-1 生命周期见 §13） |
| **W-F9** 消耗 | `:10924-21608`（divisor=256 行）／`-consume.out:2764-3370`（divisor=2） | divisor=256；roll∈[0,255]；cleared⇔roll==0；清后 growth 停 | 常态：**512 行**、divisor `{256}`、roll **0..255**、cleared 3、`badClear=0`、3 个清位**清后 growth=0**；翻转臂 divisor=2：25 行、roll `{0,1}`、cleared 16、`badClear=0`、16 个清位全部 `after=0` | ✓（机制面；A-1 寿命见 §13） |
| **W-F10** 踩踏 | `:17498/17501/17636/18104` | 施肥位 deny（块仍 farmland）；普通耕地 allow（块变 Dirt） | 稳定位（moisture0+crop）：**deny** 1 行且块仍 farmland；普通耕地：**allow** 1 行且块 Dirt；衰减位（moisture7→0）：**allow**（A-1 证据） | ✓（稳定位；A-1 衰减位见 §13） |
| **W-F11** 丰收 | `-freq.out:7600-11490`（wheat 200 行）／`-carrot.out:2793-11138`（59 行） | wheat：fraction=1.00、factor=0.50、base=1、extra>0≈0.5；carrot：base 带 + extra≤base（per-item） | wheat **200/200 行**、extra 命中 **88**＝0.44（带 [0.3939,0.6061]）、fraction `{1}`、factor `{0.5}`、base `{1}`、extraMax 1；carrot **59/60 行**、base `{1,2,3,4}`、extraMax 4、`extra>base` **0**、per-item 命中率随 base 单调（0.4/0.867/0.76/1） | ✓ |
| **W-F-CFG** farm 8 键首启 | `-preflight-cfg.firststart`（`-preflight.out` cfg 段） | farm 类目首启写出、8 键全、值对默认 | **38,271 B/199 键 → 39,968 B/207 键**（+1,697 B、+8 键；类目 `farm {` 在）；8 键：`fertilityDifficulty=10／harvestingDifficulty=10／fertilityMaxLevel=5／harvestingMaxLevel=5／fertilizedGrowthFactor=1.5／fertilizedConsumeDivisor=256／harvestingYieldFactor=0.5／farmDebugLog=false`——8/8 与默认逐一相等 | ✓ |

## §1 W-F1 · 载体门（7 臂）

`/etest enchantprobe mainhand pool` 的 `table=` 列＝`canApplyAtEnchantingTable` 现体判决（**按持件判定**，故前 8 条在锄上为 false 属正常）。reg 行总数 **43**（melee1 后 41 ＋ 本批 2）。运行时 id：**fertility 29／harvesting 30**（`[EtimInit] enchant etim:speed ids=14 15 23 24 25 26 27 28 29 30`）。

| 臂 | 件 | fertility | harvesting | 判 |
| --- | --- | --- | --- | --- |
| 1 | `etim:hoe_copper` | **true** | **true** | ✓ |
| 2 | `minecraft:iron_hoe` | **true** | **true** | ✓（效果面见 B-1） |
| 3 | `etim:scythe_copper` | **true** | **true** | ✓ |
| 4 | `etim:mattock_copper` | **true** | **true** | ✓ |
| 5 | `etim:pickaxe_copper` | false | false | ✓ |
| 6 | `etim:sword_copper` | false | false | ✓ |
| 7 | `etim:shovel_copper` | false | false | ✓ |

键面：R196 `EnchantmentFertility.java:14-16`（hoe ∨ mattock ∨ scythe）／`EnchantmentHarvesting.java:14-16`（scythe ∨ hoe ∨ mattock）——1.12 摊平为 `ItemHoe ∨ ETIMItemMattock ∨ ETIMItemScythe`（两处同集）→ 7 臂正反全对。

## §2 W-F2 · 案 M 窗口

`ETIMMiteEnchantment:36-50`：`min(L)=max(diff−10,0)+diff×(L−1)+1`、`max(L)=min(L+1)−1`、末级 999。diff10 ⇒ `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999`。

- 7 臂 × fertility/harvesting = **14 组窗口逐字全等**（`arms36Ok=true` 的口径为「各臂两条 window 均等于 W10」），且与 **disarming 对照行**（同 diff10）逐字相等。
- 前 8 条（enchant1 五条＋melee1 三条）在本次 reg 输出里窗口零变（见 §0 W-F1 行）⇒ 前批零回归。

## §3 W-F3 · tillage（置位掷值）

产品面（`ETIMFarm.onTilled`，`MixinItemHoe` RETURN-SUCCESS 接线）：`need=level/maxLevel`、`roll=Math.random()`、`pass=roll<need`；pass 后 `setFertilized(pos,true)` 打 `fertilized set` 行。

| 臂 | 次数 | pass | 率 | 3σ 带 | 判 |
| --- | --- | --- | --- | --- | --- |
| L5（`need=1.0000`） | 24 | **24** | 1.0000 | —（P=1 必中） | ✓ |
| L1（`need=0.2000`） | 200 | **35** | 0.1750 | [0.1151,0.2849] | ✓ |

- 每次 pass 都伴生 1 条 `fertilized set … value=true`（L5 臂 24 条）；三个抽样位 `testforblock farmland` 全命中。
- **粗泥 B-3 臂**：`setblock dirt 1`（coarse）→ 锄 SUCCESS 支路落 **DIRT** → `onTilled` 的 FARMLAND 门早退 ⇒ `tillage` 行 **0**，且块确为 DIRT（`-preflight-mech.out` 同臂复证）。

## §4 W-F4 · 负臂

| 臂 | 结果 | 判 |
| --- | --- | --- |
| vanilla `iron_hoe` 无附魔 | till 成功（块成 farmland），`tillage` 行 **0**（level 0 早退） | ✓ |
| `pickaxe/sword/shovel` + fertility L5 | **0 行**、块保持 DIRT（工具无 till 面） | ✓ |
| 产品装填：`/etest enchant mainhand 1 fertility` + ETIM 锄 | **1 行**（`lvl=1 need=0.2000 pass=false`，块成 farmland） | ✓ |

注：非载体三件在 till 前本来就不会走 `onItemUse`，因此「0 行」同时证明载体门与行为门；与 W-F1 的 `table=false` 互补。

## §5 W-F5 · F7 矩阵（wheat=scythe；根茎+beetroot=hoe/mattock）

| 臂 | 作物 | 工具 | 行数 | present | broken | 判 |
| --- | --- | --- | --- | --- | --- | --- |
| wheat-scythe | wheat age7 | `etim:scythe_copper` | **1** | ✓ | ✓ | ✓ |
| wheat-hoe | wheat age7 | `etim:hoe_copper` | 0 | ✓ | ✓ | ✓ |
| carrot-hoe | carrots age7 | `etim:hoe_copper` | **1** | ✓ | ✓ | ✓ |
| carrot-scythe | carrots age7 | `etim:scythe_copper` | 0 | ✓ | ✓ | ✓ |
| beetroot-hoe | beetroots age3 | `etim:hoe_copper` | **1** | ✓ | ✓ | ✓（D-3） |
| potato-mattock | potatoes age7 | `etim:mattock_copper` | **1** | ✓ | ✓ | ✓ |
| wheat-mattock | wheat age7 | `etim:mattock_copper` | 0 | ✓ | ✓ | ✓ |

判据：`ETIMFarm.isEffectiveForCrop`——scythe = `block.getClass() == BlockCrops.class`（R196 `ItemScythe:43` wheat exact）；其余只收 `CARROTS/POTATOES/BEETROOTS`。负臂 0 行且作物确已被挖掉（`broken=true`），排除「没挖到」解释。

## §6 W-F6 · harvest 频率（fertility L1 镰收小麦 N=200）

`-freq` 窗（独立 boot，站桩 5×5 逐轮重建、8 环位 dig）：
- **200 落刀 / 200 行**（失败行同打：`pass=false` 也落行）；need 恒 0.2、tool 恒 `etim:scythe_copper`、crop 恒 `minecraft:wheat`。
- pass **41** ⇒ rate **0.2050**，二项 3σ 带 [0.1151,0.2849] ⇒ ✓。
- 频率窗工装说明见 B-2：主窗内联版受 dig 串行面影响（1 行/轮），本判点采用独立频率窗的 200/200 正本。

## §7 W-F7 · 置位链与 A-1

**链四步（`-chain` 窗，逐项 ✓）**：

| 步 | 动作 | 行 | 判读 |
| --- | --- | --- | --- |
| ① | L5 锄 till `-68,68,247` | `:2797` `fertility tillage lvl=5 roll=0.7361 need=1.0000 pass=true`；`:2798` `fertilized set … value=true` | 置位 ✓ |
| ② | 作物上方 + 牛落踩 | `:2807` `fertilized trample-deny pos=-68,68,247`；块仍 farmland | deny ✓ |
| ③ | 破块（`setblock air`＝`World.setBlockState` 同一条 TE 移除路径） | 块确为 air | 破块 ✓ |
| ④ | 重放普通耕地（无 NBT）+ 作物 + 牛 | `:3315` `trample allow … fertilized=false`；块变 Dirt | **不复活** ✓ |

**持久面 ✗（A-1）**：主窗 P7（moisture=7 + TE + 麦）在生长窗里只出了 **8 条 growth 行**就停，末态 `moisture=0`；衰减位踩踏得 **allow**。TE 探针三组对照更直接：A（moisture7，无水源）**4 行后停**、B（moisture0）**38 行持续**、D（moisture0 → 强制 `setblock farmland 7`）**冻在 28 行**。⇒ 施肥位不是「随块存续」，而是「随一次 moisture 变化即灭」。根因与 R196 一手见 §13。

## §8 W-F8 · 施肥增速

产品面（`MixinBlockCrops.etim$fertilizedGrowth`，`getGrowthChance` RETURN）：`value=base×fertilizedGrowthFactor`、`logGrowth` 打 `growth` 行。

- P1（8×8 施肥、moisture0、玻璃顶防雨）在生长窗内 **4835 条 growth 行**：`ratio` 集合 **{1.5}**、`factor` 集合 **{1.5}**、`value=base×1.5` **逐行成立**（容差 1e-3）。
- P0（8×8 普通耕地）**0 条** growth 行（`farmlandTile` 为 TE 未施肥 → 早退）。
- 判：值面 ✓。**A-1 说明**：该增速只在 TE 存活期生效；正常灌溉田/降雨会在分钟级内把 bit 洗掉（§13）。

## §9 W-F9 · 消耗（divisor=256 常态 + divisor=2 翻转臂）

- **常态窗**（主窗，divisor=256）：**512 条** `fertilized clear` 行；`divisor` 集合 `{256}`；`roll` 覆盖 **0..255**；`cleared=true` **3** 条；`cleared ⇔ roll==0` 违例 **0**；3 个清位在清位之后的同 pos growth 行 **全部 0**（TE 已置 false，增速停）。
- **翻转臂**（`-consume` 窗，临时 `fertilizedConsumeDivisor=2`，收窗回填）：**25 行**、`divisor={2}`、`roll∈{0,1}`、`cleared=16`、违例 0；**16 个清位全部 `after=0`**；cfg 收窗 `sameAsStart=true`（sha 回 `7C3933F9…`）。
- 判：机制面 ✓（roll/divisor/cleared/清后停全对）。**A-1 说明**：R196 的「期望 256 次生长」寿命语义在 TE 被 moisture 洗掉后无从累积；修复后该项才具完整产品意义（B-3）。

## §10 W-F10 · 踩踏

- **稳定施肥位**（moisture0 + 作物 + TE）：`fertilized trample-deny pos=-76,67,255` 1 行，块仍 `farmland` ⇒ 施肥半的 D-2 免踩 ✓。
- **普通耕地**（无 TE）：`trample allow pos=-76,67,258 fertilized=false` 1 行，块变 `Dirt` ⇒ 对照面 ✓。
- **衰减位**（P7[0]，moisture 已 7→0）：`trample allow pos=-82,67,255 fertilized=false`，块变 Dirt ⇒ **A-1 的端到端证据**（施肥位在 moisture 变后不再免疫）。

## §11 W-F11 · 丰收增量

产品面（`ETIMFarmingEvents.onHarvestDrops`，D-8）：`fraction=level/maxLevel`、`extraChance=fraction×harvestingYieldFactor`、对主作物 base 个逐个 `rand<extraChance` 掷、命中加一叠。

- **小麦 N=200**（harvesting L5 镰）：**200/200 行**；`fraction={1}`、`factor={0.5}`、`base={1}`、`extraMax=1`；`extra>0` 命中 **88**＝0.44，带 [0.3939,0.6061] ⇒ ✓。
- **胡萝卜 N=60**（harvesting L5 锄，逐刀串行）：**59/60 行**；`base∈{1,2,3,4}`、`extraMax=4`、`extra>base` **0**、per-item 命中率 1→0.4／2→0.867／3→0.76／4→1（随 base 单调，符合逐项 0.5 掷）；`fraction={1}`、`factor={0.5}` ⇒ ✓。
- 种子面：wheat 的种子为 `minecraft:wheat_seeds`（≠主作物），不计入 base、不参与 extra（R196 `:352-353`）；carrot 的「种子」在 1.12 即 `Items.CARROT`，与主作物同物 ⇒ base 含 1 主 + 0..3「种」（C-2）。

## §12 W-F-CFG · farm 8 键首启

- 起值：`run/config/etim.cfg` **38,271 B / 199 键**（`D81CC6E9…6D042`，melee1 收口态——本批首启前）。
- 首启后：**39,968 B / 207 键**（+1,697 B / +8 键）：类目 `farm {` 首落、8 键全在、值 8/8 与代码默认逐一相等（见 §0 行）；`farmDebugLog` 默认 false（判据窗临时开，收窗复原）。
- 收窗：回填到 **39,968 B `7C3933F9…A0BA`**（`sameAsStart` 于 consume 窗复核 true）；`fertilizedConsumeDivisor` 回 256；obf cfg（30,524 `262BFF5E…`）零客户端未重写（C-3）。

## §13 A-1 · 施肥位 TE 持久性缺陷（A 级）

**现象**：施肥位在 moisture 状态第一次变化时丢失；生长增速、消耗、踩踏免疫、置位链的持久面随之全灭。

**一手（R196）**：`BlockFarmland.setWetness(metadata, wetness) = metadata & ~7 | wetness & 7`——**保留 bit 8**（`mite-src/decompile/src/net/minecraft/BlockFarmland.java:180-182`）；干燥/灌溉两条路径都用 `setWetness`（`:56`、`:60`、`water()` `:204-208`）；`onFallenUpon` 对 `isFertilized` 早退（`:78`）。⇒ R196 的施肥位**跨 moisture 变化存活**，只随块消失。

**1.12 现体（本批落码）**：`ETIMFarmlandTile extends TileEntity`，**未覆写 `shouldRefresh`**。Forge `TileEntity.shouldRefresh`：`isVanilla = getClass().getName().startsWith("net.minecraft.")`；非 vanilla 走 `oldState != newState`（对象不等，`TileEntity.java:401/412-415`）。`BlockFarmland.updateTick` 的 `world.setBlockState(state.withProperty(MOISTURE, …))` 会换 state 对象 ⇒ `Chunk.setBlockState` 里 `te.shouldRefresh(...)=true` ⇒ `world.removeTileEntity(pos)`（`Chunk.java:613-614`）。**任何 moisture 变化（干燥 7→6、灌溉 0→7、降雨）都会清掉 TE**。

**运行证据**（同 HEAD `e15795f`／同钉值）：
- TE 探针（`-teprobe.out`）：A（moisture7，无水源）growth **4** 行后停、moisture 落 0；B（moisture0）**38** 行持续；D（moisture0→强制 `setblock farmland 7`）**冻在 28** 行。
- 主窗：P7（moisture7）growth **8** 行后停、末态 moisture=0；衰减位踩踏 → allow（§10）。
- 链窗：稳定位（moisture0）deny ✓；一旦 moisture 变化即 allow（同一窗口的 A-1 端到端面）。

**修复建议（一句话）**：`ETIMFarmlandTile` 覆写
`public boolean shouldRefresh(World world, BlockPos pos, IBlockState oldState, IBlockState newState) { return oldState.getBlock() != newState.getBlock(); }`
——同块 state 变化保 TE（对齐 R196 bit-8 语义），块变（turnToDirt/破块）仍随块销毁。修复后单点回归：W-F7 持久面、W-F8 增速寿命、W-F9 消耗寿命、W-F10 衰减位 deny。

## §14 冲突分级（A 1／B 3／C 7）

### A 级（1）

- **A-1（施肥位 TE 持久性）**：见 §13。`ETIMFarmlandTile.shouldRefresh` 未覆写 ⇒ 任何 moisture 状态变化清 TE，施肥位在正常农田只能活几秒；R196 `setWetness` 保留 bit 8。影响 W-F7 持久面／W-F8 增速寿命／W-F9 消耗寿命／W-F10 衰减位 deny。修复一行 + 单点回归。

### B 级（必送裁，不阻塞本窗判据）

- **B-1（vanilla hoe 的 F6  harvest 面死）**：W-F1 判 `minecraft:iron_hoe` 两条 carrier 真、W-F3 的 tillage 也能走 `MixinItemHoe`；但 **F6 harvest roll 只接在 ETIMItemHoe／ETIMItemMattock／ETIMItemScythe 的 `onBlockDestroyed` 覆写里**——vanilla `iron_hoe` + fertility L5 收成熟胡萝卜：作物确被挖掉（`blockAfter=air`）而 `fertility harvest` 行 **0**（`-preflight-mech.out` vanillaHoeHarvest 臂、`-digprobe.out` 复证）。R196 的 `ItemHoe` 基类有该面。需裁：收紧 `canApplyAtEnchantingTable`（去掉 vanilla ItemHoe）或给 vanilla ItemHoe 补一条 `onBlockDestroyed` mixin。
- **B-2（频率窗工装口径）**：主窗内联的频率臂在服务器负载升高后出现「每轮 8 dig 只落 1 行」（`/etest dig` 的 per-player `destroyPos` 串行面 + 低 TPS）；W-F6／W-F11 小麦的 N=200 正本改由独立**频率窗**（200/200）收、胡萝卜改由**逐刀串行窗**（59/60）收。判据通道（[FarmLog] 行）不变；主窗内联数据只作旁证。
- **B-3（W-F9 寿命不可整窗观测）**：「期望 256 次生长耗尽」在单窗内不可直接观测；以 `divisor=256` 常态行的 roll/cleared 机制面 + `divisor=2` 翻转臂（16 清位、清后 growth 全 0）判。A-1 修复后再验寿命累积。

### C 级（登记不阻塞）

- **C-1（W-F2 窗口笔误）**：任务书写 `L4=31..999·L5=999`；案 M 实算 `L4=31/40 L5=41/999`（与 disarming 对照同列）。判采用实算。
- **C-2（胡萝卜 base 带）**：任务书写 2..5；实测 **1..4**（1.12 `BlockCrops` 1 个主作物 + 0..3 个「种子」，carrot 的 seed 与 crop 同为 `Items.CARROT`；增量面不变，仅结构差）。
- **C-3（obf cfg 未重写）**：零客户端 ⇒ `run/obfuscated/config/etim.cfg` 30,524 未动、farm 节只在 dev cfg；与前批「零客户端 obf 不动」同口径。
- **C-4（W-F6 措辞）**：任务书写「锄收小麦」，但 F7 矩阵 wheat = scythe exact；本窗用**镰**收小麦（矩阵合法臂），锄收小麦已在 W-F5 负臂判 0 行。
- **C-5（W-F8 对照 maturity 采样）**：P0 的 growth 行 **0**（判点面 ✓）；maturity 采样落在生长窗尾部低 TPS 时段，age=0 不足以作「真生长」正证，登记不阻塞（修复窗可补一次独立基线）。
- **C-6（TE 直读通道）**：1.12 无 `/data get`；`/testforblock` 对 farmland 的 TE NBT 不可读（`CommandTestForBlock` 走无参 `hasTileEntity()`，farmland 为 false）⇒ 施肥位状态以行为链（growth/clear/trample 行）＋ `/fill` NBT 置位 ＋ 源码/字节码判（纪律 9 允许面）。
- **C-7（矩阵工装坑）**：farmland 的 `onBlockAdded` 在「上方为实心」时自转 DIRT（1.12 面）⇒ 环位已有 farmland 时直接垫 `farmland(by-1)` 会把作物饿掉；本窗改为先清 y=by 位再垫（后续 farm 窗须照此）。

## §15 零回归与钉值/收口

| 面 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `e15795f`（`e15795f2eec57691a15ca6984f9f55929c77d67e`） | 同（窗内零提交） | ✓ |
| release jar | 864,429 B `605F2A587ACCC0D14B2035ED6432500FBD1583E3D3C712FC4E73760FD0EEA376` | 同 | ✓ |
| dev jar | 847,186 B `49C18E2C066B173A6409D4E6E2F2DE87ED49F026771774AFB4D308668E2EAD16` | 同 | ✓ |
| sources jar | 793,694 B `9AC86EF73DD0E24B5CFA5F7DCD58810F74AC4D5356BDB05DF9DCFDE307F06307` | 同 | ✓ |
| refmap 双树 | 67 类键／152 条目（`build/resources/main` ↔ `build/tmp` 同值）；双端计法 152×2=**304 面**；`MixinBlockCrops` 2 条（+getGrowthChance）、`MixinBlockFarmlandTile` 0 条（remap=false，无 searge 项＝预期） | 同 | ✓ |
| mixins 清单 | 62／client 10（+1：MixinBlockFarmlandTile） | 同 | ✓ |
| cfg（dev） | 38,271 `D81CC6E9…6D042`（199 键） | 首启 39,968（207 键）→ 判据窗开 gate、收窗回填 **39,968 `7C3933F9…A0BA`**（gate=false、divisor=256） | ✓ |
| cfg（obf） | 30,524 `262BFF5E…C9AD` | 同（零客户端未重写） | ✓（C-3） |
| server.properties | 890 `3009633863…654A48` | 同（回填 identical） | ✓ |
| 零回归 | — | 镰 attacking decay 四行 **400/100/400/100**（vampiric 分支）；`MeleeLog` **0**；pool 前 8 条窗口零变 | ✓ |

| 收口面 | 状态 |
| --- | --- |
| boot 计数 | **8**：预飞 A／预飞 B（mech）／主窗／TE 探针／频率窗／胡萝卜窗／链窗／consume 窗 |
| 客户端 | **零会话**（未拉起、未截屏、未抢焦点） |
| 产品码 | **0 行**（窗内零提交；驱动/证据/日志全落 `testharness/**`） |
| 进程/端口 | 端口 25565 收 **0**；crash-reports 19＝19（零新增）；末 boot `stop` exitCode 0、BUILD SUCCESSFUL |
| 世界 | 8 个 `run/farm1*` 目录收窗全删（`worldRemoved=true`，复核无残留） |
| 门控 | `farmDebugLog` false→true（判据窗）→false；`fertilizedConsumeDivisor` 256→2（翻转臂）→256；其余 cfg 未动 |
| 判据档 | `build-logs/farm1-wf-evidence.json`（主窗）／`-freq-evidence.json`／`-carrot-evidence.json`／`-chain-evidence.json`／`-consume-evidence.json`／`-preflight-evidence.json`／`-teprobe-evidence.json`／`farm1-wf-judgment.log`（81 行锚）＋各窗 `.out` |

## §16 未覆盖面（不补白）

1. **权重分布／sampling／pool size 分布**：沿 W63 终审不判，只留 `pool` 信息位。
2. **纯客户端面**（田块外观、施肥粒子、HUD）：按纪律转用户操作/另窗。
3. **R196 湿度系统（wetness 半）**：D-2 只收施肥半，湿度系统批另案（census 挂账）。
4. **bonemeal 触发面**：1.12 `BlockCrops.grow`（骨粉）不走 `onCropsGrowPost`，本窗不判；R196 亦只认随机 tick 成功面（D-7 口径）。
5. **A-1 修复后的复验**：W-F7 持久面／W-F8 寿命／W-F9 寿命／W-F10 衰减位 deny——留给修复链后的单点回归窗。

## §17 自报（机械核讫）

> 文件：`testharness/reports/farm1-WF-verdict.md`｜字节五项：size 25,851 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 220（split 行数 221）
> 三口径（家族同型：melee1-WE2／enchant1-WE1／farm1 对照报告）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序换行连接后再 SHA-256）。
> SHA-256 甲（全档零位）`EBD16E87F1CD38EEDA80B805470E8A0B2CF26D7211AE0C62A3E32AE0F199FE02`
> SHA-256 乙（LF 归零零位）`EBD16E87F1CD38EEDA80B805470E8A0B2CF26D7211AE0C62A3E32AE0F199FE02`
> SHA-256 丙（行链零位）`B3FDF5F07D362513888AAB0BC49B0F1D2B9D0B3F56226D1EF22461ED9585F171`
> 判格 12＝✓ 11／✗ 1｜锚：W-F1 43 reg＋ids／W-F2 14 组窗／W-F3 `:3591-3607`＋`:4010-6381`／W-F4 4 臂＋token／W-F5 7 臂／W-F6 `-freq:2816-7432`／W-F7 `-chain:2797/2798/2807/3315`＋A-1／W-F8 `:10865-22357`／W-F9 `:10924-21608`＋`-consume:2764-3370`／W-F10 `:17498…18104`／W-F11 `-freq:7600-11490`＋`-carrot:2793-11138`／W-F-CFG 首启快照｜钉值：8 boot／0 rebuild／0 客户端／0 产品码｜冲突 A1 B3 C7。
> 注：首行「报告字节规格」里的 ✓/✗ 计数是**全档判据符的机械计数**（工具口径，含表格逐行 ✓、A-1 叙述里的 ✗），判格以本行的十二点四值为准（✓ 11／✗ 1）。
