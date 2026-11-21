# 六期 D-1 耕湿批 · **W-FM7 单点回归判决**（B-3 三级成熟 ＋ B-4 室内门，修·甲）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-04（CST）｜**窗口形态**：**正式 2 boot**（b1 判臂＋b2 存档重载）＋ pilot 1 boot ＋ 作废 1 窗（2 boot，工装两处缺陷）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`14,290 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 9 / ✗ 11｜102 行`
> **判决源**：条 284 修·甲（HEAD `37e95ab`）＋ W-FM1 判决（`farmlandmoist-FM1-verdict.md`）＋ R196 一手 `ItemManure.java:9-78`／`BlockMushroom.java:121-123,160-217,219-241`／`BlockMycelium.java:139-154`／MITE `World.java:5658-5879`
> **钉值**：HEAD **`37e95ab`**（窗内零提交）｜release 954,594 B `01BAF6E2…126B`｜dev 935,759 B `F59C8714…42B8`｜sources 867,944 B `146C945A…97B6`｜refmap 双树 74 类键／164 面｜mixins 69＋client 10｜cfg 44,173 B／235 键／`90652ABD…4E9A`（dbg=false）｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**FAIL**（R1a／R1b／R1c／R2 ✗；R3／R4 ✓）｜**A 2／B 2／C 3**
> **一句话**：红臂的 `legalOut=canSeeSky` 与 `canBlockStay` 的 `light<13` 互为反条件（双探针实证：露天位 canBlockStay 假、室内凹位 canSeeSky 假，两门无一配置能同真）⇒ 红臂 43 手 0 行 0 耗；而新 stage 载体**根本没挂上**（`Chunk.addTileEntity:882` 只对 `hasTileEntity(state)=true` 的方块收 TE，蘑菇未过 `MixinBlockFarmlandTile` 那道桥，`setTileEntity` 被静默丢弃）⇒ 全场 19 次进位点击全部停在 `stage=1/3`、**0 巨型**，三级成熟面实际不可达（比 W-FM1 前更差：连巨型都不会出）。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1a** 红点击臂 stage 链（室外草地 40 手＋重摆） | `fertilize src=manure kind=red roll=x.xx stage=n/3 giant=0\|1` | 每手 1 行；掷中递进 1/3→2/3→3/3（第 3 次掷中出巨型）；掷未中 `stage=-1` 不动 | **0 行**（43 手：40 打蘑菇＋3 打下方草地；`step=useblock` 43 条）；**0 消耗**（40 手 delta 全 0）；蘑菇仍在。同点 L0 探针证 `canBlockStay=true`（换邻更新未掉），而门仍拒 | ✗ |
| **R1b** 棕点击臂 10 手（室内菌丝） | `kind=brown roll= stage=` | 同构递进，第 3 次掷中出巨型 | **10 行**：掷中 5（roll 0.44／0.14／0.12）全 **`stage=1/3`**；掷未中 5 全 `stage=-1` 且**各扣 1**（5→4→…）；**0 巨型** | ✗ |
| **R1c** 菌丝 TOP 6 手＋室外 1 手 | `chain=mycelium roll=none stage=n/3 giant=`／`outdoor=1` | 每 3 击出巨型（2 程 6 行 1/3,2/3,3/3）；室外 1 击白耗不长大 | 室内 6 手**全 1/3**、0 巨型；室外 1 手 `outdoor=1 stage=-1`、扣 1、蘑菇存活 ✓；补顶后 3 手仍 1/3 | ✗ |
| **R2** stage 载位（重种归零／存档重载不回零） | `stage=n/3` | 重种＝0/3 重计；载后 stage 在案 | 重种前两手 1/3,1/3（应为 1,2）；重种后 1/3；载前 1/3 → 载后 1/3（载体未生效，该面不可判） | ✗ |
| **R3** farm TOP 一次＋已肥二击＋未中扣 1 | `fertilized set … value=true`＋`chain=farm soilEnrichment=1` | 首击成功 5→4；二击 FAIL 不扣；掷未中亦扣 1 | set=1、soil=1、held 5→4；二击 **0 行**、held 仍 4；R1b 未中 5/5 各 −1 | ✓ |
| **R4** 收口 | 钉值五项 | 起收全同 | §6（全同；mixinFail 0；cfg 235；obf 未动；端口 0；crash 21） | ✓ |

> 判格 6＝**✓ 2／✗ 4**。R1b／R1c／R2 的 ✗ 同源于 **A-2（载体不挂）**；R1a 的 ✗ 源于 **A-1（两门互斥）**，两者互相独立。

## §1 双探针：红臂两门互斥的实证（L0／L1）

> 手法：vanilla `BlockBush.checkAndDropBlock`（`neighborChanged` → `canBlockStay`）会在邻更新时把「不合法」的蘑菇拔掉。故**扛过一次邻更新 ⇔ canBlockStay=true ⇔ `getLight(pos)<13`**（`BlockMushroom:100-103`）。探针落点与我方点击位同格，不参与判分。

| 探针 | 场 | 实测 | 读法 |
| --- | --- | --- | --- |
| **L0a** 凹位（R196 合法位：菌丝/草地＋无直射天＋同一 y 三格外有露天柱） | 蘑菇 (197,140,700)，顶板 143，露天柱 x=200 | 邻更新**存活** | `canBlockStay=true`（光 ~12<13）⇒ 门的 `legalLight` 项**已满足**；但 `canSeeSky(197,140,700)=false` ⇒ `legalOut` 项**必假** ⇒ 臂拒 |
| **L0b** 露天对照（同 y、无遮挡） | 蘑菇 (186,140,700) | 放下即可见、**邻更新即被拔** | `canBlockStay=false`（天光 15，`Chunk.getLightSubtracted:747-756` 取 max(天光−0, 块光)，**与昼夜无关**）⇒ `legalLight` 项**假**；而 `legalOut`（`canSeeSky`）**真** |
| **L1** 方块 TE 声明 | `testforblock 168 140 700 minecraft:brown_mushroom 0 {EtimMushroomGrowth:999,EtimBogusKey:1b}` | **命中**（假 key 也被接受） | `CommandTestForBlock:81` 的 NBT 比对门是 `block.hasTileEntity()`；蘑菇为 `false` ⇒ NBT 整段跳过。与 A-2 同一根因 |

- **结论（A-1）**：`legalOut = red ? canSeeSky(pos)` 与 `legalLight = canBlockStay`（草地分支 `getLight<13`）在几何上互斥——**露天则光 15、遮顶则 canSeeSky 假**。红臂无任何配置可通过，属判据不可满足，不是概率/工装问题。
- **对照（判据链可信）**：同一窗内 R1b（棕臂）/R1c（TOP 臂）行型、消耗、`outdoor=1` 白耗面全部正常落行，说明 `useblock` 通道与我方站位（眼高算距 2.29，≤2.5 口径）无碍。

## §2 R1a 红臂（43 手）

- **场**：凹位（菌丝/草地 AY−1，蘑菇 AY，顶板 AY+3，露天柱 x=200，同一 y 三格内 ⇒ MITE `isOutdoors` 真、`isLegalAt` 真、`isLegalOn`（草）真、光 12 在 0..15 内 ⇒ **R196 判定为合法施用位**）。
- **实测**：`step=useblock` **43** 条 → `[FarmLog] fertilize` **0** 条；40 手 `held` delta **全 0**；终点 `testforblock` 红蘑菇**仍在**。露天对照 3 手同样 0 行 0 耗。
- **归因**：L0a 已证该位 `canBlockStay=true`，故三个门里只有 `legalOut` 为假（`canSeeSky=false`）；露天对照则只有 `legalLight` 为假。两门互补 ⇒ 无解。
- **附带静态核讫（B-1）**：R196 另有一条红臂入口 `ItemManure.java:50-51`——点**红菇下方草地**的 TOP 面会递归到红菇；我方 `onItemUse` 无该分支（block==grass 落到末尾 `PASS`）。本窗那 3 手打草地的站位距 2.91，可能已超非工具 reach，**不作实测判据**，仅列静态差。

## §3 R1b／R1c：载体不进位（A-2 的现场证据）

- **R1b 原始行**（室内菌丝，10 手）：
  `roll=0.53 stage=-1`／`roll=0.79 stage=-1`／`roll=0.44 stage=1/3 giant=0`／`roll=0.78 stage=-1`／`roll=0.56 stage=-1`／`roll=0.14 stage=1/3 giant=0`／`roll=0.12 stage=1/3 giant=0`／`roll=0.57 stage=-1`／`roll=0.67 stage=-1`／`roll=0.56 stage=-1`
  ⇒ 掷中三次（0.44/0.14/0.12）按 R196 `incrementGrowth` 应读 **1/3→2/3→3/3(巨型)**，实测**三次全 1/3**、无巨型。
- **R1c 室内 6 手**：全 `stage=1/3 giant=0`，0 巨型（同一朵连续 6 击不重摆）。
- **R1c 室外 1 手**：`roll=none outdoor=1 stage=-1 (no-grow; manure consumed)`，`held` −1、蘑菇存活 —— **B-4 白耗面本身成立**（与 pilot P5 同形）；其后补顶 3 手仍是 1/3,1/3,1/3。
- **根因（一手）**：`ETIMItemManure.etim$stage` 用 `world.setTileEntity(pos, new ETIMMushroomGrowthTile())`；`World.setTileEntity:2641` → `Chunk.addTileEntity:876-891`，其唯一写入口在 **`:882` `if (this.getBlockState(pos).getBlock().hasTileEntity(state))`**。`Block.hasTileEntity` = `isTileProvider`（`Block.java:1610-1613`，默认 false），蘑菇未覆写 ⇒ **TE 被静默丢弃**，`get()` 恒 null ⇒ 每次掷中都从 0 起算 ⇒ 永远 1/3。
- **同仓已有解法**：农田施肥位走的是完全同一套 seam，能生效是因为 `MixinBlockFarmlandTile` 对 `Blocks.FARMLAND` 注入 `hasTileEntity→true` ＋ `createTileEntity→ETIMFarmlandTile`（`MixinBlockFarmlandTile.java:35-58`）。蘑菇缺这两针。
- **附带（B-2）**：修述称「生成失败恢复原块、stage 保 3 下一击重试」——即使补上上述桥，`generateBigMushroom` 先 `setBlockToAir`（`BlockMushroom:113`）再于失败时 `setBlockState(pos, state, 3)`（`:131`），而 `Chunk.setBlockState:611-620` 在 block 变更时按 `shouldRefresh`(默认 true) 移除 TE ⇒ **还原后 stage 回 0**，与修述不符（R196 原版失败时蘑菇直接消失、无还原，属另一条差异）。本窗未做无空间臂，列静态核讫。

## §4 R2 stage 载位

- **重种**（室内 TOP 位，两步）：连击两手 → `1/3`、`1/3`（应 1、2，已见 A-2）；`setblock air` → 重摆棕菇 → 一击 `1/3`。
- **存档重载**：b1 一击得 `1/3` → `save-all` → 优雅停 → **b2**（同世界 1.068 s 载入）→ 蘑菇仍在、再一击 `1/3`（若载体生效应为 2/3）。
- 结论：两子面都被 A-2 阻断，**不可单独判定**；登记为 ✗（随 A-2 复验）。

## §5 R3 farm TOP 面（✓）

- 首击：`fertilized set pos=206,139,700 value=true` ＋ `fertilize src=manure chain=farm soilEnrichment=1`，`held 5→4`。
- 二击（已肥）：**0 行**、`held` 仍 4 ⇒ A-2「已肥不消耗」保持。
- 掷未中扣 1：R1b 的 5 次 `stage=-1` 各 −1（5 次全中），A-1 消耗面在案。
- 前置按 C-12 先 `setblock air` 再 `farmland`（清旧 TE），臂一次复现。

## §6 R4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `37e95ab`／收 `37e95ab`（零提交） |
| jar | release 954,594 B `01BAF6E2B1EDD5B5371193CFD216ED2FAFDE604A4279B01C2B07726D2267126B`；dev 935,759 B `F59C8714864F81EE307B4B8B8EFE246F5010D17F500844F91164C5CEA80042B8`；sources 867,944 B `146C945A54DE39CD8335DEC279B14D65B0780C0E20A7B1C5ECC47CD0661097B6`（起收同值） |
| MK | refmap 74 类键／164 面（双树同）；mixins 69＋client 10；mixinFail **0**（两 boot 各 0） |
| cfg | 44,173 B／235 键／`90652ABD…4E9A`；`farmDebugLog` 收口回 false |
| obf | 30,524 B／`262BFF5E…C9AD` 未动 |
| props | 938 B／`1C815ED2…EC58`／`level-name=world`（起收同值） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；`f7we` 已删；无残留**游戏** JVM（常驻 java 仅 Gradle daemon／worker，非本窗起） |
| 停服 | b1／b2 均 exitCode **0**＋`BUILD SUCCESSFUL` |
| 零回归 | 五通道 Melee/Mining/Butch/Arrow/Ench **全 0**；`food` 0（b1）／0（b2）；无 crash、无 mixin 错 |

## §7 冲突分级

- **A-1（红臂两门互斥，判据不可满足）**：`legalOut = canSeeSky(pos)` 与 `legalLight = canBlockStay`（草地 `getLight<13`）互补。修向：①「室外」改 R196 `isOutdoors`（MITE `World.java:5658-5879` 的同 y 7×7 洪水＋`getPrecipitationHeight<=y`；或等价粗桥并写清真值表）；②红臂合法位改 R196 `isLegalAt`=`!canBlockSeeTheSky`（`BlockMushroom:121-123`，红菇 `getMaxAllowedLightValue=15` 无光强门），不要再用 `canBlockStay` 的光强项。
- **A-2（stage 载体未挂载，功能不可达）**：`Chunk.addTileEntity:882` 的 `hasTileEntity(state)` 门；蘑菇需与 `MixinBlockFarmlandTile` 同构的两针（`hasTileEntity→true`、`createTileEntity→ETIMMushroomGrowthTile`，过滤 BROWN/RED）。现网效果：任何蘑菇**永远不会出巨型**（掷中恒 1/3），比 W-FM1 前（1 击成菇）更差。
- **B-1（红菇草地面入口缺失 · 静态）**：R196 `ItemManure:50-51` 点红菇下方草地的 TOP 面递归到红菇；我方 `onItemUse` 无此分支。本窗未实测（超 reach），待 A-1 修后补判。
- **B-2（还原失败不保 stage · 静态）**：`BlockMushroom:113/131` ＋ `Chunk.setBlockState:611-620` ⇒ 失败还原后 TE 已被移除，与修述「stage 保 3 重试」不符；且 R196 原版失败即失去蘑菇。需二选一并写清。
- **C 级（本窗新增 3）**：
  - **C-14** 工装：R1c 室外臂在 `clearTop` 之后又补了一次 `fill … air`，把刚摆的蘑菇清掉（作废 1 窗）；正式窗已删该行。
  - **C-15** 工装：boot 2 段误用 boot 1 的块级 `from`（作废同窗第二 boot）；正式窗改局部变量。
  - **C-16** 探针法入册：`testforblock` 的 NBT 段仅对 `hasTileEntity` 方块生效，**对农田/蘑菇的 TE 断言一律空转**（此前 W-FM 的 `{EtimFertilized:1b}` 命中只证方块在、不证 TE）——今后 TE 面判据改用「行为行型」或换判定通道。
- **承接不改**：C-1／C-2／C-3／C-4／C-5／C-7／C-8／C-9／C-10／C-11（首次 useblock 丢包，本窗 2 boot 各预热 1 击、均 0 行 0 耗）／C-12（同态 setblock 不重建 TE，R3 已按 air 前置）／C-13 状态不变。

## §8 自报（机械核讫）

> 正本：`testharness/reports/farmlandmoist-FM7-verdict.md`｜byte 五项：`14,290 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 101（split 102）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`CC2B060EDA8F351A6649E3879FD13D5DC86E1AF84315D13F86A7F9CEC2C1DBA7`
> SHA-256 乙（LF 归零零位）`CC2B060EDA8F351A6649E3879FD13D5DC86E1AF84315D13F86A7F9CEC2C1DBA7`
> SHA-256 丙（行链零位）`42816FCEEA46A0A8A6FEC6431BAC2DFCDC7B523722CBB68AE1839BED743096CA`
> 判格 6＝✓ 2／✗ 4｜R1a 43 手 0 行 0 耗｜R1b 10 行（5 掷中全 1/3、5 未中 −1）｜R1c 室内 6 手全 1/3、室外 outdoor=1 白耗 ✓｜R2 重种与载后皆 1/3｜R3 set=1 soil=1 5→4、二击 0 行｜钉值 5 boot（正式 2＋pilot 1＋作废 2）／0 rebuild／0 客户端／0 产品码
> 收口：HEAD `37e95ab` 零提交｜jar 954,594/935,759/867,944 起收同值｜MK 74/164、mixins 69+10、mixinFail 0｜cfg 44,173 B/235 键/`90652ABD`（dbg=false）｜obf 30,524 B `262BFF5E` 未动｜props 938 B/level=world/`1C815ED2`｜端口 0｜crash 21 无新增｜b1/b2 exit0＋BUILD SUCCESSFUL｜世界 `f7we` 已删。
