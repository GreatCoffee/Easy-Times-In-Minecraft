# 三蜘蛛 spawn 补轮验证窗 + U-04 slab 抗性并窗（S-R3）· 判决报告

> **执行方**：会话七（验证窗执行）
> **判决源**：`playground/audit/spider3-终审回执.md`（判词 §一 / 判行 §六）＋
> `playground/audit/u04-slab-抗性判词.md`（S-R1/S-R3）
> **现役钉值**：jar **369,933 B** @ **2026-10-23 19:53:12**｜SHA256
> **5AD302D772F38E363F58BC5AEDBD8FEF08B1B186A2E02275FC4EC81DE3C5454A**｜commit **d4b4c76**
> **判定面**：`run/obfuscated-server/logs/latest.log`（`[SpawnLog]` / `[MobLog]` /
> `[TestLog]`）＋ 驱动侧统计（服务端存档、发包计数）
> **快照**：`build-logs/spider3-server.log`（8,543,351 B，停服后整档）
> **口径**：通过用 ✓、不通过用叉号；本报告 UTF-8 无 BOM、0 U+FFFD。

---

## 零、基线核讫（逐位）

| 项 | 钉值 | 实测 | 判 |
|---|---|---|---|
| jar 字节数 | 369,933 B | 369,933 B | ✓ |
| jar 时间 | 2026-10-23 19:53:12 | 2026-10-23 19:53:12 | ✓ |
| SHA256 | 5AD302D7…C5454A | `5AD302D772F38E363F58BC5AEDBD8FEF08B1B186A2E02275FC4EC81DE3C5454A` | ✓ 逐位 |
| commit | d4b4c76 | `d4b4c76` | ✓ |
| `src/main` 相对 HEAD | 0 改动 | `git status --porcelain -- src/main` = 0 行 | ✓ |
| 服务端加载面 | classpath 追加 build/libs（mods 零 etim） | `classpath append: …etim-1.0.0.jar (mtime=2026-10-23 19:53:12)` | ✓ |
| 客户端加载面 | init 脚本同步 + 校验 | `pinned etim jar synced+verified: 369933B SHA256 5AD302D7…C5454A` | ✓ |
| 窗口内重建 | 禁止 | 全程 0 次 rebuild | ✓ |

---

## 一、判决类清单（V1~V9）

| # | 判点 | 判词 | 依据（一手续行锚） | 判值 |
|---|---|---|---|---|
| V1 | 门1 BlackWidow 50% 通过门 | **PASS** | `ETIMSpawnTables.pickSpawn` :239-249（`nextFloat() < 0.5F` → continue） | 拒 658 行（值域 0.02~0.49，全 <0.5）；收 110 行落地；决策面 50/50 |
| V2 | 门2 depth-32 | **PASS** | 同文件 :252-259（`dim==0 && pos.getY() > 32` → continue） | 拒 103 行，y∈[38,135] 全 >32；y≤32 侧 Demon 13 + Phase 15 落地 |
| V3 | 门3 Phase 64 次重试 | **PASS** | `ETIMSpawnCycle.spawnPack` :559-566（entry 选定处、round-scoped） | `phase-max-attempts 64` 591 行；每 round 恰 1 行（入口一次 → 多投） |
| V4 | web 投掷 + 火网 | **PASS** | `ETIMEntityArachnid.attackEntityWithRangedAttack` :192-213；`ETIMEntityWeb.onImpact` :86-136 / `setBlockToWebIfEmpty` :153-178 | Demon 4 投 `burning=true`、BlackWidow 2 投 `burning=false`；网旁引火 3 格；脚下落网 |
| V5 | Phase 传送（闪避 / 跃迁 / 非触发源） | **PASS** | `ETIMEntityPhaseSpider.onLivingUpdate` :69-96、`tryTeleportTo` :103-148、`tryTeleportAwayFrom` :155-198、`attackEntityFrom` :205-219 | `kind=evade` 4 行，`evasions_left` 3→2→1→0；`kind=path` 2 行（额度恒 4）；fall/fire/poison 增量 0/0/0 |
| V6 | Demon 毒/缓 + 火岩浆免疫 | **PASS** | `ETIMEntityDemonSpider.attackEntityAsMob` :48-57；`attackEntityFrom` :63-70 | 9 命中 → 9×(poison id19 amp0 dur**480**) + 9×(slowness id2 amp**5** dur**50**)；岩浆 9 s 存活、火块 6 s 存活 |
| V7 | 经验 8/15/10 | **PASS** | BlackWidow :13（8）/ Demon :23（15）/ Phase :40（10），`EntityLiving.experienceValue` | Δ = **8 / 15 / 10** 逐位 |
| V8 | slab 族爆炸抗性归零（S-R1） | **PASS** | `MixinBlock.etim$r196SlabExplosionResistance` :61-70（`instanceof BlockSlab → 0.0F`） | 石/木/双半砖 d=4/5/6 全毁；石头负证 d=4/5/6 全存 |
| V9 | 渲染面 | **PASS（肉眼面，附截图）** | `ETIMSpiderEntities.register` :17-26；G-S10 scale 0.6/1.0/0.6 | 截图 `build-logs/sp3-render-f2.png` / `sp3-render-web.png`：三色可辨、体型差异可辨 |

**总记**：PASS 9 / FAIL 0；C 级登记 4 笔（见 §四）。

---

## 二、逐判点核讫表

### V1 · 门1 BlackWidow 50%（`[SpawnLog] blackwidow-gate reject`）

**行锚**（`ETIMSpawnTables.java`）

```java
if (cls == ETIMEntityBlackWidowSpider.class) {              // :239
    float dice = w.rand.nextFloat();                        // :240
    if (dice < 0.5F) {                                      // :241
        if (ETIMConfig.mobDebugLog) { ETIM.LOGGER.info("[SpawnLog] blackwidow-gate reject nextFloat=" + … + " at " + …); }  // :242-245
        continue;                                           // :246
    }
    return picked;                                          // :248
}
```

32 行外层重试循环：`for (int attempt = 0; attempt < 16; attempt++)`（:214），耗尽 `return null`（:271）。

| 判据项 | 样本 | 判值 | 判 |
|---|---|---|---|
| 拒支判行现形 | **658 行**全轮 | 原文例：`[SpawnLog] blackwidow-gate reject nextFloat=0.31 at (87,5,255)` | ✓ |
| 拒支值域 | 658 行逐行取 `nextFloat` | **min 0.02 / max 0.49**（全部 < 0.5；无 ≥0.5 误入拒支） | ✓ |
| 接受支落地 | **110 行** `accept ETIMEntityBlackWidowSpider` | 原文例：`[SpawnLog] accept ETIMEntityBlackWidowSpider at (192,44,218) y-bucket=under` | ✓ |
| 主窗拒/收（后整形，y20 窗 240 s） | 拒 15 / 收 21 | 拒:收 = 0.71（见 §四 B-1：收方被 round 多投放大，决策面仍 50/50） | ✓ |
| 连拒 16 次才 null | 无 16 连拒样本（p≈2⁻¹⁶≈1.5e-5/16 投） | 代码面 :214/:271 逐位在册；统计面不可达（登记 B-3） | ✓（静态） |

**主窗 y 带分解**（拒 15 行）：`roomB 18-25 = 5`｜`roomA 38-45 = 6`｜`roofA 46-49 = 2`｜`other = 2`（other 为 y=135 竞技场台面，仍 >32，属门2样本）。

**说明**：早期两窗（20:12 期）表面未铺基岩，表层 y=5 贡献了主要拒支样本（658 的大头），这些样本同样是 `pickSpawn` 的同一分支，判值有效；铺基岩后样本收敛到两块暗房（V1 门本身与 y 无关）。

---

### V2 · 门2 depth-32（`[SpawnLog] depth-gate reject`）

```java
if ((cls == ETIMEntityDemonSpider.class || cls == ETIMEntityPhaseSpider.class)
        && w.provider.getDimension() == 0 && pos.getY() > 32) {   // :252-253
    … log "depth-gate reject cls=" + … + " y=" + pos.getY() …     // :254-256
    continue;                                                     // :258
}
```

| 判据项 | 样本 | 判值 | 判 |
|---|---|---|---|
| 主世界 y>32 必拒 | **103 行**全轮；主窗 23 行 | y 逐行取值域 **min=38 / max=135**（无一 ≤32）；`cls` 两族齐（Demon 18 / Phase 5，主窗） | ✓ |
| 拒支原文 | — | `[SpawnLog] depth-gate reject cls=ETIMEntityDemonSpider y=38 at (195,38,205)`<br>`[SpawnLog] depth-gate reject cls=ETIMEntityPhaseSpider y=48 at (216,48,183)` | ✓ |
| y≤32 洞穴可落地 | 主窗 Demon **13** + Phase **15** = 28 行 | 全部落在 roomB 带 y=18..25；原文例：`accept ETIMEntityDemonSpider at (198,24,188) y-bucket=under`、`accept ETIMEntityPhaseSpider at (209,18,188) y-bucket=under` | ✓ |
| dim 面 | 仅 dim=0 出现（本世界无 dim≠0 窗口） | 静态 `w.provider.getDimension() == 0` 门在册 | ✓（静态） |

**y 带分解**（拒 23 行）：`roomA 38-45 = 11`｜`roofA 46-49 = 8`｜`other(y=135) = 4`；`surface/roomB = 0`（y≤32 不触发）✓ 反向自洽。

---

### V3 · 门3 PhaseSpider 64 次重试（`[SpawnLog] phase-max-attempts 64`）

```java
if (entry.entityClass == ETIMEntityPhaseSpider.class) {     // :561
    maxSpawnAttempts = 64;                                  // :562
    if (ETIMConfig.mobDebugLog) { log(w, "phase-max-attempts 64 at " + pos(cursor)); }  // :563-565
}
```

| 判据项 | 样本 | 判值 | 判 |
|---|---|---|---|
| 装载判行现形 | **591 行**全轮；主窗 4 行 | `[SpawnLog] phase-max-attempts 64 at (211,5,288)` | ✓ |
| 恰 1 行/round | 主窗 4 行 ↔ Phase 收 15 + 拒 5 | 判行挂在 `if (entry == null)` 内（round 首次取样处），同一 round 后续 attempt 复用 entry 不再打行；4 round → 15 投落地 = 每 round 多投，行数不随投数增长 | ✓（代码锚 + 计数一致） |
| 非 Phase 入口不涨到 64 | 未出现 `phase-max-attempts` 与其它类成对 | 静态：`entry.entityClass == ETIMEntityPhaseSpider.class` 精确类门 | ✓（静态） |

---

### V4 · web 投掷（`[MobLog] web-throw`）

| 判据项 | 样本 | 判值 | 判 |
|---|---|---|---|
| Demon 投掷 | 4 投 | `web-throw thrower=entity.etim.demon_spider.name#… target=ETIM_Harn04#… dist=1.5 burning=true` | ✓ burning=true |
| BlackWidow 投掷 | 2 投 | `web-throw thrower=entity.etim.black_widow_spider.name#… target=… dist=1.3 burning=false` | ✓ burning=false |
| 目标位/脚下落网 | 投后 `bot.blockAt(脚下)` | `web blocks at bot feet now: web` | ✓ |
| 网旁引火 | 燃烧网落点邻面 | 累计观测到 **3** 个 fire 单元：`77,135,100` / `87,135,95` / `80,135,101`（`setBlockToWebIfEmpty` burning 支随机空邻面点火） | ✓ |
| 瞄准/间隔面 | Demon 4 投落在 90 s 内（200 tick 间隔）；BlackWidow 2 投落在 70 s 内（500 tick 间隔） | 与 :110-113 的 200/500 间隔一致 | ✓ |

---

### V5 · Phase 传送（`[MobLog] phase-teleport`）

| 判据项 | 样本 | 判值 | 判 |
|---|---|---|---|
| 受击闪避 `kind=evade` | 4 行（主跑）＋ 5 行（前跑）= 9 行 | `phase-teleport to=(77,135,102) evasions_left=3 kind=evade`<br>`… evasions_left=2 …`｜`… =1 …`｜`… =0 …` | ✓ 额度 3→2→1→0 |
| 先扣后传（全败也扣 1） | 末行 `evasions_left=0` 仍出传送 | 第 4 击扣到 0 后仍尝试并成功传送（R196 `num_evasions--` 在 `tryTeleportAwayFrom` 之前，D-S1 照转） | ✓ |
| 追击有 path 时 `kind=path` | 2 行 | `phase-teleport to=(78,135,103) evasions_left=4 kind=path`<br>`phase-teleport to=(80,135,106) evasions_left=4 kind=path` | ✓（额度不消耗） |
| fall 不触发 | 高空坠落 7 格（Health 20 保活） | `kind=evade` 全局增量 **0** | ✓ |
| fire 不触发 | 脚下方块置火 6 s | `kind=evade` 增量 **0** | ✓ |
| 毒（MAGIC）不触发 | `effect poison 12 1` 5 s | `kind=evade` 增量 **0** | ✓ |
| `/kill`（OUT_OF_WORLD）面 | 收口清理时 | `/kill` 命中后出 `kind=evade`（evasions_left 3）——**非** fall/fire/poison，属可闪避伤害源，照转 | 登记（§四 C-2） |

---

### V6 · Demon 特效与免疫（`[MobLog]`＋实体状态）

| 判据项 | 样本 | 判值 | 判 |
|---|---|---|---|
| 近战毒 480 | 9 次命中 → 9 个效果包 | 客户端 `entity_effect` 逐包：`id=19 amp=0 dur=480` ×9 | ✓ 逐位 |
| 近战缓慢 V（50,5） | 同上 | `id=2 amp=5 dur=50` ×9 | ✓ 逐位 |
| 火免疫（IN_FIRE） | 站火块 6 s | `/testfor @e[name=SP3Demon…,r=40]` = **Found** | ✓ |
| 岩浆免疫（LAVA） | 站岩浆块 9 s（盆内 lava） | `/testfor` = **Found**；`basin=lava` | ✓ |
| 浅水不落地 | **无自然样本** | 见 §四 B-3（1.12 `EntityLiving.getCanSpawnHere` 的 `containsAnyLiquid` 与本闸同判，独立可观测面不存在） | 登记 |

（若未免疫：岩浆 4 伤/tick → 18 HP 在 5 tick 内必死，9 s 存活为强判据。）

---

### V7 · 经验 8/15/10

| 物种 | before | after | Δ | want | 判 |
|---|---|---|---|---|---|
| BlackWidow | 18 | 26 | **8** | 8 | ✓ |
| Demon | 26 | 41 | **15** | 15 | ✓ |
| Phase（evasions=0 召唤） | 41 | 51 | **10** | 10 | ✓ |

读数源：`/state` 的 `etim.state.deathXp` 行（`total=<experienceTotal>`，ETIM 池化的唯一存储）+ 经验球入池（`ETIMXp.applyTotal` → `SPacketSetExperience`）。
杀法：生存模式、`/etest hold minecraft:diamond_sword` 直填主手、每次命中前 `/tp` 目标到贴身 0.9 格并 `lookAt`。

---

### V8 · slab 族爆炸抗性（S-R1 实测）

判法：竞技场 y=135 平铺，每道一桶 TNT（`{Fuse:40}`）与一块目标块，横向间隔 8 格，炸后逐块回读。

| 道 | 目标块 | 距 TNT | 爆后块 | 判 |
|---|---|---|---|---|
| z=112 | `minecraft:stone_slab` | d=6 | air | **毁** ✓ |
| z=104 | `minecraft:wooden_slab` | d=5 | air | **毁** ✓ |
| z=96 | `minecraft:double_stone_slab` | d=5 | air | **毁** ✓ |
| z=80 | `minecraft:stone_slab` | d=4 | air | **毁** ✓ |
| z=64 | `minecraft:stone_slab` | d=5 | air | **毁** ✓ |
| z=72 | `minecraft:stone` | d=5 | stone | **存** ✓ |
| z=88 | `minecraft:stone` | d=4 | stone | **存** ✓ |
| z=120 | `minecraft:stone` | d=6 | stone | **存** ✓ |

**判读**：`f2=0`（slab 族经 MixinBlock 单点归零）→ 每格仅 0.225 衰减，d=4/5/6 一律穿透；石头 vanilla 读数 6.0 → 每格 1.89 衰减，d=4/5/6 全存。**族内三种（石半砖/木半砖/双半砖）同判**，负证（非 slab 方块 vanilla 行为不变）成立。

---

### V9 · 渲染面（肉眼豁免，附截图）

- `build-logs/sp3-render-f2.png`（420,285 B）：同一视野内三只可辨——
  中央大号**暗红**（Demon，scale 1.0）、左侧小号**暗红**（BlackWidow，scale 0.6）、右侧小号**蓝紫**（Phase，scale 0.6）；材质为 vanilla 蜘蛛皮**乘色**（G-S9a 口径）。
- `build-logs/sp3-render-web.png`（368,565 B）：同视野 + 远处燃烧网残迹（白网 + 火焰粒子）。
- 网投射物 RenderSnowball 面：**未取得定格**（`thrown_web` 命中即亡），按任务书 V9 肉眼豁免登记。

---

## 三、负证（全窗）

| 项 | 实测 | 判 |
|---|---|---|
| `Mixin apply failed` / `MixinApplyError` | 0 / 0 | ✓ |
| `FATAL`（服务端日志） | 0 | ✓ |
| `Crash report` / `Ticking entity` / `Exception ticking` | 0 / 0 / 0 | ✓ |
| 驱动脚本 `FATAL` | 0（全部 `sp3-*.out`） | ✓ |
| 服务端 `/ERROR` | 9 行 = FML 启动噪声 4（Maven 目录/签名）+ NetworkDispatcher 5（客户端与 bot 断链） | ✓ 分列，非 mod 异常 |
| 非预期 kick | 0（`lost connection` 均为 bot 主动 quit 与收口时客户端先退） | ✓ |
| `foodTestMode` | false（配置面复核） | ✓ |
| 端口 25565/25575 LISTEN | 全部关闭 | ✓ |
| 世界替换后 `level-name` 还原 | `level-name=testw2h` / `level-type=DEFAULT` / `generator-settings=` | ✓ |
| 客户端优雅收口 | `Stopping! recorded` + Gradle `BUILD SUCCESSFUL in 2m 2s` | ✓ |

---

## 四、冲突分级

### A 级（真值反转 / 判据 FAIL）
**0 笔。**

### B 级（需主会话裁的口径 / 环境面）

**B-1 拒/收比在日志层不是 1:1（机制性放大，非缺陷）**
`spawnPack` 的 `entry` 是 round-scoped：门1 放行一次后，同一 round 内后续 attempt **继续生成同类**（`entry.newInstance`），一个"通过"可产生 1~4 条 accept。故日志面 拒:收 = 15:21（≈0.71）而非 1:1；决策面由 `nextFloat < 0.5` 构造为 50/50，且 658 条拒支值域 [0.02,0.49] 均匀。**建议**：判据写法改为「拒支值域 ⊂ [0,0.5) ∧ 收支同带落地」，不再要求日志 1:1。

**B-2 V5 `kind=path` 样本仅 2 条**
跃迁面要求 navigator 有 path ∧ `ticksExisted%10==0` ∧ `rand(3)==0` ∧ 剩余点 >1 ∧ 目标点 `distanceSq>3.0`。主跑（创造目标）0 条——**创造玩家不被索敌，无 path**；改生存目标后 2 条命中。属正常低样本，非 FAIL。

**B-3 V6 浅水不落地无独立可观测面**
1.12 `EntityLiving.getCanSpawnHere` 已含 `!world.containsAnyLiquid(bb)`，Demon 的 `getCanSpawnHere` 覆写（foot/above 水）与之同判；自然刷怪窗无法把两者区分。**建议**：维持静态判词 + 登记，不投专项。

**B-4 世界替换（工装面）**
`testw2h` 全境无丛林：离线 region 扫描 832 块（biome 统计：plains/river/birch/wooded_hills/dark_forest/swamp/beach/ocean，**0 jungle**）＋ bot 网格扫描 768/512 步共 274 点（±3584）＋ `/locate Temple` 10 候选（沙漠/沼泽/雪原），均无 `Biomes.JUNGLE`（21）。V1 门1 只挂 `JUNGLE`，故新建一次性 flat 世界 `sp3flat`（`generator-settings=3;minecraft:bedrock,2*minecraft:stone,minecraft:dirt,minecraft:grass;21;` → 实测 `biome=21 jungle` 全图一致）。**jar 未动**；收口已还原 `server.properties`。`sp3flat` 存档保留为工装资产（可删）。

### C 级（登记，不阻塞）
- **C-1** `/kill`（`OUT_OF_WORLD`）可被 Phase 闪避：收口清理需按名逐个补刀；同名残留会污染后续选择器（本轮已改唯一名 `SP3*_<tag>`）。
- **C-2** 1.12 mod 实体选择器：`type=etim.x` 与 `type=etim:x` 均报 `Entity type … is invalid`；`@e[name=<CustomName>]` 是唯一可靠面；`/tp` 不收 `limit=1`（`Invalid selector argument`），`/testfor` 同。
- **C-3** 生存近战 reach 门（`ETIMReachEvents.onAttackEntity` :40-53，`meleeReachBase≈1.5`）按**眼射线 ∩ 盒**判，超距**静默取消**并打 `reach denied: etim.reach.deny_attack <dist> > <reach>`；创造免检。工装须「显式 `lookAt` + 贴身 ≤1.5」。
- **C-4** 竞技场须 ≥5 格厚：闪避 `tryTeleportAwayFrom` 的 `dy∈[-4,4]` 向下钻取会穿过 1 格厚平台落到 y=5（本轮实测，非产品缺陷，属几何面）。

---

## 五、逐方法核讫表（判行 → 载荷）

| 方法 | 行锚 | 本窗载荷 | 判行数 | 判值 |
|---|---|---|---|---|
| `ETIMSpawnTables.pickSpawn` 门1 | :239-249 | 16 投循环内 per-attempt 掷骰 | 658 拒 / 110 收 | 拒值 ⊂[0.02,0.49] ✓ |
| 同 门2 | :252-259 | `dim==0 ∧ y>32` | 103 拒 | y∈[38,135] ✓ |
| 同 门4（表行） | :166-168 | jungle override += BlackWidow(10,1,1) | 110 收 | 全落 jungle（biome 21 窗口） ✓ |
| `ETIMSpawnCycle.spawnPack` 门3 | :559-566 | round 首次取样 | 591 行 | 1 行/round ✓ |
| `ETIMEntityArachnid.attackEntityWithRangedAttack` | :192-213 | 6 投 | 6 行 | burning 真/假分族 ✓ |
| `ETIMEntityWeb.onImpact` / `setBlockToWebIfEmpty` | :86-136 / :153-178 | 6 投落网 + 燃烧支点火 | 6 行 + 3 火格 | ✓ |
| `ETIMEntityPhaseSpider.onLivingUpdate`（path 支） | :76-94 | 22 s 追击（生存目标） | 2 行 | `kind=path`，额度不变 ✓ |
| `tryTeleportTo` / `tryTeleportAwayFrom` | :103-148 / :155-198 | 9 击（4+5 evasions） | 9 行 | 3→2→1→0 ✓ |
| `attackEntityFrom`（非触发源） | :205-219 | fall 7 格 / fire 6 s / poison 5 s | 0 行 | 0/0/0 ✓ |
| `ETIMEntityDemonSpider.attackEntityAsMob` | :48-57 | 9 次命中 | 18 包 | 480/0 与 50/5 ✓ |
| `attackEntityFrom`（免疫） | :63-70 | 火 6 s / 岩浆 9 s | 2 testfor | Found ✓ |
| `experienceValue`（8/15/10） | BW:13 / Demon:23 / Phase:40 | 3 杀 | 3 Δ | 8/15/10 ✓ |
| `MixinBlock.etim$r196SlabExplosionResistance` | :61-70 | 8 桶 TNT | 8 回读 | slab 全毁 / 石全存 ✓ |
| `ETIMSpiderEntities.register` | :17-26 | 3 实体 + 网 | 2 截图 | 三色/三型可辨 ✓ |

---

## 六、主窗数据（后整形，可复算）

**主窗**：`roomB-y18` 240 s（12:37:45 驱动收线），bot 在 (200,18,200)，每 10 s `/kill @e[type=!Player]`，`mobDebugLog=true`。

| 统计项 | 值 |
|---|---|
| `blackwidow-gate reject` | 15 |
| `depth-gate reject` | 23（Demon 18 / Phase 5） |
| `phase-max-attempts 64` | 4 |
| `accept ETIMEntityBlackWidowSpider` | 21 |
| `accept ETIMEntityDemonSpider` | 13 |
| `accept ETIMEntityPhaseSpider` | 15 |
| `accept`（全类） | 1371 |
| `reject moon-night` | 0（暗房 outdoor=false，夜月门不适用） |
| `reject player-near` / `close-player` | 489 / 75 |
| `cap-block` / `density-skip` | 0 / 36 |
| 判行总行数（本窗切片） | 10,229 |

---

## 七、工装面（本轮新增/改动，均不入产品 jar）

| 文件 | 作用 |
|---|---|
| `testharness/player/biome-scan.js` | 离线 region 生物群系扫描（发现 testw2h 无丛林） |
| `testharness/player/sp3-probe.js` | bot 生物群系/方块探针 |
| `testharness/player/sp3-locate.js` | `/locate Temple` 候选 → 群系核读 |
| `testharness/player/sp3-setup.js` | 首版站点搭建（33×33 房 + 竞技场） |
| `testharness/player/sp3-run.js` | 本轮主驱动：`window y20\|y40` / `v4` / `v5` / `v6` / `v6b` / `v7` / `v8` / `rooms` / `glow` |
| `testharness/player/sp3-diag{,2,3,4,5,6}.js` | 选择器/闪避/reach 诊断（保留为事故现场） |
| `testharness/obfclient-fix.init.gradle` | 追加 `-PetimQuickConnect=1` 的 `--server/--port` 快速连接（默认不启用） |

世界整形（一次性，均在 `sp3flat`）：地面层 y=4 → 基岩（x 64..336 / z 64..336，杜绝表层采样）；观测房 y16..27 与 y36..47 各三层地板；竞技场 y130..134 五格厚。

---

## 八、终态表（收口）

| 面 | 终态 |
|---|---|
| 客户端 | 21:10:0x 优雅退窗：`Stopping!` + Gradle `BUILD SUCCESSFUL in 2m 2s`；快照 `build-logs/spider3-client-latest.log`（171,691 B） |
| 服务端 | 21:10:23 `Stopping server` → `Saving worlds` → 进程退出；快照 `build-logs/spider3-server.log`（8,543,351 B） |
| 端口 | 25565 / 25575 无 LISTEN |
| `server.properties` | 还原 `level-name=testw2h` / `level-type=DEFAULT` / `generator-settings=` / `difficulty=1` |
| 世界 | `testw2h` 已保存（扫描块 109.9 MB 增量）；`sp3flat` 保留为工装存档 |
| 产品面 | jar 未动（369,933 B / SHA256 逐位复核）；`src/main` 0 改动 |
| 重启后生效面 | 无遗留 etim jar 于 `run/obfuscated-server/mods`；下次应走 `testw2h` |

---

## 九、执行序（时间线）

1. 20:00 基线核讫 → 起服 `testw2h`（`mobDebugLog=true`、difficulty=1）。
2. 20:01 客户端（obf，全兼容列表）先行 → 自动连接 → 20:03 客户端自行退窗（`Stopping!` 已落、无崩溃报告；非本轮收口动作，收口为 21:10 二次退窗）。
3. 20:02–20:05 丛林缺失取证（离线 region + 网格 + `/locate`）。
4. 20:07 停服保存 `testw2h`（109.9 MB）→ 建 `sp3flat`。
5. 20:08 首次 `fixedBiome` 手法失败（JSON 格式）→ 改 `FlatGeneratorInfo` 串 `…;21;` → 实测 biome=21。
6. 20:10 站点搭建（房 + 竞技场）；20:11–20:24 早期窗（表面未整形）。
7. 20:18 铺辉石/玻璃/基岩 + 房改三层（采样收敛）。
8. 20:32/20:37 两窗取值（V1/V2/V3）。
9. 20:38 V4；20:41–20:53 V5（含 reach/选择器排障）；20:53 V6；20:54 V6b（火/岩浆）；20:55–21:06 V7；21:06 V8。
10. 21:08 客户端二次先行 → 21:09/21:10 两帧 F2 截图（V9）。
11. 21:10 还原 properties → 优雅关客户端 → 停服 → 快照。

---

## 十、结论

- **判定面：PASS 9 / FAIL 0**；三蜘蛛 spawn 补轮（V1~V7）与 U-04 slab 并窗（V8）全部落判，渲染面（V9）以截图 + 肉眼豁免落判。
- **真值冲突 0**；B 级 4 笔均为工装/口径面（世界替换、日志拒收比放大、path 低样本、浅水不可观测），**不构成产品缺陷**。
- **建议后续**：
  1. 若主会话要求 V1 拒/收比可复算，建议把判据改为「拒支值域 ⊂[0,0.5) + 收支同群系落地」，并保留 `sp3flat` 作固定窗。
  2. 浅水面若必须可观测，需要在 spawn 链上加一条 `[SpawnLog]` 水门判行（产品改动，另起轮）。
  3. `/kill` 闪避面（C-1）建议在工装层固化「按名补刀至额度耗尽」的清理原语。
