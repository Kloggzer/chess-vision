# Der visuelle Cache: 3,4x je Lauf, weil 60 Versuche dieselben Frames beobachten

## Die Messung

`2026-08-08-11-55-19`, 1 944 Frames, unter Last (der Optimierer lief daneben):

| | Zeit |
|---|---|
| ohne Cache | 42,7 s |
| Cache BAUEN (einmalig) | 41,1 s |
| **Cache lesen** | **12,5 s** |
| **Cache lesen, FREMDE Konfiguration** (`motionThr` 0,45 statt 0,25) | **12,7 s** |

**3,4x**, und der Cache misst **6 MB**.

## Warum das geht

`CropFrameStore.CachedVisual` traegt `observation` und `gridOccluded`. Beide haengen an
(Frame, Ecken, Geometrie, Modell) — an **keinem Engine-Knopf**. `gridOccludedSquares` nimmt gar
keine `TrackerConfig`, sein Pad kommt aus `cropBorderPx(gridGeom)`.

Die Datei traegt einen Kopf mit Videopfad, -groesse, -datum, Modell und
`visualCacheSignature(...)` ueber Geometrie, Quad, Ausrichtung, Bildrate. Ein Cache aus einem
anderen Zuschnitt kann also nicht still gelesen werden — die Absicherung war schon da.

## Die Gegenprobe

| Lauf | Ergebnis | Plies-Hash |
|---|---|---|
| ohne Cache | 15/0/0/3 | `6176387d` |
| Cache, gleiche Konfiguration | 15/0/0/3 | **`6176387d`** |
| Cache, `motionThr=0.45` | 15/0/0/3 | **`7c141f54`** |

Der Cache reproduziert exakt UND ueberschreibt das Engine-Verhalten nicht: eine andere Schwelle
entscheidet weiterhin anders. Beides zusammen ist der Nachweis.

## `visualcache-partial`

Der Beobachter arbeitet im Wechsel aus Anfordern und Ausliefern und sieht **hoechstens jeden
zweiten Frame** — gemessen 200 von 400, und kein Knopf hebt das auf (`cnnCooldownS=0`,
`cnnCheckIntervalS=0.001`, `refusedStreakForEval=1` aendern nichts). Ein Bau-Lauf kann den Cache
also gar nicht lueckenlos fuellen, und die Verify-Leiter laesst andere Konfigurationen wieder
andere Frames anfordern.

`lookup` wirft deshalb nur noch im strengen Modus. Mit `visualcache-partial` liefert es `null`,
und `CropFrameStore.cached` behandelte `null` ohnehin schon als "normal rechnen". Sicher ist das,
weil die Beobachtung eine reine Funktion der Crops ist; das strenge Werfen schuetzt vor einem
FREMDEN Cache, und dagegen schuetzt die Signatur.

## Einordnung gegen die anderen Winkel

| Winkel | Faktor | teilt ueber |
|---|---|---|
| **visueller Cache** | **3,4x** | **alle Versuche** |
| `multireplay` (`configs=`) | 1,8x | die Engines EINES Laufs |
| Racing, 5 statt 10 Aufnahmen, Parallelitaet | zusammen 6,2x | — |

Der Cache und `multireplay` greifen dieselbe Kosten an (die Beobachtung) und addieren sich
deshalb nicht. Der Cache gewinnt, weil er ueber 60 Versuche wirkt statt ueber 10 Engines.
