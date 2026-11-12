# R196 避火（EntityAIAvoidFire）**W-B36 判窗**（HEAD `427d89c`）— **五窗全 PASS**

> **结论先行**：b36-build1 在双 boot 判窗下全绿——动物臂 `avoidfire src=animal` 起手 2 次（牛 `bestSq=1.0`、猪 `bestSq=2.0`）＋探测 48 次；雪人臂 `src=snowman` 起手 5 次；旗断臂 `avoidfire` 全档 0 条。**`bad=0`，EXIT=0。**
> **HEAD**：`427d89c6f0329f330fc1a59a28d5c66b61d72361`，窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-12T06:27:36Z` 起收未变。
> **jar**：1,148,105 B `B890FFE00BBC9E2D75A6C9D760335E181E715CDF1851656F5F7FC2A58302DCD3`（b36-build1，起收同）；dev 1,126,289 B `31F7FC73…C67815B8`；sources 1,051,609 B `F88FF0D0…CA90C1F6`。
> **MK**：refmap 100/228（dual 456，双份同）、mixins 98+10、`ok=true`（起收同）。
> **驱动**：`testharness/player/f11-b36-verify.js`（205 行，`node --check` 绿；`TAG='f11-b36-verify'`、`WORLD='w-b36v'`、`EXPECTED_SHA=B890FFE0…02DCD3`）。
> **窗口**：boot1 `Done (5.265s)`（b1:2350，15:38:16）/ boot2 `Done (5.311s)`（b2:2350，15:40:55），mixinFail 0×2；双停服 `0/true/true`；`BUILD SUCCESSFUL in 2m 51s`（b1:6096）/ `1m 5s`（b2:3415）；PIN 起 `07:37:48.378Z`（stdout:1）→ 收 `07:41:46.554Z`（stdout:971），总窗约 **3m 58s**，**EXIT=0**。
> **判决**：W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜W4 PASS（含 props 面）；`bad=0`。
> **报告字节规格**：`6326 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，68 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 `{0,true,true}`×2 | b1:2350 `Done (5.265s)` / b2:2350 `Done (5.311s)`；mixinFail 0×2；双停服同形 | PASS |
| **W1** a1 动物臂 | `avoidfire start(src=animal)≥1 ∧ probe-in≥1` | 起手 **2** 次：b1:5389 牛 `fires=1 bestSq=1.0 speed=1.0`（EntityCow#2655）、b1:5396 猪 `bestSq=2.0`（EntityPig#2657）；probe-in **48** 次（示例 b1:2375/2381/2386） | PASS |
| **W2** a2 雪人臂 | `avoidfire start(src=snowman)≥1` | 起手 **5** 次：b1:6041（`bestSq=1.0`）、b1:6042（`bestSq=34.0`）、b1:6043（`bestSq=25.0`）等（EntitySnowman#2669）；同窗口 probe-in 连续 | PASS |
| **W3** b1 旗断 | `avoidfire total=0` | b2 全档 **0** 条（b1 对照 398 条：7 start ＋ 391 probe-in） | PASS |
| **W4** 钉值 | 双 PIN 同 `releaseSha` ∧ `mk.ok` | `07:37:48.378Z` / `07:41:46.554Z` 同 `B890FFE0…02DCD3`；MK 100/228/456、98+10、`ok=true` | PASS |
| **props** | 归一化起收同 ∧ level 还原 | `FA0B6FAB…B89733C7` → 同值；raw `35EBC027…72CC81A2` 起收同（只记）；`w-b30v`→`w-b30v` | PASS |
| **cfg** | 49,380 B `BAE7A8DF…` 起收同 | 同值 | PASS |

`[done]`：`{"a1n":2,"a1probes":48,"a2n":5,"b1animal":0,"b1snowman":0,"b1total":0,"stop":"0/true/true,0/true/true","w0":true,"w1":true,"w2":true,"w3":true,"w4":true,"propsOk":true,"propsNorm":"FA0B6FAB…/FA0B6FAB…","propsRaw":"35EBC027…/35EBC027…","propsLevel":"w-b30v->w-b30v","bad":0}`

## §2 判行锚（b1.out 行号）

**a1 动物臂**
- `b1:5385` `### [harness] > setblock -60 67 240 minecraft:fire` → `Block placed`
- `b1:5387` `### [harness] > summon cow -58.5 67 240.5` → `Object successfully summoned`
- `b1:5389` `[15:38:31] [Easy Times In Minecraft]: [AILog] avoidfire src=animal start fires=1 bestSq=1.0 speed=1.0 entity=EntityCow#2655`
- `b1:5390` `### [harness] > summon pig -58.5 67 241.5`
- `b1:5396` `[15:38:33] … [AILog] avoidfire src=animal start fires=1 bestSq=2.0 speed=1.0 entity=EntityPig#2657`
- probe-in 示例：`b1:2375`（`inv=16 burning=false flag=true` EntityCow#27）、`b1:2381`（`inv=32` EntityPig#49）、`b1:2386`（`inv=48` EntityPig#70）

**a2 雪人臂**
- `b1:6036` `### [harness] > setblock -50 67 241 minecraft:fire`
- `b1:6040` `[15:39:36] … [AILog] avoidfire src=snowman probe-in inv=5952 burning=false flag=true entity=EntitySnowman#2669`
- `b1:6041` `[15:39:36] … [AILog] avoidfire src=snowman start fires=1 bestSq=1.0 speed=1.0 entity=EntitySnowman#2669`
- `b1:6042` `[15:39:40] … start fires=1 bestSq=34.0 speed=1.0`
- `b1:6043` `[15:39:41] … start fires=1 bestSq=25.0 speed=1.0`
- 后续 probe-in 连打：`b1:6044`–`b1:6051`（`inv=5968 … 6080`，`burning=false flag=true`）

**W3 旗断（b2）**：`avoidfire` 0 条（含 `start` 与 `probe-in` 两种子串均 0）

## §3 登记项

- **C-B36-1（产物留证惯例，沿用 C-B35-3）**：驱动写入固定名 `f11-b36-verify.{json,b1.out,b2.out}`；本轮已复制为 `f11-b36-verify-r1-{json,b1.out,b2.out}`，原文件保留（同名同内容）。
- **C-B36-2（a1 probe-in 计数口径）**：`a1probes=48` 是整 boot 内 `avoidfire … probe-in` 行数，含 stageArena 阶段野生动物（EntityCow#27 / EntityPig#49 / #70 等）的心跳；W1 判 `≥1`，不受影响。
- **C-B36-3（a2 起手 5 次）**：同一雪人在同一窗口内 5 次 `start`，`bestSq` 由 1.0 → 34.0 → 25.0，属"逃离后重新发现更近火源／重选火源"的重复起手；W2 判 `≥1`，不受影响，记录备查。
- **停服面**：2 次 `exitCode=0 exited=true build=true`。
- **异常面**：stdout 无 `[fatal]`；产品码、驱动判据面、PIN/MK、mixin 配置均未动。
- **世界面**：`run/w-b36v` 保留（26 文件 / 3,615,689 B）；既往 w-b* 共 **48** 目录未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash 23→23、HEAD `427d89c` 窗内 0 提交。

## §4 收口清单

- jar 起收同 1,148,105 B `B890FFE0…02DCD3`（0 rebuild）；dev/sources 未动。
- cfg `BAE7A8DF…` 49,380 B 起收同；props 归一化 `FA0B6FAB…` 起收同、`level-name=w-b30v` 已还原。
- MK 起收同 100/228/456、98+10、ok=true；双 PIN 同 sha。
- 世界 `run/w-b36v` 保留；既往目录未删（删世界待口令）。
- 证据：`build-logs/f11-b36-verify-r1-{b1,b2}.out`、`-r1.json`、`-stdout.out`；原固定名同名保留。

## 文尾

- 报告字节：`6326 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，68 行`。
- 三 SHA：jar `B890FFE00BBC9E2D75A6C9D760335E181E715CDF1851656F5F7FC2A58302DCD3`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`。
