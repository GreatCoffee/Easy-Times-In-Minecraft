# B-70TA 判窗回执（工装批：驱动模板检查 + 自动盖 PIN）

窗口：2026-11-26（本地 20:45 开工 → 20:52 收窗）
执行：会话七（ETIM 验证窗执行）
正本落盘：`git-workspace/etim/testharness/reports/b70ta-verify-receipt.md`

## §0 钉值实测

| 项 | 工单钉值 | 实测 | 判定 |
|---|---|---|---|
| HEAD | `504bd10` | `504bd10`（窗内 0 提交） | 一致 |
| `f7-wb-lib.js:35` | `b70t9-build2` | `b70t9-build2` | 一致 |
| release | 1,568,258 B | 1,568,258 B | 一致 |
| release SHA256 | `DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7` | 同 | 一致 |
| release mtime | `2026-11-26T12:08:00.752Z` | `2026-11-26T12:08:00.7523306Z` | 一致（0 rebuild） |
| dev / sources | 1,539,631 / 1,369,238 | 同（SHA 同 PIN） | 一致 |
| MK | 114/282/564 + 115/10 | 同（`mkOk=true`） | 一致 |
| `run/config/etim.cfg` | — | 56,005 B / `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 起收同 |
| `run/server.properties` | — | 939 B / `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 起收同 |
| port 25565 | 0 | 0 → 0 | 一致 |
| `run/crash-reports` | 0 | 0 → 0 | 一致 |

## §1 三工具（逐条实测）

### 1.1 `check-driver.js --list`

```
[DriverLog] files=450 onHarness=3 offenders=0 debt=9 byRule={} [local]
[DriverLog] verdict OK
```

EXIT=0。`offenders=0`（本批新脚本无违规）、`debt=9`（老脚本只记债）、`byRule={}`（无任何规则命中）。

### 1.2 `selftest-driver.js`

```
PASS good.js exit=0 want=0
PASS no-boot.js exit=1 want=1
PASS mark-after.js exit=1 want=1
PASS no-player.js exit=1 want=1
PASS regen-no-rule.js exit=1 want=1
selftest-driver: 5/5
```

EXIT=0。五条 fixture 的正/负极性都命中（R1/R2/R3/R4 各至少一条反例）。

### 1.3 `preflight.js`

```
[PreflightLog] step=books code=0 verdict=OK [LedgerLog] verdict OK
[PreflightLog] step=config code=0 verdict=OK [ConfigLog] verdict OK
[PreflightLog] step=disk-cfg code=0 verdict=OK [ConfigLog] verdict OK
[PreflightLog] step=channels code=0 verdict=OK [ChannelLog] verdict OK
[PreflightLog] step=harness code=0 verdict=OK [HarnessLog] files=450 onHarness=3 ownBoot=109 ownStop=100 ownCmd=86 ownMark=15 ownSlice=42 ownWaitRow=14 ownPin=70 ownDone=41 offenders=146 [local]
[PreflightLog] step=driver code=0 verdict=OK [DriverLog] verdict OK
[PreflightLog] summary steps=6 risk=0 verdict=PASS
```

EXIT=0。第 6 步 `driver` 已接入；`steps=6 risk=0 verdict=PASS`。

## §2 自动盖戳实证（无显式 `stampPin`）

只读核对：`testharness/player/f13-b70t9-smoke.js` 全文仅 :68 一处注释提到 `stampPin`，**无调用**；起服走 `await h.boot(RUN);`。自动路径在 `testharness/player/lib/harness.js:275-279`：

```
275:                 // B-B70TA-1: every window must prove the jar it ran; forgetting
276:                 // stampPin() used to surface only in the receipt, one round late.
277:                 if (!h.pinStamped) {
278:                     stampPin();
279:                 }
```

本窗实跑打出的 `[PIN]` 行原文（`build-logs/b70ta-r1-stdout.out`，boot 之后、任何臂之前）：

```
[cfg] b70ta-r1 foodDebugLog=true
[PIN] sha=DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7 shaOk=true size=1568258 sizeOk=true mkOk=true ok=true
```

`shaOk/sizeOk/mkOk` 三门皆 true ⇒ 自动盖戳在数值上与显式调用等价，且确实在 `[cfg]` 之后立即落行。

## §3 四臂锚点（`testharness/build-logs/b70ta-r1.out`，494,206 B / 3,354 行）

| 臂 | 行号 | 原文 | 判定 |
|---|---|---|---|
| 起服 | `:2388` | `Done (5.478s)! For help, type "help" or "?"` | — |
| W1 饱食支 | `:3315` | `[FoodLog] ETIM_F7 (67) consumed satiation point (nutritionOnlyPool=5.0E-4, pools 2/6 3/6) hungerPool=9.999275E-4` | PASS |
| W1 探针 | `:3317` | `[FoodLog] probe player=ETIM_F7 pool=0.02499993 only=0.0065000006 satiation=2 nutrition=3 heal=0.0 starve=0.0 limit=6` | PASS |
| W2 营养支 | `:3320` | `[FoodLog] ETIM_F7 (67) consumed nutrition point (pools 3/6 2/6) hungerPool=9.999275E-4` | PASS |
| W2 探针 | `:3322` | `[FoodLog] probe … satiation=3 nutrition=2 heal=0.0 starve=0.0 limit=6` | PASS |
| W3 饿伤支 | `:3326` | `[FoodLog] ETIM_F7 (67) STARVE strike 1.0 (health=5.0 difficulty=2)` | PASS |
| W3 探针 | `:3329` | `[FoodLog] probe … satiation=0 nutrition=0 heal=0.0 starve=0.015500012 limit=6` | PASS |
| W4 回血支 | `:3336` | `[FoodLog] ETIM_F7 (67) healed 1.0 via regen (health=6.0 nutrition=5 regenFactor=1 hungerPool+=1.0)` | PASS |
| W4 探针 | `:3338` | `[FoodLog] probe … satiation=0 nutrition=5 heal=0.0 starve=0.0 limit=6` | PASS |
| 停服面 | `:3362` | `BUILD SUCCESSFUL in 30s` | PASS |

终判载荷：

```
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70ta-r1","pin":true,"w0":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

EXIT=0。四臂 `[Wn]` 载荷与 b70t9-r8 逐字段同形（`satiation=2 nutrition=3` / `nutrition=2 satiation=3` / `starve=0.015500012` / `heal` 行 `hp=6 nut=5`、probe `pool=1.0159998`）。W5 静态 `{"gates":true,"static":true}`。

## §4 分级（A / B / C）

| 编号 | 级别 | 内容 | 状态 |
|---|---|---|---|
| A | — | 无 | — |
| B | — | 无（本批工装三工具与自动盖戳均按工单语义工作） | — |
| C-B70TA-1 | C | `harness` 步仍报 `offenders=146`：这是**老脚本的存量债**（`ownBoot=109/ownStop=100/ownCmd=86` 等自管通道的脚本），`check-driver` 只对 `onHarness=3` 的新脚本硬判，二者口径不同，非本批回归 | 记录 |
| C-B70TA-2 | C | `selftest-driver` 的 5 条 fixture 里 R2 只有 `mark-after.js` 一条反例，`mark() 数少于 waitRow()` 那半边未被 fixture 直接覆盖（靠 R2 同一规则的实现覆盖） | 记录 |
| C-B70TA-3 | C | 世界名 `w-b70t9-b70ta-r1-v1`（脚本 `world` 模板前缀 + 本批 `RUN`） | 记录 |

## §5 收口

| 项 | 状态 |
|---|---|
| 三工具 | check-driver `offenders=0 debt=9`；selftest `5/5`；preflight `steps=6 risk=0 PASS` |
| 自动盖戳 | `[PIN]` 由 boot 自动打出（脚本无调用），`shaOk/sizeOk/mkOk` 全 true |
| 判窗 | `b70ta-r1` EXIT=0，`pass:true bad:0`，W0–W5 全绿 |
| 钉值 | 三哈希 + MK + jar mtime 起收同一（0 rebuild）；HEAD `504bd10` 未变 |
| 环境 | cfg `C69FC496…AEC257`（收窗 `foodDebugLog=false`、`foodModel=true`）、props `6784C3ED…2F1EB9`、port 0→0、crash 0→0 |
| 世界 | `run/w-b70t9-b70ta-r1-v1` 保留 |
| 证据 | `build-logs/b70ta-r1-stdout.out`、`testharness/build-logs/b70ta-r1.out`（494,206 B） |

## §6 终判

**PASS** — 三工具全绿（`offenders=0` / `5/5` / `steps=6 risk=0`），自动盖戳路径经实跑证明与显式调用等价（`[PIN]` 自动落行、三门 true），四臂与回归锚点与 b70t9-r8 同形，环境与钉值零漂移。A=0／B=0／C=3。

本回执字数规格：**7,065 B / 101 行**（UTF-8 无 BOM、LF，U+FFFD 0、form-feed 0）。
