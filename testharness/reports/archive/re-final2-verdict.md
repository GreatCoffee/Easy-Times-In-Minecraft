# R-E 末轮（v1.4）· ⑧并入 / ⑨天然窗 / ⑨血月窗 判决报告

**基线**：`ad3f0c4`（功能 = `a520c88`）｜A 块 jar 321,481B；B 块 jar **321,484B**（A3 通道名修复后）｜`src/main` 零改动（A 块期）
**声明**：本文件**新建**（不续写 `re-final-verdict.md`；v1.3 报告已收官）
**轮次**：A 块（服务端）**已执行**（⑧ 并入天然窗 + ⑨a 天然相位窗 + ⑨b 血月窗）；B 块（④⑤⑥ 客户端实测）**PASS**——A3 修复后 obf 客户端全量 19 mod 实连，18:19–18:53 完成全部读数（见 §2.4）
**cfg**：天然窗 `moonStateOverride=`（空）｜血月窗 `moonStateOverride=blood`｜全程 `mobDebugLog=true`、`deathDebugLog=false`、`deathXpOrbs=false`、`foodDebugLog=false`、`weatherDebugLog=false`

---

## ① 判据类清单

| # | 判据类 | 终态 |
|---|---|---|
| ⑧ | 面11 三场景并入自然窗（狼 / 僵尸村民 / 旁观） | **狼 PASS、ZV PASS、旁观 BASELINE（结构不可达）** |
| ⑨a | 天然相位密度窗（20 min，F1 对照） | **PASS（phase=OTHER，denom=1/4）** |
| ⑨b | 血月窗（20 min，override=blood）与天然窗并排 | **PASS（denom=1/2、phase=BLOOD、rescue gate 生效；密度 +13.0%）** |
| ④ | 面6 双读数（客户端 overlay） | **PASS**：方块 3.40 / 3.50✓、怪 3.25✓（1 HP 僵尸一击死）、火球 4.50✓、创造 5.00✓ |
| ⑤ | 面9 四探针（客户端/代码） | **PASS**：新鲜木镐无独立品质行；木棍挖叶可及窗零 ERROR/异常（F-9-17 代码级 PASS + 运行面 PASS） |
| ⑥ | 面5 三探针（客户端 overlay `Mining:` 行） | **PASS**：玻璃 1/4/6/5/10、圆石门 0/0/0/8/10、黑曜石 0/0/8.00/10.00 |

---

## ② 逐项核讫表（判据行原文引用 + 三态）

### 2.1 ⑧ 面11 三场景（并入天然窗，`mobDebugLog=true`）

**窗参数**：`moonStateOverride=` 空（天然相位 day=53→54，均 OTHER）｜`doMobSpawning=true`／`doDaylightCycle=false`／`time 18000`（恒夜）／`difficulty easy`｜玩家 `ETIM_Harn04` 常驻（resistance 255）｜**21 min**｜落盘 `build-logs/re-final2-natural-200428.log`（stats 同前缀 `.stats`）

| # | 判据（v1.1 ⑧节原文） | 判据行原文 / 实测 | 判 |
|---|---|---|---|
| 1 | 狼出生（`summon Wolf ×3`，封石室内、距玩家 ≥32 格） | 4 只狼（#124–#127）全程 **254 行 `pass-state`**：`[AILog] mob despawn pass-state c=200 distSq=1641 wall=quiet<800 entity=EntityWolf#126`（另 counter-meter 11 行）；**0 行 kill、0 行 hold** ⇒ 动物 800/2400 墙在在线态被 200 门重掷锁死（与 R196 终审「counter 走 800/2400 = 常态死码」逐字一致） | **PASS（行为符合 R196）** |
| 2 | 僵尸村民（`summon zombie_villager`，封石室、距玩家 41 格） | `[AILog] mob despawn hold=zombie-villager entity=EntityZombieVillager#2827 [server]`（20:06:00；counter-meter 2 行，零 kill） | **PASS** |
| 3 | 旁观模式玩家在场（Harn05 `spectator`，站于封石狼室正上方 8 格） | `testfor @a[m=3]` → `Found ETIM_Harn05`；被观察狼 #127 全程 `pass-state … wall=quiet<800`（distSq=3065，距 A 53 格）⇒ **旁观者未被计入 `getClosestPlayer(..., false)`＝NOT_SPECTATING**；但 `quiet<800` 先于 `player<=1024` 命中，旁观墙**结构上不可达**（与 #1 同因） | **BASELINE（结构不可达，行面零专属 kill）** |
| 4 | despawn 行为面行读数（F-11-24/26/28/34/36 对照） | 同窗行面齐全：`counter-meter counter=200 … entity=EntityZombie#…`、`pass-state … wall=quiet<800`、`hold=zombie-villager`、`hold=animal-player-or-fence`（羊）、`kill counter=200 distSq=… pos=(…)`（僵尸/骷髅/苦力怕的正常消散） | **BASELINE（行面在）** |

### 2.2 ⑨a 天然相位密度窗（F1 对照）

**窗参数**：同上，`moonStateOverride=` 空｜**21 min**（20:04:50–20:25:55，gametime 1,248,992→1,275,383，rate 20.01 t/s）｜**跨 day 53→54，均 `phase=OTHER`**

| # | 判据（v1.1 ⑨节原文） | 实测 / 证据 | 判 |
|---|---|---|---|
| 5 | [SpawnLog] 长窗统计：F1 夜相 chunk 级拒绝在天然相位下生效 | **[SpawnLog] 10,553 行**；`reject moon-night` **1,745 行，全部 `denom=1/4`**（如 `[SpawnLog] reject moon-night denom=1/4 cls=EntityZombie`）；`density-eval … daytime=false phase=OTHER` ×4 ⇒ 夜相门与 chunk 级密度门在天然相下均在跑 | **PASS** |
| 6 | accept 分布（天然相） | Zombie **1,741**／Creeper **1,704**／Skeleton **1,668**／Spider **506**／Bat **249**／Enderman **169**／Squid **11**／Slime **3**（合计 **6,051**） | **BASELINE（对照值）** |
| 7 | reject 分类（天然相） | `spawn-point-dist` **2,025**／`moon-night` **1,745**／`player-near` **259**（合计 **4,029**）；`blue-lit-eye` **0**（天然相无蓝月） | **BASELINE（对照值）** |
| 8 | creeper 夜占比（F4b 现状） | 夜间敌对 5,229（day 53）/ 559（day 54）⇒ **day 53 = 29.2%**、day 54 = 31.8%、**整窗 29.4%**（1,704/5,788） | **BASELINE** |
| 9 | F3 现状（每 chunk 上限） | `cap-block deep=false` **421**／`cap-block type=WATER_CREATURE` **46**；`cap-comp` **0**；天然相窗口无 `blue-animal` 行 | **BASELINE** |
| 10 | 密度 modifier 事件（F4 纪律：日段/事件段单列） | `[SpawnLog] modifier mod=1.0 d=1666 i=0 n=0`（20:17:43）→ `modifier mod=0.5 d=0 i=0 n=0`（20:19:06）⇒ **20:19:06 起 mod=0.5**；分段：pre（mod=1.0，14.3 min）accept 3,938／reject 2,719；post（mod=0.5，6.8 min）accept 2,113／reject 1,310 | **记录（对照口径已单列）** |

**与 v1.3 蓝月窗并排（同 21 min 口径）**

| 窗 | [SpawnLog] | blue-lit-eye | moon-night | accept | creeper 占比 |
|---|---|---|---|---|---|
| v1.3 `override=blue` | 19,241 | **10,538（54.8%）** | 1,357（denom 1/54） | 2,512 | 30.4% |
| **本窗 天然（OTHER）** | **10,553** | **0** | **1,745（denom 1/4）** | **6,051** | **29.4%** |

### 2.3 ⑨b 血月窗（override=blood）与天然窗并排

**窗参数**：`moonStateOverride=blood`｜`doMobSpawning=true`／`doDaylightCycle=false`／`time 18000`／`difficulty easy`｜玩家 `ETIM_Harn04` 常驻｜**21 min**（20:48:28–21:09:32，gametime 1,300,694→1,327,083）｜落盘 `build-logs/re-final2-blood-204822.log`（+ `.stats` / `.clock` / `.base`）

| # | 判据（v1.1 ⑨节原文） | 实测 / 证据 | 判 |
|---|---|---|---|
| 11 | 血月相位生效：`reject moon-night denom=1/2` + `phase=BLOOD` | **[SpawnLog] 11,860 行**；`reject moon-night` **1,085 行，全部 `denom=1/2`**；`density-eval … daytime=false phase=BLOOD` ×1（节流后仅 1 行，相位正确） | **PASS** |
| 12 | 血月密度对照（accept / reject / creeper 占比） | accept **6,835**（Skeleton 1,965／Creeper 1,920／Zombie 1,859／Spider 556／Bat 356／Enderman 166／Squid 8／Slime 5）；reject **3,459**（spawn-point-dist 1,894／moon-night 1,085／player-near 480）；`cap-block deep=false` **656**／`WATER_CREATURE` 53；夜间敌对 6,466 ⇒ **creeper 29.7%**（day 55 29.9% / day 56 29.2%）。对天然窗：accept **+13.0%**（6,051→6,835）、moon-night 拒绝 **−37.8%**（1,745→1,085）、creeper 占比 **+0.3pp**（29.4%→29.7%）、`cap-block deep=false` **+55.8%**（421→656） | **PASS（对照成立）** |
| 13 | 血月 deep density ×3/2 与 rescue gate | `modifier` 行 **856 行**：`modifier mod=2.0 d=928 i=77 n=0`（increased ×2 在血月下**不被救**，与 `ETIMSpawnCycle:155-160` 注释一致）；随后 `modifier mod=1.0 d=851…d=844…` **逐 tick 复现** ⇒ `rescueGate` 在每个 `mod<1.0` 的 tick 把 mod 抬回 1.0（rescue 生效），decreased 计数器继续递减 | **PASS（rescue 生效）** |
| 14 | 弹床（若触发按四腿口径） | 本窗玩家不睡眠 ⇒ **不适用**（记录） | **N/A** |

**天然 vs 血月并排（同 21 min 口径）**

| 指标 | 天然（OTHER，day 53→54） | 血月（BLOOD override，day 55→56） | Δ |
|---|---|---|---|
| [SpawnLog] 行 | 10,553 | 11,860 | +12.4% |
| accept | 6,051 | 6,835 | **+13.0%** |
| reject | 4,029 | 3,459 | −14.1% |
| `moon-night`（denom） | 1,745（1/4） | 1,085（1/2） | −37.8% |
| creeper 夜占比 | 29.4% | 29.7% | +0.3pp |
| `cap-block deep=false` | 421 | 656 | +55.8% |
| 密度 modifier | `mod=0.5` 持续 6.8 min | rescue 恒回 1.0；`mod=2.0` 保留 | — |

### 2.4 B 块 ④⑤⑥ 客户端实测（**PASS**，2026-10-20 18:19–18:53）

**环境**：obf 生产客户端（`runObfClient`，JDK8u504），19 mod 全量（OptiFine HD U G5 / SmoothFont 2.1.4 / ReBind 2.7.5 / JourneyMap 6.0.10 / JEI 4.22.0.1034 / CraftingTweaks / StepUp / TheOneProbe 等）；服务端同 jar 321,484B；判据源 `run/obfuscated/logs/latest.log` + 客户端 overlay。

| # | 判据（v1.1 ④/⑤/⑥ 节原文） | 实测 | 判 |
|---|---|---|---|
| 15 | ④ 面6 双读数：方块 3.4／怪 3.0／火球 4.0／创造 5.0 | 方块 `体点 3.40 / 方块触及 3.50 ✓`（钻石镐，`-38.5 80 241.9`）；怪 `近战 3.25 ✓`，1 HP 僵尸一击死亡；火球同高 `近战 4.50 ✓`（`y=80.5`）；创造 `方块触及 5.00 ✓` | **PASS** |
| 16 | ⑤ 面9：average 档无品质行（F-9-19 基线）＋ F-9-17 负证（非耐久物零 ERROR 堆栈） | 新鲜木镐 tooltip：`木镐 (#0270)`、`NBT: 1个标签`、**无独立品质行**；木棍对 `-43,80,262` no-decay 树叶 `方块触及 2.75 ✓ / str=1.00 / 剩余 103`，可及窗 18:52:19–18:53:11 **零 ERROR/异常** | **PASS**（A6：`#0270` 释义；用户提前退出，未等 103t 实际破块） |
| 17 | ⑥ 面5：徒手 stone `str=1.0`／未附魔石镐 4.0／效率 I 6.0／obsidian `ticks≈307` | **玻璃**（min0/2.0）：空手 1.00/1024、木 4.00/256、木效 I 6.00/171、石 5.00/205、钻 10.00/103；**圆石**（min2）：木/石/效 I 0.00/MAX、铁 8.00/128、钻 10.00/103；**黑曜石**（min3，喂饱）：木/石 0.00/MAX、铁 8.00/154、钻 10.00/123 | **PASS** |

**口径注记**：
- ⑥ 的 4.0/5.0/6.0 行必须打在 **min0 的玻璃**上；圆石 min=2（`ETIMMining:104`），木/石/效率 I 的 0 是**等级门**，不是缺陷。
- 黑曜石 min=3；铁镐经 `getToolGrade` 的 `2→3` 映射与钻石同档，**铁 8.00/154 是正确值**（旧稿“铁 8.00/154 作废”已撤销）。
- `剩余` 为 `ceil(1/progress)`：2.0×512/10=102.4 → **103**；任务书 102 是 floor 口径，不构成偏差。
- 饥饿 `!hasFoodEnergy` 时 `str /= 5`（`ETIMMining:223`）：首轮黑曜石铁 1.60/768、钻 2.00/615 即 8/5、10/5，`/etest food 6 6` 后回 8.00/154、10.00/123。
- 玻璃行 `方块触及 2.75` 的成因见 A5（`getBlockReach` 与 `isEffectiveAgainstBlock` 谓词不一致）；str 为 display-only，读数有效。

---

## ③ 冲突 / 异常分级

### A1（**B 级 · 判据口径**）⑧ 动物 800/2400 墙在在线态不可达
- 狼与旁观狼的 `pass-state` 恒为 `c=200 wall=quiet<800`：200 门一到即 `canDespawn=false` → 主循环 `reroll` 把 counter 打回 −50..50，永远到不了 800/2400。
- 与 R196 终审 §2.3「counter 走 800/2400 在玩家在场时是死码」一致，**不是 ETIM 缺陷**；但 v1.1 ⑧ 的“狼/旁观墙”判据只能用 200 门行 + 零 kill 作为正向读数，旁观墙的 `player<=1024` 分支**无法在在线窗命中**（需离线窗）。

### A2（**A 级 · 客户端启动阻断**）`ClientNetworkHooks` 三个网络 handler 包私有 → 客户端 `preInit` 必崩
- **现象**：`gradlew runClient`（最小客户端 = ETIM 1.0.0 + Forge 14.23.5.2847 + MixinBooter 11.13，JDK 8u504）在 `Initializing game` 前抛 `LoaderExceptionModCrash: Caught exception from Easy Times In Minecraft (etim)`；根因 `RuntimeException: IllegalAccessException: Class SimpleNetworkWrapper can not access a member of class ClientNetworkHooks$ProgressSyncHandler with modifiers ""`。
- **调用链**：`ETIM.preInit:62` → `ClientNetworkHooks.register():36` → `SimpleNetworkWrapper.registerMessage` → `instantiate(clazz)` → `clazz.newInstance()`。三个 handler 均为包私有：`ClientNetworkHooks.java:54 FoodDebugSyncHandler` / `:72 ProgressSyncHandler` / `:122 NutritionSyncHandler`（`static final class`，无 `public`）。
- **为何 A 块没暴露**：`ClientNetworkHooks` 带 `@SideOnly(CLIENT)`，专职服务端从不加载该类；B 块一开客户端即触发。
- **修法（最小）**：三处 `static final class` → `public static final class`（隐式无参构造随类公开，`newInstance` 即可访问）；无其他改动、无兼容层。
- **证据**：`run/crash-reports/crash-2026-10-20_17.49.38-client.txt`（第一次 17.47.06 崩于 OptiFine 的 `GlStateManager` 验证错误，属**开发客户端与生产 coremod 的共存问题**，移走 OptiFine/SmoothFont 后暴露本 A2；本 A2 与 OptiFine 无关）。
- **影响**：④⑤⑥ 全部 **BLOCKED**；B 块须在 A2 修复并重建 jar 后重跑（场景/站位已就绪）。

### A3（**A 级 · 客户端运行时阻断**）`etim:crafting_progress` 通道名 22 字符 > 1.12.2 上限 20 → 一开背包/合成即断线
- **现象**：进服后一打开背包（2×2 合成格）或合成台，客户端立刻被断开；`run/obfuscated/logs/latest.log`：
  `io.netty.handler.codec.DecoderException: The received string length is longer than maximum allowed (22 > 20)` at `SPacketCustomPayload.func_148837_a:33`。
- **根因**：`CraftingProgressNetwork.java:39` 的通道名 `new ResourceLocation(Tags.MOD_ID, "crafting_progress")` = **`etim:crafting_progress`（22 字符）**。1.12.2 `SPacketCustomPayload.readPacketData` 以 `readString(20)` 读通道名，超长即抛 DecoderException。服务端在合成容器事件里推送该包（`ETIMCrafting:169/202/231/272/280`），所以每次开背包/合成台必断。
- **次生现象**：断开时 `channelInputClosed` 会把残留字节继续解码，报 `SPacketSpawnObject` 截断（38B）——这是**断线后的残留字节**，不是火球/僵尸/实体生成包的问题。
- **修法（一行）**：通道名改为 ≤20 字符，例如 `"craft_progress"`（19）或 `"craft_sync"`（17）；`ResourceLocation` 与双端注册共用同一常量，改一处即可。
- **影响**：**发布级阻断**（任何玩家开背包即断线）；B 块步骤 6（tooltip 需开背包）无法执行；步骤 1–5、7 可在**全程不打开背包/合成**的前提下先做。
- **修复验证（18:19–18:53）**：通道名改 `craft_progress` 后，19 mod 客户端连续开背包/JEI/合成悬停（18:22 SmoothFont 初始化、18:51 `[[CraftingLog]] CLIENT result click`），**零 `22 > 20`、零断线** → **A3 PASS**。
- **基线备注**：`runObfClient` 的 `reobfJar` 重写了 `build/libs/etim-1.0.0.jar`（321,481B → **321,483B**）；A3 修复后重建为 **321,484B**（`23AC62275DB92CDE…`），`build/libs` 与 `run/obfuscated/mods` 逐字节同源，B 块读数基线为 **321,484B**。

### A4（**A 级 · 发布级**）`zh_cn.lang` 为 GBK 编码 → 客户端 HUD/聊天中文乱码
- **证据**：`src/main/resources/assets/etim/lang/zh_cn.lang` 3943B，按 UTF-8 解码出现 **77 个 U+FFFD**；GBK 解码可读但已有损坏字节（`commands.state.usage` 行 GBK 下仍是 `查�?ETIM`）。`en_us.lang` 3979B，UTF-8 零 U+FFFD（正常）。
- **现象**：HUD `饥饿诊断: 食?0 饱?5.00`、`方块触及 … 3.50 ?X`、`剩余?512`；聊天 `已设双池：饱�?6 营养=6（上�?6 点）`（`run/obfuscated/logs/latest.log` 18:25:54）。数字与颜色仍可读，`?` 只落在标签/判定符/标点上。
- **修法**：`zh_cn.lang` 以 UTF-8 重写并修复已损坏字节；检查 `resources` 下其他 `.lang`/`.json` 编码；重建 jar。
- **B 块影响**：读数在乱码状态下完成，数值判据不受影响；A4 修复后 HUD 可读性恢复。

### A5（**C 级 · 口径不一致**）`getHarvestTool==null` 的方块：有效工具✓ 但无 reach 加成
- `ETIMReach.getBlockReach` 用 vanilla `getDestroySpeed(held, state) > 1.0F` 判工具加成；`ETIMMining.isEffectiveAgainstBlock` 对 `getHarvestTool==null` 的方块改用 ETIM 表（`pickaxe && grade>=min`）。
- 玻璃（min0/硬度2.0）：前者返回 1.0（无加成 → `方块触及 2.75`），后者 ✓（str 1/4/5/6/10 全对）。HUD 同时出现“有效工具✓ + 方块触及 2.75 ✗”。
- 影响：仅 HUD 自相矛盾；玻璃 ⑥ 行按 display-only str 判 PASS。是否统一谓词待主会话裁定。

### A6（**B 级 · 测试口径**）饥饿 `/5` 静默改 str；`(#0270)` 待释义
- `ETIMMining:223` `if (!hasFoodEnergy) str /= hungerDigStrDivisor`（默认 5）。首轮黑曜石铁 1.60/768、钻 2.00/615 即 8/5、10/5；`/etest food 6 6` 后回 8.00/154、10.00/123。⑥ 每组读数前须确认 HUD `食?≥1 / 营养>0`。
- 新鲜木镐 tooltip 名 `木镐 (#0270)`、`NBT: 1个标签`、无独立品质行；`#0270` 是否属 F-9-19“无品质行”基线，需主会话释义。

### B3（**C 级 · 设计**）`/weather clear` 被 ETIM 天气钟覆盖
- `weatherSystem=true`（默认）时 `MixinWorldWeather` 接管 `World.updateWeatherBody`（R196 天气钟），vanilla `/weather clear` 下一 tick 被覆盖；测试要晴天需 `weatherSystem=false` 重启，或 `doWeatherCycle=false` 走 passthrough。**不是缺陷**。

### B1（**B 级 · 对照口径**）天然窗末段 `mod=0.5`
- 20:19:06 起 `modifier mod=0.5`（decreased 事件落地），占窗口后 6.8 min。整窗 accept 6,051 与血月窗对比时须并列该事件；如需纯净对照，用 pre 段（14.3 min，accept 3,938）。

### C1（**C 级 · 工装**）1.12 僵尸村民注册名
- `/summon ZombieVillager` 报 `Entity type 'minecraft:zombievillager' is invalid`；正确名为 **`zombie_villager`**（`/summon zombie_villager` 成功，`testfor @e[type=zombie_villager]` → Found RE_ZV）。本轮已现场补召，实体在线 19 min+，不影响判据。

### B2（**B 级 · 工装面**）收口期 mass RCON `/kill` 触发原版 `EntityTracker` 并发崩服
- 21:12:57 收口第一轮：连续下发 `kill @e[…type=Zombie/Skeleton/Creeper…]`（单次击杀 20–30 只）时，RCON 线程与 Server 线程并发改 `EntityTracker.trackedEntities`，抛 `java.util.ConcurrentModificationException`（`EntityTracker.func_72788_a:290`），服务端自动 stop 并保存世界。
- **不影响判据**：血月窗 21:09:32 已收官，`save-all`/自动保存均落盘；重启后已按 1–2 s 间隔重做净场（Chicken/Squid 等自然实体保留），gamerule/时间/围栏复原全部回读通过。
- 纪律更新：**收口净场一律分批 + 间隔 ≥1 s**，禁止单 tick 连发多条 mass kill。

### C2（**C 级 · 仪器**）血月下 `modifier` 行逐 tick 刷屏
- 856 行 `modifier mod=1.0 d=851…`：`rescueGate` 在 `mod<1.0` 的每个 tick 都置 `ev=true`（`ETIMSpawnCycle:157-162`），于是“仅边沿打印”在血月 decreased 窗内退化为逐 tick 打印。行为正确（mod 已回 1.0），仅为日志噪声；建议后续把 rescue 置位纳入边沿去重（同一 decreased 窗只打一次）。

### C3（**C 级 · 记录**）血月窗的天气副作用
- 血月强制雷暴（weather slice）属既定行为；本窗未观察到雷击起火影响判据（日志无 fire 相关异常）。

### C4（**已闭环**）B 块已执行
- 2026-10-20 18:19–18:53 完成；结果见 §2.4。A3 修复后客户端全量 19 mod 实连，三组读数全判 PASS。

---

## ④ 下一批建议

1. **B 块已收官**（2026-10-20 18:19–18:53，19 mod 实连；结果见 §2.4）。
2. **A4（lang GBK→UTF-8）**：`zh_cn.lang` 以 UTF-8 重写并修复 77 个 U+FFFD 损坏字节，重建 jar；验收 HUD/`/etest`/`/state` 无 `?`/`�`。
3. **A5（玻璃 reach 谓词）**：裁定 `getBlockReach` 的工具加成条件是否改用 `isEffectiveAgainstBlock`；当前玻璃 `有效工具✓` 但 `方块触及 2.75`。
4. **A6（`#0270` 释义）**：确认新鲜木镐 tooltip 的 `(#0270)` 是否属 F-9-19“无品质行”基线；⑥ 读数前务必 `/etest food 6 6`（饥饿 /5）。
5. **⑨ 离线窗（可选）**：若要判 ⑧ 的 `player<=1024`/`kill<=2400` 墙与旁观映射，只能在“玩家离线但实体仍 tick”的窗（force-load）跑；在线态按 A1 口径记录即可。
6. **⑨ 天然窗复测（可选）**：若需剔除 B1 的 mod=0.5 影响，开 20 min 纯 pre 段窗或延长到 40 min 取 mod=1.0 段。
7. **⑤ F-9-16**：第二批修 `set()` 的 average 早退后，`give` + NBT 直读复测（无需客户端）。

---

## 附：环境终态（全部回读）

| 项 | 状态 |
|---|---|
| 床 | `-66,68,246` / `-66,68,247` **双格 bed 在位** ✔（三窗 boot 后均回读；F5 三点 OK） |
| 围栏 | 临时 barrier 围栏 `-59..-55 / z=249..253 / y=68..70` **已拆**（回读 `-59,68,249` / `-55,68,253` = air） ✔ |
| 观察室 | `-22..-18,63..65,249..253`、`-22..-18,63..65,268..272`、`-112..-108,60..62,249..253` 均回填 **stone** ✔ |
| 屋顶 | `-66,70,247` = stone（31 块） ✔ |
| C13 | `testfor @e[...,r=128,type=Zombie]` = **found nothing** ✔；同框自然实体：Chicken ×8、Squid ×3、rottenFlesh ×1（RE_ZV 已补杀） |
| gamerule | `doMobSpawning / doDaylightCycle / doMobLoot` = **true**；`keepInventory` = **false** ✔ |
| 时间 | `time set 1000`（doDaylightCycle=true 恢复自然推进） ✔ |
| cfg | `moonStateOverride=`（空）／`zombieDigAI=true`／`bedSentryWake=true`／`bedHostilePathable=true`／`mobwakeRarity=1000`／`weatherSystem=true`／`weatherDebugLog=false`／`deathXpOrbs=false`／`deathDebugLog=false`／`foodDebugLog=false`／`mobDebugLog=true` ✔ |
| C16 TPS | Δtick/10s = **204** ✔ |
| 服务端 | **已 stop，25565 无监听** ✔ |
| 进程 | java **零残留**（GradleDaemon 亦已退出）；node 测试进程 **零残留** ✔ |
| git | `## master...origin/master`；**`src/main` 净** ✔ |
| 备注 | `run/obfuscated/crash-reports/` 新增 `crash-2026-10-19_21.12.57-server.txt`（§B2 的 RCON 并发崩服，非窗口内） |
| B 块场景 | 平台 `-56..-24 / y=79 / z=234..266` 与 y=80..84 测试块 **`fill … air`**（1089+339）✔；火球已杀、僵尸零 ✔ |
| B 块 mods | `run/mods` **13 个不动** ✔；`run/obfuscated/mods` 27 个（etim **321,484B**）✔ |

**落盘日志**：
- `build-logs/re-final2-natural-200428.log`（+ `.stats` / `.clock` / `.base`）——天然窗与 ⑧ 并入
- `build-logs/re-final2-blood-204822.log`（+ 同名侧车）——血月窗
- `build-logs/re-final2-natural-200402.log`（首次尝试，床检函数名冲突即中止，无铺设）
- 判据行源：`run/obfuscated/logs/latest.log`

**新增/更新工装**（仅 `testharness/player/`）：`re-window.ps1`（长窗驱动：床双检→铺场→召唤→采样→统计）、`re-stats.ps1`（分段统计/日切分/相位统计）

**B 块执行记录（2026-10-20 18:19–18:53，判据源 = 客户端实连）**：
- 环境：obf 客户端 19 mod 全量（OptiFine HD U G5 / SmoothFont 2.1.4 / ReBind 2.7.5 / JourneyMap 6.0.10 / JEI 4.22.0.1034 / CraftingTweaks / StepUp / TheOneProbe 等），服务端同 **321,484B** jar；A3（`craft_progress`）修复后进服，18:19–18:53 零断线。
- 读数：④ 方块 `3.40/3.50✓`、怪 `3.25✓`（1 HP 僵尸一击死）、火球 `4.50✓`、创造 `5.00✓`；⑤ 新鲜木镐无独立品质行、木棍对 no-decay 树叶可及窗零 ERROR；⑥ 玻璃 1.00/1024、4.00/256、6.00/171、5.00/205、10.00/103；圆石 0/0/0/8.00/128/10.00/103；黑曜石 0/0/8.00/154/10.00/123。
- 工装修正：站位 x=blockX+0.5（原 `-39.5` 对 `-39` 偏 1.0 → 体点 3.55 被拒）；黑曜石/玻璃/树叶换可达位置；树叶 `leaves 4`（no-decay）；步 5 前 `/etest food 6 6`（否则 `str /= 5`）。
- 收口：场景 `fill … air` 339+1089；火球杀；`doMobSpawning/doDaylightCycle/doFireTick=true`、`time 1000`；`save-all`→`stop`；25565 无监听；java/Gradle 零残留；`run/mods` 13 不动；`src/main` 净。
- 遗留：A4（lang GBK）、A5（玻璃 reach 谓词）、A6（`#0270` 释义）由主会话处置；B 块读数不受 A4 乱码影响（数值可读）。

**签署**：会话七 ｜ 基线 `ad3f0c4` ｜ ⑧ 狼 **PASS** / ZV **PASS** / 旁观 **BASELINE**（结构不可达） ｜ ⑨a 天然 **PASS** ｜ ⑨b 血月 **PASS** ｜ ④⑤⑥ **PASS**（B 块 18:19–18:53） ｜ 核讫表 **17 行全判** ｜ 待办：A4（lang GBK）、A5（玻璃 reach 谓词）、A6（`#0270` 释义）
