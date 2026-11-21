# 六期 D-1 耕湿批（耕地湿度系统）**W-FM 判决回执** · R196 tilledField 农田重锚

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-04（CST）｜**窗口形态**：**6 判窗 boot**（`main`＝W-FM1/4/5/6/7/8/9/REG 即时面；`red`＝W-FM7(c) 200 掷；`growth`＝W-FM9 ×1.5；`decay`＝W-FM4 复验；`moist`＝W-FM2 雨点滴；`dry`＋`dry2`＝W-FM3 四群系）＋**1 次 scan 预飞**（群系坐标）＋**3 次作废试跑**（巨型竞技场超载／新世界无平台坠落／y=180 浮台过稀，均不计分，见 C-7/C-8/C-10）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`17,990 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 18 / ✗ 3｜128 行`
> **判决源**：条 283 落码（HEAD `a02ee14`）＋条 282 D 位终裁＋条 281 对照（faces=71 checked=165 fail=5）＋条 280 摸底＋终审回执（B-14/B-15、C-15/16/17）
> **钉值**：HEAD **`a02ee14`**（窗内零提交）｜release 952,599 B `DB670368…38B7`｜dev 933,793 B `4A7F25D5…8B70`｜sources 865,725 B `C216BC04…D4AC`｜refmap 双树 **74 类键／164 面**｜mixins **69＋client 10**｜cfg 44,173 B／235 键／`90652ABD…4E9A`（dbg=false／pool=true／lapis=true／tf=10／fa=4）｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**PASS**（W-FM1..W-FM9＋W-FM-REG 全 ✓）；**A 0／B 2／C 10**（另承接 C-15/16/17）
> **一句话**：干地门 73 行／AGE 0、雨点滴 25×7 步全 0→7 无跳变、四群系失水（平原 10.9 tick／沙漠 7 tick 恒干／沼泽 0.15／雪原 0 永不）、桶 3×3 `cells=9`＋空桶、瓶 `cells=1`＋玻璃瓶、粪 farm/crop/red 117/199/brown 16/40/mycelium、湿·肥免踩＋先烂作物、farm1 三面回归与 pool 47/47——全部命中；两条 B 均为**判值源头**（mycelium 0.5 与 R196 无掷；沙漠 5.5 分对 chance>1 的公式失效）。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **W-FM1** 干地硬门（DP-A） | `main`：`d1-wb-main.out`；干田 3×3 小麦／湿田 3×3／rts=30×62 s | `growth gate dry` 每随机 tick 一条；10 分钟 AGE 不动；邻位湿田照长 | **73 条** `growth gate dry`（干田 175..177,140,750..752）；干小麦 `wheat 0` 命中；湿田 9 株年龄 1..7 **全中**；干田 `farmland 0` 命中；湿田 `farmland 7` 命中（30 s 补湿后）；湿田无 gate 行 | ✓ |
| **W-FM2** 雨点滴（D-1 甲） | `moist`：平原 5×5 @202,761；`weather rain`；rts=30×95 s | `moisture tick src=rain wet=0→1→…→7`；无 0→7；约 8 分钟满 | **175 行**＝25 块×7 步；`wet` 集合 **[0,1,2,3,4,5,6]**；坏步 **0**；0→7 跳变 **0**；25/25 块到 7；25/25 首步=0；清雨后 15 s **0 行** | ✓ |
| **W-FM3** 失水群系（D-2 甲） | `dry`/`dry2`：平原 202,761／沙漠 −342,−1031／沼泽 −86,−519／雪原 970,761；rts=60 | 平原 0.65≈12.3 分；沙漠≈5.5；沼泽 0.15≈53 分；雪原 chance 0 永不干 | 平原 175 dry/98 keep，经验 **0.641**，**10.9 tick**（模型 10.8）⇒**12.4 分**；沙漠 177/0，经验 **1.000**，**7.1 tick**⇒**8.0 分**（B-2）；沼泽 175/901，chance **0.15**（5×5 跨三群系，另见 0.65/0.35），经验 0.163，**43 tick（混样）**，纯沼泽 46.7⇒**53.1 分**；雪原 0 dry/503 keep，chance **0**，**永不** | ✓ |
| **W-FM4** 退化面（D-2 甲＋B-14） | `decay`：无作物干田＋3×3 有作物护盾＋物品顶起；rts=30×75 s | 无作物→dirt；3×3 有作物→不退化；实体被顶起 | 无作物：`moisture decay … → dirt` **1 行**，块=Dirt；护盾田 `farmland 0` **命中**、护盾作物 `wheat` **仍在**、护盾 decay 行 **0**；顶起=vanilla `turnToDirt` 直调（C-8） | ✓ |
| **W-FM5** 水桶（D-5 甲） | `main`：3×3 干田；水桶右键 TOP；满湿重击；地狱 | `cells=9`；9 格 7；空桶；无水块；满湿不消耗；地狱蒸发 | `fertilize src=bucket cells=9 wet=` 列出 **9 坐标**；`held=bucket:1`；上方 air；中心+四角 7；满湿臂 **0 行/仍 water_bucket**；无水块 | ✓ |
| **W-FM6** 水瓶（D-5 甲） | `main`：水药水 meta0 右键；满湿重击 | `cells=1`；单格湿；玻璃瓶；满湿不消耗；饮用路不动 | `fertilize src=bottle cells=1 pos=176,139,731`；`held=glass_bottle:1`；中心 7；上方 air；满湿 **0 行/仍 potion** | ✓ |
| **W-FM7** 粪施用（D-6 甲） | `main`／`red`：farm TOP／二击／作物递归／红菇 200 掷／棕菇 40 掷／菌丝 40 掷 | farm 置肥＋二击 FAIL；crop 递归；红 0.5 巨型±3σ；棕 0.5；菌丝 0.5 | farm：`fertilized set`＋`fertilize src=manure chain=farm soilEnrichment=1`，held 5→4，TE NBT 命中；二击 **无 fertilize/held 4**；crop 递归同链，held 5→4，TE 命中；红 **199 行 pass=117/fail=82/giant=117/noRow=1**（p̂=0.588，±3σ [78.8,121.2] 内）；棕 **16/24**（40 掷）giant 7；菌丝 **40 行** giant 10（无 roll 字段） | ✓ |
| **W-FM8** 湿免踩（G4/B-6） | `main`：湿田＋作物／肥田＋作物／干裸地；玩家落地 | 湿/肥 deny＋上方作物先烂；干裸地 allow＋dirt | 湿：`trample plant`＋`trample deny … wet=1`，farmland 仍在、作物 air；肥：`plant`＋`deny … fertilized=1 wet=0`，farmland 仍在、作物 air；干：`trample allow`，块=Dirt | ✓ |
| **W-FM9** farm1 回归（D-4 乙） | `main`／`growth`：fertility 施面／harvesting 产量／×1.5 TE | 三行在案；五通道 0；mixinFail 0 | `fertility tillage lvl=5 roll=0.3670 need=1.0000 pass=true`＋`fertilized set`；`harvesting crop=wheat lvl=5 fraction=1.00 factor=0.50 base=1 extra=0`；growth 窗 **105 行 ratio=1.500**（setNbt/fillNbt 均 true）；farm1 前五通道 **0**（final mining=2 为该 dig、food=3 为 `etest food` 设置）；mixinFail=0 | ✓ |
| **W-FM-REG** 零回归 | 六窗全域；`etest enchantprobe mainhand pool` | reg 47/47；pool 17 枚；ids 行；manure reg 行 | `pool reg` **47/47 与 `d1-wb-main.out` 逐字同值**；ETIM **17 枚**；`ids=14 15 23 24 25 26 27 28 29 30 31 36 37 38`；**`manure reg` 0 行**（C-1）；mixinFail=0；cfg 非 farm 键 0 改 | ✓ |

> 判格 10＝**✓ 10／✗ 0**。三条“未直接落判”的面（粪 reg 行／满湿 FAIL 行／地狱臂／顶起实体位置／菌丝 roll 字段）逐条进 C，行为面均有等价证据。

## §1 W-FM1 干地硬门

- 干田 3×3 `farmland 0`＋`wheat 0`，湿田 3×3 `farmland 7`＋`wheat 0`（30 s 时补湿一次），rts=30 跑 62 s。
- `growth gate dry block=minecraft:wheat pos=175..177,140,750..752` **73 行**；干田小麦 `testforblock … wheat 0` 命中（AGE 未动）；湿田 9 株的 AGE 0..7 中 **1..7 全部命中**（九株分布）；干田 `farmland 0` 命中、湿田 `farmland 7` 命中；**湿田位置 0 条 gate 行**。
- 对照首轮/预飞：干地零增速的两处 HEAD-cancel 均在案；本轮是**行为窗**首次在专服落判（非仅锚）。

## §2 W-FM2 雨点滴（0→7 逐级）

- 5×5 田 @(202,139,761)（平原，temp 0.8/rain 0.4），先 `weather rain 600` 后置 0，rts=30×95 s。
- **175 行**＝25 块 × 7 步；每块 `0→1→…→7`，`wet` 值集合 [0..6]，坏步 **0**、0→7 跳变 **0**、首步为 0 的块 **25/25**、到 7 的块 **25/25**。
- 墙钟：rts=30 下 7 个随机 tick ≈ 47.8 s；归一 rts=3 → 7×68.3 s=**7.97 分**（任务书“约 8 分钟”）。
- `/weather clear` 后 25 s 静置、再 15 s 采样：`src=rain` **0 行**（C-16 的落雨三差不影响本判）。

## §3 W-FM3 失水群系（chance 与时长）

| 群系 | 坐标（田／站） | 1.12 temp/rain | chance | dry/keep | 经验 | 观测 tick | 模型 tick | rts=3 分 | 任务书 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 平原 | 202,761 / 186,761 | 0.8 / 0.4 | **0.65** | 175 / 98 | 0.641 | **10.9** | 10.8 | **12.4** | 12.3 ✓ |
| 沙漠 | −342,−1031 / −326,−1031 | 2.0 / 0.0 | **1.85**（无 keep 行） | 177 / 0 | 1.000 | **7.1** | **7**（下限） | **8.0** | 5.5（B-2） |
| 沼泽 | −86,−519 / −70,−519 | 0.8 / 0.9 | **0.15**（混 0.65/0.35） | 175 / 901 | 0.163 | 43（混样） | 46.7 | **53.1** | 53 ✓ |
| 雪原 | 970,761 / 954,761 | 0.0 / 0.5 | **0.00** | 0 / 503 | 0 | — | 永不 | **永不** | 永不 ✓ |
| （海滩样本） | −310,−1031 / −326,−1031 | 0.8 / 0.4 | 0.65 | 175 / 107 | 0.621 | 11.3 | 10.8 | 12.8 | — |

- 逐块 `7→6→…→0` 链无坏步（`badSteps=0`），25/25 块全部到 0（雪原 0/25 且 0 dry）。
- **B-2（沙漠 5.5 不可达）**：`chance>1` 时“7/chance”不再是随机 tick 期望（每 tick 必干，最少 7 tick）；R196 desert 1.6→1.45、1.12 desert 2.0→1.85 **两者都 >1**，实际同为 **7 tick≈8.0 分**。实现按 `rand.nextFloat() < chance` 原样，**与 R196 一致**；任务书 5.5 是公式误用，不是落码偏差。
- **C-9（沼泽 5×5 跨群系）**：−86 的 5×5 仍跨入 0.65/0.35 邻群系，`chance` 行出现三值，观测 43 tick 是混样；**纯 0.15 块**的模型 46.7 tick=53.1 分，群系机制本身命中。

## §4 W-FM4 退化面与 B-14 顶起

- `decay` 窗：无作物干田在 rts=30 下 `moisture decay pos=186,159,700 → dirt` **1 行**，块变 **Dirt**。
- 护盾：邻位（+5）干田 **无 decay 行**，`farmland 0` 命中；护盾作物（+6 上方，带支撑田）`wheat` **仍在** ⇒ 3×3-above 作物面成立（首轮 main 的 shield 失败是**作物无支撑自行掉落**的工装错误，见 C-10）。
- 顶起：`MixinBlockFarmland` 直接调用 vanilla `BlockFarmland.turnToDirt`（`BlockFarmland.java:97-107` 的 `field_194405_c` 实体循环），B-14 的顶起半边**未被改写**；本窗未在客户端实体表捕捉到 item 位置（C-8）。

## §5 W-FM5／W-FM6 浇水手势

- **桶**：3×3 干田；水桶右键 TOP（`bot.activateItem` 的 `onItemRightClick` 射线）→ `fertilize src=bucket cells=9 wet=175,139,770;…;177,139,772;`（9 坐标全列）；9 格 `farmland 7`（中心+四角实测）；上方 air；`held=bucket:1`（A-1 返还）；**满湿重击 0 行、held 仍 water_bucket**（A-2）。
- **瓶**：`fertilize src=bottle cells=1 pos=176,139,731`；中心 7；上方 air；`held=glass_bottle:1`；满湿 0 行、held 仍 potion（A-2）。
- **C-2**：满湿臂的“FAIL 行”在代码中是 `ActionResult.FAIL` **不落行**（`MixinItemBucketUse.java:107-110`／`MixinItemPotionUse.java:74-78`），只有地狱臂有 `cells=0 hell=1`；任务书的“`cells=0` FAIL 行”不可见，已用“无 fertilize 行＋物品不消耗＋块不变”三证替代。
- **C-4**：地狱臂未执行（1.12 无维度切换命令，需真实传送门）；代码锚 `world.provider.isNether()` 与两条 `cells=0 hell=1` 行在案。

## §6 W-FM7 粪施用链

- **farm TOP**：`fertilized set pos=196,139,731 value=true`＋`fertilize src=manure chain=farm soilEnrichment=1`；held 5→4；`testforblock … {EtimFertilized:1b}` 命中。**二击**：只有 1 条 moisture 行，**无 fertilize 行**、held 仍 4（A-2）。
- **作物递归**：点小麦（包 pos=199,140,731）→ `fertilized set pos=199,139,731`＋`fertilize src=manure chain=farm…`；held 5→4；TE 命中。
- **红菇（室外草地）200 掷**（`red` 窗，17 格净空）：**199 行**，`roll<0.5` **117**／`≥0.5` **82**（p̂=0.588；200 掷 ±3σ=[78.8,121.2] 内；199 掷 z≈2.48）；**巨型=117**（与 pass 一一对应，净空后 base 块检测可靠）；无行 1（C-7：首掷放置/点击竞态）。
- **棕菇（室内菌丝）40 掷**：`kind=brown roll=` 40 行，pass **16**/fail **24**（p̂=0.40；40 掷 95% CI [0.25,0.57] 含 0.5）；巨型 7（房间高度/空间限制，roll 为准）。
- **菌丝 TOP＋上方棕菇 40 掷**：`chain=mycelium` **40 行**，巨型 **10**；**roll 值未落行**（C-6）。
- **B-1（菌丝 0.5 vs R196 无掷）**：R196 `BlockMycelium.fertilize` 对上方棕菇直接 `fertilizeMushroom`（`mite-src/decompile/src/net/minecraft/BlockMycelium.java:139-147`），无 0.5；终审回执五.8 亦记“棕=菌丝面无 0.5 掷”。落码 `ETIMItemManure.java:99` 与条 283 第 6 条写 0.5。任务判点(e)按 0.5 判 ✓；**产品口径待主会话裁**（若按 R196，应去掉该 0.5）。
- **C-3**：`etim:manure` 未 `setMaxStackSize(16)`／未设 burn 100（1.12 默认 64/0）；对照 G5.11/G5.12 的 C-9/C-10 承接，未影响本窗单件施用。

## §7 W-FM8 湿免踩（序面）

| 臂 | 行 | 块 |
| --- | --- | --- |
| 湿田+作物 | `trample plant pos=176,139,711` → `trample deny … fertilized=0 wet=1` | farmland 仍在；作物 air |
| 肥田+作物 | `trample plant pos=181,139,711` → `trample deny … fertilized=1 wet=0` | farmland 仍在；作物 air |
| 干裸地 | `trample allow … fertilized=false wet=0` | 块=Dirt |

- 序面：`trample plant` 先于 `deny/allow`；湿/肥双半边的取消只护土、不护作物（B-6）；干裸地走 vanilla `turnToDirt`。

## §8 W-FM9 farm1 回归与 ×1.5

- **fertility 施面**：`fertility tillage lvl=5 roll=0.3670 need=1.0000 pass=true pos=156,139,731`＋`fertilized set`；块=farmland。
- **harvesting 产量**：`harvesting crop=minecraft:wheat lvl=5 fraction=1.00 factor=0.50 base=1 extra=0 pos=161,140,731`；块=air。
- **×1.5 增速**：`growth` 窗单点 setblock NBT＋3×3 fill NBT 均 `EtimFertilized:1b`（`testforblock` 命中），rts=200×14 s → **105 行 `growth pos=`，`ratio=1.500`**（`value=base×1.5`）。
- **五通道**：farm1 前快照 `melee/mining/butch/arrow/ench = 0/0/0/0/0`；final `mining=2` 为 harvest 的 scythe 破块、`food=3` 为 stage 的 `etest food` 设置行；`mixinFail=0`；cfg 非 farm 键 0 改。

## §9 W-FM-REG 零回归

- `pool reg` **47 行**、ETIM **17 枚**，与 `d1-wb-main.out`（W-DP 窗）**47/47 逐字同值**（`same=47 diffs=[]`）。
- `[EtimInit] … ids=14 15 23 24 25 26 27 28 29 30 31 36 37 38`（14 枚）与首轮同值；`mixinFail=0`；boot `Done (`。
- **C-1**：`[FarmLog] manure reg etim:manure` **0 行**——`ETIM.preInit:92` 的 `ETIMFarm.registerTile()` 在 `ETIMConfig.init(event):100` 之前，行门 `farmDebugLog` 此时为默认 false；物种本体已注册（本窗 manure 全链可用即证），仅该行不可达。

## §10 冲突分级

- **A 级 0**。
- **B 级 2（判值源头，非落码失效）**：
  - **B-1（菌丝 TOP 的 0.5 掷 vs R196 无掷）**：R196 `BlockMycelium.fertilize` 直接 `fertilizeMushroom`；落码 `ETIMItemManure.java:99` 与条 283/任务书 (e) 写 0.5。现行为：菌丝 TOP 巨型 10/40；按 R196 应为 ~40/40（空间足时）。待主会话裁“保 0.5（现判）／去 0.5（R196 口径）”。
  - **B-2（沙漠 5.5 分不可达）**：`chance>1` 时 7/chance 公式失效，最少 7 tick；R196 1.6→1.45 与 1.12 2.0→1.85 均 >1 ⇒ 8.0 分。实现与 R196 同构；任务书 5.5 为公式误用。若主会话坚持 5.5，应改验收值而非改码。
- **C 级 10（本轮新增）**：
  - **C-1** `manure reg` 行不可达（preInit 早于 cfg init；物种本体已注册）。
  - **C-2** 满湿水桶/水瓶的 FAIL 行不落日志（行为=不消耗；只有 hell 有 `cells=0 hell=1`）。
  - **C-3** `etim:manure` 未设 stack 16／burn 100（1.12 默认 64/0；对照 C-9/C-10）。
  - **C-4** 地狱臂未执行（无维度命令；代码锚在案）。
  - **C-5** `moisture chance` 行缺 `biome=/rain=` 字段（有 `temp/humid/chance/ksip`；§7.6 计划字段差）。
  - **C-6** `chain=mycelium` 行无 `roll=`（0.5 门不可见；以巨型计数佐证）。
  - **C-7** 红菇 200 掷首掷 1 条无行（放置/点击 1 tick 竞态；199 行判）。
  - **C-8** B-14 顶起实体位置未在客户端实体表捕捉（`turnToDirt` 直调＋decay 行判；vanilla 顶起循环未被改写）。
  - **C-9** 沼泽 5×5 跨三群系（chance 0.15/0.65/0.35 混样；纯 0.15 块模型 53.1 分）。
  - **C-10** 前两次作废试跑：巨型竞技场 fill 超载致 bot 超时；新世界无平台坠落死亡；y=180 浮台随机 tick 过稀；另 `server.properties` 938 B 落为 `1C815ED2…`（level=world；与上一窗 `E76BB86B…` 的差为服务器重写一行，非本批钉值）。
- **承接（不改）**：C-15（成就日志面不给奖）／C-16（雨判三差：rainStrength>0.2、canSnowAt、血月）／C-17（T4 干田行构成未注）状态不变。

## §11 自报（机械核讫）

> 文件：`testharness/reports/farmlandmoist-FM-verdict.md`｜字节五项：`size 17,990 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 127（split 行数 128）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`2DE4B7C951DB3F4E513309AEE2630EF5FFBF4D804F8EDAED8C086589C363A017`
> SHA-256 乙（LF 归零零位）`2DE4B7C951DB3F4E513309AEE2630EF5FFBF4D804F8EDAED8C086589C363A017`
> SHA-256 丙（行链零位）`49965A28EED1D70F15E5D5C083656593905341AA07DB038DB3B3F324BC2F88B4`
> 判格 10＝✓ 10／✗ 0｜臂面：干田 3×3（73 gate）／雨 5×5×7 步（175）／四群系各 5×5（175 dry）／桶 3×3（9）／瓶 1／粪 farm·crop·红 199·棕 40·菌丝 40／踩 3 臂／farm1 3 面／reg 47｜钉值：6 判窗＋1 scan＋3 作废试跑／0 rebuild／0 客户端／0 产品码｜冲突 新增 **A0 B2 C10**＋承接 C-15/16/17。
> 收口：HEAD `a02ee14` 零提交｜jar 952,599/933,793/865,725 同值｜MK 74/164，mixins 69+10｜cfg 44,173 B/235 键/`90652ABD`（dbg=false）｜obf 30,524 B `262BFF5E` 未动｜`run/server.properties` 938 B/level=world/`1C815ED2…`｜端口 0｜crash 21（无新增）｜各窗 stop exit 0＋BUILD SUCCESSFUL｜临时世界 `f7wb`/`f7wc` 已删。
