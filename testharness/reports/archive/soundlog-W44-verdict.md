# soundlog 批（音效字幕判行通道）· W-44 判窗回执

> **执行方**：会话七（etim-verification）｜**日期**：2026-10-31｜**窗口**：5 次 server boot（1 buddy 落键 + 3 判窗 boot + 1 次重跑）＋ 4 次客户端会话
> **报告字节规格**：`24,711 B｜UTF-8 无 BOM｜LF｜0 U+FFFD｜✓ 21 / ✗ 1｜249 行`
> **判据正本**：`playground/audit/` audit20 条 177-179（`SoundManager` listeners 派发点＝原版字幕同一消费点，用户裁定等效证据；金判面＝羊剪毛 `minecraft:entity.sheep.shear`）。
> **秤上唯一判据（双档）**：
> - 客户端：`[SoundLog] name=minecraft:entity.sheep.shear pos=<x,y,z> [client]`（`client/ETIMSoundLog.java:59-68`；注册 `:46-57` 于 `ETIM.init`；门 `ETIMConfig.soundDebugLog` `:61`）。
> - 服务端：`[MiningLog] tool decay face=shearing item=etim:shears_rusted_iron loss=50 [server]`（`mining/ETIMMining.java:328-339` → `logToolDecay` `:693-711`）。
> **判决**：**PASS**——a／a2／b／c／d／e 六点全 ✓。客户端 golden 计数 1／0／1／0／0／1 与期望逐点相符；服务端 `face=shearing` **每 boot 恰 1 条 loss=50**；**音量 0 面照发**（用户双耳确证：正常音量窗听到剪毛声＋看到字幕，0 音量窗完全静音而判行照发）；起收钉值全同、零 rebuild、产品码 0 行改动。

## §0 判决总表

| 点 | 面 | 期望（写死判） | 实测 | 判 |
| --- | --- | --- | --- | --- |
| W-44a | `/playsound` → **用户客户端**（坐标＝bot 位） | 客户端 golden 恰 1 条，`pos=floor(bot)` | 1 条，`pos=-70,76,249` ＝ `floor(-69.5,76,249.5)` | ✓ PASS |
| W-44a2 | `/playsound` → **bot**（mineflayer）反控 | 客户端 golden 0 条（1.12 `playsound` 单目标非广播） | 0 条 | ✓ PASS |
| W-44b | bot 剪**成年未剪**羊（`Silent:0b`） | 客户端 +1／服务端恰 1 条 `loss=50`／栈 Δ50／`Sheared:0b→1b` | 1／1／50／0→1 | ✓ PASS |
| W-44c | 同羊再剪（`getSheared` 门） | 客户端 0／服务端 0／栈 Δ0／`Sheared` 仍 1b | 0／0／0／1b | ✓ PASS |
| W-44d | **幼羊**（`Age:-24000`，`isChild` 门） | 客户端 0／服务端 0／栈 Δ0／`Sheared` 仍 0b | 0／0／0／0b | ✓ PASS |
| W-44e | **主音量 0** 下复演 b（独立 boot） | 客户端仍恰 1 条（派发先于音量门）／服务端 1 条 `loss=50`／栈 Δ50 | 1／1／50（用户：**完全静音**） | ✓ PASS |

> **a 的面义**：`/playsound` 走 `CommandPlaySound:95` → `WorldServer.playSound(player,…)` → 单发 `SPacketCustomSound` → 客户端 `SoundManager.playSound` → listeners 循环。本点只证「命名音到达客户端即出行」这条链；**b 才是真实游戏事件面**（`EntitySheep:435` 服务端 `playSound(null,…)` → `sendToAllNearExcept` 16 格 → 客户端）。
> **a2 的面义**：证明客户端行不是「服务端一播就记」的广播错觉——目标指向 bot 时客户端 0 条。

## §1 逐点判词（判行原句 ＋ 行号锚）

行号一律指**全档行号**（含 Gradle / harness 行），可 `Select-String` 直取。锚点正本＝`testharness/build-logs/soundlog-w44-a.out`（**469,430 B／3,188 行**，phase A 重跑）与 `soundlog-w44-e.out`（**462,793 B／3,161 行**，phase e）；客户端＝`soundlog-w44-clientA2-latest.log`（**212,708 B／1,669 行**）与 `soundlog-w44-clientB-latest.log`（**211,953 B／1,663 行**）。

### W-44a（`/playsound` 正控）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 服务端回执 | `Played sound 'minecraft:entity.sheep.shear' to Developer` | `soundlog-w44-a.out:3066`（17:48:34） |
| 客户端判行 | `[SoundLog] name=minecraft:entity.sheep.shear pos=-70,76,249 [client]` | `clientA2:1634`（17:48:34） |

- 目标＝`Developer`（用户客户端），坐标＝当时 bot 位 `(-69.5, 76.0, 249.5)`；`pos` 逐位等于 `floor` 值 `-70,76,249` ⇒ 位置字段可信。
- 客户端从 `soundRows` 取段：a 段内 golden **恰 1**（同段另 0 条），无重复、无回声。

### W-44a2（目标指向 bot 的反控）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 服务端回执 | `Played sound 'minecraft:entity.sheep.shear' to ETIM_W44A` | `soundlog-w44-a.out:3068`（17:48:37） |
| 客户端判行 | **0 条**（该段仅 `music.game` `:1636` 一条非 golden） | `clientA2` a2 段（1635–1638 之间无 shear） |

⇒ 客户端判行**不是**「服务端播放即记」，必须 `SPacketCustomSound` 真的发到该客户端。

### W-44b（主判点：成年未剪羊）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 召唤（NBT 落刀） | `### [harness] > summon minecraft:sheep -68.5 76 249.5 {NoAI:1b,Sheared:0b,Silent:0b,PersistenceRequired:1b,Age:0}` | `a.out:3106` |
| 召唤回执 | `Object successfully summoned` | `a.out:3107`（17:48:41） |
| 剪前 Sheared:0b | `Found Sheep`（`{Sheared:0b}` 命中） | `a.out:3111`（17:48:43） |
| 剪前 Sheared:1b 反证 | `Sheep did not match the required data structure` | `a.out:3113`（17:48:44） |
| 持剪回执（fresh 栈） | `[EtimTest] commands.etest.hold_set player=ETIM_W44A params=[Rusted Iron Shears]` | `a.out:3115`（17:48:45） |
| **服务端判行** | `[MiningLog] tool decay face=shearing item=etim:shears_rusted_iron loss=50 [server]` | `a.out:3116`（17:48:46） |
| 剪后 Sheared:1b | `Found Sheep`（`{Sheared:1b}` 命中） | `a.out:3120`（17:48:47） |
| **客户端判行** | `[SoundLog] name=minecraft:entity.sheep.shear pos=-69,76,249 [client]` | `clientA2:1639`（17:48:46） |

- 判行**无 `block=` 列**（`state=null`，`:324-326`/`:700-704` 契约），去重键 `shearing|etim:shears_rusted_iron`、`sig=50`。
- 栈 Δ＝**50**（`durabilityUsed 0→50`，bot 面板逐点 fresh 栈）＝ `SHEEP_SHEAR_WEAR` 名值；`Sheared:0b→1b` 与会话客户端行同一秒（17:48:46）落。
- 客户端声源坐标 `-69,76,249` ＝ 羊位 `(-68.5,76,249.5)` 取整 ⇒ 声音来自羊而不是 bot。

### W-44c（同羊再剪）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 剪前 Sheared:0b 反证 | `Sheep did not match the required data structure` | `a.out:3131`（17:48:51） |
| 剪前 Sheared:1b | `Found Sheep` | `a.out:3133`（17:48:52） |
| 持剪回执 | `hold_set … params=[Rusted Iron Shears]` | `a.out:3135`（17:48:53） |
| 剪后 Sheared:1b | `Found Sheep` | `a.out:3137`（17:48:54） |
| 服务端判行 | **0 条**（全档仅 `:3116` 一条 shearing） | — |
| 客户端判行 | **0 条 golden**（最近邻 `entity.sheep.ambient` `clientA2:1644` 17:48:50） | — |

- `EntitySheep.isShearable`＝`!getSheared() && !isChild()` ⇒ 门内不触发，`damageItem` 不执行 ⇒ 既无 50 磨也无服务端行（**非 dedupe 掩蔽**：本点未进 `:706` 分支）。
- 栈 Δ＝**0**（`durabilityUsed 50→50`，本点重新 hold 出 fresh 栈后读 0→0）。

### W-44d（幼羊 0 行）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 召唤（`Age:-24000`） | `### [harness] > summon minecraft:sheep -68.5 76 249.5 {NoAI:1b,Sheared:0b,Silent:0b,PersistenceRequired:1b,Age:-24000}` | `a.out:3148` |
| 召唤回执 | `Object successfully summoned` | `a.out:3149`（17:48:58） |
| 剪前 Sheared:0b | `Found Sheep` | `a.out:3153`（17:49:00） |
| 剪前 Sheared:1b 反证 | `Sheep did not match the required data structure` | `a.out:3155`（17:49:01） |
| 剪后 Sheared:1b **仍不命中** | `Sheep did not match the required data structure` | `a.out:3161`（17:49:04） |
| 服务端判行 | **0 条** | — |
| 客户端判行 | **0 条 golden** | — |

- 幼羊门（`isChild`）与 `Sheared` 态双证：剪后 `{Sheared:1b}` 仍不命中 ⇒ 确实没被剪。

### W-44e（音量 0 面，独立 boot）

| 面 | 原句 | 锚 |
| --- | --- | --- |
| 召唤 | `### [harness] > summon minecraft:sheep -64.5 76 248.5 {NoAI:1b,Sheared:0b,Silent:0b,PersistenceRequired:1b,Age:0}` | `e.out:3118` |
| 召唤回执 | `Object successfully summoned` | `e.out:3119`（17:46:41） |
| 剪前 Sheared:0b／1b 反证 | `Found Sheep` ／ `Sheep did not match the required data structure` | `e.out:3123`（17:46:43）／`e.out:3125`（17:46:44） |
| 持剪回执 | `hold_set … params=[Rusted Iron Shears]` | `e.out:3127`（17:46:45） |
| **服务端判行** | `[MiningLog] tool decay face=shearing item=etim:shears_rusted_iron loss=50 [server]` | `e.out:3128`（17:46:46） |
| 剪后 Sheared:1b | `Found Sheep` | `e.out:3132`（17:46:47） |
| **客户端判行** | `[SoundLog] name=minecraft:entity.sheep.shear pos=-65,76,248 [client]` | `clientB:1639`（17:46:46） |

- 音量 0 的落地方式：客户端**整重启前**把 `run/obfuscated/options.txt` 的 `soundCategory_master:0.5066225` 改为 `0.0`（`GameSettings` 只在 boot 读 `options.txt`）；客户端退出时被重写为 0.0 形态，收窗已**逐字节还原**（4,467 B／`FEFDA096…F63190`）。
- 用户双耳确证（非判据、仅旁证）：正常音量窗（b）**听到剪毛声且看到音效字幕**；0 音量窗（e）**完全静音**，而客户端 golden 行照发 ⇒ **派发点先于 master volume 门**，与 `ETIMSoundLog` javadoc（`SoundManager:393-396` 在 listeners 循环之后）一致。
- e 必须独立 boot：同 boot 复演时 `logToolDecay` 的 `shearing|item` 键 `sig=50` 与 b 相同，会被 `:706-709` 吞掉（C-6）。

## §2 计数总账（写死判）

| 相 | 客户端 golden | 服务端 `face=shearing` | 其它衰减面 | 账 |
| --- | --- | --- | --- | --- |
| A（a/a2/b/c/d） | a 1／a2 0／b 1／c 0／d 0 ⇒ **合计 2** | **恰 1**（`a.out:3116`，loss=50，item=`etim:shears_rusted_iron`） | attacking 0／breaking 0／reach denied 0 | `serverShearing{count:1,want:1,ok:true}`；`otherChannelsZero:true` |
| E（e，音量 0） | **1**（`clientB:1639`） | **恰 1**（`e.out:3128`，loss=50） | attacking 0／breaking 0／reach denied 0 | `serverShearing{count:1,want:1,ok:true}` |

- 服务端判行发行序（每 boot 恰一条）：`etim:shears_rusted_iron loss=50`。
- 客户端 golden 发行序（A 窗）：`a: -70,76,249` → `b: -69,76,249`；E 窗：`e: -65,76,248`。
- 客户端**全量** `[SoundLog]` 表（f 面，含非 golden；`null` 行＝listener 注册行，不参与判点）：

| 客户端会话 | 行数（含 listener） | `entity.sheep.shear` | `music.game` | `entity.sheep.ambient` | `entity.item.pickup` | `entity.sheep.death` | `ui.toast.in/out` | `ui.button.click` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C4＝A 锚点窗（`clientA2`） | 12 | **2** | 1 | 4 | 1 | 1 | 1／1 | 0 |
| C3＝E 音量 0 窗（`clientB`） | 8 | **1** | 1 | 2 | 1 | 0 | 0 | 2 |

- `listener registered` 行（boot 面，四次客户端会话均命中，行号同为 `:719`）：C4 `17:48:26`／C3 `17:46:30`／C2 `17:43:5x`／C1 `17:41:48`；原句 `[SoundLog] listener registered [client]`。
- f 面噪声构成：`music.game`（背景乐）、`entity.sheep.ambient`（羊叫，含被 `kill` 前的 3–4 次）、`entity.item.pickup`（落毛拾取）、`entity.sheep.death`（d 点前清场 kill）、`ui.toast.*`、`ui.button.click`（C3 用户点退出）。**只记录，不作断言。**

## §3 起收钉值（全同 ⇒ 零 rebuild、零产品码改动）

| 项 | 起窗（任务书钉） | 收窗实测 | 判 |
| --- | --- | --- | --- |
| HEAD | `064e29864e58ffbfd5a4529c4c16cc660a5420b2` | 同（窗内零提交；`git status` 仅新增本窗驱动） | ✓ |
| release jar | 774,693 B｜`70BAB7117A25F3C08BE50EC9D5DEE14E2EC28167D6CE41070471B3FA5893A328` | 同（byte-identical） | ✓ |
| dev jar | 758,894 B｜`F98DDF24F0F4385C3E807E3244093AA88C7A64CED6860E56FAFB12DBBC594E8B` | 同（byte-identical） | ✓ |
| sources jar | 702,452 B｜`48B8FB8C93978351FD63F985F28E596D01C9806C617E8CAA5A644738C8E8360D` | 同（byte-identical） | ✓ |
| 服务端 cfg | 31,549 B｜`74327260B8822DABAB15EC02114D85BA8B0BDE3959ADDDF731E05F816C8AD666`（**无** `soundDebugLog` 键） | **32,095 B｜`E07CAC1E520C5213818500914712EE8CB0A88B907A661E0CBFAEE7587E7AE7F5`**（buddy boot 由 `ETIMConfig.init` 补键 `B:soundDebugLog=false`；553→556 行 `split('\n')` 口径，其中 555 个 CRLF） | ✓ 新增键＝预期唯一变化 |
| 客户端 cfg | 29,785 B｜`B38BF737555082592FA694154315DD04242EB5EA8D297BEEB97B747A9AA56FC2`（**无键**） | 见下三态 | ✓ 见下 |
| `server.properties` | 890 B｜`3009633863D7178D0B018E9E62ACF99CCB01C1E10C732BB99F989B571B654A48` | 同（byte-identical，`level-name` 与 `spawn-protection` 已还原） | ✓ |
| `run/obfuscated/options.txt` | 4,467 B｜`FEFDA096D5DA354D90A86D48166F42E2CDEE7A1D2ABFA5C608F38A4E67F63190` | 同（音量 0 期间 4,461 B｜`D20AB501…D11A68`，退出后 byte 还原） | ✓ |
| MK | refmap 双树 62 类键／138 条目（切片 Sword 4／Tool 4／Shears 3）＋ mixins 56／client 10 | 同（两树同值） | ✓ 139/57/11 未出现 |
| 端口 25565 LISTEN | 0 | 0 | ✓ |
| `run/crash-reports` | 18 | 18 | ✓ |
| 世界目录 | — | `run/soundlogw44`／`run/soundlogw44buddy` 均已删 | ✓ |
| Gradle | — | 每次 boot `:compileJava/:classes/:jar` 全 UP-TO-DATE；5 次 `BUILD SUCCESSFUL` | ✓ 0 rebuild |

**客户端 cfg 三态（翻转＋还原位自报）**：

| 态 | 时刻 | 字节 | SHA-256 | 行 | 内容 |
| --- | --- | --- | --- | --- | --- |
| ① 窗内原值（客户端 boot 补键 false） | 17:42:12 | 30,277 | `E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45` | 560 | `:163 B:soundDebugLog=false` |
| ② 翻转态（判窗用 true） | 17:42:41 | 30,276 | `A816CFBBF0AD95CEBD49A3ADE7925A0F80A472D014A302C329DB596E1BFCCD36` | 560 | `:163 B:soundDebugLog=true` |
| ③ 还原态（true→false） | 17:50:31 | 30,277 | `E37C13775A5C230FA67DF07DCEE009EFFAD9077AAED55906F47E171434F81C45` | 560 | `:163 B:soundDebugLog=false` |

> ③ 与 ① **逐字节相同**（`identical-to-prefold=true`，驱动 `clientrestore` 只在 SHA/字节双等时才不抛）。字节差 1 来自 `true` 比 `false` 少一个字符，属预期。
> ◎ 带外不判负：本批 jar 不重钉——byte-identical 为主预言，5 次 boot 实测成立，未出现「build 破坏 byte-identical」的异常停窗条件。

## §4 冲突分级（A / B / C）

**A 级 0 条**（无判点 FAIL、无产品码改动、零 rebuild）。

| 号 | 级 | 事项 | 处置 |
| --- | --- | --- | --- |
| B-1 | B | **`[SoundLog]` 行无触发源标识**：只给 `name=` 与 `pos=`，同坐标多羊/多源同时发声时无法归属到具体实体或来源（本窗靠「单羊单点＋清场 kill」保证唯一性）。 | 若后续要多源同场，建议行尾追加 `src=<entityId>`（或 `block=`）；本窗不改，判据成立。 |
| C-1 | C | **同名 tag 覆盖**：phase A 首次窗（17:43–17:44）与后续 phase 共用 `soundlog-w44-a` 前缀，`.out` 被第二次 boot 截断覆盖。 | 驱动加 `W44_STAGE`（服务端 tag 独立）；以 **17:47–17:49 重跑窗**为锚点正本，首次窗证据 JSON 保留作重复性旁证（`soundlog-w44-evidence-A.json`）。 |
| C-2 | C | 客户端 `latest.log` **每次启动轮转**（旧档压 `*.log.gz`），同一「窗」跨多会话时行号不可跨档引用。 | 四次客户端会话各自快照（`-client1/-clientA/-clientB/-clientA2-latest.log`），行号按档归属。 |
| C-3 | C | `hold_set` 回执只给**显示名**（`params=[Rusted Iron Shears]`），不含 registry name。 | 栈身份以服务端判行 `item=etim:shears_rusted_iron` 为准（W-42 C-5 家族）。 |
| C-4 | C | modded 栈 mineflayer 侧 **无 `maxDurability`**，仅 `durabilityUsed` 可读。 | 只用 Δ（0→50／0→0），不读 max、不算百分比（W-42 C-2 家族）。 |
| C-5 | C | 音量 0 走 **options.txt 文件面 + 客户端整重启**（`GameSettings` 只在 boot 读）；客户端退出会重写该档。 | 起窗快照、收窗 byte 还原（4,467 B／`FEFDA096…`），中态 4,461 B／`D20AB501…` 另存 `-options.volume0`。 |
| C-6 | C | **同 boot 复演 e 会被 last-sig 吞**：`logToolDecay` 键 `shearing|item`、sig=50（`:698-709`），与 b 同值 ⇒ 第二条不发。 | e 落独立 boot（`soundlog-w44-e`），故服务端仍「每 boot 恰 1 条」。此为本批「双 boot」的硬理由，不是工装偏好。 |
| C-7 | C | 客户端进服用 **quick-connect**（`-PetimQuickConnect=1 -PetimQuickHost=localhost`，`testharness/obfclient-fix.init.gradle` 既有能力）代替 GUI `Direct Connect`；GUI 面零 AI 触碰（C3 窗内 2 次 `ui.button.click` 是用户点退出）。 | 属工装手法登记；不算客户端判据面。 |
| C-8 | C | **旧名负控未做**：R196 legacy `mob.sheep.shear` 命中 `SoundEventAccessor == null` 门 ⇒ 0 行（假 FAIL 陷阱）。本窗全程只用 1.12 注册名 `minecraft:entity.sheep.shear`，未引旧名。 | 纪律已在任务书固化；如需负控另批（`/playsound` 遇未注册名会先被命令层拦，需换注入面）。 |
| C-9 | C | **许可链不成立（AI 越权，程序面）**：本窗 4 次客户端进程由 AI 以 `gradlew runObfClient` 发起、并由 AI 用 `close-client.ps1` 关闭。当时依据的是用户对「客户端由谁拉起」一问的答复「更新纪律：除非用户当次明文许可」，AI 将其读作默示许可；用户随后澄清**必须 AI 明确申请 → 用户明确回复**才算当次明文许可、**不可臆断**。 | 已按裁定改 `AGENTS.md`「客户端操作纪律」条 0（写明申请四要素、明文肯定回复、沉默/模糊/元表述/事后追认皆不构成许可）。本批登记为**程序违规**；**不影响判据**——判据全部来自服务端日志＋客户端日志文件＋bot 面，未采信任何 GUI/截图证据，客户端仅作声音接收端；如需按纪律重做，可另开窗由用户起客户端复跑同一驱动（判点与钉值可原样复用）。 |

## §5 待主会话裁决位（D-n）

| 号 | 裁点 | 选项 | 本窗倾向 |
| --- | --- | --- | --- |
| D-1 | `[SoundLog]` 是否**升为标准客户端判据通道** | (a) 升（命名音面一律走此通道，行形固定 `name=… pos=… [client]`） ／(b) 仅本批 | **(a)**：a/a2 正反控＋b/c/d 三态＋e 音量门四点全中，通道可判真假且可重复（两窗同值） |
| D-2 | f 噪声面是否需要**过滤开关** | (a) 不加（记录面足够，单会话 7–11 条可控） ／(b) 加 `soundDebugLogFilter` 白名单 | **(a) 先不加**（AGENTS 条 2「最简单实现」；噪声量级 <20 行/会话，不淹日志） |
| D-3 | e 面口径固化 | (a) `options.txt` 文件面 + 整重启（可重复、零 GUI） ／(b) 用户 GUI 滑条（免重启、不可重复） | **(a)**：本窗实测可重复且判据不依赖手感；GUI 面仅作旁证 |

## §6 收口表

| 面 | 状态 |
| --- | --- |
| 服务端 | 5 次 boot 全 `BUILD SUCCESSFUL`：buddy `:2438`（21s）／A 首次 17:43–17:44／E `e.out:3158`（1m8s）／A 重跑 `a.out:3185`（1m29s）；`Done (5.4~5.7s)` 三次（`a.out:2256`／`e.out:2256`／buddy `:2256`） |
| 客户端 | 4 次会话全部**优雅退出**（`Stopping!` 落档）：C1 17:42:12（`client1:…`）／C3 `clientB:1660` 17:46:54（用户点退出）／C4 `clientA2:1666` 17:49:27（`close-client.ps1` WM_SYSCOMMAND+WM_CLOSE）／C2 同法。★4 次**启动与关闭均由 AI 发起**，许可链不成立 ⇒ 见 C-9 |
| 端口 | 25565 LISTEN＝0（起 0／收 0）；25575 未用 |
| 崩溃 | `run/crash-reports` 18 → 18（无新增） |
| cfg/props/options/ops/usercache/usernamecache | 服务端 cfg＝预期新增键（32,095 B）；其余五项 byte-identical；客户端 cfg 三态见 §3 |
| 世界 | `run/soundlogw44`、`run/soundlogw44buddy` 已删 |
| rebuild | **0**（每次 boot `:compileJava/:classes/:jar` 全 UP-TO-DATE；三 jar 起收 SHA 同值） |
| 产品码 | 0 行改动（`git status --porcelain` 仅新增 `testharness/player/soundlog-w44.js`；HEAD 未动） |

## §7 工装与复跑

- **驱动**：`testharness/player/soundlog-w44.js`（骨架＝`shearwear50-w38.js` 羊面臂；破块/挖掘臂已裁掉；新增客户端日志只读面与 `/playsound` 判点）
  - 模式：`W44_MODE=buddy|clientflip|clientrestore|window`
  - 判点裁剪：`W44_ONLY=W-44a,W-44b`；`W44_E=0` 关 e；`W44_STAGE=<tag>` 独立服务端 tag（C-1 修复）
  - 客户端日志：`run/obfuscated/logs/latest.log`，**只读文件**，按字符偏移取每点段（`soundRows`／`goldenRows`）；文件面不看 GUI。
  - 客户端进服：`-PetimQuickConnect=1 -PetimQuickHost=localhost -PetimQuickPort=25565`；驱动侧 `waitClientJoin()` 轮询 `X joined the game`（排除 bot），随后 `tp` 到竞技场并 `sleep 3s`。
  - 音量 0 面：`W44_E_NOACK=1` 跳过聊天握手（音量由 `options.txt` 落地）。
- **判点定义**（`POINTS`）：a（playsound→client，expect client 1）／a2（playsound→bot，expect 0）／b（adult，client 1＋server 1＋loss 50＋Δ50＋Sheared→1）／c（reuse，0/0/Δ0）／d（baby，0/0/Δ0＋Sheared 仍 0）／e（adult＋volumeZero，1/1/50/Δ50）。
- **证据卷**（`testharness/build-logs/`）：`soundlog-w44-a.out`（469,430 B／3,188 行）／`soundlog-w44-e.out`（462,793 B／3,161 行）／`-a-server-latest.log`／`-e-server-latest.log`／四份客户端 `-latest.log` 快照／`-evidence-A2.json`（26,196 B）／`-evidence-E.json`（14,536 B）／`-evidence-A.json`（首次窗旁证）／`-buddy-evidence.json`（3,605 B）／`-clientcfg.json`／`-options.before`／`-options.volume0`。
- **复跑命令**（仓根 `git-workspace/etim`）：

```powershell
# 1) 落键（一次）
$env:W44_MODE='buddy'; node testharness\player\soundlog-w44.js soundlog-w44
# 2) 客户端启动一次（主菜单即可）退出后：翻 true
$env:W44_MODE='clientflip'; node testharness\player\soundlog-w44.js soundlog-w44
# 3) 判窗 A（先起服，再以 quick-connect 起客户端）
$env:W44_MODE='window'; $env:W44_ONLY='W-44a,W-44a2,W-44b,W-44c,W-44d'; $env:W44_E='0'; $env:W44_STAGE='soundlog-w44-a'
node testharness\player\soundlog-w44.js soundlog-w44
# 4) 判窗 E（options.txt soundCategory_master=0.0 后）
$env:W44_ONLY='W-44e'; $env:W44_E='1'; $env:W44_E_NOACK='1'; $env:W44_STAGE='soundlog-w44-e'
node testharness\player\soundlog-w44.js soundlog-w44
# 5) 还原
$env:W44_MODE='clientrestore'; node testharness\player\soundlog-w44.js soundlog-w44
```

- **判行复核（可粘贴）**：

```powershell
Select-String -Path testharness\build-logs\soundlog-w44-a.out -Pattern '\[MiningLog\] tool decay face=shearing'
Select-String -Path testharness\build-logs\soundlog-w44-a.out -Pattern 'Played sound|hold_set|Object successfully summoned'
Select-String -Path testharness\build-logs\soundlog-w44-clientA2-latest.log -Pattern '\[SoundLog\]'
Select-String -Path testharness\build-logs\soundlog-w44-clientB-latest.log -Pattern '\[SoundLog\]'
Select-String -Path git-workspace\etim\src\main\java\io\github\etim\etim\client\ETIMSoundLog.java -Pattern 'soundPlay|listener registered|soundDebugLog'
```

- 任务书末项「judge 修复态变量 Kong」在本窗**无可落点**（驱动为一次性判窗脚本，无 judge 状态变量），按 N/A 登记。

## §8 未覆盖面（不补白）

1. **旧名负控**（`mob.sheep.shear` → accessor null 门 0 行）未实测，仅按纪律禁用（C-8）。
2. **多源同场归属**：`[SoundLog]` 无来源字段（B-1），本窗用单羊单点回避，未验证同坐标多羊。
3. **其它 `IShearable`**（mooshroom／snowman）的剪毛声未测（R196 只有羊面；1.12 另两类走 vanilla +1，声名不同）。
4. **资源重载后 listener 存活**未测（javadoc 断言 `SoundManager` 不清 listeners；未做 F3+T 重载验证）。
5. **无客户端在场**时服务端行照发（0 客户端行）未单独成点。
6. **创造模式剪羊**（`loss=0` 行 + 声照发）未测（W-38f 已判 dur 面，声面未并测）。

## §9 自报（机械核讫）

> 文件：`testharness/reports/soundlog-W44-verdict.md`｜**24,711 B**｜249 行｜首字节 0x23｜U+FFFD 0｜CR 0
> SHA-256 口径甲（全文：把本行这串 64 位十六进制整体替换成 64 个字符 `0` 后再算）`B09EFB97B76C877EE8682B892B654556A3239EF0B95B956DC2024914E4BD7AF8`
> SHA-256 口径乙（正文：自文件首字节起算至 `## §9 自报（机械核讫）` 行之前，不含该行）`5226600B913E2A32BEF851C4E29B0A7DBFF6AA8F88BC7A3BCA78BFF6FC39EAE1`
> 判点 6（W-44a／a2／b／c／d／e）｜客户端 golden 1／0／1／0／0／1｜服务端 shearing 每 boot 1 条 loss=50｜冲突 A0 B1 C9（含 C-9 许可链不成立）｜待裁 D-3｜jar byte-identical／零 rebuild／产品码 0 改
