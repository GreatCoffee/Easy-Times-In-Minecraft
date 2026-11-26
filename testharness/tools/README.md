# testharness/tools —— 只读检查工具

下列脚本都不起服、不写产品码，随时可跑。

## preflight.js —— 开窗前一次跑完

```powershell
node testharness/tools/preflight.js
```

依次跑 books / config / disk-cfg / channels / harness 五步，任何一步有风险就非零退出并点名
该修哪个。`harness` 是趋势项（脚手架收编进度），只报不挡。

从 B-70T6 起，`testharness/player/lib/harness.js` 的 `boot()` 会先用
`check-channels.js --script <当前脚本>` 自查：脚本断言了某个 `[XxxLog]` 通道却没在
`cfg: [...]` 里打开对应的门，直接抛错，不会浪费一次 90 秒起服。

## 提交前钩子 —— 每次 commit 先跑 preflight

```powershell
node testharness/tools/install-hooks.js   # 每个新 clone 跑一次
```

钩子本体在仓库里（`.githooks/pre-commit`，版本化、可 review），安装脚本只设
`core.hooksPath=.githooks`。装好之后每次 commit 自动跑五步自检，红就拒绝提交：

- 窗口开着时 `run/config/etim.cfg` 被测试改过 → disk-cfg 漂移，也会被拦；先停窗再提交。
- 确实要跳过一次：`git commit --no-verify`，并在提交正文写清为什么。

## verify-diff.js —— 判窗锚点对位

喂两窗的证据，输出机械差异单：规则名集合与计数、挂载行多重集、W1..W4 键集与取值、
`[done]` 字段、`[PIN]` 标志、`[cfg]` 行。

```powershell
# 基准窗 vs 本窗（tee 与 driver log 用逗号并列）
node testharness/tools/verify-diff.js --base b69-b69r20-b1.out `
    --new b69-b70t-r3-b1.out,b70t-r3-driver.log

# 相对上一窗：取 build-logs 里最新的 tee / driver log
node testharness/tools/verify-diff.js --base latest --new latest
```

- 退出码：`0` MATCH、`1` DIFF、`2` 用法/文件错。
- `[done]` 的 `run` 字段按设计逐窗不同，比较时忽略；其余字段逐项比。
- tee（`b69-<run>-b1.out`）只有服务端输出；driver 行（`[PIN]`/`[cfg]`/`[W*]`/`[done]`）
  由 harness 另写 `testharness/build-logs/<run>-driver.log`，两边一起喂才算完整。
- 自检：`node testharness/tools/selftest-verify-diff.js`（9 项，离线）。

### 模式二：`--mode=arms`（通道活口对位）

`[MountLog]` 只覆盖挂载面；其它批次窗口一行 `[MountLog]` 都没有，此时默认模式是「结构性零对零」，MATCH 属平凡成立（C-B70TJ-1 的由来）。arms 模式改为对位**确定性通道**的 `[Chan] token` 是否存在：

```powershell
node testharness/tools/verify-diff.js --mode=arms --base <旧窗.out> --new <新窗.out>
node testharness/tools/verify-diff.js --mode=arms --channels=BlockFaceLog,FarmLog --strict-counts ...
```

- 默认纳入：`BlockFaceLog / ItemLog / FarmLog / FoodR196Log / FoodLog / SparkLog / MountLog / TestLog / VesselLog`（`--channels=` 可覆盖）。
- 环境噪声通道（`AILog / SpawnLog / WorldGenSpawnLog / GelLog / PickupLog / OreLog / EquipLog / UndeadLog`）默认不参与，避免生物随机游走造成假 DIFF。
- 默认只比「存在性」；加 `--strict-counts` 才比条数。

## check-books.js —— 账本自检

普查卷头计数、卷内 `[面]` 行、总账表、账册条号、报告清单。

```powershell
node testharness/tools/check-books.js          # 摘要
node testharness/tools/check-books.js --list   # 全部发现
```

- 硬错（退出码 1）：`landed+pooled+unrecorded(+zero_port) ≠ total`、
  逐面段 `[面]` 行数 ≠ total、`【未立项】` 行数与卷头不符、账册 `### 条 N` 重号。
- 软错（仅提示）：总账表仍是旧快照、条号跳号、已落地行 `ETIM位` 为空、
  报告未被账册/sessions 引用。
- 口径：卷内「逐面」段（`## §2 逐面行` / `## 二、逐面行` / `## 一、逐面清单`）
  是唯一计数真值；其后的未立项清单 / 批次日志只作工作区与留痕，不参与计数。
  批次留痕行用 `[批]` 前缀，不得写成 `[面]`。
- `--root <dir>` 或 `BOOKS_ROOT` 可指向别的树（自检用）。
- 自检：`node testharness/tools/selftest-books.js`（4 项，离线）。

## check-harness.js —— 脚手架收编进度

统计 `testharness/player/` 下还有多少脚本自带 boot/stop/cmd/PIN/`[done]`，输出
`[HarnessLog] files=… onHarness=… offenders=…`；`--list` 逐份列。恒 exit 0，看趋势用。

## check-channels.js —— 判据通道活口巡检

**它防的假绿**：脚本断言了某行 `[XxxLog]`，但那行其实永远不会出现（通道被 cfg 门关着、
或通道早已改名）。B-70T4 一周内撞两次：driver log 从未写盘；cfg 复位后 `farmDebugLog=false`
让 22 条探针全空。

```powershell
node testharness/tools/check-channels.js                       # 摘要 + 结论
node testharness/tools/check-channels.js --list                # 逐通道：断言数/产出点/门/类别
node testharness/tools/check-channels.js --debt                # 债务明细：通道 × 脚本数
node testharness/tools/check-channels.js --script testharness/player/f11-b69-smoke.js   # 跑窗前自查
node testharness/tools/check-channels.js --update-baseline     # 债务下降后重写基线
node testharness/tools/check-channels.js --strict              # 历史脚本的缺口也算失败
```

- 门 = 日志行上方 8 行内 `if (ETIMConfig.<布尔键>)`；`[ExplosionLog]` 这种前缀收在
  `TAG` 常量里的也算产出点。
- 「关着」＝代码默认 false **或** 盘上 `run/config/etim.cfg` 为 false；默认 true 不算。
- 通道分三类（`--list` 的 `kind=`）：`product` 源码产出、`harness` 脚本自己
  `mark('[XxxLog] …')` 打的（AnvilLog / LootLog / SkLog）、`legacy` 只做反向检查且在
  `LEGACY_CHANNELS` 白名单里（目前只有 ExtraLog，附出处）。
- **债务基线** `channel-debt.json`：`DEBT` 数（老脚本断言了门控通道却没强制开门）
  只许降不许涨；涨了直接 `RISK` exit 1，降了提示 `--update-baseline`。
- 退出码：0 OK；1 有 `SILENT-OFF` / `STALE` / 债务超基线；2 用法错。
- 已上 harness 的脚本（`lib/harness.js`）必须自己强制它断言的门，否则算失败。
- 自检：`node testharness/tools/selftest-channels.js`（6 项，离线）。

## check-config.js —— ETIMConfig 结构化自检 + 盘上漂移

```powershell
node testharness/tools/check-config.js                        # 字段/注册一一对应
node testharness/tools/check-config.js --list                 # 附 config_only 与分类计数
node testharness/tools/check-config.js --file run/config/etim.cfg   # 盘上基线 vs 代码默认
```

- 硬错（退出码 1）：字段与 `init()` 注册不一一对应、取数函数与类型不符、
  注册默认值与字段初值不等、默认值越出 `[min,max]`、同键重复注册。
- `--file`（退出码 2 = DRIFT）：`run/config/etim.cfg` 与代码默认比较，
  列出 `drift`（值不同）、`stale`（文件里有、代码里已删的旧键）、
  `missing`（代码新增、文件里还没有，首启会由 Forge 补写，仅提示）。
- 为什么需要：Forge **从不改写已存在的条目**，判窗脚本又习惯「读快照→改→跑完写回快照」，
  印错的旧值会被一代代原样还原。改过 cfg 或收批前跑一次 `--file`，`drift=0 stale=0` 才算基线干净。

## 纯逻辑单测 —— `gradlew test`

把判定树、刷怪门这类「纯函数」从服务端搬进 JVM 内测，反馈从起服的 ~90 秒降到 ~6 秒。

```powershell
$env:JAVA_HOME='D:\OpenCodeWorkspace\Easy Times In Minecraft\jdk\zulu25.38.107-ca-jdk25.0.5-win_x64'
.\gradlew.bat test --console=plain
```

- 用例在 `src/test/java/`；首个样板 `world/MountRulesTest.java` 直接调
  `ETIMMountRules.decide(state, face, mounted, trapdoorLower, upSolid)`，
- B-70T9 起还覆盖 `mob/SpawnGatesTest.java`（43 例，刷怪门决策表）与
  `hunger/FoodGatesTest.java`（27 例，饥饿循环 accrual/消耗/饿伤/回血四支）；
  三者以及 `crafting/CraftingGatesTest.java`（18 例：周期曲线、品质 ×2 与经验成本、min/max 预算选档）与 `furnace/FurnaceHeatTest.java`（11 例：需求热、燃料热、沙的三分支）；合计 131 例，`gradlew test` 约 4 秒。
  世界依赖只通过 `upSolid` 这个 lambda 注入。
- 1.12 的方块常量必须先在测试里注册：`@BeforeAll static void bootstrap() { Bootstrap.register(); }`，
  否则报 `Accessed Blocks before Bootstrap!`。
- JUnit 5 已由 `enable_junit_testing`（`gradle.properties:16 = true`）接好，无需另加依赖。
- 这些测试**不替代**判窗：起服窗仍负责真实物品路径、日志通道与命令面。

> 2026-11-26（B-70TJ）：新增 `FallTest`（7 例，R196 摔落公式：安全高度 2.5、伤害翻倍、跳跃加成先减后乘）、`CushioningTest`（6 例，17 项垫层表 + 雪层 `0.2×depth` + 合成规则）、`BlightSeatTest`（6 例，`isBlightSeat` 任意 BlockCrops 且死块排除 + `matureYield` 2/3 与 25% 分布）。合计 **150 例**（原 131）。

## 判窗驱动模板检查 —— `check-driver.js`

```powershell
node testharness/tools/check-driver.js --list
node testharness/tools/check-driver.js --script f13-b70t9-smoke.js
```

固定四条教训（B-70T8/B-70T9 共 10 条 B 级全部是这四类）：

- **R1 boot-missing**：上 harness 的脚本必须调 `h.boot(...)`；
- **R2 mark-after-use**：`mark()` 数量不得少于 `waitRow()`，且首个 `mark` 必须在首个 `waitRow` 之前；
- **R3 player-missing**：`/etest hungerstate|hungerpools` 从控制台发时必须带玩家（`${A}` / `botName` / 字面名）；
- **R4 gamerule-missing**：断言回血类行时必须出现 `naturalRegeneration`（不前置则每 tick 清零）。

老脚本的 R2/R4 只计 `debt` 不计失败；R3 对所有脚本硬判。已接入 `preflight.js` 第 6 步，
`selftest-driver.js` 用 5 个 fixture 守住检查器本身。另：`lib/harness.js` 的 `boot()` 成功后
会自动 `stampPin()`（`h.pinStamped`），窗口不会再出现 `pin:false`。

## 判窗脚本索引 —— `index-scripts.js` / `check-scripts.js`

```powershell
node testharness/tools/index-scripts.js          # 重写 testharness/player/INDEX.md
node testharness/tools/check-scripts.js --list   # 只读巡检
```

`INDEX.md` 每个脚本一行：批次、行数、引用的 `[XxxLog]` 通道、是否已上 `lib/harness.js`、头部说明首行。
文件末尾的 `fingerprint` 是全部脚本的指纹，`check-scripts.js` 比对不上就判 **FAIL**（exit 1），
已接入 `preflight.js` 第 7 步——改了脚本忘了重建索引，提交会被拦。

巡检项（只报不拦）：S1 无头部说明、S3 无日志通道引用、S4 文件名不含批次、`_` 前缀的临时脚本计数。
`master` 上现存 450 份：136 份带批次、3 份上 harness、51 份是 `_` 临时脚本。

## CI 自检闸 —— `check-version.js` / `ci.yml` / `deploy.yml`

```powershell
node testharness/tools/check-version.js --tag 1.0.0   # tag 与 mod_version 对位
```

`[VersionLog] tag=… mod_version=… tagOk=… match=…` → `verdict=PASS|FAIL`；exit 0 通过、1 不符、2 缺参数。

`deploy.yml` 只在 `x.y.z` tag 上触发，但先跑 `verify` job：版本对位 → `preflight.js` 七步 → `gradlew test`（131 例）→ `gradlew build`；
`publish` job 用 `needs: verify` 串在后面，任何一步红都不会发版。

`ci.yml` 在每次 push 到 `master`（以及 PR、手动触发）跑同一套：preflight → test → build。

**不要再把 `org.gradle.java.home` 写进 `gradle.properties`**：那是机器相关的绝对路径，Linux runner 上一启动就失败。
本地构建照 `AGENTS.md` 约束 0 设 `JAVA_HOME` 即可；要图省事，写进仓库外的 `%USERPROFILE%\.gradle\gradle.properties`。

## 封批一条命令 —— `close-batch.js`

```powershell
node testharness/tools/close-batch.js --dry-run \
  --batch B-71 --scope "灌木（census F :128）" \
  --verdict testharness/reports/b71-verify-verdict.md \
  --receipt testharness/reports/b71-verify-receipt.md \
  --land "F:BlockBush.java:1-223=world/ETIMBlockBush.java（B-71）"
```

封批时手工六步里可机械化的五步一次做完：**翻 census 行并改卷头计数 → 账册新条目（自动接号）→ sessions 段 → 重建 `player/INDEX.md` → 跑 preflight**。
不自动 commit：结尾打印「只 add 本批文件」的提示，按项目规矩手工提交。

硬门（任一不满足就不写盘，exit 1）：
- verdict 文件必须存在且含 `PASS` 与 `A=0`；
- 账册里不能已有该批次条目（防重号 / 重复收口）；
- 每个 `--land VOL:KEY=ETIM位` 的 KEY 必须在对应卷里找到且状态为【未立项】；
- 翻面数不能超过 `census_unrecorded`（防计数变负）。

`--dry-run` 只打印计划与实际会写入的条目正文；写完 preflight 仍红则 exit 2（文件已落，按提示修）。

## 收口一致性 —— `check-closeout.js`

`preflight` 第 8 步。检查**最新一条账册**与 git / sessions 是否对得上；它抓的是工具和翻面对位都抓不到的那类错：

```powershell
node testharness/tools/check-closeout.js
node testharness/tools/check-closeout.js --root <books> --repo <mod-repo>   # 自检/别树
```

| 规则 | 抓什么 | 由来 |
| --- | --- | --- |
| R1 stale-pending | 非最新条仍写「待提交」 | 条 414 忘改「已推送」 |
| R2 dead-hash | 最新条引用的 7 位哈希不在 `git log` | 收口时手抄/改写 hash |
| R3 missing-sessions | 最新条批次在 `sessions.md` 无 `## <批次>` 段 | 收口只写账册 |
| R4 push-state | 写「已推送」但 origin 仍有提交，或写的欠数与实际不符 | 推送后回头补写 |

退出码 0 干净 / 1 有风险 / 2 账本树或仓库缺失（CI 上自动 SKIP）。
自检：`node testharness/tools/selftest-closeout.js`（5 例，建临时账本树 + 临时 git 仓库，含裸 origin）。

## 账本↔源码反向核对 —— check-faces.js

census 六卷的「逐面」段里，`状态:【已落地】` 的面必须能在今天的代码里找到
对应位置（B-70TH 起入 preflight 第 9 步）。工具只读，不猜语义：

| 规则 | 检查 | 失败后果 |
| --- | --- | --- |
| F1 | `ETIM位` 里的 `<Name>.java` 在 ETIM `src/main/java` 或 R196 反编译树里存在 | 文件改名/删除后账本仍指旧名 |
| F2 | 行号区间落在文件长度内（`start ≤ end ≤ lines`） | 重构后行号漂移 |
| F3 | 文件里确有 `class/interface/enum <Name>` | 类名对不上（理论兜底） |

- R196 树（`mite-src/decompile/src`）用于「间接等价（无产品改码）」类条目，
  命中算 `r196=N` 计数，不算失败。
- `noPointer` 是 INFO：老批次里用散文描述对位、且抽不出指针的已落地面。
  这类行必须显式标注 `【parity】`（vanilla 行为原样保留，无 ETIM 代码）或
  `【zero-port】`（R196 机制在 1.12 无载体/无对应物），二者分别计入
  `parity=N` / `zeroPort=N`，不算缺口（B-70TL 起）。
- 默认从 `testharness/tools/` 往上四层找工作区；`--root` / `--repo` / `--r196`
  或环境变量 `FACE_BOOKS_ROOT` / `FACE_REPO` / `FACE_R196` 可指别处。
- 缺 `playground/audit/census`（CI 只克隆 mod 仓库）时打 `[FaceLog] SKIP` 并 exit 0。

```
node testharness/tools/check-faces.js          # 全卷，exit 0/1/2
node testharness/tools/check-faces.js --list   # 逐条打印 F1/F2/F3 与 noPointer
node testharness/tools/check-faces.js --vol C  # 单卷
node testharness/tools/selftest-faces.js       # 7 例自检（含 F3、R196 引用、parity/zero-port 标记）
```

## 批次状态机 —— batch-status.js

一个批次的状态散在五处（census 翻面、verdict 正本、判窗回执、账册条、sessions 段）再加 git 提交与推送；本工具把它们拼成一份只读视图。

```powershell
node testharness/tools/batch-status.js B-70TH     # 单批详情
node testharness/tools/batch-status.js --latest   # 账册最新一条
node testharness/tools/batch-status.js --all      # 每批一行，末行给 withRisk
```

| 判定 | 含义 |
| --- | --- |
| 缺正本 | 产品批（census 有该批翻面）缺 `<slug>-verify-verdict.md`；工装批记 n/a |
| verdict 非 PASS | 取文件里**第一条**「状态/终判/判决/判定/结论」宣告行；无宣告行时退到最后一个 `"pass":` 值 |
| 账册无该批次条 | 账册里没有 `### 条 N · …B-xx…` |
| 哈希不在 git | 收口行引用的短哈希 `git cat-file -e` 失败 |
| 待提交 | 收口行仍是「待提交」 |
| 推送态不符 | 收口行写「已推送」但该哈希不在 origin/master；或反之 |
| sessions 缺段 | `sessions.md` 无 `## <批次>` |

退出码：0 无风险 / 1 有风险 / 2 找不到该批次。`BATCH_ROOT`（工作区根）与 `BATCH_REPO`（mod 仓库）可指别处。

> 2026-11-26 首跑修掉 6 条真漂移：B-30/B-31 缺 sessions 段（已补记），B-68/B-70TA/B-70TB/B-70TC 的收口行写「未推送」而哈希早随后续批次进了 origin（已改写为「后续批次推送时一并上去」）。

## 剩余面就绪度 —— face-readiness.js

census 里还剩 200 多面没落地，但「能不能马上开工」差别很大：有的载体类已经在，只差行为；
有的连类都没有；有的 R196 原文本身就缺。这个工具把三者分开，并按载体簇给出批次建议。

```
node testharness/tools/face-readiness.js          # 重建 playground/audit/census/剩余-就绪度.md
node testharness/tools/face-readiness.js --check  # 只比对，账本变了没重建 → exit 1
node testharness/tools/selftest-readiness.js      # 2/2：四档分类 + stale 检出
```

四档状态（逐面段 `状态:【未立项】`，§3 镜像自动跳过）：

| 状态 | 判据 | 含义 |
| --- | --- | --- |
| `WIRE` | 存在 `ETIM<X>` / `ETIMBlock<X>` / `ETIMItem<X>` / `ETIMEntity<X>` / `ETIMWorldGen<X>` / `Mixin<X>` | 载体已在，只差行为或接线 |
| `CITE` | 只在别的类注释里被引用（区间重叠） | 可考但需先确认载体归属 |
| `NEW` | 都没有 | 要新建类 |
| `NO-SOURCE` | R196 原文缺失 | 先补原文，不能开工 |

依赖面按引用文件名推断：`BIOME`（群系/装饰）、`SPAWN`（刷怪）、`GUI`（容器/界面）、`CORE`（玩家/生物/物品栈）。
生成物 `playground/audit/census/剩余-就绪度.md` 不要手改；preflight 第 10 步用 `--check` 拦陈旧。
`READY_BOOKS_ROOT` / `READY_REPO` / `READY_R196` 可指向别树（自检就用这个）。

## 批次工单 —— plan-batches.js

就绪度表回答「哪些面能开工」，工单表回答「按什么顺序、一次做几个」。它把剩余面切成
上限 N 面的批次，并给每批标出要读的 R196 文件与前置依赖（例如 E 卷群系面要等群系装饰表）。

```
node testharness/tools/plan-batches.js                    # 重建 playground/audit/census/批次工单.md
node testharness/tools/plan-batches.js --check            # 只比对，陈旧 exit 1
node testharness/tools/plan-batches.js --start B-71 --max 8
node testharness/tools/selftest-plan.js                   # 3/3：均分切块 / BIOME 阻断 / stale 检出
```

切分口径：WIRE 按载体簇、CITE 按被引文件、NEW 按卷；簇超过 `--max` 时**均分**（17 面 / 8 → 6/6/5，不留单面尾巴）。
顺序：卷 B→C→E→F，同卷内 WIRE 优先、簇大的在前。批次号从 `--start` 起顺序编号，只作建议，实际开工时可在账册改号。
生成物 `playground/audit/census/批次工单.md` 不要手改；preflight 第 11 步用 `--check` 拦陈旧。
`PLAN_BOOKS_ROOT` 可指向别树（自检就用这个）。
