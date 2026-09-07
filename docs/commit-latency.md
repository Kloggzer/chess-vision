# Commit-Latenz — wo die halbe Sekunde sitzt und was sie kostet (2026-09-07)

Gefragt: *„kannst du das noch beschleunigen ohne Qualität zu verlieren?"* Gemessen an den
Handy-Aufnahmen vom 2026-09-06 (15 fps) und dem Regressionssatz (30 fps), Phantome als Veto.

## 1. Das Budget je Ply am PC

`scripts/commit_budget.py` zerlegt jeden retimeten Ply (`docs/retime.md`) in drei Stücke, aus dem
Replay-Log und dem `<motiondump>.status.csv`:

| Stück | 20-27-33, Median | was es ist |
|---|---|---|
| Stellung → ruhig | 0,2–0,4 s | der Nachlauf der Hand über dem Brett, nachdem die Figur steht |
| ruhig → Kandidat | 0,2 s | `motionHoldS` 0,2 s nach dem letzten Bewegungs-Frame, dazu 3 stabile Frames |
| Kandidat → Commit | ~0 s | die CNN-Bestätigung — am PC synchron mit Cache |

Der Hold und die Settle-Frames decken sich: bei 15 fps sind 3 Frames 0,2 s, bei 30 fps 0,1 s
unter dem Hold. Deshalb bewegt `settleFramesOverride=2` **nichts** (identische Zahlen), und
`motionHoldS=0,1` ist der einzige Hebel — er kostet auf dem 30-fps-Satz ein Phantom (222741:
33/0/0 → 22/11/1) und 11 verlorene Züge auf 233432 (21/0/0 → 10/11/0), während die 15-fps-Videos
sauber blieben (`tmp/batch/lat-hold01-20260907`). **0,2 s Hold bleiben**; der Rest der halben
Sekunde ist die Hand.

## 2. Das Handy war nie 2–3× langsamer

`phone_vs_pc.py` las bis zum 2026-09-07 die Handy-Commits aus `frame_phone`, und die lagen über
die Partie um bis zu 19 Frames zu spät: `ConcatFrameSource` addierte an jeder 60-s-Segmentnaht
nur die letzte PTS und verlor damit ein Frame-Intervall je Segment (30 Segmente = 2,1 s). Auf der
eigenen Uhr des Videos (Sync-Basis der Timeline auf die PTS-Tabelle):

| Aufnahme | PC Stellung → Commit | Handy | Differenz |
|---|---|---|---|
| 2026-09-06-21-29-35 | 0,67 s | 0,73 s | +0,06 s |
| 2026-09-06-20-27-33 | 0,51 s | 0,80 s | +0,29 s |
| 2026-08-30-16-20-19 | 1,13 s | 1,13 s | 0 |

22-43-46 (25,7 fps, altes Timeline-Format) lässt sich so nicht abbilden. Die Differenz ist die
Rundreise des Observers: der erste Blick auf einen Kandidaten ist strukturell unbrauchbar
(`VerifySingle`: `snap.seq < pend.seq`), am Handy kostet die nächste Beobachtung 1–2 Frames plus
Inferenz. Seit 2026-09-07 trägt jede Timeline-Zeile den Motion-Score (`TrackerStatus.motion`),
damit `settle_compare.py` an der nächsten Partie den Settle-Anteil des Handys direkt liest.

## 3. Was bleibt

- Der Observer könnte eine Beobachtung aus der Ruhephase VOR dem Kandidaten annehmen, statt
  eine nach `pend.seq` zu verlangen — spart am Handy 0,1–0,2 s je Zug, ändert am PC nichts und
  ist nur am Gerät messbar. Nicht gebaut: das Veto-Risiko wäre eine Hand, die unter der
  Bewegungsschwelle noch über den Feldern liegt.
- Die Ausreißer von 12–18 s sitzen bei Handy UND PC im Warten auf Ruhe (Hand über dem Brett),
  nicht in der Verifikation (`docs/verifier-stall.md` §4).
