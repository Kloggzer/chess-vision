# Abtastung: wie viele Bretter, und welche

Was ein Datensatz aus einer Aufnahme mitnehmen soll. Code: `dataset_build.keep_per_position`
(`chesslab dataset build --per-position N`) und `composite.STRIDE`.

## Der Befund

Der Korpus besteht aus **246 verschiedenen Stellungen**, verteilt auf 9 386 Bretter — also
durchschnittlich **38 Aufnahmen derselben Stellung**. Der Tracker nimmt alle **0,100 s** auf, und
bei fester Kamera und ruhendem Brett ist die zehnte Aufnahme pro Sekunde eine Kopie der ersten.

Am deutlichsten am König: 6 498 `wK`-Zellen verteilen sich auf **22** (Session, Feld)-Paare. Zehn
von vierzehn Sessions haben ihn ausschließlich auf `e1`.

## Was gemessen wurde

Vier Folds, gleicher Seed, gleiches Rezept, derselbe Pack (Hardlink), nur weniger Manifestzeilen.
`last.pt`, weil dessen Streuung über den ganzen Tag kleiner war als die von `best.pt`.

| Variante | Bretter | Stellungen | square_acc | macro |
|---|---|---|---|---|
| voll, 0,1 s | 9 386 | 246 | 0,8945 | 0,7119 |
| Zeitraster 0,3 s | 3 133 | 246 | 0,9061 | 0,7764 |
| Zeitraster 2,4 s | 400 | **147** | 0,8982 | 0,7452 |
| 4 je Stellung | 980 | 246 | 0,8900 | 0,7802 |
| 8 je Stellung | 1 932 | 246 | 0,8886 | 0,7666 |
| **16 je Stellung** | 3 415 | 246 | 0,9061 | **0,7898** |

Drei Schlüsse:

1. **Stratifizieren nach Stellung wirkt.** Jede stratifizierte Variante liegt bei macro 0,77–0,79,
   der volle Korpus bei 0,712. Das ist der einzige Abstand in der Tabelle, der deutlich über der
   Seed-Streuung liegt.
2. **Ein reines Zeitraster verliert Stellungen.** Bei 2,4 s fallen 99 der 246 komplett weg, während
   eine einzelne Stellung noch 26 Bretter behält.
3. **Die Brettzahl ist danach fast egal.** 491 Bretter (2 je Stellung) erreichen dasselbe wie 3 415.

## Was NICHT wirkt

Innerhalb einer Stellung die optisch **verschiedensten** Bretter zu wählen (k-center greedy über
einen Farb-Deskriptor, „Coreset-Selection") statt gleichmäßig über die Zeit. Der Sampler findet
messbar verschiedenere Bretter — mittlere Aussehens-Streuung 194 gegen 120 — und das Modell
profitiert nicht: gepaart je Fold gewinnt er bei 4 je Stellung **2 von 4** und bei 16 je Stellung
ebenfalls **2 von 4**. Zweimal unabhängig Münzwurf. Der Code dafür wurde wieder entfernt.

## Die Regel

Die Abtastrate folgt der **Änderungsrate der Quelle**, nicht einer festen Zahl.

| Quelle | ändert sich | Einheit | Empfehlung |
|---|---|---|---|
| Spiel-Session | nur beim Zug | die Stellung | `--per-position 4` bis `8` |
| Turntable | 0,429 Grad je Frame | der Winkel | Stride 8 (≈ 3,4 Grad) |

Gemessen an einem Session-Video: das Brett-Aussehen bewegt sich in 0,1 s nur das **2,6-fache** eines
Einzelframes (glatt wäre 3,0), Licht und Schatten sind auf dem 0,1-s-Raster also vollständig
erfasst. Der maximale Einzelframe-Sprung liegt aber bei 17,97 gegen Median 0,72 — **Faktor 25**.
Das sind Hände, und die trifft ein Zeitraster nur zufällig. Solange der Verdeckungszweig
(`docs/occluder-plates.md`) die Hände liefert, spielt das für die Figurendaten keine Rolle.

## Woran man nicht mehr drehen sollte

Mehr Frames pro Sekunde. Der Engpass sind **Stellungen**: eine Turntable-Aufnahme mit vier
Aufstellungen liefert für den König mehr unabhängige Situationen als der gesamte bisherige Korpus.
