# B-70UQ 回归窗回执（生长 / 屠宰 / 消失三族纯函数提取后的行为等价）

> 生成：会话七（ETIM 验证窗执行）· 2026-11-27 20:42 CST
> 工单：主会话 m06604（2026-11-27 20:29）
> 终判：**PASS**（A=0 / B=0 / C=4）

## §0 钉值（实测，只读）

| 项 | 实测值 | 工单钉值 | 判定 |
|---|---|---|---|
| `f7-wb-lib.js:35` PIN | `b70uq-build1` | 同 | ✔ |
| release | 1,578,766 B | 1,578,766 B | ✔ |
| release SHA256 | `E4EA60A67F967F941BB59DF47859E291EBA721B122F9EEB021AE086AD1E3C041` | 同 | ✔ |
| jar mtime（起/收） | `2026-11-27T12:28:30.5924Z` / 同 | 未变 | ✔（0 rebuild） |
| MK | 114 / 282 / 564 + 115 / 10，三窗 `mkOk=true` | 同 | ✔ |
| HEAD | `4748c1e` | 同 | ✔（窗内 0 提交） |
| cfg（起/收） | `C69FC496407F3B722B2921C8B324B87E20A6610B113C6216849EBCB2E5AEC257` / 同 | 起收同 | ✔ |
| props（起/收） | `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` / 同 | 起收同 | ✔ |
| port 25565 | 0 → 0 | ✔ |
| crash-reports | 0 → 0 | ✔ |

三窗均 `[PIN] sha=E4EA60A6…AD1E3C041 shaOk=true size=1578766 sizeOk=true mkOk=true ok=true`，`[stop] {"exitCode":0,"exited":true}`。

## §1 三窗

| 窗 | 驱动 | 起止（本地） | 耗时 | EXIT | `[done]` |
|---|---|---|---|---|---|
| r1 | `f11-b69-smoke.js` | 20:33:50 → 20:35:29 | 99 s | 0 | `{"run":"b70uq-r1","pin":true,"w1".."w4":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` |
| r2 | `f17-reg-fourth.js` | 20:35:29 → 20:36:07 | 38 s | 0 | `{"run":"b70uq-r2","pin":true,"w1".."w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` |
| r3 | `f11-b60-smoke.js` | 20:36:07 → 20:36:44 | 37 s | 0 | `{"run":"b70uq-r3","pin":true,"w1".."w6":true,"stops":0,"crashes":0,"pass":true,"bad":0,"badKeys":[]}` |

- `[cfg]`：r1 `blockDebugLog=true sparkR196=true mountedR196=true farmDebugLog=true`；r2 `blockDebugLog=true playerCapDebugLog=true mobDebugLog=true underworldDebugLog=true butcheringDebugLog=true`；r3 `mobDebugLog=true mobUndeadSurfaceR196=true`。
- tee：`testharness/build-logs/b69-b70uq-r1-b1.out`（542,793 B / 3,821 行；`:2389` `Done (5.938s)!`、`:3819` BUILD 1m37s）、`f17-b70uq-r2-b1.out`（1,260,699 B / 8,513 行；`:4729` `Done (5.777s)!`、`:8511` BUILD 36s）、`b60-b70uq-r3-b1.out`（1,253,569 B / 8,548 行；`:4724` `Done (5.957s)!`、`:8546` BUILD 36s）。

## §2 三份 diff

```
# 1) ETIMFarm 四委托
node testharness/tools/verify-diff.js --mode=arms \
  --base testharness/build-logs/b69-b70t4-r2-b1.out \
  --new  testharness/build-logs/b69-b70uq-r1-b1.out
[DiffLog] arms base=51 new=50
[DiffLog] summary rules base=25 new=25 mounts base=41 new=41 mayplace=22 diffs=0
[DiffLog] verdict MATCH

# 2) ButchLog 牛行
node ... --base testharness/build-logs/f17-b70ua-r3-b1.out \
         --new  testharness/build-logs/f17-b70uq-r2-b1.out
[DiffLog] arms base=69 new=77
[DiffLog] verdict MATCH  (diffs=0)

# 3) DespawnRules 三层墙与重掷（StalkerLog 六臂）
node ... --base testharness/build-logs/b60-b70tw-r5-b1.out \
         --new  testharness/build-logs/b60-b70uq-r3-b1.out
[DiffLog] arms base=64 new=54
[DiffLog] verdict MATCH  (diffs=0)
```

- 三份均 `diffs=0`；`arms channels=BlockFaceLog,ItemLog,FarmLog,FoodR196Log,FoodLog,SparkLog,MountLog,TestLog,VesselLog,StalkerLog,UndeadLog,DamageLog,MiningLog`，`noise=UndeadLog:spawn`。
- 我另用 `--strict-arms`（把「同键出现次数」也纳入比对）复跑同样三对，**三次仍全部 `verdict MATCH`**。

### 抽核（数值层，工具不覆盖）

| 面 | 基线 | 本窗 | 判定 |
|---|---|---|---|
| `[FarmLog] drought` 行数 | 22 | 22 | 同量 ✔（例 `b69-b70uq-r1-b1.out:3326` `drought probe block=minecraft:air age=-1 pos=10,130,4 below=minecraft:stone dry=0 water=0 master=1 chance=0.05`） |
| `[StalkerLog] spawn` 行数 | 6 | 6 | 同量 ✔ |
| StalkerLog `follow=` 取值分布 | `40.0`×4 ＋ `40.7289830192539`×1 | `40.0`×4 ＋ `42.815046862086334`×1 | 形态同（1 条带等级/属性修正的随机值），数值随机 ✔ |
| `[ButchLog] cow` 字段形态 | `well= lvl= leather= rB= nudge= beef= burning=` | 同 | 逐字段同序 ✔（例 基线 `f17-b70ua-r3-b1.out:7980`、本窗 `f17-b70uq-r2-b1.out:8071`） |
| `nudge` 语义 | 两侧均为 `nudge=0`（`beef=1/2/3` 各例皆有该键，仅当抖动真的改变 beef 时才为 1） | 同 | ✔ |

## §3 分级

- **A=0**：三族委托在世界里的接线与基线同形同量，未见行为变化。
- **B=0**
- **C-1**：`verify-diff --mode=arms` 的比对键是「`[通道] 首 token`」、且默认不比对同键出现次数（`strictCounts ? v : 1`），**行内数值不参与比对**；我以 `--strict-arms` 复跑补强计数面，数值面另做人工抽核（见 §2 表）。
- **C-2**：三窗 arms 的「distinct key」预筛数不同（51/50、69/77、64/54），差异全落在 `keep` 集之外的通道（`AILog`、`SpawnLog`、`OreLog` 等环境噪声），不在判据面。
- **C-3**：ButchLog 的 `leather/beef/rB` 与 StalkerLog 的 `follow` 为随机骰，**不逐值相等**，只判字段形态与语义（`nudge` 仅抖动生效时为 1）。
- **C-4**：世界名三段式 `w-b69-b70uq-r1-v1`、`w-reg4-b70uq-r2-v1`、`w-b60-b70uq-r3-v1`（`H.create` 的 world 模板所致）。

## §4 收口

| 项 | 值 |
|---|---|
| cfg / props 起收 | 同哈希（`C69FC496…` / `6784C3ED…`） |
| port 25565 | 0 → 0 |
| crash-reports | 0 → 0 |
| jar mtime | `2026-11-27T12:28:30.5924Z` 未变（0 rebuild） |
| HEAD | `4748c1e`，窗内 0 提交 |
| 世界 | `run/w-b69-b70uq-r1-v1`（27 文件 / 5,117,822 B）、`run/w-reg4-b70uq-r2-v1`（27 / 4,942,313 B）、`run/w-b60-b70uq-r3-v1`（25 / 5,274,690 B），全部保留 |
| 证据 | `testharness/build-logs/b70uq-r{1,2,3}-node.out`、`b70uq-index.tsv`、三份 tee（见 §1） |

## §5 终判

**PASS** — 三窗 `[done]` 全 true、`stops=0`、`crashes=0`；三份 `verify-diff`（默认与 `--strict-arms`）均 `MATCH`、`diffs=0`；ButchLog 牛行字段逐字同形；基线起收一致。A=0 / B=0 / C=4。

本回执字数规格：6159 B / 97 行。
