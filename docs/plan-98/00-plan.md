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

## Phase 1 — was ohne neue Architektur geht

Nach erwartetem Ertrag je Aufwand. Alle drei Seeds, Hausrezept (`--epoch-frac 0.35 --weight-cap 3.0`),
`--low-memory --ram-reserve-gb 4`, ein Prozess.

| # | Arm | Hypothese | Kosten |
|---|---|---|---|
| 1.1 | **128 px unter dem Hausrezept**, 3 Seeds | Nie gelaufen. 0,9860 stammt von `frac 1.0`, einem Seed. Billigster Lauf im Plan. | ~24 min × 3 |
| 1.2 | **Rotations-/Flip-Augmentierung** (`--rot90`, `--hflip-p`, `--vflip-p`) | Ahmt die 3D-Blickrichtung nach. Alle Läufe fahren heute `aug_rot90=False` und sämtliche Flips auf 0 — **nie getestet**, und es ist der einzige billige Hebel, der direkt auf die Springer-Mechanik zielt. | ~24 min × 3 |
| 1.3 | **Zeitliche Mehrheit auf dem Gerät** | Die Streufehler sind unsicher (Konfidenz-Median 0,697 gegen 1,000 bei den Springern) und 9× mit Teilverdeckung angereichert. Kein Training nötig. | Kotlin |
| 1.4 | **Komposit-Resample beheben** | 105 152 Zeilen (12,5 %) werden beim Packen 1,4× hochskaliert; `pack_from_source` hat keinen Aufrufer mehr. | Build |

Rechnung aus `02` über Val+Test: `e2` lösen → 0,9924, `d5` dazu → 0,9940, Streufehler halbieren
→ 0,9965. **Das Ziel liegt in Phase 1, nicht in Phase 2.**

## Phase 2 — nur bei verbleibender Lücke: EIN Architekturarm

Wenn Phase 1 die 99 % nicht trägt, dann **A1** aus dem Architektur-Handoff und sonst nichts:
jede Zelle auf 2×2 poolen statt global, flach projizieren, gegen eine parameterangeglichene
Kontrolle. Begründung oben. R1/R2/R3 und die Distillation bleiben liegen, bis ein gemessener
Grund für sie existiert — eine Fehlermechanik, die sie adressieren.

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
- **Wie viele Aufnahmegruppen** es überhaupt gibt: ohne genug unabhängige Gruppen ist die
  Unsicherheit nicht schätzbar, und dann ist 99 % nicht *nachweisbar*, egal was das Modell kann.
