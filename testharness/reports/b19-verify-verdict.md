# W-B19 判窗回执正本 —— B-19 避雨家族（C-16-5 余债清盘）· 2026-11-08

<!-- 会话七 00:46 回执＋主会话读 build-logs/f11-b19-verify.json 数据一致；.vertex 回执正文以本 m dp supplements；主会话以 json/build-log 为源补落（C-B19-8 note）。判窗依据 judge build7：release 1,058,959 B SHA 275CC89540BCFBB0F67667AD42EAC5C7CC81C6AAC16FDA052015C17D2993CBB8／refmap 94/212 dual 424／mixins 91+10（manifest client 10） -->

## § 逐臂判读（W0-W7 八臂全 ✓ · A0/B0/D0/C10）

| 臂 | verdict | 案据 |
|---|---|---|
| W0 | ✓ | 双 boot 全绿（mixinFail=0×2 Done 5.4xx/5.0xx s）；stop exit0×2＋BUILD SUCCESSFUL ×2。cfg 起收双向移位（livestockNeedsR196/farmDebugLog/mobDebugLog＋mobDespawnR196:false 判窗 W5 修）恢复讫。判窗窗内 0 rebuild 0 commit。 |
| W1 | ✓ | 昼亡门 n=42（0 行受风力 halo 影响——判行 rain=false freezing=false sky=true；五样本 build-log 底面 b1:2836/3:3411）。dead 42 迷走旗行全 `sky=true`（每次 sprint 位向 sky-gen turn）。 |
| W2 | ✓ | 雨伞位 n=0（rainWindow 16 s 续浇 `etest rain set 1.0`；判行 raining all true——雨伞位未死） |
| W3 | ✓ | 夜 pillars n=0（`/time set 18000` 判窗窗内进行中臂——天时 18000 锁观） |
| W4 | ✓ | sec core n=0 =（封伞 core x -74..-70 z 240..244 5×5 core coreN=0——R196 :64 黑伞门＝canSeeSky(pos.up()) proxy 近似活证）；配套 open-site 普化 companion 型 verify n31 all pos open（un-killed companion rows），判机无需读 |
| W5 | ✓ | 判窗 AI 避雨 start 行 n=7（cow×8 伞外 spots 派型——[AILog] shelterseek src=cow start rows；cows mobDespawnR196:false in-cfg 锁身）。判窗 straight read 正本＝smoke r6 mirror 全绿（a1 37/2 0/3 0/a4 core 0 open 1/b1 3/c 0+0） |
| W6 | ✓ | 亡门 flag-off n=0（livestockNeedsR196=false boot2 A1 复放——判行零停） |
| W7 | ✓ | AI flag-off n=0（cow×8 replay 0 行——旗断负控成立） |
| W0 stop | ✓ | stopBoots ×2：exitCode 0×2 / exited TRUE×2 / build TRUE×2 |

## § C-B19 十条（全修讫/注记级）

1. 伞门 `canSeeSky(pos)` 顶格极限（heightmap 短判顶格石面永 false　m05277 修＝`canSeeSky(pos.up())` 正映）。
2. `minecraft:smooth_stone` 1.12.2 缺位（fill 报错 `There is no such block with name` L3856/L4027＝三层伞盖全没盖——r3 三层无遮）。
3. 伞位 chamber 密封盖规则（12×12 石盖无壁 leads 侧位泄走→核心 5×5 全密封 core 判）。
4. `mobDespawnR196` 伞外 cow 农田清（`[AILog] mob despawn counter-meter` 镜像——cow 挪伞外 spots＋in-cfg false）。
5. A4 settle 规则（石护 settle 2.5 s 后 refill——skylight 重铺窗）。
6. v1 driver 灾变——`const ev = {…}` 漏 `verdicts: {}` 初始化（boot 全跑完 fatal TypeError，json 未落盘；m05459 一行修补）。
7. v2 json 首读匠 W 判全落位（3,057 B json；w1=42/w2=0/w3=0/w4 coreN=0/w5 starts=7/w6=0/w7=0）。
8. 会话七正本 `testharness/reports/b19-verify-verdict.md` **未落**——主会话以 json/build-log 为源补落（C 级判窗 note，判值面不受影响）。
9. [PIN] 双读 json 侧仅 1 条（fsOut write 先 stampPin 后打——stdout 双读= 00:49:38.693Z／00:52:08.242Z 全同）。
10. mkCounts ok=false 站内计已修（f7-wb-lib MK_PIN 收编 94/212/424/91+10——m05478 UNI patch）。

## § 互证 & 互通（vs smoke r6 全绿镜像＋judge 同臂）

- smoke r6 exit=0：a1=37／a2=0／a3=0／a4 core0+open1／b1=3／c1=0／c2=0（f11-b19-smoke.json 2,184 B 00:41 侧）。
- judge v2 电路直读 json：w1 n=42＞smoke a1 37（同 16×16 面，k 个 rts512 同型；窗差），w2·w3·w4·w6·w7 全同工装镜像，w5 starts=7＞smoke b1 a3（scans 同型直读）。

## § 判据 & 一手引用（判值定谳零位移）

- 判值＝R196 一手：`BlockMycelium :119-121`（保雨死面）＋黑伞 :64＋tolerance 13 :41-43；`EntityAISeekShelterFromRain :12-16/:20-69`＋`EntityAIMovementTask :15-91`（1/16 roll＝`rand.nextInt(16)≠0` carrier；dx/dz＝int_max%33−16 carrier；dy＝int_7_minus_3=(rand&7)−3 carrier）；`EntityLivestock.isThirsty :124-126`（water<0.5F，实践能力 s.getWater()）；EntityLivingBase :2708-2710（`world.isInRain(x, floor(footY+height), z)`）；五座：EntityLivestock ctor :23（prio4 1.0F）／EntityHorse :65／EntityVillager :49（0.6F）／EntitySnowman :14／EntityFireElemental :18（prio2）。
- 1.12 载体：World.canSeeSky(pos.up())（World.java:694 本体 heightmap 长判——伞门正确位）；getBlockLight/getLightFromNeighbors/unpadded；isDaytime＝provider.isDaytime()（skylightSubtracted<4）；isFreezing＝ETIMRain.isFreezing temperature≤0.15F。
- 判行：`[FarmLog] mycelium src=rainDeath pos=… light=… rain=… freezing=… sky=…`（ETIMFarm.row farmDebugLog 闸）＋`[AILog] shelterseek src=cow start …`（ETIM.LOGGER mobDebugLog 闸）。
