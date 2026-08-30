#!/usr/bin/env bash
# Architektur-Sweep. Regeln aus `docs/agent-briefs/architecture-sweep.md`.
#
# Bezugsrezept ist das des Briefings, NICHT ein eigenes: sonst sind die Zahlen nicht mit den
# 0,9234 von best-mix vergleichbar und die 65 Laeufe vom 26./27.08. nuetzen nichts.
#   ref   = exakt das Briefing-Rezept (warm aus comp13-Pretrain) — die Bruecke zur bekannten Welt
#   base  = derselbe Backbone KALT — der Paarungsbezug fuer alle anderen Arme
#   Differenz ref-base = was der Warmstart wert ist, und selbst ein Ergebnis.
#
# Warum die anderen Arme kalt laufen: `--resume` uebernimmt bei fremden Backbones null Tensoren
# und `_035` ist das EINZIGE ohne ImageNet-Gewichte. Warm oder pretrained gemischt wuerde das
# Vortraining ranken statt die Architektur. `pre050` misst es absichtlich, gepaart gegen `w050`.
#
# Je Arm eine EIGENE Lernrate (Phase 0, `lr_range_test.py`): eine geteilte Rate rangiert die Rate.
# 60 Epochen, `--patience 60`: kurze Laeufe sieben nicht (Spearman 0,40 bei 15), und ein
# Frueh-Abbruch haette 15 von 33 Laeufen getoetet, darunter die zwei besten.
# Achse ist `visible_piece_acc` auf dem GETEILTEN Val. `occ_board` NICHT lesen (sd 0,099).
#
#   TIER=core|wide|oracle|all|board   SLOT=B   BUDGET_H=8   SKIP_LR=1   SEED=42
# Aus einer KOPIE laufen. Bash liest ein Skript haeppchenweise von der Platte nach; wer die
# Datei bearbeitet, waehrend die Schleife laeuft, verschiebt deren Leseposition und sie landet
# in einem fremden Arm. Genau so ist am 27.08. `regnetx` gestartet, obwohl es rausgeworfen war.
if [ -z "${SWEEP_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t sweep-XXXXXX).sh
  cp "$self" "$snap"
  export SWEEP_SNAPSHOT="$snap"
  exec bash "$snap" "$@"
fi

cd "C:/Users/mariu/project/chess-vision" || exit 1

TIER=${TIER:-core}
DATASET=${DATASET:-real13-mix-v4}
SHARED_VAL=${SHARED_VAL:-real13-straight-80-v3}   # leer lassen, wenn die Aufloesung nicht passt
SEED=${SEED:-42}
EPOCHS=${EPOCHS:-60}
WORKERS=${WORKERS:-5}            # 5 je Lauf, wenn zwei Slots laufen; 8 sprengt 31,8 GB
BUDGET_H=${BUDGET_H:-0}
LR_SCALE=${LR_SCALE:-80}    # Eingabegroesse fuer den LR-Bandtest; MUSS zum Pack passen
OUTDIR=${OUTDIR:-data/models/_arch/$DATASET}
LOG=$OUTDIR/sweep.log
TIMES=$OUTDIR/timings.tsv
LRS=$OUTDIR/lrs.tsv
mkdir -p "$OUTDIR"
# Der Slot-Lock wird NICHT automatisch als veraltet erkannt (nur der Default-Lock kann das).
# Er wird hier NIE automatisch geloescht: `ps -p` sieht in Git Bash keine nativen Windows-PIDs
# und meldet jeden laufenden Lauf als tot — ein Auto-rm haette fremde Jobs freigegeben.
if [ -n "${SLOT:-}" ]; then
  export CHESSLAB_TRAIN_SLOT="$SLOT"
  lock=data/inbox/heavy-$SLOT.lock
  if [ -f "$lock" ]; then
    pid=$(sed -n 's/.*"pid" *: *\([0-9]*\).*/\1/p' "$lock" | head -1)
    if MSYS_NO_PATHCONV=1 tasklist /FI "PID eq ${pid:-0}" /NH 2>/dev/null | grep -q "\<${pid:-0}\>"; then
      echo "[FAIL] Slot $SLOT belegt: $lock haelt PID $pid, der Prozess laeuft."
    else
      echo "[FAIL] $lock haelt PID $pid, den tasklist NICHT kennt — vermutlich verwaist."
      echo "       Selbst pruefen, dann: rm $lock"
    fi
    exit 1
  fi
fi

[ -f "$TIMES" ] || printf 'arm\tbackbone\tmmac_board\tlr\tminutes\texit\n' > "$TIMES"

# Briefing-Rezept, minus Backbone, Lernrate und Warmstart — die setzt der Arm.
BASE="--dataset $DATASET --head occlusion --norm batchnorm --epochs $EPOCHS --patience $EPOCHS \
      --sched cosine --batch-size 256 --hflip-p 0.5 --jitter-translate 0.10 \
      --balance class --weight-cap 1 --seed $SEED --num-workers $WORKERS"

# arm | backbone | MMAC je Brett bei 80 px (gemessen) | zusaetzliche Flags
CORE="
ref|mobilenetv4_conv_small_035|428|--resume#comp13-ms-s1-pretrain-bn80#--lr#0.01
base|mobilenetv4_conv_small_035|428|--no-pretrained
mnv3s|mobilenetv3_small_100|572|--no-pretrained
w050|mobilenetv4_conv_small_050|594|--no-pretrained
pre050|mobilenetv4_conv_small_050|594|--pretrained
"
# Kapazitaet, ausdruecklich zu waehlen. Bei 128 px liegt der Val-Verlust UNTER dem Trainings-
# verlust (Luecke -0,026) — es gibt keine Generalisierungsluecke, die Breite schliessen koennte,
# und je Arm kostet es 7-10 h. Nicht in `core`.
CAPACITY="
edgenext|edgenext_xx_small|1500|--no-pretrained
w100|mobilenetv4_conv_small|1731|--no-pretrained
regnetx|regnetx_002|1975|--no-pretrained
mnv3l|mobilenetv3_large_100|2077|--no-pretrained
"
WIDE="
mobilevit|mobilevit_xxs|2378|--no-pretrained
lite0|efficientnet_lite0|3587|--no-pretrained
cnxatto|convnext_atto|4196|--no-pretrained
tinynet|tinynet_a|4307|--no-pretrained
cnxfemto|convnext_femto|5974|--no-pretrained
effv2b0|tf_efficientnetv2_b0|6535|--no-pretrained
mnv4med|mobilenetv4_conv_medium|7762|--no-pretrained
"
# Orakel: nicht 'welche Architektur', sondern 'ist 0,99 mit diesen Daten ueberhaupt drin'.
# Der Brief sagt: 27 % des Restfehlers ist bB<->bP und im 80-px-Crop nicht enthalten. Wenn auch
# resnet50 bei ~0,92 stehen bleibt, ist die Antwort nein und der Weg heisst Daten, nicht Modell.
ORACLE="
resnet18|resnet18|16281|--no-pretrained
cnxtiny|convnext_tiny|34142|--no-pretrained
resnet50|resnet50|35904|--no-pretrained
"
# Brettkontext getrennt: er MUSS ohne empty-Kappe laufen (aus einem Brett faellt keine Zelle
# weg), also braucht er einen Zell-Partner unter derselben Bedingung. Nur diese zwei gegeneinander.
# Phantom-Arm: exakt das ref-Rezept plus EIN Knopf. Bei 128 px sind 49,5 % des Restfehlers
# `empty -> Figur`, und `paste_neighbour_strip` ist genau dagegen gebaut — sie lag bis 2026-08-27
# nur im Datei-Loader und hat in keinem gepackten Lauf je gefeuert.
# Geschwindigkeit bei gehaltener Genauigkeit. Gemessen bei 128 px: der Trunk laeuft 64x und
# kostet 990 MMAC/Brett, der Aufmerksamkeitskopf einmal und kostet 21 — 2 %. Die Frage ist also
# nicht Transformer ODER CNN, sondern wie klein der Trunk werden darf, und ob der Kopf ihn
# kleiner macht, als er allein sein koennte. Alle Arme unter Brett-Bedingungen, damit die
# Kopf-Varianten gepaart sind.
SPEED="
p8w|cellnet_p8w|201|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
p8wa|boardattn:cellnet_p8w|222|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
p4|cellnet_p4|350|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
p4a|boardattn:cellnet_p4|371|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
cellnc|mobilenetv4_conv_small_035|990|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
battn|boardattn:mobilenetv4_conv_small_035|1010|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
"
PHANTOM="
nbpaste|mobilenetv4_conv_small_035|428|--resume#comp13-ms-s1-pretrain-bn80#--lr#0.01#--neighbour-p#0.3
"
BOARD="
cellnc|mobilenetv4_conv_small_035|428|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
battn|boardattn:mobilenetv4_conv_small_035|449|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
board|board:mobilenetv4_conv_small_035|457|--no-pretrained#--no-empty-cap#--epoch-frac#0.35#--balance#none#--weight-cap#3
"

PREVAL="
ref|mobilenetv4_conv_small_035|428|--resume#comp13-ms-s1-pretrain-bn80#--lr#0.01
"

case "$TIER" in
  preval) ARMS="$PREVAL" ;;
  core)   ARMS="$CORE" ;;
  wide)   ARMS="$CORE$CAPACITY$WIDE" ;;
  oracle) ARMS="$ORACLE" ;;
  board)  ARMS="$BOARD" ;;
  phantom) ARMS="$PHANTOM" ;;
  speed)  ARMS="$SPEED" ;;
  all)    ARMS="$CORE$CAPACITY$WIDE$ORACLE" ;;
  *) echo "TIER=preval|core|phantom|speed|board|wide|oracle|all"; exit 1 ;;
esac

# Phase 0 — Lernraten-Band je Backbone. `board:` kann der Test nicht fahren (flache Chargen) und
# erbt die Rate seines Trunks; es ist derselbe Trunk. Das Band haengt an der EINGABEGROESSE,
# darum liegt `lrs.tsv` unter dem Datensatz.
if [ "${SKIP_LR:-0}" != "1" ]; then
  [ -f "$LRS" ] || printf 'backbone\tlr\n' > "$LRS"
  for spec in $ARMS; do
    IFS='|' read -r name backbone mmac extra <<< "$spec"
    probe=${backbone#*:}; probe=${probe:-$backbone}
    if cut -f1 "$LRS" | grep -qx "$probe"; then continue; fi
    echo "== LR-Band $probe" | tee -a "$LOG"
    uv run python scripts/lr_range_test.py --dataset "$DATASET" --norm batchnorm \
      --backbone "$probe" --scales "$LR_SCALE" --batch-size 256 --num-workers "$WORKERS" \
      --seed "$SEED" > "$OUTDIR/lr-$name.txt" 2>&1
    cat "$OUTDIR/lr-$name.txt" >> "$LOG"
    lr=$(sed -n 's/.*steepest descent *: lr *\([0-9.eE+-]*\).*/\1/p' "$OUTDIR/lr-$name.txt" | tail -1)
    # Der Bandtest gibt eine KURVE aus, kein Ergebnis ("Read the band, not the number"). Sein
    # Steilstpunkt landete fuer vier von sieben Backbones bei ~1e-07 — `base` lief 96 min dort
    # und kam auf 0,087. Ausserhalb von [1e-3, 5e-2] gilt der Wert als nicht abgelesen.
    lr=$(awk -v v="${lr:-0}" 'BEGIN{print (v>=1e-3 && v<=5e-2) ? v : 0.01}')
    printf '%s	%s
' "$probe" "$lr" >> "$LRS"
    echo "   -> ${lr:-0.01 (Rueckfall)}" | tee -a "$LOG"
  done
fi

START=$(date +%s)
echo "arch sweep tier=$TIER dataset=$DATASET seed=$SEED slot=${SLOT:-A}  $(date)" | tee -a "$LOG"
for spec in $ARMS; do
  IFS='|' read -r name backbone mmac extra <<< "$spec"
  extra=${extra//\#/ }
  run="$OUTDIR/$name-s$SEED"
  if [ -f "$run/metrics.jsonl" ] && [ "$(wc -l < "$run/metrics.jsonl")" -ge "$EPOCHS" ]; then
    echo "== $name: fertig, uebersprungen" | tee -a "$LOG"
    continue
  fi
  if [ "$BUDGET_H" != "0" ] && [ $(( ($(date +%s) - START) / 3600 )) -ge "$BUDGET_H" ]; then
    echo "== Budget $BUDGET_H h erreicht — ab $name nicht mehr gestartet." | tee -a "$LOG"
    break
  fi
  lr=$(awk -F'\t' -v b="${backbone#*:}" '$1==b{print $2}' "$LRS" 2>/dev/null | tail -1)
  lr=${lr:-0.01}
  echo "=== $(date +%H:%M:%S)  $name  $backbone  $mmac MMAC/Brett  lr $lr ===" | tee -a "$LOG"
  t0=$(date +%s)
  uv run chesslab train --backbone "$backbone" --out "$run" --lr "$lr" $BASE $extra >> "$LOG" 2>&1
  rc=$?
  min=$(( ($(date +%s) - t0) / 60 ))
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$name" "$backbone" "$mmac" "$lr" "$min" "$rc" >> "$TIMES"
  echo "exit=$rc  ${min} min :: $name" | tee -a "$LOG"
  # Der GETEILTE Val, wie das Briefing es verlangt — der eigene Val eines Arms ist nicht
  # vergleichbar. Bei abweichender Aufloesung SHARED_VAL leer lassen (sonst FixRes-Mismatch).
  if [ "$rc" = "0" ] && [ -n "$SHARED_VAL" ]; then
    uv run chesslab eval --run "$run" --split val --dataset "$SHARED_VAL" >> "$LOG" 2>&1
  fi
done

echo "arch sweep fertig $(date)" | tee -a "$LOG"
uv run python scripts/sweep_report.py --dir "$OUTDIR" | tee -a "$LOG"
