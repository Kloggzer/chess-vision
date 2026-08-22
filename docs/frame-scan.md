# Frame-Scan — erst messen, dann auswählen

Warum der Export nicht mehr plant und danach flaggt, sondern jeden Frame misst und danach wählt.
Code: `chesslab/framescan.py`. Der Occluder-Alpha darauf: `docs/session-mattes.md`. Seit
2026-08-22 entscheidet die Klasse hier nicht mehr über ein Label, sondern nur noch darüber, was
SAM zuerst mattet — das Urteil fällt pro Zelle (`docs/position-check.md`).

## Der Bruch

`plan_rows` verteilte 8 Frames gleichmäßig über das ruhige Fenster einer Stellung, danach flaggten
Rillen-Read und `skin_patch` einen Teil davon als `dirty`. Ein geflaggter Slot fiel einfach aus.

Gemessen am 2026-08-18 über den ganzen Korpus (469 Stellungen, 14.429 Bretter):

| Regel | Stellungen mit ≥ 8 sauberen | ohne einen einzigen | Median | Summe |
|---|---|---|---|---|
| Fenster + Sensoren (alt) | 93 (20 %) | 67 | 5 | 3.063 |
| Rillen + RT-DETR (neu) | **434 (93 %)** | 14 | **18** | 8.759 |

Es fehlte nie an sauberen Frames. Sie waren falsch einsortiert — und zwar in beide Richtungen,
gemessen an 800 Brettern aus 20 Sessions:

- **132 von 575** rillen-sauberen Frames zeigen eine Person. 23 % Hände liefen in den Korpus.
- **340 von 651** als `dirty` verworfenen Frames zeigen keine. Sie fielen nur, weil pauschal 1 s um
  jeden Commit gesperrt war — die Hand ist dort längst weg.

## Die Sensoren

| Sensor | Kosten | Was er sieht | Was er übersieht |
|---|---|---|---|
| Rillen (`grid_occlusion.hand_squares`) | 13,6 ms | modellfrei, benennt die Felder | eine Hand, die keine Linie kreuzt |
| RT-DETR r18 (COCO, `person`) | 24,6 ms | Arm, Körper, Ärmel | Fingerspitzen am Rand (< 0,20) |
| `skin_patch` | 6,8 ms | genau diese Randfinger | alles ohne Hautton |

Alle drei zählen, weil sie **verschieden** scheitern (`framescan.occupied`).

### Warum RT-DETR und nicht Grounding DINO

| Modell | je Frame | Treffer (24 Bretter) | Falschflaggen |
|---|---|---|---|
| Grounding DINO @800 px | 405 ms | 24 | 0 |
| Grounding DINO @512 px | 192 ms | 23 | **23** |
| **RT-DETR r18** | **24,6 ms** | 23 | **0** |
| DETR R50 | 29,9 ms | 18 | 0 |
| YOLOS-tiny | 20,3 ms | 23 | 11 |

- **DINO lässt sich nicht verkleinern.** Bei 512 px flaggt es jedes saubere Brett; die 405 ms sind
  der Preis, nicht ein Parameter. Batching bringt 12 % (445 → 389 ms bei 8), bei 16 kippt es.
- **Die Schwelle 0,20 ist gemessen, nicht geraten.** Saubere Bretter liegen flach bei `person`
  0,11–0,13, Hände bei 0,30–0,95. Bei 0,10 flaggt jedes saubere Brett.
- **Nur `person` trägt.** Dasselbe Modell findet auf einem sauberen Brett `mouse` 0,35, `cup` 0,34,
  `clock` 0,31 — das sind die Figuren. Eine „alles außer Schach"-Regel ist unbrauchbar.
- **Der Ausschnitt ist egal, der Rand nicht.** Ein Bounding-Box-Schnitt des Quads liefert dieselben
  Urteile wie das gewarpte Brett (0,11 vs 0,13). Mit 10 % Rand flaggt es *alles* (12/12 sauber),
  mit 25 % nur die Randhände (9/12, 0 Fehlalarme) — nicht monoton, also nicht verlässlich. Der
  Scan warpt ohnehin für die Zell-Signatur, also bleibt es beim Brett.
- **`skin_patch` bleibt.** Er beansprucht korpusweit nur 58 Frames allein — und **alle 58 sind
  echte Hände**, Finger am Brettrand, denen RT-DETR 0,09–0,19 gibt.

## Die vier Gründe

Ein Frame ist nicht „dirty", er hat einen Grund (`framescan.classify`):

| Grund | Woran erkannt | FEN gültig? | Wofür brauchbar |
|---|---|---|---|
| `clean` | kein Sensor sieht etwas, Brett wie beim Commit | ja | der p8-Bestand |
| `occluded` | Hand über einem **unveränderten** Brett | **ja** | Occlusion-Labels |
| `stale` | die Felder des nächsten Zuges haben sich geändert | nein | nur als Bild |
| `changed` | wenige andere Zellen dauerhaft anders (Kipper) | nein | nur als Bild |

**Der Zeuge ist das Brett, nicht die Hand.** Die Labels gelten genau so lange, wie die Stellung
noch so aussieht wie die, für die der Commit bürgt. Eine Hand über einem unveränderten Brett ist
ein Spieler, der hineingreift — kein Spieler, der gezogen hat.

### Warum nicht die Hand

Der erste Entwurf suchte den Griff rückwärts vom Commit und erklärte alles ab dort für ungültig.
Zwei Messungen haben ihn erledigt:

- **Ein zappelnder Spieler kostet die ganze Stellung.** Auf ply 49 von 00-39-57 liegt die Hand in
  35 von 50 Frames mit kurzen Lücken; die Rückwärtssuche kettete durch bis zum Segmentanfang und
  verwarf alle 50.
- **Ein Handschlag ist kein Zug.** Eine Hand mitten im Intervall, nach der wieder Ruhe einkehrt,
  lässt die Stellung in Ruhe — sie darf `occluded` bleiben, sonst verliert man das beste Material.
- Der `measure_settle`-Onset als Frame-Sperre war ebenso zu grob: er verwirft den ganzen Frame,
  wo `unknown_for` längst die betroffenen **Felder** benennt.

### Warum nicht alle 64 Zellen

Der zweite Entwurf verglich das ganze Brett mit dem Kopf des Intervalls. Das flaggte 55 % aller
ruhigen Frames, mit einem Änderungspunkt im Median bei **33 %** des Intervalls — viel zu früh für
einen Zug. Die abweichenden Zellen verrieten warum:

| | Median abweichender Zellen | häufigste Felder |
|---|---|---|
| alle 64 Zellen | 7 | e1, d1, f1, c2, g1, e2, h1 |

Das ist die Grundreihe vor dem Spieler: er beugt sich vor und wirft Schatten. Ein Zug ändert
**zwei** Felder, kein Dutzend.

### Die gezielte Frage

`known_segments` liefert `next_touches` — die Felder, die der nächste Zug anfasst, aus der
bestätigten PGN. Nur dort wird auf `stale` geprüft. Das verschiebt den Änderungspunkt dorthin, wo
der Zug wirklich passiert:

| Zeuge | Änderungspunkt p10 | p50 | p90 |
|---|---|---|---|
| alle 64 Zellen | 13 % | 33 % | 47 % |
| **nur `next_touches`** | 38 % | **89 %** | 93 % |

Die frühen Fälle bei p10 sind kein Fehler, sondern der dokumentierte Vorlauf: das Bild eilt dem
Commit um bis zu 4,6 s voraus (`measure_settle`).

Für die umgefallene Figur bleibt der Test über die übrigen Zellen, aber mit Deckel:
`MAX_CHANGED_CELLS = 4`. Mehr gleichzeitig driftende Zellen sind Licht oder Schatten, kein Kipper.
Eine Abweichung zählt außerdem nur, wenn sie **bis zum Intervallende bleibt** — was zurückkommt,
ist ein Ärmel, der vorbeizieht.

### Was die drei Entwürfe gebracht haben

67 Stellungen von `rg-2026-08-08-00-39-57`, gleiche Sensoren, nur die Klassifizierung getauscht:

| Entwurf | 8 saubere | ohne eine | saubere Bretter | Ablage: `occluded` / Rest |
|---|---|---|---|---|
| Fenster um den Commit (alt) | 20 %* | 67 von 469* | 3.063* | — |
| Hand + settle-Onset | 75 % | 9 | 428 | 256 / 280 |
| Brett, alle 64 Zellen | 82 % | 4 | 469 | 83 / 453 |
| **Brett, nur `next_touches`** | **91 %** | **1** | **515** | **394 / 142** |

<sub>* korpusweit gemessen, die übrigen Zeilen auf dieser einen Session.</sub>

Die zweite Spalte von rechts ist die wichtigere: `occluded` heißt echte Hand über **bekannter**
Stellung, und nur daraus lassen sich Occlusion-Labels ableiten. Der letzte Schritt hat davon fast
das Fünffache geliefert.

### Was die 8 Bretter NICHT sind

Sie sind nicht über die Stellung verteilt, sondern über deren sauberes Fenster: 56 % der
Stellungen liefern ihre acht aus unter 2 s (Median 1,7 s). Das ist kein Mangel — innerhalb einer
Stellung steht das Brett still, die acht unterscheiden sich ohnehin nur in Rauschen und Licht.
Sie existieren, damit jede Stellung gleich schwer wiegt, nicht für zeitliche Vielfalt.

### Kein Posen-Dedup

Naheliegend wäre, zwei Frames derselben Hand als einen zu zählen (IoU über den Rillen-Feldern, wie
es der alte `matte.scan_session` tat). Gemessen auf 00-39-57: von 394 gewählten `occluded`-Frames
blieben 303 übrig — 23 %, also 0,3 h SAM-3-Zeit. Zu wenig für den Aufwand, weil `pick_spread` die
Auswahl ohnehin über das Intervall streut und eine Hand sich in einer Sekunde stark verändert.

## Kosten

Ein Vorwärtsdurchlauf je Video, jeder dritte Frame (0,1 s bei 30 fps):

| Posten | Rechnung |
|---|---|
| Decode, 20 Videos | 140.632 Frames × 3,3 ms ≈ 8 min |
| Sensoren | ~47.000 × 45 ms ≈ 35 min |
| Speichern (nur Gewähltes) | ~7.500 × 218 ms ≈ 27 min |

Der Decode kostet `max(index)`, nicht `len(rows)` — `Recording.frames()` liest jeden Frame von 0
bis zum letzten gewünschten. Mehr Kandidaten zu prüfen ist deshalb fast gratis, und genau darauf
beruht der ganze Umbau.
