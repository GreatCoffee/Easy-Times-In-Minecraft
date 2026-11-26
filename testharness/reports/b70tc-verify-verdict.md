# W-B70TC 判窗正本：老脚本可重跑分级 + 三份迁 harness

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-26 21:11–21:15（单轮三窗）
- 判据源：`testharness/player/f11-b66-smoke.js`、`f11-b64-smoke.js`、`f11-b65-smoke.js`（迁移后版本）
- 终判：**PASS**（A=0 / B=0 / C=4）

## §0 钉值

- `f7-wb-lib.js:35` = `b70t9-build2`（产品 jar 未重建）
- release 1,568,258 B `DD30A158694A9293CE471A40C5E14655FB6E306ABDFC495FA404DF990AAD87F7`
- dev 1,539,631 / sources 1,369,238；MK 114/282/564 + 115/10
- jar mtime `2026-11-26T12:08:00.7523306Z`（三窗起收同一，0 rebuild）
- HEAD `87adcc5`（窗内 0 提交）；cfg 56,005 B `C69FC496…AEC257`、props 939 B `6784C3ED…2F1EB9` 起收同

## §1 工具面

| 工具 | 结果 |
| --- | --- |
| `check-driver.js` | `files=450 onHarness=6 offenders=0 debt=0 byRule={} verdict OK`（onHarness 3→6，debt 9→0） |
| `selftest-driver.js` | 5/5 PASS（good / no-boot / wait-first / no-player / regen-no-rule） |

## §2 三窗结果

| 窗 | 脚本 | 结果 | 证据 |
| --- | --- | --- | --- |
| r1 | `f11-b66-smoke.js` | `w1..w6` 全 true、`pass:true bad:0`、exit 0 | `b66-b70tc-r1-b1.out`（964,837 B） |
| r2 | `f11-b64-smoke.js` | 同上 | `b64-b70tc-r2-b1.out`（917,778 B） |
| r3 | `f11-b65-smoke.js` | 同上 | `b65-b70tc-r3-b1.out`（1,021,666 B） |

## §3 锚点（每窗一条 W1 主判据 + 一条尾判据）

- b66：`:5538` `blockstack stone=4 dirt=4 anvil=1 cauldron=4 wool=4 four=199 one=23`；`:5913`/`:5961` 落伤 15.000 / 6.600；`:6005` dropbox 落点；`:6104` ice `acid=true douse=true`、`:6135` snow_layer `dissolve=true`
- b64：`:5509` `stack stick=32 flint=16 reeds=16 … cauldron=4`；`:5650`/`:5651` meltdev；`:5950`/`:5951` vineplace 与 placed=stone
- b65：`:5663` bowlgive；`:6013`/`:6057` coin xp；`:6119`/`:6120` applegold cure；`:6363` firecook；`:6456`/`:6457` douse 与 vesseldouse

## §4 分级

- **A（真缺陷）**：无。
- **B（判据/工装）**：无——三窗无 FAIL，不存在「迁移引入 vs 当年断言过时」的归因分歧。
- **C（可接受，4 条）**：
  - C-B70TC-1 每窗 `[done]` 前多一条 `[stop] {"exitCode":0}`（`h.stop()` 与 `finish()` 各打一次），带 `exited:true` 的为权威面。
  - C-B70TC-2 世界名三段前缀 `w-b66-b70tc-r1-v1`。
  - C-B70TC-3 计数浮动：b66 `four=199 one=23`（历史 205/17）、b64 `etim16=55`（历史 54），判据为阈值/区间，不涉断言语义。
  - C-B70TC-4 b64 W2 为概率臂（`chance=0.0019 × 200`），本窗 snow 66/200、ice 55/200 落区间内。

## §5 终判

`PASS`（A=0 / B=0 / C=4）。迁移未改判臂：三窗输出与迁移前同义；`check-driver` 的 `onHarness` 3→6、`debt` 9→0 证明台账与工具已跟上。
