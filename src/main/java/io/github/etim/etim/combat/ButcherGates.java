package io.github.etim.etim.combat;

/**
 * B-70UQ: the pure half of the R196 butchering roll tables.
 *
 * <p>Faces: EntityCow.java:91-107, EntityPig.java:113-123, EntitySheep.java:101-117,
 * EntityHorse.java:507-527, EntitySpider.java:201. Every method takes already-rolled
 * integers so the sequence of {@code rnd.nextInt(...)} calls stays in
 * {@link ETIMButchering} (the roll ORDER is itself a judgment value).</p>
 *
 * <p>中文：把「掷出来的数」映射成「掉几块」的部分抽出来；下一次骰子的顺序仍留在调用方，
 * 因为顺序本身是判值。</p>
 */
public final class ButcherGates {

    private ButcherGates() {
    }

    /** EntityCow.java:92 — {@code r(3) + 1}, never gated by wellness. */
    public static int cowLeather(int roll3) {
        return roll3 + 1;
    }

    /** EntityCow.java:99 — the base beef count, before the {@code ==1} nudge. */
    public static int cowBeefBase(boolean well, int roll3, int rollLevel) {
        return well ? roll3 + 1 + rollLevel : 0;
    }

    /** EntityCow.java:100 — only a single cut of beef triggers the half-coin nudge. */
    public static boolean cowNudgeRolls(int beef) {
        return beef == 1;
    }

    /** EntityCow.java:100-102 — the nudge itself: half the time it becomes two. */
    public static int cowBeefAfterNudge(int beef, int nudgeRoll2) {
        return (beef == 1 && nudgeRoll2 == 0) ? 2 : beef;
    }

    /** EntityPig.java:119 — {@code r(3)+1 + r(1+level)}, no nudge. */
    public static int pigPork(boolean well, int roll3, int rollLevel) {
        return well ? roll3 + 1 + rollLevel : 0;
    }

    /** EntitySheep.java:106-109 — {@code r(2) + r(1+level)} with the 1 floor. */
    public static int sheepMutton(boolean well, int roll2, int rollLevel) {
        if (!well) {
            return 0;
        }
        return Math.max(1, roll2 + rollLevel);
    }

    /** EntitySheep.java:101 — wool is only rolled when unsheared and not burning. */
    public static boolean sheepWoolGate(boolean sheared, boolean burning) {
        return !sheared && !burning;
    }

    /** EntitySheep.java:101-103 — the coin landing 0 gives wool. */
    public static boolean sheepWoolLanded(int roll2) {
        return roll2 == 0;
    }

    /** EntitySheep.java:116-117 — leather on the coin landing 0. */
    public static boolean sheepLeather(int roll2) {
        return roll2 == 0;
    }

    /** EntityHorse.java:514 — base piece count {@code r(3) + 1}. */
    public static int horsePieces(int roll3) {
        return roll3 + 1;
    }

    /** EntityHorse.java:521-524 — meat for horse/donkey/mule/llama; plain horses get the extra coin. */
    public static int horseMeat(boolean plainHorse, int rollLevel, int roll2) {
        return 1 + rollLevel + (plainHorse ? roll2 : 0);
    }

    /** EntitySpider.java:201 part 1 — the first coin landing 0 short-circuits the roll. */
    public static boolean spiderEyeFirst(int roll3) {
        return roll3 == 0;
    }

    /** EntitySpider.java:201 part 2 — otherwise a positive level roll still gives the eye. */
    public static boolean spiderEyeLevel(int rollLevel) {
        return rollLevel > 0;
    }

    /** EntityLiving.java (R196) wellness face — all three meters at least 0.25. */
    public static boolean well(float freedom, float food, float water) {
        return Math.min(freedom, Math.min(food, water)) >= 0.25F;
    }
}
