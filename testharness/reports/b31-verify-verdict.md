# R196 木门/栅栏门破门 AI（ETIMEntityAIBreakDoor）对位验证 **W-B31 判窗**（B-31 正本，HEAD `c6ac060`）

> **HEAD**：`c6ac060e3014f81668ec125eba89a38c75b05029`，窗内 **0 提交**（未改动工作树内容）；**0 rebuild**，jar mtime `2026-11-10T09:43:55Z` 早于窗起 `2026-11-10T23:43Z`。
> **jar**：`build/libs/etim-1.0.0.jar` **1,117,703 B**，SHA256 `94F8E54DF6E94207B0CA06B2F8A9F946076AC6E590D62EE3A1B8A02C052ADA87`（起收同值）。
> **dev/sources**：1,096,293 B `5EBC27BD26918E62C3C620F014905101FD8616A4615ED983B0453B9C710DE4A8`；1,021,728 B `035C9BA29F0A726C76250DE142CB564618BA2C05372024A776D02370C8BD0AA5`（均起收同）。
> **refmap**：classes **100** / entries **221**（dual 442，双份同）；**mixins**：**98** + 10 client；`mkCounts().ok=true`。
> **窗口**：2 boot —— `Done (5.370s)`（07:44:20，b1:2351）、`Done (5.492s)`（07:47:09，b2:2350），mixinFail 0；2 停服 `exitCode=0 exited=true build=true`，`BUILD SUCCESSFUL in 3m 8s`（b1:4945）/ `in 1m 9s`（b2:3434）。判窗世界 `w-b31v`（首 boot 自动新建），假人 `ETIM_F7`，`doMobSpawning=false`。
> **判决**：**W0 PASS｜W1 PASS｜W2 N/A（结构性不可达，裁定 A）｜W3 PASS｜W4 PASS**；A 0、B 0、D 0、C 5。
> **判据源**：`testharness/player/f11-b31-verify.js`（`[PIN]` 首尾各一）、`testharness/build-logs/f11-b31-verify.json`、`-b1.out` 741,011 B / `-b2.out` 512,419 B。
> **报告字节规格**：`10532 B，UTF-8（无 BOM），LF，U+FFFD 0，? 4，79 行`。

## §1 逐臂判读

| 面 | 判决 | 实测 | 位 |
| --- | --- | --- | --- |
| **W0** boot 起停 | 双 boot `Done (`、mixinFail=0×2、两停服 exit 0 ∧ BUILD SUCCESSFUL | b1 `Done (5.370s)!`（b1:2351，07:44:20）、b2 `Done (5.492s)!`（b2:2350，07:47:09）；`mixinFail=0`×2；`stopBoots` 2 条 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 3m 8s`（b1:4945）、`in 1m 9s`（b2:3434） | PASS |
| **W1** 木门破门（a1） | `n≥1 ∧ progN≥1 ∧ breakN≥1 ∧ doorAir≥1` | `n=1 progN=11 breakN=1 doorAir=1`；start `07:44:41`（b1:4604）→ break `07:44:57`（b1:4617），**16 s**（1920t/6）；`testforblock -67 67 242 minecraft:air` → `Successfully found the block at -67, 67, 242`；probe 41 条 | PASS |
| **W2** 栅栏门（a2，证据臂） | 不计 bad（裁定 A） | `n=0 breakN=0 gateAir=0 probes=22`；`cycle0 extraMs=0 detectedAtSec=2.34 inCellAtClose=false startN=0`、`cycle1 extraMs=300 detectedAtSec=2.72 inCellAtClose=true closedAtSec=3.45 startN=0`；`diag{zombieAlive:false,zombieAtGate:false,botAlive:true}`；正本 `build-logs/f11-b31-gate-investigation.md` | N/A |
| **W3** 旗断（boot2） | `n===0 ∧ probes===0` | b2 全档 `AILog breakdoor` **0 条**，start/probe 双 0 | PASS |
| **W4** 钉值 | 双 `[PIN]` releaseSha 同值 ∧ mk.ok | `23:43:44.507Z`（stdout:1）与 `23:48:03.901Z`（stdout:1112）同 `94F8E54D…C052ADA87`，MK 双侧 `100/221/442`、`98+10`、`ok=true` | PASS |
| **props** | 归一化起收同 ∧ level-name 还原 | `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A` → 同值；`level-name` `w-b30v`→`w-b30v`；原始 hash `35EBC027…`→同值（只记不判） | PASS |
| **selftest** | console 选择器自证 | `boxBot=true`、`plainBot=true`（整数盒 AABB 可用） | PASS |

## §2 判行原文

**W1 门面（a1，全 13 行，entity=EntityZombie#2670）**
- `[07:44:41] [Server thread/INFO] [Easy Times In Minecraft]: [AILog] breakdoor src=zombie start target=Block{minecraft:wooden_door}@BlockPos{x=-67, y=68, z=242} ticks=1920 entity=EntityZombie#2670`（b1:4604）
- `[AILog] breakdoor src=zombie progress stage=0 ticks=6 entity=EntityZombie#2670`（b1:4605）
- `progress stage=1 ticks=192`（b1:4606）
- `progress stage=2 ticks=384`（b1:4607）
- `progress stage=3 ticks=576`（b1:4608）
- `progress stage=4 ticks=768`（b1:4610）
- `progress stage=5 ticks=960`（b1:4611）
- `progress stage=6 ticks=1152`（b1:4612）
- `progress stage=7 ticks=1344`（b1:4613）
- `progress stage=8 ticks=1536`（b1:4614）
- `progress stage=9 ticks=1728`（b1:4615）
- `progress stage=10 ticks=1920`（b1:4616）
- `[07:44:57] … [AILog] breakdoor src=zombie break target=Block{minecraft:wooden_door}@BlockPos{x=-67, y=68, z=242} entity=EntityZombie#2670`（b1:4617）

**W4 钉值两行**
- `[PIN] {"at":"2026-11-10T23:43:44.507Z","releaseSha":"94F8E54DF6E94207B0CA06B2F8A9F946076AC6E590D62EE3A1B8A02C052ADA87","mk":{"refmapResources":{"classes":100,"entries":221,"dual":442},"refmapTmp":{"classes":100,"entries":221,"dual":442},"manifest":{"mixins":98,"client":10},"ok":true}}`（stdout:1）
- `[PIN] {"at":"2026-11-10T23:48:03.901Z","releaseSha":"94F8E54DF6E94207B0CA06B2F8A9F946076AC6E590D62EE3A1B8A02C052ADA87","mk":{…同值…}}`（stdout:1112）

**propsNorm 两值**
- before `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A`
- after  `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A`
- 原始（含 Java Properties 时间戳行，只记不判）：`35EBC027361B0A6976214EE2877F73D420C1A878C6E5DA0C7875D95872CC81A2` → 同值

**W2 证据行（诊断，非判据）**
- `[a2] {"n":0,"brk":0,"probes":22,"air":0,"cycles":[{"cycle":0,"extraMs":0,"detectedAtSec":"2.34","inCellAtClose":false,"closedAtSec":"2.77","startN":0},{"cycle":1,"extraMs":300,"detectedAtSec":"2.72","inCellAtClose":true,"closedAtSec":"3.45","startN":0}]}`

## §3 冲突分级

- **A 级：0** —— 门面全套判点齐（start/progress×11/break/门格变 air），W3 旗断双零，W4 双 PIN 同值同 MK，props 归一化起收同。
- **B 级：0** —— mixin 注入无失败（98+10 全装），refmap 100/221 dual 442 双份同，`mkCounts().ok=true`。
- **D 级：0** —— 无待裁矛盾；W2 的处置已由主会话裁定 A 预先定案（见 C-B31-2）。
- **C 级：5**
  - **C-B31-1（判据面变更）**：props 原始 hash 不可判。1.12 保存时 Java Properties 会重写首部时间戳注释行（`#Tue Nov 10 20:56:34 CST 2026`），长度不变、哈希必漂（r12 实证 `0AB0CB…` → `35EBC0…`）。本窗起收改用归一化口径（去该注释行、去尾空行、LF 连接）＝`9903BDCD…B8D57A`，原始值仅登记。
  - **C-B31-2（W2 移出判据，裁定 A 依据）**：1.12 pathfinding 把关着的栅栏门当 FENCE（`WalkNodeProcessor:498`；`BlockFenceGate` 仅 `OPEN=true` 才可通），而木门有 `DOOR_WOOD_CLOSED + canOpenDoors → WALKABLE`（`:359`）—— 所以栅栏门分支在 1.12 对「走近撞门」的僵尸结构性不可达：关门后 repath 失败 ⇒ 原地停 ⇒ 无 `collidedHorizontally`，`ETIMEntityAIBreakDoor.doorInteractShouldExecute()`（`ETIMEntityAIBreakDoor.java:140-173`）第一关即 false。实证链：r10（进门前一格关门）4 循环 `closedAtSec=3.13/1.62/3.12/1.25` 全 0 start；r11（关进身体里）`cycle3 inCellAtClose=true` 仍 0；本窗 a2 两档 `inCellAtClose=false/true` 同形 0。正本 `build-logs/f11-b31-gate-investigation.md`。**未改产品码**。
  - **C-B31-3（工装面定型）**：`player/f11-b31-verify.js` 与 `f11-b31-smoke.js` 的 `protectBot()` 删去 1.12 不存在的 `attribute … maxHealth base set 1024`（服端 `Unknown command` 静默失败）；栅栏门臂定型为「整数盒 + 两档关门（0 / 300 ms）」证据臂，`w2` 固定 `'N/A'` 且带 `w2note`；`bad = !(w0 && w1 && w3 && w4)`。另：summon 一律带 `{CanBreakDoors:1b}`（否则 summoned 僵尸重读 NBT 把 mixin 的 `setBreakDoors(true)` 冲掉，r3 四只全没中签即此因）。
  - **C-B31-4（smoke r1→r12 拉锯）**：r1 三陷阱 —— ① bot 站在圈内 ⇒ 僵尸直奔假人、`collidedHorizontally` 永假；② `minecraft:oak_door` 非 1.12 id（应 `minecraft:wooden_door`），且 1.12 命令报错只回 sender、服日志无痕；③ console `@e[…r=6]` 半径以 console 原点解析（`found nothing`），装斧从未生效。后续又清出三条通道陷阱：1.12 `testfor` 的 `x/y/z/dx/dy/dz` **必须是整数**（小数盒整轮 0 命中，r5–r8 四轮假阴性）；`strip()` 剥前缀后成功行是 `Found ETIM_F7`（无冒号，且须大小写敏感，否则吃 `found nothing`）；`testforblock` 成功串带空格（`-67, 67, 242`）。共 12 轮冒烟（r1–r12）后定稿。
  - **C-B31-5（工装红自修一轮）**：verify 驱动首次落盘时 `crypto` 重复声明（`SyntaxError: Identifier 'crypto' has already been declared`）与 propsNorm 尾空行口径不一致（初算 `7F78866F…` ≠ 已登记 `9903BDCD…`），均在 `node --check`/单测阶段自修（去重 + 去尾空行），修正后与 r12 登记值逐字节一致；两轮内解决，未触及判值面。

## §4 收口五件

- **jar / dev / sources 起收同**：1,117,703 `94F8E54DF6E94207B0CA06B2F8A9F946076AC6E590D62EE3A1B8A02C052ADA87`、1,096,293 `5EBC27BD26918E62C3C620F014905101FD8616A4615ED983B0453B9C710DE4A8`、1,021,728 `035C9BA29F0A726C76250DE142CB564618BA2C05372024A776D02370C8BD0AA5`；**0 rebuild**（窗内仅 `[PIN]` 两次读取）。
- **cfg 起收同**：49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196=true` / `mobDebugLog=true` / `mobDespawnR196=false`，期末回写原值）。
- **props**：归一化 `9903BDCD…B8D57A` 起收同 ∧ `level-name` `w-b30v` 还原（939 B；原始 hash `35EBC027…` 起收同，只记不判）。
- **MK 起收同**：refmap 100/221（dual 442，双份同）、mixins 98+10、`mkCounts().ok=true`。
- **残留面**：port 25565 **0**、GradleStart JVM **0**、crash-reports **23→23**、HEAD `c6ac060` 窗内 **0 提交**（`git status` 仍为 B-29/B-30/B-31 未提交的 ` M`×3 / `??`×4，窗内未动）；产品码 mtime `2026-11-10T09:43:55Z` 早于窗起 `23:43Z`。
- **世界面**：`run/w-b31v` **保留**（26 文件 / 3,556,882 B，判窗世界按期保留，删除待口令）；`run/w-b31a`（冒烟世界）保留；`run/` 下 w-b* 共 **41** 个目录，无删除。
- **互通面行数漂移**：按门位一致判（C-B30-4 判例）—— 本窗 a1 `1/11/1` 与 r12 冒烟 `1/11/1` 同形，仅时间戳/entity id 漂移。

## 文尾

- 报告字节：`10532 B，UTF-8（无 BOM），LF，U+FFFD 0，? 4，79 行`。
- 三 SHA：jar `94F8E54DF6E94207B0CA06B2F8A9F946076AC6E590D62EE3A1B8A02C052ADA87`；cfg `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`；propsNorm `9903BDCD9569D50874D8C0D2C74656E823BC2B7A44C64309E5B8B264C3B8D57A`。
