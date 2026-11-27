# 饥饿批 · **W-B6 stamp per-player 化判决**（同 tick 跨玩家误 deny 修，HEAD `ade1bcc`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 2 boot**（b1 主判面／b2 重载保位）；**0 客户端／0 产品码／0 rebuild**／双假人 A=`ETIM_F7`、B=`ETIM_F8`
> **报告字节规格**：`9,953 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 16 / ✗ 4｜87 行`
> **判决源**：W-B6 任务书（2026-11-05，B-6 批）＋ audit20 条 288 债面 → 289 ＋ `ETIMEndurance` 两 stamp（`TILL_STAMPS`／`CODE_GROWN_STAMPS`，`WeakHashMap<EntityPlayer, Long>` identity 键＋同 tick consume-once）＋ `TestDriver` `[TestLog] step=useblock … tick=<worldTotalTime>` 锚
> **钉值**：HEAD **`ade1bcc`**（窗内零提交）｜release 958,492 B `5FA2731F…796D`｜dev 939,592 B `BD59BCF3…B53E`｜sources 871,688 B `602CC85A…FE87`｜refmap 双树 74 类键／164 面｜mixins **70**＋client 10｜cfg 235 键（`farmDebugLog`／`foodDebugLog` 窗内 true，收口 false）｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**PASS**（R1／R2／R3／R4／R5 全 ✓，**✓11／✗0**）｜**A 0／B 0／C 0**
> **一句话**：同 tick 的一对点击里，A 的巨型落块照旧被闸挡成 **1 行 `placeDrainDeny src=giantGen hardness=0.2`**，而同 tick 的 B 普通摆石**照常收 1.5**——旧全局单值 stamp 会把 B 一起 deny 的判别位，本轮 3 次同 tick 对（R1×2＋R2）全部按 per-player 正确分流。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1-①** 同 tick 锚（巨击对 ×2） | `[TestLog] step=useblock player=… tick=N` 两行 | 两行 tick 同值 | 第 1 轮 **446＝446**；第 2 轮 **623＝623**；两轮均 **attempts=1** | ✓ |
| **R1-②** A 侧 deny | `placeDrainDeny src=giantGen hardness=0.2`（A=`ETIM_F7`） | 每轮 1 行 | 2 轮各 1 行（`ETIM_F7 (191)`） | ✓ |
| **R1-③** B 侧收费（判别位） | `placeDrain hardness=1.5 base=1.5`（B=`ETIM_F8`） | 每轮 1 行（旧全局 stamp 会同 tick deny） | 2 轮各 1 行（`ETIM_F8 (996)`，pool 2.3860／4.2400） | ✓ |
| **R1-④** giant 行 | `FarmLog fertilize … chain=mycelium … stage=3/3 giant=1` | 每轮 1 行（共 2） | 2 行（与 2 行 deny 一一对应） | ✓ |
| **R2-①** 同 tick 锚（哈地对 ×1） | 两行 `tick=` | 同值 | **764＝764**；attempts=1 | ✓ |
| **R2-②** A 锄地扣饿 | `hoeDrain hardness=0.6 base=0.3 mod=1.0`（A） | 1 行 | 1 行（`ETIM_F7 (191)`，pool 1.4440） | ✓ |
| **R2-③** A 无放置扣饿 | `placeDrain …`（A） | 0 行（till 自事件 silent skip） | **0 行** | ✓ |
| **R2-④** B 同 tick 收费 | `placeDrain base=1.5`（B） | 1 行（旧全局 till stamp 会 silent skip B） | 1 行（`ETIM_F8 (996)`，pool 2.0220），farmland 命中 | ✓ |
| **R3** 时序弥散对照 | A 巨击单发 → deny；隔 1.4 s B 摆块 → 1.5 | 各自成立、无碰撞 | A `stage=3/3 giant=1`＋deny 1 行、A `placeDrain` 0；B `placeDrain 1.5` 1 行、deny 0；B 石块到位 | ✓ |
| **R4** 零回归 | 菌丝行序／重种／载后／白吃／五通道 | 照 FM7v2 判值不动 | 行序 `1/3,2/3,G`；重种 `1/3,2/3→1/3`；b1 `1/3` → b2 载后 `2/3`（块存活）；室外 `outdoor=1 stage=-1` 白耗、Δ−1、存活；五通道 Melee/Mining/Butch/Arrow/Ench 全 **0**；`entity`／`fish` 0；无 `walkDrain` | ✓ |
| **R5** 收口 | 钉值五项 | 起收同值 | §5（全同） | ✓ |

> 判格 11＝**✓ 11／✗ 0**。同 tick 对共 **3** 次（R1×2＋R2×1）；跨玩家分流样本 **3 deny（A）＋3 placeDrain 1.5（B）**，零串门。

## §1 机制裁定：为什么同 tick 不再误 deny

- 修复把两枚 stamp 从静态单值改成 `WeakHashMap<EntityPlayer, Long>`：`CODE_GROWN_STAMPS`（manure 巨击，`stampCodeGrown(player, tick)`）与 `TILL_STAMPS`（`chargeHoe` 后置位）；键是玩家对象的 identity（`Entity` 不覆写 `equals`），弱引用随登出／重生自清。
- 读侧 `chargePlace(player, hardness)` 先查本玩家的 till stamp（命中即 `remove` 并静默跳过），再查本玩家 code-grown stamp（命中即 `remove` 并记 deny 行）。因此 A 的巨击只吞掉 **A 自己**的同 tick 放置事件，B 的同 tick 摆石落到正常 `charge` → 1.5。
- 同 tick 的成立面：`/etest useblock` 由控制台线程入 `pendingCommandList`，在 `DedicatedServer.updateTimeLightAndEntities()` 里逐条执行并 `schedule(..., 1)`；`TestDriver` 在**同一 tick** 的 `ServerTickEvent.END` drain，`delayTicks 1→0` 立即执行。两条命令无 sleep 连发 ⇒ 同一 drain 内 FIFO 执行 ⇒ `[TestLog] tick=` 同值（446／623／764 三例实证，见 §2 原序）。
- 证据原序（b1 首轮）：`drive_queued` A → `drive_queued` B 同秒相邻两行，随后 `FarmLog giant=1` → `deny A` → `TestLog A tick=446` → `placeDrain B 1.5` → `TestLog B tick=446`。A 的 deny 发生在 A 自己的事件回调内，B 的 charge 发生在 A 之后同一 tick，互不读取对方 stamp。

## §2 判据行样本（正本 `f7-wb-b6-b1.out`／`-b2.out`）

- R1 第 1 轮同 tick 原序（`tick=446`）：
  `[EtimTest] … useblock BlockPos{x=170, y=139, z=700}` →
  `[EtimTest] … useblock BlockPos{x=204, y=138, z=690}` →
  `[FarmLog] fertilize src=manure chain=mycelium roll=none stage=3/3 giant=1` →
  `[FoodLog] ETIM_F7 (191) placeDrainDeny src=giantGen hardness=0.2 (code-grown series; R196 face = tryPlaceHeldItemAsBlock only)` →
  `[TestLog] step=useblock player=ETIM_F7 pos=BlockPos{x=170, y=139, z=700} tick=446` →
  `[FoodLog] ETIM_F8 (996) placeDrain hardness=1.5 base=1.5 mod=1.0 amount=1.5 pool=2.3859956` →
  `[TestLog] step=useblock player=ETIM_F8 pos=BlockPos{x=204, y=138, z=690} tick=446`
- R1 第 2 轮同型（`tick=623`，B 侧另带 1 行 `consumed satiation point`，为池阈值既有结算行，如实记账）。
- R2 同 tick（`tick=764`）：A `hoeDrain hardness=0.6 base=0.3 mod=1.0 amount=0.3 pool=1.4439924`；A **无** `placeDrain`；B `placeDrain hardness=1.5 base=1.5 mod=1.0 amount=1.5 pool=2.0220122`；till 后 `testforblock farmland` 命中。
- R3：A 单发 `stage=3/3 giant=1` ↔ `deny A`；1.4 s 后 B 单发 `placeDrain 1.5`、deny 0、石块到位。

## §3 零回归

- 菌丝臂行序 `1/3 → 2/3 → G`（R1 两轮 pre `[1,2]`；R3 `[1],[2],G`），`roll=none` 不动。
- 重种归零：`1/3,2/3` → 先 air 再 setblock → `1/3`。
- 载后保位：b1 末 `stage=1/3` → 停服 → b2 块存活、再击 `2/3`。
- 室外白吃面：`chain=mycelium roll=none outdoor=1 stage=-1 (no-grow; manure consumed)`、held −1、菇存活、food 0 行。
- 五通道 Melee/Mining/Butch/Arrow/Ench 全 0（b1/b2），`entity`／`fish` 0；无 `walkDrain` 行。
- FoodLog 通道：b1 共 10 行＝deny **3**（R1×2＋R3）＋`placeDrain` **4**（R1 B×2＋R2 B＋R3 B）＋`hoeDrain` **1**（R2 A）＋`consumed satiation point` **2**（B 池阈值）；b2 **0** 行。除判据三型外零新增。

## §4 R5 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `ade1bcc`／收 `ade1bcc`（`ade1bcc..HEAD` = **0** 提交） |
| jar | release 958,492 B `5FA2731F52CC9CB1DD2905DDCC76C2C38940065438D87040C3DE2F576F4B796D`；dev 939,592 B `BD59BCF3284F5BB72175DA687CEB1D1796E1494377D8719C4F52DBC6C8AFB53E`；sources 871,688 B `602CC85AABA1B1067B5CA96792C04A58489A9DCBCCF07D2B8E8F731201D1FE87`（起收同值） |
| MK | refmap 74 类键／164 面（双树同）；mixins **70**＋client 10；mixinFail **0**（b1/b2 各 0） |
| cfg | 235 键不动；窗内 `farmDebugLog=true`／`foodDebugLog=true`，收口均 **false**；收口 44,174 B／`D9E05D4EAC685DFEB44A909D052F8F3980C1BA64A460D8AEC9773E961C7592B1`（与入口同值——入口本就是双 false） |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 938 B／`1C815ED25EF66374C3F698915CD32C2AFF9E662C1114D7883131D165D88BEC58`／`level-name=world`（起收同值） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `b6j` 已删；无残留**游戏** JVM |
| 停服 | b1／b2 均 exitCode **0**＋`BUILD SUCCESSFUL` |

## §5 冲突分级

- **A 级：0**（B-6 债面已按 per-player 收口；无判点 FAIL）。
- **B 级：0**（同批把 till stamp 家族孪生面一并收成 per-player，R2 已实证）。
- **C 级：0**（本轮 judged 手 attempts 全 1，无重试；C-11／C-12 沿用未踩坑）。
- 备注（非债）：同 tick 对依赖「两条控制台命令落进同一 `pendingCommandList` 批次」，驱动以 `[TestLog] tick=` 同值作硬锚；本轮 3 对一次命中，未触发重试闸（驱动保留 ≤6 次重试与 attempts 记账）。

## §6 自报（机械核讫）

> 正本：`testharness/reports/b6-verify-verdict.md`｜byte 五项：`9,953 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 86（split 87）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`809EC4113FB404F80D703240E70DFBC374451EC86D84EE1E7B63506538B3FC76`
> SHA-256 乙（LF 归零零位）`809EC4113FB404F80D703240E70DFBC374451EC86D84EE1E7B63506538B3FC76`
> SHA-256 丙（行链零位）`6A7F67E04566563F681F0F81678EE62D83B25498FC34B2F59ADFC761AFADA8DE`
> 判格 11＝✓ 11／✗ 0｜R1 同 tick 446／623、deny 2／B 1.5×2｜R2 同 tick 764、A hoeDrain 1／A placeDrain 0／B 1.5×1｜R3 时序弥散 deny 1＋B 1.5 1｜R4 行序 1/3,2/3,G、重种归零、载后 2/3、白吃存活、五通道 0｜R5 全同
> 窗口账：正式 2 boot；0 rebuild／0 客户端／0 产品码；引擎行 `FarmLog` b1 14／b2 1，`FoodLog` b1 10／b2 0
