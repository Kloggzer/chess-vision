#!/usr/bin/env bash
# Ein Knopf: --vflip-p 0.5 ZUSAETZLICH zu hflip. Die Partner ohne vflip stehen schon
# (p4-s42, p4a-s42 im selben Verzeichnis), alle uebrigen Flags sind aus deren config.json
# uebernommen. Beide Arme gleichzeitig, damit sie dieselbe Maschinenlast sehen wie das Paar,
# gegen das sie gemessen werden.
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${VF_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t vflip-XXXXXX).sh
  cp "$self" "$snap"; export VF_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi

export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

DATASET=real13-mix-v4
D=data/models/_arch/$DATASET
LOG=$D/vflip.log
FLAGS="--dataset $DATASET --head occlusion --norm batchnorm --epochs 60 --patience 60 \
 --sched cosine --batch-size 256 --hflip-p 0.5 --vflip-p 0.5 --jitter-translate 0.10 \
 --balance none --weight-cap 3 --no-pretrained --no-empty-cap --epoch-frac 0.35 \
 --seed 42 --lr 0.01 --num-workers 5"

fail() { echo "[FAIL] $*" | tee -a "$LOG" "$D/FEHLER.txt"; }

arm() {   # arm slot backbone
  echo "=== $(date +%H:%M:%S) $1 auf Slot $2 ($3)" | tee -a "$LOG"
  CHESSLAB_TRAIN_SLOT=$2 uv run chesslab train --backbone "$3" --out "$D/$1-s42" $FLAGS \
    >> "$D/$1-s42.log" 2>&1
  rc=$?
  ep=$(wc -l < "$D/$1-s42/metrics.jsonl" 2>/dev/null || echo 0)
  if [ "$rc" != "0" ]; then
    fail "$1 ($3) BRACH AB mit exit=$rc nach $ep Epochen"
    grep -E "Error|\[FAIL\]" "$D/$1-s42.log" 2>/dev/null | tail -3 | sed 's/^/       /' | tee -a "$LOG" "$D/FEHLER.txt"
    return 1
  fi
  [ "$ep" -ge 60 ] || { fail "$1 endete mit exit=0, hat aber nur $ep von 60 Epochen"; return 1; }
  uv run chesslab eval --run "$D/$1-s42" --split val --dataset "$DATASET" \
    >> "$D/$1-s42.log" 2>&1 || fail "$1: Auswertung fehlgeschlagen, Training war ok"
  echo "   $1 fertig $(date +%H:%M:%S)" | tee -a "$LOG"
}

arm p4-vflip  A cellnet_p4 &
arm p4a-vflip B boardattn:cellnet_p4 &
wait
echo "--- vflip-Paar durch $(date +%H:%M:%S)" | tee -a "$LOG"
