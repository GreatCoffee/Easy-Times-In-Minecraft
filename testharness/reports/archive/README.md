# 报告归档（历史留存）

这里的报告**不再被账册 / sessions / census / 裁决回执引用**，但保留下来供考古：

- 早期批次（W 系列、B-3..B-13、metal-*、mobs-ai*）的 `*-verdict.md`；
- 一次性复核（`*-retest.md`、`*-checklist.md`、`*-prep.md`）；
- 互相引用链断裂后只剩自指的批次裁决。

## 约定

- **归档不等于作废**：这些文件记录的是当年判定时的判值与证据，复盘争议时仍可查。
- **不进 `INDEX.md`**：`check-reports` 只索引 `reports/` 顶层；`archive/` 下的文件不计入 `files= / orphans= / deadDoc=`，只在汇总行计 `archived=N`。
- **不改写历史**：归档文件内容一律不动（含当年的行号与哈希）。
- **复活**：若某个特性重新回到主线、需要再引用其裁决，用 `git mv` 移回 `reports/` 顶层，再跑 `check-reports --write-index`。

## 落档批

- B-70UI（2026-11-27）：81 份无引用报告从 `reports/` 顶层移入本目录（68 份首轮 + 13 份因引用链断裂而新成孤儿）。
