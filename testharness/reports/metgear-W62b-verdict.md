# metgear 批（金属剪 6＋gold 链/链甲 · 落码批）· W-62…W-69 重跑窗回执（b 版）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（服务端日志 CST 13:35:33–13:38:19）｜**窗口**：本窗 boot **2 次**（smk 冒烟 #1 ＋ 定本 #2；上限 2，前窗 A-1 红卷另计）｜**0 客户端**
> **报告字节规格**：`14,158 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 22 / ✗ 2｜141 行`
> **判据正本**：audit20 条 212（D-1…D-6 终裁）／条 213（终审放行＋落码清单）／条 214（落码收讫＋判窗预值 132／35／160）／条 216（A-1 修复：`before` 上移）；`playground/audit/metgear-立项摸底.md` §1.4（六剪判值表）／§3.4（gold 链甲判值表）／§4（七处特判）／§5（判行锚）；`playground/audit/metgear-终审回执.md` §四（判值速查）。
> **判决**：**PASS** —— 8 判点 **8 ✓ / 0 ✗**；零 rebuild、零产品码、零 cfg 写、零客户端、世界已删、起收钉值全 byte-identical。前窗 A-1（配方闸 `35≠29` boot 崩）已由 `fe59552` 修复并在本窗 boot 实测闭合（`:339` 出 `35 batch rows ok / total 160`）。

## §0 判定总表（8 判点）

四值：**faces=8｜checked=8｜pass=8｜fail=0**。

| 点 | 判 read（判据位） | 实测 | 判 |
| --- | --- | --- | --- |
| **W-62** | `[EquipLog] durability reassert: 132 gear rows ok` ＋ `[TestLog] gear recipes registered: 35 batch rows ok (… etim-domain total 160 …)` | **132／35／160** 恰值（`:515` ／ `:339`） | ✓ |
| **W-63** | 六剪 gear 行 per-metal（individual 列逐件）＋ gold 链甲四件 armor double 原值 | 六剪：copper/silver/gold **3200**（eff 1.75／grade 2）｜ancient **12800**（2.0／3）｜mithril **51200**（2.5／4）｜adamantium **204800**（3.0／5）；七件 `attackDamage=0.0`／`burn=100`／`armor=0.0`（尖括号件另列 rusted 3200/1.25/2）。gold 链甲：20/32/28/16 ＋ armor **0.8333333333333334／1.3333333333333333／1.1666666666666667／0.6666666666666666** | ✓ |
| **W-64** | gold 粒→链→甲可达链（craftingDebugLog）＋`/give` 四件 | 4 金粒环形 → `COMPLETE Gold Chain ×1`（`:3956`）｜5 链 → `COMPLETE Gold Chain Helmet ×1`（`:3976`）｜四件 `/give` 各 1 入库（inventory 计数 1/1/1/1） | ✓ |
| **W-65** | 七件剪 × web／wool breaking decay | **web 全 10／wool 全 80**（七件逐件；14 行 `:4043…:4411`），Δdur 与行值逐件同（14/14 精确等值），方块 14/14 已破 | ✓ |
| **W-66** | 七件剪 × 羊 shearing face | **七件全 50**（7 行 `:4793…:4877`），Δdur=50 逐件，`Sheared:1b` 7/7 命中 | ✓ |
| **W-67** | 等级拒（copper 剪 × obsidian）＋ grade≥required 不拒 | `mine deny grade=2 required=3 item=etim:shears_copper block=obsidian`（`:4894`），obsidian 未被破；铜剪 × wool（在集、min 0）**零 deny 行** 且方块已破 | ✓ |
| **W-68** | gold 链甲 armor 硬读数（铜链对照） | `[DamageLog] prot … armor=4.000`（gold 全套，`:5253`）／`armor=5.000`（copper 全套对照，`:5337`）——6−2=4 与 7−2=5 逐值对上 | ✓ |
| **W-69** | 七处 mixin/漏斗判据位 | 静态亲扫：`ETIMMining.java:419/464/553`＋`MixinItemShears.java:51/90/133/180`＝**7/7 在位**，`ETIMItemShearsRusted` 残引 **0**；运行期 W-65/W-66 的 Δdur 恰等漏斗值（无 vanilla +1 双磨） | ✓ |

> 判读纪律：W-63 **按 individual 列逐件验收**（per-metal 值不做同 row 单值汇总）；甲四件只判 `maxDamage` 与 `armor` 两列（甲件 `burn=-1` 为设计值，见 §4 C-2）。

## §1 判行锚（`.out` 档内真行号）

判据档：`testharness/build-logs/metgear-w62b.out`＝**702,766 B／5,375 行**（U+FFFD 0）；`-session-1.log` 678,227 B；`-driver.log` 77,400 B；`-evidence.json` 93,821 B。定本窗 CST 13:35:33 起、13:38:19 收。

| 位 | 行 | 原句（摘） |
| --- | --- | --- |
| boot 起 | 127 | `Finished gathering 15 mods, took 1737 ms.` |
| 配方闸 | **339** | `[TestLog] gear recipes registered: 35 batch rows ok (runtime REGISTRY delta; etim-domain total 160 incl legacy 94: 90 ingot-based + 4 rusted + 4 gold chain-armor) [server]` |
| gold 链甲四件 | 439–442 | `[EquipLog] gear item=etim:chain_helmet_gold maxDamage=20 … armor=0.8333333333333334`（32/1.3333333333333333、28/1.1666666666666667、16/0.6666666666666666 同形） |
| 七剪 gear 行 | 460–466 | `shears_rusted_iron 3200/1.25/2`｜`copper 3200/1.75/2`｜`silver 3200/1.75/2`｜`gold 3200/1.75/2`｜`ancient_metal 12800/2.0/3`｜`mithril 51200/2.5/4`｜`adamantium 204800/3.0/5` |
| 耐久重钉 | **515** | `[EquipLog] durability reassert: 132 gear rows ok [server]` |
| 世界/就绪 | 521／**2267** | `Preparing level "metgearw62b"`／`Done (6.496s)!`（13:35:52） |
| W-64 链 | **3956** | `[CraftingLog] ETIM_W62B (765) COMPLETE Gold Chain ×1 quality=AVERAGE xp=0 continue` |
| W-64 盔 | **3976** | `[CraftingLog] … COMPLETE Gold Chain Helmet ×1 …` |
| W-65 web／wool | 4043…4411 | `[MiningLog] tool decay face=breaking item=etim:shears_<metal> block=web loss=10`／`block=wool loss=80`（七件各一对，共 14 行） |
| W-66 剪羊 | 4793…4877 | `[MiningLog] tool decay face=shearing item=etim:shears_<metal> loss=50`（七行） |
| W-67 拒 | **4894** | `[MiningLog] mine deny grade=2 required=3 item=etim:shears_copper block=obsidian [server]` |
| W-68 gold | **5253** | `[DamageLog] prot target=ETIM_W62B#765 src=mob natural=0.000 armor=4.000 potion=0.000 total=4.000 piercing=0.000 wear=4.000` |
| W-68 copper | **5337** | 同形 `armor=5.000 … total=5.000` |
| 收口 | 5353／**5372** | `Stopping server`（13:38:18）／`BUILD SUCCESSFUL in 2m 45s` |

W-65 逐件 Δdur（14/14 与行值同）：copper 10/80｜silver 10/80｜gold 10/80｜ancient 10/80｜mithril 10/80｜adamantium 10/80｜rusted 10/80。
W-66 逐件 Δdur：七件全 **50**；`Sheared:0b` 前置 → `Sheared:1b` 后置，7/7 命中。

## §2 通道计数（全窗直数；与驱动 8/8 全等）

| 通道 | 条数 | 分解 |
| --- | --- | --- |
| `[EquipLog] gear` | 126 | boot 一次性 dump（gate 行 132 = 126 gear ＋ 6 箭材 `material item` 行） |
| `[MiningLog] face=breaking` | **14** | W-65 七件 × web/wool |
| `[MiningLog] face=shearing` | **7** | W-66 七件 |
| `[MiningLog] mine deny` | **1** | W-67 copper×obsidian（wool 臂零行） |
| `[DamageLog] prot` | **2** | W-68 gold／copper 各一行 |
| `[CraftingLog] COMPLETE` | **2** | W-64 链／盔 |
| `[TestLog] step=hurt` | **2** | W-68 两击 |
| Mixin 失败三型 | **0** | — |

## §3 钉值（起收全同 ⇒ 零 rebuild／零产品码／零 cfg 残留）

| 项 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `c2519a5f36ed5b85bb8de2d90c365d96477b794d` | 同（窗内零提交、`git status --porcelain` 仅本批新增件） | ✓ |
| release jar | 780,416 B `94E0AECC…02CAA4` | byte-identical | ✓ |
| dev jar | 764,385 B `6FFC3CFF…54EB714` | byte-identical | ✓ |
| sources jar | 709,499 B `14C5E1B4…5ACBA` | byte-identical | ✓ |
| 服务端 cfg | 32,095 B `E07CAC1E…7AE7F5` | byte-identical（零 cfg 写） | ✓ |
| 客户端 cfg | 30,277 B `E37C1377…434F81C45` | byte-identical（零客户端） | ✓ |
| props | 890 B `30096338…571B654A48` | byte-identical（`level-name` 回 `test27dev`） | ✓ |
| ops／usercache／usernamecache | 685／1,630／851 B | 三件 byte-identical（判窗期 `/op` 已还原） | ✓ |
| MK 双树 | refmap 62 类键·138 条目｜切片 4/4/3＝11｜mixins 56/10 | 双树同值；139/57/11 未现 | ✓ |
| 端口／crash／world | 0／19／— | 0／**19**（零新增）／`metgearw62b` 已删 | ✓ |
| Gradle | — | `:compileJava/:classes/:jar` 全 **UP-TO-DATE**；`BUILD SUCCESSFUL in 2m 45s`（`:5372`）；`stop` exitCode **0** | ✓ 0 rebuild |

判读预键（boot 前 cfg 只读复核，全 true）：`miningReform`／`miningDebugLog`／`equipDebugLog`／`damageDebugLog`／`armorModelR196`／`craftingDebugLog`／`craftingTimer`／`foodDebugLog`。

## §4 冲突分级（A 0／B 1／C 5）

### A 级（产品码）
- **无。** 前窗 A-1（配方闸基线取窗错位）已由 `fe59552` 修复，本窗 `:339` 实测 `35／160` 闭合。

### B 级（判据词面缺口，落下一窗任务书）
- **B-1（W-67 第二臂词面不可达）**：任务书「grade 2 required 2 不 deny」在剪族**结构性不成立**——`ETIMMining.isEffectiveAgainstBlock` 的剪分支是 `isShearsMaterial(state) && grade ≥ minLevel`（`:553-559`），**非有效集方块一律出 deny 行**；而剪有效集（cloth/leaves/plants/vine/web/tripwire）全是 `minLevel 0` 方块，不存在 required=2 的「在集」样本。本窗改判「铜剪 × wool（在集、min 0）零 deny 行且方块已破」承载负证。**建议**：下一窗把该臂词面改为「在集且 grade≥required → 零 deny」。判值不变。

### C 级（登记不阻塞）
- **C-1（Δdur 通道选型）**：现 cfg `blockDebugLog=false` ⇒ `/etest blockprobe` 的 `[BlockLog] probe … dur=` 行**不出**（`ETIMBlockLog.probeDurability:133-139` 门）。本窗主口径改用 bot 栈 `bot.heldItem.durabilityUsed`（unbreak 批同源、零 cfg 编辑）；`[MiningLog]` loss 只作值判（last-sig 同键同值吞行，承 unbreak B-2）。
- **C-2（甲件 burn 列）**：`[EquipLog] gear` 对甲四件打印 `burn=-1`（非 100），剪六件 `burn=100`（`ETIMItemShears.getItemBurnTime` 恒 100）。W-63 甲件因此只判 `maxDamage`＋`armor` 两列。
- **C-3（W-65 期望值口径）**：任务书「web=copper/silver/gold 系列期待 loss=10 字典值」——实测**七件全 10**（含 ancient/mithril/adamantium/rusted），因 breaking decay 与材质无关（`getBaseDecayForBreakingBlocks` 剪支恒 1.0，`:419-421`；loss=max((int)(hardness×100),5,1)）。登记口径，不改判。
- **C-4（客户端 cfg hash 末段）**：任务书写 `E37C1377…C05BB67F`，实测与起收均为 `E37C1377…434F81C45`（byte-identical）；按实测记。
- **C-5（前窗红卷归档位）**：A-1 版诊断窗卷已归 `testharness/build-logs/metgear-w62b-run0/`（`metgear-quickboot.out` 52,976 B ＋ `metgear-quickboot-driver.log`）；本窗 smk 冒烟卷 `metgear-w62b-smk.*` 同目录在案。

## §5 待裁位

| # | 待裁 | 选项 | 倾向 |
| --- | --- | --- | --- |
| D-1 | **W-67 第二臂词面**（B-1） | (a) 下一窗改为「在集且 grade≥required → 零 deny」／(b) 维持原词面并接受该臂不可达 | **(a)**：判值不变，只改词面 |
| D-2 | **W-65 期望值表**（C-3） | (a) 下一窗按「七件同值＋分块 loss」写死／(b) 维持「copper/silver/gold 系列」措辞 | **(a)** |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| boot 计数 | **2／2**（① smk 冒烟 13:31:52 起、8/8 PASS（W-65/66 各裁到两件）；② 定本 13:35:33 起 → `Done (6.496s)` `:2267` → 8 判点 → `Stopping server` `:5353` → `BUILD SUCCESSFUL in 2m 45s` `:5372`，stop exitCode 0） |
| 客户端 | **零会话**（未拉起、未关窗、未抢焦点） |
| 端口 | 25565 LISTEN：起 0／收 0 |
| 崩溃 | `run/crash-reports` 19 → **19**（零新增；前窗 A-1 崩卷 1 件仍在案） |
| cfg／props／三 side 文件 | 服务端/客户端 cfg、props、ops、usercache、usernamecache 全 byte-identical |
| 世界 | `metgearw62b` 已删 |
| rebuild | **0**（三构建任务 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（HEAD `c2519a5` 未动；窗内仅新增判窗件） |

## §7 工装与复跑

- 驱动：`testharness/player/metgear-w62b.js`（48 KB）。判据原语：`holdFresh`（`/etest hold` ＋ bot 栈复读）／`waitDurChange`（Δdur 主口径）／`digOnce`（START/STOP ＋ `/testforblock air` 串行门）／`interactEntity`（`use_entity` 体心瞄准，W-38 同法）／`craftAtTable`（`putOne`＋`clickResult`＋COMPLETE 等待，chaincraft-w48 同构）／`hurtRead`（`[DamageLog] prot` 读 armor）。
- 环境变量：`MET_ONLY=W62,W65`（裁剪）｜`MET_STAGE=<tag>`（`.out` 隔离）｜`MET_SMOKE=1`（W-65/66 只跑前两件）。
- 复跑：`node testharness\player\metgear-w62b.js metgear-w62b`（单 boot，自动回填 cfg/props/ops/world）。

## §8 未覆盖面（不补白）

1. **W-64 另三件链甲的合成**：本窗以「4 粒→1 链」＋「5 链→盔」两跳闭环＋四件 `/give` 入库承载；胸/腿/靴的配方行由 boot 闸 35（含 4 行）取证，未逐件手合。
2. **W-67 的 required=2 在集样本**：结构不存在（B-1）。
3. **W-68 的逐件 armorPoints**：本窗读全套合计 4.000／5.000；逐件 double 值由 W-63 的 `[EquipLog] armor=` 列承载。
4. **客户端面**（`[SoundLog]` 剪羊音等）：CT-9 零客户端，不作判值。

## §9 自报（机械核讫）

> 文件：`testharness/reports/metgear-W62b-verdict.md`｜字节五项以**档头规格行**为唯一自指固定点（本节不复述，避免双自指漂移）｜首字节 0x23｜U+FFFD 0｜CR 0
> 三口径家族（本档自定，与 unbreak-W50／metgear-W62 同型）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序以换行连接成串，再对该串 SHA-256）。
> SHA-256 甲（全档零位）`169B7306857D796151C2D5EAC65010ECEFE09660A4E54AAC2C65EFAE41CB6B00`
> SHA-256 乙（LF 归零零位）`169B7306857D796151C2D5EAC65010ECEFE09660A4E54AAC2C65EFAE41CB6B00`
> SHA-256 丙（行链零位）`53A9869D3BD74B7CF1ACDAF5E0B4E7B53DD12EA6D057ED98A492E37B01F3E2C2`
> 判格 8 全 ✓｜通道 `breaking` 14／`shearing` 7／`deny` 1／`prot` 2／`COMPLETE` 2／`step=hurt` 2／Mixin 0｜冲突 A0 B1 C5｜待裁 D-2｜jar 三件 byte-identical／零 rebuild／零产品码／零 cfg 写／零客户端／世界已删。





