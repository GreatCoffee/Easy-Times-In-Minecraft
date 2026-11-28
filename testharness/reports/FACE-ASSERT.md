# 面↔断言覆盖图

> 生成物，勿手改：`node testharness/tools/face-assert.js --write-doc`。
> 用途：改某个面时，从这里查出该跑哪个窗口脚本。

三档：**ASSERTED**＝有脚本用正则匹配该通道（会判红）；**MENTIONED**＝只被提到；**EXEMPT**＝无窗口但已决定不验（census 行内【parity】/【zero-port】声明、`regression-exempt.json` 通道、`no-log.json` 面）；**NO-CHAN**＝载体无通道且未登记理由（真空白）。

| 卷 | 面数 | ASSERTED | MENTIONED | UNASSERTED | EXEMPT | NO-CHAN |
| --- | --- | --- | --- | --- | --- | --- |
| A | 70 | 54 | 0 | 0 | 16 | 0 |
| B | 68 | 57 | 0 | 0 | 11 | 0 |
| C | 28 | 15 | 0 | 0 | 13 | 0 |
| D | 214 | 169 | 20 | 0 | 25 | 0 |
| E | 12 | 11 | 0 | 0 | 1 | 0 |
| F | 97 | 56 | 0 | 0 | 41 | 0 |
| 合计 | 489 | 362 | 20 | 0 | 107 | 0 |

## ASSERTED（362）

| 面 | 载体 | 通道 | 断言脚本 |
| --- | --- | --- | --- |
| A:ItemTool.java:289-292 | src/main/java/io/github/etim/etim/metal/ETIMItemPickaxe.java | HoeLog | f16-reg-third.js |
| A:Item.java:1229-1246 | src/main/java/io/github/etim/etim/metal/ETIMItemPickaxe.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| A:ItemTool.java:44-46 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemSword.java:18-20 / ItemHoe.java:16-18 / ItemMattock.java:14-16 / ItemWarHammer.java:16-18 / ItemBattleAxe.java:15-17 / ItemHatchet.java:15-17 / ItemCudgel.java:16-19 | src/main/java/io/github/etim/etim/metal/ETIMItemSword.java | HoeLog | f16-reg-third.js |
| A:ItemTool.java:68-119 | src/main/java/io/github/etim/etim/metal/ETIMMetals.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:62-66 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:141-152 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemAxe.java:18-20 | src/main/java/io/github/etim/etim/metal/ETIMItemAxe.java | MiningLog | f14-reg-core.js |
| A:ItemAxe.java:9 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemShovel.java:6-12 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemHoe.java:6-7 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemPickaxe.java:6-31 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemSword.java:6-7 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemShears.java:6-7 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemScythe.java:6 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemWarHammer.java:6 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:163-171 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:191-209 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:173-175 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:183-185 ＋ ItemStack.java:328-332 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemPickaxe.java:50-57 等 13 类覆写 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemPickaxe.java:55-57 等 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemShears.java:62 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemHoe.java:75-77 | src/main/java/io/github/etim/etim/mixins/MixinItemHoe.java | AILog,ArrowLog,BlockLog,BushLog,ButchLog,CapLog,CraftingLog,DamageLog,DeathLog,DimLog,EnchLog,EnchantLog,EquipLog,FarmLog,FishLog,FoodLog,FurnaceLog,HoeLog,IngestLog,MeleeLog,MiningLog,MobLog,OreLog,SleepLog,SoundLog,WeatherLog | f18-reg-fifth.js,f17-reg-fourth.js,f11-b71-smoke.js,f15-reg-chains.js,f14-reg-core.js,f16-reg-third.js,f11-b68-smoke.js,f11-b69-smoke.js,f11-b58-smoke.js,f13-b70t9-smoke.js |
| A:EntityPlayer.java:946-961 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:874-944 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:892-895 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemInWorldManager.java:147 | src/main/java/io/github/etim/etim/mining/ETIMMiningEvents.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:888-889 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:911-920 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:922-928 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:930-940 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | AILog,ArrowLog,BlockLog,BushLog,ButchLog,CapLog,CraftingLog,DamageLog,DeathLog,DimLog,EnchLog,EnchantLog,EquipLog,FarmLog,FishLog,FoodLog,FurnaceLog,IngestLog,MeleeLog,MiningLog,MobLog,OreLog,SleepLog,SoundLog,WeatherLog | f18-reg-fifth.js,f17-reg-fourth.js,f11-b71-smoke.js,f15-reg-chains.js,f14-reg-core.js,f16-reg-third.js,f11-b68-smoke.js,f11-b69-smoke.js,f11-b58-smoke.js,f13-b70t9-smoke.js |
| A:EntityPlayer.java:942 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | AILog,ArrowLog,BlockLog,BushLog,ButchLog,CapLog,CraftingLog,DamageLog,DeathLog,DimLog,EnchLog,EnchantLog,EquipLog,FarmLog,FishLog,FoodLog,FurnaceLog,IngestLog,MeleeLog,MiningLog,MobLog,OreLog,SleepLog,SoundLog,WeatherLog | f18-reg-fifth.js,f17-reg-fourth.js,f11-b71-smoke.js,f15-reg-chains.js,f14-reg-core.js,f16-reg-third.js,f11-b68-smoke.js,f11-b69-smoke.js,f11-b58-smoke.js,f13-b70t9-smoke.js |
| A:EntityPlayer.java:897-901 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:54-56 ＋ ItemTool.java:216-234 | src/main/java/io/github/etim/etim/mixins/MixinItem.java | MiningLog,SwingLog | f14-reg-core.js,f16-reg-third.js |
| A:Damage.java:203-208 ＋ ItemTool.java:173-174 | src/main/java/io/github/etim/etim/combat/ETIMBlocking.java | ArrowLog,BlockLog,DamageLog,MiningLog | f18-reg-fifth.js,f17-reg-fourth.js,f14-reg-core.js |
| A:ItemTool.java:54-56；ItemHoe.java:26-28；ItemShears.java:27-29；ItemMattock.java:19-21；ItemDagger.java:20-22；ItemHatchet.java:25-27；ItemCudgel.java:27-29 | src/main/java/io/github/etim/etim/combat/ETIMBlocking.java | ArrowLog,BlockLog,DamageLog,MiningLog | f18-reg-fifth.js,f17-reg-fourth.js,f14-reg-core.js |
| A:EntityPlayer.java:2170-2226 | src/main/java/io/github/etim/etim/reach/ETIMReach.java | MiningLog | f14-reg-core.js |
| A:EntityPlayer.java:2174-2182 | src/main/java/io/github/etim/etim/reach/ETIMReach.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:154-157 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemInWorldManager.java:174-183 | src/main/java/io/github/etim/etim/mining/ETIMTreeFelling.java | MiningLog | f14-reg-core.js |
| A:ItemInWorldManager.java:187-202 | src/main/java/io/github/etim/etim/mining/ETIMMiningEvents.java | MiningLog | f14-reg-core.js |
| A:ItemInWorldManager.java:204-213 | src/main/java/io/github/etim/etim/world/ETIMPortalTriggerFace.java | DimLog | f17-reg-fourth.js |
| A:Material.java:405-407 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:MaterialMinHarvestLevel.java:4-21 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:62-66 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemTool.java:143-148 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemCudgel.java:6-14,22-44＋ItemClub.java:3-27 | src/main/java/io/github/etim/etim/mining/ETIMMining.java | MiningLog | f14-reg-core.js |
| A:ItemShears.java:74-99 | src/main/java/io/github/etim/etim/mixins/MixinItem.java | MiningLog,SwingLog | f14-reg-core.js,f16-reg-third.js |
| A:ItemHoe.java:54-56 | src/main/java/io/github/etim/etim/mixins/MixinItemHoe.java | BushLog,FarmLog,HoeLog | f11-b71-smoke.js,f11-b68-smoke.js,f11-b69-smoke.js,f16-reg-third.js |
| A:Enchantment.java:32 ＋ ItemHoe.java:78-80／ItemMattock.java:46-57／ItemScythe.java:40-53 | src/main/java/io/github/etim/etim/metal/ETIMItemHoe.java | BushLog,FarmLog,HoeLog | f11-b71-smoke.js,f11-b68-smoke.js,f11-b69-smoke.js,f16-reg-third.js |
| A:Item.java:954-987 | src/main/java/io/github/etim/etim/mixins/MixinItem.java | MiningLog,SwingLog | f14-reg-core.js,f16-reg-third.js |
| A:ItemMattock.java:34-43 | src/main/java/io/github/etim/etim/metal/ETIMItemMattock.java | HoeLog | f16-reg-third.js |
| A:ItemHoe.java:86-96 | src/main/java/io/github/etim/etim/mixins/MixinItemHoe.java | BushLog,FarmLog,HoeLog | f11-b71-smoke.js,f11-b68-smoke.js,f11-b69-smoke.js,f16-reg-third.js |
| B:CraftingManager.java:345-381 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:CraftingManager.java:479-507 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipeHelper.java:9-69 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:CraftingResult.java:28-49 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:CraftingResult.java:51-69 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:MITEContainerCrafting.java:24-32 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:MITEContainerCrafting.java:62-116 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:MITEContainerCrafting.java:82-95 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:150-189 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:191-208 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:210-231 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:233-257 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:286-302 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:304-318 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:320-338 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:SlotCrafting.java:107,122 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:InventoryCrafting.java:131-140 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:MITEContainerCrafting.java:56-59 | src/main/java/io/github/etim/etim/mixins/MixinSlot.java | FurnaceLog | f15-reg-chains.js |
| B:SlotCrafting.java:145-148 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:ClientPlayer.java:499-507 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:ClientPlayer.java:555-563 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:EntityPlayer.java:2414-2439 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:EntityPlayer.java:2441-2448 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:ServerPlayer.java:1009,NetClientHandler.java:1454 | src/main/java/io/github/etim/etim/crafting/ETIMCrafting.java | CraftingLog | f15-reg-chains.js |
| B:RecipesTools.java:4-126 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesWeapons.java:4-49 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesWeapons.java:50-75 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesArmor.java:6-61 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesIngots.java:4-20 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesIngots.java:29-45 | src/main/java/io/github/etim/etim/metal/ETIMBlocks.java | DimLog,FurnaceLog,TestLog | f17-reg-fourth.js,f15-reg-chains.js,f14-reg-core.js |
| B:RecipesIngots.java:47-69 | src/main/java/io/github/etim/etim/metal/ETIMBlocks.java | DimLog,FurnaceLog,TestLog | f17-reg-fourth.js,f15-reg-chains.js,f14-reg-core.js |
| B:RecipesMITE.java:4-226 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesMITE.java:256-257 | src/main/java/io/github/etim/etim/metal/ETIMGear.java | EquipLog,TestLog | f16-reg-third.js,f14-reg-core.js |
| B:RecipesMITE.java:259-263 | src/main/java/io/github/etim/etim/metal/ETIMBlocks.java | DimLog,FurnaceLog,TestLog | f17-reg-fourth.js,f15-reg-chains.js,f14-reg-core.js |
| B:RecipesMITE.java:264-275 | src/main/java/io/github/etim/etim/metal/ETIMBlocks.java | DimLog,FurnaceLog,TestLog | f17-reg-fourth.js,f15-reg-chains.js,f14-reg-core.js |
| B:RecipesMITE.java:480-510 | src/main/java/io/github/etim/etim/furnace/FurnaceHeat.java | FurnaceLog | f15-reg-chains.js |
| B:TileEntityFurnace.java:10-13 | src/main/java/io/github/etim/etim/furnace/FurnaceHeat.java | FurnaceLog | f15-reg-chains.js |
| B:TileEntityFurnace.java:219-241 | src/main/java/io/github/etim/etim/furnace/FurnaceHeat.java | FurnaceLog | f15-reg-chains.js |
| B:TileEntityFurnace.java:136-146 | src/main/java/io/github/etim/etim/mixins/MixinTileEntityFurnace.java | FurnaceLog | f15-reg-chains.js |
| B:TileEntityFurnace.java:148-156 | src/main/java/io/github/etim/etim/mixins/MixinTileEntityFurnace.java | FurnaceLog | f15-reg-chains.js |
| B:TileEntityFurnace.java:305-325 | src/main/java/io/github/etim/etim/mixins/MixinTileEntityFurnace.java | FurnaceLog | f15-reg-chains.js |
| B:TileEntityFurnace.java:333-343 | src/main/java/io/github/etim/etim/mixins/MixinTileEntityFurnace.java | FurnaceLog | f15-reg-chains.js |
| B:BlockFurnace.java:45-71 | src/main/java/io/github/etim/etim/metal/ETIMBlockFurnace.java | DimLog,FurnaceLog,TestLog | f17-reg-fourth.js,f15-reg-chains.js,f14-reg-core.js |
| B:FurnaceRecipes.java:22-42 | src/main/java/io/github/etim/etim/furnace/FurnaceHeat.java | FurnaceLog | f15-reg-chains.js |
| B:SlotFuel.java:12-15 | src/main/java/io/github/etim/etim/mixins/MixinSlotFurnaceFuel.java | FurnaceLog | f15-reg-chains.js |
| B:SlotFurnace.java:15-25 | src/main/java/io/github/etim/etim/furnace/FurnaceXpRewards.java | FurnaceLog | f15-reg-chains.js |
| B:ContainerFurnace.java:58-66 | src/main/java/io/github/etim/etim/mixins/MixinGuiFurnace.java | FurnaceLog | f15-reg-chains.js |
| B:BlockAnvil.java:191-208 | src/main/java/io/github/etim/etim/metal/ETIMAnvilRepair.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:BlockAnvil.java:210-226 | src/main/java/io/github/etim/etim/metal/ETIMAnvilDamageData.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:BlockAnvil.java:152-154 | src/main/java/io/github/etim/etim/metal/ETIMAnvilRepair.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:TileEntityAnvil.java:23-36 | src/main/java/io/github/etim/etim/metal/ETIMAnvilDamageData.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:ContainerRepair.java:52-119 | src/main/java/io/github/etim/etim/metal/ETIMAnvilRepair.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:ContainerRepair.java:154-200 | src/main/java/io/github/etim/etim/metal/ETIMAnvilRepair.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:ContainerRepair.java:145-147 | src/main/java/io/github/etim/etim/mixins/MixinContainerRepair.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:ContainerRepairINNER2.java:30-59 | src/main/java/io/github/etim/etim/metal/ETIMAnvilRepair.java | CraftingLog,EnchantLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| B:EnchantmentHelper.java:403-405 | src/main/java/io/github/etim/etim/hunger/ETIMEndurance.java | FoodLog | f11-b58-smoke.js,f13-b70t9-smoke.js |
| B:EnchantmentTreeFelling.java:8-21 | src/main/java/io/github/etim/etim/mining/ETIMEnchantments.java | MiningLog | f14-reg-core.js |
| C:Damage.java:191-193 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | ArrowLog,DamageLog | f18-reg-fifth.js,f14-reg-core.js |
| C:Damage.java:203-209 | src/main/java/io/github/etim/etim/combat/ETIMBlocking.java | ArrowLog,BlockLog,DamageLog | f18-reg-fifth.js,f17-reg-fourth.js,f14-reg-core.js |
| C:Damage.java:221-229 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | ArrowLog,DamageLog | f18-reg-fifth.js,f14-reg-core.js |
| C:Damage.java:231 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | ArrowLog,DamageLog | f18-reg-fifth.js,f14-reg-core.js |
| C:EntityLivingBase.java:705-714 | src/main/java/io/github/etim/etim/hunger/ETIMHungerEvents.java | FoodLog | f11-b58-smoke.js,f13-b70t9-smoke.js |
| C:ItemArmor.java:45-74 | src/main/java/io/github/etim/etim/metal/ETIMMetalArmor.java | EquipLog | f16-reg-third.js |
| C:ItemArmor.java:36-43 | src/main/java/io/github/etim/etim/metal/ETIMMetalArmor.java | CraftingLog,EnchantLog,EquipLog,TestLog | f15-reg-chains.js,f16-reg-third.js,f14-reg-core.js |
| C:EntityPlayer.java:624-630 | src/main/java/io/github/etim/etim/playerstate/PlayerLevelBonuses.java | MobLog | f17-reg-fourth.js |
| C:EntityPlayer.java:1104-1108 | src/main/java/io/github/etim/etim/mob/ETIMEntityArrow.java | ArrowLog,MobLog | f18-reg-fifth.js,f17-reg-fourth.js |
| … | | | 另有 242 面 |

## MENTIONED（20）

| 面 | 载体 | 通道 | 断言脚本 |
| --- | --- | --- | --- |
| D:SpawnerAnimals.java:664-666 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntitySkeleton.java:32-34 | src/main/java/io/github/etim/etim/mob/ETIMMobStats.java | AILog | - |
| D:EntityZombie.java:43 | src/main/java/io/github/etim/etim/mob/ETIMMobStats.java | AILog | - |
| D:EntityPigZombie.java:22 | src/main/java/io/github/etim/etim/mob/ETIMMobStats.java | AILog | - |
| D:EntityArachnid.java:113-120 | src/main/java/io/github/etim/etim/mob/ETIMMobStats.java | AILog | - |
| D:EntitySkeleton.java:225 | src/main/java/io/github/etim/etim/mob/ETIMMobStats.java | AILog | - |
| D:EntityBoneLord.java:14-21 | src/main/java/io/github/etim/etim/mob/ETIMEntityBoneLord.java | AILog | - |
| D:EntityLiving.java:761-783 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityLiving.java:776 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityLiving.java:699-758 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityMob.java:259-269 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityAnimal.java:237-255 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityWolf.java:557-558 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityZombie.java:346-347 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:Entity.java:2868-2870 | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityGhast.java:202 / EntityDragon.java | src/main/java/io/github/etim/etim/mob/DespawnRules.java | AILog | - |
| D:EntityAIWitchRoaming.java:12-18 | src/main/java/io/github/etim/etim/mob/ETIMEntityAIWitchRoaming.java | AILog | - |
| D:EntityAIMoveToTree.java:9-77 | src/main/java/io/github/etim/etim/mob/ETIMEntityAIMoveToTree.java | AILog,FireLog | - |
| D:EntityAISeekFiringPosition.java:13-84 | src/main/java/io/github/etim/etim/mob/ETIMEntityAISeekFiringPosition.java | AILog | - |
| D:EntityAIAvoidFire.java:17-40 | src/main/java/io/github/etim/etim/mob/ETIMEntityAIAvoidFire.java | AILog | - |

## UNASSERTED（0）

（无）

## EXEMPT（107）

| 面 | 载体 | 通道 | 断言脚本 |
| --- | --- | --- | --- |
| A:ItemTool.java:36-42 | src/main/java/io/github/etim/etim/mining/ETIMToolDurability.java | - | - |
| A:ItemTool.java:40-41 + 各类 getNumComponentsForDurability | src/main/java/io/github/etim/etim/mining/ETIMToolDurability.java | - | - |
| A:EnumEquipmentMaterial.java:4-20 | src/main/java/io/github/etim/etim/mining/ETIMToolDurability.java | - | - |
| A:EnumQuality.java:4-13 | src/main/java/io/github/etim/etim/mixins/MixinItemStack.java | - | - |
| A:ItemTool.java:236-239 | src/main/java/io/github/etim/etim/metal/ETIMItemPickaxe.java | - | - |
| A:ItemTool.java:279-282 | src/main/java/io/github/etim/etim/metal/ETIMItemPickaxe.java | - | - |
| A:ItemStack.java:270-301 | - | - | - |
| A:ItemTool.java:28 | src/main/java/io/github/etim/etim/reach/ETIMReach.java | - | - |
| A:ItemShears.java:8／ItemDagger.java:6／ItemKnife.java:6／ItemCudgel.java:7／ItemHatchet.java:6／ItemScythe.java:7 | src/main/java/io/github/etim/etim/metal/ETIMItemShears.java | - | - |
| A:ItemTool.java:245-252 | src/main/java/io/github/etim/etim/metal/ETIMItemSword.java | - | - |
| A:ItemTool.java:270-273 | src/main/java/io/github/etim/etim/quality/ETIMQuality.java | - | - |
| A:ItemTool.java:284-287 | src/main/java/io/github/etim/etim/metal/ETIMItemPickaxe.java | - | - |
| A:ItemPickaxe.java:40-42 等 | src/main/java/io/github/etim/etim/metal/ETIMItemPickaxe.java | - | - |
| A:ItemHoe.java:75 | src/main/java/io/github/etim/etim/combat/ETIMBlocking.java | - | - |
| A:ItemInWorldManager.java:80-113 | src/main/java/io/github/etim/etim/mining/ETIMOozeSpawn.java | OozeLog | - |
| A:ItemTool.java:29-33 | src/main/java/io/github/etim/etim/skill/ETIMSkillRules.java | - | - |
| B:EntityPlayer.java:2398-2412 | src/main/java/io/github/etim/etim/quality/ETIMQuality.java | - | - |
| B:TileEntityFurnace.java:187-191 | - | - | - |
| B:TileEntityFurnace.java:267-294 | src/main/java/io/github/etim/etim/metal/ETIMFurnaceGate.java | - | - |
| B:BlockFurnaceClay.java:26-38／BlockFurnaceHardenedClay.java:25-33／BlockFurnaceSandstone.java:25-33／BlockFurnaceCobblestone.java:25-28／BlockFurnaceObsidian.java:25-28／BlockFurnaceNetherrack.java:25-28 | src/main/java/io/github/etim/etim/metal/ETIMBlockFurnace.java | - | - |
| B:BlockAnvil.java:47-54 | src/main/java/io/github/etim/etim/metal/ETIMBlockAnvil.java | - | - |
| B:Enchantment.java:96-98 | src/main/java/io/github/etim/etim/mixins/MixinContainerEnchantment.java | - | - |
| B:Enchantment.java:79-92 | src/main/java/io/github/etim/etim/mining/ETIMEnchantments.java | - | - |
| B:EnchantmentHelper.java:43-57 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| B:EnchantmentProtection.java:96-133 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| B:EnchantmentPiercing.java:8-26 | src/main/java/io/github/etim/etim/mining/ETIMEnchantments.java | - | - |
| B:EnchantmentEndurance.java:8-26 | src/main/java/io/github/etim/etim/mining/ETIMEnchantments.java | - | - |
| C:Damage.java:195-201 | src/main/java/io/github/etim/etim/combat/ETIMBlocking.java | - | - |
| C:Damage.java:213-220 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:Damage.java:215-216 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:Damage.java:218-219 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:DamageSource.java:13-17 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:DamageSource.java:156-161 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:EntityLivingBase.java:1157-1159 | src/main/java/io/github/etim/etim/combat/ETIMNaturalDefense.java | - | - |
| C:EntityLivingBase.java:1209-1224 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:ItemArmor.java:76-83 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:ItemArmor.java:226-241 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:ItemArmor.java:308-335 | src/main/java/io/github/etim/etim/combat/R196ArmorModel.java | - | - |
| C:EntityPlayer.java:2789-2791 | src/main/java/io/github/etim/etim/hunger/ETIMHunger.java | - | - |
| C:EntityPlayer.java:2789,Item.java:1903-1904 | src/main/java/io/github/etim/etim/hunger/ETIMHunger.java | - | - |
| D:EntityRevenant.java:12-21 | src/main/java/io/github/etim/etim/mob/ETIMEntityRevenant.java | - | - |
| D:EntityAncientBoneLord.java:12-18 | src/main/java/io/github/etim/etim/mob/ETIMEntityAncientBoneLord.java | - | - |
| D:EntityWoodSpider.java:10-14 / EntityDemonSpider.java:15-19 / EntityPhaseSpider.java:17-21 | src/main/java/io/github/etim/etim/mob/ETIMEntityWoodSpider.java | - | - |
| D:EntityNightwing.java:11-15 | src/main/java/io/github/etim/etim/mob/ETIMEntityNightwing.java | BatMobLog | - |
| D:EntityVampireBat.java:12-16 | src/main/java/io/github/etim/etim/mob/ETIMEntityVampireBat.java | BatMobLog | - |
| D:EntityClayGolem.java:9-15 | src/main/java/io/github/etim/etim/mob/ETIMEntityClayGolem.java | - | - |
| D:EntityJelly.java / EntityBlob.java / EntityOoze.java / EntityPudding.java（各 :4-9） | src/main/java/io/github/etim/etim/mob/ETIMEntityJelly.java | - | - |
| D:EntityJelly.java:24-34 / EntityBlob.java:24-34 / EntityOoze.java:36-56 / EntityPudding.java:24-44 | src/main/java/io/github/etim/etim/mob/ETIMEntityPudding.java | - | - |
| D:EntityLongdeadGuardian.java:11-16 | src/main/java/io/github/etim/etim/mob/ETIMEntityLongdeadGuardian.java | - | - |
| D:EntityLiving.java:1185-1194 | src/main/java/io/github/etim/etim/mixins/MixinEntityLivingDisarm.java | - | - |
| D:EntityOcelot.java:53-55 | src/main/java/io/github/etim/etim/mixins/MixinEntityOcelot.java | - | - |
| D:Entity.java:1801-1803 / :1899 | src/main/java/io/github/etim/etim/mixins/MixinEntity.java | - | - |
| D:EntityMob.java:15-22 | - | - | - |
| D:EntityZombie.java:35 | src/main/java/io/github/etim/etim/mixins/MixinEntityZombie.java | - | - |
| D:EntityWoodSpider.java:34-47 | src/main/java/io/github/etim/etim/mob/ETIMEntityWoodSpider.java | - | - |
| D:EntityDemonSpider.java:30-42 | src/main/java/io/github/etim/etim/mob/ETIMEntityDemonSpider.java | - | - |
| D:EntityWeb.java:16-54 | src/main/java/io/github/etim/etim/mob/ETIMEntityWeb.java | - | - |
| D:EntityBat.java:27-36 | src/main/java/io/github/etim/etim/mixins/MixinEntityBat.java | BatLog | - |
| D:EntityLivestock.java:26-28 | src/main/java/io/github/etim/etim/mob/ETIMLivestock.java | - | - |
| D:EntityLivestock.java:40-79 | src/main/java/io/github/etim/etim/mob/ETIMLivestock.java | - | - |
| D:EntityNightwing.java:22-25 / :56-76 | src/main/java/io/github/etim/etim/mob/ETIMEntityNightwing.java | BatMobLog | - |
| D:EntityVampireBat.java:32-54 | src/main/java/io/github/etim/etim/mob/ETIMEntityVampireBat.java | BatMobLog | - |
| D:EntityInfernalCreeper.java:11-15 / :16-36 | src/main/java/io/github/etim/etim/mob/ETIMEntityInfernalCreeper.java | - | - |
| D:EntityClayGolem.java:16-33 | src/main/java/io/github/etim/etim/mob/ETIMEntityClayGolem.java | - | - |
| D:EntityCopperspine.java:4-7 / EntityHoarySilverfish.java:4-7 | src/main/java/io/github/etim/etim/mob/ETIMEntityCopperspine.java | - | - |
| E:E-72 BiomeGenUnderworld.java:19-65 | src/main/java/io/github/etim/etim/world/ETIMChunkPostField.java | - | - |
| F:Item.java:1903-1905 | src/main/java/io/github/etim/etim/hunger/ETIMHunger.java | - | - |
| F:Item.java:1277-1292 | src/main/java/io/github/etim/etim/reach/ETIMReach.java | - | - |
| F:Item.java:917-926/1546-1616 | src/main/java/io/github/etim/etim/mixins/MixinItemStack.java | - | - |
| F:Item.java:1338-1341 | src/main/java/io/github/etim/etim/crafting/CraftingDifficulty.java | - | - |
| F:ItemFood.java:60-64 | src/main/java/io/github/etim/etim/item/ETIMItemVessel.java | - | - |
| F:ItemFood.java:99-102 | - | - | - |
| F:ItemFood.java:104-108 | src/main/java/io/github/etim/etim/furnace/FurnaceXpRewards.java | - | - |
| F:FoodStats.java:43 | src/main/java/io/github/etim/etim/hunger/FoodGates.java | - | - |
| F:FoodStats.java:46-56 | src/main/java/io/github/etim/etim/hunger/FoodGates.java | - | - |
| F:FoodStats.java:62-89 | src/main/java/io/github/etim/etim/hunger/FoodGates.java | - | - |
| F:FoodStats.java:190-196 | src/main/java/io/github/etim/etim/hunger/FoodGates.java | - | - |
| F:ItemVessel.java:82-85 | src/main/java/io/github/etim/etim/item/ETIMItemVessel.java | - | - |
| F:ItemBowl.java:4-8/107-110 | src/main/java/io/github/etim/etim/item/ETIMItemBowl.java | - | - |
| F:ItemBowl.java:11-24 | src/main/java/io/github/etim/etim/item/ETIMItemVessel.java | - | - |
| F:ItemBowl.java:112-172 | src/main/java/io/github/etim/etim/item/ETIMBowlContents.java | - | - |
| F:ItemPotion.java:161-163 | - | - | - |
| F:ItemPotion.java:59-77/80-82 | - | - | - |
| F:Block.java:1459-1463 | - | - | - |
| F:Block.java:2575-2582 | src/main/java/io/github/etim/etim/world/ETIMCushioning.java | - | - |
| F:Block.java:2597-2600 | src/main/java/io/github/etim/etim/crafting/CraftingDifficulty.java | - | - |
| F:Block.java:2939-2943 | - | - | - |
| F:Block.java:2633-2635 | - | - | - |
| F:Block.java:2923-2937 | - | - | - |
| F:Block.java:1162-1373 | - | - | - |
| F:Material.java:10-178 | src/main/java/io/github/etim/etim/item/ETIMMaterialTraits.java | - | - |
| F:BlockBreakInfo.java:29-51 | - | - | - |
| F:BlockBreakInfo.java:77-190 | - | - | - |
| F:Block.java:1852-1862 | - | - | - |
| F:Explosion.java:167-214 | src/main/java/io/github/etim/etim/mixins/MixinExplosion.java | - | - |
| F:Block.java:971-979 | src/main/java/io/github/etim/etim/metal/ETIMBlockMantleOrCore.java | - | - |
| F:BlockUnderminable.java:1-101 | src/main/java/io/github/etim/etim/mining/ETIMUndermine.java | - | - |
| F:BlockSpark.java:1-54 | src/main/java/io/github/etim/etim/mixins/MixinItemFlintAndSteel.java | - | - |
| F:BlockCropsDead.java:1-48/BlockCarrotDead.java/BlockOnionDead.java/BlockPotatoDead.java | src/main/java/io/github/etim/etim/farm/ETIMBlockDeadPlant.java | - | - |
| F:ItemFood.java:60-64 | src/main/java/io/github/etim/etim/item/ETIMItemVessel.java | - | - |
| F:ItemFood.java:99-102 | - | - | - |
| F:ItemVessel.java:82-85 | src/main/java/io/github/etim/etim/item/ETIMItemVessel.java | - | - |
| F:ItemBowl.java:4-8/107-110 | src/main/java/io/github/etim/etim/item/ETIMItemBowl.java | - | - |
| F:ItemBowl.java:11-24 | src/main/java/io/github/etim/etim/item/ETIMItemVessel.java | - | - |
| F:ItemBowl.java:112-172 | src/main/java/io/github/etim/etim/item/ETIMBowlContents.java | - | - |
| F:ItemPotion.java:161-163 | - | - | - |
| F:ItemPotion.java:59-77/80-82 | - | - | - |

## NO-CHAN（0）

（无）

