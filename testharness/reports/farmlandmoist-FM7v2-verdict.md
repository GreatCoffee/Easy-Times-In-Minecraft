# 六期 D-1 耕湿批 · **W-FM7v2 全臂重走判决**（A-1/A-2 修后，HEAD `3b54ca1`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 3 boot**（b1 红臂＋R3＋R2b 存盘／b2 室内臂＋R2a／b3 重载）＋ pilot 2 boot；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`11,012 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 14 / ✗ 4｜88 行`
> **判决源**：W-FM7v2 任务书（A-1/A-2/B-1/B-2 修，HEAD `3b54ca1`）＋ W-FM7 判决（`farmlandmoist-FM7-verdict.md`）＋ R196 一手 `ItemManure.java:9-78`／`BlockMushroom.java:228-230,352-405`／`BlockMycelium.java:139-154`／MITE `World.java:5658-5875`
> **钉值**：HEAD **`3b54ca1`**（窗内零提交）｜release 957,686 B `806D2AAC…BA70`｜dev 938,828 B `29B3499E…95EB`｜sources 870,596 B `E1A1A86C…16AB`｜refmap 双树 74 类键／164 面｜mixins **70**＋client 10｜cfg 44,173 B／235 键／`90652ABD…4E9A`（dbg=false）｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**PASS**（R1a／R1b／R1c／R1d／R2／R3／R4 全 ✓，**✓7／✗0**）｜**A 0／B 1（新增静态登记 B-5）／C 0（新增）**
> **一句话**：A-2 的两针一挂上，三级成熟面即活（红 20 手／棕 10 手都精确落在「掷中第 3 次出巨型」，7 个巨型样本 0 失败）；A-1 的双门在「5×5 板遮本列、邻 3 格外露天」位点上正交成立（红臂 20/20 落行、0 白耗），两个对照位分别只踩 `legal=0`／`out=0`——上一窗「两门互斥」的根因确已消失。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1a** 红点击臂（合法穗位 20 手） | `kind=red roll=x.xx stage=n/3 giant=0\|1`／`stage=-1` | 每手 1 行；掷中 1/3→2/3→3/3，第 3 次掷中出巨型；未中 `-1` 不动；每手 −1 | **20 行／20 手**，Δ**−1 ×20**：`-1,-1,-1,1/3,2/3,G(6)` → 重摆 → `-1,1/3,-1,2/3,-1×5,G(16),1/3,-1,-1,2/3`；**2 巨型，base 块 testforblock 双命中** | ✓ |
| **R1a-对照①** 露天（无遮板） | `gate=deny … legal=0` | 仅合法门拒绝 | `ground=1 out=1 **legal=0**`，held 不动 | ✓ |
| **R1a-对照②** 9×9 顶（flood 不可达） | `gate=deny … out=0` | 仅室外门拒绝 | `ground=1 **out=0** legal=1`，held 不动 | ✓ |
| **R1b** 棕点击臂（室内菌丝 10 手） | `kind=brown roll= stage=` | 同构，第 3 次掷中出巨型 | **10 行**，Δ−1 ×10：`-1,1/3,2/3,-1,G(5),1/3,2/3,G(8),-1,1/3`；**2 巨型 base 双命中** | ✓ |
| **R1c** 菌丝 TOP（室内 6 击＋室外 1 击） | `chain=mycelium roll=none stage=`／`outdoor=1` | 每 3 击巨型（×2）；室外白耗、stage 不动、存活 | 室内 `1/3,2/3,G,1/3,2/3,G`（**2 巨型 base 双命中**）；室外 `outdoor=1 stage=-1` Δ−1、蘑菇存活 | ✓ |
| **R1d** 草 TOP（上方红菇，B-1 入口） | `kind=red roll= stage=` | 等效点菇，行递进 | `kind=red roll=0.41 stage=3/3 giant=1`，Δ−1（连续第 3 次掷中） | ✓ |
| **R2** stage 载位 | `stage=n/3` | 重种归零；存档重载保位 | 重种前 `1/3,2/3` → `air` 重摆 → **`1/3`**；b1 `1/3` → save → **b3 载后 `2/3`**、块存活 | ✓ |
| **R3** farm spot | `fertilized set … value=true`＋`chain=farm soilEnrichment=1` | 首击 set+soil、−1；已肥二击 0 行不动 | 首击 `fertilized set pos=206,139,700 value=true`＋`soilEnrichment=1`、Δ−1；二击 **0 行**、Δ**0** | ✓ |
| **R4** 收口 | 钉值五项 | 起收全同 | §6（全同；mixinFail 0×3；cfg 235；obf 未动；端口 0；crash 21） | ✓ |

> 判格 7＝**✓ 7／✗ 0**。巨型样本 7（红 2＋棕 2＋TOP 2＋R1d 1），**0 失败**（无 `giant=failed` 行）。

## §1 A-1 闭合：双门正交的现场证据

- **位点**：蘑菇 (196,140,700)，草地 (196,139,700)，正上方 **5×5 石板 y=154**（仅遮本列及其 2 格邻列）；邻 3 格（x=193/199 或 z=697/703）全露天。
- **判定链**：`mushroomLegalAtMITE` 取 `!canSeeSky`（板在 y+14 ⇒ 假 ⇒ 合法）；`isOutdoorsMITE` 走 R196 `World:5658-5875` 同层 7×7 洪水，x+3 的露天列 `precipHeight=y-1 ≤ y` ⇒ 真。两门**同时**为真，红臂 20 手全部放行。
- **互斥已消的反证**：同一窗内两个对照位各自只踩一门——露天位 `out=1 legal=0`（遮天面独立失效），9×9 顶位 `out=0 legal=1`（洪水面独立失效）。两门现在互相独立，不再互补。
- **巨型不被顶板挡**：`WorldGenBigMushroom.generate:47-79` 的净空检查止于 `y+1+i ≤ y+13`，板在 `y+14` 之外；2 个红巨型均在板下生成成功（base 块命中）。

## §2 A-2 闭合：stage 载体真的挂上了

- `MixinBlockMushroomTile` 两针（`hasTileEntity→true`／`createTileEntity→ETIMMushroomGrowthTile`，BROWN/RED 过滤）在 3 个 boot 中 `mixinFail=0`；manifest mixins 70。
- 行为证据：R1b 连续两手 `1/3 → 2/3`（pilot）与正式窗 `1/3,2/3,G`；R2a 重种后回 `1/3`；R2b 过 2 次停服/载入仍从 `1/3` 读到 `2/3`。若 TE 未挂，读写恒 0，绝不可能出现 2/3 与巨型。
- **B-2 路径未触发**：7 次巨型生成 0 失败（无 `giant=failed` 行），失败重钉 mature stage 的静态实现（`ETIMItemManure:89-100`）本窗未实测，按静态核讫登记。

## §3 R1c／R1d

- **R1c 室内**（(170,140,700)，菌丝地面，房高 16）：6 击 `1/3,2/3,G,1/3,2/3,G`——第 3、6 击各出巨型，base 块双命中；每击 Δ−1，无掷（`roll=none`）。
- **R1c 室外**（(212,140,700)，5×5 板 y+14 遮本列、邻 3 格露天 ⇒ `isOutdoors` 真）：`outdoor=1 stage=-1`、Δ−1、蘑菇存活——R196 `BlockMycelium.fertilize:139-154` 的「白吃」面成立（`tryGrowGiantMushroom` 因室外返回 false，但 `fertilize` 返回 true）。
- **R1d**：点草块 (196,139,700) TOP 面，行落在 `kind=red`（`ItemManure:50-51` 递归入口），本击为连续第 3 次掷中 ⇒ `giant=1`，Δ−1。

## §4 R2 stage 载位

- **重种**：室内 TOP 位连击 `1/3`、`2/3` → `setblock air` → 重摆棕菇 → 一击 `1/3`（TE 随宿主清面，计数重开）。
- **存档重载**：b1 一击 `1/3` → `save-all` → 优雅停 → b2（正常跑臂）→ b3 载入 0.985 s → 块存活、一击读 **`2/3`**（载体跨 boot 保位）。
- 两子面分 boot 布点（R2b 在 (162,140,692)，与 R1b 的 7×7 巨型足迹 159..165×697..703 无重叠；R2a 在 (178,140,700)），无串扰。

## §5 R3 farm TOP 面

- 首击（(206,139,700)，先 `air` 再 `farmland` 清旧 TE）：`fertilized set pos=206,139,700 value=true` ＋ `fertilize src=manure chain=farm soilEnrichment=1`，held 8→7。
- 已肥二击：**0 行**、held 仍 7 ⇒ A-2「已肥不消耗」保持。

## §6 R4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `3b54ca1`／收 `3b54ca1`（零提交） |
| jar | release 957,686 B `806D2AAC335AF98D478D1A30CDBD0A98ECB3388739339EE1FA6657D4BB0EBA70`；dev 938,828 B `29B3499E35C54AB96DF50940364BDDE1C18DDE0605B6A57B6BF6BF43701E95EB`；sources 870,596 B `E1A1A86C4779F127A6F2B599C1234D8C5B4807B4DCE0DAEB774BBF3A984F16AB`（起收同值） |
| MK | refmap 74 类键／164 面（双树同）；mixins **70**＋client 10；mixinFail **0**（b1/b2/b3 各 0） |
| cfg | 44,173 B／235 键／`90652ABD…4E9A`；`farmDebugLog` 收口回 false |
| obf | 30,524 B／`262BFF5E…C9AD` 未动 |
| props | 938 B／`1C815ED2…EC58`／`level-name=world`（起收同值） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；`f7w2j` 与两个 pilot 世界（`f7w2`／`f7w2b`）已删；无残留**游戏** JVM |
| 停服 | b1／b2／b3 均 exitCode **0**＋`BUILD SUCCESSFUL` |
| 零回归 | 五通道 Melee/Mining/Butch/Arrow/Ench **全 0**（b1 farm 27 行／b2 19／b3 1）；无 crash、无 mixin 错；`food` 通道 b1 3 行、b2 5 行均为 `placeDrain`（见 B-5），b3 0 行 |

## §7 冲突分级

- **A-1（已闭）**：`isLegalAt=!canBlockSeeSky` ＋ R196 `isOutdoors` 洪水，在「遮本列＋邻 3 格露天」位点正交同真；露天与 9×9 顶两个对照各只踩一门。
- **A-2（已闭）**：蘑菇两针挂上后 stage 真递进（1/3→2/3→3/3），7 个巨型 0 失败；重种归零、重载保位均实测。
- **B-1（已闭）**：草 TOP 上方红菇的递归入口实测落 `kind=red` 行。
- **B-2（静态）**：`giant=failed` 重钉路径本窗未触发（0 失败），实现按 `ETIMItemManure:89-100` 静态核讫。
- **B-5（新，静态观察／跨模块）**：巨型生成在 Forge `ItemStack:200` 的 place-snapshot 包裹内落块，~百块各触发 `PlaceEvent`，经 `ETIMFoodStatsEvents.onPlaceBlock` → `ETIMEndurance.chargePlace(hardness 0.2 = 巨型菇块)` 计入玩家 place-hunger 池（b1 pool 0.53→1.32→2.30、b2 续增并有 satiation 结算行）。R196 一手无该 Forge 包裹（其放置扣饿挂在方块放置路径），属 1.12 归因副作用；建议另批裁定（如生成期间摘快照，或 WorldGen 走非玩家上下文），本批判面不含此项。
- **C 级**：C-11（首次 useblock 丢包——本窗判窗驱动以「无 `[TestLog] step=useblock` 才重试」为闸，正式窗 **0 重试**）／C-12（同态 setblock 不重建 TE，R3 已按 `air` 前置）／C-16（`testforblock` 的 NBT 段在蘑菇挂 TE 后**会**比对；本窗 judged 面不依赖 NBT 断言）沿用；C-14／C-15（上窗工装自伤）在本窗驱动中已消除。

## §8 自报（机械核讫）

> 正本：`testharness/reports/farmlandmoist-FM7v2-verdict.md`｜byte 五项：`11,012 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 87（split 88）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`10D7001DF8A05985E9DBED14E1FA3AABFF8E6F2DDC2B5BB05B3AF9440DFF812C`
> SHA-256 乙（LF 归零零位）`10D7001DF8A05985E9DBED14E1FA3AABFF8E6F2DDC2B5BB05B3AF9440DFF812C`
> SHA-256 丙（行链零位）`EB4EB52938829AC7792B4208A171EFD0AEEFB5ECB9136796E87EDF6EFCD656E2`
> 判格 7＝✓ 7／✗ 0｜R1a 20 手 20 行 Δ−1、2 巨型（第 6/16 手）｜R1b 10 手 Δ−1、2 巨型（第 5/8 手）｜R1c 室内 6 击 2 巨型（第 3/6 击）、室外 outdoor=1 白耗存活｜R1d 草 TOP 递归 1 行｜R2 重种 1/3、载后 2/3｜R3 set+soil 8→7、二击 0 行｜钉值 5 boot（judged 3＋pilot 2）／0 rebuild／0 客户端／0 产品码
> 收口：HEAD `3b54ca1` 零提交｜jar 957,686/938,828/870,596 起收同值｜MK 74/164、mixins 70+10、mixinFail 0｜cfg 44,173 B/235 键/`90652ABD`（dbg=false）｜obf 30,524 B `262BFF5E` 未动｜props 938 B/level=world/`1C815ED2`｜端口 0｜crash 21 无新增｜b1/b2/b3 exit0＋BUILD SUCCESSFUL｜世界 `f7w2j` 与两个 pilot 世界已删。
