# Auftrag: Architektur-Sweep — was VOR dem ersten Lauf zu wissen ist

Der Datensatz-Sweep ist durch (26./27.08., 65 Laeufe). Er hat das Modell von `visible_piece_acc`
0,7585 auf 0,9234 gebracht — **und dabei vier Messfehler aufgedeckt, die jeden Vergleich
wertlos machen, wenn man sie wiederholt.** Das hier ist die Abkuerzung durch diesen Tag.

Zahlen und Herleitung: `docs/model-improvement-2026-08-26.md` (Diagnose),
`docs/model-improvement-results-2026-08-27.md` (Ergebnisse), `docs/measurement-floor.md`
(Messgeraet).

## 1. Die Messregeln. Ohne sie misst der Sweep Rauschen

- **Immer gegen DENSELBEN Val-Satz**: `chesslab eval --run <lauf> --split val --dataset
  real13-straight-80-v3`, und die Zeile „nur SICHTBAR" lesen. Der eigene Val eines Arms ist
  NICHT vergleichbar: die Ausduenn-Varianten trugen 2,9 % bis 15,0 % verdeckte Val-Zellen, und
  die Rangfolge war exakt die Rangfolge dieses Anteils.
- **`piece_acc` ueber alle Zellen ist der falsche Wert** — verdeckte Zellen sind zu 55–63 %
  falsch und aus dem Verlust maskiert. `visible_piece_acc` ist die Achse.
- **`occ_board` NICHT benutzen.** Epochenrauschen sd **0,0989** (Zellgenauigkeit: 0,0028), weil
  es alle 64 Felder verlangt. Es springt zwischen Nachbarepochen von 0,03 auf 0,88.
- **Gepaart vergleichen, gleiche Seeds.** Ungepaart sd 0,027, gepaart bis 0,003. Kleinstes
  messbares Delta bei drei Seeds: **~0,008**. Alles darunter ist kein Ergebnis.
- **`best-by-score` ist um ~0,022 ueberhoeht** (Maximum ueber 60 verrauschte Val-Messungen). Als
  SELEKTOR trotzdem der ruhigste; nur nicht als Guete zitieren.

## 2. Frueher Abbruch funktioniert nicht. Geeicht, nicht vermutet

Rueckwirkend ueber 33 Laeufe haette ein Kriterium (6 sd unter der Basis am gleichen Epochenstand,
3 Epochen in Folge) **15 getoetet — darunter die zwei besten Arme.** Regularisierte Arme starten
langsamer und holen auf; `wd20` faellt zwischendurch auf `occ_acc` 0,626 von 0,987 und endet
oben. Auch absolute Boeden helfen nicht. `scripts/train_watchdog.py --replay` rechnet es nach.

Ebenso: **kurze Laeufe sieben nicht.** Spearman gegen die 60-Epochen-Rangfolge ist 0,73 / 0,40 /
0,75 / 0,57 / 0,45 / 0,23 bei 10/15/20/25/30/35 Epochen — nicht monoton, also Rauschen. Erst ab
45 Epochen tragfaehig, und die kosten 22 von 31 Minuten. **Volle Laeufe fahren.**

## 3. Der Bezugspunkt

Rezept: `--dataset real13-mix-v4 --resume comp13-ms-s1-pretrain-bn80 --hflip-p 0.5
--jitter-translate 0.10 --balance class --weight-cap 1 --epochs 60 --patience 60
--batch-size 256 --lr 0.01 --sched cosine --norm batchnorm --head occlusion`

| | Basis | best-mix |
|---|---|---|
| `visible_piece_acc` (Val) | 0,7585 | **0,9234** |
| `visible_piece_acc` (Test) | 0,8023 | **0,9802** |
| Typfehler (Val) | 0,234 | 0,077 |
| Luecke val − train | 1,343 | **−0,005** |

**Die Luecke ist zu. Das ist neu und aendert die Lage:** bis gestern war jede Kapazitaets-
erhoehung Gift, weil das Modell schon 99,93 % seiner Trainingsdaten konnte. Jetzt memoriert es
nicht mehr — Kapazitaet ist zum ersten Mal ein legitimer Hebel. Das ist der Grund, warum dieser
Sweep JETZT Sinn ergibt und gestern nicht.

## 4. Was der Restfehler ist — und was Architektur daran nicht aendern kann

```
VAL   bB <-> bP   1071 von 3900 Fehlern = 27 %   (42,5 % aller schwarzen Laeufer)
      bK -> bR     222                            (22,5 % aller schwarzen Koenige)
TEST  Figuren -> empty  586 von 2738 = 21 %       anderer Fehlermodus, andere Kamera
```

> **ZURUECKGEZOGEN, 2026-08-27, vom Sweep selbst widerlegt.** Der Satz „die Information ist im
> Crop nicht enthalten" stand hier und war falsch. Bei 128 px faellt `bB↔bP` von 1071 auf 121
> (−88,7 %) und der `bB`-Recall steigt von 0,529 auf 0,913 — mit DEMSELBEN Modell, nur mehr
> Pixeln. Die Information war die ganze Zeit in den Quell-Crops (128 px); der 80-px-Pack hat sie
> weggeworfen.
>
> **Mein Fehler war methodisch, nicht numerisch.** Gemessen habe ich EINE handgebaute Statistik —
> die dunkle Flaeche ueber einer Schwelle — bei vollen 128 px, und dort trennt sie `bB` von `bP`
> mit Cohens d = 0,20 tatsaechlich nicht (zum Vergleich `bK` gegen `bR`: 1,53). Daraus habe ich
> „keine Information" geschlossen. Ein CNN findet aber Merkmale, die eine Schwelle wegwirft.
> Abwesenheit von Beleg ist kein Beleg fuer Abwesenheit.
>
> **Zweiter Fehler in derselben Analyse:** jede Konfusionstabelle, die ich gezeigt habe, hat die
> Zeile `empty` herausgefiltert (`if a == "empty": continue`). Phantome tauchten deshalb nie auf,
> obwohl sie beim 80-px-Modell 1 271 von 9 308 Fehlern sind und `empty → wR` mit 614 auf Platz 4
> steht. Bei 128 px sind Phantome mit 49,5 % der groesste Restposten — die Achse, die ich
> unsichtbar gemacht hatte, ist jetzt die wichtigste.

Was davon stehenbleibt: bei **80 px** war `bB↔bP` der groesste Posten unter den besetzten Zellen,
und Kapazitaet allein haette ihn nicht geloest. Was nicht stehenbleibt: die daraus abgeleitete
Decke. Sie gab es nicht.

## 5. Randbedingungen der Architektur

- **Nur BatchNorm.** GroupNorm normiert je Sample, faltet sich nicht in die Faltung und exportiert
  als 46-Knoten-Zerlegung: 573 Knoten und 30,6 ms gegen 124 und 6,5 ms — **4,7x**. Auf ROCm laeuft
  das Training durch `PrimitiveBatchNorm2d` (gewichtsidentisch, faltet beim Export).
- **Die Lernrate ist der kritische Faktor, nicht die Norm.** Normalisierer nie bei EINER gemeinsamen
  Rate ranken — pro Normalisierer sweepen oder es lassen (CLAUDE.md).
- **Geraetebudget SM8650:** Session-ms = 26,9 + 2,731 × MMAC/Crop, Knick bei **9,8 MMAC/Crop**,
  ausgeliefert 6,7. Das heisst grob: 1,45x der heutigen Rechenlast, dann wird es teuer. Bei 80 px
  waere `mobilenetv4_conv_small_050` schon ~2x, `_conv_small` (Breite 1,0) ~8x.
- **Aufloesung:** der Pack ist 80 px, die Quell-Crops sind 128. `real13-c8d1-r128` und
  `real13-c8d1-r96` existieren als Datensaetze; r128 hat noch **keinen** Pack. 96 px waeren
  ~9,6 MMAC — gerade noch unter dem Knick, 128 px mit ~17,2 klar darueber.
- **Die letzte Faltung ist bei 80 px Eingabe 3x3.** Deshalb ist Grad-CAM hier wertlos
  (`scripts/gradcam_summary.py` haelt das fest); benutze `scripts/occlusion_sensitivity.py`.

## 6. Was schon gemessen und erledigt ist — nicht wiederholen

| | Ergebnis |
|---|---|
| Epochen 60 → 120 | −0,013, Luecke waechst |
| Klassengewichte (cap 1 / cap 3) | −0,027 / +0,005 |
| `--balance piece` / `session` / `situation` | −0,074 / −0,085 / −0,043 |
| weight decay 0,05 / 0,1 / 0,2 | −0,008 / −0,074 / −0,043 |
| label smoothing 0,1 | −0,006 |
| `rot90` | −0,046 |
| per-crop-Normalisierung | −0,044 |
| `--input-repr` sobel-Varianten | historisch: Brettgenauigkeit 0,031 gegen 0,998 |
| Graustufe (ganz / zufaellig) | +0,013 / −0,004 |
| Ensemble ueber 3 Seeds | +0,001 gegen den besten Einzelseed |

## 7. Betrieb

- **Zwei Trainings parallel kosten +7 %** und liefern doppelten Durchsatz. `CHESSLAB_TRAIN_SLOT=B`
  gibt einem Lauf einen eigenen GPU-Lock (`data/inbox/heavy-B.lock`). Mehr als zwei nicht: RAM.
- Ein 60-Epochen-Lauf bei 80 px kostet ~31 min allein, ~34 zu zweit.
- **Die Augmentierung kostet 308 ms je Batch CPU** gegen 36 ms GPU-Schritt. Wer die Architektur
  vergroessert, verschiebt den Engpass — dann erst wird die GPU die Wand.
- `--num-workers 5` je Lauf, wenn zwei parallel laufen. 8 je Lauf sprengt bei 31,8 GB den Speicher.
- Determinismus ist geprueft und per Test festgenagelt (`tests/test_aug_determinism.py`). Jede
  neue Transformation muss ihn halten, sonst verliert der gepaarte Vergleich seinen Hebel.
