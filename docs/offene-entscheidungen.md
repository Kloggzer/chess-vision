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
| 21 | Fuenf Vertrags-Familien statt 19 Einzelformate | B | je Naht | Naht 1–3 gebaut, 4–5 fallen mit 27 |
| ~~22~~ | Drei Antworten auf die halbe letzte Zeile | — | — | **gegenstandslos durch 27** |
| ~~23~~ | `UtteranceQueue`: der Alarm meldet sich fertig, waehrend er spricht | — | — | **gebaut 2026-09-16** |
| ~~24~~ | `StockfishAnalyzer` zeigt 50 % fuer "nicht bewertet" | — | — | **gebaut 2026-09-16** — leerer Balken, animiert |
| ~~25~~ | `settle_for_ply` nimmt ungemessene Frames in den Median | — | — | **gebaut 2026-09-16** |
| ~~26~~ | `--smooth-iters` dreht die Figur | — | — | **gebaut 2026-09-16** — gezaehlt: 0 von 12 betroffen |
| **27** | **Postgres statt 19 Dateiformate** | C | Export-Neubau | **entschieden** — Schnitt steht unten |

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

**Nachlauf, der noch aussteht:** die Zufallsfolge hat sich verschoben, die bestehende
Destillation des Hand-Gate-Schuelers ist damit nicht mehr die Referenz. Der Lauf ist gestartet
(`eff-b0-448-v2`, `efficientnet_b0` @ 448, 20 Epochen) — die alten Karten sind ausserdem auf einem
Lehrer-Satz entstanden, der adoptierte und Temporal-Zeilen enthielt, obwohl die Karte
`teacher: sam3` behauptet. Der neue Satz ist kleiner (9 084 statt 10 985) und sauber.

## 16. `p5`/`p95` im Aufnahme-Auftrag — GEBAUT 2026-09-16

Der Median sagt, wo ein Feld ueblicherweise sitzt; er sagt NICHT, ob es das Band je erreicht hat.
`a8` mass ueber den Korpus 6 bis 207 — seine Bandlage haengt an der Lampe. Ein Vorschlag, der
unter dem heutigen Licht nie eintritt, kostet eine ganze Aufnahme.

Jede `Placement` traegt jetzt `seen_lo`/`seen_hi` (die p5/p95 DIESES Feldes), und die Wahl
bevorzugt Felder, deren Spannweite das Band wirklich erreicht. Bleibt keines uebrig, entscheidet
wieder der Median allein — ein Vorschlag ist besser als keiner.

`docs/capture-plan.schema.json` und `platform/app/lib/capture-plan.ts` ziehen mit; die beiden
neuen Faelle stehen als Test (`test_capture_plan.py`).

## 20. `read_matte` verwirft die leere Messung, TypeScript behaelt sie

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

## 22. Drei Leser derselben `log.jsonl`, drei Antworten auf die halbe letzte Zeile

`realgames.py:1537` oeffnet `log.jsonl` mit `"w"` und stroemt hinein — waehrend eines Exports ist
die letzte Zeile also wirklich halb da, das ist kein Gedankenspiel.

Wer sie liest, antwortet verschieden:

| Leser | auf eine halbe Zeile |
|---|---|
| `lib/stored.ts` | ueberspringt sie, ausdruecklich: "ueber das `Promise.all` riss ein Wurf sonst die ganze Anfrage mit" |
| `lib/pool.ts` | ueberspringt sie |
| `lib/session.ts` (`loadSession`) | **wirft** — kein `try` |

**Beide Antworten sind vertretbar**, und das ist der Punkt. Ueberspringen zeigt eine Sitzung, der
waehrend des Exports Zeilen fehlen, ohne das zu sagen — genau die Fehlerklasse dieser Nacht.
Werfen ist ehrlich, reisst aber ueber `Promise.all` Nachbarn mit, wofuer `stored.ts` schon einmal
bezahlt hat.

**Die eigentliche Frage ist enger:** die LETZTE Zeile ist "der Schreiber laeuft noch", jede andere
kaputte Zeile ist Beschaedigung. Heute unterscheidet kein Leser die beiden. Ein gemeinsamer Leser
mit einer ausdruecklichen Tail-Politik (Codex' Naht 2) kann das — `lib/jsonl.ts` ist dafuer der
Platz, hat die Politik aber noch nicht.

**Nicht nachts entschieden:** `loadSession` traegt jede Label-Seite; ob eine halbe Aufnahme
angezeigt oder verweigert wird, ist eine Produktfrage.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| B | 2 h | Tail-Politik in `lib/jsonl.ts`, dann alle drei darauf — mit einer Entscheidung, nicht drei |

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

## 25. `settle_for_ply`: eine leere Coverage geht in den Median der gesetzten Stellung

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
