# W-B52b2 判决书：Ooze 自然生成正证复验（A-B52b-1 修复后）

- 执行会话：会话七（ETIM 验证窗执行）
- 判决时间：2026-11-21 09:25 CST（宿主机本地；服务端日志为 UTC，早 8 小时）
- 判决源：工作树 HEAD `771ed92b65633e16bbd249c52045dea7dc777b2a`，`build/libs/etim-1.0.0.jar`（build2，含 A-B52b-1 修复，未提交）
- 执行方式：零 build、零 src 改动、零 commit；只写 `testharness/player/_b52-w5b2*.js` 与本正本

## §0 钉值（开工／收工实测）

| 项 | 值 | 开工 | 收工 |
|---|---|---|---|
| release jar | `build/libs/etim-1.0.0.jar` | 1,218,667 B | 1,218,667 B |
| jar SHA-256 | `59F9AF83F6A95FE29293FB1CCC8CE41E11729903EF96C76DC6E9A3C2B6C956F7` | 一致 | 一致 |
| jar mtime | `2026-11-21T01:07:34Z` | — | 未变（0 rebuild） |
| MK | 101/242/484，mixins 101+10，`ok=true` | 一致 | 一致 |
| cfg | `run/config/etim.cfg` | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD` | 同（`mobSpawnR196=true`、`mobDebugLog=false` 已还原） |
| props | `run/server.properties` | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` | 同（`level-name=w-b30v`） |
| crash-reports | 计数 | 24 | 24（窗内 0 新增） |
| 端口 25565 | LISTEN | 0 | 0 |
| HEAD | 提交数 | `771ed92`（302） | 同（窗内 0 提交） |

修复面（工作树，读码核对）：`src/main/java/io/github/etim/etim/mob/ETIMEntityOoze.java:54-64` `getCanSpawnHere()` 不再调 `super`，改为 `Peaceful → isValidOozeLightLevel() → world.getBlockState(below).canEntitySpawn(this)`；碰撞/液体由 spawner 的 `isNotColliding()` 负责。

## §1 房间与窗口

- 世界：`run/w-b52-w5b2`（新世界，未复用 w-b52-w5b / w5c，避免覆盖上一轮证据）
- cfg 注入：`mobSpawnR196=true`、`mobDebugLog=true`；`doMobSpawning true`、`doMobLoot true`、`difficulty 1`、`time 18000`、`weather clear`
- 房间规格（每间）：石地板（y=20）＋内部 3 格空气（y21..23）＋石顶（y=24），5×3×5 封闭石室
- win1 房间：`(-50,20,280)`、`(-56,20,280)`、`(-44,20,280)`、`(-50,26,280)`
- win2 房间：`(-50,20,200)`、`(-56,20,200)`、`(-44,20,200)`、`(-50,26,200)`
- bot 安全位：`(-50.5,20,240.5)`（距最近房间 ≥40 格，区块保持加载、不进近距拒刷半径）
- 每窗 180 s；win3（大石室）**未执行**——win1、win2 均已正证，按工单「仅当前两窗 0 只」条款免跑

## §2 每窗计数（未合并）

| 窗 | 房间 z | firstHit | spawn 行 | accept | **acceptOoze** | ooze-gate | slime-gate | creeper-gate | cap-block | spawnpick |
|---|---|---|---|---|---|---|---|---|---|---|
| win1 | 280 | **10.7 s** | 1,630 | 606 | **16** | 53 | 91 | 15 | 470 | 0 |
| win2 | 200 | **5.4 s** | 1,020 | 393 | **10** | 40 | 50 | 7 | 258 | 0 |

- 全档（两窗合计）：`[SpawnLog] accept` 1,044 条，其中 `ETIMEntityOoze` **26 条**；`ooze-gate reject` 101 条
- 判行锚（全文 tee：`testharness/build-logs/b52-w5b2.out`，6,256,522 B / 42,152 行）：
  - `09:10:39` `[SpawnLog] accept dim=0 ETIMEntityOoze at (59,22,259) y-bucket=under`（全场首条自然 ooze）
  - `09:10:45` 房间外 `(4,32,233)`、`(-1,32,231)`
  - **`09:11:54` `[SpawnLog] accept dim=0 ETIMEntityOoze at (-51,21,280) y-bucket=under`（落在 win1 房间内：x∈[-52,-48]、y=21 紧贴石地板、z=280）**
  - `09:16:45` 末两条 `(-73,28,132)`、`(-76,28,132)`
- 分布核对：26 条 ooze accept 的 y ∈ [12, 32]（全部满足 y≤32 深度闸），其中 1 条落在石室几何内、25 条落在天然洞穴
- 命中侧证（`/testfor @e[type=etim:ooze]`）：win1 firstRaw `[09:10:45] … [minecraft/DedicatedServer]: Found Ooze`；win2 firstRaw `[09:13:56] … Found Ooze`；`firstHit` 分别为 10.7 s / 5.4 s
- 排除面：`spawnpick` 计数两窗均为 **0**（本脚本不含 `/etest spawnpick`），故上述 `accept` 行全部来自自然刷怪循环

## §3 正证结论

### 正证 **YES**

- win1 `acceptOoze = 16`、win2 `acceptOoze = 10`，两窗均 ≥1，且 `/testfor` 双窗成功
- 关键物证：`09:11:54` 在 win1 石室内部 `(-51,21,280)` 出现自然 ooze accept —— 与 A-B52b 的窗口几何（石地板＋石顶＋y≤32）完全对齐，说明修复后「非史莱姆区块的石室」可正常产出 ooze

### 修复有效性

- 修复前（A-B52b，build1 `7B7071A4…`）：同几何三窗 2,752 次 accept、0 只 ooze
- 修复后（本窗，build2 `59F9AF83…`）：两窗 999 次 accept（606+393）、**26 只 ooze**，命中率 ≈2.6%，与表内 weight 20/540 ≈3.7% 同量级
- 差异方向与 A-B52b-1 的定谳一致：旧体被 `EntitySlime` 史莱姆区块币拦死，新体走 `canEntitySpawn` 后恢复

### 附带回归（W1–W4，`RUN=b2v1`，独立世界 `w-b52s-b2v1`，未覆盖上一轮 `b52s-v1` 证据）

`[done] {"run":"b2v1","pin":true,"w1":true,"w2":true,"w3":true,"w4":true,"stop":{"exitCode":0,"exited":true},"pass":true}`

- W1（y=20 石三明治）：`b52s-b2v1.out:5801` `spawnpick n=2000 at BlockPos{x=-50, y=20, z=240} counts={… ETIMEntityOoze=86 …}`
- W2（y=60）：同点 counts 无 Ooze 键；拒因 20 条 `ooze-gate reject depth=false floor=true stoneAbove=true y=60 at (-50,60,240)`
- W3（玻璃顶）：23 条 `reject depth=true floor=true stoneAbove=false y=20 at (-50,20,241)`
- W4（无地板）：18 条 `reject depth=true floor=false stoneAbove=true y=20 at (-50,20,242)`
- 与 build1 同形，三类拒因齐备

### 登记（C 级）

- **C-B52b2-1**：工单「工作树应有 M：ETIMEntityOoze.java、ETIMSpawnTables.java、f7-wb-lib.js」实测为 `ETIMEntityOoze.java` + `f11-b52-smoke.js` + `f7-wb-lib.js`；`ETIMSpawnTables.java` 已在 `771ed92` 提交，无未提交改动，不影响本窗判读
- **C-B52b2-2**：本窗脚本 `probe()` 的 chat 回显会重复打印旧行（`Found Ooze` 行数随轮次增长），故命中数一律以 `[SpawnLog] accept` 行与 `firstHit` 时长为准，不按 chat 行数计
- **C-B52b2-3**：node 重定向文件 `build-logs/b52-w5b2.out` 只含 bot/chat 视图（39 KB）；服务端全量在 tee 文件 `testharness/build-logs/b52-w5b2.out`（6.26 MB），本正本锚点用后者
- **C-B52b2-4**：win3 大石室未跑（两窗已正证）；`w-b52-w5b`、`w-b52-w5c` 为上一轮证据世界，本轮未覆盖
- **C-B52b2-5**：26 条 ooze accept 中仅 1 条落在石室几何内，其余 25 条来自天然洞穴；判据取 `acceptOoze≥1` 与 `/testfor` 成功，不要求全部在房内
- **C-B52b2-6**：回归臂走 `/etest spawnpick`（不经 `getCanSpawnHere`），故回归只证「池＋三闸」未回退，与自然面互不替代

## §4 收口

- 世界：`run/w-b52-w5b2`（两窗，92 文件 / 7,349,068 B）、`run/w-b52s-b2v1`（回归）新建并保留；`w-b52-w5b`、`w-b52-w5c`、`w-b52-w5`、`w-b52s-*` 全部保留未删
- cfg / props：SHA 起收同（见 §0），`mobDebugLog` 已回 `false`、`mobSpawnR196=true`
- crash 24→24、port 0、HEAD `771ed92` 窗内 0 提交、jar mtime 未变（0 rebuild）
- 证据：`testharness/build-logs/b52-w5b2.out`（6,256,522 B）、`build-logs/b52-w5b2.out`（node 视图）、`testharness/build-logs/b52s-b2v1.out`（980,812 B）、`build-logs/b52-b2v1.node.out`
- 结论：**正证 YES**（两窗 acceptOoze 16 / 10，窗内石室自然产出 1 只），A-B52b-1 修复有效；附带回归 W1–W4 全绿

## 字节规格

- 本文件：`7744` B / `94` 行（UTF-8 无 BOM、LF）
- 判据文件 SHA-256：jar `59F9AF83F6A95FE29293FB1CCC8CE41E11729903EF96C76DC6E9A3C2B6C956F7`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`
