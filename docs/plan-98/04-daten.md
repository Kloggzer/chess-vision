# Plan 98+ — Daten: Zusammensetzung, Abdeckung, Automatisierung

> Gemessen 2026-09-11 gegen `data/datasets/real13-mix-v6-80` (841 521 Crops, 160 Sessions,
> `dataset.yaml`), die 22 Quell-Aufnahmen unter `data/recordings/` und `data/reports/`.
> Nichts gebaut, nichts trainiert — alle Zahlen aus Manifesten, Logs und Reports ausgezählt.
> Ziel laut Auftrag: `val_visible_piece_acc` von 0,9548 auf **deutlich über 98 %**, **robust**,
> bei **minimaler Handarbeit**.

## 0. Das Urteil in vier Sätzen

1. **Der Korpus gibt 98 % her, und 99 % ebenfalls.** Das gemessene Label-Rauschen im echten Pool
   liegt bei **0,36 % entdeckt** und geschätzt 0,1–0,5 % Rest — nicht über 1 %. Die Messgrenze auf
   dem aktuellen Val liegt bei rund 99,7 %, nicht bei 98.
2. **Die Zielmarke ist klein**: der Val trägt 11 684 sichtbare Figurenzellen, 1 Punkt sind
   **117 Zellen**, eine einzelne Zelle 0,0086 Punkte. Von 0,9548 auf 0,98 sind **294 Zellen**,
   auf 0,99 sind **411**.
3. **„Kein Glücksgriff" scheitert heute nicht an der Menge, sondern an der Messung**: die beiden
   Achsen, auf denen der Nutzer bewusst hart aufnimmt — **4K-Kamera** (15,5 % des echten Pools)
   und **dunkles Material** (bis 27 % dunkle Zellen je Session) — kommen **weder im Val noch im
   Test vor**. Ein Modell kann dort einbrechen, ohne dass eine Zahl es zeigt.
4. **Die billigste Maßnahme ist keine neue Aufnahme, sondern ein zweiter Val/Test-Schnitt** aus
   vorhandenem Material: 0 h Handarbeit, kein neuer Export, und er entscheidet, ob die 98 % ein
   Ergebnis oder ein Zufall sind.

---

## 1. Inventar: was tatsächlich im Datensatz steckt

`data/datasets/real13-mix-v6-80/dataset.yaml` nennt drei Pools. Ausgezählt über `manifest.jsonl`
(841 521 Zeilen):

| Pool | Zellen | Anteil | Bretter | distinkte Stellungen | Verdeckung > 0,15 |
|---|---:|---:|---:|---:|---:|
| `data/crops/default` (echt) | 464 881 | 55,2 % | 7 382 | **525** | 8,5 % |
| `data/crops/comp13-v3` (Komposite) | 344 128 | 40,9 % | 5 377 | **10** | 16,0 % |
| `data/crops/turntable-clean` | 32 512 | 3,9 % | 508 | **4** | 0,0 % |

**Die Turntable-Lücke aus `docs/val-choice-2026-09-10.md` ist in v6 geschlossen.** Die 48
Turntable-Sessions stehen als `comp-VID_2026082*-a00..a11` in der `session_ids`-Liste
(`dataset.yaml`) und im Manifest mit exakt 32 512 Zeilen — genau die Zahl, die das Doc nennt. Sie
liegen alle im Train-Split (`split-pin.json`). **Keine Bauern**, bestätigt: `wP`/`bP` fehlen im
Pool vollständig, 75 % der Turntable-Zellen sind `empty`.

### Was die Klassenzahlen verschweigen

Die Komposite liefern über die Hälfte jeder seltenen Klasse — aber aus **10 Stellungen**. Je Klasse
die Zahl der belegten Felder und der Anteil des häufigsten Feldes:

| Klasse | echt | Komposit | Turntable |
|---|---|---|---|
| `wN` | 33 Felder, top c3 28,8 % | **15 Felder**, top g1 28,6 % | 8 Felder |
| `wQ` | 32 Felder, top d1 55,7 % | **8 Felder**, top d1 53,6 % | 4 Felder |
| `wK` | 13 Felder, top e1 44,7 % | **8 Felder**, top e1 53,6 % | 4 Felder |
| `bR` | 19 Felder, top h8 37,1 % | 14 Felder, top a8 28,6 % | 8 Felder |

Die 10 Komposit-Stellungen sind acht Aufbau-Varianten plus zwei gestreute Figurenmuster
(`comp-VID_20260825_23*`); 2 204 der 5 377 Komposit-Bretter tragen dieselbe Grundstellung.
**Die Komposite kaufen Verdeckungs- und Lichtvielfalt, keine Stellungsvielfalt.** Wer aus der Zeile
„`wN`: 10 754 Komposit gegen 9 376 echt" schließt, die seltenen Klassen seien abgedeckt, zählt g1
zehntausendmal.

**Redundanz insgesamt:** 535 distinkte Stellungen, Median **16 Bretter je Stellung**. Die
Memory-Notiz „Der Korpus sind 246 Stellungen mit 38 Aufnahmen je Stellung"
(`corpus-is-threefold-redundant`) ist damit **überholt** — die Stellungszahl hat sich mehr als
verdoppelt, die Redundanz je Stellung mehr als halbiert. Die Folgerung der Notiz (dreifach
redundant, 3,9 % der Crops reichen) gilt für die echten Aufnahmen so nicht mehr; für `comp13-v3`
gilt sie drastischer denn je.

### Auflösung und Licht je Aufnahme

Auflösungsklasse aus den maximalen Eckkoordinaten in `data/recordings/<s>/log.jsonl`, Dunkelanteil
= Zellen mit `brightness < 40` im Manifest:

| Klasse | Sessions | Zellen | Split | dunkelste Session |
|---|---:|---:|---|---|
| **4K (3840×2160)** | 2 (`VID_20260824_153751`, `_154327`) | 71 926 (15,5 % echt) | **nur Train** | 4,0 % |
| 1440p | 12 | 211 246 | Train + **Val** (`20-27-33`) | 17,8 % (`20-41-33`) |
| 1080p | 8 | 181 709 | Train + **Test** (`00-39-57`, `11-55-19`) | **26,6 %** (`VID_20260802_222741`) |

Val `rg-2026-09-06-20-27-33`: 2,2 % dunkle Zellen. Test `00-39-57`: 1,9 %, `11-55-19`: 2,5 %.
**Das dunkle Material und die 4K-Kamera stehen ausschließlich im Training.**

---

## 2. Label-Qualität: die Obergrenze, gemessen

### 2.1 Was schon gefunden wurde

`corrections.jsonl` über alle 22 Aufnahmen: **5 690 Handurteile**. Gegen das FEN-Label gerechnet
(`fen` steht in derselben Log-Zeile):

- **1 678 weichen ab** — der FEN-Automat hatte hier nachweislich unrecht.
- 1 874 bestätigen das FEN-Label, 2 138 verweisen auf Frames, die der Re-Export nicht mehr führt
  (verwaiste Urteile; sie wirken nicht).
- **1 655 dieser Abweichungen stehen im v6-Manifest** — die Korrekturen sind angewandt, der
  Datensatz ist an dieser Stelle ehrlich. Das sind **0,36 % des echten Pools**.

Art der 1 655 Korrekturen: 935 `Figur → empty`, 418 `empty → Figur`, **302 `Figur ↔ Figur`**.

**Zwei systematische Aufbaufehler stecken darin**, und das ist der teure Befund:

| Session | Felder | Muster | Zellen |
|---|---|---|---:|
| `rg-2026-08-08-11-59-12` | f1, g1 | `wN` ↔ `wB` vertauscht | **151** |
| `rg-VID_20260802_222203` | b8, c8 | `bN` ↔ `bB` vertauscht | **41** |

Das ist kein Rauschen, sondern **ein konstant falsches Label auf demselben Feld über eine ganze
Aufnahme** — genau die Form, die ein Modell lernt statt wegzumitteln (`labeling.py:487-491`
beschreibt denselben Mechanismus für `stale`). Beide wurden von Hand gefunden. **Ob es einen
dritten gibt, weiß niemand** — es existiert kein automatischer Aufbau-Check.

### 2.2 Was der automatische Audit noch findet

`data/reports/audit-flags.summary.json` (Confident Learning nach Northcutt, `audit_flags.py`):
**3 129 Flags auf 527 360 sichtbaren Zellen = 0,59 %**, davon **1 867 unbeurteilt**.

Die Trefferquote lässt sich messen, weil 1 262 Flags auf Zellen liegen, über die ein Mensch
unabhängig geurteilt hat:

- In **1 148 Fällen (91,0 %)** bestätigte der Mensch das FEN-Label — **Fehlalarm**.
- In **114 Fällen (9,0 %)** hatte der Mensch auf etwas Drittes korrigiert — der Flag zeigte auf ein
  echtes Problem, benannte es aber falsch.
- In **0 Fällen** traf die vorgeschlagene Klasse zu. (Das ist teilweise Konstruktion: der Flag
  feuert nur, wenn `predicted ≠ Label of Record`, `audit_flags.py:88-89`. Die 91-zu-9-Aufteilung
  bleibt aussagekräftig, ist aber auf schon angesehene — also schwierige — Zellen verzerrt.)

**Erwarteter Ertrag der 1 867 offenen Flags: ~170 echte Labelfehler = 0,04 % des echten Pools.**
Bei dem Tempo, das die Zeitstempel für das Labeln belegen (966 Zellurteile in 23 min 54 s auf
`20-27-33`), sind das **45–60 min Handarbeit** für 170 Zellen.

### 2.3 Die zwei Kanäle, die niemand misst

**(a) Unbestätigte Commit-Fenster.** `realgames.interval_moves` prüft, ob der Zug, der ein
Ply-Intervall eröffnet, zwischen den beiden gesetzten Brettern überhaupt sichtbar ist. Über alle
22 `interval-check.jsonl` zusammen:

> **466 Ply-Intervalle, 23 davon unsichtbar (4,9 %).**

Ein unsichtbarer Commit heißt: der FEN hängt an Pixeln, die ihn nie gezeigt haben, und danach
stimmt jedes Frame des Intervalls mit einer Referenz überein, die schon falsch ist
(`realgames.py:1006-1009`). Bei durchschnittlich 15,8 Brettern je Ply und 2 betroffenen Feldern ist
der Worst Case ~730 Zellen = **0,16 % des echten Pools**. `docs/position-check.md` hält fest, dass
die meisten dieser 23 die dunkle Brettecke sind und keine Fehlcommits — nachgesehen wurde aber nur
einer.

**(b) `SETTLE_LIMIT` steht auf 45, und ein echter Zug misst im Median 43,2.**
Dieselbe Funktion (`realgames.cell_deviations`) liefert beide Zahlen, also sind sie vergleichbar:

| Größe | Wert |
|---|---|
| Abweichung einer **unveränderten** Zelle auf sauberen Brettern (3 Sessions, 92 670 Zellen) | Median **1,3–1,4**, p99,9 **15,6–25,3**, Max 36–49 |
| Abweichung eines **echten Zugs** (466 Intervalle, `interval-check.jsonl`) | Median **43,2**, p10 21,5 |
| `labeling.SETTLE_LIMIT` (seit 2026-09-09) | **45,0** |
| `realgames.INTERVAL_MOVE_MIN` | 15,0 |

**Bei 45 überschreiten nur 216 von 466 echten Zügen (46,3 %) die Schwelle.** Bei 15 wären es 444
von 466 (95,3 %), zum Preis von 0,13–1,27 % Fehlalarmen auf unveränderten Zellen. Das Heben von 15
auf 45 hat die Empfindlichkeit des Abweichungs-Tors also **von ~95 % auf ~46 % halbiert** — es
fängt jetzt nur noch jeden zweiten Figurenwechsel innerhalb eines Intervalls. Das passt dazu, dass
289 `stale`/`changed`-Bretter (272 + 17) im Pool stehen.

`docs/position-check.md` nennt die richtige Lösung selbst, und sie ist **rein automatisch**:
*„Wer sie schließen will, muss die Abweichung am Eigenkontrast der Zelle normieren, nicht die
Schwelle senken."* Das Doc trägt außerdem noch die alte 15 — es ist an dieser Stelle veraltet.

### 2.4 Was der Pool von sich aus aussondert

Von 7 382 echten Brettern × 64 = 472 448 Zellen stehen 464 881 im Datensatz: **7 567 Zellen
(1,60 %) wurden zurückgehalten** (`labeling.slice_session`: `unknown`, `dirty`, `settle_left`).
Die Komposite und Turntables lassen **0** aus — bei ihnen ist das Label Konstruktion.

### 2.5 Die Coverage-Matten-Falle

`training/torch_data.py` setzt ungematteten Crops `coverage = 0.0`; gemischt mit gematteten
Sessions lehrt das den Occlusion-Kopf, dass es keine Hände gibt (CLAUDE.md). Ausgezählt:

- **21 von 22 echten Sessions sind gemattet** (6,0 %–37,9 % der Zellen tragen Coverage > 0).
- **`rg-2026-08-15-23-01-43` ist es nicht**: 1 024 Zellen, 16 Bretter, alle `coverage = 0.0`.
  0,22 % des echten Pools — messbar irrelevant, aber ein echter Restfall.
- `turntable-clean` trägt 32 512 Zellen mit `coverage = 0.0` **ohne Matte**. Ein Drehteller wird
  von Hand gedreht; dass in 508 Brettern nie eine Hand im Bild war, ist behauptet (Pool-Name
  „clean"), **nicht in diesem Repo gemessen** — unbelegt.

### 2.6 Rauschen des Val selbst

Val `rg-2026-09-06-20-27-33`: 33 511 Zellen, 31 342 sichtbar, **11 684 sichtbare Figurenzellen**
(deckt sich mit CLAUDE.md). Davon 33 mit Handkorrektur (0,105 % der sichtbaren) und 44 offene
Audit-Flags. **Residuales Val-Rauschen ~0,1–0,3 % → die Messgrenze liegt bei rund 99,7 %.**
99 % sind auf diesem Val messbar; 99,8 % wären es nicht.

---

## 3. Wo der nächste Einbruch entsteht (Abdeckung)

Nach Dünne sortiert — die erste Zeile ist die dünnste Achse:

| Achse | Lage | Beleg |
|---|---|---|
| **Spielerseite** | **Eine einzige. Alle 22 Aufnahmen sind von Weiß gespielt.** | Verdeckungsrate echt: Weiß 10,8 %, Schwarz 5,4 % = **2,02×**. Die Memory-Notiz „2–5×" gilt, liegt aber am unteren Rand — die Komposite (1,11×) verdünnen sie. |
| **4K-Kamera** | 2 Sessions, 71 926 Zellen, **nur Train** | Eckkoordinaten bis 3208×1982; weder Val noch Test |
| **Dunkles Material** | 5,0 % der echten Zellen unter Helligkeit 40; die dunklen Sessions (26,6 % / 26,3 % / 17,8 %) **nur Train** | Val 2,2 %, Test 1,9 / 2,5 % |
| **Stellungsvielfalt Komposite** | 41 % des Datensatzes = 10 Stellungen | §1 |
| **Aufbau/Tag** | Val und zwei starke Train-Sessions stammen vom selben Abend (2026-09-06) | `dataset.yaml` |
| Auflösung allgemein | 1440p 12, 1080p 8, 4K 2 | §1 |

**Die Spielerseite ist die dünnste Achse und die einzige, die kein vorhandenes Material füllen
kann.** Alles andere lässt sich durch einen anderen Schnitt messen; „von Schwarz gespielt" gibt es
im Korpus nicht.

---

## 4. Priorisierte Maßnahmen

Reihenfolge: viel Wirkung je Handstunde zuerst. „Effekt" ist die erwartete Änderung auf
`val_visible_piece_acc` bzw. — wo es um Robustheit geht — auf der neuen Messung.

### D1 — Zweiten und dritten Val/Test-Schnitt festschreiben, über die dünnen Achsen
**Handarbeit: 0 h. Rechenaufwand: eine `chesslab eval`-Runde je Modell (Minuten, kein Training).**

`split-pin.json` misst heute eine 1440p-Session von einem Abend. Daneben gehören zwei weitere
gepinnte Schnitte aus **schon exportiertem** Material:

- **`pin-4k`**: Val `rg-VID_20260824_153751`, Test `_154327` (71 926 Zellen).
- **`pin-dunkel`**: Val `rg-VID_20260802_222741` (26,6 % dunkle Zellen, 20 533 Zellen).

Beide Sessions wandern damit aus dem Training. Das kostet 92 459 Zellen = 19,9 % des echten Pools
— deshalb **nicht als Ersatz, sondern als zusätzliche Messung**: ein Lauf auf dem Hauptschnitt,
danach `chesslab eval --dataset <gemeinsamer>` gegen die beiden anderen.

- **Effekt auf `val_visible_piece_acc`: 0 Punkte.** Das ist der Punkt: es macht aus einer Zahl drei
  und beantwortet die Frage „Glücksgriff?" überhaupt erst.
- **Erfolgsmaß:** Abstand zwischen den drei Schnitten. Liegt er unter der Seed-Streuung von 0,0157
  (`docs/arch-training-2026-09-11.md`), ist das Modell robust; liegt er darüber, weiß man endlich
  wo.

### D2 — Das Loch im Pin-Schutz: `eval --dataset <fremd>` schließen
**Handarbeit: 5 min. Rechenaufwand: 0.**

Die **Vorgabedatei** `split.json` des v6-Datensatzes hat als Val `rg-2026-09-06-21-29-35` — genau
die Session, die `docs/val-choice-2026-09-10.md` als blind entlarvt hat (**0 weiße Springer**, im
Manifest nachgezählt), zusammen mit `11-59-12` und `11-55-19`; Val-Anteil 28 % der Zellen.

`train` ist dagegen geschützt: es bricht ab, wenn ein `split-pin.json` existiert und `--split` es
nicht nennt (`training/train.py:532-538`). `quantize` und `gradcam` erben den Schnitt aus
`config.json` des Laufs (`quantize.py:68`, `gradcam.py:193`). **Ungeschützt ist genau ein Pfad,
und es ist der wichtigste:**

```python
# training/evaluate.py:94
default_split = "split.json" if foreign else (cfg.get("split_file") or "split.json")
```

Bei `chesslab eval --dataset <anderer>` — dem Kommando, das CLAUDE.md für **jeden Quervergleich
zwischen Datensätzen** vorschreibt — fällt der Schnitt auf `split.json` zurück, also auf den Val
ohne weiße Springer. Der Quervergleich, der die Val-Unterschiede herausrechnen soll, misst dann
selbst blind.

Fix: dieselbe Pin-Prüfung wie in `train.py` auch in `evaluate.py`, bevor `foreign` auf
`split.json` zurückfällt.

- **Effekt:** verhindert stille Fehlmessungen; keine Punkte.
- **Erfolgsmaß:** `eval --dataset <fremd>` ohne `--split` bricht ab, statt still zu messen.

### D3 — Aufbau-Check: konstant falsche Labels automatisch suchen
**Handarbeit: ~20 min Sichtung. Rechenaufwand: eine Inferenzrunde über den Pool, kein Training.**

Zwei Aufbau-Vertauschungen (192 Zellen) wurden von Hand gefunden. Der Test dafür ist trivial und
braucht kein Urteil: **je (Session, Feld) die Modellvorhersage über alle Bretter mehrheitlich gegen
das FEN-Label** — ein Zufallsfehler streut, eine Vertauschung steht auf demselben Feld über die
ganze Aufnahme. Auf `11-59-12` hätte das f1/g1 mit 151 gegen ~0 Stimmen geliefert.

Die Zutaten liegen bereits: `model-reads.jsonl` je Session wird ohnehin geschrieben
(`realgames model-read`), `audit_flags.py` liest es. Nötig ist eine Aggregation je (Session, Feld)
statt je Zelle — ein Skript, kein Rechenlauf.

- **Effekt: 0 bis ~1,5 Punkte, hochvarianz.** Findet der Check nichts, kostet er 20 min. Findet er
  eine dritte Vertauschung, sind das 100–200 konstant falsche Zellen auf einem Feld — die Art
  Fehler, die ein Modell auswendig lernt.
- **Erfolgsmaß:** Zahl der (Session, Feld)-Paare mit > 50 % Widerspruch über ≥ 20 Bretter.

### D4 — `SETTLE_LIMIT` am Eigenkontrast der Zelle normieren
**Handarbeit: 0 h nach der Implementierung. Rechenaufwand: `session settle-scan` je Aufnahme neu
(Minuten je Session), danach `slice`.**

Heute: Schwelle 45 fängt 46 % der echten Zugsignale; Schwelle 15 fängt 95 %, flutet aber die Lane
mit 0,13–1,27 % Fehlalarmen (CLAUDE.md: 2 999 Karten, vier Fünftel davon harmlos und unter 35).
Beides folgt daraus, dass die Abweichung **absolut** gemessen wird, während der
Brett-Helligkeitsverlauf zwischen h3 (156) und a7 (20) liegt (`docs/position-check.md`).

Normiert man `dev` auf den Eigenkontrast der Zelle, lassen sich beide Fehlerarten gleichzeitig
senken — genau die Empfehlung, die das Doc seit 2026-08-22 trägt und die niemand umgesetzt hat.

- **Effekt: geschätzt 0,2–0,6 Punkte.** Begründung: die 289 `stale`/`changed`-Bretter im Pool
  tragen je ~2 verdächtige Zellen ≈ 578 Zellen ≈ 0,12 % des Pools; ihr Anteil am **Training**
  entscheidet. Die Zahl ist eine Rechnung, keine Messung — **unbelegt**, bis der Scan läuft.
- **Erfolgsmaß:** Sensitivität gegen `interval-check.jsonl` > 90 % bei Fehlalarm < 0,2 % auf
  sauberen Brettern.

### D5 — Die 1 867 offenen Audit-Flags abarbeiten
**Handarbeit: 45–60 min. Rechenaufwand: 0 (Flags liegen).**

- **Effekt: ~170 korrigierte Zellen = 0,04 % des echten Pools, unter 0,1 Punkte auf dem Val.**
  Gerechnet aus der gemessenen 9-%-Trefferquote (§2.2).
- Lohnt **nur zusammen mit D3** — dieselben Daten, und ein Aufbau-Fehler fällt beim Durchsehen
  ohnehin auf.
- **Erfolgsmaß:** `flags_on_judged` in `audit-flags.summary.json` steigt, offene Flags gegen Null.

### D6 — Aufnahmen von der schwarzen Seite
**Handarbeit: ~35 min je Aufnahme (belegt: 24 min Labeln aus Zeitstempeln + Confirm + sechs nicht
verdrahtete CLI-Aufrufe). Rechenzeit ~90 min je Aufnahme, unbeaufsichtigt.**

Der einzige Weg, die dünnste Achse zu füllen. Vier Aufnahmen ≈ **2,3 h Handarbeit**, ~6 h Rechnen,
und sie bringen 20 000–30 000 echte Zellen mit gespiegelter Verdeckungsverteilung.

- **Effekt auf dem heutigen Val: ~0 Punkte** (der Val ist von Weiß gespielt). Auf einem Val von der
  schwarzen Seite: unbekannt, potenziell zweistellig. Das ist eine **Robustheits**-Maßnahme, keine
  Punktemaßnahme — sie gehört zu „nicht wie ein Glücksgriff", nicht zur 98.
- **Warnung aus `docs/frame-scan.md`:** der Hand-Gate ist auf DIESEN Aufbau kalibriert; eine neue
  Kamera verschiebt ihn still. Bei gleichem Aufbau und nur getauschter Sitzseite entfällt das.
- **Erfolgsmaß:** Verdeckungsrate Weiß/Schwarz im echten Pool nähert sich 1,0 (heute 2,02).

### D7 — Turntable-Bauern nachziehen
**Handarbeit: ~35 min (eine Aufnahme). Rechenaufwand: wie D6.**

`turntable-clean` trägt **keinen einzigen Bauern**. Ein Drehteller-Clip mit Bauern schließt die
einzige benannte Lücke des Pools.

- **Effekt: unter 0,1 Punkte.** `wP`/`bP` sind mit 83 365 / 82 963 Zellen die am besten belegten
  Figurenklassen — dort fehlt nichts. Die Turntables addieren laut
  `docs/val-choice-2026-09-10.md` ohnehin nur 6–9 % auf die Klassen, die sie treffen. **Niedrige
  Priorität**, hier nur der Vollständigkeit halber.

### D8 — Was ausdrücklich NICHT lohnt

| Maßnahme | Warum nicht |
|---|---|
| **Mehr Komposite** | 41 % des Datensatzes sind schon 10 Stellungen. Weitere Komposite aus denselben vier Quellvideos verstärken g1/d1/e1 und nichts sonst. |
| **Synth (`build-synth`)** | In v6 nicht enthalten, und zu Recht: `synth-crop-resolution-gap` — Synth trägt ~51 px je Feld gegen ~200 real; `synth-probe-vs-production` — die Probe-Materialwerte erreichen die Trainingsdaten kaum. Der Domänenabstand ist größer als die Lücke, die er füllen soll. |
| **Hard-Negative-Mining neu fahren** | CLAUDE.md misst: 98,6 % der Funde liegen über `PIECE_VISIBLE_MAX` und sind aus dem Verlust maskiert. **Aber aufräumen:** `data/reports/hard_empty.jsonl` liegt AKTIV (5 653 Zeilen), 2 575 davon stehen in v6, und die Liste stammt aus `real13-ms-s2-bn80-bs256-swa1e4` — einem alten Lauf. Das ist ein verstecktes Eingangssignal aus einem anderen Modell (`dataset.py:98-107`). Parken oder neu minen, aber nicht unbemerkt mitführen. |
| **Augmentierung gegen Domänenlücken** | Die Lücken sind Auflösung, Licht und Spielerseite. Auflösung ist eine Packgröße (128 px bringt +4,35 Punkte, `arch-training-2026-09-11.md`) — keine Augmentierung. Licht und Spielerseite lassen sich nicht augmentieren, ohne die Verdeckungsstatistik zu erfinden. |

---

## 5. Reihenfolge und Bilanz

| # | Maßnahme | Hand | Rechnen | Effekt (Punkte) | Robustheit |
|---|---|---:|---|---:|---|
| D1 | Zweiter/dritter Val-Schnitt (4K, dunkel) | **0 h** | Minuten | 0 | **entscheidend** |
| D2 | `split.json` entschärfen | 5 min | 0 | 0 | hoch |
| D3 | Aufbau-Check je (Session, Feld) | 20 min | Inferenz | 0–1,5 | hoch |
| D4 | `SETTLE_LIMIT` kontrastnormiert | 0 h + Code | Minuten je Session | 0,2–0,6 (unbelegt) | mittel |
| D5 | 1 867 offene Audit-Flags | 45–60 min | 0 | < 0,1 | gering |
| D6 | 4 Aufnahmen von Schwarz | **2,3 h** | ~6 h | ~0 auf diesem Val | **entscheidend** |
| D7 | Turntable mit Bauern | 35 min | ~1,5 h | < 0,1 | gering |

**Summe D1–D5: rund 1,5 Stunden Handarbeit**, kein einziger neuer Export.

### Kann der jetzige Korpus 98 % — und mehr?

**Ja für 98 %, ja für 99 %, nein für 99,5 %+.**

- Das Label-Rauschen des echten Pools liegt entdeckt bei 0,36 % und geschätzt bei 0,1–0,5 % Rest.
  **Ich kann nicht zeigen, dass es über 1 % liegt** — und habe ausdrücklich danach gesucht.
- Auf dem Val sind es 0,105 % bestätigte Korrekturen plus 44 offene Flags → Messgrenze ~99,7 %.
- Der Abstand von 0,9548 auf 0,98 sind **294 von 11 684 Zellen**. Die Datenmaßnahmen oben tragen
  davon höchstens 100–200; **der große Teil dieser Lücke ist keine Datenfrage.** Die einzige
  bisher gemessene Einzelmaßnahme, die sie schließt, ist die Auflösung: derselbe Trunk, derselbe
  Seed, 80 px → 128 px ergab **0,9425 → 0,9860** (`docs/arch-training-2026-09-11.md`). Das liegt
  außerhalb dieses Auftrags, gehört aber in das Urteil: **der Korpus trägt schon heute 98,6 %,
  sobald er in der richtigen Größe gepackt wird.**
- Was der Korpus **nicht** hergibt, ist die Aussage, dass diese 98,6 % kein Glücksgriff sind. Dafür
  fehlen D1 und D6 — und D1 kostet keine Handarbeit.

---

## 6. Unbelegt / offen

- Der Effekt von D4 (0,2–0,6 Punkte) ist gerechnet, nicht gemessen.
- Ob `turntable-clean` wirklich handfrei ist, steht nirgends gemessen — 32 512 Zellen mit
  `coverage = 0.0` ohne Matte.
- Die Klassenabdeckung der beiden 4K-Sessions ist nicht ausgezählt; `docs/val-choice-2026-09-10.md`
  listet sie nicht unter den 13 Sessions mit voller Abdeckung. Vor D1 nachzählen.
- Die 2 138 verwaisten `corrections.jsonl`-Zeilen sind gezählt, aber nicht daraufhin geprüft, ob
  ein Re-Export Frame-IDs je verschoben hat. Täte er es, landete eine Korrektur auf dem falschen
  Frame — ein eigener Rauschkanal.
- Die 23 unsichtbaren Commit-Fenster sind nicht einzeln nachgesehen; `docs/position-check.md` hat
  eines geprüft und für harmlos befunden.
- Alle Zahlen dieses Dokuments stammen aus lesenden Auszählungen über `manifest.jsonl`,
  `log.jsonl`, `corrections.jsonl`, `interval-check.jsonl` und `data/reports/audit-flags*`;
  es wurde nichts gebaut, trainiert oder verändert.
