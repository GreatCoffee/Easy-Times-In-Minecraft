# 判窗报告目录说明

> 机制说明，不是判据。索引见 `INDEX.md`（`node testharness/tools/check-reports.js --write-index` 生成）。

## 命名

| 后缀 | 含义 | 谁写 |
|---|---|---|
| `<slug>-verify-verdict.md` | 判窗正本：钉值、锚点、A/B/C 分级、终判 | 主会话 |
| `<slug>-verify-receipt.md` | 判窗回执：会话七逐轮执行记录 | 会话七 |
| `<slug>-final-audit*.md` | 终审核查回执（可多轮 r2/r3…） | 会话五 |
| 其他（如 `*-W41-verdict.md`） | B-40 之前的历史判窗，命名未统一 | 当时会话 |

## 引用关系

- 当前批次：账册（`playground/audit/账册/现行账.md`）与 `playground/sessions.md` 必须同时引用。
- `INDEX.md` 的「引用方」列显示 账册 / sessions / census / 其他报告；「无」= 目前没有出处引用，属历史留存层，不代表死档。
- 报告里引用的路径/提交由 `check-reports.js` 校验：路径按「精确 → 同后缀 → 同名」三级解析，旧名走 `testharness/tools/report-aliases.json`，按设计已不存在的产物记 `report-retired.json`。

## 什么时候加报告

- 产品批：`<slug>-verify-verdict.md` + 回执，两件都进账册与 sessions。
- 工装批：可以只有账册条目，不强制报告；若写了报告，必须被账册引用。

## 归档层（archive/）

- 无任何账册 / sessions / census / 回执引用的历史报告移到 `archive/`，内容不改写，不参与索引与死链校验（汇总行计 `archived=N`）。
- 判定口径：`check-reports` 的 `orphans`（引用数为 0）连续两轮收敛，直到 0；互相引用链断裂造成的次级孤儿也一并归档。
- 复活方式见 `archive/README.md`（`git mv` 回顶层 + `check-reports --write-index`）。
