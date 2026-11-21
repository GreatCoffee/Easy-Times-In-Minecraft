# 饥饿批 · **W-B5 巨型落块扣饿闸判决**（place-hunger stamp 修，HEAD `eafe3c7`）

> **执行方**：会话七（etim-verification）｜**日期**：2026-11-05（CST）｜**窗口形态**：**正式 3 boot**（b1 主判面／b2 重载＋第三方巨型样本／b3 二次重载）＋ pilot 1 boot ＋ diag 1 boot；**0 客户端／0 产品码／0 rebuild**
> **报告字节规格**：`10,265 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 13 / ✗ 4｜85 行`
> **判决源**：W-B5 任务书（2026-11-05，用户甲判）＋ audit20 条 285-286 ＋ R196 一手 `EntityPlayer.tryPlaceHeldItemAsBlock:2654-2661`（唯一放置扣饿口）＋ Forge `ForgeHooks.onPlaceItemIntoWorld`（`ItemStack.java:200`）＋ `BlockEvent.MultiPlaceEvent extends PlaceEvent`（`BlockEvent.java:273`）
> **钉值**：HEAD **`eafe3c7`**（窗内零提交）｜release 958,013 B `0C65E2C5…F885`｜dev 939,147 B `ABB08A53…62DB`｜sources 871,323 B `87B2BB49…7EF8`｜refmap 双树 74 类键／164 面｜mixins **70**＋client 10｜cfg 235 键（`farmDebugLog`／`foodDebugLog` 窗内 true，收口 false）｜obf 30,524 B `262BFF5E…C9AD` 未动
> **判决**：**PASS**（R1／R2／R2ctl／R3／R3b／R4／R5 全 ✓，**✓7／✗0**）｜**A 0／B 1（新增静态 B-6）／C 1（新增 C-17）**
> **一句话**：stamp 闸把「巨型整树落块」从 4 次人工点击里干净摘了出去——**4 次巨型击 → 4 行 `placeDrainDeny src=giantGen hardness=0.2`、0 行 `placeDrain`**；同一窗口里 **4 次人工摆石 → 4 行 `placeDrain hardness=1.5 base=1.5`、0 行 deny**。R196「放置扣饿只走 tryPlaceHeldItemAsBlock」的面被保住了，1.12 的 Forge 快照包裹不再顺带扣饿。

## §0 逐点表

| 判点 | 判行（anchor） | 预期 | 实测 | 判 |
| --- | --- | --- | --- | --- |
| **R1** 菌丝 TOP 链（室内 6 击） | `chain=mycelium roll=none stage=n/3 giant=0\|1` ↔ `placeDrainDeny src=giantGen hardness=0.2` | 第 3／6 击巨型；每巨击 1 deny；全窗 `placeDrain`＝0；每击 held −1 | 行序 **`1/3,2/3,G,1/3,2/3,G`**；2 巨型 base 块 testforblock 双命中；**deny 2 行／placeDrain 0 行**；Δ**−1×6**；judged 手 0 重试（attempts 全 1） | ✓ |
| **R1-配对** | 每巨击 `FarmLog giant=1` ↔ 1 行 deny | 一一对应，非巨击 0 food 行 | 第 3／6 击各 1 行 deny；其余 4 击 food 0 行（4 次非巨击的 stage 递增不产快照、不发事件） | ✓ |
| **R2** 红点击臂（合法穗位，≤12 击） | `kind=red roll=… stage=…` ↔ deny | Δ−1、0 placeDrain；巨型击 deny `hardness=0.2` | **第 3 击即巨型**（`1/3,2/3,G`）；deny **1** 行、placeDrain **0** 行；Δ**−1×3**；base 块命中；按任务书「首 giant 即停」 | ✓ |
| **R2ctl** 露天对照 | `gate=deny … legal=0` | 只踩合法门、白不耗 | `ground=1 out=1 legal=0 pos=216,140,700`；Δ**0**；food 0 行 | ✓ |
| **R3** 人工摆石 ×3（生存手） | `placeDrain hardness=1.5 base=1.5 mod=1.0` | 3 行照旧、无 deny | **3 行 `base=1.5`**、deny **0**；3 块 testforblock 到位；Δ−1×3 | ✓ |
| **R3b** 巨击后摆石（b2） | 同上 | 豁免只限同 tick，不外溢 | 巨击后 2.2 s 摆石 → `placeDrain 1.5`、deny 0、块到位 | ✓ |
| **R4** 零回归 | `stage=`／`outdoor=1`／`roll=none` | 照 FM7v2 判值不动 | 重种前 `1/3,2/3` → 重摆 → **`1/3`**；b1 `1/3` → 停服 → **b2 载后 `2/3`**；b2 `1/3` → **b3 载后 `2/3`**，两次块均存活；室外 `outdoor=1 stage=-1` 白耗、Δ−1、存活；菌丝臂 `roll=none` 不动 | ✓ |
| **R5** 收口 | 钉值五项 | 起收同值 | §5（全同；mixinFail 0×3；端口 0；crash 21；世界删） | ✓ |

> 判格 7＝**✓ 7／✗ 0**。巨型事件 **4**（R1×2＋R2×1＋R1b×1），人工摆块 **4**（R3×3＋R3b×1），**4 deny＋4 placeDrain 恰好分流，无一例串门**。

## §1 机制裁定：为什么「一次巨击恰一行 deny」

- 巨型的整树落块发生在 `generateBigMushroom` 内、`ForgeHooks.onPlaceItemIntoWorld` 的 `captureBlockSnapshots` 窗口里（`ItemStack.java:200`）。`onItemUse` 返回 SUCCESS 后，Forge 用捕获到的快照列表发**一个** `MultiPlaceEvent`；该类 `extends PlaceEvent`（`BlockEvent.java:273`），所以 `ETIMFoodStatsEvents.onPlaceBlock` 只收到 **1 次**回调——不是「~百块爆 ~百行」。
- 该事件的 `placedBlock` 取首个快照的当前态＝被巨型顶替的基座菇块（hardness **0.2**），故 deny 行恒为 `hardness=0.2`。
- `chargePlace` 在**同 tick** 见到 `lastCodeGrownTick` → 记 deny 并 return，池不动（b1 三次巨击前后未见任何 `placeDrain` 的池增量行）。
- 非巨型点击（stage 1/3、2/3、白耗、以及 `-1` 未中）**不改方块**：TE 写入不进 `blockSnapshot` 捕获，快照数 0 → 不发事件 → 0 行。这与 FM7v2 观察到的「只有巨击有 0.2 行」完全同构。
- 人工摆石＝单快照 → `PlaceEvent`（非 multi）→ 正常 `chargePlace` 1.5；stamp 未置位，闸不拦。

## §2 判据行样本（正本 `f7-wb-b5-b1.out`／`-b2.out`）

- R1 第 3 击：`[FarmLog] fertilize src=manure chain=mycelium roll=none stage=3/3 giant=1` ↔ `[FoodLog] ETIM_F7 (191) placeDrainDeny src=giantGen hardness=0.2 (code-grown series; R196 face = tryPlaceHeldItemAsBlock only)`
- R1 第 6 击：同上第二对（同一秒内 FarmLog 在前、deny 在后）。
- R2 第 3 击：`[FarmLog] fertilize src=manure kind=red roll=… stage=3/3 giant=1` ↔ 同型 deny 1 行。
- R1b（b2）第 3 击：`chain=mycelium … stage=3/3 giant=1` ↔ 同型 deny 1 行（第三方样本，`player (54)`）。
- R3：`placeDrain hardness=1.5 base=1.5 mod=1.0 amount=1.5 pool=…` ×3，无 deny。
- `satiation point` 行（b1 1 行、b2 1 行）是饥饿池跨阈值时的既有结算行，与 stamp 无关，如实记账。

## §3 豁免不外溢

- R3 三块石头落在同一列（y=139/140/141），每块一行 1.5、deny 0 ⇒ 普通放置路径未被 stamp 影响。
- R3b 在 b2 巨击后 2.2 s（≈44 tick）再摆一块，仍 `1.5` 正常扣 ⇒ 闸是**同 tick** 语义，不是粘滞开关。
- R2ctl 露天对照仍是 `legal=0`、Δ0 ⇒ 本轮修没有改动红臂双门（A-1 面保持）。

## §4 零回归

- 五通道 Melee/Mining/Butch/Arrow/Ench **全 0**（b1/b2/b3）；`entity`／`fish` 亦 0；无 `walkDrain`（tp＋noPhysics 不产）。
- 菌丝臂每击 `roll=none`（R1 6/6、R1b 3/3、R4 系列）⇒ 无掷面未被动过。
- 红臂掷中序 `1/3→2/3→G`（第 3 击）与 FM7v2 同构；`-1` 白耗面本轮未再采样（R2 3 击即中），由 FM7v2 判值承接。
- 室外白吃面 `outdoor=1 stage=-1`、Δ−1、菇存活 ⇒ B-4 面未动。
- stage 载位跨 2 次停服两次复核（`1/3→2/3`）⇒ A-2 面未动。

## §5 R5 收口

| 项 | 值 |
| --- | --- |
| HEAD | 起 `eafe3c7`／收 `eafe3c7`（`eafe3c7..HEAD` = **0** 提交） |
| jar | release 958,013 B `0C65E2C51E5B0D3721F26F7656357168D6907390EF3097C99224344A65C0F885`；dev 939,147 B `ABB08A530EEED1970470DC35852EDB87DA1E03A285343D6D8889FD8B7FFC62DB`；sources 871,323 B `87B2BB491BDC45953DEBF951CA4F987836E6290804C145062821BB1337F77EF8`（起收同值） |
| MK | refmap 74 类键／164 面（双树同）；mixins **70**＋client 10；mixinFail **0**（b1/b2/b3 各 0） |
| cfg | 235 键不动；`farmDebugLog=false`／`foodDebugLog=false`（窗内 true）；收口 44,174 B／`D9E05D4EAC685DFEB44A909D052F8F3980C1BA64A460D8AEC9773E961C7592B1`（入口 44,173 B／`90652ABD…4E9A` 为 food=true；本轮按任务书把 food 回 false，键数不变） |
| obf | 30,524 B／`262BFF5E76480CDEF6749292268D425A1446265E60D88B9224DB5C123E80C9AD` 未动 |
| props | 938 B／`1C815ED25EF66374C3F698915CD32C2AFF9E662C1114D7883131D165D88BEC58`／`level-name=world`（起收同值） |
| 端口／崩溃／世界 | 25565 监听 **0**；crash-reports **21**（无新增）；判窗世界 `b5j` 与 pilot/diag 世界 `b5p` 已删；无残留**游戏** JVM |
| 停服 | b1／b2／b3 均 exitCode **0**＋`BUILD SUCCESSFUL` |

## §6 冲突分级

- **A 级：0**（R196 放置扣饿面已按用户甲判收口；无判点 FAIL）。
- **B-6（新，静态／跨玩家）**：`lastCodeGrownTick` 是**全局单值**，不是按玩家。单 bot 窗口无法触发，但多人服里若玩家 A 的巨击与玩家 B 的普通摆块落在**同一 tick**，B 的 1.5 扣饿会被误 deny。建议另批把 stamp 收成 per-player（或按 `EntityPlayer` 弱引用表），本批判面不含。
- **C-17（新，工装）**：世界生成大卡顿（pilot 里 `Can't keep going… skipping 156 tick(s)`）之后的首个粪击可能整包静默（有 `[TestLog] step=useblock` 但无 FarmLog、held 不动）。判窗驱动已加「无 FarmLog 行且探针块仍在 → 重试（≤3 次，attempts 记账）」闸；正式窗 judged 手 **0 重试**。
- C-11（useblock 预热 1 击）／C-12（同态 setblock 先 air）／C-16（testforblock NBT 段）沿用，本窗未踩坑。

## §7 自报（机械核讫）

> 正本：`testharness/reports/b5-verify-verdict.md`｜byte 五项：`10,265 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 84（split 85）`
> 三口径（家族同型）：**甲＝全档零位 raw**（64 位十六进制串整体替换为 64 个 `0` 后的 UTF-8 SHA-256）；**乙＝零位＋LF 归一**；**丙＝零位＋行链**（按 `\n` split 全元素逐行 `sha256` 后 `\n` join）。
> SHA-256 甲（全档零位）`4C0D09B0A186A348325FEC02B74A2B8091D2B8D5378E1BB175321319ED4C0733`
> SHA-256 乙（LF 归零零位）`4C0D09B0A186A348325FEC02B74A2B8091D2B8D5378E1BB175321319ED4C0733`
> SHA-256 丙（行链零位）`2B6C9A8905FD330C5E3A488F415EECD45D3E05C7EE0169E4A893EB7F3778A536`
> 判格 7＝✓ 7／✗ 0｜R1 6 击 `1/3,2/3,G,1/3,2/3,G`、deny 2／placeDrain 0｜R2 3 击 `1/3,2/3,G`、deny 1／placeDrain 0｜R2ctl `legal=0` Δ0｜R3 3 石 `1.5×3`／deny 0｜R3b 巨后石 `1.5`／deny 0｜R4 重种 `1/3`、载后 `2/3`×2、白吃存活｜R5 全同
> 窗口账：正式 3 boot（judged）＋ pilot 1 ＋ diag 1；0 rebuild／0 客户端／0 产品码；引擎行 `FarmLog` b1 15／b2 5／b3 1，`FoodLog` b1 7／b2 3／b3 0（deny 4＋placeDrain 4＋satiation 2）
