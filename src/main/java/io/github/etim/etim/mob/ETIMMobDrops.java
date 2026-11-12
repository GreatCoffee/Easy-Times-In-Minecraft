package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMGear;
import io.github.etim.etim.metal.ETIMItems;
import io.github.etim.etim.mixins.ETIMEntityLivingDropsAccessor;
import io.github.etim.etim.quality.EnumQuality;
import io.github.etim.etim.quality.ETIMQuality;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.monster.AbstractSkeleton;
import net.minecraft.entity.monster.EntitySkeleton;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.entity.monster.EntityZombieVillager;
import net.minecraft.entity.monster.EntityWitherSkeleton;
import net.minecraft.init.Items;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;

import java.util.Random;

/**
 * B-38 drop-face pack — the R196 death-drop rework, verbatim transposed to
 * the 1.12 carrier chain ({@code EntityLivingBase.onDeath :1300-1315} →
 * {@code dropLoot(boolean,int,DamageSource)} → the loot table + the
 * equipment rules). Faces and their R196 anchors:
 *
 * <ul>
 *   <li>the massive-fall few-items mercy gate — R196 EntityLivingBase :910
 *       {@code !has_taken_massive_fall_damage || rand < 0.1F}</li>
 *   <li>the skeleton table — R196 EntitySkeleton :148-187 (wither coal +
 *       skull rare; normal arrows; bones for all types)</li>
 *   <li>the zombie table — R196 EntityZombie :148-158 (rotten flesh +
 *       the nugget/seed rare-drop chain, base chance override :167-169
 *       {@code !isVillager && !isRevenant ? 200 : 50})</li>
 *   <li>the equipment rules — R196 EntityLiving :982-1020 (the massive-fall
 *       main gate :989-992, the hand quality-wear gate :993-1003, the
 *       hand/armor drop roll :1009-1016)</li>
 * </ul>
 *
 * <p>C-level simplifications (§3 of the 摸底): {@code picked_up_a_held_item}
 * is the R196 equipment-pickup system, absent from 1.12 — compiled as the
 * constant false; {@code isLongdead()} is the R196 base skeleton's constant
 * false (:377-379) — kept verbatim; the R196 iron-nugget and onion rare
 * entries have no 1.12 carrier and are dropped from their arrays; the R196
 * fall-damage clamp (:1125 {@code damage > 5 → 5}) is an R196 world-balance
 * face and is not transposed — the flag criterion stays
 * {@code damage >= maxHealth * 0.5}.</p>
 *
 * <p>Logging channel (AGENTS rule 9): every decision point emits a
 * {@code [DropLog]} line behind the {@code mobDebugLog} gate —
 * {@code [DropLog] fewitems gate flag=<b> mercy=<b> skipped=<b> entity=…} /
 * {@code [DropLog] skeleton type=<t> arrowRoll=<n> boneRoll=<n> rare=<b> entity=…} /
 * {@code [DropLog] zombie flesh=<b> rareRoll=<cutoff>/<chance> entity=…} /
 * {@code [DropLog] equip slot=… chance=… roll=… dropped=<b> entity=…}.</p>
 */
public final class ETIMMobDrops {

    private ETIMMobDrops() {
    }

    /** R196 EnumQuality.AVERAGE ordinal comparator (the 1.12 enum has none). */
    private static boolean isLowerThanAverage(ItemStack stack) {
        EnumQuality quality = ETIMQuality.get(stack);
        return quality != null && quality.ordinal() < EnumQuality.AVERAGE.ordinal();
    }

    /** R196 EntityLivingBase :910 — the massive-fall 10% mercy gate. */
    public static boolean massiveFallSkipsFewItems(EntityLivingBase entity) {
        boolean flag = hasMassiveFall(entity);
        boolean mercyRoll = flag && entity.getRNG().nextFloat() >= 0.1F;
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[DropLog] fewitems gate flag=" + flag
                    + " skipped=" + mercyRoll + " entity=" + simple(entity));
        }
        return mercyRoll;
    }

    /**
     * R196 :153-155/:166-168/:180-182 — the not-recently-hit reduction roll,
     * shared by every num_drops face.
     */
    private static int notRecentlyHitReduction(int numDrops, boolean recentlyHit, Random rand) {
        if (numDrops > 0 && !recentlyHit) {
            numDrops -= rand.nextInt(numDrops + 1);
        }
        return numDrops;
    }

    /**
     * R196 EntitySkeleton :148-187 verbatim; the type carrier = the 1.12
     * skeleton-family siblings (AbstractSkeleton → EntitySkeleton /
     * EntityWitherSkeleton / EntityStray; the R196 type-1 wither face
     * maps to {@code instanceof EntityWitherSkeleton}, the R196 type-2
     * attacker face has no 1.12 carrier, and a stray counts as normal
     * type 0 — 摸底 §3-C4).
     */
    public static void skeletonTable(AbstractSkeleton skeleton, boolean recentlyHit, int looting) {
        Random rand = skeleton.getRNG();
        int type = skeleton instanceof EntityWitherSkeleton ? 1 : 0;
        int arrowRoll = 0;
        int boneRoll = 0;
        boolean rare = false;
        if (type == 1) {
            int numDrops = rand.nextInt(3 + looting) - 1;
            numDrops = notRecentlyHitReduction(numDrops, recentlyHit, rand);
            for (int i = 0; i < numDrops; i++) {
                dropItem(skeleton, Items.COAL, 1);
            }
            if (recentlyHit && !hasMassiveFall(skeleton)
                    && rand.nextInt(baseChanceOfRareDrop(skeleton)) < 5 + looting * 2) {
                rare = true;
                dropStack(skeleton, new ItemStack(Items.SKULL, 1, 1));
            }
        } else if (type != 2) {
            int numDrops = rand.nextInt(2 + looting);
            numDrops = notRecentlyHitReduction(numDrops, recentlyHit, rand);
            if (isLongdead() && numDrops > 0) {
                numDrops = rand.nextInt(3) == 0 ? 1 : 0;
            }
            for (int i = 0; i < numDrops; i++) {
                // R196 :174-176 = isLongdead ? arrowAncientMetal : arrowRustedIron;
                // isLongdead() is the constant-false C-level face (摸底 §3-C2),
                // so the ancient-metal arm is dead code and is dropped.
                dropItem(skeleton, ETIMGear.arrowRustedIron, 1);
                arrowRoll++;
            }
        }

        int numDrops = rand.nextInt(3);
        numDrops = notRecentlyHitReduction(numDrops, recentlyHit, rand);
        for (int i = 0; i < numDrops; i++) {
            dropItem(skeleton, Items.BONE, 1);
            boneRoll++;
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[DropLog] skeleton type=" + type + " arrowRoll=" + arrowRoll
                    + " boneRoll=" + boneRoll + " rare=" + rare + " entity=" + simple(skeleton));
        }
    }

    /** R196 EntityZombie :167-169 transposed; the carriers = the 1.12 subclasses. */
    private static int zombieRareChance(EntityZombie zombie) {
        boolean revenant = zombie instanceof ETIMEntityRevenant;
        return !isVillagerZombie(zombie) && !revenant ? 200 : 50;
    }

    /** R196 {@code isVillager()} carrier = the 1.12 zombie-villager subclass. */
    private static boolean isVillagerZombie(EntityZombie zombie) {
        return zombie instanceof EntityZombieVillager;
    }

    /** R196 EntityZombie :148-158 verbatim. */
    public static void zombieTable(EntityZombie zombie, boolean recentlyHit, int looting) {
        Random rand = zombie.getRNG();
        boolean flesh = false;
        boolean rare = false;
        if (rand.nextFloat() < (recentlyHit ? 0.5F : 0.25F)) {
            flesh = true;
            dropItem(zombie, Items.ROTTEN_FLESH, 1);
        }

        if (recentlyHit && !hasMassiveFall(zombie)
                && rand.nextInt(zombieRareChance(zombie)) < 5 + looting * 2) {
            rare = true;
            Item[] rareDrops = isVillagerZombie(zombie) ? VILLAGER_RARE_DROPS : STANDARD_RARE_DROPS;
            dropItem(zombie, rareDrops[rand.nextInt(rareDrops.length)], 1);
        }
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[DropLog] zombie flesh=" + flesh + " rare=" + rare
                    + " chance=" + zombieRareChance(zombie) + " entity=" + simple(zombie));
        }
    }

    /**
     * R196 EntityZombie :11-12 rare arrays. C-level: the R196 iron-nugget and
     * onion entries have no 1.12 carrier and are omitted (§3-C3).
     */
    private static final Item[] STANDARD_RARE_DROPS = {
            ETIMItems.nuggetCopper, ETIMItems.nuggetSilver, Items.GOLD_NUGGET
    };
    private static final Item[] VILLAGER_RARE_DROPS = {
            Items.WHEAT_SEEDS, Items.PUMPKIN_SEEDS, Items.MELON_SEEDS, Items.CARROT, Items.POTATO
    };

    /** R196 EntityLivingBase :888-890 base value. */
    private static int baseChanceOfRareDrop(EntityLivingBase entity) {
        return 200;
    }

    /** R196 :377-379 — the base skeleton's constant false. */
    private static boolean isLongdead() {
        return false;
    }

    private static boolean hasMassiveFall(EntityLivingBase entity) {
        return ETIMMassiveFallDuck.carries(entity)
                && ((ETIMMassiveFallDuck) entity).etim$hasTakenMassiveFallDamage();
    }

    /**
     * R196 EntityLiving :982-1020 verbatim, the 1.12 carrier = the
     * hand + armor equipment slots (the R196 equipment[] hand-first layout;
     * the 1.12 off-hand has no R196 counterpart — C level §3-C1 keeps the
     * R196 slot set). picked_up_a_held_item compiles as constant false.
     */
    public static void dropEquipmentRules(EntityLiving living, boolean recentlyHit, int looting) {
        EntityEquipmentSlot[] slots = {
                EntityEquipmentSlot.MAINHAND, EntityEquipmentSlot.FEET,
                EntityEquipmentSlot.LEGS, EntityEquipmentSlot.CHEST, EntityEquipmentSlot.HEAD
        };
        for (EntityEquipmentSlot slot : slots) {
            ItemStack stack = living.getItemStackFromSlot(slot);
            if (stack == null || stack.isEmpty()) {
                continue;
            }
            float dropChance = slotChance(living, slot);
            boolean alwaysDrop = dropChance > 1.0F;
            boolean isHeldItem = slot == EntityEquipmentSlot.MAINHAND;
            boolean dropped = false;
            // R196 :989-992 main gate (picked_up_a_held_item = false)
            if (!hasMassiveFall(living)
                    || !(dropChance < 1.0F)
                    || !(living.getRNG().nextFloat() < 0.9F)) {
                // R196 :993-1003 hand quality-wear gate
                if (isHeldItem
                        && !stack.isItemEnchanted()
                        && stack.isItemDamaged()
                        && ETIMQuality.hasQualityChannel(stack.getItem())
                        && isLowerThanAverage(stack)) {
                    float fractionDamaged = (float) stack.getItemDamage() / stack.getMaxDamage();
                    if (fractionDamaged > 0.7F && living.getRNG().nextFloat() < 0.75F) {
                        continue; // worn-out low-quality hand item is not dropped
                    }
                }

                // R196 :1009-1016 drop roll (picked_up_a_held_item = false)
                boolean handArm = isHeldItem && (recentlyHit || living.getRNG().nextFloat() < 0.05F);
                float roll = living.getRNG().nextFloat() - looting * 0.01F;
                boolean armorArm = (recentlyHit || alwaysDrop) && roll < dropChance;
                if (handArm || armorArm) {
                    living.entityDropItem(stack, 0.0F);
                    living.setItemStackToSlot(slot, ItemStack.EMPTY);
                    dropped = true;
                }
            }
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[DropLog] equip slot=" + slot.getName()
                        + " chance=" + dropChance + " dropped=" + dropped
                        + " entity=" + simple(living));
            }
        }
    }

    /** 1.12 slot-chance carrier (EntityLiving :83-86 arrays; the vanilla :1034-1044 switch). */
    private static float slotChance(EntityLiving living, EntityEquipmentSlot slot) {
        float[] chances = slot.getSlotType() == EntityEquipmentSlot.Type.HAND
                ? ((ETIMEntityLivingDropsAccessor) (Object) living).etim$inventoryHandsDropChances()
                : ((ETIMEntityLivingDropsAccessor) (Object) living).etim$inventoryArmorDropChances();
        return chances[slot.getIndex()];
    }

    private static void dropItem(EntityLiving living, Item item, int count) {
        living.entityDropItem(new ItemStack(item, count), 0.0F);
    }

    private static void dropStack(EntityLiving living, ItemStack stack) {
        living.entityDropItem(stack, 0.0F);
    }

    private static String simple(EntityLivingBase entity) {
        String name = entity.getClass().getSimpleName();
        return name + "#" + entity.getEntityId();
    }
}
