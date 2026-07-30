#!/usr/bin/env bash
# The whole chain trained for the resolution we intend to SHIP, not for four of them.
#
# Deploying at 64 px works on the current model (9 misses / 0 phantoms on the real serving path
# at the val-chosen threshold, against 14 at 128) but its MARGIN is thin: the five most
# confident empty val crops sit at 0.41-0.79, where at 128 px they sit below 0.12. Phantoms are
# the veto, so margin is the property that protects against material we have not seen.
#
# `--scales 48,64,80,96` keeps multi-scale (single-scale cost GroupNorm 82 misses against 43 and
# threw away resolution-agnosticism) but centres it on 64 and drops 128, which nothing will run.
# An UNTRAINED size fails silently — 80 px once cost 133 misses — so every size we might serve
# has to be in this list.
#
# Real stage is occ-real5nd: phash dedup OFF. That single change took 32 misses to 12; the 54.8%
# it used to discard were never pixel-identical, only dhash-identical.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v6-lowres.log
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo "v6 low-res chain started $(date)" > "$LOG"
BASE="--backbone mobilenetv4_conv_small_035 --norm groupnorm --batch-size 256 \
      --scales 48,64,80,96 --loss ce --num-workers 4 --seed 42"

run uv run chesslab train --dataset p1v4 --out data/models/occ-v6-p1 --epochs 20 --lr 3e-4 $BASE
run uv run chesslab train --dataset p2v4 --out data/models/occ-v6-p2 --resume occ-v6-p1 \
    --epochs 20 --lr 1e-4 $BASE
run uv run chesslab train --dataset occ-real5nd --out data/models/occ-v6-f5nd --resume occ-v6-p2 \
    --epochs 20 --lr 3e-5 $BASE
run uv run chesslab eval --run data/models/occ-v6-f5nd --split test

echo -e "\nv6 finished $(date)" >> "$LOG"
touch data/models/.v6-done
