package io.github.etim.etim.item;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.item.EntityItem;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.entity.player.InventoryPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumParticleTypes;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

import java.util.Locale;

/**
 * R196 {@code Item.java:1919-1921} — snow and ice melt away:
 * {@code getChanceOfSnowAndIceItemsMelting(t) = (t - 1.0F) * 1.0E-4F}.
 *
 * <p>Two call sites in R196 (census F :149):</p>
 * <ul>
 *   <li>{@code EntityItem.java:119-133} — every server tick, {@code t} = the
 *       biome temperature at the dropped stack, rolled per single item by
 *       {@code subjectToChanceOfDisappearing}; an emptied stack vanishes.</li>
 *   <li>{@code ServerPlayer.java:647-661} — every server tick per inventory
 *       slot, {@code t} = 20.0 while the player is burning, else the biome
 *       temperature.</li>
 * </ul>
 *
 * <p>Only the snow/craftedSnow/ice materials participate; in 1.12 that is
 * snowball / snow block / snow layer / ice / packed ice / frosted ice.</p>
 */
public final class ETIMItemMelt {

    /** R196 {@code Item.java:1920} — temperature -> per-item per-tick chance. */
    public static float chance(float temperature) {
        if (temperature <= 1.0F) {
            return 0.0F;
        }
        return (temperature - 1.0F) * 1.0E-4F;
    }

    public static boolean melts(ItemStack stack) {
        if (stack.isEmpty()) {
            return false;
        }
        Item item = stack.getItem();
        return item == Items.SNOWBALL
                || item == Item.getItemFromBlock(Blocks.SNOW)
                || item == Item.getItemFromBlock(Blocks.SNOW_LAYER)
                || item == Item.getItemFromBlock(Blocks.ICE)
                || item == Item.getItemFromBlock(Blocks.PACKED_ICE)
                || item == Item.getItemFromBlock(Blocks.FROSTED_ICE);
    }

    /** EntityItem arm — called from {@code MixinEntityItem} onUpdate TAIL. */
    public static void tickDropped(EntityItem entity) {
        if (!ETIMConfig.itemsMeltR196) {
            return;
        }
        World world = entity.world;
        if (world.isRemote || entity.isDead) {
            return;
        }
        ItemStack stack = entity.getItem();
        if (!melts(stack)) {
            return;
        }
        float temperature = world.getBiome(new BlockPos(entity)).getTemperature(new BlockPos(entity));
        int before = stack.getCount();
        int after = roll(stack, chance(temperature));
        if (after < before) {
            if (after <= 0) {
                entity.setDead();
            }
            if (ETIMConfig.mobDebugLog) {
                ETIM.LOGGER.info("[ItemLog] melt where=drop item={} lost={} left={} temp={} entity={} [server]",
                        stack.getItem().getRegistryName(), before - after, Math.max(after, 0),
                        fmt(temperature), entity.getEntityId());
            }
            world.spawnParticle(EnumParticleTypes.SMOKE_NORMAL,
                    entity.posX, entity.posY + 0.2D, entity.posZ, 0.1D, 0.1D, 0.1D);
        }
    }

    /** Player-inventory arm — PlayerTickEvent END, server side. */
    @SubscribeEvent
    public void onPlayerTick(TickEvent.PlayerTickEvent event) {
        if (event.phase != TickEvent.Phase.END || !ETIMConfig.itemsMeltR196) {
            return;
        }
        EntityPlayer player = event.player;
        if (!(player instanceof EntityPlayerMP) || player.world.isRemote) {
            return;
        }
        World world = player.world;
        float temperature = player.isBurning() ? 20.0F
                : world.getBiome(new BlockPos(player)).getTemperature(new BlockPos(player));
        float chance = chance(temperature);
        if (chance <= 0.0F) {
            return;
        }
        InventoryPlayer inv = player.inventory;
        meltSlots(player, inv.mainInventory, "main", temperature, chance);
        meltSlots(player, inv.armorInventory, "armor", temperature, chance);
        meltSlots(player, inv.offHandInventory, "offhand", temperature, chance);
    }

    private static void meltSlots(EntityPlayer player, java.util.List<ItemStack> slots, String where,
                                  float temperature, float chance) {
        for (int i = 0; i < slots.size(); i++) {
            ItemStack stack = slots.get(i);
            if (!melts(stack)) {
                continue;
            }
            int before = stack.getCount();
            int after = roll(stack, chance);
            if (after < before) {
                if (after <= 0) {
                    slots.set(i, ItemStack.EMPTY);
                }
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[ItemLog] melt where=inv slot={}/{} item={} lost={} left={} temp={} player={} [server]",
                            where, i, stack.getItem().getRegistryName(), before - after, Math.max(after, 0),
                            fmt(temperature), player.getName());
                }
            }
        }
    }

    /** Rolls {@code chance} once per single item; returns how many survive. */
    public static int roll(ItemStack stack, float chance) {
        int count = stack.getCount();
        if (count <= 0 || chance <= 0.0F) {
            return count;
        }
        int survivors = 0;
        java.util.Random random = new java.util.Random();
        for (int i = 0; i < count; i++) {
            if (random.nextFloat() >= chance) {
                survivors++;
            }
        }
        if (survivors != count) {
            stack.setCount(survivors);
        }
        return survivors;
    }

    /** Dev helper for {@code /etest melt}: N ticks of the same roll. */
    public static int rollTicks(ItemStack stack, float temperature, int ticks) {
        float chance = chance(temperature);
        if (chance <= 0.0F) {
            return 0;
        }
        int start = stack.getCount();
        for (int t = 0; t < ticks && stack.getCount() > 0; t++) {
            roll(stack, chance);
        }
        return start - stack.getCount();
    }

    public static String fmt(double value) {
        return String.format(Locale.ROOT, "%.5f", value);
    }
}
