package io.github.etim.etim.hunger;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.nutrition.NutritionSystem;
import io.github.etim.etim.playerstate.FoodDebugNetwork;
import io.github.etim.etim.playerstate.PlayerStatLimits;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.init.MobEffects;
import net.minecraft.nbt.NBTBase;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.DamageSource;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.ResourceLocation;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.util.text.TextComponentTranslation;
import net.minecraft.world.World;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.CapabilityInject;
import net.minecraftforge.common.capabilities.CapabilityManager;
import net.minecraftforge.common.capabilities.ICapabilitySerializable;

import javax.annotation.Nullable;

/**
 * R196 FoodStats dual-pool model (task 1.5), decompiled-source port
 * ({@code mite-src\decompile\src\net\minecraft\FoodStats.java} verbatim,
 * per the audit {@code R196 饥饿链终审.md} A1-A9) replacing the vanilla
 * hunger/saturation bridge of task 2.3:
 *
 * <ul>
 *   <li>Two pools — <b>satiation</b> and <b>nutrition</b> (0..limit each,
 *       limit {@code = max(min(6 + level/5*2, 20), 6)} = task-1.2 cap
 *       constants). Both start FULL every life / first join
 *       (FoodStats.java:15,190-196).</li>
 *   <li>The hunger pool accrues 0.002/tick × the wetness/malnourishment
 *       multiplier (:40-44); every full 4.0 unit eats one point — satiation
 *       first, unless the nutrition-only accumulator (0.002×0.25 per tick)
 *       has itself reached 4.0, in which case the point comes from nutrition
 *       and the accumulator resets (:46-56).</li>
 *   <li>{@code isStarving} = nutrition == 0 (EntityPlayer.java:1924) —
 *       satiation does NOT hold off starve; the starve damage gate is the
 *       R196 one (health &gt; 10 ∥ difficulty ≥ 3 ∥ health &gt; 1 && diff ≥ 2,
 *       :62-74), 0.002 progress per tick.</li>
 *   <li>The heal progress formula (:75-89) owns natural regen for the food
 *       model: {@code (4.0E-4 + nutrition×2.0E-5) × malnourished(0.25) ×
 *       inBed(4) }, pays 1.0 back into the hunger pool per healed HP.</li>
 *   <li>Eating ({@link #applyFoodValue}) is {@code FoodStats.addFoodValue}
 *       (:18-25): satiation with the sugar discount
 *       (Item.java:1482-1488), nutrition, and the 1.4 nutrient/insulin side
 *       effects.</li>
 *   <li>{@link #canIngest} is the five-arg gate (EntityPlayer.java:1954-1994;
 *       the always-edible path and the curse layer are portal-safe — ETIM has
 *       no curses).</li>
 * </ul>
 *
 * <p>Storage is a Forge capability ({@code etim:food}) following the 1.4
 * pattern; the vanilla FoodStats lives on ONLY as the client display mirror:
 * every tick this class writes the NUTRITION pool into it (the
 * "write-through" — the bar's icon capacity equals the per-pool limit, and
 * nutrition is the starving driver; the sum cannot be represented on that
 * bar), so the vanilla bar sync (SPacketUpdateHealth) keeps the HUD and the
 * client-side sprint gate honest; the client hasFoodEnergy also trusts the
 * satiation mirror of FoodDebugNetwork. Vanilla heal/starve branches
 * are suppressed by {@code MixinFoodStats}, and the exhaustion drain is
 * preempted by the same write-through.</p>
 *
 * <p>Note (approximation inbed): R196 charges 0.002×20 per tick while its
 * "onHitList" tracks bed-hit behavior; ETIM charges
 * {@code ETIMConfig.inBedHitListHunger} once per damage event while lying in
 * a bed ({@code ETIMFoodStatsEvents}) — same spirit, simpler trigger.</p>
 */
public final class ETIMFoodStats {

    /** Storage key of the capability on the player entity. */
    public static final ResourceLocation FOOD_CAPABILITY_KEY =
            new ResourceLocation(Tags.MOD_ID, "food");

    @CapabilityInject(IFoodState.class)
    public static Capability<IFoodState> CAPABILITY_FOOD = null;

    /** Registers the capability storage (call from mod preInit, once). */
    public static void register() {
        CapabilityManager.INSTANCE.register(IFoodState.class, new Capability.IStorage<IFoodState>() {
            @Override
            public NBTBase writeNBT(Capability<IFoodState> capability, IFoodState instance, EnumFacing side) {
                NBTTagCompound tag = new NBTTagCompound();
                tag.setInteger("satiation", instance.getSatiation());
                tag.setInteger("nutrition", instance.getNutrition());
                tag.setFloat("hungerPool", instance.getHungerPool());
                tag.setFloat("nutritionOnlyPool", instance.getNutritionOnlyPool());
                tag.setFloat("healProgress", instance.getHealProgress());
                tag.setFloat("starveProgress", instance.getStarveProgress());
                return tag;
            }

            @Override
            public void readNBT(Capability<IFoodState> capability, IFoodState instance, EnumFacing side, NBTBase nbt) {
                NBTTagCompound tag = (NBTTagCompound) nbt;
                instance.setSatiation(tag.getInteger("satiation"));
                instance.setNutrition(tag.getInteger("nutrition"));
                instance.setHungerPool(tag.getFloat("hungerPool"));
                instance.setNutritionOnlyPool(tag.getFloat("nutritionOnlyPool"));
                instance.setHealProgress(tag.getFloat("healProgress"));
                instance.setStarveProgress(tag.getFloat("starveProgress"));
            }
        }, FoodState::new);
    }

    public static final class Provider implements ICapabilitySerializable<NBTTagCompound> {
        private final FoodState state = new FoodState();

        @Override
        public boolean hasCapability(Capability<?> capability, EnumFacing facing) {
            return capability == CAPABILITY_FOOD;
        }

        @SuppressWarnings("unchecked")
        @Override
        public <T> T getCapability(Capability<T> capability, EnumFacing facing) {
            return capability == CAPABILITY_FOOD ? (T) state : null;
        }

        @Override
        public NBTTagCompound serializeNBT() {
            NBTTagCompound tag = new NBTTagCompound();
            tag.setInteger("satiation", state.satiation);
            tag.setInteger("nutrition", state.nutrition);
            tag.setFloat("hungerPool", state.hungerPool);
            tag.setFloat("nutritionOnlyPool", state.nutritionOnlyPool);
            tag.setFloat("healProgress", state.healProgress);
            tag.setFloat("starveProgress", state.starveProgress);
            return tag;
        }

        @Override
        public void deserializeNBT(NBTTagCompound tag) {
            state.satiation = tag.getInteger("satiation");
            state.nutrition = tag.getInteger("nutrition");
            state.hungerPool = tag.getFloat("hungerPool");
            state.nutritionOnlyPool = tag.getFloat("nutritionOnlyPool");
            state.healProgress = tag.getFloat("healProgress");
            state.starveProgress = tag.getFloat("starveProgress");
        }
    }

    /** Per-player dual-pool state; capability target interface. */
    public interface IFoodState {
        int getSatiation();
        void setSatiation(int value);
        int getNutrition();
        void setNutrition(int value);
        float getHungerPool();
        void setHungerPool(float value);
        float getNutritionOnlyPool();
        void setNutritionOnlyPool(float value);
        float getHealProgress();
        void setHealProgress(float value);
        float getStarveProgress();
        void setStarveProgress(float value);
    }

    /** Default implementation (raw setters; clamping happens in the helpers). */
    public static class FoodState implements IFoodState {
        // Defaults assume a fresh level-0 life; PlayerInitialStats re-fills at
        // the actual level on first join and every respawn (R196 ctor :15).
        private int satiation = ETIMConfig.capAtLevel0;
        private int nutrition = ETIMConfig.capAtLevel0;
        private float hungerPool = 0.0F;
        private float nutritionOnlyPool = 0.0F;
        private float healProgress = 0.0F;
        private float starveProgress = 0.0F;

        @Override public int getSatiation() { return satiation; }
        @Override public void setSatiation(int value) { satiation = Math.max(0, value); }
        @Override public int getNutrition() { return nutrition; }
        @Override public void setNutrition(int value) { nutrition = Math.max(0, value); }
        @Override public float getHungerPool() { return hungerPool; }
        @Override public void setHungerPool(float value) { hungerPool = value; }
        @Override public float getNutritionOnlyPool() { return nutritionOnlyPool; }
        @Override public void setNutritionOnlyPool(float value) { nutritionOnlyPool = value; }
        @Override public float getHealProgress() { return healProgress; }
        @Override public void setHealProgress(float value) { healProgress = value; }
        @Override public float getStarveProgress() { return starveProgress; }
        @Override public void setStarveProgress(float value) { starveProgress = value; }
    }

    @Nullable
    public static IFoodState get(EntityPlayer player) {
        return player.getCapability(CAPABILITY_FOOD, null);
    }

    /**
     * The per-pool limit (R196 {@code FoodStats.getNutritionLimit}
     * FoodStats.java:194-196) — same constants as the task-1.2 cap table
     * ({@code PlayerStatLimits}), so the helper is shared.
     */
    public static int getLimit(EntityPlayer player) {
        return PlayerStatLimits.getHealthFoodCap(player.experienceLevel);
    }

    /** R196 ctor/start-of-life state (FoodStats.java:13-16): both pools full. */
    public static void initFull(EntityPlayer player) {
        IFoodState state = get(player);
        if (state == null) {
            return;
        }
        int limit = getLimit(player);
        state.setSatiation(limit);
        state.setNutrition(limit);
        state.setHungerPool(0.0F);
        state.setNutritionOnlyPool(0.0F);
        state.setHealProgress(0.0F);
        state.setStarveProgress(0.0F);
        syncVanillaFoodLevel(player);
        pushMirror(player);
    }

    /**
     * R196 {@code hasFoodEnergy()} = satiation + nutrition != 0
     * (EntityPlayer.java:1928-1930). On the client the pools are not shared —
     * the vanilla mirror (fed by the write-through) is the bridge since the
     * mapping is exact ({@code > 0 ⇔ sum > 0} under the clamp too).
     */
    public static boolean hasFoodEnergy(EntityPlayer player) {
        if (player.world.isRemote) {
            // Client: the vanilla mirror carries only nutrition (the bar);
            // satiation arrives on the FoodDebugNetwork display channel.
            return player.getFoodStats().getFoodLevel() > 0
                    || io.github.etim.etim.playerstate.FoodDebugNetwork.satiation > 0;
        }
        IFoodState state = get(player);
        return state != null && state.getSatiation() + state.getNutrition() != 0;
    }

    /** R196 {@code isStarving()} = nutrition == 0 (EntityPlayer.java:1924-1926). */
    public static boolean isStarving(EntityPlayer player) {
        if (player.world.isRemote) {
            // client cannot know the split — the bar only shows the sum;
            // server-authoritative calls are the ones that matter.
            return false;
        }
        IFoodState state = get(player);
        return state != null && state.getNutrition() == 0;
    }

    /** R196 {@code isHungry()} = satiation == 0 (EntityPlayer.java:1920-1922). */
    public static boolean isHungry(EntityPlayer player) {
        IFoodState state = get(player);
        return state != null && state.getSatiation() == 0;
    }

    /**
     * R196 {@code FoodStats.addFoodValue} (FoodStats.java:18-25): satiation
     * with the sugar discount, nutrition, then the 1.4 nutrient pools +
     * insulin response side effects.
     */
    public static void applyFoodValue(EntityPlayer player, NutritionSystem.FoodValue value, String source) {
        IFoodState state = get(player);
        if (state == null) {
            return;
        }
        int limit = getLimit(player);
        int satiation = effectiveSatiation(player, value);
        if (satiation > 0) {
            state.setSatiation(Math.min(state.getSatiation() + satiation, limit));
        }
        if (value.nutrition > 0) {
            state.setNutrition(Math.min(state.getNutrition() + value.nutrition, limit));
        }
        NutritionSystem.applyFoodValue(player, value);
        syncVanillaFoodLevel(player);
        // Push the display mirror NOW: the canIngest client prediction reads
        // it, and a 20-tick-periodic refresh leaves the client accepting
        // pools-stale clicks right after an actual change (the cake ghost
        // slice window found in task 2.4 testing).
        pushMirror(player);
        logFood(player, "eat " + source + " satiationGain=" + satiation + " nutritionGain=" + value.nutrition
                + " sugar=" + value.sugarContent + " (pools " + state.getSatiation() + "/" + limit
                + " " + state.getNutrition() + "/" + limit + " hungerPool=" + state.getHungerPool() + ")");
    }

    /** Immediate mirror refresh for the client-side canIngest prediction (push-on-change). */
    private static void pushMirror(EntityPlayer player) {
        if (player instanceof EntityPlayerMP) {
            FoodDebugNetwork.sync((EntityPlayerMP) player);
        }
    }

    private static void logFood(EntityPlayer player, String line) {
        if (ETIMConfig.foodDebugLog) {
            ETIM.LOGGER.info("[FoodLog] {} ({}) {}", player.getName(), player.getEntityId(), line);
        }
    }

    /** Event-side log entry (same channel). */
    public static void logFoodEntry(EntityPlayer player, String line) {
        logFood(player, line);
    }

    /**
     * R196 {@code Item.getSatiation(player)} (Item.java:1482-1488): sugary
     * food gives discounted satiation while the player cannot metabolize
     * sugars (insulin level above mild).
     */
    public static int effectiveSatiation(EntityPlayer player, NutritionSystem.FoodValue value) {
        if (NutritionSystem.canMetabolizeFoodSugars(player) || value.sugarContent <= 0) {
            return value.satiation;
        }
        return value.sugarContent < 1000 ? value.satiation - 1 : value.satiation - value.sugarContent / 1000;
    }

    /**
     * The full per-tick loop, a verbatim port of R196
     * {@code FoodStats.onUpdate} (FoodStats.java:35-92). Server only,
     * non-creative (R196 gates the pools at {@code addHunger}; the nutrient
     * drain in {@code NutritionSystem.tick} has its own creative guard).
     */
    public static void tick(EntityPlayer player) {
        if (player.world.isRemote || player.capabilities.isCreativeMode) {
            return;
        }
        IFoodState state = get(player);
        if (state == null) {
            return;
        }
        int limit = getLimit(player);

        // Hunger accrual (:40-44) + per-unit consumption rhythm (:46-56)
        float gain = ETIMConfig.effectiveHungerGainPerTick();
        float gainTick = gain * getHungerMultiplier(player);
        float hunger = state.getHungerPool();
        hunger = Math.min(hunger + gainTick, ETIMConfig.hungerPoolCap);
        state.setHungerPool(hunger);
        state.setNutritionOnlyPool(state.getNutritionOnlyPool() + gain * ETIMConfig.hungerNutritionOnlyFactor);

        if (state.getHungerPool() >= ETIMConfig.hungerPerFoodUnit) {
            state.setHungerPool(state.getHungerPool() - ETIMConfig.hungerPerFoodUnit);
            if (state.getSatiation() > 0 || state.getNutrition() > 0) {
                if (state.getSatiation() >= 1
                        && (!(state.getNutritionOnlyPool() + 0.001F >= ETIMConfig.hungerPerFoodUnit)
                            || state.getNutrition() <= 0)) {
                    state.setSatiation(state.getSatiation() - 1);
                    logFood(player, "consumed satiation point (nutritionOnlyPool="
                            + state.getNutritionOnlyPool() + ", pools " + state.getSatiation() + "/"
                            + limit + " " + state.getNutrition() + "/" + limit + ") hungerPool="
                            + state.getHungerPool());
                } else {
                    state.setNutrition(state.getNutrition() - 1);
                    state.setNutritionOnlyPool(0.0F);
                    logFood(player, "consumed nutrition point (pools " + state.getSatiation() + "/"
                            + limit + " " + state.getNutrition() + "/" + limit + ") hungerPool="
                            + state.getHungerPool());
                }
                pushMirror(player);
            }
        }

        // Beds hit while lying in them charge hunger (R196 :58-60; the
        // charge arrives via ETIMFoodStatsEvents' damage hook).
        // keepHealthBranches below.

        state.setSatiation(Math.min(state.getSatiation(), limit));
        state.setNutrition(Math.min(state.getNutrition(), limit));

        // Starve / heal branches (:62-89)
        if (state.getNutrition() == 0) {
            state.setHealProgress(0.0F);
            state.setStarveProgress(state.getStarveProgress() + ETIMConfig.effectiveStarveGainPerTick());
            if (state.getStarveProgress() >= 1.0F) {
                int difficulty = player.world.getDifficulty().getId();
                if (player.getHealth() > ETIMConfig.starveHealthCeiling
                        || difficulty >= 3
                        || player.getHealth() > 1.0F && difficulty >= 2) {
                    player.attackEntityFrom(DamageSource.STARVE, 1.0F);
                    logFood(player, "STARVE strike 1.0 (health=" + player.getHealth()
                            + " difficulty=" + difficulty + ")");
                }
                state.setStarveProgress(state.getStarveProgress() - 1.0F);
                state.setNutritionOnlyPool(0.0F);
            }
        } else {
            state.setStarveProgress(0.0F);
            float healProgress = state.getHealProgress()
                    + (ETIMConfig.healBasePerTick + state.getNutrition() * ETIMConfig.healPerNutritionPerTick)
                        * (NutritionSystem.isMalnourished(player) ? ETIMConfig.malnourishedRegenFactor : 1.0F)
                        * (player.isPlayerSleeping() ? ETIMConfig.bedRegenFactor : 1.0F);
            if (!player.world.getGameRules().getBoolean("naturalRegeneration") || !player.shouldHeal()) {
                healProgress = 0.0F;
            } else if (healProgress >= 1.0F) {
                player.heal(1.0F);
                state.setHungerPool(Math.min(state.getHungerPool() + 1.0F, ETIMConfig.hungerPoolCap));
                healProgress -= 1.0F;
                logFood(player, "healed 1.0 via regen (health=" + player.getHealth()
                        + " nutrition=" + state.getNutrition() + " hungerPool+=" + 1.0 + ")");
            }
            state.setHealProgress(healProgress);
        }

        syncVanillaFoodLevel(player);
    }

    /**
     * R196 {@code ServerPlayer.getWetnessAndMalnourishmentHungerMultiplier}
     * (ServerPlayer.java:1826-1847): wetness from rain/immersion with the
     * light-rain+shallow-immerse combo, cold doubles it, hot biomes wash it
     * away, malnourishment adds, night adds nothing.
     */
    public static float getHungerMultiplier(EntityPlayer player) {
        World world = player.world;
        BlockPos foot = new BlockPos(player.posX, MathHelper.floor(player.posY), player.posZ);
        BlockPos showers = world.isRainingAt(foot.up()) ? foot.up() : null;
        float rainFactor = showers != null
                ? (world.isThundering() ? ETIMConfig.wetnessRainThunder : ETIMConfig.wetnessRainLight)
                : 0.0F;
        float immersionFactor = world.getBlockState(foot.up()).getMaterial() == net.minecraft.block.material.Material.WATER
                ? ETIMConfig.wetnessImmerseAbove
                : (world.getBlockState(foot).getMaterial() == net.minecraft.block.material.Material.WATER
                    ? ETIMConfig.wetnessImmerseBelow
                    : 0.0F);
        float wetnessFactor = Math.max(rainFactor, immersionFactor);
        if (showers != null && !world.isThundering() && immersionFactor == ETIMConfig.wetnessImmerseBelow) {
            wetnessFactor += ETIMConfig.wetnessCombo;
        }
        float temperature = world.getBiome(foot).getTemperature(foot);
        if (temperature <= ETIMConfig.wetnessFreezingTemperature) {
            wetnessFactor *= ETIMConfig.wetnessFreezingMultiplier;
        } else if (temperature >= ETIMConfig.wetnessHotExemptTemperature) {
            wetnessFactor = 0.0F;
        }
        float malnourishmentFactor = NutritionSystem.isMalnourished(player)
                ? ETIMConfig.malnourishedHungerFactor : 0.0F;
        return 1.0F + wetnessFactor + malnourishmentFactor;
    }

    /**
     * R196 five-arg {@code canIngest} (EntityPlayer.java:1954-1994), server
     * variant; the per-item constants come from the 1.4 food registry. The
     * curse layer is not ported (ETIM has no curses); always-edible items are
     * exempt in the caller ({@code MixinItemFood}), same as R196's
     * {@code canIngest(item, subtype)} two-arg path.
     *
     * <p>Task 2.4 also ports the two-arg chain's outermost layers here:
     * {@link NutritionSystem.FoodValue#eatable} {@code == false} reproduces
     * the {@code isIngestable(item, subtype) == false} refusal (R196
     * ItemSeedFood — carrot/potato: values in the domain, no eating path), and
     * the unregistered {@code null} stays rule (a), the all-zero freely
     * ingested case.</p>
     */
    public static boolean canIngest(EntityPlayer player, @Nullable NutritionSystem.FoodValue value) {
        if (!canEatAndDrink(player)) {
            return false;
        }
        // isIngestable(item, subtype) layer (EntityPlayer.java:1940-1952 chain)
        if (value != null && !value.eatable) {
            return false;
        }
        if (value == null) {
            // Not in the registry: contributes nothing — R196 rule (a) treats
            // the all-zero five-arg as freely ingested.
            return true;
        }
        if (value.satiation == 0 && value.nutrition == 0 && value.sugarContent == 0) {
            return true;
        }
        NutritionSystem.INutrition pools = NutritionSystem.get(player);
        IFoodState state = get(player);
        if (state == null) {
            return true;
        }
        if (pools != null) {
            if (pools.getProtein() < 1 && value.protein) {
                return true;
            }
            if (pools.getPhytonutrients() < 1 && value.phyto) {
                return true;
            }
        }
        // Pool reads are side-aware: the client has no synced capability copy —
        // it uses the mirrors instead (satiation via the FoodDebugNetwork
        // channel refreshed every 20 ticks; nutrition via the write-through
        // vanilla bar, SPacketUpdateHealth-synced on change). The server keeps
        // reading its own state: still fully authoritative.
        boolean remote = player.world.isRemote;
        int satiation = remote
                ? io.github.etim.etim.playerstate.FoodDebugNetwork.satiation
                : state.getSatiation();
        int nutrition = remote
                ? player.getFoodStats().getFoodLevel()
                : state.getNutrition();
        int limit = getLimit(player);
        if (satiation < limit) {
            if (value.satiation > 0) {
                return true;
            }
            if (nutrition >= limit) {
                return false;
            }
        } else if (value.satiation > 0 && nutrition > 0) {
            return false;
        }
        return value.nutrition > 0 && nutrition < limit;
    }

    /** R196 {@code canEatAndDrink} (EntityPlayer.java:1890-1892). */
    public static boolean canEatAndDrink(EntityPlayer player) {
        if (player.isInsideOfMaterial(net.minecraft.block.material.Material.WATER) && !player.canBreatheUnderwater()) {
            return false;
        }
        return !player.isPotionActive(MobEffects.NAUSEA);
    }

    /** R196 bed wake gate (EntityPlayer.java:421-429): starved sleepers eject,
     *  and a starving player cannot ENTER a bed at all (the tooHungry refusal). */
    public static void tickBedGate(EntityPlayer player) {
        if (!ETIMConfig.hungerSleepDeny || player.world.isRemote || !player.isPlayerSleeping()) {
            return;
        }
        if (isStarving(player)) {
            player.sendStatusMessage(new TextComponentTranslation("tile.bed.wakeHungry"), true);
            logFood(player, "wakeHungry (nutrition 0 while lying in bed)");
            player.wakeUpPlayer(true, true, false);
        }
    }

    /** R196 :58-60 spirit per damage event — see class javadoc note. */
    public static void chargeBedHit(EntityPlayer player) {
        if (player.world.isRemote || player.capabilities.isCreativeMode) {
            return;
        }
        IFoodState state = get(player);
        if (state != null) {
            state.setHungerPool(Math.min(state.getHungerPool() + ETIMConfig.inBedHitListHunger, ETIMConfig.hungerPoolCap));
        }
    }

    /**
     * Write-through of the dual pools into the vanilla bar. The bar shows
     * the NUTRITION pool: its capacity (0..limit) matches the level-scaled
     * icon slots exactly (task-1.2 HUD: limit/2 shanks), and nutrition is
     * the pool the starving gate reads — the bar dropping means real
     * starvation. Satiation (the burn-first buffer) is visible on the
     * debug HUD's pool row instead.
     *
     * <p>The vanilla EntityPlayerMP change-detector then syncs the client
     * bar (and the client gate bridge) through SPacketUpdateHealth by
     * itself. HasFoodEnergy on the client additionally trusts the
     * satiation mirror of FoodDebugNetwork, so an emptied-bar player still
     * sprints while satiation lasts.</p>
     */
    public static void syncVanillaFoodLevel(EntityPlayer player) {
        IFoodState state = get(player);
        if (state == null || player.world.isRemote) {
            return;
        }
        player.getFoodStats().setFoodLevel(MathHelper.clamp(state.getNutrition(), 0, 20));
    }

    private ETIMFoodStats() {
    }
}
