# free-action 效果面 · **W-B15 判决**（B-15 批，条 321/322，HEAD `b27c2c4`）

> **HEAD**：`b27c2c4`（窗内 **0 提交**，起收同 commit）｜**jar**：`build/libs/etim-1.0.0.jar` **1,039,622 B**｜SHA256 `ED53E57354B1A4FECA804616FF79264306D032CB87C906163D547AC27DF52940`｜MD5 `3A0DDC6BC9A28779C9E01C9219593B7B`（起收同值，**0 rebuild**）
> **refmap**：classes **87** / entries **197**（dual **394**，双树同）｜**mixins**：**84** + 10 client｜`applyAttributesModifiersToEntity → func_111185_a` 在表（全档计 **1**）｜`MixinPotion` 嵌 jar 且登记
> **窗口**：2 boot（5.256／5.435 s）＋2 停服（exit 0＋BUILD SUCCESSFUL）｜单假人 `ETIM_F7`｜世界 `w-b15v`（旗 on）／`w-b15vb`（旗 off）｜**0 客户端／0 产品码改动**
> **判决**：**W0 ✓｜W1a ✓｜W1b ✓｜W1c ✓｜W2 ✓**——免费行动对减速药水属性 modifier 的削减面按 R196 落地；W3（obf 现锤）独立复核同值

## §1 逐臂判读

| 臂 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot／钉值 | Done＋mixinFail 0＋stop 干净＋jar/refmap/mixins 同值 | b1 `Done (5.256s)!`、b2 `Done (5.435s)!`，`mixinFail=0×2`；stops ×2 `exit=0 / build=true`；jar `1,039,622 B`＋`ED53E573…`＋`3A0DDC6B…` 三值与钉值同；`mkCounts` **87/197**（dual **394**）＋**84+10**；refmap `MixinPotion` 条目 `applyAttributesModifiersToEntity → Lnet/minecraft/potion/Potion;func_111185_a(EntityLivingBase, AbstractAttributeMap, I)V`，全档 `func_111185_a` 计 **1**；manifest 84 含 `MixinPotion`；jar 含 `MixinPotion.class` | ✓ |
| **W1a** 负证（无装备） | 无 free_action 装备 → 减速药水 → **零** shred 行 | 先 `replaceitem … slot.armor.legs iron_leggings 1 0`（未附魔），`effect ETIM_F7 2 30 0` 回执 `Given Slowness (ID 2) * 0 to ETIM_F7 for 30 seconds`（b1:3900）；其到下一次 enchant（b1:4392）之间 `[EnchLog]` 行 **0**（全区扫，非同段抽样）；`ev.W.W1a.rowCount=0` | ✓ |
| **W1b** L1 判值 | 一行／level=1／amountRaw=-0.1500／amountShred=-0.1200 | `enchant_set … 'enchantment.etim_free_action' … 'enchantment.level.1' … Iron Leggings`（b1:4392）→ effect（b1:4477）→ `[EnchLog] free_action src=slowdownShred potion=effect.moveSlowdown level=1 amountRaw=-0.1500 amountShred=-0.1200 entity=ETIM_F7 [server]`（b1:4476）；rowCount=1、`match=true`；`0.8` 因子＝`1 − 1×0.8/4` | ✓ |
| **W1c** L4 判值 | 同位升级 L4 → level=4／-0.1500／**-0.0300** | `enchant_set … 'enchantment.level.4' … Iron Leggings`（b1:4497，同槽原位升级不换株）→ effect（b1:4611）→ `… level=4 amountRaw=-0.1500 amountShred=-0.0300 entity=ETIM_F7 [server]`（b1:4610）；rowCount=1、`match=true`；`0.2` 因子＝`1 − 4×0.8/4` | ✓ |
| **W2** 旗断对照 | `freeActionShredR196=false` → L4 装备＋药水 → **零** shred 行 | boot2 写 `freeActionShredR196=false`；`enchant_set … 'enchantment.level.4' … Iron Leggings`（b2:4363）＋`Given Slowness (ID 2) * 0 …`（b2:4762）→ `slowdownShred` 行 **0**；同 boot `[EnchLog]` 仍有 3 条 `nonTable src=mob tension=0.00`（b2:2519／2524／2566）→ **通道开着**，零行不是静默空证 | ✓ |

> **W3（窗外面，独立复核）**：`testharness/build-logs/b15-obf-boot.out` 4,576 行——`:132 Added etim-1.0.0.jar to the classloader`／`:2260 Done (11.847s)!`／`:3311 [EnchLog] free_action src=slowdownShred potion=effect.moveSlowdown level=4 amountRaw=-0.1500 amountShred=-0.0300 entity=ETIM_F7 [server]`／`:4573 BUILD SUCCESSFUL in 34s`；`run/obfuscated/logs/latest.log` 同步该行，无 mixin fail 行。生产面（srg 环）与 dev 面同值。

## §2 判行原文（每点 ≥3 行）

**W0 · boot 与停服**

- `Done (5.256s)! For help, type "help" or "?"`（b1:2324）
- `Done (5.435s)! For help, type "help" or "?"`（b2:2324）
- `Added etim-1.0.0-dev.jar to the classloader to process its mixin manifest attributes.`（b1:173／b2:173）
- `BUILD SUCCESSFUL in 37s`（b1:4679）／`BUILD SUCCESSFUL in 29s`（b2:4909）

**W1a · 负证**

- `Given Slowness (ID 2) * 0 to ETIM_F7 for 30 seconds`（b1:3900）
- 该行至 b1:4392（首次 enchant）之间 `[EnchLog]` 命中 **0** 行
- 同段 `slowdownShred` 命中 **0** 行

**W1b · L1**

- `[EtimTest] commands.etest.enchant_set player=ETIM_F7 params=[legs, TranslatableComponent{key='enchantment.etim_free_action' … 'enchantment.level.1' …}, Iron Leggings]`（b1:4392）
- `[EnchLog] free_action src=slowdownShred potion=effect.moveSlowdown level=1 amountRaw=-0.1500 amountShred=-0.1200 entity=ETIM_F7 [server]`（b1:4476）
- `Given Slowness (ID 2) * 0 to ETIM_F7 for 30 seconds`（b1:4477）

**W1c · L4**

- `[EtimTest] commands.etest.enchant_set player=ETIM_F7 params=[legs, TranslatableComponent{key='enchantment.etim_free_action' … 'enchantment.level.4' …}, Iron Leggings]`（b1:4497）
- `[EnchLog] free_action src=slowdownShred potion=effect.moveSlowdown level=4 amountRaw=-0.1500 amountShred=-0.0300 entity=ETIM_F7 [server]`（b1:4610）
- `Given Slowness (ID 2) * 0 to ETIM_F7 for 30 seconds`（b1:4611）

**W2 · 旗断**

- `[EtimTest] commands.etest.enchant_set player=ETIM_F7 params=[legs, TranslatableComponent{key='enchantment.etim_free_action' … 'enchantment.level.4' …}, Iron Leggings]`（b2:4363）
- `Given Slowness (ID 2) * 0 to ETIM_F7 for 30 seconds`（b2:4762）
- 全档 `slowdownShred` **0** 行；通道在位证据：`[EnchLog] nonTable src=mob tension=0.00 [server]`（b2:2519／b2:2524／b2:2566）

## §3 冲突分级

- **A 级：0** —— 两个判值面（L1／L4）与负证面（W1a）、旗断面（W2）全数落判，无判值缺陷。
- **B 级：0** —— 无「代码已写但判据无法覆盖」项；`applyAttributesModifiersToEntity` 的 refmap 条目在表，dev 与 obf 双面均有实锤行。
- **D 级：0** —— 互通偏差 0（见 §4），无需开 D 位问；R196 的 `amount` 基数（amplifier 0 → -0.15）与因子分母 4（`EnchantmentFreeAction.getNumLevels() :9-11`）均按一手直读，无需裁定。
- **C 级：6（全簿记／工装）**
  - **C-15-1**（簿记）：任务书写「crash 数照 R0 基准 0」，而本机实际基线为 **23**；窗内 **23→23** 无新增，判值不受影响。
  - **C-15-2**（工装）：`build-logs/f11-b15-verify.json` 无 pin／cfg 快照块，旗断 boot 的 `freeActionShredR196=false` 未在 ev 内留字；已用日志侧三条互证替代——b2 的 `enchant_set`（L4 成功）＋`Given Slowness`（效果已上）＋3 条 `nonTable` EnchLog（通道开启）。建议后续驱动把 per-boot cfg 值写入 ev。
  - **C-15-3**（判读口径）：判行按**属性条目**逐条落（`attributeModifierMap` 遍历内），本批减速仅 1 条 → 1 行；多属性药水会产多行，判读须同时限定 `potion=` 与行数，不能只看 `slowdownShred` 出现与否。
  - **C-15-4**（簿记）：判窗世界 `w-b15v`／`w-b15vb` 未删——本批任务书未列删除要求（前批 B-14 为显式保留），保留待主会话处置。
  - **C-15-5**（工装）：`build-logs/b15-obf-boot.json` 实为精简存根 `{tag,boot,mixinFailRows:[],locate:null,probes:[],ok:true}`（160 B），**不含任务书所述 `etimLoaded`／`shredOk` 字段**；W3 判值改以 `b15-obf-boot.out` 与 `run/obfuscated/logs/latest.log` 原文为据。
  - **C-15-6**（产品码观察）：`src/main/java/io/github/etim/etim/mixins/MixinPotion.java` 的 `@Inject(method="applyAttributesModifiersToEntity", at=HEAD, cancellable=true)` **未加 `require=1`**；本轮 dev＋obf 双面均出判行，绑定已实证，非本批判值缺陷，建议下次触碰该件时补齐（与 B-12-1 同口径）。

## §4 收口与互通

- **cfg 起收同**：49,379 B｜SHA256 `A4A756C4ABCB2F742B48F90B8027F871AC8ECDE0F7020B6DD98CAEFE10452F10`（`freeActionShredR196=true`／`enchantDebugLog=false`／`villageFieldsR196=true`／`blightR196=false`；键 250）。b2 临时改 `freeActionShredR196=false`，收口回写开窗字节。
- **props 起收同**：939 B｜SHA256 `077F795418B1D4E74E6FBB8064A15B5FF606E1F598239D17BB01518636BD5A6C`（`level-name=w-b13a`／`level-seed=etim27`／`view-distance=10`）。
- **jar／dev／sources 同值**：1,039,622 `ED53E573…`／`3A0DDC6B…`；dev 1,019,457 `F64765BC…`；sources 946,585 `78DF836E…`；`mkCounts` 87/197（dual 394）＋84+10 未变（`ok=false` 系 MK_PIN 仍钉 B-11，禁值／预期）。
- **obf cfg**：49,504 B `A7CC32FB750813C0B7BA4F12CBDE9D1C3008CA40D9E56FB2F812D3600292E420`（键 254，mtime `2026-11-07T03:04:35Z`＝本机 11:04，系主会话 obf 现锤所写；本驱动只写 `run/config/etim.cfg`＋`run/server.properties`，未触 obf）。
- **残留**：crash **23→23**；端口 **0**；GradleStart JVM **0**；HEAD `b27c2c4` 起收同、窗内 **0 提交**。
- **互通（vs `build-logs/f11-b15-smoke.json`）**：r1a **0 行**／r1b **L1 -0.1200**／r1c **L4 -0.0300**／r2 **0 行**——四判点逐值同，**偏差 0**（≤1 门槛）；boot 时间与 mixinFail 亦一致（0×2）。

> 报告四值：`9,692 B｜UTF-8 无 BOM｜LF｜首字节 0x23｜CR 0｜U+FFFD 0｜80 行｜✓ 11 / ✗ 1`
> 正本：`testharness/reports/b15-verify-verdict.md`｜byte 五项：`9,692 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 79（split 80）`
> SHA-256 甲（全档零位）`AB36EB30B47675655000B51FC8B03F0C82713F926C5E591151C2CF6D4277ECDE`
> SHA-256 乙（LF 归零零位）`AB36EB30B47675655000B51FC8B03F0C82713F926C5E591151C2CF6D4277ECDE`
> SHA-256 丙（行链零位）`A2E13F67428AEBA783B6A3F3CAC6F9964CAA3CA31EACD3BDBBDF6EE81B2C38C9`
