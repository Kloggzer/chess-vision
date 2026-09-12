<#
.SYNOPSIS
  Phase 3 der 99-%-Kampagne: zwei Arme x sieben Seeds, gepaart, ein Prozess.

  Seed aussen, damit jeder Durchgang ein VOLLSTAENDIGES Paar liefert - ein Abbruch laesst dann
  ganze Paare zurueck und nicht einen Arm im Vorsprung. 128 px laeuft sequenziell: zwei Laeufe
  gleichzeitig sind am 2026-09-11 beide an `--ram-reserve-gb` gestorben.
#>
param(
  [string]$Dataset = "real13-mix-v7-128",
  [string]$OutRoot = "data/models/_acc128v7",
  [string[]]$Seeds = @('42', '43', '44', '45', '46', '47', '48'),
  [int]$Epochs = 60,
  [string]$Split = "split-pin.json",
  # Gemessen: der Start braucht mehr als die Reserve selbst, weil Manifest und Sampler zuerst
  # aufgebaut werden. 8 GB haben gereicht, 3,67 nicht.
  # Welche Arme, nach Kurzname. Der Aufloesungsvergleich braucht nur den Gewinner.
  [string[]]$Arms = @("p4a", "rot"),
  [double]$MinFreeGb = 8.0,
  [int]$RamWaitMax = 3600
)

$ErrorActionPreference = 'Continue'
$env:OPENBLAS_NUM_THREADS = 1
$env:CC = (Resolve-Path ".venv\Lib\site-packages\triton\runtime\tcc\tcc.exe").Path
$env:CHESSLAB_TRAIN_SLOT = "A"

# Der Arm IST das Rezept: Name, Backbone, und was ihn vom anderen unterscheidet.
# `$armTable`, nicht `$arms`: PowerShell unterscheidet bei Variablennamen Gross- und
# Kleinschreibung NICHT, und `$arms` ueberschrieb damit den Parameter `$Arms`, bevor er gelesen war.
$armTable = @(
  [pscustomobject]@{ Tag = "p4a"; Backbone = "boardattn:cellnet_p4"; Extra = @() },
  [pscustomobject]@{ Tag = "rot"; Backbone = "boardattn:cellnet_p4"; Extra = @("--rot90", "--hflip-p", "0.5") },
  # Die Ablation: `rot` aenderte ZWEI Parameter zusammen und testet damit das Paket, nicht den
  # Anteil. Diese beiden trennen es - gegen dieselben Seeds von `p4a` und `rot`.
  [pscustomobject]@{ Tag = "r90"; Backbone = "boardattn:cellnet_p4"; Extra = @("--rot90") },
  [pscustomobject]@{ Tag = "hfl"; Backbone = "boardattn:cellnet_p4"; Extra = @("--hflip-p", "0.5") },
  # A1: die Zelle bleibt 2x2 aufgeloest, statt zu einem Vektor gemittelt zu werden. Auf dem
  # GEWINNENDEN Rezept, nicht auf der Baseline - die Frage ist, ob es oben drauf noch etwas holt.
  # +0,148 MMAC/Crop gegen `rot`, also rund 0,4 ms je Session auf dem SM8650.
  [pscustomobject]@{ Tag = "g2"; Backbone = "boardattn:cellnet_p4g2"; Extra = @("--rot90", "--hflip-p", "0.5") },
  # Dasselbe A1 OHNE Augmentierung. Auf dem Gewinner-Rezept liegt der Arm bei 0,9988 und hat
  # keinen Spielraum mehr - ein Deckeneffekt wuerde einen echten Beitrag verstecken. Die Kontrolle
  # dafuer ist `p4a`, das mit sieben Seeds vorliegt.
  [pscustomobject]@{ Tag = "g2n"; Backbone = "boardattn:cellnet_p4g2"; Extra = @() }
)

# `powershell -File` reicht eine Komma-Liste als EIN Element durch. Bei `-Arms` landete der
# zweite Arm sonst im Namen des ersten, bei `-Seeds` wurde aus 42,43,44 der eine Seed 424344 und
# die halbe Warteschlange lief mit 0 Epochen durch.
$Seeds = @($Seeds | ForEach-Object { "$_" -split ',' } | Where-Object { $_ } | ForEach-Object { [int]$_ })
$want = @($Arms | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$armTable = @($armTable | Where-Object { $want -contains $_.Tag })
if (-not $armTable) { Write-Error "keine bekannten Arme in: $($want -join ',')"; exit 1 }

New-Item -ItemType Directory -Force $OutRoot | Out-Null
Write-Output "kampagne: $($armTable.Count) Arme x $($Seeds.Count) Seeds auf $Dataset"

foreach ($seed in $Seeds) {
  foreach ($arm in $armTable) {
    $out = Join-Path $OutRoot "$($arm.Tag)-s$seed"
    $metrics = Join-Path $out "metrics.jsonl"
    if (Test-Path $metrics) {
      $done = (Get-Content $metrics | Measure-Object -Line).Lines
      if ($done -ge $Epochs) { Write-Output "[skip] $($arm.Tag)-s$seed ($done Epochen da)"; continue }
      $parked = "$out.partial-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
      Write-Output "[redo] $($arm.Tag)-s$seed hat nur $done von $Epochs -> $parked"
      Move-Item $out $parked
    }
    # Der Lauf stirbt an `--ram-reserve-gb`, wenn beim Start etwas anderes den Speicher haelt --
    # ein offenes WizTree kostete 4 GB und toetete das erste Paar in 2 Minuten. Warten ist billiger
    # als ein verlorener Slot: 14 Laeufe sind 10 Stunden, die niemand nachts nachholt.
    $waitedRam = 0
    while ((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB -lt $MinFreeGb) {
      if ($waitedRam -ge $RamWaitMax) { Write-Error "RAM bleibt unter $MinFreeGb GB - Abbruch."; exit 1 }
      if ($waitedRam % 300 -eq 0) {
        Write-Output ("[warte] nur {0:N1} GB frei, brauche {1} - seit {2} min" -f `
          ((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory / 1MB), $MinFreeGb, ($waitedRam / 60))
      }
      Start-Sleep -Seconds 30
      $waitedRam += 30
    }
    $env:TORCHINDUCTOR_CACHE_DIR = (New-Item -ItemType Directory -Force "data/tmp/inductor/$($arm.Tag)").FullName
    $env:TRITON_CACHE_DIR = (New-Item -ItemType Directory -Force "data/tmp/triton/$($arm.Tag)").FullName
    $started = Get-Date
    Write-Output "[run ] $($arm.Tag)-s$seed  $(Get-Date -Format 'HH:mm:ss')"
    uv run chesslab train --backbone $arm.Backbone --no-pretrained --dataset $Dataset --split $Split `
      --out $out --epochs $Epochs --batch-size 256 --lr 0.01 --sched cosine `
      --weight-decay 0.01 --head occlusion --seed $seed --low-memory --ram-reserve-gb 4 `
      --patience 999 --num-workers 2 --epoch-frac 0.35 --weight-cap 3.0 `
      --board-width 128 --board-layers 2 @($arm.Extra) `
      --batch-aug --compile-batch-aug --compile-model --fused-adamw *> "$out.log"
    $epochs = if (Test-Path $metrics) { (Get-Content $metrics | Measure-Object -Line).Lines } else { 0 }
    Write-Output ("[done] {0}-s{1} epochen={2} {3:N1} min" -f $arm.Tag, $seed, $epochs, ((Get-Date) - $started).TotalMinutes)
    # Nicht weiterlaufen: ein gescheiterter Lauf wiederholt sich in aller Regel, und 13 leere
    # Slots sehen im Log aus wie eine gelaufene Kampagne.
    if ($epochs -lt $Epochs) {
      Write-Error "$($arm.Tag)-s$seed hat nur $epochs von $Epochs Epochen. Siehe $out.log"
      exit 1
    }
  }
  Write-Output "=== Seed ${seed}: Paar vollstaendig ==="
}
Write-Output "kampagne fertig $(Get-Date -Format 'HH:mm:ss')"
