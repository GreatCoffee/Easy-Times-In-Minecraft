# ETIM test harness: runner-driven dedicated server (obf run) · v2
# v2 fixes (main session ruling 2026-10-14):
#   1) fail-fast: run\obfuscated\mods (incl 1.12.2\ subdir) must contain an etim
#      jar before launch; abort with printout otherwise. No silent no-mod run.
#      (root cause of the dead window: etim jar absent -> vanilla server,
#       SpawnLog all 0. etim in mods is the ONLY load path: exec-dump classpath
#       has no project jar, mods dir is the only mod discovery surface.)
#   2) kill the GUI window: inject -Djava.awt.headless=true into allJvmArgs and
#      append "nogui" to args; stops ServerGui WindowEvent shutdowns (18:35:04).
#   3) mods-hold ownership rules: see testharness\server\README.md.
# javaw.exe (no console window) — the launcher is WMI-detached and the verdict
# source is log4j latest.log, so no console stdout is needed (2026-10-24 ruling).
param(
    [string]$DumpFile = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\server\exec-dump.txt",
    [string]$JavaExe  = "C:\Users\GreatCoffee\.gradle\jdks\azul_systems__inc_-8-amd64-windows.2\bin\javaw.exe",
    [string]$WorkDir  = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\run\obfuscated",
    [string]$LogDir   = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\server\logs"
)
$ErrorActionPreference = "Stop"
$modsRoot = Join-Path $WorkDir "mods"
$hold = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\mods-hold"

# fail-fast: etim jar must be loadable — accepted surfaces:
#   A) mods dir (legacy ruling)  B) classpath entry appended by this runner
# ONLY ONE surface may be active: if etim jar is in mods, FML double-scans it
# (coremod scan + discovery scan) and FATAL-dups. So the runner enforces:
#   - etim jar REMOVED from mods dir (checked: absent => OK to append classpath)
#   - etim jar appended to -cp from build\libs (the gradle-runObfServer shape)
# If no surface is available at all -> abort (no silent no-mod run).
$buildJar = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\build\libs\etim-1.0.0.jar"
$modsHit = Get-ChildItem -Path $modsRoot -Filter "etim-*.jar" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match '^etim-[\d\.]+\.jar$' } | Select-Object -First 1
# client-first rounds: the running obf client holds run/obfuscated/mods/etim-*.jar
# open (Move-Item fails). Keep the single mods surface and skip the classpath
# append instead of trying to stash the locked file.
$modsJarActive = $null -ne $modsHit
if ($modsJarActive) { $modsHit = $null }
if ($modsHit -and ((Get-Item $buildJar).Length -eq $modsHit.Length)) {
    # 同 jar 双面在场 = dup 前兆，移回 mods-hold 档案（不删除）
    $hold = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\mods-hold"
    if (-not (Test-Path $hold)) { New-Item -ItemType Directory $hold | Out-Null }
    Move-Item $modsHit.FullName (Join-Path $hold $modsHit.Name) -Force
    Write-Output ("auto-stash: etim jar moved from mods to mods-hold (dup-prevention) -> " + $modsHit.FullName)
    $modsHit = $null
}
if ($null -ne $modsHit) {
    # mods 里有 etim jar 但不是 build 当前版 → 同样会双扫 dup；stash 并走 classpath
    $hold = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\mods-hold"
    if (-not (Test-Path $hold)) { New-Item -ItemType Directory $hold | Out-Null }
    Move-Item $modsHit.FullName (Join-Path $hold $modsHit.Name) -Force
    Write-Output ("auto-stash (stale version): " + $modsHit.FullName)
}
$cpAppend = ""
if ($modsJarActive) {
    Write-Output ("classpath append skipped: etim jar loaded from " + $modsRoot + " (client holds the file)")
} elseif (Test-Path $buildJar) {
    $cpAppend = $buildJar
    Write-Output ("classpath append: " + $buildJar + " (mtime=" + (Get-Item $buildJar).LastWriteTime + ")")
} else {
    Write-Output ("FATAL-FAST: no etim jar in mods NOR at build\libs (" + $buildJar + ") - abort. No silent no-mod run.")
    exit 2
}

# dump layout: line0 mainClass, line1 classpath, line2 jvmArgs, line3 args, line4 allJvmArgs
$lines = Get-Content $DumpFile
$mainClass  = $lines[0] -replace '^\[etim-harness\] mainClass=', ''
$cp         = $lines[1] -replace '^\[etim-harness\] classpath=', ''
$allJvmArgs = (($lines[4] -replace '^\[etim-harness\] allJvmArgs=', '')).Trim('[', ']')
$allJvmArgs = $allJvmArgs -replace ', ', "`0" -split "`0"

if (-not ($allJvmArgs -contains "-Djava.awt.headless=true")) {
    $allJvmArgs += "-Djava.awt.headless=true"
}

if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$stdoutLog = Join-Path $LogDir ("server_" + $stamp + ".out")

$argString = ($allJvmArgs | ForEach-Object { if ($_ -match ' ') { '"' + $_ + '"' } else { $_ } }) -join ' '
$argString += ' -cp "' + ($cp + ";" + $cpAppend) + '" ' + $mainClass + ' nogui'
Write-Output ("ARGSPEC=" + $argString.Substring(0, [Math]::Min(400, $argString.Length)))
Write-Output ("ARGSPECTAIL=" + $argString.Substring([Math]::Max(0, $argString.Length - 200)))
# v5: WMI Create (detached from job tree / pipe-closing of the caller). Redirection
# for stdout覆写不便（WMI 直接句柄重定向号不接 redirection 简单路径）——让 server 的
# log4j latest.log 担当判据面（此前一直如此），stdout 给 C:\...logs\console_tail.out
# via PowerShell-средство blocked——由 console-stdin absent cannot be set via WMI Create;
# конolе stdin absent is acceptable (RCON/认 VLC 面存在).
$cmdline = '"' + $JavaExe + '" ' + $argString
$null = New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$wmi = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmdline; CurrentDirectory = $WorkDir }
if ($wmi.ReturnValue -ne 0) { Write-Output ("WMI create failed: " + $wmi.ReturnValue); exit 2 }
Write-Output ("server launched via WMI, pid=" + $wmi.ProcessId)
$wmi.ProcessId | Set-Content (Join-Path $LogDir "server.pid")
Write-Output ("boot stamp: " + $stamp)
Write-Output "headless=1 nogui=1"
