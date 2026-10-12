# ETIM test harness — runner-managed mod stashing (server rounds).
# Before a dedicated-server round: move client-only jars out of
# run/obfuscated/mods into the hold folder; after: restore.
# Run via: powershell -File mods-hold.ps1 [-Mode hold|release]
param([string]$Mode = "hold")

$mods   = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\run\obfuscated\mods"
$hold   = "D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\mods-hold"

# client-only / coremod-rewriting jars that must NOT load on a dedicated server
$serverUnsafe = @(
    "OptiFine_1.12.2_HD_U_G5.jar",
    "SmoothFont-mc1.12.2-2.1.4.jar",
    "rebind-1.12.2-2.7.5-0.jar",
    "journeymap-forge-1.12.2-6.0.10.jar",
    "rad-1.12-1.1.0.jar",
    "StepUp-1.0.2-mc1.10-1.12.jar",
    "MouseTweaks-2.10.1-mc1.12.2.jar",
    "jecharacters-1.12.0-3.7.3.jar",
    "osxnarratorblocker-1.0.jar",
    "fencejumper-1.12-1.0.5.jar"
)

if (-not (Test-Path $hold)) { New-Item -ItemType Directory -Path $hold | Out-Null }

switch ($Mode) {
    "hold" {
        foreach ($j in $serverUnsafe) {
            $src = Join-Path $mods $j
            if (Test-Path $src) { Move-Item $src $hold -Force }
        }
        Write-Output "hold done"
    }
    "release" {
        foreach ($j in $serverUnsafe) {
            $src = Join-Path $hold $j
            if (Test-Path $src) { Move-Item $src $mods -Force }
        }
        Write-Output "release done"
    }
    default { Write-Output "unknown mode: $Mode"; exit 1 }
}
