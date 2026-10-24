# Endurance R8 复测判决（4be13aa，最小面）

**基线（钉死，禁 rebuild）**：`4be13aa`｜jar **333,109 B @ 2026-10-21 21:39:28**｜SHA256 `25E56AAF4443976F3378BD96BFA87DC25A876278390AB909A8D32B8DF039063A`
**轮次**：2026-10-21 21:42–21:44（单次起服；客户端 21:42:38 起）
**改动面**：`MixinItemHoe` 的 `@At("TAIL")` → `@At("RETURN")`（源码 :50），SUCCESS 守卫不变
**init 常驻校验（新钉值首验）**：**PASS**

```
[etim-harness] pinned etim jar synced+verified: 333109B  SHA256 25E56AAF4443976F3378BD96BFA87DC25A876278390AB909A8D32B8DF039063A
```

**判定源**：服务端 `[FoodLog]` 行（`foodDebugLog=true`）= 唯一判据；`foodTestMode` 已回 `false`（C4 遗留清除，池增速恢复 0.002/tick）
**场景**：`(-40,80,242)` 草地 / `(-41,80,242)` 土 / `(-42,80,242)` 砂土，各露天（y=81 空气）；玩家生存、空手外只持钻石锄、无附魔（mod=1.0）

---

## ① 核讫表

| # | 判据 | 判据行原文 | 期望 | 判 |
|---|---|---|---|---|
| **R8'** | 三变体各锄一次，`hoeDrain` 各恰 1 行，`amount = hardness/2×mod` | `21:43:57 hoeDrain hardness=0.6 base=0.3 mod=1.0 amount=0.3 pool=1.5627129`<br>`21:44:03 hoeDrain hardness=0.5 base=0.25 mod=1.0 amount=0.25 pool=2.02671`<br>`21:44:08 hoeDrain hardness=0.5 base=0.25 mod=1.0 amount=0.25 pool=2.4947202` | 0.6→0.3 / 0.5→0.25 / 0.5→0.25，各 1 行 | **PASS** |
| **R8''** | 同 tick 去重面：锄地 tick 内 `placeDrain` 恒 0 行 | 整轮 `placeDrain` = **0 行**（全会话唯一充账类型为 hoeDrain ×3） | 0 行 | **PASS** |
| **R8'''** | 锄地后 pool 增量 = amount（非全额 hardness） | R8'-1→R8'-2：pool `1.5627129 → 2.02671`，Δ=**+0.4639971**；按 0.002/tick 折算 accrual ≈0.214（107 tick）+ hoe **0.25** = 0.464（若全额 0.5 应为 0.714）<br>R8'-2→R8'-3：Δ=**+0.4680102**；accrual ≈0.218 + hoe **0.25** = 0.468（若全额 0.5 应为 0.718） | 增量 = amount | **PASS** |

**旁证（三变体全部落地）**：锄后 `testforblock` — `(-40,80,242) farmland` ✓／`(-41,80,242) farmland` ✓／`(-42,80,242) dirt` ✓（grass→farmland、dirt→farmland、coarse_dirt→dirt，D-E2 三变体均充账）。

**修复机制核对（变换后字节码）**：`run/obfuscated/.mixin.out/java/net/minecraft/item/ItemHoe.java` 实测 `func_180614_a` 共 **6 条 return，6 条全部插入钩子**（:57 FAIL／:65 `hook!=0` 三元合并 return／:76 草地 SUCCESS／:87 土 SUCCESS／:94 砂土 SUCCESS／:103 PASS）；SUCCESS 守卫过滤掉 FAIL/PASS，故只有成功锄地充账，且 `chargeHoe` 在 SUCCESS 返回处打戳 → 随后 `ForgeHooks.onPlaceItemIntoWorld` 的 PlaceEvent 被 `chargePlace` 同 tick 跳过（R8'' 的机制来源）。

---

## ② 冲突分级

### C1（口径恢复 · 非缺陷）`foodTestMode` 回 false
上一轮 C4 遗留（true，池增速 0.002→0.01/tick）已清除。R8''' 的两段增量用 0.002/tick 折算后可逐位闭合，反证口径已恢复。

### C2（场景遗留 · 非缺陷）上一轮收口把 gamerule 恢复成 true
起服后 `kill @e[type=!Player]` 清掉 10 个自然生成怪与掉落物（skeleton/zombie/creeper/spider + 腐肉/箭/骨头），属上一轮遗留，与本轮判据无交互。

### C3（日志噪声 · 记录）窗外的两条池事件
`21:44:13 healed 1.0 via regen (hungerPool+=1.0)` 与 `21:44:21 consumed satiation point … hungerPool=7.4386597E-4` 均落在三次锄地**之后**，不参与 R8''' 的相邻行差分（R8'-3 行内 pool=2.4947202 为 regen 前值）；记录以免把池回零误读为锄地扣账。

### C4（任务书预期值修正 · 非缺陷）RETURN 钩点数 = 6，不是 4
`ItemHoe.onItemUse` 的 `return hook > 0 ? SUCCESS : FAIL` 被 javac 合并为单条 return，故实际 RETURN 站点为 6 条（FAIL / 三元 / 草地 / 土 / 砂土 / PASS），不是任务书预估的 4 条。本次三条 SUCCESS 路径全部命中（R8' 三行即是证明）。

**FAIL 计：0。**

---

## ③ 终态

| 项 | 终值 |
|---|---|
| `gamerule doMobSpawning / doDaylightCycle / doWeatherCycle` | **true / true / true**；`keepInventory=false`；`time set 1000` |
| cfg | `foodModel=true`／`foodDebugLog=true`／`foodTestMode=false`／`devTools=true`／`moonStateOverride=`（空） |
| 25565 / 25575 | **无监听**（仅 `TimeWait`）；`21:44:45 Saving worlds → Stopping server` 干净归档 |
| jar 复验 | **333,109 B @ 2026-10-21 21:39:28**｜SHA256 `25E56AAF…39063A`（`build/libs` 与 `run/obfuscated/mods` 同源） |
| `src/main` | 0 改动；HEAD = `4be13aa` |
| 场景清理 | `fill -50 80 236 -34 84 248 air`（3 块测试方块已清）；y=79 石台保留；实体清零 |
| crash / hs_err | 无 |

---

## ④ 工装建议（挂账，非判据面；不影响本轮 0 FAIL）

本轮 R6/R10 以及 R8 复测的「人做右键」环节，根因不在产品面，而在 `/etest` 与附魔注入的工具面。三项建议按成本排序：

### T0-1 `/etest` 加 target 参数（≈0.5 h）
- **现状**：`CommandDevTest` 全程 `getCommandSenderAsPlayer(sender)`，RCON 发送直接抛 `Only players can use …`，所以饥饿态/等级/血量只能由玩家敲。
- **改法**（按仓库约束不保留兼容层，直接改签名）：`/etest food <satiation> [nutrition] [player]`、`/etest health <points> [player]`、`/etest level <n> [player]`、`/etest debt <levels> [player]`；末参缺省 = 发送者，存在则 `CommandBase.getPlayer(server, sender, last)`；权限维持 2，RCON 天然可用。
- **收益**：R6 的 `/etest food 0 0` 变成一条 RCON，弱击拒态整链可无人值守。

### T0-2 附魔注入命令（≈0.3 h）
- **现状**：`/enchant` 只对手持生效，且同级不能改级（`Endurance II无法和Endurance I结合`）；Endurance 的 `applicableEquipmentTypes={CHEST}` 又只认胸甲槽 → 只能「手持 → 穿上」两步人操作。
- **改法**：加 `/etest enchant <slot> <level> [player]`，内部 `new EnchantmentData(ETIMEnchantments.ENDURANCE, level)` + `player.setItemStackToSlot(slot, stack)`；`slot` ∈ `chest/head/legs/feet/mainhand`。
- **收益**：R10 四级采样一条 RCON 跑完，且天然覆盖「穿戴」语义，不依赖背包操作。
- **附带**：起服打一行 `[EtimInit] enchant etim:endurance id=<n>`（`Enchantment.getId`），供需要裸 NBT 的场合（`/replaceitem … {ench:[{id:n,lvl:L}]}`）。

### T1 服务端包驱动（上一轮已提，仍挂账，≈1 天）
- `TestDriver`：按 tick 向 `NetHandlerPlayServer` 喂 `CPacketPlayerDigging / CPacketPlayerTryUseItemOnBlock / CPacketUseEntity / CPacketPlayerTryUseItem`，必须从**包边界**进入（不直调 `ETIMEndurance`），每步打 `[TestLog] step=… phase=start/end`。
- 配合 T0-1/T0-2 后，R1–R10 全套餐 = 一条 RCON + 一次 grep；人工只剩 A4/A5 那类 HUD/渲染/准星手感面（约束 9 豁免面）。

**优先级：T0-1 → T0-2 → T1**（T0 两项合计 < 1 天，可立刻消掉本轮「人做三步右键」这类环节）。

---

## 附：落盘日志

- `build-logs/endurance-r8-client.out` —— 客户端起服（含 init 校验行）
- `build-logs/endurance-r8-client-latest.log` —— 客户端 `latest.log` 副本
- `build-logs/endurance-r8-server.log` —— 服务端 `latest.log`（R8' 三行 + R8''/R8''' 判据源）
- `run/obfuscated/.mixin.out/java/net/minecraft/item/ItemHoe.java` —— 6 条 RETURN 全插钩的字节码旁证

**签署**：会话七 ｜ 基线 `4be13aa`（333,109 B @ 21:39:28）｜ init 校验 **PASS** ｜ R8' / R8'' / R8''' **全 PASS** ｜ FAIL **0** ｜ Endurance 面（R1–R10）至此 **11 行全 PASS**
