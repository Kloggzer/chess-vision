# Entscheidungsvorlage (Stand 2026-09-15, abends)

Jeder Punkt ist gemessen oder am Code belegt — es fehlt nicht die Analyse, sondern eine
Richtungsentscheidung. Erledigtes fliegt raus, diese Liste ist kein Archiv.

**Seit der letzten Fassung gebaut und damit hier gestrichen:** der `MarkerTracker`-Port in
`calibration.py` (alt 1), die Achsen-Fit-Paritaet Python/Kotlin (alt 10), die doppelte
Verdeckungsschwelle in der Verify-Leiter (alt 12), die korpusweiten Namen in `eval_*.json`
(alt 13) und die vier `TrackerService`-Ableitungen (alt 7, `ServiceDerivationsTest.kt`).

**Spalte "Kiste":** (A) klein und verhaltensgleich · (B) mittel, braucht neue Tests · (C) aendert
Verhalten oder Format — nie ohne A/B am Regressionssatz.

| # | Punkt | Kiste | Aufwand | Empfehlung |
|---|---|---|---|---|
| 1 | Die Kette prueft Dateien auf Existenz, nicht auf Herkunft | B | ½ Tag | **ja** |
| 2 | `settle-scan` ist eine Pflichtsprosse, die die Kette nicht kennt | B | 2 h | **ja** |
| 3 | `position-flags` nennt ungemessene Sessions nicht | A | 1 h | **ja** |
| 4 | `nextStep` sagt nur *was*, nie *warum* | A/B | 3 h | ja, mit 1–3 zusammen |
| 5 | Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse | — | Aufnahmen | **ja** |
| 6 | `_persistent`-Fix gilt nur kuenftig — Altbestand neu exportieren? | C | ~28 s/Aufnahme | messen, dann entscheiden |
| 7 | Zwei unvollstaendig gescannte Aufnahmen | A | 10 min | nachscannen |
| 8 | Kommentar-Ratsche Kotlin von 8 auf 5 | A | ½ Tag Handarbeit | spaeter |
| 9 | Ein Fixture-Baukasten je Sprache | B | 1½ Tage | ja, aber nicht als naechstes |
| 10 | Namensdrift ueber die Schichten (`cov`, `measured`, `pack`) | B/C | laufend | nur `cov` jetzt |
| 11–16 | Sechs TODOs, die Verhalten oder Zufallsfolge aendern | s. u. | | s. u. |

---

## 1. Die Kette prueft Dateien auf Existenz, nicht auf Herkunft

`chain.ts:139` schliesst die Sprosse `temporal`, sobald
`data/reports/temporal-mattes/<name>/pass.json` **da ist**, und `model-read`, sobald
`model-reads.jsonl` **da ist**. Was in den Dateien steht, sieht die Kette nie.

`model-reads.jsonl` traegt seit heute eine Kopfzeile mit `_model`, `_classes` und `_written_at` —
die Information ist also schon da, sie wird nur nicht gelesen. Ein Reads-Lauf mit einem anderen
Modell, oder einer von **vor** dem letzten Re-Export, haelt die Sprosse genauso geschlossen wie
ein frischer. Dasselbe fuer `pass.json`, das gar keinen Stempel hat.

Das ist derselbe Riss wie bei der driftenden `coverage`: der Zeiger steht, die Grundlage ist
weitergewandert, und **nichts erinnert daran**.

**Der Vorschlag:** beide Dateien tragen `_source` (Session-Mtime des `log.jsonl` plus Modellname),
und `chainState` vergleicht statt zu existieren. Eine veraltete Datei oeffnet die Sprosse wieder,
mit dem Grund im Text.

**Die Frage:** Sprosse wieder aufmachen, oder nur eine Warnung anzeigen? Wieder-Aufmachen ist
ehrlicher und kostet einen Lauf; eine Warnung ist billiger und wird uebersehen.
**Empfehlung: wieder aufmachen** — der einzige Riss dieser Art, den wir bisher gemessen haben
(Coverage-Drift), traf 13 von 24 Aufnahmen.

## 2. `settle-scan` ist eine Pflichtsprosse, die die Kette nicht kennt

CLAUDE.md sagt es als harte Producer-Reihenfolge: *"`session settle-scan` schreibt
`settle_dev`/`settle_seen`; erst dann hat `realgames position-flags` ueberhaupt etwas
auszulegen."*

`nextStep` (`chain.ts:185`) kennt die Sprosse nicht. Die Reihenfolge lautet dort
`label → confirm → export → matte → temporal → model-read → labeln`. Wer `settle-scan` vergisst,
bekommt keine Fehlermeldung, sondern eine **leere Strittig-Lane** — und die sieht aus wie
"alles unstrittig".

**Die Frage:** als echte Sprosse zwischen `export` und `matte` einziehen? Das macht die Kette
einen Schritt laenger fuer jede Aufnahme. **Empfehlung: ja** — genau dafuer ist die Kette da, und
der stille Ausfall ist teurer als der Klick.

## 3. `position-flags` nennt ungemessene Sessions nicht

`position_flags()` (`position_flags.py:102`) gibt `per_session` zurueck — aber nur fuer Sessions
**mit** Flags. Eine Aufnahme ohne `settle_dev` liefert null Flags und ist im Bericht nicht von
einer zu unterscheiden, auf der wirklich nichts strittig war.

Auf ZELL-Ebene setzt das Projekt die Regel schon durch (die Lane schreibt `—` statt `0`). Auf
SESSION-Ebene fehlt sie.

**Der Vorschlag:** `unmeasured: [session_id, …]` in die Rueckgabe und in die Kopfzeile, genau wie
`stale_temporal` daneben schon steht. Eine Stunde, verhaltensgleich fuer alles ausser der Anzeige.
**Empfehlung: ja.**

## 4. `nextStep` sagt nur *was*, nie *warum*

`nextStep` gibt `ChainStep | null`. `null` heisst heute dreierlei: der Mensch hat die Aufnahme als
unbrauchbar markiert, oder sie ist fertig, oder — mit 1–3 oben — eine Sprosse steht offen, deren
Grund niemand sieht. Die Begruendungen stehen ausfuehrlich als Kommentare **im Code**, genau dort,
wo der Nutzer sie nicht liest.

**Der Vorschlag:** `{ step, reason }` statt `step`. Die Kommentare wandern in Textbausteine, die
die Oberflaeche anzeigt.

**Die Frage:** lohnt sich das allein? Eher nicht. Zusammen mit 1–3 schon, denn dann hat die Kette
erstmals Gruende, die sie **nicht** aus der reinen Dateiexistenz ableitet.
**Empfehlung: nur im Paket mit 1–3.**

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

## 9. Ein Fixture-Baukasten je Sprache — oder weiter so?

Dreimal unabhaengig dasselbe Muster gefunden, jedes Mal, weil es keinen gemeinsamen Bauer gibt:
die vier Python-Labeling-Suiten schneiden aus `frames/` statt aus `boards/` (12 von 14
`slice_session`-Dateien nehmen den Fallback-Zweig); `session.test.ts` laesst die vier
`board*`-Schluessel weg, `session.ts:164` wird in seiner eigenen Testdatei **nie** wahr;
`ModelSpecTest` baut ein Modell ohne `coverage_output` und ohne `coverage_gate` — eine Form, die
das APK seit 2026-09-14 nicht mehr ausliefert.

Die Tests sind gruen und beschreiben je den Zustand **vor** einer Entscheidung, die seit Wochen
gilt.

**Die Frage:** ~1½ Tage in `conftest.py` + `lib/test-fixtures.ts` + einen Kotlin-Bauer? Der Gewinn
ist nicht "weniger Zeilen", sondern dass die falsche Form danach **unschreibbar** ist.
**Empfehlung: ja, aber nach 1–5.**

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
- **`pack` ist vier Artefakte** mit je eigener `manifest.jsonl`. Namensfrage, aber eine, die jeder
  Neuleser einmal falsch raet. **Empfehlung: spaeter, und nur mit Umbenennung im Doc.**

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
