# 增速面 · **W-B9 判决**（B-9 批，growth-rate family，HEAD `d040dee`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 4 boot**（b1 主判面 R0/R1/R2/R3/R4/R5-plains/R7/R9/R10／b2 master 关 R8①／b3 master 恢复 R8②／b4 远位面 R6 desert＋R5 swamp）；**0 客户端／0 产品码／0 rebuild**／单假人 `ETIM_F7`
> **报告字节规格**：`15,068 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 15 / ✗ 4｜91 行`
> **判决源**：W-B9 任务书（2026-11-05，HEAD `d040dee`）＋ `playground/audit/growth-rate-立项摸底.md` ＋ audit20 条 298
> **钉值核验**：HEAD **`d040dee`**（窗内零提交）｜release **991,901 B** `54383A8A…10DD` 相符｜dev **972,328 B** `DC1201EB…91D0` 相符｜sources 903,022 B `17EBC24C…D72C` 相符｜mixins **73**＋client 10｜refmap **77/169**（双树同）｜cfg **注册 244 键**（文件 246＝244＋2 历史孤儿键；任务书写的 `tpArmX/tpArmY` 实测不存在，见 C-9-2）
> **判决**：**PASS**（R0..R10 **✓11／✗0**）｜A 0／B 0／C 8（工装与簿记，均不影响判值）
> **一句话**：光门 15..15 在 9 格屋顶补丁上出 28 行 `growth gate light`（blv 11/12）且块不动、撤顶后门行归零而组比行继续（33 行）；孤立/双株/三连三簇 prox 0.500/0.750/1.000 与 base=10.000 全链亲算合；stem 双窗 0.6..1.0／1.0..1.4 且 prox=none；沙漠 y=60 处 temp=2.00 使 pumpkin `rate-zero mod=0.00`、melon 0.400、wheat 0.200；施肥面 fert=1.500 入链；master 关 0 组比行 0 门行、枯田门行照旧（172 行）、age 2→4 证明 vanilla 骰复活；27 token 零错、五通道 kill 面 0。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R0** boot 面 | `Done (`＋`mixinFail`；cfg 四新键默认值 | Done／0 fail／true,15,15,0.25／244 键 | b1 5.279 s、b2 1.132 s、b3 1.113 s、b4 1.101 s，四 boot `mixinFail` **0**；cfg `growthRateR196=true`／`growthLightMin=15`／`growthLightMax=15`／`globalGrowthRateFactor=0.25`；注册 **244** 键 | ✓ |
| **R1** 光门下限 | `growth gate light … blv=… window=15..15`；位仍 `wheat age2` | 门行族＋块不动 | 3×3 湿田补丁＋5×5 石顶（y=102）：**28 行**，`blv=11/12`（9 格全覆盖），`window=15..15`；`testforblock 180 100 795 minecraft:wheat 2` 中 | ✓ |
| **R2** 光恢复 | 撤顶后同窗零门行；`growth rate` 行继续 | 0 门行＋组比行>0 | 撤顶 12 s（rts 60）：`growth gate light` 于补丁 **0 行**；`growth rate` **33 行**（9 格）；`testforblock … minecraft:wheat` 中 | ✓ |
| **R3** 组比数值链 | `base=10.000 … temp=… window=0.8..1.2 tempMod=… hum=1.000 prox=0.500 global=0.250 rate=…` | 链闭合 | 单株（184,100,800）3 行：`base=10.000 fert=none temp=0.94 window=0.8..1.2 tempMod=1.000 hum=1.000 prox=0.500 global=0.250 rate=1.250`；rate 链 calc **1.250**＝10×1×1.0×1×0.25×0.5；tempMod 复算 **1.000** | ✓ |
| **R4** 邻近三簇 | 孤立 0.500／双株 0.750／三连 1.000 | 三簇各就位 | 孤立 184 → `0.500`（3 行）；双株 190/191 → `0.750`/`0.750`（1/3 行）；三连 196/197/198 → `1.000`×3；全部行链 `chainAllOk=true` | ✓ |
| **R5** stem 双窗＋高湿 | pumpkin `0.6..1.0`／melon `1.0..1.4`，prox=none；swamp melon `hum=1.200` | 双窗两行族；高湿 ×1.2 | pumpkin 5 行 `family=stem_pumpkin window=0.6..1.0 prox=none hum=1.000`；melon 6 行 `family=stem_melon window=1.0..1.4 prox=none hum=1.000`；swamp 双塔 7 行 `temp=0.80 window=1.0..1.4 tempMod=0.800 hum=1.200 prox=none rate=0.960` | ✓ |
| **R6** 温度窗边缘 | desert：pumpkin `rate-zero mod=0.00`；melon 0.400；wheat 0.200 | 零门＋两非零 mod | desert（-15,60,282 区）：pumpkin **14 行** `temp=2.00 window=0.6..1.0 mod=0.00`、`testforblock … pumpkin_stem 2` 中；melon **14 行** `temp=2.00 tempMod=0.400`（rate 0.387/0.350）；wheat **12 行** `temp=2.00 tempMod=0.200`（rate 0.194/0.175/0.231）；三臂链闭合 | ✓ |
| **R7** 施肥面 | `fertilize src=manure` 行＋`fert=1.500` 组比行 | 两行族、1.5 入链 | 两株两臂：`fertilized set pos=176,99,800 value=true`＋`fertilize src=manure chain=farm soilEnrichment=1`（177 同）；随后 6 行 `fert=1.500`，`rate=2.813`＝10×1.5×1.0×1×0.25×0.75 | ✓ |
| **R8** master 双支 | ①关：湿田零组比/零门行、枯田门行照旧 ②开：组比行复活 | ①0/0＋dry 行>0 ②>0 | **b2**（`growthRateR196=false`）：湿田 `wetRate=0`、`wetGate=0`；枯田 `growth gate dry` **172 行**；全档 `rateTotal=0`、`gateLight=0`、`gateRateZero=0`；`testforblock 184 100 800 wheat 2` **失败**（data=4，vanilla 骰复活）。**b3**（true）：组比 **2 行**、链闭合 | ✓ |
| **R9** 零回归 | 枯田门行／drought roll／27 token／五通道 | 照旧、零错 | 枯田条带 `growth gate dry` **89 行**（湿田位 **0 行**）；`drought roll 149 100 800 1.0` → `event kind=immature … dead=etim:dead_crop age=3`；**27 token** 全发、`tokenErrors 0`、服务器存活；Melee/Mining/Butch/Arrow/Cap **0** | ✓ |
| **R10** 收口复盘 | cfg 键数＝244（文件 246）；debug 关；键值回位 | 244／false／15,15,0.25 | 收口 `codeKeys=244`、`fileKeys=246`；`farmDebugLog=false`／`foodDebugLog=false`；`growthRateR196=true`／`15`／`15`／`0.25`（起收同 hash） | ✓ |

> 判格 **✓11／✗0**；A 0／B 0／C 8（见 §5）。

## §1 判据行样本（正本 `f9-gr-verify-b1.out` / `-b2.out` / `-b3.out` / `-b4.out`）

- **R1**：`[FarmLog] growth gate light block=minecraft:wheat pos=179,100,794 blv=12 window=15..15 [server]`
- **R2**：`[FarmLog] growth rate block=minecraft:wheat family=crops pos=181,100,795 base=5.000 fert=none temp=0.94 window=0.8..1.2 tempMod=1.000 hum=1.000 prox=1.000 global=0.250 rate=1.250 [server]`
- **R3/R4**：`… pos=184,100,800 base=10.000 … prox=0.500 … rate=1.250`；双株 `pos=190/191 … prox=0.750`；三连 `pos=196/197/198 … prox=1.000`
- **R5**：`… block=minecraft:pumpkin_stem family=stem_pumpkin … window=0.6..1.0 … prox=none … rate=2.500`；swamp：`… melon_stem … pos=311,60,220 base=4.000 … temp=0.80 window=1.0..1.4 tempMod=0.800 hum=1.200 prox=none rate=0.960`
- **R6**：`[FarmLog] growth gate rate-zero block=minecraft:pumpkin_stem pos=-15,60,282 temp=2.00 window=0.6..1.0 mod=0.00 (dice guard 条 281) [server]`；melon `… temp=2.00 window=1.0..1.4 tempMod=0.400 … rate=0.387`；wheat `… temp=2.00 window=0.8..1.2 tempMod=0.200 … rate=0.194`
- **R7**：`[FarmLog] fertilized set pos=176,99,800 value=true [server]`＋`[FarmLog] fertilize src=manure chain=farm soilEnrichment=1 [server]`；随后 `… fert=1.500 … rate=2.813`
- **R8**：b2 `… growth gate dry block=minecraft:wheat pos=151,100,801 [server]`（湿田位无行；`testforblock …wheat 2` → `The block at 184, 100, 800 had the data value of 4 (expected: 2)`）；b3 `… pos=184,100,800 base=10.000 … rate=1.250`
- **R9**：`drought event kind=immature block=minecraft:wheat age=3 pos=149,100,800 … dead=etim:dead_crop age=3`

## §2 机制与口径

- **M1 光门（F1）**：R196 `BlockGrowingPlant :86-92` 家族 min=max=**15**（合成光），1.12 vanilla `>=9`（BlockCrops :81／BlockStem :81）。ETIM 在两枚既有 `updateTick` HEAD 注入（`MixinBlockCropsTick`／`MixinBlockStemTick`，B-8 旱死臂同喉位）：`blv < min || (!stem && blv > max)` → 行＋`ci.cancel()`；stem 分支只读下限（R196 :68）。`blv = world.getLightFromNeighbors(pos.up())`（= `getLight(pos,true)` → `getLightSubtracted`＝max(天光−subtracted, 方块光)，与 R196 `getBlockLightValue` 同义）。
- **M2 温度窗（F2）**：`growthTempWindow` 直抄——wheat 系 `0.8..1.2`、pumpkin stem `0.6..1.0`、melon stem `1.0..1.4`；`tempMod=max(1−Δ/1.0,0)`，温度源 D-4 = `getTemperature(pos)`（含 y>64 海拔冷却）。**rate 归零不得进 vanilla 骰**（条 281 `25.0F/f` 溢出崩服）：`tempMod<=0` 在 HEAD 出 `growth gate rate-zero`＋cancel。
- **M3 组比（F2..F5）**：`MixinBlockCrops.getGrowthChance` RETURN 处按 `base × fertilized(1.5) × tempMod × hum(1.2 melon 高湿) × global(0.25) × prox(仅 crops)` 重排并打**一行** `growth rate`（farm1 旧 ratio 行在该路径被取代，任务书已预告形变）。`hum=1.2` 判据 `Biome.isHighHumidity()`（rainfall>0.85，与 R196 逐字全等）。
- **M4 邻近（F5）**：crops 专属——0 同株邻 ×0.5；1 邻且该向 second-rank 无延伸 ×0.75；≥2 邻或延伸 ×1.0；stem 恒 1.0（行内 `prox=none`）。vanilla 同株 `/2` 面（:201-203）保留（见 C-9-3 的 base=5.000）。
- **M5 判窗噪声控制**：composition 面 `randomTickSpeed=60`（单株每 section 每 tick 抽 1 格的采样率太低，R1/R2 用 9 格补丁、R6 用 3 格株列）；b1 主判面结束 rts→0；b2/b3/b4 收尾 rts→3。窗口世界 `f9gr` 收口整档删除。
- **M6 温度面落位**：R6/R5 远位 staging 取 farmland **y=59** / crop **y=60**——`getTemperature(pos)` 只在 y>64 冷化，且 y=64 处 perlin 噪声项仍可为正（temp<2.00 会使 pumpkin tempMod>0，零门整面丢失）；y=60 保证 temp≥2.00（实测恰 `2.00`）。

## §3 零回归与通道

- **b1 通道**：`[FarmLog]` **2955**（含种子世界自然村庄麦田的行，判值一律按 pos 过滤）；`[MeleeLog]` 0／`[MiningLog]` 0／`[ButchLog]` 0／`[ArrowLog]` 0／`[CapLog]` 0；`[EnchantLog]` 4（`enchant mainhand`/`enchantprobe` 显式 token 输出）；`[DamageLog]` **271**＝269 `src=outOfWorld`（harness `kill @e[type=!player]` 清场）＋2 `src=inWall`（自然鸡）；`[FoodLog]` **0**（`foodDebugLog=false`，本批无 digDrain 面）；`mixinFail` 0。
- **b2/b3/b4**：`mixinFail` 0；farm 790／762／52；四 boot `Done (` 全落、四停服 `exitCode 0`＋`BUILD SUCCESSFUL`。
- **五通道 kill 面**：Melee/Mining/Butch/Arrow/Cap **全 0**（与 W-B8 同口径）；Damage/Food 为清场旁证（见上），无 B-9 面行。
- **门行计数**：b1 `growth gate light` 30（28 在补丁 9 格＋2 自然暗位）、`growth gate dry` 202（89 在枯田条带＋113 自然村庄/野株）、`growth gate rate-zero` 0（b1 无沙漠位）；b4 沙漠面 14 行全在 3 格株列。

## §4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `d040dee`／收 `d040dee`（`d040dee..HEAD` = **0** 提交） |
| jar | release 991,901 B `54383A8A9B72A536C9FA242BFCC414C359299CACE8D900B54B11ADE82EFC10DD`；dev 972,328 B `DC1201EB00F3061B5475C4AF054A4B36AFAD7300726CBDD5611BD983EDB591D0`；sources 903,022 B `17EBC24CBE5B4047947478DFFE327BEB1D8C945DB6E27B046C69DF183E69D72C`（起收同值） |
| MK | refmap 77 类键／169 面（双树同）；mixins **73**＋client 10；mixinFail **0**（4/4） |
| cfg | 注册 **244** 键（代码 `config.getX("…")` 计数 244；文件 **246**＝244＋2 孤儿键 `qualityDefaultMax`／`mobwakeRarity`）；B-9 四键 `growthRateR196=true`／`growthLightMin=15`／`growthLightMax=15`／`globalGrowthRateFactor=0.25`；收口 47,606 B／`17CDC2523F18DC843A62A9612836852185A3F0CFAE71B9786FE6C9B7318C805D`，`farmDebugLog=false`／`foodDebugLog=false`（起收同 hash） |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 938 B／`7F039C1F79671C4A405C96264E0CC19653A7E1561AE94D19A94C44B0421B89E2`／`level-name=world`／`level-seed=etim27`／`allow-flight=false`（窗内临时 `f9gr`＋dev seed＋true，收口按窗前快照回写；起收同 hash） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `f9gr` 已删；无残留游戏 JVM |
| 停服 | b1/b2/b3/b4 均 exitCode **0**＋`BUILD SUCCESSFUL`（5.279/1.132/1.113/1.101 s Done） |

## §5 冲突分级

- **A 级：0**。
- **B 级：0**（未见产品缺陷；光门/温度/湿度/全局/邻近五面与 R196 判值逐项对位）。
- **C 级：8**
  - **C-9-1**（工装·种子）：远位 staging 坐标来自对 `run/world` region 文件的离线扫描（`f9-biome-scan.js`），窗内 `f9gr` 以 dev 世界真种子 `-2991855477586212903` 重建，保证同 biome 图；`run/world` 全程未被写入，收口 `f9gr` 整档删除。
  - **C-9-2**（簿记·任务书更正）：任务书称 cfg 文件 246＝244＋运行时回写 `tpArmX/tpArmY`；实测两枚多余键是历史孤儿 `qualityDefaultMax`／`mobwakeRarity`（与 W-B8 收口一致），cfg 中不存在 `tpArm*`。
  - **C-9-3**（采样·vanilla 叠加面）：R1/R2 的 3×3 屋顶补丁行内 `base=5.000` 是 vanilla 同株 `/2` 面（9 株相邻，:201-203）——R196 保留该面，不是湿度异常；R3 的孤立株 `base=10.000` 为对照。
  - **C-9-4**（高度·温度噪声）：R6/R5 取 crop y=60（farmland 59）。y=64 处 `getTemperature` 的 perlin 项可正，使 desert temp<2.00、pumpkin tempMod>0 而丢掉零门；y=60 时噪声项非正，实测 temp 恰 `2.00`。
  - **C-9-5**（水位·地形）：swamp 位开放 3×3 竖井会被沼泽水位灌入；改用**封闭石塔**（1×1 天井＋封闭水袋），双塔各出 `hum=1.200`。
  - **C-9-6**（gamerule 面）：`randomTickSpeed`／`doDaylightCycle` 属判窗 scratch 世界 `f9gr` 的 world 级 gamerule，随收口整档删除；常驻 `world` 的 props/cfg 起收字节同 hash（见 §4）。
  - **C-9-7**（通道口径）：b1 `[FarmLog]` 2955 含自然村庄麦田噪声；判值全按 pos 过滤。`[DamageLog]` 271＝269 清场 outOfWorld＋2 自然鸡 inWall；`[FoodLog]` 0 因 `foodDebugLog=false`（本批无 digDrain 面）；`[EnchantLog]` 4 为显式 token。
  - **C-9-8**（数值复算口径）：tempMod 用行内 2dp `temp` 复算（误差≤0.005），容差取 **0.006**；rate 链用行内 3dp 全字段，容差 **0.0025**——R3/R4/R5/R6/R7/R8 全链均在此容差内闭合。

## §6 自报（机械核讫）

> 正本：`testharness/reports/b9-verify-verdict.md`｜byte 五项：`15,068 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 90（split 91）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`4E98739E4013622DD9CC4544CE517DEBF94807511F02F589AD802E1B207B749F`
> SHA-256 乙（LF 归零零位）`4E98739E4013622DD9CC4544CE517DEBF94807511F02F589AD802E1B207B749F`
> SHA-256 丙（行链零位）`77749514C8E49DB3C69BB6CFFAE86B652E2A90A132FA098D43572721745BB3D4`
> 判格 11＝✓ 11／✗ 0｜R1 门行 28/blv 11-12／R2 门 0+组比 33／R3 链 1.250／R4 0.5-0.75-1.0／R5 双窗+hum1.2／R6 零门 14+0.400+0.200／R7 fert 1.500／R8 关 0/0+age2→4、开 2 行／R9 dry 89+roll+27 token／R10 244(246)
> 窗口账：正式 4 boot；0 rebuild／0 客户端／0 产品码；`[FarmLog]` b1 2955／b2 790／b3 762／b4 52；mixinFail 0×4
