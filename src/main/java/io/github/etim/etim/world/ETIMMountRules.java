package io.github.etim.etim.world;

import net.minecraft.block.Block;
import net.minecraft.block.BlockAnvil;
import net.minecraft.block.BlockBasePressurePlate;
import net.minecraft.block.BlockBed;
import net.minecraft.block.BlockButton;
import net.minecraft.block.BlockChest;
import net.minecraft.block.BlockCocoa;
import net.minecraft.block.BlockDirectional;
import net.minecraft.block.BlockDispenser;
import net.minecraft.block.BlockDoor;
import net.minecraft.block.BlockEnderChest;
import net.minecraft.block.BlockFence;
import net.minecraft.block.BlockFenceGate;
import net.minecraft.block.BlockFire;
import net.minecraft.block.BlockFlowerPot;
import net.minecraft.block.BlockFurnace;
import net.minecraft.block.BlockGlass;
import net.minecraft.block.BlockLadder;
import net.minecraft.block.BlockLeaves;
import net.minecraft.block.BlockLever;
import net.minecraft.block.BlockLiquid;
import net.minecraft.block.BlockMobSpawner;
import net.minecraft.block.BlockPane;
import net.minecraft.block.BlockPistonBase;
import net.minecraft.block.BlockBush;
import net.minecraft.block.BlockPortal;
import net.minecraft.block.BlockRailBase;
import net.minecraft.block.BlockRedstoneWire;
import net.minecraft.block.BlockReed;
import net.minecraft.block.BlockSign;
import net.minecraft.block.BlockSkull;
import net.minecraft.block.BlockSlab;
import net.minecraft.block.BlockSnow;
import net.minecraft.block.BlockStairs;
import net.minecraft.block.BlockTorch;
import net.minecraft.block.BlockTrapDoor;
import net.minecraft.block.BlockTripWire;
import net.minecraft.block.BlockTripWireHook;
import net.minecraft.block.BlockVine;
import net.minecraft.block.BlockWall;
import net.minecraft.block.BlockWeb;
import net.minecraft.block.BlockBrewingStand;
import net.minecraft.block.BlockCake;
import net.minecraft.block.material.Material;
import net.minecraft.block.properties.IProperty;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.util.EnumFacing;
import net.minecraft.util.math.BlockPos;
import net.minecraft.world.World;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;

/**
 * R196 {@code BlockMounted.canMountToBlock} (census F :127,
 * {@code BlockMounted.java:22-39}) plus the subclass overrides that widen or
 * narrow it, ported onto the 1.12 placement funnel.
 *
 * <p>R196 order, base class ({@code BlockMounted.java}):</p>
 * <ol>
 *   <li>tilled field mounts anything ({@code :23-24});</li>
 *   <li>the top face of a jukebox refuses ({@code :25-26});</li>
 *   <li>leaves / "never hides adjacent faces" / cloth / sponge refuse
 *       ({@code :27-31});</li>
 *   <li>pistons refuse their front face ({@code :32-33});</li>
 *   <li>furnaces and dispensers refuse their front face ({@code :35-37});</li>
 *   <li>everything else needs a flat solid face (same arm).</li>
 * </ol>
 *
 * <p>Subclass arms run <em>before</em> the base arms, as they do in R196:</p>
 * <ul>
 *   <li>{@code BlockTorch.java:135-166}: fence / nether fence / cobble wall
 *       tops, any flat-solid top that is neither leaves nor directional,
 *       cloth on any face, snow layer depth &gt; 2 on the side, a single
 *       slab's bottom face, and stairs that are not top-half;</li>
 *   <li>{@code BlockSkull.java:57-73}: fence / wall tops, flat-solid tops,
 *       cloth on any face;</li>
 *   <li>{@code BlockTrapDoor.java:163-193}: rejects the hinge materials of
 *       {@code BlockDoor.java:307-318}, then allows slab / stairs / snow
 *       layer depth &gt; 2;</li>
 *   <li>{@code BlockButton.java:37-54}, {@code BlockLever.java:30-45},
 *       {@code BlockTripWireSource.java:249-254}: the mounting-material
 *       gates.</li>
 * </ul>
 *
 * <p>1.12 mapping: "never hides adjacent faces" is an explicit class list
 * ({@code Block.java:1775-1777}, 36 direct setters plus ice and the portal
 * block), <em>not</em> the non-full-cube family — the spawner is a full cube
 * and is on the list, so {@code !isFullCube()} cannot stand in for it. The
 * final "flat solid face" arm is left to the vanilla
 * {@code canPlaceBlockOnSide} geometry, which runs right after
 * {@code World#mayPlace} and already knows stairs / slab / snow shapes.</p>
 *
 * <p>Placement hook: {@code World#mayPlace} — the funnel every item
 * placement passes through in 1.12 ({@code world/World.java:3425-3443}); the
 * injected {@code pos} is the cell being filled and {@code sidePlacedOn} the
 * face that was clicked, i.e. the mounting face. Signs bypass that funnel
 * ({@code ItemSign.java:31-86} writes the block directly), so
 * {@code MixinItemSign} routes them here as well.</p>
 */
public final class ETIMMountRules {

    private ETIMMountRules() {
    }

    /** Rule name plus verdict, as produced by {@link #decide}. */
    public static final class Decision {
        public final String rule;
        public final boolean reject;

        Decision(String rule, boolean reject) {
            this.rule = rule;
            this.reject = reject;
        }
    }

    /**
     * The one world-dependent probe the tree needs: {@code Block.isSideSolid}
     * on the mounting face. Production supplies the real world; tests supply a
     * lambda, which is what makes the whole tree unit-testable without a server.
     */
    @FunctionalInterface
    public interface UpSolid {
        boolean test(IBlockState state);
    }

    /** R196 mounted family: {@code BlockMounted} and its ten subclasses. */
    public static boolean isMountedBlock(Block block) {
        return block instanceof BlockTorch
                || block instanceof BlockLadder
                || block instanceof BlockLever
                || block instanceof BlockButton
                || block instanceof BlockSign
                || block instanceof BlockSkull
                || block instanceof BlockCocoa
                || block instanceof BlockTrapDoor
                || block instanceof BlockTripWireHook;
    }

    /**
     * @param pos     the cell the mounted block is about to occupy
     * @param face    the face of the support block that was clicked
     * @param mounted the block being placed
     * @return true when R196 would refuse the mount
     */
    public static boolean rejectsPlacement(World world, BlockPos pos, EnumFacing face, Block mounted) {
        return rejectsPlacement(world, pos, face, mounted, null);
    }

    /**
     * @param trapdoorLower the half the trapdoor would be placed in
     *                      ({@code TRUE} = bottom half), or {@code null} when
     *                      the caller cannot know it yet — {@code World#mayPlace}
     *                      carries no block state, so {@code MixinItemBlock}
     *                      resolves it from the click before calling here.
     *                      R196 matches that half against slabs, stairs and
     *                      snow layers ({@code BlockTrapDoor.java:172-190}).
     */
    public static boolean rejectsPlacement(World world, BlockPos pos, EnumFacing face, Block mounted,
            Boolean trapdoorLower) {
        BlockPos supportPos = pos.offset(face.getOpposite());
        IBlockState state = world.getBlockState(supportPos);
        Decision decision = decide(state, face, mounted, trapdoorLower,
                s -> s.getBlock().isSideSolid(s, world, supportPos, EnumFacing.UP));

        if (ETIMConfig.blockDebugLog) {
            ETIM.LOGGER.info("[MountLog] rule={} face={} support={} block={} result={} pos={},{},{} [server]",
                    decision.rule, face, state.getBlock().getRegistryName(),
                    mounted == null ? "none" : mounted.getRegistryName(),
                    decision.reject ? "reject" : "allow",
                    pos.getX(), pos.getY(), pos.getZ());
        }
        return decision.reject;
    }

    /**
     * Pure decision tree: same arms, same order and same rule names as the
     * world-facing entry point. {@code mounted} may be null (callers only pass
     * it to classify); {@code state} must be the support block's state.
     */
    public static Decision decide(IBlockState state, EnumFacing face, Block mounted,
            Boolean trapdoorLower, UpSolid upSolid) {
        Block support = state.getBlock();


        String rule = null;
        boolean reject = false;

        // Subclass arms first: R196 runs the override before super, so the
        // tilled-field / jukebox arms below only decide what the subclass left
        // untouched ({@code BlockMounted.java:20-37}).
        if (mounted instanceof BlockTorch) {
            if (face == EnumFacing.UP && isFenceLike(support)) {
                rule = "torch-fence-top";
            } else if (face == EnumFacing.UP && !(support instanceof BlockLeaves)
                    && !(support instanceof BlockDirectional)
                    && upSolid.test(state)) {
                rule = "torch-flat-top";
            } else if (support.getMaterial(state) == Material.CLOTH) {
                rule = "torch-cloth";
            } else if (face != EnumFacing.UP && support == Blocks.SNOW_LAYER && snowLayers(state) > 3) {
                rule = "torch-snow-side";
            } else if (face != EnumFacing.UP && isBottomSlab(state)) {
                rule = "torch-slab-bottom";
            } else if (face != EnumFacing.UP && support instanceof BlockStairs
                    && (meta(state) & 4) == 0) {
                rule = "torch-stairs-back";
            }
        } else if (mounted instanceof BlockSkull) {
            if (face == EnumFacing.UP && isFenceLike(support)) {
                rule = "skull-fence-top";
            } else if (support.getMaterial(state) == Material.CLOTH) {
                rule = "skull-cloth";
            } else if (face == EnumFacing.UP && !(support instanceof BlockLeaves)
                    && faceFlatAndSolid(state, EnumFacing.UP)) {
                rule = "skull-flat-top";
            }
            // Every other face falls through to the base arms, exactly like
            // BlockSkull.java:67-72 (cloth || super(...)).
        } else if (mounted instanceof BlockSign) {
            // BlockSign.java:3 has no canMountToBlock override: all signs take the
            // base arm order unchanged (farmland allow, jukebox/leaves/cloth/
            // sponge/front-face reject, then the flat+solid face check).
        } else if (mounted instanceof BlockTrapDoor) {
            if (face.getAxis().isVertical()) {
                // BlockTrapDoor.java:143-152 maps only the four horizontal faces
                // to metadata 0..3 and returns -1 for UP/DOWN; :156-160 then hands
                // that -1 to Block.java:2818-2824, which fails outright.
                rule = "trapdoor-vertical";
                reject = true;
            } else if (!hingeMaterialOk(support.getMaterial(state))) {
                rule = "trapdoor-material";
                reject = true;
            } else if (support == Blocks.GLASS) {
                rule = "trapdoor-glass";
            } else if (support == Blocks.SNOW_LAYER && snowLayers(state) <= 3) {
                // BlockTrapDoor.java:188 only accepts snow deeper than 2; thin
                // layers fall to isFaceFlatAndSolid, which is false on the top.
                rule = "trapdoor-thin-snow";
                reject = true;
            } else if (trapdoorHalfMatches(state, trapdoorLower)) {
                rule = "trapdoor-shape";
            } else if (isHalfShape(state)) {
                // BlockTrapDoor.java:172-190 rejects the wrong half outright when
                // the half is known; only World#mayPlace (no state) may defer.
                if (trapdoorLower == null) {
                    rule = "trapdoor-shape-defer";
                } else {
                    rule = "trapdoor-wrong-half";
                    reject = true;
                }
            }
        } else if (mounted instanceof BlockLever) {
            if (!leverMaterialOk(support.getMaterial(state))) {
                rule = "lever-material";
                reject = true;
            }
        } else if (mounted instanceof BlockButton) {
            if (!buttonMaterialOk(support.getMaterial(state))) {
                rule = "button-material";
                reject = true;
            }
        } else if (mounted instanceof BlockTripWireHook) {
            if (!leverMaterialOk(support.getMaterial(state))) {
                rule = "tripwire-material";
                reject = true;
            }
        }

        // Base arms (BlockMounted.java:20-37) when no subclass arm decided.
        if (rule == null) {
            if (support == Blocks.FARMLAND) {
                rule = "tilled-field";
            } else if (face == EnumFacing.UP && support == Blocks.JUKEBOX) {
                rule = "jukebox-top";
                reject = true;
            } else if (support instanceof BlockLeaves) {
                rule = "leaves";
                reject = true;
            } else if (support.getMaterial(state) == Material.CLOTH) {
                rule = "cloth";
                reject = true;
            } else if (support == Blocks.SPONGE) {
                rule = "sponge";
                reject = true;
            } else if (neverHides(support)) {
                rule = "never-hides";
                reject = true;
            } else if (isFrontFace(state, face)) {
                rule = "front-face";
                reject = true;
            } else if (mounted instanceof BlockSign || mounted instanceof BlockSkull) {
                String prefix = mounted instanceof BlockSign ? "sign" : "skull";
                if (faceFlatAndSolid(state, face)) {
                    rule = face == EnumFacing.UP ? prefix + "-flat-top" : prefix + "-face";
                } else {
                    rule = prefix + "-not-flat";
                    reject = true;
                }
            } else {
                rule = "geometry";
            }
        }

        return new Decision(rule, reject);
    }

    private static boolean isFenceLike(Block block) {
        return block instanceof BlockFence || block instanceof BlockWall;
    }

    /** Slab / stairs / deep snow carry a half the trapdoor must match. */
    private static boolean isHalfShape(IBlockState state) {
        return isSingleSlab(state) || state.getBlock() instanceof BlockStairs
                || (state.getBlock() == Blocks.SNOW_LAYER && snowLayers(state) > 3);
    }

    /**
     * R196 {@code Block.isFaceFlatAndSolid} ({@code Block.java:1779-1781}) with
     * the overrides R196 applies to the blocks the mounted family mounts on:
     * slab ({@code BlockSlab.java:83-86}), stairs ({@code BlockStairs.java:365-387}),
     * snow ({@code BlockSnow.java:153-157}) and the enchantment table
     * ({@code BlockEnchantmentTable.java:94-97}). A plain standard cube is flat
     * and solid on every face.
     */
    private static boolean faceFlatAndSolid(IBlockState state, EnumFacing face) {
        Block block = state.getBlock();
        if (block instanceof BlockSlab) {
            if (((BlockSlab) block).isDouble()) {
                return true;
            }
            Comparable<?> half = state.getValue(BlockSlab.HALF);
            return half == BlockSlab.EnumBlockHalf.BOTTOM ? face == EnumFacing.DOWN : face == EnumFacing.UP;
        }
        if (block instanceof BlockStairs) {
            int m = meta(state) & 7;
            EnumFacing facing = STAIR_FACING[m & 3];
            boolean top = (m & 4) != 0;
            return face == facing || face == (top ? EnumFacing.UP : EnumFacing.DOWN);
        }
        if (block == Blocks.SNOW_LAYER) {
            int layers = snowLayers(state);
            if (layers == 1) {
                return false;
            }
            if (layers == 8) {
                // BlockSnow.java:156 — a full layer is flat and solid on every face.
                return true;
            }
            return face == EnumFacing.DOWN;
        }
        if (block == Blocks.ENCHANTING_TABLE) {
            return face == EnumFacing.DOWN;
        }
        return state.isFullCube() && state.isOpaqueCube();
    }

    private static final EnumFacing[] STAIR_FACING = {
        EnumFacing.EAST, EnumFacing.WEST, EnumFacing.SOUTH, EnumFacing.NORTH
    };

    private static int meta(IBlockState state) {
        return state.getBlock().getMetaFromState(state);
    }

    private static int snowLayers(IBlockState state) {
        return state.getValue(BlockSnow.LAYERS).intValue();
    }

    private static boolean isSingleSlab(IBlockState state) {
        Block block = state.getBlock();
        if (!(block instanceof BlockSlab)) {
            return false;
        }
        return !((BlockSlab) block).isDouble();
    }

    private static boolean isBottomSlab(IBlockState state) {
        Block block = state.getBlock();
        if (!(block instanceof BlockSlab) || ((BlockSlab) block).isDouble()) {
            return false;
        }
        Comparable<?> half = state.getValue(BlockSlab.HALF);
        return half == BlockSlab.EnumBlockHalf.BOTTOM;
    }

    /**
     * {@code BlockTrapDoor.java:172-190}: a slab / stairs support accepts the
     * trapdoor only when their halves match, and a snow layer only the bottom
     * half. A double slab is not {@code isSingleSlab} and therefore falls
     * through to the base arms, exactly like R196.
     */
    private static boolean trapdoorHalfMatches(IBlockState state, Boolean trapdoorLower) {
        if (trapdoorLower == null) {
            return false;
        }
        Block block = state.getBlock();
        boolean wantLower = trapdoorLower.booleanValue();
        if (isSingleSlab(state)) {
            return isBottomSlab(state) == wantLower;
        }
        if (block instanceof BlockStairs) {
            return ((meta(state) & 4) == 0) == wantLower;
        }
        return block == Blocks.SNOW_LAYER && snowLayers(state) > 3 && wantLower;
    }

    /** {@code BlockButton.java:37-47}: the button mounting-material gate. */
    private static boolean buttonMaterialOk(Material material) {
        return material != Material.GROUND
                && material != Material.GRASS
                && material != Material.SAND
                && material != Material.SNOW
                && material != Material.CRAFTED_SNOW
                && material != Material.LEAVES
                && material != Material.GOURD
                && material != Material.CLOTH
                && material != Material.GLASS
                && material != Material.SPONGE;
    }

    /** {@code BlockLever.java:30-32}: button gate plus clay. */
    private static boolean leverMaterialOk(Material material) {
        return material != Material.CLAY && buttonMaterialOk(material);
    }

    /** {@code BlockDoor.java:307-318}: hinge materials; the snow layer stays allowed. */
    private static boolean hingeMaterialOk(Material material) {
        return material != Material.GROUND
                && material != Material.GRASS
                && material != Material.SAND
                && material != Material.CLAY
                && material != Material.LEAVES
                && material != Material.CRAFTED_SNOW
                && material != Material.CLOTH
                && material != Material.GOURD
                && material != Material.SPONGE
                && material != Material.GLASS;
    }

    /**
     * R196 {@code setNeverHidesAdjacentFaces} — 36 direct setters plus ice and
     * the portal block ({@code Block.java:1775-1777}). The spawner is the one
     * full cube on the list, which is why the old {@code !isFullCube()} proxy
     * missed it.
     */
    private static boolean neverHides(Block block) {
        return block instanceof BlockAnvil
                || block instanceof BlockBasePressurePlate
                || block == Blocks.BEACON
                || block instanceof BlockBed
                || block instanceof BlockBrewingStand
                || block instanceof BlockButton
                || block instanceof BlockCake
                || block instanceof BlockChest
                || block instanceof BlockCocoa
                || block instanceof BlockDoor
                || block == Blocks.DRAGON_EGG
                || block instanceof BlockEnderChest
                || block == Blocks.END_PORTAL
                || block instanceof BlockFence
                || block instanceof BlockFenceGate
                || block instanceof BlockFire
                || block instanceof BlockFlowerPot
                || block instanceof BlockLiquid
                || block instanceof BlockGlass
                || block instanceof BlockLadder
                || block instanceof BlockLever
                || block instanceof BlockMobSpawner
                || block instanceof BlockPane
                || block instanceof BlockBush
                || block instanceof BlockRailBase
                || block instanceof BlockRedstoneWire
                || block instanceof BlockReed
                || block instanceof BlockSign
                || block instanceof BlockSkull
                || block instanceof BlockTorch
                || block instanceof BlockTrapDoor
                || block instanceof BlockTripWire
                || block instanceof BlockTripWireHook
                || block instanceof BlockVine
                || block instanceof BlockWall
                || block instanceof BlockWeb
                || block == Blocks.ICE
                || block == Blocks.FROSTED_ICE
                || block instanceof BlockPortal;
    }

    /** Pistons ({@code :32-33}) and furnaces/dispensers/droppers ({@code :35-37}). */
    private static boolean isFrontFace(IBlockState support, EnumFacing face) {
        Block block = support.getBlock();
        if (block == Blocks.PISTON || block == Blocks.STICKY_PISTON) {
            return support.getValue(BlockPistonBase.FACING) == face;
        }
        if (block == Blocks.FURNACE || block == Blocks.LIT_FURNACE) {
            return support.getValue(BlockFurnace.FACING) == face;
        }
        if (block == Blocks.DISPENSER || block == Blocks.DROPPER) {
            return support.getValue(BlockDispenser.FACING) == face;
        }
        return false;
    }
}
