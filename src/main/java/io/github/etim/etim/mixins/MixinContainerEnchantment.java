package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.combat.ETIMEnchantPool;
import io.github.etim.etim.playerstate.ETIMXp;

import net.minecraft.block.state.IBlockState;
import net.minecraft.enchantment.EnchantmentData;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.init.Blocks;
import net.minecraft.init.Items;
import net.minecraft.inventory.ContainerEnchantment;
import net.minecraft.inventory.IInventory;
import net.minecraft.item.ItemStack;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import org.spongepowered.asm.mixin.Final;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.Redirect;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Audit 13 §2.3 bridge (条 235): R196's enchantment fee = {@code levels × 100}
 * POINTS from the SINGLE experience pool (enchantItem redirect at
 * {@code onEnchant}). Batch six D-1 pool (条 274-277, D 位条 276) EXTENDS this
 * same file (in-place entries, no new mixin — 终审 B-18):
 *
 * <ul>
 *   <li>{@code onCraftMatrixChanged} HEAD-cancel = the R196 table budget
 *       (D-A 甲): the R196 5×5 open-corridor bookshelf scan (vs the 1.12
 *       ForgeHooks ring), cap 24, {@code power=(1+books)×4} (emerald ×2 has no
 *       1.12 carrier — C-4), the enchantability alteration
 *       (A-5 self-built helper), the three-slot fraction with the ±0.1 jitter
 *       (slot 2 = the raw level), fixed 2 for the water-bottle / golden-apple
 *       specials, min 1 face. Clues -1 (B-12 — R196 has no preview).</li>
 *   <li>{@code enchantItem} HEAD-cancel (pool ON only; pool OFF keeps the
 *       vanilla body + the legacy fee redirect): the R196 single points gate
 *       (D-F 丙 default — {@code enchantLapisRequired} keeps the lapis gate +
 *       consumption; false = 乙 no-lapis), fee = levels × 100, the two table
 *       specials (water → experience bottle, plain golden apple → enchanted),
 *       and the book single-draw (removes the dormant {@code List.remove}
 *       redirect path — the keep-one face is now paid inline).</li>
 * </ul>
 */
@Mixin(ContainerEnchantment.class)
public abstract class MixinContainerEnchantment {

    @Shadow
    @Final
    private Random rand;

    @Shadow
    @Final
    private World world;

    @Shadow
    @Final
    private BlockPos position;

    @Shadow
    public IInventory tableInventory;

    @Shadow
    public int xpSeed;

    @Shadow
    public int[] enchantLevels;

    @Shadow
    public int[] enchantClue;

    @Shadow
    public int[] worldClue;

    @Shadow
    public abstract void onCraftMatrixChanged(IInventory inventoryIn);

    /** R196 single-pool fee (audit 13 §2.3, 条 235 — live for the pool-OFF vanilla body). */
    @Redirect(
            method = "enchantItem",
            at = @At(value = "INVOKE",
                    target = "Lnet/minecraft/entity/player/EntityPlayer;onEnchant(Lnet/minecraft/item/ItemStack;I)V")
    )
    private void etim$r196EnchantPoints(EntityPlayer player, ItemStack stack, int cost) {
        if (cost <= 0) {
            player.onEnchant(stack, cost);
            return;
        }
        ETIMXp.applyTotal(player, player.experienceTotal - cost * 100);
        player.onEnchant(stack, 0);
    }

    /**
     * D-2 (batch E, 条 232/终审 B-1): R196 book = EXACTLY one enchantment.
     * Dormant when the pool face owns {@code enchantItem} (the keep-one draw
     * is paid inline); live for the pool-OFF vanilla body.
     */
    @Redirect(
            method = "getEnchantmentList",
            at = @At(value = "INVOKE",
                    target = "Ljava/util/List;remove(I)Ljava/lang/Object;")
    )
    private Object etim$r196BookSingle(List<EnchantmentData> list, int index) {
        if (list.size() > 1) {
            EnchantmentData keep = list.get(this.rand.nextInt(list.size()));
            list.clear();
            list.add(keep);
        }
        return null;
    }

    // -------------------------------------------------- D-A 甲: the R196 table budget

    /** R196 isAirOrPassableBlock(x, y, z) bridge (Block#isPassable public face). */
    private boolean etim$passable(int x, int y, int z) {
        BlockPos pos = new BlockPos(x, y, z);
        if (this.world.isAirBlock(pos)) {
            return true;
        }
        return this.world.getBlockState(pos).getBlock().isPassable(this.world, pos);
    }

    /** R196 getNumAccessibleBookshelves (ContainerEnchantment.java:62-129 — 5×5 open-corridor shape, exact). */
    private int etim$bookshelves() {
        int tableX = this.position.getX();
        int tableY = this.position.getY();
        int tableZ = this.position.getZ();
        int books = 0;
        for (int dy = 0; dy <= 1 && (dy != 1 || this.etim$passable(tableX, tableY + 1, tableZ)); dy++) {
            boolean[][] accessible = new boolean[5][5];
            if (this.etim$passable(tableX, tableY + dy, tableZ - 1)) {
                accessible[2][0] = true;
                if (this.etim$passable(tableX - 1, tableY + dy, tableZ - 1)) {
                    accessible[0][1] = true;
                    accessible[1][0] = true;
                }
                if (this.etim$passable(tableX + 1, tableY + dy, tableZ - 1)) {
                    accessible[3][0] = true;
                    accessible[4][1] = true;
                }
            }
            if (this.etim$passable(tableX + 1, tableY + dy, tableZ)) {
                accessible[4][2] = true;
                if (this.etim$passable(tableX + 1, tableY + dy, tableZ - 1)) {
                    accessible[3][0] = true;
                    accessible[4][1] = true;
                }
                if (this.etim$passable(tableX + 1, tableY + dy, tableZ + 1)) {
                    accessible[4][3] = true;
                    accessible[3][4] = true;
                }
            }
            if (this.etim$passable(tableX, tableY + dy, tableZ + 1)) {
                accessible[2][4] = true;
                if (this.etim$passable(tableX + 1, tableY + dy, tableZ + 1)) {
                    accessible[4][3] = true;
                    accessible[3][4] = true;
                }
                if (this.etim$passable(tableX - 1, tableY + dy, tableZ + 1)) {
                    accessible[1][4] = true;
                    accessible[0][3] = true;
                }
            }
            if (this.etim$passable(tableX - 1, tableY + dy, tableZ)) {
                accessible[0][2] = true;
                if (this.etim$passable(tableX - 1, tableY + dy, tableZ + 1)) {
                    accessible[1][4] = true;
                    accessible[0][3] = true;
                }
                if (this.etim$passable(tableX - 1, tableY + dy, tableZ - 1)) {
                    accessible[0][1] = true;
                    accessible[1][0] = true;
                }
            }
            for (int dx = -2; dx <= 2; dx++) {
                for (int dz = -2; dz <= 2; dz++) {
                    if (accessible[2 + dx][2 + dz]
                            && this.world.getBlockState(new BlockPos(tableX + dx, tableY + dy, tableZ + dz))
                                    .getBlock() == Blocks.BOOKSHELF) {
                        books++;
                    }
                }
            }
        }
        return books;
    }

    private static boolean etim$isWaterBottle(ItemStack stack) {
        return stack.getItem() == Items.POTIONITEM && stack.getMetadata() == 0;
    }

    private static boolean etim$isPlainGoldenApple(ItemStack stack) {
        return stack.getItem() == Items.GOLDEN_APPLE && stack.getMetadata() == 0;
    }

    /** R196 calcEnchantmentLevelsForSlot (:271-295) — D-A 甲. */
    private int etim$r196SlotLevel(int slotIndex, ItemStack stack) {
        if (etim$isWaterBottle(stack) || etim$isPlainGoldenApple(stack)) {
            return 2; // :273-274
        }
        if (stack.getItem().getItemEnchantability() <= 0) {
            return 0;
        }
        int books = this.etim$bookshelves();
        if (books > 24) {
            books = 24;
        }
        int power = (1 + books) * 4; // emerald table ×2 has no 1.12 carrier (C-4)
        int levels = ETIMEnchantPool.altered(power, stack.getItem());
        float fraction = (1.0F + slotIndex) / 3.0F;
        if (slotIndex < 2) {
            fraction += (this.rand.nextFloat() - 0.5F) * 0.2F;
        }
        int out = Math.max(Math.round(levels * fraction), 1);
        ETIMEnchantPool.row("level slot=" + (slotIndex + 1) + " books=" + books + " power=" + power
                + " levels=" + levels + " frac=" + String.format(java.util.Locale.ROOT, "%.3f", fraction)
                + " out=" + out);
        return out;
    }

    @Inject(method = "onCraftMatrixChanged", at = @At("HEAD"), cancellable = true)
    private void etim$r196TableLevels(IInventory inventory, CallbackInfo ci) {
        if (inventory != this.tableInventory || !ETIMConfig.enchantPoolR196) {
            return;
        }
        ItemStack slot0 = this.tableInventory.getStackInSlot(0);
        if (slot0.isEmpty()) {
            for (int i = 0; i < 3; i++) {
                this.enchantLevels[i] = 0;
            }
            this.etim$clearClues();
            ci.cancel();
            return;
        }
        boolean water = etim$isWaterBottle(slot0);
        boolean apple = etim$isPlainGoldenApple(slot0);
        // The specials enter the table despite the vanilla isEnchantable gate (R196 :135 gate accepts
        // its own items; the 1.12 gate would reject both — bridge note, 物面保位).
        if (water || apple
                || (slot0.getItem().isEnchantable(slot0) && slot0.getItem().getItemEnchantability() > 0)) {
            if (!this.world.isRemote) {
                for (int slot = 0; slot < 3; slot++) {
                    this.enchantLevels[slot] = (water || apple) ? 2 : this.etim$r196SlotLevel(slot, slot0);
                }
                this.etim$clearClues(); // B-12: R196 发不出预告
                this.etim$broadcast();
            }
            ci.cancel();
            return;
        }
        for (int i = 0; i < 3; i++) {
            this.enchantLevels[i] = 0;
        }
        this.etim$clearClues();
        ci.cancel();
    }

    private void etim$clearClues() {
        for (int i = 0; i < 3; i++) {
            this.enchantClue[i] = -1;
            this.worldClue[i] = -1;
        }
    }

    private void etim$broadcast() {
        try {
            ((ContainerEnchantment) (Object) this).detectAndSendChanges();
        } catch (Throwable ignored) {
            // client-side listeners absent — display-only face
        }
    }

    // -------------------------------------------------- D-F 丙/乙 + G6 特例: the R196 enchantItem

    /**
     * R196 enchantItem (:155-201) with the user rulings 条 276: the level
     * gate becomes the SINGLE POINTS gate (fee = levels × 100, R196
     * Enchantment.java:96-98); the lapis gate + consumption ride
     * {@code enchantLapisRequired} (true = 丙, default; false = 乙). Fee pays
     * through the single pool (ETIMXp) — the legacy onEnchant redirect above
     * stays for the pool-OFF vanilla body only.
     */
    @Inject(method = "enchantItem", at = @At("HEAD"), cancellable = true)
    private void etim$r196EnchantItem(EntityPlayer player, int id, CallbackInfoReturnable<Boolean> cir) {
        if (!ETIMConfig.enchantPoolR196 || id < 0 || id > 2) {
            return; // vanilla body (with the legacy fee redirect) owns the call
        }
        ItemStack slot0 = this.tableInventory.getStackInSlot(0);
        int shown = this.enchantLevels[id];
        ItemStack lapis = this.tableInventory.getStackInSlot(1);
        boolean creative = player.capabilities.isCreativeMode;

        if (slot0.isEmpty() || shown <= 0) {
            cir.setReturnValue(false);
            return;
        }
        int fee = shown * 100;
        if (!creative) {
            if (ETIMConfig.enchantLapisRequired && (lapis.isEmpty() || lapis.getCount() < id + 1)) {
                ETIMEnchantPool.row("fee slot=" + (id + 1) + " cost=" + fee + " lapis=1 gate=deny");
                cir.setReturnValue(false);
                return;
            }
            if (player.experienceTotal < fee) {
                ETIMEnchantPool.row("fee slot=" + (id + 1) + " cost=" + fee + " pool=" + player.experienceTotal + " gate=deny");
                cir.setReturnValue(false);
                return;
            }
        }

        boolean water = etim$isWaterBottle(slot0);
        boolean plainApple = !water && etim$isPlainGoldenApple(slot0);
        if (!this.world.isRemote) {
            if (water || plainApple) {
                // G6.b/G6.c (R196 :160-170): fixed fee, swap-in the tour result
                if (water) {
                    this.tableInventory.setInventorySlotContents(0, new ItemStack(Items.EXPERIENCE_BOTTLE));
                } else {
                    this.tableInventory.setInventorySlotContents(0, new ItemStack(Items.GOLDEN_APPLE, 1, 1));
                }
                this.etim$pay(player, fee, lapis, id, creative);
                this.etim$postEnchant(player);
                ETIMEnchantPool.row("special kind=" + (water ? "water" : "apple") + " fee=" + fee);
                cir.setReturnValue(true);
                return;
            }
            List<EnchantmentData> list = net.minecraft.enchantment.EnchantmentHelper.buildEnchantmentList(
                    this.rand, slot0, shown, false);
            if (list != null && !list.isEmpty()) {
                boolean book = slot0.getItem() == Items.BOOK;
                ItemStack result = slot0;
                if (book) {
                    // R196 :172-186: book → enchanted book with ONE random entry (:180)
                    result = new ItemStack(Items.ENCHANTED_BOOK);
                    EnchantmentData keep = list.get(this.rand.nextInt(list.size()));
                    net.minecraft.item.ItemEnchantedBook.addEnchantment(result, keep);
                    ETIMEnchantPool.row("book picks=" + list.size() + " keep=" + keep.enchantment.getRegistryName()
                            + ":" + keep.enchantmentLevel);
                } else {
                    for (EnchantmentData data : list) {
                        result.addEnchantment(data.enchantment, data.enchantmentLevel);
                    }
                    ETIMEnchantPool.row("apply slot=" + (id + 1) + " picks=" + list.size());
                }
                this.tableInventory.setInventorySlotContents(0, result);
                this.etim$pay(player, fee, lapis, id, creative);
                if (player instanceof net.minecraft.entity.player.EntityPlayerMP) {
                    player.addStat(net.minecraft.stats.StatList.ITEM_ENCHANTED);
                    net.minecraft.advancements.CriteriaTriggers.ENCHANTED_ITEM.trigger(
                            (net.minecraft.entity.player.EntityPlayerMP) player, result, shown);
                }
                this.tableInventory.markDirty();
                this.etim$postEnchant(player);
                cir.setReturnValue(true);
                return;
            }
            cir.setReturnValue(true); // R196: list empty ⇒ no fee, keep the slot
            return;
        }
        cir.setReturnValue(true);
    }

    private void etim$pay(EntityPlayer player, int fee, ItemStack lapis, int id, boolean creative) {
        if (!creative) {
            ETIMXp.applyTotal(player, player.experienceTotal - fee);
            player.onEnchant(this.tableInventory.getStackInSlot(0), 0);
            if (ETIMConfig.enchantLapisRequired) {
                lapis.shrink(id + 1); // the 1.12 amount face (id+1) — D-F 丙 keeps it
                if (lapis.isEmpty()) {
                    this.tableInventory.setInventorySlotContents(1, ItemStack.EMPTY);
                }
            }
        }
        ETIMEnchantPool.row("fee cost=" + fee + " pool=" + player.experienceTotal);
    }

    private void etim$postEnchant(EntityPlayer player) {
        this.xpSeed = player.getXPSeed();
        this.onCraftMatrixChanged(this.tableInventory);
        this.world.playSound((EntityPlayer) null, this.position,
                net.minecraft.init.SoundEvents.BLOCK_ENCHANTMENT_TABLE_USE,
                net.minecraft.util.SoundCategory.BLOCKS, 1.0F,
                this.world.rand.nextFloat() * 0.1F + 0.9F);
    }
}
