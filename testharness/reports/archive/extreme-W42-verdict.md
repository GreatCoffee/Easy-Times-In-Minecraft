# 武器极端值面批（extreme）· W-42 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：两相 A/G（各一次 `gradlew runServer`，零 rebuild）
> **报告字节规格**：`18,041 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 24 / ✗ 2｜175 行`
> **判据正本**：`playground/audit/extreme-终审回执.md` §三「W-42 十一点定稿表」（T-6）＋§六「落码验收锚」（D-1(c) 修后 e 点新 boot 起测）。本回执**只判十一点**，不改判点定义、不改判值。
> **秤上唯一判据**：`[MiningLog] tool decay face=attacking item=<reg> loss=N [server]`（`mining/ETIMMining.java:312` 发行，`state=null` ⇒ **无 block 列**；去重键 `attacking|<item>`，`:701`／`:709-712`）。行出现 `block=` 列即判行形异常（本窗 0 例）。
> **判决**：**PASS**——a…k 十一点全 ✓；**计数总账 A 相 `attacking=5 ok:true`／G 相 `attacking=0 ok:true`**；他通道全 0；起收钉值全同、零 rebuild、产品码 0 行改动。

## §0 判决总表（十一点）

| 点 | 相 | 内容 | 期望 attacking 行 | 期望栈 Δ | 实测行 | 实测栈 Δ | 判 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| W-42a | A | 生存 `war_hammer_copper`×猪 | `loss=66` ×1 | +66 | 66 ×1 | +66 | ✓ PASS |
| W-42b | A | 生存 `battle_axe_copper`×猪 | `loss=75` ×1 | +75 | 75 ×1 | +75 | ✓ PASS |
| W-42c | A | 生存 `hatchet_copper`×猪 | `loss=133` ×1 | +133 | 133 ×1 | +133 | ✓ PASS |
| W-42d | A | 生存 `scythe_copper`×猪 | `loss=400` ×1 | +400 | 400 ×1 | +400 | ✓ PASS |
| W-42e | A | 生存 `mattock_copper`×猪（D-1(c) 修后） | `loss=100` ×1 | +100 | 100 ×1 | +100 | ✓ PASS |
| W-42f | G | off 相 生存 `iron_pickaxe`×猪 | **0 条** | +2 | 0 条 | +2 | ✓ PASS |
| W-42g | G | off 相 生存 `scythe_copper`×猪 | **0 条** | +2 | 0 条 | +2 | ✓ PASS |
| W-42h | G | off 相 生存 `hatchet_copper`×猪 | **0 条** | +2 | 0 条 | +2 | ✓ PASS |
| W-42i | G | off 相 生存 `battle_axe_copper`×猪 | **0 条** | +2 | 0 条 | +2 | ✓ PASS |
| W-42j | G | off 相 生存 `war_hammer_copper`×猪 | **0 条** | +2 | 0 条 | +2 | ✓ PASS |
| W-42k | G | off 相 **创造** `scythe_copper`×猪 | **0 条** | **0** | 0 条 | 0（背包差 0） | ✓ PASS |

**判值链注记**：(a) 66 与 (c) 133 是 float32 截断位实证（`2F/3F`＝`0x3f2aaaab`→×100＝66.666672→(int)66；`4F/3F`＝`0x3faaaaab`→133.333343→(int)133，**非 134**）；(b) 75 与 (d) 400 为精确值；(e) 100 是 D-1(c) 删 `:463-464` 特判后经 `:472` `instanceof ItemSpade → 1.0F` 兜底的**新值首证**（本窗起点 HEAD `4c2849e` 即含该修）。四值均 >1 ⇒ `Math.max((int)(100.0F×…),1)` 的 max 位不触发。

## §1 逐点判词（判行原句 ＋ 行号锚）

行号一律指 `testharness/build-logs/extreme-w42-a.out`（A 相）／`extreme-w42-g.out`（G 相）**全档行号**（含 Gradle 前缀行），可用 `Select-String` 直取；时刻为服务端本地时（UTC+8）。

### A 相（`miningReform=true`，boot 13:55:35 → `Done (6.480s)`）

| 点 | 判行原句（原样） | 锚 | 命中旁证（`[DamageLog] src=player`） | 栈真值（bot `durabilityUsed`） |
| --- | --- | --- | --- | --- |
| a | `[MiningLog] tool decay face=attacking item=etim:war_hammer_copper loss=66 [server]` | `:3140` | `:3139` `target=Pig#2053 src=player raw=6.000 … final=7.050` | 0 → 66 |
| b | `[MiningLog] tool decay face=attacking item=etim:battle_axe_copper loss=75 [server]` | `:3158` | `:3157` `target=Pig#2054 src=player raw=8.000 … final=9.400` | 0 → 75 |
| c | `[MiningLog] tool decay face=attacking item=etim:hatchet_copper loss=133 [server]` | `:3176` | `:3175` `target=Pig#2055 src=player raw=6.000 … final=7.050` | 0 → 133 |
| d | `[MiningLog] tool decay face=attacking item=etim:scythe_copper loss=400 [server]` | `:3194` | `:3193` `target=Pig#2056 src=player raw=5.000 … final=5.875` | 0 → 400 |
| e | `[MiningLog] tool decay face=attacking item=etim:mattock_copper loss=100 [server]` | `:3212` | `:3211` `target=Pig#2057 src=player raw=5.000 … final=5.875` | 0 → 100 |

**逐点判值要点**：

- 五点**异键**（`attacking|war_hammer_copper`／`battle_axe_copper`／`hatchet_copper`／`scythe_copper`／`mattock_copper`）⇒ 同 boot 内连续五点天然不互吞；实测每点**恰 1 条**，发行序与数组序一致。
- 每点的 `loss` 与栈 Δ **同值**（66／75／133／400／100），且行内无 `block=` 列 ⇒ 攻击面判行形与 `state=null` 契约一致。
- **命中落点不看血量**（1.12 `entitydata` 对猪 `{}` 无回显、对玩家直接拒绝 —— W-41 C-1 家族），改由 `[DamageLog] dmg target=Pig#… src=player raw=<n>`（`damageDebugLog=true`，cfg `:41`）直证：五点各有一条，`raw` 分别为 6／8／6／5／5（随武器基伤），**不是 0，也不是缺失**。
- (d) 单次 `loss=400` 远超 copper 档任何槽位上限（scythe 铜 maxDamage＝`4.0×2×4×100`＝3200，`metal/ETIMItemScythe.java:54`）⇒ 不触发碎栈、栈 Δ 可完整读出 400；同理 (a) 8000／(b)(e) 6400／(c) 1600。

### G 相（`miningReform=false`，boot 13:56:28 → `Done (1.181s)`）

| 点 | 判行 | 锚 | 命中旁证 | 栈 Δ |
| --- | --- | --- | --- | --- |
| f | **0 条**（全档 `extreme-w42-g.out` 内 `tool decay` 命中 0） | — | `:851` `target=Pig#24 src=player raw=4.000` | 0 → 2（bot 面板 `max=250`，vanilla 铁镐可读） |
| g | **0 条** | — | `:868` `target=Pig#25 src=player raw=5.000` | 0 → 2 |
| h | **0 条** | — | `:885` `target=Pig#26 src=player raw=6.000` | 0 → 2 |
| i | **0 条** | — | `:902` `target=Pig#27 src=player raw=8.000` | 0 → 2 |
| j | **0 条** | — | `:919` `target=Pig#28 src=player raw=6.000` | 0 → 2 |
| k | **0 条** | — | `:937` `target=Pig#29 src=player raw=5.000` | 0 → 0（背包差 0） |

**逐点判值要点**：

- off 相 handler 首支原调（`mixins/MixinItemTool.java:80-83` `!miningReform → stack.damageItem(vanillaAmount, attacker)`）⇒ **零 attacking 行**；`vanillaAmount` 是 `@Redirect` 捕获的原调用实参，1.12 `item/ItemTool.java:73` 传 **2** ⇒ f…j 一律 Δ2，**四武器不分级**（与 T-4 逐位一致）。
- **f 点是 vanilla 对照**：`minecraft:iron_pickaxe` 走同一 `ItemTool.hitEntity`，Δ2 ⇒ 证明「Δ2」是 off 相通用值、不是 mod 物品读栈假象；该点也是本窗唯一能读到 `maxDurability` 的点（250），可反证面板口径本身有效。
- **k 点（创造）Δ0 且命中成立**：`raw=5.000 final=5.875` 说明猪**确实挨了打**，玩家自身 `20 → 20`、背包快照逐字节不变 ⇒ Δ0 出自 `item/ItemStack.java` 的创造门，不是「没打中」或「被免伤」。判毕 `/gamemode 0` 已复原（G 相日志 `Set ETIM_W42G's game mode to Survival Mode`）。
- G 相零行发行 ⇒ last-sig（`attacking|<item>`）在本相**无键面**，g 与 k 同用 `scythe_copper` 也不存在吞行风险（同 boot 内两次同物品，实测仍 0 条）。

## §2 计数总账（写死判，`ok:true`）

| 相 | attacking | shearing | breaking | speed | deny | shear drop | reach denied | 账 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | **5** | 0 | 0 | 0 | 0 | 0 | 0 | `want.attacking=5 / got=5 / ok=true` |
| G | **0** | 0 | 0 | 0 | 0 | 0 | 0 | `want.attacking=0 / got=0 / ok=true` |

A 相 5 条**发行序**（`item:loss`）：

```
etim:war_hammer_copper:66 → etim:battle_axe_copper:75 → etim:hatchet_copper:133
→ etim:scythe_copper:400 → etim:mattock_copper:100
```

G 相 6 点的 Δ 序列：`2 → 2 → 2 → 2 → 2 → 0`（f…k）。

## §3 起收钉值（全同 ⇒ 零 rebuild）

| 项 | 起窗 | 收窗 | 判 |
| --- | --- | --- | --- |
| HEAD | `4c2849ef4035b9ece53ff5ce1888c51cb550be35`（dirty 0） | 同（窗内零提交） | ✓ |
| release jar | 772,789 B｜`441A97C1D06FE5CE661E6D2F29C56211E6763B05E7B6053E26CC5C156A740A5B` | 同 | ✓ |
| dev jar | 757,023 B｜`7348CC0D8A605DE3BD9CACEDB4D87FA73A3EC1214039669B726B0FB846490C2E` | 同 | ✓ |
| `run/config/etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | 收窗 byte-identical | ✓ |
| `run/server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 收窗 byte-identical | ✓ |
| refmap（双树 `build/resources/main`＋`build/tmp`） | 62 类键／138 条目（切片 Sword 4／Tool 4／Shears 3） | 同（两树同值） | ✓ 139/57/11 未出现 |
| `mixins.etim.json` | mixins 56／client 10 | 同 | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` 计数 | 18 | 18 | ✓ |
| Gradle | `> Task :compileJava UP-TO-DATE`、`> Task :classes UP-TO-DATE`、`> Task :jar UP-TO-DATE`（两相均见，`:31/:33/:35`） | `BUILD SUCCESSFUL`（51s／51s） | ✓ 0 rebuild |

> cfg 窗内唯一动作＝G 相把 `B:miningReform=true` 翻 `false`（末态 31,550 B／`964A9064…978A4`），收窗从快照整档还原（byte-identical 复钉命中）；`B:miningDebugLog=true`（`:363`）／`B:damageDebugLog=true`（`:41`）／`B:blockDebugLog=false`（`:11`）**全程未动**。ops.json／usercache.json／usernamecache.json 亦从快照还原并逐字节相同（685 B／1,630 B／851 B）。
> ◎ 带外不判负：release 772,789 B（较 attgate 起点 772,793 B **−4 B**）、dev 757,023 B（较 757,032 B **−9 B**）＝条 172 已账面的删行减量，按任务书「起窗不作 STOP 条件」处理。

## §4 冲突分级（A / B / C）

**A 级 0 条**（无判点 FAIL 需产品码改动）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| B-1 | B | **「0 行」的可判性只有一条活路**：G 相六点全部期望 0 行，而 0 行本身无法区分「门/off 原调生效」与「未命中／被免伤／被其它 mod 截断」。本窗把 `[DamageLog] dmg … src=player raw>0` 提为**必过前置**（`hitLanded` 检查项），六点各有一条（851/868/885/902/919/937，见 §1），因此「0 行＋Δ2/Δ0」是**有命中前提的零行**，不是空洞零行。 | 判据结构登记；建议后续 attacking 面判点一律带此旁证（D-3）。 |
| C-1 | C | **`Done (` 之后仍有「Server is still starting」窗口**：FML 在 `Netty Server IO` 直接踢连接（`extreme-w42-g.out` 首轮实测 `Disconnecting Player: Server is still starting! Please wait before reconnecting.`），此时 status ping 也不带 modinfo ⇒ `createHarnBot` 抛 `target is not a FML server — no modinfo in status ping`。 | 工装修：`connectBot()` 8 次 × 2.5 s 退避重试（本窗 G 相重跑一次即通）。属纯工装面，产品码 0 涉。 |
| C-2 | C | **modded 栈在 mineflayer 侧无 `maxDurability`**：`etim:*` 五点 `botBefore.max` 为 `undefined`，只 `durabilityUsed` 可读；vanilla `iron_pickaxe` 读到 250（G 相 f 点）⇒ 面板口径本身有效，只是缺 mod 物品元数据表。 | 栈判据只用 `durabilityUsed` 差值；不读 max、不算百分比。 |
| C-3 | C | **`[DamageLog]` 在 mob 目标上 `armorIn/final ≠ raw`**（如 `raw=6.000 armorIn=7.050 final=7.050`）：目标无甲，数值经 `R196ArmorModel` 的 natural 合成抬升（W-41 同形 `raw=7.000 final=8.225`，**非本批引入**）。 | 本批只把 `src=player` 与 `raw>0` 当命中旁证，**不使用**其 `final` 数值作任何磨损判据。 |
| C-4 | C | **e 点取栈口径**：任务书建议「先 `/give` 拿栈后 hold」；本窗直接用 `/etest hold etim:mattock_copper` 置栈（`CommandDevTest.java:557-563` `Item.getByNameOrId` → `new ItemStack(item,1)`，Damage 0）。配方面（metal gear）只影响能否**合成**，不影响 `hold` 直置 —— 判值面等价且更强（无 NBT/无附魔，天然满足 D-3 白板栈）。 | 差异如实登记；如主会话要求配方面同证，另开窗（本批判据不含配方）。 |
| C-5 | C | **`hold` 回执只给显示名**（`params=[War Hammer]`），不含 registry name；modded 物品在 bot 侧名字可能为 `unknown`。 | 栈身份以判行 `item=<reg>` 为准（服务端发行时读的就是手持真值），回执/面板仅作通路旁证（W-41 C-7 家族延续）。 |
| C-6 | C | **首轮 G 相 PHASE FATAL 的档被覆盖**：本窗首次全窗跑（05:53–05:54）A 相 5/5 已 PASS，G 相在假人进服即 FATAL（C-1），回执档随修后重跑被同名覆盖，旧档不再保留。 | 诚实登记：**判决只引重跑档**（`extreme-w42-a/g.out` 现行 13:55–13:57 时段）；A 相首轮与重跑判值逐点同（66/75/133/400/100）。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | e 点取栈方式 | (a) `/etest hold` 直置即够 ／(b) 另补 `/give`＋配方面同证 | **(a)**：损耗判据只与手持栈真值相关，配方面不在本批判据内（C-4） |
| D-2 | 假人进服退避重试是否入模板 | (a) 入（8×2.5 s） ／(b) 本批一次性 | **(a)**：C-1 是可复现的 FML 启动窗口，不重试必假 FAIL |
| D-3 | 命中旁证是否入 attacking 面标准臂 | (a) 入（`[DamageLog] src=player raw>0` 作 `hitLanded` 必过项） ／(b) 仅 G 相用 | **(a)**：这是「0 行／0 值行」唯一可日志化落点（B-1） |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 客户端 | **本窗零客户端**（无 obf client 启动、无窗口需关） |
| 服务端 A 相 | `Stopping the server` 13:56:14 → `Saving worlds` → 进程退出 → `BUILD SUCCESSFUL in 51s`（exit 0） |
| 服务端 G 相 | `Stopping the server` 13:57:07 → `Saving worlds` → `BUILD SUCCESSFUL in 51s`（exit 0） |
| 端口 | 25565＝0（起窗 0，收窗 0）；25575 未用（全走 stdin 控制台，不碰 RCON） |
| 崩溃 | `run/crash-reports` 计数 18 → 18（无新增） |
| cfg/props/ops/usercache/usernamecache | 五项 byte-identical 复钉命中（见 §3） |
| 世界 | `run/extremew42` 已删（`worldDirRemoved=true`） |
| rebuild | **0**（两相 `:jar UP-TO-DATE`；jar 字节/SHA 起收同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅新增本窗工装/回执；HEAD 未动） |

## §7 工装与复跑

- **判窗驱动**：`testharness/player/extreme-w42.js`（骨架＝`attgate-w41.js`，**Ku-2 锚位逐一亲锤后改用**）
  - 冒烟开关：`W42_ONLY=W-42a,W-42e`（点裁剪）、`W42_PHASES=a`（相裁剪）。
  - 攻击原语：`bot.attack(entity)` → 1.12 `use_entity mouse=1`（真实挥击路径，`entities.js:843-856`＋`:922-927`），瞄准**实体体心**（猪高 0.9 ⇒ `y+0.45`）。
  - 场地：5×5 石墙竞技场（内圈 3×3 空地、地板 `by-1`）＋判点前落地面复钉（`posBeforeHit.onGround=true` 逐点记录）。
  - 钉值门：HEAD/jar/cfg/props/MK 任一不符即拒跑；`139/57/11` 出现即停窗。
  - 夹具纪律：判窗前 `op <bot>`（`@e` 选择器解析需 `canUseCommand(1,"@")`）、`difficulty 2`、`gamerule doMobSpawning/doMobLoot/doTileDrops/doDaylightCycle/naturalRegeneration/mobGriefing false`、`randomTickSpeed 0`、`etest food 20 20`＋`etest level 35`＋`etest health 20`（血量上限 20 需等级带）、白板栈（`hold` 直置 Damage 0，无附魔）。
- **Ku-2 亲核结果（drift 0）**：`attgate-w41.js` 的 `PIN :64-70`／`POINTS_A :92-133`／`botDur :268`／`holdItem :293`／`swing :336`／`kill :393-395`／cfg 改 `:717-724`／还原 `:726-736`／`PIG_NBT :76-78` **逐一在位且语义相符**，本驱动按此基线改。
- **证据卷**（`testharness/build-logs/`）：`extreme-w42-a.out`（467,709 B／3,239 行）／`extreme-w42-g.out`（114,501 B／968 行）／`extreme-w42-a-server-latest.log`（453,231 B）／`extreme-w42-g-server-latest.log`（95,031 B）／`extreme-w42-evidence.json`（45,050 B）／`extreme-w42-driver.log`（67,550 B）／起点快照五件（cfg＋props＋ops＋usercache＋usernamecache）。
- **复跑命令**（仓根 `git-workspace/etim`）：

```powershell
node testharness\player\extreme-w42.js extreme-w42                 # 全窗（A+G，两 boot）
$env:W42_ONLY='W-42a,W-42e'; $env:W42_PHASES='a'; node testharness\player\extreme-w42.js smoke   # 冒烟
```

- **判行复核（可粘贴，行号现行）**：

```powershell
Select-String -Path testharness\build-logs\extreme-w42-a.out -Pattern '\[MiningLog\] tool decay face=attacking'
Select-String -Path testharness\build-logs\extreme-w42-g.out -Pattern '\[MiningLog\] tool decay'      # 0 命中
Select-String -Path testharness\build-logs\extreme-w42-a.out -Pattern 'src=player'
Select-String -Path git-workspace\etim\src\main\java\io\github\etim\etim\mining\ETIMMining.java -Pattern 'getBaseDecayForAttackingEntity|instanceof io.github.etim.etim.metal'
```

## §8 未覆盖面（不补白）

1. **hoe／锈剪 off 相**：禁点（off 相吞链＝0 磨损非 vanilla 2，T-4／C-2 已登记），本批不测，另批。
2. **unbreaking 减免面**：本窗全白板栈，行值＝名义衰减；有附魔时行值≠实磨（B-4 家族，D-3(a) 不扩批）。
3. **配方面（metal gear 新配方）**：本批只判损耗判据，配方可达性未入窗（C-4）。
4. **`mattock` 破块面 0.4F**（`ETIMMining.java:415-416`）：D-1(c) 只删攻击特判，破块分支独立在位但本窗不测（属破块批）。

## §9 自报（机械核讫）

> 文件：`testharness/reports/extreme-W42-verdict.md`｜**18,041 B**｜175 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`35D1485CE33382E119FAE624D207C4BE0066BA986563727F134F03F2DE2AFD34`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`71DBF0FAB79DBA8FE3D61358F4F51E22114F5C4DC9ACB12580A27B7DEF296A5B`
> 判点 11（W-42a…k）｜✓ 11 / ✗ 0｜账 A `attacking=5 ok:true`／G `attacking=0 ok:true`｜冲突 A0 B1 C6｜待裁 D-3
