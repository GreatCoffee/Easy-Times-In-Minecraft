package io.github.etim.etim.fishing;

import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.weather.ETIMRain;

import net.minecraft.entity.item.EntityXPOrb;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.projectile.EntityFishHook;
import net.minecraft.item.ItemStack;
import net.minecraft.util.EnumHand;
import net.minecraftforge.event.entity.player.ItemFishedEvent;
import net.minecraftforge.event.entity.player.PlayerInteractEvent;
import net.minecraftforge.event.world.BlockEvent;
import net.minecraftforge.fml.common.eventhandler.EventPriority;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Batch five event faces (audit20 条 268-271): the zero-extra-mixin trio —
 * {@code ItemFishedEvent} (retraction: loot replace + worm consume + the XP
 * luck bonus orb), {@code RightClickItem} (the R196 :2859-2871 cast gate),
 * {@code HarvestDropsEvent} (worm from grass, BlockGrass:177-196).
 *
 * <p>Pinned by the final verdict (条 271):</p>
 * <ul>
 *   <li>XP = the vanilla loop face (1.12 :556 — one orb per dropped item) +
 *       the luck_of_the_sea EXTRA orb (D-11 丙-②b, {@code luckOfTheSeaXpPerLevel},
 *       spawned by hand here — the C-注2 face, catch row xp= double-logs).</li>
 *   <li>rod damage = the vanilla event default ({@code inGround?2?—?1}) = 1 on
 *       the catch path — already equals R196's catch damage 1, no adjust.</li>
 *   <li>stat: vanilla {@code FISH_CAUGHT} (1.12 :559-562) self-increments for
 *       the vanilla fish items — D-9 甲 pays it for free.</li>
 * </ul>
 */
public final class ETIMFishingEvents {

    /** {@code ItemFishingRod.java:30-33} + R196 :2859 — retract is always allowed, only the cast is gated. */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onRightClick(PlayerInteractEvent.RightClickItem e) {
        if (!ETIMConfig.fishingSystem || e.getWorld().isRemote
                || e.getHand() != EnumHand.MAIN_HAND) {
            return;
        }
        EntityPlayer p = e.getEntityPlayer();
        if (!(e.getItemStack().getItem() instanceof ETIMItemFishingRod)) {
            return;
        }
        if (p.fishEntity != null) {
            return; // 收杆永许（R196 :31 只门施法）
        }
        boolean ok = ETIMFishing.canCast(p);
        if (!ok) {
            e.setCanceled(true);
            ETIMFishing.row("cast player=" + p.getName() + " ok=0 grounded="
                    + (p.onGround ? 1 : 0) + " inWater=" + (p.isInWater() ? 1 : 0)
                    + " riding=" + (p.getRidingEntity() != null
                            ? p.getRidingEntity().getClass().getSimpleName() : "none"));
        } else {
            ETIMFishing.row("cast player=" + p.getName() + " ok=1");
        }
    }

    /** Retraction: vanilla inserts the loot-table face (:535) — we replace the drops (B) and keep the single-fish face. */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onFished(ItemFishedEvent e) {
        if (!ETIMConfig.fishingSystem) {
            return;
        }
        EntityFishHook hook = e.getHookEntity();
        if (hook == null || hook.world.isRemote) {
            return;
        }
        java.util.List<ItemStack> drops = e.getDrops();
        int removed = drops.size();

        // R196 catchFish :456-483 — exactly ONE item per catch, no junk/treasure.
        drops.clear();
        ItemStack fish = ETIMFishing.rollFishType(hook);
        drops.add(fish);

        // D-11 丙-②b — the luck_of_the_sea XP bonus orb (extra, by hand).
        EntityPlayer angler = hook.getAngler(); // :632 — public getter (the FIELD is private; C-注4 shadow face)
        int luck = ETIMFishing.level(angler, net.minecraft.init.Enchantments.LUCK_OF_THE_SEA);
        int bonus = luck * ETIMConfig.luckOfTheSeaXpPerLevel;
        if (bonus > 0 && angler != null) {
            // R196 :470-472 — the orb spawns at the ANGLER (not the bobber).
            angler.world.spawnEntity(new EntityXPOrb(angler.world,
                    angler.posX, angler.posY + 0.5D, angler.posZ + 0.5D, bonus));
        }

        // R196 :479-482 — hotbar worm consumption, one per catch.
        boolean worm = angler != null && ETIMFishing.consumeWorm(angler);

        // rod damage stays the event default (catch = 1 = R196's catch face; B-1 注记).
        ETIMFishing.row("catch kind=" + (fish.getMetadata() == 1 ? "salmon" : "cod")
                + " rod=" + e.getRodDamage()
                + " item=" + fish.getItem().getRegistryName() + ":" + fish.getMetadata()
                + " q=1 removed=" + removed
                + " xp=" + bonus
                + " worm=" + (worm ? -1 : 0));
    }

    /**
     * R196 BlockGrass:177-196 — the worm face. wasHarvestedByPlayer, not
     * freezing biome, rain bonus +12 (cap 14), d = 1/(16-f). B-13: the roll
     * REPLACES the dirt drop.
     */
    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onHarvestDrops(BlockEvent.HarvestDropsEvent e) {
        if (!ETIMConfig.fishingSystem || e.getWorld().isRemote) {
            return;
        }
        if (e.getState().getBlock() != net.minecraft.init.Blocks.GRASS) {
            return;
        }
        if (e.getHarvester() == null) { // R196 wasHarvestedByPlayer
            return;
        }
        int denom = ETIMConfig.wormGrassChanceBase; // R196 :191 (16)
        int bonus = ETIMConfig.wormGrassRainBonus; // R196 :184 (+12, cap 14 face)
        int f = Math.min(e.getFortuneLevel(), 3); // :178
        boolean rain = ETIMRain.isInRain(e.getWorld(), e.getPos().up());
        if (rain) {
            f += bonus;
        }
        if (f > 14) {
            f = 14; // :187-189
        }
        int d = denom - f;
        if (d < 1) {
            d = 1;
        }
        boolean hit = e.getWorld().rand.nextInt(d) == 0;
        if (hit) {
            e.getDrops().clear(); // R196 replaces the dirt row (B-13)
            e.getDrops().add(new ItemStack(ETIMFishingItems.wormRaw, 1));
        }
        ETIMFishing.row("worm denom=" + d + " f=" + f + " rain=" + (rain ? 1 : 0)
                + " hit=" + (hit ? 1 : 0));
    }

    private ETIMFishingEvents() {
    }
}
