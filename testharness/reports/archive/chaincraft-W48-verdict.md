# chaincraft 批（五金属链成形／拆链）· W-48 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-01（服务端日志 CST 00:57–01:02）｜**窗口**：单 boot（S 生存 → N 翻正／负证 → C 创造 → F 后备）＋ **0 客户端**
> **报告字节规格**：`31,192 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 43 / ✗ 1｜343 行`
> **判据正本**：`playground/audit/chaincraft-立项摸底.md` §5（14 主点表／§5.3 后备）；`playground/audit/chaincraft-终审回执.md` §四 判值速查（T-G 定稿：15 主点＋后端照领）＋ Ku-1（守门逐字稿 {29,154}）／Ku-2（拆链 id）／Ku-6（判读细则：行族 5-14）
> **判据通道（纯服务端，单族 6 形＋守门）**：
> - 守门行：`[TestLog] gear recipes registered: 29 batch rows ok (runtime REGISTRY delta; etim-domain total 154 incl legacy 94: 90 ingot-based + 4 rusted chain-armor)`——**batch≠29 或 total≠154 ＝ A 级停窗**。
> - 判行族：`result CHANGED sig=<reg>#<meta>×<n>`／`period SET difficulty=… period=…`／`result click btn=0`／`start crafting difficulty=… period=…`／`COMPLETE <显名> ×<n> quality=… xp=… continue`／`result gone → reset`（全 `[CraftingLog] … [server]` 尾标）。
> - 身份四源互锁：① `/give` 标定数字 id（17 项全表见 §7.2）② sig 行 registry 名×meta×count ③ COMPLETE 显名×count ④ 背包 type/count/`etim.quality`。
> **判决**：**PASS**——20 点（主点 15：S1–S10／N0／N1／C1／C2／F1；后备 5：F2／F3／F4／i／j）**全 ✓**；`COMPLETE` 全窗 **20 条**（S 10＋N0 1＋F1 6＋F2 1＋F3 1＋i 1）；C 组与负证点 **零 `[CraftingLog]` 行**；`damaged ingredient → crafting cleared` **0**、`damage penalty` **0**、`CLIENT result click` **0**；守门行 runtime 实数 **29 / 154**；起收钉值全 byte-identical（零 rebuild、零产品码、零 cfg 编辑）、props／ops／usercache／usernamecache byte-identical、crash 18 顺延、world 已删、零客户端。

## §0 判定总表（20 点逐格）

判据＝「COMPLETE 显名×count × quality=AVERAGE × xp=0 × continue」＋「背包 Δ ＝ 期望 spec」＋「sig 链末条＝目标产物 registry」＋「difficulty／period 对齐」；C 组＝「零行＋Δ 照表＋无 quality tag」；负证点＝「零行＋无目标产物 sig＋背包无新增＋矩阵余料恒在」。

### 0.1 主点 15

| 点 | 相 | 产物（registry×count） | 料（×数／槽位） | d | period | COMPLETE 实测 | 背包 Δ | quality | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 生存 | `etim:chain_copper` ×1 | 铜粒×4（2/4/6/8） | 100 | 83 | `Copper Chain ×1` | 链 +1 | 无 tag | ✓ |
| S2 | 生存 | `etim:chain_silver` ×1 | 银粒×4（2/4/6/8） | 100 | 83 | `Silver Chain ×1` | 链 +1 | 无 tag | ✓ |
| S3 | 生存 | `etim:chain_mithril` ×1 | 秘银粒×4（2/4/6/8） | 100 | 83 | `Mithril Chain ×1` | 链 +1 | 无 tag | ✓ |
| S4 | 生存 | `etim:chain_adamantium` ×1 | 金刚粒×4（2/4/6/8） | 100 | 83 | `Adamantium Chain ×1` | 链 +1 | 无 tag | ✓ |
| S5 | 生存 | `etim:chain_ancient_metal` ×1 | 古金粒×4（2/4/6/8） | 100 | 83 | `Ancient Metal Chain ×1` | 链 +1 | 无 tag | ✓ |
| S6 | 生存 | `etim:nugget_copper` ×4 | 铜链×1（@5） | 25 | 25 | `Copper Nugget ×4` | 粒 +4 | 无 tag | ✓ |
| S7 | 生存 | `etim:nugget_silver` ×4 | 银链×1（@5） | 25 | 25 | `Silver Nugget ×4` | 粒 +4 | 无 tag | ✓ |
| S8 | 生存 | `etim:nugget_mithril` ×4 | 秘银链×1（@5） | 25 | 25 | `Mithril Nugget ×4` | 粒 +4 | 无 tag | ✓ |
| S9 | 生存 | `etim:nugget_adamantium` ×4 | 金刚链×1（@5） | 25 | 25 | `Adamantium Nugget ×4` | 粒 +4 | 无 tag | ✓ |
| S10 | 生存 | `etim:nugget_ancient_metal` ×4 | 古金链×1（@5） | 25 | 25 | `Ancient Metal Nugget ×4` | 粒 +4 | 无 tag | ✓ |
| N0 | 生存 | `etim:chain_copper` ×1 | 铜粒×4（2/4/6/8，旧 N1 同格） | 100 | 83 | `Copper Chain ×1` | 链 +1 | 无 tag | ✓ |
| N1 | 生存 | **无** | 铜粒×4（1/2/4/5＝2×2 团簇） | — | — | **零行** | **0** | — | ✓ |
| C1 | 创造 | `etim:chain_silver` ×1 | 银粒×4（2/4/6/8） | — | — | **零行** | 链 +1 | 无 tag | ✓ |
| C2 | 创造 | `etim:nugget_adamantium` ×4 | 金刚链×1（@5） | — | — | **零行** | 粒 +4 | 无 tag | ✓ |
| F1 | 生存 | `etim:chain_helmet_copper` ×1 | **窗内自合成铜链×5**（1/2/3/4/6） | 125 | 94 | 5×`Copper Chain ×1`＋`Copper Chain Helmet ×1` | 盔 +1（链净 0） | **2** | ✓ |

### 0.2 后备 5（任务书字面「后备 4＝F2-F4＋i-j」实列 5 点，全跑；口径待裁 D-2）

| 点 | 相 | 产物（registry×count） | 料 | d | period | COMPLETE 实测 | 背包 Δ | quality | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F2 | 生存 | `etim:chain_helmet_copper` ×1 | `/give` 铜链×5（1/2/3/4/6） | 125 | 94 | `Copper Chain Helmet ×1` | 盔 +1 | **2** | ✓ |
| F3 | 生存 | `etim:nugget_copper` ×4 | `/give` 铜链×8 → 拆一次（@5） | 25 | 25 | `Copper Nugget ×4` | **链 −1／粒 +4** | 无 tag | ✓ |
| F4 | 生存 | **无** | 锈铁链×4（2/4/6/8） | — | — | **零行** | **0** | — | ✓ |
| i | 生存 | `etim:sinew` ×4 | 皮革×1（@1） | 100 | 83 | `Sinew ×4` | 筋腱 +4 | 无 tag | ✓ |
| j | 创造 | `etim:sword_silver` ×1 | 银锭×2＋棍×1 | — | — | **零行** | 剑 +1 | 无 tag | ✓ |

判格要点（逐条亲验）：

- **S 组 10/10 双向闭合**：粒→链（d=100／period=83，Δ 链 +1）与链→粒（d=25／period=25，Δ 粒 +4）**五金属成对**全通——A-1「五金属链无来源」缺口在合成面**已翻正**（成形与拆链互为回路）。
- **N0＝旧 W-47 N1 同料同格复跑**：四证链 **四路全部翻面**（出 `sig=etim:chain_copper#0×1`／出 COMPLETE／Δ+1／矩阵被消耗）。W-47 历史档不改写（B-4 照录），以本点为取代判据。
- **N1＝形状负证成立**：2×2 团簇（1/2/4/5）**零 `[CraftingLog]` 行**＋`noSigOfProduct`＋`noNewProduct`＋`matrixRetained`（四格铜粒恒在）——证明所落配方是**环形三行**而非 shapeless 四粒（若降 shapeless，2×2 亦必成）。
- **C 组零行**：C1／C2 全段 `[CraftingLog]` **0 行**、背包 Δ 照表（+1／+4）、产物**无 `etim.quality` tag**——`craftingSkipCreative` 首行早退（`crafting/ETIMCrafting.java:128-133`）在链面同样成立，与 W-47 C 组一致。
- **F1＝可达性闭环（A-1 修复的直接兑现）**：窗内**自合成 5 条铜链**（5 次成形各出 `COMPLETE Copper Chain ×1`）→ 5 链摆盔形 → `COMPLETE Copper Chain Helmet ×1`，`etim.quality=2`（AVERAGE ordinal 2）——链甲由「不可达」转「可玩内全链可达」的**唯一正证点**。
- **F2＝证形不证可达**：`/give` 铜链×5 → 盔同样成立，作为 F1 的对照（区别仅在料来源）。
- **F3＝栈语义**：`/give` 8 链（单栈满 8，`ItemChain` maxStack 8）→ 拆一次 ⇒ 链 **8→7**（Δ−1）且粒 **+4**；`sig` 仅一条（`nugget_copper#0×4`）。
- **F4＝排除负证**：锈铁链×4 环摆 **零产物**（零行＋无 sig＋背包无新增＋矩阵余料恒在）——照录面未误加 rusted 列（R196 表七金属无 rusted）。
- **quality 面**：链与粒均非 carrier（`quality/ETIMQuality.java:78-85` 六类白名单）⇒ 18 点产物**无 tag**；仅 F1／F2 的链甲盔（`ItemArmor`）带 `etim.quality=2`。

## §1 逐点锚（`.out` 档内实际行号）

档：`testharness/build-logs/chaincraft-w48.out`＝**564,388 B／4,345 行**（UTF-8，非 ASCII 89 字符全为 `×`／`→`，U+FFFD **0**）。逐点锚原表另存 `chaincraft-w48-anchors.txt`（6,096 B／176 行）；**行号仅作定位，判行按词面 grep 复核**。

| 点 | 起点 marker | sig | period SET | click | start | COMPLETE | gone | 行数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 3969 | 3980 | 3981 | 3982 | 3983 | **3986** | 3987 | 6 |
| S2 | 3988 | 3997 | 3998 | 3999 | 4000 | **4003** | 4004 | 6 |
| S3 | 4005 | 4014 | 4015 | 4016 | 4017 | **4020** | 4021 | 6 |
| S4 | 4022 | 4031 | 4032 | 4033 | 4034 | **4037** | 4038 | 6 |
| S5 | 4039 | 4048 | 4049 | 4050 | 4051 | **4054** | 4055 | 6 |
| S6 | 4056 | 4065 | 4066 | 4067 | 4068 | **4069** | 4070 | 6 |
| S7 | 4071 | 4080 | 4081 | 4082 | 4083 | **4084** | 4085 | 6 |
| S8 | 4086 | 4095 | 4096 | 4097 | 4098 | **4099** | 4100 | 6 |
| S9 | 4102 | 4111 | 4112 | 4113 | 4114 | **4115** | 4116 | 6 |
| S10 | 4117 | 4126 | 4127 | 4128 | 4129 | **4130** | 4131 | 6 |
| N0 | 4132 | 4141 | 4142 | 4143 | 4144 | **4147** | 4148 | 6 |
| N1 | 4149 | — | — | — | — | — | — | **0** |
| C1 | 4160 | — | — | — | — | — | — | **0** |
| C2 | 4171 | — | — | — | — | — | — | **0** |
| F1 | 4180 | 4191,4199,4207,4215,4223,4231,4234 | 4192,4200,4208,4216,4224,4232,4235 | 4193,4201,4209,4217,4225,4236 | 4194,4202,4210,4218,4226,4237 | **4197,4205,4213,4221,4229,4240** | 4198,4206,4214,4222,4230,4233,4241 | 39 |
| F2 | 4242 | 4251,4254 | 4252,4255 | 4257 | 4258 | **4261** | 4253,4262 | 9 |
| F3 | 4263 | 4272 | 4273 | 4274 | 4275 | **4276** | 4277 | 6 |
| F4 | 4278 | — | — | — | — | — | — | **0** |
| i | 4289 | 4298 | 4299 | 4300 | 4301 | **4304** | 4305 | 6 |
| j | 4306 | — | — | — | — | — | — | **0** |

### 1.1 判行原句（代表点逐字）

S1（成形，d=100／period=83 全形；`3959-3987` 段）：

```
3969: ### [harness] > say [S1] etim:chain_copper
3970: ### [harness] > clear ETIM_W48
3972: [00:57:49] [Server thread/INFO] [minecraft/DedicatedServer]: Could not clear the inventory of ETIM_W48, no items to remove
3979: [00:57:51] [Server thread/INFO] [minecraft/DedicatedServer]: Given [Copper Nugget] * 4 to ETIM_W48
3980: [00:57:54] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W48 (766) result CHANGED sig=etim:chain_copper#0×1 prev=none → recompute difficulty/period [server]
3981: [00:57:54] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W48 (766) period SET difficulty=100.0 quality=AVERAGE period=83 [server]
3982: [00:57:55] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W48 (766) result click btn=0 [server]
3983: [00:57:55] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W48 (766) start crafting difficulty=100.0 quality=AVERAGE period=83 [server]
3986: [00:57:59] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W48 (766) COMPLETE Copper Chain ×1 quality=AVERAGE xp=0 continue [server]
3987: [00:58:00] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W48 (766) result gone → reset [server]
```

S6（拆链，d=25／period=25；`4064-4070` 段）：

```
4064: [00:58:56] [Server thread/INFO] [minecraft/DedicatedServer]: Given [Copper Chain] * 1 to ETIM_W48
4065: [00:58:58] … result CHANGED sig=etim:nugget_copper#0×4 prev=none → recompute difficulty/period [server]
4066: [00:58:58] … period SET difficulty=25.0 quality=AVERAGE period=25 [server]
4067: [00:58:59] … result click btn=0 [server]
4068: [00:58:59] … start crafting difficulty=25.0 quality=AVERAGE period=25 [server]
4069: [00:59:00] … COMPLETE Copper Nugget ×4 quality=AVERAGE xp=0 continue [server]
4070: [00:59:00] … result gone → reset [server]
```

F1（复合点尾段：拆链中间态 → 盔；`4230-4241` 段）：

```
4231: [01:01:02] … result CHANGED sig=etim:nugget_copper#0×4 prev=none → recompute difficulty/period [server]
4232: [01:01:02] … period SET difficulty=25.0 quality=AVERAGE period=25 [server]     ← 放首条链即命中 1×1 拆链形（C-1）
4233: [01:01:02] … result gone → reset [server]
4234: [01:01:03] … result CHANGED sig=etim:chain_helmet_copper#0×1 prev=empty → recompute difficulty/period [server]
4235: [01:01:03] … period SET difficulty=125.0 quality=AVERAGE period=94 [server]
4236: [01:01:04] … result click btn=0 [server]
4237: [01:01:04] … start crafting difficulty=125.0 quality=AVERAGE period=94 [server]
4240: [01:01:09] … COMPLETE Copper Chain Helmet ×1 quality=AVERAGE xp=0 continue [server]
4241: [01:01:09] … result gone → reset [server]
```

N1（负证段全 0 行；`4149-4160` 段）：

```
4149: ### [harness] > say [N1] (negative)
4152: [00:59:54] [Server thread/INFO] [minecraft/DedicatedServer]: Cleared the inventory of ETIM_W48, removing 1 items
4157: [00:59:55] [Server thread/INFO] [minecraft/DedicatedServer]: Given [Copper Nugget] * 4 to ETIM_W48
4160: ### [harness] > say [C1] etim:chain_silver
（其前 ~7.5 s 内 `[CraftingLog]` 零行；矩阵 1/2/4/5 四格铜粒恒在）
```

### 1.2 中间产物链（仅 F1／F2 两点，合法）

| 点 | sig 链（放料序） | 说明 |
| --- | --- | --- |
| F1 | `chain_copper#0×1` ×5 → `nugget_copper#0×4` → `chain_helmet_copper#0×1` | 前 5 条是 5 次成形的产物身份；放**首条链**时 1×1 拆链形先命中（`nugget×4`），凑满盔形后转为盔 |
| F2 | `nugget_copper#0×4` → `chain_helmet_copper#0×1` | 同上，`/give` 料源版本（9 行＝6 行族＋拆链中间态 3 行） |

⇒ 其余 18 点皆**单扫无中间产物形**（4 粒环与 1 链均无更短前缀），行数恰 6（判据正本 §5.1 的「6±1」预测在本批成立）。

## §2 计数总账

### 2.1 分组总账

| 组 | 点数 | `COMPLETE` | 背包增量 | `[CraftingLog]` 行 | 判 |
| --- | --- | --- | --- | --- | --- |
| S（成形 5＋拆链 5） | 10 | **10**（S6–S10 count=4） | 10（链×5、粒×4×5） | 每点 6 | ✓ |
| N（翻正 N0＋形状负证 N1） | 2 | **1**（仅 N0） | N0 +1／N1 0 | N0 6／N1 **0** | ✓ |
| C（创造） | 2 | **0** | 2（+1／+4） | **0** | ✓ |
| F（F1–F4／i／j） | 6 | **9**（F1 六条＋F2／F3／i 各一） | 5 点 ≥1；F4 0 | F1 39／F2 9／F3 6／F4 0／i 6／j 0 | ✓ |

### 2.2 全窗 `[CraftingLog]` 分形计数（档内直数，与驱动侧逐点计数 **零不一致**）

| 面 | 全窗 | 说明 |
| --- | --- | --- |
| `[CraftingLog]` 合计 | **126** | 逐点档内计数与驱动 `srv.all` 计数 **20/20 全等（mismatch 0）** |
| `COMPLETE ` | **20** | S 10＋N0 1＋F1 6＋F2 1＋F3 1＋i 1 |
| `result CHANGED sig=` | **22** | 18 点各 1＋F2 2＋F1 7 |
| `period SET ` | **22** | 与 sig 一一对应 |
| `result click btn=` | **20** | 20 次 arm（F1 六次） |
| `start crafting ` | **20** | arm 后即 start |
| `result gone → reset` | **22** | 身份消失即复位 |
| `damage penalty` | **0** | 工序白板＋每点 `/clear` ⇒ 无受伤减 tick |
| `damaged ingredient → crafting cleared` | **0** | 第 10 形行＝0（负证；配料粒／链不可损，结构上不可能触发） |
| `CLIENT result click` | **0** | 零客户端正面证据（C-9） |
| Mixin 失败三型 | **0** | — |

### 2.3 工序面（每点内嵌，实测计数）

| 面 | 全窗实测 | 锚 |
| --- | --- | --- |
| `/clear <bot>` | **21** 条 `Cleared … removing N items` ＋ **1** 条 `Could not clear … no items to remove`（空背包短路）＝22＝20 判点＋标定首尾 2 | 档内词面直数 |
| `/etest food 6 6` | **36** 条 `[EtimTest] commands.etest.food_set_pool player=ETIM_W48 params=[6, 6, 6]`（每点 ≥1＋计时等待期续喂） | 同上 |
| `/xp -1000000L` | 每点 1 次；**`bot.experience.level == 0` 20/20 点成立** | 驱动 checks `xpLevelZero` 全 true（C-4：该命令无 stdout 回执） |
| `/gamemode` | **5** 条：setup 1（`@3637`）＋S1 首点补 1（`@3974`）＋C1→创造（`@4165`）＋F1→生存（`@4185`）＋j→创造（`@4311`）；单 bot，无重连 | 档内 `Set ETIM_W48's game mode to …` |
| `give` | **38** 条（标定期 17 ＋ 判点 21） | `Given [<显名>] * <n> to ETIM_W48` |

## §3 起收钉值（全同 ⇒ 零 rebuild／零产品码／零 cfg 编辑）

| 项 | 起窗（任务书钉，判窗前亲算复讫） | 收窗实测 | 判 |
| --- | --- | --- | --- |
| HEAD | `4225b7b` | `4225b7b`（窗内零提交；`git status --porcelain` 仅本窗两件新增） | ✓ |
| release jar | 775,340 B｜`D7FC269C87F71CC863A373911E3967FA27E5935990C578C7C7245FED825D38DB` | 同值 | ✓ |
| dev jar | 759,535 B｜`D3E4245400D2F0D1E507613BE85EC1179C4995CCA42060CB84653B94C1286BD8` | 同值 | ✓ |
| sources jar | 703,642 B｜`661774C614A16D8B05187CC3590393D6A74131B9059FB7C2A8331C3617458B22` | 同值（`.m2/repository/io/github/etim/etim/1.0.0/` 三件字节数同位：775,340／759,535／703,642） | ✓ |
| 服务端 cfg | 32,095 B｜`E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5` | boot 后同值；收窗同值（byte-identical） | ✓ 零编辑 |
| 客户端 cfg | 30,277 B｜`E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45` | 同值（全窗零触碰） | ✓ |
| server.properties | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 同值（`level-name`／`spawn-protection` 已回填） | ✓ |
| ops／usercache／usernamecache | — | 三件 byte-identical（`685`／`1,630`／`851` B，起窗快照回填；`op` 写入被回滚） | ✓ |
| MK 双树 | mixins **56**／client **10**；refmap **62 类键／138 条目**；切片 **Sword 4／Tool 4／Shears 3（总 11）** | 双树同值（`139/57/12` 未现，序漂未现） | ✓ |
| `run/obfuscated/options.txt` | — | 未读写（4,467 B，mtime `2026-10-31T09:44:52Z`＝CST `17:44:52`，早于本窗 CST `00:57`） | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` | 18 | 18（无新增）；`hs_err_pid*.log`／`replay_pid*.log` 0 件 | ✓ |
| 世界目录 | — | `run/chaincraftw48` 已删（`worldRemoved=true`） | ✓ |
| Gradle | — | `:compileJava`／`:classes`／`:jar` 三行全 **UP-TO-DATE**；`BUILD SUCCESSFUL in 4m 45s`；`stop` → `exitCode 0` | ✓ 0 rebuild |

**boot 三面（单 boot 正本）**

| 面 | 值 | 锚 |
| --- | --- | --- |
| mod 清单 | `Finished gathering 15 mods, took 1358 ms` | `:127` |
| 世界 | `Preparing level "chaincraftw48"` | `:512` |
| 就绪 | `Done (5.509s)! For help, type "help" or "?"` | `:2255` |
| Gradle tasks | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE` | `:31`／`:33`／`:35` |
| 收窗 | `BUILD SUCCESSFUL in 4m 45s` | `:4342` |

**守门行（A 级判据，runtime 实数，Ku-1 逐字稿）**

```
339: [00:57:33] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] gear recipes registered: 29 batch rows ok (runtime REGISTRY delta; etim-domain total 154 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]
```

⇒ `batchRows = 29`、`total = 154`，与 Ku-1 定稿**逐位相符**；落码后 `19→29` 的 fail-fast 亦未触发（boot 无 `IllegalStateException`）。邻行 `:338` `metal anvil batch registered: 6 anvil blocks, 5 storage blocks, 6 anvil recipes, 10 storage-recipes` 未受影响。

**两抓行锚（period 数值不判值，只作时序前提）**

```
3981: [00:57:54] … period SET difficulty=100.0 quality=AVERAGE period=83 [server]   ← 成形 4 粒 ＝ 4×25（generic）
4066: [00:58:58] … period SET difficulty=25.0 quality=AVERAGE period=25 [server]    ← 拆链 1 格 ＝ 1×25，floor 25 生效
```

**前提五亲锤（零 cfg 编辑的前提）**

| 键 | 值 | 位置 |
| --- | --- | --- |
| `craftingGenericDifficulty` | `25.0` | cfg `:110`（`S:` 型，驱动 `cfgValue` 已覆盖 `[A-Z]:` 前缀） |
| `craftingBenchModifier` | `0.2` | cfg `:89` |
| `craftingPeriodFloor` | `25` | cfg `:113` |
| `craftingSpeedPerLevel` | `0.02` | cfg `:125` |
| `craftingDebugLog`／`craftingTimer`／`craftingSkipCreative` | `true`／`true`／`true` | cfg `:104`／`:131`／`:122` |

## §4 冲突分级（A / B / C）

**A 级 0 条｜B 级 0 条**（20/20 判格 ✓；零产品码改动、零 rebuild、零 cfg 编辑、零客户端动作）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **1×1 拆链形在链甲摆料过程中会先命中**：F1／F2 放**首条链**时 `sig=etim:nugget_copper#0×4` 先出（`1×1 "X"` 全偏移扫描，`net/minecraft/item/crafting/ShapedRecipes.java:90-109`），凑满 5 链形后转 `chain_helmet_copper`。这是 R196／1.12 同一语义的**实测侧证**（Ku-3「1×1 shaped≡shapeless 等价面」），非异常。 | 登记；判据以「sig 链**末条**＝目标产物」判定（驱动 `sigTarget`），F2 行数 9／F1 行数 39 均落在行族 5–14（F1 复合段 25–80）内。 |
| C-2 | C | **工装面：1.12 关窗不回传 `window_items`，`bot.inventory` 读不到关窗回填的矩阵余料**（mineflayer `lib/plugins/inventory.js:428-432` 自述 pre-1.17 缺口）。首版驱动在 F4 上读到 `afterClose = {}`（4 锈铁链「消失」），判 `noNewProduct=false` 假 FAIL。 | 已改为**二次开台强制整包同步**（`invCountsWin(window)`，读 `inventoryStart..inventoryEnd`）后转绿；F4／N1 的「背包无新增」由此才真正可判。登记为工装手法面（W-47 N1 在同点上是盲区：当时 `invDelta` 对无产物点恒真）。 |
| C-3 | C | **`srv.all` 与 `.out` 档内行号不一一对应**：`server-console.js` 的 `send()` 把 `### [harness] > …` 回显直接写流、不入 `all`（本窗 **258** 条），故驱动内行号比档内行号小。 | 回执行号一律**按档内词面重定位**（重定位脚本逐点 `mismatch 0`）；工装面登记，勿跨档套用驱动日志行号。同 W-47 C-6。 |
| C-4 | C | **`/xp -1000000L` 无 stdout 回执**（1.12 `CommandXP` 的 success 消息只走 `ICommandSender.sendMessage`，控制台 stdin 发送者不落 stdout）；档内 `commands.xp.success*` 命中 **0**。 | 判 level=0 以 bot 侧 `bot.experience.level === 0` 为准（**20/20 点成立**），与 W-47 口径一致。 |
| C-5 | C | **零客户端面（C-9）**：`javaw` 进程 0；带窗 `java`/`javaw` 0；`options.txt` 未读写（mtime 早于本窗）；全窗 `[CraftingLog] CLIENT result click` **0 行**。 | 正面事实登记；本窗未触发「客户端例外口」握手（也不需要客户端）。 |
| C-6 | C | **任务书 F4 字面「喂环形 4 锈铁粒」与摸底 §5.3「锈铁链×4 环摆」不一致**：ETIM 无 `nugget_rusted_iron` item（`ETIMItems.java:41-51` 五金属粒白名单无 rusted），`/give etim:nugget_rusted_iron` 结构性不可给。 | 本窗按**摸底正本**执行（锈铁链×4 @2/4/6/8），零产物成立；字面口径待主会话裁定（D-1）。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | **F4 料源字面**：任务书「4 锈铁粒」vs 摸底「锈铁链×4」 | (a) 认摸底（锈铁链×4，本窗实测口径）／(b) 认任务书并补 rusted 粒 item（出批到 item 面） | **(a)**：无 rusty 粒 item，任务书应为笔误；判值（零产物）不因料换而变（两者都无对应配方） |
| D-2 | **后备点计数口径**：任务书「后备 4＝F2-F4＋i-j」实列 5 点 | (a) 认 5 点（F2/F3/F4/i/j，本窗全跑）／(b) 认 4 点（i-j 视为 1 组或裁掉 j） | **(a)**：本窗 5 点全 ✓，裁掉任一点等于丢一条旁证；正本「4」建议回写为 5 |
| D-3 | **F1 复合点的 COMPLETE 计数口径**（正本只写「窗内自合成 5 条铜链→盔」，未定条数） | (a) 认 6 条（5 成形＋1 盔，本窗口径）／(b) 只认末条盔，前 5 条降为「过程行」不计判据 | **(a)**：5 条成形 COMPLETE 正是「窗内自合成」的直接证据，弃之则 F1 与 F2 无区别（F2 只证形） |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 boot（唯一） | CST 00:57:25 起 → 00:57:39 `Done (5.509s)` `:2255` → 20 点 → 01:02:11 收窗；`BUILD SUCCESSFUL in 4m 45s` `:4342`；`stop` `exitCode 0` |
| 客户端 | **零会话**（未拉起、未关窗；`options.txt` 未读写） |
| 端口 | 25565 LISTEN＝0（起 0／收 0） |
| 崩溃 | `run/crash-reports` 18 → 18（无新增） |
| cfg／props／三 side 文件 | 服务端 cfg 起收 byte-identical（`craftingTimer/​SkipCreative/​DebugLog` 三键 true 保持）；客户端 cfg／props／ops／usercache／usernamecache 全 byte-identical |
| 世界 | `chaincraftw48` 已删（`worldRemoved=true`） |
| rebuild | **0**（三任务全 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅 `?? testharness/player/chaincraft-w48.js`＋本回执；HEAD `4225b7b` 未动） |
| 时钟口径 | 驱动时间戳为 UTC，服务端日志为 CST（+8 h）；本回执行号锚只认档内行号与行首时刻 |

## §7 工装与复跑

### 7.1 驱动

`testharness/player/chaincraft-w48.js`（53,888 B／1,167 行）＝`gearcraft-w47.js` 的骨（PIN／MK／`srv.send`／相位收口／evidence JSON／标定并集／四原语 `openTable`／`putOne`／`clickResult`／`countCompletes`）＋ 本批点表内嵌 ＋ `GATE {29,154}`。

- 环境变量：`W48_MODE=s|n|c|f|all`（默认 all，序打 **s→n→c→f**）｜`W48_ONLY=S1,N1,C1`（判点裁剪）｜`W48_STAGE=<tag>`（`.out` 名隔离）。
- 每点工序：`say [id]` → `/clear` → `/gamemode`（按相）→ `/etest food 6 6` → `/xp -1000000L` → `/give` 料 → 开台 → 逐料落格 → 点结果槽（`mode=0`）→ 等 COMPLETE（预算 `period×50 ms + 20 s`；负证点定 3.5 s；等待期每 2.5 s 续喂）→ 关台 → **二次开台复读背包** → 关台。
- 判据原语：`sigTarget`（sig 链**末条**＝目标 registry×count）／`periodTarget`（difficulty 严格等＋period 容差 ±1，差另记 `periodDrift`）／`clickCount`／`startCount`／`completeCount`／`completeShape`（按 `expectCompletes` 逐档：显名×count×quality=AVERAGE×xp=0×continue）／`rowFamily`（普通 5–14／复合 25–80）／`goneAfterComplete`／`invSpec`（逐物品 Δ 比对）／`qualityTag`+`qualityOrdinal`（carrier＝2）／`qualityTagAbsent`／负证的 `zeroRows`+`noSigOfProduct`+`noNewProduct`+`matrixRetained`／复合点的 `compoundOk`+`compoundChains`。
- 摆格表（3×3 工作台，slot 1–9 row-major）：**成形** 粒 @ `2/4/6/8`（R196 `" X ","X X"," X "`）；**拆链** 链 @ `5`（`"?"` 1×1）；**链甲盔** 链 @ `1/2/3/4/6`（`"XXX","X X"`）；**2×2 负证** 粒 @ `1/2/4/5`；**锈铁环负证** 锈铁链 @ `2/4/6/8`；**筋腱** 皮革 @ `1`；**银剑** 锭 @ `1/4` ＋ 棍 @ `7`。

### 7.2 标定表（17 项，`fails=0`；身份源①）

| registry | id | registry | id | registry | id |
| --- | --- | --- | --- | --- | --- |
| `etim:nugget_copper` | 4096 | `etim:nugget_silver` | 4097 | `etim:nugget_mithril` | 4098 |
| `etim:nugget_adamantium` | 4099 | `etim:nugget_ancient_metal` | 4100 | `etim:ingot_silver` | 4102 |
| `etim:sinew` | 4106 | `etim:chain_copper` | 4132 | `etim:chain_silver` | 4133 |
| `etim:chain_mithril` | 4134 | `etim:chain_adamantium` | 4135 | `etim:chain_ancient_metal` | 4136 |
| `etim:chain_rusted_iron` | 4137 | `etim:chain_helmet_copper` | 4149 | `etim:sword_silver` | 4162 |
| `minecraft:stick` | 280 | `minecraft:leather` | 334 | — | — |

⇒ 链五件 id 与 W-47 verdict §7.2 的 `etim:chain_copper=4132`／`chain_rusted_iron=4137`／`chain_helmet_copper=4149` **逐位一致**（本批零新增 item，交叉核对成立）。

### 7.3 判行复核（可直接粘贴）

```powershell
# 守门行（runtime 29/154）
Select-String -Path testharness\build-logs\chaincraft-w48.out -Pattern 'gear recipes registered'
# 判行全族
Select-String -Path testharness\build-logs\chaincraft-w48.out -Pattern '\[CraftingLog\]'
# COMPLETE 20 条
Select-String -Path testharness\build-logs\chaincraft-w48.out -Pattern 'COMPLETE '
# 负证三面（应全 0）
Select-String -Path testharness\build-logs\chaincraft-w48.out -Pattern 'damaged ingredient|damage penalty|CLIENT result click'
# 成形／拆链身份（各 5 次）
Select-String -Path testharness\build-logs\chaincraft-w48.out -Pattern 'sig=etim:chain_'
Select-String -Path testharness\build-logs\chaincraft-w48.out -Pattern 'sig=etim:nugget_.*×4'
```

### 7.4 复跑

```powershell
cd "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
# 全窗（单 boot，S→N→C→F，收窗自动回填）
$env:W48_MODE='all'; node testharness\player\chaincraft-w48.js chaincraft-w48
# 冒烟（成形＋拆链＋创造＋负证＋复合／栈语义六点）
$env:W48_MODE='all'; $env:W48_ONLY='S1,S6,C1,N1,F1,F3'; node testharness\player\chaincraft-w48.js chaincraft-w48-smoke
```

### 7.5 证据卷（`testharness/build-logs/`）

`chaincraft-w48.out`（564,388 B／4,345 行，判行正本）｜`-server-latest.log`（565,296 B）｜`-driver.log`（162,462 B）｜`-evidence-all.json`（185,269 B，逐点 checks／rows／matrix／stackDump／anchorsFile／pins／invObserved）｜`-anchors.txt`（6,096 B／176 行）｜cfg 双件＋props＋ops／usercache／usernamecache 六份 before 快照｜`-smoke1/`／`-smoke2/`／`-smoke3/`（三次冒烟：点表／复合点／背包同步修正，工装演进旁证）。

## §8 未覆盖面（不补白）

1. **gold／iron 链**（R196 表有、ETIM 无 item）＝C-2 出批面，本窗无点可判。
2. **锈铁链成形**：结构性不存在（R196 无 rusted 列），本窗只做**负证**（F4），未也无需正证。
3. **周期数值口径**（ETIM generic 25.0 vs R196 逐金属 177.78／711.11／2844.44／11377.78，period 110／224／552／1537）＝B-1 难度漂移，属合成计时批域；本窗只按现行公式给期望值作时序前提。
4. **多档 quality（右击 cycle）／受损料门正证／`stat.craftItem` 统计面**：本窗每点单次左击 arm、单档 AVERAGE（level 0 ⇒ `getMinOrdinal==getMaxOrdinal==2`），未取点。
5. **cookbook／配方书面**：客户端面「由用户操作」（C-9），不作判值。
6. **A-1 的完整闭包**：本批只证「链可合成＋链甲可合成」；矿→锭→粒上游与地牢箱 ancient 料源沿用既有批（未在本窗重测），锈铁链仍只矿井箱。

## §9 自报（机械核讫）

> 文件：`testharness/reports/chaincraft-W48-verdict.md`｜**31,192 B**｜343 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`ED76D02B5D057D9271D3B18B19A3991D0839D12886283B1D22E6214FC021E8CF`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`AAE738505C79D14190C33339659FCDA2E99A340EC85146BB1F682C6E541131CA`
> 判格 20（主点 15：S1–S10／N0／N1／C1／C2／F1；后备 5：F2／F3／F4／i／j）全 ✓｜`COMPLETE` 全窗 20｜C 组与负证点 `[CraftingLog]` 零行｜`damaged ingredient` 0／`damage penalty` 0／`CLIENT click` 0｜守门 runtime **29/154**｜冲突 A0 B0 C6｜待裁 D-3｜jar 三件 byte-identical／零 rebuild／零产品码／零 cfg 编辑／零客户端
> 规格行里的叉号计数含该行自身字形与本节注记，正文无失实判格的叉号（20 判格全对号）。
