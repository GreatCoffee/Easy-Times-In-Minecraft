package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import java.util.Locale;
import net.minecraft.client.gui.GuiButton;
import net.minecraft.client.gui.GuiScreen;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * clientpose B-1 姿态调参面板（{@code /etimpose gui}）。
 *
 * <p>六个量各一行：平移三键步进 0.01，旋转三键步进 1。每次点击直接写
 * {@link ETIMConfig} 静态量，{@code MixinItemRendererBlockPose} 每帧读取，
 * 因此第一人称格挡摆位立即同步，无需重开界面。</p>
 *
 * <p>面板刻意做窄（靠左），不覆盖右侧剑的位置；不暂停世界、不压暗背景。</p>
 */
@SideOnly(Side.CLIENT)
public class GuiPoseTuner extends GuiScreen {

    private static final int W = 262;
    private static final int ROW_H = 22;
    private static final int ROWS = 6;

    private static final String[] LABELS = { "TX", "TY", "TZ", "ROT1 (Y)", "ROT2 (X)", "ROT3 (Y)" };
    private static final float[] STEP = { 0.01F, 0.01F, 0.01F, 1.0F, 1.0F, 1.0F };

    private int left;
    private int top;

    @Override
    public void initGui() {
        this.left = 8;
        this.top = 28;
        int x = left + 96;
        for (int i = 0; i < ROWS; i++) {
            int y = top + 18 + i * ROW_H;
            this.buttonList.add(new GuiButton(i * 2, x, y, 20, 18, "-"));
            this.buttonList.add(new GuiButton(i * 2 + 1, x + 44, y, 20, 18, "+"));
        }
        this.buttonList.add(new GuiButton(100, left + 62, top + 18 + ROWS * ROW_H + 6, 56, 18, "Reset"));
        this.buttonList.add(new GuiButton(101, left + 124, top + 18 + ROWS * ROW_H + 6, 56, 18, "Done"));
        this.buttonList.add(new GuiButton(102, left + 186, top + 18 + ROWS * ROW_H + 6, 56, 18, "Shot"));
    }

    @Override
    public void actionPerformed(GuiButton button) {
        if (button.id == 101) {
            this.mc.displayGuiScreen(null);
            return;
        }
        if (button.id == 102) {
            net.minecraft.util.text.ITextComponent msg = net.minecraft.util.ScreenShotHelper.saveScreenshot(
                    this.mc.gameDir, this.mc.displayWidth, this.mc.displayHeight, this.mc.getFramebuffer());
            this.mc.ingameGUI.getChatGUI().printChatMessage(msg);
            ETIM.LOGGER.info("[PoseLog] shot -> tx={} ty={} tz={} r1={} r2={} r3={}",
                    fmt(ETIMConfig.blockPoseTX), fmt(ETIMConfig.blockPoseTY), fmt(ETIMConfig.blockPoseTZ),
                    fmt(ETIMConfig.blockPoseRot1), fmt(ETIMConfig.blockPoseRot2), fmt(ETIMConfig.blockPoseRot3));
            return;
        }
        if (button.id == 100) {
            reset();
        } else {
            int row = button.id / 2;
            float dir = (button.id % 2 == 0) ? -1.0F : 1.0F;
            nudge(row, dir * STEP[row]);
        }
        PoseFileWatcher.rememberCurrent();
        log();
    }

    private static void nudge(int row, float delta) {
        switch (row) {
            case 0: ETIMConfig.blockPoseTX += delta; break;
            case 1: ETIMConfig.blockPoseTY += delta; break;
            case 2: ETIMConfig.blockPoseTZ += delta; break;
            case 3: ETIMConfig.blockPoseRot1 += delta; break;
            case 4: ETIMConfig.blockPoseRot2 += delta; break;
            case 5: ETIMConfig.blockPoseRot3 += delta; break;
            default: break;
        }
    }

    private static void reset() {
        ETIMConfig.blockPoseTX = -0.37F;
        ETIMConfig.blockPoseTY = 0.18F;
        ETIMConfig.blockPoseTZ = 0.3F;
        ETIMConfig.blockPoseRot1 = 52.0F;
        ETIMConfig.blockPoseRot2 = -68.0F;
        ETIMConfig.blockPoseRot3 = 60.0F;
    }

    private static void log() {
        ETIM.LOGGER.info("[PoseLog] gui -> tx={} ty={} tz={} r1={} r2={} r3={}",
                fmt(ETIMConfig.blockPoseTX), fmt(ETIMConfig.blockPoseTY), fmt(ETIMConfig.blockPoseTZ),
                fmt(ETIMConfig.blockPoseRot1), fmt(ETIMConfig.blockPoseRot2), fmt(ETIMConfig.blockPoseRot3));
    }

    private static String fmt(float v) {
        return String.format(Locale.ROOT, "%.2f", v);
    }

    private static float value(int row) {
        switch (row) {
            case 0: return ETIMConfig.blockPoseTX;
            case 1: return ETIMConfig.blockPoseTY;
            case 2: return ETIMConfig.blockPoseTZ;
            case 3: return ETIMConfig.blockPoseRot1;
            case 4: return ETIMConfig.blockPoseRot2;
            case 5: return ETIMConfig.blockPoseRot3;
            default: return 0.0F;
        }
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        // 不画暗底：让右侧第一人称剑保持可见
        int h = 18 + ROWS * ROW_H + 30;
        drawRect(left, top, left + W, top + h, 0xB0101010);
        drawRect(left, top, left + W, top + 1, 0xFF6A6A6A);
        drawRect(left, top + h - 1, left + W, top + h, 0xFF6A6A6A);

        this.fontRenderer.drawStringWithShadow("Blocking pose (live)", left + 8, top + 6, 0xFFE0E0E0);
        for (int i = 0; i < ROWS; i++) {
            int y = top + 18 + i * ROW_H + 5;
            this.fontRenderer.drawStringWithShadow(LABELS[i], left + 8, y, 0xFFB0B0B0);
            String v = String.format(Locale.ROOT, "%.2f", value(i));
            this.fontRenderer.drawStringWithShadow(v, left + 146, y, 0xFFFFFF80);
        }
        super.drawScreen(mouseX, mouseY, partialTicks);
    }

    /** 不暂停世界，姿态动画与格挡状态保持实时。 */
    @Override
    public boolean doesGuiPauseGame() {
        return false;
    }
}
