#!/usr/bin/env bash
# run_v4bn1.sh with groupnorm — the missing cell of the matrix.
#
# The champion occ-v4-f3e20 is a MULTI-SCALE run, and multi-scale turned out to cost batchnorm
# 275 phantoms (49/275 with --scales, 88/1 without; 293 vs 2 phantoms at a matched 43 misses).
# What it buys is inference at a reduced input size, which the app never does — it always feeds
# 128. Against blurry SOURCES, which is the real case, both norms are already flat: GroupNorm
# 43/0 at a 128 px source and 47/0 at 32 px upscaled.
#
# So the champion may be paying for an augmentation nobody collects. Same three stages, same
# seed, groupnorm, no --scales — directly comparable to occ-v4bn1-f3.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v4gn1-chain.log
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo "v4-gn1 (single scale) chain started $(date)" > "$LOG"
BASE="--backbone mobilenetv4_conv_small_035 --norm groupnorm --batch-size 256 \
      --loss ce --num-workers 4 --seed 42"

run uv run chesslab train --dataset p1v4 --out data/models/occ-v4gn1-p1 --epochs 20 --lr 3e-4 $BASE
run uv run chesslab train --dataset p2v4 --out data/models/occ-v4gn1-p2 --resume occ-v4gn1-p1 \
    --epochs 20 --lr 1e-4 $BASE
run uv run chesslab train --dataset occ-real3 --out data/models/occ-v4gn1-f3 --resume occ-v4gn1-p2 \
    --epochs 20 --lr 3e-5 $BASE
run uv run chesslab eval --run data/models/occ-v4gn1-f3 --split test

echo -e "\nv4-gn1 finished $(date)" >> "$LOG"
touch data/models/.v4gn1-done
