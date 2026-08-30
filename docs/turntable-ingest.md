# Drehteller aufnehmen: Verdeckung, Winkel, Bloecke (2026-08-27)

`occluders composite` hat drei Schalter, die leicht verwechselt werden. Was sie unterscheidet und
warum es sie einzeln gibt.

## `--clean` — Blickwinkel statt Verdeckung

Der Composite-Pfad legt normalerweise Occluder-Platten auf jedes Frame; der Drehteller war damit
Verdeckungs-Material. Sein eigentlicher Beitrag ist ein anderer: **dieselbe Figur ueber die ganze
Drehung**. Der echte Korpus zeigt jede Situation in EINER Orientierung, 112-fach wiederholt.

Mit `--clean` bleibt das Frame unberuehrt. Die Coverage 0 ist dort die **Wahrheit**, nicht die
fehlende Messung aus der Matte-Falle (CLAUDE.md, „Coverage Matte Trap") — es liegt nichts drauf.

## `--angle-buckets` — eine Situation ist eine ANSICHT

`blocks` schneidet den Clip in fortlaufende Abschnitte, damit der session-gruppierte Split etwas
zum Gruppieren hat. Als Winkel-Eimer taugt das nicht: die vier Clips vom 25.08. tragen **1,1 bis
3,1 Umdrehungen**, ein fortlaufendes Zwoelftel waere dort 92 Grad breit.

`--angle-buckets 12` rechnet modulo einer Umdrehung (0,43 Grad je Frame, 837 Frames pro Umlauf).
Dieselbe Ansicht aus verschiedenen Durchgaengen landet im selben Eimer — fuer den Sampler richtig,
weil `--balance` ueber Situationen mittelt und eine Situation eine Ansicht ist, kein Zeitabschnitt.

## Was der Stride steuert

Nicht die Zahl der Situationen (das ist `--angle-buckets`), sondern wie viele Crops je Eimer.

| Bretter je Clip | stride (kurz/lang) | Winkelabstand | Crops gesamt (4 Clips) |
|---|---|---|---|
| 24 | 38/106 | 16 Grad | 6 144 |
| 120 | 7/21 | 3 Grad | 30 720 |
| 240 | 3/10 | 1 Grad | 61 440 |

Ueber 240 ist sinnlos — bei 1 Grad Abstand sind Nachbarbretter identisch.

## Gemessen: sauberes Drehteller-Material allein SCHADET

Vier Clips, `--clean --angle-buckets 12`, 32 512 Crops (11 % des Mischsatzes), in den
s2-Trainingssatz gemischt:

| | `vis_piece` | `macro` | `cov_prec` |
|---|---|---|---|
| ohne (Basis) | 0,7585 | 0,5930 | 0,9440 |
| `tt-s42`, ohne Balance | **0,7186** | 0,5796 | 0,9502 |
| `tt-balpc-s42` | **0,6510** | 0,5030 | 0,8456 |

Die Coverage-Precision steigt (24 384 saubere `empty`-Crops sind genau die fehlenden Negative),
die Figurenachse faellt. Ursache ist die Domaene, nicht die Geometrie: die Clips tragen **+39 %
Saettigung** gegen den Korpus (0,363 gegen 0,262) bei halber Helligkeitsspanne.

**Zu wenig von einer neuen Domaene stoert, statt gelernt zu werden.** Mit `comp13-v4` daneben
(344 128 Zeilen statt 32 512, dieselben Aufstellungen) kippt genau das — siehe
`docs/model-improvement-2026-08-26.md`.
