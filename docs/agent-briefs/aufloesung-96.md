# Auftrag: 96 px — traegt eine kleinere Aufloesung mit einem groesseren Trunk weiter?

Der Architektur-Sweep hat geliefert: `battn` (cellnet + Aufmerksamkeitskopf, 1010 MMAC) schlaegt
das ausgelieferte Backbone auf der Achse, die entscheidet. Das hier ist der Optimierungs-Schritt.
**Die Frage ist eine Iso-Compute-Frage, keine Aufloesungs-Frage:** bei 96 px kostet dieselbe
Architektur 0,5625×, du kannst den Trunk also **1,78× teurer** machen und landest beim selben
Brett-Preis. Was gewinnt — Pixel oder Breite?

Vorher zwei Messfehler, die im 128-px-Sweep drinstecken. Beide sind gefunden, beide muessen raus,
bevor der naechste Lauf startet — sonst misst 96 px dieselbe Verzerrung noch einmal.

## 1. `visible_piece_acc` rankt die Arme genau falschherum

Die Achse rechnet nur ueber BELEGTE sichtbare Zellen. Die `empty`-Zeile sieht sie nie — das sind
23 636 von 40 576 Testzellen. Ein Modell, das aggressiv Figuren ruft, gewinnt dort und ueberflutet
das Brett mit Phantomen. Gemessen auf dem zurueckgehaltenen Test-Split, alle vier auf IDENTISCHEN
Zeilen (`--boards-only`):

| Arm | MMAC | vis | square | occ_board | Phantome | Fehler ges. |
| --- | --- | --- | --- | --- | --- | --- |
| battn (cellnc + Kopf) | 1010 | 0,9917 | **0,9892** | 0,9259 | **32 (0,14 %)** | **437** |
| ref (mnv4_035, warm) | 990 | 0,9943 | 0,9874 | **0,9274** | 149 (0,63 %) | 511 |
| mnv3s | 1206 | **0,9989** | 0,9851 | 0,8612 | 333 (1,41 %) | 604 |
| p4a (cellnet_p4 + Kopf) | 362 | 0,9777 | 0,9822 | 0,9085 | 102 (0,43 %) | 722 |

`visible_piece_acc` ordnet mnv3s > ref > battn > p4a. Die Phantome ordnen battn < p4a < ref <
mnv3s. **Exakt umgekehrt, und nicht wegen des Splits** — dieselbe Umkehrung steht auf dem Val, mit
dem ausgewaehlt wurde (battn 24 Phantome, ref 525, mnv3s 553). Es ist die Metrik.

mnv3s ist damit nicht der Sieger des Sweeps, sondern sein schlechtester Lauf: 2,2× refs Phantome
bei der schlechtesten Brettgenauigkeit. Nach der Projektregel (`phantoms-are-the-veto`) ist das
eine Disqualifikation, keine Verrechnung.

**Konsequenz:** ranke auf `square_acc` oder direkt auf der Phantomzahl aus der Konfusionsmatrix.
`visible_piece_acc` darf mitlaufen, aber nicht auswaehlen.

## 2. Kopf gegen kein-Kopf war ein Quervergleich ueber zwei Zeilenmengen

Ein Brett-Modell sieht nur VOLLSTAENDIGE 64-Zell-Bretter (`PackedBoardDataset` verwirft den Rest),
ein Zell-Modell alle Zeilen: **40 576 gegen 44 558**, also 9 %. Jedes Paar des Sweeps —
`p8w/p8wa`, `p4/p4a`, `cellnc/battn` — liegt genau auf dieser Grenze.

Und die verworfenen Bretter sind die schwereren. Was der Schnitt bei ref bewegt:

| | ohne Schnitt | `--boards-only` |
| --- | --- | --- |
| Phantome | 283 (1,09 %) | **149 (0,63 %)** |
| square | 0,9803 | **0,9874** |
| occ_board | 0,8906 | **0,9274** |

Damit schrumpft battns Vorsprung von Faktor 8,8 auf 4,7, und auf `occ_board` dreht er sich um.
**Die drei Kopf-Deltas (+0,035 / +0,0088 / +0,021) sind ungueltig und muessen neu**, mit

    chesslab eval --run <lauf> --split test --boards-only

Der Schalter ist seit 04c8e16b da. Er meldet, wie viele Bretter er verwirft.

## 3. Der Preis von 96 px steht schon fest

Zwei Messungen auf dem Geraet (24117RK2CG, ONNX/XNNPACK, batch 64, 4 Threads, 150 s Dauerlast):
80 px **20,74 ms/Brett**, 128 px **50,23 ms**. Fit `ms = 1,84 + 0,00295 · px²`. Der Strom kommt aus
`docs/android-performance.md` (Abschnitt „Was 128 px an Strom kostet"), Lesetakt Median 2,65/s aus
17 Recordings, Basis Zeile 10 der Batterietabelle (737 mA):

| px | ms/Brett | Duty | Aufschlag | Laufzeit | Pack |
| --- | --- | --- | --- | --- | --- |
| 80 | 20,7 | 5,5 % | +7 mA | 7,56 h | 11,3 GB |
| **96** | **29,1** | **7,7 %** | **+21 mA** | **7,41 h** | **16,3 GB** |
| 128 | 50,2 | 13,3 % | +58 mA | 7,07 h | 29,0 GB |

**Rechenlast ist auf diesem Geraet kein knappes Gut.** Der ganze Sprung von 80 auf 128 px kostet
7 % Laufzeit. Optimiere also nicht auf MMAC, sondern auf Genauigkeit je MMAC — und sag am Ende,
wo auf dieser Kurve du stehst. 192 GB Platte frei, der 96-px-Pack passt.

## 4. Die Arme

| Arm | px | MMAC | ms | wozu |
| --- | --- | --- | --- | --- |
| `battn @96` | 96 | 568 | 29,6 | Aufloesung ALLEIN: gepaart gegen battn@128 |
| `mnv4_050 + Kopf @96` | 96 | 855 | 43,6 | **Iso-Compute gegen battn@128** — Breite statt Pixel |
| `battn @128` | 128 | 1010 | 51,2 | steht schon, ist die Referenz |

Optional, wenn Budget bleibt: `p4a @96` (204 MMAC, 11,8 ms) als unteres Ende der Kurve.

Die mittlere Zeile ist der eigentliche Auftrag. Liegt sie ueber battn@128, ist Breite bei festem
Preis der bessere Kauf und 128 px war die falsche Achse. Liegt sie darunter, tragen die Pixel.

## 5. Vier Regeln, sonst ist die Messung hin

- **Den Pack aus der QUELLE schneiden, nicht aus dem 128-px-Pack herunterrechnen.** CLAUDE.md 0.1:
  `data/crops/` ist der Artefakt fuer den Menschen, `packed_images.u8` das, was das Modell sieht,
  und beide werden aus der Quelle geschnitten. Ein heruntergerechneter Pack misst zweimal
  resampelte Pixel, nicht 96 px.
- **`--boards-only` bei jedem Vergleich ueber die Kopf-Grenze.**
- **Rangfolge auf `square_acc` oder Phantomzahl**, nie auf `visible_piece_acc` allein.
- **bB↔bP einzeln melden.** Das ist die Achse, fuer die 128 px da war, und bei 128 px ist sie
  gelost: 2–4 Verwechslungen auf ~1 100 Laeufer, Recall 0,98 in allen Armen. Die Blase misst bei
  128 px 10–13 px, bei 96 px 8–10. Wenn 96 px hier einbricht, ist die Frage entschieden, egal was
  das Aggregat sagt — also darf sie nicht im Aggregat verschwinden.

## 6. Was zurueckkommen soll

Eine Kurve, keine Einzelwerte: **Phantomrate und `square_acc` ueber MMAC**, alle Arme des
128-px-Sweeps mit `--boards-only` nachgerechnet und die drei neuen daneben. Dazu die bB↔bP-Zelle
je Arm. Mit dem Fit oben laesst sich jede MMAC-Zahl direkt in ms, mA und Laufzeit uebersetzen —
also in die Einheit, in der entschieden wird.
