package io.github.etim.etim.world;

import com.google.gson.JsonObject;

import net.minecraft.advancements.ICriterionTrigger;
import net.minecraft.advancements.PlayerAdvancements;
import net.minecraft.advancements.critereon.AbstractCriterionInstance;
import net.minecraft.entity.player.EntityPlayerMP;
import net.minecraft.util.ResourceLocation;

import java.util.HashMap;
import java.util.Map;

import io.github.etim.etim.ETIM;

/**
 * underworld 二阶段 T10 — the F-5-48 trigger (ND-01/02/03): the porta
 * achievement route rides a custom {@link ICriterionTrigger} (the 1.12
 * successors of R196 {@code AchievementList.portalToNether}; ETIM has no
 * achievement system, first-stage C-2 — this batch starts the smallest
 * possible page).
 *
 * <p>Grant face: {@link #grant(EntityPlayerMP)} is called by the
 * {@code PlayerInteractionManager.tryHarvestBlock} mixin (R196
 * {@code ItemInWorldManager :204-213}: removed ∧ underworld ∧ y &lt; 6 ∧
 * four neighbours mantle_or_core). Deserialized criteria instances always
 * match — the predicate is server-side at the grant site, the JSON criterion
 * is effectively delegated.</p>
 */
public final class ETIMPortalTrigger implements ICriterionTrigger<ETIMPortalTrigger.Instance> {

    public static final ResourceLocation ID = new ResourceLocation(ETIM.MOD_ID, "portal_to_nether");
    public static final ETIMPortalTrigger INSTANCE = new ETIMPortalTrigger();

    private final Map<PlayerAdvancements, Listener<Instance>> listeners = new HashMap<>();

    static final class Instance extends AbstractCriterionInstance {
        private Instance() {
            super(ID);
        }

        static final Instance ANY = new Instance();
    }

    private ETIMPortalTrigger() {
    }

    public static void register() {
        net.minecraft.advancements.CriteriaTriggers.register(INSTANCE);
        ETIMDimensions.dimLog("portal-trigger registered id=etim:portal_to_nether");
    }

    /** The mixin-side grant face (server authority single point). */
    public void grant(EntityPlayerMP player) {
        Listener<Instance> listener = this.listeners.get(player.getAdvancements());
        if (listener != null) {
            listener.grantCriterion(player.getAdvancements()); // 1.12 Listener face
        }
    }

    @Override
    public ResourceLocation getId() {
        return ID;
    }

    @Override
    public void addListener(PlayerAdvancements advancements, Listener<Instance> listener) {
        this.listeners.put(advancements, listener);
    }

    @Override
    public void removeListener(PlayerAdvancements advancements, Listener<Instance> listener) {
        this.listeners.remove(advancements);
    }

    @Override
    public void removeAllListeners(PlayerAdvancements advancements) {
        this.listeners.remove(advancements);
    }

    @Override
    public Instance deserializeInstance(JsonObject json, com.google.gson.JsonDeserializationContext context) {
        return Instance.ANY;
    }
}
