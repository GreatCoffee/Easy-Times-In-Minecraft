# S3b mini 验证窗 — 判决报告（enchant_set 文案组件化）

- 轮次：S3b（1bca14a）｜类型：单点文案面回归（chat 行走翻译组件，不再预翻译 en_US）
- 判决源：`server.log [EtimTest]`（RCON 线）＋ **zh 客户端聊天行实看**（纯客户端渲染，判据纪律豁免面，用户转述）＋ `/testfor`/日志旁证
- 落盘：`build-logs/s3b-server.log`（主判据，80,935 B）、`s3b-bot.out`、`s3b-client.out`、`s3b-client-latest.log`
- 判决：**PASS 5 ／ FAIL 0**（V1 机制面 ✓、V2 档位面 ✓、V3 链路回归 ✓、V4 同文面 ✓（zh 实看 + en 推导）、负证 ✓）
- 结论：**第二参已是翻译组件（双 key 命中），四档 level key 逐位正确，产品消费链零联动，zh 聊天行与 tooltip 同文**

---

## 0. 基线核讫（全程未 rebuild）

| 项 | 期望 | 实测 | 判 |
|---|---|---|---|
| HEAD | 1bca14a | `1bca14a S3b chat-line language face: pass the enchant name + roman level as translation components …` | ✓ |
| src/main 改动面 | 仅 CommandDevTest（enchant_set 第二参组件化，+10/−2） | `1 file changed, 10 insertions(+), 1 deletion(-)` | ✓ |
| jar 大小/时间 | 343,037 B @ 21:04:42 | 343,037 B ｜ 2026-10-22 21:04:42 | ✓ |
| jar SHA256 | 239D2CFC…8CF4 | `239D2CFC57D6350D6C442F800BD87B959A3629C04615B49F747D055B01868CF4` | ✓ |
| 客户端常驻校验 | 新钉值首验 | `[etim-harness] pinned etim jar synced+verified: 343037B  SHA256 239D2CFC…8CF4` | ✓ |
| 客户端语言 | zh_cn（V4 实看前置） | `run/obfuscated/options.txt → lang:zh_cn` | ✓ |
| 服务端 classpath | build/libs 钉值 jar | `classpath append: …build\libs\etim-1.0.0.jar (mtime=10/22/2026 21:04:42)` | ✓ |
| 附魔 id | 从 `[EtimInit]` 读 | `[EtimInit] enchant etim:endurance id=12`（21:07:54） | ✓ |
| 起服 | — | `Done (1.059s)` 21:07:56 ／ `RCON running on 0.0.0.0:25575` ／ 无 mixin apply 报错 | ✓ |

改动形态（`git diff HEAD~1..HEAD`）：

```java
respond(player, "commands.etest.enchant_set", args[1],
        new TextComponentTranslation(ETIMEnchantments.ENDURANCE.getName())   // "enchantment.etim_endurance"
                .appendSibling(new TextComponentString(" "))
                .appendSibling(new TextComponentTranslation("enchantment.level." + level)),
        stack.getDisplayName());
```

`getName()` 侧证：`EnchantmentEndurance.setName("etim_endurance")` + 1.12 `Enchantment.getName() → "enchantment." + name` ⇒ key 来源非硬编码字符串 ✓

---

## 1. 判决类清单

| # | 面 | 期望 | 判 | 依据 |
|---|---|---|---|---|
| V1 | 机制面 | `/etest enchant … 4` 的 `[EtimTest] enchant_set` 行第二参同时含 `key='enchantment.etim_endurance'` 与 `key='enchantment.level.4'`；行内无定串 `Endurance IV` | ✓ | 21:08:56 行双 key 命中；`Select-String 'Endurance IV' -CaseSensitive` = **0** |
| V2 | 档位面 | L1..L4 → `level.1/.2/.3/.4` 逐位 | ✓ | 四行 levelKey = 1/2/3/4，各 `keys=2` |
| V3 | 链路回归 | 任一档 restage（enchant→food→attack）→ attackDrain mod 与 E1 预计算表同值 | ✓ | L3：`mod=0.39999998 amount=0.12`（E1 表 L3 = 0.39999998 / 0.12） |
| V4 | 同文面 | zh 聊天行「已注入：槽位 chest 耐力 IV（…）」== tooltip「耐力 IV」；en 文案不变 | ✓ | zh **实看**（用户转述：两者都是「耐力 IV」）；en **推导**（同键 + 同组件结构，见 §2.4） |
| N1 | 负证 | FAILED=0、bot 零输入、无 crash-report | ✓ | 日志 FAILED=0；bot 唯一 `[act] READY`；crash 目录无新增 |

---

## 2. 逐面核讫表（判据行原文）

### 2.1 V1 机制面 — 第二参是翻译组件（双 key 命中）

目标命令 `/etest enchant chest 4 ETIM_Harn04`，判据行（21:08:56，**全文**）：

```text
[21:08:56] [RCON Client #19/INFO] [Easy Times In Minecraft]: [EtimTest] commands.etest.enchant_set player=ETIM_Harn04 params=[chest, TranslatableComponent{key='enchantment.etim_endurance', args=[], siblings=[TextComponent{text=' ', siblings=[], style=Style{hasParent=true, color=null, bold=null, italic=null, underlined=null, obfuscated=null, clickEvent=null, hoverEvent=null, insertion=null}}, TranslatableComponent{key='enchantment.level.4', args=[], siblings=[], style=Style{hasParent=true, color=null, bold=null, italic=null, underlined=null, obfuscated=null, clickEvent=null, hoverEvent=null, insertion=null}}], style=Style{hasParent=false, color=null, bold=null, italic=null, underlined=null, obfuscated=null, clickEvent=null, hoverEvent=null, insertion=null}}, Diamond Chestplate]
```

- 第二参 = `TranslatableComponent`（非 `String`）⇒ 服务端不再预翻译 ✓
- 双层 `siblings` 结构精确对应「耐力」+ 空格 +「IV」两段 ✓
- 定串检查（大小写敏感）：`Endurance IV` = **0 行**、`Endurance I\b` = **0 行**（PowerShell 默认忽略大小写，故必须显式 `-CaseSensitive`；默认口径下 "Endurance" 的 5 次命中全部来自 key 里的 `etim_endurance`，非文案）
- key 计数：V2 段（4 行）= 4/4；全轮（6 行，含 V3 复持 + V4 Developer）= `key='enchantment.etim_endurance'` 6、`key='enchantment.level.[1-4]'` 6

### 2.2 V2 档位面 — L1..L4 逐位

| # | 时刻 | player | level key | 双 key | 判 |
|---|---|---|---|---|---|
| L1 | 21:08:54 | ETIM_Harn04 | `key='enchantment.level.1'` | keys=2 | ✓ |
| L2 | 21:08:55 | ETIM_Harn04 | `key='enchantment.level.2'` | keys=2 | ✓ |
| L3 | 21:08:55 | ETIM_Harn04 | `key='enchantment.level.3'` | keys=2 | ✓ |
| L4 | 21:08:56 | ETIM_Harn04 | `key='enchantment.level.4'` | keys=2 | ✓ |
| （V3 复持） | 21:09:02 | ETIM_Harn04 | `key='enchantment.level.3'` | keys=2 | ✓ |
| （V4 实看） | 21:11:37 | Developer | `key='enchantment.level.4'` | keys=2 | ✓ |

`enchantment.level.N` 是 vanilla 键（`I18n.translateToLocal("enchantment.level." + level)` 与 tooltip 同源）⇒ 换成组件后**罗马数字来源不变** ✓

### 2.3 V3 链路回归 — 文案改动零联动

restage 链（`/etest enchant chest 3` → `/etest food 20 20` → `/etest attack @e[type=armor_stand,c=1]`）：

```text
[21:09:02] [RCON Client #20] [EtimTest] commands.etest.enchant_set player=ETIM_Harn04 params=[chest, TranslatableComponent{… key='enchantment.level.3' …}, Diamond Chestplate]
[21:09:03] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] step=attack player=ETIM_Harn04 target=Armor Stand#553
[21:09:03] [Server thread/INFO] [Easy Times In Minecraft]: [FoodLog] ETIM_Harn04 (79) attackDrain base=0.3 mod=0.39999998 amount=0.12 pool=1.300877
```

对照 E1 预计算表：

| 档 | E1 表 mod / amount | 本轮实测 | 判 |
|---|---|---|---|
| L3 | 0.39999998 / 0.12 | `mod=0.39999998 amount=0.12` | ✓ 逐位 |

⇒ 改的只是**回执文案的构造**，附魔写入与耐力修正链（`getEnduranceModifier`）零联动 ✓

### 2.4 V4 同文面

**（a）zh 实看（判据纪律豁免面，用户转述）**

- 目标：`/etest enchant chest 4 Developer`（21:11:37，RCON Client #38），客户端 `lang:zh_cn`
- 用户转述：**聊天栏绿字与胸甲 tooltip 都是「耐力 IV」** ⇒ 同文面成立 ✓
- 聊天行模板（`zh_cn.lang:66`）：`commands.etest.enchant_set=已注入：槽位 %s %s（%s）`
  ⇒ 实渲染 `已注入：槽位 chest 耐力 IV（Diamond Chestplate）`
- tooltip 模板（`zh_cn.lang:23`）：`enchantment.etim_endurance=耐力` + vanilla `enchantment.level.4=IV` ⇒ `耐力 IV`
- 两者 key 集合完全相同（`enchantment.etim_endurance` + `enchantment.level.N`）⇒ 文案同源 ✓

**（b）wire 面旁证**（bot 侧，同时证明不是服务端烤好的英文）

```text
[13:08:55.187] [chat] commands.etest.enchant_set
[13:08:55.706] [chat] commands.etest.enchant_set
[13:08:56.240] [chat] commands.etest.enchant_set
[13:09:02.016] [chat] commands.etest.enchant_set
```

mineflayer 不做本地化，把 translate 组件渲染成裸 key ⇒ 线上载荷确为 `translate` 组件（定串 `Endurance IV` 在服务端日志 0 行亦为反证）✓

**（c）en 面（推导，未实看）**

- `en_us.lang:23` `enchantment.etim_endurance=Endurance`、`:66` `commands.etest.enchant_set=Enchanted: slot %s %s (%s)`
- 组件结构与 zh 完全同形，仅语言表不同 ⇒ 渲染为 `Enchanted: slot chest Endurance IV (Diamond Chestplate)`
- 与改动前的 `ENDURANCE.getTranslatedName(4)`（= `I18n("enchantment.etim_endurance") + " " + I18n("enchantment.level.4")`）**同键同结构** ⇒ 「en 文案不变」由构造成立 ✓（本轮客户端锁定 zh_cn，未切语言实看，见 §3-N1）

### 2.5 负证与零输入

```text
FAILED = 0（全日志 [TestLog].*FAILED）
[13:08:34.326] [act] READY bot=ETIM_Harn04 pos=-40.5,80.0,240.5     ← bot 全轮唯一 [act]
crash-report 新增 = 0（目录内仅上轮 20:19:28 / 20:24:37 两份）
```

`[EtimTest]` 11 行全部来自 RCON 线程（`RCON Client #16/#17/#18/#19/#20/#38`，无 `Server thread` 玩家输入）：

```text
enchant_set x6 · food_set_pool x3 · level_set x1 · drive_queued x1
```

⇒ 全序列由 RCON 注入，bot 零客户端输入；`Developer` 仅接收聊天行（V4 实看面），未发命令 ✓

---

## 3. 冲突分级

**工装 FAIL：0。** 全部 5 面 PASS（V4 的 en 半面为推导，见 N1）。

| 编号 | 级别 | 内容与证据 |
|---|---|---|
| **N1** | 覆盖说明 | V4-en 未实看：客户端 `options.txt → lang:zh_cn`，切语言需重载资源包，按任务书「顺带确认」未做；en 面以「同键同结构 + 改前改后等价」推导判 ✓。若需实看可后续单点复跑（改 options.txt 或游戏内切语言后重发一条）。 |
| **N2** | 信息面 | `[EtimTest]` 行因 `Arrays.toString(component)` 变长（≈1 KB/行，style 字段占大头）。本轮 6 行共 ~6 KB，不影响判读；仅作记录，不建议为此改日志实现（grep 键即可）。 |
| **N3** | 信息面 | mineflayer 把 translate 组件渲染成裸 key（`[chat] commands.etest.enchant_set`），**不能**作为 zh/en 文案判据；文案判定只用「客户端实看 + lang 表」两源，bot 行仅作 wire 证据。 |
| **N4** | 舞台面 | V4 期间 `Developer` 进服，`/clear Developer` 收口移除 65 件（其客户端默认背包），无判据影响；胸甲收口置 Air、实体归零。 |

---

## 4. 伪代码建议（仅 FAIL 项）

**无 FAIL 项，无修复建议。**

（仅备查）若后续想让 `[EtimTest]` 回执更紧凑，可另立小项把 `respond()` 的 mirror 改为「key 递归展开 + 字面量」，例如：

```text
mirror(params) ::= 对每个 param:
    String s          -> s
    Translatable(k,..) -> "{" + k + "}"
    其它组件           -> 递归拼接
=> [EtimTest] … params=[chest, {enchantment.etim_endurance} {enchantment.level.4}, Diamond Chestplate]
```

**但这不是本轮 FAIL 项，按「不预防性抽象」不落地。**

---

## 5. 终态表

| 项 | 值 | 判 |
|---|---|---|
| gamerule | doMobSpawning=true / keepInventory=false（其余未动） | ✓ |
| time | 1000 | ✓ |
| 实体 | armor_stand 0 / item 0（`/testfor` 均 found nothing） | ✓ |
| 方块 | 本轮零 `setblock`（无测试方块需要清理） | ✓ |
| 玩家状态 | ETIM_Harn04 背包 clear、胸甲 Air；Developer 背包 clear、胸甲 Air | ✓ |
| 配置 | foodModel=true ／ foodDebugLog=true ／ foodTestMode=false ／ devTools=true（未动） | ✓ |
| 端口 | 25565/25575 无 LISTEN | ✓ |
| 关服 | `[21:12:13] Stopping server → Saving worlds`（`/stop`），无残留游戏 JVM | ✓ |
| crash-report | 无新增 | ✓ |
| jar 双面 | build/libs ≡ run/obfuscated/mods，`239D2CFC…8CF4` / 343,037 B | ✓ |
| src/main | 0 改动；HEAD=1bca14a | ✓ |
| 客户端收口 | `close-client.ps1`（SC_CLOSE→WM_CLOSE，只认 Stopping!）：`[21:12:31] Stopping!` + Gradle **BUILD SUCCESSFUL in 5m 26s**；快照 160,489 B | ✓ |

---

## 附录 A：执行序（一次起服，全程 RCON）

1. 客户端先行 → 21:07:1x 钉值首验 `343037B / 239D2CFC…8CF4`
2. 起服 21:07:46 → `[EtimInit] id=12` → `Done (1.059s)` / RCON up
3. 设点：gamerule×2 / time 1000 / difficulty 1 / gamemode 0 / tp -40.5 80 240.5 / clear / armor_stand / chest 钻石胸甲 / level 35 / food 20 20
4. **V2（含 V1）**：`/etest enchant chest 1..4` → 四行双 key、level.1..4 逐位；定串 `Endurance IV` = 0
5. **V3**：`chest 3` → food 20 20 → attack → `mod=0.39999998 amount=0.12`（E1 表 L3 同值）
6. **V4**：用户 `Developer` 进服（zh_cn）→ tp −38.5 80 240.5 → 穿胸甲 → `/etest enchant chest 4 Developer`（21:11:37）→ 用户实看：聊天栏与 tooltip 均「耐力 IV」
7. 负证：FAILED=0、bot 唯一 `[act] READY`、crash 无新增
8. 收口：实体归零、双方背包/胸甲清空、gamerule 还原、time 1000 → `/stop`（21:12:13）→ 客户端 SC_CLOSE 优雅退窗（21:12:31 `Stopping!`）

## 附录 B：本轮落盘

| 文件 | 大小 | 用途 |
|---|---|---|
| `build-logs/s3b-server.log` | 80,935 B | 主判据（11 EtimTest / 6 enchant_set / 1 TestLog / 1 attackDrain） |
| `build-logs/s3b-bot.out` | 7,102 B | 零输入证据（唯一 `[act] READY`）+ wire 面裸 key 行 |
| `build-logs/s3b-client.out` | 345,202 B | 客户端钉值首验 + `BUILD SUCCESSFUL in 5m 26s` |
| `build-logs/s3b-client-latest.log` | 160,489 B | 客户端日志快照（`[21:12:31] Stopping!`） |
