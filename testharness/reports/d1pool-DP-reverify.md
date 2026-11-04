# 六期 D-1 附魔池批（B7）**W-DP · A-1 修复重验**回执 · R196 附魔池重锚

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-04（CST）｜**窗口形态**：**3 判窗 boot**（`armor`＝R1 护甲载体矩阵＋R5 非甲回归／`bulk`＝R3 胸甲 200,000 抽＋R2 靴 6,000 抽／`mob`＝R4 怪装门 480 只）＋**1 次作废洪泛试跑**（不计分，见 C-9）；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`13,122 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 15 / ✗ 3｜101 行`
> **判决源**：条 279 A-1 修复（`armorSlot` 改读 `ItemArmor.armorType` 字段）＋条 277 终审面（A-6 候选集／B-17 unbreaking 停 3／B-18 mixin 64+10／B-19 单表落法）
> **钉值**：HEAD **`7e50a6c`**（窗内零提交）｜release 936,718 B `CF679785…94A9`｜dev 918,140 B `E4988B61…6E87`｜sources 854,068 B `D64064FB…ABDD`｜refmap 双树 69 类键／159 面（318）｜mixins 64＋client 10｜cfg 44,173 B／235 键／`90652ABD…4E9A`｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**PASS**（R1–R5 全 ✓）；新增 **A 0／B 0／C 3**（C-8／C-9／C-10）
> **一句话**：`armorSlot` 改读 `armorType` 后护甲整族在专服恢复——7 件护甲 910 次抽 **2,074 pick**、三窗 **0 条 `NoSuchMethodError`／0 条 `Error executing task`**；20 万胸甲抽 `protection×fire=0`、6,000 靴抽 `protection×feather=3,485`、χ²=12.23／df=11；480 只僵尸怪装门合池 **8.91%**（预期 0.1×0.875=8.75%，1.12 旧双门 21.9%／43.8% 被排除）；非甲四件 `pool reg` 47 行与首轮**逐字同值**。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1** 护甲载体（DP9 甲面） | `d1-wb-rev-armor.out`：7 件 ×130＝910 build／2,074 pick | 胸甲 protection/fire/blast/proj/thorns/endurance/regeneration/unbreaking∈；feather/respiration/aqua∉；皮革胸 blast/proj/unbreaking∉；头 respiration/aqua∈、thorns∉；靴 feather∈；腿 blast/proj∈、thorns∉；皮革腿 unbreaking/blast/proj∉ | 七臂**全项命中**（§2 表）；`adjBad=0`／`maxPicks=3`；**0 条 `NoSuchMethodError`、0 条 `Error executing task`** | ✓ |
| **R2** DP10 protection 族 | 胸 200,000 build／靴 6,000 build | protection+fire **0**；protection+feather **>0**（例外面，靴） | 胸：protection+fire／+blast／+proj 全 **0**（fire+blast 亦 0）；靴：protection+feather **3,485** 次（protection+fire **0**） | ✓ |
| **R3** DP2 胸甲分布 | `d1-wb-rev-chest.out` 200,000 build／256,485 pick | 模型↔真机 χ²；逐枚份额对表 | χ²=**12.23**／df=**11**（p≈0.35）；protection 37.99%（模型 37.94%）／unbreaking 21.53%（21.52%）／proj 9.53%（9.54%）／fire 9.52%（9.41%）／blast 9.45%（9.50%）／endurance 5.93%（6.01%）／regeneration 2.95%（2.93%）／thorns 2.86%（2.90%） | ✓ |
| **R4** DP8 怪装门 | `d1-wb-rev-mob.out`：480 只 `/summon` | 0.1×tension 单门；budget=(int)(5+f·r(18))；旧双门（0.25／0.5）消失 | tension **0.88**×480 行；带装备 46 只；主手 24 件/1 附＝4.17%；护甲 77 件/8 附＝10.39%；**合池 9/101＝8.91%**（预期 8.75%）；budget 10 行 ∈[5,19] 全落 [5,20]；2 条 conflict 行 | ✓ |
| **R5** 非甲不回归 | 四件探针＋四短臂；五通道行计数 | reg 行逐字同值；载体面同集；五通道 0 | `pool reg` **47/47 行逐字同值**（对照首轮 `d1-wb-main.out`）；剑无 smite/knockback/unbreaking、锤无 sharpness、镐无 sharpness/smite、杆无 sharpness 全保持；Melee/Mining/Farm/Butch/Arrow **全 0**；mixinFail 0；cfg `changed=[]` | ✓ |

> 判格 5＝**✓ 5／✗ 0**。A-1 的三条受阻位（DP9 甲面／DP10 族／DP2 胸臂）与 DP8 全部落判。

## §1 A-1 归零证据（三窗机械计数）

| 窗 | build | pick | `NoSuchMethodError` | `Error executing task` | 备注 |
| --- | --- | --- | --- | --- | --- |
| `armor`（R1 七臂＋R5 四臂） | 910＋240 | 2,074＋521 | **0** | **0** | 护甲 7 件全部产出 |
| `bulk`（R3 胸甲） | 200,000 | 256,485 | **0** | **0** | 全程 96 build/s 自限速 |
| `bulk`（R2 靴） | 6,000 | 17,920 | **0** | **0** | — |
| `mob`（R4） | 10（怪装抽） | — | **0** | **0** | 10 次均走同一 `armorSlot` 分支 |

- 修复位实测形态：`ETIMEnchantPool.java:173-174` → `return item instanceof ItemArmor && ((ItemArmor) item).armorType == slot;`（javadoc `:169-172` 记 `@SideOnly(CLIENT)` 与条 279 锚）。
- 对照首轮：护甲 6 臂 540 次全中断（0 pick、540 条 `Error executing task`、1,080 条 `NoSuchMethodError`）→ 本轮同为护甲面 **2,074 pick、0 异常**。

## §2 R1 护甲载体矩阵（130 抽/臂；名后数字＝pick 次数）

| 件 | build | pick | 出现的附魔（只列关键面） | 缺席面（预期 false） |
| --- | --- | --- | --- | --- |
| `etim:chestplate_mithril` | 130 | 385 | unbreaking 108／protection 71／endurance 41／regeneration 40／thorns 36／proj 21／fire 19／blast 19／mending 13 | **feather 0／respiration 0／aqua 0** |
| `minecraft:leather_chestplate` | 130 | 183 | protection 98／endurance 28／fire 22／thorns 19／regeneration 11 | **blast 0／proj 0／unbreaking 0／feather 0** |
| `etim:helmet_mithril` | 130 | 390 | unbreaking 120／protection 108／respiration 51／aqua 51／fire 22 | **thorns 0／feather 0／blast 0** |
| `minecraft:leather_helmet` | 130 | 164 | protection 97／fire 26／respiration 26／aqua 7 | **thorns 0／unbreaking 0** |
| `etim:boots_mithril` | 130 | 387 | feather 116／protection 98／unbreaking 80／fire 28／speed 19／depth_strider 9／frost_walker 8 | **thorns 0／blast 0／proj 0** |
| `etim:leggings_mithril` | 130 | 389 | unbreaking 120／free_action 116／protection 84／proj 19／blast 17 | **thorns 0／feather 0／respiration 0** |
| `minecraft:leather_leggings` | 130 | 176 | protection 88／free_action 57／fire 25 | **unbreaking 0／blast 0／proj 0** |

- 判读锚：`ETIMEnchantPool.canEnchantR196`（`:181-266`）的载体分支与真机池成员**逐项一致**；`armorType` 字段与服侧装备槽同源，故 `FEET/LEGS/CHEST/HEAD` 四向分派全部正确。
- 附带命中：`etim:endurance`／`etim:regeneration` 只在胸甲出现（`:44-45` 的 `armorType == CHEST` 面），头盔/腿/靴 0 次；`free_action` 只在腿（id 38，rw=25）。

## §3 R2 DP10 protection 族（真机同件同 build）

| 对 | 通道 | 次数 | 判 |
| --- | --- | --- | --- |
| protection + fire_protection | 胸甲 200,000 build | **0** | ✓（族互斥） |
| protection + blast_protection | 胸甲 200,000 build | **0** | ✓ |
| protection + projectile_protection | 胸甲 200,000 build | **0** | ✓ |
| fire_protection + blast_protection | 胸甲 200,000 build | **0** | ✓ |
| **protection + feather_falling** | **靴 6,000 build** | **3,485** | ✓（R196 例外面：任一 protection 族 picked 时 feather 仍可进） |
| protection + fire_protection | 靴 6,000 build | **0** | ✓（例外面不破族互斥） |
| protection + unbreaking | 胸 21,444／靴 3,022 | >0 | 对照（非族对，应共存） |

## §4 R3 DP2 胸甲分布（200,000 抽，24 书台面）

- 台面 pin：`level slot=3 books=24 power=100 levels=18 frac=1.000 out=18`——钻石胸 E=10 ⇒ `altered(100,10)=18`，故全窗 `budget=18`（200,000/200,000 同值）。
- 抽出 256,485 pick；pick 数直方 1＝148,633／2＝46,249／3＝5,118；`maxPicks=3`；`adj` 递推 0 违例、`cand=end` 末值 0 违例。
- 候选集（budget 18 可达）**8 枚/权 215**：protection 100、fire 25、blast 25、proj 25、unbreaking 25、thorns 5、endurance 5、regeneration 5；mending／vanishing_curse／binding_curse（各 2/1/1）需 `adj≥21` 才进池，故只占 292/146/146 次。
- 模型↔真机：χ²=**12.23**（df=11，p≈0.35）；`protection` 份额 **0.3799** vs 模型 **0.3794**。**任务书「common 52.8%」仍不可复现**（见 C-2 承接与 C-8 权重口径）。

## §5 R4 DP8 怪装门（B-13）

- 工装：`difficulty 3` ＋ `time set 1536000`（worldTime 恰 64 天 ⇒ moon factor 1.0、`f1=0.25`）⇒ `clamped=0.875`，日志 `tension=0.88` ×**480** 行（另有 6 行 `tension=0.00` 落在首只召唤之前，为启动期残存自然怪，已排除在样本外）。
- 样本：480 只中 46 只带任意装备；主手 24 件中 1 件带附魔（4.17%）；护甲 77 件中 8 件带附魔（10.39%）；**合池 9/101＝8.91%**，Wilson 95% CI 约 **[4.8%, 16.1%]**，预期 `0.1×0.875=8.75%` 落于区间内。
- 排除项：1.12 旧双门 `0.25×f=21.9%`（主手）与 `0.5×f=43.8%`（护甲）均在合池 CI 外 ⇒ **单门成立**（主手臂 n=24 单看为边际，判据以合池 101 件为主口径）。
- budget 面：10 条怪装 `pool … budget=` 行 ∈[5,19]，全部落在 `(int)(5+0.875·r(18))` 的 [5,20] 区间（10/10）。
- 族面：mob 窗 2 条 `conflict dropped` 行（皮革/锁甲 protection×fire 面），说明护甲槽确走完整九步。

## §6 R5 非甲回归与零回归

- `pool reg` 47 行与首轮 `d1-wb-main.out`（`081b7c5` 窗）**逐字同值 47/47**（含 `rw=`／`rwindow=` 两新列）——短路序未动，非甲载体面不受 A-1 修复影响。
- 非甲四短臂（60 抽/臂）：剑 126 pick（sharpness 38／looting 52／bane 18／fire 5／sweeping 3／vampiric 4／disarming 2，**smite/knockback/unbreaking 0**）；镐 136（efficiency 59／unbreaking 42／fortune 17／silk 5／piercing 6）；锤 134（smite 31／knockback 31／stun 34／unbreaking 35，**sharpness 0**）；铜杆 125（fishing_fortune 59／unbreaking 41／lure 10／luck 8）。
- 五通道：Melee／Mining／Farm／Butch／Arrow **全 0 行**；`mixinFail=0`（三窗）；ids `14 15 23 24 25 26 27 28 29 30 31 36 37 38` 与首轮同值；`pool reg` 47 行含 ETIM **17 枚**。
- 收口：cfg 44,173 B／235 键／`90652ABD…4E9A`（三窗 `changed=[]`，`enchantDebugLog` 已复位 false）；obf 30,524 B `262BFF5E…C9AD` 未动；端口 0；各窗 `stop` exit 0＋`BUILD SUCCESSFUL`；jar 三件起收同值。

## §7 冲突分级

- **A 级 0**（A-1 已闭环：三窗 0 异常／2,074 甲面 pick）。
- **B 级 0**。
- **C 级 3（本轮新增）**：
  - **C-8（A-6「胸甲 8 枚/权 235」实测为 8 枚/权 215）**：budget 18 下可达 8 枚与 A-6 的枚数一致，但权重和实测 215（protection 100＋fire/blast/proj/unbreaking 各 25＝200＋thorns/endurance/regeneration 各 5＝15）；235 与任何 8 枚子集都对不上（疑把 thorns 记成 25）。全池 11 枚权重和 219。填充口径待主会话裁决；不影响 χ² 判（模型与真机同表）。
  - **C-9（工装洪泛→ServerHangWatchdog，非产品缺陷）**：首轮 bulk 试跑以 500/s 灌包，服务器单 tick 积压 3 万余次附魔 ⇒ `crash-2026-11-04_15.48.54-server.txt`（"single server tick took 60.18 seconds"，23,935 B `8A108C74…`）。改用**自限速闭环**（每批 12 条、等 build 计数追上再发、积压 >60 即暂停）后 200,000 抽全程 96 build/s、零积压、零新 crash。**crash 计数 20→21 的唯一增量即此条**，登记为工装面，不入产品缺陷。
  - **C-10（怪装门工装通道：spawn egg → `/summon`）**：`use_item` 通道需客户端射线命中方块（首试 0 生成、0 tension 行）；改 `summon minecraft:zombie <x> <y> <z>`（`CommandSummon:119-121` 对 `EntityLiving` 显式调 `onInitialSpawn`，与自然生成同源）后 480/480 命中。任务书「spawn egg＋time set 1530000」两处需订正：通道改 `/summon`，`worldTime` 用 **1536000**（1530000 落在 moon phase 7，clamped 只有 0.78，日志会打 `0.78` 而非 `0.88`）。
- **承接上轮 C**：C-1（`table=` 列是 1.12 面）／C-2（52.8% 口径）／C-3（silk 剪刀·刀 E=0）／C-4（青金石 deny 工装）／C-5（书 E=1）／C-6（treeFelling 尾格 41/999＋无 freeAction 令牌）／C-7（`frac` 3 位截断）状态不变，本轮不重测。

## §8 自报（机械核讫）

> 文件：`testharness/reports/d1pool-DP-reverify.md`｜字节五项：`size 13,122 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 100（split 行数 101）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`982B9D6FAA16582258B0E85740A0566A919EA822951FA63BBF47688F508E37EB`
> SHA-256 乙（LF 归零零位）`982B9D6FAA16582258B0E85740A0566A919EA822951FA63BBF47688F508E37EB`
> SHA-256 丙（行链零位）`030843F5E8F009B2A288C52BD60741AB708B9DA8105BB3F636EE71FDA4E53BC5`
> 判格 5＝✓ 5／✗ 0｜臂面：护甲 7 件×130（2,074 pick）／胸甲 200,000（256,485 pick）／靴 6,000（17,920 pick）／怪装 480 只／非甲四探针＋四短臂／reg 47 行｜钉值：3 判窗 boot＋1 作废试跑／0 rebuild／0 客户端／0 产品码｜冲突 新增 **A0** B0 C3。
