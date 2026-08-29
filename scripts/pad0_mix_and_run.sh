#!/usr/bin/env bash
# pad-0-Mix bauen und die zwei Arme starten, die zum bestehenden pad-0,05-Paar passen.
# Gepaart heisst hier: dasselbe Leiter-Rezept wie p4-80 (0,9112) und p4a-80 (0,9265),
# derselbe Split, dieselben Sessions — der Rand ist der einzige Unterschied.
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${PM_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t pm-XXXXXX).sh; cp "$self" "$snap"
  export PM_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi
export OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
LOG=data/datasets/pad0-mix.log
sess() { python -c "
import yaml,sys; print(','.join(yaml.safe_load(open('data/datasets/$1/dataset.yaml'))['session_ids']))"; }

step() { echo "=== $(date +%H:%M) $*" | tee -a "$LOG"; }

if [ ! -f data/datasets/real13-pad0-c8d1/manifest.jsonl ]; then
  step "echte Haelfte"
  uv run chesslab dataset build real13-pad0-c8d1 --like real13-straight-80-v3-c8d1 \
    --sessions "$(sess real13-straight-80-v3-c8d1)" \
    --source-manifest data/crops/pad0/manifest.jsonl --no-pack >> "$LOG" 2>&1 \
    || { echo "[FAIL] echte Haelfte" | tee -a "$LOG"; exit 1; }
fi
if [ ! -f data/datasets/comp13-pad0-80/manifest.jsonl ]; then
  step "Komposit-Haelfte"
  uv run chesslab dataset build comp13-pad0-80 --like comp13-v4-80 \
    --sessions "$(sess comp13-v4-80)" \
    --source-manifest data/crops/comp13-pad0/manifest.jsonl --no-pack >> "$LOG" 2>&1 \
    || { echo "[FAIL] Komposit-Haelfte" | tee -a "$LOG"; exit 1; }
fi
if [ ! -f data/datasets/real13-mix-pad0/manifest.jsonl ]; then
  step "mischen"
  uv run python scripts/mix_datasets.py real13-pad0-c8d1 comp13-pad0-80 real13-mix-pad0 \
    >> "$LOG" 2>&1 || { echo "[FAIL] mischen" | tee -a "$LOG"; exit 1; }
fi
if [ ! -f data/datasets/real13-mix-pad0/packed_images.u8 ]; then
  step "packen 80x80"
  uv run chesslab dataset pack real13-mix-pad0 --pack-size 80x80 >> "$LOG" 2>&1 \
    || { echo "[FAIL] packen" | tee -a "$LOG"; exit 1; }
fi
step "Datensatz steht: $(wc -l < data/datasets/real13-mix-pad0/manifest.jsonl) Zeilen"

D=data/models/_arch/real13-mix-pad0
FLAGS="--dataset real13-mix-pad0 --head occlusion --norm batchnorm --epochs 60 --patience 60 \
 --sched cosine --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 \
 --balance none --weight-cap 3 --no-pretrained --no-empty-cap --epoch-frac 0.35 \
 --seed 42 --lr 0.01 --num-workers 5"
arm() {  # name slot backbone
  for _ in $(seq 1 480); do [ ! -f "data/inbox/heavy-$2.lock" ] && break; sleep 30; done
  step "$1 auf Slot $2"
  CHESSLAB_TRAIN_SLOT=$2 uv run chesslab train --backbone "$3" --out "$D/$1-s42" $FLAGS \
    >> "$D/$1-s42.log" 2>&1
  rc=$?; ep=$(wc -l < "$D/$1-s42/metrics.jsonl" 2>/dev/null || echo 0)
  [ "$rc" = "0" ] || echo "[FAIL] $1 exit=$rc nach $ep Epochen" | tee -a "$LOG" "$D/FEHLER.txt"
  [ "$rc" = "0" ] && uv run chesslab eval --run "$D/$1-s42" --split val --dataset real13-mix-pad0 \
    >> "$D/$1-s42.log" 2>&1
  step "$1 fertig rc=$rc"
}
mkdir -p "$D"
arm p4  A cellnet_p4 &
arm p4a B boardattn:cellnet_p4 &
wait
step "pad-0-Paar durch"
