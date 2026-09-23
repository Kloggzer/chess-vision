# Occluder-Platten und 2.5D-Compositing

Warum Verdeckung ein gemessener Ausgang ist und keine Klasse, wie die Hand-Kacheln entstehen und
wie `occluders composite` sie auf Drehteller-Clips legt. Code: `chesslab/occluders.py`
(Freistellen), `chesslab/composite.py` (Auflegen, Label, Ingest), `chesslab/grid_occlusion.py`
(Rillen-Sensor). Verdeckung auf echten Aufnahmen: `docs/session-mattes.md`.

## 1. Warum die Klasse `occluded` ersetzt wurde

Die handmarkierte Klasse war eine Markierung mit zu grober Körnung (Korpus, 2026-08-17): **87,9 %**
aller `occluded`-Zellen stammten aus Frames mit 11 oder mehr geflaggten Feldern — ein Arm verdeckt
keine 30 Felder. Unter dem Flag sagte die FEN **59,9 % `empty`**: 12 865 leere Felder wurden als
besetzt gelehrt, 8 603 Figurenbeispiele dem Klassifikator vorenthalten.

| Fold-2-Test, 3 Seeds | mit `occluded` | ohne |
|---|---|---|
| Recall `empty` | 0,908 | **0,989** |
| Recall `wK` | 0,268 | 0,471 |
| Recall `bK` | 0,224 | 0,690 |

Über den ganzen Korpus bestätigt (2026-08-18, vier Folds, gepaart): **4 von 4** verbessern sich bei
`square_acc` (Median 0,8593 → 0,9129) und bei `wK` (0,483 → 0,851).

Gebraucht wird Verdeckung trotzdem — als Veto, damit kein Zug fällt, während eine Hand über dem
Brett liegt. Nur nicht im selben Softmax: „könnte beeinflusst sein" konkurriert dort mit „das ist
ein Bauer" und gewinnt, wo das Modell ohnehin unsicher ist. Deshalb ein **zweiter Ausgang** mit
**kontinuierlichem** Ziel (`coverage`), das der Composite exakt kennt, statt eines Ja/Nein, das
jemand urteilen musste.

## 2. Freistellen ohne Green Screen

- **Kein Clean Plate nötig.** Kamera fest, Arm bewegt: der zeitliche Median IST der leere
  Hintergrund. Zweistufig — der zweite Durchgang mittelt nur über Samples, die zu **einer
  globalen** Hintergrundfarbe passen, sonst wird eine lang stehende Hand selbst zum Median.
- **Chroma statt Farbton, Schwelle per Otsu je Clip.** Ein Festwert geht nicht: ein Schatten
  verschiebt die Farbe auf gesättigtem Blau stärker (0,18) als auf entsättigtem Oliv (0,11), Haut
  noch weiter (0,62 gegen 0,22) — der Abstand sitzt je Hintergrund woanders.
- **Schatten ist Hintergrund**, sonst kehrt die Überflaggung zurück. **Zusätzliches Licht auch:**
  ein Helligkeitszweig hielt eine von einer Lampe überstrichene Matte fest und ist raus.
- **Dunkler Ärmel ≠ Schatten.** Ein Schatten fällt nie unter ~45 % des Hintergrunds (Tuch 118,
  Ärmel 20–26, Restschatten 39–61).
- **Morphologie darf keinen Schatten annektieren:** sichere Schattenpixel werden nach dem `CLOSE`
  wieder ausgestanzt.
- **Doppelte Posen** über die IoU auf 1/8 verkleinerten Silhouetten verworfen (volle Auflösung
  823 ms bei 500 Posen; die Verkleinerung verschiebt die IoU um höchstens 0,006, kippt am Schnitt
  0,85 nichts).
- **Löcher nicht nach Topologie allein füllen:** eine zur Schlaufe gekrümmte Hand schließt
  Hintergrund ein, der offen bleiben muss (`matte.MAX_HOLE_FRAC`).

**SAM 3 für die Kacheln: geprüft und verworfen (2026-08-21).** 30–60 % mehr Fläche und präzisere
Ränder, aber 3–4 s je Bild gegen Millisekunden, und ein Blindtest über 13 Zeilen blieb ohne klares
Urteil. Die Kachel wird auf die BÜHNEN-Box beschnitten; eine Hand, die über die Mattenkante ragt,
ist dort abgeschnitten (`230602`: 456 von 456).

**Aufnahme:** Kamera fest aus Brettposition, Hintergrund formatfüllend, **gleichmäßig
ausgeleuchtet** (harter Schattenwurf ist der einzige Fall, den die Trennung nicht schafft),
Belichtung und Weißabgleich sperren — sonst rechnet `rebalance` Drift bis Faktor 1,405 heraus.

## 3. Auflegen

- **Auf das Quellbild, nicht auf das entzerrte Brett:** eine echte Hand liegt über der Brettebene;
  nach dem Warp einkopiert läge sie perfekt in der Ebene. Die Alpha läuft durch denselben Warp.
- **Position, Winkel, Spiegelung gewürfelt, die Größe nicht.** Die Occluder-Clips entstanden auf
  demselben Rig mit näherer Kamera: Maßstab `Bildkante / WORK_SIZE * RIG_SCALE`, die Kachel auf ihre
  Alpha-Ausdehnung beschnitten. Ohne brauchbaren Index sagt die Kachel selbst, in welcher Auflösung
  sie geschnitten wurde — die Rückfallkonstante ist die alte Arbeitsgröße.
- **Gemessen über den Crop-Ausschnitt**, mit demselben `crops_for_frame`-Aufruf, der das Bild
  schneidet: die Label-Region ist per Konstruktion die Crop-Region, Mesh und Pads eingeschlossen.
- `over` blendet in uint8 durch OpenCV (4,6 ms je Kachel statt 16,6 in float32), höchstens 1
  Grauwert Unterschied.

## 4. Drehteller: `--clean`, `--angle-buckets`, Stride

- **`--clean`** lässt das Frame unberührt. Der Beitrag des Drehtellers ist **dieselbe Figur über
  die ganze Drehung**; der echte Korpus zeigt jede Situation in einer Orientierung. Coverage 0 ist
  hier die **Wahrheit**, nicht die fehlende Messung der Matte-Falle.
- **`--angle-buckets N`** rechnet modulo einer Umdrehung (`DEG_PER_FRAME` 0,43 Grad, 837 Frames je
  Umlauf): dieselbe Ansicht aus verschiedenen Durchgängen landet im selben Eimer, weil `--balance`
  über Situationen mittelt und eine Situation eine Ansicht ist. `blocks` schneidet dagegen
  fortlaufend — bei 1,1 bis 3,1 Umdrehungen je Clip taugt das nicht als Winkel-Eimer.
- **Der Stride** steuert Crops je Eimer, nicht die Zahl der Situationen. Stride 8 ≈ 3,4 Grad; über
  240 Bretter je Clip (1 Grad) sind Nachbarn identisch.
- **Sauberes Drehteller-Material allein SCHADET** (32 512 Crops, 11 % des s2-Mischsatzes):
  `vis_piece` 0,7585 → 0,7186 (ohne Balance) bzw. 0,6510 (mit), obwohl `cov_prec` steigt. Ursache
  ist die Domäne: **+39 % Sättigung** gegen den Korpus. Zu wenig von einer neuen Domäne stört,
  statt gelernt zu werden; mit `comp13-v4` daneben kippt das (`docs/evaluation.md`).
- `pad_side` übersteuert das Profil und muss zum Rand der ECHTEN Crops passen.

## 5. Tempo des Composite-Ingests (2026-08-23, 4K-Drehteller)

- **Lesen:** `cap.set` + `read` 235 ms je genutztem Frame, `grab` überspringen und `retrieve` nur
  für den genutzten **39 ms** (`composite.read_forward`, eigener Thread). Die Zeit steckte in der
  BGR-Umrechnung der verworfenen Frames. **Hardware-Decode hilft nicht:** der Rückweg in den
  Hauptspeicher kostet mehr, als er spart (`d3d11va` 4,78x Echtzeit gegen 9,36x in Software).
- **Schreiben:** `WRITE_THREADS = 8` (64 Crops: seriell 185 ms, 4 → 52, 8 → 33, 16 → 36), vier
  Bretter Rückstau.
- **Kacheln:** eine Kachel kostet 89 ms von der Platte, alle 1440 im Speicher wären 18,7 GB.
  `tile_stream` lädt voraus (8 Lader: 117 ms je Brett); `TILE_LOOKAHEAD = 6` — 12 brachten auf 4K
  nichts und kosteten auf 1080p 20 %. Die Auswahl zieht aus einem EIGENEN Zufallsstrang
  (`seed + 1`), sonst verschöbe das Vorausziehen die Posen.
- Ein 4K-Clip mit 519 Brettern: 107 s → 61 s.

## 6. Der Rillen-Sensor: Auflösung ist tragend, und c8 ist der stehende Falsch-Positive

`GridOcclusion.kt` / `grid_occlusion.py` hält den bandweisen Rillen-Read des Alignment-Fits **pro
Segment**: 2 Achsen × 9 Linien × 8 Bänder, ein Segment je Feldkante; ein Feld liest `occluded` ab
**2 fehlenden Kanten**. Zwei Regeln, gemessen 2026-08-09/10 (`specs/53`):

- **Volle Auflösung oder nichts:** im Crop-Warp 2 / 11 / 2 fehlende Segmente auf sauber / Hand /
  sauber; bei detSize 30–40 von 144 ersäuft das Signal.
- **Eine Hand ist ein orthogonal benachbartes PAAR.** Auf `VID_20260802_222741` ist c8 — eine
  Figur, die über ihre eigenen Rillen lehnt — auf 73 % aller Frames geflaggt.

| Gate-Regel | 003957 (67-Ply-Referenz) | 222741 (ohne Gate 28 Plies) |
|---|---|---|
| jedes Flag | 67/67, 0 erfunden | **0 Plies** — c8 blankt das Replay |
| Zählschwelle ≥ 3 | 39 Plies | 28 |
| **benachbartes Paar** | **67 Plies, LCS 65/67** | **28** |

Die abziehende Hand läuft über 2-Flag-Frames aus (immer Nachbarn), also committet eine Schwelle von
3 genau die Fabrikation, die das Gate verhindern soll. Räumlich, pro Beobachtung, ohne Zeitzustand
(`gridHandSquares`, `SQ_NEIGHBOURS`).

## 7. Der Pool `comp13-v3` (Stand 2026-08-23)

`data/` ist gitignored — diese Liste ist der Nachweis des Pools. `occluders composite --tag
comp13-v3` je Clip, Stride 8, `out_size` 128, 0–2 Kacheln je Brett, `--seed 42`: **4 523 Bretter,
289 472 Crops**, je Clip 10,6–12,7 % über 50 % verdeckt (der Anteil hängt am Kachel-Zufall, nicht
an der Quelle).

| Quelle | Stellung | Bretter |
|---|---|---|
| `2026-08-09 20-48-50` | Grundstellung | 965 |
| `VID_20260731_092133` | Grundstellung | 389 |
| `VID_20260731_222043` | K/D vertauscht | 84 |
| `VID_20260731_222320` | K/D vertauscht | 108 |
| `VID_20260812_112853` | `rnbqkb1r/ppp1pppp/5n2/3p4/3PP3/2N5/PPP2PPP/R1BQKBNR` | 678 |
| `VID_20260817_214400` | Grundstellung | 499 |
| `VID_20260823_120131` | Grundstellung (4K) | 351 |
| `VID_20260823_120426` | eine Reihe zur Mitte (4K) | 519 |
| `VID_20260823_120721` | zwei Reihen zur Mitte (4K) | 347 |
| `VID_20260824_005850` | zwei Reihen zur Mitte, dunkelorangem Licht (4K) | 337 |
| `VID_20260824_013627` | Figuren und Bauern getauscht (4K) | 246 |

FEN der 4K-Aufnahmen: `data/footage/turntable/README.md`. Die zur Mitte verschobenen Aufstellungen
setzen jede Figur auf die andere Feldfarbe; `013627` stellt Figuren auf Reihe 2/7 und Bauern auf
1/8 — dort las das Modell eine Figur zu 80 % als Bauer. `005850` ist die erste andere Lichtfarbe:
beide Modelle brachen dort ein (Bauern 44–76 %, `bP -> wP` häufigster Fehler;
`docs/tracker-flow.md`).
