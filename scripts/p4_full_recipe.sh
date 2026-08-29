#!/usr/bin/env bash
# `p4`/`p4a` mit dem Rezept der Champions statt dem nackten Leiter-Rezept.
# Was dazukommt: erase 0.5 (dein verstaerktes Cutout) und VOLLE Epochen statt 0,35 —
# also 2,9x mehr Gradientenschritte. Was fehlt: der Warmstart, den ein CellNet-Trunk nicht
# aus einem MobileNet-Pretrain erben kann, und die Sampler-Balance, die auf Brettern
# strukturell nicht greift (gemessen: 53,97 % -> 55,14 % empty).
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${P4F_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t p4full-XXXXXX).sh; cp "$self" "$snap"
  export P4F_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
D=data/models/_arch/real13-mix-v4-128
LOG=$D/p4full.log
FLAGS="--dataset real13-mix-v4-128 --head occlusion --norm batchnorm --epochs 60 --patience 60 \
 --sched cosine --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 --erase-p 0.5 \
 --balance none --weight-cap 3 --no-pretrained --no-empty-cap --epoch-frac 1.0 \
 --seed 42 --lr 0.01 --num-workers 5"

for f in data/inbox/heavy-A.lock data/inbox/heavy-B.lock; do :; done
for _ in $(seq 1 480); do
  [ ! -f data/inbox/heavy-A.lock ] && [ ! -f data/inbox/heavy-B.lock ] && break
  sleep 30
done
run() {  # arm slot backbone
  echo "=== $(date +%H:%M:%S) $1 auf Slot $2" | tee -a "$LOG"
  CHESSLAB_TRAIN_SLOT=$2 uv run chesslab train --backbone "$3" --out "$D/$1-s42" $FLAGS \
    >> "$D/$1-s42.log" 2>&1
  rc=$?
  ep=$(wc -l < "$D/$1-s42/metrics.jsonl" 2>/dev/null || echo 0)
  [ "$rc" = "0" ] || echo "[FAIL] $1 exit=$rc nach $ep Epochen" | tee -a "$LOG" "$D/FEHLER.txt"
  [ "$rc" = "0" ] && uv run chesslab eval --run "$D/$1-s42" --split val \
    --dataset real13-mix-v4-128 >> "$D/$1-s42.log" 2>&1
  echo "   $1 fertig rc=$rc $(date +%H:%M:%S)" | tee -a "$LOG"
}
run p4-full A cellnet_p4 &
run p4a-full B boardattn:cellnet_p4 &
wait
uv run python scripts/sweep_report.py --dir "$D" | tee -a "$LOG"
