# B-70T9 验证窗回执（饥饿循环纯函数化 `FoodGates`）

窗口：2026-11-26（本地 20:12 开工 → 20:31 收窗）
执行：会话七（ETIM 验证窗执行）
正本落盘：`git-workspace/etim/testharness/reports/b70t9-verify-receipt.md`

## §0 钉值实测

| 项 | 工单钉值 | 实测 | 判定 |
|---|---|---|---|
| `testharness/player/f7-wb-lib.js:35` PIN | `b70t9-build2` | `build: 'b70t9-build2'` | 一致 |
| release `build/libs/etim-1.0.0.jar` | 1,568,258 B | 1,568,258 B | 一致 |
| release SHA256 | `DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7` | 同 | 一致 |
| release mtime | `2026-11-26T12:08:00.752Z` | `2026-11-26T12:08:00.7523306Z` | 一致（起收同一，0 rebuild） |
| dev SHA256 | `9B5CE3C5…C5712EEC` | 同 | 一致 |
| sources SHA256 | `6F000740…45B4E603A6` | 同 | 一致 |
| MK refmap | 114 / 282 / 564 | 114 / 282 / 564（`mkOk=true`） | 一致 |
| MK manifest | 115 / 10 | 115 / 10 | 一致 |
| HEAD | `0ec36ddd49cc35c711331e463c8bbb808ba9b4a6` | `0ec36dd` | 一致（窗内 0 提交） |
| `run/config/etim.cfg` | 56,005 B | 56,005 B / `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 起收同 |
| `run/server.properties` | 939 B | 939 B / `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 起收同 |
| port 25565 监听 | 0 | 起前 0 / 收后 0 | 一致 |
| `run/crash-reports` | 0 | 起前 0 / 收后 0 | 一致 |

cfg 关键项起收：`food:foodModel=true`（L437）、`food:foodDebugLog=false`（L434，驱动注入 true 后收窗还原为 false）。

## §1 窗 1（主判）：`RUN=b70t9-r8` 终轮

### 1.1 终判载荷

```
[PIN] sha=DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7 shaOk=true size=1568258 sizeOk=true mkOk=true ok=true
[cfg] b70t9-r8 foodDebugLog=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70t9-r8","pin":true,"w0":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

EXIT=0。证据 tee：`testharness/build-logs/b70t9-r8.out`（494,300 B / 3,357 行；`:2389` `Done (6.232s)!`、`:3363` `BUILD SUCCESSFUL in 32s`）。

### 1.2 四臂判读

| 臂 | 判据 | 实测 | 判定 |
|---|---|---|---|
| W1 饱食支 | 种子 `sat=3 nut=3` → `consumed satiation point`，probe `sat=2 nut=3` | `:3316` consumed satiation；`:3318` probe `satiation=2 nutrition=3` | PASS |
| W2 营养支 | 种子 `only=4` → `consumed nutrition point`，probe `nut=2 sat=3` | `:3321` consumed nutrition；`:3323` probe `nutrition=2 satiation=3` | PASS |
| W3 饿伤支 | `STARVE strike 1.0`，health<max、difficulty=2，probe `starve<1` | `:3327` `STARVE strike 1.0 (health=5.0 difficulty=2)`；`:3330` probe `starve=0.0155` | PASS |
| W4 回血支 | `healed 1.0 via regen` 且 `nutrition=5`，probe `heal<1` | `:3337` `healed 1.0 via regen (health=6.0 nutrition=5 regenFactor=1 hungerPool+=1.0)`；`:3339` probe `heal=0.0 pool=1.0159998` | PASS |
| W5 静态接线 | `FoodGates.decide/tick` 与命令、静态表接线 | `[W5] {"gates":true,"static":true}` | PASS |

### 1.3 收敛链（驱动缺陷，产品码零改动）

| 轮 | 结果 | 结论 |
|---|---|---|
| r1 | `pin:false`，`badKeys:[w1,w2,w3,w4]` | B-B70T9-1 缺 `stampPin()`/`join()`；B-B70T9-2 console 无玩家上下文 |
| r3 | `badKeys:[w1,w2,w3,w4]` | B-B70T9-3 W4 用 6 点伤害直接打死 0 级玩家（cap 6） |
| r4 | `badKeys:[w1,w2,w3,w4]` | B-B70T9-4 `only===0` 断言过严（每 tick 累加） |
| r5 | `badKeys:[w1,w2,w3,w4]` | B-B70T9-5 决定性：`seed()` 先于 `mark()`，行落在切片之前 |
| r6 | `badKeys:[w2,w4]` | B-B70T9-6 `EAT_RE` 写死 `nutritionOnlyPool=`（nutrition 分支无此字段） |
| r7 | `badKeys:[w4]` | B-B70T9-7 决定性：stage 遗留 `gamerule naturalRegeneration false` |
| r8 | `pass:true bad:0` | 全绿 |

（r2 为早期中间轮，判据集与现行驱动不同，不作判据依据；r1–r8 日志全部留档。）

### 1.4 产品等价性核对（只读）

`FoodGates.tick`（`src/main/java/io/github/etim/etim/hunger/FoodGates.java:93-163`）与 `git show HEAD:src/main/java/io/github/etim/etim/hunger/ETIMFoodStats.java` 的 `tick`（:323-417）逐段同序同条件：累积（:40-44）→ 每单位消耗（:46-56，饱食优先条件 `sat>=1 && (!(only+0.001>=unit) || nut<=0)`）→ 夹取 → 饿伤阶梯（`health>ceiling || difficulty>=3 || health>1 && difficulty>=2`）→ 回血（`!naturalRegeneration || !shouldHeal → healProgress=0`；成功时 `hungerPool+1` 并 `healProgress-=1`）。日志与写回仍由 `ETIMFoodStats.java:369-404` 按 `r.act` 分支执行。**产品码本轮零改动。**

## §2 窗 2（回归）：`RUN=b70t9-r2`

```
[cfg] b69-b70t9-r2-b1 blockDebugLog=true sparkR196=true mountedR196=true farmDebugLog=true
[PIN] sha=DD30A158…AAD87F7 shaOk=true size=1568258 sizeOk=true mkOk=true ok=true
[done] {"run":"b70t9-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

EXIT=0。tee：`testharness/build-logs/b69-b70t9-r2-b1.out`（542,475 B / 3,811 行；`:2389` `Done (5.955s)`、`:3817` `BUILD SUCCESSFUL in 1m 35s`）。

对位 `node testharness/tools/verify-diff.js --base testharness/build-logs/b69-b70t4-r2-b1.out --new testharness/build-logs/b69-b70t9-r2-b1.out`：

```
[DiffLog] summary rules base=25 new=25 mounts base=41 new=41 mayplace=22 diffs=0
[DiffLog] verdict MATCH
```

（两侧 tee 均无 `[done]`/`[PIN]` 行，属 base/new 同侧缺项，工具 note 不计差异。）

六个锚点（`b69-b70t9-r2-b1.out`）：

| 面 | 行号 | 原文 |
|---|---|---|
| 薄雪侧活板门 | `:3732` | `[MountLog] rule=trapdoor-thin-snow face=east support=minecraft:snow_layer block=minecraft:trapdoor result=reject pos=10,129,6` |
| 满雪侧牌 | `:3739` | `[MountLog] rule=sign-face face=east support=minecraft:snow_layer block=minecraft:standing_sign result=allow pos=13,129,9` |
| 半砖活板门延后 | `:3742` | `[MountLog] rule=trapdoor-shape-defer face=east support=minecraft:snow_layer block=minecraft:trapdoor result=allow pos=13,129,9` |
| 垂直面（上） | `:3747` | `[MountLog] rule=trapdoor-vertical face=up support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| 垂直面（下） | `:3750` | `[MountLog] rule=trapdoor-vertical face=down support=minecraft:stone block=minecraft:trapdoor result=reject pos=18,130,4` |
| 耕地顶 | `:3492` | `[MountLog] rule=tilled-field face=up support=minecraft:farmland block=minecraft:torch result=allow pos=11,130,4` |

W4 静态十键全 true（`srcOk/flintOk/mixinOk/regOk/cfgOk/cmdOk/assetsOk/langOk/rulesOk/pass`）。

## §3 分级（A / B / C）

| 编号 | 级别 | 内容 | 状态 |
|---|---|---|---|
| A | — | 无。四条饥饿分支与产品源码逐段一致，未见与 R196 背离 | — |
| B-B70T9-1 | B | 驱动缺 `h.stampPin()` 与 `await h.join()`（f13 相对 f12 遗漏），r1 无 PIN、命令无玩家上下文 | 已修（补两行） |
| B-B70T9-2 | B | `/etest hungerstate|hungerpools` 无 player 参数时按 sender 取人，console 无玩家 → `PlayerNotFoundException` | 已修（显式追加 `ETIM_F7`） |
| B-B70T9-3 | B | W4 用 `effect instant_damage 1 0`（6 点）打死 0 级玩家（`capAtLevel0=6`），`shouldHeal=false` | 已修（`etest health 5`） |
| B-B70T9-4 | B | W2 `only===0` 过严：`nutritionOnlyPool` 每 tick 累加 | 已修（`< 1.0`，种子 4） |
| B-B70T9-5 | B | 决定性：`seed()` 置于 `mark()` 之前，`cmd()` 自带 400 ms 等待致日志落在切片外 | 已修（mark → seed → waitRow） |
| B-B70T9-6 | B | `EAT_RE` 写死 `nutritionOnlyPool=`，nutrition 分支日志无该字段 → 永不匹配 | 已修（`consumed (satiation|nutrition) point \(([^)]*)\)`） |
| B-B70T9-7 | B | 决定性：驱动 stage 遗留 `gamerule naturalRegeneration false`，回血闸每 tick 清零种子 | 已修（W4 臂前置 true） |
| C-B70T9-1 | C | `[W3]` 打印语句位于 W4 准备之后（仅打印时序，不影响判定） | 记录 |
| C-B70T9-2 | C | 世界名双前缀 `w-b70t9-b70t9-rN-v1`（脚本 `world` 模板 + `RUN` 拼接） | 记录 |
| C-B70T9-3 | C | 窗内 7 个世界全部保留（r1、r3–r8） | 记录 |

产品码：**零改动**（窗内仅改 `testharness/player/f13-b70t9-smoke.js`，7 处，均为断言不得放宽前提下的通道/时序修正）。

## §4 收口

| 项 | 状态 |
|---|---|
| 窗 1 | `b70t9-r8` EXIT=0，`pass:true bad:0`（W0–W5 全绿） |
| 窗 2 | `b70t9-r2` EXIT=0，`pass:true bad:0`；`verify-diff` `MATCH` / `diffs=0` |
| 钉值 | 三哈希、MK、jar mtime 起收同一，0 rebuild |
| 停服 | 两窗均 `{"exitCode":0,"exited":true}` |
| 环境 | cfg / props 起收同哈希；level-name `w-b30v`、allow-flight `false`、difficulty `1`；port 0；crash 0 |
| 世界 | `run/w-b70t9-b70t9-r1-v1`（19 文件 3,649,419 B）、`r3`–`r8` 六个、`run/w-b69-b70t9-r2-v1`（34 文件 5,209,195 B）全部保留 |
| 证据 | `build-logs/b70t9-r{1..8}-stdout.out`、`testharness/build-logs/b70t9-r{1..8}.out`、`build-logs/b69-b70t9-r2-b1.out`（542,475 B） |

## §5 终判

**PASS** — 窗 1 四支（饱食消耗 / 营养消耗 / 饿伤 / 回血）与静态接线全绿，窗 2 挂载判定回归 `verify-diff` `MATCH`、`diffs=0`；`FoodGates` 纯函数化与 `ETIMFoodStats.tick` 逐段等价，未见与 R196 一手背离。A=0，B=7（全部为驱动通道缺陷，已修），C=3。

本回执字数规格：**9,570 B / 102 行**（UTF-8 无 BOM、LF，U+FFFD 0、form-feed 0）。
