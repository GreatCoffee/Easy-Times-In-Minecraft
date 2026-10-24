// weather-oracle — F-14-25/26 验证窗判据辅助（testharness 工装，不进 mod jar）。
//
// 独立复算 ETIMWeatherClock.buildSchedule 的期望输出（该类转置 R196 World:6444-6530
// generateWeatherEvents / mergeWeatherEvents / randomizeType / addStorm），供
// [WeatherLog] weather-schedule 行逐位对照。用 java.util.Random 本体（单文件直跑），
// 语义与服内逐位一致，不复刻 LCG。
//
// 用法：
//   java testharness/weather-oracle.java <seed> <day> [day...] [--old] [--stormTicks N]
//     <seed>        level.dat 的 RandomSeed（有符号 long，_lvldat.js 可读）
//     --old         修复前排除式（收获门无夜门无蓝子句；血门无蓝子句）——F-14-25
//                   恢复面 = 同日 new 式有事件而 old 式无
//     --stormTicks  血月强制雷暴窗长（须与服内 cfg bloodMoonStormTicks 一致，默认 13000）
//
// 输出每日一行，格式对齐 logSchedule：
//   oracle day=<D> events=<n> [(start..end[ storm=sS..sE] type=t)[, ...]]
// 判读：服务器 weather-schedule day=<D> 行的 events 段与本行逐位一致（W-2 同日
// 双 boot 一致性照旧另测）。

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Random;

public class WeatherOracle {

    static final long DAY = 24000L;
    static final int MERGE_PADDING = 6000;
    static long stormTicks = 13000;
    static boolean oldForm = false;
    static boolean trace = false;

    static final class Span {
        long start, end, stormStart, stormEnd;
        int type;
        boolean merged, hasStorm;

        boolean hasStorm() { return hasStorm; }
        boolean storming() { return hasStorm; }
    }

    // ---- R196 相位静态式（World:2371-2401；old = 修复前 ETIM 形态） ----

    static boolean isDayTick(long t) { // R196 isDaytime :1699-1702
        long adjusted = (t % DAY + 6000L) % DAY;
        return adjusted > 5000L && adjusted < 19000L;
    }

    static boolean isBloodTick(long t) {
        long day = t / DAY + 1L;
        if (oldForm) return day % 32L == 0L;                       // 修复前：无蓝子句
        return day % 32L == 0L && day % 128L != 0L;                 // R196 :2374 全式
    }

    static boolean isBlueTick(long t) {
        return (t / DAY + 1L) % 128L == 0L;                         // R196 :2388
    }

    static boolean isHarvestTick(long t) {
        long dayH = (t + 192000L) / DAY + 1L;                       // R196 :2400 偏移
        if (oldForm) return dayH % 32L == 0L;                       // 修复前：无夜门无蓝子句
        if (isDayTick(t)) return false;                             // exclusively_at_night
        return dayH % 32L == 0L && dayH % 128L != 0L;               // 蓝子句折叠面
    }

    // ---- R196 :6444-6479 ----

    static void generateDay(long seed, long day, List<Span> events) {
        if (day < 2L) return;                                       // :6450
        long firstTick = (day - 1L) * DAY - 6000L;                  // 调整日块锚（F-14-26）
        Random random = new Random(seed + 0L * 938473L + day);      // dim 0；J2: getSeed 替创建时刻
        random.nextInt();                                           // :6456 warm-up

        for (int i = 0; i < 3 && random.nextInt(4) <= 0; i++) {     // :6458
            Span e = new Span();
            e.start = firstTick + random.nextInt(24000);
            e.end = e.start + random.nextInt(12000) + 6000;
            if (trace) {
                System.out.println("  trace day=" + day + " span=" + e.start + ".." + e.end
                        + " exclOld=" + excluded(e, true) + " exclNew=" + excluded(e, false));
            }
            if (!excluded(e, oldForm)) events.add(e);
        }
        // :6472-6476 强制雷暴（自然血月日；oracle 不带 override 通道）
        if (stormTicks > 0 && day % 32L == 0L && day % 128L != 0L) {
            Span e = new Span();
            e.start = firstTick + 6000L;
            e.end = e.start + stormTicks;
            e.hasStorm = true;
            e.stormStart = e.start;
            e.stormEnd = e.end;
            e.type = 3;
            events.add(e);
        }
    }

    static boolean excluded(Span e, boolean old) {                  // :6460-6467 八项
        if (old) {
            return isHarvestTick(e.start) || isHarvestTick(e.end)
                    || isHarvestTick(e.start + 6000L) || isHarvestTick(e.end - 6000L)
                    || isBloodTick(e.start) || isBloodTick(e.end)
                    || isBlueTick(e.start) || isBlueTick(e.end);   // 同八点，old 式相位见下
        }
        return isHarvestTick(e.start) || isHarvestTick(e.end)
                || isHarvestTick(e.start + 6000L) || isHarvestTick(e.end - 6000L)
                || isBloodTick(e.start) || isBloodTick(e.end)
                || isBlueTick(e.start) || isBlueTick(e.end);
    }

    // ---- R196 :6491-6521 ----

    static void mergeSpans(List<Span> events) {
        for (Span a : events) {
            if (a.merged) continue;
            for (Span b : events) {
                if (b == a || b.merged) continue;
                if (a.end + MERGE_PADDING >= b.start && a.start <= b.end + MERGE_PADDING) {
                    a.start = Math.min(a.start, b.start);
                    a.end = Math.max(a.end, b.end);
                    if (b.hasStorm() && !a.hasStorm()) {
                        a.stormStart = b.stormStart;
                        a.stormEnd = b.stormEnd;
                        a.hasStorm = true;
                        a.type = 3;
                    }
                    b.merged = true;
                }
            }
        }
        List<Span> kept = new ArrayList<Span>();
        for (Span e : events) if (!e.merged) kept.add(e);
        kept.sort((x, y) -> Long.compare(x.start, y.start));
        events.clear();
        events.addAll(kept);
    }

    // ---- R196 WeatherEvent:28-67 ----

    static void randomizeType(Span e) {
        if (e.hasStorm()) { e.type = 3; return; }
        Random random = new Random(e.start);
        random.nextInt();
        e.type = random.nextInt(3);
    }

    static void addStorm(Span e) {
        if (e.hasStorm()) return;
        Random random = new Random(e.start);
        random.nextInt();
        if (random.nextInt(4) <= 0) {
            int len = Math.min(random.nextInt(4000) + 2000, (int) (e.end - e.start));
            if (random.nextInt(4) == 0) {
                e.stormStart = random.nextBoolean() ? e.start : e.end - len;
            } else {
                e.stormStart = random.nextInt((int) (e.end - e.start) - len + 1) + e.start;
            }
            e.stormEnd = e.stormStart + len;
            e.hasStorm = true;
            e.type = 3;
        }
    }

    public static void main(String[] args) {
        long seed = 0;
        List<Long> days = new ArrayList<Long>();
        boolean seedSeen = false;
        for (int i = 0; i < args.length; i++) {
            String a = args[i];
            if (a.equals("--old")) { oldForm = true; continue; }
            if (a.equals("--trace")) { trace = true; continue; }
            if (a.equals("--stormTicks")) { stormTicks = Long.parseLong(args[++i]); continue; }
            if (!seedSeen) { seed = Long.parseLong(a); seedSeen = true; continue; }
            days.add(Long.parseLong(a));
        }
        for (long day : days) {
            List<Span> events = new ArrayList<Span>();
            generateDay(seed, day - 1L, events);
            generateDay(seed, day, events);
            mergeSpans(events);
            for (Span e : events) { randomizeType(e); addStorm(e); }
            StringBuilder sb = new StringBuilder("oracle day=").append(day)
                    .append(" events=").append(events.size()).append(" [");
            for (int i = 0; i < events.size(); i++) {
                Span e = events.get(i);
                if (i > 0) sb.append(", ");
                sb.append('(').append(e.start).append("..").append(e.end);
                if (e.hasStorm()) sb.append(" storm=").append(e.stormStart).append("..").append(e.stormEnd);
                sb.append(" type=").append(e.type).append(')');
            }
            sb.append(']');
            System.out.println(sb);
        }
    }
}