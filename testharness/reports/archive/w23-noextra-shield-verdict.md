# W-23 判决回执 · 无 Extra 降级比对（vanilla 木盾行为不变）

> **报告字节规格**：`8,446 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 29 / ✗ 1｜103 行`
> 执行方：会话七（自动化测试执行方）｜执行窗：2026-10-29 14:41（服务器本地时）｜tag `w23-noextra-shield`
> 判决源：`playground/audit/盾面削弱批-立项摸底.md` §3 W-23 行 + §2.5 判据面句；对照侧 = W-16 木盾腿原始判行（`w16-nerf-l0-evidence.json`）

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 主 mod 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | 窗内即此目录，`runServer` 工作目录 `run\` |
| 产品 HEAD | `03bbeff`（B-38-1 + ghost-drift） | ✓ 起窗/收口同值 |
| dev jar | 750,801 B｜`7998673BB60B7ADDA332709F947426CCC665FEE46D25B42860BC4C61C7E63BA7` | ✓ 逐位命中（`build\libs` 与 mavenLocal 同为 13:31 产物） |
| 附属 jar（仅复核） | 31,614 B｜`2D42D78AE475E2261C9071B980322570EC7003FC86961771CF32D8374C847A98` | ✓ 命中；**未**放入本工作区任何 mods 面 |
| classpath 无 etimextra | 全窗日志 `etimextra` 匹配 = **0** | ✓ 起窗后 / 收口后各查一次，均 0 |
| 服务端 mod 清单 | `Finished gathering 15 mods`，FMLSrvMods 含 `etim@1.0.0`、无 `etimextra` | ✓ |
| 构建 JDK | `gradle.properties` 的 `org.gradle.java.home` → `jdk\zulu25.38.107-ca-jdk25.0.5-win_x64` | ✓ 未设 `JAVA_HOME`、未现搜 |
| 起服/停服 | `gradlew runServer` + 控制台 stdin（`stop`） | ✓ 见 §3 C-1 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE` | ✓ 0 rebuild（1 executed = `:runServer` 本体） |
| 环境前置 | 25565 空闲、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |

## 1. 判决源清单（两行原文）

raw=8 臂（正式判点；服务端 `run\logs\latest.log` 14:41:27）：

```text
[14:41:27] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn23#70 src=etimspectral raw=8.000 blocked=4.000 factor=0.500 spectral=false min=1.000 carrier=minecraft:shield [server]
[14:41:27] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn23#70 item=minecraft:shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=4.000 wear=10 dur=0->10 [server]
```

raw=1 地板臂（辅助，不作 W-23 正式判点；14:41:29）：

```text
[14:41:29] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn23#70 src=etimspectral raw=1.000 blocked=1.000 factor=1.000 spectral=false min=1.000 carrier=minecraft:shield [server]
[14:41:29] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn23#70 item=minecraft:shield shield=true rate=2.500 mult=1.000 decay=na raw=1.000 blocked=1.000 wear=2 dur=10->12 [server]
```

对照侧（W-16 木盾腿，**装 Extra 时**，同一驱动序；原值取自 `w16-nerf-l0-evidence.json`）：

```text
[13:49:19] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] block player=ETIM_Harn16#0 src=etimspectral raw=8.000 blocked=4.000 factor=0.500 spectral=false min=1.000 carrier=minecraft:shield [server]
[13:49:19] [Server thread/INFO] [Easy Times In Minecraft]: [BlockLog] wear player=ETIM_Harn16#0 item=minecraft:shield shield=true rate=2.500 mult=1.000 decay=na raw=8.000 blocked=4.000 wear=10 dur=0->10 [server]
```

## 2. 逐判点核讫表（正 / 反逐格）

判法：两行都要（缺一不算通过）；字段逐一取值比对（数值容差 0.0005，字符串逐字），`dur` 不比起点、只比增量。本窗驱动同时做「逐字段直读断言」与「对 W-16 原始判行做机器 diff」，两路一致。

| # | 判点 | 正（判据值） | 实测（本窗） | 判定 | 反（出现即不通过） |
| --- | --- | --- | --- | --- | --- |
| 1 | block.src | `etimspectral` | `etimspectral` | ✓ | 出现 `mob` 等其它 src |
| 2 | block.raw | `8.000` | `8.000` | ✓ | raw 不是 8（打偏臂） |
| 3 | block.blocked | `4.000` | `4.000` | ✓ | 差 1 个千分位 |
| 4 | block.factor | `0.500` | `0.500` | ✓ | 被接口支吃掉（≠0.500） |
| 5 | block.spectral | `false` | `false` | ✓ | `true`（走错腿） |
| 6 | block.min | `1.000` | `1.000` | ✓ | 地板值漂移 |
| 7 | block.carrier | `minecraft:shield` | `minecraft:shield` | ✓ | carrier 换成其它物品 |
| 8 | wear.item | `minecraft:shield` | `minecraft:shield` | ✓ | 走错物品 |
| 9 | wear.shield | `true` | `true` | ✓ | `false`（掉进工具臂） |
| 10 | wear.rate | `2.500` | `2.500` | ✓ | 1.400 / 1.250 / 0.500（Extra 乘子泄漏） |
| 11 | wear.mult | `1.000` | `1.000` | ✓ | 缺字段或 ≠1.000 |
| 12 | wear.decay | `na` | `na` | ✓ | 出数字（走错臂） |
| 13 | wear.raw | `8.000` | `8.000` | ✓ | 与 block 行不同源 |
| 14 | wear.blocked | `4.000` | `4.000` | ✓ | 差 1 个千分位 |
| 15 | wear.wear | `10` | `10` | ✓ | 差 ≥1 |
| 16 | wear.dur 增量 | `10`（起点可不同） | `0->10`，增量 10 | ✓ | 增量 ≠10 |
| 17 | 两行相邻 | 同一次受击紧邻 | 相邻（中间无其它 `[BlockLog]` 行） | ✓ | 只比 block 不比 wear |
| 18 | 整行机器 diff（对 W-16） | 0 处差异 | block 6 字段 diff=[]；wear 7 字段 + dur 增量 diff=[] | ✓ | 任一字段不等 |

辅助位（raw=1 地板臂，只记不判 factor）：`blocked=1.000`（地板生效）、`rate=2.500`、`mult=1.000`、`wear=2`、`dur=10->12`，与 W-16 同值；`factor=1.000` 是触地板后的形态，**不作判点**（§三 ③）。

## 3. 冲突分级（A / B / C）

A 级 0 条、B 级 0 条（产品行为与 W-16 逐位一致，无字段偏差）；C 级 2 条如下：

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | 任务书 §二 写「runServer ＋ RCON 优雅停」，但本工作区硬规则（`testharness/server/README.md`）记录 GradleStart dev 链下 stock `RConThreadClient` 每连接 NPE、RCON 无法执行命令。本窗据该硬规则改用 **runServer + 控制台 stdin**（`\etest`／`\etimghost` 逐条下发，`stop` 优雅停），判据面（服务端日志 `[BlockLog]`）不受影响 | 仅记纪律；不判负、不改产品码 |
| C-2 | C | 本窗第 1 次执行（`w23-noextra-shield-attempt1-*`）判 FALSE：驱动把 `block` 行也去取 `dur` 增量，而 block 行本无 `dur` 字段 → NaN 造成假负；两行真实字段当时已全绿。修驱动（`dur` 只在 wear 行比）后复跑通过 | 驱动侧缺陷，已修；两次证据均留档，不影响判决 |

无 provenance 回指：本窗只判本批裁定值与判行形态，未以 R196 写法作反对理由。

## 4. 结论

**W-23 通过**（A 0 / B 0 / C 2，C 级均不触及产品行为）。

- 无 Extra 环境下，vanilla 木盾仍走盾臂：`blocked=4.000`、`factor=0.500`、`rate=2.500`、`mult=1.000`、`decay=na`、`wear=10`，与装 Extra 时的 W-16 木盾行**逐位同值（0 处差异）**，耐久增量 10。
- 反点定位：无。两行齐备、17 个判点全 ✓、整行 diff 为空。
- 旁证：全窗 `etimextra` 日志匹配 0 条、FML 模组清单无 `etimextra`；`dur=0->10` 说明磨损真实落到物品上（非创造跳过）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | `Done (1.049s)` 14:41:20 → stdin `stop` → `Saving worlds` → `BUILD SUCCESSFUL in 21s`，驱动退出码 0 |
| 配置还原 | 窗前字节副本整体还原，回读 27,413 B｜SHA-256 `910E2DA0D7AC577FED388C44FD36884F009FADE06CE66E1D7DC8741907CBE398`（**byte-identical**）；`blockDebugLog` 键窗内注入、收口随整档消失（原档本无此键） |
| 端口 | 25565 收口后 0 条 LISTEN（仅 TIME_WAIT） |
| 崩溃 | `run\crash-reports` 18 条，窗前后不变 |
| 客户端 | 本窗全程无客户端进程（纯服务端 + 假人 `ETIM_Harn23`） |
| 证据档 | `testharness\build-logs\w23-noextra-shield.out`（全量日志）、`w23-noextra-shield-evidence.json`（逐判点＋两行原文＋diff）、`w23-noextra-shield-etim.cfg.before`（窗前字节）、`w23-noextra-shield-attempt1-*`（首跑留档） |
| 驱动 | `testharness\player\w23-noextra-shield.js`（腿序与 W-16 木盾腿同源）、`testharness\server\server-console.js`（stdin 控制面） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；仅工装新增两文件＋本回执） |
