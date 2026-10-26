package io.github.etim.etim.combat;

import net.minecraft.util.DamageSource;

/**
 * AD-6 natural-defense identity (A-2①, audit20-89/90): implemented by ETIM
 * mobs whose R196 counterpart overrides {@code getNaturalDefense(DamageSource)}
 * (base {@code EntityLivingBase.java:1157-1159} = 0.0F). The return value
 * already contains the class's source gate (bypass → 0; Witch has no bypass
 * gate; Wither has no gate at all) — the channel does not apply any gate of
 * its own and does not multiply by the wear factor (hard finding 4 = R196 :1191
 * adds the natural value straight into the total).
 */
public interface ETIMNaturalDefense {

    /** R196 {@code getNaturalDefense(DamageSource)} — gate included. */
    float etimNaturalDefense(DamageSource source);
}
