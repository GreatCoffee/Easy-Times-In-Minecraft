package io.github.etim.etim.death;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.Tags;
import io.github.etim.etim.playerstate.ETIMXp;
import net.minecraft.entity.Entity;
import net.minecraft.entity.player.EntityPlayer;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.entity.item.EntityXPOrb;
import net.minecraft.network.play.server.SPacketSetExperience;
import net.minecraft.world.GameRules;
import net.minecraft.util.ResourceLocation;
import net.minecraftforge.event.AttachCapabilitiesEvent;
import net.minecraftforge.event.entity.living.LivingDeathEvent;
import net.minecraftforge.event.entity.player.PlayerEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

/**
 * Stage 4C (death chain, 8.3): the byte-evidence death path, re-laid onto
 * 1.12.2 Forge events (the R196 death runs inside ServerPlayer.onDeath +
 * ServerConfigurationManager.respawnPlayer — the equivalent 1.12 hooks are
 * the LivingDeathEvent and the death-branch of PlayerEvent.Clone, which fires
 * inside PlayerList.recreatePlayerEntity BEFORE the respawn XP packet).
 *
 * <p>Semantics, 8.3 dump §6.1-§6.3 verbatim:</p>
 * <ul>
 *   <li><b>orbs</b> — {@code keepInventory ? 0 : experience / 3} (int div),
 *       spawned at the death location so the corpse owner picks them back
 *       (the R196 deathTime==20 beat is rendered as at-death here: 1.12 has
 *       no corpse of its own, the delay beat has nothing to attach to).</li>
 *   <li><b>settle</b> — below-1-total death ({@code experience &lt; xp(1)=20})
 *       writes {@code respawn = experience − 20}, floored at
 *       {@code xp(−40) = −800}; a total at-or-above 20 keeps the STALE
 *       respawn value (the ≥1-level quirk — kept by default, open on the
 *       unattended decision list as D.1).</li>
 *   <li><b>apply</b> — on respawn the arriving player's XP fields rewrite to
 *       the settle via {@code ETIMXp.applyTotal} — ❗F-10-11/R-17=A（audit20-10 R1）:
 *       R196 :315 pool-only，settle 走单池曲线一次到位（≥0 → levelForPoints 正支；
 *       <0 → 债务支线性 {@code level = total / 20}，negative levels are the R196
 *       debt design; every level bonus reads {@code experienceLevel}
 *       directly, so −40 levels produce the −80% edits through the existing
 *       multiplier formulas with no new math）。</li>
 *   <li><b>pools</b> — the §6.2 fact: FoodStats pools do NOT survive a
 *       death; ETIM already rebuilds a fresh dual-pool state on the new
 *       entity, matching the R196 respawn-full-pools behavior.</li>
 * </ul>
 *
 * <p>[DeathLog] is the judgment channel (AGENTS.md rule 9): orb amounts and
 * the settle lines print on the server; the only eyeball parts are the
 * reloaded XP bar and the level number on the client (both on the unattended
 * test list). keepInventory runs the vanilla untouched path.</p>
 */
@Mod.EventBusSubscriber(modid = Tags.MOD_ID)
public final class ETIMDeathEvents {

    private ETIMDeathEvents() {
    }

    @SubscribeEvent
    public static void onAttachEntityCapabilities(AttachCapabilitiesEvent<Entity> event) {
        if (!(event.getObject() instanceof EntityPlayer)) {
            return;
        }
        event.addCapability(ETIMDeathXp.CAPABILITY_KEY, new ETIMDeathXp.Provider());
    }

    @SubscribeEvent
    public static void onDeath(LivingDeathEvent event) {
        if (event.getEntityLiving().world.isRemote
                || !(event.getEntityLiving() instanceof EntityPlayer)) {
            return;
        }
        EntityPlayer player = (EntityPlayer) event.getEntityLiving();
        boolean keepInventory = player.getEntityWorld().getGameRules()
                .getBoolean("keepInventory");
        ETIMDeathXp.IState deathXp = ETIMDeathXp.get(player);
        if (deathXp == null) {
            return;
        }
        int oldTotal = player.experienceTotal;
        int settle;
        if (keepInventory) {
            // §6.1: keepInventory drops nothing AND clonePlayer carries the XP
            // fields whole — the settle never runs.
            settle = Integer.MIN_VALUE; // sentinel: no settle pending
            log(player, "death keepInventory=true → xp untouched (vanilla carry)");
        } else {
            int orbs = ETIMConfig.deathXpOrbs ? oldTotal / 3 : 0;
            if (orbs > 0) {
                EntityXPOrb orb = new EntityXPOrb(player.getEntityWorld(),
                        player.posX, player.posY, player.posZ, orbs);
                player.getEntityWorld().spawnEntity(orb);
                log(player, "death orb dump " + orbs + " xp (=total/3 of " + oldTotal
                        + ") at " + (int) player.posX + "," + (int) player.posY + "," + (int) player.posZ);
            } else if (ETIMConfig.deathXpOrbs) {
                log(player, "death orb dump 0 xp (total " + oldTotal + " < 3)");
            }
            if (!ETIMConfig.deathXpSettle) {
                // config off: vanilla carry path (the fields survive the clone
                // untouched, exactly vanilla).
                settle = Integer.MIN_VALUE;
                log(player, "death settle off (config) → vanilla xp carry");
            } else if (oldTotal < ETIMDeathXp.SETTLE_UNIT) {
                settle = Math.max(oldTotal - ETIMDeathXp.SETTLE_UNIT, ETIMDeathXp.SETTLE_FLOOR);
                deathXp.setRespawnTotal(settle);
                log(player, "death settle sub-level: old=" + oldTotal + " → respawn=" + settle
                        + " (unit −" + ETIMDeathXp.SETTLE_UNIT + ", floor " + ETIMDeathXp.SETTLE_FLOOR + ")"
                        + " → stale updated");
            } else {
                // ≥1-level total: resurrect on the STALE value (R196
                // respawn_experience only rewrites sub-1 / NBT-load branches).
                settle = deathXp.getRespawnTotal();
                log(player, "death settle ≥1: old=" + oldTotal + " → respawn=stale " + settle
                        + " (quirk kept, D.1 open decision)");
            }
        }
        deathXp.setPendingSettle(settle);
    }

    @SubscribeEvent
    public static void onClone(PlayerEvent.Clone event) {
        ETIMDeathXp.IState oldState = ETIMDeathXp.get(event.getOriginal());
        ETIMDeathXp.IState newState = ETIMDeathXp.get(event.getEntityPlayer());
        if (oldState == null || newState == null) {
            return;
        }
        // The stale value rides BOTH clone directions (death and End travel
        // both rebuild the player object; R196's respawn_experience outlives
        // both). The pending settle applies on the death branch only.
        newState.setRespawnTotal(oldState.getRespawnTotal());
        if (!event.isWasDeath()) {
            return;
        }
        int settle = oldState.getPendingSettle();
        if (settle == Integer.MIN_VALUE) {
            return; // keepInventory death: nothing to rewrite
        }
        EntityPlayer player = event.getEntityPlayer();
        // ❗F-10-11 / R-17=A（audit20-10 R1）：R196 :315 pool-only——settle 单池曲线
        // 一次到位（≥0 → levelForPoints 正支；<0 → 债务支 −1/−2 线性；bar：正支进度/
        // 负支 0.0F）。vanilla 曲线重建（levelFromTotal/levelProgress/xpBarCapAt）已删，
        // 线性 level=total/20 分支由 levelForPoints 的债务支承载。
        ETIMXp.applyTotal(player, settle);
        if (player instanceof EntityPlayerMP) {
            // The clone runs inside recreatePlayerEntity before the XP packet —
            // push the rewritten numbers right away, no stale bar flash.
            ((EntityPlayerMP) player).connection.sendPacket(
                    new SPacketSetExperience(player.experience, player.experienceTotal, player.experienceLevel));
        }
        log(player, "respawn settle applied → total=" + player.experienceTotal
                + " level=" + player.experienceLevel);
    }

    // ❗F-10-11（audit20-10 R1）：levelFromTotal/levelProgress/xpBarCapAt（vanilla 曲线
    // 三件套）已删——单池曲线唯一承载 = ETIMXp（pointsForLevel/levelForPoints/barFor/
    // applyTotal），R196 :315 pool-only 语义。

    private static void log(EntityPlayer player, String message) {
        if (ETIMConfig.deathDebugLog) {
            ETIM.LOGGER.info("[DeathLog] " + player.getName() + " (" + player.getEntityId()
                    + ") " + message + " [server]");
        }
    }
}
