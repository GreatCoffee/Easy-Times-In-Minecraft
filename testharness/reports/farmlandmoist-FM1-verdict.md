# 六期 D-1 耕湿批 · **W-FM1 单点回归判决**（B-1 修·甲：菌丝臂去 0.5 掷）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-04（CST）｜**窗口形态**：**5 boot**（主窗 3：前 2 次作废〔首次施用丢包／同态 `setblock` 保 TE〕；诊断 2：前 1 次作废〔补天候探针〕）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`11,111 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 9 / ✗ 3｜82 行`
> **判决源**：条 284 修（HEAD `adb2f38`，B-1 甲 用户裁定 2026-11-04）＋ W-FM 判窗（条 283 后 PASS）＋ R196 一手 `BlockMycelium.java:139-154`／`BlockMushroom.java:160-217`
> **钉值**：HEAD **`adb2f38`**（窗内零提交）｜release 952,595 B `C5C3A152…3157`｜dev 933,791 B `97EA4617…11B8`｜sources 865,859 B `8AB0EEC5…AC44`｜refmap 双树 74 类键／164 面｜mixins 69＋client 10｜cfg 44,173 B／235 键／`90652ABD…4E9A`（dbg=false）｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**PASS**（R1／R2／R3 全 ✓）；**A 0／B-1 已解／C 3 新增**；另 §4 诊断臂实测出两条 R196 语义差（B-3 分级成长／B-4 室内合法门）**待裁**，不在本窗判分合同内
> **一句话**：菌丝臂 40 掷 **40 行 `roll=none`／40/40 巨型／40 次各扣 1**（确定性面成立）、红菇 20 掷 0.5 不动且巨型⇔pass 一一对应、farm TOP 一次置肥 5→4 双行在案，钉值起收全同——B-1 甲 修复达标。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1** 菌丝臂重跑（B-1 甲） | `[FarmLog] fertilize src=manure chain=mycelium roll=none`；室内菌丝＋上方棕菇，7×7×14 净空，生存模式 `/give` 5 枚 | 40 行逐条；巨型 ≈40/40（确定性面，空间足时 0 fail）；held 5→4 逐条 | **40 行**（`roll=none` **40**／无 `roll=` 字段 **0**）；**巨型 40/40**；**40 次施用各 −1**（5→0 后补满 ×8，末次清空）；预热 1 击 0 行不耗 | ✓ |
| **R2a** 红菇 0.5 抽查 | `[FarmLog] fertilize src=manure kind=red roll=` | 0.5 不动；roll 字段仍在；巨型⇔pass | **20 行**；pass **9**／fail **11**（p̂=0.45，20 掷 95% CI [0.23,0.68] 含 0.5）；巨型 **9**，**pair=true** | ✓ |
| **R2b** farm TOP 置肥 | `fertilized set … value=true`＋`fertilize src=manure chain=farm soilEnrichment=1` | 一次置肥成功；held 5→4 | 两行各 1（`pos=206,139,700`）；held **5→4**；`testforblock … {EtimFertilized:1b}` 命中 | ✓ |
| **R3** 收口 | 钉值五项 | HEAD 零提交；jar 三件同值；mixinFail 0；cfg 235 键 | 起收全同（§3） | ✓ |

> 判格 4＝**✓ 4／✗ 0**。R1 的“巨型 40/40”按任务书“空间足时 0 fail（确定性面）”判；本窗净空按 `WorldGenBigMushroom` 的极值（i=12 的 1/12 ×2 也要 14 格高＋7×7）预留，故 40 掷全中。

## §1 R1 菌丝臂重跑（40 掷）

- **场**：室内 11×11 菌丝房（墙 ±5、顶 AY+16），菌丝 AY−1、棕菇 AY；每掷先清 `7×7×14` 净空再重摆；站点 `(166.5, 140, 702)`，右键菌丝 TOP（`/etest useblock`，方向恒 UP）。
- **净空判据（一手）**：`WorldGenBigMushroom.generate` 扫描 `j ∈ [y, y+1+i]`、`i=rand(3)+4`（另有 1/12 双倍 ⇒ i=12），`j>y+3` 时半径 3 ⇒ 需 7×7 且高至 `y+13`；`y+1+12=y+13` 落在本窗 `AY..AY+13` 净空内，顶板在 `AY+16`。首轮（W-FM7 菌丝位）只清 6 格且顶板在 `AY+7`，故当时 10/40——本轮是**按极值重设空间**后的复验。
- **结果**：`chain=mycelium` **40 行**、全部带 `roll=none`、**无一行残留 `roll=` 数值**（B-1 的 0.5 已彻底移除；C-6 的“菌丝无 roll 字段”同点闭合）。
- **巨型侧**：40 掷 base 块判 `minecraft:brown_mushroom_block` **40/40**；`smallStill` 全 0。`fail=0`，无需逐条注因。
- **消耗侧**：`held` 序列逐掷 **−1**（40/40 次），5 枚用尽后 `/give` 补满 8 轮，末次栈清空（`heldEnd=null`）——A-1 的“成功即扣 1”在菌丝臂成立。
- **工装口径（C-11）**：本轮首跑（第 1 次 boot）第 1 掷丢包——`etest useblock` 40 条 vs `chain=mycelium` 39 条、`held 5→5`、无行；第 2 掷起全中。判定为**登录/换位后的首次交互丢包**（非模组面）。正式窗加**预热 1 击**（打泥土，走 `PASS` 分支，不落行不消耗；实测 `useblocks=1／farmRows=0／held=5`），此后 40 掷全活。

## §2 R2 回归抽核

- **R2a 红菇 20 掷**（室外草地，17 格净空，夜）：`kind=red roll=` **20 行**，`pass(roll<0.5)=9`、`fail=11`，`giant=9`；**巨型⇔pass 一一对应**（`pair=true`）。0.5 掷未受 B-1 改动影响，`roll=` 字段仍在（与菌丝臂的 `roll=none` 形成对照）。
- **R2b farm TOP 一次**：`fertilized set pos=206,139,700 value=true`＋`fertilize src=manure chain=farm soilEnrichment=1`；`held 5→4`；TE `{EtimFertilized:1b}` 命中。
- **工装口径（C-12）**：第 2 次 boot 时该臂 `set=0／soil=0／held 5→5／te=true`——同世界遗留的施肥 TE 未清：1.12 `World.setBlockState` 对**同状态**（farmland 0→farmland 0）直接返回 false，不碰 TE，故置肥臂按 A-2 正确 `FAIL`。正式窗改用 `setblock air` → `setblock farmland 0` 清 TE，并换新世界，臂复现 `5→4`。

## §3 R3 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `adb2f38`／收 `adb2f38`（零提交） |
| jar | release 952,595 B `C5C3A1521C285FF7AB6063F169D277B25192C57269D979957AF516438DB43157`；dev 933,791 B `97EA46174213CA973AE263EE0303CFA068D0083C98CBC3ED953D3763FC4711B8`；sources 865,859 B `8AB0EEC570A2C71B96B023E082C2B5C032AB98E25E1BC37806A0BD853FB9AC44`（起收同值） |
| MK | refmap 74 类键／164 面（双树同）；mixins 69＋client 10；mixinFail **0** |
| cfg | 44,173 B／235 键／`90652ABD…4E9A`；`farmDebugLog` 收口已回 false；非 farm 键 0 改 |
| obf | 30,524 B／`262BFF5E…C9AD` 未动 |
| props | 938 B／`1C815ED2…EC58`／`level-name=world`（起收同值） |
| 端口／崩溃 | 25565 监听 **0**；crash-reports **21**（无新增） |
| 停服 | 各窗 `stop` exitCode **0**＋`BUILD SUCCESSFUL`；临时世界 `f7wd` 已删 |

## §4 诊断臂（不计判分；B-3／B-4 的实测证据）

> 触发点：读 R196 修复锚时发现 `BlockMycelium.fertilize(:139-154)` 只是**入口**，真正语义在 `BlockMushroom.tryGrowGiantMushroom(:164-217)`：先 `isLegalAt`（`:170`）＋棕菇“下方菌丝且**非室外**”（`:183-191`），再**分级成长** `incrementGrowth` → `isMature`（`:193-196`，`getGrowthBits()=3`、`isMature=getGrowth(max)==3`，`:219-241`），成熟才 `generate`。两臂实测：

| 臂 | 做法 | 实测 | 对 R196 |
| --- | --- | --- | --- |
| **A 分级** | 同一朵棕菇连点 3 次（不重摆） | 第 1 击：`chain=mycelium roll=none` 1 行＋**巨型**＋held 5→4；第 2／3 击：**0 行、0 消耗**（上方已是巨型块，臂不命中） | R196：第 1／2 击只加成长位（不巨型、仍扣粪），**第 3 击**才成巨型 ⇒ 现码 **1 粪/巨型** vs R196 **3 粪/巨型** |
| **B0 天候探针** | 同一室外位上，棕菇**点击臂**（该臂要求 `!canSeeSky`）打一下 | **0 行、held 5→5、棕菇仍在** ⇒ 该点 `canSeeSky=true`（室外判定成立） | 探针本身合规（该臂门在案） |
| **B 室外菌丝臂** | 同点，右键**菌丝 TOP**（上方棕菇） | **1 行 `roll=none`＋巨型＋held 5→4** | R196：`isLegalAt` 的“室内”＋棕菇“非室外”双门 ⇒ **拒绝**、不消耗。现码菌丝臂**无室内门** |

- 结论：B-1 的“0.5 掷”确系移植手误（R196 菌丝入口无掷），已按甲去掉；但**去掉后 1 击即成巨型**，与 R196 的“3 级成熟”和“室内合法门”两处不等价。两处均需裁定口径（分级需 1.12 的状态载体——蘑菇无成长元数据，只能挂 TE/计数；室内门是一行 `canSeeSky` 判定）。

## §5 冲突分级

- **A 级 0**。
- **B-1（已解）**：菌丝 TOP 的 0.5 掷已去（`ETIMItemManure.java:98-108`）；行型补 `roll=none`（C-6 同点闭合）；本窗 40/40 验证通过。
- **B-3（新增·判值源头，待裁）**：R196 菌丝臂为**三级成熟**（3 粪/巨型），现码 1 粪/巨型（§4 臂 A 实测）。属“跨版本状态载体缺失”类，需裁“补分级载体／接受 1:1 桥”。
- **B-4（新增·判值源头，待裁）**：R196 菌丝臂要求**室内**（`isLegalAt`＋棕菇 `!isOutdoors`），现码无该门（§4 臂 B 实测室外可成巨型）；且 `ETIMItemManure` 修后注释“1.12 自带合法性/室内门”**与一手不符**（`generateBigMushroom` 只判下方块型与空间，不判天候）——注释须改，门是否补需裁。
- **C 级（本窗新增 3）**：
  - **C-11** 登录/换位后**首次 `useblock` 丢包**（40 命令 vs 39 行，held 不变）；正式窗以预热 1 击消除，未来含首次施用的窗需沿用。
  - **C-12** 1.12 `setblock` 对**同状态**直接返回 false、不重建 TE ⇒ 同世界复跑“置肥”臂须先 `setblock air` 清 TE（否则按 A-2 正确 FAIL，易误判）。
  - **C-13** `[FoodLog] placeDrain` 行（本窗 42 条）来自生存模式**放置方块**的饥饿消耗，非 farm 通道回归；五通道（Melee/Mining/Butch/Arrow/Ench）本窗 **0/0/0/0/0**。
- **承接不改**：C-1（`manure reg` 行不可达）／C-2（满湿 FAIL 行不落）／C-3（manure stack/burn）／C-4（地狱臂未跑）／C-5（chance 行缺 biome/rain）／C-7（红首掷无行）／C-8（顶起实体未捕捉）／C-9（沼泽跨群系）／C-10（作废试跑与 props sha）状态不变；**C-6 本窗闭合**。

## §6 自报（机械核讫）

> 正本：`testharness/reports/farmlandmoist-FM1-verdict.md`｜byte 五项：`11,111 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 81（split 82）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`BD6346EDE585C34D8D5E7345BF4BB290B20D974055233C42D0702937A52906B3`
> SHA-256 乙（LF 归零零位）`BD6346EDE585C34D8D5E7345BF4BB290B20D974055233C42D0702937A52906B3`
> SHA-256 丙（行链零位）`4034A27A8E70C690BCC025A83EE91E820D85F77E5E4DD7A5A8190FC666FF006B`
> 判格 4＝✓ 4／✗ 0｜R1 40 行／40 巨型／40×−1｜R2a 20 行 9:11 giant9 pair=true｜R2b 5→4 双行 TE✓｜诊断 3 臂（分级／天候探针／室外）｜钉值 5 boot（2 主窗＋1 诊断作废）／0 rebuild／0 客户端／0 产品码
> 收口：HEAD `adb2f38` 零提交｜jar 952,595/933,791/865,859 起收同值｜MK 74/164、mixins 69+10｜cfg 44,173 B/235 键/`90652ABD`（dbg=false）｜obf 30,524 B `262BFF5E` 未动｜props 938 B/level=world/`1C815ED2`｜端口 0｜crash 21 无新增｜各窗 exit0＋BUILD SUCCESSFUL｜世界 `f7wd` 已删。
