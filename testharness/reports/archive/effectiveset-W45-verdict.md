# effectiveset 批（C-6 有效集建模 · 案 C）· W-45 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：2 boot（buddy 基线 + 单判窗 boot 跑完 a-l/i1 全部判点）＋ 0 客户端
> **报告字节规格**：`28,664 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 40 / ✗ 1｜315 行`
> **判据正本**：`playground/audit/` audit20 条 182-184（R196 有效集重建案 C：`ownToolClass` 手持工具自身类 → `r196SetAdmits` 材质集∪方块集；set-miss 静默 D-2(a)；等级拒只在 in-set 发行）。
> **秤上唯一判据（两条通道，纯服务端）**：
> - 判值行：`[MiningLog] tool decay face=breaking item=<reg> block=<b> loss=<N> [server]`（`mining/ETIMMining.java:284` → `logToolDecay` `:743-760`；去重键 `breaking|<item>|<block>`、sig=loss）。
> - 等级拒行：`[MiningLog] mine deny grade=<g> required=<r> item=<id> block=<id> [server]`（`logGradeDeny` `:705-720`；**只在 in-set 且 grade 不足时发行**，set-miss 静默）。
> **判决**：**PASS**——a-l 十二点全 ✓（f/g/h 拆 4/3/3 子格）＋ i 面实录格 1 条；19 个判格全 PASS；`[MiningLog]` 全窗 breaking 14／deny 2／attacking 0／shearing 0／shear drop 0／reach denied 0；起收钉值全同、零 rebuild、产品码 0 行改动、零客户端进程。

## §0 判决总表

| 点 | 面 | 期望（写死判） | 实测 | 判 |
| --- | --- | --- | --- | --- |
| W-45a | `etim:pickaxe_copper` × `stone` | breaking 恰 1 条 `loss=240` ＋ deny 0 | 1 条 240；durΔ240；air 复钉命中 | ✓ PASS |
| W-45b | `etim:mattock_copper` × `stone` | **0 条** ＋ 方块仍在 ＋ deny 0 | 0／stone 仍在／0 | ✓ PASS |
| W-45c | `etim:shovel_copper` × `stone` | 同 b | 0／stone 仍在／0 | ✓ PASS |
| W-45d | `etim:axe_copper` × `stone` | 同 b | 0／stone 仍在／0 | ✓ PASS |
| W-45e | `etim:pickaxe_copper` × `dirt`（expLevel=0） | 破块完成 ＋ 恰 1 条 `loss=0` ＋ deny 0 | 1 条 **0**；air 复钉命中（11.1 s）；Δ0 | ✓ PASS |
| W-45f1 | `mattock` × `dirt` | 恰 1 条 `loss=20` | 20；Δ20 | ✓ PASS |
| W-45f2 | `mattock` × `sand` | 恰 1 条 `loss=16` | 16；Δ16 | ✓ PASS |
| W-45f3 | `shovel` × `dirt` | 恰 1 条 `loss=25` | 25；Δ25 | ✓ PASS |
| W-45f4 | `shovel` × `sand` | 恰 1 条 `loss=20` | 20；Δ20 | ✓ PASS |
| W-45g1 | `axe` × `reeds` | 恰 1 条 `loss=8` | 8；Δ8（沙+水盆就位） | ✓ PASS |
| W-45g2 | `axe` × `log` | 恰 1 条 `loss=120` | 120；Δ120 | ✓ PASS |
| W-45g3 | `axe` × `sandstone` | 恰 1 条 `loss=150` | 150；Δ150 | ✓ PASS |
| W-45h1 | `axe` × `clay` | 恰 1 条 `loss=80` | 80；Δ80 | ✓ PASS |
| W-45h2 | `axe` × `glass` | 恰 1 条 `loss=200` | 200；Δ200 | ✓ PASS |
| W-45h3 | `axe` × `ice` | 恰 1 条 `loss=100` | 100；Δ100；破后冰→水（vanilla） | ✓ PASS |
| W-45i1 | `minecraft:wooden_pickaxe` × `stone`（i 面实录格） | deny `grade=0 required=2` 恰 1 条 ＋ breaking 0 | 1 条 0/2；0 条 breaking；stone 仍在 | ✓ PASS（记录格） |
| W-45j | `minecraft:iron_axe` × `sandstone` | 恰 1 条 `loss=150` ＋ deny 0 | 150；Δ150；0 | ✓ PASS |
| W-45k | `minecraft:iron_pickaxe` × `leaves`（expLevel=0） | 恰 1 条 `loss=0` ＋ deny 0 | 0；Δ0；破块完成（3.4 s） | ✓ PASS |
| W-45l | `etim:pickaxe_copper` × `obsidian` | deny `grade=2 required=3` 恰 1 条 ＋ breaking 0 | 1 条 2/3；0 条 breaking；obsidian 仍在 | ✓ PASS |

> **b/c/d 的反证价值**：三点同 block（stone，R196 minLevel=2）不同工具族，全部「0 行 + 方块不动 + 0 deny」——即**集合不命中的静默**（D-2(a)）。若案 C 误落成「把方块 harvestTool 当自身类」，则 mattock/shovel/axe 在 stone 上会走 in-set 等级面（铜 grade 2 ≥ required 2 ⇒ 直接挖动 ⇒ 出 breaking 行），三点会同时翻 FAIL；若误落成「空类支误放行」，则同样出 breaking 行。两点错形都被本组三点钳住。
> **j 的面义**：vanilla `iron_axe` × `sandstone` 是两案唯一值分歧位（改前=集合外 ⇒ 挖不动且 deny 缺失；改后=150）。本窗实测 1 条 `loss=150` ＋ 0 deny ⇒ 案 C 的 vanilla 同路径落点成立（D-4a）。
> **k 的面义**：vanilla `iron_pickaxe` × `leaves` 是「空类支误放行」收口位（改前误放行 20）。本窗实测 `loss=0` 一行 ⇒ 集合拒后经 !requiresTool 落到 str≤1 门，出 0 行而非误放行。
> **l 的面义**：in-set 等级拒**不是静默**——obsidian 在 pickaxe 集合内（ROCK），铜 grade 2 < required 3 ⇒ 出 deny 行且零 breaking；与 b/c/d 的 set-miss 静默形成正反对照。

## §1 逐点判词（判行原句 ＋ 行号锚）

行号一律指 `testharness/build-logs/effectiveset-w45-a.out`（**800,499 B／6,061 行**，单判窗 boot 全档）的全档行号，可 `Select-String` 直取。竞技场：`geo=(-70,76,249)`，目标格恒为 **`(-68,76,249)`**（`bx+2`，水平 2.0 格）。

### W-45a（通道活性／公式在位）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| expLevel | `[EtimTest] commands.etest.level_set player=ETIM_W45A params=[35]` | `:3712` |
| 持剪回执 | `[EtimTest] commands.etest.hold_set player=ETIM_W45A params=[Copper Pickaxe]` | `:3714` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（stone） | `:3719→:3720` |
| 速度（旁证，记录面） | `[MiningLog] mine speed item=etim:pickaxe_copper block=stone str=7.0 [server]` | `:3723` |
| dig START／STOP | `[TestLog] step=dig-start … pos=BlockPos{x=-68, y=76, z=249}`／`step=dig-stop …` | `:3724`／`:3765` |
| **判值行** | `[MiningLog] tool decay face=breaking item=etim:pickaxe_copper block=stone loss=240 [server]` | **`:3834`**（19:32:18） |
| 破块复钉 | 三轮 `The block at -68, 76, 249 is Stone (expected: Air)` → `Successfully found the block at -68, 76, 249` | `:3768/:3792/:3816` → `:3835→:3836` |

- `240 = max((int)(2.4×100×1.0), (int)(100/20), 1)`（stone 硬度 2.4／pickaxe baseDecay 1.0，`:87-155`／`:434-436`）。
- 栈 Δ＝**240**（`durabilityUsed 0→240`，bot 面板逐点 fresh 栈）。

### W-45b（★C-6 主判点：mattock × stone）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持剪回执 | `hold_set … params=[Copper Mattock]` | `:3844` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（stone） | `:3849→:3850` |
| dig START／STOP | `step=dig-start`／`step=dig-stop`（pos 同 a） | `:3853`／`:3894` |
| 破后复钉 | `Successfully found the block at -68, 76, 249`（**stone 仍在**） | `:3994→:3998` |
| breaking 行 | **0 条**（全档仅 14 条，无 mattock/stone 键） | — |
| deny 行 | **0 条**（set-miss 静默） | — |

- 门内不触发：`r196SetAdmits("shovel", stone)`＝false（ROCK 不在 shovel 集，`:647-651`）⇒ `isEffectiveAgainstBlock` false ⇒ `str=0`（`:215/:217/:225`）⇒ 进度 0 ⇒ `onBlockDestroyed` 不执行 ⇒ 既无 50+ 磨也无行。栈 Δ＝0。

### W-45c／W-45d（同 block 的另两族负证）

| 点 | 持剪回执 | 摆场复钉 | dig START／STOP | 破后复钉 | breaking／deny |
| --- | --- | --- | --- | --- | --- |
| W-45c | `params=[Copper Shovel]` `:4041` | `:4051→:4052` | `:4056`／`:4097` | stone 仍在 `:4197→:4201` | 0／0 |
| W-45d | `params=[Copper Axe]` `:4244` | `:4254→:4255` | `:4258`／`:4299` | stone 仍在 `:4398→:4402` | 0／0 |

- 两族同样 `str=0`（shovel 集不含 ROCK；axe 集不含 ROCK，`:657-662`），栈 Δ 均 0。

### W-45e（形状②：set-miss ∧ !requiresTool ⇒ loss=0 一行）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| expLevel（★必须 0） | `[EtimTest] commands.etest.level_set player=ETIM_W45A params=[0]` | `:4432` |
| 持剪回执 | `hold_set … params=[Copper Pickaxe]`（第 2 次回执为面板同步重试） | `:4446`／`:4448` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（dirt） | `:4453→:4454` |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:4457`／`:4498` |
| 进度钟（11 轮复钉未破） | `The block at -68, 76, 249 is Dirt (expected: Air)` ×11 | `:4501…:4717` |
| **判值行** | `[MiningLog] tool decay face=breaking item=etim:pickaxe_copper block=dirt loss=0 [server]` | **`:4733`**（19:33:07） |
| 破块复钉 | `Successfully found the block at -68, 76, 249`（air） | `:4734→:4735` |

- **expLevel=0 是硬条件**：`str = 1.0 × (1 + L×0.02)`（`:225/:248`）；L=35 时 str=1.7 > 1 ⇒ 走公式得 `max((int)(0.5×100), 5, 1)=50`，不出 0 行。本窗 L=0 ⇒ str=1.0 ⇒ `:277` 门（`<=1.0F`）⇒ loss=0。实测 0 行值即该门的正向证据。
- 破块耗时 11.1 s（256 tick 量级，`str/(hardness×512)` 每 tick，`:485-502`）；`dig-stop` 后服务端继续充能（`TestDriver.java:59-68`）。
- 栈 Δ＝**0**（loss=0 ⇒ `damageItem` 不入，MixinItemTool `:43-45`）。

### W-45f1-f4（回归四格）

| 点 | 持剪回执 | dig START／STOP | 判值行 | 锚 | 栈 Δ |
| --- | --- | --- | --- | --- | --- |
| W-45f1 `mattock`×`dirt` | `:4743` | `:4753`／`:4796` | `loss=20` | `:4795` | 20 |
| W-45f2 `mattock`×`sand` | `:4806` | `:4816`／`:4858` | `loss=16` | `:4857` | 16 |
| W-45f3 `shovel`×`dirt` | `:4868` | `:4878`／`:4920` | `loss=25` | `:4919` | 25 |
| W-45f4 `shovel`×`sand` | `:4930` | `:4940`／`:4982` | `loss=20` | `:4981` | 20 |

- 速度行（记录面）：`mattock` 5.25／`shovel` 7.0（`:4752/:4815/:4877/:4939`）。四格与 W-43 同值同形，无回归。

### W-45g1-g3（集合正位回归）

| 点 | 摆场复钉 | dig START／STOP | 判值行 | 锚 | 栈 Δ |
| --- | --- | --- | --- | --- | --- |
| W-45g1 `axe`×`reeds` | reeds `:5015→:5016` ＋ 水盆 `testforblock -69 75 249 minecraft:water` `:5017→:5018` | `:5022`／`:5064` | `loss=8` | `:5063` | 8 |
| W-45g2 `axe`×`log` | log `:5079→:5080` | `:5084`／`:5126` | `loss=120` | `:5125` | 120 |
| W-45g3 `axe`×`sandstone` | sandstone `:5141→:5142` | `:5146`／`:5187` | `loss=150` | `:5220` | 150 |

- reeds 走**方块集**支（`block == Blocks.REEDS`，`:660`），非旧空类支；硬度 0.08（`:149`）⇒ `max((int)8, 5, 1)=8`。
- sandstone 的 axe baseDecay＝1.875（`:438`）⇒ `(int)(0.8×187.5)=150`；速度 `str=3.5`（砂岩半效 `:767-769`，记录面）。
- g3 破块耗时 2.3 s（两轮复钉未破后命中，`:5188/:5213` → `:5221→:5222`）。

### W-45h1-h3（案 C 新正向／反向差收口）

| 点 | 摆场复钉 | dig START／STOP | 判值行 | 锚 | 栈 Δ |
| --- | --- | --- | --- | --- | --- |
| W-45h1 `axe`×`clay` | `:5235→:5236` | `:5240`／`:5282` | `loss=80` | `:5281` | 80 |
| W-45h2 `axe`×`glass` | `:5297→:5298` | `:5302`／`:5343` | `loss=200` | `:5395` | 200 |
| W-45h3 `axe`×`ice` | `:5410→:5411` | `:5415`／`:5457` | `loss=100` | `:5456` | 100 |

- h1：1.12 `hardened_clay`/`clay` 皆 ROCK，但案 C 走 **AXE BLOCK 集**（`:661-662`）⇒ 0.8×100=80（B-1 的旧材质塌缩被方块集覆盖）。
- h2 破块耗时 3.4 s（三轮复钉，`:5346/:5370/:5394` → `:5396→:5397`）。
- h3 破块后 1.12 `BlockIce.onPlayerDestroy` 把冰换成水 ⇒ 复钉「冰已不在」：`The block at -68, 76, 249 is Water (expected: Ice)`（`:5458→:5459`）＝破块成功的负证；随后 `fill` 净空内腔（防残留水进 `isInsideOfMaterial(WATER)` 的 ÷5 环境罚污染后续 `str` 面）。

### W-45i1（i 面实录格：vanilla 木镐灰区）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持剪回执 | `hold_set … params=[Wooden Pickaxe]` | `:5469` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（stone） | `:5474→:5475` |
| **拒行** | `[MiningLog] mine deny grade=0 required=2 item=minecraft:wooden_pickaxe block=stone [server]` | **`:5478`**（19:34:10） |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:5479`／`:5520` |
| 破后复钉 | `Successfully found the block at -68, 76, 249`（stone 仍在） | `:5622→:5624` |
| breaking 行 | **0 条** | — |

- 木镐 vanilla harvestLevel 0 ⇒ `getToolGrade` 折 0（`:512-518`）；stone 属 pickaxe 集合（ROCK）且 minLevel 2 ⇒ `inSet ∧ grade<min` ⇒ `logGradeDeny(grade=0, required=2)`。**这是 in-set 等级拒，不是 set-miss**——与 b/c/d 的静默形成对照。
- 只记录不断言（i 面口径）；本窗该格同时具备确定性期望，故按「命中即 ✓」记录。

### W-45j（★案 C 主判点：vanilla iron_axe × sandstone）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持剪回执 | `hold_set … params=[Iron Axe]`（含一次面板同步重试） | `:5667` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（sandstone） | `:5677→:5678` |
| 速度（记录面） | `[MiningLog] mine speed item=minecraft:iron_axe block=sandstone str=8.0 [server]` | `:5681` |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:5682`／`:5724` |
| **判值行** | `[MiningLog] tool decay face=breaking item=minecraft:iron_axe block=sandstone loss=150 [server]` | **`:5723`**（19:34:22） |
| 破块复钉 | `Successfully found the block at -68, 76, 249`（air） | `:5725→:5726` |

- vanilla 双口径：集合＝axe 方块集（sandstone 命中 `:660`），等级＝harvestLevel 2→折 3 ≥ minLevel 1（`:516-517`）；baseDecay 1.875 ⇒ `(int)(0.8×187.5)=150`。**改前该格在集合外 ⇒ 挖不动且不发行**，故本行是案 C 收意的唯一分歧位证据。

### W-45k（★空类支收口：vanilla iron_pickaxe × leaves）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| expLevel（★必须 0） | `level_set … params=[0]` | `:5732` |
| 持剪回执 | `hold_set … params=[Iron Pickaxe]` | `:5734` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（leaves） | `:5740→:5741` |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:5744`／`:5785` |
| 进度钟 | `The block at -68, 76, 249 is Leaves (expected: Air)` ×3 | `:5788/:5812/:5837` |
| **判值行** | `[MiningLog] tool decay face=breaking item=minecraft:iron_pickaxe block=leaves loss=0 [server]` | **`:5853`**（19:34:30） |
| 破块复钉 | `Successfully found the block at -68, 76, 249`（air） | `:5854→:5855` |

- 旧空类支＝「reeds/leaves 一类被误放行 20」；案 C 后 pickaxe 集合不含 LEAVES ⇒ set-miss ⇒ `requiresTool(leaves)=false`（`BLOCK_MIN_LEVEL` 无 leaves 行 ⇒ 0）⇒ str=1.0（L=0）⇒ loss=0 一行。**实测 0 即「误放行已关」**。
- 栈 Δ＝0；破块耗时 3.4 s。

### W-45l（★等级拒正证：铜镐 × obsidian）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持剪回执 | `hold_set … params=[Copper Pickaxe]` | `:5863` |
| 摆场复钉 | `Successfully found the block at -68, 76, 249`（obsidian） | `:5868→:5869` |
| **拒行** | `[MiningLog] mine deny grade=2 required=3 item=etim:pickaxe_copper block=obsidian [server]` | **`:5872`**（19:34:34） |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:5873`／`:5914` |
| 破后复钉 | `Successfully found the block at -68, 76, 249`（obsidian 仍在） | `:6017→:6020` |
| breaking 行 | **0 条** | — |

- obsidian 在 pickaxe 集合（ROCK）且 R196 minLevel 3（`:133`）；铜 grade 2（`ETIMMetals.COPPER` grade 2）⇒ `inSet ∧ grade<min` ⇒ deny 一行；`str` 因 `!ok` 落 0 ⇒ 无进度 ⇒ 零 breaking。栈 Δ＝0。

## §2 计数总账（写死判）

| 面 | 全窗行数 | 判 |
| --- | --- | --- |
| `tool decay face=breaking` | **14** | 逐位命中 14 个破块判格（a／e／f1-f4／g1-g3／h1-h3／j／k） |
| `tool decay face=attacking` | **0** | ✓ |
| `tool decay face=shearing` | **0** | ✓ |
| `mine deny` | **2** | i1（0/2）＋ l（2/3），各恰 1 条 |
| `mine speed` | **12** | 记录面（加成前 str，见 B-1）；集合命中点各 1 条 |
| `shear drop` | **0** | ✓ |
| `reach denied` | **0** | ✓ |
| `[MiningLog]` 合计 | **28** | 14＋12＋2 |

- breaking 发行序（全窗，逐点值报价）：`pickaxe_copper/stone:240` → `pickaxe_copper/dirt:0` → `mattock_copper/dirt:20` → `mattock_copper/sand:16` → `shovel_copper/dirt:25` → `shovel_copper/sand:20` → `axe_copper/reeds:8` → `axe_copper/log:120` → `axe_copper/sandstone:150` → `axe_copper/clay:80` → `axe_copper/glass:200` → `axe_copper/ice:100` → `minecraft:iron_axe/sandstone:150` → `minecraft:iron_pickaxe/leaves:0`。
- deny 发行序：`minecraft:wooden_pickaxe@stone grade=0/2` → `etim:pickaxe_copper@obsidian grade=2/3`。
- 去重面自证：19 个判格的 `face|item|block` 键互异（j 与 g3 同 block 不同 item；i1 与 l 同 stone/obsidian 不同 item）⇒ 单 boot 不互吞，每格恰 1 条。
- 非判据通道（只记录）：`[FoodLog] digDrain` 1,849 行（挖掘耗食链，独立通道）；`[TestLog] step=` 38 行（19 点 × start/stop）；`[EtimTest]` 60 行；`testforblock` 60 次；`setblock` 455 次；`### [harness] >` 631 行。
- 其它面零命中：Mixin 失败 0；`[BlockLog]` 0；ETIM 侧 ERROR 0（全档 21 条 ERROR 均为 FML/fernflower dev 环境噪声：`:52-54`／`:181`／`:213-297`／`:2438-2441`）。

## §3 起收钉值（全同 ⇒ 零 rebuild、零产品码改动）

| 项 | 起窗（任务书钉） | 收窗实测 | 判 |
| --- | --- | --- | --- |
| HEAD | `d8e1e4963de2e9c8f1a83b6ac96569a9c76a46f3` | 同（窗内零提交；`git status` 仅新增本窗驱动） | ✓ |
| release jar | 775,235 B｜`20047D59FC87D9C89AECDA86C43FA1EF2421237581E4E0E5ACFDE072DC30739C` | 同（byte-identical） | ✓ |
| dev jar | 759,437 B｜`68B0E4653AC2235C82BDBBE6B542460B10DD23AB96D08A8627600FD92C80686E` | 同（byte-identical） | ✓ |
| sources jar | 703,167 B｜`60015654CD1043F8EF3CDF6886E3D326723401B0015D3FB8FA74F09F410E1D10` | 同（byte-identical） | ✓ |
| 服务端 cfg | 32,095 B｜`E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5` | 同（buddy boot 后即同值；窗内零编辑、零新键） | ✓ |
| 客户端 cfg | 30,277 B｜`E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45` | 同（本窗**未触碰**；快照仅作收口对勘） | ✓ |
| `server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 同（`level-name`/`spawn-protection` 已还原，byte-identical） | ✓ |
| MK | refmap 双树 62 类键／138 条目（切片 Sword 4／Tool 4／Shears 3）＋ mixins 56／client 10 | 同（两树同值） | ✓ 139/57/11 未出现 |
| `run/obfuscated/options.txt` | — | 未读写（本窗零客户端） | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` | 18 | 18 | ✓ |
| 世界目录 | — | `run/effectivesetw45`／`run/effectivesetw45buddy` 均已删 | ✓ |
| Gradle | — | 两次 boot `:compileJava/:classes/:jar` 全 **UP-TO-DATE**；`BUILD SUCCESSFUL`（buddy 18 s／判窗 2 m 57 s） | ✓ 0 rebuild |

**cfg 双件口径**：buddy boot 后 `cfg 32095 B E07CAC1E…7AE7F5`（与 pin 同值，**零新键预言成立**）；判窗 boot 前后同值；收窗快照 `effectiveset-w45-etim.cfg.before`／`-client-etim.cfg.before` 与落盘逐字节同。

## §4 冲突分级（A / B / C）

**A 级 0 条**（无判格 FAIL、无产品码改动、零 rebuild、零客户端动作）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| B-1 | B | **`mine speed` 行的 `str=` 是「加成前」值**：`:219` 在等级加成（`:248`）、饱食/落水/离地除数（`:239-247`）、haste（`:231-234`）之前发行，不是挖掘实际 str（本窗铜系恒 7.0／mattock 5.25／iron_axe 8.0）。 | 本批只作记录面，不作断言；若后续要判「有效速度」，须另加终值列（D-2）。 |
| B-2 | B | **破后变种面**：1.12 `BlockIce.onPlayerDestroy` 把冰换成流动水，`testforblock … air` 永不命中（首窗据此误判，见 C-1）。同类面（水/岩浆/被替换方块）都不能用单一 air 期望。 | 破块复钉改「原方块已不在」负证（h3 用 `expected: Ice` 失败行）＋破后 `fill` 净空；口径固化见 D-3。 |

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **首窗 h3 误判 FAIL（驱动期望错，非产品错）**：首窗（11:26–11:29）按 `testforblock air` 判破块，冰→水导致 15 s 轮询全不命中；同窗 `loss=100` 行已正确发行。 | 驱动加 per-point `after` 期望（h3＝`{block:'minecraft:ice', found:false}`）＋`cleanupFill`；以 11:31–11:34 重跑窗为锚点正本，首窗证据整目录留 `build-logs/effectiveset-w45-run1/` 作旁证。 |
| C-2 | C | **buddy 窗 evidence JSON 被同名判窗覆盖**：两 mode 共用 `effectiveset-w45-evidence.json`。 | buddy 事实以 `effectiveset-w45-buddy-driver.log`（含 `after buddy boot: cfg 32095 B E07CAC1E… 零新键预言成立`）＋`effectiveset-w45-buddy.out`（Done 6.026 s／BUILD 18 s／`:jar UP-TO-DATE`）为据；后续批建议 evidence 名带 mode 后缀。 |
| C-3 | C | `etest hold` 对 etim/vanilla 栈偶发**二次 hold**（e 点 `:4446/:4448`、j 点一次重试）：首回执后 bot 面板 `durabilityUsed` 需一轮同步才落 0，驱动 4 次重试吸收。 | 判行 `item=` 才是栈身份真值（C-4），重试不改判据面。 |
| C-4 | C | `hold_set` 回执只给**显示名**（`Copper Pickaxe`／`Wooden Pickaxe`／`Iron Axe`），不含 registry name。 | 栈身份以判行 `item=`（`etim:pickaxe_copper` 等）为准（W-42 C-5 家族）。 |
| C-5 | C | modded 栈 mineflayer 侧**无 `maxDurability`**，仅 `durabilityUsed` 可读。 | 栈 Δ 只读 `durabilityUsed` 差值，不读 max、不算百分比（W-42 C-2 家族）。 |
| C-6 | C | **零客户端面**：本窗纯服务端（C-9 硬条款）——零拉起、零关窗、零 `options.txt`、零 GUI；全部判据来自服务端 `latest.log` 与 `runServer` 控制台 tee。 | 记正面事实，无许可链问题（W-44 C-9 不重演）。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | `mine deny` 行是否再加「拒因」列（`why=grade|set`） | (a) 不加（deny 天然只出现在 in-set，set-miss 静默即已二分）／(b) 加列 | **(a)**：i1 与 l 证明 in-set 等级拒可读；b/c/d 证明 set-miss 静默；两态已可辨 |
| D-2 | `mine speed` 是否追加「终值 str」列（B-1） | (a) 不加（记录面，进度钟另有实测）／(b) 加终值 | **(a) 先不加**（AGENTS 条 2 最简单实现；进度面已有 testforblock 时间轴） |
| D-3 | 「破后变种面」复钉口径固化（B-2/C-1） | (a) 固定为「原方块已不在」负证 ＋ 破后净空 ／(b) 逐方块自定义期望块 | **(a)**：与方块无关、可重复、不漏判 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 boot 1（buddy 基线） | 11:20:49–11:21:09：`Preparing level "effectivesetw45buddy"` `:512`；`Done (6.026s)` `:2256`；`BUILD SUCCESSFUL in 18s` `:2440`；`:jar UP-TO-DATE` `:35` |
| 服务端 boot 2（判窗） | 11:31:46–11:34:44：`Preparing level "effectivesetw45"` `:510`；`Done (6.144s)` `:2256`；`BUILD SUCCESSFUL in 2m 57s` `:6058`；`:compileJava/:classes/:jar` 全 UP-TO-DATE `:31/:33/:35` |
| 客户端 | **零会话**（未拉起、未关窗；`options.txt` 未读写） |
| 端口 | 25565 LISTEN＝0（起 0／收 0）；25575 未用 |
| 崩溃 | `run/crash-reports` 18 → 18（无新增） |
| cfg／props／ops／usercache／usernamecache | 服务端 cfg 与客户端 cfg 均 **byte-identical**（pin 值）；props／opus 三项 byte-identical；`spawn-protection`／`level-name` 已还原 |
| 世界 | `run/effectivesetw45`、`run/effectivesetw45buddy` 已删（`worldsRemoved` 双 true） |
| rebuild | **0**（两次 boot 三任务全 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅 `?? testharness/player/effectiveset-w45.js`；HEAD 未动） |
| judge 修复态变量 Kong | **N/A**——本窗驱动为一次性判窗脚本，无 judge 状态变量（同 W-44 登记口径） |

## §7 工装与复跑

- **驱动**：`testharness/player/effectiveset-w45.js`（骨架＝`mattockbreak-w43.js`，破块臂保留；新增 per-point `level`／`arena`／`after`／`waitMs`／`cleanupFill`、deny 判面、`fill` 净空）
  - `W45_MODE=buddy|window|all`（默认 all：先 buddy 基线，再判窗）
  - `W45_ONLY=W-45a,W-45b`（判点裁剪，冒烟用）
  - `W45_STAGE=<tag>`（服务端 `.out` 名隔离；默认取 tag）
  - 判点表 `POINTS`：19 格（a／b／c／d／e／f1-f4／g1-g3／h1-h3／i1／j／k／l），每格含 `item`／`block`／`level`／`rows`／`deny`／`expectBreak`／`after`／`waitMs`
  - 判行解析：`tool decay`（face/item/block/loss ＋ `block=` 列形单读）／`mine deny`（grade/required/item/block）／`mine speed`（记录面）
- **判点裁剪口径**：`level` 35 用于破块加速点；`level` 0 用于 loss=0 两点（e／k，因 `str = 1.0×(1+L×0.02)` 必须 ≤1 才落 `:277` 门）。
- **证据卷**（`testharness/build-logs/`）：`effectiveset-w45-a.out`（800,499 B／6,061 行）／`-a-server-latest.log`（771,057 B）／`-evidence.json`（81,156 B）／`-anchors.txt`（逐点锚索引）／`-driver.log`（78,502 B）／`-buddy.out`（358,455 B／2,443 行）／`-buddy-driver.log`／`-buddy-server-latest.log`／`-etim.cfg.before`／`-client-etim.cfg.before`／`-server.properties.before`／`-ops.json.before`／`-usercache.json.before`／`-usernamecache.json.before`／`effectiveset-w45-run1/`（首窗旁证，C-1）／`effectiveset-w45-run2/`（二次窗，加 i1 前的 18 格旁证）。
- **复跑命令**（仓根 `git-workspace/etim`）：

```powershell
# 1) buddy 基线（一次）
$env:W45_MODE='buddy'; node testharness\player\effectiveset-w45.js effectiveset-w45
# 2) 判窗（单 boot 跑完 a-l/i1）
$env:W45_MODE='window'; node testharness\player\effectiveset-w45.js effectiveset-w45
# 3) 冒烟（两点）
$env:W45_MODE='window'; $env:W45_ONLY='W-45a,W-45b'; node testharness\player\effectiveset-w45.js effectiveset-w45
```

- **判行复核（可粘贴）**：

```powershell
Select-String -Path testharness\build-logs\effectiveset-w45-a.out -Pattern '\[MiningLog\] tool decay'
Select-String -Path testharness\build-logs\effectiveset-w45-a.out -Pattern '\[MiningLog\] mine deny'
Select-String -Path testharness\build-logs\effectiveset-w45-a.out -Pattern '\[MiningLog\] mine speed'
Select-String -Path testharness\build-logs\effectiveset-w45-a.out -Pattern 'step=dig-(start|stop)'
Select-String -Path testharness\build-logs\effectiveset-w45-a.out -Pattern 'The block at -68, 76, 249'
Select-String -Path git-workspace\etim\src\main\java\io\github\etim\etim\mining\ETIMMining.java -Pattern 'ownToolClass|r196SetAdmits|logGradeDeny|logToolDecay'
```

## §8 未覆盖面（不补白）

1. **第二观察假人 `block_break_animation`**（C-1 家族升级纪律「选题性」）未做——本窗判据只取服务端行＋`testforblock` 三读。
2. **同 boot 同值重击去重**未测：本批 19 格键互异，未做「同 key 同 sig 第二次必被吞」的正证（W-35j 已在该批证过）。
3. **高硬度矿石等级拒**未并测：只用 obsidian 一档（grade 2/required 3）；ore_copper(2)/ore_mithril(3)/ore_adamantium(4) 面未跑。
4. **创造模式 `loss=0`（creative 门）**未测：本批全部 survival；creative 门的 loss=0 行与 e/k 的 str 门在行形上不可分（同 `loss=0`）。
5. **副手/双持与工具切换**面未测（`getHeldItemMainhand` 单口径）。
6. **`isPortable` 面**未测（TNT/箱子一类 portable 强制 loss=0，与本批集合面正交）。
7. **其它 `ownToolClass` 族**（war_hammer 的 cake/pumpkin 并集、hatchet/battle_axe 的砂岩系数）未并测——本批只覆盖 pickaxe/shovel/axe/mattock 四族。

## §9 自报（机械核讫）

> 文件：`testharness/reports/effectiveset-W45-verdict.md`｜**28,664 B**｜315 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`F0354FDC7AC9FD8CE552A828F8F43E1097461123F2BC07622162042514246F8A`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`BC03680C7BC3A46993CFF0C47AA5C3DE5F205862902D41DAF6B5B95DE23E11A4`
> 判格 19（a／b／c／d／e／f1-f4／g1-g3／h1-h3／i1／j／k／l）全 ✓｜`[MiningLog]` breaking 14／deny 2／attacking 0／shearing 0／shear drop 0／reach denied 0｜冲突 A0 B2 C6｜待裁 D-3｜jar byte-identical／零 rebuild／产品码 0 改／零客户端
