package io.github.etim.etim.mob;

import java.util.List;

/**
 * B-53 census D :141 — the R196 {@code contained_items} carrier
 * ({@code EntityLivingBase.java:72}). 1.12 has no such list, so the mixin
 * on {@code EntityLivingBase} owns it; the valuable pickup branch appends
 * item ids and the death/drop/despawn paths read it.
 *
 * <p>R196 stores the item ids as {@code |id|id} in NBT (:412/:455) and
 * drops one item per id on death (:914, gated by child/loot/massive-fall).
 * The 1.12 side keeps the same string shape under the
 * {@code ETIMContainedItems} key.</p>
 */
public interface ETIMContainedItemsDuck {

    List<Integer> etim$getContainedItems();

    void etim$addContainedItem(int itemId);

    void etim$dropContainedItems();
}
