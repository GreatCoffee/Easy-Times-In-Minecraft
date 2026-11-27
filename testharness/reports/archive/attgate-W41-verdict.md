# attacking 面创造门批（attgate）· W-41 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：两相 A/G（各一次 `gradlew runServer`，零 rebuild）
> **报告字节规格**：`19,167 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 24 / ✗ 3｜175 行`
> **判据正本**：`playground/audit/attgate-终审回执.md` §三「W-41 十点定稿表」（D-5(a) 全采）＋`playground/audit/attacking-立项摸底.md` §6（M-5 判窗预埋）。本回执**只判十点＋一条增补控制臂**，不改判点定义。
> **秤上唯一判据**：`[MiningLog] tool decay face=attacking item=<reg> loss=N [server]`（`mining/ETIMMining.java:312` 发行，`state=null` ⇒ **无 block 列**；去重键 `attacking|<item>`）。行出现 `block=` 列即判行形异常（本窗 0 例）。
> **判决**：**PASS**——a/b/c/d/e/f/g/h/i 九点全 ✓，j 点「条件未达」按 B 级登记（后置，不阻塞），增补控制臂 j2 ✓；**计数总账 A 相 `attacking=9 ok:true`／G 相 `attacking=0 ok:true`**，他通道全 0。

## §0 判决总表（十点＋1 控制臂）

| 点 | 相 | 内容 | 期望 attacking 行 | 期望栈 Δ | 实测行 | 实测栈 Δ | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-41a | A | 生存 剑×猪 | `diamond_sword loss=50` ×1 | +50 | 50 ×1 | +50 | ✓ PASS |
| W-41g | A | 创造首击→切生存→再一击（同剑） | 0 ×1 然后 50 ×1＝2 条 | 0 然后 +50 | 0 ×1、50 ×1 | 0→50 | ✓ PASS |
| W-41e | A | **创造** 剑×猪（★反转） | `loss=0` ×1（0 条＝FAIL） | 0 | 0 ×1 | 0（背包差 0） | ✓ PASS |
| W-41b | A | 生存 铁镐×猪 | `iron_pickaxe loss=100` ×1 | +100 | 100 ×1 | +100 | ✓ PASS |
| W-41c | A | 生存 锈锄×猪（覆写点） | `hoe_rusted_iron loss=200` ×1 | +200 | 200 ×1 | +200 | ✓ PASS |
| W-41f | A | **创造** 锈锄×猪（反转·非 mixin 覆写点） | `loss=0` ×1 | 0 | 0 ×1 | 0（背包差 0） | ✓ PASS |
| W-41d | A | 生存 锈剪×猪（覆写点） | `shears_rusted_iron loss=200` ×1 | +200 | 200 ×1 | +200 | ✓ PASS |
| W-41j | A | **创造格挡**（`iron_sword` active＋mob 源 8） | `loss=0` ×1（条件点） | 0 | **0 条** | 0（玩家伤 0） | ✗ 条件未达 → B-1（后置） |
| W-41j2 | A | **增补控制臂**：同 active 状态切生存受同一击 | `iron_sword loss=50` ×1 | `(int)(4×50)=200` | 50 ×1 | +200 | ✓ PASS |
| W-41h | G | off 相 生存 剑×猪 | **0 条** | +1（vanilla） | 0 条 | +1 | ✓ PASS |
| W-41i | G | off 相 创造 剑×猪 | **0 条** | 0 | 0 条 | 0（背包差 0） | ✓ PASS |

> j2 说明：终审十点里 j 是**第 5 调用点（盾面 `combat/ETIMBlocking.java:183`）**的唯一窗口。本窗实测该点的**创造臂结构性不可达**（见 §4 B-1），故在同一 boot、同一 active 状态下补一条**生存臂**（j2）直证第 5 调用点仍然活着：行 `loss=50` 与实磨 `(int)(blocked×50)=200` 同时命中，且 `[DamageLog]` 给出 `raw=8 → final=4` 的减半中间量。j2 为**工装增补**，不计入终审十点，也不改判点定义。

## §1 逐点判词（判行原句 ＋ 行号锚）

行号一律指 `testharness/build-logs/attgate-w41-a.out`（A 相）／`attgate-w41-g.out`（G 相）**全档行号**（含 Gradle 前缀行），可用 `Select-String` 直取；时刻为服务端本地时（UTC+8）。

### A 相（`miningReform=true`，boot 12:19:26 → `Done (5.973s)`）

| 点 | 判行原句（原样） | 锚 | 栈真值（bot 面板 `durabilityUsed`） |
| --- | --- | --- | --- |
| a | `[MiningLog] tool decay face=attacking item=minecraft:diamond_sword loss=50 [server]` | `:3187` | 0 → 50 |
| g①（创造） | `[MiningLog] tool decay face=attacking item=minecraft:diamond_sword loss=0 [server]` | `:3206` | 0 → 0 |
| g②（生存） | `[MiningLog] tool decay face=attacking item=minecraft:diamond_sword loss=50 [server]` | `:3213` | 0 → 50（累计 50） |
| e | `[MiningLog] tool decay face=attacking item=minecraft:diamond_sword loss=0 [server]` | `:3234` | 0 → 0（背包差 0） |
| b | `[MiningLog] tool decay face=attacking item=minecraft:iron_pickaxe loss=100 [server]` | `:3257` | 0 → 100 |
| c | `[MiningLog] tool decay face=attacking item=etim:hoe_rusted_iron loss=200 [server]` | `:3275` | 0 → 200 |
| f | `[MiningLog] tool decay face=attacking item=etim:hoe_rusted_iron loss=0 [server]` | `:3294` | 0 → 0（背包差 0） |
| d | `[MiningLog] tool decay face=attacking item=etim:shears_rusted_iron loss=200 [server]` | `:3316` | 0 → 200 |
| j | **（0 条）**；同窗只有 `[TestLog] step=useitem player=ETIM_W41A`（`:3334`）与 `[TestLog] step=hurt player=ETIM_W41A amount=8.000 mob=Pig#2092`（`:3337`），**无 attacking 行、无 `[DamageLog] dmg target=ETIM_W41A src=mob`** | `:3334`／`:3337` | 0 → 0（玩家血 20 → 20） |
| j2 | `[MiningLog] tool decay face=attacking item=minecraft:iron_sword loss=50 [server]` | `:3358` | 0 → 200 |
| j2（中间量） | `[DamageLog] dmg target=ETIM_W41A#765 src=mob raw=8.000 armorIn=4.000 armorOut=4.000 absorption=0.000 final=4.000 [server]` | `:3361` | 玩家血 20 → 16（Δ4＝blocked） |

**逐点判值要点**：

- **a/b/c/d**：生存面每点**恰 1 条**行，`loss` 与栈 Δ **同值**（50／100／200／200），且行内无 `block=` 列 ⇒ 攻击面判行形与 `state=null` 契约一致。
- **e/f**：创造面**恰 1 条 `loss=0`**（反转判点：**0 条即 FAIL**，本窗两点都出了 1 条），栈 Δ0 且**背包快照逐字节相同**（`inventoryStable=true`）⇒ 「行 0 ＋ 栈 0」双零真值成立，排除「行报 0 而栈实磨」的假行。
- **g**：同键同值吞的阳性校验——首击创造（0，行 `:3206`）＋ 切生存再击（50，行 `:3213`）＝**2 条**，栈序列 0 → 50；若把首击放错相位（实测首轮 bug：两点都生存）则两击同为 50、第二行被 `:709-712` 吞掉，**窗口内 0 条**——本点因此同时是 last-sig 的活体证明。
- **h/i**：off 相 handler 首支原调（`MixinItemSword.java:29-33`）⇒ **0 条**；h 栈 Δ1（vanilla `item/ItemSword.java:61` iconst_1）、i 栈 Δ0（vanilla 创造门）⇒ 关相不误伤。
- **j**：0 条**不是**「门生效」，而是事件从未触发（§4 B-1），故不套用 e/f 的反转口径；j2 以同一物品、同一 active 状态、仅差 gamemode 的对照把第 5 调用点拉回可判面。

### G 相（`miningReform=false`，boot 12:20:44 → `Done (1.157s)`）

| 点 | 判行 | 锚 | 栈 Δ |
| --- | --- | --- | --- |
| h | **0 条**（全档 `attgate-w41-g.out` 内 `tool decay` 命中 0） | — | 0 → 1 |
| i | **0 条** | — | 0 → 0（背包差 0） |

## §2 计数总账（写死判，`ok:true`）

| 相 | attacking | shearing | breaking | speed | deny | shear drop | reach denied | 账 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | **9** | 0 | 0 | 0 | 0 | 0 | 0 | `want.attacking=9 / got=9 / ok=true` |
| G | **0** | 0 | 0 | 0 | 0 | 0 | 0 | `want.attacking=0 / got=0 / ok=true` |

A 相 9 条**发行序**（逐条与 §1 表对位，`item:loss`）：

```
minecraft:diamond_sword:50 → minecraft:diamond_sword:0 → minecraft:diamond_sword:50
→ minecraft:diamond_sword:0 → minecraft:iron_pickaxe:100 → etim:hoe_rusted_iron:200
→ etim:hoe_rusted_iron:0 → etim:shears_rusted_iron:200 → minecraft:iron_sword:50
```

> 组成注记：终审十点的理论组成为 a1+b1+c1+d1+e1+f1+g2+**j1**＝9；本窗 j 创造臂结构性 0 条、由**增补控制臂 j2**（1 条 50）补位 ⇒ **条数仍为 9**，但 `iron_sword` 那一格的值是 50 而非 0（j2 生存臂），已在 §0／§1 逐点标明，不掩饰换位。

## §3 起收钉值（全同 ⇒ 零 rebuild）

| 项 | 起窗 | 收窗 | 判 |
| --- | --- | --- | --- |
| HEAD | `526002fef63862beff921e6da26a485f01ae4f5f`（dirty 0） | 同（窗内零提交） | ✓ |
| release jar | 772,793 B｜`39607B4A3669BEE04388184D374704DFC39294DB452A44C033D97AE878F531E8` | 同 | ✓ |
| dev jar | 757,032 B｜`DF92EBF4085E3F8EDAB41A468623CF1F3B50ED9C9578BB540212C669BDC483F5` | 同 | ✓ |
| `run/config/etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | 收窗 byte-identical | ✓ |
| `run/server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 收窗 byte-identical | ✓ |
| refmap（双树 `build/resources/main`＋`build/tmp`） | 62 类键／138 条目（各切片 Sword 4／Tool 4／Shears 3） | 同（两树同值） | ✓ 139/57/11 未出现 |
| `mixins.etim.json` | mixins 56／client 10 | 同 | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` 计数 | 18 | 18 | ✓ |
| Gradle | `> Task :compileJava UP-TO-DATE`、`> Task :jar UP-TO-DATE`（两相均见） | `BUILD SUCCESSFUL`（1m16s／32s） | ✓ 0 rebuild |

> cfg 窗内唯一动作＝G 相把 `B:miningReform=true` 翻 `false`，收窗从快照整档还原（byte-identical 复钉命中）；`B:miningDebugLog=true`（`:363`）与 `B:blockDebugLog=false`（`:11`）**全程未动**。ops.json／usercache.json／usernamecache.json 亦从快照还原并逐字节相同。

## §4 冲突分级（A / B / C）

**A 级 0 条**（无判点 FAIL 需产品码改动）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| B-1 | B | **j 创造臂结构性不可达**：创造玩家 `capabilities.disableDamage` ⇒ `entity/player/EntityPlayer.java:1094-1101` 在 `LivingAttack/LivingHurtEvent` 之前早退 ⇒ `combat/ETIMBlocking.java:116` 的 `onLivingHurt` 永不执行。改前改后行为一致（本批只消结构隐患）。另：`/etest hurt … generic` 的 `GENERIC = setDamageBypassesArmor()` ⇒ `isUnblockable()=true` ⇒ `R196ArmorModel.r196ArmorBypassed`（`combat/R196ArmorModel.java:359-361`）早退，也不能用来开这一臂。 | 判点 j 后置（并入盾/格挡批或恒记盲区）；本窗以 j2 生存臂直证第 5 调用点。**判据通道缺口**：0 条无法区分「门生效」与「事件未触发」，建议下一轮若要把创造臂做成可判点，须先在创造态提供一条**可吃 mundane 伤害**的测试口（工装面，非产品码面）。 |
| B-2 | B | **盾面行值≠实磨（既有语义，非本批引入）**：j2 行报 `loss=50`（系数），实磨 `(int)(blocked×50)=200`；两者的中间量只能从 `[DamageLog] dmg … final=4.000` 取得（`blockDebugLog=false` ⇒ `[BlockLog] wear` 行本窗不发行）。 | 沿用账本 B-3 家族登记；本窗以「行 50 ＋ DamageLog final=4 ＋ 栈 Δ200」三元组对账（`(int)(4.0×50)=200`，逐位相符）。 |
| C-1 | C | **服务端主手栈读数不可用**：1.12 `entitydata` 对玩家直接拒绝（`… is a player and cannot be changed`），对 `{}` 无回显；`/testfor` 的 `{SelectedItem:…}` 也不成立（`EntityPlayer.writeEntityToNBT:1029-1034` 只写 `SelectedItemSlot`＋`Inventory`，无 `SelectedItem` 标签）。 | 栈口径改**双源**：① bot 面板 `heldItem.durabilityUsed`；② 判行 `item=` 字段（服务端发行时读的正是手持真值）。本窗 8 条同物品行与面板 Δ 逐点同值即为互证。 |
| C-2 | C | **未 op 的假人无法解析 `@e` 选择器**：`/etest hurt <mob-selector>` 在服务端线程以**玩家**为 sender 解析，非 op 的 `canUseCommand(1,"@")=false` ⇒ `matchEntities` 恒空（实测 `NO_TARGET`）⇒ 判窗前 `op <bot>` 必须下发（收窗 ops.json 已还原 byte-identical）。 | 工装纪律入模板。 |
| C-3 | C | **PEACEFUL 零化 mob 源伤害**：`util/EntityDamageSource.java:64-67` 的 `isDifficultyScaled()` 对非玩家活体源返回 true ⇒ `entity/player/EntityPlayer.java:1119-1124` 在 `PEACEFUL` 把 amount 归零（本窗首轮 difficulty 0 实测：`step=hurt` 有回执但**零伤害零行**）。 | 盾面臂判窗难度定 **2（normal）**；行伤害量 8 不缩放（EASY 会 `min(a/2+1,a)`）。写进起窗表与模板。 |
| C-4 | C | **mob 源命中给玩家击退**：首轮 3×1 平台下 bot 被击出边沿，落地 `src=fall raw=6.000`（次轮 raw=5.000）污染 `playerHp` 判点；j2 改用 5×5 石墙竞技场（内圈 3×3 空地）后 fall 伤归零。 | 工装纪律：盾面/受击类判点必须带围墙场地；`playerHp` 判点前先落地面复钉（本窗 `posBeforeHit.onGround=true` 逐点记录）。 |
| C-5 | C | **last-sig 攻击键吞行的执行序约束**：键＝`attacking|<item>`，同键同值第二行必吞（`mining/ETIMMining.java:709-712`）。本窗 a→g→e 的次序是唯一能发全 9 条的序（a 先把 `diamond_sword` 置 50，g 首击 0、次击 50，e 再 0）；g 若不放创造首击，两击同为 50 ⇒ 同键同值全吞（实测：0 条、栈 Δ 50+50）。 | 多值同键判点一律「先异值再回值」定序；判点表 SOP 入模板。 |
| C-6 | C | **e/f 与 j 的「0 条」不可混判**：e/f 的 1 条 0 值行＝门在 helper 内生效；j 的 0 条＝事件未触发（B-1）。 | 判词必须区分「0 值行」与「0 条」，本回执 §0／§1 已逐点标出。 |
| C-7 | C | **`etest hold` 的回执只给显示名**（`params=[Rusted Iron Hoe]`），不给 registry name；且 modded 物品在 mineflayer 侧 `name` 可能为 `unknown`。 | 栈身份以判行 `item=<reg>` 为准（服务端真值），回执/面板只作通路旁证。 |
| C-8 | C | **`mine speed`／`mine deny`／`shear drop`／`breaking` 同窗 0 条**：本窗不挖块、不剪毛，故四通道天然零位——只作「无串门」旁证，不作判据。 | 账内如实登记。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | j 点归属 | (a) 并入盾/格挡批再判 ／(b) 恒记盲区（创造态结构性不可达）⇒ 本批以 j2 收位 | **(b)**：创造态无法吃 mundane 伤害是 1.12 结构事实，非本批缺口；j 的「门在 helper 内」已由 e/f 直接证成 |
| D-2 | j2 控制臂是否入模板 | (a) 入「第 5 调用点」标准臂（盾面批/后续回归复用） ／(b) 只作本批一次性控制 | **(a)**：三行证据（行 50＋DamageLog final=4＋栈 Δ200）稳定可复用 |
| D-3 | 三条工装纪律是否入模板 | op 假人（C-2）／难度 2（C-3）／围墙竞技场（C-4） | **全入**：首轮三条都实际造成过假失败/污染 |
| D-4 | B-2 盾面行义 | (a) 维持「行＝系数、实磨＝blocked×系数」 ／(b) 后续批把 blocked 并入行 | **(a) 维持**：行形零改是本批契约；对账靠 DamageLog 中间量 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 客户端 | **本窗零客户端**（无 obf client 启动、无窗口需关） |
| 服务端 A 相 | `Stopping the server` 12:20:32 → `Saving worlds` → 进程退出 → `BUILD SUCCESSFUL in 1m 16s`（exit 0） |
| 服务端 G 相 | `Stopping the server` 12:21:06 → `Saving worlds` → `BUILD SUCCESSFUL in 32s`（exit 0） |
| 端口 | 25565＝0（起窗 0，收窗 0）、25575 未用（本窗全走 stdin 控制台，不碰 RCON） |
| 崩溃 | `run/crash-reports` 计数 18 → 18（无新增） |
| cfg/props/ops/usercache/usernamecache | 五项 byte-identical 复钉命中（见 §3） |
| 世界 | `run/attgatew41` 已删（`worldDirRemoved=true`）；`run/attgatediag`（诊断窗）同删 |
| rebuild | **0**（两相 `:jar UP-TO-DATE`；jar 字节/SHA 起收同值） |
| 产品码 | 0 行改动（`git status --porcelain` 空；HEAD 未动） |

## §7 工装与复跑

- **判窗驱动**：`testharness/player/attgate-w41.js`
  - 冒烟开关：`W41_ONLY=W-41a,W-41e`（点裁剪）、`W41_PHASES=a`（相裁剪）。
  - 攻击原语：`bot.attack(entity)` → 1.12 `use_entity mouse=1`（真实挥击路径，`entities.js:843-856`＋`:922-927`），瞄准**实体体心**（猪高 0.9 ⇒ `y+0.45`）。
  - 格挡原语：`/etest useitem`（`TestDriver.java:126-131` → `processTryUseItem` → `MixinItem.etim$startBlocking` `:167-183` 置 active）＋`/etest hurt @e[type=pig,r=6,c=1] 8`（mob 源，`TestDriver.java:165-185`）。
  - 场地：5×5 石墙竞技场（内圈 3×3 空地、地板 by-1）＋判点前落地面复钉。
  - 钉值门：HEAD/jar/cfg/props/MK 任一不符即拒跑；`139/57/11` 出现即停窗。
- **通道诊断（C 级工装，非判据）**：`testharness/player/attgate-w41-diag.js`，矩阵落 `testharness/build-logs/attgate-w41-diag2-matrix.json`（①difficulty 2＋useitem＋mob 源 → 行 50＋`final=4`；③同条件 `generic` 源 → `raw=8 final=8` 无行，证 unblockable 早退）。
- **证据卷**（`testharness/build-logs/`）：`attgate-w41-a.out`（487,789 B）／`attgate-w41-g.out`（106,936 B）／`attgate-w41-a-server-latest.log`（471,874 B）／`attgate-w41-g-server-latest.log`（88,699 B）／`attgate-w41-evidence.json`（48,242 B）／`attgate-w41-driver.log`（68,930 B）／起点快照五件（cfg＋props＋ops＋usercache＋usernamecache）。调参迭代窗（smoke1…8、diag 首轮）已清理，可由驱动 `W41_ONLY/W41_PHASES` 复现。
- **复跑命令**（仓根 `git-workspace/etim`）：

```powershell
node testharness\player\attgate-w41.js attgate-w41                 # 全窗（A+G）
$env:W41_ONLY='W-41a,W-41e'; $env:W41_PHASES='a'; node testharness\player\attgate-w41.js smoke   # 冒烟
```

- **判行复核（可粘贴，行号现行）**：

```powershell
Select-String -Path testharness\build-logs\attgate-w41-a.out -Pattern '\[MiningLog\] tool decay face=attacking'
Select-String -Path testharness\build-logs\attgate-w41-g.out -Pattern '\[MiningLog\] tool decay'
Select-String -Path testharness\build-logs\attgate-w41-a.out -Pattern 'src=mob raw=8.000'
Select-String -Path git-workspace\etim\src\main\java\io\github\etim\etim\mining\ETIMMining.java -Pattern 'getToolDecayFromAttackingEntity|logToolDecay\("attacking"'
```

## §8 未覆盖面（不补白）

1. **j 创造臂**：结构性不可达（B-1），无窗可测；如需可判，须先加工装端口（创造态可吃伤害）。
2. **极端值面**：`warhammer 66`／`battleaxe 75`／`hatchet 133`／`scythe 400` 未入窗（终审 D-5(a) 十点不含，D-5 备选已登记）。
3. **工具 off 相 vanilla 值 2**（`item/ItemTool.java:73`）未入窗（摸底 B-6 已登记）。
4. **unbreaking 减免**：本窗全裸栈，行值＝名义衰减；有附魔时行值≠实磨（摸底 B-1 家族）。

## §9 自报（机械核讫）

> 文件：`testharness/reports/attgate-W41-verdict.md`｜**19,167 B**｜175 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`F9E8A404855F7D60DB0842C855E419A87E1C0D518C527E6972E417F57F6AEC16`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`DFFB299F511E6A834DEBD9833B9CEF2E922BEB770616E63582FCBC952D1C2B1B`
> 判点 11（终审十点 ＋ j2 控制臂）｜✓ 10 / ✗ 1（j 条件未达，B-1）｜账 A `attacking=9 ok:true`／G `attacking=0 ok:true`｜冲突 A0 B2 C8｜待裁 D-4
