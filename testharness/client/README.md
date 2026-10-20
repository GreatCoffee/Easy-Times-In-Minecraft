# testharness/client — 客户端链（会话七）

## 硬约束（用户裁定 2026-10-20，立即生效；取代 580525a 全 hold 链）

1. **兼容列表 = 硬门**：仓库根 `兼容.md` 13 个 mod（主本 = `run/mods` 13 jar）必须与 ETIM 同载；任何客户端轮发现列表 mod 未加载，必须**显式失败并列出缺失项**，不得继续跑、不得静默 hold/移出/跳过。
2. **逐 mod 例外**：仅当某兼容 mod 有重大缺陷致客户端彻底无法启动、且有崩溃报告/日志直证，才可只移出该 mod，任务书写明证据与范围；**不得因为一个 mod 崩就把整份列表全 hold**。当前直证豁免仅四个（下事故档），其余 9 个兼容 mod 在 dev 轮与 ETIM 同载。
3. **客户端先行**：需要用户客户端测试的任务，先起客户端到主菜单，再起服务端/连接；不得先起服务端硬等客户端。

## 两条客户端链

| 链 | 命令 | mod 面 | 用途 |
|---|---|---|---|
| **obf 客户端（客户端测试默认链）** | `.\gradlew.bat -I testharness\obfclient-fix.init.gradle runObfClient`（background + 无 timeout） | 全量：13 兼容 mod + 框架集 + etim jar（init 脚本同步） | **用户肉眼轮一律走这条**（Q-4/Q-5 等）；发布级全兼容验收 |
| **dev 客户端** | `.\gradlew.bat runClient`（background + 无 timeout） | ETIM（classpath）+ 9 个非豁免兼容 mod 同载；4 个直证豁免单由 `etimDevClientModsGate` 逐 mod hold 进 `run/mods-hold-dev`，退出自动放回（崩溃退出也放回） | 开发冒烟；豁免单须逐 mod 补崩溃直证扩充，全无直证面走 obf 链 |

- 两链起跳均挂硬门：缺兼容 mod 即 `COMPAT GATE FAIL` + 缺失清单，构建中止。手动核对双面门态：`gradlew etimCompatGateCheck`。
- **客户端先行流程**：先起客户端到主菜单 → `testharness\server\start-server.ps1` 起服 → 客户端 Direct Connect `localhost`。
- obf 客户端日志 = `run/obfuscated/logs/latest.log`（会话七直读对照：ERROR/Exception 计数，连接层噪声分列）。
- 判据纪律：tooltip / HUD / 手感类 = 用户肉眼转述唯一判据，转述须抄原文。
- hold 泄漏复原（gradle 轮被硬杀后 `run/mods` 缺豁免单 jar）：`gradlew etimDevClientModsRestore`。
- 服务端轮的 `etimTestServerModsHold`（hold 10 个 client-only jar + etim jar）**不在本约束范围**：专用服装客户端 mod 必崩（该任务注释内有直证），且服务端轮非客户端测试轮。

## 四连崩事故档（2026-10-20 · dev 豁免单证据表）

deobf dev 运行时对生产 coremod/SRG 名构建 jar 的崩面（直证 = 当轮崩溃报告）：

| mod | 崩法 |
|---|---|
| OptiFine HD U G5 | `GlStateManager.getBlendState` VerifyError |
| SmoothFont 2.1.4 | 同一处 VerifyError（ASM `GET_BLEND_STATE:true`） |
| ReBind 2.7.5 | `NoSuchMethodError: KeyBinding.func_151469_h()I` |
| MouseTweaks 2.10.1 | `NoClassDefFoundError: bib`（obf 类名） |

其余 9 个兼容 mod 尚无 dev 直证——dev 轮同载实测，崩一个按例外条款逐 mod 补证豁免；不适合同载实测的面直接走 obf 链。
