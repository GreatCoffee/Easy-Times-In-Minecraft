# wait-window-and-sleep.ps1 — 按服务端总钟轮询入床窗，命中即执行工步
# 会话七 · testharness/server
# 依据 ETIMSleepClock.java:60 —— 入床窗判据是 adjusted=(getTotalWorldTime()%24000+6000)%24000
# windowOpen(adjusted): adjusted -lt 4000 -or -ge 21000   （源码 :64-66）
# 用法：
#   .\wait-window-and-sleep.ps1 -Cmd 'node bed-ops.js localhost 25565 ETIM_Harn04 starve -66 68 246 1' -MaxWait 3000
param(
  [Parameter(Mandatory = $true)][string]$Cmd,
  [int]$MaxWait = 3000,
  [string]$Rcon = 'D:\Documents\Softwares\Node\22.22.2\node.exe',
  [string]$Client = 'D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\testharness\player\rcon-client.js'
)
$waited = 0
while ($waited -lt $MaxWait) {
  $out = & $Rcon $Client 127.0.0.1 25575 etim27 "time query gametime" 2>&1 | Out-String
  $m = [regex]::Match($out, '(\d+)')
  if ($m.Success) {
    $t = [int64]$m.Groups[1].Value
    $rem = $t % 24000
    $adj = (($rem) + 6000) % 24000
    $open = ($adj -lt 4000) -or ($adj -ge 21000)
    Write-Output ("[{0}] total%24000={1} adjusted={2} open={3} waited={4}s" -f (Get-Date -Format 'HH:mm:ss'), $rem, $adj, $open, $waited)
    if ($open) {
      Write-Output "=== WINDOW HIT — firing: $Cmd ==="
      Invoke-Expression $Cmd
      exit 0
    }
  }
  Start-Sleep -Seconds 20
  $waited += 20
}
Write-Output "=== TIMEOUT after $waited s — window never hit ==="
exit 1
