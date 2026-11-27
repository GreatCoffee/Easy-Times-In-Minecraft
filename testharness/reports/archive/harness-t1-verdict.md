# T1 包驱动 TestDriver 验证窗 — 判决报告

- 轮次：T1（补30 首单）｜目标：R10/R6 全 RCON 化
- 判决源：`[TestLog] step=…`（T1 步进面）＋ `[FoodLog]`（产品面）＋ `[EtimTest]`（回执面）＋ `/testfor` / `blocks` 探针（机制面）
- 落盘：`build-logs/harness-t1-server.log`（主判据，boot#3）、`harness-t1-server-crash.log`（useblock 崩溃面）、`harness-t1-server-final.log`（收口）、`harness-t1-dig-crash.txt` / `harness-t1-useblock-crash.txt`（崩溃报告）、`harness-t1-bot.out`、`harness-t1-client.out` / `-client-latest.log`
- 判决：**10 项判据 → PASS 8 ／ FAIL 2**（FAIL 均为同一根因：服务端 jar 缺失客户端侧便利构造器）

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | a729092 | `a729092 T1 harness: server-side packet driver TestDriver …` | ✓ |
| src/main 改动面 | TestDriver(新) + CommandDevTest(+4 子命令) + lang×2 | `git diff --stat 455e165..HEAD -- src/main` → 4 files, +238/−2 | ✓ |
| jar 大小/时间 | 340,211 B | 340,211 B ｜ 2026-10-22 20:07:30 | ✓ |
| jar SHA256 | CB079DD4…F2157 | `CB079DD4A24A62658F4D7A34707B4EA103A47FF855C54BCF497EF790679F2157` | ✓ |
| 客户端常驻校验 | 新钉值首验 | `[etim-harness] pinned etim jar synced+verified: 340211B  SHA256 CB079DD4…F2157` | ✓ |
| 客户端先行 | 客户端 JVM 早于服务端 | 客户端 20:13:30 → 服务端 boot 20:21:35（另见 §3-N1：中途重启服务端取干净日志） | ✓ |
| 起服面 | run/obfuscated-server 副本 + classpath 钉值 jar | `classpath append: …\build\libs\etim-1.0.0.jar (mtime=10/22/2026 20:07:30)` | ✓ |
| 附魔 id | 从 `[EtimInit]` 读，不写死 | `[EtimInit] enchant etim:endurance id=12` | ✓ |

---

## 1. 判决类清单

| 判据 | 期望 | 判 | 依据 |
|---|---|---|---|
| T-attack 步进面 | `[TestLog] step=attack target=…#…` 恰 1 行 | ✓ | 20:23:24 |
| T-attack 产品面 | `attackDrain mod=1.0 amount=0.3` 恰 1 行（无附魔态） | ✓ | 20:23:24 |
| T-dig 步进面 | dig-start/dig-stop 两行，间隔 ≈40 tick | ✗ **FAIL** | 无任何 `step=dig*` 行（崩溃于 START 包构造） |
| T-dig 产品面 | 窗内 digDrain ≥10 行、blockHitDelay 段无行、泥土服务端破碎 | ✗ **FAIL** | 同上，dig 从未入队成功 |
| T-noattack | `step=attack … NO_TARGET` | ✓ | 20:23:26 |
| T-useblock | `step=useblock` 1 行、无 crash | ✗ **FAIL** | 构造包即 `NoSuchMethodError`，服务端停机 |
| T-useitem | `step=useitem` 1 行、无 crash | ✓ | 20:23:29 |
| R10 全 RCON 链 | mod 0.8 / 0.6 / 0.39999998 / 0.19999999 各恰 1 行 | ✓ | 20:23:36 / :40 / :43 / :47 |
| R6 全 RCON 链 | STARVE 行 + 窗内 0 条 attackDrain（弱击拒） | ✓ | STARVE 20:24:20；攻击 20:24:24 无 drain |
| S2 `[EtimTest]` | 每条工装命令 1 行 | ✓ | 22 行（§2.8） |

---

## 2. 逐方法核讫表（判据行原文）

### 2.1 T-attack（`/etest attack @e[type=armor_stand,c=1]`）

```
[20:23:24] [Server thread/INFO] [FoodLog]  ETIM_Harn04 (109) attackDrain base=0.3 mod=1.0 amount=0.3 pool=1.2083058
[20:23:24] [Server thread/INFO] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#128
```

`CPacketUseEntity(Entity)` 在服务端 jar 存在（`li(vg)`），走的正是 vanilla `processUseEntity → attackTargetEntityWithCurrentItem`，
因此 `AttackEntityEvent` → `ETIMHungerEvents.onAttackEntity` → `chargeAttack` 全链成立。**注入面 PASS。**

### 2.2 T-dig（**FAIL**）

```
[20:19:27] [RCON Client #23/INFO] [EtimTest] commands.etest.drive_queued player=ETIM_Harn04 params=[dig BlockPos{x=-42, y=80, z=240}]
[20:19:28] [Server thread/ERROR] [FML]: Exception caught during firing event TickEvent$ServerTickEvent:
java.lang.NoSuchMethodError: net.minecraft.network.play.client.CPacketPlayerDigging.<init>(Lnet/minecraft/network/play/client/CPacketPlayerDigging$Action;Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/util/EnumFacing;)V
	at io.github.etim.etim.harness.TestDriver.feedDig(TestDriver.java:160)
	at io.github.etim.etim.harness.TestDriver.lambda$dig$1(TestDriver.java:83)
	at io.github.etim.etim.harness.TestDriver.onServerTick(TestDriver.java:127)
…
[20:19:28] [Server thread/ERROR] [MinecraftServer]: Encountered an unexpected exception
[20:19:28] [Server thread/INFO]  [MinecraftServer]: Stopping server
```

- `[EtimTest] drive_queued` 有 → **命令层正常**，坏在驱动步进。
- `step=dig-start` **一行都没有** → `TestLog` 在 `processPlayerDigging` 之后才写，构造期就抛错。
- `NoSuchMethodError` 是 `Error`，`onServerTick` 只 `catch (Exception)` → 逃出事件总线 → FML 停机（不是产品 crash，是工装 crash）。

### 2.3 T-noattack

```
[20:23:26] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=attack player=ETIM_Harn04 NO_TARGET selector=@e[type=bat,c=1]
```

`matchOneEntity` 返回 null → 走 `NO_TARGET`（无 `detail=`，证明是「0 命中」而不是「选择器语法错」；
语法错会带 `detail=commands.generic.selector_argument`，本轮 boot#2 早期见过该形态，见 §3-N2）。

### 2.4 T-useblock（**FAIL**）

```
[20:24:37] [RCON Client #57/INFO] [EtimTest] commands.etest.drive_queued player=ETIM_Harn04 params=[useblock BlockPos{x=-42, y=80, z=240}]
java.lang.NoSuchMethodError: net.minecraft.network.play.client.CPacketPlayerTryUseItemOnBlock.<init>(Lnet/minecraft/util/math/BlockPos;Lnet/minecraft/util/EnumFacing;Lnet/minecraft/util/EnumHand;FFF)V
	at io.github.etim.etim.harness.TestDriver.lambda$useBlock$3(TestDriver.java:91)
	at io.github.etim.etim.harness.TestDriver.onServerTick(TestDriver.java:127)
```

与 T-dig 同型；`step=useblock` 行同样缺失。（"持锄 + hoeDrain" 可选加验因此未执行——同一 ctor 先炸。）

### 2.5 T-useitem

```
[20:23:29] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=useitem player=ETIM_Harn04
```

`CPacketPlayerTryUseItem(EnumHand)` 在服务端 jar 存在（`mb(ub)`）→ 空手右键空转、无 crash、无异常值（语义空洞不判值）。

### 2.6 R10 全 RCON 链（同一件甲 1→2→3→4，零客户端输入）

```
[20:23:35] [RCON Client #39] [EtimTest] commands.etest.enchant_set player=ETIM_Harn04 params=[chest, Endurance I, Diamond Chestplate]
[20:23:36] [FoodLog]  ETIM_Harn04 (109) attackDrain base=0.3 mod=0.8        amount=0.24000001 pool=1.9402995
[20:23:36] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#128
[20:23:39] [RCON Client #42] [EtimTest] enchant_set … params=[chest, Endurance II, Diamond Chestplate]
[20:23:40] [FoodLog]  ETIM_Harn04 (109) attackDrain base=0.3 mod=0.6        amount=0.18       pool=2.2643027
[20:23:40] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#128
[20:23:42] [RCON Client #45] [EtimTest] enchant_set … params=[chest, Endurance III, Diamond Chestplate]
[20:23:43] [FoodLog]  ETIM_Harn04 (109) attackDrain base=0.3 mod=0.39999998 amount=0.12       pool=2.5263093
[20:23:43] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#128
[20:23:46] [RCON Client #48] [EtimTest] enchant_set … params=[chest, Endurance IV, Diamond Chestplate]
[20:23:47] [FoodLog]  ETIM_Harn04 (109) attackDrain base=0.3 mod=0.19999999 amount=0.06       pool=2.7283158
[20:23:47] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#128
```

四值逐位命中预计算，各恰 1 行；每档「enchant → food → attack」三步全在 RCON 会话内完成。
**T1 的收益目标（R10 不需要真客户端/机器人动作）成立。**

全轮 `attackDrain` 共 5 行（1 条无附魔态 + 4 条 R10），无多余行。

### 2.7 R6 全 RCON 链（弱击拒）

```
> /clear ETIM_Harn04            → 手空（关键：持工具会绕过弱击判定）
> /etest level 35 / health 20   → 血上限 20 > starveHealthCeiling=10
> /etest food 0 0               → 双池 0
（等 28 s ≈ 0.002/tick × 500 tick 的饿伤窗口）
[20:24:20] [FoodLog] ETIM_Harn04 (109) STARVE strike 1.0 (health=19.0 difficulty=1)
[20:24:24] [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#128
（20:23:55 ~ 20:24:27 窗内 attackDrain = 0 行；最后一条 drain 停在 20:23:47 的 R10-L4）
```

bot 侧同刻收到拒绝回执（raw key，bot 无 lang 表）：

```
[12:24:24.036] [chat] etim.hunger.weakStrike
```

→ `AttackEntityEvent` 被 `ETIMHungerEvents` 取消 ⇒ 无充能 ⇒ 0 条 attackDrain。**R6 全 RCON 成立。**

### 2.8 S2 `[EtimTest]` 回执通道

全轮 22 行，**全部来自 RCON Client 线程**（无一行依赖真客户端或 bot），逐条与命令一一对应：

| key | 行数 | 构成 |
|---|---|---|
| `commands.etest.level_set` | 2 | 开局 level 35 + R6 前 level 35 |
| `commands.etest.health_set` | 2 | 开局 20 + R6 前 20 |
| `commands.etest.food_set_pool` | 6 | 开局 1 + R10 4 + R6 1（`0 0`） |
| `commands.etest.drive_queued` | 8 | attack 6（1 无附魔 + 4 R10 + 1 R6）＋ useitem 1 ＋ useblock 1 |
| `commands.etest.enchant_set` | 4 | R10 四档 |

含两个崩溃面的 `drive_queued`（证明「命令层成、步进层败」）。`params=` 保留原始实参串，
如 `params=[dig BlockPos{x=-42, y=80, z=240}]`、`params=[attack @e[type=armor_stand,c=1]]`。

### 2.9 零客户端输入证据

`build-logs/harness-t1-bot.out` 的 `[act]` 行全轮**只有一条**：

```
[12:23:02.455] [act] READY bot=ETIM_Harn04 pos=-40.5,80.0,240.5
```

bot 只提供「在线玩家实体 + 连接」，未发任何动作；所有 drain 均由 RCON 命令 + 服务端包注入产生。

---

## 3. 冲突分级

**FAIL：2**（同根因）

| 编号 | 级别 | 内容 |
|---|---|---|
| F1 | **FAIL** | `T-dig`：`CPacketPlayerDigging(Action, BlockPos, EnumFacing)` 在 **1.12.2 专用服务端 jar 中不存在**（只有 `lp()` 无参构造）。`TestDriver.java:160` 构造即 `NoSuchMethodError` → 服务端停机；`step=dig-start/dig-stop` 与 digDrain 全缺失。 |
| F2 | **FAIL** | `T-useblock`：同型，`CPacketPlayerTryUseItemOnBlock(BlockPos, EnumFacing, EnumHand, float×3)` 服务端 jar 只有 `ma()` 无参构造 → `TestDriver.java:91` 抛 `NoSuchMethodError` → 停机。 |

根因证据（两份 jar 直接对比，非推断）：

| 类 | 编译期 jar `build/rfg/srg_merged_minecraft.jar` | 运行期 jar `mc-vanilla/1.12.2/server.jar` | 服务端可用? |
|---|---|---|---|
| `CPacketPlayerDigging` (`lp`) | `()` + `(Action, BlockPos, EnumFacing)` | **只有 `lp()`** | ✗ |
| `CPacketPlayerTryUseItemOnBlock` (`ma`) | `()` + `(BlockPos, EnumFacing, EnumHand, F, F, F)` | **只有 `ma()`** | ✗ |
| `CPacketPlayerTryUseItem` (`mb`) | `()` + `(EnumHand)` | `()` + `mb(ub)` | ✓（故 useitem 过） |
| `CPacketUseEntity` (`li`) | `()` + `(Entity)` | `()` + `li(vg)` | ✓（故 attack 过） |

即：编译面是「客户端 merged」，而多参便利构造器只在客户端代码里被调用（`PlayerControllerMP` / `Minecraft.rightClickMouse`），
Mojang 的服务端 jar 从不构造它们，因此运行时缺失。这不是 reobf/映射问题（映射表 `CL: lp …`、`CL: ma …` 正常），是**服务端 API 面本身没有**。

| 编号 | 级别 | 内容 |
|---|---|---|
| N1 | 过程注记 | boot#1 的 gate 文件残留上一轮 `E1`，bot 重放了一遍 E1 链，污染早期日志 → 删 gate、重启服务端取干净日志（boot#3）。**不改变判决**（所有判据行取自 boot#3 的 `harness-t1-server.log`）。 |
| N2 | 口径注记 | 任务书的 `@e[type=…,limit=1]` 是 1.13+ 语法；1.12 为 `@e[type=…,c=1]`（`limit` 报 `Invalid selector argument: 'limit=1'`，服务端会以 `detail=commands.generic.selector_argument` 落到 NO_TARGET，与「真无目标」形态可区分）。本轮已统一用 `c=1`。 |
| N3 | 工装健壮性 | `onServerTick` 只 `catch (Exception)`，`NoSuchMethodError`（Error）逃逸并让整个服务端停机。一个坏 step 不应掀桌。 |
| N4 | 收口注记 | 两个崩溃面各留一份 crash-report（`crash-2026-10-22_20.19.28` = dig、`20.24.37` = useblock）；收口另起一次服做世界复位并正常 `/stop`。 |

---

## 4. 伪代码建议（仅 FAIL 项）

### F1/F2 共用修法：无参构造 + Mixin 影子字段注入（不要反射字符串）

服务端 jar 里 `lp` / `ma` 的字段与客户端同名同序（`a`=BlockPos、`b`=EnumFacing、`c`=Action / `c`=EnumHand、`d..f`=float），
所以用 Mixin 直接写字段，既走「服务端真实存在的 ctor」，又不会因 SRG 名字漂移而碎：

```java
@Mixin(CPacketPlayerDigging.class)
public abstract class MixinDigPacketFactory {
    @Shadow private BlockPos field_179717_a;              // position
    @Shadow private EnumFacing field_179716_b;            // facing
    @Shadow private CPacketPlayerDigging.Action field_149508_e; // action

    @Unique
    public void etim$fill(CPacketPlayerDigging.Action action, BlockPos pos, EnumFacing facing) {
        this.field_179717_a = pos;
        this.field_179716_b = facing;
        this.field_149508_e = action;
    }
}

@Mixin(CPacketPlayerTryUseItemOnBlock.class)
public abstract class MixinUseBlockPacketFactory {
    @Shadow private BlockPos field_179725_b;
    @Shadow private EnumFacing field_149579_d;
    @Shadow private EnumHand field_187027_c;
    @Shadow private float field_149577_f, field_149578_g, field_149584_h;

    @Unique
    public void etim$fill(BlockPos pos, EnumFacing face, EnumHand hand, float x, float y, float z) {
        this.field_179725_b = pos; this.field_149579_d = face; this.field_187027_c = hand;
        this.field_149577_f = x; this.field_149578_g = y; this.field_149584_h = z;
    }
}
```

调用侧（`TestDriver.feedDig` / `useBlock`）：

```java
CPacketPlayerDigging packet = new CPacketPlayerDigging();       // 服务端唯一存在的 ctor
((MixinDigPacketFactory) (Object) packet).etim$fill(action, pos, EnumFacing.DOWN);
player.connection.processPlayerDigging(packet);                 // 仍是包边界入口
```

同一形态适用 `useBlock`（`ma`）。若不想加 Mixin，退路是
`ObfuscationReflectionHelper.setPrivateValue(CPacketPlayerDigging.class, packet, pos, "field_179717_a")`
（字段名同上），但反射在 obf 运行期的错误面更差，建议走 Mixin。

### F3（同批建议，非判负项）：step 级故障隔离

```java
try {
    step.action.run();
} catch (Throwable t) {                    // NoSuchMethodError / NoClassDefFoundError 属 Error
    ETIM.LOGGER.error("[TestLog] step={} player={} FAILED", step.label, step.player.getName(), t);
    // 继续跑后续 step：一步的工装缺陷不该终止整轮
}
```

这样即便某面坏了，`[TestLog] step=… FAILED` 也会成为判据行，而不是把服务端带走。

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true / doDaylightCycle=true / doWeatherCycle=true / keepInventory=false | ✓ |
| time | 1000 | ✓ |
| 配置 | foodModel=true ／ foodDebugLog=true ／ foodTestMode=false ／ devTools=true（未动） | ✓ |
| 实体 | armor_stand 清零、zombie 清零（收口 testfor 均 `found nothing`）；临时泥土已回填空气 | ✓ |
| 端口 | 25565/25575 无 LISTEN | ✓ |
| 关服 | `[20:25:36] Stopping server → Saving worlds`（boot#5 正常收尾）；无 SERVER 进程残留 | ✓ |
| crash-report | 2 份，均为工装 `NoSuchMethodError`（已随报告落盘），无产品异常栈 | 注记 |
| jar 复验 | build/libs ≡ run/obfuscated/mods，`CB079DD4…F2157` / 340,211 B | ✓ |
| src/main | 0 改动；HEAD=a729092 | ✓ |
| 客户端 | 20:13:30 起 → `[20:30:30] Stopping!` 正常退窗（`BUILD SUCCESSFUL in 17m 1s`，无 crash）；仅余 Gradle daemon/worker | ✓ |

---

## 附录：执行序（一次会话内，全程 RCON）

1. boot#3：`food 20 20` → `summon armor_stand` → `attack`（T-attack）
2. `attack @e[type=bat,c=1]`（T-noattack）
3. `useitem`（T-useitem）
4. `replaceitem chest` → 逐档 `enchant/food/attack` ×4（R10）
5. `clear` → `level 35` → `health 20` → `food 0 0` → 等 28 s → `attack`（R6）
6. `useblock`（崩，F2）
7. boot#2（前一轮）：`dig`（崩，F1）
8. boot#5：世界复位 + 正常停机

> 说明：F1 的崩溃发生在 boot#2（早于 gate 重放事故的清理重启），其 crash-report 已固化到
> `build-logs/harness-t1-dig-crash.txt`，与 boot#3 的判据日志互不干扰。
