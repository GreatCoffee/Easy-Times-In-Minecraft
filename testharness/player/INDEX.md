# 判窗脚本索引（testharness/player）

> 由 `node testharness/tools/index-scripts.js` 生成，请勿手改；`check-scripts.js` 会校验下方 fingerprint。
> 用途：按批次 / 日志通道检索现成判据，避免重写同面窗口。

scripts=454 | batches=65 | onHarness=18 | withChannel=166 | undocumented=308 | scratch=51 | pinFollow=97 | pinFrozen=3

fingerprint: `C8277FBFFBC62444448CFA1E8DEB2861E703BC68ABA7A843F6DC8F1B0C4299F0`

## B-70T9（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f13-b70t9-smoke.js` | 144 | FoodLog | none | ✔ | B-70T9 smoke: the R196 hunger loop after the pure-table extraction. |

## B-70T8（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f12-b70t8-smoke.js` | 188 | — | none | ✔ | B-70T8 smoke: the R196 spawn gates moved into a pure decision table |

## B-69（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b69-smoke.js` | 422 | FarmLog, MountLog, SparkLog | none | ✔ | B-69 smoke: R196 spark carrier (census F :126) + mounted-block rejection |

## B-68（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b68-smoke.js` | 219 | FarmLog | none | ✔ | B-68 smoke: R196 root crops (carrot/potato/onion) + four dead-plant families |

## B-67（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b67-smoke.js` | 164 | BoomLog, DropLog, ExplosionLog | none | ✔ | B-67 smoke: R196 explosion + block drop faces (census F :100-:104, :108-:113). |

## B-66（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b66-smoke.js` | 142 | BlockFaceLog | none | ✔ | B-66 smoke: R196 block faces (census F :82/:83/:85/:87/:88/:89/:90/:91/:92/:96/:97/:99). |

## B-65（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b65-smoke.js` | 137 | — | none | ✔ | B-65 smoke: R196 food / vessel / coin faces (census F :149-:165). |

## B-64（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b64-smoke.js` | 121 | ItemLog | none | ✔ | B-64 smoke: R196 Item.java base faces (census F :142/:143/:149/:150). |

## B-63（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b63-smoke.js` | 161 | SilverLog | none | ✔ | B-63 smoke: R196 EntityCopperspine / EntityHoarySilverfish / EntityNetherspawn |

## B-62（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b62-smoke.js` | 196 | ElementalLog, SpawnLog | none | ✔ | B-62 smoke: R196 EntityEarthElemental / EntityFireElemental / EntityClayGolem |

## B-61（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b61-smoke.js` | 165 | BeastLog, SpawnLog | none | ✔ | B-61 smoke: R196 EntityDireWolf + EntityHellhound (census D :69/:86/:115/:116/:241/:242). |

## B-60（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b60-smoke.js` | 140 | AILog, SpawnLog, StalkerLog, UndeadLog | none | ✔ | B-60 smoke: R196 EntityInvisibleStalker + EntityAISeekLitTorch |

## B-59（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b59-smoke.js` | 221 | SpawnLog, UndeadLog | none | ✔ | B-59 smoke: surface undead trio (R196 EntityGhoul / EntityWight / EntityShadow |

## B-58（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b58-smoke.js` | 210 | FoodLog, GelLog | none | ✔ | B-58 smoke: gelatinous sphere item + throwable (R196 ItemGelatinousSphere / |

## B-57（6 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b57-cfgprobe.js` | 38 | — | none |  | cfg flag probe: force mobGelatinousR196=true, boot, check /etest gelpick flag |
| `f11-b57-nbtprobe.js` | 54 | — | none |  | NBT round-trip probe: does dissolving_blocks_info survive save/load? |
| `f11-b57-nbtprobe2.js` | 60 | — | none |  | NBT round-trip probe with bot (keeps chunk loaded) |
| `f11-b57-probe.js` | 52 | — | none |  | B-57 probe: does a summoned gel entity survive and tick? |
| `f11-b57-probe2.js` | 46 | — | none |  | B-57 probe: platform + ooze + adjacent planks, sample every 10s. |
| `f11-b57-smoke.js` | 310 | GelLog, SpawnLog | follow |  | B-57 smoke: gel family (ETIMEntityCubic / ETIMEntityGelatinousCube). |

## B-56（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b56-smoke.js` | 196 | — | follow |  | B-56 smoke: audit debts #2 (WoodSpider structure gate) and #3 (R196 |

## B-55（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b55-smoke.js` | 288 | — | follow |  | B-55 smoke: R196 bat family (vampire / nightwing / giant) + vision dimming. |
| `f11-b55-w2.js` | 75 | — | none |  | B-55 W2 focused probe: does the vampire acquire, chase and bite the bot? |

## B-54（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b54-dice.js` | 92 | — | none |  | B-54 dice corroboration: the horse 0.8 / wolf 0.5 group rolls over several |
| `f11-b54-smoke.js` | 317 | — | follow |  | B-54 smoke: R196 chunk-populate world-gen spawn pass. |

## B-53（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b53-smoke.js` | 189 | — | follow |  | B-53 smoke — pickup loop (food/repair/valuable), contained items, bat hang, |
| `f11-b53-verify.js` | 286 | — | follow |  | W-B53 verify: pickup loop (food/repair/valuable), contained items NBT roundtrip, |

## B-52（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b52-smoke.js` | 127 | — | follow |  | B-52 smoke — R196 ooze natural spawn (census D :282). |

## B-51（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b51-smoke.js` | 124 | DropLog | follow |  | B-51 smoke — R196 base drops for the non-butchering families (census D |

## B-50（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b50-smoke.js` | 159 | — | follow |  | B-50 smoke — R196 wide-mob four-offset placement (census D :234-265) and |

## B-5（7 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `b5-cleanup.js` | 18 | — | none |  | — |
| `b5-stop-orphan.js` | 17 | — | none |  | — |
| `b5-wb-analyze.js` | 232 | — | none |  | — |
| `b5-wb-preflight.js` | 286 | ButchLog | none |  | — |
| `b5-wb-report-spec.js` | 70 | — | none |  | — |
| `b5-wb-sha-check.js` | 14 | — | none |  | — |
| `b5-wb.js` | 658 | ButchLog, EnchantLog | follow |  | — |

## B-49（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b49-smoke.js` | 126 | — | follow |  | B-49 smoke — R196 animal peer warning (census D :318). The command summons |

## B-48（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b48-smoke.js` | 136 | — | follow |  | B-48 smoke — R196 attribute small batch: skeleton speed 0.3, tame-sensitive |

## B-47（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b47-smoke.js` | 167 | SpawnLog | follow |  | B-47 smoke — R196 spawn details: infernal creeper replacement, ghast |

## B-46（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b46-smoke.js` | 162 | SpawnLog | follow |  | B-46 smoke — R196 deep/structure spawn gates (WorldServer:630-633, :650-653, :674-677). |

## B-45（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b45-smoke.js` | 153 | — | follow |  | B-45 smoke — R196 anvil repair skillset (:91), option B minimal layer. |

## B-44（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b44-smoke.js` | 160 | — | follow |  | B-44 smoke — R196 mining ooze (:90): forced entity window + 1% spawn chain. |

## B-43（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b43-smoke.js` | 176 | — | follow |  | B-43 smoke — R196 cudgel/club (:84): item registration, effective set, |

## B-42（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b42-smoke.js` | 235 | MiningLog | follow |  | B-42 smoke — axe sandstone half-slab (:83) + shears right-click silk (:85) |

## B-41（3 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b41-probe.js` | 112 | — | none |  | B-41 W3 one-shot probe: livestock=false + miningReform=false + creative + stone_sword + /etest dig |
| `f11-b41-smoke.js` | 223 | SwingLog | none |  | B-41 smoke — swing-two pack (:89 creative sword break gate + :92 stick/bone break roll) |
| `f11-b41-verify.js` | 252 | SwingLog | follow |  | B-41 verify — swing-two pack (:89 creative sword break gate + :92 stick/bone break roll) |

## B-40（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b40-smoke.js` | 269 | HoeLog | follow |  | f11-b40-smoke.js — B-40 锄地四件套 smoke (faces :86/:87/:93/:94, 摸底 §5) |
| `f11-b40-verify.js` | 264 | FoodLog, HoeLog | follow |  | f11-b40-verify.js — W-B40 判窗（B-40 锄地四件套 faces :86/:87/:93/:94）。 |

## B-39（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b39-smoke.js` | 413 | SleepLog | follow |  | B-39 is-smart face — smoke driver (seed roll + player-hit upgrade + |
| `f11-b39-verify.js` | 374 | SleepLog | follow |  | B-39 is-smart face — verify driver (judgment window for 会话七). |

## B-38（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b38-smoke.js` | 292 | DropLog | follow |  | B-38 drop-face pack — smoke driver (drop tables + massive-fall flag + |
| `f11-b38-verify.js` | 292 | DropLog | follow |  | B-38 drop-face pack — smoke driver (drop tables + massive-fall flag + |

## B-37（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b37-smoke.js` | 238 | AILog | follow |  | — |
| `f11-b37-verify.js` | 224 | AILog | follow |  | — |

## B-36（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b36-smoke.js` | 234 | AILog | follow |  | — |
| `f11-b36-verify.js` | 227 | AILog | follow |  | — |

## B-35（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b35-smoke.js` | 271 | AILog, RepairLog | follow |  | — |
| `f11-b35-verify.js` | 309 | AILog, RepairLog | follow |  | — |

## B-34（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b34-smoke.js` | 352 | AILog, DamageLog | follow |  | — |
| `f11-b34-verify.js` | 358 | AILog, DamageLog | follow |  | — |

## B-33（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b33-smoke.js` | 458 | AILog, FireLog | none |  | — |
| `f11-b33-verify.js` | 366 | AILog, FireLog | follow |  | — |

## B-31（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b31-smoke.js` | 350 | AILog, DamageLog, SleepLog | none |  | — |
| `f11-b31-verify.js` | 357 | DamageLog, SleepLog | follow |  | — |

## B-30（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b30-smoke.js` | 192 | AILog, FarmLog | none |  | — |
| `f11-b30-verify.js` | 195 | — | follow |  | — |

## B-3（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `b3-equip-diff.js` | 48 | EquipLog | none |  | B3 W1 · [EquipLog] boot-dump diff (B2 fix-batch jar 504,479 B vs B3 jar 529,601 B). |
| `b3-run.js` | 1906 | CraftingLog, LootLog, MiningLog, MobLog, SkLog, TestLog | none |  | — |

## B-2R（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `b2r-equip-diff.js` | 46 | EquipLog | none |  | B2 re-verdict · [EquipLog] dump diff (old jar 503,844 B vs fix-batch jar 504,479 B) |

## B-29（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b29-smoke.js` | 227 | AILog, FarmLog | none |  | — |
| `f11-b29-verify.js` | 227 | — | follow |  | — |

## B-28（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b28-smoke.js` | 136 | — | none |  | — |
| `f11-b28-verify.js` | 155 | — | follow |  | — |

## B-27（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b27-smoke.js` | 196 | — | none |  | — |
| `f11-b27-verify.js` | 222 | — | follow |  | — |

## B-26（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b26-smoke.js` | 186 | — | none |  | — |
| `f11-b26-verify.js` | 219 | — | follow |  | — |

## B-25（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b25-smoke.js` | 168 | — | none |  | — |
| `f11-b25-verify.js` | 188 | — | follow |  | — |

## B-24（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b24-smoke.js` | 182 | — | none |  | — |
| `f11-b24-verify.js` | 208 | — | follow |  | — |

## B-23（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b23-smoke.js` | 211 | AILog | none |  | — |
| `f11-b23-verify.js` | 231 | AILog | follow |  | — |

## B-22（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b22-smoke.js` | 198 | AILog | none |  | — |
| `f11-b22-verify.js` | 237 | AILog | follow |  | — |

## B-21（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b21-smoke.js` | 300 | FarmLog | none |  | — |
| `f11-b21-verify.js` | 335 | FarmLog | follow |  | — |

## B-2（8 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `b2-equip.js` | 182 | EquipLog | none |  | W1 · [EquipLog] boot-dump checker (batch B2) + W8 placeholder/lang registry |
| `f10-b2-pilot.js` | 199 | — | none |  | — |
| `f10-b2-pilot2.js` | 106 | — | none |  | — |
| `f10-b2-pilot3.js` | 114 | — | none |  | — |
| `f10-b2-pilot4.js` | 114 | — | none |  | — |
| `f10-b2-pilot5.js` | 100 | — | none |  | — |
| `f10-b2-pilot6.js` | 116 | — | none |  | — |
| `f10-b2-verify.js` | 691 | — | follow |  | — |

## B-19（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b19-smoke.js` | 325 | AILog, FarmLog | none |  | — |
| `f11-b19-verify.js` | 340 | AILog, FarmLog | follow |  | — |

## B-18（8 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b18-smoke.js` | 258 | FarmLog | none |  | — |
| `f11-b18-verify.js` | 304 | FarmLog | follow |  | — |
| `f11-b18-w5c.js` | 155 | — | follow |  | — |
| `f11-b18-w5c2.js` | 158 | — | follow |  | — |
| `f11-b18-w5c3.js` | 159 | — | follow |  | — |
| `f11-b18-w5c4.js` | 150 | — | follow |  | — |
| `f11-b18-w5c5.js` | 158 | — | follow |  | — |
| `f11-b18-w5c6.js` | 155 | — | follow |  | — |

## B-17（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b17-smoke.js` | 197 | FarmLog | none |  | — |
| `f11-b17-verify.js` | 197 | — | follow |  | — |

## B-16（2 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b16-smoke.js` | 274 | AILog, FarmLog | none |  | — |
| `f11-b16-verify.js` | 280 | AILog | none |  | — |

## B-15（4 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b15-smoke.js` | 159 | EnchLog | none |  | — |
| `f11-b15-verify.js` | 166 | — | none |  | — |
| `f13-b15-boot.js` | 67 | — | none |  | — |
| `f13-b15-obf-boot.js` | 136 | AILog, EnchLog, OreLog | none |  | — |

## B-14（3 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b14-smoke.js` | 229 | FarmLog | none |  | — |
| `f11-b14-verify.js` | 227 | FarmLog | none |  | — |
| `f13-b14-obf-boot.js` | 121 | AILog, OreLog | none |  | — |

## B-13（5 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b13-probe.js` | 98 | — | none |  | — |
| `f11-b13-smoke.js` | 482 | — | none |  | — |
| `f11-b13-verify.js` | 672 | — | frozen |  | — |
| `f13-b13-boot.js` | 67 | — | none |  | — |
| `f13-b13-obf-boot.js` | 62 | — | none |  | — |

## B-12B（1 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b12b-verify.js` | 598 | — | frozen |  | — |

## B-12（3 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b12-probe.js` | 121 | DamageLog | none |  | — |
| `f11-b12-smoke.js` | 457 | FarmLog | none |  | — |
| `f11-b12-verify.js` | 722 | DamageLog, FarmLog | frozen |  | — |

## B-11（6 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `f11-b11-pilot.js` | 202 | — | none |  | — |
| `f11-b11-pilot2.js` | 173 | — | none |  | — |
| `f11-b11-supp.js` | 232 | — | none |  | — |
| `f11-b11-supp2.js` | 189 | — | none |  | — |
| `f11-b11-supp3.js` | 141 | — | none |  | — |
| `f11-b11-verify.js` | 633 | — | follow |  | — |

## B-1（3 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `b1-diag2.js` | 82 | — | none |  | — |
| `b1-run.js` | 2274 | FurnaceLog, MiningLog, OreLog, TestLog | none |  | — |
| `f5-b1-verify.js` | 24 | — | none |  | — |

## 未标批次（318 份）

| 脚本 | 行 | 通道 | pin | harness | 说明 |
| --- | ---: | --- | :---: | :---: | --- |
| `_b40-anchors.js` | 47 | — | none |  | 会话七 · W-B40 判窗取证剪辑（只读） |
| `_b40-logs.js` | 13 | — | none |  | — |
| `_b40-stdout.js` | 9 | — | none |  | — |
| `_b41-anchors.js` | 28 | — | none |  | — |
| `_b41-b2.js` | 9 | — | none |  | — |
| `_b41-cfgprobe.js` | 93 | — | none |  | B-41 W3 取证：cfg 在 boot 时到底生效没有 + 剑面/手面同 boot 对照。 |
| `_b41-cfgprobe2.js` | 85 | — | none |  | B-41 W3 取证之二：2x2（物品 × 位置）—— 剑/手 各在两个位置挖，判定「不破」到底是物品面还是站位面。 |
| `_b41-cfgprobe3.js` | 81 | — | none |  | B-41 W3 control probe 3 (cfg-applies check). |
| `_b41-cfgprobe4.js` | 98 | — | none |  | B-41 W3 decisive probe 4: is the sword refusal product-side or client-side (mineflayer)? |
| `_b41-cfgprobe5.js` | 105 | — | none |  | B-41 W3 discriminative probe 5: which axis blocks the creative sword break? |
| `_b41-cfgprobe6.js` | 76 | — | none |  | B-41 W3 probe 6: server-side dig via /etest dig (synthetic CPacketPlayerDigging, no client logic). |
| `_b41-cfgprobe7.js` | 71 | SwingLog | none |  | B-41 W3 probe 7 (control at the same channel): cfg livestock=true, mob=true, mining=true |
| `_b41-cfgprobe8.js` | 73 | — | none |  | B-41 W3 probe 8: is the cfg actually applied on this boot? |
| `_b41-cfgprobe9.js` | 83 | AILog | none |  | B-41 W3 probe 9: is `livestockNeedsR196=false` actually reaching the runtime field? |
| `_b41-w2.js` | 21 | — | none |  | — |
| `_b41-w3probe.js` | 76 | — | none |  | W-B41 W3 probe: why does the creative sword dig not break the pad in the flag-off boot? |
| `_b41-w3probe2.js` | 56 | — | none |  | W-B41 W3 probe 2: with livestockNeedsR196=false on the server, can a creative sword break dirt? |
| `_b41-w3probe3.js` | 60 | — | none |  | W-B41 W3 probe 3: is the creative dig refusal item-specific? Same boot, three items, three pads. |
| `_b41-win2.js` | 23 | — | none |  | find W2 window: from the stick replaceitem after cow summon to the next 'Killed Cow' |
| `_b45-w5.js` | 72 | — | follow |  | B-45 W5 arm — default-off parity: no skillsEnabled injection (cfg default false). |
| `_b46-w5.js` | 94 | — | follow |  | B-46 W5 — natural wiring arm: mobDebugLog=true, no /etest spawnpick at all. |
| `_b46-w6.js` | 86 | SpawnLog | none |  | B-46 W6 — silent arm: default mobDebugLog=false, probe both gate sites once each. |
| `_b47-reportsize.js` | 24 | — | none |  | Fill @@BYTES@@ / @@LINES@@ in the B-47 verdict report until stable. |
| `_b47-w5.js` | 90 | — | none |  | B-47 W5 — natural window arm: mobSpawnR196=true + mobDebugLog=true. |
| `_b47-w6.js` | 82 | — | none |  | B-47 W6 — default-off natural window: mobSpawnR196=false, mobDebugLog=true |
| `_b48-reportsize.js` | 24 | — | none |  | Fill @@BYTES@@ / @@LINES@@ in the B-47 verdict report until stable. |
| `_b48-w5.js` | 103 | AILog | none |  | B-48 W5 — default-off arm: mobStatsR196=false + livestockNeedsR196=false. |
| `_b48-w6.js` | 89 | AILog | none |  | B-48 W6 — B-1 regression: with flags ON, summon zombie / pigzombie / spider and |
| `_b49-reportsize.js` | 24 | — | none |  | Force the §5 byte/line claim to equal the on-disk size, verified after write. |
| `_b49-w3.js` | 101 | AILog | none |  | B-49 W3 — flag-off arm: livestockNeedsR196=false, mobDebugLog=true (so the absence |
| `_b49-w4.js` | 99 | — | none |  | B-49 W4 — B-48 regression with flags on: skeleton speed 0.3, wolf 8/8/3/16/0.4 and |
| `_b50-w6.js` | 115 | — | follow |  | B-50 W6 — flag-off arm for the equipped-mob despawn hold (negative evidence). |
| `_b51-w9.js` | 114 | DropLog | follow |  | B-51 W9 — flag-off arm for the R196 base-drop table. |
| `_b52-w5.js` | 124 | SpawnLog | follow |  | B-52 W5 — flag-off arm for the R196 natural-spawn cascade. |
| `_b52-w5b.js` | 163 | SpawnLog | follow |  | W-B52b — positive arm: natural ooze spawning with the R196 cascade ON. |
| `_b52-w5c.js` | 148 | — | follow |  | W-B52b step 3 — supersized natural arm. Same rule set as the small-room |
| `_b52-w5d.js` | 101 | — | follow |  | W-B52b diagnostic (NOT evidence): why does the natural pipeline never return |
| `_b68-probe.js` | 109 | — | none |  | W-B68 diagnostic (NOT evidence): why does /etest harvest (TryHarvestBlock) |
| `_inspect-inv.js` | 19 | — | none |  | — |
| `_lvldat.js` | 11 | — | none |  | — |
| `_p4.js` | 27 | — | none |  | r12 定稿补丁：W2 改判「结构性不可达」（主会话 2026-11-10 21:1x 裁定 A）， |
| `_p5.js` | 76 | — | none |  | r12 同步：verify 驱动的栅栏门臂改「证据臂」+ W2 判结构性不可达（裁定 A）。 |
| `_p6.js` | 56 | — | none |  | verify 补 propsNorm（主会话 2026-11-11 裁定③a）：期末/窗前各算一次， |
| `_patch.js` | 41 | — | none |  | — |
| `_patch2.js` | 37 | — | none |  | 1) run tag |
| `_patch3.js` | 57 | — | none |  | — |
| `_regress-restore.js` | 19 | — | none |  | Restore the environment to the documented baseline after the regression run. |
| `_regress-summarize.js` | 50 | — | none |  | Summarize regress-b54-b67 batch outputs: [done] JSON per batch + arm lines. |
| `_serversdat.js` | 14 | — | none |  | — |
| `_serversdat2.js` | 17 | — | none |  | — |
| `_settime.js` | 62 | — | none |  | — |
| `a2-despawn.js` | 105 | — | none |  | a2-despawn.js — run27 A2「消散击杀」假玩家通道（会话七 · testharness/player） |
| `a2-probe.js` | 66 | — | none |  | a2-probe.js — A-2 regression: perfectly-stacked weak-strike attack must not spin. |
| `a2-run.js` | 369 | — | none |  | — |
| `ad10s-config.js` | 102 | — | none |  | ad10s-config.js — AD-10+SH 验证窗的配置切换器（会话七自研工装，产品码 0 触碰） |
| `ad10s-diag.js` | 60 | — | none |  | ad10s-diag.js — 临时诊断（会话七）：甲胄 staging 与 use 态保活 |
| `ad10s-diag2.js` | 43 | — | none |  | ad10s-diag2.js — 甲胄服务端真值诊断：staging → save-all → playerdata NBT 读四槽 |
| `ad10s-diag3.js` | 57 | — | none |  | ad10s-diag3.js 鈥?婧愰棬璇婃柇锛歮ob 婧愶紙causeMobDamage锛夋槸鍚﹁蛋鎶ょ敳姝?+ 鏍兼尅鍑忓崐 |
| `ad10s-evidence.js` | 125 | BlockLog | none |  | ad10s-evidence.js — 判决证据档生成器（会话七自研工装） |
| `ad10s-lib.js` | 172 | BlockLog, DamageLog, TestLog | none |  | ad10s-lib.js — AD-10+SH 验证窗公共件（会话七自研工装） |
| `ad10s-run.js` | 649 | BlockLog, DamageLog, TestLog | none |  | ad10s-run.js — AD-10+SH 验证窗判点驱动（会话七自研工装） |
| `ad7-fight.js` | 375 | DamageLog | none |  | — |
| `ad7-smoke.js` | 55 | EnchantLog | none |  | ad7-smoke.js — 批 E / AD-7 落码后最小冒烟（主会话） |
| `ad7-stop.js` | 21 | — | none |  | ad7-stop.js — 优雅停服（bot 聊天 /stop，等价控制台 stop）： |
| `ad7e-armorcheck.js` | 33 | — | none |  | ad7e-armorcheck.js — 甲胄 staging 诊断（会话七临时工装）：逐槽 replaceitem 回执 + 存档 NBT 复核 |
| `ad7e-config.js` | 69 | — | none |  | ad7e-config.js — 批 E / AD-7 验证窗的配置切换器（会话七自研工装） |
| `ad7e-fight.js` | 486 | DamageLog | none |  | ad7e-fight.js — 批 E / AD-7 真打驱动（会话七自研工装） |
| `ad7e-lib.js` | 177 | DamageLog, EnchantLog | none |  | ad7e-lib.js — 批 E / AD-7 验证窗公共件（会话七自研工装） |
| `ad7e-nbt.js` | 119 | — | none |  | ad7e-nbt.js — 存档级 NBT 读取（1.12 无 /data，玩家背包只能从 playerdata 读） |
| `ad7e-probe.js` | 201 | EnchantLog | none |  | ad7e-probe.js — 批 E / AD-7 静态面驱动（会话七自研工装） |
| `ad7e-restore.js` | 42 | — | none |  | ad7e-restore.js — 一次性证据修复（会话七）：从窗 A 的快照日志重建 report.w9probe。 |
| `anvil-run.js` | 474 | AnvilLog, CraftingLog | none |  | — |
| `anvilench-w33.js` | 735 | EnchantLog | none |  | — |
| `armorD-probe.js` | 133 | DamageLog | none |  | — |
| `armorD-probe2.js` | 104 | DamageLog | none |  | — |
| `armorD-restore.js` | 34 | — | none |  | — |
| `armorD2-config.js` | 56 | — | none |  | — |
| `armorD2-run.js` | 872 | DamageLog | none |  | — |
| `armorD3-config.js` | 56 | — | none |  | — |
| `armorD3-run.js` | 930 | DamageLog | none |  | — |
| `arrowB-nbt.js` | 183 | — | none |  | — |
| `arrowB-run.js` | 506 | ArrowLog | none |  | — |
| `arrowB2-run.js` | 418 | ArrowLog | none |  | — |
| `arrowC-probe.js` | 39 | — | none |  | — |
| `arrowC-probe2.js` | 46 | — | none |  | — |
| `arrowC-probe3.js` | 37 | — | none |  | — |
| `arrowC-run.js` | 819 | ArrowLog | none |  | — |
| `arrowC2-kbprobe.js` | 240 | — | none |  | — |
| `arrowC2-run.js` | 650 | ArrowLog | none |  | — |
| `attgate-w41-diag.js` | 131 | — | none |  | — |
| `attgate-w41.js` | 819 | BlockLog, MiningLog | follow |  | — |
| `batch2-cleanup.js` | 51 | — | none |  | — |
| `batch2-q.js` | 247 | — | none |  | — |
| `batch2-q2.js` | 73 | — | none |  | — |
| `batch2-q3.js` | 46 | — | none |  | — |
| `batch2-rerun.js` | 309 | CraftingLog | none |  | — |
| `batch2-s2.js` | 94 | — | none |  | — |
| `bed-entry-ops.js` | 654 | — | none |  | — |
| `bed-ops.js` | 289 | — | none |  | bed-ops.js — 床位探测 / 放置 / 入睡 / 起身（会话七 · testharness/player） |
| `biome-scan.js` | 135 | — | none |  | — |
| `box-ops-via-bot.js` | 76 | — | none |  | box-ops-via-bot.js — 假玩家 op 通道的箱域操作（会话七 · testharness/player） |
| `bw-run.js` | 416 | FoodLog | none |  | — |
| `capend-w49.js` | 887 | CapLog, FoodLog, MiningLog | follow |  | — |
| `chaincraft-w48.js` | 1167 | CraftingLog, TestLog | follow |  | — |
| `combo-a4c2.js` | 76 | — | none |  | combo-a4c2.js — run27 A4 动物三重墙 + C2 牛吃草 合并编排（主会话临时 driver） |
| `combo-a5nbt.js` | 84 | — | none |  | combo-a5nbt.js — run27 A5/A9 终定谳窗（NBT 种子版，主会话 2026-10-13） |
| `combo-a5x.js` | 96 | — | none |  | combo-a5x.js — run27 A5 定谳窗（setworldspawn + 离线增长 + 重入 kill）——主会话 |
| `combo-a5xr2.js` | 94 | — | none |  | combo-a5xr2.js — run27 A5X-r2 + C4-c 合并定谳窗（主会话） |
| `combo-a8.js` | 88 | — | none |  | combo-a8.js — run27 A8 局外物件免测 + A9 豹猫/狼驯服对比 + A5 动物无墙 kill（主会话） |
| `combo-a8b.js` | 64 | — | none |  | combo-a8b.js — run27 A8B 修正轮（A8 免死 + A9 豹猫/狼驯服 + A5 动物无墙 kill） |
| `combo-a9a5.js` | 106 | — | none |  | combo-a9a5.js — run27 A1b 水栖 −9600 + A9 豹猫门（驯/野对比）+ A5 无墙动物 kill |
| `combo-a9b.js` | 71 | — | none |  | combo-a9b.js — run27 短验窗（种子修复 + ocelot 门一次性插桩）——主会话 driver |
| `combo-a9c.js` | 90 | — | none |  | combo-a9c.js — run27 A9C 定谳窗（A5 散养 kill + A9 野生/驯服 age 门 + water-seed 追踪 |
| `combo-a9deploy2.js` | 40 | — | none |  | combo-a9deploy2.js — A9 养殖 v2 重放（CustomName 命名，既有 id 混染面一次封死） |
| `combo-a9farm.js` | 55 | — | none |  | combo-a9farm.js — run27 A9-wild 养殖窗（主会话 2026-10-13 晚） |
| `combo-a9fin.js` | 47 | — | none |  | combo-a9verdict.js — run27 A9-wild 判终窗（主会话 2026-10-13 晚） |
| `combo-a9v3.js` | 58 | — | none |  | combo-a9v3.js — run27 A9-wild 正面 kill 证明窗（entitydata 补种路线） |
| `combo-c4.js` | 73 | — | none |  | combo-c4.js — run27 C4 雨水回退 + water-seed 追踪（natural/summon 双面）——主会话 driver |
| `combo-c4b.js` | 56 | — | none |  | combo-c4b.js — run27 C4 专窗（雨中固定位置双牛对照）——主会话 driver |
| `combo-c4c.js` | 70 | — | none |  | combo-c4c.js — run27 C4-c 三牛定谳窗（主会话 2026-10-13） |
| `combo-c4d.js` | 52 | — | none |  | combo-c4d.js — run27 C4-d 三牛定谳窗命名版（CustomName 防混染 + raincheck 仪行） |
| `combo-c4e.js` | 60 | — | none |  | combo-c4e.js — run27 C4-e 三牛定谳窗（平台版，主会话 2026-10-13 晚） |
| `combo-farm-reentry.js` | 48 | — | none |  | combo-farm-reentry.js — run27 A5/A9 判终窗（farm 重入，主会话 2026-10-13） |
| `combo-farm.js` | 70 | — | none |  | combo-farm.js — run27 A5 夜间农场（主会话 driver，2026-10-12 晚） |
| `combo-observe-spawn.js` | 23 | SpawnLog | none |  | combo-observe-spawn.js — 阶段五批四 spawn cycle 首观察窗 |
| `connect-dev.js` | 91 | — | none |  | P0 · FML\|HS 握手小验证（会话七 · testharness/player） |
| `cropdecay-w32.js` | 465 | BlockLog, MiningLog | none |  | — |
| `d1-wb-analyze.js` | 207 | — | none |  | — |
| `d1-wb-rev-analyze.js` | 229 | — | none |  | — |
| `d1-wb-rev-chestparse.js` | 156 | EnchLog | none |  | — |
| `d1-wb-rev.js` | 497 | — | follow |  | — |
| `d1-wb.js` | 860 | EnchLog | follow |  | — |
| `durability-l3-w24-w31.js` | 374 | — | none |  | — |
| `effectiveset-w45.js` | 835 | MiningLog | follow |  | — |
| `enchant1-we1.js` | 832 | ArrowLog, EnchantLog, FoodLog | follow |  | — |
| `enchantpool-w63.js` | 893 | EnchantLog | follow |  | — |
| `enchantpool-w63b.js` | 1008 | EnchantLog | follow |  | — |
| `entitylog1-w39.js` | 883 | BlockLog, MiningLog | none |  | — |
| `extreme-w42.js` | 839 | DamageLog, MiningLog | follow |  | — |
| `f10-pg-b11-nav.js` | 90 | — | none |  | — |
| `f10-pg-b11-smoke.js` | 204 | AILog | none |  | — |
| `f10-pg-b2-smoke.js` | 292 | — | none |  | — |
| `f10-pg-diag.js` | 78 | — | none |  | — |
| `f10-pg-diag2.js` | 63 | — | none |  | — |
| `f10-pg-pilot.js` | 144 | — | none |  | — |
| `f10-pg-pilot2.js` | 87 | — | none |  | — |
| `f10-pg-pilot3.js` | 87 | — | none |  | — |
| `f10-pg-pilot4.js` | 100 | — | none |  | — |
| `f10-pg-pilot5.js` | 76 | AILog | none |  | — |
| `f10-pg-pilot6.js` | 99 | — | none |  | — |
| `f10-pg-pilot7.js` | 96 | — | none |  | — |
| `f10-pg-smoke.js` | 207 | FarmLog | none |  | — |
| `f10-pg-verify.js` | 641 | — | follow |  | — |
| `f11-c16-smoke.js` | 146 | FarmLog | none |  | — |
| `f11-c16-verify.js` | 167 | — | none |  | — |
| `f11-rcon-stop.js` | 41 | — | none |  | — |
| `f11-spec3.js` | 57 | — | none |  | — |
| `f14-reg-core.js` | 95 | DamageLog, MiningLog, TestLog | none | ✔ | — |
| `f15-reg-chains.js` | 183 | IngestLog | none | ✔ | — |
| `f16-reg-third.js` | 205 | SwingLog | none | ✔ | — |
| `f16-spec-fix.js` | 49 | — | none |  | — |
| `f17-reg-fourth.js` | 147 | — | none | ✔ | — |
| `f5-arrow2.js` | 137 | — | none |  | — |
| `f5-debug-fish.js` | 83 | — | none |  | — |
| `f5-dirty.js` | 87 | — | none |  | — |
| `f5-type.js` | 137 | — | none |  | — |
| `f5-wb-analyze.js` | 93 | — | none |  | — |
| `f5-wb-preflight.js` | 279 | — | none |  | — |
| `f5-wb.js` | 792 | FishLog | follow |  | — |
| `f5-worm-test.js` | 80 | — | none |  | — |
| `f5-worm-test2.js` | 79 | — | none |  | — |
| `f5-worm-test3.js` | 78 | — | none |  | — |
| `f5-worm-test4.js` | 77 | — | none |  | — |
| `f5-worm4.js` | 145 | — | none |  | — |
| `f7-wb-analyze.js` | 39 | — | none |  | — |
| `f7-wb-b5-diag.js` | 88 | — | none |  | — |
| `f7-wb-b5-pilot.js` | 165 | FoodLog | none |  | — |
| `f7-wb-b5.js` | 420 | FoodLog | follow |  | — |
| `f7-wb-b6.js` | 463 | FoodLog, TestLog | follow |  | — |
| `f7-wb-b7.js` | 474 | AILog, FarmLog | follow |  | — |
| `f7-wb-decay.js` | 104 | — | none |  | — |
| `f7-wb-diag.js` | 64 | — | none |  | — |
| `f7-wb-diag2.js` | 86 | — | none |  | — |
| `f7-wb-diag3.js` | 80 | — | none |  | — |
| `f7-wb-diag4.js` | 66 | — | none |  | — |
| `f7-wb-diag5.js` | 78 | — | none |  | — |
| `f7-wb-diag6.js` | 69 | — | none |  | — |
| `f7-wb-dry.js` | 135 | FarmLog | none |  | — |
| `f7-wb-fm1.js` | 234 | — | follow |  | — |
| `f7-wb-fm1b.js` | 168 | — | none |  | — |
| `f7-wb-fm7-pilot.js` | 209 | — | none |  | — |
| `f7-wb-fm7.js` | 477 | — | follow |  | — |
| `f7-wb-fm7v2-pilot.js` | 242 | — | none |  | — |
| `f7-wb-fm7v2-pilot2.js` | 217 | — | none |  | — |
| `f7-wb-fm7v2.js` | 416 | TestLog | follow |  | — |
| `f7-wb-growth.js` | 83 | — | none |  | — |
| `f7-wb-lib.js` | 208 | ArrowLog, ButchLog, EnchantLog, FarmLog, FishLog, FoodLog, MeleeLog, MiningLog | follow |  | — |
| `f7-wb-main.js` | 530 | — | follow |  | — |
| `f7-wb-moist.js` | 211 | FarmLog | follow |  | — |
| `f7-wb-pilot.js` | 119 | — | none |  | — |
| `f7-wb-red.js` | 97 | — | none |  | — |
| `f7-wb-scan.js` | 100 | — | follow |  | — |
| `f7-wb-spec.js` | 34 | — | none |  | — |
| `f7-wb-spec2.js` | 49 | — | none |  | — |
| `f8-dr-drop.js` | 112 | — | none |  | — |
| `f8-dr-pilot.js` | 110 | — | none |  | — |
| `f8-dr-smoke.js` | 119 | — | none |  | — |
| `f8-dr-verify.js` | 602 | FarmLog | follow |  | — |
| `f9-biome-scan.js` | 117 | — | none |  | — |
| `f9-gr-pilot.js` | 226 | — | none |  | — |
| `f9-gr-pilot2.js` | 78 | — | none |  | — |
| `f9-gr-smoke.js` | 143 | — | none |  | — |
| `f9-gr-summary.js` | 26 | — | none |  | — |
| `f9-gr-verify.js` | 516 | — | follow |  | — |
| `facedrops-w40.js` | 711 | MiningLog | none |  | — |
| `farm1-wf-carrot.js` | 119 | — | none |  | — |
| `farm1-wf-chain.js` | 157 | — | none |  | — |
| `farm1-wf-consume.js` | 137 | — | none |  | — |
| `farm1-wf-freq.js` | 221 | — | none |  | — |
| `farm1-wf-preflight.js` | 368 | EnchantLog | none |  | — |
| `farm1-wf-te-probe.js` | 145 | — | none |  | — |
| `farm1-wf.js` | 814 | — | follow |  | — |
| `farm1-wf2r-consume.js` | 171 | — | none |  | — |
| `farm1-wf2r-doublecheck.js` | 156 | — | none |  | — |
| `farm1-wf2r-freq.js` | 165 | — | none |  | — |
| `farm1-wf2r.js` | 577 | — | follow |  | — |
| `fmlbot.js` | 68 | — | none |  | fmlbot.js — mineflayer 假玩家 + FML\|HS 握手公共模块（会话七 · testharness/player） |
| `gearcraft-w47.js` | 1116 | CraftingLog, TestLog | follow |  | — |
| `hold-session.js` | 75 | SpawnLog | none |  | hold-session.js — 假玩家长驻在线（会话七 · testharness/player） |
| `kill-all-via-bot.js` | 45 | — | none |  | kill-all-via-bot.js — 假玩家 op 通道全量 kill（会话七 · testharness/player） |
| `kill-via-bot.js` | 37 | — | none |  | kill-via-bot.js — 假玩家 op 通道执行 kill（会话七 · testharness/player） |
| `m-dig.js` | 133 | — | none |  | — |
| `m-open.js` | 27 | — | none |  | — |
| `m-sight.js` | 29 | — | none |  | — |
| `mattockbreak-w43.js` | 701 | DamageLog, MiningLog | follow |  | — |
| `melee1-we2-preflight.js` | 218 | — | none |  | — |
| `melee1-we2-t10.js` | 197 | MeleeLog | none |  | — |
| `melee1-we2.js` | 768 | MiningLog | follow |  | — |
| `metal-anvil-blocks-run.js` | 571 | AnvilLog, CraftingLog, TestLog | none |  | — |
| `metal-anvil-probe.js` | 101 | — | none |  | — |
| `metgear-w62b.js` | 1089 | BlockLog, CraftingLog, DamageLog, EquipLog, MiningLog, TestLog | follow |  | — |
| `mob-batch-smoke.js` | 149 | AILog, MobLog | none |  | — |
| `mobv-evidence.js` | 40 | — | none |  | — |
| `mobv-grep.js` | 40 | — | none |  | — |
| `mobv-logscan.js` | 68 | AILog, MiningLog, MobLog, SpawnLog, TestLog | none |  | — |
| `mobv-run.js` | 1272 | MiningLog, MobLog, SpawnLog | none |  | — |
| `mobv2-run.js` | 708 | AILog, MobLog | none |  | — |
| `move-run.js` | 515 | FoodLog | none |  | — |
| `observe-entities.js` | 87 | AILog | none |  | observe-entities.js — 实体 spawn/gone 事件流观察器（会话七 · testharness/player，备器） |
| `offphase-w46.js` | 970 | DamageLog, MiningLog, TestLog | follow |  | — |
| `op-harn07.js` | 18 | — | none |  | op-harn07.js — 一次性：Harn01 执行 /op ETIM_Harn07，退出 |
| `path1-w37.js` | 768 | BlockLog, MiningLog | none |  | — |
| `probe-gate-race.js` | 93 | AILog | none |  | — |
| `probe-gate-stop.js` | 91 | — | none |  | — |
| `probe-gate-track.js` | 101 | — | none |  | — |
| `probe-selftest.js` | 97 | — | none |  | — |
| `rcon-client.js` | 72 | — | none |  | rcon-client.js — RCON 客户端（会话七 harness 版） |
| `re-bot.js` | 93 | — | none |  | — |
| `re-death.js` | 73 | DeathLog | none |  | — |
| `re-despawn.js` | 48 | AILog | none |  | — |
| `reeds-w35-probe.js` | 180 | — | none |  | — |
| `reeds-w35.js` | 729 | BlockLog, MiningLog | none |  | — |
| `rv-orelog.js` | 69 | OreLog | none |  | RV4 · [OreLog] aggregation (verdict B1 re-derivation window) |
| `shearwear50-w38.js` | 815 | BlockLog, MiningLog | none |  | — |
| `soundlog-w44.js` | 951 | MiningLog, SoundLog | follow |  | — |
| `sp3-diag.js` | 47 | — | none |  | — |
| `sp3-diag2.js` | 45 | — | none |  | — |
| `sp3-diag3.js` | 34 | — | none |  | — |
| `sp3-diag4.js` | 42 | — | none |  | — |
| `sp3-diag5.js` | 46 | — | none |  | — |
| `sp3-diag6.js` | 44 | — | none |  | — |
| `sp3-locate.js` | 77 | — | none |  | — |
| `sp3-probe.js` | 88 | — | none |  | — |
| `sp3-run.js` | 561 | MobLog, TestLog | none |  | — |
| `sp3-setup.js` | 83 | — | none |  | — |
| `spec-mobv2.js` | 28 | — | none |  | spec-mobv2.js — 稳健固定点更新（不依赖占位符） |
| `sworddecay-w34-probe.js` | 121 | — | none |  | — |
| `sworddecay-w34-probe2.js` | 119 | — | none |  | — |
| `sworddecay-w34.js` | 692 | BlockLog, MiningLog | none |  | — |
| `t01-run.js` | 232 | FoodLog | none |  | — |
| `toolcarrier-w36.js` | 739 | BlockLog, MiningLog | none |  | — |
| `unbreak-w50.js` | 1109 | EnchantLog, MiningLog, TestLog | follow |  | — |
| `uuid-offline.js` | 9 | — | none |  | — |
| `uw-attack-probe.js` | 60 | — | none |  | uw-attack-probe.js — 诊断 bot.attack 是否造成玩家伤害（Health 前后值 + drop 行） |
| `uw-attack-probe2.js` | 69 | — | none |  | uw-attack-probe2.js — 单只隔离：summon → Health/Pos → attack → 立即 Health/Pos |
| `uw-evidence.js` | 96 | — | none |  | — |
| `uw-inv.js` | 23 | — | none |  | uw-inv.js — 背包判据：/clear <player> <item> 0 0 的计数回执（不改库存） |
| `uw-rcon-probe.js` | 29 | — | none |  | probe: one persistent RCON connection, N commands (harness sanity) |
| `uw-run.js` | 630 | DimLog | none |  | — |
| `uw-stow-restart.js` | 70 | — | none |  | uw-stow-restart.js — W10 存档读回（跨服务端重启）： |
| `uw2-chatprobe.js` | 50 | — | none |  | 会话七临时探针：在玩家所在维度（underworld）用 chat testforblock 读真实方块名 |
| `uw2-colscan.js` | 42 | — | none |  | — |
| `uw2-debug.js` | 41 | — | none |  | — |
| `uw2-evidence.js` | 95 | — | none |  | — |
| `uw2-run.js` | 622 | DimLog, MiningLog, MobLog, OreLog, SpawnLog, TestLog | none |  | — |
| `uw2b-adv.js` | 24 | — | none |  | — |
| `uw2b-p10.js` | 140 | MobLog | none |  | — |
| `uw2b-p10b.js` | 133 | MobLog | none |  | — |
| `uw2b-p4.js` | 209 | DimLog | none |  | — |
| `uw2b-p6.js` | 161 | — | none |  | — |
| `uw2b-p678.js` | 319 | — | none |  | — |
| `uw2b-p6s.js` | 94 | — | none |  | — |
| `uw2b-run.js` | 713 | DimLog | none |  | — |
| `uw2b-sayprobe.js` | 33 | — | none |  | — |
| `uw2c-col.js` | 28 | DimLog | none |  | — |
| `uw2c-probe.js` | 42 | — | none |  | — |
| `uw2c-region.js` | 129 | — | none |  | — |
| `uw2c-run.js` | 561 | DimLog | none |  | — |
| `uw2c-scan.js` | 39 | — | none |  | — |
| `uw2d-run.js` | 513 | — | none |  | — |
| `v7-showroom.js` | 103 | — | none |  | — |
| `w23-noextra-shield.js` | 315 | BlockLog | none |  | — |
| `w5r-evidence.js` | 76 | — | none |  | — |
| `w7r2-evidence.js` | 56 | — | none |  | — |
| `w7r3-evidence.js` | 100 | — | none |  | — |
| `w7r3-run.js` | 363 | AILog | none |  | — |
| `wd-despawn-v2.js` | 104 | — | none |  | — |
| `wd-despawn.js` | 99 | AILog | none |  | — |
