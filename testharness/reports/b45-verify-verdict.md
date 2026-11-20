# W-B45 判窗正本 — 可修理技能集（R196 `:91`，B 方案最小层）

## §0 钉值与现场

| 项 | 值 |
|---|---|
| 判窗 jar | `build/libs/etim-1.0.0.jar` **1,196,055 B** |
| jar sha256 | `6380ABE54CB9F5A06E0294B97A9C6710BDCEB730B5EC6FA96A81F3A0678B9CD6` |
| jar mtime | `2026-11-20T13:00:24Z`（窗内未变，0 rebuild） |
| MK | `{classes:101, entries:239, dual:478, mixins:100, client:10}` ok=true |
| HEAD | `7309b69`（窗内 0 提交） |
| 驱动 | `testharness/player/f11-b45-smoke.js`（147 行，`node --check` 绿） |
| W5 探针 | `testharness/player/_b45-w5.js`（本会话自写，一次性） |
| 轮次 | `RUN=w-b45v1`、`RUN=w-b45v2`、W5 臂（世界 `run/w-b45s-w-b45v1|v2|w5`） |
| cfg | `run/config/etim.cfg` `E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046`（起收同，`skillsEnabled` 键收窗后 0 行） |
| props | `run/server.properties` `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同，`allow-flight=false`／`level-name=w-b30v`） |
| crash | 24 → 24 |
| port 25565 | 起 0 / 收 0 |

## §1 判读总表

| 窗 | 判据 | 轮一 | 轮二 | 结论 |
|---|---|---|---|---|
| W0 | `/etest skills` → `mask=0` ＋ mixinFail=0 | true / 0 | true / 0 | **PASS** |
| W1 | mask=0 + anvilplan pickaxe_copper → `kind=SKILL fail=3 required=256` | true | true | **PASS** |
| W2 | mask=256 + 同命令 → `kind=COMBO fail=0 required=0` | true | true | **PASS** |
| W3 | learn→list(256)→abandon→list(0) 四行齐 | true | true | **PASS** |
| W4 | cudgel_wood→`required=128`；knife_flint→`required=16` | true | true | **PASS** |
| W5 | 默认关臂：不注入 `skillsEnabled`，金属工具修理不被技能门挡 | `pickAllowed=true cudgelAllowed=true` | — | **PASS** |
| PIN | sha 与钉值一致、mk.ok | shaOk=true ok=true | 同 | **PASS**（单条，C-8） |

两轮 `[done]` 均 `bad=0`、`pass=true`、`[stop] {"exitCode":0,"exited":true}`；W5 臂 `[done] {"run":"w5","pass":true,"bad":0}`。
轮一 `Done (5.849s)`、`BUILD SUCCESSFUL in 32s`；轮二 `Done (5.924s)`、`in 32s`。

## §2 判行锚（行号＋原文，已剥日志前缀）

轮一 `testharness/build-logs/b45-w-b45v1.out`（447,961 B）：

- `2853` `[SkillLog] get player=ETIM_F7 mask=0 [server]`（W0）
- `2859` `[CraftingLog] anvilplan player=ETIM_F7 item=etim:pickaxe_copper kind=SKILL fail=3 required=256 [server]`（W1）
- `2865` `[CraftingLog] anvilplan player=ETIM_F7 item=etim:pickaxe_copper kind=COMBO fail=0 required=0 [server]`（W2）
- `2872` `[SkillLog] learn player=ETIM_F7 skill=blacksmithing cost=5 mask=256 [server]`
- `2874` `[SkillLog] list player=ETIM_F7 mask=256 [server]`
- `2876` `[SkillLog] abandon player=ETIM_F7 skill=blacksmithing mask=0 [server]`
- `2878` `[SkillLog] list player=ETIM_F7 mask=0 [server]`（W3 四行齐）
- `2883` `item=etim:cudgel_wood kind=SKILL fail=3 required=128 [server]`；`2886` `item=etim:knife_flint kind=SKILL fail=3 required=16 [server]`（W4）
- `2909` `BUILD SUCCESSFUL in 32s`

轮二 `b45-w-b45v2.out`（449,036 B）：

- `2859` `[SkillLog] get … mask=0 [server]`；`2865` `pickaxe_copper … fail=3 required=256 [server]`
- `2871` `pickaxe_copper … kind=COMBO fail=0 required=0 [server]`
- `2878/2880/2882/2884` learn(256)／list(256)／abandon(0)／list(0)
- `2889` `cudgel_wood … required=128 [server]`；`2892` `knife_flint … required=16 [server]`
- `2915` `BUILD SUCCESSFUL in 32s`

W5 臂（`testharness/build-logs/b45w5-w5.out`，stdout `build-logs/f11-b45-w5-stdout.out`）：

- 起窗前 cfg 中 `skillsEnabled` 键不存在（产品默认 `ETIMConfig.java:328 → false`，读键 `:1054`）
- `[SkillLog] get player=ETIM_F7 mask=0`（能力仍在，不受旗影响）
- `[CraftingLog] anvilplan player=ETIM_F7 item=etim:pickaxe_copper kind=COMBO fail=0 required=0 [server]`
- `[CraftingLog] anvilplan player=ETIM_F7 item=etim:cudgel_wood kind=COMBO fail=0 required=0 [server]`
- `[stop] {"exitCode":0,"exited":true}`

PIN（两轮）：`[PIN] sha=6380ABE54CB9F5A06E0294B97A9C6710BDCEB730B5EC6FA96A81F3A0678B9CD6 expected=… shaOk=true mk={classes:101,entries:239,dual:478,mixins:100,client:10} ok=true`

## §3 登记项

- **C-1**（确认）客户端预览未同步技能状态：服务端权威拒绝；客户端 tooltip 的 `fail=3` 分支当前不可达，后续加 capability 同步包再补。
- **C-2**（确认）命令根名为 `/etimskill`（R196 为 `/skill`），因 `/etim` 已被下界命令占用。
- **C-3**（确认）只门控 ETIM 金属装备；vanilla 工具不接技能门（W5 臂即旁证：无旗时金属工具不挡）。
- **C-4**（确认）学习限每天一次、费用 `5×(n+1)` 级，按 R196 口径；第 1 天可学（`total/24000+1`，`lastLearnDay` 默认 0）。
- **C-5**（确认）默认 `skillsEnabled=false`，保持 skills-disabled parity。
- **C-6**（新，日志噪声）同一事件在日志里成对出现：带 `[server]` 尾标一条、不带一条（如 v1 `2853`/`2854`）。两者内容一致，判据取带 `[server]` 的那条。
- **C-7**（新，驱动行为）W1/W3/W4 前各有一条 `etest skills ETIM_F7 <mask>` 的清位调用（驱动主动置位），非任务书步骤；无副作用。
- **C-8**（新，判据面缺口）驱动 `:25` 只打**一条** `[PIN]`（开工）。以「单 PIN＋jar mtime 不变＋窗内 0 rebuild」替代双 PIN。
- **C-9**（新，未覆盖面）W3 只验「可学／可列／可弃」；未验「同日二次学习被拒」与「费用随已学数递增」。两项按 R196 口径实现，本窗无判据。
- **C-10**（新，世界面）`run/` 下 `w-b45s-r1`、`w-b45s-r2`（开发烟测遗留）与本窗 `w-b45s-w-b45v1|v2|w5` 并存，全部保留未删。
- **C-11**（新，W5 通道）W5 臂由本会话自写探针 `player/_b45-w5.js` 执行（不注入 `skillsEnabled`），证据为「cfg 无该键 → 产品默认 false → anvilplan 两行 `fail=0`」。

## §4 收口

- 客户端：本窗未起客户端（C-1 的 tooltip 面属客户端，未验）。
- 服务端：两轮各一次 boot、W5 一次；三次 `[stop] {exitCode:0,exited:true}`，三次 `BUILD SUCCESSFUL`。
- jar：mtime `2026-11-20T13:00:24Z` 起收一致，窗内 0 rebuild。
- cfg：hash 起收同；`skillsEnabled` 键收窗后 0 行（驱动按 `cfgBefore` 原样还原）。
- props：hash 起收同；`allow-flight=false`、`level-name=w-b30v` 已还原。
- crash：24 → 24；port 25565 起收均无监听。
- 世界：`w-b45s-w-b45v1`（23 文件 3,623,434 B）、`w-b45s-w-b45v2`（24 文件 3,623,438 B）、`w-b45s-w5`（30 文件 3,755,751 B）保留。
- 证据：`build-logs/b45-w-b45v1.out` 447,961 B、`b45-w-b45v2.out` 449,036 B、`b45w5-w5.out` 360,259 B、`f11-b45-smoke-w-b45v1-stdout.out` 12,217 B、`-w-b45v2-stdout.out` 12,359 B、`f11-b45-w5-stdout.out` 2,465 B。

本文件 **6927 B / 92 行**（UTF-8 无 BOM、LF、U+FFFD 0）。
