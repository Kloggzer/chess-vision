#!/usr/bin/env bash
# Stages 2 and 3 plus both evals. Stage 1 (occ-v3-p1) is already trained and in place.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v3-chain.log
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo -e "\n\n### resumed run $(date) — stages 2/3 + eval ###" >> "$LOG"

run uv run chesslab train --dataset p2v3 --out data/models/occ-v3-p2 --resume occ-v3-p1 \
    --backbone mobilenetv4_conv_small_035 --norm groupnorm \
    --epochs 20 --batch-size 256 --lr 1e-4 --scales 32,64,96,128 \
    --loss ce --num-workers 4 --seed 42

run uv run chesslab train --dataset occ-real3 --out data/models/occ-v3-f3 --resume occ-v3-p2 \
    --backbone mobilenetv4_conv_small_035 --norm groupnorm \
    --epochs 20 --batch-size 256 --lr 3e-5 --scales 32,64,96,128 \
    --loss ce --num-workers 4 --seed 42

run uv run chesslab eval --run data/models/occ-v3-f3 --split test
run uv run chesslab eval --run data/models/occ-r3s-f3 --split test

echo -e "\nrest finished $(date)" >> "$LOG"
touch data/models/.v3-chain-done
