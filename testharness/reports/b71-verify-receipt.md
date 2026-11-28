# B-71 判窗回执（含 B-68 耕地回归）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-28 12:45 CST
> 工单：主会话 m06710（2026-11-28 12:40）· HEAD `e318580` · 钉值 `b71-build6`
> 正本：`testharness/reports/b71-verify-verdict.md`
> **B-71 终判：FAIL**（A=3 阻断 / B=2 / C=4）　**B-68 回归：PASS**

## §0 钉值与环境（实测）

| 项 | 值 |
|---|---|
| PIN | `b71-build6`；`[PIN] sha=D4D55FE4E735A54F124ECA735B6E59F86A581244A99A2CFB9202208ACF414BF6 shaOk=true size=1599849 sizeOk=true mkOk=true` |
| release | 1,599,849 B `D4D55FE4…414BF6`；mtime `2026-11-28T04:16:37.0772Z`（窗内未变，0 rebuild） |
| HEAD | `e318580`（窗内 0 提交） |
| cfg（起/收） | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` / 同 |
| props（起/收） | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` / 同 |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| 两窗停服 | `[stop] {"exitCode":0,"exited":true}` ×2 |

## §1 B-71 窗口（`RUN=b71r1`，12:41:07 → 12:43:52，165 s，EXIT=2）

- tee：`testharness/build-logs/b71-b71r1-b1.out`（2,814,884 B / 18,395 行）
- driver log：`testharness/build-logs/b71r1-driver.log`（411 B）— 工单写的 `b71-b71r1-driver.log` 不存在（C-B71-1）
- stdout：`build-logs/b71r1-node.out`
- `[cfg] b71-b71r1-b1 bushR196=true bushDebugLog=true mobDebugLog=true`

```
[PIN] sha=D4D55FE4E735A54F124ECA735B6E59F86A581244A99A2CFB9202208ACF414BF6 shaOk=true size=1599849 sizeOk=true mkOk=true ok=true
[done] {"run":"b71r1","pin":true,"w1":false,"w2":true,"w2b":true,"w3":false,"w4":true,"w5":true,"w6":false,"stops":0,"crashes":0,"pass":false,"bad":3,"badKeys":["w1","w3","w6"]}
```

### §1.1 逐臂证据（tee 行号 + 原文）

**W2（绿）**
```
:13228 [BushLog] probe pos=-27,151,-155 block=etim:bush growth=3 berries=1 soil=minecraft:grass soilOk=1 biome=minecraft:forest biomeOk=1 sky=1 light=15 rawMax=15 stay=1 place=0 rate=0.0250 temp=0.70 mult=1.00 master=1 growable=0 hand=theoneprobe:probenotex1
:13363 [BushLog] pick pos=-27,151,-155 growth=3 result=berries->0 drops=etim:blueberries:1
:13412 [BushLog] probe pos=-27,151,-155 block=etim:bush growth=0 berries=0 … stay=1 …
:13443 [BushLog] pick pos=-27,151,-155 growth=0 result=refused
```

**W2′（绿，骨粉无效且不消耗）**
```
:13526 [BushLog] probe pos=-27,151,-155 block=etim:bush growth=0 … growable=0 hand=minecraft:dyex1
:13543 [BushLog] pick pos=-27,151,-155 growth=0 result=refused
:13567 [BushLog] probe pos=-27,151,-155 block=etim:bush growth=0 … growable=0 hand=minecraft:dyex1
```

**W4（绿，非法移除掉果且变 air）**
```
:18127 [BushLog] illegal pos=-25,151,-156 growth=3 player=1 drops=etim:blueberries:1
:18169 [BushLog] probe pos=-25,151,-156 block=minecraft:air growth=-1 berries=0 soil=minecraft:air soilOk=0 … stay=0 …
```

**W5（绿，玩家采掘掉果且变 air）**
```
:18229 [BushLog] harvest pos=-28,151,-153 growth=3 result=berries drops=etim:blueberries:1
:18310 [BushLog] probe pos=-28,151,-153 block=minecraft:air growth=-1 … place=1 …
```

**W1（红）**
```
:11991 ### [harness] > etest bushgen -2 -10
:12000 Only players can use /state.
（全档 [BushLog] gen 计数 = 0）
```

**W3（红）**
```
:13633 ### [harness] > time set midnight
:13635 'midnight' is not a valid number
:13741 ### [harness] > etest bushtick -26 151 -154 400
:13749 Only players can use /state.
:15869 ### [harness] > time set noon
:15871 'noon' is not a valid number
:15994 ### [harness] > etest bushtick -26 151 -154 400
:16017 Only players can use /state.
[W3] {"nightProbe":{…light=15…},"night":null,"darkRows":0,"noonProbe":{…light=15…},"day":null,"growRows":0,…,"pass":false}
```

**W6（红，仅 genOk）**
```
[W6] {"srcOk":true,"dropsOnlySelf":true,"genOk":false,"regOk":true,"stackOk":true,"cfgOk":true,"mixOk":true,"stateOk":true,"texOk":true,"langOk":true,"pass":false}
```
`genOk` 断言 `/canSeeSky/.test(ETIMBushGen.java)`；实测该文件 `canSeeSky` 0 次，天光检查实际在 `ETIMBushGen.java:109 → ETIMBlockBush.canBlockStay → ETIMBlockBush.java:149`（B-B71-1）。

### §1.2 分级

A=3（A-B71-1 `bushgen` 缺玩家 / A-B71-2 `time set midnight|noon` / A-B71-3 `bushtick` 缺玩家）；B=2（B-B71-1 `genOk` 断言、B-B71-2 `place` 期望）；C=4（driver log 命名、世界名、assert-exempt、TheOneProbe 占手）。

## §2 B-68 耕地回归窗（`RUN=b68r2`，12:42:32 → 12:43:13，41 s，EXIT=0）

- tee：`testharness/build-logs/b68-b68r2-b1.out`（123,084 B）
- driver log：`testharness/build-logs/b68r2-driver.log`
- `[cfg] b68-b68r2-b1 farmDebugLog=true blightR196=true droughtDeathR196=true`

```
[done] {"run":"b68r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

| 臂 | 结果 | 锚 |
|---|---|---|
| W1 顶面土壤门 | PASS `{planted: etim:onions age=0, refused: air}` | `[W1]` |
| W2 三族成熟 | PASS carrot `drops=2 first=minecraft:carrot`、potato `drops=2 first=minecraft:potato`、onion `drops=3 first=etim:onion` | `:780` `:785` `:790` |
| W3 种子/未熟/毒薯/洋葱未熟 | PASS `seed drops=1`／`immature drops=0`／`poison first=minecraft:poisonous_potato`／`onion immature drops=0` | `:805` `:811` `:817` `:822` |
| W4 置枯两族 | PASS `blight src=forceSet … blighted=1` → potato `branch=poison drops=1`、onion `branch=blight drops=0` | `:832` `:834` `:836` `:837` `:842` |
| W5 干旱四家族 | PASS `dead_carrot age3 / dead_potato age5 / dead_onion age2 / dead_crop age4`，成熟洋葱采后 air | `[W5]` |
| W6 静态 | PASS 七项全 true | `[W6]` |

- 关键前置行：`:587` `[FarmLog] dead-plant carriers registered (dead_crop/dead_stem/dead_carrot/dead_potato/dead_onion, no ItemBlock) + onion crop/item + bush/blueberries`；`:661` `Done (1.208s)!`
- 世界：`run/w-b68-b68r2-v1`（28 文件 / 5,149,795 B）保留。

## §3 收口

| 项 | 值 |
|---|---|
| jar mtime 起/收 | `2026-11-28T04:16:37.0772Z` / 同（0 rebuild） |
| HEAD | `e318580`，窗内 0 提交 |
| cfg / props 起收 | 同哈希（见 §0） |
| port / crash | 0 → 0 / 0 → 0 |
| 世界 | `run/w-b71-b71r1-v1`（27 / 6,160,851 B）、`run/w-b68-b68r2-v1`（28 / 5,149,795 B），保留 |
| 纪律 | 单次等待 ≤180 s；两窗均后台起服，起跑后按 ~1 min 巡检；无客户端操作 |

## §4 结论

- **B-71：FAIL（A=3）**。三条阻断全在判据/工装面（`/etest bushgen`、`/etest bushtick` 缺玩家参数；`time set midnight|noon` 非 1.12 语法），产品码零改动、零重建。修 4 行驱动后可直接重跑。
- **四条已绿臂可留用**：W2 采摘、W2′ 骨粉无效、W4 非法移除、W5 玩家采掘，锚见 §1.1。
- **B-68 回归：PASS**（六臂全绿，含本批改动的 `MixinBlockFarmland` 两臂）。

## r2（2026-11-28）· 复跑回执（`RUN=b71r2`）

### r2.1 钉值与环境

| 项 | 实测 |
|---|---|
| `[PIN]` | `sha=D4D55FE4E735A54F124ECA735B6E59F86A581244A99A2CFB9202208ACF414BF6 shaOk=true sizeOk=true mkOk=true size=1599849` |
| `[cfg]` | `bushR196=true bushDebugLog=true mobDebugLog=true` |
| HEAD | `6faf4c1`（窗内 0 提交） |
| jar | 1,599,849 B，mtime `2026-11-28T04:16:37.0772Z`（窗内未变／0 rebuild） |
| cfg / props | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` / `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`（起收同） |
| port / crash | 0 → 0 / 0 → 0 |
| 时长 | 13:08 起 89 s，EXIT=2 |
| 世界 | `run/w-b71-b71r2-v1`（28 文件 / 6,164,276 B，保留） |

### r2.2 终判

```
{"run":"b71r2","pin":true,"w1":false,"w2":true,"w2b":true,"w3":false,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":false,"bad":2,"badKeys":["w1","w3"]}
```
**FAIL —— A=0 / B=2 / C=2**（红面均为判据面，产品侧有正向证据，见 verdict §r2.1）

### r2.3 逐窗材料

- tee：`testharness/build-logs/b71-b71r2-b1.out`（2,067,068 B / 13,987 行；`:4724 Done (6.043s)!`、`:13985 BUILD SUCCESSFUL in 1m 27s`）
- driver log：`testharness/build-logs/b71r2-driver.log`
- stdout：`build-logs/b71r2-node.out`

### r2.4 红面（两条，均判据/工装）

**B-B71-3 · W1 抽样互斥**：`:12071 > etest bushgen -2 -10 ETIM_F7` → `:12077 [BushLog] gen chunk=-2,-10 biome=minecraft:forest patches=0 placed=0 first=none`。`ETIMBushGen.java:27 PATCH_TENTHS = 2`、`:95 patchesFor = 2/10 + (rand.nextInt(10) < 2 ? 1 : 0)` ⇒ 80% 抽 0 patch；工单允许 `patches=0`，而 W1 同时要求 `placed>=1` ⇒ 该随机轮次必红（PASS 概率 ≈20%）。建议驱动最多 10 次 bushgen 直到 `placed>=1`。

**B-B71-4 · W3 解析错位**：产品行齐全（`:12719` 起 400 条 `result=dark light=4`；`:13260/:13261/:13262` `from=0 to=1 / 1→2 / 2→3 light=15`；`:13263` 起 354 条 `result=ripe growth=3`；`:13072` 夜 `after=0 light=4`、`:13617` 昼 `after=3 light=15`），但驱动 `darkRows=0`。因 `f11-b71-smoke.js:92-94` 取 `m[10]`（实为 `mod=`）当 `result`、`m[11]` 当 `light`；正确为 `m[11]` / `m[12]`。

### r2.5 r1 三条 A 复核

| 项 | r2 实测 | 结论 |
|---|---|---|
| A-B71-1 | `gen` 行出现（`:12077`） | 闭环 |
| A-B71-2 | 无 `'midnight'`/`'noon'` 报错；夜 light=4、昼 light=15 | 闭环 |
| A-B71-3 | 两条 `bushtick` 行出现（`:13072`、`:13617`） | 闭环 |
| B-B71-1 | `[W6]` 十项全真（`genOk:true`） | 闭环 |

### r2.6 B-68 回归

沿用 r1 的 `RUN=b68r2`：`[done] {"run":"b68r2","pin":true,"w1".."w6":true,"pass":true,"bad":0}`，本窗未重跑（工单仅要求重跑 B-71）。

本回执字数规格：9711 B / 178 行。
