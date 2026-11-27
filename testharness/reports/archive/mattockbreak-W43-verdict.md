# mattock 破块衰减面批（mattockbreak）· W-43 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：单 boot（一次 `gradlew runServer`，零 rebuild、零 cfg 编辑）
> **报告字节规格**：`15,916 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 17 / ✗ 2｜165 行`
> **判据正本**：`playground/audit/` 终审 T-9（W-43 四点定义、`/etest dig` 通道锚、mattock 破块 0.4F / shovel 0.5F 兜底）。本回执**只判四点**，不改判点定义、不改判值。
> **秤上唯一判据**：`[MiningLog] tool decay face=breaking item=<reg> block=<b> loss=N [server]`（`mining/ETIMMining.java:265` def、`:273-281` 五门＋公式、`:283` 发行；`state≠null` ⇒ **含 block= 列**，去重键 `breaking|<item>|<block>`、sig=loss，`:698-709`）。缺 `block=` 列即行形异常（本窗 0 例）。
> **判决**：**PASS**——a…d 四点全 ✓；**计数总账 `breaking=4 ok:true`**；attacking／shearing／shear drop／mine deny／reach denied 全 0；mine speed 4 条（记录面，**不判**）；起收钉值全同、cfg 零编辑、jar byte-identical、零 rebuild、产品码 0 行改动。

## §0 判决总表（四点）

| 点 | 内容 | 期望 breaking 行 | 期望 durΔ | 实测行 | 实测 durΔ | 判 |
| --- | --- | --- | --- | --- | --- | --- |
| W-43a | `mattock_copper` × `dirt` | `loss=20` ×1（含 `block=dirt`） | +20 | `20` ×1 | +20 | ✓ PASS |
| W-43b | `mattock_copper` × `sand` | `loss=16` ×1（含 `block=sand`） | +16 | `16` ×1 | +16 | ✓ PASS |
| W-43c | `shovel_copper` × `dirt`（对照臂） | `loss=25` ×1（含 `block=dirt`） | +25 | `25` ×1 | +25 | ✓ PASS |
| W-43d | `shovel_copper` × `sand`（对照臂） | `loss=20` ×1（含 `block=sand`） | +20 | `20` ×1 | +20 | ✓ PASS |

**判值链（`ETIMMining.java:279-281` 逐位复算）**：

```text
loss = max( max((int)(hardness × 100 × baseDecay), (int)(100 × baseDecay / 20)), 1 )
a  dirt   0.5 × (100×0.4F=40) = 20.000000 → 20   |  (int)(40/20)=2   → max=20
b  sand   0.4 × 40            = 16.000000 → 16   |  2                → max=16
c  dirt   0.5 × (100×0.5F=50) = 25.000000 → 25   |  (int)(50/20)=2   → max=25
d  sand   0.4 × 50            = 20.000000 → 20   |  2                → max=20
```

> ★**a 点读 20 而非 25＝特判在位的判值级证据**：`getBaseDecayForBreakingBlocks` 的 mattock 分支 `:415-416`（0.4F）在 D-1(c) 只删了**攻击面** `:463-464`，破块分支原样保留；若删过了头，a 会落 `:439-441 ItemSpade→0.5F` 读 **25**（=c 点值）。本窗 a=20 / c=25 的分叉即两分支分离的实测证明。
> R196 硬度表：`dirt 0.5F`（`:98`）／`sand 0.4F`（`:96`）；括号内 `(int)(decay/20)` 项两相皆 2，不占上风（`max` 的第二个实参不触发）。

## §1 逐点判词（判行原句 ＋ 行号锚）

行号一律指 `testharness/build-logs/mattockbreak-w43-a.out`（**489,015 B／3,377 行**）**全档行号**（含 Gradle 前缀行），可 `Select-String` 直取；时刻为服务端本地时（UTC+8）。

| 点 | 判行原句（原样） | 锚 | 挖掘回执（`[TestLog]`） | 破块复钉（air） | 栈真值 |
| --- | --- | --- | --- | --- | --- |
| a | `[MiningLog] tool decay face=breaking item=etim:mattock_copper block=dirt loss=20 [server]` | `:3167` | start `:3126`／stop `:3168` | `:3170` | 0 → 20 |
| b | `[MiningLog] tool decay face=breaking item=etim:mattock_copper block=sand loss=16 [server]` | `:3227` | start `:3186`／stop `:3228` | `:3230` | 0 → 16 |
| c | `[MiningLog] tool decay face=breaking item=etim:shovel_copper block=dirt loss=25 [server]` | `:3287` | start `:3246`／stop `:3288` | `:3290` | 0 → 25 |
| d | `[MiningLog] tool decay face=breaking item=etim:shovel_copper block=sand loss=20 [server]` | `:3347` | start `:3306`／stop `:3348` | `:3350` | 0 → 20 |

**逐点判值要点**：

- **四点四键互异**（`breaking|mattock_copper|dirt`／`|sand`／`shovel_copper|dirt`／`|sand`）⇒ 同 boot 连续四点天然不互吞；实测每点**恰 1 条**，发行序＝数组序（20／16／25／20）。
- 判行均带 `block=` 列（行形 `:3167` / `:3227` / `:3287` / `:3347` 逐字可核），`face=breaking` 与 `state≠null` 契约一致；四行 `item=` 与服务端手持真值同（`hold` 回执 `:3116/:3176/:3236/:3296` 仅给显示名，见 C-1）。
- **真挖不是伪挖**：每点 `/etest dig` 回执（`drive_queued` `:3124/:3184/:3244/:3304`）＋ `dig-start`／`dig-stop` 成对 ＋ 破后 `testforblock … minecraft:air` 命中（`:3170/:3230/:3290/:3350`）；挖掘前 `testforblock … <block>` 亦命中（`:3122/:3182/:3242/:3302`），摆位与破块两侧都复钉。
- **str>1 门正向旁证**：四点各 1 条 `[MiningLog] mine speed`（`:3125/:3185/:3245/:3305`，str＝**5.25**（mattock，4.0×1.75×0.75）／**7.0**（shovel，4.0×1.75））⇒ `:276` 的 `str<=1 → loss=0` 分支未落，破块衰减链正常进入。该行**只记录不判**（D-3）。
- 栈 Δ 与 loss 同值（20／16／25／20），bot 面板 `durabilityUsed` 逐点 0 起（fresh 栈）——单次 Δ 远低于铜档 maxDamage（mattock 6400／shovel 1600），无碎栈干扰。
- 判点前落地面复钉：四点 `posBeforeDig` 均 `(-69.5, 76, 249.5) onGround=true`（str 环境罚 `:238-243` 的 `!onGround` 与水中分支皆未触发）。

## §2 计数总账（写死判，`ok:true`）

| 相 | breaking | attacking | shearing | shear drop | mine deny | reach denied | mine speed（只记） | 账 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| a | **4** | 0 | 0 | 0 | 0 | 0 | 4 | `want.breaking=4 / got=4 / ok=true` |

breaking 4 条发行序（`item/block:loss`）：

```text
etim:mattock_copper/dirt:20 → etim:mattock_copper/sand:16
→ etim:shovel_copper/dirt:25 → etim:shovel_copper/sand:20
```

mine speed 4 条（同 item×block 同 str 去重，**未作 PASS/FAIL 判据**）：

```text
mattock_copper/dirt str=5.25 → mattock_copper/sand str=5.25
→ shovel_copper/dirt str=7.0 → shovel_copper/sand str=7.0
```

## §3 起收钉值（全同 ⇒ 零 rebuild、零 cfg 编辑）

| 项 | 起窗 | 收窗 | 判 |
| --- | --- | --- | --- |
| HEAD | `ba6181dbc26898d7a5e52ad23e937fa07004aacd`（dirty 0） | 同（窗内零提交） | ✓ |
| release jar | 772,789 B｜`441A97C1D06FE5CE661E6D2F29C56211E6763B05E7B6053E26CC5C156A740A5B` | 同（byte-identical） | ✓ |
| dev jar | 757,023 B｜`7348CC0D8A605DE3BD9CACEDB4D87FA73A3EC1214039669B726B0FB846490C2E` | 同（byte-identical） | ✓ |
| `run/config/etim.cfg` | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666` | **同值（本批零编辑，无翻转/还原动作）** | ✓ |
| `run/server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 收窗 byte-identical | ✓ |
| refmap（双树 `build/resources/main`＋`build/tmp`） | 62 类键／138 条目（切片 Sword 4／Tool 4／Shears 3） | 同（两树同值） | ✓ 139/57/11 未出现 |
| `mixins.etim.json` | mixins 56／client 10 | 同 | ✓ |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` 计数 | 18 | 18 | ✓ |
| Gradle | `> Task :compileJava UP-TO-DATE`／`:processResources UP-TO-DATE`／`:classes UP-TO-DATE`／`:jar UP-TO-DATE`（`:31-35`） | `BUILD SUCCESSFUL in 52s`（`:3374`） | ✓ 0 rebuild |

> cfg 窗内零动作：`B:miningDebugLog=true`（`:363`）／`B:damageDebugLog=true`（`:41`）／`B:blockDebugLog=false`（`:11`）／`B:miningReform=true`（`:372`）**全程取 pin 值**，起窗快照与收窗实算 SHA 相同（`cfgUntouched=true`）。
> ops.json／usercache.json／usernamecache.json 从快照还原并逐字节相同（685 B／1,630 B／851 B）。
> ◎ 带外不判负：**本批 jar 不重钉**——byte-identical 就是本批主预言，实测成立（772,789 B／757,023 B 起收同值），未出现「build 出现 byte-identical 破坏」的异常停窗条件。

## §4 冲突分级（A / B / C）

**A 级 0 条**（无判点 FAIL、无产品码改动、无 rebuild）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| B-1 | B | **破块面没有 `[DamageLog]` 命中语义**（无实体目标），W-42 的 `hitLanded`（`src=player raw>0`）在本批不适用。本窗把「0 行／0 值」的可判性换成**三读**：`dig-start`／`dig-stop` 回执 ＋ 破后 `testforblock … air` 命中 ＋ `mine speed`（`str>1` 门 `:276` 的正向旁证）。四点三读全中，故每条 breaking 行都有「真挖且破块」前提，不是空洞行。 | 判据结构登记；建议后续 dig 面判点一律带此三读（D-2）。 |
| C-1 | C | **`hold` 回执只给显示名**（`:3116` `params=[Copper Mattock]`／`:3236` `[Copper Shovel]`），不含 registry name。 | 栈身份以判行 `item=<reg>` 为准（服务端发行读手持真值），回执仅作通路旁证（W-42 C-5 家族延续）。 |
| C-2 | C | **modded 栈在 mineflayer 侧无 `maxDurability`**：四点 `botBefore.max` 为 `undefined`，只 `durabilityUsed` 可读。 | 栈判据只用 `durabilityUsed` 差值；不读 max、不算百分比（W-42 C-2 同族）。 |
| C-3 | C | **冒烟档已删**：正式窗前用 `W43_ONLY=W-43a,W-43c` 跑过一次冒烟（tag `mattockbreak-w43-smoke`，a=20／c=25 PASS），产物在正式窗前整批删除，不参与判决。 | 诚实登记：**判决只引正式档**（`mattockbreak-w43-a.out` 14:51–14:52 时段；冒烟档 06:51 时段已不存在）。 |
| C-4 | C | **四点复用同一目标位** `(-68, 76, 249)`：每点先 `setblock air` 再 `setblock <block>` 并 `testforblock` 复钉。四点去重键互异（item×block 四组合全不同），复用位置不引入吞行。 | 属工装设计登记；`sand` 有重力，靠 `by-1` 平台面支撑（摆位复钉 `:3182/:3302` 命中）。 |
| C-5 | C | **`testforblock` 前后同串**：摆位与破块后都用 `Successfully found the block at …`（1.12 语法），驱动按命令参数区分两次调用并分别落 `blockPresentLine`／`blockGoneLine`。 | 判据链靠调用位置区分，不靠串面；证据档两条皆有独立行号。 |
| C-6 | C | **`mine speed` 的 str 是等级加成前的值**：`logMineSpeed` 在 `:218` 调用，早于 `:247` 的 `× (1 + level × miningSpeedPerLevel)`，故打印 5.25／7.0（裸材质×倍率）。 | 该行只作 str>1 门的定性旁证，**不做数值判据**（D-3）。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | mattock 破块 0.4F 与攻击 1.0F 的分支分离是否入账 | (a) 入 audit20（a=20 vs c=25 即证明） ／(b) 仅本回执 | **(a)**：这是 D-1(c) 删特判后「破块分支未被误删」的唯一判值级实证 |
| D-2 | dig 面「三读」是否入标准臂 | (a) 入（dig-start/stop ＋ air 复钉 ＋ speed 门旁证） ／(b) 仅本批 | **(a)**：破块/挖掘面无实体命中，三读是唯一可日志化的前提证明（B-1） |
| D-3 | `mine speed` 是否升为判点 | (a) 保持只记不判 ／(b) 把 str>1 写成断言 | **(a)**：str 随等级/食物/附魔变化，写成断言会把工装档位噪声当判值（C-6） |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 客户端 | **本窗零客户端**（无 obf client 启动、无窗口需关；全程 RCON 替代面＝stdin 控制台＋bot） |
| 服务端 | `Preparing level "mattockw43"`（`:510`）→ `Done (5.567s)`（`:2256`）→ `Stopping the server`（`:3354`）→ `BUILD SUCCESSFUL in 52s`（`:3374`，exit 0） |
| 端口 | 25565 LISTEN＝0（起 0／收 0）；25575 未用（不碰 RCON） |
| 崩溃 | `run/crash-reports` 18 → 18（无新增） |
| cfg/props/ops/usercache/usernamecache | 五项 byte-identical（cfg 为零编辑同值自证） |
| 世界 | `run/mattockw43` 已删（`worldDirRemoved=true`） |
| rebuild | **0**（`:compileJava/:processResources/:classes/:jar` 全 UP-TO-DATE；两 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅新增本窗驱动；HEAD 未动） |

## §7 工装与复跑

- **判窗驱动**：`testharness/player/mattockbreak-w43.js`（骨架＝`extreme-w42.js`，破块臂取 `sworddecay-w34.js:196-245` 原型 `/etest dig → dig-start/dig-stop → sleep → testforblock air`）
  - 冒烟开关：`W43_ONLY=W-43a,W-43c`（点裁剪）、`W43_PHASES=a`（相裁剪）。
  - 挖掘原语：`/etest dig <x> <y> <z> <player>`（`CommandDevTest.java:138-139`／`:514-522` → `harness/TestDriver.java:97-103`，START 立即、STOP 于 `DIG_HOLD_TICKS=40` tick 后；`TestDriver.java:70`）；破块后 `testforblock air` 复钉。
  - 场地：5×5 平台（`by-1` 地板 `minecraft:dirt`）＋ 5×5 净空（`by..by+2` air）；目标块固定 `(bx+2, by, bz)`（水平 2.0、眼高 1.62 ⇒ 视距 2.29，服务器 reach 内，同 W-34 破块距）。
  - 钉值门：HEAD/jar/cfg/props/MK 任一不符即拒跑；`139/57/11` 出现即停窗。
  - 夹具纪律：判窗前 `op <bot>`、`difficulty 2`、`gamerule doMobSpawning/doMobLoot/doTileDrops/doDaylightCycle/naturalRegeneration/mobGriefing false`、`randomTickSpeed 0`、`etest food 20 20`＋`etest level 35`＋`etest health 20`（血量上限 20 需等级带）、白板栈（`hold` 直置 Damage 0，无附魔）。
- **证据卷**（`testharness/build-logs/`）：`mattockbreak-w43-a.out`（489,015 B／3,377 行）／`mattockbreak-w43-a-server-latest.log`（475,738 B）／`mattockbreak-w43-evidence.json`（20,956 B）／`mattockbreak-w43-driver.log`（38,956 B）／起点快照五件（cfg＋props＋ops＋usercache＋usernamecache）。
- **复跑命令**（仓根 `git-workspace/etim`）：

```powershell
node testharness\player\mattockbreak-w43.js mattockbreak-w43          # 全窗（单 boot 四点）
$env:W43_ONLY='W-43a,W-43c'; $env:W43_PHASES='a'; node testharness\player\mattockbreak-w43.js smoke   # 冒烟
```

- **判行复核（可粘贴，行号现行）**：

```powershell
Select-String -Path testharness\build-logs\mattockbreak-w43-a.out -Pattern '\[MiningLog\] tool decay face=breaking'
Select-String -Path testharness\build-logs\mattockbreak-w43-a.out -Pattern '\[MiningLog\] mine speed'
Select-String -Path testharness\build-logs\mattockbreak-w43-a.out -Pattern 'step=dig-(start|stop)'
Select-String -Path testharness\build-logs\mattockbreak-w43-a.out -Pattern 'Successfully found the block'
Select-String -Path git-workspace\etim\src\main\java\io\github\etim\etim\mining\ETIMMining.java -Pattern 'ETIMItemMattock|return 0.4F|hardness \* decay'
```

## §8 未覆盖面（不补白）

1. **攻击面**：本批只测破块；mattock 攻击 1.0／出口 100 已由 W-42 e 点判讫，不重测。
2. **unbreaking 减免面**：全白板栈，行值＝名义衰减；有附魔时行值≠实磨（D-3(a) 不扩批）。
3. **`miningReform=false` 破块相**：本批单 boot 只跑默认 true；off 相破块（vanilla `damageItem(1)`）未入窗。
4. **砂砾/黏土/雪等其它 0.4–0.6 硬度族**：本批只取 dirt(0.5)/sand(0.4) 两个代表位，未穷举硬度表。
5. **`mattock` 右键 till 面**（R196 `ItemMattock:34-43`，C 级范围外）未测。

## §9 自报（机械核讫）

> 文件：`testharness/reports/mattockbreak-W43-verdict.md`｜**15,916 B**｜165 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`66720E1CC0099F027128C940438F08DD168A475B09CC4272A52E1CE01E8BC370`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`1006941412ADE451D064A9EA8FD2076C10619064AE8590D1C23F87E8A9473B6A`
> 判点 4（W-43a…d）｜✓ 4 / ✗ 0｜账 a `breaking=4 ok:true`｜冲突 A0 B1 C6｜待裁 D-3｜jar byte-identical／cfg 零编辑／rebuild 0
