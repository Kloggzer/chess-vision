# End-to-end legal-prior A/B over confirmed recording move sequences.
#
# Each arm replays the complete video through the shipping Kotlin tracker and scores the committed
# SAN sequence against the recording's confirmed candidate.json. The unit is a ply, never a frame
# or crop. A lambda-zero control is run once; lambda 1/2/4 run in both historical (conditioned
# everywhere) and safe (raw recovery + explicit invalid) modes.

param(
    [string[]]$Sessions = @(),
    [double[]]$Lambdas = @(1.0, 2.0, 4.0),
    [ValidateSet("old", "new")]
    [string[]]$Modes = @("old", "new"),
    [string]$Model = "comp13-occ-bn-lr1e2-bs512",
    [int]$MaxParallel = 2,
    [switch]$NoZero
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$recordings = Join-Path $root "data\recordings"
$desktopDir = Join-Path $root "android\desktop"
$binary = Join-Path $desktopDir "build\install\desktop\bin\desktop.bat"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $root "tmp\prior-replay\$stamp"
New-Item -ItemType Directory -Force $outDir | Out-Null

Push-Location (Join-Path $root "android")
& .\gradlew.bat :desktop:installDist -q
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "installDist failed" }
Pop-Location

$selected = @()
foreach ($dir in Get-ChildItem $recordings -Directory) {
    if ($Sessions.Count -gt 0 -and $dir.Name -notin $Sessions) { continue }
    $candidate = Join-Path $dir.FullName "candidate.json"
    if (-not (Test-Path $candidate)) { continue }
    $label = Get-Content $candidate -Raw | ConvertFrom-Json
    if ($label.confirmed -ne $true) { continue }

    $rootVideo = Join-Path $dir.FullName "video.mp4"
    $videos =
        if (Test-Path $rootVideo) {
            @(Get-Item $rootVideo)
        } else {
            @(Get-ChildItem (Join-Path $dir.FullName "files\sessions") -Recurse -File -Filter "video.mp4" -ErrorAction SilentlyContinue)
        }
    if ($videos.Count -ne 1) {
        Write-Warning "$($dir.Name): expected one primary video.mp4, found $($videos.Count); skipped"
        continue
    }
    $settings = Join-Path $videos[0].DirectoryName "settings.json"
    $selected += [pscustomobject]@{
        Session = $dir.Name
        Video = $videos[0].FullName
        Settings = if (Test-Path $settings) { $settings } else { $null }
        LabelPlies = @($label.moves).Count
    }
}
if ($selected.Count -eq 0) { throw "no confirmed recording with exactly one primary video was selected" }

$arms = @()
if (-not $NoZero) {
    $arms += [pscustomobject]@{ Mode = "new"; Lambda = 0.0; Tag = "zero" }
}
foreach ($lambda in $Lambdas) {
    if ($lambda -lt 0.0) { throw "lambda must be non-negative: $lambda" }
    foreach ($mode in $Modes) {
        $arms += [pscustomobject]@{ Mode = $mode; Lambda = $lambda; Tag = "$mode-lambda$lambda" }
    }
}

$pending = @()
foreach ($recording in $selected) {
    foreach ($arm in $arms) {
        $name = "$($recording.Session)--$($arm.Tag)"
        $args = @(
            "replay", $recording.Video, "quiet", "score", "name=$($recording.Session)",
            "model=$Model", "prior=$($arm.Lambda)", "prior-mode=$($arm.Mode)"
        )
        if ($recording.Settings) { $args += "config=$($recording.Settings)" }
        $pending += [pscustomobject]@{
            Name = $name
            Session = $recording.Session
            LabelPlies = $recording.LabelPlies
            Mode = $arm.Mode
            Lambda = $arm.Lambda
            Args = $args
            Log = Join-Path $outDir "$name.log"
        }
    }
}

Write-Host "selected $($selected.Count) confirmed recordings, $($pending.Count) replay arms, model=$Model"
$running = @()
$finished = @()
$started = Get-Date
while ($pending.Count -gt 0 -or $running.Count -gt 0) {
    while ($pending.Count -gt 0 -and $running.Count -lt $MaxParallel) {
        $run = $pending[0]
        $pending = @($pending | Select-Object -Skip 1)
        Write-Host "starting $($run.Name)"
        $process = Start-Process -FilePath $binary -ArgumentList $run.Args -WorkingDirectory $desktopDir `
            -RedirectStandardOutput $run.Log -RedirectStandardError "$($run.Log).err" `
            -WindowStyle Hidden -PassThru
        $running += [pscustomobject]@{ Run = $run; Process = $process; Start = Get-Date }
    }
    Start-Sleep -Milliseconds 500
    $still = @()
    foreach ($item in $running) {
        if ($item.Process.HasExited) {
            $item.Process.WaitForExit()
            $finished += [pscustomobject]@{
                Run = $item.Run
                ExitCode = $item.Process.ExitCode
                Seconds = [int]((Get-Date) - $item.Start).TotalSeconds
            }
            Write-Host "finished $($item.Run.Name) exit=$($item.Process.ExitCode)"
        } else {
            $still += $item
        }
    }
    $running = $still
}

$results = foreach ($item in $finished) {
    $log = @(Get-Content $item.Run.Log -ErrorAction SilentlyContinue)
    $found = $log | Select-String "^  found (\d+):" | Select-Object -First 1
    $missed = $log | Select-String "^  missed (\d+):" | Select-Object -First 1
    $invented = $log | Select-String "^  invented (\d+)" | Select-Object -First 1
    [pscustomobject]@{
        session = $item.Run.Session
        label_plies = $item.Run.LabelPlies
        mode = $item.Run.Mode
        lambda = $item.Run.Lambda
        found = if ($found) { [int]$found.Matches[0].Groups[1].Value } else { $null }
        missed = if ($missed) { [int]$missed.Matches[0].Groups[1].Value } else { $null }
        invented = if ($invented) { [int]$invented.Matches[0].Groups[1].Value } else { $null }
        alarms = @($log | Select-String "ALARM latched").Count
        seconds = $item.Seconds
        exit_code = $item.ExitCode
        log = $item.Run.Log
    }
}

$json = Join-Path $outDir "results.json"
$csv = Join-Path $outDir "results.csv"
$results | Sort-Object session, lambda, mode | ConvertTo-Json -Depth 4 | Set-Content $json -Encoding utf8
$results | Sort-Object session, lambda, mode | Export-Csv $csv -NoTypeInformation -Encoding utf8

Write-Host ""
Write-Host ("{0,-24} {1,6} {2,5} {3,6} {4,7} {5,8}" -f "arm", "labels", "found", "missed", "invented", "alarms")
foreach ($group in $results | Group-Object mode, lambda | Sort-Object Name) {
    $valid = @($group.Group | Where-Object { $_.exit_code -eq 0 -and $_.found -ne $null })
    Write-Host ("{0,-24} {1,6} {2,5} {3,6} {4,7} {5,8}" -f $group.Name,
        (($valid | Measure-Object label_plies -Sum).Sum),
        (($valid | Measure-Object found -Sum).Sum),
        (($valid | Measure-Object missed -Sum).Sum),
        (($valid | Measure-Object invented -Sum).Sum),
        (($valid | Measure-Object alarms -Sum).Sum))
}
Write-Host "total $([int]((Get-Date) - $started).TotalSeconds)s; results: $json"
