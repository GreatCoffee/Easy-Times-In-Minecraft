package io.github.etim.etim.mob;

import java.util.Random;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.EntityCreeper;
import net.minecraft.entity.monster.EntityGhast;
import net.minecraft.entity.monster.EntitySlime;
import net.minecraft.entity.monster.EntitySpider;

/**
 * R196 {@code WorldServer.getSuitableCreature} per-class gates
 * (WorldServer:604-718), factored out of {@link ETIMSpawnTables#pickSpawn} so
 * the decision tree can be exercised without a server.
 *
 * <p>Every world read is carried by {@link Ctx}; the only side effect is the
 * caller's {@link Random}, consumed in exactly the R196 order so a seeded run
 * reproduces the one-hand dice. {@link Kind#INFERNAL} is the creeper's
 * depth/coin replacement, {@link Kind#CANCEL} the ghast 48² dedup.</p>
 */
public final class SpawnGates {

    private SpawnGates() {
    }

    public enum Kind {
        /** The weighted pick survives this attempt. */
        PASS,
        /** Retry the pick (the 16-attempt loop lives in pickSpawn). */
        REJECT,
        /** Creeper replaced by the infernal variant. */
        INFERNAL,
        /** Ghast dedup: the whole pick returns null. */
        CANCEL
    }

    /**
     * Dice surface the gates consume. Production wraps {@code World.rand};
     * tests override the two draws to script an exact one-hand sequence.
     */
    public static class Dice {
        private final Random rand;

        public Dice(Random rand) {
            this.rand = rand;
        }

        public int nextInt(int bound) {
            return rand.nextInt(bound);
        }

        public float nextFloat() {
            return rand.nextFloat();
        }
    }

    /** Immutable-by-convention inputs; tests fill the fields they need. */
    public static final class Ctx {
        public int y;
        public boolean skylight;
        public boolean day;
        public boolean seeSky;
        /** True on the overworld ({@code ETIMUnderworldSpawns.checkDepth}). */
        public boolean overworld = true;
        /** Blood-moon night. */
        public boolean blood;
        public boolean stoneAbove;
        public boolean stoneFloor;
        public boolean woodspiderOk = true;
        public boolean undeadOk = true;
        public boolean ghastDedup;
        public boolean gelatinous = true;
        public boolean batFamily = true;
        public boolean undeadSurface = true;
        public Dice rand;
    }

    public static final class Decision {
        public final Kind kind;
        public final String reason;
        /** Dice value for reasons whose log line carries it; NaN otherwise. */
        public final float value;

        Decision(Kind kind, String reason) {
            this(kind, reason, Float.NaN);
        }

        Decision(Kind kind, String reason, float value) {
            this.kind = kind;
            this.reason = reason;
            this.value = value;
        }
    }

    private static Decision pass() {
        return new Decision(Kind.PASS, "pass");
    }

    private static Decision reject(String reason) {
        return new Decision(Kind.REJECT, reason);
    }

    /**
     * Gate one weighted pick. Order is the R196 if-chain order, which matters
     * both for which rejection reason wins and for the dice sequence.
     */
    public static Decision decide(Class<? extends EntityLiving> cls, Ctx c) {
        if (cls == EntityCreeper.class) {
            if (c.skylight && !c.day && c.seeSky && c.rand.nextInt(4) != 0) {
                return reject("creeper-lit");
            }
            if (c.rand.nextInt(40) >= c.y && c.rand.nextFloat() < 0.5F) {
                return new Decision(Kind.INFERNAL, "creeper-infernal");
            }
            return pass();
        }
        if (cls == EntitySpider.class) {
            if (c.skylight && c.seeSky && c.rand.nextInt(4) == 0) {
                return reject("spider-lit");
            }
            return pass();
        }
        if (cls == ETIMEntityBlackWidowSpider.class) {
            float dice = c.rand.nextFloat();
            if (dice < 0.5F) {
                return new Decision(Kind.REJECT, "blackwidow", dice);
            }
            return pass();
        }
        if ((cls == ETIMEntityDemonSpider.class || cls == ETIMEntityPhaseSpider.class)
                && c.overworld && c.y > 32) {
            return reject("depth");
        }
        if (cls == ETIMEntityWoodSpider.class && !c.woodspiderOk) {
            return reject("woodspider");
        }
        if (cls == EntitySlime.class && c.stoneAbove) {
            return reject("slime");
        }
        if (cls == ETIMEntityOoze.class) {
            boolean depthOk = !c.overworld || c.y <= 32;
            if (!depthOk || !c.stoneFloor || !c.stoneAbove) {
                return reject("ooze");
            }
        }
        if (cls == ETIMEntityJelly.class && !c.stoneAbove) {
            return reject("jelly");
        }
        if (cls == ETIMEntityBlob.class || cls == ETIMEntityPudding.class) {
            boolean isPudding = cls == ETIMEntityPudding.class;
            int threshold = isPudding ? 24 : 40;
            boolean depthOk = !c.overworld || c.y <= threshold;
            boolean stoneFloor = !isPudding || c.stoneFloor;
            if (!depthOk || !stoneFloor || !c.stoneAbove) {
                return reject("gel");
            }
        }
        if (cls == ETIMEntityRevenant.class || cls == ETIMEntityBoneLord.class) {
            int threshold = cls == ETIMEntityRevenant.class ? 44 : 32;
            if (c.overworld && c.y > threshold && !c.blood) {
                return reject("deep");
            }
        }
        if (cls == ETIMEntityGhoul.class || cls == ETIMEntityWight.class
                || cls == ETIMEntityShadow.class || cls == ETIMEntityInvisibleStalker.class) {
            if (!c.undeadSurface) {
                return reject("undead-cfg");
            }
            if (!c.undeadOk) {
                return reject("undead");
            }
        }
        if (!c.gelatinous && (cls == ETIMEntityJelly.class || cls == ETIMEntityBlob.class
                || cls == ETIMEntityPudding.class || cls == ETIMEntityOoze.class)) {
            return reject("gel-cfg");
        }
        if (!c.batFamily
                && (cls == ETIMEntityVampireBat.class || cls == ETIMEntityNightwing.class)) {
            return reject("bat-cfg");
        }
        if (cls == ETIMEntityVampireBat.class || cls == ETIMEntityNightwing.class) {
            int threshold = cls == ETIMEntityVampireBat.class ? 48 : 32;
            if (c.overworld && c.y > threshold && !c.blood) {
                return reject("bat");
            }
        }
        if (cls == EntityGhast.class && c.ghastDedup) {
            return new Decision(Kind.CANCEL, "ghast");
        }
        return pass();
    }
}
