#!/usr/bin/env bash
# Die 15 Komposit-Clips noch einmal, diesmal mit pad_side 0 — die Gegenprobe zum Rand.
# Parameter aus dem Bestand rekonstruiert: alle 15 liefen mit 6 Bloecken (Default), MIT Verdeckern
# (~20 % Coverage, also kein --clean), ohne Winkel-Eimer, out-size 128 und gemessener board-size.
# Einziger Unterschied zu comp13-v3 ist der Rand.
cd "C:/Users/mariu/project/chess-vision" || exit 1
if [ -z "${CP0_SNAPSHOT:-}" ]; then
  self=$(cd "$(dirname "$0")" && pwd)/$(basename "$0")
  snap=$(mktemp -t cp0-XXXXXX).sh; cp "$self" "$snap"
  export CP0_SNAPSHOT="$snap"; exec bash "$snap" "$@"
fi
export OPENBLAS_NUM_THREADS=1
TAG=comp13-pad0
LOG=data/crops/$TAG.log
mkdir -p "data/crops/$TAG"
one() {  # clip fen
  local v="data/footage/turntable/$1.mp4"
  [ -f "$v" ] || v="data/footage/turntable/$1/video.mp4"
  [ -f "$v" ] || { echo "[FAIL] Clip fehlt: $1" | tee -a "$LOG"; return 1; }
  echo "=== $(date +%H:%M) $1" | tee -a "$LOG"
  uv run chesslab occluders composite --video "$v" --fen "$2" --tag "$TAG" \
    --pad-side 0 --out-size 128x128 >> "$LOG" 2>&1
  echo "   exit=$? $(date +%H:%M)" | tee -a "$LOG"
}
one "2026-08-09 20-48-50" "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
one "VID_20260731_092133" "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
one "VID_20260731_222043" "rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR"
one "VID_20260731_222320" "rnbkqbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBKQBNR"
one "VID_20260812_112853" "rnbqkb1r/ppp1pppp/5n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR"
one "VID_20260817_214400" "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
one "VID_20260823_120131" "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR"
one "VID_20260823_120426" "8/rnbqkbnr/pppppppp/8/8/PPPPPPPP/RNBQKBNR/8"
one "VID_20260823_120721" "8/8/rnbqkbnr/pppppppp/PPPPPPPP/RNBQKBNR/8/8"
one "VID_20260824_005850" "8/8/rnbqkbnr/pppppppp/PPPPPPPP/RNBQKBNR/8/8"
one "VID_20260824_013627" "pppppppp/rnbqkbnr/8/8/8/8/RNBQKBNR/PPPPPPPP"
one "VID_20260825_231715" "8/8/2R1r1bQ/3b1B1K/2n1RNBk/3nNr1q/8/8"
one "VID_20260825_232128" "8/8/2bNBRKk/5nrq/1N2BRnQ/6rb/8/8"
one "VID_20260825_232848" "8/8/6RN/1n1B1Kkb/n1b1r1qN/1B3RQr/8/8"
one "VID_20260825_233206" "8/8/1n1BKQ1R/1b2Bq1N/5rrR/1b2n1kN/8/8"
echo "alle Clips durch $(date +%H:%M)" | tee -a "$LOG"
