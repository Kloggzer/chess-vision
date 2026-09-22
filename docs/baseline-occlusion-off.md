# Was trägt der Coverage-Kopf allein? (2026-09-21)

Die Frage des Nutzers: wie zuverlässig ist die Verdeckungs-Erkennung des CNN, und kann man den
Tracker testweise **ohne** die engine-eigene laufen lassen — auch ohne Schattenveto.

## Der Schalter

`baselineOcclusion` (Vorgabe AN). AUS heißt: kein Nachschub für die Verdeckungs-Fristen und kein
Schattenveto.

> **Korrektur 2026-09-21:** dieser Absatz stimmte nicht. Der Schalter deckte nur den Arm aus
> `baselineOcclusionAndShadow`; das HSV-Census-Schattenveto in `Vetoes.applyVetoes` lief weiter und
> setzte `shadowVetoed` in der Erkennung neu. Im Lauf mit Schalter AUS stand `shadowVeto=` noch
> sechsmal im Log. Seitdem hängen beide Arme am selben Schalter
> (`docs/schattenveto-2026-09-21.md`), und die Messung unten wurde mit dem reparierten Schalter
> wiederholt: **396/3/0 bei 8 Desync-Episoden, unverändert.** Das Ergebnis gilt also weiter — aber
> es galt vorher aus dem falschen Grund.

```
desktop replay <video> score set:baselineOcclusion=0
```

Verhaltensneutral nachgewiesen: mit dem Knopf auf Vorgabe liefert der Regressionssatz
**396/3/0/167 bei 7 Alarmen**, Ziffer für Ziffer wie der Lauf davor.

## Das Ergebnis: der Regressionssatz merkt es nicht

Voller Satz, zehn Aufnahmen, beide engine-eigenen Arme abgeschaltet:

| | found | missed | invented | Desync-Episoden |
|---|---:|---:|---:|---:|
| Arme AN | 396 | 3 | 0 | 8 |
| Arme AUS | **396** | **3** | **0** | **8** |

Zeile für Zeile identisch, auf allen zehn Aufnahmen.

Das ist kein „fast gleich". Der Satz kann diese Achse **überhaupt nicht** messen. Die Vermutung
stand schon länger im Raum (`396/3/0/171` kam einmal mit und einmal ohne Verdeckungsschutz heraus);
jetzt ist sie mit einem eigens gebauten Schalter belegt statt beiläufig bemerkt.

**Der Grund ist das Material, nicht der Sensor.** Der Satz trägt 24 verdeckte Frames auf 11 001 —
0,2 %. Die beiden Partien vom 2026-09-19 tragen 875 auf 988, also 89 %.

## Was darunter trotzdem passiert

Abgeschaltet ändert nichts an der Bewertung, aber die Arme arbeiten die ganze Zeit. Gemessen über
dieselben vier Aufnahmen, 11 001 Frames (`scripts/occlusion_reserve.py`):

| Arm | `changed` | `occlVetoed` | `shadowVetoed` |
|---|---:|---:|---:|
| `motionPxThr = 20` | 6 823 | 4 547 | 4 355 |
| Champion (34,544) | 8 118 | 1 423 | 3 766 |

Das Verdeckungs-Veto feuert also in Tausenden von Frames — und es ist **völlig gleichgültig für
die Bewertung dieses Satzes**. Beides gleichzeitig wahr: der Schutz arbeitet, und wo er arbeitet,
steht nichts auf dem Spiel, das dieser Satz zählt.

## Wie zuverlässig ist der Kopf?

Drei Zahlen, die drei verschiedene Fragen beantworten — sie widersprechen sich nicht:

| Frage | Maß | Wert |
|---|---|---|
| Wie gut schätzt er die Verdeckung EINER ZELLE? | F1 gegen die SAM-Matten, 104 337 Lesungen | **0,958** |
| Wie gut findet er einen verdeckten FRAME? | verpasste Fälle bei seiner besten Schwelle | **34 von 59** |
| Wie oft bestätigt ihn der zweite Zeuge? | Übereinstimmung mit dem Baseline-Arm | s. u. |

Und die Kalibrierung ist besser als die harte 0,15-Kante suggeriert: im Band 0,15–0,25 liest das
Modell die Figur noch zu 74 % richtig, bei 0,25–0,40 zu 67 %, bei 0,40–0,60 zu 31 % — unter
Zufall erst ab 0,6.

### Der zweite Zeuge ist unter dem Champion weitgehend verstummt

`scripts/occlusion_arms.py`, von den Frames, in denen überhaupt einer meldet:

| | beide einig | nur der Kopf | nur die Baseline |
|---|---:|---:|---:|
| `motionPxThr = 20` (4 928 Frames) | **73,8 %** | 7,7 % | 18,5 % |
| Champion, 34,544 (4 299 Frames) | **26,5 %** | 66,9 % | 6,6 % |

Unter der alten Schwelle bestätigten sich die Arme in drei von vier Fällen. Unter dem Champion
spricht der Kopf in zwei von drei Fällen allein.

Kein Gütemaß — im Trace gibt es keine Wahrheit. Gemessen ist die Übereinstimmung.

## Was daraus folgt

1. **Niemand sollte mit `baselineOcclusion=0` ausliefern.** Der Satz sagt dazu nichts, und die
   zwei Arme sind unabhängige Evidenz — der Kopf ist bei FRAMES die schwächere Hälfte.
2. **Der Regressionssatz taugt als Freigabe für alles außer dieser Achse.** Wer sie freigeben
   will, braucht anderes Material. Es liegt bereits da.
3. Bis dahin: **kein Kandidat sollte `motionPxThr` weiter nach oben schieben.** Er steuert über
   `× 4` die Verdeckungsschwelle mit, und der beste Kandidat der Budget-Suche hätte sie für
   21 Frames Latenz auf 166 gehoben.

## Nachtrag 2026-09-21: der Befund gilt für ALLE drei Hand-Wachen

Die Frage wurde danach systematisch gestellt — jede der zehn booleschen Wachen der Engine
einzeln abgeschaltet, jedes Mal der volle Satz (`docs/wachen-ablation-2026-09-21.md`). Vier
bewegen keine Ziffer, und **drei davon sind genau die Hand- und Verdeckungswachen**:
`baselineOcclusion`, `gridHandGate` — und bei `modelHandGate` nur dessen Formfilter, nicht der
Arm selbst (Korrektur 2026-09-22, `docs/wachen-ablation-2026-09-21.md`).

Damit ist der Befund oben nicht mehr ein Einzelfall, sondern das Muster: der Satz kann diese
Achse als Ganzes nicht beurteilen. Zum Vergleich, was er SEHR WOHL sieht — `cnnVerify` aus
kostet **266 Treffer**, `cnnEvalOnSettle` elf plus 13 Desync-Episoden.

Die richtige Lesart bleibt die von oben: nicht "das CNN fängt es auf", sondern "in diesem
Material stand nichts auf dem Spiel".
