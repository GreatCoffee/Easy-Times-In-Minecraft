# R196 吃草臂（EntityAIEatGrass :1-85 · 羊座）· **W-B28 判决**（B-28 批，HEAD `e592b3a`）

> **HEAD**：`e592b3a7131bfbdd9e29e46b22c425f9bd954ff6`（窗内 **0 提交**，起收同 commit）｜**0 rebuild**（判窗只跑 `build/libs` 现成 jar；jar mtime 12:07:48Z 早于窗起点 12:19Z）
> **jar**：`build/libs/etim-1.0.0.jar` **1,098,332 B**｜SHA256 `8D28F1EED5C640C85A8C708FE24DB24D38EE419A54C9B12B7364A60491E9A8C4`（起收同值）｜MD5 `349443938B1593020EC8BD61D1EB72E1`
> **dev/sources**：1,077,223 B `275D98853487B2A5…`／1,001,579 B `B1D7F37112C7559D…`
> **refmap**：classes **97** / entries **216**（dual 432，双树同）｜**mixins**：**94** + 10 client｜`mkCounts().ok=true`
> **窗口**：2 boot（`Done (5.328s)`／`Done (5.619s)`，mixinFail 0×2）＋2 停服（exit 0＋BUILD SUCCESSFUL 2m 37s／1m 5s）｜单假人 `ETIM_F7`（spectator）｜判窗世界 `w-b28v`
> **判决**：**W0 ✓｜W1 ✓｜W2 ✓｜W3 ✓**（A 0／B 0／D 0／C 6）
> **判据来源**：本窗单跑（驱动 2 处工装补强见 §3 C-B28-1/2，未触产品码、未动判值口径）
> **报告字节规格**：`8,122 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 9 / ✗ 1｜68 行`

## §1 逐臂判读

| 点 | 判据 | 实测 | 判 |
| --- | --- | --- | --- |
| **W0** boot 认收 | 双 boot `Done (`＋mixinFail=0×2＋两停服 exit 0＋BUILD SUCCESSFUL×2 | b1 `Done (5.328s)!`（b1:2342，20:20:03）／b2 `Done (5.619s)!`（b2:2343，20:22:42），`mixinFail=0`×2；`stopBoots` **2 条**均 `exitCode=0 exited=true build=true`；`BUILD SUCCESSFUL in 2m 37s`（b1:4178）／`in 1m 5s`（b2:4537）；两条 `[PIN]`（`12:19:48.419Z`／`12:23:32.986Z`）同 releaseSha 同 MK | ✓ |
| **W1** 羊吃草位 | 羊×3 于草地（rts 512）→ 90 s 窗 → ≥1 条 `eatgrass … start tick=40` | **3 行**：`src=sheep start tick=40 entity=EntitySheep#2014`（b1:3384）、`#2012`（b1:3447）、`#2013`（b1:3794）；同窗 probe 111 行 | ✓ |
| **W2** cow 负镜像 | cow 40 s 窗 → `eatgrass … start` **0**（R196 无 cow 吃草座） | start **0**；probe **0**（座只挂羊） | ✓ |
| **W3** 旗断（boot 2） | 羊×1 `livestockNeedsR196=false` 40 s → start **0** | start **0**；probe **0**（b2 全档 4,540 行 `eatgrass` 0 命中）——座在 mixin `<init>@TAIL` 处即判旗，旗断时任务根本不挂（见 C-B28-5） | ✓ |

## §2 判行原文

**W1 · 三只羊各出一条 start（tick=40 固定值）**
- `[AILog] eatgrass src=sheep start tick=40 entity=EntitySheep#2014`（b1:3384）
- `[AILog] eatgrass src=sheep start tick=40 entity=EntitySheep#2012`（b1:3447）
- `[AILog] eatgrass src=sheep start tick=40 entity=EntitySheep#2013`（b1:3794）

**W1 · 诊断 probe 行（非判集，含 hurt/child/flag 三字段）**
- `[AILog] eatgrass src=sheep probe-in inv=16 hurt=false child=false flag=true entity=EntitySheep#155`（b1:2392，A1 窗前的环境羊）
- A1 窗内 probe 111 行（`f11-b28-verify.json` 的 `a1.probes`）

**W2 · cow 负镜像**
- cow 臂 `eatgrass … start` **0 行**，probe **0 行**

**W3 · 旗断双零**
- b2 全档 4,540 行 `eatgrass` **0 命中**（羊正常召唤、无 `Skipping Entity`）

**W0 · 窗面**
- `Done (5.328s)! For help, type "help" or "?"`（b1:2342）｜`Done (5.619s)!`（b2:2343）
- `BUILD SUCCESSFUL in 2m 37s`（b1:4178）｜`BUILD SUCCESSFUL in 1m 5s`（b2:4537）

## §3 冲突分级

- **A 级：0** —— 四臂硬门全成立：三羊各出 1 条 start（`tick=40` 齐）、cow 0 行、旗断双零、boot/停服面全绿。
- **B 级：0** —— 本批注册 1 个新 mixin 座（94+10，refmap 97/216 dual 432 双树同），`mixins.etim.json` 已随之更新；无 refmap 未收编残留。
- **D 级：0** —— 互通差异仅为行数与 id，无互读矛盾（见 C-B28-3）。
- **C 级：6**
  - **C-B28-1**（工装·probe 正则错位，已修）：原驱动三处过滤写 `l.indexOf('eatgrass probe-in')`，而实际行格式是 `[AILog] eatgrass src=sheep probe-in inv=…`，中间隔着 `src=…`，故永远不命中——canonical shell 与 smoke r3 的 `probes` 全为 0 是**统计器缺陷**而非「无 probe」。本窗改为 `l.indexOf('eatgrass') >= 0 && l.indexOf(' probe-in ') >= 0`，实测 `a1.probes=111`、`a2/b1=0`。判值门不看 probes，判值面未受影响；建议把该修法收进驱动模板。
  - **C-B28-2**（工装·世界清理相对路径，已修）：`startBoot` 原为 `fs.rmSync(path.join('run', world))`——任务书要求 cwd=`testharness`，相对路径实际指向 `testharness/run/w-b28v`（不存在），真实世界 `run/w-b28v` 从未被删。本窗改为 `path.join(L.ROOT,'run',world)` 后起手即清掉 judge shell 留下的世界，boot 2 也从干净世界重放。**同型第五次**（B-17 C-B17-3／B-21 C-B21-1／B-22 C-B22-5／B-26 C-B26-6），建议进模板硬门。
  - **C-B28-3**（互通·roll 相位）：smoke r3 `a1=1 #27／a2=0／b1=0`（probes 0/0/0）；judge v1 shell `a1=1 #1999`（probes 0）；本窗 `a1=3 #2014/#2012/#2013`（probes 111/0/0）。三只羊 90 s 内各命中一次 roll（成体 1/1000、幼体 1/50，rts 512 相位不同），行语义（`src=sheep start tick=40 entity=#`）逐字段一致，非判值偏差。
  - **C-B28-4**（判读·环境羊噪声）：boot 后、`kill @e[type=!player]` 前有自然刷新的 `EntitySheep#155` 在打 probe（b1:2392 起 8 条）。A1 窗起点在 kill 之后，故判集不受污染；但 probe 计数若要做定量判据，须按 `entity=#<召唤 id>` 过滤（与 B-27 C-B27-2 同型）。
  - **C-B28-5**（判据语义·旗闸位置）：本批与 B-27 不同——B-27 的旗闸在 AI `shouldExecute` 首行（任务已挂、调用即返 false）；本批座在 `MixinEntitySheepEatGrassSeat.java:31` 的 `<init>@TAIL` 处判旗（`if (world.isRemote || !ETIMConfig.livestockNeedsR196) return;`），旗断时**任务根本不挂**，故 boot 2 的 probe 为 0 是「未装座」而非「装了座但闸断」。两种语义在行面都表现为双零，判读时不可混记。
  - **C-B28-6**（PIN 通道）：`f11-b28-verify.json` 内 `pins` **1 条**（`12:19:48.419Z`），stdout **2 条**（第二 stamp 打在 JSON 落盘之后，B-24 同案）；两条 `releaseSha`＝`8D28F1EE…`、MK＝97/216/432＋94+10 `ok=true` 逐字段同，起收同值成立。

## §4 收口五件

- **jar／dev／sources 起收同**：1,098,332 `8D28F1EE…`（MD5 `349443938B1593020EC8BD61D1EB72E1`）／1,077,223 `275D9885…`／1,001,579 `B1D7F371…`（窗内 **0 rebuild**）。
- **cfg／props 起收同**：cfg 49,380 B `BAE7A8DF1449D2E1CEEC16A9D6FE3CDD2A237DF931974887F786AA6B9793F24D`（`livestockNeedsR196` 已回 `true`，`mobDespawnR196=false` 保持判窗预设）；props 939 B `580A839810479336377E6BE5DDE9DBA926335BE8F9511898C699FEB6CF3D691C`（`level-name` 驱动起收回写 `w-b23v`）。
- **MK 起收同**：refmap 97/216（dual 432）＋mixins 94+10，`mkCounts().ok=true`。
- **残留**：crash **23→23**；端口 25565 **0**；GradleStart JVM **0**；HEAD `e592b3a` 窗内 **0 提交**；产品码 mtime（`ETIMEntityAIEatGrass.java` 12:01:47Z、`MixinEntitySheepEatGrassSeat.java` 11:58:03Z、`mixins.etim.json` 12:07:38Z）均早于窗起点 12:19Z，`git status` 仍为 ` M mixins.etim.json`＋两个 `??` 新类（主会话未提交改动，本窗未触碰）。
- **世界**：`run/w-b28v` 保留（25 文件／3,551,957 B）；`w-b28a`／`w-b27v`／`w-b26v` 未动。
- **互通（vs `build-logs/f11-b28-smoke.json` r3）**：a1 `1`→`3`、a2 `0`→`0`、b1 `0`→`0`；boots 双 Done、mixinFail 0×2、stopBoots 双 exit 0 两窗同形（详见 C-B28-3）。

> 正本：`testharness/reports/b28-verify-verdict.md`｜byte 五项：`8,122 B｜首字节 0x23｜CR 0｜U+FFFD 0｜LF 67（split 68）`
> SHA-256 甲（全档零位）`0E8B06E22712D9DE0E461BA64E736C16CB84AC7815E3943F4FE5F76FF35BA4AF`
> SHA-256 乙（LF 归零零位）`0E8B06E22712D9DE0E461BA64E736C16CB84AC7815E3943F4FE5F76FF35BA4AF`
> SHA-256 丙（行链零位）`CB4F242E858D2ABC24B2C1CC087718DDDDAD0AE01FC2704900A23A51A6A27463`
