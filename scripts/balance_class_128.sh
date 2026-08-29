#!/usr/bin/env bash
# Ein Knopf gegen p4-full auf 128 px: --balance class statt none. Alle uebrigen Flags sind aus
# der config.json von p4-full-s42 uebernommen, weight_cap bleibt 3 — `balance` steuert den
# Sampler, `weight_cap` die Verlustgewichte, das sind zwei getrennte Schalter.
#
# Zweiter Arm mit Kopf, damit die Frage auch fuer p4a beantwortet ist. Beide gleichzeitig,
# also sehen sie dieselbe Maschinenlast wie das Paar, gegen das sie gemessen werden.
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${BC_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t balcls-XXXXXX).sh
  cp "$self" "$snap"; export BC_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi

export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

DATASET=real13-mix-v4-128
D=data/models/_arch/$DATASET
LOG=$D/balance-class.log
FLAGS="--dataset $DATASET --head occlusion --norm batchnorm --epochs 60 --patience 60 \
 --sched cosine --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 --erase-p 0.5 \
 --balance class --weight-cap 3 --no-pretrained --no-empty-cap --epoch-frac 1.0 \
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

arm p4-full-bcls  A cellnet_p4 &
arm p4a-full-bcls B boardattn:cellnet_p4 &
wait
echo "--- balance-class-Paar durch $(date +%H:%M:%S)" | tee -a "$LOG"
