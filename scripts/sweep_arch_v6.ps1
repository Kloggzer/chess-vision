<#
.SYNOPSIS
  Architektur-Arme x Seeds, ein Rezept, ein Datensatz.

  Gepaart je Seed ausgewertet, nicht auf `best` — siehe HANDOFF-TRAINING-2026-09-11.md.
  Ein Lauf, dessen metrics.jsonl schon voll ist, wird uebersprungen; der Sweep haengt also nicht
  am Exit-Code, sondern an den Epochen auf der Platte.
#>
param(
  [string]$Dataset = "real13-mix-v6-80",
  [string]$OutRoot = "data/models/_arch80v6",
  [string[]]$Seeds = @("42", "43", "44"),
  [string[]]$Arms = @("p4a=boardattn:cellnet_p4", "p8a=boardattn:cellnet_p8",
                      "p8c=board:cellnet_p8", "p8n=cellnet_p8"),
  [int]$Epochs = 60,
  [int]$BatchSize = 256,
  [double]$Lr = 0.01,
  [string]$Split = "split-pin.json",
  # 0,35 ist das Rezept JEDES frueheren Architekturlaufs (`_arch/*`, `p4a-v6-s42`). Die CLI-Vorgabe
  # 1,0 rechnet fast dreimal so viel und zieht je Epoche 36 statt 12,6 GB durch 31,8 GB RAM — das
  # hat am 2026-09-11 den Rechner neu gestartet und zwei Laeufe mit 0xC0000409 getoetet.
  [double]$EpochFrac = 0.35,
  [double]$WeightCap = 3.0,
  # `--low-memory` nullte die Worker mit; gerettet hat den Speicher aber der Datei-Lesepfad,
  # nicht deren Abwesenheit. Ohne Worker kostete der Feed 20,5 von 27,2 s je Epoche.
  [int]$Workers = 2,
  # Brettkopf-Groesse; laeuft EINMAL je Brett, kostet also 1/64 je Crop.
  [int]$BoardWidth = 128,
  [int]$BoardLayers = 2,
  # Kein Early Stopping: verglichen wird das Mittel der letzten Epochen, und dafuer muessen alle
  # Arme dieselbe Zahl laufen und den Cosine zu Ende gehen. Mit der Vorgabe 7 stoppte p4a-s42 bei
  # Epoche 14, waehrend der Referenzlauf 54 schaffte — das ist kein Vergleich, das ist Zufall.
  [int]$Patience = 999,
  # Seeds aussen: liefert frueh EIN gepaartes Ergebnis ueber alle Arme statt spaet drei fuer einen.
  [switch]$BySeed
)

$ErrorActionPreference = 'Continue'
$env:OPENBLAS_NUM_THREADS = 1
# Triton waehlt sonst clang, dem die Windows-Header fehlen.
$env:CC = (Resolve-Path ".venv\Lib\site-packages\triton\runtime\tcc\tcc.exe").Path

# `powershell -File` reicht eine Komma-Liste als EIN Element durch; ohne das Aufspalten landet
# der zweite Arm im Backbone-Namen des ersten und timm meldet "Unknown model".
$Arms = @($Arms | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
# Dieselbe Falle wie bei $Arms: `-File` reicht "42,43,44" als EIN Element durch, und der
# Lauf hiess dann `p4aXL-s` ohne Seed.
$Seeds = @($Seeds | ForEach-Object { "$_" -split ',' } | Where-Object { $_ } | ForEach-Object { [int]$_ })

New-Item -ItemType Directory -Force $OutRoot | Out-Null
$pairs = if ($BySeed) { foreach ($s in $Seeds) { foreach ($a in $Arms) { , @($a, $s) } } }
         else { foreach ($a in $Arms) { foreach ($s in $Seeds) { , @($a, $s) } } }
Write-Output "sweep: $($pairs.Count) Laeufe auf $Dataset ($Epochs Epochen, patience $Patience)"

foreach ($pair in $pairs) {
  $arm, $seed = $pair
  $tag, $backbone = $arm.Split("=", 2)
  # Eigener Compiler-Cache je ARM: ein geteilter faerbt die Zeitmessung des naechsten Arms.
  $env:TORCHINDUCTOR_CACHE_DIR = (New-Item -ItemType Directory -Force "data/tmp/inductor/$tag").FullName
  $env:TRITON_CACHE_DIR = (New-Item -ItemType Directory -Force "data/tmp/triton/$tag").FullName

  $out = Join-Path $OutRoot "$tag-s$seed"
  $metrics = Join-Path $out "metrics.jsonl"
  if (Test-Path $metrics) {
    $done = (Get-Content $metrics | Measure-Object -Line).Lines
    if ($done -ge $Epochs) { Write-Output "[skip] $tag-s$seed ($done Epochen da)"; continue }
    # NICHT loeschen: ein abgebrochener Lauf kann 54 von 60 Epochen tragen, und genau das ist am
    # 2026-09-11 nach einem Rechnerneustart verlorengegangen. Beiseitelegen, der Nutzer entscheidet.
    $parked = "$out.partial-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Write-Output "[redo] $tag-s$seed hat nur $done von $Epochs Epochen -> $parked"
    Move-Item $out $parked
  }
  $started = Get-Date
  Write-Output "[run ] $tag-s$seed  $backbone  $(Get-Date -Format 'HH:mm:ss')"
  uv run chesslab train --backbone $backbone --no-pretrained --dataset $Dataset --split $Split `
    --out $out --epochs $Epochs --batch-size $BatchSize --lr $Lr --sched cosine `
    --weight-decay 0.01 --head occlusion --seed $seed --low-memory --ram-reserve-gb 4 --patience $Patience `
    --num-workers $Workers `
    --epoch-frac $EpochFrac --weight-cap $WeightCap --board-width $BoardWidth --board-layers $BoardLayers `
    --batch-aug --compile-batch-aug --compile-model --fused-adamw *> "$out.log"
  $code = $LASTEXITCODE
  $epochs = if (Test-Path $metrics) { (Get-Content $metrics | Measure-Object -Line).Lines } else { 0 }
  $mins = [math]::Round(((Get-Date) - $started).TotalMinutes, 1)
  Write-Output "[done] $tag-s$seed exit=$code epochen=$epochs $mins min"
  if ($code -ne 0 -or $epochs -lt $Epochs) {
    Write-Error "Sweep stopped after failed/incomplete run $tag-s$seed. Inspect $out.log before restarting."
    exit 1
  }
}
Write-Output "sweep fertig $(Get-Date -Format 'HH:mm:ss')"
