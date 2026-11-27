# 移动五支 drain 验证窗 — 判决报告（HEAD 8e3cd27）

- 轮次：移动五支 drain（`MixinEntityPlayer.addMovementStat` TAIL → `ETIMEndurance.chargeMovement`）
- 判决源：`server.log [FoodLog] Drain` 行（RCON/bot 驱动面）＋ `/etim` 工装驱动 ＋ 服务端 `was kicked`/`moved wrongly` 旁证
- 判决：**PASS 5 ／ FAIL 0**（V1 走跑 ✓、V2 水面 ✓、V3 梯面 ✓、V4 零充五态 ✓、V5 防串味 ✓、负证 ✓）
- 结论：**五支 drain 全部落在 [FoodLog]，mod 恒 1.0（裸充）；五态零充成立（含 elytra 正面判据）；附魅与 charge 参数化零联动**

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | 8e3cd27 | `8e3cd27 Movement five-branch hunger-pool drain …` | ✓ |
| src/main 改动面 | 3 文件 +97/−8 | `ETIMConfig.java` + `ETIMEndurance.java` + `MixinEntityPlayer.java`；`1 file changed`→合计 `3 files changed, 97 insertions(+), 8 deletions(-)`，工作区干净 | ✓ |
| jar 大小/时间 | 344,527 B @ 21:29:34 | 344,527 B ｜ 2026-10-22 21:29:34 | ✓ |
| jar SHA256 | 4449BD4F…EA48 | `4449BD4FACE5BA488B28DDB54E253C048843B651AB97F7354D9802C2BAD3EA48` | ✓ |
| 客户端首验 | 344527B/4449BD4F… | `[etim-harness] pinned etim jar synced+verified: 344527B SHA256 4449BD4F…EA48` | ✓ |
| 服务端 classpath | 同钉值 jar | `classpath append: …build\libs\etim-1.0.0.jar (mtime=10/22/2026 21:29:34)` | ✓ |
| 附魔 id | — | `[EtimInit] enchant etim:endurance id=12` | ✓ |
| refmap（钩子映射） | 含 addMovementStat | `mixins.etim.refmap.json` → `addMovementStat => Lnet/minecraft/entity/player/EntityPlayer;func_71000_j(DDD)V` | ✓ |
| mixin 加载 | 无注入失败 | `Mixin apply failed / InvalidInjectionException` 计数 = **0** | ✓ |
| 起服 | — | `Done (1.043s)` ／ `RCON running on 0.0.0.0:25575` | ✓ |

钩子形态（`git diff HEAD~1..HEAD`）：

```java
@Inject(method = "addMovementStat", at = @At("TAIL"), remap = true)
private void etim$moveDrain(double dx, double dy, double dz, CallbackInfo ci) {
    ETIMEndurance.chargeMovement((EntityPlayer) (Object) this, dx, dy, dz);
}
```

`chargeMovement` 复刻 vanilla 分支序（rfg `EntityPlayer:2003-2070`）：dive(3D) → swim(2D) → ladder(dy>0) → onGround(sprint/walk) → else(airborne/elytra)，并在 `charge(player, base, 1.0F, tag)` 处固定裸充。

---

## 1. 判决类清单

| # | 面 | 期望 | 判 | 依据 |
|---|---|---|---|---|
| V1 | 走/跑面 | walkDrain/sprintDrain，mod=1.0，Σcm≈实测距离×100 | ✓ | walk 61 行 Σcm=1106（位移 10.573 m）；sprint 60 行 Σcm=1648（位移 16.832 m）；mod 全 1.0 |
| V2 | 水面 | diveDrain（3D）/ swimDrain（2D），base=0.015 口径，mod=1.0 | ✓ | dive 69 行 ／ swim 10 行；`base = 0.015 × cm × 0.01` 逐行成立；mod 全 1.0 |
| V3 | 梯面 | 仅上升 dy>0；行数=移动事件数；下降/悬停 0 行 | ✓ | 升 22 行 Σdy=2.5064 = 客户端位移 2.506（逐位）；悬停 0 行（dy=0.0000）；下降 0 行（dy=−2.506） |
| V4 | 零充五态 | 骑乘/悬空/elytra/spectator/躺床 窗口内移动 tag 0 行 | ✓ | 五窗均 0 行；elytra 另以「悬空 5 s 不被踢」正面证明旗已置位 |
| V5 | 防串味 | a) L4 胸甲跑动 mod 仍 1.0；b) L3 restage attackDrain = E1 表 | ✓ | a) 56 行全 mod=1.0；b) `base=0.3 mod=0.39999998 amount=0.12` |
| 负证 | — | FAILED=0、crash 无新增、foodTestMode=false、无人类输入 | ✓ | FAILED=0；crash 新增 0；`moved wrongly=0`；全轮仅 bot 一个玩家 |

---

## 2. 逐面核讫表（行锚 / 行数 / 判值逐位）

### 2.1 V1 走跑面（跑道 x −70..−42，y=80，z=241.5）

| 段 | 行锚 | 行数 | Σcm | 实测位移 | Σcm/100 ÷ 位移 | Σamount | 速率校验 Σamount/Σm | mod | 判 |
|---|---|---|---|---|---|---|---|---|---|
| walk（2.5 s） | 21:35:32→21:35:36 | 61 | 1106 | 10.573 m | 1.046 | 0.1106 | 0.01000 | 1.0×61 | ✓ |
| sprint（3.0 s） | 21:35:36→21:36:00 | 60 | 1648 | 16.832 m | 0.979 | 0.8240 | 0.05000 | 1.0×60 | ✓ |

判据行原文（首行）：

```text
[21:35:33] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (84) walkDrain cm=10 base=9.999999E-4 mod=1.0 amount=9.999999E-4 pool=2.956062
[21:35:37] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (84) sprintDrain cm=13 base=0.0065 mod=1.0 amount=0.0065 pool=3.250966
```

- 速率逐位：walk `Σamount ÷ (Σcm/100) = 0.1106 ÷ 11.06 = 0.01000`（= `walkHungerPerMeter`）✓；sprint `0.8240 ÷ 16.48 = 0.05000` ✓
- `cm` 求和与客户端实测位移差 +4.6% / −2.1%：行内 cm 是**服务端路径长**（每移动事件一段，含服务端自身 tick 的纠偏位移），实测位移是**首末直线**；两者同源于 vanilla 统计口径（见 §4-N2）
- 反作弊回拉：`moved wrongly` 全轮 **0**；`moved too quickly` 仅 21:39:21 一条（bot 登录重生位落差 −5,21,6，在 V4 窗口外）

### 2.2 V2 水面（水池 x −21..−13，z 237..245，水块 y=71..77）

| 段 | 水位 | 行锚 | 行数 | 判值（逐位） | mod | 判 |
|---|---|---|---|---|---|---|
| dive（眼内水，3D） | 站 y=72（眼 73.62 → 水块 73） | 21:36:00→21:36:03 | 69 | `base = 0.015 × cm × 0.01`：cm=2→2.9999999E-4、cm=15→0.00225 逐行成立 | 1.0×69 | ✓ |
| swim（贴水未入眼，2D） | 站 y=77（眼 78.62 → 空气） | 21:36:04→21:36:06 | 10 | cm **全 15**（10 包 × 0.15 m），Σcm=150 = 客户端位移 1.5 m **逐位相等** | 1.0×10 | ✓ |

判据行原文：

```text
[21:36:00] … [FoodLog] ETIM_Harn04 (84) diveDrain cm=2 base=2.9999999E-4 mod=1.0 amount=2.9999999E-4 pool=0.9749624
[21:36:04] … [FoodLog] ETIM_Harn04 (84) swimDrain cm=15 base=0.00225 mod=1.0 amount=0.00225 pool=1.3502144
```

- 两 tag 各自成立 ⇒ `isInsideOfMaterial(WATER)`（dive 3D）与 `isInWater()`（swim 2D）分支选择正确 ✓
- dive 段 Σcm=712（7.12 m）远大于水平位移 1.8 m：3D 口径把「服务端重力下沉 + 手工包回抬」的竖直补偿也算进路径长（vanilla 同口径；见 §4-N2），故 dive 的 cm 只作定性，判据落在 tag/base/mod 三面

### 2.3 V3 梯面（梯墙 x=0，梯 x=−1 meta4，站位 x=−0.5）

| 段 | 行锚 | 行数 | Σdy | 客户端位移 | 判 |
|---|---|---|---|---|---|
| 上升（净窗） | 21:45:14→21:45:16 | 22 | 2.5064 | 80.000→82.506 = **+2.506** | ✓ 逐位（21×0.1176 + 0.0368） |
| 悬停（潜行锁梯，静置后） | 21:45:16→21:45:18 | **0** | — | 82.506→82.506 = **0.0000** | ✓ |
| 下降（松潜行） | 21:45:18→21:45:20 | **0** | — | 82.506→80.000 = −2.506 | ✓ |
| 复证·上升 | 21:43:25→21:43:26 | 32 | 3.718 | 80.000→83.918 | ✓（含末段 0.0368） |
| 复证·下降 | 21:43:28→21:43:30 | **0** | — | 83.918→80.389 = −3.528 | ✓ |

判据行原文：

```text
[21:45:14] … [FoodLog] ETIM_Harn04 (720) ladderDrain dy=0.11760000228882461 base=0.01176 mod=1.0 amount=0.01176 pool=0.20269892
```

- 「恰行数」：22 行对应 21 个整 tick 爬升 + 1 个末段（0.0368），`Σdy ÷ 0.1176 = 21.3` ⇒ 一行一移动事件，无乘 2、无漏记 ✓
- `base = dy ÷ 10`（`ladderHungerDivisor`）逐位：0.1176→0.01176、0.0368→0.0036848001 ✓
- 仅上升：下降/悬停段 0 行（`dy > 0` 门在 `chargeMovement` 内，日志面无 dy<0 行）
- 潜行锁梯使 dy 严格 0.0000（1.5 s 窗口），排除「残速漂移」污染

### 2.4 V4 零充五态（各态窗口内移动 tag 行数）

| 态 | 行锚（open→close） | 状态证据 | 窗口内移动行 | 判 |
|---|---|---|---|---|
| 骑乘（船） | 21:39:22→21:39:34 | `M4ride vehicle=boat`；服务端位置由船位决定（`Teleported … to -58.5,79.55,241.5`），骑乘期 processPlayer 不调 addMovementStat | **0** | ✓ |
| 跳弧悬空 | 21:39:34→21:39:41 | 8 包 `onGround=false`、dy=+0.05（86.0→86.4） | **0** | ✓ |
| elytra | 21:43:48→21:43:54 | `entity_action start_fall_flying` 后**悬空 5 s（50 包）未被踢**：vanilla `floating` 踢人门对 `isElytraFlying()` 豁免 ⇒ 旗确已置位 | **0** | ✓ |
| spectator | 21:39:47→21:39:54 | `gamemode=spectator`（game_state 包）；服务端 tp 生效 | **0** | ✓ |
| 躺床 | 21:45:27→21:45:29 | `/setblock` 床 + 屋顶遮蔽（notSheltered 门）→ `isSleeping=true`；8 包位移 | **0** | ✓ |

- elytra 正面判据的构造：若旗未置位，悬空满 80 tick 必收 `multiplayer.disconnect.flying`；实测 `airborne5s kicked=false`，且全程 0 行 ⇒ 「elytra → else 支 → 零充」既成事实而非推导
- 躺床段另证：`processPlayer` 的 sleeping 分支整段不调 `addMovementStat`（vanilla），`chargeMovement` 的 walk 支另有 `cm=0` 兜底（D-M4）
- 骑乘段：8 个手工移动包全被 processPlayer 的 riding 分支吞掉（只回写朝向），搬动位置来自服务端 → 0 行

### 2.5 V5 防串味（会话五回归抽样）

| 子面 | 行锚 | 行数 | 判值 | 判 |
|---|---|---|---|---|
| a) L4 胸甲跑动 | 21:40:04→21:40:12 | 56（全 walkDrain） | **mod=1.0 ×56**；Σcm=965（9.65 m / 2 s） | ✓ 附魅零联动 |
| b) L3 restage→attack | 21:40:13 | 1 | `base=0.3 mod=0.39999998 amount=0.12` | ✓ = E1 预计算表 L3 同值 |

判据行原文：

```text
[21:40:13] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (720) attackDrain base=0.3 mod=0.39999998 amount=0.12 pool=2.4052944
```

- 全日志 `mod != 1.0` 的行**只有**这一条 attackDrain ⇒ `charge()` 参数化后五处站传 `getEnduranceModifier`、移动五支传 `1.0F` 的分工成立 ✓
- `diveDrain/swimDrain/ladderDrain/walkDrain/sprintDrain` 的 mod 集合逐 tag 均为 `[1.0]`

---

## 3. 负证

```text
FAILED（[TestLog].*FAILED）        = 0
crash-report 新增（近 70 min）      = 0
mixin 注入失败                      = 0
moved wrongly                      = 0
moved too quickly                  = 1（21:39:21，bot 登录重生落差，非判据窗口）
was kicked                         = 1（21:37:42 工装面，见 N3）
foodTestMode                       = false
在线玩家                            = 仅 ETIM_Harn04（全轮单玩家，RCON+bot 双驱动）
```

- 移动 `[FoodLog]` 行全部产生于 bot 自动驾驶/手工包与 RCON 设点，无第三方实体/玩家叠加
- 无 crash-report 新增；无 OOM/异常堆栈

---

## 4. 冲突分级

**工装 FAIL：0。** V1~V5 与负证全 PASS。

| 编号 | 级别 | 内容 |
|---|---|---|
| **N1** | 口径面（判据文字） | 判据写的 `base=0.01 / 0.05 / 0.015` 是**每米速率**；日志 `base` 字段是**每事件充账量** `rate × cm × 0.01`（同理 ladder 的 `base=dy/10`）。因此 `base=0.01` 只在 cm=100 时出现，逐行读数落在 1e-4~2.3e-3。本轮按「Σamount ÷ Σ米数 = rate」判逐位成立（0.01000 / 0.05000 / 0.01500）。建议后续判据文字改为「Σamount=rate×位移」或「base/cm=rate×1e-2」。 |
| **N2** | 口径面（测量） | 行内路径长含**服务端自身 tick 的位移**：vanilla `addMovementStat` 有两个调用点（`NetHandlerPlayServer.processPlayer` 与 `EntityPlayer.travel:1989`），故 walk 61 行 > 50 包、dive Σcm 被竖直纠偏放大。与 vanilla 完全同源，非产品偏差；判 V1 用「Σcm/100 ≈ 位移（±5%）」、V2 用 tag/base/mod、V3 用「Σdy = 位移」。 |
| **N3** | 工装面（已修） | 首轮 M4b/M4c 连续悬空 4.1 s，bot 被 `kicked for floating too long`（vanilla 80 tick 门），随后的 M4d/M4e 空跑。已改造驱动：每相位后 `land()` 落地复位，并以「悬空 5 s 不被踢」作 elytra 正面判据；受影响两窗（21:39:41..47 的 12 行 walkDrain、21:39:54..21:40:04 的 8 行 walkDrain）判为**废窗**，由 21:43:48..54（elytra）与 21:45:27..29（躺床）替换。 |
| **N4** | 覆盖说明（D 级四笔） | D-M1 潜行 0.01：未投专项（按任务书），代码面 1.12 crouch 支并入 walk 支、速率同 0.01；D-M2 elytra 零充：本轮**实测**（非推导）；D-M3 spectator 门：实测 0 行；D-M4 睡面旗：实测 0 行（含 notSheltered 门需要屋顶这一前置）。 |
| **N5** | 舞台面 | 测道残留：石跑道（x −72..−32、z 236..246、y=79）保留（与地面同高，无害，后续轮可直接复用）。水池已回填石 567、屋顶 195、床 2、梯 91、墙 154 已清空。 |
| **N6** | 信息面 | 床面首试被产品自身 `bedRefuseShelter`（R196 notSheltered，7×7 降水高程扫描）拒睡，日志 `[SleepLog] bed-refuse reason=notSheltered`；补 7×7 屋顶后入睡成功。该门是既有产品面，非本轮缺陷。 |

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true ／ keepInventory=false（命令回读确认） | ✓ |
| time | 1000 | ✓ |
| 实体 | armor_stand / boat / item `/testfor` 均 found nothing | ✓ |
| 玩家状态 | ETIM_Harn04 背包 clear（no items）+ 胸甲 Air | ✓ |
| 方块 | 水池→石 567、屋顶 195、床 2、梯 91、墙 154 已还原；跑道保留（N5） | ✓ |
| 配置 | foodModel=true ／ foodDebugLog=true ／ foodTestMode=false ／ bedRefuseShelter=true（未动） | ✓ |
| 端口 | 25565/25575 无 LISTEN | ✓ |
| 关服 | 判据轮 `[21:46:30] Stopping server → Saving worlds`；清理轮 `[21:47:58] Stopping server` | ✓ |
| crash-report | 无新增 | ✓ |
| jar 双面 | build/libs ≡ run/obfuscated/mods，`4449BD4F…EA48` / 344,527 B | ✓ |
| src/main | 0 改动；HEAD=8e3cd27 | ✓ |
| 客户端收口 | `close-client.ps1`（WM_CLOSE，只认 Stopping!）：`[21:48:16] Stopping!` + Gradle **BUILD SUCCESSFUL in 16m 2s**；快照 141,800 B | ✓ |

---

## 6. 附录 A：执行序（一次起服，全 RCON/bot 驱动）

1. 客户端先行 → 钉值首验 `344527B / 4449BD4F…EA48`
2. 起服 21:33:57 → `[EtimInit] id=12` → `Done (1.043s)` / RCON up
3. **M0 铺测道**：跑道 / 水池（外壳→掏空→灌水）/ 梯墙+梯 / 床台；gamerule×2、time、difficulty、gamemode、level 35
4. **M1 走跑**：`/tp -70 80 241` → walk 2.5 s（10.573 m）→ sprint 3.0 s（16.832 m）
5. **M2 水面**：池底 y=72 dive 12 包 → 水面 y=77 swim 10 包
6. **M3 梯面**：升 1.0 s → 静置 → 潜行悬停 1.5 s → 松潜行下降
7. **M4 五态**：船骑乘 / 悬空 / elytra（5 s 不被踢）/ spectator / 躺床（补屋顶）
8. **M5 防串味**：L4 胸甲跑 2 s（mod=1.0）→ L3 restage 打 armor_stand（0.39999998/0.12）
9. 收口：实体/背包/胸甲/gamerule/time 还原 + 测道清理 → `/stop` → 二次起服仅清背包 → `/stop` → 客户端 WM_CLOSE

## 7. 附录 B：本轮落盘

| 文件 | 大小 | 用途 |
|---|---|---|
| `build-logs/move-drain-server.log` | 255,935 B | 主判据（全轮 FoodLog Drain 行 + EtimTest 相位标记 + 反作弊行） |
| `build-logs/move-drain-bot.out` | 17,540 B | bot 首轮（M0-M3）动作锚点 |
| `build-logs/move-drain-bot2.out` | 16,926 B | bot 二轮（M4a-M5b/M3b）—— 含首轮踢人事故现场 |
| `build-logs/move-drain-bot3.out` | 9,592 B | bot 三轮（M3c/M4e2/M4f） |
| `build-logs/move-drain-bot4.out` | 7,042 B | bot 四轮（M3d/M4e3）净窗 |
| `build-logs/move-drain-client.out` | 308,960 B | 客户端钉值首验 + `BUILD SUCCESSFUL in 16m 2s` |
| `build-logs/move-drain-client-latest.log` | 141,800 B | 客户端日志快照（`[21:48:16] Stopping!`） |
| `build-logs/move-cleanup-bot.out` | 2,870 B | 收口清背包轮 |
| `testharness/player/move-run.js` | 22,001 B | 本轮新增动作驱动（M0-M5 + land/serverPos 原语） |
