package io.github.etim.etim.fishing;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMArrowLog;

import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.projectile.EntityArrow;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.nbt.NBTTagList;
import net.minecraft.world.WorldServer;
import net.minecraftforge.event.entity.living.LivingDropsEvent;
import net.minecraftforge.event.entity.living.LivingHurtEvent;
import net.minecraftforge.fml.common.eventhandler.EventPriority;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.ArrayList;
import java.util.List;

/**
 * arrow_recovery (R196 {@code EnchantmentArrowRecovery} id 51 — batch five,
 * audit20 条 268-271) — the D-6 乙 face (user-ruled 条 270): the R196
 * 「箭入体袋」 semantics translated to 1.12 as 命中记账 → 死亡随尸落箭, zero
 * mixin.
 *
 * <p>R196 chain one-hand (ELB:754 → :1371-1381): player arrows only
 * ({@code canBePickedUp==1}), the half-heart gate, then the joint roll —
 * {@code r(5) < L} (the dart enters GUARANTEED) else the per-arrowhead
 * material chance {@code nextFloat < c_mat} (ItemArrow:47-71 via
 * {@link ETIMFishing#recoveryChance}). The recipient's own RNG carries both
 * rolls, in the R196 order (:1375 rand, then :1378 rand).</p>
 *
 * <p>1.12 translation (EntityArrow:428-431 命中即 setDead — no contained-item
 * system): the pending-arrows ledger rides {@code Entity.getEntityData()}
 * (ForgeData — persisted with the entity, no new capability, C-注5) under
 * {@code etim_arrow_recovery}; the death drop rides {@code LivingDropsEvent}
 * (the same event the butchering batch rides — additive, one event one
 * dead list). {@code doMobLoot=false} or a child recipient keeps the
 * pending face (R196 :909门 reads the ledger at DEATH time only — 译注:
 * the pending ledger stays stored for the next sanctioned kill). The
 * judgment rows ride the existing [ArrowLog] channel (D-8 甲).</p>
 */
public final class ETIMArrowRecovery {

    /** ForgeData key for the pending ledger. */
    private static final String KEY = "etim_arrow_recovery";

    /** The R196 ELB:753-754 face — the half-heart gate BEFORE the joint roll. */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onHurt(LivingHurtEvent e) {
        if (!ETIMConfig.arrowRecoverySystem) {
            return;
        }
        net.minecraft.util.DamageSource src = e.getSource();
        if (!(src.getImmediateSource() instanceof EntityArrow)) {
            return;
        }
        EntityArrow arrow = (EntityArrow) src.getImmediateSource();
        if (!(src.getTrueSource() instanceof EntityPlayer)) {
            return; // R196 isArrowFromPlayer
        }
        if (arrow.pickupStatus != EntityArrow.PickupStatus.ALLOWED) {
            return; // R196 canBePickedUp==1 (the vanilla player-arrow face)
        }
        if (e.getAmount() < 1.0F) { // R196 半心门 (C-10)
            return;
        }
        EntityPlayer shooter = (EntityPlayer) src.getTrueSource();
        ItemStack bow = shooter.getHeldItemMainhand(); // R196 getHeldItemStack (C-6)
        int level = ETIMFishing.level(shooter,
                io.github.etim.etim.mining.ETIMEnchantments.ARROW_RECOVERY);
        EntityLivingBase victim = e.getEntityLiving();
        java.util.Random rnd = victim.getRNG();

        // R196 :1375 — r(5) < L ⇒ guaranteed contained.
        int r5 = rnd.nextInt(ETIMConfig.arrowRecoveryLevelDivisor);
        boolean pass5 = r5 < level;
        // R196 :1378 — the material baseline roll (ItemArrow:65-71).
        ItemStack ammo = ETIMFishing.ammoOf(arrow);
        float c = ETIMFishing.recoveryChance(ammo);
        boolean passC = rnd.nextFloat() < c;
        boolean keep = pass5 || passC;
        if (keep) {
            addPending(victim, ammo);
        }
        ETIMArrowLog.row("recovery victim=" + victim.getClass().getSimpleName()
                + " lvl=" + level + " r5=" + r5 + " pass5=" + (pass5 ? 1 : 0)
                + " mat=" + ammo.getItem().getRegistryName()
                + " c=" + String.format(java.util.Locale.ROOT, "%.2f", c)
                + " passC=" + (passC ? 1 : 0)
                + " result=" + (keep ? "pending" : "none"));
    }

    /** The death face — the pending ledger leaves with the corpse. */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onDrops(LivingDropsEvent e) {
        if (!ETIMConfig.arrowRecoverySystem) {
            return;
        }
        List<ItemStack> pending = popPending(e.getEntityLiving());
        if (pending.isEmpty()) {
            return;
        }
        // R196 死亡面门 — the vanilla doMobLoot/child gates mirror the cap on drops.
        boolean lootOn = e.getEntityLiving().world.getGameRules().getBoolean("doMobLoot");
        boolean child = e.getEntityLiving() instanceof EntityAgeable
                && ((EntityAgeable) e.getEntityLiving()).isChild();
        List<EntityItem> drops = e.getDrops();
        if (lootOn && !child) {
            for (ItemStack stack : pending) {
                WorldServer world = (WorldServer) e.getEntityLiving().world;
                EntityItem item = new EntityItem(world, e.getEntityLiving().posX,
                        e.getEntityLiving().posY, e.getEntityLiving().posZ, stack.copy());
                item.setDefaultPickupDelay();
                drops.add(item);
            }
        }
        ETIMArrowLog.row("recovery-death victim=" + e.getEntityLiving().getClass().getSimpleName()
                + " loot=" + (lootOn ? 1 : 0) + " child=" + (child ? 1 : 0)
                + " dropped=" + (lootOn && !child ? pending.size() : 0));
    }

    /** Ledger write (entity ForgeData NBT list, per-entity key). */
    private static void addPending(EntityLivingBase victim, ItemStack stack) {
        NBTTagCompound data = victim.getEntityData();
        NBTTagList list = data.getTagList(KEY, 10);
        list.appendTag(stack.writeToNBT(new NBTTagCompound()));
        data.setTag(KEY, list);
    }

    /** Ledger read+clear (the death face consumes it; R196 dropContainedItems 记账face). */
    private static List<ItemStack> popPending(EntityLivingBase victim) {
        List<ItemStack> out = new ArrayList<>();
        NBTTagCompound data = victim.getEntityData();
        if (!data.hasKey(KEY, 9)) { // 9 = TAG_List
            return out;
        }
        NBTTagList list = data.getTagList(KEY, 10);
        for (int i = 0; i < list.tagCount(); i++) {
            ItemStack stack = new ItemStack(list.getCompoundTagAt(i));
            if (!stack.isEmpty()) {
                out.add(stack);
            }
        }
        data.removeTag(KEY);
        return out;
    }

    private ETIMArrowRecovery() {
    }
}
