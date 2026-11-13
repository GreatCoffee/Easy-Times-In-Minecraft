package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Items;
import net.minecraft.item.Item;
import net.minecraft.item.ItemStack;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

/**
 * B-41 census 普查A :92 — the R196 stick/bone break face
 * ({@code Item.hitEntity :954-987}): hitting an entity with a stick or a
 * bone has a chance to BREAK the weapon outright (1/50 for the stick, 1/100
 * for the bone — the census row phrased the inverse "免磨损", corrected per
 * the code, 摸底 §0). Gates, verbatim: server-only (:955-957), the attacker
 * must be a player (:959-961), creative players never roll (:964-966), and
 * only the two hardcoded items participate (:968-977). On the roll the
 * R196 plays the break effect ({@code causeBreakingItemEffect}) and
 * clears the held slot ({@code convertOneOfHeldItem(null)} — MITE's
 * single-item inventory makes "clear the slot" = "break one item"); the
 * 1.12 port breaks ONE item from the stack
 * ({@code stack.shrink(1)}) + {@code EntityLivingBase#renderBrokenItemStack}
 * (public, :1257 — the ITEM_BREAK sound + the particles) and keeps the
 * R196 {@code true} return (the vanilla "the item wore" contract slot;
 * the stack semantics delta is registered in 摸底 §3).
 *
 * <p>The mixin sits on the ROOT {@link Item} (the vanilla stick/bone are
 * plain instances, not tool subclasses), so the handler is a cheap identity
 * gate — every other item (including the ETIM metal tools with their own
 * wear faces) walks through untouched. Flag <b>livestockNeedsR196</b>
 * (the twentieth reuse): flag off = vanilla keeps its shape (sticks/bones
 * never break on a hit). Judgement row {@code [SwingLog] stickbreak
 * item=… chance=… entity=…} (the mobDebugLog gate).</p>
 */
@Mixin(Item.class)
public abstract class MixinItem {

    @Inject(method = "hitEntity", at = @At("HEAD"), cancellable = true)
    private void etim$stickBreak(ItemStack stack, EntityLivingBase target, EntityLivingBase attacker,
                                 CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.livestockNeedsR196 || attacker.world.isRemote || !(attacker instanceof EntityPlayer)) {
            return; // R196 :955-961 (server-only, player-only)
        }
        EntityPlayer player = (EntityPlayer) attacker;
        if (player.capabilities.isCreativeMode) {
            return; // R196 :964-966 (creative never rolls)
        }
        int chance;
        if ((Object) this == Items.STICK) { // R196 :969-971 (this == stick)
            chance = 50;
        } else if ((Object) this == Items.BONE) { // R196 :972-977 (this == bone)
            chance = 100;
        } else {
            return;
        }
        if (attacker.getRNG().nextInt(chance) == 0) { // R196 :979 (itemRand roll)
            if (ETIMConfig.mobDebugLog) {
                io.github.etim.etim.ETIM.LOGGER.info("[SwingLog] stickbreak item={} chance={} entity={}",
                        ((Item) (Object) this).getRegistryName(), chance, player.getName()); // NOSONAR roll row
            }
            player.renderBrokenItemStack(stack); // the R196 causeBreakingItemEffect carrier (rfg :1257, public)
            stack.shrink(1); // the R196 convertOneOfHeldItem(null) semantic under the 1.12 stack model (摸底 §3)
            cir.setReturnValue(true); // R196 :982 (the vanilla "the item wore" contract)
        }
    }
}
