# 枯萎（blight）· **W-B13 判决**（B-13 批，ETIMBlight／BlockCrops 家族，HEAD `d482d57`）

> **HEAD**：`d482d57`（`d482d571`+，窗内 **0 提交**，起收同）｜**jar**：`build/libs/etim-1.0.0.jar` **1,030,513 B**｜SHA256 `B0B66380E108B5205BC48D4126D083713F50A4E3581AAFDC3A526F369C4AFBAD`｜MD5 `791B3D0FBCFCEFAE8F872B9F456BC517`（起收同值，**0 rebuild**）
> **附属钉值**：dev 1,010,465 B `A5E8A525…`｜sources 937,264 B `D9C429C7…`｜**refmap** 84 classes / 189 entries（dual 378，两棵树同值）｜**mixins** 80 + 10 client｜jar entries **1,111**（`ETIMBlight`／`MixinBlockCrops`／`MixinBlockCropsTick`／`ETIMBlockDeadPlant` 均嵌）
> **窗口**：2 boot（`Done (5.376s)`／`Done (1.078s)`，`mixinFail=0` ×2）＋2 停服（exit 0＋BUILD SUCCESSFUL）｜单假人 `ETIM_F7`｜世界 `w-b13v`（收口删）｜**0 客户端／0 产品码改动／0 rebuild**
> **旗面**：boot1 `blightR196=true` → boot2 `blightR196=false` → 收口回写 `true`；`farmDebugLog`／`growthRateR196` 全程 true
> **判决**：**R0 ✓｜R1 ✓｜R2 ✓｜R3 ✓｜R4 ✓｜R5 ✓｜R5b ✓｜R5c ✓｜R6 ✓**（9 臂全 ✓）
> **报告四值**：`14,042 B｜UTF-8 无 BOM｜LF｜首字节 0x23｜CR 0｜U+FFFD 0｜125 行｜✓ 24 / ✗ 2`

## §1 逐臂判读

| 臂 | 判据 | 实测（关键计数） | 判 |
| --- | --- | --- | --- |
| **R0** 干净 boot 双面 | Done＋`mixinFail=0`＋钉值＋旗面＋死株载体注册 | b1 `Done (5.376s)` / b2 `Done (1.078s)`，`mixinFail=0`×2；jar／dev／src 三值同钉值；refmap 84/189（dual 378）双树同；mixins 80+10；cfg `codeKeys=246/fileKeys=248`；两 boot 均落 `[FarmLog] dead-plant carriers registered (dead_crop/dead_stem, no ItemBlock)`；hutWatch `cc@4s=false cc@8s=false oo@4s=true oo@8s=true` | ✓ |
| **R1** bit8 往返＋farmland skip | `forceSet` 后 meta 11 ✓、probe `blighted=1`、farmland `seat=0`＋skip 行 | before=0 → after=1；meta11=true、meta3=false；farmSeat=0、farmSkip=true；probe before `blv=15 lowLightP=0.00002500 seat=1`、after `blighted=1`；`blight src=forceSet pos=305,100,845 ->skip (not a blight seat)` | ✓ |
| **R2** 低光面 | open／covered 两格 probe 的 `lowLightP` 比 ≈16（±1.5 内）＋covered 紧窗 roll 不 set | blv 15 / 0；pOpen=0.000025、pCovered=0.0004；**ratio(covered/open)=16.000**（任务书字面口径 open/covered=0.0625）；coveredHit=0、coveredSetAfter=0、skips=0 | ✓ |
| **R3** 血月工具面 | `forceBloodMoon` 掷中即 set 落 meta11＋probe；覆盖格 20 掷 `lightOk=0` 全 miss 不 set | openTries=1、roll=0.0727 hit=1 lightOk=1、probeAfterHit=1、meta11=true；coverDice=20、lightOk0=**20**、coverHits=6、coverSetAfter=**0**、skips=0 | ✓ |
| **R4** 骨粉双拆 | 枯株 use→unblight 行 1＋余额留 2＋probe blit=0＋meta 回 3；非枯株→blight 行 0＋余额留 2＋meta 仍 3 | unblight=1、left=2、blit=0、meta3=true、meta11=false；denyLeft=2、denyRows=0、denyMeta3=true、denyBlit=0 | ✓ |
| **R5** 死掷＋蔓延 | rts512 内 20 s：`dead1of64≥1`、`spread≥1`、`targets≥1`；成熟株→`dead_crop`＋age 6 | seeded=9、**dead=11**、**spread=14**、targets=14、lowLight=0；成熟株 `age=7 ->dead age=6` 且 `etim:dead_crop` testfor ✓ | ✓ |
| **R5b** 枯株零掉落 | `setblock … air 0 destroy` 双对照：枯株 noDrops 行 1、健康株 0、健康株同座 meta 3 无变 | noDrops=1；fresh3=true／blit11=true；healthy3=true、healthyNoDrops=0、healthyBlit=0、healthyMetaAfter=true | ✓ |
| **R5c** 死株静默 | dead_crop 株在 rts512 下 8 s 内无任何 blight 行、且仍是 dead_crop | rowsAtDeadPos=0、windowBlightRows=0、deadStill=true | ✓ |
| **R6** 旗断对照 | master=0；forceSet 树 bit8 后 rts512 8 s 无 tick 行；vanilla 骨粉 age 4..7 一真＋blit=0＋余额减 1；destroy 枯株 noDrops 0 | master=0、blitMeta11=true、tickRows=**0**、grown=7、grownBlit=0、left=0（1 粒被消耗）、noDrops=0 | ✓ |

## §2 判行原文（控制台最新行，`b13-verify-b1.out` / `-b2.out`）

**R0 · boot 与载体**
- `Done (5.376s)! For help, type "help" or "?"`（b1，`mixinFail=0`）
- `Done (1.078s)! For help, type "help" or "?"`（b2，`mixinFail=0`）
- `[FarmLog] dead-plant carriers registered (dead_crop/dead_stem, no ItemBlock)`（b1／b2 各 1）

**R1 · bit8 与 farmland**
- `[FarmLog] blight probe block=minecraft:wheat pos=305,101,845 age=3 blighted=0 seat=1 master=1 blv=15 temp=0.80 humidity=0.400 biomeMod=0.800 lowLightP=0.00002500 bloodPhase=0 dedicated=1 opaqueAbove=0 outdoors=1`（b1:5258）
- `[FarmLog] blight src=forceSet block=minecraft:wheat pos=305,101,845 age=3 blighted=1`（b1:5267）
- `[FarmLog] blight probe … blighted=1 …`（b1:5275）｜`Successfully found the block at 305, 101, 845`（meta 11，b1:5283）
- `The block at 305, 101, 845 had the data value of 11 (expected: 3)`（meta 3 反证，b1:5292）
- `[FarmLog] blight probe block=minecraft:farmland pos=305,100,845 age=-1 blighted=0 seat=0 master=1 …`（b1:5313）
- `[FarmLog] blight src=forceSet pos=305,100,845 ->skip (not a blight seat)`（b1:5342）

**R2 · 低光两格**
- `[FarmLog] blight probe block=minecraft:wheat pos=313,101,852 age=3 blighted=0 seat=1 master=1 blv=0 temp=0.80 humidity=0.400 biomeMod=0.800 lowLightP=0.00040000 bloodPhase=0 dedicated=1 opaqueAbove=1 outdoors=0`（覆盖格，b1:5400）
- `[FarmLog] blight roll src=forceLowLight roll=0.536587 p=0.00040000 blv=0 alreadyBlighted=0 hit=0 pos=313,101,852`（b1:5371）
- `[FarmLog] blight roll src=forceLowLight roll=0.224801 p=0.00002500 blv=15 alreadyBlighted=1 hit=0 pos=305,101,845`（b1:5375）
- 覆盖格复测仍 `blighted=0`（b1:5806）

**R3 · 血月工具**
- `[FarmLog] blight roll src=forceBloodMoon roll=0.0727 hit=1 lightOk=1 force=dedicated-off pos=305,101,845`（b1:5424）＋`Successfully found the block at 305, 101, 845`（meta 11，b1:5438）
- `[FarmLog] blight roll src=forceBloodMoon roll=0.0929 hit=1 lightOk=0 pos=313,101,852`（b1:5452）
- `[FarmLog] blight roll src=forceBloodMoon roll=0.1310 hit=1 lightOk=0 pos=313,101,852`（b1:5732）
- 20 掷后覆盖格 `blighted=0`（b1:5806）

**R4 · 骨粉双拆**
- `[FarmLog] blight src=unblight block=minecraft:wheat pos=305,101,845 age=3 blighted=0`（b1:5941）
- `Cleared the inventory of ETIM_F7, removing 2 items`（b1:5950；非枯株侧 b1:6121 同为 2 → 两侧均只耗 1）
- `[FarmLog] blight probe … blighted=0 …`（b1:5956）｜`Successfully found the block at 305, 101, 845`（meta 3 回位，b1:6005）｜`… data value of 3 (expected: 11)`（b1:6008）

**R5 · 死掷／蔓延／成熟**
- `[FarmLog] blight src=dead1of64 block=minecraft:wheat age=7 ->dead age=6 pos=304,101,844`（b1:8343）＋`Successfully found the block at 304, 101, 844`（`etim:dead_crop`，b1:8348）
- `[FarmLog] blight src=dead1of64 block=minecraft:wheat age=3 ->dead age=3 pos=306,101,844`（b1:6560）
- `[FarmLog] blight src=spread dx=1 dy=0 dz=1 from=305,101,846 to=306,101,847 dstAge=3`（b1:6576）

**R5b · 零掉落双对照**
- `[FarmLog] blight src=noDrops block=minecraft:wheat pos=304,101,846 age=3`（b1:8426）
- 健康株 destroy 后：`Successfully found the block at 304, 101, 846`（同座重建 meta 3，b1:8436）
- 健康株 probe `blighted=0`（b1:8440）；健康株侧无第二行 `src=noDrops`（全档仅 1 行）

**R5c · 死株静默**
- `Game rule randomTickSpeed has been updated to 512`（b1:8459）后 8 s 窗口，`dead_crop` 座标无任何 `[FarmLog] blight …` 行；`Successfully found the block at 304, 101, 844` 仍为 `etim:dead_crop`（b1:8637）

**R6 · 旗断对照（b2）**
- `[FarmLog] blight probe block=minecraft:wheat pos=305,101,845 age=3 blighted=0 seat=1 master=0 blv=15 … lowLightP=0.00002500 …`（b2:1081）
- `[FarmLog] blight src=forceSet block=minecraft:wheat pos=305,101,845 age=3 blighted=1`（b2:1087）＋`Successfully found the block at 305, 101, 845`（meta 11，b2:1091）
- rts512 8 s 内 blight tick 行 **0**；骨粉后 `… data value of 7 (expected: 4/5/6)` 三行（b2:2179/2181/2183）＋`Successfully found the block at 306, 101, 845`（b2:2185）
- `Could not clear the inventory of ETIM_F7, no items to remove`（b2:2190 → 1 粒已消耗）
- destroy 枯株：无 `src=noDrops` 行（全档 0）

## §3 冲突分级

- **A 级：0**
- **B 级：0**
- **C 级：7（簿记／工装／口径，均不影响判值）**
  - **C-13-1**（簿记·MK_PIN）：`f7-wb-lib.MK_PIN` 仍钉 B-11 的 186 → `mkCounts().ok=false`；本窗按 B-13 实数自校（84/189，dual 378，80+10，jar 1,030,513／`B0B66380…`／`791B3D0F…`），封批时更新。
  - **C-13-2**（判据·比值方向）：任务书字面「open/covered」= 0.0625；R196 语义为 `(1−0/16)/(1−15/16)`，即 **covered/open = 16.000**（判 ±1.5 内）。两数并列登记，判用物理口径。
  - **C-13-3**（现象·hut 暗处）：hut 内作物在 4 s／8 s 均为 false（已 popped）。属 vanilla `canBlockStay` 光照面，与 R196 `isLegalAt` 同构，非 B-13 缺陷，登记备查。
  - **C-13-4**（工装·压力）：R5c 以 rts512 观察 8 s（烟测为 rts3／4 s），结论同向且更强；dead 株 0 行、`deadStill=true`。
  - **C-13-5**（工装·解析）：`b13-verify.json` 的 `arms.R5.mature` 因 kv 正则同键覆盖（`age=7` 被 `age=6` 覆盖）显示异常；已按原始行回填 `{age:7, deadAge:6}`，不改判。
  - **C-13-6**（互通·偏差）：smoke `grown=6` vs 本窗 `grown=7`，差 1，落在 vanilla 骨粉 2..5 段随机（4..7）内；其余互通项偏差 0，**未触发 >1 的 D 位问**。
  - **C-13-7**（建议·响度）：`MixinBlockCropsTick` 的 `updateTick` `@Inject` 未加 `require = 1`（refmap 有 `tickUpdateTick` 条目、本窗已生效）；建议与 B-12 的响度纪律对齐补齐，避免生产面静默失效。
- **D 级：1（待主会话裁定，附码值柱／R196 一手柱）**
  - **D-13-1｜`remap = false` 四注入的生产面风险**。`MixinBlockCrops.java:122`（`canGrow`）、`:131`（`canUseBonemeal`）、`:141`（`grow(World,Random,BlockPos,IBlockState)V`）、`:156`（`getDrops`）四处 `@Inject` 均带 `remap = false`；实测 refmap 的 `MixinBlockCrops` 条目仅有 `<init>`／`createBlockState`／`getGrowthChance(...)F`／`getMetaFromState`／`getStateFromMeta` 五项，**四目标均不在表内**（`cropsMissingRemap=["canGrow","canUseBonemeal","grow","getDrops"]`）。
    - **码值柱**：`src/main/java/io/github/etim/etim/mixins/MixinBlockCrops.java:122/131/141/156`（同文件 `:52` 的 `getGrowthChance` 显式 `remap = true` 且入表，可反证类级 remap 未被关闭）。
    - **R196 一手柱**：不涉装载面（语义面见 §1 R4／R5 已判 ✓；R196 `BlockCrops.java:151-159` 骨粉面、`:337-339` 零掉落面）。
    - **1.12 载体**：`build/rfg/minecraft-src/java/net/minecraft/block/BlockCrops.java:98-108`（`canGrow`／`canUseBonemeal`／`grow` 的 MCP 名）。
    - **风险机理**：dev 窗（MCP 名）四注入命中且行为全对；生产包（srg 名）四名不存在，叠加 `require = 1` → boot `Critical injection failure`。同项目 `MixinBlockFarmlandTile.java:39/51`、`MixinBlockMushroomTile.java:31/43` 的 `remap = false` 是 Forge 接口方法（`hasTileEntity`／`createTileEntity`，无 srg 映射），与本案 vanilla srg 方法不同。
    - **判窗能力**：本窗只跑 dev/MCP 面，**无法证伪**；建议主会话以生产包（obf 客户端或 `-Dmixin.debug.export=true` 的 release 构建）单点核查，若成立即生产面 A 级，须改回 `remap = true` 并重钉 refmap（预计 84/193）。

## §4 收口五件

1. **钉值起收同**：release 1,030,513 B／`B0B66380…`／`791B3D0F…`；dev 1,010,465 B／`A5E8A525…`；sources 937,264 B／`D9C429C7…`；refmap 84/189（dual 378）双树同；mixins 80+10；jar entries 1,111。
2. **boot 双面**：`Done (5.376s)`＋`Done (1.078s)`，`mixinFail=0`×2；两停服 exit 0＋BUILD SUCCESSFUL。
3. **旗面还原**：b1 `blightR196=true` → b2 `=false` → 收口写回开窗字节；cfg 48,559 B `1EC171882C4E63400113BC6FDCDBDC390755EE4E39F0412017F5D011D666EB39` 起收同（`blight=false/farm=true/growth=true/needs=true`，`codeKeys=246/fileKeys=248`）；props 939 B `7B5BABB6627DC8696477783BD43FBC7B54B9307752B534A9386A092ABC20D319` 起收同（`level-name=w-b13a`、`allow-flight=false`）。
4. **报告四值与三口径**：见文末。
5. **残留清理**：crash **21→21**；端口 **0→0**；GradleStart JVM **0→0**；HEAD `d482d571`→`d482d571`（窗内 **0 提交**）；`worldsLeft=[]`（`w-b13v` 已删）；obf 配置 30,524 B `262BFF5E…` 未动（`untouched=true`）。

## 附 §5 主会话 smoke 互通（`build-logs/f11-b13-smoke.json`，非判据）

| 面 | smoke | 本窗 | 偏差 | 判 |
| --- | --- | --- | --- | --- |
| R6 master | 0 | 0 | 0 | 同 |
| R6 tickRows | 0 | 0 | 0 | 同 |
| R6 grown | 6 | 7 | +1 | ≤1，vanilla 骨粉随机段 |
| R6 left | 0 | 0 | 0 | 同 |
| R6 noDrops | 0 | 0 | 0 | 同 |
| R2 pOpen | 0.000025 | 0.000025 | 0 | 同 |
| R2 pCovered | 0.0004 | 0.0004 | 0 | 同 |
| R2 ratio | 16 | 16.000 | 0 | 同 |

> 结论：无 >1 偏差，**不开 D 位问**。

> 正本：`testharness/reports/b13-verify-verdict.md`｜byte 五项：`14,042 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 124（split 125）`
> SHA-256 甲（全档零位）`BC19474EBC204211092F167A4456BEDA612F5599D2FAEA2E3C53588D1C8242B7`
> SHA-256 乙（LF 归零零位）`BC19474EBC204211092F167A4456BEDA612F5599D2FAEA2E3C53588D1C8242B7`
> SHA-256 丙（行链零位）`6E94DC8D85418185FB760798993C77D5BA7E4A95E52A305D5E24DFA7F2BA2E65`
> 附节四值（全档含本节）：`14,042 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 124（split 125）｜✓ 24 / ✗ 2`
> 附节三口径（全档）：甲＝乙 `BC19474EBC204211092F167A4456BEDA612F5599D2FAEA2E3C53588D1C8242B7`｜丙 `6E94DC8D85418185FB760798993C77D5BA7E4A95E52A305D5E24DFA7F2BA2E65`
