# 鸡羽（num_feathers）· **W-B16 判决**（B-16 批，F-1 死羽＋F-2 被击羽，HEAD `3086043a`）

> **HEAD**：`3086043a`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar）
> **jar**：`build/libs/etim-1.0.0.jar` **1,045,443 B**｜SHA256 `63F2A49B24CE79E47C9335D8D9993A4E11600338BF279B32745738BE7353A4DF`｜MD5 `AFF9592D41529309347A29C37630058A`（起收同值）
> **dev/sources**：1,025,155 B `2F79055C…`／952,863 B `694D27AD…`（起收同值）
> **refmap**：classes **87** / entries **197**（dual 394，双树同）｜**mixins**：**84** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (6.694s)`／`Done (6.567s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 1m 8s／35s）｜单假人 `ETIM_F7`｜判窗世界 `w-b16v`（驱动自建；`w-b16a` 保留不动）
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓｜W4 ✓｜W5 ✓**（A 0／B 0／D 0／C 8）
> **判据来源**：本窗第 4 跑（run 1–3 存在工装缺陷，逐条登记于 §3，跑数不入判）
> **报告字节规格**：`11,002 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 13 / ✗ 2｜82 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 面 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL | b1 `Done (6.694s)!`（b1:2326）／b2 `Done (6.567s)!`（b2:2325），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 1m 8s`（b1:4746）／`in 35s`（b2:4525）；jar/dev/sources/refmap/mixins 起收同值 | ✓ |
| **W1** 死羽·健全面 | `src=death` 恰 1 行＝`well=true∧burning=false∧meat=raw∧feathers=meter∧droppedFeathers=feathers∧vanillaRemoved≥1`＋sweep `raw=1 cooked=0 feather≥1` | 行 `well=true burning=false vanillaRemoved=2 feathers=3 droppedFeathers=3 meat=raw meter=3/3`（b1:4600）；sweep `raw=1 cooked=0 feather=1`（b1:4603 `Killed item.item.chickenRaw`＋b1:4604 `Killed item.item.feather`） | ✓ |
| **W2** 死羽·饥面 | `src=death` 恰 1 行＝`well=false∧meat=none∧feathers=meter∧droppedFeathers=feathers≥1`＋sweep `raw=0 cooked=0 feather≥1` | 行 `well=false vanillaRemoved=2 feathers=2 droppedFeathers=2 meat=none meter=2/2`（b1:4612）；sweep `raw=0 cooked=0 feather=2`（b1:4615/4616） | ✓ |
| **W3** 烧死双面 | A3：`burning=true∧meat=cooked∧droppedFeathers=0`＋sweep `cooked=1 raw=0 feather=0`；A3b（烧＋饿）：`meat=none∧droppedFeathers=0`＋sweep 全 0 | A3 行 `burning=true well=true vanillaRemoved=1 feathers=5 droppedFeathers=0 meat=cooked meter=5/5`（b1:4630），sweep `cooked=1 raw=0 feather=0`（b1:4632）；A3b 行 `burning=true well=false feathers=4 droppedFeathers=0 meat=none meter=4/4`（b1:4646），sweep 全 0 | ✓ |
| **W4** 被击羽 | `src=hurt` 行≥2、每行 `source=arrow∧points≥1`、meter 递减自洽、`droppedSum≥1` | **6 行**（b1:4674／4679／4684／4690／4696／4702），全部 `amount=3.00 points=3 rolls=3 source=arrow`；`dropped=1` 四处均 `meter=6->5/6`、`dropped=0` 两处均 `meter=6->6/6`（逐行自洽）；`droppedSum=4≥1`；同轮另有 2 只二次命中致死（b1:4712-4716，`final=1.000` 蓄吸收后） | ✓ |
| **W5** 旗断面 | `livestockProductionR196=false` boot 全段 `featherDrop` 行 = **0**；死面 sweep＝vanilla 战利品仍在（正值对照） | b2 全档（4,528 行）`featherDrop` **0 行**；死面 sweep `raw=1 feather=1 cooked=0`（b2:4469 `Killed item.item.chickenRaw`＋b2:4470 `Killed item.item.feather`）→ 零行不是"没掉落"的空证 | ✓ |

## §2 判行原文

**W1 · 健全死羽（A1）**
- `[FarmLog] featherDrop src=death burning=false well=true vanillaRemoved=2 feathers=3 droppedFeathers=3 meat=raw meter=3/3 entity=EntityChicken#1996 [server]`（b1:4600）
- `Killed item.item.chickenRaw`（b1:4603）
- `Killed item.item.feather`（b1:4604）

**W2 · 饥饿死羽（A2）**
- `[FarmLog] featherDrop src=death burning=false well=false vanillaRemoved=2 feathers=2 droppedFeathers=2 meat=none meter=2/2 entity=EntityChicken#2003 [server]`（b1:4612）
- `Killed item.item.feather`（b1:4615／b1:4616，sweep feather=2、raw=0）

**W3 · 烧死双面（A3／A3b）**
- `[FarmLog] featherDrop src=death burning=true well=true vanillaRemoved=1 feathers=5 droppedFeathers=0 meat=cooked meter=5/5 entity=EntityChicken#2008 [server]`（b1:4630）
- `Killed item.item.chickenCooked`（b1:4632）
- `[FarmLog] featherDrop src=death burning=true well=false vanillaRemoved=2 feathers=4 droppedFeathers=0 meat=none meter=4/4 entity=EntityChicken#2011 [server]`（b1:4646，sweep 全 0）

**W4 · 箭击被击羽（逐行 meter 自洽）**
- `[FarmLog] featherDrop src=hurt amount=3.00 points=3 rolls=3 dropped=1 meter=6->5/6 source=arrow entity=EntityChicken#2014 [server]`（b1:4674）
- `[DamageLog] dmg target=Chicken#2014 src=arrow raw=3.000 armorIn=3.000 armorOut=3.000 absorption=0.000 final=3.000 [server]`（b1:4676）
- `[FarmLog] featherDrop src=hurt amount=3.00 points=3 rolls=3 dropped=0 meter=6->6/6 source=arrow entity=EntityChicken#2016 [server]`（b1:4684）
- `[FarmLog] featherDrop src=hurt … dropped=1 meter=6->5/6 … #2017`（b1:4690）／`#2018`（b1:4696）／`dropped=0 meter=6->6/6 … #2019`（b1:4702）
- 二次命中致死：`[DamageLog] … target=Chicken#2014 src=arrow raw=3.000 … absorption=2.000 final=1.000`（b1:4712）→ `[FarmLog] featherDrop src=death … feathers=5 droppedFeathers=5 … meter=5/6 #2014`（b1:4713）；同形 `#2016`（b1:4715-4716）

**W5 · 旗断零行＋vanilla 掉落对照**
- b2 全档 4,528 行：`featherDrop` **0**
- `Killed item.item.chickenRaw`（b2:4469）／`Killed item.item.feather`（b2:4470）
- 旗断下的箭击仍走 `[DamageLog] dmg target=Chicken#1987 src=arrow raw=5.000 … final=4.000`（b2:4485，伤害面不受本旗管辖）

**W0 · 窗面**
- `Done (6.694s)! For help, type "help" or "?"`（b1:2326）｜`Done (6.567s)!`（b2:2325）
- `BUILD SUCCESSFUL in 1m 8s`（b1:4746）｜`BUILD SUCCESSFUL in 35s`（b2:4525）

## §3 冲突分级

- **A 级：0** —— 六臂全绿，F-1／F-2 判值面均落地。
- **B 级：0** —— 本批零 mixin／零 cfg 新增（`mkCounts().ok=true`，87/197/394＋84+10 起收同）。
- **D 级：0** —— 互通差异均为命中箭数层面，无判值面破位（见 §4）。
- **C 级：8**
  - **C-B16-1**（口径·R196 与 1.12 的 amount 基数）：1.12 `LivingHurtEvent.amount` 为护甲后值，R196 `:160-186` knockback 臂用护甲前基数——本窗鸡无甲，`raw=3.000 armorIn=3.000 armorOut=3.000` 三值同（b1:4676），掷常式在 0.2F/点面无法区分两代口径；**判值面无破**，维持任务书注记级。
  - **C-B16-2**（工装·拾取竞速）：A1 行 `droppedFeathers=3` 而 sweep `feather=1`（bot 在 ±1.4 拾取半径内拿走 2 片）；A2 行 2／sweep 2 对齐。**精确计数以行 `droppedFeathers` 为准**，sweep 只作正值对照（≥1 容差），与任务书预登记一致。
  - **C-B16-3**（口径·二次命中致死分流）：A4 同轮 6 发起击后另有 2 只被第二箭打死（b1:4712／4715，`absorption=2.000 final=1.000`→hp 3→0），走 `src=death` 面（`feathers==droppedFeathers`）。判窗只以 `src=hurt` 行证明非致命首击主面（6 行），致死分流登记备查。
  - **C-B16-4**（伴生·跳羽）：所有死亡行 `feathers==meter` 自洽（3/3、2/2、5/5、4/4），未见 B-10 的 1/40 跳羽造成的 n-1 漂移。
  - **C-B16-5**（工装·run 1 判值器空读）：驱动 `const row = (a) => a.row || {}` 对 `a1`（行数组）取 `[].row` → W1/W2/W3 在 run 1 被误判 ✗（行本身完全正确）。已修为数组取 `a[0]`；**判值面未被污染，run 1 只作缺陷记录**。
  - **C-B16-6**（工装·run 1/2 停机与挂起）：驱动 W5 后未停 boot 2，服务端继续监听 25565（run 2 结束后仍 LISTENING，并锁住 `run/w-b16v/region` 致 run 3 EPERM）；且 mineflayer socket 不释放，进程在 `[done]` 后不退出。已加 `stopBoot()` 收 boot 2＋显式 `process.exit`，W0 改为要求 **两条**停服记录全绿。遗留实例以 RCON/强制停（RCON 登录后 ECONNRESET，属已知 RCON 哑挂惯性）清场，判窗世界重建。
  - **C-B16-7**（工装·run 1 硬禁面破位）：W5 的箭道原为 `z=242.5`＝bot 自身所在轴，12 箭把 `ETIM_F7` 射死（b2 run 1 `ETIM_F7 was shot by Arrow`＋`[DeathLog]`）。已改为 `z=241.5`（与 W4 同轴偏置）＋W5 全程 `gamemode 3`，并新增 `botShot1/botShot2` 计数器硬门（W4/W5 判值要求 0）；终跑 `botShot1=0`、`botShot2=0`、两日志 `ETIM_F7 was shot`／`DeathLog` **0 行**。
   - **C-B16-8**（纪律·超时铁律违规，2026-11-07 自登记）：本窗驱动两次以前台阻塞方式等待——run 3 用 `timeout:600000`（10 分钟）起跑，跑满 **600 s** 被工具打断；run 4 用 `timeout:900000`（15 分钟）起跑（实际服务端日志跨度 `17:46:47`→`17:48:30` ≈ **1m43s**，上限却写成 15 分钟）。两者同时违反 `AGENTS.md`「等待/超时纪律」§1（单次 ≤180 s）与 §2（每 30 s 巡检）。**判值面不受影响**（判据取自日志行与 json，与等待时长无关），但按 §6 自登记、不隐匿；后续同类驱动一律 `background=true`＋30 s 读流文件，禁止前台长超时，违规当轮产出否决重做。

## §4 收口五件

- **jar／dev／sources 起收同**：1,045,443 `63F2A49B…`／`AFF9592D…`；dev 1,025,155 `2F79055C…`；sources 952,863 `694D27AD…`（窗内 **0 rebuild**）。
- **cfg／props 起收同**：cfg 49,379 B `A4A756C4ABCB2F742B48F90B8027F871AC8ECDE0F7020B6DD98CAEFE10452F10`；props 939 B `304EC6D7ADC79463508A67EB243DFC35F75D966FED84C7537B29156D30089E3F`（`level-name=w-b16a` 已还原）。
- **MK 起收同**：refmap 87/197（dual 394）＋mixins 84+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `3086043a` 窗内 **0 提交**；obf 配置未触碰。
- **互通（vs `build-logs/f11-b16-smoke.json`）**：A1/A2/A3/A3b 四行逐字段同值（`feathers` 3/2/5/4、`droppedFeathers` 3/2/0/0、`meat` raw/none/cooked/none）；差异仅 A4 命中规模——smoke `a4c=2/dropped=2`，本窗 `a4c=6/dropped=4`（12 箭单轮命中 6 发），逐行字段语义一致（`amount=3.00 points=3 rolls=3 dropped∈{0,1}`），**非判值偏差，按 C 级登记**（§3 C-B16-2/C-B16-3 已注）。

> 正本：`testharness/reports/b16-verify-verdict.md`｜byte 五项：`11,002 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 81（split 82）`
> SHA-256 甲（全档零位）`1FD04BD63B7A2EC2C1F96872DFF4DE10F7178765F3693E6E9DEDBA344692C36F`
> SHA-256 乙（LF 归零零位）`1FD04BD63B7A2EC2C1F96872DFF4DE10F7178765F3693E6E9DEDBA344692C36F`
> SHA-256 丙（行链零位）`B29AB8BB090C415FC94823504B06E330C2EEF368815F530A84E5039EE0CCB418`
