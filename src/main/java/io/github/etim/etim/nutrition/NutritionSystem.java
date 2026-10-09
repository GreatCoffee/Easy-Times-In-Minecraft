package io.github.etim.etim.nutrition;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.init.MobEffects;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.potion.PotionEffect;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.FoodStats;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.MathHelper;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;

import javax.annotation.Nullable;
import java.util.HashMap;
import java.util.Map;

/**
 * The nutrient pools plus insulin resistance (task 1.4), faithful to MITE R196
 * (decompiled {@code ServerPlayer} / {@code FoodStats} / {@code Item}).
 *
 * <p>Each pool is a "tick budget": it drains 1 per tick and is refilled by
 * eating ({@code nutrition × TICKS_PER_FOOD_POINT} for each food attribute
 * the item carries; MITE Item.java:1907-1916). Full pools = 160000 ticks; an
 * empty pool (protein or phytonutrients) defines malnourishment, which slows
 * health regen to a quarter (MITE FoodStats.java:78).</p>
 *
 * <p>Insulin resistance (MITE verified values, incl. javap of the R196 jar):
 * eating sugary food adds {@code (int)(sugar × 4.8)} (Item.getInsulinResponse),
 * every tick drains 1. The displayed level is a lagged mirror of the raw
 * value (ServerPlayer.setInsulinResistance 376-394; the "more severe" branch
 * bytecode reads {@code level = computed.getNext()}, i.e. one band above the
 * raw value's band): rising to a threshold band jumps straight to it; while
 * decaying the held level lags one full band behind the raw value's band,
 * so severe persists until the value drops below the moderate threshold,
 * moderate until below the mild threshold; a value in 1..(mild-1) still
 * shows mild (or stays absent if mild was never reached); 0 cures.</p>
 *
 * <p>Sugar is NOT hard-blocked at moderate/severe resistance (MITE has no such
 * gate): eating sugar while resistant triggers nausea 400 ticks (amplifier =
 * level), severe additionally poisons for max(response/48, 100) ticks
 * (ServerPlayer.addInsulinResistance 431-438), and from moderate up sugary
 * foods give reduced satiation (Item.getSatiation: sugar < 1000 → −1, else
 * −sugar/1000).</p>
 */
public final class NutritionSystem {

    /** Storage key of the capability on the player entity. */
    public static final ResourceLocation NUTRITION_CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "nutrition");

    /** Mirror levels of the insulin resistance value (R196 EnumInsulinResistanceLevel). */
    public static final int LEVEL_NONE = 0;
    public static final int LEVEL_MILD = 1;
    public static final int LEVEL_MODERATE = 2;
    public static final int LEVEL_SEVERE = 3;

    @net.minecraftforge.common.capabilities.CapabilityInject(INutrition.class)
    public static Capability<INutrition> CAPABILITY_NUTRITION = null;

    /** Registers the capability storage (call from mod preInit, once). */
    public static void register() {
        CapabilityManager.INSTANCE.register(INutrition.class, new Capability.IStorage<INutrition>() {
            @Override
            public NBTBase writeNBT(Capability<INutrition> capability, INutrition instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setInteger("protein", instance.getProtein());
                tag.setInteger("essentialFats", instance.getEssentialFats());
                tag.setInteger("phytonutrients", instance.getPhytonutrients());
                tag.setInteger("insulinResistance", instance.getInsulinResistance());
                tag.setInteger("insulinLevel", instance.getInsulinLevel());
                return tag;
            }

            @Override
            public void readNBT(Capability<INutrition> capability, INutrition instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setProtein(tag.getInteger("protein"));
                instance.setEssentialFats(tag.getInteger("essentialFats"));
                instance.setPhytonutrients(tag.getInteger("phytonutrients"));
                instance.setInsulinResistance(tag.getInteger("insulinResistance"));
                instance.setInsulinLevel(tag.getInteger("insulinLevel"));
            }
        }, Nutrition::new);
    }

    public static final class Provider implements ICapabilitySerializable<NBTTagCompound> {
        private final Nutrition nutrition = new Nutrition();

        @Override
        public boolean hasCapability(Capability<?> capability, EnumFacing facing) {
            return capability == CAPABILITY_NUTRITION;
        }

        @SuppressWarnings("unchecked")
        @Override
        public <T> T getCapability(Capability<T> capability, EnumFacing facing) {
            return capability == CAPABILITY_NUTRITION ? (T) nutrition : null;
        }

        @Override
        public NBTTagCompound serializeNBT() {
            NBTTagCompound tag = new NBTTagCompound();
            tag.setInteger("protein", nutrition.protein);
            tag.setInteger("essentialFats", nutrition.essentialFats);
            tag.setInteger("phytonutrients", nutrition.phytonutrients);
            tag.setInteger("insulinResistance", nutrition.insulinResistance);
            tag.setInteger("insulinLevel", nutrition.insulinLevel);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTTagCompound tag) {
            nutrition.protein = tag.getInteger("protein");
            nutrition.essentialFats = tag.getInteger("essentialFats");
            nutrition.phytonutrients = tag.getInteger("phytonutrients");
            nutrition.insulinResistance = tag.getInteger("insulinResistance");
            nutrition.insulinLevel = tag.getInteger("insulinLevel");
        }
    }

    /** Per-player nutrient state; capability target interface. */
    public interface INutrition {
        int getProtein();
        void setProtein(int value);
        int getEssentialFats();
        void setEssentialFats(int value);
        int getPhytonutrients();
        void setPhytonutrients(int value);
        int getInsulinResistance();
        void setInsulinResistance(int value);
        /** Held mirror level (hysteresis state of the raw value), one of LEVEL_*. */
        int getInsulinLevel();
        void setInsulinLevel(int level);
    }

    /** Default implementation (clamping setters mirror R196 setters). */
    public static class Nutrition implements INutrition {
        private int protein = ETIMConfig.nutritionPoolMax;
        private int essentialFats = ETIMConfig.nutritionPoolMax;
        private int phytonutrients = ETIMConfig.nutritionPoolMax;
        private int insulinResistance = 0;
        private int insulinLevel = LEVEL_NONE;

        @Override public int getProtein() { return protein; }
        @Override public void setProtein(int value) { protein = MathHelper.clamp(value, 0, ETIMConfig.nutritionPoolMax); }
        @Override public int getEssentialFats() { return essentialFats; }
        @Override public void setEssentialFats(int value) { essentialFats = MathHelper.clamp(value, 0, ETIMConfig.nutritionPoolMax); }
        @Override public int getPhytonutrients() { return phytonutrients; }
        @Override public void setPhytonutrients(int value) { phytonutrients = MathHelper.clamp(value, 0, ETIMConfig.nutritionPoolMax); }

        /** Value setter: updates the held mirror level via the R196 hysteresis rule. */
        @Override public void setInsulinResistance(int value) {
            insulinResistance = MathHelper.clamp(value, 0, ETIMConfig.insulinCap);
            insulinLevel = mirrorLevel(insulinResistance, insulinLevel);
        }
        @Override public int getInsulinResistance() { return insulinResistance; }
        @Override public int getInsulinLevel() { return insulinLevel; }
        /** Raw level override (used by dimension/death clone copy, which persists the same lag state as this one). */
        @Override public void setInsulinLevel(int level) { insulinLevel = MathHelper.clamp(level, LEVEL_NONE, LEVEL_SEVERE); }
    }

    /** Raw value → threshold band, ignoring any held (lagged) level. */
    public static int rawLevel(int insulinResistance) {
        if (insulinResistance >= ETIMConfig.insulinThresholdSevere) return LEVEL_SEVERE;
        if (insulinResistance >= ETIMConfig.insulinThresholdModerate) return LEVEL_MODERATE;
        if (insulinResistance >= ETIMConfig.insulinThresholdMild) return LEVEL_MILD;
        return LEVEL_NONE;
    }

    /**
     * Level mirror (R196 ServerPlayer.setInsulinResistance 376-394, verified
     * against the jar bytecode — the "more severe" branch assigns
     * {@code computed.getNext()} from the LOCAL raw level, not from the held
     * one, so it can never index past severe): 0 cures; a value below the
     * mild threshold keeps mild once any level is held (stays none if mild
     * was never reached); rising adopts the raw band immediately; decaying
     * keeps the level one band more severe than the raw value's band.
     */
    public static int mirrorLevel(int value, int heldLevel) {
        if (value <= 0) {
            return LEVEL_NONE;
        }
        int raw = rawLevel(value);
        if (raw == LEVEL_NONE) {
            return heldLevel == LEVEL_NONE ? LEVEL_NONE : LEVEL_MILD;
        }
        if (heldLevel == LEVEL_NONE) {
            return raw;
        }
        if (raw > heldLevel) {
            return raw;
        }
        if (raw < heldLevel) {
            // computed.getNext(): one band above the raw band, capped by the
            // held level. This branch fires only when raw < held, so raw is
            // at most moderate and raw + 1 never exceeds severe — the R196
            // getNext() chain call cannot go out of bounds here.
            return Math.min(heldLevel, raw + 1);
        }
        return heldLevel;
    }

    @Nullable
    public static INutrition get(EntityPlayer player) {
        return player.getCapability(CAPABILITY_NUTRITION, null);
    }

    public static boolean isMalnourished(EntityPlayer player) {
        INutrition capsule = get(player);
        return capsule != null && (capsule.getProtein() == 0 || capsule.getPhytonutrients() == 0);
    }

    /** True while the player holds any insulin resistance level. */
    public static boolean isInsulinResistant(EntityPlayer player) {
        INutrition capsule = get(player);
        return capsule != null && capsule.getInsulinLevel() > LEVEL_NONE;
    }

    /** Per-tick drain (R196 decrementNutrients / decrementInsulinResistance). */
    public static void tick(EntityPlayer player) {
        if (player.capabilities.isCreativeMode) {
            return;
        }
        INutrition capsule = get(player);
        if (capsule == null) {
            return;
        }
        capsule.setProtein(Math.max(0, capsule.getProtein() - 1));
        capsule.setEssentialFats(Math.max(0, capsule.getEssentialFats() - 1));
        capsule.setPhytonutrients(Math.max(0, capsule.getPhytonutrients() - 1));
        int insulin = capsule.getInsulinResistance();
        if (insulin > 0) {
            capsule.setInsulinResistance(insulin - 1);
        }
    }

    /**
     * Applies a food's full R196 addFoodValue semantics (FoodStats.java:18-25):
     * nutrient pools by flags, then — for sugary food — the satiation discount
     * at moderate+ resistance and the insulin response with side effects.
     */
    public static void applyFood(EntityPlayer player, FoodValue value) {
        INutrition capsule = get(player);
        if (capsule == null) {
            return;
        }
        int gain = value.nutrition * ETIMConfig.nutritionTicksPerPoint;
        if (value.protein) capsule.setProtein(capsule.getProtein() + gain);
        if (value.fats) capsule.setEssentialFats(capsule.getEssentialFats() + gain);
        if (value.phyto) capsule.setPhytonutrients(capsule.getPhytonutrients() + gain);

        if (value.sugarContent > 0) {
            // Satiation discount from the PRE-eat state (R196: addSatiation uses
            // item.getSatiation(player) before addInsulinResistance).
            if (capsule.getInsulinLevel() >= LEVEL_MODERATE) {
                int discount = value.sugarContent < 1000 ? 1 : value.sugarContent / 1000;
                FoodStats foodStats = player.getFoodStats();
                foodStats.setFoodLevel(Math.max(0, foodStats.getFoodLevel() - discount));
            }
            applyInsulinResponse(player, (int) (value.sugarContent * ETIMConfig.sugarToInsulin));
        }
    }

    /**
     * R196 addInsulinResistance (ServerPlayer:431-438): add the response to the
     * raw value, then — if the player is insulin resistant afterwards — nausea
     * 400 ticks at amplifier = held level, plus poison for the severe level.
     */
    public static void applyInsulinResponse(EntityPlayer player, int response) {
        if (response <= 0) {
            return;
        }
        INutrition capsule = get(player);
        if (capsule == null) {
            return;
        }
        capsule.setInsulinResistance(capsule.getInsulinResistance() + response);
        int level = capsule.getInsulinLevel();
        if (level > LEVEL_NONE) {
            player.addPotionEffect(new PotionEffect(MobEffects.NAUSEA, 400, level - 1));
            if (level == LEVEL_SEVERE) {
                player.addPotionEffect(new PotionEffect(MobEffects.POISON, Math.max((int) (response / 48.0F), 100), 0));
            }
        }
    }

    /** Vanilla cake right-click: one slice = nutrition 2 protein, sugar 1000/6 (R196 BlockCake:80). */
    public static void eatCakeSlice(EntityPlayer player) {
        FoodValue slice = new FoodValue(2, 1000 / 6, true, false, false);
        applyFood(player, slice);
    }

    // +-------------------------------+
    // | Food registry (1.12 items)     |
    // +-------------------------------+

    /**
     * Per-R196 food values for every vanilla 1.12 item that MITE registered;
     * anything unlisted (and the clownfish/pufferfish fish variants) provides
     * no nutrient gains and keeps vanilla behavior. Satiation stays vanilla —
     * the vanilla FoodStats reform (fullness/nutrition conversion) is a later
     * subsystem.
     *
     * <p>Notes: MITE eats wheat/pumpkin/melon seeds and raw eggs, but those
     * items are not edible in 1.12, so they are not registered. MITE-only items
     * (cheese, worms, large fish handled via the salmon metadata below) are
     * covered when ETIM ships its own items. Vitally: only FISH carries the
     * essential-fats flag in R196; all other cooked meats do not.</p>
     */
    @Nullable
    public static FoodValue getFoodValue(ItemStack stack) {
        Item item = stack.getItem();
        String suffix = item == Items.FISH || item == Items.COOKED_FISH
                ? Integer.toString(MathHelper.clamp(stack.getItemDamage(), 0, 3))
                : "0";
        return REGISTERED_FOODS.get(item.getRegistryName() + "@" + suffix);
    }

    private static final Map<String, FoodValue> REGISTERED_FOODS = new HashMap<String, FoodValue>();

    static {
        add("apple", 1, 1000, false, false, true);
        add("golden_apple", 1, 1000, false, false, true);
        add("enchanted_golden_apple", 1, 1000, false, false, true);
        add("bread", 2, 0, false, false, false);
        add("sugar", 0, 1000, false, false, false);
        add("cookie", 1, 250, false, false, false);
        add("melon", 1, 1000, false, false, true);
        add("carrot", 2, 0, false, false, true);
        add("potato", 1, 0, false, false, false);
        add("baked_potato", 2, 0, false, false, false);
        add("poisonous_potato", 0, 0, false, false, false);
        add("golden_carrot", 2, 0, false, false, true);
        add("pumpkin_pie", 6, 1000, true, false, true);
        add("porkchop", 4, 0, true, false, false);
        add("cooked_porkchop", 8, 0, true, false, false);
        add("beef", 5, 0, true, false, false);
        add("cooked_beef", 10, 0, true, false, false);
        add("chicken", 3, 0, true, false, false);
        add("cooked_chicken", 6, 0, true, false, false);
        add("rotten_flesh", 1, 0, true, false, false);
        add("spider_eye", 1, 0, true, false, false);
        add("mushroom_stew", 4, 0, false, false, false);
        add("milk_bucket", 4, 0, true, false, false);
        addFish(0, 3, true, true);   // cod raw  (MITE fishRaw)
        addFish(1, 5, true, true);   // salmon raw (MITE fishLargeRaw)
        addCookedFish(0, 6, true, true);   // cod cooked (MITE fishCooked)
        addCookedFish(1, 10, true, true);  // salmon cooked (MITE fishLargeCooked)
        // fish meta 2 (clownfish) / 3 (pufferfish): no MITE counterpart → unregistered
    }

    private static void add(String item, int nutrition, int sugarContent, boolean protein, boolean fats, boolean phyto) {
        REGISTERED_FOODS.put(new ResourceLocation("minecraft", item).toString() + "@0",
                new FoodValue(nutrition, sugarContent, protein, fats, phyto));
    }

    private static void addFish(int meta, int nutrition, boolean protein, boolean fats) {
        REGISTERED_FOODS.put(new ResourceLocation("minecraft", "fish").toString() + "@" + meta,
                new FoodValue(nutrition, 0, protein, fats, false));
    }

    private static void addCookedFish(int meta, int nutrition, boolean protein, boolean fats) {
        REGISTERED_FOODS.put(new ResourceLocation("minecraft", "cooked_fish").toString() + "@" + meta,
                new FoodValue(nutrition, 0, protein, fats, false));
    }

    /** Per-food nutrient trajectory (nutrition, sugar and the three pool flags). */
    public static final class FoodValue {
        public final int nutrition;
        public final int sugarContent;
        public final boolean protein;
        public final boolean fats;
        public final boolean phyto;

        FoodValue(int nutrition, int sugarContent, boolean protein, boolean fats, boolean phyto) {
            this.nutrition = nutrition;
            this.sugarContent = sugarContent;
            this.protein = protein;
            this.fats = fats;
            this.phyto = phyto;
        }
    }

    private NutritionSystem() {
    }
}
