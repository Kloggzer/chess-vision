# Was tatsaechlich geholfen hat (2026-08-27)

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

## Die zwei Zutaten, und beide kamen vom Nutzer

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

## Die vollstaendige Rangliste

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

## Vier Warnungen aus derselben Tabelle

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

## Was noch offen ist

- **Ein Seed.** `best-mix` hat s42; s43 laeuft. Bei dieser Effektgroesse (+0,165 gegen eine
  gepaarte sd von ~0,03) ist die Richtung nicht strittig, die Groesse schon.
- **Der Testsatz ist die falsche Kamera.** Beide Test-Sessions stammen aus OBS/ELP-USB
  (Schaerfe 1049 und 1327), ausgeliefert wird aufs Handy (Schaerfe 64–204). Val ist Handy und
  damit die richtige Domaene — die 0,9802 auf Test sind deshalb die freundlichere Zahl.
- **Die vier Folds** stehen in der Warteschlange: der Gewinner gegen 20 Sessions statt gegen eine.
- **Robustheit gegen Verdeckung** ist gemessen, aber nicht verbessert.
