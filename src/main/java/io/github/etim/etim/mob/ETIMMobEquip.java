package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.metal.ETIMGear;
import io.github.etim.etim.quality.ETIMQuality;
import io.github.etim.etim.quality.EnumQuality;
import net.minecraft.enchantment.EnchantmentHelper;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.SharedMonsterAttributes;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.init.Items;
import net.minecraft.inventory.EntityEquipmentSlot;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.util.math.MathHelper;
import net.minecraft.world.EnumDifficulty;
import net.minecraft.world.World;

import java.util.ArrayList;
import java.util.List;

/**
 * B3 mob-equipment face (批文 §〇-获取机制面): the R196 zombie/skeleton
 * random-equipment chain ported 1:1. The mixins cancel
 * {@code setEquipmentBasedOnDifficulty} at HEAD and hand the entity here —
 * TAIL injection would leave the vanilla iron-sword/armor face behind
 * (终审伪码批注).
 *
 * <p>First-hand sources:</p>
 * <ul>
 *   <li>zombie weapon: {@code EntityZombie.java:171-201} — chance 0.05F
 *       (villager 0.2F) + weighted lists with day≥10/20 gates. The
 *       {@code isInTournamentMode} gates stay dropped (ETIM has no
 *       tournament face, 批文 §三 gate 例外); the {@code cudgelWood}/
 *       {@code clubWood}/{@code scythe} rows drop — no ETIM items
 *       (C 级登记 + 裁决 2 挂账).</li>
 *   <li>skeleton weapon: {@code EntitySkeleton.java:189-202} — the R196
 *       type-2 melee face mapped onto 1.12 normal skeletons (C 级登记:
 *       1.12 has no melee skeleton variant), 1/20 + day gates,
 *       {@code randomizeForMob(false)}.</li>
 *   <li>armor: {@code EntityLiving.java:1022-1052 addRandomArmor} — 0.15F ×
 *       tension gate, tier = nextInt(2) + 3×0.095F, per-slot break
 *       HARD 0.1 / else 0.25, empty slot → tier table (:1075-1128).</li>
 *   <li>tension: {@code World.java:5603-5617 getTensionFactorForBlock} —
 *       inhabitedTime term + moon 0.25 + difficulty scaling/clamp.</li>
 *   <li>mob damage: {@code ItemStack.java:980-1005} — enchanted 0.5-0.8 /
 *       plain 0.7-1.0 fraction × maxDamage; the wood/leather downgrade runs
 *       only when the quality sidecar is present (fresh mob loot has none —
 *       the R196 default-quality face has no 1.12 carrier, C 级登记).</li>
 * </ul>
 */
public final class ETIMMobEquip {

    /** R196 slot order (var3 walk :1038): boots/legs/chest/head. */
    private static final EntityEquipmentSlot[] SLOTS = {
            EntityEquipmentSlot.FEET, EntityEquipmentSlot.LEGS,
            EntityEquipmentSlot.CHEST, EntityEquipmentSlot.HEAD};

    private ETIMMobEquip() {
    }

    /** [MobLog] row — the B3 判行通道 (config key mobEquipDebugLog). */
    private static void log(String row) {
        if (ETIMConfig.mobEquipDebugLog) {
            ETIM.LOGGER.info("[MobLog] " + row + " [server]");
        }
    }

    // ==================== tension (World.java:5603-5617, 1:1) ====================

    /** R196 getLocationTensionFactor (:5599-5601). */
    public static float getTensionFactor(World world, double x, double y, double z) {
        return getTensionFactorForBlock(world, MathHelper.floor(x), MathHelper.floor(y), MathHelper.floor(z));
    }

    /** R196 getTensionFactorForBlock (:5603-5617), 1.12 API names. */
    public static float getTensionFactorForBlock(World world, int x, int y, int z) {
        float tension = 0.0F;
        boolean hard = world.getDifficulty() == EnumDifficulty.HARD;
        if (world.isBlockLoaded(new BlockPos(x, y, z))) {
            float moon = world.getCurrentMoonPhaseFactor();
            tension += MathHelper.clamp(
                    world.getChunk(x, z).getInhabitedTime() / 3600000.0F, 0.0F, 1.0F) * (hard ? 1.0F : 0.75F);
            tension += moon * 0.25F;
        }
        if (world.getDifficulty().getId() < 2) {
            tension *= world.getDifficulty().getId() / 2.0F;
        }
        return MathHelper.clamp(tension, 0.0F, hard ? 1.5F : 1.0F);
    }

    // ==================== randomize (ItemStack.java:1024-1031 + :980-1005) ====================

    /** R196 enchantEquipment (EntityLiving.java:1130-1135). */
    private static void enchantEquipment(EntityLiving owner, ItemStack stack) {
        float tension = getTensionFactor(owner.world, owner.posX, owner.posY, owner.posZ);
        if (owner.getRNG().nextFloat() < 0.1F * tension) {
            EnchantmentHelper.addRandomEnchantment(owner.getRNG(), stack,
                    (int) (5.0F + tension * owner.getRNG().nextInt(18)), false);
        }
    }

    /** R196 randomizeForMob (:1024-1031): enchant (optional) + mob damage. */
    private static ItemStack randomizeForMob(EntityLiving owner, ItemStack stack, boolean mayBeEnchanted) {
        if (mayBeEnchanted) {
            enchantEquipment(owner, stack);
        }
        applyRandomItemStackDamageForMob(owner, stack);
        return stack;
    }

    /** R196 applyRandomItemStackDamageForMob (:980-1005). */
    private static void applyRandomItemStackDamageForMob(EntityLiving owner, ItemStack stack) {
        if (!stack.isItemStackDamageable()) {
            return;
        }
        // :983-995 the wood/leather downgrade — sidecar-present stacks only
        // (fresh mob loot carries no sidecar; R196 default-quality face has
        // no 1.12 carrier, C 级登记).
        if (ETIMConfig.qualitySystem && ETIMQuality.has(stack)) {
            EnumQuality quality = ETIMQuality.get(stack);
            if (quality != null && quality.ordinal() >= EnumQuality.AVERAGE.ordinal()
                    && !stack.isItemEnchanted() && isWoodOrLeatherCarrier(stack)) {
                EnumQuality lowered = EnumQuality.values()[Math.max(0, quality.ordinal() - 1)];
                ETIMQuality.set(stack, lowered);
                log("quality downgrade item=" + stack.getItem().getRegistryName() + " to=" + lowered);
            }
        }
        float fraction = (stack.isItemEnchanted() ? 0.5F : 0.7F) + 0.3F * owner.getRNG().nextFloat();
        int damage = (int) (stack.getMaxDamage() * fraction);
        if (damage >= stack.getMaxDamage()) {
            damage = stack.getMaxDamage() - 1;
        }
        stack.setItemDamage(damage);
    }

    /** R196 :993 wood/leather carrier face (1.12: wood ToolMaterial / leather armor). */
    private static boolean isWoodOrLeatherCarrier(ItemStack stack) {
        Item item = stack.getItem();
        if (item instanceof net.minecraft.item.ItemTool
                && "WOOD".equals(((net.minecraft.item.ItemTool) item).getToolMaterialName())) {
            return true;
        }
        return item instanceof net.minecraft.item.ItemArmor
                && ((net.minecraft.item.ItemArmor) item).getArmorMaterial()
                == net.minecraft.item.ItemArmor.ArmorMaterial.LEATHER;
    }

    // ==================== armor (EntityLiving.java:1022-1052 + tier table :1075-1128) ====================

    /** R196 addRandomArmor (:1022-1052) — gates, tier rolls, slot walk, tier table. */
    public static void addRandomArmor(EntityLiving entity) {
        if (entity.getRNG().nextFloat() >= 0.15F
                * getTensionFactor(entity.world, entity.posX, entity.posY, entity.posZ)) {
            return;
        }
        int tier = entity.getRNG().nextInt(2);
        float slotBreak = entity.world.getDifficulty() == EnumDifficulty.HARD ? 0.1F : 0.25F;
        if (entity.getRNG().nextFloat() < 0.095F) {
            tier++;
        }
        if (entity.getRNG().nextFloat() < 0.095F) {
            tier++;
        }
        if (entity.getRNG().nextFloat() < 0.095F) {
            tier++;
        }
        // :1038 head→chest→legs→boots walk; :1040 break checks skip the head.
        for (int var3 = 3; var3 >= 0; var3--) {
            EntityEquipmentSlot slot = SLOTS[var3];
            if (var3 < 3 && entity.getRNG().nextFloat() < slotBreak) {
                break;
            }
            if (entity.getItemStackFromSlot(slot).isEmpty()) {
                Item piece = getArmorItemForSlot(var3 + 1, tier);
                if (piece != null) {
                    entity.setItemStackToSlot(slot,
                            randomizeForMob(entity, new ItemStack(piece), true));
                    log("mob armor entity=" + entity.getName() + " slot=" + slot
                            + " item=" + piece.getRegistryName() + " tier=" + tier);
                }
            }
        }
    }

    /** R196 getArmorItemForSlot (:1075-1128) — the five-tier ladder; every rung exists in ETIM. */
    private static Item getArmorItemForSlot(int slot, int tier) {
        switch (slot) {
            case 4: // head
                if (tier == 0) return Items.LEATHER_HELMET;
                if (tier == 1) return ETIMGear.gear("chain_helmet_rusted_iron");
                if (tier == 2) return ETIMGear.gear("chain_helmet_copper");
                if (tier == 3) return ETIMGear.gear("helmet_rusted_iron");
                if (tier == 4) return ETIMGear.gear("helmet_copper");
                break;
            case 3: // chest
                if (tier == 0) return Items.LEATHER_CHESTPLATE;
                if (tier == 1) return ETIMGear.gear("chain_chestplate_rusted_iron");
                if (tier == 2) return ETIMGear.gear("chain_chestplate_copper");
                if (tier == 3) return ETIMGear.gear("chestplate_rusted_iron");
                if (tier == 4) return ETIMGear.gear("chestplate_copper");
                break;
            case 2: // legs
                if (tier == 0) return Items.LEATHER_LEGGINGS;
                if (tier == 1) return ETIMGear.gear("chain_leggings_rusted_iron");
                if (tier == 2) return ETIMGear.gear("chain_leggings_copper");
                if (tier == 3) return ETIMGear.gear("leggings_rusted_iron");
                if (tier == 4) return ETIMGear.gear("leggings_copper");
                break;
            case 1: // feet
                if (tier == 0) return Items.LEATHER_BOOTS;
                if (tier == 1) return ETIMGear.gear("chain_boots_rusted_iron");
                if (tier == 2) return ETIMGear.gear("chain_boots_copper");
                if (tier == 3) return ETIMGear.gear("boots_rusted_iron");
                if (tier == 4) return ETIMGear.gear("boots_copper");
                break;
            default:
                break;
        }
        return null;
    }

    // ==================== zombie (EntityZombie.java:171-205) ====================

    /** R196 zombie addRandomEquipment = addRandomWeapon + addRandomArmor (:203-206). */
    public static void zombieEquip(EntityZombie zombie) {
        // B-M1: the static helper has no polymorphic dispatch — the revenant
        // subclass rides the zombie call site, so branch first (R196
        // EntityRevenant :38-44 = the constant full rusted-iron table, no
        // chance gate).
        if (zombie instanceof ETIMEntityRevenant) {
            rustedLordEquip(zombie);
            return;
        }
        addRandomZombieWeapon(zombie);
        addRandomArmor(zombie);
    }

    /** R196 skeleton addRandomWeapon + addRandomArmor (:204-207). */
    public static void skeletonEquip(EntityLiving skeleton) {
        // B-M1 dispatch: the bone lord (constant rusted-iron table) and the
        // bone-lord troop (pending type handoff, R196 onSpawnWithEgg :218-231)
        // branch before the folded natural-skeleton face.
        if (skeleton instanceof ETIMEntityBoneLord) {
            rustedLordEquip(skeleton);
            return;
        }
        Integer pendingType = PENDING_TROOP_TYPE.remove(skeleton);
        if (pendingType != null) {
            troopEquip(skeleton, pendingType);
            return;
        }
        addRandomSkeletonWeapon(skeleton);
        addRandomArmor(skeleton);
    }

    /**
     * R196 EntityRevenant :22-44 / EntityBoneLord :23-45 — the constant
     * rusted-iron face: the shared weapon table (sword w2, +battle axe
     * day≥10, +war hammer day≥20) plus the full four-piece rusted armor,
     * every stack randomizeForMob(true), no chance gate.
     */
    private static void rustedLordEquip(EntityLiving lord) {
        int day = getDayOfWorld(lord.world);
        List<Object[]> items = new ArrayList<>();
        items.add(new Object[]{ETIMGear.gear("sword_rusted_iron"), 2}); // :24
        if (day >= 10) {
            items.add(new Object[]{ETIMGear.gear("battle_axe_rusted_iron"), 1}); // :26-27
        }
        if (day >= 20) {
            items.add(new Object[]{ETIMGear.gear("war_hammer_rusted_iron"), 1}); // :30-31
        }
        Object[] entry = weightedRandom(lord, items);
        Item weapon = (Item) entry[0];
        lord.setItemStackToSlot(EntityEquipmentSlot.MAINHAND,
                randomizeForMob(lord, new ItemStack(weapon), true));
        // :40-43 — the full set, slot walk boots/legs/chest/head.
        equipRustedPiece(lord, EntityEquipmentSlot.FEET, "boots_rusted_iron");
        equipRustedPiece(lord, EntityEquipmentSlot.LEGS, "leggings_rusted_iron");
        equipRustedPiece(lord, EntityEquipmentSlot.CHEST, "chestplate_rusted_iron");
        equipRustedPiece(lord, EntityEquipmentSlot.HEAD, "helmet_rusted_iron");
        log("mob lord equip entity=" + lord.getName() + " weapon=" + weapon.getRegistryName());
    }

    private static void equipRustedPiece(EntityLiving lord, EntityEquipmentSlot slot, String gearName) {
        lord.setItemStackToSlot(slot,
                randomizeForMob(lord, new ItemStack(ETIMGear.gear(gearName)), true));
    }

    /**
     * R196 EntitySkeleton onSpawnWithEgg type faces (:218-231 + :189-202) —
     * the bone-lord troop equip (T2① 兵团装备面): type 0 archer (bow +
     * armor), type 1 nether melee (iron sword, quality POOR, attack 4, no
     * armor), type 2 melee (1/20 + day≥10 rusted weapon else bare hands —
     * the clubWood row drops, C-1 — + armor). The follow-up setCombatTask in
     * onInitialSpawn binds the AI by the held item.
     */
    private static void troopEquip(EntityLiving skeleton, int type) {
        if (type == 1) {
            ItemStack sword = new ItemStack(net.minecraft.init.Items.IRON_SWORD);
            io.github.etim.etim.quality.ETIMQuality.set(sword, io.github.etim.etim.quality.EnumQuality.POOR);
            skeleton.setItemStackToSlot(EntityEquipmentSlot.MAINHAND, randomizeForMob(skeleton, sword, false));
            skeleton.getEntityAttribute(SharedMonsterAttributes.ATTACK_DAMAGE).setBaseValue(4.0); // :226
            log("mob troop equip entity=" + skeleton.getName() + " type=1 iron sword");
            return;
        }
        if (type == 2) {
            int day = getDayOfWorld(skeleton.world);
            if (skeleton.getRNG().nextInt(20) == 0 && day >= 10) {
                Item melee = day >= 20 && !skeleton.getRNG().nextBoolean()
                        ? ETIMGear.gear("sword_rusted_iron") : ETIMGear.gear("dagger_rusted_iron");
                skeleton.setItemStackToSlot(EntityEquipmentSlot.MAINHAND,
                        randomizeForMob(skeleton, new ItemStack(melee), false));
                log("mob troop equip entity=" + skeleton.getName() + " type=2 melee=" + melee.getRegistryName());
            } else {
                log("mob troop equip entity=" + skeleton.getName() + " type=2 bare (club dropped, C-1)");
            }
            addRandomArmor(skeleton); // :206 addRandomEquipment second half
            return;
        }
        // type 0 — the archer: bow + armor (:201 fallback / :232 addRandomEquipment).
        skeleton.setItemStackToSlot(EntityEquipmentSlot.MAINHAND,
                randomizeForMob(skeleton, new ItemStack(Items.BOW), true));
        addRandomArmor(skeleton);
        log("mob troop equip entity=" + skeleton.getName() + " type=0 bow");
    }

    /**
     * Pending troop-type handoff: the summon rolls the R196 skeleton type
     * before the troop's own onInitialSpawn runs (the equip chain fires
     * inside it via the mixin), so the rolled type parks here and
     * {@link #skeletonEquip} picks it up (one-shot, WeakHashMap-cleaned).
     */
    private static final java.util.Map<EntityLiving, Integer> PENDING_TROOP_TYPE =
            new java.util.WeakHashMap<>();

    public static void setPendingTroopType(EntityLiving skeleton, int type) {
        PENDING_TROOP_TYPE.put(skeleton, type);
    }

    /** R196 addRandomWeapon (:171-201) — chance/weights/day gates 1:1. */
    private static void addRandomZombieWeapon(EntityZombie zombie) {
        boolean villager = zombie instanceof net.minecraft.entity.monster.EntityZombieVillager;
        if (zombie.getRNG().nextFloat() >= (villager ? 0.2F : 0.05F)) {
            return;
        }
        int day = getDayOfWorld(zombie.world);
        List<Object[]> items = new ArrayList<>();
        // :174-175 the shared head rows.
        items.add(new Object[]{Items.WOODEN_SHOVEL, 1});
        items.add(new Object[]{ETIMGear.gear("shovel_rusted_iron"), 2});
        if (day >= 10) {
            items.add(new Object[]{ETIMGear.gear("hatchet_rusted_iron"), 1}); // :176-178
        }
        if (villager) {
            // :180-190 — the scythe row rides again (the item landed in the
            // scythe/knife batch; T4① 载体行填回, no day gate in R196 :182).
            items.add(new Object[]{ETIMGear.gear("shears_rusted_iron"), 1});
            items.add(new Object[]{ETIMGear.gear("scythe_rusted_iron"), 1});
            if (day >= 10) {
                items.add(new Object[]{ETIMGear.gear("hoe_rusted_iron"), 1});
                items.add(new Object[]{ETIMGear.gear("mattock_rusted_iron"), 1});
            }
            if (day >= 20) {
                items.add(new Object[]{ETIMGear.gear("pickaxe_rusted_iron"), 1});
            }
        } else {
            // :191-196 — cudgel/club rows dropped (no ETIM items, C 级登记).
            items.add(new Object[]{ETIMGear.gear("sword_rusted_iron"), 1});
            items.add(new Object[]{ETIMGear.gear("dagger_rusted_iron"), 1});
        }
        Object[] entry = weightedRandom(zombie, items);
        Item item = (Item) entry[0];
        zombie.setItemStackToSlot(EntityEquipmentSlot.MAINHAND,
                randomizeForMob(zombie, new ItemStack(item), true));
        log("mob weapon entity=" + zombie.getName() + " villager=" + villager
                + " item=" + item.getRegistryName());
    }

    // ==================== skeleton (EntitySkeleton.java:189-206) ====================

    /** R196 addRandomWeapon (:189-202) — the type-2 melee face maps onto normal skeletons (C 级登记). */
    private static void addRandomSkeletonWeapon(EntityLiving skeleton) {
        int day = getDayOfWorld(skeleton.world);
        if (skeleton.getRNG().nextInt(20) == 0 && day >= 10) {
            Item melee = day >= 20 && !skeleton.getRNG().nextBoolean()
                    ? ETIMGear.gear("sword_rusted_iron") : ETIMGear.gear("dagger_rusted_iron");
            skeleton.setItemStackToSlot(EntityEquipmentSlot.MAINHAND,
                    randomizeForMob(skeleton, new ItemStack(melee), false));
            log("mob weapon entity=" + skeleton.getName() + " item=" + melee.getRegistryName() + " melee=true");
            return;
        }
        // :201 fallback — the bow face (1.12 bow item; clubWood has no ETIM item).
        skeleton.setItemStackToSlot(EntityEquipmentSlot.MAINHAND,
                randomizeForMob(skeleton, new ItemStack(Items.BOW), true));
    }

    // ==================== day + weighted pick ====================

    /** R196 worldObj.getDayOfWorld() 对位. */
    private static int getDayOfWorld(World world) {
        return (int) (world.getWorldTime() / 24000L);
    }

    /** R196 WeightedRandom.getRandomItem 对位 (weights sum + roll). */
    private static Object[] weightedRandom(EntityLiving entity, List<Object[]> entries) {
        int total = 0;
        for (Object[] entry : entries) {
            total += (Integer) entry[1];
        }
        int roll = entity.getRNG().nextInt(total);
        for (Object[] entry : entries) {
            roll -= (Integer) entry[1];
            if (roll < 0) {
                return entry;
            }
        }
        return entries.get(entries.size() - 1);
    }
}
