# R196 掉落面打包（骷髅/僵尸 drop 表＋massive-fall 旗＋10% 施舍门＋dropEquipment）**W-B38 判窗**（HEAD `cce28b9`）— **W0–W4 全 PASS**

> **结论先行**：b38-build3 在双 boot 判窗下全绿——骷髅臂 `[DropLog] skeleton type=1` ＋ `equip slot=mainhand`；僵尸臂 `[DropLog] zombie flesh=false chance=200` ＋ `equip mainhand/head` **两行**；摔落臂 `fewitems gate flag=true skipped=true`；旗断臂全档 `[DropLog]` **0** 行。**`bad=0`，EXIT=0。**
> **HEAD**：`cce28b9754f7a78e01294b150b3f9034ea08a57f`（B-37 批已提交；任务书写的 `14fce58` 是 B-37 提交前的旧值，见 C-B38-1），窗内 **0 提交**；**0 rebuild**，jar mtime `2026-11-12T14:24:13Z` 起收未变。
> **jar**：1,160,976 B `651C5461A045333C41F3F77EDC2FFE9D19CEA018F397B209508AA2DC2DDC5378`（b38-build3，起收同）；dev 1,138,962 B `3AC5DE96…45A6D9CD`；sources 1,063,610 B `59FFF93F…436197A1`。
> **MK**：refmap **101/236/472**（dual 472，双份同）、mixins **99+10**、`ok=true`（起收同）。
> **驱动**：`testharness/player/f11-b38-verify.js`（291 行，`node --check` 绿；`TAG='w-b38v'`、`WORLD='w-b38v'`、`HOME='-60.5 67 240.5'`、`FALL_TOP='-60.5 110 240.5'`）。（TAG 与任务书产物命名不符，见 C-B38-2。）
> **窗口**：boot1 `Done (5.391s)`（b1:2353，06:03:59）/ boot2 `Done (6.659s)`（b2:2354，06:04:53），mixinFail 0×2；双停服 `{0,true,true}`；`BUILD SUCCESSFUL in 59s`（b1:6081）/ `44s`（b2:3435）；PIN 起 `22:03:36.553Z`（stdout:1）→ 收 `22:05:21.826Z`（stdout:1055），总窗约 **1m 45s**，**EXIT=0**。
> **判决**：W0 PASS｜W1 PASS｜W2 PASS｜W3 PASS｜b1 旗断 PASS｜W4 PASS｜props PASS。
> **报告字节规格**：`7566 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，73 行`。

## §1 判读总表

| 面 | 期望 | 实测 | 判决 |
| --- | --- | --- | --- |
| **W0** | 双 boot `Done (` ∧ mixinFail=0×2 ∧ 停服 `{0,true,true}`×2 ∧ crash 24→24 | b1:2353 `Done (5.391s)` / b2:2354 `Done (6.659s)`；mixinFail 0×2；双停服同形；crash **24→24** | PASS |
| **W1** a1 骷髅表面 | `[DropLog] skeleton ` ≥1 ∧ `[DropLog] equip ` ≥1 | 骷髅臂窗口：**1** 条 skeleton（`type=1 arrowRoll=0 boneRoll=0 rare=false`）＋**1** 条 equip（`slot=mainhand chance=0.085 dropped=false`）（L5718-5720） | PASS |
| **W2** a2 僵尸表面 | `[DropLog] zombie ` ≥1 ∧ `[DropLog] equip ` **≥2** | 僵尸臂窗口：**1** 条 zombie（`flesh=false rare=false chance=200`）＋ equip **2** 条（`slot=mainhand` 与 `slot=head`，均 `chance=0.085 dropped=false`）（L6042-6044） | PASS |
| **W3** a3 摔落旗面 | `fewitems gate ` 含 `flag=true` ≥1 | **1** 条：`[DropLog] fewitems gate flag=true skipped=true entity=EntityZombie#2688`（L6057；`skipped` 真假皆合法） | PASS |
| **b1** 旗断面 | boot2 全档 `[DropLog]` 0 行 | b2 全档 **0** 条 | PASS |
| **W4** 钉值面 | 双 PIN 同 sha ＝ `651C5461…DDC5378` ∧ mk.ok（101/236/472＋99+10） | `22:03:36.553Z` / `22:05:21.826Z` 同 sha；MK 101/236/472、99+10、`ok=true` | PASS |
| **props** | norm/raw 起收同 ∧ level 还原 | `FA0B6FAB…B89733C7`→同；`35EBC027…72CC81A2`→同；`w-b30v`→`w-b30v` | PASS |
| **cfg** | 49,380 B `BAE7A8DF…` 起收同 | 同值 | PASS |

`[done]`：`{"a1skel":1,"a1gate":0,"a1equip":1,"a2zomb":1,"a2equip":2,"a3gate":1,"b1total":0,"stop":[[0,true,true],[0,true,true]],"w0":true,"w1":true,"w2":true,"w3":true,"b1":true,"w4":true,"propsOk":true,"propsNorm":"FA0B6FAB…/FA0B6FAB…","propsRaw":"35EBC027…/35EBC027…","propsLevel":"w-b30v->w-b30v","bad":0}`

## §2 判行锚（b1.out / b2.out 行号）

**a1 骷髅臂（无 NBT 召唤 → /kill）**
- `b1:5714` `### [harness] > summon wither_skeleton -60.5 67 240.5`
- `b1:5716` `### [harness] > kill @e[type=wither_skeleton]`
- `b1:5718` `[DropLog] fewitems gate flag=false skipped=false entity=EntityWitherSkeleton#2684`
- `b1:5719` `[DropLog] skeleton type=1 arrowRoll=0 boneRoll=0 rare=false entity=EntityWitherSkeleton#2684`
- `b1:5720` `[DropLog] equip slot=mainhand chance=0.085 dropped=false entity=EntityWitherSkeleton#2684`

**a2 僵尸臂（HandItems stick ＋ ArmorItems leather_helmet）**
- `b1:6033` `### [harness] > summon zombie -60.5 67 240.5 {PersistenceRequired:1b,HandItems:[{id:"minecraft:stick",Count:1b},{}],ArmorItems:[{},{},{},{id:"minecraft:leather_helmet",Count:1b}]}`
- `b1:6039` `### [harness] > kill @e[type=zombie]`
- `b1:6041` `[DropLog] fewitems gate flag=false skipped=false entity=EntityZombie#2687`
- `b1:6042` `[DropLog] zombie flesh=false rare=false chance=200 entity=EntityZombie#2687`
- `b1:6043` `[DropLog] equip slot=mainhand chance=0.085 dropped=false entity=EntityZombie#2687`
- `b1:6044` `[DropLog] equip slot=head chance=0.085 dropped=false entity=EntityZombie#2687`

**a3 摔落臂（y110 落 43 格）**
- `b1:6048` `### [harness] > summon zombie -60.5 110 240.5 {PersistenceRequired:1b}`
- `b1:6057` `[DropLog] fewitems gate flag=true skipped=true entity=EntityZombie#2688`

**b1 旗断（b2）**：`[DropLog]` 0 条

## §3 登记项

- **C-B38-1（HEAD 勘误）**：任务书写"HEAD 应为 `14fce58`"；实测 `cce28b9`（`mob B-37 batch` 提交），即 B-37 批在任务书起草后已提交。窗内 0 提交，jar 钉值/判据面不受影响。
- **C-B38-2（驱动 TAG 与产物命名不符）**：驱动 `L42 const TAG = 'w-b38v'`（＝世界名），故 `startServer` 落的 boot 日志为 `build-logs/w-b38v-b1.out` / `w-b38v-b2.out`，而非任务书期待的 `f11-b38-verify-*.out`。判据不受影响；本轮已把两份复制为 `f11-b38-verify-r1-b1.out` / `-r1-b2.out`（原文件保留）。另：驱动不写 JSON，`-r1.json` 由本会话从 stdout 的 `[done]` 载荷转写。
- **C-B38-3（W2 阈值口径）**：任务书要求 `equip ≥2`，驱动内 `w2` 写的是 `equip ≥1`。本轮实测 **2**，两种口径同判 PASS；以任务书的 `≥2` 为准入账。
- **C-B38-4（stageArena 世界清扫的 DropLog 爆量）**：`kill @e[type=!player]` 会连带清掉既存野生种群，06:04:04 一波 **211** 条 `[DropLog]`（其中 fewitems 187、skeleton 8、zombie 6、equip 10）。手臂判定用 `since(index)` 按臂窗口切片，故 W1/W2 只计入本臂行数（1 / 2），不受污染；记录备查，避免后续误读 rail 计数。
- **停服面**：2 次 `exitCode=0 exited=true build=true`。
- **异常面**：stdout 无 `[fatal]`；产品码、判据面、`f7-wb-lib.js`、mixin 配置均未动。
- **世界面**：`run/w-b38v` 保留（23 文件 / 3,541,510 B）；既往 w-b* 共 **52** 目录未删。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash 24→24。

## §4 收口清单

- jar 起收同 1,160,976 B `651C5461…DDC5378`（0 rebuild）；dev/sources 未动。
- cfg `BAE7A8DF…` 49,380 B 起收同；props norm/raw 起收同、`level-name=w-b30v` 已还原。
- MK 起收同 101/236/472、99+10、ok=true；双 PIN 同 sha。
- 世界 `run/w-b38v` 保留；既往目录未删（删世界待口令）。
- 证据：`build-logs/f11-b38-verify-r1-b1.out`、`-r1-b2.out`、`-r1.json`、`-r1-stdout.out`；驱动原始 `w-b38v-b1.out` / `w-b38v-b2.out` 保留。

## 文尾

- 报告字节：`7566 B，UTF-8（无 BOM），LF，U+FFFD 0，? 2，73 行`。
- 三 SHA：jar `651C5461A045333C41F3F77EDC2FFE9D19CEA018F397B209508AA2DC2DDC5378`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `FA0B6FAB2D454E65D08E00A0070DCB9183E41691F3450DC36B675C1AB89733C7`。
