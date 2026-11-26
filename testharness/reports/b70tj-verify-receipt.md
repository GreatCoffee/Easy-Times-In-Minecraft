# B-70TJ 回归窗回执（摔落/垫层/枯萎座抽成纯函数后的行为等价性）

窗口：2026-11-26（本地 22:31 → 22:36）
执行：会话七（ETIM 验证窗执行）
正本落盘：`git-workspace/etim/testharness/reports/b70tj-verify-receipt.md`

## §0 起收钉值（产品 jar 未重建）

| 项 | 工单钉值 | 起窗实测 | 收窗实测 |
|---|---|---|---|
| HEAD | `235944f` | `235944f` | `235944f`（窗内 0 提交） |
| `f7-wb-lib.js:35` | `b70tj-build1` | `b70tj-build1` | 同 |
| release | 1,569,395 B | 1,569,395 B | 同（0 rebuild） |
| release SHA256 | `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4` | 同 | 同 |
| release mtime | `2026-11-26T14:28:21.320Z` | `…3200589Z` | 同（未变） |
| dev / sources | 1,540,749 / 1,370,715 | 同（PIN 同源） | 同 |
| MK | 114/282/564 + 115/10 | 同（`mkOk=true`） | 同 |
| `run/config/etim.cfg` | — | 56,005 B / `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 同哈希（56,005 B） |
| `run/server.properties` | — | 939 B / `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 同哈希（939 B） |
| port 25565 | 0 | 0 | 0 |
| `run/crash-reports` | 0 | 0 | 0 |

## §1 判窗载荷（`RUN=b70tj-r1`，EXIT=0）

```
[PIN] sha=F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4 shaOk=true size=1569395 sizeOk=true mkOk=true
[cfg] b66-b70tj-r1-b1 mobDebugLog=true blockR196Face=true
[W1] {"stone":4,"dirt":4,"anvil":1,"cauldron":4,"wool":4,"four":199,"one":23,"pass":true}
[W2] {"sand":0.4,"wool":0.8,"snow":0.2,"stone":0,"pass":true}
[W3] {"stone":{"raw":15,"cushion":0,"damage":15},"sand":{"raw":15,"cushion":0.4,"damage":6.6},"pass":true}
[W4] {"before":0,"after":1,"pos":[-60.469,68.279,248.495],"inBox":true,"pass":true}
[W5] {"ice":{"douse":"true","dissolve":"false"},"snow":{"douse":"true","dissolve":"true"},"stone":{"acid":"false"},"pass":true}
[W6] {"cfgOk":true,"wireOk":true,"hookOk":true,"helpOk":true,"pass":true}
[stop] {"exitCode":0,"exited":true}
[stop] {"exitCode":0}
[done] {"run":"b70tj-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

tee：`testharness/build-logs/b66-b70tj-r1-b1.out`（954,407 B / 6,345 行；`:4723` `Done (5.488s)!`、`:6351` `BUILD SUCCESSFUL in 27s`）。

## §2 逐臂对照（新窗 b70tj-r1 vs 基线 b70tc-r1）

| 面 | 基线 b70tc-r1（行号/值） | 本窗 b70tj-r1（行号/值） | 判定 |
|---|---|---|---|
| blockstack | `:5538` stone=4 dirt=4 anvil=1 cauldron=4 wool=4 four=199 one=23 | `:5488` 同值逐项相同 | 同形 |
| cushion sand | `:5683` value=0.400 | `:5638` value=0.400 | 同形 |
| cushion wool | `:5718` value=0.800 | `:5669` value=0.800 | 同形 |
| cushion snow_layer | `:5761` value=0.200 | `:5696` value=0.200 | 同形 |
| cushion stone | —（W2 JSON `stone:0`） | `:5739` value=0.000 | 同形（本窗有独立行） |
| fall 石面 | `:5913` `raw=15.000 cushion=0.000 damage=15.000` | `:5771` 同值（另带 `max=6.000`） | 同形 |
| fall 沙面 | `:5961` `cushion=0.400 damage=6.600` | `:5904` `cushion=0.400 damage=6.600` | 同形 |
| dropbox | `:6005` `at=-61,68,248 before=0 after=1 drop=-60.491,68.247,248.461` | `:5950` `at=-61,68,248 before=0 after=1 drop=-60.469,68.279,248.495` | before/after 同（落点差 <0.02 格，物理抖动，见 C-2） |
| mattrait ice | `:6104` `acid=true douse=true dissolve=false` | `:6035` `fire=true pepsin=false acid=true douse=true dissolve=false catch=false fuel=false replace=false` | 同形（本窗行含全字段） |
| mattrait snow_layer | `:6135` `acid=false dissolve=true` | `:6064` `acid=false douse=true dissolve=true replace=true` | 同形 |
| mattrait stone | `:6245` `acid=false douse=false` | `:6183` `acid=false douse=false` | 同形 |

验收点逐条：W2 四值 0.4 / 0.8 / 0.2 / 0 —— 全部命中；W3 石面 `15.000/15.000`、沙面 `6.600` —— 全部命中。

## §3 `verify-diff` 结果（附口径说明）

```
node testharness/tools/verify-diff.js --base testharness/build-logs/b66-b70tc-r1-b1.out
[DiffLog] base=b66-b70tc-r1-b1.out new=b66-b70tj-r1-b1.out
[DiffLog] note base has no [done] row (pass the driver log too: <run>-driver.log)
[DiffLog] note base has no [PIN] row
[DiffLog] note new has no [done] row (pass the driver log too: <run>-driver.log)
[DiffLog] note new has no [PIN] row
[DiffLog] summary rules base=0 new=0 mounts base=0 new=0 mayplace=0 diffs=0
[DiffLog] verdict MATCH
```

**口径提示（重要，请主会话知悉）**：`verify-diff` 的 `rules/mounts/mayplace` 三项是 **`[MountLog]` 专用**计数器，b66 窗口一行 `[MountLog]` 都没有，故 `base=0 new=0` 属结构性零对零，`verdict MATCH` 在本窗属**平凡成立**，不能当作等价性的实质证据。等价证据以上表 §2 的逐臂对照（同一脚本、同一判据、逐值相同）为准。建议后续为该工具加 `--mode=arms`，按 `[BlockFaceLog]/[ItemLog]/[FoodR196Log]` 等前缀做通用行多重集对位。

## §4 分级（A / B / C）

| 编号 | 级别 | 内容 | 归因 |
|---|---|---|---|
| A | — | 无（垫层四值、摔落两例与基线逐值相同，未出现与 b66 不一致项） | — |
| B | — | 无 | — |
| C-B70TJ-1 | C | 同上「verify-diff 三项计数器对 b66 结构性为零」的口径限制 | 工具面局限 |
| C-B70TJ-2 | C | W4 `dropbox` 落点 `-60.469,68.279,248.495` vs 基线 `-60.491,68.247,248.461`（差 ≤0.03 格），判据是 `before=0 → after=1` 与 `inBox` | 实体弹出物理抖动 |
| C-B70TJ-3 | C | 本窗 `[W1] four=199 one=23` 与基线完全相同，但两者均与更早历史 verdict 的 205/17 有差（B-70TC 已记 C-B70TC-3，同源） | 存量浮动 |
| C-B70TJ-4 | C | 每窗 `[done]` 前两条 `[stop]`（`h.stop()` 与 `finish()` 各一条），带 `exited:true` 者为权威 | 脚手架既有行为 |

## §5 收口

| 项 | 状态 |
|---|---|
| 判窗 | `b70tj-r1` EXIT=0，`pass:true bad:0`，W1–W6 全绿 |
| 停服 | `{"exitCode":0,"exited":true}` |
| 钉值 | 三哈希 + MK + jar mtime 起收同一（0 rebuild）；HEAD `235944f` 未变 |
| 环境 | cfg / props 起收同哈希；port 0→0；crash 0→0 |
| 世界 | `run/w-b66-b70tj-r1-v1`（27 文件 3,715,735 B）保留 |
| 证据 | `build-logs/b70tj-r1-stdout.out`、`testharness/build-logs/b66-b70tj-r1-b1.out`（954,407 B） |

## §6 终判

**PASS** — 摔落/垫层/枯萎座纯函数化后，B-66 老窗口在当前钉值上逐臂复现：垫层 0.4/0.8/0.2/0、石面摔落 15.000、沙面 6.600、方块堆叠表与材质表全部与基线逐值相同，无 A/B 级差异。A=0／B=0／C=4（其中 C-1 为工具口径限制，已在 §3 单列说明）。

本回执字数规格：**6,825 B / 81 行**（UTF-8 无 BOM、LF）。
