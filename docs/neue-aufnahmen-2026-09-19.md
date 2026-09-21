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

## Nachtrag 2026-09-21: als `test-v2` aufgenommen — und der Replay trackt sie nicht

Der Nutzer hat entschieden: **rein in den Messsatz**, nicht ins Training. Umgesetzt als EIGENER
Satz, nicht als Erweiterung der Zehn — `scripts/replay-regression.ps1 -Satz v2` (oder `beide`).
Der erste Versuch hatte sie an die Zehn angehängt; das verstößt gegen die Regel zwei Absätze
weiter oben und wurde zurückgenommen. Die Zehn tragen Zahlen, ihr Inhalt bleibt.

**Kein Labeln nötig:** beide tragen `reference.pgn` und ein `candidate.json` mit `confirmed: true`.
Sie fehlten im Satz nur, weil das Skript ihr Video flach unter `data/recordings/<name>/video.mp4`
suchte — Telefon-Sitzungen legen es unter `files/sessions/<id>/`, und `candidate.json` nennt den
Pfad selbst. `Resolve-Video` liest ihn jetzt dort. Die frühere Notiz „ohne `video.mp4`, die Messung
geht nur über den Stored-Session-Weg" war also falsch.

### Der Befund: 0 von 59 Zügen, bei 3 903 Frames

| Aufnahme | found | missed | invented |
|---|---:|---:|---:|
| `2026-09-19-15-50-28` | 17 | 70 | 6 |
| `2026-09-19-16-26-22` | **0** | 59 | 0 |

**Das ist ein Werkzeug-Befund, kein Engine-Befund**, und es wird ausdrücklich nicht als Aussage
über die Engine zitiert. Die Belege dagegen:

- Das **Telefon selbst** hat dieselbe Partie live getrackt, 59/59, und `retime` bestätigt jeden Zug
  mit einem fremden Modell (Übereinstimmung 1,00).
- Im Replay steht `motion=0.0000` über den **ganzen** Lauf — der Bewegungssensor schlägt nie an.
- `cnnAgree=0.984` gegen die Grundstellung, `changed=[c4=3.1 b5=2.3 …]`: der Replay sieht ein
  praktisch **statisches Brett**, während 59 Züge gespielt werden.
- Jede Entscheidung bleibt bei `ply=0`, `why=STUCK no_legal_move`.

Die Ursache ist offen. Kandidaten, in dieser Reihenfolge zu prüfen: ob `video.mp4` der Sitzung
dasselbe Bild trägt wie der Analyse-Strom, aus dem die Ecken stammen; ob die Zeitachse
(`timeline.jsonl` liegt ebenfalls verschachtelt) gebraucht wird und fehlt; ob die Geometrie aus
`candidate.json` statt aus dem Label-Plan-Scan genommen werden muss. `markers_seen` nennt nur drei
der vier Marker, Marker 1 nie.

**Bis das geklärt ist, misst `test-v2` nichts** — und die Zahlen oben gehören in keine Auswertung.
