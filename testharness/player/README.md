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

## 已知限制 / 风险

- `minecraft-protocol-forge` 是 deathcap 2016 版（npm 最新即 1.0.0），FML|HS 1.12.2 registry burst 若失败，需脚本层补 ACK 处理——出现即按偏差登记报主会话。
- 服务器 mod 清单由 status ping 镜像而来，服务器增减时自动跟随，无须硬编码 `etim`。
- 本目录 `node_modules/` 已 gitignore，不进发布 jar；不进兼容清单。
