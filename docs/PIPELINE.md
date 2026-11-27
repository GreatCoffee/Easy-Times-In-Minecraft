# 一条判据的生命线

> 这份文档回答一个问题：**从 census 上的一个未立项面，到它被判定「已落地」并进仓库**，中间要经过哪些人、哪些命令、哪些门。
> 每个命令都是真的、现在能跑的；工具清单与 preflight 步骤由 `testharness/tools/check-pipeline-doc.js` 校验，写漏了会红。

## 0. 角色与硬约束

| 角色 | 会话 | 能做什么 | 不能做什么 |
| --- | --- | --- | --- |
| 主会话 | 本会话 | 立项、落码、钉值、封批、commit、推送 | **不代跑判窗**（B-69 起生效）；不动客户端 |
| 会话六 | 判值/对照 | 读 R196 一手，写对照报告 | 不改产品码 |
| 会话五 | 终审 | 逐项核产品与判据，签字放行/退回 | 不改产品码、不跑窗 |
| 会话七 | 判窗 | 起服、跑窗口、判 PASS/FAIL、写回执 | 不改产品码（可改工装并单列 C 项） |
| 用户 | — | GUI/截图/手感面；裁定 D 位；批准推送 | — |

硬约束（违反即 C 级登记）：

- 判定以日志为据，判据行格式 `[XxxLog] key=value … [server]`；浮点用 `Locale.ROOT`。
- 客户端/渲染/音效面由用户目视，AI 不操控鼠标键盘、不抢焦点。
- 单次等待 ≤ 180 秒；构建与起服一律后台起、每 30 秒巡检。
- 不保留向后兼容、不留 fallback；玩家可感知的数值必须可配置。

## 1. 一个批次的七个阶段

| # | 阶段 | 谁 | 命令 | 产物 | 门 |
| --- | --- | --- | --- | --- | --- |
| 1 | 选面 | 主 | `face-readiness.js --check`、`plan-batches.js --check` | `剩余-就绪度.md`、`批次工单.md` | preflight `ready`/`plan` |
| 2 | 开箱 | 主 | `kickoff.js B-71` | `playground/audit/kickoff/B-71-{0..4}-*.md` | `kickoff --check` |
| 3 | 判值 | 六 | `extract-values.js --batch B-71` | `判值表-<卷>.md` 对应面 | preflight `values` |
| 4 | 对照/终审 | 六/五 | （交付报告 md） | `*-对照报告.md`、`*-final-audit*.md` | verdict 必须 `PASS` 且 `A=0` |
| 5 | 落码 + 单测 | 主 | `gradlew test`（**不带 `-P`**） | 200+ 例全绿 | preflight `gradle` |
| 6 | 钉值 | 主 | `gradlew build` → 改 `testharness/player/f7-wb-lib.js:35` 的 `const PIN` | 新 `PIN.build` + sha/size/mk | `[PIN] … ok=true` |
| 7 | 判窗 → 封批 | 七 → 主 | `RUN=b71r1 node testharness/player/f11-*.js`；`close-batch.js --batch …` | 回执 + 正本 | `check-closeout`、`preflight` |

## 2. 阶段详解

### 2.1 选面：从 253 个未立项里挑一批

- `node testharness/tools/face-readiness.js --check` 判四档：`WIRE`（已有同名载体，最容易做）/ `CITE`（只有注释可考）/ `NEW` / `NO-SOURCE`，并按载体簇聚合。
- `node testharness/tools/plan-batches.js --check` 把面排成批次（`--max` 默认 8，簇内均分；E 卷群系簇标 `BLOCKED`）。
- 两份产物都是生成物：`playground/audit/census/剩余-就绪度.md`、`playground/audit/census/批次工单.md`，不手改。

### 2.2 开箱：五份工单一次生成

`node testharness/tools/kickoff.js B-71` 读批次工单 + 判值表 + 当前 PIN，写五份：

- `-0-立项`（主会话：面集、判值摘要、落码清单）
- `-1-摸底`、`-2-对照`（会话六）
- `-3-终审`（会话五）
- `-4-判窗`（会话七：命令、验收、纪律行）

每份都带三要素头（发出者/接受者/生成时间）与围栏格式；`--check` 在工单或 PIN 变化后报 stale。

### 2.3 判值：不重读 473 行

`node testharness/tools/extract-values.js --face C:137` 或 `--batch B-71`，抽五类带行号：常量、属性、门（if 条件里的数字/环境词）、效果、掉落（`return -1` 死端跳过）。`--all --check` 校验六卷全量判值表是否过期（preflight `values`）。

### 2.4 落码与单测

- 纯逻辑先抽成静态函数（如 `ETIMMountRules.decide`、`FoodGates.tick`、`SpawnGates.decide`），再写 `src/test/java/...` 单测。当前 13 个测试类、196 例，`gradlew test` 约 6 秒。
- **`gradlew test` 不要带 `-Penable_junit_testing`**：无值会覆盖 `gradle.properties` 的 `true`，JUnit 整块掉出 classpath（100 个「程序包不存在」错误）。
- 大 Java 文件（`CommandDevTest.java` 这类 3,000+ 行）**不要用 edit 工具**做多次插入——会重复插入；用 node 按行索引 splice，改完立刻数出现次数。

### 2.5 钉值（PIN）

```powershell
$env:JAVA_HOME='D:\OpenCodeWorkspace\Easy Times In Minecraft\jdk\zulu25.38.107-ca-jdk25.0.5-win_x64'
.\gradlew.bat build --console=plain   # 后台起，Tee 到 build-logs/
```

然后改 `testharness/player/f7-wb-lib.js:35` 的 **整行** `const PIN = { build: 'bNN-buildM', releaseSize: …, releaseSha: …, devSha: …, sourcesSha: … };`，并核对 `require('./testharness/player/f7-wb-lib.js').mkCounts().ok === true`。

窗口里的 `[PIN] sha=… shaOk=true sizeOk=true mkOk=true ok=true` 就是「这轮跑的确实是这个 jar」的凭据。

### 2.6 判窗（会话七执行）

- 窗口脚本统一用 `testharness/player/lib/harness.js` 的 `H.create({ run, world, bot, cfg, stage })`；起服前自动强制 cfg 并回读，`[cfg]` 行留证；`h.finish(res)` 输出 `[done] {… pass, bad}` 并以 0/2 退出。
- 等 `[XxxLog]` 行的写法：先 `mark()` 再发命令，再 `waitRow(RE, from, ms)`；不要先发命令后 mark（行可能已经过去）。
- 判窗后跑对位：`node testharness/tools/verify-diff.js --base <旧 tee> --new <新 tee>`；窗口里没有 `[MountLog]` 这类计数时用 `--mode=arms`（按「通道 × token」存在性对位）；纯重构批再加一次 `--mode=values`（按「通道 × 字段」比值，`0.0250`≡`0.025`，`--tol` 可放宽）。
- 老脚本回归：`node testharness/tools/run-regression.js --list` / `--only f11-b69-smoke.js`（起真实服务端，**只能会话七跑**）。

### 2.7 封批

```powershell
node testharness/tools/close-batch.js --batch B-71 --scope "…" --verdict testharness/reports/b71-verify-verdict.md --receipt testharness/reports/b71-verify-receipt.md --land "C:137=…" --dry-run
```

- 硬门：正本必须 `PASS` 且 `A=0`、账册无同批次、`--land` 的键必须存在且当前是【未立项】、翻面数 ≤ `unrecorded`。
- 真跑后会翻 census 两处（§2 与 §3 镜像）、改头部计数、接账册号、写 `sessions.md` 段、重建 `player/INDEX.md`、跑一遍 preflight。**commit 仍要手打**。
- 收口行写「未推送」而不是「欠 N」——写具体数字会被 pre-commit 的 `check-closeout` R4 拒（提交前 ahead 比提交后少 1）。

新窗口脚本用 `gen-window.js --name fNN-bXX --batch B-XX --faces … --channels …` 生成骨架；骨架默认是红的，不会漏填。

## 3. 质量闸：`preflight.js` 的 27 步

`node testharness/tools/preflight.js` 是提交钩子（`.githooks/pre-commit`）跑的东西，任何一步红就拒绝提交。

| 步 | 工具 | 管什么 |
| --- | --- | --- |
| `gradle` | `gradlew test` | 编译主码 + 单测；XML 里有 failure/error 即失败；CI 用 `PREFLIGHT_SKIP_GRADLE=1` 跳过 |
| `pin` | `set-pin.js --check` | PIN 与磁盘 jar 是否一致 |
| `books` | `check-books.js` | 六卷三态算术、逐面段行数、账册条号唯一 |
| `config` | `check-config.js` | 字段↔注册一一对应、类型、默认值与范围 |
| `disk-cfg` | `check-config.js --file` | 磁盘 cfg 与代码默认是否漂移 |
| `channels` | `check-channels.js` | 通道是否还有产出点、脚本缺门是否静默 |
| `harness` | `check-harness.js` | 还有多少脚本自管起服（存量债计数） |
| `driver` | `check-driver.js` | 窗口脚本模板：遗留脚手架、mark/waitRow 顺序、缺 player、缺 gamerule、缺 require、cfg 段名 |
| `scripts` | `check-scripts.js` | `player/INDEX.md` 指纹是否陈旧 |
| `closeout` | `check-closeout.js` | 账册最新条：待提交、死哈希、缺 sessions 段、推送状态与实际不符 |
| `faces` | `check-faces.js` | 已落地面指针是否还能落到真实文件/行/类名 |
| `ready` | `face-readiness.js --check` | 剩余面就绪度文档是否过期 |
| `plan` | `plan-batches.js --check` | 批次工单是否过期 |
| `regression` | `regression-plan.js --check` | 回归矩阵是否过期；未登记缺口 / 失效豁免即失败 |
| `assets` | `check-assets.js` | 模型/贴图/blockstate/lang 一致性 |
| `archive` | `check-channels.js --check-archive` | 归档清单是否与磁盘一致 |
| `values` | `extract-values.js --all --check` | 六卷判值表是否过期 |
| `reports` | `check-reports.js` | 报告里的路径/哈希是否还能解析，索引是否齐全 |
| `coverage` | `check-coverage.js --check` | 已落地面是否都有通道；新 silent 面即失败 |
| `configdoc` | `gen-config-doc.js --check` | `docs/CONFIG.md` 是否与 `ETIMConfig.java` 一致；字段缺 javadoc 即失败 |
| `chandoc` | `gen-channel-doc.js --check` | `docs/CHANNELS.md` 是否过期 |
| `pipeline` | `check-pipeline-doc.js` | 本文件是否漏掉任何工具或 preflight 步 |
| `tools` | `selftest-all.js` | 所有 `selftest-*.js` 是否全绿 |
| `retention` | `retention.js --check` | `run/` 与 `build-logs/` 的体积棘轮（证据日志不动） |
| `assert` | `face-assert.js --check` | 面↔断言图是否过期 |
| `asserts` | `check-asserts.js` | 窗口正则是否还能在最新 tee 里命中；1.13 选择器与未知 `/etest` 子命令即失败 |
| `draft` | `gen-report.js --check-dir` | 对照报告草稿是否与账本/判值表一致（过期即失败） |

## 4. 目录地图

| 路径 | 是什么 |
| --- | --- |
| `src/main/java/io/github/etim/etim/` | 产品码（`world/` `mob/` `combat/` `hunger/` `crafting/` `furnace/` …） |
| `src/main/java/io/github/etim/etim/mixins/` | Mixin 注入口，方法名 `etim$<面>` |
| `src/test/java/io/github/etim/etim/` | 纯逻辑单测（196 例） |
| `testharness/player/` | 窗口脚本（只留 harness 版）+ `f7-wb-lib.js` + `fmlbot.js` + `lib/` |
| `testharness/tools/` | 29 个工具 + 25 个自检 + sidecar 清单（`no-log.json`、`regression-exempt.json`、`channel-archive.json` …） |
| `testharness/reports/` | 判窗回执、正本、`INDEX.md`、`REGRESSION.md`、`COVERAGE.md`、`archive/` |
| `testharness/build-logs/` | 每次构建/窗口的 tee（gitignore） |
| `playground/audit/census/` | 六卷普查 + 总账 + 就绪度 + 批次工单 + 判值表 |
| `playground/audit/账册/现行账.md` | 批次账本（唯一真值） |
| `playground/audit/kickoff/` | 开箱五件套 |
| `docs/` | `CONFIG.md`、`CHANNELS.md`、本文件（前两份是生成物） |

## 5. 判据纪律（写窗口前先读）

1. 每条结论都要能从日志里指到行：`testharness/build-logs/<run>.out:1234`。
2. 一行判据用 `key=value` 平铺，字段齐全（`block=` `face=` `result=` `pos=` …），方便正则与对位工具。
3. 概率类判据必须写清取样数与命中数，不能只说「出现了」。
4. 否定面也要有行（拒绝要有理由），否则无法区分「没触发」与「被吞掉」。
5. 通道开关键在 `ETIMConfig`，默认值要与 R196 一致；判窗必须显式强制并回读，不能依赖本机 cfg。
6. 客户端面（渲染/音效/HUD）不作判据，最多作辅证，由用户目视。

## 6. 十条踩过的坑

1. `gradlew test -Penable_junit_testing`（无值）→ JUnit 掉出 classpath。
2. Forge **不会改写已存在的 cfg 条目** → 旧机器的配置永远是旧值；窗口必须强制 + 回读（`[cfg]` 行），否则静默跑关态。
3. 删除脚本后必须**最后**重建 `player/INDEX.md`，否则 `check-scripts` 指纹不符。
4. 账本别写「origin 欠 N」；写「未推送」。
5. `edit` 工具对超大 Java 文件重复插入 → 用 node 按行 splice，改完数出现次数。
6. PowerShell 里 `node -e` 带反引号/双引号必被吞 → 写临时 `.js`。
7. PowerShell 控制台读 CJK 会乱码 → 用 node 写文件再用编辑器读。
8. `mark()` 必须早于触发命令，否则慢行会被漏掉；`waitRow` 只接单正则。
9. 1.12 选择器不认 `limit=`，用 `c=1`；`/xp 10L <player>` 不是 `/xp add`。
10. 世界名 `w-<批次>-<run>-v1` 三段；全新世界每次起服要重新铺台（`stage.fill`）。

## 7. 交接与自查

- 每天开工前：`node testharness/tools/preflight.js`（27 步绿才动码）。
- 看现状：`node testharness/tools/batch-status.js --all`（60 批，0 风险）、`check-books.js --list`、`regression-plan.js`、`face-readiness.js`。
- 看通道：`docs/CHANNELS.md`；看配置：`docs/CONFIG.md`；看回归：`testharness/reports/REGRESSION.md`；看覆盖：`testharness/reports/COVERAGE.md`。
- 装钩子：`node testharness/tools/install-hooks.js`；跳过钩子必须 `--no-verify` 并在提交正文写原因。
- 脚本清单：`node testharness/tools/index-scripts.js` 重建 `testharness/player/INDEX.md`（脚本、通道、PIN 分类与指纹）；改过 `player/` 里任何 `.js` 都要重建，且**先删后建**。
- 工具棘轮：`node testharness/tools/check-tool-selftests.js` —— 每个工具要么有 `selftest-<tool>.js`，要么在 `tool-manual.json` 里带理由登记（目前 5 个：`install-hooks`、`preflight`、`run-regression`、`close-batch`、它自己）。
- 版本：`check-version.js` 要求 tag 与 `mod_version` 一致；仓库不写 `org.gradle.java.home`（用环境变量或仓库外 gradle.properties）。
