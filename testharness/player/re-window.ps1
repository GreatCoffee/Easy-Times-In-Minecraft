param(
  [ValidateSet('natural','blood')][string]$Phase = 'natural',
  [int]$Minutes = 20,
  [switch]$WithSpectator
)
$ErrorActionPreference = 'Continue'
$base = 'D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim'
$node = 'D:\Documents\Softwares\Node\22.22.2\node.exe'
$rcdir = Join-Path $base 'testharness\player'
$log  = Join-Path $base 'run\obfuscated\logs\latest.log'
$stamp = Get-Date -Format 'HHmmss'
$out = Join-Path $base "build-logs\re-final2-$Phase-$stamp.log"
$clock = "$out.clock"
Set-Location $rcdir

function RC([string]$c) { (& $node rcon-client.js 127.0.0.1 25575 etim27 $c 2>&1 | Out-String).Trim() }
function Say([string]$m) { $m | Tee-Object -Append -FilePath $out | Out-Host }

Say "=== $Phase window $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="

# ---- F4/F5 bed double check before any fill ----
$b1 = RC 'testforblock -66 68 246 minecraft:bed'
$b2 = RC 'testforblock -66 68 247 minecraft:bed'
Say "bed -66,68,246 : $b1"
Say "bed -66,68,247 : $b2"
if (($b1 -notmatch 'Successfully') -or ($b2 -notmatch 'Successfully')) { Say 'ABORT: bed double not found'; exit 1 }

# ---- world settings ----
foreach ($g in @('doMobSpawning true','doDaylightCycle false','doMobLoot true','keepInventory false','doFireTick true','mobGriefing true')) {
  RC "gamerule $g" | Out-Null
}
RC 'difficulty easy' | Out-Null
RC 'time set 18000' | Out-Null

# ---- clear hostiles/items in the sample area ----
foreach ($t in @('Zombie','Skeleton','Creeper','Spider','Enderman','Slime','Witch','Bat','Item','ZombieVillager','Wolf')) {
  $r = RC "kill @e[x=-66,y=68,z=247,r=200,type=$t]"
  if ($r -notmatch 'No entity') { Say "clear $t : $r" }
}

# ---- keep-alive pen around Harn04 (-57,68,251) ----
RC 'fill -59 68 249 -59 70 253 barrier' | Out-Null
RC 'fill -55 68 249 -55 70 253 barrier' | Out-Null
RC 'fill -59 68 249 -55 70 249 barrier' | Out-Null
RC 'fill -59 68 253 -55 70 253 barrier' | Out-Null

if ($Phase -eq 'natural') {
  # wolf chamber (-20,63,251) + zombie-villager chamber (-20,63,270), sealed
  RC 'fill -22 63 249 -18 65 253 air' | Out-Null
  RC 'fill -22 63 268 -18 65 272 air' | Out-Null
  RC 'setblock -22 63 249 glowstone' | Out-Null
  RC 'setblock -22 63 268 glowstone' | Out-Null
  # spectator-wolf chamber (-110,60,251)
  if ($WithSpectator) { RC 'fill -112 60 249 -108 62 253 air' | Out-Null }

  Say 'summon wolves + zombie villager'
  Say (RC 'summon Wolf -21 63 250 {CustomName:"RE_W1"}')
  Say (RC 'summon Wolf -20 63 251 {CustomName:"RE_W2"}')
  Say (RC 'summon Wolf -19 63 252 {CustomName:"RE_W3"}')
  Say (RC 'summon ZombieVillager -20 63 270 {CustomName:"RE_ZV"}')
  if ($WithSpectator) { Say (RC 'summon Wolf -110 60 251 {CustomName:"RE_SW"}') }
}

# ---- baseline line number ----
$last = Select-String -Path $log -Pattern '\[SpawnLog\]' | Select-Object -Last 1
$b = if ($last) { $last.LineNumber } else { 0 }
Say "baseline SpawnLog L$b"
$b | Out-File -Encoding ascii "$out.base"

# ---- spectator bot (optional) ----
$ms = $Minutes * 60 * 1000 + 60000
if ($WithSpectator -and $Phase -eq 'natural') {
  $env:RE_PRE = '/tp ETIM_Harn05 -110 68 251'
  Start-Process -FilePath $node -ArgumentList @('re-bot.js','localhost','25565','ETIM_Harn05','idle',"$ms") `
    -WorkingDirectory $rcdir -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $base 'build-logs\re-final2-spec.out') `
    -RedirectStandardError  (Join-Path $base 'build-logs\re-final2-spec.err')
  Start-Sleep -Seconds 15
  Say ('gamemode spectator: ' + (RC 'gamemode spectator ETIM_Harn05'))
  Say ('tp spectator: ' + (RC 'tp ETIM_Harn05 -110 68 251'))
} else { $env:RE_PRE = '' }

# ---- clock sampler (15 s) ----
$job = Start-Job -ScriptBlock {
  param($node,$rcdir,$secs,$clock)
  Set-Location $rcdir
  $end = (Get-Date).AddSeconds($secs)
  while ((Get-Date) -lt $end) {
    $g = (& $node rcon-client.js 127.0.0.1 25575 etim27 'time query gametime' 2>&1 | Out-String)
    $m = [regex]::Match($g,'Time is (\d+)')
    if ($m.Success) {
      ("{0}`t{1}" -f (Get-Date -Format 'HH:mm:ss'), $m.Groups[1].Value) | Out-File -Append -Encoding ascii $clock
    }
    Start-Sleep -Seconds 15
  }
} -ArgumentList $node,$rcdir,($Minutes*60+120),$clock

# ---- survival bot, window in foreground ----
$env:RE_PRE = '/gamemode survival ETIM_Harn04;/effect ETIM_Harn04 minecraft:resistance 99999 255 true;/effect ETIM_Harn04 minecraft:fire_resistance 99999 0 true;/tp ETIM_Harn04 -57 68 251'
Say "bot A start $(Get-Date -Format 'HH:mm:ss')"
(& $node re-bot.js localhost 25565 ETIM_Harn04 idle $ms 2>&1 | Select-Object -Last 2) | Tee-Object -Append -FilePath $out | Out-Host
Say "bot A end   $(Get-Date -Format 'HH:mm:ss')"

Wait-Job $job | Out-Null; Receive-Job $job | Out-Null; Remove-Job $job

# ---- kill test entities + restore geometry ----
RC 'kill @e[type=Wolf,x=-20,y=63,z=251,r=8]' | Out-Null
RC 'kill @e[type=Wolf,x=-110,y=60,z=251,r=8]' | Out-Null
RC 'kill @e[type=ZombieVillager,x=-20,y=63,z=270,r=8]' | Out-Null
RC 'fill -22 63 249 -18 65 253 stone' | Out-Null
RC 'fill -22 63 268 -18 65 272 stone' | Out-Null
if ($WithSpectator) { RC 'fill -112 60 249 -108 62 253 stone' | Out-Null }

# ---- stats ----
$b = [int](Get-Content "$out.base")
$rows = Select-String -Path $log -Pattern '\[SpawnLog\]' | Where-Object { $_.LineNumber -gt $b }
$lines = @($rows | ForEach-Object { ($_.Line -replace '^.*\[SpawnLog\] ','') })
Say "== rows=$($lines.Count) =="

$kind = $lines | ForEach-Object {
  $t = $_ -split ' '
  switch ($t[0]) {
    'accept'      { "accept $($t[1])" }
    'reject'      { "reject $($t[1])" }
    'cap-block'   { "cap-block $($t[1])" }
    'cap-comp'    { "cap-comp $($t[1])" }
    'density-eval'{ "density-eval $($t[1])" }
    default       { $t[0] }
  }
}
$kind | Group-Object | Sort-Object Count -Descending | Select-Object -First 40 | ForEach-Object {
  Say ('  x{0,-6} {1}' -f $_.Count, $_.Name)
}

Say '== accepts =='
$lines | Where-Object { $_ -like 'accept *' } | ForEach-Object { ($_ -split ' ')[1] } | Group-Object | Sort-Object Count -Descending | ForEach-Object {
  Say ('  x{0,-6} {1}' -f $_.Count, $_.Name)
}
Say '== rejects =='
$lines | Where-Object { $_ -like 'reject *' } | ForEach-Object { ($_ -split ' ')[1] } | Group-Object | Sort-Object Count -Descending | ForEach-Object {
  Say ('  x{0,-6} {1}' -f $_.Count, $_.Name)
}
Say '== density-eval phases =='
$lines | Where-Object { $_ -like 'density-eval *' } | ForEach-Object {
  $m = [regex]::Match($_,'phase=(\w+).*daytime=(\w+)')
  if ($m.Success) { "phase=$($m.Groups[1].Value) daytime=$($m.Groups[2].Value)" }
} | Group-Object | Sort-Object Count -Descending | ForEach-Object { Say ('  x{0,-6} {1}' -f $_.Count, $_.Name) }

# ---- day segmentation from clock ----
Say '== clock/day segments =='
$clk = @()
if (Test-Path $clock) {
  $clk = @(Get-Content $clock | Where-Object { $_ -match "`t" } | ForEach-Object {
    $p = $_ -split "`t"
    [pscustomobject]@{ t = [TimeSpan]::Parse($p[0]); g = [long]$p[1]; day = [int]([math]::Floor([long]$p[1] / 24000) + 1) }
  })
}
if ($clk.Count -ge 2) {
  Say ('  g0={0} day={1}  gN={2} day={3}  rate={4:N2} t/s' -f $clk[0].g,$clk[0].day,$clk[-1].g,$clk[-1].day,(($clk[-1].g-$clk[0].g)/($clk[-1].t-$clk[0].t).TotalSeconds))
  $seg = $clk | Group-Object day | ForEach-Object { $_.Name }
  Say ('  days seen: ' + ($seg -join ', '))
  $per = @{}
  foreach ($ln in $rows) {
    $ts = [TimeSpan]::Parse(([regex]::Match($ln.Line,'\[(\d{2}:\d{2}:\d{2})\.\d+\]').Groups[1].Value))
    $best = $clk[0]; $bd = [math]::Abs(($clk[0].t - $ts).TotalSeconds)
    foreach ($c in $clk) { $d = [math]::Abs(($c.t - $ts).TotalSeconds); if ($d -lt $bd) { $bd = $d; $best = $c } }
    $k = "day=$($best.day)"
    if (-not $per.ContainsKey($k)) { $per[$k] = 0 }
    $per[$k]++
  }
  $per.GetEnumerator() | Sort-Object Name | ForEach-Object { Say ("  {0} rows={1}" -f $_.Name, $_.Value) }
} else {
  Say '  clock samples missing'
}

Say "=== $Phase window end $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') ==="
Say "OUT=$out"
