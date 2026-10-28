param([string]$Tag = "ad7e-session")
# ad7e-stop.ps1 — 批 E 验证窗优雅停服（RCON save-all → stop → 等端口退 → 快照日志）
$ErrorActionPreference = "Stop"
$root = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim"
$rc = Join-Path $root "testharness\player\rcon-client.js"
$log = Join-Path $root "run\ad7e\logs\latest.log"

& node $rc 127.0.0.1 25575 etim27 "save-all" | Out-Host
Start-Sleep -Seconds 2
& node $rc 127.0.0.1 25575 etim27 "stop" | Out-Host

$deadline = (Get-Date).AddSeconds(90)
while ((Get-Date) -lt $deadline) {
    $listen = @(Get-NetTCPConnection -LocalPort 25565, 25575 -State Listen -ErrorAction SilentlyContinue)
    if ($listen.Count -eq 0) { break }
    Start-Sleep -Milliseconds 500
}
Start-Sleep -Seconds 1

$out = Join-Path $root ("build-logs\" + $Tag + ".log")
Copy-Item $log $out -Force
Write-Output ("snapshot: " + $out + " (" + (Get-Item $out).Length + " B)")
Get-Content $out -Tail 10
