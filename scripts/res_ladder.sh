#!/usr/bin/env bash
# Die fehlenden Zellen im Auflösungs-Raster, Leiter-Rezept (erase 0.25, epoch-frac 0.35).
#   Slot A: p4a bei 96 px  — die fehlende Aufloesung
#   Slot B: battn bei 80 px — ist ein groesserer Trunk bei 80 px besser als p4a (0,9306)?
# Laeuft aus einer Selbstkopie, damit Edits waehrend des Laufs folgenlos bleiben.
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${RES_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t res-XXXXXX).sh; cp "$self" "$snap"
  export RES_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
COMMON="--head occlusion --norm batchnorm --epochs 60 --patience 60 --sched cosine \
 --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 --balance none --weight-cap 3 \
 --no-pretrained --no-empty-cap --epoch-frac 0.35 --seed 42 --lr 0.01 --num-workers 5"

run() {  # name slot backbone dataset
  D=data/models/_arch/$4
  [ -f "$D/$1-s42/metrics.jsonl" ] && [ "$(wc -l < "$D/$1-s42/metrics.jsonl")" -ge 60 ] \
    && { echo "== $1 fertig, uebersprungen"; return 0; }
  mkdir -p "$D"
  echo "=== $(date +%H:%M) $1 auf Slot $2 ($3, $4)" | tee -a "$D/res.log"
  CHESSLAB_TRAIN_SLOT=$2 uv run chesslab train --backbone "$3" --dataset "$4" \
    --out "$D/$1-s42" $COMMON >> "$D/$1-s42.log" 2>&1
  rc=$?; ep=$(wc -l < "$D/$1-s42/metrics.jsonl" 2>/dev/null || echo 0)
  if [ "$rc" != "0" ]; then
    echo "[FAIL] $1 exit=$rc nach $ep Epochen" | tee -a "$D/res.log" "$D/FEHLER.txt"
    grep -E "Error|\[FAIL\]" "$D/$1-s42.log" 2>/dev/null | tail -3 | sed 's/^/       /' | tee -a "$D/FEHLER.txt"
    return 1
  fi
  uv run chesslab eval --run "$D/$1-s42" --split val --dataset "$4" >> "$D/$1-s42.log" 2>&1 \
    || echo "[FAIL] $1: Auswertung fehlgeschlagen" | tee -a "$D/res.log" "$D/FEHLER.txt"
  echo "   $1 fertig $(date +%H:%M)" | tee -a "$D/res.log"
}
for _ in $(seq 1 480); do
  [ ! -f data/inbox/heavy-A.lock ] && [ ! -f data/inbox/heavy-B.lock ] && break
  sleep 30
done
run p4a   A boardattn:cellnet_p4                 real13-mix-v4-96  &
run battn B boardattn:mobilenetv4_conv_small_035 real13-mix-v4     &
wait
echo "Raster-Laeufe durch $(date +%H:%M)"
