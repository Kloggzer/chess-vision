# Frame-Auswahl — erst messen, dann wählen; die Zelle entscheidet

Welche Frames einer Aufnahme ein Label tragen, und wie viele davon ein Datensatz mitnimmt. Code:
`chesslab/framescan.py` (Scan, `classify`), `realgames.settle_for_ply` (Messung),
`labeling.slice_session` (Tor), `position_flags.py` (Karten), `dataset_build.keep_per_position`
(Abtastung). Die Alpha darauf: `docs/session-mattes.md`. Wann eine Stellung stand:
`docs/retime.md`.

## 1. Erst messen, dann wählen

Der alte Export verteilte 8 Frames gleichmäßig über das ruhige Fenster einer Stellung und flaggte
danach — ein geflaggter Slot fiel einfach aus. Es fehlte nie an sauberen Frames, sie waren falsch
einsortiert (800 Bretter, 20 Sessions, 2026-08-18): **132 von 575** rillen-sauberen Frames zeigten
eine Person, **340 von 651** verworfenen keine (pauschal 1 s um jeden Commit gesperrt).

Seitdem scannt `framescan.py` jeden dritten Frame (0,1 s bei 30 fps), bevor irgendetwas gewählt
wird. Der Decode kostet `max(index)`, nicht `len(rows)` — mehr Kandidaten zu prüfen ist fast
gratis, darauf beruht der Umbau. Ergebnis auf 67 Stellungen von `rg-2026-08-08-00-39-57`:
**91 %** der Stellungen behalten ihre 8 sauberen Bretter (vorher korpusweit 20 %). Fehlt der
Scan, zieht der Export ihn selbst (`ensure_scan`); scheitert er, bricht der Export ab. `--no-scan`
plant ausdrücklich nach Margin-Fenstern — der Notausgang, gemessen mit 23 % Händen im Korpus.

### Die Sensoren

| Sensor | Kosten | Rolle |
|---|---|---|
| **Hand-Gate** (`hand_gate`) | **2,1 ms** | entscheidet allein, ob eine Hand auf dem Brett liegt (`docs/session-mattes.md` §4) |
| Rillen (`grid_occlusion.hand_squares`) | 13,6 ms | **benennt** nur die Felder, stimmt nicht mit |

Gegen SAM auf vier komplett zurückgehaltenen Sessions (1 783 Bretter, 865 mit Hand): Gate Recall
**0,9988**, Präzision **0,9920**; die drei alten Sensoren zusammen 0,9618 / 0,9509. Bei Schwelle
**0,50** fängt der Gate alle 865 und verwirft 10 von 918 sauberen Brettern (bei 0,60: 1 verpasst,
7 Fehlalarme). Die Rillen retten als Handstimme null Frames und kosten 36 Fehlalarme.

- **RT-DETR und `skin_patch` sind aus dem Scan entfernt** (2026-08-22). `skin_patch` lebt weiter als
  Zweitzeuge neben den Rillen (Grid-Fit `grid-late`, `session mark-hands`). Grounding DINO
  davor: 405 ms je Frame, und bei 512 px flaggte es jedes saubere Brett — nicht verkleinerbar.
- **Alte Scans tragen kein `gate`;** `occupied` liest sie nach der alten Regel, sonst gälte ein
  ganzer Korpus über Nacht als handfrei. Dort gilt RT-DETR `person` ≥ `PERSON_THR` 0,20: saubere
  Bretter liegen bei 0,11–0,13, Hände bei 0,30–0,95, bei 0,10 flaggt jedes saubere Brett.
- **Risiko:** der Gate ist auf DIESEM Aufbau kalibriert. Wer eine neue Kamera anfährt, misst ihn
  auf einer Session gegen SAM, bevor er dem Scan glaubt.

## 2. Die vier Gründe — der Zeuge ist das Brett, nicht die Hand

`framescan.classify` gibt jedem Frame einen Grund:

| Grund | Woran erkannt | FEN gültig? |
|---|---|---|
| `clean` | kein Sensor sieht etwas, Brett wie beim Commit | ja — der p8-Bestand in `boards/` |
| `occluded` | Hand über einem **unveränderten** Brett | **ja** — das Occlusion-Material |
| `stale` | die Felder des nächsten Zuges haben sich geändert | nein |
| `changed` | wenige andere Zellen dauerhaft anders (Kipper) | nein |

Alles außer `clean` liegt in `dirty/`, jede Zeile mit `dirty_reason`. Die Labels gelten so lange,
wie die Stellung noch so aussieht wie die, für die der Commit bürgt. Zwei verworfene Entwürfe:

- **Die Hand als Zeuge** (Griff rückwärts vom Commit suchen): ein zappelnder Spieler kostete die
  ganze Stellung (ply 49 von 00-39-57: alle 50 Frames verworfen), und ein Handschlag ist kein Zug.
- **Alle 64 Zellen als Zeuge:** flaggte 55 % der ruhigen Frames, Änderungspunkt im Median bei
  33 % des Intervalls, median 7 abweichende Zellen auf e1, d1, f1, c2, g1 — der Schatten des
  vorgebeugten Spielers auf der Grundreihe. Ein Zug ändert **zwei** Felder.

**Die gezielte Frage:** nur `next_touches` (die Felder des nächsten Zuges aus der bestätigten
PGN) entscheidet `stale`. Änderungspunkt dann p50 **89 %** statt 33 %; frühe Fälle sind der
Vorlauf des Bildes vor dem Commit (bis 4,6 s). Für den Kipper gilt `MAX_CHANGED_CELLS = 4` — mehr
gleichzeitig driftende Zellen sind Licht — und eine Abweichung zählt nur, wenn sie **bis zum
Intervallende bleibt** (`_persistent`, Schnittmenge seit 2026-09-14; ein Ärmel kommt zurück).

Die 8 Bretter je Stellung stammen aus deren sauberem Fenster (Median 1,7 s). Sie existieren, damit
jede Stellung gleich schwer wiegt, nicht für zeitliche Vielfalt. Ein Posen-Dedup der
`occluded`-Frames wurde gemessen und verworfen: nur 23 % gespart, weil `pick_spread` ohnehin streut.

## 3. Stellungs-Prüfung: die Zelle entscheidet, nicht das Frame (2026-08-22)

Mit `settle_dev` in der Log-Zeile und einer Matte daneben steuert die Frame-Klasse nur noch, was
SAM zuerst mattet. Geurteilt wird **pro Zelle** gegen die gesetzte Stellung des eigenen
Ply-Intervalls:

| Coverage | Abweichung | Urteil | Was passiert |
|---|---|---|---|
| > `PIECE_VISIBLE_MAX` (0,15) | egal | verdeckt | FEN-Label bleibt, `coverage` nimmt die Zelle aus dem Klassifikations-Loss — kein Kärtchen |
| ≤ 0,15, `settle_seen` ≥ 0,5 | < `SETTLE_LIMIT` (45) | unverändert | FEN-Label gilt, Zelle geht in den Pool |
| ≤ 0,15, `settle_seen` ≥ 0,5 | ≥ 45 | strittig | Karte auf der `Strittig`-Lane |
| ≤ 0,15, `settle_seen` < 0,5 | nicht messbar | strittig | dito — weder vergleichbar noch vom Loss ausgenommen |

Der sichtbar ziehende Bauer (a2 leer, a3 besetzt, FEN sagt noch a2) ist damit zwei Karten und kein
verworfenes Frame; `stale`- und `changed`-Frames werden Zelle für Zelle gerettet. Auf
`2026-08-16-20-41-33` brachte das **+1 939 Zellen** in den Pool bei 276 Karten auf 169 Frames.

**Nur gemattete Frames sind so messbar.** Am 2026-09-22 trugen 27 Aufnahmen 13 577 Log-Frames
gegen 8 554 gemattete (63,0 %). Ein fehlendes Alpha heißt nicht sichtbar, sondern ungemessen.

### Was gemessen wird

- **Die Referenz ist alpha-gefiltert:** pixelweiser Median nur über Boards des Intervalls, deren
  Alpha nirgends mehr als `SETTLE_CLEAR_MAX` (0,02) behauptet — eine Hand im Median wäre die
  Stellung.
- **Abweichung nur auf sichtbaren Pixeln, beide Seiten genivelliert:**
  `mean|(Zelle − ⌀Zelle) − (Referenz − ⌀Referenz)|` über `alpha < 128`. Ein Schatten verschiebt die
  Helligkeit, eine Figur die Struktur; roh flaggte der Spielerschatten auf 20-41-33 ply 7 drei
  unberührte Felder.
- **`settle_seen`** steht neben `settle_dev`: der sichtbare Anteil je Zelle. Auf einem Fünftel
  gemessen ist nicht „unverändert", sondern ungesehen.
- **Reihenfolge:** `session settle-scan` schreibt `settle_dev`/`settle_seen`, erst dann hat
  `realgames position-flags` etwas; ungemessen zeigt die Lane `—`, nicht `0`.

### Die Schwelle 45 (seit 2026-09-09)

15 war gegen den Rillen-Sensor geeicht, nicht gegen das Bild: sie verwarf 2 999 Zellen, die die
Coverage nicht ohnehin maskiert, vier Fünftel davon unter 35 und gewöhnliches Material. Über 45
waren 24 von 24 Stichproben Hände auf Feldern, die der FEN als Figur führt. Wer sie senkt, flutet
die Lane.

### Die Prüfung des Commit-Fensters

Der Zug, der ein Intervall eröffnet, MUSS zwischen der Referenz des Vorgängers und der eigenen auf
genau den Feldern aus `changed_squares` sichtbar sein — sonst hängt der FEN an Pixeln, die ihn nie
gezeigt haben. Der einzige Test über eine Intervallgrenze hinweg; `realgames.interval_moves`
schreibt ihn nach `interval-check.jsonl`. Über 177 Nachbar-Paare aus drei Sessions ist der Zug in
161 sichtbar. Die übrigen sind nicht automatisch falsche Commits; die Zeile sagt `seen: false`,
der Mensch entscheidet.

### Die bekannte Blindstelle

Das Brett hat einen Lichtverlauf (h3 bei 156, a7 bei 20 auf 20-41-33): ein schwarzer Bauer auf
fast schwarzem Feld bewegt den Wert nur um ~1,5, bleibt also unter `SETTLE_LIMIT` (und unter
`framescan.CHANGE_THR`), und die Zelle geht mit altem Label durch. `interval-check.jsonl` misst das
pro Ply. Schließen heißt, die Abweichung am Eigenkontrast der Zelle zu normieren, nicht die
Schwelle zu senken.

## 4. Abtastung: wie viele Bretter je Stellung

Der Engpass sind **Stellungen**, nicht Crops. Nachgezählt 2026-09-22 über alle
`data/recordings/*/log.jsonl`: 27 Aufnahmen, 13 577 Brettzeilen, **850 Stellungen, 16,0 Aufnahmen
je Stellung** — und der Tracker nimmt alle 0,1 s auf, die zehnte Aufnahme je Sekunde ist eine
Kopie der ersten.

Gemessen (vier Folds, gleicher Seed und Pack, damals 246 Stellungen auf 9 386 Brettern):

| Variante | Bretter | Stellungen | macro |
|---|---|---|---|
| voll, 0,1 s | 9 386 | 246 | 0,7119 |
| Zeitraster 2,4 s | 400 | **147** | 0,7452 |
| 4 je Stellung | 980 | 246 | 0,7802 |
| **16 je Stellung** | 3 415 | 246 | **0,7898** |

- **Stratifizieren nach Stellung wirkt** (macro 0,77–0,79 gegen 0,712) — der einzige Abstand über
  der Seed-Streuung (`tests/test_per_position.py`).
- **Ein reines Zeitraster verliert Stellungen:** bei 2,4 s fielen 99 von 246 weg.
- **Danach ist die Brettzahl fast egal;** der p/d/s-Sweep (40 Läufe, 2026-08-17) fand keine Achse,
  die sich von der Basis trennt — p4 mit 28 426 Zeilen lag auf dem Median über der Basis mit
  462 935. Nur der Stride `s` lag konsistent unten.
- **Verworfen:** innerhalb einer Stellung die optisch verschiedensten Bretter wählen (k-center über
  einen Farb-Deskriptor) — 2 von 4 Folds gewonnen, zweimal. Code entfernt.

**Die Regel:** die Abtastung folgt der Änderungsrate der Quelle. Spiel-Session: die Stellung,
`--per-position 4` bis `8`. Drehteller: der Winkel, Stride 8 (≈ 3,4 Grad bei 0,429 Grad je Frame;
`docs/occluder-plates.md`). Mehr Frames pro Sekunde bringen nichts — Licht ist auf dem 0,1-s-Raster
vollständig erfasst, und Hände (Einzelsprung Faktor 25 über dem Median) trifft ein Zeitraster nur
zufällig.
