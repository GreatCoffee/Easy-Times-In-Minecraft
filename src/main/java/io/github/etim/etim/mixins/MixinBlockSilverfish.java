package io.github.etim.etim.mixins;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import io.github.etim.etim.mob.ETIMEntityCopperspine;
import io.github.etim.etim.mob.ETIMEntityHoarySilverfish;
import io.github.etim.etim.mob.ETIMEntityNetherspawn;
import io.github.etim.etim.world.ETIMDimensions;
import net.minecraft.block.BlockSilverfish;
import net.minecraft.block.state.IBlockState;
import net.minecraft.entity.monster.EntitySilverfish;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/**
 * R196 {@code BlockSilverfish.getSilverfishTypeForMetadata}：
 * meta 3（下界岩）→ {@code EntityNetherspawn}，meta 4（铜刺）→ {@code EntityCopperspine}，
 * 其余在深渊世界 → {@code EntityHoarySilverfish}，否则原版银鱼。
 *
 * <p>1.12 没有 {@code getMobType}，银鱼是在
 * {@code BlockSilverfish.dropBlockAsItemWithChance} 里直接 new 出来的，
 * 因此在该处 HEAD 取消并替换实体类。非 3/4 且非深渊时直接返回，保持原版路径。</p>
 */
@Mixin(BlockSilverfish.class)
public class MixinBlockSilverfish {

    @Inject(method = "dropBlockAsItemWithChance", at = @At("HEAD"), cancellable = true)
    private void etim$spawnTypedSilverfish(World worldIn, BlockPos pos, IBlockState state, float chance, int fortune, CallbackInfo ci) {
        if (!ETIMConfig.mobSilverfishR196) {
            return;
        }
        if (worldIn.isRemote || !worldIn.getGameRules().getBoolean("doTileDrops")) {
            return;
        }
        int meta = state.getValue(BlockSilverfish.VARIANT).getMetadata();
        EntitySilverfish fish;
        String kind;
        if (meta == 3) {
            fish = new ETIMEntityNetherspawn(worldIn);
            kind = "netherspawn";
        } else if (meta == 4) {
            fish = new ETIMEntityCopperspine(worldIn);
            kind = "copperspine";
        } else if (ETIMDimensions.isUnderworld(worldIn)) {
            fish = new ETIMEntityHoarySilverfish(worldIn);
            kind = "hoary";
        } else {
            return;
        }
        fish.setLocationAndAngles((double) pos.getX() + 0.5D, (double) pos.getY(), (double) pos.getZ() + 0.5D, 0.0F, 0.0F);
        worldIn.spawnEntity(fish);
        fish.spawnExplosionParticle();
        if (ETIMConfig.mobDebugLog) {
            ETIM.LOGGER.info("[SilverLog] hatch meta={} kind={} at {},{},{} entity={} [server]",
                    meta, kind, pos.getX(), pos.getY(), pos.getZ(), fish.getEntityId());
        }
        ci.cancel();
    }
}
