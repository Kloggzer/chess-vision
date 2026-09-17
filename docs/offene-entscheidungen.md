# Entscheidungsvorlage (Stand 2026-09-16, Morgen)

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
| **28** | Python und TypeScript uneinig: Messung, dann Absage | B | 1 h | **entscheiden** — heute latent |
| ~~29~~ | `recut_coverage` las das falsche Alpha | — | — | **gefixt** — 68 Zeilen auf der Platte noch falsch |

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

## 14. `torch_data.py:657` — Spender-Pool ohne `neighbour_p > 0`-Schutz

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
sind jetzt die beiden Tueren; `tests/json_doors.txt` (18 Stellen) und `platform/app/write-doors.txt`
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

## 30. Gemalte Korrektur auf spaetere Frames — ENTSCHIEDEN 2026-09-16: nicht ungefragt

`carryPositionCorrections` traegt eine gemalte Stellung auf die spaeteren Frames DESSELBEN Plys,
und `board-paint` nimmt das `prefilled` bis in `planBoard`. Verdrahtet war nie eine Seite.

**Warum es nicht harmlos ist:** `planBoard` legt eine Zeile, die von der Datei abweicht, in
`corrections` — und damit auf den Bestaetigen-Knopf. Wer einen Bogen schnell durchbestaetigt,
schriebe Labels, die er nie angesehen hat.

**Nicht zu verwechseln mit der Matten-Lane.** Dort urteilt der Mensch ueber SAMs MASKE, und ein
Urteil dort ist abgesegnet. Hier geht es um gemalte FIGUREN auf der Strittig-Lane — eine andere
Lane und eine andere Frage.

**Entscheidung (Nutzer): nicht ungefragt.** Bleibt unverdrahtet. Wer es will, baut einen eigenen
Knopf; das Anschliessen selbst ist ein Aufruf.

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

**Nebenbefund, nicht gefixt:** die gespeicherte `coverage` dieser Aufnahme weicht in **18 von
1204** Frames vom eigenen Alpha ab, alle mit `alpha: fixed`. `recut_coverage` laesst die
Handfassungen bewusst aus ("gehoert dem Menschen") — die Zahl bleibt damit stehen, waehrend die
Pixel neu sind. Groesster Abstand 0,999.
