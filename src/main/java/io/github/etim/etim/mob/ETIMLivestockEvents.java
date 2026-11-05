package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMFarm;
import io.github.etim.etim.farm.ETIMItemManure;
import net.minecraft.block.BlockCauldron;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.AxisAlignedBB;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.World;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.living.LivingEvent;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.List;
import java.util.WeakHashMap;

/**
 * Stage 5 slice 2 v1 (audit 11 §2.2, A-grade): the 100-tick wellness update
 * of the R196 {@code EntityLivestock} base class, transcribed onto the
 * vanilla livestock family (cow / sheep / pig / chicken) through the
 * {@code etim:livestock} NBT capability.
 *
 * <p>Verbatim R196 rules (EntityLivestock.java):</p>
 * <ul>
 *   <li>{@code onLivingUpdate :245-251} — every 100 ticks, gated by a
 *       9-in-10 random roll: {@code updateWellness()} runs, then (later
 *       slice) the production counter gates on wellness; the wellness
 *       pass itself runs at the 9/10 gate.</li>
 *   <li>{@code updateWellness :215-239} — benefit {@code +0.1}, penalty
 *       {@code -0.005}; food from nearby grass blocks (the cow also rolls a
 *       1% destruction of a found grass block, eaten, no drops); water from
 *       a nearby open water/snow source or the rain fallback
 *       {@code +0.1/10}; freedom when not crowded.</li>
 *   <li>{@code isNearFood :162-180} — the 3 x (−1..floor(height)) x 3 cell
 *       scan around the feet for grass / tall grass.</li>
 *   <li>{@code isNearWaterSource :182-200} — the same scan shape; water
 *       still/flowing, both snow forms, or a cauldron with water above
 *       level 0 whose top sits below the eye line, and NOT covered by a
 *       block with a flat solid bottom face.</li>
 *   <li>{@code isCrowded :202-213} — NOT outdoors, or more than 2 entities
 *       (self included) inside the box grown by (2, 0.5, 2).</li>
 * </ul>
 *
 * <p>B-10 (条 300, production slice v2) adds the production family: the
 * 100-tick counter arm and the {@code produceGoods} dispatch (milk meter /
 * chicken feather + egg gates / sheep+pig reset — see {@link #produceGoods}),
 * the chicken meter init, the milking face {@link #milkClick} (the vanilla
 * infinite-milk path must be cancelled by the caller when on), the /etest
 * {@code prod} force port and the production columns on the value-trace row.
 * The wellness rule set above is untouched (the counter arm rides the SAME
 * 9/10-gated pass — R196 :245-248 short-circuit order).</p>
 *
 * <p>v1 left un-carried (queued v2 and still queued here): the manure
 * countdown (answered by B-7 face M1-1), Block.onTrampledBy and the
 * startle/memory fields, and the client data-watcher mirror (no consumer
 * for it until a client face exists). The v1 judgment surface remains the
 * [AILog] state-flip lines; B-10 adds the [AILog] production rows.</p>
 */
public final class ETIMLivestockEvents {

    /** auth R196 :216-217 — the wellness benefit/penalty pair. */
    private static final float BENEFIT = 0.1F;
    private static final float PENALTY = -0.005F;
    /** R196 :218 — the cow's grass-eating destruction chance. */
    private static final float COW_DESTROY_CHANCE = 0.01F;
    /** R196 :136-138 — isDesperateForFood = food &lt; 0.05F. */
    private static final float DESPERATE_FOOD_GATE = 0.05F;

    /**
     * [AILog] dedup: one line per (entity, welfare-glyph) state flip — the
     * 100-tick cadence would otherwise emit a steady hum for every penned
     * animal. Server-only events, so the dual-end lesson needs no key work.
     */
    private static final WeakHashMap<EntityLivingBase, String> LAST = new WeakHashMap<>();

    /** Registers the attach + tick handlers (call from mod preInit, once). */
    public static void register() {
        MinecraftForge.EVENT_BUS.register(ETIMLivestockEvents.class);
    }

    @SubscribeEvent
    public static void onAttachCapabilities(AttachCapabilitiesEvent<Entity> event) {
        Entity e = event.getObject();
        if (e instanceof EntityCow || e instanceof EntitySheep
                || e instanceof EntityPig || e instanceof EntityChicken) {
            event.addCapability(ETIMLivestock.CAPABILITY_KEY, new ETIMLivestock.Provider());
        }
    }

    @SubscribeEvent
    public static void onLivingUpdate(LivingEvent.LivingUpdateEvent event) {
        if (event.getEntityLiving().world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return;
        }
        EntityLivingBase e = event.getEntityLiving();
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return;
        }
        if (!s.isInitialized()) {
            // R196 ctor :26-28 — 0.8 + rand * 0.2 per need, at construction
            java.util.Random rand = e.getRNG();
            s.setFood(0.8F + rand.nextFloat() * 0.2F);
            s.setWater(0.8F + rand.nextFloat() * 0.2F);
            s.setFreedom(0.8F + rand.nextFloat() * 0.2F);
            // R196 :29/:380 — the initial countdown is a full-period random
            // (setManurePeriod re-randomizes); B-7 faces it once with the
            // FINAL per-species period instead of the R196 double random.
            s.setManureCountdown(rand.nextInt(manurePeriod(e)));
            // B-10 production meters — R196 ctors: EntityCow.setMilk(100)
            // (:18); EntityChicken max 1..2 with the 1/2 trim (:25-28) and
            // num = max (:30) — .ItemBucket standard_volume 4 × 25 = the
            // full-meter milking threshold (ItemVessel.java:105).
            if (e instanceof EntityCow) {
                s.setMilk(100);
            }
            if (e instanceof EntityChicken) {
                int max = rand.nextInt(2) + 1;
                if (max > 1 && rand.nextInt(2) == 0) {
                    max--;
                }
                s.setMaxNumFeathers(max);
                s.setNumFeathers(max);
            }
            s.setInitialized(true);
        }
        if (e.ticksExisted % 100 == 0) {
            // R196 :245-248 verbatim short-circuit — updateWellness runs ONLY
            // when the 9/10 roll passes; the production counter rises only
            // when the wellness pass ENDED well on an adult (:238/:246).
            boolean wellAfterPass = false;
            if (e.getRNG().nextInt(10) > 0) {
                wellAfterPass = updateWellness(e, s, e instanceof EntityCow);
            }
            if (ETIMConfig.livestockProductionR196) {
                boolean child = e instanceof EntityAgeable && ((EntityAgeable) e).isChild();
                if (wellAfterPass && !child) {
                    s.setProductionCounter(s.getProductionCounter() + 1);
                }
                produceGoods(e, s); // R196 :250 — unconditional per 100-tick pass
            }
        }
        // B-7 face M1-1 — R196 EntityLivestock.onLivingUpdate :253-257, run PER
        // TICK: the decrement is short-circuited behind the two gates, so a
        // child or desperate (food < 0.05F) animal FREEZES its countdown.
        tickManureCountdown(e, s);
        // value trace (run27 C3/C4/C5 判据面): one full-readout row per
        // ~60 s of entity age, gated per entity — the glyph-flip dedup hides
        // the absolute values between flips, and C4 needs rain-vs-dry
        // trajectories (the C4B window read zero rows because nothing flipped)
        if (e.ticksExisted % 1200 == 0 && ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] livestock-value food=" + String.format("%.2f", s.getFood())
                    + String.format(" water=%.2f", s.getWater())
                    + String.format(" freedom=%.2f", s.getFreedom())
                    + " counter=" + s.getProductionCounter()
                    + " milk=" + s.getMilk()
                    + " feathers=" + s.getNumFeathers() + "/" + s.getMaxNumFeathers()
                    + " age=" + e.ticksExisted
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
        }
    }

    private static final java.util.Map<EntityLivingBase, Long> RAIN_TRACE =
            new java.util.WeakHashMap<EntityLivingBase, Long>();

    /**
     * B-7 face M1-1/2 — R196 :253-257 verbatim: gates, one drop, then the
     * {@code period/2 + rand.nextInt(period)} re-roll. The drop rides R196
     * {@code dropItem(Item.manure.itemID, 1)} — 1.12 =
     * {@code entityDropItem(new ItemStack(manure), 0)} (the ground-scatter
     * freeze is face M1-4, in {@code MixinEntityItem}).
     */
    private static void tickManureCountdown(EntityLivingBase e, ETIMLivestock.IState s) {
        if (e instanceof EntityAgeable && ((EntityAgeable) e).isChild()) {
            return; // !isChild gate — R196 :253
        }
        if (s.getFood() < DESPERATE_FOOD_GATE) {
            return; // isDesperateForFood gate — R196 :254 short-circuit = frozen countdown
        }
        int countdown = s.getManureCountdown() - 1; // R196 :254 --countdown
        if (countdown > 0) {
            s.setManureCountdown(countdown);
            return;
        }
        int period = manurePeriod(e);
        int next = period / 2 + e.getRNG().nextInt(period); // R196 :256
        s.setManureCountdown(next);
        e.entityDropItem(new net.minecraft.item.ItemStack(ETIMItemManure.item(), 1), 0.0F);
        io.github.etim.etim.farm.ETIMFarm.row("manure src=livestock kind=" + kind(e)
                + " drop=1 period=" + period + " countdown=" + next
                + " pos=" + MathHelper.floor(e.posX) + "," + MathHelper.floor(e.posY) + "," + MathHelper.floor(e.posZ));
    }

    /**
     * B-7 face M1-2 — the per-species period table: cow = the base 24000
     * (EntityLivestock.java:29; EntityCow carries no override), pig ×2
     * (EntityPig.java:30), sheep ×2 (EntitySheep.java:45), chicken ×8×2 =
     * 384000 (EntityChicken.java:24). Configurable per rule 2; test cells
     * override the countdown instead of the period.
     */
    private static int manurePeriod(EntityLivingBase e) {
        if (e instanceof EntityChicken) {
            return ETIMConfig.livestockManurePeriodChicken;
        }
        if (e instanceof EntityPig) {
            return ETIMConfig.livestockManurePeriodPig;
        }
        if (e instanceof EntitySheep) {
            return ETIMConfig.livestockManurePeriodSheep;
        }
        return ETIMConfig.livestockManurePeriodCow;
    }

    private static String kind(EntityLivingBase e) {
        if (e instanceof EntityCow) {
            return "cow";
        }
        if (e instanceof EntitySheep) {
            return "sheep";
        }
        if (e instanceof EntityPig) {
            return "pig";
        }
        if (e instanceof EntityChicken) {
            return "chicken";
        }
        return "?";
    }

    /** /etest livemano — the D-1 乙 force port: countdowns to 0 (optional food preset), next tick drops. */
    public static String forceManureZero(EntityLivingBase e, Float foodSet) {
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return null;
        }
        if (foodSet != null) {
            s.setFood(foodSet);
        }
        s.setManureCountdown(0);
        return kind(e) + "#" + e.getEntityId();
    }

    /** R196 updateWellness :215-239 — the benefit/penalty pass; returns this pass's isWell (:238). */
    private static boolean updateWellness(EntityLivingBase e, ETIMLivestock.IState s, boolean cow) {
        World w = e.world;
        // C4-d instrument (run27 2026-10-13): one row per entity per ~2 s on
        // each updateWellness pass — names the verdict inputs directly
        // (nearWater / rainingAt per-block / global isRaining) so the
        // roof-vs-rain fork (C4C window: the roofed cow held water=1.00
        // against expectations) reads from the log instead of inference.
        if (ETIMConfig.mobDebugLog) {
            Long last = RAIN_TRACE.get(e);
            if (last == null || System.currentTimeMillis() - last >= 2000) {
                RAIN_TRACE.put(e, System.currentTimeMillis());
                ETIM.LOGGER.info("[AILog] livestock-raincheck pos=(" + Math.floor(e.posX) + "," + Math.floor(e.posY) + "," + Math.floor(e.posZ)
                        + ") nearWater=" + isNearWaterSource(w, e)
                        + " rainingAt=" + w.isRainingAt(new net.minecraft.util.math.BlockPos(e.posX, e.posY, e.posZ))
                        + " isRaining=" + w.isRaining()
                        + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
            }
        }
        if (isNearFood(w, e, cow ? COW_DESTROY_CHANCE : 0.0F)) {
            s.setFood(s.getFood() + BENEFIT);
        } else {
            s.setFood(s.getFood() + PENALTY);
        }
        if (isNearWaterSource(w, e)) {
            s.setWater(s.getWater() + BENEFIT);
        } else if (w.isRainingAt(new BlockPos(e.posX, e.posY, e.posZ))) {
            s.setWater(s.getWater() + BENEFIT / 10.0F);
        } else {
            s.setWater(s.getWater() + PENALTY);
        }
        if (!isCrowded(w, e)) {
            s.setFreedom(s.getFreedom() + BENEFIT);
        } else {
            s.setFreedom(s.getFreedom() + PENALTY);
        }
        logStateFlip(e, s);
        // R196 :238 — updateWellness returns THIS pass's isWell verdict; the
        // production counter arm (:246) consumes it (B-10).
        return Math.min(s.getFreedom(), Math.min(s.getFood(), s.getWater())) >= 0.25F;
    }

    // -------------------------------------------------- production (B-10)

    /**
     * R196 {@code produceGoods} family (:250 dispatch, :301 abstract) — the
     * per-100-tick consumption of {@code production_counter}:
     * <ul>
     *   <li>{@code EntityCow.produceGoods :80-83} — the milk meter absorbs
     *       the counter (clamped 0..100), the counter zeroes.</li>
     *   <li>{@code EntityChicken.produceGoods :82-95} — feather gate
     *       {@code counter >= 100 && rand.nextInt(500) == 0} → one
     *       {@code gainFeather}, {@code counter -= 100}; ELSE egg gate
     *       {@code counter >= 200 && rand.nextInt(20) == 0} → plop + drop 1
     *       egg, {@code counter -= 200}. Both gates roll EVERY pass once the
     *       threshold holds.</li>
     *   <li>{@code EntitySheep :267-269 / EntityPig :190-192} — counter
     *       reset only (R196 sheep/pig produce nothing; sheep wool comes
     *       from the shear/eatGrass faces instead).</li>
     * </ul>
     * Drops ride {@code dropItem(item, 1)} = {@code entityDropItem(stack,
     * 0)} (the B-7 manure precedent — ground-scatter freeze in
     * {@code MixinEntityItem}); the egg keeps the R196 plop pitch
     * ({@code (f - f) * 0.2 + 1.0}).
     */
    private static void produceGoods(EntityLivingBase e, ETIMLivestock.IState s) {
        if (e instanceof EntityCow) {
            int counter = s.getProductionCounter();
            if (counter > 0) {
                s.setMilk(s.getMilk() + counter); // R196 :81 (clamp in setMilk)
                s.setProductionCounter(0); // :82
            }
            return;
        }
        if (e instanceof EntityChicken) {
            java.util.Random rand = e.getRNG();
            int counter = s.getProductionCounter();
            int featherThreshold = 100; // R196 :83
            if (counter >= featherThreshold && rand.nextInt(featherThreshold * 5) == 0) { // :84
                gainFeather(e, s);
                s.setProductionCounter(s.getProductionCounter() - featherThreshold);
            } else {
                int eggThreshold = 200; // R196 :88
                if (counter >= eggThreshold && rand.nextInt(20) == 0) { // :89
                    e.playSound(net.minecraft.init.SoundEvents.ENTITY_CHICKEN_EGG, 1.0F,
                            (rand.nextFloat() - rand.nextFloat()) * 0.2F + 1.0F);
                    dropStack(e, new net.minecraft.item.ItemStack(net.minecraft.init.Items.EGG, 1));
                    s.setProductionCounter(counter - eggThreshold);
                    if (ETIMConfig.mobDebugLog) {
                        ETIM.LOGGER.info("[AILog] production src=chicken kind=egg drop=1 counter="
                                + s.getProductionCounter() + " entity=EntityChicken#" + e.getEntityId());
                    }
                }
            }
            return;
        }
        // EntitySheep :268 / EntityPig :191 — consume-and-drop-nothing cover
        s.setProductionCounter(0);
    }

    /** R196 {@code EntityChicken.gainFeather :193-199} — meter fill, overflow = feather drop. */
    private static void gainFeather(EntityLivingBase e, ETIMLivestock.IState s) {
        if (s.getNumFeathers() < s.getMaxNumFeathers()) {
            s.setNumFeathers(s.getNumFeathers() + 1);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] production src=chicken kind=feather grew=true num="
                        + s.getNumFeathers() + "/" + s.getMaxNumFeathers()
                        + " entity=EntityChicken#" + e.getEntityId());
            }
        } else {
            dropStack(e, new net.minecraft.item.ItemStack(net.minecraft.init.Items.FEATHER, 1));
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] production src=chicken kind=feather drop=1 num="
                        + s.getNumFeathers() + "/" + s.getMaxNumFeathers()
                        + " entity=EntityChicken#" + e.getEntityId());
            }
        }
    }

    private static void dropStack(EntityLivingBase e, net.minecraft.item.ItemStack stack) {
        e.entityDropItem(stack, 0.0F);
    }

    /**
     * B-10 milking face — R196 {@code ItemVessel.tryEntityInteraction
     * :100-115}: an empty vessel on a cow serves milk only when the meter
     * holds the full {@code standard_volume * 25} (bucket 4 × 25 = 100 =
     * the whole meter, the same face twice-over for 1.12's single bucket),
     * then drains exactly 100 (:107). Creative keeps the vessel and draws
     * nothing (:108-110 verbatim — the drain still happens). Returns true
     * when THIS click is answered (the caller must cancel the vanilla
     * infinite-milk path); below the meter it answers FALSE-INTENT — the
     * click is still ours (deny row, nothing given, vanilla must not run).
     */
    public static boolean milkClick(EntityCow cow, net.minecraft.entity.player.EntityPlayer player,
                                    net.minecraft.util.EnumHand hand) {
        if (cow.world.isRemote) {
            return true; // server answers; client mirrors as handled
        }
        ETIMLivestock.IState s = ETIMLivestock.get(cow);
        if (s == null) {
            return false; // no capability → vanilla fallback (defensive)
        }
        int meter = cow.isChild() ? 0 : s.getMilk(); // R196 :32 — child reads 0
        int need = 100; // ItemBucket.standard_volume 4 × 25 (ItemVessel.java:105)
        if (meter < need) {
            ETIMFarm.row("milk src=cow deny meter=" + meter + " need=" + need
                    + " entity=EntityCow#" + cow.getEntityId());
            return true; // denied — vanilla infinite milk must NOT run
        }
        s.setMilk(meter - need); // R196 :107 — the whole meter goes
        if (!player.capabilities.isCreativeMode) {
            net.minecraft.item.ItemStack held = player.getHeldItem(hand);
            net.minecraft.item.ItemStack milk = new net.minecraft.item.ItemStack(
                    net.minecraft.init.Items.MILK_BUCKET, 1);
            if (held.getCount() <= 1) {
                player.setHeldItem(hand, milk);
            } else {
                held.shrink(1);
                if (!player.addItemStackToInventory(milk)) {
                    player.dropItem(milk, false);
                }
            }
        }
        ETIMFarm.row("milk src=cow serve take=" + need + " meter=" + s.getMilk()
                + " entity=EntityCow#" + cow.getEntityId());
        return true;
    }

    /** B-10 工装 — the /etest prod force port (counter/milk/feather setters). */
    public static String forceProd(EntityLivingBase e, Integer counter, Integer milk, Integer feathers) {
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return null;
        }
        if (counter != null) {
            s.setProductionCounter(counter);
        }
        if (milk != null) {
            s.setMilk(milk);
        }
        if (feathers != null) {
            s.setNumFeathers(feathers);
            if (s.getMaxNumFeathers() < feathers) {
                s.setMaxNumFeathers(feathers);
            }
        }
        return kind(e);
    }

    /**
     * B-10 工装 — the /etest prod step pump: {@code produceGoods} called
     * directly N times (the B-7 chest-face precedent — the window multiplies
     * rolls instead of waiting out the statistical cadence; a 1/500 feather
     * roll would never open inside a natural window).
     */
    public static void pumpGoods(EntityLivingBase e, int n) {
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return;
        }
        for (int i = 0; i < n; i++) {
            produceGoods(e, s);
        }
    }

    // ------------------------------------------------------------------ scans

    /**
     * R196 isNearFood :162-180 — the 3 x (−1..floor(height)) x 3 scan for
     * grass / tall grass; the destroy roll happens WHEN a block is found
     * (MITE :169) and eats it without drops ({@code destroyBlock(info,false)}).
     */
    private static boolean isNearFood(World w, EntityLivingBase e, float destroyChance) {
        int bx = MathHelper.floor(e.posX);
        int by = MathHelper.floor(e.posY);
        int bz = MathHelper.floor(e.posZ);
        int top = MathHelper.floor(e.height);
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= top; dy++) {
                for (int dz = -1; dz <= 1; dz++) {
                    BlockPos pos = new BlockPos(bx + dx, by + dy, bz + dz);
                    IBlockState state = w.getBlockState(pos);
                    if (state.getBlock() != Blocks.GRASS && state.getBlock() != Blocks.TALLGRASS) {
                        continue;
                    }
                    if (destroyChance > 0.0F && e.getRNG().nextFloat() < destroyChance) {
                        w.destroyBlock(pos, false);
                        if (ETIMConfig.mobDebugLog) {
                            ETIM.LOGGER.info("[AILog] livestock ate grass at " + pos
                                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
                        }
                    }
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * R196 isNearWaterSource :182-200. 1.12 mapping: WATER (still+flowing
     * states of one block), SNOW_LAYER + SNOW (the two MITE snow forms), or
     * CAULDRON with LEVEL > 0 and the water surface below the eye line;
     * the {@code isBlockFaceFlatAndSolid(above, BOTTOM)} cover test maps to
     * {@code isSideSolid(world, up, DOWN)}.
     */
    private static boolean isNearWaterSource(World w, EntityLivingBase e) {
        int bx = MathHelper.floor(e.posX);
        int by = MathHelper.floor(e.posY);
        int bz = MathHelper.floor(e.posZ);
        int top = MathHelper.floor(e.height);
        double eyeY = e.posY + e.getEyeHeight();
        for (int dx = -1; dx <= 1; dx++) {
            for (int dy = -1; dy <= top; dy++) {
                for (int dz = -1; dz <= 1; dz++) {
                    BlockPos pos = new BlockPos(bx + dx, by + dy, bz + dz);
                    IBlockState state = w.getBlockState(pos);
                    if (!isWaterBlock(state, pos, eyeY)) {
                        continue;
                    }
                    BlockPos up = pos.up();
                    if (w.getBlockState(up).isSideSolid(w, up, EnumFacing.DOWN)) {
                        continue; // covered — MITE isBlockFaceFlatAndSolid tops it out
                    }
                    return true;
                }
            }
        }
        return false;
    }

    private static boolean isWaterBlock(IBlockState state, BlockPos pos, double eyeY) {
        if (state.getBlock() == Blocks.WATER
                || state.getBlock() == Blocks.SNOW_LAYER
                || state.getBlock() == Blocks.SNOW) {
            return true;
        }
        if (state.getBlock() == Blocks.CAULDRON
                && pos.getY() + 1 < eyeY
                && state.getValue(BlockCauldron.LEVEL) > 0) {
            return true;
        }
        return false;
    }

    /**
     * R196 isCrowded :202-213 — NOT outdoors (sky access), or more than 2
     * living entities (self included) in the box grown by (2, 0.5, 2).
     */
    private static boolean isCrowded(World w, EntityLivingBase e) {
        if (!w.canSeeSky(e.getPosition())) {
            return true;
        }
        AxisAlignedBB box = e.getEntityBoundingBox().grow(2.0, 0.5, 2.0);
        List<EntityLiving> neighbors = w.getEntitiesWithinAABB(EntityLiving.class, box);
        return neighbors.size() > 2;
    }

    // ------------------------------------------------------------------ logging

    /** [AILog] state flip — the welfare glyph changes at most per 100 ticks. */
    private static void logStateFlip(EntityLivingBase e, ETIMLivestock.IState s) {
        float min = Math.min(s.getFreedom(), Math.min(s.getFood(), s.getWater()));
        StringBuilder glyph = new StringBuilder(min >= 0.25F ? "well" : "unwell");
        if (s.getWater() < 0.5F) glyph.append("|thirsty");
        else if (s.getWater() < 0.25F) glyph.append("|thirsty-very");
        if (s.getWater() < 0.05F) glyph.append("|thirsty-desperate");
        if (s.getFood() < 0.5F) glyph.append("|hungry");
        else if (s.getFood() < 0.25F) glyph.append("|hungry-very");
        if (s.getFood() < 0.05F) glyph.append("|hungry-desperate");
        String prev = LAST.get(e);
        if (glyph.toString().equals(prev)) {
            return;
        }
        LAST.put(e, glyph.toString());
        if (!ETIMConfig.mobDebugLog) {
            return;
        }
        boolean isChild = e instanceof EntityAgeable && ((EntityAgeable) e).isChild();
        boolean server = Thread.currentThread().getName().contains("Server");
        ETIM.LOGGER.info("[AILog] livestock " + glyph
                + " food=" + String.format("%.2f", s.getFood())
                + " water=" + String.format("%.2f", s.getWater())
                + " freedom=" + String.format("%.2f", s.getFreedom())
                + (isChild ? " child=true" : "")
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId()
                + (server ? " [server]" : " [client]"));
    }
}
