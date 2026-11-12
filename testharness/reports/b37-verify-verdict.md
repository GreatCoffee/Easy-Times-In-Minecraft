# R196 选射击位（SeekFiringPosition / face）**W-B37 判窗**（HEAD `14fce58`）— **W0–W4 全 PASS**

> **结论先行**：b37-build1 在双 boot 判窗下全绿——狙窗臂 `firingpos src=skeleton start` 起手 **2 次**（`spot=(-54,67,241)`、`spot=(-46,67,240)`，均 `players=1`），伴随 probe-in 25 次；旗断臂 `firingpos` 全档 **0** 条。**`bad=0`，EXIT=0。**
> **HEAD**：`14fce58bcddf1e202c6aacdf8c0f936e9388c65c`，窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-12T12:37:38Z` 起收未变。
> **jar**：1,153,535 B `23B822B3AAD8099125C0E6D702CC1BEEFA68F49EC3E38672A2EDB50CD0DAA03E`（b37-build1，起收同）；dev 1,131,637 B `94BBC2BD…1B207258`；sources 1,056,727 B `8D88770D…EB5D2922`。
> **MK**：refmap **100/229/458**（dual 458，双份同）、mixins 98+10、`ok=true`（起收同）。
> **驱动**：`testharness/player/f11-b37-verify.js`（201 行，`node --check` 绿；`SKELETON_HOME='-61.5 67 240.5'`、`EXPECTED_SHA=23B822B3…DAA03E`）。
> **窗口**：boot1 `Done (5.670s)`（b1:2350，20:50:28）/ boot2 `Done (5.662s)`（b2:2351，20:52:14），mixinFail 0×2；双停服 `0/true/true`；`BUILD SUCCESSFUL in 1m 44s`（b1:5813）/ `1m 15s`（b2:3443）；PIN 起 `12:50:12.387Z`（stdout:1）→ 收 `12:53:13.469Z`（stdout:1008），总窗约 **3m 01s**，**EXIT=0**。
> **判决**：W0 PASS（crash 基线含义见 C-B37-1）｜W1 PASS｜W2 PASS｜W3 PASS｜W4 PASS。
> **报告字节规格**：`6436 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，65 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 `{0,true,true}`×2 ∧ 无新 crash | b1:2350 `Done (5.670s)` / b2:2351 `Done (5.662s)`；mixinFail 0×2；双停服同形；crash **24→24**（无新增） | PASS |
| **W1** a1 狙窗臂（60 s） | `firingpos start(src=skeleton)≥1`（probes 只作伴随证） | 起手 **2** 次：b1:5437 `players=1 spot=(-54,67,241) speed=1.0`（EntitySkeleton#2720）、b1:5458 `players=1 spot=(-46,67,240)`；probe-in **25** 次 | PASS |
| **W2** b1 旗断臂（30 s） | `firingpos` 全零 | b2 全档 **0** 条（`start` 与 `probe-in` 均 0） | PASS |
| **W3** props 三件 | norm/raw 起收同 ∧ level 还原 | `FA0B6FAB…B89733C7`→同；`35EBC027…72CC81A2`→同；`w-b30v`→`w-b30v` | PASS |
| **W4** 钉值 | 双 PIN 同 sha ∧ mk.ok（100/229/458＋98+10） | `12:50:12.387Z` / `12:53:13.469Z` 同 `23B822B3…DAA03E`；MK 100/229/458、98+10、`ok=true` | PASS |
| **cfg** | 49,380 B `BAE7A8DF…` 起收同 | 同值 | PASS |

`[done]`：`{"a1n":2,"a1probes":21,"b1n":0,"b1total":0,"stop":"0/true/true,0/true/true","w0":true,"w1":true,"w2":true,"w4":true,"propsOk":true,"propsNorm":"FA0B6FAB…/FA0B6FAB…","propsRaw":"35EBC027…/35EBC027…","propsLevel":"w-b30v->w-b30v","bad":0}`

## §2 判行锚（b1.out 行号）

**判窗室与工装布设**
- `b1:5394` `### [harness] > fill -74 60 230 -30 65 250 minecraft:cobblestone`（台面底虚空填实）
- `b1:5418` / `b1:5420` `### [harness] > setblock -57 67 240 minecraft:air` / `-57 68 240 minecraft:air`（东面双窗）
- `b1:5424` `### [harness] > summon skeleton -61.5 67 240.5 {PersistenceRequired:1b}` → `Object successfully summoned`
- `b1:5432` `### [harness] > replaceitem entity @e[type=skeleton] slot.weapon.mainhand minecraft:bow 1` → `Replaced slot slot.weapon.mainhand with 1 * [Bow]`

**a1 起手两行（W1）**
- `b1:5437` `[20:50:55] [Easy Times In Minecraft]: [AILog] firingpos src=skeleton start players=1 spot=(-54,67,241) speed=1.0 entity=EntitySkeleton#2720`
- `b1:5458` `[20:51:10] [Easy Times In Minecraft]: [AILog] firingpos src=skeleton start players=1 spot=(-46,67,240) speed=1.0 entity=EntitySkeleton#2720`

**probe-in 伴随证示例**
- `b1:3806` `probe-in inv=16 players=0 flag=true`（EntitySkeleton#2065，boot 期野生骨弓）、`b1:4003` `inv=32`、`b1:4196` `inv=48`
- 窗口内（#2720）：`b1:5501`（`inv=320 players=0`）→ `b1:5519`（`inv=400`）

**W2 旗断（b2）**：`firingpos` 0 条

## §3 登记项

- **C-B37-1（crash 基线修正 23→24，跨窗）**：开工前现场盘到 `run/crash-reports/crash-2026-11-12_17.21.02-server.txt`（本地 17:21:02 ＝ `09:21:02Z`），内容为 `java.lang.NoSuchMethodError: net.minecraft.util.math.AxisAlignedBB.getCenter()`，栈顶 `ETIMEntityAISeekFiringPosition.canEntityBeSeenFrom(…:81)`。该崩溃**早于本窗**：产品已在 b37-build1 内联中点修复（`ETIMEntityAISeekFiringPosition.java:84` 注释 "getCenter() absent in this RFG tree — inline midpoint (crash 2026-11-12 17:21)"），jar 于 `12:37:38Z` 重建；smoke r13（12:37–12:43Z）与本窗（12:50–12:53Z）均未再触发。**本窗判据按 24→24 执行**（窗内无新增），任务书写的"基线 23"是修复前的旧数。
- **C-B37-2（a1 起手 2 次 vs smoke 4 次）**：smoke r13 记 4 次起手，本窗 2 次；落点均落在判窗室东侧可视线内（`spot=(-54,67,241)`、`(-46,67,240)`），W1 判 `≥1`，次数差异属骨架寻位随机性，记录备查。
- **C-B37-3（产物留证惯例）**：固定名 `f11-b37-verify.{json,b1.out,b2.out}` 已另存 `-r1-*`（沿用 C-B35-3 / C-B36-1）。
- **停服面**：2 次 `exitCode=0 exited=true build=true`。
- **异常面**：stdout 无 `[fatal]`；产品码、驱动判据面、`f7-wb-lib.js`、mixin 配置均未动。
- **世界面**：`run/w-b37v` 保留（24 文件 / 3,642,123 B）；既往 w-b* 共 **50** 目录未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、HEAD `14fce58` 窗内 0 提交。

## §4 收口清单

- jar 起收同 1,153,535 B `23B822B3…DAA03E`（0 rebuild）；dev/sources 未动。
- cfg `BAE7A8DF…` 49,380 B 起收同；props norm/raw 起收同、`level-name=w-b30v` 已还原。
- MK 起收同 100/229/458、98+10、ok=true；双 PIN 同 sha。
- 世界 `run/w-b37v` 保留；既往目录未删（删世界待口令）。
- 证据：`build-logs/f11-b37-verify-r1-{b1,b2}.out`、`-r1.json`、`-stdout.out`；固定名同名保留。

## 文尾

- 报告字节：`6436 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，65 行`。
- 三 SHA：jar `23B822B3AAD8099125C0E6D702CC1BEEFA68F49EC3E38672A2EDB50CD0DAA03E`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`。
