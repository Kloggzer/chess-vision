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

**Das ist ein Werkzeug-Befund, kein Engine-Befund**, und er wird nicht als Aussage über die Engine
zitiert.

### Drei erste Lesarten waren falsch — hier stehen die gemessenen

Der erste Durchgang las die Logzeilen falsch. Was davon nachgemessen wurde:

- **`motion=0.0` ist die Stufenzeit in Millisekunden, nicht der Bewegungswert.** Der gesunde Lauf
  zeigt dieselbe Null. Nachgerechnet erreicht der ROI-Wert auf diesem Video bis **19,98 %** — der
  Bewegungssensor ist nicht tot.
- **`markers_seen` ist ein Histogramm der Marker-ANZAHL, nicht der IDs.** `{"2": 3, "3": 161,
  "4": 227}` heißt: 227 Stichproben sahen vier Marker. „Marker 1 nie gesehen" war eine Fehllesung.
- **Die `settings.json` trägt sehr wohl einen `app`-Block** mit `orientation: WHITE_BOTTOM`. Die
  Partie wird nicht verdreht gelesen.

Ebenfalls korrigiert: die `log.jsonl` des Telefons trägt **37 der 59 Halbzüge**. „Das Telefon hat
59/59 getrackt" belegt die Datei nicht — Zeuge der Zugfolge ist laut `note` der Mensch am Brett.

### Ausgeschlossen, mit Messung

- **Das Video passt.** `video.mp4` ist Segment 0 von fünf, zusammen 900+900+900+900+304 = **3904
  Frames**, genau `geometry.frames`. Der Replay las 3903 davon, die Zeitachse läuft bis t≈260 s.
- **Die Drehung stimmt.** Alle Segmente tragen `rotation=-90`, OpenCV liefert Portrait, gewarpt
  wird nach `ROTATE_90_COUNTERCLOCKWISE` — und dann sitzt das Gitter pixelgenau. Bildbeweis auf
  Frame 3880 gegen `reference.pgn` nach `Ne8`: Feld für Feld deckungsgleich.
- **Die Geometrie-Quelle stimmt.** Der Export protokolliert selbst `scan 0.009 cells,
  phone-log 0.009 cells` — etwa ein Pixel Unterschied. `align_pass_rate` trennt nicht: die gesunde
  `VID_20260824_154327` steht bei 0,7684 gegen 0,8798 hier.

### Die Ursache: ein Eckensprung in der Live-Ausrichtung

Der Replay sieht ein **dauerhaft verdecktes Brett**: `occl=0` steht auf nur **63 von 1952**
Beobachtungen (3,2 %). Jeder andere Lauf desselben Batches liegt bei 43–87 %.

Datiert auf den Frame: bei **Frame 128, t=8,47 s — 36 Sekunden vor dem ersten Zug** — springt
`occl` von 0 auf 4 und kehrt nie zurück. Im selben Atemzug steht die einzige Notiz
`Board geometry shifted (marker/camera) — re-capturing reference`, aus `Guards.cornersJumped`
(`cornerJumpPx = 6.0`). Sie kommt in keinem der zehn gesunden Logs vor.

**Die Kamera hat sich nicht bewegt.** Die ArUco-Zentren über Frames 50–199 stehen subpixelstabil.
Nur der ferne Marker an h8 flackert im Detektor: **38 von 100** bei voller Auflösung, 8 von 100 bei
`alignScale = 0.5`. Der Sprung entsteht in der Live-Ausrichtung, nicht im Bild.

Dass genau dieser Versatz diese Felder erzeugt, ist nachgemessen — `p4a-80-clahe` auf denselben
Pixeln unter verschobenen Quads:

| Quad | Zellen über `coverage_gate` 0,25 |
|---|---|
| Scan-Quad, ruhige Frames | **0** |
| ganzer Quad um 48 px verschoben (0,42 Zellen) | 1 |
| **eine Ecke** um 8 px | 1 (`g1`) |
| **eine Ecke** um 24 px (0,21 Zellen) | **20** (`e1,f1,g1,h1,d2,f2,g2,h2…`) |

Der Replay meldet `occlVeto=f1,g1,h1,h3` bzw. `d2,f1,g1,h1,h3`. Eine reine Verschiebung ist
harmlos; ein **ecken-lokaler** Versatz von 10–25 px trifft exakt diese Familie.

Getötet wird der Zug dann in `Hypothesis.tooMuchChangeGate`: der Replay lud keine `config=`, läuft
also auf den Vorgaben mit **`maxChanged = 5`**, während das Telefon 6 fuhr. Mit vier bis fünf
dauerhaft blockierten Zellen reißt jeder echte Zug (zwei geänderte Felder) die Decke — 202
`Much change`-Notizen, 10 Entscheidungen, 0 Commits. Die letzte Entscheidung beweist es: Frame 674,
`changed=[d4=8.4 d1=1.8]`, `cnnAgree=1.000`, `occlVeto=d2,…` — **d2, das Herkunftsfeld, ist
vetoiert**, also erklärt kein legaler Zug die Änderung.

### Bewiesen: derselbe Lauf ohne Live-Ausrichtung findet jeden Zug

`replay-regression.ps1 -Satz v2 -Extra "set:liveAlign=0"`, sonst nichts geändert:

| Aufnahme | mit `liveAlign` | ohne `liveAlign` |
|---|---|---|
| `2026-09-19-16-26-22` | **0**/59/0 | **59/0/0**, 0 Alarme |
| `2026-09-19-15-50-28` | 17/70/6 | 17/70/6 — unverändert |

Die Kette ist damit geschlossen: Marker-Flackern → Eckensprung → `Board geometry shifted` →
dauerhaft vetoierte Grundreihe → `tooMuchChangeGate` bei `maxChanged = 5` → kein einziger Commit.
Ein Knopf, eine Zeile, und aus null werden 59 von 59 ohne ein einziges Phantom.

**`2026-09-19-15-50-28` ist davon unberührt** — Ziffer für Ziffer gleich. Deren Defekt ist ein
anderer und noch offen; sechs Phantome sind dort das Dringende, nicht die 70 verfehlten Züge.

Bemerkenswert: `liveAlign` galt nach der Wachen-Ablation als mild lasttragend (+3 gefunden,
−3 verfehlt, +1 Episode über die zehn Aufnahmen). Auf dieser Aufnahme kostet dieselbe Wache
**alle 59 Züge**. Ein Mittelwert über einen Satz, der eine Materialsorte nicht enthält, sagt über
diese Sorte nichts — dieselbe Lehre wie bei den Hand-Wachen, nur diesmal mit einem Preisschild.

### Der Fix sitzt an der Ausrichtung, nicht am Torwert

Die Ausrichtung darf keinen Quad übernehmen, der aus **weniger Markern** gerechnet ist als die
Referenzaufnahme hatte. Eine Ecke, deren Marker verschwindet, wird gehalten statt neu geschätzt —
genau dieses Flackern (4 ↔ 3 Marker) ist gemessen. `maxChanged` hochzudrehen wäre das Gegenteil
eines Fixes: es macht den Sensor blind statt die Geometrie richtig.

**Bis das gebaut ist, misst `test-v2` nichts** — die Zahlen oben gehören in keine Auswertung.
