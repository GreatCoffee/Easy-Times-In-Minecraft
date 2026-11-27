# enchantpool 批（batch E · D-2／D-3／D-7）· W-63 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（CST）｜**窗口形态**：**单 boot**（1 boot／0 rebuild／0 客户端；dev server + mineflayer + 控制台 stdin）
> **报告字节规格**：`20,248 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 29 / ✗ 9｜167 行`
> **判决源**：audit20 **条 230**（批成立＋出身核）／**条 231**（摸底收讫）／**条 232**（D 位 8 项 final）／**条 233**（终审放行 T-1…T-11）／**条 234**（落码收讫 batch E＋MK/钉值）；终审回执 §2 **B-1／B-2／B-3**（落码红线）
> **落码 commit**：**`7776d50`**（父 `b4b73f6`）｜窗内零提交、树起收 clean
> **判决**：**FAIL** —— **faces=10｜checked=10｜pass=7｜fail=3**（W63-2／W63-6／W63-9）；**A 级 2**（A-1＝D-7 pool 源错位；A-2＝XP 点桥死注入）／B 0／C 5
> **一句话**：D-2（附魔书恒 1 条）与 D-3（hatchet 排除门）判值**全中**；D-7 的 pool/pool-e/reg 三型行形、空池不静默、注册表逐行（含跨 mod 现期 0 条）全中，**但 `size` 列取的是「结果集」(`buildEnchantmentList`) 而非「候选池」(`getEnchantmentDatas`)** ⇒ W63-2/W63-6 的 29／收窄值结构性不可达；另 W63-9 量到 **100 次穿台零 points 扣减**（`addExperienceLevel` 重定向在 1.12 `enchantItem` 无叫点位）。

## §0 判定总表（10 判点）

| 判点 | 判行（anchor） | 预期（1.12／R196 一手） | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **W63-1** 书 NBT ≤1 | `-bookdump.log` 100 行 ＋ `-session-1.out` BookProbe 行 | 穿台 ≥100 本，每本 `StoredEnchantments` 恰 1 条；2+/3+ 出现即 FAIL | **100/100** 本 `minecraft:enchanted_book`×1、`stored=1`（dist={1:100}，over1=0，zero=0，treasureHits=0；timeout 0／placeFail 0／error 0） | ✓ |
| **W63-2** pool book size=29 | `-session-1.out:3699-3701`（pool 三行）＋`:3662-3694`（reg 33 行） | 书面 `size`=29（候选池；slot2 budget=30 行满池，slot0/1 按 band 收窄） | pool 三行 `size=1/2/1`（slot0 budget=6／slot1 11／slot2 30，band 全合）；reg 侧 33 注册−4 treasure＝**29** 非 treasure 行成立，但 `size` 列报结果集（候选池应为 14/21/29，见 §2） | ✗ |
| **W63-3** treasure 四缺席 | `-session-1.out:3670/3671/3692/3693` | 四件 treasure 行 `treasure=true`；33−4=29 行位对位 | 恰 4 行 treasure：`frost_walker#9(w2)`／`binding_curse#10(w1)`／`mending#70(w2)`／`vanishing_curse#71(w1)`；非 treasure 29 行；100 本产出**零** treasure id | ✓ |
| **W63-4** hatchet 三色 | `:3757`／`:4093`／`:4134`（hatchet）＋`:4178`（battle axe） | `tree_felling` 对 hatchet `table=false`（三件）；对 battle axe `table=true` | `table=false` ×3（`hatchet_rusted_iron`／`hatchet_copper`／`hatchet_silver`）；`battle_axe_rusted_iron` `table=true` | ✓ |
| **W63-5** piercing 四行回归 | `-session-1.out:4205-4208` | 原四行（enchantprobe／windows／table／carrier）行数=4、键序不变 | 4 行齐全且键序原样：`enchantprobe slot=MAINHAND item=minecraft:iron_sword canApply=false maxLevel=5`／`windows L1=1/21 L2=7/27 L3=13/33 L4=19/39 L5=25/45`／`table power=15 slot0=6 slot1=10 slot2=30 power30=30 slot0=8 slot1=13 slot2=30 bound=…`／`carrier src=melee immediate=EntityPlayerMP carrier=minecraft:iron_sword level=0 pts=0.0` | ✓ |
| **W63-6** 非书池名单 | `:4212-4214`（铁剑）／`:4254-4256`（铁靴） | 铁剑/铁靴 `size` 收窄；reg `table` 列分布与 1.12 粗粒度一致 | reg 分布全合：铁剑 `table=true&!treasure`=**8**（sharpness/smite/bane/knockback/fire_aspect/looting/sweeping/unbreaking）、铁靴=**7**（protection/fire/feather/blast/projectile/depth_strider/unbreaking，thorns=ARMOR_CHEST／respiration·aqua=AFFINITY… 剔除正确）；但 pool `size`=2/2/1 与 1/1/3（结果集），**非** 8/7 收窄值 | ✗ |
| **W63-7** 空手 size=0 | `-session-1.out:3656-3660` | 空手 → budget=0、size=0，`pool-e` 行必须出现（不静默） | 三行 `pool slot=0/1/2 budget=0 size=0 item=empty` ＋ **三行 `pool-e`** | ✓ |
| **W63-8** 战利品面静默 | 全窗扫描（301 条 `[EnchantLog]`） | 非诱发 0 行（pool/dump 只在命令触发时存在） | boot 段 **0** 行；诱发窗外 **0** 行（stray=[]）；anvil-combine **0** 行；mixinFail **0** | ✓ |
| **W63-9** XP 点面 | `-bookdump.log`（100 行 xp 列）＋字节码位 | 每次穿台扣 `levels×100` points（slot2 ⇒ −300） | **100/100 次 xpDelta=0**（points 恒 51500／reset 后 203000），仅 `experienceLevel` 逐本 −3；字节码 `enchantItem` 无 `addExperienceLevel` 叫点位、无 redirect 调用 | ✗ |
| **W63-10** cfg hash | `-evidence.json.cfgClose/cfgClientClose` | 双端 cfg 起收 byte-identical | 32,095 B `E07CAC1E…AE7F5`／30,524 B `262BFF5E…C9AD`，两端 `identical=true`、`sameAsStart=true` | ✓ |

## §1 W63-1 书单条（D-2，100 本实测）

- **路径**：bot 真实开附魔台（`bot.openEnchantmentTable`）→ slot0 放 1 本书（左键取栈／右键落 1／左键回栈）→ slot1 青金石 → 点第 3 格（`enchant_item enchantment=2`）→ 读 slot0 产出 NBT（`StoredEnchantments`）→ shift-click 取回。
- **场地**：石台 ＋ 32 书架环（`enchantLevels[2]=30` 实测：pool 行 slot2 `budget=30`，见 `-session-1.out:3701`）。
- **样本**：**100/100** 产出 `minecraft:enchanted_book`、count=1、`StoredEnchantments` **恰 1 条**（分布 {1:100}）。若 D-2 的 `getEnchantmentList` 重定向未生效，按 1.12 分布应有 ~20 本 2+ 条（0.1667+0.0292+0.0024）；实测 **0 本** ⇒ D-2 落码在真实台面路径上生效（字节码侧 `redirect$…BookSingle` 在 `getEnchantmentList` 有 1 处实调，与 XP 桥的死注入形成对照）。
- **逐本 dump**：`testharness/build-logs/enchantpool-w63-bookdump.log`（100 行，13,758 B）。
- **空窗**：timeout 0／placeFail 0／error 0；批窗 reopen 4 次（每 20 本一次包位复位，非失败）、level reset 1 次（#44，见 §9）。

## §2 W63-2 D-7 pool 源（A-1 定谳）

- **判据红线（终审 §2 B-3 第 2 条，逐字）**：「**池正源**＝直调 `EnchantmentHelper.getEnchantmentDatas(budget, stack, false)`（现体原厂，不复制 band 逻辑、不照抄 R196 静态数组……）」。
- **落码现体**：`CommandDevTest.executeEnchantPoolProbe:439` 调 `EnchantmentHelper.buildEnchantmentList(player.getRNG(), stack, budget, false)`，`size` 取该返回 List 的 `size()`。
- **术语差**：`buildEnchantmentList` 在 1.12 返回的是**抽取结果**（`list.add(WeightedRandom…)` ＋ `while(nextInt(50)<=level)`，实测 1–3 条）；**候选池**在 `getEnchantmentDatas`（`EnchantmentHelper.java:449-469`，`(!treasure||allowTreasure) && (canApplyAtEnchantingTable || (isBook && isAllowedOnBooks))`）。
- **实测**：书面三行 `size=1/2/1`（`-session-1.out:3699-3701`），budget 6/11/30 落 band（2..10／6..21／30）。同 probe 的 reg 块 33 行、treasure 4 行、非 treasure 29 行（`:3662-3694`）——**29 在注册表侧成立，在 `size` 列不成立**。
- **判定**：**✗**。修复位＝`executeEnchantPoolProbe` 内 `buildEnchantmentList` → `getEnchantmentDatas(budget, stack, false)`（一行）。**预期值（用同 probe 的 reg 窗口列逐件复算，budget 6/11/30）＝14/21/29**：候选池随 budget 走，slot2（budget=30）恰 **29**、slot0/1 收窄为 14/21；若按终审 B-3 第 3 条「书档固定 budget=31」单行口径则恒 **29**（31 与 30 同池）。**注意**：本条与条 234「池正源直调 `buildEnchantmentList`」字面冲突——`条 233/终审` 为判据正本、`条 234` 为落码摘记，方向请主会话裁定（见 §11 A-1）。

## §3 W63-3 treasure 四缺席

- reg 行 treasure 列恰 4 行：`minecraft:frost_walker#9 w2`／`minecraft:binding_curse#10 w1`／`minecraft:mending#70 w2`／`minecraft:vanishing_curse#71 w1`（`:3670/3671/3692/3693`）。
- 注册总数 **33**（30 vanilla＋3 ETIM：`tree_felling#11`／`endurance#12`／`piercing#13`），非 treasure **29**＝33−4，行位对位合。
- **经验面**：100 本产出（每本 1 条，共 100 次抽取）**零** treasure id（`treasureHits=0`），与 `allowTreasure=false` 门一致。
- 判定 **✓**；「size 之所以 29」的 `size` 列联动归 W63-2 的 A-1，不在本点重复扣分。

## §4 W63-4 hatchet 三色（D-3）

- 三件 hatchet：`etim:hatchet_rusted_iron`／`etim:hatchet_copper`／`etim:hatchet_silver` → `pool reg=etim:tree_felling … table=false`（`:3757/4093/4134`）。
- 负证对照：`etim:battle_axe_rusted_iron` → `table=true`（`:4178`）。
- **词面注记（C-1）**：任务书「iron/gold/第三金属」中的 **gold hatchet 不存在**——`ETIMMetals.TOOL_METALS` 六金属不含 GOLD（`ETIMMetals.java:59-61`，gold 保留 vanilla 工具），故 gold 位以 `silver` 代（同 TOOL_METALS 成员）。
- **pool 面注记（C-2）**：`hatchet_rusted_iron`／`battle_axe_rusted_iron` 的 `enchantability=0`（`ETIMMetals:56` RUSTED_IRON=0）⇒ 三行 budget=0／`pool-e` ×3；本点判据只取 reg 行 `table` 列，不受影响（copper/silver 件 pool 正常）。
- 判定 **✓**（源码位：`isEmpty` 守卫 ✓、`instanceof ItemAxe` ✓、`!(instanceof ETIMItemHatchet)` ✓、无 `getClass()==` ✓）。

## §5 W63-5 piercing 四行回归

- 四行原样（`-session-1.out:4205-4208`），键序 `slot/item/canApply/maxLevel` → `L1..L5` → `power/slot0..slot2/power30/.../bound` → `src/immediate/carrier/level/pts`。
- 判值：`windows L1=1/21 L2=7/27 L3=13/33 L4=19/39 L5=25/45`（与 AD7 终审值域一致；未在本批重判数值域，仅判行数/键序）。
- 判定 **✓**。

## §6 W63-6 非书池名单

- **reg 分布（✓）**：铁剑 `table=true&!treasure`=8（sharpness/smite/bane/knockback/fire_aspect/looting/sweeping/unbreaking）＋mending/vanishing（treasure 但 table=true）；铁靴=7（protection/fire/feather/blast/projectile/depth_strider/unbreaking）＋frost_walker/binding_curse/mending/vanishing。与 1.12 `EnumEnchantmentType` 粗粒度（WEAPON∪BREAKABLE／ARMOR∪ARMOR_FEET∪BREAKABLE）逐件合。
- **size 收窄（✗，同 A-1）**：铁剑 `size=2/2/1`、铁靴 `size=1/1/3`——均为结果集；按 reg 窗口列复算的候选池应为铁剑 **6/6/8**、铁靴 **5/7/7**（slot0/1/2，budget 5·7·30／7·11·30），「收窄」在本行形下不可判。
- 判定 **✗**（分母为 size 面；reg 面已单列 ✓ 备注）。

## §7 W63-7 空手 size=0

- `pool slot=0/1/2 budget=0 size=0 item=empty` ＋ `pool-e slot=0/1/2 budget=0 list=empty`（`:3656-3660`）。
- 与 D-7 红线「空池仍出 size=0 行禁静默」逐字合；空手路径零 NPE、零 XP/NBT 写。
- 判定 **✓**。

## §8 W63-8 战利品面静默

- boot 段（`Done(` 之前）`[EnchantLog]` 行 **0**。
- 全窗 `[EnchantLog]` 共 **301** 行，全部落在 11 次 `enchantprobe` 诱发窗内（stray=[]，含 `pool-e` 与 `reg` 行）；`anvil-combine` **0** 行。
- 判定 **✓**。

## §9 W63-9 XP 点面（A-2 定谳）

- **实测（100 本逐本）**：`xpBefore` 恒 51500（#1–#43）／203000（#44–#100，`/etest level 200` 复位后），`xpAfter` 同值 ⇒ **xpDelta=0 ×100**。同期 `experienceLevel` 逐本 **−3**（#2 读 100→97、#3 97→94 …；#1 的 100→100 为同步包滞后一帧）。
- **字节码位（本窗亲锤）**：`run/.mixin.out/class/net/minecraft/inventory/ContainerEnchantment.class` 的 `enchantItem` 体内只有 `EntityPlayer.onEnchant(ItemStack,int)`（offset 144），**无** `EntityPlayer.addExperienceLevel(I)` 调用、**无** `redirect$…$etim$r196EnchantPoints` 调用点；该 redirect 方法体存在（声明在案）＝**死代码**。
- **行为对位**：1.12 `EntityPlayer.onEnchant:2190-2202` 只做 `experienceLevel -= cost`（不动 `experienceTotal`）；R196 `ContainerEnchantment:157/175` 走 `Enchantment.getExperienceCost(levels)=levels*100`（`Enchantment.java:96-98`）的 **points** 扣减。现体＝vanilla 单级扣减，池不动。
- 判定 **✗**。修复位＝redirect `target` 由 `EntityPlayer;addExperienceLevel(I)V` 改为 `EntityPlayer;onEnchant(Lnet/minecraft/item/ItemStack;I)V`（handler 签名随之 `(EntityPlayer, ItemStack, int)`），或新建 `@Mixin(EntityPlayer)` 的 `onEnchant` 注入。

## §10 W63-10 cfg hash

- 起：`run/config/etim.cfg` 32,095 B `E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5`；`run/obfuscated/config/etim.cfg` 30,524 B `262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD`。
- 收：两端 `identical=true`、`sameAsStart=true`（零新键、零改写）；窗口内 `clear/give/level` 均不触 cfg。
- 判定 **✓**。

## §11 冲突分级（A 2／B 0／C 5）

### A 级（产品码缺陷，阻断封批）

- **A-1（D-7 pool 源错位）**：`CommandDevTest.executeEnchantPoolProbe:439` 用 `buildEnchantmentList`（结果集）而非终审红线指定的 `getEnchantmentDatas`（候选池）⇒ W63-2／W63-6 的 `size` 面不可判/不达值。**副作用**：该行形无法支撑 M-2「池域 38 vs 29」的后续判读（本批 M-2 只登记不移植，但通道必须可判）。**改后判值（复算）**：书面 14/21/29（slot2=29 达值）、铁剑 6/6/8、铁靴 5/7/7。
- **A-2（XP 点桥死注入）**：`MixinContainerEnchantment:33-45` 的 `@Redirect(method="enchantItem", target=EntityPlayer;addExperienceLevel(I)V)` 在 1.12.2 `ContainerEnchantment.enchantItem` **无叫点位**（扣费在 `EntityPlayer.onEnchant`，调用的是 `experienceLevel -= cost`）；实测 100/100 次 points 零扣减。**归属**：本桥来自 Audit 13 §2.3（非 batch E 新增），但 W63-9 是本批判点，故随批登记为 A。

### B 级（判据词面缺口）

- **无。** 10 点均可判；W63-2/W63-6 的不可达是**码源错位**（A-1）而非词面结构性缺口。

### C 级（登记不阻塞）

- **C-1（gold hatchet 不存在）**：`ETIMMetals.TOOL_METALS` 无 GOLD（gold 保留 vanilla 工具），任务书「iron/gold/第三金属」的 gold 位以 silver 代；本源属既定设计（`ETIMMetals.java:59`），非本批缺陷。
- **C-2（rusted 件 enchantability=0）**：`hatchet_rusted_iron`／`battle_axe_rusted_iron` 的 pool 三行为 0/0/0＋`pool-e`；W63-4 判据只取 reg `table` 列，判值不受影响。
- **C-3（R196 计费公式差）**：R196 一手＝`enchantLevels[slot]×100`（slot2＝30×100＝**3000** points，`Enchantment.java:96-98`＋`ContainerEnchantment.java:157/175`）；现桥声明式＝`i×100`（slot2＝**300**，`MixinContainerEnchantment:41`）。A-2 修复时须**显式择一**，勿静默沿用（本批不裁）。
- **C-4（pool 行形列序）**：终审 B-3 行形写 `pool item=<reg> budget=<n> size=<k>`，现体为 `pool slot=<i> budget=<n> size=<k> item=<reg>`（slot 列前移）；任务书「slot0..2 三行」口径下现体更合判读，登记不扣分。
- **C-5（跨 mod 项现期 0）**：reg 行遍历 `Enchantment.REGISTRY`（33 行）＝vanilla 30＋ETIM 3；ETIM-Extra 未上线，跨 mod 项本期 0 条（D-7 红线要求「跨 mod 必入」，机制已由 Forge 注册表枚举保证）。

## §12 钉值／MK（起收）

| 面 | 起 | 收 | 判 |
| --- | --- | --- | --- |
| HEAD | `7776d50`（`7776d508b0859d0a77a1abd699836e10e0313ea7`） | 同（窗内零提交） | ✓ |
| release jar | 820,768 B `8C48A63B463B14F543976D0AA12A1B7C5C03E8533591F9F50C2AB77245528972` | 同 | ✓ |
| dev jar | 804,137 B `946645281B209BFDC401BF71A660520871E6D35A968210CED0E09394842C9AD7` | 同 | ✓ |
| sources jar | 749,392 B `46D12B946112BCDA097FD78C8DB22F7DC5C0D02945AC982A297038117A0B95A6` | 同 | ✓ |
| refmap 双树 | 62 类键／139 条目（`build/resources/main` ↔ `build/tmp` 同值） | 同 | ✓ |
| mixins 清单 | 56／client 10 | 同 | ✓ |
| 切片 | Sword 4／Tool 4／Shears 3（总 11）＋`MixinContainerEnchantment` 3 | 同 | ✓ |
| cfg | 32,095 `E07CAC1E…AE7F5`／30,524 `262BFF5E…C9AD` | 同（byte-identical） | ✓ |

## §13 收口表

| 面 | 状态 |
| --- | --- |
| boot 计数 | **1**（`Done (5.470s)` @ 18:19:54，idx 2266；BUILD SUCCESSFUL；jar 三件 UP-TO-DATE） |
| 客户端 | **零会话**（未拉起、未截屏、未抢焦点；CT-9） |
| rebuild | **0**（无 `gradle build` 任务；boot 链 `:compileJava`／`:classes`／`:jar` 全 UP-TO-DATE；jar 三件起收同值） |
| 产品码 | **0** 行改动（窗内零提交；驱动/证据/日志全部落 `testharness/**`） |
| 树状态 | 起 `7776d50` clean（新增驱动未跟踪）→ 收 clean（cfg/props/side 文件全量回填 identical；world `enchantpoolw63` 已删） |
| 进程/端口 | 端口 25565 收 0；crash-reports 19＝19（零新增） |
| 判据档 | `testharness/build-logs/enchantpool-w63-evidence.json`（187,386 B）／`-bookdump.log`（13,758 B）／`-session-1.out`（14,160 行）／`-session-1.log`／`-driver.log`／`-etim.cfg.before`／`-client-etim.cfg.before`／`-server.properties.before` |

## §14 T 锤引句位（终审 §6 十点 → W-63 判行）

| T | 终审锤面（条 233 §6） | 判点 | 引句位（`build-logs/enchantpool-w63-*`） |
| --- | --- | --- | --- |
| T-1 | 书 NBT ≤1（100 本） | W63-1 | `-bookdump.log` 100 行（逐本 `storedEnchantments=1`） |
| T-2 | pool book size=29 | W63-2 | `-session-1.out:3699-3701`（pool 三行） |
| T-3 | treasure 四件缺席 | W63-3 | `:3670`／`:3671`／`:3692`／`:3693` |
| T-4 | hatchet 三色 probe（含 battle axe 负证） | W63-4 | `:3757`（rusted）／`:4093`（copper）／`:4134`（silver）／`:4178`（battle axe `table=true`） |
| T-5 | piercing 四行回归 | W63-5 | `:4205-4208`（4 行全引句） |
| T-6 | 非书池名单 | W63-6 | `:4212-4214`（铁剑）／`:4254-4256`（铁靴） |
| T-7 | 空手 size=0 | W63-7 | `:3656-3660`（三 `pool-e`） |
| T-8 | 战利品面静默回归 | W63-8 | `evidence.json` `strayEnchantRows=[]`／`bootEnchantLogRows=0` |
| T-9 | XP 点面 | W63-9 | `-bookdump.log` xp 列（100×`xpDelta=0`）＋字节码 `enchantItemHasAddExperienceLevel=false` |
| T-10 | cfg hash | W63-10 | `evidence.json` `cfgClose`／`cfgClientClose`（32,095／30,524，`identical=true`） |

## §15 未覆盖面（不补白）

1. **权重分布**：终审裁定单点窗不判（统计面），本窗零采样、零判。
2. **战利品/村民/加附魔产出分布**：只判 W63-8 静默面，不判分布。
3. **砧面（`anvil-combine`）／耐久批（0.75）／piercing 数值域**：避让面，未动、未判（W63-5 只判行数/键序）。
4. **A-1/A-2 修复后回归**：本窗不含（A 级修复归主会话；单点回归窗可即起）。

## §16 自报（机械核讫）

> 文件：`testharness/reports/enchantpool-W63-verdict.md`｜字节五项：size 20,248 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 166（split 行数 167）
> 三口径（家族同型：metgear-W62b／metgear-assets／unbreak-W50）：**甲＝零位 raw**（把本档内全部 64 位十六进制串整体替换为 64 个 `0` 后，对全档 UTF-8 字节 SHA-256）；**乙＝零位＋LF 归一**（同甲替换后去 BOM、`CRLF→LF`，再 SHA-256）；**丙＝零位＋行链**（同甲替换后按 `split("\n")` 取全元素（含末位空元素），逐元素 `sha256(元素 UTF-8 字节)` 取小写 hex，按序换行连接后再 SHA-256）。
> SHA-256 甲（全档零位）`5D091DD9B766A697D8C121FCAE57920A0104D685B3732898725626871CE134EE`
> SHA-256 乙（LF 归零零位）`5D091DD9B766A697D8C121FCAE57920A0104D685B3732898725626871CE134EE`
> SHA-256 丙（行链零位）`59E566FDB4A6AD6BBE7638C1812F26900BBB096271CF2C665AB482AD7B8A0EE3`
> 判格 10＝✓ 7／✗ 3｜锚：pool 书行 3699-3701／reg 33 行 3662-3694／treasure 3670·3671·3692·3693／hatchet 3757·4093·4134·battle 4178／四行回归 4205-4208／空池 3656-3660／剑靴 4212-4214·4254-4256／100 本 dump 100 行｜钉值：1 boot／0 rebuild／0 客户端／0 产品码／cfg 双端 byte-identical｜冲突 A2 B0 C5。
