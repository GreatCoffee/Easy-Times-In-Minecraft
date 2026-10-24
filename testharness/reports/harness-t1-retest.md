# T1 修复批复测窗 — 判决报告（F1 T-dig ／ F2 T-useblock ＋ 抽样回归）

- 轮次：补31（033891e）｜类型：上轮 2 个 FAIL 面的修复复测 + R1/R10 抽样回归
- 判决源：`[TestLog] step=…`（步进面）／服务端 `[FoodLog]`（产品面）／`[EtimTest]`（回执面）／`/testforblock`（机制面）
- 落盘：`build-logs/harness-t1-retest-server.log`（主判据，116,035 B）、`-bot.out`、`-client.out`、`-client-latest.log`
- 判决：**10 项判据 → PASS 8 ／ ✗ 2**；两条 ✗ 均为**任务书预计算与 1.12 服务端破坏路径／本产品挖掘模型冲突**（非工装缺陷），详见 §3
- 工装面结论：**上轮两个 FAIL 面全部修复**（dig/useblock 走到 vanilla 包处理器、无 crash、无 FAILED）

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | 033891e | `033891e T1 fix (verdict harness-t1-verdict.md, 2 FAIL same root)…` | ✓ |
| src/main 改动面 | TestDriver + 2 accessor + mixins.etim.json | 4 files, +102/−9（TestDriver / CPacketPlayerDiggingAccessor / CPacketPlayerTryUseItemOnBlockAccessor / mixins.etim.json） | ✓ |
| jar 大小/时间 | 342,230 B @ 20:28:48 | 342,230 B ｜ 2026-10-22 20:28:48 | ✓ |
| jar SHA256 | 783B7747…C6DC8 | `783B7747E92748929B17FB097989DDE715346198B435CF677E93F5DFA17C6DC8` | ✓ |
| 客户端常驻校验 | 新钉值首验 | `[etim-harness] pinned etim jar synced+verified: 342230B  SHA256 783B7747…C6DC8`（20:32:44） | ✓ |
| 服务端 classpath | build/libs 钉值 jar | `classpath append: …\build\libs\etim-1.0.0.jar (mtime=10/22/2026 20:28:48)` | ✓ |
| 附魔 id | 从 `[EtimInit]` 读 | `[EtimInit] enchant etim:endurance id=12`（服务端 20:35:25 / 客户端 20:32:44） | ✓ |
| **refmap 预检**（起服前） | accessor → SRG 字段与上轮判决表逐一吻合 | 见下表 | ✓ |

起服前直接从 `build/libs/etim-1.0.0.jar` 内 `mixins.etim.refmap.json` 取值核对：

| accessor 字段 | refmap（SRG） | 上轮判决表 | 判 |
|---|---|---|---|
| `position`（Digging） | `field_179717_a:Lnet/minecraft/util/math/BlockPos;` | `lp/a = field_179717_a` | ✓ |
| `facing`（Digging） | `field_179716_b:Lnet/minecraft/util/EnumFacing;` | `lp/b = field_179716_b` | ✓ |
| `action`（Digging） | `field_149508_e:Lnet/minecraft/network/play/client/CPacketPlayerDigging$Action;` | `lp/c = field_149508_e` | ✓ |
| `position`（TryUseItemOnBlock） | `field_179725_b` | `ma/a` | ✓ |
| `placedBlockDirection` | `field_149579_d` | `ma/b` | ✓ |
| `hand` | `field_187027_c:Lnet/minecraft/util/EnumHand;` | `ma/c` | ✓ |
| `facingX/Y/Z` | `field_149577_f` / `field_149578_g` / `field_149584_h` | `ma/d..f` | ✓ |

---

## 1. 判决类清单

| # | 判据 | 期望 | 判 | 依据 |
|---|---|---|---|---|
| D1 | T-dig 步进 | `step=dig-start` / `step=dig-stop` 各 1 行，间隔 ≈40 tick | ✓ | 20:36:25→20:36:27；20:38:41→20:38:43（各 2 s） |
| D2 | T-dig 充能行 | 每活动 tick 恰 1 行、破坏后 0 行 | ✓ | tallgrass 恰 40 行 = 40 个 hold tick；破坏后（20:38:43 之后）0 行 |
| D3 | T-dig 行数带 | 任务书预计算 ≈15±2 行 | ✗ | 实测 149（泥土）／40（tallgrass）——口径不成立，见 §3-N1 |
| D4 | T-dig 破坏 | 泥土服务端破碎 | ✓ | 泥土 testforblock → Air；tallgrass 同刻 → Air |
| D5 | T-dig 破坏时机 | 任务书：dig-stop **前**破碎 | ✗ | 泥土在 STOP 后 ≈110 tick 破；tallgrass 在 STOP 当 tick 破——1.12 结构上不可能「STOP 前」，见 §3-N2 |
| D6 | T-dig 健壮性 | 无 crash / 无 `FAILED` | ✓ | 无 crash-report；`[TestLog].*FAILED` = 0 |
| D7 | T-useblock | `step=useblock` 恰 1 行、无 FAILED、无 crash | ✓ | 20:38:55 |
| D8 | R1 抽样（attack） | `step=attack` 1 行 + `attackDrain base=0.3 mod=1.0 amount=0.3` 1 行 | ✓ | 20:38:59 |
| D9 | R10 抽样（L2） | `attackDrain base=0.3 mod=0.6 amount=0.18` 恰 1 行 | ✓ | 20:39:03 |
| D10 | 负证 | 全程 `[TestLog].*FAILED` = 0 行 | ✓ | `FAILED lines = 0` |

---

## 2. 逐方法核讫表（判据行原文）

### 2.1 F1 T-dig — 探针 A：泥土（任务书指定方块）

```text
[20:36:25] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-start player=ETIM_Harn04 pos=BlockPos{x=-42, y=80, z=240}
[20:36:25] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (93) digDrain base=0.01 mod=1.0 amount=0.01 pool=1.7183604
  …（同形态连续 149 行，pool 每行 +0.012）…
[20:36:27] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=dig-stop player=ETIM_Harn04 pos=BlockPos{x=-42, y=80, z=240}
[20:36:33] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (93) digDrain base=0.01 mod=1.0 amount=0.01 pool=3.49437
```

- 步进面：两个 `[TestLog]` 行相距 40 tick（2 s，`DIG_HOLD_TICKS=40`，delay 1 → 41）✓
- 注入面：`processPlayerDigging` 正常进入（上轮此处 `NoSuchMethodError` 掀服），**修复成立** ✓
- 充能面：`digDrain base=0.01 mod=1.0 amount=0.01`，一 tick 一行，共 149 行；破坏后（20:36:33 之后整段到现在）**0 行** ✓
- 破坏面：中途探针 `/testforblock -42 80 240 air`（约 +1.5 s）仍为 Dirt；收尾探针 → **Air**，即破坏发生在 STOP 之后（见 §3-N2 的机制说明）
- crash 面：无异常栈、无 crash-report、`FAILED=0` ✓

### 2.2 F1 T-dig — 探针 B：tallgrass（口径控制组，用于钉死行数语义）

```text
> /setblock -43 80 240 minecraft:tallgrass 1   → Block placed
> /testforblock -43 80 240 minecraft:tallgrass → Successfully found the block
[20:38:41] [TestLog] step=dig-start player=ETIM_Harn04 pos=BlockPos{x=-43, y=80, z=240}
  …（digDrain ×40）…
[20:38:43] [TestLog] step=dig-stop  player=ETIM_Harn04 pos=BlockPos{x=-43, y=80, z=240}
> /testforblock -43 80 240 minecraft:air     → Successfully found the block
```

- 全日志 `digDrain` 189 行 − 泥土 149 行 = **恰 40 行**
- 40 行 = `DIG_HOLD_TICKS` 的 40 个 hold tick ⇒ **一个活动 tick 恰一行，无跳 tick、无「5 tick 延迟不充能」**
- STOP 当 tick 即破碎（`f@STOP = perTick×41 ≈ 6.8 ≥ 0.7`）⇒ 破坏后 0 行
- 结论：digDrain 行数由**hold 段长度**与**续算段长度**决定，与「方块本身需要几 tick 破」不是同一条时间线

### 2.3 F2 T-useblock

```text
[20:38:55] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=useblock player=ETIM_Harn04 pos=BlockPos{x=-42, y=80, z=240}
```

恰 1 行、其后无 `FAILED`、服务端未停机（上轮同一步 `NoSuchMethodError` 掀服）⇒ **修复成立** ✓
赤手对泥土空转（语义空转不判值，按任务书口径）。

### 2.4 R1 抽样回归：T-attack

```text
[20:38:59] [FoodLog] ETIM_Harn04 (93) attackDrain base=0.3 mod=1.0 amount=0.3 pool=0.5424903
[20:38:59] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#616
```

`step=attack` 恰 1 行 + `mod=1.0 / amount=0.3` 恰 1 行（无附魔态）✓

### 2.5 R10 抽样回归：L2

```text
[20:39:02] [RCON Client #36/INFO] [EtimTest] commands.etest.enchant_set player=ETIM_Harn04 params=[chest, Endurance II, Diamond Chestplate]
[20:39:03] [FoodLog] ETIM_Harn04 (93) attackDrain base=0.3 mod=0.6 amount=0.18 pool=0.8864882
[20:39:03] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#616
```

`mod=0.6 / amount=0.18` 恰 1 行，单精度原值口径同前 ✓

### 2.6 回执与零客户端输入

- `[EtimTest]` 12 行，全部来自 RCON Client 线程：`level_set` 1 ／ `food_set_pool` 5 ／ `drive_queued` 5（dig×2、useblock×1、attack×2）／`enchant_set` 1
- bot 全轮 `[act]` **仅 1 条**：`[12:36:03.202] [act] READY bot=ETIM_Harn04 pos=-40.5,80.0,240.5`；收口由服务端 `/stop` 踢出（`multiplayer.disconnect.server_shutdown`）
- 客户端全程未进世界（只做钉值首验），所有动作均由 RCON + 服务端包注入产生 ✓

### 2.7 全量步进行（7 行）

```text
20:36:25 step=dig-start  -42,80,240      20:36:27 step=dig-stop  -42,80,240
20:38:41 step=dig-start  -43,80,240      20:38:43 step=dig-stop  -43,80,240
20:38:55 step=useblock   -42,80,240
20:38:59 step=attack     Armor Stand#616
20:39:03 step=attack     Armor Stand#616
```

无 `NO_TARGET`、无 `SKIPPED`、无 `FAILED`、无 `ERROR=` ✓

---

## 3. 冲突分级

**工装 FAIL：0**。下列 2 条 ✗ 按任务书字面口径成立，但根因都**不在工装**，属任务书预计算与 1.12 服务端破坏路径／本产品挖掘模型冲突。

| 编号 | 级别 | 内容与证据 |
|---|---|---|
| **N1** | 口径冲突（D3） | **「digDrain ≈15±2 行」不成立**。行数 = hold 段 + 续算段的活动 tick 数：单 START 包下 hold 固定 40 tick（`DIG_HOLD_TICKS=40`），tallgrass 实测**恰 40 行**；泥土因未在 hold 内破，续算到破为止，实测 149 行。任务书把「客户端预测 ~15 tick 破」当成了服务端包时间线，故 15±2 无法在任何方块上出现（除非改 `DIG_HOLD_TICKS`）。 |
| **N2** | 口径冲突（D5） | **「dig-stop 前破碎」在 1.12 服务端结构上不可能**。`PlayerInteractionManager.onBlockClicked`（生存分支）只置 `isDestroyingBlock`/`initialDamage`；`updateBlockRemoving` 的 `isDestroyingBlock` 分支**只发 `sendBlockBreakProgress`，从不调 `tryHarvestBlock`**；真正的破坏发生在 `blockRemoving`（STOP 包处理器）里 `f≥0.7`，否则置 `receivedFinishDiggingPacket` 续算到 `f≥1.0` 才破。⇒ 任何非瞬拆方块都只能在 STOP 当 tick 或其后破。 |
| **N3** | 收口例外 | 本轮首个「按收口纪律关客户端」的尝试暴露脚本真实缺陷：只发 WM_CLOSE 会把 LWJGL2 窗口销毁，但游戏循环仍停在 `Display.sync`（`jstack`：`Client thread → Minecraft.func_71411_J → Display.sync`），窗口已消失、日志停在 20:32:50、**无 `Stopping!`**，Gradle 落 `BUILD FAILED`（进程被强杀）。脚本已改：先 `WM_SYSCOMMAND/SC_CLOSE`（真实点 X 语义）→ 再 `WM_CLOSE` → **只以日志出现 `Stopping!` 为成功判据**，否则 exit 1（不再静默当成功）。本轮因此强杀 `pid=17060` 一次，已记录。 |
| **N4** | 世界注记 | 收口把 `doMobSpawning` 还原 true 后约 2 s 内自然刷出 6 只僵尸（`/kill @e[type=zombie]` 在还原前为 0，`/testfor` 在还原后为 6）；属正常刷新，非工装实体。armor_stand 已清零。 |

### 3.1 N1/N2 的机制核算（可复核）

| 量 | 值 | 来源 |
|---|---|---|
| 泥土 hardness | 0.5 | `ETIMMining.BLOCK_HARDNESS` 行 `put("dirt", 0.5F, 0)` |
| 空手 str（L35、满池） | 1.0 × (1 + 35 × 0.02) = 1.7 | `ETIMMining.getCurrentPlayerStrVsBlock`（`miningSpeedPerLevel=0.02`） |
| 进度基数 | 512 | `ETIMMining.PROGRESS_BASE = 512.0F` |
| 泥土 perTick | (1.7 / 0.5) / 512 ≈ **0.0066** | `getProgressPerTick`（经 `MixinBlock` 挂在 `Block.getPlayerRelativeBlockHardness`） |
| STOP 时 f | 0.0066 × 41 ≈ **0.27 < 0.7** ⇒ 不在 STOP 处破 | `PlayerInteractionManager.blockRemoving` |
| 续算破点 | 1 / 0.0066 ≈ **151 tick**（累计计数不重置） | `updateBlockRemoving` 的 `receivedFinishDiggingPacket` 分支 |
| tallgrass perTick | (1.7 / 0.02) / 512 ≈ **0.166** ⇒ `f@STOP ≈ 6.8 ≥ 0.7` | 同式；STOP 当 tick 破 |
| 实证对照 | 泥土 149 行 ≈ 151 tick 预测；tallgrass 40 行 = hold 40 tick | 本轮日志 |

### 3.2 「5 delay tick 不充能」的实测结论

`MixinPlayerInteractionManager` 的注释称「active-dig flags 在 vanilla re-click gap 期间为 false，故 delay tick 不充能」。本工装路径下**该 gap 不存在**：单一 START 包只调用一次 `onBlockClicked`，且 `updateBlockRemoving`（1.12 源码）里**没有 blockHitDelay 门**，`isDestroyingBlock` 整个 hold 段为 true。
实证：tallgrass 恰 40 行 / 40 hold tick（若前 5 tick 不充能应为 35 行）。⇒ 该注释只在「客户端连续重击」语境成立，本驱动不适用（不影响 R196 的「每活动 tick 恰 1 充」判据）。

---

## 4. 伪代码建议（仅 FAIL 项）

**工装侧无修复项**（D1/D2/D4/D6/D7-D10 全 PASS，两个上轮 FAIL 面已闭账）。仅针对两条口径给替代判据，供主会话裁定后回写任务书模板：

```text
D3'（digDrain 行数）
    判据 = 破坏时刻 - dig-start 时刻（±1 tick），且破坏后 0 行
    或（希望固定行数时）选 f@STOP ≥ 0.7 的方块：行数 = DIG_HOLD_TICKS ±1
    不再使用「≈15±2」——那是客户端预测值，不是服务端包时间线。

D5'（破坏时机）
    判据 = 破坏完成（STOP 当 tick 或其后），不判「早于 dig-stop」
    理由：1.12 服务端只在 blockRemoving（STOP 处理器）里 tryHarvestBlock，
          非瞬拆方块结构上不可能在 STOP 前破。

可选（若主会话要求「hold 内必破」）：
    DIG_HOLD_TICKS 由常量改为按方块算：hold = ceil(0.7 / perTick) + 2
    perTick 走 ETIMMining.getProgressPerTick（不要在本驱动里另抄一套公式）。
    注意：这是工装参数化，不是缺陷修复；改动会换 jar 指纹，需另起一轮。
```

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true / doDaylightCycle=true / doWeatherCycle=true / keepInventory=false | ✓ |
| time | 1000 | ✓ |
| 实体 | armor_stand 0（`/testfor` found nothing）；zombie 6 只（还原 doMobSpawning 后的自然刷新，见 N4） | 注记 |
| 测试方块 | -42/-43 80 240 均回填 air | ✓ |
| 配置 | foodModel=true ／ foodDebugLog=true ／ foodTestMode=false ／ devTools=true（未动） | ✓ |
| 端口 | 25565/25575 无 LISTEN | ✓ |
| 关服 | `[20:39:22] Stopping server → Saving worlds`（正常 `/stop`），无残留 JVM | ✓ |
| crash-report | 无新增（目录内仅上轮 2 份：20.19.28 dig / 20.24.37 useblock） | ✓ |
| jar 双面 | build/libs ≡ run/obfuscated/mods，`783B7747…C6DC8` / 342,230 B | ✓ |
| src/main | 0 改动；HEAD=033891e | ✓ |
| 客户端 | 20:32:34 启动 → 20:32:44 钉值首验 → 收口 WM_CLOSE 只销毁窗口未退出（N3）→ 强杀 pid=17060；日志快照 141,505 B（含 `[EtimInit] id=12`）；Gradle `BUILD FAILED in 8m 56s`（强杀所致，非编译失败） | ✗（收口例外，已记录） |

---

## 附录 A：执行序（一次起服，全程 RCON）

1. 客户端先行 → 20:32:44 钉值首验 `342230B / 783B7747…C6DC8` ✓
2. 起服 20:35:17（boot）→ `[EtimInit] id=12` → `Done (1.101s)`（mixin accessor 无 apply 报错）
3. 设点：gamerule / time / difficulty=1 / gamemode 0 / tp -40.5 80 240.5 / clear / level 35 / food 20 20
4. **F1 T-dig A**：`setblock -42 80 240 dirt` → `/etest dig -42 80 240` → 中途 `/testforblock`（Dirt）→ 收尾（Air）
5. **F1 T-dig B（口径控制组）**：`setblock -43 80 240 tallgrass 1` → `/etest dig -43 80 240` → 收尾（Air）
6. **F2 T-useblock**：`setblock -42 80 240 dirt` → `/etest useblock -42 80 240`
7. **R1**：`summon armor_stand -39.5 80 240.5` → `food 20 20` → `attack @e[type=armor_stand,c=1]`
8. **R10-L2**：`replaceitem … slot.armor.chest diamond_chestplate` → `enchant chest 2` → `food 20 20` → `attack`
9. 负证 grep `[TestLog].*FAILED` = 0
10. 收口：armor_stand/zombie kill、方块回填、gamerule×4 还原、time 1000 → `/stop`（20:39:22）

## 附录 B：本轮落盘

| 文件 | 大小 | 用途 |
|---|---|---|
| `build-logs/harness-t1-retest-server.log` | 116,035 B | 主判据（7 条 TestLog / 189 条 digDrain / 2 条 attackDrain / 12 条 EtimTest） |
| `build-logs/harness-t1-retest-bot.out` | 7,892 B | 零客户端输入证据（仅 READY 一条 `[act]`）+ 关机踢出 |
| `build-logs/harness-t1-retest-client.out` | 309,428 B | 客户端钉值首验 + `BUILD FAILED`（N3 强杀后果） |
| `build-logs/harness-t1-retest-client-latest.log` | 141,505 B | 客户端日志快照（`EtimInit id=12`；无 `Stopping!`，见 N3） |
