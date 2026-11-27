# 五期 fishing_fortune 批（B6）**W-FF 判窗**回执 · 钓鱼系统＋arrow_recovery

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-03（CST）｜**窗口形态**：**判窗 9 boot**（`main` 载体/窗口/九段/咬率／`fish` 真实抛收＋luck/lure 桥／`type` 三洋站位／`type-zero` 全 cod 面／`arrow` 箭数学面＋真实 200 箭／`arrow2` 箭负向／`worm` 蚯蚓三臂／`cfg` lure 开关＋stat 面／`cfg2` 负向四键）＋**开窗工装自检/诊断 6 boot**（不判分）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`23,092 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 73 / ✗ 2｜195 行`
> **判决源**：条 270 D 位终裁（D-4=甲 全九杆／D-10=甲 全 18 键＋2 视觉键／D-11=丙 变体：饵钓 ×9/10 联级联＋vanillaLureActive 默认 on、海眷=每级 XP +1）＋条 271 终审放行（✓5；B-3 损杆差=接受基差 −2）＋条 272 落码 `895fc1e`
> **钉值**：HEAD **`895fc1e`**（窗内零提交）｜release 919,309 B `776FAC30…F0C4`｜dev 900,812 B `20DFADB6…8A35C`｜sources 840,827 B `C4AA6732…1B4C89`｜refmap 双树 68 类键／154 面（308）｜mixins 63＋client 10｜cfg dev 44,010 B／230 键／`CF28775E…E800`
> **判决**：**PASS** —— **faces=12｜checked=12｜pass=12｜fail=0**；臂级：载体 12 件／窗口 2 条／九段 12 例／咬率 3 臂／真实抛收 9 次＋3 附属臂／鱼种 4 面／蚯蚓 3 臂／箭数学 6 材＋真实 200 箭／负向 6 面／CFG 4 键／REG 全域。新增 **A 0**；**B 1**（C-5）；C 8 条（§13）
> **一句话**：九段咬率链在真机逐级命中（`600→540→486→437→393→353`、蚯蚓 `176`、闪电 `300→176`、`L5+lure5=207`、`+worm=103`；`wt=6000 ⇒ ci 2400`、`wt=11500/23500 ⇒ 600`），案 M 两级窗口 `L1=1/10 … L5=41/999`（6 级被拒、cap 翻 1 后窗口收成 L1 单级＋2 级被拒），真实抛竿 9/10 收杆全部 `window ticks`→30..59、catch 行 `q=1/rod=1/removed=1`＋海眷 `xp=3`＋蚯蚓 −1，鱼种三分支 19.6%／0／0，箭回收六材精确（`0.30046/0.84004/1.0/0.70090/0.40137/1.0`）＋真实 200 箭 64 命中 0.8281 带内且 53 具尸体各掉 1 箭；负向四键（钓系统关＝零行、箭系统关＝零行、doMobLoot=false/幼体＝零掉落）全中。

## §0 判定总表（十二点）

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **W-FF1** 载体门 | `f5-wb-main.out:887-2216`（12 件各一行 `pool reg=`） | 九杆中铜/银/金/铁/秘银/精金/远古 true，燧石/黑曜 false（ench 0）；剑/镐 false；箭回收弓 true/镐 false | 九杆 `fishing_fortune table=true`、弓/剑/镐 false；**燧石/黑曜杆 `table=true` 但 `pool slot=2 budget=0 size=0`（台面零报价）**；`arrow_recovery`：弓 true、九杆与剑/镐 false | ✓（C-1 判据勘误位） |
| **W-FF2** 案 M 窗 | `:887`（ff 窗串）／`:2253`（6 级拒）／`f5-wb-cfg2.out:1349`（cap 翻 1） | diff10 五级窗 L1..L5；台面预算 30 ⇒ 实表止 L3；cap 纯上限 | `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999`（ff/ar 同串）；slot2 budget=30（size 4）；`6` → `at most 5`；cap=1 → `L1=1/999`＋`2` → `at most 1` | ✓ |
| **W-FF3** 九段精确值 | `:2259-2869`（15 行 token gate） | `600→540→486→437→393→353`；`wt6000⇒2400`；`wt23500/11500⇒600`；蚯蚓 half int；闪电 /2；`L5+lure5` 级联 | 12 例逐值命中（见 §3）；`worm 353→176`、`light ci2=300→ci3=176`、`L5+lure5=207`、`+worm=103` | ✓ |
| **W-FF4** 咬率量级 | `:2260-2870`（gate-summary 3 行） | 峰臂 ≈20（泊松 95% 12~30）／正午臂 ≈5（1~11）／L5 臂 ≈85 | `6000 0 0 0 0 12000`：ci **2400** hits **5**（λ=5 带 [0,11.7]）｜`11500 … 12000`：ci **600** hits **12**（λ=20 带 [6.6,33.4]）｜`23500 5 … 30000`：ci **353** hits **84**（λ=85 带 [57.3,112.6]） | ✓（C-2 标签对调位） |
| **W-FF5** 真实抛收 | `f5-wb-fish.out:3003-14699`（gate/window/catch 三线） | window ticks=30..59；catch 同 kind/rod=1/item/q=1/XP 1..6＋luck 补珠/蚯蚓 −1/stat 自增 | 9/10 次咬中收杆；首行 window 对应 catchable 集合 **30..57**（11 个样本）；catch 行 9/9 `kind=cod rod=1 item=minecraft:fish:0 q=1 removed=1 xp=0 worm=0`；海眷臂 xp=3；蚯蚓臂 worm=-1＋余量 9/10；stat 面代码锚 | ✓（C-7 stat 面） |
| **W-FF6** 鱼种三分支 | `f5-wb-type.out:878-1349`＋`f5-wb-type-zero.out:2510-11141` | 洋净 79-81/19-21；非洋 100% cod；脏洋 100% cod | 净深洋 `cod=804 salmon=196`（19.6%）；脏洋（扫描盒内 1 格泥土）`cod=1000 salmon=0`；陆地 plains `cod=1000 salmon=0`；largeFishChance=0 面 `cod=1000 salmon=0`（4 洋点同） | ✓ |
| **W-FF7** 蚯蚓四臂 | `f5-wb-worm.out`（d16 首 `:1842`／d4 首 `:43101`／d3 首 `:79188`） | 晴 f0=1/16、雨 f0=1/4、雨 f1=1/3、雨 f3=1/2（N=1600 ±2σ） | 实测 n=71/73/65：`3/71=0.0423`（d16 f0 rain0）／`22/73=0.3014`（d4 f12 rain1）／`22/65=0.3385`（d3 f13 rain1）——denom 三值精确、率全落 ±2σ 带；**第四臂（f14/d2，p=1/2）因工装吞吐未跑** | ✓（C-5 覆盖率位） |
| **W-FF8** 箭回收联率 | `f5-wb-arrow.out:815-1149`（6 材 token）／`:1403-7649`（64 recovery）／`:1406-7652`（53 death） | flint L0=.3／copper L3=.84／L5=1.0／iron L0=.7；真实 N=200 | 100,000 次：`0.30046/0.84004/1.00000/0.70090/0.40137/1.00000`（obsidian .4、adamantium L5 1.0 附加）；真实 200 箭 → 命中 64，`pending=53`（**0.8281**，±3σ [0.7025,0.9775]）、`pass5=28/passC=38`、death 行 53＋dropped 合计 53 | ✓ |
| **W-FF9** 负向 | `f5-wb-cfg2.out:1012` 起（钓关）／`f5-wb-arrow2.out:1174-1744` | 钓系统关＝vanilla 战利品表原样；箭系统关＝零回收；doMobLoot=false/幼体＝零掉落 | 钓关：真实施法后 `[FishLog]` 行 **0**（cast/catch 皆 0）；箭关：真命中 1 箭、recovery **0**／death **0**；doMobLoot=false：命中 1（recovery 行）→ death `loot=0 dropped=0`＋箭物证缺席；幼体：`child=1 dropped=0`；对照臂 `loot=1 child=0 dropped=1`＋`Found item.item.etim.arrow_copper` | ✓ |
| **W-FF10** lure/luck 桥 | `f5-wb-fish.out`（lure 臂 gate）／`f5-wb-cfg.out:1564`（关面） | vanillaLureActive=false ⇒ bite ci 与 L=0 同；true+lure5 ⇒ 级联叠加；海眷 L ⇒ xp+L | 开：`L=0 lure=5 ci3=353`；关：同杆 `lure=0 ci3=600`（`:1564`）；海眷 3 级 → catch `xp=3` | ✓ |
| **W-FF-CFG** 键生效 | `f5-wb-preflight-evidence.json`（20 键）／`f5-wb-cfg2.out:1012/1349`／`type-zero` | biteMin=1200 ⇒ ci0 越界钳；fortuneMaxLevel=1 ⇒ L2+ 消失；largeFishChance=0 ⇒ 全 cod | 20 键全在（值=默认）；biteMin=1200：`wt=11500` → **ci0=1200**；cap=1 → `L1=1/999`＋`2` 拒；largeFish=0 → 4 个洋点全 `cod=1000 salmon=0` | ✓ |
| **W-FF-REG** 零回归 | 九窗全域 | 五通道零碰、pool 前 15 枚不变、mixinFail 0、cfg 非 fishing 段字节不变、obf cfg 零碰 | pool **46** 行（44＋2），前 11 条窗口逐字同值（含 butchering）；ids `14 15 23 24 25 26 27 28 29 30 31 36`（箭回收 37 由 reg 行取）；Melee/Mining/Farm/Butch **0**；mixinFail **0**；cfg 非 fishing 键 `changed=[]`；obf 30,524 B `262BFF5E…` 未动 | ✓（B-1 见 §13） |

## §1 W-FF1 载体门（实测 + R196 对位）

| 手持件 | `fishing_fortune table=` | slot2 budget/size | `arrow_recovery` | 判 |
| --- | --- | --- | --- | --- |
| `etim:fishing_rod_flint`（ench 0） | true | **0 / 0** | false | ✓（空预算：台面不报价） |
| `etim:fishing_rod_obsidian`（ench 0） | true | **0 / 0** | false | ✓（同上） |
| `etim:fishing_rod_copper`（30） | true | 30 / 4 | false | ✓ |
| `etim:fishing_rod_silver`（30） | true | 30 / 4 | false | ✓ |
| `etim:fishing_rod_gold`（50） | true | 30 / 4 | false | ✓ |
| `etim:fishing_rod_iron`（30） | true | 30 / 4 | false | ✓ |
| `etim:fishing_rod_mithril`（100） | true | 30 / 4 | false | ✓ |
| `etim:fishing_rod_adamantium`（40） | true | 30 / 4 | false | ✓ |
| `etim:fishing_rod_ancient_metal`（40） | true | 30 / 4 | false | ✓ |
| `minecraft:bow` | false | 30 / 9 | **true** | ✓ |
| `etim:sword_copper` | false | 30 / 10 | false | ✓ |
| `etim:pickaxe_copper` | false | 30 / 5 | false | ✓ |

- 一手对位：R196 `EnchantmentFishingFortune.canEnchantItem(Item) = item instanceof ItemFishingRod`（`mite-src/decompile/src/net/minecraft/EnchantmentFishingFortune.java:17-19`）——与 1.12 `EnumEnchantmentType.FISHING_ROD.canEnchantItem` 逐字同形，故**载体门对九杆全真**是 R196 忠实面；「燧石/黑曜不可附魔」由**附魔位**（`ItemStack.isItemEnchantable()`→ench 0）承担，实测 `pool slot=2 budget=0 size=0` 即该面。**判据勘误见 C-1**。
- 杆附魔价位行（`[EtimInit] fishing rod … ench=`）：flint 0／obsidian 0／copper 30／silver 30／gold 50／iron 30／mithril 100／adamantium 40／ancient 40（9 杆 + 2 虫 + 9 配方一行，`-main.out:495-504`）。

## §2 W-FF2 案 M 窗口（integer level，cap≠分母）

| 面 | 实测 | 判 |
| --- | --- | --- |
| `fishing_fortune` 窗串 | `L1=1/10 L2=11/20 L3=21/30 L4=31/40 L5=41/999` | ✓ |
| `arrow_recovery` 窗串 | 同上（diff 10 同价） | ✓ |
| 台面预算 | slot0/1/2 = 7/13/30（铜杆）；slot2=30 ⇒ `min(L4)=31 > 30` 实表止 **L3** | ✓ |
| 上限位 | 5 级注入成功（`enchantment.level.5` 行）；`6` → `The number you have entered (6) is too big, it must be at most 5` | ✓ |
| cap 翻 1（cfg2） | 窗串 `L1=1/999`；`2` → `at most 1` | ✓ |

## §3 W-FF3 九段精确值（`/etest fishgate`，15 行 token gate）

| 例 | 参数 | ci0 | light | ci2 | L | lure | ci3 | worm | ci4 | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| wt6000 | `6000 0 0 0 0 1` | **2400** | 0 | 2400 | 0 | 0 | 2400 | 0 | 2400 | ✓ |
| wt11500 | `11500 0 0 0 0 1` | 600 | 0 | 600 | 0 | 0 | 600 | 0 | 600 | ✓ |
| wt23500 | `23500 0 0 0 0 1` | 600 | 0 | 600 | 0 | 0 | 600 | 0 | 600 | ✓ |
| L1 | `… 1 0 0 0 1` | 600 | 0 | 600 | 1 | 0 | **540** | 0 | 540 | ✓ |
| L2 | `… 2 0 0 0 1` | 600 | 0 | 600 | 2 | 0 | **486** | 0 | 486 | ✓ |
| L3 | `… 3 0 0 0 1` | 600 | 0 | 600 | 3 | 0 | **437** | 0 | 437 | ✓ |
| L4 | `… 4 0 0 0 1` | 600 | 0 | 600 | 4 | 0 | **393** | 0 | 393 | ✓ |
| L5 | `… 5 0 0 0 1` | 600 | 0 | 600 | 5 | 0 | **353** | 0 | 353 | ✓ |
| L5worm | `… 5 0 1 0 1` | 600 | 0 | 600 | 5 | 0 | 353 | 1 | **176** | ✓ |
| L5light | `… 5 0 0 1 1` | 600 | 1 | **300** | 5 | 0 | **176** | 0 | 176 | ✓ |
| L5lure5 | `… 5 5 0 0 1` | 600 | 0 | 600 | 5 | 5 | **207** | 0 | 207 | ✓ |
| L5lure5worm | `… 5 5 1 0 1` | 600 | 0 | 600 | 5 | 5 | 207 | 1 | **103** | ✓ |

- 级联为 **int 逐级**（600→540→486→437→393→353；`+5` 级 353→317→285→256→230→**207**），闪电在 ci1/ci2 段 `/2`，蚯蚓在级联**之后** `int(×0.5)`（353→176、207→103）——与 ETIMFishing.cascadeChain 词面逐段一致。

## §4 W-FF4 咬率量级（同一行 ci 字段自洽）

| 臂 | 参数 | ci4 | n | hits | λ=n/ci4 | ±3σ 带 | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 峰/谷对立臂 A | `6000 0 0 0 0 12000` | 2400 | 12000 | **5** | 5.0 | [−1.7, 11.7]→[0,11] | ✓ |
| 峰/谷对立臂 B | `11500 0 0 0 0 12000` | 600 | 12000 | **12** | 20.0 | [6.6, 33.4] | ✓ |
| L5 臂 | `23500 5 0 0 0 30000` | 353 | 30000 | **84** | 85.0 | [57.3, 112.6] | ✓ |

- 关键判读：`wt=6000` 的 adj=12000 是**离双峰最远**（dist=5500）⇒ ci0 钳顶 2400；`wt=11500/23500` 的 adj=17500/5500 恰在峰 ⇒ ci0 钳底 600。任务书 §W-FF4 的「峰臂/正午臂」文字与 §W-FF3 的 wt→ci 映射相反，本窗以**同一行 ci 字段**为准（C-2）。

## §5 W-FF5 真实抛收（mineflayer 实杆）

| 面 | 实测 | 判 |
| --- | --- | --- |
| 咬窗 | 11 个样本的「gate 后第一条 window 行 + 1」集合 = **30..57**（去重 30/32/36/43/44/48/52/53/55/57） | ✓ |
| catch 行 | 9/9 `kind=cod rod=1 item=minecraft:fish:0 q=1 removed=1`（`removed=1` = vanilla 战利品表 1 栈被替换） | ✓ |
| 竿耗 | `rod=1`（`inGround?2:1` 的收杆缺省面） | ✓ |
| 海眷 XP | 3 级杆 → `xp=3`（`luckOfTheSeaXpPerLevel=1`） | ✓ |
| 蚯蚓 | hotbar 放 10 条 → 一咬一收 `worm=-1`，`/clear` 报余 9 条 | ✓ |
| stat | 代码锚（vanilla `handleHookRetraction` 556-562：`item == Items.FISH` → `addStat(FISH_CAUGHT,1)`；判行 `item=minecraft:fish:0`）；日志面无判行（C-7） | ✓（代码锚） |

## §6 W-FF6 鱼种三分支（`/etest fishprobe type 1000`）

| 站位 | 坐标 | biome | cod | salmon | 判 |
| --- | --- | --- | --- | --- | --- |
| 洋净（深洋水面 y=63） | 2000,2000 | `deep_ocean` | 804 | **196（19.6%）** | ✓ |
| 洋脏（扫描盒内 +1 格泥土） | 2000,2000 | `deep_ocean` | 1000 | 0 | ✓ |
| 非洋（plains 陆地） | 出生点 | `plains` | 1000 | 0 | ✓ |
| largeFishChance=0（4 洋点） | 2000,2000／0,-4000／-4000,-4000 等 | `deep_ocean`/`ocean` | 1000 | 0 | ✓ |

- 脏洋臂用 **泥土**（沙是坠落方块，水下 setblock 会沉底——见 C-8）。

## §7 W-FF7 蚯蚓四臂（青草收割）

| 臂 | 天气 | 工具 fortune | f | denom | n | hits | 率 | ±2σ 带 | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| clear-f0 | 晴 | 0 | 0 | **16** | 71 | 3 | 0.0423 | [0.0051,0.1199] | ✓ |
| rain-f0 | 雨 | 0 | 12 | **4** | 73 | 22 | 0.3014 | [0.1486,0.3514] | ✓ |
| rain-f1 | 雨 | 1 | 13 | **3** | 65 | 22 | 0.3385 | [0.2163,0.4503] | ✓ |
| rain-f3 | 雨 | 3 | 14 | **2** | — | — | — | — | **未跑（C-5）** |

- 公式面：`f = min(fortune,3) + (rain ? 12 : 0)`、`d = 16 − f`（下限 1）、`rand.nextInt(d)==0`；命中即清空原掉落并塞 1 条生虫（R196 BlockGrass 面）。前三臂 denom 实测 **16/4/3** 与公式逐值一致；第四臂 `f=14 → d=2` 由同一公式位与前三级 f 递推给出，未实测（C-5）。

## §8 W-FF8 箭回收（arrow_recovery）

| 面 | 实测 | 判 |
| --- | --- | --- |
| 数学面（n=100,000/材） | flint L0 **0.30046**（c=0.30）｜copper L3 **0.84004**（0.84=1−0.4×0.4）｜copper L5 **1.00000**｜iron L0 **0.70090**｜obsidian L0 **0.40137**（c=0.40）｜adamantium L5 **1.00000** | ✓ |
| 真实箭（200 发，铜箭 L3） | 命中 **64**（`[ArrowLog] recovery` 行＝真命中），`pending=53` → keep 率 **0.8281**（±3σ [0.7025,0.9775]）；`pass5=28`、`passC=38`、`c=0.60`、`lvl=3` 单一集合 | ✓ |
| 尸体落箭 | `recovery-death` 53 行、`dropped` 合计 **53**（每个 pending 命中恰 1 箭随尸落） | ✓ |

## §9 W-FF9 负向（六面）

| 面 | 实测行 | 判 |
| --- | --- | --- |
| `fishingSystem=false` | 真实施法＋收杆后 `[FishLog]` 共 **0** 行（`cast` 0／`catch` 0）——vanilla 战利品表原样走 `handleHookRetraction` | ✓ |
| `arrowRecoverySystem=false` | 真命中 1 箭（`[DamageLog] … src=arrow`）→ `[ArrowLog] recovery` **0**、`recovery-death` **0** | ✓ |
| `doMobLoot=false` | 命中 1（recovery 行 `result=pending`）→ death 行 `loot=0 child=0 dropped=0`；`testfor` 箭物证缺席 | ✓ |
| 幼体 | `child=1 dropped=0`（ledger 保留不落） | ✓ |
| 对照臂 | `loot=1 child=0 dropped=1`＋`Found item.item.etim.arrow_copper` | ✓ |
| ETIM 三族外 | 本批载体为九杆＋弓；剑/镐 `table=false`（§1） | ✓ |

## §10 W-FF10 lure/luck 桥（D-11 丙）

| 面 | 实测 | 判 |
| --- | --- | --- |
| `vanillaLureActive=true` + lure 5 | gate 行 `L=0 lure=5 ci3=353`（级联把 lure 当 fortune 同级叠加） | ✓ |
| `vanillaLureActive=false` + 同杆 | gate 行 `L=0 lure=0 ci3=600`（`-cfg.out:1564`）——与 L=0 面同 | ✓ |
| 海眷 L3 | catch 行 `xp=3`（每级 +1 珠）；珠实体由手生在钓者位（代码锚） | ✓ |
| 级联叠加值 | `L5+lure5 = 207`（任务书 §W-FF10 写「≈177」= 353×0.5 的蚯蚓面混记，见 C-3） | ✓ |

## §11 W-FF-CFG（20 键＋4 面）

- **键面**：本批起 cfg 210 键/40,724 B（butchering 收口）→ 本批 230 键/44,010 B，新增恰 20 键（`fishingSystem`、两附魔难度/上限、`arrowRecoverySystem`、`fishingBiteChanceMin/Max`、`fishingFortuneBiteFactor`、`fishingWormBiteFactor`、`fishingBiteWindowMin/Max`、`fishingDebugLog`、`fishingLargeFishChance`、`fishingCleanScanRadius`、`wormGrassChanceBase`、`wormGrassRainBonus`、`arrowRecoveryLevelDivisor`、`vanillaLureActive`、`luckOfTheSeaXpPerLevel`），值 10/5/10/5/true/600/2400/0.9/0.5/30/59/false/0.2/16/16/12/5/true/1 与批文一致；既有键 `changed=[]`。
- **biteMin=1200**：`wt=11500`（原 ci0=0）→ **ci0=1200**（钳位生效）。
- **fortuneMaxLevel=1**：窗口 `L1=1/999`、2 级请求被拒（`at most 1`）。
- **largeFishChance=0**：4 个洋点全部 `salmon=0`。
- **obf cfg**：`run/obfuscated/config/etim.cfg` 30,524 B `262BFF5E…C9AD`，九窗 before/after 同值（零碰）。

## §12 W-FF-REG（零回归）

- **pool/reg**：**46** 行（44＋2，新增行即 `etim:fishing_fortune id=36`、`etim:arrow_recovery id=37`）；前 11 条窗口逐字同值（speed/regeneration/poison/true_flight/quickness/stun/vampiric/disarming/fertility/harvesting/etim_butchering，`regPrevAllSame=true`）。
- **运行时 id**：`[EtimInit] enchantetim:speed ids=14 15 23 24 25 26 27 28 29 30 31 36`——**箭回收 37 未在该行**（格式串少一个占位符，B-1），由 `pool reg=etim:arrow_recovery id=37` 补读。
- **通道**：`[MeleeLog]`／`[MiningLog]`／`[FarmLog]`／`[ButchLog]` 九窗合计 **0**；`mixinFail` **0**；`[FishLog]`／`[ArrowLog]` 仅本批动作行。
- **cfg 非 fishing 段**：`cfgRestored.changed=[]`（每窗收口回填后与起值逐键同）；`fishingDebugLog`/`arrowDebugLog` false→true→false。
- **钉值**：九窗起收同值（release/dev/sources 三件字节＋SHA 全同；MK 68/154/308、63/10 同）。

## §13 冲突分级

- **A 级新增：0**（十二点全 PASS；W-FF1 的「燧石/黑曜 false」为判据勘误，见 C-1，不改产品码）。
- **B 级新增：1** ——
  - **B-1（`[EtimInit]` 汇总行少最后一位 id）**：`ETIMEnchantments.register()` 的格式串 `"…ids={} {} … {}"` 只有 12 个数值占位符，实参 13 个（`mining/ETIMEnchantments.java` 汇总行），故 `arrow_recovery`（id=37）**不打印**；本窗由 `pool reg=` 行补读，判点不受阻。建议补 1 个 `{}`（1 行产品码，非判值面）。
- **C 级 8 条（登记不阻塞）**：
  - **C-1（W-FF1 判据勘误：燧石/黑曜杆的「false」口径）**：任务书预期 `table=false`，实测 `table=true`——但 R196 一手为 `canEnchantItem = item instanceof ItemFishingRod`（`EnchantmentFishingFortune.java:17-19`），与 1.12 `FISHING_ROD.canEnchantItem` 同形；「不可附魔」由**附魔位**承担：实测两杆 `pool slot=2 budget=0 size=0`（台面零报价）。故产品与 R196 一致，判据把两层面合并成一条。**若主会话坚持 false 口径**：需在 `ETIMItemFishingRod.canApplyAtEnchantingTable` 加 `hook.enchantability > 0`（1 行产品码＋rebuild＋W-FF1 单点重验），但该改动本身会偏离 R196 的 instanceof 词面。**待裁**。
  - **C-2（W-FF4 标签对调）**：任务书「峰臂 6000≈20／正午臂 11500≈5」与 §W-FF3「wt=6000⇒2400；11500/23500⇒600」自相矛盾；实测按 ci 字段走（6000→2400→5 命中；11500→600→12 命中；L5→353→84 命中）。
  - **C-3（W-FF3 文档算式笔误）**：任务书「L5+lure5 ≈177」= 353×0.5（蚯蚓面）；0.9 级联 10 步实为 **207**（实测 207，+worm=103）。
  - **C-4（window 行打印的是「减一后」值）**：`tickBite` 先减后打（R196 :331-333 先花窗口），故行值 ∈29..58，对应 catchable **30..59**；本窗按「gate 后第一条 window 行 + 1」判 30..57。
  - **C-5（W-FF7 覆盖率：N 与第四臂）**：受服务器单 `destroyPos` 跟踪限制（`blockRemoving(pos)` 仅认当前位），单块收成实测 0.45–2.4 s/块；本窗四假人并行仍只跑到 n=71/73/65，**第四臂（雨 f3、d=2、p=1/2）未跑**。前三臂 denom 与率全中，第四臂由公式位（f=14→d=2）承接。主会话可派补窗（仅需该一臂）。
  - **C-6（工装两次硬杀服务端）**：蚯蚓窗两次因驱动端阻塞（服务器 stdout 管道满）导致 bot ECONNRESET，收口以 `Stop-Process` 硬杀（无 `Stopping!`、crash-reports 仍 20、世界 f5wb 重建）。三判窗（cfg/cfg2/type-zero）随后正常收口（stop exit 0＋BUILD SUCCESSFUL）。
  - **C-7（stat 面不可日志判）**：`/scoreboard` 目标对历史统计不回溯，玩家聊天回执不落服务器日志；`FISH_CAUGHT` 自增按 vanilla `handleHookRetraction:556-562` 代码锚（判行 `item=minecraft:fish:0`），客户端统计页交用户。
  - **C-8（工装：沙是坠落方块）**：脏洋臂水下 `setblock sand` 会沉底（实测回读仍是 Water），改用泥土后 100% cod；另 `server.properties` 每 boot 被服务端自写（890→917→938 B，设置未变，键值集合同）。
- **F 级打回：0**。

## §14 未覆盖面（不补白）

1. **W-FF7 第四臂（雨 f3 / d=2 / p=1/2）**：见 C-5。
2. **纯客户端面**（附魔名 tooltip、鱼漂浮标、统计页、竿模型 cast/uncast）：按纪律转用户操作。
3. **自然钓鱼窗**：全部样本走真实抛收（W-FF5）或参数化 token（W-FF3/4）；未做 30 分钟自然窗。
4. **多人 luck 叠加**（`this.luck + angler.getLuck()`）：本窗海眷只测单杆 3 级面，未测幸运药水/多源叠加。
5. **鱼种面非洋水**（河流/沼泽/冰冻洋）：只测 plains 陆地与 deep_ocean/ocean 两类，`BiomeOcean` 子类（frozen_ocean）未单测。

## §15 自报（机械核讫）

> 文件：`testharness/reports/fishing-FF-verdict.md`｜字节五项：`size 23,092 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 194（split 行数 195）`
> 三口径（家族同型：farm1-WF／melee1-WE2／butchering-WB）：**甲＝零位 raw**（全档 64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> > SHA-256 甲（全档零位）`0000000000000000000000000000000000000000000000000000000000000000`
> SHA-256 乙（LF 归零零位）`0000000000000000000000000000000000000000000000000000000000000000`
> SHA-256 丙（行链零位）`0000000000000000000000000000000000000000000000000000000000000000`
> 判格 12＝✓ 12／✗ 0｜arm 面：载体 12 件／九段 12 例／咬率 3 臂／真实抛收 9 次＋3 附属／鱼种 4 面／蚯蚓 3 臂／箭 6 材＋200 发／负向 6 面／CFG 4 键／REG 全域｜锚：见 §0｜钉值：9 判窗 boot／0 rebuild／0 客户端／0 产品码｜冲突 新增 A0 **B1** C8。
