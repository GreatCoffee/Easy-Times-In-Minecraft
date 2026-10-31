# offphase 批（hoe off 相攻击磨损 = vanilla 1）· W-46 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：3 boot（buddy 基线 ＋ A 相 on ＋ G 相 off）＋ 0 客户端
> **报告字节规格**：`27,874 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 41 / ✗ 1｜294 行`
> **判据正本**：`playground/audit/` audit20 条 187/190（off 相 hoe 攻击磨损 = vanilla `ItemHoe.hitEntity:89-93` 的 `damageItem(1)+return true`；W-42 §8「0 wear ≠ vanilla 2」简写勘误 = tool-class drift）。
> **秤上唯一判据（纯服务端，两条通道）**：
> - 判值行：`[MiningLog] tool decay face=attacking item=<reg> loss=<N> [server]`（`mining/ETIMMining.java:303-315` → `logToolDecay` `:743-760`；state=null ⇒ **无 block= 列**，去重键塌 `attacking|<item>`）。
> - 判值行：`[MiningLog] tool decay face=breaking item=<reg> block=<b> loss=<N> [server]`（`:266-286`；去重键 `breaking|<item>|<block>`）。
> - 旁证（不作判值）：`[DamageLog] dmg target=Pig#<id> src=player … final=<x>`（攻击真实落地）＋ 假人 `durabilityUsed` Δ（dur 主口径）。
> **判决**：**PASS**——a-h＋k 九格全 ✓；A 相（miningReform=true）attacking 2／breaking 2／speed 2（记录面）；G 相（miningReform=false）**MiningLog 全窗 0 行**；deny／shear drop／reach denied 全窗 0；起收钉值全同（零 rebuild、产品码 0 行改动）、cfg 双态流程（A 零编辑 → G 改态 → 收窗回填）逐值达成、零客户端。

## §0 判决总表

| 点 | 相 | 面 | 期望（写死判） | 实测 | 判 |
| --- | --- | --- | --- | --- | --- |
| W-46a | A（on） | `etim:hoe_copper` × 猪（attack） | attacking 恰 1 条 `loss=200` ＋ Δ200 ＋ deny 0 | 1×200；Δ200；`final=1.175` | ✓ PASS |
| W-46b | A（on） | `etim:hoe_copper` × `dirt`（dig） | breaking 恰 1 条 `loss=100` ＋ Δ100 ＋ 块 air ＋ deny 0 | 1×100；Δ100；air 命中 | ✓ PASS |
| W-46c | A（on） | `etim:shears_rusted_iron` × `reeds`（dig） | breaking 恰 1 条 `loss=8` ＋ Δ8 ＋ 块 air ＋ deny 0 | 1×8；Δ8；air 命中 | ✓ PASS |
| W-46d | A（on） | `etim:shears_rusted_iron` × 猪（attack） | attacking 恰 1 条 `loss=200` ＋ Δ200 ＋ deny 0 | 1×200；Δ200；`final=1.175` | ✓ PASS |
| **W-46e** | **G（off）** | **`etim:hoe_copper` × 猪（attack）** | **0 行 ＋ Δ1** | **0 行；Δ1；`final=1.175`** | **✓ PASS（主证）** |
| W-46f | G（off） | `etim:hoe_copper` × `dirt`（dig） | 0 行 ＋ Δ0 ＋ 块 air | 0 行；Δ0；air 命中 | ✓ PASS |
| W-46g | G（off） | `etim:shears_rusted_iron` × `reeds`（dig） | 0 行 ＋ Δ1 ＋ 块 air | 0 行；Δ1；air 命中 | ✓ PASS |
| W-46h | G（off） | `etim:shears_rusted_iron` × 猪（attack） | 0 行 ＋ Δ0 | 0 行；Δ0；`final=1.175` | ✓ PASS |
| W-46k | G（off） | `etim:shears_rusted_iron` × `leaves`（dig） | 0 行 ＋ Δ1 ＋ 块 air | 0 行；Δ1；air 命中 | ✓ PASS |

> **e 的含义**：off 相 hoe 攻击走第一插入门 `if (!ETIMConfig.miningReform) return super.hitEntity(...)`（`metal/ETIMItemHoe.java:137-140`），super = 1.12 `ItemHoe.java:89-93` ⇒ `damageItem(1, attacker)`。**Δ1 恰是「vanilla 1」**——既不是 ItemTool 族的 2（Δ2），也不是「零磨」（Δ0）。
> **A/G 的同点同伤对照（最硬的一条）**：e 与 a 是同一工具同一靶（hoe × 猪），`[DamageLog] final=1.175` **两相完全相同**（伤害输出未变），而磨损从 **200 → 1**。即：本批只改「工具磨损归属相」，不改攻击数值。
> **h 的含义**：shears 无 `hitEntity` override（vanilla `ItemShears` 只有 `onBlockDestroyed`/`onBlockStartBreak`），off 相 `return vanilla`（`ETIMItemShearsRusted.java:131-138`，`super` 返回 false 且不损）⇒ **Δ0**。同相 d 为 Δ200（R196 2.0）⇒ on/off 二分成立。
> **f 的含义**：`ETIMItemHoe.onBlockDestroyed`（`:119-127`）整体裹在 `ETIMConfig.miningReform && …` 里；off 相不调用漏斗（vanilla `ItemHoe` 无 `onBlockDestroyed` override）⇒ **0 行 ＋ Δ0**，且块照常破（air 命中）——「off 相不回归挖块格」。
> **g/k 的含义**：shears 两条 redirect 的 off 支各证一次——g 走 `onBlockDestroyed`（`MixinItemShears.java:46-49`，vanilla +1，Δ1），k 走 `onBlockStartBreak`（`:85-88`，leaves 属 IShearable，`tryHarvestBlock` 在 `PlayerInteractionManager.java:328` 先问 `onBlockStartBreak`，返回 true 即短路且块已 air，Δ1）。两者**均不出 MiningLog 行**（不进漏斗）。

## §1 逐点判词（判行原句 ＋ 行号锚）

行号指 `testharness/build-logs/offphase-w46-a.out`（**519,381 B／3,922 行**，A 相 boot）与 `offphase-w46-g.out`（**515,267 B／3,901 行**，G 相 boot）的全档行号，可 `Select-String` 直取。
竞技场（石圈墙家族）：A 相 `geo=(-66,76,248)`、目标格 **`(-64,76,248)`**；G 相 `geo=(-70,76,249)`、目标格 **`(-68,76,249)`**（两 world 各自 fresh spawn ⇒ geo 不同属预期）。

### W-46a（A 相 · on · hoe × 猪 · attack）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| expLevel | `[EtimTest] commands.etest.level_set player=ETIM_W46A params=[35]` | `:3707` |
| 持物回执 | `[EtimTest] commands.etest.hold_set player=ETIM_W46A params=[Copper Hoe]` | `:3709` |
| 靶召唤 | `Object successfully summoned`（`summon pig … {NoAI,1000HP,kbRes:1}`） | `:3715` |
| 伤害落地（旁证） | `[DamageLog] dmg target=Pig#2110 src=player raw=1.000 armorIn=1.175 armorOut=1.175 absorption=0.000 final=1.175 [server]` | `:3721` |
| **判值行** | `[MiningLog] tool decay face=attacking item=etim:hoe_copper loss=200 [server]` | **`:3722`**（22:05:12） |
| 攻击步回执 | `[TestLog] step=attack player=ETIM_W46A target=Pig#2110` | `:3723` |

- `200 = max((int)(100 × 2.0), 1)`（hoe 攻击 baseDecay 2.0，`ETIMMining.java:461-463`）；栈 Δ＝**200**（`durabilityUsed 0→200`）。
- 行形自证：`attacking` 行**无 `block=` 列**（state=null，`:325-327`）。

### W-46b（A 相 · on · hoe × dirt · dig）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Copper Hoe]` | `:3731` |
| 摆场复钉 | `Block placed` → `Successfully found the block at -64, 76, 248`（dirt） | `:3735` / `:3736→:3737` |
| 速度（记录面） | `[MiningLog] mine speed item=etim:hoe_copper block=dirt str=3.5 [server]` | `:3740` |
| dig START／STOP | `[TestLog] step=dig-start … pos=BlockPos{x=-64, y=76, z=248}`／`step=dig-stop …` | `:3741`／`:3785` |
| **判值行** | `[MiningLog] tool decay face=breaking item=etim:hoe_copper block=dirt loss=100 [server]` | **`:3784`**（22:05:18） |
| 破块复钉 | `### [harness] > testforblock -64 76 248 air` → `Successfully found the block at -64, 76, 248` | `:3786→:3787` |

- `100 = max((int)(0.5 × 100 × 2.0), (int)(200/20), 1)`（dirt 硬度 0.5，`:414-415`）；栈 Δ＝**100**。
- 速度行 `str=3.5` 是**加成前**值（B-1 家族），只记录不判。

### W-46c（A 相 · on · 锈剪 × reeds · dig）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Rusted Iron Shears]` | `:3795` |
| 水盆＋摆场复钉 | `Successfully found the block at -64, 76, 248`（reeds）／`… -65, 75, 248`（water） | `:3818→:3819`／`:3820→:3821` |
| 速度（记录面） | `[MiningLog] mine speed item=etim:shears_rusted_iron block=reeds str=5.0 [server]` | `:3824` |
| dig START／STOP | `step=dig-start`／`step=dig-stop`（pos 同上） | `:3825`／`:3867` |
| **判值行** | `[MiningLog] tool decay face=breaking item=etim:shears_rusted_iron block=reeds loss=8 [server]` | **`:3866`**（22:05:24） |
| 破块复钉 | `testforblock -64 76 248 air` → `Successfully found` | `:3868→:3869` |
| 水盆复位 | `Block placed` ×2（`-65 75 248`／`-64 75 248` 回填 dirt） | `:3872`／`:3873` |

- `8 = max((int)(0.08 × 100 × 1.0), (int)(100/20), 1)`（reeds 硬度 0.08，`:149`；shears baseDecay 1.0，`:419-421`）；栈 Δ＝**8**。
- `MixinItemShears` reform-on 支把 vanilla +1 跳过（`:51-56`），ETIM 剪自身补漏斗衰减 ⇒ **不会出现 W-35c 的 dur 9 双磨**（本窗 dur 8 即该支的正证）。

### W-46d（A 相 · on · 锈剪 × 猪 · attack）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Rusted Iron Shears]` | `:3882` |
| 靶召唤 | `Object successfully summoned` | `:3889` |
| 伤害落地（旁证） | `[DamageLog] dmg target=Pig#2111 … final=1.175 [server]` | `:3895` |
| **判值行** | `[MiningLog] tool decay face=attacking item=etim:shears_rusted_iron loss=200 [server]` | **`:3896`**（22:05:29） |
| 攻击步回执 | `[TestLog] step=attack player=ETIM_W46A target=Pig#2111` | `:3897` |

- `200 = max((int)(100 × 2.0), 1)`（R196 shears 攻击 2.0，`:464-466`）；栈 Δ＝**200**；行形无 `block=` 列。

### W-46e（★主证 · G 相 · off · hoe × 猪 · attack）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| expLevel | `level_set player=ETIM_W46G params=[35]` | `:3705` |
| 持物回执 | `hold_set player=ETIM_W46G params=[Copper Hoe]` | `:3707` |
| 靶召唤 | `Object successfully summoned` | `:3713` |
| 伤害落地（旁证 ★） | `[DamageLog] dmg target=Pig#2097 src=player raw=1.000 armorIn=1.175 armorOut=1.175 absorption=0.000 final=1.175 [server]` | `:3719` |
| **MiningLog 行** | **0 条**（G 相全档 `[MiningLog]` 合计 0） | — |
| 攻击步回执 | `[TestLog] step=attack player=ETIM_W46G target=Pig#2097` | `:3720` |

- 门位：`metal/ETIMItemHoe.java:137-140`（`!miningReform → super.hitEntity`）；super＝`ItemHoe.java:89-93` `damageItem(1, attacker)` ⇒ 栈 Δ＝**1**（`durabilityUsed 0→1`）。
- 与 a 对照：同工具同靶、`final=1.175` 相同、磨损 200→1 ⇒ **off 相第一插入门按 vanilla 1 生效**。
- 通道活性由 A 相同 commit 的 `attacking` 行（`:3722`／`:3896`）担保；G 相 0 行不是通道坏死。

### W-46f（G 相 · off · hoe × dirt · dig）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Copper Hoe]` | `:3728` |
| 摆场复钉 | `Block placed`／`Successfully found the block at -68, 76, 249`（dirt） | `:3732`／`:3733→:3734` |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:3737`／`:3780` |
| MiningLog 行 | **0 条** | — |
| 破块复钉 | `testforblock -68 76 249 air` → `Successfully found` | `:3781→:3782` |

- `ETIMItemHoe.onBlockDestroyed` 的 `miningReform` 门（`:120`）挡掉漏斗 ⇒ 无行、无磨（vanilla hoe 无 `onBlockDestroyed` override）⇒ **Δ0**；块照常破（air 命中）⇒「off 相挖块格不回归」。

### W-46g（G 相 · off · 锈剪 × reeds · dig）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Rusted Iron Shears]` | `:3790` |
| 水盆＋摆场复钉 | `Successfully found the block at -68, 76, 249`（reeds）／`… -69, 75, 249`（water） | `:3814→:3815`／`:3816→:3817` |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:3821`／`:3822` |
| MiningLog 行 | **0 条** | — |
| 破块复钉 | `testforblock -68 76 249 air` → `Successfully found` | `:3823→:3824` |

- off 支：`MixinItemShears.java:46-49`（`!miningReform → stack.damageItem(vanillaAmount)`，vanillaAmount=1）⇒ **Δ1**；`ETIMItemShearsRusted.onBlockDestroyed:117-119` 走 `return vanilla` 不调漏斗 ⇒ 0 行。

### W-46h（G 相 · off · 锈剪 × 猪 · attack）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Rusted Iron Shears]` | `:3837` |
| 靶召唤 | `Object successfully summoned` | `:3844` |
| 伤害落地（旁证） | `[DamageLog] dmg target=Pig#2098 … final=1.175 [server]` | `:3850` |
| 攻击步回执 | `[TestLog] step=attack player=ETIM_W46G target=Pig#2098` | `:3851` |
| MiningLog 行 | **0 条** | — |

- `ETIMItemShearsRusted.hitEntity:131-138`：先 `super`（`Item.hitEntity` 返回 false、不损）→ `!miningReform → return vanilla` ⇒ **Δ0**；攻击数值仍落地（`final=1.175`）⇒「零磨不是没打中」。

### W-46k（G 相 · off · 锈剪 × leaves · dig）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 持物回执 | `hold_set … params=[Rusted Iron Shears]` | `:3859` |
| 摆场复钉 | `Block placed`／`Successfully found the block at -68, 76, 249`（leaves） | `:3863`／`:3864→:3865` |
| dig START／STOP | `step=dig-start`／`step=dig-stop` | `:3869`／`:3872` |
| MiningLog 行 | **0 条** | — |
| 破块复钉 | `testforblock -68 76 249 air` → `Successfully found` | `:3873→:3874` |

- leaves 属 IShearable：`tryHarvestBlock`（`PlayerInteractionManager.java:328`）先问 `onBlockStartBreak`；off 支 `MixinItemShears.java:85-88` 走 vanilla `damageItem(1)` 并 `return true` 短路 ⇒ **Δ1**，块已在 `onBlockStartBreak` 内设 air（故复钉 air 命中），漏斗未进 ⇒ 0 行。

## §2 计数总账（写死判 ＋ 记录面分列）

| 面 | buddy boot | A 相（on） | G 相（off） | 判 |
| --- | --- | --- | --- | --- |
| `tool decay face=attacking` | 0 | **2**（a／d） | **0** | ✓ |
| `tool decay face=breaking` | 0 | **2**（b／c） | **0** | ✓ |
| `tool decay face=shearing` | 0 | 0 | 0 | ✓ |
| `mine deny` | 0 | 0 | 0 | ✓ |
| `mine speed`（记录面，不判） | 0 | 2（hoe/dirt 3.5、shears/reeds 5.0） | **0** | ○ |
| `shear drop` | 0 | 0 | 0 | ✓ |
| `reach denied` | 0 | 0 | 0 | ✓ |
| **`[MiningLog]` 合计** | **0** | **6** | **0** | ✓ |
| `[DamageLog] dmg target=Pig#… src=player` | 0 | 2（a／d，各 `final=1.175`） | 2（e／h，各 `final=1.175`） | ○ 旁证 |
| `[DamageLog] … src=outOfWorld`（boot 清场噪声） | 0 | 170 | 170 | ○ 见 C-6 |
| Mixin 失败三型 | 0 | 0 | 0 | ✓ |

- A 相发行序（逐点值报价）：`attacking:etim:hoe_copper:200` → `breaking:etim:hoe_copper/dirt:100` → `breaking:etim:shears_rusted_iron/reeds:8` → `attacking:etim:shears_rusted_iron:200`。
- **G 相全窗 `[MiningLog]` 0 行**（attacking／breaking／deny／speed 全 0）——off 相五点的判据全部落在 dur Δ（1／0／1／0／1）＋ `[DamageLog] final=1.175`（攻击点）＋ `testforblock air`（挖块点）上。
- 单 boot 去重防呆：A 相四键 `attacking|etim:hoe_copper`／`breaking|etim:hoe_copper|dirt`／`breaking|etim:shears_rusted_iron|reeds`／`attacking|etim:shears_rusted_iron` **互异** ⇒ 无 last-sig 吞行；G 相全零行 ⇒ 无吞行面。

## §3 起收钉值（全同 ⇒ 零 rebuild、零产品码改动）

| 项 | 起窗（任务书钉） | 收窗实测 | 判 |
| --- | --- | --- | --- |
| HEAD | `1fc134ee31d203f93b1af7c4e11874ee8ce85b78` | 同（窗内零提交；`git status` 仅新增本窗驱动/回执） | ✓ |
| release jar | 775,263 B｜`22DC05D4C0FE5E3271016CDCEFAA8DC8FC5530DBFC6A0A62F3AC5D86F7A6C2A5` | 同（byte-identical） | ✓ |
| dev jar | 759,459 B｜`8130C73845EBD76FAFAA5400DE9CFB15E33C40CEE62EE084CD510B4681429777` | 同（byte-identical） | ✓ |
| sources jar | 703,372 B｜`39CD6818A94A90982A6AC32BE4E74140E09324176E483FE6AD47B270DCE6CA6B` | 同（byte-identical） | ✓ |
| 服务端 cfg（A／buddy 相） | 32,095 B｜`E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5` | 同（两相 boot 前后均 byte-identical，`miningReform=true`） | ✓ 零新键 |
| 服务端 cfg（G 相改态） | —（D-6(a) 流程允许） | 32,096 B｜`8F5E144FFDE651B09D2C3DCE9C649E189FE7ABA66CD53BFB0E46D3624275D2CA`，`miningReform=false` | ✓ 改态观测成立 |
| 服务端 cfg（收窗回填） | 32,095 B｜`E07CAC1E…7AE7F5` | 同（快照字节回填，byte-identical，`miningReform=true` 复位） | ✓ 窗底达成 |
| 客户端 cfg | 30,277 B｜`E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45` | 同（全窗零触碰） | ✓ |
| `server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 同（`level-name`/`spawn-protection` 已还原） | ✓ |
| `ops.json`／`usercache.json`／`usernamecache.json` | — | 三件 byte-identical（起窗快照回填） | ✓ |
| MK | refmap 双树 62 类键／138 条目（切片 Sword 4／Tool 4／Shears 3）＋ mixins 56／client 10 | 双树同值；`139/57/11` 未现 | ✓ |
| `run/obfuscated/options.txt` | — | 未读写（mtime 停留 `2026-10-31T17:44:52`，早于本窗 22:04 开窗） | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` | 18 | 18 | ✓ |
| 世界目录 | — | `offphasew46a`／`offphasew46g`／`offphasew46buddy` 三目录均已删 | ✓ |
| Gradle | — | 三 boot `:compileJava/:classes/:jar` 全 **UP-TO-DATE**；`BUILD SUCCESSFUL`（buddy 26 s／A 48 s／G 53 s） | ✓ 0 rebuild |

**cfg 双态逐步对勘**（本批唯一允许的窗内编辑，D-6(a) 流程）：

| 时刻 | 文件态 | 判 |
| --- | --- | --- |
| 开窗前 | 32,095 B｜`E07CAC1E…`｜`miningReform=true` | 起窗钉 |
| buddy boot 后 | 32,095 B｜`E07CAC1E…`｜`true` | ✓ 零新键预言成立 |
| A boot 前／后 | 32,095 B｜`E07CAC1E…`｜`true`（**零编辑**） | ✓ |
| G boot 前（driver 翻键） | 32,096 B｜`8F5E144F…`｜`false` | ✓ 改态（+1 B = `false` 比 `true` 多 1 字符） |
| G boot 后（仍 off） | 32,096 B｜`8F5E144F…`｜`false` | ✓ 未再漂移 |
| 收窗（快照回填） | 32,095 B｜`E07CAC1E…`｜`true` | ✓ **byte-identical 复钉** |

## §4 冲突分级（A / B / C）

**A 级 0 条**（无判格 FAIL、无产品码改动、零 rebuild、零客户端动作）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| B-1 | B | **`mine speed` 行的 `str=` 是「加成前」值**：`:219` 在等级加成（`:248`）、饱食/落水/离地除数、haste 之前发行。本窗读到 hoe/dirt `3.5`、shears/reeds `5.0`，非挖掘实际 str。 | 本批只作记录面（W-45 B-1 家族延续）；无判点依赖该值，D-2 家族维持「不加终值列」。 |

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **攻击面必须先瞄准**：`/etest attack` 只喂 `CPacketUseEntity(ATTACK)` 不改朝向，而 ETIM 的 melee 门是 R196 几何（`reach/ETIMReachEvents.java:41-53`：眼 → 沿**视线**与 expanded hitbox 的交点距离）。冒烟首跑实测 `reach denied: etim.reach.deny_attack <Double.MAX_VALUE> > 1.50`，攻击被拒（无伤、无磨）。 | 驱动在攻击前 `bot.lookAt(猪体心)`（mineflayer 侧 rotation 包），并在「被 deny 行拒」时重瞄一次（deny 时无 `hitEntity` ⇒ 不产生二次磨损）。产品/工装模块 **0 改动**。 |
| C-2 | C | **首跑 buddy boot 原生 OOM**：`# There is insufficient memory for the Java Runtime Environment to continue.`（`Chunk::new` malloc 620,896 B 失败），发生在 fernflower 反编译 MC 源码线程；host 物理内存吃紧（用户侧 EscapeFromTarkov 常驻 ≈14.6 GB，且冒烟 boot 的 JVM 刚退出未释放）。属**环境面**，非产品缺陷（同批 A/G 两 boot 均正常 `Done`）。 | 首跑整目录留 `build-logs/offphase-w46-run1/` 作旁证；清 Gradle daemon 后重跑，以 14:04–14:06 重跑窗为**正本**。驱动已加「boot 死亡快速冒泡」（`BUILD FAILED`/`insufficient memory` 即刻失败，不再空等 300 s）。 |
| C-3 | C | **G 相 `mine speed` 结构必然为 0**：`MixinBlock` 的进度注入在 `!miningReform` 时 HEAD 早退（`mixins/MixinBlock.java:37-39`），`ETIMMiningEvents.onHarvestCheck` 亦同门早退（`mining/ETIMMiningEvents.java:33-36`）⇒ off 相根本没有 `getCurrentPlayerStrVsBlock` 调用。 | 非缺口：G 相五点期望本就是「0 行」，判据走 dur Δ ＋（攻击点）`[DamageLog] final=` ＋（挖块点）`testforblock air`；A 相同 commit 出 attacking/breaking 行即通道活性正证。 |
| C-4 | C | `etest hold` 回执只给**显示名**（`Copper Hoe`／`Rusted Iron Shears`），且偶发一轮面板同步重试；modded 栈 mineflayer 侧无 `maxDurability`。 | 栈身份以判行 `item=`（`etim:hoe_copper` 等）为准；Δ 只读 `durabilityUsed` 差值（W-45 C-3/C-4/C-5 家族）。 |
| C-5 | C | 冒烟跑与正跑同 tag ⇒ 冒烟档被正跑覆盖（未留档）。 | 冒烟只用于露出 C-1 的 reach 门；其实测原句已记入本回执 C-1 与驱动注释（W-45 C-2 家族；后续冒烟建议 `-smoke` 独立 tag 并保留）。 |
| C-6 | C | `[DamageLog] … src=outOfWorld` 噪声：boot 清场 `kill @e[type=!player]` 与每点前 `kill @e[type=pig]` 都走 `attackEntityFrom(OUT_OF_WORLD, MAX)` 全额伤害行（每相 ≈170 行）。 | 判点段只取 `target=Pig#… src=player`（每相 2 行，恰对应两个攻击点），不与判据面混算。 |
| C-7 | C | **零客户端面**：本窗纯服务端（C-9 硬条款）——零拉起、零关窗、零 `options.txt`（mtime 早于开窗）、零 GUI；`javaw/java` 带窗进程 0。 | 记正面事实，无许可链问题。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | `/etest attack` 是否要在工装内建「自动朝向」 | (a) 不改，驱动侧 `bot.lookAt`（reach 门是 R196 正确几何，不应放宽）／(b) 工装内置 lookAt | **(a)**：判据面不因工装便利而放宽服务端几何 |
| D-2 | off 相是否需要一条专用判据行（区分「未发生」与「被门挡住」） | (a) 不加／(b) 加 `face=off` 行 | **(a)**：Δ 三态（200／1／0）＋ `[DamageLog] final=` ＋ 同 commit A 相通道活性已三向可分；加行只增噪声 |
| D-3 | 攻击靶口径（NoAI＋1000 HP＋`knockbackResistance:1`）是否固化为工装默认 | (a) 固定／(b) 逐点自定义 | **(a)**：防致死、防击退出 reach、防掉落物干扰，且不触发 `onInitialSpawn` 依赖 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 boot 1（buddy 基线） | 14:04:16–14:04:43：`Preparing level "offphasew46buddy"` `:511`；`Done (5.981s)` `:2257`；`BUILD SUCCESSFUL in 26s` `:2441`；`:compileJava/:classes/:jar UP-TO-DATE` `:32/:34/:36`；`[MiningLog]` 0 行 |
| 服务端 boot 2（A 相 on） | 14:04:43–14:05:33：`Preparing level "offphasew46a"` `:510`；`Done (5.975s)` `:2256`；`BUILD SUCCESSFUL in 48s` `:3919`；三任务全 UP-TO-DATE `:31/:33/:35` |
| 服务端 boot 3（G 相 off） | 14:05:33–14:06:27：`Preparing level "offphasew46g"` `:510`；`Done (5.946s)` `:2256`；`BUILD SUCCESSFUL in 53s` `:3898`；三任务全 UP-TO-DATE `:31/:33/:35` |
| 客户端 | **零会话**（未拉起、未关窗；`options.txt` 未读写，mtime 停留 17:44:52） |
| 端口 | 25565 LISTEN＝0（起 0／收 0）；25575 未用 |
| 崩溃 | `run/crash-reports` 18 → 18（无新增）；`run/hs_err_pid*.log`／`replay_pid*.log` 已清（C-2 首跑遗留） |
| cfg／props／ops／usercache／usernamecache | 服务端 cfg 收窗 byte-identical（`miningReform=true` 复位）；客户端 cfg／props／三项 side 文件全 byte-identical |
| 世界 | `offphasew46a`／`offphasew46g`／`offphasew46buddy` 已删（`worldsRemoved` 三 true） |
| rebuild | **0**（三 boot 三任务全 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅 `?? testharness/player/offphase-w46.js`＋本回执；HEAD `1fc134e` 未动） |
| judge 修复态变量 Kong | **N/A**——本窗驱动为一次性判窗脚本，无 judge 状态变量（同 W-44/W-45 登记口径） |

## §7 工装与复跑

- **驱动**：`testharness/player/offphase-w46.js`（骨架承 `effectiveset-w45.js` ← `mattockbreak-w43.js` 的 hold/dig/testforblock 三臂；本批新增 attack 臂与 cfg 双态流程）
  - `W46_MODE=buddy|a|g|all`（默认 all：buddy 基线 → A 相 → G 相＋收窗回填）
  - `W46_ONLY=W-46a,W-46b`（判点裁剪，冒烟用）
  - `W46_STAGE=<tag>`（服务端 `.out` 名隔离；默认取 tag）
  - 判点表：`A_POINTS`（a/b/c/d）／`G_POINTS`（e/f/g/h/k），每格含 `kind`（attack|dig）／`item`／`block`／`arena`／`rows`／`deny`／`expectDur`／`level`
  - **attack 臂**：`kill @e[type=pig]` → `summon minecraft:pig <bx+1.5, by, bz+0.5> {NoAI,1000HP,kbRes:1}` → `bot.lookAt(猪体心)` → `/etest attack @e[type=pig,r=4,c=1] <player>` → 等 `[TestLog] step=attack … target=` ＋ `[DamageLog] dmg target=Pig#… final=`；被 reach 门拒时重瞄一次
  - **dig 臂**：`/etest dig <x> <y> <z> <player>`（START 立即／STOP 于 40 tick，`TestDriver.java:97-103`）→ `testforblock … air` 复钉
  - **cfg 双态**：A 相零编辑；G 相前 `setCfgBool('miningReform','false')` 写盘后重启；收窗从起窗快照 `offphase-w46-etim.cfg.before` 回填
- **判行复核（可粘贴）**：

```powershell
Select-String -Path testharness\build-logs\offphase-w46-a.out -Pattern '\[MiningLog\] tool decay'
Select-String -Path testharness\build-logs\offphase-w46-a.out -Pattern '\[MiningLog\] mine speed'
Select-String -Path testharness\build-logs\offphase-w46-g.out -Pattern '\[MiningLog\]'
Select-String -Path testharness\build-logs\offphase-w46-a.out,testharness\build-logs\offphase-w46-g.out -Pattern '\[DamageLog\] dmg target=Pig#'
Select-String -Path testharness\build-logs\offphase-w46-a.out,testharness\build-logs\offphase-w46-g.out -Pattern 'step=(attack|dig-start|dig-stop)'
Select-String -Path git-workspace\etim\src\main\java\io\github\etim\etim\metal\ETIMItemHoe.java -Pattern 'miningReform|hitEntity|onBlockDestroyed'
```

- **证据卷**（`testharness/build-logs/`）：`offphase-w46-a.out`（519,381 B／3,922 行）／`offphase-w46-g.out`（515,267 B／3,901 行）／`offphase-w46-buddy.out`（358,521 B／2,444 行）／三份 `-server-latest.log`／`offphase-w46-evidence-all.json`（40,666 B）／`offphase-w46-anchors.txt`（逐点锚索引）／`offphase-w46-driver.log`（103,898 B）／cfg 双件＋props＋ops/usercache/usernamecache 六份 before 快照／`offphase-w46-run1/`（首跑 OOM 与 A/G 旁证，C-2）／`offphase-w46-smoke/`（冒烟档）。
- **复跑命令**（仓根 `git-workspace/etim`）：

```powershell
# 全窗（buddy → A → G，收窗自动回填 cfg）
$env:W46_MODE='all'; node testharness\player\offphase-w46.js offphase-w46
# 冒烟（两点）
$env:W46_MODE='a'; $env:W46_ONLY='W-46a,W-46b'; node testharness\player\offphase-w46.js offphase-w46-smoke
```

## §8 未覆盖面（不补白）

1. **i／j 后备位**未跑（任务书明示「后备位不跑」）。
2. **其余工具族的 off 相**未并测：pickaxe／scythe／hatchet／battle_axe／war_hammer 的 off 支＝vanilla `ItemTool.hitEntity` `damageItem(2)`，W-42 G 相已证（Δ2）；本批只锁 hoe（Δ1）与 rusted shears（Δ0）。
3. **创造模式 off 相**（`Δ0`）与 `isPortable` 面未测（与本批集合/相位面正交）。
4. **`/etest attack` 的扫击（sweep）／多目标面**未测：本批每点单靶单挥。
5. **盾牌／格挡面**（AD-10 别批）未触及。

## §9 自报（机械核讫）

> 文件：`testharness/reports/offphase-W46-verdict.md`｜**27,874 B**｜294 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`A5E0FC79D1F4903DC64F6524E96363AA310BD76A9063061D4ED7345F057A9BF2`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`3214BA80F087AB669B1A7133A447B41F648DE37D22FB5FBD1603395DB35D1D34`
> 判格 9（a／b／c／d／e／f／g／h／k）全 ✓｜A 相 attacking 2／breaking 2／speed 2（记录面）｜G 相 `[MiningLog]` 全窗 0 行｜deny 0／shear drop 0／reach denied 0｜冲突 A0 B1 C7｜待裁 D-3｜jar byte-identical／零 rebuild／产品码 0 改／零客户端
