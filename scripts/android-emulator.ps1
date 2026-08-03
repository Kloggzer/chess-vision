[CmdletBinding()]
param(
    [string]$Avd,
    [int]$Port,
    [string]$Clip = "blender-opening",
    [string]$ArtifactDir,
    [switch]$NoBuild,
    [switch]$NoSmoke,
    [switch]$Headless,
    [switch]$ColdBoot,
    [switch]$RestartExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$androidRoot = Join-Path $repoRoot "android"
$packageName = "com.chesslab.tracker.emulator"
$activityName = "com.chesslab.tracker.MainActivity"

function Find-AndroidSdk {
    $candidates = @(
        $env:ANDROID_SDK_ROOT
        $env:ANDROID_HOME
        $(if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "Android\Sdk" })
    ) | Where-Object { $_ } | Select-Object -Unique

    foreach ($candidate in $candidates) {
        if (Test-Path (Join-Path $candidate "platform-tools\adb.exe")) {
            return (Resolve-Path $candidate).Path
        }
    }
    throw "Android SDK not found. Set ANDROID_SDK_ROOT or install the SDK with Android Studio."
}

function Get-EmulatorDevices([string]$Adb) {
    @(
        @(& $Adb devices) | ForEach-Object {
            if ($_ -match '^(emulator-\d+)\s+(\S+)$') {
                [pscustomobject]@{ Serial = $Matches[1]; Status = $Matches[2] }
            }
        }
    )
}

function Get-AvdName([string]$Adb, [string]$Serial) {
    $lines = @(& $Adb -s $Serial emu avd name 2>$null)
    if ($LASTEXITCODE -ne 0) { return $null }
    return $lines | ForEach-Object { $_.Trim() } | Where-Object { $_ -and $_ -ne "OK" } | Select-Object -First 1
}

function Stop-Emulator([string]$Adb, [string]$Serial) {
    Write-Host "Stopping $Serial..."
    & $Adb -s $Serial emu kill | Out-Null
    $deadline = (Get-Date).AddSeconds(30)
    do {
        Start-Sleep -Seconds 1
        $stillPresent = @(Get-EmulatorDevices $Adb | Where-Object { $_.Serial -eq $Serial }).Count -gt 0
    } while ($stillPresent -and (Get-Date) -lt $deadline)
    if ($stillPresent) { throw "Emulator $Serial did not stop within 30 seconds." }
}

function Wait-ForBoot([string]$Adb, [string]$Serial, [int]$TimeoutSeconds = 180) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    try {
        while ((Get-Date) -lt $deadline) {
            $booted = (& $Adb -s $Serial shell getprop sys.boot_completed 2>$null | Out-String).Trim()
            if ($LASTEXITCODE -eq 0 -and $booted -eq "1") { return }
            Start-Sleep -Seconds 2
        }
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    throw "Emulator $Serial did not finish booting within $TimeoutSeconds seconds."
}

function Resolve-Clip([string]$Requested) {
    if (Test-Path -LiteralPath $Requested -PathType Leaf) {
        return (Resolve-Path -LiteralPath $Requested).Path
    }
    $fileName = if ($Requested.EndsWith(".mp4")) { $Requested } else { "$Requested.mp4" }
    $bundled = Join-Path $repoRoot "tests\data\testclips\$fileName"
    if (Test-Path -LiteralPath $bundled -PathType Leaf) {
        return (Resolve-Path -LiteralPath $bundled).Path
    }
    throw "Clip '$Requested' not found. Pass an MP4 path or a name from tests/data/testclips."
}

$sdk = Find-AndroidSdk
$adb = Join-Path $sdk "platform-tools\adb.exe"
$emulator = Join-Path $sdk "emulator\emulator.exe"
if (-not (Test-Path -LiteralPath $emulator -PathType Leaf)) {
    throw "Android Emulator not found at '$emulator'. Install it from Android Studio's SDK Manager."
}

$cameraHelp = (& $emulator -help-camera-back 2>&1 | Out-String)
if ($cameraHelp -notmatch 'videofile') {
    $versionLine = (& $emulator -version 2>&1 | Select-Object -First 1)
    throw "The installed $versionLine does not support -camera-back videofile:<path>. Update Android Emulator to 36.6.4 or newer in Android Studio SDK Manager."
}

$availableAvds = @(& $emulator -list-avds) | Where-Object { $_.Trim() }
if (-not $Avd) {
    $Avd = $availableAvds | Where-Object { $_ -match '^Chesslab_Agent1$' } | Select-Object -First 1
    if (-not $Avd) { $Avd = $availableAvds | Where-Object { $_ -match 'chesslab' } | Select-Object -First 1 }
    if (-not $Avd) { $Avd = $availableAvds | Select-Object -First 1 }
}
if (-not $Avd) {
    throw "No Android Virtual Device found. Create an x86_64 phone AVD (API 35 recommended) in Android Studio Device Manager."
}
if ($availableAvds -notcontains $Avd) {
    throw "AVD '$Avd' does not exist. Available: $($availableAvds -join ', ')"
}
if ($PSBoundParameters.ContainsKey("Port")) {
    if ($Port -lt 5554 -or $Port -gt 5682 -or ($Port % 2) -ne 0) {
        throw "-Port must be an even emulator console port from 5554 through 5682."
    }
}

$clipPath = Resolve-Clip $Clip
$devices = @(Get-EmulatorDevices $adb)
$serial = $null
$mustStart = $true

if ($PSBoundParameters.ContainsKey("Port")) {
    $targetSerial = "emulator-$Port"
    $target = $devices | Where-Object { $_.Serial -eq $targetSerial } | Select-Object -First 1
    if ($target) {
        if ($target.Status -ne "device") {
            throw "$targetSerial already occupies port $Port but is '$($target.Status)'. Wait for it or stop it explicitly."
        }
        $runningAvd = Get-AvdName $adb $targetSerial
        if ($runningAvd -ne $Avd) {
            throw "$targetSerial is running AVD '$runningAvd', not '$Avd'. Choose another -Port; this script will not stop another agent's AVD."
        }
        if ($RestartExisting) {
            Stop-Emulator $adb $targetSerial
        } else {
            $serial = $targetSerial
            $mustStart = $false
        }
    }
} else {
    $matching = @(
        $devices | Where-Object { $_.Status -eq "device" } | Where-Object {
            (Get-AvdName $adb $_.Serial) -eq $Avd
        }
    )
    if ($matching.Count -gt 1) {
        throw "AVD '$Avd' is running more than once. Pass -Port to select one instance."
    }
    if ($matching.Count -eq 1) {
        $serial = $matching[0].Serial
        if ($RestartExisting) {
            Stop-Emulator $adb $serial
            $serial = $null
        } else {
            $mustStart = $false
        }
    }
}

if (-not $mustStart) {
    Write-Warning "Reusing $serial for AVD '$Avd'. Camera input is fixed at startup; use -RestartExisting to apply '$clipPath'."
} else {
    $beforeSerials = @(Get-EmulatorDevices $adb | ForEach-Object { $_.Serial })

    Write-Host "Starting AVD '$Avd' with camera clip '$clipPath'..."
    $emulatorArgs = @("-avd", $Avd, "-camera-back", "videofile:$clipPath", "-no-boot-anim")
    if ($PSBoundParameters.ContainsKey("Port")) { $emulatorArgs += @("-port", $Port) }
    if ($Headless) { $emulatorArgs += @("-no-window", "-no-audio") }
    if ($ColdBoot) { $emulatorArgs += "-no-snapshot-load" }

    $startArgs = @{
        FilePath = $emulator
        ArgumentList = $emulatorArgs
        PassThru = $true
    }
    if ($Headless) { $startArgs.WindowStyle = "Hidden" }
    Start-Process @startArgs | Out-Null

    $deadline = (Get-Date).AddSeconds(60)
    do {
        Start-Sleep -Seconds 1
        $now = @(Get-EmulatorDevices $adb)
        if ($PSBoundParameters.ContainsKey("Port")) {
            $serial = $now | Where-Object { $_.Serial -eq "emulator-$Port" } | ForEach-Object { $_.Serial } | Select-Object -First 1
        } else {
            $serial = $now | Where-Object { $_.Serial -notin $beforeSerials } | ForEach-Object { $_.Serial } | Select-Object -First 1
        }
    } while (-not $serial -and (Get-Date) -lt $deadline)
    if (-not $serial) { throw "AVD '$Avd' started, but adb did not see its emulator within 60 seconds." }
}

Write-Host "Waiting for $serial to finish booting..."
Wait-ForBoot $adb $serial
$actualAvd = Get-AvdName $adb $serial
if ($actualAvd -ne $Avd) {
    throw "Safety check failed: $serial reports AVD '$actualAvd', expected '$Avd'."
}

if (-not $ArtifactDir) {
    $ArtifactDir = Join-Path $repoRoot "tmp\android-emulator\$serial"
}

if (-not $NoBuild) {
    Write-Host "Building the x86_64 emulator APK..."
    Push-Location $androidRoot
    try {
        & .\gradlew.bat :app:assembleEmulator
        if ($LASTEXITCODE -ne 0) { throw "Gradle assembleEmulator failed with exit code $LASTEXITCODE." }
    } finally {
        Pop-Location
    }
}

$apk = Get-ChildItem (Join-Path $androidRoot "app\build\outputs\apk\emulator") -Filter "*.apk" -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch 'androidTest' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
if (-not $apk) { throw "No emulator APK found. Run without -NoBuild first." }

Write-Host "Installing $($apk.Name) on $serial..."
& $adb -s $serial install -r $apk.FullName | Out-Host
if ($LASTEXITCODE -ne 0) { throw "adb install failed with exit code $LASTEXITCODE." }

& $adb -s $serial shell pm grant $packageName android.permission.CAMERA 2>$null
& $adb -s $serial shell pm grant $packageName android.permission.POST_NOTIFICATIONS 2>$null
& $adb -s $serial shell am force-stop $packageName | Out-Null
& $adb -s $serial shell am start -W -n "$packageName/$activityName" | Out-Host
if ($LASTEXITCODE -ne 0) { throw "Could not launch $packageName." }

if (-not $NoSmoke) {
    & (Join-Path $PSScriptRoot "android-smoke.ps1") -Serial $serial -ArtifactDir $ArtifactDir
    if ($LASTEXITCODE -ne 0) { throw "Android smoke test failed." }
}

Write-Host ""
Write-Host "Chesslab emulator is ready on $serial."
Write-Host "Agent controls: .\scripts\android-ui.ps1 dump -Serial $serial"
Write-Host "Camera clip: $clipPath"
Write-Host "Artifacts: $ArtifactDir"
