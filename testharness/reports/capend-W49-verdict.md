# capend 批（生命帽 / 升级回补 / 挥击饥饿）· W-49 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（服务端日志 CST 10:21:50–10:22:47）｜**窗口**：单 boot（判窗窗＝本批第 3 次 boot；前两次＝冒烟 `smk1` 与工装 case 修错 `run1`，见 §4 C-1）｜**0 客户端**
> **报告字节规格**：`25,648 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 30 / ✗ 2｜210 行`
> **判据正本**：`playground/audit/capend-立项摸底.md` §9（12 点判点表）＋`playground/audit/capend-终审回执.md` §四（三动序调整／front-prep 注记／期望值总表／签核词）＋`playground/audit/capend-收讫.md`（D-1(b) 回补门＋D-2 `[CapLog]` 通道落码，commit `9d75649`）
> **判据通道（纯服务端四族）**：
> - 值域面 `[CapLog] lvl=<N> cap=<X> prevBase=<F> healthBefore=<F> heal=<F> healthAfter=<F>`（`playerstate/CapLog.java:27-37`，Float.toString 全精度；门＝`playerCaps.playerCapDebugLog=true`）
> - 挥击面 `[FoodLog] <name> (<eid>) attackDrain base=<F> mod=<F> amount=<F> pool=<F>`（`hunger/ETIMEndurance.java:176-190` charge()；门＝`food.foodDebugLog=true`）
> - 负证旁证 `[FoodLog] … weakStrike deny degenerate-fix dx=… dz=…`（`hunger/ETIMHungerEvents.java:62-66`）／`[MiningLog] tool decay face=attacking item=<reg> loss=<N>`（`mining/ETIMMining.java:303-312`；创造相 loss=0 行＝落点已进伤害链）
> - 命令回执 `[EtimTest] commands.etest.<verb> player=… params=[…]`（level/health/food/hold/enchant 五型，共 35 条）
> **判决**：**PASS** —— 12 判点 **12 ✓ / 0 ✗**（W1–W6 值域＋回补＋降级钳；W7/W8/W12 挥击计费三段；W9/W10/W11 三负证）；另 **1 条旁证 W10x ✓**（非判点）。零 rebuild、零产品码、零客户端、世界已删、起收钉值全 byte-identical。

## §0 判定总表（12 判点 ＋ 1 旁证）

判据＝「判行词面逐位对上期望（[CapLog] 六字段／attackDrain 三字段）」＋「本点段内行数恰为期望条数」＋「负证点 0 行且邻位旁证成立」。

| 点 | 相 | 操作（CST） | 判行词面（实测） | 判值 期望 → 实测 | 判 |
| --- | --- | --- | --- | --- | --- |
| W4 | 生存 | `/etest level 35` @10:22:12 | `lvl=35 cap=20 prevBase=6.0 healthBefore=6.0 heal=14.0 healthAfter=20.0` | cap 20（答案封顶）· heal 14.0（6→20） | ✓ |
| W1 | 生存 | `/etest level 0` @10:22:13 | `lvl=0 cap=6 prevBase=20.0 healthBefore=20.0 heal=0.0 healthAfter=6.0` | cap 20→6 降级臂钳 · healthAfter 6.0 | ✓ |
| W2 | 生存 | `/etest level 5` @10:22:14 | `lvl=5 cap=8 prevBase=6.0 healthBefore=6.0 heal=2.0 healthAfter=8.0` | cap 6+1×2=8 | ✓ |
| W3 | 生存 | `/etest level 10` @10:22:16 | `lvl=10 cap=10 prevBase=8.0 healthBefore=8.0 heal=2.0 healthAfter=10.0` | cap 6+2×2=10 | ✓ |
| W5 | 生存 | `level 4` @10:22:17 → `health 3` @10:22:18 → `level 5` @10:22:18 | 帧①`lvl=4 cap=6 prevBase=10.0 healthBefore=10.0 heal=0.0 healthAfter=6.0`；帧②`lvl=5 cap=8 prevBase=6.0 healthBefore=3.0 heal=2.0 healthAfter=5.0` | true 档：cap 6→8、heal 2.0、healthAfter 5.0 | ✓ |
| W6 | 生存 | `health 8` @10:22:19 → `level 4` @10:22:20 | `lvl=4 cap=6 prevBase=8.0 healthBefore=8.0 heal=0.0 healthAfter=6.0` | 降级钳：healthBefore 8.0 → healthAfter 6.0、heal 0 | ✓ |
| W7 | 生存 | 空手击僵尸（L0）@10:22:26 | `attackDrain base=0.3 mod=1.0 amount=0.3`（1 行） | base 0.3／mod 1.0／amount 0.3 | ✓ |
| W8 | 生存 | 胸甲 endurance L1 击 @10:22:28 | `attackDrain base=0.3 mod=0.8 amount=0.24000001`（1 行） | mod 0.8／amount 0.24000001（float32 = 0.24000000953674316） | ✓ |
| W9 | 生存 | health 1 空手击 @10:22:31 | **0 条 attackDrain** ＋ `weakStrike deny degenerate-fix dx=-2.0 dz=0.0` | 零计费 ＋ deny 行 | ✓ |
| W10 | 创造 | 创造模式空手击 @10:22:34 | **0 条 attackDrain** ＋ 0 条 weakStrike | 零计费（创造门） | ✓ |
| W11 | 生存 | 侧向一格空挥（arm_animation）@10:22:39 | **0 条 attackDrain**（段内零行） | 零计费（无 use_entity ⇒ 无 AttackEntityEvent） | ✓ |
| W12 | 生存 | 胸甲 endurance L4 击 @10:22:42 | `attackDrain base=0.3 mod=0.19999999 amount=0.06`（1 行） | mod 0.19999999（=0.19999998807907104）／amount 0.06（=0.05999999865889549） | ✓ |
| W10x（旁证·非判点） | 创造 | 持铁剑创造击 @10:22:36 | **0 条 attackDrain** ＋ `[MiningLog] tool decay face=attacking item=minecraft:iron_sword loss=0` | 落点已进伤害链而计费为 0 | ✓ |

判格要点（逐条亲验）：

- **值域面**：`cap = clamp(6 + level/5×2, 6, 20)` 四档全中（0→6／5→8／10→10／35→20 封顶），整数除法断向零与 `PlayerStatLimits.java:29-32` 一致；`capMaximum=20` 封顶在 level 35 正面命中（W4）。
- **降级臂钳**：`previous != cap → setBaseValue + (health>cap → setHealth(cap))`，W1（20→6）与 W6（8→6）两向成立，`heal` 在两帧均为 0.0（门内 `cap > previous` 不成立 ⇒ 不补）。
- **回补门（D-1(b) true 档）**：W4 `heal=14.0`（6→20）、W5 `heal=2.0`（6→8）——`ETIMConfig.playerHealOnLevelUp=true` 时 `player.heal(cap−previous)` 逐位成立；W5 的 `healthBefore=3.0` 证明「先 level 4 落 6 档 → health 3（钳内）→ level 5」的动序锚成立（终审动序调整 2）。
- **挥击三段**：mod 由 `1.0 − level×0.2` 现算——L0=1.0／L1=0.8／L4=0.19999999；amount = base×mod 的 float32 直乘（无再舍入位），三档 `0.3／0.24000001／0.06` 逐位中；与终审 §四「期望值总表」同值（档内词面按 Java Float.toString 最短路打印，bit 值见 §0 表注）。
- **三负证**：W9 走弱击门（`health 1 < weakStrikeHealthThreshold 2.0` ⇒ `AttackEntityEvent.setCanceled` ⇒ 不进 charge），出 deny 行、0 计费；W10 走 `charge()` 的 `capabilities.isCreativeMode` 早退（`ETIMEndurance.java:177-179`），0 行；W11 结构性无落点（arm_animation 不进 `NetHandlerPlayServer.processUseEntity`），0 行。
- **W10x 旁证的用途**：W10 的「0 行」本身不能区分「门挡住」与「没打中」。同 boot、同靶、同距离、同创造相持 `minecraft:iron_sword` 一击 ⇒ `[MiningLog] attacking loss=0` 行出现（该行由 `ItemSword.hitEntity` 的 Redirect 发行，只在伤害落地后走），证明攻击事件未被取消且已进伤害链；再接 W12（切回生存、同靶同距离）出 1 条 attackDrain，构成「创造 0 → 生存 1」的同点括号对照。

## §1 逐点锚（`.out` 档内真行号）

档：`testharness/build-logs/capend-w49.out`＝**559,577 B／4,356 行**（UTF-8，U+FFFD **0**）。行号仅作定位，判行按词面复核。逐点起止 marker＝`[Server] W49-<id>-BEGIN/END`。

| 点 | BEGIN | 判行（.out 行号） | `[EtimTest]` 回执（.out 行号） |
| --- | --- | --- | --- |
| W0（登录帧·申报位） | — | 2459 `[CapLog] lvl=0 cap=6 prevBase=20.0 healthBefore=6.0 heal=0.0 healthAfter=6.0` | — |
| W4 | 4122 | **4125** `[CapLog] lvl=35 cap=20 prevBase=6.0 healthBefore=6.0 heal=14.0 healthAfter=20.0` | 4124 `level_set … params=[35]` |
| W1 | 4129 | **4132** `[CapLog] lvl=0 cap=6 prevBase=20.0 healthBefore=20.0 heal=0.0 healthAfter=6.0` | 4131 `level_set … params=[0]` |
| W2 | 4136 | **4139** `[CapLog] lvl=5 cap=8 prevBase=6.0 healthBefore=6.0 heal=2.0 healthAfter=8.0` | 4138 `level_set … params=[5]` |
| W3 | 4143 | **4146** `[CapLog] lvl=10 cap=10 prevBase=8.0 healthBefore=8.0 heal=2.0 healthAfter=10.0` | 4145 `level_set … params=[10]` |
| W5 | 4150 | **4153** `[CapLog] lvl=4 cap=6 prevBase=10.0 healthBefore=10.0 heal=0.0 healthAfter=6.0`／**4158** `[CapLog] lvl=5 cap=8 prevBase=6.0 healthBefore=3.0 heal=2.0 healthAfter=5.0` | 4152 `level_set [4]`／4155 `health_set params=[3.0, 6]`／4157 `level_set [5]` |
| W6 | 4162 | **4167** `[CapLog] lvl=4 cap=6 prevBase=8.0 healthBefore=8.0 heal=0.0 healthAfter=6.0` | 4164 `health_set params=[8.0, 8]`／4166 `level_set [4]` |
| HUN-PREP | 4171 / END 4189 | 4182 `[CapLog] lvl=0 cap=6 prevBase=6.0 healthBefore=6.0 heal=0.0 healthAfter=6.0`（前置帧·非判点） | 4178 `level_set [0]`／4180 `health_set [6.0, 6]`／4181 `food_set_pool [6, 6, 6]` |
| W7 | 4191 | **4202** `[FoodLog] ETIM_W49 (768) attackDrain base=0.3 mod=1.0 amount=0.3 pool=1.1059967` | 4196 `health_set`／4197 `food_set_pool`／4199 `hold_set [Air]` |
| W8 | 4209 | **4230** `… attackDrain base=0.3 mod=0.8 amount=0.24000001 pool=1.4499954`；槽位真值 **4220** `[EnchantLog] enchantprobe slot=CHEST item=minecraft:iron_chestplate canApply=false maxLevel=5` | 4219 `enchant_set params=[chest, …enchantment.level.1…, Iron Chestplate]` |
| W9 | 4237 | **4248** `[FoodLog] ETIM_W49 (768) weakStrike deny degenerate-fix dx=-2.0 dz=0.0`（本段 0 条 attackDrain） | 4242 `health_set params=[1.0, 6]` |
| W10 | 4252 | 段内 0 行（靶定位与挥击均在本段） | 4257 `health_set [6.0, 6]`／4258 `food_set_pool`／4260 `hold_set [Air]` |
| W10x | 4269 | **4283** `[MiningLog] tool decay face=attacking item=minecraft:iron_sword loss=0 [server]`（本段 0 条 attackDrain） | 4277 `hold_set [Iron Sword]` |
| W11 | 4287 | 段内 0 行（只发 arm_animation） | 4293 `health_set`／4294 `food_set_pool`／4295 `hold_set [Air]` |
| W12 | 4301 | **4321** `… attackDrain base=0.3 mod=0.19999999 amount=0.06 pool=1.8519909`；槽位真值 **4311** `[EnchantLog] enchantprobe slot=CHEST item=minecraft:iron_chestplate …` | 4310 `enchant_set params=[chest, …enchantment.level.4…, Iron Chestplate]` |

判行原句（成对摘录，便于直读）：

```
4125: [10:22:12] [Server thread/INFO] [Easy Times In Minecraft]: [CapLog] lvl=35 cap=20 prevBase=6.0 healthBefore=6.0 heal=14.0 healthAfter=20.0
4132: [10:22:13] [Server thread/INFO] [Easy Times In Minecraft]: [CapLog] lvl=0 cap=6 prevBase=20.0 healthBefore=20.0 heal=0.0 healthAfter=6.0
4158: [10:22:18] [Server thread/INFO] [Easy Times In Minecraft]: [CapLog] lvl=5 cap=8 prevBase=6.0 healthBefore=3.0 heal=2.0 healthAfter=5.0
4167: [10:22:20] [Server thread/INFO] [Easy Times In Minecraft]: [CapLog] lvl=4 cap=6 prevBase=8.0 healthBefore=8.0 heal=0.0 healthAfter=6.0
4202: [10:22:26] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_W49 (768) attackDrain base=0.3 mod=1.0 amount=0.3 pool=1.1059967
4230: [10:22:28] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_W49 (768) attackDrain base=0.3 mod=0.8 amount=0.24000001 pool=1.4499954
4248: [10:22:31] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_W49 (768) weakStrike deny degenerate-fix dx=-2.0 dz=0.0
4283: [10:22:36] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=attacking item=minecraft:iron_sword loss=0 [server]
4321: [10:22:42] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_W49 (768) attackDrain base=0.3 mod=0.19999999 amount=0.06 pool=1.8519909
```

## §2 通道计数（全窗，档内直数；逐点与驱动 `points[]` 12/12 全等）

| 通道 | 全窗条数 | 分解 |
| --- | --- | --- |
| `[CapLog]` | **9** | W0 登录 1／W4 1／W1 1／W2 1／W3 1／W5 **2**／W6 1／HUN-PREP 1 |
| `[FoodLog] attackDrain` | **3** | W7 1／W8 1／W12 1；**W9＝0／W10＝0／W11＝0** |
| `[FoodLog] weakStrike deny` | **1** | W9（其余各段 0） |
| `[MiningLog] attacking decay` | **1** | W10x（创造臂 loss=0 旁证） |
| `[EnchantLog] enchantprobe` | **2** | W8／W12 各 1（四行族中取 `slot=/item=` 行作槽位真值） |
| `[EtimTest]` 回执 | **35** | `level_set` 8／`health_set` 10／`food_set_pool` 8／`hold_set` 7／`enchant_set` 2 |
| Mixin 失败三型 | **0** | `Mixin apply failed`／`MixinException`／`InvalidInjectionException` |

`/clear` 与靶面：HUN-PREP 前每点以 `hold_set [Air]` 清手，未用 `/clear`（不涉背包 Δ 判据）；僵尸为 `/{NoAI,Silent,PersistenceRequired}+maxHealth 1000+knockbackResistance 1.0` 单靶，每点 `tp` 复摆到 `(bx+2.5, by, bz+0.5)`（bot 常驻 `(bx+0.5, by, bz+0.5)`，间距 2.0 格）。

## §3 起收钉值（全同 ⇒ 零 rebuild／零产品码／零 cfg 残留）

| 项 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `9d75649836fc4e857231aa2081e0c21e0a9ab4c2` | 同（窗内零提交） | ✓ |
| release jar | 776,797 B `1073A59A…3E998B3E` | byte-identical | ✓ |
| dev jar | 760,949 B `8BC04E70…28EBF421` | byte-identical | ✓ |
| sources jar | 705,207 B `E4B38D9E…07DA417F` | byte-identical | ✓ |
| 服务端 cfg（窗前后基线） | 32,095 B `E07CAC1E…7E7AE7F5`（555 行，两键未在档） | 收口回原字节 32,095 同 SHA | ✓ |
| 服务端 cfg（boot 后新基线） | — | **32,481 B `43FF4686…45055B59`**（playercaps 段新增 `B:playerCapDebugLog=true`／`B:playerHealOnLevelUp=true`，键序 capMaximum→playerCapDebugLog→playerHealOnLevelUp） | 申报 |
| 客户端 cfg | 30,277 B `E37C1377…434F81C45` | byte-identical（零客户端、未 boot，手改键已回退） | ✓ |
| props | 890 B `3009633863…571B654A48` | byte-identical（`level-name` 已回 `test27dev`） | ✓ |
| ops／usercache／usernamecache | 685／1,630／851 B | 三件 byte-identical | ✓ |
| MK 双树 | mixins 56／client 10｜refmap 62 类键·138 条目｜切片 4/4/3＝11 | 双树同值（139/57/12 与序漂均未现） | ✓ |
| 端口／crash／world | 0／18／— | 0／18／`capendw49` 已删 | ✓ |
| Gradle | — | `:compileJava/:classes/:jar` 全 **UP-TO-DATE**；`BUILD SUCCESSFUL in 56s`（`:4353`）；`stop` exitCode 0 | ✓ 0 rebuild |

判值前提五亲读（boot 前 cfg，档内 `cfgFlags.server`）：`capAtLevel0=6`／`capGrowthPerFiveLevels=2`／`capMaximum=20`／`playerHealOnLevelUp=true`／`playerCapDebugLog=true`；挥击面 `attackHungerPerHit=0.3`／`enduranceModifierStep=0.2`／`enduranceMaxLevel=4`／`hungerWeakStrike=true`／`weakStrikeHealthThreshold=2.0`／`foodModel=true`／`foodDebugLog=true`；旁证面 `miningDebugLog=true`／`miningReform=true`。

## §4 冲突分级（A 0／B 0／C 8）

- **C-1（工装手法面 · 已闭合）判窗首轮假 FAIL**：首轮全窗（`capend-w49-run1/`）W8／W12 判 FAIL，唯一不中项＝驱动自设的 `chestSlotProbe` 检查用 `slot === 'chest'` 小写比较，而 `[EnchantLog] enchantprobe` 打印 `slot=CHEST`（`EntityEquipmentSlot.toString()` 大写）。**判行本身全中**（`mod=0.8 amount=0.24000001`／`mod=0.19999999 amount=0.06`／`item=minecraft:iron_chestplate`）。修法＝比较侧小写归一，随后重跑得本正本（第 3 次 boot）。首轮证据整体归档 `testharness/build-logs/capend-w49-run1/`，不入判。
- **C-2（时序面 · 申报）W0 登录帧字段随 boot 序位漂**：`[CapLog]` 登录帧的 `healthBefore` 在两 boot 分别取 `20.0`（run1）与 `6.0`（本窗）——取决于 `PlayerEvent.PlayerLoggedInEvent` 的 `applyCaps` 与客户端血量同步的先后，非判点（任务书 §三明定 W0 帧入「Presents 申报位」）；判点 W4 的 `healthBefore=6.0` 在两 boot 均同值。
- **C-3（口径面 · 行号）`srv.all` 与 `.out` 行号不一一对应**：`.out` 含 `### [harness] > <cmd>` 回显行（不入 `srv.all`），本窗 offset 13–17 行不等且随点数增长；本回执锚一律用 `.out` 真行号，证据 JSON 内 `idx` 为 `srv.all` 下标——两者不可混用。
- **C-4（口径面 · 命令词面）**`/etest enchant <slot>` 入参要小写 `chest`，而回显/探针走 `EntityEquipmentSlot.toString()` 大写 `CHEST`：同一槽两种词面，harness 侧必须大小写归一（C-1 根因）。
- **C-5（负证可证性 · 已旁证）W10／W11 的「0 行」**：服务端无「挥击已发出」的独立行，故单看 0 行无法区分「门挡住／没打中」。处置＝W10 增设 W10x 剑面 `[MiningLog] attacking loss=0` 旁证（落点已进伤害链）；W11 以「同 boot／同靶／同距离／下一击 W12 出 1 条 attackDrain」作括号对照。两负证因此可从「结构保证」升到「有邻位正证托底」，但 W11 本体仍无服务端落点行（1.12 结构使然）。
- **C-6（读法面）`enchantprobe` 的 `canApply=false maxLevel=5` 属 piercing 面**：探针固定读 `ETIMEnchantments.PIERCING`（`CommandDevTest.java:364-368`），与 W8／W12 的 endurance 无关；本窗只取该行 `slot=`／`item=` 两字段作**槽位真值**，endurance 等级以 `[EtimTest] enchant_set …enchantment.level.1/.4…` 回执＋判行 `mod=` 双证。
- **C-7（cfg 面）boot 后 cfg 新基线含 harness 手写注释**：本窗 boot 前后 cfg SHA 同值（32,481 `43FF4686…`），证明 Forge `Configuration` 未重写文件（既有键的注释取文件原样、新键由 hand-edit 提供），故新基线字节＝手改字节；产品码默认值（false／true）不受影响。
- **C-8（工装产物面）`capend-w49-driver.log` 中文乱码**：PowerShell `*>` 重定向以本机控制台编码落盘，node 输出的 UTF-8 中文被二次转码；**判据一律取 `.out`／`session-1.log`／`evidence.json`（均 UTF-8 正常）**，driver.log 只作时序旁读。

### 4.1 窗位补记申报（任务书 §四.5）

- **A-1（R196 升级不回血）**：本窗**不再单 boot false 档**——A-1 已由终审 javap 字节级实证（`addExperience(IZZ)V` offset 0-1 `iconst_1; istore_2`，全方法唯一写槽 2；262-263 `iload_2; ifne 282` 使 266-279 死码）。本窗只判 `playerHealOnLevelUp=true` 档，实测 `heal=14.0`（W4）／`2.0`（W5），与门设计词面逐位相符。
- **B-2（传送宽限 600t 缺）**：承 D-5「只登记不立项」，本窗无对应判点，未取点、未改码。

## §5 待裁位（D-3）

| # | 待裁 | 选项 | 倾向 |
| --- | --- | --- | --- |
| D-1 | **W9 弱击只跑了一支触发臂**：本窗用 `health=1 < 2.0`（低血臂），未跑 `hasFoodEnergy=false`（饥饿臂） | (a) 认单臂成立（同函数同分支 `ETIMHunger.java:53-58`，两臂指向同一 `return true`）／(b) 下一窗补饥饿臂 | **(a)**：判点定义是「弱击条件出一 deny 行且零计费」，两臂同门；饥饿臂若要补，属补充取样（`-retest`）而非改判 |
| D-2 | **W10x 是否升为第 13 判点** | (a) 保留旁证（判点表 12 点冻结）／(b) 升判点，把「创造零计费＋落点已进伤害链」合判 | **(a)**：任务书 §三已冻结 12 点；W10x 的作用是给 W10 的负证托底，不是新面 |
| D-3 | **cfg 收口口径**：本窗 boot 后新基线 32,481 B（含两键），收口回原 32,095 B | (a) 保持还原（下窗 boot 再手改，字节可复算）／(b) 常驻新基线（两键留在档，`playerCapDebugLog` 置 false） | **(a)**：还原后窗基线可硬钉，免「上窗遗留键」污染下一窗判据；新基线已在本档 §3 逐位申报 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 boot（判窗窗） | CST 10:21:50 驱动起 → 10:21:53 `Finished gathering 15 mods` `:127` → 10:22:00 `Preparing level "capendw49"` `:510` → **10:22:05 `Done (5.573s)` `:2256`** → 12 判点（10:22:11–10:22:43）→ 10:22:45 `Stopping server` `:4334` → 10:22:47 **`BUILD SUCCESSFUL in 56s` `:4353`**，`stop` exitCode 0 |
| 客户端 | **零会话**（未拉起、未关窗、未抢焦点；`options.txt` 未读写） |
| 端口 | 25565 LISTEN：起 0／收 0 |
| 崩溃 | `run/crash-reports` 18 → 18（无新增） |
| cfg／props／三 side 文件 | 服务端 cfg 收口回原字节（32,095 同 SHA）；客户端 cfg／props／ops／usercache／usernamecache 全 byte-identical |
| 世界 | `capendw49` 已删（`worldRemoved=true`） |
| rebuild | **0**（三任务全 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅 `?? testharness/player/capend-w49.js` 与本回执；HEAD `9d75649` 未动） |
| 时钟口径 | 驱动时间戳 UTC（`02:22:xx`）／服务端日志 CST（`10:22:xx`，+8 h）；本回执锚只认档内行号与行首时刻 |

## §7 工装与复跑

### 7.1 驱动

`testharness/player/capend-w49.js`＝`chaincraft-w48.js` 的骨（PIN／MK／`startServer`／`say` 段标／evidence JSON／收口快照）＋本批 12 点表内嵌（`CAP_POINTS` 6／`HUN_POINTS` 7 含 1 旁证）。

- 环境变量：`W49_ONLY=W4,W1,W7`（判点裁剪，冒烟用）｜`W49_STAGE=<tag>`（`.out` 名隔离）。
- 判据原语：`frames[]`（`[CapLog]` 六字段逐位对表，含帧数量断言）／`drains[]`（base/mod/amount 三字段逐位）／`denies[]`／`decays[]`／`probes[]`；每点先判「行数恰为期望」，再判字段。
- 段标：每点 `say W49-<id>-BEGIN` … `say W49-<id>-END`，判行按两 marker 的 `.out` 行号区间切段。
- 靶面：`summon minecraft:zombie <bx+2.5> <by> <bz+0.5> {Tags:["w49mob"],NoAI:1b,Silent:1b,PersistenceRequired:1b,Attributes:[{maxHealth 1000},{knockbackResistance 1.0}],Health:1000.0f}`，每点 `tp @e[tag=w49mob] <同点>` 复摆（消击退/位移）。
- 装备面：`replaceitem entity <bot> slot.armor.chest minecraft:iron_chestplate` → `etest enchant chest <1|4> endurance <bot>` → `etest enchantprobe chest none <bot>`（槽位真值）→ 出拳。
- 空挥面：`bot.look(yaw+90°, 0, true)` ＋ `bot.swingArm('right')`（只发 `arm_animation`，无 `use_entity`）。

### 7.2 判行复核（可直接粘贴）

```powershell
# 值域面九帧
Select-String -Path testharness\build-logs\capend-w49.out -Pattern '\[CapLog\]'
# 挥击三段 + 三负证段
Select-String -Path testharness\build-logs\capend-w49.out -Pattern 'attackDrain'
Select-String -Path testharness\build-logs\capend-w49.out -Pattern 'weakStrike deny'
Select-String -Path testharness\build-logs\capend-w49.out -Pattern 'tool decay face=attacking'
# 槽位真值 + 回执
Select-String -Path testharness\build-logs\capend-w49.out -Pattern 'enchantprobe|\[EtimTest\]'
# Mixin 失败（应 0）
Select-String -Path testharness\build-logs\capend-w49.out -Pattern 'Mixin apply failed|MixinException|InvalidInjectionException'
```

### 7.3 复跑

```powershell
cd "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
# 全窗（单 boot，12 点＋1 旁证，收窗自动回填 cfg/props/world）
node testharness\player\capend-w49.js capend-w49
# 冒烟（两通道＋deny＋创造见证四点）
$env:W49_ONLY='W4,W1,W7,W9,W10x,W11'; $env:W49_STAGE='capend-w49-smk'; node testharness\player\capend-w49.js capend-w49-smk
```

### 7.4 证据卷（`testharness/build-logs/`）

`capend-w49.out`（559,577 B／4,356 行，判行正本）｜`capend-w49-session-1.log`（559,164 B，`run/logs/latest.log` 快照）｜`-session-1.out`（559,577 B）｜`-evidence.json`（39,455 B，逐点 checks／frames／drains／denies／decays／probes／cmds／bot 快照／pins）｜`-etim.cfg.before`（32,095）／`-etim.cfg.afterboot`（32,481）／`-client-etim.cfg.before`（30,277）／`-server.properties.before`（890）／`-ops.json.before`／`-usercache.json.before`／`-usernamecache.json.before`｜冒烟 `capend-w49-smk1*`（工装首证：两通道＋deny＋decay 见证）｜首轮假 FAIL 卷 `capend-w49-run1/`（5 文件，C-1 佐证）。

## §8 未覆盖面（不补白）

1. **false 档（`playerHealOnLevelUp=false`）**：本窗未跑（A-1 已字节级实证，任务书 §三明定不作必需点）。
2. **饥饿臂弱击（`hasFoodEnergy=false`）**：见 D-1，同门未另取点。
3. **B-1 属性式 vs 直读（`getMaxHealth`）**：值域等价（`min(max(x,6),20) ≡ max(min(x,20),6)`），承载差登记在案，本窗只判值域不判承载方式。
4. **B-3 伤害实值门 vs 属性门（虚弱越门 +1 计费角）／B-4 跨端同步 ≤1 tick 窗**：承终审「只登记不落」，本窗无点。
5. **B-2 传送宽限 600t**：见 §4.1，只登记。
6. **`[CapLog]` 的 HUD/客户端渲染面**：客户端面「由用户操作」，本窗零客户端，不作判值。
7. **`/etest enchant` 的其它槽位与 pierce 面**：不在本批判点表内。

## §9 自报（机械核讫）

> 文件：`testharness/reports/capend-W49-verdict.md`｜字节五项以**档头规格行**为唯一自指固定点（本节不复述，避免双自指漂移）｜首字节 0x23｜U+FFFD 0｜CR 0
> 三口径家族（本档自定，与 capend 摸底 §11 同型）：**甲＝全档零位**（把本档三处 64 位十六进制——本节三行实值——整体替换为 64 个 `0` 后，对全档字节 SHA-256）；**乙＝正文零位**（同甲替换后，自文件首字节起至 `## §9 自报（机械核讫）` 行之前、不含该行）；**丙＝行链零位**（同甲替换后按 split(`\n`) 全元素（含尾空行）逐行 sha256 小写 hex，以 `\n` 连接后再 SHA-256）。
> SHA-256 甲（全档零位）`A034E0F40A3D3CAE7BA13BB57FD559DC3005B62D583C578E0659E498343BEE94`
> SHA-256 乙（正文零位）`D0ED1E4547070A95B768F1838BDB02EC8E0E0992FA7207C7A52E353D38809C8C`
> SHA-256 丙（行链零位）`638CF92115DCF561459BF48CA8B6790CD600ECCA3E7986C6EFD5E7E24D0BB1E3`
> 判格 12（W1–W6 值域／回补／降级钳；W7／W8／W12 挥击计费；W9／W10／W11 负证）全 ✓＋旁证 W10x ✓｜`[CapLog]` 9／`attackDrain` 3／`weakStrike` 1／`attacking decay` 1／`enchantprobe` 2／`[EtimTest]` 35／Mixin 0｜冲突 A0 B0 C8｜待裁 D-3｜jar 三件 byte-identical／零 rebuild／零产品码／零客户端。
> 叉号口径：本档叉号仅 2 处——判决行「全 ✓／0 叉」的零值占位一处，与档头规格行自身字形一处；正文 12 判格全对号，无失实叉号。
