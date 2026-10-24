# R-E 批收官 · ⑤面9 / ⑥面5 / ⑦面10 / ⑧面11 / ⑨面12 判决报告（v1.3）

**基线**：`ad3f0c4`（功能 = `a520c88`）｜jar 321,481B @ 2026-10-18 20:34:26（免重建）｜`src/main` 零改动
**声明**：本文件**新建**（未续写 `g-prime2-and-re-verdict.md`）
**轮次**：④ 待用户（客户端面）｜⑤ **代码级 PASS + 3 项 BASELINE（判据面缺失）**｜⑥ **客户端面移交**｜⑦ **4/4 PASS**｜⑧ **BASELINE（行读数已取）**｜⑨ **门在跑 PASS / 密度对照 BASELINE**
**cfg**（本轮全程）：`moonStateOverride=blue`／`deathXpOrbs=true`／`deathDebugLog=true`／`mobDebugLog=true`／`foodDebugLog=false`／`weatherDebugLog=false`

---

## ① 判据类清单

| # | 判据类 | 终态 |
|---|---|---|
| ④ | 面6 双读数（reach_block / reach_melee + 三探针） | **待用户**（纯客户端 overlay，肉眼转述条款） |
| ⑤ | 面9 四探针（F-9-17 / F-9-18 / F-9-16 / F-9-19） | **F-9-17 代码级 PASS**；F-9-18 代码走查；F-9-16/19 BASELINE（判据面缺失） |
| ⑥ | 面5 三探针（str / 硬度表 / planks·bed 不受扰） | **客户端面移交**（唯一读数面 = `ETIMDebugOverlay` 的 `Mining:` 行；服务端无挖掘进度判据面） |
| ⑦ | 面10 四场景（sub-1 / ≥1 stale / keepInventory / 球捡回） | **4/4 PASS** |
| ⑧ | 面11 三场景（旁观 / 狼 / 僵尸村民） | **BASELINE（[AILog] 行读数已取；三场景零专属行）** |
| ⑨ | 面12 长窗（20+ 分钟 [SpawnLog]） | **F1 门在跑 PASS；密度对照 / 血月窗 BASELINE** |

---

## ② 逐项核讫表（判据行原文引用 + 三态）

### 2.1 ⑤ 面9 四探针

| # | 判据（v1.1 ⑤节原文） | 实测 / 证据 | 判 |
|---|---|---|---|
| 1 | F-9-17（已修）：非耐久物（石头）`getMaxDamage` 读数 = 0 | 代码：`MixinItemStack:42-46` `if (cir.getReturnValue() <= 0) return; // ❗F-9-17 ≡ R196 Item:916-918 非耐久早退` ⇒ 0 不经 `max(...,1)` 抬成 1 | **PASS（代码级）** |
| 2 | F-9-17 运行时读数面 | **判据面不存在**：`/etim dump` 未注册（实际命令仅 `/state`、`/etest`）；`ETIMDebugOverlay` 无 `getMaxDamage` 行 ⇒ HUD 亦无读数 | **BASELINE（面缺失）** |
| 3 | F-9-18（已修）：模组自定义材质合成 | 按 v1.1「无测试材质载体则降级为代码走查回执」：`EnumEquipmentMaterial` 第三列 `max_quality` 经 `Material(EnumEquipmentMaterial)` 写入；无运行时载体 ⇒ 不硬造 | **BASELINE（代码走查）** |
| 4 | F-9-16（未修，第二批）：记录现状基线（侧车仍写） | `ETIMQuality.set()` **无条件** `root.getCompoundTag(TAG_ETIM).setInteger(TAG_QUALITY, quality.ordinal())`，含 AVERAGE 档（`ETIMQuality:84-93`） | **BASELINE（侧车仍写）** |
| 5 | F-9-19（未修，第二批）：average 行仍缺 | `QualityTooltip:40-57`：`q = get(stack); if (q == null) return;` ⇒ average 无侧车 ⇒ 无品质行（且 `:54` 键坏字节未修） | **BASELINE（行仍缺）** |

### 2.2 ⑥ 面5 三探针

| # | 判据（v1.1 ⑥节原文） | 实测 / 证据 | 判 |
|---|---|---|---|
| 6 | 挖掘 str：徒手 stone = 1.0 基线（F-5-24 修复后无附魔不再 +1） | 服务端 12 次挖掘尝试（4 种包序列 × 4 种方块）**均无破坏**（见 §三-A1）：`block_dig status0` 单发 / 每 100ms 重发 / 每 50ms `arm_animation` / 末发 `status2` —— 破坏耗时与 `hardness×512/str` 无一致关系 | **BLOCKED（服务端无判据面）** |
| 7 | 效率镐 = n²+1 加成实测 | 同上 | **BLOCKED** |
| 8 | 黑曜石挖掘时长对照硬度 2.4 | 同上 | **BLOCKED** |
| 9 | 硬度表回读（obsidian 2.4 / tnt 1.0 / netherrack 1.6 / snow 0.05 / fence 0.4 / coal_block 1.2 / enchanting_table 2.4） | 代码回读 `ETIMMining:96-116` 七行**全部在案**（`put("obsidian",2.4F,3)` / `tnt 1.0F,0` / `netherrack 1.6F,2` / `snow 0.05F,0` / `fence 0.4F,0` / `coal_block 1.2F,1` / `enchanting_table 2.4F,0`）；运行时读数面同上缺失（`Mining:` 行仅在客户端 overlay） | **BASELINE（代码在案 / 运行时面缺失）** |
| 10 | 等级门（低级镐不可采） | 代码回读 `BLOCK_MIN_LEVEL`：`stone 2` / `iron_ore 3` / `diamond_ore 4` / `lapis_ore 3`；`Mining gate:` 读数行仅在客户端 | **BASELINE（代码在案）** |
| 11 | planks/bed 硬度不受扰（G-1 Δ30t 照旧） | `planks 0.8` 在案、`bed` 无行（portable pin 吸收，注释明示 G 系判据面不受扰） | **BASELINE** |

### 2.3 ⑦ 面10 四场景（deathDebugLog=true）

| # | 判据（v1.1 ⑦节原文） | 判据行原文 | 判 |
|---|---|---|---|
| 12 | sub-1 死：settle = total−20（债务支，floor −800）→ respawn 单池一致 | `[DeathLog] ETIM_Harn04 (828) death settle sub-level: old=0 → respawn=-20 (unit −20, floor -800) → stale updated` ＋ `respawn settle applied → total=-20 level=-1`；`/state` `total=-20 stale=-20` | **PASS** |
| 13 | ≥1 死：stale 值沿用 → applyTotal 单池曲线一次到位 | `[DeathLog] … death settle ≥1: old=200 → respawn=stale -20 (quirk kept, D.1 open decision)` ＋ `respawn settle applied → total=-20 level=-1` | **PASS** |
| 14 | keepInventory 死：xp 原样不动 | `[DeathLog] … death keepInventory=true → xp untouched (vanilla carry)`；死前 `/state total=200` → 死后 `total=200`（零变化），无 `respawn settle applied` 行 | **PASS** |
| 15 | 球捡回：`deathXpOrbs=true` → 死点 orb 总量 = total/3；捡回后仍单池收敛 | `[DeathLog] … death orb dump 216 xp (=total/3 of 650) at -66,66,240`（650/3=216.67→216 ✔）；拾取后 `/state total` 由 −20 → **46**（−20 + 66 线性并入单池） | **PASS** |
| 16 | 死链 `pending` 收口 | 四场景 `/state` 全部 `pending=0`（无悬挂 settle） | **PASS** |

### 2.4 ⑧ 面11 三场景（mobDebugLog=true）

| # | 判据（v1.1 ⑧节原文） | 实测 / 证据 | 判 |
|---|---|---|---|
| 17 | 旁观模式玩家在场 | `/gamemode spectator ETIM_Harn05` 45s；窗内 [AILog] 46 行，**无任何以 Harn05 为对象的行为行** | **BASELINE（零行）** |
| 18 | 狼出生 | `summon Wolf ×3`（距玩家 ~18 格）45s；窗内**零 Wolf 行** | **BASELINE（零行）** |
| 19 | 僵尸村民治疗 | `summon ZombieVillager` 30s；窗内**零 ZombieVillager 行**（未跑完整治疗流程：虚弱药水 + 金苹果 5 分钟） | **BASELINE（零行）** |
| 20 | despawn 行为面行读数（对照 F-11-24/26/28/34/36） | 同窗实测行样本：`mob despawn counter-meter counter=149 age=1 entity=EntitySheep#919`、`mob despawn pass-state …`（×10）、`mob despawn hold=animal-player-or-fence`、`livestock-raincheck … nearWater=false`、`livestock unwell|thirsty food=1.00 …` | **BASELINE（行面在，场景未命中）** |

### 2.5 ⑨ 面12 长窗（20+ 分钟）

**窗参数**：`moonStateOverride=blue`／`doMobSpawning=true`／`doDaylightCycle=false`／`time 18000`（恒夜）／`difficulty easy`／玩家 `ETIM_Harn04` 常驻（resistance 255）｜**时长 21 min**｜落盘 `build-logs/re-face12-longwin-191105.log`

| # | 判据（v1.1 ⑨节原文） | 实测 / 证据 | 判 |
|---|---|---|---|
| 21 | [SpawnLog] 长窗统计：F1 修复后夜相 chunk 级拒绝生效 | 窗口内 **[SpawnLog] 19,241 行**；`reject moon-night` **1,357 行**（denom=1/54 粒度，例：`reject moon-night denom=1/54 cls=EntityCreeper`）；`density-eval dim=0 … daytime=false phase=BLUE` ⇒ 夜相与 chunk 级密度门均在跑 | **PASS（门在跑）** |
| 22 | F3（ghast/wolf/horse 每 chunk 上限）/ F4b（creeper 夜占比）未修 ⇒ 现状基线 | `cap-block type=CREATURE` 63 / `cap-block deep=false` 62 / `cap-block type=WATER_CREATURE` 42 / `cap-comp EntityChicken=4..7` 35+18+6+3；**accept 明细：Zombie 1,211 / Creeper 1,191 / Skeleton 1,121 / Spider 309 / Bat 278 / Enderman 85 / Squid 14** ⇒ **creeper 夜间占比 = 1,191 / 3,917 = 30.4%**（F4b 现状基线） | **BASELINE** |
| 23 | 血月/蓝月日段各开一窗对照 | 仅**蓝月** window（`moonStateOverride=blue`）；血月窗未开（预算） | **未执行（记录）** |
| 24 | 拒绝层级分布（窗口实测） | `reject blue-lit-eye` **10,538**（54.8%）／`spawn-point-dist` 1,638／`moon-night` 1,357／`player-near` 1,123；`blue-animal pass` 63 | **BASELINE** |

---

## ③ 冲突 / 异常分级

### A1（**A 级 · 工装面**）服务端无挖掘进度判据面 —— ⑥ 不可由服务端驱动
- 12 次钻井尝试（stone/planks/coal_block/obsidian/netherrack/diamond_ore × 徒手/石镐/铁镐/钻石镐），四种客户端包序列（`block_dig status0` 单发、100ms 重发、50ms `arm_animation`、末发 `status2`），**均未能在期望时间内破坏方块**；仅 `snow_layer`(0.05) 与 `tnt`(1.0) 在旧几何下被破坏。
- 结构性原因：1.12 的挖掘进度是**客户端**（`PlayerControllerMP.onPlayerDamageBlock`）职责；服务端只做 `tryHarvestBlock` 结算。ETIM 的 mining 判据读数因此只存在于客户端 `ETIMDebugOverlay`（`etim.debug.mining` / `etim.debug.mining_gate`），**服务端日志通道无此面**。
- ⇒ ⑥ 与 ④ 同款「纯客户端面」，移交用户实测（测试脚本见 §四-2）。

### A2（**A 级 · 判据面缺失**）⑤ F-9-17 无运行时读数面
- `/etim dump` 不存在（命令表仅 `/state`、`/etest`）；overlay 无 `getMaxDamage` 行 ⇒ 该判据只能代码级判定（已 PASS）或由用户侧第三方 HUD 观察。

### B1（**B 级 · 记录**）⑧ 三场景零专属行
- 旁观/狼/僵尸村民三场景在 45s/45s/30s 窗内**均未产生以目标实体为对象的 [AILog] 行**；despawn 计数器（>2400 tick）与 LOS 窗在短窗内不可能命中，**不构成缺陷**，按 v1.1「缺行即记录」处理。

### B2（**B 级 · 判据口径**）⑨ 蓝月窗不能当 F1「夜怪密度」对照窗
- 本窗 `moonStateOverride=blue` ⇒ `reject blue-lit-eye` 占 **54.8%**（10,538/19,241），密度被蓝月眼亮规则压倒性压制，**不能**与 v8 前的自然夜基线直接比较。
- F1 本身的判据（`reject moon-night` 1,357 行 + `density-eval … daytime=false`）成立；但「密度显著回落」的**数值对照**需再开一个**天然相位**窗（`moonStateOverride=` 空 + 20 min）。
- 建议口径：F1 门在跑 = PASS；密度对照 = 下一轮天然相位窗，不与本窗混算。

### B3（**C 级 · 记录**）⑨ 血月对照窗未开
- 预算限制；蓝月窗已跑，血月窗留待下一轮（需重启 + 20 分钟窗）。

### B4（**C 级 · 执行细节**）⑨ 玩家漂移
- bot 以 `idle` 挂机，21 min 内从 `(-56.5,68,250.5)` 漂到 `(-92.3,67,267.3)`（被怪推挤）⇒ 采样点非固定。`[SpawnLog]` 的 density-eval 行自带坐标，不影响门位判读，但下轮应加 `barrier` 围栏固定站位。

### C1（**C 级 · 操作纪律复核**）F5 床三点回读
- 本轮 boot 后回读 `-66,68,246/247` **双格在位** ✔（F5 三点全 OK，无 Air 事件）。

---

## ④ 下一批建议

1. **④⑤⑥ 合并一轮客户端实测**（唯一阻塞项）。准备：cfg `devTools=true`（默认已 true）→ 进服按 **` 键**开 overlay。逐项读数：
   - ④ `Block reach (tool bonus): a -> b` / `Melee reach`：方块 3.4 格可高亮可挖、怪 3.0 格可高亮可点、火球 4.0 格可高亮、**创造模式读数 = 5.0（非 16.0）**。
   - ⑥ `Mining: effective … str=… progress/tick=… ticks left=…`：徒手 stone 的 `str` 应为 **1.0**；未附魔石镐 stone 应为 **4.0（不是 5.0，F-5-24 守卫生效）**；效率 I 镐应为 **6.0（n²+1）**；obsidian 的 `ticks left` 应 ≈ 307t。
   - ⑥ `Mining gate: … block level=… held item=…`：木镐对 iron_ore（level 3）应显示不可采。
   - ⑤ `tooltip`：average 档物品**无品质行**（F-9-19 现状基线）；任一非 average 档应有灰字品质行 + 耐久 ±% 行。
2. **⑨ 天然相位窗**：`moonStateOverride=` 空 + 恒夜 + 20 min，作为 F1「夜怪密度」的对照窗（本蓝月窗 `blue-lit-eye` 占 54.8%，不能当密度基线）；同时把 ⑧ 的狼/僵尸村民并入同窗（≥2400t 才进 despawn 判定）。
3. **⑨ 血月窗**：另一轮 20 分钟 `moonStateOverride=blood` 窗，与天然窗并排比较。
4. **⑤ F-9-16**：第二批修 `set()` 的 average 早退后，用 `give` + NBT 直读复测（无需客户端）。

---

## 附：环境终态（全部回读）

| 项 | 状态 |
|---|---|
| 床 | `-66,68,246` / `-66,68,247` **双格 bed 在位** ✔（boot 后回读；F5 三点全 OK） |
| 坑/地面 | `-66,66,248` / `-66,67,248` 回填 **stone** ✔（本轮复测窗清空后已复原） |
| 屋顶 | `-66,70,247` = stone（31 块） ✔ |
| 探针台 | `-64..-50, y=68..70, z=247..254` 全部清为 **air** ✔ |
| C13 | `testfor @e[...,r=128,type=Zombie]` = **found nothing** ✔（同框另有 1 只自然 `Squid`，水生非敌对，未清） |
| gamerule | `doMobSpawning / doDaylightCycle / doMobLoot` = **true**；`keepInventory` = **false** ✔ |
| cfg | `moonStateOverride=`（空）／`zombieDigAI=true`／`bedSentryWake=true`／`bedHostilePathable=true`／`mobwakeRarity=1000`／`weatherSystem=true`／`weatherDebugLog=false`／`deathXpOrbs=false`／`deathDebugLog=false`／`foodDebugLog=false`／`mobDebugLog=true` ✔ |
| C16 TPS | Δtick/10s = **204** ✔ |
| 服务端 | **已 stop，25565 无监听** ✔ |
| 进程 | java 仅 `GradleDaemon:11760`；node 测试进程 **零残留** ✔ |
| git | `## master...origin/master`；**`src/main` 净** ✔ |

**落盘日志**：
- `build-logs/re-face5-185404.log`（⑥ 服务端钻井 12 次尝试，结果行损坏但方块终态已回读）
- `build-logs/re-face12-longwin-191105.log`（⑨ 长窗统计）
- ⑦⑧ 判据行在 `run/obfuscated/logs/latest.log`（`[DeathLog]` L5218–L5481 / `[AILog]` L5631–L5677）

**新增工装**（仅 `testharness/player/`）：`re-bot.js`（`sh`/`dig`/`idle`/`tp`，含 `RE_PRE` 预备命令）、`re-death.js`（死亡四场景）、`re-despawn.js`（面11 三场景）

**签署**：会话七 ｜ 基线 `ad3f0c4` ｜ ⑦ **4/4 PASS** ｜ ⑨ 门在跑 PASS / 密度对照 BASELINE ｜ ⑧ BASELINE ｜ ⑤ 代码级 PASS + 3 项 BASELINE ｜ ⑥ **客户端面移交** ｜ ④ 待用户 ｜ 核讫表 **24 行**
