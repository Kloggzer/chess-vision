# `multireplay`: N Konfigurationen in einem Durchgang — gemessen 1,8x, vorhergesagt 6,5x

> **UNGUELTIG IN ZWEI PUNKTEN, 2026-09-23 (Codex-Bugjagd, am Log bestaetigt).** Ab dem ZWEITEN
> Zusatzarm bekam keine Engine je einen CNN-Crop: jeder `TrackerStack` besitzt einen eigenen
> `CropFrameStore`, der gemeinsam genutzte `OpenCvStages` wurde aber mit dem Store des ERSTEN
> Zusatzstacks gebaut, und `croppedSeq` verhindert jede weitere Zustellung. In
> `tmp/batch/multireplay/zehn4.log`: Hauptlauf 15/0/0, `k1` 15/0/0, **`k2` bis `k10` je 0/15/0** —
> acht Logs, **72 ungueltige Arme**.
>
> 1. **Der Paritaetsnachweis unten ist leer.** Er lief mit EINEM Zusatzarm — dem einen Fall, in dem
>    der Fehler nicht auftritt.
> 2. **Die 1,8x sind nicht gemessen, was sie behaupten.** Sie entstanden mit genau der Aenderung,
>    die den Fehler einbaute ("Crop-Schnitt je Frame einmal"), und danach machten neun von zehn
>    Armen keine CNN-Arbeit mehr — laut der Tabelle unten 56 % der Laufzeit. Die echte Zahl liegt
>    darunter und ist nicht gemessen.
>
> **Keine Engine-Entscheidung stand darauf:** kein Skript ruft `configs=` auf, und der Optimierer
> lief ueber den visuellen Cache. Zu reparieren ist das Werkzeug, nicht eine Messung.

## Was seit 2026-09-23 gilt

**Repariert, und zwar zwei Fehler, nicht einer.**

1. **Crops fuer jeden Arm.** `SharedFrameWork` baut `OpenCvStages` mit einem EIGENEN Store und
   warpt je FRAME einmal (nicht je `seq` — der ist je Engine gezaehlt). Jeder Arm, dessen Store
   fragt, bekommt eine Kopie: `Mat.clone()` des Warps (und des Rillen-Warps), dazu seine eigenen
   `seq`/`tsMs`/Seam-Planes. Geteilt bleibt der teure Teil, der Warp; die Kopie ist ein `memcpy`.
   Das Schneiden der 64 Felder lag schon immer je Arm im `cropFrameSource` — es lief vorher nur
   in einem Arm, weil die anderen nichts bekamen.
2. **Ein Ring je Arm.** Alle Arme zogen ihre Grau-/BGR-Planes aus DEM Ring des geteilten
   `OpenCvStages` (Tiefe 6). Die Engine haelt diese Planes per Referenz (invariant 14); ab sechs
   Armen ueberschrieb jeder Frame die Planes, die die anderen noch mittelten. Jetzt wird die Plane
   einmal je Frame erzeugt und je Arm in einen eigenen `PlaneRing` (`ringDepth` seiner Config)
   kopiert.

Dazu: `ExtraEngines.open` lehnt Arme ab, die sich in `boardSize`/`detectScale`/`diffClaheClip`
unterscheiden — diese Knoepfe formen die geteilte Bildkette und galten bisher still nur fuer den
ersten Arm. Und jeder Arm druckt am Ende `cnn[<tag>]: observations=… noCrops=…`.

**Der Nachweis, der den Fehler gesehen haette:** `MultiReplayArmsTest` faehrt eine synthetische
Partie (e4, e5; Farbklassifikator, echte `ExtraEngines`, echtes OpenCV) einmal als Einzellauf und
dann mit **drei und mit sechs gleichen Armen**. Jeder Arm muss dieselben Beobachtungen, dasselbe
`noCrops` und dieselben Zuege mit Frame und Entscheider liefern, und der Crop-Warp muss gleich oft
laufen wie im Einzellauf (99, nicht 99 x N).

| | Einzellauf | vor dem Fix | nur Crop-Fix | beide |
|---|---|---|---|---|
| `k1` Beobachtungen | 99 | **195** (bekam die Crops aller Arme) | 99 | 99 |
| `k2`..`kN` Beobachtungen | 99 | **0**, `noCrops` 197 | 99 (3 Arme) / **100** (6 Arme) | 99 |

`k1` war also auch vorher nicht der Einzellauf — er sah doppelt so viele Crops. Dass seine Zuege
trotzdem stimmten (15/0/0 in `zehn4.log`), heisst nur, dass die Partie davon nicht abhing.

**Weiter ungemessen:** die 1,8x und die Tabelle unten. Beides stammt aus dem kaputten Stand.


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
