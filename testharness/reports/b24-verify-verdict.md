# R196 日灼臂（EntityAIFleeSun 家族＋EntityAIRestrictSun wedge）· **W-B24 判决**（B-24 批，HEAD `f36b21b`）

> **HEAD**：`f36b21bf46432622364bee7fb46d9d8fbbdfcfa2`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar）
> **jar**：`build/libs/etim-1.0.0.jar` **1,079,239 B**｜SHA256 `DDE182AEBA5D627797CD1643B2302DBF92A56B5F67C35C08BBA515BFC60B503E`（起收同值）
> **dev/sources**：1,058,276 B `5C53E767…`／984,915 B `B385BC51…`（起收同值）
> **refmap**：classes **95** / entries **214**（dual 428，双树同）｜**mixins**：**92** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.417s)`／`Done (6.115s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 4m 6s／1m 11s）｜单假人 `ETIM_F7`（spectator）｜判窗世界 `w-b24v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓**（A 0／B 0／D 0／C 4）
> **判据来源**：本窗 canonical run（run 1 工装缺陷作废，见 §3 C-B24-1；产品码零改动）
> **报告字节规格**：`7,401 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 9 / ✗ 1｜63 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot×2 干净 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2＋起收 pin 同 | b1 `Done (5.417s)!`（b1:2341，15:39:50）／b2 `Done (6.115s)!`（b2:2341，15:43:54），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 4m 6s`（b1:3801）／`in 1m 11s`（b2:4129）；两次 `[PIN]` 同 releaseSha `DDE182AE…`、同 mk 95/214/428＋92+10（07:39:29.592Z／07:44:49.497Z） | ✓ |
| **W1** 僵尸村民楔 | 昼 `summon zombie_villager` 于 sunlit pad，90 s 窗 ≥1 `fleesun … start` | **2 行**：b1:3706 `shelter=-71,67,240`、b1:3719 `shelter=-76,68,232`，均 `EntityZombieVillager#1984`、`speed=1.0` | ✓ |
| **W2** 骷髅 ctor 座 | `summon skeleton` 于露天落点，120 s 窗 ≥1 start | **1 行**：b1:3765 `shelter=-71,67,243 speed=1.0 entity=EntitySkeleton#1985`；probe 证门链：b1:3760 `burning=false inSky=true`→b1:3764 `burning=true inSky=true`（燃烧起于第 3 次调用前） | ✓ |
| **W3** 旗断双零 | boot 2 旗 false 复放 40 s → `fleesun` start **0 行且 probe 0 行** | b2 全档（4,132 行）`fleesun` **0 行**（start 0＋probe-in 0）；对照 b1 probe-in **11 行** | ✓ |

## §2 判行原文

**W1 · 僵尸村民（2 行）**
- `[AILog] fleesun src=? start shelter=-71,67,240 speed=1.0 entity=EntityZombieVillager#1984`（b1:3706）
- `[AILog] fleesun src=? start shelter=-76,68,232 speed=1.0 entity=EntityZombieVillager#1984`（b1:3719）

**W2 · 骷髅（1 行＋门链 probe）**
- `[AILog] fleesun src=? probe-in inv=1 day=true burning=false inSky=true flag=true entity=EntitySkeleton#1985`（b1:3760）
- `[AILog] fleesun src=? probe-in inv=5 day=true burning=true inSky=true flag=true entity=EntitySkeleton#1985`（b1:3764）
- `[AILog] fleesun src=? start shelter=-71,67,243 speed=1.0 entity=EntitySkeleton#1985`（b1:3765）

**W3 · 旗断双零**
- b2 全档 `fleesun` **0 行**（`Select-String` 0 命中；start 与 probe-in 双零）

**W0 · 窗面**
- `Done (5.417s)! For help, type "help" or "?"`（b1:2341）｜`Done (6.115s)!`（b2:2341）
- `BUILD SUCCESSFUL in 4m 6s`（b1:3801）｜`BUILD SUCCESSFUL in 1m 11s`（b2:4129）

## §3 冲突分级

- **A 级：0** —— 四臂门位全部落地：楔座（僵尸村民）与 ctor 座（骷髅）都出 `start`，旗断双零成立。
- **B 级：0** —— 本批零 cfg 新增（复用 `livestockNeedsR196`），mixin 注册 +1（91→92）已在 build 侧收编；`mkCounts().ok=true`，95/214/428＋92+10 起收同。
- **D 级：0** —— 与烟测的差异为窗宽与骷髅寿命抽样，行域与门位不漂（见 §4）。
- **C 级：4**
  - **C-B24-1**（工装·run 1 作废）：首跑 bot 站位 `(-69.5, 68, 242.5)` 落在 hut 的 y68 石台内部——被僵尸村民击杀两次（`ETIM_F7 was slain by Zombie Villager`，07:33:42／07:33:56）后 `ETIM_F7 drowned`（07:34:14）；同时骷髅落点 `(-69.5, 67, 243.5)` 的列被树冠遮蔽（b1:3408 probe `inSky=false burning=false`），整窗 0 start。判定：场地缺陷，判值面未获机会，整跑作废。修复：①假人改 `gamemode 3`（spectator，不吃仇恨/不窒息）；②清空带扩到 `fill -79 67 236 -66 92 251 air`（连树冠一起清）；③bot 移 `(-76.5, 68, 242.5)` 露天开阔位；④骷髅改 `(-74.5, 67, 242.5)` 场心。run 1 快照：`f11-b24-verify-r1-b1.out` 507,509 B／`-r1-b2.out` 529,455 B／`-r1-stdout.out` 87,309 B。
  - **C-B24-2**（落点·与任务书坐标差异）：任务书 W2 写 `summon skeleton -71.5,67,240.5`（伞门口），实测该列被树冠遮蔽（`inSky=false`，燃烧起不来），canonical 改用场心 `-74.5,67,242.5`。判定面（≥1 start）不变，属工装落点修正。
  - **C-B24-3**（互通·抽样漂移）：smoke r4 `a1=4／a2=2／b1=0`、judge v1 shell `a1=2／a2=1／b1=0`；本窗 `a1=2／a2=1／b1=0`——与 judge v1 shell 逐项同，差异归 90 s 窗内随机游走相位与骷髅 6 s 寿命窗。
  - **C-B24-4**（工装·驱动补强 2 处，未触产品码）：①W3 由「start 0 行」收紧为「start 0 行＋probe 0 行」双零门（任务书铁律）；②尾部改显式 `process.exit(bad?2:0)`、catch 补 bot.quit／srv.stop／props/cfg 回写（C-B16-6／C-B22-5 同型）。

## §4 收口五件

- **jar／dev／sources 起收同**：1,079,239 `DDE182AE…`；dev 1,058,276 `5C53E767…`；sources 984,915 `B385BC51…`（窗内 **0 rebuild**；两次 `[PIN]` 同值）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false` 保持判窗预设）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name` 已还原 `w-b23v`）。
- **MK 起收同**：refmap 95/214（dual 428）＋mixins 92+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `f36b21b` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAIFleeSun.java` 07:04:14Z、`MixinEntitySkeleton.java` 06:15:24Z、`MixinEntityZombieVillager.java` 06:17:56Z）均早于本窗起点 07:39Z；`git status` src 侧 ` M MixinEntityZombieVillager.java`／` M mixins.etim.json`／`?? MixinEntitySkeleton.java`／`?? ETIMEntityAIFleeSun.java`（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b24v` 保留（25 文件／3,541,006 B）；`w-b23v`／`w-b22v` 未动。
- **互通（vs smoke r4 `build-logs/f11-b24-smoke.json` 与 judge v1 shell）**：a1 4→2、a2 2→1、b1 0→0；与 judge v1 shell（2／1／0）逐项一致；`shelter=` 为采样点（水格／伞内／hut 任选，任务书明示不按精度判 FAIL）。

> 正本：`testharness/reports/b24-verify-verdict.md`｜byte 五项：`7,401 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 62（split 63）`
> SHA-256 甲（全档零位）`056A15AC18451555D4C7E2886A57F642A4C70C98A9241D07CE22E59DFA16828E`
> SHA-256 乙（LF 归零零位）`056A15AC18451555D4C7E2886A57F642A4C70C98A9241D07CE22E59DFA16828E`
> SHA-256 丙（行链零位）`BE29FB192F47776266B9A2C822C7ADA95041347E4E085FB973C82F56D4833647`
