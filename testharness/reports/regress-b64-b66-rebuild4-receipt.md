# regress b64/b66 单点回归回执（b67-build4，会话七 → 主会话）

窗口：2026-11-22 14:26:41 → 14:29:13 CST（两批串行，含两次起服）
任务源：主会话 2026-11-22 14:33 单点回归令（C-B67-9 修复后复验，不跑全量）

---

## §0 钉值实测

| 项 | 实测 | 判定 |
|---|---|---|
| `f7-wb-lib.js:35` PIN | `b67-build4` / 1,522,503 B / `BD167F7A30FCE97937EFB2E0D26B3CA0E862747F71C86067A6B5040CCAE4DD6E` | 与工单一致 |
| release jar | 1,522,503 B，sha `BD167F7A…0CCAE4DD6E`，mtime `2026-11-22T06:25:02Z` | 窗内 0 rebuild |
| dev / sources | 脚本未独立钉（非本批判据）；`pinOk` 由 lib 的 release 面判定 | — |
| MK | `refmap 110/276/552`（tmp 同）、`manifest 112+10`、`ok=true` | 与工单 110/276/552、112/10 一致 |
| cfg | `run/config/etim.cfg` 56,025 B `0D9D2C01061D1145358FF379A3B12B30195C4578275B5876C5062F936E7D28A9` | 起前＝收后（同一哈希） |
| props | `run/server.properties` `6784C3EDC73A5B0BB30C2AB2C6C7650F0D72FA55AD49D21FC12DED21322F1EB9` | 起前＝收后 |
| HEAD | `62f03fc05fba0862fe09faff9278563c8b045ea9` | 窗内 0 提交 |
| port 25565 | 起前 0 / 收后 0 | ok |

执行：
```
RUN=b64r2 node testharness/player/f11-b64-smoke.js   → exit 0（tee 建 14:26:46 / Done 14:27:02 / stop 14:27:17）
RUN=b66r2 node testharness/player/f11-b66-smoke.js   → exit 0（tee 建 14:28:39 / Done 14:28:55 / stop 14:29:12）
```
证据文件：`build-logs/regress-b64r2.out`、`build-logs/regress-b66r2.out`；
服务端全量 tee：`testharness/build-logs/b64-b64r2-b1.out`（1,173,876 B）、`testharness/build-logs/b66-b66r2-b1.out`（1,182,633 B）。

---

## §1 逐臂判读

### b64（物品基础面：堆叠表 / 融化 / 藤蔓放置 / 配置接线 / 源对齐）

| 臂 | 载荷 | 结果 |
|---|---|---|
| W1 堆叠表 | `{"row":[32,16,16,64,16,8,4,8,1,1,4,1,54],"want":[32,16,16,64,16,8,4,8,1,1,4,1],"pass":true}` | PASS |
| W2 融化数学 | `{"snow":{"chance":0.0019,…},"ice":{…},"pass":true}` | PASS |
| W3 融化接线 | `{"dropHook":true,"invHook":true,"tempRule":true,"pass":true}` | PASS |
| W4 藤蔓放置 | `{"vineplace":{"face":"north","block":"minecraft:stone","at":"2,130,0"},"cmd":{"face":"north","placed":"minecraft:stone"},"pass":true}` | PASS |
| W5 配置/接线 | `{"cfgOk":true,"wireOk":true,"pass":true}` | PASS |
| W6 源对齐 | `{"default16":true,"tableOk":true,"sortOk":true,"pass":true}` | PASS |
| 终判 | `[done] {"run":"b64r2","pin":true,"w1".."w6":true,"pass":true,"bad":0,"badKeys":[]}` | **PASS** |

服务器原文（`testharness/build-logs/b64-b64r2-b1.out:7588`）：
```
[14:27:11] [Server Thread/INFO] [Easy Times In Minecraft]: [ItemLog] stack stick=32 flint=16 reeds=16 paper=64 quartz=16 cake=8 cauldron=4 pie=8 book=1 bucket=1 dirt=4 sword=1 etim16=54 player=ETIM_F7 [server]
```
验收三值同时成立：**reeds=16 / cake=8 / dirt=4**；`etim16=54 ≥ 1` 成立。
附带观察：`b64-b64r2-b1.out:593` `[ItemLog] stack table applied default=16 r196Table=9 etimPinned=29`（上一轮 40 → 29，符合「etim 命名空间扫描跳过方块物品」的修复口径，非回归）。

### b66（方块基础面：堆叠 / 缓冲 / 摔落 / 掉落散布 / 材质）

| 臂 | 载荷 | 结果 |
|---|---|---|
| W1 方块堆叠 | `{"stone":4,"dirt":4,"anvil":1,"cauldron":4,"wool":4,"four":199,"one":23,"pass":true}` | PASS |
| W2 缓冲 | `{"sand":0.4,"wool":0.8,"snow":0.2,"stone":0,"pass":true}` | PASS |
| W3 摔落 | `{"stone":{"raw":15,"cushion":0,"damage":15},"sand":{"raw":15,"cushion":0.4,"damage":6.6},"pass":true}` | PASS |
| W4 掉落散布 | `{"before":0,"after":1,"pos":[2.514,130.356,0.527],"inBox":true,"pass":true}` | PASS |
| W5 材质 | `{"ice":{"douse":"true","dissolve":"false"},"snow":{"douse":"true","dissolve":"true"},"stone":{"acid":"false"},"pass":true}` | PASS |
| W6 配置/接线/命令 | `{"cfgOk":true,"wireOk":true,"hookOk":true,"helpOk":true,"pass":true}` | PASS |
| 终判 | `[done] {"run":"b66r2","pin":true,"w1".."w6":true,"pass":true,"bad":0,"badKeys":[]}` | **PASS** |

服务器原文（`testharness/build-logs/b66-b66r2-b1.out:7584`）：
```
[14:29:04] [Server Thread/INFO] [Easy Times In Minecraft]: [BlockFaceLog] blockstack stone=4 dirt=4 anvil=1 cauldron=4 wool=4 four=199 one=23 [server]
```
验收五值同时成立：**stone=4 / dirt=4 / anvil=1 / cauldron=4 / wool=4**，无反向回归。
旁证（`b66-b66r2-b1.out:586`）：`[BlockFaceLog] stack4 applied blocks=207 anvil=1`。

---

## §2 FAIL 证据

无（两个批次 12 个臂全 PASS，两批 exit=0，`badKeys:[]`）。

---

## §3 环境基线复核

| 项 | 起前 | 收后 | 结论 |
|---|---|---|---|
| `B:mobDebugLog` | `false` | `false` | 未写脏 |
| `server.properties level-name` | `w-b30v` | `w-b30v` | 未写脏 |
| `server.properties allow-flight` | `false` | `false` | 未写脏 |
| cfg sha | `0D9D2C01…6E7D28A9` | `0D9D2C01…6E7D28A9` | 同 |
| props sha | `6784C3ED…2F1EB9` | `6784C3ED…2F1EB9` | 同 |
| crash | 0 条 | 0 条 | 本轮无新崩溃（`crashes:0` 双批一致） |

说明：上一轮（regress-b54-b67）出现过「服务端关机写回盖掉脚本还原」的竞序，本轮两批收尾均未见漂移——两批都在停服后完成还原，且 cfg/props 哈希与起前完全一致。

世界：`run/w-b64-b64r2-v1`、`run/w-b66-b66r2-v1` 已生成并保留（未删）。

---

## §4 终判

`PASS`（A=0 / B=0 / C=0）
