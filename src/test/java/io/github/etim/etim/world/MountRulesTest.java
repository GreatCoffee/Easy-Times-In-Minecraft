package io.github.etim.etim.world;

import net.minecraft.block.Block;
import net.minecraft.block.BlockSnow;
import net.minecraft.block.BlockStairs;
import net.minecraft.block.BlockSlab;
import net.minecraft.block.state.IBlockState;
import net.minecraft.init.Blocks;
import net.minecraft.init.Bootstrap;
import net.minecraft.util.EnumFacing;
import io.github.etim.etim.world.ETIMMountRules.Decision;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 挂载判定核心（{@link ETIMMountRules#decide}）的单测。
 *
 * <p>这一棵树在 B-69 里靠起服 92 秒 × 20 轮才收敛，出过 12 个 A 级缺陷。
 * 现在它是纯函数，每个用例 <1 ms，改动后直接 {@code gradlew test}。</p>
 *
 * <p>期望值全部来自 R196 一手：{@code BlockMounted.java:20-37}（基类臂序）、
 * {@code BlockTorch.java:24-45}、{@code BlockSkull.java:57-73}、
 * {@code BlockTrapDoor.java:143-190}、{@code BlockSnow.java:153-157}。</p>
 */
class MountRulesTest {

    @BeforeAll
    static void bootstrap() {
        Bootstrap.register();
    }

    // ---- helpers ----------------------------------------------------------

    private static Decision on(Block support, EnumFacing face, Block mounted) {
        return ETIMMountRules.decide(support.getDefaultState(), face, mounted, null, s -> true);
    }

    private static Decision on(IBlockState state, EnumFacing face, Block mounted, Boolean lower) {
        return ETIMMountRules.decide(state, face, mounted, lower, s -> true);
    }

    private static IBlockState snow(int layers) {
        return Blocks.SNOW_LAYER.getDefaultState().withProperty(BlockSnow.LAYERS, layers);
    }

    private static IBlockState slab(BlockSlab.EnumBlockHalf half) {
        return Blocks.STONE_SLAB.getDefaultState().withProperty(BlockSlab.HALF, half);
    }

    private static IBlockState stairs(BlockStairs.EnumHalf half) {
        return Blocks.OAK_STAIRS.getDefaultState().withProperty(BlockStairs.HALF, half);
    }

    private static IBlockState furnaceFacing(EnumFacing facing) {
        return Blocks.FURNACE.getDefaultState()
                .withProperty(net.minecraft.block.BlockFurnace.FACING, facing);
    }

    // ---- torch ------------------------------------------------------------

    @Test
    @DisplayName("torch: full cube top is flat and solid")
    void torchFlatTop() {
        Decision d = on(Blocks.STONE, EnumFacing.UP, Blocks.TORCH);
        assertEquals("torch-flat-top", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("torch: flat+solid wins before the jukebox arm (A-B69-6)")
    void torchJukeboxTopUsesFlatArm() {
        Decision d = on(Blocks.JUKEBOX, EnumFacing.UP, Blocks.TORCH);
        assertEquals("torch-flat-top", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("torch: leaves never mount (R196 BlockMounted base arm)")
    void torchOnLeavesRejected() {
        Decision d = on(Blocks.LEAVES, EnumFacing.UP, Blocks.TORCH);
        assertEquals("leaves", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("torch: fence top")
    void torchFenceTop() {
        Decision d = on(Blocks.OAK_FENCE, EnumFacing.UP, Blocks.TORCH);
        assertEquals("torch-fence-top", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("torch: deep snow side (R196 BlockTorch snow arm)")
    void torchDeepSnowSide() {
        Decision d = on(snow(8), EnumFacing.EAST, Blocks.TORCH, null);
        assertEquals("torch-snow-side", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("torch: bottom slab side")
    void torchBottomSlabSide() {
        Decision d = on(slab(BlockSlab.EnumBlockHalf.BOTTOM), EnumFacing.EAST, Blocks.TORCH, null);
        assertEquals("torch-slab-bottom", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("torch: back of a lower stair")
    void torchLowerStairBack() {
        Decision d = on(stairs(BlockStairs.EnumHalf.BOTTOM), EnumFacing.WEST, Blocks.TORCH, null);
        assertEquals("torch-stairs-back", d.rule);
        assertFalse(d.reject);
    }

    // ---- skull ------------------------------------------------------------

    @Test
    @DisplayName("skull: fence top")
    void skullFenceTop() {
        Decision d = on(Blocks.OAK_FENCE, EnumFacing.UP, Blocks.SKULL);
        assertEquals("skull-fence-top", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("skull: flat solid top")
    void skullFlatTop() {
        Decision d = on(Blocks.STONE, EnumFacing.UP, Blocks.SKULL);
        assertEquals("skull-flat-top", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("skull: cloth side")
    void skullCloth() {
        Decision d = on(Blocks.WOOL, EnumFacing.EAST, Blocks.SKULL);
        assertEquals("skull-cloth", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("skull: spawner is a never-hides cube (A-B69-4)")
    void skullSpawnerSideRejected() {
        Decision d = on(Blocks.MOB_SPAWNER, EnumFacing.EAST, Blocks.SKULL);
        assertEquals("never-hides", d.rule);
        assertTrue(d.reject);
    }

    // ---- sign -------------------------------------------------------------

    @Test
    @DisplayName("sign: farmland top is tilled-field (A-B69-1)")
    void signFarmlandTop() {
        Decision d = on(Blocks.FARMLAND, EnumFacing.UP, Blocks.STANDING_SIGN);
        assertEquals("tilled-field", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("sign: stone top is sign-flat-top")
    void signFlatTop() {
        Decision d = on(Blocks.STONE, EnumFacing.UP, Blocks.STANDING_SIGN);
        assertEquals("sign-flat-top", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("sign: stone side is sign-face")
    void signStoneSide() {
        Decision d = on(Blocks.STONE, EnumFacing.EAST, Blocks.STANDING_SIGN);
        assertEquals("sign-face", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("sign: full snow layer is flat and solid on every face (A-B69-8)")
    void signFullSnowSide() {
        Decision d = on(snow(8), EnumFacing.EAST, Blocks.STANDING_SIGN, null);
        assertEquals("sign-face", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("sign: thin snow side is not flat")
    void signThinSnowSideRejected() {
        Decision d = on(snow(3), EnumFacing.EAST, Blocks.STANDING_SIGN, null);
        assertEquals("sign-not-flat", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("sign: furnace front face (A-B69-3)")
    void signFurnaceFrontRejected() {
        Decision d = on(furnaceFacing(EnumFacing.EAST), EnumFacing.EAST, Blocks.STANDING_SIGN, null);
        assertEquals("front-face", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("sign: furnace back is a plain face")
    void signFurnaceBack() {
        Decision d = on(furnaceFacing(EnumFacing.EAST), EnumFacing.WEST, Blocks.STANDING_SIGN, null);
        assertEquals("sign-face", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("sign: sponge side (B-69 round-5 arm)")
    void signSpongeSideRejected() {
        Decision d = on(Blocks.SPONGE, EnumFacing.EAST, Blocks.STANDING_SIGN);
        assertEquals("sponge", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("sign: spawner side is never-hides")
    void signSpawnerSideRejected() {
        Decision d = on(Blocks.MOB_SPAWNER, EnumFacing.EAST, Blocks.STANDING_SIGN);
        assertEquals("never-hides", d.rule);
        assertTrue(d.reject);
    }

    // ---- trapdoor ---------------------------------------------------------

    @Test
    @DisplayName("trapdoor: vertical faces fail on metadata -1 (A-B69-12)")
    void trapdoorVerticalUpRejected() {
        Decision d = on(Blocks.STONE, EnumFacing.UP, Blocks.TRAPDOOR);
        assertEquals("trapdoor-vertical", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("trapdoor: vertical down is rejected the same way")
    void trapdoorVerticalDownRejected() {
        Decision d = on(Blocks.STONE, EnumFacing.DOWN, Blocks.TRAPDOOR);
        assertEquals("trapdoor-vertical", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("trapdoor: dirt hinge material (r18 :3616)")
    void trapdoorDirtRejected() {
        Decision d = on(Blocks.DIRT, EnumFacing.NORTH, Blocks.TRAPDOOR);
        assertEquals("trapdoor-material", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("trapdoor: farmland is GROUND, so the material arm still wins (A-B69-6 order)")
    void trapdoorFarmlandRejected() {
        Decision d = on(Blocks.FARMLAND, EnumFacing.EAST, Blocks.TRAPDOOR);
        assertEquals("trapdoor-material", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("trapdoor: bottom slab with a lower trapdoor")
    void trapdoorBottomSlabLower() {
        Decision d = on(slab(BlockSlab.EnumBlockHalf.BOTTOM), EnumFacing.EAST, Blocks.TRAPDOOR, Boolean.TRUE);
        assertEquals("trapdoor-shape", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("trapdoor: top slab with a lower trapdoor is the wrong half (A-B69-7)")
    void trapdoorTopSlabLowerRejected() {
        Decision d = on(slab(BlockSlab.EnumBlockHalf.TOP), EnumFacing.EAST, Blocks.TRAPDOOR, Boolean.TRUE);
        assertEquals("trapdoor-wrong-half", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("trapdoor: unknown half defers instead of rejecting")
    void trapdoorHalfDefers() {
        Decision d = on(slab(BlockSlab.EnumBlockHalf.TOP), EnumFacing.EAST, Blocks.TRAPDOOR, null);
        assertEquals("trapdoor-shape-defer", d.rule);
        assertFalse(d.reject);
    }

    @Test
    @DisplayName("trapdoor: thin snow (layers <= 3) rejects (A-B69-11)")
    void trapdoorThinSnowRejected() {
        Decision d = on(snow(3), EnumFacing.EAST, Blocks.TRAPDOOR, null);
        assertEquals("trapdoor-thin-snow", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("trapdoor: full snow side defers (r20 :3743)")
    void trapdoorFullSnowSide() {
        Decision d = on(snow(8), EnumFacing.EAST, Blocks.TRAPDOOR, null);
        assertEquals("trapdoor-shape-defer", d.rule);
        assertFalse(d.reject);
    }

    // ---- lever / button ---------------------------------------------------

    @Test
    @DisplayName("button: dirt is not a button material")
    void buttonDirtRejected() {
        Decision d = on(Blocks.DIRT, EnumFacing.EAST, Blocks.STONE_BUTTON);
        assertEquals("button-material", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("lever: clay is excluded on top of the button gate")
    void leverClayRejected() {
        Decision d = on(Blocks.CLAY, EnumFacing.EAST, Blocks.LEVER);
        assertEquals("lever-material", d.rule);
        assertTrue(d.reject);
    }

    @Test
    @DisplayName("lever: iron block side is plain geometry")
    void leverIronBlock() {
        Decision d = on(Blocks.IRON_BLOCK, EnumFacing.EAST, Blocks.LEVER);
        assertEquals("geometry", d.rule);
        assertFalse(d.reject);
    }
}
