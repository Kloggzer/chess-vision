# Plan: von 98,6 % auf 99 %+, ohne Glücksgriff

> Zusammenführung von `docs/accuracy-98-plan.md` (Protokoll), `docs/claude-handoff-architecture-methods.md`
> (Architektur-Kandidaten) und `docs/plan-98/01..04` (vier Messberichte vom 2026-09-11).
> Dies ordnet, was gemessen ist, gegen das, was vorgeschlagen wird — und streicht, was nicht passt.

## Der Befund, der die Reihenfolge bestimmt

Die Restfehler sind **kein allgemeines Genauigkeitsproblem**. Gemessen (`02-fehleranalyse.md`):

- **68 % aller Fehler stammen aus 12 von 280 Verweil-Episoden**; 223 Episoden sind fehlerfrei.
  Zwei Episoden tragen die Hälfte.
- Die Ursache ist **die Blickrichtung des Springers**: Kopf von der Kamera weg → Draufsicht ist ein
  runder Klotz → liest sich als Turm, mit Konfidenz 0,99.
- Nicht Helligkeit (das hellste Band ist das beste: 0,941 gegen 0,552), nicht Feldfarbe
  (`b1`, `f3`, `e6`, `b5` liegen bei 0,98–1,00, nur `e2`/`d5` kippen).
- **Label-Rauschen ist NICHT der Deckel**: 0,36 % im Pool, 0,105 % im Val → Messgrenze ~99,7 %
  (`04-daten.md`, visuell gegengeprüft in `02`).

Daraus folgt die wichtigste Streichung: **die Aufmerksamkeits-Kandidaten des
Architektur-Handoffs zielen nicht auf diesen Fehler.** Gated SDPA (R1) und Differential
Transformer (R2) adressieren Optimierungsstabilität und das Unterdrücken störender Kontextbeiträge
— unser Fehler ist kein Kontextfehler, sondern ein **verlorenes Detail innerhalb einer Zelle**.

Die einzige architektonische Idee mit sachlichem Bezug ist **Kandidat 1 (A1/A2)**:
`CellNet.forward` mittelt jede Zelle räumlich weg, bevor der Brettkopf sie sieht. Die
Kopfrichtung einer Figur IST räumliches Detail innerhalb der Zelle. Das ist eine **Hypothese**,
keine gemessene Ursache — aber es ist die einzige der vorgeschlagenen Architekturen, die überhaupt
an der gemessenen Fehlermechanik ansetzt.

## Harte Schranken, die jede Planung binden

| Schranke | Zahl | Quelle |
|---|---|---|
| Val löst nur ~876 unabhängige Entscheidungen auf, nicht 9 028 Zellen | 1 pp = **9 Entscheidungen** | `02` |
| Von 98,6 auf 99,0 sind 47 Zellen | Seed-sd 0,0157 = 142 Zellen | `03` |
| Zulässige Kandidatenzahl gegen den Siegerfluch | **2** bei 1 Seed, 4 bei 3, 8 bei 5, 13 bei 7 | `03` |
| Paarung je Seed kürzt den Seed-Effekt NICHT | sd_d 0,0204 = √2 × 0,0144 | `03` |
| Test-Split ist längst benutzt | **27** `eval_test.json` im Repo | geprüft |
| 128 px ist die Sensorgrenze | 20 von 22 Aufnahmen: 97–126 echte Quellpixel | `01` |
| Gerätepreis 128 px | 7,5–8,0 ms/Brett gegen 4,3–4,9 heute (1,7×) | gemessen |

### Was `accuracy-98-plan.md` an Methodik beisteuert (und korrigiert)

Diese Punkte stammen aus dem externen Protokoll-Dokument. Drei davon korrigieren Fehler, die ich
selbst gemacht habe, und sie gelten für JEDE Phase unten:

- **Die Spanne dreier Seed-Mittel ist keine Standardabweichung und keine Signifikanzschwelle.**
  Ich habe die 0,0157 den ganzen Tag als Rauschboden gegen Effekte gerechnet. Unzulässig.
- **Schwanzepochen sind korreliert** — 15 gemittelte Epochen sind keine 15 unabhängigen
  Wiederholungen, und ein Schwanzmittel ist kein Ergebnis eines auslieferbaren Checkpoints.
- **`epoch-frac` ist kein RAM-Deckel.** Es ändert Optimierung und Datenmenge. Als Begründung für
  0,35 zählt nur „Hausrezept", nicht „passt in den Speicher" — auch wenn beides zutrifft.
- **Aufnahmegruppen zusammenhalten, einschließlich abgeleiteter Varianten desselben Quellvideos.**
  Für diesen Korpus wesentlich: die Kompositen sind aus denselben Quellen abgeleitet.
- **Mehr Seeds ersetzen keine weiteren Aufnahmen.** Seed-Streuung und Aufnahme-Streuung sind
  verschiedene Größen und müssen getrennt berichtet werden. Das ist der Kern von „kein Glücksgriff".
- **Lauf-Eignung mechanisch prüfen:** Vollständigkeit über *eindeutige, lückenlose* Epochenindizes,
  nicht über Zeilenzahl — ein fortgesetzter oder doppelter Verlauf käme sonst als fertig durch.
  Unvollständige Läufe werden aus der Rangfolge **ausgeschlossen**, nicht mit Sternchen markiert.
  Beides sind Defekte in `scripts/sweep_arch_v6.ps1` und `scripts/compare_arms.py`.
- **Fehler-Mining nur auf Trainingsfehlern.** Wer Testfehler minst und den Satz weiter Test nennt,
  hat keinen Test mehr.

Der Architektur-Handoff schlägt sieben Arme vor. **Bei drei Seeds sind vier erlaubt.** Die Liste
muss also gekürzt werden, nicht abgearbeitet.

## Phase 0 — erst das Messgerät, dann die Messung

Ohne diesen Schritt ist alles Folgende nicht interpretierbar. Kein Training.

| # | Maßnahme | Aufwand |
|---|---|---|
| 0.1 | `split.json` von `real13-mix-v6-80` repariert den kaputten Val (`21-29-35`, null weiße Springer). `split-pin.json` wird von **keiner Codestelle** gelesen — ein vergessenes `--split-file` misst blind. | 5 min |
| 0.2 | Val/Test-Schnitte, die **4K und dunkles Material** enthalten. Beide stehen heute ausschließlich im Training (15,5 % bzw. bis 26,6 % dunkle Zellen). | 0 h Hand |
| 0.3 | Auswertung **je Verweil-Episode**, nicht je Zelle; benachbarte Frames entdoppeln. Sonst zählt eine Figurenaufstellung 16× | Skript |
| 0.4 | Checkpoint-Regel vorab festlegen; Finalisten als **Checkpoint** auswerten, nicht als Schwanzmittel. Das Fenster bewegt die Zahl um 1 Punkt (0,9627 / 0,9576 / 0,9548 / 0,9527 bei letzte/10/15/20). | — |
| 0.5 | Eine Aufnahmegruppe als **wirklich unberührten** Test festschreiben und in `TEST-USED.json` mechanisch sperren. | — |
| 0.6 | Lauf-Eignung reparieren: lückenlose Epochenindizes statt Zeilenzahl, unvollständige Läufe aus der Rangfolge ausschließen. | Skript |

### Entschieden am 2026-09-12, vor dem ersten Lauf der Abnahme

Damit nichts davon im Nachhinein gewählt werden kann:

- **0.4 Checkpoint-Regel.** Der Finalist ist **`best.pt`**, ausgewählt vom bestehenden `score` des
  Laufs auf dem VAL-Split: `0,45 · visible_piece_acc + 0,45 · visible_occupied_acc + 0,10 ·
  calibration` (`training/data.py:169`), bei Gleichstand `occupied_board_acc`, dann `macro_recall`.
  Der Test sieht genau diesen Checkpoint, **keinen Schwanzmittelwert**. Schwanzmittel (letzte 20
  Epochen, gepaart je Seed, auf `val_visible_piece_acc`) dienen ausschließlich der **Rangfolge der
  Arme**, nie der Meldung eines Ergebnisses.
- **0.3 Auswertung je Episode.** `scripts/episode_eval.py` — eine *Verweil-Episode* ist ein
  zusammenhängender Ply-Lauf einer Figur auf einem Feld, neu bei jedem Labelwechsel. Berichtet
  werden Zell-, Episoden- und **Mehrheits**genauigkeit je Aufnahme, dazu wie stark die Fehler
  klumpen (Anteil der größten Episode und der zwölf größten). Die Mehrheitsspalte misst direkt,
  was Phase 1.3 auf dem Gerät holen würde. Segmentierung durch Tests festgehalten
  (`tests/test_episode_eval.py`), Vorhersagen über dieselbe Maschinerie wie `chesslab eval`.
- **0.5 Unberührter Test.** `rg-2026-09-11-20-00-52` — nachgewiesen in **keinem** der 42
  `eval_test*.json` im Repo, während `rg-2026-08-08-00-39-57` dort 33-mal und
  `rg-2026-08-08-11-55-19` 32-mal auftaucht. Der Stand ist mechanisch festgehalten in
  `data/TEST-USED.json`, geschrieben von `scripts/test_used.py`; `--check <session>` beendet mit 1,
  sobald eine Aufnahme verbrannt ist. Diese Gruppe wird **einmal** ausgewertet, nach der Auswahl.
- **Rebuild vor der Abnahme.** In der Nacht auf den 2026-09-12 kamen neue Matten (23 Aufnahmen) und
  Label-Korrekturen. Ein Pack friert `coverage` und `label` beim Schneiden ein, also waren alle
  `rg`-Packs veraltet; `chesslab session pack --replace` gibt es seitdem. Die Abnahme läuft auf
  **`real13-mix-v7-128`** — dieselben Aufnahmen, frische Labels, plus die eingefrorene Testgruppe.
  Die Läufe in `_arch128v6/` bleiben gültig, sind aber auf dem alten Stand und **nicht** mit den
  neuen paarbar.

## Ergebnis der Abnahme, 2026-09-12

**Phase 1 ist gelaufen, Phase 3 Schritt 1 ist eingelöst.** Alle Zahlen sind Schwanzmittel über die
letzten 20 Epochen von `val_visible_piece_acc`, gepaart je Seed, auf `real13-mix-v7-128` (frische
Matten und Label-Korrekturen, 979 363 Zeilen, `split-pin.json`).

| Seed | `p4a` (Baseline) | `rot` (`--rot90 --hflip-p 0.5`) | Diff |
|---:|---:|---:|---:|
| 42 | 0,9652 | 0,9988 | +0,0335 |
| 43 | 0,9812 | 0,9980 | +0,0168 |
| 44 | 0,9631 | 0,9945 | +0,0314 |
| 45 | 0,9786 | 0,9974 | +0,0188 |
| 46 | 0,9756 | 0,9937 | +0,0181 |
| 47 | 0,9650 | 0,9964 | +0,0313 |
| 48 | 0,9738 | 0,9951 | +0,0213 |

- **Vorzeichentest 7/7, p = 0,0078** — die im Plan geforderte Schwelle, verteilungsfrei.
- **Minimum über die Seeds +0,0168**, nicht das Mittel; 1,7× über der Relevanzschwelle 0,010.
- `rot` liegt bei **7 von 7** Seeds über 99 %, `p4a` bei **0 von 7**.
- Seed-sd 0,0019 gegen 0,0073 — der schlechteste `rot`-Seed schlägt den besten `p4a`-Seed um 1,25
  Punkte. Das ist der eigentliche Punkt: nicht nur besser, sondern **reproduzierbar** besser.
- Alle 14 Läufe mit lückenlosen Epochenindizes 0–59 geprüft.

**Auflösung, sechs gepaarte Seeds** (`rot` auf `real13-mix-v7-80`, identische Zeilen und Split,
nur ein anderer Pack): 128 px gewinnt **6/6**, gepaartes Minimum +0,0104. Kein Seed erreicht bei
80 px im **Schwanzmittel** die 99 % (0,9694 bis 0,9884).

> **Das ist eine Rangfolge-Aussage, kein Ergebnis** — 0.4 laesst Schwanzmittel nur zum Ordnen der
> Arme zu. Nach der Checkpoint-Regel gemessen ueberschreiten einzelne 80-px-Laeufe die 99 % sehr
> wohl (`_arch80v6/rot-s42` 0,9904 auf dem eigenen Val, 0,9912 auf dem v7-Val;
> `_acc80v7/rot-s42` 0,9982) — der Aufschlag von `best` gegen das Niveau reicht in diesen Laeufen
> von +0,0010 bis +0,0310, Faktor 31, und kuerzt sich deshalb nicht heraus. Beide Zahlen sind
> Val-Zahlen: `best` wird auf demselben Val ausgewaehlt, auf dem es gemeldet wird. Ob 80 px die
> 99 % traegt, ist damit **nicht gemessen**, sondern offen bis zur Testgruppe (3.4/3.5). Die
> Aufloesungsentscheidung stuetzt sich auf das 6/6 der Rangfolge, nicht auf eine 99-%-Schwelle. Die 80er-Streuung ist zudem doppelt so gross. Preis: 7,5–8,0 ms je
Brett gegen 4,3–4,9. Die Entscheidung dafür fällt aber erst im Kotlin-Replay, nicht hier.

**Was damit NICHT gezeigt ist** — und das trennt das Ergebnis vom Ziel: es sind Val-Zahlen auf
EINER Aufnahme (~876 unabhängige Platzierungen), es sind Schwanzmittel und kein auslieferbarer
Checkpoint, und die eingefrorene Testgruppe ist unberührt.

**Was aus dieser Abnahme NICHT zitiert werden darf.** Die Schranke gegen den Siegerfluch erlaubt
**2 Kandidaten bei 1 Seed**, 4 bei 3, 13 bei 7. Auf Seed 42 allein laufen heute drei Arme: `r90`,
`hfl` (Ablation) und `g2` (A1). Für eine **Zerlegung** ist das vertretbar — sie kürt keinen
Sieger, und der Abstand ist gross (`r90` 0,9989 gegen `p4a` 0,9652, das 177-fache der Seed-sd von
0,0019). Als **Auswahl** ist keiner der drei zitierfähig: sobald aus `g2` eine
Architekturentscheidung werden soll, braucht sie ihre drei Seeds, und dasselbe gilt für jede
Aussage der Form „Arm X ist besser als Y" aus diesen Läufen.

## Offene Punkte, die nach der Abnahme noch fehlen

| | Schritt | Stand |
|---|---|---|
| 3.2 | Unsicherheit je **Aufnahmegruppe** bootstrappen | Grundlage da: **14 unabhängige Gruppen** (10 Aufnahmetage + 4 VID-Tage), gezählt 2026-09-12 |
| 3.3 | Bestätigung über **Sitzungs-Folds** | `real13-mix-v7-128` hat 0 `split-f*.json` |
| — | **Episoden-Auswertung je Aufnahme** (`scripts/episode_eval.py`) | gebaut, nie ausgeführt |
| 3.4/3.5 | Checkpoint einfrieren, Test **genau einmal** | offen, in dieser Reihenfolge |
| 3.6 | ONNX gegen PyTorch, Telefon-Laufzeit, **Phantome im Replay** | offen — das ist das Veto, nicht `val_acc` |
| 1.3 | Zeitliche Mehrheit auf dem Gerät | offen (Kotlin); `episode_eval` misst vorab, was sie brächte |
| 1.4 | Komposit-Resample beheben | offen |

## Werkzeuge, die dabei entstanden sind

| Skript | Beantwortet |
|---|---|
| `scripts/episode_eval.py` | Genauigkeit je Verweil-Episode statt je Zelle, plus was zeitliche Mehrheit brächte |
| `scripts/test_used.py` | welche Aufnahme schon als Test diente (`data/TEST-USED.json`) |
| `scripts/move_timing_audit.py` | Zellen im Zugfenster, ungeprüft und unmaskiert |
| `scripts/hand_audit.py` | Trainingsmaterial, das an einer ungeprüften Matte hängt |
| `scripts/coverage_gaps.py` | wo der Korpus dünn ist, und ob Stellung oder Licht hilft |
| `scripts/worker_probe.py` | ob mehr Loader-Worker etwas kaufen (Antwort: nein) |
| `scripts/cross_eval.py` | alte Läufe am selben Massstab |

## Drei Messungen, die nebenbei anfielen und Bestand haben

1. **Der Korpus hat EINE Kamerapose.** Verkürzung der hinteren Brettkante 0,955–1,025 über alle 24
   Aufnahmen, Median 0,986 (1,0 = senkrecht von oben). Die Springer-Fehlmechanik ist deshalb die
   **Eigendrehung der Figur**, nicht der Kamerawinkel — was erklärt, warum `--rot90` so trägt.
2. **Der Boden ist die Platte, nicht die GPU.** Auf dem 48-GB-Packsatz wartet der Schritt zu
   68–77 % auf Daten. Mehr Worker helfen nicht (2 gegen 4: 10,7 gegen 10,6 s warm), und die
   Worker-Zahl ist kein freier Schalter — der Verlust war nicht bitgleich.
3. **`brightness` fehlt in 376 640 von 979 363 Zeilen** (allen Kompositen). Wer sie mit `or 0.0`
   liest, wirft sie geschlossen ins dunkelste Band.

## Phase 1 — was ohne neue Architektur geht

Nach erwartetem Ertrag je Aufwand. Alle drei Seeds, Hausrezept (`--epoch-frac 0.35 --weight-cap 3.0`),
`--low-memory --ram-reserve-gb 4`, ein Prozess.

| # | Arm | Hypothese | Kosten |
|---|---|---|---|
| 1.1 | ~~**128 px unter dem Hausrezept**~~ **GELAUFEN, 7 Seeds** | Nie gelaufen. 0,9860 stammt von `frac 1.0`, einem Seed. Billigster Lauf im Plan. | ~24 min × 3 |
| 1.2 | ~~**Rotations-/Flip-Augmentierung**~~ **GELAUFEN: +0,0245 gepaart, 7/7** | Ahmt die 3D-Blickrichtung nach. Alle Läufe fahren heute `aug_rot90=False` und sämtliche Flips auf 0 — **nie getestet**, und es ist der einzige billige Hebel, der direkt auf die Springer-Mechanik zielt. | ~24 min × 3 |
| 1.3 | **Zeitliche Mehrheit auf dem Gerät** | Die Streufehler sind unsicher (Konfidenz-Median 0,697 gegen 1,000 bei den Springern) und 9× mit Teilverdeckung angereichert. Kein Training nötig. | Kotlin |
| 1.4 | **Komposit-Resample beheben** | 105 152 Zeilen (12,5 %) werden beim Packen 1,4× hochskaliert; `pack_from_source` hat keinen Aufrufer mehr. | Build |

Rechnung aus `02` über Val+Test: `e2` lösen → 0,9924, `d5` dazu → 0,9940, Streufehler halbieren
→ 0,9965. **Das Ziel liegt in Phase 1, nicht in Phase 2.**

## Phase 2 — nur bei verbleibender Lücke: EIN Architekturarm

**Stand 2026-09-12: die Bedingung ist NICHT eingetreten** — Phase 1 trägt die 99 % auf allen
sieben Seeds. A1 läuft trotzdem, aber ausdrücklich als **Erkundung**, nicht als Auswahl, und in
drei Regimen, weil die Kontrolle bei 0,9937–0,9988 keinen Spielraum mehr lässt (ein Deckeneffekt
würde einen echten Beitrag verstecken): auf dem Gewinner-Rezept, **ohne Augmentierung** gegen
`p4a` (dort sind 2–4 Punkte Luft), und bei 80 px. Umgesetzt als Preset `cellnet_p4g2`
(2×2-Pooling statt globalem Mittel, +0,148 MMAC/Crop = +2,7 %). Drei Seeds reichen für eine
Richtung, nicht für eine Abnahme.

Ebenfalls offen und ausdrücklich Erkundung: die **Ablation** `--rot90` gegen `--hflip-p 0.5`
einzeln (ein Seed — bei einem Seed entscheidbar nur, wenn der Abstand gross ist), und das
**Domänen-Experiment** `real13-mix-v7-80-real` (nur die 19 echten Aufnahmen, 206 587 statt
427 391 Trainingszeilen). Letzteres ist offen in beide Richtungen: die Kompositen liefern rund
63 % aller Springer-Beispiele, und der Springer ist die Klasse, die scheitert.

Falls die Bedingung doch einträte, dann **A1** aus dem Architektur-Handoff und sonst nichts:
jede Zelle auf 2×2 poolen statt global, flach projizieren, gegen eine parameterangeglichene
Kontrolle. Begründung oben. **R1/R2/R3** bleiben liegen, bis ein gemessener Grund für sie
existiert — eine Fehlermechanik, die sie adressieren.

**Die Distillation gehört nicht in diesen Satz** (korrigiert 2026-09-12). Sie zielt auf keine
Mechanik: sie überträgt die Ausgabeverteilung eines besseren Modells und wirkt als
Regularisierung, kann also gerade dann tragen, wenn keine benennbare Mechanik übrig ist — unser
heutiger Zustand. Mit dem Mechanik-Kriterium wäre sie per Konstruktion nie fällig. Ihre Bedingung
ist eine andere und ist prüfbar: **es gibt einen Lehrer, der auf unserem Val nachweislich besser
ist als der Schüler.** Den gibt es heute nicht — der beste Lauf steht bei 0,9988. Der offene
Einwand gegen einen Foundation-Lehrer (DINOv3) ist ebenfalls kein Mechanik-Argument: unser Eingang
ist ein 128-px-Zellcrop aus einem geradegezogenen Brett, kein natürliches Bild, und ob dichte
Merkmale darauf etwas Übertragbares tragen, ist ungemessen.

Kandidat 2 (relative Positions-Bias) ist billig und exportierbar, zielt aber auf Nachbarschaft,
nicht auf Blickrichtung. Als Zweitarm zulässig, wenn das Budget es hergibt (4 bei 3 Seeds).

Die Behauptung in `boardnet.py:50`, Positionskodierung habe „bei 80 px 0,16 gekostet", hat im
Repo **keine Messung hinter sich** — sie darf Kandidat 2 nicht ausschließen.

## Phase 3 — Abnahme, die „kein Glücksgriff" formal einlöst

1. **Vorzeichentest über 7 Seeds** (p = 0,0078, verteilungsfrei — der gepaarte t-Test bräuchte 27),
   Relevanzschwelle **0,010**, bewertet wird das **Minimum über die Seeds**, nicht das Mittel.
2. Unsicherheit **je Aufnahmegruppe** bootstrappen, nicht je Crop. Korrelierte Frames sind kein Beleg.
3. Bestätigung über Sitzungs-Folds (`chesslab dataset folds`, für v6 noch nicht gebaut).
4. Test-Split **genau einmal**, nach festgelegter Regel und festgelegtem Checkpoint.
5. **Reihenfolge einhalten:** erst Auswahl auf Entwicklungsmaterial, dann Checkpoint einfrieren,
   dann Test — nicht jeden Checkpoint gegen den Test halten.
6. Export einfrieren: ONNX gegen PyTorch **numerisch** abgleichen, dann Telefon-Laufzeit, dann
   **Phantome im Kotlin-Replay** —
   `p4n` hat dieselbe Genauigkeit wie `p4a`, aber **10× so viele Phantome** (20 gegen 2). Nach
   `phantoms-are-the-veto` entscheidet das, nicht `val_acc`.

## Was NICHT getan wird

- Kein ASHA/Hyperband nach Genauigkeit: `scripts/train_watchdog.py` zeigt an 33 Läufen, dass die
  Regel 15 gestoppt hätte, darunter spätere Sieger. Die früheste tragfähige Sprosse ist **25 von 60**,
  Ersparnis 44 % — und erst ab zehn Kandidaten lohnend. Wir haben weniger.
- Kein Optuna/Ray: eine Studien-DB wäre eine zweite Wahrheit neben `metrics.jsonl`.
- Keine 160 px, kein größeres `board_size`: reine Interpolation (`01`).
- Keine automatische Überschreibung FEN-abgeleiteter Labels, nur weil ein Modell widerspricht.
- `epoch-frac` nicht mit Speicherdruck begründen — der Datei-Lesepfad ist die Antwort darauf.
- Kein Mining auf Testfehlern.

## Offene Konflikte, die jemand entscheiden muss

- **`SETTLE_LIMIT`**: `04` misst, dass ein echter Zug im Median 43,2 bewegt, die Schwelle aber auf 45
  steht — das Tor fänge nur 46 % der echten Figurenwechsel. `CLAUDE.md` sagt ausdrücklich das
  Gegenteil. Ungeprüft von mir, nicht übernommen.
- ~~**Wie viele Aufnahmegruppen** es überhaupt gibt~~ — **beantwortet 2026-09-12: 14** (10
  Aufnahmetage plus 4 VID-Tage, 23 echte Aufnahmen). Genug für einen Bootstrap je Gruppe, aber
  dünn: die grösste Gruppe trägt 4 Aufnahmen, sechs tragen genau eine.
- **Was eine Erfassungs-Session semantisch ist.** `SessionRecorder.capture` verlangt
  `(ply, fen, moveSan, corners)` — „das, was `chesslab slice` konsumiert". Ein gezielter Aufbau
  mit drei Figuren hat weder Partie noch Zug noch Ply. Entweder muss jeder Erfassungs-Aufbau ein
  vollständiges Brett mit gültigem FEN sein, oder die Erfassung ist ein eigener Artefakttyp neben
  dem Slice-Pfad. Blockiert `plan/04-turntable-capture` (zweimal von einem fremden Agenten
  geprüft, zweimal durchgefallen).
