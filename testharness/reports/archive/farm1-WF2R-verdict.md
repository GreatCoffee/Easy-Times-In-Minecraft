# farm1 批修复窗 **W-F2R**（A-1 shouldRefresh ＋ B-1 vanilla hoe）· 单点回归回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-03（CST）｜**窗口形态**：**4 boot**（主窗 R1/R1d/R2/R3a/R4/R5／频率窗 R4c／consume 窗 R3b／双计排除臂）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`14,055 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 33 / ✗ 2｜118 行`
> **判决源**：条 259（A-1 修复落码）／条 260（B-1 裁 A：MixinItem `onBlockDestroyed` TAIL gated `instanceof ItemHoe`）／主窗 W-F 回执（条 258 窗，faces=12 pass=11 fail=1 A-1）
> **落码 HEAD**：**`0429e32`**（`0429e325c6c2eec935f3733587c6ff3715d0fb02`，父 `e15795f`）｜窗内零提交、零产品码
> **判决**：**PASS** —— **faces=12｜checked=12｜pass=12｜fail=0**（**A-1 修复确认 ✓／B-1 修复确认 ✓**；新增 A 0／新增 B 0）
> **一句话**：`ETIMFarmlandTile.shouldRefresh = oldState.getBlock() != newState.getBlock()` 把施肥位从「moisture 一变即灭」改成「随块存续」——3×3 施肥地经历 **0→7（水浸 1.4s）→0（断水 18.6s）真实往返**后 growth 行全程继续（610 行、ratio 1.500 单一集合），踩踏仍 deny，块销后同位重耕 allow、再锄须新 roll；`MixinItem` 的 base TAIL 让 **vanilla iron_hoe**（此前 F6 收割 roll 死）走到同一 `ETIMFarm.onCropBroken`——tillage 20/20、胡萝卜/甜菜根各出 harvest 行、L1 N=200 落刀 199 次 pass 44＝0.2211 带内，wheat/无附魔仍 0 行（F7 矩阵不破）。

## §0 判定总表（十二点）

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1a** 置位（vanilla hoe L5） | `-wf2r.out:6448/6449` | tillage 行 + set 行 + 块成 farmland | `tillage lvl=5 roll=0.6114 need=1.0000 pass=true` + `fertilized set … value=true`；块 farmland | ✓ |
| **R1b** A-1 持久面（moisture 0↔7 真实往返） | `:3816` 放水／`:3865` moisture=7 核／`:4886` 断水／`:5495` moisture=0 核 | 双向变化后 growth 行**继续**（主窗 A 臂「4 行后停」消失） | 水浸 **1.41s** 到 7、断水 **18.61s** 回 0；P1 97 行／P2 90 行／P3 90 行（同 plot 中心 `-63,67,248`）；湿后首行 `:3866`、干后首行 `:5497` | ✓ |
| **R1c** 往返位踩踏 | `:6200` | deny 行 + 块仍 farmland | `fertilized trample-deny pos=-63,67,248 entity=Cow`，allow 0 行，块 farmland | ✓ |
| **R1d** 块销 TE 亡＋新 roll | `:6579` allow／`:7203/7204` 再锄 | dirt 换块 → 同位重耕 allow；再锄出新 roll | `trample allow … fertilized=false`（deny 0）；再锄 `tillage … pass=true` + `set` 行再现 | ✓ |
| **R2** growth 寿命 | `:2822-8090`（plot A 全段） | ≥60 行、ratio=1.500 单一 | **610 行**；`ratio` 集合 `{1.500}`、`factor` `{1.50}`、`value=base×1.5` **违例 0**；wet 段 102 行、dry 后 323 行 | ✓ |
| **R3a** 消耗常态（divisor=256） | `:2823-7978`（68 行） | divisor=256、roll 0..255、cleared⇔roll==0 | 68 行、divisor `{256}`、roll **1..250**、cleared 0、违例 0 | ✓ |
| **R3b** 消耗翻转（divisor=2） | `-consume.out:2832-3409`（22 行）／`:3547` | divisor=2、roll∈{0,1}、清后 growth 全 0、清位 allow | 22 行、divisor `{2}`、roll `{0,1}`、cleared **12**、违例 0、12 清位 **after 全 0**；清位踩踏 `trample allow … fertilized=false` | ✓ |
| **R4a** vanilla hoe 附魔 | `-wf2r.out:6762` enchant_set／`:6812/6813` reg | `/etest enchant … fertility` 成功；carrier 门真 | `enchant_set … Iron Hoe`（fertility 5）；probe 43 行且 `etim:fertility id=29 table=true`、`etim:harvesting id=30 table=true`，窗口同值 | ✓ |
| **R4b** vanilla hoe tillage | `:6913-7379`（20 行） | 20/20，need=1 | 20 行全 `pass=true`、`need={1}`、`lvl={5}`、伴生 set 20 行（MixinItemHoe 钩不回归） | ✓ |
| **R4c** vanilla hoe 收成矩阵 | `:7544`／`:7725`；负臂 0 行 | 胡萝卜/甜菜根出 harvest 行（此前 0）；wheat、无附魔仍 0 | carrots `tool=minecraft:iron_hoe lvl=5 need=1.0000 pass=true`；beetroots 同；wheat 0 行、无附魔 0 行；四臂 `present=true/broken=true` | ✓ |
| **R4c-f** vanilla hoe L1 频率 | `-freq.out:2844-28318`（199 落刀） | pass ≈ 0.2（±3σ） | 发刀 200＋补刀 6、落刀 **199**（1 刀两试均未触达成熟作物）；pass **44** ＝ **0.2211**，带 [0.1151,0.2849]；need `{0.2}`、lvl `{1}`、tool `{minecraft:iron_hoe}` | ✓ |
| **R5** 汇合零回归 | `-wf2r.out` 全域；`-doublecheck.out:2830-4619/4686-4994` | 行格式同构、pool 前段零变、cfg 8 键字节不变、无双计 | till 22／harvest 2／set 24／clear 68／growth 610／deny 1／allow 1，**FarmLog 未解析行 0**；pool reg **43** 行，前 8 条窗口逐字不变、id 仍 `[14,15,23,24,25,26,27,28,29,30]`；cfg 起收同 sha；双计臂 ETIM 锄/镰/镐各 3 刀→3 行（perPosMax=1）、镰 harvesting 3 刀→3 行 | ✓ |
| **A-1 / B-1** 修复确认 | §1／§2 | 两缺陷消失 | **✓（修复确认）／✓（修复确认）** | ✓ |

## §1 A-1 修复确认（施肥位随块存续）

**改动**：`ETIMFarmlandTile` 覆写 `shouldRefresh(world,pos,oldState,newState) = oldState.getBlock() != newState.getBlock()`（`src/main/java/io/github/etim/etim/tileentity/ETIMFarmlandTile.java:60-71`）。R196 对位：`BlockFarmland.setWetness = metadata & ~7 | wetness & 7`（保留 bit 8，`mite-src/decompile/src/net/minecraft/BlockFarmland.java:180-182`）⇒ 同块 state 写保肥、块变（turnToDirt/破块）仍随块销。

**证据（同一 plot，`-wf2r.out`）**：

| 阶段 | 动作 | 核验点 | growth 行 |
| --- | --- | --- | --- |
| P1 | moisture=0（无水源） | `:2829` `testforblock … moisture=0` 命中 | 97 |
| 水浸 | `:3816 setblock … water 0` | `:3865` `moisture=7` 命中（1.41s） | 湿段共 102 |
| P2 | moisture=7 | `:3802`/`:3865` 双核 | 90 |
| 断水 | `:4886 setblock … air 0` | `:5495` `moisture=0` 命中（18.61s） | 干燥段 78 |
| P3 | moisture=0（回干） | `:6099` 复核 | 90（干后累计 323） |

主窗 A-1 病态面（TE 探针 A 臂 4 行后停、D 臂冻 28、主窗 P7 8 行停）在本窗**全部不复现**：两次状态写之后 growth 行各 90 行以上，且 `ratio/factor` 全程 `1.500/1.50`（610 行、`value=base×1.5` 违例 0）。

## §2 B-1 修复确认（vanilla hoe 收割 roll）

**改动**：`MixinItem` 在 `Item.onBlockDestroyed` **TAIL** 注入 `gated (Object)this instanceof ItemHoe` → `ETIMFarm.onCropBroken`（`src/main/java/io/github/etim/etim/mixins/MixinItem.java:188-208`）。可及性：1.12 vanilla `ItemHoe` 无 `onBlockDestroyed` override ⇒ vanilla 锄走 base 体；ETIM 三族各自 override 且**不调 super**（`ETIMItemHoe:119-131`、`ETIMItemMattock:34-39`、`ETIMItemScythe:173`）⇒ base TAIL 不可达、零双计。

| 面 | 主窗（`e15795f`） | 本窗（`0429e32`） | 判 |
| --- | --- | --- | --- |
| tillage（vanilla 锄 L5） | 行出（MixinItemHoe 钩） | **20/20** 全 pass、need=1 | ✓ |
| 胡萝卜/甜菜根 harvest | **0 行**（死支） | carrot 1 行、beetroot 1 行（`tool=minecraft:iron_hoe`） | ✓（死支转活） |
| wheat / 无附魔 | 0 行 | **仍 0 行**（F7 矩阵 / level 0 早退） | ✓ |
| L1 频率 | — | 199 落刀、pass 44＝**0.2211**（带内） | ✓ |
| 双计 | — | ETIM 锄/镰/镐 3 刀→3 行（perPosMax 1）；镰 harvesting 3→3 | ✓ |

## §3 R3 消耗面（A-1 修后）

- **常态 divisor=256**：68 行、divisor `{256}`、roll 1..250、cleared 0、`cleared⇔roll==0` 违例 0（期望 68/256≈0.27 次，观测 0 次，符合）。
- **翻转 divisor=2**（临时 cfg，收窗回填）：22 行、divisor `{2}`、roll `{0,1}`、cleared **12**、违例 0；12 个清位在清位之后的同 pos growth 行 **全部 0**（`te.setFertilized(false)` 后增速停）；清位 `-68,67,249` 踩踏 → `trample allow … fertilized=false`（TE 在但已不施肥）。
- cfg 链：起 `39,968 B 7C3933F9…` → 翻转 `39,965 B 3165DBA1…` → 收窗回填 `39,968 B 7C3933F9…`（`sameAsStart=true`）。

## §4 R5 汇合零回归

- **行格式**：till/harvest/set/clear/growth/deny/allow 七类全部由主窗同一 `String.format` 通道产出，字段序逐字同构；`[FarmLog]` 未解析行 **0**；`[MiningLog]` 0、`[MeleeLog]` 0、Mixin 失败 0。
- **pool/reg**：43 行（41＋2），`etim:speed` 1/10…41/999、`regeneration` 11/30…91/999、`poison`/`true_flight`/`quickness`/`disarming` 1/10…41/999、`stun` 6/20…66/999、`vampiric` 11/30…91/999、`fertility`/`harvesting` 1/10…41/999（`table=true`）——与前批逐字相等。
- **运行时 id**：`[EtimInit] … ids=14 15 23 24 25 26 27 28 29 30`（fertility 29／harvesting 30 不变）。
- **cfg**：起值 `39,968 B／207 键／7C3933F9…A0BA`，8 键值 8/8 与默认逐一相等（`fertilizedConsumeDivisor=256`、`farmDebugLog=false` 收窗）；收窗同 sha（`sameAsStart=true`）。
- **双计排除**：`-doublecheck.out` 4 臂（ETIM 锄/镰/镐/镰-harvesting）各 3 刀，fert 行数与刀数 1:1（perPosMax=1）、hrow 3:3。

## §5 钉值与收口

| 面 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `0429e32`（`0429e325c6c2eec935f3733587c6ff3715d0fb02`） | 同（窗内零提交） | ✓ |
| release jar | 864,935 B `18F674AADB271906B507A0E0D1D6E77D053531F3928273EB8B20FC2F3D067B5D` | 同 | ✓ |
| dev jar | 847,689 B `256559ACCA12E453C71388977D3775694A1FB46ABBEE6CDFF5E11360C9279B6F` | 同 | ✓ |
| sources jar | 794,499 B `C74B2BFE7DA74CA3D736DDF355D0BE62AE76AF5A3EF845372CC6C4C5DE4ACA93` | 同 | ✓ |
| refmap 双树 | 67 类键／**153** 条目（双端 306 面；`MixinItem` 5 条含 `onBlockDestroyed` 1 条、`MixinBlockCrops` 2、`MixinBlockFarmlandTile` 0） | 同 | ✓ |
| mixins 清单 | 62／client 10 | 同 | ✓ |
| cfg（dev） | 39,968／207 键／`7C3933F9…` | 同（`sameAsStart=true`） | ✓ |
| server.properties | 890 `3009633863…654A48` | 同（回填 identical） | ✓ |
| 世界 | — | 4 个 `run/farm1wf2r*` 目录全删 | ✓ |

| 收口面 | 状态 |
| --- | --- |
| boot 计数 | **4**：主窗／频率窗／consume 窗／双计臂 |
| 客户端 | **零会话**（未拉起、未截屏、未抢焦点） |
| 产品码 | **0 行**（窗内零提交；驱动/证据/日志全落 `testharness/**`） |
| 进程/端口 | 端口 25565 收 **0**；crash-reports 19＝19（零新增）；4 次 `stop` 全 exitCode 0 + BUILD SUCCESSFUL |
| 门控 | `farmDebugLog` false→true→false；`fertilizedConsumeDivisor` 256→2→256 |
| 判据档 | `-wf2r-evidence.json`／`-wf2r-freq-evidence.json`／`-wf2r-consume-evidence.json`／`-wf2r-doublecheck-evidence.json` ＋ 各窗 `.out` |

## §6 冲突分级（新增 A 0／新增 B 0／C 4）

- **A 级**：**0 新增**（A-1 已于 §1 关闭）。
- **B 级**：**0 新增**（B-1 已于 §2 关闭；B-2／B-3 为主窗口径说明，本窗沿用：频率臂独立 boot、W-F9 寿命以机制面＋翻转臂判）。
- **C 级（登记不阻塞）**：
  - **C-8**：vanilla 工具的服务端区块 reach = **2.75**（ETIM 三族才 3.5）；R4 首跑的目标位 3.90 被 `reach denied` 拒 ⇒ 工装位一律取脚边 ≤2 格。后续 vanilla 载体窗照此。
  - **C-9**：`[EtimInit]` 行实为 `enchant<reg>` 连写（`enchantetim:speed ids=…`，无空格）；宽正则匹配会让 ids 解析成 null 并静默产出 `{ench:[{id:null}]}`（首跑 R4 组整组无效）。已改 `enchant.*?ids=`，judgement 只采最终跑。
  - **C-10**：consume 窗的 5×5 施肥地有玻璃顶（防雨保湿）⇒ 踩踏牛会落在玻璃上；踩踏前须 `setblock <x> by+2 <z> air` 开天窗。
  - **C-11**：频率窗 6/200 刀无 harvest 行（该位无成熟作物可破，工装丢刀；门失败同样不落行，故不能说成「门失败」）⇒ 已加落刀校验补刀，最终 199/200 落刀、1 刀两试均未触达，rate 按落刀计 0.2211（按发刀 0.22）均在带内。

## §7 未覆盖面（不补白）

1. **A-1 修复后的长时持久面**（跨区块卸载/重载的 TE NBT 往返）未在本窗测：本窗只覆盖同区块内 state 写与块换。
2. **降雨面**：本窗用「水浸/断水」驱动 moisture（同一条 `BlockFarmland.updateTick` 路径），未单独跑 `weather rain`。
3. **纯客户端面**（田块外观/粒子/HUD）：按纪律转用户操作，不在本窗。
4. **F9「256 次生长」寿命累积的整窗观测**仍以机制面（divisor=256 常态＋divisor=2 翻转）判，未做 256 次真实耗尽的长时间窗。

## §8 自报（机械核讫）

> 文件：`testharness/reports/farm1-WF2R-verdict.md`｜字节五项：size 14,055 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 117（split 行数 118）
> 三口径（家族同型：farm1-WF／melee1-WE2／enchant1-WE1）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序换行连接后再 SHA-256）。
> SHA-256 甲（全档零位）`52AE5838D39A36449213071312DA0EACF5EAA9DD1CC9D53B6FCE6D221EA084A6`
> SHA-256 乙（LF 归零零位）`52AE5838D39A36449213071312DA0EACF5EAA9DD1CC9D53B6FCE6D221EA084A6`
> SHA-256 丙（行链零位）`426883B14A4D6795585C3BC6E4E87EEA9B743D2B9456DA7B855FE5C5DF611666`
> 判格 12＝✓ 12／✗ 0｜锚：R1a `:6448/6449`／R1b `:2829·:3816·:3865·:4886·:5495`＋`:2822-8090`／R1c `:6200`／R1d `:6579·:7203`／R2 610 行／R3a `:2823-7978`／R3b `-consume:2832-3409·:3547`／R4a `:6762·:6812`／R4b `:6913-7379`／R4c `:7544·:7725`／R4c-f `-freq:2844-28318`／R5 `-doublecheck:2830-4619`｜钉值：4 boot／0 rebuild／0 客户端／0 产品码｜冲突 新增 A0 B0 C4。
