#!/usr/bin/env bash
# `--out` is a DIRECTORY PATH (it defaults to data/models/run-<ts>), while `--resume` takes a
# run NAME resolved under data/models. Passing a bare name to --out writes the run into the repo
# root and the next stage's resume then cannot find it - which is exactly what happened on the
# first attempt, silently, with exit=0.
#
# One sequential pass: build the two v3 synth datasets, train isolate -> boards -> real,
# then evaluate the result next to the shipped model. ONE worker, nothing fans out.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v3-chain.log
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo "chain started $(date)" > "$LOG"

run uv run chesslab dataset build-synth p1v3 --renders data/synth_p1_v3 \
    --classes occupancy --cap 8 --workers 1
run uv run chesslab dataset build-synth p2v3 --renders data/synth_p2_v3 \
    --classes occupancy --cap 8 --workers 1

# Stage 1 - isolate: pieces on a randomised ground, no board to shortcut on.
run uv run chesslab train --dataset p1v3 --out data/models/occ-v3-p1 \
    --backbone mobilenetv4_conv_small_035 --norm groupnorm \
    --epochs 20 --batch-size 256 --lr 3e-4 --scales 32,64,96,128 \
    --loss ce --num-workers 4 --seed 42

# Stage 2 - boards: the same weights meet boards, occluders and shadows.
run uv run chesslab train --dataset p2v3 --out data/models/occ-v3-p2 --resume occ-v3-p1 \
    --backbone mobilenetv4_conv_small_035 --norm groupnorm \
    --epochs 20 --batch-size 256 --lr 1e-4 --scales 32,64,96,128 \
    --loss ce --num-workers 4 --seed 42

# Stage 3 - real: the fine-tune the whole chain exists for.
run uv run chesslab train --dataset occ-real3 --out data/models/occ-v3-f3 --resume occ-v3-p2 \
    --backbone mobilenetv4_conv_small_035 --norm groupnorm \
    --epochs 20 --batch-size 256 --lr 3e-5 --scales 32,64,96,128 \
    --loss ce --num-workers 4 --seed 42

# Both models on the same real holdout. Never judge either by val_acc - val is one session
# of near-identical frames and reads 1.0000 for every candidate.
run uv run chesslab eval --run data/models/occ-v3-f3 --split test
run uv run chesslab eval --run data/models/occ-r3s-f3 --split test

echo -e "\nchain finished $(date)" >> "$LOG"
touch data/models/.v3-chain-done
