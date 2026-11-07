package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.farm.ETIMFarm;
import io.github.etim.etim.farm.ETIMItemManure;
import io.github.etim.etim.weather.ETIMRain;
import net.minecraft.block.BlockCauldron;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.passive.EntityAnimal;
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
            ensureInitialized(e, s);
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
        // B-11 (条 306/307, D-1=needs) — the R196 ground-food eat arm
        // (onLivingUpdate "looting" chain) rides the same needs-family
        // per-tick seat; the handler's flag gate above is the D-1 carrier.
        groundEatTick(e, s);
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

    /** the R196 kind glyph for the judge rows (public — shared with the B-11 AI class). */
    public static String kind(EntityLivingBase e) {
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
                        + " rainingAt=" + ETIMRain.isInRain(w, new net.minecraft.util.math.BlockPos(e.posX, e.posY, e.posZ))
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
        } else if (ETIMRain.isInRain(w, new net.minecraft.util.math.BlockPos(Math.floor(e.posX), Math.floor(e.posY), Math.floor(e.posZ)))) {
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

    // ----------------------------------------------- interact family (B-10 batch 2)

    /**
     * B-10 batch 2 (audit20 条 303) — the R196 entity-interaction family
     * dispatch, called from {@code MixinEntityAnimal.processInteract} HEAD
     * (chicken has no override of its own; the cow/sheep/pig overrides reach
     * this body via their super fall-through). R196 arm order inside one held
     * item: the water-vessel arm first ({@code ItemVessel.tryEntityInteraction
     * :116-127}), then the hand-feed arm ({@code EntityAnimal
     * .onEntityRightClicked :262-276} + the {@code EntityLivestock.willEat
     * :411-414} gate + {@code onFoodEaten :336-343}). The cow empty-bucket
     * milking arm answers at {@code MixinEntityCow} HEAD (batch 1) and never
     * reaches here. Any hand our family does not own (dye / saddle / spawn
     * egg / sword hooks) returns false so the vanilla body stands.
     */
    public static boolean interactClick(EntityLivingBase e, net.minecraft.entity.player.EntityPlayer player,
                                        net.minecraft.util.EnumHand hand) {
        if (e.world.isRemote) {
            return true; // server answers; client mirrors as handled (batch-1 precedent)
        }
        if (!ETIMConfig.livestockProductionR196) {
            return false;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return false; // no capability → vanilla (defensive)
        }
        net.minecraft.item.ItemStack held = player.getHeldItem(hand);
        if (held.isEmpty()) {
            return false;
        }
        if (held.getItem() == net.minecraft.init.Items.WATER_BUCKET) {
            return waterClick(e, player, hand, s);
        }
        if (isFoodItem(e, held)) {
            return handFeedClick(e, player, hand, s);
        }
        return false;
    }

    /**
     * The F-1 water face — R196 {@code ItemVessel.tryEntityInteraction
     * :116-127} verbatim. A water vessel on a thirsty livestock
     * ({@code isThirsty()} = {@code water < 0.5F}, EntityLivestock :124-126)
     * takes {@code 0.25F * standard_volume} water (= 0.25 × 4 = +1.0 for the
     * 1.12 water bucket, ItemBucket:11) and converts to the empty vessel
     * unless creative (:121-123). A NON-thirsty click is R196's silent
     * fall-through (the :127 {@code return true} only lives inside the
     * isThirsty branch) — this carrier returns false so the vanilla body
     * runs its harmless no-op exactly like R196's fall would, with an
     * observation-only deny row (the batch-1 milk-deny-row precedent).
     */
    private static boolean waterClick(EntityLivingBase e, net.minecraft.entity.player.EntityPlayer player,
                                      net.minecraft.util.EnumHand hand, ETIMLivestock.IState s) {
        float meter = s.getWater();
        if (meter >= 0.5F) {
            ETIMFarm.row("water src=" + kind(e) + " deny meter=" + fmt(meter)
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
            return false;
        }
        s.setWater(meter + 1.0F); // R196 :120 — 0.25F * standard_volume, clamp in setWater
        if (!player.capabilities.isCreativeMode) {
            net.minecraft.item.ItemStack held = player.getHeldItem(hand);
            net.minecraft.item.ItemStack empty = new net.minecraft.item.ItemStack(net.minecraft.init.Items.BUCKET, 1);
            if (held.getCount() <= 1) {
                player.setHeldItem(hand, empty);
            } else {
                held.shrink(1);
                if (!player.addItemStackToInventory(empty)) {
                    player.dropItem(empty, false);
                }
            }
        }
        ETIMFarm.row("water src=" + kind(e) + " serve add=1.0 meter=" + fmt(s.getWater())
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
        return true;
    }

    /** R196 isFoodItem tables (one line each): cow/sheep wheat, chicken seeds, pig carrot|brownPod. */
    private static boolean isFoodItem(EntityLivingBase e, net.minecraft.item.ItemStack held) {
        net.minecraft.item.Item item = held.getItem();
        if (e instanceof EntityCow || e instanceof EntitySheep) {
            return item == net.minecraft.init.Items.WHEAT; // EntityCow :121 / EntitySheep :273
        }
        if (e instanceof EntityChicken) {
            return item == net.minecraft.init.Items.WHEAT_SEEDS; // EntityChicken :149
        }
        if (e instanceof EntityPig) {
            if (item == net.minecraft.init.Items.CARROT) {
                return true; // EntityPig :165-167
            }
            return item instanceof net.minecraft.item.ItemBlock
                    && ((net.minecraft.item.ItemBlock) item).getBlock() == net.minecraft.init.Blocks.BROWN_MUSHROOM; // :169-174
        }
        return false;
    }

    /** B-11 carrier access — the same isFoodItem tables, for the AI class. */
    public static boolean isFoodItemPublic(EntityLivingBase e, net.minecraft.item.ItemStack stack) {
        return isFoodItem(e, stack);
    }

    /**
     * The F-2 hand-feed face, the R196 chain verbatim:
     * <ol>
     *   <li>the gate {@code EntityLivestock.willEat :412-414}:
     *       {@code hasFullHealth() && !isWell() && !isHungry() → false},
     *       else the {@code super.willEat} chain ({@code EntityLiving :1335}
     *       isFoodItems+canEat, {@code EntityAnimal :257-260} !isInLove &&
     *       adult, {@code EntityLiving :1330-1332} !child && alive);</li>
     *   <li>{@code EntityLivestock.onFoodEaten :336-343}: {@code addFood(0.5F)}
     *       then the super chain — the love arm FIRST ({@code EntityAnimal
     *       :282} → {@code EntityLivestock.func_110196_bT :345-350} isWell
     *       gate → {@code EntityAnimal :293-301}: health==max → inLove 600 +
     *       the (byte)18 heart state), THEN the heal arm ({@code EntityLiving
     *       :1338-1342 → healByPercentage(0.5F)}, EntityLivingBase
     *       :2426-2433 = max·0.5 when hurt);</li>
     *   <li>the consume arm {@code EntityAnimal.onEntityRightClicked
     *       :265-270}: creative keeps the hand, else one item leaves.</li>
     * </ol>
     * A willEat-false or canEat-false food hand is ANSWERED (true, deny row,
     * vanilla untouched) — falling through would hand the same wheat to
     * 1.12's vanilla instant-breed / child-ageUp arms, faces R196 never has.
     */
    private static boolean handFeedClick(EntityLivingBase e, net.minecraft.entity.player.EntityPlayer player,
                                         net.minecraft.util.EnumHand hand, ETIMLivestock.IState s) {
        // the R196 willEat family gate — the batch-2 gate order verbatim (the
        // family gate FIRST, then the super.willEat chain) — see willEatCause.
        String cause = willEatCause(e, s, player.getHeldItem(hand));
        if (cause != null) {
            ETIMFarm.row("food src=" + kind(e) + " deny cause=" + cause
                    + " food=" + fmt(s.getFood()) + " hp=" + fmt(e.getHealth() / e.getMaxHealth())
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
            return true;
        }
        boolean love = eatCore(e, s);
        if (!player.capabilities.isCreativeMode) {
            net.minecraft.item.ItemStack held = player.getHeldItem(hand);
            if (held.getCount() <= 1) {
                player.setHeldItem(hand, net.minecraft.item.ItemStack.EMPTY);
            } else {
                held.shrink(1); // R196 :268 — convertOneOfHeldItem(null)
            }
        }
        ETIMFarm.row("food src=" + kind(e) + " serve add=0.5 food=" + fmt(s.getFood())
                + " hp=" + fmt(e.getHealth() / e.getMaxHealth()) + " love=" + love
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
        return true;
    }

    /**
     * The R196 willEat family gate, shared by the hand-feed click arm and the
     * B-11 ground-pickup arm. Gate order is the R196 sentence structure
     * verbatim: {@code EntityLivestock.willEat :411-414} (the rejection gate
     * {@code hasFullHealth && !isWell && !isHungry → false}) FIRST, then the
     * {@code super.willEat} chain — {@code EntityLiving :1335} isFoodItem +
     * canEat, {@code EntityAnimal :257-260} !isInLove && adult, {@code
     * EntityLiving :1330-1332} !child && alive. Returns {@code null} when the
     * gate passes, or the deny-cause glyph for the judge rows.
     */
    static String willEatCause(EntityLivingBase e, ETIMLivestock.IState s, net.minecraft.item.ItemStack stack) {
        boolean fullHealth = e.getHealth() >= e.getMaxHealth(); // R196 hasFullHealth :701-703
        boolean well = Math.min(s.getFreedom(), Math.min(s.getFood(), s.getWater())) >= 0.25F; // :113-117
        boolean hungry = s.getFood() < 0.5F; // :128-130
        if (fullHealth && !well && !hungry) {
            return "family_gate"; // :412-414 — the rejection gate first
        }
        net.minecraft.entity.EntityAgeable ageable = (net.minecraft.entity.EntityAgeable) e;
        boolean inLove = e instanceof net.minecraft.entity.passive.EntityAnimal
                && ((net.minecraft.entity.passive.EntityAnimal) e).isInLove();
        boolean canEat = !inLove && ageable.getGrowingAge() == 0 // EntityAnimal :257-260
                && !ageable.isChild() && !e.isDead && e.getHealth() > 0.0F; // EntityLiving :1330-1332
        if (!canEat) {
            return inLove ? "in_love" : (ageable.isChild() ? "child"
                    : (e.isDead ? "dead" : "hp_low"));
        }
        if (!isFoodItem(e, stack)) {
            return "not_food"; // EntityLiving :1335 — the isFoodItem half of super.willEat
        }
        return null;
    }

    /**
     * The R196 onFoodEaten chain core, shared by the hand-feed click arm and
     * the B-11 ground-pickup arm: {@code EntityLivestock.onFoodEaten
     * :336-343} {@code addFood(0.5F)} then the super chain — the love arm
     * FIRST ({@code EntityAnimal :282} → {@code EntityLivestock
     * .func_110196_bT :345-350} isWell gate → {@code EntityAnimal :293-301}:
     * health==max → inLove 600 + the heart state), THEN the heal arm
     * ({@code EntityLiving :1338-1342 → healByPercentage(0.5F)},
     * EntityLivingBase :2426-2433 = max·0.5 when hurt). Returns the love
     * flag for the judge rows.
     */
    private static boolean eatCore(EntityLivingBase e, ETIMLivestock.IState s) {
        s.setFood(s.getFood() + 0.5F); // EntityLivestock :339 (clamp in setFood)
        boolean love = false;
        if (Math.min(s.getFreedom(), Math.min(s.getFood(), s.getWater())) >= 0.25F
                && e instanceof net.minecraft.entity.passive.EntityAnimal) {
            net.minecraft.entity.passive.EntityAnimal a = (net.minecraft.entity.passive.EntityAnimal) e;
            if (a.getHealth() >= a.getMaxHealth()) { // EntityAnimal :294 — love rides full health
                a.setInLove((net.minecraft.entity.player.EntityPlayer) null); // :295-299 — inLove 600 + hearts
                love = true;
            }
        }
        if (e.getHealth() < e.getMaxHealth()) {
            e.heal(e.getMaxHealth() * 0.5F); // EntityLiving :1340 — healByPercentage(0.5F)
        }
        return love;
    }

    /**
     * B-11 (条 306/307) — the ground-food eat arm, R196 {@code
     * EntityLiving.onLivingUpdate :630-691} verbatim (the "looting" chain —
     * NOT behind canPickUpLoot, that gates only the equipment side arm
     * :635/:468). Every server tick while alive: a &gt;0
     * {@code food_or_repair_item_pickup_cooldown} counts down first
     * (:646-648, the tick stays dry); else Entities inside the pickup box
     * ({@code getBoundingBoxForItemPickup :441-443} = expand 1.0/0.25/1.0)
     * pass the family {@code willEat} gate one at a time and are eaten via
     * {@code onFoodEaten} (:657-659 — the chain above); the settlement
     * (:669-685) sets cooldown = 400, takes ONE stack unit off the ground
     * item, plays the pop (0.2F, pitch ±), kills the empty item or resets
     * its despawn age to -18000. R196 {@code refreshDespawnCounter(-2400)}
     * (:683) has no judge value in 1.12 (animals canDespawn=false natively)
     * and is dropped; the tamed / repair / valuable arms have no livestock
     * overrides (R196 N/A). The deny row is the observation-only carrier row
     * (工装发明判位) — R196's non-eating fall-through is silent.
     */
    public static void groundEatTick(EntityLivingBase e, ETIMLivestock.IState s) {
        if (!(e instanceof net.minecraft.entity.passive.EntityAnimal)) {
            return;
        }
        if (e.isDead || e.getHealth() <= 0.0F) { // R196 :639 gate half
            return;
        }
        int cooldown = s.getPickupCooldown();
        if (cooldown > 0) {
            s.setPickupCooldown(cooldown - 1); // R196 :646-648 — decrement, dry tick
            return;
        }
        java.util.List<EntityItem> items = e.world.getEntitiesWithinAABB(EntityItem.class,
                e.getEntityBoundingBox().grow(1.0D, 0.25D, 1.0D)); // R196 :441-443
        boolean denied = false;
        for (EntityItem item_entity : items) {
            if (item_entity.isDead || item_entity.getItem().isEmpty()) {
                continue;
            }
            net.minecraft.item.ItemStack stack = item_entity.getItem();
            if (!isFoodItem(e, stack)) {
                continue; // World :4535-4546 — non-food items never open the scan
            }
            String cause = willEatCause(e, s, stack);
            if (cause != null) {
                if (!denied && e.ticksExisted % 20 == 0) { // observation row, 1 Hz — the R196 fall-through is silent
                    denied = true;
                    ETIMFarm.row("foodground src=" + kind(e) + " deny cause=" + cause
                            + " item=" + stack.getItem().getRegistryName()
                            + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
                }
                continue;
            }
            boolean love = eatCore(e, s);
            String itemGlyph = String.valueOf(stack.getItem().getRegistryName()); // logged BEFORE the mutate
            stack.shrink(1); // R196 :675 — one stack unit off the ground pile
            e.world.playSound(null, e.posX, e.posY, e.posZ,
                    net.minecraft.init.SoundEvents.ENTITY_ITEM_PICKUP,
                    net.minecraft.util.SoundCategory.NEUTRAL,
                    0.2F, ((e.getRNG().nextFloat() - e.getRNG().nextFloat()) * 0.7F + 1.0F) * 2.0F); // :676
            if (stack.isEmpty()) {
                item_entity.setDead(); // :677-678
            } else {
                ((io.github.etim.etim.mixins.EntityItemAgeAccessor) (Object) item_entity).setAge(-18000); // :680
            }
            s.setPickupCooldown(400); // :670 — the 20 s rate limit
            ETIMFarm.row("foodground src=" + kind(e) + " serve add=0.5 food=" + fmt(s.getFood())
                    + " hp=" + fmt(e.getHealth() / e.getMaxHealth()) + " love=" + love
                    + " item=" + itemGlyph
                    + " cooldown=400 entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
            break; // :684 — one eat per tick
        }
    }

    /**
     * The F-3 jump feather face — R196 {@code EntityChicken.jump :185-191}
     * (after super.jump: !child && 1-in-40 && not in water →
     * {@code tryDropFeather(true)} :201-209, the retain-at-least-one arm:
     * the meter needs 2+, one feather falls and the meter steps down).
     */
    public static void jumpFeather(EntityLivingBase e) {
        if (!(e instanceof EntityChicken)) {
            return;
        }
        EntityChicken c = (EntityChicken) e;
        ETIMLivestock.IState s = ETIMLivestock.get(c);
        if (s == null) {
            return;
        }
        if (c.isChild() || e.getRNG().nextInt(40) != 0
                || c.isInsideOfMaterial(net.minecraft.block.material.Material.WATER)) {
            return; // R196 :188
        }
        if (s.getNumFeathers() >= 2) { // :202 — retain_at_least_one = true
            dropStack(c, new net.minecraft.item.ItemStack(net.minecraft.init.Items.FEATHER, 1));
            s.setNumFeathers(s.getNumFeathers() - 1);
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[AILog] production src=chicken kind=feather jump=true drop=1 num="
                        + s.getNumFeathers() + "/" + s.getMaxNumFeathers()
                        + " entity=EntityChicken#" + c.getEntityId());
            }
        }
    }

    /**
     * The F-4 sheep eating tail — R196 {@code EntitySheep.eatGrassBonus
     * :223-231}. 1.12's vanilla body already carries the R196 first two
     * statements verbatim (setSheared(false) + child addGrowth(60)), so this
     * mixin only appends the tail {@code addFood(0.5F)} (:230) and rides the
     * needs flag like the rest of the three-need face.
     */
    public static void sheepEatGrassBonus(EntityLivingBase e) {
        if (!ETIMConfig.livestockNeedsR196) {
            return;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return;
        }
        s.setFood(s.getFood() + 0.5F);
        ETIMFarm.row("grass src=" + kind(e) + " add=0.5 face=eatGrassBonus food=" + fmt(s.getFood())
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
    }

    private static String fmt(float f) {
        return String.format("%.2f", f);
    }

    /** B-10 工装 — the /etest prod force port (counter/milk/feather setters). */
    public static String forceProd(EntityLivingBase e, Integer counter, Integer milk, Integer feathers,
                                   Float water, Float food, Float hp) {
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
        if (water != null) {
            s.setWater(water); // clamp in setWater :55-61
        }
        if (food != null) {
            s.setFood(food); // clamp in setFood :40-45
        }
        if (hp != null) {
            e.setHealth(MathHelper.clamp(hp, 0.0F, e.getMaxHealth()));
        }
        return kind(e);
    }

    /**
     * B-11 工装内测位 (non-verdict debug) — one navigation-state line per
     * living entity in radius: position, onGround, navigator path length /
     * index / finished / swim flag, and the task engine's mutex state. Rides
     * mobDebugLog like the other [AILog] surfaces.
     */
    public static void navProbe(EntityLivingBase e) {
        if (!(e instanceof net.minecraft.entity.EntityLiving)) {
            return;
        }
        net.minecraft.entity.EntityLiving living = (net.minecraft.entity.EntityLiving) e;
        net.minecraft.pathfinding.Path path = living.getNavigator().getPath();
        ETIM.LOGGER.info("[AILog] navprobe pos=(" + fmt2(e.posX) + "," + fmt2(e.posY) + "," + fmt2(e.posZ) + ")"
                + " onGround=" + e.onGround
                + " aiDisabled=" + living.isAIDisabled()
                + " moveForward=" + String.format("%.3f", living.moveForward)
                + " path=" + (path == null ? "null" : ("len=" + path.getCurrentPathLength()
                        + " idx=" + path.getCurrentPathIndex()
                        + " fin=" + path.isFinished()
                        + " end=(" + path.getFinalPathPoint().x + "," + path.getFinalPathPoint().y + ","
                        + path.getFinalPathPoint().z + ")"))
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
    }

    private static String fmt2(double d) {
        return String.format("%.2f", d);
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

    // =====================================================================
    // B-12 (audit20 条 309) — the mating chain helpers. The three mixins
    // (MixinEntityAIMate / MixinEntityAgeable / MixinEntityEgg) call into
    // this class so every R196 value face resolves in one place, the same
    // way B-11 shared groundEatTick / eatCore / willEatCause.
    // =====================================================================

    /** R196 :144-146 — isDesperateForWater = water &lt; 0.05F (food Sym: :136-138). */
    private static final float DESPERATE_WATER_GATE = 0.05F;

    /** R196 {@code EntityLivestock} seat — the four hosts carry the capability. */
    private static boolean isLivestock(EntityLivingBase e) {
        return e instanceof EntityCow || e instanceof EntitySheep
                || e instanceof EntityPig || e instanceof EntityChicken;
    }

    /**
     * B-12 F-A(1)/F-A(2) — the spawnBaby {@code setGrowingAge} value
     * mapper. R196 faces: {@code 6000 → 16000}
     * ({@code setGrowingAgeAfterBreeding}, EntityAgeable:57-59 — breeder
     * cooldown 13:20 vs vanilla 5:00) and {@code &lt;0 → -64000}
     * ({@code setGrowingAgeToNewborn}, :53-55 — newborn child life 53:20
     * vs vanilla 20:00). C-12-1: the Forge BabyEntitySpawnEvent cancelled
     * branch writes {@code 6000} too and rides this same mapper — R196 has
     * no event branch and the event-carrier face never fires in ETIM, so
     * the R196 constant stands either way. Flag-off passes the vanilla
     * value back untouched.
     */
    public static int r196BreedCooldown(int age) {
        if (!ETIMConfig.livestockNeedsR196) {
            return age;
        }
        if (age < 0) {
            return -64000; // R196 EntityAgeable.getGrowingAgeOfNewborn :49-51
        }
        if (age == 6000) {
            return 16000; // R196 EntityAgeable.setGrowingAgeAfterBreeding :57-59
        }
        return age;
    }

    /** F-A(2)/F-B(2)/F-C(1) — the newborn-age face alone (no cooldown arm). */
    public static int r196NewbornAge(int age) {
        if (!ETIMConfig.livestockNeedsR196) {
            return age;
        }
        return age < 0 ? -64000 : age;
    }

    /**
     * B-12 F-D — R196 {@code EntityLivestock.setGrowingAge :389-393}:
     * a child whose next write advances the age ({@code par1 &gt; current})
     * stays frozen while either desperate need holds ({@code &lt; 0.05F}).
     * Returns true = drop the vanilla write (R196 skips
     * {@code super.setGrowingAge} entirely). Livestock-only, needs-flag
     * gated. Emits the one-shot [FarmLog] latch row on the state flip.
     */
    /** B-12 smoke probe — the [FarmLog] agegate cancel-facing row (rate-limited by the driver's dump cadence). */
    public static void ageGateRow(String src, EntityAgeable e, int age) {
        if (!ETIMConfig.mobDebugLog) {
            return;
        }
        ETIMFarm.row("agegate src=" + src + " age=" + e.getGrowingAge() + " arg=" + age
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
    }

    public static boolean desperateAgeLock(EntityAgeable e, int age) {
        if (!ETIMConfig.livestockNeedsR196 || !isLivestock(e) || !e.isChild()) {
            return false;
        }
        if (age <= e.getGrowingAge()) {
            return false; // R196 :390 — par1 <= current passes the gate
        }
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null) {
            return false; // defensive: no capability = vanilla
        }
        boolean desperate = s.getFood() < DESPERATE_FOOD_GATE || s.getWater() < DESPERATE_WATER_GATE;
        if (desperate && ETIMConfig.mobDebugLog) {
            ETIMFarm.row("agegate src=desperate lock age=" + e.getGrowingAge()
                    + " food=" + fmt(s.getFood()) + " water=" + fmt(s.getWater())
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
        }
        return desperate;
    }

    /**
     * B-12 F-B(1) — R196 {@code EntityAgeable.setGrowingAge :33-47}: a
     * child standing in a cauldron whose head cell is neither air nor a
     * passable block cannot grow past its cell — the write re-issues as
     * {@code -1}. Base-level in R196 (every ageable passes it), so no
     * livestock restriction. The {@code !isAirOrPassableBlock(y+1, true)}
     * carrier equivalent: the head cell is not air AND its material is
     * not replaceable.
     */
    public static int cauldronAgeLock(EntityAgeable e, int age) {
        if (!ETIMConfig.livestockNeedsR196 || !e.isChild() || age < 0) {
            return age; // R196 :34-36 — the gate only watches child faces reaching >= 0
        }
        net.minecraft.util.math.BlockPos pos = new net.minecraft.util.math.BlockPos(e);
        if (e.world.getBlockState(pos).getBlock() != net.minecraft.init.Blocks.CAULDRON) {
            return age;
        }
        net.minecraft.util.math.BlockPos head = pos.up();
        boolean headOpen = e.world.isAirBlock(head)
                || e.world.getBlockState(head).getMaterial().isReplaceable();
        if (headOpen) {
            return age;
        }
        if (ETIMConfig.mobDebugLog) {
            ETIMFarm.row("agegate src=cauldron lock age=" + e.getGrowingAge()
                    + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
        }
        return -1; // R196 :39
    }

    /**
     * B-12 F-A(3) — R196 {@code EntityLivestock.adoptWellnessFromParents
     * :395-409} verbatim: each need takes {@code min(parent_a, parent_b)},
     * a non-livestock parent counting as 1.0F. Call gates: server-side
     * (R196 :76 {@code !isRemote}) and a livestock child
     * (R196 :76-77 {@code instanceof EntityLivestock}). Emits the spawn
     * [FarmLog] row — the B-12 judgment channel.
     */
    public static void adoptWellnessFromParents(EntityAgeable child,
                                                EntityAnimal parent_a, EntityAnimal parent_b) {
        if (child.world.isRemote || !ETIMConfig.livestockNeedsR196) {
            return;
        }
        if (!isLivestock(child)) {
            return; // R196 :76-77 — only the livestock family adopts
        }
        ETIMLivestock.IState sc = ETIMLivestock.get(child);
        if (sc == null) {
            return;
        }
        // A-12-1 — apply the deferred init bundle first (R196's ctor faces)
        // and flag it done, so the adoption below is the final write, not
        // food for the first tick's random bundle. R196 :395-409 order:
        // construction randoms -> adoption overwrite, within one instant.
        ensureInitialized(child, sc);
        float food = Math.min(parentNeed(parent_a, NEED.FOOD), parentNeed(parent_b, NEED.FOOD));
        float water = Math.min(parentNeed(parent_a, NEED.WATER), parentNeed(parent_b, NEED.WATER));
        float freedom = Math.min(parentNeed(parent_a, NEED.FREEDOM), parentNeed(parent_b, NEED.FREEDOM));
        sc.setFood(food);
        sc.setWater(water);
        sc.setFreedom(freedom);
        ETIMFarm.row("breed src=adopt child=" + kind(child)
                + " food=" + fmt(food) + " water=" + fmt(water) + " freedom=" + fmt(freedom)
                + " entity=" + child.getClass().getSimpleName() + "#" + child.getEntityId());
    }

    /** F-A(3) face selector — R196 :399-407's per-need fallback to 1.0F. */
    private enum NEED { FOOD, WATER, FREEDOM }

    private static float parentNeed(EntityAnimal parent, NEED need) {
        if (!isLivestock(parent)) {
            return 1.0F; // R196 :399-404 — non-livestock parent reads 1.0F
        }
        ETIMLivestock.IState s = ETIMLivestock.get(parent);
        if (s == null) {
            return 1.0F;
        }
        switch (need) {
            case FOOD:
                return s.getFood();
            case WATER:
                return s.getWater();
            default:
                return s.getFreedom();
        }
    }

    /**
     * A-12-1 (W-B12 verdict) — the delayed first-tick init face, extracted
     * verbatim from the {@code !isInitialized()} branch of
     * {@code onLivingUpdate}. R196 applies its {@code 0.8+rand*0.2} bundle
     * at CONSTRUCTION, so the breeder's {@code adoptWellnessFromParents}
     * overwrites it in the same instant (:395-409 call order). ETIM defers
     * the bundle to the first tick — which would silently overwrite the
     * adoption. Applying the bundle here first (manureCountdown / cow milk
     * / chicken feathers) and flipping the init flag keeps the R196
     * semantics: random init, then adoption, both before any tick passes.
     */
    private static void ensureInitialized(EntityLivingBase e, ETIMLivestock.IState s) {
        if (s.isInitialized()) {
            return;
        }
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
}
