# W-B70UQ 判窗正本：刷怪/生长/屠宰/消失四族纯函数提取

- 执行会话：会话七（验证窗）；落码与汇总：主会话
- 判窗时段：2026-11-27 20:33–20:37（单轮三窗）
- 钉值：`b70uq-build1`（release 1,578,766 B `E4EA60A67F967F941BB59DF47859E291EBA721B122F9EEB021AE086AD1E3C041`，mtime `2026-11-27T12:28:30.592Z`，窗内 0 rebuild）
- 终判：**PASS**（A=0 / B=0 / C=4）

## §0 改了什么

四族「纯算术」从世界代码抽出，语义一字未改：

| 新类 | 面 | 调用方 |
| --- | --- | --- |
| `farm/GrowthGates.java` | 气温窗口、四邻 0.5/0.75/1.0、连乘次序、光照窗口（茎例外） | `ETIMFarm` 4 处 |
| `combat/ButcherGates.java` | 牛/猪/羊/马/蜘蛛掉块映射 + 健康度 | `ETIMButchering` 11 处 |
| `mob/DespawnGates.java` | 三层墙、含宽限小时的竖直距离、击杀/携带、重掷 ±50 | `DespawnRules` 4 处 |

保留要点：牛/猪/羊掷序 `r(3) → r(1+level)`；蜘蛛 `a==0` 短路；羊毛先判 sheared/burning；消失重掷 `(int)(rand*100)-50`。

## §1 单测

`GrowthGatesTest` 14 + `ButcherGatesTest` 13 + `DespawnGatesTest` 10 = **+37**；全仓 **255 例 / 0 失败**（17 个测试类），`gradlew test` 约 1.2 s。

## §2 三窗（会话七，串行独立起服）

| 窗 | 脚本 | 结果 | 对位基线 | verdict |
| --- | --- | --- | --- | --- |
| r1 | `f11-b69-smoke.js` | W1–W4 全 true，99 s | `b69-b70t4-r2-b1.out` | `arms 51/50 diffs=0 MATCH` |
| r2 | `f17-reg-fourth.js` | W1–W6 全 true，38 s | `f17-b70ua-r3-b1.out` | `arms 69/77 diffs=0 MATCH` |
| r3 | `f11-b60-smoke.js` | W1–W6 全 true，37 s | `b60-b70tw-r5-b1.out` | `arms 64/54 diffs=0 MATCH` |

三对另以 `--strict-arms`（同键次数也纳入）复跑，仍全部 MATCH。

## §3 数值层抽核（工具不覆盖，会话七人工比）

- `[FarmLog] drought` 22 vs 22，字段同形（`pos=10,130,4 below=minecraft:stone dry=0 water=0 master=1 chance=0.05`）。
- `[StalkerLog] spawn` 6 vs 6；follow 形态 40.0×4 + 1 条等级随机值（基线 40.7289… / 本窗 42.8150…）——形态同、数值随机。
- `[ButchLog] cow` 字段逐字同形（`well= lvl= leather= rB= nudge= beef= burning=`）；nudge 两侧全 0（键恒在，仅真的改动 beef 时才为 1）。

## §4 分级

- **A=0 / B=0**
- C-B70UQ-1 `verify-diff` 的 arms 键是「`[通道]` 首 token」，默认不比同键次数与行内数值；已用 `--strict-arms` + 人工抽核补强（工具口径，非本批缺陷）。
- C-B70UQ-2 三窗 distinct-key 数不同（51/50、69/77、64/54），差异全在 keep 集外通道（AILog/SpawnLog/OreLog 等环境噪声）。
- C-B70UQ-3 leather/beef/rB/follow 属随机骰，不逐值相等，只判字段形态与语义。
- C-B70UQ-4 世界名三段式（`H.create` 的 world 模板）。

## §5 收口

cfg `C69FC496…E5AEC257` 起收同；props `6784C3ED…D21322F1EB9` 起收同；port 0→0；crash 0→0；HEAD `4748c1e` 窗内 0 提交；三窗 `[stop] exitCode=0`。世界 `run/w-b69-b70uq-r1-v1`、`w-reg4-b70uq-r2-v1`、`w-b60-b70uq-r3-v1` 全部保留。

回执：`testharness/reports/b70uq-verify-receipt.md`（6,159 B / 97 行）。

## §6 终判

`PASS`（A=0 / B=0 / C=4）。行为零变化成立，纯提取可安全保留。
