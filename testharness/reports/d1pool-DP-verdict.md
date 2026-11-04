# 六期 D-1 附魔池批（B7）**W-DP 判窗**回执 · R196 附魔池重锚

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-04（CST）｜**窗口形态**：**判窗 5 boot**（`main` 池探针/载体矩阵/REG／`table` 预算三臂＋可达＋载体功能臂＋学费＋特例＋书池／`fee` 乙臂／`cfg` 总开关＋两上限）＋**1 次机制冒烟 boot**（`main` 内嵌，不判分）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`20,594 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 31 / ✗ 10｜190 行`
> **判决源**：条 277 终审放行（A-6 候选集修正／B-17 unbreaking 停 3／B-18 mixin 64+10／B-19 单表落法）＋条 278 落码 `081b7c5`
> **钉值**：HEAD **`081b7c5`**（窗内零提交）｜release 936,717 B `527A3081…05B7`｜dev 918,140 B `417CE9E7…A60D`｜sources 853,915 B `97EACC83…3F18`｜refmap 双树 69 类键／159 面（318）｜mixins 64＋client 10｜cfg 44,173 B／235 键／`90652ABD…4E9A`
> **判决**：**FAIL —— A 级 1 条（A-1）**；12 点有结论（**✓ 10／✗ 1（W-DP9 护甲面）／◐ 1（W-DP10 protection 族）**）、2 点受阻（W-DP2 分布臂／W-DP8）。新增 **A 1／B 0／C 7**。
> **一句话**：九步装配、案 M 预算三臂（`(1+b)×4` → `altered` → 槽分数）、L4/L5 可达、点数门＋乙臂、两个台面特例、书单抽、`free_action` 收编、pool 总开关回退与两项上限全部在真机命中；**但任何护甲件上台即抛 `NoSuchMethodError`（`ItemArmor.getEquipmentSlot()` 是 1.12.2 的 `@SideOnly(CLIENT)` 方法）——R196 池在服务端对护甲整树失效**，护甲六臂 540 次附魔 0 产出、540 条 `Error executing task`，故打回 A 级修复链。

## §0 判定总表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **W-DP1** 池装配九步 | `d1-wb-table.out`（五件 434 build：rod 160／锤 90／剑 92／镐 90） | `adj=int(L×r)`、`adj-=cost+5`、`adj<5‖picks>2` 断、硬顶 3、级降骰、输出洗牌 | **adj 递推 0 违例**（434/434）、`cand=end` 末值全等于末 pick 的 adj、picks 直方 1/2/3、**maxPicks=3**、L 覆盖 1..5（级降样本在册） | ✓ |
| **W-DP2** 权重分布 | — | diamond 剑 20 万次 χ²；common 52.8%±3σ | **未跑**（A-1 打回后随重验补）；现有 90 杆样本：剑 common 37.5%、镐 46.4%、战锤四枚 w25 各 22–26% | ⊘ |
| **W-DP3** 台面预算（D-A 甲） | `table` level 行 4,278 条 | `power=(1+b)×4`；`levels=altered`；slot2=levels；slot0/1 ±0.1 抖动；E=30 24 书 slot2=53；E=100 slot2=100 | `power` 4,278/4,278 精确；slot3 `out=levels` 4,278/4,278；slot1/2 分数 **0 条越界**（[0.2333,0.4334]／[0.5666,0.7667]）；铜 0/7/12/24 → **4/31/41/53**；秘银 7/10/24 → **32/44/100**；燧石（E=0）0 行 | ✓ |
| **W-DP4** L4/L5 可达 | `table` reach 4 臂 | E=30→7 本 L4／12 本 L5；E=100→7/10；E≤15 永不可达 | 铜 7 本 L∈[1..4]、12 本 L∈[1..5]；秘银 7 本 [1..4]、10 本 [1..5]；燧石 0 级 | ✓ |
| **W-DP5** 学费/门（D-F 丙＋乙） | `table`/`fee` fee 行 | 点数门（非等级门），fee=levels×100；青金石 <id+1 deny；乙臂零青金石仅点数 | 丙：shown=16 ⇒ `fee cost=1600 pool=0`＋apply 1；1599 ⇒ `gate=deny pool=1599`；乙（`enchantLapisRequired=false`）零青金石 ⇒ apply 1＋`fee cost=1600 pool=0`、0 deny | ✓（青金石 deny 臂工装失误，见 C-4） |
| **W-DP6** 特例 | `table` special 行 | 水瓶→经验瓶（费 200）／金苹果 meta0→附魔金苹果 | `special kind=water fee=200`＋槽变 `experience_bottle`；`special kind=apple fee=200`＋槽变 `golden_apple:1` | ✓ |
| **W-DP7** 书池 | `table` book 行 | 书→附魔书恰 1 条 | `book picks=1 keep=minecraft:projectile_protection:1`＋槽 `enchanted_book`（书 E=1 ⇒ 预算≤2，多抽面不可观测） | ✓（C-5） |
| **W-DP8** 怪装门 B-13 | — | 0.1×f 单门；budget=(int)(5+f·r(18)) | **未跑**（同源 A-1：护甲槽附魔会抛错；主手面需与护甲面同批测） | ⊘ |
| **W-DP9** 载体面 | `table` carrier 9 臂（每臂 90 次） | smite→战锤 true／剑 false；sharpness→剑 true；thorns/blast/proj/unbreaking 护甲面；silk→镐/铲 true | 战锤：smite 56／unbreaking 55／stun 53／knockback 47（**sharpness 0**）｜剑：sharpness 72／looting 67／disarming 15／bane 12／fire 12（**smite 0／knockback 0／unbreaking 0**）｜镐：efficiency 90／unbreaking 58／fortune 18／silk 10｜**护甲 4 臂 0 产出 + 540 异常（A-1）** | ✗（护甲面） |
| **W-DP10** 互斥族 D-E | 同九步 sample | sharpness+smite 0；protection+fire 0；protection+feather >0；silk+fortune 0 | 剑 92 build：sharpness+smite 0、sharpness+bane 0、smite+bane 0、looting+silk 0；镐 90 build：silk+fortune 0、fortune+silk 0；**protection 族（含 feather 例外）需护甲件 → 受阻** | ◐ |
| **W-DP11** free_action 收编 | `main` reg 行／ids | 护腿池含 free_action（rw=25／rwindow L1..4）；`[EtimInit]` 尾 id=38 | `etim:free_action id=38 weight=5 table=false rw=25 rwindow=L1=1/10 L2=11/20 L3=21/30 L4=31/999`；ids `14 15 23 24 25 26 27 28 29 30 31 36 37 38` | ✓ |
| **W-DP12** pool 总开关 | `cfg` 臂 | false ⇒ 1.12 池整体回退（build 行消失／旧行为回） | `enchantPoolR196=false`：真台面 0 条 `[EnchLog] pool … start`，槽物由 vanilla 池附魔（NBT `ench` 多枚，含剑上 knockback L2）；mixinFail 0 | ✓ |
| **W-DP-CFG** 键生效 | `cfg` reg 行 | treeFellingMaxLevel=5 ⇒ L5 尾格；freeActionMaxLevel=1 ⇒ 窗收缩 | tree_felling cap=5：`rwindow=L1=1/10 … L4=31/40 L5=41/999`；free_action cap=1：`window=rwindow=L1=1/999` | ✓（C-6 尾格口径） |
| **W-DP-REG** 零回归 | 五窗全域 | 五通道 0；pool 前 16 枚逐字同值；mixinFail 0；非 enchant 键不变；obf 零碰 | Melee/Mining/Farm/Butch/Arrow **全 0**；prev 46 枚 `window=` **逐字同值（46/46）**；mixinFail 0；cfg `changed=[]`；obf 30,524 B `262BFF5E…` 未动；燧石/黑曜杆 `pool slot=* budget=0 size=0`＋`pool-e`×3（C-1 双门保持） | ✓ |

## §1 A-1（阻断项）护甲载体：`ItemArmor.getEquipmentSlot()` 服务端不存在

**现象**：任何护甲件进入附魔台 → 服务端线程抛 `NoSuchMethodError`，整次装配中断，物品不附魔、不扣费、不留行；异常被 `Util.runTask` 吞掉，服务器继续运行（不产生 crash 报告）。

```
[EnchLog] pool item=etim:helmet_mithril budget=100 adj=82 start [server]
Error executing task
java.util.concurrent.ExecutionException: java.lang.NoSuchMethodError:
  net.minecraft.item.ItemArmor.getEquipmentSlot()Lnet/minecraft/inventory/EntityEquipmentSlot;
    at io.github.etim.etim.combat.ETIMEnchantPool.armorSlot(ETIMEnchantPool.java:170)
    at io.github.etim.etim.combat.ETIMEnchantPool.canEnchantR196(ETIMEnchantPool.java:199)
    at io.github.etim.etim.combat.ETIMEnchantPool.mapData(ETIMEnchantPool.java:415)
```

**根因**：`src/main/java/io/github/etim/etim/combat/ETIMEnchantPool.java:170` 的
`armorSlot(Item, EntityEquipmentSlot)` 调 `((ItemArmor) item).getEquipmentSlot()`；该无参方法在 1.12.2 是
**`@SideOnly(Side.CLIENT)`**（`build/rfg/minecraft-src/java/net/minecraft/item/ItemArmor.java:103-108`），专用服务端类里根本没有它 —— 专服 `NoSuchMethodError`。
`armorSlot` 只在 `item instanceof ItemArmor` 时求值（短路），故**剑/镐/锤/杆全部正常，护甲整族失效**。

**影响面（实测计数）**：`table` 窗 6 个护甲臂 × 90 次 = **540 次装配全部中断**（540 条 `Error executing task`／1080 条 `NoSuchMethodError`／0 pick）；连带 W-DP9 护甲四臂、W-DP10 protection 族、W-DP2 胸甲臂、W-DP8 护甲槽（怪装门对每只带甲怪必抛）。

**建议修复（1 行，双端安全）**：
```java
return item instanceof ItemArmor && ((ItemArmor) item).armorType == slot;   // public final 字段
```
（等价替代：`Item.getEquipmentSlot(new ItemStack(item))`。）

**判**：**A 级打回**。修复后最小重验集：W-DP9 护甲四臂（胸/头盔/腿/皮甲）＋W-DP10 胸甲对（protection×fire=0、protection×feather>0）＋W-DP2 胸甲臂＋W-DP8 全臂＋全窗钉值刷新；非甲面证据（§2–§5、§7–§10）可按本轮承接，若主会话要求整窗重跑另排。

## §2 W-DP1 九步装配（不变量核讫）

| 件 | build | pick | 直方(1/2/3) | adj 递推违例 | 末值≠末 pick adj | maxPicks |
| --- | --- | --- | --- | --- | --- | --- |
| `etim:fishing_rod_copper`（0/7/12 书） | 80 | 120 | 49/22/9 | 0 | 0 | 3 |
| `etim:fishing_rod_mithril`（7/10 书） | 80 | 137 | 36/31/13 | 0 | 0 | 3 |
| `etim:war_hammer_copper` | 90 | 215 | 9/37/44 | 0 | 0 | 3 |
| `etim:sword_copper` | 92 | 195 | 19/43/30 | 0 | 0 | 3 |
| `etim:pickaxe_copper` | 90 | 194 | 17/42/31 | 0 | 0 | 3 |
| 护甲 6 臂 | 90×6 | **0** | 0×90 | —（A-1 中断） | — | — |

- 逐 pick 核讫：`adj_next = adj_prev − cost − 5` **434/434 精确**；`cand=end` 打印的 adj 与末 pick 的 adj **434/434 相同**；`adj<5` 与 `picks>2` 两个断点均出现在样本里；**硬顶 3 枚成立（无 4 pick）**。
- 级降骰：L 分布覆盖 1..5（`sword Lhist 1:62 2:41 3:37 4:17 5:38`、`pickaxe 1:60 2:53 3:29 4:13 5:39`），即经济可及的高级别未取满时出现了低级别样本（R196 :299-300 的降级分支生效）。
- 池探针（`/etest enchantprobe <slot> pool`）台面三槽 `budget/size`（17 件在册）：铜杆 6/2・11/2・30/4；剑 5/7・16/10・30/10；战锤 6/3・10/3・30/5；镐 9/3・11/3・30/5；燧石/黑曜杆 **0/0 ×3 + pool-e×3**。

## §3 W-DP3 台面预算（D-A 甲）实测

| 件 | 书 | books | power | levels | frac(slot1/2/3) | out(slot1/2/3) |
| --- | --- | --- | --- | --- | --- | --- |
| 铜杆 E=30 | 0 | 0 | 4 | 4 | 0.383/0.623/1.000 | 2/2/4 |
| 铜杆 E=30 | 7 | 7 | 32 | 31 | 0.424/0.713/1.000 | 13/22/**31** |
| 铜杆 E=30 | 12 | 12 | 52 | 41 | 0.264/0.640/1.000 | 11/26/**41** |
| 铜杆 E=30 | 24 | 24 | 100 | 53 | 0.337/0.635/1.000 | 18/34/**53** |
| 秘银杆 E=100 | 7 | 7 | 32 | 32 | 0.367/0.747/1.000 | 12/24/**32** |
| 秘银杆 E=100 | 10 | 10 | 44 | 44 | 0.342/0.656/1.000 | 15/29/**44** |
| 秘银杆 E=100 | 24 | 24 | 100 | 100 | 0.405/0.604/1.000 | 41/60/**100** |
| 燧石杆 E=0 | 7 | — | — | — | — | 0 行（`out=none (ench 0)`） |

- 全窗 4,278 条 level 行：`power=(1+books)×4` **0 违例**；slot3 `out=levels` **0 违例**；slot1/2 分数 **0 条越出 ±0.1 抖带**；`out=max(round(levels×frac),1)` 在打印精度（3 位）容差内 **0 条不可解释**（43 条需 ±0.0005 容差 → C-7）。
- 书架扫描为 R196 5×5 开廊形（12 可达格/层），实测 7/12/24 三档均精确回读。

## §4 W-DP4 L4/L5 可达（真附魔 40 次/臂）

| 件 | 书 | build | pick | L 集合 | 判 |
| --- | --- | --- | --- | --- | --- |
| 铜杆 E=30 | 7 | 40 | 57 | 1,2,3,**4** | ✓ |
| 铜杆 E=30 | 12 | 40 | 63 | 1,2,3,4,**5** | ✓ |
| 秘银杆 E=100 | 7 | 40 | 61 | 1,2,3,**4** | ✓ |
| 秘银杆 E=100 | 10 | 40 | 76 | 1,2,3,4,**5** | ✓ |
| 燧石杆 E=0 | 7 | 0 | 0 | — | ✓（永不可达） |

## §5 W-DP5 学费与门（丙默认／乙开关）

| 臂 | 实测 | 判 |
| --- | --- | --- |
| 丙 ① 点数足（`/etest level 0` → `xp 1600`，shown=16） | `[EnchLog] fee cost=1600 pool=0` ＋ `apply slot=3 picks=1`（费用从单一经验池扣到 0） | ✓ |
| 丙 ② 差 1 点（1599） | `fee slot=3 cost=1600 pool=1599 gate=deny`，无 apply | ✓ |
| 丙 ③ 青金石 0 | **未采到 denyLapis**（工装把青金石"移出"时热键槽仍有同物 → 换位回填；见 C-4），代码锚在册 | ◐ |
| 乙（`enchantLapisRequired=false`） | 零青金石 + 1600 点 → `apply slot=3 picks=1` ＋ `fee cost=1600 pool=0`，0 deny | ✓ |
| 等级门（B-9 位） | 行为面：判据只读 `player.experienceTotal`，fee=1600 恰好成功/1599 deny（费用按点数而非等级计）；等级门删除为代码锚（`MixinContainerEnchantment.enchantItem` HEAD：`experienceTotal < fee`） | ✓（代码锚） |

## §6 W-DP6/W-DP7 特例与书池

- 水瓶（`minecraft:potion:0`）→ `special kind=water fee=200`，槽物变 `experience_bottle`。
- 金苹果（`minecraft:golden_apple:0`）→ `special kind=apple fee=200`，槽物变 `golden_apple` **meta=1**。
- 书 → `book picks=1 keep=minecraft:projectile_protection:1`，槽物 `enchanted_book`（`StoredEnchantments` 列表）。书 `getItemEnchantability()=1` ⇒ `altered(100,1)=2`，R196 账面本就只能出 1 枚，故"恰 1 条"在本批不可区分（C-5）。

## §7 W-DP9 载体矩阵（功能面，90 次/臂；id→名按 `pool reg` 表）

| 件 | 出现的附魔（次数） | 关键缺席 | 判 |
| --- | --- | --- | --- |
| `etim:war_hammer_copper` | smite 56／unbreaking 55／stun 53／knockback 47／mending 2／vanishing 2 | **sharpness 0**、efficiency 0、silk 0、fortune 0 | ✓ |
| `etim:sword_copper` | sharpness 72／looting 67／disarming 15／bane 12／fire_aspect 12／sweeping 7／mending 4／vampiric 3 | **smite 0／knockback 0／unbreaking 0／silk 0** | ✓ |
| `etim:pickaxe_copper` | efficiency 90／unbreaking 58／fortune 18／silk_touch 10／mending 8／etim:piercing 7／vanishing 3 | sharpness 0／smite 0 | ✓ |
| `etim:chestplate_mithril` | **A-1 中断（0 pick / 90 次）** | protection／fire／feather／blast／proj／thorns／unbreaking 全不可测 | ✗ |
| `etim:chestplate_copper` | 同上 | 同上（金属胸 blast/proj 面） | ✗ |
| `minecraft:leather_chestplate` | 同上 | 皮革胸 blast/proj **false** 面 | ✗ |
| `etim:helmet_mithril` | 同上 | thorns **false**（头不是胸）／respiration／aqua | ✗ |
| `etim:leggings_mithril` | 同上 | free_action 池成员／unbreaking 金属甲 | ✗ |
| `minecraft:leather_leggings` | 同上 | unbreaking **false**（非金属甲） | ✗ |

- 说明：`pool reg` 的 `table=` 列是 **1.12 `canApplyAtEnchantingTable` 面**（如 smite 在剑上=true、unbreaking 在剑上=true），**不是** R196 载体面，故 W-DP9 只能按"真机池成员"判（本表即该判法）；这正是 §7 与 reg 列表面看似矛盾的根因（C-2）。
- 另：`minecraft:shears` / `etim:knife_flint` 的 `getItemEnchantability()=0` ⇒ 台面预算恒 0，silk 的剪刀/刀载体面在本批**不可功能观测**（代码锚 `ETIMEnchantPool.canEnchantR196` silk 分支），登记 C-3。

## §8 W-DP10 互斥族（同批真机 sample）

| 对 | 剑 92 build | 镐 90 build | 判 |
| --- | --- | --- | --- |
| sharpness+smite | 0 | —（smite 非镐载体） | ✓ |
| sharpness+bane_of_arthropods | **0** | — | ✓（伤害三杀族生效） |
| smite+bane_of_arthropods | 0 | — | ✓ |
| looting+silk_touch | 0 | — | ✓（方向性：picked=looting 时剔 silk） |
| silk_touch+fortune | — | **0** | ✓ |
| fortune+silk_touch | — | **0** | ✓ |
| protection+fire_protection | **受阻（A-1）** | — | ⊘ |
| protection+feather_falling（例外面） | **受阻（A-1）** | — | ⊘ |

## §9 W-DP11/W-DP12/W-DP-CFG

- `etim:free_action`：`id=38`、`weight=5`（1.12 rarity 面）、`rw=25`、`rwindow=L1=1/10 L2=11/20 L3=21/30 L4=31/999` ⇒ **diff 10／cap 4／uncommon 权 25**（D-C 甲收编面精确）。
- 注册表 47 行（46＋free_action）；`[EtimInit] …ids=14 15 23 24 25 26 27 28 29 30 31 36 37 38`（B-1 修复后尾两位 37/38 已打印）。
- pool 总开关 false：真台面 0 条 `[EnchLog] pool … start`；vanilla 池照旧产出（NBT 多枚，含剑上 knockback L2/L3），`mixinFail=0`。
- `treeFellingMaxLevel=5`：`window=L1=10/15 … L5=50/55`（1.12 面）、`rwindow=L1=1/10 L2=11/20 L3=21/30 L4=31/40 **L5=41/999**`。
- `freeActionMaxLevel=1`：`window=rwindow=L1=1/999`（单级）；`/etest enchant` 无 freeAction 令牌，2 级拒面未直接采（C-6）。

## §10 W-DP-REG（零回归）

- 通道：Melee／Mining／Farm／Butch／Arrow 四窗合计 **0 行**；`[EnchLog]` 仅本批动作行（main 23／table 见 §2／fee 26／cfg 0）。
- pool 前窗：上批判窗 `f5-wb-main-evidence.json` 的 46 枚 `window=` 与本次 **逐字同值 46/46**。
- mixinFail 0；cfg 每窗收口 `changed=[]`（235 键/44,173 B 复值 `90652ABD…4E9A`）；obf cfg 30,524 B `262BFF5E…C9AD` 未动；端口 0；crash 20（零新增）；末窗 stop exit 0＋BUILD SUCCESSFUL。
- fishing C-1 双门：燧石/黑曜杆 `pool slot=0/1/2 budget=0 size=0` ＋ `pool-e`×3（台面零报价保持不变）。

## §11 未跑／受阻清单（不补白）

1. **W-DP2** 真机分布臂（diamond 剑／胸甲 bulk χ²）——A-1 打回后随重验补。
2. **W-DP8** 怪装门——与 A-1 同源（护甲槽必抛）；本轮只完成机制预备（spawn egg 通道 + `time set` 拉 `worldTime` 使 tension≈0.875 的工装已就位）。
3. **W-DP9** 护甲四臂／**W-DP10** protection 族——A-1。
4. **W-DP5 ③** 青金石 deny 臂——工装换位回填（C-4），代码锚在册。
5. **silk→剪刀/刀** 功能面——E=0 不可上表（C-3）。
6. 纯客户端面（附魔名 tooltip、台面预览火漆、音效）——按纪律转用户操作。

## §12 冲突分级

- **A 级 1**：**A-1**（§1）护甲载体 `getEquipmentSlot()` 专服不存在 → R196 池对护甲整树失效；1 行修复（`armorType` 字段）。
- **B 级 0**。
- **C 级 7**：
  - **C-1（`pool reg` 的 `table=` 列不是 R196 载体面）**：该列打印 1.12 `canApplyAtEnchantingTable`，与池内 `canEnchantR196` 多处分歧（smite/knockback/unbreaking/mending/sweeping 在剑上=true，池内=false）。W-DP9 只能按"真机池成员"判；建议后续把该列改为 `ETIMEnchantPool.canEnchantR196(...)`（1 行，判读面）。
  - **C-2（任务书 W-DP2「common 52.8%」不可复现）**：本窗模型/实测按同池给不出 52.8%（剑 37.5%、镐 46.4%、战锤 w25 四枚各 22–26%）；判据以"同一行 rw 权重表 + 真机分布"为准，52.8% 疑为对照报告另一定义（候选集含 knockback/unbreaking 等）。待主会话确认口径。
  - **C-3（silk 剪刀/刀面不可功能观测）**：1.12 剪刀/刀 `getItemEnchantability()=0` ⇒ 台面预算恒 0；载体面仅代码锚（`ETIMEnchantPool.canEnchantR196` silk 分支）。
  - **C-4（W-DP5 ③ 工装失误）**：把青金石"移出"用的是容器槽↔热键槽换位，而热键槽本身有同类物品 → 回填而非清空，故未采到 `lapis=1 gate=deny`；代码锚 + ① ② 两臂已足判点数门，青金石门待重验补（改用 `/clear <p> minecraft:dye -1 4`）。
  - **C-5（书"恰 1 条"不可区分）**：书 `getItemEnchantability()=1` ⇒ `altered(100,1)=2`，R196 账面预算本就只够 1 抽；`picks=1 keep=…` 与 NBT 单条一致，但无法构造 N>1 的 keep-one 面。
  - **C-6（W-DP-CFG 尾格口径 + 令牌缺位）**：任务书「treeFellingMaxLevel=5 → 窗口 L5=41/49」实测为 **41/999**（`level>=cap` 走 999 冲刷；cap=10 时才是 41/50，49 与代码两处均不符，差 1 且口径不同）；另 `/etest enchant` 无 `freeAction` 令牌，2 级拒面只能靠 `window` 收缩间接判。
  - **C-7（`frac` 列 3 位打印截断）**：4,278 条 level 行中 43 条 `out` 与"3 位 frac × levels"对不上，容差 ±0.0005 后 0 条不可解释 —— 纯打印精度，非判值偏差。

## §13 自报（机械核讫）

> 文件：`testharness/reports/d1pool-DP-verdict.md`｜字节五项：`size 20,594 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 189（split 行数 190）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> > SHA-256 甲（全档零位）`0000000000000000000000000000000000000000000000000000000000000000`
> SHA-256 乙（LF 归零零位）`0000000000000000000000000000000000000000000000000000000000000000`
> SHA-256 丙（行链零位）`0000000000000000000000000000000000000000000000000000000000000000`
> 判格 14＝✓ 10／✗ 1／◐ 1／⊘ 2｜臂面：载体探针 17 件／九步 434 build／预算 4,278 level 行／可达 4 臂／载体 9 臂（甲 6 臂 0 产出）／特例 2＋书 1／学费 5 臂／REG 5 窗｜钉值：5 判窗 boot＋1 冒烟／0 rebuild／0 客户端／0 产品码｜冲突 新增 **A1** B0 C7。
