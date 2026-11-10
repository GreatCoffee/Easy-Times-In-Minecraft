# R196 女巫 wander-back 面（EntityAIWanderBackToSpawnPoint · EntityWitch :46 独占座）· **W-B30 判决**（B-30 批，HEAD `0b0c3ec`）

> **HEAD**：`0b0c3ec51013626435c17ad0432f4b77e5956281`（窗内 **0 提交**，起收同 commit；B-30 patch 未入 commit）｜**0 rebuild**（jar mtime 2026-11-10T06:34:14Z 早于窗起点 07:15Z）
> **jar**：`build/libs/etim-1.0.0.jar` **1,112,027 B**｜SHA256 `7B526181DA97866A70BBFD859C04F305378329A66B7F73F5D8C5F1BF2D06D4EB`（起收同值）｜MD5 `81BE5C6DA0FB1E894975EAD53B2D04C0`
> **dev/sources**：1,090,723 B `A4DB598334636CDE…`／1,015,652 B `D6B5C2A2F043CDAE…`
> **refmap**：classes **99** / entries **218**（dual 436，双树同）｜**mixins**：**96** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.436s)`／`Done (5.374s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 39s／1m 4s）｜单假人 `ETIM_F7`（隐身＋`doMobSpawning=false`）｜判窗世界 `w-b30v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓**（A 0／B 0／D 0／C 5）
> **判据来源**：本窗 r3 单跑（r1＝交付前既有跑、r2＝工装次序半修跑，均快照留存；驱动 3 处工装补强见 §3 C-B30-2／C-B30-3，未触产品码）
> **报告字节规格**：`8,134 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 11 / ✗ 1｜66 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2 | b1 `Done (5.436s)!`（b1:2346，15:15:35）／b2 `Done (5.374s)!`（b2:2346，15:18:15），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 39s`（b1:3404）／`in 1m 4s`（b2:3472） | ✓ |
| **W1** wander 面（a1） | `n>=1` ∧ `pathTrue>=1` | **2 行**（a1 臂内），`pathTrue=2`；`dist=9.53`（b1:3289）、`dist=22.75`（b1:3303）；同臂 probe 33 行 | ✓ |
| **W2** memo 面（a2） | `n>=1` ∧ `memoN>=1`（`spawn=` 字段钉 JoIN memo，非 tp 目的地） | **4 行**（b1:3344／3350／3357／3360），`memoN=3`；`spawn=(-72,67,241)`×3、`spawn=(-69,67,241)`×1——全部为召唤落点 floor，**无一行**写成 tp 目的地（12 格东走廊）；probe 38 行 | ✓ |
| **W3** 旗断守形（boot 2） | `n===0` ∧ `probes===0` | b2 全档 3,475 行 `wanderback` **0 命中**（start 0＋probe 0；女巫正常召唤、无 `Skipping Entity`） | ✓ |
| **W4** 钉值自证 | 双 `[PIN]` releaseSha 同＋`mk.ok=true` | `07:15:21.617Z`／`07:19:06.182Z`，两条同 `7B526181DA97866A…06D4EB`；mk 两条均 `99/218/436＋96+10 ok=true` | ✓ |

## §2 判行原文

**W1 · a1 wander 面（2 行，path=true）**
- `[AILog] wanderback src=witch start speed=1.0 dist=9.53 path=true f=16.39 spawn=(-69,67,241) entity=EntityWitch#2016`（b1:3289）
- `[AILog] wanderback src=witch start speed=1.0 dist=22.75 path=true f=27.60 spawn=(-72,67,241) entity=EntityWitch#2015`（b1:3303）

**W2 · a2 memo 面（4 行；spawn= 全为 JoIN 落点 floor）**
- `[AILog] wanderback src=witch start speed=1.0 dist=10.34 path=true f=18.05 spawn=(-72,67,241) entity=EntityWitch#2017`（b1:3344）
- `[AILog] wanderback src=witch start speed=1.0 dist=11.38 path=true f=19.07 spawn=(-72,67,241) entity=EntityWitch#2017`（b1:3350）
- `[AILog] wanderback src=witch start speed=1.0 dist=11.38 path=true f=19.07 spawn=(-72,67,241) entity=EntityWitch#2017`（b1:3357）
- `[AILog] wanderback src=witch start speed=1.0 dist=8.92 path=true f=17.07 spawn=(-69,67,241) entity=EntityWitch#2018`（b1:3360）

**W3 · 旗断双零**
- b2 全档 3,475 行 `wanderback` **0 命中**（start 与 probe 均为 0）

**W0 · 窗面**
- `Done (5.436s)! For help, type "help" or "?"`（b1:2346）｜`Done (5.374s)!`（b2:2346）
- `BUILD SUCCESSFUL in 2m 39s`（b1:3404）｜`BUILD SUCCESSFUL in 1m 4s`（b2:3472）

## §3 冲突分级

- **A 级：0** —— 五臂硬门全成立：a1 有行且 path 真行 ≥1（2/2）、a2 有行且 memo 真 ≥1（4 行中 3 行 `spawn=(-72,67,241)`）、旗断双零、boot/停服面全绿、双 PIN 同值同 MK。
- **B 级：0** —— 本批注册 1 个新 mixin（96+10）＋1 个新 AI（`ETIMEntityAIWanderBackToSpawnPoint`）＋join-memo carrier，refmap 99/218 dual 436 双树同，`mkCounts().ok=true`；无未收编残留。
- **D 级：0** —— 互通差异仅为 1/40 掷骰与回家相位（见 C-B30-4），无互读矛盾。
- **C 级：5**
  - **C-B30-1**（判据面·双修，预登记已落产品码）：①r1 距离门破案——1.12 `PathNavigate.getPathToPos` 的 FOLLOW_RANGE（16.0F）会拒掉 8–16 格段的回家路径，故 `getMovementPath` 期间以固定 UUID 抬窗（`dist + 8.0`，`finally` 移除）；②r2 判准假绿——只数 `start` 行不数 `path=` 真行，遂在驱动加 `pathTrue`／`memoN` 判门。二者合并后判值面已清；本窗 a1 `pathTrue=2/2`、a2 全 `path=true`。
  - **C-B30-2**（工装·W4 次序缺陷，本窗修复）：交付前那跑（`f11-b30-verify.json` 06:50，已快照 `-r1-*`）`verdicts.w4=FAIL`——根因是 `stampPin()` 原在 `ev.verdicts` **之后**调用，`pins.length===2` 判定时数组只有 1 条；而该跑的两条 `[PIN]`（stdout）实际同 sha 同 MK，判值面未受影响。本窗把 `stampPin()` 移到 `bad`／verdicts 之前，并给 W4 加 `mk.ok===true` 门；r2 又暴露「pin 门写在 stamp 之前」的残余次序问题（EXIT=2，verdicts 已全 PASS），再修后 r3 EXIT=0。
  - **C-B30-3**（证据面·三跑并存）：canonical 取 r3（`07:15:21.617Z`→`07:19:06.182Z`）；r1（06:46→06:50，W4 次序缺陷）与 r2（07:07→07:10，pin 门次序缺陷、EXIT=2）逐臂判值面与 r3 同向（a1 pathTrue 全真、a2 memo 全真、b1 双零），仅行数因掷骰相位不同；三跑日志均已快照（`-r1-*`／`-r2-*`／canonical 本体）。
  - **C-B30-4**（互通漂移）：smoke r3 `a1=5/pathTrue=5、a2=10/memo=7、b1=0`；verify r1 `6/6＋5/1＋0/0`；本窗 r3 `2/2＋4/3＋0/0`。三个窗的**门位**（a1≥1 且 path 真、a2≥1 且 memo 真、b1 双零）完全一致，行数差由 `nextInt(40)` 掷骰与回家往返相位决定，非判值漂移。
  - **C-B30-5**（收口·props 落点）：驱动按 `propsBefore` 原样回写，故 `level-name` 停留 `w-b30v`（非回 `w-b23v`）；起收同值 939 B `0AB0CBCBFE34A4D5A891D301486A44B7527FB885FD4A3DE3C9ACF83AFBCC9D03`，判窗世界 `w-b30v` 保留。

## §4 收口五件

- **jar／dev／sources 起收同**：1,112,027 `7B526181…06D4EB`（MD5 `81BE5C6DA0FB1E894975EAD53B2D04C0`）／1,090,723 `A4DB5983…`／1,015,652 `D6B5C2A2…`（窗内 **0 rebuild**；两次 `[PIN]` 同值）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false`）；props 939 B `0AB0CBCBFE34A4D5A891D301486A44B7527FB885FD4A3DE3C9ACF83AFBCC9D03`（`level-name=w-b30v`，起收同）。
- **MK 起收同**：refmap 99/218（dual 436）＋mixins 96+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `0b0c3ec` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAIWanderBackToSpawnPoint.java` 2026-11-10T06:32:38Z、`ETIMLivestockEvents.java` 05:03:52Z、`MixinEntityWitch.java` 04:59:17Z）均早于窗起点 07:15Z；`git status` src 侧四处 ` M`＋四个 `??`（B-28/B-29/B-30 未提交工作树）。
- **世界**：`run/w-b30v` 保留（27 文件／3,574,357 B）；`w-b30a` 未动。
- **互通**：见 C-B30-4 表——门位三窗一致，行数与路径相位为掷骰差。

> 正本：`testharness/reports/b30-verify-verdict.md`｜byte 五项：`8,134 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 65（split 66）`
> SHA-256 甲（全档零位）`47C3813FC78120A00DBF97755DF4EC1486CC3822AB4251EBB02F73BAECB232BB`
> SHA-256 乙（LF 归零零位）`47C3813FC78120A00DBF97755DF4EC1486CC3822AB4251EBB02F73BAECB232BB`
> SHA-256 丙（行链零位）`C27C49D4C131A2AA9BB32C218542042F56835005C8700D5E1AEDD3C745F4B637`
