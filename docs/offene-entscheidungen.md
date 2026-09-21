# Entscheidungsvorlage (Stand 2026-09-21)

Jeder Punkt ist gemessen oder am Code belegt — es fehlt nicht die Analyse, sondern eine
Richtungsentscheidung. Erledigtes fliegt raus, diese Liste ist kein Archiv.

**In der Nacht auf den 16.09. gestrichen, weil gebaut:** `position-flags` nennt ungemessene
Sessions (alt 3), die Kommentar-Ratsche auf 5 (alt 8), der Fixture-Baukasten in allen drei
Sprachen (alt 9), die Namensdrift `cov`/`measured`/`pack` (alt 10), `occluded` aus dem
`empty_cap`-Maximum (alt 11), die Modellkarte und ihre Normalisierung (alt 13).

**Gestrichen, weil die Empfehlung der Messung nicht standhielt:** `recoveryConfig` war kein
Ausreisser, sondern der einzige produktionstreue Rig-Bauer (alt 19); der tote `coverage_gate`-
Parameter war nicht aus Versehen tot, sondern weil der Export das Gate nicht kennen KANN (alt 12);
`ALPHA_REASON` ist eine Reihenfolge und kein Widerspruch, 21 gegen 117 Frames auf einer einzigen
Aufnahme (alt 17). **Gestrichen, weil laengst gebaut und nur nicht abgehakt:** die Gate-Wache
(alt 18).

**Spalte "Kiste":** (A) klein und verhaltensgleich · (B) mittel, braucht neue Tests · (C) aendert
Verhalten oder Format — nie ohne A/B am Regressionssatz.

| # | Punkt | Kiste | Aufwand | Empfehlung |
|---|---|---|---|---|
| 5 | Der Regressionssatz ist blind fuer die haeufigste Fehlerklasse | — | Aufnahmen | **ja** |
| 6 | `_persistent`: **1 797 zu Unrecht im Vorrat, 3 241 zu bergen** (gemessen) | C | Re-Export | mit dem naechsten Neubau |
| 7 | `2026-08-15-23-01-43`: Export unvollstaendig, Scan ist es nicht | A | — | faellt mit 6 zusammen |
| 14 | Spender-Pool ohne `neighbour_p > 0`-Schutz (verschiebt die Zufallsfolge) | C | 15 min | mit dem Export-Neubau |
| ~~15~~ | RNG je Loader-Worker | — | — | **gebaut 2026-09-16** — Neu-Destillation laeuft |
| ~~16~~ | `p5`/`p95` in den Aufnahme-Auftrag | — | — | **gebaut 2026-09-16** |
| ~~20~~ | Acht Leser pruefen `coverage` truthy | — | — | **gebaut 2026-09-16** |
| 21 | Fuenf Vertrags-Familien statt 19 Einzelformate | B | je Naht | Naht 1–3 gebaut; 4–5 offen, jetzt ohne DB |
| ~~22~~ | Drei Antworten auf die halbe letzte Zeile | — | — | **gebaut 2026-09-16** — ohne Datenbank |
| ~~23~~ | `UtteranceQueue`: der Alarm meldet sich fertig, waehrend er spricht | — | — | **gebaut 2026-09-16** |
| ~~24~~ | `StockfishAnalyzer` zeigt 50 % fuer "nicht bewertet" | — | — | **gebaut 2026-09-16** — leerer Balken, animiert |
| ~~25~~ | `settle_for_ply` nimmt ungemessene Frames in den Median | — | — | **gebaut 2026-09-16** |
| ~~26~~ | `--smooth-iters` dreht die Figur | — | — | **gebaut 2026-09-16** — gezaehlt: 0 von 12 betroffen |
| ~~27~~ | Postgres statt 19 Dateiformate | — | — | **verworfen 2026-09-16** — Messungen bleiben |
| ~~28~~ | Python und TypeScript uneinig: Messung, dann Absage | — | — | **gebaut 2026-09-16** (`5c833c40`) |
| ~~29~~ | `recut_coverage` las das falsche Alpha | — | — | **gefixt** — 68 Zeilen auf der Platte noch falsch |
| **30** | Der Champion halbiert das Verdeckungs-Veto (gemessen) | B | Aufnahmen | **entscheiden** |
| **31** | Das Telefon holt den Champion nicht ab (`CONFIG_SCHEMA_VERSION`) | C | 5 min | **entscheiden** |
| **32** | Die Alarmspalte der Regression zaehlt Entscheidungen, nicht Episoden | A | 20 min | Spalte ergaenzen, nie ersetzen |
| 33 | `labeled-session-pack` koennte aus `row["board"]` schneiden | C | halber Tag | erst mit dem naechsten Export-Neubau; seit `5b8e5e8b` lehnt `LabeledVideoPack` ab statt abzustuerzen |
| 34 | Session-Packs ohne `crop_fingerprint` | A | 10 min | heute folgenlos - mit 33 zusammen |

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

## 6. Der `_persistent`-Fix gilt nur fuer kuenftige Exporte — GEMESSEN 2026-09-16

`framescan._persistent` nahm die Vereinigung statt der Schnittmenge; `classify` erklaerte darauf
den Rest des Intervalls zu `stale`/`changed`, und diese Frames fielen aus dem sauberen Vorrat.
Behoben seit 2026-09-14 — aber was auf der Platte liegt, entstand unter der alten Regel.

**Gemessen ohne einen einzigen Re-Export:** `classify` laeuft offline gegen `scan.jsonl`, also
liessen sich beide Regeln ueber alle 18 Aufnahmen gegeneinander rechnen (`/tmp/probe_persistent.py`,
die alte Regel als `all(off[j] ...)` nachgebaut). **5 083 Frames werden anders eingestuft:**

| Richtung (alt → neu) | Frames | Bedeutung |
|---|---:|---|
| `changed` → `clean` | 2 523 | liegt zu Unrecht ausserhalb des Vorrats |
| `clean` → `changed` | 1 451 | liegt zu Unrecht IM Vorrat |
| `changed` → `occluded` | 516 | zu bergen (behaelt seine FEN) |
| `occluded` → `changed` | 346 | zu Unrecht im Vorrat |
| `stale` → `occluded` / `clean` | 202 | zu bergen |
| `stale` → `changed` | 45 | bleibt schmutzig, nur anders benannt |

**Zusammengefasst: ~3 241 Frames zu bergen, ~1 797 zu Unrecht im Vorrat.** Drei Aufnahmen tragen
die Haelfte: `2026-08-24-22-43-46` (3 005), `VID_20260802_222741` (816), `2026-08-08-00-39-57` (440).

**Vorbehalt:** das ist die EINSTUFUNG, nicht der Datensatz. Was davon wirklich ankommt, entscheidet
`select()` mit `per_position` — die Zahlen sind also eine Obergrenze.

**Was ein Re-Export kostet:** er schreibt `log.jsonl` neu, damit verlieren `model-reads` und
`pass.json` ihren Stempel (`chesslab.provenance`) und die Kette geht fuer JEDE der 18 Aufnahmen
wieder auf. Dazu `occluders recut-coverage`, weil die gespeicherte Coverage gegen die neuen Ecken
driftet. **Gehoert damit an den naechsten Neubau, nicht dazwischen.**

## 7. Eine Aufnahme ist unvollstaendig exportiert — nicht zwei, und nicht ungescannt

Nachgesehen 2026-09-16: `2026-08-30-14-33-02` ist erledigt (35 Zeilen, 31 mit `grid_lines`, 12 mit
`hand_squares`) — die Neu-Ausfuhr in der Nacht hat sie geschlossen. Der Eintrag hier war veraltet.

Bleibt `2026-08-15-23-01-43`, und die Diagnose war falsch: der SCAN ist vollstaendig
(3 867 Zeilen), der EXPORT nicht — 16 Log-Zeilen bei 628 Brettern auf der Platte. Nachscannen
hilft also nicht, es braucht eine Neu-Ausfuhr. Sie ist ausserdem eine der staerker betroffenen
Aufnahmen aus Punkt 6 (166 anders eingestufte Frames). **Faellt mit 6 zusammen.**

# Die sechs TODOs, die Verhalten oder Zufallsfolge aendern

Alle sechs stehen inline im Code als `# TODO:` mit dem Warum. Keiner ist gebaut, weil jeder eine
Entscheidung braucht, die ich nicht treffen kann.

## 14. `torch_data.py:669` — Spender-Pool ohne `neighbour_p > 0`-Schutz

Jeder Val-Datensatz baut und zieht den Spender-Pool ueber hunderttausende Zeilen und liest ihn nie.
`SquareDataset` daneben guardet.

**Der Haken:** der Guard entfernt einen `random.sample`-Aufruf, **verschiebt also die
Zufallsfolge**. Laeufe davor und danach sind nicht mehr bitgleich vergleichbar.
**Die Frage:** Startzeit sparen und die Vergleichbarkeit mit dem Archiv aufgeben, oder liegen
lassen? **Empfehlung: liegen lassen, bis ohnehin ein Schnitt im Rezept ansteht** — dann mit.

## 15. RNG je Loader-Worker — GEBAUT 2026-09-16

Vier Prozesse zogen dieselbe Helligkeits-Folge, die Augmentierung war ein Viertel so vielfaeltig
wie sie aussah. Der RNG entsteht jetzt erst IM Worker, mit dessen Nummer versetzt.

**Neu destilliert 2026-09-16** als `eff-b0-448-v2`. Die alten Karten waren ausserdem auf einem
Lehrer-Satz entstanden, der adoptierte und Temporal-Zeilen enthielt, obwohl die Karte
`teacher: sam3` behauptet; der neue Satz ist kleiner (9 084 statt 10 985) und sauber.

**Die Karten sind NICHT vergleichbar** — der Holdout ist ein anderer: 1 594 Val-Bretter mit nur
315 sauberen gegen 2 641 mit 994. Gemessen auf `rg-2026-08-07-13-52-38`, der EINZIGEN Sitzung,
die alle drei Laeufe zurueckgehalten haben (584 Bretter, 396 mit Hand):

| Lauf | Recall | verpasste Haende | Fehlalarme |
|---|---|---|---|
| `eff-b0-448` | 0,9975 | 1 | 0/188 |
| `mnv4-640` (bisherige Vorgabe) | 0,9899 | 4 | 0/188 |
| **`eff-b0-448-v2`** | **1,0000** | **0** | 0/188 |

### Das Urteil des Menschen zaehlt jetzt mit, und der Holdout laesst sich festnageln

Zwei Funde beim Nachziehen: **22 SAM-Zeilen mit dem Urteil `matte-bad`** — "diese Matte ist
falsch" — lehrten den Schueler trotzdem, weil `gate_rows` das Urteilsbuch nie ansah. Und von den
214 adoptierten Temporal-Zeilen sind nur **43 ausdruecklich freigegeben**; 16 sind ABGELEHNT und
60 ungeprueft. Pauschal aufzunehmen haette die sechzehn mitgebracht. Lehrer-Satz 9 084 -> 9 105.

Ausserdem der Grund, warum keine zwei Karten je vergleichbar waren: `holdout_sessions` nimmt jede
n-te Sitzung aus der sortierten Liste, der Pruefsatz WANDERT also mit dem Korpus.
`--holdout-session` nennt ihn jetzt beim Namen.

### Der erste saubere A/B (gleicher Holdout, 1 597 Bretter, 315 sauber)

| Lauf | Recall | verpasste Haende | Fehlalarme | ms/Brett |
|---|---|---|---|---|
| `eff-b0-448-v2` | 0,9969 | 4 | 14 (4,4 %) | 4,28 |
| **`mnv3s-448-v3`** | **0,9984** | **2** | **13 (4,1 %)** | **0,85** |

Das KLEINERE Modell ist nicht schlechter und fuenfmal schneller — `DEFAULT_GATE` steht darauf.
Die Einzelzahlen nicht ueberziehen: 2 gegen 4 und 13 gegen 14 auf 315 sauberen Brettern sind
kleine Unterschiede. Belastbar ist "nicht schlechter", nicht "besser".

**Nebenbei gefunden:** der Vorgabe-Backbone des Befehls (`mobilenet_v3_small`) ist gar kein
timm-Name — jeder Lauf ohne `--backbone` starb, und die Wache meldete irrefuehrend "keine
vortrainierten Gewichte" statt "gibt es nicht".

## 16. `p5`/`p95` im Aufnahme-Auftrag — GEBAUT 2026-09-16

Der Median sagt, wo ein Feld ueblicherweise sitzt; er sagt NICHT, ob es das Band je erreicht hat.
`a8` mass ueber den Korpus 6 bis 207 — seine Bandlage haengt an der Lampe. Ein Vorschlag, der
unter dem heutigen Licht nie eintritt, kostet eine ganze Aufnahme.

Jede `Placement` traegt jetzt `seen_lo`/`seen_hi` (die p5/p95 DIESES Feldes), und die Wahl
bevorzugt Felder, deren Spannweite das Band wirklich erreicht. Bleibt keines uebrig, entscheidet
wieder der Median allein — ein Vorschlag ist besser als keiner.

`docs/capture-plan.schema.json` und `platform/app/lib/capture-plan.ts` ziehen mit; die beiden
neuen Faelle stehen als Test (`test_capture_plan.py`).

## 20. `read_matte` verwarf die leere Messung — GEBAUT, Vorlage war veraltet

`labeling.read_matte` filtert mit `if r.get("coverage")` — ein leeres Dict ist falsy, also faellt
eine Zeile "gemessen, nichts verdeckt" heraus und das Frame gilt als ungemattet. `label-stream.ts`
behaelt sie ausdruecklich ("Nullen BLEIBEN"). Gefunden vom gemeinsamen Fixture
`parity/_matte/matte_states.json`, das beide Sprachen gegen dieselben fuenf Zustaende liest.

**Latent, nicht akut:** ueber den ganzen Korpus gezaehlt 9 386 Zeilen mit Werten, **0 leere**,
0 Absagen. Erst ein Lauf, der ein sauberes Brett tatsaechlich misst, macht die Abweichung sichtbar.

**Es ist nicht EINE Stelle, sondern acht.** Gezaehlt 2026-09-16 ueber `src/` und `scripts/`:
fuenf Dateien pruefen `coverage` truthy, drei andere richtig auf `None` — die CLAUDE.md-Regel wird
zur Haelfte befolgt. Die drei Mess-Skripte (`occlusion_gate`, `coverage_errors`,
`audit_disk_damage`) sind sofort umgestellt: sie erzeugen Zahlen und gehoeren in keinem Fall auf
eine halbe Wahrheit. **`occlusion_gate` ist die heikelste** — aus ihm stammt jede ausgelieferte
`coverage_gate`, und truthy haette die Schwelle nur auf Frames abgeleitet, auf denen SAM etwas
fand.

Die uebrigen fuenf (`labeling` 1, `matte` 2, `temporal_matte` 3) liegen im Pipeline-Weg und
brauchen diese Entscheidung. `tests/test_matte_coverage_rule.py` haelt die Liste fest und laesst
sie nur schrumpfen.

**GEBAUT (`5c833c40`)**, nachgesehen 2026-09-21: alle acht Leser sind umgestellt,
`tests/test_matte_coverage_rule.py` traegt `BUDGET: dict[str, int] = {}`, und der
`xfail(strict=True)` in `tests/test_matte_state_parity.py` ist weg. Der Absatz darunter stand
noch auf dem Stand davor.

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
   Schnitte stehen noch aus — 2026-09-21 nachgezaehlt **11 in 7 Dateien** (alt: 24 in 11).
3. **Gebaut 2026-09-16:** `platform/app/jsonl-readers.txt` plus `lib/jsonl-ratchet.test.ts`.
   Gegengeprobt — eine neue Ad-hoc-Lesestelle macht die Suite rot.
4. `ModelServingSpec`: was `train` in `config.json` schreibt und was das Serving daraus rechnen
   muss (CLAHE steht drin, wird aber nicht gebacken).
5. Versionierte Vertraege, Familie fuer Familie — zuletzt, weil es ohne 1–3 nichts haelt.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| B je Naht | 1 (fertig), 2 ≈ 3 h, 3 ≈ 1 h, 4–5 offen | 2 und 3 als naechstes, 4–5 erst nach dem Neubau |

## 22. Drei Antworten auf die halbe letzte Zeile — GEBAUT 2026-09-16, ohne Datenbank

`realgames.py:1537` oeffnet `log.jsonl` mit `"w"` und stroemt hinein — die halbe letzte Zeile gibt
es wirklich. `stored.ts` und `pool.ts` uebersprangen sie, `loadSession` WARF: eine Labeln-Seite,
waehrend ein Export laeuft, kostete damit einen Fehler statt einer Seite.

**Die Regel, die vorher niemand ausgesprochen hatte: der ZEILENUMBRUCH entscheidet.** Wer mitten
in einer Zeile steht, hat ihn noch nicht geschrieben. Eine kaputte Zeile, die auf einen Umbruch
endet, ist damit kein laufender Schreiber, sondern Beschaedigung. `readJsonl` gibt beides getrennt
zurueck (`tail`, `corrupt`), und `loadSession` toleriert das eine und meldet das andere.

**Diese Schaerfung stammt nicht von mir, sondern von einem bestehenden Test.** Mein erster Entwurf
nahm "letzte nicht-leere Zeile" und haette damit eine wirklich kaputte Datei als laufenden
Schreiber durchgewunken — `route-audit-bugs.test.ts` verlangt fuer genau diesen Fall einen Fehler
und ist umgefallen.

**Das war der Punkt, der zur Datenbank-Frage gefuehrt hat** ("die Anwendung streitet sich"). Er
brauchte keine.

**NACHGEZOGEN 2026-09-16: eine Treuhand, durch die alles laeuft.** Die Regel allein reicht nicht,
solange jede Stelle sie selbst beantwortet. `src/chesslab/ioutil.py` und `platform/app/lib/atomic.ts`
sind jetzt die beiden Tueren; `tests/json_doors.txt` (19 Zeilen, 24 Stellen) und `platform/app/write-doors.txt`
(3) zaehlen, was noch daneben schreibt, und duerfen nur schrumpfen.

Dabei fiel ein Fehler auf, den die Regel nicht abdeckte: rohes `appendFile` an eine `.jsonl` mit
halber letzter Zeile KLEBT die neue daran. Aus dem tolerierten Schwanz wird damit Beschaedigung
mittendrin — genau das, worauf `loadSession` seit Punkt 22 wirft, nur jetzt dauerhaft. Fuenf
Stellen der Web-App taten das (`lib/append-tail.test.ts`), die Python-Seite hatte sie schon.

## 23. `UtteranceQueue` — GEBAUT 2026-09-16, und das Geraet war doch nicht noetig

`flush()` setzte `inFlight = 1` fuer den Alarm, und die Meldung des gerade unterbrochenen
Spruchs (`onStop` ruft `onDone`) zaehlte sie wieder herunter: `queue.idle` meldete `true`,
waehrend der Alarm noch spricht, und `SpeechEngine.emit` gab den Audiofokus mitten in der einen
Ansage zurueck, die der Latch garantieren soll.

**Warum die Geraetemessung entfiel:** ich hatte sie verlangt, um die REIHENFOLGE zu klaeren —
kommt die alte Meldung vor oder nach `inFlight = 1`? Eine Generation je Spruch ist unter BEIDEN
Reihenfolgen richtig, also beantwortet der Fix die Frage, statt sie zu stellen. Beide Ausgaenge
stehen als Test, und das ist strenger als eine Messung auf einem Geraet.

**Und die zweite Annahme war auch falsch:** ich hatte geschrieben, der Fix drehe die Zusage von
`UtteranceQueueTest.flushDropsTheBacklogAndInterrupts` um. Tut er nicht — der Test behaelt seine
Bedeutung, er benennt jetzt nur, WELCHER Spruch fertig meldet.

## 25. Leere Coverage im Median — GEBAUT (Commit 0929769b), Vorlage war veraltet

Ein `dirty`-Frame, dessen Matte-Zeile SAMs Absage ist (oder das nie gemattet wurde), passiert
`SETTLE_CLEAR_MAX` als `0,0` und zaehlt in den Median, der die gesetzte Stellung definiert —
genau das, wogegen die Konstante existiert ("eine Hand darin legt die Hand in den Median").

**Gezaehlt 2026-09-16 (25 Aufnahmen, 804 Plys):** der strengere Median schliesst **138 Frames**
aus, und **14 von 804 Plys (1,7 %)** fallen dadurch unter `SETTLE_MIN_FRAMES`. Ein Ply darunter
liefert `{}` — die Lane zeigt dann "—" statt einer Zahl.

Damit steht der Tausch fest: 14 Plys verlieren ihre Zahl, 790 bekommen einen Median, in dem
keine ungemessene Hand mehr stecken kann. Und die 14 sind genau die, deren Beleg duenn war.
Das ist die Regel, die das Projekt fuer ZELLEN schon durchsetzt ("ohne Messung ist eine Zelle
nicht unstrittig, sie ist ungemessen"), nur eine Ebene hoeher.

**Trotzdem nicht nachts gebaut:** es aendert die Strittig-Lane, in der der Mensch morgen
arbeitet. Wer sie geaendert vorfindet, soll wissen warum. `xfail(strict)` in
`tests/test_bug_hunt_20260916d.py`.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| C | 1 h, Messung liegt vor | **ja** — 14 von 804 Plys sind der Preis, und sie sagen dann ehrlich "ungemessen" |

## 26. `--smooth-iters` dreht die Figur — GEBAUT 2026-09-16, gezaehlt und folgenlos

`_import_smoothed` lief ueber `_load_and_extract` -> `_ensure_z_up` und drehte die Figur um
-90 Grad um X, sobald Y die dominante Achse ist. Der verbatim-Zweig daneben dreht nicht, und
`prepare_scan` verspricht im Docstring ausdruecklich "no uprighting" — die AUSRICHTUNG einer
Figur hing damit an einem Glaettungsschalter.

**"Erst zaehlen" stand als Empfehlung; gezaehlt, rein lesend ueber die `*_report.json`:
null von zwoelf Meshes sind mit `--smooth-iters` entstanden, alle zwoelf verbatim.** Kein
`synth_pieces/`-Mesh angefasst. Die Zahl traegt, weil der geglaettete Zweig und der
`smooth_iters`-Schluessel im Bericht aus DEMSELBEN Commit stammen (`1371cfd7`) — es gibt kein
Fenster, in dem eine geglaettete Figur wie verbatim aussaehe.

Damit ist der Fix folgenlos fuer alles, was auf der Platte liegt: `_load_and_extract` nimmt jetzt
`upright=`, und der verbatim-Weg laesst die Drehung aus. Gegenprobe haelt.

## 27. Postgres — VERWORFEN 2026-09-16 (Nutzer), nachdem der Preis sichtbar war

Am Vormittag entschieden, am Nachmittag verworfen: *"ich habe da nun laenger drueber nachgedacht,
das funktioniert so echt schon gut mit den jsons, lass uns einfach die Fehler beheben."*

**Die Entscheidung ist gut belegt, und der Weg dorthin war nicht umsonst.** Was wir dabei
gemessen haben, gilt unabhaengig von der Datenbank:

- **Das Schema traegt den echten Bestand.** 25 Aufnahmen, 11 647 Frames, 9 423 Matte-Zeilen,
  null Abweisungen — **alle drei 2026-09-17 nachgezaehlt und unveraendert** (Aufnahmen mit
  `matte.jsonl`: 25 von 48 Verzeichnissen; Frames = Zeilen aller `log.jsonl`; Matte-Zeilen =
  nicht-leere Zeilen aller `matte.jsonl`), obwohl 16 der Dateien am 2026-09-15/16 neu geschnitten
  wurden. Keine Zeile traegt `skipped`, keine `coverage: null` — die Absagen-Falle bleibt latent — die drei Zustaende (fehlt / abgesagt / gemessen) lassen sich sauber
  ausdruecken.
- **1 657 der 9 423 Matte-Zeilen (17,6 %) sind ueberholt** (Stand 2026-09-16);
  **nachgemessen 2026-09-17 sind es 1 871 (19,9 %)** — je Aufnahme nach `frame` entdoppelt,
  7 552 Frames bleiben. Das Neuschneiden hat die Gesamtzahl nicht bewegt, aber mehr Dubletten
  hinterlassen. `matte.jsonl` ist ein Anhaenge-Log
  mit *last wins*; fast ein Fuenftel ist totes Gewicht. Das bleibt wahr.
- **Python und TypeScript sind sich uneinig, was der Zustand eines Frames ist**, wenn auf eine
  Messung eine Absage folgt: `read_matte` filtert `coverage is None` VOR dem Last-wins und behaelt
  die alte Messung, `lib/matte.ts` laesst die Absage gewinnen. Heute latent (null Absagen im
  Korpus), aber ein echter Widerspruch — siehe Punkt 28.
- **`recut_coverage` liest moeglicherweise das falsche Alpha**: es filtert nicht nach `source` und
  nimmt fuer jede Zeile `mattes/<stem>.webp`, waehrend SAMs Original nach einem Upsert unter
  `.sam.webp` liegt. Moeglicher bestehender Datenfehler — siehe Punkt 29.

**Warum es der Preis nicht wert war**, beziffert: neben den neun Schreibern und rund 38 Lesern
haetten **41 Testdateien** (25 Python, 16 vitest) umgebaut werden muessen, die heute
`matte.jsonl` als Vorgabe schreiben. Dazu kam Sols Review mit neun Befunden der Klasse "reisst
Daten auseinander", die alle aus einer Stelle folgten: Datei und Alpha-Bilder liegen ausserhalb
jeder Transaktion.

**Was liegen bleibt, geparkt statt geloescht:** `compose.yaml`, `db/schema/`,
`tests/test_db_contract.py` (springt ohne Container ab, kostet also nichts) und
`docs/spec-pg-matte.md`. Wer die Frage neu stellt, findet die Vorarbeit und die Messungen — und
diesen Absatz, damit sie nicht zum dritten Mal gestellt wird.

`data/pgdata` (47 MB, leeres Cluster) kann weg, sobald jemand es sagt.

## 28. Messung, dann Absage — GEBAUT 2026-09-16, die juengere Zeile gewinnt

`labeling.read_matte` baute sein Dict aus den Zeilen MIT Coverage — eine spaetere Absage fiel
schon im Filter heraus und liess die alte Messung stehen. `lib/matte.ts` setzte jede Zeile in die
Map, dort gewann die Absage. Fuer ein Frame, das gemessen und danach abgelehnt wurde, sah das
Training also die alte Zahl und die Lane die Absage.

**Entschieden (Nutzer, 2026-09-16): die JUENGERE Zeile gilt, auf beiden Seiten.** Sie sagt "nicht
mehr messbar", und das ist die neuere Information.

Die Regel steht jetzt im gemeinsamen Fixture `parity/_matte/matte_states.json` als fuenfter
Zustand, und beide Sprachen lesen dieselbe Datei. Python war rot, TypeScript gruen — nur Python
musste nachziehen.

**Zweite Haelfte, beim Bauen gefunden:** `lib/matte.ts` schrieb `coverage: row.coverage ?? {}` —
aus SAMs Absage wurde damit "gemessen, nichts verdeckt", genau die Fehlerklasse aus Punkt 21, in
der Lesestelle selbst. `coverage` ist jetzt OPTIONAL: fehlt es, wurde nichts gemessen. Der TS-Test
prueft ausserdem gegen die ECHTE `loadMatte` statt gegen eine Kopie ihrer Regeln.

**Wirkung heute: null** — 0 Absagen im Korpus. Die Regel greift beim naechsten SAM-Lauf.

## 30. Der Champion halbiert das Verdeckungs-Veto (2026-09-21, gemessen)

Der urspruengliche Eintrag fragte nach `gate:occluded = 0` im Fuzzer. **Das war ein Fehler im
Treiber**, nicht im Produkt: die synthetische Hand lag als starrer Block ab `a1`, waehrend die
Zuege anderswo stattfanden. Seit sie ueber den Zugfeldern wandert und die Bewegung mit dem echten
`RoiMotion` gemessen wird, steht `gate:occluded` bei 115.

Die Kopplung dahinter ist trotzdem real und jetzt beziffert. `FrameLoop` leitet die
Baseline-Verdeckungsschwelle als `motionPxThr * BASELINE_ABS_THR_FACTOR` (4,0) ab. Gemessen mit
`desktop fuzz check` auf denselben Szenen, nur dieser Knopf veraendert:

| `motionPxThr` | Schwelle | `veto:occlusion` | `veto:shadow` |
|---|---:|---:|---:|
| 20,0 (vor dem Champion) | 80 | **593** | 614 |
| 34,544 (Champion) | 138 | **345** | 582 |
| 41,5 (bester Kandidat der Budget-Suche) | 166 | 345 | 539 |

**Das Verdeckungs-Veto feuert unter dem Champion 42 % seltener** — so der Fuzzer. Auf ECHTEM
Material ist es mehr: ueber vier Regressionsaufnahmen faellt `occlVetoed` von 4 547 auf 1 423,
also **68,7 % weniger Frames** (`ff09040a`). Oberhalb von 34,5 kostet es nichts mehr — der Census
saettigt, wer die Reserve zurueckholen will, muss DARUNTER.

Der Regressionssatz zeigt davon nichts (396/3/0, Desync-Episoden 15 -> 8). **Das ist aber kein
Freispruch:** mit BEIDEN engine-eigenen Verdeckungsarmen AUS kommt derselbe Satz Ziffer fuer
Ziffer gleich heraus (`c7f3756b`, `docs/baseline-occlusion-off.md`). Er kann diese Achse also gar
nicht beurteilen. Es ist eine schmaler gewordene Reserve, kein gemessener Schaden — und kein
gemessenes Wohlbefinden.

**Zu entscheiden:** ob das reicht. Solange die Frage offen ist, sollte kein weiterer Kandidat
`motionPxThr` nach oben schieben; der beste der Budget-Suche brachte 21 Frames und wuerde die
Schwelle auf 166 heben.

### Das Material fuer die fehlende Messung liegt schon da

Die beiden Partien vom 2026-09-19 sind ungewoehnlich handreich — gezaehlt aus ihren
`matte.jsonl` (alle Zeilen gemessen, keine `skipped`):

| Aufnahme | Zeilen | mit Verdeckung > 0,15 |
|---|---:|---:|
| `2026-09-19-15-50-28` | 593 | **516** |
| `2026-09-19-16-26-22` | 395 | **359** |

875 von 988 Frames, also 89 %. Der Regressionssatz liegt bei 0,2 % (24 verdeckte Frames auf
11 001). Genau der Satz, der die Schutz-Achse messen koennte.

**Der Haken:** beide sind Handy-Sessions mit `frames/` und `boards/`, ohne `video.mp4`. Das Verb
`desktop replay` braucht ein Video — die Messung geht also nur ueber den Stored-Session-Weg, oder
die Aufnahmen brauchen ihr Quellvideo. Seit 2026-09-21 traegt der Replay-Trace `occlVetoed`,
`shadowVetoed` und `changed`, die Zaehlung selbst ist damit fahrbar.

Und es haengt an einer Entscheidung des Nutzers, die schon offen ist: ob die beiden nach
`test-v2` gehen oder ins Trainingsmaterial. In einen Messsatz duerfen sie erst danach.

## 29. `recut_coverage` las das falsche Alpha — GEMESSEN und GEFIXT 2026-09-16

`upsert_proposals` schiebt SAMs Datei nach `mattes/<stem>.sam.webp` und schreibt das Alpha des
Drei-Bilder-Sensors unter `<stem>.webp`. `recut_coverage` nahm fuer JEDE Zeile `<stem>.webp` und
gab SAMs Zeile damit die Zahlen des Sensors — unter SAMs Namen.

**Gemessen, nicht vermutet:** 20 von 25 Aufnahmen tragen `.sam.webp`-Sicherungen, 139 SAM-Zeilen
waren gefaehrdet, und bei **68** ist es passiert: ihre gespeicherte Coverage laesst sich exakt
(Abstand 0,0000) aus dem Temporal-Alpha nachrechnen, nicht aus SAMs. Die uebrigen 71 sind sauber.

Besonders unangenehm, weil diese 68 wie SAMs eigenes Urteil aussehen und damit den Hand-Gate-
Schueler mitlehren — genau das, was am selben Tag fuer `source: upsert` repariert wurde.

**Gefixt:** `matte.alpha_for(session_dir, row)` waehlt das Alpha, das zur Zeile gehoert.

`close_seams` trug dieselbe Form und ist mitgezogen. Meine Zurueckhaltung dort war zu gross: dass
die geschlossene Naht in der Ruecksicherung landet, ist RICHTIG — `upsert_proposals` spielt
`.sam.webp` beim naechsten Lauf als SAMs Alpha zurueck, und eine geschlossene Naht ist dort eine
Verbesserung, kein Schaden.

**REPARIERT 2026-09-16 (Nutzer: "Okay go").** `occluders recut-coverage` ueber die 15
Aufnahmen, deren Zeilen die Zahlen des Sensors trugen. Vorher gesichert nach
`data/_parked/matte-backup-20260916-202553/` (15 Dateien, 6,4 MB).

**Nachgemessen statt angenommen:** alle **139 gefaehrdeten Zeilen** tragen jetzt die Zahl IHRES
eigenen Alphas, 0 Abweichungen. Die 139 sind dieselbe Zahl wie bei der Erstmessung; meine
Reparatur-Sonde meldete zwischendurch 235 und danach 12 Reste — beides Fehltreffer: sie zaehlte
`alpha: fixed`, doppelte Zeilen derselben Frames, und Zeilen, bei denen BEIDE Alphas dieselbe
Zahl liefern (Coverage 0) und die deshalb gar nicht unterscheidbar sind.

**Der Lauf tat mehr als die 139:** 471 Zeilen wurden insgesamt neu geschnitten und **395 Zellen
wechselten die Seite von `PIECE_VISIBLE_MAX`** — das ist die dokumentierte Geometrie-Drift
(`docs/coverage-weight-2026-09-16.md`), die nach jedem Re-Export faellig ist.

**Damit offen:** gebaute Datensaetze tragen `coverage` in ihrem eigenen Manifest. Jeder Satz, der
diese 15 Aufnahmen enthaelt und vor heute gebaut wurde, fuehrt weiter die alten Zahlen — die 395
gewechselten Zellen wirken erst nach einem Neubau.

---

## Die Leser-Ratsche sah nur die halbe Form (2026-09-17)

`tests/jsonl_readers.txt` bewachte `splitlines()`. **`for line in fh:` ist derselbe
Zeilenschnitt**, nur unsichtbar fuer eine Textsuche — **16 Stellen** liefen unentdeckt vorbei,
und darunter waren **drei handkopierte Nachbauten von `read_jsonl`** samt Schwanz-Politik
(`capture_import._timeline_rows`, `train_watchdog._epochs`, `phone_candidate_offset.rows_of`).
Keiner trug `utf-8-sig` oder `newline=""`: ein BOM toetete sie, und ein zwischen CR und LF
abgerissener Schwanz sah im Universal-Modus ganz aus.

Die Ratsche sucht jetzt ueber den **Syntaxbaum**, sonst faellt `json.loads(p.read_text())` in
einer Glob-Schleife als Fehltreffer hinein.

**Zehn der Stellen stroemten mit Grund** — sie zaehlen ueber 465k-Zeilen-Manifeste oder brauchen
nur die erste Zeile und wollten keine Liste bezahlen. Dafuer gibt es `ioutil.iter_jsonl`:
dieselbe Politik, ohne die Liste. **Uebrig bleiben zwei**: `scripts/board_grid_probe.py`
(Nutzer-Verbot) und `labeling.py`, das die ROHEN Zeilen weiterschreibt, die es liest.

### Was die Ratsche daraus lernt

Eine Ratsche, die auf eine SCHREIBWEISE zeigt statt auf die FORM, waechst nicht mit dem Code.
Die Web-App trug denselben Zwilling und dieselbe Luecke. **Nachgemessen: eine Stelle** —
`lib/corpus.ts` stroemt ueber ein 57-MB-Manifest und verschwieg eine kaputte Zeile MITTENDRIN
still; der Index zaehlte dann zu wenig, und nichts sagte es. `tallyLines` traegt seit heute die
Schwanz-Politik. Der Sucher liest die Schleife im BLOCK statt datei-weit, sonst waren
`for (const line of jsonlRows(...))` und `read.rows` zwei Fehltreffer.

## Drei Tests, die ihren eigenen Fund nicht mehr fingen (2026-09-17)

Alle drei durch Mutation belegt: sie blieben gruen, waehrend der Fehler zurueckkam.

- **Handy-Karte**: die Quelltext-Ratsche suchte `head.note` als Zeichenkette und uebersah, dass
  genau die zwei Felder fehlen koennen, nach denen der Nutzer gefragt hatte. Sie prueft jetzt den
  JSX-Ausdruck je Feld.
- **SWA-Vergleich**: der Test hielt den HELFER, der Fehler sass am AUFRUFORT.
- **Spender-Pack-Pin**: eine Tautologie — sein Fixture liess Zeile und Pack dasselbe sagen, also
  passierte er beide Codepfade. Auf der Platte widersprechen sie sich.

## Zwei gemeldete Zahlen, die nie gemessen wurden (2026-09-17)

`run_ingest` nannte `skipped` in seiner Fehlermeldung als Tatsache; der Adapter `continue`te
still, die Zahl war beweisbar 0. Und `after_dedup` stand NACH dem pieces13-Collapse, war also
per Konstruktion `final` — Dedup-Wirkung und Collapse als eine Groesse unter zwei Namen.

Beides Berichts-, keine Rezeptfragen, deshalb gebaut statt gepinnt. **Neun `xfail(strict)`
bleiben**, jedes mit derselben Begruendung: der Fix aendert Verhalten, und das ist eine
Entscheidung des Menschen.

## Ein vertauschter AUFBAU haengt am Feld, der Schutz der Lane an der Zelle (2026-09-17)

`VID_20260802_222203` traegt Laeufer und Springer auf **b8/c8** vertauscht,
`2026-08-08-11-59-12` dasselbe auf **f1/g1**. Beide seit dem 2026-08-19 korrigiert — und trotzdem
schrieb die Lane auf ANDEREN Frames derselben Felder **65-mal das FEN-Wort**. Der Schutz vor der
Vorbelegung greift je ZELLE ("eine schon beurteilte Zelle schreibt NICHTS"), der Tausch haengt
aber am FELD.

**Gemessen, nicht geraten.** Das Modell ist der unabhaengige Zeuge: c8 liest **45/45 `bN`**,
g1 **97:7 `wB`**. Ein Scan ueber alle 48 Aufnahmen mit demselben Kriterium — systematischer
Widerspruch auf SICHTBAREN Zellen, und **gegenseitig** — findet **genau ein** Paar, b8/c8.
Ohne die Gegenseitigkeit meldet die Sonde jede verdeckte Ecke: drei Zwillinge
(`2026-08-07-13-52-38` b8, `VID_20260802_222741` c8, `2026-08-08-00-39-57` d5/f5) sahen aus wie
ein Tausch und waren keiner — das Partnerfeld las jeweils dasselbe wie das FEN.

**Repariert (Nutzer: "Wache + die 240 direkt korrigieren"):** 239 Korrekturen geschrieben,
vorher gesichert nach `data/_parked/setup-swap-backup-20260917-125427/`. Danach standen 454 der
468 Zellen richtig; 14 trugen eine AELTERE, widersprechende Korrektur und blieben unangetastet.

**Die Wache:** `lib/setup-swap.ts` nennt die Felder, die eine Aufnahme durchgehend anders fuehrt
(>= 4 Zeilen, >= 80 % einig, `empty` zaehlt nicht — eine Hand raeumt ein Feld, sie tauscht es
nicht). `⏎` belegt eine solche Zelle nicht mehr vor und sagt im Knopf, wie viele stehen bleiben.
Live gemessen: auf der ERSTEN Seite 11 von 50.

### Was offen bleibt

Zwei einseitige Auffaelligkeiten, gemeldet und nicht beurteilt: `VID_20260726_233432` **e8** —
FEN sagt schwarzer Koenig, das Modell liest in **232 von 234** sichtbaren Frames einen Turm; und
`2026-08-08-11-59-12` **g7** — FEN `bB`, das Modell zu **98 %** `bP` ueber 765 Lesungen. Beides
kann ein Label-Fehler oder eine Modell-Schwaeche sein; die Liste der einseitigen Faelle war von
`wR` auf acht verschiedenen Feldern dominiert, was eher nach Modell aussieht als nach Aufbau.

**Kein Aufbau-Check vor Zug 1.** Das bleibt der geparkte Plan — heute ist nur die Wache gebaut,
die den Schaden nach dem Fund nicht mehr wachsen laesst.

## Der Auditor beurteilte sein eigenes Trainingsmaterial (2026-09-17)

Die Auffaelligkeit `VID_20260726_233432` **e8** — FEN sagt schwarzer Koenig, das Modell las in
**232 von 234** sichtbaren Frames einen Turm — war **keine**. Derselbe Frame, gelesen von
`_fold2128v7/p4a-s42`, das diese Aufnahme nie gesehen hat: **`bK` 232/234**. Der Fehler lag am
LESER, nicht am Label.

Die kanonischen `model-reads.jsonl` stammen von `_folds/mnv3s128-f0` — andere Architektur,
v4-Zeit, und fuer die meisten Aufnahmen ein Modell, das auf ihnen TRAINIERT hat. Ein Modell, das
seine eigenen Trainingslabels bestaetigt, ist kein Zeuge; eines, das sie verfehlt, ist auch
keiner. **Jede Zahl in diesem Dokument, die auf `model-reads.jsonl` beruht, steht unter diesem
Vorbehalt** — auch die Bestaetigung der beiden Aufbau-Tausche (die aber zusaetzlich durch 215
menschliche Korrekturen getragen wird).

**`realgames model-read` verweigert von sich aus ein Modell, das die Aufnahme trainiert hat.**
Der Weg war also immer da, er wurde nur nicht gegangen.

**22 der 48 Aufnahmen** waren bei mindestens einem der vier v7-Folds draussen
(`_fold0..3128v7/p4a-s42`, Split-Kopie in der jeweiligen `config.json`). Fuer die ist ein
ehrlicher Audit moeglich; fuer die uebrigen 26 nicht, solange kein Fold sie auslaesst.

## Die Brett-Vorschau zeigte den Vorfilter und nannte ihn die Hand (2026-09-17)

Nutzer: "die belegten Kaestchen stimmen bei weitem nicht mit der echten Hand ueberein ... sind
die Matten korrekt und die Anzeige kaputt?" — **Beides nicht.** Gemessen auf
`2026-08-08-11-59-12`, 435 gemeinsame Frames:

| | |
|---|---|
| Von allen gelben Zellen liegen auf einer Matte-Hand | **99,6 %** |
| Von allen Matte-Hand-Zellen sind gelb | **53,8 %** |
| Frames, in denen das Gelb ueberwiegend danebenliegt | **0 von 435** |

Die Anzeige war nicht verschoben, sondern **halb blind**: `BoardPeek` zeichnete
`frame-hands.jsonl`, also den RILLEN-Sensor (Precision 99,6 %, Recall 71 %), waehrend die
gemessene Matte danebenlag und nur als Filter benutzt wurde. Ihr eigener Kommentar nannte den
Vorfilter "die Hand, sichtbar".

**Am Einzelfall belegt** (Frame `001413`): die Matte nennt 20 Felder — `b1`–`d6` plus `a4`/`a5`,
ein Finger, der weit ins Brett reicht. Der Rillen-Sensor nannte davon **9**, den 3×3-Kern. Genau
dieser Block sah aus wie "passt nicht zur Hand".

**Gefixt, in zwei Schritten.** Zuerst die richtige QUELLE (Matte statt Vorfilter), dann auf
Ansage des Nutzers die richtige FORM: die Vorschau zeigt jetzt das **Alpha selbst**
(`/api/matte/<name>/<stem>`, dieselbe Darstellung wie die Matte-Lane) statt Kaesten je Feld — ein
Finger sah als Block aus wie etwas, das er nicht ist. **Der Rillen-Sensor ist ganz raus**: kein
Rueckfall, denn ein grober Vorfilter, der wie eine Messung aussieht, ist schlimmer als eine
Leerstelle. Ein Frame ohne Matte sagt darum `keine Matte — ungemessen` in Rot, statt ein sauberes
Brett zu zeigen (CLAUDE.md, "Coverage Matte Trap").

**Ein Nebenbefund von mir war FALSCH und ist zurueckgezogen (2026-09-17).** Ich meldete "18 von
1204 Frames tragen eine `coverage`, die nicht zum eigenen Alpha passt". Meine Sonde verglich sie
gegen `alpha_for` — und das liefert **nie** die Handfassung, sondern `.sam.webp` oder
`<stem>.webp`. Eine handgemalte Zeile MUSS davon abweichen. Richtig gemessen (Handfassungen
ausgenommen): **1164 Zeilen geprueft, 0 Abweichungen**.

## Ein einzelner Zeuge irrt sich in 6 von 10 Faellen (2026-09-17)

Der gehaltene Audit ueber **22 Aufnahmen** (`scripts/heldout_label_audit.py`, je ein v7-Fold, der
die Aufnahme nie gesehen hat) meldet **32 systematische Widersprueche**. Sieben Aufnahmen waren
bei ZWEI Folds draussen — dort laesst sich der Befund gegenpruefen, und das Ergebnis ist die
wichtigste Zahl des Tages:

| | |
|---|---|
| Kandidaten auf diesen sieben Aufnahmen | **10** |
| Vom zweiten Fold BESTAETIGT | **4** |
| Vom zweiten Fold WIDERLEGT | **6** |

**Ein einzelner Zeuge liegt also in rund 60 % der Faelle daneben** — auch ein gehaltener. Wer die
Liste ohne zweiten Fold liest, jagt mehrheitlich Modellrauschen. Die 15 Aufnahmen mit nur einem
Zeugen stehen damit unter Vorbehalt.

### Die vier, die zwei Zeugen tragen

| Aufnahme | Feld | FEN | beide lesen | Zellen | offen | Zustimmung Fold B zum FEN |
|---|---|---|---|---|---|---|
| `2026-09-06-21-29-35` | c2 | `wR` | `wP` | 263 | **252** | 0 % |
| `2026-08-08-11-59-12` | g1 | `wN` | `wB` | 130 | 0 | 5 % |
| `2026-08-08-00-39-57` | d7 | `bR` | `bP` | 29 | 25 | 0 % |
| `2026-09-06-20-57-45` | e5 | `wN` | `wB` | 16 | 13 | 12 % |

`g1` ist der bereits reparierte f1/g1-Tausch — der Audit findet ihn eigenstaendig wieder.

**ZURUECKGEZOGEN, siehe unten:** `c6` wurde vom Menschen als Turm bestaetigt, obwohl BEIDE Folds
dort mit 97-99 % einen Springer lasen. Zwei Folds sind kein zweiter Zeuge.

### Widerlegt, und darum NICHT gemeldet

`2026-08-08-00-39-57` d4 (Fold B stimmt dem FEN zu 65 % zu), `2026-09-06-20-27-33` b4 (80 %) und
f8 (80 %), `2026-09-06-21-29-35` d8 (75 %) und f4 (60 %), `VID_20260824_153751` c7 (94 %).

## Je Partie gemittelt verschwindet ein Fehler, der zwischen zwei Zuegen sitzt (2026-09-17)

Der Audit fasste je Feld ueber die GANZE Aufnahme zusammen. Ein Feld traegt aber ueber 99 Plies
mehrere Figuren nacheinander: `2026-09-06-21-29-35` c2 stimmt in vier von fuenf Fenstern und liegt
im fuenften 256 von 263 Mal daneben. `scripts/heldout_label_audit.py` schneidet jetzt je
**Ply-Fenster konstanter FEN-Aussage**. Aus 32 Befunden wurden **35 Fenster**, und erst so war die
zweite Stelle sichtbar.

### Der Fall: ein Turm, den es auf dem Brett nicht gibt

`2026-09-06-21-29-35`, weisse Turmspur laut FEN — beide Folds gegengeprueft:

| Station | Ply | Fold A | Fold B | |
|---|---|---|---|---|
| c1 | 45-46 | `wR` 81 % | `wR` 63 % | ok |
| c1 | 51-52 | `wR` 97 % | `wR` 81 % | ok |
| **c2** | **57-74** | **`wP` 256/263** | **`wP` 195/263** | **263 Zellen, 252 offen** |
| **c6** | **75-78** | **`wN` 53/59** | **`wN` 54/59** | **59 Zellen, 54 offen** |
| **c8** | **79-80** | **`wN` 19/31** | **`wN` 18/31** | **31 Zellen** |

**Und ab Ply 40 fuehrt das FEN gar keinen weissen Springer mehr** — beide gelten als geschlagen,
waehrend beide Folds auf c6 und c8 einen lesen. Der Mitschnitt hat also eine Figur verwechselt
oder eine Schlagung verbucht, die es nicht gab.

**Das ist keine Label-Panne, sondern eine Divergenz zwischen Zugfolge und Brett.** Die
Brett-Uebereinstimmung faellt im Fenster 60-79 auf 84 % gegen sonst ~90 % — ein Dip, kein
Zusammenbruch, die Divergenz ist also LOKAL. Drei Felder zu korrigieren wuerde sie zudecken,
nicht loesen.

### Was die Methode dabei gelernt hat

`c8` lag bei 61 % und fiel durch die Schwelle von 70 %. Gefunden wurde es, indem der SPUR der
verdaechtigen Figur gefolgt wurde, Station fuer Station. **Eine Schwelle je Fenster findet den
Anfang einer Kette, nicht ihr Ende** — wer einen Fund hat, verfolgt das Stueck.

### Stand des Audits

**35 Fenster** mit systematischem Widerspruch ueber 22 Aufnahmen, **5 davon vom zweiten Fold
bestaetigt** (plus c8 ueber die Spur). `2026-08-16-20-41-33` traegt allein **11 Fenster** und hat
KEINEN zweiten Zeugen — bei 60 % Fehlalarm je Einzelzeuge ist das nicht belastbar, solange kein
Fold diese Aufnahme auslaesst.

## Der Algorithmus prueft jedes Feld jeder Partie — drei Stufen (2026-09-17)

`scripts/heldout_label_audit.py`, `tests/test_heldout_label_audit.py` haelt die Teile einzeln.

1. **Schwelle je Ply-Fenster.** Jedes Feld, aufgeteilt in Fenster konstanter FEN-Aussage.
   `2026-09-06-21-29-35` c2 stimmt in vier von fuenf Fenstern; ueber die Partie gemittelt
   verschwand der Fund. **35 Fenster** ueber 22 Aufnahmen.
2. **Der SPUR der Figur folgen**, mit gesenkter Schwelle (0,55 statt 0,70). Die Zuege kommen aus
   dem UNTERSCHIED zweier FENs — es gibt keine Zugliste; bei einer Schlagung wird verfolgt, was
   GEHT, nicht was verschwindet. **27 weitere Stellen**, darunter die ganze c2-Kette:
   `d1` 29-34 (61 %), `c2` 57-74 (97 %), `c6` 75-78 (90 %), `c8` 79-80 (61 %) — **vier**
   Stationen derselben Figur, drei davon unter der Einzel-Schwelle.
3. **Bestand.** Figuren, die das Brett zeigt und der Mitschnitt nicht mehr fuehrt. Die
   Gegenrichtung ist bewusst KEIN Befund: eine Figur, die in den Lesungen fehlt, steht meist
   unter einer Hand.

### Stufe 3 war zuerst eine Fehlalarm-Maschine

Sie zaehlte JEDE Mehrheitslesung und schlug damit bei **18 von 22** Aufnahmen an — ein einzelnes
fehlgelesenes Feld genuegte fuer eine Phantom-Figur. Ein Bestand, der immer anschlaegt, sagt
nichts. Sie stuetzt sich jetzt nur auf Fenster, die SELBST die Schwelle reissen, und meldet
**3 von 22**: `2026-08-16-20-41-33` (`wN`), `2026-09-06-21-12-56` (`wB`),
`2026-09-06-21-29-35` (`wN`) — der Fall, der die Sonde ausgeloest hat, ist darunter.

### Was der Algorithmus NICHT kann

**26 der 48 Aufnahmen** hat kein Fold ausgelassen — fuer die gibt es kein ehrliches Urteil,
solange kein Trainingslauf sie auslaesst. Und `2026-08-16-20-41-33` traegt allein **11 Fenster**
ohne zweiten Zeugen; bei 60 % Fehlalarm je Einzelzeuge ist das nicht belastbar.

## Zwei Folds sind KEIN zweiter Zeuge (2026-09-17, zurueckgezogen)

Der Mensch hat `2026-09-06-21-29-35` c6 angesehen und entschieden: **`wR`, wie das FEN sagt.**
Beide gehaltenen Folds lasen dort einen Springer, mit **97, 99 und 98 Prozent** auf drei Frames,
und der Audit meldete das als **BESTAETIGT** — den staerksten Befund, den er kennt.

**Beide waren sicher falsch.** Damit faellt die Annahme, auf der die ganze Auswertung stand.

### Warum sie sich nicht widersprechen konnten

`_fold0..3128v7/p4a-s42` teilen **Seed 42, Architektur, Epochen, Batch und Augmentierung**. Sie
unterscheiden sich NUR im Split und trainieren auf rund 90 % derselben Aufnahmen. Gemessen ueber
**352 320 gemeinsam gelesene Zellen**: sie lesen in **95,3 %** dasselbe. Das ist kein zweiter
Zeuge, das ist dieselbe Stimme aus einem anderen Zimmer.

**`--second` misst damit fast nichts.** Die "6 von 10 widerlegt" von heute frueh sagen, wo die
zwei Faelle auseinanderlaufen — nicht, wo das Label falsch ist. Und "BESTAETIGT" heisst nur:
dasselbe Rezept irrt zweimal gleich.

### Was daraus folgt

- **Nichts wurde geschrieben.** Die Kette d1/c2/c6/c8 (~440 Zellen) bleibt unberuehrt.
- Der Bestands-Alarm auf dieser Aufnahme (`wN x1`) stand auf denselben Lesungen und ist mit
  ihnen hinfaellig.
- `c2` (57-74, gelesen `wP`) ist damit ebenfalls **unbeurteilt** — ein Mensch hat es nicht
  angesehen, und der Leser ist als Zeuge entwertet.
- Ein echter zweiter Zeuge braucht ein anderes REZEPT, nicht einen anderen Split: andere
  Architektur, anderer Seed, andere Augmentierung. Sonst ist die Gegenprobe Theater.

**Der Mensch bleibt die einzige Wahrheit.** Der Audit taugt zum SORTIEREN — er zeigt, wo
hinzusehen lohnt — nie zum Entscheiden.

## Der Turm auf c6 ist ein Turm — und drei Modelle lesen ihn falsch (2026-09-17, aufgeloest)

Der Mensch hat den strittigen Crop neben einen Turm gelegt, den ALLE Modelle richtig lesen
(`c1` auf Frame 008271, 81/97/67 %), und entschieden: **"hier sehe ich beides Tuerme."**

**Die ganze Kette ist damit hinfaellig.** `d1`/`c2`/`c6`/`c8` (~440 Zellen) bleiben, wie sie sind.
Es wurde nie etwas geschrieben.

### Der dritte Zeuge hatte ein anderes Rezept und sagte dasselbe Falsche

Der Nutzer hatte recht: unter `data/models` liegen **23 Aufnahmen, die von mindestens zwei
wirklich verschiedenen Rezepten ausgelassen werden** — `cellnet_p4`, `cellnet_p8`, `mobilenetv3`,
`mobilenetv4` in vier Groessen, Seeds 42 bis 48; zwei Aufnahmen sogar von 49. Fuer
`2026-09-06-21-29-35` liest `ref-v5-s42` (`mobilenetv4_conv_small_035`, andere Familie) auf `c1`
den Turm richtig (67 %) — und auf `c6` denselben Springer wie die Cellnets (55 von 59).

**Es ist auch kein Geometriefehler:** der Crop, den `frame_cells` schneidet, und der von
`/api/cell` sind dasselbe Bild. Das Modell sieht genau, was der Mensch sieht.

### Die Zahl, die alles einordnet — und meine erste Fassung war falsch

Ich meldete "10,6 % Fehler auf SICHTBAREN Zellen". Der Filter hatte nie gegriffen: **alle 209 962
gehaltenen Lesungen tragen `coverage: None`**, denn die Zahl steht in `matte.jsonl`, nicht in der
Lesung. Richtig verbunden:

| Lage | Zellen | falsch |
|---|---|---|
| **weiss verdeckt** | **13 237** | 74,6 % |
| **schwarz verdeckt** | **7 120** | 75,8 % |
| weiss sichtbar | 66 732 | **4,6 %** |
| schwarz sichtbar | 71 140 | **3,4 %** |

**Weiss liegt 1,86x so oft unter einer Hand** — der Mensch spielt Weiss
(`occlusion-asymmetry-is-the-player-side`, hier erstmals in LESEFEHLERN gemessen). Auf verdeckten
Zellen sind beide Farben gleich schlecht; dort ist nichts zu sehen. Auf sichtbaren schrumpft der
Abstand von Faktor 2-3 auf **1,35**, und die Fehlerrate von 10,6 % auf **rund 4 %**.

Nicht der Kontrast: weiss auf hell 13,5 % gegen weiss auf dunkel 12,7 %.

**Derselbe Fehler steckte im Audit** (`scripts/heldout_label_audit.py`) und ist gefixt. Mit der
echten Coverage findet er MEHR, nicht weniger: **41 Fenster statt 35, 8 bestaetigt statt 5** —
verdeckte Zellen waren Rauschen in beide Richtungen, und ohne sie steigen die Anteile
(`g1` von 78 % auf 99 %).

### Was der Audit damit wert ist

Bei **4 % Grundfehlerrate auf sichtbaren Zellen** ist "ein Modell widerspricht" ein Indiz — aber
`c6` steht im korrigierten Lauf mit **95 %** und zwei Zeugen da und ist trotzdem ein TURM. "Drei
Modelle widersprechen" reicht also nicht — sie teilen Trainingsdaten und Fehlermuster. Die 35 Fenster sind ein
Filter auf SYSTEMATISCHEN Widerspruch, und das ist richtig so; sie sind trotzdem nur eine
Vorsortierung. **Entschieden wird am Crop, vom Menschen.** Heute haette der Audit ohne diesen
Blick ~440 Zellen falsch gemacht.

## Das neue Spiel bleibt Holdout — v8 ist aufgeschoben (2026-09-17)

**`2026-09-15-16-54-44` ist gepackt** (`data/packs/rg-2026-09-15-16-54-44-128`, 100 099 Crops,
4,92 GB, 39 s) und steht in **keinem** Datensatz. Es ist das einzige ganze Spiel, das kein Modell
je gesehen hat — genau der Zeuge, der heute gefehlt hat.

`tests/test_holdout_sessions.py` haelt das fest: kein Datensatz darf es in `train` oder `val`
ziehen. `assign_sessions_to_splits` kennt `force_train`, aber kein Gegenstueck; ohne die Wache
haelt die Entscheidung nur, solange niemand `--add-test` vergisst. Gegengeprobt mit einer
Aufnahme, die wirklich im Train steht — sie schlaegt an.

### Warum v8 NICHT gebaut und NICHT trainiert wird

Der Nutzer hat es ausgerechnet, bevor ich es tat: v8 haette **keine neuen Trainingsdaten**.

| Split | korrigierte Labels |
|---|---|
| train | **649** von ~685 000 Zeilen (**0,095 %**) |
| test | 135 |
| **val** | **0** |

Im Val aendert sich **nichts** — jedes Checkpoint-Kriterium (`val_acc`, `macro_recall`, `score`)
liefe auf einem bytegleichen Satz. Ein v8-Modell unterschiede sich von v7 um Seed-Rauschen, und
`seed-variance-exceeds-the-effects` misst dafuer 0,33 auf `occ_board_acc`. Der Effekt waere nicht
messbar, auch nicht im Prinzip.

**Was trotzdem getan ist:** 17 Aufnahme-Packs neu geschnitten (257 s), die alten liegen in
`data/_parked/packs-v7-20260917-172925/`. Fuenf blieben, weil ihre Differenz nachgewiesen NULL
ist; die 138 Komposit-Packs haben keine Korrekturen. Wer v8 baut, hat die Packs schon.

## 90 % des Aufnahme-Korpus ist dieselbe Figur zweimal (2026-09-17)

Nutzer: "figuren aus einer partie die 20 FEN nicht bewegt wurden tragen wenig bei ... ansonsten
ist das ja nur wie ein extra gewicht." **Gemessen, und die Vermutung stimmt.**

Je STANDZEIT (Feld + Figur + ununterbrochene Ply-Strecke), verdeckte Zellen raus — eine Hand ist
keine Licht-Variation und verdoppelte die Spannweite (95 statt 51). `scripts/crop_redundancy.py`.

| | |
|---|---|
| sichtbare Crops, 24 Aufnahmen | **669 571** |
| verdeckt, ausgelassen | 65 505 |
| Standzeiten | 3 289 |
| **Dubletten** (naechster Nachbar <= 2 Graustufen) | **90,3 %** |
| **nicht-redundante Crops im GESAMTEN Aufnahme-Korpus** | **65 250** |

Je Aufnahme streut es von **68,2 %** (`VID_20260727_233929`, Median-Standzeit 44 Frames) bis
**96,2 %** (`2026-09-06-20-27-33`, Median 166) — je laenger eine Figur steht, desto mehr Dubletten.

### Klug auswaehlen hilft — ab k = 4

Zwei Masse, weil eines allein ein Selbstlob waere: Farthest-Point optimiert die SPANNWEITE direkt.
Gemessen wird deshalb die DECKUNG — wie weit ein durchschnittlicher Crop noch vom naechsten
BEHALTENEN entfernt ist, gewichtet nach Crops:

| k | die ERSTEN k | Farthest-Point |
|---|---|---|
| 2 | 8,5 | 8,5 — Gleichstand |
| 4 | 7,1 | **5,5** |
| 8 | 5,7 | **3,6** |
| 16 | 4,5 | **2,3** |

### Der Haken, den die Montage zeigt

`scripts/crop_redundancy_montage.py` legt acht aufeinanderfolgende Crops neben acht per
Farthest-Point. Oben achtmal dasselbe Bild, unten sichtbar verschiedene — **aber mehrere der
unteren sind Haende und Bewegungsunschaerfe**, trotz Coverage-Filter. Farthest-Point greift per
Bauart die Extreme, und die Extreme einer Strecke sind oft nicht "anderes Licht", sondern "Finger
davor". Das ist genau die Falle aus `occlusion-labels-precision-over-recall`.

**Offen:** Farthest-Point auf VORGEFILTERTEN Crops (Schaerfe und Coverage zuerst, dann Spannweite).
Nicht gemessen.

### Und was das fuer "wie viele neue Spiele" heisst

**Die Zahl der Spiele ist nicht die richtige Groesse.** Eine Partie traegt im Mittel rund **2 700**
nicht-redundante Crops bei (65 250 / 24), die beste heute gemessene 8 249. Gegen einen Train-Split
von ~685 000 Zeilen sind das **0,4 bis 1,2 %**. Fuer eine Aenderung ueber dem Seed-Rauschen
braeuchte es **zweistellig viele Partien derselben Art** — und selbst dann waere es mehr vom
Gleichen. Das deckt sich mit `corpus-is-threefold-redundant`: mit 3,9 % der Crops war das Modell
gleich gut.

Was fehlt, ist keine Menge, sondern eine BEDINGUNG: von Schwarz gespielt, dunkel, anderes Handy
(`no-retrain-without-new-domain`, `dark-footage-is-a-stress-test`).

## Ausduennen: kluge Auswahl verlor gegen den Zufall (2026-09-17, ein Seed)

Aus der Redundanz-Messung (90,3 % Dubletten) folgte die Frage des Nutzers: bringt es etwas, je
Standzeit die VERSCHIEDENSTEN Crops zu behalten statt der ersten? `scripts/thin_dataset.py` baut
den Zwilling eines Datensatzes mit k Crops je Standzeit; Val und Test bleiben Zeile fuer Zeile.

**Erster Anlauf war falsch aufgebaut.** Ich duennte nur die AUFNAHMEN aus und liess die Komposite
ganz — damit kippte die Train-Mischung von **50,2 / 49,8** auf **8,5 / 91,5**, und der Val-Satz ist
eine Aufnahme. Der Lauf mass also "schadet es, fast nur auf Kompositen zu trainieren".

**Nebenbefund daraus:** bei 50/50 traegt das Modell 0,9718, bei 8/92 nur 0,90-0,92 — bei
UNVERAENDERTER absoluter Komposit-Zahl. Komposite ersetzen echte Partien nicht.

### Das Paar, gleiche Groesse und Mischung

| Arm | Mittel letzte 20 Epochen |
|---|---|
| Farthest-Point | **0,8965** |
| Zufall | **0,9166** |

**Mit einem Seed gewann der Zufall um 0,0201** — und diese Aussage ist ZURUECKGEZOGEN. Mit drei
Seeds kehrt sich das Vorzeichen um (siehe unten). Genau der Fall, vor dem
`seed-variance-exceeds-the-effects` warnt, und ich habe die Zahl trotzdem vorher gemeldet.

Damit hat meine **Deckungskurve das Gegenteil vorhergesagt** (bei k=16: 4,5 gegen 2,3 zugunsten
von Farthest-Point). Das Mass war ein schlechter Stellvertreter: Farthest-Point greift die
EXTREME, und die Extreme einer Standzeit sind Haende, Wackler und Verdeckung.

### Und ich bin in die Coverage Matte Trap gelaufen

**49 % der Crops** von `2026-09-15-16-54-44` tragen `coverage: None` — nie gemattet. Mein Filter
`float(cov or 0.0) <= PIECE_VISIBLE_MAX` las das als "voll sichtbar". Das steht woertlich in
CLAUDE.md, und ich habe es in meinen eigenen Auswertungsskripten nachgebaut. Behoben.

**Aber es erklaert die Haende nicht:** auch mit erzwungener Messung bleiben sie in der Auswahl.
Die Hand-Crops tragen eine GEMESSENE Coverage unter der Schwelle — SAM sieht sie dort nicht. Ein
Schaerfe-Filter hilft ebenso wenig: eine Hand ist nicht unscharf, sie ist ein anderes Objekt
(von 416 Crops flogen 13 raus, die Haende blieben).

### Was uebrig bleibt: erst den Rand abschneiden, dann spreizen

Der dritte Arm (`--trim 0.25`) wirft die vom Median der Strecke entferntesten Crops weg, BEVOR
Farthest-Point waehlt. In der Montage liefert das auf einer Standzeit genau das Gewuenschte —
acht Licht- und Schattenlagen ohne Hand — auf einer anderen bleiben bei 10 % Beschnitt zwei
Haende. Ob es dem Zufall schlaegt, entscheidet der Lauf, nicht das Auge: Farthest-Point sah in
der Montage auch gut aus.

## Drei Arme, drei Seeds: das Rauschen schluckt den Effekt (2026-09-18)

Sieben Laeufe ueber Nacht, je 60 Epochen, `--patience 60`, gleiche Groesse und Mischung, nur das
Auswahlverfahren und der Trainings-Seed variieren (`scripts/thin_arms_report.py`).

| Arm | Seed 42 | Seed 43 | Seed 44 | Median | sd |
|---|---|---|---|---|---|
| Farthest-Point | 0,8965 | 0,8843 | 0,9263 | 0,8965 | 0,0216 |
| Zufall | 0,9166 | 0,8820 | 0,8776 | 0,8820 | 0,0214 |
| Kern (trim 25 %) | 0,9097 | 0,9252 | 0,9067 | **0,9097** | **0,0099** |

Gepaart gegen den Zufall: Farthest-Point **-0,0201 / +0,0023 / +0,0487**, Kern **-0,0069 /
+0,0433 / +0,0291**. Bei Farthest-Point wechselt das Vorzeichen zwischen den Seeds.

**Unterschied zwischen den Arm-Medianen: 0,0277. Groesste Spanne innerhalb eines Arms: 0,0420.**
Das Rauschen ist groesser als der Effekt — **kein Arm ist von einem anderen unterscheidbar**.

### Was trotzdem belastbar ist

**Weniger Daten heisst instabiler, nicht nur schlechter.** Die Basislinie auf dem vollen v7 hat
ueber SIEBEN Seeds eine sd von **0,0073**; die ausgeduennten Arme liegen bei **0,0214 und 0,0216**
— dreimal so viel. Nur der Kern-Arm bleibt mit **0,0099** nahe an der Basislinie, was zu seiner
Bauart passt: er wirft die Ausreisser weg, die die Laeufe auseinandertreiben.

Das ist der einzige Unterschied, der ueber dem Rauschen liegt — und er betrifft die STREUUNG,
nicht das Niveau.

### Was es braucht, um die Frage zu entscheiden

Bei einer Spanne von 0,042 innerhalb eines Arms und einem erwarteten Effekt um 0,03 braucht es
grob **acht bis zehn Seeds je Arm**, nicht drei. Das sind rund 24 Laeufe zu je 25 Minuten, also
zehn Stunden. Ob die Frage das wert ist, ist eine Entscheidung des Nutzers — der praktische
Nutzen waere ein Trainingssatz, der zehnmal kleiner ist.

## Gegentest: das Rezept war der Hebel, nicht die Auswahl (2026-09-18)

Die ganze Nacht lief gegen eine Basislinie aus dem ARCHIV (`p4a`, 7 Seeds, 0,9718 +- 0,0073).
Der Gegentest auf dem vollen v7 mit dem besten Rezept (`--rot90 --hflip-p 0.5`) liefert unter
HEUTIGEM Code **0,9874** — das Archiv meldet fuer dasselbe Rezept 0,9963 +- 0,0019, also
**-4,6 sd**.

**Vergleiche gegen Archivzahlen sind damit ungueltig**, die ganze Nacht gegen 0,9718 eingeschlossen.
Der Code ist seitdem gedriftet, die `config.json` zeigt es Feld fuer Feld: `pretrained` False->True,
`aug_erase_p` 0,25->0,0, `weight_cap` 3,0->None, `loss` ce->occlusion, `checkpoint_policy` v2->v3,
`coverage_weight` None->hard, `metrics_schema` 2->3. Was gilt, ist die Kontrolle: **0,9874**, gleicher
Code, gleicher Tag. Arme untereinander bleiben vergleichbar.

### Dieselben drei Arme mit dem `rot`-Rezept

| Arm | Seed 42 | Seed 43 | Seed 44 | Median | sd |
|---|---|---|---|---|---|
| Farthest-Point | 0,9913 | 0,9782 | 0,9770 | 0,9782 | 0,0079 |
| Zufall | 0,9873 | 0,9762 | 0,9862 | **0,9862** | **0,0061** |
| Kern (trim 25 %) | 0,9783 | 0,9678 | 0,9846 | 0,9783 | 0,0085 |

Gepaart gegen den Zufall: Farthest-Point **+0,0040 / +0,0020 / -0,0092**, Kern **-0,0091 /
-0,0084 / -0,0016**. Spanne zwischen den Arm-Medianen 0,0080, groesste Spanne innerhalb eines
Arms 0,0168 — **wieder ist kein Arm von einem anderen unterscheidbar**, jetzt auf dem doppelt so
engen Band.

### Die zwei Befunde, die ueber dem Rauschen liegen

**1. Das Rezept schlaegt die Datenmenge um Laengen.** Dieselben Daten, nur Rotation und Spiegelung
dazu, heben die ausgeduennten Arme von 0,88-0,93 auf **0,968-0,991**. Der Abstand zwischen den
Auswahlverfahren betraegt ein Zehntel davon.

**2. Das Ausduennen kostet fast nichts — wenn das Rezept stimmt.** Die Arme tragen **8,5 %
Aufnahme-Anteil** gegen 50 % der Kontrolle und **16 Crops je Standzeit** statt aller. Die Kontrolle
steht bei 0,9874, die Arm-Mediane bei 0,9782-0,9862; der beste Einzellauf (Farthest-Point s42,
0,9913) liegt UEBER der Kontrolle. Die Kontrolle ist aber **n=1** und traegt damit keine sd —
sie sagt "in derselben Groessenordnung", nicht "gleich gut".

Das ist die brauchbare Antwort auf die Ausgangsfrage: die 90,3 % Dubletten kosten offenbar kaum
Signal. Wer den Trainingssatz zehnmal kleiner haben will, zahlt vor allem in STREUUNG, und die
laesst sich mit dem besseren Rezept auf 0,006-0,0085 druecken — nahe an den 0,0073 der vollen
Basislinie.

**Offen bleibt**, welches Auswahlverfahren gewinnt. Die Antwort braucht acht bis zehn Seeds je Arm,
und der Gegentest hat den erwarteten Effekt eher verkleinert als vergroessert. Meine Empfehlung:
nicht weiter messen, sondern den Zufall nehmen — er ist der billigste Arm, hat hier die kleinste
Streuung und niemand hat ihn je geschlagen.

### KORREKTUR: es war keine Code-Drift, es war ein anderes Rezept (2026-09-18)

Ich hatte den Abstand zum Archiv als Drift der Vorgabewerte erklaert. Das ist FALSCH. Die
Feld-fuer-Feld-Probe ueber alle sieben Archiv-Seeds zeigt: sie tragen alle dieselben vier
Einstellungen, und alle vier sind FLAGS, die ich schlicht nicht gesetzt habe.

| Feld | Archiv (7 Seeds) | Meine Kontrolle |
|---|---|---|
| `weight_cap` | **3,0** | None |
| `loss` | **ce** | occlusion |
| `aug_erase_p` | **0,25** | 0,0 |
| `pretrained` | **False** | True |

Die Folge steht in den effektiven Klassengewichten: gedeckelt spreizen sie **3,0x**
(`empty` 0,68 bis 2,04), ungedeckelt **45,8x** (`empty` 0,13 bis 6,03). Das ist eine andere
Zielfunktion, kein anderer Datensatz.

Auch die Metrik ist NICHT gewandert, obwohl `metrics_schema` von 2 auf 3 sprang: beide Laeufe
schreiben dieselben 18 `val_*`-Felder, und `val_visible_occupied_acc` stimmt zwischen ihnen auf
16 Stellen ueberein. Der Unterschied liegt auf der Figurenachse (0,9992 gegen 0,9886) und noch
deutlicher auf `val_visible_board_acc` (**0,981 gegen 0,740**). Gemessen wird dasselbe.

**Was damit gilt und was nicht:** die Zahl 0,9963 ist nicht verfallen, sie gehoert einem Rezept,
das ich nie gefahren bin. Der Satz "Archivzahlen sind ungueltig" bleibt richtig, aber aus dem
banaleren Grund — ich habe das falsche Rezept verglichen. Und die Nacht bleibt intern gueltig,
weil alle neun Arme dieselben Flags trugen.

**Offen:** welches der vier Flags den Punkt traegt. `--weight-cap 3` ist der plausibelste
Kandidat (Faktor 15 in der Gewichtsspreizung), aber `loss: ce` lernt auf ALLEN Zellen und wird
nur auf den sichtbaren benotet — das kann denselben Effekt machen. Das entscheidet eine Ablation
mit vier Armen zu je drei Seeds, nicht das Nachdenken.

### Alles nehmen, jetzt mit Streuung: es ist zuverlaessig besser (2026-09-18)

Die Kontrolle hatte n=1, und ein Wert hat keine Streuung. Zwei Seeds nachgezogen, gleiches Rezept,
`split-pin.json`, patience 60.

| Arm | s42 | s43 | s44 | Median | sd | Boden |
|---|---|---|---|---|---|---|
| **Alles (volles v7)** | 0,9874 | 0,9978 | 0,9921 | **0,9921** | **0,0052** | **0,9874** |
| Farthest-Point | 0,9913 | 0,9782 | 0,9770 | 0,9782 | 0,0079 | 0,9770 |
| Zufall | 0,9873 | 0,9762 | 0,9862 | 0,9862 | 0,0061 | 0,9762 |
| Kern (trim 25 %) | 0,9783 | 0,9678 | 0,9846 | 0,9783 | 0,0085 | 0,9678 |

**Acht von neun gepaarten Vergleichen gehen an "alles nehmen"** (Vorzeichentest p = 0,0195
einseitig), Median-Verlust ueber alle neun Paare **-0,0091**. Und der SCHLECHTESTE Lauf der
Kontrolle (0,9874) schlaegt **acht der neun** ausgeduennten Laeufe.

Damit ist die Vermutung des Nutzers bestaetigt und meine vorherige Formulierung zu optimistisch:
die einzelnen Spitzen der ausgeduennten Arme (Farthest-Point s42: 0,9913) sind Ziehungen, kein
Niveau. Der Boden faellt, und er faellt weiter als der Median.

**Aber der Preis ist klein und der Rabatt gross:** die Arme tragen 8,5 % Aufnahme-Anteil und 16
Crops je Standzeit. Dafuer knapp einen Punkt zu zahlen ist ein Angebot, das je nach Zweck gut
aussieht — fuers Ausprobieren ja, fuer ein Auslieferungsmodell nein.

**Die Streuung kippt NICHT mit.** Unter dem `p4a`-Rezept trugen die ausgeduennten Arme 0,0214 gegen
0,0073 der Basislinie, also dreifach. Unter `rot` sind es 0,0061-0,0085 gegen 0,0052 — der
Unterschied ist weg. Die verdreifachte Streuung war eine Eigenschaft des schwaecheren Rezepts, nicht
des Ausduennens. Damit ist auch der einzige "belastbare" Befund der Nacht hinfaellig.

### Die Metrik ist ein ZAEHLWERK, und das aendert die ganze Deutung (2026-09-18)

Der Nutzer legte eine Zeile vor: `"val_visible_piece_acc": 0.9998972989627195`. Das ist kein
krummer Messwert, das ist **9736/9737** — genau EINE falsche Zelle. Der Val-Satz traegt 9 737
sichtbare besetzte Zellen, eine Zelle ist 0,000103. Derselbe Wert steht woertlich in FUENF
verschiedenen Laeufen, weil die Metrik gequantelt ist.

In Fehlerzahlen statt Prozent (Mittel der letzten 20 Epochen, von 9 737):

| Archiv (7 Seeds) | | Heute | |
|---|---|---|---|
| s42 | **12** | Kontrolle s42 | **123** |
| s43 | 19 | Kontrolle s43 | **21** |
| s44 | 54 | Kontrolle s44 | 76 |
| s45 | 25 | Repro (Archiv-Flags) | **30** |
| s46 | 61 | | |
| s47 | 35 | | |
| s48 | 48 | | |
| **Mittel** | **36** | **Mittel Kontrolle** | **73** |

**Kontrolle s43 (21) liegt mitten im Archivband (12-61), die Repro (30) ebenso.** Nur s42 faellt
mit 123 heraus. Der "ganze Punkt Abstand", den ich gemeldet habe, ist der Unterschied zwischen
36 und 73 falschen Zellen — auf einem Schwanz von Hunderteln, und das Archivband selbst spannt
Faktor 5.

**s42 hat nicht gezappelt, es ist schlechter KONVERGIERT.** Der Verlauf: Epoche 31-35 bei 3-66
Fehlern, Epoche 41 springt auf 392, und die letzten zehn Epochen liegen flach bei 103-114. Mit
auslaufender Cosine-Rate ist das kein Rauschen, das ist ein schlechteres Optimum, in dem der Lauf
sitzen bleibt. Archiv s42 laeuft im selben Fenster auf 8-10 aus.

**Was daraus folgt:** meine Kette von Behauptungen war dreimal zu stark. Erst "Code-Drift"
(falsch, es waren Flags), dann "-4,6 sd" (auf dem schlechtesten von drei Seeds gerechnet), jetzt
"ein Punkt Abstand" (zwei von drei Kontrollseeds liegen im Archivband). Belastbar ist nur:
**ein Lauf von dreien konvergiert schlechter, und mit `--erase-p 0,25 --weight-cap 3` tat er es
nicht.** Ein Seed ist kein Beweis — aber die Richtung passt zur Theorie, denn Regularisierung ist
genau das, was solche Ausrutscher verhindert.

**Naechster Schritt, falls die Frage es wert ist:** zwei Seeds der Repro nachziehen. Erst dann
steht der Vergleich auf derselben Grundlage wie die Kontrolle.

## Versionierte Testsaetze: `test-v1` steht, und der Korpus ist fast verbraucht (2026-09-18)

Wunsch des Nutzers: ein groesserer Satz, gegen den kuenftige Modelle geprueft werden, benannt
`test-v1`, `test-v2`, ... Gebaut als `data/datasets/real13-test-v1-128`,
`scripts/build_test_set.py`.

**Die ernuechternde Zahl zuerst:** von 24 Aufnahmen mit einem Pack standen **22 schon in einem
Train-Split**. Als Testmaterial taugen exakt zwei. Ein groesserer Satz ist aus dem vorhandenen
Korpus nicht zu bauen — er entsteht nur vorwaerts, indem jede NEUE Aufnahme zuerst in einen
Testsatz geht und erst danach ins Training.

| Aufnahme | Zeilen | sichtbar besetzt |
|---|---|---|
| `rg-2026-09-11-20-00-52` | 112 994 | 13 927 |
| `rg-2026-09-15-16-54-44` | 100 099 | 12 197 |
| **test-v1** | **213 093** | **26 124** (2,7x der jetzige Val) |

Beide tragen alle 13 Klassen; duennste sind `wQ` mit 265 bzw. 321 sichtbaren Zellen.

**Labels geprueft, bevor gebaut wurde.** 2 772 bzw. 2 709 Korrekturen des Nutzers stehen alle im
Pack. Acht Zellen fehlten — alle acht sind in `unusable-cells.jsonl` als unbrauchbar markiert und
damit zu Recht draussen. Vier scheinbare Abweichungen waren aeltere Korrekturen, die eine spaetere
auf derselben Zelle ueberholt hat.

### Drei Sperren, damit v1 nicht wie der Rest verbrennt

1. **Der Satz hat weder Train noch Val** — `splits.train` und `splits.val` sind leer. Er kann nicht
   versehentlich trainiert werden.
2. **Beide Aufnahmen stehen in `data/TEST-USED.json` unter `frozen`.** `chesslab eval` verweigert
   jede Messung ohne `--burn-frozen`, und das Flag sagt laut, was es kostet.
3. **`build_test_set.py` prueft die Herkunft selbst** statt einer gepflegten Liste zu glauben: es
   liest `splits.train` aus JEDER `split*.json` aller Datensaetze und lehnt eine trainierte
   Aufnahme auch dann ab, wenn sie ausdruecklich mit `--sessions` genannt wird.

### Ein Loch in der Wache, gefunden und geschlossen

`tests/test_holdout_sessions.py` las nur `split.json` — ein Fold-Split `split-f0.json` haette den
Zeugen still ins Training ziehen koennen, ohne dass die Wache anschlaegt. `holdout_in_training`
liest jetzt jede `split*.json`. Der Test dazu ist gegengeprueft: gegen die alte Fassung faellt er.

**Was `test-v1` NICHT ist:** ein Satz, den man bei jedem Lauf misst. Das Hauptbuch zaehlt fuer
`rg-2026-08-08-00-39-57` **33 Auswertungen** — danach trug die Aufnahme keine Entscheidung mehr.
v1 ist fuer den Moment gedacht, in dem ein Auslieferungs-Kandidat feststeht, nicht fuer
Methodik-Fragen.

## test-v1 ist ein BENCHMARK, kein Einweg-Zeuge (2026-09-18)

Korrektur meiner Auslegung: ich hatte die zwei Aufnahmen unter `frozen` eingetragen, was
`chesslab eval` jede Messung verweigern laesst. Der Nutzer wollte das Gegenteil ("das ist kein
burn") — wiederholt messbar, nur nie im Training. Sie stehen jetzt unter `benchmark` in
`data/TEST-USED.json`; der Schutz ist `tests/test_holdout_sessions.py`, nicht die Eval-Sperre.
Das loest die `frozen`-Entscheidung vom 2026-09-13 fuer `rg-2026-09-11-20-00-52` ab.

### Sechs Modelle gegen test-v1 (26 124 sichtbare besetzte Zellen)

| Modell | piece | falsche Zellen | board_acc |
|---|---|---|---|
| `_thin/CONTROL-rot-s43` | **0,998728** | 193 | 0,8095 |
| `_thin/REPRO-archiv-s42` | **0,998728** | 193 | 0,8401 |
| `_acc128v7/rot-s42` | 0,998399 | 243 | 0,8368 |
| `_acc128v7/rot-s46` | 0,991709 | 1 257 | 0,7401 |
| `p4a-80-clahe` (Champ) | 0,967320 | 4 957 | 0,4472 |
| `_thin/rot-thin16-s42` | 0,967166 | 4 980 | 0,5177 |

**1. Die Ausduennung bricht auf ungesehenem Material ein, und der Val zeigte es nicht.**
`rot-thin16-s42` war auf dem Val die BESTE Ziehung aller neun Arme (0,9913) und liegt hier bei
0,9672 — 4 980 falsche Zellen gegen 193. Ihre Spanne zwischen den zwei Aufnahmen betraegt
**0,0460** (0,9476 gegen 0,9936), alle anderen bleiben unter 0,0058. Damit ist die
Ausduennungsfrage beantwortet, ohne die acht bis zehn Seeds je Arm: der Val aus EINER Aufnahme
hat den Schaden schlicht nicht gesehen.

**2. Die drei Spitzenmodelle sind ununterscheidbar** (193/193/243 Fehler), obwohl sie aus drei
verschiedenen Rezept-Diskussionen stammen. Die Flag-Jagd des Vormittags bewegt auf echtem
Testmaterial nichts — was die Vermutung stuetzt, dass `CONTROL-rot-s42` schlicht ein Pechlauf war.

**3. Der Champ liegt hinten, aber der Vergleich ist unfair:** 80 px auf `real13-mix-v4` gegen
128 px auf v7, also halbe Aufloesung UND eine Datengeneration. Die Zahl taugt als Ausgangspunkt,
nicht als Urteil.

### Ein Loader, alle Modelle gleichzeitig (Idee des Nutzers)

`scripts/bench_models.py` gruppiert Laeufe nach ihrer EINGABE (Groesse, CLAHE, Normalisierung,
Kanalform, Klassenliste) und faehrt je Gruppe EINEN Durchgang, in dem jeder Batch durch alle
Modelle der Gruppe geht. Bei 6,7 MMAC je Crop ist der Vorwaertspass der billigste Teil; die
Platte und die Vorverarbeitung sind der Preis, und den zahlt man so einmal statt sechsmal.

**Gemessen: 109 s statt 332 s** bei sechs Modellen in zwei Gruppen (5 x 128 px roh, 1 x 80 px
CLAHE). **Bitgleich nachgewiesen** — alle sechs `visible_piece_acc` stimmen auf sechs
Nachkommastellen mit den Einzellaeufen ueberein.

Die Gruppierung ist die Sicherung, nicht die Bequemlichkeit: zwei Modelle duerfen sich einen
Batch nur teilen, wenn sie ihn gleich vorverarbeitet haetten. `tests/test_bench_models.py` haelt
das mit elf Tests, darunter einer, der per Quelltext-Probe prueft, dass JEDES Feld, das
`eval_transform_for` aus der Config liest, auch in der Signatur steht — sonst faellt ein neues
Feld still durch.

## Ich habe 15 menschliche Urteile ueberschrieben (2026-09-18)

Vier Modelle verfehlten auf `test-v1` dieselben 26 Zellen, 24 davon einstimmig als `empty`, wo die
Aufzeichnung eine Figur fuehrt. Ich habe Crops vorgelegt, der Nutzer sah "scheint als haetten die
Modelle recht", und ich habe 15 Zellen auf `empty` geschrieben.

**Jede einzelne dieser 15 Zellen trug bereits ein Urteil des Nutzers — und zwar das
Gegenteil.** Elf standen in `corrections.jsonl` (er hatte sie AKTIV auf wP/wN/wR/bK/bN korrigiert),
vier in `reviewed.jsonl`. Ich habe nicht nachgesehen und die Ledger stumpf ueberschrieben.
Zurueckgestellt aus `data/_parked/empty-fix-20260918-110031/`, nachgeprueft.

**Dasselbe gilt fuer die drei, die ich als "offen" zurueckgelegt hatte:** `c6` = bN, `e5` = wN,
`c5` = wK stehen alle im Ledger, alle als FEN-Label bestaetigt. Die Modelle liegen dort falsch.

### Was das ueber die Modelle sagt

Von den 106 strittigen Zellen (ohne `rot-s46`, das mit 378 gegen 58 Fehlern 330 der 436 Karten
allein erzeugte) sind **105 bereits menschlich beurteilt, und der Mensch gab jedesmal dem FEN
recht**. Genau EINE Zelle ist ungeurteilt: `rg-2026-09-15-16-54-44` Frame 005331 f2, FEN `wQ`
gegen Modell `wR`, Coverage 0,0005.

Damit ist die Ausgangsfrage beantwortet, nur andersherum als gedacht: **die Labels von test-v1
sind gut, die Fehler gehoeren den Modellen.** Der Testsatz ist bereits durchgesehen — er ist
deshalb ein guter Massstab und ein schlechter Ort, um Labelfehler zu suchen.

### Der Defekt und die Regel

`audit_flags.ledger_labels` existiert genau dafuer — "the cells no view may ask again". Mein
Korrekturskript hat sie nie gefragt. **Wer Labels schreibt, liest zuerst `corrections.jsonl` UND
`reviewed.jsonl` und bricht bei jedem Treffer ab**, statt zu ueberschreiben. Ein Modellkonsens
ist kein Zeuge gegen einen Menschen, der dieselbe Zelle schon angesehen hat — vier Modelle
derselben Familie irren gleich, und hier taten sie es nachweislich.

## 80 px gegen 128 px, gleiches Rezept (2026-09-18)

`real13-mix-v7-80` ist sauber gebaut (161 Session-Packs, keine eigene Memmap, identischer
`split-pin.json` wie v7-128, 0 tote Zeilen). Drei Seeds, `rot`-Rezept, einzige Aenderung die
Aufloesung.

### Val (9 737 sichtbare besetzte Zellen)

| Arm | s42 | s43 | s44 | Median | sd | falsche Zellen |
|---|---|---|---|---|---|---|
| 128 px | 0,9874 | 0,9978 | 0,9921 | **0,9921** | 0,0052 | **76** |
| 80 px | 0,9737 | 0,9864 | 0,9701 | **0,9737** | 0,0085 | **256** |

Gepaart verliert 80 px in allen drei Seeds (-0,0137 / -0,0115 / -0,0221).

### test-v1 (45 593 sichtbare besetzte Zellen, nie trainiert)

| Modell | px | piece | falsche Zellen |
|---|---|---|---|
| `CONTROL-rot-s43` | 128 | 0,9987 | **58** |
| `REPRO-archiv-s42` | 128 | 0,9987 | **58** |
| `rot80-s44` | 80 | 0,9905 | 434 |
| `rot80-s43` | 80 | 0,9858 | 647 |
| `p4a-80-clahe` (Champ) | 80 | 0,9673 | 1 490 |
| `rot80-s42` | 80 | 0,9614 | 1 760 |

**Die Aufloesung traegt den Abstand, nicht die Datengeneration.** Gleiches Rezept, gleiche Daten:
58 -> 647 Fehler im Median, Faktor 11. Die aeltere v4-Basis des Champs kostet nochmal Faktor 2,3.

**Der Champ war unfair beurteilt.** Seine 0,9673 liegen mitten im Band der neuen 80er
(0,9614-0,9905); mit Seed 42 ist ein frisches v7-Modell sogar SCHLECHTER als er. Mein Satz von
heute Vormittag ("liegt weit zurueck") verglich 80 gegen 128 px und war kein Qualitaetsurteil.

**Der eigentliche Befund ist die Streuung.** Bei 128 px liegen zwei Laeufe punktgleich bei 58
Fehlern, bei 80 px streuen drei Seeds zwischen 434 und 1 760 — **Faktor vier**. Auf dem Val war
derselbe Kontrast viel milder (sd 0,0085 gegen 0,0052). Halbe Aufloesung kostet also nicht nur
Niveau, sie macht den Lauf unzuverlaessig, und das sieht man erst auf ungesehenem Material.
Das ist dasselbe Muster wie beim Ausduennen — der Val aus EINER Aufnahme verschweigt Instabilitaet.

## Die Fold-Durchsicht fand null Labelfehler auf den Aufnahmen (2026-09-18)

Nach dem Label-Abgleich (1 002 Zellen, siehe oben) las `scripts/oof_review.py` **160 Sessions
out-of-fold** — jede von dem Fold-Modell, das sie nie trainiert hat, gegen das letzte Wort des
Menschen, und ohne die 122 727 Zellen, die schon ein Urteil tragen.

**6 647 Widersprueche**, davon 6 421 auf gemessen sichtbaren Zellen. Aufgeteilt:

| | Zellen |
|---|---|
| Komposite (die Lane kann sie nicht zeigen, kein `boards/`) | 5 908 |
| Aufnahmen (`rg-*`) | 739 |

**Der Nutzer hat 733 der 739 durchgesehen. Alle 733 bestaetigen das FEN.** Kein einziger
Modellfund war ein Labelfehler.

### Meine Heuristik hat nichts vorhergesagt

Ich hatte die Funde nach der Aufbau-Tausch-Signatur sortiert — ein Feld, eine Aufnahme, dieselbe
Richtung ueber mindestens acht Frames bei mindestens 80 % Einigkeit — und die als Labelverdacht
ausgewiesen. Ergebnis:

| | FEN bestaetigt | Modell hatte recht |
|---|---|---|
| "Muster auf dem Feld" | **452** | **0** |
| einzeln | 281 | 0 |

**452 vorhergesagt, 0 getroffen.** Die Signatur trennt nichts: ein Modell, das ein Feld falsch
liest, liest es ueber den ganzen Standzeit-Lauf falsch — Konstanz ist deshalb die NORMALFORM eines
Modellfehlers und kein Hinweis auf ein Label. Das ist dieselbe Wurzel wie
`two-folds-are-not-a-second-witness`, nur eine Ebene tiefer: nicht nur zwei Modelle irren gleich,
EIN Modell irrt gleich ueber die Zeit.

### Was daraus folgt

**Die Aufnahmen des Korpus sind sauber, soweit Modelle das zeigen koennen.** Was blieb, waren die
1 002 veralteten Labels — ein SYNC-Problem zwischen Ledger, Pack und Datensatz, kein Urteilsproblem.
Der Weg dahin war `scripts/sync_labels.py`, nicht der Fold.

**Offen bleiben die 5 908 Komposit-Zellen.** Ob sie etwas tragen, ist unbekannt: die Lane kann sie
nicht rendern, und nach 733:0 auf den Aufnahmen ist die Erwartung niedrig. Ein Komposit-Fund waere
ausserdem an seiner QUELLE zu korrigieren — `a8 bR -> bP` taucht in fuenf Schnitten desselben
Videos auf, das waere ein Fehler, nicht fuenf.

## Training auf den abgeglichenen Labels: kein messbarer Effekt (2026-09-18)

Drei Seeds, `rot`-Rezept, `real13-mix-v7-128` nach dem Label-Abgleich, gegen `CONTROL-rot-s42/43/44`
mit denselben Seeds und demselben Rezept. **Der Val ist Zeile fuer Zeile unveraendert** (0 der 260
Korrekturen liegen dort), der Vergleich ist also gepaart und misst nur die Trainingslabels.

| Seed | Val CONTROL | Val SYNC | Delta | test-v1 CONTROL | test-v1 SYNC | Delta |
|---|---|---|---|---|---|---|
| s42 | 0,9874 | 0,9929 | +0,0055 | 0,9934 (300) | 0,9874 (574) | -0,0060 |
| s43 | 0,9978 | 0,9908 | -0,0071 | 0,9987 (58) | 0,9863 (625) | -0,0124 |
| s44 | 0,9921 | 0,9966 | +0,0044 | 0,9935 (296) | 0,9939 (280) | +0,0004 |
| **Median** | | | **+0,0044** | | | **-0,0060** |

**Die beiden Massstaebe zeigen in ENTGEGENGESETZTE Richtungen**, und beide bleiben in ihrer eigenen
Streuung (Val-sd 0,0070, test-v1-sd 0,0064). Das ist kein Effekt. 250 korrigierte von 979 361
Zeilen sind 0,026 % — der Abgleich ist eine Korrektheits-Reparatur, kein Leistungshebel, und bleibt
richtig, weil ein Modell mit `wB` auf f1 falsch ist, egal was der Val aufloest.

**Nur 4 der 45 593 besetzten Zellen von test-v1 hat der Abgleich selbst veraendert** — ohne sie
sind alle Zahlen auf sechs Stellen identisch. Der Benchmark misst also nicht seine eigene Korrektur.

### Korrektur: die 58 Fehler von heute Vormittag waren eine Ziehung

Ich hatte gemeldet, die drei Spitzenmodelle lagen bei 58/58/73 Fehlern und seien ununterscheidbar.
Das stand auf `CONTROL-rot-s43`. Seine Geschwister mit demselben Rezept liegen bei **296 und 300** —
**Faktor fuenf innerhalb einer Gruppe**. Wer EINEN Seed gegen test-v1 misst, misst die Ziehung.
Die Gruppe ist: CONTROL Median 0,9935 (sd 0,0030), SYNC Median 0,9874 (sd 0,0041).

### Zwischenstaende luegen

`_sync/rot-s44` stand bei 49 von 60 Epochen auf -0,0004 und landete bei **+0,0044** — die letzten
elf Epochen drehten das Vorzeichen. Ein Mittel der letzten 20 aus einem laufenden Lauf mittelt ein
anderes Fenster und ist keine kleine Version des Endergebnisses.

## Ein Komposit ist EINE Stellung — und das erledigt 5 908 Widersprueche (2026-09-18)

Nutzer: "bei komposit haben wir immer nur eine stellung und drehen das auf einen turntable und
2.5d komposition wir die haende rein". Die Figuren bewegen sich also nie; gedreht wird die Kamera,
und die Haende sind hineinkomponiert.

**Nachgemessen, beides haelt:**

- **0 von 8 832 (Komposit, Feld)-Paaren** wechseln ihr Label ueber die Frames.
- **Alle 63 Quellen** tragen EINE Stellung ueber alle ihre Schnitte — `p-VID_…-01` bis `-05`
  zeigen dasselbe Brett.

Damit sind die 5 908 Komposit-Widersprueche der Fold-Durchsicht keine 5 908 Entscheidungen,
sondern **49** (Quelle, Feld, Richtung) — und der Nutzer hat sie an der Montage als saemtlich
richtig beurteilt. Ein Modell, das dasselbe Feld ueber hundert Frames falsch liest, liefert EINEN
Widerspruch.

`tests/test_composite_position.py` haelt die Invariante: waechst ein Label innerhalb eines
Komposits oder zwischen den Schnitten einer Quelle, ist der Export kaputt. Der dritte Test fand
dabei eine Falle im eigenen Helfer — `re.sub(r"-\d+$", …)` frisst einem `rg-2026-09-11-20-00-52`
sein `-52` weg und erfindet eine Aufnahme, die es nicht gibt.

**Bilanz der ganzen Korpus-Pruefung:** 739 Aufnahme-Widersprueche vom Nutzer durchgesehen (0
Labelfehler), 5 908 Komposit-Widersprueche strukturell auf 49 reduziert und ebenfalls verworfen.
Der einzige echte Fund des Tages waren die 1 002 veralteten Labels — und die fand kein Modell,
sondern der Abgleich Ledger -> Pack -> Datensatz.

## `test-v1` brauchte kein Matten — es brauchte ein Wort (2026-09-18)

Auftrag war "test-v1 fertig matten", weil der Benchmark 67,6 % ungemessene Coverage trug und v7
0 %. **Gemessen: es fehlt keine einzige Matte.** Alle handbehafteten Frames sind geschnitten,
841 von 841 und 790 von 790; der eine vermeintlich offene traegt `dirty_reason=changed`, und den
mattet SAM per Bauart nicht (`ALPHA_REASON = "occluded"`).

**Das Loch war ein Wortproblem.** `labeling.crops_for_frame` schrieb einem Frame ohne
`matte.jsonl`-Zeile GAR KEINE `coverage` — und warf damit zwei Dinge zusammen:

- **SAMs Absage** ("zone too big"): wirklich ungemessen, und laut CLAUDE.md das verdeckteste
  Material des Korpus.
- **Der Hand-Gate hat den Frame als sauber gemessen**: er liegt in `boards/`, dem sauberen Stapel,
  ohne `dirty_reason`. Da ist nichts zu schneiden, und 0.0 ist eine AUSSAGE.

`labeling.clean_frames` trennt sie jetzt (Entscheidung des Nutzers, 2026-09-18). Wirkung:

| | vorher | nachher |
|---|---|---|
| `test-v1`, besetzte Zellen ohne Messung | 67,6 % | **0 %** |
| alle `rg-`-Packs | — | **64 von 1 337 936** (0,005 %) |

`scripts/sync_labels.py --coverage` zieht bestehende Packs nach, ohne Pixel anzufassen: 227 075
Werte `None -> 0.0` und **17 525 ueberschriebene Zahlen**. Die zweite Zahl ist die dokumentierte
Coverage-Drift, nicht ein Fehler — Stichprobe `2026-08-07-13-52-38` Frame 001770 g1: die
`matte.jsonl` sagt heute 0.0, der Pack hielt 0.7217 vom Stand vor dem Re-Export. 328 Zellen
kreuzen dabei `PIECE_VISIBLE_MAX`.

### Was ich NICHT geaendert habe, und warum

`classification_eligible` liest `None` weiter ueber `or 0.0` als sichtbar. Der Fix war geschrieben
und ist zurueckgenommen: `test_null_reads_the_same_everywhere` haelt seit 2026-09-17 bewusst fest,
dass `coverage_of` und `classification_eligible` `None` GLEICH lesen, und das Umstellen haette
beide betroffen. Fuer **64 Zellen von 1 337 936** ist das den Bruch nicht wert. Die Entscheidung
steht jetzt als Test (`test_unmeasured_is_now_almost_empty`), damit sie nicht aus Versehen kippt.

`CROPS_SHA` in `test_session_pack.py` blieb unveraendert und `ROWS_SHA` wurde nachgezogen — der
Beweis, dass nur die Zeile wuchs und kein Pixel wanderte.

## Prior-Kurve gemessen: lambda 8 ist die erste phantomfreie Schwelle (2026-09-18)

`prior_lambda` reitet seit 2026-09-17 im Modell, aber die Werte sind MIGRATIONSwerte (4,0 x T),
keine gemessenen Optima — so steht es in CLAUDE.md. Jetzt gemessen, am ausgelieferten Champ
`p4a-80-clahe` gegen `test-v1` (51 955 Zeilen, nie trainiert: das Modell ist aus der v4-Aera, die
Aufnahmen sind vom September).

| lambda | cell | board | **phantom** | miss | illegal |
|---|---|---|---|---|---|
| 0 | 0,9374 | 0,0395 | 17 | 29 | 3 219 |
| 4 | 0,9777 | 0,4589 | 2 | 35 | 1 112 |
| **5,98** (heute) | 0,9879 | 0,6234 | **1** | 38 | 575 |
| **8** | 0,9933 | 0,7351 | **0** | 33 | 284 |
| 10 | 0,9980 | 0,8918 | 0 | 32 | 43 |
| 12 | 0,9985 | 0,9177 | 0 | 29 | 9 |

**In diesem Bereich gibt es keinen Zielkonflikt.** Ueblicherweise kauft man Phantome mit Misses;
hier sind es bei lambda 8 **33 Misses gegen 29** bei lambda 0, also unveraendert, waehrend die
Phantome von 17 auf 0 fallen. Nach der Regel "Phantome sind das Veto, nimm die schaerfste
phantomfreie Schwelle" ist **8** die Antwort, und der Champ steht mit 5,98 eine Stufe darunter.

**Zwei Vorbehalte, bevor die Zahl ins Modell wandert:**

1. **Die Skalen sind nicht nachgewiesen gleich.** Python legt den Prior auf die Softmax
   (`p * exp(-lambda)`), Kotlin seit `priorOnTempered` auf die ROHEN Logits. Die FORM des Optimums
   traegt, die absolute Zahl gehoert an `scripts/replay-regression.ps1` bestaetigt.
2. **Ein starker Prior verdeckt Modellfehler.** Bei lambda 12 sinkt `illegal` auf 9 — die
   Entscheidung faellt dann fast nur noch ueber die Legalitaet. Was das kostet, wenn die
   Basis-FEN falsch ist, misst dieser Sweep nicht.

### Die `cnnConfThr`-Kurve geht mit diesem Werkzeug NICHT

Ueber alle Schwellen 0,0 bis 0,95 bleiben `cell`, `board`, `phantom`, `miss` und `illegal` Ziffer
fuer Ziffer gleich; nur `invalid`/`dropped`/`rescued` bewegen sich. `cnnConfThr` ist ein
ENGINE-Knopf — er entscheidet, ob ein Schnappschuss die Verify-Leiter erreicht, und das uebt nur
der Kotlin-Replay aus. Die Kurve braucht `scripts/replay-regression.ps1 -Extra "set:cnnConfThr=…"`
gegen die Referenz 396/3/0/171 bei 5 Alarmen.

### Nebenbefund: der Sweep war seit den Session-Packs kaputt

`sweep_prior_lambda.py` suchte ein `packed_meta.json` im DATENSATZ-Ordner. Seit 2026-09-11 zeigt
jede Zeile mit `mm://` in einen eigenen Pack, und das Skript starb sofort. Es loest jetzt je Zeile
ihren Shard auf — ein Werkzeug, das ein halbes Jahr Messungen tragen sollte und an einem
Formatwechsel still verreckt ist.

## `cnnConfThr`: keine Kurve, eine Kante — und 0,85 steht genau davor (2026-09-18)

Gemessen am Regressionssatz, zehn Aufnahmen je Wert, Modell `p4a-80-clahe`. Die Referenz ohne
`-Extra` reproduziert **396/3/0/171 bei 5 Alarmen**, Ziffer fuer Ziffer wie CLAUDE.md sie nennt.

| `cnnConfThr` | found | missed | invented | beyond | Alarme |
|---|---|---|---|---|---|
| 0,50 | 396 | 3 | 0 | 171 | 5 |
| 0,70 | 396 | 3 | 0 | 171 | 5 |
| **0,85** (Vorgabe) | **396** | **3** | **0** | **171** | **5** |
| 0,95 | 385 | 14 | **1** | 171 | 6 |
| 0,99 | 388 | 11 | **1** | 171 | 5 |

**Unterhalb von 0,85 entscheidet die Schwelle nichts.** Drei Werte von 0,50 bis 0,85 liefern
identische Zahlen — die Huerde ist dort nie die bindende Bedingung. Die offene Frage aus CLAUDE.md
("welche echte Sicherheit soll das Gate fordern?") hat damit fuer die untere Haelfte eine Antwort:
**egal**.

**Oberhalb faellt es ab, und ein Phantom kommt.** Bei 0,95 kostet es 11 Plies und bringt den ersten
`invented` des Satzes — nach der Phantom-Regel ist das disqualifizierend. `0,99` ist nicht besser,
nur anders daneben.

**Der Mechanismus ist gemessen, nicht erzaehlt:** der CNN-Arm verstummt nicht (`cnn=run` 1 445 ->
1 297), aber die Lesungen, die die Huerde nehmen, sinken von **219 174 auf 181 230 (-17 %)**. Die
Verify-Leiter bekommt zu selten einen Schnappschuss.

**Auffaellig, aber nicht als Ursache behauptet:** 385/14/1 bei 6 Alarmen ist exakt die alte
Referenz aus CLAUDE.md, die von VOR dem Prior-Umbau (`prior=0`, ohne Temperatur). Bei 0,95 traegt
der CNN also offenbar so wenig bei, dass das Ergebnis auf den modellfreien Weg zurueckfaellt.

### Was daraus folgt

**Die Vorgabe 0,85 bleibt — aber sie hat keine Luft nach oben.** Sie ist der letzte Wert vor der
Kante, und das ist Zufall, kein Entwurf: die Zahl stand vor `calibratedConfThr` da und bedeutete
je Modell etwas anderes. Wer sie anfasst, sollte nach UNTEN gehen (0,70 kostet nichts und haelt
Abstand zur Kante) oder die Messung je Modell wiederholen — die sieben Modelle tragen
Temperaturen von 1,26 bis 1,76, und die Kante liegt deshalb nicht bei allen an derselben Stelle.

**Nicht gemessen:** ob die Kante bei den anderen sechs Modellen woanders sitzt. Das waeren sechs
weitere Saetze zu je ~50 Minuten.

## 31. Das Telefon holt den Champion nicht ab (2026-09-20)

`ConfigCodec.encode` schreibt JEDEN Knopf in die gespeicherte Konfiguration, `decode` legt
jeden gespeicherten Wert ueber die Vorgabe. Ein Geraet mit einmal gespeicherten Einstellungen
behaelt nach dem APK-Update die alten sechs Werte.

Ein `CONFIG_SCHEMA_VERSION`-Sprung erzwingt es, wirft aber jede Handeinstellung weg - und die
Regel dort lautet ausdruecklich "bump when a knob's MEANING changes", was hier nicht zutrifft.
Der Gegenvorschlag ist ein Handgriff am Geraet pro Kandidat. Bewusst offen gelassen.

## 32. Die Alarmspalte der Regression zaehlt Entscheidungen, nicht Episoden (2026-09-20)

`replay-regression.ps1` zaehlt `ALARM latched`-Zeilen, also abgelehnte Entscheidungen unter
einem stehenden Latch. Der Champion sah damit mit 7 gegen 5 schlechter aus, waehrend seine
Episoden von 15 auf 8 fielen und drei Anker-Ausfaelle verschwanden.

`scripts/optimise_knobs.py` zaehlt seit 2026-09-20 die Episode (`board desynced`). Die Spalte
im Skript **nicht** umdefinieren: jede im Projekt zitierte Referenzzahl haengt an ihr. Eine
zweite Spalte danebenstellen.

## 35. Die Kommentar-Ratsche zaehlt Bloecke, nicht ihre Laenge (2026-09-21)

`CommentBudgetTest.commentBlocks` und sein Python-Zwilling `android/scripts/comment_budget.py`
zaehlen, WIE VIELE Laeufe von 5+ Kommentarzeilen eine Datei traegt. Ein bereits gebuchter Block
darf damit von 5 auf 50 Zeilen wachsen, ohne dass sich eine Zahl bewegt — die Ratsche verspricht
"no file gains a long comment block" und kann genau das nicht sehen.

Der Python-Zwilling in `tests/test_comment_budget.py` macht es anders herum: er bucht die LAENGE
des schlimmsten Blocks. Das ist die schaerfere Zahl, und sie ist auch die ehrlichere.

Die Umstellung ist aber keine Zeile, sondern eine Migration: `config/comment-budget.txt` traegt
heute Anzahlen, unter der Laengen-Regel werden daraus groessere Zahlen — und die Ratsche laesst
Eintraege ausdruecklich nur SCHRUMPFEN. Ein Wechsel muss die Datei also einmal neu setzen und
dabei die Regel fuer diesen einen Commit aussetzen. Bewusst nicht nebenbei gemacht;
`CommentBudgetCounterCheckTest.einWachsenderBlockBleibtEineEins` haelt die Blindstelle bis dahin
sichtbar fest, statt sie in Prosa zu verstecken.

## 32 ist gebaut (2026-09-21)

`scripts/compare_regression.py` (`6c626891`) stellt die Episoden-Spalte NEBEN die alte, genau wie
der Punkt es verlangte; `replay-regression.ps1:67` zaehlt unveraendert `ALARM latched`.

## 36. Drei Wachen ohne Zeugen (2026-09-21, gemessen)

Alle zehn booleschen Wachen der Engine einzeln abgeschaltet, jedes Mal der volle Satz
(`docs/wachen-ablation-2026-09-21.md`). Vier bewegen KEINE Ziffer, und drei davon sind genau
die Hand- und Verdeckungswachen: `baselineOcclusion`, `gridHandGate`, `modelHandGate`.

Wer eine davon verschlechtert, kommt heute gruen durch. Das Material, das es messen koennte,
liegt da (die zwei Partien vom 2026-09-19, 875 verdeckte Frames auf 988) und haengt an
derselben Entscheidung wie Punkt 30: `test-v2` oder Trainingsmaterial.

**Zu entscheiden:** ob der Satz um handreiches Material erweitert wird, oder ob diese drei
Wachen bewusst ohne Zeugen laufen. Ein drittes "spaeter" gibt es nicht — heute ist es das
zweite, nur unausgesprochen.
