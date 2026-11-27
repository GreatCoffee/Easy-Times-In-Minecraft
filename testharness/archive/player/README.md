# 归档脚本（不可执行，仅供追溯）

这里是从 `testharness/player/` 迁出的历史窗口脚本，共 434 份（B-70UC 归档）。

它们**不能直接重跑**，原因归结为三类：

- **frozen-pin**：脚本里写死了当年的 jar 字节数（`jarBytes:`），当前 jar 尺寸已变，PIN 校验必然失败。
- **own-scaffold**：自带一套 `startBoot`/`stopBoot`/`cmd`/`mark` 旧脚手架，早于 `lib/harness.js`，与现行 cfg 段名和 `[done]` 契约不兼容。
- **通道已退役**：断言的 `[XxxLog]` 通道已改名或并入其它通道（如 `[UndeadLog]` 并入 `[SpawnLog]`/`[MobLog]`）。

保留它们的价值只有一个：**追溯**。想核「某一批当时到底怎么验的」，来这里 grep 即可；报告里的 `testharness/player/xxx.js` 引用也由 `check-reports` 的路径回退解析到这里。

要复活某份脚本的正确做法：按 `testharness/player/f11-b69-smoke.js` 的结构重写成 harness 版（`H.create` + `h.boot/join/stop/finish`），放进 `testharness/player/`，再把判臂迁过去——不要在这里直接改。

归档目录不参与任何巡检：`index-scripts` / `check-scripts` / `check-harness` / `check-driver` / `regression-plan` / `check-channels` 只扫 `testharness/player/`。
