# Ab wann kann das Modell die Figur nicht mehr lesen? (gemessen 2026-09-16)

`PIECE_VISIBLE_MAX = 0.15` entscheidet, welche Zelle in den Klassifikationsverlust eingeht. Die
Zahl stammt aus der Eichung gegen den **Rillen-Sensor**, nicht gegen das Bild — sie sagt nichts
darüber, ab wann das Modell die Figur wirklich nicht mehr sieht. Das ist hier zum ersten Mal
gemessen.

## Die Messung

`augval-eager-s42` (p4-Familie, 80 px, `boardattn:cellnet_p4`) gegen `real13-mix-v6-80`, Split
`val`, 33 449 Zellen. Ein Auswertungsdurchlauf, kein Training. Die Val-Zellen sind nach ihrer
**gemessenen** SAM-Coverage in Bänder gelegt; je Band die Figurengenauigkeit auf den wirklich
besetzten Feldern.

| Coverage | Zellen | davon besetzt | `piece_acc` | normiert |
|---|---|---|---|---|
| 0,00–0,02 | 23 695 | 8 922 | 0,9729 | 1,000 |
| 0,02–0,05 | 61 | 24 | 0,9583 | 0,985 |
| 0,05–0,10 | 65 | 29 | 0,9310 | 0,957 |
| 0,10–0,15 | 70 | 29 | 0,8966 | 0,922 |
| **0,15–0,25** | 93 | 37 | **0,8108** | 0,833 |
| **0,25–0,40** | 114 | 47 | **0,6170** | 0,634 |
| 0,40–0,60 | 158 | 57 | 0,3684 | 0,379 |
| 0,60–0,80 | 112 | 40 | 0,0750 | 0,077 |
| 0,80–1,00 | 464 | 195 | 0,0051 | 0,005 |

Drei Ablesungen:

- **Die harte Kante bei 0,15 ist zu früh.** Im Band 0,15–0,25 liest das Modell die Figur noch zu
  81 % richtig, bei 0,25–0,40 zu 62 %. Das wird heute vollständig weggeworfen.
- **Bei etwa 0,6 ist Schluss.** Darüber 7,5 % und dann 0,5 % — das ist *unter* Zufall. Das Modell
  rät dort nicht, es liegt systematisch falsch. Dort gehört eine Null hin, kein kleines Gewicht.
- **Der Abfall ist eine S-Form**, nicht linear: bei geringer Verdeckung kostet sie fast nichts
  (0,985 bei 0,035), bei hoher fällt sie schneller als linear (0,077 bei 0,70 gegen linear 0,30).

## Zwei Vorbehalte, die die Zahlen begrenzen

**Das Modell wurde MIT der harten 0,15-Maske trainiert.** Alles rechts davon hat es im
Klassifikationsverlust nie gesehen. Die 81 % bei 0,15–0,25 sind reine Generalisierung — was ein
Modell *mit* diesem Material lernen könnte, liegt höher, nicht tiefer. Der Abfall rechts von 0,15
ist zum Teil selbst gemacht.

**Die interessante Strecke ist dünn besetzt.** Das Band 0,00–0,02 trägt 23 695 Zellen, die Bänder
dazwischen 61 bis 158. Bei 93 Zellen hat die 81 % ein Konfidenzintervall von grob ±8 Punkten. Die
FORM ist belastbar, die dritte Nachkommastelle nicht.

## Das Gewicht, das daraus folgt

```
w(c) = 1 − (3s² − 2s³),   s = min((c + 0,01) / 0,60,  1)
```

Eine S-Kurve, auf 0,6 gestaucht und um 0,01 nach links geschoben. `COVERAGE_ZERO_AT` und
`COVERAGE_SHIFT` in `training/occlusion.py`.

Sie liegt an **jedem** Messpunkt unter der Messung — das war die Vorgabe: nie mehr Gewicht geben,
als das Modell nachweislich noch liest.

| Verdeckung | gemessen | Gewicht | Abstand |
|---|---|---|---|
| 0,010 | 1,000 | 0,998 | −0,002 |
| 0,035 | 0,985 | 0,984 | −0,001 |
| 0,075 | 0,957 | 0,946 | −0,011 |
| 0,125 | 0,922 | 0,873 | −0,049 |
| 0,200 | 0,833 | 0,721 | −0,112 |
| 0,325 | 0,634 | 0,413 | −0,221 |
| 0,500 | 0,379 | 0,062 | −0,317 |
| ab 0,60 | 0,077 / 0,005 | **0** | — |

**Warum der Linksversatz:** eine reine S-Kurve startet *waagerecht* — ihre Steigung bei c = 0 ist
null. Die Messung fällt dort aber schon (1,000 → 0,985 zwischen 0 und 0,05), also läge die Kurve
am Anfang zwangsläufig darüber. Der Versatz bricht die Waagerechte und kostet bei freier Sicht
0,002. Ohne ihn lagen zwei Bänder um +0,005 bzw. ±0,000 darüber — innerhalb des Rauschens, aber
nachweisbar drüber.

**Warum die Stauchung auf 0,6 und nicht auf 1,0:** die ungestauchte S-Kurve liegt fast über die
ganze Strecke ÜBER der Messung. Bei 0,5 Verdeckung gäbe sie halbes Gewicht, wo das Modell auf
38 % steht.

## Wie man es benutzt

```bash
uv run chesslab train ... --coverage-weight soft
```

Vorgabe ist `hard` — die alte Regel, bitgleich. `soft` ist eine **Rezept-Änderung**: ein Lauf
damit ist mit dem Archiv nicht vergleichbar.

Zwei Bedingungen, beide zwingend:

**Die Metrik wandert NICHT mit.** `classification_eligible`, `val_visible_piece_acc` und
`CHECKPOINT_WEIGHTS` bleiben auf der harten 0,15. Sonst würde jeder Arm auf seiner eigenen
Zellmenge benotet — genau der Fehler, der am 2026-08-26 schon einmal einen Sieger erfunden hat
(`docs/per-position-mix.md`). Der Verlust ändert sich, das Maß nicht.

**Vorher die Coverage neu schneiden.** Siehe unten: bei einer harten Maske trifft die Drift nur
die Zellen an der Schwelle, bei einer Gewichtung geht sie in *jedes* Gewicht ein.

## Die Coverage-Drift (gemessen 2026-09-16)

Die gespeicherte `coverage` ist ein Schnappschuss aus dem Moment des Mattens. `coverage_of`
schneidet das Alpha über `crops_for_frame`, also über die **Ecken der Log-Zeile** — ein Re-Export
(`fit-stored`, Straightening, `carry_repaired_geometry`) verschiebt die Ecken und lässt die Zahl
stehen. `crop_square` schneidet danach mit den *neuen* Ecken.

Gemessen über 553 Frames aus 24 Aufnahmen, 35 392 Zellen:

- **13 von 24 Aufnahmen** tragen eine Coverage, die sich aus Alpha + aktuellem Log nicht mehr
  reproduzieren lässt.
- **35 Zellen (0,10 %)** überqueren dabei `PIECE_VISIBLE_MAX`. Fast alle auf der **Grundreihe**
  (e1, f1, g1, a1, g8, f8, h8) und als Totalkipper von 0,000 auf 1,000 — dort, wo CLAUDE.md den
  Mesh-Fit ausdrücklich als schwach führt.
- Hochgerechnet auf den Korpus rund **500 Zellen**.

Die frisch gerechnete Zahl ist die richtige: der Crop kommt aus der aktuellen Geometrie. Eine
Zelle mit gespeicherter 0,000 und frischer 1,000 zeigt im Bild eine Hand und bleibt trotzdem im
Klassifikationsverlust — mit dem Label der Figur darunter. Genau die Vergiftung, gegen die die
Maske existiert.

```bash
uv run chesslab occluders recut-coverage --all
```

Rechnet die Coverage aus den Alphas neu, mit der heutigen Geometrie. **SAM läuft nicht** — reine
Arithmetik über `coverage_of`, Minuten für den Korpus. Zeilen mit `alpha: fixed` bleiben
unangetastet (die Zahlen des Menschen), Zeilen ohne Coverage ebenso (SAMs Absagen). Geschrieben
wird atomar mit demselben Nebenläufigkeits-Wächter wie `close-seams`.

**Offen und nicht gebaut:** nichts markiert die Mattes einer Aufnahme als veraltet, wenn ihr Log
neu geschrieben wird. Bis das existiert, muss der Neuschnitt nach jedem Re-Export von Hand laufen.

## Reproduzieren

Die Kurve, das Gewicht und die Drift-Messung sind Skripte im Scratchpad dieser Sitzung gewesen;
was bleibt, ist der Befehl oben und `scripts/audit_disk_damage.py`, das die Drift zählt, ohne
etwas anzufassen.
