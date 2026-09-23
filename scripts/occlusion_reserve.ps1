# occlusion_reserve.ps1 — was die Verdeckungs-Reserve auf ECHTEM Material kostet.
#
#   .\scripts\occlusion_reserve.ps1
#
# `motionPxThr` steuert ueber `BASELINE_ABS_THR_FACTOR = 4.0` auch die Baseline-Verdeckungs-
# schwelle. Der Champion hob sie von 80 auf 138; `desktop fuzz check` misst dafuer synthetisch
# 42 % weniger `veto:occlusion`. Hier laeuft dieselbe Frage auf Aufnahmen: derselbe Satz, einmal
# mit der ausgelieferten Schwelle und einmal mit der alten, und gezaehlt wird aus dem Trace.
# Ein Job zur Zeit — der Nutzer ist nicht am Rechner (`docs/regression-reference.md`).
param(
    [string]$Tag = "occl-reserve",
    [double]$Alt = 20.0
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location (Join-Path $root "android")
& .\gradlew.bat :desktop:installDist -q
if ($LASTEXITCODE -ne 0) { Pop-Location; throw "installDist failed" }
Pop-Location
$bin = Join-Path $root "android\desktop\build\install\desktop\bin\desktop.bat"
$desktopDir = Join-Path $root "android\desktop"
$out = Join-Path $root "tmp\batch\$Tag"
New-Item -ItemType Directory -Force $out | Out-Null

# Die vier kuerzesten des Regressionssatzes, wie beim Knopf-Screening: 10 996 Frames.
$recs = @("2026-08-08-11-55-19", "VID_20260727_233929", "VID_20260726_233432", "VID_20260824_153751")
$arme = @{ "champion" = $null; "alt" = "set:motionPxThr=$Alt" }

foreach ($arm in $arme.Keys) {
    foreach ($r in $recs) {
        $video = Join-Path $root "data\recordings\$r\video.mp4"
        if (-not (Test-Path $video)) { throw "no video: $video" }
        $trace = Join-Path $out "$arm--$r.jsonl"
        $words = @("replay", $video, "score", "name=$r", "quiet", "trace=$trace")
        if ($arme[$arm]) { $words += $arme[$arm] }
        $log = Join-Path $out "$arm--$r.log"
        Write-Output "[$arm] $r ..."
        $p = Start-Process -FilePath $bin -ArgumentList $words -WorkingDirectory $desktopDir `
            -RedirectStandardOutput $log -RedirectStandardError "$log.err" -PassThru -NoNewWindow
        $p.WaitForExit()
    }
}
Write-Output "fertig -> $out"
