# Engine-Knöpfe: Erreichbarkeit ohne Bilder und die Herkunft der Zahlen

Das Knopf-Screening (`scripts/screen_knobs.py` + `scripts/screen_report.py`) fand 13 Knöpfe, die an
beiden Rändern ihres plausiblen Bereichs keinen einzigen Frame anders machen. Stumm kann heißen:
die Situation fehlt im Material, ein Tor davor löst immer zuerst auf, oder der Knopf ist nicht
angeschlossen. Der Regressionssatz trennt das nicht — er lieferte 396/3/0/171 mit UND ohne
Verdeckungsschutz (`docs/tracker-flow.md`, „Schlagzug auf besetztes Feld") —, also braucht eine
Freigabe, die Tore aufmacht, eine eigene Achse.

## Der Treiber (`EngineFuzz.kt`, `desktop fuzz`)

`FrameInput` trägt Bewegung, Gitterdeckung und Helligkeit als blanke Zahlen, also fährt
`EngineFuzz.kt` `TrackerEngine` ohne Dekodieren und ohne Inferenz: ein synthetisches Brett, eine
feste legale Zugfolge, Beobachtungen aus `observationFromProbs` — dieselbe Funktion wie die echte
Pipeline, nur mit gesetzten Wahrscheinlichkeiten. Die Bewegung misst das echte `RoiMotion` auf
gerenderten Pixeln (sonst kann `fuzz check` `motionPxThr`/`motionMargin` nicht prüfen); die Hand
wandert über den Zugfeldern (`handSpeed`), und jeder n-te Halbzug fällt unter sie
(`hiddenEvery`). Ein Lauf ~1,2 s, gegen 12,5 s für ein Replay mit warmem Cache. Der Evaluator ist
derselbe wie am Gerät (`cnnConfig` in `TrackerStack`), aber OHNE Prior (`CnnObserver.priorFor`
wird umgangen).

    desktop fuzz [laeufe] [seed] [out=<datei>]

**Fallen, alle gemessen, alle an `EngineFuzzTest`** (prüft, dass die synthetischen Züge wirklich
committen — sonst meldet ein kaputter Treiber jeden Zustand als unerreichbar und sieht grün aus):

- Die Textur darf nicht je Frame würfeln — ein ruhendes Brett muss bytegleiche Frames liefern.
- Ein Rauschfeld **je Füllung**, nicht eines für alle, sonst liest der Census eine ankommende Figur
  als Schatten.
- Figuren nicht alle heller als das leere Feld: `BaselineOcclusion.isOccluder` wertet
  `curMeans[i] >= refMeans[i]` als Verdeckung.
- Beide Occlusion-Arme EXKLUSIV über `coverageModel`, wie am Gerät
  (`runGridOcclusion = coverageOutput != true`). Eine Vorgabe zu ändern nützt nichts, wenn der
  Aufrufer sie überschreibt.

## Was ein Befund wert ist

**Erreichbarkeit an der Naht ist nicht Erreichbarkeit im Produkt.** `gate:dark` feuert im Fuzzer,
in 1 066 309 echten Trace-Frames nie: `FramePipeline.darkNote` verwirft den Frame auf derselben
Bedingung (`darkLumaThr`, `lumaPreClahe`), bevor ein `FrameInput` entsteht. Das Engine-Tor ist im
Produkt tot — dieselbe Prüfung zweimal. Ob die redundante Wache bleibt, ist eine Entscheidung.

**Eine Null ist nur dort ein Befund, wo der Treiber den Korpus trifft.** Die Zustands-Vokabel des
Korpus ist die Eichung. Stand (300 Ziehungen, 60 678 Frames, Anteil der Frames):

| Zustand | Fuzzer | Korpus |
|---|---:|---:|
| `gate:moving` | 15,0 % | 54,5 % |
| `gate:occluded` | 9,4 % | 0,2 % |
| `verify:confirmed` | 15,9 % | 48,0 % |
| `verify:resynced` | 2,3 % | 44,1 % |
| `verify:ghost` | 3,1 % | 3,6 % |

`ghost` trifft er, `resynced` bleibt um Faktor 19 zu selten, `moving` um 3,6 — die Szenen sind
kürzer und ruhiger als eine Partie. Wo er trägt, liefert er für stumme Knöpfe mehr Gelegenheiten
als der ganze Screening-Satz (`stuck:cnn_desync` 8 Frames im Korpus).

**Den Sensor messen, nicht seinen Ausgang.** `verify:shadow` blieb über 5 000 Ziehungen bei null,
aber das Schattenveto feuerte in 51 von 400 (`TrackerStatus.shadowVetoed`). Eine Sprosse der
Leiter ist ein seltenes Ergebnis, kein Sensor. Offen: `verify:overruled`, null im Korpus und im
Fuzzer.

**Weitere Lügen des Treibers:** feste Ecken, exakt 33 ms Takt (kein Jitter, kein Warp-Ausfall),
`board = null` (Rausch-, Fokus- und Belichtungsleser laufen nicht mit). Und Fuzzing findet einen
Pfad, es schließt ihn nie aus; eine gerichtete Suche (Abstand zur Verzweigungsbedingung, wie AFLGo
oder S-TaLiRo) ist nicht gebaut.

## Die abgestimmten Zahlen und ihre Herkunft

Eine gemessene Zahl und eine geratene sehen im Code gleich aus. In den sieben Modellen ist
`coverage_gate` **gemessen** (`docs/occlusion-gate.md`), `temperature` **gefittet** (auf val),
`prior_lambda` **keins von beidem**: exakt `4,0 × temperature`, ein Migrationswert (5,0412 bis
7,0204).

`TrackerConfig` hat 65 Felder (2026-09-22). `android/config/tuned-constants.txt` wird abgeleitet,
nicht gepflegt (`uv run python android/scripts/tuned_constants.py`), und klassifiziert NOTIERT 19,
PLATZHALTER 1 (`desyncStandoffObsN = 12`), STRUCTURAL 5, **UNGEPRÜFT 27**. Was eine Notiz wert
ist, entscheidet die Liste bewusst nicht — eine Klasse „MEASURED" aus Kommentartext zu raten wäre
genau der Fehler. `tests/test_tuned_constants.py` ist eine Ratsche: UNGEPRÜFT darf nur sinken, eine
neue Zahl kommt mit Messung oder mit einem Satz, warum sie geraten ist. Sie erzwingt keine Messung.

**Was ein Release-Kandidat nachzuholen hätte** (je Lauf ~50 min am Regressionssatz, ein Job zur
Zeit, zusammen 20–25 Läufe):

| Zahl | Stand | Messung |
|---|---|---|
| `prior_lambda` | Migration `4,0 × T` | Kurve je Modell, 7 Läufe |
| `cnnConfThr = 0.85` | Kante, vor `calibratedConfThr` gesetzt | Kurve je Modell, 6 Läufe |
| `taintIdentityThr = 0.5` | Zwei-Punkt-Befund | Kurve 0,3–0,7 auf mehr als einem Modell, ~5 Läufe |
| `zThr`, `censusThr` | ungeprüft, tragen den Frame-Diff | Empfindlichkeit, je 1 Lauf |
| `desyncStandoffObsN = 12` | erklärter Platzhalter | am Verlust-Verhalten |

**Die Naht zuerst:** `taintIdentityThr` steht in der Engine auf 0 und in der App auf 0,5. Der Wert,
der aufs Gerät geht, wird von keinem Paritätstest gefahren.
