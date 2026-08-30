# Belichtung nach dem Brett

> Gemessen am 2026-08-29/30 auf `24117RK2CG`, dunkles Büro, nur Monitorlicht.
> Code: `tracker-runtime/camera/BoardExposure.kt`, `BoardMeter.kt`, `ExposureGovernor.kt`.

## Warum die Automatik des Geräts nicht reicht

Sie hat **eine Zahl für den ganzen Rahmen**. Ein Frame spannt aber vom dunkelsten zum hellsten
Feld 11- bis 163-fach (`tmp/dynrange.py`):

| Session | dunkelste Zelle | hellste | Spanne | +1 EV clippt |
|---|---:|---:|---:|---:|
| 2026-08-16-20-41-33 | 15,2 | 166,8 | 11× | 18,8 % |
| 2026-08-14-21-01-04 | **0,8** | 163,2 | 163× | 19,1 % |
| 2026-08-15-23-01-43 | 7,1 | 173,2 | 24× | 36,5 % |
| 2026-08-08-00-39-57 | 42,2 | 229,6 | 5,4× | 45,1 % |

Eine Blende mehr sättigt ein Fünftel des Bretts, bevor die dunkle Ecke gerettet ist. Eine Regel,
die nur die 64 Felder kennt, kann diesen Handel führen; eine Rahmenmessung nicht.

## Gestellt wird die Belichtungskorrektur, nicht Zeit und ISO

Beide Wege wurden live gegeneinander gemessen:

| | Zeit | ISO | `luma` |
|---|---:|---:|---:|
| Geräte-AE roh | 30,0 ms | 3197 | 52 |
| `AE_MODE_OFF`, Sensor am Anschlag | 66,7 ms | 3188 | **65** |
| AE mit +1,0 EV | — | — | **88** |
| AE mit +1,7 EV (die Regelung) | 30,0 ms | 3189 | **109** |

Manuell fällt die ISP-Verstärkung und das Tonemapping des Geräts weg — der Sensor allein kommt
nicht dorthin, wo die ganze Kette hinkommt. Der manuelle Pfad wurde deshalb wieder ausgebaut.

**Was der Sensor-Auszug trotzdem zeigt und was offen bleibt:** das Gerät fährt 30,0 ms, obwohl die
Bildperiode bei 15 fps 66,7 ms hergibt, und bezahlt die fehlende Zeit mit fast maximalem ISO. Der
manuelle Lauf bewies, dass 66,7 ms bei ISO 2295 möglich sind — dieselbe Helligkeit bei **28 %
weniger Verstärkung**. Diese Aufteilung ist über die Belichtungskorrektur nicht steuerbar.

## Die Regel

Aufgehellt wird auf ein Perzentil der dunklen Felder (nicht auf das dunkelste: ein schwarzes Feld
unter einer Figur ist kein Grund, das halbe Brett zu sättigen), gedeckelt durch die Luft in den
Spitzlichtern. Drei Dinge, die beim Bauen jeweils falsch waren:

1. **Ein Regler, der bei Sättigung gegensteuert, pendelt.** Über 250 sagt jeder Pixel dasselbe,
   egal wie weit er drüber liegt — die Information zum Gegensteuern ist zerstört. Die erste Fassung
   lief auf zwei von fünf Aufnahmen in einen Grenzzyklus mit dem Produkt exakt 1,0. Ersetzt durch
   eine **monoton fallende Sperrklinke**, die nur aufmacht, wenn die Spitzlichter echte Luft zeigen.
2. **Gamma fehlte.** Der Analyzer-Frame ist gamma-codiert, die Belichtung ist linear: ein Feld von
   12 auf 34 zu heben kostet `(34/12)^2,2` — 3,4 EV, nicht 1,5. Ohne die Umrechnung stellt die
   Regelung systematisch zu wenig und hält sich für fertig.
3. **Ein Testbild, das auf die Verstellung nicht reagiert,** misst eine Physik, die es nicht gibt.
   Der Einschwing-Test rendert das Brett aus dem aktuellen Stellwert.

## Was sie live tut

```
optics steered,                            +1,0 EV   ← der gespeicherte Wert des Nutzers
optics steered (Sensor 30,0 ms ISO 3189),  +1,7 EV   ← EIN Schritt, danach Ruhe
luma = 109,0  109,0  109,0  109,3  109,1  109,4
```

Sie startet bei dem, was auf dem Schieber steht, statt es zu überschreiben. Ein Schritt von 0,7 EV
(der Schrittdeckel), dann eine einzige Optik-Zeile und Stille. Kein Pendeln.

**Jede Verstellung verwirft die Pixel-Referenz** (`EngineAction.CaptureBaseline`) — der Frame-Diff
liest die Helligkeitsstufe sonst als Bewegung. Der Preis einer Verstellung ist also ein verlorener
Zug, nicht ein verlorener Frame. Deshalb Totband, Schrittdeckel, Messung nur jeden 30. Frame, und
eine Sperre von 60 Frames nach jedem Frame, der die Engine beschäftigt hat.

## Sie hellt auf, sie blendet nicht ab (2026-08-30)

Gemeldet: „der auto ev und iso kram dunkelt gut belichtete bilder ab". Stimmt, und der Weg dahin
war die Sperrklinke, nicht der Aufhellwunsch. Sie fällt bei `clippedFraction > clipCap` (2 %) auf
`ev - 0,4`, und zwar unabhängig davon, ob die Regelung je aufgehellt hat. Ein gut belichtetes
Brett mit ein paar Spitzlichtern — jede Lampe, jede weiße Figur im Streiflicht — lief damit
Schritt für Schritt nach unten. Über `desiredStepEv` konnte es nicht kommen: bei 8-Bit-Werten ist
`headroom` höchstens `2,2 * log2(250/255)` = **-0,06 EV** und liegt immer im Totband.

Der Boden ist jetzt der Schieberwert des Nutzers (`nextExposure(baseEv = …)`):

- **darüber** regelt sie frei — das Aufhellen ist unverändert;
- **darunter** nie, auch die Klinke nicht. Zurückgenommen wird nur die eigene Aufhellung.

Abblenden bleibt damit bei der Geräte-AE und beim Schieber, und das ist die ehrliche Aufteilung:
die Regelung ist gebaut, um eine zu dunkle Szene lesbar zu machen, nicht um zu belichten.

Stellt der Nutzer den Schieber während des Betriebs, ist sein neuer Wert der neue Boden — der
Governor erkennt das daran, dass `evIndex` von etwas anderem als ihm selbst geändert wurde.

**Wer regelt, sagt es.** Jede Verstellung verändert das Bild, aus dem der Tracker liest. Beim
Beginn einer Aufhell-Episode (nicht bei jedem Schritt) meldet der Governor eine `ExposureNotice`,
und der `TrackerService` macht daraus einen Toast: „Dark board detected — brightening by +0,7 EV".

## Die 10,0 ms sind nicht verhandelbar (2026-08-30, dreifach gemessen)

Der Sensor-Auszug zeigte immer dasselbe Paar: **Zeit 10,0 ms, ISO variabel**. Der Verdacht lag
nahe, die Bildraten-Spanne deckle die Belichtungszeit — bei `[30,30]` sind es 33,3 ms. Also drei
Versuche, der Automatik mehr Zeit zu erlauben, ohne sie abzuschalten:

| Eingriff | erlaubt | gefahren |
|---|---:|---:|
| `CONTROL_AE_TARGET_FPS_RANGE = [15,15]` (15 fps) | 66,7 ms | **10,0 ms** |
| `CONTROL_SCENE_MODE = NIGHT` | — | **10,0 ms** |
| `CONTROL_AE_ANTIBANDING_MODE = OFF` | — | **10,0 ms** |

Das ISO wanderte dabei frei (329, 231, 237, 196, 162), die Zeit kein einziges Mal. Es ist also
weder das Flimmer-Raster (20 und 30 ms waeren ebenfalls Vielfache von 1/100 s und wurden nie
gewaehlt) noch ein Szenenziel, sondern eine Festlegung des Geraete-Tunings. Bei 15 fps laesst das
Telefon 85 % seines Zeitbudgets liegen und bezahlt sie mit Verstaerkung.

**Damit ist der Weg zu Ende, der die Automatik anlaesst.** Bleibt nur `AE_MODE_OFF`, und der ist
oben schon gemessen und verworfen: manuell faellt die ISP-Verstaerkung weg, und der Sensor allein
kommt nicht dorthin, wo die ganze Kette hinkommt (65 gegen 109 luma).

Was das praktisch heisst: **das ISO ist keine Stellschraube dieser App.** Wer das Rauschen senken
will, muss die Szene beleuchten. Sichtbar ist es seit heute wenigstens — `OpticsLock` schreibt
`sensor <ms> ISO <n>`, sobald sich eine der beiden Zahlen merklich bewegt, und nicht mehr nur bei
einer Verstellung der Regelung.

## Zwei Fallen beim Verdrahten

- **Zeit/ISO gehören nicht in `CameraLook`.** Dort lagen sie zuerst, und
  `AppSettings.cameraLook()` baut den gespeicherten Blick ohne dieses Feld neu — jedes
  Neu-Anwenden setzte die Einstellung auf `null`. Live beobachtet: sie kam an, war vier Minuten
  später weg, und der Tracker blieb im dunklen Fenster hängen.
- **`setExposureCompensationIndex` ist ein AE-Aufruf** und holt `CONTROL_AE_MODE` zurück auf ON.
  Solange manuell gestellt wurde, hätte der Helligkeitsschieber die Automatik still abgeschaltet.
