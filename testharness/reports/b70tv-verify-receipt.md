# B-70TV 四窗等价验证回执（b63 / b61 / b59 / b58 迁上 `lib/harness.js`）

窗口：2026-11-27（本地 09:51:33 → 09:54:44，四窗串行，各自独立起停服）
执行：会话七（ETIM 验证窗执行）
正本落盘：`git-workspace/etim/testharness/reports/b70tv-verify-receipt.md`

## §0 钉值实测

| 项 | 工单钉值 | 实测 | 判定 |
|---|---|---|---|
| HEAD | `9e005c8`（B-70TU） | `9e005c8`（窗内 0 提交） | 一致 |
| `origin/master..HEAD` | 11 | 11 | 一致 |
| `f7-wb-lib.js:35` | `b70tj-build1` | `b70tj-build1` | 一致 |
| release | 1,569,395 B | 1,569,395 B | 一致 |
| release SHA256 | `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4` | 同 | 一致 |
| release mtime | `2026-11-26T14:28:21.320Z` | `…3200589Z`（四窗起收同一，0 rebuild） | 一致 |
| `run/config/etim.cfg` | — | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` 起收同 | 一致 |
| `run/server.properties` | — | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` 起收同 | 一致 |
| port 25565 | 0 | 0 → 0 | 一致 |
| `run/crash-reports` | 0 | 0 → 0 | 一致 |

四窗 `[PIN]` 同值、三门 true：

```
[PIN] sha=F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4 shaOk=true size=1569395 sizeOk=true mkOk=true ok=true
```

## §1 四窗结果

| 窗 | 脚本 | 起→收 | 秒 | EXIT | `[cfg]` | 结果 |
|---|---|---|---|---|---|---|
| r1 | `f11-b63-smoke.js` | 09:51:33→09:52:12 | 39 | **0** | `mobDebugLog=true mobSilverfishR196=true` | W1–W6 全 true，`bad=0` |
| r2 | `f11-b61-smoke.js` | 09:52:12→09:52:48 | 36 | **0** | `mobDebugLog=true livestockNeedsR196=true` | W1–W7 全 true，`bad=0` |
| r3 | `f11-b59-smoke.js` | 09:52:48→09:53:43 | 55 | **1** | `mobDebugLog=true mobUndeadSurfaceR196=true` | W1–W7 全 true，但收尾崩 `stops is not defined`，无 `[done]` |
| r4 | `f11-b58-smoke.js` | 09:53:43→09:54:44 | 60 | **1** | `mobDebugLog=true foodDebugLog=true` | 仅 W1 打印后崩 `bot is not defined`，无 `[done]` |

```
[done] {"run":"b70tv-r1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
[done] {"run":"b70tv-r2","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}
```

r3 / r4 无 `[done]`（脚本在收尾阶段抛 `ReferenceError`）；两窗均由 `h.guard` 兜底停服，`[stop] {"exitCode":0,"exited":true}`。

## §2 逐臂对位

### 2.1 新增 / 消失 / 改值

| 类别 | 内容 |
|---|---|
| 新增 | 0（四份脚本与历史正本相比无新臂） |
| 消失 | 0（臂体未进 `git diff` 的 hunk；迁移只动脚手架与 `stage`） |
| 改值 | 0（r1/r2 全绿，数值与历史正本同义；r3 七臂全 true 但窗口因收尾崩溃未成判；r4 仅 W1 打印后中断） |

### 2.2 臂级对照

**r1 `f11-b63-smoke.js`（SilverLog；对 `b63-verify-verdict.md`）**

| 臂 | 本窗实测 | 历史正本 | 同义 |
|---|---|---|---|
| W1 属性 | copperspine 8/8/3/0.6/10/ARTHROPOD；hoary、netherspawn 8/3/0.6/10 | 同（hp 8、attack 3、speed 0.6、xp 10） | ✔ |
| W2 hatch | `hatch3 meta=3 netherspawn`、`hatch4 meta=4 copperspine`、`info 2/1/2` | 同 | ✔ |
| W3 咬面 | copperspine `poison=true dur=480`；hoary `slow=true dur=50 amp=5` | 同 | ✔ |
| W4 免疫/自爆 | `fire applied=false`、`player applied=true dead=false`、`exploded=true`、`snow dealt=2` | 同 | ✔ |
| W5 接线 | `cfgOk/regOk/mixOk` 全 true | 同 | ✔ |
| W6 资源 | `langOk/snowOk/blastOk` 全 true | 同 | ✔ |

**r2 `f11-b61-smoke.js`（BeastLog；对 `b61-verify-verdict.md`）**

| 臂 | 本窗实测 | 历史正本 | 同义 |
|---|---|---|---|
| W1 属性 | dire 16/16/5/0.4/16/xp10；hell 20/20/4/0.4/16/xp15 | 同 | ✔ |
| W2 驯服 | 200 掷 `aggro 62 / fail 128 / success 10`；tamed 16/24/5/32 | 74/119/7、24/5/32（分布同量级） | ✔ |
| W3 点燃 | `bite target=ETIM_F7 fire=4 hurt=false` | `fire=4` | ✔ |
| W4 免疫 | `fire found=1 applied=0`、`player found=1 applied=1` | 同 | ✔ |
| W5 深度门 | y=20 allowed=true、y=100 allowed=false | 同 | ✔ |
| W6 刷怪行 | base/taiga/snowy/gate 四项 true | 同 | ✔ |
| W7 资源 | tex/langs/reg true | 同 | ✔ |

**r3 `f11-b59-smoke.js`（UndeadLog；七臂全部打印 true，窗口因收尾崩溃未成判）**

`[W1]` ghoul 20/20/40/5/0.28/10 `undead=false`、wight 0.25 `undead=true`、shadow 0.23 `undead=true`；`[W2]` `playerKill found=1 killed=0`、`magicKill found=1 killed=1`、`drop flesh/nugget/hit=false roll=-1`；`[W3]` 夜间三只全活、白天 `shadow=0`；`[W4]` `snuff pos=8,130,1 kind=minecraft:torch`；`[W5]` `slow ticks=50 amp=5 lost=true`；`[W6]` y=100 三只全拒、y=40 Ghoul/Wight 放行、y=20 Shadow 放行；`[W7]` `tex/langs/cfgKey` 全 true。与 `b59-verify-verdict.md` 七臂逐臂同义。

**r4 `f11-b58-smoke.js`（GelLog/FoodLog；仅 W1 打印后中断）**

`[W1]` 五枚 subtype `dmg 1/2/3/3/4`、`kind pepsin×3 + acid×2`，与 `b58-verify-verdict.md` W1 同义；W2–W6 未执行。

## §3 分级（A / B / C）

| 编号 | 级别 | 内容 | 证据 |
|---|---|---|---|
| **A-B70TV-1** | **A（迁移缺陷）** | b59 收尾仍引用旧脚手架的 `stops` 数组（迁移后不存在）⇒ `ReferenceError`，`[done]` 未生成、EXIT=1 | `testharness/player/f11-b59-smoke.js:216` `res.stops = stops.length;`；栈顶 `testharness/build-logs/b70tv-r3-stdout.out` `at main (…f11-b59-smoke.js:216:15)` |
| **A-B70TV-2** | **A（迁移缺陷）** | b58 的 W5 段仍用旧全局 `bot`（迁移后由 `h.bot` 持有）⇒ `ReferenceError`，W2–W6 未执行、`[done]` 未生成、EXIT=1 | `testharness/player/f11-b58-smoke.js:175` `await bot.setQuickBarSlot(0);`、`:176` `await bot.activateItem();`；栈顶 `build-logs/b70tv-r4-stdout.out` `at main (…f11-b58-smoke.js:175:3)` |
| B | — | 无（臂体与断言未改，历史正本语义无漂移） | `git diff` 仅脚手架与 `stage` |
| C-B70TV-1 | C | 每窗 `[done]` 前两条 `[stop]`（脚手架既有） | 惯例 |
| C-B70TV-2 | C | 世界名三段前缀 `w-b63-b70tv-r1-v1` 等 | 惯例 |
| C-B70TV-3 | C | b61 W2 驯服分布 `62/128/10` 与历史 `74/119/7` 有抽样浮动，同量级（20%/20%/5%） | 概率面 |
| C-B70TV-4 | C | `node --check` 只查语法，`ReferenceError`（未定义标识符）需运行才暴露；建议 harness 侧加「遗留全局名（`bot`/`srv`/`stops`/`propsBefore`/`cfgBefore`/`startBoot`/`stopBoot`）扫描」入 `check-driver.js` 规则集 | 流程面 |

修法（**未执行，按要求只报不改**）：b59 删 `:216` 一行（`h.finish` 已统一统计 stops/crashes）；b58 把 `:175/:176` 改为 `h.bot.setQuickBarSlot(0)` / `h.bot.activateItem()`（harness 对象字段 `bot` 已在 `harness.js:151-154` 暴露）。改完重跑 r3/r4 即可判等价。

## §4 收口

| 项 | 状态 |
|---|---|
| 四窗 EXIT | 0 / 0 / 1 / 1 |
| 停服 | 四窗均 `{"exitCode":0,"exited":true}`（r3/r4 由 `h.guard` 兜底） |
| 场地 | 四窗 tee 中 `outside of the world` / `Cannot summon` **合计 0 条**（`stage` 生效） |
| 钉值 | 三哈希 + MK + jar mtime 起收同一（0 rebuild）；HEAD `9e005c8` 未变；ahead 11 |
| 环境 | cfg / props 起收同哈希；port 0→0；crash 0→0 |
| 世界 | `run/w-b63-b70tv-r1-v1`（4,904,704 B）、`w-b61-b70tv-r2-v1`（4,897,726 B）、`w-b59-b70tv-r3-v1`（4,988,945 B）、`w-b58-b70tv-r4-v1`（4,923,493 B）全部保留 |
| 证据 | `build-logs/b70tv-r{1,2,3,4}-stdout.out`、`testharness/build-logs/b{63,61,59,58}-b70tv-r{1,2,3,4}-b1.out`、`build-logs/b70tv-index.tsv` |

## §5 终判

**FAIL** — 四窗中 r1（b63）、r2（b61）**通过**；r3（b59）、r4（b58）因**残留旧脚手架标识符**（`stops`、`bot`）在收尾/中段抛 `ReferenceError`，窗口未能生成 `[done]`。两条均为 **A 级迁移缺陷**，且都不涉及判臂语义：r3 七臂已全部打印 true，r4 仅 W1 打印后中断。A=2／B=0／C=4。

首轮落盘时规格：8130 B / 117 行。
---

## §二轮（A-B70TV-1 / A-B70TV-2 修复后复跑，2026-11-27 10:10 令）

### r2.0 钉值复核（只读，预期 0 rebuild）

| 项 | 值 |
|---|---|
| `f7-wb-lib.js:35` | `b70tj-build1` |
| release | 1,569,395 B / `F0904A3324A38FBBACD6C85440FEE053B5C80484ADC2018ACD460D2C3A91C8D4` |
| jar mtime | `2026-11-26T14:28:21.3200589Z`（两窗起收未变） |
| HEAD | `9e005c8`，origin/master..HEAD = 11（窗内 0 提交） |
| cfg / props | `C69FC496…E5AEC257` / `6784C3ED…D21322F1EB9`，起收同哈希 |
| port / crash | 0 → 0 / 0 → 0 |

### r2.1 修复面核对（只读）

- `testharness/player/f11-b59-smoke.js`：`res.stops` / `res.crashes` 两行已删，收尾只剩 `:216 await h.stop();`、`:217 h.finish(res);`（`h.finish` 统一统计 stops / crashes）。
- `testharness/player/f11-b58-smoke.js`：`:175 await h.bot.setQuickBarSlot(0);`、`:176 await h.bot.activateItem();`；全文无裸 `bot.`。
- `node testharness/tools/check-driver.js --list` → `[DriverLog] files=450 onHarness=13 offenders=0 debt=0 byRule={} [local]` / `verdict OK`（R5 leftover-scaffold 生效）。
- `node testharness/tools/selftest-driver.js` → 六条全 PASS（含新增 `leftover.js` 反例），`selftest-driver: 6/6`。

### r2.2 两窗（串行，新 RUN 名）

| 窗 | 脚本 | 起止 | 时长 | EXIT | 判 |
|---|---|---|---|---|---|
| r3 | `f11-b59-smoke.js` | 10:04:57 → 10:05:57 | 60 s | 0 | **PASS** |
| r4（首跑） | `f11-b58-smoke.js` | 10:05:57 → 10:07:06 | 69 s | 2 | FAIL（W5） |
| r4b（复跑） | `f11-b58-smoke.js` | 10:09:20 → 10:10:20 | 60 s | 0 | **PASS** |

`[PIN]` 三窗同值 `sha=F0904A33…C3A91C8D4 shaOk=true size=1569395 sizeOk=true mkOk=true ok=true`；
`[cfg]` 分别 `mobDebugLog=true mobUndeadSurfaceR196=true` / `mobDebugLog=true foodDebugLog=true`（r4 首跑那份回读为 true 但段位错误，见 r2.3）。

### r2.3 r4 首跑 W5 红面与根因（B 级，判据通道）

`[W5] {"throwRow":null,"foodRow":null,"before":{"0":3,…},"after":{"0":2,…},"consumed":1,"pass":false}`

- 全档 `[FoodLog]` **0 条**；但 `[GelLog] throw subtype=0 dmg=1 kind=pepsin hunger=0.250 x=0.500 y=130.000 z=0.500 entity=2519` 存在（`testharness/build-logs/b58-b70tv2-r4-b1.out:9336`）⇒ 投掷动作与 hunger 常量都在，缺的是 `chargeSphereThrow` 的落账行。
- 根因：驱动 cfg 按工单原文写成 `'mobs:foodDebugLog'`（`testharness/player/f11-b58-smoke.js:36` 原值），而 `src/main/java/io/github/etim/etim/ETIMConfig.java:884` 读的是 **`"food"`** 段；harness 于是把 `B:foodDebugLog=true` 插进 `[mobs]`（回读通过），运行期 `ETIMConfig.foodDebugLog` 仍为 false（`[food]` 段实际值 `B:foodDebugLog=false`，`run/config/etim.cfg:434`），服务端关机重写 cfg 时该伪键被丢弃 ⇒ 文件里只剩 `[food]` 那一条。
- 修：`cfg: ['mobs:mobDebugLog', 'food:foodDebugLog']`（C-B70TV2-1），断言未动。

### r2.4 r3（b59）逐臂结果

`[done] {"run":"b70tv2-r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"w7":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

| 臂 | 判定值 | 历史正本对位 |
|---|---|---|
| W1 | `ghoul 20/20/40/5/0.28/xp10/undead=false`、`wight 20/20/40/5/0.25/true`、`shadow 20/20/40/5/0.23/true`，三只成功生成 | 同形（speed 0.28 / 0.25 / 0.23） |
| W2 | `playerKill 1/0`、`magicKill 1/1`、`drop flesh/nugget/hit = false/false/false, roll=-1` | 同形 |
| W3 | 夜 ghoul/wight/shadow 各 1 存活；昼 shadow=0 | 同形 |
| W4 | `snuff pos=8,130,1 kind=minecraft:torch` | 同形 |
| W5 | `slow ticks=50 amp=5 lost=true` | 同形 |
| W6 | y=100 三类全拒；y=40 ghoul/wight 放行、shadow 拒；y=20 shadow 放行 | 同形 |
| W7 | `tex=true langs=true cfgKey=true` | 同形 |

tee 锚（`testharness/build-logs/b59-b70tv2-r3-b1.out`，8,311 行）：
`:8197 [UndeadLog] shadow snuff pos=BlockPos{x=8, y=130, z=1} kind=minecraft:torch entity=ETIMEntityShadow['Shadow'/2403, …]`；
`:8218 [UndeadLog] ghoul slow target=ETIM_F7 ticks=50 amp=5 lost=true entity=ETIMEntityGhoul['Ghoul'/2405, …]`；
`:5005-5007 [AILog] mob stats maxHealth=12.0 / attackDamage=4.0 / followRange=28.0 entity=EntitySpider#1893`（回归面）。

新增/消失/改值：**0 / 0 / 0**（全部同义）。

### r2.5 r4b（b58）逐臂结果

`[done] {"run":"b70tv2-r4b","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"w5":true,"w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`

| 臂 | 判定值 | 历史正本对位 |
|---|---|---|
| W1 | 五枚 `dmg 1/2/3/3/4`、`kind pepsin×3 + acid×2` | 同形 |
| W2 | grassTop `acid` changed=true；grassSide changed=false；leaves changed=true；wool `pepsin period=400 changed=false` | 同形 |
| W3 | zombie `dealt=3`、skeleton `immune=true dealt=0`、pudding `immune=true dealt=0` | 同形 |
| W4 | jelly `dropMeta=1`、blob `2`、ooze `3`、pudding `4`（size=1），`bigDropRows=0` | 同形 |
| W5 | `throwRow=[GelLog] throw … hunger=0.250 …`、`foodRow=[FoodLog] ETIM_F7 (67) sphereThrowDrain base=0.25 mod=1.0 amount=0.25 pool=0.9039987`、`before 3 → after 2, consumed=1` | 同形（历史 `:8714 [FoodLog] … base=0.25 …`） |
| W6 | `models/tex/langs` 全 true | 同形 |

tee 锚（`testharness/build-logs/b58-b70tv2-r4b-b1.out`，9,475 行 / 1,402,521 B）：
`:9393 [FoodLog] ETIM_F7 (67) sphereThrowDrain base=0.25 mod=1.0 amount=0.25 pool=0.9039987`；
`:9394 [GelLog] throw subtype=0 dmg=1 kind=pepsin hunger=0.250 x=0.500 y=130.000 z=0.500 entity=2463`。

新增/消失/改值：**0 / 0 / 0**。

### r2.6 收口

| 项 | 状态 |
|---|---|
| 停服 | 三窗均 `{"exitCode":0,"exited":true}`（r3 一条、r4 首跑一条、r4b 一条） |
| ReferenceError | **0 条**（三窗 stdout 无 `[fatal]`） |
| 场地 | 三窗 tee `outside of the world` / `Cannot summon` 合计 0 |
| 环境 | cfg / props 起收同哈希；port 0→0；crash 0→0；jar mtime 未变；HEAD `9e005c8` 未变 |
| 世界 | `run/w-b59-b70tv2-r3-v1`、`run/w-b58-b70tv2-r4-v1`（W5 红那轮，留痕）、`run/w-b58-b70tv2-r4b-v1` 全留 |
| 证据 | `build-logs/b70tv2-r3-stdout.out`、`b70tv2-r4-stdout.out`、`b70tv2-r4b-stdout.out`、`build-logs/b70tv2-index.tsv`、`testharness/build-logs/b{59,58}-b70tv2-r{3,4,4b}-b1.out` |

### r2.7 分级与终判

- **A-B70TV-1 已闭环**：`f11-b59-smoke.js:216` 旧标识符删除后，r3 七臂全 true、无 `ReferenceError`、有 `[done]`。
- **A-B70TV-2 已闭环**：`f11-b58-smoke.js:175/176` 改 `h.bot.*` 后，r4b 六臂全 true、W2–W6 全部执行到。
- **B=1（C-B70TV2-1）**：驱动 cfg 段名 `mobs:foodDebugLog` 应为 `food:foodDebugLog`（`ETIMConfig.java:884`），导致 W5 的 `[FoodLog]` 通道整轮缺失；已修并复跑取证。
- **C 级**：C-B70TV2-2 r4 首跑同臂 `throwRow` 采集为 null 而 `[GelLog] throw` 行确实存在（r4b 正常，未复现，疑与同 tick 写序相关）；C-B70TV2-3 `w-b58-b70tv2-r4-v1` 为 W5 红那轮世界，按「世界一律保留」留痕；C-B70TV2-4 每窗 `[done]` 前一条 `[stop]`（惯例）；C-B70TV2-5 r3 窗口 8,311 行、r4b 9,475 行，行数差来自世界内实体心跳，不影响判臂。

**终判：PASS**（两窗全绿，两条 A 级迁移缺陷闭环，B 级 1 条已修并复验；与历史正本逐臂零差异）

本回执字数规格：15510 B / 219 行。
