# `multireplay`: N Konfigurationen in einem Durchgang — gemessen 1,8x, vorhergesagt 6,5x

## Was es ist

`replay <video> configs=<datei>` faehrt zusaetzliche Engines im SELBEN Bilddurchgang. Die Datei
traegt je Zeile einen Namen und die Knoepfe, die er gegen den Hauptlauf aendert:

```
t000 motionThr=0.31 commitHoldS=0.042
t001 motionThr=0.44
```

Jede Zusatz-Engine bekommt ihren eigenen Bewertungsblock. **Ohne `configs=` entsteht nichts** —
der Hauptpfad ist Anweisung fuer Anweisung der alte, `buildStack` wurde nicht angefasst.

## Der Nachweis

Eine Zusatz-Engine mit DENSELBEN Werten entscheidet **Ply fuer Ply, Frame fuer Frame, Entscheider
fuer Entscheider** wie der Hauptstack. Regressionssatz danach: **396/3/0/171 bei 5 Alarmen**.

## Die Messung, und warum die Vorhersage dreimal falsch war

| | Zeit fuer 10 Konfigurationen |
|---|---|
| zehn Einzellaeufe | 349 s |
| erste Fassung | **493 s** (langsamer!) |
| eine ONNX-Sitzung statt elf | 486 s |
| **Crop-Schnitt je Frame einmal** | **199 s** |

Vorhergesagt hatte ich nacheinander 3,4x, 6,5x und 14,7x. Gemessen: **1,8x**.

**Der Fehler war jedes Mal derselbe.** Ich habe die Laufzeit in die Posten zerlegt, die
`chesslabPerf` zeigt — `warp`, `gray`, `engine` — und den groessten uebersehen, weil er dort nicht
auftaucht: die CNN-BEOBACHTUNG liegt in `POST`, und `POST` wird hoechstens einmal pro Sekunde
protokolliert.

Aufteilung eines Laufs (1 944 Frames, 34,9 s), aus den Messungen rekonstruiert:

| Posten | Zeit | teilbar? |
|---|---|---|
| **Beobachtungen** (981 x ~20 ms) | **~19,6 s (56 %)** | Crop-Schnitt ja, der Rest nein |
| Pixelarbeit (Warp, Grau, Grid) | ~7,8 s | ja |
| fester Aufwand (JVM, Modell, Vorlauf) | 3,6 s | ja |
| Engine (Diff, Census, Zustand) | ~1,7 s | nein |

Der ganze Gewinn kam aus EINER Aenderung: die Crops haengen an (Frame, Ecken, Geometrie), nicht an
der Konfiguration, und wurden trotzdem je Engine geschnitten. Der Beobachtungs-Cache half dabei
nicht, weil sein Schluessel der Crop-INHALT ist — geschnitten werden muss vor dem Nachschlagen.

## Was es NICHT bringt

**1,8x ist schlechter als vier parallele Einzelprozesse (2,1x gemessen).** `multireplay` lohnt nur
in Kombination — zwei Prozesse zu je zehn Konfigurationen waeren grob 3x —, und das setzt voraus,
dass der Optimierer auf Batch-Betrieb umgestellt wird (TPE braucht sonst seine Rueckmeldung je
Versuch). Diese Integration steht aus.

**Wo es sich lohnt, ohne Umbau:** Messreihen, deren Punkte ohnehin vorab feststehen und nicht
voneinander abhaengen — ein Gitter, eine Morris-Sensitivitaetsanalyse, eine Schwellenkurve. Dort
ist die Batch-Groesse frei waehlbar und der Faktor voll mitzunehmen.

## Die zwei Fehler, die beim Bauen auffielen

- **`onGeometryChanged` ruft intern `dropChain()`.** Zehn Engines mit derselben Geometrie warfen
  die Bildkette zehnmal weg; die zweite riss mitten im Frame der ersten ab. Jetzt wird nur eine
  ECHTE Aenderung durchgereicht. Der Lauf starb laut nach 4,6 s — das beste Verhalten, das ein
  solcher Fehler haben kann.
- **Jede Engine oeffnete ihre eigene ONNX-Sitzung.** Elf Sitzungen zu je vier Threads, und elf
  getrennte Memos drueckten die Cache-Trefferquote von 100 auf 72 %. Jetzt teilen sich alle eine.

`SharedFrameWork.warpDetection` bricht ab, wenn zwei Engines verschiedene Ecken wollen — geteilte
Pixel, die nicht zusammengehoeren, waeren ein Fehler, den keine Zahl der Auswertung zeigt.
