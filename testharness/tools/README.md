# testharness/tools —— 只读检查工具

三个脚本都不起服、不写产品码，随时可跑。

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
  `【未立项】` 行数与卷头不符、账册 `### 条 N` 重号。
- 软错（仅提示）：唯一 `[面]` 行数与 total 不等（各卷 §3 结构不同，重贴或独立行）、
  总账表仍是旧快照、条号跳号、已落地行 `ETIM位` 为空、报告未被账册/sessions 引用。
- `--root <dir>` 或 `BOOKS_ROOT` 可指向别的树（自检用）。
- 自检：`node testharness/tools/selftest-books.js`（4 项，离线）。

## check-harness.js —— 脚手架收编进度

统计 `testharness/player/` 下还有多少脚本自带 boot/stop/cmd/PIN/`[done]`，输出
`[HarnessLog] files=… onHarness=… offenders=…`；`--list` 逐份列。恒 exit 0，看趋势用。

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
  世界依赖只通过 `upSolid` 这个 lambda 注入。
- 1.12 的方块常量必须先在测试里注册：`@BeforeAll static void bootstrap() { Bootstrap.register(); }`，
  否则报 `Accessed Blocks before Bootstrap!`。
- JUnit 5 已由 `enable_junit_testing`（`gradle.properties:16 = true`）接好，无需另加依赖。
- 这些测试**不替代**判窗：起服窗仍负责真实物品路径、日志通道与命令面。


