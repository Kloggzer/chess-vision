# guard_ablation.ps1 — welche Wache merkt der Regressionssatz ueberhaupt?
#
#   .\scripts\guard_ablation.ps1
#   .\scripts\guard_ablation.ps1 -Nur gridHandGate,usePrior
#
# Jede boolesche Wache der Engine EINZELN abschalten und den vollen Satz fahren. Was sich dabei
# nicht ruehrt, ist von diesem Satz nicht abgedeckt — nicht notwendigerweise tot, aber als
# Freigabe wertlos. Der erste so gemessene Fall war `baselineOcclusion`: beide engine-eigenen
# Verdeckungsarme aus, 396/3/0 Ziffer fuer Ziffer wie mit (`docs/baseline-occlusion-off.md`).
#
# Laeuft SEQUENZIELL, ein Regressionslauf nach dem anderen (je zwei JVMs, ~18 min). Ein bereits
# vorhandenes Ergebnisverzeichnis wird uebersprungen, der Lauf ist also fortsetzbar.
param(
    [string[]]$Nur = @(),
    [string]$Praefix = "abl",
    [string]$Bezug = "baseline-an"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

# Fertig heisst: DIESELBEN Aufnahmen wie der Bezug. Die alte Probe war eine einzelne Datei, und
# seit der Satz von zehn auf zwoelf Aufnahmen gewachsen ist, galt jedes alte Verzeichnis als
# fertig -- die Auswertung stellte danach zehn gegen zwoelf und nannte das Delta "gedeckt".
$bezugDir = Join-Path $root "tmp\batch\$Bezug"
$soll = @(Get-ChildItem -Path $bezugDir -Filter *.log -ErrorAction SilentlyContinue |
    ForEach-Object { $_.BaseName } | Sort-Object)
if ($soll.Count -eq 0) { throw "Bezugslauf '$Bezug' fehlt unter $bezugDir -- erst den fahren" }

# Nur Wachen, die per Vorgabe AN sind — bei den anderen waere das Umlegen keine Ablation.
$wachen = @(
    "baselineOcclusion", "cnnEvalOnSettle", "verifyObserveNow", "requireMotionForMove",
    "gridHandGate", "modelHandGate", "cnnVerify", "windowEndBothEnds", "liveAlign", "usePrior"
)
if ($Nur.Count -gt 0) { $wachen = $wachen | Where-Object { $Nur -contains $_ } }

foreach ($w in $wachen) {
    $tag = "$Praefix-$w"
    $dir = Join-Path $root "tmp\batch\$tag"
    $ist = @(Get-ChildItem -Path $dir -Filter *.log -ErrorAction SilentlyContinue |
        ForEach-Object { $_.BaseName } | Sort-Object)
    if ($ist.Count -gt 0 -and -not (Compare-Object $soll $ist)) {
        Write-Output "[$w] liegt vollstaendig vor, uebersprungen"
        continue
    }
    if ($ist.Count -gt 0) {
        Write-Output "[$w] $($ist.Count) von $($soll.Count) Aufnahmen -- wird neu gefahren"
    }
    Write-Output "[$w] laeuft ..."
    & (Join-Path $PSScriptRoot "replay-regression.ps1") -Tag $tag -Extra "set:$w=0" |
        Select-Object -Last 2
}
Write-Output "fertig. Auswertung: uv run python scripts/guard_ablation.py"
