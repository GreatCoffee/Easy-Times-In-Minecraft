# 划船 / 水中跳 drain 重定位 — 判决报告（HEAD 6181ace）

- 轮次：验证窗（会话七）· boatDrain（α 钩子）+ waterJumpDrain（位移代理）
- 判决源：`server.log [FoodLog] boatDrain / waterJumpDrain` 行 + `[EtimTest] food_set_pool` 相位标记 + 服务端 `was kicked` 旁证
- 判决：**PASS 4 ／ FAIL 0**（V1 船支 ✓、V2 水中跳 ✓、V3 零充负证 ✓、V4 防串味 ✓、负证 ✓）
- 结论：**α 钩子逐 C0C 恰 1 行（驾驶者/乘客同构，base=0.01 无 0.98 折减）；水中跳代理逐上浮包 1 行并与 swim/dive 同包双充；骑猪/创造/下沉/骑船移动包零充；移动系行 mod 恒 1.0**

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | 6181ace | `6181ace Boat-paddle + water/lava-jump pool-drain relocation …` | ✓ |
| src/main 改动面 | 4 文件 +83/−3 | `ETIMConfig.java`(+10) / `ETIMEndurance.java`(+34/−3) / `MixinNetHandlerPlayServer.java`(+40 新) / `mixins.etim.json`(±1) = `4 files changed, 83 insertions(+), 3 deletions(-)`；工作区干净 | ✓ |
| jar 大小/时间 | 346,055 B @ 17:55:35 | 346,055 B ｜ 2026-10-23 17:55:36 | ✓ |
| jar SHA256 | 4FF1EE95…CA91 | `4FF1EE95723084C962FB89A27CBEDED5D9B0A35EEBDDAE50ACCBD474D348CA91` | ✓ |
| 客户端首验 | 同钉值 | `[etim-harness] pinned etim jar synced+verified: 346055B SHA256 4FF1EE95…CA91` | ✓ |
| 服务端 classpath | 同钉值 | `classpath append: …build\libs\etim-1.0.0.jar (mtime=10/23/2026 17:55:36)` | ✓ |
| refmap（钩子映射） | 含 processInput | `processInput => Lnet/minecraft/network/NetHandlerPlayServer;func_147358_a(Lnet/minecraft/network/play/client/CPacketInput;)V` | ✓ |
| mixin 加载 | 无注入失败 | `Mixin apply failed / InvalidInjectionException / Critical injection failure` 计数 = **0** | ✓ |
| 新配置键 | 两枚 | `S:boatHungerPerTick=0.01` ／ `S:waterJumpHungerPerTick=0.01` | ✓ |
| 起服 | — | `[EtimInit] enchant etim:endurance id=12` ／ `Done (1.057s)` ／ `RCON running` | ✓ |

落码形态（`git diff HEAD~1..HEAD`）：

```java
@Mixin(NetHandlerPlayServer.class)
public abstract class MixinNetHandlerPlayServer {
    @Inject(method = "processInput", at = @At("TAIL"), remap = true)
    private void etim$boatDrain(CPacketInput packetIn, CallbackInfo ci) {
        NetHandlerPlayServer self = (NetHandlerPlayServer) (Object) this;
        EntityPlayer player = self.player;
        if (player.getRidingEntity() instanceof EntityBoat && player.moveForward != 0.0F) {
            ETIMEndurance.chargeBoat(player, player.moveForward);   // 0.01 × |moveForward|, mod=1.0
        }
    }
}
```

```java
// chargeMovement 末尾（与五支链平行，非 else 内）
if ((player.isInWater() || player.isInLava()) && dy > 0.0D) {
    charge(player, ETIMConfig.waterJumpHungerPerTick, 1.0F, "waterJumpDrain dy=" + dy);
}
// charge() 四门：isRemote / !foodModel / isCreativeMode / disableDamage（D-B5）
```

**钩子可触发性核讫**（这是本轮唯一有「0 行」风险的判读前提）：

- 1.12 的 `CPacketInput`（C0C，id 0x16）在 minecraft-data 1.12.2 数据里被误命名为 `packet_steer_vehicle`（形状 `sideways: f32, forward: f32, jump: u8`），与 `CPacketInput` 的 `readPacketData` 线格式（`f32 strafe, f32 forward, u8 位掩码 bit0=jumping/bit1=sneaking`）**完全同构** → 工装以 `bot._client.write('steer_vehicle', {sideways:0, forward:1.0, jump:0})` 喂 C0C。
- `EntityPlayerMP.setEntityActionState`（:1115-1130）**只在 `isRiding()` 时**写 `moveForward` ⇒ 非骑乘期发 C0C 不产生 boat 行（V3 的创造/下沉面因此天然隔离）。
- `EntityBoat.canFitPassenger` = `getPassengers().size() < 2` ⇒ 一船可载驾驶者 + 乘客（V1c 可布点）。

---

## 1. 判决类清单

| # | 面 | 期望 | 判 | 依据 |
|---|---|---|---|---|
| V1 | 船支（R196:1727-1728 + D-B1） | 驾驶者满油门 1 行/C0C、base=0.01、mod=1.0；松油门 0 行；乘客同构 1 行/C0C；骑猪/骑马 0 行 | ✓ | 40 包→40 行、30 包(forward=0)→0 行、乘客 30 包→30 行（驾驶者 0）、两人同发 20+20、骑猪 20 包→0 行；base=0.01 逐行、mod=1.0 逐行 |
| V2 | 水中跳代理（R196:2153-2168 + G-B4） | 水面/潜水上浮每 dy>0 包 1 行 waterJumpDrain base=0.01 且与 swim/dive 同包双行；岩浆上浮 1 行；下沉 0 行 | ✓ | 水面 6 包→waterJump 6 + swim 6；潜水 6 包→waterJump 6 + dive 6；岩浆 6 包→waterJump 6(+4 过充行，D-B3 实录)；水下/岩浆下沉各 6 包→ waterJump **0** 行 |
| V3 | 零充负证 | 骑船期五支 0 行；创造骑船/创造上浮 0 行；walk/sprint 回归 rate 0.01/0.05 | ✓ | 骑船 8 个 C03 → 五支 **0** 行；创造骑船 20 C0C → **0**；创造水面 4 包 → **0**；walk rate=0.010000、sprint rate=0.050000 |
| V4 | 防串味 | 全轮移动系行 mod≠1.0 = 0；D-B5 只作静态注记 | ✓ | boatDrain 130 / waterJumpDrain 32 / diveDrain 71 / swimDrain 8 / walkDrain 720 / sprintDrain 163 —— mod 集合全为 `[1.0]` |
| 负证 | — | FAILED=0、mixin 0、crash 0、foodTestMode=false | ✓ | 见 §3 |

---

## 2. 逐面核讫表（行锚 / 发包数 / 行数 / 判值逐位）

### 2.1 V1 船支（平原石跑道 x −60.5..−57.9，y=80）

| 子面 | 行锚（服务端） | C0C 包 | boatDrain 行 | base | mod | amount | 判 |
|---|---|---|---|---|---|---|---|
| a) 驾驶者满油门 | 18:02:52 → 18:02:55 | 40（forward=1.0） | **40**（1:1） | 0.01 ×40（raw 角差 **0%**，未触发 D-B1 的 ±2%） | 1.0 ×40 | 0.01 ×40 | ✓ |
| b) 松油门 | 18:02:55 → 18:02:57 | 30（forward=0） | **0** | — | — | — | ✓ |
| c) 乘客持 W（同船双人） | 18:07:14 → 18:07:16 | 30（Harn05） | **30**（Harn05）／**0**（Harn04） | 0.01 ×30 | 1.0 ×30 | 0.01 ×30 | ✓ |
| c′) 两人同发 | 18:07:16 → 18:07:25 | 20 + 20 | **20 + 20**（各自 1:1） | 0.01 ×40 | 1.0 ×40 | 0.01 ×40 | ✓ |
| d) 骑猪（EntityPig + Saddle） | 18:07:25 → 18:08:05 | 20（forward=1.0） | **0** | — | — | — | ✓ |
| e) 倒车（附加面） | 18:02:57 → 18:03:23 | 20（forward=−1.0） | **20** | 0.01 ×20（= 0.01×\|−1\|） | 1.0 ×20 | 0.01 ×20 | ✓ |

判据行原文：

```text
[18:02:52] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (79) boatDrain base=0.01 mod=1.0 amount=0.01 pool=1.8479409
```

- 「每 tick 恰 1 行」的准确口径：**每 C0C 包恰 1 行**（40→40、30→30、20→20、0→0 全 1:1，无乘 2、无丢包）
- `base=0.01` 为 raw 值（R196 :1728 的 `|moveForward|×0.01`，本工装 forward=±1.0 故不出现 0.98 折减）；D-B1 的 ±2% 容差未被用到
- 骑猪行 **0** 证明 `instanceof EntityBoat` 门生效（`setEntityActionState` 对猪同样写 `moveForward`，若门缺失必有 20 行）
- 船实际不位移（mineflayer 无 1.12 船体物理，未发 C0E vehicle_move）→ 本面判据落在**输入包 → 充账行**，不依赖船位移动

### 2.2 V2 水中跳代理（水池 x −21..−13 水块 y71..77 / 岩浆池 x 4..10 y71..76）

| 子面 | 行锚 | 位移包（dx,dy） | waterJumpDrain | 伴生行 | 判 |
|---|---|---|---|---|---|
| 水面（swim 面，眼在空气） | 18:10:26 → 18:10:28 | 6 ×(+0.10, **+0.06**) | **6**（dy=0.06） | swimDrain **6**（cm=10，base=0.0015） | ✓ 同包双行 |
| 潜水（dive 面，眼在水内） | 18:10:28 → 18:10:30 | 6 ×(+0.10, **+0.06**) | **6** | diveDrain **6**（cm=12，3D）+ 服务端 tick 补行 36 | ✓ 同包双行 |
| 岩浆上浮（isInLava 面） | 18:10:33 → 18:10:35 | 6 ×(+0.10, **+0.06**) | **10** = 6 本包 + 4 过充 | 无 dive/swim（非水） | ✓（过充见 N6） |
| 水下下沉 | 18:10:30 → 18:10:33 | 6 ×(+0.10, **−0.30**) | **0** | swim 2 + dive 26（照充） | ✓ |
| 岩浆下沉 | 18:10:35 → 18:10:41 | 6 ×(+0.10, **−0.30**) | **0** | — | ✓ |

判据行原文：

```text
[18:08:11] … [FoodLog] ETIM_Harn04 (1010) waterJumpDrain dy=0.0799999999999983 base=0.01 mod=1.0 amount=0.01 pool=0.017354216
[18:10:27] … [FoodLog] ETIM_Harn04 (1044) swimDrain cm=10 base=0.0014999999 mod=1.0 amount=0.0014999999 pool=1.341421
```

- **同包双行**成立：waterJumpDrain 与 dive/swim 是两个独立事件面（R196 的 jump 段与 addMovementStat 在客户端本来就是两次调用），单包 2 行是设计面而非重复计账
- `base=0.01` 与 dy 的大小无关（每包定额，R196 :2167 = 0.01/tick）✓；`mod=1.0` 逐行 ✓
- 下沉面 `dy<0` 时 waterJumpDrain **0 行**，而 swim/dive 照充 ⇒ 代理的符号门正确
- 岩浆面只出 waterJumpDrain（无 dive/swim）⇒ `isInLava` 分支可达且不误触水面 tag

### 2.3 V3 零充负证

| 子面 | 行锚 | 驱动 | 结果 | 判 |
|---|---|---|---|---|
| 骑船期五支 | 18:13:44 → 18:13:50 | 骑船中 8 个 C03（+0.20/包，onGround=true） | Harn04 **0 行**（该窗仅 Harn05 自身走动 15 行，见 N1） | ✓ |
| 创造骑船 | 18:13:50 → 18:13:54 | gamemode=1 + 骑船 + 20 C0C | **0 行** | ✓ |
| 创造水面 | 18:13:54 → 18:13:59 | gamemode=1 + 水面 4 包 dy>0 | swim/waterJump/dive 全 **0 行** | ✓ |
| walk 回归 | 18:15:21 → 18:15:25 | 平地 2.5 s（位移 10.789 m） | 65 行 Σcm=1155（11.55 m）Σamount=0.1155 ⇒ **rate=0.010000** | ✓ |
| sprint 回归 | 18:15:25 → 18:15:30 | 平地 3.0 s（位移 17.113 m） | 70 行 Σcm=1717（17.17 m，**+0.3%**）Σamount=0.8585 ⇒ **rate=0.050000**（另 6 行 walk 边界，rate=0.01） | ✓ |

- 创造门：`charge()` 的 `capabilities.isCreativeMode` 早退，两条路（boat 钩子 + waterJump 代理）同门 ⇒ 42 行应出而未出
- 五支不回归：rate 逐位 0.010000 / 0.050000，与上一轮移动五支窗（`move-drain-verdict.md` N1 口径）一致

### 2.4 V4 防串味

| 项 | 实测 | 判 |
|---|---|---|
| 全轮 tag × mod | `boatDrain 130/1.0`、`waterJumpDrain 32/1.0`、`diveDrain 71/1.0`、`swimDrain 8/1.0`、`walkDrain 720/1.0`、`sprintDrain 163/1.0` | ✓ 移动系 mod≠1.0 = **0 行** |
| D-B5 disableDamage 门 | 1.12 无命令通道置位（NBT-only）⇒ 不设正测；静态判词：`charge()` 四门并列，对全部八支生效 | ✓ 注记 |

---

## 3. 负证

```text
FAILED（[TestLog].*FAILED）        = 0
mixin 注入失败                      = 0
crash-report 新增（近 90 min）      = 0
was kicked                         = 1（18:03:29 floating too long，工装面，见 N3）
foodTestMode                       = false ｜ foodModel=true ｜ foodDebugLog=true
在线玩家                            = 仅 ETIM_Harn04 / ETIM_Harn05（双 bot，RCON 单一驱动面）
```

- 全部 `boatDrain / waterJumpDrain` 行均由 bot 的 C0C/位移包与 RCON 设点产生，无第三方实体叠加
- `lost connection: Internal Exception … 远程主机强制关闭` 的 6 次均为**我方按轮次重启 bot 进程**（工装动作），非服务端踢人

---

## 4. 冲突分级

**工装 FAIL：0。** V1~V4 与负证全 PASS。

| 编号 | 级别 | 内容 |
|---|---|---|
| **N1** | 工装面（已修，影响面已隔离） | **骑乘期写入的 `moveForward` 在下骑后不可改写**：`EntityPlayerMP.setEntityActionState` 只在 `isRiding()` 时赋值，故 `/tp` 下骑后服务端 `travel` 会带着陈旧 `moveForward=1.0` 自己走路 → 伪 walkDrain 行（首轮 18:07:18-25 的 Harn04 与全轮 Harn05 的行走均源于此）。修法：下骑前先发 `forward=0` 的 C0C 清零；判据侧一律按**玩家名 + tag + 窗口**分离。修后 B8 回归 rate 与位移同时收敛（sprint +0.3%）。 |
| **N2** | 工装面（已修） | mineflayer 在 1.12 不总清 `bot.vehicle`（服务端 `/tp` 下骑后无 attach −1 回包）→ 判据改用服务端行，工装侧直接置 `bot.vehicle=null`。 |
| **N3** | 工装面（已修） | 物理关闭 + 传送到空中后 `bot.entity.onGround=false` 沿用到自动位置包 → 服务端 `floatingTick` 达 80 tick 踢人（18:03:29 唯一一次）；已加 `ground()`（置位 + 4 个 `onGround=true` 包），此后 5 轮无复现。 |
| **N4** | 口径面（测量） | vanilla `addMovementStat` 有两个调用点（`processPlayer` + `EntityPlayer.travel:1989`），故潜水段行数 > 包数（6 包 → dive 42 行，其余为服务端 tick 在水中的位移面）。boat/waterJump 的**判值**落在「每 C0C 包 1 行 / 每上浮包 1 行」与 base/mod 上，不受补行影响。 |
| **N5** | 口径面（字段语义） | `base` 是**每事件充账量**：boat 面因速率本身是 per-tick（0.01）故恒 0.01；waterJump 面同理 0.01；而 swim/dive 仍是每事件 `0.015×cm×0.01`（cm=10 → 0.0015）。判读时勿把两类 base 混为一谈。 |
| **N6** | D-B3 注记（实录，不判 FAIL） | 岩浆上浮段 6 包之外多出 **4 行**过充（dy=0.41999998688697815 / 0.18999999344349305 / 0.0749999967217434 / 0.01749999836087568），来源为服务端岩浆流体推挤产生的真实上浮位移（travel 面）；水面/潜水段未见同类过充。按任务书 D-B3「顶托/气泡/推送过充行…实录不判 FAIL」。 |
| **N7** | 覆盖说明 | D-B5（disableDamage）按任务书只作静态判词：1.12 无命令置位通道，`PlayerCapabilities.disableDamage` 仅 NBT/创造旁观路径可改，不设正测。 |

---

## 5. 伪代码建议

**本轮无须返工**（判词已落地）。仅两条「若日后要收敛」的可选方向：

1. **N6 过充的收敛（可选，不建议现在动）** —— 若要把 waterJump 面从「每 addMovementStat 事件」收紧为「每 C03 包」，需要给两个调用点加判别位（现有钩子无法区分）：

```java
// MixinNetHandlerPlayServer：包边界置位
@Inject(method = "processPlayer", at = @At("HEAD"))
private void etim$markPacket(CPacketPlayer p, CallbackInfo ci) { ETIMEndurance.beginPacket(); }
@Inject(method = "processPlayer", at = @At("RETURN"))
private void etim$clearPacket(CPacketPlayer p, CallbackInfo ci) { ETIMEndurance.endPacket(); }

// chargeMovement 的 waterJump 面
if (ETIMEndurance.inPacket() && (player.isInWater() || player.isInLava()) && dy > 0.0D) { … }
```
   代价：多一处钩子 + 一个线程局部标记；收益仅是消掉 D-B3 已登记的 4 行过充。**R196 的两个面本就独立**，保持现状与判词一致。

2. **N1 的工装固化（建议落到 harness 公共层）** —— 任何「会骑乘」的相位在 `/tp` 下骑前必须 `sendInput(bot, 0.0)` 两次；建议把该动作并入 `player/` 公共 `unmount()`，避免后续轮次再踩（本轮已写入 `bw-run.js` 的 `unmount()`）。

---

## 6. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true ／ keepInventory=false（命令回读确认） | ✓ |
| time | 收口 `/time set 1000`；60 s 后查询 1341（自然流逝） | ✓ |
| difficulty | server.properties=1(Easy)；轮内曾设 1，误设 2 后已回 1 | ✓ |
| 实体 | boat / pig / item `/testfor` 均 found nothing | ✓ |
| 玩家状态 | Harn04 背包清 7 件 + 胸甲 Air + 效果 clear；Harn05 无物品 | ✓ |
| 地形 | 岩浆池回填石 294；**跑道与水池按任务书保留**（工装面） | ✓ |
| 配置 | foodModel=true ／ foodDebugLog=true ／ foodTestMode=false ／ boatHungerPerTick=0.01 ／ waterJumpHungerPerTick=0.01（未动） | ✓ |
| 端口 | 25565 / 25575 无 LISTEN | ✓ |
| 关服 | `[18:16:54] Stopping server → Saving worlds` | ✓ |
| crash-report | 无新增 | ✓ |
| jar 双面 | build/libs ≡ run/obfuscated/mods，`4FF1EE95…CA91` / 346,055 B | ✓ |
| src/main | 0 改动；HEAD=6181ace | ✓ |
| 客户端收口 | `close-client.ps1`（WM_CLOSE）：`[18:17:13] Stopping!` + **BUILD SUCCESSFUL in 16m 51s**；快照 142,950 B | ✓ |

---

## 7. 附录 A：执行序

1. 客户端先行 → 钉值首验 `346055B / 4FF1EE95…CA91`
2. 起服 18:01:15 → `[EtimInit] id=12` → `Done (1.057s)` / RCON up
3. **B0** 铺舞台：gamerule/time/gamemode、水池重开（内腔 567 格水）、岩浆池（294 格）、抗火、跑道确认
4. **B1** 船支：召唤船 → 驾驶者上船 → 40 C0C 满油门 / 30 C0C 松油门 / 20 C0C 倒车
5. **B2** 乘客面：双人同船 → 乘客 30 C0C（驾驶者 0）→ 两人同发 20+20
6. **B3** 骑猪：Saddle+NoAI 猪 → 上猪 → 20 C0C（应 0）
7. **B4** 水：水面 6 包 / 潜水 6 包 / 下沉 6 包
8. **B5** 岩浆：上浮 6 包 / 下沉 6 包
9. **B6** 骑船 8 个 C03（五支应 0）
10. **B7** 创造：骑船 20 C0C / 水面 4 包（应 0）
11. **B8** 回归：走 2.5 s / 跑 3.0 s
12. 收口：实体/背包/效果/gamerule/time/difficulty 还原 + 岩浆池回填 → `/stop` → 客户端 WM_CLOSE

## 8. 附录 B：本轮落盘

| 文件 | 大小 | 用途 |
|---|---|---|
| `build-logs/bw-server.log` | 448,797 B | 主判据（全轮 [FoodLog] + 相位标记 + 踢人记录） |
| `build-logs/bw-bot.out` | 16,172 B | 第 1 轮（B0/B1 + 首轮 B2/B3 事故现场） |
| `build-logs/bw-bot2.out` | 7,420 B | 第 2 轮（B2/B3 第一次修正：reach 门拒载） |
| `build-logs/bw-bot3.out` | 14,244 B | 第 3 轮（B2/B3 成功 + B4/B5 首次：B4 tp 未生效废窗） |
| `build-logs/bw-bot4.out` | 16,882 B | 第 4 轮（B4/B5 净窗 + B6/B7/B8 首跑） |
| `build-logs/bw-bot5.out` | 11,354 B | 第 5 轮（B6/B7 骑船面） |
| `build-logs/bw-bot6.out` | 10,226 B | 第 6 轮（B9 停靠 pax + B8 净回归） |
| `build-logs/bw-client.out` | 311,262 B | 客户端钉值 + `BUILD SUCCESSFUL in 16m 51s` |
| `build-logs/bw-client-latest.log` | 142,950 B | 客户端日志快照（`[18:17:13] Stopping!`） |
| `testharness/player/bw-run.js` | ~24 KB | 本轮驱动（B0-B9 相位 + `sendInput`/`tpTo`/`ground`/`unmount`/`boardBoat` 原语） |
