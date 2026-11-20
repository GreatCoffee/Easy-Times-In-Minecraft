package io.github.etim.etim.metal;

/**
 * R196 {@code ItemClub} (ItemClub.java:3-27) — the two-component wooden club.
 *
 * <p>Everything is inherited from {@link ETIMItemCudgel}; the club only
 * changes reach (+0.5), tool type, base damage (1.0 + 1.0 = 2.0) and
 * durability components (2 → 400). {@code canBlock()} is true in R196
 * (ItemClub:20-22); the 1.12 carrier face is the exact-class whitelist in
 * {@code ETIMBlocking.isBlockCarrier}, not a method on Item.</p>
 */
public class ETIMItemClub extends ETIMItemCudgel {

    public ETIMItemClub() {
        super("club", 2.0F, 2, 0.5F);
    }
}
