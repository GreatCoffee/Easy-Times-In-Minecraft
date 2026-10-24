# mob 批顺带修：B2 C-7 占位贴图 → 真画面。
# 工具 60 张 = RB-2025 一手直拷（已拷）；甲/链 55 张 = vanilla 铁/锁链甲
# sprite 调色（参考色 = 项目真画锭/粒/镰均值，字面色自洽）。
# 用法: powershell -File testharness\client\tint-gear.ps1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = "D:\OpenCodeWorkspace\Easy Times In Minecraft"
$etim = "$root\git-workspace\etim\src\main\resources\assets\etim\textures\items"
$vanillaJar = "C:\Users\GreatCoffee\.gradle\caches\retro_futura_gradle\mc-vanilla\1.12.2\client.jar"

# ---- 1. extract the 8 vanilla base sprites ----
$tmp = "$env:TEMP\etim-tint-base"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Add-Type -AssemblyName System.IO.Compression.FileSystem
$z = [IO.Compression.ZipFile]::OpenRead($vanillaJar)
foreach ($p in @("iron_helmet","iron_chestplate","iron_leggings","iron_boots",
                 "chainmail_helmet","chainmail_chestplate","chainmail_leggings","chainmail_boots")) {
  $e = $z.Entries | Where-Object { $_.FullName -eq "assets/minecraft/textures/items/$p.png" }
  if (-not $e) { throw "vanilla sprite missing: $p" }
  [IO.Compression.ZipFileExtensions]::ExtractToFile($e, "$tmp\$p.png", $true)
}
$z.Dispose()

# ---- 2. reference hues from the project's real art ----
function Get-MeanColor([string]$path) {
  $bmp = New-Object System.Drawing.Bitmap($path)
  $r = 0.0; $g = 0.0; $b = 0.0; $n = 0
  for ($y = 0; $y -lt $bmp.Height; $y++) { for ($x = 0; $x -lt $bmp.Width; $x++) {
    $c = $bmp.GetPixel($x, $y)
    if ($c.A -gt 0) { $r += $c.R; $g += $c.G; $b += $c.B; $n++ }
  }}
  $bmp.Dispose()
  if ($n -eq 0) { throw "empty sprite: $path" }
  return @([int]($r/$n), [int]($g/$n), [int]($b/$n))
}

$metals = @{
  copper        = @{ ref = "nugget_copper.png" }
  silver        = @{ ref = "ingot_silver.png" }
  ancient_metal = @{ ref = "ingot_ancient_metal.png" }
  mithril       = @{ ref = "ingot_mithril.png" }
  adamantium    = @{ ref = "ingot_adamantium.png" }
  rusted_iron   = @{ ref = "scythe_rusted_iron.png" }
}
foreach ($m in $metals.Keys) {
  $metals[$m].color = Get-MeanColor "$etim\$($metals[$m].ref)"
  $c = $metals[$m].color
  Write-Host ("ref {0}: rgb({1},{2},{3})" -f $m, $c[0], $c[1], $c[2])
}

# ---- 3. tint engine: out = ref * (luma / refLuma), alpha preserved ----
function Tint([string]$basePng, [double[]]$ref, [string]$outPng) {
  $base = New-Object System.Drawing.Bitmap($basePng)
  $out = New-Object System.Drawing.Bitmap($base.Width, $base.Height)
  $refLuma = 0.299 * $ref[0] + 0.587 * $ref[1] + 0.114 * $ref[2]
  for ($y = 0; $y -lt $base.Height; $y++) { for ($x = 0; $x -lt $base.Width; $x++) {
    $c = $base.GetPixel($x, $y)
    if ($c.A -eq 0) { continue }
    $luma = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
    $k = $luma / $refLuma
    $r = [Math]::Min(255, [int]($ref[0] * $k))
    $g = [Math]::Min(255, [int]($ref[1] * $k))
    $bl = [Math]::Min(255, [int]($ref[2] * $k))
    $out.SetPixel($x, $y, [System.Drawing.Color]::FromArgb($c.A, $r, $g, $bl))
  }}
  $out.Save($outPng, [System.Drawing.Imaging.ImageFormat]::Png)
  $base.Dispose(); $out.Dispose()
}

# ---- 4. armor faces (vanilla iron/chainmail tinted) ----
$pieces = @{ helmet = "helmet"; chestplate = "chestplate"; leggings = "leggings"; boots = "boots" }
$n = 0
foreach ($m in $metals.Keys) {
  foreach ($p in $pieces.Keys) {
    Tint "$tmp\iron_$($pieces[$p]).png" $metals[$m].color "$etim\$($p)_$m.png"; $n++
    Tint "$tmp\chainmail_$($pieces[$p]).png" $metals[$m].color "$etim\chain_$($p)_$m.png"; $n++
  }
}

# ---- 5. the chain item sprite: two interlocked links, tinted ----
$chain = New-Object System.Drawing.Bitmap(16, 16)
$ring = @(3,4),@(2,5),@(2,6),@(2,7),@(3,8),@(4,9) # quarter arcs drawn manually below
# draw link A (top-left ring) + link B (bottom-right ring), 2px thick
foreach ($pt in @(@(5,3),@(6,2),@(7,2),@(8,2),@(9,3),@(10,4),@(10,5),@(10,6),@(9,7),@(10,8),@(10,9),@(9,10),@(8,11),@(7,11),@(6,11),@(5,10),@(4,9),@(4,8),@(4,7),@(4,6),@(5,4))) {
  $chain.SetPixel($pt[0], $pt[1], [System.Drawing.Color]::FromArgb(255, 210, 210, 210))
}
foreach ($pt in @(@(5,8),@(6,9),@(7,9),@(8,9),@(9,10),@(5,7),@(5,6),@(6,5),@(7,5),@(8,5),@(9,6),@(9,7))) {
  $chain.SetPixel($pt[0], $pt[1], [System.Drawing.Color]::FromArgb(255, 150, 150, 150))
}
$chain.Save("$tmp\chain_item.png", [System.Drawing.Imaging.ImageFormat]::Png)
$chain.Dispose()
foreach ($m in $metals.Keys) {
  Tint "$tmp\chain_item.png" $metals[$m].color "$etim\chain_$m.png"; $n++
}

# ---- 6. ingot_copper: tint the ancient ingot art to copper ----
Tint "$etim\ingot_ancient_metal.png" $metals["copper"].color "$etim\ingot_copper.png"; $n++

Write-Host "tinted faces: $n"
