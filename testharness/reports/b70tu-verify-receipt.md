# B-70TU 三窗等价验证回执（b68 / b67 / b62 迁上 `lib/harness.js`）

窗口：2026-11-27（本地 09:10:20 → 09:13:41，三窗串行，各窗独立起停服）
执行：会话七（ETIM 验证窗执行）
正本落盘：`git-workspace/etim/testharness/reports/b70tu-verify-receipt.md`

## §0 钉值实测

| 项 | 工单钉值 | 实测 | 判定 |
|---|---|---|---|
| HEAD | `92c3465`（B-70TT） | `92c3465`（窗内 0 提交） | 一致 |
| `origin/master..HEAD` | 10 | 10 | 一致 |
| `f7-wb-lib.js:35` | `b70tj-build1` | `b70tj-build1` | 一致 |
| release | 1,569,395 B | 1,569,395 B | 一致 |
| release SHA256 | `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4` | 同 | 一致 |
| release mtime | `2026-11-26T14:28:21.320Z` | `…3200589Z`（三窗起收同一，0 rebuild） | 一致 |
| `run/config/etim.cfg` | — | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257`（56,005 B）起收同 | 一致 |
| `run/server.properties` | — | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9`（939 B）起收同 | 一致 |
| port 25565 | 0 | 0 → 0 | 一致 |
| `run/crash-reports` | 0 | 0 → 0 | 一致 |

`[PIN]` 三窗同值且三门 true：

```
[PIN] sha=F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4 shaOk=true size=1569395 sizeOk=true mkOk=true ok=true
```

## §1 三窗结果

| 窗 | 脚本 | 起→收 | 秒 | EXIT | `[cfg]` | 终判载荷 |
|---|---|---|---|---|---|---|
| r1 | `f11-b68-smoke.js` | 09:10:20→09:11:59 | 99 | 2 | `farmDebugLog=true blightR196=true droughtDeathR196=true` | `w1..w4=false, w5/w6=true, bad=4` |
| r2 | `f11-b67-smoke.js` | 09:11:59→09:12:50 | 50 | 2 | `mobDebugLog=true explosionR196=true dropR196=true` | `w4=false, 其余 true, bad=1` |
| r3 | `f11-b62-smoke.js` | 09:12:50→09:13:41 | 52 | 2 | `mobDebugLog=true mobElementalR196=true` | `w3/w4=false, 其余 true, bad=2` |

三窗共同项：`pin=true`、`stops=0`、`crashes=0`；`[cfg]` 行列出的键全部 `=true`（harness 起服后回读）。

`[done]` 原文：

```
[done] {"run":"b70tu-r1","pin":true,"w1":false,"w2":false,"w3":false,"w4":false,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":false,"bad":4,"badKeys":["w1","w2","w3","w4"]}
[done] {"run":"b70tu-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":false,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":false,"bad":1,"badKeys":["w4"]}
[done] {"run":"b70tu-r3","pin":true,"w1":true,"w2":true,"w3":false,"w4":false,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":false,"bad":2,"badKeys":["w3","w4"]}
```

## §2 臂级对位（新增 / 消失 / 改值）

判臂源码层面**零改动**：`git diff` 显示三份脚本只有三处 hunk（头部 helper 区、`main()` 头、`main()` 尾），W1..W6/W7 的臂体与断言未进入任何 hunk。

### 2.1 新增

| 项 | 内容 |
|---|---|
| — | 无。三份脚本与历史正本相比没有任何新臂或新断言 |

### 2.2 消失

| 窗 | 消失项 | 位置（HEAD 版） |
|---|---|---|
| 三窗共有 | `join()` 内的场地布置：`tp <bot> <arena>` + `fill … minecraft:stone` + `fill … minecraft:air` | `git diff` 删除行：b67/b62 `tp 0.5 130 0.5` / `fill 0 129 0 31 129 31`（b62 为 15） / `fill 0 130 0 31 133 31` |
| b68 | 湿耕地带 `fill 3 130 8 20 130 8 minecraft:farmland[moisture=7]`、旱地带 `fill 3 130 10 20 130 10 minecraft:farmland[moisture=0]`、`tp 3.5 130 6.5` | 同上 hunk |
| b68 | `bs()` 归一函数（1.13 `name[state=n]` → 1.12 `name <meta>`） | 自管 `cmd()` 一并被删，harness `cmd()` 不做归一 |

`DEFAULT_RULES` 的八条 gamerule 与 `difficulty 2`、`gamemode 0` 由 harness `h.join()` 统一施加，**未丢失**（`harness.js:127-130`、`:315`）。

### 2.3 改值

| 窗 | 臂 | 历史正本期望 | 本窗实测 | 差异性质 |
|---|---|---|---|---|
| r1 | W1 种植门 | `etim:onions` age0 落在 (20,131,8) | `minecraft:air` | 场地缺失（地块未生成） |
| r1 | W2 成熟产量 | carrot/potato/onion 各 `mature drops 2..3` | carrot/potato 为 `harvester=none branch=machine drops=0`，仅 onion 成立 | 场地缺失（作物无耕地被弹掉） |
| r1 | W3 分支表 | 四条 `seed/immature/poison/immature` | 四条全 null | 同上 |
| r1 | W4 枯萎 | potato→poison 1、onion→blight 0 | 两条全 null | 同上 |
| r2 | W4 双半径与受惊 | `dmg` 行（僵尸 40.000、牛 36.704）+ `spook` | `{"damage":null,"sizef":null,"spook":false}` | 场地缺失（实体召唤失败） |
| r3 | W3 雪球 | `quench=true` / 火元素 `dealt=3` | `{"quench":null,"fire":null}` | 实体不存在 |
| r3 | W4 免疫 | 四类 hit `found=1` | 四类 `found=0` | 实体不存在 |

b68 的 W5（干旱死块家族）本窗仍 `pass=true`：其 `place()` 落在已加载区块内，`drought roll` 不依赖地面，故属**偶然成立**，不能反证场地完好。

## §3 分级（A / B / C）

| 编号 | 级别 | 内容 | 证据 |
|---|---|---|---|
| **A-B70TU-1** | **A（迁移缺陷）** | 三份驱动迁移到 `H.create({...})` 时**未传 `stage`**（`stage:` 键在三份文件里计数均为 0），原 `join()` 内的 `tp` 与两条 `fill` 场地布置被整段删除 ⇒ 目标区块未加载，所有 `setblock` / `summon` 落在未加载区 | b68 `testharness/build-logs/b68-b70tu-r1-b1.out:2464` `### [harness] > setblock 20 130 8 minecraft:farmland 7` → `:2465` `Cannot place block outside of the world`；b67 `testharness/build-logs/b67-b70tu-r2-b1.out:5704` `### [harness] > summon minecraft:zombie 4.5 130 0.5 {NoAI:1b}` → `:5705` `Cannot summon the object out of the world`（`:5733`/`:5745` 牛同）；b62 `testharness/build-logs/b62-b70tu-r3-b1.out:5807/5809/5811` `[ElementalLog] hit kind=earth source=player found=0 applied=0` ×3 |
| **A-B70TU-2** | **A（迁移缺陷）** | b68 迁移时把 `bs()`（1.13 方块状态语法归一并）随自管 `cmd()` 一起删掉，`place()` 仍传 `minecraft:farmland[moisture=7]` / `minecraft:carrots[age=7]` 等 1.13 写法；harness `cmd()` 不做归一 | `testharness/player/f11-b68-smoke.js:79/95-97/109-112/127-128` 仍为方括号写法；本窗因 A-1 先发生而未能单独暴露 |
| B | — | 无（臂体与断言源码零改动，历史正本语义未漂移） | `git diff` 三处 hunk 均不含 Wn 段 |
| C-B70TU-1 | C | 每窗 `[done]` 前两条 `[stop]`（`h.stop()` 与 `finish()` 各一条），带 `exited:true` 者为权威 | 脚手架既有行为 |
| C-B70TU-2 | C | 世界名三段前缀 `w-b68-b70tu-r1-v1` 等 | 命名惯例 |
| C-B70TU-3 | C | 工单要求单轮，三窗均未做收敛轮；A 级两条修复后需重跑一轮才能给等价结论 | 流程面 |

修法（**未执行，按要求只报不改**）：给三份 `H.create({...})` 补 `stage: { tp: [...], fill: [...], rules: {...} }`（b68 另需补两条 farmland `fill` 并把 `place()` 的方括号语法交给 harness 的归一或改回 `name <meta>`）；补完后重跑三窗。`stage` 字段在 `harness.js:141-142` 已有定义，`h.join()` 在 `:319` 消费 `s.tp`、`:319` 之后消费 `s.fill`。

## §4 收口

| 项 | 状态 |
|---|---|
| 三窗 EXIT | 2 / 2 / 2（均为 `pass:false`，红面已定位到 A 级迁移缺陷） |
| 停服 | 三窗均 `{"exitCode":0,"exited":true}` |
| 钉值 | 三哈希 + MK + jar mtime 起收同一（0 rebuild）；HEAD `92c3465` 未变 |
| 环境 | cfg / props 起收同哈希；port 0→0；crash 0→0 |
| 世界 | `run/w-b68-b70tu-r1-v1`、`run/w-b67-b70tu-r2-v1`、`run/w-b62-b70tu-r3-v1` 全部保留（按判窗世界保留纪律） |
| 证据 | `build-logs/b70tu-r{1,2,3}-stdout.out`、`testharness/build-logs/b{68,67,62}-b70tu-r{1,2,3}-b1.out`、`build-logs/b70tu-index.tsv`（起止与耗时） |
| 产品码 | 零改动；三份驱动文件的 M 状态为 B-70TU 迁移本身（未提交） |

## §5 终判

**FAIL** — 三窗均未通过，红面全部落在 **A 级（迁移缺陷）**：`stage` 未传导致场地丢失（A-B70TU-1，三窗共有），b68 另有 `bs()` 归一被删（A-B70TU-2）。臂体与断言源码零改动，历史正本语义未漂移。A=2／B=0／C=3。

本回执字数规格（首轮 §0–§5 落盘时）：**8,182 B / 81 行**（UTF-8 无 BOM、LF）。

---

# §二轮（A-B70TU-1 修复复验，2026-11-27 09:24 令）

## §r4 修复面与 A-B70TU-2 撤回

### 4.1 修复内容（只读核对）
三份脚本的 `H.create({...})` 均补上 `stage`（`stage:` 键计数 1/1/1）：
- b68：`gamemode 0`、`tp 12.5 130 12.5`、`fill 0 129 0 24 129 24 stone`、`fill 0 130 0 24 133 24 air`、`fill 3 130 8 20 130 8 farmland[moisture=7]`、`fill 3 130 10 20 130 10 farmland[moisture=0]`、`tp 3.5 130 6.5`
- b67：`gamemode 1`、`rules {doFireTick:true}`、`tp 0.5 130 0.5`、`fill 0 129 0 31 129 31 stone`、`fill 0 130 0 31 133 31 air`、`tp 0.5 130 0.5`
- b62：`gamemode 1`、`rules {doTileDrops:false}`、同形（范围 0..15）

`harness.js` 的 `join()` 顺序＝gamemode → gamerules → difficulty → weather → time → tp → fill（`harness.js:302-324`），与首轮诊断的缺失项逐项对齐。

### 4.2 A-B70TU-2 撤回（主会话指出成立，我复核确认）
`harness.js:49-52` 的 `bs()`（`name[prop=n]` → `name <meta>`）在 `harness.js:188-192` 的 `cmd()` 内生效（`h.srv.send(bs(s))`）。首轮 `b68-b70tu-r1-b1.out:2464` 打出的 `setblock 20 130 8 minecraft:farmland 7` **已是转换后形态**，当时的 `Cannot place block outside of the world` 是 A-B70TU-1 的区块未加载所致。⇒ **A-B70TU-2 不成立，从登记中撤回**；本轮回执按 A=1（首轮 A-1）计。

## §r5 三窗结果（同钉值、新 RUN 名）

| 窗 | 脚本 | 起→收 | 秒 | EXIT | `[cfg]` | 终判 |
|---|---|---|---|---|---|---|
| r4 | `f11-b68-smoke.js`（`b70tu2-r1`） | 09:39:27→09:40:15 | 49 | **0** | `farmDebugLog=true blightR196=true droughtDeathR196=true` | `w1..w6` 全 true，`bad=0` |
| r5 | `f11-b67-smoke.js`（`b70tu2-r2`） | 09:40:15→09:40:49 | 34 | **0** | `mobDebugLog=true explosionR196=true dropR196=true` | `w1..w6` 全 true，`bad=0` |
| r6 | `f11-b62-smoke.js`（`b70tu2-r3`） | 09:40:49→09:41:29 | 40 | **0** | `mobDebugLog=true mobElementalR196=true` | `w1..w7` 全 true，`bad=0` |

```
[done] {"run":"b70tu2-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
[done] {"run":"b70tu2-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
[done] {"run":"b70tu2-r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

三窗 `[PIN]` 同值、三门 true；`[stop] {"exitCode":0,"exited":true}`。

### 5.1 场地证据（工单第 3 条）

- 三窗 tee 中 `outside of the world` / `Cannot summon` **合计 0 条**（`Select-String` 计数 0）。
- b68 落地证据：`testharness/build-logs/b68-b70tu2-r1-b1.out:3345` `### [harness] > setblock 3 131 8 minecraft:carrots 7` → `Block placed`；`:3350` `setblock 5 131 8 etim:onions 7` → `Block placed`；`:3319` `setblock 20 130 8 minecraft:farmland 7` → `The block couldn't be placed`（1.12 对同方块同 meta 重放的既有回声，W1 仍成立 ⇒ 该格已是湿地）。
- b68 W1 实测 `planted {block:etim:onions, age:0, x:20, y:131, z:8}`、`refused {block:minecraft:air}` ⇒ 顶面土壤门成立。

### 5.2 逐臂同义对照（与历史正本）

| 窗 | 臂 | 本窗实测（关键值） | 历史正本 | 同义 |
|---|---|---|---|---|
| b68 | W1 | onion age0 @ (20,131,8)；石头位 air | 同 | ✔ |
| b68 | W2 | carrot/potato `mature drops=2`，onion `drops=2`（25% 支可为 3） | `carrot 2 / potato 2 / onion 3`（2..3 区间） | ✔ |
| b68 | W3 | carrot age0 `seed drops=1`；carrot age3 `immature 0`；potato age3 `poison 1 first=poisonous_potato`；onion age3 `immature 0` | 同 | ✔ |
| b68 | W4 | potato `blighted poison drops=1 first=poisonous_potato`；onion `blighted … drops=0` | 同 | ✔ |
| b68 | W5 | 四家族死块 + age（carrot 3 / potato 5 / onion 2 / wheat 4）+ 成熟洋葱 air | 同 | ✔ |
| b68 | W6 | 七项静态 true | 同 | ✔ |
| b67 | W4 | `[ExplosionLog] dmg EntityZombie dist=1.000 eff=16.000 damage=40.000 sizef=4.000`（`:7792`）、`EntityCow dist=2.236 damage=36.704`（`:7795`）、`spook EntityCow until=998`（`:7797`）、`[BoomLog] boom size=2.0 entity=4.0`（`:7801`） | 僵尸 40.000、牛 36.704、spook 成立 | ✔ |
| b67 | W1/W2/W3/W5/W6 | 同上轮 r2（`placed=10`、`brickChance=1.5`、`coalChance=0.5`、`lapisXp exempt=true`、`fire=3`） | 同 | ✔ |
| b62 | W1 | earth 30/30/12/0.20/20/15/type0/defense4；fire 20/20/5/0.25/40/15；clay 30/30/… | 同 | ✔ |
| b62 | W2 | earth `type=1 heat=1000 magma=true defense=4`；clay `type=9 hardened=true defense=2 magma=false` | 同 | ✔ |
| b62 | W3 | `{"kind":"earth","quench":"true"}`、`{"kind":"fire","dealt":3}` | quench=true、dealt=3 | ✔ |
| b62 | W4 | `earthFall found=2 applied=1`、`earthPlayer 2/0`、`clayPlayer 1/1`、`fireFire 1/0` | fall 1、earth player 0、clay 1、fire 0 | ✔ |
| b62 | W5/W6/W7 | 深度门 / 刷怪行 / 资源三项 true | 同 | ✔ |

新增/消失/改值三表：本窗相对历史正本**均为 0**（臂体与断言两轮之间未再改动，`stage` 只补场地）。

## §r6 分级与终判（二轮）

| 编号 | 级别 | 内容 | 状态 |
|---|---|---|---|
| A-B70TU-1 | A | 首轮：`stage` 未传导致场地丢失 | **已闭环**（本窗三窗全绿、`outside of the world` 0 条） |
| A-B70TU-2 | — | 首轮误判（harness `cmd()` 已内置 `bs()`） | **撤回** |
| B | — | 无 | — |
| C-B70TU-4 | C | 每窗 `[done]` 前两条 `[stop]`（脚手架既有） | 记录 |
| C-B70TU-5 | C | 世界名三段前缀 `w-b68-b70tu2-r1-v1` 等 | 记录 |
| C-B70TU-6 | C | b68 `setblock 20 130 8 minecraft:farmland 7` 回声 `The block couldn't be placed`：该格已由 stage 的 farmland fill 置好，重放同方块同 meta 属 1.12 既有回声，不构成失败 | 记录 |

收口：cfg `C69FC496…AEC257` 起收同、props `6784C3ED…2F1EB9` 起收同、port 0→0、crash 0→0、jar mtime `2026-11-26T14:28:21.3200589Z` 未变（0 rebuild）、HEAD `92c3465` 0 提交；世界 `run/w-b68-b70tu2-r1-v1`、`w-b67-b70tu2-r2-v1`、`w-b62-b70tu2-r3-v1` 保留；证据 `build-logs/b70tu2-r{1,2,3}-stdout.out`、`testharness/build-logs/b{68,67,62}-b70tu2-r{1,2,3}-b1.out`、`build-logs/b70tu2-index.tsv`。

**二轮终判：PASS** — 三窗（b68/b67/b62）在补回 `stage` 后全部 `pass:true bad:0`、EXIT=0，六个/六个/七个 Wn 与历史正本逐臂同义，A-B70TU-1 闭环、A-B70TU-2 撤回。A=0／B=0／C=3（累计 C：C-B70TU-1..6）。

本回执字数规格（含二轮）：**14,881 B / 137 行**（UTF-8 无 BOM、LF）。

