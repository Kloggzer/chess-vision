#!/usr/bin/env bash
# Wartet, bis Slot B frei ist, holt die Auswertung des abgebrochenen Loops nach und faehrt dann
# die Geschwindigkeitsleiter. Der Loop wurde per TaskStop beendet, sein Kindprozess lief weiter —
# deshalb wartet das hier auf den LOCK und nicht auf einen Prozess.
cd "C:/Users/mariu/project/chess-vision" || exit 1
D=data/models/_arch/real13-mix-v4-128
until [ ! -f data/inbox/heavy-B.lock ]; do sleep 30; done
echo "Slot B frei $(date)"
if [ -f "$D/mnv3s-s42/metrics.jsonl" ] && [ ! -f "$D/mnv3s-s42/eval_val.json" ]; then
  uv run chesslab eval --run "$D/mnv3s-s42" --split val --dataset real13-mix-v4-128
fi
SLOT=B TIER=speed SKIP_LR=1 WORKERS=5 DATASET=real13-mix-v4-128 \
  SHARED_VAL=real13-mix-v4-128 BUDGET_H=10 bash scripts/sweep_architectures.sh
