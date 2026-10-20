# testharness/client — 客户端链（会话七）

## 起客户端（两条链，别混）

| 链 | 命令 | mod 面 | 用途 |
|---|---|---|---|
| **dev 客户端** | `git-workspace\etim` 下 `.\gradlew.bat runClient`（background + 无 timeout） | ETIM（classpath）+ mixinbooter；兼容.md 清单由构建钩子 `etimDevClientModsHold` 自动 hold 进 `run/mods-hold-dev`，客户端退出自动放回 | ETIM 行为肉眼轮（tooltip / HUD / 手感） |
| **obf 客户端** | `.\gradlew.bat -I testharness\obfclient-fix.init.gradle runObfClient` | 全量 19 mod（`run/obfuscated/mods`） | 发布级全兼容验收 |

- dev 客户端 Direct Connect `localhost`。
- 判据纪律：tooltip / HUD / 手感类 = **用户肉眼转述唯一判据**；客户端 `run/logs/latest.log` 由会话七直读作对照（ERROR/Exception 计数，连接层噪声分列）。
- 兼容清单主本 = 仓库根 `兼容.md` + `run/mods`；增删 mod 只动那里，obf 面由 `restoreCompatMods` 自动跟随。
- **hold 泄漏复原**（gradle 轮被硬杀后 `run/mods` 变空）：`gradlew etimDevClientModsRestore` 手工放回。

## 四连崩事故档（2026-10-20 · 改链缘起）

dev 客户端装生产兼容 jar 四连崩（全是 deobf dev 运行时对 coremod/SRG 名构建的面）：

| mod | 崩法 |
|---|---|
| OptiFine HD U G5 | `GlStateManager.getBlendState` VerifyError |
| SmoothFont 2.1.4 | 同一处 VerifyError（ASM `GET_BLEND_STATE:true`） |
| ReBind 2.7.5 | `NoSuchMethodError: KeyBinding.func_151469_h()I` |
| MouseTweaks 2.10.1 | `NoClassDefFoundError: bib`（obf 类名） |

只留 ETIM + MixinBooter 后 dev 客户端正常（FML 6 mods loaded）。此后 dev/obf 分链由构建钩子（`etimDevClientModsHold` / `etimDevClientModsRestore`）**机械执行**，不再靠人记兼容表；每次客户端轮仍须显式核对启用的链与 mod 面匹配（dev = 肉眼轮，obf = 全量验收）。
