#!/usr/bin/env bash
# p4-full und p4a-full bei 80 px — dasselbe Vollrezept wie bei 128 px (erase 0.5, epoch-frac 1.0).
# Beantwortet zwei offene Fragen auf einmal:
#   traegt der Kopf bei 80 px unter vollem Rezept noch? (bei 128 px tat er es nicht mehr)
#   schlaegt der kleine Trunk mit Vollrezept den grossen mit Leiter-Rezept (battn@80 = 0,9491)?
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${F80_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t f80-XXXXXX).sh; cp "$self" "$snap"
  export F80_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
D=data/models/_arch/real13-mix-v4
LOG=$D/full80.log
FLAGS="--dataset real13-mix-v4 --head occlusion --norm batchnorm --epochs 60 --patience 60 \
 --sched cosine --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 --erase-p 0.5 \
 --balance none --weight-cap 3 --no-pretrained --no-empty-cap --epoch-frac 1.0 \
 --seed 42 --lr 0.01 --num-workers 5"

for _ in $(seq 1 480); do
  [ ! -f data/inbox/heavy-A.lock ] && [ ! -f data/inbox/heavy-B.lock ] && break
  sleep 30
done
run() {  # arm slot backbone
  [ -f "$D/$1-s42/metrics.jsonl" ] && [ "$(wc -l < "$D/$1-s42/metrics.jsonl")" -ge 60 ] \
    && { echo "== $1 fertig, uebersprungen" | tee -a "$LOG"; return 0; }
  echo "=== $(date +%H:%M) $1 auf Slot $2 ($3)" | tee -a "$LOG"
  CHESSLAB_TRAIN_SLOT=$2 uv run chesslab train --backbone "$3" --out "$D/$1-s42" $FLAGS \
    >> "$D/$1-s42.log" 2>&1
  rc=$?; ep=$(wc -l < "$D/$1-s42/metrics.jsonl" 2>/dev/null || echo 0)
  if [ "$rc" != "0" ]; then
    echo "[FAIL] $1 exit=$rc nach $ep Epochen" | tee -a "$LOG" "$D/FEHLER.txt"
    grep -E "Error|\[FAIL\]" "$D/$1-s42.log" 2>/dev/null | tail -3 | sed 's/^/       /' | tee -a "$D/FEHLER.txt"
    return 1
  fi
  uv run chesslab eval --run "$D/$1-s42" --split val --dataset real13-mix-v4 >> "$D/$1-s42.log" 2>&1 \
    || echo "[FAIL] $1: Auswertung fehlgeschlagen" | tee -a "$LOG" "$D/FEHLER.txt"
  echo "   $1 fertig $(date +%H:%M)" | tee -a "$LOG"
}
run p4-full  A cellnet_p4 &
run p4a-full B boardattn:cellnet_p4 &
wait
echo "80px-Vollrezept durch $(date +%H:%M)" | tee -a "$LOG"
