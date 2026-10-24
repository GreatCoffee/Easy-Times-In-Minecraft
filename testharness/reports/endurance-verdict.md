# Endurance 专轮判决（v2+ 首单 × caf7a28）+ init 常驻校验首验

**基线（钉死，禁 rebuild）**：`caf7a28`｜jar **333,106 B @ 2026-10-21 21:10:53**｜SHA256 `BA959CF08A54F5A640B2B979F7CE20F4B64174B1855623CC229239E1A776D35D`
**轮次**：2026-10-21 21:13–21:37（三次起服：A 组 / B 组 / C 组）
**客户端**：`gradlew -I testharness/obfclient-fix.init.gradle runObfClient -x jar -x reobfJar`（19 mod 全量；实执行任务仅 `prepareObfModsFolder / restoreCompatMods / prioritizeCoremods / runObfClient`，`build/libs` 前后 SHA 不变）
**服务端**：`run/obfuscated-server`（25565 / `testw2h` / RCON 25575），etim 由 classpath 注入 `build/libs/etim-1.0.0.jar`（`classpath append … mtime=21:10:53`）
**判定源**：`[FoodLog]` 行（`foodDebugLog=true`，服务端 `latest.log`）= 唯一判据；行式 `<tag> base=X mod=Y amount=Z pool=W`
**cfg 实值**：`foodModel=true`／`foodDebugLog=true`／`devTools=true`／`foodTestMode=true`（上一轮遗留，只抬升池增速 0.002→0.01/tick，不改 base/amount/mod）

---

## ① init 常驻校验首验 —— **PASS**

三次客户端起服均打印（逐位与任务书一致）：

```
[etim-harness] pinned etim jar synced+verified: 333106B  SHA256 BA959CF08A54F5A640B2B979F7CE20F4B64174B1855623CC229239E1A776D35D
```

补证：起服前 `run/obfuscated/mods/etim-1.0.0.jar` 为旧件（326,788 B @ 18:49:58，上一轮 A4/A5 钉死件），init 脚本按长度 + SHA256 双校验后原样覆盖为 333,106 B 同哈希件；全程未触发 `compileJava / jar / reobfJar`。

---

## ② 判决类清单

| # | 判据类 | 终态 |
|---|---|---|
| E-DIG/G2 | 服务端直收挖掘充账（R196 :221-222 + 瞬拆 :179-181 收口）—— 更新后玩家挖掘，`digDrain` 行计数判值 | **PASS**（R1/R2/R3/R4） |
| E-SITE | 其余四站充账 + modifier 采样（attack/place/hoe/bow + L1–L4） | **FAIL**（R8 锄地面不成立；R5/R6/R7/R9/R10 全 PASS） |

---

## ③ 逐方法核讫表（R1–R10）

| # | 探针 | 判据行原文（服务端 `[FoodLog]`） | 期望 | 判 |
|---|---|---|---|---|
| R1 | 瞬拆：生存、空手、火把 `(-43,82,239)` | `21:16:31 digDrain base=0.01 mod=1.0 amount=0.01 pool=3.394863`（**1 行**） | 恰 1 行（:179-181 钩面） | **PASS** |
| R2 | 进度挖：钻石镐 × 石头 `(-43,81,240)`，一次性按住到破 | `21:16:47–21:16:48` 连续 **25 行** `digDrain base=0.01 mod=1.0 amount=0.01`（pool 2.6548603→3.1348598，步长 0.02 = 0.01 充账 + 0.01 池增速） | 恰 N 行；**N=26**（HUD「挖掘…剩余刻」读数，同一工具/方块） | **PASS**（Δ=−1，抖动注记） |
| R3 | 完成击否定面：R2 尾行之后 | R2 窗口（21:16:47–21:16:57）合计仍 **25 行**，尾行后 0 笔 | 无第二笔（:238-245） | **PASS** |
| R4 | 创造态挖：`/gamemode 1` → 挖石头 `(-43,80,242)` → `/gamemode 0` | 创造窗 `21:24:18 ≤ t ≤ 21:24:36` 内 `[FoodLog]` **0 行** | 0 行（:209-212 + 池侧双保险） | **PASS** |
| R5 | 攻击命中：生存、钻石剑、僵尸 | `21:16:58 attackDrain base=0.3 mod=1.0 amount=0.3 pool=1.3248584`（**1 行**） | 1 行/swing（0.3×mod） | **PASS** |
| R5b | 群体扫击：两僵尸叠站（`-38.6/-38.4,80,240.5`）同一次挥击 | `21:24:48 attackDrain base=0.3 mod=1.0 amount=0.3`（**1 行**）；两只均红闪/被击退（用户转述） | 仍 1 行（G3 sweep-immune） | **PASS** |
| R6 | 弱击拒态：`/etest food 0 0` → 空手 → 打 **1 血**僵尸 `(-41.5,80,238.5)` | 窗口 `21:33:23–21:34:00`：`attackDrain` **0 行**；同期 3 条 `STARVE strike 1.0 (health=19/18/17)` 证明确在饥饿态；1 血僵尸**存活**（`testfor @e[type=zombie]` 仍 2 只） | 拒击 0 行 + 不造成伤害 | **PASS** |
| R7 | 放置：生存、石头、右键地面 | `21:17:14 placeDrain hardness=1.5 base=1.5 mod=1.0 amount=1.5 pool=2.0648558`（**1 行**） | 1 行，amount=min(h,20)×mod=1.5 | **PASS** |
| R8 | 锄地三变体 + 去重面：草地 `(-40,80,242)` / 土 `(-41,80,242)` / 砂土 `(-42,80,242)`，各右键顶面一次 | **`hoeDrain` 0 行**；同 tick 却出 **3 条 `placeDrain`**：`21:17:27 hardness=0.6 base=0.6 amount=0.6`／`21:17:29 hardness=0.6 amount=0.6`／`21:17:32 hardness=0.5 amount=0.5` | 各恰 1 行 `hoeDrain amount=hardness/2×mod`（0.3/0.25/0.25），同 tick `placeDrain` 0 行 | **FAIL** |
| R8b | 复证：另起一块土 `(-42,80,243)` 右键 | `21:24:12 placeDrain hardness=0.6 base=0.6 amount=0.6`，`hoeDrain` 仍 0 行 | 同上 | **FAIL（系统性，非抖动）** |
| R9 | 拉弓：满弓保持 ≈3 s | `21:17:42–21:17:45 bowDrain base=0.01 mod=1.0` **58 行** | ≈60 行（3 s ≈ 60 tick） | **PASS**（Δ=−2，抖动注记） |
| R10 | modifier 采样：四级全新的钻石胸甲**穿上**后各打僵尸一下 | `21:34:16 mod=0.8 amount=0.24000001`／`21:34:36 mod=0.6 amount=0.18`／`21:34:44 mod=0.39999998 amount=0.12`／`21:34:53 mod=0.19999999 amount=0.06` | 1.0−L×0.2 = 0.8/0.6/0.4/0.2，amount=0.3×mod | **PASS** |

**R8 根因（字节码级定谳）**：`MixinItemHoe` 的充账钩子用 `@At("TAIL")`。Mixin 的 TAIL 只绑定方法里**最后一条 RETURN**，而 `ItemHoe.onItemUse` 的全部 SUCCESS 分支都是**提前 return**，最后一条 RETURN 是末尾的 `return EnumActionResult.PASS`。变换后类 `run/obfuscated/.mixin.out/java/net/minecraft/item/ItemHoe.java` 实测：

```java
if (block == Blocks.field_150349_c || block == Blocks.field_185774_da) {
    this.func_185071_a(...);            // 草地→耕地
    return EnumActionResult.SUCCESS;    // ← 直接返回，钩子被跳过
}
...
EnumActionResult var10000 = returnValue13 = EnumActionResult.PASS;
this.handler$zba000$etim$hoeDrain(...);  // ← 钩子只在这里（PASS 面）
return var10000;
```

后果是双重的：①成功锄地永不充 `hoeDrain`；②锄地在 `ForgeHooks.onPlaceItemIntoWorld` 里 SUCCESS 后会补发 `BlockEvent.PlaceEvent`（该事件在 `item.onItemUse` 返回**之后**触发），而「同 tick 去重」依赖 `chargeHoe` 打的 `lastTillChargeTick` 戳——戳永远打不上，于是锄地被当成放置全额充账（草地 0.6 而非 0.3，砂土/土 0.5 而非 0.25），标签也错成 `placeDrain`。即**锄地实际扣 2 倍、走错站**。

---

## ④ 冲突分级

### C1（探针态 · 非缺陷）R10 首轮「拿在手上」测量作废
- 首轮 5 条 `attackDrain mod=1.0`（`21:32:01` / `:32:09` / `:32:18` / `:32:35` / `:32:46`），每级 `/enchant` 都报 `Enchanting succeeded` 但 mod 不动。
- 根因：`EnchantmentEndurance` 构造把 `applicableEquipmentTypes` 收窄为 `{CHEST}`，而 `EnchantmentHelper.getMaxEnchantmentLevel` → `Enchantment.getEntityEquipment(entity)` 只遍历 `applicableEquipmentTypes` 并读 `getItemStackFromSlot`，**手持不参与**。改「穿上」后四级全部对读成功（见 R10）。行为面符合 R196 胸甲（ItemCuirass）语义，非缺陷。

### C2（前置条件 · 非缺陷）R2b 用木镐挖石头「完全没有裂痕」
- ETIM 挖掘门槛：`getToolGrade = harvestLevel ≤ 1 ? level : 3`，石头 `getMinHarvestLevel = 2` ⇒ 木镐(0)/石镐(1) 判**无效工具**，`progress = 0`，客户端无裂痕、方块不破；期间服务端仍按活跃挖掘逐 tick 充账（`digDrain` 397 行）——这正是 R196 :221-222「failed digs included」的预期面，不是缺陷。**R2b 因此不作 N 锚，改用 HUD 读数 N=26。**

### C3（工装 · 非缺陷）服务端在客户端退出同秒终止（三次）
- 收口轮外，A/B/C 三段的客户端一退出（`Developer lost connection`）服务端 JVM 即消失（无 `Stopping server`、无 `hs_err`、无 crash-report）。读数均在退出前录得；收口轮 `/stop` 归档完整（`Saving worlds → Stopping server`），25565 只剩 `TimeWait`。

### C4（日志噪声 · 非缺陷）池步长 0.02 而非 0.012
- `foodTestMode=true`（上一轮遗留）把池增速抬到 0.01/tick，故相邻 `digDrain`/`bowDrain` 行的 `pool` 差值 = 0.01 充账 + 0.01 增速 = 0.02。`base`/`mod`/`amount` 三列不受影响，判值口径不变。

### C5（探针未成立 · 记录）R8c「锄石头」判别步未落
- 设计意图：用 PASS 分支反证钩子绑错 return。实测该次右键在服务端未进入 `onItemUse`（窗口内零 `[FoodLog]` 行），判别步作废；根因结论改用**变换后字节码**定谳（见 R8），证据强度更高。

### C6（浮点表示 · 非缺陷）`mod=0.39999998` / `0.19999999`
- `1.0F − 3×0.2F` 与 `1.0F − 4×0.2F` 的 IEEE-754 单精度结果分别为 `0.39999998` / `0.19999999`，`amount` 随之打印 `0.12` / `0.06`。逐位正确，非偏差。

**FAIL 计：1（R8，含 R8b 复证）。**

---

## ⑤ 伪代码建议（仅 FAIL 项）

```java
// testharness 判据面之外的产品修正：MixinItemHoe
// 现状: @Inject(method = "onItemUse", at = @At("TAIL"))  -> 只覆盖最后一条 RETURN(= PASS 面)
// 修正: 改为 RETURN（覆盖全部 return，含三个 SUCCESS 提前返回），SUCCESS 守卫保留原样
@Inject(method = "onItemUse", at = @At("RETURN"))
private void etim$hoeDrain(EntityPlayer player, World world, BlockPos pos, EnumHand hand,
                           EnumFacing facing, float hitX, float hitY, float hitZ,
                           CallbackInfoReturnable<EnumActionResult> cir) {
    IBlockState captured = etim$captured.get();
    etim$captured.remove();
    if (cir.getReturnValue() != EnumActionResult.SUCCESS || captured == null) {
        return;                      // FAIL / PASS 面不充账（R196 ItemHoe:75-77 只在成功锄地扣）
    }
    ETIMEndurance.chargeHoe(player, captured.getBlockHardness(world, pos));
}
```

时序自洽性：`onItemUse` 在 SUCCESS 返回时先执行 `chargeHoe`（打 `lastTillChargeTick` 戳），随后 `ForgeHooks.onPlaceItemIntoWorld` 才补发 `PlaceEvent` → `chargePlace` 读到同 tick 戳并跳过，即「同 tick placeDrain 0 行」自动成立，无需改 `chargePlace`。
回归门建议：Endurance 轮补一条 `hoeDrain ≥ 1 且 placeDrain(同 tick) = 0` 的硬断言（当前 4/4 锄地全为 0，可作回归基线）。

---

## ⑥ 环境终态（逐项回读）

| 项 | 终值 |
|---|---|
| `gamerule doMobSpawning / doDaylightCycle / doWeatherCycle` | **true / true / true**；`keepInventory=false`；`time set 1000` |
| cfg | `foodModel=true`、`foodDebugLog=true`、`devTools=true`、`moonStateOverride=`（空）、`enduranceMaxLevel=4`、`enduranceModifierStep=0.2` |
| 25565 / 25575 | **无监听**（仅 `TimeWait`）；`21:37:32 Saving worlds → Stopping server` 干净归档 |
| jar 复验 | **333,106 B @ 2026-10-21 21:10:53**｜SHA256 `BA959CF08A54F5A640B2B979F7CE20F4B64174B1855623CC229239E1A776D35D`（`build/libs` 与 `run/obfuscated/mods` 同源） |
| `src/main` | 0 改动；HEAD = `caf7a28` |
| 场景清理 | `fill -50 80 236 -34 84 248 air`（36 块：石柱/玻璃柱已清、测试顶棚 y=83 已清）；y=79 石台保留；实体清零（4 僵尸） |
| scoreboard | 临时目标 `dmg`（`stat.damageDealt`）已 `objectives remove` |
| crash / hs_err | 无 |

---

## 附：落盘日志

- `build-logs/endurance-client.out` / `endurance-client2.out` / `endurance-client3.out` —— 三次客户端起服（含 init 校验行）
- `build-logs/endurance-server-A.log` —— A 组（R1/R2/R3/R5/R7/R8/R9）
- `build-logs/endurance-server-B.log` —— B 组（R2b/R8b/R4/R5b/R10 首轮作废）
- `build-logs/endurance-server-C.log` —— C 组（R2c/R10 四级/R6）
- `.mixin.out/java/net/minecraft/item/ItemHoe.java` —— `@At("TAIL")` 绑错 RETURN 的字节码证据（R8 定谳）

**签署**：会话七 ｜ 基线 `caf7a28`（jar 333,106 B @ 21:10:53）｜ init 常驻校验 **PASS** ｜ E-DIG/G2 **PASS** ／ E-SITE **FAIL（R8）** ｜ 核讫表 11 行全判 ｜ FAIL **1**
