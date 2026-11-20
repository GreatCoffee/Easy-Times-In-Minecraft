# W-B50 判窗正本（D 卷宽怪四向复测＋装备怪不定亡）

**判窗时间**：2026-11-21 00:30 → 00:35 CST（v1 / v2 / W6 三臂；服务端日志为 UTC，差值 +8h）
**执行方**：会话七（ETIM 验证窗执行）
**判决源**：工作树 `d442d5e`（B-50 产品改动未提交，窗内 0 提交）

## §0 钉值（实测，起收一致）

| 项 | 实测 | 钉值 | 判定 |
|---|---|---|---|
| jar | `build/libs/etim-1.0.0.jar` 1,215,661 B | 1,215,661 B | ✅ |
| SHA256 | `6A4B565BE6B31513F8E17D4C0BF0130304AB1643D908A04981EC434D95675E76` | 同 | ✅ |
| jar mtime | `2026-11-20T16:38:09Z`（三臂起收不变） | 窗内不变 | ✅ 0 rebuild |
| MK | refmap 101/242/484；manifest mixins 101 / client 10；`ok=true` | 101/242/484 + 101/10 | ✅ |
| HEAD | `d442d5e`；`origin/HEAD..HEAD` 欠 0 | `d442d5e` | ✅ |
| crash-reports | 24 → 24 | — | ✅ |
| port 25565 | 三臂停服后均 0 | 0 | ✅ |
| cfg SHA256 | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD` 起收同 | 起收同 | ✅ |
| props SHA256 | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` 起收同 | 起收同 | ✅ |
| props 值 | `level-name=w-b30v`、`allow-flight=false` 已还原 | 还原 | ✅ |

驱动临时注入（各 boot 内生效、停服还原）：`mobDebugLog=true`、`mobDespawnR196=true`（W6 臂反之）、`allow-flight=true`。

## §1 判读总表

| 窗 | 判据 | v1 | v2 | 判定 |
|---|---|---|---|---|
| W0 | PIN sha/size/MK/mixinFail=0；停服 `{exitCode:0,exited:true}` | PIN ok、mixinFail 0、stop 0/true | 同 | ✅ PASS |
| W1 开放中心 | `wide-probe placed=-49.50,120.00,240.50` 且无 `wide-retry` | placed 命中、retry=false | 同 | ✅ PASS |
| W2 东侧石 | `wide-retry cls=EntitySpider offset=-x` 且 `placed=-50.00,120.00,240.50` | offset=-x、placed 命中 | 同 | ✅ PASS |
| W3 两侧石 | `wide-gate reject cls=EntitySpider` 且 `placed=null` | 两条命中 | 同 | ✅ PASS |
| W4 装备探针 | `contained=true` 与 `contained=false` 各 ≥1 | rows=2（true+false） | 同 | ✅ PASS |
| W5 装备保持 | `wall=equipped ≥1` 且 `mob despawn kill = 0` | equipped=1、kills=0 | 同 | ✅ PASS |
| W6 旗关臂 | `wall=equipped = 0`；`equipped-probe ≥1`；kill 不判 | wall=0 / probe=1 / kills=0 | — | ✅ 负证据成立 |

`[done]` 原文：
- v1 `{"run":"v1","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`（EXIT=0）
- v2 `{"run":"v2","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`（EXIT=0）
- W6 `{"run":"w6","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`（EXIT=0）

## §2 判行锚（tee 全量流行号）

### v1 `testharness/build-logs/b50-v1.out`（906,669 B）
- `2362` `Done (5.507s)! For help, type "help" or "?"`
- `5775` `[SpawnLog] wide-probe placed=-49.50,120.00,240.50 at BlockPos{x=-50, y=120, z=240} [server]`
- `5782` `[SpawnLog] wide-retry cls=EntitySpider offset=-x at -50.00,120.00,240.50`
- `5783` `[SpawnLog] wide-probe placed=-50.00,120.00,240.50 at BlockPos{x=-50, y=120, z=240} [server]`
- `5790` `[SpawnLog] wide-gate reject cls=EntitySpider at -49.50,120.00,240.50`
- `5791` `[SpawnLog] wide-probe placed=null at BlockPos{x=-50, y=120, z=240} [server]`
- `5794` `[AILog] equipped-probe contained=true at BlockPos{x=-50, y=120, z=240} [server]`
- `5797` `[AILog] equipped-probe contained=false at BlockPos{x=-50, y=120, z=240} [server]`
- `5808/5809/5810` `[AILog] mob stats attackDamage=5.0 / followRange=32.0 / armor=0.0 entity=EntityZombie#2630`
- `5822` `[AILog] mob despawn pass-state c=200 distSq=3601 wall=equipped entity=EntityZombie#2630`
- `5823` `[AILog] mob despawn hold=equipped entity=EntityZombie#2630 [server]`
- `5852` `BUILD SUCCESSFUL in 52s`

### v2 `testharness/build-logs/b50-v2.out`（902,254 B）
- `2361` `Done (5.515s)!`
- `5740` wide-probe placed=-49.50,120.00,240.50（开放中心）
- `5747` `wide-retry cls=EntitySpider offset=-x`；`5748` placed=-50.00,120.00,240.50
- `5755` `wide-gate reject cls=EntitySpider`；`5756` placed=null
- `5759` contained=true；`5762` contained=false
- `5787` `mob despawn pass-state c=200 distSq=3601 wall=equipped entity=EntityZombie#2683`（紧随 `hold=equipped` 同行时刻 07:33:44）
- `5816` `BUILD SUCCESSFUL in 45s`

### W6 旗关 `testharness/build-logs/b50-w6.out`（877,446 B）
- `2361` `Done (5.321s)!`
- `5577` `[AILog] equipped-probe contained=true at BlockPos{x=-50, y=120, z=240}`（通道存活）
- 全档 `[AILog] mob despawn *` **0 条**（wall=0 / kill=0 / counter-meter 0）
- `5627` `BUILD SUCCESSFUL in 40s`

## §3 A-B-C 分级

**A 级（产品缺陷）**：无。
**B 级（判据不足）**：无。

**C 级（观察与覆盖）**

- **C-B50-1 W5 pass-state 频次低**：14 s 窗内仅 1 条 `pass-state … wall=equipped`（节流 2000 ms + 空闲计数每 pass 才推进），判据取 ≥1；同刻另有 1 条 `hold=equipped`（`DespawnRules.java:414-415`）作旁证，两轮一致。
- **C-B50-2 W5 封闭室几何窄**：`fill -61 119 179 -59 121 181 stone` 后只挖 `-60 120/121 180` 一列，僵尸召唤点 `x=-59.5` 跨越 x=-59 的实心格。实测该僵尸未出现 `src=inWall` 伤害行、活满 14 s（`#2630` 至 `5852` 仍在），但房间不是干净的两格空腔，登记备查。
- **C-B50-3 世界残留**：`run/` 下 `w-b50s-{r1,r2,r3,r4,r5}`（开发轮）+ `w-b50s-{v1,v2,w6}`（本窗）共 8 个，全保留未删。
- **C-B50-4 W6 通道存活只取 1 条**：`equipped-probe contained=true` 单次调用即足证通道，未做重复采样。
- **C-B50-5 W4 两轮各只 2 行**：`contained=true` / `false` 各一次，未覆盖多件装备/单件装备的组合面。
- **C-B50-6 W6 臂由会话七自写**（`testharness/player/_b50-w6.js`，与 W5 同几何同召唤参数，仅 `mobDespawnR196=false`），非任务书附带驱动。

## §4 收口清单

| 项 | 状态 |
|---|---|
| 客户端 | 未启动（全服务端日志判定） |
| 停服 | v1/v2/W6 全 `{"exitCode":0,"exited":true}` |
| BUILD | `in 52s` / `in 45s` / `in 40s` |
| jar | 1,215,661 B `6A4B565B…5E76`，mtime `2026-11-20T16:38:09Z` 未变 |
| MK | 101/242/484 + 101/10，`ok=true`（三臂） |
| HEAD | `d442d5e`，窗内 0 提交 |
| crash / port | 24 → 24；0 |
| cfg | 起收同 `71EA288B…`（`mobDebugLog=false`、`mobDespawnR196=false` 已还原） |
| props | 起收同 `E3DE434…`（`level-name=w-b30v`、`allow-flight=false`） |
| 世界 | `w-b50s-v1`(25 文件)、`w-b50s-v2`(23)、`w-b50s-w6`(28) 保留；开发轮 r1–r5 保留 |
| 产品码 | 0 改动，未 build，未 commit |

## §5 文尾

- 正本：`git-workspace/etim/testharness/reports/b50-verify-verdict.md` 7149 B / 107 行
- 证据：`testharness/build-logs/b50-v1.out` 906,669 B、`b50-v2.out` 902,254 B、`b50-w6.out` 877,446 B
- 驱动输出：`build-logs/b50-v1.node.out`、`b50-v2.node.out`、`b50-w6.node.out`
- 三 SHA：jar `6A4B565BE6B31513F8E17D4C0BF0130304AB1643D908A04981EC434D95675E76`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`
