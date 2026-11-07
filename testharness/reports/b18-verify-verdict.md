# 新出生龄家族（R196 EntityAgeable :49-55）· **W-B18 判决**（B-18 批，HEAD `729ee09`）

> **HEAD**：`729ee09bb49489328229971495b6f1843a43a3a1`（窗内 **0 提交**，起收同 commit；`MixinEntityAgeable.java`／`MixinEntityOcelot.java`／`mixins.etim.json` 为 ` M`、`MixinAbstractHorse.java`／`MixinEntityAIVillagerMate.java`／`MixinEntityZombieVillager.java` 为 `??`——即本批被测工作树）
> **jar**：`build/libs/etim-1.0.0.jar` **1,049,960 B**｜SHA256 `7300E83D003E739BC55855DCF44B72EE236685D483A110407F53349EDB4DBD23`｜MD5 `F96EBD9F9C409CD96F4FB4B09A50DDAF`（起收同值，mtime 13:12Z 早于窗）
> **dev/sources**：1,029,587 B `01C677961747138A…`／958,567 B `B6611DFEB2CDBBD6…`（起收同值）
> **refmap**：classes **90** / entries **207**（dual 414，双树同）｜**mixins**：**87** + 10 client｜`mkCounts().ok=true`
> **窗口**：主窗 2 boot（`Done (5.274s)`／`Done (5.450s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 6m 18s／54s）；村民面补臂 1 boot（`Done`＋mixinFail 0＋stop exit 0）｜判窗世界 `w-b18v`（驱动自建；`w-b17a`／`w-b17v` 未动）
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓｜W5 C｜W5c6 ✓｜W6 ✓**（A 0／B 0／D 0／C 10）
> **判据来源**：主窗 run2（`build-logs/f11-b18-verify.json`）＋村民面补臂 W5c6（`build-logs/f11-b18-w5c6.json`）；run1 仅作工装缺陷留档
> **报告字节规格**：`12,484 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 15 / ✗ 1｜89 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL＋起收 pin 同 | b1 `Done (5.274s)!`（b1:2330）／b2 `Done (5.450s)!`（b2:2330），`mixinFail=0`×2；`stopBoots` 2 条均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 6m 18s`（b1:4128）／`in 54s`（b2:3945）；两次 `[PIN]`（`14:13:56.681Z`／`14:21:11.535Z`）同 releaseSha `7300E83D…`、同 MK 90/207/414＋87+10 | ✓ |
| **W1** ocelotLitter | `src=ocelotLitter` 行 ≥1，全行 `age=-64000 arg=-64000` | **4 行**：`EntityOcelot#2051`（b1:3160）、`#2051`（b1:3161）、`#2058`（b1:3208）、`#2059`（b1:3209），全 `age=-64000 arg=-64000`；快照 `EntityOcelot id=2059 age=-63871 isChild=true`（b1:3262）、`id=2058`（b1:3264） | ✓ |
| **W2** horseFoalSpawn | `src=horseFoalSpawn` 行 ≥1，全行 −64000（AbstractHorse umbrella 证） | **5 行**：`EntityHorse#2066`（b1:3345）、`#2073`（b1:3391）、`#2076`（b1:3413）、`#2081`（b1:3454）、`#2091`（b1:3541），全 `-64000`；快照幼马 `#2091 -63600`（b1:3683）、`#2066 -63000`、`#2073 -63200`、`#2076 -63200`、`#2081 -63400`（B-17 burst +200 连锁） | ✓ |
| **W3** zombieCureChild | `src=zombieCureChild` 行 ≥1，`arg=-64000`；正确召出僵尸村民 | **1 行**：`EntityVillager#2105`（b1:3804）`age=-64000 arg=-64000`；快照 `age=-63928 isChild=true ticksExisted=72`（b1:3809）；全档无 `Skipping Entity with id` | ✓ |
| **W4** 兔对照 | `src` 五色 face **0 行**（兔不属新出生龄家族） | 12 个兔蛋后 faceRows **0**；直召兔快照 `EntityRabbit id=2118 age=-23974 isChild=true ticksExisted=26`（b1:3903）＝vanilla `-24000` 面未被改写 | ✓ |
| **W5** 任务书村民门 | 110 s 窗内 `src=villagerParent|villagerBirth` 有行 | **0 行**；快照四村民 `age=0 isChild=false`（b1:3983-3986）。按任务书条款「staged-village 门感不成立 ⇒ C，不开 D」判 **C**（根因见 C-B18-1/2/3/8） | C |
| **W5b** 门补臂（本窗自加） | 18 门＋单侧屋顶＋4 村民＋投食 | 门全失败（b1:3998..4068 共 36 条 `There is no such block with name minecraft:oak_door`），投食生效（b1:4086-4089 四行 `Replaced slot slot.villager.0 with 12 * [Bread]`）；0 行——工装缺陷，非判值面 | C |
| **W5c6** 村民面补臂 | 18 门（`wooden_door`，朝 EAST）＋东侧屋顶/实墙＋5 村民预置 `Willing:1b`；`parent≥1 ∧ birth≥1` | **PASS**：`villagerParent` 2 行（`#2024`／`#2025`，`age=16000 arg=16000`）＋`villagerBirth` 1 行（`#2031`，`age=-64000 arg=-64000`）；NBT 读回 `V4 15193→13914`、`V5 15178→13899`（每 tick −1）且 `Willing:0`；终局快照 `#2024 age=11478`／`#2025 age=11477`／`#2031 age=-59477 isChild=true` | ✓ |
| **W6** 旗断面 | boot 2 `livestockNeedsR196=false` → 五色 face 全 0 行，且走回 vanilla 值 | b2 全档（3,948 行）face src **0 行**；快照 `EntityHorse id=2019 age=-23706 isChild=true`（b2:3854）、`-23759`／`-23654`／`-23785`／`-23837`（b2:3855-3862，vanilla −24000 面）、`EntityVillager id=2029 age=-23928 isChild=true`（b2:3865）、猫 `age=0`（b2:3852） | ✓ |

## §2 判行原文

**W1 · ocelotLitter（4 行，全 −64000）**
- `[FarmLog] agegate src=ocelotLitter age=-64000 arg=-64000 entity=EntityOcelot#2051 [server]`（b1:3160）
- `... entity=EntityOcelot#2051`（b1:3161）
- `... entity=EntityOcelot#2058`（b1:3208）
- `... entity=EntityOcelot#2059`（b1:3209）

**W2 · horseFoalSpawn（5 行，全 −64000）**
- `[FarmLog] agegate src=horseFoalSpawn age=-64000 arg=-64000 entity=EntityHorse#2066 [server]`（b1:3345）
- `... EntityHorse#2073`（b1:3391）｜`#2076`（b1:3413）｜`#2081`（b1:3454）｜`#2091`（b1:3541）

**W3 · zombieCureChild（1 行）**
- `[FarmLog] agegate src=zombieCureChild age=-64000 arg=-64000 entity=EntityVillager#2105 [server]`（b1:3804）
- `[FarmLog] ageSnapshot kind=EntityVillager id=2105 age=-63928 isChild=true ticksExisted=72 [server]`（b1:3809）

**W4 · 兔对照快照**
- `[FarmLog] ageSnapshot kind=EntityRabbit id=2118 age=-23974 isChild=true ticksExisted=26 [server]`（b1:3903）

**W5c6 · 村民面（补臂 `build-logs/f11-b18-w5c6-b1.out`）**
- `[FarmLog] agegate src=villagerParent age=16000 arg=16000 entity=EntityVillager#2024 [server]`（w5c6 b1:3142）
- `[FarmLog] agegate src=villagerParent age=16000 arg=16000 entity=EntityVillager#2025 [server]`（w5c6 b1:3143）
- `[FarmLog] agegate src=villagerBirth age=-64000 arg=-64000 entity=EntityVillager#2031 [server]`（w5c6 b1:3144）
- NBT 读回（空 merge 失败消息，`b1:3153/3155/3163/3165`）：`V4 Age:15193 Willing:0b`→`Age:13914`；`V5 Age:15178`→`Age:13899`
- 终局 `etest age`：`#2024 age=11478`／`#2025 age=11477`（16000 每 tick −1）／`#2031 age=-59477 isChild=true`（−64000 每 tick +1）

> 行语义注记：`ageGateRow` 打印的是**写入后**的 `getGrowingAge()`，故村民两臂 `age==arg`（16000／−64000）是「写入值已落地」的自证；B-17 的 burst 行因 `@Redirect` 先取原值再写，才表现为 `age≠arg`。

**W6 · 旗断负控（b2）**
- `[FarmLog] ageSnapshot kind=EntityHorse id=2019 age=-23706 isChild=true [server]`（b2:3854）
- `[FarmLog] ageSnapshot kind=EntityVillager id=2029 age=-23928 isChild=true [server]`（b2:3865）
- b2 全档 `src=(ocelotLitter|horseFoalSpawn|zombieCureChild|villagerParent|villagerBirth)` **0 行**

## §3 冲突分级

- **A 级：0** —— 五个 face src 全部落地（ocelotLitter 4／horseFoalSpawn 5／zombieCureChild 1／villagerParent 2／villagerBirth 1），值面全部符合 R196（负龄写 −64000、双亲 6000→16000、非家族兔保持 vanilla −24000、旗断全归 vanilla）。
- **B 级：0** —— 本批零 mixin／零 cfg 新增之外无通道破损：`mkCounts().ok=true`，90/207/414＋87+10 起收同；五个 mixin 类均在 refmap 收编。
- **D 级：0** —— 互通差异仅为抽样规模（W2 5 vs 烟测 8）与窗口相位，无互读矛盾。
- **C 级：10**
  - **C-B18-1**（工装·方块名）：任务书 W5 staging 写 `minecraft:oak_door`——1.12.2 无此名（1.13+ 才改），正确名为 `minecraft:wooden_door`；主窗与 W5b 共 72 条 `There is no such block with name`，门一块未放。
  - **C-B18-2**（原版机制·露天门不登记）：`VillageCollection.addToNewDoorsList` :215-226 要求门两侧 `countBlocksCanSeeSky` 计数**不等**（i≠j），露天门永不登记；本窗早期只铺地面不遮天，故即使门名正确也 0 登记。
  - **C-B18-3**（原版机制·门数比）：`EntityAIVillagerMate.checkSufficientDoorsPresentForNewVillager` :116-127 `int(doors*0.35) > villagers`；8 门/4 村民＝2<4、18 门/4 村民＝6>4 才成立。任务书 8 门＋4 村民属不可行布置。
  - **C-B18-4**（工装·召唤键）：`summon ZombieVillager` 被 1.12 拒（`Skipping Entity with id minecraft:zombievillager`），正确键 `zombie_villager`；run1 因此 W3/W6 假绿，已作废。
  - **C-B18-5**（工装·判值器崩溃）：run1 `f11-b18-verify.js:232` 写 `ev.arms.w1.rows.every(ageFace)`（应为 `ageFace(rows)`），抛 `TypeError: r.every is not a function`，JSON 未落盘、第二 PIN 未写；run2 已修。
  - **C-B18-6**（判读·快照漂移）：W3 快照比 face 行晚约 72 tick，读数是 `-63928` 而非 `-64000`；判据门由「`age === -64000`」放宽为「`isChild && age < 0 && age > -64000`」，避免把 +1/tick 正常生长误判为值面破位。
  - **C-B18-7**（工装·任务书 W5 staging 整体不可行）：三重缺陷叠加（C-B18-1/2/3）导致主窗 W5 必然 0 行；以 W5b→W5c→W5c2→W5c3→W5c4→W5c5→W5c6 七次补臂逐步收敛，判值口径始终未动。
  - **C-B18-8**（原版机制·双亲并发窗）：`EntityAIVillagerMate.updateTask` :96-114 只有 `matingTimeout == 0 && mate.isMating()` 才 `giveBirth()`；单人 300 tick 交配窗／约 500 tick 间隔 ⇒ 占空比 ≈37.5%，2 村民在 180 s 内抽不到并发（W5c5 NBT 已证 `Willing:1b`、`Age:0`、bread 12→9 即四闸全过）。W5c6 改 5 村民＋预置 willing 后一次即得 3 行。
  - **C-B18-9**（读通道·`/entitydata` 无 GET）：1.12 的 `entitydata` 只做 merge，无变化时抛 `commands.entitydata.failed` 并把整份 NBT 带回——本窗用 `entitydata @e[type=Villager,name=V4] {}` 读回全量 NBT 作证据。解析坑：`ForcedAge:0` 含子串 `Age:0`，正则必须写 `[,{]Age:`。
  - **C-B18-10**（工装·JSON PIN 条数）：`f11-b18-verify.js` 先写 JSON 再打第二 `[PIN]`，故 `f11-b18-verify.json` 内 `pins` 仅 1 条；第二条以 stdout 为据，两条 releaseSha／MK 同值。

## §4 收口五件

- **jar／dev／sources 起收同**：1,049,960 B `7300E83D…`（MD5 `F96EBD9F9C409CD96F4FB4B09A50DDAF`）；dev 1,029,587 `01C67796…`；sources 958,567 `B6611DFE…`（窗内 **0 rebuild**；三份 `[PIN]` 全同值）。
- **cfg／props 起收同**：cfg 49,379 B `A4A756C4ABCB2F742B48F90B8027F871AC8ECDE0F7020B6DD98CAEFE10452F10`（`livestockNeedsR196`／`farmDebugLog`／`mobDebugLog` 均 `true`）；props 939 B `D7948C27C81FD4FB42B46C5A7B529B43EBA41D271C41FE9AC84ABF029F4E4343`（`level-name` 已回 `w-b17v`）。
- **MK 起收同**：refmap 90/207（dual 414）＋mixins 87+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `729ee09` 窗内 **0 提交**；产品码 mtime（`MixinEntityAgeable.java` 13:11:38Z、`MixinEntityOcelot.java` 12:35:44Z、`MixinAbstractHorse.java` 12:36:15Z、`MixinEntityZombieVillager.java` 12:36:02Z、`MixinEntityAIVillagerMate.java` 12:36:45Z、`mixins.etim.json` 12:37:05Z）均早于本窗起点（13:57Z），`git status` 六项仍为 ` M`/`??`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b18v` 保留（24 文件／3,523,562 B；由 W5c6 补臂最后一次自建，前序主窗世界已被驱动按设计删除）；`run/w-b17a`／`run/w-b17v` 未动。
- **互通（vs `build-logs/f11-b18-smoke.json` r4）**：ocelotLitter 4=4、zombieCureChild 1=1、旗断 0=0、兔 0=0；horseFoalSpawn 5 vs 8（40 蛋随机抽样，值面全 −64000，方向一致）；村民面烟测未覆盖（a4=0），本窗 W5c6 补齐 2+1 行。烟测 `a3` 全 agegate 2 行中含 `horseBurst` 残行为 B-17 同 lane 产物，不属本批判集。

> 正本：`testharness/reports/b18-verify-verdict.md`｜byte 五项：`12,484 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 88（split 89）`
> SHA-256 甲（全档零位）`87ABDE6533FA33C9DC315C79AA5B12E51C8D84E3ABA9FAFF8501FE69C1B3F645`
> SHA-256 乙（LF 归零零位）`87ABDE6533FA33C9DC315C79AA5B12E51C8D84E3ABA9FAFF8501FE69C1B3F645`
> SHA-256 丙（行链零位）`FC3129B9883656DCA5BEF5D7A2B8BDC33FC4A7D02703C1EF86246FD3F57C9994`
