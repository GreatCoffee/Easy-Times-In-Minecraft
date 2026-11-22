package io.github.etim.etim.item;

import net.minecraft.block.Block;
import net.minecraft.block.material.Material;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

import java.util.HashMap;
import java.util.Map;

/**
 * R196 {@code Material.java} eight-axis trait table (census F :92).
 *
 * <p>Every R196 material carries these flags (defaults in parentheses):</p>
 * <ul>
 *   <li>{@code canCatchFire} (false) — {@code setFlammability(a,..)};</li>
 *   <li>{@code canBurnAsFuel} (false) — same;</li>
 *   <li>{@code harmedByFire} (true) — same;</li>
 *   <li>{@code harmedByLava} (true) — never overridden to false in R196;</li>
 *   <li>{@code harmedByPepsin} (false) — {@code setHarmedByPepsin()};</li>
 *   <li>{@code harmedByAcid} (true) — {@code setMetal(true/false)} /
 *       {@code setRockyMineral()} / {@code setLiquid()} /
 *       {@code setHarmedByAcid(false)};</li>
 *   <li>{@code canDouseFire} (false) — {@code setCanDouseFire()};</li>
 *   <li>{@code isReplaceable} (false) — {@code setReplaceable()}.</li>
 * </ul>
 *
 * <p>The table below is keyed by the R196 material name (grep target:
 * {@code Material.java:<line>}) and resolved for 1.12 carriers by block/item
 * overrides plus the vanilla {@link Material} family. It feeds the dropped-item
 * faces only: pepsin/acid block dissolution keeps its own explicit
 * {@code ETIMBlockDissolve} lists, which this table mirrors rather than
 * replaces.</p>
 */
public final class ETIMMaterialTraits {

    /** The eight R196 axes plus the metal family hint. */
    public static final class Trait {

        public final boolean canCatchFire;
        public final boolean canBurnAsFuel;
        public final boolean harmedByFire;
        public final boolean harmedByLava;
        public final boolean harmedByPepsin;
        public final boolean harmedByAcid;
        public final boolean canDouseFire;
        public final boolean isReplaceable;

        private Trait(boolean canCatchFire, boolean canBurnAsFuel, boolean harmedByFire,
                boolean harmedByPepsin, boolean harmedByAcid, boolean canDouseFire,
                boolean isReplaceable) {
            this.canCatchFire = canCatchFire;
            this.canBurnAsFuel = canBurnAsFuel;
            this.harmedByFire = harmedByFire;
            this.harmedByLava = true;
            this.harmedByPepsin = harmedByPepsin;
            this.harmedByAcid = harmedByAcid;
            this.canDouseFire = canDouseFire;
            this.isReplaceable = isReplaceable;
        }

        @Override
        public String toString() {
            return "fire=" + harmedByFire + " pepsin=" + harmedByPepsin + " acid=" + harmedByAcid
                    + " douse=" + canDouseFire + " dissolve=" + dissolvesInWater();
        }

        public boolean dissolvesInWater() {
            return this.isReplaceable && this.canDouseFire && !this.harmedByAcid;
        }
    }

    private static final Trait PLAIN = new Trait(false, false, true, false, true, false, false);
    private static final Trait ROCKY = new Trait(false, false, true, false, false, false, false);
    private static final Trait WOOD = new Trait(true, true, true, false, true, false, false);
    private static final Trait CLOTH = new Trait(true, true, true, true, true, false, false);
    private static final Trait PLANT = new Trait(true, false, true, false, true, false, false);
    private static final Trait FOOD = new Trait(false, false, true, true, true, false, false);
    private static final Trait SUGAR = new Trait(false, false, true, false, true, false, true);
    private static final Trait SNOW = new Trait(false, false, true, false, false, true, true);
    private static final Trait ICE = new Trait(false, false, true, false, true, true, false);

    private static final Map<String, Trait> BY_NAME = new HashMap<String, Trait>();
    private static final Map<Block, Trait> BY_BLOCK = new HashMap<Block, Trait>();
    private static final Map<Item, Trait> BY_ITEM = new HashMap<Item, Trait>();

    static {
        // --- R196 Material.java declarations (name -> axes) ---
        BY_NAME.put("leather", new Trait(true, false, true, true, true, false, true));
        BY_NAME.put("wood", WOOD);
        BY_NAME.put("stone", ROCKY);
        BY_NAME.put("obsidian", ROCKY);
        BY_NAME.put("rusted_iron", new Trait(false, false, true, false, true, false, false));
        BY_NAME.put("copper", new Trait(false, false, true, false, true, false, false));
        BY_NAME.put("silver", new Trait(false, false, true, false, false, false, false));
        BY_NAME.put("gold", new Trait(false, false, true, false, false, false, false));
        BY_NAME.put("iron", new Trait(false, false, true, false, true, false, false));
        BY_NAME.put("ancient_metal", new Trait(false, false, true, false, true, false, false));
        BY_NAME.put("mithril", new Trait(false, false, true, false, false, false, false));
        BY_NAME.put("adamantium", new Trait(false, false, true, false, false, false, false));
        BY_NAME.put("netherrack", ROCKY);
        BY_NAME.put("glass", new Trait(false, false, true, false, true, false, false));
        BY_NAME.put("quartz", ROCKY);
        BY_NAME.put("emerald", ROCKY);
        BY_NAME.put("diamond", ROCKY);
        BY_NAME.put("grass", PLANT);
        BY_NAME.put("dirt", PLANT);
        BY_NAME.put("redstone", ROCKY);
        BY_NAME.put("anvil", ROCKY);
        BY_NAME.put("water", new Trait(false, false, true, false, false, true, false));
        BY_NAME.put("lava", new Trait(false, false, false, false, false, false, false));
        BY_NAME.put("tree_leaves", PLANT);
        BY_NAME.put("plants", PLANT);
        BY_NAME.put("vine", new Trait(true, false, true, false, true, false, true));
        BY_NAME.put("sponge", new Trait(true, true, true, false, true, false, false));
        BY_NAME.put("cloth", CLOTH);
        BY_NAME.put("materialCarpet", CLOTH);
        BY_NAME.put("fire", new Trait(false, false, false, false, false, false, true));
        BY_NAME.put("sand", PLAIN);
        BY_NAME.put("circuits", ROCKY);
        BY_NAME.put("coral", ROCKY);
        BY_NAME.put("ice", ICE);
        BY_NAME.put("snow", SNOW);
        BY_NAME.put("craftedSnow", SNOW);
        BY_NAME.put("cactus", PLANT);
        BY_NAME.put("clay", PLAIN);
        BY_NAME.put("hardened_clay", PLAIN);
        BY_NAME.put("pumpkin", PLANT);
        BY_NAME.put("dragonEgg", PLAIN);
        BY_NAME.put("portal", PLAIN);
        BY_NAME.put("cake", new Trait(false, false, true, true, true, false, false));
        BY_NAME.put("web", PLANT);
        BY_NAME.put("piston", PLAIN);
        BY_NAME.put("milk", new Trait(false, false, true, true, true, true, false));
        BY_NAME.put("beef_stew", FOOD);
        BY_NAME.put("chicken_soup", FOOD);
        BY_NAME.put("vegetable_soup", FOOD);
        BY_NAME.put("cream_of_mushroom_soup", FOOD);
        BY_NAME.put("cream_of_vegetable_soup", FOOD);
        BY_NAME.put("pumpkin_soup", FOOD);
        BY_NAME.put("sorbet", FOOD);
        BY_NAME.put("porridge", FOOD);
        BY_NAME.put("mashed_potato", FOOD);
        BY_NAME.put("ice_cream", new Trait(false, false, true, true, true, true, false));
        BY_NAME.put("meat", FOOD);
        BY_NAME.put("pie", FOOD);
        BY_NAME.put("cereal", FOOD);
        BY_NAME.put("sugar", SUGAR);
        BY_NAME.put("cheese", FOOD);
        BY_NAME.put("flour", SUGAR);
        BY_NAME.put("paper", new Trait(true, true, true, false, true, false, false));
        BY_NAME.put("manure", PLANT);
        BY_NAME.put("coal", new Trait(true, true, true, false, true, false, false));
        BY_NAME.put("lapis_lazuli", ROCKY);
        BY_NAME.put("feather", new Trait(true, false, true, true, true, false, false));
        BY_NAME.put("gunpowder", PLANT);
        BY_NAME.put("slime", PLANT);
        BY_NAME.put("glowstone", ROCKY);
        BY_NAME.put("dye", PLANT);
        BY_NAME.put("silk", PLANT);
        BY_NAME.put("vinyl", PLANT);

        // --- 1.12 block carriers (R196 material assignment) ---
        BY_BLOCK.put(Blocks.ICE, ICE);
        BY_BLOCK.put(Blocks.PACKED_ICE, ICE);
        BY_BLOCK.put(Blocks.FROSTED_ICE, ICE);
        BY_BLOCK.put(Blocks.SNOW, SNOW);
        BY_BLOCK.put(Blocks.SNOW_LAYER, SNOW);
        BY_BLOCK.put(Blocks.WOOL, CLOTH);
        BY_BLOCK.put(Blocks.CARPET, CLOTH);
        BY_BLOCK.put(Blocks.CAKE, BY_NAME.get("cake"));
        BY_BLOCK.put(Blocks.WEB, PLANT);
        BY_BLOCK.put(Blocks.HAY_BLOCK, PLANT);
        BY_BLOCK.put(Blocks.SPONGE, BY_NAME.get("sponge"));
        BY_BLOCK.put(Blocks.TNT, new Trait(true, false, true, false, true, false, false));
        BY_BLOCK.put(Blocks.CACTUS, PLANT);
        BY_BLOCK.put(Blocks.PUMPKIN, PLANT);
        BY_BLOCK.put(Blocks.MELON_BLOCK, PLANT);
        BY_BLOCK.put(Blocks.SOUL_SAND, PLAIN);
        BY_BLOCK.put(Blocks.ANVIL, ROCKY);

        // --- 1.12 item carriers ---
        BY_ITEM.put(Items.SNOWBALL, SNOW);
        BY_ITEM.put(Item.getItemFromBlock(Blocks.SNOW), SNOW);
        BY_ITEM.put(Item.getItemFromBlock(Blocks.SNOW_LAYER), SNOW);
        BY_ITEM.put(Item.getItemFromBlock(Blocks.ICE), ICE);
        BY_ITEM.put(Item.getItemFromBlock(Blocks.PACKED_ICE), ICE);
        BY_ITEM.put(Item.getItemFromBlock(Blocks.FROSTED_ICE), ICE);
        BY_ITEM.put(Items.SUGAR, SUGAR);
        BY_ITEM.put(Items.PAPER, BY_NAME.get("paper"));
        BY_ITEM.put(Items.COAL, BY_NAME.get("coal"));
        BY_ITEM.put(Items.FEATHER, BY_NAME.get("feather"));
        BY_ITEM.put(Items.GUNPOWDER, PLANT);
        BY_ITEM.put(Items.SLIME_BALL, PLANT);
        BY_ITEM.put(Items.DYE, PLANT);
        BY_ITEM.put(Items.LEATHER, BY_NAME.get("leather"));
    }

    private ETIMMaterialTraits() {
    }

    public static Trait byName(String r196Material) {
        Trait trait = BY_NAME.get(r196Material);
        return trait == null ? PLAIN : trait;
    }

    public static Trait ofBlock(IBlockState state) {
        if (state == null) {
            return PLAIN;
        }
        Trait trait = BY_BLOCK.get(state.getBlock());
        if (trait != null) {
            return trait;
        }
        return ofMaterial(state.getMaterial());
    }

    public static Trait ofItem(ItemStack stack) {
        if (stack == null || stack.isEmpty()) {
            return PLAIN;
        }
        Item item = stack.getItem();
        Trait trait = BY_ITEM.get(item);
        if (trait != null) {
            return trait;
        }
        if (item instanceof ETIMItemVessel) {
            ETIMBowlContents contents = ((ETIMItemVessel) item).getContents();
            if (contents == ETIMBowlContents.ICE_CREAM) {
                return BY_NAME.get("ice_cream");
            }
            if (contents == ETIMBowlContents.WATER || contents == ETIMBowlContents.MILK) {
                return BY_NAME.get(contents == ETIMBowlContents.MILK ? "milk" : "water");
            }
            return FOOD;
        }
        Block block = Block.getBlockFromItem(item);
        if (block != Blocks.AIR) {
            return ofBlock(block.getDefaultState());
        }
        return ofMaterial(Material.ROCK);
    }

    private static Trait ofMaterial(Material material) {
        if (material == Material.WOOD) {
            return WOOD;
        }
        if (material == Material.LEAVES || material == Material.PLANTS || material == Material.VINE
                || material == Material.GOURD || material == Material.CACTUS || material == Material.WEB) {
            return PLANT;
        }
        if (material == Material.CLOTH || material == Material.CARPET) {
            return CLOTH;
        }
        if (material == Material.SNOW) {
            return SNOW;
        }
        if (material == Material.CRAFTED_SNOW) {
            return SNOW;
        }
        if (material == Material.ICE || material == Material.PACKED_ICE) {
            return ICE;
        }
        if (material == Material.ROCK || material == Material.IRON || material == Material.ANVIL) {
            return ROCKY;
        }
        if (material == Material.GLASS) {
            return BY_NAME.get("glass");
        }
        if (material == Material.CAKE || material == Material.GOURD) {
            return BY_NAME.get("cake");
        }
        return PLAIN;
    }

    /** Convenience: does this stack extinguish fire / quench lava (R196 :66/:1743)? */
    public static boolean dousesFire(ItemStack stack) {
        return ofItem(stack).canDouseFire;
    }

    /** Convenience: does this stack dissolve when dropped into water (R196 :292)? */
    public static boolean dissolvesInWater(ItemStack stack) {
        return ofItem(stack).dissolvesInWater();
    }
}
