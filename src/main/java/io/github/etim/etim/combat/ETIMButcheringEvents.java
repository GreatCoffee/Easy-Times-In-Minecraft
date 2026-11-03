package io.github.etim.etim.combat;

import net.minecraft.entity.EntityAgeable;
import net.minecraft.entity.EntityLivingBase;
import net.minecraft.entity.passive.EntityCow;
import net.minecraft.entity.passive.EntityPig;
import net.minecraft.entity.passive.EntitySheep;
import net.minecraft.entity.monster.EntitySpider;
import net.minecraft.world.World;
import net.minecraftforge.event.entity.living.LivingDropsEvent;
import net.minecraftforge.fml.common.eventhandler.EventPriority;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;

import java.util.List;

/**
 * butchering (batch B5, audit20 条 262-265) zero-mixin event face.
 * D-1 乙 (条 264): the R196 formulas ride {@code LivingDropsEvent} —
 * vanilla {@code EntityLivingBase.onDeath} fills the capture list from
 * the loot table (:1307-1316, loot-table products ONLY — the pig saddle /
 * horse armor / chest contents drop AFTER super.onDeath and are never in
 * the list, 条 263 F8 锤位), then fires the event (:1318) BEFORE spawning
 * (:1320-1324). We never self-spawn; we edit the list the vanilla loop
 * then materializes.
 *
 * <p>Gates (条 263 主会话亲锤位):</p>
 * <ul>
 *   <li><b>empty-table replica</b> — vanilla gate :1310
 *       {@code canDropLoot() && doMobLoot}: when IT fails the list arrives
 *       EMPTY but the event STILL fires — we must NOT fabricate drops, so
 *       the replica runs first (child animals / doMobLoot=false ⇒ no
 *       butchering, vanilla 0 drops stay 0).</li>
 *   <li><b>canceled events</b> — keep hands off (another listener decided).</li>
 *   <li><b>family gate</b> — D-9 乙 instanceof-shape families (C-注1, 条 265):
 *       cows (+mooshroom), pigs, sheep, AbstractHorse (+llama), spiders
 *       (+cave spider). One living, one family, if/else first-match — the
 *       delete-set never crosses families (C-注4).</li>
 *   <li><b>select delete</b> — vanilla {@code list.removeIf(familyItem)}
 *       then the face re-adds. NO blanket clear (B-1, 条 263: stray items
 *       from other listeners survive).</li>
 * </ul>
 *
 * <p>Priority NORMAL; every kill runs one gate row + one family row through
 * {@code ETIMButchering.row} (single-line, the [ButchLog] gate = the D-6 cfg
 * key). All RNG = the dying entity's own RNG (same-source as vanilla).</p>
 */
public final class ETIMButcheringEvents {

    private ETIMButcheringEvents() {
    }

    /** Register once from ETIM preInit (the ETIMFarmingEvents precedent). */
    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(ETIMButcheringEvents.class);
    }

    @SubscribeEvent(priority = EventPriority.NORMAL)
    public static void onLivingDrops(LivingDropsEvent event) {
        World world = event.getEntityLiving().world;
        if (world.isRemote || event.isCanceled()) {
            return;
        }
        EntityLivingBase e = event.getEntityLiving();
        if (!ETIMButchering.isBatchFamily(e)) {
            return;
        }
        // F8 empty-table replica (B-3, 条 263): vanilla gate :1310 — child animals /
        // doMobLoot=false leave the list EMPTY and vanilla spawns NOTHING; the event
        // still fires (:1318), so without this replica we would fabricate drops.
        boolean child = e instanceof EntityAgeable && ((EntityAgeable) e).isChild();
        boolean lootOn = world.getGameRules().getBoolean("doMobLoot");
        if (child || !lootOn) {
            ETIMButchering.row("gate entity=" + e.getClass().getSimpleName() + " child=" + child
                    + " doMobLoot=" + lootOn + " → skip");
            return;
        }

        int level = ETIMButchering.level(event.getSource());
        java.util.Random rnd = e.getRNG();
        List<net.minecraft.entity.item.EntityItem> list = event.getDrops();
        int removedBefore = (int) list.stream().filter(it -> ETIMButchering.isFamilyItem(e, it.getItem())).count();
        list.removeIf(it -> ETIMButchering.isFamilyItem(e, it.getItem()));
        ETIMButchering.row("gate entity=" + e.getClass().getSimpleName() + " child=" + child
                + " doMobLoot=" + lootOn + " lvl=" + level + " kept=" + list.size()
                + " familyRemoved=" + removedBefore + " recent=" + event.isRecentlyHit()
                + " well=" + (e instanceof EntityCow || e instanceof EntityPig || e instanceof EntitySheep
                        ? ETIMButchering.isWell(e) : "n/a"));

        if (e instanceof EntityCow) {
            ETIMButchering.butcherCow(e, rnd, level, list, world);
        } else if (e instanceof EntityPig) {
            ETIMButchering.butcherPig(e, rnd, level, list, world);
        } else if (e instanceof EntitySheep) {
            ETIMButchering.butcherSheep(e, rnd, level, list, world);
        } else if (net.minecraft.entity.passive.AbstractHorse.class.isInstance(e)) {
            ETIMButchering.butcherHorse(e, rnd, level, list, world);
        } else if (e instanceof EntitySpider) {
            ETIMButchering.butcherSpider(e, rnd, level, event.isRecentlyHit(), list, world);
        }
    }
}
