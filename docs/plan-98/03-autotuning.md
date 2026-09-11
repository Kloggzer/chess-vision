# Automatisiertes Tuning und Versuchsprotokoll (Entwurf, 2026-09-11)

> Teil 03 des 98-Plans. Rahmen: `docs/accuracy-98-plan.md`. Messdisziplin:
> `HANDOFF-TRAINING-2026-09-11.md`. Alle Zahlen hier sind auf vorhandenen `metrics.jsonl`
> gerechnet — es wurde für dieses Dokument **kein Training gestartet**.
> Nachrechnen: `uv run python scripts/rung_predictiveness.py`.

## 0. Das Ergebnis vorweg

Der Auftrag lautet: eine Suche, die selbst fährt und am Ende EINE belastbare Rangfolge ausspuckt,
Ziel deutlich über 98 % und **kein Glücksgriff**. Gemessen an dem, was auf der Platte liegt, ist
die Lage diese:

1. **Die Leiter (ASHA / sukzessives Halbieren) bringt hier wenig.** Die früheste Sprosse, an der
   die spätere Nummer eins in jeder Kohorte überlebt, liegt bei **Epoche 25 von 60** — also bei
   42 % des Laufs. Eine zweistufige Leiter spart dadurch 44 % der Siebphase, nicht 80 %.
2. **Der große Hebel ist die Seed-Staffelung, nicht die Epochenachse.** Die Siebphase auf EINEM
   Seed zu fahren und erst die Überlebenden zu vervielfachen, spart Faktor 3 — mehr als die
   Leiter je kann.
3. **Der Siegerfluch ist hier größer als jeder Hyperparameter-Effekt.** Bei `sd = 0,0157` und
   einem Seed liefert das Maximum aus 200 gleich guten Konfigurationen **+0,043 geschenkt** —
   mehr als der gemessene Auflösungssprung von 80 auf 128 px (+0,0435). Die rechenbare Antwort
   auf „wie viele darf ich vergleichen": **2 bei einem Seed, 4 bei drei, 8 bei fünf** (§4).
4. **Der Val-Satz kann 99 % nicht mehr auflösen.** `_arch128v6-frac1/p4a-s42` steht schon bei
   0,9860 (Mittel der letzten 15 Epochen). Von dort auf 0,990 sind **47 Zellen von 11 684** —
   weit unter der Nachweisgrenze von ~0,010. Robustheit muss deshalb über die Sitzungs-Folds und
   den unangetasteten Test-Split nachgewiesen werden, nicht über einen besseren Val-Wert.
5. **Abgenommen wird auf dem MINIMUM über die Seeds**, nicht auf dem Mittel. „Kein Glücksgriff"
   heißt formal genau das: ein Glücksgriff ist das Maximum, die ehrliche Statistik das Minimum.

Daraus folgt die Reihenfolge: erst 128 px über mehrere Seeds festnageln, dann eine *kleine*
Suche (N ≤ 12) mit Bestätigungsstufe, dann Folds, dann einmal Test.

---

## 1. Was die vorhandenen Läufe hergeben

### 1.1 Datenbasis

`scripts/rung_predictiveness.py` sammelt jede `metrics.jsonl` mit vollen 60 Epochen und wertet
Kohorten ab 6 Läufen aus:

| Kohorte | Läufe | Spanne `visible_piece_acc` (tail 15) |
|---|---:|---|
| `data/models/_arch/real13-mix-v4` | 11 | 0,8932 – 0,9453 |
| `data/models/_arch/real13-mix-v4-128` | 15 | 0,0860 – 0,9894 (einer ist der `VERWORFEN`-Lauf) |
| `data/models/_arch80v6-frac1` | 6 | 0,8588 – 0,9587 |

`_arch128v6-frac1` (4 volle Läufe) und `_arch80v6` (1) sind zu klein für eine Rangfolge und
werden übersprungen. **Einschränkung:** 26 der 32 Läufe stammen aus der v4-Generation, vor
Schärfe- und Dunkelfilter. Dass die Sprossen-Kalibrierung auf v6 genauso ausfällt, ist
**unbelegt** — das Skript rechnet sie neu, sobald genug v6-Läufe da sind.

### 1.2 Was eine frühe Sprosse auflöst — und was nicht

Sprosse `r` = Mittel der Epochen `[r-8, r)`, also nur, was zu diesem Zeitpunkt auf der Platte
steht. Frage: ordnet sie ein Paar von Läufen so, wie der Schwanz es später tut?

| Endabstand | r=15 | r=20 | **r=25** | r=30 | r=40 |
|---|---:|---:|---:|---:|---:|
| < 0,01 | 62 % | 52 % | 65 % | 70 % | 72 % |
| 0,01 – 0,02 | 61 % | 57 % | **70 %** | 68 % | 86 % |
| 0,02 – 0,04 | 76 % | 79 % | **84 %** | 87 % | 95 % |
| ≥ 0,04 | 96 % | 98 % | **100 %** | 100 % | 100 % |

Unter 0,01 Endabstand ist jede Sprosse bis Epoche 40 praktisch ein Münzwurf. **Das ist die
Auflösung des Instruments, und der Entwurf darf ihr nichts abverlangen, was sie nicht hat.**

### 1.3 Wo darf geschnitten werden

| Sprosse | behalte 75 % | behalte 50 % | behalte 33 % | mittleres rho |
|---|---|---|---|---:|
| 10 | 8/9 | 7/9 | 5/9 | +0,44 |
| 15 | 8/9 | 7/9 | 5/9 | +0,54 |
| 20 | 8/9 | 7/9 | 5/9 | +0,62 |
| **25** | **9/9** | **8/9** | 6/9 | +0,74 |
| 30 | 8/9 | 8/9 | 6/9 | +0,67 |
| **40** | **9/9** | **9/9** | **8/9** | +0,88 |

„x/9" = wie oft die spätere Top-3 der drei Kohorten den Schnitt überlebt. Der spätere **Sieger**
allein überlebt an den Sprossen 10/15/20 nur in 2 von 3 Kohorten, ab Sprosse 25 in 3 von 3 —
auch bei `behalte 33 %`. Der Fall, der die frühen Sprossen kippt, ist `real13-mix-v4/battn-s42`:
Endrang **1 von 11**, Rang bei Epoche 13–20 **7 von 11**. Genau der Lauf, den ein Sieb bei
Epoche 20 weggeworfen hätte.

### 1.4 Wieviel Rauschen bleibt, und wo es herkommt

| Schwanzlänge | mittlere Seed-sd (6 Arme mit ≥ 3 Seeds) |
|---|---:|
| 1 Epoche | 0,0182 |
| `best` (Maximum) | 0,0159 |
| 15 Epochen | 0,0163 |
| 20 Epochen | 0,0155 |
| 30 Epochen | 0,0135 |

Mitteln hilft, aber sättigt: von 0,0182 auf 0,0135 ist Faktor 1,35, nicht 1/√30. Der Rest ist das
Modell selbst (die Übergabe misst 94 %). Der **Val-Stichprobenboden** bestätigt das von der
anderen Seite: auf 11 684 sichtbaren Figurenzellen ist die binomiale sd bei 98,6 % gerade
0,0011 und bei 99,0 % 0,0009 — **17-mal kleiner als die Seed-Streuung**. Ein größerer Val kauft
nichts, wie das Handoff sagt.

### 1.5 Paarung kürzt den Seed-Effekt NICHT heraus

Das ist die unbequemste Messung in diesem Dokument. Über alle Armpaare mit denselben drei Seeds:

| Paar | gepaarte Differenzen | Mittel | `sd_d` | t (df=2) |
|---|---|---:|---:|---:|
| `augval-both − augval-aug` | +0,0175 / +0,0147 / −0,0016 | +0,0102 | 0,0103 | +1,71 |
| `augval-eager − augval-aug` | +0,0178 / +0,0048 / +0,0420 | +0,0215 | 0,0189 | +1,98 |
| `augval-eager − augval-both` | +0,0003 / −0,0099 / +0,0436 | +0,0113 | 0,0284 | +0,69 |
| `p8a − p4a` (80 px v6) | −0,0539 / −0,0999 / −0,0874 | −0,0804 | 0,0238 | −5,85 |

Die mittlere Einzel-sd dieser Arme ist 0,0144. Wären die Seeds unabhängig, wäre
`sd_d = √2 · 0,0144 = 0,0204` — beobachtet sind im Mittel **0,0204**. Die Paarung liefert also
**exakt null Varianzreduktion**: was ein Seed einem Arm gibt, gibt er dem anderen nicht.
Paarung bleibt trotzdem richtig (sie schließt einen Bias aus), aber sie darf nicht als
Ersparnis eingeplant werden.

Damit ist die Nachweisgrenze rechenbar. Gepaarter t-Test, einseitig, α = 0,05, Power 0,8:

| `sd_d` | Effekt 0,005 | 0,010 | 0,015 | 0,020 | 0,030 |
|---|---:|---:|---:|---:|---:|
| 0,015 | 56 Seeds | 14 | 6 | 4 | 2 |
| **0,021** (gemessen) | **109** | **27** | **12** | **7** | **3** |
| 0,028 | 194 | 49 | 22 | 12 | 5 |

**Drei Seeds belegen nur Effekte ab ~0,035.** Deshalb steht in §6 ein anderer Test.

### 1.6 Kosten je Lauf (gemessen, `t_train_s + t_val_s`, Median ab Epoche 5)

| Aufbau | s/Epoche | 60 Epochen |
|---|---:|---:|
| 80 px, `--epoch-frac 0.35`, Compiler, Memmap, 2 Worker (`_arch80v6/p4a-s43`) | 9,7 | ~10 min |
| 80 px, dasselbe mit `--low-memory`, 4 Worker (`_arch80v6/p4a-s42`) | 17,8 | ~19 min |
| 80 px, `--epoch-frac 1.0`, Memmap (`_arch80v6-frac1/p4a-s42`) | 25,5 | ~26 min |
| 128 px, `--epoch-frac 1.0`, Memmap (`_arch128v6-frac1/p4a-s42`) | 80,0 | ~80 min |

Dazu je Prozessstart 40–60 s (Epoche 0 kostet 39–59 s gegen 10–26 s im Beharrungszustand) —
relevant, weil jede Sprossen-Unterbrechung einen Start extra kostet.

- `--low-memory` kostet rund **1,8x je Epoche**. Die beiden Läufe unterscheiden sich auch im
  Seed und in der Worker-Zahl; der Faktor ist **plausibel, aber nicht sauber isoliert** und
  gehört einmal auf ruhigem Rechner nachgemessen.
- **Planungswert 128 px bei `--epoch-frac 0.35` mit `--low-memory`: 0,85 min/Epoche**
  (80 s/Ep × 0,35 × 1,8). Das ist **abgeleitet, nicht gemessen** — der einzige 128-px-v6-Lauf
  mit vollen 60 Epochen lief auf `frac 1.0` ohne `--low-memory`.
- Planungswert 80 px unter denselben Bedingungen: **0,32 min/Epoche**.

---

## 2. Die Suchstrategie

### 2.1 Vier Stufen, jede mit eigener Aufgabe

```
S0  Anker        1 Rezept  x 7 Seeds  x 60 Ep   -> Basislinie, wird von allen wiederverwendet
S1  Sieben       N Konfigs x 1 Seed   x Leiter  -> KANDIDATEN, niemals ein Sieger
S2  Bestaetigen  m Kandidaten x 7 Seeds x 60 Ep -> Vorzeichentest gegen den Anker
S3  Folds        Sieger + Anker x 4 Sitzungs-Folds -> Robustheit ueber Aufnahmen
S4  Test         EINE Auswertung des eingefrorenen Modells, danach ist der Split verbraucht
```

Die Trennung S1/S2 ist der Kern: **S1 darf sieben, so viel es will, weil sein Ergebnis nichts
behauptet.** Erst S2 vergleicht — und S2 hat so wenige Kandidaten, dass der Siegerfluch
beherrschbar bleibt (§4).

### 2.2 Die Leiter in S1

- Sprossen bei **25** und **40** von 60 Epochen. Begründung §1.3: 25 ist die erste Sprosse, an
  der der spätere Sieger in allen Kohorten überlebt; 40 ist die erste, an der auch die Top-3
  vollständig durchkommt.
- Bewertung an der Sprosse `r`: **Mittel der Epochen `[r-8, r)`** von `val_visible_piece_acc`.
  Nie `best`, nie eine Einzelepoche. (`val_visible_piece_acc` ist auch das beste frühe Signal:
  `val_conf_wrong` korreliert auf zwei Kohorten mit −0,45/−0,69, dreht aber auf v6 ins Positive;
  `val_loss` und die Brettmetrik liegen durchweg schwächer.)
- Reduktionsfaktor **η = 3 an Sprosse 25, η = 2 an Sprosse 40** — aber mit Toleranzband:

```
behalte an Sprosse r alles, was
    (a) unter den besten ceil(n/eta) liegt, ODER
    (b) hoechstens `tol[r]` hinter dem Sprossenfuehrer liegt.
tol[25] = 0.020   # unter 0,02 ordnet r=25 nur zu 65-70 % richtig (1.2)
tol[40] = 0.010   # unter 0,01 ordnet r=40 nur zu 72 % richtig
```

Das Band ist der Preis dafür, dass die Sprosse ihre eigene Auflösung kennt. Ohne es wirft die
Leiter genau die `battn`-Fälle weg, die sie nicht beurteilen kann.

- **N = 12 Startkonfigurationen** ist die Obergrenze, die die Hardware trägt und die §4 erlaubt.
  Bei einer GPU und sequenziellem Lauf gibt es keinen Grund für asynchrones ASHA: die
  Promotionsentscheidung fällt, wenn alle lebenden Arme die Sprosse erreicht haben (synchrones
  sukzessives Halbieren). Asynchron würde nur helfen, wenn Arbeiter leerlaufen — sie tun es nicht.

### 2.3 Was die Leiter kostet und spart

`N = 12`, Leiter `[25 → ⅓, 40 → ½]`:

```
12 x 25 = 300 Ep  ->  4 ueberleben
 4 x 15 =  60 Ep  ->  2 ueberleben
 2 x 20 =  40 Ep
         = 400 Epochen  gegen  12 x 60 = 720  ->  56 %
```

**Die Leiter spart 44 % der Siebphase.** Zum Vergleich: S1 auf einem statt drei Seeds zu fahren
spart 67 %, und das ohne jedes Risiko für die Rangfolge, weil S2 ohnehin neu misst.

### 2.4 Wiederaufnehmbarkeit

Eine Sprosse heißt: Prozess beenden, später an der Epochengrenze weitermachen. Das kann das
Repo schon fast:

- `train --continue` lädt aus `state.pt` Gewichte, Optimizer, **Cosine-Position**,
  Sampler-Strom und alle RNG-Zustände; `_save_state` schreibt nach **jeder** Epoche atomar.
- `STATE_KEYS` erzwingt dabei, dass das Rezept identisch ist — `epochs` gehört dazu. Ein Lauf
  wird deshalb **immer mit `--epochs 60` gestartet**, damit der Cosine derselbe bleibt wie in
  jedem Archivlauf; die Sprosse begrenzt nur, wie weit dieser Aufruf geht.
- **Fehlt:** ein Schalter, der bei Epoche `r` sauber austritt. Vorschlag: `--stop-after-epoch N`
  (Schleifenabbruch nach `_save_state`, kein Einfluss auf `config.json`, nicht in `STATE_KEYS`).
  Das ist die einzige nötige Änderung am Trainer. **Prozesse zu killen ist die Alternative und
  scheidet aus** — der venv-Shim hinterlässt Waisen, und der Rechner ist heute zweimal an
  Speicherdruck eingefroren.
- Zustand der Suche steht **nur** in den `metrics.jsonl` und `config.json` der Läufe. Keine
  Datenbank, keine Studiendatei: was auf der Platte steht, ist die Wahrheit — dieselbe Regel,
  an der `sweep_arch_v6.ps1` schon hängt.
- Vollständig heißt **60 zusammenhängende, eindeutige Epochenindizes**, nicht 60 Zeilen. Ein
  fortgesetzter Lauf kann Zeilen doppeln.

---

## 3. Welche Hyperparameter lohnen

Erhoben über **224 `config.json` im Modellbaum** — was nie variiert wurde, steht hier als Fakt,
nicht als Vermutung.

| Rang | Größe | Stand im Archiv | erwarteter Ertrag | Kosten |
|---|---|---|---|---|
| 0 | **Auflösung (Packgröße)** | 80 px vs 128 px, je 1 Seed | **+0,0435 gemessen** — größer als alles andere zusammen | 128 px kostet ~2,9x je Epoche |
| 1 | **Lernrate** | 202/224 Läufe auf **exakt 0,01**, 11 auf 3e-4. Dazwischen nichts. | hoch: nie abgetastet, und die Projektdoku nennt sie „den kritischen Faktor" | `scripts/lr_range_test.py` ist billig (300 Iterationen, nimmt den Lock nicht) |
| 2 | **`--epoch-frac` × `--weight-cap`** | 0,35+cap3 = 0,9548, 1,0+kein cap = 0,9425 — **konfundiert**, beide zusammen geändert | mittel: 1,2 Punkte liegen zwischen den Paketen, nur weiß niemand, welcher Teil es ist | ein sauberes 2×2, 4 Arme |
| 3 | **`--balance`** | 100x `none`, 47x `class`, 6x `piece`, je 1x `session`/`situation` | mittel: `session` ist die Achse, auf der Val zurückgehalten wird, und ist **einmal** gelaufen | wie ein normaler Arm |
| 4 | **`--aug-scale`** | 4 Läufe von 224. Die CLI sagt selbst: „von Hand gesetzt und nie abgetastet" | mittel: ein Skalar über alle Stärken, 3 Punkte reichen (0,5 / 1,0 / 1,5) | normal |
| 5 | **SWA** | in keiner `config.json` vermerkt; Läufe existieren (`*-swa1e4`) | interessant **nicht für den Mittelwert, sondern für die Streuung** — und die Streuung ist hier die bindende Größe | normal |
| 6 | `--label-smoothing` | 157x 0,0, 2x 0,1 | gering: unangetastet, aber der plausible Effekt (~0,3 Punkte) liegt unter der Nachweisgrenze | normal |
| 7 | `--weight-decay` | 151x 0,01, Rest Einzelfälle | gering | normal |
| 8 | `--scales` (Multi-Scale) | **1 Lauf von 224** | offen; laut Memory Pflicht, wenn die Deployment-Auflösung wechselt | normal |
| — | `--sched` | **224 von 224 `cosine`** | ungemessen. Kein Warmup, kein OneCycle, nie probiert | normal |

**Ausgereizt / nicht anfassen:** `--norm` (BatchNorm ist Projektpolitik), `--loss` (224x `ce`),
`--input-repr` (gemessen und verloren: 0,9978 gegen 0,0308), `--num-workers` (gemessen: 2),
die vier Compiler-Schalter (über 3 Seeds × 3 Arme kein Qualitätsunterschied),
`--batch-size` (das Handoff verbietet die Erhöhung für die Folds: ändert BN-Statistik).
`--crop-norm` und `--neighbour-p` kommen in **keiner** `config.json` vor — unbenutzte Optionen,
kein Suchraum, sondern erst eine Einzelmessung wert.

> **Sortiert nach Ertrag heißt: Rang 0 zuerst und allein.** Eine Suche über Rang 1–8, bevor die
> Auflösungsfrage steht, misst Effekte von 0,005–0,02 gegen ein Rauschen von 0,0157, während
> ein Hebel von 0,0435 unbestätigt daneben liegt.

---

## 4. Überanpassung an den Val — die rechenbare Grenze

Wer N gleich gute Konfigurationen gegen denselben Val siebt, bekommt als Sieger nicht den besten,
sondern den glücklichsten. Der Aufschlag ist der Erwartungswert des Maximums von N Ziehungen:

| N Konfigurationen | E[max]/sd | 1 Seed (sd 0,0157) | 3 Seeds (0,0091) | 5 Seeds (0,0070) |
|---:|---:|---:|---:|---:|
| 2 | 0,564 | +0,0089 | +0,0051 | +0,0040 |
| 4 | 1,029 | +0,0162 | +0,0093 | +0,0072 |
| 8 | 1,424 | +0,0224 | +0,0129 | +0,0100 |
| 12 | 1,629 | +0,0256 | +0,0148 | +0,0114 |
| 32 | 2,070 | +0,0325 | +0,0188 | +0,0145 |
| 200 | 2,746 | **+0,0431** | +0,0249 | +0,0193 |

**Die geforderte Zahl:** damit der Aufschlag unter der Relevanzschwelle 0,010 bleibt, darf man
vergleichen

| Seeds je Konfiguration | zulässiges N |
|---:|---:|
| 1 | **2** |
| 3 | **4** |
| 5 | **8** |
| 7 | **13** |

Mit 200 Konfigurationen auf einem Seed sind **+0,043 reines Rauschen** — mehr als der
Auflösungssprung. Eine breite Suche ist auf diesem Val also nicht nur teuer, sie ist unmöglich.

**Wie der Entwurf damit umgeht** (drei Mittel, alle drei):

1. **Getrennte Auswahl- und Bestätigungsinstanz.** S1 (N = 12, 1 Seed) ist erklärtermaßen
   überangepasst und liefert nur Kandidaten. S2 misst die m ≤ 3 Überlebenden **neu**, mit
   eigenen Seeds. Der Aufschlag aus S1 überträgt sich nicht auf S2, weil S2 andere Ziehungen
   sind — er sorgt nur dafür, dass S2-Kandidaten im Schnitt schlechter ausfallen als in S1
   versprochen. Genau das ist erwünscht und muss im Protokoll stehen: **die S1-Zahl eines
   Kandidaten wird nach S2 verworfen, nie berichtet.**
2. **Mehrfachvergleichs-Korrektur in S2**, über die Granularität des Vorzeichentests (§6):
   7 Seeds geben p = 0,0078, das hält Bonferroni bei α = 0,05 für bis zu **6** Kandidaten.
   Mit 5 Seeds (p = 0,031) darf **genau ein** Kandidat antreten.
3. **Bestätigung über die Sitzungs-Folds (S3).** `scripts/fold_per_session.py` wertet je Fold
   die Sitzungen aus, die das Fold-Modell nie gesehen hat. Das ist die einzige Instanz, die
   gegen Val-Überanpassung wirklich immun ist, weil sie andere Aufnahmen benutzt.
   **Voraussetzung:** `real13-mix-v6-80` und `-128` tragen heute nur `split.json` und
   `split-pin.json` — die Fold-Dateien fehlen und müssen einmal gebaut werden
   (`chesslab dataset folds real13-mix-v6-128 -k 4`).

---

## 5. Abbruchregel

Zwei Sorten, streng getrennt.

**(A) Sprossenregel — vergleichend, nur in S1.**

```
an Sprosse r in (25, 40):
    s[a] = mean(val_visible_piece_acc[r-8 : r])   fuer jeden lebenden Arm a
    fuehrer = max(s)
    behalte a, wenn rang(a) <= ceil(n / eta[r])  ODER  fuehrer - s[a] <= tol[r]
    eta = {25: 3, 40: 2}   tol = {25: 0.020, 40: 0.010}
```

Sie ist mit der Projektdisziplin verträglich, weil sie **nicht behauptet, den Sieger zu kennen**.
Sie behauptet nur, dass ein Arm, der an Epoche 25 mehr als 0,020 zurückliegt, es bis 60 nicht
mehr dreht — und das ist gemessen: an r=25 ordnet die Sprosse Paare mit ≥ 0,04 Endabstand zu
100 % und mit 0,02–0,04 zu 84 % richtig, während sie unter 0,02 auf 65–70 % fällt und deshalb
dort gar nicht erst entscheiden darf. `best` kommt nirgends vor, eine Einzelepoche auch nicht.

**(B) Notbremsen — absolut, in jeder Stufe, kein Vergleich mit anderen Armen.**

| Regel | Schwelle | Beleg |
|---|---|---|
| nicht-endlicher `train_loss` | sofort | — |
| `val_visible_piece_acc` < 0,50 bei Epoche 8 | sofort | `base-s42-VERWORFEN-lr1.3e-07` steht ab Epoche 0 bei 0,076 und bleibt dort 60 Epochen |
| RAM-Reserve unterschritten | `--ram-reserve-gb 4` | zwei Einfrierer am 2026-09-11 |
| keine neue Epochenzeile für > 3x die eigene Medianepoche | Lauf als hängend parken | Einfrierer hinterlassen einen Lock |

**Kein Early Stopping innerhalb eines Laufs.** `--patience 999` bleibt: die Vorgabe 7 stoppte
`p4a-s42` bei Epoche 14 von 60, mitten im Cosine, ohne Schwanz zum Mitteln.

Abgebrochene Läufe werden **geparkt, nie gelöscht** (`<out>.partial-<ts>`), wie im heutigen
Sweep — und aus der Rangfolge **ausgeschlossen**, nicht mit Sternchen geführt.

---

## 6. Abnahmekriterium

### 6.1 Das Maß

- Kennzahl: `val_visible_piece_acc`, **Mittel der letzten 15 Epochen** eines Laufs mit 60
  zusammenhängenden Epochen. Tail 20 ist messbar ruhiger (0,0155 gegen 0,0163) und wird
  mitberichtet; die Entscheidung läuft auf Tail 15, damit das Archiv vergleichbar bleibt.
- `best`, `best.pt`-Werte und Einzelepochen sind **keine** Vergleichsgrößen.
- Nebenbefunde ohne Entscheidungsgewalt: `val_loss`, `val_coverage_precision`,
  `val_visible_occupied_board_acc`. Letzteres ist ein Produkt über 64 Felder und verstärkt
  Rauschen (bei `p4a-s44` fällt es von 0,87 auf 0,53, während `piece_acc` 0,944–0,959 hält).

### 6.2 Der Test: Vorzeichentest über Seeds, nicht t-Test

Der gepaarte t-Test braucht bei `sd_d = 0,021` **27 Seeds** für 0,010 (§1.5) und schätzt seine
Varianz auf df = 2 — eine Varianzschätzung aus drei Zahlen ist selbst Rauschen. Der
Vorzeichentest braucht keine: unter „kein Effekt" ist jedes Vorzeichen eine faire Münze.

```
Ein Kandidat gilt als besser als der Anker, wenn
  (1) beide Laeufe je Seed vollstaendig sind (60 zusammenhaengende Epochen),
  (2) die gepaarte Differenz auf 7 von 7 Seeds POSITIV ist        -> p = 0,0078 einseitig,
  (3) das Mittel der gepaarten Differenzen >= 0,010 betraegt      -> Relevanzschwelle,
  (4) das MINIMUM ueber die Seeds nicht unter dem Minimum des Ankers liegt,
  (5) und (2)+(3) auch auf den 4 Sitzungs-Folds halten (S3).
```

| Seeds | p (einseitig) | erlaubte Kandidatenzahl unter Bonferroni |
|---:|---:|---:|
| 3 | 0,125 | 0 |
| 5 | 0,031 | 1 |
| **7** | **0,0078** | **6** |
| 9 | 0,0020 | 25 |

Deshalb **7 Seeds in S2**: es ist die kleinste Zahl, die mehr als einen Kandidaten gleichzeitig
zulässt. Drei Seeds reichen fürs Sichten (und sind die Untergrenze der Übergabe), aber nicht
für eine Abnahme.

Regel (4) ist die Antwort auf „kein Glücksgriff": **bewertet wird das schlechteste Ergebnis,
nicht das beste.** Eine Zielmarke von 99 % heißt in diesem Protokoll
`min über 7 Seeds ≥ 0,990`, nicht `mean ≥ 0,990` und erst recht nicht `best ≥ 0,990`.

### 6.3 Der unangetastete Test-Split

`rg-2026-08-08-00-39-57` und `rg-2026-08-08-11-55-19` sind die letzte ehrliche Instanz.

- **Genau einmal**, am Ende eines Zyklus, auf **einem** eingefrorenen Modell — Gewichte,
  Checkpoint-Regel und Schwellen vorher schriftlich festgelegt und aus Val/Folds abgeleitet.
- **Nicht** in der Schleife, nicht je Seed, nicht je Kandidat, nicht zum Aussuchen eines
  Checkpoints, nicht zum Mining von Fehlern.
- Das Ergebnis wird berichtet, **auch wenn es das Ziel verfehlt**. Wird danach weitergesucht,
  ist der Split verbraucht und für den nächsten Zyklus muss eine andere Aufnahmegruppe
  zurückgehalten werden. Der Runner erzwingt das mechanisch: eine Datei
  `data/models/_autotune/<zyklus>/TEST-USED.json` mit Zeitpunkt, Lauf und Ergebnis; ist sie da,
  verweigert die Stufe S4 jede weitere Auswertung in diesem Zyklus.
- Der Testlauf kostet keine Trainingszeit und taucht im GPU-Budget nicht auf.

### 6.4 Was bei einem Ziel von 99 %+ davon übrig bleibt

`_arch128v6-frac1/p4a-s42` steht bei 0,9860 (tail 15, ein Seed). Auf 0,990 fehlen 0,0040 —
**unter jeder Nachweisgrenze dieses Aufbaus** (Relevanzschwelle 0,010, Seed-sd 0,0157,
Val-Stichprobenboden 0,0009 bei 47 Zellen Unterschied). Daraus folgt zwingend:

- Die Suche kann 99 % auf dem Val **nicht nachweisen**. Sie kann nur zeigen, dass ein Rezept
  in seinem Minimum über 7 Seeds darüber liegt — das ist die stärkste erreichbare Aussage.
- Bei 164 falschen Zellen (98,6 %) ist der Weg zu 117 (99,0 %) eine **Fehleranalyse**, keine
  Hyperparametersuche: 47 Zellen sind pro Klasse und pro Sitzung abzählbar. `--aug-scale` um
  0,5 zu verschieben wird sie nicht finden.
- Robustheit („kein Glücksgriff") wird in S3/S4 nachgewiesen, nicht in S1/S2.

---

## 7. Schnittstellen und Pseudocode

### 7.1 Werkzeugwahl

**Python, kein Optuna, kein Ray.** Begründung:

- *Optuna* brächte TPE, Pruner und eine Studien-Datenbank. Die Datenbank ist hier ein Nachteil:
  sie wird eine zweite Wahrheit neben `metrics.jsonl`, und die Projektregel lautet „ein Sweep
  hängt an den Epochen auf der Platte". Die Pruner (Median, ASHA) setzen voraus, dass das frühe
  Signal informativ ist — §1.2 misst, dass es das unter 0,02 Abstand nicht ist. TPE braucht
  ~30 Versuche, bevor es besser als Zufall wird; bei 51 min je Lauf sind das 26 GPU-Stunden,
  ehe es anfängt zu helfen, und es würde bei `sd_d = 0,021` Rauschen modellieren.
- *Ray Tune* verkauft parallele Versuche. Eine GPU, sequenziell, zwei Einfrierer unter
  Speicherdruck — der Nutzen ist null, der Nachteil ein Cluster-Framework im Prozessbaum.
- Das Eigenbau-Gegenstück sind ~250 Zeilen: Warteschlange, Sprossenschnitt, Bewertung. Die
  Bewertung existiert schon zur Hälfte in `scripts/compare_arms.py`.
- **PowerShell nur als Starter, nicht als Logik.** Der heutige Sweep ist PS und hat genau daran
  Zeit verloren (`$ErrorActionPreference='Stop'` + `2>&1 |` tötet den Lauf an Torchs erster
  stderr-Zeile; `-File` reicht Komma-Listen als ein Element durch). Rangfolge, Tail-Mittel und
  Vorzeichentest gehören in dieselbe Sprache wie `compare_arms.py`.

### 7.2 Dateien

```
scripts/autotune.py              neu   Warteschlange, Sprossen, Wiederaufnahme
scripts/compare_arms.py          da    S2-Auswertung, um den Vorzeichentest erweitern
scripts/rung_predictiveness.py   neu   Sprossen-Kalibrierung (dieses Dokument nachrechnen)
scripts/fold_per_session.py      da    S3
scripts/lr_range_test.py         da    Vorstufe zu Rang 1 aus §3
src/chesslab/cli.py              +1    --stop-after-epoch N
docs/plan-98/03-autotuning.md    dies
data/models/_autotune/<zyklus>/  neu   ein Verzeichnis je Lauf, sonst nichts
```

### 7.3 Das Manifest

Eine YAML, von Hand geschrieben, vom Runner nur gelesen — sie ist das Versuchsprotokoll:

```yaml
zyklus: 2026-09-12-lr-und-frac
dataset: real13-mix-v6-128
split: split-pin.json
epochen: 60
anker:                      # S0, wird von jedem Kandidaten als Paarungspartner benutzt
  tag: p4a-128
  args: "--backbone boardattn:cellnet_p4 --no-pretrained --head occlusion
         --epoch-frac 0.35 --weight-cap 3.0 --board-width 128 --board-layers 2
         --batch-size 256 --lr 0.01 --sched cosine --weight-decay 0.01
         --batch-aug --compile-batch-aug --compile-model --fused-adamw
         --num-workers 2 --low-memory --ram-reserve-gb 4 --patience 999"
seeds_sieben: [42]
seeds_bestaetigen: [42, 43, 44, 45, 46, 47, 48]
leiter: [{epoche: 25, eta: 3, tol: 0.020}, {epoche: 40, eta: 2, tol: 0.010}]
kandidaten:                 # nur die Abweichung vom Anker, nie das ganze Rezept
  - {tag: lr005,   args: "--lr 0.005"}
  - {tag: lr020,   args: "--lr 0.02"}
  - {tag: frac100, args: "--epoch-frac 1.0"}
  - {tag: cap1,    args: "--weight-cap 1.0"}
  - {tag: aug05,   args: "--aug-scale 0.5"}
  - {tag: aug15,   args: "--aug-scale 1.5"}
  - {tag: balsess, args: "--balance session"}
  - {tag: swa,     args: "--swa"}
abnahme:
  metrik: val_visible_piece_acc
  tail: 15
  min_gepaarte_differenz: 0.010
  vorzeichen_alle_positiv: true
  zielmarke_minimum: 0.990   # Minimum ueber die Seeds, nicht Mittel
```

Kandidaten als **Delta** zum Anker, damit „alles andere gleich" nicht von Hand gepflegt werden
muss — das ist der Fehler, den §3 bei `epoch_frac × weight_cap` als Konfundierung findet.

### 7.4 Runner

```python
def fahre(manifest):
    lebend = {k.tag for k in manifest.kandidaten}
    sieb_seed = manifest.seeds_sieben[0]

    for sprosse in manifest.leiter + [Sprosse(manifest.epochen, eta=1, tol=0)]:
        for kand in [k for k in manifest.kandidaten if k.tag in lebend]:
            lauf = wurzel / f"{kand.tag}-s{sieb_seed}"
            if epochen_auf_platte(lauf) >= sprosse.epoche:
                continue                              # Wiederaufnahme: die Platte entscheidet
            if not genug_ram(manifest.ram_reserve_gb):
                return abbruch("RAM-Reserve unterschritten")
            starte(kand, sieb_seed, out=lauf, epochs=manifest.epochen,
                   stop_after=sprosse.epoche,
                   weiter=(lauf / "state.pt").exists())   # --continue
            if notbremse(lauf):                       # nicht-endlich, <0,50 bei Ep 8, haengend
                parke(lauf); lebend.discard(kand.tag); continue
        lebend = schneide(lebend, sprosse, sieb_seed)  # Regel (A) aus 5

    for tag in lebend:                                # S2: nur die Ueberlebenden
        for seed in manifest.seeds_bestaetigen:
            fahre_voll(tag, seed)
    return rangfolge(lebend, manifest.anker, manifest.abnahme)


def schneide(lebend, sprosse, seed):
    s = {t: tail_mittel(wurzel / f"{t}-s{seed}", sprosse.epoche - 8, sprosse.epoche)
         for t in lebend}
    fuehrer = max(s.values())
    behalten = set(sorted(s, key=s.get, reverse=True)[:ceil(len(s) / sprosse.eta)])
    return behalten | {t for t in s if fuehrer - s[t] <= sprosse.tol}


def rangfolge(kandidaten, anker, regel):
    """Genau eine Tabelle. Wer sie liest, muss nichts mehr auswaehlen."""
    zeilen = []
    for tag in kandidaten:
        seeds = gemeinsame_seeds(tag, anker.tag)
        eigen = [tail(tag, s, regel.tail) for s in seeds]
        d = [e - tail(anker.tag, s, regel.tail) for e, s in zip(eigen, seeds)]
        zeilen.append(dict(
            tag=tag, n_seeds=len(d), mittel=fmean(d), minimum=min(eigen),
            alle_positiv=all(x > 0 for x in d), p=0.5 ** len(d),
            besser=(all(x > 0 for x in d) and fmean(d) >= regel.min_gepaarte_differenz
                    and len(d) >= 7 and min(eigen) >= anker_minimum),
        ))
    return sorted(zeilen, key=lambda z: (z["besser"], z["mittel"]), reverse=True)
```

`--stop-after-epoch` im Trainer ist der einzige Eingriff:

```python
# train.py, in der Epochenschleife, NACH _save_state
if stop_after_epoch and epoch + 1 >= stop_after_epoch:
    print(f"[OK] Sprosse {stop_after_epoch} erreicht; --continue setzt hier fort.")
    break
```

---

## 8. GPU-Stunden-Budget

Planungswerte aus §1.6: **80 px 0,32 min/Epoche, 128 px 0,85 min/Epoche** (der 128er abgeleitet).
Zielmarke 99 %+ heißt: 128 px, weil 80 px mit 0,9548 rund vier Punkte darunter liegt.

| Stufe | Rechnung | Epochen | 128 px | 80 px |
|---|---|---:|---:|---:|
| S0 Anker | 1 × 7 Seeds × 60 | 420 | 5,9 h | 2,2 h |
| S1 Sieben | 8 Konfigs, Leiter 25/40 | 285 | 4,0 h | 1,5 h |
| S2 Bestätigen | 2 Kandidaten × 7 Seeds × 60 | 840 | 11,9 h | 4,5 h |
| S3 Folds | (Sieger + Anker) × 4 Folds × 60 | 480 | 6,8 h | 2,6 h |
| S4 Test | eine Auswertung | 0 | Minuten | Minuten |
| **Summe je Zyklus** | | **2 025** | **28,7 h** | **10,8 h** |

S1 mit N = 8 und Leiter `[25 → ⅓, 40 → ½]`: `8×25 + 3×15 + 2×20 = 285` Epochen gegen 480 ohne
Leiter (59 %). Ein Toleranzband-Treffer hebt das; die Tabelle rechnet den knappen Fall. Dazu
~25 min Prozessstarts (8 Konfigs × bis zu 3 Starts × ~50 s).

**Vergleichswerte:**

| Vorgehen | Epochen | 128 px |
|---|---:|---:|
| dieser Entwurf | 2 025 | 28,7 h |
| ohne Leiter (S1 voll ausfahren) | 2 220 | 31,4 h |
| ohne Seed-Staffelung (S1 gleich mit 7 Seeds, mit Leiter) | 3 735 | 52,9 h |
| naiv (8 Konfigs × 7 Seeds × 60, plus S0/S3) | 4 260 | 60,4 h |

Die Leiter spart **2,7 h von 31,4**, die Seed-Staffelung **24,2 h von 52,9**. Das ist der
Größenunterschied aus §0.

Bei 8 Stunden ruhiger Nacht sind 28,7 h **reichlich drei Nächte je Zyklus**. Realistisch sind zwei Zyklen
(einer, um Auflösung und Lernrate zu klären, einer für das, was die Fehleranalyse daraus macht)
— **rund 60 GPU-Stunden bis zu einer belastbaren 99-%-Aussage**, plus die Zeit für einen
v6-128-Fold-Satz und die Fehleranalyse selbst, die hier nicht budgetiert ist.

---

## 9. Ab wann sich der Aufwand rechnet — ehrlich

**Baukosten:** `--stop-after-epoch` (klein, ein Test), `autotune.py` (~250 Zeilen),
`compare_arms.py` um den Vorzeichentest erweitern, das Manifest-Schema. Realistisch **ein
konzentrierter Tag**, inklusive Tests und Kommentar-Budget.

**Was sich wann rechnet — getrennt nach den beiden Hälften:**

| Hälfte | Rechnet sich ab | Begründung |
|---|---|---|
| Warteschlange + Wiederaufnahme + automatische Rangfolge | **sofort, ab dem ersten Zyklus** | Sie ist das, wonach der Nutzer gefragt hat („so wenig wie möglich manuell bewerten"). Sie spart keine GPU-Zeit, sondern die Nacht, in der niemand nachsieht, ob Lauf 7 gestorben ist — der heutige Sweep bricht bei einem Fehllauf ab und lässt die Maschine stehen. |
| Sprossen-Leiter (die eigentliche ASHA-Hälfte) | **erst ab N ≥ 10** | Bei N = 8 spart sie 2,7 h von 31,4 — eine Drittelnacht, gegen ein Risiko, das §1.3 auf 8/9 beziffert. Bei N = 4 spart sie weniger als einen einzigen Lauf und ist reiner Verlust. |

**Wo Automatisierung sich NICHT rechnet, und das ist der wichtigere Satz:** solange die
entscheidende offene Frage „80 oder 128 px" heißt und der Unterschied 0,0435 beträgt, ist die
richtige Antwort **kein Suchrahmen, sondern sieben Läufe**. Ein Sieb, das Effekte von 0,005
sortieren soll, während ein Effekt von 0,0435 unbestätigt daneben liegt, ist teurer Unsinn.

Die ehrliche Empfehlung ist deshalb gestuft:

1. **Jetzt, ohne neuen Code:** S0 auf 128 px mit dem Hausrezept, 5–7 Seeds. Das ist der heutige
   `sweep_arch_v6.ps1` mit anderen Parametern, ~6 GPU-Stunden, und beantwortet die Frage, die
   das Ziel entscheidet.
2. **Parallel dazu bauen:** Warteschlange, Wiederaufnahme, `rangfolge()`, Vorzeichentest. Ohne
   Leiter. Das ist der halbe Tag, der sich sofort auszahlt.
3. **Die Leiter erst,** wenn ein Zyklus mit N ≥ 10 ansteht — und vorher
   `scripts/rung_predictiveness.py` auf den dann vorhandenen **v6**-Läufen neu rechnen. Die
   Sprossen in §2.2 sind auf 26 v4-Läufen kalibriert; dass Epoche 25 auf v6 dieselbe Sprosse
   ist, ist **unbelegt**.

---

## 10. Was unbelegt ist

- **Sprossenlage auf v6.** §1.3 steht zu 26 von 32 Läufen auf der v4-Generation.
- **0,85 min/Epoche bei 128 px.** Abgeleitet aus 80 s/Ep (frac 1,0, Memmap) × 0,35 × 1,8;
  kein 128-px-v6-Lauf mit `frac 0.35` und `--low-memory` existiert.
- **Der 1,8x-Aufschlag von `--low-memory`.** Aus zwei Läufen, die sich auch in Seed und
  Worker-Zahl unterscheiden.
- **Der erwartete Ertrag in §3** ist eine Einschätzung, keine Messung — außer bei Rang 0
  (+0,0435, ein Seed) und der Konfundierung bei Rang 2 (1,2 Punkte, ein Seed).
- **Alle Val-Zahlen hängen an EINER Sitzung** (`rg-2026-09-06-20-27-33`), und Val und die
  verworfene Alternative stammen vom selben Aufnahmetag. Das ist der Grund, warum S3 im
  Protokoll steht und nicht optional ist.
