# arena-workspace.ps1 — der Arbeitsplatz für einen Agenten, der einen Tracker von Null baut.
#
#   .\scripts\arena-workspace.ps1
#   .\scripts\arena-workspace.ps1 -Path C:\tmp\arena -Recordings @("2026-08-08-11-55-19")
#
# Legt einen git-Worktree an und stellt GENAU die Aufnahmen hinein, die der Agent sehen darf.
# `data/` ist gitignored, also ist ein frischer Worktree datenlos — das ist die Sperre: was hier
# nicht verlinkt wird, kann drüben nicht gemessen und nicht auswendig gelernt werden. Die
# Hold-out-Aufnahmen bleiben deshalb ausschliesslich im Haupt-Repo.
#
# Das Video kommt als Hardlink (kein Platz, kein Kopieren), die Referenz als KOPIE — der Agent
# soll die Wahrheit seines Dev-Satzes lesen dürfen, aber nie die des Korpus verändern können.

param(
    [string]$Path = "../chess-vision-arena",
    [string]$Branch = "arena/tracker-from-scratch",
    # Leer = jede Aufnahme, die ein Video UND eine Referenz hat. Der Hold-out ist dann nicht mehr
    # eine zurueckgehaltene Aufnahme, sondern eine NEUE, die es noch nicht gibt — die schaerfere
    # Pruefung, weil sie auch die Kamera und den Aufbau des Tages neu wuerfelt.
    [string[]]$Recordings = @()
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$target = [IO.Path]::GetFullPath((Join-Path $root $Path))

if (Test-Path $target) { throw "$target existiert bereits — erst 'git worktree remove' oder einen anderen -Path" }

Write-Host "Worktree $Branch -> $target"
# -q, weil git seinen Fortschritt auf stderr schreibt und PowerShell 5.1 daraus eine
# NativeCommandError macht — der Worktree stünde, das Skript bräche trotzdem ab.
& git -C $root worktree add -q -b $Branch $target
if ($LASTEXITCODE -ne 0) { throw "git worktree add fehlgeschlagen" }

# Die Arena kommt aus dem ARBEITSBAUM, nicht aus HEAD: sie darf sich weiterentwickeln, ohne dass
# jeder Zwischenstand committet sein muss. Alles andere im Worktree ist der Stand des Branches.
# Erst loeschen, dann kopieren: Copy-Item legt auf ein BESTEHENDES Ziel eine verschachtelte Kopie
# (`arena\arena`) an und laesst die alten Quellen stehen — der Build lief dann auf altem Stand.
$arenaDst = Join-Path $target "android\arena"
Remove-Item $arenaDst -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $root "android\arena") $arenaDst -Recurse -Force
Remove-Item (Join-Path $arenaDst "build") -Recurse -Force -ErrorAction SilentlyContinue
$settings = Join-Path $target "android\settings.gradle.kts"
$text = Get-Content $settings -Raw
if ($text -notmatch ":arena") {
    $patched = $text.Replace('include(":desktop")', "include(`":desktop`")`r`ninclude(`":arena`")")
    Set-Content $settings $patched -Encoding utf8
}

$dataDir = Join-Path $target "data\recordings"
New-Item -ItemType Directory -Force $dataDir | Out-Null

if ($Recordings.Count -eq 0) {
    $Recordings = Get-ChildItem (Join-Path $root "data\recordings") -Directory | Where-Object {
        (Test-Path (Join-Path $_.FullName "video.mp4")) -and
        ((Test-Path (Join-Path $_.FullName "reference.pgn")) -or (Test-Path (Join-Path $_.FullName "candidate.json")))
    } | ForEach-Object { $_.Name }
}

foreach ($name in $Recordings) {
    $src = Join-Path $root "data\recordings\$name"
    if (-not (Test-Path (Join-Path $src "video.mp4"))) { throw "kein Video für $name" }
    $dst = Join-Path $dataDir $name
    New-Item -ItemType Directory -Force $dst | Out-Null
    New-Item -ItemType HardLink -Path (Join-Path $dst "video.mp4") -Target (Join-Path $src "video.mp4") | Out-Null
    foreach ($ref in @("candidate.json", "reference.pgn", "session.yaml")) {
        $refPath = Join-Path $src $ref
        if (Test-Path $refPath) { Copy-Item $refPath (Join-Path $dst $ref) }
    }
    Write-Host "  $name"
}

# Die Modellkarten: was das Training über das Modell gemessen hat (Recall je Klasse, sichtbar
# gegen alles, Verwechslungsmatrix). Ohne sie ist jede Feldlesung eine Zahl ohne Fehlerbalken.
# Die Gewichte selbst bleiben draussen — das ONNX in den Assets ist alles, was ein Lauf braucht.
$models = @("real13-ms-s3-hn4-bn80", "real13-ms-s2-bn80-bs256-swa1e4", "comp13-occ-bn-lr1e2-bs512")
foreach ($model in $models) {
    $src = Join-Path $root "data\models\$model"
    if (-not (Test-Path $src)) { Write-Host "  (keine Karte für $model)"; continue }
    $dst = Join-Path $target "data\models\$model"
    New-Item -ItemType Directory -Force $dst | Out-Null
    Get-ChildItem $src -File | Where-Object {
        $_.Name -eq "model_card.json" -or $_.Name -eq "config.json" -or $_.Name -eq "metrics.jsonl" -or
        $_.Name -like "eval_*.json" -or $_.Name -like "confusion_*.txt"
    } | ForEach-Object { Copy-Item $_.FullName (Join-Path $dst $_.Name) }
    Write-Host "  Karte $model"
}

Copy-Item (Join-Path $root "docs\agent-briefs\tracker-from-scratch.md") (Join-Path $target "AUFTRAG.md")

# Die Sperre, die nicht nur im Text steht. `CLAUDE.md` wird ungefragt geladen und beschreibt unseren
# Tracker vollstaendig — sie zu ersetzen ist der halbe Versuchsaufbau. `docs/` und `:desktop` gehen
# denselben Weg; die Kotlin-Module bleiben, weil die Arena gegen ihre Geometrie kompiliert.
Copy-Item (Join-Path $root "android\arena\CLAUDE.arena.md") (Join-Path $target "CLAUDE.md") -Force
foreach ($gone in @("docs", "TODO.md", "AGENTS.md", "README.md", "specs", "platform", "src", "synth", "tests",
                    "android\desktop", "android\app\src", "android\CLAUDE.md")) {
    Remove-Item (Join-Path $target $gone) -Recurse -Force -ErrorAction SilentlyContinue
}
# Die Modelle liegen unter app/src/main/assets und muessen die Loeschung ueberleben.
$assets = Join-Path $target "android\app\src\main\assets\cnn_model"
New-Item -ItemType Directory -Force $assets | Out-Null
Copy-Item (Join-Path $root "android\app\src\main\assets\cnn_model\*") $assets -Recurse -Force

$settings = Join-Path $target "android\settings.gradle.kts"
$keep = (Get-Content $settings) | Where-Object { $_ -notmatch 'include\(":(desktop|app)"\)' }
Set-Content $settings $keep -Encoding utf8

Write-Host ""
Write-Host "Bereit. Der Agent startet in $target mit AUFTRAG.md."
Write-Host "  cd $target\android; .\gradlew.bat :arena:installDist"
Write-Host "  cd arena; .\build\install\arena\bin\arena.bat list"
