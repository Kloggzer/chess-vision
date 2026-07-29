#!/usr/bin/env bash
# run_v4_bn.sh, minus --scales: BatchNorm trained at ONE resolution.
#
# The multi-scale flag resizes the whole batch to a random size per step (train.py:386), so one
# set of running_mean/var has to serve four activation regimes. Measured on occ-v4bn-f3 with its
# frozen statistics: at 32 px it calls all 1715 occupied squares empty, at 64 px 710 of them,
# while the groupnorm twin degrades to 227/39. Re-measuring the statistics at a single resolution
# alone took the same weights from 49 misses / 275 phantoms to 26 / 149 — this run asks what
# happens when the statistics never have to average over resolutions in the first place.
#
# Everything else is identical to run_v4_bn.sh so the comparison is the norm and the scales only.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v4bn1-chain.log
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo "v4-bn1 (single scale) chain started $(date)" > "$LOG"
BASE="--backbone mobilenetv4_conv_small_035 --norm batchnorm --batch-size 256 \
      --loss ce --num-workers 4 --seed 42"

run uv run chesslab train --dataset p1v4 --out data/models/occ-v4bn1-p1 --epochs 20 --lr 3e-4 $BASE
run uv run chesslab train --dataset p2v4 --out data/models/occ-v4bn1-p2 --resume occ-v4bn1-p1 \
    --epochs 20 --lr 1e-4 $BASE
run uv run chesslab train --dataset occ-real3 --out data/models/occ-v4bn1-f3 --resume occ-v4bn1-p2 \
    --epochs 20 --lr 3e-5 $BASE
run uv run chesslab eval --run data/models/occ-v4bn1-f3 --split test

echo -e "\nv4-bn1 finished $(date)" >> "$LOG"
touch data/models/.v4bn1-done
