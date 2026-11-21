# W-B52b 判决书：Ooze 自然生成正证（自然窗）

- 执行会话：会话七（ETIM 验证窗执行）
- 判决时间：2026-11-21 09:05 CST（宿主机本地；日志为 UTC，早 8 小时）
- 判决源：工作树 HEAD `771ed92b65633e16bbd249c52045dea7dc777b2a`（B-52 封批提交），`build/libs/etim-1.0.0.jar`
- 执行方式：零 build、零 src 改动、零 commit；只写 `testharness/player/_b52-w5*.js` 与本正本

## §0 钉值（开工/收工实测）

| 项 | 值 | 开工 | 收工 |
|---|---|---|---|
| release jar | `build/libs/etim-1.0.0.jar` | 1,218,575 B | 1,218,575 B |
| jar SHA-256 | `7B7071A498D0F40568DD16492630CA4CAD35EF5E70ACBFBA6FC5D3BCD978A6CF` | 一致 | 一致 |
| jar mtime | `2026-11-21T00:27:37Z` | — | 未变（0 rebuild） |
| MK | 101/242/484，mixins 101+10，`ok=true` | 一致 | 一致 |
| cfg | `run/config/etim.cfg` | `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD` | 同（`mobSpawnR196=true`、`mobDebugLog=false` 已还原） |
| props | `run/server.properties` | `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36` | 同（`level-name=w-b30v`、`allow-flight=false`） |
| crash-reports | 计数 | 24 | 24（窗内 0 新增） |
| 端口 25565 | LISTEN | 0 | 0 |
| HEAD | 提交数 | `771ed92` | 同（窗内 0 提交） |

## §1 房间布设（按工单规格）

- 世界：`run/w-b52-w5b`；cfg 注入 `mobSpawnR196=true` + `mobDebugLog=true`；`difficulty 1`、`time set 18000`、weather clear、`doMobSpawning true`、`doMobLoot true`
- 房间规格：石地板（y=20）＋内部 3 格空气（y21..23）＋石顶（y=24），即 5×3×5 的封闭石室
- win1 房间坐标：`(-50,20,280)`、`(-56,20,280)`、`(-44,20,280)`、`(-50,26,280)`
- win2 房间坐标：`(-50,20,200)`、`(-56,20,200)`、`(-44,20,200)`、`(-50,26,200)`
- bot 安全位：`(-50.5, 20, 240.5)`（距最近房间 ≥40 格，区块保持加载但不进入近距拒刷半径）
- 补臂 `w5c`：单一大石室 `x -100..-1 / z 272..371`，地板 y=20、内部 y21..23、顶 y=24（内部 100×3×100 = 30,000 格），每 15 s 清一次常见怪腾出 caps

## §2 窗口计数（未合并，逐窗记录）

| 窗 | 世界 | 时长 | spawn 总行 | accept | acceptOoze | ooze-gate 行 | slime-gate 行 | firstHit |
|---|---|---|---|---|---|---|---|---|
| win1 | `w-b52-w5b` | 180 s | 1,761 | 662 | **0** | 55 | 106 | null |
| win2 | `w-b52-w5b` | 180 s | 1,666 | 534 | **0** | 46 | 92 | null |
| w5c（补臂，超规格） | `w-b52-w5c` | 180 s | 3,015 | 1,556 | **0** | 148（`oozeGatePass=0`） | — | null |

- 证据文件：`testharness/build-logs/b52-w5b.out`（6,943,378 B，含两窗）、`b52-w5c.out`、`b52-w5d.out`
- 三窗 `[done]` 均 `pin:true`、停服 `{"exitCode":0,"exited":true}`；cfg 收窗已还原
- 合计自然 accept 2,752 次、ooze-gate 过闸 0 次、自然 ooze 生成 **0 只**

### 房内 accept 的构成（w5c，3,015 行内切片）

- y 分布：`y=21` 370 次 / `y=22` 5 次 / `y=25` 3 次 ⇒ 落点几乎全部贴在石地板上方一格（符合「地板正上方」几何）
- 类别：Skeleton 51 / Zombie 48 / Spider 33 / Creeper 30 / Enderman 6 / DemonSpider 6 / InfernalCreeper 5 / Bat 4 / BoneLord 2 / Revenant 1；**Slime 0、PhaseSpider 0、Ooze 0**
- 房内 `ooze-gate` 行 **0 条**（`gateLogBudget` 耗尽后静默，故不能据「无行」判「未被抽中」）；全档 ooze-gate 拒因集中在 y 55–79 的 `depth=false`，y≤32 仅 3 条且在房外天然洞穴
- `reject colliding` 0 条、`wide-retry`/`wide-gate reject` 0 条、`pickspawn-null` 0 条

### 正对照（诊断，不作判据）：同坐标 spawnpick

`testharness/player/_b52-w5d.js`，同世界同坐标各 2,000 次 `/etest spawnpick`：

| 坐标 | ooze 计数 |
|---|---|
| `(-50, 21, 300)` | **81** |
| `(-50, 21, 330)` | **98** |
| `(-50, 16, 300)` | **91** |
| `(-50, 20, 240)`（地板非石） | 0 |

⇒ 池（weight 20/540 ≈ 3.7%）与三道 ooze 闸在自然落点坐标上**完全能出 ooze（≈4%）**；同一世界随后 60 s 自然窗仍 `accept=236 / acceptOoze=0 / oozeGate=29 / colliding=0`。

## §3 判读

### 正证：**NO**（两窗 + 一补臂，合计 2,752 次自然 accept，0 只）

### 根因定谳（代码级，A 级）

`ETIMEntityOoze` 的 `getCanSpawnHere()` 覆写并未绕开史莱姆区块币，`super` 仍是 `EntitySlime`：

- `src/main/java/io/github/etim/etim/mob/ETIMEntityOoze.java:31` `public class ETIMEntityOoze extends EntitySlime {`
- `src/main/java/io/github/etim/etim/mob/ETIMEntityOoze.java:53-58`
  ```java
  @Override
  public boolean getCanSpawnHere() {
      return this.world.getDifficulty() != EnumDifficulty.PEACEFUL
              && this.isValidOozeLightLevel()
              && super.getCanSpawnHere();   // ← super = EntitySlime.getCanSpawnHere()
  }
  ```
- `build/rfg/minecraft-src/java/net/minecraft/entity/monster/EntitySlime.java:335-362`：`super.getCanSpawnHere()` 落在 `:355`
  ```java
  if (this.rand.nextInt(10) == 0 && chunk.getRandomWithSeed(987234911L).nextInt(10) == 0 && this.posY < 40.0D)
  ```
  ⇒ 需要「史莱姆区块」(`chunkCoin`) ∧ 实体 rand 1/10 ∧ y<40，否则 `:361 return false`
- 同文件 `:45-52` 的设计注释与提交信息（`771ed92 B-52 natural ooze spawn … getCanSpawnHere bypasses slime-chunk`）都声称要绕开史莱姆区块，**实际未绕开**：`super` 解析到 `EntitySlime` 而非 `EntityLiving`
- 复核 `ETIMSpawnCycle.java:883` `ok = proto.getCanSpawnHere() && proto.isNotColliding();` 失败**静默**返回 false ⇒ 本窗只能从「accept 里 0 条 ooze」间接看到该分支，日志面无直接拒因

量化解释：3 个窗口的房间落在非史莱姆区块时，通过率被区块币砍为 0；即使落在史莱姆区块，仍要再乘实体 rand 1/10 与 weight 3.7% ⇒ 期望值 ≈ 0.27 只/2,752 accept，与实测 0 只完全自洽。

### 分级

- **A-B52b-1**（面失守）：`ETIMEntityOoze.getCanSpawnHere()` 覆写未达成「非史莱姆区块也可自然生成」的设计意图，实际继承 `EntitySlime` 的区块币；证据＝源码 3 处锚 + 2,752 次自然 accept 0 只 + 同坐标 spawnpick 4% 正对照。**未改产品码、未 build**（判窗纪律）。
- **B-B52b-1**：B-52 判窗的 W1 走 `/etest spawnpick`（`ETIMEntityOoze` 池），该通道**不经过** `getCanSpawnHere`（`CommandDevTest.java:811-829` 直调 `pickSpawn`），因此 B-52 的 PASS 未覆盖本面；本窗即其补证缺口。
- **C-B52b-1**：`gateLogBudget`（=128）耗尽后 ooze-gate 静默，房内「无 gate 行」不可作「未被抽中」的判据。
- **C-B52b-2**：三窗 `accept` 2,752 次里 Slime 亦 0 只（同样被区块币挡），可作旁证但不能单独定谳。
- **C-B52b-3**：`_b52-w5d.js` 的 spawnpick 属诊断，按工单不得充当自然正证；此处仅作「池＋闸可达」的对照。
- **C-B52b-4**：w5b/w5c 两世界为补臂新建并保留（`run/w-b52-w5b`、`run/w-b52-w5c`），另 `w-b52-w5` 为早期探测世界。
- **C-B52b-5**：`bot` 安全位与房间同区块群，间隔 ≥40 格；本窗未观察到 `reject too-close` 类行。

## §4 收口

- 世界：`run/w-b52-w5b`（两窗）、`run/w-b52-w5c`（补臂）、`run/w-b52-w5`（早期探测）全部保留，未删
- cfg / props：SHA 起收同（见 §0），`mobDebugLog` 已回 `false`
- crash 24→24、port 0、HEAD `771ed92` 窗内 0 提交、jar mtime 未变（0 rebuild）
- 结论：**正证 NO**；根因 A 级定谳（`super` 仍为 `EntitySlime`，史莱姆区块币未绕开）
- 建议（供主会话裁定，本窗不执行）：把 `super.getCanSpawnHere()` 换为 `EntityLiving` 级别的准入体（或显式复制 1.12 `EntityLiving.getCanSpawnHere` + `EntityMob` 光照判定），再以本窗同几何复验；亦可先按世界种子算史莱姆区块做**对照实验**以进一步确认区块币假设（本窗未做）

## 字节规格

- 本文件：`8257` B / `112` 行（UTF-8 无 BOM、LF）
- 判据文件 SHA-256：jar `7B7071A498D0F40568DD16492630CA4CAD35EF5E70ACBFBA6FC5D3BCD978A6CF`；cfg `71EA288BA2AD1148A59702F93D726BC4EE5BFBCE251EB64FD2BEBA333751D2CD`；props `E3DE4341106D724B27D79BEF00CAD33E5D59F5393959C155B470907A633D4E36`
