[CmdletBinding()]
param(
    [string]$Serial,
    [switch]$LaunchOnly,
    [string]$ArtifactDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$uiScript = Join-Path $PSScriptRoot "android-ui.ps1"
$adb = (Get-Command adb.exe -ErrorAction Stop).Source
if (-not $ArtifactDir) {
    if (-not $Serial) { throw "-Serial is required so parallel smoke tests stay isolated." }
    $ArtifactDir = Join-Path $repoRoot "tmp\android-emulator\$Serial"
}
$dumpPath = Join-Path $ArtifactDir "smoke-window.xml"
$screenPath = Join-Path $ArtifactDir "smoke-screen.png"

function Read-VisibleText([string]$Path) {
    [xml]$document = Get-Content -LiteralPath $Path -Raw
    @($document.SelectNodes("//node")) | ForEach-Object { $_.GetAttribute("text") } | Where-Object { $_ }
}

function Wait-ForText([string]$Expected, [int]$TimeoutSeconds = 30) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        & $uiScript dump -Serial $Serial -Output $dumpPath -ArtifactDir $ArtifactDir *> $null
        $visible = @(Read-VisibleText $dumpPath)
        if ($visible -contains $Expected) { return }
        Start-Sleep -Milliseconds 750
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for UI text '$Expected'. Last visible text: $($visible -join ' | ')"
}

function Wait-ForTextPattern([string]$Pattern, [int]$TimeoutSeconds = 45) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        & $uiScript dump -Serial $Serial -Output $dumpPath -ArtifactDir $ArtifactDir *> $null
        $visible = @(Read-VisibleText $dumpPath)
        $matched = $visible | Where-Object { $_ -match $Pattern } | Select-Object -First 1
        if ($matched) { return $matched }
        Start-Sleep -Milliseconds 750
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for UI text matching '$Pattern'. Last visible text: $($visible -join ' | ')"
}

# The player-facing tracking header no longer exposes an FPS counter. Prove that frames reach the
# analyzer from its once-per-second performance line instead: an open camera alone is not a feed.
function Wait-ForCameraFeed([int]$TimeoutSeconds = 60) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $lines = @(& $adb -s $Serial logcat -d -t 200 -s chesslabPerf:D '*:S' 2>$null)
        $rate =
            $lines |
                Where-Object { $_ -match 'fps=([1-9][0-9]*(?:\.[0-9]+)?)' } |
                ForEach-Object { $Matches[1] } |
                Select-Object -Last 1
        if ($rate) { return $rate }
        Start-Sleep -Milliseconds 750
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for camera frames to reach the analyzer."
}

& $uiScript stop -Serial $Serial -ArtifactDir $ArtifactDir | Out-Null
& $uiScript launch -Serial $Serial -ArtifactDir $ArtifactDir | Out-Host
# specs/47: the app opens on Home, not on the tracker. There is no tab row and no bottom bar —
# three destinations, and the two that are not the tracker are rows on this screen.
Wait-ForText "Start a game"

[xml]$document = Get-Content -LiteralPath $dumpPath -Raw
$visible = @($document.SelectNodes("//node")) | ForEach-Object { $_.GetAttribute("text") }
# Settings became an icon-only cog in the app bar, so it has a contentDescription and no text.
$described = @($document.SelectNodes("//node")) | ForEach-Object { $_.GetAttribute("content-desc") }
# specs/48: Home is a launcher, so the library row is "All games" — the row that used to read
# "Games" sat beside a "Games" stat tile counting the same thing, and the tiles moved to Games.
foreach ($label in @("Start a game", "All games")) {
    if ($visible -notcontains $label) { throw "Home destination '$label' is missing." }
}
if ($described -notcontains "Settings") { throw "Home destination 'Settings' is missing." }

if (-not $LaunchOnly) {
    & $uiScript tap-text -Serial $Serial -Text "Start a game" -ArtifactDir $ArtifactDir | Out-Host
    Wait-ForText "Start tracking" 30
    & $adb -s $Serial logcat -c
    & $uiScript tap-text -Serial $Serial -Text "Start tracking" -ArtifactDir $ArtifactDir | Out-Host
    Wait-ForText "Stop tracking" 45
    $cameraRate = Wait-ForCameraFeed 60
    Write-Host "Camera feed confirmed: $cameraRate fps"
}

& $uiScript screenshot -Serial $Serial -Output $screenPath -ArtifactDir $ArtifactDir | Out-Host
Write-Host "Smoke test passed. Screenshot: $screenPath"
