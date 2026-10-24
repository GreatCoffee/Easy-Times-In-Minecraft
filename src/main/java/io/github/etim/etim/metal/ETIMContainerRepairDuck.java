package io.github.etim.etim.metal;

/**
 * 批三修理面（砧修链）— the duck-typing seam over the {@code ContainerRepair}
 * takeover state. Carries the takeover state MixinContainerRepair computes;
 * the anvil-take face (ETIMAnvilRepair event) plus the client tooltip
 * (MixinGuiRepair) consume it.
 *
 * <p>This interface MUST live in the product package tree, NOT in
 * {@code io.github.etim.etim.mixins}: the mixin subsystem excludes the mixin
 * package from the LaunchClassLoader (mixin classes must never load twice),
 * so a NON-mixin interface there is unreachable at runtime — the merged
 * container's {@code implements} resolution throws ClassNotFound (smoke
 * 18:04 round). Mixin accessor interfaces dodge that because the mixin
 * processor consumes them (they never reach the implements list).</p>
 */
public interface ETIMContainerRepairDuck {

    /** The vanilla repair faces were replaced by the ETIM takeover this recompute. */
    boolean etimIsTakeover();

    /** 0 = clean, 1 = quality over budget (insufficientSkill), 2 = anvil too soft (needsHarderAnvil). */
    int etimFailState();

    /** The R196 plan kind ordinal of the current takeover ({@link ETIMAnvilRepair.Kind}). */
    int etimLastKind();
}
