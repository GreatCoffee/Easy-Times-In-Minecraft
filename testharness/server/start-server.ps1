# ETIM test harness: runner-driven dedicated server (obf run).
# Launches the SAME java line gradle would (from server/exec-dump.txt),
# with stdin wired so the console can receive commands (stop / list / op),
# stdout to a rolling file under testharness\server\logs.
param(
    [string]$DumpFile = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\server\exec-dump.txt",
    [string]$JavaExe  = "C:\Users\GreatCoffee\.gradle\jdks\azul_systems__inc_-8-amd64-windows.2\bin\java.exe",
    [string]$WorkDir  = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\run\obfuscated",
    [string]$LogDir   = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\server\logs"
)

$ErrorActionPreference = "Stop"

# read dump: line0 mainClass, line1 classpath, line2 jvmArgs, line3 args, line4 allJvmArgs
$mainClass  = (Get-Content $DumpFile)[0] -replace '^\[etim-harness\] mainClass=', ''
$cp         = (Get-Content $DumpFile)[1] -replace '^\[etim-harness\] classpath=', ''
$allJvmArgs = ((Get-Content $DumpFile)[4] -replace '^\[etim-harness\] allJvmArgs=', '').Trim('[', ']')
$allJvmArgs = $allJvmArgs -replace ', ', "`0" -split "`0"

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$stdoutLog = Join-Path $LogDir "server_$stamp.out"
$stdinFifo = Join-Path $LogDir "server_console.fifo"

# console pipe: a named pipe (FIFO substitute) is awkward for direct stdin;
# instead we pre-empt commands via a file-backed stdin that stays open
Start-Process -FilePath $JavaExe `
    -ArgumentList (@($allJvmArgs) + @("-cp", $cp, $mainClass)) `
    -WorkingDirectory $WorkDir `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError (Join-Path $LogDir "server_$stamp.err") `
    -WindowStyle Hidden

Write-Output "server launched, pid file:"
(Get-Process java | Sort-Object StartTime -Descending | Select-Object -First 1).Id | Set-Content (Join-Path $LogDir "server.pid")
Write-Output "stdout: $stdoutLog"
