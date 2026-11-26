# W-B70T9 判窗正本：饥饿循环纯函数化（FoodGates）

- 批次：B-70T9（工装批，无 census 面）
- 执行会话：会话七（验证窗）；落码与汇总：主会话
- 判窗时段：2026-11-26 20:12–20:33（r1–r8，收敛于 r8）
- 判据源：`testharness/player/f13-b70t9-smoke.js`（W0–W5）+ `f11-b69-smoke.js`（回归）
- 终判：**PASS**（A=0 / B=7 / C=3）

## §0 钉值

- `f7-wb-lib.js:35` = `b70t9-build2`
- release 1,568,258 B `DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7`（mtime `2026-11-26T12:08:00.752Z`，窗内 0 rebuild）
- dev 1,539,631 B `9B5CE3C54618834F53D52314D37E8A69258DFE194A6110B913E1CFF5C5712EEC`
- sources 1,369,238 B `6F0007406AE7971AA74491659872F23FF90F4473BC76BC28F48E8E45B4E603A6`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10（ok=true）
- HEAD `0ec36dd`（窗内 0 提交）
- 单测：`gradlew test` → FoodGatesTest 27 + SpawnGatesTest 43 + MountRulesTest 32 = **102 例，0 失败**

## §1 窗 1（新窗，`RUN=b70t9-r8`，exit 0）

`[done] {"run":"b70t9-r8","pin":true,"w0":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"stops":0,"crashes":0,"pass":true,"bad":0}`

| 臂 | 锚点（`testharness/build-logs/b70t9-r8.out`） | 结论 |
| --- | --- | --- |
| W1 饱食支 | `:3316` `consumed satiation point (nutritionOnlyPool=5.0E-4, pools 2/6 3/6)` → `:3318` probe satiation=2 nutrition=3 | PASS |
| W2 营养支 | `:3321` `consumed nutrition point (pools 3/6 2/6)` → `:3323` probe nutrition=2 satiation=3 | PASS |
| W3 饿伤支 | `:3327` `STARVE strike 1.0 (health=5.0 difficulty=2)` → `:3330` probe starve=0.0155 | PASS |
| W4 回血支 | `:3337` `healed 1.0 via regen (health=6.0 nutrition=5 regenFactor=1 hungerPool+=1.0)` → `:3339` probe heal=0.0 pool=1.0159998 | PASS |
| W5 静态 | `{"gates":true,"static":true}`：FoodGates tick/Act、ETIMFoodStats 委托与 Act 分支、两命令各 1 次、FoodGatesTest 存在 | PASS |

tee 494,300 B / 3,357 行（`:2389` `Done (6.232s)`、`:3363` BUILD 32 s）。

## §2 窗 2（回归，`RUN=b70t9-r2`，exit 0）

`[done] {"run":"b70t9-r2","pin":true,"w1".."w4":true,"stops":0,"crashes":0,"pass":true,"bad":0}`；
tee `testharness/build-logs/b69-b70t9-r2-b1.out`（542,475 B / 3,811 行）。

`verify-diff --base b69-b70t4-r2-b1.out` → `rules 25/25 mounts 41/41 mayplace=22 diffs=0` → **MATCH**。
锚点：`:3732` trapdoor-thin-snow reject、`:3739` sign-face（满雪）allow、`:3742` trapdoor-shape-defer allow、`:3747`/`:3750` trapdoor-vertical up/down reject、`:3492` tilled-field allow。

## §3 分级

- **A（产品缺陷）= 0**：四条分支与 R196 `FoodStats.java:35-92` 逐段一致，行为零变化。
- **B（驱动通道/时序，全部在脚本侧修复，产品码零改动）**：
  - B-B70T9-1 缺 `stampPin()`/`join()` → `pin:false`、命令无玩家上下文
  - B-B70T9-2 `hungerstate`/`hungerpools` 无 player 参数 → `PlayerNotFoundException`
  - B-B70T9-3 W4 用 6 点伤害打死 0 级玩家（`capAtLevel0=6`）
  - B-B70T9-4 W2 `only===0` 过严（营养池每 tick 累加）
  - B-B70T9-5 `seed()` 在 `mark()` 之前，行落在切片外
  - B-B70T9-6 `EAT_RE` 写死 `nutritionOnlyPool=`，营养分支无该字段
  - B-B70T9-7 stage 遗留 `naturalRegeneration=false`，回血闸每 tick 清零
- **C（可接受）= 3**：`[W3]` 打印时序、世界名双前缀、7 个世界保留。

## §4 收口

两窗停服均 `exitCode 0 / exited true`；jar mtime 未变（0 rebuild）；cfg 56,005 B `C69FC496…AEC257` 起收同；props 939 B `6784C3ED…2F1EB9` 起收同；port 0→0；crash 0→0。
世界 `w-b70t9-b70t9-r1/r3–r8-v1` 七个 + `w-b69-b70t9-r2-v1` 全部保留。

## §5 终判

`PASS`（A=0 / B=7 / C=3）。产品钉值 `b70t9-build2`；单测 102 例全绿；回归 MATCH。

会话七建议（不阻断）：把「PIN/join、console 命令需显式 player、`mark()` 先于操作、gamerule 前置」四条做成 preflight 模板检查，可省后续同类收敛轮。
