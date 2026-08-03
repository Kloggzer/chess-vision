[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [ValidateSet("launch", "stop", "dump", "screenshot", "tap-text", "tap-description", "tap", "type", "swipe", "back", "logcat")]
    [string]$Action = "dump",
    [string]$Serial,
    [string]$Text,
    [int]$X,
    [int]$Y,
    [int]$X2,
    [int]$Y2,
    [int]$DurationMs = 300,
    [string]$Output,
    [string]$ArtifactDir
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packageName = "com.chesslab.tracker.emulator"
$activityName = "com.chesslab.tracker.MainActivity"

function Find-Adb {
    $candidates = @(
        $(if ($env:ANDROID_SDK_ROOT) { Join-Path $env:ANDROID_SDK_ROOT "platform-tools\adb.exe" })
        $(if ($env:ANDROID_HOME) { Join-Path $env:ANDROID_HOME "platform-tools\adb.exe" })
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe" })
    ) | Where-Object { $_ } | Select-Object -Unique
    $found = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
    if (-not $found) { throw "adb.exe not found. Set ANDROID_SDK_ROOT or install Android platform-tools." }
    return $found
}

function Find-Serial([string]$Adb, [string]$Requested) {
    if ($Requested) { return $Requested }
    $online = @(
        @(& $Adb devices) |
            ForEach-Object {
                if ($_ -match '^(emulator-\d+)\s+device$') { $Matches[1] }
            }
    )
    if ($online.Count -eq 0) { throw "No running Android emulator found." }
    if ($online.Count -gt 1) { throw "Multiple emulators are running; pass -Serial. Found: $($online -join ', ')" }
    return $online[0]
}

function Ensure-OutputDirectory([string]$Path) {
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path -LiteralPath $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
}

function Pull-File([string]$Adb, [string]$Device, [string]$Remote, [string]$Path) {
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        for ($attempt = 1; $attempt -le 3; $attempt++) {
            & $Adb -s $Device pull $Remote $Path 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) { return }
            Start-Sleep -Milliseconds 250
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    throw "Could not pull '$Remote' after three attempts."
}

function Dump-Ui([string]$Adb, [string]$Device, [string]$Path) {
    $remote = "/sdcard/Download/chesslab-agent-window.xml"
    Ensure-OutputDirectory $Path
    & $Adb -s $Device shell uiautomator dump $remote | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "uiautomator dump failed." }
    Pull-File $Adb $Device $remote $Path
    return [xml](Get-Content -LiteralPath $Path -Raw)
}

function Tap-Node([string]$Adb, [string]$Device, [xml]$Document, [string]$Attribute, [string]$Value) {
    if (-not $Value) { throw "-Text is required for this action." }
    $nodes = @(
        @($Document.SelectNodes("//node")) | Where-Object { $_.GetAttribute($Attribute) -eq $Value }
    )
    if ($nodes.Count -eq 0) { throw "No visible UI node has $Attribute '$Value'. Run the dump action to inspect available nodes." }
    $node = $nodes | Where-Object { $_.GetAttribute("clickable") -eq "true" } | Select-Object -First 1
    if (-not $node) { $node = $nodes | Select-Object -First 1 }
    $bounds = $node.GetAttribute("bounds")
    if ($bounds -notmatch '^\[(\d+),(\d+)\]\[(\d+),(\d+)\]$') { throw "Cannot parse bounds '$bounds'." }
    $tapX = [int](([int]$Matches[1] + [int]$Matches[3]) / 2)
    $tapY = [int](([int]$Matches[2] + [int]$Matches[4]) / 2)
    & $Adb -s $Device shell input tap $tapX $tapY | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "adb tap failed." }
    Write-Host "Tapped $Attribute '$Value' at $tapX,$tapY."
}

$adb = Find-Adb
$Serial = Find-Serial $adb $Serial
if (-not $ArtifactDir) {
    $ArtifactDir = Join-Path $repoRoot "tmp\android-emulator\$Serial"
}

switch ($Action) {
    "launch" {
        & $adb -s $Serial shell pm grant $packageName android.permission.CAMERA 2>$null
        & $adb -s $Serial shell pm grant $packageName android.permission.POST_NOTIFICATIONS 2>$null
        & $adb -s $Serial shell am start -W -n "$packageName/$activityName" | Out-Host
    }
    "stop" {
        & $adb -s $Serial shell am force-stop $packageName | Out-Null
    }
    "dump" {
        if (-not $Output) { $Output = Join-Path $ArtifactDir "window.xml" }
        $document = Dump-Ui $adb $Serial $Output
        Write-Host "UI hierarchy: $Output"
        @($document.SelectNodes("//node")) |
            Where-Object { $_.GetAttribute("text") -or $_.GetAttribute("content-desc") } |
            ForEach-Object {
                [pscustomobject]@{
                    Text = $_.GetAttribute("text")
                    Description = $_.GetAttribute("content-desc")
                    Clickable = $_.GetAttribute("clickable")
                    Bounds = $_.GetAttribute("bounds")
                }
            } | Format-Table -AutoSize
    }
    "screenshot" {
        if (-not $Output) { $Output = Join-Path $ArtifactDir "screen.png" }
        Ensure-OutputDirectory $Output
        $remote = "/sdcard/Download/chesslab-agent-screen.png"
        & $adb -s $Serial shell screencap -p $remote | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "Could not capture the emulator screen." }
        Pull-File $adb $Serial $remote $Output
        Write-Host "Screenshot: $Output"
    }
    "tap-text" {
        $dumpPath = Join-Path $ArtifactDir "window.xml"
        Tap-Node $adb $Serial (Dump-Ui $adb $Serial $dumpPath) "text" $Text
    }
    "tap-description" {
        $dumpPath = Join-Path $ArtifactDir "window.xml"
        Tap-Node $adb $Serial (Dump-Ui $adb $Serial $dumpPath) "content-desc" $Text
    }
    "tap" {
        & $adb -s $Serial shell input tap $X $Y | Out-Null
    }
    "type" {
        if (-not $Text) { throw "-Text is required for the type action." }
        $encoded = $Text.Replace(" ", "%s")
        & $adb -s $Serial shell input text $encoded | Out-Null
    }
    "swipe" {
        & $adb -s $Serial shell input swipe $X $Y $X2 $Y2 $DurationMs | Out-Null
    }
    "back" {
        & $adb -s $Serial shell input keyevent BACK | Out-Null
    }
    "logcat" {
        $lines = & $adb -s $Serial logcat -d -t 300
        if ($Output) {
            Ensure-OutputDirectory $Output
            $lines | Set-Content -LiteralPath $Output -Encoding utf8
            Write-Host "Logcat: $Output"
        } else {
            $lines | Out-Host
        }
    }
}
