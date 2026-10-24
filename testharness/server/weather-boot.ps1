# weather-boot.ps1 — W 窗单 boot 驱动（会话七 · 2026-10-21）
# 停服态 patch level.dat Time → 起 run\ 服务端 → 等首条 [WeatherLog] weather-schedule
# → 落盘该行 + 整份 latest.log → RCON stop → 等端口释放。
# 用法：powershell -NoProfile -ExecutionPolicy Bypass -File testharness\server\weather-boot.ps1 -Time 690000 -Tag w1-day30
param(
    [Parameter(Mandatory = $true)][long]$Time,
    [Parameter(Mandatory = $true)][string]$Tag,
    [int]$WaitSeconds = 180
)
$ErrorActionPreference = "Stop"
$base = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
Set-Location $base
$node = "D:\Documents\Softwares\Node\22.22.2\node.exe"
$logDir = Join-Path $base "build-logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory $logDir | Out-Null }

function PortFree { return ((Get-NetTCPConnection -LocalPort 25565 -ErrorAction SilentlyContinue | Measure-Object).Count -eq 0) }
if (-not (PortFree)) { Write-Output "ABORT: port 25565 busy"; exit 3 }

& $node testharness\player\_settime.js run\test27dev\level.dat $Time
$patchLine = (& $node testharness\player\_lvldat.js run\test27dev\level.dat) | Select-Object -Last 1
Write-Output ("patched: " + $patchLine)

# stale-log guard: a previous boot's latest.log would satisfy the poll before the
# new JVM has logged anything. Move it aside; the new boot recreates latest.log.
$prevLog = Join-Path $logDir ("weather-$Tag.prev.latest.log")
if (Test-Path "run\logs\latest.log") { Move-Item "run\logs\latest.log" $prevLog -Force }

& powershell -NoProfile -ExecutionPolicy Bypass -File testharness\server\start-server.ps1 -WorkDir "$base\run"

$deadline = (Get-Date).AddSeconds($WaitSeconds)
$found = $null
while ((Get-Date) -lt $deadline) {
    if (Test-Path "run\logs\latest.log") {
        $m = Select-String -Path "run\logs\latest.log" -Pattern "\[WeatherLog\] weather-schedule" | Select-Object -First 1
        if ($m) { $found = $m; break }
    }
    Start-Sleep -Seconds 2
}
if (-not $found) {
    Write-Output "NO SCHEDULE LINE"
    Get-Content "run\logs\latest.log" -Tail 20
    exit 4
}
$line = $found.Line
Write-Output ("SCHEDULE " + $line)
Set-Content -Path (Join-Path $logDir ("weather-$Tag.schedule.txt")) -Value $line -Encoding UTF8

# capture complete log before stop/rotation
Copy-Item "run\logs\latest.log" (Join-Path $logDir ("weather-$Tag.latest.log")) -Force

& python testharness\server\rcon.py stop | Out-Null
$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline -and -not (PortFree)) { Start-Sleep -Seconds 2 }
Write-Output ("port free: " + (PortFree))
