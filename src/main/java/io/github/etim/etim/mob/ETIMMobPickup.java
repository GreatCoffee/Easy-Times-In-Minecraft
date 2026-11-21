package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mixins.EntityItemAgeAccessor;
import io.github.etim.etim.mixins.EntityLivingBaseAccessor;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.monster.AbstractSkeleton;
import net.minecraft.entity.monster.EntityEnderman;
import net.minecraft.entity.monster.EntityPigZombie;
import net.minecraft.entity.monster.EntitySnowman;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.entity.passive.EntityAnimal;
import net.minecraft.entity.passive.EntityChicken;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityOcelot;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.entity.passive.EntityTameable;
import net.minecraft.entity.passive.EntityWolf;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.init.SoundEvents;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.SoundCategory;
import net.minecraft.util.math.AxisAlignedBB;

import java.util.List;

/**
 * B-53 census D :141 — the R196 ground pickup loop
 * ({@code EntityLiving.java:635-690}).
 *
 * <p>Only {@code canPickUpLoot()} mobs run this lane. R196 arms it on
 * skeleton/zombie only ({@code :239/:277}); the 1.12 spawn roll is forced
 * true by the two spawn-tail mixins. The branches are, in order: eat
 * (50% max-health heal, undead excluded), repair (50% max-health heal),
 * valuable (item id into {@code contained_items}). One pickup per tick,
 * then {@code break}; cooldown 400 ticks (valuable 40). The stack is
 * shrunk, an empty stack kills the item entity, otherwise its age is set
 * to -18000; the mob's despawn counter is refreshed by -2400.</p>
 *
 * <p>Livestock already eat through {@link ETIMLivestockEvents#groundEatTick}
 * (B-11) and never set {@code canPickUpLoot}, so the two lanes cannot
 * double-eat. Skeletons/snowmen also carry the B-35 repair AI; the shared
 * cooldown (duck or livestock state) stops the second lane from firing on
 * the same tick.</p>
 */
public final class ETIMMobPickup {

    private static final int COOLDOWN_EAT_OR_REPAIR = 400;
    private static final int COOLDOWN_VALUABLE = 40;

    private ETIMMobPickup() {
    }

    public static void tick(EntityLiving mob) {
        if (ETIMConfig.mobDebugLog && mob.ticksExisted == 20
                && (mob instanceof EntityZombie || mob instanceof AbstractSkeleton)) {
            ETIM.LOGGER.info("[PickupLog] gate flag=" + ETIMConfig.mobPickupR196
                    + " canPickUp=" + mob.canPickUpLoot()
                    + " cooldown=" + cooldown(mob)
                    + " entity=" + mob.getClass().getSimpleName() + "#" + mob.getEntityId());
        }
        if (!ETIMConfig.mobPickupR196) {
            return;
        }
        if (mob.world.isRemote || !mob.canPickUpLoot() || mob.isDead || mob.getHealth() <= 0.0F) {
            return;
        }
        if (cooldown(mob) > 0) {
            return; // the decrement rides MixinEntityLiving.onUpdate
        }
        if (ETIMConfig.mobDebugLog && mob.ticksExisted % 20 == 0) {
            AxisAlignedBB probeBox = mob.getEntityBoundingBox().grow(1.0D, 0.25D, 1.0D);
            int near = mob.world.getEntitiesWithinAABB(EntityItem.class, probeBox).size();
            if (near > 0) {
                ETIM.LOGGER.info("[PickupLog] scan cooldown=" + cooldown(mob)
                        + " near=" + near
                        + " entity=" + mob.getClass().getSimpleName() + "#" + mob.getEntityId());
            }
        }
        boolean refrainsFromEating = mob instanceof EntityTameable
                && ((EntityTameable) mob).isTamed()
                && mob.getHealth() / mob.getMaxHealth() > 0.5F;

        AxisAlignedBB box = mob.getEntityBoundingBox().grow(1.0D, 0.25D, 1.0D); // R196 :438-447
        List<EntityItem> items = mob.world.getEntitiesWithinAABB(EntityItem.class, box);
        for (EntityItem itemEntity : items) {
            if (itemEntity.isDead || !canBePickedUpBy(itemEntity, mob)) {
                continue;
            }
            ItemStack stack = itemEntity.getItem();
            if (stack.isEmpty()) {
                continue;
            }
            int branch;
            if (!refrainsFromEating && willEat(mob, stack)) {
                branch = 0;
            } else if (willUseForRepair(mob, stack)) {
                branch = 1;
            } else if (willPickupAsValuable(mob, stack)) {
                branch = 2;
            } else {
                continue;
            }

            float healthBefore = mob.getHealth();
            Item picked = stack.getItem();
            if (branch == 0) {
                onFoodEaten(mob, stack);
            } else if (branch == 1) {
                mob.heal(mob.getMaxHealth() * 0.5F); // R196 onRepairItemPickup :1348-1350
            } else if (mob instanceof ETIMContainedItemsDuck) {
                ((ETIMContainedItemsDuck) mob).etim$addContainedItem(Item.getIdFromItem(picked));
            }

            int appliedCooldown = branch == 2 ? COOLDOWN_VALUABLE : COOLDOWN_EAT_OR_REPAIR;
            setCooldown(mob, appliedCooldown);
            stack.shrink(1); // R196 :668
            if (stack.isEmpty()) {
                itemEntity.setDead();
            } else {
                ((EntityItemAgeAccessor) itemEntity).setAge(-18000); // R196 :674
            }
            refreshDespawnCounter(mob);
            playPickupSound(mob);

            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[PickupLog] src=" + sourceName(branch)
                        + " item=" + String.valueOf(picked.getRegistryName())
                        + " hpBefore=" + String.format("%.2f", healthBefore)
                        + " hpAfter=" + String.format("%.2f", mob.getHealth())
                        + " cooldown=" + appliedCooldown
                        + " contained=" + (mob instanceof ETIMContainedItemsDuck
                                ? ((ETIMContainedItemsDuck) mob).etim$getContainedItems().size() : 0)
                        + " entity=" + mob.getClass().getSimpleName() + "#" + mob.getEntityId());
            }
            break; // R196 :690 — one pickup per tick
        }
    }

    private static int cooldown(EntityLiving mob) {
        ETIMLivestock.IState state = ETIMLivestock.get(mob);
        if (state != null) {
            return state.getPickupCooldown();
        }
        return ((ETIMRepairCooldownDuck) mob).etim$getRepairPickupCooldown();
    }

    private static void setCooldown(EntityLiving mob, int value) {
        ETIMLivestock.IState state = ETIMLivestock.get(mob);
        if (state != null) {
            state.setPickupCooldown(value);
        }
        ((ETIMRepairCooldownDuck) mob).etim$setRepairPickupCooldown(value);
    }

    /** R196 canBePickedUpBy :198-226, 1.12 carriers only. */
    private static boolean canBePickedUpBy(EntityItem item, EntityLiving mob) {
        if (item.cannotPickup()) {
            return false;
        }
        if (item.isBurning() && mob.isImmuneToFire()) {
            return false;
        }
        return mob.canEntityBeSeen(item);
    }

    private static boolean willEat(EntityLiving mob, ItemStack stack) {
        if (mob instanceof EntityAnimal) {
            ETIMLivestock.IState state = ETIMLivestock.get(mob);
            if (state != null) {
                return ETIMLivestockEvents.isFoodItemPublic(mob, stack)
                        && ETIMLivestockEvents.willEatCause(mob, state, stack) == null;
            }
        }
        return isFoodItem(mob, stack) && canEat(mob);
    }

    private static boolean canEat(EntityLiving mob) {
        return !mob.isChild() && !mob.isDead && mob.getHealth() > 0.0F;
    }

    /** R196 per-species isFoodItem overrides, 1.12 item mapping. */
    private static boolean isFoodItem(EntityLiving mob, ItemStack stack) {
        Item item = stack.getItem();
        if (mob instanceof EntityChicken) {
            return item == Items.WHEAT_SEEDS; // EntityChicken :148
        }
        if (mob instanceof EntityCow || mob instanceof EntitySheep) {
            return item == Items.WHEAT; // EntityCow :120 / EntitySheep :272
        }
        if (mob instanceof EntityOcelot) {
            return item == Items.FISH && stack.getMetadata() <= 1; // EntityOcelot :189 raw fish
        }
        if (mob instanceof EntityPig) {
            // EntityPig :162 carrot, or ItemBlock of Block.mushroomBrown
            return item == Items.CARROT || item == Item.getItemFromBlock(Blocks.BROWN_MUSHROOM);
        }
        if (mob instanceof EntityWolf || mob instanceof EntityZombie) {
            return isMeat(item); // EntityWolf :480 / EntityZombie :400
        }
        return false;
    }

    /** R196 ItemMeat family; 1.12 has no material list, so this is the whitelist. */
    private static boolean isMeat(Item item) {
        return item == Items.PORKCHOP || item == Items.COOKED_PORKCHOP
                || item == Items.BEEF || item == Items.COOKED_BEEF
                || item == Items.CHICKEN || item == Items.COOKED_CHICKEN
                || item == Items.MUTTON || item == Items.COOKED_MUTTON
                || item == Items.RABBIT || item == Items.COOKED_RABBIT;
    }

    private static boolean willUseForRepair(EntityLiving mob, ItemStack stack) {
        if (mob.getHealth() >= mob.getMaxHealth()) {
            return false; // R196 :1344 healthFraction < 1
        }
        if (mob instanceof AbstractSkeleton) {
            return stack.getItem() == Items.BONE; // EntitySkeleton :353
        }
        if (mob instanceof EntitySnowman) {
            return stack.getItem() == Items.SNOWBALL; // EntitySnowman :117
        }
        return false;
    }

    private static boolean willPickupAsValuable(EntityLiving mob, ItemStack stack) {
        if (mob instanceof EntityPigZombie) {
            // R196 EntityPigZombie :210 subtype==0 && damage==0; 1.12 has no
            // subtype, so the unarmed main hand is the closest carrier.
            return mob.getHeldItemMainhand().isEmpty() && isGold(stack.getItem());
        }
        if (mob instanceof EntityEnderman) {
            // R196 EntityEnderman :135; 1.12 endermen never set canPickUpLoot,
            // so this is the faithful dead branch.
            return stack.getItem() == Items.ENDER_PEARL || stack.getItem() == Items.ENDER_EYE;
        }
        return false;
    }

    /** R196 Item.hasMaterial(MATERIAL.gold) whitelist; gold tools/armour stay C. */
    private static boolean isGold(Item item) {
        return item == Items.GOLD_INGOT
                || item == Items.GOLD_NUGGET
                || item == Item.getItemFromBlock(Blocks.GOLD_BLOCK)
                || item == Items.GOLDEN_APPLE
                || item == Items.GOLDEN_CARROT;
    }

    private static void onFoodEaten(EntityLiving mob, ItemStack stack) {
        // R196 EntityLiving.onFoodEaten :1330-1332 — undead never heal.
        if (!mob.isEntityUndead()) {
            mob.heal(mob.getMaxHealth() * 0.5F);
        }
    }

    private static void refreshDespawnCounter(EntityLiving mob) {
        // R196 refreshDespawnCounter(-2400); 1.12 idleTime is the despawn counter.
        if (mob instanceof EntityLivingBaseAccessor) {
            ((EntityLivingBaseAccessor) mob).etim$setIdleTime(mob.getIdleTime() - 2400);
        }
    }

    private static void playPickupSound(EntityLiving mob) {
        float pitch = ((mob.world.rand.nextFloat() - mob.world.rand.nextFloat()) * 0.7F + 1.0F) * 2.0F;
        mob.world.playSound(null, mob.posX, mob.posY, mob.posZ,
                SoundEvents.ENTITY_ITEM_PICKUP, SoundCategory.NEUTRAL, 0.2F, pitch);
    }

    private static String sourceName(int branch) {
        if (branch == 0) {
            return "food";
        }
        if (branch == 1) {
            return "repair";
        }
        return "valuable";
    }
}
