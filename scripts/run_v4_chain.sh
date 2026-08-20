#!/usr/bin/env bash
# v4: renders matched to the real camera — res 1300 gives 95 px/square against its measured 97,
# and max-obliqueness 0.10 makes the synthetic perspective spread just enclose the real one
# (p95 1.048 vs 1.041). The old default 0.20 was more than twice as oblique as anything the
# fixed rig produces, so 70% of frames trained poses that never occur.
#
# Stage 2 is run at BOTH lengths and both are carried to a finetune, because the one comparison
# available so far was an accident: a stage 2 that crashed at epoch 5 beat the full 20 on misses
# (67 vs 85), and misses are the expensive direction.
cd "C:/Users/mariu/project/chess-vision" || exit 1
LOG=data/models/v4-chain.log
B="/c/Program Files/Blender Foundation/Blender 5.1/blender.exe"
step() { echo -e "\n=== $(date +%H:%M:%S)  $* ===" >> "$LOG"; }
run() { step "$*"; "$@" >> "$LOG" 2>&1; echo "exit=$? :: $*" >> "$LOG"; }

echo "v4 chain started $(date)" > "$LOG"

rm -rf data/synth_p1_v4 data/synth_p2_v4
mkdir -p data/synth_p1_v4 data/synth_p2_v4
run "$B" --background "synth/assets/Chess Scene.blend" --python synth/render_board_v2.py -- \
    --out data/synth_p1_v4 --n 3000 --seed 101 --res 1300 --max-obliqueness 0.10 \
    --pieces synth_pieces --board-texture synth_pieces/board_texture_v2.png \
    --fens data/fens_p1.txt --isolate-p 1.0 --occlusion-p 0.15
run "$B" --background "synth/assets/Chess Scene.blend" --python synth/render_board_v2.py -- \
    --out data/synth_p2_v4 --n 6000 --seed 202 --res 1300 --max-obliqueness 0.10 \
    --pieces synth_pieces --board-texture synth_pieces/board_texture_v2.png \
    --fens data/fens_p2.txt --occlusion-p 0.35 --borderless-p 0.12

run uv run chesslab dataset build-synth p1v4 --renders data/synth_p1_v4 \
    --classes occupancy --cap 8 --workers 1
run uv run chesslab dataset build-synth p2v4 --renders data/synth_p2_v4 \
    --classes occupancy --cap 8 --workers 1

BASE="--backbone mobilenetv4_conv_small_035 --norm groupnorm --batch-size 256 \
      --scales 32,64,96,128 --loss ce --num-workers 4 --seed 42"

run uv run chesslab train --dataset p1v4 --out data/models/occ-v4-p1 \
    --epochs 20 --lr 3e-4 $BASE

for E in 6 20; do
  run uv run chesslab train --dataset p2v4 --out data/models/occ-v4-p2e$E --resume occ-v4-p1 \
      --epochs $E --lr 1e-4 $BASE
  run uv run chesslab train --dataset occ-real3 --out data/models/occ-v4-f3e$E \
      --resume occ-v4-p2e$E --epochs 20 --lr 3e-5 $BASE
  run uv run chesslab eval --run data/models/occ-v4-f3e$E --split test
done
run uv run chesslab eval --run data/models/occ-r3s-f3 --split test

echo -e "\nv4 chain finished $(date)" >> "$LOG"
touch data/models/.v4-chain-done
