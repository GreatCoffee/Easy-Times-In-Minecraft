$ErrorActionPreference = 'Continue'
$env:JAVA_HOME = 'D:\OpenCodeWorkspace\Easy Times In Minecraft\jdk\zulu25.38.107-ca-jdk25.0.5-win_x64'
$root = 'D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim'
$out = Join-Path $root 'build-logs\regress-b54-b67'
New-Item -ItemType Directory -Force -Path $out | Out-Null
$idx = Join-Path $out 'index.tsv'
if (Test-Path $idx) { Remove-Item $idx -Force }
"run`tstart`tend`tsec`texit" | Set-Content $idx
Set-Location $root
foreach ($b in 54..67) {
  $run = "b$b"
  $env:RUN = $run
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $start = (Get-Date).ToString('o')
  & node (Join-Path $root ("testharness\player\f11-$run-smoke.js")) *> (Join-Path $out "$run.out")
  $code = $LASTEXITCODE
  $sw.Stop()
  $end = (Get-Date).ToString('o')
  "$run`t$start`t$end`t$([int]$sw.Elapsed.TotalSeconds)`t$code" | Add-Content $idx
  Write-Output "[batch] $run exit=$code sec=$([int]$sw.Elapsed.TotalSeconds)"
}
Write-Output "[runner] done"
