package io.github.etim.etim.mob;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import net.minecraft.entity.EntityCreature;
import net.minecraft.entity.ai.EntityAIBase;
import net.minecraft.pathfinding.Path;
import net.minecraft.pathfinding.PathPoint;
import net.minecraft.util.math.BlockPos;

/**
 * B-59 — R196 {@code EntityAISeekLitTorch.java} (76 lines).
 *
 * <p>The goal rolls every tick: {@code rand.nextInt(40) <= 0} for a Shadow,
 * {@code 200} for anyone else. On a hit it collects up to 8 lit-source
 * candidates within 16 blocks horizontally and 4 vertically, tries them
 * nearest-first, and accepts the first path whose final point still stands
 * next to a lit source ({@code isNearLitTorch}). It keeps running while
 * the navigator has a path.</p>
 */
public class ETIMEntityAISeekLitTorch extends EntityAIBase {

    private static final int CANDIDATE_LIMIT = 8;
    private static final int RADIUS = 16;
    private static final int VERTICAL = 4;

    private final EntityCreature owner;
    private final double speed;

    public ETIMEntityAISeekLitTorch(EntityCreature owner, double speed) {
        this.owner = owner;
        this.speed = speed;
        this.setMutexBits(1);
    }

    @Override
    public boolean shouldExecute() {
        int roll = this.owner instanceof ETIMEntityShadow ? 40 : 200; // :18
        if (this.owner.getRNG().nextInt(roll) > 0) {
            return false;
        }
        return this.findPathToLitTorch();
    }

    @Override
    public boolean shouldContinueExecuting() {
        return !this.owner.getNavigator().noPath(); // :70-75
    }

    @Override
    public void startExecuting() {
        this.owner.getNavigator().setSpeed(this.speed);
    }

    private boolean findPathToLitTorch() {
        BlockPos base = new BlockPos(this.owner);
        List<BlockPos> candidates = new ArrayList<>();
        BlockPos min = base.add(-RADIUS, -VERTICAL, -RADIUS);
        BlockPos max = base.add(RADIUS, VERTICAL, RADIUS);
        for (BlockPos pos : BlockPos.getAllInBoxMutable(min, max)) {
            if (ETIMLightSourceSuppression.isLitSource(this.owner.world.getBlockState(pos))) {
                candidates.add(pos.toImmutable());
                if (candidates.size() >= CANDIDATE_LIMIT) {
                    break;
                }
            }
        }
        candidates.sort(Comparator.comparingDouble(p -> p.distanceSq(base)));
        int height = (int) Math.ceil(this.owner.height);
        for (BlockPos candidate : candidates) {
            Path path = this.owner.getNavigator().getPathToPos(candidate);
            if (path == null) {
                continue;
            }
            PathPoint end = path.getFinalPathPoint();
            if (end != null && ETIMLightSourceSuppression.isNearLitTorch(
                    this.owner.world, new BlockPos(end.x, end.y, end.z), height)) {
                if (ETIMConfig.mobDebugLog) {
                    ETIM.LOGGER.info("[StalkerLog] seek cls={} torch={} dist={} entity={}",
                            this.owner.getClass().getSimpleName(), candidate,
                            (int) Math.sqrt(candidate.distanceSq(base)), this.owner.getEntityId());
                }
                return true;
            }
        }
        return false;
    }
}
