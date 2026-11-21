# W-B51 判窗正本（D 卷基础掉落三件：`[DropLog] base` 掉落表 / Ocelot 排除 / 总门旗关）

**判窗时间**：2026-11-21 08:11 → 08:20 CST（v1 / v2 / W9 三臂；服务端日志为 UTC，差值 +8h）
**执行方**：会话七（ETIM 验证窗执行）
**判决源**：工作树 `7d5328ce79e4f2b23e700904d5f83459492524ea`（B-51 产品改动未提交，窗内 0 提交）

## §0 钉值（实测，起收一致）

| 项 | 实测 | 钉值 | 判定 |
|---|---|---|---|
| jar | `build/libs/etim-1.0.0.jar` 1,217,813 B | 1,217,813 B | ✅ |
| SHA256 | `5B6EF49CBAE026BC8174DF9CAA527C921E1AD1C3DDE2AED4C58EFF2CAF890514` | 同 | ✅ |
| jar mtime | `2026-11-20T23:56:39Z`（三臂起收不变） | 窗内不变 | ✅ 0 rebuild |
| MK | refmap 101/242/484；manifest mixins 101 / client 10；`ok=true` | 101/242/484 + 101/10 | ✅ |
| HEAD | `7d5328c`（`origin/HEAD..HEAD` 欠 1） | 记录项（未钉） | ○ C-B51-11 |
| git status | 前 118 条 → 后 119 条（+1＝本窗新写的 `testharness/player/_b51-w9.js`） | 未 checkout/reset/clean | ✅ |
| 已跟踪改动 | `CommandDevTest.java`、`MixinEntityLiving.java`、`ETIMMobDrops.java`、`en_us.lang`、`zh_cn.lang`、`f7-wb-lib.js`（6 件 M） | 与工单一致 | ✅ |
| crash-reports | 24 → 24 | — | ✅ |
| port 25565 | 三臂停服后均 0 | 0 | ✅ |
| cfg SHA256 | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD` 起收同（`livestockNeedsR196=true`、`mobDebugLog=false`） | 起收同 | ✅ |
| props SHA256 | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` 起收同（`level-name=w-b30v`、`allow-flight=false`） | 起收同 | ✅ |

## §1 逐窗判读表

| 窗 | 判据 | v1 | v2 | 判定 |
|---|---|---|---|---|
| W0 | 双 boot `Done`、mixinFail=0、停服 `{exitCode:0,exited:true}`、PIN 同 sha | `Done (6.515s)`、mixinFail 0、stop 0/true、PIN ok | `Done (5.916s)`、mixinFail 0、stop 0/true、PIN ok | ✅ PASS |
| W1 Creeper | rows 1..24 | **7** | **8** | ✅ PASS |
| W2 Enderman | ≥1 | **5** | **4** | ✅ PASS |
| W3 PigZombie | ≥1 | **4** | **3** | ✅ PASS |
| W4 Wolf | =3 | **3** | **3** | ✅ PASS |
| W5 Squid | =2 | **2** | **2** | ✅ PASS |
| W6 Ocelot | =0 | **0** | **0** | ✅ PASS |
| W7 Ghast | ≥1 | **8** | **6** | ✅ PASS |
| W8 Chicken | ≥1 | **8** | **8** | ✅ PASS |
| W9 旗关 | `[DropLog] base` 全档 0；`[TestLog] hit` ≥3；cfg 还原 | base **0**、hits **9**、anyDropLog **0**、cfg 回 `livestockNeedsR196=true` | — | ✅ 负证据成立 |

`[done]` 原文：
- v1 `{"run":"v1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"w8":true,"stop":{"exitCode":0,"exited":true},"pass":true}`（EXIT=0）
- v2 `{"run":"v2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"w8":true,"stop":{"exitCode":0,"exited":true},"pass":true}`（EXIT=0）
- W9 `{"run":"w9","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`（EXIT=0），`[W9] {"base":0,"hits":9,"anyDropLog":0}`

## §2 判行锚（tee 全量流行号）

### v1 `testharness/build-logs/b51s-v1.out`（919,873 B）
- `2362` `Done (6.515s)! For help, type "help" or "?"`
- `5597` `[DropLog] base class=creeper item=minecraft:gunpowder count=1 recently=true looting=0 entity=EntityCreeper#2674`
- `5664` `[DropLog] base class=enderman item=minecraft:ender_pearl count=1 recently=true looting=0 entity=EntityEnderman#2713`
- `5735` `[DropLog] base class=pigzombie item=minecraft:gold_nugget count=1 recently=true looting=0 entity=EntityPigZombie#2742`
- `5781` `[DropLog] base class=wolf item=minecraft:leather count=1 recently=true looting=0 entity=EntityWolf#2767`
- `5807` `[DropLog] base class=squid item=minecraft:dye count=1 recently=true looting=0 entity=EntitySquid#2777`
- **Ocelot 正判据旁证**：`5821` `[TestLog] hit player=ETIM_F7 target=EntityOcelot#2785 amount=1000.0 [server]`、`5828` `… target=EntityOcelot#2784 …`（两只均被命中击杀，全档 `[DropLog] base class=ocelot` **0 条**）
- `5845` `[DropLog] base class=ghast item=minecraft:ghast_tear count=1 recently=true looting=0 entity=EntityGhast#2790`
- `5908` `[DropLog] base class=chicken item=minecraft:chicken count=1 recently=true looting=0 entity=EntityChicken#2810`
- `5934` `BUILD SUCCESSFUL in 56s`

### v2 `testharness/build-logs/b51s-v2.out`（908,568 B）
- `2362` `Done (5.916s)!`
- `5526` creeper `gunpowder`（#2599）；`5588` enderman `ender_pearl`（#2642）；`5658` pigzombie `rotten_flesh`（#2670）；`5703` wolf `leather`（#2694）；`5729` squid `dye`（#2705）；`5769` ghast `ghast_tear`（#2717）；`5830` chicken `chicken`（#2735）
- Ocelot：`[TestLog] hit … EntityOcelot` 2 条，`[DropLog] base class=ocelot` 0 条
- `5856` `BUILD SUCCESSFUL in 55s`

### W9 旗关 `testharness/build-logs/b51-w9.out`（495,987 B）
- `2362` `Done (5.852s)!`
- `3116` `[TestLog] hit player=ETIM_F7 target=EntityCreeper#2490 amount=1000.0 [server]`（共 9 条 hit，Creeper/Wolf/Chicken 各 3）
- 全档 `[DropLog]` **0 条**（不只 base，任何 DropLog 都没有）
- `[cfg] B:livestockNeedsR196=false B:mobDebugLog=true`（起服实读）；停服后 `run/config/etim.cfg` 回 `B:livestockNeedsR196=true`、sha `71EA288B…`

## §3 A-B-C 分级

**A 级（判据错误/假绿/产品回归）**：无。
**B 级（覆盖不足但结论仍成立）**：无。

**C 级（逐条）**

- **C-B51-1 Witch 药水 subtype 无 1.12 映射**：本批 8 类不含 Witch；`ETIMMobDrops` 药水映射在 1.12 无对应子类型，未覆盖。
- **C-B51-2 `/etest hit` 自带 `[TestLog] hit` 探针**：命中行同时是「伤害通道活着」的证据（W9 用它反证零行不是通道静默）。
- **C-B51-3 1.12 selector 用 `c=1`**：驱动批量击杀用 `@e[type=…,x=-51,y=120,z=239,r=12,c=1]`，每次一条；`limit=1` 在 1.12 无效。
- **C-B51-4 stage 必须 `difficulty 1` ＋ `doMobLoot true`**：peaceful 会直接清怪、`doMobLoot false` 会让掉落表空转。
- **C-B51-5 未覆盖 looting 附魔**：全部 `looting=0`；附魔增量面未测。
- **C-B51-6 未覆盖 Ghast 玩家火球泪路径**：本窗 Ghast 用 `/etest hit` 击杀，火焰球反射路径未覆盖。
- **C-B51-7 世界保留数**：`run/w-b51s-{r1..r7,v1,v2,w9}` 共 10 个（23/27/26/26/26/27/25/29/24/25 文件），全保留未删。
- **C-B51-8 单 PIN**：驱动只在 boot 后打一条 `[PIN]`，无收窗 PIN（三臂各 1 条，sha 与 MK 全一致）。
- **C-B51-9 `[server]` 双写/无前缀双写并存**：DropLog base 行不带 `[server]`，`[TestLog] hit` 带；行过滤按正文匹配，不受影响。
- **C-B51-10 r1–r7 为工装历史失败轮**：`build-logs/b51s-r*.out` 为开发期轮次，不计产品回归。
- **C-B51-11 HEAD 未钉**：任务书只钉 jar/MK，实测 HEAD `7d5328c` 且 `origin/HEAD..HEAD` 欠 1（B-51 产品改动已在本地提交、未推送）；窗内 0 提交，不影响判窗。
- **C-B51-12 stage 扫场顺带触发 base 行**：`kill @e[type=!player]` 会杀掉自然刷出的鸡，产生臂外 `[DropLog] base class=chicken … entity=EntityChicken#107`（v1 `4930`、v2 `4873`）；臂计数按 `srv.all.length` 切片，未污染。
- **C-B51-13 单次死亡可出多行**：Creeper 8 只出 7 行、Chicken 4 只出 8 行、Ghast 3 只出 8/6 行 —— 一行＝掉落表一条目，不等于一只；判据按行数区间设计（W1 1..24、W7/W8 ≥1）已容纳。
- **C-B51-14 PigZombie 掉落物随机**：v1 `gold_nugget`、v2 `rotten_flesh`，属 R196 表内随机项，非行为漂移。

## §4 收口清单

| 项 | 状态 |
|---|---|
| 客户端 | 未启动（全服务端日志判定） |
| 停服次数 | 4 次（v1 / v2 / W9 / 各 boot）全 `{"exitCode":0,"exited":true}` |
| BUILD | `in 56s`（v1）、`in 55s`（v2）、W9 无单独 BUILD 行（同 boot 流） |
| jar | 1,217,813 B `5B6EF49C…0514`，mtime `2026-11-20T23:56:39Z` 未变 |
| MK | 101/242/484 + 101/10，`ok=true`（三臂） |
| HEAD | `7d5328c`，窗内 0 提交；`git status` 118→119（仅新增 W9 脚本） |
| crash / port | 24 → 24；0 |
| cfg | 起收同 `71EA288B…`；`livestockNeedsR196=true`、`mobDebugLog=false` 已还原 |
| props | 起收同 `E3DE434…`；`level-name=w-b30v`、`allow-flight=false` |
| 世界 | `w-b51s-v1`(29)、`w-b51s-v2`(24)、`w-b51s-w9`(25)＋开发轮 r1–r7 全保留 |
| 产品码 | 0 改动，未 build，未 commit/push |

## §5 文尾

- 正本：`git-workspace/etim/testharness/reports/b51-verify-verdict.md` 10246 B / 125 行
- 证据：`testharness/build-logs/b51s-v1.out` 919,873 B、`b51s-v2.out` 908,568 B、`b51-w9.out` 495,987 B
- 驱动：`testharness/player/f11-b51-smoke.js`（主驱动，未改）、`testharness/player/_b51-w9.js`（本窗自写 W9 臂）
- 三 SHA：jar `5B6EF49CBAE026BC8174DF9CAA527C921E1AD1C3DDE2AED4C58EFF2CAF890514`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`

## §6 结论与两个专问

**建议按 PASS 收批**：W0–W8 两轮全过、W9 负证据成立，A/B 级 0 条，C 级 14 条全属覆盖/工装口径。

**专问一：W9 零行强度是否足够？——足够，强度「强」。**
- 负证据是**全档** `[DropLog]` 0 条（不只是 `base`），且同 boot 内 `[TestLog] hit` 9 条（Creeper/Wolf/Chicken 各 3 次、`amount=1000.0`）证明目标确实被击杀。
- cfg 起服实读 `B:livestockNeedsR196=false`，停服回 `true`，旗值链路可证；`mobDebugLog=true` 保证若走了掉落表必留行。
- 弱点：无同 boot 反事实窗（config 仅起服读），正对照取 v1/v2 的 8 类臂；另未覆盖 Witch/looting/火球泪路径（C-B51-1/5/6）。

**专问二：Ocelot 0 行是否可作为正判据？——可以，但必须配「已击杀」旁证。**
- 本窗两只 Ocelot 各有 `[TestLog] hit … EntityOcelot#2785 / #2784 amount=1000.0`（v1 `5821`/`5828`；v2 同 2 条），死亡成立；全档无 `class=ocelot` 的 base 行 ⇒ 排除是「怪没死」而非「表没走」。
- 若只看 0 行而不看 hit 行，则可能因召唤失败/未命中造成假绿；本窗未发生（两轮 hit 均 2 条）。
