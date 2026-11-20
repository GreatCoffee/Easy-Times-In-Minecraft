# W-B44 判窗正本 — 矿史莱姆（R196 `mining ooze` :90）

## §0 钉值与现场

| 项 | 值 |
|---|---|
| 判窗 jar | `build/libs/etim-1.0.0.jar` **1,179,144 B** |
| jar sha256 | `20133603061147B4A1DD411A83A2675685C6FDBC9850435016173B1FE3E89B19` |
| jar mtime | `2026-11-20T12:27:37Z`（窗内未变，0 rebuild） |
| MK | `{classes:101, entries:239, dual:478, mixins:100, client:10}` ok=true |
| HEAD | `e5eea56`（窗内 0 提交） |
| 驱动 | `testharness/player/f11-b44-smoke.js`（159 行，`node --check` 绿） |
| 轮次 | `RUN=w-b44v1` / `RUN=w-b44v2`（世界 `run/w-b44s-w-b44v1`、`run/w-b44s-w-b44v2`） |
| cfg | `run/config/etim.cfg` 49,381 B `E73BB0489D78B19E60876A0B8EFA5F2A4B6774B9319BF74793070CD6E8169046`（起收同） |
| props | `run/server.properties` `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`（起收同） |
| crash | 24 → 24（基线未动） |
| port 25565 | 起 0 / 收 0 |

## §1 判读总表

| 窗 | 判据 | 轮一 | 轮二 | 结论 |
|---|---|---|---|---|
| W0 | `gear recipes registered: 37` ＋ mixinFail=0 ＋ B-43 回归 cudgel 200/1.0、club 400/2.0 | recipes=true / 0 / 两行齐 | 同 | **PASS** |
| W1 | `/etest ooze` → `[OozeLog] spawn source=test … size=1 maxHealth=1 attack=3 xp=4` ＋ 实体存在 | spawn=true / entity=true | 同 | **PASS** |
| W2 | 采矿链 → ≥1 `roll chance=1.0 win=true` ＋ `spawn source=mining` ＋ 实体存在 | tries=7 rolls=7 spawn=true entity=true | tries=8 rolls=8 spawn=true entity=true | **PASS** |
| W3 | 泥土（非 requiresTool）→ 0 roll、0 spawn | rolls=0 | rolls=0 | **PASS** |
| W4 | `/summon etim:ooze {Size:0,NoAI:1b}` → 实体存在 | entity=true | entity=true | **PASS** |
| W5 | B-42/B-43 回归行不受影响 | 仅 EquipLog 可证（MiningLog 0 条） | 同 | **部分 PASS**（C-13） |
| PIN | sha 与钉值一致、mk.ok | shaOk=true ok=true | 同 | **PASS**（单条，见 C-10） |

两轮 `[done]`：`bad=0`、`pass=true`、`[stop] {"exitCode":0,"exited":true}`。
轮一 20:37:0x→20:38:0x（`Done (6.286s)`、`BUILD SUCCESSFUL in 46s`）；轮二 20:38:31→20:39:2x（`Done (6.559s)`、`in 48s`）。

## §2 判行锚（行号＋原文，已剥日志前缀）

轮一 `testharness/build-logs/b44-w-b44v1.out`（454,335 B）：

- `542` `[EquipLog] gear item=etim:cudgel_wood maxDamage=200 attackDamage=1.0 efficiency=2.0 grade=0 burn=100 armor=0.0`
- `543` `[EquipLog] gear item=etim:club_wood maxDamage=400 attackDamage=2.0 efficiency=2.0 grade=0 burn=100 armor=0.0`
- `2359` `Done (6.286s)! For help, type "help" or "?"`
- `2871` `[OozeLog] spawn source=test pos=-60,122,240 size=1 maxHealth=1 attack=3 xp=4`（W1）
- `2885` `[OozeLog] roll chance=1.0 win=true block=minecraft:stone pos=-60,122,240`（W2 首次掷骰）
- `2886` `[OozeLog] skip reason=neighbour block=minecraft:air pos=-60,122,241`（几何面跳过，见 C-15）
- `2885/2894/2903/2912/2921/2930/2939` 共 7 条 roll，全部 `chance=1.0 win=true`
- `2940` `[OozeLog] spawn source=mining pos=-60,122,239 size=1 maxHealth=1 attack=3 xp=4`（W2 定谳行）
- `2962` `### [harness] > summon etim:ooze -60 122 242 {Size:0,NoAI:1b}`（W4）
- `3002` `BUILD SUCCESSFUL in 46s`

轮二 `b44-w-b44v2.out`（452,7xx B）：

- `536` cudgel 200/1.0/2.0、`537` club 400/2.0（与轮一同值）
- `2359` `Done (6.559s)!`
- `2865` `[OozeLog] spawn source=test pos=-60,122,240 size=1 maxHealth=1 attack=3 xp=4`
- `2879/2888/2897/2906/2915/2924/2933/2942` 共 8 条 roll，均 `chance=1.0 win=true`；跳过原因为 `neighbour block=minecraft:air pos=-60,122,241` 与 `stone-neighbours nonStone=2`
- `2943` `[OozeLog] spawn source=mining pos=-60,122,239 size=1 maxHealth=1 attack=3 xp=4`
- `2961` `[TestLog] step=harvest pos=BlockPos{x=-64, y=120, z=240} result=true`（W3 负证据：破土成功但 0 条 OozeLog）
- `2965` `### [harness] > summon etim:ooze -60 122 242 {Size:0,NoAI:1b}`；`2970` `[Ooze: Block placed]`
- `3005` `BUILD SUCCESSFUL in 48s`

PIN（两轮）：`[PIN] sha=20133603061147B4A1DD411A83A2675685C6FDBC9850435016173B1FE3E89B19 expected=… shaOk=true mk={classes:101,entries:239,dual:478,mixins:100,client:10} ok=true`

## §3 登记项

- **C-1**（确认）完整 `EntityGelatinousCube` 溶解表／吞物品／酸蚀物品不搬，只留简化 20 tick 方块溶解 — 范围裁剪，非缺陷。
- **C-2**（确认）攀爬用 `motionY=0.2` 近似，未接完整 move helper — 本窗无攀爬判据，未证。
- **C-3**（确认）邻位 stone 认 1.12 `Blocks.STONE` 全变体（granite/diorite/andesite）— 本窗只验 stone 本体。
- **C-4**（确认）渲染＝vanilla slime 贴图＋灰色 tint，无独立贴图 — 客户端面，由用户目视。
- **C-5**（确认）不搬 spawn egg。
- **C-6**（确认）粒子用 `SLIME`，1.12 无 `gray_ooze` 粒子。
- **C-7**（确认）不搬自然生成表（R196 `BiomeGenBase:182` weight 20）— 本窗不覆盖自然生成。
- **C-8**（确认，降级为「代码锚核」）酸免疫（仅 lava/magic/snowball 可伤）无自动化伤害口，本窗未实测。
- **C-9**（确认）smoke 把 `miningOozeChance` 临时置 1.0；默认 0.01 留在 `ETIMConfig` 与 cfg。实测：cfg 原本无该键，驱动插行后起效（roll 行 `chance=1.0`），收窗后该键已被移除、cfg hash 回到 `E73BB048…`。
- **C-10**（新，判据面缺口）驱动 `f11-b44-smoke.js:95` 只打**一条** `[PIN]`（开工），任务书 W0 要求「双 PIN 同 sha」。本轮以「单 PIN＋jar mtime 不变＋窗内 0 rebuild」替代，建议后续驱动补收尾 PIN。
- **C-11**（新，口径）W3 的 `air:true` 表示 `etest harvest` 真把泥土破掉（`testforblock … air` 成立），与任务书「块仍在」字面不符；W3 判据取 `rolls=0`，块态列观察项。
- **C-12**（新，噪声）`oozeExists()` 的 `execute @e[type=etim:ooze] ~ ~ ~ setblock …` 会在多只 ooze 同时存在时刷出 `Failed to execute 'setblock …' as Ooze`（实体已在执行前死亡）；每次判定仍有至少一条 `[Ooze: Block placed]` 成功，故判值不受影响。
- **C-13**（新，W5 覆盖不足）本窗全档 `[MiningLog]` 0 条、无 `axe slab`／`shears silk` 行，W5 的 B-42/B-43 行为面**未被触达**；仅有 EquipLog 200/400 与 `gear recipes registered: 37` 两行回归可证。
- **C-14**（新，世界面）`run/` 下 `w-b44s-r1..r4`（主会话开发烟测留下的 4 个世界）与本窗 `w-b44s-w-b44v1/v2` 并存，全部保留未删。
- **C-15**（新，工装几何面）W2 需 7–8 次重试才 spawn：`etest harvest` 破掉中心块后邻位变 air，`[OozeLog] skip reason=neighbour` / `stone-neighbours nonStone=2` 挡掉前几次；属 cube 几何与 harvest 语义叠加，非产品缺陷。

## §4 收口

- 客户端：本窗未起客户端（渲染面由用户目视，C-4）。
- 服务端：两轮各一次 boot，双 `Done (…)` 正常，双 `[stop] {exitCode:0,exited:true}`，两轮 `BUILD SUCCESSFUL`。
- jar：mtime `2026-11-20T12:27:37Z` 起收一致，窗内 0 rebuild。
- cfg／props：起收 hash 相同；`miningOozeChance` 临时键已移除。
- crash：24 → 24；port 25565 起收均无监听。
- 世界：`run/w-b44s-w-b44v1`（26 文件 3,683,663 B）、`run/w-b44s-w-b44v2`（27 文件 3,682,783 B）保留。
- 证据：`build-logs/b44-w-b44v1.out` 454,335 B、`b44-w-b44v2.out`、`f11-b44-smoke-w-b44v1-stdout.out`、`-w-b44v2-stdout.out`。

本文件 **7519 B / 90 行**（UTF-8 无 BOM、LF、U+FFFD 0）。
