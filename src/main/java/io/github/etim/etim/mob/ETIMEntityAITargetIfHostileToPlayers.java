package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import net.minecraft.entity.EntityCreature;
import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.ai.EntityAINearestAttackableTarget;
import net.minecraft.entity.player.EntityPlayer;

/**
 * B-34 — R196 {@code EntityAITargetIfHostileToPlayers} (:1-21) verbatim,
 * seated by {@code MixinEntityWolf} only (R196 {@code EntityWolf :38}
 * {@code targetTasks.addTask(3, …, EntityPlayer.class, 0, true)}).
 *
 * <p>R196 shape:</p>
 * <ul>
 *   <li>{@code shouldExecute :12-14} — {@code (isHostileToPlayers() ||
 *       is_witch_ally) && super}. The witch-ally face is out of scope
 *       (ETIM never makes wolves witch-allies — C-note); the gate rides
 *       the hostile flag only.</li>
 *   <li>{@code startExecuting :17-20} — {@code setIsAttacking(true) +
 *       super}. The 1.12 carrier of the R196 {@code isAttacking} face =
 *       {@code setAngry(true)} (the 1.12 vanilla {@code :242-244} already
 *       auto-clears angry at the no-target — the R196 {@code :197-199}
 *       parity). The R196 {@code setAttackTarget}-override faces
 *       ({@code :330-340}: a player target ≠ owner → the hostile set +
 *       {@code startTargetCountdown}) ride the start here (C-note: the
 *       R196 face fires on EVERY {@code setAttackTarget}, ours only on
 *       this AI's start — the HurtByTarget-driven re-targets do not
 *       re-set the flag; the countdown timeout still clears both).</li>
 * </ul>
 *
 * <p>Ctor carrier: the R196 four-param {@code (entity, Class, 0, true)}
 * has no 1.12 one-to-one (the 1.12 four-param =
 * {@code (checkSight, onlyNearby)}); the six-param carrier
 * {@code (creature, Class, 0, true, false, null)} = the chance-0 face
 * (the random gate skipped) + the sight check (C-note).</p>
 *
 * <p>Judge rows: {@code [AILog] wolfhostile src=wolf …} — the start row
 * unconditional (the B-29 lesson); probe = the 1/16 roll family. Flag
 * seat = {@code livestockNeedsR196} (the thirteenth reuse).</p>
 */
public class ETIMEntityAITargetIfHostileToPlayers extends EntityAINearestAttackableTarget<EntityPlayer> {

    private final EntityLiving owner;

    /** B-19 r4 probe pattern: one row per 16 shouldExecute calls. */
    private static int probeCounter = 0;

    public ETIMEntityAITargetIfHostileToPlayers(EntityCreature owner) {
        super(owner, EntityPlayer.class, 0, true, false, null);
        this.owner = owner;
    }

    /** R196 :12-14 — the hostile gate + super. */
    @Override
    public boolean shouldExecute() {
        if (!ETIMConfig.livestockNeedsR196) {
            return false;
        }
        if (ETIMConfig.mobDebugLog) {
            int idx = (probeCounter = probeCounter + 1) % 16;
            if (idx == 0) {
                ETIMWolfHostilityDuck duck = (ETIMWolfHostilityDuck) this.owner;
                ETIM.LOGGER.info("[AILog] wolfhostile src=wolf probe-in inv=" + probeCounter
                        + " hostile=" + duck.etim$isHostileToPlayers()
                        + " cd=" + duck.etim$getTargetCountdown()
                        + " flag=" + ETIMConfig.livestockNeedsR196
                        + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
            }
        }
        ETIMWolfHostilityDuck duck = (ETIMWolfHostilityDuck) this.owner;
        if (!duck.etim$isHostileToPlayers()) {
            return false; // R196 :13 — the hostile face (the witch-ally arm is out of scope, C)
        }
        return super.shouldExecute();
    }

    /** R196 :17-20 — the angry set + the hostile/countdown faces + super. */
    @Override
    public void startExecuting() {
        net.minecraft.entity.passive.EntityWolf wolf =
                (net.minecraft.entity.passive.EntityWolf) this.owner;
        ETIMWolfHostilityDuck duck = (ETIMWolfHostilityDuck) this.owner;
        boolean tamed = wolf.isTamed();
        if (!tamed) {
            // The R196 setAttackTarget-override face (:330-340) — the player
            // target ≠ owner → the hostile set + the countdown arm.
            duck.etim$setHostileToPlayers(true);
            duck.etim$setTargetCountdown(ETIMWolfHostilityDuck.freshCountdown(this.owner.getRNG())); // :305-307
        }
        wolf.setAngry(true); // the R196 setIsAttacking(true) carrier
        // The judge row lands UNCONDITIONALLY (the B-29 lesson).
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[AILog] wolfhostile src=wolf start"
                    + " target=" + (this.targetEntity != null
                            ? this.targetEntity.getClass().getSimpleName() + "#" + this.targetEntity.getEntityId() : "null")
                    + " hostile=" + duck.etim$isHostileToPlayers()
                    + " cd=" + duck.etim$getTargetCountdown()
                    + " tamed=" + tamed
                    + " entity=" + this.owner.getClass().getSimpleName() + "#" + this.owner.getEntityId());
        }
        super.startExecuting(); // the R196 :20 super — sets the attack target
    }
}
