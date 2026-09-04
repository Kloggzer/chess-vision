# replay-regression.ps1 — the ten-recording regression set (`score` against candidate.json), 2 parallel.
#
#   .\scripts\replay-regression.ps1 -Tag after                        # this tree's desktop build
#   .\scripts\replay-regression.ps1 -Tag base -Binary <other desktop.bat>
#   .\scripts\replay-regression.ps1 -Tag phone -Extra "set:gridHandGate=false"
#
# Builds `:desktop:installDist` first unless -Binary points elsewhere (an A/B base lives in a
# worktree with `data` and `tmp` junctioned in — see TODO.md, 2026-09-04). Logs land under
# tmp/batch/<Tag>/; the summary is found/missed/invented per recording — phantoms are the veto,
# misses negotiable. Two JVMs at once is ~12 GB (see replay-batch.ps1 for why not more).
param(
    [Parameter(Mandatory)][string]$Tag,
    [string]$Binary = "",
    [string]$Extra = "",
    [int]$MaxParallel = 2
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
if (-not $Binary) {
    Push-Location (Join-Path $root "android")
    & .\gradlew.bat :desktop:installDist -q
    if ($LASTEXITCODE -ne 0) { Pop-Location; throw "installDist failed" }
    Pop-Location
    $Binary = Join-Path $root "android\desktop\build\install\desktop\bin\desktop.bat"
}
# Working directory MUST be the desktop module: every path constant in the binary is relative to it.
$desktopDir = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $Binary))))
$logDir = Join-Path $root "tmp\batch\$Tag"
New-Item -ItemType Directory -Force $logDir | Out-Null
$recs = @(
    "2026-08-07-13-52-38", "2026-08-08-00-39-57", "2026-08-08-11-55-19", "2026-08-08-11-59-12",
    "VID_20260726_233432", "VID_20260727_233929", "VID_20260802_222203", "VID_20260802_222741",
    "VID_20260824_153751", "VID_20260824_154327"
)
$pending = @()
foreach ($r in $recs) {
    $video = Join-Path $root "data\recordings\$r\video.mp4"
    if (-not (Test-Path $video)) { throw "no video: $video" }
    $words = @("replay", $video, "score", "name=$r") + @($Extra -split " " | Where-Object { $_ })
    $pending += [pscustomobject]@{ Name = $r; Args = $words; Log = Join-Path $logDir "$r.log" }
}
$running = @(); $results = @(); $started = Get-Date
while ($pending.Count -gt 0 -or $running.Count -gt 0) {
    while ($pending.Count -gt 0 -and $running.Count -lt $MaxParallel) {
        $run = $pending[0]; $pending = @($pending | Select-Object -Skip 1)
        $proc = Start-Process -FilePath $Binary -ArgumentList $run.Args -WorkingDirectory $desktopDir -RedirectStandardOutput $run.Log -RedirectStandardError "$($run.Log).err" -PassThru -NoNewWindow
        $running += [pscustomobject]@{ Run = $run; Proc = $proc; Start = Get-Date }
    }
    Start-Sleep -Milliseconds 1000
    $still = @()
    foreach ($x in $running) {
        if ($x.Proc.HasExited) { $x.Proc.WaitForExit(); $results += [pscustomobject]@{ Run = $x.Run; Exit = $x.Proc.ExitCode; Sec = [int]((Get-Date) - $x.Start).TotalSeconds } }
        else { $still += $x }
    }
    $running = $still
}
Write-Output ("{0,-22} {1,4} {2,5}  {3}" -f "recording", "exit", "s", "found/missed/invented · alarms")
foreach ($x in ($results | Sort-Object { $_.Run.Name })) {
    $log = Get-Content $x.Run.Log -ErrorAction SilentlyContinue
    $f = ($log | Select-String "found (\d+):" | Select-Object -First 1)
    $m = ($log | Select-String "missed (\d+):" | Select-Object -First 1)
    $i = ($log | Select-String "invented (\d+)" | Select-Object -First 1)
    $a = ($log | Select-String "ALARM latched" | Measure-Object).Count
    $s = if ($f) { "$($f.Matches[0].Groups[1].Value)/$($m.Matches[0].Groups[1].Value)/$($i.Matches[0].Groups[1].Value)" } else { "no score" }
    Write-Output ("{0,-22} {1,4} {2,5}  {3} · {4} alarm" -f $x.Run.Name, $x.Exit, $x.Sec, $s, $a)
}
Write-Output ("total {0}s · {1}" -f [int]((Get-Date) - $started).TotalSeconds, $logDir)
