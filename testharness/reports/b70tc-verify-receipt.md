# B-70TC 判窗回执（工装批：三份老脚本迁上 `lib/harness.js`，等价性判定）

窗口：2026-11-26（本地 21:11 → 21:15，三窗串行）
执行：会话七（ETIM 验证窗执行）
正本落盘：`git-workspace/etim/testharness/reports/b70tc-verify-receipt.md`

## §0 起收钉值（产品 jar 未重建）

| 项 | 工单钉值 | 起窗实测 | 收窗实测 |
|---|---|---|---|
| HEAD | `87adcc5` | `87adcc5` | `87adcc5`（三窗 0 提交） |
| `f7-wb-lib.js:35` | `b70t9-build2` | 同 | 同 |
| release | 1,568,258 B | 同 | 同（0 rebuild） |
| release SHA256 | `DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7` | 同 | 同 |
| release mtime | `2026-11-26T12:08:00.752Z` | `…7523306Z` | 同（未变） |
| dev / sources | 1,539,631 / 1,369,238 | 同 | 同 |
| MK | 114/282/564 + 115/10 | 同 | 同（`mkOk=true`） |
| `run/config/etim.cfg` | — | 56,005 B / `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` | 同哈希（56,005 B） |
| `run/server.properties` | — | 939 B / `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 同哈希（939 B） |
| port 25565 | 0 | 0 | 0 |
| `run/crash-reports` | 0 | 0 | 0 |

## §1 工具面（工单第 5 条）

### 1.1 `node testharness/tools/check-driver.js`

```
[DriverLog] files=450 onHarness=6 offenders=0 debt=0 byRule={} [local]
[DriverLog] verdict OK
```

EXIT=0。`onHarness` 由 B-70TA 的 3 升到 **6**（本批 b64/b65/b66 已计上），`offenders=0`、`debt=0`（B-70TA 时 `debt=9` 的老债已清）。

### 1.2 `node testharness/tools/selftest-driver.js`

```
PASS good.js exit=0 want=0
PASS no-boot.js exit=1 want=1
PASS wait-first.js exit=1 want=1
PASS no-player.js exit=1 want=1
PASS regen-no-rule.js exit=1 want=1
selftest-driver: 5/5
```

EXIT=0。R2 收窄后 fixture 改为 `wait-first.js`（首个 waitRow 早于首个 mark），五条正负极性仍全命中。

## §r1 窗 1：`RUN=b70tc-r1 node testharness/player/f11-b66-smoke.js`

```
[cfg] b66-b70tc-r1-b1 mobDebugLog=true blockR196Face=true
[PIN] sha=DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7 shaOk=true size=1568258 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70tc-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

EXIT=0。tee `testharness/build-logs/b66-b70tc-r1-b1.out`（964,837 B）。

| 臂 | 判据面 | 锚行 | 原文 |
|---|---|---|---|
| W1 方块堆叠 | blockstack | `:5538` | `[BlockFaceLog] blockstack stone=4 dirt=4 anvil=1 cauldron=4 wool=4 four=199 one=23` |
| W2 缓冲材质 | cushion | `:5683` / `:5718` / `:5761` | `cushion block=minecraft:sand value=0.400` / `wool value=0.800` / `snow_layer value=0.200` |
| W3 坠落缓冲 | fall | `:5913` / `:5961` | `fall dist=10.000 raw=15.000 cushion=0.000 damage=15.000` / `cushion=0.400 damage=6.600` |
| W4 掉落盒 | dropbox | `:6005` | `dropbox at=-61,68,248 before=0 after=1 drop=-60.491,68.247,248.461` |
| W5 材质表 | ice/snow/stone | `:6104` / `:6135` / `:6245` | `mattrait block=minecraft:ice … acid=true douse=true dissolve=false`／`snow_layer … acid=false … dissolve=true`／`stone … acid=false … douse=false` |
| W6 静态接线 | cfgOk/wireOk/hookOk/helpOk | `[W6]` JSON | `{"cfgOk":true,"wireOk":true,"hookOk":true,"helpOk":true,"pass":true}` |
| 起服/停服 | — | `:4724` / `:6424` | `Done (5.803s)!` / `BUILD SUCCESSFUL in 42s` |

## §r2 窗 2：`RUN=b70tc-r2 node testharness/player/f11-b64-smoke.js`

```
[cfg] b64-b70tc-r2-b1 mobDebugLog=true itemsStack16R196=true itemsMeltR196=true itemsVinePlaceR196=true
[PIN] sha=DD30A158…AAD87F7 shaOk=true size=1568258 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70tc-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

EXIT=0。tee `testharness/build-logs/b64-b70tc-r2-b1.out`（917,778 B）。

| 臂 | 判据面 | 锚行 | 原文 |
|---|---|---|---|
| W1 堆叠表 | stack | `:5509` | `[ItemLog] stack stick=32 flint=16 reeds=16 paper=64 quartz=16 cake=8 cauldron=4 pie=8 book=1 bucket=1 dirt=4 sword=1 etim16=55 player=ETIM_F7` |
| W2 融化 | melt | `:5650` / `:5651` | `[ItemLog] meltdev kind=snowball count=200 ticks=200 temp=20.00000 chance=0.00190 lost=66 left=134` / `kind=ice … lost=55 left=145` |
| W3 钩子 | dropHook/invHook/tempRule | `[W3]` JSON | `{"dropHook":true,"invHook":true,"tempRule":true,"pass":true}` |
| W4 藤蔓放置 | vineplace | `:5950` / `:5951` | `[ItemLog] vineplace face=north block=minecraft:stone at -61, 68, 248 player=ETIM_F7` / `vineplacecmd face=north placed=minecraft:stone` |
| W5 配置/接线 | cfgOk/wireOk | `[W5]` JSON | `{"cfgOk":true,"wireOk":true,"pass":true}` |
| W6 堆叠默认 | default16/tableOk/sortOk | `[W6]` JSON | `{"default16":true,"tableOk":true,"sortOk":true,"pass":true}` |
| 起服/停服 | — | `:4723` / `:6129` | `Done (5.621s)!` / `BUILD SUCCESSFUL in 27s` |

## §r3 窗 3：`RUN=b70tc-r3 node testharness/player/f11-b65-smoke.js`

```
[cfg] b65-b70tc-r3-b1 mobDebugLog=true foodR196Extra=true foodModel=true
[PIN] sha=DD30A158…AAD87F7 shaOk=true size=1568258 sizeOk=true mkOk=true ok=true
[stop] {"exitCode":0,"exited":true}
[done] {"run":"b70tc-r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

EXIT=0。tee `testharness/build-logs/b65-b70tc-r3-b1.out`（1,021,666 B）。

| 臂 | 判据面 | 锚行 | 原文 |
|---|---|---|---|
| W1 碗 | bowl | `:5663` | `[FoodR196Log] bowlgive contents=BEEF_STEW item=etim:bowl_beef_stew sat=16 nut=16 player=ETIM_F7` |
| W2 硬币 | coin | `:6013` / `:6057` | `coin created metal=copper count=3 xpValue=5 xpBefore=0 xpAfter=-15` / `metal=gold count=1 xpValue=100 xpBefore=-15 xpAfter=-115` |
| W3 金苹果 | applegold | `:6119` / `:6120` | `applegold cure meta=1 ticks=1 src=cmd` / `applegold meta=1 cured=true converting=true zombie=1936` |
| W4 火烤 | firecook | `:6363` / `:6364` | `firecook raw=minecraft:beef cooked=minecraft:cooked_beef count=3` / `before=minecraft:beef after=minecraft:cooked_beef count=3 alive=true` |
| W5 容器灭火 | vesseldouse | `:6456` / `:6457` | `douse kind=fire_elemental damage=5.000 volume=1 from=cmd` / `vesseldouse hit=true fire_hp=15.0 held=minecraft:bowl` |
| W6 静态接线 | cfgOk/wireOk/mixOk/texOk/langOk | `[W6]` JSON | `{"cfgOk":true,"wireOk":true,"mixOk":true,"texOk":true,"langOk":true,"pass":true}` |
| 起服/停服 | — | `:4723` / `:6787` | `Done (5.499s)!` / `BUILD SUCCESSFUL in 29s` |

## §4 分级（A / B / C）

| 编号 | 级别 | 内容 | 归因 |
|---|---|---|---|
| A | — | 无 | — |
| B | — | 无 | — |
| C-B70TC-1 | C | 三窗 `[done]` 前各多打一条 `[stop] {"exitCode":0}`（harness 的 `h.stop()` 与 `finish()` 各打一次），前一条带 `exited:true` 为权威面 | 脚手架迁移引入（无害冗余） |
| C-B70TC-2 | C | 世界名三段前缀 `w-b66-b70tc-r1-v1` 等（脚本模板 + RUN） | 既有惯例 |
| C-B70TC-3 | C | 三窗复现值与历史 verdict 的数值差：b66 W1 `four=199 one=23`（历史 `four=205 one=17`）、b64 W1 `etim16=55`（历史 54）、b65 W2 copper `xpBefore=0`（历史同）——均为计数类浮动项，判据是 `stone=4/…/four>0` 与 `etim16>0` 的区间/阈值，不涉断言语义 | 存量浮动 |
| C-B70TC-4 | C | b64 的 W2 为概率臂（`chance=0.0019`×200 次），两轮数值必有差异；本窗 `snow lost=66/200`、`ice 55/200`，落在判据区间内 | 概率面 |

三个窗均**未出现 FAIL**，故不存在「脚手架迁移引入」与「当年断言过时」的归因分歧。

## §5 收口

| 项 | 状态 |
|---|---|
| 窗 1 b66 | EXIT=0，`pass:true bad:0`，W1–W6 全绿 |
| 窗 2 b64 | EXIT=0，`pass:true bad:0`，W1–W6 全绿 |
| 窗 3 b65 | EXIT=0，`pass:true bad:0`，W1–W6 全绿 |
| 停服 | 三窗均 `{"exitCode":0,"exited":true}`（另有 C-B70TC-1 的冗余第二条） |
| 钉值 | 三哈希 + MK + jar mtime 起收同一（0 rebuild）；HEAD `87adcc5` 未变 |
| 环境 | cfg / props 起收同哈希；port 0→0；crash 0→0 |
| 世界 | `run/w-b66-b70tc-r1-v1`（3,740,389 B）、`run/w-b64-b70tc-r2-v1`（3,717,601 B）、`run/w-b65-b70tc-r3-v1`（3,716,288 B）全部保留 |
| 证据 | `build-logs/b70tc-r{1,2,3}-stdout.out` + `testharness/build-logs/b{66,64,65}-b70tc-r{1,2,3}-b1.out` |

## §6 终判

**PASS** — 三份迁移脚本（b66/b64/b65）在当前钉值上逐窗 EXIT=0、`pass:true bad:0`，六臂判据面（blockstack/cushion/fall/dropbox/材质、stack/melt/vine、bowl/coin/applegold/firecook/vesseldouse）与迁移前同义，`check-driver` `offenders=0 debt=0`、`selftest 5/5`。A=0／B=0／C=4。

本回执字数规格：**8,926 B / 110 行**（UTF-8 无 BOM、LF）。
