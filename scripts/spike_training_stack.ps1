param(
    [ValidateSet('profile', 'feed', 'train')][string]$Mode = 'profile',
    [switch]$CompileModel,
    [switch]$CompileBatchAug,
    [int]$Steps = 240,
    [string]$Workers = '6,8,12',
    [int]$Epochs = 2,
    [double]$EpochFrac = 0.05,
    [string]$Out = 'tmp/compile-spike/train-smoke'
)
# Run an already installed experimental environment; never modify the main venv.
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$spike = Join-Path $project 'tmp/compile-spike'
$python = Join-Path $spike '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Install the spike environment documented in docs/training-speed.md first.' }
$names = @('PATH', 'PYTHONPATH', 'OPENBLAS_NUM_THREADS', 'CC', 'TORCHINDUCTOR_CACHE_DIR',
           'TRITON_CACHE_DIR', 'MIOPEN_USER_DB_PATH', 'MIOPEN_CUSTOM_CACHE_DIR', 'TORCHINDUCTOR_COMPILE_THREADS')
$previous = @{}
foreach ($name in $names) { $previous[$name] = [Environment]::GetEnvironmentVariable($name, 'Process') }
Push-Location $project
try {
    $env:PATH = "$(Split-Path $python -Parent);$env:PATH"
    $env:PYTHONPATH = Join-Path $project 'src'
    $env:OPENBLAS_NUM_THREADS = '1'
    $env:CC = Join-Path $spike '.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe'
    $env:TORCHINDUCTOR_CACHE_DIR = Join-Path $spike 'inductor'
    $env:TRITON_CACHE_DIR = Join-Path $spike 'triton-cache'
    $env:MIOPEN_USER_DB_PATH = Join-Path $spike 'miopen-db'
    $env:MIOPEN_CUSTOM_CACHE_DIR = Join-Path $spike 'miopen-cache'
    $env:TORCHINDUCTOR_COMPILE_THREADS = '1'
    if ($Mode -eq 'profile') {
        & $python -u scripts/profile_training_gpu.py --fixture tmp/compile-spike/baseline.pt --compile-test --steps $Steps --output tmp/compile-spike/profile-isolated.json
    } elseif ($Mode -eq 'train') {
        $extra = @()
        if ($CompileModel) { $extra += '--compile-model' }
        if ($CompileBatchAug) { $extra += '--compile-batch-aug' }
        & $python -u -m chesslab.cli train --dataset real13-mix-v6-80 --backbone boardattn:cellnet_p4 `
            --head occlusion --norm batchnorm --board-width 128 --board-layers 2 `
            --epochs $Epochs --epoch-frac $EpochFrac --batch-size 256 --lr 0.01 --seed 42 `
            --num-workers 2 --eval-workers 2 --channels-last --batch-aug --out $Out @extra
    } else {
        $extra = @()
        if ($CompileModel) { $extra += '--compile-model' }
        $suffix = if ($CompileModel) { 'compiled' } else { 'eager' }
        & $python -u scripts/benchmark_training_feed.py --gpu --channels-last --workers $Workers --steps $Steps --output "tmp/compile-spike/feed-$suffix.json" @extra
    }
    if ($LASTEXITCODE -ne 0) { throw "Spike exited with code $LASTEXITCODE" }
} finally {
    foreach ($name in $names) { [Environment]::SetEnvironmentVariable($name, $previous[$name], 'Process') }
    Pop-Location
}
