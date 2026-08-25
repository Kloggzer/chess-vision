# Wie viele Bretter je Stellung — und welche (2026-08-25)

Die Vermutung war, acht Bretter je Stellung seien acht fast identische Ansichten: der Datensatz
wachse, die Information nicht. Gemessen ist das Gegenteil, und die interessante Achse ist eine
andere als die vermutete.

## Aufbau

Ausgedünnt wird OHNE Neu-Export (`scripts/thin_per_position.py`): die Variante wählt aus dem
Manifest von `real13-straight-80-v3` aus und packt per `--from` aus derselben Memmap — **bis aufs
Bit dieselben Crops**, nur weniger davon. Ein Neu-Export hätte andere Bilder gewählt und zwei
Änderungen vermischt.

„Sauber" heißt: im Coverage-Rang der Stellung vorn. Ein absoluter Schnitt taugt nicht — eine Hand
über 12 von 64 Zellen ergibt im Mittel auch nur ~0,15.

Rezept überall gleich (s2: `--resume comp13-ms-s1-pretrain-bn80`, 60 Epochen, `--patience 60`,
bs 256, lr 0,01, cosine, BatchNorm, `--head occlusion`). Werte am besten Checkpoint, Median über
die Seeds.

**Nebenbefund vorweg:** die meisten Stellungen tragen **16** Bretter, nicht 8 — `per_position` 8
PLUS `dirty_per_position` 8, im Schnitt 14,2. Die Frage hieß real „14 oder 4".

## Die fünf Arme

| Arm | sauber | verdeckt | Crops | Seeds | `piece_acc` | `occ_board` | `cov_prec` | `cov_F1` |
|---|---|---|---|---|---|---|---|---|
| p2 | 2 versch. | 2 | 116 475 | 3 | 0,6475 | 0,3485 | 0,8382 | 0,8848 |
| c2x4d2 | 2, ×4 | 2 | 300 339 | 2 | 0,7091 | 0,4394 | 0,7621 | 0,8364 |
| c2d8 | 2 | 8 | 288 259 | 2 | 0,6774 | 0,3559 | 0,9088 | 0,9156 |
| **c8d2** | **8** | **2** | 291 050 | 3 | **0,7288** | **0,7835** | 0,9277 | 0,9340 |
| p8 | ~8 | ~8 | 424 519 | 3 | 0,6974 | 0,5843 | **0,9762** | **0,9395** |

## Was daraus folgt

**1. Ausdünnen kostet.** p8 schlägt p2 gepaart bei jedem Seed und auf jeder Metrik
(`piece_acc` +0,035 bis +0,099, `occ_board` +0,13 bis +0,36). Die Redundanz ist nicht leer.

**2. Aber es sind die SAUBEREN Bretter, die tragen.** `c8d2` gegen `c2d8` — gleiche Größe, gleiche
Batch, nur die Mischung anders — ist bei beiden Seeds positiv: `piece_acc` +0,06, `occ_board`
+0,32 bis +0,46. Und `c8d2` schlägt sogar **p8** auf `piece_acc` und `occ_board`, mit 31 % weniger
Crops. Verdeckte Zellen sind aus dem Klassifikationsverlust maskiert; acht verdeckte Bretter je
Stellung verbrauchen Sampling-Budget, ohne der Identität etwas beizutragen.

**3. Vielfalt, nicht Häufigkeit.** `c2x4d2` zieht 2 saubere Bretter vierfach — gleiche
Epochengröße, gleiches Verhältnis wie `c8d2`, nur 2 statt 8 verschiedene. Es verliert bei beiden
Seeds: `occ_board` −0,21/−0,40, `coverage_precision` −0,16/−0,21. Wenige Bretter öfter zu ziehen
ersetzt verschiedene Aufnahmen nicht.

**4. Die Coverage-Precision hängt an den sauberen Beispielen.** Sie ordnet sich exakt nach deren
Zahl: p8 0,976 > c8d2 0,928 > c2d8 0,909 > p2 0,838 > c2x4d2 0,762. Der Kopf braucht Negativbeispiele
mindestens so dringend wie Positive; wer ihm verdeckungslastig füttert, bringt ihm bei, überall
Verdeckung zu sehen. Das ist die **Phantom-Achse** — ein über-flaggender Kopf blendet die Recovery
(`RECOVERY_OCCLUDED_LIMIT` = 0).

## Die Achsen ziehen gegeneinander

`c8d2` gewinnt die Identität, `p8` die Coverage-Precision. Wer beides will, hat hier keinen
Gewinner, sondern eine Abwägung — und die Frage, ob `dirty_per_position` je Achse verschieden
gesetzt werden sollte.

## Fallen

- **Ein Seed reicht nicht, auch nicht für eine Richtung.** Aus Seed 42 allein sah es so aus, als
  erkenne `c2d8` Verdeckung SCHLECHTER als `c8d2` (F1 0,875 gegen 0,942). Mit Seed 43 kippt das
  (F1 −0,022). Stabil ist nur die Precision; Recall zieht dagegen, und F1 mittelt es weg.
- **`coverage_mae` ist auf diesem Val-Split irreführend.** 54 % der Bretter sind ganz sichtbar,
  also belohnt MAE, wer gut Null vorhersagt. Precision und Recall getrennt lesen.
- **Gepaart vergleichen** (`docs/seed-noise-floor.md`): bei geteilten Seeds ist die Differenz je
  Seed die Beobachtung, nicht der Abstand gegen die Spanne.

## Reproduktion

    uv run python scripts/thin_per_position.py <quelle> <ziel> --clean 8 --dirty 2 [--clean-repeat N]
    uv run chesslab dataset pack <ziel> --pack-size 80x80 --from <quelle>
