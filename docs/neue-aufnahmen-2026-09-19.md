# Zwei neue Partien vom 2026-09-19 — Herkunft und Kettenlauf

Zwei Aufnahmen kamen am 2026-09-19 vom Telefon: `2026-09-19-15-50-28` (87 Zuege) und
`2026-09-19-16-26-22` (59 Zuege). Beide sind **echte Partien**, nicht Rig-Material.

## Woher die Bestaetigung kommt — der Riegel, der uebergangen wurde

`realgames.confirm` verlangt eine `reference.pgn` und weigert sich unter `--yes`, wenn diese die
PGN des Telefons selbst ist:

> `reference.pgn IS the phone's own PGN, so --yes would confirm the tracker against itself.`

Genau dieser Fall liegt hier vor: es gab keine aussenstehende Notation, nur die des Geraets. Der
Nutzer hat dazu ausdruecklich erklaert (2026-09-19), die Zugfolge **am Brett haendisch gesetzt und
waehrend des Spiels validiert** zu haben. Auf diese Aussage hin wurde `confirmed` gesetzt — ueber
`ask`, nicht ueber `--yes`. **Zeuge ist der Mensch am Brett, nicht der Abgleich.** Der Vermerk
steht im `note`-Feld beider `candidate.json`.

**Ein zweiter, unabhaengiger Zeuge kam danach dazu:** `realgames retime` mit
`_thin/CONTROL-rot-s43` (128 px, ein Modell, das diese Aufnahmen nie gesehen hat) platziert jeden
Zug auf dem Video — **Uebereinstimmung 1,00 in beiden Partien**, 87 bzw. 59 Plies verschoben. Ein
fremdes Modell bestaetigt also Zug fuer Zug, was die Telefon-PGN behauptet. Das ist nicht der
Aussenzeuge, den der Riegel meint (es liest dasselbe Video), aber es ist mehr als nichts.

## Was gelaufen ist

| Schritt | Ergebnis |
|---|---|
| `phone-candidate` | `candidate.json` aus `files/games` + `timeline.jsonl` (195 s / 150 s) |
| `retime` | Uebereinstimmung 1,00; jeder Zug 5–18 Frames frueher als der Telefon-Commit |
| `confirm` | 87/87 und 59/59 matched, 0 erfunden, 0 fehlend (siehe oben) |
| `export-session` | 1 156 und 774 Zeilen, 73 984 und 49 536 Crops |
| `settle-scan` | 1 152/1 156 und 774/774 Frames bewertet |
| `alpha-worker` | 642 `occluded`-Frames, ~2 h |

Beide Aufnahmen sind sauber: `align_worst_px` Median **2,71** und **2,63**, alle Bretter gerade
gewarpt, keines mangels Mesh gebogen geblieben.

**Zwei Stellen fuer den Menschen:** der Settle-Scan meldet je Partie **1 Ply ohne sichtbaren Zug**.

## Was NICHT entschieden ist

Ob diese zwei Partien **Trainingsmaterial** oder **`test-v2`** werden. Das ist eine Entscheidung
und keine Messung, und sie ist bindend: was in einen Benchmark geht, ist fuer Training dauerhaft
verbrannt (`tests/test_fold_exclusions.py`). Der Korpus ist laut
`docs/offene-entscheidungen.md` "fast verbraucht", und frisches Material ist zugleich das
Einzige, was nach [[no-retrain-without-new-domain]] ein Training ueberhaupt rechtfertigt.

**Nicht nach `test-v1` legen.** Der Satz traegt bereits Zahlen (Champ-Vergleich, 128-gegen-80,
das Ausduenn-Urteil); sein Inhalt darf sich nicht aendern, sonst ist keine davon mehr mit einer
kuenftigen Messung vergleichbar. Genau dafuer sind die Saetze versioniert.

## Eine Beobachtung nebenbei

Die Entscheider der beiden Partien, aus der Telefon-Zeitleiste:

| Partie | Zuege | `cnn_occupancy` | `cnn_recovery` | sonst |
|---|---|---|---|---|
| 15-50-28 | 87 | 81 | **5** | 1 `cnn_overrule` |
| 16-26-22 | 59 | 54 | **3** | 2 `cnn_pair` |

**Acht Stellungsverluste auf 146 Zuege**, einer davon bei Zug 1 der ersten Partie. Das stuetzt an
frischem Material den Befund aus `docs/doppelcommits-2026-09-19.md`: Doppelcommits sind selten,
`cnn_recovery` ist der Hebel. Verdeckungs-Vetos sind dagegen fast keine (1 von 87, 0 von 59).

Der `cnn_pair` bei ply 55 von `16-26-22` ist `Rxc8+`+`Qxc8` mit 0 ms Abstand — dieselbe Partie,
aus der `data/recordings/rxr-c8-20260919` geschnitten ist. Beide Aufnahmen liefen noch mit dem
Build VOR dem Taint-Fix.
