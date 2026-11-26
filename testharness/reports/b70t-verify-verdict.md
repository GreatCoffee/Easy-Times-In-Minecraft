# W-B70T 判窗正本：判窗工装收编（工装批，无 census 面）

- 执行会话：会话七（ETIM 验证窗执行）；落码与汇总：主会话
- 判窗时段：2026-11-26 11:44–13:57（r1 → r2 → r3，三轮独立窗口）
- 判据源：`git-workspace/etim/testharness/player/f11-b69-smoke.js`（判臂未改，只换脚手架）
- 终判：**PASS**（A=0 / B=0 / C=6 + 流程自陈 C-B70T-0）

## §0 钉值

- `f7-wb-lib.js:35` = `b69-build9`（产品 jar 未动）
- release 1,556,495 B `37CE99E9AB717EA378E13F6D949C9954C94DD4F92EB7428EF1BC29C0ED209EE2`
- dev 1,528,052 B `623F339729544EFBADD65E058048218AF06792ECEA898A7C5C30746C0CF06036`
- sources 1,365,488 B `79CA55A2885784647C805F0EC128029450B4C320DDD5847AF43FDDF6575DAC46`
- MK 114 / 282 / 564 + 115 / 10；jar mtime `2026-11-22T13:30:11.035Z`（三轮窗内 0 rebuild）
- 提交链：`3418abe`（底座）→ `c7169ef`（C1–C3）→ `5d50574`（C4–C5）

## §1 判窗轨迹

| 轮次 | HEAD | 结果 | 要点 |
| --- | --- | --- | --- |
| r1 | `3418abe` | PASS | 锚点 8/8、规则名 25 与 r20 差异 0、W3 键 42 缺失 0；判臂区 `git diff` 零改动；C1–C3 |
| r2 | `c7169ef` | PASS | 三条 C 源码侧 + 运行侧双证：`finish(res)` 单形参、`waitRow` 单正则、cfg 缺键写入并回读；`[cfg] absent` 0；C4–C5 |
| r3 | `5d50574` | PASS | 回读改 section 内取证、收尾按缩进匹配；负向自检四组（跨段隔离、嵌套不早截、force 两次不重复）；C6 |

## §2 逐项锚点（r3，`testharness/build-logs/b69-b70t-r3-b1.out`）

- `:3735` `rule=trapdoor-thin-snow face=east … reject pos=10,129,6`
- `:3742` `rule=sign-face … standing_sign allow pos=13,129,9`
- `:3745` `rule=trapdoor-shape-defer … trapdoor allow pos=13,129,9`
- `:3750`/`:3753` `rule=trapdoor-vertical face=up|down … reject pos=18,130,4`
- `:3722` `rule=tilled-field … standing_sign allow pos=11,130,4`；`:3494` 同规则 torch allow
- 计数：`mayplace block=` 22、`[MountLog] rule=` 44；W3 键 42、W1/W2/W4 形状与 r20 逐键一致
- 终判行：`[done] {"run":"b70t-r3","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}`，exit 0

## §3 分级

- **A（真缺陷）**：无。
- **B（判据/工装）**：无。
- **C（潜在面，观察）**：
  - C-B70T-0（流程自陈）：主会话未获批开工 + 代跑验证窗；处置为保留代码、撤回自检结论、补独立窗口。
  - C-B70T-1 `finish(res, extra)` 的 extra 可覆盖 pass → 已修（去 extra）。
  - C-B70T-2 `waitRow` 数组入参「任一命中」→ 已修（只接单正则）。
  - C-B70T-3 磁盘缺键按默认放行（默认翻 false 会静默跑关态）→ 已修（写入 + 回读硬校验）。
  - C-B70T-4 回读为全文件搜 key，错段也能读绿 → 已修（section 内取证）。
  - C-B70T-5 section 收尾只看第一个 `}`，嵌套会早闭 → 已修（按缩进匹配）。
  - C-B70T-6 同 section 内同名嵌套键在前时 `setCfgEntry` 会先改嵌套行 → 接受（现 `etim.cfg` 无嵌套块；出现嵌套时按 C 级再修）。

## §4 终判

`PASS`（A=0 / B=0 / C=6）。产品侧零改动、零重建；工装底座 `testharness/player/lib/harness.js` + `testharness/tools/check-harness.js` 可作后续批次起点。
