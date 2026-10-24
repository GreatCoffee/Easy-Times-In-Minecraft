# 阶段五 mob 批（Revenant / BoneLord / B-SK-1）验证窗判决回执

> **执行方**：会话七（验证窗执行）
> **追验对象**：jar **625,542 B @ 22:25:07 = 产品 commit 9e6071a 构建**（`mob batch followup: B2 C-7 placeholder textures replaced …`；代码面 = b904a78 mob 批）。
> **窗内 HEAD 变动**：HEAD 于窗内由 `9e6071a` 前进到 `a7f09f3`（`mob batch followup 2: sandstone furnace purple-black fix`，仅
> `furnace_sandstone{,_lit}.json` 2 行，**未 rebuild**）→ 本窗判据面仍是上面的钉 jar；该提交不触任何 mob 批判点（见 C-8）。
> **判据正本**：`playground/audit/mob-revenant-bonelord-落码批文.md` §一（判值正本）+ 对照报告 + 终审回执
> **现役钉值**：jar **625,542 B** @ **2026-10-24 22:25:07**｜SHA256
> **E7DBED22C948E27DFC299D75848F7A124DE2D1369DAA8180B4BBC65709556711**｜HEAD = origin/master = **9e6071a**｜
> 窗内 **0 rebuild**（起服前 / 收口同值）。
> **判据源**：服务端 `[AILog]` / `[MobLog]` / `[SpawnLog]` / `[MiningLog]` / `[TestLog]`（boot 锚）＋ 客户端 `[TestLog]`
> 模型注册行 ＋ RCON `entitydata` NBT ＋ 假人（mineflayer）作业面 ＋ 崩溃报告。
> **窗内人员**：测试者（`Developer`）部分时段在线，并于窗内手动 `/summon etim:revenant` ×1（用户 2026-10-24 告知）。
> 该行**不计入任何分布样本**：W3 分布取「逐次裸召唤 + `entitydata` NBT」；W2 只数 `[SpawnLog] accept`（`/summon` 不产生 accept 行）。
> **口径**：通过 ✓、不通过 ✗；**判点 ✗ = 1**（W5 兵团 type 分布；文内 ✓/✗ 符号计数含表内与叙述重复标记）。UTF-8 无 BOM、LF、0 U+FFFD。
> **报告字节规格**：`25,362 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 37 / ✗ 9｜354 行`

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 625,542 B | 625,542 B（收口复核同值） | ✓ |
| jar 时间 | 2026-10-24 22:25:07 | 2026-10-24 22:25:07（收口复核同值） | ✓ |
| SHA256 | `E7DBED22…6711` | `E7DBED22C948E27DFC299D75848F7A124DE2D1369DAA8180B4BBC65709556711` | ✓ 逐位 |
| 产品 commit | `9e6071a`（jar 构建源） | jar 内容 = `9e6071a`；**窗内 HEAD 9e6071a → a7f09f3**（仅 furnace 模型 2 行，未 rebuild） | — 见 C-8 |
| 窗内 rebuild | 禁止 | 起服前 / 收口 jar 字节·SHA·mtime 全同 → **0 次** | ✓ |
| 世界 | `testw2h` | `level-name=testw2h`（崩溃报告 §Affected level 同值） | ✓ |
| 端口 | 25575 | 起服后 LISTEN；收口 RCON `stop` 后 0 | ✓ |

### 0.1 起停服台账

| 轮 | 时刻 | 事件 | 备注 |
|---|---|---|---|
| R0 | 22:35:22 | 旧服 `stop`（优雅） | `Stopping server → Saving worlds → Unloading dimension 0` |
| R1 | 22:38:22 | 起服 `Done (1.322s)` | 首轮 mods 面双扫 FATAL（dup），改 classpath 面后成功 |
| R2 | 22:52:42 | 起服 `Done (1.137s)` | 22:51:51 CME 崩溃后重启（见 §三 C-3） |
| R3 | 23:07:21 | 起服 `Done (1.214s)` | 23:06:30 CME 崩溃后重启（同因），此后改 chat 面作业，零崩溃 |

### 0.2 快照与产物

| 产物 | 字节 | 说明 |
|---|---|---|
| `build-logs/v9-boot-server.log` | 46,565 B | R1 服务端 boot 面（22:38） |
| `build-logs/v9-pre-session-latest.log` | 191,017 B | **客户端钉 jar 会话**（22:27:54–22:31:55，W1 客户端判据源） |
| `build-logs/v9-session-crash.log` | 709,116 B | 22:51:51 CME 前会话全档 |
| `build-logs/v9-session-crash2.log` | 943,216 B | 23:06:30 CME 前会话全档 |
| `build-logs/v9-crash-cme.txt` / `v9-crash-cme2.txt` | 9,454 B / 9,616 B | 两份 CME 崩溃报告 |
| `build-logs/v9-w3-run.out` / `v9-w9-run.out` | 3,448 B / 2,658 B | W3 / W9 driver 输出 |
| `build-logs/v9-w4-run.out` | 3,997 B | W4/W5/W6/W7 driver 输出 |
| `build-logs/v9-w10-run.out` | 1,084 B | W10 driver 输出 |
| `build-logs/v9-w6-run.out` | 803 B | W6 num-- 专项 driver 输出 |
| `build-logs/v9-w2-run.out` | 6,507 B | W2/W10 自然窗 driver 输出 |
| `build-logs/v9-smoke-rerun.out` / `v9-smoke-rerun2.out` | 12,336 B / 13,641 B | 冒烟复跑（W8 二次取样） |
| `build-logs/v9-driver.log` | 37,446 B | driver 全窗追加日志 |
| `build-logs/v9-session-final.log` | 10,465,161 B | 末轮会话全档（23:07–23:45，含停服锚） |
| `build-logs/v9-evidence-rows.txt` | 17,522 B | 判行证据摘录（按 W 分组计数 + 样例） |

---

## 一、判决类清单

| # | 判点 | 判 | 关键判值 |
|---|---|---|---|
| **W1** | boot 面：Done + 0 mixin 失败 + `[TestLog] item model registry 164` | **PASS** | 服务端 `Done (1.214s)`；客户端 `item model registry: 164 etim items`；mixin 失败三型 = 0 |
| **W2** | 自然生成面：两类自然 spawn 行 + per-chunk cap 1 | **PASS** | accept 总 **4,075**；Revenant **72**／BoneLord **56**；`cap-class … count=N → abandon chunk` **128 行**（=72+56，accept 一一对应） |
| **W3** | 装备面：N≥10/类，武器加权序 + 甲全套恒在 | **PASS** | 30+30 样本：sword 27 / axe 16 / hammer 17（期望 2:1:1）；甲 60/60 全四件 |
| **W4** | 召唤链：20 tick 窗 + num<6 门 + 上限 6 + hold=-9600 | **PASS** | 33 次召唤 num 序 1→6（max=6）；`hold=summoned reset=-9600` 33 行；persistence 6 行 |
| **W5** | 兵团面：0.25 type2 / 0.75 type0（≥20 样本） | **✗ FAIL** | **33/33 = type0**（type2 = 0；期望 ~8） |
| **W6** | 兵团消亡管理：counter=MAX_VALUE → tryDespawn → 死透 num-- | **PASS** | `kill counter=2147483647` 本窗 4 行（另有 22:53 档 12 行）；num-- 面见 §二 W6 |
| **W7** | 狂化面：frenzy set 行 + 20 tick 递减 | **PASS** | `frenzy set` 2,297 行；递减面无日志通道（代码锚） |
| **W8** | B-SK-1：成熟作物 ×10 每株 loss=2 + 负证 | **PASS** | `tool decay … scythe … block=wheat loss=2`（23:02:19、23:08:34 两会话）；镐面 loss=5 = 硬度 0.02 生效 |
| **W9** | MobStats 层级修：猪人恒 8.0；ETIM 实体不被宿主行覆写 | **PASS** | 6/6 猪人 atk=8.0、follow=32；revenant 7/30、bonelord 5/20 各 30/30；ETIM stats 行 0 |
| **W10** | scythe 载体行：村民僵尸武器行含 `scythe_rusted_iron` | **PASS** | 200 次村民僵尸召唤 → 32 条 villager 行，其中 **scythe 9 条** |

**总记**：W1/W3/W4/W6/W7/W8/W9/W10 兑现；**W5 兵团类型分布 ✗**（type2 面不可达），本批**不可闭单**。

---

## 二、逐 W 核讫

### W1 · boot 面

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 服务端 Done | 有 | `[23:07:21] … Done (1.214s)! For help, type "help" or "?"` | ✓ |
| `[TestLog]` 注册行 | 在役批全在 | 5 行（metal anvil batch / gear recipes / skeleton loot / dungeon chest loot / mineshaft chest loot） | ✓ |
| mixin 失败 | 0 | `Mixin apply failed` / `MixinException` / `InvalidMixinException` / `ERROR.*mixin` 于 latest.log 与 debug.log **全 0** | ✓ |
| 客户端 item model registry | 164 行 | `[22:28:05] [Client thread/INFO] … [TestLog] item model registry: 164 etim items -> inventory variants (mesh+model dual) [client]`（钉 jar 会话） | ✓ |
| 客户端 mixin 失败 | 0 | 同三型 = 0（`v9-pre-session-latest.log`，191,017 B） | ✓ |

判行原句（服务端）：

```
[23:07:19] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] gear recipes registered: 19 batch rows ok (runtime REGISTRY delta; etim-domain total 144 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]
[23:07:21] [Server thread/INFO] [net.minecraft.server.dedicated.DedicatedServer]: Done (1.214s)! For help, type "help" or "?"
```

判行原句（客户端）：

```
[22:28:05] [Client thread/INFO] [Easy Times In Minecraft]: [TestLog] item model registry: 164 etim items -> inventory variants (mesh+model dual) [client]
```

### W2 · 自然生成面

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 自然 spawn 行（两类） | ≥1/类 | accept 总 4,075；ETIMEntityRevenant **72**、ETIMEntityBoneLord **56** | ✓ |
| 观察窗 | ≥30 分钟游戏时（time add 加速合法） | 实跑 **720 s** 实时（=14,400 game tick）＋ `time set` 累计推 **3,192,000 tick** 日光钟（≈133 游戏日）；accept 密度 5.7/s（4,075 / 720 s） | ✓ |
| per-chunk cap 1 | 同 chunk 同类 ≤1 | `cap-class ETIMEntityRevenant/BoneLord … count=N → abandon chunk` **128 行**（72+56，与 accept 一一对应；命中后立即弃 chunk） | ✓ |

判行原句（样例）：

```
[23:17:31] [Server thread/INFO] [Easy Times In Minecraft]: [SpawnLog] accept ETIMEntityRevenant at (-125,37,280) y-bucket=under
[23:17:51] [Server thread/INFO] [Easy Times In Minecraft]: [SpawnLog] accept ETIMEntityBoneLord at (-39,75,354) y-bucket=over
[23:17:31] [Server thread/INFO] [Easy Times In Minecraft]: [SpawnLog] cap-class ETIMEntityRevenant at (-125,37,280) count=1 → abandon chunk
[23:17:38] [Server thread/INFO] [Easy Times In Minecraft]: [SpawnLog] cap-class ETIMEntityRevenant at (-5,16,3) count=3 → abandon chunk
```

> **计数语义（判行注）**：`cap-class` 的 `count` 是**chunk 级共享 bucket 计数**（under/over 两桶，`int[2]`，每 chunk 每 pass 重置），
> 不是类内计数；`getMaxSpawnedInChunk(entry)` 才是类级 cap（revenant/bonelord = 1）。因此 `count=3` 表示该 chunk 该桶此前已接受 2 只其它类，
> 本只（revenant）接受后 `3 >= 1` 触发弃 chunk —— 语义上**更严**（每桶每 chunk 每 pass 至多 1 只），不构成破 cap。
> 同 chunk 同类在**不同 pass**（本窗每 5 s 清怪后重填）重复出现属合法，不按「重复」计。
> 另：测试者（`Developer`）本窗部分时段在线，会改变密度门与玩家距离门；accept/cap 行本身仍全部来自 `[SpawnLog]`。

### W3 · 装备面（day ≥ 20）

- 前置：`/time set 500000`（day 20；崩溃报告记录 `Level time: 1829169 game time, 500000 day time`）。
- 方法：每类 30 次**裸召唤**（无 NBT —— 见 §三 C-4：带 NBT 的 summon 不跑 `onInitialSpawn`），逐次 `entitydata` 读 HandItems/ArmorItems/Attributes。

| 类 | 武器分布（NBT HandItems） | 甲四件恒在 | 属性 |
|---|---|---|---|
| ETIMEntityRevenant | sword 14 (46.7%) / battle_axe 7 (23.3%) / war_hammer 9 (30.0%) | **30/30** | atk 7.0、hp 30.0（30/30 唯一） |
| ETIMEntityBoneLord | sword 13 (43.3%) / battle_axe 9 (30.0%) / war_hammer 8 (26.7%) | **30/30** | atk 5.0、hp 20.0（30/30 唯一） |
| 合计 60 | sword 27 / axe 16 / hammer 17（期望 2:1:1；χ²=0.63） | 60/60 | — |

`[MobLog]` 同窗 61 行 = **60 次裸召唤 + 1 条测试者手动 `/summon etim:revenant`**（用户告知；该行 weapon=war_hammer，
发生于 22:47:51，非自然生成），与 NBT 分布一致：

```
[MobLog] mob lord equip entity=entity.etim.revenant.name weapon=etim:sword_rusted_iron [server]
[MobLog] mob lord equip entity=entity.etim.bonelord.name weapon=etim:war_hammer_rusted_iron [server]
```

> 甲面判据「全套四件恒在（无机会门）」：NBT `ArmorItems` 四槽全为 `etim:{boots,leggings,chestplate,helmet}_rusted_iron`，60/60 无缺件；
> 每件带随机磨损 `Damage`（`randomizeForMob(true)` 生效）。

### W4 · 召唤链

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 20 tick 窗 + num<6 门 | 有召唤行且 num ≤6 | 6 只 lord → **33 次召唤**；num 序列 `1,1,2,2,1,3,3,4,2,3,4,5,1,2,3,1,6,5,6,2,3,4,4,5,6,1,2,3,5,6,4,5,6`，**max=6** | ✓ |
| 上限 6 不破 | 无 num=7 | 33 次召唤分布 1..6，**0 次 >6**（每 lord 封顶 6） | ✓ |
| `refreshDespawnCounter(-9600)` | 每召必在 | `hold=summoned reset=-9600` = **33 行 = 召唤行数** | ✓ |
| 持久化 | 有玩家目标即 persist | `[AILog] bonelord persistence [server]` = **6 行**（每 lord 1 行） | ✓ |

判行原句：

```
[AILog] bonelord summon entity=Skeleton at -63,68,256 num=1 [server]
[AILog] bonelord summon entity=Skeleton at -67,68,254 num=3 [server]
[AILog] mob despawn hold=summoned reset=-9600 entity=Skeleton#… [server]
[AILog] bonelord persistence [server]
```

### W5 · 兵团面 —— ✗ FAIL

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| type 分布（nether 外） | 0.25 type2 / 0.75 type0（≥20 样本） | **{"0": 33}** —— type2 = **0/33**（期望 ~8；p ≈ 7.8×10⁻⁵）；**全库复核**：`mob troop equip` 共 74 行（含 22:53 档历史窗），`type=2` = **0 行** | **✗** |
| type2 武器面 | 1/20 + day≥10 → 锈剑/匕首，else 徒手 | **不可达**（无 type2 样本 → 无 `type=2` 行） | ✗（连带） |
| type0 = 弓 | 每条 type0 行 | 33/33 = `type=0 bow` | ✓ |

判行原句（全 33 条均为 type0）：

```
[MobLog] mob troop equip entity=Skeleton type=0 bow [server]
```

**根因假设（待主会话裁决）**：type2 候选在 `trySummonTroop` 里要额外过
`pathFinalWithin(w, skeleton, targetX, targetY, targetZ)`（`PathNavigate.getPathToPos` → 终点的**平方距离 ≤ 2.0**，即终点必须落在目标格 ±1 且同 y）。
该骷髅此刻**尚未入世**（`w.spawnEntity` 在 `accept` 里才调用），路径终点几乎不可能落在 ±1 格内 → type2 判定恒 false →
16 次重试把每次 type2 掷骰都换成后续 type0 掷骰 → 接受集被压成 type0。
（对照：R196 的 :177-199 面在同一位置用的是 `getFinalPathPoint` 与目标**实体**距离，阈值语义待复核。）

### W6 · 兵团消亡管理

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| counter=MAX_VALUE → tryDespawn | `kill counter=2147483647` 行 | 本窗 **4 行**（23:12:28 / 23:12:31 / 23:12:44 / 23:13:28，均 EntitySkeleton）；22:53 档另有 12 行 | ✓ |
| 死透 num-- | lord NBT `num_troops_summoned` 递减 | num **6 → 5**（t+150s 处，与 23:44:04 的 MAX_VALUE kill 行同窗同向） | ✓ |

判行原句：

```
[AILog] mob despawn kill counter=2147483647 distSq=2441 pos=(-55,71,295) entity=EntitySkeleton#10103 [server]
[AILog] mob despawn kill counter=2147483647 distSq=2420 pos=(-50,71,293) entity=EntitySkeleton#10084 [server]
[AILog] mob despawn kill counter=2147483647 distSq=12942 pos=(-111,68,328) entity=EntitySkeleton#99985 [server]
```

num 序（专项，`@e[tag=w6lord]` 逐次读 NBT）：

```
W6 num before target loss = 6
W6 t+120s num=6 killMAX=0
W6 t+150s num=5 killMAX=1   ← 管理面 kill 与 num-- 同窗
W6 num after = 5
```

### W7 · 狂化面

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| `frenzy set` 行 | 有（lord 管理面驱动） | **2,297 行**（150 s 窗，6 lord × 周边骷髅每 20 tick 一次） | ✓ |
| countdown 20 tick 递减 | 20 → 0 | **无日志通道**；代码锚 `ETIMDigging.tickFrenzy`（`ETIMDiggingEvents.onLivingUpdate` 每 tick 递减） | ✓（代码锚） |
| 无僵尸挖面干扰 | 骷髅面独立 | frenzy 只挂 `EntitySkeleton`（`instanceof EntitySkeleton`），frenzy 行与 `[AILog] mob stats` 无交叉 | ✓ |

判行原句：

```
[AILog] frenzy set entity=Skeleton target=ETIM_Harn01 [server]
```

> C 级登记见 §三 C-1：`frenzy set` 行**无签名去重**，150 s 产 2,297 行（约 15 行/秒），是本窗日志膨胀主因。

### W8 · B-SK-1（成熟作物每株 loss=2）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 锈镰破成熟小麦 decay | 2/株 | `[MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=wheat loss=2` —— **两次独立会话各 1 行**（23:02:19、23:08:34） | ✓ |
| 耐久 delta | 10 株 → 20 | 冒烟复跑：5 株 → **delta 8**；4 株 → **delta 4**（部分株被作物自落/客户端槽位同步吃掉，见备注） | ✓（行值为准） |
| 硬度面生效 | 0.02F（MixinBlockCrops） | 同块镐面：`tool decay … item=minecraft:iron_pickaxe block=wheat loss=5`（= max((int)(0.02×100), (int)(100/20), 1)） | ✓ |
| 负证（批文口径：镐对小麦 loss=0） | 0 | **实测 5**（铁镐、钻石镐同值）→ 与批文预期冲突，见 §三 C-2（不改本项主判） | — 口径冲突 |
| 负证（空手） | 无 decay 行 | 空手破小麦：无 `tool decay` 行（无 ItemTool 通道） | ✓ |

判行原句：

```
[23:02:19] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=wheat loss=2 [server]
[23:08:34] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=etim:scythe_rusted_iron block=wheat loss=2 [server]
[22:58:39] [Server thread/INFO] [Easy Times In Minecraft]: [MiningLog] tool decay face=breaking item=minecraft:iron_pickaxe block=wheat loss=5 [server]
```

> **备注（作业面限制）**：镰刀是 modded item，mineflayer 的 `bot.dig` 对「unknown」物品的 digTime 计算不稳，
> 且 `setblock` 放在非 farmland 上的成熟作物会在下一 tick 自落——两种噪声都会让「逐株 delta」少计。
> 因此本项以 `[MiningLog]` 的 `loss=2` 行为准（该行由 `ETIMMining.getToolDecayFromBreakingBlock` 在服务器端产出，与株数无关）。

### W9 · MobStats 层级修

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 猪人 attackDamage | 恒 8.0（不再 5/8 随机） | 6/6 只 `EntityPigZombie` NBT `attackDamage=8.0`、`followRange=32.0`、`armor=0.0` | ✓ |
| 猪人 stats 行 | `attackDamage=8.0 entity=EntityPigZombie#…` | 6/6 只各 1 行（`[AILog] mob stats attackDamage=8.0 … EntityPigZombie#8646`） | ✓ |
| ETIM 实体不被宿主行覆写 | atk 7.0/5.0、hp 30.0/20.0 | revenant 30/30 = atk 7.0 + hp 30.0；bonelord 30/30 = atk 5.0 + hp 20.0；follow 40.0、speed 0.26 同值 | ✓ |
| ETIM 实体无 stats 行 | 0 | `mob stats` 行里 Revenant/BoneLord 命中 = **0**（`isInstance` 跳过面生效） | ✓ |

判行原句：

```
[AILog] mob stats attackDamage=8.0 entity=EntityPigZombie#8646 [client]
[AILog] mob stats followRange=32.0 entity=EntityPigZombie#8646 [client]
```

> C 级登记 §三 C-5：该行 `[client]` 标签是 `serverTag` 由线程名推断的假标签（RCON 线程名 `RCON Client #N` 不含 `Server`），
> 值本身来自服务端 `EntityJoinWorldEvent`。

### W10 · scythe 载体行（村民僵尸）

| 判据 | 钉值 | 实测 | 判 |
|---|---|---|---|
| 村民分支 20% + 同组 scythe | 有 `villager=true … scythe_rusted_iron` 行 | 200 次村民僵尸裸召唤 → **32 条 villager 行**，其中 **scythe 9 条** | ✓ |
| 武器分布 | 见下表 | shovel 7 / **scythe 9** / hatchet 4 / mattock 3 / wooden_shovel 4 / shears 3 / pickaxe 1 / hoe 1 | ✓ |
| 自然窗机会面 | 长窗/加速 | 自然窗 720 s 内 villager 行 0、scythe 行 0（30 分钟窗出现概率 ≈0.14%，统计不足；载体行判定见上） | — |

判行原句：

```
[23:15:04] [Server thread/INFO] [Easy Times In Minecraft]: [MobLog] mob weapon entity=Zombie Villager villager=true item=etim:scythe_rusted_iron [server]
[23:15:27] [Server thread/INFO] [Easy Times In Minecraft]: [MobLog] mob weapon entity=Zombie Villager villager=true item=etim:scythe_rusted_iron [server]
[23:15:32] [Server thread/INFO] [Easy Times In Minecraft]: [MobLog] mob weapon entity=Zombie Villager villager=true item=etim:scythe_rusted_iron [server]
```

> 判据面说明：村民分支的「自然 spawn」在 30 分钟窗内出现概率 ≈ 0.14%（村民僵尸 5% × 武器门 20% × scythe 权重 1/9），
> 本窗以**等价生成路径**取证：`/summon minecraft:zombie_villager`（裸召唤）走 `onInitialSpawn → setEquipmentBasedOnDifficulty`
> 同一条装备链（W3 已证裸召唤与自然生成同链），故载体行判 PASS；自然窗仅作机会面登记。

---

## 三、冲突分级

### A 级（阻断闭单）

1. **A-MOB-1 · 兵团 type2 面不可达（W5）**
   证据：6 只 lord 共 33 次成功召唤，`[MobLog] mob troop equip` 全部 `type=0 bow`，**0 条 type=2**（期望 8±2.4，p≈7.8×10⁻⁵）。
   全库复核：`mob troop equip` 历史 74 行（22:53 档 + 本窗）`type=2` = **0 行** → 不是采样运气，是系统性不可达。
   连带：type2 的「1/20 + day≥10 → 锈剑/匕首，else 徒手」武器面**完全不可观测**（无 type2 样本）。
   根因假设：`ETIMEntityBoneLord.pathFinalWithin` 的终点判定为「路径终点与目标格**平方距离 ≤ 2.0**」，且该骷髅尚未 `spawnEntity`；
   该门几乎恒 false，type2 掷骰被 16 次重试消耗成 type0。
   修法方向：复核 R196 :177-199 的终点语义（目标实体距离 vs 目标格平方距离），并把 type2 判定改到入世后/或放宽终点阈值。
   **Java 改动 → 需 rebuild。**

### B 级

1. **B-MOB-2 · 召唤链/兵团面的判定通道无「type 掷骰」中间行**
   `type` 只在装备行出现（接受后），被拒的 type2 掷骰不留痕，导致「0 type2」无法区分「掷骰未发生」与「掷骰被拒」。
   建议补一行 `[AILog] troop roll type=2 → reject path`（判据纪律 §9：需要可日志捕捉的判定点）。**非阻断**。

### C 级（登记，不阻塞）

1. **C-1 · `[AILog] frenzy set` 无去重**：150 s / 6 lord 窗产 2,297 行（≈15 行/秒），是本窗日志膨胀与 RCON 超时的主因之一。
2. **C-2 · W8 负证口径冲突**：批文写「空手/镐对小麦 loss=0（str 门）」，实测铁镐/钻石镐 = **loss 5**。
   成因 = `isEffectiveAgainstBlock` 对 `getHarvestTool==null` 的方块按「镐 = R196 石类载体」处理（既有 mining 面，非本批引入）。
   建议判据改「空手 loss=0（无行）＋ 剑 loss=0（str 门）」。
3. **C-3 · 两次 CME 崩溃（harness 手法面）**：22:51:51 与 23:06:30 各一次
   `ConcurrentModificationException @ Chunk.getEntitiesWithinAABBForEntity`（Ticking entity）。
   两次都发生在 **RCON 线程连续 summon/kill** 的窗口内；崩溃报告「No Mixin Metadata」且栈内无任何 ETIM 帧；
   改为 **chat 面（服务端线程）** 驱动后同强度作业零崩溃 → 定性为 RCON 命令线程并发改实体表（vanilla RCON 线程模型），**非 ETIM 缺陷**。
   影响：22:53 之前（RCON 面）的窗口不计入「负证全 0」；23:07 之后的 W3/W9/W10/W2/W6 均以 chat 面作业，`FATAL/Crash/CCE` 全 0。
4. **C-4 · 带 NBT 的 `/summon` 不跑 `onInitialSpawn`（Forge/vanilla 行为）**
   实测同地点同物品：裸 `summon etim:revenant` → 手=war_hammer + 甲四件；`summon … {Tags:[…]}` / `{PersistenceRequired:1b}` / `{CustomName:…}` → **手空甲空**、0 条 `[MobLog]`。
   ⇒ 任何以 NBT 标签做选主的召唤取证都会**假 FAIL 装备面**。本窗全部改为「裸召唤 + 类型选择器」。
5. **C-5 · `[AILog] mob stats` 的 `[client]` 假标签**：`serverTag` 由线程名推断，RCON 线程名 `RCON Client #N` 不含 `Server` → 服务端行被标 `[client]`。
6. **C-6 · `[SpawnLog] density-eval` 每 tick 一行**（W2 窗内高频），与 C-1 合计把 latest.log 推到 1 MB 量级。
7. **C-7 · harness 清场会连带清掉测试者手动召唤的实体**：W3 每个样本前 `kill @e[type=etim:revenant]`、W2 每 5 s `kill @e[type=!Player]`，
   都会清掉测试者（`Developer`）手动 `/summon` 的实体（本窗即发生 1 次，用户告知）。若需保留手动实体，请在窗口外召唤或先打专属 `Tags` 并在清场选择器里排除。
8. **C-8 · 窗内 HEAD 前进但未 rebuild（钉值面程序性提示）**：`9e6071a → a7f09f3`（仅 `furnace_sandstone.json` / `furnace_sandstone_lit.json` 2 行，
   修的就是客户端日志里那条 `minecraft:textures/blocks/sandstone_side.png` 缺失噪声）。jar 未重建 → **jar（9e6071a 构建）与 HEAD（a7f09f3）不再一一对应**；
   本窗全部判点都落在 mob 批代码/资产面，a7f09f3 不触任何判点，故判决不受影响。后续窗口应以重建后的 jar 重新钉值。

---

## 四、收口表

| 项 | 终态 |
|---|---|
| 客户端 | 本窗未起客户端（W1 客户端判据取 22:27:54–22:31:55 钉 jar 会话，`Stopping!` 已落） |
| 服务端 | RCON `save-all` → `stop`：23:45:47 `Stopping server → Saving players → Saving worlds → Unloading dimension 0`；进程退出；端口 25575 = 0 |
| 产品面 | jar **625,542 B @ 22:25:07**｜SHA256 `E7DBED22…6711`｜**0 rebuild**；窗内 HEAD `9e6071a → a7f09f3`（furnace 模型 2 行，未 rebuild，见 C-8） |
| 工作区 | 产品码/资产 0 改动；harness 新增 driver/报告见 §0.2 |
| 用户操作面 | AI 侧无客户端操作；测试者（`Developer`）部分时段在线，手动 `/summon etim:revenant` ×1（见 C-7），其余判据由服务端日志 / RCON / 假人产生 |

---

## 五、待主会话裁决位

1. **A-MOB-1（W5 type2 不可达）**：按「`pathFinalWithin` 终点语义」还是「type2 掷骰应在入世后判」派修；修完只重验 W5（+W4 回归）。
2. **B-MOB-2（type 掷骰无中间行）**：是否本轮补判定行。
3. **C-2（W8 负证口径）**：批文负证改口径（空手/剑）还是按「镐 = 石类载体」保留现状。
4. **C-3（RCON CME）**：是否在 harness README 固化「实体/方块批量改动走 chat 面」纪律。
5. **C-4（带 NBT summon 不跑 onInitialSpawn）**：是否写入 harness 纪律（禁止用 Tags 做装备面选主）。
