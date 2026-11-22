package io.github.etim.etim.item;

import net.minecraft.client.resources.I18n;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import net.minecraft.nbt.NBTTagCompound;
import net.minecraft.util.text.TextFormatting;
import net.minecraft.world.World;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

import java.util.List;

/**
 * B-65 · R196 {@code ItemCoin}（64 行）的 1.12 载体（D-6 = A 六种货币）。
 *
 * <p>经验值：copper 5 / silver 25 / gold 100 / ancient 500 / mithril 2500 /
 * adamantium 10000（{@code ItemCoin.java:13-36}）。合成即扣经验的
 * {@code onCreated}（:54-56）对应 1.12 {@code Item.onCreated}。</p>
 */
public class ETIMItemCoin extends Item {

    private final String metal;
    private final int experienceValue;

    public ETIMItemCoin(String metal, int experienceValue) {
        this.metal = metal;
        this.experienceValue = experienceValue;
        this.setMaxStackSize(64);
    }

    public String getMetal() {
        return this.metal;
    }

    public int getExperienceValue() {
        return this.experienceValue;
    }

    @Override
    public void onCreated(ItemStack stack, World world, EntityPlayer player) {
        if (world.isRemote || player == null) {
            return;
        }
        int before = player.experienceTotal;
        player.addExperience(-this.experienceValue * stack.getCount());
        ETIMVesselEvents.row("coin created metal=" + this.metal
                + " count=" + stack.getCount() + " xpValue=" + this.experienceValue
                + " xpBefore=" + before + " xpAfter=" + player.experienceTotal
                + " player=" + player.getName());
    }

    @Override
    @SideOnly(Side.CLIENT)
    public void addInformation(ItemStack stack, World world, List<String> tooltip, net.minecraft.client.util.ITooltipFlag flag) {
        tooltip.add(TextFormatting.GRAY + I18n.format("item.etim.tooltip.xp_each", this.experienceValue));
        NBTTagCompound tag = stack.getTagCompound();
        if (tag != null && tag.hasKey("etimCoinXp")) {
            tooltip.add(TextFormatting.DARK_GRAY + I18n.format("item.etim.tooltip.xp_paid", tag.getInteger("etimCoinXp")));
        }
    }
}
