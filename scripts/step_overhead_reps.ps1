param([int]$Epochs = 8, [int]$Reps = 2, [string]$Root = 'tmp/overhead')
# Levers 1 and 3 on top of the fastest measured arm: CUDA graphs against the remaining dispatch
# cost, fused AdamW against the GradScaler's per-step `found_inf.item()`. Two warm reps each.
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$spike = Join-Path $project 'tmp/compile-spike'
$python = Join-Path $spike '.venv/Scripts/python.exe'
$arms = @(
    @{ name = 'base';        extra = @() },
    @{ name = 'fused';       extra = @('--fused-adamw') },
    @{ name = 'graph';       extra = @('--compile-mode', 'reduce-overhead') },
    @{ name = 'graph-fused'; extra = @('--compile-mode', 'reduce-overhead', '--fused-adamw') }
)
Push-Location $project
try {
    New-Item -ItemType Directory -Force -Path $Root | Out-Null
    foreach ($rep in 1..$Reps) {
        foreach ($arm in $arms) {
            $out = "$Root/$($arm.name)-r$rep"
            if (Test-Path -LiteralPath "$out/metrics.jsonl") { Write-Host "[skip] $out"; continue }
            Remove-Item -Recurse -Force $out -ErrorAction SilentlyContinue
            $env:PYTHONPATH = 'src'
            $env:OPENBLAS_NUM_THREADS = '1'
            $env:CC = Join-Path $spike '.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe'
            $env:MIOPEN_USER_DB_PATH = Join-Path $spike 'miopen-db'
            $env:MIOPEN_CUSTOM_CACHE_DIR = Join-Path $spike 'miopen-cache'
            $env:TORCHINDUCTOR_CACHE_DIR = Join-Path $project "$Root/inductor-$($arm.name)"
            $env:TRITON_CACHE_DIR = Join-Path $project "$Root/triton-$($arm.name)"
            $env:TORCHINDUCTOR_COMPILE_THREADS = '1'
            $ErrorActionPreference = 'Continue'
            & $python -u -m chesslab.cli train --dataset real13-mix-v6-80 --split split-pin.json `
                --backbone boardattn:cellnet_p4 --no-pretrained --head occlusion --norm batchnorm `
                --epochs $Epochs --epoch-frac 0.35 --batch-size 256 --lr 0.01 --weight-cap 3 `
                --seed 42 --patience $Epochs --num-workers 2 --batch-aug --compile-batch-aug `
                --compile-model --out $out @($arm.extra) > "$out.log" 2>&1
            $code = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'
            Write-Host "[done] $($arm.name) rep$rep rc=$code  $(Get-Date -Format HH:mm:ss)"
        }
    }
} finally { Pop-Location }
