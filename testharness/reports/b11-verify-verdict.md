# 动物食拾 · **W-B11 判决**（B-11 批，EntityAIMoveToFoodItem 家族，HEAD `275c5bc`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-06（CST）｜**窗口形态**：**主窗 2 boot**（b1＝R0/R1–R7/R12-pre；b2＝旗下面 R8）＋**补充窗 3 段 4 boot**（补1＝needs 手喂＋needs=false 旗下面；补2＝手喂/InLove 复核；补3＝`/replaceitem` 干净手喂）；**0 客户端／0 产品码／0 rebuild**；单假人 `ETIM_F7`
> **报告字节规格**：`18,227 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 15 / ✗ 4｜93 行`
> **判决源**：W-B11 任务书（2026-11-06，HEAD `275c5bc`）＋ `playground/audit/animalPickup-立项摸底.md` ＋ audit20 条 306/307
> **钉值核验**：HEAD **`275c5bc`**（窗内零提交）｜release **1,009,616 B** `478427D8…C72D33A` 相符｜dev **989,835 B** `D286075F…3604C46F` 相符（任务书 dev SHA 截断 60 位，见 C-11-1）｜sources **921,213 B** `9DF43430…B0DBA84C` 相符｜mixins **77**＋client 10｜refmap **81/176**（双树同，dual 352）｜cfg **注册 245**（文件 247）
> **判决**：**PASS**（R0..R9 含 R3b 共 **11 判点 ✓11／✗0**）｜A 0／B 0／C 10（工装与口径，均不涉判值）
> **一句话**：牛能自己看见 5.63 格外的地面小麦、走完 8 点路径（`path=len=8 idx=7`）并吃掉（serve add=0.5，item 1→0）；饱食+非 well 的 family_gate 与幼崽 child 两门拒食（item 不动、零起径、无子代、InLove 0、Age 只自然 +1/tick）；cooldown 面 401 次强制调用恰一件 serve、20 s 内 0 件、到期后同一堆再吃；全血+well 出 love=true（InLove 552）；石头不开扫描；Count=3 堆吃一件后 Count=2 且 Age=-18000；needs=false 时 foodseek/foodground 全零、手喂与喂水仍走 production 旗的 ETIM 行事。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R0** boot 面 | `Done (`＋`mixinFail`；mixins 77+10／refmap 81/176 双树／cfg 245 | 双面相符 | b1 `Done (5.300s)`、b2 `Done (1.004s)`，`mixinFail` **0×2**；补齐 4 个补充 boot 亦 0（6/6）；`mkCounts` refmap **81/176**（双树同，dual 352）、manifest **77+10**；cfg `codeKeys=245`／`fileKeys=247`；b1 `needs=true`＋`production=true`（双旗同开），b2 `needs=false` | ✓ |
| **R1** 走近臂＋吃取 | `foodseek src=cow start … dist≈5.x`＋`foodground src=cow serve add=0.5`＋item 1→0 | 起径＋抵达吃取＋堆消失 | 新世界 pen 牛＋5.63 格外小麦：`[AILog] foodseek src=cow start item=minecraft:wheat dist=5.63 entity=EntityCow#2207` → 牛走到 `304.4,849.9`，`[FarmLog] foodground src=cow serve add=0.5 food=0.90 hp=1.00 love=false item=minecraft:wheat cooldown=400`；`foodseek … reset path=len=8 idx=7 fin=false targetLiving=false`；地面 item 前置 `Count=1`→ 复核 `found nothing` | ✓ |
| **R2** 拒食门 deny | `foodground src=cow deny cause=family_gate`＋item 不动＋零 serve＋零起径＋无子代 | 三证＋无 vanilla 面 | fresh 牛＋`water=0.2 food=1.0 hp=10`（全血＋非 well＋非 hungry）：**26 条** family_gate deny 行（1 Hz 观察位）、`serve=0`、`seek=0`、item `Count=1` 存活、牛数 **1→1**（无子代）；补2 活体 NBT `InLove:0` | ✓ |
| **R3** cooldown 面 | 401 次调用恰一件 serve；20 s 内 0 件；到期再吃 | 三支成立 | 先自然吃一件（`serve food=0.80 love=false`，cd=400）→ 第二件＋`/etest prod … ground=401`（401 次 groundEatTick）→ **恰 1 行** serve (`item=minecraft:wheat`，item 随后 `found nothing`)；第三件在 cd 窗内 4 s **0 serve**、`Count=1` 存活；cd 到期后同一堆被自然吃掉 **1 行**（`food=1.00 love=false`） | ✓ |
| **R3b** love 臂 | `serve … love=true`＋InLove>0 | love=true＋NBT 旁证 | 全血＋well＋hungry 种子＋`ground=401`：`[FarmLog] foodground src=cow serve add=0.5 food=0.70 hp=1.00 love=true item=minecraft:wheat cooldown=400`，**恰 1 行**；同刻活体 NBT `InLove:552`（600−48 tick） | ✓ |
| **R4** 非食不扫 | 零 `foodground/foodseek` 行 with `item=minecraft:stone` | 零行 | stone 置拾距内并两次贴牛：`foodground/foodseek` 行 **0**、`item=minecraft:stone` 行 **0**（`isFoodItem` 在扫描与吃取两处都先滤） | ✓ |
| **R5** 地面堆消一件 | serve＋`Count=3→2`＋`Age=-18000` | 一件结算＋防消散冻结 | `Count=3b` 小麦堆：吃前 dump `Count=3 Age=12` → serve `add=0.5 food=0.90 love=false` → 吃后 dump `Count=2 Age=-17973`（-18000＋约 27 tick 自然老） | ✓ |
| **R6** 幼崽门 | `deny cause=child`＋item 不动＋Age 无 +120 跳 | 零 ageUp | `Age:-24000` 幼牛＋`water=0.3 food=0.2`：17 条 `deny cause=child` 行、`serve=0`、`seek=0`、item `Count=1` 存活；Age 四读（第 2 读空）`-23930 → -23734 → -23636`，每段＝elapsed tick×1（9.8 s=196 tick、4.9 s=98 tick），无 vanilla `ageUp` 的 +120 跳 | ✓ |
| **R7** 零回归抽验 | 手喂 serve＋手喂 family_gate deny＋milk serve/deny＋蛋泵 egg | 照旧零漂 | 手喂（补3，干净窗）`food src=cow serve add=0.5 food=0.60 hp=0.70 love=false`＋手牌 `wheat=0`＋**零 foodground**；手喂 deny `cause=family_gate food=1.00 hp=1.00`＋手牌 `wheat=1`；`milk src=cow serve take=100 meter=0`＋`deny meter=0 need=100`；蛋泵 `counter=200 step=600` → **2 行** `kind=egg`（双鸡 counter=0） | ✓ |
| **R8** 旗下面 | needs=false：零 `foodground src=`／`foodseek src=`；手喂/喂水照 ETIM 行 | 无效＋两行 | b2 全档 `foodground src=` **0**、`foodseek src=` **0**（2 件小麦在牛旁 25 s 仍 `Count=1`，牛数 1）；手喂 `food src=cow serve add=0.5 food=0.50 hp=0.70 love=false`（手牌 0）；喂水 creative `water src=cow serve add=1.0 meter=1.00`（`water_bucket=1,bucket=0`）＋survival 同 serve（`water_bucket=0,bucket=1` 换空桶） | ✓ |
| **R9** 收口复盘 | 双旗还原；cfg 起收同 hash；钉值三同；世界删、端口 0 | 全回位 | cfg 48,125 B `7EE89409…A94BA6B`（**起收同 hash**）、`codeKeys=245`／`fileKeys=247`、`needs=true`／`production=true`／`farm=false`／`mob=false`；jar 三件与 mk 起收同值；obf 30,524 B `262BFF5E…` 未动；props 941 B `D6A15630…` 起收同 hash；crash **21→21**；端口 **0→0**；HEAD 起收 `275c5bc`、窗内 **0** 提交；`w-b11a`/`w-b11p*`/`w-b11s*` 全删；6 boot 全 `Done`＋`BUILD SUCCESSFUL`、0 残留游戏 JVM | ✓ |

> 判格 **✓11／✗0**；A 0／B 0／C 10（见 §5）。

## §1 判行样本（正本 `f11-b11-verify-b1.out` / `-b2.out` / `f11-b11-supp*-b1.out`）

- **R1**：`[AILog] foodseek src=cow start item=minecraft:wheat dist=5.63 entity=EntityCow#2207`；`[FarmLog] foodground src=cow serve add=0.5 food=0.90 hp=1.00 love=false item=minecraft:wheat cooldown=400 entity=EntityCow#2207 [server]`
- **R2**：`[FarmLog] foodground src=cow deny cause=family_gate item=minecraft:wheat entity=EntityCow#2209 [server]`（26 行）；补2 活体 NBT `"etim:livestock":{…}` 同档 `InLove:0`
- **R3**：自然 `… serve add=0.5 food=0.80 hp=1.00 love=false item=minecraft:wheat cooldown=400 entity=EntityCow#2214`；强制 `[FarmLog] prod radius=10 … foodground=401 set=1 kinds(1)=cow`＋恰一行 serve；到期 `… serve add=0.5 food=1.00 hp=1.00 love=false … cooldown=400`
- **R3b**：`[FarmLog] foodground src=cow serve add=0.5 food=0.70 hp=1.00 love=true item=minecraft:wheat cooldown=400 entity=EntityCow#2214 [server]`；`InLove:552`
- **R5**：`The data tag did not change: {Item:{id:"minecraft:wheat",Count:3b,…},Age:12s,…}` → `{…Count:2b,…,Age:-17973s,…}`
- **R6**：`[FarmLog] foodground src=cow deny cause=child item=minecraft:wheat entity=EntityCow#2225 [server]`；NBT `Age:-23930` → `-23734` → `-23636`
- **R7**：`[FarmLog] food src=cow serve add=0.5 food=0.60 hp=0.70 love=false entity=EntityCow#2212 [server]`（补3）；`[FarmLog] food src=cow deny cause=family_gate food=1.00 hp=1.00 entity=EntityCow#2230 [server]`；`[FarmLog] milk src=cow serve take=100 meter=0`／`deny meter=0 need=100`；`[AILog] production src=chicken kind=egg drop=1 counter=0`×2
- **R8**：`[FarmLog] food src=cow serve add=0.5 food=0.50 hp=0.70 love=false entity=EntityCow#141 [server]`；`[FarmLog] water src=cow serve add=1.0 meter=1.00 entity=EntityCow#125 [server]`（creative 与 survival 各一行；survival 后 `water_bucket=0,bucket=1`）
- **工装回行**：`[FarmLog] prod radius=10 … water=0.0 food=0.3 hp=10.0 … foodground=- set=1 kinds(1)=cow`

## §2 机制与口径

- **M1 走近臂**：`MixinEntityAnimal.<init>` TAIL 注入 `addTask(1, new ETIMEntityAIMoveToFoodItem(this))`（`MixinEntityAnimal:78-82`）；`shouldExecute` 门序＝cooldown>0→false、`rand.nextInt(40)>0`→false、`canEat`（EntityAnimal :257-260＋EntityLiving :1330-1332）→false，然后 `expand(16,4,16)` 内滤 `isFoodItem`；`choosePath` 逐件 `willPickUp(=willEatCause)`＋`getPathToXYZ(…,16)`，只收「终点恰等于 item 方块位」的最短路径（R196 `EntityAIMoveToItem :30-45`）；`startExecuting` 走 `nav.setPath(path,1.0F)` 并出 `foodseek start` 行（mobDebugLog 面）。
- **M2 吃取臂**：`groundEatTick` 挂在既有 `onLivingUpdate` 的 needs 门内（`ETIMLivestockEvents:165`）；门＝`!remote&&!dead&&hp>0`；`cooldown>0` 先减一 tick 后再判；拾距＝`getEntityBoundingBox().grow(1.0,0.25,1.0)`；`willEatCause` 的 family 门先行、`canEat` 次之、`isFoodItem` 末（拒＝`family_gate`/`in_love`/`child`/`dead`/`hp_low`/`not_food` 观察行，1 Hz）；吃＝`eatCore`（addFood 0.5 → love 臂 pre-heal → heal max×0.5），随后 `shrink(1)`＋pop 音（0.2F，pitch±）＋空 `setDead`／非空 `age=-18000`＋`cooldown=400`＋`break`。
- **M3 cooldown 语义**：一次吃结算把 `cooldown` 置 400；自然 tick 与强制 `groundEatTick` 都在同一计数上减。因此「`ground=401` 恰一件」与「20 s 内第二件不动、到期再吃」是同一算术的两面；本窗把 eater 的血量压到 5（hp=5 种子），使 `love` 臂不触发 `inLove 600`——否则满血+well 的吃会把 `canEat` 关 30 s，把 cooldown 面遮住（C-11-4）。
- **M4 食单**：cow/sheep=wheat、chicken=seeds、pig=carrot|brown mushroom（`isFoodItem`，批二已锚，本轮零新锚）；非食（stone）在扫描与吃取两处都被 `isFoodItem` 先滤，故零行。
- **M5 持久面**：`pickupCooldown` 是 capability 的 transient 字段（R196 同型），**不进 NBT**；本批判点不含重启读回（R196 同型 transient；任务书无重启面）。

## §3 零回归与通道

- **b1 通道**：`[FarmLog]` **78**（`foodground src=` **50**＝7 serve＋43 deny；`foodseek src=` **2**＝1 start＋1 reset；`prod` 回行 16）；`[AILog]` **2739**；`[DamageLog]` **236**＝全 `src=outOfWorld`（分批清场 kill，无 player/mob 行）；`[TestLog]` 5；`[MeleeLog]`/`[MiningLog]`/`[ButchLog]`/`[ArrowLog]`/`[CapLog]`/`[FoodLog]`/`[EnchantLog]` **全 0**。
- **b2 通道**：`[FarmLog]` **5**（全为 `prod` 回行，`foodground src=` **0**、`foodseek src=` **0**）；`[AILog]` **46**；`[DamageLog]` **88**（全 outOfWorld）；`[TestLog]` 5。
- **deny 行分布**（b1）：`family_gate` **27**（食拾 **26**＋手喂 **1**）／`child` **17**；无 `not_food` 行（R4 的 stone 连扫描都不过）。
- **prod 回行陷阱**：`[FarmLog] prod … foodground=-` 含字面 `foodground`；用裸 `/foodground/` 统计会把回行算成判行。本报告一律用 `foodground src=`／`foodseek src=`（C-11-9）。

## §4 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `275c5bc`／收 `275c5bc`（`275c5bc..HEAD` = **0** 提交） |
| jar | release 1,009,616 B `478427D8A86D84FD4D1700CC17007A2406B7196BD039B7263E9FAC01BC72D33A`；dev 989,835 B `D286075FF7DBE31451FD6712120C47ABEBAB003CD6977956FD50E0633604C46F`；sources 921,213 B `9DF43430871CF99600638A9E768F0EF550EE95A94576D6A99A312E8EB0DBA84C`（起收同值） |
| MK | refmap **81** 类键／**176** 面（双树同，dual 352）；mixins **77**＋client 10；mixinFail **0**（6/6 boot） |
| cfg | 注册 **245**（`config.getX("…")` 计数 245；文件 **247**＝245＋孤儿 `qualityDefaultMax`／`mobwakeRarity`）；48,125 B／`7EE894091800B7E3E18AEE1144F59B193C4428E98AB9106322B949375A94BA6B`（起收同 hash）；收口 `needs=true`／`production=true`／`farmDebugLog=false`／`mobDebugLog=false` |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 941 B／`D6A1563046EF987DA038E55AA1B85F3C9E8F9148AF42DDC709C1F7301DF28E4C`／`level-name=f10pgb13`（窗前快照值，起收同 hash；见 C-11-7） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `w-b11a`/`w-b11p`/`w-b11p2`/`w-b11s`/`w-b11s2`/`w-b11s3` 已整档删除；无残留游戏 JVM |
| 停服 | 6 boot 全部 `exitCode 0`＋`BUILD SUCCESSFUL`；`Done` 5.300／1.004／5.152／1.048／5.328／5.194 s；mixinFail 0×6 |

## §5 冲突分级

- **A 级：0**。
- **B 级：0**（走近/吃取/拒食/cooldown/持久面均有可 grep 判行，R2 的 InLove 由补2 补齐）。
- **C 级：10**
  - **C-11-1**（簿记·钉值字面）：任务书 dev SHA 只写到 60 位（`D286075F…6977956E0633604C46F`），实 jar 为 64 位 `D286075FF7DBE31451FD6712120C47ABEBAB003CD6977956FD50E0633604C46F`（字节 989,835 与之相符）。判值以实算 64 位为准。
  - **C-11-2**（1.12 载体·`/give` 假实体）：1.12 `CommandGive:74-90` 在整叠入包后 `dropItem`＋`EntityItem.makeFakeItem()`（`EntityItem:590-594`＝`setInfinitePickupDelay()`＋`age=lifespan-1`，只活 1 tick 的展示实体）；吃取臂不认 `pickupDelay`（R196 无此概念），needs=true 时会把这枚假实体当食物吃掉（主窗 b1 R7 手喂前多出 1 行 `foodground serve`，把该面指纹抬到 `food=1.00/hp=1.00`）。判值不受影响；补3 改用 `/replaceitem entity … slot.hotbar.0` 取得干净行（`add=0.5 food=0.60 hp=0.70`）。后续手喂面一律 `replaceitem` 或 give 后先 `kill @e[type=item]`。
  - **C-11-3**（判据·R2 NBT 旁证）：主窗 b1 的牛在 5×5 dump 框内已走位到框外（`Selector … found nothing`），InLove 旁证缺失；补2 以「锚定牛＋活体坐标框」复取 `InLove:0`。主判值（deny 行＋item 存活＋牛数 1→1）不依赖该旁证。
  - **C-11-4**（判据·R3 口径）：任务书 R3 写「fresh cd=0＋water=0.0」，但自然吃一件后 `food` 升到 0.8 会撞 family_gate，满血+well 的吃又会置 `inLove 600` 把 `canEat` 关 30 s——两条都会遮住 cooldown。本窗改为全程 `hp=5`（love 臂不触发）＋锚定落点＋「summon＋ground=401 同批下发」，把唯一阻塞态隔离成 `pickupCooldown`；判值（401 调用恰一件／20 s 内 0 件／到期再吃）逐字保留。
  - **C-11-5**（判据·R6 年龄轨迹）：四读中第 2 读空（幼牛走位出框）；三读 `-23930 → -23734 → -23636` 的间隔分别 196／98 tick，与 elapsed tick 一一对齐，足以排除 vanilla `ageUp` 的一次性 +120。
  - **C-11-6**（工装·R8 喂水 reach）：主窗 b2 的喂水点击落 `reach denied: etim.reach.deny_interact 1.7976931348623157E308`（tp 后客户端位置/朝向不同步，射线未命中，距离＝Double.MAX）；补1 以 creative（skip reach）＋survival 各一次重取，均出 serve 行，survival 另行换空桶。
  - **C-11-7**（簿记·props 基线）：窗前 props 为主会话 b11 烟测遗留（`level-name=f10pgb13`，941 B `D6A15630…`），本窗按窗前快照原样回写（起收同 hash）；`run/f10pgb11`、`run/f10pgb11nav`、`run/f10pgb13` 等烟测世界未动。
  - **C-11-8**（簿记·HEAD 与 jar 的文件面对应）：`src/main/resources/mixins.etim.json` 工作树含 `EntityItemAgeAccessor` 一行（未提交，HEAD `275c5bc` 的提交内 manifest 仍 76）；jar 的 77 mixins 即由该工作树行构建。本窗未 rebuild、未改该文件，收口原样保留，交主会话收口时一并入账。
  - **C-11-9**（通道·prod 回行污染）：`[FarmLog] prod … foodground=-` 含字面 `foodground`；任何 `/foodground|foodseek/` 的粗筛都会把 16＋5 条回行算成判行（本窗 b2 首版即误记 1 行）。判读一律用 `foodground src=`／`foodseek src=`；已在 §3 固化。
  - **C-11-10**（序位注记）：1.12 `initEntityAI()` 在 `EntityLiving` 构造器内调用（`EntityLiving:112-115`），宿主的 `EntityAIPanic`（同 priority 1）先登记；`MixinEntityAnimal.<init>` TAIL 注入的本方任务在其后，同优先级时 panic 先跑。本窗无受击面（DamageLog 无 player/mob 行），无判值影响；若后续做「受击逃逸 vs 食拾」抢占面需另裁。

## §6 自报（机械核讫）

> 正本：`../../testharness/reports/b11-verify-verdict.md`｜byte 五项：`18,227 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 92（split 93）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`A522C1A65BC03513B05EBCDC5EDC69A743C12803CA907FF0FEB6C61F09302C4E`
> SHA-256 乙（LF 归零零位）`A522C1A65BC03513B05EBCDC5EDC69A743C12803CA907FF0FEB6C61F09302C4E`
> SHA-256 丙（行链零位）`88078777B60775E525584349EF289AB9ADA5B17440D4FE30F1A8875F1493E3E5`
> 判格 11＝✓ 11／✗ 0｜R0 双 boot 面／R1 seek 5.63＋8 点路径＋serve 0.90＋item 消失／R2 family_gate 26 行＋item 1＋牛数 1→1＋InLove 0／R3 自然 1＋强制恰 1＋cd 窗 0＋到期 1／R3b love=true＋InLove 552／R4 stone 0 行／R5 3→2＋Age -18000／R6 child＋Age 自然轨／R7 手喂 0.60/0.70＋deny＋milk 双行＋egg 2／R8 needs=false 全零＋手喂/喂水三行／R9 cfg 245(247) 起收同 hash＋6 boot 全绿
> 窗口账：主窗 2 boot＋补充 4 boot＝6 boot；0 rebuild／0 客户端／0 产品码；b1 `[FarmLog]` 78／b2 5；mixinFail 0×6；三口径数字由 `f7-wb-spec2.js` 自指迭代至稳定。
