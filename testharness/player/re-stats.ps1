param([Parameter(Mandatory=$true)][string]$WindowLog)
$ErrorActionPreference = 'Continue'
$base = 'D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim'
$log  = Join-Path $base 'run\obfuscated\logs\latest.log'
$out  = "$WindowLog.stats"
$clock = "$WindowLog.clock"
Set-Location (Join-Path $base 'testharness\player')

function Say([string]$m) { $m | Tee-Object -Append -FilePath $out | Out-Host }

$b = [int](Get-Content "$WindowLog.base")
$rows = @(Select-String -Path $log -Pattern '\[SpawnLog\]' | Where-Object { $_.LineNumber -gt $b })

Say "== window $([System.IO.Path]::GetFileName($WindowLog)) baseline L$b rows=$($rows.Count) =="

$lines = @($rows | ForEach-Object { ($_.Line -replace '^.*\[SpawnLog\] ','') })
$kind = $lines | ForEach-Object {
  $t = $_ -split ' '
  switch ($t[0]) {
    'accept'      { "accept $($t[1])" }
    'reject'      { "reject $($t[1])" }
    'cap-block'   { "cap-block $($t[1])" }
    'cap-comp'    { "cap-comp $($t[1])" }
    'density-eval'{ 'density-eval' }
    default       { $t[0] }
  }
}
Say '-- kind --'
$kind | Group-Object | Sort-Object Count -Descending | Select-Object -First 30 | ForEach-Object { Say ('  x{0,-6} {1}' -f $_.Count, $_.Name) }
Say '-- accepts --'
$lines | Where-Object { $_ -like 'accept *' } | ForEach-Object { ($_ -split ' ')[1] } | Group-Object | Sort-Object Count -Descending | ForEach-Object { Say ('  x{0,-6} {1}' -f $_.Count, $_.Name) }
Say '-- rejects --'
$lines | Where-Object { $_ -like 'reject *' } | ForEach-Object { ($_ -split ' ')[1] } | Group-Object | Sort-Object Count -Descending | ForEach-Object { Say ('  x{0,-6} {1}' -f $_.Count, $_.Name) }
Say '-- moon-night denoms --'
$lines | Where-Object { $_ -like 'reject moon-night *' } | ForEach-Object { [regex]::Match($_,'denom=1/(\d+)').Groups[1].Value } | Group-Object | Sort-Object Count -Descending | ForEach-Object { Say ('  denom=1/{0} x{1}' -f $_.Name, $_.Count) }
Say '-- density-eval phase/daytime --'
$lines | Where-Object { $_ -like 'density-eval *' } | ForEach-Object {
  $p = [regex]::Match($_,'phase=(\w+)'); $d = [regex]::Match($_,'daytime=(\w+)')
  "phase=$($p.Groups[1].Value) daytime=$($d.Groups[1].Value)"
} | Group-Object | Sort-Object Count -Descending | ForEach-Object { Say ('  x{0,-6} {1}' -f $_.Count, $_.Name) }
Say '-- modifier rows --'
$lines | Where-Object { $_ -like 'modifier*' } | Select-Object -First 10 | ForEach-Object { Say ('  ' + $_) }

# ---- clock / day interpolation ----
$clk = @()
if (Test-Path $clock) {
  $clk = @(Get-Content $clock | Where-Object { $_ -match "`t" } | ForEach-Object {
    $p = $_ -split "`t"
    [pscustomobject]@{ t = [TimeSpan]::Parse($p[0]); g = [long]$p[1] }
  })
}
if ($clk.Count -lt 2) { Say 'clock missing'; return }
Say ('-- clock -- g0={0} gN={1} samples={2} rate={3:N2} t/s' -f $clk[0].g,$clk[-1].g,$clk.Count,(($clk[-1].g-$clk[0].g)/($clk[-1].t-$clk[0].t).TotalSeconds))

function GAt([TimeSpan]$ts) {
  if ($ts -le $clk[0].t) { return $clk[0].g }
  if ($ts -ge $clk[-1].t) { return $clk[-1].g }
  for ($i=0; $i -lt $clk.Count-1; $i++) {
    if ($ts -ge $clk[$i].t -and $ts -le $clk[$i+1].t) {
      $span = ($clk[$i+1].t - $clk[$i].t).TotalSeconds
      if ($span -le 0) { return $clk[$i].g }
      $f = ($ts - $clk[$i].t).TotalSeconds / $span
      return [long]($clk[$i].g + $f * ($clk[$i+1].g - $clk[$i].g))
    }
  }
  return $clk[-1].g
}

$agg = @{}
foreach ($ln in $rows) {
  $m = [regex]::Match($ln.Line,'\[(\d{2}:\d{2}:\d{2})\]')
  if (-not $m.Success) { continue }
  $ts = [TimeSpan]::Parse($m.Groups[1].Value)
  $day = [int]([math]::Floor((GAt $ts) / 24000) + 1)
  $body = ($ln.Line -replace '^.*\[SpawnLog\] ','')
  $t = $body -split ' '
  if (-not $agg.ContainsKey($day)) { $agg[$day] = @{ rows=0; acc=@{}; rej=@{}; den=@{} } }
  $a = $agg[$day]
  $a.rows++
  if ($t[0] -eq 'accept') { $k=$t[1]; if(-not $a.acc.ContainsKey($k)){$a.acc[$k]=0}; $a.acc[$k]++ }
  elseif ($t[0] -eq 'reject') { $k=$t[1]; if(-not $a.rej.ContainsKey($k)){$a.rej[$k]=0}; $a.rej[$k]++; if($k -eq 'moon-night'){ $d=[regex]::Match($body,'denom=1/(\d+)').Groups[1].Value; if(-not $a.den.ContainsKey($d)){$a.den[$d]=0}; $a.den[$d]++ } }
}
Say '-- per day --'
foreach ($day in ($agg.Keys | Sort-Object)) {
  $a = $agg[$day]
  Say ("  day=$day rows=$($a.rows)")
  Say ('    accept: ' + (($a.acc.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ' '))
  Say ('    reject: ' + (($a.rej.GetEnumerator() | Sort-Object Value -Descending | ForEach-Object { "$($_.Name)=$($_.Value)" }) -join ' '))
  if ($a.den.Count) { Say ('    moon-night denom: ' + (($a.den.GetEnumerator() | ForEach-Object { "1/$($_.Name)x$($_.Value)" }) -join ' ')) }
  $hostSum = 0; foreach($k in @('EntityZombie','EntityCreeper','EntitySkeleton','EntitySpider','EntityEnderman')){ if($a.acc.ContainsKey($k)){$hostSum += $a.acc[$k]} }
  if ($hostSum -gt 0) { Say ('    nightly hostiles={0} creeper-share={1:P1}' -f $hostSum, ($a.acc['EntityCreeper']/$hostSum)) }
}
Say "STATS=$out"
