# B-70T4 判窗正本：挂载判定纯函数化 + 32 例 JUnit

- 执行会话：会话七（ETIM 验证窗执行）；落码与收口：主会话
- 判窗时段：2026-11-26 18:41–18:58（r1 工装阻断 → r2 PASS）
- 判据源：`git-workspace/etim/testharness/player/f11-b69-smoke.js`（cfg 四项强制）
- 单测源：`git-workspace/etim/src/test/java/io/github/etim/etim/world/MountRulesTest.java`
- 终判：**PASS**（A=0 / B=2 / C=0）

## §0 钉值

- `f7-wb-lib.js:35` = `b70t4-build1`
- release 1,557,975 B `B40708E176F0B857DCD86D4E538B80F1F89833F3DE56FA1DAB41FA8B4BF3C9C3`
- dev 1,529,468 B `39BDCAD037159CC7C4223F0FEB405F777A01020A7E048093ACD91DECF595BC2B`
- sources 1,365,898 B `0C1B19665F614BB580D1CE4462161FE5E4D166B50894C5B6AFCD1EE911742228`
- MK：classes 114 / entries 282 / dual 564；manifest mixins 115 / client 10
- jar mtime `2026-11-26T10:39:28.396Z`（r1/r2 窗内 0 rebuild）
- HEAD `63dd40f`（窗内未动）
- 单测：`tests=32 fail=0 errors=0 time=2.196s`（`gradlew test`，JDK 8 toolchain）

## §1 等价性

| 面 | 证据 |
| --- | --- |
| 判据树 | r2 `[done]` 全 true，`bad=0`；锚点 7 条（`:3732` thin-snow reject、`:3739` sign-face allow、`:3742` shape-defer allow、`:3747`/`:3750` trapdoor-vertical reject、`:3718`/`:3491` tilled-field allow） |
| 对位 | `verify-diff`：`rules base=25 new=25 mounts base=41 new=41 mayplace=22 diffs=0`，`verdict MATCH` |
| 多重集 | 规则行 44/44 逐名差值 0；`mayplace` 22/22；`[FarmLog] drought probe` 22/22 |
| 源码 | `rejectsPlacement` 只留「取 supportPos/state → decide → 记日志 → 返回 reject」；被替换的唯一世界调用同参同义，臂序与规则名未变 |

## §2 工装阻断（B 级，均当轮闭环）

- **C-B70T4-1**：`testharness/player/lib/harness.js` 缺 `require('path')`（:135 用 `path.join` 建 `<run>-driver.log`），任何用该 harness 的脚本起服前即崩。该文件通道自 B-70T2 引入起从未真正写盘；B-70T r1–r3 与 B-70T2 三次判窗都从 stdout/tee 取数，故未暴露。修法：`harness.js:23` 补 `const path = require('path');`。
- **C-B70T4-2**：cfg 基线复位后 `farmDebugLog=false`，`[FarmLog] drought probe` 响应 0 条，W1/W2 直接 null。根因是驱动只强制三项、靠磁盘遗留 true 才亮。修法：`f11-b69-smoke.js:30` cfg 加 `'farm:farmDebugLog'`；**长期保留**——判窗脚本必须自行强制它断言的每一条日志通道，不得继承磁盘基线。

## §3 终判

`PASS`（A=0 / B=2 / C=0）。产品钉值 `b70t4-build1`；判窗 r2 全绿；`verify-diff MATCH`。
