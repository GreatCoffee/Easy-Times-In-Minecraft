# 工装便利批件 2（anvil 日志通道）· W-33a…g 判决回执

> **报告字节规格**：`14,026 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 62 / ✗ 1｜165 行`
> 执行方：会话七（自动化测试执行方）｜窗口：2026-10-30 09:42–09:44（服务器本地时；驱动 UTC 01:42–01:44）｜tag `anvilench-w33`
> 判决源：判据只吃服务端 `[EnchantLog] anvil-combine face=ench|face=tx …` 行（注-2 行序：ench 先、tx 后）；旁证 = 窗口槽 damage/data 读数（mineflayer 窗口快照）＋ `/clear`/`testforblock` 面
> 审判权威：audit20 条 133／134（anvilench 立项+终审）＋主会话 W-33 任务书 ＋ A-1 修复四钉（HEAD `66f210d`）

## 0. 环境与钉值（先复核后起窗）

| 项 | 钉值 | 复核结果 |
| --- | --- | --- |
| 工作区 | `D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim` | ✓ `runServer` 工作目录 `run\` |
| 产品 HEAD | `66f210d`（anvilench A-1 fix — onTake inject CIR<ItemStack>） | ✓ 起窗/收口同值；前一环 `a502d9e` 为 A-1 缺陷版（已作废） |
| dev jar | 753,537 B｜`6AD5CC8B485F3A52FCC3DF7EC56DA91ED80C51DCFF229EC22167F45995FFA314` | ✓ 逐位命中（起/收同值） |
| release jar | 769,257 B｜`DD475DFDC0BA21FF4C981606A86596635CE8C7B273C3D17C4AF141A7DF6C254E` | ✓ 逐位命中（起/收同值） |
| 附属 jar | 不在场（本批不带 etimextra） | ✓ 三相 FML 清单 16 项无 etimextra；`> Task :etimExtrasOffGate SKIPPED` |
| 世界 | `level-name=test27dev` → 窗内新世界 `anvilench33` → 收口还原 | ✓ 三相同世界复用；目录收口删除 |
| `run\config\etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | ✓ **起收 byte-identical**（旧钉 31,055 B／`EBBA3185…` 已于上一窗换锚作废；本窗不再重锚） |
| `run\server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | ✓ 起收 byte-identical（窗内 `level-name=anvilench33`、`spawn-protection=0`） |
| 运行时 piercing id | **13**（Forge 动态分配；非 R196 常量 92） | ✓ 三相 `[EtimInit] enchant etim:piercing id=13` 一致；书 NBT 按此 id 注入 |
| 产物重建 | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（三相各一次） | ✓ 0 rebuild |
| 通道 | `gradlew runServer` ＋ 控制台 stdin（`server-console.js`） | ✓ `/replaceitem`、`/testforblock`、`/etest enchantprobe` 在役 |
| 环境前置 | 25565 = 0 LISTEN、`run\crash-reports` 18 条 | ✓ 收口后仍 0 LISTEN / 18 条 |

三相（cfg 只在相间改值，每相一次 boot）：

| 相 | cfg 面 | 判点 | Done 行 |
| --- | --- | --- | --- |
| neg | `anvilDebugLog=false`（+ 首 boot cfg 稳定性复核） | W-33e | `Done (5.241s)` |
| main | `anvilDebugLog=true`／`piercingMaxLevel=5` | W-33a / c / d / f / g | `Done (1.014s)` |
| max1 | `piercingMaxLevel=1` | W-33b | `Done (0.978s)` |

## 1. 逐判点核讫表

判法：一个判点 = 一次 fresh 砧交易（每点清包重摆，无行级去重面）；判 **face=ench 定值** ＋ **face=tx 定值** ＋ 旁证（槽位 damage 读数、余量计数）；`cost=` 只作读数（A-3 禁作判值）。

| 判点 | 场景 | 期望 | 实测判行 | 结论 |
| --- | --- | --- | --- | --- |
| W-33a | 铜镐 ＋ piercing L2 书（vanilla 臂） | ench 先：`id=13 base=0 add=2 out=2 max=5`；tx 后：`mode=vanilla kind=ench cost>0` | ench：`id=13 base=0 add=2 out=2 max=5`｜tx：`mode=vanilla kind=ench cost=4 mat=0`｜**先 ench 后 tx** ✓ | **✓ 通过** |
| W-33b | 同上，`piercingMaxLevel=1` | ench：`out=1 max=1`（截断直证） | ench：`base=0 add=2 out=1 max=1`｜tx：`kind=ench cost=2` ✓ | **✓ 通过** |
| W-33c | 铜镰 -1600 ＋ 9 铜珠（ETIM 耗材臂） | tx：`mode=etim kind=repair mat=2 cost=0` ＋ `[CraftingLog] repair take` | tx：`mode=etim kind=repair dmg=1600>0 cost=0 mat=2`｜CraftingLog：`repaired=1600 nuggets=2 kind=1 anvilWear=1600` ✓ | **✓ 通过** |
| W-33d | 空槽改名（铜镐） | tx：`kind=rename` 且**无** ench 行 | tx：`mode=vanilla kind=rename dmg=0>0 cost=1`｜ench 行 0 条 ✓ | **✓ 通过** |
| W-33e | 同 a 场景，`anvilDebugLog=false` | 0 条 anvil-combine；命令面 enchantprobe 仍活 | anvil-combine 0 条、场景内 `[EnchantLog]` 0 条｜`enchantprobe … maxLevel=5` 在案 ✓ | **✓ 通过** |
| W-33f | 双铜镰 -800／-400 合并 | tx：`mode=etim kind=repair mat=0` 且无 ench 行 | tx：`mode=etim kind=repair dmg=800>0 cost=0 mat=0`｜CraftingLog `kind=2 anvilWear=0`｜ench 0 条 ✓ | **✓ 通过** |
| W-33g | QUICK_MOVE（shift 取产） | tx `item=` 非空（抽干快照生效直证） | tx：`item=etim:pickaxe_copper`（非空）；产出落背包槽 38 ✓ | **✓ 通过** |

逐点附着判据（每点均核讫，非抽样）：

| 判点 | 砧块在位 | 窗口打开 | 入槽落地（damage 面） | 产出在位 | tx 行数 | 旁证（NBT/计数） |
| --- | --- | --- | --- | --- | --- | --- |
| W-33a | ✓ testforblock | ✓ anvil 窗口 | ✓ 镐 0／书 NBT | ✓ | 1 | ✓ 取产 damage=0 与 `dmg=0>0` 一致 |
| W-33b | ✓ | ✓ | ✓ | ✓ | 1 | ✓ 同上 |
| W-33c | ✓ | ✓ | ✓ 镰 1600／珠 ×9 | ✓ 镰 damage 0 | 1 | ✓ 珠余 7（9−2），与 `mat=2` 一致 |
| W-33d | ✓ | ✓ | ✓ 镐 0 | ✓ 带改名 NBT | 1 | ✓ 取产在位 |
| W-33e | ✓ | ✓ | ✓ | ✓ | 0（负证） | ✓ 取产 damage=0 |
| W-33f | ✓ | ✓ | ✓ 800／400 | ✓ damage 0 | 1 | ✓ 背包仅 1 把（合并而非复制） |
| W-33g | ✓ | ✓ | ✓ | ✓ | 1 | ✓ 产出落背包槽 38（QUICK_MOVE 合并面） |

## 2. 判据原文（逐点，服务端 stdout）

### W-33a 附魔基线（vanilla 臂）

```text
[EnchantLog] anvil-combine face=ench mode=vanilla item=etim:pickaxe_copper ench=etim:piercing id=13 base=0 add=2 out=2 max=5 [server]
[EnchantLog] anvil-combine face=tx mode=vanilla kind=ench item=etim:pickaxe_copper in=etim:pickaxe_copper#0 in2=minecraft:enchanted_book#0 dmg=0>0 cost=4 mat=0 [server]
```

### W-33b maxLevel 门（`piercingMaxLevel=1`）

```text
[EnchantLog] anvil-combine face=ench mode=vanilla item=etim:pickaxe_copper ench=etim:piercing id=13 base=0 add=2 out=1 max=1 [server]
[EnchantLog] anvil-combine face=tx mode=vanilla kind=ench item=etim:pickaxe_copper in=etim:pickaxe_copper#0 in2=minecraft:enchanted_book#0 dmg=0>0 cost=2 mat=0 [server]
```

（`add=2` 而 `out=1` = 1.12 `j2 > getMaxLevel() → j2 = getMaxLevel()` 的截断直证；`max` 列同点为 1。）

### W-33c ETIM 修理臂（耗材）

```text
[EnchantLog] anvil-combine face=tx mode=etim kind=repair item=etim:scythe_copper in=etim:scythe_copper#1600 in2=etim:nugget_copper#0 dmg=1600>0 cost=0 mat=2 [server]
[CraftingLog] ETIM_W33A (57) repair take: tool=etim:scythe_copper repaired=1600 nuggets=2 kind=1 anvilWear=1600 [server]
```

（旧通道共存面：`[CraftingLog] repair take` 与 `face=tx` 同交易并存。）

### W-33d 改名（空槽，无 face=ench）

```text
[EnchantLog] anvil-combine face=tx mode=vanilla kind=rename item=etim:pickaxe_copper in=etim:pickaxe_copper#0 in2=empty dmg=0>0 cost=1 mat=0 [server]
```

（本交易 `face=ench` 行 0 条：`in2=empty` 且改名不触附魔合并。）

### W-33e 负证（`anvilDebugLog=false`）

```text
（anvil-combine 行 0 条；场景段内 [EnchantLog] 行 0 条）
[EnchantLog] enchantprobe slot=MAINHAND item=etim:pickaxe_copper canApply=true maxLevel=5 [server]
```

（命令面 `enchantprobe` 不读 `anvilDebugLog`：通道关掉后命令行仍在 ⇒ 两通道独立。）

### W-33f ETIM 双物合并

```text
[EnchantLog] anvil-combine face=tx mode=etim kind=repair item=etim:scythe_copper in=etim:scythe_copper#800 in2=etim:scythe_copper#400 dmg=800>0 cost=0 mat=0 [server]
[CraftingLog] ETIM_W33A (57) repair take: tool=etim:scythe_copper repaired=800 nuggets=0 kind=2 anvilWear=0 [server]
```

（`mat=0` = 合并不耗珠；`anvilWear=0` = 合并不磨砧，与既判 kind=2 面一致。）

### W-33g QUICK_MOVE 抽干回归

```text
[EnchantLog] anvil-combine face=ench mode=vanilla item=etim:pickaxe_copper ench=etim:piercing id=13 base=0 add=2 out=2 max=5 [server]
[EnchantLog] anvil-combine face=tx mode=vanilla kind=ench item=etim:pickaxe_copper in=etim:pickaxe_copper#0 in2=minecraft:enchanted_book#0 dmg=0>0 cost=4 mat=0 [server]
```

（shift 取产走 `ContainerRepair.transferStackInSlot(2)` → `Container.slotClick` 的 `onTake(player, <抽干后栈>)`；`item=` 仍非空 ⇒ `etim$offered` 快照生效。产出落背包槽 38。）

## 3. 冲突分级（A / B / C）

A 级 1 条（**A-1，已闭环**：由 `66f210d` 修复，本窗复验通过）；在办 A 级 0 条。B 级 0 条。C 级 4 条（均不改判据、不动阈值）。

| 条号 | 级别 | 内容 | 处置 |
| --- | --- | --- | --- |
| A-1 | A｜已闭环 | **MixinAnvilOutputSlot `@Inject` 描述符错**：目标 `ContainerRepair$2.onTake` 返回 `ItemStack`，处理器写成 `CallbackInfo` ⇒ 类加载变换失败 ⇒ 砧 GUI 全 build 打不开（首窗 `a502d9e` 于 W-33 smoke 锤出，服务端 `InvalidInjectionException … CallbackInfoReturnable is required!`）。主会话 `66f210d` 改为 `CallbackInfoReturnable<ItemStack>`（`MixinAnvilOutputSlot.java:68`），本窗 7 点全部走通砧门 ⇒ 闭环 | 已闭环，无需再动 |
| C-1 | C | **任务书 W-33a/b 的 `id=92` 与运行时 id 不符**：Forge 1.12 附魔 id 动态分配，本 build `etim:piercing` 运行时 id=**13**（`[EtimInit] enchant etim:piercing id=13`，三相一致）；R196 的 92 是反编译构造常量面，不是 1.12 运行时值。按 92 注入的书 = 无附魔书 ⇒ 空产出（首跑实证） | 判据已改为「启动日志运行时 id」；建议 audit20 条 133 的 W-33a/b 期望值把 `id=92` 订正为「运行时 id（本批 13）」 |
| C-2 | C | **1.12 item damage 在 slot 的 `data` 字段，不在 NBT `Damage`**：`/replaceitem … {Damage:1600}` 对 1.12 无效（NBT 只被当成附加 tag），物品实际仍是 damage=0 ⇒ ETIM 耗材臂判为「无修理上下文」⇒ 空产出（smoke2/smoke3 留档实证）。修正 = 用第 5 个参数（data）传 damage | 工装纪律（已写入驱动注释与回执）；后续批次摆伤一律走 data 参数或 `/etest damage` |
| C-3 | C | **mineflayer 无模组注册表**：模组物品在客户端一律显示 `name=unknown`（数字 id 可用），按 registry 名定位必失；本窗改为「`/replaceitem` 钉死 hotbar 0/1 → 窗口槽 30/31 恒定 → 按数字 id 认产出」 | 工装面；已固化为驱动纪律 |
| C-4 | C | **耗材余量留在砧输入槽**：W-33c 交易后 9−2=7 珠仍在 `slot 1`（vanilla 输入槽语义，关窗才回包），不在背包；只数背包会误判为 0 | 判读口径注记：余量须读槽＋背包之和（本窗 `inSlot=7, inInv=0`） |

无 provenance 回指：本窗只判「判行定值 + 行序 + 槽位旁证」，未以其他批次结论作反对理由；产品码 0 改动（`:jar UP-TO-DATE`）。

## 4. 结论

**W-33a / b / c / d / e / f / g 全部通过（7/7），驱动机器总判 PASS。**

- **附魔臂（vanilla）**：`face=ench` 先、`face=tx` 后同 tick 落行（注-2 行序成立）；`mode=vanilla kind=ench` 面正确；`base/add/out/max` 四列与合并语义一致；`piercingMaxLevel=1` 下 `out=1 max=1` = 截断直证；`cost=` 仅读数（W-33a=4、W-33b=2），未作判值。
- **ETIM 臂（etim）**：耗材修理 `mat=2 / cost=0 / dmg=1600>0` ＋ 旧通道 `[CraftingLog] repaired=1600 nuggets=2 kind=1` 并存；双物合并 `mat=0 / cost=0` ＋ `kind=2 anvilWear=0`，无 ench 行 —— 两臂镜像正确。
- **改名面**：空槽改名出 `kind=rename`、无 `face=ench` 行，且 `in2=empty` 读数正确。
- **负证面**：`anvilDebugLog=false` 下同场景 anvil-combine 与场景内 `[EnchantLog]` 双 0 条；命令面 `enchantprobe` 仍出 4 行 ⇒ 关砧行不误伤既有通道。
- **QUICK_MOVE 快照面**：shift 取产时 `onTake` 实参已被抽干，`item=` 仍非空 ⇒ `etim$offered` 快照按终审核②设计生效；产出落背包槽 38。
- **A-1 闭环**：缺陷版 `a502d9e` 的砧门阻断在 `66f210d` 修复后本窗 7 点全部走通，无残留 mixin 报错（三相均无 `InvalidInjectionException`）。

## 5. 收口与证据

| 项 | 结果 |
| --- | --- |
| 生命周期 | 三相 `Done (5.241s／1.014s／0.978s)` → stdin `stop` → `BUILD SUCCESSFUL`、退出码 0（neg/main/max1） |
| `run\config\etim.cfg` | 31,549 B｜`74327260…C8AD666`，**起收 byte-identical**（窗内两次键值改：`anvilDebugLog=false→true`、`piercingMaxLevel=5→1`，收口整档还原；**未换锚**） |
| `run\server.properties` | 890 B｜`30096338…B654A48`，**起收 byte-identical**（窗内 `level-name=anvilench33`、`spawn-protection=0`） |
| 世界 | 新世界 `anvilench33` 三相复用；收口删除目录（`worldDirRemoved=true`） |
| 端口 / 崩溃 | 25565 收口 0 LISTEN；`run\crash-reports` 18 条（窗前=窗后） |
| 客户端 | 本窗全程无客户端进程（纯服务端 + 假人 `ETIM_W33Neg`／`ETIM_W33A`／`ETIM_W33B`） |
| 钉值复核 | dev/release jar 收口 sha 与起窗同值（0 rebuild，三相 `:jar UP-TO-DATE`） |
| 证据档 | `testharness\build-logs\anvilench-w33-neg.out`／`-main.out`／`-max1.out`（全量控制台）、`-{neg,main,max1}-server-latest.log`（服务端日志）、`-evidence.json`（逐判点＋逐行＋槽位快照）、`-etim.cfg.old`／`-etim.cfg.newbase`／`-server.properties.before`；首窗排障留档 `-smoke{,2,3,4,5}-*`（A-1 与 C-2/C-3 实证） |
| 驱动 | `testharness\player\anvilench-w33.js`（三相：neg/main/max1；`W33_ONLY` 调试口仅冒烟用） |
| 产品码改动 | 0（`:jar UP-TO-DATE`；HEAD `66f210d` 起收同值） |

未提交件（交主会话入库）：

- `testharness\player\anvilench-w33.js`
- `testharness\reports\anvilench-W33-verdict.md`（本回执）
