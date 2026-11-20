# W-B48 判窗正本（D 卷属性补件：骷髅 0.3 / 狼 12·32 / addGrowth×5）

**判窗时间**：2026-11-20 23:31 → 23:38（CST 本地；服务端日志为 UTC，差值 +8h）
**执行方**：会话七（ETIM 验证窗执行）
**判决源**：工作树 HEAD `a45dedc`（窗内 0 提交）

## §0 钉值（实测）

| 项 | 实测值 | 钉值 | 判定 |
|---|---|---|---|
| release jar | `build/libs/etim-1.0.0.jar` 1,210,715 B | 1,210,715 B | ✅ |
| release SHA256 | `16E8FA88BF4329D977370B4BFF69606F25D22C09D8B020740B7D1E648C2ED277` | 同 | ✅ |
| jar mtime | `2026-11-20T15:24:03Z` | `15:24:03Z` | ✅ 窗内 0 rebuild |
| MK refmap | classes 101 / entries 241 / dual 482 | 101 / 241 / 482 | ✅ |
| MK manifest | mixins 101 / client 10 | 101 + 10 | ✅ |
| HEAD | `a45dedc` | `a45dedc` | ✅ 窗内 0 提交 |
| crash-reports | 24 → 24 | — | ✅ 窗内无新增 |
| port 25565 | 0（全部停服后） | 0 | ✅ |
| cfg SHA256 | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（49,406 B） | 起收全同（含 W5/W6 注入后还原） | ✅ |
| props SHA256 | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` | 起收同 | ✅ |
| props level-name | 起 `w-b30v` → 收 `w-b30v`；`allow-flight=false` | 还原成立 | ✅ |

**MK 口径说明**：`testharness/player/f7-wb-lib.js:36` 的 `MK_PIN` 仍是 B-41 基线（101/238/476/100/10），故 `L.mkCounts().ok` 恒为 false；驱动 `f11-b48-smoke.js:23-25` 自带 101/241/482 比对，本正本以实测计数与工单钉值为准（见 C-B48-4）。

## §1 判读总表

| 窗 | 内容 | 判据 | v1 | v2 | 判定 |
|---|---|---|---|---|---|
| W0 | PIN／卫生 | 双轮 `pin=true`、mixinFail=0、双停服 `{exitCode:0,exited:true}` | pin=true | pin=true | ✅ PASS |
| W1 | 骷髅移动速度 | `[AILog] mob stats movementSpeed=0.3 entity=EntitySkeleton#…` | true | true | ✅ PASS |
| W2 | 野生狼 | `wolf probe tamed=false hp=8.0 max=8.0 attack=3.0 follow=16.0 speed=0.4` | true | true | ✅ PASS |
| W3 | 驯服狼 | `wolf probe tamed=true hp=12.0 max=12.0 attack=3.0 follow=32.0 speed=0.4` | true | true | ✅ PASS |
| W4 | addGrowth ×5 | `[FarmLog] addGrowth` 前后差 = 5 | delta=5 | delta=5 | ✅ PASS |
| W5 | 默认关（自写探针） | ①0 条 mob stats ②狼回落 vanilla ③delta=20 | — | pass=true（r2） | ✅ PASS |
| W6 | B-1 回归（自写探针） | zombie 5.0/32.0/0.0、pigzombie 8.0/32.0、spider 12.0/4.0/28.0 | — | pass=true（r2） | ✅ PASS |

`[done]` 原文：
- v1 `{"run":"v1","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`
- v2 `{"run":"v2","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`
- W5-r2 `{"run":"w5","pass":true,"bad":0}`
- W6-r2 `{"run":"w6","pass":true,"bad":0}`

## §2 判行锚

### 轮一 `testharness/build-logs/b48-v1.out`（895,651 B）
- `2362` `Done (5.613s)! For help, type "help" or "?"`
- `5705` `[AILog] mob stats movementSpeed=0.3 entity=EntitySkeleton#2736`（W1，召唤后 900 ms 内）
- `5709` `[AILog] wolf probe tamed=false hp=8.0 max=8.0 attack=3.0 follow=16.0 speed=0.4`
- `5712` `[AILog] wolf probe tamed=true hp=12.0 max=12.0 attack=3.0 follow=32.0 speed=0.4`
- `5714` `[AILog] wolfhostile src=wolf probe-in inv=16 hostile=false cd=0 flag=true entity=EntityWolf#2738`（伴随信号，非判据）
- `5723` `[FarmLog] addGrowth kind=EntityPig id=2739 n=1 before=-23986 after=-23981`（差 5）
- `5751` `BUILD SUCCESSFUL in 28s`

### 轮二 `testharness/build-logs/b48-v2.out`（885,253 B）
- `2361` `Done (5.501s)!`
- `5628` `movementSpeed=0.3 entity=EntitySkeleton#2649`
- `5632` 野生狼行（同上）；`5635` 驯服狼行（同上）
- `5646` `[FarmLog] addGrowth kind=EntityPig id=2652 n=1 before=-23986 after=-23981`
- `5674` `BUILD SUCCESSFUL in 28s`

### W5 默认关 `testharness/build-logs/b48w5.out`（128,598 B，r2）
- `630` `Done (1.140s)!`（世界复用，秒起）
- **全档 `[AILog] mob stats` 0 条**（含骷髅召唤后的 1.5 s 窗口）→ 负证据①成立
- `991` `[AILog] wolf probe tamed=true hp=8.0 max=20.0 attack=4.0 follow=16.0 speed=0.30000001192092896` → max/attack/follow/speed 全为 vanilla 值（负证据②）
- `998` `[FarmLog] addGrowth kind=EntityPig id=352 n=1 before=-23984 after=-23964`（差 **20**）→ 负证据③
- `1022` `BUILD SUCCESSFUL in 23s`

### W6 回归 `testharness/build-logs/b48w6.out`（131,108 B，r2）
- `629` `Done (1.113s)!`
- `1010/1011/1012` `mob stats attackDamage=5.0 / followRange=32.0 / armor=0.0 entity=EntityZombie#369`
- `1018/1019/1020` `followRange=32.0 / armor=0.0 / attackDamage=8.0 entity=EntityPigZombie#370`
- `1026/1027/1028` `maxHealth=12.0 / attackDamage=4.0 / followRange=28.0 entity=EntitySpider#371`
- `1051` `BUILD SUCCESSFUL in 25s`

> 注：`[AILog] mob stats` 是**一属性一行**（同实体 id 连续三行），不是一行三属性；`next` 行号以 tee 全量流为准（见 C-B48-5）。

## §3 登记项

**A 级（产品行为与 R196/预期不符）**：无。
**B 级（判据不足或工装歧义）**：无。

**C 级（观察与口径）**

- **C-B48-1 W6 首轮工装红（实体 id）**：`summon minecraft:pigzombie` 在 1.12 无效，服日志 `Skipping Entity with id minecraft:pigzombie` + `Unable to summon object`，且该错误不回显到命令发送方日志面；正确 id 为 `minecraft:zombie_pigman`。首轮 `[W6-rows].pigzombie=[]`，改 id 后 r2 通过。首轮证据留档 `build-logs/b48-w6.out`（pass=false）。
- **C-B48-2 W5 首轮工装红（字符串口径）**：①`/etest wolf … true` 生成的狼只把 `maxHealth` 抬到 20.0，`hp` 保持 8.0（未回血），与工单「hp=20.0」字面不符；②float 速度打印为 `0.30000001192092896`，按 `speed=0.3` 精确匹配必红。最终判据改为数值解析（max=20、attack=4、follow=16、|speed−0.3|<1e-3），首轮留档 `build-logs/b48-w5-r1.out`。
- **C-B48-3 mob stats 行粒度**：一属性一行（`attackDamage=` / `followRange=` / `armor=` / `maxHealth=` / `movementSpeed=`），出现多行时应按实体 id 归并；本正本判据均按属性行分别匹配。
- **C-B48-4 MK 基线口径**：`f7-wb-lib.js` 的 `MK_PIN` 未随 B-46/B-47/B-48 更新（仍是 101/238/476/100/10），`mkCounts().ok` 恒 false；驱动与正本改用显式计数比对（101/241/482、101/10）。
- **C-B48-5 日志轮转**：`run/logs/latest.log` 停服后内容不完整（1.12 轮转 `.log.gz`），正本行号锚取自 `testharness/build-logs/<tag>.out`（tee 全量流，含 stdout 与服务端行）。
- **C-B48-6 世界残留**：`run/` 下 `w-b48*` 共 7 个（`w-b48s-r1/r2/r3` 开发遗留、`w-b48s-v1/v2` 主窗、`w-b48s-w5/w6` 补臂），全部保留未删。
- **C-B48-7 成对双写**：`[server]` 后缀行与不带后缀的行为同一事件两次输出，统计需去重（本窗判据用 `has()`／属性匹配，不受影响）。
- **C-B48-8 补臂自写**：`testharness/player/_b48-w5.js`、`_b48-w6.js` 为本会话编写（`node --check` 通过），不属工单驱动；W5 注入 `mobStatsR196=false` + `livestockNeedsR196=false`，W6 注入两旗 true。
- **C-B48-9 W5 正对照来源**：W5 窗内无正对照（旗关时本就不该出行），其正对照来自同批 v1/v2（旗开时 `movementSpeed=0.3` 与 `wolf 12/32` 各出现），属跨窗对照。

## §4 收口清单

| 项 | 状态 |
|---|---|
| 客户端 | 未启动（全服务端日志判定） |
| 停服 | 4 次全 `{"exitCode":0,"exited":true}`（v1/v2/W5-r2/W6-r2；首轮 W5/W6 亦为 0/true） |
| BUILD | v1 `in 28s`、v2 `in 28s`、W5 `in 23s`、W6 `in 25s` |
| jar | 1,210,715 B，mtime `2026-11-20T15:24:03Z` 未变（0 rebuild） |
| MK | 101/241/482 + 101/10（驱动自带比对 ok=true） |
| crash-reports | 24 → 24 |
| port 25565 | 0 |
| cfg | 起收同 `71EA288B…`；W5/W6 注入后已还原（`mobStatsR196=true`、`livestockNeedsR196=true`） |
| props | 起收同 `E3DE434…`；`level-name` 收 `w-b30v`、`allow-flight=false` |
| HEAD | `a45dedc`，窗内 0 提交 |
| 世界 | `w-b48s-r1/r2/r3/v1/v2/w5/w6` 全保留（v1 29 文件、v2 25、w5 27、w6 28） |
| 产品码 | 0 改动（未 checkout/reset/clean，未 commit） |

## §5 文尾

- 正本：`git-workspace/etim/testharness/reports/b48-verify-verdict.md` 9739 B / 126 行
- 证据：`testharness/build-logs/b48-v1.out` 895,651 B、`b48-v2.out` 885,253 B、`b48w5.out` 128,598 B（r2）、`b48w6.out` 131,108 B（r2）；首轮留档 `build-logs/b48-w5-r1.out`、`build-logs/b48-w6.out`
- 驱动/探针输出：`build-logs/b48-v1.out`（stdout 同文件）、`b48-w5-r2.out`、`b48-w6-r2.out`
- 三 SHA：jar `16E8FA88BF4329D977370B4BFF69606F25D22C09D8B020740B7D1E648C2ED277`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`

## §6 结论

**按 PASS 收批**：W0–W6 全部成立，两轮主驱动 `bad=0`、EXIT=0；A/B 级 0 条，C 级 9 条均属工装口径。

**W5 默认关臂证据强度：强（三条独立负证据同窗同 boot）**
1. 旗关时 `[AILog] mob stats` **整档 0 条**——连骷髅召唤后的 1.5 s 窗口内也无任何 stats 行（对比旗开轮同一动作必有 `movementSpeed=0.3` 行）；
2. 狼回落 vanilla：`max=20.0 attack=4.0 follow=16.0 speed=0.3`，与旗开时的 `12/3/32/0.4` 形成同参数反例；
3. `addGrowth` 差 **20** vs 旗开 **5**，4 倍差且为整数口径，无法由时序或采样噪声解释。
剩余弱点：W5 无反事实窗（同一 boot 内切旗不可能，config 只在起服读），正对照必须取同批旗开窗（C-B48-9）；`hp=8.0` 的狼属探针不回血，非产品差异（C-B48-2）。
