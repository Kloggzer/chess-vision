#!/usr/bin/env bash
# The same v4 data, trained with BATCHNORM end to end.
#
# groupnorm in the shipped recipe is a ROCm workaround, not a modelling choice: MIOpen's
# BatchNorm kernel fails on this machine. On the DEVICE the trade is the other way round —
# BatchNorm folds into the convolution at export, groupnorm leaves InstanceNormalization ops
# that XNNPACK will not claim and the NPU cannot partition.
#
# All three stages use the same norm. Mixing is what collapsed occ-r3bn-f3 and occ-r3sbn-f3:
# they resumed a batchnorm run from a groupnorm pretrain, and the norm conversion removes timm's
# activations, so the architectures are not the same network.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v4bn-chain.log
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo "v4-bn chain started $(date)" > "$LOG"
BASE="--backbone mobilenetv4_conv_small_035 --norm batchnorm --batch-size 256 \
      --scales 32,64,96,128 --loss ce --num-workers 4 --seed 42"

run uv run chesslab train --dataset p1v4 --out data/models/occ-v4bn-p1 --epochs 20 --lr 3e-4 $BASE
run uv run chesslab train --dataset p2v4 --out data/models/occ-v4bn-p2 --resume occ-v4bn-p1 \
    --epochs 20 --lr 1e-4 $BASE
run uv run chesslab train --dataset occ-real3 --out data/models/occ-v4bn-f3 --resume occ-v4bn-p2 \
    --epochs 20 --lr 3e-5 $BASE
run uv run chesslab eval --run data/models/occ-v4bn-f3 --split test

echo -e "\nv4-bn finished $(date)" >> "$LOG"
touch data/models/.v4bn-done
