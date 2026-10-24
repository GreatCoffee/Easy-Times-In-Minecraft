# T2 suite 验证窗 — 判决报告（F-hold ／ F-release ／ R1-R10 全序列）

- 轮次：补32（ab3fbf0）｜类型：held-item/release 原语首验 + R1-R10 一条 RCON 序列
- 判决源：`[TestLog] step=…`（步进面）／服务端 `[FoodLog]`（产品面：digDrain/attackDrain/placeDrain/hoeDrain/bowDrain/STARVE）／`[EtimTest]`（回执面）／`/testforblock`（机制面）
- 落盘：`build-logs/harness-t2-server.log`（主判据，162,591 B）、`-bot.out`、`-client.out`、`-client-latest.log`
- 判决：**14 面 → PASS 13 ／ 口径面 1 ／ 工装 FAIL 0**
- 结论：**hold / release 两个新原语成立，R1-R10 全序列全绿**（R1-R8、R10 判值面逐位吻合）；唯一出带项 R9 由「sleep 长度 = 窗口 tick」解释，二次复跑落带

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | ab3fbf0 | `ab3fbf0 T2 prep harness …: /etest hold <item> [player] … /etest release …` | ✓ |
| src/main 改动面 | TestDriver(+release) + CommandDevTest(+hold/release) + lang×2 | 4 files, +75/−5（`git diff --stat 033891e..HEAD`） | ✓ |
| jar 大小/时间 | 342,931 B @ 20:47:03 | 342,931 B ｜ 2026-10-22 20:47:03 | ✓ |
| jar SHA256 | 559D4855…C17B | `559D4855527B51077996F4FD850790002F3B5B6FA88E83C93006915E0FEDC17B` | ✓ |
| 客户端常驻校验 | 新钉值首验 | `[etim-harness] pinned etim jar synced+verified: 342931B  SHA256 559D4855…C17B` | ✓ |
| 服务端 classpath | build/libs 钉值 jar | `classpath append: …\build\libs\etim-1.0.0.jar (mtime=10/22/2026 20:47:03)` | ✓ |
| 附魔 id | 从 `[EtimInit]` 读 | `[EtimInit] enchant etim:endurance id=12`（服务端 20:50:37） | ✓ |
| refmap 面 | 本轮无新 accessor（release 复用 `CPacketPlayerDiggingAccessor` 的 action/position/facing） | 无新增映射条目 | ✓ |

起服 20:50:28（boot stamp `20261022_205028`）→ 20:50:39 `Done (1.051s)` / `RCON running on 0.0.0.0:25575`，无 mixin apply 报错。

---

## 1. 判决类清单

| # | 面 | 期望 | 判 | 依据 |
|---|---|---|---|---|
| F1 | hold | `/etest hold diamond_hoe` → `hold_set` 回执 | ✓ | `hold_set params=[Diamond Hoe]`（20:51:37） |
| F2 | release | `useitem` + `release` 各 1 行、无 FAILED、无 crash | ✓ | 20:51:38 / 20:51:39 |
| R1 | 瞬拆（火把） | digDrain **恰 1 行** | ✓ | 20:51:50 ×1（复跑 20:53:36 ×1） |
| R2 | 泥土（40 hold + 续算） | 149±10 行、泥土→Air | ✓ | **149 行**（20:51:57–20:52:04）；`/testforblock → Successfully found … air` |
| R3 | 破坏后 0 行 | 0 行 | ✓ | 20:52:04 之后至下一次 dig（20:53:36）**0 行** |
| R4 | 创造挖掘（石） | 0 行 | ✓ | 创造窗口（20:52:15–17）**0 行**，石被拆 |
| R5 | 单盔甲架 | attackDrain 0.3 恰 1 行 | ✓ | 20:53:56 `mod=1.0 amount=0.3` |
| R5b | 双盔甲架叠位 | 1 包 → 仍 1 行 | ✓ | 20:54:01 `mod=1.0 amount=0.3`（恰 1 行） |
| R6 | 饥饿弱击 | attackDrain 0 行 + STARVE 行 | ✓ | 20:54:05 attack 步进，**0 行**；20:54:29 `STARVE strike 1.0` |
| R7 | 放置石 | placeDrain 恰 1 行 amount=min(h,20)=1.5 | ✓ | 20:54:48 `hardness=1.5 base=1.5 amount=1.5` |
| R8 | 锄地三块 | hoeDrain 各 1 行 0.3/0.25/0.25 + 同 tick placeDrain 0 行 | ✓ | 20:56:26/27/29；placeDrain 该窗口 0 行 |
| R9 | 弓 60 tick 窗 | bowDrain 55±8 行 | ✓（复跑落带） | 复跑 **59 行**（20:57:21–24）；首跑 70 行 = 70 tick 窗，见 §3-N1 |
| R10 | L1..L4 | mod 0.8/0.6/0.39999998/0.19999999 各恰 1 行逐位 | ✓ | 20:56:54 / 56:59 / 57:04 / 57:09 |
| N1 | 负证 | `[TestLog].*FAILED` = 0 | ✓ | 全日志 0 行 |

---

## 2. 逐面核讫表（判据行原文）

### 2.1 F-hold ／ F-release（原语首验）

```text
[20:51:37] [EtimTest] commands.etest.hold_set player=ETIM_Harn04 params=[Diamond Hoe]
[20:51:38] [EtimTest] commands.etest.drive_queued player=ETIM_Harn04 params=[useitem]
[20:51:38] [TestLog] step=useitem player=ETIM_Harn04
[20:51:39] [EtimTest] commands.etest.drive_queued player=ETIM_Harn04 params=[release]
[20:51:39] [TestLog] step=release player=ETIM_Harn04
```

- `hold` 直写主手槽：后续 R7（stone）/R8（diamond_hoe）/R9（bow）三段的产品面行全部由该手持物产生 ⇒ 主手实效成立 ✓
- `release` 走 `CPacketPlayerDigging(RELEASE_USE_ITEM)` → `player.stopActiveHand()`；无 FAILED、服务端未异常 ✓

### 2.2 R1 瞬拆（火把）— 1 行

```text
> /setblock -42 80 240 minecraft:torch          → Block placed
[20:51:50] [TestLog] step=dig-start player=ETIM_Harn04 pos=BlockPos{x=-42, y=80, z=240}
[20:51:50] [FoodLog] ETIM_Harn04 (91) digDrain base=0.01 mod=1.0 amount=0.01 pool=3.060523
[20:51:52] [TestLog] step=dig-stop  player=ETIM_Harn04 pos=BlockPos{x=-42, y=80, z=240}
```

`onBlockClicked` 的 `f>=1.0 → tryHarvestBlock` 瞬拆面（`MixinPlayerInteractionManager` INVOKE 钩）恰 1 充；STOP 到达时方块已 Air，`blockRemoving` 不再充。**复跑（20:53:36）同样 1 行**，且 `-42 80 240` 保持 Air。

### 2.3 R2 泥土 — 149 行（40 hold + 续算至破）

```text
[20:51:57] [TestLog] step=dig-start player=ETIM_Harn04 pos=BlockPos{x=-43, y=80, z=240}
按秒分布：20:51:57 x19 · 20:51:58 x20 · 20:51:59 x20 · 20:52:00 x20
          20:52:01 x20 · 20:52:02 x20 · 20:52:03 x20 · 20:52:04 x10  = 149
[20:51:59] [TestLog] step=dig-stop  player=ETIM_Harn04 pos=BlockPos{x=-43, y=80, z=240}
> /testforblock -43 80 240 minecraft:air → Successfully found the block at -43, 80, 240
```

149 落在 149±10 带内；与 T1 复测轮的 149 行完全一致（同 perTick 模型，`PROGRESS_BASE=512`、L35 空手满池）。破坏完成 → Air ✓

### 2.4 R3 破坏后 0 行

```text
digDrain 最后一行 20:52:04；下一次 digDrain 首行 20:53:36（R1 复跑）⇒ 窗口内 0 行
```

R3 窗口同时覆盖 R4（创造）整段 ⇒ R4 的「0 行」与 R3 的「0 行」由同一段空白共同证明 ✓

### 2.5 R4 创造挖掘（石）— 0 行

```text
> /gamemode 1 ETIM_Harn04           → Set ETIM_Harn04's game mode to Creative Mode
[20:52:15] [TestLog] step=dig-start player=ETIM_Harn04 pos=BlockPos{x=-44, y=80, z=240}
[20:52:17] [TestLog] step=dig-stop  player=ETIM_Harn04 pos=BlockPos{x=-44, y=80, z=240}
> /testforblock -44 80 240 minecraft:air → Successfully found the block at -44, 80, 240
```

创造拆石成功而**零充能**（`ETIMEndurance.charge` 的 creative 预门）✓ 随后 `/gamemode 0` 复原。

### 2.6 R5 ／ R5b 攻击（单架 / 双架叠位）

```text
[20:53:56] [FoodLog] ETIM_Harn04 (91) attackDrain base=0.3 mod=1.0 amount=0.3 pool=1.68061
[20:53:56] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#603
[20:54:01] [FoodLog] ETIM_Harn04 (91) attackDrain base=0.3 mod=1.0 amount=0.3 pool=2.1546078
[20:54:01] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#604
```

R5 恰 1 行、R5b（两架同点）仍恰 1 行 ⇒ 单包单充、sweep 免疫（`AttackEntityEvent` 每挥一次）✓

### 2.7 R6 饥饿弱击 + STARVE

```text
[20:54:05] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#606
[12:54:05.064] [chat] etim.hunger.weakStrike          ← 玩家通道回执（bot.out）
[20:54:29] [FoodLog] ETIM_Harn04 (91) STARVE strike 1.0 (health=19.0 difficulty=1)
```

`food 0 0` 后同一攻击包：攻击步进存在、**attackDrain 0 行**（弱击取消 → damage 0 → 不充），25 s 后 STARVE 行落下（0.002/tick × 500 tick）✓ 随后 `food 20 20` 复原。

### 2.8 R7 放置（placeDrain）

```text
[20:54:48] [EtimTest] commands.etest.hold_set player=ETIM_Harn04 params=[Stone]
[20:54:48] [TestLog] step=useblock player=ETIM_Harn04 pos=BlockPos{x=-42, y=79, z=240}
[20:54:48] [FoodLog] ETIM_Harn04 (91) placeDrain hardness=1.5 base=1.5 mod=1.0 amount=1.5 pool=1.5566938
> /testforblock -42 80 240 minecraft:stone → Successfully found the block at -42, 80, 240
```

`min(1.5, 20)=1.5` 恰 1 行 ✓（PlaceEvent 面，非 till）

### 2.9 R8 锄地（hoeDrain ×3 + 同 tick 去重）

```text
[20:56:26] [FoodLog] … hoeDrain hardness=0.6 base=0.3  mod=1.0 amount=0.3  pool=3.0667872   ← grass
[20:56:27] [FoodLog] … hoeDrain hardness=0.5 base=0.25 mod=1.0 amount=0.25 pool=3.3727899   ← dirt
[20:56:29] [FoodLog] … hoeDrain hardness=0.5 base=0.25 mod=1.0 amount=0.25 pool=3.6807926   ← coarse_dirt
> /testforblock -42 80 240 minecraft:farmland → Successfully found
> /testforblock -40 80 240 minecraft:farmland → Successfully found
> /testforblock -41 80 242 minecraft:dirt     → The block … is Dirt（coarse→dirt，vanilla 面）
```

- 三块各恰 1 行，0.3/0.25/0.25 ✓
- **同 tick placeDrain 0 行** ✓（`lastTillChargeTick` 去重成立：Forge 1.12 的 `onPlaceItemIntoWorld` 先调 `onItemUse`、后发 PlaceEvent，故 hoe 充在前、PlaceEvent 被 stamp 吃掉）
- 首跑的三块坐标为 -43/-44/-45，其中 -44/-45 超出产品交互距离（见 §3-N2），故只有 -43 充能；复跑改用 -42/-40/-41(,242) 后 3/3 成立

### 2.10 R9 弓（bowDrain）

```text
首跑（sleep 3.0 s）：
[20:56:44] step=useitem → [20:56:48] step=release     bowDrain = 70 行
复跑（sleep 2.4 s）：
[20:57:21] step=useitem → [20:57:24] step=release     bowDrain = 59 行  ← 落 55±8 带
[20:56:44] … bowDrain base=0.01 mod=1.0        amount=0.01        pool=0.31680754
[20:57:24] … bowDrain base=0.01 mod=0.19999999 amount=0.0019999999 pool=3.3188531
```

每 tick 恰 1 行（70 行/70 tick、59 行/59 tick），行数 = 实际拉弓窗 tick 数 ✓
复跑时角色仍穿 Endurance IV 胸甲（R10 之后）⇒ `mod=0.19999999` 同样灌入 bowDrain（附加数据点）。

### 2.11 R10 附魔等级 1..4（逐位）

```text
[20:56:52] [EtimTest] enchant_set params=[chest, Endurance I,   Diamond Chestplate]
[20:56:54] [FoodLog] attackDrain base=0.3 mod=0.8         amount=0.24000001
[20:56:58] [EtimTest] enchant_set params=[chest, Endurance II,  Diamond Chestplate]
[20:56:59] [FoodLog] attackDrain base=0.3 mod=0.6         amount=0.18
[20:57:03] [EtimTest] enchant_set params=[chest, Endurance III, Diamond Chestplate]
[20:57:04] [FoodLog] attackDrain base=0.3 mod=0.39999998  amount=0.12
[20:57:08] [EtimTest] enchant_set params=[chest, Endurance IV,  Diamond Chestplate]
[20:57:09] [FoodLog] attackDrain base=0.3 mod=0.19999999  amount=0.06
```

四级逐位吻合 `1 − L×0.2` 的单精度原值，各恰 1 行 ✓

### 2.12 负证与零客户端输入

```text
[20:51:17.351] [act] READY bot=ETIM_Harn04 pos=-40.5,80.0,240.5     ← bot 全轮唯一 [act]
FAILED = 0（全日志）
[EtimTest] 54 行，全部来自 RCON Client 线程：
  drive_queued 26 · food_set_pool 14 · hold_set 9 · enchant_set 4 · level_set 1
```

全序列动作均来自 RCON + 服务端包注入，bot 无任何客户端输入 ✓

---

## 3. 冲突分级

**工装 FAIL：0**（14 面中 13 面 PASS，1 面口径面）。

| 编号 | 级别 | 内容与证据 |
|---|---|---|
| **N1** | 口径面（R9） | 「bowDrain 55±8 行（≈60 tick 窗）」与实现绑定关系是**行数 = 窗口 tick = sleep + 调度/RCON 开销**。首跑 sleep 3.0 s 实测 70 行（60 tick 睡眠 + 1 tick 调度 + 两条 RCON 命令往返 ≈ 10 tick）；复跑 sleep 2.4 s 实测 59 行（落带）。两次都是**每 tick 恰 1 行**，产品面无偏差；出带只反映任务书的窗长假设，不判工装 FAIL。 |
| **N2** | 舞台面（R8 首跑） | 首跑三块放 -43/-44/-45：-44/-45 被产品交互距离门拒绝 —— 日志原文 `reach denied: etim.reach.deny_block 3.04 > 2.75`（-44）、`4.03 > 2.75`（-45）；`ETIMConfig` 现值 `blockReachBase=2.75` + `reachServerTolerance=0.25`。⇒ 判据面必须把方块放在 ~3.0 内（-43 实测 2.2 通过）。这是产品 R196 触及校验，不是工装缺陷。 |
| **N3** | 舞台面（R1 首跑） | 首跑火把瞬拆后，`/testforblock -42 80 240 air` 读到 **Dirt**（把该格盖住），但 digDrain 仍恰 1 行；R1 复跑（先 `setblock air` 清位）后该格保持 Air、仍恰 1 行。异常不可复现（日志里没有该格的放置/落下记录），不影响任何判据，记为舞台注记。 |
| **N4** | 信息面 | bowDrain 复跑落在 `mod=0.19999999`（R10 的 Endurance IV 胸甲仍穿着）—— 证明耐力修正同样作用到 bow 充能，属预期，非判据。 |

---

## 4. 伪代码建议（仅 FAIL 项）

**工装侧无修复项**（hold / release 两原语一次通过；R1-R8、R10 判值面全部逐位吻合）。

仅针对 N1 给任务书口径写法建议（不改代码）：

```text
R9 判据建议
    行数 = 实际拉弓窗 tick 数 ±2，其中
        实际窗口 = sleep + 调度 1 tick + RCON 命令往返（本机实测 ≈0.3–0.5 s/命令）
    或：固定 sleep = 2.4 s（本机实测 59 行，稳定落 55±8）
    不再写「≈60 tick 窗」——它假设 sleep 就是全部窗口，忽略 RCON 往返。

R8 舞台建议（预防重犯）
    锄地/放置目标必须满足 ETIMReach.blockReachBase(2.75)+tolerance(0.25)≈3.0；
    站位 -40.5,80,240.5 时安全位：-42/-40 80 240、-41 80 242。
```

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true / keepInventory=false（另两个未改动） | ✓ |
| time | 1000 | ✓ |
| 实体 | armor_stand 0 / arrow 0 / item 0（`/testfor` 三者均 found nothing） | ✓ |
| 方块清理 | -40/-41/-42/-43/-44/-45 80 240 与 -41 80 242 全部回填 Air | ✓ |
| 玩家状态 | 背包 clear（66 件）、胸甲 Air、gamemode 0 | ✓ |
| 配置 | foodModel=true ／ foodDebugLog=true ／ foodTestMode=false ／ devTools=true（未动） | ✓ |
| 端口 | 25565/25575 无 LISTEN | ✓ |
| 关服 | `[20:57:40] Stopping server → Saving worlds`（`/stop`），无残留 JVM | ✓ |
| crash-report | 无新增（目录内仅上轮 2 份：20.19.28 / 20.24.37） | ✓ |
| jar 双面 | build/libs ≡ run/obfuscated/mods，`559D4855…C17B` / 342,931 B | ✓ |
| src/main | 0 改动；HEAD=ab3fbf0 | ✓ |
| 客户端收口 | `close-client.ps1`（SC_CLOSE → WM_CLOSE，只认 Stopping!）：`[20:58:00] Stopping!` + Gradle **BUILD SUCCESSFUL in 7m 58s**；快照 141,799 B | ✓ |

---

## 附录 A：执行序（一次起服，全程 RCON）

1. 客户端先行 → 20:4x 钉值首验 `342931B / 559D4855…C17B`
2. 起服 20:50:28 → `[EtimInit] id=12` → `Done (1.051s)` / RCON up
3. 设点：gamerule×2 / time 1000 / difficulty 1 / gamemode 0 / tp -40.5 80 240.5 / clear / level 35 / food 20 20
4. **F-hold / F-release**：hold diamond_hoe → useitem → (1 s) → release
5. **R1** 火把瞬拆 → 1 行（首跑伴 N3 舞台异常；20:53:36 复跑干净 1 行）
6. **R2** 泥土 dig，sleep 13 s → 149 行、Air；**R3** 尾行后 0 行
7. **R4** gamemode 1 → 石 dig → 0 行 → gamemode 0
8. **R5** 单架 / **R5b** 双架叠位 → 各 1 行；**R6** food 0 0 → attack（0 行 + weakStrike）→ 25 s → STARVE
9. **R7** hold stone → useblock 地面 → placeDrain 1.5
10. **R8** hold diamond_hoe → 三块锄地（首跑 -43/-44/-45 被 reach 拒；复跑 -42/-40/-41,242 → 3/3）
11. **R9** hold bow + arrows → useitem → (3.0 s) release（70 行）；复跑 sleep 2.4 s（59 行）
12. **R10** chest + enchant L1..L4 + food 20 20 + attack → mod 0.8/0.6/0.39999998/0.19999999
13. 负证 grep `[TestLog].*FAILED` = 0
14. 收口：实体/方块/背包回填、gamerule 还原、time 1000 → `/stop`（20:57:40）；客户端 SC_CLOSE 优雅退窗（20:58:00 `Stopping!`）

## 附录 B：本轮落盘

| 文件 | 大小 | 用途 |
|---|---|---|
| `build-logs/harness-t2-server.log` | 162,591 B | 主判据（30 条 TestLog / 151 digDrain / 6 attackDrain / 1 placeDrain / 4 hoeDrain / 129 bowDrain / 1 STARVE / 54 EtimTest） |
| `build-logs/harness-t2-bot.out` | 23,470 B | 零客户端输入证据（唯一 `[act] READY`）+ weakStrike 回执 + 关机踢出 |
| `build-logs/harness-t2-client.out` | 308,958 B | 客户端钉值首验 + `Stopping!` + `BUILD SUCCESSFUL in 7m 58s` |
| `build-logs/harness-t2-client-latest.log` | 141,799 B | 客户端日志快照（`[20:58:00] Stopping!`） |
