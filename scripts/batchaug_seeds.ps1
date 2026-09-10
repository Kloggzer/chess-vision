param(
    [int[]]$Seeds = @(42, 43, 44),
    [int]$Epochs = 60,
    [string]$Prefix = 'data/models/ba-c-s'
)
# The batch-aug candidate over seeds, on the spike stack: compiled forward, two workers (measured
# equal to eight once the augmentation left the CPU). One run at a time.
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$spike = Join-Path $project 'tmp/compile-spike'
$python = Join-Path $spike '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Install the spike environment first (docs/training-stack-spike.md).' }
Push-Location $project
try {
    $env:PYTHONPATH = 'src'
    $env:OPENBLAS_NUM_THREADS = '1'
    $env:CC = Join-Path $spike '.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe'
    $env:MIOPEN_USER_DB_PATH = Join-Path $spike 'miopen-db'
    $env:MIOPEN_CUSTOM_CACHE_DIR = Join-Path $spike 'miopen-cache'
    $env:TORCHINDUCTOR_CACHE_DIR = Join-Path $spike 'inductor'
    $env:TRITON_CACHE_DIR = Join-Path $spike 'triton-cache'
    $env:TORCHINDUCTOR_COMPILE_THREADS = '1'
    foreach ($seed in $Seeds) {
        $out = "$Prefix$seed"
        if (Test-Path -LiteralPath $out) { Write-Host "[skip] $out"; continue }
        Write-Host "[run] $out  $(Get-Date -Format HH:mm:ss)"
        $ErrorActionPreference = 'Continue'
        & $python -u -m chesslab.cli train `
            --dataset real13-mix-v6-80 --split split-pin.json `
            --backbone boardattn:cellnet_p4 --no-pretrained `
            --head occlusion --norm batchnorm `
            --epochs $Epochs --epoch-frac 0.35 --batch-size 256 `
            --lr 0.01 --weight-cap 3 --seed $seed --patience $Epochs `
            --num-workers 2 --batch-aug --compile-model --out $out > "$out.log" 2>&1
        $code = $LASTEXITCODE
        $ErrorActionPreference = 'Stop'
        $rows = if (Test-Path -LiteralPath "$out/metrics.jsonl") { (Get-Content "$out/metrics.jsonl").Count } else { 0 }
        Write-Host "[done] $out rc=$code epochs=$rows  $(Get-Date -Format HH:mm:ss)"
        if ($code -ne 0 -and $rows -lt $Epochs) { throw "$out exited with $code after $rows epochs" }
    }
} finally { Pop-Location }
