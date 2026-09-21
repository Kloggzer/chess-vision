# replay-batch.ps1 — the whole regression set in one word, in parallel.
#
#   .\scripts\replay-batch.ps1                        # the standard set below
#   .\scripts\replay-batch.ps1 -Runs @("rec-20260807-135238.mp4::score cleanonly")
#   .\scripts\replay-batch.ps1 -MaxParallel 2
#
# Each run entry is "<video under data/testclip-raw>::<replay options>". Builds the desktop
# distribution ONCE (installDist), then launches the installed binary directly — no per-run
# Gradle. Logs land under tmp/batch/<timestamp>/, and the summary table at the end pulls each
# run's score line (found/missed/invented), committed-ply count and alarm count.
#
# Deliberately capped parallelism: replays are deterministic and CPU-bound (single-thread ONNX),
# but each desktop JVM holds ~6 GB private memory — mostly NATIVE (bytedeco OpenCV/FFmpeg/OpenBLAS
# + ONNX), which no -Xmx governs; the heap itself is capped in desktop/build.gradle.kts after an
# uncapped 3-parallel round filled a 32 GB machine (one JVM ballooned to 27 GB under GC
# starvation). Two at once is ~12 GB and leaves the machine usable.

param(
    [string[]]$Runs = @(
        "rec-20260807-135238.mp4::score",
        "VID_20260802_222741.mp4::score name=game-2026-08-02",
        "rec-20260808-003957.mp4::quiet",
        "rec-20260808-115912.mp4::quiet"
    ),
    [int]$MaxParallel = 2
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$desktopDir = Join-Path $root "android\desktop"
$binary = Join-Path $desktopDir "build\install\desktop\bin\desktop.bat"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logDir = Join-Path $root "tmp\batch\$stamp"
New-Item -ItemType Directory -Force $logDir | Out-Null

Write-Host "building the desktop distribution once..."
Push-Location (Join-Path $root "android")
& .\gradlew.bat :desktop:installDist -q
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "installDist failed" }
Pop-Location

$parsed = @()
foreach ($entry in $Runs) {
    $parts = $entry -split "::", 2
    $video = Join-Path $root "data\testclip-raw\$($parts[0])"
    if (-not (Test-Path $video)) { throw "no such video: $video" }
    $options = if ($parts.Count -gt 1) { $parts[1] } else { "quiet" }
    $parsed += [pscustomobject]@{
        Stem = [IO.Path]::GetFileNameWithoutExtension($parts[0])
        Video = $video
        Words = @($options -split " " | Where-Object { $_ })
    }
}

# An A/B over ONE video is the normal case (three ply-cost arms of the same recording), and the
# log name used to be the video's alone — so the arms overwrote each other's log and the summary
# read one arm three times. A repeated stem therefore earns a suffix built from exactly the words
# that DISTINGUISH it: the tokens this arm does not share with every other arm.
$shared = @($parsed[0].Words | Where-Object { $w = $_; ($parsed | Where-Object { $_.Words -contains $w }).Count -eq $parsed.Count })
$pending = @()
foreach ($run in $parsed) {
    $name = $run.Stem
    if (($parsed | Where-Object { $_.Stem -eq $run.Stem }).Count -gt 1) {
        $tag = (@($run.Words | Where-Object { $shared -notcontains $_ }) -join "-") -replace "[^A-Za-z0-9.=-]", ""
        if (-not $tag) { $tag = "arm$($pending.Count + 1)" }
        $name = "$($run.Stem)--$tag"
    }
    $pending += [pscustomobject]@{
        Name = $name
        Args = @("replay", $run.Video) + $run.Words
        Log = Join-Path $logDir "$name.log"
    }
}

$running = @()
$results = @()
$started = Get-Date
while ($pending.Count -gt 0 -or $running.Count -gt 0) {
    while ($pending.Count -gt 0 -and $running.Count -lt $MaxParallel) {
        $run = $pending[0]
        $pending = @($pending | Select-Object -Skip 1)
        Write-Host "starting $($run.Name)  ($($run.Args -join ' '))"
        # Working directory MUST be android\desktop: every path constant in the binary
        # (data/, tmp/, the bundled models) is relative to it.
        $proc = Start-Process -FilePath $binary -ArgumentList $run.Args -WorkingDirectory $desktopDir `
            -RedirectStandardOutput $run.Log -RedirectStandardError "$($run.Log).err" -PassThru -NoNewWindow
        $running += [pscustomobject]@{ Run = $run; Proc = $proc; Start = Get-Date }
    }
    Start-Sleep -Milliseconds 500
    $still = @()
    foreach ($r in $running) {
        if ($r.Proc.HasExited) {
            $r.Proc.WaitForExit()
            $results += [pscustomobject]@{ Run = $r.Run; ExitCode = $r.Proc.ExitCode; Seconds = [int]((Get-Date) - $r.Start).TotalSeconds }
            Write-Host "finished $($r.Run.Name) (exit $($r.Proc.ExitCode), $([int]((Get-Date) - $r.Start).TotalSeconds)s)"
        } else {
            $still += $r
        }
    }
    $running = $still
}

Write-Host ""
Write-Host ("=" * 100)
Write-Host ("{0,-24} {1,5} {2,6}   {3}" -f "video", "exit", "time", "result")
foreach ($r in ($results | Sort-Object { $_.Run.Name })) {
    $log = Get-Content $r.Run.Log -ErrorAction SilentlyContinue
    $score = ($log | Select-String "found (\d+):" | Select-Object -First 1)
    $found = if ($score) { $score.Matches[0].Groups[1].Value } else { $null }
    $missed = ($log | Select-String "missed (\d+):" | Select-Object -First 1)
    $invented = ($log | Select-String "invented (\d+)" | Select-Object -First 1)
    $plies = ($log | Select-String -CaseSensitive "^decision: ply=\d+ [^-]" | Measure-Object).Count
    $alarms = ($log | Select-String "ALARM latched" | Measure-Object).Count
    $cache = ($log | Select-String "obs-cache: (\d+) hits, (\d+) misses" | Select-Object -First 1)
    $summary = if ($found) {
        "found $found / missed $($missed.Matches[0].Groups[1].Value) / invented $($invented.Matches[0].Groups[1].Value)"
    } else {
        "$plies plies"
    }
    if ($alarms -gt 0) { $summary += " | $alarms alarm(s)" }
    if ($cache) { $summary += " | cache $($cache.Matches[0].Groups[1].Value)/$($cache.Matches[0].Groups[2].Value)" }
    Write-Host ("{0,-24} {1,5} {2,5}s   {3}" -f $r.Run.Name, $r.ExitCode, $r.Seconds, $summary)
}
Write-Host ("total: {0}s | logs: {1}" -f [int]((Get-Date) - $started).TotalSeconds, $logDir)
