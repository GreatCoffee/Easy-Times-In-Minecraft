package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import java.util.Locale;
import net.minecraft.client.gui.GuiButton;
import net.minecraft.client.gui.GuiScreen;
import net.minecraftforge.fml.relauncher.Side;
import net.minecraftforge.fml.relauncher.SideOnly;

/**
 * clientpose 姿态调参面板（{@code /etimpose gui} = 第一人称；{@code /etimpose gui3} = 第三人称）。
 *
 * <p>每次点击直接写 {@link ETIMConfig} 静态量，对应 mixin 每帧读取 ⇒ 姿态实时同步。
 * 面板靠左、不暂停世界、不压暗背景。第三人称面板使用时请先在游戏里切到背视（F5 ×2）。</p>
 */
@SideOnly(Side.CLIENT)
public class GuiPoseTuner extends GuiScreen {

    private static final int ROW_H = 22;
    private static final int W = 268;

    private static boolean pending = false;
    private static boolean pendingThird = false;

    private static final String[] LABELS_FIRST = { "TX", "TY", "TZ", "ROT1 (Y)", "ROT2 (X)", "ROT3 (Y)" };
    private static final float[] STEP_FIRST = { 0.01F, 0.01F, 0.01F, 1.0F, 1.0F, 1.0F };

    private static final String[] LABELS_THIRD = {
            "ARM X", "ARM Y", "ITEM TX", "ITEM TY", "ITEM TZ", "ITEM R1(Y)", "ITEM R2(X)", "ITEM R3(Z)" };
    private static final float[] STEP_THIRD = { 1.0F, 1.0F, 0.01F, 0.01F, 0.01F, 1.0F, 1.0F, 1.0F };

    private final boolean third;
    private final String[] labels;
    private final float[] steps;
    private int left;
    private int top;

    public GuiPoseTuner(boolean third) {
        this.third = third;
        this.labels = third ? LABELS_THIRD : LABELS_FIRST;
        this.steps = third ? STEP_THIRD : STEP_FIRST;
    }

    /** 由命令置位，客户端 tick 里真正打开。 */
    public static void requestOpen(boolean third) {
        pending = true;
        pendingThird = third;
    }

    public static void tickOpen() {
        if (!pending) {
            return;
        }
        pending = false;
        net.minecraft.client.Minecraft mc = net.minecraft.client.Minecraft.getMinecraft();
        if (mc.currentScreen == null) {
            ETIM.LOGGER.info("[PoseLog] opening {} gui", pendingThird ? "third-person" : "first-person");
            mc.displayGuiScreen(new GuiPoseTuner(pendingThird));
        }
    }

    @Override
    public void initGui() {
        ETIM.LOGGER.info("[PoseLog] gui init ({})", this.third ? "third" : "first");
        tryHold();
        this.left = 8;
        this.top = 28;
        int x = left + 104;
        int rows = labels.length;
        for (int i = 0; i < rows; i++) {
            int y = top + 18 + i * ROW_H;
            this.buttonList.add(new GuiButton(i * 2, x, y, 20, 18, "-"));
            this.buttonList.add(new GuiButton(i * 2 + 1, x + 44, y, 20, 18, "+"));
        }
        int by = top + 18 + rows * ROW_H + 6;
        this.buttonList.add(new GuiButton(200, left + 58, by, 56, 18, "Reset"));
        this.buttonList.add(new GuiButton(201, left + 120, by, 56, 18, "Done"));
        this.buttonList.add(new GuiButton(202, left + 182, by, 56, 18, "Shot"));
    }

    @Override
    public void actionPerformed(GuiButton button) {
        if (button.id == 201) {
            this.mc.displayGuiScreen(null);
            return;
        }
        if (button.id == 202) {
            net.minecraft.util.text.ITextComponent msg = net.minecraft.util.ScreenShotHelper.saveScreenshot(
                    this.mc.gameDir, this.mc.displayWidth, this.mc.displayHeight, this.mc.getFramebuffer());
            this.mc.ingameGUI.getChatGUI().printChatMessage(msg);
            log("shot");
            return;
        }
        if (button.id == 200) {
            reset();
        } else {
            int row = button.id / 2;
            float dir = (button.id % 2 == 0) ? -1.0F : 1.0F;
            set(row, get(row) + dir * steps[row]);
        }
        PoseFileWatcher.rememberCurrent();
        log("gui");
    }

    private void reset() {
        applyDefaults(this.third);
    }

    /** 出厂默认（GUI Reset 与 /etimpose reset 共用一处，避免两边走偏）。 */
    public static void applyDefaults(boolean third) {
        if (third) {
            ETIMConfig.tpArmX = 0.0F;
            ETIMConfig.tpArmY = 30.0F;
            ETIMConfig.tpItemTX = 0.0F;
            ETIMConfig.tpItemTY = 0.0F;
            ETIMConfig.tpItemTZ = 0.0F;
            ETIMConfig.tpItemRot1 = 0.0F;
            ETIMConfig.tpItemRot2 = 0.0F;
            ETIMConfig.tpItemRot3 = 27.0F;
        } else {
            ETIMConfig.blockPoseTX = -0.07F;
            ETIMConfig.blockPoseTY = 0.19F;
            ETIMConfig.blockPoseTZ = 0.26F;
            ETIMConfig.blockPoseRot1 = 77.0F;
            ETIMConfig.blockPoseRot2 = -87.0F;
            ETIMConfig.blockPoseRot3 = 20.0F;
        }
    }

    private static void log(String what) {
        ETIM.LOGGER.info("[PoseLog] {} first(tx={} ty={} tz={} r1={} r2={} r3={}) third(armX={} armY={} iTX={} iTY={} iTZ={} iR1={} iR2={} iR3={})",
                what,
                fmt(ETIMConfig.blockPoseTX), fmt(ETIMConfig.blockPoseTY), fmt(ETIMConfig.blockPoseTZ),
                fmt(ETIMConfig.blockPoseRot1), fmt(ETIMConfig.blockPoseRot2), fmt(ETIMConfig.blockPoseRot3),
                fmt(ETIMConfig.tpArmX), fmt(ETIMConfig.tpArmY),
                fmt(ETIMConfig.tpItemTX), fmt(ETIMConfig.tpItemTY), fmt(ETIMConfig.tpItemTZ),
                fmt(ETIMConfig.tpItemRot1), fmt(ETIMConfig.tpItemRot2), fmt(ETIMConfig.tpItemRot3));
    }

    private static String fmt(float v) {
        return String.format(Locale.ROOT, "%.2f", v);
    }

    private float get(int row) {
        if (this.third) {
            switch (row) {
                case 0: return ETIMConfig.tpArmX;
                case 1: return ETIMConfig.tpArmY;
                case 2: return ETIMConfig.tpItemTX;
                case 3: return ETIMConfig.tpItemTY;
                case 4: return ETIMConfig.tpItemTZ;
                case 5: return ETIMConfig.tpItemRot1;
                case 6: return ETIMConfig.tpItemRot2;
                case 7: return ETIMConfig.tpItemRot3;
                default: return 0.0F;
            }
        }
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

    private void set(int row, float v) {
        if (this.third) {
            switch (row) {
                case 0: ETIMConfig.tpArmX = v; break;
                case 1: ETIMConfig.tpArmY = v; break;
                case 2: ETIMConfig.tpItemTX = v; break;
                case 3: ETIMConfig.tpItemTY = v; break;
                case 4: ETIMConfig.tpItemTZ = v; break;
                case 5: ETIMConfig.tpItemRot1 = v; break;
                case 6: ETIMConfig.tpItemRot2 = v; break;
                case 7: ETIMConfig.tpItemRot3 = v; break;
                default: break;
            }
            return;
        }
        switch (row) {
            case 0: ETIMConfig.blockPoseTX = v; break;
            case 1: ETIMConfig.blockPoseTY = v; break;
            case 2: ETIMConfig.blockPoseTZ = v; break;
            case 3: ETIMConfig.blockPoseRot1 = v; break;
            case 4: ETIMConfig.blockPoseRot2 = v; break;
            case 5: ETIMConfig.blockPoseRot3 = v; break;
            default: break;
        }
    }

    /** 每 tick 复核：服务器同步可能把使用态清掉，这里持续维持预览姿态。 */
    @Override
    public void updateScreen() {
        super.updateScreen();
        tryHold();
    }

    @Override
    public void onGuiClosed() {
        if (this.mc.player != null) {
            this.mc.player.resetActiveHand();
        }
    }

    /** 让玩家进入「右键使用」态：格挡分支才会走到，姿态与实机格挡完全同源。 */
    private void tryHold() {
        if (this.mc.player == null) {
            return;
        }
        net.minecraft.item.ItemStack held = this.mc.player.getHeldItem(net.minecraft.util.EnumHand.MAIN_HAND);
        if (held.isEmpty()) {
            return;
        }
        if (!this.mc.player.isHandActive()) {
            this.mc.player.setActiveHand(net.minecraft.util.EnumHand.MAIN_HAND);
        }
    }

    @Override
    public void drawScreen(int mouseX, int mouseY, float partialTicks) {
        int rows = labels.length;
        int h = 18 + rows * ROW_H + 30;
        drawRect(left, top, left + W, top + h, 0xB0101010);
        drawRect(left, top, left + W, top + 1, 0xFF6A6A6A);
        drawRect(left, top + h - 1, left + W, top + h, 0xFF6A6A6A);

        this.fontRenderer.drawStringWithShadow(
                this.third ? "Blocking pose - THIRD person (F5 first)" : "Blocking pose - first person",
                left + 8, top + 6, 0xFFE0E0E0);
        for (int i = 0; i < rows; i++) {
            int y = top + 18 + i * ROW_H + 5;
            this.fontRenderer.drawStringWithShadow(labels[i], left + 8, y, 0xFFB0B0B0);
            String v = String.format(Locale.ROOT, "%.2f", get(i));
            this.fontRenderer.drawStringWithShadow(v, left + 186, y, 0xFFFFFF80);
        }
        super.drawScreen(mouseX, mouseY, partialTicks);
    }

    @Override
    public boolean doesGuiPauseGame() {
        return false;
    }
}
