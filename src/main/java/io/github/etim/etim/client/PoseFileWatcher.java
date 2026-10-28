package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

/**
 * 客户端姿态文件监听（clientpose 观感收敛工装）。
 *
 * <p>轮询 {@code config/etimpose.json}：内容<b>变化</b>时把其中出现的键写进
 * {@link ETIMConfig} 静态量并落一行 {@code [PoseLog]}。调参方（主会话）只需写文件
 * 即可驱动客户端姿态，无需在游戏内输入命令。</p>
 *
 * <p>两个硬约束：① 会话内首次读到的内容只作基线、<b>不应用</b>——否则启动时会把
 * 文件里的历史值盖到已烘定的默认值上（2026-10-28 实发问题）；② 只在
 * {@code ETIMConfig.blockPoseDebug=true} 时注册；文件缺失或解析失败时静默跳过。</p>
 */
public class PoseFileWatcher {

    private static final String KS = "tx|ty|tz|r1|r2|r3|armX|armY|iTX|iTY|iTZ|iR1|iR2|iR3";
    private static final Pattern NUM = Pattern.compile("\"(" + KS + ")\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
    private static String lastRaw = null;
    private static int cooldown = 0;

    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(PoseFileWatcher.class);
        ETIM.LOGGER.info("[PoseLog] config first(tx={} ty={} tz={} r1={} r2={} r3={}) third(armX={} armY={} "
                        + "iTX={} iTY={} iTZ={} iR1={} iR2={} iR3={})",
                f(ETIMConfig.blockPoseTX), f(ETIMConfig.blockPoseTY), f(ETIMConfig.blockPoseTZ),
                f(ETIMConfig.blockPoseRot1), f(ETIMConfig.blockPoseRot2), f(ETIMConfig.blockPoseRot3),
                f(ETIMConfig.tpArmX), f(ETIMConfig.tpArmY),
                f(ETIMConfig.tpItemTX), f(ETIMConfig.tpItemTY), f(ETIMConfig.tpItemTZ),
                f(ETIMConfig.tpItemRot1), f(ETIMConfig.tpItemRot2), f(ETIMConfig.tpItemRot3));
    }

    /**
     * GUI 改值后调用：把当前文件内容记为「已应用」，避免下一轮轮询用旧文件
     * 把刚调好的值覆盖回去（文件不变则不再生效）。
     */
    public static void rememberCurrent() {
        try {
            Path p = Paths.get("config", "etimpose.json");
            lastRaw = Files.isRegularFile(p) ? new String(Files.readAllBytes(p), StandardCharsets.UTF_8) : "\u0000";
        } catch (IOException e) {
            lastRaw = "\u0000";
        }
    }

    @SubscribeEvent
    public static void onClientTick(TickEvent.ClientTickEvent event) {
        if (event.phase != TickEvent.Phase.END) {
            return;
        }
        GuiPoseTuner.tickOpen();
        if (--cooldown > 0) {
            return;
        }
        cooldown = 20; // 约 1 秒一次
        Path p = Paths.get("config", "etimpose.json");
        if (!Files.isRegularFile(p)) {
            return;
        }
        String raw;
        try {
            raw = new String(Files.readAllBytes(p), StandardCharsets.UTF_8);
        } catch (IOException e) {
            return;
        }
        if (lastRaw == null) {
            // 会话内首次读到：只作基线，不应用（否则历史值会盖掉已烘定的默认值）
            lastRaw = raw;
            return;
        }
        if (raw.equals(lastRaw)) {
            return;
        }
        lastRaw = raw;
        Matcher m = NUM.matcher(raw);
        boolean any = false;
        while (m.find()) {
            float v = Float.parseFloat(m.group(2));
            switch (m.group(1)) {
                case "tx": ETIMConfig.blockPoseTX = v; break;
                case "ty": ETIMConfig.blockPoseTY = v; break;
                case "tz": ETIMConfig.blockPoseTZ = v; break;
                case "r1": ETIMConfig.blockPoseRot1 = v; break;
                case "r2": ETIMConfig.blockPoseRot2 = v; break;
                case "r3": ETIMConfig.blockPoseRot3 = v; break;
                case "armX": ETIMConfig.tpArmX = v; break;
                case "armY": ETIMConfig.tpArmY = v; break;
                case "iTX": ETIMConfig.tpItemTX = v; break;
                case "iTY": ETIMConfig.tpItemTY = v; break;
                case "iTZ": ETIMConfig.tpItemTZ = v; break;
                case "iR1": ETIMConfig.tpItemRot1 = v; break;
                case "iR2": ETIMConfig.tpItemRot2 = v; break;
                case "iR3": ETIMConfig.tpItemRot3 = v; break;
                default: continue;
            }
            any = true;
        }
        if (!any) {
            return;
        }
        ETIM.LOGGER.info("[PoseLog] file first(tx={} ty={} tz={} r1={} r2={} r3={}) third(armX={} armY={} "
                        + "iTX={} iTY={} iTZ={} iR1={} iR2={} iR3={})",
                f(ETIMConfig.blockPoseTX), f(ETIMConfig.blockPoseTY), f(ETIMConfig.blockPoseTZ),
                f(ETIMConfig.blockPoseRot1), f(ETIMConfig.blockPoseRot2), f(ETIMConfig.blockPoseRot3),
                f(ETIMConfig.tpArmX), f(ETIMConfig.tpArmY),
                f(ETIMConfig.tpItemTX), f(ETIMConfig.tpItemTY), f(ETIMConfig.tpItemTZ),
                f(ETIMConfig.tpItemRot1), f(ETIMConfig.tpItemRot2), f(ETIMConfig.tpItemRot3));
    }

    private static String f(float v) {
        return String.format(Locale.ROOT, "%.2f", v);
    }
}
