# Auswertung — wie ein Vergleich gemessen wird, und was bisher geholfen hat

## 1. Die Regeln

- **Drei Seeds je Arm, gepaart je Seed**; fuer eine Abnahme sieben (Vorzeichentest 7/7,
  p = 0,0078, verteilungsfrei — der gepaarte t-Test braeuchte 27). Bewertet wird das **Minimum**
  ueber die Seeds gegen eine Relevanzschwelle von **0,010**, nicht das Mittel.
- **Rangfolge ueber das Schwanzmittel** (letzte 10–20 Epochen, gepaart), **nie ueber `best`**.
  Ein gemeldetes Ergebnis ist dagegen ein **Checkpoint** (Regel unten), kein Schwanzmittel.
- **Rangkriterium ist `val_visible_piece_acc`.** Die Brettmetrik ist ein Produkt ueber alle
  besetzten Felder und damit ein Verstaerker (`occ_board` sd 0,0989 je Epoche, 35x die
  Zellgenauigkeit; bei `p4a-s44` faellt sie von 0,87 auf 0,53, waehrend die Zellgenauigkeit steht).
  `val_loss` streut ueber Seeds um Faktor vier.
- **Nur innerhalb desselben Val vergleichbar.** Zwischen Datensaetzen entscheidet
  `chesslab eval --dataset <gemeinsamer>`; `piece_acc` ueber alle Zellen ist nicht armvergleichbar
  (Ausduenn-Varianten trugen 2,9–15,0 % verdeckte Val-Zellen, die Rangfolge war genau dieser
  Anteil).
- **Kandidatenzahl gegen den Siegerfluch:** 2 bei 1 Seed, 4 bei 3, 8 bei 5, 13 bei 7. Eine Liste
  wird gekuerzt, nicht abgearbeitet. Mehrere Arme auf einem Seed taugen zur Zerlegung, nicht zur
  Auswahl.
- **Mehr Seeds ersetzen keine weiteren Aufnahmen.** Seed- und Aufnahme-Streuung getrennt berichten;
  Aufnahmegruppen (samt abgeleiteter Kompositen desselben Quellvideos) zusammenhalten.
- **Lauf-Eignung mechanisch**: lueckenlose, eindeutige Epochenindizes statt Zeilenzahl;
  Unvollstaendiges wird ausgeschlossen, nicht markiert. `--patience 999`, sonst fehlt der Schwanz.
- **Fehler-Mining nur auf Trainingsfehlern**, nie auf Test.
- **Nur Eingriffe testen, die einen grossen Effekt erwarten lassen.** Wer 0,005 sucht, braucht ein
  anderes Messgeraet, nicht mehr Seeds.
- **Alte gegen neue Zahlen** vergleichen fast immer mehrere Aenderungen mit: Datenpfad (Datei gegen
  Memmap), Definition von `val_checkpoint_score` (`83db7e75`), Aenderungen am Verlust (z. B.
  Klassengewichte, `docs/class-scheme.md`), Stackwechsel (`docs/training-speed.md`).
- **Zwei Trainings parallel** kosten +7 % je Lauf und liefern doppelten Durchsatz
  (`CHESSLAB_TRAIN_SLOT`).

## 2. Rauschen

- **Das Training ist deterministisch**: `--seed 42` zweimal, jede Metrik bitgleich (ROCm, AMP,
  8 Worker, ohne `use_deterministic_algorithms`). Pythons `random` wurde bis 2026-08-25 nicht
  geseedet; bei `--num-workers 0` gab das andere Pixel. Ohne Determinismus verliert der gepaarte
  Vergleich seinen Hebel: **gepaart faellt die Streuung von 0,027 auf 0,003**, solange wirklich
  alles ausser der Achse gleich ist — ein anderer Pack aendert die Batch-Reihenfolge.
- **Seed-Streuung haengt am Rezept**: auf `real13-mix-v7-128`, sieben Seeds, `p4a` sd 0,0073,
  `rot` 0,0019. Die Spanne dreier Seed-Mittel (bei 80 px 0,016) ist **keine Standardabweichung und
  keine Signifikanzschwelle**. Paarung kuerzt den Seed-Effekt nicht heraus
  (sd_d 0,0204 = √2 × 0,0144).
- **Das Epochenrauschen kommt zu 94 % aus dem Modell**, zu 6 % aus dem Val (11 684 sichtbare
  Figurenzellen, Stichproben-sd 0,0024 gegen 0,0095 Epochenstreuung). Ein groesserer Val hilft
  nicht, Mitteln ueber die Zeitachse schon. Schwanzepochen sind allerdings korreliert — 15
  gemittelte sind keine 15 Wiederholungen.
- **`best` liegt konstruktionsbedingt ueber dem Niveau**: Maximum ueber 60 verrauschte Ziehungen,
  erwartet 2,3–2,9 sd, gemessen im Schnitt 2,9 — aber der Aufschlag streut selbst zwischen 1,4 und
  6,1 sd und kuerzt sich beim Vergleich NICHT heraus (auf v7: +0,0010 bis +0,0310). Ein Lauf hatte
  seinen Bestwert bei Epoche 4 von 60.
- **Zurueckgenommen (2026-08-25):** die Empfehlung `real13-ms-s3-hn4-bn80` statt `swa1e4` stuetzte
  sich auf AUROC 0,908 gegen 0,870 bei einer Seed-Spanne von 0,099.

## 3. Laenge und Screening

- Innerhalb einer 60-Epochen-Cosine steigt die Kurve bis zur letzten Epoche — **laenger trainieren
  hilft trotzdem nicht**: 120 Epochen gegen 60 lagen −0,0125, die Ueberanpassungsluecke wuchs.
  Zwei Arme bei 60 Epochen messen, wer nach 60 vorn ist, nicht das bessere Rezept.
- **Kurze Laeufe sieben nicht**: Spearman der Rangfolge nach 15 gegen nach 60 Epochen **0,40**,
  nicht monoton, verlaesslich erst ab 45 (0,87). Frueher Abbruch haette an 33 Laeufen 15 getoetet,
  darunter die zwei besten (`scripts/train_watchdog.py --replay`); die frueheste tragfaehige
  Sprosse ist 25 von 60. **Kein ASHA/Hyperband, kein Optuna/Ray** (eine Studien-DB waere eine zweite
  Wahrheit neben `metrics.jsonl`).
- **`epoch-frac` ist kein RAM-Deckel** — es aendert Optimierung und Datenmenge; 0,35 ist Hausrezept.

## 4. Metriken und Checkpoint

- **Checkpoint-Regel (festgelegt 2026-09-12):** der Finalist ist `best.pt`, und der Test sieht
  genau diesen Checkpoint. `best.pt` ist die Epoche mit der hoechsten `visible_piece_acc` auf dem
  Val, Gleichstand ueber sichtbare Belegung und Konfidenz-AUROC; `best_piece.pt` behaelt die erste
  Epoche, die diesen Wert erreicht. (Die Plan-Regel nannte den gewichteten Score aus
  `CHECKPOINT_WEIGHTS` — `training/epoch_metrics.py` verwirft ihn, siehe das TODO dort.)
- **Seit Metrik-Schema 2 (2026-09-10):** der Board-Val-Verlust zaehlt Crops in Zaehler und
  Nenner; alte Board-Verluste waren um Faktor 64 aufgeblaeht — nicht direkt vergleichen.
  `t_data_s` ist Teil von `t_train_s`. Neue Laeufe brauchen ein frisches Verzeichnis;
  `--continue` verlangt eine kompatible Checkpoint-Politik.
- **Auswertung je Verweil-Episode** (`scripts/episode_eval.py`): eine Episode ist ein
  zusammenhaengender Ply-Lauf einer Figur auf einem Feld. Der v7-Val loest **147 Episoden** auf,
  nicht 32 330 Zellen — eine Episode ist **0,68 pp**. Die aeltere Zaehlung (~876 (Ply, Feld)-Paare
  auf dem alten Val) war zu grosszuegig. Unsicherheit wird je Episode oder Aufnahmegruppe
  gebootstrappt (`scripts/group_bootstrap.py`), nie je Zelle.

## 5. Der Val-Satz

- **Nach Klassenabdeckung waehlen, nicht nach Bildqualitaet** (2026-09-10). Der damalige Val
  `2026-09-06-21-29-35` sah sauber aus und trug **null weisse Springer**, 12 schwarze Damen, 73 %
  `empty` — `macro_recall` und damit `score` waren auf vier von 13 Klassen Rauschen. Gewechselt
  worden war er, weil der Schaerfe-/Dunkelfilter den alten Val auf 170 Zeilen gestutzt hatte.
- **Geltender Val: `rg-2026-09-06-20-27-33`** in `split-pin.json` (548 Bretter, seltenste Klasse
  207, nachgezaehlt 2026-09-22). Reserve: `20-57-45` (504 / 121) — vom selben Tag, ein Val aus
  einem Tag misst einen Aufbau, nicht die Bandbreite. Am Korpus halten **19 von 27** Aufnahmen jede
  Figurenklasse ueber 100 Zellen (2026-09-22).
- **`--split-file` nie vergessen**: gegen den eigenen Datensatz nimmt `eval` sonst die
  `split_file` aus der `config.json`, gegen einen fremden dessen `split.json`.
- **Schaerfe nur je Aufloesungsklasse vergleichen**: Laplace-Median 4K 1359, 1440p 407, 1080p 521.
- **55,1 % der sichtbaren v7-Val-Zellen stammen aus `dirty`-Frames** (17 805 von 32 330). Nach der
  Zellen-Regel zulaessig; vor einer Testmessung pruefen, ob der Test dieselbe Mischung traegt.
- **Turntables taugen nicht als Val** (keine Spielstellungen) und addieren im Training 6–9 % je
  Klasse — Kompositen liefern bereits ueber die Haelfte jeder seltenen Klasse.

### Der Test

`rg-2026-08-08-00-39-57` und `-11-55-19` sind verbrannt (33- bzw. 32-mal in `eval_test*.json`) und
sind zudem die falsche Kamera (OBS/ELP-USB, scharf; ausgeliefert wird aufs Handy). **Unberuehrter
Test: `rg-2026-09-11-20-00-52`**, mechanisch gesperrt in `data/TEST-USED.json`
(`scripts/test_used.py --check <session>` endet mit 1, sobald eine Aufnahme verbrannt ist). Er
wird **einmal** ausgewertet, nach Auswahl und Einfrieren des Checkpoints.

## 6. Was geholfen hat

### Daten, nicht Rezept (2026-08-26)

Das Modell konnte **99,93 %** seiner Trainingsdaten und **75,85 %** einer ungesehenen Session
(`train_loss` 0,034 gegen `val_loss` 1,332). Vierzehn Rezept-Eingriffe bewegten die Figurenachse
zwischen −0,074 und +0,000; fuenf zusaetzliche Aufnahmen um +0,095. Der Trainingssplit kannte
1 643 Situationen (Session, Feld, Klasse) und nur **183 (Figur, Feld)-Kombinationen**, `wK` auf drei
Feldern. Der Fold-Wert einer Session korrelierte mit −0,59 mit der Zahl ihrer Situationen.

### `best-mix` (2026-08-27): +0,165 auf dem Val

`--dataset real13-mix-v4 --hflip-p 0.5 --jitter-translate 0.10 --balance class --weight-cap 1`:
`visible_piece_acc` 0,7585 → 0,9234, Typfehler 0,234 → 0,077.

- **Kompositen in den TRAININGSSATZ, nicht in den Pretrain** (dort −0,0138, 3/3 Seeds): 183 → 291
  (Figur, Feld)-Kombinationen. Val und Test bleiben echte Aufnahmen.
- **Waagerechte Spiegelung** +0,031 gepaart (3/3): sie sperrt eine Abkuerzung — der
  Helligkeitsgradient laeuft in 19 von 19 Aufnahmen links → rechts, im Mittel 37 Graustufen.
- **`--balance class`** wirkt ueber das Herunternehmen von `empty` (`--balance piece`: −0,074) und
  kostete Coverage-Precision (0,944 → 0,680) — ein ueber-flaggender Kopf ist die Phantom-Achse.
- **`--jitter-translate` zerstoert den Verdeckungskopf**: `jit20` hat `cov_prec` 0,226.
  Das Coverage-Ziel gilt fuer den UNverschobenen Crop; bei 0,10 sind das 8 px von 80.
- Farbe wegnehmen hilft kaum (`gray3` +0,013), sie unzuverlaessig machen schadet (`invert-p`
  −0,051). Weight decay, Label Smoothing, per-crop-Norm: keine Gewinne.
- **`rot90` −0,046 galt damals** (80 px, ohne Flip, ohne Brettkopf, `real13-mix-v4`) — nicht
  verwechseln mit der Abnahme unten, wo die Drehung der groesste Hebel ist.
- Drehteller-Material (Saettigung +39 % gegen den Korpus) senkte die Figurenachse; Ursache Licht,
  nicht Geometrie.

### Die Abnahme auf `real13-mix-v7-128` (2026-09-12/13): `--rot90` traegt die 99 %

Schwanzmittel der letzten 20 Epochen, gepaart, `split-pin.json`:

- **`rot` (`--rot90 --hflip-p 0.5`) gegen `p4a`: 7/7 Seeds, p = 0,0078, Minimum +0,0168.** `rot`
  liegt auf 7 von 7 Seeds ueber 99 %, `p4a` auf keinem; der schlechteste `rot`-Seed schlaegt den
  besten `p4a`-Seed.
- **Ablation**: `--rot90` allein +0,0337, `--hflip-p 0.5` allein +0,0265, beide +0,0335 —
  redundant, **`--hflip-p` kann neben `--rot90` entfallen**.
- **Episoden-Bootstrap** (147 Episoden, 7 Seeds): +0,0612, 95 % [+0,0321, +0,0943]. **Ueber die vier
  Sitzungs-Folds** (3 955 Episoden, 49 Aufnahmen, 8 Gruppen): +0,0736 [+0,0521, +0,0890], **`rot`
  gewinnt in 8 von 8 Gruppen**. Out-of-fold liegt das Niveau viel tiefer; Fold-Metriken sind mit
  dem Hauptmodell nicht vergleichbar.
- **128 gegen 80 px: 6/6 Seeds**, gepaartes Minimum +0,0104 — eine Rangfolge-Aussage. Ob 80 px
  die 99 % traegt, ist offen bis zum Test. Geraetepreis 128 px: 7,5–8,0 ms je Brett gegen 4,3–4,9.
- **Der Streit ist gesichtet**: auf Seed 42 hatte `rot` in 114 von 116 strittigen Zellen recht; der
  Nutzer fand bis auf ein dirty-Frame alle Labels korrekt. Echte Erkennung, kein Label-Rauschen.

### Die Fehlermechanik

- **68 % aller Restfehler stammen aus 12 von 280 Verweil-Episoden** (Fehleranalyse 2026-09-11).
  Ursache ist die **Blickrichtung des Springers**: Kopf von der Kamera weg → runder Klotz → liest
  sich als Turm, Konfidenz 0,99. Auf v7 verteilten sich die 69 von `p4a` verlorenen Episoden zu
  52 % auf Springer, zu 67 % auf Springer und Laeufer. Nicht Helligkeit, nicht Feldfarbe.
- **Der Korpus hat EINE Kamerapose** (Verkuerzung der hinteren Kante 0,955–1,025, Median 0,986) —
  die Mechanik ist die Eigendrehung der Figur, deshalb traegt `--rot90`.
- **Label-Rauschen ist nicht der Deckel**: 0,36 % im Pool, 0,105 % im Val → Messgrenze ~99,7 %.
- **128 px ist die Sensorgrenze**: 20 von 22 Aufnahmen tragen 97–126 echte Quellpixel je Zelle.
  Keine 160 px, kein groesseres `board_size` — reine Interpolation.
- **Ein Farbfehler** (`g6 bP → wP`, 0,91) zaehlt in `piece_acc` wie ein Typfehler, ist im Tracker
  aber der teurere.

### Architektur: kein Hebel

- **A1 (`cellnet_p4g2`, 2x2-Pooling statt globalem Mittel)** — die einzige Architektur mit Bezug zur
  Blickrichtung IN der Zelle — **verliert in jedem Regime** (−0,0079 bis −0,0195, ein Seed je
  Regime), trotz 147 648 Parametern mehr; am meisten bei 80 px. A2 (vier Tokens je Feld) ist eine
  andere Hypothese ohne gemessenen Grund.
- **Aufmerksamkeits-Kandidaten** (Gated SDPA, Differential Transformer) zielen auf Kontext, unser
  Fehler ist ein verlorenes Detail innerhalb der Zelle. Liegen, bis es eine Mechanik fuer sie gibt.
- **Distillation** braucht einen Lehrer, der auf unserem Val nachweislich besser ist — den gibt
  es nicht.
- Die Behauptung in `boardnet.py`, Positionskodierung habe „bei 80 px 0,16 gekostet“, hat keine
  Messung hinter sich.
- Kosten je Architektur und die tote P8-Linie: `docs/training-speed.md` §5.

### Die hochskalierten Kompositen (2026-09-13)

Die 105 152 Zeilen aus `VID_20260812_112853` und `2026-08-09 20-48-50` (90-px-Kasten, auf 128
hochgerechnet) weglassen: +0,0014 (3/3); gleich viel SCHARFES Material weglassen: −0,0032 (0/3).
Die Differenz +0,0046 liegt unter der Relevanzschwelle. Bei 80 px ist derselbe Kasten eine
Verkleinerung (0,89x) und einwandfrei. **Entscheidung (Nutzer): nicht jetzt neu bauen, erst
Ersatz** — die zwoelf Sitzungen tragen 13,3 % der Figurenzeilen, ~3 300 je Figurenklasse (Bauern
13 000). Bis dahin bleibt `real13-mix-v7-128` die Messlatte.

### Das Veto

`p4n` hat dieselbe Genauigkeit wie `p4a`, aber 10x so viele Phantome im Kotlin-Replay (20 gegen 2).
Phantome entscheiden, nicht `val_acc`.

## 7. Offen

- Checkpoint einfrieren, Test **genau einmal**.
- ONNX gegen PyTorch numerisch, Telefon-Laufzeit, Phantome im Replay.
- Zeitliche Mehrheit auf dem Geraet (Kotlin); `episode_eval` misst vorab, was sie braechte.
- Ersatz fuer die hochskalierten Kompositen, dann ein Neubau.
- Was eine Erfassungs-Session semantisch ist (ein Aufbau mit drei Figuren hat keinen FEN-Zug).

Nicht getan wird: FEN-Labels automatisch ueberschreiben, weil ein Modell widerspricht.

## 8. Ausgemusterte Laeufe (2026-08-20)

Von 111 Laeufen unter `data/models/` wurden 101 geloescht: 40 nie ausgewertete p/d/s-Sweeps
(Befund in `docs/frame-scan.md`), 27 des aufgegebenen 14-Klassen-Schemas, 13 ohne Export, 12
Lernraten-Sweeps, 9 auf dem leckenden `comp13-occ-80-v1`. Die Generation erreichte `board_acc`
0,05–0,18 bei `square_acc` 0,75–0,90. Geblieben sind die Laeufe mit ONNX (die Herkunft dessen, was
im APK lag) und `comp13-occ-bn-lr1e2-bs512` als Rezept.
