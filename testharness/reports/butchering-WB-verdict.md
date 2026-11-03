# butchering 批（B5）**W-B 判窗**回执 · 屠宰附魔＋五族掉落链

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-03（CST）｜**窗口形态**：**4 boot**（`b5-wb-preflight` 工装自检 → `b5-wb-base` 主窗 → `b5-wb-ench` 附魔增量窗 → `b5-wb-cfgitems` 熟肉/门/cfg 位）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`17,820 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 52 / ✗ 2｜144 行`
> **判决源**：条 264 D 位终裁（用户明文：B 路线／全量／马族全类／well fallback=true／蛛丝不入／cfg 3 键 combat／鸡不入／ETIM 蛛不打／蘑菇牛＋羊驼并入〔D-9 乙〕／looting 声明随批头）＋条 265 终审放行（✓5、C-注1 instanceof 家族式）＋条 266 落码 `10ac9d7`
> **钉值**：HEAD **`10ac9d7`**（窗内零提交）｜release 874,056 B `F7777991…D2808`｜dev 856,699 B `F07D7AC8…8FC04`｜sources 803,129 B `6CCF03C0…1FF243`｜refmap 双树 67 类键／153 面（306）｜mixins 62＋client 10｜cfg dev 40,724 B／210 键／`86FBF1C5…488B`
> **判决**：**PASS** —— **faces=8｜checked=8｜pass=8｜fail=0**（臂级 30 臂：基量 9＋燃烧/剪毛 5＋looting 1＋附魔 13＋负向/门 2）；新增 **A 0／B 0**；C 8 条（§8）
> **一句话**：`[ButchLog]` 两行/杀在真机全部落地——载体门 exact-class（flint 刀／铜匕首 true，铜剑/镐/锄 false），案 M 窗口 `L1=1/10 L2=11/20 L3=21/999`（maxLevel 3 纯上限：4 级被拒 `at most 3`；cfg 翻 1 后窗口收成 `L1=1/999`、2 级被拒 `at most 1`），五族无附魔基量与 13 个 L1/L3 增量臂的实测均值全落在公式 ±3σ 带内（牛 L3 3.5124／理论 3.5417；蛛眼 L3 0.8308／5/6；僵尸马零块 0.0746／7/64=0.1094），燃烧位熟肉 id 物证到件（`cooked_beef/porkchop/mutton`）、生肉与剪毛/烧死羊毛 0 行、鞍照旧由 vanilla after-super 掉。

## §0 判定总表（八点）

| 判点 | 判行（anchor，`b5-wb-base.out` 除注明） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **W-B1** 载体门 | `:2822` knife／`:2874` dagger（table=true）；`:3222` sword／`:3274` pickaxe／`:3326` hoe（table=false） | flint 刀＋金属匕首真，剑/镐/锄假（exact-class，ETIM 三族零控股） | 5/5 如预期；`pool reg=etim:etim_butchering id=31 weight=5 treasure=false` | ✓ |
| **W-B2** 案 M 窗口 | `:2822` reg 窗口串；`:3344` 4 级拒；`b5-wb-cfgitems.out:3662`／`:4079` 翻转 | `L1=1/10 L2=11/20 L3=21..30`＋L3 顶 999 端止；L4 不出现；maxLevel 纯上限非分母 | `L1=1/10 L2=11/20 L3=21/999`；`4` → `too big, it must be at most 3`；cfg 翻 1 → `L1=1/999`、`2` → `at most 1` | ✓ |
| **W-B3** 无附魔基量（9 臂 N≈200） | `:3488-6893` cow／`:6933-9988` pig／`:10087-13062` sheep／`:13101-16241` horse／`:16272-19255` donkey／`:19291-22397` llama／`:22425-25272` zombie／`:25293-28270` skeleton／`:28307-31907` spider | 见 §3 逐臂表 | 9/9 臂 min-max 落在公式值域、均值在 ±3σ 带内（唯一尾点：马 L0 肉 1.398，带下界 1.394） | ✓ |
| **W-B4** 附魔增量（13 臂 L1/L3 N≈200） | `b5-wb-ench.out`：cow `:2773-6281`/`:6450-9695`、pig `:9726-12708`/`:12732-15617`、sheep `:15643-18758`/`:18792-21789`、horse `:21827-24941`/`:24982-27989`、llama `:28040-31181`/`:31215-34197`、spider `:34310-37868`/`:37902-41486`、donkey `:41517-44540` | E 预写：牛 31/12、85/24；猪 3.50；羊 5/4、17/8；马 type0 3.00；驴/羊驼 2.5；蛛眼 2/3、5/6 | 13/13 命中（§4 表）；`lvl` 逐臂同臂值、`well` 全 true | ✓ |
| **W-B5** 燃烧/鞍/羊毛 | `b5-wb-base.out:32004-35910`（4 燃烧臂 61 杀）；`:35988-36888`（剪毛）；`b5-wb-cfgitems.out:2823/3145/3168`＋马臂（熟肉 id 物证）、`:3351`（鞍） | 烧死→熟肉；未剪·烧死羊毛 0；剪后羊毛 0；未剪未烧 ½；鞍照旧掉 | 4 族 `burning=true` 且 `cooked_*` 命中／生肉 id 缺席；烧死羊毛 0/61、剪后 0/60、未剪未烧 0.5672；`saddled=true` 行＋`minecraft:saddle` 到件 | ✓ |
| **W-B6** 负向 | `:36922-39886`（looting III 牛）；`:39988`（doMobLoot=false）；`:40065`（幼体）；`b5-wb-cfgitems.out:…`（0 掉落物证） | looting 0 vs 3 同分布；门/幼体 0 家族行 0 掉落 | χ² leather 0.004（df 2）、beef 0.503（df 2）；nudge 0.1300 vs 0.1343；门 5 杀 5 skip、幼体 8 skip（child=true），二者附近掉落物 0 | ✓ |
| **W-B-CFG** 3 键 | `b5-wb-preflight-evidence.json`（首启）＋`b5-wb-base/ench/cfgitems` 收窗 | combat 3 键落盘、值对齐；obf cfg 零碰 | 207→210 键，新增恰 `butcheringDifficulty/butcheringMaxLevel/butcheringDebugLog`，值 10/3/false，既有键 0 改；obf 30,524 B `262BFF5E…` 未动 | ✓ |
| **W-B-REG** 零回归 | 三窗全域；`b5-wb-base.out:2822-3400`（reg 44 行） | pool 前窗零变、id 前移一位、四通道零碰、mixinFail 0、cfg 非 combat 零改 | reg **44** 行（43＋1）；前 10 枚窗口逐字同值；ids `14 15 23 24 25 26 27 28 29 30 31`；Melee 0／Farm 0／Mining 1（C-14，工装攻击面 dedupe 行）；mixinFail 0 | ✓ |

## §1 W-B1 载体门（exact-class）

| 手持件 | `table=` | 判 |
| --- | --- | --- |
| `etim:knife_flint` | **true** | ✓ |
| `etim:dagger_copper` | **true** | ✓ |
| `etim:sword_copper` | false | ✓（剑不持 generics） |
| `etim:pickaxe_copper` | false | ✓ |
| `etim:hoe_copper` | false | ✓ |

- 行原句（`:2822`）：`[EnchantLog] pool reg=etim:etim_butchering id=31 weight=5 table=true treasure=false window=L1=1/10 L2=11/20 L3=21/999 [server]`
- 落码对位：`EnchantmentButchering.canApplyAtEnchantingTable` 走 `cls == ETIMItemKnifeFlint.class || cls == ETIMItemDagger.class`（`combat/EnchantmentButchering.java`）；`ETIMItemKnifeFlint` 实为 `extends ItemSword`（非 `ETIMItemDagger` 子类），两件互非父子 ⇒ exact-class 闭联（亲读 `metal/ETIMItemKnifeFlint.java:36`、`metal/ETIMItemDagger.java:8`、`metal/ETIMGear.java:72/111`）。
- **C-18**：注册名实为 `etim:etim_butchering`（族内其余 10 枚为 `etim:<name>`；`mining/ETIMEnchantments.java` 的 `setRegistryName(... "etim_butchering")`），本窗判点不依赖该名（判行按 `reg=.*butchering` 取）。

## §2 W-B2 案 M 窗口（integer level，cap≠分母）

| 面 | 实测 | 判 |
| --- | --- | --- |
| 窗口串（maxLevel=3） | `L1=1/10 L2=11/20 L3=21/999`（`:2822`） | ✓（L1/L2 连续无洞；L3 顶 999 = `ETIMMiteEnchantment.getMaxEnchantability` 顶层 flush） |
| 4 级请求 | `The number you have entered (4) is too big, it must be at most 3`（`:3344`） | ✓（纯上限，`getMaxLevel` 读 cfg） |
| cfg 翻 maxLevel=1 | 窗口收成 `L1=1/999`（`-cfgitems.out:3662`）；`2` → `at most 1`（`:4079`） | ✓（L2/L3 随 cap 消失、L1 仍在） |
| 非分母 | 逐臂 E 与 `1+L` 端 bound 一致（§4），无 fraction/除面 | ✓ |

## §3 W-B3 无附魔基量（L0，9 臂）

| 臂 | n | 量面（min..max / 均值） | 理论（枚举精确） | 判 |
| --- | --- | --- | --- | --- |
| cow | 200 | leather 1..3 / 2.0200；beef 1..3 / 2.1800；nudge 0.1300 | leather E2.00；beef E2.1667（var .4722）；nudge 1/6 | ✓ |
| pig | 201 | pork 1..3 / 1.9055 | E2.00（var .667） | ✓ |
| sheep | 201 | mutton 恒 1；wool 0.5672；leather 0.5473 | mutton 恒 1；wool/leather 0.5 | ✓ |
| horse(type0) | 201 | meat 1..2 / 1.3980；base 1..3 / 2.0249 | meat E1.50（var .25）；base E2.00 | ✓（均值 1.3980 贴带下界 1.394，见 C-16） |
| donkey | 201 | meat 恒 1；base 1..3 / 1.9900 | meat E1.00；base E2.00 | ✓ |
| llama | 201 | meat 恒 1；base 1..3 / 2.0249 | 同上（D-9 乙：羊驼吃肉面无 type-0 连骰） | ✓ |
| zombie_horse | 201 | flesh 0..3 / 1.5274；零块率 0.0746 | E1.50（var .75）；P(0)=**7/64=0.1094** | ✓（带 [0.0433,0.1754]；C-注2 修正位） |
| skeleton_horse | 201 | base 1..3 / 1.9751；meat 0 | 骨 1..3（无肉面） | ✓ |
| spider | 201 | eye 0.3184；short 0.3184；`kept=1`（丝栈）0.6567 | eye 1/3；short 1/3；丝 2/3（D-5 不动） | ✓ |

- 交叉面：`familyRemoved`（删除集实际摘掉的 vanilla 表栈数）——cow ∈{1,2}（皮革在率 125/200=0.625 ≈ 2/3）、pig 恒 1、sheep 恒 2（wool+mutton）、horse/donkey/llama/zombie/skeleton ∈{0,1}、spider ∈{0,1}（眼在率 0.3233 ≈ 1/3）；`kept`（未删的非族栈）除 spider（丝 0/1）外恒 0 ⇒ **选择性删除只摘本族件、丝完好**。
- 全臂 `recent=true`（玩家击杀面成立）、`nonRecent=0`（臂内零自然死亡污染）、`well=true`（cow/pig/sheep；马/蛛 `n/a`）。

## §4 W-B4 附魔增量（L1/L3，13 臂）

| 臂 | 实测均值 | 理论 E | ±3σ 带 | min..max（理论） | 判 |
| --- | --- | --- | --- | --- | --- |
| cow L1 | 2.4279 | 2.5833 | 2.4009–2.7657 | 1..4（1..4） | ✓ |
| cow L3 | 3.5124 | 3.5417 | 3.2619–3.8215 | 1..**6**（1..**6**） | ✓（C-15：批文「max 7」不可达） |
| pig L1 | 2.4826 | 2.5000 | 2.2970–2.7030 | 1..4 | ✓ |
| pig L3 | 3.5672 | 3.5000 | 3.2067–3.7933 | 1..6 | ✓ |
| sheep L1 | 1.2587 | 1.2500 | 1.1585–1.3415 | 1..2 | ✓ |
| sheep L3 | 2.2338 | 2.1250 | 1.9016–2.3484 | 1..4 | ✓ |
| horse L1 | 1.9500 | 2.0000 | 1.8500–2.1500 | 1..3 | ✓ |
| horse L3 | 3.0100 | 3.0000 | 2.7408–3.2592 | 1..5 | ✓ |
| llama L1 | 1.5000 | 1.5000 | 1.3939–1.6061 | 1..2 | ✓ |
| llama L3 | 2.5174 | 2.5000 | 2.2634–2.7366 | 1..4 | ✓ |
| donkey L3 | 2.3333 | 2.5000 | 2.2634–2.7366 | 1..4 | ✓（−2.1σ，带内） |
| spider L1 | eye 0.6567 | 2/3 | 0.5669–0.7664 | 0/1 | ✓ |
| spider L3 | eye 0.8308 | 5/6 | 0.7545–0.9122 | 0/1 | ✓ |

- `lvl` 逐臂与臂值一致（`lvl=1`/`lvl=3` 单一集合）；`short=true` 的行 **eye 恒 1**（短路面：R196 的 `a==0` 不掷第二臂），`short` 频率 0.3532/0.3632 ≈ 1/3。
- 牛 nudge 率：L1 0.0896（理论 1/12=0.0833）、L3 0.0448（理论 1/24=0.0417）——nudge 只在 `beef==1` 触发、且仅牛有。

## §5 W-B5 燃烧/鞍/羊毛

| 面 | 判行 | 实测 | 判 |
| --- | --- | --- | --- |
| 烧死→熟肉（cow/pig/sheep/horse） | `-cfgitems.out:2823/3145/3168`＋马臂 | 4/4 族 `Found item.item.beefCooked/porkchopCooked/muttonCooked`；生肉 id `minecraft:beef/porkchop/mutton` **缺席** | ✓ |
| `burning=` 列 | `-base.out:32004-35910` | 4 臂 61 杀全 `burning=true` | ✓ |
| 未剪·烧死羊毛 | 同上 burn-sheep | `wool=0` 61/61 | ✓ |
| 剪后羊毛 | `:35988-36888` | `wool=0` 60/60（`sheared=true`） | ✓ |
| 未剪未烧羊毛 | `:10087-13062` | 0.5672（带 [0.3940,0.6060]） | ✓ |
| 鞍位 | `-cfgitems.out:3351` | `pig … saddled=true` 行＋`minecraft:saddle` 到件（vanilla after-super，不在 capture 列表） | ✓ |

## §6 W-B6 负向

| 面 | 实测 | 判 |
| --- | --- | --- |
| looting III vs 0（牛 L0，各 ≈200） | leather χ²=0.004（df 2）、beef χ²=0.503（df 2）；均值 leather 2.0200 vs 2.0199、beef 2.1800 vs 2.2189；nudge 0.1300 vs 0.1343 | ✓（同分布 ⇒ looting 对被处理族失效＝B-5 基差声明） |
| doMobLoot=false | 5 杀 → 5 条 `… doMobLoot=false → skip`（`:39988`），0 家族行，附近 `@e[type=item,r=4]` 0 | ✓ |
| 幼体 | 4 类 ×2 → `child=true → skip`（`:40065` 等共 8 条），0 家族行，0 掉落物 | ✓ |
| ETIM 三族/批外 mod 件 | 本批 `isBatchFamily` = cow/pig/sheep/AbstractHorse/spider 的 instanceof 式；ETIM 蛛（`ETIMEntityArachnid extends EntityMob`）天然排除 | ✓（D-8 口径，本窗未造 equivalent） |

## §7 W-B-CFG 与 W-B-REG

- **cfg 3 键首启**（`b5-wb-preflight-evidence.json`）：起 39,968 B／207 键（farm1 收口态，**无** butchering 键）→ 首启后 40,724 B／210 键；`newKeys` 恰 `butcheringDifficulty/butcheringMaxLevel/butcheringDebugLog`，`changed` 0 个，值 `10/3/false`。
- 窗内门控：`butcheringDebugLog` false→true→false；`butcheringMaxLevel` 3→1（cfgitems）→3；收窗 `cfgClose.sameAsStartValues=true`、sha 回 `86FBF1C5…488B`（三窗同值）。
- **obf cfg 零碰**：`run/obfuscated/config/etim.cfg` 30,524 B `262BFF5E…C9AD`（三窗 before/after 同值）。
- **pool/reg**：44 行（43＋1，新增行即 butchering）；前 10 枚窗口逐字同值（`regPrevAllSame=true`）——speed 1/10…41/999、regeneration 11/30…91/999、poison/true_flight/quickness/disarming 1/10…41/999、stun 6/20…66/999、vampiric 11/30…91/999、fertility/harvesting 1/10…41/999。
- **运行时 id**：`[EtimInit] enchantetim:speed ids=14 15 23 24 25 26 27 28 29 30 31`（farm1 两枚 29/30 不变，新枚 **31**）。
- **通道**：`[MeleeLog]` 0、`[FarmLog]` 0、`[MiningLog]` 1（C-14）、`[ButchLog]` 未解析行 0、`mixinFail` 0。
- **钉值**：三窗起收同值（release/dev/sources 三件 SHA 与字节全同；MK 67/153/306、62/10 同）。

## §8 冲突分级

- **A 级新增：0**（八点全 PASS，零产品码改动需求；W-B3 马 L0 尾点与 C-15 批文笔误均不改判）。
- **B 级新增：0**（判据通道完备：gate/family 两行覆盖门与量面，`kept/familyRemoved/burning/saddled/well/lvl/rB/nudge/r3/short` 字段齐）。
- **C 级 8 条（登记不阻塞）**：
  - **C-12（工装面：攻击 reach 与射线）**：`/etest attack` 过 ETIM reach 门时按 `getEntityRayDistance`（射线-命中盒入射距，未命中＝`Double.MAX_VALUE` ⇒ 直接 deny）；vanilla 近战 base 1.5＋刀 +0.25、容差 0.25 ⇒ 站位取脚边 1 格、`tp … -90 45` 俯角射入命中盒。**不是产品缺陷**（首跑 `undefined` 站位＋平视实测 deny 已被本注收编）。
  - **C-13（server.properties 基线改写）**：DedicatedServer 每次 boot 自写该档（两行 header＋转义规范化），farm1 窗 890 B `3009633863…` 是「服务端改写前的副本」；本窗起以 **917 B `4BEB6B49…`** 为新基线（键值集合不变，`level-name=world`）。窗内起收同值。
  - **C-14（[MiningLog] 单行）**：`[MiningLog] tool decay face=attacking item=etim:knife_flint loss=50`（`-base.out:3490`）——工装以 ETIM flint 刀攻击触发**既有**攻击衰减通道，`logToolDecay` 按 `face|item|loss` 去重故全窗仅 1 行；非 B5 行为。
  - **C-15（批文笔误：牛 L3 max）**：条 264/终审 §五写「牛 L3 max 7」不可达——nudge 只在 `beef==1` 触发，L3 上界 = `r(3)+1+r(4)` = **6**；本窗实测 max 6、枚举分布 max 6。判值本体（E=85/24）零失。
  - **C-16（马 L0 采样尾）**：horse(type0) L0 肉均值 1.3980 贴 ±3σ 下界（1.394）；同公式的 burn-horse 1.5738、horse-L1 1.9500、horse-L3 3.0100 全中，合并 262 杀均值 1.4396（−1.96σ）⇒ 采样尾非面差；按纪律不追加样本（开窗定死）。
  - **C-17（工装事故：1 份崩溃报告）**：`crash-2026-11-03_16.48.19-server.txt` = 首轮驱动计数位缺陷（gate 计数取错组 ⇒ 单臂跑到 2190 杀、实体堆叠）触发的 `ServerHangWatchdog`（vanilla `Chunk.getEntitiesWithinAABBForEntity`，栈内零 ETIM/Mixin 帧）；修后 base/ench/cfgitems 三窗 crash 20=20 零新增。同轮遗留的孤立服务端已用 op 假人 `/stop` 优雅收口（日志 `Stopping the server`）。
  - **C-18（注册名族内不一致）**：`etim:etim_butchering` vs 族内 `etim:<name>`（及条 264 文面 `etim:butchering`）；仅影响 registry 名字符串（显示名走 `setName`），玩家不可感。若主会话要求与家族一致：1 行产品码＋rebuild＋W-B1 单点重验。
  - **C-19（附魔显示名缺失，跨批遗留）**：`assets/etim/lang/{en_us,zh_cn}.lang` 仅有 `enchantment.etim_tree_felling/etim_endurance/etim_piercing` 三条；enchant1/melee1/farm1＋本批共 11 枚无 lang 键（tooltip 显示 raw key）。本批未新增缺口性质，属前批遗留债；主会话可改判 A（跨批一次补齐）。

## §9 未覆盖面（不补白）

1. **自然窗**：全部样本走 `/summon`＋玩家攻击的等价路径；自然生成个体的掉落面未单测（同一条 `LivingDropsEvent`，风险低）。
2. **蘑菇牛（mooshroom）与骡（mule）**：走 `instanceof EntityCow` / `instanceof AbstractHorse` 家族式，本窗以 cow／llama／donkey 覆盖同式（mooshroom 的 vanilla 表 ≡ cow 表已由条 263 锤实）；未单独起臂。
3. **纯客户端面**（附魔名 tooltip／书架粒子／掉落物拾取动画）：按纪律转用户操作，不在本窗。
4. **死亡瞬间的装备/箱内容**：`dropEquipment` 与 pig saddle 时序按条 263 锤位与本节鞍位物证覆盖；马铠/箱内容未起臂（五族装备槽空，C-11 已登记）。
5. **巨型摔伤抑制（B-6 基差）**：不做，随批头声明。

## §10 自报（机械核讫）

> 文件：`testharness/reports/butchering-WB-verdict.md`｜字节五项：`size 17,820 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 143（split 行数 144）`
> 三口径（家族同型：farm1-WF／melee1-WE2）：**甲＝零位 raw**（全档 64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`35C03A891945BEC6B017E86E68A9DAE0FA5D80D21582539298A836FD72BA9340`
> SHA-256 乙（LF 归零零位）`35C03A891945BEC6B017E86E68A9DAE0FA5D80D21582539298A836FD72BA9340`
> SHA-256 丙（行链零位）`B5E99A5665D99F5E70B622F683020FDA059E169C7DD6A47A1D72E23BFDC9336F`
> 判格 8＝✓ 8／✗ 0｜臂级 30 臂（基量 9／燃烧剪毛 5／looting 1／附魔 13／门与幼体 2）｜锚：见 §0｜钉值：4 boot／0 rebuild／0 客户端／0 产品码｜冲突 新增 A0 B0 C8。
