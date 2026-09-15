# Entscheidungsvorlage (Stand 2026-09-15, Nacht)

Jeder Punkt ist gemessen oder am Code belegt — es fehlt nicht die Analyse, sondern eine
Richtungsentscheidung. Erledigtes fliegt raus, diese Liste ist kein Archiv.

**Heute gebaut und damit gestrichen:** `MarkerTracker`-Port, Achsen-Fit-Paritaet, die doppelte
Verdeckungsschwelle, die korpusweiten `eval`-Namen, die vier `TrackerService`-Ableitungen, die
drei Ketten-Punkte (`_source`, `settle-scan` als Sprosse, `nextStep` mit Grund), `position-flags`
nennt ungemessene Sessions (alt 3), die Kommentar-Ratsche auf 5 (alt 8), der Fixture-Baukasten in
allen drei Sprachen (alt 9) und die ganze Namensdrift `cov`/`measured`/`pack` (alt 10).

**Spalte "Kiste":** (A) klein und verhaltensgleich · (B) mittel, braucht neue Tests · (C) aendert
Verhalten oder Format — nie ohne A/B am Regressionssatz.

| # | Punkt | Kiste | Aufwand | Empfehlung |
|---|---|---|---|---|
| 5 | Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse | — | Aufnahmen | **ja** |
| 6 | `_persistent`: 532 Frames zu Unrecht im Vorrat, 947 zu bergen | C | Re-Export | mit dem naechsten Neubau |
| 7 | `2026-08-15-23-01-43` braucht einen Re-Export | A | — | faellt mit 6 zusammen |
| 17 | `ALPHA_REASON`: Bericht und Worker meinen verschiedene Stapel | B | 1 h | **entscheiden** |
| 18 | `withCoverageGateOf` gattert ohne Coverage-Spalte | C | 2 h | braucht den Regressionssatz |
| 19 | `recoveryConfig` weicht als einziger Rig-Bauer ab | A | 15 min | vermutlich versehentlich |
| 11–16 | Sechs TODOs, die Verhalten oder Zufallsfolge aendern | s. u. | | s. u. |

## 17. `ALPHA_REASON` — welche Seite hat recht?

`matte_status` zaehlt JEDEN dirty-Frame als fehlende Matte (die ZELLE entscheidet, 2026-08-22),
`alpha_worker` mattet per Vorgabe nur `occluded` (die Regel davor). Der Bericht meldet damit eine
Luecke, die kein Standardlauf je schliesst, und `MatteCensus.reported` sammelt genau dort an.
Beide Seiten haben einen Test, der sie verteidigt; `dirty_pile` ist seit heute die eine Funktion,
die Frage bleibt offen (`tests/test_matte_pile_agreement.py`, TODO am Symbol).

## 18. `TrackerService.kt:779` — `coverage_gate` ohne `coverage_output`

`spec?.coverageGate?.let { copy(...) }` fragt die Spalte nie; der Null-Check haengt nur an der
Warnung. Ein Modell ohne Coverage-Spalte hat `pOccluded = 0.0` — dagegen auf 0,25 zu gattern
gattert gegen eine Zahl, die nie geliefert wurde. Kein ausgeliefertes Modell faellt heute hinein.

## 19. `RecoveryFixtures.recoveryConfig`

Der einzige Rig-Bauer, der `minGridLineCoverage` beim ausgelieferten 0,5 laesst, waehrend
`testConfig`, `detectConfig` und `seamConfig` es alle auf 0,0 zwingen. Sieht versehentlich aus —
es zu aendern verschiebt aber Verhalten, also liegt es unangetastet.

---

## 3. `position-flags` nennt ungemessene Sessions nicht

`position_flags()` (`position_flags.py:102`) gibt `per_session` zurueck — aber nur fuer Sessions
**mit** Flags. Eine Aufnahme ohne `settle_dev` liefert null Flags und ist im Bericht nicht von
einer zu unterscheiden, auf der wirklich nichts strittig war.

Auf ZELL-Ebene setzt das Projekt die Regel schon durch (die Lane schreibt `—` statt `0`). Auf
SESSION-Ebene fehlt sie.

**Der Vorschlag:** `unmeasured: [session_id, …]` in die Rueckgabe und in die Kopfzeile, genau wie
`stale_temporal` daneben schon steht. Eine Stunde, verhaltensgleich fuer alles ausser der Anzeige.
**Empfehlung: ja.**

## 5. Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse

Inzwischen **siebenmal** gefahren, jedes Mal **385 / 14 / 1 / 167 bei 6 Alarmen**, Ziffer fuer
Ziffer. Er beweist zuverlaessig, dass nichts kaputtgeht — das ist sein Zweck, und er erfuellt ihn.

Aber: vier Stellungs-Luecken wurden gefunden, und **keine einzige** bewegt ihn. Das Gate von 0,5
auf 0,25 bewegt ihn nicht, obwohl es 17 % mehr Zellen maskiert. Die heutige Verify-Leiter-Aenderung
bewegt ihn nicht. Dem Satz fehlt Material, in dem eine Hand ueber einem Feld steht, das gerade die
Evidenz traegt.

**Die Frage:** neue Aufnahmen gezielt dafuer — von Schwarz gespielt, im Dunkeln, mit langsamen
Griffen ueber entscheidende Felder? Deckt sich mit dem, was ohnehin geplant ist.
**Empfehlung: ja, und zwar vor dem naechsten Re-Cut der Coverage.**

## 6. Der `_persistent`-Fix gilt nur fuer kuenftige Exporte

`framescan._persistent` nahm die Vereinigung statt der Schnittmenge; `classify` erklaerte darauf
den Rest des Intervalls zu `stale`/`changed`, und diese Frames fielen aus dem sauberen Vorrat.
Behoben seit 2026-09-14 — aber was auf der Platte liegt, entstand unter der alten Regel.

**Wie viele Frames es wirklich sind, ist NICHT gemessen.** Das ginge nur, indem man einen Satz
zweimal exportiert und vergleicht (~28 s je Aufnahme).

**Empfehlung:** erst EINE Aufnahme doppelt exportieren und zaehlen. Ist der Gewinn zweistellig,
lohnt der Rest; ist er einstellig, nicht.

## 7. Zwei Aufnahmen sind unvollstaendig gescannt

| Aufnahme | Zeilen | `grid_lines` | `hand_squares` |
|---|---|---|---|
| `2026-08-15-23-01-43` | 16 | ja | **nein** |
| `2026-08-30-14-33-02` | 4 | **nein** | **nein** |

Die anderen 22 sind vollstaendig. Beide sind winzig — Testexporte? **Nachscannen oder parken**,
beides zehn Minuten.

## 8. Die Kommentar-Ratsche steht bei 8, das Ziel ist 3

`CommentBudgetTest` feuert erst ab 8 aufeinanderfolgenden Kommentarzeilen; CLAUDE.md nennt 3 als
Ziel und 5 als Obergrenze. Python und TS sind bei harten 5.

**Die Frage:** Kotlin auf 5 ziehen? Handarbeit an den Dateien, die heute darueber liegen.
**Empfehlung: spaeter** — es ist Aufraeumen ohne Fund, und die Ratsche verhindert schon, dass es
schlimmer wird.

## 9. Ein Fixture-Baukasten je Sprache — Python-Haelfte gebaut

**Python ist erledigt (2026-09-15).** `tests/conftest.py` gab es nicht; jetzt traegt es
`make_profile` (die 30 Handbauten in 22 Dateien gehen darueber) und `write_session`/`slice_fixture`,
das per Vorgabe eine Session **mit `boards/`** schreibt und dabei **kein** `frames/` anlegt — ein
stiller Rueckfall auf den Fallback findet damit keine Datei mehr. Der Altfall ist `boards=False`
und hat in `test_board_store.py` einen eigenen Test.

**Gemessen war es 13 von 14, nicht 12**: nur `test_mesh_crop.py` erreichte den Brett-Zweig
ueberhaupt. Fuenf Suiten sind umgezogen (`dirty`, `settle`, `unknown`, `unusable_cells`,
`framescan`); die uebrigen bleiben bewusst auf dem Frame-Weg, weil dort der Frame das THEMA ist
(Marker-Detektion, `SessionWriter`, die Pixel-Hashes in `test_session_pack.py`).

**Der Fund dabei:** eine Zeile mit Brett, aber ohne `corners`, stuerzte in `iter_session_crops` ab
— der Marker-Fallback lief auf dem Frame, den das Brett gerade ueberfluessig gemacht hatte
(`frame = None`), und seine Antwort wurde nie benutzt. Behoben, Regressionstest in
`test_board_store.py`.

**Offen bleiben `lib/test-fixtures.ts` und der Kotlin-Bauer** (`session.ts:164`, `ModelSpecTest`).

## 10. Namensdrift ueber die Schichten

Drei Faelle, sehr unterschiedlich teuer:

- **`cov` heisst in zwei Geschwister-Berichten das Gegenteil.** In `hand_flags.py` ist `cov` die
  **Modell**-Sigmoid, in `position_flags.py` die **SAM**-Messung. Beide landen in `data/reports/`,
  beide liest die Strittig-Lane. Seit heute schreibt der Erzeuger `model_cov`; die alten Dateien
  auf der Platte tragen noch `cov`, und der Leser kennt beide.
  **Empfehlung: `cov` als Schluessel verbieten, sobald die Berichte einmal neu gerechnet sind.**
- **`measured` bedeutet drei Dinge**, zwei davon 35 Zeilen auseinander (`session.ts:52` = traegt
  `settle_dev`; `label-stream.ts:89` = SAM-Coverage als Zahl; `frame-hands.ts:19` = ueberhaupt
  gescannt). Ausgerechnet das Wort, mit dem das Projekt "ungemessen ist nicht 0" durchsetzt.
  **Empfehlung: umbenennen, wenn die Datei ohnehin angefasst wird — nicht als eigener Lauf.**
- **`pack` ist vier Artefakte** mit je eigener `manifest.jsonl`. **Erledigt 2026-09-15:**
  `docs/pack-arten.md` benennt die vier (Datensatz-Pack, Session-Pack, Kotlin-Pack, Crop-Pool) und
  sagt, woran man sie auf der Platte unterscheidet; `pack.py` und `packs.py` nennen sich in Zeile 1
  selbst. Kein Modul umbenannt. Einzige Code-Umbenennung: `build_dataset(pack=…)` heisst
  `write_pack=…`, weil es neben `from_packs=…` stand und das Gegenteil meinte.

---

# Die sechs TODOs, die Verhalten oder Zufallsfolge aendern

Alle sechs stehen inline im Code als `# TODO:` mit dem Warum. Keiner ist gebaut, weil jeder eine
Entscheidung braucht, die ich nicht treffen kann.

## 11. `dataset.py:164` — `occluded` steht im Maximum statt im Minimum

`empty_cap` richtet sich nach `max(eff_piece.values())`. Auf einem 14-Klassen-Bau ist `occluded`
die groesste Klasse — die Kappe fuer leere Felder haengt dann an der Verdeckung statt an der
groessten echten Figurenklasse.

**Heute folgenlos** (`pieces13` ist die Vorgabe, `occluded` ist Regressionsziel). Scharf wird es,
sobald wieder ein 14-Klassen-Satz gebaut wird. **Die Frage:** jetzt reparieren oder als Falle
stehenlassen? **Empfehlung: jetzt** — es ist eine Zeile und aendert an `pieces13` nichts.

## 12. `training/data.py:342` — toter `coverage_gate`-Parameter

Kein Aufrufer uebergibt ihn je; `evaluate.run_export` ist der einzige und laesst ihn weg.
`scripts/stage_model_asset.py --gate` ist die Umgehung, die daraus entstand.

**Die Frage:** Parameter streichen und das Staging-Skript als den Weg bestaetigen, oder den
Parameter verdrahten und das Skript zurueckbauen? **Empfehlung: verdrahten** — die Schwelle
gehoert ins Modell, und ein Skript, das nachtraeglich in eine `config.json` schreibt, ist genau
die Stelle, an der der Gate-Guard-Bug schon einmal beinahe alles entwertet hat.

## 13. `training/data.py:355` — die Modellkarte luegt ueber die Normalisierung

Ein Lauf mit `--crop-norm per-crop` rechnet mean/std gar nicht, die Karte behauptet trotzdem die
festen ImageNet-Werte. `train.py` schreibt es in `config.json` richtig; wer die **Karte** liest,
bekommt das Gegenteil des Rezepts.

**Die Frage:** `mode` in die Karte aufnehmen? Das aendert `model_card.json` fuer jeden kuenftigen
Lauf. **Empfehlung: ja** — eine falsche Doku ist teurer als keine, und hier steht sie im
Auslieferungsartefakt.

## 14. `torch_data.py:657` — Spender-Pool ohne `neighbour_p > 0`-Schutz

Jeder Val-Datensatz baut und zieht den Spender-Pool ueber hunderttausende Zeilen und liest ihn nie.
`SquareDataset` daneben guardet.

**Der Haken:** der Guard entfernt einen `random.sample`-Aufruf, **verschiebt also die
Zufallsfolge**. Laeufe davor und danach sind nicht mehr bitgleich vergleichbar.
**Die Frage:** Startzeit sparen und die Vergleichbarkeit mit dem Archiv aufgeben, oder liegen
lassen? **Empfehlung: liegen lassen, bis ohnehin ein Schnitt im Rezept ansteht** — dann mit.

## 15. `hand_gate.py:134` — jeder Loader-Worker forkt denselben RNG

Vier Prozesse ziehen dieselbe Helligkeits-/Versatz-Folge. Die Augmentierung ist ein Viertel so
vielfaeltig, wie sie aussieht, und gegen `seed` nicht reproduzierbar.

Derselbe Haken wie 14: der Fix verschiebt die Zufallsfolge. Hier ist der Schaden aber **real und
gemessen gross** (Faktor 4 auf die Vielfalt), nicht nur Startzeit.
**Empfehlung: fixen, und den Hand-Gate-Schueler danach einmal neu destillieren** — die alte
Destillation ist dann nicht mehr die Referenz.

## 16. `capture_plan.py:101` — `p5`/`p95` liest ausser dem Test niemand

`capture plan` nimmt nur `median`. **Die Frage:** die Spannweite in den Auftrag ziehen (sie sagt,
ob das Band je erreicht wurde) oder streichen? Nach der Hausregel "Code ohne Wirkung brauche ich
nicht" ist Streichen die Vorgabe. **Empfehlung: in den Auftrag ziehen** — die Aufnahmen, die in
Punkt 5 anstehen, sind genau die, bei denen "wurde das Band je erreicht" die Frage ist.
