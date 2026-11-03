package io.github.etim.etim.combat;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mining.ETIMEnchantments;
import io.github.etim.etim.mob.ETIMLivestock;

import net.minecraft.entity.Entity;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.AbstractHorse;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityHorse;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.entity.passive.EntitySkeletonHorse;
import net.minecraft.entity.passive.EntityZombieHorse;
import net.minecraft.entity.monster.EntitySpider;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.DamageSource;
import net.minecraft.world.World;

/**
 * butchering (batch B5, audit20 条 262-265) formula + judgment single point.
 * D-1 乙 (条 264): the R196 drop formulas ride the zero-mixin
 * {@code LivingDropsEvent} in {@link ETIMButcheringEvents}; this class is
 * the pure computation + [ButchLog] face.
 *
 * <p>All formulas first-hand (对照报告 §2-§4, 终审放行 条 265):</p>
 * <ul>
 *   <li>F2 level — R196 {@code EnchantmentHelper:399-400}: the INTEGER
 *       level L (0..maxLevel), never a fraction; dead/indirect killer → 0
 *       (DamageSource:361-365).</li>
 *   <li>F9 isWell — R196 {@code EntityLivestock:113-117}
 *       {@code min(freedom, min(food, water)) >= 0.25F} on the
 *       {@code etim:livestock} capability; D-4 (条 264): total switch off,
 *       missing capability, or un-initialized state all read {@code true}
 *       (D-4: the system off ⇒ the drop gate is off).</li>
 *   <li>F3 cow — leather {@code r(3)+1} (no B, no gate) + meat (well-gated)
 *       {@code r(3)+1 + r(1+L)} with the ==1-then-half nudge (R196
 *       EntityCow:91-107; nudge is cow-ONLY).</li>
 *   <li>F4 pig — meat {@code r(3)+1 + r(1+L)} well-gated, NO nudge; the
 *       saddle stays with vanilla {@code EntityPig.onDeath} (after
 *       super, outside the capture list — 条 263 F8 锤位).</li>
 *   <li>F5 sheep — wool (unshorn ∧ ¬burning ∧ r(2)==0) → mutton
 *       {@code max(1, r(2)+r(1+L))} → leather {@code r(2)==0} (R196
 *       EntitySheep:101-117; roll order preserved).</li>
 *   <li>F6 horse family — base {@code r(3)+1} pieces (horse/donkey/mule/
 *       llama leather; skeleton bone; zombie flesh with the per-iteration
 *       fresh {@code r(4)==0 → skip}, R196 :507/:514-518); meat face
 *       {@code 1 + r(1+L)} (+{@code r(2)} on the PLAIN horse only, R196
 *       :520-528). vanilla has no beef — the D-2/D-3 乙 additions, llama
 *       rides the no-nudge meat face (D-9 乙, 条 264 pin).</li>
 *   <li>F7 spider — eye OR-gate {@code recentlyHit ∧ (r(3)==0 ∨
 *       r(1+L)>0)} short-circuit preserved (R196 EntityArachnid:201);
 *       string is NOT this batch (D-5 — the num_webs state face; the
 *       vanilla string face stays untouched).</li>
 * </ul>
 *
 * <p>Wager randomness = {@code e.getRNG()} — the entity's own server
 * RNG (1.12 same-source as the R196 {@code EntityLiving.rand} streams).</p>
 */
public final class ETIMButchering {

    private ETIMButchering() {
    }

    /** [ButchLog] judgment channel (纪律 9 — before ship; D-6 条 264). */
    public static void row(String line) {
        if (ETIMConfig.butcheringDebugLog) {
            ETIM.LOGGER.info("[ButchLog] " + line + " [server]");
        }
    }

    /** F2: the R196 integer level read — dead/indirect killer → 0. */
    public static int level(DamageSource src) {
        Entity k = src == null ? null : src.getTrueSource();
        if (!(k instanceof EntityLivingBase)) {
            return 0;
        }
        ItemStack held = ((EntityLivingBase) k).getHeldItemMainhand();
        if (held.isEmpty()) {
            return 0;
        }
        return net.minecraft.enchantment.EnchantmentHelper.getEnchantmentLevel(ETIMEnchantments.BUTCHERING, held);
    }

    /**
     * F9 (D-4): the R196 wellness read with the three-way fallback to
     * {@code true} — cfg total switch off / capability missing / state
     * uninitialized (mirrors the cfg-gated early returns in
     * ETIMLivestockEvents.onLivingUpdate).
     */
    public static boolean isWell(EntityLivingBase e) {
        if (!ETIMConfig.livestockNeedsR196) {
            return true;
        }
        ETIMLivestock.IState s = ETIMLivestock.get(e);
        if (s == null || !s.isInitialized()) {
            return true;
        }
        return Math.min(s.getFreedom(), Math.min(s.getFood(), s.getWater())) >= 0.25F;
    }

    /**
     * F11 family gate (C-注1, 条 265): D-9 乙 family appears —
     * the mushroom cow (EntityCow subclass) rides the whole cow family
     * set; the llama rides AbstractHorse. One event, one living, one
     * family — no cross-family member exists (C-注4).
     */
    public static boolean isBatchFamily(EntityLivingBase e) {
        return e instanceof EntityCow
                || e instanceof EntityPig
                || e instanceof EntitySheep
                || e instanceof AbstractHorse
                || e instanceof EntitySpider;
    }

    /**
     * Family delete-set: ONLY the vanilla TABLE products of this family
     * (B-1, 条 263 — never a blanket clear; strays like the vanilla spider
     * string for D-5-neutral spider events stay safe). WOOL is matched at
     * the ITEM level (any dye marker — C-注4).
     */
    public static boolean isFamilyItem(EntityLivingBase e, ItemStack s) {
        Item item = s.getItem();
        if (e instanceof EntityCow) {
            return item == Items.BEEF || item == Items.COOKED_BEEF || item == Items.LEATHER;
        }
        if (e instanceof EntityPig) {
            return item == Items.PORKCHOP || item == Items.COOKED_PORKCHOP;
        }
        if (e instanceof EntitySheep) {
            return item == Items.MUTTON || item == Items.COOKED_MUTTON
                    || item == Item.getItemFromBlock(Blocks.WOOL); // A-1 (条 263): death wool is a family product
        }
        if (e instanceof AbstractHorse) {
            if (e.getClass() == EntityZombieHorse.class) {
                return item == Items.ROTTEN_FLESH;
            }
            if (e.getClass() == EntitySkeletonHorse.class) {
                return item == Items.BONE;
            }
            return item == Items.LEATHER; // horse / donkey / mule / llama
        }
        if (e instanceof EntitySpider) {
            return item == Items.SPIDER_EYE; // D-5: the string stays vanilla
        }
        return false;
    }

    /** The unified append face (entityDropItem shape — :1320 later spawns them, never self-spawn). */
    public static void addStack(java.util.List<net.minecraft.entity.item.EntityItem> list,
                                World world, EntityLivingBase e, ItemStack stack) {
        net.minecraft.entity.item.EntityItem it =
                new net.minecraft.entity.item.EntityItem(world, e.posX, e.posY, e.posZ, stack);
        it.setDefaultPickupDelay();
        list.add(it);
    }

    // --------------------------------------------------------------- families

    /** F3 cow — leather + well-gated beef with the ==1 nudge (R196:91-107). */
    public static void butcherCow(EntityLivingBase e, java.util.Random rnd, int level,
                                  java.util.List<net.minecraft.entity.item.EntityItem> list, World world) {
        int leather = rnd.nextInt(3) + 1; // :92 — no B, no gate
        boolean well = isWell(e);
        int beef = 0, nudge = 0, rB = -1;
        if (well) {
            beef = rnd.nextInt(3) + 1; // :99 part 1
            rB = rnd.nextInt(1 + level); // :99 part 2 — the B roll logged for the N window
            beef += rB;
            if (beef == 1 && rnd.nextInt(2) == 0) { // :100-102 the ==1-half nudge — cow ONLY
                beef++;
                nudge = 1;
            }
        }
        Item meat = e.isBurning() ? Items.COOKED_BEEF : Items.BEEF; // :105
        row("cow well=" + well + " lvl=" + level + " leather=" + leather + " rB=" + rB
                + " nudge=" + nudge + " beef=" + beef + " burning=" + e.isBurning());
        addStack(list, world, e, new ItemStack(Items.LEATHER, leather));
        if (beef > 0) {
            addStack(list, world, e, new ItemStack(meat, beef));
        }
    }

    /** F4 pig — the saddle untouched (vanilla after-super face), no nudge (R196:113-123). */
    public static void butcherPig(EntityLivingBase e, java.util.Random rnd, int level,
                                  java.util.List<net.minecraft.entity.item.EntityItem> list, World world) {
        boolean well = isWell(e);
        int pork = 0, rB = -1;
        if (well) {
            pork = rnd.nextInt(3) + 1; // :119 part 1
            rB = rnd.nextInt(1 + level); // :119 part 2
            pork += rB;
        }
        Item meat = e.isBurning() ? Items.COOKED_PORKCHOP : Items.PORKCHOP; // :122
        row("pig well=" + well + " lvl=" + level + " rB=" + rB + " pork=" + pork
                + " burning=" + e.isBurning() + " saddled=" + ((EntityPig) e).getSaddled());
        if (pork > 0) {
            addStack(list, world, e, new ItemStack(meat, pork));
        }
    }

    /**
     * F5 sheep — wool → mutton → leather, R196 roll ORDER preserved
     * (:101 → :106 → :116 — 终审判值位).
     */
    public static void butcherSheep(EntityLivingBase e, java.util.Random rnd, int level,
                                    java.util.List<net.minecraft.entity.item.EntityItem> list, World world) {
        EntitySheep sheep = (EntitySheep) e;
        boolean sheared = sheep.getSheared();
        boolean burning = e.isBurning();
        boolean wool = !sheared && !burning && rnd.nextInt(2) == 0; // :101-103 (②概率覆盖面 A-1, 条 263)
        boolean well = isWell(e);
        int mutton = 0, rB = -1;
        if (well) {
            mutton = rnd.nextInt(2); // :106 part 1
            rB = rnd.nextInt(1 + level); // :106 part 2
            mutton += rB;
            if (mutton < 1) {
                mutton = 1; // :107-109 floor
            }
        }
        boolean leather = rnd.nextInt(2) == 0; // :116-117
        Item meat = burning ? Items.COOKED_MUTTON : Items.MUTTON; // :112
        row("sheep sheared=" + sheared + " burning=" + burning + " color=" + sheep.getFleeceColor()
                + " well=" + well + " lvl=" + level + " rB=" + rB
                + " wool=" + (wool ? 1 : 0) + " mutton=" + mutton + " leather=" + (leather ? 1 : 0));
        if (wool) {
            addStack(list, world, e, new ItemStack(Item.getItemFromBlock(Blocks.WOOL),
                    1, sheep.getFleeceColor().getMetadata()));
        }
        addStack(list, world, e, new ItemStack(meat, mutton));
        if (leather) {
            addStack(list, world, e, new ItemStack(Items.LEATHER, 1));
        }
    }

    /**
     * F6 horse family — the six-consumer family (C-注1, 条 265:
     * instanceof shape ≡ six-class parallel). Llama rides the plain-meat
     * face with NO type-0 nudge (D-9 乙, 条 264 pin). The zombie flesh
     * face keeps its per-iteration fresh r(4) (C-8 variance face).
     */
    public static void butcherHorse(EntityLivingBase e, java.util.Random rnd, int level,
                                    java.util.List<net.minecraft.entity.item.EntityItem> list, World world) {
        Class<?> c = e.getClass();
        boolean plainHorse = c == EntityHorse.class;
        boolean zombie = c == EntityZombieHorse.class;
        boolean type4 = c == EntitySkeletonHorse.class;

        int n = rnd.nextInt(3) + 1; // :514 the base face (leather/bone/flesh)
        int flesh = 0, zeroed = 0;
        for (int i = 0; i < n; i++) { // :516-518 per-piece drops
            if (!zombie) {
                addStack(list, world, e, new ItemStack(type4 ? Items.BONE : Items.LEATHER, 1)); // :517
            } else if (rnd.nextInt(4) == 0) { // :507 per-iteration fresh roll
                zeroed++;
            } else {
                flesh++;
            }
        }
        int meat = 0;
        if (!zombie && !type4) { // :520 the meat face — horse/donkey/mule/llama ONLY (D-3/D-9 乙)
            meat = 1 + rnd.nextInt(1 + level); // :521
            if (plainHorse) {
                meat += rnd.nextInt(2); // :522-524 plain-horse-only
            }
            Item m = e.isBurning() ? Items.COOKED_BEEF : Items.BEEF; // :527
            addStack(list, world, e, new ItemStack(m, meat));
        }
        if (zombie) {
            addStack(list, world, e, new ItemStack(Items.ROTTEN_FLESH, flesh));
        }
        row("horse cls=" + c.getSimpleName() + " lvl=" + level + " n=" + n
                + " zeroed=" + zeroed + " baseFlesh=" + flesh + " meat=" + meat
                + " burning=" + e.isBurning());
    }

    /**
     * F7 spider — the eye OR gate, short-circuit PRESERVED:
     * {@code a = r(3); a==0 → eye} else {@code r(1+L) > 0} (R196:201).
     * {@code recentlyHit} comes from {@code LivingDropsEvent.isRecentlyHit()}
     * (vanilla {@code recentlyHit > 0} — the R196 same-source window).
     */
    public static void butcherSpider(EntityLivingBase e, java.util.Random rnd, int level,
                                     boolean recentlyHit,
                                     java.util.List<net.minecraft.entity.item.EntityItem> list, World world) {
        boolean eye = false;
        int a = -1;
        if (recentlyHit) {
            a = rnd.nextInt(3);
            if (a == 0) {
                eye = true; // short-circuit: the second roll never happens
            } else {
                eye = rnd.nextInt(1 + level) > 0;
            }
        }
        row("spider recent=" + recentlyHit + " lvl=" + level + " r3=" + a
                + " short=" + (a == 0) + " eye=" + (eye ? 1 : 0));
        if (eye) {
            addStack(list, world, e, new ItemStack(Items.SPIDER_EYE, 1));
        }
    }
}
