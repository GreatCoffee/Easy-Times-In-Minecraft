# R196 修物寻物（MoveToRepairItem）**W-B35 判窗**（HEAD `4235b3e`）— **六窗全 PASS**

> **结论先行**：b35-build4（at-target 改 candidates 直选举）在 **W2 圈栏锁位**下首次成立——`start dist=0.00` 与 `pickup` 同刻落行；a1 走臼、a3 雪人走臼同步复绿；旗断臂双零。**六窗全 PASS，`bad=0`，EXIT=0。**
> **HEAD**：`4235b3eca2af60a52e2ae3eadf4761251a5f1860`，窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-12T03:42:50Z` 起收未变。
> **jar**：1,142,129 B `946E246D073838E181486223967EBE9BEDEC64FA373EA0D466B23E69E48CC92E`（起收同）；dev 1,120,390 B `0D65D71E…FF1061C7`；sources 1,046,648 B `268586F5…76F7DB07`。
> **MK**：refmap 100/228（dual 456，双份同）、mixins 98+10、`ok=true`（r2 同值，判行改动零增量）。
> **驱动**：`testharness/player/f11-b35-verify.js` v2（283 行，`node --check` 绿），`EXPECTED_SHA=946E246D…9E48CC92E`。
> **窗口**：双 boot `Done (5.592s)`（b1:2351，12:29:31）/ `Done (5.310s)`（b2:2350，12:33:32），mixinFail 0×2；双停服 `0/true/true`、`BUILD SUCCESSFUL in 4m 13s`（b1:5462）/ `1m 12s`（b2:3896）；PIN 起 `04:29:03.254Z`（stdout:1）→ 收 `04:34:31.149Z`（stdout:978），总窗约 **5m 28s**，**EXIT=0**。
> **判决**：W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜W4 PASS｜W5 PASS；`bad=0`。
> **报告字节规格**：`8564 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，75 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 0/true/true ×2 | b1:2351 `Done (5.592s)` / b2:2350 `Done (5.310s)`；mixinFail 0×2；双停服 `{0,true,true}` | PASS |
| **W1** a1 走臼 | `start≥1 ∧ pickup≥1`（dist 只记） | start b1:5120 `dist=3.00 hp=4.00/6.00`（EntitySkeleton#2656）→ pickup b1:5121 `heal=3.00 hp=6.00` | PASS |
| **W2** a2 圈栏 at-target | `start(dist<1.0)≥1 ∧ pickup≥1` | start b1:5408 **`dist=0.00`** `hp=4.00/6.00`（EntitySkeleton#2665）→ pickup b1:5409 `heal=3.00 hp=6.00` | PASS |
| **W3** a3 雪人走臼 | `pickup≥1` | start b1:5432 `dist=3.00 hp=2.00/4.00`（EntitySnowman#2668）→ pickup b1:5433 `heal=2.00 hp=4.00` | PASS |
| **W4** b1 旗断 | `repairN=0 ∧ pickupN=0` | b2 全档 `repairseek` **0** 条、`RepairLog` **0** 条 | PASS |
| **W5** 钉值 | 双 PIN 同 sha ∧ mk.ok | `04:29:03.254Z` / `04:34:31.149Z` 同 `946E246D…9E48CC92E`；MK 100/228/456、98+10、`ok=true` | PASS |
| **props** | 归一化起收同 ∧ level 还原 | `FA0B6FAB…B89733C7` → 同值；raw `35EBC027…72CC81A2` 起收同（只记）；`w-b30v`→`w-b30v` | PASS |
| **cfg** | 49,380 B `BAE7A8DF…` 起收同 | 同值 | PASS |

`[done]`：`{"a1n":1,"a1pickups":1,"a1dists":[3],"a1heal":["3.00"],"a2n":1,"a2atN":1,"a2pickups":1,"a2dists":[0],"a3n":1,"a3pickups":1,"a3heal":["2.00"],"b1repair":0,"b1pickup":0,"stop":"0/true/true,0/true/true","w0":"PASS","w1":"PASS","w2":"PASS","w3":"PASS","w4":"PASS","w5":"PASS","propsNorm":"FA0B6FAB…/FA0B6FAB…","propsRaw":"35EBC027…/35EBC027…","propsLevel":"w-b30v->w-b30v","bad":0}`

## §2 判行摘录（b1 / b2）

**a2 圈栏臂（b1）**
- `b1:5382` `### [harness] > fill -63 67 239 -61 68 239 minecraft:cobblestone` → `6 blocks filled`
- `b1:5384` `### [harness] > fill -63 67 241 -61 68 241 …` → `6 blocks filled`
- `b1:5386` `### [harness] > fill -63 67 239 -63 68 241 …` → `2 blocks filled`
- `b1:5388` `### [harness] > fill -61 67 239 -61 68 241 …` → `2 blocks filled` ⇒ 内部仅 (-62,240) 一格
- `b1:5390` `### [harness] > summon skeleton -61.5 67 240.5` ⇒ `EntitySkeleton#2665`
- `b1:5406` `### [harness] > summon item -61.5 67 240.5 {Item:{id:"minecraft:bone",…,PickupDelay:0s,Age:-32768s}}` ⇒ **同格**
- `b1:5408` `[12:31:06] [Easy Times In Minecraft]: [AILog] repairseek src=skeleton start item=minecraft:bone hp=4.00/6.00 dist=0.00 entity=EntitySkeleton#2665`
- `b1:5409` `[12:31:06] [RepairLog] pickup src=skeleton heal=3.00 hp=6.00 cooldown=400 item=minecraft:bone entity=EntitySkeleton#2665`
- `b1:5410` `[12:31:06] [AILog] repairseek src=skeleton reset cooldown=399 targetDead=true entity=EntitySkeleton#2665`
- 随后 60 s 仅 `fleesun` 心跳（`inv=100/200/300/400`，b1:5412-5415）；`b1:5417` `Killed item.item.bone`（清场时场内仍有一个 bone 物品实体，见 §3 观察项 O-B35-1）、`b1:5419` `Killed Skeleton`

**a1 走臼（b1）**：`b1:5120` `repairseek src=skeleton start item=minecraft:bone hp=4.00/6.00 dist=3.00 entity=EntitySkeleton#2656` → `b1:5121` `pickup src=skeleton heal=3.00 hp=6.00 cooldown=400 item=minecraft:bone`

**a3 雪人走臼（b1）**：`b1:5432` `repairseek src=snowman start item=minecraft:snowball hp=2.00/4.00 dist=3.00 entity=EntitySnowman#2668` → `b1:5433` `pickup src=snowman heal=2.00 hp=4.00 cooldown=400 item=minecraft:snowball`

**W4 旗断（b2）**：`repairseek` 0 条、`RepairLog` 0 条（全档）

## §3 登记项

- **A-B35-1（两轮破案链，已闭）**：
  - **r1（b35-build3）**：a2 用 `execute @e[type=skeleton,c=1] ~ ~ ~ summon item …` 把 item 落在 mob 当时站位，6 s 内 mob 走开 5.49 格 → `dist=5.49` 未入 at-target 窗口，但走臼分支仍起手并 pickup（`n=1 atN=0 pickups=1`）。
  - **r2（b35-build3＋圈栏 v2）**：1×1 圈栏锁位后 `n=0 atN=0 pickups=0` —— **连 start 都不出**。破案：产品侧 at-target 分支读的 `this.target` 在 `PathNavigateGround.choosePath()` 之后被清空，故同格条件下的判定永远拿不到目标实体。
  - **r3（b35-build4，本窗）**：at-target 改为 **candidates 直选举**（不再依赖 `this.target`），同一圈栏工装下 `start dist=0.00` 与 `pickup` 同刻落行 ⇒ 修正成立，判据面未变。
- **C-B35-1（props 口径）**：去全部 `#` 行与空行后 LF 连接取 sha256；起收同 `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`（与 b31/b33「只去时间戳行」口径不同，绝对值不可跨批比）；raw `35EBC027…72CC81A2` 只记。
- **C-B35-2（驱动行数勘误）**：任务书记 344 行；r1 实测 271、r2/r3（v2）实测 283；`node --check` 均绿，六窗键与判据一致，仅计数勘误。
- **C-B35-3（产物留证惯例）**：固定名 `f11-b35-verify.{json,b1.out,b2.out}` 每轮覆盖。r1 原始日志因此不可取回（数值已固化在 `build-logs/b35-verify-r1-verdict-fail.md`）；本轮起跑前已把 r2 产物复制为 `f11-b35-verify-r2-{json,b1.out,b2.out}`，r3 产物复制为 `f11-b35-verify-r3-{json,b1.out,b2.out}`，此后每轮照此改名留档。
- **观察·a1/a3 dist**：a1 `3.00`、a3 `3.00`，与 r1 的 `3.00` / `5.42` 相比 a3 收敛；W1/W3 只判 `pickup≥1`，dist 仅记录。
- **观察项 O-B35-1（本窗不裁）**：a2 臂 `pickup` 与 `reset targetDead=true` 均在 12:31:06 落行，但 60 s 后清场时仍有一条 `Killed item.item.bone`（同批还有一条 `Killed item.item.etim.arrow_rusted_iron`）。即：`[RepairLog] pickup` 行成立（判据面以该行为准，W2 判 PASS），而"拾取后场内是否仍有余留物品实体"未定谳——可能是拾取未消耗实体、或是同格召唤生了两个实体、或是 `Age:-32768s` 超龄物品的自毁时序。留待主会话决定是否追加一次性取证。
- **停服面**：2 次 `exitCode=0 exited=true build=true`。
- **异常面**：stdout 无 `[fatal]`；产品码、驱动判据面、PIN/MK 均未动。
- **世界面**：`run/w-b35v` 保留（29 文件 / 3,749,896 B）；既往 w-b* 共 46 目录未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash 23→23、HEAD `4235b3e` 窗内 0 提交。

## §4 收口清单

- jar 起收同 1,142,129 B `946E246D…9E48CC92E`（0 rebuild）；dev/sources 未动。
- cfg `BAE7A8DF…` 49,380 B 起收同；props 归一化 `FA0B6FAB…` 起收同、`level-name=w-b30v` 已还原。
- MK 起收同 100/228/456、98+10、ok=true；双 PIN 同 sha。
- 世界 `run/w-b35v` 保留；既往目录未删（删世界待口令）。
- 证据：`build-logs/f11-b35-verify-r3-b1.out` / `-r3-b2.out` / `-r3.json` / `-r3-stdout.out`；r2 版 `-r2-*`；r1/r2 FAIL 版均留档。

## 文尾

- 报告字节：`8564 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，75 行`。
- 三 SHA：jar `946E246D073838E181486223967EBE9BEDEC64FA373EA0D466B23E69E48CC92E`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`。
