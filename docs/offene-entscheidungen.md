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
| 6 | `_persistent`: 532 Frames zu Unrecht im Vorrat, 947 zu bergen | C | Re-Export | mit dem naechsten Neubau |
| 7 | `2026-08-15-23-01-43` braucht einen Re-Export | A | — | faellt mit 6 zusammen |
| 14–15 | Zwei TODOs, deren Fix die ZUFALLSFOLGE verschiebt | C | s. u. | 15 ja (Faktor 4), 14 mitnehmen |
| 16 | `p5`/`p95` in den Aufnahme-Auftrag ziehen | C | 1 h | ja, aber vor Augen — es aendert das Schema |
| ~~20~~ | Acht Leser pruefen `coverage` truthy | — | — | **gebaut 2026-09-16** |
| 21 | Fuenf Vertrags-Familien statt 19 Einzelformate | B | je Naht | Naht 1–3 gebaut, 4–5 fallen mit 27 |
| ~~22~~ | Drei Antworten auf die halbe letzte Zeile | — | — | **gegenstandslos durch 27** |
| 23 | `UtteranceQueue`: der Alarm meldet sich fertig, waehrend er spricht | C | 2 h | ja, am Geraet |
| 24 | `StockfishAnalyzer` zeigt 50 % fuer "nicht bewertet" | C | 30 min | **ja** — UI-Entscheidung |
| ~~25~~ | `settle_for_ply` nimmt ungemessene Frames in den Median | — | — | **gebaut 2026-09-16** |
| 26 | `--smooth-iters` dreht die Figur, verbatim nicht | C | 30 min | erst zaehlen, welche Meshes betroffen sind |
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

## 23. `UtteranceQueue`: die Meldung des unterbrochenen Spruchs raeumt den Platz des ALARMS

`flush()` setzt `inFlight = 1` fuer den Alarm, aber der gerade unterbrochene Spruch hat noch einen
offenen Callback (`onStop` ruft `onDone`). `done()` ist anonym und zaehlt herunter, was gerade in
Flug ist — `queue.idle` meldet `true`, waehrend der Alarm noch spricht, und `SpeechEngine.emit`
gibt den Audiofokus mitten in der einen Ansage zurueck, die der Latch garantieren soll.

**Warum nicht gebaut:** der Fix braucht eine Generation je Spruch und dreht die Zusage von
`UtteranceQueueTest.flushDropsTheBacklogAndInterrupts` um, der genau eine `done()`-Meldung als die
des Alarms liest. Und er haengt an einem Plattformdetail (wann Android `onStop` liefert), das
sich hier nicht messen laesst. `@Disabled` in `StaleUtteranceCallbackTest`.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| C | 2 h plus Geraetemessung | **ja**, aber am Geraet — der Alarm ist die eine Ansage, die halten muss |

## 24. `StockfishAnalyzer`: keine Bewertung wird als gemessenes Remis veroeffentlicht

Liefert die Suche keine `info`-Zeile, ist `best` null und `winWhite` wird **50,0** — obwohl das
Feld `Double?` ist, genau damit "keine Bewertung" sagbar bleibt (der Endstellungs-Pfad nutzt
`null`). Dazu setzt die Schleife `lastFen`, die Stellung wird also nie wiederholt: der Balken
steht bis zum naechsten Zug auf ausgeglichen, daneben "depth 0".

Dieselbe Fehlerklasse wie SAMs Absage — diesmal im Gesicht des Nutzers.

**Warum nicht gebaut:** der Fix leert den Balken, statt 50 % zu zeigen. Wie ein leerer Balken
aussieht, ist eine UI-Entscheidung. `@Disabled` in `UnscoredPositionTest`, rot verifiziert
(`expected: <null> but was: <50.0>`).

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| C | 30 min plus eine UI-Entscheidung | **ja** — ein erfundenes Remis ist schlimmer als ein leerer Balken |

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

## 26. `--smooth-iters` dreht die Figur, der verbatim-Zweig nicht

`meshprep._import_smoothed` laeuft ueber `_load_and_extract` -> `_ensure_z_up` und dreht die Figur
um -90 Grad um X, sobald Y die dominante Achse ist. Der verbatim-Zweig daneben dreht nicht, und
`prepare_scan` verspricht im Docstring ausdruecklich "no uprighting".

Damit haengt die AUSRICHTUNG einer importierten Figur an einem Glaettungsschalter — zwei Importe
derselben Datei mit und ohne `--smooth-iters` stehen verschieden im Raum.

**Warum nicht gebaut:** die Drehung wegzunehmen aendert die Geometrie jeder so importierten Figur
und jeden Render, der sie nutzt. `synth_pieces/` ist Ground Truth ohne Backup. `xfail(strict=True)`
in `tests/test_bug_hunt_20260916e.py`.

| Kiste | Aufwand | Empfehlung |
|---|---|---|
| C | 30 min plus eine Sichtprobe je betroffener Figur | erst zaehlen, welche Meshes mit `--smooth-iters` entstanden |

## 27. Postgres statt 19 Dateiformate — ENTSCHIEDEN 2026-09-16 (Nutzer), Bau steht aus

**Die Entscheidung:** Postgres in Docker, zwei Rollen mit `GRANT` je Tabelle. Begruendung des
Nutzers: zwei Prozesse laufen wirklich parallel, und der Streit gehoert in die DB, nicht in eine
Vereinbarung, an die sich jemand halten muss.

Damit sind **Punkt 22 gegenstandslos** (keine halbe letzte Zeile mehr) und **Punkt 21 Naht 4 und 5
erledigt** — die DB traegt den Vertrag, nicht ein versioniertes Dateiformat.

### Was die DB loest, gemessen an der Nacht auf den 16.09.

| Fehlerklasse | Faelle | loest die DB das? |
|---|---|---|
| "nicht gemessen" als gemessener Normalwert gelesen | ~19 | **nein** |
| halb geschriebene Dateien, gleichzeitige Schreiber, Staging-Reste | ~9 | ja |
| Waechter umgangen (Massstab, `usable_board`) | 4 | nein |
| UI- und Logikfehler | ~8 | nein |

**Die dominante Klasse ueberlebt die Migration.** Eine Spalte, die `NULL` sein darf und
stattdessen `0.0` bekommt, ist genau dieselbe Falle wie `.get(k, 0.0)`. Gegenmittel im Schema:
`NOT NULL` ueberall, wo ein Wert gemessen sein MUSS, und sonst echtes `NULL` — nie ein Default.
`tests/test_matte_coverage_rule.py` und die JSONL-Ratsche bleiben bis zur letzten migrierten Stelle.

### Schnitt

- **In die DB:** die Messreihen (`matte`, `model-reads`, `log`, `interval-check`, `scan`) und die
  Urteile (`review-notes`, `corrections`, `unusable-cells`, `ui-meta`, `useless`).
- **Dateien bleiben Dateien:** `boards/*.webp`, die Alphas, die Packs. Die Zeile in der DB traegt
  Pfad UND einen Inhaltsstempel (Mtime plus Groesse, wie `chesslab.provenance` es schon tut),
  damit eine Abweichung zwischen DB und Platte auffaellt statt still zu sein. **Das ist die neue
  Fehlerklasse, die die Migration einfuehrt** — sie braucht ihren eigenen Waechter.
- **Rollen:** `chesslab_pipeline` schreibt die Messreihen und liest die Urteile,
  `chesslab_web` umgekehrt. Kein Konto darf beides schreiben.
- **Der Riegel bleibt:** `heavy-lock.ts` / `locks.py` sind auch RESSOURCEN-Sperren (GPU, Speicher),
  nicht nur Daten-Sperren. Wer sie nach der Migration loescht, weil "die DB das jetzt macht",
  laesst zwei Trainingslaeufe gleichzeitig los.

### Reihenfolge

1. Schema fuer EINE Familie — die Messreihen —, Python schreibt in beide (DB und JSONL).
2. Die Web-App liest aus der DB statt aus der Datei. JSONL bleibt als abgeleitete Sicht stehen,
   damit die ~12 000 Zeilen in `scripts/` unveraendert weiterlaufen.
3. Urteile umziehen, dann `scripts/` Datei fuer Datei.
4. JSONL abschalten, wenn niemand mehr liest.

**Der Zeitpunkt ist der Export-Neubau** (Punkt 14): der Export IST der Schreiber, und man aendert
ihn einmal.

| Kiste | Aufwand | offen |
|---|---|---|
| C | Schritt 1–2 ein Tag, der Rest je Familie | Backup-Weg (`pg_dump`) — heute ist `data/` "ein Ordner, den man kopiert" |
