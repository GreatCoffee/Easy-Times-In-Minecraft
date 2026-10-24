# E1 复测专轮（S1/S2/S3 修复批）— 判决报告

- 轮次：E1 复测（补28 首单）
- 判决源：服务端 `[FoodLog] attackDrain` 行（产品面）＋ `[EtimTest]` 服务端日志行（工装回执面）＋ `/testfor` NBT 探针（E1 机制面）
- 落盘：`build-logs/harness-e1-server.log`、`build-logs/harness-e1-client-latest.log`、`build-logs/harness-e1-client.out`（钉值行）、`build-logs/harness-e1-bot.out`（[act]/[chat] 逐行）
- 判决：**10 项判据 → PASS 10 ／ FAIL 0**

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | 455e165 | `455e165 E1 fix (verdict harness-t01-t02-verdict.md, harness face only)` | ✓ |
| src/main 改动面 | 仅 CommandDevTest + lang×2 | `git diff --stat 2825375..HEAD -- src/main` → 3 files, +38/−8 | ✓ |
| jar 大小/时间 | 335,170 B（补28 钉值） | 335,170 B ｜ 2026-10-22 19:49:12 | ✓ |
| jar SHA256 | 5F1B5BC2…D3DDEA | `5F1B5BC2ABF539E06212AB6C32B843C04954FF5B2882782DCCB3BD88D7D3DDEA` | ✓ |
| 客户端常驻校验 | 长度+哈希 | `[etim-harness] pinned etim jar synced+verified: 335170B  SHA256 5F1B5BC2ABF539E06212AB6C32B843C04954FF5B2882782DCCB3BD88D7D3DDEA` | ✓ |
| 客户端先行 | 客户端 JVM 早于服务端 | 客户端 JVM 19:57:33 → 服务端 `[19:57:57]` 起模块、`[19:57:59] Done (1.164s)` | ✓ |
| 起服面 | run/obfuscated-server 副本 + classpath 钉值 jar | `classpath append: …\build\libs\etim-1.0.0.jar (mtime=10/22/2026 19:49:12)` | ✓ |
| 配置口径 | foodModel=true / foodTestMode=false / foodDebugLog=true | 同值（未动） | ✓ |

---

## 1. 判决类清单

| 判据 | 期望 | 判 | 依据 |
|---|---|---|---|
| E1'-a 同件甲 restage L1 | `mod=0.8 amount=0.24` 恰 1 行 | ✓ | 19:58:57 |
| E1'-b 同件甲 restage L2 | `mod=0.6 amount=0.18` 恰 1 行 | ✓ | 19:59:03 |
| E1'-c 同件甲 restage L3 | `mod=0.39999998 amount=0.12` 恰 1 行 | ✓ | 19:59:09 |
| E1'-d 同件甲 restage L4 | `mod=0.19999999 amount=0.06` 恰 1 行 | ✓ | 19:59:15 |
| E1'-e 机制面（条目唯一） | 本级命中 / 旧档不中 / 累积模式不中 | ✓ | 10/10 探针符合（§2.2） |
| E1'-f 同件甲 | 全程只 `/replaceitem` 一次 | ✓ | 本 run 仅 1 条 `Replaced slot slot.armor.chest`（11:58:52.831） |
| S2 `[EtimTest]` 回执通道 | 每次工装命令 1 行，key/player/params 齐 | ✓ | 12 行 = 12 次 respond（§2.3） |
| S3 enchant_set 文案 | params 带附魔自身译名 + 罗马档位 | ✓ | `params=[chest, Endurance IV, Diamond Chestplate]` |
| R-C1（C-1 抽样） | RCON `/etest food 0 0 @p` → [EtimTest] + 生效 | ✓ | `params=[0, 0, 20]` + `foodLevel:0` Found |
| R-C2（C-2 抽样） | RCON `/etest debt 3 @p` → [EtimTest] + 生效 | ✓ | `params=[-3, -60]` + `XpLevel:-3` Found |

---

## 2. 逐方法核讫表（判据行原文）

### 2.1 E1' 核心链：同一件甲 1→2→3→4（产品面）

```
[19:58:57] … [FoodLog] ETIM_Harn04 (125) attackDrain base=0.3 mod=0.8        amount=0.24000001 pool=1.7742018
[19:59:03] … [FoodLog] ETIM_Harn04 (125) attackDrain base=0.3 mod=0.6        amount=0.18       pool=2.2542086
[19:59:09] … [FoodLog] ETIM_Harn04 (125) attackDrain base=0.3 mod=0.39999998 amount=0.12       pool=2.6742153
[19:59:15] … [FoodLog] ETIM_Harn04 (125) attackDrain base=0.3 mod=0.19999999 amount=0.06       pool=3.0367222
```

同一件钻石胸甲（11:58:52.831 一次 `replaceitem` 后全程未换），逐级 restage 四值**逐位**命中预计算，
且与 `harness-t01-t02-verdict.md` 的 R10 口径（0.8 / 0.6 / 0.39999998 / 0.19999999）完全一致。
**上一轮 E1 的病征（四级全 0.8）已反转。**

### 2.2 E1' 机制面（`/testfor` 探针，同一件甲）

探针语义（`NBTUtil.areNBTEquals` 的 `compareListTag=true` = 模式列表 ⊆ 目标列表）：
- `self`：仅 `{lvl:L}` 的单条目模式 → 期望命中（本级存在）
- `prev1`：仅 `{lvl:1}` 的单条目模式 → 期望**不中**（旧档已被清）
- `accum`：`1..L` 累积条目模式 → 期望**不中**（没有追加残留）

```
[11:58:55.331] [chat] Found ETIM_Harn04                                    ← L1 self
[11:59:00.128] [chat] Found ETIM_Harn04                                    ← L2 self
[11:59:00.728] [chat] ETIM_Harn04 did not match the required data structure ← L2 prev1(lvl:1)
[11:59:01.327] [chat] ETIM_Harn04 did not match the required data structure ← L2 accum(1+2)
[11:59:06.127] [chat] Found ETIM_Harn04                                    ← L3 self
[11:59:06.726] [chat] ETIM_Harn04 did not match the required data structure ← L3 prev1
[11:59:07.376] [chat] ETIM_Harn04 did not match the required data structure ← L3 accum(1+2+3)
[11:59:12.178] [chat] Found ETIM_Harn04                                    ← L4 self
[11:59:12.776] [chat] ETIM_Harn04 did not match the required data structure ← L4 prev1
[11:59:13.375] [chat] ETIM_Harn04 did not match the required data structure ← L4 accum(1+2+3+4)
```

10/10 符合：每级 chest 上**恰好一条** Endurance，档位=所注入档；`lvl:1` 在 chest 4 后不再命中
—— 任务书要求的「病征反转」判据成立。（上一轮该模式下四条目模式**命中**，本轮不中。）

### 2.3 S2 新通道（`[EtimTest]` 服务端日志）

```
[19:58:51] [Server thread/INFO]  [EtimTest] commands.etest.level_set     player=ETIM_Harn04 params=[35]
[19:58:54] [Server thread/INFO]  [EtimTest] commands.etest.enchant_set   player=ETIM_Harn04 params=[chest, Endurance I, Diamond Chestplate]
[19:58:55] [Server thread/INFO]  [EtimTest] commands.etest.food_set_pool player=ETIM_Harn04 params=[20, 20, 20]
[19:58:59] [Server thread/INFO]  [EtimTest] commands.etest.enchant_set   player=ETIM_Harn04 params=[chest, Endurance II, Diamond Chestplate]
[19:59:01] [Server thread/INFO]  [EtimTest] commands.etest.food_set_pool player=ETIM_Harn04 params=[20, 20, 20]
[19:59:05] [Server thread/INFO]  [EtimTest] commands.etest.enchant_set   player=ETIM_Harn04 params=[chest, Endurance III, Diamond Chestplate]
[19:59:07] [Server thread/INFO]  [EtimTest] commands.etest.food_set_pool player=ETIM_Harn04 params=[20, 20, 20]
[19:59:11] [Server thread/INFO]  [EtimTest] commands.etest.enchant_set   player=ETIM_Harn04 params=[chest, Endurance IV, Diamond Chestplate]
[19:59:13] [Server thread/INFO]  [EtimTest] commands.etest.food_set_pool player=ETIM_Harn04 params=[20, 20, 20]
[19:59:39] [RCON Client #9/INFO] [EtimTest] commands.etest.food_set_pool player=ETIM_Harn04 params=[0, 0, 20]
[19:59:41] [RCON Client #11/INFO][EtimTest] commands.etest.debt_set     player=ETIM_Harn04 params=[-3, -60]
（另 1 行 level_set params=[0]，收尾复位）
```

- 12 行 = 12 次 `respond`（4×enchant + 5×food + 2×level + 1×debt）。
- 后两行由 **RCON Client 线程** 产生 → 判回执不再需要 bot/真客户端，S2 目的达成。
- bot 侧仍显示裸 key（N1 未变），但已不影响判定。

### 2.4 S3 文案（enchant_set 参数化）

```
[EtimTest] commands.etest.enchant_set player=ETIM_Harn04 params=[chest, Endurance IV, Diamond Chestplate]
```

与 lang 改动一致：`commands.etest.enchant_set=已注入：槽位 %s %s（%s）`，第三参由
`ETIMEnchantments.ENDURANCE.getTranslatedName(level)` 生成 → 档位用罗马数字、名字取自附魔自身译名，
**不再是写死的 `Endurance %s 级`**。与 tooltip 的 `耐力 IV` 在**格式**上一致（罗马档位）。

### 2.5 回归抽样（T0-1 面未回归）

```
> /etest food 0 0 @p     OUT: (no output)   [EtimTest] … food_set_pool params=[0, 0, 20]
> /testfor ETIM_Harn04 {foodLevel:0}        OUT: Found ETIM_Harn04
> /etest debt 3 @p       OUT: (no output)   [EtimTest] … debt_set params=[-3, -60]
> /testfor ETIM_Harn04 {XpLevel:-3}         OUT: Found ETIM_Harn04
```

`@p` 从 RCON 发出仍解析到场（单人面），target 链未受修复批影响。

---

## 3. 冲突分级

**FAIL：0**

| 编号 | 级别 | 内容 | 处置 |
|---|---|---|---|
| N1 | 通道注记 | bot（mineflayer）无 lang 表，玩家通道回执在 bot 侧仍是裸 key（`commands.etest.enchant_set`）。 | 不判负：`[EtimTest]` 已覆盖判定需求。 |
| N2 | 口径注记 | S3 的 `getTranslatedName` 在**服务端**求值（服务端 I18n = en_US）→ `[EtimTest]` 与服务端下发的参数串是 `Endurance IV`；zh 客户端聊天行会渲染成「已注入：槽位 chest Endurance IV（…）」，而 tooltip 是「耐力 IV」。 | **格式面收敛、语言面未收敛**（N6 的一半）。纯文案；建议见 §4-S3b。 |
| N3 | 过程注记 | 客户端 Gradle 启动的配置阶段较长（pin 行 → JVM 19:57:33），但仍早于服务端 19:57:47，客户端先行成立。 | 记录。 |
| N4 | 过程注记 | 收口时 `doMobSpawning` 恢复 true 后自然刷出 1 只僵尸，已再清一次并立即 `/stop`（最终 `found nothing`）。 | 记录。 |

---

## 4. 伪代码建议（仅 FAIL 项 → 本轮无必修）

E1/S2/S3 修复全部按建议落地，无 FAIL 项。以下为 **N2 的可选收尾**（纯文案，不阻塞）：

### S3b（可选）让客户端用自己的语言渲染附魔名

```java
// 现状：getTranslatedName 在服务端求值 → 参数是已经固定的英文串
respond(player, "commands.etest.enchant_set", args[1],
        ETIMEnchantments.ENDURANCE.getTranslatedName(level), stack.getDisplayName());

// 可选：把「译名 + 档位」作为翻译组件下传，由客户端本地化
respond(player, "commands.etest.enchant_set", args[1],
        new TextComponentTranslation("enchantment.etim.endurance")
                .appendSibling(new TextComponentString(" "))
                .appendSibling(new TextComponentTranslation("enchantment.level." + level)),
        stack.getDisplayName());
```

接受面：zh 客户端回执显示「耐力 IV」，与 tooltip 完全同文；`[EtimTest]` 日志会把该组件
按 `TextComponentTranslation.toString()` 落成 key 形式（判定侧改为 grep key + level 参数）。
若判定侧更看重「日志一眼可读」，则维持现状（`Endurance IV`）也满足任务书「或 en 端」口径。

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true / doDaylightCycle=true / doWeatherCycle=true / keepInventory=false | ✓ |
| time | 1000 | ✓ |
| 配置 | foodModel=true / foodTestMode=false / foodDebugLog=true / devTools=true（未动） | ✓ |
| 实体 | `T01Dummy` 已清；自然刷 1 只再清；收口 `/testfor @e[type=zombie]` → `found nothing` | ✓ |
| bot 背包 | `/clear` 移除 1 件；等级复位 `/etest level 0` | ✓ |
| 端口 | 25565/25575 无 LISTEN（25565 仅残余 TimeWait） | ✓ |
| 关服 | `[20:00:02] Stopping server → Saving worlds → [Server Shutdown Thread] Stopping server`；无 SERVER 进程残留 | ✓ |
| crash / hs_err | 无 | ✓ |
| jar 复验 | build/libs ≡ run/obfuscated/mods，`5F1B5BC2…D3DDEA` / 335,170 B | ✓ |
| src/main | 0 改动；HEAD=455e165 | ✓ |
| 客户端 | 19:57:33 起 → `[20:03:26] Stopping!` 正常退窗（`BUILD SUCCESSFUL in 5m 55s`，无 crash）；仅余 Gradle daemon | ✓ |

---

## 附录：工装使用方式（本轮）

- 动作面：`testharness/player/t01-run.js` 新增 `E1` 相位 —— 同一件甲 1→4 restage，注入后即打
  `self/prev1/accum` 三类 `/testfor` 探针，再 `food 20 20` + 单次挥击，`[act]` 标记落
  `build-logs/t01-done.txt`，探针/回执落 `build-logs/harness-e1-bot.out`。
- 探针锚点：`chest` 的背包槽位下标 `102b`（1.12 `Inventory` 列表槽号）。
- 附魔 id 由 `[EtimInit] enchant etim:endurance id=N` 读出后作为脚本末参传入（本轮 N=12），不写死。
