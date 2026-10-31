# gearcraft 批（metal gear 配方可达性）· W-47 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：单 boot（S 生存 → C 创造 → N 负证 → i–n 后备）＋ 0 客户端
> **报告字节规格**：`31,567 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 54 / ✗ 1｜349 行`
> **判据正本**：`playground/audit/gearcraft-立项摸底.md` §5.2（26 主点表）／§5.3（i–n 后备）；`playground/audit/gearcraft-终审回执.md` T-W（d/period 代数亲数）＋ Ku-6（判读细则）。
> **判据通道（纯服务端，单族 6 形）**：
> - 守门行：`[TestLog] gear recipes registered: 19 batch rows ok (runtime REGISTRY delta; etim-domain total 144 …)`——**runtime 实数判 144**（≠144 ＝ A 级停窗）。
> - 判行族：`result CHANGED sig=<reg>#<meta>×<n>`／`period SET difficulty=… period=…`／`result click btn=0`／`start crafting difficulty=… period=…`／`COMPLETE <显名> ×<n> quality=… xp=…`／`result gone → reset`（全 `[CraftingLog] … [server]` 尾标）。
> - 身份四源互锁：① `/give` 标定数字 id（42 项全表见 §7）② sig 行 registry 名 ③ COMPLETE 显名×count ④ 背包 type/count/`etim.quality`。
> **判决**：**PASS**——32 点（S1–S20／C1–C5／N1／i–n）**全 ✓**；`COMPLETE` 全窗 **23 条**＝S 组 20＋i／m／n；C 组与 N1 **零 `[CraftingLog]` 行**；`damaged ingredient → crafting cleared` **0**、`damage penalty` **0**、`CLIENT result click` **0**；守门行 runtime 实数 **144**；起收钉值全同（零 rebuild、零产品码、零 cfg 编辑）、props／ops／usercache／usernamecache byte-identical、crash 18 顺延、world 已删、零客户端。

## §0 判定总表（32 点逐格）

判据＝「COMPLETE 显名×count × quality=AVERAGE × xp=0 × continue」＋「背包 Δ＝产出数」＋「sig 链末条＝目标产物 registry」＋「d／period 对齐」（S 组）；C 组＝「零行＋Δ=1＋无 quality tag」；N1＝「四证链」。

| 点 | 相 | 产品（registry） | 料（×数） | d | period | COMPLETE 实测 | 背包 Δ | quality | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 生存 | `etim:pickaxe_copper` | 铜锭×3＋棍×2 | 125 | 94 | `Copper Pickaxe ×1` | +1 | 2 | ✓ |
| S2 | 生存 | `etim:shovel_copper` | 铜锭×1＋棍×2 | 75 | 62 | `Copper Shovel ×1` | +1 | 2 | ✓ |
| S3 | 生存 | `etim:axe_copper` | 铜锭×3＋棍×2 | 125 | 94 | `Copper Axe ×1` | +1 | 2 | ✓ |
| S4 | 生存 | `etim:hoe_copper` | 铜锭×2＋棍×2 | 100 | 83 | `Copper Hoe ×1` | +1 | 2 | ✓ |
| S5 | 生存 | `etim:mattock_copper` | 铜锭×4＋棍×2 | 150 | 102 | `Copper Mattock ×1` | +1 | 2 | ✓ |
| S6 | 生存 | `etim:battle_axe_copper` | 铜锭×4＋棍×2 | 150 | 102 | `Copper Battle Axe ×1` | +1 | 2 | ✓ |
| S7 | 生存 | `etim:war_hammer_copper` | 铜锭×5＋棍×2 | 175 | **109**（表 110） | `Copper War Hammer ×1` | +1 | 2 | ✓（C-1） |
| S8 | 生存 | `etim:hatchet_copper` | 铜锭×1＋棍×2 | 75 | 62 | `Copper Hatchet ×1` | +1 | 2 | ✓ |
| S9 | 生存 | `etim:sword_copper` | 铜锭×2＋棍×1 | 75 | 62 | `Copper Sword ×1` | +1 | 2 | ✓ |
| S10 | 生存 | `etim:dagger_copper` | 铜锭×1＋棍×1 | 50 | 41 | `Copper Dagger ×1` | +1 | 2 | ✓ |
| S11 | 生存 | `etim:helmet_copper` | 铜锭×5 | 125 | 94 | `Copper Helmet ×1` | +1 | 2 | ✓ |
| S12 | 生存 | `etim:chestplate_copper` | 铜锭×8 | 200 | 116 | `Copper Chestplate ×1` | +1 | 2 | ✓ |
| S13 | 生存 | `etim:leggings_copper` | 铜锭×7 | 175 | **109**（表 110） | `Copper Leggings ×1` | +1 | 2 | ✓（C-1） |
| S14 | 生存 | `etim:boots_copper` | 铜锭×4 | 100 | 83 | `Copper Boots ×1` | +1 | 2 | ✓ |
| S15 | 生存 | `etim:scythe_copper` | 铜锭×2（2／6 格）＋棍×3 | 125 | 94 | `Copper Scythe ×1` | +1 | 2 | ✓ |
| S16 | 生存 | `etim:chain_helmet_rusted_iron` | 锈铁链×5 | 125 | 94 | `Rusted Iron Chain Helmet ×1` | +1 | 2 | ✓ |
| S17 | 生存 | `etim:arrow_copper` | 铜粒×1＋棍×1＋羽×1 | 75 | 62 | `Copper Arrow ×1` | +1 | 无 tag | ✓ |
| S18 | 生存 | `minecraft:iron_nugget`（×9） | 铁锭×1 | 800 | 240 | `Iron Nugget ×9` | **+9** | 无 tag | ✓ |
| S19 | 生存 | `minecraft:iron_ingot`（×1） | 铁粒×9 | 225 | 123 | `Iron Ingot ×1` | +1 | 无 tag | ✓ |
| S20 | 生存 | `etim:knife_flint` | 燧石×1＋棍×1＋筋腱×1 | 75 | 62 | `Flint Knife ×1` | +1 | 2 | ✓ |
| C1 | 创造 | `etim:pickaxe_silver` | 银锭×3＋棍×2 | — | — | **零行** | +1 | 无 tag | ✓ |
| C2 | 创造 | `etim:sword_mithril` | 秘银锭×2＋棍×1 | — | — | 零行 | +1 | 无 tag | ✓ |
| C3 | 创造 | `etim:chestplate_adamantium` | 金刚锭×8 | — | — | 零行 | +1 | 无 tag | ✓ |
| C4 | 创造 | `etim:hoe_ancient_metal` | 古金锭×2＋棍×2 | — | — | 零行 | +1 | 无 tag | ✓ |
| C5 | 创造 | `etim:nugget_copper` | 铜箭×1（拆解） | — | — | 零行 | +1 | 无 tag | ✓ |
| N1 | 生存 | **无** | 铜粒×4（环 2/4/6/8） | — | — | 零行／无 sig=chain_copper | **0** | — | ✓ |
| i | 生存 | `etim:sinew`（×4） | 皮革×1 | 100 | 83 | `Sinew ×4` | **+4** | 无 tag | ✓ |
| j | 创造 | `etim:sword_silver` | 银锭×2＋棍×1 | — | — | 零行 | +1 | 无 tag | ✓ |
| k | 创造 | `etim:pickaxe_ancient_metal` | 古金锭×3＋棍×2 | — | — | 零行 | +1 | 无 tag | ✓ |
| l | 创造 | `etim:helmet_adamantium` | 金刚锭×5 | — | — | 零行 | +1 | 无 tag | ✓ |
| m | 生存 | `etim:chain_helmet_copper` | 铜链×5（/give） | 125 | 94 | `Copper Chain Helmet ×1` | +1 | 2 | ✓ |
| n | 生存 | `etim:storage_copper` | 铜锭×9 | 225 | 123 | `Copper Block ×1` | +1 | 无 tag | ✓ |

- **S 组 20/20 可达**：每个 S 点都由「`/give` 来的料」→「手摆格」→「timer 计时」→「服务端自授产物」全链闭合；产物身份四源同指（idMap／sig registry／COMPLETE 显名／背包 type+count+`etim.quality=2`）。
- **quality 面（B-2／B-5 正面证据）**：carrier（ItemTool／ItemSword／ItemHoe／ItemArmor）组 14 点背包 `etim.quality=2`（AVERAGE ordinal 2）；non-carrier（箭／链／筋腱／锭／粒／储块）8 点**无 tag**；创造相 8 点（C1–C5／j／k／l）**全无 tag**——即 B-5「创造相无 quality 侧车」在本窗取到正面证据。
- **N1 四证链**：① 无 `result CHANGED sig=etim:chain_copper` ② 无 `COMPLETE` ③ 背包 Δ=0 ④ 全段 `[CraftingLog]` **0 行**；且矩阵余料恒在（`matrixRetained=true`，2/4/6/8 四格仍为 `etim:nugget_copper`）。
- **m 点定性**：`/give etim:chain_copper 5` → `COMPLETE Copper Chain Helmet ×1`＝**证形不证可达**（五金属链仍无合成/掉落来源，A-1 缺口不动）。

## §1 逐点锚（`.out` 档内实际行号）

档：`testharness/build-logs/gearcraft-w47.out`＝**587,124 B／4,595 行**（UTF-8，非 ASCII 155 字符全为 `×`／`→`，U+FFFD 0）。逐点锚原表另存 `gearcraft-w47-anchors.txt`（7,696 B／268 行）；行号仅作定位，**判行按词面 grep 复核**。

| 点 | 起点 marker | sig | period SET | click | start | COMPLETE | gone | 行数 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | 3971 | 3984,3987 | 3985,3988 | 3989 | 3990 | **3993** | 3986,3994 | 9 |
| S2 | 3995 | 4006,4008,4010 | 4007,4009,4011 | 4012 | 4013 | **4016** | 4017 | 10 |
| S3 | 4018 | 4029,4032 | 4030,4033 | 4034 | 4035 | **4038** | 4031,4039 | 9 |
| S4 | 4040 | 4051,4054 | 4052,4055 | 4056 | 4057 | **4060** | 4053,4061 | 9 |
| S5 | 4062 | 4073,4076 | 4074,4077 | 4078 | 4079 | **4082** | 4075,4083 | 9 |
| S6 | 4084 | 4095,4098,4101 | 4096,4099,4102 | 4103 | 4104 | **4107** | 4097,4100,4108 | 12 |
| S7 | 4109 | 4120,4123,4126 | 4121,4124,4127 | 4128 | 4129 | **4132** | 4122,4125,4133 | 12 |
| S8 | 4137 | 4148,4151 | 4149,4152 | 4153 | 4154 | **4157** | 4150,4158 | 9 |
| S9 | 4159 | 4170,4173 | 4171,4174 | 4175 | 4176 | **4179** | 4172,4180 | 9 |
| S10 | 4181 | 4192,4194 | 4193,4195 | 4196 | 4197 | **4198** | 4199 | 8 |
| S11 | 4200 | 4209,4212 | 4210,4213 | 4214 | 4215 | **4218** | 4211,4219 | 9 |
| S12 | 4220 | 4229,4232 | 4230,4233 | 4234 | 4235 | **4240** | 4231,4241 | 9 |
| S13 | 4242 | 4251,4254,4257 | 4252,4255,4258 | 4259 | 4260 | **4263** | 4253,4256,4264 | 12 |
| S14 | 4267 | 4276,4279 | 4277,4280 | 4281 | 4282 | **4285** | 4278,4286 | 9 |
| S15 | 4287 | 4298,4301 | 4299,4302 | 4303 | 4304 | **4307** | 4300,4308 | 9 |
| S16 | 4309 | 4318 | 4319 | 4320 | 4321 | **4325** | 4326 | 6 |
| S17 | 4327 | 4340 | 4341 | 4342 | 4343 | **4346** | 4347 | 6 |
| S18 | 4348 | 4357 | 4358 | 4359 | 4360 | **4369** | 4370 | 6 |
| S19 | 4371 | 4380 | 4381 | 4382 | 4383 | **4388** | 4389 | 6 |
| S20 | 4390 | 4403 | 4404 | 4405 | 4406 | **4409** | 4410 | 6 |
| C1 | 4411 | — | — | — | — | — | — | **0** |
| C2 | 4424 | — | — | — | — | — | — | **0** |
| C3 | 4435 | — | — | — | — | — | — | **0** |
| C4 | 4444 | — | — | — | — | — | — | **0** |
| C5 | 4455 | — | — | — | — | — | — | **0** |
| N1 | 4464 | — | — | — | — | — | — | **0** |
| i | 4477 | 4486 | 4487 | 4488 | 4489 | **4492** | 4493 | 6 |
| j | 4494 | — | — | — | — | — | — | **0** |
| k | 4507 | — | — | — | — | — | — | **0** |
| l | 4518 | — | — | — | — | — | — | **0** |
| m | 4527 | 4538 | 4539 | 4540 | 4541 | **4544** | 4545 | 6 |
| n | 4546 | 4555,4558 | 4556,4559 | 4560 | 4561 | **4567** | 4557,4568 | 9 |

### 1.1 判行原句（代表点逐字）

S1（铜镐，on 相计时全形）：

```
3987: [23:30:04] [Server thread/INFO] [Easy Times In Minecraft]: [CraftingLog] ETIM_W47 (764) result CHANGED sig=etim:pickaxe_copper#0×1 prev=empty → recompute difficulty/period [server]
3988: [23:30:04] … period SET difficulty=125.0 quality=AVERAGE period=94 [server]
3989: [23:30:05] … result click btn=0 [server]
3990: [23:30:05] … start crafting difficulty=125.0 quality=AVERAGE period=94 [server]
3993: [23:30:08] … COMPLETE Copper Pickaxe ×1 quality=AVERAGE xp=0 continue [server]
3994: [23:30:08] … result gone → reset [server]
```

S7（战争锤，period 表差 1 的点，附中间产物两条）：

```
4121: … period SET difficulty=25.0 quality=AVERAGE period=25 [server]        ← 中间产物「1 铜锭→9 铜粒」
4123: … result CHANGED sig=etim:helmet_copper#0×1 prev=empty → recompute difficulty/period [server]
4127: … period SET difficulty=175.0 quality=AVERAGE period=109 [server]      ← 主身份（表写 110）
4129: … start crafting difficulty=175.0 quality=AVERAGE period=109 [server]
4132: … COMPLETE Copper War Hammer ×1 quality=AVERAGE xp=0 continue [server]
```

S18（铁锭→9 粒；shapeless ×9 产出）：

```
4357: … result CHANGED sig=minecraft:iron_nugget#0×9 prev=none → recompute difficulty/period [server]
4358: … period SET difficulty=800.0 quality=AVERAGE period=240 [server]
4360: … start crafting difficulty=800.0 quality=AVERAGE period=240 [server]
4369: … COMPLETE Iron Nugget ×9 quality=AVERAGE xp=0 continue [server]
```

N1（负证段全 0 行；段内只有工序回执）：

```
4464: ### [harness] > say [N1] (negative)
4466: [23:34:39] [Server thread/INFO] [minecraft/DedicatedServer]: [Server] [N1] (negative)
4467: [23:34:39] … Cleared the inventory of ETIM_W47, removing 1 items
4469: [23:34:39] … Set ETIM_W47's game mode to Survival Mode
（其后 3,650 ms 内 `[CraftingLog]` 零行；矩阵 2/4/6/8 四格余料恒在）
```

### 1.2 中间产物链（16 点；合法且可用于反向核形）

部分配方是另一些配方的**前缀形**（或单料即可成另一种配方），故「放料到齐」过程中 `sig` 会多次变化——每次变化都带一条 `result gone → reset` 或直接转下一条 `CHANGED`，属 R196 `onCraftMatrixChanged → clearCrafting` 的正常语义。全窗中间链：

| 点 | sig 链（放料序） |
| --- | --- |
| S1 S3 S4 S5 S8 S9 S11 S12 S14 S15 | `etim:nugget_copper#0×9` → 目标产物（1 锭→9 粒 shapeless 先命中） |
| S2 | `nugget_copper#0×9` → `dagger_copper#0×1` → `shovel_copper#0×1`（匕首＝铲的前缀形） |
| S6 | `nugget_copper#0×9` → `boots_copper#0×1` → `battle_axe_copper#0×1`（靴＝战斧的前缀形） |
| S7 | `nugget_copper#0×9` → `helmet_copper#0×1` → `war_hammer_copper#0×1` |
| S13 | `nugget_copper#0×9` → `helmet_copper#0×1` → `leggings_copper#0×1` |
| n | `nugget_copper#0×9` → `storage_copper#0×1` |

⇒ 侧面证明配方表本身正确（匕首／靴／盔的 pattern 确实是铲／战斧／锤／护腿的子形），且 `clearCrafting` 的重算在每次矩阵变更时都真实发生（C-2 登记口径）。

## §2 计数总账（写死判）

### 2.1 分组总账（任务书三行）

| 组 | 点数 | `COMPLETE` | 背包 +1 | `[CraftingLog]` 行 | 判 |
| --- | --- | --- | --- | --- | --- |
| S（生存计时） | 20 | **20** | **20** | 每点 5–14 行（6 行族＋中间产物） | ✓ |
| C（创造即时） | 5 | **0** | **5** | **0** | ✓ |
| N（负证） | 1 | **0** | **0**（Δ=0） | **0** | ✓ |
| F（i–n 后备） | 6 | 3（i／m／n） | 6 | 6／0／0／0／6／9 | ✓ |

### 2.2 全窗 `[CraftingLog]` 分形计数（档内直数，与驱动侧逐点计数 **零不一致**）

| 面 | 全窗 | 说明 |
| --- | --- | --- |
| `[CraftingLog]` 合计 | **195** | 逐点档内计数与驱动 `srv.all` 计数 32/32 点全等（mismatch 0） |
| `COMPLETE ` | **23** | 20（S）＋i＋m＋n |
| `result CHANGED sig=` | **43** | ＝各点身份数之和（含 16 点中间产物） |
| `period SET ` | **43** | 与 sig 一一对应 |
| `result click btn=` | **23** | 每 S/F 计时点各 1 次 arm；C 组与 N1 为 0 |
| `start crafting ` | **23** | 同上：arm 后即 start |
| `result gone → reset` | **40** | 身份消失即复位（无空态转移者不出行） |
| `damage penalty` | **0** | 工序白板＋每点 `/clear` ⇒ 无受伤减 tick |
| `damaged ingredient → crafting cleared` | **0** | 判窗第 10 形行＝0（T-G(a) 负证） |
| `CLIENT result click` | **0** | 零客户端正面证据（C-9） |
| Mixin 失败三型 | **0** | — |

### 2.3 工序面（每点内嵌，写死）

| 面 | 全窗实现 | 回执锚 |
| --- | --- | --- |
| `/clear <bot>` | 32 点各 1 次＋标定首尾 2 次＝全窗 **34** 条 | `Cleared the inventory of ETIM_W47, removing N items` |
| `/etest food 6 6` | 每点 ≥1 次＋计时等待期每 2.5 s 续喂＝全窗 **63** 条回执 | `commands.etest.food_set_pool player=ETIM_W47 params=[6, 6, 6]` |
| `/xp -1000000L` | 每点 1 次；`bot.experience.level == 0` **32/32 点成立** | 驱动 checks `xpLevelZero` 全 true |
| `/gamemode` | 下发 **6** 次＝setup 1＋S1 首点补 1（ctx 未知态）＋相间 **4** 次翻转（S→C／C→N／i→j／l→m）；单 bot，无重连 | `Set ETIM_W47's game mode to …` 6 行 |

## §3 起收钉值（全同 ⇒ 零 rebuild／零产品码／零 cfg 编辑）

| 项 | 起窗（任务书钉，判窗前亲算复讫） | 收窗实测 | 判 |
| --- | --- | --- | --- |
| HEAD | `92db13d` | `92db13d`（窗内零提交；`git status --porcelain` 仅新增本窗驱动＋本回执） | ✓ |
| release jar | 775,263 B｜`22DC05D4C0FE5E3271016CDCEFAA8DC8FC5530DBFC6A0A62F3AC5D86F7A6C2A5` | 同值 | ✓ |
| dev jar | 759,459 B｜`8130C73845EBD76FAFAA5400DE9CFB15E33C40CEE62EE084CD510B4681429777` | 同值 | ✓ |
| sources jar | 703,372 B｜`39CD6818A94A90982A6AC32BE4E74140E09324176E483FE6AD47B270DCE6CA6B` | 同值 | ✓ |
| 服务端 cfg | 32,095 B｜`E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5` | boot 后同值；收窗同值（byte-identical） | ✓ 零编辑 |
| 客户端 cfg | 30,277 B｜`E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45` | 同值（全窗零触碰） | ✓ |
| server.properties | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 同值（`level-name`／`spawn-protection` 已回填） | ✓ |
| ops／usercache／usernamecache | — | 三件 byte-identical（起窗快照回填；`op` 的写入被回滚） | ✓ |
| MK 双树 | mixins **56**／client **10**；refmap **62 类键／138 叶条目**；切片 **Sword 4／Tool 4／Shears 3（总 11）** | 双树同值（`139/57/12` 未现） | ✓ |
| `run/obfuscated/options.txt` | — | 未读写（4,467 B，mtime `2026-10-31T17:44:52`，早于本窗 23:29） | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` | 18 | 18（无新增）；`hs_err_pid*.log`／`replay_pid*.log` 0 件 | ✓ |
| 世界目录 | — | `run/gearcraftw47` 已删（`worldRemoved=true`） | ✓ |
| Gradle | — | `:compileJava/:classes/:jar` 三行全 **UP-TO-DATE**；`BUILD SUCCESSFUL in 6m 22s` | ✓ 0 rebuild |

**boot 三面（单 boot 正本）**

| 面 | 值 | 锚 |
| --- | --- | --- |
| mod 清单 | `Finished gathering 15 mods, took 1370 ms` | `:127` |
| 世界 | `Preparing level "gearcraftw47"` | `:510` |
| 就绪 | `Done (5.375s)! For help, type "help" or "?"` | `:2255` |
| Gradle tasks | `:compileJava UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE` | `:31`／`:33`／`:35` |
| 收窗 | `BUILD SUCCESSFUL in 6m 22s`；`stop` → `exitCode 0` | `:4592` |

**守门行（A-2 判据，runtime 实数）**

```
339: [23:29:38] [Server thread/INFO] [Easy Times In Minecraft]: [TestLog] gear recipes registered: 19 batch rows ok (runtime REGISTRY delta; etim-domain total 144 incl legacy 94: 90 ingot-based + 4 rusted chain-armor) [server]
```

⇒ `batchRows=19`、`total=**144**` 与判据正本逐位相符（≠144 即 A 级停窗的口径本窗不触发；javadoc 126 的 C-1 记案照旧）。

**三键现值亲锤（零 cfg 编辑的前提，起窗读档）**

| 键 | 值 | 源 |
| --- | --- | --- |
| `craftingTimer` | `true` | cfg L131 |
| `craftingSkipCreative` | `true` | cfg L122 |
| `craftingDebugLog` | `true` | cfg L104 |
| （旁证）`craftingDamagedDeny`／`craftingBenchModifier`／`craftingSpeedPerLevel` | `true`／`0.2`／`0.02` | cfg L101／默认值 L261／L259 |

## §4 冲突分级（A / B / C）

**A 级 0 条**（32/32 判格 ✓；零产品码改动、零 rebuild、零 cfg 编辑、零客户端动作）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| C-1 | C | **判据表 period 列在 d=175 上差 1**：摸底 §5.2 写 S7／S13 `period=110`，实测 **109**。根因＝`(int) Math.max(unmodified / denominator, floor)`（`crafting/ETIMCrafting.java:361-365`）对 `132 / 1.2f` 的 **float32 除法截断**（1.2f=1.20000004768 ⇒ 109.99999… ⇒ `(int)`=109）；实数代数 132/1.2=110.0 恰在边界。全窗仅此两格，其余 30 格 period 逐位相符。 | 本窗按「**判点＝COMPLETE／背包 Δ／身份四源**，period 属时序前提」判 **PASS**，并把差登记待裁（**D-1**）。若主会话裁定「判据表 period 为判值」，则 S7／S13 应改判 FAIL——两种口径的实测值都在档（`109`），无需重跑。 |
| C-2 | C | **「每点 6 行族 ±1」在单料/前缀形配方上必然超界**：32 点中 16 点出现中间产物（1 锭→9 粒、匕首＝铲前缀、靴＝战斧前缀、盔＝锤/护腿前缀），行数 6–14。属 R196 `clearCrafting` 正常语义，非通道异常。 | 判据改以「sig 链**末条**＝目标产物」+「click/start/COMPLETE 各 1」+「COMPLETE 后有 gone」+「行族 5–14」四件判定（驱动已如此实现并写进 §7）；建议正本把「±1」改为该写法（**D-2**）。 |
| C-3 | C | **终审回执 Ku-3 的切片顺序与实测不符**：Ku-3 记「Sword 4／Tool **3**／Shears **4**（总 11）」，本窗开窗亲数＝**Sword 4／Tool 4／Shears 3（总 11）**（与任务书「4/4/3」一致）。 | 四量静止预言（mixins 56／client 10／refmap 62-138／切片总 11）不变，判值零影响；请主会话回写 Ku-3 誊差。 |
| C-4 | C | **标定面比 §6.1 的「26 产品＋10 配料」更宽**：本窗覆盖 32 点全部产品与配料＝**42 项**（一次性标定，`fails=0`，全表见 §7.2）。属工装手法扩展（含 vanilla 铁锭/铁粒/棍/燧石/皮革/羽 6 项）。 | 无判值影响；idMap 仅作「对不对得上」的机械比对（§6.1 原口径）。 |
| C-5 | C | **零客户端面（C-9）**：`javaw`/`java` 带窗进程 **0**；`options.txt` 未读写（mtime 17:44:52）；全窗 `[CraftingLog] CLIENT result click` **0 行**（客户端侧探针完全静默）。 | 正面事实登记；本窗未触发「客户端例外口」握手（也不需要客户端）。 |
| C-6 | C | **`srv.all` 与 `.out` 档内行号不一一对应**：`server-console.js` 的 `send()` 把 `### [harness] > …` 回显直接写流、不入 `all`，故驱动内锚行号比档内行号小（累计偏 1,700+ 行）。 | 回执行号一律**按档内词面重定位**（本报告 §1 与 `-anchors.txt` 均取档内真行号；重定位脚本 mismatch 0）；工装面登记，勿跨档套用驱动日志行号。 |
| C-7 | C | **首跑（15:20–15:28）为驱动 bug 窗**：① scythe 摆格抄错（铜锭放 2／5 格，正解 2／6——pattern `"/X ","/ X","/  "`）⇒ S15 无产物；② gone 行按「恰 1 条」判过严（中间产物亦出 gone）⇒ 13 格误判；③ period 严格等式碰上 C-1 的边界。 | **非产品缺陷**（同窗 S15 外的 19 个 S 点、C 组、N1、i–n 的产物/Δ/身份全对）。整目录留 `build-logs/gearcraft-w47-run1/` 作旁证；正本＝15:29–15:36 重跑窗（本文全部数值取正本）。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | **period 表 d=175 列（S7／S13）110 vs 实测 109**（float32 `(int)` 截断） | (a) 认 109，正本更正值并注 float32 口径／(b) 认 110 为判值 ⇒ S7／S13 判 FAIL 待修／(c) 正本改写「实测值域」两档都收 | **(a)**：C-1 的根因是 `(int)` 对 float32 商的截断，属代数表述精度问题；判点（可达性）不受影响，且 109 与代码逐位可复算 |
| D-2 | 「每点 6 行族 ±1」判据写法 | (a) 改为「sig 链末条＝目标＋click/start/COMPLETE 各 1＋COMPLETE 后有 gone＋行族 5–14」／(b) 保持 ±1 并把单料/前缀形配方列白名单 | **(a)**：C-2 的中间产物是 R196 正常语义，白名单会随配方增长失效 |
| D-3 | 创造相取物手法 | (a) 结果槽 `mode=0` 取到光标 → 点背包空槽 10 落包 → 关窗兜底／(b) 改 `QUICK_MOVE`（shift 击） | **(a)**：本窗 8 个创造点 Δ=1 全成；MixinContainer 的 `QUICK_MOVE` 虽也 arm，但 `canTakeStack` 在创造相解锁后的 shift 分支语义未亲锤，留作后续面 |
| D-4 | 单 bot gamemode 切换 vs 双 bot | (a) 单 bot 4 次翻转（可行，无重连、无 dup login 风险）／(b) 双 bot 分相 | **(a)**：本窗 4 次翻转全部落地（每点前 `gamemode` 回执齐），切换耗时 ≈0.9 s/次，远低于双 bot 的连接成本 |
| D-5 | 标定面是否固化 42 项（C-4） | (a) 固化「按点表自动并集」／(b) 固定 36 项清单 | **(a)**：本窗已按点表并集自动生成（`calibrateNames()`），改点表即自动跟随，零维护 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 boot（唯一） | 23:29:30 起 → 23:29:44 `Done (5.375s)` `:2255` → 判点 32/32 → 23:35:53 收窗；`BUILD SUCCESSFUL in 6m 22s` `:4592`；`stop` `exitCode 0` |
| 客户端 | **零会话**（未拉起、未关窗；`options.txt` 未读写，mtime 停留 17:44:52） |
| 端口 | 25565 LISTEN＝0（起 0／收 0） |
| 崩溃 | `run/crash-reports` 18 → 18（无新增） |
| cfg／props／三 side 文件 | 服务端 cfg 起收 byte-identical（`craftingTimer=true` 保持）；客户端 cfg／props／ops／usercache／usernamecache 全 byte-identical |
| 世界 | `gearcraftw47` 已删（`worldRemoved=true`） |
| rebuild | **0**（三任务全 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅 `?? testharness/player/gearcraft-w47.js`＋本回执；HEAD `92db13d` 未动） |
| 时钟口径 | 驱动时间戳为 UTC，服务端日志为 CST（+8 h）；本回执行号锚只认档内行号与行首时刻 |

## §7 工装与复跑

### 7.1 驱动

`testharness/player/gearcraft-w47.js`＝`offphase-w46.js` 的骨（PIN／MK／`srv.send`／收口快照／evidence JSON）＋ `batch2-rerun.js` 的四原语（`openTable`／`putOne`／`lclick`／`waitCraft` 基改）。

- 环境变量：`W47_MODE=s|c|n|f|all`（默认 all）｜`W47_ONLY=S1,S10,...`（判点裁剪，冒烟用）｜`W47_STAGE=<tag>`（`.out` 名隔离）。
- 单 boot 内按 `s,c,n,f` 顺序打组；每点工序＝`/clear` → `/gamemode`（按相）→ `/etest food 6 6` → `/xp -1000000L` → `/give` 料 → 开台 → 逐料落格 → 点结果槽 → 等 `COMPLETE`（超时＝`period×50 ms + 16 s`，等待期每 2.5 s 续喂）→ 关台 → 读数。
- **attack 同理不需要**（本批无攻击面）；`/etest craft` **不新增**（D-4(a)）。
- 判据实现（对齐 §4 C-2）：`sigTarget`（末条 sig 前缀＝目标 registry）／`periodTarget`（末条 period 的 difficulty 严格等＋period 容差 ±1，差值另记 `periodDrift`）／`clickOnce`／`startOnce`（difficulty＋period±1＋quality）／`completeOnce`／`completeShape`（显名×count×quality×xp=0×continue）／`rowFamily`（5–14）／`goneAfterComplete`／`invDelta`（＝产出数）／`qualityTag`＋`qualityOrdinal`（carrier＝2）／`qualityTagAbsent`（non-carrier／创造相）／N1 的 `noSigChain`＋`matrixRetained`。
- 摆格表（3×3 工作台，slot 1–9 为 row-major 矩阵）逐配方亲写：镐 `1,2,3`+棍 `5,8`／铲 `1`+`4,7`／斧 `1,2,4`+`5,8`／锄 `1,2`+`5,8`／鹤嘴锄 `1,2,3,6`+`5,8`／战斧 `1,3,4,6`+`5,8`／战锤 `1,2,3,4,6`+`5,8`／手斧 `2`+棍 `1,4`／剑 `1,4`+`7`／匕首 `1`+`4`／盔 `1,2,3,4,6`／胸甲 `1,3,4,5,6,7,8,9`／护腿 `1,2,3,4,6,7,9`／靴 `1,3,4,6`／镰刀 锭 `2,6`+棍 `1,4,7`／箭 粒 `1`+棍 `4`+羽 `7`／燧石刀 燧石 `1`+筋腱 `2`+棍 `4`／筋腱 皮革 `1`／铜块 锭 `1..9`。

### 7.2 标定表（42 项，`fails=0`；身份源①）

| registry | id | registry | id | registry | id |
| --- | --- | --- | --- | --- | --- |
| `etim:nugget_copper` | 4096 | `etim:ingot_copper` | 4101 | `etim:ingot_silver` | 4102 |
| `etim:ingot_mithril` | 4103 | `etim:ingot_adamantium` | 4104 | `etim:ingot_ancient_metal` | 4105 |
| `etim:sinew` | 4106 | `etim:chain_copper` | 4132 | `etim:chain_rusted_iron` | 4137 |
| `etim:pickaxe_copper` | 4138 | `etim:shovel_copper` | 4139 | `etim:axe_copper` | 4140 |
| `etim:hoe_copper` | 4141 | `etim:hatchet_copper` | 4142 | `etim:mattock_copper` | 4143 |
| `etim:sword_copper` | 4144 | `etim:dagger_copper` | 4145 | `etim:battle_axe_copper` | 4146 |
| `etim:war_hammer_copper` | 4147 | `etim:helmet_copper` | 4148 | `etim:chain_helmet_copper` | 4149 |
| `etim:chestplate_copper` | 4150 | `etim:leggings_copper` | 4152 | `etim:boots_copper` | 4154 |
| `etim:pickaxe_silver` | 4156 | `etim:sword_silver` | 4162 | `etim:pickaxe_ancient_metal` | 4174 |
| `etim:hoe_ancient_metal` | 4177 | `etim:sword_mithril` | 4198 | `etim:helmet_adamantium` | 4220 |
| `etim:chestplate_adamantium` | 4222 | `etim:chain_helmet_rusted_iron` | 4239 | `etim:scythe_copper` | 4248 |
| `etim:knife_flint` | 4254 | `etim:arrow_copper` | 4255 | `etim:storage_copper` | 4127 |
| `minecraft:stick` | 280 | `minecraft:flint` | 318 | `minecraft:leather` | 334 |
| `minecraft:feather` | 288 | `minecraft:iron_ingot` | 265 | `minecraft:iron_nugget` | 452 |

### 7.3 判行复核（可直接粘贴）

```powershell
# 守门行（runtime 144）
Select-String -Path testharness\build-logs\gearcraft-w47.out -Pattern 'gear recipes registered'
# 判行全族
Select-String -Path testharness\build-logs\gearcraft-w47.out -Pattern '\[CraftingLog\]'
# COMPLETE 23 条
Select-String -Path testharness\build-logs\gearcraft-w47.out -Pattern 'COMPLETE '
# 负证三面（应全 0）
Select-String -Path testharness\build-logs\gearcraft-w47.out -Pattern 'damaged ingredient|damage penalty|CLIENT result click'
# 单一配方可达（例：铜镐）
Select-String -Path testharness\build-logs\gearcraft-w47.out -Pattern 'sig=etim:pickaxe_copper'
```

### 7.4 复跑

```powershell
cd "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
# 全窗（单 boot，S→C→N→i–n，收窗自动回填）
$env:W47_MODE='all'; node testharness\player\gearcraft-w47.js gearcraft-w47
# 冒烟（三点：一个计时点＋创造点＋负证点）
$env:W47_MODE='all'; $env:W47_ONLY='S10,N1,C5'; node testharness\player\gearcraft-w47.js gearcraft-w47-smoke
```

### 7.5 证据卷（`testharness/build-logs/`）

`gearcraft-w47.out`（587,124 B／4,595 行，正本）｜`-server-latest.log`（583,848 B／4,108 行）｜`-driver.log`（190,128 B／1,430 行）｜`-evidence-all.json`（296,324 B／11,473 行，逐点 checks／rows／matrix／stackDump／anchorsFile／pins）｜`-anchors.txt`（7,696 B／268 行）｜cfg 双件＋props＋usercache／usernamecache＋ops 六份 before 快照｜`-run1/`（首跑驱动 bug 窗＋两次冒烟，C-7 旁证）。

## §8 未覆盖面（不补白）

1. **A-1 五金属链缺口** 本窗只「证形」（m 点 `/give` 链→盔）——`chain_copper/silver/mithril/adamantium/ancient_metal` 仍无合成与掉落来源，20 条链甲配方在正常玩法仍不可达；落码属链配方批（D-1(a)）不在本窗。
2. **gold 系三重缺**（R196 `chainGold`＋gold 链甲＋ETIM 无 gold 金属体）＝C-5 界面，本窗未取点（无该配方可判）。
3. **创造相 quality 侧车缺失** 本窗取到正面证据（B-5），但「创造相是否应补侧车」属产品决议，未测其它路径（如 `/etest quality` 注入后创造合成）。
4. **统计面（`stat.craftItem`）B-3** 未测：本窗只判产出与计时，统计面板差异照 B-3 登记。
5. **`bot.craft` / `/etest craft`** 结构性不用（M-8／D-4(a)）；本窗全走手摆通道。
6. **损坏料门（`craftingDamagedDeny`）正证** 未取：本窗全部配料均 non-damageable ⇒ 只有 0 行的负证（T-G(a)），无「受损料→cleared」的正面行。
7. **多产物/多档 quality（右击 cycle）面** 未测：本窗每点单次左击 arm、单档 AVERAGE（level 0 ⇒ `getMinOrdinal==getMaxOrdinal==2`）。

## §9 自报（机械核讫）

> 文件：`testharness/reports/gearcraft-W47-verdict.md`｜**31,567 B**｜349 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`2A13E59C50D29BDE2E0FE52DF85ACBBED64D0A90CBDCB3E986C6FD17438602F0`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`2F0A4E68553E9B08C7CD0921AC6213435BCFF69E568B88C7B5D2881ABF37B1D2`
> 判格 32（S1–S20／C1–C5／N1／i–n）全 ✓｜`COMPLETE` 23（S20＋i／m／n）｜C 组与 N1 `[CraftingLog]` 零行｜`damaged ingredient` 0／`damage penalty` 0／`CLIENT click` 0｜守门 runtime 144｜冲突 A0 B0 C7｜待裁 D-5｜jar byte-identical／零 rebuild／零产品码／零 cfg 编辑／零客户端
> 规格行里的叉号计数含该行自身字形与本节注记，正文无失实判格的叉号（32 判格全对号）。
