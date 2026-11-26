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
