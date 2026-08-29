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

## Zwei Fallen beim Verdrahten

- **Zeit/ISO gehören nicht in `CameraLook`.** Dort lagen sie zuerst, und
  `AppSettings.cameraLook()` baut den gespeicherten Blick ohne dieses Feld neu — jedes
  Neu-Anwenden setzte die Einstellung auf `null`. Live beobachtet: sie kam an, war vier Minuten
  später weg, und der Tracker blieb im dunklen Fenster hängen.
- **`setExposureCompensationIndex` ist ein AE-Aufruf** und holt `CONTROL_AE_MODE` zurück auf ON.
  Solange manuell gestellt wurde, hätte der Helligkeitsschieber die Automatik still abgeschaltet.
