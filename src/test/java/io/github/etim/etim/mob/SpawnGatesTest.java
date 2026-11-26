package io.github.etim.etim.mob;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Random;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import net.minecraft.entity.EntityLiving;
import net.minecraft.entity.monster.EntityCreeper;
import net.minecraft.entity.monster.EntityGhast;
import net.minecraft.entity.monster.EntitySlime;
import net.minecraft.entity.monster.EntitySpider;
import net.minecraft.entity.monster.EntityZombie;
import net.minecraft.init.Bootstrap;

/**
 * R196 WorldServer:604-718 gate table, one test per branch.
 *
 * <p>Every world read comes from {@link SpawnGates.Ctx}; dice are scripted so
 * the assertions are about the decision tree, not about {@code Random}.</p>
 */
class SpawnGatesTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    /** Overrides both draws with an exact sequence; fails loudly on overrun. */
    private static final class ScriptedDice extends SpawnGates.Dice {
        private final int[] ints;
        private final float[] floats;
        private int ii;
        private int fi;

        ScriptedDice(int[] ints, float[] floats) {
            super(new Random(0L));
            this.ints = ints;
            this.floats = floats;
        }

        @Override
        public int nextInt(int bound) {
            assertTrue(ii < ints.length, "nextInt exhausted");
            int v = ints[ii++];
            assertTrue(v < bound, "scripted " + v + " >= bound " + bound);
            return v;
        }

        @Override
        public float nextFloat() {
            assertTrue(fi < floats.length, "nextFloat exhausted");
            return floats[fi++];
        }
    }

    private static SpawnGates.Ctx ctx() {
        SpawnGates.Ctx c = new SpawnGates.Ctx();
        c.rand = new ScriptedDice(new int[0], new float[0]);
        return c;
    }

    private static SpawnGates.Ctx dice(SpawnGates.Ctx c, int[] ints, float[] floats) {
        c.rand = new ScriptedDice(ints, floats);
        return c;
    }

    private static SpawnGates.Decision decide(Class<? extends EntityLiving> cls, SpawnGates.Ctx c) {
        return SpawnGates.decide(cls, c);
    }

    // ---- creeper: 3/4 lit-outdoor night drop, then depth/coin infernal ----

    @Test
    void creeperLitOutdoorNightRejects() {
        SpawnGates.Ctx c = ctx();
        c.skylight = true;
        c.day = false;
        c.seeSky = true;
        dice(c, new int[] {3}, new float[0]);
        SpawnGates.Decision d = decide(EntityCreeper.class, c);
        assertEquals(SpawnGates.Kind.REJECT, d.kind);
        assertEquals("creeper-lit", d.reason);
    }

    @Test
    void creeperDayOrIndoorsSkipsTheDrop() {
        SpawnGates.Ctx c = ctx();
        c.skylight = true;
        c.day = true; // day: the 3/4 drop does not apply
        c.seeSky = true;
        dice(c, new int[] {0}, new float[] {0.9F});
        assertEquals(SpawnGates.Kind.PASS, decide(EntityCreeper.class, c).kind);
    }

    @Test
    void creeperDeepCoinBecomesInfernal() {
        SpawnGates.Ctx c = ctx();
        c.y = 30;
        dice(c, new int[] {31}, new float[] {0.49F});
        assertEquals(SpawnGates.Kind.INFERNAL, decide(EntityCreeper.class, c).kind);
    }

    @Test
    void creeperShallowCoinStaysPlain() {
        SpawnGates.Ctx c = ctx();
        c.y = 64;
        dice(c, new int[] {0}, new float[0]);
        assertEquals(SpawnGates.Kind.PASS, decide(EntityCreeper.class, c).kind);
    }

    // ---- spider: 1/4 lit-outdoor drop, no daytime clause ----

    @Test
    void spiderLitQuarterRejects() {
        SpawnGates.Ctx c = ctx();
        c.skylight = true;
        c.seeSky = true;
        c.day = true; // R196 spider gate has no daytime clause
        dice(c, new int[] {0}, new float[0]);
        assertEquals("spider-lit", decide(EntitySpider.class, c).reason);
    }

    @Test
    void spiderOtherDicePass() {
        SpawnGates.Ctx c = ctx();
        c.skylight = true;
        c.seeSky = true;
        dice(c, new int[] {2}, new float[0]);
        assertEquals(SpawnGates.Kind.PASS, decide(EntitySpider.class, c).kind);
    }

    // ---- black widow: per-attempt 50% ----

    @Test
    void blackWidowLowDiceRejectsWithValue() {
        SpawnGates.Ctx c = ctx();
        dice(c, new int[0], new float[] {0.3F});
        SpawnGates.Decision d = decide(ETIMEntityBlackWidowSpider.class, c);
        assertEquals("blackwidow", d.reason);
        assertEquals(0.3F, d.value, 0.0001F);
    }

    @Test
    void blackWidowHighDicePasses() {
        SpawnGates.Ctx c = ctx();
        dice(c, new int[0], new float[] {0.5F});
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityBlackWidowSpider.class, c).kind);
    }

    // ---- demon / phase spider: overworld y<=32 ----

    @Test
    void demonSpiderAboveThirtyTwoRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 33;
        assertEquals("depth", decide(ETIMEntityDemonSpider.class, c).reason);
    }

    @Test
    void demonSpiderAtThirtyTwoPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 32;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityDemonSpider.class, c).kind);
    }

    @Test
    void phaseSpiderKeepsTheUnderworldBypass() {
        SpawnGates.Ctx c = ctx();
        c.overworld = false;
        c.y = 100;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityPhaseSpider.class, c).kind);
    }

    // ---- wood spider: structure gate ----

    @Test
    void woodSpiderWithoutStructureRejects() {
        SpawnGates.Ctx c = ctx();
        c.woodspiderOk = false;
        assertEquals("woodspider", decide(ETIMEntityWoodSpider.class, c).reason);
    }

    @Test
    void woodSpiderWithStructurePasses() {
        SpawnGates.Ctx c = ctx();
        c.woodspiderOk = true;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityWoodSpider.class, c).kind);
    }

    // ---- slime: no stone above ----

    @Test
    void slimeUnderStoneRejects() {
        SpawnGates.Ctx c = ctx();
        c.stoneAbove = true;
        assertEquals("slime", decide(EntitySlime.class, c).reason);
    }

    @Test
    void slimeUnderAirPasses() {
        SpawnGates.Ctx c = ctx();
        assertEquals(SpawnGates.Kind.PASS, decide(EntitySlime.class, c).kind);
    }

    // ---- ooze: y<=32 + stone floor + stone ceiling ----

    @Test
    void oozeAboveThirtyTwoRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 33;
        c.stoneFloor = true;
        c.stoneAbove = true;
        assertEquals("ooze", decide(ETIMEntityOoze.class, c).reason);
    }

    @Test
    void oozeNeedsBothStones() {
        SpawnGates.Ctx c = ctx();
        c.y = 20;
        c.stoneFloor = false;
        c.stoneAbove = true;
        assertEquals("ooze", decide(ETIMEntityOoze.class, c).reason);
    }

    @Test
    void oozeSandwichPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 20;
        c.stoneFloor = true;
        c.stoneAbove = true;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityOoze.class, c).kind);
    }

    // ---- jelly: ceiling only ----

    @Test
    void jellyWithoutCeilingRejects() {
        SpawnGates.Ctx c = ctx();
        assertEquals("jelly", decide(ETIMEntityJelly.class, c).reason);
    }

    @Test
    void jellyWithCeilingPasses() {
        SpawnGates.Ctx c = ctx();
        c.stoneAbove = true;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityJelly.class, c).kind);
    }

    // ---- blob: y<=40, no floor requirement ----

    @Test
    void blobAboveFortyRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 41;
        c.stoneAbove = true;
        assertEquals("gel", decide(ETIMEntityBlob.class, c).reason);
    }

    @Test
    void blobAtFortyPassesWithoutFloor() {
        SpawnGates.Ctx c = ctx();
        c.y = 40;
        c.stoneAbove = true;
        c.stoneFloor = false;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityBlob.class, c).kind);
    }

    // ---- pudding: y<=24 + floor + ceiling ----

    @Test
    void puddingAboveTwentyFourRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 25;
        c.stoneAbove = true;
        c.stoneFloor = true;
        assertEquals("gel", decide(ETIMEntityPudding.class, c).reason);
    }

    @Test
    void puddingNeedsFloor() {
        SpawnGates.Ctx c = ctx();
        c.y = 10;
        c.stoneAbove = true;
        c.stoneFloor = false;
        assertEquals("gel", decide(ETIMEntityPudding.class, c).reason);
    }

    @Test
    void puddingAtTwentyFourPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 24;
        c.stoneAbove = true;
        c.stoneFloor = true;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityPudding.class, c).kind);
    }

    // ---- revenant / bone lord: blood-moon opens the surface ----

    @Test
    void revenantAboveFortyFourRejectsWithoutBlood() {
        SpawnGates.Ctx c = ctx();
        c.y = 45;
        c.blood = false;
        assertEquals("deep", decide(ETIMEntityRevenant.class, c).reason);
    }

    @Test
    void revenantBloodMoonPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 45;
        c.blood = true;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityRevenant.class, c).kind);
    }

    @Test
    void revenantAtFortyFourPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 44;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityRevenant.class, c).kind);
    }

    @Test
    void boneLordAboveThirtyTwoRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 33;
        assertEquals("deep", decide(ETIMEntityBoneLord.class, c).reason);
    }

    // ---- ghoul / wight / shadow: cfg + blood/desert/freezing gate ----

    @Test
    void ghoulCfgOffRejects() {
        SpawnGates.Ctx c = ctx();
        c.undeadSurface = false;
        assertEquals("undead-cfg", decide(ETIMEntityGhoul.class, c).reason);
    }

    @Test
    void ghoulGateRejects() {
        SpawnGates.Ctx c = ctx();
        c.undeadOk = false;
        assertEquals("undead", decide(ETIMEntityGhoul.class, c).reason);
    }

    @Test
    void ghoulOpenPasses() {
        SpawnGates.Ctx c = ctx();
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityGhoul.class, c).kind);
    }

    @Test
    void wightAndShadowUseTheSameArms() {
        SpawnGates.Ctx c = ctx();
        c.undeadOk = false;
        assertEquals("undead", decide(ETIMEntityWight.class, c).reason);
        assertEquals("undead", decide(ETIMEntityShadow.class, c).reason);
        assertEquals("undead", decide(ETIMEntityInvisibleStalker.class, c).reason);
    }

    // ---- cfg switches for the gel and bat families ----

    @Test
    void gelCfgOffRejectsEvenWithCeiling() {
        SpawnGates.Ctx c = ctx();
        c.stoneAbove = true;
        c.gelatinous = false;
        assertEquals("gel-cfg", decide(ETIMEntityJelly.class, c).reason);
    }

    @Test
    void batCfgOffRejects() {
        SpawnGates.Ctx c = ctx();
        c.batFamily = false;
        assertEquals("bat-cfg", decide(ETIMEntityVampireBat.class, c).reason);
    }

    // ---- bats: y<=48 / y<=32 or blood ----

    @Test
    void vampireBatAboveFortyEightRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 49;
        assertEquals("bat", decide(ETIMEntityVampireBat.class, c).reason);
    }

    @Test
    void vampireBatBloodMoonPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 49;
        c.blood = true;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityVampireBat.class, c).kind);
    }

    @Test
    void nightwingAboveThirtyTwoRejects() {
        SpawnGates.Ctx c = ctx();
        c.y = 33;
        assertEquals("bat", decide(ETIMEntityNightwing.class, c).reason);
    }

    @Test
    void nightwingAtThirtyTwoPasses() {
        SpawnGates.Ctx c = ctx();
        c.y = 32;
        assertEquals(SpawnGates.Kind.PASS, decide(ETIMEntityNightwing.class, c).kind);
    }

    // ---- ghast dedup cancels the whole pick ----

    @Test
    void ghastDedupCancels() {
        SpawnGates.Ctx c = ctx();
        c.ghastDedup = true;
        assertEquals(SpawnGates.Kind.CANCEL, decide(EntityGhast.class, c).kind);
    }

    @Test
    void ghastWithoutDedupPasses() {
        SpawnGates.Ctx c = ctx();
        assertEquals(SpawnGates.Kind.PASS, decide(EntityGhast.class, c).kind);
    }

    // ---- untouched classes fall straight through ----

    @Test
    void unrelatedMobPasses() {
        SpawnGates.Ctx c = ctx();
        assertEquals(SpawnGates.Kind.PASS, decide(EntityZombie.class, c).kind);
    }

    // ---- order: the depth arm wins before the gel arm ----

    @Test
    void depthArmRunsBeforeGelCfgArm() {
        SpawnGates.Ctx c = ctx();
        c.y = 33;
        c.gelatinous = false;
        assertEquals("depth", decide(ETIMEntityDemonSpider.class, c).reason);
    }
}
