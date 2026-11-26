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
node testharness/tools/check-channels.js --list                # 逐通道：断言数/产出点/门
node testharness/tools/check-channels.js --script testharness/player/f11-b69-smoke.js   # 跑窗前自查
node testharness/tools/check-channels.js --strict              # 历史脚本的缺口也算失败
```

- 门 = 日志行上方 8 行内 `if (ETIMConfig.<布尔键>)`；`[ExplosionLog]` 这种前缀收在
  `TAG` 常量里的也算产出点。
- 「关着」＝代码默认 false **或** 盘上 `run/config/etim.cfg` 为 false；默认 true 不算。
- 退出码：0 OK；1 有 `SILENT-OFF` / `STALE`（`--script` 模式只看这一份）；2 用法错。
- 已上 harness 的脚本（`lib/harness.js`）必须自己强制它断言的门，否则算失败；
  老脚本的同类缺口只计入 `DEBT` 趋势，`--strict` 才计失败。
- 自检：`node testharness/tools/selftest-channels.js`（4 项，离线）。

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
