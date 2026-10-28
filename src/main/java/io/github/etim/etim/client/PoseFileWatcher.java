package io.github.etim.etim.client;

import io.github.etim.etim.ETIM;
import io.github.etim.etim.ETIMConfig;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import net.minecraftforge.fml.common.eventhandler.SubscribeEvent;
import net.minecraftforge.fml.common.gameevent.TickEvent;

/**
 * 客户端姿态文件监听（clientpose B-1 观感收敛工装）。
 *
 * <p>轮询 {@code config/etimpose.json}：内容变化时把五个数值（tx/ty/r1/r2/r3）
 * 写进 {@link ETIMConfig} 静态量并落一行 {@code [PoseLog]}。这样调参方
 * （主会话）只需写文件即可驱动客户端姿态，无需在游戏内输入命令。</p>
 *
 * <p>只在 {@code ETIMConfig.blockPoseDebug=true} 时注册；文件缺失或解析失败时静默跳过。</p>
 */
public class PoseFileWatcher {

    private static final Pattern NUM = Pattern.compile("\"(tx|ty|tz|r1|r2|r3)\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)");
    private static String lastRaw = null;
    private static int cooldown = 0;

    public static void register() {
        net.minecraftforge.common.MinecraftForge.EVENT_BUS.register(PoseFileWatcher.class);
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
        if (raw.equals(lastRaw)) {
            return;
        }
        lastRaw = raw;
        Matcher m = NUM.matcher(raw);
        boolean any = false;
        float tx = ETIMConfig.blockPoseTX, ty = ETIMConfig.blockPoseTY, tz = ETIMConfig.blockPoseTZ;
        float r1 = ETIMConfig.blockPoseRot1, r2 = ETIMConfig.blockPoseRot2, r3 = ETIMConfig.blockPoseRot3;
        while (m.find()) {
            float v = Float.parseFloat(m.group(2));
            switch (m.group(1)) {
                case "tx": tx = v; break;
                case "ty": ty = v; break;
                case "tz": tz = v; break;
                case "r1": r1 = v; break;
                case "r2": r2 = v; break;
                case "r3": r3 = v; break;
                default: break;
            }
            any = true;
        }
        if (!any) {
            return;
        }
        ETIMConfig.blockPoseTX = tx;
        ETIMConfig.blockPoseTY = ty;
        ETIMConfig.blockPoseTZ = tz;
        ETIMConfig.blockPoseRot1 = r1;
        ETIMConfig.blockPoseRot2 = r2;
        ETIMConfig.blockPoseRot3 = r3;
        ETIM.LOGGER.info("[PoseLog] file -> tx={} ty={} tz={} r1={} r2={} r3={}",
                fmt(tx), fmt(ty), fmt(tz), fmt(r1), fmt(r2), fmt(r3));
    }

    private static String fmt(float v) {
        return String.format(java.util.Locale.ROOT, "%.3f", v);
    }
}
