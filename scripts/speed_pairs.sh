#!/usr/bin/env bash
# Die Leiter paarweise: jedes Paar gleichzeitig auf beiden Slots, dann auf BEIDE warten.
# Gepaart im Wortsinn — beide Arme sehen dieselbe Maschinenlast, also ist die Differenz der Kopf.
#
# WORKERS bewusst niedrig: `--num-workers 5` erzeugt ZEHN Prozesse (Trainings- plus Eval-Loader,
# beide persistent) und kostet 5,2 GB. Bei zwei Laeufen waeren das 10,4 GB nur fuer Loader.
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${PAIRS_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t pairs-XXXXXX).sh
  cp "$self" "$snap"; export PAIRS_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi

# Thread-Arenen deckeln. Ohne das reserviert JEDER Torch-Prozess mehrere GB Commit, den er nie
# benutzt: gemessen 13,9 GB fuer einen Hauptprozess und 7,4 GB fuer einen Worker, System-Commit
# 70,6 von 79,8 GB. Commit killt den Rechner, nicht der Arbeitssatz.
export OPENBLAS_NUM_THREADS=1
export OMP_NUM_THREADS=1
export MKL_NUM_THREADS=1

DATASET=${DATASET:-real13-mix-v4-128}
D=data/models/_arch/$DATASET
# Je Lauf ZWEI Loader (Training + Eval), also 2xW Prozesse. Mit `seek`+`read` statt Memmap
# kostet ein Worker 0,6 GB flach statt bis zu 10 — dafuer ist der Ladeweg teurer geworden
# (Systemaufruf je Crop), und 2 Worker bremsten auf 139 s je Epoche gegen 55 s vorher.
W=${WORKERS:-5}
LOG=$D/pairs.log
FLAGS="--dataset $DATASET --head occlusion --norm batchnorm --epochs 60 --patience 60 \
 --sched cosine --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 --balance none \
 --weight-cap 3 --no-pretrained --no-empty-cap --epoch-frac 0.35 --seed 42 --lr 0.01 \
 --num-workers $W"

done_p() { [ -f "$D/$1-s42/metrics.jsonl" ] && [ "$(wc -l < "$D/$1-s42/metrics.jsonl")" -ge 60 ]; }

# Ein Fehlschlag muss LAUT sein und WARUM sagen. Ein Treiber, der stumm weitergeht, laesst dich
# morgens vor leeren Ordnern stehen (28.08.: p8wa starb an einem IndexError, der Treiber lief
# weiter und rief danach `eval` auf einer nicht existierenden Checkpoint-Datei auf).
fail() { echo "[FAIL] $*" | tee -a "$LOG" "$D/FEHLER.txt"; }

arm() {   # arm slot backbone
  if done_p "$1"; then echo "== $1 fertig, uebersprungen" | tee -a "$LOG"; return 0; fi
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
  if ! done_p "$1"; then
    fail "$1 endete mit exit=0, hat aber nur $ep von 60 Epochen — unbrauchbar"
    return 1
  fi
  uv run chesslab eval --run "$D/$1-s42" --split val --dataset "$DATASET" \
    >> "$D/$1-s42.log" 2>&1 || fail "$1: Auswertung fehlgeschlagen, Training war ok"
  echo "   $1 fertig $(date +%H:%M:%S)" | tee -a "$LOG"
  return 0
}

# Verwaiste Locks selbst aufloesen — aber NUR mit Beweis. `tasklist` ist auf Windows die
# Autoritaet; `ps` sieht native PIDs nicht und meldete heute Nacht einen laufenden Lauf als tot.
# Ohne das blockiert ein abgestuerzter Lauf die ganze Nacht.
free_stale() {
  for f in data/inbox/heavy-A.lock data/inbox/heavy-B.lock; do
    [ -f "$f" ] || continue
    pid=$(sed -n 's/.*"pid" *: *\([0-9]*\).*/\1/p' "$f" | head -1)
    if [ -n "$pid" ] && MSYS_NO_PATHCONV=1 tasklist /FI "PID eq $pid" /NH 2>/dev/null | grep -q "\<$pid\>"; then
      continue
    fi
    fail "verwaister Lock $f (PID ${pid:-?} laeuft nicht) — entferne ihn"
    rm -f "$f"
  done
}

for _ in $(seq 1 240); do
  free_stale
  [ ! -f data/inbox/heavy-A.lock ] && [ ! -f data/inbox/heavy-B.lock ] && break
  sleep 30
done
for pair in "p8w cellnet_p8w|p8wa boardattn:cellnet_p8w" \
            "p4 cellnet_p4|p4a boardattn:cellnet_p4" \
            "cellnc mobilenetv4_conv_small_035|battn boardattn:mobilenetv4_conv_small_035" \
            "w050n mobilenetv4_conv_small_050|w050a boardattn:mobilenetv4_conv_small_050"; do
  # ONLY waehlt Paare aus, z. B. ONLY="cellnc p4" — sonst laufen alle vier.
  if [ -n "${ONLY:-}" ]; then
    case " $ONLY " in *" ${pair%% *} "*) ;; *) continue ;; esac
  fi
  a=${pair%%|*}; b=${pair##*|}
  # Parallel ueber beide Slots. Die 148 s je Epoche vom 28.08. waren KEIN Parallelitaets-
  # problem, sondern der Eval-Loader, der im Brett-Modus 256 Bretter statt 256 Crops las.
  arm ${a% *} A ${a#* } &
  pa=$!
  arm ${b% *} B ${b#* } &
  pb=$!
  wait $pa; ra=$?
  wait $pb; rb=$?
  if [ "$ra" != "0" ] || [ "$rb" != "0" ]; then
    fail "Paar unvollstaendig — die restlichen Paare werden NICHT gefahren"
    exit 1
  fi
  echo "--- Paar durch $(date +%H:%M:%S)" | tee -a "$LOG"
done
uv run python scripts/sweep_report.py --dir "$D" | tee -a "$LOG"
