param(
    [int[]]$Seeds = @(42, 43, 44),
    [int]$Epochs = 60,
    [double]$EpochFrac = 0.35,
    [int]$Workers = 8,
    [string]$Prefix = 'data/models/stack-ab'
)
# Paired A/B of the pinned stack against tmp/compile-spike on the p4a-v6-s42 recipe: one run at a
# time, seeds paired so an interrupted sweep still leaves complete pairs behind.
$ErrorActionPreference = 'Stop'
$project = Split-Path $PSScriptRoot -Parent
$spike = Join-Path $project 'tmp/compile-spike'
$arms = @(
    @{ name = 'old'; python = Join-Path $project '.venv/Scripts/python.exe'; spike = $false },
    @{ name = 'new'; python = Join-Path $spike '.venv/Scripts/python.exe'; spike = $true }
)
Push-Location $project
try {
    foreach ($seed in $Seeds) {
        foreach ($arm in $arms) {
            $out = "$Prefix-$($arm.name)-s$seed"
            if (Test-Path -LiteralPath $out) { Write-Host "[skip] $out"; continue }
            $env:PYTHONPATH = 'src'
            $env:OPENBLAS_NUM_THREADS = '1'
            if ($arm.spike) {
                $env:CC = Join-Path $spike '.venv/Lib/site-packages/triton/runtime/tcc/tcc.exe'
                $env:MIOPEN_USER_DB_PATH = Join-Path $spike 'miopen-db'
                $env:MIOPEN_CUSTOM_CACHE_DIR = Join-Path $spike 'miopen-cache'
            } else {
                foreach ($n in 'CC', 'MIOPEN_USER_DB_PATH', 'MIOPEN_CUSTOM_CACHE_DIR') {
                    Remove-Item "Env:$n" -ErrorAction SilentlyContinue
                }
            }
            Write-Host "[run] $out  $(Get-Date -Format HH:mm:ss)"
            # Torch warns on stderr; under 'Stop' PowerShell 5.1 turns that into a terminating
            # NativeCommandError and the sweep dies before its first epoch.
            $ErrorActionPreference = 'Continue'
            & $arm.python -u -m chesslab.cli train `
                --dataset real13-mix-v6-80 --split split-pin.json `
                --backbone boardattn:cellnet_p4 --no-pretrained `
                --head occlusion --norm batchnorm `
                --epochs $Epochs --epoch-frac $EpochFrac --batch-size 256 `
                --lr 0.01 --weight-cap 3 --seed $seed --patience $Epochs `
                --num-workers $Workers --out $out > "$out.log" 2>&1
            $code = $LASTEXITCODE
            $ErrorActionPreference = 'Stop'
            $rows = if (Test-Path -LiteralPath "$out/metrics.jsonl") { (Get-Content "$out/metrics.jsonl").Count } else { 0 }
            Write-Host "[done] $out rc=$code epochs=$rows  $(Get-Date -Format HH:mm:ss)"
            # A wedged teardown must not cost the sweep the runs behind it: the epochs on disk
            # decide, not the exit code.
            if ($code -ne 0 -and $rows -lt $Epochs) { throw "$out exited with $code after $rows epochs" }
        }
    }
} finally { Pop-Location }
