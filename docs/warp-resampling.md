# Entzerrung: `remap` kostet nichts, die Interpolation kostet alles (2026-09-14)

Ein Audit meldete am 2026-09-14, `warp_board_for_crops` resample „auf zwei verschiedene Arten":
`cv2.warpPerspective` (bilinear), wenn Mesh UND Lens fehlen, sonst `cv2.remap` (kubisch). Die
Sorge dahinter war, dass `remap` — eingefuehrt fuer Tempo — Qualitaet kostet. Gemessen ist das
Gegenteil.

## Die Messung

Echtes Brett (`2026-08-07-13-52-38/boards/000117.webp`, 952x952), dieselbe leichte Perspektive,
Median aus 7 Durchlaeufen, Laplace-Varianz als Schaerfemass. Quelle: 1 059,8.

| Arm | ms | Laplace | Anteil der Quelle |
|---|---|---|---|
| `warpPerspective` bilinear | 1,33 | 674,5 | 63,6 % |
| `warpPerspective` kubisch | 2,26 | 976,4 | 92,1 % |
| `remap` bilinear | 0,91 | 674,5 | 63,6 % |
| `remap` kubisch | 1,78 | 976,4 | 92,1 % |

## Was daraus folgt

- **Die Funktion ist fuer die Schaerfe egal.** Bei gleicher Interpolation liefern beide dasselbe
  Bild, auf die Nachkommastelle. `remap` ist dabei 1,46x (bilinear) bzw. 1,27x (kubisch)
  schneller. Der Tempogewinn ist gratis — `remap` zurueckzubauen waere langsamer bei gleicher
  Qualitaet.
- **Der Unterschied ist die Interpolation.** 63,6 % gegen 92,1 %, also 28,5 Punkte. Das ist der
  Betrag, den `straighten_board` als „-44 % gegen -22 %" fuer den fertigen Crop nennt.
- **Es gibt kein Opfer.** Von 14 449 gespeicherten Brettern traegt **jedes** `board_straightened`,
  ist also kubisch entzerrt. Der bilineare Pfad hat hier nie ein Brett erzeugt. Die zwei
  Schaerfe-Domaenen waren moeglich, nicht vorhanden.

## Die Entscheidung: vereinheitlicht auf KUBISCH (Nutzer, 2026-09-14)

„dann waehle die bessere qualitaet und vereinheitliche." Der schnelle Zweig in `warp_padded`
nimmt seitdem `flags=cv2.INTER_CUBIC`; `remap` bleibt, wo es ist, weil es gratis schneller ist.

**Gespeicherte Bretter aendern sich nicht** — sie waren alle schon kubisch. Bewegt werden die
Pixel dort, wo aus einem FRAME geschnitten wird: Komposite, der Bildscan (Rillen, Zellen,
`sharp`), Stellungs-Flags, Ruhe-Scan, Review-Bilder, synthetische Crops. Auf einem echten
Kamerabild gemessen: Laplace 32,9 -> 45,4 (+38 %); auf einem Brettbild im Produktionsmassstab
+15 %.

Nachgemessen an der Zusicherung selbst: ueber ein Identitaets-Mesh lag der Abstand vorher bei
**63** Graustufen, jetzt bei **11** an einzelnen Randpixeln, im Mittel 0,002, Laplace 23 189,8
gegen 23 189,3. `test_both_warp_paths_resample_the_same_way` haelt das fest.

## Was es kostet, und warum NUR der Crop-Warp (Nutzer, 2026-09-14)

Der Aufschlag haengt an der Ziel-Leinwand, und die folgt aus dem MODELL: ein 80-px-Modell
impliziert ein Brett von 582, ein 128er eines von 931 (`board_size/8 * (1 + 2*pad_side)`). Der
Konfigurationswert 1600 ist ein Platzhalter und kommt real nicht vor.

| Modell | Brett | Aufschlag je Beobachtung |
|---|---|---|
| 80 px (`p4a-80-clahe`, Vorgabe) | 582 | **+0,62 ms** |
| 96 px | 698 | +0,90 ms |
| 128 px | 931 | +0,61 ms |

Unter einer Millisekunde, und nur je BEOBACHTUNG, nicht je Frame — gegen 16 ms CNN-Inferenz und
66 ms Bildperiode bei 15 fps. Im Replay sind es 43 s ueber 41 136 Beobachtungen; die restlichen
250 s des gemessenen Unterschieds waren ein beschaeftigter Rechner, nicht der Warp.

**Der Erkennungs- und der Gitter-Warp bleiben bilinear, und das ist die eigentliche Entscheidung.**
Fuer BILDDATEN heisst schaerfer besser. Fuer eine MESSUNG heisst es gar nichts: sie wird nicht
richtiger, nur anders skaliert — und jede Schwelle wurde gegen die bisherige Weichheit gefittet.
Gemessen: der Gitter-Warp kubisch verschob das gefittete Quad um 2,78 px, und der Ruhe-Vergleich
wurde bei identischem Versatz ~10 % empfindlicher, waehrend `SETTLE_LIMIT` auf 45 steht. Aus dem
Erkennungs-Warp kommt zudem ALLES, was die Engine diffed, also auch die Basis von `motionThr`,
`ACTIVITY_THR` und dem Census. Eine schaerfere Basis senkt jede dieser Schwellen faktisch ab, ohne
dass jemand eine anfasst — derselbe Fehler wie das fehlende `coverage_gate`, nur in anderer Form.
Kosten waeren es nicht: kubisch je Frame sind 8-12 ms/s bei 15 fps. Wer es trotzdem will, macht ein
eigenes Vorhaben daraus, mit Nachmessen der Schwellen und A/B davor und danach.

## Was NICHT belegt ist

Die Schaerfezahl ist gemessen, der Nutzen nicht. Laplace-Energie ist ein Kantenmass, kein Beleg,
dass der Klassifikator etwas davon hat — und auf der Bildprobe (`tmp/warp-cubic-montage.png`,
Felder 3x vergroessert) ist der Unterschied mit blossem Auge kaum zu sehen; er sitzt ausschliesslich
auf Kanten (Figurenkontur, Rillen, Feldgrenzen), Flaechen bleiben gleich. Der Nutzer am 2026-09-14:
„ich sehe keinen unterschied, ggf sieht das cnn einen".

**Wo es sich zeigen wird:** beim naechsten Pack. Bestehende Crops auf der Platte sind unberuehrt,
nur NEU geschnittene aendern sich. Wer den Effekt messen will, braucht denselben Datensatz zweimal
geschnitten und `chesslab eval` gegen denselben Val-Satz — und darf die Umstellung nicht mit einer
anderen Aenderung im selben Lauf mischen.

**Was die Umstellung kostet, ist dagegen bekannt:** der Ruhe-Vergleich wird empfindlicher (mittlere
Zell-Differenz bei 0,3 px Versatz 2,76 -> 3,02, also rund 10 %), und `SETTLE_LIMIT` = 45 ist gegen
die weicheren Pixel geeicht. Ebenso sind `sharp`-Werte in bestehenden `scan.jsonl` nicht mit neuen
mischbar. Beides einmal nachmessen, bevor der naechste Scan darauf baut.

Offen und bewusst nicht angefasst: `crops_for_frame` entzerrt mit Frame UND Mesh zweimal
(bilinear, dann kubisch beim Geradeziehen), waehrend der Brett-Store einmal kubisch resampelt.
Das betrifft Komposite. Der Kommentar an `warp_board_for_crops` beziffert diesen Kompromiss
selbst mit +57 % Laplace-Energie fuers Zusammenfassen; es ist ein bekannter Handel, kein Versehen.
