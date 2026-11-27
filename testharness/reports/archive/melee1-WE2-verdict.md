# melee1 批（B2 三条：stun / vampiric / disarming）· W-E2 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-02（CST）｜**窗口形态**：**3 boot**（预飞=T-CFG 首启面／主窗=T1..T9／T10 补窗=同 HEAD 同钉值下重排的 mob 面）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`25,529 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 48 / ✗ 2｜220 行`
> **判决源**：audit20 **条 249**（批成立）／melee1-对照报告 **faces=10**（会话六）／**条 250**（D 位六问，用户「全按建议」）／**条 251**（终审放行 T-1..T-5）／**条 252**（落码 `e284a0d`）
> **落码 commit**：**`e284a0d`**（父 `dcb4d43`）｜窗内零提交、零产品码；树起收 **只增本窗 testharness 件**
> **判决**：**PASS** —— **faces=10（T1..T9 + T-CFG）＋1 补窗面（T10）｜checked=11｜pass=11｜fail=0**；**A 0／B 3／C 7**
> **一句话**：三条附魔全部按 R196 面落地——载体门 12 臂正反全对、案 M 窗口 diff15/20/10 逐字全等、stun 与 vampiric 的 N=200×5 频率窗全部落在二项 3σ 带内且 amp=6L／dur=50L 逐级全对、亡灵门 vampire 0 行 / stun 50 行、镰 vampiric 磨损 400⇄100 交替、缴械 L5 必中＋L1 双支、40t 锁以「锁中 held=none ⇔ 锁后回拾 held=iron_sword」闭合、mob 侧 stun/vampiric 双面均由 mob 自身持械打出（补窗）。三处 B：T4 位移观测无现成报文（改 amp 列为主锚）、T10 需补窗、T9 的 NBT 数值面 1.12 无读命令。

## §0 判定总表（十一点）

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **T1** 载体门 12 臂 | `-session-1.out:4108/4158/4207/4558/4607/4659/4708/4887/4936/4985/5073/5151`（probe 起点）＋ `:4138-4140` 等 reg 行 | war_hammer→stun 真；iron_pickaxe→全假；iron_sword→vampiric 真＋disarming 真；dagger→vampiric 真／disarming 假；silver/mithril 六臂→vampiric 假；scythe_copper→vampiric 真 | 12 臂逐项命中（`gateOk` 12/12）；reg 行 **41**（38＋3 新）；`etim:stun id=26`／`etim:vampiric id=27`／`etim:disarming id=28` | ✓（附 C-1） |
| **T2** 案 M 窗口 | `:4138-4140`（首臂三条新）＋同段 enchant1 五条 | stun（diff15）`L1=6/20 … L5=66/999`；vampiric（diff20）`L1=11/30 … L5=91/999`；disarming（diff10）`L1=1/10 … L5=41/999`；enchant1 五条窗不变 | 12 臂 × 三条 = **36 组窗口逐字全等**（`windowsOk` true）；enchant1 五条照读全等（`enchant1Ok` true） | ✓ |
| **T3** stun 频率窗 | `:5518-8305`（L1 200 行）／`:8392-11131`（L2 197）／`:11223-13946`（L3 200）／`:14030-16674`（L4 200）／`:16765-19422`（L5 200） | N≈200，P=L/10，±3σ；fail 行同打（`amp=0 dur=0`） | L1 23/200=0.115（带 [0.0364,0.1636]）／L2 38/197=0.1929（[0.1151,0.2849]）／L3 59/200=0.295（[0.2028,0.3972]）／L4 71/200=0.355（[0.2961,0.5039]）／L5 96/200=0.48（[0.3939,0.6061]）；**行数=落刀数**（逐级相等） | ✓（附 C-2/C-8） |
| **T4** 减速出口 | `:16765-19422` 的 `amp` 列（全级）＋ `:19458` 位移观测起 | amp=6×L、dur=50×L；L1 即定身 | amp 列 **6/12/18/24/30**（五级各唯一）、dur **50/100/150/200/250**；位移观测：命中前 6.08→5.98（逼近），命中后 **4.33→4.34 冻结**（3.3 s 内 Δ=−0.01） | ✓（附 B-1） |
| **T5** vampiric 频率窗 | `:19751-22341`（L1 200）／`:22561-25154`（L2 200）／`:25309-27894`（L3 200）／`:28045-30625`（L4 200）／`:30779-33359`（L5 200） | N=200，P=L/10，±3σ；transfer ≤ max(1, ⌊dmg×0.5⌋) 且 ≥1 | 21/200=0.105／35/200=0.175／51/200=0.255／84/200=0.42／96/200=0.48——**五级全在带内**；transfer 全 1..1（dmg 1.69–8.0 ⇒ ⌊dmg×0.5⌋≤4，min 钳位取 1），**overCap 0 / underMin 0**；hp 回升逐级 15/30/46/65/65 次 | ✓ |
| **T6** 亡灵负证 | `:33522`（t6 zombie 环起）＋该段 `stun lvl=5` 50 行 | 打僵尸：vampiric 行 **0**；stun 行仍出 | vampiric 臂 hits=50 → **vampRows=0**、stunRows=0；stun 臂 hits=50 → **stunRows=50**（stun 无亡灵门） | ✓ |
| **T7** 镰磨损 | `:35045/35061/35075/35090/35105/35185/35199/35217/35233/35252` | 有 vampiric `loss=100` ⇔ 无 `loss=400`（交替各 5 刀） | 十行逐刀交替：**[400,100,400,100,400,100,400,100,400,100]** | ✓ |
| **T8** 缴械清手 | `:35345`（L5）／`:35592` 起（L1 20 行） | L5（P=1.0）必中：`held=<item> dropped=true cleared=true lock=40`；L1（P=0.2）双支同打 | L5：`roll=0.513 held=minecraft:iron_sword dropped=true cleared=true lock=40`；L1：20 攻 → 1 drop / 19 fail（0.05，带 [0,0.468] 内），`dropped=false` 行带 roll（0.953/0.278/…） | ✓（附 C-5） |
| **T9** 40t 锁＋持窗 | `:35355`（受控投件）／`:35364`（锁中）／`:35455`（锁后） | 锁中不可回拾；锁后回拾成立 | 锁中（≈t+27t）再攻：`disarm lvl=5 held=none dropped=false`；锁后（≈t+75t）再攻：`disarm lvl=5 roll=0.190 held=minecraft:iron_sword dropped=true`（回拾后再缴） | ✓（附 B-3/C-3） |
| **T10** mob 侧正证（补窗） | `-t10.out:3541/4118/4381/4731/4941`（stun）／`:3545…4957`（vampiric） | mob 持 stun 锤 → 目标被定身（amp30/dur250）；mob 持 vampiric → mob hp 回升 | stun **4 行**（pass 2：`amp=30 dur=250`；fail 2：`amp=0`）；vampiric **11 行**（pass 9／fail 2），`dmg=12` 恒定、`transfer 1..5`、**hp 8→10→15→14→15→18→21→19→22→26**；`playerMeleeRows=0`（全部 mob 面） | ✓（附 B-2） |
| **T-CFG** 14 键首启 | `-preflight.out`（boot 后 cfg 快照 `melee1-we2-preflight-cfg.afterboot`） | 14 键全落、值符默认、size 增大 | **32,095 B/166 键 → 38,271 B/199 键**（+6,176 B，+33 键＝17 上批＋14 本批＋2 说明行）；`stunDifficulty 15／vampiricDifficulty 20／disarmingDifficulty 10／三 maxLevel 5／stunChanceDivisor 10／stunDurationPerLevel 50／stunAmplifierPerLevel 6／vampiricChanceDivisor 10／vampiricTransferFactor 0.5／vampiricMinTransfer 1／disarmLockTicks 40／meleeDebugLog false` 全对 | ✓（附 C-7） |

## §1 T1 · 载体门（12 臂）

`/etest enchantprobe mainhand pool` 的 `reg` 行 `table=` 列＝`canApplyAtEnchantingTable` 现体判决；`reg` 行总数 **41**（enchant1 后 38 ＋ 本批 3）。运行时 id：**stun 26／vampiric 27／disarming 28**（`[EtimInit] enchantetim:speed ids=14 15 23 24 25 26 27 28`）。

| 臂 | 件 | stun | vampiric | disarming | 判 |
| --- | --- | --- | --- | --- | --- |
| 1 | `etim:war_hammer_copper` | **true** | false | false | ✓ |
| 2 | `minecraft:iron_pickaxe` | false | false | false | ✓ |
| 3 | `minecraft:iron_sword` | false | **true** | **true** | ✓ |
| 4 | `etim:dagger_copper` | false | **true** | **false** | ✓ |
| 5 | `etim:sword_silver` | false | **false** | true | ✓ |
| 6 | `etim:dagger_silver` | false | **false** | false | ✓ |
| 7 | `etim:scythe_silver` | false | **false** | false | ✓ |
| 8 | `etim:sword_mithril` | false | **false** | true | ✓ |
| 9 | `etim:dagger_mithril` | false | **false** | false | ✓ |
| 10 | `etim:scythe_mithril` | false | **false** | false | ✓ |
| 11 | `etim:scythe_copper` | false | **true** | false | ✓ |
| 12 | `etim:sword_copper` | false | **true** | **true** | ✓ |

- **stun 载体**：`instanceof ETIMItemWarHammer`——R196 的 `ItemCudgel ∨ ItemWarHammer` 只收后半（C-2 无 cudgel 类）。
- **vampiric 载体**：`ItemSword ∨ ETIMItemScythe`，且 `ETIMMetalGear.etimMetal()` 读到的**银/秘银工具材**排除（六臂全假）；dagger 走 `extends ETIMItemSword` ⇒ 真。
- **disarming 载体**：`getClass() == ItemSword.class ∨ == ETIMItemSword.class`——dagger（`ETIMItemDagger`）被 exact 门排除（臂 4/6/9 假）；vanilla 剑与 ETIM 裸剑类（`ETIMItemSword` 本体）两端皆真（臂 3/8/12）。臂 5/8 的 disarming=true 是**代码设计**（ETIMItemSword 本体纳入），非越界；任务书只约定 vampiric 假。

## §2 T2 · 案 M 窗口（复算逐字）

`ETIMMiteEnchantment`：`min(L)=max(diff−10,0)+diff×(L−1)+1`、`max(L)=min(L+1)−1`、末级 999。

- diff15（stun）＝ `L1=6/20 L2=21/35 L3=36/50 L4=51/65 L5=66/999`
- diff20（vampiric）＝ `L1=11/30 L2=31/50 L3=51/70 L4=71/90 L5=91/999`
- diff10（disarming）＝ `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999`

12 臂 × 3 条 = **36 组窗口逐字相等**；enchant1 五条（speed/regeneration/poison/true_flight/quickness）在同批 60 组照读全等 ⇒ 前批窗口零回归。
**未判**：任务书「30 预算达级」（stun 达 L2／vampiric 仅 L1／disarming 达 L3）属 pool 抽样分布面——沿 W63 终审不判，本窗只记 pool 行（如 bow 臂 `4→4/9→5/30→8`）作信息位（§15）。

## §3 T3 · stun 频率窗（N=200 × L1..L5）

产品面（`ETIMMelee.applyStun`）：`roll = random()×stunChanceDivisor`，`level > roll` 才生效；生效行 `amp=6L dur=50L`，未生效行 `amp=0 dur=0`（**双支同打**）。

| L | 落刀 | 行数 | pass | 率 | 3σ 带 | 判 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 200 | 200 | 23 | 0.1150 | [0.0364, 0.1636] | ✓ |
| 2 | 197 | 197 | 38 | 0.1929 | [0.1151, 0.2849] | ✓ |
| 3 | 200 | 200 | 59 | 0.2950 | [0.2028, 0.3972] | ✓ |
| 4 | 200 | 200 | 71 | 0.3550 | [0.2961, 0.5039] | ✓ |
| 5 | 200 | 200 | 96 | 0.4800 | [0.3939, 0.6061] | ✓ |

- **行数=落刀数**逐级相等（L2 197/197）⇒「失败行同打」成立；未落的 3 刀是 1.12 受击无敌窗（10t）内被拒，非静默。
- `need` 列＝L、`roll` 列∈[0,10)，样本首值 L1 5.882／L2 1.710／L3 5.259／L4 7.452／L5 5.232（非播种，B-4）。

## §4 T4 · 减速出口（amp 属性列 + 位移观测）

- **主锚**：五级 `amp` 列唯一值 **6/12/18/24/30**（=6×L，D-1 裁定口），`dur` **50/100/150/200/250**（=50×L）。L1 即 amp 6 ⇒ 1.12 slowness 的 MULTIPLY_TOTAL ×(1−0.15×(amp+1))＝×(1−1.05) 越过 0 轴，出生即定身（与 R196 全麻痹出口同感知面）。
- **辅助位移观测**（僵尸追击，bot 侧实体追踪采样，1.4s 间隔）：命中前 `6.08 → 6.42 → 7.02 → 5.98`（有逼近/绕行），stun 命中后 `4.33 → 4.34 → 4.34 → 4.34`（3.3 s 内 Δ=**−0.01**，冻结）。见 `evidence.t4.walk`。
- **B-1**：任务书设想的「[AILog] 移位行 / byte velocity 观测报文」现体不存在；本窗主判据仍是 amp 列（确定性），位移采样为辅助证据（客户端网络位置，非渲染面）。

## §5 T5 · vampiric 频率窗（N=200 × L1..L5）

产品面（`ETIMMelee.applyVampiric`）：`gateRoll = random()×vampiricChanceDivisor`，`gateRoll > level` ⇒ 0（行 `transfer=0`）；否则 `transfer = (int)(dmg×0.5×random())`，`< vampiricMinTransfer` 抬到 1，`attacker.heal(transfer)`，行带 `hp=`（heal **后**值）。

| L | 落刀 | 行数 | pass | fail | 率 | 3σ 带 | transfer | hp 回升次数 | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 200 | 200 | 21 | 179 | 0.1050 | [0.0364, 0.1636] | 1..1 | 15 | ✓ |
| 2 | 200 | 200 | 35 | 165 | 0.1750 | [0.1151, 0.2849] | 1..1 | 30 | ✓ |
| 3 | 200 | 200 | 51 | 149 | 0.2550 | [0.2028, 0.3972] | 1..1 | 46 | ✓ |
| 4 | 200 | 200 | 84 | 116 | 0.4200 | [0.2961, 0.5039] | 1..1 | 65 | ✓ |
| 5 | 200 | 200 | 96 | 104 | 0.4800 | [0.3939, 0.6061] | 1..1 | 65 | ✓ |

- **对账两端**：`transfer ≤ max(1, ⌊dmg×0.5⌋)` 违例 **0**、`transfer ≥ 1` 违例 **0**（本批 dmg 观测 1.692–8.0，⌊dmg×0.5⌋ 最高 4，min=1 钳位是产品语义）。
- **hp 列回升**：bot 每 3 s 被压回 6（`etest food 0 0` 关掉 ETIM 回血支），pass 行 hp 逐段回升 ⇒ 回复真实入账（非文本回显）。

## §6 T6 · 亡灵负证（zombie 50 刀）

| 臂 | 持械 | 落刀 | vampiric 行 | stun 行 | 判 |
| --- | --- | --- | --- | --- | --- |
| a | `etim:sword_copper {vampiric 5}` | 50 | **0** | 0 | ✓（`isEntityUndead` 门在 `applyVampiric` 首行） |
| b | `etim:war_hammer_copper {stun 5}` | 50 | 0 | **50** | ✓（stun 无亡灵门，R196 同谱） |

注：`applyVampiric` 的亡灵门在**打行之前**返 ⇒ 亡灵面「零行」是设计行为（不是日志缺失）；同段 `[MeleeLog] melee … lvl_vamp=5 harmed=true` 摘要行仍逐刀在场。

## §7 T7 · 镰磨损（vampiric 分支转正）

`ETIMMining.getBaseDecayForAttackingEntity`：`ETIMItemScythe` 且持件 vampiric>0 ⇒ base **1.0**（loss 100）；否则 base **4.0**（loss 400）。`[MiningLog] tool decay` 按 `face|item` 去重、值变才打 ⇒ 交替十刀得十行：

`400 → 100 → 400 → 100 → 400 → 100 → 400 → 100 → 400 → 100`（`:35045…:35252`）✓
（R196 `ItemScythe:32-34` 的 vampiric 分支由 C-4 死枝转正；sharpness 分支仍死，C-7 的 2.0 vs 4.0 差保持。）

## §8 T8 · 缴械清手

- **L5 臂（P = 5/5 = 1.0）**：持 `etim:sword_copper {disarming 5}` 打持 `minecraft:iron_sword` 的 NoAI 僵尸
  `:35345 [MeleeLog] disarm lvl=5 roll=0.513 held=minecraft:iron_sword dropped=true cleared=true lock=40`（`dropped`＋`cleared`＋`lock=40` 三面齐）。
- **L1 臂（P = 1/5 = 0.2，分母复用 `disarmingMaxLevel`）**：20 个持械僵尸各 1 刀 ⇒ 20 行，**1 drop / 19 fail**（0.05；n=20 的 3σ 带 [0, 0.468] 内），fail 行带 `roll`（0.953/0.278/0.635/…）⇒ 双支同打成立。
- 清手面：drop 后 `setItemStackToSlot(MAINHAND, EMPTY)`——由 §9 的 `held=none` 行二次证实。

## §9 T9 · 40t 锁与持窗（行为链）

1.12 **无 NBT 读命令**（`/entitydata` 是写命令，`/data` 是 1.13+），故以「**受控投件 + held 面行为链**」判：

| 步 | 时刻 | 动作 | 行 | 判读 |
| --- | --- | --- | --- | --- |
| ① | t0 | L5 缴械 | `:35345 … dropped=true cleared=true lock=40` | 锁置 40 |
| ② | t0+ | `execute @e[tag=dzz] ~ ~ ~ summon item ~ ~ ~ {Item:iron_sword,PickupDelay:0s}`（`:35355`） | — | 把剑精确投在僵尸**脚下**（原生 `entityDropItem` 带随机位移，首轮实测落在 1.0 拾取盒外 ⇒ C-3） |
| ③ | ≈t+27t | 再攻（锁内） | `:35364 disarm lvl=5 held=none dropped=false` | **锁挡住回拾**（`canPickUpLoot()` 被 mixin 顶成 false） |
| ④ | ≈t+75t | 再攻（锁后） | `:35455 disarm lvl=5 roll=0.190 held=minecraft:iron_sword dropped=true` | **锁解除后回拾成立**（拾取环真跑，③ 的「不拾」由锁造成而非死环） |

字节码面（§12）：`EntityLiving` 的 `onLivingUpdate(TAIL)` 递减、`writeEntityToNBT/readEntityFromNBT` 写读 `ETIMDisarmTicks`、`canPickUpLoot(HEAD,cancellable)` 门——四注入口全在。
**B-3**：任务书要的「NBT 键值直读」在 1.12 无通道；若封批必须直读数值，须落产品 dev 行（另起修复批）。本窗判据为「行为链 + 字节码」，均由日志/字节收。

## §10 T10 · mob 侧正证（补窗，同 HEAD 同钉值）

主窗内 mob 攻击面稀疏（3 只一轮：stun 9 行／vampiric 0 行），按**隔离探针已验证的 6 只环阵**重排本判点（C-4/B-2）。补窗 `melee1-we2-t10`：

- **T10a（mob 持 stun 锤）**：4 行，其中 2 行 `amp=30 dur=250`（L5 生效）、2 行 `amp=0`（roll 失败同打，2.846/9.966/4.314/6.807）。
- **T10b（mob 持 vampiric 剑）**：11 行，`dmg=12` 恒定、pass 9／fail 2、`transfer 1..5`、**hp 列 8→10→15→14→15→18→21→19→22→26**（mob 自身 hp 从 NBT 的 8 点被吸回来）。
- **归属**：`playerMeleeRows=0`（该段 bot 未攻击）⇒ 全部行来自 `MixinEntityMobMelee` 的 mob 侧。

## §11 T-CFG · 14 键首启（预飞 boot）

- **起值**：`run/config/etim.cfg` = **32,095 B / 166 键**（`E07CAC1E…AE7F5`，enchant1 收口回填态——**不是**任务书写的 35,413；C-7）。
- **首启后**：**38,271 B / 199 键**（+6,176 B）：本批 14 键 + 上批 17 键（enchant1 的 17 键在上一窗收口时被回填掉，故本窗首启一并重落）+ 2 行说明。
- **14 键值**（`-preflight-cfg.afterboot`）：`stunDifficulty=15`／`vampiricDifficulty=20`／`disarmingDifficulty=10`／`stunMaxLevel=5`／`vampiricMaxLevel=5`／`disarmingMaxLevel=5`／`stunChanceDivisor=10`／`stunDurationPerLevel=50`／`stunAmplifierPerLevel=6`／`vampiricChanceDivisor=10`／`vampiricTransferFactor=0.5`／`vampiricMinTransfer=1`／`disarmLockTicks=40`／`meleeDebugLog=false`——**14/14 与代码默认逐一相等**。
- 键 9＝6（`stunAmplifierPerLevel`）、键 12＝0.5（`vampiricTransferFactor`）、键 14＝false（`meleeDebugLog`）——任务书指定三项命中。
- **收窗**：回填到本窗起值 **38,271 B `D81CC6E9…6D042`**（`sameAsStart` true）；obf 侧 30,524 `262BFF5E…C9AD` 零客户端未重写（起收同值）。

## §12 字节码亲锤（transform 后类 · `run/.mixin.out` 本窗导出）

| 类 | bytes | sha256（前 16） | 亲锤结论 |
| --- | --- | --- | --- |
| `EntityPlayer` | 76,357 | `0544421BF5255DB9` | `attackTargetEntityWithCurrentItem` 偏移 492 调 `redirect$zde000$etim$meleeHook`；handler 体：`isRemote` 门 → `applyDisarming`（**在**主 `attackEntityFrom` 之前）→ `attackEntityFrom` → `harmed` 门内 `applyStun`＋`applyVampiric` → 三个 `getEnchantmentLevel` + `getHeldItemMainhand` |
| `EntityMob` | 8,828 | `551BEB33AEA65D94` | `attackEntityAsMob` 调 `redirect$…$mobMeleeHook`；handler 体 `applyStun`＋`applyVampiric`，**无** `applyDisarming`（R196 operator 面 player-only，C-1） |
| `EntityLiving` | 42,988 | `AD9ACC79C8EAF753` | `onLivingUpdate` TAIL 调 `handler$zdg000$etim$disarmTickDecrement`；`writeEntityToNBT`／`readEntityFromNBT` 调 `disarmWriteNBT`／`disarmReadNBT`；`canPickUpLoot(HEAD)` 被 `disarmPickupGate` 接管，handler 体 `getDisarmTicks > 0 ⇒ setReturnValue(false)` |

## §13 冲突分级（A 0／B 3／C 7）

### B 级（必送裁，影响封批口径，不阻塞修复）

- **B-1（T4 位移观测无现成报文）**：任务书设想「byte velocity 观测或 [AILog] 移位行」——现体两者皆无。本窗以 **(a) stun 行 amp 列（6×L 五级全对）为主锚**，**(b) bot 侧实体追踪位移采样为辅助**（命中前有逼近、命中后 3.3 s Δ=−0.01）。若须服务端日志级的位移判据，须加产品行（另起批）。
- **B-2（T10 走补窗）**：主窗 3 只一轮时 mob 攻击触发率不稳（stun 9／vampiric 0），T10 由**同 HEAD 同钉值的补窗**（6 只环阵）判；证据分两档（`melee1-we2-evidence.json` ＋ `melee1-we2-t10-evidence.json`）。
- **B-3（T9 的 NBT 数值面不可直读）**：1.12 只有 `/entitydata`（写），无读命令 ⇒ 「NBT 持窗」以行为链（锁中 held=none ⇔ 锁后回拾）+ 四注入口字节码判。若封批要直读 `ETIMDisarmTicks` 数值，须落 dev 行（另起批）。

### C 级（登记不阻塞）

- **C-1（注册名照实）**：任务书写 `etim:warhammer_copper`，实名为 **`etim:war_hammer_copper`**（`ETIMGear:74`）；`dagger_*`／`scythe_*`／`sword_*` 同族命名照实执行。
- **C-2（频率窗落刀数）**：T3 L2 落刀 197（3 刀被 10t 受击无敌窗拒）、T5 全 200；两窗「行数=落刀数」逐级相等，未落刀属 1.12 攻击节律，非产品面。
- **C-3（T9 受控投件）**：原生 `entityDropItem` 的掉落带随机位移，首轮实测落在 grow(1.0) 拾取盒外（endOk=false）⇒ 改 `execute … summon item ~ ~ ~`（PickupDelay 0）在僵尸脚下精确投件。工装口径。
- **C-4（T10 AI 稀疏）**：mob 侧每刀必然打行（主窗 stun 段 5 次命中 → 5 行，逐次对应），稀疏在**攻击触发率**而非日志丢失；补窗用 6 只环阵把触发面拉起来。
- **C-5（T8 L1 点估计离散）**：本窗 1/20=0.05；三窗观测 8/20、4/20、1/20（合并 13/60=**0.217**，与 P=0.2 相符）——单窗点估计属概率面，判窗以「3σ 带内 + 双支均现」为准。
- **C-6（编号冲突）**：任务书两处都写 T8（缴械清手 / cfg 14 键），本回执把 cfg 面记为 **T-CFG**。
- **C-7（cfg 起值口径）**：起值实为 **32,095 B/166 键**（enchant1 收口回填态），非任务书 35,413；首启后 38,271 B/199 键（14 本批 + 17 上批重落）。**收窗回填到 38,271（本窗起值），未回退 32,095**——若主会话要求回退到 32,095 钉值，需另下一道收口指令（本窗不再动文件）。

## §14 钉值 / MK / 收口

| 面 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `e284a0d`（`e284a0d2da063c37ff9e4d5a2549a010a02bcb57`） | 同（窗内零提交） | ✓ |
| release jar | 850,509 B `4C02B995…12DDC7` | 同 | ✓ |
| dev jar | 833,524 B `45F6B958…4BD2B3` | 同 | ✓ |
| sources jar | 779,491 B `08958D18…15D1DC` | 同 | ✓ |
| refmap 双树 | 67 类键／151 条目（`build/resources/main` ↔ `build/tmp` 同值）；双端计法 151×2=**302 面**；切片 meleePlayer 2／meleeMob 2／disarm 4／container 3／arrow 2／bow 2 | 同 | ✓（C-9） |
| mixins 清单 | 61／client 10（＋3：MixinEntityPlayerMelee／MixinEntityMobMelee／MixinEntityLivingDisarm） | 同 | ✓ |
| cfg（dev） | 32,095 `E07CAC1E…AE7F5`（166 键） | 首启 38,271（199 键）→ 回填 **38,271 `D81CC6E9…6D042`** | ✓（C-7） |
| cfg（obf） | 30,524 `262BFF5E…C9AD` | 同（零客户端未重写） | ✓ |
| server.properties | 890 `3009633863…654A48` | 同（回填 identical） | ✓ |

| 收口面 | 状态 |
| --- | --- |
| boot 计数 | 判据 **3**：预飞（`Done 6.579s`）／主窗（`Done 6.692s` @19:02:35, idx 2275）／T10 补窗（`Done` @19:11:38） |
| 客户端 | **零会话**（未拉起、未截屏、未抢焦点） |
| rebuild | **0**（jar 三件起收同值；主窗 `:compileJava/:classes/:jar` 三件 UP-TO-DATE） |
| 产品码 | **0 行**（窗内零提交；驱动/证据/日志全落 `testharness/**`） |
| 场地 | 出生点基准石台 11×11＋4 格空腔；假人 `physics.enabled=false`，`/tp` 带 yaw/pitch 定朝向（服务端 reach 校验按视轴判，见 C-10 附注） |
| 进程/端口 | 端口 25565 收 **0**；crash-reports 19＝19（零新增）；`stop` exitCode 0 |
| 门控 | `meleeDebugLog` false→true（判据窗）；`miningDebugLog` 起 true（T7）；`arrowDebugLog`／`foodDebugLog` 未动；收窗随 cfg 回填 |
| 判据档 | `build-logs/melee1-we2-evidence.json`（36,578 B）／`-session-1.out`（主窗全日志）／`-judgment.log`（149 行）／`-driver.log`／`melee1-we2-t10-evidence.json`（4,585 B）／`-t10.out`／`melee1-we2-preflight-evidence.json`＋`-preflight.out` |

> **C-9 附注**：MK 探针自设 `ok=false` 是把「302 面双端计法」当单树条目数所致（实际单树 151 条），以数值为准。
> **C-10 附注（工装关键发现）**：ETIM 服务端 reach 校验（`ETIMReachEvents.onAttackEntity`，melee 2.25＋tol 0.25，按「眼→扩展 hitbox 的视轴入点」）会让**不对准目标的 ATTACK 包全部作废**（日志 `reach denied: etim.reach.deny_attack <MAX_VALUE> > 2.25`）。首轮全窗零行即此因；本窗每刀先 `/tp <bot> x y z <yaw> <pitch>` 定朝向，并把环阵半径收到 **2.2**。后续任何近战判窗都必须带这一步。

## §15 未覆盖面（不补白）

1. **权重分布／sampling**：单点窗不判（W63 终审裁定沿用）；T2 的「30 预算达级」由此不入判。
2. **pool size 分布面**：只作信息位（`[EnchantLog] pool slot/budget/size`）。
3. **纯客户端面**：击晕的 HUD/动作观感、缴械的动画反馈——按纪律转用户操作/另窗。
4. **PvP 缴械**：R196 两代皆无（C-1 设计面），不判。
5. **cfg 双端 byte-identical**：两文件本非同源（166/199 vs 172 键），只判「各自起收 identical」（前批 B-2 口径沿用）。

## §16 自报（机械核讫）

> 文件：`testharness/reports/melee1-WE2-verdict.md`｜字节五项：size 25,529 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 219（split 行数 220）
> 三口径（家族同型：enchant1-WE1／enchantpool-W63b／metgear-W62b）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序换行连接后再 SHA-256）。
> SHA-256 甲（全档零位）`91A9F49D9F8A697D8272458AE50156F99CE6109A7D8F8FE8412120B715D2210D`
> SHA-256 乙（LF 归零零位）`91A9F49D9F8A697D8272458AE50156F99CE6109A7D8F8FE8412120B715D2210D`
> SHA-256 丙（行链零位）`91B8B1CA7883160BD0B4244EEEC7F45C9849D43717AF823EF5E7D86E8D4AEAD4`
> 判格 11＝✓ 11／零失效｜锚：T1 12 probe 起点 ＋ reg 41 行／T2 36 组窗／T3 `:5518-19422`（5 级）／T4 amp 列 ＋ `:19458`／T5 `:19751-33359`（5 级）／T6 `:33522` 段／T7 `:35045-35252`（10 行）／T8 `:35345` ＋ `:35592…`（20 行）／T9 `:35345/:35355/:35364/:35455`／T10 补窗 `-t10.out:3541…4957`｜钉值：3 boot／0 rebuild／0 客户端／0 产品码｜冲突 A0 B3 C7。
> 注：本档首行「报告字节规格」里的 ✓/✗ 计数是**全档判据符的机械计数**（工具口径），判格以本行的十一行四值为准。
