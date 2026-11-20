# W-B47 判窗正本（D 卷生成细节小件：ghast 48 格重试 / 蝙蝠倒挂 / 炼狱苦力怕替换）

**判窗时间**：2026-11-20 23:06:47 → 23:15:04（CST 本地；日志为 UTC，差值 +8h）
**执行方**：会话七（ETIM 验证窗执行）
**判决源**：工作树 HEAD `e0bc601`（窗内 0 提交）

## §0 钉值（实测）

| 项 | 实测值 | 钉值 | 判定 |
|---|---|---|---|
| release jar | `build/libs/etim-1.0.0.jar` 1,208,549 B | 1,208,549 B | ✅ |
| release SHA256 | `8B1F811F0312794E3777289EDC62CE89C7644E7FBA5A6754DA10D7A1EE720C54` | 同 | ✅ |
| jar mtime | `2026-11-20T15:03:00Z` | — | 窗内未变（0 rebuild） |
| MK refmap | classes 101 / entries 239 / dual 478 | 101/239/478 | ✅ |
| MK manifest | mixins 101 / client 10 | 101 + 10 | ✅ |
| MK ok | `true` | true | ✅ |
| HEAD | `e0bc601` | `e0bc601` | ✅ 窗内 0 提交 |
| crash-reports | 24 → 24 | 24→24 | ✅ 窗内无新增 |
| port 25565 | 0（窗后） | 0 | ✅ |
| cfg SHA256 | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`（49,406 B） | 起收同 | ✅ |
| props SHA256 | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` | 起收同 | ✅ |
| props level-name | 起 `w-b30v` → 收 `w-b30v` | 还原成立 | ✅ |

**工作树（判决源，未动）**：`M` 8 件 = `client/ETIMMobRender.java`、`commands/CommandDevTest.java`、`mob/ETIMMobEntities.java`、`mob/ETIMSpawnCycle.java`、`mob/ETIMSpawnTables.java`、`assets/etim/lang/en_us.lang`、`assets/etim/lang/zh_cn.lang`、`mixins.etim.json`；`??` 3 件 = `mixins/MixinEntityCreeper.java`、`mob/ETIMCreeperExplosionRadius.java`、`mob/ETIMEntityInfernalCreeper.java`。与工单逐字一致。

## §1 判读总表

| 窗 | 内容 | 判据 | v1 | v2 | 判定 |
|---|---|---|---|---|---|
| W0 | PIN／回归面 | 双 PIN 同 sha ∧ `mk.ok` | shaOk=true，mk ok=true，mixins 101/10 | 同 | ✅ PASS |
| W1 | 炼狱苦力怕替换（深度 y=20） | `pick(-50,20,240,4000)` 内 `ETIMEntityInfernalCreeper>0` ∧ `creeper-gate infernal` 行 >0 | infernal=268、gate=true | infernal=245、gate=true | ✅ PASS |
| W2 | 地表负证据（y=120） | `pick(-49,120,240,4000)` infernal=0 ∧ 无 gate 行 | infernal=0、gate=false | 同 | ✅ PASS |
| W3 | ghast 48 格重试谓词 | 近处 player=true / 远处 player=false | near=true、far=true | 同 | ✅ PASS |
| W4 | 蝙蝠倒挂谓词 | 有石顶 ok=true / 无顶 ok=false | ceiling=true、open=true | 同 | ✅ PASS |
| W5 | 炼狱爆炸参数 | `radius=6 fireImmune=true defense=2.0` | radius=true、immune=true | 同 | ✅ PASS |
| 补-A | 自然生成窗（旗开） | 自然 `bat-hang ok` ≥1 ∧ 自然 `creeper-gate infernal` ≥1 | bat-hang 3 条、infernal 11 条（60 s+180 s 同窗） | — | ✅ PASS |
| 补-B | 默认关自然窗 | 60 s 内 `creeper-gate|bat-hang|ghast-gate` 全 0 | `anyGate=0`、`spawnLogRows=0` | — | ✅ PASS |

两轮驱动 `[done]`：v1 `{"run":"v1","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`；v2 `{"run":"v2","pin":true,"pass":true,"bad":0,"stop":{"exitCode":0,"exited":true}}`。补臂 `{"run":"w5","pass":true,"bad":0}`、`{"run":"w6","pass":true,"bad":0}`。

## §2 判行锚（行号以对应日志文件为准）

### 轮一 `testharness/build-logs/b47-v1.out`（967,031 B）
- `2361` `Done (5.504s)! For help, type "help" or "?"`
- `5603` 起 268 条 `[SpawnLog] creeper-gate infernal y=20 at (-50,20,240)`
- `5999` `[SpawnLog] spawnpick n=4000 at BlockPos{x=-50, y=20, z=240} counts={ETIMEntityBoneLord=53, ETIMEntityDemonSpider=88, ETIMEntityInfernalCreeper=268, ETIMEntityPhaseSpider=37, ETIMEntityRevenant=106, EntityCreeper=729, EntityEnderman=100, EntitySkeleton=919, EntitySpider=757, EntityZombie=943}`
- `6269` 地表负证据 `spawnpick n=4000 at BlockPos{x=-49, y=120, z=240} counts={EntityCreeper=840, EntityEnderman=90, EntitySkeleton=883, EntitySlime=852, EntitySpider=504, EntityZombie=831}`（无 infernal）
- `6272` `[SpawnLog] ghastgate player=true at BlockPos{x=-60, y=120, z=240}`；`6275` `[SpawnLog] ghastgate player=false at BlockPos{x=-60, y=120, z=300}`
- `6282` `[SpawnLog] hangbat ok=true y=124.08999847412109 at BlockPos{x=-60, y=120, z=240}`；`6287` `[SpawnLog] hangbat ok=false y=120.0 at …`（顶棚置 air 后）
- `6292` `[SpawnLog] infernal spawn at BlockPos{x=-50, y=120, z=240} radius=6 fireImmune=true defense=2.0`
- `6317` `BUILD SUCCESSFUL in 31s`

### 轮二 `testharness/build-logs/b47-v2.out`（963,896 B）
- `2361` `Done (5.394s)!`
- `6001` `spawnpick n=4000 … ETIMEntityInfernalCreeper=245 …`（245 条 gate 行同源）
- `6242` 地表 `spawnpick` 无 infernal；`6245/6248` ghastgate true/false；`6255/6260` hangbat true/false；`6265` `infernal spawn … radius=6 fireImmune=true defense=2.0`
- `6290` `BUILD SUCCESSFUL in 31s`

### 补-A 自然窗 `testharness/build-logs/b47w5-w5.out`（3,355,140 B）
- `2361` `Done (5.438s)!`
- `5393` `[SpawnLog] creeper-gate infernal y=11 at (-100,11,238)`（自然；全档 13 条，窗口内 11 条）
- `21653` `[SpawnLog] bat-hang ok at (46,55,364)`；`21655` `at (-114,30,166)`；`21657` `at (-117,30,165)`（自然倒挂 3 条，y<63 全部符合）
- `22532` `BUILD SUCCESSFUL in 3m 24s`

### 补-B 默认关 `testharness/build-logs/b47w6-w6.out`（809,999 B）
- 全档 `creeper-gate|bat-hang|ghast-gate` = **0 条**；`[SpawnLog]` 0 条

## §3 登记项

**A 级（阻断交付）**：无。
**B 级（须裁定/须复验）**：无。

**C 级（观察与口径）**

- **C-B47-1 服务端日志轮转**：`run/logs/latest.log` 停服后仅 4,806 B，1.12 会轮转为 `.log.gz`；本正本全部行号锚取自 `testharness/build-logs/b47-vN.out`（tee 全量流），与 `latest.log` 非同一文件。
- **C-B47-2 单 PIN**：驱动每次运行只打一条 `[PIN]`（无「起/收双 PIN」），与 B-44 C-10、B-45 C-8 同源工装缺口；`mk.ok=true` 与 sha 一致已在同一条内自证。
- **C-B47-3 事件成对双写**：`[SpawnLog] ghastgate … [server]` 与 `[etest] ghastgate …` 是同一事件的两次输出（同 B-45 C-6），统计时须去重。
- **C-B47-4 W3/W4 为谓词探针**：`/etest ghastgate`、`/etest hangbat` 直调产品谓词，证明「判定式」正确；「自然触发」由补-A 覆盖（bat 3 条 / infernal 11 条）。
- **C-B47-5 补-B 无窗内正对照**：W6 窗口 60 s 内 `[SpawnLog]` 全 0，无法在窗内自证「确有怪刷出但未走门」。旁证：同一世界同一暗室在补-A（旗开）产出 1,533 条 `[SpawnLog]`，且两臂仅差 `mobSpawnR196` 一旗。
- **C-B47-6 自然 gate 行无 `src=` 字段**：`[SpawnLog] creeper-gate infernal y=… at (…)` 与探针触发同形，只能靠「本窗未调 spawnpick」间接区分（同 B-46 C-2）。
- **C-B47-7 世界命名与遗留**：驱动世界 `run/w-b47s-<RUN>` 实为 `w-b47s-w-b47v1` / `w-b47s-w-b47v2`；另有开发遗留 `w-b47s-r1/r2/r3` 与补臂世界 `run/w-b47v`（91 文件）全部保留，未删。
- **C-B47-8 补臂为自写脚本**：`testharness/player/_b47-w5.js`、`_b47-w6.js` 由本会话编写（`node --check` 均过），不属工单驱动；W5 的 180 s 观察窗与 W6 的 60 s 由脚本内 `sleep` 实现。
- **C-B47-9 地表抽取口径**：W2 的 4,000 次抽取只覆盖「y=120 地表」，不含其它地表高度；深度阈值边界（如 y=40/41）未做二分，工单未要求。
- **C-B47-10 世界数量**：`run/` 下 `w-b47*` 共 6 个目录（r1/r2/r3/v1/v2/`w-b47v`），全部保留。

## §4 收口清单

| 项 | 状态 |
|---|---|
| 客户端 | 未启动（本窗纯服务端日志判定） |
| 服务端进程 | 每次 `stop` 优雅停服，4 次 `[stop]` 全 `{"exitCode":0,"exited":true}` |
| BUILD | v1 `in 31s`、v2 `in 31s`、补-A `in 3m 24s`、补-B 正常收口 |
| jar | mtime `2026-11-20T15:03:00Z` 未变（0 rebuild） |
| crash-reports | 24 → 24 |
| port 25565 | 0（窗后无监听） |
| cfg / props | 起收 SHA 全同；`level-name` 收 `w-b30v` |
| HEAD | `e0bc601`，窗内 0 提交 |
| 世界 | `w-b47s-r1/r2/r3`、`w-b47s-w-b47v1/v2`、`w-b47v` 全保留 |
| 产品码 | 0 改动（M/?? 与工单一致，未 checkout/reset/clean） |

## §5 文尾

- 正本：`git-workspace/etim/testharness/reports/b47-verify-verdict.md` 8817 B / 106 行
- 证据：`testharness/build-logs/b47-v1.out` 967,031 B、`b47-v2.out` 963,896 B、`b47w5-w5.out` 3,355,140 B、`b47w6-w6.out` 809,999 B
- 驱动输出：`build-logs/b47-verify-v1.node.out` 11,270 B、`b47-verify-v2.node.out` 11,158 B、`b47-w5.out` 11,767 B、`b47-w6.out` 30,337 B
- 三 SHA：jar `8B1F811F0312794E3777289EDC62CE89C7644E7FBA5A6754DA10D7A1EE720C54`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`
