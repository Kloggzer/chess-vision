# Erreichbarkeit ohne Bilder — der synthetische Engine-Fuzzer (2026-09-20)

## Warum

Das Knopf-Screening (`docs/knopf-screening.md`) fand 13 Knöpfe, die an beiden Rändern ihres
plausiblen Bereichs **keinen einzigen Frame** anders machen. Das beantwortet aber nicht, ob sie
tot sind: ein Knopf kann stumm sein, weil seine Situation im Material fehlt, weil ein Tor davor
immer zuerst auflöst, oder weil er gar nicht angeschlossen ist. Um das zu trennen, braucht es
Läufe, die man zu Tausenden fahren kann — also ohne Video, ohne Warp, ohne Inferenz.

## Der Treiber

`FrameInput` trägt die drei teuren Größen als blanke Zahlen:

```kotlin
val motionRoiScore: Double
val gridLineCoverage: Double
val lumaPreClahe: Double
```

Die muss niemand rendern. `EngineFuzz.kt` fährt `TrackerEngine` direkt: ein synthetisches Brett
(Feldfarben, Figuren als Helligkeitsversatz, Hand als dunkle Felder), eine feste legale Zugfolge,
und Beobachtungen aus `observationFromProbs` — dieselbe Funktion, die die echte Pipeline nutzt,
nur mit gesetzten statt gerechneten Wahrscheinlichkeiten.

Gemessen: **rund 0,4 s je Lauf** gegen 12,5 s für ein Replay mit warmem visuellem Cache und 42,7 s
ohne, also **30× bis 100× billiger**.

## Zwei Fallen, beide gemessen

**Die Textur darf nicht je Frame würfeln.** Der erste Entwurf zog das Rauschen aus
`(seed, seq)`. Damit war jedes Bild maximal verschieden vom vorigen, die Engine sah in jedem Frame
das ganze Brett wechseln und stand dauerhaft auf `moving` — 0 von 6 Halbzügen committet. Ein
ruhendes Brett muss bytegleiche Frames liefern.

**Ein Rauschfeld für alle Füllungen ist schneller und falsch.** Der zweite Entwurf zog EIN Feld je
Lauf und addierte nur den Helligkeitsversatz. Dann ändert eine ankommende Figur die Struktur
nicht, der Census liest einen Schatten statt einer Figur — wieder null Commits. Es braucht ein
Feld **je Füllung**; das ist immer noch O(1) je Frame, weil es sechs Füllungen gibt.

**Figuren dürfen nicht alle heller sein als das leere Feld.** `BaselineOcclusion.isOccluder`
wertet `curMeans[i] >= refMeans[i]` konservativ als Verdeckung. Mit durchweg hellen Figuren blieb
der Lauf nach drei Zügen in „waiting for occluded squares to clear" stehen. Seitdem trägt das
Brett Feldfarben, weiße Figuren sind heller, schwarze dunkler.

Alle drei hängen an `EngineFuzzTest`: der Test prüft, dass die Engine die synthetischen Züge
wirklich **committet**. Ohne ihn meldet ein kaputter Treiber jeden Zustand als unerreichbar und
sieht dabei grün aus.

## Die Hülle

Ein Fuzzer, der `motionRoiScore = 0.9` auf ein stehendes Bild setzt, beweist nur, dass der Code
den Zustand HAT. Ob die Eingabe vorkommt, sagt der Korpus: die 1 066 309 Trace-Frames des
Screenings tragen denselben Eingabevektor je Frame. Gemessen auf den BASIS-Armen (11 001 Frames):

| Achse | min | p01 | Median | p99 | max |
|---|---|---|---|---|---|
| `motion` | 0,000 | 0,000 | 0,469 | 30,116 | 99,992 |
| `gridCoverage` | 0,000 | 0,714 | 1,000 | 1,000 | 1,000 |
| `cnnCoverageMax` | 0,000 | 0,000 | 0,003 | 1,000 | 1,000 |
| `cnnHandSquares` | 0 | 0 | 0 | 35 | 47 |
| `cnnAgeMs` | −1 | 0 | 0 | 34 | 41 |
| `stableFrames` | 0 | 0 | 0 | 186 | 220 |

Die Achsen sind **nicht unabhängig**: niedrige `gridCoverage` kommt nur zusammen mit hoher
`motion` vor — eine Hand, die die Linien verdeckt. Wer die Ränder einzeln zieht, baut Szenen, die
es nicht gibt. `Envelope` hält vorerst nur die Ränder; die Kopplung ist notiert, nicht erzwungen.

## Erster Lauf: 2 000 Ziehungen, 717 s

Gegen die BASIS-Arme des Korpus (11 001 Frames). `max` ist die hoechste Haeufigkeit, die EINE
Ziehung erreicht hat.

| Zustand | Korpus | Fuzzer |
|---|---:|---:|
| `gate:dark` | **0** | **829** |
| `gate:moving` | 5 991 | 876 |
| `gate:detect` | 3 050 | 297 |
| `gate:settling` | 1 936 | 268 |
| `gate:occluded` | 24 | 119 |
| `stuck:too_many_changed` | 311 | 577 |
| `stuck:no_legal_move` | 1 048 | 276 |
| `stuck:occluded` | 84 | 248 |
| `stuck:cnn_desync` | 8 | 484 |
| `verify:confirmed` | 5 283 | 533 |
| `verify:resynced` | 4 856 | **0** |
| `verify:ghost` | 397 | **0** |
| `verify:verifying` | 181 | **0** |
| `verify:shadow` | 58 | **0** |
| `verify:overruled` | 0 | **0** |

Zwei Luecken, in entgegengesetzte Richtungen.

**Der Fuzzer erreicht einen Zustand, den der Korpus nie zeigt.** `gate:dark` feuert 829-mal; in
1 066 309 echten Trace-Frames kommt er kein einziges Mal vor. Der Dunkelframe-Pfad ist erreichbar,
nur nicht in diesem Material — und dunkles Material ist im Projekt ausdruecklich die
Haerteprueffung, die Bedingung ist also keine Fantasie.

**Wichtiger ist die Luecke andersherum: der Fuzzer erreicht `verify:resynced` nie, obwohl der
Korpus 4 856 davon traegt** — es ist dort der zweithaeufigste Verify-Zustand ueberhaupt. Dasselbe
fuer `ghost`, `verifying` und `shadow`. Damit ist der Treiber als Erreichbarkeits-Orakel **noch
nicht gueltig**: seine Nullen sind kein Befund, sondern seine eigene Luecke. Solange er die
Zustaende nicht reproduziert, die das echte Material nachweislich erzeugt, darf aus einer Null
nichts geschlossen werden.

Das ist zugleich das Abnahmekriterium: **die Zustands-Vokabel des Korpus ist die Eichung.** Erst
wenn der Fuzzer sie trifft, taeugt ein Nicht-Erreichen als Aussage.

Wo er heute schon traegt, traegt er deutlich: `stuck:cnn_desync` steht im Korpus bei 8 Frames und
im Fuzzer bei 484, `gate:occluded` bei 24 gegen 119. Fuer genau diese Knoepfe — die stummen —
liefert die synthetische Bahn also mehr Gelegenheiten als der ganze Screening-Satz, und das
60-mal billiger.

## Was der Ansatz NICHT kann

Fuzzing findet einen Pfad, es schließt ihn nie aus. Ein Zustand, den 2 000 Ziehungen nicht
erreichen, ist **nicht bewiesen tot** — er ist ungefunden. Wer Totstellen beweisen will, braucht
symbolische Ausführung (Pfadbedingung UNSAT), und die skaliert über eine Schleife von tausend
Frames nicht.

Und die Zufallssuche hat kein Gefälle: ein Zustand, der nie feuert, gibt ein Ja/Nein-Signal ohne
Richtung. Die Literatur löst das auf beiden Seiten gleich — AFLGo über die **Distanz** im
Aufrufgraphen, S-TaLiRo über die **Robustheit** der Bedingung. Für uns hieße das: statt „feuerte
`overruled`" den minimalen Abstand zur Verzweigungsbedingung über den Lauf. Das ist der nächste
Schritt und noch nicht gebaut.

## Einordnung in die Literatur

- **AFLGo** (Böhme et al., CCS 2017) — gerichtetes Greybox-Fuzzing auf Zielstellen.
- **Targeted PBT** (Löscher & Sagonas, ISSTA 2017) — Suchstrategie statt Zufallsgenerator; das
  Gegenstück für reellwertige Knöpfe.
- **Zest / JQF** — Coverage- UND Validitäts-Feedback; genau unser Hüllen-Problem.
- **S-TaLiRo / Breach** — Falsifikation reaktiver Systeme über einen parametrisierten
  Eingaberaum. Das ist die Form, die unserem Problem wirklich entspricht.

Keine dieser Bibliotheken ist eingebunden. Die Suche in `FuzzSearch.kt` ist eine Zufallssuche;
`scripts/optimise_knobs.py` trägt bereits Constrained-TPE über denselben Parameterraum, und
Erreichbarkeit ist dieselbe Suche mit anderem Ziel.

## Bedienung

```
desktop fuzz [laeufe] [seed] [out=<datei>]
```

Lädt kein OpenCV und braucht keine Aufnahme. Ausgabe: je Engine-Zustand die höchste erreichte
Häufigkeit und die Szene plus Konfiguration, die sie erzeugt hat.
