package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.furnace.FurnaceXpRewards;
import net.minecraft.entity.item.EntityXPOrb;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.inventory.SlotFurnaceOutput;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * Stage 4 batch C prelude: the R196 furnace XP payout (9B §4.2, audit 9
 * §1.4): the take pays {@code reward × quantity_taken} as ONE orb at
 * {@code (playerX, playerY+0.5, playerZ+0.5)} — the javap dadd offsets of
 * the 9B byte audit — replacing the vanilla per-recipe random split
 * (FurnaceRecipes.getSmeltingExperience × the taken count).
 *
 * <p>Creative is NOT exempt (9B §4.2 "no explicit creative branch" — the
 * take pays identically in survival and creative). The orb itself carries
 * the value: NO direct addExperience (the R196 orb is drop-and-collect,
 * PlayerXP arrives only when the player actually picks it up).</p>
 */
@Mixin(SlotFurnaceOutput.class)
public abstract class MixinSlotFurnaceOutput {

    @Shadow
    public EntityPlayer player;

    @Shadow
    protected int removeCount;

    @Inject(
            method = "onCrafting(Lnet/minecraft/item/ItemStack;)V",
            at = @At("HEAD"),
            cancellable = true
    )
    private void etim$furnaceXpRewards(ItemStack stack, CallbackInfo cir) {
        if (!ETIMConfig.furnaceXpRewards || !FurnaceXpRewards.isEnabled()) {
            return;
        }
        cir.cancel(); // the vanilla payout never runs
        if (!(this.player instanceof EntityPlayerMP)) {
            return; // client prediction: orbs are server-authoritative only
        }
        if (stack.isEmpty()) {
            return;
        }
        int xp = FurnaceXpRewards.rewardOf(stack, this.removeCount);
        if (ETIMConfig.furnaceDebugLog) {
            // G3/G4 judgment channel: per take, item/count/points (+ creative
            // marker — 9B §4.2 has no creative exemption, the log must prove
            // creative takes pay identically).
            io.github.etim.etim.ETIM.LOGGER.info("[FurnaceLog] xp payout item="
                    + stack.getItem().getRegistryName().toString()
                    + " count=" + this.removeCount + " points=" + xp
                    + (this.player.capabilities.isCreativeMode ? " creative" : "")
                    + (Thread.currentThread().getName().contains("Server") ? " [server]" : " [client]"));
        }
        if (xp > 0) {
            this.player.getEntityWorld().spawnEntity(new EntityXPOrb(this.player.getEntityWorld(),
                    this.player.posX, this.player.posY + 0.5D, this.player.posZ + 0.5D, xp));
        }
    }
}
