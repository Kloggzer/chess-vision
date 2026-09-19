# Schlagzug auf besetztes Feld: 19,7 s statt 3 s

Nutzer, 2026-09-19: "hinten raus dauert das erstaunlich lange fuer die erkennung". Gemessen an
der Partie, die er danach spielte (59 Plies, Matt mit `Rxe8#`), aus `adb logcat`.

## Die Messung

Wartezeit zwischen zwei Commits, aus den Logcat-Zeitstempeln:

| Ply | Zug | Wartezeit |
|---|---|---|
| 48-52 | Nf6, Rdc2, Rac8, d5, cxd5 | 2,1-3,1 s |
| 53 | Qxc8 | 4,2 s |
| 54 | Rxc8 | 3,5 s |
| **55** | **Rxc8+** | **19,7 s** |
| 56 | Qxc8 | **0,0 s** |
| **57** | **Rxc8+** | **15,5 s** |
| 58 | Ne8 | 6,6 s |

Der Rest der Partie lag bei 2-7 s. Die Ablehnungsquote steigt im letzten Zehnerfenster auf 58 %
(gegen 23 % in der Mitte), haeufigster Grund `STUCK no_legal_move` (14x).

## Der Mechanismus

**Fuenf Schlagzuege hintereinander auf c8** — Qxc8, Rxc8, Rxc8+, Qxc8, Rxc8+. Bei Ply 54 sah der
Erkenner:

    ply=54 COMMIT e8c8  changed=[e8=33.9 a8=2.7 a3=1.5]           cnnAgree=1.000
    ply=54 REJECT c2c7  changed=[c2=19.0 c7=2.8 d8=1.9]           cnnAgree=0.500   (8x)

**`c8` steht auf keiner der Listen.** Dort stand ein schwarzer Turm, danach ein weisser — gleiche
Silhouette, nur andere Farbe, und der Frame-Diff misst die Aenderung der Pixel. Der echte Zug war
`Rc2xc8`.

`Scoring.loglikScores` bewertet ALLE legalen Zuege nach der Summe der Logits ihrer beruehrten
Felder. `Rc2xc8` bekommt c2 = 19,0 und c8 ~ 0; `Rc2c7` bekommt c2 = 19,0 und c7 = 2,8. Der falsche
Zug gewinnt auf 2,8 Punkten Rauschen, und die Engine wiederholt ihn achtmal, waehrend das CNN mit
`cnnAgree=0.500` halb widerspricht.

Aufgeloest wurde es erst, als ein ZWEITER Zug das Brett genug veraenderte: Ply 55 und 56
committeten zusammen als `cnn_pair` auf `changed=[e6=31.9 c8=22.7 c2=18.6 ...]`. Deshalb brauchte
Ply 56 exakt 0,0 s — er kam mit 55 gratis.

## Was daran NICHT der Engpass war

- **Die Bildrate nicht.** Dieselbe Partie lief mit den gemessenen 15 fps (`sensor gap 66,7 ms`).
- **Das CNN nicht.** 12-28 ms je 64 Crops, keine Drift.
- **Die Zugzahl nicht.** Im Regressionssatz ueber zehn Aufnahmen faellt die Ablehnungsquote mit
  steigendem Ply (65-74 % frueh, 23-53 % spaet). "Hinten raus" ist hier der Abtausch, nicht das
  Alter der Partie.
- **Kein ALARM.** Null in der ganzen Partie.

## Die offene Frage

Der Frame-Diff ist auf einem Schlagzug blind, wenn geschlagene und schlagende Figur dieselbe
Silhouette haben — Turm schlaegt Turm ist der haerteste Fall, Dame schlaegt Turm der naechste.
Das CNN sieht den Unterschied (Klasse UND Farbe), aber die Rangfolge der Kandidaten kommt aus dem
Frame-Diff-z, nicht aus der CNN-Klasse; das CNN darf nur noch zustimmen oder nicht.

**Nicht gemessen:** ob eine Kandidatenbewertung, die bei besetztem Zielfeld die CNN-Klasse statt
der Pixelaenderung heranzieht, den Fall loest, ohne anderswo Phantome zu erzeugen. Das waere eine
Engine-Aenderung und braucht `scripts/replay-regression.ps1` gegen 396/3/0/171 bei 5 Alarmen — und
der Regressionssatz enthaelt genau diesen Fall vermutlich zu selten, um ihn zu bewerten.

## Der Clip

`data/testclips-real/real-c8-exchange.mp4` — 48,2 s, 2560x1440, 15 fps, aus der Partie selbst
geschnitten (Session `20260919-162622`, Videozeit 205,0-253,2 s; Segment 003 ab 25 s plus
Segment 004 bis 13 s, ohne Neukodierung). Daneben `real-c8-exchange.labels.json`:

| Feld | Wert |
|---|---|
| `start_fen` | `2r1r1k1/5ppp/2p1qnb1/1p1P4/pB2P3/2Q2P2/P1R1B1PP/2R3K1 b - - 0 26` |
| `san` | cxd5, **Qxc8, Rxc8, Rxc8+, Qxc8, Rxc8+** |
| `corners` | Median-Quad ueber die 725 Frames des Fensters |
| `margin` | 0,045 — ArUco-Ecken sitzen im Label-Rand, ohne den Wert ueberdehnt der Warp um 6-8 % |
| `board_size` | 896 (aus der `settings.json` der Sitzung) |

**Fuenf der sechs Halbzuege schlagen auf c8.** Die Zugfolge ist nicht abgetippt, sondern aus den
sechs verschiedenen FENs der `timeline.jsonl` mit `python-chess` hergeleitet — inklusive der
Stelle, an der ZWEI Halbzuege in einer einzigen Stellungsaenderung stecken, weil die Engine
dazwischen 19,7 s hing.

### Warum er NICHT in `tests/data/testclips/` liegt

Zwei Gruende, beide hart:

1. **Groesse.** 53 MB gegen 11 MB fuer die gesamte bestehende Suite. Die Blender-Clips sind
   640x640 und board-only; herunterzuskalieren wuerde ausgerechnet das Signal zerstoeren, um das
   es geht — bei 1280x720 faellt ein Feld von ~116 auf ~58 px, unter die 80 px des Modells.
2. **Der Katalog haengt an `parity/index.json`.** `SimClips` liest die Clip-NAMEN und je Clip
   eine `parity/<name>/meta.json` mit der `effectiveConfig`, die der PYTHON-Tracker wirklich fuhr
   — Kotlins eigene Vorgaben weichen davon ab (`occlusionColorThr` 3,0 gegen 1,5), Vorgaben zu
   nehmen wuerde einen Portierungsfehler vortaeuschen. Diese Fixtures erzeugt
   `scripts/emit_parity_fixtures.py`; ohne sie einen Namen in den Index zu schreiben, faehrt
   `ClipReplayParityTest` gegen nicht vorhandene Daten.

`SimClips` ist auf echte Clips vorbereitet — `simClipDir` liest `-Pchesslab.sim.clips`, und der
`margin`-Schluessel existiert ausdruecklich fuer sie ("a real clip's entry carries the profile's
value, which is what makes its warp right"). **Was fehlt, ist der Paritaets-Eintrag.**
