# Entscheidungsvorlage (Stand 2026-09-15, Nacht)

Jeder Punkt ist gemessen oder am Code belegt — es fehlt nicht die Analyse, sondern eine
Richtungsentscheidung. Erledigtes fliegt raus, diese Liste ist kein Archiv.

**Heute gebaut und damit gestrichen:** `MarkerTracker`-Port, Achsen-Fit-Paritaet, die doppelte
Verdeckungsschwelle, die korpusweiten `eval`-Namen, die vier `TrackerService`-Ableitungen, die
drei Ketten-Punkte (`_source`, `settle-scan` als Sprosse, `nextStep` mit Grund), `position-flags`
nennt ungemessene Sessions (alt 3), `recoveryConfig` als Nicht-Fund widerlegt (alt 19), die Kommentar-Ratsche auf 5 (alt 8), der Fixture-Baukasten in
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
| 11–16 | Sechs TODOs, die Verhalten oder Zufallsfolge aendern | s. u. | | s. u. |
| 20 | `read_matte` verwirft die leere Messung (latent, 0 Faelle) | C | 30 min | mit dem Neubau |
| 21 | Fuenf Vertrags-Familien statt 19 Einzelformate | B | je Naht | Naht 1–3 gebaut, 4–5 nach dem Neubau |

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

## 19. `RecoveryFixtures.recoveryConfig` — erledigt, war keiner

Gemessen 2026-09-16: mit `minGridLineCoverage = 0,0` bleibt die ganze `core-engine`-Suite gruen.
Das Gatter feuert auf diesen Fixtures also ohnehin nie, und die 0,5 traegt dort nichts. Damit ist
`recoveryConfig` nicht der Ausreisser, sondern der EINZIGE der vier Rig-Bauer, der den
ausgelieferten Wert behaelt — die anderen drei zwingen ihn auf 0,0. Bleibt wie es ist.

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

## 11. `dataset.py:164` — `occluded` im Maximum: GEBAUT 2026-09-16

`empty_cap` richtet sich nach `max(eff_piece.values())`. Auf einem 14-Klassen-Bau ist `occluded`
die groesste Klasse — die Kappe fuer leere Felder haengt dann an der Verdeckung statt an der
groessten echten Figurenklasse.

Entschieden: jetzt, statt als Falle stehenzulassen. `occluded` ist jetzt auf BEIDEN Seiten der
Kappe heraus. `tests/test_empty_cap_ignores_occluded.py` haelt beides fest — den Fall und den
`pieces13`-Bau, an dem sich nichts aendert.

## 12. `training/data.py:342` — toter `coverage_gate`-Parameter

Kein Aufrufer uebergibt ihn je; `evaluate.run_export` ist der einzige und laesst ihn weg.
`scripts/stage_model_asset.py --gate` ist die Umgehung, die daraus entstand.

**Die Frage:** Parameter streichen und das Staging-Skript als den Weg bestaetigen, oder den
Parameter verdrahten und das Skript zurueckbauen? **Empfehlung: verdrahten** — die Schwelle
gehoert ins Modell, und ein Skript, das nachtraeglich in eine `config.json` schreibt, ist genau
die Stelle, an der der Gate-Guard-Bug schon einmal beinahe alles entwertet hat.

## 13. Modellkarte und Normalisierung: GEBAUT 2026-09-16

Ein Lauf mit `--crop-norm per-crop` rechnet mean/std gar nicht, die Karte behauptet trotzdem die
festen ImageNet-Werte. `train.py` schreibt es in `config.json` richtig; wer die **Karte** liest,
bekommt das Gegenteil des Rezepts.

Entschieden: ja. `build_model_card` uebernimmt den `normalize`-Block WOERTLICH aus `config.json`,
statt ihn neu zu behaupten. Fuer jeden bisherigen Lauf (`mode: fixed`) steht in der Karte
dasselbe wie vorher, nur mit dem `mode` dabei — die Aenderung trifft allein den per-crop-Lauf,
ueber den die Karte log.

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

## 20. `read_matte` verwirft die leere Messung, TypeScript behaelt sie

`labeling.read_matte` filtert mit `if r.get("coverage")` — ein leeres Dict ist falsy, also faellt
eine Zeile "gemessen, nichts verdeckt" heraus und das Frame gilt als ungemattet. `label-stream.ts`
behaelt sie ausdruecklich ("Nullen BLEIBEN"). Gefunden vom gemeinsamen Fixture
`parity/_matte/matte_states.json`, das beide Sprachen gegen dieselben fuenf Zustaende liest.

**Latent, nicht akut:** ueber den ganzen Korpus gezaehlt 9 386 Zeilen mit Werten, **0 leere**,
0 Absagen. Erst ein Lauf, der ein sauberes Brett tatsaechlich misst, macht die Abweichung sichtbar.

**Warum nicht nachts gebaut:** `read_matte` haengt am Trainingsweg — wer die Zeile durchlaesst,
schneidet 64 Zellen mit `coverage 0` mehr in den Datensatz. Das ist eine Rezept-Aenderung, keine
Reparatur. Gepinnt als `xfail(strict=True)` in `tests/test_matte_state_parity.py`.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| C | 30 min plus ein Re-Slice | Python an TypeScript angleichen, aber mit dem naechsten Neubau |

## 21. Fuenf Vertrags-Familien statt 19 Einzelformate

Die Fehlerklasse, die in der Nacht vom 15. auf den 16.09. **zwoelf Mal** auftrat, ist immer
dieselbe: *nicht gemessen* wird als *gemessener Normalwert* gelesen — SAMs Absage als sauberes
Brett, eine fehlende Matte als `coverage 0.0`, ein leeres `settle_dev` als `0` statt `—`.

Die tragende Grenze ist **Platte → Speicher**, nicht Python → TypeScript: die Sprachgrenze
verdoppelt den Fehler, verursacht ihn aber nicht. Beide Seiten lesen JSONL mit `.get(key, default)`
und der Default ist der Normalwert.

Die 19 Formate zerfallen in fuenf Familien: **Messreihen** (`matte.jsonl`, `model-reads.jsonl`,
`interval-check.jsonl`), **Laeufe** (`log.jsonl`, `pass.json`), **Karten** (`config.json`,
`session.yaml`), **Urteile** (`review-notes.jsonl`) und **Packs** (`packed_meta.json`).
Nur die Messreihen tragen die Fehlerklasse — dort ist "fehlt" ein eigener Wert.

**Empfohlene Reihenfolge, eine Naht je Mal:**

1. `matte.jsonl` als `Measurement<Coverage>` mit drei Zustaenden (fehlt / abgesagt / gemessen),
   Leser auf beiden Seiten gegen dasselbe Fixture. **Schritt eins ist gebaut** (Punkt 20).
2. **Gebaut 2026-09-16:** `lib/jsonl.ts` ist der gemeinsame TS-Leser; fuenf Stellen sind
   verhaltensgleich umgestellt (`audit-flags`, `correction-violations`, `frame-hands`,
   `hand-flags`, `model-reads`, `pool`, `position-flags`, `stored`, `unusable-cells`).
   24 Schnitte in 11 Dateien stehen noch aus.
3. **Gebaut 2026-09-16:** `platform/app/jsonl-readers.txt` plus `lib/jsonl-ratchet.test.ts`.
   Gegengeprobt — eine neue Ad-hoc-Lesestelle macht die Suite rot.
4. `ModelServingSpec`: was `train` in `config.json` schreibt und was das Serving daraus rechnen
   muss (CLAHE steht drin, wird aber nicht gebacken).
5. Versionierte Vertraege, Familie fuer Familie — zuletzt, weil es ohne 1–3 nichts haelt.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| B je Naht | 1 (fertig), 2 ≈ 3 h, 3 ≈ 1 h, 4–5 offen | 2 und 3 als naechstes, 4–5 erst nach dem Neubau |
