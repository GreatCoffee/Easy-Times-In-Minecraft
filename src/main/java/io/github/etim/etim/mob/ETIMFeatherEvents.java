package io.github.etim.etim.mob;

import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.init.Items;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.living.LivingDropsEvent;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.fml.common.eventhandler.EventPriority;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.List;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMButchering;

/**
 * B-16 (audit20 条 327/328) — the R196 chicken num_feathers family,
 * zero-mixin event faces. R196 first-hand {@code EntityChicken.java}:
 *
 * <ul>
 *   <li><b>F-1 death arm</b> — {@code dropFewItems :127-142}: burning →
 *       well {@code chickenCooked} (no feathers); not burning →
 *       {@code num_feathers × feather} + well {@code chickenRaw};
 *       burning + not well = the empty hand (no meat, no feathers).
 *       1.12 {@code EntityChicken} has NO dropFewItems — the death loot
 *       is the loot table {@code ENTITIES_CHICKEN} (1.12 :139-141), so the
 *       carrier is Forge {@code LivingDropsEvent} (the batch B5 butchering
 *       precedent, 条 264): the event fires (:1318) BEFORE the vanilla
 *       spawn loop (:1320-1324), we strip the vanilla chicken-face items
 *       and recompose the R196 shapes. NO blanket clear (条 263: stray
 *       items from other listeners survive).</li>
 *   <li><b>F-2 hurt arm</b> — {@code attackEntityFrom knockback arm
 *       :160-186}: exclusion list {@code health<=0 / child / fire / lava /
 *       magic / drowning / starving} → per damage point
 *       {@code nextFloat() < 0.2F} → {@code tryDropFeather(false)} while
 *       {@code num_feathers > 0}. 1.12 EntityChicken has no
 *       attackEntityFrom override (base class manages it directly), so the
 *       carrier is Forge {@code LivingHurtEvent} (ETIMBlocking /
 *       ETIMArrowRecovery / PlayerLevelBonuses precedents).
 *       {@code setEntityWasAffected} is the R196 knockback result flag with
 *       no 1.12 carrier — informational, not landed.</li>
 *   <li>Companion faces already landed, NOT repeated here: the jump feather
 *       (1/40, {@code tryDropFeather(true)} = B-10
 *       {@link ETIMLivestockEvents#jumpFeather}), the produceGoods feather
 *       fill + overflow drop (B-10), and the meter itself
 *       {@code ETIMLivestock.IState} (NBT numFeathers/maxNumFeathers).</li>
 *   <li>The well verdict is the R196 server-side recomputation
 *       ({@code EntityLivestock.isWell :113-115} = the needs min) —
 *       {@link ETIMButchering#isWell} already implements it.</li>
 *   <li>C-grade meter recall (条 328 §四): R196 {@code damage.getAmount()}
 *       is the PRE-armor base; the 1.12 {@code LivingHurtEvent.amount} is
 *       POST-armor — same per-point 0.2F roll, the point count follows the
 *       1.12 amount (no conversion factor).</li>
 * </ul>
 *
 * <p>Flag = {@code ETIMConfig.livestockProductionR196} (the B-10 production
 * family master — no new cfg key). Judgment rows = {@code [FarmLog]
 * featherDrop src=death|hurt …}.</p>
 */
public final class ETIMFeatherEvents {

    private ETIMFeatherEvents() {
    }

    /** Register once from ETIM preInit (the ETIMButcheringEvents precedent). */
    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(ETIMFeatherEvents.class);
    }

    // ------------------------------------------------------------------ F-1

    /**
     * F-1 death arm — R196 {@code dropFewItems :127-142} verbatim branches
     * over the {@code LivingDropsEvent} capture list (edited in place; the
     * vanilla loop materializes, we never self-spawn).
     */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onLivingDrops(LivingDropsEvent event) {
        World world = event.getEntityLiving().world;
        if (world.isRemote || event.isCanceled() || !ETIMConfig.livestockProductionR196) {
            return;
        }
        EntityLivingBase e = event.getEntityLiving();
        if (!(e instanceof EntityChicken)) {
            return;
        }
        // The empty-table replica (the ETIMButcheringEvents F8 gate, 条 263):
        // child animals / doMobLoot=false leave the vanilla capture list
        // EMPTY — do not fabricate; vanilla 0 drops stay 0.
        boolean child = e instanceof EntityAgeable && ((EntityAgeable) e).isChild();
        boolean lootOn = world.getGameRules().getBoolean("doMobLoot");
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (child || !lootOn || s == null || !s.isInitialized()) {
            return;
        }

        int n = s.getNumFeathers();
        int max = s.getMaxNumFeathers();
        boolean well = ETIMButchering.isWell(e);
        boolean burning = e.isBurning();
        List<net.minecraft.entity.item.EntityItem> list = event.getDrops();
        int removed = (int) list.stream().filter(ETIMFeatherEvents::isVanillaChickenItem).count();
        list.removeIf(ETIMFeatherEvents::isVanillaChickenItem);

        String meat = "none";
        int droppedFeathers = 0;
        if (burning) {
            if (well) {
                ETIMButchering.addStack(list, world, e, new ItemStack(Items.COOKED_CHICKEN, 1));
                meat = "cooked";
            }
            // burning + not well = the R196 empty hand (no feathers, no meat)
            // — droppedFeathers stays 0: the R196 burn face yields NO feathers.
        } else {
            for (int i = 0; i < n; i++) {
                ETIMButchering.addStack(list, world, e, new ItemStack(Items.FEATHER, 1));
            }
            droppedFeathers = n;
            if (well) {
                ETIMButchering.addStack(list, world, e, new ItemStack(Items.CHICKEN, 1));
                meat = "raw";
            }
        }
        io.github.etim.etim.farm.ETIMFarm.row("featherDrop src=death burning=" + burning + " well=" + well
                + " vanillaRemoved=" + removed + " feathers=" + n + " droppedFeathers=" + droppedFeathers
                + " meat=" + meat
                + " meter=" + n + "/" + max
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
    }

    /** The vanilla chicken loot-face items only — everything else survives. */
    private static boolean isVanillaChickenItem(net.minecraft.entity.item.EntityItem it) {
        net.minecraft.item.Item item = it.getItem().getItem();
        return item == Items.FEATHER || item == Items.CHICKEN || item == Items.COOKED_CHICKEN;
    }

    // ------------------------------------------------------------------ F-2

    /**
     * F-2 hurt arm — R196 {@code attackEntityFrom :160-186 exclusion list +
     * per-point 0.2F roll}, stamped on the 1.12 {@code LivingHurtEvent}.
     * health≤0 maps to the lethal shot (F-1 owns the death face); fire and
     * lava collapse into {@code isFireDamage} (1.12 {@code DamageSource.LAVA}
     * rides {@code setFireDamage()} :20).
     */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onLivingHurt(LivingHurtEvent event) {
        World world = event.getEntityLiving().world;
        if (world.isRemote || event.isCanceled() || !ETIMConfig.livestockProductionR196) {
            return;
        }
        EntityLivingBase e = event.getEntityLiving();
        if (!(e instanceof EntityChicken)) {
            return;
        }
        boolean child = e instanceof EntityAgeable && ((EntityAgeable) e).isChild();
        DamageSource source = event.getSource();
        // R196 :166-171 exclusion list verbatim; lethal = the death axis.
        boolean lethal = e.getHealth() <= event.getAmount();
        if (lethal || child
                || source.isFireDamage()
                || source.isMagicDamage()
                || source == DamageSource.DROWN
                || source == DamageSource.STARVE) {
            return;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null || !s.isInitialized()) {
            return;
        }
        int points = (int) event.getAmount(); // R196 (int)damage.getAmount() — trunc toward zero
        int n0 = s.getNumFeathers();
        int nMax = s.getMaxNumFeathers();
        if (points <= 0 || n0 <= 0) {
            return;
        }
        int rolls = Math.min(points, n0);
        int dropped = 0;
        for (int i = 0; i < points && s.getNumFeathers() > 0; i++) {
            if (e.getRNG().nextFloat() < 0.2F) {
                // tryDropFeather(false) :201-209 minus the child branch (the
                // exclusion above already removed children) — min 0 allowed.
                e.entityDropItem(new ItemStack(Items.FEATHER, 1), 0.0F);
                s.setNumFeathers(s.getNumFeathers() - 1);
                dropped++;
            }
        }
        io.github.etim.etim.farm.ETIMFarm.row("featherDrop src=hurt amount="
                + String.format(java.util.Locale.ROOT, "%.2f", event.getAmount())
                + " points=" + points + " rolls=" + rolls + " dropped=" + dropped
                + " meter=" + n0 + "->" + s.getNumFeathers() + "/" + nMax
                + " source=" + source.getDamageType()
                + " entity=" + e.getClass().getSimpleName() + "#" + e.getEntityId());
    }
}
