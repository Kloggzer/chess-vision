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
| Crop schneidet Figurenkoepfe ab (`pad_up = 0`) | **widerlegt** — Neu-Warp mit 220 px Rand: die Figuren passen in ihre Zelle. `pad_up` waere ausserdem der falsche Knopf, die Neigung ist radial (`scripts/lean_probe.py`, `scripts/border_probe.py`) |
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
  (`docs/per-position-mix.md`, Korrektur).
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
