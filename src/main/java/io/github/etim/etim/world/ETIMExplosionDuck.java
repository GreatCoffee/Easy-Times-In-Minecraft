package io.github.etim.etim.world;

/**
 * B-67 (F-4): R196 {@code Explosion} carries two radii — {@code explosion_size_vs_blocks}
 * and {@code explosion_size_vs_living_entities} (Explosion.java:20-34). The 1.12 class
 * keeps a single {@code size} field, so the second radius rides this duck: the mixin
 * defaults it to {@code size} and callers that know better overwrite it.
 *
 * <p>中文：R196 的爆炸把「炸方块半径」与「炸生物半径」分开；1.12 只有一套。这里挂第二半径，
 * 默认等于原半径，需要区分的实体（苦力怕等）自行改写。</p>
 */
public interface ETIMExplosionDuck {

    /** R196 {@code explosion_size_vs_living_entities}. */
    float etim$getEntitySize();

    /** Overrides the entity radius; 0 or less is ignored. */
    void etim$setEntitySize(float size);
}
