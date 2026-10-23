package io.github.etim.etim.metal;

import net.minecraft.block.material.Material;
import net.minecraft.init.Blocks;
import net.minecraft.item.Item;

/**
 * The five R196 furnace tiers batch B1 registers (对照报告 §2.2 first-hand
 * table — BlockFurnace.java:48-64 subclasses). The cobble tier is NOT here:
 * it stays the vanilla furnace (batch A), cap from ETIMConfig.
 *
 * <p>Every value is a one-hand judgment:</p>
 * <ul>
 *   <li>cap = getMaxHeatLevel per subclass (clay/sandstone/hardenedClay 1,
 *       obsidian 3, netherrack 4 — 终审 G-FB-5 A).</li>
 *   <li>material = the 1.6.4 Material each subclass passes its super
 *       (clay → clay, the rest rock).</li>
 *   <li>hardness = 0.5/1.0/1.0/4.0/8.0 (G-FB-5 table).</li>
 *   <li>isOven = clay/sandstone/hardenedClay true (BlockFurnace.java:236-238
 *       overrides — 烤炉语义位, no B1 behavior hangs off it).</li>
 *   <li>acceptsLargeItems = clay false (拒大件), every other tier true
 *       (BlockFurnace.java:240-242 base).</li>
 *   <li>explodeDropItem = the R196 explosion chain (:46-67): clay → nothing,
 *       sandstone → sandStone, obsidian → obsidian, netherrack → netherrack;
 *       hardenedClay is not in the chain → nothing (:61 return 0).</li>
 * </ul>
 */
public enum ETIMFurnaceTier {

    CLAY("clay", 1, Material.CLAY, 0.5F, true, false, null),
    SANDSTONE("sandstone", 1, Material.ROCK, 1.0F, true, true, Item.getItemFromBlock(Blocks.SANDSTONE)),
    HARDENED_CLAY("hardened_clay", 1, Material.ROCK, 1.0F, true, true, null),
    OBSIDIAN("obsidian", 3, Material.ROCK, 4.0F, false, true, Item.getItemFromBlock(Blocks.OBSIDIAN)),
    NETHERRACK("netherrack", 4, Material.ROCK, 8.0F, false, true, Item.getItemFromBlock(Blocks.NETHERRACK));

    /** Registry suffix: {@code furnace_<name>[_lit]}. */
    public final String name;
    /** R196 getMaxHeatLevel of the tier. */
    public final int heatCap;
    /** The 1.6.4 block material, mapped onto the 1.12 Material. */
    public final Material material;
    /** R196 block hardness. */
    public final float hardness;
    /** R196 isOven() (烤炉语义位 — B1 carries the flag, no behavior). */
    public final boolean isOven;
    /** R196 acceptsLargeItems(): clay refuses large items, the rest accept. */
    public final boolean acceptsLargeItems;
    /** What an explosion leaves behind (null = nothing, R196 :46-67). */
    public final Item explodeDropItem;

    ETIMFurnaceTier(String name, int heatCap, Material material, float hardness,
                    boolean isOven, boolean acceptsLargeItems, Item explodeDropItem) {
        this.name = name;
        this.heatCap = heatCap;
        this.material = material;
        this.hardness = hardness;
        this.isOven = isOven;
        this.acceptsLargeItems = acceptsLargeItems;
        this.explodeDropItem = explodeDropItem;
    }
}
