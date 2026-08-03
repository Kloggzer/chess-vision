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

& $uiScript stop -Serial $Serial -ArtifactDir $ArtifactDir | Out-Null
& $uiScript launch -Serial $Serial -ArtifactDir $ArtifactDir | Out-Host
Wait-ForText "Start tracking"

[xml]$document = Get-Content -LiteralPath $dumpPath -Raw
$visible = @($document.SelectNodes("//node")) | ForEach-Object { $_.GetAttribute("text") }
foreach ($label in @("Board", "Camera", "Games", "Settings")) {
    if ($visible -notcontains $label) { throw "Main navigation label '$label' is missing." }
}

if (-not $LaunchOnly) {
    & $uiScript tap-text -Serial $Serial -Text "Start tracking" -ArtifactDir $ArtifactDir | Out-Host
    Wait-ForText "Stop tracking" 45
    $cameraRate = Wait-ForTextPattern '^camera [0-9]+(?:\.[0-9]+)? fps$' 60
    Write-Host "Camera feed confirmed: $cameraRate"
}

& $uiScript screenshot -Serial $Serial -Output $screenPath -ArtifactDir $ArtifactDir | Out-Host
Write-Host "Smoke test passed. Screenshot: $screenPath"
