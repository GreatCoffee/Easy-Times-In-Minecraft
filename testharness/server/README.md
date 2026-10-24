# testharness/server — runner-driven 专服（会话七 · harness 侧）

## 起服链（80min 类长窗标准流程）

```powershell
# 1. 停旧服（RCON 客户端是 player\rcon-client.js——rcon.py 有 auth 应答 type 判型 bug）
cd ..\player
& D:\Documents\Softwares\Node\22.22.2\node.exe rcon-client.js 127.0.0.1 25575 etim27 "stop"

# 2. 重建（改产出 → build + dump；长输出落 build-logs，见 AGENTS Token 纪律 4）
cd D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim
$env:JAVA_HOME = "C:\Users\GreatCoffee\tools\jdk-25.0.4.1+1"
& .\gradlew.bat build etimDumpServerExec 1> build-logs\<tag>.out 2>&1
Select-String -Path build-logs\<tag>.out -Pattern "^\[etim-harness\]" | ForEach-Object Line | Set-Content testharness\server\exec-dump.txt

# 3. etim jar 同步（build\libs → obf mods；见下面归属条款）
Copy-Item build\libs\etim-1.0.0.jar run\obfuscated\mods\etim-1.0.0.jar -Force

# 4. 起服（fail-fast 断言 + headless/nogui 注入，v2 起）
cd testharness\server
powershell -ExecutionPolicy Bypass -File .\start-server.ps1
```

## mods-hold 归属约定（主会话裁定 2026-10-14 · 不再猜）

| jar | 归属 | 载入路径 |
|---|---|---|
| **etim jar** | **永远在 `run\obfuscated\mods\`**——不进 mods-hold、不靠 classpath（exec-dump 的 classpath 不含 project jar；mods 是 boot 唯一 mod 发现面）。`build\libs\etim-1.0.0.jar` 有新版本时第一步同步拷贝 | mods |
| **10 个客户端 mod**（OptiFine/SmoothFont/rebind/journeymap/rad/StepUp/MouseTweaks/jecharacters/osxnarratorblocker/fencejumper） | `mods-hold.ps1` 的 hold/release 两把刷 | round 开始 hold → server round 结束 release |

**纪律**：`mods-hold.ps1` **不管 etim jar**；etim jar 的同步与存在校验由 `start-server.ps1` v2 的 fail-fast 断言兜底（缺失即 abort 不静默）。gradle 侧 `etimTestServerModsHold` hook 会在 `runObfServer`（gradle 直起）回合把 etim jar stash 进 mods-hold——**gradle 直起 then runner 手动再起需要先把 etim jar 拷回 mods**（接力流程 3 恒执行即可）。

## 已知事故档（2026-10-14 80min 窗）

1. etim jar 未进 mods → 整窗裸原版（SpawnLog 全 0）——fail-fast 兜住。
2. ServerGui WindowEvent 关闭 → 中途停服（18:35:04 在案）——headless + nogui 兜住。
3. shell 前台命令超时树斩（Start-Process 子进程同哭）——起服/hold 类长窗一律 **background + 无 timeout**。
4. RCON 判型：vanilla 1.12.2 auth 应答 type=2（rcon.py 等 type=3 超时）——用 `player\rcon-client.js`。
