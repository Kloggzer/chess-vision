param(
    [int[]]$Seeds = @(42, 43, 44),
    [int]$Epochs = 60,
    [string]$Prefix = 'data/models/augval'
)
# Risk 6 of the handoff: three seeds, one val split, three arms — eager, the compiled augmentation
# alone, and both compilers. Grouped by seed so an interrupted sweep leaves complete triples.
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$spike = Join-Path $project 'tmp/compile-spike'
$python = Join-Path $spike '.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $python)) { throw 'Install the spike environment first (docs/training-stack-spike.md).' }
$arms = @(
    @{ name = 'eager'; extra = @() },
    @{ name = 'aug';   extra = @('--compile-batch-aug') },
    @{ name = 'both';  extra = @('--compile-batch-aug', '--compile-model') }
)
Push-Location $project
try {
    foreach ($seed in $Seeds) {
        foreach ($arm in $arms) {
            $out = "$Prefix-$($arm.name)-s$seed"
            if (Test-Path -LiteralPath $out) { Write-Host "[skip] $out"; continue }
            $env:PYTHONPATH = 'src'
            $env:OPENBLAS_NUM_THREADS = '1'
            $env:CC = Join-Path $spike '.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe'
            $env:MIOPEN_USER_DB_PATH = Join-Path $spike 'miopen-db'
            $env:MIOPEN_CUSTOM_CACHE_DIR = Join-Path $spike 'miopen-cache'
            # Per-arm compiler caches: a shared one lets an earlier arm colour this one's timing.
            $env:TORCHINDUCTOR_CACHE_DIR = Join-Path $project "tmp/augval-cache/inductor-$($arm.name)"
            $env:TRITON_CACHE_DIR = Join-Path $project "tmp/augval-cache/triton-$($arm.name)"
            $env:TORCHINDUCTOR_COMPILE_THREADS = '1'
            Write-Host "[run] $out  $(Get-Date -Format HH:mm:ss)"
            $ErrorActionPreference = 'Continue'
            & $python -u -m chesslab.cli train `
                --dataset real13-mix-v6-80 --split split-pin.json `
                --backbone boardattn:cellnet_p4 --no-pretrained `
                --head occlusion --norm batchnorm `
                --epochs $Epochs --epoch-frac 0.35 --batch-size 256 `
                --lr 0.01 --weight-cap 3 --seed $seed --patience $Epochs `
                --num-workers 2 --batch-aug --out $out @($arm.extra) > "$out.log" 2>&1
            $code = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'
            $rows = if (Test-Path -LiteralPath "$out/metrics.jsonl") { (Get-Content "$out/metrics.jsonl").Count } else { 0 }
            Write-Host "[done] $out rc=$code epochs=$rows  $(Get-Date -Format HH:mm:ss)"
            if ($code -ne 0 -and $rows -lt $Epochs) { throw "$out exited with $code after $rows epochs" }
        }
    }
} finally { Pop-Location }
