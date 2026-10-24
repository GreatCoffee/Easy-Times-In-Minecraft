# testharness/player — 假玩家通道（会话七）

mineflayer + FML|HS 握手，连主会话起好的 runServer（etim 已装）。**node 侧一切落此目录；服务端配置（server.properties/RCON/world）与 A1/A4/A10 闭环归主会话**（首期分工裁定 16:5x）。

## 执行时基

`D:\Documents\Softwares\Node\22.22.2\node.exe`（Node 22 LTS，engines 已锁 `>=22.18 <25`）。

## 前置（主会话措置）

1. runServer 起好、etim jar 就位、`online-mode=false`；
2. op 已授三端点（ops.json level 4，boost 起服即生效）：ETIM_Harn01、ETIM_Harn03（Harn03/Harn04 为会话七并行端点，Harn01 主会话占）。
3. tp 回执凭据判定：`/tp` 成功以服务端回执（`Teleported …` / `commands.tp.success.*`）为据，位置包迟到不可作判。
4. 分源纪律（判读面）：`[chat]` combat 死亡消息是噪声不是判据；despawn 判以 `[AILog] mob despawn kill` 行内 entity=；observe-entities 只作对照观察。

## 命令

```powershell
# P0 握手小验证：FML ping 镜像服务器 mod 清单 → 握手 → /list + /etest → 打印验收摘要
& D:\Documents\Softwares\Node\22.22.2\node.exe connect-dev.js [host] [port] [username]
# 另有 npm 简写：npm run handshake

# A2 消散击杀假玩家通道：进服 → /tp 落点（≥16 格 + 视线遮断，坐标主会话给）
#   → /say 标记进服务端日志 → heartbeat 保持存活 → 结束打 end 标记
& D:\Documents\Softwares\Node\22.22.2\node.exe a2-despawn.js . 25565 ETIM_Harn01 --tp 100 40 200 --wait 150

# 公共模块（两脚本共用）：fmlbot.js
```

## 判读接口（供主会话判读器消费）

- 对齐标记：收 `load` 后 `[say] [HarnMark] A2 begin ts=… tp=…`，结束 `[HarnMark] A2 end ts=… stayed=…s`——有 op 时走 `owner` 落服务端 `latest.log`（可 grep `[HarnMark]`），无 op 仅脚本 stdout。
- FML 握手摘要走 stdout 前缀 `[fmlhs]`、聊天回文前缀 `[chat]`；registry 帧只计数量（`LOGIN OK … registry_data 帧=N`）。
- 判定基准：`D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\run27 测试书.md` 判定列 `[AILog]` 行文案，判读器以「首个出现」为准（每 entity 每理由恰 1 行的和已内含去重语义）。

## 通道纪律（RCON vs bot chat）—— 位置语义归属

**裁定**：`playground/audit/audit19-w3-close.md`；事故面详录 `testharness/reports/spawn-cycle-02-verdict.md` W3 追加系列 §六。

**根因**：Minecraft RCON 的 command sender **没有实体位置**（1.12 行为），故凡以 sender 位置为基准的语义一律失效：

| 失效项 | 实测 | 归属通道 |
|---|---|---|
| `@e[r=N]` 半径选择器 | 统计**原点附近**，非玩家附近 | **bot chat** |
| `/kill @e[...,r=N]` | 同上 | **bot chat** |
| `/testfor`（含空间限定） | 同上 | **bot chat** |
| `/execute <x> <y> <z> run …` | **同样无效**——不带 `r` 的 `testfor @e[type=zombie]` 亦返 0，同刻全局返 20 | **bot chat** |

**分工**：

- **bot chat 面**（`box-ops-via-bot.js` 等，发令实体有位置）：`@e[r=]`、`/kill`、`/testfor` 空间面、`/summon`、`/gamemode`。
- **RCON 面**（`rcon-client.js`，仅限无位置语义命令）：`gamerule`、`time set/add`、`time query`、**无位置限定的全维 `testfor`**、`stop`。

**使用禁令**：

1. 任何「玩家／bot 附近有多少某类实体」的判读，**禁止**走 RCON；必须 bot chat 面，或改用 `[SpawnLog]` 行内自含计数（如 `cap-comp`／`density-skip` 的 `imobs=`——后者与位置锚定无关，天然可靠）。
2. 已由 RCON 位置面产出并写进报告的判读（W2h/W2i testfor 四型零值面等）**须加通道更正标记**，已在 `moon6-backend-verdict.md` W2j 节与 `spawn-cycle-02-verdict.md` W3 §5.2/§5.3 落标记。

**附带纪律（同源事故）**：

- **同名 bot 互踢**：两脚本同用 `ETIM_Harn04` 会触发 `KICKED "multiplayer.disconnect.duplicate_login"`，被踢方的 heartbeat 仍会继续打印（socket 已闭而定时器未停）→ **heartbeat 不断 ≠ 在线**。需并行时用不同账号，或令两者**不同时在线**（本仓现采后者：`hold` 收线后再跑工步）。
- **`summon` 存活率**：同点批量投放的敌对生物会堆叠互殴／摔落致死（W3b2 首投 11 头仅存活 1）。投放须带 `{NoAI:1b,Silent:1b,Health:20.0f,…}` 并让 bot **延长在线**，以覆盖密度门求值拍。
- **`exceptions` 哨分层**：harness bot 退场产生的 `NetworkDispatcher exception / java.io.IOException: 远程主机强迫关闭` 属**连接层噪声**，非 mod 异常；判读时与 mod 异常**分列**（口径是否改判由主会话裁定，会话七仅按实况登记）。

---

## mob 受控面布局（骨王狂化面 · 会话七固化，2026-10-25）

判点范式：`[AILog] frenzy set entity=… target=…` 的**行数**即状态变化次数（C-1 v3 起，抑制窗基准 = 上次 **set** tick，稳态续期静默）。判窗边界一律用 `/say W7R3|<win>|begin|end` 落服务端 `latest.log`，证据按标记行切片，不依赖 driver 侧时钟。

| 要素 | 做法 | 为什么 |
|---|---|---|
| **lord 钉住** | RCON 每 **0.9 s** 执行 `tp @e[type=etim:bonelord,c=1] <x> <y> <z>`（绝对坐标，无位置语义，可走 RCON） | 目标清空后 lord 进入 wander，数秒走出 16 格管理盒 → 停止续期 → 出现**假静默**（R3 实测 0 行）。钉住后静默窗才是真静默 |
| **切目标** | 目标假人 `gamemode 1`（**原地**转 creative，不离职）→ lord 目标失效并重选第二名假人；**禁用 `kill`** | 假人重生点在场地上空 ~33 格：`kill` 后落回场内，数秒即被 lord 击杀 → 目标自污染（R2 实测） |
| **骷髅环布** | 6 只 `minecraft:skeleton` 按 bot **实时坐标** `Math.floor` 取环心、r=5 环布，带 `{NoAI:1b,PersistenceRequired:1b}` | 硬编坐标会随世界/落点漂移；`NoAI` 防互殴，`PersistenceRequired` 防 lord 的 troop-despawn 回收（`num>0` + `idleTime>=0` 分支会试图回收） |
| **lord 受控** | `summon etim:bonelord … {num_troops_summoned:6b}`（封顶不召兵，S 恒定）；坐标拼串后必须 `node --check` + 看首条 `summon` 回执 | 召唤坐标拼接错（`-63.5.5`）会得到全 0 假静默，整轮作废（R6 事故） |
| **现场探针** | `execute @e[type=skeleton] ~ ~ ~ say PROBE3_SKEL` / `…bonelord… say PROBE3_LORD` + `entitydata @e[type=etim:bonelord,c=1] {}` | 非破坏计数（RCON 无位置语义，`@e[r=]` 失效；`scoreboard players get` 在 1.12 不存在）。**`kill` 类回收只在判据窗全部结束后做**，否则破坏现场 |

- 静默窗成立的必要旁证：**每次状态变化恰 6 行**（6 骷髅各 1 行）+ 窗后仍能出新批次（证明骷髅活着、续期未停），否则「0 行」可能只是场景死了。
- bot 端 `frenzy set` 无实体 id（`entity=Skeleton`），只能按行率/逐秒指纹判，不能按实体分组。

---

## 已知限制 / 风险

- `minecraft-protocol-forge` 是 deathcap 2016 版（npm 最新即 1.0.0），FML|HS 1.12.2 registry burst 若失败，需脚本层补 ACK 处理——出现即按偏差登记报主会话。
- 服务器 mod 清单由 status ping 镜像而来，服务器增减时自动跟随，无须硬编码 `etim`。
- 本目录 `node_modules/` 已 gitignore，不进发布 jar；不进兼容清单。
