# ETIM 收口纪律配套：优雅关闭 obf 客户端（等价用户点 X）
# 依据 AGENTS.md「收口纪律」第 1 条：出交付书前必须关闭客户端，且必须优雅退窗
#   （日志要落 "Stopping!"、Gradle 要落 BUILD SUCCESSFUL），禁止直杀游戏 JVM。
#
# 2026-10-22 复盘（T1 复测轮）：只发 WM_CLOSE(CloseMainWindow) 会把 LWJGL2 窗口销毁、
# 但游戏循环仍停在 Display.sync —— 窗口没了、进程活着、日志停在启动尾巴且没有
# "Stopping!"。故本版改为：先发 WM_SYSCOMMAND/SC_CLOSE（真实点 X 的语义），
# 再发 WM_CLOSE，且**只以日志出现 "Stopping!" 为成功判据**；否则返回 exit 1 并打印 pid，
# 由调用方决定（不要静默当成功）。
#
# 用法：
#   .\testharness\client\close-client.ps1
#   .\testharness\client\close-client.ps1 -TimeoutSec 120 -Snapshot build-logs\<轮次>-client-latest.log
param(
    [int]$TimeoutSec = 120,
    [string]$Snapshot = ""
)
$ErrorActionPreference = "Stop"
$root = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
$log  = Join-Path $root "run\obfuscated\logs\latest.log"

if (-not ("EtimWin32" -as [type])) {
    Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class EtimWin32 {
    public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder s, int max);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder s, int max);
    [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr w, IntPtr l);
    public static List<IntPtr> GameWindows(uint wantPid) {
        var res = new List<IntPtr>();
        EnumWindows((h, l) => {
            uint pid; GetWindowThreadProcessId(h, out pid);
            if (pid == wantPid && IsWindowVisible(h)) {
                var c = new StringBuilder(256); GetClassName(h, c, 256);
                var t = new StringBuilder(512); GetWindowText(h, t, 512);
                string cls = c.ToString(), title = t.ToString();
                if (title.Contains("Minecraft") || cls.Contains("LWJGL") || cls.Contains("GLFW") || cls.Contains("SunAwtFrame")) {
                    res.Add(h);
                }
            }
            return true;
        }, IntPtr.Zero);
        return res;
    }
}
'@ -Language CSharp
}

# 找游戏 JVM：有可见窗口且标题含 Minecraft 的 java 进程
$game = Get-Process -Name java -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -match 'Minecraft' }

if (-not $game) {
    Write-Output "no client window found (already closed?)"
} else {
    foreach ($p in $game) {
        Write-Output ("closing client pid=" + $p.Id + " title='" + $p.MainWindowTitle + "'")
        $wins = [EtimWin32]::GameWindows([uint32]$p.Id)
        Write-Output ("top-level game windows: " + ($wins -join ","))
        # 1) 真实点 X 的语义：WM_SYSCOMMAND + SC_CLOSE
        foreach ($h in $wins) { $null = [EtimWin32]::PostMessage($h, 0x0112, [IntPtr]0xF060, [IntPtr]::Zero) }
        Start-Sleep -Milliseconds 1500
        # 2) 退路：WM_CLOSE
        foreach ($h in $wins) { $null = [EtimWin32]::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) }
        # 3) 只认日志里的 Stopping!
        $deadline = (Get-Date).AddSeconds($TimeoutSec)
        $stopped = $false
        while ((Get-Date) -lt $deadline) {
            if ((Test-Path $log) -and ((Get-Content $log -Tail 200 -ErrorAction SilentlyContinue) -match 'Stopping!')) { $stopped = $true; break }
            if (-not (Get-Process -Id $p.Id -ErrorAction SilentlyContinue)) { break }
            Start-Sleep -Milliseconds 500
        }
        if ($stopped) {
            Write-Output "client log: Stopping! recorded"
        } else {
            $alive = [bool](Get-Process -Id $p.Id -ErrorAction SilentlyContinue)
            Write-Output ("WARN: no 'Stopping!' after ${TimeoutSec}s (pid=$($p.Id) alive=$alive) — do NOT report this as a clean close")
        }
    }
}

if ($Snapshot) {
    if (Test-Path $log) {
        Copy-Item $log $Snapshot -Force
        Write-Output ("snapshot -> " + $Snapshot + " (" + (Get-Item $Snapshot).Length + " B)")
    }
}

$ok = (Test-Path $log) -and ((Get-Content $log -Tail 200 -ErrorAction SilentlyContinue) -match 'Stopping!')
if (-not $ok) { exit 1 }
