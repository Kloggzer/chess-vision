# Woran das Modell haengt — ein Tag Suche (2026-08-26)

**Kurz:** an den Daten, nicht am Rezept. Das Modell kann **99,93 %** seiner Trainingsdaten und
**75,85 %** einer ungesehenen Session. Vierzehn Rezept-Eingriffe bewegten die Figurenachse
zwischen **−0,074 und +0,000**; fuenf zusaetzliche Aufnahmen bewegten sie um **+0,095**.

Alle Zahlen sind `visible_piece_acc` auf dem geteilten Val-Satz
(`chesslab eval --dataset real13-straight-80-v3 --split val`), Seed 42, gepaart gegen die Basis
0,7585. Rauschgrenze und Methodik: `docs/measurement-floor.md`.

## 1. Was es NICHT ist

| Verdacht | Befund |
|---|---|
| Crop schneidet Figurenkoepfe ab (`pad_up = 0`) | **widerlegt** — Neu-Warp mit 220 px Rand: die Figuren passen in ihre Zelle. `pad_up` waere ausserdem der falsche Knopf, die Neigung ist radial (`scripts/border_probe.py`) |
| Matte uebersieht Haende | **0,0005** bei 99 % SAM-Recall. SAM muesste auf 86 % fallen, um messbar zu werden |
| Ingest zu ungenau | Recall 98,6 % gegen SAM, und es landet ohnehin **alles** bei SAM (7 344 Bretter, 48 % davon „sauber") |
| Klassenbalance im Verlust | `--weight-cap 3`: +0,005 (t = 0,31). `--weight-cap 1`: −0,027 |
| Datenmischung | p2/c2d8/c8d2/c8d1/p8 liegen 0,005 auseinander |
| Pretrain-Zusammensetzung | comp13-v4: −0,014, 3/3 Seeds |
| Laenger trainieren | 120 Epochen: **−0,013**, Luecke waechst 1,34 → 1,58 |
| Kapazitaet, Aufloesung | nicht angefasst: bei 99,93 % auf Train waere mehr Kapazitaet Gift |

## 2. Was es ist

    train_loss 0,034     val_loss 1,332     Luecke 1,30
    auf TRAIN 99,93 % richtig      auf einer neuen Session 75,85 %

Der Trainingssplit traegt **1 643 verschiedene Situationen** (Session, Feld, Klasse) als 184 735
Crops — im Schnitt 112 fast identische Bilder je Situation, bei 60 Epochen also ~6 700 Durchgaenge
je Situation. Drei Bestaetigungen aus verschiedenen Richtungen:

- **Der Fold-Wert einer Session korreliert mit −0,59 mit der Zahl ihrer verschiedenen
  Situationen.** Lange Partien erreichen ungewoehnliche (Figur, Feld)-Kombinationen; kurze
  Sessions scoren 0,99, lange 0,58.
- **`wK` steht im Trainingssplit auf DREI Feldern**, `bK` auf sieben. Kein Sampler und keine
  Gewichtung repariert das.
- **Die Lernkurve steigt am oberen Ende am steilsten**: 8 Aufnahmen 0,6495, 12 → 0,6640,
  17 → 0,7585 (`scripts/learning_curve.py`).

## 3. Der eine Eingriff, der etwas taugte

`--balance class --weight-cap 1` — der Klassenausgleich im SAMPLER statt im Verlust
(`--balance`, Idee des Nutzers):

| | `vis_piece` | `macro` | Luecke | `cov_prec` |
|---|---|---|---|---|
| Basis | 0,7585 | 0,5930 | 1,34 | 0,9440 |
| `balcls + cap1` | 0,7551 | **0,6477** | **0,56** | 0,6799 |

Der einzige Arm, der die Ueberanpassung halbiert, **ohne** dafuer Genauigkeit zu zahlen — jeder
andere (wd 0,2, cap 1) drueckte die Luecke, indem er weniger lernte. Zwei Praezisierungen:

- **Der Gewinn kommt vom Herunternehmen von `empty`, nicht vom Ausgleich unter den Figuren.**
  `--balance piece` laesst empty auf 54 % und gleicht nur die zwoelf Figuren an: **0,6844**,
  −0,074. Die Figuren brauchen die 92 % Ziehungsmasse, die `class` ihnen gibt.
- **Er stapelt nicht.** `balcls + cap1 + wd 0,05` ist mit 0,7316 schlechter als jeder Teil allein.

Offen bleibt der Coverage-Einbruch (0,944 → 0,680): der Sampler wirkt auf beide Koepfe, und
`empty` liefert die sauberen Negativbeispiele des Verdeckungskopfs. Ein ueber-flaggender Kopf ist
die Phantom-Achse und damit ein Veto.

## 4. Drehteller: richtige Idee, falsche Domaene

Vier Clips ohne Verdecker, zwoelf Winkel-Eimer je Platzierung (`--clean`, `--angle-buckets`).
Bringt 64 neue (Figur,Feld) und 768 Situationen. Ergebnis unter `--balance piece`:

| | `vis_piece` | `macro` | `cov_prec` |
|---|---|---|---|
| ohne Drehteller | 0,6844 | 0,6140 | 0,7688 |
| mit Drehteller | **0,6510** | **0,5030** | **0,8456** |

Die Coverage-Precision steigt wie vorhergesagt (24 384 saubere `empty`-Crops sind genau die
fehlenden Negativen), die Figurenachse faellt. Ursache ist nicht die Geometrie, sondern das Licht
— und nicht die Helligkeit, sondern die Farbe:

    echter Korpus   Helligkeit 113 (p10 55, p90 165)   Saettigung 0,262
    Drehteller      Helligkeit 107 (p10 70, p90 130)   Saettigung 0,363   +39 %

## 5. Der Korpus hat zwei Kamera-Regime

| | n | Helligkeit | Schaerfe | Fold |
|---|---|---|---|---|
| weich | 12 | 80 | 105 | 0,770 |
| scharf | 7 | 131 | 909 | 0,789 |

Korrelation Schaerfe ~ Helligkeit **+0,82** — eine Achse, nicht zwei: wenig Licht heisst laengere
Belichtung heisst Unschaerfe. Faktor **12** in der Schaerfe, den keine Helligkeits-Augmentierung
erzeugt.

**Val liegt im weichen Regime (76), beide Test-Sessions im scharfen (1049 / 1327)** — Zufall einer
groessengetriebenen Split-Zuweisung, kein Entwurf. Entwarnung immerhin: Schaerfe sagt die Guete
nicht vorher (Korrelation −0,06).

## 6. Was das Messgeraet betrifft

- **`piece_acc` ueber alle Zellen ist nicht armvergleichbar** — die Ausduenn-Varianten trugen
  2,9 % bis 15,0 % verdeckte Val-Zellen und die Rangfolge war die Rangfolge dieses Anteils
  (Korrektur der Ausduenn-Studie, 2026-08-26).
- **`occ_board` hat sd 0,0989 je Epoche** — 35× so viel wie die Zellgenauigkeit, weil es alle 64
  Felder verlangt. Es springt zwischen Nachbarepochen von 0,03 auf 0,88. Alle occ_board-Vergleiche
  dieses Tages sind zurueckgezogen.
- **Frueher Abbruch funktioniert nicht** — geeicht ueber 33 Laeufe haette das Kriterium 15
  getoetet, darunter die zwei besten Arme (`scripts/train_watchdog.py --replay`).
- **Augmentierung ist ein ungetestetes Vorwissen**: 308 ms je Batch CPU, 16,2 % der
  Trainingsbilder ausserhalb des Helligkeitsbereichs der Kamera — und sie verhindert das
  Auswendiglernen nicht. Nie abgetastet; `--aug-scale` macht sie es.
- **Zwei Trainings parallel kosten +7 %** und liefern doppelten Durchsatz (`CHESSLAB_TRAIN_SLOT`).

## 7. Was daraus folgt

1. **Filmen schlaegt alles.** Fuenf Aufnahmen waren mehr wert als vierzehn Trainingslaeufe.
   `scripts/plan_setups.py` sagt, welche (Figur,Feld) fehlen.
2. **Der Drehteller kann das billiger** — 31 s Video statt einer Partie —, sobald sein Licht zum
   Korpus passt. Das ist die naechste Messung, nicht die naechste Meinung.
3. **Das Messgeraet zuerst.** Die vier Folds liegen fertig da; gegen 20 Sessions zu messen statt
   gegen eine ist die groesste verfuegbare Verbesserung und kostet nur GPU-Zeit.
4. **Klassenausgleich in den Sampler**, sobald mehr Situationen da sind. Heute zeigt er `wK`s 22
   Situationen 646-mal je Epoche statt 131-mal — reine Wiederholung. Mit echter Breite dahinter
   waere derselbe Regler ein Hebel statt ein Leerlauf.

## Was tatsaechlich geholfen hat (2026-08-27)

Fortsetzung von `docs/model-improvement-2026-08-26.md`, das die Diagnose traegt: das Modell konnte
99,93 % seiner Trainingsdaten und 75,85 % einer ungesehenen Session, und vierzehn Rezept-Eingriffe
bewegten die Figurenachse zwischen −0,074 und +0,000.

**Ergebnis nach 55 weiteren Laeufen: +0,165 auf dem Val, +0,178 auf dem Test, und der Typfehler
faellt um den Faktor zehn.**

| | Basis | **best-mix** | |
|---|---|---|---|
| `visible_piece_acc` (geteilter Val) | 0,7585 | **0,9234** | +0,165 |
| Typfehler (Val) | 0,234 | **0,077** | −0,157 |
| `visible_piece_acc` (TEST) | 0,8023 | **0,9802** | +0,178 |
| Typfehler (TEST) | 0,196 | **0,020** | −0,176 |
| `macro_recall` | 0,5930 | 0,9166 | +0,324 |
| `conf_auroc` | 0,8516 | 0,9524 | +0,101 |
| Konfidenz auf FEHLERN | 0,8119 | 0,7281 | −0,084 |
| **Luecke val − train** | **1,343** | **−0,005** | |

Das Rezept: `--dataset real13-mix-v4 --hflip-p 0.5 --jitter-translate 0.10 --balance class
--weight-cap 1`, sonst unveraendert (60 Epochen, bs 256, lr 0,01, cosine, BatchNorm,
`--head occlusion`, Pretrain `comp13-ms-s1-pretrain-bn80`).

### Die zwei Zutaten, und beide kamen vom Nutzer

**1. Composites in den TRAININGSSATZ, nicht in den Pretrain.** `real13-mix-v4` haengt
`comp13-v4-80` (344 128 Zeilen, 90 Pseudo-Sessions) an den echten Trainingssplit; val und test
bleiben unberuehrte echte Aufnahmen. Das hebt die (Figur,Feld)-Kombinationen von **183 auf 291**
und trifft die ausgehungerten Klassen: `wK` von DREI Feldern auf zehn, `bR` 10 → 20, `bK` 7 → 13.

Dass der Pretrain der falsche Ort dafuer war, ist gemessen: comp13-v4 als Pretrain kostete s2
0,0138 bei drei von drei Seeds. Die s2-Stufe schreibt ihn ohnehin ueber.

**2. Waagerechte Spiegelung.** `--hflip-p 0.5`, gepaart ueber drei Seeds **+0,031** (sd 0,0219,
t(2) 2,46, 3/3 positiv). Sie fuegt keine Information hinzu — sie sperrt eine Abkuerzung: der
Helligkeitsgradient laeuft in **19 von 19 Aufnahmen** von links nach rechts positiv, im Mittel
37 Graustufen. Das ist so stark wie das Figur-Signal selbst (eine schwarze Figur auf dunklem Feld
hebt sich 6 Graustufen ab, auf hellem 40) und im Trainingssatz mit der Klasse korreliert, weil die
seltenen Figuren auf wenigen Feldern stehen.

Zusammen sind sie mehr als ihre Summe: `flip` allein +0,052, `mix` allein +0,052, zusammen +0,120,
mit `--balance class` und `--jitter-translate 0.10` dann +0,165.

### Die vollstaendige Rangliste

Alle Zahlen `visible_piece_acc` auf dem geteilten Val, gepaart gegen die Basis desselben Seeds.

| Arm | vis_piece | d Basis | Typ | macro | cov_p | Luecke |
|---|---|---|---|---|---|---|
| **best-mix** (mix + flip + jit10 + balcls) | **0,9234** | **+0,165** | 0,077 | 0,9166 | 0,953 | −0,01 |
| mix + flip | 0,8786 | +0,120 | 0,121 | 0,8466 | 0,978 | 0,31 |
| mix + flip + balcls | 0,8534 | +0,095 | 0,146 | 0,8193 | 0,966 | 0,18 |
| jit20 | 0,8143 | +0,056 | 0,181 | 0,7148 | **0,226** | 0,76 |
| mix allein | 0,8101 | +0,052 | 0,189 | 0,7756 | 0,951 | 0,84 |
| flip allein | 0,8100 | +0,052 | 0,182 | 0,7327 | 0,930 | 0,72 |
| flip + jit10 | 0,7961 | +0,038 | 0,203 | 0,7109 | **0,449** | 0,55 |
| mix + balcls | 0,7880 | +0,030 | 0,206 | 0,7360 | 0,970 | 0,40 |
| gray3 (Farbe ganz weg) | 0,7717 | +0,013 | 0,226 | 0,6687 | 0,970 | 1,14 |
| jit10 | 0,7695 | +0,011 | 0,229 | 0,6595 | 0,794 | 0,92 |
| **Basis** | 0,7585 | — | 0,234 | 0,5930 | 0,944 | 1,34 |
| grayscale-p 0,25 | 0,7550 | −0,004 | 0,244 | 0,6403 | 0,949 | 1,14 |
| label smoothing 0,1 | 0,7529 | −0,006 | 0,246 | 0,6549 | 0,952 | 0,47 |
| weight decay 0,05 | 0,7502 | −0,008 | 0,216 | 0,6470 | 0,932 | 1,00 |
| invert-p 0,25 | 0,7074 | −0,051 | 0,275 | 0,6498 | 0,738 | 1,10 |
| rot90 | 0,7126 | −0,046 | 0,287 | 0,6108 | 0,879 | 0,96 |
| per-crop-Norm | 0,7146 | −0,044 | 0,268 | 0,6194 | 0,948 | 1,40 |
| Drehteller sauber allein | 0,7186 | −0,040 | 0,265 | 0,5796 | 0,950 | 1,25 |
| balance piece | 0,6844 | −0,074 | 0,305 | 0,6140 | 0,769 | 0,70 |

### Vier Warnungen aus derselben Tabelle

**1. `--jitter-translate` zerstoert den Verdeckungskopf.** `jit20` steht mit +0,056 gut da und hat
`cov_prec` **0,226** (Basis 0,944), `flip+jit10` 0,449, `best-s42` 0,297. Der Grund liegt im
Entwurf: das Verschieben des Crops aendert, wie viel der Zelle verdeckt ist, waehrend das
Coverage-Ziel fuer den UNverschobenen Crop berechnet wurde. Bei 0,03 sind das 2,4 px und
vernachlaessigbar, bei 0,10 sind es 8 px von 80. Ein ueber-flaggender Kopf ist die Phantom-Achse
und damit ein Veto — dass `best-mix` trotzdem 0,953 haelt, verdankt es den 24 384 sauberen
`empty`-Crops aus den Composites, nicht dem Rezept.

**2. Farbe wegzunehmen hilft kaum, sie unzuverlaessig zu machen schadet.** `gray3` (Farbe ganz
weg) +0,013, `grayscale-p 0,25` −0,004, `invert-p 0,25` −0,051. Die Farbe ist hier kein
Abkuerzungs-Kanal: der Farbfehler lag schon vorher bei 0,004.

**3. Die Symmetriegruppe ist nicht austauschbar.** Spiegeln hilft (+0,052), Drehen schadet
(rot90 −0,046). Eine Spiegelung ist uneigentlich und von keiner Kamera erzeugbar; die 180-Grad-
Drehung ist die einzige echte (der Blick von der anderen Tischseite). Trotzdem gewinnt die
unphysikalische. Warum, ist ungeklaert.

**4. Konzentrierte Aufmerksamkeit ist kein Guetezeichen.** Gemessen mit
`scripts/occlusion_sensitivity.py`: ein EINZELNER 16-px-Fleck kostet die Modelle 75–92 % der
Wahrscheinlichkeit. `flip` ist mit 91,6 % das sproedeste, obwohl es weniger auf den Rand schaut
(45,6 % gegen 47,3 %). Die zwei Achsen ziehen auseinander, und Robustheit hat bisher niemand
gemessen. `--erase-scale` ist der Hebel dagegen und noch ungetestet.

### Was noch offen ist

- **Ein Seed.** `best-mix` hat s42; s43 laeuft. Bei dieser Effektgroesse (+0,165 gegen eine
  gepaarte sd von ~0,03) ist die Richtung nicht strittig, die Groesse schon.
- **Der Testsatz ist die falsche Kamera.** Beide Test-Sessions stammen aus OBS/ELP-USB
  (Schaerfe 1049 und 1327), ausgeliefert wird aufs Handy (Schaerfe 64–204). Val ist Handy und
  damit die richtige Domaene — die 0,9802 auf Test sind deshalb die freundlichere Zahl.
- **Die vier Folds** stehen in der Warteschlange: der Gewinner gegen 20 Sessions statt gegen eine.
- **Robustheit gegen Verdeckung** ist gemessen, aber nicht verbessert.
