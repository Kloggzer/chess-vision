# Ab wann kann das Modell die Figur nicht mehr lesen? (gemessen 2026-09-16)

`PIECE_VISIBLE_MAX = 0.15` entscheidet, welche Zelle in den Klassifikationsverlust eingeht. Die
Zahl stammt aus der Eichung gegen den **Rillen-Sensor**, nicht gegen das Bild — sie sagt nichts
darüber, ab wann das Modell die Figur wirklich nicht mehr sieht. Das ist hier zum ersten Mal
gemessen.

## Die Messung

`augval-eager-s42` (p4-Familie, 80 px, `boardattn:cellnet_p4`) gegen `real13-mix-v6-80`, Splits
**val + test** nach dem eigenen `split-pin.json` des Laufs, **84 608 Zellen**. Ein
Auswertungsdurchlauf, kein Training. Die Zellen sind nach ihrer **gemessenen** SAM-Coverage in
Bänder gelegt; je Band die Figurengenauigkeit auf den wirklich besetzten Feldern.

| Coverage | besetzte Zellen | `piece_acc` | normiert | 95 % (Wilson) |
|---|---|---|---|---|
| 0,00–0,02 | 31 929 | 0,9296 | 1,000 | 0,997–1,003 |
| 0,02–0,05 | 106 | 0,8679 | 0,934 | 0,850–0,989 |
| 0,05–0,10 | 147 | 0,8367 | 0,900 | 0,827–0,955 |
| 0,10–0,15 | 116 | 0,8448 | 0,909 | 0,826–0,968 |
| **0,15–0,25** | 163 | **0,7423** | 0,799 | 0,721–0,864 |
| **0,25–0,40** | 273 | **0,6667** | 0,717 | 0,655–0,774 |
| **0,40–0,60** | 302 | **0,3113** | 0,335 | 0,282–0,393 |
| 0,60–0,80 | 262 | 0,0382 | 0,041 | 0,022–0,074 |
| 0,80–1,00 | 1 195 | 0,0075 | 0,008 | 0,004–0,015 |

Drei Ablesungen:

- **Die harte Kante bei 0,15 ist zu früh.** Im Band 0,15–0,25 liest das Modell die Figur noch zu
  74 % richtig, bei 0,25–0,40 zu 67 %, bei 0,40–0,60 noch zu 31 %. Das wird heute vollständig
  weggeworfen.
- **Bei etwa 0,6 ist Schluss.** Darüber 3,8 % und dann 0,8 % — das ist *unter* Zufall. Das Modell
  rät dort nicht, es liegt systematisch falsch. Dort gehört eine Null hin, kein kleines Gewicht.
- **Der Abfall ist eine S-Form**, nicht linear: flach am Anfang, steil in der Mitte, Boden bei 0,6.

## Drei Vorbehalte, die die Zahlen begrenzen

**Das Modell wurde MIT der harten 0,15-Maske trainiert.** Alles rechts davon hat es im
Klassifikationsverlust nie gesehen. Die 74 % bei 0,15–0,25 sind reine Generalisierung — was ein
Modell *mit* diesem Material lernen könnte, liegt höher, nicht tiefer. Der Abfall rechts von 0,15
ist zum Teil selbst gemacht.

**Die Bänder zwischen 0,02 und 0,15 tragen 106 bis 147 besetzte Zellen.** Ihre Intervalle sind
über 12 Punkte breit, und die Reihe ist dort sogar nicht-monoton (0,909 bei 0,125 gegen 0,900 bei
0,075). Diese drei Punkte sind Rauschen, keine Form.

**`PackedBoardDataset` behält nur vollständige Bretter** und verwirft dabei 21 % der Zeilen —
der Anteil teilverdeckter Zellen fällt dabei von 4,4 % auf 3,2 %. Der Filter entfernt also
bevorzugt verdeckte Bretter. Diese Messung *unterschätzt* mithin, wie viel Material im Mittelfeld
liegt.

### Eine frühere, engere Messung — und warum sie in die Irre führte

Der erste Durchlauf (nur `val`, 24 832 Zellen) ergab eine Basis von 0,973 statt 0,930 und 0,811
im Band 0,15–0,25 statt 0,742. Der schmale Satz war **nicht nur dünn, sondern auch leichter**. Eine
darauf angepasste Kurve stand auf einer zu optimistischen Grundlinie. Wer die Messung wiederholt:
immer val **und** test, und den Split des Laufs nehmen (`split_file` in seiner `config.json`), nicht
`split.json`.

Und die Mitte der Skala ist im Korpus **nicht** dünn — das war eine Eigenschaft des Val-Satzes:

```
Korpus, 532 992 Zellen        Anteil > 0,02:  Korpus 17,2 %  |  gemessener Val 4,6 %
0.00-0.02   441 424  ############################################################
0.02-0.90    ~5 000 je Band, flach
0.90-1.00    36 546  ####
```

Je gemattetem Frame sind im Median **4 Zellen voll und 4 teilweise** bedeckt — der Randring einer
Hand ist so groß wie ihr Kern. Eine „eine Hand ist viel größer als eine Zelle"-Erklärung für die
Dünne ist damit widerlegt.

## Das Gewicht, das daraus folgt

```
w(c) = 1 − (3s² − 2s³),   s = min((c + 0,01) / 0,60,  1)
```

`COVERAGE_ZERO_AT` und `COVERAGE_SHIFT` in `training/occlusion.py`.

| Verdeckung | gemessen | CI oben | Gewicht | Urteil |
|---|---|---|---|---|
| 0,010 | 1,000 | 1,003 | 0,997 | unter der Messung |
| 0,035 | 0,934 | 0,989 | 0,984 | **im Intervall** (n = 106) |
| 0,075 | 0,900 | 0,955 | 0,945 | **im Intervall** (n = 147) |
| 0,125 | 0,909 | 0,968 | 0,871 | unter der Messung |
| 0,200 | 0,799 | 0,864 | 0,718 | unter der Messung |
| 0,325 | 0,717 | 0,774 | 0,413 | unter der Messung |
| 0,500 | 0,335 | 0,393 | 0,061 | unter der Messung |
| ab 0,60 | 0,041 / 0,008 | — | **0** | unter der Messung |

**Sieben von neun Bändern unter der Messung, zwei innerhalb ihres Konfidenzintervalls** — und das
sind genau die mit 106 und 147 Zellen.

**Warum der Linksversatz:** eine reine S-Kurve startet *waagerecht* — ihre Steigung bei c = 0 ist
null. Die Messung fällt dort aber schon. Der Versatz bricht die Waagerechte und kostet bei freier
Sicht 0,003.

**Warum die Stauchung auf 0,6 und nicht auf 1,0:** die ungestauchte S-Kurve liegt fast über die
ganze Strecke ÜBER der Messung. Bei 0,5 Verdeckung gäbe sie halbes Gewicht, wo das Modell auf
33 % steht.

### Warum keine strengere Kurve (Variante B, verworfen)

Eine Suche über `(zero_at, shift)` unter der Nebenbedingung „unter **jedem** Punktschätzer" findet
`zero_at = 0,46`. Das erfüllt die Bedingung wörtlich und ist trotzdem falsch — gerechnet auf dem
Train-Split (733 610 Zellen):

| Variante | Gewichtsmasse | gegen `hard` | davon über 0,15 |
|---|---|---|---|
| `hard` (Kante 0,15) | 648 883 | 1,00× | 0 |
| **A: zero 0,60** | 657 739 | **1,01×** | **10 354** |
| B: zero 0,46 | 639 648 | **0,99×** | 4 899 |

**B liegt unter dem heutigen Zustand.** Es ist keine Aufweichung der Kante, sondern eine
Verschärfung: die Kurve fällt so früh, dass sie auch Zellen *unterhalb* von 0,15 Gewicht wegnimmt
— mehr, als sie oben zurückholt. Im Mittelfeld verliert sie 33 % (0,15–0,25), 68 % (0,25–0,40)
und 100 % (0,40–0,60) gegenüber A, und zwar dort, wo die Messung mit 273 und 302 Zellen etwas
hergibt.

Der Grund für Bs Form ist ein einziger Messpunkt: der Abfall von 1,000 auf 0,934 zwischen c = 0,01
und c = 0,035, gemessen an **106 Zellen** mit einem Intervall bis 0,85. Unter diesen Punkt zu
wollen heißt, gegen einen Messfehler zu optimieren.

**Entscheidung: A** (Nutzer, 2026-09-16). Die Bedingung ist damit nicht „unter jedem Punkt",
sondern „unter jedem Band, das genug Zellen trägt, und innerhalb des Intervalls der übrigen".
`tests/test_coverage_weight.py` pinnt genau das, samt der Probe, an der B gescheitert ist.

Zur Einordnung von A: 1,01× Gesamtmasse ist wenig. `soft` ist keine große Umverteilung, sondern
gezielt **10 354 teilverdeckte Zellen**, die heute fehlen. Ob das die Qualität bewegt, sagt nur ein
Lauf — die Seed-Streuung liegt bei `occ_board_acc` bei 0,33.

## Wie man es benutzt

```bash
uv run chesslab train ... --coverage-weight soft
```

Vorgabe ist `hard` — die alte Regel, bitgleich (ein Test pinnt das). `soft` ist eine
**Rezept-Änderung**: ein Lauf damit ist mit dem Archiv nicht vergleichbar.

Zwei Bedingungen, beide zwingend:

**Die Metrik wandert NICHT mit.** `classification_eligible`, `val_visible_piece_acc` und
`CHECKPOINT_WEIGHTS` bleiben auf der harten 0,15. Sonst würde jeder Arm auf seiner eigenen
Zellmenge benotet — genau der Fehler, der am 2026-08-26 schon einmal einen Sieger erfunden hat
(Ausduenn-Studie). Der Verlust ändert sich, das Maß nicht.

**Dunkelheit bleibt ein HARTER Ausschluss.** Gewichtet wird nur die Verdeckung. Eine zu dunkle
Zelle trägt kein Signal, egal wie frei sie ist — das ist eine andere Frage.

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

`scripts/audit_disk_damage.py` zählt die Drift, ohne etwas anzufassen. Die Kurve selbst ist ein
Auswertungsdurchlauf: Val- und Test-Zeilen des Laufs nach `coverage` bändern und je Band
`piece_acc` auf den besetzten Feldern rechnen — `evaluate_dataset` liefert `trues`/`preds`, die
Coverage steht in der Manifest-Zeile.
