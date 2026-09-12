<#
.SYNOPSIS
  Die 128er-Serie sequenziell: zwei angefangene Laeufe fortsetzen, dann die restlichen vier.

  Ein Slot, nicht zwei. Zwei parallele 128er hielten fuenf Epochen lang die Zahlen (1,53x
  Durchsatz) und starben dann bei Epoche 48 bzw. 58 an der RAM-Reserve — der 38,5-GiB-Pack
  passt nicht zweimal in 31,8 GB, der Druck baut sich ueber die Epochen auf.
#>
$ErrorActionPreference = 'Continue'
$env:OPENBLAS_NUM_THREADS = 1
$env:CC = (Resolve-Path ".venv\Lib\site-packages\triton\runtime\tcc\tcc.exe").Path
$env:CHESSLAB_TRAIN_SLOT = "A"
$root = "data/models/_arch128v6"

function Invoke-Run($tag, $seed, $extra, $continue) {
  $out = "$root/$tag-s$seed"
  $metrics = "$out/metrics.jsonl"
  if ((Test-Path $metrics) -and (Get-Content $metrics | Measure-Object -Line).Lines -ge 60) {
    Write-Output "[skip] $tag-s$seed"; return
  }
  $env:TORCHINDUCTOR_CACHE_DIR = (New-Item -ItemType Directory -Force "data/tmp/inductor/$tag-A").FullName
  $env:TRITON_CACHE_DIR = (New-Item -ItemType Directory -Force "data/tmp/triton/$tag-A").FullName
  $started = Get-Date
  Write-Output "[run ] $tag-s$seed $(if ($continue) { '(fortsetzen)' }) $(Get-Date -Format 'HH:mm:ss')"
  $args = @("train", "--backbone", "boardattn:cellnet_p4", "--no-pretrained",
            "--dataset", "real13-mix-v6-128", "--split", "split-pin.json", "--out", $out,
            "--epochs", "60", "--batch-size", "256", "--lr", "0.01", "--sched", "cosine",
            "--weight-decay", "0.01", "--head", "occlusion", "--seed", "$seed",
            "--low-memory", "--ram-reserve-gb", "4", "--patience", "999", "--num-workers", "2",
            "--epoch-frac", "0.35", "--weight-cap", "3.0",
            "--batch-aug", "--compile-batch-aug", "--compile-model", "--fused-adamw")
  if ($continue) { $args += "--continue" }
  if ($extra) { $args += ($extra -split ' ' | Where-Object { $_ }) }
  & uv run chesslab @args *> "$out.log"
  $n = if (Test-Path $metrics) { (Get-Content $metrics | Measure-Object -Line).Lines } else { 0 }
  Write-Output ("[done] {0}-s{1} exit={2} epochen={3} {4:N1} min" -f $tag, $seed, $LASTEXITCODE, $n, ((Get-Date) - $started).TotalMinutes)
}

Invoke-Run "p4a" 42 "" $true
Invoke-Run "p4a" 43 "" $true
Invoke-Run "p4a" 44 "" $false
foreach ($s in 42, 43, 44) { Invoke-Run "rot" $s "--rot90 --hflip-p 0.5" $false }
Write-Output "128er-Serie fertig $(Get-Date -Format 'HH:mm:ss')"
