# 工装 T0-1/T0-2 验证轮 + R10/R6 回归 — 判决报告

- 轮次：工装验证（补27 首轮）
- 判决源：服务端 `[FoodLog]` 行（`foodDebugLog=true`、`foodTestMode=false`、0.002/tick 口径）+ `[EtimInit]` 行 + 工装回执/报错面 + `/testfor` NBT 面
- 落盘日志：`build-logs/harness-t01t02-server.log`、`build-logs/harness-t01t02-client-latest.log`、`build-logs/harness-t01t02-client.out`（含钉值校验行）、`build-logs/harness-t01t02-bot.out`（[chat]/[act] 逐行）
  - 真客户端补测（boot #2，§6）：`build-logs/harness-t01t02-server-b.log`、`build-logs/harness-t01t02-client-latest-b.log`
- 判决总数：**18 项判据 → PASS 17 ／ FAIL 1（E1，工装面）**

---

## 0. 基线与起服核讫

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | 2825375 | `2825375 T0-2 harness: /etest enchant …` | ✓ |
| jar 大小/时间 | 334,510 B（补27 钉值） | 334,510 B ｜ 2026-10-21 21:52:25 | ✓ |
| jar SHA256 | FA3D881E…F715FF | `FA3D881EC0F6273274ABA8420E7613B6DAC90F980B2155BB864BB8BD28F715FF` | ✓ |
| 客户端常驻校验 | 长度+哈希同步校验 | `[etim-harness] pinned etim jar synced+verified: 334510B  SHA256 FA3D881EC0F6273274ABA8420E7613B6DAC90F980B2155BB864BB8BD28F715FF` | ✓ |
| 收口复验 build/libs ≡ mods | 同哈希 | 两处均 `FA3D881E…F715FF`，334,510 B，mtime 未变 | ✓ |
| src/main 本轮改动 | 0 | `git status --porcelain -- src/main` 空 | ✓ |
| 起服面 | run/obfuscated-server 副本 + classpath 追加钉值 jar | `classpath append: …\build\libs\etim-1.0.0.jar (mtime=10/21/2026 21:52:25)`，mods 目录无 etim 副本（无双扫 dup 面） | ✓ |
| 配置口径 | foodModel=true / foodTestMode=false / foodDebugLog=true | 三项终态同值 | ✓ |

客户端先进（19:29 起）、服务端后起（19:30:07 `Done (1.080s)!` / `RCON running on 0.0.0.0:25575`）。

---

## 1. 判决类清单

| 判据 | 期望 | 判 | 依据（判据行/回执） |
|---|---|---|---|
| B-1 EtimInit 客户端行 | 行存在 + id 稳定正整数 | ✓ | `[19:29:53] … [EtimInit] enchant etim:endurance id=12` |
| B-2 EtimInit 服务端行 | 同值 | ✓ | `[19:30:07] … [EtimInit] enchant etim:endurance id=12` |
| B-3 id 可复用于裸 NBT | `/testfor …{ench:[{id:12s,lvl:1s}]}` 命中 | ✓ | `Found ETIM_Harn04` |
| B-4 id 跨重启稳定 | 重起仍同值 | ✓ | boot #2 `[19:42:47] … id=12` |
| D-1 `/etest enchant chest 1` | 回执 + NBT 落地 | ✓ | 回执 `commands.etest.enchant_set`；`lvl:1s` Found、`lvl:2s` not match |
| D-1b 胸甲 tooltip 目视 | 显示 Endurance/耐力 档位 + 光效 | ✓ | 真客户端：`钻石胸甲（#0311）／耐力 IV／穿在身上时：+2 盔甲韧性 +8 盔甲`，光效=有（§6） |
| D-2 `/etest enchant offhand 1` | WrongUsage | ✓ | RCON 回显 usage 全串 |
| D-3 `/etest enchant nosuchslot 1` | WrongUsage | ✓ | RCON 回显 usage 全串 |
| D-4 空槽 `enchant chest 1` | enchant_empty_slot | ✓ | `Target slot chest is empty (equip an item first)` |
| R10-L1..L4 产品面 | mod = 0.8 / 0.6 / 0.39999998 / 0.19999999 | ✓ | 19:36:43 / :49 / :54 / 19:37:00 四行逐位一致（一级一甲口径） |
| R10-RC 真客户端挥击 | 与 bot 同级读数一致 | ✓ | 19:45:41 `mod=0.19999999 amount=0.06`（Endurance IV，§6） |
| R10 原位改级（同一件甲 1→2→3→4） | 每级生效 | ✗ **E1** | 四级全 `mod=0.8`；NBT 实为 4 条叠加入口（见 §3） |
| C-1 RCON `/etest food 0 0 @p` | 回执 food_set_pool | ✓ | 回执 `commands.etest.food_set_pool`（到场玩家=该 bot，@p 解析成立） |
| C-2 RCON `health/level/debt … <target>` | 回执 + 状态生效 | ✓ | `level_set` / `debt_set` 回执；`health` 触上限钳制且上限随 level 6.00→10.00 |
| C-3 RCON `/etest food 5`（无 target） | PlayerNotFound 面 | ✓ | `Only players can use /state.` |
| C-4 玩家 `/etest food 5 3` | nutrition=3（原语义） | ✓ | 回执 key + `/testfor {foodLevel:3}` Found、`:5` 不中 |
| C-5 玩家 `/etest food 5 <玩家>` | target 语义，nutrition 缺省=satiation=5 | ✓ | 回执 key + `/testfor {foodLevel:5}` Found、`:3` 不中 |
| R6 弱击 + 赤字 | 0 attackDrain + STARVE 行 | ✓ | 窗内 19:38:02 / :27 / :52 三条 `STARVE strike`，0 条 attackDrain，3 次 `etim.hunger.weakStrike` |

---

## 2. 逐方法核讫表（判据行原文）

### 2.1 初始化面

```
[etim-harness] pinned etim jar synced+verified: 334510B  SHA256 FA3D881EC0F6273274ABA8420E7613B6DAC90F980B2155BB864BB8BD28F715FF
[19:29:53] [Client thread/INFO] [Easy Times In Minecraft]: [EtimInit] enchant etim:endurance id=12
[19:30:07] [Server thread/INFO] [Easy Times In Minecraft]: [EtimInit] enchant etim:endurance id=12
```

口径说明：`ETIMEnchantments.init` 打印 `Enchantment.getEnchantmentID(ENDURANCE)`，1.12 Forge registry 动态分配。
本轮两端同值 12（MITE 语义源 95 不参与比对），**只判「行存在 + 稳定正整数 + 两端同值 + 可复用于裸 NBT」**，四项全过。

### 2.2 D 面（工装）

```
> /replaceitem entity ETIM_Harn04 slot.armor.chest minecraft:diamond_chestplate 1 0
  OUT: Replaced slot slot.armor.chest with 1 * [Diamond Chestplate]
> /etest enchant chest 1 ETIM_Harn04
  OUT: (no output)                     ← respond 走玩家通道，非 RCON 回显
  bot: [11:39:24.382] [chat] commands.etest.enchant_set
> /testfor ETIM_Harn04 {Inventory:[{Slot:102b,tag:{ench:[{id:12s,lvl:1s}]}}]}
  OUT: Found ETIM_Harn04
> /testfor ETIM_Harn04 {Inventory:[{Slot:102b,tag:{ench:[{id:12s,lvl:2s}]}}]}
  OUT: ETIM_Harn04 did not match the required data structure
> /etest enchant offhand 1 ETIM_Harn04
  OUT: Usage: /etest food <satiation> [nutrition] [player] … /etest enchant <slot> <1..4> [player] (legacy food model: …)
> /etest enchant nosuchslot 1 ETIM_Harn04
  OUT: Usage: /etest food <satiation> [nutrition] [player] … （同串）
> /replaceitem entity ETIM_Harn04 slot.armor.chest minecraft:air
> /etest enchant chest 1 ETIM_Harn04
  OUT: Target slot chest is empty (equip an item first)
```

D-1 的 NBT 落地为硬判据：`lvl:1s` 命中、`lvl:2s` 不中，说明写入恰为 1 级且未污染。
D-1b（tooltip 显示 Endurance/耐力档位 + 附魔光效）已在 boot #2 由真人客户端补测闭合：`耐力 IV` + 光效=有（§6）。

### 2.3 R10 面

**产品面（一级一甲口径，PASS）**

```
[19:36:43] … [FoodLog] ETIM_Harn04 (10731) attackDrain base=0.3 mod=0.8        amount=0.24000001 pool=1.8020859
[19:36:49] … [FoodLog] ETIM_Harn04 (10731) attackDrain base=0.3 mod=0.6        amount=0.18       pool=2.3120883
[19:36:54] … [FoodLog] ETIM_Harn04 (10731) attackDrain base=0.3 mod=0.39999998 amount=0.12       pool=2.7620904
[19:37:00] … [FoodLog] ETIM_Harn04 (10731) attackDrain base=0.3 mod=0.19999999 amount=0.06       pool=3.1520927
```

四级各恰 1 行，mod 与上轮 R10 **逐位一致**（含单精度原值 `0.39999998` / `0.19999999`）。
每级流程：`slot.armor.chest` 清空 → 新钻石胸甲 → `/etest enchant chest <L>`（回执 `commands.etest.enchant_set`）→ `/etest food 20 20`（回执 `commands.etest.food_set_pool`）→ 一次挥击。

**工装面（原位改级，FAIL E1）**

```
[19:35:12] … attackDrain base=0.3 mod=0.8 amount=0.24000001 pool=3.8260577
[19:35:16] … attackDrain base=0.3 mod=0.8 amount=0.24000001 pool=0.32105863
[19:35:20] … attackDrain base=0.3 mod=0.8 amount=0.24000001 pool=0.81905866
[19:35:25] … attackDrain base=0.3 mod=0.8 amount=0.24000001 pool=1.3170605
```

四级全 0.8。NBT 直证（同一件甲，依次 `/etest enchant chest 1|2|3|4` 后）：

```
> /testfor ETIM_Harn04 {Inventory:[{Slot:102b,tag:{ench:[{id:12s,lvl:1s},{id:12s,lvl:2s},{id:12s,lvl:3s},{id:12s,lvl:4s}]}}]}
  OUT: Found ETIM_Harn04
```

即 `ench` 列表被**追加**成 4 条同 id 条目，而 `EnchantmentHelper.getEnchantmentLevel` 返回**首条**命中 → 恒读 1 级。
工装 javadoc「addEnchantment updates the same-id entry in place」与 1.12.2 实际语义不符（详见 §3 E1）。

### 2.4 C 面（T0-1 target 链）

```
> /etest food 0 0 @p                       OUT: (no output)   bot: [11:31:28.945] [chat] commands.etest.food_set_pool
> /etest food 0 0 ETIM_Harn04              OUT: (no output)   bot: [11:31:29.464] [chat] commands.etest.food_set_pool
> /etest level 10 ETIM_Harn04              OUT: (no output)   bot: [11:31:29.983] [chat] commands.etest.level_set
> /etest health 20 ETIM_Harn04             OUT: The number you have entered (20.00) is too big, it must be at most 10.00
> /etest debt 3 ETIM_Harn04                OUT: (no output)   bot: [11:31:31.028] [chat] commands.etest.debt_set
> /etest food 5                            OUT: Only players can use /state.
```

- C-1：`@p` 由 RCON 发出仍解析到场（该刻在线玩家恰 1 名，无歧义），回执走玩家通道 → key 面成立。
- C-2：`level 10` 前同一句 `health 20` 报 `at most 6.00`（level 0 上限），`level 10` 后报 `at most 10.00`
  → 既证 target 解析成立，又证 `level_set` 落到了目标玩家身上（上限随等级 6→10）。`health_set` 成功面另见 R6 相位
  `[11:37:37.809] [chat] commands.etest.health_set`（level 35、cap 20）。
- C-3：无 target + 非玩家发送者 → `commands.state.no_player`，RCON 侧回显 `Only players can use /state.`。
- C-4/C-5（发送者是玩家，bot 代打）：

```
[11:37:19.310] [cmd] /etest food 5 3            → [11:37:19.360] [chat] commands.etest.food_set_pool
> /testfor ETIM_Harn04 {foodLevel:3}             → Found ETIM_Harn04
> /testfor ETIM_Harn04 {foodLevel:5}             → ETIM_Harn04 did not match the required data structure
[11:37:28.191] [cmd] /etest food 5 ETIM_Harn04  → [11:37:28.209] [chat] commands.etest.food_set_pool
> /testfor ETIM_Harn04 {foodLevel:5}             → Found ETIM_Harn04
> /testfor ETIM_Harn04 {foodLevel:3}             → ETIM_Harn04 did not match the required data structure
```

数字三 token → nutrition=3（原语义不回退）；非数字三 token → target 语义、nutrition 缺省=satiation=5。
参数级判定用 `foodLevel`（`ETIMFoodStats.syncVanillaFoodLevel` 的写穿镜，值恒等于 nutrition），不依赖聊天文本。

### 2.5 R6 面

```
[11:37:36.495] [cmd] /etest level 35 ETIM_Harn04   → [chat] commands.etest.level_set
[11:37:37.104] [cmd] /etest food 0 0 ETIM_Harn04   → [chat] commands.etest.food_set_pool
[11:37:37.808] [cmd] /etest health 20 ETIM_Harn04  → [chat] commands.etest.health_set
[chat] etim.hunger.weakStrike   ×3（11:37:38.609 / 39.759 / 40.959）
R6 观察窗 11:37:41 → 11:39:01（80 s）
[19:38:02] … [FoodLog] ETIM_Harn04 (10731) STARVE strike 1.0 (health=19.0 difficulty=1)
[19:38:27] … [FoodLog] ETIM_Harn04 (10731) STARVE strike 1.0 (health=18.0 difficulty=1)
[19:38:52] … [FoodLog] ETIM_Harn04 (10731) STARVE strike 1.0 (health=17.0 difficulty=1)
```

窗内：3 次真实挥击 → 3 条 `weakStrike` 回馈、**0 条 attackDrain**（全局 attackDrain 计数停在 19:37:00 那条 R10w-L4），
STARVE 按 25 s 节拍 3 条 —— 与上轮 R6 同口径。窗后挂机尾另有 2 条（19:39:17 / 19:39:42，health 16/15），
属收口前的自然持续，不参与判定。

判定增益：R6 全程未用真人客户端，`/etest food 0 0 <player>` + bot 挥击即可闭环 —— T0-1 的收益当场兑现。

---

## 3. 冲突分级

### FAIL（1）

**E1 —— `/etest enchant` 同件甲原位改级不生效（工装缺陷，非产品缺陷）**

- 现象：同一件胸甲依次 `chest 1 → 2 → 3 → 4`，回执均为 `enchant_set`（不报错），但 attackDrain 恒 `mod=0.8`。
- 定谳：NBT 面显示 `ench` 列表变成 `[{id:12,lvl:1},{id:12,lvl:2},{id:12,lvl:3},{id:12,lvl:4}]` —— 追加而非覆盖；
  `EnchantmentHelper.getEnchantmentLevel` 取**首个同 id 条目**，故永远读到 1 级。
- 影响面：只影响「单件甲连续升档」的采样方式；产品侧 `getEnduranceModifier` 读数正确（换新甲即四值全对）。
- 结论：任务书 R10 的「原位改级不报错 = addEnchantment 原位覆盖语义」前提在 1.12.2 不成立 → 该子判据 FAIL，产品面另判 PASS。
- 处置：本轮**未现场修码/未 rebuild**（jar 指纹前后一致），修法见 §4。

### 通道/口径注记（不计 FAIL）

| 编号 | 内容 | 处置 |
|---|---|---|
| N1 | bot（mineflayer）无 lang 表，`respond` 的 `TextComponentTranslation` 在 bot 侧只显示裸 key（`commands.etest.food_set_pool` 等）；绿色译文只在真客户端可见。 | boot #2 真客户端已实测译文带全参数（`已设双池：饱食5 营养=3（上限20 点）` 等，§6）→ 通道面收口；参数级判定仍优先用 `/testfor`（NBT/`foodLevel`），建议见 §4 S2。 |
| N2 | RCON 发送者无实体位置，`@p` 在本轮仅 1 名在线时可用；多人在线会按原点就近择人（`testharness/player/README.md` 通道纪律）。 | C-1 记录「单人面成立」，多人面改用显式名；本轮其余全部用显式名。 |
| N3 | `/etest food 20 20` 与 `/etest health 20` 的池/血上限随等级（level 0 → 6，level 35 → 20），level 0 时会钳制或报错。 | 非缺陷：属 `PlayerStatLimits` 既有语义；工装使用时须先抬等级。 |
| N4 | 1.12 `replaceitem` 槽名是 `slot.armor.chest`（`slot.chest` 为 1.13+ 名）。 | 我方工装脚本用名，已纠正。 |
| N5 | D-1b tooltip/附魔光效 | **已闭合**：boot #2 真人客户端目视 `耐力 IV` + 光效=有（§6），判据转为 ✓。 |
| N6 | 文案不一致（C 级，非判负）：`commands.etest.enchant_set` 译串把附魔名写死成英文 `Endurance 4 级`，而物品 tooltip 走 `enchantment.etim.endurance` = `耐力 IV`。 | 建议参数位改用 `ETIMEnchantments.ENDURANCE.getTranslatedName(level)`（见 §4 S3），纯文案、零行为面。 |

### 过程作废（不判负）

| 编号 | 内容 |
|---|---|
| P1 | R10 第 1 次自建工装（19:32）作废：`/replaceitem … slot.chest` 被 1.12 拒（`'slot.chest' is not a valid parameter`）→ 胸甲为空 → `enchant_empty_slot`，且 level 0 池限 6 → 全员弱击。判据窗口改取 19:36 纠正后窗口。 |
| P2 | R10 第 2 次（19:35）作废：bot 被传送到 y=79（实心块内）连续窒息死亡（`suffocated in a wall`），甲掉落、等级归零 → 只剩 L1 有效。改用已验证站位 (-40.5, 80, 240.5) + `keepInventory=true` 兜底后重跑。 |
| P3 | 首个 ad-hoc 探针 `/testfor … id:"minecraft:diamond_chestplate"` 因 PowerShell 引号剥离解析失败，改用裸 id 形式（判据面同义）。 |

---

## 4. 伪代码建议（仅 FAIL 项）

### S1（E1 必修）`CommandDevTest.executeEnchant`：同 id 条目先清再写

```java
// 现状：stack.addEnchantment(ETIMEnchantments.ENDURANCE, level);
// 1.12.2 ItemStack.addEnchantment 是 append 语义（同 id 不去重），
// EnchantmentHelper 读首个同 id 条目 → 原位升档恒读首档。

int id = Enchantment.getEnchantmentID(ETIMEnchantments.ENDURANCE);
NBTTagCompound tag = stack.getTagCompound() != null ? stack.getTagCompound() : new NBTTagCompound();
NBTTagList list = tag.getTagList("ench", 10);
NBTTagList kept = new NBTTagList();
for (int i = 0; i < list.tagCount(); i++) {
    NBTTagCompound e = list.getCompoundTagAt(i);
    if (e.getShort("id") != id) kept.appendTag(e);   // 丢掉同 id 旧条目
}
tag.setTag("ench", kept);
stack.setTagCompound(tag);                            // 保证空列表也落盘
stack.addEnchantment(ETIMEnchantments.ENDURANCE, level);  // 唯一一条，档位即所注入档
respond(player, "commands.etest.enchant_set", args[1], level, stack.getDisplayName());
```

验收面：同一件甲 `1→2→3→4` 连续注入后 `/testfor …{ench:[{id:<n>s,lvl:4s}]}` 命中，且 attackDrain 依次 `0.8/0.6/0.39999998/0.19999999`。
（本轮「一级一甲」workaround 只作临时口径，不替代修复。）

### S2（建议，随 S1 一并落）`respond` 加服务端日志通道

```java
// RCON/无人值守轮的根因：绿字只走玩家通道，RCON 侧看不见，bot 侧只有裸 key。
private static void respond(EntityPlayerMP player, String key, Object... params) {
    ETIM.LOGGER.info("[EtimTest] {} player={} params={}", key, player.getName(), Arrays.toString(params));
    player.sendMessage(new TextComponentTranslation(key, params).setStyle(...));
}
```

效果：后续工装轮可直接 `grep '\[EtimTest\]'` 判回执与参数，不再需要「真客户端看译文」或「另加 NBT 探针」。

### S3（建议，纯文案）`commands.etest.enchant_set` 用附魔本地化名

```java
// 现状：lang 串把附魔名写死成英文 —— 回执 "Endurance 4 级" vs tooltip "耐力 IV"
respond(player, "commands.etest.enchant_set", args[1], level, stack.getDisplayName());
// 建议：把档位文本交给附魔自己翻译，lang 键改为
//   commands.etest.enchant_set=注入：槽位 %s %s（%s）
respond(player, "commands.etest.enchant_set", args[1],
        ETIMEnchantments.ENDURANCE.getTranslatedName(level), stack.getDisplayName());
```

接受面：zh_cn 回执与 tooltip 同为 `耐力 IV`；en_us 同为 `Endurance IV`。零行为面。

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true / doDaylightCycle=true / doWeatherCycle=true / keepInventory=false | ✓ |
| time | 1000 | ✓ |
| 配置 | foodModel=true / foodTestMode=false / foodDebugLog=true / devTools=true | ✓ |
| 场景清理 | `T01Dummy` + `T01Real` 均已 kill；boot #2 收口 `/testfor @e[type=zombie]` → `found nothing`；bot 背包 `Cleared … removing 2 items`；胸甲槽置空 | ✓ |
| 端口 | 25565 / 25575 均无监听（两轮收口各验一次） | ✓ |
| 关服 | boot #1 `[19:39:57] Stopping server → Saving worlds`；boot #2 `[19:46:22]` 同序 | ✓ |
| crash / hs_err | 无（crash-reports 空、无 hs_err） | ✓ |
| jar 复验 | build/libs ≡ run/obfuscated/mods，`FA3D881E…F715FF` / 334,510 B，mtime 未变（两轮收口各验一次） | ✓ |
| src/main | 0 改动；HEAD=2825375 | ✓ |
| 客户端 | 补测后由操作者关闭，日志已快照 `harness-t01t02-client-latest{-b}.log` | ✓ |

---

## 6. 真客户端补测（boot #2，19:42:37 起）

目的：闭合 D-1b（tooltip/光效）、N1（真客户端译文带参数）、C-4/C-5 人工复现、真客户端挥击 vs bot 等价性。
环境：同钉值 jar（`FA3D881E…F715FF`）、`-WorkDir run\obfuscated-server`、`[19:42:47] … id=12`（跨重启稳定）。
操作者：Developer（ops level 4，客户端 zh_cn），`[19:43:38] Developer joined the game`。

### 6.1 目视面

- tooltip（真人转述/截图）：`钻石胸甲（#0311）／耐力 IV／穿在身上时：+2 盔甲韧性 +8 盔甲／NBT：1 个标签`
  → 附魔名与档位由 `enchantment.etim.endurance` 本地化渲染；「穿在身上时」段证明**穿戴槽**语义生效（R10 的 C1 前提）。
- 附魔光效：**有**（操作者确认）。

### 6.2 真客户端回执（绿字，带参数）

```
已注入：槽位 chest Endurance 4 级（Diamond Chestplate）
已设双池：饱食0 营养=0（上限20 点）
已设双池：饱食5 营养=3（上限20 点）
已设双池：饱食5 营养=5（上限20 点）
```

- 第 1 条来自 `/etest enchant chest 4`（**不带 target**，发送者缺省路径）→ 与 D-1 的 target 路径互补。
- 第 2~4 条分别是 `/etest food 0 0`、`/etest food 5 3`（C-4）、`/etest food 5 Developer`（C-5），参数逐位符合预期。
- `上限20 点` 来自该账号等级换算的池上限，与 N3 口径一致（同一句命令在 level 0 会钳到 6）。
- 客户端日志同文（`harness-t01t02-client-latest-b.log` 的 `[CHAT]` 行）；本机控制台以 GBK 回显会糊，文件本身 UTF-8 正常。

### 6.3 真客户端挥击（R10-RC）

```
[19:43:38] Developer joined the game
[19:45:41] … [FoodLog] Developer (89) attackDrain base=0.3 mod=0.19999999 amount=0.06 pool=3.2023566
```

与 bot 的 R10w-L4 行（19:37:00 `mod=0.19999999 amount=0.06`）**逐位一致** → 附录 A 的「bot 挥击 ≡ 真客户端挥击」在本轮取得直接对照，不再只是路径推断。

### 6.4 补测边界

- 仍未自动化的只有 HUD/准星手感/客户端预测，按 AGENTS 第 9 条不作判据。
- 补测只新增一条产品面证据（6.3），未改动 §1 任何产品判据结论；E1 仍为唯一 FAIL。

---

## 附录 A：动作面的取证方式（为什么 bot 挥击可以判产品面）

- R10/R6 只需要「玩家真实挥击」这一服务端事件；bot 的 `use_entity(ATTACK)` 与真客户端走同一条
  `NetHandlerPlayServer.processUseEntity → attackTargetEntityWithCurrentItem → AttackEntityEvent` 路径，
  服务端日志里的 `attackDrain` / `weakStrike` / `STARVE` 与客户端实现无关。
- 驱动力全部落在 `[FoodLog]` 与 NBT 面，符合「产品面一律以日志为准」。
- 唯一不可自动化的仍是纯客户端面（tooltip/附魔光效/HUD），本轮按要求不将其作为判定依据。

## 附录 B：本轮新增/使用的工装件

- `testharness/player/t01-run.js`（新）：gate 文件驱动的动作面脚本（`R10w` 一级一甲采样 / `R6` 弱击+观察窗 / `cmd <命令>` 玩家侧发令 / `quit`），
  `[act]` 进度落 `build-logs/t01-done.txt`，聊天面落 `build-logs/harness-t01t02-bot.out`。
- 复用：`testharness/server/start-server.ps1`（`-WorkDir run\obfuscated-server`）、`testharness/server/rcon.py`、
  `testharness/obfclient-fix.init.gradle`（钉值同步 + 长度/SHA256 门）、`testharness/player/fmlbot.js`。
